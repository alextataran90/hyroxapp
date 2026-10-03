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
  "hyrox.setEntries",
  "hyrox.actuals"
];

/* ---------- Supabase client ---------- */

let sb = null;
let currentUser = null;
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
    try { localStorage.setItem(nsKey(key), value); } catch { /* quota */ }
    if (SYNCED_KEYS.includes(key)) markDirty(key);
  },
  remove(key) {
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

/* ---------- Sync engine ---------- */

let dirty = new Set();
let pushTimer = null;
let syncing = false;
let onStatus = () => {};

export function setSyncStatusHandler(fn) { onStatus = fn || (() => {}); }

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
  savePending();
  schedulePush();
}

function schedulePush() {
  clearTimeout(pushTimer);
  pushTimer = setTimeout(() => { pushDirty(); }, 1200);
}

export async function pushDirty() {
  if (!sb || !currentUser || syncing || dirty.size === 0) return;
  if (!navigator.onLine) { onStatus("offline"); return; }

  syncing = true;
  onStatus("syncing");
  const batch = [...dirty];
  try {
    const rows = batch.map((key) => {
      let parsed = {};
      try { parsed = JSON.parse(store.get(key) || "{}"); } catch { parsed = {}; }
      return { user_id: currentUser.id, key, value: parsed };
    });
    const { error } = await sb.from("user_data").upsert(rows, { onConflict: "user_id,key" });
    if (error) throw error;
    // Only clear the keys we actually pushed — writes during the request stay queued.
    batch.forEach((k) => dirty.delete(k));
    savePending();
    onStatus(dirty.size === 0 ? "synced" : "pending");
  } catch (e) {
    console.warn("[sync] push failed:", e.message || e);
    onStatus("error");
  } finally {
    syncing = false;
  }
}

export async function pullAll() {
  if (!sb || !currentUser) return { pulled: 0 };
  onStatus("syncing");
  try {
    const { data, error } = await sb
      .from("user_data")
      .select("key,value")
      .eq("user_id", currentUser.id);
    if (error) throw error;
    let pulled = 0;
    (data || []).forEach((row) => {
      if (!SYNCED_KEYS.includes(row.key)) return;
      store.setLocalOnly(row.key, JSON.stringify(row.value ?? {}));
      pulled++;
    });
    onStatus(dirty.size === 0 ? "synced" : "pending");
    return { pulled };
  } catch (e) {
    console.warn("[sync] pull failed:", e.message || e);
    onStatus("error");
    return { pulled: 0, error: e };
  }
}

// Flush queued writes when the tab is backgrounded / closed / comes online.
function wireFlushHandlers() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") pushDirty();
  });
  window.addEventListener("online", () => { onStatus("pending"); pushDirty(); });
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
  try { await sb.auth.signOut(); } catch { /* no-op */ }
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

function fieldRow(id, label, type, placeholder, extra = "") {
  return `
    <label class="auth-label" for="${id}">${label}</label>
    <input class="auth-input" id="${id}" type="${type}" placeholder="${placeholder}"
      autocomplete="${type === "password" ? "current-password" : "email"}"
      autocapitalize="none" autocorrect="off" spellcheck="false" ${extra} />`;
}

function renderAuthGate(mode = "signin", message = "") {
  const root = document.getElementById("auth-root");
  if (!root) return;
  root.hidden = false;

  const msgHtml = message
    ? `<div class="auth-msg ${message.startsWith("✓") ? "auth-msg-ok" : "auth-msg-err"}">${message}</div>`
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

  const email = () => (document.getElementById("auth-email")?.value || "").trim();
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
      if (error) return renderAuthGate("signin", error.message);
      location.reload();
    } else if (mode === "signup") {
      if (!email() || pass().length < 8) {
        return renderAuthGate("signup", "Use a valid email and a password of 8+ characters.");
      }
      busy(true, "Create account");
      const { data, error } = await sb.auth.signUp({ email: email(), password: pass() });
      if (error) return renderAuthGate("signup", error.message);
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
      if (error) return renderAuthGate("reset", error.message);
      renderAuthGate("signin", "✓ Reset link sent. Check your email.");
    } else if (mode === "recover") {
      if (pass().length < 8) return renderAuthGate("recover", "Password must be at least 8 characters.");
      busy(true, "Save new password");
      const { error } = await sb.auth.updateUser({ password: pass() });
      if (error) return renderAuthGate("recover", error.message);
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
    }
  });

  const { data: { session } } = await sb.auth.getSession();

  // A recovery link puts us in a temporary session — force the new-password step.
  if (recovering || /type=recovery/.test(location.hash)) {
    renderAuthGate("recover");
    return null;
  }

  if (!session) {
    renderAuthGate("signin");
    return null;
  }

  currentUser = session.user;
  loadPending();

  // Pull this account's data into the local cache before the app renders.
  await pullAll();

  // Offer to bring across anything saved before accounts existed.
  if (hasLegacyData()) {
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
