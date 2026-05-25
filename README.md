# Hyrox Trainer

Personal Hyrox training PWA. 19 weeks from 2026-05-18 to race day 2026-09-26. Target: **sub 1:08**.

## What it is

- A Progressive Web App that installs to your iPhone home screen via Safari.
- Vanilla HTML/CSS/JS — no build step, no framework, no database.
- All data (settings, completed sessions, test logs) lives in `localStorage` on your phone.
- The training plan lives in `plan.json` — when we update it every 4 weeks, that's the only file that changes.

## First-time setup (5 minutes)

### 1. Push to GitHub Pages

```bash
cd "/Users/alexandrutataran/Desktop/POCs/Claude Projects/TrainingApp"
git init
git add .
git commit -m "Initial Hyrox Trainer"

# Create a GitHub repo first at https://github.com/new (private is fine)
git remote add origin https://github.com/<you>/hyrox-trainer.git
git branch -M main
git push -u origin main
```

Then on GitHub:
- Settings → Pages → Source: `Deploy from a branch`, Branch: `main`, Folder: `/ (root)`
- Wait ~1 minute. GitHub gives you a URL like `https://<you>.github.io/hyrox-trainer/`

### 2. Install on iPhone

1. Open Safari on iPhone.
2. Go to your GitHub Pages URL.
3. Tap the share icon → **Add to Home Screen** → name it "Hyrox".
4. Open the new icon from your home screen. It'll run full-screen like a native app.

### 3. Fill in Settings

Open **Settings** tab. Enter:
- Race date (default 2026-09-26)
- Body weight
- All your 1RMs (Back Squat, Deadlift, Bench, OHP, Push Press, Clean, Snatch)
- Station loads (defaults are Open Men: 152/103/20/9/24)
- Run paces (Easy, Threshold, 5K, Hyrox target 4:10/km)
- Erg splits (2K Row, 1K Ski per-500m splits)

Save. Loads everywhere update automatically.

## Daily use

- **Today** — your next undone session for this week, with all loads pre-computed in kg and paces in mm:ss.
- Tap each block to mark it done as you go through the workout. Tap the big button at the bottom to mark the whole session done.
- **Week** — all 6 sessions for the current week. Tap a session card to open detail.
- Each session has a day-picker — tap a chip to move it to another day. Rest day is whatever you don't fill.
- **Plan** — see the whole 19-week macrocycle at a glance.
- **Tests** — log every 4-week test (Wk 4, 8, 12, 16). Use the "Copy for Claude" button to grab a chat-ready summary.

## The 4-week update loop

1. Complete the test session at Week 4 / 8 / 12 / 16.
2. Screenshot your splits.
3. In your chat with Claude, paste the screenshot + the "Copy for Claude" text from the Tests tab.
4. Claude regenerates `plan.json` with new loads/paces and bumps `version`.
5. On your Mac:
   ```bash
   cd "/Users/alexandrutataran/Desktop/POCs/Claude Projects/TrainingApp"
   git pull   # if Claude pushed directly
   # or git add plan.json && git commit -m "Plan update Wk N" && git push
   ```
6. On your iPhone, open the app. A "New plan available" banner appears at the bottom. Tap **Reload**. Your settings and history are preserved.

## File structure

```
TrainingApp/
├── index.html              UI shell
├── styles.css              Dark-mode iOS-friendly styles
├── app.js                  SPA router + render + persistence
├── plan.json               The 19-week macrocycle  ← updated every 4 weeks
├── manifest.webmanifest    PWA install metadata
├── service-worker.js       Offline + update detection
├── icons/
│   └── icon.svg            App icon
└── README.md
```

## Plan structure cheat sheet

Each session in `plan.json` has:
- `id` (e.g. `W05S3` = Week 5, Session 3)
- `title`, `duration` (min), `focus` (strength/run/hybrid/sim/test)
- `defaultDay` (Mon..Sat) — only a hint, you can reassign
- `warmup` / `cooldown` (arrays of strings)
- `blocks` (the main work). Each block has `name`, `scheme`, optional `rest`, and a `load` spec.

Load specs use references that pull from Settings:
- `{ "type": "pct", "ref": "backSquat1RM", "pct": 0.75 }` → `90 kg · 75%`
- `{ "type": "pace", "ref": "thresholdPaceSecPerKm", "factor": 1.0 }` → `4:30/km`
- `{ "type": "split", "ref": "row2KSplit", "factor": 0.97 }` → `1:47/500m`
- `{ "type": "station", "ref": "wallBallLoad" }` → `9 kg`
- `{ "type": "fixed", "value": "2 × 20 kg DB" }` → fixed display
- `{ "type": "bw" }` / `{ "type": "rpe", "value": 8 }`

## Why a PWA, not a native iOS app?

- Zero Xcode, zero Apple Developer account, zero TestFlight, zero App Store review.
- Updating the plan = editing one JSON file + git push. Done.
- The phone treats it like an app: full-screen, home-screen icon, works offline.

## Why no database?

- One athlete. One device. Settings + history easily fit in `localStorage` (megabytes available).
- Removes any sync/cloud/backend complexity.
- If you want a backup, export from Settings (planned future feature) or `JSON.stringify(localStorage)` in DevTools.

## Race target rationale (from Malaga 2026 analysis)

| Component | Malaga | Target | Save |
|---|---|---|---|
| 8 runs (avg) | 38:06 (4:46/km) | 33:30 (4:11/km) | −4:36 |
| Sandbag Lunges | 4:32 | 3:30 | −1:02 |
| Burpee BJ | 4:55 | 4:00 | −0:55 |
| Wall Balls | 4:53 | 4:10 | −0:43 |
| Row | 4:31 | 4:00 | −0:31 |
| Sleds (combined) | 6:31 | 6:05 | −0:26 |
| SkiErg | 4:22 | 4:10 | −0:12 |
| Farmers | 1:52 | 1:50 | −0:02 |
| Transitions | ~6:00 | 4:30 | −1:30 |
| **Total** | **1:15:17** | **1:07:59** | **−7:18** |

Plan focuses heaviest on the compromised-run combinations (lunge→run, burpee→run, wall ball→run) since those are the largest individual losses.
