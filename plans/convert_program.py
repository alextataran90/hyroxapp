#!/usr/bin/env python3
"""Convert the exported HYROX Training Program HTML into the app's plan JSON.

The source is a static HTML export: one <article class="day"> per training day,
each with id="day-YYYY-MM-DD", a data-type, and a set of titled sections.
We map it onto the app's relative week/day model so a single plan file works
both for someone starting today (week 1 = their first week) and for an athlete
aligning to the programme's original calendar (startDate = 2026-08-03).

Structure
---------
A Fitr session is an ORDERED list of titled sections, and the order matters:
a strength day typically runs Notes -> Warm-Up -> strength work -> Run Warm-Up
-> engine work -> Cool Down. Flattening that into one warmup array and one
blocks array (as the first version of this script did) merged the two warm-ups
and lost the sequence, so `sections` is now the primary representation.

`warmup` / `cooldown` / `blocks` are still emitted, derived from `sections`,
because block INDICES are the key for completion state and logged actuals.
Each work section carries `blockIndex` into that list.

Within a work section the export reproduces Fitr's superset listing: a
`Superset N` line, then alternating exercise-name / slot-label (1A, 1B, 2A…)
lines, with 🔶/🔸 coaching notes attached underneath. That is parsed into
`groups` so the app can render real exercise rows instead of a wall of text.

Known defect in the source export: Fitr's collapsed exercise rows are glued to
the END of the preceding section, so the opening exercises of a strength block
appear at the bottom of that day's Warm-Up. We cut at the `Superset N` line and
move the tail onto the following work section. Where Fitr had the row collapsed
entirely the export simply lacks it, and no parsing can recover it.
"""
import re, json, html, datetime, collections, sys, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = "/Users/alexandrutataran/Downloads/hyrox_training_program.html"
OUT = os.path.join(HERE, "hyrox-11week.json")
FITR_SETS = os.path.join(HERE, "fitr-sets-2026-09-28_2026-10-17.json")

DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
FOCUS = {"run": "run", "str": "strength", "sim": "sim"}
KIND = {"s-warm": "warm", "s-cool": "cool", "s-note": "note"}  # everything else is work

DEFAULT_DURATION = {"run": 60, "strength": 75, "sim": 90}

SUPERSET_RE = re.compile(r'^superset\s*\d*$', re.I)
SLOT_RE     = re.compile(r'^\d+[A-Z]$')
VARIANT_RE  = re.compile(r'^(pro|open|beginners?|rx|scaled|athlete notes)$', re.I)
# "HYROX Specific Station (Sled Push)" and friends head a workout but are only
# ever written inline, never as a section title of their own.
STATION_RE  = re.compile(r'^HYROX [\w &/\-]+\([\w \-/]+\)$')
# Lines that start a new scheme rather than annotate the exercise above them.
SCHEME_RE   = re.compile(r'^(\d+\s*(sets?|rounds?|x)\b|-{3,}|total\s*:|for time|amrap|emom|e\d+m)', re.I)
# Some days arrive as one undivided blob, or with a follow-on station workout
# folded under the last exercise row. Both are detected the same way: a line
# that is, verbatim, a section heading used elsewhere in the export.


def clean(t: str) -> str:
    """Unescape entities and normalise whitespace, keeping line structure."""
    t = html.unescape(t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.rstrip() for ln in t.split("\n")]
    out, blank = [], 0
    for ln in lines:
        if ln.strip() == "":
            blank += 1
            if blank > 1:
                continue
        else:
            blank = 0
        out.append(ln)
    return "\n".join(out).strip()


def lines_of(t: str):
    return [ln.strip() for ln in t.split("\n") if ln.strip()]


def monday(d: datetime.date) -> datetime.date:
    return d - datetime.timedelta(days=d.weekday())


def title_case(s: str) -> str:
    """'ZONE 2 RUN' -> 'Zone 2 Run'; leave mixed-case titles alone."""
    s = s.strip()
    # The export carries a few titles with an unbalanced bracket, e.g.
    # "Hyrox Strength Workout 1)" or "Workout 1) Power Builder".
    if s.count(")") > s.count("("):
        s = re.sub(r'^\s*workout\s*\d+\)\s*', '', s, flags=re.I).strip() or s
    while s.endswith(")") and s.count(")") > s.count("("):
        s = s[:-1].strip()
    s = re.sub(r'\s{2,}', ' ', s)
    return s.title() if s.isupper() else s


