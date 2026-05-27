/* Hyrox Trainer - vanilla SPA */

const APP_VERSION_KEY = "hyrox.app.version";
const SETTINGS_KEY = "hyrox.settings";
const PROGRESS_KEY = "hyrox.progress";
const TESTS_KEY = "hyrox.tests";
const DAY_OVERRIDES_KEY = "hyrox.dayOverrides";
const OVERRIDES_KEY = "hyrox.overrides";
const USER_BLOCKS_KEY = "hyrox.userblocks";
const JOURNAL_KEY = "hyrox.journal";
const SESSION_LOGS_KEY = "hyrox.sessionlogs";
const READINESS_KEY = "hyrox.readiness";
const PR_KEY = "hyrox.prs";
const NUTRITION_KEY = "hyrox.nutrition";
const FITNESS_KEY = "hyrox.fitness";
const DAILY_BURN_KEY = "hyrox.dailyBurn";
const FOOD_KEY = "hyrox.foods";
const ACTUALS_KEY = "hyrox.actuals";
const PLAN_URL = "plan.json";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ---------- Defaults ---------- */

const DEFAULT_SETTINGS = {
  raceDate: "2026-09-26",
  startDate: "2026-05-18",
  rounding: 2.5,
  body: { bodyWeight: 80 },
  lifts: {
    backSquat1RM: null,
    frontSquat1RM: null,
    deadlift1RM: null,
    bench1RM: null,
    ohp1RM: null,
    pushPress1RM: null,
    clean1RM: null,
    snatch1RM: null
  },
  stations: {
    sledPushLoad: 152,
    sledPullLoad: 103,
    sandbagLoad: 20,
    wallBallLoad: 9,
    farmersLoad: 24,
    kbLungeLoad: 24
  },
  running: {
    easyPaceSecPerKm: 330,
    thresholdPaceSecPerKm: 270,
    race5KSecPerKm: 270,
    raceHyroxTargetSecPerKm: 250
  },
  ergs: {
    row2KSplit: 110,
    ski1KSplit: 130
  },
  nutrition: {
    geminiKey: "",
    kcalTarget: 2800,
    proteinTarget: 180,
    carbTarget: 350,
    fatTarget: 80,
    mealTargetBreakfast: 25,
    mealTargetLunch: 35,
    mealTargetDinner: 30,
    mealTargetSnack: 10
  }
};

const REF_LABELS = {
  backSquat1RM: "Back Squat 1RM",
  frontSquat1RM: "Front Squat 1RM",
  deadlift1RM: "Deadlift 1RM",
  bench1RM: "Bench 1RM",
  ohp1RM: "Overhead Press 1RM",
  pushPress1RM: "Push Press 1RM",
  clean1RM: "Power Clean 1RM",
  snatch1RM: "Power Snatch 1RM",
  sledPushLoad: "Sled Push race load",
  sledPullLoad: "Sled Pull race load",
  sandbagLoad: "Sandbag race load",
  wallBallLoad: "Wall ball load",
  farmersLoad: "Farmers per hand",
  kbLungeLoad: "KB lunge load",
  easyPaceSecPerKm: "Easy pace",
  thresholdPaceSecPerKm: "Threshold pace",
  race5KSecPerKm: "5K race pace",
  raceHyroxTargetSecPerKm: "Hyrox target pace",
  row2KSplit: "2K row split /500m",
  ski1KSplit: "1K SkiErg split /500m",
  bodyWeight: "Body weight",
  geminiKey: "Gemini API key",
  kcalTarget: "Daily calorie target",
  proteinTarget: "Protein target",
  carbTarget: "Carb target",
  fatTarget: "Fat target",
  mealTargetBreakfast: "Breakfast target %",
  mealTargetLunch: "Lunch target %",
  mealTargetDinner: "Dinner target %",
  mealTargetSnack: "Snack target %"
};

/* ---------- Storage helpers ---------- */

function loadJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return { ...fallback, ...JSON.parse(raw) };
  } catch (e) {
    return fallback;
  }
}

function saveJSON(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function getSettings() {
  const stored = loadJSON(SETTINGS_KEY, DEFAULT_SETTINGS);
  // Deep-merge nested sections so adding new fields works on upgrade.
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    body: { ...DEFAULT_SETTINGS.body, ...(stored.body || {}) },
    lifts: { ...DEFAULT_SETTINGS.lifts, ...(stored.lifts || {}) },
    stations: { ...DEFAULT_SETTINGS.stations, ...(stored.stations || {}) },
    running: { ...DEFAULT_SETTINGS.running, ...(stored.running || {}) },
    ergs: { ...DEFAULT_SETTINGS.ergs, ...(stored.ergs || {}) },
    nutrition: { ...DEFAULT_SETTINGS.nutrition, ...(stored.nutrition || {}) }
  };
}

function getProgress() {
  return loadJSON(PROGRESS_KEY, { sessions: {} });
}

function getTests() {
  const stored = loadJSON(TESTS_KEY, { items: [] });
  return stored.items ? stored : { items: [] };
}

function getDayOverrides() {
  return loadJSON(DAY_OVERRIDES_KEY, { overrides: {} });
}

/* ---------- Weight overrides ---------- */

function getOverrides() {
  try { return JSON.parse(localStorage.getItem(OVERRIDES_KEY) || "{}"); }
  catch { return {}; }
}

function getBlockOverride(weekNum, sessionId, blockIdx) {
  const o = getOverrides();
  return o[`W${weekNum}.${sessionId}.b${blockIdx}`] ?? null;
}

function setBlockOverride(weekNum, sessionId, blockIdx, kg) {
  const o = getOverrides();
  const key = `W${weekNum}.${sessionId}.b${blockIdx}`;
  if (kg == null) delete o[key];
  else o[key] = kg;
  localStorage.setItem(OVERRIDES_KEY, JSON.stringify(o));
}

/* ---------- User-added blocks ---------- */

function getUserBlocks(weekNum, sessionId) {
  try {
    const all = JSON.parse(localStorage.getItem(USER_BLOCKS_KEY) || "{}");
    return all[`W${weekNum}.${sessionId}`] || [];
  } catch { return []; }
}

function addUserBlock(weekNum, sessionId, block) {
  try {
    const all = JSON.parse(localStorage.getItem(USER_BLOCKS_KEY) || "{}");
    const key = `W${weekNum}.${sessionId}`;
    if (!all[key]) all[key] = [];
    all[key].push({ ...block, id: "ub" + Date.now() });
    localStorage.setItem(USER_BLOCKS_KEY, JSON.stringify(all));
  } catch {}
}

function deleteUserBlock(weekNum, sessionId, blockId) {
  try {
    const all = JSON.parse(localStorage.getItem(USER_BLOCKS_KEY) || "{}");
    const key = `W${weekNum}.${sessionId}`;
    if (all[key]) all[key] = all[key].filter((b) => b.id !== blockId);
    localStorage.setItem(USER_BLOCKS_KEY, JSON.stringify(all));
  } catch {}
}

/* ---------- Session journal ---------- */

function getJournalNote(weekNum, sessionId) {
  try {
    const all = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}");
    return all[`W${weekNum}.${sessionId}`] || "";
  } catch { return ""; }
}

function saveJournalNote(weekNum, sessionId, text) {
  try {
    const all = JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}");
    if (text) all[`W${weekNum}.${sessionId}`] = text;
    else delete all[`W${weekNum}.${sessionId}`];
    localStorage.setItem(JOURNAL_KEY, JSON.stringify(all));
  } catch {}
}

/* ---------- Set-by-set logging ---------- */

function getBlockLogs(weekNum, sessionId, blockIdx) {
  try {
    const all = JSON.parse(localStorage.getItem(SESSION_LOGS_KEY) || "{}");
    return all[`W${weekNum}.${sessionId}.b${blockIdx}`] || [];
  } catch { return []; }
}

function addBlockLog(weekNum, sessionId, blockIdx, entry) {
  try {
    const all = JSON.parse(localStorage.getItem(SESSION_LOGS_KEY) || "{}");
    const key = `W${weekNum}.${sessionId}.b${blockIdx}`;
    if (!all[key]) all[key] = [];
    all[key].push({ ...entry, id: "l" + Date.now() });
    localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(all));

    // Check for PR
    if (entry.kg != null && entry.blockName) {
      const prev = getStoredPR(entry.blockName);
      if (prev === null) {
        updateStoredPR(entry.blockName, entry.kg);
      } else if (entry.kg > prev) {
        updateStoredPR(entry.blockName, entry.kg);
        setTimeout(() => showPRToast(entry.blockName, entry.kg), 350);
      }
    }
  } catch {}
}

function deleteBlockLog(weekNum, sessionId, blockIdx, logId) {
  try {
    const all = JSON.parse(localStorage.getItem(SESSION_LOGS_KEY) || "{}");
    const key = `W${weekNum}.${sessionId}.b${blockIdx}`;
    if (all[key]) all[key] = all[key].filter((l) => l.id !== logId);
    localStorage.setItem(SESSION_LOGS_KEY, JSON.stringify(all));
  } catch {}
}

/* ---------- Smart log defaults (last logged kg for a block name) ---------- */

function getLastLoggedKgForBlock(blockName) {
  try {
    const all = JSON.parse(localStorage.getItem(SESSION_LOGS_KEY) || "{}");
    let lastKg = null;
    let lastTime = 0;
    for (const logs of Object.values(all)) {
      if (!Array.isArray(logs)) continue;
      for (const l of logs) {
        if (l.blockName === blockName && l.kg != null && l.at) {
          const t = new Date(l.at).getTime();
          if (t > lastTime) { lastTime = t; lastKg = l.kg; }
        }
      }
    }
    return lastKg;
  } catch { return null; }
}

/* ---------- PR tracking ---------- */

function getStoredPR(blockName) {
  try {
    const prs = JSON.parse(localStorage.getItem(PR_KEY) || "{}");
    return prs[blockName] ?? null;
  } catch { return null; }
}

function updateStoredPR(blockName, kg) {
  try {
    const prs = JSON.parse(localStorage.getItem(PR_KEY) || "{}");
    prs[blockName] = kg;
    localStorage.setItem(PR_KEY, JSON.stringify(prs));
  } catch {}
}

function showPRToast(blockName, kg) {
  const toast = document.getElementById("pr-toast");
  if (!toast) return;
  toast.textContent = `🏆 New PR — ${blockName}: ${kg} kg!`;
  toast.hidden = false;
  toast.classList.add("visible");
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.classList.remove("visible");
    setTimeout(() => { toast.hidden = true; }, 350);
  }, 3000);
}

/* ---------- Nutrition helpers ---------- */

function getNutritionLog() {
  try { return JSON.parse(localStorage.getItem(NUTRITION_KEY) || "{}"); }
  catch { return {}; }
}

function getTodayMeals() {
  return getDayMeals(ymd(today()));
}

function getDayMeals(dateStr) {
  const log = getNutritionLog();
  return (log[dateStr] && log[dateStr].meals) ? log[dateStr].meals : [];
}

function getDayTotals(meals) {
  return meals.reduce((a, m) => ({
    kcal: a.kcal + (m.total ? m.total.kcal : 0),
    p:    a.p    + (m.total ? m.total.p    : 0),
    c:    a.c    + (m.total ? m.total.c    : 0),
    f:    a.f    + (m.total ? m.total.f    : 0)
  }), { kcal: 0, p: 0, c: 0, f: 0 });
}

function saveMeal(meal, dateStr) {
  const log = getNutritionLog();
  const ds = dateStr || ymd(today());
  if (!log[ds]) log[ds] = { meals: [] };
  const idx = log[ds].meals.findIndex((m) => m.id === meal.id);
  if (idx >= 0) log[ds].meals[idx] = meal;
  else log[ds].meals.push(meal);
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(log));
}

function deleteMeal(mealId, dateStr) {
  const log = getNutritionLog();
  const ds = dateStr || ymd(today());
  if (!log[ds]) return;
  log[ds].meals = log[ds].meals.filter((m) => m.id !== mealId);
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(log));
}

function makeMealId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- Food database ---------- */

function getFoodDb() {
  try { return JSON.parse(localStorage.getItem(FOOD_KEY) || "{}"); }
  catch { return {}; }
}

function saveFoodDb(db) {
  localStorage.setItem(FOOD_KEY, JSON.stringify(db));
}

/** Upsert a food entry keyed by normalised name. */
function updateFoodEntry(name, qtyNum, unit, kcal, p, c, f) {
  if (!name) return;
  const key = name.toLowerCase().trim();
  const db = getFoodDb();
  db[key] = { qtyNum: qtyNum || 0, unit: (unit || "g").trim(), kcal: kcal || 0, p: p || 0, c: c || 0, f: f || 0, updatedAt: new Date().toISOString() };
  saveFoodDb(db);
}

/** Look up a food entry by name (case-insensitive). Returns null if not found. */
function lookupFood(name) {
  if (!name) return null;
  const db = getFoodDb();
  return db[name.toLowerCase().trim()] || null;
}

/** Parse a legacy qty string like "50g", "2 scoops", "100 ml" → { qtyNum, unit }. */
function parseQtyString(qtyStr) {
  if (!qtyStr) return { qtyNum: 0, unit: "g" };
  const s = qtyStr.trim();
  const m = s.match(/^(\d+(?:\.\d+)?)\s*(.*)$/);
  if (!m) return { qtyNum: 0, unit: s || "g" };
  const num = parseFloat(m[1]);
  let unit = (m[2] || "g").trim().toLowerCase();
  if (unit === "gram" || unit === "grams" || unit === "gr") unit = "g";
  if (unit === "milliliter" || unit === "milliliters") unit = "ml";
  if (unit === "piece" || unit === "pieces" || unit === "pcs" || unit === "pc") unit = "pcs";
  if (!unit) unit = "g";
  return { qtyNum: isNaN(num) ? 0 : num, unit };
}

/** Return up to `limit` most-frequently-used items for a given meal label. */
function getFrequentItemsForMeal(mealLabel, limit = 5) {
  const log = getNutritionLog();
  const counts = {};
  for (const dayData of Object.values(log)) {
    if (!dayData.meals) continue;
    for (const meal of dayData.meals) {
      if (meal.label !== mealLabel) continue;
      for (const item of meal.items || []) {
        const key = (item.name || "").toLowerCase().trim();
        if (!key) continue;
        if (!counts[key]) counts[key] = { count: 0, item };
        counts[key].count++;
        counts[key].item = item; // keep latest
      }
    }
  }
  return Object.values(counts)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
    .map((e) => e.item);
}

/* ---------- Session actuals storage ---------- */

function getSessionActuals(weekNum, sessionId) {
  try {
    const all = JSON.parse(localStorage.getItem(ACTUALS_KEY) || "{}");
    return all[`W${weekNum}.${sessionId}`] || null;
  } catch { return null; }
}

function saveSessionActuals(weekNum, sessionId, actuals) {
  try {
    const all = JSON.parse(localStorage.getItem(ACTUALS_KEY) || "{}");
    all[`W${weekNum}.${sessionId}`] = actuals;
    localStorage.setItem(ACTUALS_KEY, JSON.stringify(all));
  } catch {}
}

/**
 * Render a block's load as a plain readable string (for actuals pre-fill).
 * Mirrors renderLoadSimple but returns a string, not HTML.
 */
function blockLoadText(load, settings) {
  if (!load) return "";
  switch (load.type) {
    case "pct": {
      const max = getRefValue(load.ref, settings);
      if (!max) return "";
      const r = settings.rounding || 2.5;
      return Math.round((max * load.pct) / r) * r + " kg";
    }
    case "fixed":  return load.value || "";
    case "bw":     return "bodyweight";
    case "pace": {
      const base = getRefValue(load.ref, settings);
      if (!base) return "";
      return formatSecToPace(base * (load.factor != null ? load.factor : 1.0)) + "/km";
    }
    case "split": {
      const base = getRefValue(load.ref, settings);
      if (!base) return "";
      return formatSecToPace(base * (load.factor != null ? load.factor : 1.0)) + "/500m";
    }
    case "station": {
      const v = getRefValue(load.ref, settings);
      return v != null ? v + " kg" : "";
    }
    case "rpe":   return "RPE " + load.value;
    case "label": return load.value || "";
    case "list":  return (load.items || []).join(", ");
    default:      return "";
  }
}

/* ---------- Fitness / Apple Watch ---------- */

const APPLE_WORKOUT_MAP = {
  "Running":                       { label: "Run",      icon: "🏃", focus: "run"      },
  "Walking":                       { label: "Walk",     icon: "🚶", focus: "run"      },
  "Hiking":                        { label: "Hike",     icon: "🥾", focus: "run"      },
  "Cycling":                       { label: "Cycling",  icon: "🚴", focus: "hybrid"   },
  "Swimming":                      { label: "Swim",     icon: "🏊", focus: "run"      },
  "Functional Strength Training":  { label: "Strength", icon: "💪", focus: "strength" },
  "Traditional Strength Training": { label: "Strength", icon: "💪", focus: "strength" },
  "High Intensity Interval Training": { label: "HIIT",  icon: "⚡", focus: "hybrid"   },
  "Cross Training":                { label: "Cross",    icon: "⚡", focus: "hybrid"   },
  "Core Training":                 { label: "Core",     icon: "🔥", focus: "strength" },
  "Other":                         { label: "Workout",  icon: "🏋️", focus: "hybrid"   },
};

function mapAppleWorkout(appleType) {
  return APPLE_WORKOUT_MAP[appleType] || { label: appleType || "Workout", icon: "🏋️", focus: "hybrid" };
}

function getFitnessLog() {
  try { return JSON.parse(localStorage.getItem(FITNESS_KEY) || "{}"); }
  catch { return {}; }
}

function getDayWorkouts(dateStr) {
  const log = getFitnessLog();
  return (log[dateStr] && log[dateStr].workouts) ? log[dateStr].workouts : [];
}

function saveFitnessWorkout(workout, dateStr) {
  const log = getFitnessLog();
  const ds = dateStr || ymd(today());
  if (!log[ds]) log[ds] = { workouts: [] };
  const idx = log[ds].workouts.findIndex((w) => w.id === workout.id);
  if (idx >= 0) log[ds].workouts[idx] = workout;
  else log[ds].workouts.push(workout);
  localStorage.setItem(FITNESS_KEY, JSON.stringify(log));
}

function deleteFitnessWorkout(workoutId, dateStr) {
  const log = getFitnessLog();
  const ds = dateStr || ymd(today());
  if (!log[ds]) return;
  log[ds].workouts = log[ds].workouts.filter((w) => w.id !== workoutId);
  localStorage.setItem(FITNESS_KEY, JSON.stringify(log));
}

function makeWorkoutId() {
  return "w" + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
}

function getAllWorkouts() {
  const log = getFitnessLog();
  const all = [];
  for (const [date, entry] of Object.entries(log)) {
    if (entry && entry.workouts) {
      entry.workouts.forEach((w) => all.push({ ...w, date }));
    }
  }
  return all.sort((a, b) => (b.startTime || b.date).localeCompare(a.startTime || a.date));
}

/* ---------- Daily burn (Move ring) ---------- */

function getDailyBurnLog() {
  try { return JSON.parse(localStorage.getItem(DAILY_BURN_KEY) || "{}"); } catch { return {}; }
}
function getDailyBurn(dateStr) {
  return (getDailyBurnLog()[dateStr] || {}).moveKcal || 0;
}
function saveDailyBurn(dateStr, moveKcal) {
  const log = getDailyBurnLog();
  log[dateStr] = { moveKcal, updatedAt: new Date().toISOString() };
  localStorage.setItem(DAILY_BURN_KEY, JSON.stringify(log));
}

/* ---------- HR zones ---------- */

const HR_ZONES = [
  { z: "z1", label: "Z1", name: "Recovery",  color: "#64a8ff" },
  { z: "z2", label: "Z2", name: "Aerobic",   color: "#30d158" },
  { z: "z3", label: "Z3", name: "Tempo",     color: "#ffd60a" },
  { z: "z4", label: "Z4", name: "Threshold", color: "#ff9500" },
  { z: "z5", label: "Z5", name: "VO2max",    color: "#ff3b30" },
];

function calcZones(hrSamples, maxHR) {
  const zones = { z1: 0, z2: 0, z3: 0, z4: 0, z5: 0 };
  const ref = maxHR || 185;
  for (const s of hrSamples) {
    const pct = (s.avg || s.Avg || 0) / ref;
    if      (pct < 0.60) zones.z1++;
    else if (pct < 0.70) zones.z2++;
    else if (pct < 0.80) zones.z3++;
    else if (pct < 0.90) zones.z4++;
    else                  zones.z5++;
  }
  return zones;
}

function buildZonesBar(zones) {
  if (!zones) return "";
  const total = HR_ZONES.reduce((s, z) => s + (zones[z.z] || 0), 0);
  if (!total) return "";
  const segs = HR_ZONES.filter((z) => zones[z.z] > 0).map((z) => {
    const pct = ((zones[z.z] / total) * 100).toFixed(1);
    return `<div class="fi-zone-seg" style="width:${pct}%;background:${z.color}" title="${z.label} ${z.name}: ${zones[z.z]} min"></div>`;
  }).join("");
  const legend = HR_ZONES.filter((z) => zones[z.z] > 0).map((z) =>
    `<span class="fi-zone-chip" style="--zc:${z.color}">${z.label} ${zones[z.z]}m</span>`
  ).join("");
  return `<div class="fi-zones-bar">${segs}</div><div class="fi-zones-legend">${legend}</div>`;
}

function buildSparkline(hrSamples, maxHR) {
  if (!hrSamples || hrSamples.length < 3) return "";
  const avgs = hrSamples.map((s) => s.avg || s.Avg || 0).filter((v) => v > 0);
  if (avgs.length < 3) return "";
  const lo = Math.max(40, Math.min(...avgs) - 10);
  const hi = Math.max(maxHR || 180, Math.max(...avgs) + 10);
  const W = 100, H = 36;
  const pts = avgs.map((v, i) => {
    const x = (i / (avgs.length - 1)) * W;
    const y = H - ((v - lo) / (hi - lo)) * H;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  return `<svg class="fi-sparkline" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true"><polyline points="${pts}" fill="none" stroke="var(--accent)" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/></svg>`;
}

/* ---------- Health Auto Export ZIP parser ---------- */

async function loadJSZip() {
  if (window.JSZip) return window.JSZip;
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js";
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => reject(new Error("Could not load ZIP library. Check your connection."));
    document.head.appendChild(s);
  });
}

/* Compress a base64 image to a small thumbnail data-URL (for meal storage + retry preview) */
function compressToThumb(b64, mime, maxPx = 220) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(img.width  * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.72));
    };
    img.onerror = () => resolve(null);
    img.src = `data:${mime};base64,${b64}`;
  });
}

function parseCSVRows(text) {
  const lines = text.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) => h.trim()).filter((h) => h);
  return lines.slice(1).map((line) => {
    const vals = line.split(",");
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || "").trim(); });
    return obj;
  });
}

async function parseHealthAutoExportZIP(file) {
  const JSZip = await loadJSZip();
  const zip   = await JSZip.loadAsync(file);
  const names = Object.keys(zip.files);

  // Find master workouts CSV
  const wName = names.find((n) => /^Workouts-.*\.csv$/.test(n));
  if (!wName) throw new Error("No Workouts-*.csv found. Make sure you exported from Health Auto Export.");

  const wText = await zip.files[wName].async("string");
  const rows  = parseCSVRows(wText);
  const existing = getAllWorkouts();

  const results = [];
  for (const row of rows) {
    const appleType  = row["Workout Type"];
    const startStr   = row["Start"];           // "2026-05-26 07:17"
    const endStr     = row["End"];
    const durStr     = row["Duration"];        // "01:06:32"
    const activeKJ   = parseFloat(row["Active Energy (kJ)"] || "0");
    const distKm     = parseFloat(row["Distance (km)"] || "0");
    const avgHR      = Math.round(parseFloat(row["Avg. Heart Rate (count/min)"] || "0"));
    const maxHR      = Math.round(parseFloat(row["Max. Heart Rate (count/min)"] || "0"));

    if (!appleType || !startStr) continue;

    // Dedup: skip if already imported (same type + startTime)
    if (existing.some((w) => w.startTime === startStr && w.appleType === appleType)) continue;

    // Duration → minutes
    const [hh, mm, ss] = (durStr || "0:0:0").split(":").map(Number);
    const durationMin = Math.round((hh || 0) * 60 + (mm || 0) + (ss || 0) / 60);

    // kJ → kcal
    const kcal = Math.round(activeKJ / 4.184);

    // Date
    const date = startStr.slice(0, 10);

    // Build timestamp key for filename matching: "2026-05-26 07:17" → "20260526_0717"
    const [datePart, timePart] = startStr.split(" ");
    const tsKey = datePart.replace(/-/g, "") + "_" + (timePart || "").replace(":", "").slice(0, 4);

    // Find Heart Rate CSV for this workout
    const hrName = names.find((n) =>
      n.startsWith(appleType + "-Heart Rate-" + tsKey) && n.endsWith(".csv")
    );

    let hrSamples = [];
    if (hrName) {
      const hrText = await zip.files[hrName].async("string");
      hrSamples = parseCSVRows(hrText)
        .map((r) => ({
          time: r["Date/Time"],
          min:  Math.round(parseFloat(r["Min (count/min)"] || "0")),
          max:  Math.round(parseFloat(r["Max (count/min)"] || "0")),
          avg:  Math.round(parseFloat(r["Avg (count/min)"] || "0")),
        }))
        .filter((s) => s.avg > 0);
    }

    const effectiveMax = maxHR || Math.max(...hrSamples.map((s) => s.max), 0) || 185;
    const zones = hrSamples.length > 0 ? calcZones(hrSamples, effectiveMax) : null;
    const mapped = mapAppleWorkout(appleType);

    results.push({
      id:         makeWorkoutId(),
      type:       mapped.focus,
      appleType,
      label:      appleType,
      icon:       mapped.icon,
      date,
      startTime:  startStr,
      endTime:    endStr,
      duration:   durationMin,
      kcal:       kcal || null,
      distance:   distKm > 0.01 ? Math.round(distKm * 100) / 100 : null,
      avgHR:      avgHR || null,
      maxHR:      effectiveMax || null,
      hrSamples,
      zones,
      source:     "health-auto-export",
      importedAt: new Date().toISOString(),
    });
  }

  // ── Active Energy (Move ring) daily totals ────────────────────────
  // Health Auto Export names this file "Active Energy (kJ)-*.csv"
  // It may contain one row per sample interval → sum per calendar day.
  const dailyBurnKj = {};
  const aeName = names.find((n) => /Active Energy/i.test(n) && n.endsWith(".csv") && !/Workout/i.test(n));
  if (aeName) {
    const aeText = await zip.files[aeName].async("string");
    const aeRows = parseCSVRows(aeText);
    for (const row of aeRows) {
      // Date column may be "Date/Time", "Date", "Start"
      const rawDate = (row["Date/Time"] || row["Date"] || row["Start"] || "").slice(0, 10);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) continue;
      // Value column may vary — try common names
      const kj = parseFloat(
        row["Active Energy (kJ)"] || row["Total (kJ)"] || row["Value (kJ)"] || row["kJ"] || "0"
      );
      if (kj > 0) dailyBurnKj[rawDate] = (dailyBurnKj[rawDate] || 0) + kj;
    }
  }
  // Convert kJ → kcal
  const dailyBurn = {};
  for (const [date, kj] of Object.entries(dailyBurnKj)) {
    dailyBurn[date] = Math.round(kj / 4.184);
  }

  return { workouts: results, dailyBurn };
}

