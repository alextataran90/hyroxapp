/**
 * Hyrox Trainer — accounts + cross-device sync.
 *
 * Design: LOCAL-FIRST.
 * localStorage stays the working store, so every render path in app.js keeps
 * reading data synchronously (instant, offline-capable). This module adds:
 *   1. a `store` shim that namespaces localStorage per signed-in user
 *   2. a background sync engine (pull on login, debounced push on write)
 *   3. the auth gate UI (sign in / sign up / reset password)
 *
 * Data model: ~15 JSON documents per user, stored in Supabase as rows in
 * public.user_data (user_id, key, value jsonb). See supabase-schema.sql.
 */

/* ---------- Which keys sync ---------- */

// Everything the user owns. APP_VERSION_KEY is deliberately absent: it tracks
// which plan version THIS device has seen (for the update banner), so it must
// stay device-local.
export const SYNCED_KEYS = [
  "hyrox.settings",
  "hyrox.progress",
  "hyrox.tests",
  "hyrox.dayOverrides",
  "hyrox.overrides",
  "hyrox.userblocks",
  "hyrox.journal",
  "hyrox.sessionlogs",
  "hyrox.readiness",
  "hyrox.prs",
  "hyrox.nutrition",
  "hyrox.fitness",
  "hyrox.dailyBurn",
  "hyrox.foods",
  "hyrox.savedMeals",
  "hyrox.pantry",
  "hyrox.setEntries",
  "hyrox.actuals"
];

/* ---------- Supabase client ---------- */

let sb = null;
let currentUser = null;
let pullOk = false;   // did we successfully load this account's data?
let configError = null;

function initClient() {
  const cfg = window.HYROX_SUPABASE || {};
  if (!cfg.url || !cfg.anonKey || cfg.url.startsWith("PASTE_")) {
    configError = "Supabase is not configured yet. Fill in supabase-config.js.";
    return null;
  }
  if (!window.supabase || !window.supabase.createClient) {
    configError = "Supabase library failed to load. Check your connection.";
    return null;
  }
  return window.supabase.createClient(cfg.url, cfg.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The recovery/confirm links land with tokens in the URL hash. Let the
      // client consume them; we restore our own hash route afterwards.
      detectSessionInUrl: true
    }
  });
}

export function hasLoadedRemote() { return pullOk; }

/**
 * Can the app run now? Either we loaded this account, or a previous visit left
 * its data here (so a failed pull means "offline", not "brand-new account").
 * The second case is what lets the app open at a gym with no signal.
 */
export function canRunFromCache() { return pullOk || cacheKnown; }

function localCacheLooksReal(userId) {
  try {
    const raw = userId
      ? localStorage.getItem(`u.${userId}.hyrox.settings`)
      : store.get("hyrox.settings");
    const st = JSON.parse(raw || "null");
    return !!(st && st.onboarded);
  } catch { return false; }
}

/**
 * The user supabase-js last stored on this device. When the access token has
 * expired (an hour) and there's no signal to refresh it, getSession() returns
 * null even though the refresh token — and all the data — are still here, which
 * dropped an athlete at the sign-in screen in a gym with no reception.
 */
function cachedSessionUser() {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!/^sb-.+-auth-token$/.test(k)) continue;
      const j = JSON.parse(localStorage.getItem(k) || "null");
      const u = j && (j.user || (j.currentSession && j.currentSession.user));
      if (u && u.id) return { id: u.id, email: u.email || "" };
    }
  } catch { /* unreadable → treat as no cached user */ }
  return null;
}

const looksOffline = (err) => !navigator.onLine || /failed to fetch|network|load failed|fetch failed/i.test((err && err.message) || "");

export function getCurrentUser() {
  return currentUser;
}

/* ---------- Storage shim (per-user namespaced) ---------- */

function nsKey(key) {
  return currentUser ? `u.${currentUser.id}.${key}` : key;
}

export const store = {
  get(key) {
    try { return localStorage.getItem(nsKey(key)); } catch { return null; }
  },
  set(key, value) {
    // Writes before sign-in would land in the un-namespaced bucket, where
    // hasLegacyData() would later mistake them for a previous user's history
    // and offer to import them into whoever signs in next. Refuse them.
    if (!currentUser) {
      console.warn("[store] ignoring pre-sign-in write:", key);
      return;
    }
    if (SYNCED_KEYS.includes(key)) captureBase(key);   // before the write: what we last synced
    try { localStorage.setItem(nsKey(key), value); } catch { /* quota */ }
    if (SYNCED_KEYS.includes(key)) markDirty(key);
  },
  remove(key) {
    if (SYNCED_KEYS.includes(key)) captureBase(key);
    try { localStorage.removeItem(nsKey(key)); } catch { /* no-op */ }
    if (SYNCED_KEYS.includes(key)) markDirty(key);
  },
  // Used by the Settings export/import feature.
  allKeys() {
    return SYNCED_KEYS.slice();
  },
  // Write without triggering a sync push (used when applying a pull).
  setLocalOnly(key, value) {
    try { localStorage.setItem(nsKey(key), value); } catch { /* quota */ }
  }
};

