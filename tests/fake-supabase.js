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

  // A tiny controllable "server". Writes land in `rows` so a later pull sees
  // them, and delay/failure can be flipped at runtime to stage race conditions.
  const fake = window.__fake = {
    rows: rows.map(([key, value]) => ({ key, value })),
    pullFail: q.get("pullfail") === "1",
    pushFail: false,
    pushDelay: Number(q.get("pushdelay") || 0),
    upserts: []          // every batch that reached the "server", in order
  };
  window.__fakeWrites = [];

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const builder = () => ({
    select() { return this; },
    async eq() {
      if (fake.pullFail) return { data: null, error: { message: "Failed to fetch" } };
      return { data: JSON.parse(JSON.stringify(fake.rows)), error: null };
    },
    async upsert(r) {
      if (fake.pushDelay) await sleep(fake.pushDelay);
      if (fake.pushFail) return { error: { message: "simulated push failure" } };
      fake.upserts.push(r.map((x) => x.key));
      window.__fakeWrites.push(...r);
      r.forEach((x) => {
        const hit = fake.rows.find((y) => y.key === x.key);
        const v = JSON.parse(JSON.stringify(x.value));
        if (hit) hit.value = v; else fake.rows.push({ key: x.key, value: v });
      });
      return { error: null };
    }
  });

  window.supabase = {
    createClient() {
      return {
        auth: {
          getSession: async () => ({ data: { session: q.get("anon") ? null : { user } } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
          signOut: async () => ({}), signInWithPassword: async () => ({ error: null }),
          signUp: async () => ({ data: { session: null }, error: null }),
          resetPasswordForEmail: async () => ({ error: null }), updateUser: async () => ({ error: null })
        },
        from: () => builder()
      };
    }
  };
})();