function renderWorkoutCard(w, showDate = false) {
  const spark  = buildSparkline(w.hrSamples, w.maxHR);
  const zones  = buildZonesBar(w.zones);
  const dateLabel = showDate
    ? `<div class="fi-card-date">${new Date((w.date || w.startTime || "").slice(0,10) + "T00:00:00").toLocaleDateString("en-GB", { weekday:"short", day:"numeric", month:"short" })}</div>`
    : "";
  return `
    <div class="fi-card">
      <div class="fi-card-header">
        <span class="fi-card-icon">${w.icon || "🏋️"}</span>
        <div class="fi-card-info">
          <div class="fi-card-label">${escapeHtml(w.label || w.appleType || "Workout")}</div>
          ${dateLabel}
          <div class="fi-card-source">${w.source === "health-auto-export" ? "Apple Watch · Health Export" : w.source === "shortcuts" ? "Apple Watch · Shortcuts" : "Manual"}</div>
        </div>
        <button class="fi-card-del" data-action="delete-workout" data-wid="${escapeHtml(w.id)}" data-date="${escapeHtml(w.date)}">×</button>
      </div>
      <div class="fi-card-stats">
        <div class="fi-stat-chip"><div class="fi-sc-val">${w.duration}</div><div class="fi-sc-lbl">min</div></div>
        ${w.kcal     ? `<div class="fi-stat-chip"><div class="fi-sc-val">${w.kcal.toLocaleString()}</div><div class="fi-sc-lbl">kcal</div></div>` : ""}
        ${w.avgHR    ? `<div class="fi-stat-chip"><div class="fi-sc-val">${w.avgHR}</div><div class="fi-sc-lbl">avg bpm</div></div>` : ""}
        ${w.maxHR    ? `<div class="fi-stat-chip"><div class="fi-sc-val">${w.maxHR}</div><div class="fi-sc-lbl">max bpm</div></div>` : ""}
        ${w.distance ? `<div class="fi-stat-chip"><div class="fi-sc-val">${w.distance.toFixed(1)}</div><div class="fi-sc-lbl">km</div></div>` : ""}
      </div>
      ${spark ? `<div class="fi-sparkline-wrap">${spark}</div>` : ""}
      ${zones ? `<div class="fi-zones-wrap">${zones}</div>` : ""}
    </div>`;
}

/* ---------- Gemini Flash API ---------- */

