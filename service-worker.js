const APP_VERSION = "2026-05-27-v62-tabs-merge-undo";
const CACHE_NAME = `hyrox-${APP_VERSION}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./auth.js",
  "./supabase-config.js",
  "./plan.json",
  "./plans/hyrox-11week.json",
  "./plans/recipes.json",
  "./vendor/supabase.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-180.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Fetch each asset bypassing HTTP cache so we don't re-cache stale copies.
      await Promise.all(
        CORE_ASSETS.map((url) =>
          fetch(url, { cache: "reload" })
            .then((res) => res.ok && cache.put(url, res))
            .catch(() => {})
        )
      );
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      // Only this app's old caches. github.io serves every project from one
      // origin, and deleting "everything that isn't mine" wiped the others too.
      const oldCaches = keys.filter((k) => k.startsWith("hyrox-") && k !== CACHE_NAME);
      await Promise.all(oldCaches.map((k) => caches.delete(k)));
      await self.clients.claim();

      // Tell open tabs a new version is ready — they show the update banner
      // and let the user choose when to reload. We do NOT call c.navigate()
      // here because that forces a reload mid-load and can leave the page in
      // an unresponsive state (event bindings from the first load get wiped).
      if (oldCaches.length > 0) {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const c of clients) {
          try { c.postMessage("NEW_VERSION"); } catch (e) { /* no-op */ }
        }
      }
    })()
  );
});

// Network-first with a timeout. A weak-signal launch used to hang on the
// network request; now it falls back to the cached copy after a few seconds.
async function networkFirst(req) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 4000);
  try {
    const res = await fetch(req, { signal: ctrl.signal });
    clearTimeout(timer);
    if (res.ok) {
      const copy = res.clone();
      caches.open(CACHE_NAME).then((c) => c.put(req, copy));
      return res;
    }
    // A 5xx (or a captive-portal page) must never replace the good offline
    // copy — and if we have one, it beats showing an error.
    if (res.status >= 500) {
      const cached = await caches.match(req);
      if (cached) return cached;
    }
    return res;
  } catch (err) {
    clearTimeout(timer);
    const cached = await caches.match(req);
    if (cached) return cached;
    throw err;
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // The HTML shell and the programme data go network-first so edits land at
  // once. This includes everything under plans/ — only plan.json used to be
  // matched, so the 11-week plan and the recipes were cache-first and an
  // edited file never reached an installed app without a version bump.
  const isHTML = url.pathname === "/" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  const isPlanData = url.pathname.endsWith("plan.json") || url.pathname.includes("/plans/");
  if (isHTML || isPlanData) {
    event.respondWith(networkFirst(req));
    return;
  }

  // Cache-first for static assets (CSS, JS, icons, the vendored library).
  event.respondWith(
    caches.match(req).then((cached) => cached || fetch(req).then((res) => {
      if (res.ok && url.origin === self.location.origin) {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
      }
      return res;
    }))
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