def split_leaked_superset(warm_text: str):
    """Cut a warm-up at the Superset line the exporter glued onto its end.

    Returns (warmup_text, leaked_text). The `💪 Specific Warm-Up` heading and
    its one-line instruction are a real part of the warm-up and stay put; only
    the exercise listing that follows is moved.
    """
    lines = warm_text.split("\n")
    for i, ln in enumerate(lines):
        if SUPERSET_RE.match(ln.strip()):
            return "\n".join(lines[:i]).strip(), "\n".join(lines[i:]).strip()
    return warm_text, ""


def regroup(items):
    """Order exercise rows into supersets using their slot labels.

    Fitr numbers every row 1A/1B/1C, 2A/2B… and the number IS the superset, so
    the slot is a more reliable grouping key than the `Superset N` heading —
    which the export drops about as often as it keeps.
    """
    groups, index = [], {}
    for it in items:
        m = re.match(r'(\d+)', it.get("slot") or "")
        if not m:
            m = re.match(r'superset\s*(\d+)$', it.get("_label") or "", re.I)
        key = m.group(1) if m else (it.get("_label") or "")
        if key not in index:
            index[key] = {"label": f"Superset {key}" if key.isdigit() else key, "items": []}
            groups.append(index[key])
        it.pop("_label", None)
        index[key]["items"].append(it)
    # A single unlabelled group needs no heading at all.
    if len(groups) == 1 and not groups[0]["label"]:
        groups[0]["label"] = ""
    return groups


def parse_work(text: str, vocab=frozenset()):
    """Split a work-section body into free prose + Fitr superset groups.

    `vocab` holds every exercise name seen with a slot label anywhere in the
    programme. The export drops the slot line for some rows, so a bare name on
    its own line is only treated as an exercise when the vocabulary confirms it
    — otherwise ordinary prose would be mistaken for exercises.
    """
    lines = lines_of(text)
    prose, items, label = [], [], ""
    i = 0
    while i < len(lines):
        ln = lines[i]

        if SUPERSET_RE.match(ln):
            label = title_case(ln)
            i += 1
            continue

        # An exercise is a name line followed by its slot label — or, where the
        # export lost the label, a line that is exactly a known exercise name.
        slotted = i + 1 < len(lines) and SLOT_RE.match(lines[i + 1])
        if slotted or norm_name(ln) in vocab:
            items.append({"name": ln, "slot": lines[i + 1] if slotted else "",
                          "notes": [], "_label": label})
            i += 2 if slotted else 1
            continue

        # Once a row is open, the lines under it are that exercise's coaching
        # notes — which is how Fitr shows them — until the next row, the next
        # superset, or a line that plainly starts a new scheme.
        if items and not SCHEME_RE.match(ln):
            items[-1]["notes"].append(ln)
            i += 1
            continue

        prose.append(ln)
        i += 1

    return "\n".join(prose).strip(), items


def collect_titles(days):
    """Section headings distinctive enough to recognise inside another body.

    Matching is verbatim (bar case) and restricted to multi-word headings, so
    an ordinary sub-heading like "Details:" or "💪 Specific Warm-Up" — which
    appears in dozens of bodies and is not a section of its own — can't be
    mistaken for the start of a new section.
    """
    titles = {}
    for d in days:
        for kind, title, _text in d["secs"]:
            t = title.strip()
            if len(t) >= 8 and len(t.split()) >= 2:
                titles.setdefault(t.lower(), kind)
        # A handful of station workouts are only ever introduced inside another
        # section's body, so they never appear as a sec-title to learn from.
        for _k, _t, text in d["secs"]:
            for ln in lines_of(text):
                if STATION_RE.match(ln):
                    titles.setdefault(ln.lower(), "work")
    return titles