async function analyzeFood(base64Data, mimeType) {
  const s = getSettings();
  const apiKey = (s.nutrition && s.nutrition.geminiKey) ? s.nutrition.geminiKey.trim() : "";
  if (!apiKey) throw new Error("Gemini API key not set. Add it in Settings → Nutrition.");

  const prompt = `You are a professional nutritionist. Analyse this meal photo carefully.\nReturn ONLY valid JSON (no markdown, no code fences) in this exact schema:\n{"items":[{"name":"string","qty":"string","kcal":number,"p":number,"c":number,"f":number}],"total":{"kcal":number,"p":number,"c":number,"f":number},"confidence":"high|medium|low","notes":"string"}\nRules: p=protein(g), c=carbohydrates(g), f=fat(g). Estimate portions from plate/bowl size and visual cues. Be realistic — do not underestimate. Return ONLY the JSON object.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [
          { text: prompt },
          { inline_data: { mime_type: mimeType, data: base64Data } }
        ]}],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  if (!res.ok) {
    let msg = `Gemini error ${res.status}`;
    try { const e = await res.json(); msg = e.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  // Strip markdown fences if Gemini wraps anyway
  const clean = raw.replace(/^```json?\n?/i, "").replace(/```$/m, "").trim();
  return JSON.parse(clean);
}

/* ---------- AI nutrition estimation (text-only, no image) ---------- */

async function estimateItemNutrition(autoItems) {
  const s = getSettings();
  const apiKey = (s.nutrition && s.nutrition.geminiKey) ? s.nutrition.geminiKey.trim() : "";
  if (!apiKey) throw new Error("Gemini API key not set. Add it in Settings → Nutrition.");

  const list = autoItems.map((it, i) => `${i + 1}. ${it.name}${it.qty ? " — " + it.qty : ""}`).join("\n");
  const prompt = `You are a professional nutritionist. Estimate nutritional values for each food item below.\nReturn ONLY valid JSON (no markdown, no code fences) as an array with exactly ${autoItems.length} object(s) in this schema:\n[{"name":"string","kcal":number,"p":number,"c":number,"f":number}]\nRules: p=protein(g), c=carbohydrates(g), f=fat(g). Use the quantity given. Be accurate and realistic.\nItems:\n${list}\nReturn ONLY the JSON array.`;

  // Text-only → gemini-3.1-flash-lite (500 RPD free, separate pool from photo model)
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1 }
      })
    }
  );

  if (!res.ok) {
    let msg = `Gemini error ${res.status}`;
    try { const e = await res.json(); msg = e.error?.message || msg; } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  const raw = (data.candidates?.[0]?.content?.parts?.[0]?.text || "").trim();
  const clean = raw.replace(/^```json?\n?/i, "").replace(/```$/m, "").trim();
  const result = JSON.parse(clean);
  // Track usage for the tier bar (resets when sessionStorage is cleared / new day)
  const prev = parseInt(sessionStorage.getItem("hyrox.text.estimates.today") || "0", 10);
  sessionStorage.setItem("hyrox.text.estimates.today", String(prev + autoItems.length));
  return result;
}

/* ---------- Readiness check ---------- */

function getTodayReadiness() {
  try {
    const all = JSON.parse(localStorage.getItem(READINESS_KEY) || "{}");
    return all[ymd(today())] || null;
  } catch { return null; }
}

function saveReadiness(data) {
  try {
    const all = JSON.parse(localStorage.getItem(READINESS_KEY) || "{}");
    all[ymd(today())] = { ...data, date: ymd(today()) };
    localStorage.setItem(READINESS_KEY, JSON.stringify(all));
  } catch {}
}

function showReadinessCheck(onDone) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  const makeRow = (id, label, emoji) => `
    <div class="readiness-row">
      <div class="readiness-label">${emoji} ${label}</div>
      <div class="readiness-pills" data-rid="${id}">
        ${[1,2,3,4,5].map((n) => `<button class="readiness-pill" data-val="${n}">${n}</button>`).join("")}
      </div>
    </div>`;
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">
        How are you feeling?
        <div class="action-sheet-title-sub">Quick check-in before training (1 = low · 5 = great)</div>
      </div>
      <div class="action-sheet-group" style="padding:16px">
        ${makeRow("sleep", "Sleep quality", "😴")}
        ${makeRow("soreness", "Muscle soreness", "💪")}
        ${makeRow("energy", "Energy level", "⚡")}
      </div>
      <div style="padding:0 10px 10px;display:flex;gap:10px">
        <button class="btn btn-secondary" data-cancel="1" style="flex:1">Skip</button>
        <button class="btn" id="save-readiness" style="flex:1">Let's go 🔥</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));

  const ratings = {};
  sheet.querySelectorAll(".readiness-pill").forEach((btn) => {
    btn.addEventListener("click", () => {
      const rid = btn.closest("[data-rid]")?.dataset.rid;
      if (!rid) return;
      ratings[rid] = Number(btn.dataset.val);
      btn.closest("[data-rid]").querySelectorAll(".readiness-pill").forEach((b) => b.classList.toggle("selected", b === btn));
    });
  });

  function close() { sheet.classList.remove("open"); setTimeout(() => sheet.remove(), 200); }
  sheet.querySelector("[data-cancel]").addEventListener("click", () => { close(); onDone && onDone(); });
  document.getElementById("save-readiness").addEventListener("click", () => {
    if (Object.keys(ratings).length > 0) saveReadiness(ratings);
    close(); onDone && onDone();
  });
}

/* ---------- Ref lookup ---------- */

function getRefValue(ref, settings) {
  // Search settings sections in order.
  const sections = ["lifts", "stations", "running", "ergs", "body"];
  for (const s of sections) {
    if (settings[s] && settings[s][ref] !== undefined) return settings[s][ref];
  }
  return null;
}

/* ---------- Formatting ---------- */

function formatSecToPace(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function formatKg(kg, rounding) {
  if (kg == null) return "—";
  const r = rounding || 2.5;
  const v = Math.round(kg / r) * r;
  return `${v % 1 === 0 ? v : v.toFixed(1)} kg`;
}

function formatTotalSecs(sec) {
  if (sec == null || isNaN(sec)) return "—";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.round(sec % 60);
  return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/* ---------- Race time projector ---------- */

function calcProjectedTime(settings) {
  const pace = settings.running?.raceHyroxTargetSecPerKm;
  if (!pace) return null;
  // 8 × 1km running legs
  const runSec = 8 * pace;
  // Station estimates based on Open Men format (seconds each)
  const stationSec = [
    190,  // SkiErg 1000m
    270,  // Sled Push 50m
    180,  // Sled Pull 25m
    210,  // Burpee broad jumps 80m
    330,  // Row 1000m
    210,  // Farmers 200m
    180,  // Sandbag lunges 100m
    300,  // Wall balls 100 reps
  ];
  return runSec + stationSec.reduce((a, b) => a + b, 0);
}

function renderRaceProjectorHtml(settings, compact = false) {
  const pace = settings.running?.raceHyroxTargetSecPerKm;
  if (!pace) return "";
  const proj = calcProjectedTime(settings);
  const projStr = formatTotalSecs(proj);
  const paceStr = formatSecToPace(pace);
  const pbStr = PLAN.metadata?.lastPB?.total || "—";

  if (compact) {
    return `<div class="projector-compact">
      <div class="projector-compact-inner">
        <div class="projector-compact-label">Projected</div>
        <div class="projector-compact-time">${projStr}</div>
      </div>
      <div class="projector-compact-inner">
        <div class="projector-compact-label">Run pace</div>
        <div class="projector-compact-time" style="color:var(--text)">${paceStr}/km</div>
      </div>
      <div class="projector-compact-inner">
        <div class="projector-compact-label">PB</div>
        <div class="projector-compact-time" style="color:var(--text-2);font-size:18px">${pbStr}</div>
      </div>
    </div>`;
  }

  return `<div class="projector-card">
    <div class="projector-header">Race time projector</div>
    <div class="projector-time">${projStr}</div>
    <div class="projector-detail">
      <div><span class="projector-detail-label">Run pace</span><span class="projector-detail-val">${paceStr}/km</span></div>
      <div><span class="projector-detail-label">PB</span><span class="projector-detail-val">${pbStr}</span></div>
    </div>
    <div class="projector-note">8 × 1 km @ target pace + station estimates</div>
  </div>`;
}

/* Render a load spec from plan.json into display text. */
function escapeHtml(str) {
  if (str == null) return "";
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ---------- Date / week helpers ---------- */

function parseDate(s) {
  // YYYY-MM-DD local time
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function today() {
  const t = new Date();
  return new Date(t.getFullYear(), t.getMonth(), t.getDate());
}

function ymd(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function daysBetween(a, b) {
  return Math.round((b - a) / (1000 * 60 * 60 * 24));
}

function getWeekIndex(settings) {
  const start = parseDate(settings.startDate);
  const startMonday = startOfWeek(start);
  const todayMonday = startOfWeek(today());
  const weeks = Math.floor(daysBetween(startMonday, todayMonday) / 7);
  return Math.max(1, weeks + 1); // clamp so pre-start dates still show Week 1
}

function startOfWeek(d) {
  const day = d.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day);
  const r = new Date(d);
  r.setDate(d.getDate() + diff);
  r.setHours(0, 0, 0, 0);
  return r;
}

function getCurrentWeek(plan, settings) {
  const idx = Math.max(1, getWeekIndex(settings));
  return plan.weeks.find((w) => w.number === idx) || plan.weeks[plan.weeks.length - 1];
}

function getCurrentPhase(plan, weekNum) {
  return plan.phases.find((p) => p.weeks.includes(weekNum));
}

/* ---------- Date helpers ---------- */

function getDateForDayInWeek(weekNum, dayName, settings) {
  const planMonday = startOfWeek(parseDate(settings.startDate));
  const weekMonday = new Date(planMonday.getTime() + (weekNum - 1) * 7 * 86400000);
  const DAY_ORDER  = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const idx = Math.max(0, DAY_ORDER.indexOf(dayName));
  return new Date(weekMonday.getTime() + idx * 86400000);
}

function getNutritionWeekSummary(weeksAgo) {
  const mon = startOfWeek(today());
  const targetMon = new Date(mon.getTime() - weeksAgo * 7 * 86400000);
  let loggedDays = 0, kcal = 0, p = 0, c = 0, f = 0;
  const daily = [];
  const DAY_ABBR = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
  for (let i = 0; i < 7; i++) {
    const d   = new Date(targetMon.getTime() + i * 86400000);
    const ds  = ymd(d);
    const meals = getDayMeals(ds);
    const t   = getDayTotals(meals);
    const hasData = meals.length > 0;
    daily.push({ d, ds, label: DAY_ABBR[i], hasData, ...t });
    if (hasData) { loggedDays++; kcal += t.kcal; p += t.p; c += t.c; f += t.f; }
  }
  const avg = (n) => loggedDays > 0 ? Math.round(n / loggedDays) : 0;
  return {
    startDate: targetMon,
    loggedDays,
    totalKcal: Math.round(kcal), avgKcal: avg(kcal),
    totalP:    Math.round(p),    avgP:    avg(p),
    totalC:    Math.round(c),    avgC:    avg(c),
    totalF:    Math.round(f),    avgF:    avg(f),
    daily
  };
}

/* ---------- Session day mapping ---------- */

function getSessionDay(weekNum, sessionId, defaultDay) {
  const overrides = getDayOverrides();
  const key = `W${weekNum}.${sessionId}`;
  return overrides.overrides[key] || defaultDay;
}

function setSessionDay(weekNum, sessionId, day) {
  const o = getDayOverrides();
  o.overrides[`W${weekNum}.${sessionId}`] = day;
  saveJSON(DAY_OVERRIDES_KEY, o);
}

/* ---------- Progress ---------- */

function isSessionDone(weekNum, sessionId) {
  const p = getProgress();
  return Boolean(p.sessions[`W${weekNum}.${sessionId}`]);
}

function toggleSessionDone(weekNum, sessionId) {
  const p = getProgress();
  const key = `W${weekNum}.${sessionId}`;
  if (p.sessions[key]) {
    delete p.sessions[key];
  } else {
    p.sessions[key] = { completedAt: new Date().toISOString() };
  }
  saveJSON(PROGRESS_KEY, p);
}

function isBlockDone(weekNum, sessionId, blockIdx) {
  const p = getProgress();
  const key = `W${weekNum}.${sessionId}.b${blockIdx}`;
  return Boolean(p.sessions[key]);
}

function toggleBlockDone(weekNum, sessionId, blockIdx) {
  const p = getProgress();
  const key = `W${weekNum}.${sessionId}.b${blockIdx}`;
  if (p.sessions[key]) delete p.sessions[key];
  else p.sessions[key] = { completedAt: new Date().toISOString() };
  saveJSON(PROGRESS_KEY, p);
}

/* ---------- Plan loading ---------- */

let PLAN = null;
let _pendingPhoto    = null; // { b64, mime, targetDateStr, thumb } — kept while retry is possible
let viewingWeekNum   = null; // week shown in train nav
let selectedDayOverride = null; // day pill selection (null = smart default)
let dayTab = "overview"; // "overview" | "training" | "nutrition" | "fitness"

async function loadPlan() {
  const res = await fetch(PLAN_URL, { cache: "no-cache" });
  if (!res.ok) throw new Error("Failed to load plan.json");
  PLAN = await res.json();

  // Detect new version. Ignore any sentinel values from old buggy dismiss handlers.
  const seenVersionRaw = localStorage.getItem(APP_VERSION_KEY);
  const isSentinel = seenVersionRaw && /^(dismissed-|reset-)/.test(seenVersionRaw);
  const seenVersion = isSentinel ? null : seenVersionRaw;

  if (seenVersion && seenVersion !== PLAN.version) {
    showUpdateBanner();
  }
  // Always heal localStorage to the real version so dismiss/reload "sticks".
  localStorage.setItem(APP_VERSION_KEY, PLAN.version);
  return PLAN;
}

function showUpdateBanner() {
  const b = document.getElementById("update-banner");
  if (!b) return;
  // Stamp the current version on the element so inline onclicks can use it.
  if (PLAN && PLAN.version) b.dataset.version = PLAN.version;
  b.hidden = false;
}

/* ---------- Router ---------- */

const ROUTES = {
  today: renderMain,
  week: renderWeek,
  plan: renderPlan,
  tests: renderTests,
  settings: renderSettings
};

function getRoute() {
  const hash = location.hash.replace(/^#\//, "").split("/");
  return { name: hash[0] || "today", params: hash.slice(1) };
}

function navigate(path) {
  location.hash = "#/" + path;
}

window.addEventListener("hashchange", route);

// Guard: only one route() execution at a time. If a hashchange fires while a
// previous route() is still awaiting (e.g. fetching plan.json), the new call
// is deferred until the current one finishes rather than racing it.
let _routeRunning = false;
let _routePending = false;

async function route() {
  if (_routeRunning) { _routePending = true; return; }
  _routeRunning = true;
  try {
    await _doRoute();
  } finally {
    _routeRunning = false;
    if (_routePending) { _routePending = false; route(); }
  }
}

async function _doRoute() {
  const r = getRoute();
  const fn = ROUTES[r.name] || renderMain;
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === r.name);
  });

  // When navigating away from Train and back, reset day selection
  if (r.name === "today") {
    viewingWeekNum      = null;
    selectedDayOverride = null;
    // keep dayTab so user stays on whichever tab they last picked
  }
  if (r.name === "session" && r.params[0]) viewingWeekNum = Number(r.params[0]);
  if (r.name === "week"    && r.params[0]) viewingWeekNum = Number(r.params[0]);

  // Apple Watch import via Shortcut URL: #/fitness-import/date/type/dur/kcal/hr/hrmax/dist
  if (r.name === "fitness-import") {
    const [date, rawType, durStr, kcalStr, hrStr, hrmaxStr, distStr] = r.params;
    // Clean the URL immediately so back-nav works
    history.replaceState(null, "", location.pathname + "#/today");
    document.querySelectorAll(".tab").forEach((el) => {
      el.classList.toggle("active", el.dataset.tab === "today");
    });
    const app2 = document.getElementById("app");
    try {
      if (!PLAN) await loadPlan();
      renderTopBar();
      app2.innerHTML = "";
      await renderMain(app2);
    } catch (e) { /* best-effort background render */ }
    showFitnessImportSheet({
      date:     date || ymd(today()),
      type:     decodeURIComponent(rawType || "Other"),
      duration: Math.round(parseFloat(durStr || "0")),
      kcal:     Math.round(parseFloat(kcalStr || "0")),
      hr:       Math.round(parseFloat(hrStr || "0")),
      hrMax:    Math.round(parseFloat(hrmaxStr || "0")),
      distance: Math.round(parseFloat(distStr || "0") * 10) / 10
    });
    return;
  }

  const app = document.getElementById("app");
  try {
    if (!PLAN) await loadPlan();
    renderTopBar();
    app.innerHTML = "";
    await fn(app, r.params);
  } catch (e) {
    console.error(e);
    app.innerHTML = `<div class="alert alert-warn">Error: ${escapeHtml(e.message)}</div>`;
  }
}

/* ---------- Week strip ---------- */

function getViewingWeekNum() {
  if (!PLAN) return 1;
  if (viewingWeekNum === null) {
    const settings = getSettings();
    viewingWeekNum = getWeekIndex(settings);
  }
  return Math.max(1, Math.min(PLAN.weeks.length, viewingWeekNum));
}

function renderWeekStrip() {
  const strip = document.getElementById("weekstrip");
  if (!strip || !PLAN) return;

  const settings = getSettings();
  const wn = getViewingWeekNum();
  const week = PLAN.weeks.find((w) => w.number === wn);
  const phase = getCurrentPhase(PLAN, wn);
  const todayName = DAY_NAMES[new Date().getDay()];
  const curWeekNum = getWeekIndex(settings);
  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  // Determine which day is currently active (from route)
  const r = getRoute();
  let activeDayName = null;
  if ((r.name === "session" || r.name === "today") && week) {
    const sid = r.name === "session" ? r.params[1] : null;
    if (sid) {
      const s = week.sessions.find((s) => s.id === sid);
      if (s) activeDayName = getSessionDay(wn, s.id, s.defaultDay);
    } else if (r.name === "today") {
      // Highlight today's day
      activeDayName = todayName;
    }
  }

  const dayMap = {};
  if (week) {
    for (const s of week.sessions) {
      const d = getSessionDay(wn, s.id, s.defaultDay);
      if (!dayMap[d]) dayMap[d] = s;
    }
  }

  const daysHtml = dayOrder.map((d) => {
    const s = dayMap[d];
    const isToday = d === todayName && wn === curWeekNum;
    const isActive = d === activeDayName;
    const isDone = s && isSessionDone(wn, s.id);

    let cls = "ws-day";
    if (isActive && s) cls += " ws-active";
    else if (isToday && s) cls += " ws-today";
    else if (isToday && !s) cls += " ws-today-rest";
    if (!s) cls += " ws-rest";
    if (isDone && !isActive) cls += " ws-done";

    const focusDot = s ? `<span class="ws-dot ws-dot-${s.focus}"></span>` : `<span class="ws-dot ws-dot-empty"></span>`;
    const checkMark = isDone ? `<span class="ws-check">✓</span>` : "";
    const inner = `<span class="ws-day-label">${d.slice(0, 2)}</span>${focusDot}${checkMark}`;

    if (s) {
      return `<a href="#/session/${wn}/${escapeHtml(s.id)}" class="${cls}" title="${escapeHtml(s.title)}">${inner}</a>`;
    }
    return `<div class="${cls}">${inner}</div>`;
  }).join("");

  const isTestWeek = week && week.test;
  const phaseLabel = phase ? phase.name : "";

  strip.innerHTML = `
    <div class="ws-inner">
      <button class="ws-arrow" id="ws-prev" ${wn <= 1 ? "disabled" : ""} aria-label="Previous week">‹</button>
      <div class="ws-days">${daysHtml}</div>
      <button class="ws-arrow" id="ws-next" ${wn >= PLAN.weeks.length ? "disabled" : ""} aria-label="Next week">›</button>
    </div>
    <div class="ws-label">
      <span class="ws-wk">Wk ${wn}/${PLAN.weeks.length}${isTestWeek ? " · TEST" : ""}</span>
      ${phaseLabel ? `<span class="ws-phase"> · ${escapeHtml(phaseLabel)}</span>` : ""}
    </div>
  `;

  document.getElementById("ws-prev")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (wn > 1) { viewingWeekNum = wn - 1; renderWeekStrip(); }
  });
  document.getElementById("ws-next")?.addEventListener("click", (e) => {
    e.preventDefault();
    if (wn < PLAN.weeks.length) { viewingWeekNum = wn + 1; renderWeekStrip(); }
  });
}

/* ---------- Top bar ---------- */

function renderTopBar() {
  const settings = getSettings();
  const weekNum = getWeekIndex(settings);
  const week = PLAN.weeks.find((w) => w.number === weekNum);
  const phase = getCurrentPhase(PLAN, weekNum);
  document.getElementById("phase-chip").textContent = phase ? phase.name : "—";
  document.getElementById("week-chip").textContent = `Wk ${weekNum}/${PLAN.weeks.length}${week && week.test ? " · TEST" : ""}`;

  const race = parseDate(settings.raceDate);
  const days = daysBetween(today(), race);
  document.getElementById("countdown").textContent = days >= 0 ? `${days}d to race` : "Race day passed";
}

/* ---------- Views ---------- */

async function renderMain(app) {
  const settings  = getSettings();
  const curWeekNum = getWeekIndex(settings);
  if (viewingWeekNum === null) viewingWeekNum = curWeekNum;
  const wn    = viewingWeekNum;
  const week  = PLAN.weeks.find((w) => w.number === wn);
  const phase = getCurrentPhase(PLAN, wn);

  if (!week) {
    app.innerHTML = `<div class="empty-state"><h3>No plan loaded</h3><p>Race day may have passed or start date is in the future.</p></div>`;
    return;
  }

  const todayName = DAY_NAMES[new Date().getDay()];
  const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const sessionByDay = {};
  for (const s of week.sessions) {
    const d = getSessionDay(wn, s.id, s.defaultDay);
    if (!sessionByDay[d]) sessionByDay[d] = s;
  }

  let selDay = selectedDayOverride;
  if (!selDay) {
    selDay = (wn === curWeekNum) ? todayName : (DAY_ORDER.find((d) => sessionByDay[d]) || DAY_ORDER[0]);
  }

  const selSession  = sessionByDay[selDay] || null;
  const selDate     = getDateForDayInWeek(wn, selDay, settings);
  const selDateStr  = ymd(selDate);
  const isSelToday  = selDateStr === ymd(today());

  /* ---- Week navigation (always visible) ---- */
  const weekNavHtml = `
    <div class="train-week-nav">
      <div class="train-week-header">
        <button class="train-week-arrow" id="tn-prev" ${wn <= 1 ? "disabled" : ""} aria-label="Previous week">‹</button>
        <div class="train-week-info">
          <span class="train-week-num">Week ${wn}</span>
          ${phase ? `<span class="train-week-phase"> · ${escapeHtml(phase.name)}</span>` : ""}
        </div>
        <button class="train-week-arrow" id="tn-next" ${wn >= PLAN.weeks.length ? "disabled" : ""} aria-label="Next week">›</button>
      </div>
      <div class="train-day-pills">
        ${DAY_ORDER.map((d) => {
          const s = sessionByDay[d];
          const isToday = d === todayName && wn === curWeekNum;
          const isDone  = s && isSessionDone(wn, s.id);
          const isSel   = d === selDay;
          let cls = "tdp";
          if (isSel)        cls += " tdp-sel";
          else if (isToday) cls += " tdp-today";
          if (isDone)       cls += " tdp-done";
          if (!s)           cls += " tdp-rest";
          return `<button class="${cls}" data-day="${d}" aria-label="${d}">
            <span class="tdp-label">${d.slice(0, 2)}</span>
            ${s ? `<span class="tdp-dot dot dot-${s.focus}"></span>` : `<span class="tdp-dot"></span>`}
            ${isDone && !isSel ? `<span class="tdp-check">✓</span>` : ""}
          </button>`;
        }).join("")}
      </div>
    </div>`;

  /* ---- 4-tab strip ---- */
  const TABS = [
    { id: "overview",  label: "Overview" },
    { id: "training",  label: "Training" },
    { id: "nutrition", label: "Nutrition" },
    { id: "fitness",   label: "Fitness" },
  ];
  const tabStripHtml = `
    <div class="day-tab-strip">
      ${TABS.map((t) => `<button class="dts${dayTab === t.id ? " dts-a" : ""}" data-tab="${t.id}">${t.label}</button>`).join("")}
    </div>`;

  /* ---- Shared data for all tabs ---- */
  const dayMeals    = getDayMeals(selDateStr);
  const dayTotals   = getDayTotals(dayMeals);
  const dayWorkouts = getDayWorkouts(selDateStr);
  const tgt         = settings.nutrition;
  const selDayLabel = isSelToday
    ? "Today"
    : `${selDay}, ${selDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}`;

  /* ---- Tab content ---- */
  let tabContent = "";

  if (dayTab === "overview") {
    const kcal     = Math.round(dayTotals.kcal);
    const kcalPct  = tgt.kcalTarget > 0 ? Math.min(100, Math.round(kcal / tgt.kcalTarget * 100)) : 0;
    const pPct     = tgt.proteinTarget > 0 ? Math.min(100, Math.round(dayTotals.p / tgt.proteinTarget * 100)) : 0;
    const cPct     = tgt.carbTarget    > 0 ? Math.min(100, Math.round(dayTotals.c / tgt.carbTarget    * 100)) : 0;
    const fPct     = tgt.fatTarget     > 0 ? Math.min(100, Math.round(dayTotals.f / tgt.fatTarget     * 100)) : 0;
    const trainIcon = selSession
      ? ({strength:"💪",run:"🏃",hybrid:"⚡",sim:"🎯",test:"📊"})[selSession.focus] || "🏋️"
      : "🛋️";
    const trainDone = selSession && isSessionDone(wn, selSession.id);
    const fitMin    = dayWorkouts.reduce((s, w) => s + (w.duration || 0), 0);
    const fitKcal   = dayWorkouts.reduce((s, w) => s + (w.kcal || 0), 0);
    const moveKcal  = getDailyBurn(selDateStr);

    // Energy balance: eaten minus total Move ring calories
    const netKcal   = kcal - moveKcal;
    const hasBurn   = moveKcal > 0;
    const netLabel  = netKcal < 0 ? "surplus" : "net eaten";

    tabContent = `
      <div class="overview-date-label">${escapeHtml(selDayLabel)}</div>
      <div class="overview-cards">
        <button class="osc${trainDone ? " osc-done" : ""}" data-jump="training">
          <div class="osc-icon">${trainIcon}</div>
          <div class="osc-label">Training</div>
          <div class="osc-value">${escapeHtml(selSession ? selSession.title : "Rest")}</div>
          <div class="osc-meta">${escapeHtml(selSession ? `${selSession.duration}m · ${selSession.focus}` : "Recovery day")}</div>
          ${trainDone ? `<div class="osc-badge">✓</div>` : ""}
        </button>
        <button class="osc" data-jump="nutrition">
          <div class="osc-icon">🍎</div>
          <div class="osc-label">Nutrition</div>
          <div class="osc-value">${kcal > 0 ? kcal.toLocaleString() + " kcal" : "–"}</div>
          <div class="osc-meta">${kcal > 0 ? kcalPct + "% of target" : "Nothing logged"}</div>
        </button>
        <button class="osc${dayWorkouts.length === 0 && !hasBurn ? " osc-dim" : ""}" data-jump="fitness">
          <div class="osc-icon">⌚</div>
          <div class="osc-label">Fitness</div>
          <div class="osc-value">${fitMin > 0 ? fitMin + " min" : moveKcal > 0 ? moveKcal.toLocaleString() + " kcal" : "–"}</div>
          <div class="osc-meta">${moveKcal > 0 ? "🔥 " + moveKcal.toLocaleString() + " move kcal" : fitKcal > 0 ? fitKcal + " kcal" : dayWorkouts.length > 0 ? dayWorkouts[0].label : "No workout"}</div>
        </button>
      </div>
      ${hasBurn && kcal > 0 ? `
      <div class="energy-balance-row">
        <div class="eb-item">
          <div class="eb-val">${kcal.toLocaleString()}</div>
          <div class="eb-lbl">eaten</div>
        </div>
        <div class="eb-sep">−</div>
        <div class="eb-item">
          <div class="eb-val">${moveKcal.toLocaleString()}</div>
          <div class="eb-lbl">move</div>
        </div>
        <div class="eb-sep">=</div>
        <div class="eb-item${netKcal < 0 ? " eb-surplus" : ""}">
          <div class="eb-val">${Math.abs(netKcal).toLocaleString()}</div>
          <div class="eb-lbl">${netLabel}</div>
        </div>
      </div>` : ""}
      ${kcal > 0 || dayTotals.p > 0 ? `
      <div class="section-header">Macros</div>
      <div class="overview-macro-grid">
        <div class="omg-item">
          <div class="omg-val">${Math.round(dayTotals.p)}g</div>
          <div class="omg-bar"><div class="omg-fill omg-p" style="width:${pPct}%"></div></div>
          <div class="omg-lbl">Protein</div>
        </div>
        <div class="omg-item">
          <div class="omg-val">${Math.round(dayTotals.c)}g</div>
          <div class="omg-bar"><div class="omg-fill omg-c" style="width:${cPct}%"></div></div>
          <div class="omg-lbl">Carbs</div>
        </div>
        <div class="omg-item">
          <div class="omg-val">${Math.round(dayTotals.f)}g</div>
          <div class="omg-bar"><div class="omg-fill omg-f" style="width:${fPct}%"></div></div>
          <div class="omg-lbl">Fat</div>
        </div>
      </div>` : ""}
      ${dayWorkouts.length > 0 ? `
      <div class="section-header">Fitness</div>
      ${dayWorkouts.map((w) => `
        <div class="overview-fi-chip">
          <span class="ofc-icon">${w.icon || "🏋️"}</span>
          <span class="ofc-label">${escapeHtml(w.label || w.appleType || "Workout")}</span>
          <span class="ofc-stat">${w.duration}m</span>
          ${w.avgHR ? `<span class="ofc-stat">${w.avgHR} bpm</span>` : ""}
          ${w.kcal  ? `<span class="ofc-stat">${w.kcal} kcal</span>` : ""}
        </div>`).join("")}` : ""}`;

  } else if (dayTab === "training") {
    if (isSelToday) {
      const yName = DAY_NAMES[((new Date().getDay() - 1 + 7) % 7)];
      const missed = week.sessions.find((s) => {
        const d = getSessionDay(wn, s.id, s.defaultDay);
        return d === yName && !isSessionDone(wn, s.id) && (!selSession || s.id !== selSession.id);
      });
      if (missed) {
        tabContent += `<div class="catchup-banner">
          <div class="catchup-info">
            <div class="catchup-title">Missed yesterday</div>
            <div class="catchup-name">${escapeHtml(missed.title)}</div>
          </div>
          <div class="catchup-actions">
            <button class="catchup-btn" data-catchup-move="${escapeHtml(missed.id)}">Move here</button>
            <button class="catchup-btn catchup-skip" data-catchup-skip="${escapeHtml(missed.id)}">Skip</button>
          </div>
        </div>`;
      }
    }
    if (selSession) {
      tabContent += renderSessionCard(selSession, wn, true);
    } else {
      tabContent += `<div class="hero">
        <div class="hero-eyebrow"><span class="dot dot-test"></span><span>Rest day</span></div>
        <div class="hero-title">Recovery 🛋️</div>
        <div class="hero-intent">No session on ${escapeHtml(selDay)}. Rest is where adaptation happens.</div>
      </div>`;
    }
    const doneCount     = week.sessions.filter((s) => isSessionDone(wn, s.id)).length;
    const totalSessions = week.sessions.length;
    tabContent += `
      <div class="section-footer" style="text-align:center;margin-top:12px">
        Week ${wn} of ${PLAN.weeks.length}${phase ? " · " + escapeHtml(phase.name) : ""} · ${doneCount}/${totalSessions} done
      </div>
      <div class="section-header" style="margin-top:16px">Plan &amp; Records</div>
      <div class="list">
        <a href="#/plan" class="list-row">
          <div class="list-row-main"><div class="list-row-title">Training Plan</div><div class="list-row-sub">All phases and weeks</div></div>
          <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </a>
        <a href="#/tests" class="list-row">
          <div class="list-row-main"><div class="list-row-title">Test Results</div><div class="list-row-sub">Log and review test sessions</div></div>
          <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </a>
        <a href="#/progress" class="list-row">
          <div class="list-row-main"><div class="list-row-title">Progress &amp; Stats</div><div class="list-row-sub">RPE trends, benchmarks, history</div></div>
          <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </a>
        <a href="#/racesim" class="list-row">
          <div class="list-row-main"><div class="list-row-title">Race Simulator</div><div class="list-row-sub">Full Hyrox race with live splits</div></div>
          <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </a>
      </div>`;

  } else if (dayTab === "nutrition") {
    const meals  = dayMeals;
    const totals = dayTotals;
    const kcalLeft = tgt.kcalTarget - Math.round(totals.kcal);
    const isOver   = kcalLeft < 0;
    const pPct = tgt.proteinTarget > 0 ? Math.min(100, Math.round(totals.p / tgt.proteinTarget * 100)) : 0;
    const cPct = tgt.carbTarget    > 0 ? Math.min(100, Math.round(totals.c / tgt.carbTarget    * 100)) : 0;
    const fPct = tgt.fatTarget     > 0 ? Math.min(100, Math.round(totals.f / tgt.fatTarget     * 100)) : 0;

    // 7-day rolling average (7 days before selDate)
    let avgKcal = 0, avgP = 0, avgC = 0, avgF = 0, avgDays = 0;
    for (let i = 1; i <= 7; i++) {
      const d  = new Date(selDate.getTime() - i * 86400000);
      const ds = ymd(d);
      const dm = getDayMeals(ds);
      if (dm.length > 0) {
        const t = getDayTotals(dm);
        avgKcal += t.kcal; avgP += t.p; avgC += t.c; avgF += t.f;
        avgDays++;
      }
    }
    const has7dAvg = avgDays > 0;
    let kcalDelta = 0, pDelta = 0, cDelta = 0, fDelta = 0;
    if (has7dAvg) {
      avgKcal = Math.round(avgKcal / avgDays);
      avgP    = Math.round(avgP / avgDays * 10) / 10;
      avgC    = Math.round(avgC / avgDays * 10) / 10;
      avgF    = Math.round(avgF / avgDays * 10) / 10;
      kcalDelta = Math.round(totals.kcal - avgKcal);
      pDelta    = Math.round(totals.p    - avgP);
      cDelta    = Math.round(totals.c    - avgC);
      fDelta    = Math.round(totals.f    - avgF);
    }

    const MEAL_LABELS = { breakfast: "Breakfast 🌅", lunch: "Lunch ☀️", dinner: "Dinner 🌙", snack: "Snack 🍎" };
    const MEAL_TARGET_KEYS = { breakfast: "mealTargetBreakfast", lunch: "mealTargetLunch", dinner: "mealTargetDinner", snack: "mealTargetSnack" };
    const mealsHtml = meals.length === 0
      ? `<div class="empty-state"><h3>Nothing logged</h3><p>Tap + Log meal to add a meal${isSelToday ? " today" : " for this day"}.</p></div>`
      : meals.map((meal) => {
          const mealTargetPct = tgt[MEAL_TARGET_KEYS[meal.label]] || 0;
          const mealTargetKcal = mealTargetPct > 0 ? Math.round(tgt.kcalTarget * mealTargetPct / 100) : 0;
          const mealKcalPct = mealTargetKcal > 0 ? Math.min(120, Math.round(meal.total.kcal / mealTargetKcal * 100)) : 0;
          const mealIsOver = mealTargetKcal > 0 && meal.total.kcal > mealTargetKcal;
          return `
          <div class="meal-card">
            ${meal.photo ? `<img class="meal-card-thumb" src="${meal.photo}" alt="meal photo" loading="lazy">` : ""}
            <div class="meal-card-header">
              <div>
                <div class="meal-card-label">${escapeHtml(MEAL_LABELS[meal.label] || meal.label)}</div>
                <div class="meal-card-time">${escapeHtml(meal.time)}</div>
              </div>
              <div style="text-align:right;flex:1;min-width:0">
                <div class="meal-card-kcal">${meal.total.kcal} kcal</div>
                <div class="meal-card-macros">${meal.total.p}g P · ${meal.total.c}g C · ${meal.total.f}g F</div>
              </div>
              <button class="meal-card-edit" data-action="edit-meal" data-mid="${escapeHtml(meal.id)}" data-date="${escapeHtml(selDateStr)}" aria-label="Edit">✏️</button>
              <button class="meal-card-del" data-action="delete-meal" data-mid="${escapeHtml(meal.id)}" data-date="${escapeHtml(selDateStr)}">×</button>
            </div>
            ${mealTargetKcal > 0 ? `<div class="meal-target-row">
              <div class="meal-target-bar-bg"><div class="meal-target-bar-fill${mealIsOver ? " meal-target-over" : ""}" style="width:${mealKcalPct}%"></div></div>
              <span class="meal-target-label">${mealTargetKcal} kcal target</span>
            </div>` : ""}
            <div class="meal-items-list">
              ${meal.items.map((it) => {
                const qtyDisplay = it.qtyNum != null ? `${it.qtyNum} ${it.unit || ""}`.trim() : (it.qty || "");
                return `<div class="meal-item">
                  <span class="meal-item-name">${escapeHtml(it.name)}</span>
                  <span class="meal-item-qty dim">${escapeHtml(qtyDisplay)}</span>
                  <span class="meal-item-kcal">${it.kcal}</span>
                </div>`;
              }).join("")}
            </div>
          </div>`;
        }).join("");

    // Weekly summary
    const wSumm   = getNutritionWeekSummary(fuelSummaryPeriod);
    const wkTitle = fuelSummaryPeriod === 0 ? "This Week" : "Last Week";
    const todayDs  = ymd(today());
    const wkStart  = wSumm.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const weekStatHtml = wSumm.loggedDays === 0
      ? `<div class="empty-state" style="margin:0;padding:12px 0 4px"><p style="font-size:14px">No data logged for ${wkTitle.toLowerCase()}.</p></div>`
      : `<div class="fuel-week-stat-grid">
          <div class="fuel-week-stat"><div class="fuel-week-stat-num fuel-stat-kcal">${wSumm.avgKcal.toLocaleString()}</div><div class="fuel-week-stat-label">Avg kcal</div><div class="fuel-week-stat-sub">Total ${wSumm.totalKcal.toLocaleString()}</div></div>
          <div class="fuel-week-stat"><div class="fuel-week-stat-num fuel-stat-p">${wSumm.avgP}g</div><div class="fuel-week-stat-label">Avg P</div><div class="fuel-week-stat-sub">Total ${wSumm.totalP}g</div></div>
          <div class="fuel-week-stat"><div class="fuel-week-stat-num fuel-stat-c">${wSumm.avgC}g</div><div class="fuel-week-stat-label">Avg C</div><div class="fuel-week-stat-sub">Total ${wSumm.totalC}g</div></div>
          <div class="fuel-week-stat"><div class="fuel-week-stat-num fuel-stat-f">${wSumm.avgF}g</div><div class="fuel-week-stat-label">Avg F</div><div class="fuel-week-stat-sub">Total ${wSumm.totalF}g</div></div>
        </div>
        <div class="fuel-week-daily-row">
          ${wSumm.daily.map((day) => `<div class="fuel-week-day-col${day.ds === todayDs ? " is-today" : ""}">
            <div class="fuel-week-day-label">${day.label}</div>
            <div class="fuel-week-day-dot${day.hasData ? " has-data" : ""}"></div>
            <div class="fuel-week-day-kcal">${day.hasData ? Math.round(day.kcal).toLocaleString() : ""}</div>
          </div>`).join("")}
        </div>`;

    tabContent = `
      <div class="fuel-hero">
        <div class="fuel-kcal-block">
          <div class="fuel-kcal-num${isOver ? " fuel-over" : ""}">${Math.abs(kcalLeft)}</div>
          <div class="fuel-kcal-label">${isOver ? "kcal over target" : "kcal remaining"}</div>
          <div class="fuel-kcal-sub">${Math.round(totals.kcal)} eaten · ${tgt.kcalTarget} target</div>
        </div>
        <div class="fuel-macro-stack">
          <div class="fuel-macro-row">
            <span class="fuel-macro-name">Protein</span>
            <div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-protein" style="width:${pPct}%"></div></div>
            <span class="fuel-macro-gram">${Math.round(totals.p)}<span class="fuel-macro-tgt">/${tgt.proteinTarget}g</span></span>
          </div>
          <div class="fuel-macro-row">
            <span class="fuel-macro-name">Carbs</span>
            <div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-carb" style="width:${cPct}%"></div></div>
            <span class="fuel-macro-gram">${Math.round(totals.c)}<span class="fuel-macro-tgt">/${tgt.carbTarget}g</span></span>
          </div>
          <div class="fuel-macro-row">
            <span class="fuel-macro-name">Fat</span>
            <div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-fat" style="width:${fPct}%"></div></div>
            <span class="fuel-macro-gram">${Math.round(totals.f)}<span class="fuel-macro-tgt">/${tgt.fatTarget}g</span></span>
          </div>
        </div>
      </div>
      ${has7dAvg ? `<div class="fuel-avg-compare">
        <span class="fuel-avg-label">vs 7d avg</span>
        <span class="fuel-avg-item${kcalDelta > 0 ? " avg-pos" : kcalDelta < 0 ? " avg-neg" : ""}">${kcalDelta > 0 ? "+" : ""}${kcalDelta} kcal</span>
        <span class="fuel-avg-sep">·</span>
        <span class="fuel-avg-item${pDelta > 0 ? " avg-pos" : pDelta < 0 ? " avg-neg" : ""}">${pDelta > 0 ? "+" : ""}${pDelta}g P</span>
        <span class="fuel-avg-sep">·</span>
        <span class="fuel-avg-item${cDelta > 0 ? " avg-pos" : cDelta < 0 ? " avg-neg" : ""}">${cDelta > 0 ? "+" : ""}${cDelta}g C</span>
        <span class="fuel-avg-sep">·</span>
        <span class="fuel-avg-item${fDelta > 0 ? " avg-pos" : fDelta < 0 ? " avg-neg" : ""}">${fDelta > 0 ? "+" : ""}${fDelta}g F</span>
      </div>` : ""}
      <button class="btn" id="log-meal-btn">+ Log meal</button>
      <div class="section-header">Meals</div>
      ${mealsHtml}
      <div class="section-header" style="margin-top:24px">Weekly Summary</div>
      <div class="fuel-period-picker">
        <button class="fuel-period-btn${fuelSummaryPeriod === 0 ? " fuel-period-btn-active" : ""}" data-period="0">This Week</button>
        <button class="fuel-period-btn${fuelSummaryPeriod === 1 ? " fuel-period-btn-active" : ""}" data-period="1">Last Week</button>
      </div>
      <div class="fuel-week-summary">
        <div class="fuel-week-summary-title">${wkTitle} · w/c ${wkStart} · ${wSumm.loggedDays}/7 days logged</div>
        ${weekStatHtml}
      </div>`;

  } else if (dayTab === "fitness") {
    const allWorkouts = getDayWorkouts(selDateStr);
    const dayBurnKcal = getDailyBurn(selDateStr);
    const importBarHtml = `
      <div class="fi-import-bar">
        <span class="fi-import-bar-title">Workouts</span>
        <label class="fi-import-zip-btn" for="fi-zip-input" role="button" tabindex="0">
          <svg viewBox="0 0 20 20" fill="none" width="13" height="13" aria-hidden="true">
            <path d="M10 3v10M6 9l4 4 4-4" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M3 15h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
          Import ZIP
        </label>
        <input type="file" id="fi-zip-input" accept=".zip" style="display:none" aria-label="Import Health Auto Export ZIP">
      </div>
      <div id="fi-import-status" class="fi-import-status" style="display:none"></div>`;

    const burnChipHtml = dayBurnKcal > 0 ? `
      <div class="fi-daily-burn">
        <span class="fi-db-icon">🔥</span>
        <div class="fi-db-info">
          <div class="fi-db-val">${dayBurnKcal.toLocaleString()} kcal</div>
          <div class="fi-db-lbl">Total Move ring · ${selDayLabel}</div>
        </div>
      </div>` : "";

    if (allWorkouts.length > 0) {
      tabContent = importBarHtml + burnChipHtml + allWorkouts.map((w) => renderWorkoutCard(w, false)).join("");
    } else {
      tabContent = importBarHtml + `
        <div class="hero">
          <div class="hero-eyebrow"><span>⌚</span><span>Apple Watch</span></div>
          <div class="hero-title">No workouts yet</div>
          <div class="hero-intent">Export from the <strong>Health Auto Export</strong> app, then tap <strong>Import ZIP</strong> above.</div>
        </div>
        <div class="section-header">How to import</div>
        <div class="list">
          <div class="list-row"><div class="list-row-main"><div class="list-row-title">1. Install Health Auto Export</div><div class="list-row-sub">Free app on the App Store</div></div></div>
          <div class="list-row"><div class="list-row-main"><div class="list-row-title">2. Export as ZIP (CSV format)</div><div class="list-row-sub">Tap Export → CSV → Share ZIP to Files</div></div></div>
          <div class="list-row"><div class="list-row-main"><div class="list-row-title">3. Tap Import ZIP above</div><div class="list-row-sub">Workouts with HR zones appear instantly</div></div></div>
        </div>`;
    }
  }

  /* ---- Render ---- */
  app.innerHTML = weekNavHtml + tabStripHtml + `<div id="tab-content">${tabContent}</div>`;

  /* ---- Event bindings ---- */

  // Week prev/next
  document.getElementById("tn-prev")?.addEventListener("click", () => {
    if (wn > 1) { viewingWeekNum = wn - 1; selectedDayOverride = null; renderMain(app); }
  });
  document.getElementById("tn-next")?.addEventListener("click", () => {
    if (wn < PLAN.weeks.length) { viewingWeekNum = wn + 1; selectedDayOverride = null; renderMain(app); }
  });

  // Day pills
  app.querySelectorAll(".tdp").forEach((btn) => {
    btn.addEventListener("click", () => { selectedDayOverride = btn.dataset.day; renderMain(app); });
  });

  // Tab strip
  app.querySelectorAll(".dts[data-tab]").forEach((btn) => {
    btn.addEventListener("click", () => { dayTab = btn.dataset.tab; renderMain(app); });
  });

  // Overview jump-to-tab cards
  app.querySelectorAll("[data-jump]").forEach((btn) => {
    btn.addEventListener("click", () => { dayTab = btn.dataset.jump; renderMain(app); });
  });

  if (dayTab === "training" && selSession) {
    attachSessionHandlers(wn);
    const yName = DAY_NAMES[((new Date().getDay() - 1 + 7) % 7)];
    app.querySelectorAll("[data-catchup-move]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tod = DAY_NAMES[new Date().getDay()];
        if (selSession && selSession.id !== btn.dataset.catchupMove) setSessionDay(wn, selSession.id, yName);
        setSessionDay(wn, btn.dataset.catchupMove, tod);
        renderMain(app);
      });
    });
    app.querySelectorAll("[data-catchup-skip]").forEach((btn) => {
      btn.addEventListener("click", () => { toggleSessionDone(wn, btn.dataset.catchupSkip); renderMain(app); });
    });
  }

  if (dayTab === "nutrition") {
    document.getElementById("log-meal-btn")?.addEventListener("click", () => showLogMealSheet(selDateStr));
    app.querySelectorAll("[data-action='edit-meal']").forEach((btn) => {
      btn.addEventListener("click", () => {
        const meal = dayMeals.find((m) => m.id === btn.dataset.mid);
        if (meal) showMealEditSheet(meal.items, "", meal.source || "manual", btn.dataset.date, meal);
      });
    });
    app.querySelectorAll("[data-action='delete-meal']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this meal?")) {
          deleteMeal(btn.dataset.mid, btn.dataset.date);
          renderMain(app);
        }
      });
    });
    app.querySelectorAll(".fuel-period-btn").forEach((btn) => {
      btn.addEventListener("click", () => { fuelSummaryPeriod = Number(btn.dataset.period); renderMain(app); });
    });
  }

  if (dayTab === "fitness") {
    app.querySelectorAll("[data-action='delete-workout']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this workout?")) {
          deleteFitnessWorkout(btn.dataset.wid, btn.dataset.date);
          renderMain(app);
        }
      });
    });
    const zipInput = document.getElementById("fi-zip-input");
    const statusEl = document.getElementById("fi-import-status");
    if (zipInput && statusEl) {
      zipInput.addEventListener("change", async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        statusEl.style.display = "block";
        statusEl.className = "fi-import-status fi-import-loading";
        statusEl.textContent = "Parsing ZIP…";
        try {
          const { workouts, dailyBurn } = await parseHealthAutoExportZIP(file);
          workouts.forEach((w) => saveFitnessWorkout(w, w.date));
          const burnDates = Object.keys(dailyBurn || {});
          burnDates.forEach((d) => saveDailyBurn(d, dailyBurn[d]));

          const parts = [];
          if (workouts.length > 0) parts.push(`${workouts.length} workout${workouts.length !== 1 ? "s" : ""}`);
          if (burnDates.length > 0) parts.push(`Move kcal for ${burnDates.length} day${burnDates.length !== 1 ? "s" : ""}`);

          if (parts.length === 0) {
            statusEl.className = "fi-import-status fi-import-warn";
            statusEl.textContent = "No new data found — already imported or export was empty.";
          } else {
            statusEl.className = "fi-import-status fi-import-ok";
            statusEl.textContent = `Imported: ${parts.join(" · ")} ✓`;
            setTimeout(() => renderMain(app), 1000);
          }
        } catch (err) {
          statusEl.className = "fi-import-status fi-import-err";
          statusEl.textContent = "Import failed: " + (err.message || "Unknown error");
        }
        zipInput.value = "";
      });
    }
  }
}

function focusIcon(focus) {
  const paths = {
    // Barbell
    strength: '<path d="M5 9v6M3 11v2M19 9v6M21 11v2M7 9v6M17 9v6M7 12h10" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    // Running figure (simplified)
    run: '<path d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 13l3-3 2 2-3 3-2-2zM10 9l3 3-1 4 3 3M14 12l3-1 2 2" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
    // Lightning
    hybrid: '<path d="M13 2L4 13h7l-1 9 9-11h-7l1-9z" fill="currentColor"/>',
    // Target
    sim: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor"/>',
    // Check chart
    test: '<path d="M3 17l5-5 4 4 8-9M14 7h6v6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
  };
  const p = paths[focus] || paths.strength;
  return `<svg viewBox="0 0 24 24" width="16" height="16">${p}</svg>`;
}

function renderSessionCard(session, weekNum, expanded) {
  const settings = getSettings();
  const done = isSessionDone(weekNum, session.id);

  const week = PLAN.weeks.find((w) => w.number === weekNum);
  const daysAll = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const currentDay = getSessionDay(weekNum, session.id, session.defaultDay);

  const dayMap = {};
  if (week) {
    for (const s of week.sessions) {
      const d = getSessionDay(weekNum, s.id, s.defaultDay);
      if (!dayMap[d]) dayMap[d] = s;
    }
  }

  const focusLabel = {
    strength: "Strength", run: "Run", hybrid: "Hybrid", sim: "Hyrox sim", test: "Test"
  }[session.focus] || session.focus;

  const dayChipsHtml = daysAll.map((d) => {
    const sess = dayMap[d];
    const isCurrent = sess && sess.id === session.id;
    if (!sess) {
      return `<span class="day-pill rest">${d}</span>`;
    }
    return `<a href="#/session/${weekNum}/${escapeHtml(sess.id)}" class="day-pill ${isCurrent ? "selected" : "has-session"}">${d}</a>`;
  }).join("");

  const blocksHtml = expanded && session.blocks
    ? session.blocks.map((b, i) => renderBlock(b, settings, weekNum, session.id, i)).join("")
    : "";

  const userBlocksHtml = expanded
    ? getUserBlocks(weekNum, session.id).map((ub) => renderUserBlock(ub, weekNum, session.id)).join("")
    : "";

  const warmupHtml = (session.warmup || []).map((w) =>
    `<div class="prep-row">${escapeHtml(w)}</div>`).join("");

  const cooldownHtml = (session.cooldown || []).map((w) =>
    `<div class="prep-row">${escapeHtml(w)}</div>`).join("");

  return `
    <div class="hero" data-session="${escapeHtml(session.id)}">
      <div class="hero-eyebrow">
        <span class="dot dot-${session.focus}"></span>
        <span>${escapeHtml(focusLabel)} · ${session.duration} min · ${escapeHtml(currentDay)}</span>
      </div>
      <div class="hero-title">${escapeHtml(session.title)}</div>
      ${session.intent ? `<div class="hero-intent">${escapeHtml(session.intent)}</div>` : ""}
    </div>

    ${warmupHtml ? `
      <div class="section-header">Warm-up</div>
      <div class="list">${warmupHtml}</div>` : ""}

    ${(blocksHtml || userBlocksHtml) ? `
      <div class="section-header">Main</div>
      <div class="list">${blocksHtml}${userBlocksHtml}</div>
      <button class="btn-reschedule" data-action="add-exercise" data-week="${weekNum}" data-sid="${escapeHtml(session.id)}" style="color:var(--accent)">+ Add exercise</button>
      <div class="section-footer">Tap a weight to adjust it · tap ✓ circle to mark done.</div>` : ""}

    ${done ? (() => {
      const savedActuals = getSessionActuals(weekNum, session.id);
      if (savedActuals && savedActuals.length) {
        const isNewFmt = Array.isArray(savedActuals[0]?.rounds);
        if (isNewFmt) {
          const rows = savedActuals.map((bs) => {
            const allOk = bs.rounds.every((r) =>
              r.exercises.every((ex) => !ex.actual || ex.actual === ex.planned) &&
              (!r.rest.actual || r.rest.actual === r.rest.planned)
            );
            if (allOk) return `<div class="actual-log-row">
              <span class="actual-log-name">${escapeHtml(bs.name)}</span>
              <span class="actual-log-ok">✓ as planned</span>
            </div>`;
            const roundChips = bs.rounds.map((r) => {
              const exChg = r.exercises.filter((ex) => ex.actual && ex.actual !== ex.planned);
              const rstChg = r.rest.actual && r.rest.actual !== r.rest.planned;
              if (!exChg.length && !rstChg) return null;
              const chips = [
                ...exChg.map((ex) => `<span class="actual-log-field">${escapeHtml(ex.actual)}</span>`),
                rstChg ? `<span class="actual-log-field">rest ${escapeHtml(r.rest.actual)}</span>` : null
              ].filter(Boolean).join("");
              return `<span class="actl-rsum"><span class="actl-rnum">R${r.num}</span>${chips}</span>`;
            }).filter(Boolean).join("");
            return `<div class="actual-log-row actual-log-row-edited">
              <span class="actual-log-name">${escapeHtml(bs.name)}</span>
              <div class="actual-log-changes">${roundChips}${bs.note ? `<span class="actual-log-note">${escapeHtml(bs.note)}</span>` : ""}</div>
            </div>`;
          }).join("");
          const adjCount = savedActuals.filter((bs) => bs.rounds && bs.rounds.some((r) =>
            r.exercises.some((ex) => ex.actual && ex.actual !== ex.planned) ||
            (r.rest.actual && r.rest.actual !== r.rest.planned)
          )).length;
          return `
            <div class="section-header">Actuals${adjCount > 0 ? ` · ${adjCount} adjusted` : " · all as planned"}</div>
            <div class="actual-log-list">${rows}</div>
            <button class="btn-reschedule" data-action="edit-actuals" data-week="${weekNum}" data-sid="${escapeHtml(session.id)}" style="color:var(--info)">✏️ Edit actuals</button>`;
        }
        // Legacy format
        const editedBlocks = savedActuals.filter((ba) => !ba.asPlanned);
        const actualsRows = savedActuals.map((ba) => {
          if (ba.asPlanned) return `<div class="actual-log-row">
            <span class="actual-log-name">${escapeHtml(ba.name)}</span>
            <span class="actual-log-ok">✓ as planned</span>
          </div>`;
          const changes = [];
          if (ba.schemeActual && ba.schemeActual !== ba.schemePlanned)
            changes.push(`<span class="actual-log-field">${escapeHtml(ba.schemeActual)}</span>`);
          if (ba.loadActual && ba.loadActual !== ba.loadPlanned)
            changes.push(`<span class="actual-log-field">${escapeHtml(ba.loadActual)}</span>`);
          if (ba.restActual !== ba.restPlanned)
            changes.push(`<span class="actual-log-field">rest ${escapeHtml(ba.restActual || "none")}</span>`);
          return `<div class="actual-log-row actual-log-row-edited">
            <span class="actual-log-name">${escapeHtml(ba.name)}</span>
            <div class="actual-log-changes">${changes.join("")}${ba.note ? `<span class="actual-log-note">${escapeHtml(ba.note)}</span>` : ""}</div>
          </div>`;
        }).join("");
        return `
          <div class="section-header">Actuals${editedBlocks.length > 0 ? ` · ${editedBlocks.length} adjusted` : " · all as planned"}</div>
          <div class="actual-log-list">${actualsRows}</div>
          <button class="btn-reschedule" data-action="edit-actuals" data-week="${weekNum}" data-sid="${escapeHtml(session.id)}" style="color:var(--info)">✏️ Edit actuals</button>`;
      }
      return `
        <div class="section-header">Actuals</div>
        <button class="btn-reschedule" data-action="log-actuals" data-week="${weekNum}" data-sid="${escapeHtml(session.id)}" style="color:var(--info)">📊 Log actuals</button>`;
    })() : ""}

    ${cooldownHtml ? `
      <div class="section-header">Cooldown</div>
      <div class="list">${cooldownHtml}</div>` : ""}

    ${session.tips ? `<div class="alert alert-info" style="margin-top:16px"><strong>Coach note</strong>${escapeHtml(session.tips)}</div>` : ""}

    ${session.testProtocol ? `
      <div class="alert alert-warn" style="margin-top:16px">
        <strong>Test session</strong>
        Capture: ${(session.testProtocol.metrics || []).join(", ")}.<br>
        ${escapeHtml(session.testProtocol.instructions || "")}
      </div>` : ""}

    <div class="section-header">Session notes</div>
    <textarea class="journal-input" data-week="${weekNum}" data-sid="${escapeHtml(session.id)}" placeholder="How did it feel? Notes, PRs, things to remember…" rows="3">${escapeHtml(getJournalNote(weekNum, session.id))}</textarea>

    <button class="btn-reschedule" data-action="reschedule" data-session="${escapeHtml(session.id)}">Move to another day…</button>

    <div style="margin-top:24px">
      <button class="btn" data-action="toggle-done" data-session="${escapeHtml(session.id)}">
        ${done ? "Mark not done" : "Mark session complete"}
      </button>
      ${session.testProtocol ? `<a class="btn btn-secondary" href="#/tests" style="margin-top:10px;display:flex">Log test result</a>` : ""}
    </div>
  `;
}

function renderBlock(block, settings, weekNum, sessionId, blockIdx) {
  const done = isBlockDone(weekNum, sessionId, blockIdx);
  const isCompound = Array.isArray(block.load) || (block.load && block.load.type === "list");

  let trailingLoad = "";
  let inlineLoadHtml = "";
  let displayKg = null;

  if (block.load) {
    if (isCompound) {
      inlineLoadHtml = `<div class="block-multi">${renderLoadCompound(block.load, settings)}</div>`;
    } else if (block.load.type === "pct") {
      // Adjustable — check override and add tap target
      const max = getRefValue(block.load.ref, settings);
      if (!max) {
        trailingLoad = setRefLink(block.load.ref);
      } else {
        const r = settings.rounding || 2.5;
        const planKg = Math.round((max * block.load.pct) / r) * r;
        const override = getBlockOverride(weekNum, sessionId, blockIdx);
        displayKg = override != null ? override : planKg;
        const isOverridden = override != null;
        trailingLoad = `<span class="block-load${isOverridden ? " overridden" : ""}" data-adjust="1" data-week="${weekNum}" data-sid="${escapeHtml(sessionId)}" data-bidx="${blockIdx}" data-plan-kg="${planKg}" data-block-name="${escapeHtml(block.name)}">${displayKg} kg</span>`;
      }
    } else {
      trailingLoad = renderLoadSimple(block.load, settings);
    }
  }

  // Interval timer button
  const parsedInterval = parseIntervalScheme(block.scheme);
  const timerBtn = parsedInterval
    ? `<button class="block-action-btn" data-action="start-timer" data-block="${escapeHtml(JSON.stringify({ name: block.name, scheme: block.scheme }))}" title="Start interval timer">▶ Timer</button>`
    : "";

  // Set log button (only for weighted strength blocks)
  const logs = getBlockLogs(weekNum, sessionId, blockIdx);
  const logBtn = (block.load && block.load.type === "pct" && displayKg != null)
    ? `<button class="block-action-btn block-action-log" data-action="log-set" data-week="${weekNum}" data-sid="${escapeHtml(sessionId)}" data-bidx="${blockIdx}" data-name="${escapeHtml(block.name)}" data-kg="${displayKg}">+ Log set${logs.length > 0 ? ` (${logs.length})` : ""}</button>`
    : "";

  const logPillsHtml = logs.length > 0
    ? `<div class="set-log-pills">${logs.map((l) => `<span class="set-log-pill">${[l.kg != null ? l.kg + "kg" : null, l.reps != null ? "×" + l.reps : null, l.rpe != null ? "RPE " + l.rpe : null].filter(Boolean).join(" ")}</span>`).join("")}</div>`
    : "";

  const actionsHtml = (timerBtn || logBtn)
    ? `<div class="block-actions">${timerBtn}${logBtn}</div>`
    : "";

  return `
    <div class="block ${done ? "done" : ""}">
      <div class="block-check" data-action="toggle-block" data-block-idx="${blockIdx}" data-session="${escapeHtml(sessionId)}">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#000" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 8 7 12 13 4"/></svg>
      </div>
      <div class="block-body">
        <div class="block-row">
          <span class="block-name">${escapeHtml(block.name)}</span>
          ${trailingLoad}
        </div>
        ${block.scheme ? `<div class="block-scheme">${escapeHtml(block.scheme)}${block.rest ? ` · rest ${escapeHtml(block.rest)}` : ""}</div>` : ""}
        ${inlineLoadHtml}
        ${block.note ? `<div class="block-note">${escapeHtml(block.note)}</div>` : ""}
        ${logPillsHtml}
        ${actionsHtml}
      </div>
    </div>
  `;
}

function renderUserBlock(ub, weekNum, sessionId) {
  return `
    <div class="block-custom">
      <div class="block-custom-badge">Custom</div>
      <div class="block-body">
        <div class="block-row">
          <span class="block-name">${escapeHtml(ub.name)}</span>
          ${ub.load ? `<span class="block-load" style="color:var(--info)">${escapeHtml(ub.load)}</span>` : ""}
        </div>
        ${ub.scheme ? `<div class="block-scheme">${escapeHtml(ub.scheme)}</div>` : ""}
        <button class="block-delete" data-action="delete-user-block" data-week="${weekNum}" data-sid="${escapeHtml(sessionId)}" data-ubid="${escapeHtml(ub.id)}">Remove</button>
      </div>
    </div>
  `;
}

function setRefLink(ref) {
  const label = REF_LABELS[ref] || ref;
  return `<a class="block-load unset" href="#/settings/${escapeHtml(ref)}" onclick="event.stopPropagation();try{sessionStorage.setItem('hyrox.returnTo',location.hash||'#/today')}catch(e){}">Set ${escapeHtml(label)}</a>`;
}

function renderLoadSimple(load, settings) {
  if (!load) return "";
  switch (load.type) {
    case "pct": {
      const max = getRefValue(load.ref, settings);
      if (!max) return setRefLink(load.ref);
      const kg = max * load.pct;
      const r = settings.rounding || 2.5;
      const rounded = Math.round(kg / r) * r;
      return `<span class="block-load">${rounded} kg</span>`;
    }
    case "fixed":
      return `<span class="block-load">${escapeHtml(load.value)}</span>`;
    case "bw":
      return `<span class="block-load">BW</span>`;
    case "pace": {
      const base = getRefValue(load.ref, settings);
      if (!base) return setRefLink(load.ref);
      const factor = load.factor != null ? load.factor : 1.0;
      const secPerKm = base * factor;
      const kmh = 3600 / secPerKm;
      return `<span class="block-load with-sub"><span>${formatSecToPace(secPerKm)}/km</span><span class="block-load-sub">${kmh.toFixed(1)} km/h</span></span>`;
    }
    case "split": {
      const base = getRefValue(load.ref, settings);
      if (!base) return setRefLink(load.ref);
      const factor = load.factor != null ? load.factor : 1.0;
      return `<span class="block-load">${formatSecToPace(base * factor)}/500m</span>`;
    }
    case "station": {
      const v = getRefValue(load.ref, settings);
      if (v == null) return setRefLink(load.ref);
      return `<span class="block-load">${v} kg</span>`;
    }
    case "rpe":
      return `<span class="block-load">RPE ${load.value}</span>`;
    case "label":
      return `<span class="block-load">${escapeHtml(load.value)}</span>`;
    default:
      return "";
  }
}

function renderLoadCompound(load, settings) {
  if (Array.isArray(load)) {
    return load.map((l) => {
      if (l.type === "list") {
        return l.items.map((i) => `<span class="block-multi-line">• ${escapeHtml(i)}</span>`).join("");
      }
      const label = l.label ? `<span class="dim">${escapeHtml(l.label)}: </span>` : "";
      const val = renderLoadSimple(l, settings);
      return `<span class="block-multi-line">${label}${val}</span>`;
    }).join("");
  }
  if (load.type === "list") {
    return load.items.map((i) => `<span class="block-multi-line">• ${escapeHtml(i)}</span>`).join("");
  }
  return renderLoadSimple(load, settings);
}

async function renderWeek(app, params) {
  const settings = getSettings();
  let weekNum = Number(params[0]) || getWeekIndex(settings);
  weekNum = Math.max(1, Math.min(PLAN.weeks.length, weekNum));
  const week = PLAN.weeks.find((w) => w.number === weekNum);
  if (!week) {
    app.innerHTML = `<div class="empty-state"><h3>No week ${weekNum}</h3></div>`;
    return;
  }

  const phase = getCurrentPhase(PLAN, weekNum);
  const doneCount = week.sessions.filter((s) => isSessionDone(weekNum, s.id)).length;

  const dayOrder = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const ordered = [...week.sessions].sort((a, b) => {
    const da = getSessionDay(weekNum, a.id, a.defaultDay);
    const db = getSessionDay(weekNum, b.id, b.defaultDay);
    return dayOrder.indexOf(da) - dayOrder.indexOf(db);
  });

  // Build per-day list including rest days
  const dayMap = {};
  for (const s of week.sessions) {
    const d = getSessionDay(weekNum, s.id, s.defaultDay);
    if (!dayMap[d]) dayMap[d] = s;
  }

  let html = `
    <h1 class="large-title">Week ${week.number}</h1>
    <div class="large-title-sub">
      ${phase ? escapeHtml(phase.name) : ""}${week.test ? " · Test week" : ""} · ${doneCount}/${week.sessions.length} done
    </div>

    ${week.theme ? `<div class="alert alert-info">${escapeHtml(week.theme)}</div>` : ""}

    <div class="list">
  `;

  for (const d of dayOrder) {
    const s = dayMap[d];
    const isToday = d === DAY_NAMES[new Date().getDay()] && weekNum === getWeekIndex(settings);
    if (!s) {
      html += `<div class="list-row" style="cursor:default">
        <div class="list-row-leading" style="background:transparent;color:var(--text-4);font-weight:700;font-size:13px">${d}</div>
        <div class="list-row-main">
          <div class="list-row-title" style="color:var(--text-3)">Rest</div>
        </div>
      </div>`;
      continue;
    }
    const done = isSessionDone(weekNum, s.id);
    html += `<a href="#/session/${weekNum}/${escapeHtml(s.id)}" class="list-row ${isToday ? "is-today" : ""}">
      <div class="list-row-leading ${s.focus}" style="font-size:13px;font-weight:700">${d}</div>
      <div class="list-row-main">
        <div class="list-row-title" style="${done ? "text-decoration:line-through;color:var(--text-3)" : ""}">${escapeHtml(s.title)}</div>
        <div class="list-row-sub">${s.duration} min</div>
      </div>
      ${done
        ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--success)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
        : `<svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`}
    </a>`;
  }

  html += `</div>

    <div class="btn-row">
      <button class="btn btn-secondary" ${weekNum === 1 ? "disabled" : ""} data-nav-week="${weekNum - 1}">← Week ${weekNum - 1}</button>
      <button class="btn btn-secondary" ${weekNum === PLAN.weeks.length ? "disabled" : ""} data-nav-week="${weekNum + 1}">Week ${weekNum + 1} →</button>
    </div>
  `;

  app.innerHTML = html;

  document.querySelectorAll("[data-nav-week]").forEach((btn) => {
    if (btn.disabled) return;
    btn.addEventListener("click", () => navigate("week/" + btn.dataset.navWeek));
  });
}

/* ---------- Race Simulation Mode ---------- */

ROUTES.racesim = renderRaceSim;
async function renderRaceSim(app) {
  const settings = getSettings();
  app.innerHTML = `
    <h1 class="large-title">Race Simulation</h1>
    <div class="large-title-sub">Full 8+8 timer vs your targets</div>
    <div class="alert alert-info" style="margin-top:0">
      <strong>How it works</strong>
      Start the timer and run each segment. Tap <em>Done → Next</em> when you finish each leg or station. See live splits vs target at the end.
    </div>
    <div class="projector-card">
      <div class="projector-header">Target finish</div>
      <div class="projector-time">${renderRaceProjectorHtml(settings) ? formatTotalSecs(calcProjectedTime(settings)) : "Set paces in Settings"}</div>
      <div class="projector-note">Run pace: ${formatSecToPace(settings.running?.raceHyroxTargetSecPerKm || 0)}/km · 16 segments total</div>
    </div>
    <button class="btn" id="start-sim-btn" style="margin-top:8px">🏁 Start Race Sim</button>
    <a class="btn btn-secondary" href="#/settings" style="display:flex;margin-top:10px">Adjust target pace →</a>
  `;
  document.getElementById("start-sim-btn")?.addEventListener("click", () => showRaceSimTimer(settings));
}

function showRaceSimTimer(settings) {
  const pace = settings.running?.raceHyroxTargetSecPerKm || 250;
  const segments = [
    { name: "Run 1 · 1km", type: "run", target: pace },
    { name: "SkiErg · 1000m", type: "station", target: 190 },
    { name: "Run 2 · 1km", type: "run", target: pace },
    { name: "Sled Push · 50m", type: "station", target: 270 },
    { name: "Run 3 · 1km", type: "run", target: pace },
    { name: "Sled Pull · 25m", type: "station", target: 180 },
    { name: "Run 4 · 1km", type: "run", target: pace },
    { name: "Burpee Jumps · 80m", type: "station", target: 210 },
    { name: "Run 5 · 1km", type: "run", target: pace },
    { name: "Row · 1000m", type: "station", target: 330 },
    { name: "Run 6 · 1km", type: "run", target: pace },
    { name: "Farmers · 200m", type: "station", target: 210 },
    { name: "Run 7 · 1km", type: "run", target: pace },
    { name: "Sandbag Lunges · 100m", type: "station", target: 180 },
    { name: "Run 8 · 1km", type: "run", target: pace },
    { name: "Wall Balls · 100 reps", type: "station", target: 300 },
  ];
  let idx = 0, elapsed = 0, totalElapsed = 0, running = false;
  const splits = [];
  let tid = null;

  const overlay = document.createElement("div");
  overlay.className = "timer-overlay";
  document.body.appendChild(overlay);

  function render() {
    const seg = segments[idx];
    const diff = elapsed - seg.target;
    const diffColor = diff > 15 ? "var(--danger)" : diff > 0 ? "var(--warn)" : "var(--success)";
    const diffStr = diff === 0 ? "on target" : (diff > 0 ? `+${diff}s behind` : `${Math.abs(diff)}s ahead`);
    const typeClass = seg.type === "run" ? "timer-phase-rest" : "timer-phase-work";
    overlay.innerHTML = `
      <div class="timer-content">
        <button class="timer-close" id="sim-close">✕</button>
        <div class="timer-phase ${typeClass}">${seg.type === "run" ? "RUN" : "STATION"}</div>
        <div class="timer-name" style="font-size:18px;font-weight:700;margin:4px 0">${escapeHtml(seg.name)}</div>
        <div class="timer-countdown" style="font-size:72px">${String(Math.floor(elapsed/60)).padStart(2,"0")}:${String(elapsed%60).padStart(2,"0")}</div>
        <div style="font-size:14px;color:var(--text-3)">Target: ${String(Math.floor(seg.target/60)).padStart(2,"0")}:${String(seg.target%60).padStart(2,"0")}</div>
        <div style="font-size:14px;color:${diffColor};margin-top:4px">${diffStr}</div>
        <div style="margin-top:16px;font-size:13px;color:var(--text-4)">Total: ${formatTotalSecs(totalElapsed)} · Seg ${idx+1}/${segments.length}</div>
        <div class="timer-row" style="margin-top:16px;gap:10px">
          <button class="timer-btn" id="sim-pause" style="flex:0.8">${running ? "⏸" : "▶"}</button>
          <button class="timer-btn" id="sim-next" style="flex:1.4;background:var(--accent);color:#000">Done → Next</button>
        </div>
        <div class="timer-progress" style="margin-top:12px">
          ${segments.map((s, i) => `<div class="timer-pip ${s.type === "run" ? "sim-run" : "sim-station"} ${i < idx ? "done" : i === idx ? "active" : ""}"></div>`).join("")}
        </div>
      </div>`;
    document.getElementById("sim-close").addEventListener("click", stop);
    document.getElementById("sim-pause").addEventListener("click", () => { running = !running; render(); });
    document.getElementById("sim-next").addEventListener("click", nextSeg);
  }

  function nextSeg() {
    splits.push({ name: segments[idx].name, elapsed, target: segments[idx].target });
    idx++; elapsed = 0;
    if (idx >= segments.length) { stop(); showSimSummary(splits, totalElapsed); return; }
    beep("start"); render();
  }

  function tick() { if (!running) return; elapsed++; totalElapsed++; render(); }
  function stop() { clearInterval(tid); overlay.classList.remove("open"); setTimeout(() => overlay.remove(), 300); }

  requestAnimationFrame(() => overlay.classList.add("open"));
  running = true; render(); beep("start");
  tid = setInterval(tick, 1000);
}

function showSimSummary(splits, totalSec) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  const rows = splits.map((s) => {
    const diff = s.elapsed - s.target;
    const col = diff > 15 ? "var(--danger)" : diff > 0 ? "var(--warn)" : "var(--success)";
    return `<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:0.5px solid var(--separator);font-variant-numeric:tabular-nums">
      <span style="font-size:13px;color:var(--text-2)">${escapeHtml(s.name)}</span>
      <span style="font-size:13px;color:${col}">${String(Math.floor(s.elapsed/60)).padStart(2,"0")}:${String(s.elapsed%60).padStart(2,"0")} (${diff>0?"+":""}${diff}s)</span>
    </div>`;
  }).join("");
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">Race Sim Complete 🏁<div class="action-sheet-title-sub">Total: ${formatTotalSecs(totalSec)}</div></div>
      <div class="action-sheet-group" style="padding:12px 16px;max-height:55vh;overflow-y:auto">${rows}</div>
      <div style="padding:0 10px 10px"><button class="btn" data-cancel="1">Done</button></div>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));
  sheet.querySelector("[data-cancel]").addEventListener("click", () => {
    sheet.classList.remove("open"); setTimeout(() => { sheet.remove(); route(); }, 200);
  });
}

/* ---------- Workout History ---------- */

ROUTES.history = renderHistory;
async function renderHistory(app) {
  const progress = getProgress();
  const allLogs = (() => { try { return JSON.parse(localStorage.getItem(SESSION_LOGS_KEY) || "{}"); } catch { return {}; } })();
  const journals = (() => { try { return JSON.parse(localStorage.getItem(JOURNAL_KEY) || "{}"); } catch { return {}; } })();

  const completed = Object.entries(progress.sessions || {})
    .filter(([key, v]) => v && v.completedAt && !key.includes(".b"))
    .map(([key, v]) => {
      const parts = key.split(".");
      const wn = parseInt(parts[0].replace("W", ""));
      const sId = parts.slice(1).join(".");
      const week = PLAN.weeks.find((w) => w.number === wn);
      const session = week && week.sessions.find((s) => s.id === sId);
      if (!session) return null;
      const setCount = Object.entries(allLogs)
        .filter(([k]) => k.startsWith(`${key}.b`))
        .reduce((sum, [, logs]) => sum + (Array.isArray(logs) ? logs.length : 0), 0);
      return { key, wn, sId, session, completedAt: new Date(v.completedAt), rpe: v.rpe, journal: journals[key] || "", setCount };
    })
    .filter(Boolean)
    .sort((a, b) => b.completedAt - a.completedAt);

  let html = `
    <h1 class="large-title">History</h1>
    <div class="large-title-sub">${completed.length} sessions logged</div>`;

  if (!completed.length) {
    html += `<div class="empty-state"><h3>No sessions yet</h3><p>Complete your first session to build history.</p></div>`;
    app.innerHTML = html; return;
  }

  // Group by week
  const byWeek = {};
  completed.forEach((d) => { if (!byWeek[d.wn]) byWeek[d.wn] = []; byWeek[d.wn].push(d); });

  for (const [wn, sessions] of Object.entries(byWeek).sort((a, b) => b[0] - a[0])) {
    const phase = getCurrentPhase(PLAN, Number(wn));
    html += `<div class="section-header">Week ${wn}${phase ? " · " + phase.name : ""}</div><div class="list">`;
    for (const d of sessions) {
      const rpeColor = !d.rpe ? "" : d.rpe <= 5 ? "var(--success)" : d.rpe <= 7 ? "var(--warn)" : "var(--danger)";
      const meta = [
        d.completedAt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }),
        d.setCount > 0 ? `${d.setCount} sets` : null,
        d.journal ? "notes" : null
      ].filter(Boolean).join(" · ");
      html += `<a href="#/session/${d.wn}/${escapeHtml(d.sId)}" class="list-row">
        <span class="list-row-leading ${d.session.focus}">${focusIcon(d.session.focus)}</span>
        <div class="list-row-main">
          <div class="list-row-title">${escapeHtml(d.session.title)}</div>
          <div class="list-row-sub">${escapeHtml(meta)}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px">
          ${d.rpe ? `<span style="font-size:12px;font-weight:700;color:${rpeColor}">RPE ${d.rpe}</span>` : ""}
          <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
        </div>
      </a>`;
    }
    html += `</div>`;
  }
  app.innerHTML = html;
}

/* ============================================================
   Fuel — meal tracker
   ============================================================ */

// #/fuel URL redirects to today with nutrition tab active
ROUTES.fuel = async (app) => { dayTab = "nutrition"; await renderMain(app); };

// Module-level state for Fuel period picker
let fuelSummaryPeriod = 0; // 0 = this week, 1 = last week
let fuelViewDate = null; // null = today; "YYYY-MM-DD" for historical days

async function renderFuel(app) {
  const s   = getSettings();
  const tgt = s.nutrition;

  // Day navigation
  const todayDs  = ymd(today());
  const viewDs   = fuelViewDate || todayDs;
  // Parse the viewed date in local time
  const vpParts  = viewDs.split("-").map(Number);
  const viewDate = new Date(vpParts[0], vpParts[1] - 1, vpParts[2]);
  const isToday  = viewDs === todayDs;

  const meals  = getDayMeals(viewDs);
  const totals = getDayTotals(meals);

  const kcalLeft = tgt.kcalTarget - Math.round(totals.kcal);
  const isOver   = kcalLeft < 0;

  const pPct = tgt.proteinTarget > 0 ? Math.min(100, Math.round(totals.p / tgt.proteinTarget * 100)) : 0;
  const cPct = tgt.carbTarget    > 0 ? Math.min(100, Math.round(totals.c / tgt.carbTarget    * 100)) : 0;
  const fPct = tgt.fatTarget     > 0 ? Math.min(100, Math.round(totals.f / tgt.fatTarget     * 100)) : 0;

  // 7-day rolling average (7 days prior to viewDate, excluding viewDate itself)
  let avgKcal = 0, avgP = 0, avgC = 0, avgF = 0, avgDays = 0;
  for (let i = 1; i <= 7; i++) {
    const d  = new Date(viewDate.getTime() - i * 86400000);
    const ds = ymd(d);
    const dm = getDayMeals(ds);
    if (dm.length > 0) {
      const t = getDayTotals(dm);
      avgKcal += t.kcal; avgP += t.p; avgC += t.c; avgF += t.f;
      avgDays++;
    }
  }
  const has7dAvg = avgDays > 0;
  if (has7dAvg) {
    avgKcal = Math.round(avgKcal / avgDays);
    avgP    = Math.round(avgP    / avgDays * 10) / 10;
    avgC    = Math.round(avgC    / avgDays * 10) / 10;
    avgF    = Math.round(avgF    / avgDays * 10) / 10;
  }
  const kcalDelta = Math.round(totals.kcal - avgKcal);
  const pDelta    = Math.round(totals.p    - avgP);
  const cDelta    = Math.round(totals.c    - avgC);
  const fDelta    = Math.round(totals.f    - avgF);

  // Nav constraints: can go back 90 days max
  const minDate      = new Date(today().getTime() - 90 * 86400000);
  const canGoBack    = viewDate > minDate;
  const canGoForward = viewDs < todayDs;

  // Date header label
  const dateLabel = isToday
    ? "Today"
    : viewDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  // Meal cards
  const MEAL_LABELS = { breakfast: "Breakfast 🌅", lunch: "Lunch ☀️", dinner: "Dinner 🌙", snack: "Snack 🍎" };
  const mealsHtml = meals.length === 0
    ? `<div class="empty-state"><h3>Nothing logged</h3><p>Tap + Log meal to add a meal${isToday ? " today" : " for this day"}.</p></div>`
    : meals.map((meal) => `
        <div class="meal-card">
          <div class="meal-card-header">
            <div>
              <div class="meal-card-label">${escapeHtml(MEAL_LABELS[meal.label] || meal.label)}</div>
              <div class="meal-card-time">${escapeHtml(meal.time)}</div>
            </div>
            <div style="text-align:right;flex:1;min-width:0">
              <div class="meal-card-kcal">${meal.total.kcal} kcal</div>
              <div class="meal-card-macros">${meal.total.p}g P · ${meal.total.c}g C · ${meal.total.f}g F</div>
            </div>
            <button class="meal-card-del" data-action="delete-meal" data-mid="${escapeHtml(meal.id)}" data-date="${escapeHtml(viewDs)}">×</button>
          </div>
          <div class="meal-items-list">
            ${meal.items.map((it) => `
              <div class="meal-item">
                <span class="meal-item-name">${escapeHtml(it.name)}</span>
                <span class="meal-item-qty dim">${escapeHtml(it.qty)}</span>
                <span class="meal-item-kcal">${it.kcal}</span>
              </div>`).join("")}
          </div>
        </div>`).join("");

  // Weekly summary
  const wSumm   = getNutritionWeekSummary(fuelSummaryPeriod);
  const wkTitle = fuelSummaryPeriod === 0 ? "This Week" : "Last Week";
  const wkStart = wSumm.startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const weekStatHtml = wSumm.loggedDays === 0
    ? `<div class="empty-state" style="margin:0;padding:12px 0 4px"><p style="font-size:14px">No data logged for ${wkTitle.toLowerCase()}.</p></div>`
    : `<div class="fuel-week-stat-grid">
        <div class="fuel-week-stat">
          <div class="fuel-week-stat-num fuel-stat-kcal">${wSumm.avgKcal.toLocaleString()}</div>
          <div class="fuel-week-stat-label">Avg kcal</div>
          <div class="fuel-week-stat-sub">Total ${wSumm.totalKcal.toLocaleString()}</div>
        </div>
        <div class="fuel-week-stat">
          <div class="fuel-week-stat-num fuel-stat-p">${wSumm.avgP}g</div>
          <div class="fuel-week-stat-label">Avg P</div>
          <div class="fuel-week-stat-sub">Total ${wSumm.totalP}g</div>
        </div>
        <div class="fuel-week-stat">
          <div class="fuel-week-stat-num fuel-stat-c">${wSumm.avgC}g</div>
          <div class="fuel-week-stat-label">Avg C</div>
          <div class="fuel-week-stat-sub">Total ${wSumm.totalC}g</div>
        </div>
        <div class="fuel-week-stat">
          <div class="fuel-week-stat-num fuel-stat-f">${wSumm.avgF}g</div>
          <div class="fuel-week-stat-label">Avg F</div>
          <div class="fuel-week-stat-sub">Total ${wSumm.totalF}g</div>
        </div>
      </div>
      <div class="fuel-week-daily-row">
        ${wSumm.daily.map((day) => {
          const isTodayCol = day.ds === todayDs;
          return `<div class="fuel-week-day-col${isTodayCol ? " is-today" : ""}">
            <div class="fuel-week-day-label">${day.label}</div>
            <div class="fuel-week-day-dot${day.hasData ? " has-data" : ""}"></div>
            <div class="fuel-week-day-kcal">${day.hasData ? Math.round(day.kcal).toLocaleString() : ""}</div>
          </div>`;
        }).join("")}
      </div>`;

  // Quota tier bar
  const noKey = !tgt.geminiKey;
  const photoAnalysesToday = getDayMeals(todayDs).filter((m) => m.source === "photo").length;
  const PHOTO_LIMIT = 20;
  const TEXT_LIMIT  = 500;
  const textEstimatesToday = parseInt(sessionStorage.getItem("hyrox.text.estimates.today") || "0", 10);
  const photoPct = Math.min(100, Math.round(photoAnalysesToday / PHOTO_LIMIT * 100));
  const textPct  = Math.min(100, Math.round(textEstimatesToday  / TEXT_LIMIT  * 100));

  app.innerHTML = `
    <div class="fuel-day-nav">
      <button class="fuel-day-arrow" id="fuel-prev-day"${canGoBack ? "" : " disabled"}>‹</button>
      <div class="fuel-day-center">
        <div class="fuel-day-label">${dateLabel}</div>
        ${!isToday ? `<button class="fuel-day-today-btn" id="fuel-goto-today">Today</button>` : ""}
      </div>
      <button class="fuel-day-arrow" id="fuel-next-day"${canGoForward ? "" : " disabled"}>›</button>
    </div>

    <div class="fuel-hero">
      <div class="fuel-kcal-block">
        <div class="fuel-kcal-num${isOver ? " fuel-over" : ""}">${Math.abs(kcalLeft)}</div>
        <div class="fuel-kcal-label">${isOver ? "kcal over target" : "kcal remaining"}</div>
        <div class="fuel-kcal-sub">${Math.round(totals.kcal)} eaten · ${tgt.kcalTarget} target</div>
      </div>
      <div class="fuel-macro-stack">
        <div class="fuel-macro-row">
          <span class="fuel-macro-name">Protein</span>
          <div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-protein" style="width:${pPct}%"></div></div>
          <span class="fuel-macro-gram">${Math.round(totals.p)}<span class="fuel-macro-tgt">/${tgt.proteinTarget}g</span></span>
        </div>
        <div class="fuel-macro-row">
          <span class="fuel-macro-name">Carbs</span>
          <div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-carb" style="width:${cPct}%"></div></div>
          <span class="fuel-macro-gram">${Math.round(totals.c)}<span class="fuel-macro-tgt">/${tgt.carbTarget}g</span></span>
        </div>
        <div class="fuel-macro-row">
          <span class="fuel-macro-name">Fat</span>
          <div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-fat" style="width:${fPct}%"></div></div>
          <span class="fuel-macro-gram">${Math.round(totals.f)}<span class="fuel-macro-tgt">/${tgt.fatTarget}g</span></span>
        </div>
      </div>
    </div>

    ${has7dAvg ? `<div class="fuel-avg-compare">
      <span class="fuel-avg-label">vs 7d avg</span>
      <span class="fuel-avg-item${kcalDelta > 0 ? " avg-pos" : kcalDelta < 0 ? " avg-neg" : ""}">${kcalDelta > 0 ? "+" : ""}${kcalDelta} kcal</span>
      <span class="fuel-avg-sep">·</span>
      <span class="fuel-avg-item${pDelta > 0 ? " avg-pos" : pDelta < 0 ? " avg-neg" : ""}">${pDelta > 0 ? "+" : ""}${pDelta}g P</span>
      <span class="fuel-avg-sep">·</span>
      <span class="fuel-avg-item${cDelta > 0 ? " avg-pos" : cDelta < 0 ? " avg-neg" : ""}">${cDelta > 0 ? "+" : ""}${cDelta}g C</span>
      <span class="fuel-avg-sep">·</span>
      <span class="fuel-avg-item${fDelta > 0 ? " avg-pos" : fDelta < 0 ? " avg-neg" : ""}">${fDelta > 0 ? "+" : ""}${fDelta}g F</span>
    </div>` : ""}

    <button class="btn" id="log-meal-btn">+ Log meal</button>

    <div class="section-header">Meals</div>
    ${mealsHtml}

    <div class="section-header" style="margin-top:24px">Weekly summary</div>
    <div class="fuel-period-picker">
      <button class="fuel-period-btn${fuelSummaryPeriod === 0 ? " fuel-period-btn-active" : ""}" data-period="0">This Week</button>
      <button class="fuel-period-btn${fuelSummaryPeriod === 1 ? " fuel-period-btn-active" : ""}" data-period="1">Last Week</button>
    </div>
    <div class="fuel-week-summary">
      <div class="fuel-week-summary-title">${wkTitle} · w/c ${wkStart} · ${wSumm.loggedDays}/7 days logged</div>
      ${weekStatHtml}
    </div>

    ${noKey ? `<div class="alert alert-warn" style="margin-top:16px">
      <strong>Gemini key missing</strong>
      Add it in <a href="#/settings" style="color:var(--warn)">Settings → Nutrition</a> to enable photo analysis.
    </div>` : `<div class="fuel-tier-bar">
      <div class="fuel-tier-label">
        <span>📷 Photos <span class="fuel-tier-model">2.5 Flash</span></span>
        <span class="fuel-tier-count">${photoAnalysesToday} / ${PHOTO_LIMIT} today</span>
      </div>
      <div class="fuel-tier-track"><div class="fuel-tier-fill" style="width:${photoPct}%"></div></div>
      <div class="fuel-tier-label" style="margin-top:8px">
        <span>✨ Text estimates <span class="fuel-tier-model">3.1 Flash Lite</span></span>
        <span class="fuel-tier-count">${textEstimatesToday} / ${TEXT_LIMIT} today</span>
      </div>
      <div class="fuel-tier-track"><div class="fuel-tier-fill fuel-tier-fill-text" style="width:${textPct}%"></div></div>
    </div>`}
  `;

  // Day navigation event handlers
  document.getElementById("fuel-prev-day")?.addEventListener("click", () => {
    const cur = fuelViewDate ? new Date(fuelViewDate + "T00:00:00") : today();
    const prev = new Date(cur.getTime() - 86400000);
    fuelViewDate = ymd(prev);
    renderFuel(app);
  });
  document.getElementById("fuel-next-day")?.addEventListener("click", () => {
    const cur = fuelViewDate ? new Date(fuelViewDate + "T00:00:00") : today();
    const next = new Date(cur.getTime() + 86400000);
    const nextDs = ymd(next);
    fuelViewDate = nextDs >= todayDs ? null : nextDs;
    renderFuel(app);
  });
  document.getElementById("fuel-goto-today")?.addEventListener("click", () => {
    fuelViewDate = null;
    renderFuel(app);
  });

  document.getElementById("log-meal-btn").addEventListener("click", () => showLogMealSheet(viewDs));

  app.querySelectorAll("[data-action='delete-meal']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Delete this meal?")) {
        deleteMeal(btn.dataset.mid, btn.dataset.date);
        renderFuel(app);
      }
    });
  });

  app.querySelectorAll(".fuel-period-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      fuelSummaryPeriod = Number(btn.dataset.period);
      renderFuel(app);
    });
  });
}

/* ---------- Gemini error toast ---------- */

function showGeminiError(msg) {
  // Surface a user-friendly banner instead of a raw browser alert
  const isQuota = /quota|limit|billing|rate/i.test(msg);
  const friendly = isQuota
    ? "Daily Gemini quota reached (20 free requests/day on gemini-2.5-flash). It resets at midnight Pacific time. You can still enter nutrition manually."
    : "AI estimation failed: " + msg;

  const toast = document.createElement("div");
  toast.className = "gemini-error-toast";
  toast.innerHTML = `<span class="gemini-error-icon">⚠️</span><span class="gemini-error-text">${escapeHtml(friendly)}</span><button class="gemini-error-close">×</button>`;
  document.body.appendChild(toast);
  requestAnimationFrame(() => toast.classList.add("visible"));

  const dismiss = () => { toast.classList.remove("visible"); setTimeout(() => toast.remove(), 300); };
  toast.querySelector(".gemini-error-close").addEventListener("click", dismiss);
  setTimeout(dismiss, 8000);
}

/* ---------- Photo retry sheet ---------- */

function showPhotoRetrySheet(errMsg) {
  if (!_pendingPhoto) { showGeminiError(errMsg); return; }
  const { b64, mime, targetDateStr, thumb } = _pendingPhoto;

  const isQuota = /quota|limit|billing|rate/i.test(errMsg || "");
  const friendly = isQuota
    ? "Daily Gemini quota reached. Try again after midnight Pacific time, or enter the meal manually."
    : (errMsg || "Gemini API unavailable — check your connection or API key.");

  const overlay = document.createElement("div");
  overlay.className = "photo-retry-overlay";
  overlay.innerHTML = `
    <div class="photo-retry-sheet" role="dialog" aria-modal="true">
      ${thumb ? `<img class="photo-retry-thumb" src="${thumb}" alt="Captured meal photo">` : `<div class="photo-retry-icon">📷</div>`}
      <div class="photo-retry-title">Analysis failed</div>
      <div class="photo-retry-msg">${escapeHtml(friendly)}</div>
      <div class="photo-retry-actions">
        ${isQuota ? "" : `<button class="photo-retry-btn photo-retry-primary" id="prs-retry">↺ Retry analysis</button>`}
        <button class="photo-retry-btn photo-retry-secondary" id="prs-manual">✏️ Enter manually</button>
        <button class="photo-retry-btn photo-retry-cancel" id="prs-cancel">Discard photo</button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  const close = () => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 260);
  };

  overlay.querySelector("#prs-retry")?.addEventListener("click", async () => {
    close();
    const loader = document.createElement("div");
    loader.className = "fuel-loader";
    loader.innerHTML = `<div class="fuel-loader-inner">${thumb ? `<img class="fuel-loader-thumb" src="${thumb}" alt="">` : ""}<div class="fuel-spinner"></div><div class="fuel-loader-text">Retrying…</div><div class="fuel-loader-sub">Sending photo to Gemini again</div></div>`;
    document.body.appendChild(loader);
    try {
      const result = await analyzeFood(b64, mime);
      loader.remove();
      _pendingPhoto = null;
      showMealEditSheet(result.items || [], result.notes || "", "photo", targetDateStr, null, thumb);
    } catch (err2) {
      loader.remove();
      showPhotoRetrySheet(err2.message); // keep showing retry sheet
    }
  });

  overlay.querySelector("#prs-manual").addEventListener("click", () => {
    close();
    _pendingPhoto = null;
    // Open edit sheet pre-loaded with photo thumb (items empty — user fills manually)
    showMealEditSheet([], "", "photo", targetDateStr, null, thumb);
  });

  overlay.querySelector("#prs-cancel").addEventListener("click", () => {
    close();
    _pendingPhoto = null;
  });
}

