// Smoke-test stand-in for the Supabase client (see tests/README.md). Serves a seeded account so the
// REAL boot path, router and renderers run, with no network and no real data.
(function () {
  // No service worker in the harness: a stale cached app.js would make every
  // result below describe code that isn't on disk.
  if (navigator.serviceWorker) {
    navigator.serviceWorker.register = () => Promise.resolve();
    navigator.serviceWorker.getRegistrations().then((rs) => rs.forEach((r) => r.unregister()));
  }
  if (window.caches) caches.keys().then((ks) => ks.forEach((k) => caches.delete(k)));
  // Capture everything from the very first tick so boot-time failures aren't missed.
  // The page also tries to load the gitignored config.js (which holds a real API
  // key on the owner's machine). Refuse it: tests must be hermetic.
  try { Object.defineProperty(window, "HYROX_CONFIG", { value: undefined, writable: false, configurable: false }); } catch { /* already set */ }
  window.__errs = [];
  window.addEventListener("error", (e) => window.__errs.push("ERR " + e.message + " @" + (e.filename || "").split("/").pop() + ":" + e.lineno));
  window.addEventListener("unhandledrejection", (e) => window.__errs.push("REJ " + ((e.reason && (e.reason.stack || e.reason.message)) || e.reason)));
  const q = new URLSearchParams(location.search);

  // Controllable clock — `?now=2026-10-06T10:00:00` — so mid-programme screens
  // can be exercised regardless of the real date.
  const now = q.get("now");
  if (now) {
    const Real = Date, off = new Real(now).getTime() - Real.now();
    class FakeDate extends Real {
      constructor(...a) { if (a.length === 0) super(Real.now() + off); else super(...a); }
      static now() { return Real.now() + off; }
    }
    window.Date = FakeDate;
  }

  const emptyAccount = q.get("seed") === "empty";
  const meal = (id, label, kcal, p, c, f) => ({
    id, label, time: "12:00", source: "manual",
    items: [{ name: "Test food " + id, qtyNum: 100, unit: "g", kcal, p, c, f }],
    total: { kcal, p, c, f }
  });

  const rows = emptyAccount ? [] : [
    ["hyrox.settings", q.get("prog") === "19" ? {
      programId: "hyrox-19week", startDate: "2026-05-18", raceDate: "2026-09-26", onboarded: true,
      nutrition: { geminiKey: "AIzaSmokeTestKeyNotReal", kcalTarget: 2400, proteinTarget: 190, carbTarget: 270, fatTarget: 60 }
    } : {
      programId: "hyrox-11week", startDate: "2026-08-03", raceDate: "2026-10-18",
      onboarded: true,
      nutrition: { geminiKey: "AIzaSmokeTestKeyNotReal", kcalTarget: 2400, proteinTarget: 190,
                   carbTarget: 270, fatTarget: 60 }
    }],
    ["hyrox.progress", q.get("progress")
      ? { sessions: { "W1.W01S1": { completedAt: "2026-08-06T18:00:00Z", rpe: 6 },
                      "W10.W10S1": { completedAt: "2026-10-05T18:00:00Z", rpe: 8 } }, blocks: {} }
      : { sessions: {}, blocks: {} }],
    ["hyrox.nutrition", {
      "2026-10-05": { meals: [meal("m1", "breakfast", 547, 40, 59, 16), meal("m2", "lunch", 620, 58, 67, 12)] },
      "2026-10-04": { meals: [meal("m3", "dinner", 635, 60, 71, 9)] }
    }],
    ["hyrox.dailyBurn", { "2026-10-05": { moveKcal: 3200, updatedAt: "2026-10-05T20:00:00Z" } }],
    ["hyrox.savedMeals", {
      sm1: { id: "sm1", name: "Oats & whey", label: "breakfast", createdAt: "2026-10-01T08:00:00Z",
             items: [{ name: "Oats", qtyNum: 60, unit: "g", kcal: 230, p: 8, c: 40, f: 4 }] }
    }],
    ["hyrox.pantry", "chicken, rice, broccoli"]
  ];

  const user = { id: "00000000-0000-0000-0000-000000000001", email: "smoke@test.local" };

  // A tiny controllable "server" that models what the sync layer relies on:
  // every row carries a revision (updated_at) that changes on each write,
  // updates can be conditional on it, and inserting an existing key conflicts.
  let tick = 0;
  const stamp = () => `2026-01-01T00:00:00.${String(++tick).padStart(6, "0")}+00:00`;
  const clone = (v) => (v === undefined ? undefined : JSON.parse(JSON.stringify(v)));

  const fake = window.__fake = {
    rows: rows.map(([key, value]) => ({ key, value, updated_at: stamp() })),
    pullFail: q.get("pullfail") === "1",
    pushFail: false,
    pushDelay: Number(q.get("pushdelay") || 0),
    upserts: [],          // the key of every write that reached the "server", in order
    authListeners: [],
    emitAuth(event) { fake.authListeners.forEach((cb) => cb(event, { user })); },
    // Simulate ANOTHER device writing: fn receives a copy of the value, returns the new one.
    external(key, fn) {
      const r = fake.rows.find((x) => x.key === key);
      if (r) { r.value = fn(clone(r.value)); r.updated_at = stamp(); }
      else fake.rows.push({ key, value: fn(undefined), updated_at: stamp() });
    }
  };
  window.__fakeWrites = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function builder() {
    const qy = { op: "select", filters: [], payload: null, single: false };
    const api = {
      select() { return api; },                                  // columns are irrelevant here
      update(v) { qy.op = "update"; qy.payload = v; return api; },
      insert(v) { qy.op = "insert"; qy.payload = v; return api; },
      eq(col, val) { qy.filters.push([col, val]); return api; },
      maybeSingle() { qy.single = true; return api; },
      then(resolve, reject) { return run().then(resolve, reject); }
    };
    const matches = (r) => qy.filters.every(([c, v]) => c === "user_id" || r[c] === v);

    async function run() {
      if (qy.op === "select") {
        if (fake.pullFail) return { data: null, error: { message: "Failed to fetch" } };
        const hit = fake.rows.filter(matches).map((r) => ({ key: r.key, value: clone(r.value), updated_at: r.updated_at }));
        return qy.single ? { data: hit[0] || null, error: null } : { data: hit, error: null };
      }
      if (fake.pushDelay) await sleep(fake.pushDelay);
      if (fake.pushFail) return { data: null, error: { message: "simulated push failure" } };
      if (qy.op === "update") {
        const hit = fake.rows.filter(matches);
        hit.forEach((r) => { r.value = clone(qy.payload.value); r.updated_at = stamp(); fake.upserts.push([r.key]); window.__fakeWrites.push({ key: r.key, value: r.value }); });
        return { data: hit.map((r) => ({ updated_at: r.updated_at })), error: null };
      }
      if (qy.op === "insert") {
        const { key, value } = qy.payload;
        if (fake.rows.some((r) => r.key === key)) return { data: null, error: { code: "23505", message: "duplicate key" } };
        const row = { key, value: clone(value), updated_at: stamp() };
        fake.rows.push(row);
        fake.upserts.push([key]); window.__fakeWrites.push({ key, value: row.value });
        return { data: [{ updated_at: row.updated_at }], error: null };
      }
      return { data: null, error: { message: "unsupported in fake" } };
    }
    return api;
  }

  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: async () => {
            if (q.get("expired")) {
              // Access token expired and no network to refresh it: supabase-js gives
              // null, but leaves its stored session (and our data) on the device.
              try { localStorage.setItem("sb-fake-auth-token", JSON.stringify({ user })); } catch { /* ignore */ }
              return { data: { session: null }, error: { message: "Failed to fetch" } };
            }
            return { data: { session: q.get("anon") ? null : { user } } };
          },
          onAuthStateChange: (cb) => { (fake.authListeners = fake.authListeners || []).push(cb); return { data: { subscription: { unsubscribe() {} } } }; },
          signOut: async () => ({}), signInWithPassword: async () => ({ error: null }),
          signUp: async () => ({ data: { session: null }, error: null }),
          resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ error: null })
        },
        from: () => builder()
      };
    }
  };
})();
