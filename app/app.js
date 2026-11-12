'use strict';
/* Справочник терапевта. Данные: META, BRIEF, REF, TERMS, MKB (data_*.js). Мост Android: window.Native. */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const view = $('#view');
const N = window.Native || null;
const LS = {
  get(k, d) { try { const v = localStorage.getItem('ter_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('ter_' + k, JSON.stringify(v)); } catch (e) {} }
};
const dt = s => s ? String(s).split('-').reverse().join('.') : '';
const plural = (n, a, b, c) => { const m = Math.abs(n) % 100, k = m % 10; return (m > 10 && m < 20) ? c : k === 1 ? a : (k >= 2 && k <= 4) ? b : c; };
const ICO = {
  star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
  heart: 'M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.5-7 10-7 10z',
  kidney: 'M9 3c-3 0-5 3-5 7s2 7 5 7c1.5 0 2-1 2-2.5V12c0-1-.5-1.5-1.5-1.5M15 3c3 0 5 3 5 7s-2 7-5 7c-1.5 0-2-1-2-2.5V12c0-1 .5-1.5 1.5-1.5M11 17v4M13 17v4',
  lung: 'M12 3v8M8 11c-3 0-4 3-4 6 0 2 1 3 3 3s3-2 3-4v-5M16 11c3 0 4 3 4 6 0 2-1 3-3 3s-3-2-3-4v-5',
  drop: 'M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11zM9.5 14.5a2.5 2.5 0 0 0 2.5 2.5',
  gut: 'M9 3v4c0 2-4 3-4 7a6 6 0 0 0 6 6h2a5 5 0 0 0 5-5c0-3-3-4.5-5.5-4.5H12c-1 0-1.5-.8-1.5-1.8V3',
  bone: 'M8.5 8.5l7 7M8.5 8.5A2.5 2.5 0 1 0 5 5a2.5 2.5 0 1 0 3.5 3.5zM15.5 15.5A2.5 2.5 0 1 0 19 19a2.5 2.5 0 1 0-3.5-3.5z',
  brain: 'M12 5a3 3 0 0 0-5.5-.5A3 3 0 0 0 4 9a3 3 0 0 0 .5 5A3 3 0 0 0 8 19a3 3 0 0 0 4 0zM12 5a3 3 0 0 1 5.5-.5A3 3 0 0 1 20 9a3 3 0 0 1-.5 5A3 3 0 0 1 16 19a3 3 0 0 1-4 0',
  old: 'M11 3.5a2 2 0 1 1 0 .1M10 8h3l1.5 5M10 8l-2 5v7M13 13l1 7M17 12v8M17 12c0-1 1-1.5 1.8-1',
  search: 'M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13zM15.5 15.5L20 20',
  chev: 'M9 6l6 6-6 6', plus: 'M12 5v14M5 12h14', minus: 'M7 12h10', left: 'M15 6l-6 6 6 6', check: 'M5 12l5 5 9-10',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  pill: 'M10.5 20.5a5 5 0 0 1-7-7l7-7a5 5 0 0 1 7 7zM7 10l7 7'
};
const svg = (k, extra = '') => `<svg viewBox="0 0 24 24" aria-hidden="true" ${extra}><path d="${ICO[k] || k}"/></svg>`;
const SYS = [
  ['fav', 'Избранное', 'Избранное', 'star', '#F6E4E3', '#A8322F'],
  ['heart', 'Сердечно-<br>сосудистая', 'Сердечно-сосудистая система', 'heart', '#FBE7E6', '#A8322F'],
  ['kidney', 'Мочевыде-<br>лительная', 'Мочевыделительная система', 'kidney', '#FDF0D9', '#8F5400'],
  ['lung', 'Дыхатель-<br>ная', 'Дыхательная система', 'lung', '#E3EEFB', '#1F5FA8'],
  ['drop', 'Эндокрин-<br>ная', 'Эндокринная система и обмен веществ', 'drop', '#FDEBDD', '#A84B0C'],
  ['gut', 'Пищевари-<br>тельная', 'Пищеварительная система', 'gut', '#E4F2E8', '#22643C'],
  ['bone', 'Костно-<br>мышечная', 'Костно-мышечная система', 'bone', '#ECEAE6', '#5A5044'],
  ['brain', 'Нервная<br>и психика', 'Нервная система и психика', 'brain', '#E0F2F2', '#1D6A6B'],
  ['old', 'Гериатрия', 'Гериатрия', 'old', '#EFE8F8', '#6A3FA0']
];
const SYSM = Object.fromEntries(SYS.map(s => [s[0], s]));
const PLANNED = {
  heart: 'SCORE2, шкала Уэллса, NYHA и тест 6-минутной ходьбы, лодыжечно-плечевой индекс', kidney: '—', lung: 'mMRC, CAT, ACT, CRB-65, Центор/МакАйзек, индекс пачко-лет',
  drop: 'FINDRISC', gut: 'FIB-4, Чайлд–Пью, MELD, AUDIT', bone: 'FRAX', brain: 'HADS, PHQ-9, GAD-7', old: '«Возраст не помеха», Мини-Ког'
};

/* ---------------------------------------------------------------- мост и сеть */
const CB = {}; let cbn = 0;
function nfetch(url) {
  return new Promise((res, rej) => {
    if (N && N.fetch) { const id = 'r' + (++cbn); CB[id] = { res, rej }; N.fetch(id, url); }
    else fetch(url).then(r => r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))).then(res, rej);
  });
}
function openUrl(u) { if (N && N.openUrl) N.openUrl(u); else window.open(u, '_blank', 'noopener'); }
function info() { try { return N && N.info ? JSON.parse(N.info()) : {}; } catch (e) { return {}; } }
window.App = {
  native(id, ok, body) { const c = CB[id]; if (!c) return; delete CB[id]; ok ? c.res(body) : c.rej(new Error(body)); },
  back() { if (!$('#sheet').hidden) { closeSheet(); return true; } if (location.hash && location.hash !== '#home') { history.back(); return true; } return false; },
  otaReady() { banner('Загружено обновление данных', 'Применить', () => N && N.reload()); },
  otaChecked(pending) {
    const b = $('#upd'); if (b) b.textContent = pending ? 'Обновление загружено — нажмите «Применить» вверху' : 'Новых обновлений нет';
    if (pending) App.otaReady();
  }
};
function banner(text, btn, fn) {
  const b = $('#banner'); b.hidden = false;
  b.innerHTML = `<span>${esc(text)}</span>${btn ? `<button>${esc(btn)}</button>` : ''}`;
  if (btn) b.querySelector('button').onclick = fn;
}

/* ---------------------------------------------------------------- калькуляторы */
const KRL = (id, sec) => ({ id, sec });
const T = { ok: 'var(--t-ok)', warn: 'var(--t-warn)', bad: 'var(--t-bad)' };
const CALCS = {
  ckdepi: {
    t: 'СКФ (CKD-EPI)', s: 'расчётная СКФ и стадия ХБП', sys: 'kidney', kr: KRL('469_3', 'Приложение А3, табл. 6 разд. 1.5'),
    inputs: [
      { id: 'sex', type: 'seg', label: 'Пол', options: [['m', 'Мужчина'], ['f', 'Женщина']], def: 'm' },
      { id: 'age', type: 'num', label: 'Возраст', unit: 'лет', min: 18, max: 110 },
      { id: 'cr', type: 'creat', label: 'Креатинин крови' }
    ],
    calc(v) {
      const age = +v.age, cr = creatUmol(v);
      if (!(age >= 18 && cr > 0)) return null;
      const s = cr / 88.4;
      let g;
      if (v.sex === 'f') g = 144 * Math.pow(0.993, age) * Math.pow(s / 0.7, cr <= 62 ? -0.328 : -1.21);
      else g = 141 * Math.pow(0.993, age) * Math.pow(s / 0.9, cr <= 80 ? -0.412 : -1.21);
      const st = g >= 90 ? ['С1', 'высокая или оптимальная', 'ok'] : g >= 60 ? ['С2', 'незначительно сниженная', 'ok'] : g >= 45 ? ['С3а', 'умеренно сниженная', 'warn'] : g >= 30 ? ['С3б', 'существенно сниженная', 'warn'] : g >= 15 ? ['С4', 'резко сниженная', 'bad'] : ['С5', 'терминальная почечная недостаточность', 'bad'];
      const tips = [{ t: 'Стадия — по СКФ. Диагноз ХБП ставят при сохранении снижения СКФ или маркёров повреждения почек более 3 месяцев; для полной стадии нужна альбуминурия (А1–А4).', s: 'КР469_3, разд. 1.5, табл. 6–7' }];
      if (g < 60) tips.push({ t: 'Для подбора доз ПОАК рассчитайте клиренс креатинина по Кокрофту–Голту — в исследованиях ПОАК использовали его.', s: 'КР382_2, разд. 2.5', calc: 'crcl' });
      tips.push({ t: 'Когда точность СКФ по креатинину снижена (крайние значения массы тела, мышечной массы, диеты), КР рекомендует СКФ по цистатину С.', s: 'КР469_3, разд. 2.3 · УУР A · УДД 1' });
      return { big: Math.round(g), unit: 'мл/мин/1,73 м²', side: ['стадия', st[0]], tone: st[2], v1: 'ХБП ' + st[0] + ' по СКФ: ' + st[1], v2: 'CKD-EPI (2009), формула из прил. А3 КР469_3', grade: 'УУР A · УДД 1', tips };
    }
  },
  crcl: {
    t: 'Клиренс креатинина', s: 'Кокрофт–Голт · дозы ПОАК', sys: 'kidney', kr: KRL('382_2', 'разд. 2.5, табл. П7'),
    inputs: [
      { id: 'sex', type: 'seg', label: 'Пол', options: [['m', 'Мужчина'], ['f', 'Женщина']], def: 'm' },
      { id: 'age', type: 'num', label: 'Возраст', unit: 'лет', min: 18, max: 110 },
      { id: 'wt', type: 'num', label: 'Масса тела', unit: 'кг', min: 25, max: 300 },
      { id: 'cr', type: 'creat', label: 'Креатинин крови' }
    ],
    calc(v) {
      const age = +v.age, wt = +v.wt, cr = creatUmol(v);
      if (!(age >= 18 && wt > 0 && cr > 0)) return null;
      let k = (140 - age) * wt * 88.4 / (72 * cr); if (v.sex === 'f') k *= 0.85;
      const r = Math.round(k);
      const band = r >= 80 ? '≥ 80' : r >= 50 ? '50–80' : r >= 30 ? '30–50' : r >= 15 ? '15–30' : '< 15';
      const tone = r >= 50 ? 'ok' : r >= 30 ? 'warn' : 'bad';
      const v1 = r < 15 ? 'ПОАК не показаны' : r < 30 ? 'Дабигатран не показан; ПОАК-ингибиторы Xa — со сниженной дозой' : r < 50 ? 'Проверьте критерии снижения доз ПОАК' : 'Полные дозы ПОАК при отсутствии других критериев снижения';
      const tips = [
        { t: 'Сниженные дозы по КР382_2: апиксабан 2,5 мг × 2 — при КК 15–29 или ≥ 2 из: возраст ≥ 80, масса ≤ 60 кг, креатинин ≥ 133 мкмоль/л; ривароксабан 15 мг — при КК 15–49; эдоксабан 30 мг — при КК 15–49, массе ≤ 60 кг или сильных ингибиторах P-gp; дабигатран 110 мг × 2 — старше 80 лет, с верапамилом, по решению врача при КК 30–50.', s: 'КР382_2, разд. 3.1.1' },
        { t: 'Срок отмены ПОАК перед операцией зависит от КК — см. справочник «ПОАК перед плановой операцией».', s: 'КР382_2, табл. П7', ref: 'poak_periop' },
        { t: 'Как часто контролировать функцию почек на ПОАК: 1 раз в год; 75 лет и старше — раз в 6 мес; при КК < 60 — раз в (КК/10) мес' + (r < 60 ? ` — для этого пациента примерно раз в ${Math.max(1, Math.round(r / 10))} мес.` : '.'), s: 'КР382_2, табл. П8' }
      ];
      return { big: r, unit: 'мл/мин', side: ['диапазон табл. П7', band], tone, v1, v2: 'Формула Кокрофта–Голта (1976), фактическая масса тела' + (v.sex === 'f' ? ', × 0,85 для женщин' : ''), grade: 'ЕОК IA · УУР B · УДД 2', tips };
    }
  },
  bmi: {
    t: 'ИМТ', s: 'индекс массы тела, степень ожирения', sys: 'drop', kr: KRL('28_3', 'разд. 1.5, табл. 1'),
    inputs: [{ id: 'wt', type: 'num', label: 'Масса тела', unit: 'кг', min: 20, max: 350 }, { id: 'ht', type: 'num', label: 'Рост', unit: 'см', min: 100, max: 230 }],
    calc(v) {
      const w = +v.wt, h = +v.ht / 100; if (!(w > 0 && h > 1)) return null;
      const b = w / h / h;
      const B = [[18.5, 'Дефицит массы тела', 'warn', 'низкий (повышен риск других заболеваний)'], [25, 'Нормальная масса тела', 'ok', 'обычный'], [30, 'Избыточная масса тела', 'warn', 'повышенный'], [35, 'Ожирение I степени', 'bad', 'высокий'], [40, 'Ожирение II степени', 'bad', 'очень высокий'], [1e9, 'Ожирение III степени', 'bad', 'чрезвычайно высокий']];
      const c = B.find(x => b < x[0]);
      return { big: b.toFixed(1).replace('.', ','), unit: 'кг/м²', side: null, tone: c[2], v1: c[1], v2: 'Риск сопутствующих заболеваний: ' + c[3] + '. Классификация ВОЗ 1997 г.', grade: '', tips: [
        { t: 'Для лиц монголоидной расы пороги ниже: ожирение 1 ст. — ИМТ ≥ 27,5, 2 ст. — ≥ 32,5, 3 ст. — ≥ 37,5; абдоминальное ожирение — ОТ ≥ 80 см у женщин, ≥ 90 см у мужчин.', s: 'КР28_3, разд. 2 · УУР C · УДД 5' },
        { t: 'Стадия ожирения (0–2) определяется по наличию и тяжести осложнений, а не только по ИМТ.', s: 'КР28_3, табл. 2' }] };
    }
  },
  chads: {
    t: 'CHA₂DS₂-VASc', s: 'риск инсульта при ФП', sys: 'heart', kr: KRL('382_2', 'разд. 3.1.1, табл. П3 прил. Г1'),
    inputs: [
      { id: 'sex', type: 'seg', label: 'Пол', options: [['m', 'Мужчина'], ['f', 'Женщина · +1']], def: 'm' },
      { id: 'age', type: 'seg', label: 'Возраст', options: [['0', 'до 65'], ['1', '65–74 · +1'], ['2', '≥ 75 · +2']], def: '0' },
      { id: 'f', type: 'bools', items: [['c', 'ХСН / дисфункция ЛЖ', 'C', 1], ['h', 'Артериальная гипертония', 'H', 1], ['d', 'Сахарный диабет', 'D', 1], ['s', 'Инсульт, ТИА или системная эмболия', 'S₂ · в анамнезе', 2], ['v', 'Сосудистое заболевание', 'V · ИМ, атеросклероз артерий ног, бляшка в аорте', 1]] }
    ],
    calc(v) {
      let sc = +(v.age || 0) + (v.sex === 'f' ? 1 : 0) + sumBools(v, 'f', this.inputs[2].items);
      const R = ['0%', '1,3%', '2,2%', '3,2%', '4,0%', '6,7%', '9,8%', '9,6%', '12,5%', '15,2%'];
      const hi = v.sex === 'f' ? 3 : 2;
      let r;
      if (sc >= hi) r = ['bad', 'Показаны пероральные антикоагулянты постоянно', v.sex === 'f' ? 'Женщины: ≥ 3 баллов' : 'Мужчины: ≥ 2 баллов', 'ЕОК IA · УУР B · УДД 2'];
      else if (sc === hi - 1) r = ['warn', 'Рассмотреть антикоагулянты', (v.sex === 'f' ? 'Женщины: 2 балла' : 'Мужчины: 1 балл') + ' — с учётом риска кровотечений и предпочтений пациента', 'ЕОК IIaB · УУР B · УДД 2'];
      else r = ['ok', 'Антикоагулянты и антиагреганты не рекомендованы', 'Нет факторов риска тромбоэмболических осложнений', 'УУР C · УДД 4'];
      const tips = [];
      if (sc >= hi - 1) {
        tips.push({ t: 'До назначения оцените риск кровотечения и активно ищите модифицируемые факторы.', s: 'КР382_2, разд. 3', calc: 'hasbled' });
        tips.push({ t: 'Рассчитайте клиренс креатинина по Кокрофту–Голту — нужен для выбора ПОАК и дозы.', s: 'КР382_2, критерии качества', calc: 'crcl' });
        tips.push({ t: 'Обсудите отказ от алкоголя: на фоне антикоагулянтов он значительно повышает риск внутричерепного кровоизлияния.', s: 'КР382_2, разд. 3' });
      } else tips.push({ t: 'Баллы растут с возрастом и новыми диагнозами — пересчитывайте при изменениях.', s: 'КР382_2, табл. П3' });
      if (v.f && (v.f.h || v.f.d)) tips.push({ t: 'АД, ЛПНП и гликемия — до целевых значений; спросите о храпе и остановках дыхания во сне.', s: 'КР382_2, разд. 3, 1.2' });
      tips.push({ t: 'Шкала не применяется при умеренном и тяжёлом митральном стенозе и механических протезах клапанов; при ГКМП и амилоидозе антикоагулянты показаны независимо от баллов.', s: 'КР382_2, разд. 3' });
      return { big: sc, unit: plural(sc, 'балл', 'балла', 'баллов'), side: ['риск инсульта', '≈ ' + R[Math.min(sc, 9)] + ' в год'], tone: r[0], v1: r[1], v2: r[2], grade: r[3], tips };
    }
  },
  hasbled: {
    t: 'HAS-BLED', s: 'риск кровотечения на антикоагулянтах', sys: 'heart', kr: KRL('382_2', 'табл. П4 прил. Г1'),
    inputs: [{ id: 'f', type: 'bools', items: [
      ['h', 'Гипертония', 'H · систолическое АД > 160 мм рт. ст.', 1], ['ar', 'Нарушение функции почек', 'A · диализ, трансплантация почки, креатинин ≥ 200 мкмоль/л', 1],
      ['al', 'Нарушение функции печени', 'A · цирроз или билирубин > 2 норм с АСТ/АЛТ/ЩФ > 3 норм', 1], ['s', 'Инсульт в анамнезе', 'S', 1],
      ['b', 'Кровотечение в анамнезе или предрасположенность', 'B · геморрагический диатез, анемия', 1], ['l', 'Лабильное МНО', 'L · < 60% измерений в целевом диапазоне', 1],
      ['e', 'Возраст старше 65 лет', 'E', 1], ['dd', 'Антиагреганты или НПВС', 'D', 1], ['da', 'Злоупотребление алкоголем', 'D', 1]] }],
    calc(v) {
      const sc = sumBools(v, 'f', this.inputs[0].items);
      const r = sc >= 3 ? ['bad', 'Высокий риск кровотечений', 'Требуется тщательный мониторинг и коррекция модифицируемых факторов риска'] : sc === 2 ? ['warn', 'Умеренный риск кровотечений', '2 балла'] : ['ok', 'Низкий риск кровотечений', '0–1 балл'];
      const mod = [];
      const f = v.f || {};
      if (f.h) mod.push('довести АД до целевого'); if (f.l) mod.push('стабилизировать МНО или рассмотреть ПОАК'); if (f.dd) mod.push('пересмотреть антиагреганты и НПВС'); if (f.da) mod.push('отказ от алкоголя');
      const tips = [{ t: mod.length ? 'Модифицируемые факторы у пациента: ' + mod.join('; ') + '.' : 'Модифицируемые факторы: неконтролируемая АГ, лабильное МНО, антиагреганты и НПВС, алкоголь.', s: 'КР382_2, табл. П4, разд. 3' }];
      tips.push({ t: 'Риск кровотечения оценивают у всех пациентов с ФП перед назначением антитромботической терапии.', s: 'КР382_2, разд. 3 · ЕОК IIaB · УУР B · УДД 3' });
      return { big: sc, unit: plural(sc, 'балл', 'балла', 'баллов'), side: null, tone: r[0], v1: r[1], v2: r[2], grade: '', tips };
    }
  },
  khorana: {
    t: 'Шкала Хорана', s: 'риск ВТЭО на химиотерапии', sys: 'heart', kr: KRL('960_1', 'разд. 2.5, прил. Г8, разд. 5.2.4.1'),
    inputs: [
      { id: 'site', type: 'radio', label: 'Первичная опухоль', options: [['2', 'Желудок, поджелудочная железа', 'очень высокий риск', 2], ['1', 'Лёгкие, лимфома, гинекологические, мочевой пузырь, яичко', 'высокий риск', 1], ['0', 'Другая локализация', 'молочная железа, толстая кишка, простата и др.', 0]], def: '0' },
      { id: 'f', type: 'bools', label: 'Перед началом химиотерапии', items: [['p', 'Тромбоциты ≥ 350 × 10⁹/л', '', 1], ['h', 'Гемоглобин < 100 г/л или эпоэтин бета', '', 1], ['w', 'Лейкоциты > 11 × 10⁹/л', '', 1], ['b', 'ИМТ ≥ 35 кг/м²', '', 1]] }
    ],
    calc(v) {
      const sc = +(v.site || 0) + sumBools(v, 'f', this.inputs[1].items);
      const r = sc >= 3 ? ['bad', 'Высокий риск — рассмотреть профилактику ВТЭО', '≥ 3 баллов. Решение — с учётом риска кровотечения; препараты: НМГ, апиксабан или ривароксабан.', 'УУР A · УДД 2 (выбор препарата)', '6,7–7%']
        : sc >= 1 ? ['warn', 'Умеренный риск — рутинная профилактика не показана', '1–2 балла. Учтите другие факторы высокого риска ВТЭО.', 'УУР B · УДД 1', '1,8–2%']
          : ['ok', 'Низкий риск — профилактика не показана', '0 баллов', 'УУР B · УДД 1', '0,3–0,8%'];
      const tips = [];
      if (sc >= 3) {
        tips.push({ t: 'При высоком риске кровотечения предпочесть НМГ: опухоли верхних отделов ЖКТ и мочеполовой системы, нефростома, ЦВК, эрозии и язвы ЖКТ, болезни печени, тромбоцитопения, СКФ 15–29.', s: 'КР960_1, разд. 5.2.4.1' });
        tips.push({ t: 'ПОАК осторожно с иматинибом, кризотинибом, абиратероном, циклоспорином, такролимусом, паклитакселом, вемурафенибом, дазатинибом. Дозы для профилактики в КР не указаны — по инструкции.', s: 'КР960_1, разд. 5.2.4.1' });
      }
      tips.push({ t: 'Высокий риск ВТЭО независимо от баллов: ограничение мобильности, активная инфекция, сдавление опухолью крупных вен, ВТЭО в анамнезе, распространённый рак поджелудочной железы или лёгких, миелома на иммуномодуляторах, герминогенная опухоль яичка с забрюшинными метастазами > 3,5 см.', s: 'КР960_1, разд. 5.2.4.1' });
      tips.push({ t: 'Баллы считают по анализам до начала химиотерапии — пересчитывайте перед каждым новым курсом. Баллы за локализацию — по оригиналу шкалы (в таблице КР записаны неоднозначно).', s: 'КР960_1, прил. Г8' });
      return { big: sc, unit: plural(sc, 'балл', 'балла', 'баллов'), side: ['риск ВТЭО', '≈ ' + r[4]], tone: r[0], v1: r[1], v2: r[2], grade: r[3], tips };
    }
  }
};
const DEFAULT_FAV = ['ckdepi', 'crcl', 'chads', 'hasbled', 'bmi', 'khorana'];
function favs() { return LS.get('fav', DEFAULT_FAV).filter(id => CALCS[id]); }
function setFavs(a) { LS.set('fav', a); }
function creatUmol(v) { const x = parseFloat(String(v.cr || '').replace(',', '.')); if (!(x > 0)) return 0; return v.cr_u === 'mg' ? x * 88.4 : x; }
function sumBools(v, id, items) { const o = v[id] || {}; return items.reduce((a, it) => a + (o[it[0]] ? it[3] : 0), 0); }

/* ---------------------------------------------------------------- маршрутизация */
let curTab = 'home';
function setTitle(t, back, actions) {
  $('#title').textContent = t; $('#back').hidden = !back;
  $('#hact').innerHTML = actions || '';
}
$('#back').onclick = () => history.back();
function route() {
  const h = decodeURIComponent(location.hash.slice(1) || 'home');
  const [p, a, b] = h.split('/');
  closeSheet(true);
  curTab = ['ref'].includes(p) ? 'ref' : p === 'about' ? 'about' : 'home';
  $$('#tabs a').forEach(x => x.classList.toggle('on', x.dataset.tab === curTab));
  window.scrollTo(0, 0);
  try {
    if (p === 'home') home(false);
    else if (p === 'edit') home(true);
    else if (p === 'sys') sysPage(a);
    else if (p === 'calc') calcPage(a);
    else if (p === 'mkb') mkbPage(a || '');
    else if (p === 'code') codePage(a);
    else if (p === 'kr') krPage(a, b);
    else if (p === 'ref') a ? refPage(a) : refList();
    else if (p === 'about') about();
    else home(false);
  } catch (e) { view.innerHTML = `<div class="empty">Ошибка отображения: ${esc(e.message)}</div>`; }
  if (N && N.ok) N.ok();
}
window.addEventListener('hashchange', route);
function go(h) { if (location.hash === h) route(); else location.hash = h; }

/* ---------------------------------------------------------------- главная: избранное */
function rail(active) {
  return `<nav class="rail" aria-label="Системы">${SYS.map(s => `<a href="${s[0] === 'fav' ? '#home' : '#sys/' + s[0]}" class="${s[0] === active ? 'on' : ''}" style="${s[0] === active ? `color:${s[5]};background:${s[4]}` : ''}" aria-label="${esc(s[2])}">${svg(s[3], s[0] === 'fav' && active === 'fav' ? 'style="fill:currentColor"' : '')}<span>${s[1]}</span></a>`).join('')}</nav>`;
}
function mkbBar(q = '') {
  return `<div class="mkbbar"><label class="field">${svg('search')}<input id="mq" type="search" placeholder="МКБ-10: код или диагноз" value="${esc(q)}" autocomplete="off" spellcheck="false" enterkeyhint="search" aria-label="Поиск по МКБ-10: код или диагноз">${q ? '<button class="clr" aria-label="Очистить">×</button>' : ''}</label></div>`;
}
function bindMkb(live) {
  const i = $('#mq'); if (!i) return;
  const goq = () => { const v = i.value.trim(); if (v) go('#mkb/' + encodeURIComponent(v)); };
  i.addEventListener('keydown', e => { if (e.key === 'Enter') goq(); });
  if (live) i.addEventListener('input', debounce(() => { mkbResults(i.value); const c = $('.mkbbar .clr'); if (c) c.hidden = !i.value; }, 200));
  else i.addEventListener('input', debounce(() => { if (i.value.trim().length >= 2) goq(); }, 700));
  const c = $('.mkbbar .clr'); if (c) c.onclick = () => { i.value = ''; mkbResults(''); i.focus(); };
}
function debounce(f, ms) { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => f(...a), ms); }; }
function tile(id, edit) {
  const c = CALCS[id], s = SYSM[c.sys];
  const inner = `${svg(s[3], `style="color:${s[5]};width:28px;height:28px"`)}<b>${esc(c.t)}</b>`;
  if (!edit) return `<a class="tile" href="#calc/${id}" style="background:${s[4]}">${inner}</a>`;
  return `<div class="tile" style="background:${s[4]};outline:1.5px dashed #9AA3AC;outline-offset:2px">${inner}<button class="rm" data-rm="${id}" aria-label="Убрать «${esc(c.t)}» из избранного">${svg('minus')}</button><button class="mv" data-mv="${id}" aria-label="Переместить «${esc(c.t)}» левее">${svg('left')}</button></div>`;
}
function home(edit) {
  setTitle('Избранное', false, edit ? '<button id="done">Готово</button>' : '<button id="ed">Изменить</button>');
  const f = favs();
  view.innerHTML = (edit ? '' : mkbBar()) + `<div class="shell"><div class="main">
    <div class="grid">${f.map(id => tile(id, edit)).join('')}${!edit && f.length < 18 ? `<a class="tile add" href="#sys/heart">${svg('plus', 'style="width:28px;height:28px"')}<b>Добавить</b></a>` : ''}</div>
    ${!f.length ? '<div class="empty">Избранное пустое. Откройте систему справа и нажмите ★ рядом с калькулятором.</div>' : ''}
    <p class="hint">${edit ? '«−» убирает калькулятор с первой страницы, стрелка — сдвигает левее.' : 'Системы — справа. ★ в разделе добавляет калькулятор сюда, до 18 плиток.'}</p>
    </div>${rail('fav')}</div>`;
  if (edit) {
    $('#done').onclick = () => go('#home');
    $$('[data-rm]').forEach(b => b.onclick = () => { setFavs(favs().filter(x => x !== b.dataset.rm)); home(true); });
    $$('[data-mv]').forEach(b => b.onclick = () => { const a = favs(), i = a.indexOf(b.dataset.mv); if (i > 0) { [a[i - 1], a[i]] = [a[i], a[i - 1]]; setFavs(a); } home(true); });
  } else { $('#ed').onclick = () => go('#edit'); bindMkb(false); }
}
function sysPage(sid) {
  const s = SYSM[sid]; if (!s) return home(false);
  setTitle(s[2], false);
  const ids = Object.keys(CALCS).filter(k => CALCS[k].sys === sid), f = favs();
  view.innerHTML = mkbBar() + `<div class="shell"><div class="main">
    <h2 class="sec-h">${ids.length ? ids.length + ' ' + plural(ids.length, 'калькулятор', 'калькулятора', 'калькуляторов') + ' · ★ — на первую страницу' : 'Калькуляторы раздела готовятся'}</h2>
    ${ids.length ? `<ul class="list">${ids.map(id => { const c = CALCS[id], on = f.includes(id); return `<li><a href="#calc/${id}"><span style="flex:1;min-width:0"><div class="tt">${esc(c.t)}</div><div class="ts">${esc(c.s)}</div><span class="krb" style="display:inline-block;margin-top:4px">КР${esc(c.kr.id)}</span></span></a><button class="star ${on ? 'on' : ''}" data-star="${id}" aria-pressed="${on}" aria-label="${on ? 'Убрать из избранного' : 'Добавить в избранное'}">${svg('star')}</button></li>`; }).join('')}</ul>` : ''}
    ${PLANNED[sid] && PLANNED[sid] !== '—' ? `<p class="hint">Следующие в работе: ${esc(PLANNED[sid])}.</p>` : ''}
    </div>${rail(sid)}</div>`;
  bindMkb(false);
  $$('[data-star]').forEach(b => b.onclick = () => { const id = b.dataset.star; let a = favs(); a = a.includes(id) ? a.filter(x => x !== id) : [...a, id].slice(0, 18); setFavs(a); sysPage(sid); });
}