/* ---------- Log meal sheet (camera / library / manual) ---------- */

function showLogMealSheet(targetDateStr) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">Log meal<div class="action-sheet-title-sub">Photo analysis uses Gemini Flash (~0.01¢/photo)</div></div>
      <div class="action-sheet-group">
        <label class="action-sheet-btn" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
          📷 Take photo
          <input type="file" accept="image/*" capture="environment" id="meal-cam" style="display:none" />
        </label>
        <label class="action-sheet-btn" style="cursor:pointer;display:flex;align-items:center;justify-content:space-between">
          🖼️ Choose from library
          <input type="file" accept="image/*" id="meal-lib" style="display:none" />
        </label>
        <button class="action-sheet-btn" id="meal-manual-btn">✏️ Add manually</button>
      </div>
      <button class="action-sheet-btn action-sheet-cancel" id="meal-sheet-cancel">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));

  const close = () => { sheet.classList.remove("open"); setTimeout(() => sheet.remove(), 260); };

  const processFile = (file) => {
    if (!file) return;
    close();
    const loader = document.createElement("div");
    loader.className = "fuel-loader";
    loader.innerHTML = `<div class="fuel-loader-inner"><div class="fuel-spinner"></div><div class="fuel-loader-text">Analysing meal…</div><div class="fuel-loader-sub">Gemini Flash is estimating calories &amp; macros</div></div>`;
    document.body.appendChild(loader);

    const reader = new FileReader();
    reader.onload = async (ev) => {
      const b64  = ev.target.result.split(",")[1];
      const mime = file.type || "image/jpeg";
      // Compress immediately → thumbnail stays in memory for retry UI and gets saved with the meal
      const thumb = await compressToThumb(b64, mime);
      _pendingPhoto = { b64, mime, targetDateStr, thumb };
      // Show thumbnail in loader while waiting
      if (thumb) {
        const thumbEl = document.createElement("img");
        thumbEl.src = thumb;
        thumbEl.className = "fuel-loader-thumb";
        loader.querySelector(".fuel-loader-inner").prepend(thumbEl);
      }
      try {
        const result = await analyzeFood(b64, mime);
        loader.remove();
        _pendingPhoto = null;
        showMealEditSheet(result.items || [], result.notes || "", "photo", targetDateStr, null, thumb);
      } catch (err) {
        loader.remove();
        showPhotoRetrySheet(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  sheet.querySelector("#meal-cam").addEventListener("change", (e) => processFile(e.target.files[0]));
  sheet.querySelector("#meal-lib").addEventListener("change", (e) => processFile(e.target.files[0]));
  sheet.querySelector("#meal-manual-btn").addEventListener("click", () => { close(); showMealEditSheet([], "", "manual", targetDateStr); });
  sheet.querySelector("#meal-sheet-cancel").addEventListener("click", close);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
}

/* ---------- Meal edit / confirm sheet ---------- */

function showMealEditSheet(initItems, aiNotes, source, targetDateStr, editMeal = null, photoThumb = null) {
  // auto:true means "estimate this item via Gemini" — not yet calculated
  let items = initItems.map((it) => {
    const parsed = parseQtyString(it.qty || "");
    return {
      name:   it.name   || "",
      qtyNum: it.qtyNum != null ? it.qtyNum : parsed.qtyNum,
      unit:   it.unit   != null ? it.unit   : parsed.unit,
      kcal: it.kcal || 0, p: it.p || 0, c: it.c || 0, f: it.f || 0,
      auto: false
    };
  });
  const LABELS = ["breakfast", "lunch", "dinner", "snack"];
  const h = new Date().getHours();
  let selLabel = editMeal ? editMeal.label : (h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 19 ? "dinner" : "snack");

  const overlay = document.createElement("div");
  overlay.className = "fuel-edit-overlay";
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  const close = () => { overlay.classList.remove("open"); setTimeout(() => overlay.remove(), 280); };

  // Skip items pending estimation in the running total
  const calcTotal = () => items
    .filter((it) => !it.auto)
    .reduce((a, it) => ({
      kcal: a.kcal + (Number(it.kcal) || 0),
      p:    a.p    + (Number(it.p)    || 0),
      c:    a.c    + (Number(it.c)    || 0),
      f:    a.f    + (Number(it.f)    || 0)
    }), { kcal: 0, p: 0, c: 0, f: 0 });

  const renderSheet = () => {
    const freqItems = getFrequentItemsForMeal(selLabel, 5);
    const tot = calcTotal();
    const autoCount = items.filter((it) => it.auto).length;
    overlay.innerHTML = `
      <div class="fuel-edit-sheet">
        <div class="fuel-edit-topbar">
          <button class="fuel-edit-cancel" id="fed-cancel">Cancel</button>
          <span class="fuel-edit-title">Review meal</span>
          <button class="fuel-edit-save" id="fed-save">Save</button>
        </div>
        <div class="fuel-edit-scroll">
          <div class="fuel-label-row">
            ${LABELS.map((l) => `<button class="fuel-label-pill${l === selLabel ? " selected" : ""}" data-lbl="${l}">${l[0].toUpperCase() + l.slice(1)}</button>`).join("")}
          </div>
          ${aiNotes ? `<div class="fuel-ai-note">💡 ${escapeHtml(aiNotes)}</div>` : ""}
          ${freqItems.length > 0 ? `<div class="fed-quick-section">
            <div class="fed-quick-label">Quick add · ${selLabel}</div>
            <div class="fed-quick-chips">
              ${freqItems.map((fi, qi) => `<button class="fed-quick-chip" data-qi="${qi}">${escapeHtml(fi.name)}<span class="fed-quick-sub">${fi.kcal} kcal</span></button>`).join("")}
            </div>
          </div>` : ""}
          <div id="fed-items">
            ${items.map((it, i) => fuelItemRow(it, i)).join("")}
          </div>
          ${autoCount > 0 ? `<button class="fed-estimate-btn" id="fed-estimate">✨ Estimate nutrition for ${autoCount} item${autoCount > 1 ? "s" : ""}</button>` : ""}
          <button class="fuel-add-item" id="fed-add">+ Add item</button>
          <div class="fuel-edit-total">
            <div class="fuel-edit-total-row">
              <span>Total${autoCount > 0 ? `<span class="fed-total-note"> (${autoCount} pending)</span>` : ""}</span>
              <span id="fed-total-kcal" class="fuel-edit-total-kcal">${Math.round(tot.kcal)} kcal</span>
            </div>
            <div id="fed-total-macros" class="fuel-edit-total-macros">${Math.round(tot.p)}g P · ${Math.round(tot.c)}g C · ${Math.round(tot.f)}g F</div>
          </div>
        </div>
      </div>`;
    bindSheet(freqItems);
  };

  const syncDomToItems = () => {
    overlay.querySelectorAll(".fed-field").forEach((inp) => {
      const i = Number(inp.dataset.i);
      if (i < items.length) items[i][inp.dataset.f] = inp.type === "number" ? (Number(inp.value) || 0) : inp.value;
    });
    // Sync qty fields separately (they are not .fed-field to avoid recalc conflicts)
    overlay.querySelectorAll(".fed-qtynum").forEach((inp) => {
      const i = Number(inp.dataset.i);
      if (i < items.length) items[i].qtyNum = Number(inp.value) || 0;
    });
    overlay.querySelectorAll(".fed-unit").forEach((inp) => {
      const i = Number(inp.dataset.i);
      if (i < items.length) items[i].unit = inp.value.trim() || "g";
    });
  };

  const updateTotals = () => {
    const tot = calcTotal();
    const kcalEl = overlay.querySelector("#fed-total-kcal");
    const macEl  = overlay.querySelector("#fed-total-macros");
    if (kcalEl) kcalEl.textContent = Math.round(tot.kcal) + " kcal";
    if (macEl)  macEl.textContent  = `${Math.round(tot.p)}g P · ${Math.round(tot.c)}g C · ${Math.round(tot.f)}g F`;
  };

  const bindSheet = (freqItems = []) => {
    overlay.querySelectorAll(".fuel-label-pill").forEach((b) => b.addEventListener("click", () => { selLabel = b.dataset.lbl; renderSheet(); }));

    overlay.querySelectorAll(".fed-field").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.dataset.i);
        const f = inp.dataset.f;
        items[i][f] = inp.type === "number" ? (Number(inp.value) || 0) : inp.value;
        updateTotals();
      });
    });

    // qtyNum: auto-recalc macros from food DB when quantity changes
    overlay.querySelectorAll(".fed-qtynum").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.dataset.i);
        items[i].qtyNum = Number(inp.value) || 0;
        const newQty = items[i].qtyNum;
        if (newQty > 0 && items[i].name) {
          const dbEntry = lookupFood(items[i].name);
          const itemUnit = (items[i].unit || "g").toLowerCase().trim();
          if (dbEntry && (dbEntry.unit || "g").toLowerCase().trim() === itemUnit && dbEntry.qtyNum > 0) {
            items[i].kcal = Math.round(dbEntry.kcal * newQty / dbEntry.qtyNum);
            items[i].p    = Math.round(dbEntry.p    * newQty / dbEntry.qtyNum * 10) / 10;
            items[i].c    = Math.round(dbEntry.c    * newQty / dbEntry.qtyNum * 10) / 10;
            items[i].f    = Math.round(dbEntry.f    * newQty / dbEntry.qtyNum * 10) / 10;
            if (!items[i].auto) {
              const fedItem = inp.closest(".fed-item");
              if (fedItem) {
                ["kcal","p","c","f"].forEach((f) => {
                  const el = fedItem.querySelector(`.fed-num[data-f="${f}"]`);
                  if (el) el.value = items[i][f];
                });
              }
            }
          }
        }
        updateTotals();
      });
    });

    // unit: just sync
    overlay.querySelectorAll(".fed-unit").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.dataset.i);
        items[i].unit = inp.value.trim() || "g";
      });
    });

    // Name blur: auto-fill from food DB if fields empty
    overlay.querySelectorAll(".fed-name").forEach((inp) => {
      inp.addEventListener("blur", () => {
        const i = Number(inp.dataset.i);
        const name = inp.value.trim();
        if (!name) return;
        items[i].name = name;
        if (items[i].qtyNum === 0 && items[i].kcal === 0) {
          const dbEntry = lookupFood(name);
          if (dbEntry) {
            items[i].qtyNum = dbEntry.qtyNum;
            items[i].unit   = dbEntry.unit || "g";
            items[i].kcal   = dbEntry.kcal;
            items[i].p      = dbEntry.p;
            items[i].c      = dbEntry.c;
            items[i].f      = dbEntry.f;
            const fedItem = inp.closest(".fed-item");
            if (fedItem) {
              const qtyEl  = fedItem.querySelector(".fed-qtynum");
              const unitEl = fedItem.querySelector(".fed-unit");
              if (qtyEl)  qtyEl.value  = items[i].qtyNum;
              if (unitEl) unitEl.value = items[i].unit;
              if (!items[i].auto) {
                ["kcal","p","c","f"].forEach((f) => {
                  const el = fedItem.querySelector(`.fed-num[data-f="${f}"]`);
                  if (el) el.value = items[i][f];
                });
              }
            }
            updateTotals();
          }
        }
      });
    });

    // Frequent items chips
    overlay.querySelectorAll(".fed-quick-chip").forEach((btn) => {
      btn.addEventListener("click", () => {
        syncDomToItems();
        const fi = freqItems[Number(btn.dataset.qi)];
        if (!fi) return;
        const parsed = parseQtyString(fi.qty || "");
        items.push({
          name:   fi.name,
          qtyNum: fi.qtyNum != null ? fi.qtyNum : parsed.qtyNum,
          unit:   fi.unit   != null ? fi.unit   : parsed.unit,
          kcal: fi.kcal || 0, p: fi.p || 0, c: fi.c || 0, f: fi.f || 0,
          auto: false
        });
        renderSheet();
      });
    });

    overlay.querySelectorAll(".fed-del").forEach((b) => b.addEventListener("click", () => {
      syncDomToItems();
      items.splice(Number(b.dataset.i), 1);
      renderSheet();
    }));

    // Auto-estimate toggle per item
    overlay.querySelectorAll(".fed-auto-btn").forEach((b) => b.addEventListener("click", () => {
      syncDomToItems();
      const i = Number(b.dataset.autoI);
      items[i].auto = !items[i].auto;
      // If turning auto OFF, keep existing values (may be 0 — user can fill them)
      renderSheet();
    }));

    // Batch Gemini estimate for all auto-flagged items
    overlay.querySelector("#fed-estimate")?.addEventListener("click", async () => {
      syncDomToItems();
      const autoItems = items.filter((it) => it.auto && it.name.trim());
      if (!autoItems.length) {
        showGeminiError("Add a name to the items you want estimated, then tap Estimate.");
        return;
      }
      const btn = overlay.querySelector("#fed-estimate");
      btn.disabled = true;
      btn.textContent = "Estimating…";
      try {
        const results = await estimateItemNutrition(autoItems);
        // Map results back by order (same order as autoItems filter)
        let rIdx = 0;
        for (let i = 0; i < items.length; i++) {
          if (items[i].auto && items[i].name.trim()) {
            const r = results[rIdx++];
            if (r) {
              items[i].kcal = Math.round(r.kcal || 0);
              items[i].p    = Math.round((r.p    || 0) * 10) / 10;
              items[i].c    = Math.round((r.c    || 0) * 10) / 10;
              items[i].f    = Math.round((r.f    || 0) * 10) / 10;
              items[i].auto = false; // estimated — now fully editable
            }
          }
        }
        renderSheet();
      } catch (err) {
        btn.disabled = false;
        const ac = items.filter((it) => it.auto).length;
        btn.textContent = `✨ Estimate nutrition for ${ac} item${ac > 1 ? "s" : ""}`;
        showGeminiError(err.message);
      }
    });

    overlay.querySelector("#fed-add")?.addEventListener("click", () => {
      syncDomToItems();
      items.push({ name: "", qtyNum: 0, unit: "g", kcal: 0, p: 0, c: 0, f: 0, auto: false });
      renderSheet();
      const names = overlay.querySelectorAll(".fed-name");
      if (names.length) names[names.length - 1].focus();
    });

    overlay.querySelector("#fed-cancel")?.addEventListener("click", close);

    overlay.querySelector("#fed-save")?.addEventListener("click", () => {
      syncDomToItems();
      // Drop items still pending estimation (auto=true) — they have no meaningful values
      const valid = items.filter((it) => !it.auto && (it.name || it.kcal > 0));
      if (!valid.length) { close(); return; }
      const tot = valid.reduce((a, it) => ({ kcal: a.kcal + it.kcal, p: a.p + it.p, c: a.c + it.c, f: a.f + it.f }), { kcal: 0, p: 0, c: 0, f: 0 });
      const now2 = new Date();
      // Update food database with latest values for each named item
      valid.forEach((it) => {
        if (it.name && (it.qtyNum > 0 || it.kcal > 0)) {
          updateFoodEntry(it.name, it.qtyNum || 0, it.unit || "g", it.kcal, it.p, it.c, it.f);
        }
      });
      if (editMeal) deleteMeal(editMeal.id, targetDateStr);
      saveMeal({
        id: editMeal ? editMeal.id : makeMealId(),
        label: selLabel,
        time: editMeal ? editMeal.time : `${String(now2.getHours()).padStart(2, "0")}:${String(now2.getMinutes()).padStart(2, "0")}`,
        items: valid,
        total: { kcal: Math.round(tot.kcal), p: Math.round(tot.p * 10) / 10, c: Math.round(tot.c * 10) / 10, f: Math.round(tot.f * 10) / 10 },
        source: source || "manual",
        photo: photoThumb || (editMeal && editMeal.photo) || null,
      }, targetDateStr);
      _pendingPhoto = null; // photo safely stored — clear pending
      close();
      const rn = getRoute().name;
      if (rn === "fuel" || rn === "today") route();
    });
  };

  renderSheet();
}

