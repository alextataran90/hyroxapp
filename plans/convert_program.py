#!/usr/bin/env python3
"""Convert the exported HYROX Training Program HTML into the app's plan JSON.

The source is a static HTML export: one <article class="day"> per training day,
each with id="day-YYYY-MM-DD", a data-type, and a set of titled sections.
We map it onto the app's relative week/day model so a single plan file works
both for someone starting today (week 1 = their first week) and for an athlete
aligning to the programme's original calendar (startDate = 2026-08-03).
"""
import re, json, html, datetime, collections, sys

SRC = "/Users/alexandrutataran/Downloads/hyrox_training_program.html"
OUT = "/Users/alexandrutataran/Desktop/POCs/Claude Projects/TrainingApp/plans/hyrox-11week.json"

DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
FOCUS = {"run": "run", "str": "strength", "sim": "sim"}
# Sections that are warm-up / cooldown / coach notes; everything else is main work.
WARM, COOL, NOTE = "s-warm", "s-cool", "s-note"

DEFAULT_DURATION = {"run": 60, "strength": 75, "sim": 90}


def clean(t: str) -> str:
    """Unescape entities and normalise whitespace, keeping line structure."""
    t = html.unescape(t)
    t = t.replace("\r\n", "\n").replace("\r", "\n")
    lines = [ln.rstrip() for ln in t.split("\n")]
    # collapse 3+ blank lines down to one
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
    return [ln.strip() for ln in clean(t).split("\n") if ln.strip()]


def monday(d: datetime.date) -> datetime.date:
    return d - datetime.timedelta(days=d.weekday())


def title_case(s: str) -> str:
    """'ZONE 2 RUN' -> 'Zone 2 Run'; leave mixed-case titles alone."""
    s = s.strip()
    # The export carries a few titles with an unbalanced bracket, e.g.
    # "Hyrox Strength Workout 1)" or "Workout 1) Power Builder". Drop the stray
    # numbering rather than surface it as a session name.
    if s.count(")") > s.count("("):
        s = re.sub(r'^\s*workout\s*\d+\)\s*', '', s, flags=re.I).strip() or s
    while s.endswith(")") and s.count(")") > s.count("("):
        s = s[:-1].strip()
    s = re.sub(r'\s{2,}', ' ', s)
    return s.title() if s.isupper() else s


def main():
    src = open(SRC, encoding="utf-8").read()

    # Split the document into day articles.
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
        # and no title, holding the whole session in a single body. Both forms
        # must parse or that day silently comes through empty.
        secs = re.findall(
            r'<div class="sec([^"]*)">'
            r'(?:<div class="sec-title">([^<]*)</div>)?'
            r'<div class="sec-body">(.*?)</div>',
            body, re.S)

        norm = []
        for cls, t, v in secs:
            cls = cls.strip()                       # "s-warm" | "" for a bare sec
            title = html.unescape(t).strip() if t else ""
            if not title:
                title = badge_txt or "Session"      # untitled blob -> name it from the badge
            norm.append((cls, title, v))

        days.append({"date": date, "type": dtype, "badge": badge_txt, "secs": norm})

    if not days:
        sys.exit("No day articles parsed — the export format may have changed.")

    days.sort(key=lambda d: d["date"])
    week0 = monday(days[0]["date"])

    # ---- build weeks -------------------------------------------------
    by_week = collections.defaultdict(list)
    for d in days:
        wn = (monday(d["date"]) - week0).days // 7 + 1
        by_week[wn].append(d)

    weeks = []
    for wn in sorted(by_week):
        sessions = []
        for i, d in enumerate(sorted(by_week[wn], key=lambda x: x["date"]), start=1):
            focus = FOCUS.get(d["type"], "hybrid")
            warmup, cooldown, notes, blocks = [], [], [], []

            for cls, title, raw in d["secs"]:
                text = clean(raw)
                if not text:
                    continue
                if cls == WARM:
                    warmup += lines_of(raw)
                elif cls == COOL:
                    cooldown += lines_of(raw)
                elif cls == NOTE:
                    notes.append(text)
                else:
                    # Main work: keep the prose verbatim in `text`.
                    blocks.append({"name": title_case(title), "text": text})

            # Duration: honour an explicit "Total: NNmin" when the plan states one.
            mins = [int(x) for x in re.findall(r'Total:\s*(\d+)\s*min',
                                               " ".join(c for _, _, c in d["secs"]), re.I)]
            duration = max(mins) if mins else DEFAULT_DURATION.get(focus, 60)

            # Some sessions lead with an athlete-variant heading ("PRO", "OPEN").
            # Those describe who the block is for, not what the session is, so
            # they make useless session titles — skip them when naming it.
            VARIANT = re.compile(r'^(pro|open|beginners?|rx|scaled|athlete notes)$', re.I)
            main_titles = [b["name"] for b in blocks if not VARIANT.match(b["name"].strip())]
            title = main_titles[0] if main_titles else (d["badge"] or "Session")

            sessions.append({
                "id": f"W{wn:02d}S{i}",
                "title": title,
                "duration": duration,
                "focus": focus,
                "defaultDay": DOW[d["date"].weekday()],
                "intent": d["badge"],
                "sourceDate": d["date"].isoformat(),
                "warmup": warmup,
                "blocks": blocks,
                "cooldown": cooldown,
                **({"tips": "\n\n".join(notes)} if notes else {}),
            })

        weeks.append({"number": wn, "sessions": sessions})

    # ---- phases: grouped by thirds, named from what the weeks contain ----
    n = len(weeks)
    bounds = [(1, n // 3), (n // 3 + 1, 2 * n // 3), (2 * n // 3 + 1, n)]
    names = ["Build", "Intensify", "Race Prep"]
    phases = []
    for (a, b), nm in zip(bounds, names):
        wl = list(range(a, b + 1))
        mix = collections.Counter(
            s["focus"] for w in weeks if w["number"] in wl for s in w["sessions"])
        phases.append({
            "name": nm,
            "weeks": wl,
            "focus": " · ".join(f"{c} {k}" for k, c in mix.most_common()),
        })
    for w in weeks:
        w["phase"] = next(p["name"] for p in phases if w["number"] in p["weeks"])

    plan = {
        "version": "hyrox-11week-2026-08-06",
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

    import os
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(plan, f, ensure_ascii=False, indent=1)

    # ---- report ------------------------------------------------------
    print(f"days parsed      : {len(days)}  ({days[0]['date']} -> {days[-1]['date']})")
    print(f"week 1 Monday    : {week0}")
    print(f"weeks            : {n}")
    print(f"sessions         : {sum(len(w['sessions']) for w in weeks)}")
    print(f"focus mix        : {dict(collections.Counter(s['focus'] for w in weeks for s in w['sessions']))}")
    print(f"blocks total     : {sum(len(s['blocks']) for w in weeks for s in w['sessions'])}")
    empty = [s['id'] for w in weeks for s in w['sessions'] if not s['blocks']]
    print(f"sessions w/o main: {len(empty)} {empty[:6]}")
    print(f"sessions per week: {[len(w['sessions']) for w in weeks]}")
    print(f"written          : {OUT} ({os.path.getsize(OUT)/1024:.0f} KB)")


if __name__ == "__main__":
    main()
