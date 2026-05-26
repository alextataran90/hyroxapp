const APP_VERSION = "2026-05-26-v26-day-summary-cards";
const CACHE_NAME = `hyrox-${APP_VERSION}`;
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
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
      const oldCaches = keys.filter((k) => k !== CACHE_NAME);
      await Promise.all(oldCaches.map((k) => caches.delete(k)));
      await self.clients.claim();

      // If we just cleaned up an old cache, force any open tab to reload so it
      // picks up the new HTML/CSS/JS instead of the stale cached copies.
      if (oldCaches.length > 0) {
        const clients = await self.clients.matchAll({ type: "window" });
        for (const c of clients) {
          try { await c.navigate(c.url); } catch (e) { /* no-op */ }
        }
      }
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Always network-first for plan.json AND for the HTML shell, so updates land
  // immediately. Static assets (CSS, JS, icons) stay cache-first for offline.
  const isHTML = url.pathname === "/" || url.pathname.endsWith("/index.html") || url.pathname.endsWith("/");
  const isPlan = url.pathname.endsWith("plan.json");
  if (isHTML || isPlan) {
    event.respondWith(
      fetch(req).then((res) => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then((c) => c.put(req, clone));
        return res;
      }).catch(() => caches.match(req))
    );
    return;
  }

  // Cache-first for static assets.
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