/* ---------- Fitness import confirmation sheet ---------- */

function showFitnessImportSheet({ date, type, duration, kcal, hr, hrMax, distance }) {
  const mapped   = mapAppleWorkout(type);
  const vpParts  = date.split("-").map(Number);
  const dateObj  = new Date(vpParts[0], vpParts[1] - 1, vpParts[2]);
  const todayDs  = ymd(today());
  const dateLabel = date === todayDs
    ? "Today"
    : dateObj.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  const overlay = document.createElement("div");
  overlay.className = "fuel-edit-overlay";
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  const close = (save) => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 280);
    if (save) {
      saveFitnessWorkout({
        id:         makeWorkoutId(),
        type:       mapped.focus,
        appleType:  type,
        label:      mapped.label,
        icon:       mapped.icon,
        duration,
        kcal:       kcal || 0,
        hr:         hr || 0,
        hrMax:      hrMax || 0,
        distance:   distance > 0 ? distance : null,
        source:     "shortcuts",
        importedAt: new Date().toISOString()
      }, date);
      // Switch to fitness tab so the user sees the result
      dayTab = "fitness";
    }
  };

  overlay.innerHTML = `
    <div class="fuel-edit-sheet">
      <div class="fuel-edit-topbar">
        <button class="fuel-edit-cancel" id="fi-cancel">Cancel</button>
        <span class="fuel-edit-title">Save workout?</span>
        <button class="fuel-edit-save" id="fi-save">Save</button>
      </div>
      <div class="fuel-edit-scroll" style="padding:24px 20px">
        <div class="fi-import-preview">
          <div class="fi-import-icon">${mapped.icon}</div>
          <div>
            <div class="fi-import-label">${escapeHtml(mapped.label)}</div>
            <div class="fi-import-date">${escapeHtml(dateLabel)} · Apple Watch</div>
          </div>
        </div>
        <div class="fi-import-stats">
          ${duration ? `<div class="fi-import-stat"><div class="fi-is-val">${duration}</div><div class="fi-is-lbl">min</div></div>` : ""}
          ${kcal     ? `<div class="fi-import-stat"><div class="fi-is-val">${kcal.toLocaleString()}</div><div class="fi-is-lbl">kcal</div></div>` : ""}
          ${hr       ? `<div class="fi-import-stat"><div class="fi-is-val">${hr}</div><div class="fi-is-lbl">avg bpm</div></div>` : ""}
          ${hrMax    ? `<div class="fi-import-stat"><div class="fi-is-val">${hrMax}</div><div class="fi-is-lbl">max bpm</div></div>` : ""}
          ${distance ? `<div class="fi-import-stat"><div class="fi-is-val">${distance.toFixed(1)}</div><div class="fi-is-lbl">km</div></div>` : ""}
        </div>
      </div>
    </div>`;

  overlay.querySelector("#fi-cancel").addEventListener("click", () => close(false));
  overlay.querySelector("#fi-save").addEventListener("click", () => close(true));
  overlay.addEventListener("click", (e) => { if (e.target === overlay) close(false); });
}