/* ---------- Device-only secrets ---------- */

// The Gemini API key is a credential, so it never leaves the device: it is not
// in SYNCED_KEYS, is stripped from anything uploaded, and is stripped from
// anything pulled. Older versions kept it inside the synced settings document,
// so it is rescued from there before that document gets overwritten.
const LOCAL_GEMINI_KEY = "hyrox.local.geminiKey";

function stripSecrets(key, value) {
  if (key !== "hyrox.settings" || !value || typeof value !== "object") return value;
  const nut = value.nutrition;
  if (!nut || typeof nut !== "object" || !("geminiKey" in nut)) return value;
  if (nut.geminiKey && !store.get(LOCAL_GEMINI_KEY)) {
    store.setLocalOnly(LOCAL_GEMINI_KEY, String(nut.geminiKey).trim());
  }
  const rest = { ...nut };
  delete rest.geminiKey;
  return { ...value, nutrition: rest };
}

/* ---------- Sync engine ---------- */

let dirty = new Set();
// Per-key write counter. A push may only clear a key if it hasn't been written
// again since the push read it — otherwise an edit made while its own key was
// mid-flight is silently dropped from the queue.
let dirtyVer = new Map();
let pushTimer = null;
let retryTimer = null;
let syncing = false;
let pushAgain = false;     // a push was requested while one was already running
let lastPullAt = 0;
let cacheKnown = false;    // this account's data was synced here on a previous visit
let signingOut = false;
let onStatus = () => {};
let onRemoteChange = () => {};

export function setSyncStatusHandler(fn) { onStatus = fn || (() => {}); }
// Called when a pull brought in changes made elsewhere, so the UI can redraw.
export function setRemoteChangeHandler(fn) { onRemoteChange = fn || (() => {}); }
export function pendingCount() { return dirty.size; }

// Re-announce the current state. The app registers its status handler only after
// sign-in finishes, so anything emitted during startup (like "the first pull
// failed, running from the local copy") was lost and nothing told you that you
// were offline.
export function reportSyncStatus() {
  onStatus(pullOk ? (dirty.size ? "pending" : "synced") : (cacheKnown ? "offline" : "error"));
}

function pendingStoreKey() {
  return currentUser ? `hyrox.sync.pending.${currentUser.id}` : null;
}

function savePending() {
  const k = pendingStoreKey();
  if (!k) return;
  try { localStorage.setItem(k, JSON.stringify([...dirty])); } catch { /* no-op */ }
}

function loadPending() {
  const k = pendingStoreKey();
  if (!k) return;
  try {
    const raw = localStorage.getItem(k);
    dirty = new Set(raw ? JSON.parse(raw) : []);
  } catch { dirty = new Set(); }
}

function markDirty(key) {
  if (!currentUser) return;
  dirty.add(key);
  dirtyVer.set(key, (dirtyVer.get(key) || 0) + 1);
  savePending();
  schedulePush();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushDirty(); }, 1200);
}

/* ---------- Revisions, merge bases and 3-way merge ---------- */

/*
 * Sync used to replace whole documents, last write wins: two devices logging
 * different meals the same day meant one device's meal was thrown away. Now:
 *   - `revs[key]`  is the server revision (updated_at) our copy is based on.
 *   - a *base* is saved when a key first becomes dirty: the value we last synced.
 *   - uploads are conditional on `revs[key]` still being current; if someone
 *     else wrote since, we fetch theirs, merge it with ours against the base,
 *     and try again.
 * The merge works entry by entry (meals by id, sessions by key, days by date).
 * A true conflict on the very same entry goes to this device's latest edit.
 */

let revs = {};   // key -> server updated_at this device's copy was last synced with

const revStoreKey  = () => `hyrox.sync.rev.${currentUser.id}`;
const baseStoreKey = (key) => `hyrox.sync.base.${currentUser.id}.${key}`;
const NO_VALUE = "\u0000none";

