#!/usr/bin/env python3
"""Convert the recipe library markdown into the app's recipes.json.

The markdown is the source of truth — it's what Alex actually shops and cooks
from — so this parses it rather than restating it, and re-running after an edit
picks the changes straight up.

Each recipe gives TOTAL macros, not per-ingredient ones, so the app logs a
recipe as a single item carrying those totals. Inventing a split across
ingredients would look more precise while being less accurate.
"""
import re, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(HERE, "hyrox-recipes-v2.md")
OUT  = os.path.join(HERE, "recipes.json")

# Markdown code prefix -> (the app's meal slot, a readable name for the group)
SLOTS = {
    "BRK":  ("breakfast", "Breakfast"),
    "LUN":  ("lunch",     "Lunch"),
    "DIN":  ("dinner",    "Dinner"),
    "PRE":  ("snack",     "Pre-gym"),
    "POST": ("snack",     "Post-gym"),
    "TRT":  ("snack",     "Treat"),
}

HEAD_RE  = re.compile(r'^###\s+([A-Z]+)-(\d+)\s*·\s*(.+?)\s*$')
META_RE  = re.compile(r'\*\*Time:\*\*\s*([^|]+?)\s*(?:\|\s*\*\*Method:\*\*\s*(.+?))?\s*$')
MACRO_RE = re.compile(
    r'\*\*Macros:\*\*\s*(?:approx\.\s*)?([\d.]+)\s*kcal\s*\|\s*([\d.]+)\s*g\s*protein'
    r'\s*\|\s*([\d.]+)\s*g\s*carbs\s*\|\s*([\d.]+)\s*g\s*fat', re.I)
ROW_RE   = re.compile(r'^\|\s*(.+?)\s*\|\s*(.+?)\s*\|\s*$')
STEP_RE  = re.compile(r'^\d+\.\s*(.+)$')


def first_minutes(txt):
    """'12-14 min' -> 14; '3 min (night before)' -> 3. Upper bound, so a
    15-minute filter never promises something that takes 20."""
    nums = [int(n) for n in re.findall(r'\d+', txt or "")]
    return max(nums) if nums else None


def main():
    if not os.path.exists(SRC):
        sys.exit(f"Missing {SRC}")
    lines = open(SRC, encoding="utf-8").read().split("\n")

    recipes, cur, section = [], None, None
    for raw in lines:
        ln = raw.rstrip()

        m = HEAD_RE.match(ln)
        if m:
            prefix, num, name = m.group(1), m.group(2), m.group(3)
            if prefix not in SLOTS:
                cur = None
                continue
            slot, group = SLOTS[prefix]
            cur = {
                "code": f"{prefix}-{num}", "name": name, "slot": slot, "group": group,
                "timeMin": None, "method": "", "kcal": 0, "p": 0, "c": 0, "f": 0,
                "ingredients": [], "steps": [], "note": ""
            }
            recipes.append(cur)
            section = None
            continue

        if cur is None:
            continue

        mm = MACRO_RE.search(ln)
        if mm:
            cur["kcal"], cur["p"], cur["c"], cur["f"] = (round(float(x)) for x in mm.groups())
            continue

        if "**Time:**" in ln:
            tm = META_RE.search(ln)
            if tm:
                cur["timeMin"] = first_minutes(tm.group(1))
                cur["method"] = (tm.group(2) or "").strip()
            continue

        if ln.startswith("**Steps**"):
            section = "steps"
            continue

        sm = STEP_RE.match(ln)
        if sm:
            cur["steps"].append(sm.group(1))
            continue

        rm = ROW_RE.match(ln)
        if rm:
            a, b = rm.group(1), rm.group(2)
            # Skip the header row and its |---|---| underline.
            if set(a) <= set("-: ") or a.lower() == "ingredient":
                continue
            cur["ingredients"].append({"name": a, "amount": b})
            continue

        # A bare sentence after the table is a prep note ("Blend with ice.").
        if ln and not ln.startswith(("|", "#", "---", "**")) and not cur["steps"]:
            cur["note"] = (cur["note"] + " " + ln).strip()

    # Snacks with no stated time are assemble-only.
    for r in recipes:
        if r["timeMin"] is None:
            r["timeMin"] = 2 if r["group"] in ("Pre-gym", "Post-gym", "Treat") else 10

    bad = [r["code"] for r in recipes if not r["kcal"] or not r["ingredients"]]
    data = {
        "version": "hyrox-recipes-v2",
        "source": "hyrox-recipes-v2.md",
        "slotTargets": {
            "breakfast": {"kcal": 525, "p": 40, "label": "~500-550 kcal · ~40 g protein"},
            "lunch":     {"kcal": 625, "p": 55, "label": "~600-650 kcal · ~55 g protein"},
            "dinner":    {"kcal": 625, "p": 55, "label": "~600-650 kcal · ~55 g protein"},
            "snack":     {"kcal": 290, "p": 25, "label": "~250-320 kcal"}
        },
        "recipes": recipes
    }
    json.dump(data, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

    from collections import Counter
    print(f"recipes      : {len(recipes)}")
    print(f"by group     : {dict(Counter(r['group'] for r in recipes))}")
    print(f"with steps   : {sum(1 for r in recipes if r['steps'])}")
    print(f"ingredients  : {sum(len(r['ingredients']) for r in recipes)}")
    print(f"time range   : {min(r['timeMin'] for r in recipes)}-{max(r['timeMin'] for r in recipes)} min")
    print(f"incomplete   : {bad or 'none'}")
    print(f"written      : {OUT} ({os.path.getsize(OUT)/1024:.0f} KB)")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