function fuelItemRow(it, i) {
  const qtyNum = it.qtyNum != null ? it.qtyNum : "";
  const unit   = it.unit   != null ? it.unit   : "g";
  return `<div class="fed-item${it.auto ? " fed-item-auto" : ""}">
    <div class="fed-item-top">
      <input class="fed-field fed-name" data-i="${i}" data-f="name" type="text" value="${escapeHtml(it.name)}" placeholder="Food name" />
      <div class="fed-qty-wrap">
        <input class="fed-qtynum" data-i="${i}" type="number" inputmode="decimal" value="${qtyNum}" placeholder="0" />
        <input class="fed-unit" data-i="${i}" type="text" value="${escapeHtml(unit)}" placeholder="g" />
      </div>
      <button class="fed-auto-btn${it.auto ? " fed-auto-on" : ""}" data-auto-i="${i}" title="${it.auto ? "Manual entry" : "Auto-estimate with AI"}">✨</button>
      <button class="fed-del" data-i="${i}" aria-label="Remove">×</button>
    </div>
    ${it.auto
      ? `<div class="fed-auto-pending">AI will estimate kcal &amp; macros ✦ tap ✨ to enter manually</div>`
      : `<div class="fed-item-nums">
          <div class="fed-num-col"><label>kcal</label><input class="fed-field fed-num" data-i="${i}" data-f="kcal" type="number" inputmode="decimal" value="${it.kcal}" /></div>
          <div class="fed-num-col"><label>P (g)</label><input class="fed-field fed-num" data-i="${i}" data-f="p" type="number" inputmode="decimal" value="${it.p}" /></div>
          <div class="fed-num-col"><label>C (g)</label><input class="fed-field fed-num" data-i="${i}" data-f="c" type="number" inputmode="decimal" value="${it.c}" /></div>
          <div class="fed-num-col"><label>F (g)</label><input class="fed-field fed-num" data-i="${i}" data-f="f" type="number" inputmode="decimal" value="${it.f}" /></div>
        </div>`
    }
  </div>`;
}

ROUTES.progress = renderProgress;
async function renderProgress(app) {
  const settings = getSettings();
  const progress = getProgress();
  const tests = getTests();

  // Gather RPE data
  const rpeData = Object.entries(progress.sessions || {})
    .filter(([, v]) => v && v.rpe && v.completedAt)
    .map(([key, v]) => ({ key, rpe: v.rpe, date: new Date(v.completedAt) }))
    .sort((a, b) => a.date - b.date);

  let html = `
    <h1 class="large-title">Progress</h1>
    <div class="large-title-sub">${rpeData.length} RPE entries · ${tests.items.length} test${tests.items.length !== 1 ? "s" : ""}</div>

    ${renderRaceProjectorHtml(settings)}

    <div class="list" style="margin-bottom:16px">
      <a href="#/history" class="list-row">
        <div class="list-row-main"><div class="list-row-title">Session History</div><div class="list-row-sub">All completed workouts &amp; logs</div></div>
        <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </a>
      <a href="#/racesim" class="list-row">
        <div class="list-row-main"><div class="list-row-title">Race Simulator</div><div class="list-row-sub">Full Hyrox race with live splits</div></div>
        <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </a>
    </div>

    <div class="section-header">Session effort (RPE)</div>
  `;

  if (rpeData.length === 0) {
    html += `<div class="empty-state"><h3>No RPE data yet</h3><p>Mark sessions done and rate the effort — the chart builds here.</p></div>`;
  } else {
    html += `<div class="progress-chart-wrap"><canvas id="rpe-chart" height="140"></canvas></div>`;
  }

  // 1RM benchmarks
  const hasLifts = Object.values(settings.lifts).some((v) => v != null);
  if (hasLifts) {
    html += `<div class="section-header">Strength benchmarks</div>
      <div class="list">
        ${Object.entries(settings.lifts).filter(([, v]) => v != null).map(([k, v]) => `
          <div class="list-row" style="cursor:default">
            <div class="list-row-main"><div class="list-row-title">${REF_LABELS[k] || k}</div></div>
            <div class="list-row-trailing accent">${v} kg</div>
          </div>`).join("")}
      </div>`;
  }

  // Running paces
  const hasPaces = Object.values(settings.running).some((v) => v != null);
  if (hasPaces) {
    html += `<div class="section-header">Running paces</div>
      <div class="list">
        ${Object.entries(settings.running).filter(([, v]) => v != null).map(([k, v]) => `
          <div class="list-row" style="cursor:default">
            <div class="list-row-main"><div class="list-row-title">${REF_LABELS[k] || k}</div></div>
            <div class="list-row-trailing accent">${formatSecToPace(v)}/km</div>
          </div>`).join("")}
      </div>`;
  }

  // Test history
  if (tests.items.length > 0) {
    html += `<div class="section-header">Test history</div>
      <div class="list">
        ${tests.items.slice().reverse().map((t) => `
          <a href="#/tests" class="list-row">
            <div class="list-row-main">
              <div class="list-row-title">${escapeHtml(t.summary || "Test")}</div>
              <div class="list-row-sub">W${t.week || "?"} · ${escapeHtml(t.date)}</div>
            </div>
            <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          </a>`).join("")}
      </div>`;
  }

  app.innerHTML = html;

  if (rpeData.length > 0) {
    requestAnimationFrame(() => {
      const canvas = document.getElementById("rpe-chart");
      if (canvas) {
        canvas.width = canvas.parentElement.clientWidth - 2;
        drawRpeChart(canvas, rpeData);
      }
    });
  }
}

function drawRpeChart(canvas, data) {
  const ctx = canvas.getContext("2d");
  const W = canvas.width;
  const H = canvas.height;
  const PAD = { top: 12, right: 12, bottom: 28, left: 28 };
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  ctx.clearRect(0, 0, W, H);

  // Grid
  for (let i = 2; i <= 10; i += 2) {
    const y = PAD.top + ph - (i / 10) * ph;
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(W - PAD.right, y);
    ctx.stroke();
    ctx.fillStyle = "rgba(235,235,245,0.3)";
    ctx.font = "10px -apple-system, system-ui";
    ctx.textAlign = "right";
    ctx.fillText(i, PAD.left - 5, y + 4);
  }

  if (data.length === 1) {
    const x = PAD.left + pw / 2;
    const y = PAD.top + ph - (data[0].rpe / 10) * ph;
    ctx.beginPath();
    ctx.arc(x, y, 5, 0, Math.PI * 2);
    ctx.fillStyle = "#ff9500";
    ctx.fill();
    return;
  }

  const xOf = (i) => PAD.left + (i / (data.length - 1)) * pw;
  const yOf = (rpe) => PAD.top + ph - (rpe / 10) * ph;

  // Area
  ctx.beginPath();
  data.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(d.rpe)) : ctx.lineTo(xOf(i), yOf(d.rpe)); });
  ctx.lineTo(xOf(data.length - 1), PAD.top + ph);
  ctx.lineTo(PAD.left, PAD.top + ph);
  ctx.closePath();
  ctx.fillStyle = "rgba(255,149,0,0.1)";
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.strokeStyle = "rgba(255,149,0,0.9)";
  ctx.lineWidth = 2;
  ctx.lineJoin = "round";
  data.forEach((d, i) => { i === 0 ? ctx.moveTo(xOf(i), yOf(d.rpe)) : ctx.lineTo(xOf(i), yOf(d.rpe)); });
  ctx.stroke();

  // Dots
  data.forEach((d, i) => {
    ctx.beginPath();
    ctx.arc(xOf(i), yOf(d.rpe), 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ff9500";
    ctx.fill();
  });

  // X-axis date labels for first and last
  ctx.fillStyle = "rgba(235,235,245,0.3)";
  ctx.font = "10px -apple-system, system-ui";
  ctx.textAlign = "left";
  const fmt = (d) => d.date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  ctx.fillText(fmt(data[0]), PAD.left, H - 4);
  ctx.textAlign = "right";
  ctx.fillText(fmt(data[data.length - 1]), W - PAD.right, H - 4);
}

ROUTES.session = renderSession;
async function renderSession(app, params) {
  const weekNum = Number(params[0]);
  const sessionId = params[1];
  const week = PLAN.weeks.find((w) => w.number === weekNum);
  if (!week) { app.innerHTML = "Not found"; return; }
  const session = week.sessions.find((s) => s.id === sessionId);
  if (!session) { app.innerHTML = "Not found"; return; }

  app.innerHTML = `
    <div style="margin-bottom:12px">
      <a href="#/week/${weekNum}" class="muted" style="text-decoration:none">← Week ${weekNum}</a>
    </div>
  ` + renderSessionCard(session, weekNum, true);

  attachSessionHandlers(weekNum);

  // Show readiness check once per day if session not already done
  if (!getTodayReadiness() && !isSessionDone(weekNum, sessionId)) {
    setTimeout(() => showReadinessCheck(() => {}), 500);
  }
}

async function renderPlan(app) {
  const settings = getSettings();
  const curWeek = getWeekIndex(settings);
  const days = daysBetween(today(), parseDate(settings.raceDate));

  let html = `
    <h1 class="large-title">Plan</h1>
    <div class="large-title-sub">${PLAN.metadata.lastPB ? escapeHtml(PLAN.metadata.lastPB.total) + " → " + escapeHtml(PLAN.metadata.raceTarget || "") : ""}</div>

    <div class="countdown-big">
      <div class="num">${days}</div>
      <div class="label">days to race · ${escapeHtml(PLAN.metadata.raceDate)}</div>
    </div>

    ${renderRaceProjectorHtml(settings)}
  `;

  for (const phase of PLAN.phases) {
    const isCurrent = phase.weeks.includes(curWeek);
    html += `<div class="phase ${isCurrent ? "current" : ""}">
      <div class="phase-name">${escapeHtml(phase.name)}</div>
      <div class="phase-meta">Weeks ${phase.weeks[0]}–${phase.weeks[phase.weeks.length - 1]} · ${escapeHtml(phase.focus || "")}</div>
      <div class="phase-weeks">${phase.weeks.map((wn) => {
        const w = PLAN.weeks.find((ww) => ww.number === wn);
        const isTest = w && w.test;
        const isCur = wn === curWeek;
        const isDone = wn < curWeek;
        return `<a href="#/week/${wn}" class="phase-week-pip ${isTest ? "test" : ""} ${isCur ? "current" : ""} ${isDone ? "done" : ""}">${wn}${isTest ? "·T" : ""}</a>`;
      }).join("")}</div>
    </div>`;
  }

  if (PLAN.metadata.trainingFocus) {
    html += `<div class="section-header">Focus areas</div>
      <div class="list">
        ${PLAN.metadata.trainingFocus.map((f) => `<div class="prep-row">${escapeHtml(f)}</div>`).join("")}
      </div>`;
  }

  app.innerHTML = html;
}

/* ---------- Smart test → settings ---------- */

function suggestFromTest(notesText) {
  const suggestions = {};
  const text = notesText || "";

  // Parse 3RM lifts → calculate 1RM (× 1.08)
  const liftPatterns = [
    { key: "backSquat1RM", re: /back\s*squat\s*3rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
    { key: "frontSquat1RM", re: /front\s*squat\s*3rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
    { key: "deadlift1RM", re: /deadlift\s*3rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
    { key: "bench1RM", re: /bench\s*(?:press)?\s*3rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
    { key: "ohp1RM", re: /(?:ohp|overhead\s*press)\s*3rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
  ];
  liftPatterns.forEach(({ key, re }) => {
    const m = text.match(re);
    if (m) suggestions[key] = { val: Math.round(parseFloat(m[1]) * 1.08), label: REF_LABELS[key], unit: "kg", note: "from 3RM × 1.08" };
  });

  // Parse 1RM lifts directly
  const rm1Patterns = [
    { key: "backSquat1RM", re: /back\s*squat\s*1rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
    { key: "deadlift1RM", re: /deadlift\s*1rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
    { key: "bench1RM", re: /bench\s*(?:press)?\s*1rm[:\s]+(\d+(?:\.\d+)?)\s*kg/i },
  ];
  rm1Patterns.forEach(({ key, re }) => {
    if (!suggestions[key]) {
      const m = text.match(re);
      if (m) suggestions[key] = { val: parseFloat(m[1]), label: REF_LABELS[key], unit: "kg" };
    }
  });

  // Parse 5K time → pace per km
  const fiveK = text.match(/5k\s*(?:time|run)?[:\s]+(\d+):(\d{2})/i);
  if (fiveK) {
    const totalSec = parseInt(fiveK[1]) * 60 + parseInt(fiveK[2]);
    const secPerKm = Math.round(totalSec / 5);
    suggestions.race5KSecPerKm = { val: secPerKm, label: REF_LABELS.race5KSecPerKm, unit: "/km", formatted: formatSecToPace(secPerKm) };
  }

  // Parse row 2K split
  const row = text.match(/(?:2k\s*)?row(?:ing)?\s*(?:2k\s*)?split?[:\s]+(\d+):(\d{2})/i);
  if (row) {
    suggestions.row2KSplit = { val: parseInt(row[1]) * 60 + parseInt(row[2]), label: REF_LABELS.row2KSplit, unit: "/500m", formatted: `${row[1]}:${row[2]}` };
  }

  // Parse ski 1K split
  const ski = text.match(/ski\s*(?:erg)?\s*(?:1k\s*)?split?[:\s]+(\d+):(\d{2})/i);
  if (ski) {
    suggestions.ski1KSplit = { val: parseInt(ski[1]) * 60 + parseInt(ski[2]), label: REF_LABELS.ski1KSplit, unit: "/500m", formatted: `${ski[1]}:${ski[2]}` };
  }

  return suggestions;
}

function showSettingsSuggestions(suggestions) {
  const keys = Object.keys(suggestions);
  if (!keys.length) return;

  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">
        Update settings from test?
        <div class="action-sheet-title-sub">Found ${keys.length} value${keys.length !== 1 ? "s" : ""} in your notes</div>
      </div>
      <div class="action-sheet-group">
        ${keys.map((k) => {
          const s = suggestions[k];
          const display = s.formatted || (s.val + " " + s.unit);
          return `<div class="action-sheet-btn" style="cursor:default;justify-content:space-between">
            <span>${s.label}</span>
            <span class="action-sheet-sub" style="color:var(--accent)">${display}${s.note ? ` · ${s.note}` : ""}</span>
          </div>`;
        }).join("")}
      </div>
      <div style="padding:0 10px 10px;display:flex;gap:10px;margin-top:10px">
        <button class="btn btn-secondary" data-cancel="1" style="flex:1">Skip</button>
        <button class="btn" id="apply-suggestions" style="flex:1">Apply all</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  sheet.querySelector("[data-cancel]").addEventListener("click", () => { close(); route(); });

  document.getElementById("apply-suggestions").addEventListener("click", () => {
    const s = getSettings();
    const liftKeys = ["backSquat1RM","frontSquat1RM","deadlift1RM","bench1RM","ohp1RM","pushPress1RM","clean1RM","snatch1RM"];
    const runKeys = ["easyPaceSecPerKm","thresholdPaceSecPerKm","race5KSecPerKm","raceHyroxTargetSecPerKm"];
    const ergKeys = ["row2KSplit","ski1KSplit"];
    keys.forEach((k) => {
      if (liftKeys.includes(k)) s.lifts[k] = suggestions[k].val;
      else if (runKeys.includes(k)) s.running[k] = suggestions[k].val;
      else if (ergKeys.includes(k)) s.ergs[k] = suggestions[k].val;
    });
    saveJSON(SETTINGS_KEY, s);
    close();
    setTimeout(route, 220);
  });
}

async function renderTests(app) {
  const tests = getTests();
  let html = `
    <h1 class="large-title">Tests</h1>
    <div class="large-title-sub">Log every 4-week benchmark. Copy for Claude to refresh your plan.</div>

    <form id="test-form">
      <div class="section-header">New test</div>
      <div class="list">
        <div class="form-row">
          <label class="form-label">Date</label>
          <input class="form-input" type="date" name="date" value="${ymd(today())}" />
        </div>
        <div class="form-row">
          <label class="form-label">Week #</label>
          <input class="form-input" type="number" name="week" value="${getWeekIndex(getSettings())}" />
        </div>
        <div class="form-row">
          <label class="form-label">Summary</label>
          <input class="form-input" type="text" name="summary" placeholder="e.g. Half Hyrox 36:42" style="text-align:right" />
        </div>
        <div class="form-row" style="flex-direction:column;align-items:stretch;gap:8px">
          <label class="form-label" style="min-width:0">Detailed notes</label>
          <textarea class="form-input" name="notes" placeholder="Splits, RPE, what felt good, what didn't"></textarea>
        </div>
      </div>
      <button type="submit" class="btn" style="margin-top:12px">Save test</button>
    </form>

    <div class="section-header">History</div>
  `;

  if (!tests.items.length) {
    html += `<div class="empty-state">
      <h3>No tests yet</h3>
      <p>First test is in Week 4.</p>
    </div>`;
  } else {
    html += `<div class="list">`;
    for (const t of tests.items.slice().reverse()) {
      html += `<div class="list-row" style="flex-direction:column;align-items:stretch;gap:6px;cursor:default">
        <div style="display:flex;justify-content:space-between;align-items:baseline;gap:12px">
          <div class="list-row-title">${escapeHtml(t.summary || "Test")}</div>
          <div class="list-row-sub">${escapeHtml(t.date)} · W${t.week || "?"}</div>
        </div>
        ${t.notes ? `<div style="font-size:13px;color:var(--text-3);white-space:pre-wrap;line-height:1.4">${escapeHtml(t.notes)}</div>` : ""}
        <div style="display:flex;gap:8px;margin-top:8px">
          <button data-copy="${escapeHtml(t.id)}" class="btn btn-tertiary" style="width:auto;flex:1">Copy for Claude</button>
          <button data-delete="${escapeHtml(t.id)}" class="btn btn-tertiary" style="width:auto;flex:1;color:var(--danger)">Delete</button>
        </div>
      </div>`;
    }
    html += `</div>`;
  }

  app.innerHTML = html;

  document.getElementById("test-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const notes = fd.get("notes") || "";
    const t = getTests();
    t.items.push({
      id: "t" + Date.now(),
      date: fd.get("date"),
      week: Number(fd.get("week")),
      summary: fd.get("summary"),
      notes: notes
    });
    saveJSON(TESTS_KEY, t);
    // Auto-suggest settings from test notes
    const suggestions = suggestFromTest(notes);
    if (Object.keys(suggestions).length > 0) {
      showSettingsSuggestions(suggestions);
    } else {
      route();
    }
  });

  document.querySelectorAll("[data-copy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = getTests().items.find((x) => x.id === btn.dataset.copy);
      if (!t) return;
      const text = `Hyrox test result — Week ${t.week} (${t.date})\n${t.summary}\n\n${t.notes || ""}`;
      navigator.clipboard.writeText(text).then(() => {
        const original = btn.textContent;
        btn.textContent = "Copied ✓";
        setTimeout(() => (btn.textContent = original), 1500);
      });
    });
  });

  document.querySelectorAll("[data-delete]").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!confirm("Delete this test?")) return;
      const t = getTests();
      t.items = t.items.filter((x) => x.id !== btn.dataset.delete);
      saveJSON(TESTS_KEY, t);
      route();
    });
  });
}

