# Smoke-test harness

There's no build step and no test runner, so this is a small kit for driving the
**real app** against a **fake backend**: no network, no real data, and a clock you
control. It exists because a refactor once silently deleted a feature (see
`eslint.config.mjs`) and because sync bugs only show up under awkward timing.

```bash
npm install            # once — lint only
npm run lint           # catches calls to functions that no longer exist
python3 tests/make_smoke.py
python3 -m http.server 5174     # use a server that sends Cache-Control: no-store,
                                # or the browser will happily run a stale app.js
# open  http://127.0.0.1:5174/_smoke.html?now=2026-10-06T10:00:00#/today
```

## Query parameters

| Param | Effect |
|---|---|
| `now=2026-10-06T10:00:00` | Fixes the clock (to test mid-programme, Mondays, DST…) |
| `seed=empty` | Brand-new account → the first-run programme picker |
| `anon=1` | Signed out → the sign-in gate |
| `prog=19` | Account on the 19-week plan (default is the 11-week Fitr plan) |
| `progress=1` | Pre-completes two sessions (`W1.W01S1`, `W10.W10S1`) |
| `pullfail=1` | Server unreachable on load (offline cold start) |
| `pushdelay=1500` | Uploads take 1.5 s (to race an edit against its own push) |

## Hooks on `window`

* `__fake.rows` — what the "server" holds. `__fake.upserts` — every batch it received.
  `__fake.pullFail` / `__fake.pushFail` — flip at runtime.
* `__errs` — every uncaught error and unhandled rejection since page start.

## Scenarios worth re-running after touching sync, dates or sheets

1. **Offline edit survives a reload** — put a key in `hyrox.sync.pending.<uid>` plus a
   newer local value, boot against older server data: local must win and upload.
2. **Edit during its own upload** — `pushdelay=1500`, tick a set, change its weight
   1.7 s later: the server must end up with the second value.
3. **Restart vs re-align** — Settings → Start a new block: "Continue where the
   programme is now" keeps progress; "Start from Week 1" starts a clean log.
4. **Timer** — minimise, then tap the pill and the settings gear (both must work);
   stop during the 3-2-1 (no errors); fast-forward `Date.now` 200 s (must land in REST).
5. **Photo queue** — script three Gemini replies (fail, fail, slow-ok…) and tap Retry
   on the failed photo while another is analysing: nothing may stay "Queued".
6. **DST** — `TZ=Europe/Madrid`, week-start maths either side of 25 Oct / 28 Mar.
