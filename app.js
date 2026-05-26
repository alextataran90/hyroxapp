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
    fatTarget: 80
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
  fatTarget: "Fat target"
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

function saveMeal(meal) {
  const log = getNutritionLog();
  const dateStr = ymd(today());
  if (!log[dateStr]) log[dateStr] = { meals: [] };
  const idx = log[dateStr].meals.findIndex((m) => m.id === meal.id);
  if (idx >= 0) log[dateStr].meals[idx] = meal;
  else log[dateStr].meals.push(meal);
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(log));
}

function deleteMeal(mealId) {
  const log = getNutritionLog();
  const dateStr = ymd(today());
  if (!log[dateStr]) return;
  log[dateStr].meals = log[dateStr].meals.filter((m) => m.id !== mealId);
  localStorage.setItem(NUTRITION_KEY, JSON.stringify(log));
}

function makeMealId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/* ---------- Gemini Flash API ---------- */

async function analyzeFood(base64Data, mimeType) {
  const s = getSettings();
  const apiKey = (s.nutrition && s.nutrition.geminiKey) ? s.nutrition.geminiKey.trim() : "";
  if (!apiKey) throw new Error("Gemini API key not set. Add it in Settings → Nutrition.");

  const prompt = `You are a professional nutritionist. Analyse this meal photo carefully.\nReturn ONLY valid JSON (no markdown, no code fences) in this exact schema:\n{"items":[{"name":"string","qty":"string","kcal":number,"p":number,"c":number,"f":number}],"total":{"kcal":number,"p":number,"c":number,"f":number},"confidence":"high|medium|low","notes":"string"}\nRules: p=protein(g), c=carbohydrates(g), f=fat(g). Estimate portions from plate/bowl size and visual cues. Be realistic — do not underestimate. Return ONLY the JSON object.`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
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
  return JSON.parse(clean);
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
let viewingWeekNum   = null; // week shown in train nav
let selectedDayOverride = null; // day pill selection (null = smart default)
let trainDayTab      = "training"; // "training" | "nutrition"

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
  today: renderTrain,
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

async function route() {
  const r = getRoute();
  const fn = ROUTES[r.name] || renderTrain;
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === r.name);
  });

  // When navigating away from Train and back, reset day selection
  if (r.name === "today") {
    viewingWeekNum      = null;
    selectedDayOverride = null;
    // keep trainDayTab so user stays on Training/Nutrition whichever they last picked
  }
  if (r.name === "session" && r.params[0]) viewingWeekNum = Number(r.params[0]);
  if (r.name === "week"    && r.params[0]) viewingWeekNum = Number(r.params[0]);

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

