/* Service worker: la app abre aunque no haya internet y se actualiza sola.
   Primero intenta internet (para traer cambios); si no hay señal usa la copia guardada.
   Si cambias algo y quieres forzar que se borre lo guardado, sube el número de VERSION. */
const VERSION = "v4";
const SHELL = "yebra-" + VERSION;
const CORE = ["./", "index.html", "app.css", "app.js", "seed.js", "manifest.webmanifest",
  "icons/apple-touch-icon.png", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== SHELL).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

function timeout(ms) { return new Promise((_, rej) => setTimeout(rej, ms)); }

self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // Google Sheets va directo

  e.respondWith((async () => {
    const c = await caches.open(SHELL);
    try {
      const res = await Promise.race([fetch(req, { cache: "no-cache" }), timeout(3500)]);
      if (res && res.ok) c.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await c.match(req, { ignoreSearch: true }) || (req.mode === "navigate" ? await c.match("index.html") : null);
      if (hit) return hit;
      return fetch(req);
    }
  })());
});
