const VERSION = 'portfoy-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
const CDN = ['cdn.jsdelivr.net', 'www.gstatic.com'];
const NEVER = ['firebaseio.com', 'googleapis.com', 'frankfurter.app', 'frankfurter.dev', 'exchangerate-api.com']; // canlı veri: asla önbellekleme

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (NEVER.some(h => url.hostname.endsWith(h))) return;
  if (url.origin === location.origin) {
    // uygulama kabuğu: önce ağ, olmazsa önbellek (güncellemeler hemen gelsin)
    e.respondWith(fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html'))));
  } else if (CDN.includes(url.hostname)) {
    // Chart.js / Firebase SDK: önbellekten ver, arkada yenile
    e.respondWith(caches.open(VERSION).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(r => { if (r.ok) c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    })));
  }
});