async function renderSettings(app, params) {
  const s = getSettings();
  const focusKey = params && params[0];
  const returnTo = sessionStorage.getItem("hyrox.returnTo");

  const numRow = (section, key, suffix = "") => {
    const val = s[section] && s[section][key] != null ? s[section][key] : "";
    return `<div class="form-row">
      <label class="form-label" for="setting-${escapeHtml(key)}">${REF_LABELS[key] || key}</label>
      <input id="setting-${escapeHtml(key)}" class="form-input" type="number" data-section="${section}" data-key="${key}" value="${val}" step="any" inputmode="decimal" placeholder="${suffix || "—"}" />
    </div>`;
  };

  const paceRow = (section, key, placeholder = "mm:ss") => {
    const val = s[section] && s[section][key] != null ? formatSecToPace(s[section][key]) : "";
    return `<div class="form-row">
      <label class="form-label" for="setting-${escapeHtml(key)}">${REF_LABELS[key] || key}</label>
      <input id="setting-${escapeHtml(key)}" class="form-input" type="text" data-section="${section}" data-key="${key}" data-pace="1" value="${val}" placeholder="${placeholder}" inputmode="numeric" />
    </div>`;
  };

  let html = `
    <h1 class="large-title">Settings</h1>
    <div class="large-title-sub">Stored on this device. Loads recalculate automatically.</div>

    ${focusKey ? `<div class="alert alert-info">
      <strong>Add ${escapeHtml(REF_LABELS[focusKey] || focusKey)}</strong>
      Enter the value, then tap <em>Save &amp; return to workout</em> below. Your training load will be calculated immediately.
    </div>` : ""}

    <div class="section-header">Race</div>
    <div class="list">
      <div class="form-row">
        <label class="form-label">Race date</label>
        <input class="form-input" type="date" data-meta="raceDate" value="${s.raceDate}" />
      </div>
      <div class="form-row">
        <label class="form-label">Plan start</label>
        <input class="form-input" type="date" data-meta="startDate" value="${s.startDate}" />
      </div>
      <div class="form-row">
        <label class="form-label">Rounding (kg)</label>
        <input class="form-input" type="number" data-meta="rounding" value="${s.rounding}" step="0.5" />
      </div>
    </div>

    <div class="section-header">Body</div>
    <div class="list">${numRow("body", "bodyWeight", "kg")}</div>

    <div class="section-header">Barbell 1RMs · kg</div>
    <div class="list">
      ${numRow("lifts", "backSquat1RM", "kg")}
      ${numRow("lifts", "frontSquat1RM", "kg")}
      ${numRow("lifts", "deadlift1RM", "kg")}
      ${numRow("lifts", "bench1RM", "kg")}
      ${numRow("lifts", "ohp1RM", "kg")}
      ${numRow("lifts", "pushPress1RM", "kg")}
      ${numRow("lifts", "clean1RM", "kg")}
      ${numRow("lifts", "snatch1RM", "kg")}
    </div>
    <div class="section-footer">Update these after test weeks. 3RM × 1.07 ≈ 1RM.</div>

    <div class="section-header">Hyrox station loads · kg</div>
    <div class="list">
      ${numRow("stations", "sledPushLoad")}
      ${numRow("stations", "sledPullLoad")}
      ${numRow("stations", "sandbagLoad")}
      ${numRow("stations", "wallBallLoad")}
      ${numRow("stations", "farmersLoad")}
      ${numRow("stations", "kbLungeLoad")}
    </div>
    <div class="section-footer">Defaults are Open Men (Hyrox Malaga 2026 standard).</div>

    <div class="section-header">Running paces · per km</div>
    <div class="list">
      ${paceRow("running", "easyPaceSecPerKm")}
      ${paceRow("running", "thresholdPaceSecPerKm")}
      ${paceRow("running", "race5KSecPerKm")}
      ${paceRow("running", "raceHyroxTargetSecPerKm")}
    </div>

    <div class="section-header">Erg splits · per 500m</div>
    <div class="list">
      ${paceRow("ergs", "row2KSplit")}
      ${paceRow("ergs", "ski1KSplit")}
    </div>

    <div class="section-header">Nutrition</div>
    <div class="list">
      <div class="form-row">
        <label class="form-label" for="setting-geminiKey">Gemini API key</label>
        <input id="setting-geminiKey" class="form-input" type="password" data-section="nutrition" data-key="geminiKey" data-string="1" value="${escapeHtml(s.nutrition?.geminiKey || "")}" placeholder="AIzaSy…" autocomplete="off" autocorrect="off" spellcheck="false" />
      </div>
      ${numRow("nutrition", "kcalTarget", "kcal")}
      ${numRow("nutrition", "proteinTarget", "g")}
      ${numRow("nutrition", "carbTarget", "g")}
      ${numRow("nutrition", "fatTarget", "g")}
    </div>
    <div class="section-footer">Get a free Gemini key at aistudio.google.com · Free tier: 1,500 photo analyses/day.</div>

    <div class="section-header">Meal targets · % of daily kcal</div>
    <div class="list">
      ${numRow("nutrition", "mealTargetBreakfast", "%")}
      ${numRow("nutrition", "mealTargetLunch", "%")}
      ${numRow("nutrition", "mealTargetDinner", "%")}
      ${numRow("nutrition", "mealTargetSnack", "%")}
    </div>
    <div class="section-footer">Should add up to 100 %. Targets appear as progress bars on each meal card.</div>

    <div style="margin-top:24px">
      <button id="save-settings" class="btn">${returnTo ? "Save & return to workout" : "Save changes"}</button>
      ${returnTo
        ? `<button id="save-stay" class="btn btn-secondary" style="margin-top:10px">Save and stay here</button>`
        : `<button id="reset-progress" class="btn btn-secondary" style="margin-top:10px">Reset week progress</button>`}
    </div>

    <div class="section-header">Notifications</div>
    <div class="list">
      <div class="form-row" style="cursor:pointer" id="notif-row">
        <div style="flex:1;min-width:0">
          <div class="form-label" style="max-width:none">Training reminders</div>
          <div style="font-size:13px;color:var(--text-3);margin-top:2px" id="notif-sub">
            ${!("Notification" in window) ? "Not supported on this device"
              : Notification.permission === "granted" ? "Tap to send a test notification"
              : "Tap to enable"}
          </div>
        </div>
        ${"Notification" in window ? `<div class="toggle-pill ${Notification.permission === "granted" ? "on" : ""}" id="notif-toggle"></div>` : ""}
      </div>
    </div>

    <div class="section-header">Data</div>
    <div class="list">
      <div class="list-row" style="cursor:default">
        <div class="list-row-main">
          <div class="list-row-title">Export backup</div>
          <div class="list-row-sub">Download all hyrox data as JSON</div>
        </div>
        <button class="btn btn-tertiary" style="width:auto;flex:none" id="export-data">Export</button>
      </div>
      <div class="list-row" style="cursor:default">
        <div class="list-row-main">
          <div class="list-row-title">Import backup</div>
          <div class="list-row-sub">Restore from a JSON file</div>
        </div>
        <button class="btn btn-tertiary" style="width:auto;flex:none;color:var(--info)" id="import-data-btn">Import</button>
        <input type="file" id="import-file" accept=".json" style="display:none" />
      </div>
      <div class="list-row" style="cursor:default">
        <div class="list-row-main">
          <div class="list-row-title" style="color:var(--danger)">Reset all data</div>
          <div class="list-row-sub">Clears progress, notes, logs (keeps settings)</div>
        </div>
        <button class="btn btn-tertiary" style="width:auto;flex:none;color:var(--danger)" id="reset-all-data">Reset</button>
      </div>
    </div>

    <div class="section-header">About</div>
    <div class="list">
      <div class="form-row">
        <span class="form-label">Plan version</span>
        <span class="form-input mono" style="text-align:right;color:var(--text-3)">${escapeHtml(PLAN.version)}</span>
      </div>
      <div class="form-row">
        <span class="form-label">Last PB</span>
        <span class="form-input mono" style="text-align:right;color:var(--text-3)">${PLAN.metadata.lastPB ? escapeHtml(PLAN.metadata.lastPB.total) : "—"}</span>
      </div>
      <div class="form-row">
        <span class="form-label">Target</span>
        <span class="form-input mono" style="text-align:right;color:var(--accent)">${escapeHtml(PLAN.metadata.raceTarget || "—")}</span>
      </div>
    </div>
  `;

  app.innerHTML = html;

  // Auto-scroll + focus the field we were sent to fill, with a brief flash.
  if (focusKey) {
    requestAnimationFrame(() => {
      const el = document.getElementById("setting-" + focusKey);
      if (!el) return;
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      const row = el.closest(".form-row");
      if (row) {
        row.classList.add("highlight-flash");
        setTimeout(() => row.classList.remove("highlight-flash"), 1800);
      }
      setTimeout(() => { try { el.focus(); el.select && el.select(); } catch (e) {} }, 350);
    });
  }

  function saveAll() {
    const next = getSettings();
    document.querySelectorAll("[data-section]").forEach((el) => {
      const section = el.dataset.section;
      const key = el.dataset.key;
      const raw = (el.value || "").trim();
      let val;
      if (el.dataset.pace) val = paceToSec(raw);
      else if (el.dataset.string) val = raw;
      else val = raw === "" ? null : Number(raw);
      if (!next[section]) next[section] = {};
      next[section][key] = val;
    });
    document.querySelectorAll("[data-meta]").forEach((el) => {
      const key = el.dataset.meta;
      next[key] = el.type === "number" ? Number(el.value) : el.value;
    });
    saveJSON(SETTINGS_KEY, next);
  }

  document.getElementById("save-settings").addEventListener("click", () => {
    saveAll();
    if (returnTo) {
      sessionStorage.removeItem("hyrox.returnTo");
      location.hash = returnTo;
    } else {
      flashSaved();
    }
  });

  const stayBtn = document.getElementById("save-stay");
  if (stayBtn) {
    stayBtn.addEventListener("click", () => {
      saveAll();
      sessionStorage.removeItem("hyrox.returnTo");
      // Re-render in non-return mode so the buttons reflect the new state
      navigate("settings");
    });
  }

  const resetBtn = document.getElementById("reset-progress");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      if (!confirm("Clear all session completion ticks? (Settings + tests preserved.)")) return;
      localStorage.removeItem(PROGRESS_KEY);
      route();
    });
  }

  // Notifications
  const notifRow = document.getElementById("notif-row");
  if (notifRow && "Notification" in window) {
    notifRow.addEventListener("click", async () => {
      if (Notification.permission === "granted") {
        new Notification("Hyrox Trainer 🏃", {
          body: "Notifications are on! You're all set.",
          icon: "icons/icon-192.png"
        });
      } else {
        const perm = await Notification.requestPermission();
        if (perm === "granted") {
          new Notification("Hyrox Trainer 🏃", {
            body: "Reminders enabled. Let's get after it. 💪",
            icon: "icons/icon-192.png"
          });
          navigate("settings");
        }
      }
    });
  }

  // Export data
  document.getElementById("export-data")?.addEventListener("click", () => {
    const data = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("hyrox.")) data[k] = localStorage.getItem(k);
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hyrox-backup-${ymd(today())}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  // Import data
  document.getElementById("import-data-btn")?.addEventListener("click", () => {
    document.getElementById("import-file")?.click();
  });

  document.getElementById("import-file")?.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      let count = 0;
      for (const [k, v] of Object.entries(data)) {
        if (k.startsWith("hyrox.")) { localStorage.setItem(k, v); count++; }
      }
      alert(`Restored ${count} data entries. Reloading…`);
      location.reload();
    } catch (err) {
      alert("Import failed: " + err.message);
    }
  });

  // Reset all training data
  document.getElementById("reset-all-data")?.addEventListener("click", () => {
    if (!confirm("Clear all progress, notes, and set logs? Settings and tests are kept.")) return;
    [PROGRESS_KEY, OVERRIDES_KEY, USER_BLOCKS_KEY, DAY_OVERRIDES_KEY, JOURNAL_KEY, SESSION_LOGS_KEY, ACTUALS_KEY].forEach((k) => localStorage.removeItem(k));
    route();
  });
}

function flashSaved() {
  const btn = document.getElementById("save-settings");
  if (!btn) return;
  const original = btn.textContent;
  btn.textContent = "Saved ✓";
  setTimeout(() => (btn.textContent = original), 1200);
}

function paceToSec(str) {
  if (!str) return null;
  const m = str.match(/^(\d+):(\d{1,2})$/);
  if (!m) {
    const n = Number(str);
    return isFinite(n) ? n : null;
  }
  return Number(m[1]) * 60 + Number(m[2]);
}

/* ---------- Session actuals sheet — per-round (v36) ---------- */

function ucFirst(str) {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function parseRoundTemplate(block, settings) {
  const scheme = block.scheme || "";

  // ── Round count ──────────────────────────────────────────────────
  let roundCount = 1;
  const roundsMatch = scheme.match(/^(\d+)\s*rounds?/i);
  if (roundsMatch) {
    roundCount = parseInt(roundsMatch[1], 10);
  } else {
    // "8 × 2 min", "4 × 6", "3x8"
    const setsMatch = scheme.match(/^(\d+)\s*[×x]/i);
    if (setsMatch) roundCount = parseInt(setsMatch[1], 10);
  }
  if (roundCount > 12) roundCount = 12;
  if (roundCount < 1)  roundCount = 1;

  // ── Exercises per round ──────────────────────────────────────────
  let exercises = [];
  if (Array.isArray(block.load)) {
    exercises = block.load.map((li) => ({
      label:   ucFirst(li.label || block.name),
      planned: li.type === "list"
        ? (li.items || []).join(" / ")
        : blockLoadText(li, settings)
    }));
  } else if (block.load && block.load.type === "list") {
    exercises = (block.load.items || []).map((item) => ({ label: item, planned: "" }));
    if (!exercises.length) exercises = [{ label: block.name, planned: "" }];
  } else {
    exercises = [{ label: block.name, planned: blockLoadText(block.load, settings) || scheme }];
  }

  // ── Rest ─────────────────────────────────────────────────────────
  let restPlanned = block.rest || "";
  if (!restPlanned) {
    const restMatch = scheme.match(/[·•]\s*(\d+\s*s)\s*rest/i);
    if (restMatch) restPlanned = restMatch[1];
  }

  return { roundCount, exercises, restPlanned };
}

function showSessionActualsSheet(weekNum, sessionId) {
  const week = PLAN && PLAN.weeks.find((w) => w.number === weekNum);
  const session = week && week.sessions.find((s) => s.id === sessionId);
  if (!session || !session.blocks || !session.blocks.length) return;

  const settings  = getSettings();
  const existing  = getSessionActuals(weekNum, sessionId);
  const existingIsNew = existing && existing[0] && Array.isArray(existing[0].rounds);

  // Build per-block state
  const blockStates = session.blocks.map((block, blockIdx) => {
    const tmpl      = parseRoundTemplate(block, settings);
    const savedBlock = existingIsNew && existing[blockIdx] ? existing[blockIdx] : null;

    const rounds = Array.from({ length: tmpl.roundCount }, (_, ri) => {
      const savedRound = savedBlock && savedBlock.rounds && savedBlock.rounds[ri];
      return {
        num: ri + 1,
        exercises: tmpl.exercises.map((ex, ei) => {
          const savedEx = savedRound && savedRound.exercises && savedRound.exercises[ei];
          return { label: ex.label, planned: ex.planned, actual: savedEx ? savedEx.actual : ex.planned };
        }),
        rest: {
          planned: tmpl.restPlanned,
          actual:  savedRound ? savedRound.rest.actual : tmpl.restPlanned
        }
      };
    });

    return {
      blockIdx,
      name:   block.name,
      scheme: block.scheme || "",
      note:   savedBlock ? (savedBlock.note || "") : "",
      rounds
    };
  });

  const overlay = document.createElement("div");
  overlay.className = "fuel-edit-overlay";
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add("open"));

  const close = () => {
    overlay.classList.remove("open");
    setTimeout(() => overlay.remove(), 280);
  };

  const syncDom = () => {
    overlay.querySelectorAll(".actl-ex-input").forEach((inp) => {
      const bi = Number(inp.dataset.bi), ri = Number(inp.dataset.ri), ei = Number(inp.dataset.ei);
      const round = blockStates[bi] && blockStates[bi].rounds[ri];
      if (round && round.exercises[ei]) round.exercises[ei].actual = inp.value;
    });
    overlay.querySelectorAll(".actl-rest-input").forEach((inp) => {
      const bi = Number(inp.dataset.bi), ri = Number(inp.dataset.ri);
      const round = blockStates[bi] && blockStates[bi].rounds[ri];
      if (round) round.rest.actual = inp.value;
    });
    overlay.querySelectorAll(".actl-note-input").forEach((inp) => {
      const bi = Number(inp.dataset.bi);
      if (blockStates[bi]) blockStates[bi].note = inp.value;
    });
  };

  const doSave = () => {
    syncDom();
    const toSave = blockStates.map((bs) => ({
      blockIdx: bs.blockIdx,
      name:     bs.name,
      note:     bs.note,
      rounds:   bs.rounds.map((r) => ({
        num:       r.num,
        exercises: r.exercises.map((ex) => ({ label: ex.label, planned: ex.planned, actual: ex.actual })),
        rest:      { planned: r.rest.planned, actual: r.rest.actual }
      }))
    }));
    saveSessionActuals(weekNum, sessionId, toSave);
    close();
    route();
  };

  const renderRound = (round, bi) => `
    <div class="actl-round">
      <div class="actl-round-label">Round ${round.num}</div>
      ${round.exercises.map((ex, ei) => `
        <div class="actl-ex-row">
          <span class="actl-ex-label">${escapeHtml(ex.label)}</span>
          <input class="actl-ex-input" data-bi="${bi}" data-ri="${round.num - 1}" data-ei="${ei}"
            type="text" value="${escapeHtml(ex.actual)}" placeholder="${escapeHtml(ex.planned) || "–"}" />
        </div>`).join("")}
      <div class="actl-ex-row actl-rest-row">
        <span class="actl-ex-label">Rest</span>
        <input class="actl-rest-input" data-bi="${bi}" data-ri="${round.num - 1}"
          type="text" value="${escapeHtml(round.rest.actual)}" placeholder="${escapeHtml(round.rest.planned) || "none"}" />
      </div>
    </div>`;

  const renderBlockCard = (bs) => {
    const { blockIdx: bi, name, scheme, note, rounds } = bs;
    return `
      <div class="actl-block" data-bi="${bi}">
        <div class="actl-block-header">
          <div class="actl-block-name">${escapeHtml(name)}</div>
          ${scheme ? `<div class="actl-block-scheme">${escapeHtml(scheme)}</div>` : ""}
        </div>
        ${rounds.map((r) => renderRound(r, bi)).join("")}
        ${rounds.length > 1 ? `<button class="actl-copy-btn" data-bi="${bi}">📋 Copy R1 to all rounds</button>` : ""}
        <div class="actl-ex-row actl-note-row">
          <span class="actl-ex-label">Note</span>
          <input class="actl-note-input" data-bi="${bi}" type="text"
            value="${escapeHtml(note)}" placeholder="e.g. felt strong, cut short…" />
        </div>
      </div>`;
  };

  const renderSheet = () => {
    const scrollTop = overlay.querySelector(".fuel-edit-scroll")?.scrollTop || 0;
    overlay.innerHTML = `
      <div class="fuel-edit-sheet">
        <div class="fuel-edit-topbar">
          <button class="fuel-edit-cancel" id="act-skip">Skip</button>
          <span class="fuel-edit-title">Session actuals</span>
          <button class="fuel-edit-save" id="act-save">Save</button>
        </div>
        <div class="fuel-edit-scroll">
          <div class="actual-intro">Log what you actually did — round by round.</div>
          ${blockStates.map(renderBlockCard).join("")}
        </div>
      </div>`;
    const scrollEl = overlay.querySelector(".fuel-edit-scroll");
    if (scrollEl && scrollTop) scrollEl.scrollTop = scrollTop;
    bindSheet();
  };

  const bindSheet = () => {
    overlay.querySelector("#act-skip")?.addEventListener("click", close);
    overlay.querySelector("#act-save")?.addEventListener("click", doSave);

    overlay.querySelectorAll(".actl-copy-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        syncDom();
        const bi = Number(btn.dataset.bi);
        const bs = blockStates[bi];
        const r0 = bs.rounds[0];
        bs.rounds.forEach((r, ri) => {
          if (ri === 0) return;
          r.exercises.forEach((ex, ei) => { ex.actual = r0.exercises[ei] ? r0.exercises[ei].actual : ex.planned; });
          r.rest.actual = r0.rest.actual;
        });
        renderSheet();
      });
    });
  };

  renderSheet();
}

/* ---------- RPE prompt ---------- */

function showRpePrompt(weekNum, sessionId) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">
        Session complete 🎉
        <div class="action-sheet-title-sub">Rate the effort (1 = very easy · 10 = max)</div>
      </div>
      <div class="action-sheet-group" style="padding:16px 16px 20px">
        <div class="rpe-grid">
          ${[1,2,3,4,5,6,7,8,9,10].map((n) => {
            const col = n <= 3 ? "var(--success)" : n <= 6 ? "var(--warn)" : "var(--danger)";
            return `<button class="rpe-btn" data-rpe="${n}" style="--rpe-color:${col}">${n}</button>`;
          }).join("")}
        </div>
      </div>
      <button class="action-sheet-btn action-sheet-cancel" data-cancel="1">Skip</button>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  const maybeShowActuals = () => {
    // Only auto-open actuals sheet the first time (no existing actuals yet)
    if (!getSessionActuals(weekNum, sessionId)) {
      setTimeout(() => showSessionActualsSheet(weekNum, sessionId), 320);
    }
  };

  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) { close(); return; }
    if (e.target.closest("[data-cancel]")) { close(); maybeShowActuals(); return; }
    const rpeBtn = e.target.closest("[data-rpe]");
    if (rpeBtn) {
      const rpe = Number(rpeBtn.dataset.rpe);
      const p = getProgress();
      const key = `W${weekNum}.${sessionId}`;
      if (!p.sessions[key]) p.sessions[key] = { completedAt: new Date().toISOString() };
      p.sessions[key].rpe = rpe;
      saveJSON(PROGRESS_KEY, p);
      close();
      maybeShowActuals();
    }
  });
}

/* ---------- Interval timer ---------- */

