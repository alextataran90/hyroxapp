#!/usr/bin/env python3
"""Prove the converted plan still contains every line of the HTML export.

convert_program.py reshapes the export a lot — it lifts exercise rows out of
warm-ups, regroups them by slot label and promotes station headings to blocks.
This diffs the two line-by-line so a parsing change can't quietly drop a set,
a weight or a coaching note. Headings that became structure rather than text
(`Superset 2` -> group.label, a station heading -> block.name) are matched
against that structure instead of against body text.

    python3 plans/verify_plan.py        # exits non-zero if anything was lost
"""
import re, json, html, collections, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = "/Users/alexandrutataran/Downloads/hyrox_training_program.html"
PLAN = os.path.join(HERE, "hyrox-11week.json")


def lines(t):
    return [l.strip() for l in html.unescape(t).replace("\r", "").split("\n") if l.strip()]


def main():
    src = open(SRC, encoding="utf-8").read()
    plan = json.load(open(PLAN, encoding="utf-8"))

    source = {}
    for a in re.split(r'(?=<article class="day" id="day-)', src):
        m = re.match(r'<article class="day" id="day-(\d{4}-\d{2}-\d{2})"', a)
        if not m:
            continue
        body = a[: a.find("</article>")]
        got = []
        for _cls, _t, v in re.findall(
                r'<div class="sec([^"]*)">'
                r'(?:<div class="sec-title">([^<]*)</div>)?'
                r'<div class="sec-body">(.*?)</div>', body, re.S):
            got += lines(v)
        source[m.group(1)] = got

    out = {}
    for w in plan["weeks"]:
        for s in w["sessions"]:
            got = []
            for sec in s["sections"]:
                got.append(sec["title"])   # a heading inside a body became a section
                got += sec.get("steps", [])
                if sec.get("text"):
                    got += lines(sec["text"])
            for b in s["blocks"]:
                got.append(b["name"])          # a heading may have become a block name
                if b.get("text"):
                    got += lines(b["text"])
                for g in b.get("groups", []):
                    if g["label"]:
                        got.append(g["label"])  # ...or a superset label
                    for it in g["items"]:
                        got.append(it["name"])
                        if it["slot"]:
                            got.append(it["slot"])
                        got += it["notes"]
            out[s["sourceDate"]] = got

    missing = collections.Counter()
    bad_days = []
    for d, want in source.items():
        gone = collections.Counter(want) - collections.Counter(out.get(d, []))
        if gone:
            bad_days.append(d)
            missing.update(gone)

    print(f"days compared : {len(source)}")
    print(f"days complete : {len(source) - len(bad_days)}")
    print(f"lines dropped : {sum(missing.values())}")
    for k, n in missing.most_common(20):
        print(f"   {n}x  {k[:100]!r}")
    if missing:
        print(f"\nFAIL — content lost on: {', '.join(bad_days[:10])}")
        return 1
    print("\nOK — every line of the export is present in the plan.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
