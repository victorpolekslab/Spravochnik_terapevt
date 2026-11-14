/* Справочник терапевта — офлайн-кэш веб-версии. Версия меняется при любом изменении файлов. */
const VERSION = '202611141535-b47cfc168e';
const FILES = ["./", "app.css?h=5cb3b6515c", "app.js?h=84dadc3444", "data_brief.js?h=9d1947f5bd", "data_intl.js?h=eaf8469705", "data_meta.js?h=6aacfec3ad", "data_mkb.js?h=b10b88aedc", "data_ref.js?h=8411adc669", "data_rx.js?h=bf5ea0273c", "data_terms.js?h=d50ec20475", "drugs.js?h=c09a4c9a2e", "icon-180.png?h=c3c71aa63f", "icon-192.png?h=5028c8331e", "icon-512.png?h=56d616cc27", "icon-maskable-512.png?h=f32df9ff86", "index.html?h=399c24e15e", "manifest.webmanifest?h=077e009353", "route_addr.js?h=39bfd0c555", "route_data.js?h=4bb42aecb7", "rx.js?h=b35b42b7aa"];
const PFX = 'terapevt-' + new URL('./', self.location).pathname + '@';
const CACHE = PFX + VERSION;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(u => fetch(u, { cache: 'reload' }).then(r => {
    if (!r.ok) throw new Error(u + ' ' + r.status);
    return c.put(u.split('?')[0], r);
  }))))); // первая установка активируется сразу; обновление ждёт кнопки «Применить» (message 'skip')
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => (k.startsWith(PFX) && k !== CACHE) || /^terapevt-\d/.test(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  const root = new URL('./', self.location).pathname;
  if (u.pathname.endsWith('/') && u.pathname !== root) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(u.pathname === root ? './' : e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))));
});
