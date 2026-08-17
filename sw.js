/* Escovedo Binder - service worker
   index.html e sw.js: rede primeiro (cache so' como rede de seguranca offline)
   dados, icone, manifest: cache primeiro (mudam raramente, sao grandes)         */
const V = 'binder-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon.svg',
               './data/cards.json', './data/pokedex.json'];
const STATIC = /(\.json|\.svg|\.webmanifest)$/;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(n => n !== V).map(n => caches.delete(n))))
    .then(() => self.clients.claim()));
});

self.addEventListener('message', e => {
  if (e.data === 'skip-waiting') self.skipWaiting();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin !== location.origin) return;        // imagens das cartas vao pro IndexedDB

  const cacheFirst = STATIC.test(u.pathname);

  if (cacheFirst) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(r => {
        const copy = r.clone();
        caches.open(V).then(c => c.put(req, copy)).catch(() => {});
        return r;
      }))
    );
    return;
  }

  // rede primeiro: sempre pega a versao publicada mais recente quando ha internet
  e.respondWith(
    fetch(req).then(r => {
      const copy = r.clone();
      caches.open(V).then(c => c.put(req, copy)).catch(() => {});
      return r;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