/* ---------------------------------------------------------------- экран калькулятора */
function calcPage(id) {
  const c = CALCS[id]; if (!c) return home(false);
  const on = favs().includes(id);
  setTitle(c.t, true, `<button id="fv" aria-label="${on ? 'Убрать из избранного' : 'Добавить в избранное'}" aria-pressed="${on}">${svg('star', on ? 'style="fill:currentColor"' : '')}</button>`);
  $('#fv').onclick = () => { let a = favs(); a = a.includes(id) ? a.filter(x => x !== id) : [...a, id].slice(0, 18); setFavs(a); calcPage(id); };
  const st = LS.get('calc_' + id, {});
  c.inputs.forEach(i => { if (i.def != null && st[i.id] == null) st[i.id] = i.def; });
  const hasBrief = BRIEF.docs[c.kr.id];
  const krName = hasBrief ? BRIEF.docs[c.kr.id].name : (MKB.cr[c.kr.id] ? MKB.cr[c.kr.id][0] : 'клиническая рекомендация');
  const krHref = hasBrief ? '#kr/' + c.kr.id : 'https://cr.minzdrav.gov.ru/preview-cr/' + c.kr.id;
  const inputs = c.inputs.map(i => inputHtml(i, st)).join('');
  view.innerHTML = `<div class="wrap"><section id="res" class="card res" aria-live="polite"></section><section id="tips" class="card tips" hidden></section>${inputs}
    <p class="note">Источник: КР${esc(c.kr.id)} «${esc(krName)}», ${esc(c.kr.sec)}. База КР от ${dt(META.kr_built)}. Справочник не заменяет решение врача.</p></div>`;
  const render = () => {
    LS.set('calc_' + id, st);
    const r = c.calc(st);
    const res = $('#res');
    const link = `<a class="krlink" href="${krHref}"><span class="krb">КР${esc(c.kr.id)}</span><span>${esc(krName)} — ${esc(c.kr.sec)}</span>${svg('chev', 'style="width:18px;height:18px;color:var(--accent)"')}</a>`;
    if (!r) { res.className = 'card res wait'; res.innerHTML = `<div class="num"><span class="big">—</span><span class="unit">заполните поля ниже</span></div>${link}`; $('#tips').hidden = true; return; }
    res.className = 'card res'; res.style.setProperty('--tone', T[r.tone]);
    res.innerHTML = `<div class="num"><span class="big" style="color:${T[r.tone]}">${esc(r.big)}</span><span class="unit">${esc(r.unit)}</span>${r.side ? `<span class="side">${esc(r.side[0])}<b>${esc(r.side[1])}</b></span>` : ''}</div>
      <div class="verdict"><div><span class="v1">${esc(r.v1)}</span><span class="v2">${esc(r.v2)}</span>${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}</div></div>${link}`;
    const t = $('#tips');
    if (r.tips && r.tips.length) {
      t.hidden = false;
      t.innerHTML = `<h2>${svg('bulb', 'style="color:var(--accent);width:20px;height:20px"')}Что ещё сделать</h2><ol>${r.tips.map((x, n) => `<li><span>${n + 1}</span><div>${esc(x.t)}<small>${esc(x.s)}</small>${x.calc ? `<a class="lnk" href="#calc/${x.calc}">${esc(CALCS[x.calc].t)} ›</a>` : ''}${x.ref ? `<a class="lnk" href="#ref/${x.ref}">${esc(REF[x.ref].title)} ›</a>` : ''}</div></li>`).join('')}</ol>`;
    } else t.hidden = true;
  };
  bindInputs(c, st, render);
  render();
}
function inputHtml(i, st) {
  if (i.type === 'seg') return `<div class="glabel">${esc(i.label)}</div><div class="seg" style="grid-template-columns:repeat(${i.options.length},1fr)" data-seg="${i.id}">${i.options.map(o => `<button data-v="${o[0]}" class="${st[i.id] === o[0] ? 'on' : ''}" aria-pressed="${st[i.id] === o[0]}">${esc(o[1])}</button>`).join('')}</div>`;
  if (i.type === 'num') return `<div class="num-in"><label for="i_${i.id}">${esc(i.label)}</label><input id="i_${i.id}" data-num="${i.id}" type="number" inputmode="decimal" min="${i.min}" max="${i.max}" value="${esc(st[i.id] || '')}"><span class="u">${esc(i.unit)}</span></div>`;
  if (i.type === 'creat') { const u = st.cr_u || 'um'; return `<div class="num-in"><label for="i_cr">${esc(i.label)}</label><input id="i_cr" data-num="cr" type="number" inputmode="decimal" value="${esc(st.cr || '')}"><span class="u"><button data-unit="1" aria-label="Сменить единицы">${u === 'mg' ? 'мг/дл' : 'мкмоль/л'}</button></span></div>`; }
  if (i.type === 'bools') return `${i.label ? `<div class="glabel">${esc(i.label)}</div>` : ''}<div class="box">${i.items.map(it => { const on = !!(st[i.id] || {})[it[0]]; return `<button class="chk ${on ? 'on' : ''}" data-bool="${i.id}" data-k="${it[0]}" aria-pressed="${on}"><span class="mark">${svg('check')}</span><span class="l"><b>${esc(it[1])}</b>${it[2] ? `<small>${esc(it[2])}</small>` : ''}</span><span class="pts">+${it[3]}</span></button>`; }).join('')}</div>`;
  if (i.type === 'radio') return `<div class="glabel">${esc(i.label)}</div><div class="box">${i.options.map(o => { const on = st[i.id] === o[0]; return `<button class="chk ${on ? 'on' : ''}" data-radio="${i.id}" data-v="${o[0]}" aria-pressed="${on}"><span class="mark r"></span><span class="l"><b>${esc(o[1])}</b><small>${esc(o[2])}</small></span><span class="pts">+${o[3]}</span></button>`; }).join('')}</div>`;
  return '';
}
function bindInputs(c, st, render) {
  $$('[data-seg] button').forEach(b => b.onclick = () => { const id = b.parentNode.dataset.seg; st[id] = b.dataset.v; $$('button', b.parentNode).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); render(); });
  $$('[data-num]').forEach(i => i.oninput = () => { st[i.dataset.num] = i.value; render(); });
  $$('[data-unit]').forEach(b => b.onclick = () => { st.cr_u = (st.cr_u || 'um') === 'um' ? 'mg' : 'um'; b.textContent = st.cr_u === 'mg' ? 'мг/дл' : 'мкмоль/л'; st.cr = ''; $('#i_cr').value = ''; render(); });
  $$('[data-bool]').forEach(b => b.onclick = () => { const id = b.dataset.bool, k = b.dataset.k; st[id] = Object.assign({}, st[id]); st[id][k] = !st[id][k]; b.classList.toggle('on', st[id][k]); b.setAttribute('aria-pressed', st[id][k]); render(); });
  $$('[data-radio]').forEach(b => b.onclick = () => { const id = b.dataset.radio; st[id] = b.dataset.v; $$(`[data-radio="${id}"]`).forEach(x => { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', x === b); }); render(); });
}

/* ---------------------------------------------------------------- МКБ-10 */
// Код в русской раскладке (Ш48 → I48) или кириллицей-«двойником» (Е11 → E11): проверяем оба варианта
const KBD = { 'Ф': 'A', 'И': 'B', 'С': 'C', 'В': 'D', 'У': 'E', 'А': 'F', 'П': 'G', 'Р': 'H', 'Ш': 'I', 'О': 'J', 'Л': 'K', 'Д': 'L', 'Ь': 'M', 'Т': 'N', 'Щ': 'O', 'З': 'P', 'Й': 'Q', 'К': 'R', 'Ы': 'S', 'Е': 'T', 'Г': 'U', 'М': 'V', 'Ц': 'W', 'Ч': 'X', 'Н': 'Y', 'Я': 'Z' };
const LOOK = { 'А': 'A', 'В': 'B', 'Е': 'E', 'К': 'K', 'М': 'M', 'Н': 'H', 'О': 'O', 'Р': 'P', 'С': 'C', 'Т': 'T', 'Х': 'X', 'У': 'Y' };
function asCodes(q) {
  q = q.trim().toUpperCase().replace(/Ё/g, 'Е').replace(',', '.').replace(/\s+/g, '');
  if (/^[A-Z]\d/.test(q)) return [q];
  if (/^[А-Я]\d/.test(q)) return [...new Set([LOOK[q[0]], KBD[q[0]]].filter(Boolean).map(x => x + q.slice(1)))];
  return null;
}
let MKBIDX = null;
function mkbIdx() { if (!MKBIDX) MKBIDX = MKB.n.map(r => r[1].toLowerCase().replace(/ё/g, 'е')); return MKBIDX; }
function krFor(code) { return (MKB.kr[code] || []); }
function mkbRow(r) {
  const ks = krFor(r[0]), nb = ks.filter(k => BRIEF.docs[k]).length;
  const badge = ks.length ? `<span class="badge ${nb ? '' : 'out'}">КР ${ks.length}</span>` : '';
  return `<li><a href="#code/${encodeURIComponent(r[0])}"><span class="code">${esc(r[0])}</span><span style="flex:1;min-width:0">${esc(r[1])}</span>${badge}${svg('chev', 'class="chev" style="width:18px;height:18px"')}</a></li>`;
}
function mkbPage(q) {
  setTitle('Поиск по МКБ-10', true);
  view.innerHTML = mkbBar(q) + '<div id="mres"></div>';
  bindMkb(true); mkbResults(q);
  const i = $('#mq'); if (i && !q) i.focus();
}
function mkbResults(q) {
  const box = $('#mres'); if (!box) return;
  q = (q || '').trim();
  if (!q) { box.innerHTML = '<h2 class="sec-h">Классы болезней</h2><ul class="list">' + MKB.n.filter(r => r[2] === 0).map(mkbRow).join('') + '</ul>'; return; }
  const cs = asCodes(q), code = cs && cs.join(' или '); let rows;
  if (cs) rows = MKB.n.filter(r => !r[0].includes('-') && cs.some(c => r[0].startsWith(c))).slice(0, 300);
  else {
    const ws = q.toLowerCase().replace(/ё/g, 'е').split(/\s+/).filter(w => w.length > 1).map(w => w.slice(0, Math.max(3, w.length - 2)));
    const idx = mkbIdx(); rows = [];
    for (let i = 0; i < idx.length && rows.length < 300; i++) if (ws.every(w => idx[i].includes(w))) rows.push(MKB.n[i]);
  }
  box.innerHTML = `<h2 class="sec-h">${code ? 'Коды, начинающиеся на ' + esc(code) : 'Найдено'}: ${rows.length}${rows.length >= 300 ? '+' : ''}</h2>` + (rows.length ? `<ul class="list">${rows.map(mkbRow).join('')}</ul>` : '<div class="empty">В МКБ-10 не найдено. Попробуйте код (I48) или часть названия.</div>') +
    '<p class="hint">«КР N» — сколько действующих КР для взрослых указывают этот код в применимости. Зелёная метка — есть краткая КР в справочнике.</p>';
}
function codePage(code) {
  const i = MKB.n.findIndex(r => r[0] === code); if (i < 0) return mkbPage(code);
  const r = MKB.n[i];
  const ks = krFor(code), brief = ks.filter(k => BRIEF.docs[k]);
  if (ks.length === 1 && brief.length === 1) { location.replace('#kr/' + ks[0] + '/' + encodeURIComponent(code)); return; }
  setTitle(code + ' — МКБ-10', true);
  const kids = []; for (let j = i + 1; j < MKB.n.length && MKB.n[j][2] > r[2]; j++) if (MKB.n[j][2] === r[2] + 1) kids.push(MKB.n[j]);
  const krList = ks.map(k => { const b = BRIEF.docs[k], m = MKB.cr[k] || ['КР' + k, 1];
    return b ? `<li><a href="#kr/${k}/${encodeURIComponent(code)}"><span style="flex:1"><div class="tt">${esc(b.name)}</div><div class="ts">КР${esc(k)} · краткая КР${b.mode === 'brief' ? ' (сокращённая)' : ''}</div></span>${svg('chev', 'class="chev"')}</a></li>`
      : `<li><a href="https://cr.minzdrav.gov.ru/preview-cr/${k}"><span style="flex:1"><div class="tt">${esc(m[0])}</div><div class="ts">КР${esc(k)} · нет в справочнике терапевта — открыть на cr.minzdrav.gov.ru</div></span>${svg('chev', 'class="chev"')}</a></li>`; }).join('');
  view.innerHTML = `<div class="krhead"><div style="font-size:26px;font-weight:800;color:var(--accent)">${esc(code)}</div><div style="font-size:17px;font-weight:600">${esc(r[1])}</div></div>
    <h2 class="sec-h">${ks.length ? 'Клинические рекомендации: ' + ks.length : 'Клинические рекомендации'}</h2>${ks.length ? `<ul class="list">${krList}</ul>` : '<div class="empty">Действующих КР для взрослых с этим кодом нет.</div>'}
    ${kids.length ? `<h2 class="sec-h">Входящие коды: ${kids.length}</h2><ul class="list">${kids.map(mkbRow).join('')}</ul>` : ''}`;
}

/* ---------------------------------------------------------------- краткая КР */
let TERM_RX = null, TERM_BY = {};
function termRx() {
  if (TERM_RX) return TERM_RX;
  const parts = []; TERMS.terms.forEach((t, i) => { TERM_BY['t' + i] = t; parts.push(`(?<t${i}>${t.jsrx})`); });
  try { TERM_RX = new RegExp(parts.join('|'), 'giu'); } catch (e) { TERM_RX = /(?!)/; }
  return TERM_RX;
}
function markTerms(html) {
  const rx = termRx();
  return html.split(/(<[^>]+>)/).map(seg => seg.startsWith('<') ? seg : seg.replace(rx, (...m) => {
    const g = m[m.length - 1]; const k = Object.keys(g).find(x => g[x] != null); const t = TERM_BY[k]; if (!t) return m[0];
    return `<button class="term ${t.kind === 'method' ? 'm' : ''}" data-term="${k}">${m[0]}</button>`;
  })).join('');
}
const wrapT = h => (h || '').replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>');
function krPage(id, hlCode) {
  const d = BRIEF.docs[id]; if (!d) { view.innerHTML = '<div class="empty">КР не найдена.</div>'; return; }
  setTitle('КР' + d.id, true);
  const S = (n, sid, title, src, body) => `<section class="ks" id="${sid}"><h3><span class="n">${n}</span><span>${title}</span><span class="src">${esc(src)}</span></h3>${body}</section>`;
  const cls = d.classification.html ? `<div class="card kr">${wrapT(d.classification.html)}</div>` : '<div class="empty">Раздела 1.5 в КР нет.</div>';
  let form = d.formulation.map(f => `<div class="card kr"><span class="chip ok" style="align-self:flex-start">из КР, раздел ${esc(f.src)}</span>${wrapT(f.html)}</div>`).join('<div style="height:8px"></div>');
  if (d.formulation_ext) form += `<div class="card"><span class="chip warn" style="align-self:flex-start">не из КР · ${esc(d.formulation_ext.src)}</span><ul style="margin:0;padding-left:20px">${d.formulation_ext.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><span class="meta">${esc(d.formulation_ext.note)}</span></div>`;
  if (d.formulation_draft) form += `<div class="card"><span class="chip warn" style="align-self:flex-start">черновик · составлен, не из КР</span><ul style="margin:0;padding-left:20px">${d.formulation_draft.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul><span class="meta">${esc(d.formulation_draft.note)}</span></div>`;
  if (!form) form = '<div class="empty">Примера формулировки в КР нет.</div>';
  const recH = r => `<div class="rec kr">${markTerms(r.html)}${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}${r.comment_doses && r.comment_doses.length ? `<div class="cm">${markTerms(r.comment_doses.map(esc).join(' '))}</div>` : ''}</div>`;
  const groups = []; d.treatment.forEach(r => { const g = groups[groups.length - 1]; if (g && g.h === r.h) g.items.push(r); else groups.push({ h: r.h, items: [r] }); });
  const recs = groups.map(g => `<details class="fold"><summary>${esc(g.h || 'Общие положения')}<span class="meta">${g.items.length}${g.items.some(x => x.dose) ? ' · дозы' : ''}</span></summary><div>${g.items.map(recH).join('')}</div></details>`).join('');
  let ext = '';
  if (d.doses) ext += `<div class="card"><b>${esc(d.doses.title)}</b><div class="tbl kr"><table><thead><tr><th>Класс</th><th>Препарат</th><th>Начальная</th><th>Обычная</th><th>Максимальная</th><th>Особенности</th><th>Источник</th></tr></thead><tbody>${d.doses.rows.map(r => `<tr>${r.slice(0, 6).map((c, i) => `<td>${i === 1 ? markTerms(esc(c)) : esc(c)}</td>`).join('')}<td><a href="${esc(r[6])}">инструкция</a></td></tr>`).join('')}</tbody></table></div><span class="meta">${esc(d.doses.note)}</span></div>`;
  if (d.dose_table) ext += `<div class="card"><b>${esc(d.dose_table.title)}</b><div class="tbl kr"><table><thead><tr><th>Препарат</th><th>Доза и режим</th><th>Источник</th></tr></thead><tbody>${d.dose_table.rows.map(r => `<tr><td><b>${markTerms(esc(r[0]))}</b></td><td>${esc(r[1])}</td><td>${r[3] ? `<a href="${esc(r[3])}">${esc(r[2])}</a>` : esc(r[2]) + esc(d.id)}</td></tr>`).join('')}</tbody></table></div><span class="meta">${esc(d.dose_table.note)}</span></div>`;
  const tabs = d.dose_tables.map(t => `<details class="fold"><summary>${esc(t.title)}</summary><div class="kr">${wrapT(markTerms(t.html))}</div></details>`).join('');
  const sp = (d.treatment_special || []).length ? `<details class="fold"><summary>Особые ситуации и стационар<span class="meta">${d.treatment_special.length}</span></summary><div>${d.treatment_special.map(r => `<div class="rec kr"><b style="font-size:12px;color:var(--muted)">${esc(r.h)}</b>${markTerms(r.html)}${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}</div>`).join('')}</div></details>` : '';
  const ref = d.referral ? `<details class="fold" ${d.mode === 'brief' ? 'open' : ''}><summary>Когда направить и госпитализировать</summary><div class="kr">${wrapT(d.referral)}</div></details>` : '';
  const full = `<div style="display:flex;flex-direction:column;gap:8px">${ext}${recs || '<div class="empty">Рекомендаций с препаратами в разделе 3 не найдено.</div>'}${tabs}${sp}</div>`;
  const treat = d.mode === 'brief' ? `<div class="card" style="background:var(--warn-soft)">Лечение ведёт профильный специалист или стационар. Терапевту — обследование, наблюдение и показания к направлению.</div><div style="height:8px"></div>${ref}<div style="height:8px"></div><details class="fold"><summary>Рекомендации по лечению из КР<span class="meta">${d.treatment.length}</span></summary><div>${full}</div></details>` : `${full}<div style="height:8px"></div>${ref}`;
  const exam = d.exam.items.length ? `<div class="card"><ul style="margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px">${d.exam.items.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` + (d.exam.other.length ? `<div style="height:8px"></div><details class="fold"><summary>Остальные критерии качества<span class="meta">${d.exam.other.length}</span></summary><div><ul style="margin:0;padding-left:20px">${d.exam.other.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></details>` : '') : '<div class="empty">Критериев обследования не найдено.</div>';
  const dn = (d.dispensary.order.length ? d.dispensary.order.map(r => `<div class="card"><div class="chips"><span class="chip ok">168н, строка ${r.row} · ${esc(r.codes)}</span><span class="chip">${esc(r.freq)}</span><span class="chip">${esc(r.dur)}</span></div><b>${esc(r.name)}</b>${r.ind.length ? `<ul style="margin:0;padding-left:20px">${r.ind.map(x => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}<span class="meta">${esc(r.note)}</span></div>`).join('<div style="height:8px"></div>') : '<div class="empty">Кодов этой КР нет в приложении 1 приказа 168н.</div>')
    + (d.dispensary.kr.length ? `<div style="height:8px"></div><details class="fold"><summary>Диспансерное наблюдение в тексте КР<span class="meta">${d.dispensary.kr.length}</span></summary><div>${d.dispensary.kr.map(r => `<div class="rec kr">${r.html}${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}</div>`).join('')}</div></details>` : '');
  view.innerHTML = `<div class="krhead"><h2>${esc(d.name)}</h2><div class="meta">КР${esc(d.id)} · ${d.age === 3 ? 'взрослые и дети' : 'взрослые'} · утверждена ${dt(d.pub)}${d.mode === 'brief' ? ' · сокращённый вид' : ''}</div>
    <div class="chips">${d.mkb.map(c => `<span class="chip ${c === hlCode ? 'hl' : ''}">${esc(c)}</span>`).join('')}</div></div>
    <nav class="jump" aria-label="Разделы">${[['s1', 'Классификация'], ['s2', 'Диагноз'], ['s3', 'Лечение'], ['s4', 'Обследование'], ['s5', 'Наблюдение']].map(x => `<button data-j="${x[0]}">${x[1]}</button>`).join('')}</nav>
    ${S(1, 's1', 'Классификация', 'раздел 1.5', cls)}${S(2, 's2', 'Формулировка диагноза', '', form)}${S(3, 's3', 'Лечение', 'разд. 3, 7, прил. А3, Б', treat)}${S(4, 's4', 'Обязательное обследование', d.exam.src, exam)}${S(5, 's5', 'Диспансерное наблюдение', 'приказ 168н', dn)}
    <a class="bigbtn" href="${esc(d.url)}">Полный текст на cr.minzdrav.gov.ru</a>
    <p class="foot">Фрагменты — из текста КР${esc(d.id)}, база КР от ${dt(d.built)}. Черновик, требует проверки врачом. Подсвеченные препараты и методы открывают обзоры Cochrane. ${esc(d.dispensary.order_note)}</p>`;
  $$('[data-j]').forEach(b => b.onclick = () => { const s = $('#' + b.dataset.j); if (s) s.scrollIntoView({ behavior: 'smooth' }); });
  view.onclick = e => { const b = e.target.closest('.term'); if (b) cochraneSheet(TERM_BY[b.dataset.term], d.id); };
}

/* ---------------------------------------------------------------- Cochrane */
function openSheet(html) { $('#sheetBody').innerHTML = html; $('#sheet').hidden = false; document.body.style.overflow = 'hidden'; }
function closeSheet(silent) { $('#sheet').hidden = true; document.body.style.overflow = ''; }
$('#sheet').addEventListener('click', e => { if (e.target.dataset.close || e.target.closest('[data-close]')) closeSheet(); });
const EU = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils/';
function cochraneSheet(t, krId) {
  if (!t) return;
  const cond = TERMS.conditions[krId] || '';
  openSheet(`<div class="sh-h"><div><b>${esc(t.ru[0].toUpperCase() + t.ru.slice(1))}</b><span class="meta">${esc(t.en)} · обзоры Cochrane${cond ? ' · ' + esc(cond.split(' OR ')[0]) : ''}</span></div><button class="x" data-close="1" aria-label="Закрыть">×</button></div><div id="cr"><div class="load">Ищу обзоры в PubMed…</div></div>
    <p class="note" style="margin:10px 0 0">Поиск: PubMed (NCBI E-utilities), журнал «Cochrane Database Syst Rev». Абстракты не хранятся в приложении. © Cochrane, John Wiley &amp; Sons.</p>`);
  const en = /\s/.test(t.en) ? '"' + t.en + '"' : t.en;
  const base = `(${en}[tiab] OR ${en}[mh]) AND "Cochrane Database Syst Rev"[ta] NOT retracted publication[pt]`;
  const q1 = cond ? `(${en}[tiab] OR ${en}[mh]) AND (${cond}) AND "Cochrane Database Syst Rev"[ta] NOT retracted publication[pt]` : base;
  const search = q => nfetch(`${EU}esearch.fcgi?db=pubmed&retmode=json&retmax=12&sort=relevance&tool=spravochnik_terapevt&term=${encodeURIComponent(q)}`).then(x => JSON.parse(x).esearchresult.idlist || []);
  let broad = false;
  search(q1).then(ids => (ids.length || !cond) ? ids : (broad = true, search(base))).then(ids => {
    if (!ids.length) { $('#cr').innerHTML = '<div class="empty" style="margin:0">Обзоров Cochrane по этому запросу не найдено.</div>'; return; }
    return nfetch(`${EU}esummary.fcgi?db=pubmed&retmode=json&tool=spravochnik_terapevt&id=${ids.join(',')}`).then(x => {
      const r = JSON.parse(x).result; const seen = {}; const list = [];
      ids.forEach(id => { const s = r[id]; if (!s) return; const doi = (s.elocationid || '').match(/14651858\.(CD\d+)(\.pub\d+)?/i) || (JSON.stringify(s.articleids || '').match(/14651858\.(CD\d+)(\.pub\d+)?/i)); const cd = doi ? doi[1].toUpperCase() : 'pm' + id; if (seen[cd]) return; seen[cd] = 1; list.push({ id, cd, title: s.title, au: (s.authors || []).slice(0, 3).map(a => a.name).join(', ') + ((s.authors || []).length > 3 ? ' и др.' : ''), year: (s.pubdate || '').slice(0, 4), doi: doi ? doi[0] : '' }); });
      $('#cr').innerHTML = (broad ? '<p class="note" style="margin:0 0 8px">По заболеванию из этой КР обзоров нет — показаны обзоры по препарату в целом.</p>' : '') + list.map(o => `<article class="rv" data-pm="${o.id}"><button class="t">${esc(o.title)}</button><span class="meta">${esc(o.au)} · ${esc(o.year)}${o.cd.startsWith('CD') ? ' · ' + esc(o.cd) : ''}</span><div class="ab" hidden></div></article>`).join('');
      $$('#cr .rv').forEach((el, n) => { el.querySelector('.t').onclick = () => toggleAbs(el, list[n]); });
      if (list[0]) toggleAbs($('#cr .rv'), list[0]);
    });
  }).catch(e => {
    $('#cr').innerHTML = `<div class="empty" style="margin:0">Нет связи с PubMed (${esc(e.message)}). Нужен интернет.</div><div class="btn2" style="margin-top:10px"><a href="#" id="rt">Повторить</a><a class="p" href="https://pubmed.ncbi.nlm.nih.gov/?term=${encodeURIComponent(q1)}">Открыть в браузере</a></div>`;
    $('#rt').onclick = ev => { ev.preventDefault(); cochraneSheet(t, krId); };
  });
}
function toggleAbs(el, o) {
  const ab = el.querySelector('.ab');
  if (!ab.hidden) { ab.hidden = true; el.classList.remove('open'); return; }
  el.classList.add('open'); ab.hidden = false;
  const btns = `<div class="btn2" style="margin-top:8px">${o.cd.startsWith('CD') ? `<a class="p" href="https://www.cochrane.org/ru/${o.cd}">Резюме на русском</a><a href="https://www.cochranelibrary.com/cdsr/doi/10.1002/14651858.${o.cd}/full">Полный обзор</a>` : `<a class="p" href="https://pubmed.ncbi.nlm.nih.gov/${o.id}/">Открыть в PubMed</a>`}</div>`;
  if (ab.dataset.loaded) return;
  ab.innerHTML = '<div class="load">Загружаю абстракт…</div>' + btns;
  nfetch(`${EU}efetch.fcgi?db=pubmed&rettype=abstract&retmode=xml&tool=spravochnik_terapevt&id=${o.id}`).then(x => {
    const doc = new DOMParser().parseFromString(x, 'text/xml');
    const parts = [...doc.querySelectorAll('Abstract > AbstractText')].map(a => `<div>${a.getAttribute('Label') ? `<b>${esc(a.getAttribute('Label'))}</b>` : ''}${esc(a.textContent)}</div>`).join('');
    ab.dataset.loaded = 1;
    ab.innerHTML = (parts ? `<div class="abs">${parts}</div>` : '<div class="empty" style="margin:0">Абстракт в PubMed отсутствует.</div>') + `<p class="note" style="margin:6px 0 0">Абстракт на английском. Русское резюме есть не для всех обзоров.</p>` + btns;
  }).catch(e => { ab.innerHTML = `<div class="empty" style="margin:0">Не удалось загрузить абстракт: ${esc(e.message)}</div>` + btns; });
}

/* ---------------------------------------------------------------- справочник */
function refList() {
  setTitle('Справочник', false);
  const items = Object.values(REF);
  const secs = [...new Set(items.map(x => x.section))];
  view.innerHTML = secs.map(s => `<h2 class="sec-h">${esc(s)}</h2><ul class="list">${items.filter(x => x.section === s).map(x => `<li><a href="#ref/${x.id}"><span style="flex:1;min-width:0"><div class="tt">${esc(x.title)}</div><div class="ts">${esc(x.subtitle)}</div><span class="krb" style="display:inline-block;margin-top:4px">${x.kr.map(k => 'КР' + k).join(' · ')}</span></span>${svg('chev', 'class="chev"')}</a></li>`).join('')}</ul>`).join('')
    + '<p class="hint">Алгоритмы, которые не укладываются в калькулятор или краткую КР. Каждый пункт — со ссылками на разделы КР и уровнями доказательности.</p>';
}
function refPage(id) {
  const R = REF[id]; if (!R) return refList();
  setTitle(R.title, true);
  if (id === 'poak_periop') return poakPage(R);
  if (id === 'dapt_periop') return daptPage(R);
  view.innerHTML = '<div class="empty">Раздел готовится.</div>';
}
const segH = (key, opts, cur) => `<div class="seg" style="grid-template-columns:repeat(${opts.length},1fr)" data-s="${key}">${opts.map(o => `<button data-v="${o[0]}" class="${o[0] === cur ? 'on' : ''}" aria-pressed="${o[0] === cur}">${esc(o[1])}</button>`).join('')}</div>`;
const stepsH = st => `<ol class="steps">${st.map((s, i) => `<li><span>${i + 1}</span><div><b>${esc(s.t)}</b><p>${esc(s.d)}</p><small>${esc(s.src)}</small></div></li>`).join('')}</ol>`;
function poakPage(R) {
  const st = LS.get('ref_poak', { drug: 'xa', risk: 'high', cc: 0, f: {} });
  const T7 = R.stop_table;
  const draw = () => {
    LS.set('ref_poak', st);
    let big, unit, v1, v2, tone;
    if (st.risk === 'min') { big = '0'; unit = 'ч'; tone = 'ok'; v1 = 'Не отменять ПОАК'; v2 = R.minimal_risk_rule.text + ' (КР382_2: ' + R.minimal_risk_rule.grade + ')'; }
    else {
      const h = (st.drug === 'dabi' ? T7.dabigatran : T7.xa_inhibitors)[st.risk][st.cc];
      if (h == null) { big = '—'; unit = ''; tone = 'bad'; v1 = st.drug === 'dabi' ? 'Дабигатран при КК < 30 мл/мин не показан' : 'ПОАК при КК < 15 мл/мин не показаны'; v2 = 'Пересмотреть антикоагулянтную терапию вместе с кардиологом.'; }
      else { big = '≥ ' + h; unit = 'ч до операции'; tone = st.risk === 'high' ? 'bad' : 'warn'; v1 = 'Последний приём ПОАК не позднее чем за ' + h + ' ч'; v2 = 'Возобновить ' + R.resume[st.risk].text + ' (' + R.resume.src + ').'; }
    }
    const f = st.f; let b;
    if (f.s3 || f.c7) b = ['bad', 'Очень высокий риск ТЭО — «мост» допустим как исключение', R.bridging_exceptions.note + ' Решение — индивидуально, лучше вместе с кардиологом и хирургом.'];
    else if (f.c56) b = ['warn', 'Умеренно высокий риск ТЭО — «мост» можно рассмотреть', R.bridging_exceptions.moderate_high.text + '.'];
    else b = ['ok', '«Мост» не нужен', 'Рутинный «мост» повышает риск кровотечений и не рекомендован (КР382_2: ЕОК IC · УУР B · УДД 2).'];
    $('#pres').style.setProperty('--tone', T[tone]);
    $('#pres').innerHTML = `<div class="num"><span class="big" style="color:${T[tone]}">${esc(big)}</span><span class="unit">${esc(unit)}</span></div><div class="verdict"><div><span class="v1">${esc(v1)}</span><span class="v2">${esc(v2)}</span><span class="grade">${esc(T7.src)}</span></div></div>`;
    $('#rh').textContent = R.bleeding_risk[st.risk];
    $('#bres').style.setProperty('--tone', T[b[0]]);
    $('#bres').innerHTML = `<div class="verdict"><div><span class="v1">${esc(b[1])}</span><span class="v2">${esc(b[2])}</span></div></div>`;
  };
  const E = R.bridging_exceptions;
  view.innerHTML = `<div class="wrap">
    <div class="card"><b style="font-size:17px">Переводить на НМГ не нужно</b><span>${esc(R.key_message.text)}</span><div class="chips">${R.key_message.evidence.map(e => `<span class="grade">КР${e.kr}: ${esc(e.grade)}</span>`).join('')}</div></div>
    <div class="glabel">Когда последний приём</div><section id="pres" class="card res" aria-live="polite"></section>
    <div class="glabel">Препарат</div>${segH('drug', [['dabi', 'Дабигатран'], ['xa', 'Апиксабан, ривароксабан, эдоксабан']], st.drug)}
    <div class="glabel">Риск кровотечения вмешательства · табл. П5</div>${segH('risk', [['min', 'Минимальный'], ['low', 'Низкий'], ['high', 'Высокий']], st.risk)}<p class="note" id="rh"></p>
    <div class="glabel">Клиренс креатинина, мл/мин</div>${segH('cc', ['≥80', '50–80', '30–50', '15–30', '<15'].map((l, i) => [String(i), l]), String(st.cc))}<a class="lnk" href="#calc/crcl">Рассчитать клиренс креатинина ›</a>
    <div class="glabel">Нужен ли «мост» на НМГ</div><div class="box">${[['s3', 'Инсульт или ТИА менее 3 месяцев назад'], ['c7', 'CHA₂DS₂-VASc ≥ 7 баллов'], ['c56', 'CHA₂DS₂-VASc 5–6 или инсульт/ТИА ≥ 3 месяцев назад']].map(x => `<button class="chk ${st.f[x[0]] ? 'on' : ''}" data-f="${x[0]}"><span class="mark">${svg('check')}</span><span class="l"><b>${esc(x[1])}</b></span></button>`).join('')}</div>
    <section id="bres" class="card res" style="position:static"></section>
    <details class="fold"><summary>Если «мост» решено проводить · табл. П3</summary><div><div><b>${esc(E.regimen.drug)}</b> — ${esc(E.regimen.dose)}</div><div>${esc(E.regimen.stop_before)}</div><div>${esc(E.regimen.after)}</div><p class="note"># — применение вне инструкции.</p></div></details>
    <div class="glabel">Порядок действий</div>${stepsH(R.steps)}
    <p class="note">${esc(R.warfarin_note)} База КР от ${dt(R.kr_built)}. ${esc(R.status)}.</p></div>`;
  $$('[data-s] button').forEach(btn => btn.onclick = () => { const k = btn.parentNode.dataset.s; st[k] = k === 'cc' ? +btn.dataset.v : btn.dataset.v; $$('button', btn.parentNode).forEach(x => x.classList.toggle('on', x === btn)); draw(); });
  $$('[data-f]').forEach(btn => btn.onclick = () => { st.f[btn.dataset.f] = !st.f[btn.dataset.f]; btn.classList.toggle('on', st.f[btn.dataset.f]); draw(); });
  draw();
}
function daptPage(R) {
  const st = LS.get('ref_dapt', { drug: 'clopidogrel', risk: 'high' });
  const NM = { clopidogrel: 'Клопидогрел', ticagrelor: 'Тикагрелор', prasugrel: 'Прасугрел' };
  const draw = () => {
    LS.set('ref_dapt', st);
    const s = R.stop_days[st.drug], n = NM[st.drug];
    let big, unit, v1, v2, v3, tone, src;
    if (st.risk === 'low') { big = '0'; unit = 'дней'; tone = 'ok'; v1 = 'ДАТТ досрочно не прерывать'; v2 = R.low_bleeding_risk; v3 = R.aspirin.continue; src = 'КР154_4, КР157_5'; }
    else { big = '≥ ' + s.days; unit = s.days === 3 ? 'дня до операции' : 'дней до операции'; tone = 'bad'; v1 = 'Отменить ' + n.toLowerCase() + ' не менее чем за ' + s.days + (s.days === 3 ? ' дня' : ' дней'); v2 = R.aspirin.continue + ' ' + R.aspirin.stop; v3 = 'После операции: АСК — ' + R.resume.aspirin + ', ' + n.toLowerCase() + ' — ' + R.resume.p2y12 + ' (' + R.resume.src + ').'; src = s.src; }
    $('#dres').style.setProperty('--tone', T[tone]);
    $('#dres').innerHTML = `<div class="num"><span class="big" style="color:${T[tone]}">${esc(big)}</span><span class="unit">${esc(unit)}</span></div><div class="verdict"><div><span class="v1">${esc(v1)}</span><span class="v2">${esc(v2)}</span><span class="v2">${esc(v3)}</span><span class="grade">${esc(src)}</span></div></div>`;
  };
  const steps = [
    { t: 'Оценить риск кровотечения и срок после ОКС или ЧКВ', d: 'Досрочное прекращение ДАТТ увеличивает частоту коронарных осложнений. Узнать дату ОКС, ЧКВ и тип стентов.', src: 'КР154_4, КР157_5, разд. 3' },
    { t: 'Низкий риск кровотечения — не прерывать ДАТТ', d: R.low_bleeding_risk, src: 'КР154_4, КР157_5' },
    { t: 'Высокий риск — отменить только ингибитор P2Y12', d: 'Тикагрелор — не менее чем за 3 дня, клопидогрел — за 5, прасугрел — за 7. АСК по возможности продолжить.', src: 'КР154_4, КР157_5 · КР940_1: УУР C · УДД 5' },
    { t: 'Не выдержать сроки — консилиум', d: R.council, src: 'КР154_4, КР157_5' },
    { t: 'Профилактика ВТЭО — отдельно', d: R.vte_prophylaxis, src: 'КР940_1, разд. 5' },
    { t: 'Возобновить', d: 'АСК — ' + R.resume.aspirin + ', ингибитор P2Y12 — ' + R.resume.p2y12 + '. ' + R.resume.after_cabg + '.', src: R.resume.src }
  ];
  view.innerHTML = `<div class="wrap">
    <div class="card"><b style="font-size:17px">НМГ не заменяют антиагреганты</b><span>${esc(R.key_message.text)}</span></div>
    <div class="glabel">Подготовка к операции</div><section id="dres" class="card res" aria-live="polite"></section>
    <div class="glabel">Ингибитор P2Y12</div>${segH('drug', Object.entries(NM), st.drug)}
    <div class="glabel">Риск кровотечения операции</div>${segH('risk', [['low', 'Низкий'], ['high', 'Высокий']], st.risk)}
    <div class="glabel">Порядок действий</div>${stepsH(steps)}
    <details class="fold"><summary>Чего в КР нет</summary><div>${R.not_in_kr.map(x => `<div>${esc(x)}</div>`).join('')}</div></details>
    <p class="note">${esc(R.emergency_note)} База КР от ${dt(R.kr_built)}. ${esc(R.status)}.</p></div>`;
  $$('[data-s] button').forEach(btn => btn.onclick = () => { st[btn.parentNode.dataset.s] = btn.dataset.v; $$('button', btn.parentNode).forEach(x => x.classList.toggle('on', x === btn)); draw(); });
  draw();
}

/* ---------------------------------------------------------------- о программе и обновления */
function about() {
  setTitle('О программе', false);
  const i = info();
  const ago = i.checked ? new Date(i.checked).toLocaleString('ru-RU') : 'ещё не проверялось';
  view.innerHTML = `<div class="wrap">
    <div class="card"><b style="font-size:17px">Справочник врача-терапевта</b><span class="meta">Калькуляторы и шкалы, краткие клинические рекомендации Минздрава, алгоритмы.</span>
      <span>Версия приложения: <b>${esc(i.versionName || 'веб-версия')}</b></span>
      <span>Данные: <b>${esc(META.v)}</b> · база КР от <b>${dt(META.kr_built)}</b>${i.running && i.running !== i.bundled ? ' · загружены обновлением' : ''}</span>
      <span class="meta">${N ? `Обновления данных загружаются в фоне раз в сутки при наличии интернета и применяются при следующем запуске. Последняя проверка: ${esc(ago)}.` : 'Обновления данных загружаются при открытии справочника, когда есть интернет; применить — кнопкой в баннере вверху.'}</span>
      ${N || SW.reg ? '<button id="chk" class="lnk" style="border:0;cursor:pointer">Проверить обновления сейчас</button><span id="upd" class="meta"></span>' : ''}</div>
    ${!N ? `<div class="card"><b>${IOS ? 'На iPhone' : 'Как приложение'}</b><span>${STANDALONE ? 'Справочник установлен на экран «Домой» и работает без интернета. Новые данные загружаются при открытии, когда есть сеть.' : IOS ? 'Откройте в Safari → кнопка «Поделиться» → «На экран „Домой“». Справочник откроется как приложение и будет работать без интернета.' : 'В меню браузера выберите «Установить приложение» или «Добавить на главный экран». Для Android есть APK — на странице скачивания.'}</span><a class="lnk" href="../">Страница скачивания ›</a></div>` : ''}
    <div class="card"><b>Источники</b><span>Клинические рекомендации — рубрикатор cr.minzdrav.gov.ru (снимок ${dt(META.kr_built)}). Приказ Минздрава № 168н (диспансерное наблюдение). Дозы, которых нет в КР, — инструкции к препаратам, источник указан в строке. Обзоры Cochrane — через PubMed, по запросу.</span></div>
    <div class="card" style="background:var(--warn-soft)"><b>Черновик для проверки врачом</b><span>Справочник не заменяет инструкцию к препарату и решение врача. Внешние и составленные фрагменты помечены.</span></div></div>`;
  const b = $('#chk'); if (b) b.onclick = () => {
    $('#upd').textContent = 'Проверяю…';
    if (N) N.checkUpdates();
    else SW.reg.update().then(() => { const r = SW.reg; $('#upd').textContent = (r.installing || r.waiting) ? 'Обновление загружается — появится баннер вверху' : 'Новых обновлений нет'; if (r.waiting) swBanner(r.waiting); }).catch(() => { $('#upd').textContent = 'Нет связи с сервером'; });
  };
}
function appUpdateCheck() {
  const i = info(); if (!i.site || !i.versionCode) return;
  nfetch(i.site + 'android.json?t=' + Date.now()).then(x => { const j = JSON.parse(x); if (j.versionCode > i.versionCode) banner('Новая версия приложения ' + j.versionName, 'Скачать', () => openUrl(j.url)); }).catch(() => {});
}

/* ---------------------------------------------------------------- веб-версия (iPhone и браузер): офлайн и обновления через service worker */
const IOS = /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const STANDALONE = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
const SW = { reg: null };
function swBanner(w) { banner('Загружено обновление справочника', 'Применить', () => w.postMessage('skip')); }
function swInit() {
  if (N || !('serviceWorker' in navigator) || (location.protocol !== 'https:' && location.hostname !== 'localhost')) return;
  let reloading = false; const had = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => { if (had && !reloading) { reloading = true; location.reload(); } });
  navigator.serviceWorker.register('sw.js').then(reg => {
    SW.reg = reg;
    if (reg.waiting && navigator.serviceWorker.controller) swBanner(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const w = reg.installing; if (!w) return;
      w.addEventListener('statechange', () => { if (w.state === 'installed' && navigator.serviceWorker.controller) swBanner(w); });
    });
    // приложение на iPhone может неделями оставаться открытым в фоне — проверяем при каждом возвращении
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
  }).catch(() => {});
}
if (!N) document.addEventListener('click', e => {
  const a = e.target.closest('a[href^="http"]');
  if (a && a.origin !== location.origin) { e.preventDefault(); window.open(a.href, '_blank', 'noopener'); }
});

/* ---------------------------------------------------------------- старт */
(function start() {
  const i = info(); if (i.pending) App.otaReady();
  route();
  swInit();
  if (N) setTimeout(appUpdateCheck, 3000);
})();