async function renderTrain(app) {
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
  const todayIdx  = DAY_ORDER.indexOf(todayName);

  // Build day → session map
  const sessionByDay = {};
  for (const s of week.sessions) {
    const d = getSessionDay(wn, s.id, s.defaultDay);
    if (!sessionByDay[d]) sessionByDay[d] = s;
  }

  // Resolve selected day
  let selDay = selectedDayOverride;
  if (!selDay) {
    if (wn === curWeekNum) {
      selDay = todayName; // always default to actual today in current week
    } else {
      selDay = DAY_ORDER.find((d) => sessionByDay[d]) || DAY_ORDER[0];
    }
  }

  const selSession = sessionByDay[selDay] || null;
  const selDate    = getDateForDayInWeek(wn, selDay, settings);
  const selDateStr = ymd(selDate);
  const isSelToday = selDateStr === ymd(today());

  /* ---- Week navigation ---- */
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
          if (isSel)          cls += " tdp-sel";
          else if (isToday)   cls += " tdp-today";
          if (isDone)         cls += " tdp-done";
          if (!s)             cls += " tdp-rest";
          return `<button class="${cls}" data-day="${d}" aria-label="${d}">
            <span class="tdp-label">${d.slice(0, 2)}</span>
            ${s ? `<span class="tdp-dot dot dot-${s.focus}"></span>` : `<span class="tdp-dot"></span>`}
            ${isDone && !isSel ? `<span class="tdp-check">✓</span>` : ""}
          </button>`;
        }).join("")}
      </div>
    </div>`;

  /* ---- Training / Nutrition tab bar ---- */
  const tabBarHtml = `
    <div class="day-tab-bar">
      <button class="day-tab${trainDayTab === "training"  ? " day-tab-active" : ""}" data-dtab="training">Training</button>
      <button class="day-tab${trainDayTab === "nutrition" ? " day-tab-active" : ""}" data-dtab="nutrition">Nutrition</button>
    </div>`;

  /* ---- Day content ---- */
  let dayContent = "";

  if (trainDayTab === "training") {
    // Missed-yesterday catch-up banner (only when viewing actual today)
    if (isSelToday) {
      const yName = DAY_NAMES[((new Date().getDay() - 1 + 7) % 7)];
      const missed = week.sessions.find((s) => {
        const d = getSessionDay(wn, s.id, s.defaultDay);
        return d === yName && !isSessionDone(wn, s.id) && (!selSession || s.id !== selSession.id);
      });
      if (missed) {
        dayContent += `<div class="catchup-banner">
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
      dayContent += renderSessionCard(selSession, wn, true);
    } else {
      dayContent += `<div class="hero">
        <div class="hero-eyebrow"><span class="dot dot-test"></span><span>Rest day</span></div>
        <div class="hero-title">Recovery 🛋️</div>
        <div class="hero-intent">No session on ${escapeHtml(selDay)}. Rest is where adaptation happens.</div>
      </div>`;
    }

    // Plan / Records quick links
    const doneCount    = week.sessions.filter((s) => isSessionDone(wn, s.id)).length;
    const totalSessions = week.sessions.length;
    dayContent += `
      <div class="section-footer" style="text-align:center;margin-top:16px">
        Week ${wn} of ${PLAN.weeks.length}${phase ? " · " + escapeHtml(phase.name) : ""} · ${doneCount}/${totalSessions} done
      </div>
      <div class="section-header" style="margin-top:20px">Plan &amp; Records</div>
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

  } else {
    // Nutrition tab for selected day
    const dayMeals  = getDayMeals(selDateStr);
    const dayTotals = getDayTotals(dayMeals);
    const tgt       = settings.nutrition;

    if (dayMeals.length > 0) {
      const kcalLeft = tgt.kcalTarget - Math.round(dayTotals.kcal);
      const isOver   = kcalLeft < 0;
      const pPct = tgt.proteinTarget > 0 ? Math.min(100, Math.round(dayTotals.p / tgt.proteinTarget * 100)) : 0;
      const cPct = tgt.carbTarget    > 0 ? Math.min(100, Math.round(dayTotals.c / tgt.carbTarget    * 100)) : 0;
      const fPct = tgt.fatTarget     > 0 ? Math.min(100, Math.round(dayTotals.f / tgt.fatTarget     * 100)) : 0;
      dayContent += `<div class="fuel-hero">
        <div class="fuel-kcal-block">
          <div class="fuel-kcal-num${isOver ? " fuel-over" : ""}">${Math.abs(kcalLeft)}</div>
          <div class="fuel-kcal-label">${isOver ? "kcal over target" : "kcal remaining"}</div>
          <div class="fuel-kcal-sub">${Math.round(dayTotals.kcal)} eaten · ${tgt.kcalTarget} target</div>
        </div>
        <div class="fuel-macro-stack">
          <div class="fuel-macro-row"><span class="fuel-macro-name">Protein</span><div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-protein" style="width:${pPct}%"></div></div><span class="fuel-macro-gram">${Math.round(dayTotals.p)}<span class="fuel-macro-tgt">/${tgt.proteinTarget}g</span></span></div>
          <div class="fuel-macro-row"><span class="fuel-macro-name">Carbs</span><div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-carb" style="width:${cPct}%"></div></div><span class="fuel-macro-gram">${Math.round(dayTotals.c)}<span class="fuel-macro-tgt">/${tgt.carbTarget}g</span></span></div>
          <div class="fuel-macro-row"><span class="fuel-macro-name">Fat</span><div class="fuel-macro-bar-bg"><div class="fuel-macro-bar-fill fuel-macro-fat" style="width:${fPct}%"></div></div><span class="fuel-macro-gram">${Math.round(dayTotals.f)}<span class="fuel-macro-tgt">/${tgt.fatTarget}g</span></span></div>
        </div>
      </div>`;
    }

    const MEAL_LABELS = { breakfast: "Breakfast 🌅", lunch: "Lunch ☀️", dinner: "Dinner 🌙", snack: "Snack 🍎" };
    if (dayMeals.length === 0) {
      dayContent += `<div class="empty-state"><h3>Nothing logged</h3><p>${isSelToday ? "Tap + Log meal below." : "No meals recorded for " + escapeHtml(selDay) + "."}</p></div>`;
    } else {
      dayContent += dayMeals.map((meal) => `
        <div class="meal-card">
          <div class="meal-card-header">
            <div><div class="meal-card-label">${escapeHtml(MEAL_LABELS[meal.label] || meal.label)}</div><div class="meal-card-time">${escapeHtml(meal.time)}</div></div>
            <div style="text-align:right;flex:1;min-width:0"><div class="meal-card-kcal">${meal.total.kcal} kcal</div><div class="meal-card-macros">${meal.total.p}g P · ${meal.total.c}g C · ${meal.total.f}g F</div></div>
            ${isSelToday ? `<button class="meal-card-del" data-action="delete-meal" data-mid="${escapeHtml(meal.id)}">×</button>` : ""}
          </div>
          <div class="meal-items-list">
            ${meal.items.map((it) => `<div class="meal-item"><span class="meal-item-name">${escapeHtml(it.name)}</span><span class="meal-item-qty dim">${escapeHtml(it.qty)}</span><span class="meal-item-kcal">${it.kcal}</span></div>`).join("")}
          </div>
        </div>`).join("");
    }
    if (isSelToday) {
      dayContent += `<button class="btn" id="day-log-meal-btn" style="margin-top:16px">+ Log meal</button>`;
    }
  }

  app.innerHTML = weekNavHtml + tabBarHtml + `<div id="day-content">${dayContent}</div>`;

  /* ---- Bind events ---- */
  document.getElementById("tn-prev")?.addEventListener("click", () => {
    if (wn > 1) { viewingWeekNum = wn - 1; selectedDayOverride = null; renderTrain(app); }
  });
  document.getElementById("tn-next")?.addEventListener("click", () => {
    if (wn < PLAN.weeks.length) { viewingWeekNum = wn + 1; selectedDayOverride = null; renderTrain(app); }
  });
  app.querySelectorAll(".tdp").forEach((btn) => {
    btn.addEventListener("click", () => { selectedDayOverride = btn.dataset.day; renderTrain(app); });
  });
  app.querySelectorAll(".day-tab").forEach((btn) => {
    btn.addEventListener("click", () => { trainDayTab = btn.dataset.dtab; renderTrain(app); });
  });

  if (trainDayTab === "training" && selSession) {
    attachSessionHandlers(wn);
    const yName = DAY_NAMES[((new Date().getDay() - 1 + 7) % 7)];
    app.querySelectorAll("[data-catchup-move]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const tod = DAY_NAMES[new Date().getDay()];
        if (selSession && selSession.id !== btn.dataset.catchupMove) setSessionDay(wn, selSession.id, yName);
        setSessionDay(wn, btn.dataset.catchupMove, tod);
        renderTrain(app);
      });
    });
    app.querySelectorAll("[data-catchup-skip]").forEach((btn) => {
      btn.addEventListener("click", () => { toggleSessionDone(wn, btn.dataset.catchupSkip); renderTrain(app); });
    });
  }

  if (trainDayTab === "nutrition") {
    document.getElementById("day-log-meal-btn")?.addEventListener("click", showLogMealSheet);
    app.querySelectorAll("[data-action='delete-meal']").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (confirm("Delete this meal?")) { deleteMeal(btn.dataset.mid); renderTrain(app); }
      });
    });
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

ROUTES.fuel = renderFuel;

// Module-level state for Fuel period picker
let fuelSummaryPeriod = 0; // 0 = this week, 1 = last week

async function renderFuel(app) {
  const meals  = getTodayMeals();
  const totals = getDayTotals(meals);
  const s      = getSettings();
  const tgt    = s.nutrition;
  const kcalLeft = tgt.kcalTarget - Math.round(totals.kcal);
  const isOver   = kcalLeft < 0;

  const pPct = tgt.proteinTarget > 0 ? Math.min(100, Math.round(totals.p / tgt.proteinTarget * 100)) : 0;
  const cPct = tgt.carbTarget    > 0 ? Math.min(100, Math.round(totals.c / tgt.carbTarget    * 100)) : 0;
  const fPct = tgt.fatTarget     > 0 ? Math.min(100, Math.round(totals.f / tgt.fatTarget     * 100)) : 0;

  const MEAL_LABELS = { breakfast: "Breakfast 🌅", lunch: "Lunch ☀️", dinner: "Dinner 🌙", snack: "Snack 🍎" };

  const mealsHtml = meals.length === 0
    ? `<div class="empty-state"><h3>Nothing logged yet</h3><p>Tap + Log meal to add your first meal today.</p></div>`
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
            <button class="meal-card-del" data-action="delete-meal" data-mid="${escapeHtml(meal.id)}">×</button>
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

  // 7-day bar chart data
  const chartDays = [];
  const d0 = today();
  for (let i = 6; i >= 0; i--) {
    const dd = new Date(d0.getTime() - i * 86400000);
    const ds = ymd(dd);
    const t  = getDayTotals(getDayMeals(ds));
    chartDays.push({ label: DAY_NAMES[dd.getDay()].slice(0, 2), kcal: Math.round(t.kcal), isToday: i === 0 });
  }
  const maxBar = Math.max(...chartDays.map((d) => d.kcal), tgt.kcalTarget, 1);

  const histHtml = chartDays.map((d) => {
    const h    = Math.round((d.kcal / maxBar) * 52);
    const tgtH = Math.round((tgt.kcalTarget / maxBar) * 52);
    return `<div class="fuel-hist-col${d.isToday ? " fuel-hist-today" : ""}">
      <div class="fuel-hist-bar-wrap" style="height:52px">
        <div class="fuel-hist-target-line" style="bottom:${tgtH}px"></div>
        <div class="fuel-hist-bar${d.kcal > tgt.kcalTarget ? " fuel-hist-over" : ""}" style="height:${h}px"></div>
      </div>
      <div class="fuel-hist-num">${d.kcal > 0 ? d.kcal : ""}</div>
      <div class="fuel-hist-label">${d.label}</div>
    </div>`;
  }).join("");

  // Weekly summary
  const wSumm  = getNutritionWeekSummary(fuelSummaryPeriod);
  const todayDs = ymd(today());
  const wkTitle = fuelSummaryPeriod === 0 ? "This Week" : "Last Week";
  const wkStart = wSumm.startDate.toLocaleDateString("en-GB", { day:"numeric", month:"short" });

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
          const isToday = day.ds === todayDs;
          return `<div class="fuel-week-day-col${isToday ? " is-today" : ""}">
            <div class="fuel-week-day-label">${day.label}</div>
            <div class="fuel-week-day-dot${day.hasData ? " has-data" : ""}"></div>
            <div class="fuel-week-day-kcal">${day.hasData ? Math.round(day.kcal).toLocaleString() : ""}</div>
          </div>`;
        }).join("")}
      </div>`;

  const noKey = !tgt.geminiKey;

  // Count today's photo analyses (meals with source="photo")
  const photoAnalysesToday = meals.filter((m) => m.source === "photo").length;
  const FREE_TIER_DAILY = 1500;
  const tierPct = Math.min(100, Math.round(photoAnalysesToday / FREE_TIER_DAILY * 100));

  app.innerHTML = `
    <h1 class="large-title">Fuel</h1>
    <div class="large-title-sub">${new Date().toLocaleDateString("en-GB", { weekday:"long", day:"numeric", month:"long" })}</div>

    ${noKey ? `<div class="alert alert-warn">
      <strong>Gemini key missing</strong>
      Add it in <a href="#/settings" style="color:var(--warn)">Settings → Nutrition</a> to enable photo analysis.
    </div>` : `<div class="fuel-tier-bar">
      <div class="fuel-tier-label">
        <span>Gemini free tier</span>
        <span class="fuel-tier-count">${photoAnalysesToday} / ${FREE_TIER_DAILY.toLocaleString()} analyses today</span>
      </div>
      <div class="fuel-tier-track"><div class="fuel-tier-fill" style="width:${tierPct}%"></div></div>
    </div>`}

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

    <button class="btn" id="log-meal-btn">+ Log meal</button>

    <div class="section-header">Today's meals</div>
    ${mealsHtml}

    <div class="section-header">Last 7 days</div>
    <div class="fuel-history">${histHtml}</div>
    <div class="section-footer">Orange bar = over target. Dashed line = daily target (${tgt.kcalTarget} kcal).</div>

    <div class="section-header" style="margin-top:24px">Weekly summary</div>
    <div class="fuel-period-picker">
      <button class="fuel-period-btn${fuelSummaryPeriod === 0 ? " fuel-period-btn-active" : ""}" data-period="0">This Week</button>
      <button class="fuel-period-btn${fuelSummaryPeriod === 1 ? " fuel-period-btn-active" : ""}" data-period="1">Last Week</button>
    </div>
    <div class="fuel-week-summary">
      <div class="fuel-week-summary-title">${wkTitle} · w/c ${wkStart} · ${wSumm.loggedDays}/7 days logged</div>
      ${weekStatHtml}
    </div>
  `;

  document.getElementById("log-meal-btn").addEventListener("click", showLogMealSheet);

  app.querySelectorAll("[data-action='delete-meal']").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (confirm("Delete this meal?")) {
        deleteMeal(btn.dataset.mid);
        route();
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
    ? "Daily Gemini quota reached (1,500 free requests/day). It resets at midnight Pacific time. You can still enter nutrition manually."
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

/* ---------- Log meal sheet (camera / library / manual) ---------- */

function showLogMealSheet() {
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
      const b64 = ev.target.result.split(",")[1];
      const mime = file.type || "image/jpeg";
      try {
        const result = await analyzeFood(b64, mime);
        loader.remove();
        showMealEditSheet(result.items || [], result.notes || "", "photo");
      } catch (err) {
        loader.remove();
        showGeminiError(err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  sheet.querySelector("#meal-cam").addEventListener("change", (e) => processFile(e.target.files[0]));
  sheet.querySelector("#meal-lib").addEventListener("change", (e) => processFile(e.target.files[0]));
  sheet.querySelector("#meal-manual-btn").addEventListener("click", () => { close(); showMealEditSheet([], "", "manual"); });
  sheet.querySelector("#meal-sheet-cancel").addEventListener("click", close);
  sheet.addEventListener("click", (e) => { if (e.target === sheet) close(); });
}

/* ---------- Meal edit / confirm sheet ---------- */

function showMealEditSheet(initItems, aiNotes, source) {
  // auto:true means "estimate this item via Gemini" — not yet calculated
  let items = initItems.map((it) => ({ name: it.name || "", qty: it.qty || "", kcal: it.kcal || 0, p: it.p || 0, c: it.c || 0, f: it.f || 0, auto: false }));
  const LABELS = ["breakfast", "lunch", "dinner", "snack"];
  const h = new Date().getHours();
  let selLabel = h < 10 ? "breakfast" : h < 14 ? "lunch" : h < 19 ? "dinner" : "snack";

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
    bindSheet();
  };

  const syncDomToItems = () => {
    overlay.querySelectorAll(".fed-field").forEach((inp) => {
      const i = Number(inp.dataset.i);
      if (i < items.length) items[i][inp.dataset.f] = inp.type === "number" ? (Number(inp.value) || 0) : inp.value;
    });
  };

  const updateTotals = () => {
    const tot = calcTotal();
    const kcalEl = overlay.querySelector("#fed-total-kcal");
    const macEl  = overlay.querySelector("#fed-total-macros");
    if (kcalEl) kcalEl.textContent = Math.round(tot.kcal) + " kcal";
    if (macEl)  macEl.textContent  = `${Math.round(tot.p)}g P · ${Math.round(tot.c)}g C · ${Math.round(tot.f)}g F`;
  };

  const bindSheet = () => {
    overlay.querySelectorAll(".fuel-label-pill").forEach((b) => b.addEventListener("click", () => { selLabel = b.dataset.lbl; renderSheet(); }));

    overlay.querySelectorAll(".fed-field").forEach((inp) => {
      inp.addEventListener("input", () => {
        const i = Number(inp.dataset.i);
        const f = inp.dataset.f;
        items[i][f] = inp.type === "number" ? (Number(inp.value) || 0) : inp.value;
        updateTotals();
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
      items.push({ name: "", qty: "", kcal: 0, p: 0, c: 0, f: 0, auto: false });
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
      saveMeal({
        id: makeMealId(),
        label: selLabel,
        time: `${String(now2.getHours()).padStart(2, "0")}:${String(now2.getMinutes()).padStart(2, "0")}`,
        items: valid,
        total: { kcal: Math.round(tot.kcal), p: Math.round(tot.p * 10) / 10, c: Math.round(tot.c * 10) / 10, f: Math.round(tot.f * 10) / 10 },
        source: source || "manual"
      });
      close();
      const rn = getRoute().name;
      if (rn === "fuel" || rn === "today") route();
    });
  };

  renderSheet();
}

function fuelItemRow(it, i) {
  return `<div class="fed-item${it.auto ? " fed-item-auto" : ""}">
    <div class="fed-item-top">
      <input class="fed-field fed-name" data-i="${i}" data-f="name" type="text" value="${escapeHtml(it.name)}" placeholder="Food name" />
      <input class="fed-field fed-qty" data-i="${i}" data-f="qty" type="text" value="${escapeHtml(it.qty)}" placeholder="qty / g" />
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
    [PROGRESS_KEY, OVERRIDES_KEY, USER_BLOCKS_KEY, DAY_OVERRIDES_KEY, JOURNAL_KEY, SESSION_LOGS_KEY].forEach((k) => localStorage.removeItem(k));
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

  sheet.addEventListener("click", (e) => {
    if (e.target === sheet) { close(); return; }
    if (e.target.closest("[data-cancel]")) { close(); return; }
    const rpeBtn = e.target.closest("[data-rpe]");
    if (rpeBtn) {
      const rpe = Number(rpeBtn.dataset.rpe);
      const p = getProgress();
      const key = `W${weekNum}.${sessionId}`;
      if (!p.sessions[key]) p.sessions[key] = { completedAt: new Date().toISOString() };
      p.sessions[key].rpe = rpe;
      saveJSON(PROGRESS_KEY, p);
      close();
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

if (!location.hash) location.hash = "#/today";
route();