function loadRevs() {
  try { revs = JSON.parse(localStorage.getItem(revStoreKey()) || "{}") || {}; } catch { revs = {}; }
}
function saveRevs() {
  try { localStorage.setItem(revStoreKey(), JSON.stringify(revs)); } catch { /* quota */ }
}

// Called just before the write that makes a clean key dirty.
function captureBase(key) {
  if (!currentUser || dirty.has(key)) return;
  try {
    const raw = localStorage.getItem(nsKey(key));
    localStorage.setItem(baseStoreKey(key), raw == null ? NO_VALUE : raw);
  } catch { /* quota: merging degrades to "union, this device wins" */ }
}
function setBase(key, raw) { try { localStorage.setItem(baseStoreKey(key), raw); } catch { /* quota */ } }
function clearBase(key) { try { localStorage.removeItem(baseStoreKey(key)); } catch { /* no-op */ } }
function readBase(key) {
  try {
    const raw = localStorage.getItem(baseStoreKey(key));
    return raw == null || raw === NO_VALUE ? undefined : JSON.parse(raw);
  } catch { return undefined; }
}

const isObj = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const same = (a, b) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));
const hasId = (x) => isObj(x) && (typeof x.id === "string" || typeof x.id === "number");
const isIdList = (a) => Array.isArray(a) && a.every(hasId);

/**
 * Merge two divergent copies of one document, given the common ancestor.
 *   untouched on one side  -> take the other side
 *   objects                -> merge key by key (recursively)
 *   lists of {id,…}        -> merge item by item (meals, workouts, …)
 *   anything else          -> true conflict: `local` (this device's latest) wins
 * A deletion is honoured only if the other side didn't change that entry.
 */
export function merge3(base, local, remote) {
  if (same(local, remote)) return local;
  if (base !== undefined && same(local, base)) return remote;
  if (base !== undefined && same(remote, base)) return local;

  if (isObj(local) && isObj(remote)) {
    const b = isObj(base) ? base : {};
    const out = {};
    for (const k of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const inL = k in local, inR = k in remote;
      if (inL && inR) out[k] = merge3(k in b ? b[k] : undefined, local[k], remote[k]);
      else if (inL) { if (k in b && same(local[k], b[k])) continue; out[k] = local[k]; }   // they deleted it, we hadn't touched it
      else          { if (k in b && same(remote[k], b[k])) continue; out[k] = remote[k]; } // we deleted it, they hadn't touched it
    }
    return out;
  }

  if (isIdList(local) && isIdList(remote)) {
    const byId = (arr) => new Map(arr.map((x) => [x.id, x]));
    const L = byId(local), R = byId(remote), B = byId(isIdList(base) ? base : []);
    const out = [];
    for (const id of [...L.keys(), ...[...R.keys()].filter((i) => !L.has(i))]) {
      const inL = L.has(id), inR = R.has(id), inB = B.has(id);
      if (inL && inR) out.push(merge3(inB ? B.get(id) : undefined, L.get(id), R.get(id)));
      else if (inL) { if (inB && same(L.get(id), B.get(id))) continue; out.push(L.get(id)); }
      else          { if (inB && same(R.get(id), B.get(id))) continue; out.push(R.get(id)); }
    }
    return out;
  }
  return local;
}

/**
 * Fold the server's copy of `key` into this device's. Synchronous from the read
 * of the local value to the write of the merged one, so an edit can't slip in
 * between and be overwritten.
 */
function mergeRemoteIntoLocal(key, remoteValue, remoteRev) {
  const raw = store.get(key);
  let local;
  try { local = raw == null || raw === "" ? {} : JSON.parse(raw); }   // absent + dirty = "I deleted it"
  catch { local = undefined; }
  const merged = local === undefined ? remoteValue : merge3(readBase(key), local, remoteValue);
  store.setLocalOnly(key, JSON.stringify(merged));
  revs[key] = remoteRev;
  setBase(key, JSON.stringify(remoteValue));     // our next edits are relative to what we've now absorbed
  return { merged, changedLocal: local === undefined || !same(local, merged) };
}

/**
 * Upload one key, conditional on the server still being at the revision we last
 * saw. If it isn't, absorb the newer server copy (merge) and try again.
 */