function parseIntervalScheme(scheme) {
  if (!scheme) return null;
  const m = scheme.match(/(\d+)\s*[x×]\s*(\d+(?:\.\d+)?)\s*(min|sec|s)\b/i);
  if (!m) return null;
  const reps = parseInt(m[1]);
  const duration = parseFloat(m[2]);
  const unit = m[3].toLowerCase();
  const workSec = unit.startsWith("min") ? duration * 60 : duration;

  // Parse rest period
  let restSec = 60;
  const restM = scheme.match(/[\/|]\s*(\d+(?:\.\d+)?)\s*(min|sec|s)\b/i)
             || scheme.match(/(\d+(?:\.\d+)?)\s*(min|sec|s)\s*(?:jog|rest|walk|rec)/i);
  if (restM) {
    const rv = parseFloat(restM[1]);
    const ru = restM[2].toLowerCase();
    restSec = ru.startsWith("min") ? rv * 60 : rv;
  }
  return { reps, workSec, restSec };
}

function beep(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === "start") { osc.frequency.value = 880; gain.gain.value = 0.35; }
    else if (type === "end") { osc.frequency.value = 440; gain.gain.value = 0.45; }
    else { osc.frequency.value = 660; gain.gain.value = 0.25; }
    osc.start();
    osc.stop(ctx.currentTime + (type === "end" ? 0.5 : 0.15));
  } catch {}
  try { if (navigator.vibrate) navigator.vibrate(type === "end" ? [80, 40, 80] : [40]); } catch {}
}

function showIntervalTimer(block, parsed) {
  let currentRep = 0;
  let isWork = true;
  let remaining = parsed.workSec;
  let paused = false;
  let mainTid = null;
  let countdownVal = 3;
  let inCountdown = true;
  let minimized = false;

  const overlay = document.createElement("div");
  overlay.className = "timer-overlay";
  document.body.appendChild(overlay);

  const pill = document.getElementById("timer-pill");

  function updatePill() {
    if (!pill) return;
    if (inCountdown || !minimized) { pill.hidden = true; return; }
    const mins = Math.floor(remaining / 60);
    const secs = Math.round(remaining % 60);
    const phase = isWork ? "WORK" : "REST";
    pill.innerHTML = `<span class="pill-phase">${phase}</span><span class="pill-time">${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}</span><span class="pill-rep">${currentRep+1}/${parsed.reps}</span>`;
    pill.className = isWork ? "pill-work" : "pill-rest";
    pill.hidden = false;
  }

  function renderOverlay() {
    if (inCountdown) {
      overlay.innerHTML = `
        <div class="timer-content">
          <button class="timer-close" id="timer-stop">✕</button>
          <div class="timer-phase timer-phase-rest" style="font-size:14px;letter-spacing:0.1em">GET READY</div>
          <div class="timer-countdown" style="color:var(--warn);font-size:110px">${countdownVal}</div>
          <div class="timer-name">${escapeHtml(block.name || "")}</div>
          <div class="timer-rep-info" style="color:var(--text-4)">${parsed.reps} × ${Math.round(parsed.workSec)}s / ${Math.round(parsed.restSec)}s rest</div>
        </div>`;
      document.getElementById("timer-stop").addEventListener("click", stop);
      return;
    }

    const mins = Math.floor(remaining / 60);
    const secs = Math.round(remaining % 60);
    const phase = isWork ? "WORK" : "REST";
    const phaseClass = isWork ? "timer-phase-work" : "timer-phase-rest";
    overlay.innerHTML = `
      <div class="timer-content">
        <button class="timer-minimize" id="timer-min">—</button>
        <button class="timer-close" id="timer-stop">✕</button>
        <div class="timer-phase ${phaseClass}">${phase}</div>
        <div class="timer-countdown">${String(mins).padStart(2,"0")}:${String(secs).padStart(2,"0")}</div>
        <div class="timer-rep-info">Set ${currentRep + 1} of ${parsed.reps}</div>
        <div class="timer-name">${escapeHtml(block.name || "")}</div>
        <div class="timer-row">
          <button class="timer-btn" id="timer-pause">${paused ? "▶ Resume" : "⏸ Pause"}</button>
        </div>
        <div class="timer-progress">
          ${Array.from({ length: parsed.reps }, (_, i) => `<div class="timer-pip ${i < currentRep ? "done" : i === currentRep ? "active" : ""}"></div>`).join("")}
        </div>
      </div>`;
    document.getElementById("timer-stop").addEventListener("click", stop);
    document.getElementById("timer-min").addEventListener("click", minimize);
    document.getElementById("timer-pause").addEventListener("click", () => { paused = !paused; renderOverlay(); });
  }

  function minimize() {
    minimized = true;
    overlay.classList.remove("open");
    updatePill();
  }

  function maximize() {
    minimized = false;
    overlay.classList.add("open");
    renderOverlay();
    if (pill) pill.hidden = true;
  }

  if (pill) pill.onclick = () => { if (minimized) maximize(); };

  function tick() {
    if (paused) return;
    remaining = Math.max(0, remaining - 1);
    if (remaining <= 3 && remaining > 0) beep("warn");
    if (remaining <= 0) {
      if (isWork) {
        if (currentRep >= parsed.reps - 1) {
          stop();
          setTimeout(() => alert(`All ${parsed.reps} reps done! 🔥`), 100);
          return;
        }
        isWork = false;
        remaining = parsed.restSec;
        beep("end");
      } else {
        currentRep++;
        isWork = true;
        remaining = parsed.workSec;
        beep("start");
      }
    }
    renderOverlay();
    updatePill();
  }

  function stop() {
    clearInterval(mainTid);
    overlay.classList.remove("open");
    if (pill) { pill.hidden = true; pill.onclick = null; }
    setTimeout(() => overlay.remove(), 300);
  }

  // 3-2-1 countdown
  requestAnimationFrame(() => overlay.classList.add("open"));
  renderOverlay();
  beep("warn");
  const cdTid = setInterval(() => {
    countdownVal--;
    if (countdownVal <= 0) {
      clearInterval(cdTid);
      inCountdown = false;
      remaining = parsed.workSec;
      beep("start");
      renderOverlay();
      mainTid = setInterval(tick, 1000);
    } else {
      renderOverlay();
    }
  }, 1000);
}

/* ---------- Auto-complete session prompt ---------- */

function showAutoCompletePrompt(weekNum, sessionId) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">
        All blocks done! 💪
        <div class="action-sheet-title-sub">Mark session complete and log your RPE?</div>
      </div>
      <div class="action-sheet-group">
        <button class="action-sheet-btn" style="color:var(--success)" id="autocomplete-yes">Yes — mark complete</button>
        <button class="action-sheet-btn" data-cancel="1">Not yet</button>
      </div>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));
  function close() { sheet.classList.remove("open"); setTimeout(() => sheet.remove(), 200); }
  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  document.getElementById("autocomplete-yes").addEventListener("click", () => {
    const wasDone = isSessionDone(weekNum, sessionId);
    if (!wasDone) toggleSessionDone(weekNum, sessionId);
    close();
    setTimeout(() => showRpePrompt(weekNum, sessionId), 300);
  });
}

/* ---------- Long-press block quick menu ---------- */

function attachLongPress(blockEl, weekNum) {
  let pressTimer = null;
  let startX = 0, startY = 0;

  const onStart = (e) => {
    startX = e.touches ? e.touches[0].clientX : e.clientX;
    startY = e.touches ? e.touches[0].clientY : e.clientY;
    pressTimer = setTimeout(() => {
      pressTimer = null;
      try { navigator.vibrate && navigator.vibrate(35); } catch {}
      showBlockQuickMenu(blockEl, weekNum);
    }, 450);
  };
  const onMove = (e) => {
    if (!pressTimer) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    if (Math.hypot(x - startX, y - startY) > 8) { clearTimeout(pressTimer); pressTimer = null; }
  };
  const onEnd = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };

  blockEl.addEventListener("touchstart", onStart, { passive: true });
  blockEl.addEventListener("touchmove", onMove, { passive: true });
  blockEl.addEventListener("touchend", onEnd);
  blockEl.addEventListener("mousedown", onStart);
  blockEl.addEventListener("mousemove", onMove);
  blockEl.addEventListener("mouseup", onEnd);
}

function showBlockQuickMenu(blockEl, weekNum) {
  const checkEl = blockEl.querySelector("[data-action='toggle-block']");
  const adjustEl = blockEl.querySelector("[data-adjust]");
  const logBtn = blockEl.querySelector("[data-action='log-set']");
  const timerBtn = blockEl.querySelector("[data-action='start-timer']");
  const isDone = blockEl.classList.contains("done");

  const items = [];
  if (checkEl) items.push({ label: isDone ? "✓ Mark not done" : "✓ Mark done", color: isDone ? "var(--text-3)" : "var(--success)", fn: () => checkEl.click() });
  if (adjustEl) items.push({ label: "⚖ Adjust weight", color: "var(--accent)", fn: () => adjustEl.click() });
  if (logBtn) items.push({ label: "📊 Log set", color: "var(--info)", fn: () => logBtn.click() });
  if (timerBtn) items.push({ label: "▶ Start timer", color: "var(--accent)", fn: () => timerBtn.click() });
  if (!items.length) return;

  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">Quick actions</div>
      <div class="action-sheet-group">
        ${items.map((it, i) => `<button class="action-sheet-btn" data-qi="${i}" style="color:${it.color}">${it.label}</button>`).join("")}
      </div>
      <button class="action-sheet-btn action-sheet-cancel" data-cancel="1">Cancel</button>
    </div>`;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));
  function close() { sheet.classList.remove("open"); setTimeout(() => sheet.remove(), 200); }
  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) { close(); return; }
    if (e.target.closest("[data-cancel]")) { close(); return; }
    const btn = e.target.closest("[data-qi]");
    if (btn) { close(); setTimeout(() => items[Number(btn.dataset.qi)].fn(), 220); }
  });
}

/* ---------- Set log sheet ---------- */

function showLogSetSheet(weekNum, sessionId, blockIdx, blockName, defaultKg) {
  // Smart default: use last logged kg for this exercise if available
  const smartKg = getLastLoggedKgForBlock(blockName) ?? defaultKg;
  defaultKg = smartKg;
  const existing = getBlockLogs(weekNum, sessionId, blockIdx);
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  const pillsHtml = existing.length > 0
    ? `<div class="set-log-pills">
        ${existing.map((l) => `<span class="set-log-pill">
          ${[l.kg != null ? l.kg + " kg" : null, l.reps != null ? "×" + l.reps : null, l.rpe != null ? "RPE " + l.rpe : null].filter(Boolean).join(" ")}
          <span class="set-log-pill-del" data-logid="${escapeHtml(l.id)}">×</span>
        </span>`).join("")}
      </div>`
    : "";

  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">
        Log set · ${escapeHtml(blockName)}
        ${existing.length > 0 ? `<div class="action-sheet-title-sub">${existing.length} set${existing.length !== 1 ? "s" : ""} logged</div>` : ""}
      </div>
      <div class="action-sheet-group" style="padding:16px">
        <div class="log-input-row">
          <div class="log-input-col">
            <div class="log-input-label">KG</div>
            <input id="log-kg" class="log-input" type="number" step="2.5" min="0" value="${defaultKg || ""}" inputmode="decimal" />
          </div>
          <div class="log-input-col">
            <div class="log-input-label">REPS</div>
            <input id="log-reps" class="log-input" type="number" min="0" value="" inputmode="numeric" />
          </div>
          <div class="log-input-col">
            <div class="log-input-label">RPE</div>
            <input id="log-rpe" class="log-input" type="number" min="1" max="10" value="" inputmode="numeric" />
          </div>
        </div>
        ${pillsHtml}
      </div>
      <div style="padding:0 10px 10px;display:flex;gap:10px">
        <button class="btn btn-secondary" data-cancel="1" style="flex:1">Done</button>
        <button class="btn" id="save-log-set" style="flex:1">+ Add set</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => {
    sheet.classList.add("open");
    setTimeout(() => document.getElementById("log-reps")?.focus(), 300);
  });

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  sheet.querySelector("[data-cancel]").addEventListener("click", () => { close(); setTimeout(route, 220); });

  document.getElementById("save-log-set").addEventListener("click", () => {
    const kg = parseFloat(document.getElementById("log-kg")?.value);
    const reps = parseInt(document.getElementById("log-reps")?.value);
    const rpe = parseInt(document.getElementById("log-rpe")?.value);
    if (isNaN(kg) && isNaN(reps)) return;
    addBlockLog(weekNum, sessionId, blockIdx, {
      blockName,
      kg: isNaN(kg) ? null : kg,
      reps: isNaN(reps) ? null : reps,
      rpe: isNaN(rpe) ? null : rpe,
      at: new Date().toISOString()
    });
    close();
    setTimeout(() => showLogSetSheet(weekNum, sessionId, blockIdx, blockName, isNaN(kg) ? defaultKg : kg), 250);
  });

  sheet.querySelectorAll(".set-log-pill-del").forEach((del) => {
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteBlockLog(weekNum, sessionId, blockIdx, del.dataset.logid);
      close();
      setTimeout(() => showLogSetSheet(weekNum, sessionId, blockIdx, blockName, defaultKg), 250);
    });
  });
}

/* ---------- Event delegation ---------- */

function attachSessionHandlers(weekNum) {
  document.querySelectorAll("[data-action='toggle-done']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const sid = btn.dataset.session;
      const wasDone = isSessionDone(weekNum, sid);
      toggleSessionDone(weekNum, sid);
      if (!wasDone) {
        // Just marked done — ask for RPE
        showRpePrompt(weekNum, sid);
      }
      route();
    });
  });

  document.querySelectorAll("[data-action='reschedule']").forEach((btn) => {
    btn.addEventListener("click", () => showReschedulePicker(weekNum, btn.dataset.session));
  });

  // Check-circle toggles done (not the whole block row)
  document.querySelectorAll("[data-action='toggle-block']").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const sessionId = el.dataset.session;
      const idx = Number(el.dataset.blockIdx);
      toggleBlockDone(weekNum, sessionId, idx);
      const blockEl = el.closest(".block");
      if (blockEl) blockEl.classList.toggle("done");

      // Auto-complete: check if all plan blocks are now done
      const w = PLAN.weeks.find((w) => w.number === weekNum);
      const sess = w && w.sessions.find((s) => s.id === sessionId);
      if (sess && sess.blocks && !isSessionDone(weekNum, sessionId)) {
        const allDone = sess.blocks.every((_, i) => isBlockDone(weekNum, sessionId, i));
        if (allDone) setTimeout(() => showAutoCompletePrompt(weekNum, sessionId), 350);
      }
    });
  });

  // Tap adjustable load chip → weight adjustment sheet
  document.querySelectorAll("[data-adjust]").forEach((el) => {
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      const wk = Number(el.dataset.week);
      const sid = el.dataset.sid;
      const bidx = Number(el.dataset.bidx);
      const planKg = Number(el.dataset.planKg);
      const blockName = el.dataset.blockName || "";
      const override = getBlockOverride(wk, sid, bidx);
      const currentKg = override != null ? override : planKg;
      showAdjustLoadSheet(wk, sid, bidx, blockName, planKg, currentKg);
    });
  });

  // Add exercise
  document.querySelectorAll("[data-action='add-exercise']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showAddExerciseSheet(Number(btn.dataset.week), btn.dataset.sid);
    });
  });

  // Delete user block
  document.querySelectorAll("[data-action='delete-user-block']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!confirm("Remove this exercise?")) return;
      deleteUserBlock(Number(btn.dataset.week), btn.dataset.sid, btn.dataset.ubid);
      route();
    });
  });

  // Interval timer button
  document.querySelectorAll("[data-action='start-timer']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      try {
        const block = JSON.parse(btn.dataset.block);
        const parsed = parseIntervalScheme(block.scheme);
        if (parsed) showIntervalTimer(block, parsed);
      } catch {}
    });
  });

  // Log set button
  document.querySelectorAll("[data-action='log-set']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showLogSetSheet(
        Number(btn.dataset.week),
        btn.dataset.sid,
        Number(btn.dataset.bidx),
        btn.dataset.name,
        btn.dataset.kg ? Number(btn.dataset.kg) : null
      );
    });
  });

  // Log / edit actuals
  document.querySelectorAll("[data-action='log-actuals'], [data-action='edit-actuals']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      showSessionActualsSheet(Number(btn.dataset.week), btn.dataset.sid);
    });
  });

  // Session journal auto-save
  document.querySelectorAll(".journal-input").forEach((ta) => {
    ta.addEventListener("input", () => {
      saveJournalNote(Number(ta.dataset.week), ta.dataset.sid, ta.value);
    });
  });

  // Long-press for quick menu on every block
  document.querySelectorAll(".block, .block-custom").forEach((blockEl) => {
    attachLongPress(blockEl, weekNum);
  });
}

/* ---------- Adjust load action sheet ---------- */

function showAdjustLoadSheet(weekNum, sessionId, blockIdx, blockName, planKg, currentKg) {
  const isOverridden = currentKg !== planKg;

  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog" aria-label="Adjust load">
      <div class="action-sheet-title">
        ${escapeHtml(blockName)}
        <div class="action-sheet-title-sub">${isOverridden
          ? `Custom: <strong>${currentKg} kg</strong> · Plan: ${planKg} kg`
          : `Plan: <strong>${planKg} kg</strong>`}</div>
      </div>
      <div class="action-sheet-group">
        <button class="action-sheet-btn" data-delta="-5">−5 kg<span class="action-sheet-sub">${currentKg - 5} kg</span></button>
        <button class="action-sheet-btn" data-delta="-2.5">−2.5 kg<span class="action-sheet-sub">${currentKg - 2.5} kg</span></button>
        <button class="action-sheet-btn" data-custom="1">Enter value…<span class="action-sheet-sub"></span></button>
        <button class="action-sheet-btn" data-delta="2.5">+2.5 kg<span class="action-sheet-sub">${currentKg + 2.5} kg</span></button>
        <button class="action-sheet-btn" data-delta="5">+5 kg<span class="action-sheet-sub">${currentKg + 5} kg</span></button>
        ${isOverridden ? `<button class="action-sheet-btn" data-reset="1" style="color:var(--danger)">Reset to plan<span class="action-sheet-sub">${planKg} kg</span></button>` : ""}
      </div>
      <button class="action-sheet-btn action-sheet-cancel" data-cancel="1">Cancel</button>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  function applyAndClose(kg) {
    setBlockOverride(weekNum, sessionId, blockIdx, Math.max(0, Math.round(kg * 10) / 10));
    close();
    setTimeout(route, 220);
  }

  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) { close(); return; }
    if (e.target.closest("[data-cancel]")) { close(); return; }

    const deltaBtn = e.target.closest("[data-delta]");
    if (deltaBtn) { applyAndClose(currentKg + Number(deltaBtn.dataset.delta)); return; }

    if (e.target.closest("[data-reset]")) {
      setBlockOverride(weekNum, sessionId, blockIdx, null);
      close();
      setTimeout(route, 220);
      return;
    }

    if (e.target.closest("[data-custom]")) {
      close();
      setTimeout(() => showCustomKgInput(weekNum, sessionId, blockIdx, blockName, planKg, currentKg), 250);
    }
  });
}

function showCustomKgInput(weekNum, sessionId, blockIdx, blockName, planKg, currentKg) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">Custom load · ${escapeHtml(blockName)}</div>
      <div class="action-sheet-group" style="padding:20px 16px 24px">
        <div style="display:flex;align-items:center;justify-content:center;gap:10px">
          <input id="custom-kg-input" class="form-input" type="number" step="2.5" min="0" value="${currentKg}" inputmode="decimal" style="font-size:32px;font-weight:700;color:var(--accent);text-align:center;width:130px;flex:none;border-bottom:2px solid var(--accent);padding-bottom:4px" />
          <span style="font-size:22px;color:var(--text-3);font-weight:500">kg</span>
        </div>
        <div style="font-size:13px;color:var(--text-3);text-align:center;margin-top:10px">Plan: ${planKg} kg</div>
      </div>
      <div style="padding:0 10px 10px;display:flex;gap:10px">
        <button class="btn btn-secondary" data-cancel="1" style="flex:1">Cancel</button>
        <button class="btn" id="save-custom-kg" style="flex:1">Save</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => {
    sheet.classList.add("open");
    setTimeout(() => {
      const inp = document.getElementById("custom-kg-input");
      if (inp) { inp.focus(); inp.select && inp.select(); }
    }, 300);
  });

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  document.getElementById("save-custom-kg").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("custom-kg-input")?.value);
    if (!isNaN(val) && val >= 0) {
      setBlockOverride(weekNum, sessionId, blockIdx, val);
      close();
      setTimeout(route, 220);
    }
  });
}

/* ---------- Add exercise action sheet ---------- */

function showAddExerciseSheet(weekNum, sessionId) {
  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog">
      <div class="action-sheet-title">Add exercise</div>
      <div class="action-sheet-group" style="padding:12px 16px 16px">
        <div class="form-row" style="background:transparent;padding:10px 0">
          <label class="form-label" style="color:var(--text-3)">Name</label>
          <input id="ub-name" class="form-input" type="text" placeholder="e.g. Pull-ups" autocomplete="off" />
        </div>
        <div class="form-row" style="background:transparent;padding:10px 0">
          <label class="form-label" style="color:var(--text-3)">Sets / scheme</label>
          <input id="ub-scheme" class="form-input" type="text" placeholder="e.g. 3×10" autocomplete="off" />
        </div>
        <div class="form-row" style="background:transparent;padding:10px 0">
          <label class="form-label" style="color:var(--text-3)">Load / note</label>
          <input id="ub-load" class="form-input" type="text" placeholder="optional" autocomplete="off" />
        </div>
      </div>
      <div style="padding:0 10px 10px;display:flex;gap:10px">
        <button class="btn btn-secondary" data-cancel="1" style="flex:1">Cancel</button>
        <button class="btn" id="save-user-block" style="flex:1">Add</button>
      </div>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => {
    sheet.classList.add("open");
    setTimeout(() => {
      const inp = document.getElementById("ub-name");
      if (inp) inp.focus();
    }, 300);
  });

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  function save() {
    const name = (document.getElementById("ub-name")?.value || "").trim();
    if (!name) { document.getElementById("ub-name")?.focus(); return; }
    const scheme = (document.getElementById("ub-scheme")?.value || "").trim();
    const load = (document.getElementById("ub-load")?.value || "").trim();
    addUserBlock(weekNum, sessionId, { name, scheme, load });
    close();
    setTimeout(route, 220);
  }

  sheet.querySelector("[data-cancel]").addEventListener("click", close);
  document.getElementById("save-user-block").addEventListener("click", save);
  document.getElementById("ub-load").addEventListener("keydown", (e) => {
    if (e.key === "Enter") save();
  });
  document.getElementById("ub-scheme").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("ub-load")?.focus();
  });
  document.getElementById("ub-name").addEventListener("keydown", (e) => {
    if (e.key === "Enter") document.getElementById("ub-scheme")?.focus();
  });
}

function showReschedulePicker(weekNum, sessionId) {
  const week = PLAN.weeks.find((w) => w.number === weekNum);
  if (!week) return;
  const thisSess = week.sessions.find((s) => s.id === sessionId);
  if (!thisSess) return;
  const currentDay = getSessionDay(weekNum, sessionId, thisSess.defaultDay);
  const dayMap = {};
  for (const s of week.sessions) {
    const d = getSessionDay(weekNum, s.id, s.defaultDay);
    if (!dayMap[d]) dayMap[d] = s;
  }
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].filter((d) => d !== currentDay);

  const sheet = document.createElement("div");
  sheet.className = "action-sheet-backdrop";
  sheet.innerHTML = `
    <div class="action-sheet" role="dialog" aria-label="Reschedule session">
      <div class="action-sheet-title">Move "${escapeHtml((thisSess.title || "").split(" — ")[0])}" to:</div>
      <div class="action-sheet-group">
        ${days.map((d) => {
          const conflict = dayMap[d];
          const sub = conflict
            ? `<span class="action-sheet-sub">swaps with ${escapeHtml((conflict.title || "").split(" — ")[0])}</span>`
            : `<span class="action-sheet-sub">currently rest</span>`;
          return `<button class="action-sheet-btn" data-day="${d}">
              <span>${d}</span>${sub}
            </button>`;
        }).join("")}
      </div>
      <button class="action-sheet-btn action-sheet-cancel" data-cancel="1">Cancel</button>
    </div>
  `;
  document.body.appendChild(sheet);
  requestAnimationFrame(() => sheet.classList.add("open"));

  function close() {
    sheet.classList.remove("open");
    setTimeout(() => sheet.remove(), 200);
  }

  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) { close(); return; }
    if (e.target.closest("[data-cancel]")) { close(); return; }
    const btn = e.target.closest("[data-day]");
    if (!btn) return;
    const day = btn.dataset.day;
    const other = week.sessions.find((s) => s.id !== sessionId && getSessionDay(weekNum, s.id, s.defaultDay) === day);
    if (other) setSessionDay(weekNum, other.id, currentDay);
    setSessionDay(weekNum, sessionId, day);
    close();
    setTimeout(route, 200);
  });
}

/* ---------- Update banner ---------- */

document.getElementById("update-btn").addEventListener("click", () => {
  document.getElementById("update-banner").hidden = true;
  if (PLAN && PLAN.version) {
    localStorage.setItem(APP_VERSION_KEY, PLAN.version);
  }
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage("SKIP_WAITING");
  }
  location.reload();
});

const dismissBtn = document.getElementById("dismiss-btn");
if (dismissBtn) {
  dismissBtn.addEventListener("click", () => {
    document.getElementById("update-banner").hidden = true;
    if (PLAN && PLAN.version) localStorage.setItem(APP_VERSION_KEY, PLAN.version);
  });
}

/* ---------- Service worker ---------- */

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });

  // When the SW sends NEW_VERSION (a new SW just activated and claimed this client),
  // show the update banner so the user can reload at their convenience.
  navigator.serviceWorker.addEventListener("message", (event) => {
    if (event.data === "NEW_VERSION") showUpdateBanner();
  });
}

/* ---------- Config file seed ---------- */
// If config.js set window.HYROX_CONFIG, merge its key into Settings once.
// This runs after config.js has loaded (it's a regular <script> above the module).
(function seedConfig() {
  try {
    const cfg = window.HYROX_CONFIG;
    if (!cfg || !cfg.geminiKey || !cfg.geminiKey.startsWith("AIza")) return;
    const s = getSettings();
    if ((s.nutrition?.geminiKey || "") === cfg.geminiKey) return; // already in sync
    s.nutrition = { ...s.nutrition, geminiKey: cfg.geminiKey };
    saveJSON(SETTINGS_KEY, s);
  } catch {}
})();

/* ---------- Boot ---------- */

// Use replaceState (not location.hash=) so we don't fire a hashchange event here.
// Firing hashchange would call route() a second time in parallel with the explicit
// call below — two concurrent route() invocations race and the second one blows
// away the first's event bindings, leaving the UI unresponsive.
if (!location.hash || location.hash === "#") {
  history.replaceState(null, "", "#/today");
}
route();