def split_embedded(kind, title, text, titles):
    """Cut a section body wherever it restates another section's heading.

    One day ships as a single undivided blob and several end with the next
    section's heading glued on, so without this a whole run workout and cool
    down end up as coaching notes on the last exercise row.
    """
    out, cur = [], [kind, title, []]
    for ln in lines_of(text):
        hit = titles.get(ln.lower())
        if hit and cur[2]:
            out.append((cur[0], cur[1], "\n".join(cur[2]).strip()))
            cur = [hit, ln, []]          # keep the line's own wording as the title
            continue
        cur[2].append(ln)
    out.append((cur[0], cur[1], "\n".join(cur[2]).strip()))
    kept = []
    for k, t, body in out:
        if body:
            kept.append((k, t, body))
        elif kept:                       # heading with nothing under it
            kept[-1] = (*kept[-1][:2], (kept[-1][2] + "\n" + t).strip())
    return kept


def collect_vocab(days):
    """Exercise names that appear with an explicit slot label (1A, 2B, …)."""
    vocab = set()
    for d in days:
        for kind, _title, text in d["secs"]:
            if kind == "note":
                continue
            lines = lines_of(text)
            for i in range(len(lines) - 1):
                if SLOT_RE.match(lines[i + 1]) and not SUPERSET_RE.match(lines[i]):
                    vocab.add(norm_name(lines[i]))
    vocab.discard("")
    return vocab


def fitr_set_plan(ex):
    """Turn one scraped Fitr exercise into the set-grid's plan shape.

    Scrape shape: {"n": name, "s": [reps per set], "w": "kg",
                   "o": [{"m": metric, "v": [...], "s": unit}, …]}
    Grid shape:   {metric, unit, targets[], weightUnit?, rest[], restUnit}
    """
    others = {o["m"]: o for o in ex.get("o") or []}
    rest = others.pop("rest", None)

    reps = ex.get("s")
    if reps and any(v is not None for v in reps):
        plan = {"metric": "reps", "unit": "reps", "targets": reps}
    else:
        # Timed or measured work carries its targets in the extra columns.
        main = next(iter(others.values()), None)
        if not main or not any(v is not None for v in main["v"]):
            return None
        plan = {"metric": main["m"], "unit": main.get("s") or "", "targets": main["v"]}

    if ex.get("w"):
        plan["weightUnit"] = ex["w"]
    if rest and any(v is not None for v in rest["v"]):
        plan["rest"] = rest["v"]
        plan["restUnit"] = rest.get("s") or "s"
    return plan


def load_fitr_sets():
    """date -> {normalised exercise name: setPlan} from the Fitr scrape."""
    if not os.path.exists(FITR_SETS):
        return {}
    raw = json.load(open(FITR_SETS, encoding="utf-8"))
    out = {}
    for day in raw:
        by_name = {}
        for ex in day.get("ex", []):
            plan = fitr_set_plan(ex)
            if plan:
                by_name[norm_name(ex["n"])] = plan
        if by_name:
            out[day["d"]] = by_name
    return out


def norm_name(s: str) -> str:
    return re.sub(r'[^a-z0-9]+', '', s.lower())


