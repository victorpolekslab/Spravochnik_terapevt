/* Справочник терапевта — офлайн-кэш веб-версии. Версия меняется при любом изменении файлов. */
const VERSION = '202611121103-c388d9b096';
const FILES = ["./", "app.css?h=1a2d314636", "app.js?h=a843f99346", "data_brief.js?h=9d1947f5bd", "data_intl.js?h=e59bc3e9aa", "data_meta.js?h=c38fe98c70", "data_mkb.js?h=d622a23a8f", "data_ref.js?h=fe38c527fe", "data_terms.js?h=d50ec20475", "drugs.js?h=a8e0e7b8a0", "icon-180.png?h=7e09a70b6e", "icon-192.png?h=ce7392dc4a", "icon-512.png?h=3c87e994ac", "icon-maskable-512.png?h=490c4d9679", "index.html?h=cdcafbe272", "manifest.webmanifest?h=077e009353"];
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
  const root = new URL('./', self.location).pathname;
  if (u.pathname.endsWith('/') && u.pathname !== root) return;
  e.respondWith(caches.open(CACHE).then(c => c.match(u.pathname === root ? './' : e.request, { ignoreSearch: true }).then(r => r || fetch(e.request))));
});