async function pushKey(key) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const ver = dirtyVer.get(key) || 0;            // snapshot, in the same breath as the read
    const raw = store.get(key);
    let value = {};                                // a removed key uploads as an empty document
    if (raw != null && raw !== "") {
      try { value = stripSecrets(key, JSON.parse(raw)); }
      catch {
        // Never turn an unreadable value into an empty document: that would
        // overwrite whatever good copy the cloud holds.
        console.warn("[sync] not uploading unreadable value for", key);
        return { key, skipped: true };
      }
    }
    const sent = JSON.stringify(value);

    let landed = false;
    if (revs[key]) {
      const res = await sb.from("user_data").update({ value })
        .eq("user_id", currentUser.id).eq("key", key).eq("updated_at", revs[key]).select("updated_at");
      if (res.error) throw res.error;
      if (res.data && res.data.length) { revs[key] = res.data[0].updated_at; landed = true; }
    } else {
      const res = await sb.from("user_data").insert({ user_id: currentUser.id, key, value }).select("updated_at");
      if (res.error && res.error.code !== "23505") throw res.error;   // 23505: someone created it first
      if (!res.error && res.data && res.data.length) { revs[key] = res.data[0].updated_at; landed = true; }
    }
    if (landed) { saveRevs(); return { key, ver, sent }; }

    // Another device wrote since we last synced. Take their copy and merge.
    const cur = await sb.from("user_data").select("value,updated_at")
      .eq("user_id", currentUser.id).eq("key", key).maybeSingle();
    if (cur.error) throw cur.error;
    if (cur.data) mergeRemoteIntoLocal(key, stripSecrets(key, cur.data.value ?? {}), cur.data.updated_at);
    else delete revs[key];                          // the row is gone: the next pass inserts it
    saveRevs();
  }
  throw new Error(`sync conflict on ${key} did not settle`);
}

export async function pushDirty() {
  if (!sb || !currentUser) return { ok: false, pending: dirty.size, reason: "signed-out" };
  if (dirty.size === 0) return { ok: true, pending: 0 };
  if (syncing) {
    // One is already in flight. Remember to go again instead of silently
    // dropping this request — the keys it was for may not be in that batch.
    pushAgain = true;
    return { ok: false, pending: dirty.size, reason: "busy" };
  }
  if (!pullOk) {
    // We never loaded this account — pushing now would overwrite good cloud
    // data with local defaults. Hold the queue until a pull succeeds.
    console.warn("[sync] push held: remote state was never loaded");
    onStatus(cacheKnown ? "offline" : "error");
    return { ok: false, pending: dirty.size, reason: "not-loaded" };
  }
  if (!navigator.onLine) { onStatus("offline"); return { ok: false, pending: dirty.size, reason: "offline" }; }

  syncing = true;
  onStatus("syncing");
  let result;
  try {
    const results = await Promise.all([...dirty].map((k) => pushKey(k).catch((error) => ({ key: k, error }))));
    let firstError = null;
    for (const r of results) {
      if (r.error) { firstError = firstError || r.error; continue; }
      if (r.skipped) { dirty.delete(r.key); dirtyVer.delete(r.key); clearBase(r.key); continue; }
      if ((dirtyVer.get(r.key) || 0) === r.ver) {
        // Sent and not written again since: this key is clean.
        dirty.delete(r.key); dirtyVer.delete(r.key); clearBase(r.key);
      } else {
        // Edited again while it was in flight: stays dirty, and further edits
        // are relative to the copy we just uploaded.
        setBase(r.key, r.sent);
      }
    }
    savePending();
    if (firstError) throw firstError;
    onStatus(dirty.size === 0 ? "synced" : "pending");
    result = { ok: dirty.size === 0, pending: dirty.size };
  } catch (e) {
    console.warn("[sync] push failed:", e.message || e);
    onStatus("error");
    result = { ok: false, pending: dirty.size, reason: "error", error: e };
  } finally {
    syncing = false;
  }

  clearTimeout(retryTimer);
  if (result.reason === "error") {
    // Back off rather than hammering a failing server; online/visibility/the
    // next edit will also kick it.
    retryTimer = setTimeout(() => { pushDirty(); }, 20000);
  } else if (pushAgain || dirty.size > 0) {
    pushAgain = false;
    schedulePush();                          // edits landed mid-flight
  }
  return result;
}

// Key-order-independent form, so a Postgres jsonb round-trip (which reorders
// object keys) doesn't look like a change.
function canon(v) {
  if (Array.isArray(v)) return v.map(canon);
  if (v && typeof v === "object") {
    return Object.keys(v).sort().reduce((o, k) => { o[k] = canon(v[k]); return o; }, {});
  }
  return v;
}

