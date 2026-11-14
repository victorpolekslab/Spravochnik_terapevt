/**
 * «Справочник терапевта» — анонимная статистика использования и обратная связь в Google Таблицу.
 *
 * Установка (один раз, ~5 минут):
 *  1. script.google.com → «Новый проект» → удалить пример → вставить этот код целиком.
 *  2. В строке READ_KEY ниже заменить ВСТАВЬТЕ_СВОЙ_КЛЮЧ на любой длинный пароль (латиница и цифры) — это ключ автора,
 *     с ним в приложении открывается экран «Статистика».
 *  3. Сохранить (дискета). Вверху выбрать функцию setup → «Выполнить» → разрешить доступ.
 *     В «Журнале выполнения» появится ссылка на созданную таблицу.
 *  4. «Развернуть» → «Новое развёртывание» → тип «Веб-приложение»; «Запуск от имени»: Я; «У кого есть доступ»: Все → «Развернуть».
 *  5. Скопировать URL веб-приложения (…/exec) и прислать в чат разработки.
 *
 * Что приходит:
 *  - лист «Использование»: случайный номер устройства, версия, платформа, событие (открытие, раздел, поиск) — без имён и контактов;
 *  - лист «Обратная связь»: тип, текст, контакт (если пользователь сам его указал), версия, платформа, экран.
 *    О каждом новом сообщении приходит письмо владельцу скрипта (NOTIFY = true).
 * Чтение (экран «Статистика» в приложении) — только с ключом READ_KEY.
 */
const READ_KEY = 'ВСТАВЬТЕ_СВОЙ_КЛЮЧ';
const NOTIFY = true;                       // письмо о каждом новом отзыве
const TZ = 'Asia/Yekaterinburg';
const EV_HEAD = ['Получено', 'Время', 'Устройство', 'Версия', 'Платформа', 'Событие', 'Что', 'Число'];
const FB_HEAD = ['Получено', 'Устройство', 'Тип', 'Сообщение', 'Контакт', 'Версия', 'Платформа', 'Экран', 'Статус'];

function book_() {
  const bound = SpreadsheetApp.getActiveSpreadsheet();
  if (bound) return bound;
  const pr = PropertiesService.getScriptProperties(), id = pr.getProperty('SHEET_ID');
  if (id) { try { return SpreadsheetApp.openById(id); } catch (e) {} }
  const ss = SpreadsheetApp.create('Справочник терапевта — статистика и отзывы');
  pr.setProperty('SHEET_ID', ss.getId());
  return ss;
}
function sheet_(name, head) {
  const ss = book_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name); sh.appendRow(head); sh.setFrozenRows(1); sh.getRange(1, 1, 1, head.length).setFontWeight('bold');
    const def = ss.getSheetByName('Лист1') || ss.getSheetByName('Sheet1'); if (def && ss.getSheets().length > 1) ss.deleteSheet(def);
  }
  return sh;
}
/** Запустите один раз вручную: выдаст разрешения и создаст таблицу. */
function setup() { sheet_('Использование', EV_HEAD); const sh = sheet_('Обратная связь', FB_HEAD); Logger.log('Таблица: ' + sh.getParent().getUrl()); }

const clean_ = (v, re, n) => { v = String(v == null ? '' : v); return re.test(v) ? v.slice(0, n) : ''; };
const text_ = (v, n) => String(v == null ? '' : v).replace(/[\u0000-\u0008\u000b-\u001f]/g, ' ').replace(/^[=+\-@]+/, '').trim().slice(0, n);
function out_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d && d.op === 'ev') return evPut_(d);
    if (d && d.op === 'fb') return fbPut_(d);
    return out_({ ok: false, err: 'op' });
  } catch (err) { return out_({ ok: false, err: String(err) }); }
}

function doGet(e) {
  const p = (e && e.parameter) || {};
  if ((p.key || '') !== READ_KEY || READ_KEY === 'ВСТАВЬТЕ_СВОЙ_КЛЮЧ') return out_({ ok: false, err: 'key' });
  if (p.op === 'usage') return out_(usage_(Math.max(1, Math.min(365, Number(p.days) || 30))));
  if (p.op === 'feedback') return out_(feedback_(Math.max(1, Math.min(500, Number(p.n) || 100))));
  return out_({ ok: true, sheet: book_().getUrl() });
}

// ---------------------------------------------------------------- использование
function evPut_(d) {
  const dev = clean_(d.dev, /^[a-z0-9]{12}$/, 12);
  if (!dev || !Array.isArray(d.ev)) return out_({ ok: false });
  const v = text_(d.v, 24), p = clean_(d.p, /^[a-z]{1,10}$/, 10), now = new Date(), rows = [];
  d.ev.slice(0, 500).forEach(x => {
    if (!Array.isArray(x)) return;
    const t = Number(x[0]), ev = String(x[1] || '');
    if (!(t > 1.7e9 && t < now.getTime() / 1000 + 86400) || ['open', 'view', 'search'].indexOf(ev) < 0) return;
    let k = text_(x[2], 60);
    if (ev !== 'search' && !/^[\w:.\-]{0,60}$/.test(k)) return;
    const n = x[3] === '' || x[3] == null ? '' : Math.max(0, Math.min(100000, Math.floor(Number(x[3]) || 0)));
    rows.push([now, new Date(t * 1000), dev, v, p, ev, k, n]);
  });
  if (rows.length) {
    const sh = sheet_('Использование', EV_HEAD), lock = LockService.getScriptLock(); lock.waitLock(10000);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, EV_HEAD.length).setValues(rows);
    lock.releaseLock();
  }
  return out_({ ok: true, n: rows.length });
}

