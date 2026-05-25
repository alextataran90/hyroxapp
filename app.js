/* Hyrox Trainer - vanilla SPA */

const APP_VERSION_KEY = "hyrox.app.version";
const SETTINGS_KEY = "hyrox.settings";
const PROGRESS_KEY = "hyrox.progress";
const TESTS_KEY = "hyrox.tests";
const DAY_OVERRIDES_KEY = "hyrox.dayOverrides";
const OVERRIDES_KEY = "hyrox.overrides";
const USER_BLOCKS_KEY = "hyrox.userblocks";
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
  bodyWeight: "Body weight"
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
    ergs: { ...DEFAULT_SETTINGS.ergs, ...(stored.ergs || {}) }
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
  today: renderToday,
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
  const fn = ROUTES[r.name] || renderToday;
  document.querySelectorAll(".tab").forEach((el) => {
    el.classList.toggle("active", el.dataset.tab === r.name);
  });
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

async function renderToday(app) {
  const settings = getSettings();
  const weekNum = getWeekIndex(settings);
  const week = PLAN.weeks.find((w) => w.number === weekNum);

  if (!week) {
    app.innerHTML = `<div class="empty-state"><h3>No plan loaded</h3><p>Race day might have passed, or your start date is in the future.</p></div>`;
    return;
  }

  const todayName = DAY_NAMES[new Date().getDay()];
  let session = week.sessions.find((s) => {
    const day = getSessionDay(weekNum, s.id, s.defaultDay);
    return day === todayName && !isSessionDone(weekNum, s.id);
  });
  if (!session) session = week.sessions.find((s) => !isSessionDone(weekNum, s.id));

  const totalSessions = week.sessions.length;
  const doneCount = week.sessions.filter((s) => isSessionDone(weekNum, s.id)).length;
  const phase = getCurrentPhase(PLAN, weekNum);

  let html = `
    <h1 class="large-title">Today</h1>
    <div class="large-title-sub">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</div>
  `;

  // Race week countdown
  if (weekNum >= PLAN.weeks.length - 1) {
    const days = daysBetween(today(), parseDate(settings.raceDate));
    if (days >= 0 && days <= 14) {
      html += `<div class="countdown-big">
        <div class="num">${days}</div>
        <div class="label">days to race</div>
      </div>`;
    }
  }

  if (!session) {
    html += `<div class="hero">
      <div class="hero-eyebrow"><span class="dot dot-test"></span><span>Week complete</span></div>
      <div class="hero-title">Rest day</div>
      <div class="hero-intent">All ${totalSessions} sessions ticked off this week. Nice work — recover.</div>
    </div>
    <a class="btn btn-secondary" href="#/week" style="display:flex;margin-top:8px">View week</a>`;
    app.innerHTML = html;
    return;
  }

  html += renderSessionCard(session, weekNum, true);

  // "Coming up" block
  const remaining = week.sessions.filter((s) => !isSessionDone(weekNum, s.id) && s.id !== session.id).slice(0, 3);
  if (remaining.length) {
    html += `<div class="section-header">Coming up this week</div>`;
    html += `<div class="list">${remaining.map((s) => {
      const day = getSessionDay(weekNum, s.id, s.defaultDay);
      return `<a href="#/session/${weekNum}/${escapeHtml(s.id)}" class="list-row">
        <span class="list-row-leading ${s.focus}">${focusIcon(s.focus)}</span>
        <div class="list-row-main">
          <div class="list-row-title">${escapeHtml(s.title)}</div>
          <div class="list-row-sub">${escapeHtml(day)} · ${s.duration} min</div>
        </div>
        <svg class="chevron" viewBox="0 0 9 14" fill="none"><path d="M1 1l6 6-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
      </a>`;
    }).join("")}</div>`;
  }

  // Week progress footer
  html += `<div class="section-footer" style="text-align:center;margin-top:24px">
    Week ${week.number} of ${PLAN.weeks.length} · ${phase ? phase.name : ""} · ${doneCount}/${totalSessions} done
  </div>`;

  app.innerHTML = html;
  attachSessionHandlers(weekNum);
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

    <div class="section-header">This week</div>
    <div class="day-picker">${dayChipsHtml}</div>
    <div class="section-footer">Tap any day to jump to that session.</div>

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
        const displayKg = override != null ? override : planKg;
        const isOverridden = override != null;
        trailingLoad = `<span class="block-load${isOverridden ? " overridden" : ""}" data-adjust="1" data-week="${weekNum}" data-sid="${escapeHtml(sessionId)}" data-bidx="${blockIdx}" data-plan-kg="${planKg}" data-block-name="${escapeHtml(block.name)}">${displayKg} kg</span>`;
      }
    } else {
      trailingLoad = renderLoadSimple(block.load, settings);
    }
  }

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
    const t = getTests();
    t.items.push({
      id: "t" + Date.now(),
      date: fd.get("date"),
      week: Number(fd.get("week")),
      summary: fd.get("summary"),
      notes: fd.get("notes")
    });
    saveJSON(TESTS_KEY, t);
    route();
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

    <div style="margin-top:24px">
      <button id="save-settings" class="btn">${returnTo ? "Save & return to workout" : "Save changes"}</button>
      ${returnTo
        ? `<button id="save-stay" class="btn btn-secondary" style="margin-top:10px">Save and stay here</button>`
        : `<button id="reset-progress" class="btn btn-secondary" style="margin-top:10px">Reset week progress</button>`}
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

/* ---------- Event delegation ---------- */

function attachSessionHandlers(weekNum) {
  document.querySelectorAll("[data-action='toggle-done']").forEach((btn) => {
    btn.addEventListener("click", () => {
      toggleSessionDone(weekNum, btn.dataset.session);
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

/* ---------- Boot ---------- */

if (!location.hash) location.hash = "#/today";
route();