export async function pullAll() {
  if (!sb || !currentUser) return { ok: false, pulled: 0, changed: 0 };
  onStatus("syncing");
  try {
    const { data, error } = await sb
      .from("user_data")
      .select("key,value,updated_at")
      .eq("user_id", currentUser.id);
    if (error) throw error;
    let pulled = 0, changed = 0, merged = 0;
    (data || []).forEach((row) => {
      if (!SYNCED_KEYS.includes(row.key)) return;
      // About to overwrite local settings: rescue a legacy key from them first.
      if (row.key === "hyrox.settings") { try { stripSecrets(row.key, JSON.parse(store.get(row.key))); } catch { /* none */ } }
      const remoteValue = stripSecrets(row.key, row.value ?? {});
      // The cloud copy still contains the (now device-only) key: re-upload this
      // document without it, so the secret doesn't linger on the server.
      const hadSecret = row.key === "hyrox.settings" && !!row.value && !!row.value.nutrition && "geminiKey" in row.value.nutrition;

      if (dirty.has(row.key)) {
        // This device has edits the server hasn't seen. Overwriting would throw
        // them away; skipping would let them overwrite someone else's. Merge.
        const r = mergeRemoteIntoLocal(row.key, remoteValue, row.updated_at);
        if (same(r.merged, remoteValue) && !hadSecret) {   // nothing of ours left to send
          dirty.delete(row.key); dirtyVer.delete(row.key); clearBase(row.key);
        }
        if (r.changedLocal) changed++;
        merged++;
        return;
      }

      let local = null;
      try { local = JSON.parse(store.get(row.key)); } catch { /* absent */ }
      if (local === null || !same(local, remoteValue)) changed++;
      store.setLocalOnly(row.key, JSON.stringify(remoteValue));
      revs[row.key] = row.updated_at;
      clearBase(row.key);
      if (hadSecret) markDirty(row.key);
      pulled++;
    });
    saveRevs();
    savePending();
    pullOk = true;
    lastPullAt = Date.now();
    onStatus(dirty.size === 0 ? "synced" : "pending");
    return { ok: true, pulled, changed, merged };
  } catch (e) {
    console.warn("[sync] pull failed:", e.message || e);
    onStatus(navigator.onLine ? "error" : "offline");
    return { ok: false, pulled: 0, changed: 0, error: e };
  }
}

/** Push anything pending, then fetch what other devices wrote. Reports honestly. */
export async function syncNow() {
  if (!sb || !currentUser) return { ok: false, reason: "signed-out", pending: 0 };
  if (!navigator.onLine) return { ok: false, reason: "offline", pending: dirty.size };
  if (!pullOk) {
    const p = await pullAll();
    if (!p.ok) return { ok: false, reason: "error", pending: dirty.size };
    if (p.changed) onRemoteChange(p.changed);
  }
  const r = await pushDirty();
  if (!r.ok) return r;
  const p = await pullAll();
  if (p.ok && p.changed) onRemoteChange(p.changed);
  return { ok: p.ok, reason: p.ok ? undefined : "error", pending: dirty.size };
}

// Flush queued writes when the tab is backgrounded / closed / comes online.
const RESUME_PULL_AFTER_MS = 2 * 60 * 1000;

async function resumePull() {
  if (!sb || !currentUser || syncing) return;
  if (!navigator.onLine) return;
  if (pullOk && Date.now() - lastPullAt < RESUME_PULL_AFTER_MS) return;
  // Send our own edits first, so the pull can't be what overwrites them.
  if (pullOk && dirty.size > 0) await pushDirty();
  const p = await pullAll();
  if (p.ok) {
    if (p.changed) onRemoteChange(p.changed);
    if (dirty.size > 0) pushDirty();
  }
}

function wireFlushHandlers() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pushDirty();
    // The PWA can sit in memory for days. Without this, a second device's
    // changes never arrive, and this one later uploads its stale copy over them.
    else resumePull();
  });
  window.addEventListener("online", () => { onStatus("pending"); resumePull().then(() => pushDirty()); });
  window.addEventListener("offline", () => onStatus("offline"));
}

/* ---------- Legacy (pre-account) data migration ---------- */

// Data saved before accounts existed lives at the bare, un-namespaced key.
// Only actual *training history* counts as something worth importing. A bare
// settings blob on its own is not history — it can be left behind by config
// seeding, and offering to import it would copy one person's preferences
// (including their API key) into whoever signs in next on that device.
const LEGACY_HISTORY_KEYS = [
  "hyrox.progress", "hyrox.journal", "hyrox.sessionlogs", "hyrox.actuals",
  "hyrox.nutrition", "hyrox.fitness", "hyrox.dailyBurn", "hyrox.tests",
  "hyrox.prs", "hyrox.overrides", "hyrox.userblocks", "hyrox.dayOverrides"
];

