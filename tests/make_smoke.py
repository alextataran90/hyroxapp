#!/usr/bin/env python3
"""Build _smoke.html: the real index.html with the Supabase library swapped for
tests/fake-supabase.js, so the actual boot path, router and every screen run
against a controllable fake backend.  Re-run after editing index.html.

    python3 tests/make_smoke.py
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(ROOT, "index.html"), encoding="utf-8").read()
tag = '<script src="vendor/supabase.js"></script>'
if tag not in src:
    raise SystemExit("index.html no longer loads vendor/supabase.js — update make_smoke.py")
out = src.replace(tag, '<script src="tests/fake-supabase.js"></script>')
with open(os.path.join(ROOT, "_smoke.html"), "w", encoding="utf-8") as f:
    f.write(out)
print("wrote _smoke.html")
