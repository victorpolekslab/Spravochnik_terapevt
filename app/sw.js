/* Справочник терапевта — офлайн-кэш веб-версии. Версия меняется при любом изменении файлов. */
const VERSION = '202611120659-64e925f3eb';
const FILES = ["./", "app.css?h=3d977c51e1", "app.js?h=00ce1e9d85", "data_brief.js?h=9d1947f5bd", "data_meta.js?h=f088414472", "data_mkb.js?h=d622a23a8f", "data_ref.js?h=fe38c527fe", "data_terms.js?h=d50ec20475", "icon-180.png?h=7e09a70b6e", "icon-192.png?h=ce7392dc4a", "icon-512.png?h=3c87e994ac", "icon-maskable-512.png?h=490c4d9679", "index.html?h=2d7ad7de08", "manifest.webmanifest?h=077e009353"];
const CACHE = 'terapevt-' + VERSION;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(FILES.map(u => fetch(u, { cache: 'reload' }).then(r => {
    if (!r.ok) throw new Error(u + ' ' + r.status);
    return c.put(u.split('?')[0], r);
  }))))); // первая установка активируется сразу; обновление ждёт кнопки «Применить» (message 'skip')
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('terapevt-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => { if (e.data === 'skip') self.skipWaiting(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(u.pathname.endsWith('/') ? './' : e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))));
});