function hasContent(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw || raw === "{}" || raw === "null" || raw === "[]") return false;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return false;
    return Object.keys(parsed).length > 0;
  } catch { return false; }
}

export function hasLegacyData() {
  return LEGACY_HISTORY_KEYS.some(hasContent);
}

export async function migrateLegacyData() {
  let moved = 0;
  SYNCED_KEYS.forEach((k) => {
    try {
      const raw = localStorage.getItem(k);
      if (!raw || raw === "{}" || raw === "null") return;
      // Don't clobber data already in this account.
      const existing = store.get(k);
      if (existing && existing !== "{}" && existing !== "null") return;
      store.set(k, raw); // marks dirty → pushes to the account
      moved++;
    } catch { /* skip */ }
  });
  await pushDirty();
  return moved;
}

// Keep the originals as a safety net under a backup prefix, then clear them so
// the import prompt doesn't reappear on every login.
export function archiveLegacyData() {
  SYNCED_KEYS.forEach((k) => {
    try {
      const raw = localStorage.getItem(k);
      if (raw) localStorage.setItem("legacy.backup." + k, raw);
      localStorage.removeItem(k);
    } catch { /* no-op */ }
  });
}

/* ---------- Auth actions ---------- */

export async function signOut() {
  await pushDirty();
  signingOut = true;
  // scope "local": the default is "global", which also revokes the refresh
  // token on every OTHER device — signing out on a laptop would silently log
  // the phone out mid-workout.
  try { await sb.auth.signOut({ scope: "local" }); } catch { /* no-op */ }
  currentUser = null;
  location.reload();
}

/* ---------- Auth UI ---------- */

function authShell(inner) {
  return `
    <div class="auth-wrap">
      <div class="auth-card">
        <div class="auth-logo">🏃</div>
        <h1 class="auth-title">Hyrox Trainer</h1>
        ${inner}
      </div>
    </div>`;
}

// A failed sign-in re-renders the form; without this it wipes what was typed.
let lastEmail = "";
const escAttr = (v) => String(v).replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function fieldRow(id, label, type, placeholder, extra = "") {
  return `
    <label class="auth-label" for="${id}">${label}</label>
    <input class="auth-input" id="${id}" type="${type}" placeholder="${placeholder}"
      autocomplete="${type === "password" ? "current-password" : "email"}"
      autocapitalize="none" autocorrect="off" spellcheck="false"
      ${id === "auth-email" && lastEmail ? `value="${escAttr(lastEmail)}"` : ""} ${extra} />`;
}

/**
 * Supabase hands back whatever the fetch layer threw, so a sleeping or
 * unreachable backend arrives as Safari's bare "Load failed" (Chrome:
 * "Failed to fetch") — which tells the person nothing and looks like they
 * typed something wrong. Name the real problem instead.
 */
function friendlyAuthError(error) {
  const msg = (error && error.message) || "Something went wrong.";
  if (/load failed|failed to fetch|networkerror|network request failed|fetch failed/i.test(msg)) {
    return "Can't reach the server right now. Check your connection and try again in a minute — if it keeps failing, tell whoever shared the app with you.";
  }
  return msg;
}