def main():
    src = open(SRC, encoding="utf-8").read()
    fitr = load_fitr_sets()

    parts = re.split(r'(?=<article class="day" id="day-)', src)
    days = []
    for p in parts:
        m = re.match(r'<article class="day" id="day-(\d{4}-\d{2}-\d{2})" data-type="([^"]*)"', p)
        if not m:
            continue
        date = datetime.date.fromisoformat(m.group(1))
        dtype = m.group(2)
        body = p[: p.find("</article>")] if "</article>" in p else p

        badge = re.search(r'<span class="badge b-[a-z]+">([^<]+)</span>', body)
        badge_txt = html.unescape(badge.group(1)) if badge else ""

        # Most sections are `<div class="sec s-xxx"><div class="sec-title">…`,
        # but at least one day ships a bare `<div class="sec">` with no modifier
        # and no title, holding the whole session in a single body.
        secs = re.findall(
            r'<div class="sec([^"]*)">'
            r'(?:<div class="sec-title">([^<]*)</div>)?'
            r'<div class="sec-body">(.*?)</div>',
            body, re.S)

        norm = []
        for cls, t, v in secs:
            cls = cls.strip()
            title = html.unescape(t).strip() if t else ""
            if not title:
                title = badge_txt or "Session"
            norm.append((KIND.get(cls, "work"), title, clean(v)))

        days.append({"date": date, "type": dtype, "badge": badge_txt, "secs": norm})

    if not days:
        sys.exit("No day articles parsed — the export format may have changed.")

    days.sort(key=lambda d: d["date"])
    week0 = monday(days[0]["date"])
    # Names Fitr gave us for the scraped weeks count as known exercises too:
    # the export promotes some rows to section headings with no slot line.
    titles = collect_titles(days)
    vocab = collect_vocab(days) | {n for day in fitr.values() for n in day}

    by_week = collections.defaultdict(list)
    for d in days:
        by_week[(monday(d["date"]) - week0).days // 7 + 1].append(d)

    stats = collections.Counter()
    weeks = []
    for wn in sorted(by_week):
        sessions = []
        for i, d in enumerate(sorted(by_week[wn], key=lambda x: x["date"]), start=1):
            focus = FOCUS.get(d["type"], "hybrid")
            date_str = d["date"].isoformat()
            sets_for_day = fitr.get(date_str, {})

            # Pass 1: keep source order, lifting leaked supersets out of
            # warm-ups into a work section of their own. They are a separate
            # piece of work from whatever section follows, so folding them into
            # the next block would merge two unrelated workouts.
            work_name = "Strength" if focus == "strength" else "Workout"
            expanded = []
            for kind, title, text in d["secs"]:
                parts = split_embedded(kind, title, text, titles)
                if len(parts) > 1:
                    stats["embedded_sections_split"] += len(parts) - 1
                expanded += parts

            staged = []
            for kind, title, text in expanded:
                if not text:
                    continue
                if kind == "warm":
                    text, leaked = split_leaked_superset(text)
                    if text:
                        staged.append((kind, title, text))
                    if leaked:
                        staged.append(("work", work_name, leaked))
                        stats["supersets_recovered"] += 1
                    continue
                staged.append((kind, title, text))

            # Pass 2: build the ordered sections and the derived block list.
            #
            # Exercise rows are hoisted out of their prose sections into one
            # block for the whole session. In Fitr the day's rows sit
            # consecutively and form a single piece of work, but the exporter
            # scatters them across whichever prose section it was emitting —
            # Superset 1 can trail a warm-up while Superset 2 trails an
            # unrelated conditioning piece, and it even promotes a lone row to
            # a section heading of its own. Which prose heading owns them is
            # not recoverable, so they get a block named for what they are.
            sections, blocks, warmup, cooldown, notes = [], [], [], [], []
            rows, rows_at = [], None

            for kind, title, text in staged:
                if kind == "warm":
                    steps = lines_of(text)
                    warmup += steps
                    sections.append({"kind": "warm", "title": title_case(title), "steps": steps})
                    continue
                if kind == "cool":
                    steps = lines_of(text)
                    cooldown += steps
                    sections.append({"kind": "cool", "title": title_case(title), "steps": steps})
                    continue
                if kind == "note":
                    notes.append(text)
                    sections.append({"kind": "note", "title": title_case(title), "text": text})
                    continue

                body = lines_of(text)
                if norm_name(title) in vocab and body and SLOT_RE.match(body[0]):
                    text = title.strip() + "\n" + "\n".join(body)
                    stats["rows_from_headings"] += 1
                prose, items = parse_work(text, vocab)

                if items:
                    # A heading like "HYROX Station Specific (WALLBALLS)" sits
                    # above rows that carry no superset number of their own —
                    # it is their label, exactly as Fitr shows it.
                    label = title.strip()
                    if norm_name(label) not in vocab:
                        for it in items:
                            if not it["slot"] and not it["_label"]:
                                it["_label"] = label
                    if rows_at is None:
                        rows_at = len(sections)
                    rows += items
                # "4 sets" on its own is the scheme of the row above it, not a
                # workout of its own — keep it with that row.
                plines = prose.split("\n") if prose else []
                if items and plines and len(plines) <= 2 and all(SCHEME_RE.match(x) for x in plines):
                    items[-1]["notes"] += plines
                    stats["scheme_fragments_reattached"] += 1
                    prose = ""
                if prose:
                    blocks.append({"name": title_case(title), "text": prose})
                    sections.append({"kind": "work", "title": title_case(title),
                                     "blockIndex": len(blocks) - 1})

            if rows:
                for it in rows:
                    plan = sets_for_day.get(norm_name(it["name"]))
                    if plan:
                        it["setPlan"] = plan
                        stats["exercises_with_sets"] += 1
                    stats["exercises"] += 1
                blocks.insert(0, {"name": work_name, "text": "", "groups": regroup(rows)})
                stats["blocks_with_groups"] += 1
                # Everything already placed shifts up by one.
                sections = [s if s["kind"] != "work"
                            else {**s, "blockIndex": s["blockIndex"] + 1}
                            for s in sections]
                sections.insert(rows_at, {"kind": "work", "title": work_name, "blockIndex": 0})

            mins = [int(x) for x in re.findall(r'Total:\s*(\d+)\s*min',
                                               " ".join(t for _, _, t in d["secs"]), re.I)]
            duration = max(mins) if mins else DEFAULT_DURATION.get(focus, 60)

            # Name the session after its first real work block. Variant headings
            # ("PRO", "OPEN") say who a block is for, not what the session is.
            main_titles = [b["name"] for b in blocks if not VARIANT_RE.match(b["name"].strip())]
            title = main_titles[0] if main_titles else (d["badge"] or "Session")

            # Scraped exercises the prose never named: report them so a silent
            # mismatch between the two sources doesn't go unnoticed.
            seen = {norm_name(it["name"]) for b in blocks
                    for g in b.get("groups", []) for it in g["items"]}
            leftovers = [k for k in sets_for_day if k not in seen]

            sessions.append({
                "id": f"W{wn:02d}S{i}",
                "title": title,
                "duration": duration,
                "focus": focus,
                "defaultDay": DOW[d["date"].weekday()],
                "intent": d["badge"],
                "sourceDate": date_str,
                "sections": sections,
                "warmup": warmup,
                "blocks": blocks,
                "cooldown": cooldown,
                **({"tips": "\n\n".join(notes)} if notes else {}),
            })
            if leftovers:
                stats["unmatched_scraped_exercises"] += len(leftovers)

        weeks.append({"number": wn, "sessions": sessions})

    n = len(weeks)
    bounds = [(1, n // 3), (n // 3 + 1, 2 * n // 3), (2 * n // 3 + 1, n)]
    names = ["Build", "Intensify", "Race Prep"]
    phases = []
    for (a, b), nm in zip(bounds, names):
        wl = list(range(a, b + 1))
        mix = collections.Counter(
            s["focus"] for w in weeks if w["number"] in wl for s in w["sessions"])
        phases.append({"name": nm, "weeks": wl,
                       "focus": " · ".join(f"{c} {k}" for k, c in mix.most_common())})
    for w in weeks:
        w["phase"] = next(p["name"] for p in phases if w["number"] in p["weeks"])

    plan = {
        "version": "hyrox-11week-2026-10-04",
        "id": "hyrox-11week",
        "name": "HYROX 11-Week Program",
        "description": f"{len(days)} sessions over {n} weeks · Run/Engine, Strength and Race Simulation.",
        "metadata": {
            "source": "hyrox_training_program.html export",
            "originalStartDate": days[0]["date"].isoformat(),
            "originalEndDate": days[-1]["date"].isoformat(),
            "originalWeek1Monday": week0.isoformat(),
            "note": "Weeks/days are relative. Set settings.startDate to the Monday of week 1 "
                    "to place the programme on the calendar.",
        },
        "phases": phases,
        "weeks": weeks,
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)

    print(f"days parsed      : {len(days)}  ({days[0]['date']} -> {days[-1]['date']})")
    print(f"week 1 Monday    : {week0}")
    print(f"weeks / sessions : {n} / {sum(len(w['sessions']) for w in weeks)}")
    print(f"sections total   : {sum(len(s['sections']) for w in weeks for s in w['sessions'])}")
    print(f"blocks total     : {sum(len(s['blocks']) for w in weeks for s in w['sessions'])}")
    for k in sorted(stats):
        print(f"{k:24}: {stats[k]}")
    empty = [s['id'] for w in weeks for s in w['sessions'] if not s['blocks']]
    print(f"sessions w/o main: {len(empty)} {empty[:6]}")
    print(f"written          : {OUT} ({os.path.getsize(OUT)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