function usage_(days) {
  const sh = sheet_('Использование', EV_HEAD), n = sh.getLastRow() - 1;
  const res = { ok: true, sheet: sh.getParent().getUrl(), days: days, devices: 0, today: 0, avgDay: 0, newDev: 0, daily: [], views: [], searches: [], empty: [], hours: new Array(24).fill(0), versions: [], platforms: [] };
  if (n < 1) return res;
  const since = Date.now() - days * 86400000, fmt = d => Utilities.formatDate(d, TZ, 'yyyy-MM-dd');
  const vals = sh.getRange(2, 2, n, 7).getValues();   // Время, Устройство, Версия, Платформа, Событие, Что, Число
  const devs = {}, first = {}, perDay = {}, views = {}, searches = {}, empty = {}, today = fmt(new Date());
  vals.forEach(r => {
    const t = r[0] instanceof Date ? r[0] : new Date(r[0]), dev = r[1];
    if (!first[dev] || t < first[dev]) first[dev] = t;
    if (!(t.getTime() >= since)) return;
    const day = fmt(t), ev = r[4], k = String(r[5]);
    const D = devs[dev] = devs[dev] || { last: 0, v: '', p: '' };
    if (t.getTime() >= D.last) { D.last = t.getTime(); D.v = String(r[2]); D.p = String(r[3]); }
    (perDay[day] = perDay[day] || {})[dev] = 1;
    if (ev === 'open') res.hours[Number(Utilities.formatDate(t, TZ, 'H'))]++;
    if (ev === 'view') { const V = views[k] = views[k] || { n: 0, d: {} }; V.n++; V.d[dev] = 1; }
    if (ev === 'search') {
      const S = searches[k] = searches[k] || { n: 0, d: {} }; S.n++; S.d[dev] = 1;
      if (r[6] === 0 || r[6] === '0') { const E = empty[k] = empty[k] || { n: 0, d: {} }; E.n++; E.d[dev] = 1; }
    }
  });
  const ids = Object.keys(devs);
  res.devices = ids.length;
  res.newDev = ids.filter(i => first[i].getTime() >= since).length;
  for (let i = days - 1; i >= 0; i--) { const day = fmt(new Date(Date.now() - i * 86400000)); res.daily.push([day, Object.keys(perDay[day] || {}).length]); }
  res.today = Object.keys(perDay[today] || {}).length;
  const active = res.daily.filter(x => x[1] > 0);
  res.avgDay = active.length ? Math.round(active.reduce((a, x) => a + x[1], 0) / active.length * 10) / 10 : 0;
  const top = (o, m) => Object.keys(o).map(k => [k, o[k].n, Object.keys(o[k].d).length]).sort((a, b) => b[1] - a[1]).slice(0, m);
  res.views = top(views, 40); res.searches = top(searches, 30); res.empty = top(empty, 30);
  const cnt = f => { const c = {}; ids.forEach(i => { const k = f(devs[i]) || '?'; c[k] = (c[k] || 0) + 1; }); return Object.keys(c).map(k => [k, c[k]]).sort((a, b) => b[1] - a[1]); };
  res.versions = cnt(D => D.v); res.platforms = cnt(D => D.p);
  return res;
}

// ---------------------------------------------------------------- обратная связь
function fbPut_(d) {
  const dev = clean_(d.dev, /^[a-z0-9]{12}$/, 12), msg = text_(d.msg, 3000);
  if (!dev || msg.length < 3) return out_({ ok: false, err: 'empty' });
  const c = CacheService.getScriptCache(), ck = 'fb' + dev, cnt = Number(c.get(ck) || 0);
  if (cnt >= 10) return out_({ ok: false, err: 'limit' });   // не больше 10 сообщений в час с одного устройства
  c.put(ck, String(cnt + 1), 3600);
  const kind = ['wish', 'bug', 'other'].indexOf(d.kind) >= 0 ? { wish: 'Пожелание', bug: 'Ошибка', other: 'Другое' }[d.kind] : 'Другое';
  const row = [new Date(), dev, kind, msg, text_(d.contact, 120), text_(d.v, 24), clean_(d.p, /^[a-z]{1,10}$/, 10), text_(d.scr, 80), 'новое'];
  const sh = sheet_('Обратная связь', FB_HEAD), lock = LockService.getScriptLock(); lock.waitLock(10000);
  sh.appendRow(row); lock.releaseLock();
  if (NOTIFY) {
    try {
      MailApp.sendEmail(Session.getEffectiveUser().getEmail(), 'Справочник терапевта: ' + kind.toLowerCase(),
        msg + '\n\n' + (row[4] ? 'Контакт: ' + row[4] + '\n' : '') + 'Версия: ' + row[5] + ' · ' + row[6] + (row[7] ? ' · экран ' + row[7] : '') + '\nТаблица: ' + sh.getParent().getUrl());
    } catch (e) {}
  }
  return out_({ ok: true });
}

function feedback_(n) {
  const sh = sheet_('Обратная связь', FB_HEAD), last = sh.getLastRow();
  if (last < 2) return { ok: true, sheet: sh.getParent().getUrl(), items: [] };
  const from = Math.max(2, last - n + 1), vals = sh.getRange(from, 1, last - from + 1, FB_HEAD.length).getValues();
  return { ok: true, sheet: sh.getParent().getUrl(), items: vals.reverse().map(r => ({ at: r[0], kind: r[2], msg: r[3], contact: r[4], v: r[5], p: r[6], scr: r[7], st: r[8] })) };
}