function renderAuthGate(mode = "signin", message = "") {
  const root = document.getElementById("auth-root");
  if (!root) return;
  root.hidden = false;

  const msgHtml = message
    ? `<div class="auth-msg ${message.startsWith("✓") ? "auth-msg-ok" : "auth-msg-err"}">${escAttr(message)}</div>`
    : "";

  let body = "";
  if (mode === "signin") {
    body = `
      <p class="auth-sub">Sign in to sync your training across devices.</p>
      ${msgHtml}
      ${fieldRow("auth-email", "Email", "email", "you@example.com")}
      ${fieldRow("auth-pass", "Password", "password", "••••••••")}
      <button class="auth-btn" id="auth-submit">Sign in</button>
      <button class="auth-link" id="auth-to-signup">Create an account</button>
      <button class="auth-link auth-link-quiet" id="auth-to-reset">Forgot password?</button>`;
  } else if (mode === "signup") {
    body = `
      <p class="auth-sub">Create your account — your data stays private to you.</p>
      ${msgHtml}
      ${fieldRow("auth-email", "Email", "email", "you@example.com")}
      ${fieldRow("auth-pass", "Password", "password", "At least 8 characters", 'autocomplete="new-password"')}
      <button class="auth-btn" id="auth-submit">Create account</button>
      <button class="auth-link" id="auth-to-signin">I already have an account</button>`;
  } else if (mode === "reset") {
    // This project uses Supabase's built-in mailer, which only delivers to
    // addresses on the project team. Rather than let someone wait forever for
    // an email that will never arrive, say so up front.
    body = `
      <p class="auth-sub">We'll email you a link to set a new password.</p>
      ${msgHtml}
      ${fieldRow("auth-email", "Email", "email", "you@example.com")}
      <button class="auth-btn" id="auth-submit">Send reset link</button>
      <div class="auth-note">Heads up: automated email isn't fully set up for this app yet. If nothing arrives within a few minutes, ask whoever shared the app with you — they can reset your password directly.</div>
      <button class="auth-link" id="auth-to-signin">Back to sign in</button>`;
  } else if (mode === "recover") {
    body = `
      <p class="auth-sub">Choose a new password for your account.</p>
      ${msgHtml}
      ${fieldRow("auth-pass", "New password", "password", "At least 8 characters", 'autocomplete="new-password"')}
      <button class="auth-btn" id="auth-submit">Save new password</button>`;
  }

  root.innerHTML = authShell(body);

  const email = () => {
    const v = (document.getElementById("auth-email")?.value || "").trim();
    if (v) lastEmail = v;
    return v;
  };
  const pass  = () => document.getElementById("auth-pass")?.value || "";
  const busy  = (on, label) => {
    const b = document.getElementById("auth-submit");
    if (b) { b.disabled = on; b.textContent = on ? "Please wait…" : label; }
  };

  document.getElementById("auth-to-signup")?.addEventListener("click", () => renderAuthGate("signup"));
  document.getElementById("auth-to-signin")?.addEventListener("click", () => renderAuthGate("signin"));
  document.getElementById("auth-to-reset")?.addEventListener("click", () => renderAuthGate("reset"));

  const submit = async () => {
    if (mode === "signin") {
      if (!email() || !pass()) return renderAuthGate("signin", "Enter your email and password.");
      busy(true, "Sign in");
      const { error } = await sb.auth.signInWithPassword({ email: email(), password: pass() });
      if (error) return renderAuthGate("signin", friendlyAuthError(error));
      location.reload();
    } else if (mode === "signup") {
      if (!email() || pass().length < 8) {
        return renderAuthGate("signup", "Use a valid email and a password of 8+ characters.");
      }
      busy(true, "Create account");
      const { data, error } = await sb.auth.signUp({ email: email(), password: pass() });
      if (error) return renderAuthGate("signup", friendlyAuthError(error));
      // If email confirmation is ON in Supabase, there's no session yet.
      if (!data.session) {
        return renderAuthGate("signin", "✓ Account created. Check your email to confirm, then sign in.");
      }
      location.reload();
    } else if (mode === "reset") {
      if (!email()) return renderAuthGate("reset", "Enter your email address.");
      busy(true, "Send reset link");
      const redirectTo = location.origin + location.pathname;
      const { error } = await sb.auth.resetPasswordForEmail(email(), { redirectTo });
      if (error) return renderAuthGate("reset", friendlyAuthError(error));
      renderAuthGate("signin", "✓ Reset link sent. Check your email.");
    } else if (mode === "recover") {
      if (pass().length < 8) return renderAuthGate("recover", "Password must be at least 8 characters.");
      busy(true, "Save new password");
      const { error } = await sb.auth.updateUser({ password: pass() });
      if (error) return renderAuthGate("recover", friendlyAuthError(error));
      history.replaceState(null, "", location.pathname + "#/today");
      location.reload();
    }
  };

  document.getElementById("auth-submit")?.addEventListener("click", submit);
  root.querySelectorAll(".auth-input").forEach((el) => {
    el.addEventListener("keydown", (e) => { if (e.key === "Enter") submit(); });
  });
}

function hideAuthGate() {
  const root = document.getElementById("auth-root");
  if (root) { root.hidden = true; root.innerHTML = ""; }
}

/* ---------- Import prompt for pre-account data ---------- */

