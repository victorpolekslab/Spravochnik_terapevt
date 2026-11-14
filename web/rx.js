/* Справочник терапевта — помощник выписки рецептов.
   Какой бланк (107-1/у, 148-1/у-88, 107/у-НП), сколько можно выписать, какие печати и когда нужна надпись
   «По специальному назначению», плюс образец заполненного бланка.
   Нормы: приказ Минздрава № 1094н (порядок назначения, формы и правила оформления бланков), перечень ПКУ —
   приказ № 459н в ред. № 653н, списки II и III — постановление Правительства № 681. Данные — window.RX (data/rx/rules.json).
   Препарат берётся из справочника препаратов (строка: [ТН, МНН, форма, путь, АТХ, условия отпуска, док]). */
(function () {
  'use strict';
  var low = function (s) { return String(s || '').toLowerCase().replace(/ё/g, 'е').trim(); };
  var parts = function (mnn) { return low(mnn).split(/\s*\+\s*/).map(function (x) { return x.replace(/\s*\[.*?\]\s*/g, ' ').trim(); }).filter(Boolean); };
  // часть МНН соответствует веществу из списка: «морфина гидрохлорида тригидрат» ↔ «морфин»
  var ALIAS = { 'промедол': 'тримеперидин', 'пропионилфенилэтоксиэтилпиперидин': 'просидол', 'хальцион': 'триазолам', 'барбамил': 'амобарбитал' };
  function hit(part, name) {
    var n = low(name);
    for (var k in ALIAS) { if (part.indexOf(k) === 0) part = ALIAS[k] + part.slice(k.length); if (n === k) n = ALIAS[k]; }
    if (!n) return false;
    if (n === 'спирт этиловый') return part === 'этанол' || part.indexOf('спирт этиловый') === 0;
    if (/бутилбромид/.test(part)) return false;          // гиосцина/скополамина бутилбромид не контролируется
    return part.indexOf(n) === 0;
  }
  function entryHit(ps, name) {          // позиция перечня может быть комбинацией: «Оксикодон+налоксон»
    var need = name.split(/\s*\+\s*/).map(function (x) { return low(x).replace(/\s+\d[\d,.]*\s*мг.*$/, ''); }).filter(Boolean);
    if (!need.length) return false;
    if (need.length > 1) return ps.length === need.length && need.every(function (n) { return ps.some(function (p) { return hit(p, n); }); });
    return ps.some(function (p) { return hit(p, need[0]); });
  }
  function find(ps, list, monoOnly) {
    for (var i = 0; i < list.length; i++) {
      var e = list[i], multi = /\+/.test(e[0]);
      if (monoOnly && ps.length > 1 && !multi) continue;
      if (entryHit(ps, e[0])) return e;
    }
    return null;
  }
  function excluded(e, form, route) {     // оговорки перечня ПКУ: «за исключением …»
    var n = e[1] || '', f = low(form);
    if (/суппозитории вагинальные/.test(n) && /суппозит/.test(f) && /вагин/.test(f + ' ' + low(route))) return true;
    if (/интратекальн/.test(n) && /интратекальн/.test(f)) return true;
    if (/наружного применения/.test(n) && /(крем|мазь|гель)/.test(f)) return true;
    if (/суппозитории/.test(n) && !/вагин/.test(n) && /суппозит/.test(f)) return true;
    return false;
  }
  var has = function (ps, n) { return ps.some(function (p) { return hit(p, n); }); };
  var SOLID = /таблет|капсул|драже|пастил|гранул|порош/;

  // ------------------------------------------------------------------ классификация
  function classify(r) {
    var RX = window.RX, L = RX.lists, ps = parts(r[1] || r[0]), form = r[2] || '', route = r[3] || '', atc = r[4] || '';
    var st = low(r[5]), res = { ps: ps, notes: [], app1: [], one: false, dose: '' };
    var stat = /без рецепта/.test(st) ? 'otc' : /рецепт/.test(st) ? 'rx' : /стационар|лечебно-профилакт|специализирован|медицинск(их|ой) организац/.test(st) ? 'hosp' : '';
    res.stat = stat;
    var tts = /трансдермальн|пластыр/.test(low(form));
    var withNalox = has(ps, 'налоксон');
    // приложение 1: предельное количество (наркотические и психотропные списка II)
    RX.app1.forEach(function (a) { if (entryHit(ps, a[0]) && (ps.length > 1) === /\+/.test(a[0])) res.app1.push(a); });
    if (res.app1.length) {     // только строки той же лекарственной формы, что у препарата (пластырь ≠ раствор для инъекций)
      var f = low(form), kind = function (x) { x = low(x); return /пластыр|трансдерм/.test(x) ? 'p' : /спрей/.test(x) ? 'n' : /защеч|подъязыч|сублингв/.test(x) ? 'b' : /инъекц|подкожн|ампул|внутривен/.test(x) ? 'i' : /капли/.test(x) ? 'd' : /раствор/.test(x) ? 'o' : /пролонг|ретард/.test(x) ? 'l' : /таблет|капсул/.test(x) ? 't' : '?'; };
      var same = res.app1.filter(function (a) { return kind(a[1]) === kind(f); });
      res.app1 = same;
    }

    var e, lf = function (list) { return ps.length === 1 ? find(ps, list) : find(ps, list.filter(function (x) { return /\+/.test(x[0]); })); };
    {
      // комбинация с наркотическим средством списка II (кроме кодеина в малых количествах) — тоже список II: омнопон
      if (!lf(L.n2) && ps.length > 1 && !withNalox) { var big = L.n2.filter(function (x) { return !/\+/.test(x[0]) && low(x[0]) !== 'кодеин'; }); if ((e = find(ps.filter(function (p) { return p.indexOf('кодеин') !== 0; }), big))) { res.cat = 'Список II (наркотические и психотропные)'; res.form = 'np'; res.why = 'комбинированный препарат с наркотическим средством списка II'; res.pt = '1094н, п. 8'; return fin(res, r); } }
      if ((e = lf(L.n2)) && stat === 'hosp') { res.form = 'hosp'; res.cat = 'Список II'; res.why = 'по инструкции — для стационаров, пациенту не выписывается'; res.notes.push('Если такой препарат всё же назначается амбулаторно, он выписывается на бланке ' + (tts || withNalox ? '148-1/у-88' : '107/у-НП') + ' (1094н, п. 8–9).'); return fin(res, r); }
      if ((e = lf(L.n2))) {
        res.cat = 'Список II (наркотические и психотропные)';
        if (tts || withNalox) { res.form = '148'; res.why = (tts ? 'трансдермальная терапевтическая система' : 'наркотическое средство в сочетании с антагонистом опиоидных рецепторов') + ' — исключение из бланка 107/у-НП'; res.pt = '1094н, п. 8, п. 9 пп. 1'; }
        else { res.form = 'np'; res.why = 'наркотический или психотропный препарат списка II'; res.pt = '1094н, п. 8'; }
        return fin(res, r);
      }
      if ((e = lf(L.p3))) { res.form = '148'; res.cat = 'Список III (психотропные)'; res.why = 'психотропный препарат списка III'; res.pt = '1094н, п. 9 пп. 1'; return fin(res, r); }
    }
    // комбинированные препараты с малыми количествами — п. 9 пп. 2 и п. 11 пп. 2 (зависит от дозы)
    if (ps.length > 1) {
      var c = combo(ps, form);
      if (c) { res.form = c.form; res.why = c.why; res.dose = c.dose || ''; res.pt = c.pt; res.cat = c.form === '148' ? 'ПКУ (комбинированный, раздел III перечня)' : ''; if (c.form) return fin(res, r); }
    }
    if ((e = find(ps, L.s, true)) && !excluded(e, form, route)) { res.form = '148'; res.cat = 'ПКУ: сильнодействующие вещества (раздел II перечня)'; res.why = 'препарат из перечня ПКУ — ' + e[0].replace(/\s*\(.*$/, ''); res.pt = '1094н, п. 9 пп. 4; 459н, раздел II'; return fin(res, r); }
    if ((e = find(ps, L.o, true)) && !excluded(e, form, route)) { res.form = '148'; res.cat = 'ПКУ: иные лекарственные средства (раздел IV перечня)'; res.why = 'препарат из перечня ПКУ — ' + e[0]; res.pt = '1094н, п. 9 пп. 4; 459н, раздел IV'; return fin(res, r); }
    if (ps.length === 1 && (e = find(ps, L.pre))) { res.form = '148'; res.cat = 'ПКУ: прекурсоры (раздел I перечня)'; res.why = 'препарат из перечня ПКУ — ' + e[0]; res.pt = '1094н, п. 9 пп. 4'; return fin(res, r); }
    if (stat === 'hosp') { res.form = 'hosp'; res.why = 'по инструкции — для медицинских организаций, пациенту не выписывается'; return fin(res, r); }
    if (stat === 'otc') { res.form = 'otc'; res.why = 'по инструкции отпускается без рецепта'; return fin(res, r); }
    res.form = '107'; res.why = stat === 'rx' ? 'рецептурный препарат, не входит в списки II–III и перечень ПКУ' : 'условия отпуска в инструкции не указаны — если препарат рецептурный, бланк 107-1/у';
    res.pt = '1094н, п. 11 пп. 1'; res.unsure = stat !== 'rx';
    return fin(res, r);
  }
  function combo(ps, form) {
    var solid = SOLID.test(low(form));
    var P = '1094н, п. 9 пп. 2 и п. 11 пп. 2';
    if (has(ps, 'кодеин')) return { form: '148', why: 'комбинированный препарат с кодеином (до 20 мг на дозу)', pt: '1094н, п. 9 пп. 2а, з' };
    if (has(ps, 'фенилпропаноламин')) return { form: '148', why: 'комбинированный препарат с фенилпропаноламином', pt: '1094н, п. 9 пп. 2ж' };
    if (has(ps, 'фенобарбитал')) {
      if (has(ps, 'эфедрин')) return { form: '148', why: 'фенобарбитал до 20 мг с эфедрином', pt: '1094н, п. 9 пп. 2и' };
      if (has(ps, 'эрготамин')) return { form: '107', why: 'фенобарбитал до 20 мг с эрготамином', pt: '1094н, п. 11 пп. 2ж' };
      if (solid) return { form: '107', why: 'комбинированный препарат с фенобарбиталом', dose: 'Бланк 107-1/у — при фенобарбитале более 20 и до 50 мг на 1 таблетку; при меньшем количестве действуют условия отпуска из инструкции.', pt: '1094н, п. 11 пп. 2е' };
      return null;     // жидкие формы с малыми количествами (корвалол, валокордин) — по инструкции
    }
    if (has(ps, 'псевдоэфедрин')) return { form: solid ? '' : '148', why: 'комбинированный препарат с псевдоэфедрином', dose: 'Псевдоэфедрин до 30 мг на дозу — 107-1/у; более 30 и до 60 мг — 148-1/у-88 (ПКУ). Сверьте дозировку на упаковке.', pt: P, forms: ['107', '148'] };
    if (has(ps, 'декстрометорфан')) return solid ? { form: '107', why: 'декстрометорфан более 10 и до 30 мг на дозу', dose: 'Твёрдая форма с декстрометорфаном 10–30 мг (и псевдоэфедрином до 30 мг) — 107-1/у; с псевдоэфедрином более 30 мг — 148-1/у-88.', pt: '1094н, п. 11 пп. 2г, д' } : { form: '148', why: 'жидкая форма с декстрометорфаном (до 200 мг на 100 мл)', pt: '1094н, п. 9 пп. 2г' };
    if (has(ps, 'эфедрин')) return { form: solid ? '148' : '', why: 'комбинированный препарат с эфедрином', dose: 'Таблетки до 50 мг эфедрина — 148-1/у-88. Жидкие формы: до 100 мг на 100 мл — 107-1/у, более 100 и до 300 мг — 148-1/у-88.', pt: P, forms: ['107', '148'] };
    if (has(ps, 'хлордиазепоксид')) return { form: '', why: 'комбинированный препарат с хлордиазепоксидом', dose: 'Хлордиазепоксид до 10 мг на дозу — 107-1/у; более 10 и до 20 мг — 148-1/у-88.', pt: P, forms: ['107', '148'] };
    if (has(ps, 'эрготамин')) return { form: '107', why: 'комбинированный препарат с эрготамином (до 5 мг на дозу)', pt: '1094н, п. 11 пп. 2а' };
    return null;
  }
  function fin(res, r) {
    if (!res.form) { res.form = (res.forms || ['107'])[0]; }
    var atc = r[4] || '';
    if (res.form === '107' && /^N0(5A|5B|5C|6A)/.test(atc)) { res.one = true; res.notes.push('Антипсихотики, анксиолитики, снотворные и антидепрессанты (АТХ N05A, N05B, N05C, N06A), не входящие в ПКУ, — только одно наименование на бланке (1094н, прил. 3, п. 15).'); }
    if (res.stat === 'hosp' && res.form !== 'hosp') res.notes.push('По инструкции препарат предназначен для медицинских организаций.');
    if (res.stat === 'otc' && (res.form === '148' || res.form === 'np')) res.notes.push('В инструкции указан отпуск без рецепта, но вещество входит в перечень контроля — действует приказ.');
    return res;
  }

  // ------------------------------------------------------------------ сведения о бланках
  var FORMS = {
    '107': { t: 'Форма № 107-1/у', s: 'обычный рецептурный бланк', valid: '60 дней; при длительном лечении — до 1 года', names: 'до 3 наименований на бланке',
      stamps: ['Штамп медицинской организации (наименование, адрес, телефон) в левом верхнем углу', 'Подпись и личная печать врача', 'Печать «Для рецептов» не обязательна — только вместе с надписью «По специальному назначению»'],
      qty: 'Предельного количества приказ не устанавливает — выписывается на курс лечения.',
      spec: 'При длительном лечении можно установить срок действия до 1 года: надпись «По специальному назначению», срок действия и периодичность отпуска (еженедельно, ежемесячно…), отдельно — подпись врача и печать «Для рецептов».', specPt: '1094н, п. 23',
      blank: 'Можно напечатать на компьютере; заполняется чернилами или шариковой ручкой, подпись — только от руки.' },
    '148': { t: 'Форма № 148-1/у-88', s: 'бланк для психотропных (список III), наркотических в пластырях и с налоксоном, препаратов из перечня ПКУ', valid: '15 дней', names: 'одно наименование на бланке',
      stamps: ['Штамп медицинской организации (наименование, адрес, телефон)', 'Подпись и личная печать врача', 'Печать медицинской организации «Для рецептов» — обязательно'],
      qty: 'Для препаратов из перечня ПКУ — на курс до 30 дней; при хроническом заболевании — до 60 дней.',
      spec: 'Если курс больше 30 дней (до 60 дней при хроническом заболевании) — надпись «По специальному назначению», заверенная подписью врача и печатью «Для рецептов».', specPt: '1094н, п. 24',
      blank: 'Только типографский бланк с серией и номером, учитывается в журнале. Обязательно адрес пациента или номер амбулаторной карты.' },
    'np': { t: 'Форма № 107/у-НП', s: 'специальный рецептурный бланк на наркотическое или психотропное средство', valid: '15 дней', names: 'одно наименование на бланке',
      stamps: ['Штамп медицинской организации (полное наименование, адрес, телефон)', 'Подпись и личная печать врача', 'Ф. И. О. и подпись уполномоченного лица медицинской организации и печать «Для рецептов»'],
      qty: 'Не больше количества из приложения 1 к Порядку назначения (таблица ниже).',
      spec: 'При длительном лечении в рамках первичной медико-санитарной и паллиативной помощи количество можно увеличить не более чем в 2 раза — надпись «По специальному назначению», отдельно заверенная подписью врача и печатью «Для рецептов».', specPt: '1094н, п. 15',
      blank: 'Только типографский бланк с серией и номером. Ф. И. О. пациента и врача — полностью, возраст, номер полиса ОМС и медицинской карты; количество — цифрами и прописью. Исправления не допускаются.' }
  };

  // ------------------------------------------------------------------ количество прописью
  var U = ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять', 'десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  var T = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  var H = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  function words(n) {
    n = Math.floor(n); if (!(n > 0 && n < 1000)) return String(n);
    var h = Math.floor(n / 100), r = n % 100, out = [];
    if (h) out.push(H[h]);
    if (r < 20) { if (r) out.push(U[r]); } else { out.push(T[Math.floor(r / 10)]); if (r % 10) out.push(U[r % 10]); }
    return out.join(' ');
  }

  // ------------------------------------------------------------------ латынь
  // МНН в родительном падеже — RX.lat (tools/rx_latin.py); комбинации и препараты без латинского МНН — торговое
  // наименование латиницей в кавычках (1094н, прил. 3, п. 11: МНН, группировочное или торговое наименование)
  var TRL = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'kh', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
  function translit(s) {
    var t = String(s || '').replace(/[®™*]/g, '').trim().split('').map(function (c) { var l = c.toLowerCase(), r = TRL[l]; return r == null ? c : c === l ? r : r.charAt(0).toUpperCase() + r.slice(1); }).join('');
    return t.replace(/\s+/g, ' ');
  }
  // латынь по МНН: каждое действующее вещество (комбинации — через «+»); нет в словаре — составляется по правилам
  // латинских МНН (флаг auto: показать «проверьте»); МНН не указано — торговое наименование латиницей
  var ANION = { 'гидрохлорид': 'hydrochloridi', 'гидрохлорида': 'hydrochloridi', 'гидробромид': 'hydrobromidi', 'бромид': 'bromidi', 'хлорид': 'chloridi', 'хлорида': 'chloridi', 'йодид': 'iodidi',
    'сульфат': 'sulfatis', 'сульфата': 'sulfatis', 'фосфат': 'phosphatis', 'фосфата': 'phosphatis', 'малеат': 'maleatis', 'фумарат': 'fumaratis', 'тартрат': 'tartratis', 'сукцинат': 'succinatis',
    'ацетат': 'acetatis', 'цитрат': 'citratis', 'лактат': 'lactatis', 'глюконат': 'gluconatis', 'нитрат': 'nitratis', 'мезилат': 'mesilatis', 'бесилат': 'besilatis', 'гидрокарбонат': 'hydrocarbonatis',
    'пропионат': 'propionatis', 'дипропионат': 'dipropionatis', 'валерат': 'valeratis', 'тозилат': 'tosilatis', 'аргинин': 'arginini', 'лизин': 'lysini' };
  var DROP = /^(моно|ди|три|тетра|пента|гекса|гепта|полу|геми|сескви)?гидрат[а]?$|^безводн/;
  var DESCR = /(^|\s)(для|из|человека|экстракт\S*|трав\S*|лист\S*|корн\S*|цвет\S*|плод\S*|вакцин\S*|раствор\S*|аллерген\S*|штамм\S*|вирус\S*|эмульси\S*|фактор|комплекс\S*|масл\S*|сок|настой\S*|сухой|сухие|водн\S*|скота|мозга|пыльц\S*|лизат\S*|бактери\S*)(\s|$)/;
  var CAT = { 'натрия': 'natrii', 'калия': 'kalii', 'кальция': 'calcii', 'магния': 'magnesii', 'железа': 'ferri', 'цинка': 'zinci', 'лития': 'lithii', 'серебра': 'argenti', 'алюминия': 'aluminii' };
  function lword(w) {
    var t = w.replace(/кс/g, 'x').replace(/ц/g, 'c').replace(/х/g, 'ch').replace(/к/g, 'c').replace(/й/g, 'i').replace(/ы/g, 'y').replace(/ф/g, 'f')
      .replace(/^гидро/, 'hydro').replace(/ю/g, 'yu').replace(/я/g, 'ya').replace(/ж/g, 'zh').replace(/ш/g, 'sh').replace(/щ/g, 'sch').replace(/[ъь]/g, '');
    return t.split('').map(function (c) { return TRL[c] != null ? TRL[c] : c; }).join('');
  }
  function autoLat(part) {
    if (DESCR.test(part)) return null;
    var ws = part.split(/\s+/).filter(function (w) { return !DROP.test(w); });
    if (ws.length === 2 && ws[1] === 'кислота') return 'Acidi ' + lword(ws[0].replace(/(ов|ев)ая$/, '').replace(/ная$/, 'n')) + 'ici';
    var out = ws.map(function (w, k) {
      if (CAT[w]) return CAT[w];
      if (k && ANION[w]) return ANION[w];
      if (/^[a-z0-9\-]+$/.test(w)) return w;
      if (ws.length > 1 && !k) w = w.replace(/([бвгджзклмнпрстфхцчшщ])а$/, '$1').replace(/ы$/, 'а');   // «пазопаниба гидрохлорид», «декстрозы моногидрат»
      var g = w.replace(/ия$/, 'ium').replace(/ина$/, 'ин').replace(/ола$/, 'ол').replace(/ама$/, 'ам').replace(/ида$/, 'ид').replace(/ана$/, 'ан').replace(/она$/, 'он');
      var l = lword(g);
      if (/ium$/.test(l)) return l.replace(/ium$/, 'ii');
      if (/oza$/.test(l)) return l.replace(/oza$/, 'osi');
      if (/at$/.test(l)) return l + (k ? 'is' : 'i');
      if (/a$/.test(l)) return l + 'e';
      if (/[bcdfghklmnprstvxz]$/.test(l)) return l + 'i';
      return l;
    }).join(' ');
    return out.charAt(0).toUpperCase() + out.slice(1);
  }
  function latName(r) {
    var m = low(r[1]), L = window.RX.lat || {};
    if (!m) return { t: '"' + translit(r[0]) + '"', inn: false, auto: false };
    var auto = false, bad = false, t = m.split(/\s*[+,]\s*/).map(function (p) {
      p = p.trim(); if (L[p]) return L[p];
      var q = p.split(/\s+/).filter(function (w) { return !DROP.test(w); }).join(' '); if (L[q]) return L[q];
      auto = true; var a = autoLat(p); if (!a) bad = true; return a;
    }).join(' + ');
    if (bad) return { t: '"' + translit(r[0]) + '"', inn: false, auto: false };
    return { t: t, inn: true, auto: auto };
  }
  function latUnits(s) {
    return String(s || '').replace(/мкг/g, 'mcg').replace(/мг/g, 'mg').replace(/мл/g, 'ml').replace(/(\d)\s*г\b/g, '$1 g').replace(/\/\s*час/g, '/h').replace(/\/\s*ч\b/g, '/h').replace(/доза/g, 'dosis').replace(/ЕД/g, 'ED').replace(/МЕ/g, 'ME');
  }
  function latForm(form) {
    var f = low(form);
    if (/пластыр|трансдерм/.test(f)) return ['TTS', 'unit'];
    if (/суппозит/.test(f)) return ['Supp.', 'unit'];
    if (/драже/.test(f)) return ['Dragee', 'unit'];
    if (/капсул/.test(f)) return ['Caps.', 'unit'];
    if (/таблет|пастил/.test(f)) return ['Tab.', 'unit'];
    if (/лиофилизат|порошок для приготовления раствора для (инъекц|инфуз|внутривен)/.test(f)) return ['Pulv.', 'amp'];
    if (/инъекц|внутривен|внутримыш|подкожн|инфуз|концентрат/.test(f)) return ['Sol.', 'amp'];
    if (/капли/.test(f)) return ['Gtt.', 'vol'];
    if (/спрей/.test(f)) return ['Spray', 'vol'];
    if (/аэрозол/.test(f)) return ['Aerosol', 'vol'];
    if (/суспенз/.test(f)) return ['Susp.', 'vol'];
    if (/сироп/.test(f)) return ['Sir.', 'vol'];
    if (/мазь/.test(f)) return ['Ung.', 'vol'];
    if (/крем/.test(f)) return ['Cream.', 'vol'];
    if (/гель/.test(f)) return ['Gel.', 'vol'];
    if (/настойк/.test(f)) return ['Tinct.', 'vol'];
    if (/гранул/.test(f)) return ['Gran.', 'vol'];
    if (/порош/.test(f)) return ['Pulv.', 'vol'];
    if (/раствор/.test(f)) return ['Sol.', 'vol'];
    return ['', 'vol'];
  }
  // строки Rp: [первая строка, вторая строка или ''] — латынь; количество для 107/у-НП дублируется прописью
  function latRp(r, form, dose, n, np) {
    var nm = latName(r), lf = latForm(form), d = dose ? ' ' + latUnits(dose) : ' … mg';
    var q = '№ ' + n + (np ? ' (' + words(n) + ')' : '');
    var head = (lf[0] ? lf[0] + ' ' : '') + nm.t + d;
    if (lf[1] === 'unit') return [head + ' ' + q, '', nm];
    if (lf[1] === 'amp') return [head, 'D.t.d. ' + q + ' in amp.', nm];
    return [head, 'D.t.d. ' + q, nm];
  }

  // ------------------------------------------------------------------ интерфейс
  window.RxClassify = classify;
  window.RxModule = function (host) {
    var esc = host.esc, $ = function (s) { return document.querySelector(s); };
    var DM = host.dm;
    function srcLine() {
      var S = window.RX.src;
      return '<p class="foot">Нормы: ' + Object.keys(S).map(function (k) { return '<a href="' + esc(S[k][1]) + '">' + esc(S[k][0]) + '</a>'; }).join('; ') + '. Сверено ' + esc(window.RX.checked.split('-').reverse().join('.')) +
        '. Форма бланка определяется по МНН и условиям отпуска из инструкции; при сомнении сверьтесь с инструкцией и приказом.</p>';
    }
    function badge(c) {
      var t = { '107': '107-1/у', '148': '148-1/у-88', np: '107/у-НП', otc: 'без рецепта', hosp: 'для стационаров' }[c.form];
      return '<span class="rxb rx-' + c.form + '">' + esc(t) + '</span>';
    }
    // поиск препарата
    function searchPage(q0) {
      host.setTitle('Выписка рецептов', true);
      host.view.innerHTML = '<div class="wrap rx">' +
        '<label class="field rxq">' + host.icon('search') + '<input id="rxq" type="search" placeholder="Препарат: МНН или торговое название" autocomplete="off" spellcheck="false" enterkeyhint="search" value="' + esc(q0 || '') + '"></label>' +
        '<div id="rxres"></div>' + rulesCard() + srcLine() + '</div>';
      var inp = $('#rxq'), t;
      function run() {
        var q = inp.value.trim(), box = $('#rxres'); if (!box) return;
        if (!q) { box.innerHTML = '<p class="meta" style="margin:10px 4px">Найдите препарат — покажу форму бланка, сколько можно выписать, какие нужны печати и образец заполнения.</p>'; return; }
        DM.data().then(function () {
          box = $('#rxres'); if (!box) return;
          var res = DM.search(q, 30);
          if (window.anSearch) window.anSearch('rx', q, res.length);
          box.innerHTML = res.length ? '<ul class="list">' + res.map(function (o) {
            var r = DM.row(o.i), c = classify(r);
            return '<li><a href="#rx/' + o.i + '"><span style="flex:1;min-width:0"><div class="tt">' + esc(r[0]) + '</div><div class="ts">' + esc(r[1] || '—') + ' · ' + esc(r[2]) + '</div></span>' + badge(c) + '</a></li>';
          }).join('') + '</ul>' : '<div class="empty">Не найдено. Попробуйте МНН или начало торгового названия.</div>';
        }).catch(function () { box.innerHTML = '<div class="empty">Справочник препаратов ещё не загружен — нужен интернет при первом открытии.</div>'; });
      }
      inp.addEventListener('input', function () { clearTimeout(t); t = setTimeout(run, 150); });
      run(); if (!q0) inp.focus();
    }
    function rulesCard() {
      return '<details class="card rxrules"><summary><b>Какой бланк когда</b></summary>' +
        '<p><span class="rxb rx-np">107/у-НП</span> наркотические и психотропные списка II (морфин, тримеперидин, фентанил-спрей, бупренорфин в инъекциях…), кроме пластырей и комбинаций с налоксоном. 15 дней, количество — по приложению 1.</p>' +
        '<p><span class="rxb rx-148">148-1/у-88</span> психотропные списка III (диазепам, алпразолам, клоназепам, фенобарбитал, золпидем…), пластыри с фентанилом и бупренорфином, оксикодон + налоксон, все препараты из перечня ПКУ (прегабалин, габапентин, трамадол, тапентадол, феназепам, зопиклон, клонидин, баклофен…), комбинации с кодеином. 15 дней, печать «Для рецептов».</p>' +
        '<p><span class="rxb rx-107">107-1/у</span> остальные рецептурные препараты. 60 дней, при длительном лечении — до 1 года с надписью «По специальному назначению». До 3 наименований на бланке; антидепрессанты, антипсихотики, анксиолитики и снотворные не из ПКУ — по одному.</p>' +
        '<p><b>«По специальному назначению»</b> — надпись на рецепте, отдельно заверенная подписью врача и печатью «Для рецептов». Нужна, когда: на 107-1/у срок действия больше 60 дней (до 1 года); препарат из ПКУ выписан на курс больше 30 дней (до 60); количество из приложения 1 увеличено (до 2 раз).</p>' +
        '<p><b>Льготный рецепт</b> — форма 148-1/у-04(л) (30 дней; пенсионерам, инвалидам I группы, детям-инвалидам и при хронических заболеваниях — 90 дней) выписывается дополнительно к 107/у-НП, 148-1/у-88 или 107-1/у для препаратов из списков и ПКУ.</p></details>';
    }
    // карточка препарата
    function drugPage(i) {
      DM.data().then(function () {
        var r = DM.row(i); if (!r) { host.go('#rx'); return; }
        var c = classify(r), F = FORMS[c.form];
        host.setTitle('Рецепт: ' + r[0], true);
        var h = '<div class="wrap rx"><div class="card rxhead"><b style="font-size:17px">' + esc(r[0]) + '</b><span class="meta">' + esc(r[1] || '—') + ' · ' + esc(r[2]) + (r[4] ? ' · АТХ ' + esc(r[4]) : '') + '</span>' +
          (r[5] ? '<span class="meta">Инструкция: ' + esc(String(r[5]).split('\n')[0]) + '</span>' : '') + '<a class="lnk" href="#drug/' + i + '">Инструкция препарата ›</a></div>';
        if (!F) {
          h += '<div class="card rxform rx-' + c.form + '"><b>' + (c.form === 'otc' ? 'Рецепт не нужен' : 'Пациенту не выписывается') + '</b><span>' + esc(c.why) + '.</span>' +
            (c.form === 'otc' ? '<span class="meta">При желании назначение можно оформить на бланке 107-1/у.</span>' : '') + '</div>';
          host.view.innerHTML = h + c.notes.map(function (n) { return '<div class="card rxnote">' + esc(n) + '</div>'; }).join('') + rulesCard() + srcLine() + '</div>';
          return;
        }
        h += '<div class="card rxform rx-' + c.form + '"><span class="meta">Бланк</span><b class="rxbig">' + esc(F.t) + '</b><span>' + esc(F.s) + '</span>' +
          '<span class="meta">Почему: ' + esc(c.why) + (c.pt ? ' (' + esc(c.pt) + ')' : '') + (c.cat ? '. ' + esc(c.cat) : '') + '</span>' +
          (c.dose ? '<span class="rxwarn">' + esc(c.dose) + '</span>' : '') + (c.unsure ? '<span class="rxwarn">Проверьте в инструкции, рецептурный ли препарат.</span>' : '') + '</div>';
        h += '<div class="card"><div class="rxkv"><span>Срок действия</span><b>' + esc(F.valid) + '</b><span>Наименований</span><b>' + esc(c.one ? 'одно на бланке' : F.names) + '</b></div></div>';
        var qty = c.app1.length ? 'Не больше количества из приложения 1 к Порядку назначения для этой лекарственной формы (таблица ниже).' : c.form === 'np' ? 'Для этой лекарственной формы приложение 1 предельного количества не устанавливает.' : F.qty;
        h += '<div class="card"><b>Сколько можно выписать</b><span>' + esc(qty) + '</span>' + app1Table(c) + '</div>';
        h += '<div class="card"><b>Печати и подписи</b><ul class="rxul">' + F.stamps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul><span class="meta">' + esc(F.blank) + '</span></div>';
        var sp = c.app1.length && c.form === '148' ? [FORMS.np.spec + ' ' + F.spec, FORMS.np.specPt + '; ' + F.specPt] : [F.spec, F.specPt];
        h += '<div class="card rxspec"><b>«По специальному назначению»</b><span>' + esc(sp[0]) + '</span><span class="meta">' + esc(sp[1]) + '</span></div>';
        h += c.notes.map(function (n) { return '<div class="card rxnote">' + esc(n) + '</div>'; }).join('');
        h += '<h2 class="sec-h">Образец заполнения</h2>' + controls(r, c) + '<div id="rxblank"></div>' + srcLine() + '</div>';
        host.view.innerHTML = h;
        bindControls(r, c);
      }).catch(function () { host.view.innerHTML = '<div class="empty">Справочник препаратов ещё не загружен — нужен интернет при первом открытии.</div>'; });
    }
    function app1Table(c) {
      if (!c.app1.length) return '';
      return '<table class="rxt"><thead><tr><th>Форма и дозировка</th><th>На 1 рецепт</th></tr></thead><tbody>' + c.app1.map(function (a) {
        return a[2].map(function (d, k) { return '<tr><td>' + (k ? '' : '<b>' + esc(a[0]) + '</b>, ' + esc(a[1]) + '<br>') + esc(d[0]) + '</td><td>' + esc(d[1]) + '</td></tr>'; }).join('');
      }).join('') + '</tbody></table><span class="meta">Приложение 1 к Порядку назначения (1094н). При длительном лечении — до 2 раз больше с надписью «По специальному назначению» (п. 15).</span>';
    }
    // параметры образца
    function unitOf(form) { var f = low(form); return /капсул/.test(f) ? 'капс.' : /таблет|драже/.test(f) ? 'табл.' : /пластыр|трансдерм/.test(f) ? 'пластыр.' : /ампул|инъекц|инфуз/.test(f) ? 'амп.' : /суппозит/.test(f) ? 'супп.' : 'уп.'; }
    function controls(r, c) {
      var a = c.app1[0], def = a ? a[2][0] : null;
      var long = c.form === '107' ? 'Длительное лечение: срок действия до 1 года' : c.form === '148' && !c.app1.length ? 'Хроническое заболевание: курс больше 30 дней (до 60)' : 'Длительное лечение: количество больше приложения 1 (до 2 раз)';
      return '<div class="card rxctl">' +
        (c.app1.length ? '<label>Дозировка<select id="rxd">' + c.app1.map(function (x, k) { return x[2].map(function (d, j) { return '<option value="' + k + ':' + j + '">' + esc(x[1] + ', ' + d[0]) + '</option>'; }).join(''); }).join('') + '</select></label>'
          : '<label>Дозировка<input id="rxd" type="text" placeholder="например, 75 мг" value=""></label>') +
        '<label>Количество (' + esc(unitOf(r[2])) + ')<input id="rxn" type="number" min="1" max="999" value="' + (def ? def[2] : c.form === '148' ? 28 : 30) + '"></label>' +
        '<label class="rxw">Способ применения<input id="rxs" type="text" value="' + esc(signa(r)) + '"></label>' +
        '<label class="rxcb"><input id="rxl" type="checkbox"> ' + esc(long) + '</label>' +
        (c.form === '107' ? '<label class="rxw" id="rxpw" hidden>Срок и периодичность<input id="rxp" type="text" value="1 год, отпуск ежемесячно"></label>' : '') +
        '<span id="rxmsg" class="rxwarn" hidden></span></div>';
    }
    function signa(r) {
      var f = low(r[2]);
      if (/пластыр|трансдерм/.test(f)) return 'Наклеивать по 1 пластырю на кожу каждые 72 часа';
      if (/капсул/.test(f)) return 'Внутрь по 1 капсуле 2 раза в день';
      if (/таблет|драже/.test(f)) return 'Внутрь по 1 таблетке 1 раз в день';
      if (/капли.*глаз|глазн/.test(f)) return 'По 1 капле в оба глаза 2 раза в день';
      if (/инъекц|ампул/.test(f)) return 'По 1 мл подкожно при боли, не чаще 4 раз в сутки';
      return 'По схеме: доза, кратность, длительность';
    }
    function bindControls(r, c) {
      var upd = function () { $('#rxblank').innerHTML = blank(r, c, read(r, c)); };
      ['#rxd', '#rxn', '#rxs', '#rxl', '#rxp'].forEach(function (s) { var el = $(s); if (el) el.addEventListener(el.type === 'checkbox' || el.tagName === 'SELECT' ? 'change' : 'input', upd); });
      var dsel = $('#rxd');
      if (dsel && dsel.tagName === 'SELECT') dsel.addEventListener('change', function () { var o = read(r, c); if (o.max) $('#rxn').value = o.max; upd(); });
      var l = $('#rxl'); if (l) l.addEventListener('change', function () { var p = $('#rxpw'); if (p) p.hidden = !l.checked; upd(); });
      upd();
    }
    function read(r, c) {
      var o = { n: Math.max(1, Math.min(999, parseInt($('#rxn').value, 10) || 1)), s: $('#rxs').value.trim(), long: $('#rxl').checked, per: $('#rxp') ? $('#rxp').value.trim() : '' };
      var d = $('#rxd');
      if (d.tagName === 'SELECT') { var k = d.value.split(':'), a = c.app1[+k[0]], x = a[2][+k[1]]; o.dose = x[0]; o.formTxt = a[1]; o.max = x[2]; o.maxTxt = x[1]; }
      else { o.dose = d.value.trim(); o.formTxt = r[2]; }
      var msg = '';
      if (o.max) {
        if (o.n > o.max * 2) msg = 'Больше двойного количества из приложения 1 (' + o.max * 2 + ') выписывать нельзя.';
        else if (o.n > o.max && !o.long) msg = 'Больше ' + o.max + ' — только при длительном лечении с надписью «По специальному назначению» (отметьте галочку).';
      }
      var m = $('#rxmsg'); m.hidden = !msg; m.textContent = msg;
      o.spec = o.long || (o.max && o.n > o.max);
      return o;
    }
    // образец бланка
    function blank(r, c, o) {
      var today = new Date(), dd = ('0' + today.getDate()).slice(-2), mm = ['января', 'февраля', 'марта', 'апреля', 'мая', 'июня', 'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря'][today.getMonth()], yy = String(today.getFullYear()).slice(-2);
      var L = latRp(r, o.formTxt || r[2], o.dose, o.n, c.form === 'np');
      var rp = esc(L[0]) + (L[1] ? '<br>' + esc(L[1]) : '');
      var ds = 'D.S. ' + esc(o.s || '…');
      var ink = function (s) { return '<span class="ink">' + s + '</span>'; };
      var stampMO = '<div class="rb-mo">' + (c.form === 'np' ? 'ГБУЗ ТО «Городская поликлиника № 1»' : 'ГБУЗ ТО «Городская поликлиника № 1»') + '<br>г. Тюмень, ул. Примерная, 1<br>тел. (3452) 00-00-00</div>';
      var seal = function (cls, txt) { return '<span class="rb-seal ' + cls + '">' + txt + '</span>'; };
      var doctorSeal = seal('doc', 'ВРАЧ<br>ПЕТРОВА<br>А. С.');
      var forRx = seal('rx', 'ДЛЯ<br>РЕЦЕПТОВ');
      var spec = o.spec ? '<div class="rb-spec">' + ink('По специальному назначению' + (c.form === '107' && o.long && o.per ? ', ' + esc(o.per) : '')) + '<span class="rb-sig">' + ink('<i>Петрова</i>') + '</span>' + forRx + '</div>' : '';
      var h;
      if (c.form === '107') {
        h = '<div class="rb-top"><div>Министерство здравоохранения<br>Российской Федерации' + stampMO + '</div><div class="rb-r">Код формы по ОКУД ________<br>Код учреждения по ОКПО ______<br><b>Медицинская документация<br>Форма № 107-1/у</b><br>Утверждена приказом Минздрава России<br>от 24 ноября 2021 г. № 1094н</div></div>' +
          '<div class="rb-title">РЕЦЕПТ</div><div class="rb-c">(<u>взрослый</u>, детский — нужное подчеркнуть)</div>' +
          '<div class="rb-c">«' + ink(dd) + '» ' + ink(mm) + ' 20' + ink(yy) + ' г.</div>' +
          '<div class="rb-l">Фамилия, инициалы имени и отчества пациента ' + ink('Иванов И. И.') + '</div>' +
          '<div class="rb-l">Дата рождения ' + ink('12.03.1958') + '</div>' +
          '<div class="rb-l">Фамилия, инициалы имени и отчества лечащего врача ' + ink('Петрова А. С.') + '</div>' +
          '<div class="rb-rp"><span class="rb-rk">руб. | коп.</span><div>Rp.: ' + ink(rp) + '<br>' + ink(ds) + '</div></div>' +
          '<div class="rb-rp"><span class="rb-rk">руб. | коп.</span><div>Rp.: <span class="rb-z">Z</span>' + (c.one ? ' <span class="meta">(для этой группы — одно наименование на бланке, свободные строки прочёркиваются)</span>' : '') + '</div></div>' +
          '<div class="rb-rp"><span class="rb-rk">руб. | коп.</span><div>Rp.: <span class="rb-z">Z</span></div></div>' +
          '<div class="rb-sign">Подпись и печать лечащего врача ' + ink('<i>Петрова</i>') + doctorSeal + '<span class="rb-mp">М.П.</span></div>' + spec +
          '<div class="rb-l">Рецепт действителен в течение ' + (o.long ? '60 дней, <u>до 1 года</u> (' + ink(esc((o.per || '').split(',')[0] || '365 дней')) + ')' : '<u>60 дней</u>, до 1 года (______)') + '</div>';
      } else if (c.form === '148') {
        h = '<div class="rb-top"><div>Министерство здравоохранения<br>Российской Федерации' + stampMO + '</div><div class="rb-r">Код формы по ОКУД 3108805<br><b>Медицинская документация<br>Форма № 148-1/у-88</b><br>Утверждена приказом Минздрава России<br>от 24 ноября 2021 г. № 1094н</div></div>' +
          '<div class="rb-ser">Серия <b>ХХ</b> № <b>000000</b> <span class="meta">(типографский)</span></div>' +
          '<div class="rb-title">РЕЦЕПТ</div><div class="rb-c">«' + ink(dd) + '» ' + ink(mm) + ' 20' + ink(yy) + ' г. <span class="meta">(дата оформления)</span><br>(<u>взрослый</u>, детский — нужное подчеркнуть)</div>' +
          '<div class="rb-l">Фамилия, инициалы имени и отчества пациента ' + ink('Иванов И. И.') + '</div>' +
          '<div class="rb-l">Дата рождения ' + ink('12.03.1958') + '</div>' +
          '<div class="rb-l">Адрес места жительства или № медицинской карты ' + ink('г. Тюмень, ул. Примерная, д. 2, кв. 3') + '</div>' +
          '<div class="rb-l">Фамилия, инициалы имени и отчества лечащего врача ' + ink('Петрова А. С.') + '</div>' +
          '<div class="rb-rp big"><span class="rb-rk">руб. | коп.</span><div>Rp.: ' + ink(rp) + '<br>' + ink(ds) + '</div></div>' +
          '<div class="rb-sign">Подпись и печать лечащего врача ' + ink('<i>Петрова</i>') + doctorSeal + forRx + '<span class="rb-mp">М.П.</span></div>' + spec +
          '<div class="rb-l"><b>Рецепт действителен в течение 15 дней</b></div>';
      } else {
        h = '<div class="rb-top"><div>Министерство здравоохранения<br>Российской Федерации' + stampMO + '</div><div class="rb-r">Код формы по ОКУД ________<br><b>Медицинская документация<br>Форма № 107/у-НП</b><br>утверждена приказом Минздрава России<br>от 24.11.2021 № 1094н</div></div>' +
          '<div class="rb-title">РЕЦЕПТ</div><div class="rb-ser">Серия <b>ХХ</b> № <b>000000</b> <span class="meta">(типографский)</span></div>' +
          '<div class="rb-c">«' + ink(dd) + '» ' + ink(mm) + ' 20' + ink(yy) + ' г. <span class="meta">(дата выписки)</span><br>(<u>взрослый</u>, детский — нужное подчеркнуть)</div>' +
          '<div class="rb-l">Фамилия, имя, отчество пациента ' + ink('Иванов Иван Иванович') + '</div>' +
          '<div class="rb-l">Возраст ' + ink('68 лет') + '</div>' +
          '<div class="rb-l">Серия и номер полиса ОМС ' + ink('0000 0000 0000 0000') + '</div>' +
          '<div class="rb-l">Номер медицинской карты ' + ink('12345') + '</div>' +
          '<div class="rb-l">Фамилия, имя, отчество лечащего врача ' + ink('Петрова Анна Сергеевна') + '</div>' +
          '<div class="rb-rp big"><div>Rp.: ' + ink(rp) + '<br>' + ink(ds) + '</div></div>' +
          '<div class="rb-sign">Подпись и личная печать врача ' + ink('<i>Петрова</i>') + doctorSeal + '<span class="rb-mp">М.П.</span></div>' +
          '<div class="rb-sign">Ф. И. О. и подпись уполномоченного лица медицинской организации ' + ink('Сидорова Е. В. <i>Сидорова</i>') + forRx + '<span class="rb-mp">М.П.</span></div>' + spec +
          '<div class="rb-l">Отметка аптечной организации об отпуске ____________</div>' +
          '<div class="rb-l"><b>Срок действия рецепта 15 дней</b></div>';
      }
      return '<div class="rb rb-' + c.form + '"><div class="rb-wm">ОБРАЗЕЦ</div>' + h + '</div>' +
        '<p class="meta" style="margin:8px 4px 0">Rp. — по МНН на латыни, в родительном падеже' + (L[2].auto ? ' (<b>латинское название составлено автоматически — проверьте написание</b>)' : '') + (!L[2].inn ? ' — МНН в справочнике не указано, показано торговое наименование; впишите МНН' : '') + '; способ применения (D.S.) — на русском (1094н, п. 16 и прил. 3, п. 11). Синим — что вписывает врач. Ф. И. О., адрес, медицинская организация и печати условные. Дозу и способ применения указывайте по назначению и инструкции препарата.</p>';
    }
    return {
      route: function (a) { if (a) drugPage(+a); else searchPage(''); },
      classify: classify, badge: badge
    };
  };
})();