function askImportLegacy() {
  return new Promise((resolve) => {
    const root = document.getElementById("auth-root");
    if (!root) return resolve(false);
    root.hidden = false;
    root.innerHTML = authShell(`
      <p class="auth-sub">We found training history saved on this device from before you had an account.</p>
      <div class="auth-msg auth-msg-ok" style="text-align:left">Importing copies your sessions, notes, PBs, nutrition and fitness logs into your account — and syncs them to your other devices.</div>
      <button class="auth-btn" id="legacy-import">Import my history</button>
      <button class="auth-link" id="legacy-skip">Skip — start fresh</button>
    `);
    document.getElementById("legacy-import")?.addEventListener("click", async () => {
      const btn = document.getElementById("legacy-import");
      if (btn) { btn.disabled = true; btn.textContent = "Importing…"; }
      const moved = await migrateLegacyData();
      archiveLegacyData();
      console.info(`[sync] migrated ${moved} documents into account`);
      resolve(true);
    });
    document.getElementById("legacy-skip")?.addEventListener("click", () => {
      archiveLegacyData();
      resolve(false);
    });
  });
}

/* ---------- Entry point ---------- */

/**
 * Resolves only once there is a signed-in user and their data is in local
 * cache. app.js awaits this before its first route().
 */
export async function initAuth() {
  sb = initClient();
  if (!sb) {
    const root = document.getElementById("auth-root");
    if (root) {
      root.hidden = false;
      root.innerHTML = authShell(`<div class="auth-msg auth-msg-err">${configError}</div>`);
    }
    return null;
  }

  wireFlushHandlers();

  // Password-recovery links fire this event after the client consumes the URL.
  let recovering = false;
  sb.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") {
      recovering = true;
      renderAuthGate("recover");
    } else if ((event === "TOKEN_REFRESHED" || event === "SIGNED_IN") && currentUser && !pullOk) {
      // We started offline from the cached copy; a session just came back, so
      // load this account's data and send whatever was queued.
      resumePull().then(() => { if (pullOk) pushDirty(); });
    } else if (event === "SIGNED_OUT" && currentUser && !signingOut) {
      // The session was revoked or its refresh token stopped working. Without
      // this the app carried on looking signed in, every push failing with
      // "Sync error" while hours of logs piled up in the queue. Local data and
      // the pending queue are kept; reloading lands on the sign-in screen.
      location.reload();
    }
  });

  let { data: { session }, error: sessionError } = await sb.auth.getSession();

  // A recovery link puts us in a temporary session — force the new-password step.
  if (recovering || /type=recovery/.test(location.hash)) {
    renderAuthGate("recover");
    return null;
  }

  // Offline with an expired token: run from the local copy instead of locking
  // the person out of their own data. Only for an account that has synced here.
  if (!session && looksOffline(sessionError)) {
    const cached = cachedSessionUser();
    if (cached && localCacheLooksReal(cached.id)) session = { user: cached };
  }

  if (!session) {
    // A confirm/reset link that expired or was already used lands here with the
    // reason in the hash. Say so, instead of showing a bare sign-in form.
    const hashErr = /error_description=([^&]+)/.exec(location.hash);
    let note = "";
    if (hashErr) {
      let why = "";
      // A stray "%" makes decodeURIComponent throw, which used to kill boot and
      // leave a blank page — so a bad link must never be able to do that.
      try { why = decodeURIComponent(hashErr[1].replace(/\+/g, " ")); } catch { why = ""; }
      note = !why || /expired|invalid|used/i.test(why)
        ? "That link has expired or was already used. Request a new one with Forgot password."
        : why.slice(0, 200);
      history.replaceState(null, "", location.pathname + location.search);
    }
    renderAuthGate("signin", note);
    return null;
  }

  currentUser = session.user;
  loadPending();
  loadRevs();

  // Pull this account's data into the local cache before the app renders.
  // Retry briefly — a transient failure here used to look like a new account.
  let pull = navigator.onLine ? await pullAll() : { ok: false };
  for (let attempt = 0; !pull.ok && navigator.onLine && attempt < 2; attempt++) {
    await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
    pull = await pullAll();
  }

  // The pull failed. If a previous visit already synced this account here we
  // know it isn't new, so the app can run from that cache (and queue edits)
  // rather than locking you out of your own training at a gym with no signal.
  if (!pull.ok) {
    cacheKnown = localCacheLooksReal();
    onStatus(cacheKnown ? "offline" : "error");
  }

  // Offer to bring across anything saved before accounts existed.
  if (pull.ok && hasLegacyData()) {
    await askImportLegacy();
  }

  hideAuthGate();

  // Clean any auth tokens out of the hash so routing works normally.
  if (location.hash && !location.hash.startsWith("#/")) {
    history.replaceState(null, "", location.pathname + "#/today");
  }

  // Flush anything queued from a previous offline session.
  if (dirty.size > 0) pushDirty();

  return currentUser;
}
