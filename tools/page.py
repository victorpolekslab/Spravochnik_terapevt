"""Страница проверки пакета кратких КР. python3 -I page.py <json_dir> <out.html>"""
import json, sys, os, glob

JD, OUT = sys.argv[1:3]
TITLE = sys.argv[3] if len(sys.argv) > 3 else 'Краткие КР терапевта: пакет 1'
ORDER = ['62_3', '155_2', '156_2', '752_1', '160_2', '569_2', '290_2', '469_3', '359_3', '655_2', '838_1', '277_2', '1033_1']
docs = [json.load(open(os.path.join(JD, f'{i}.json'))) for i in ORDER if os.path.exists(os.path.join(JD, f'{i}.json'))] if len(sys.argv) <= 3 else sorted([json.load(open(f)) for f in glob.glob(os.path.join(JD, '*.json'))], key=lambda d: (d['mode'] == 'brief', d['name']))
data = json.dumps(docs, ensure_ascii=False).replace('</', '<\\/')

HTML = r'''<!DOCTYPE html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Краткие КР терапевта: пакет 1</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Golos+Text:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
/* Справочник терапевта: палитра «Справочника НМП» — бордовый акцент, холодный серый фон; одна колонка, читаемая с телефона */
:root {
  --bg: #F6F7F9; --surface: #FFFFFF; --surface2: #EEF1F4; --fg: #1B1F24; --muted: #5A6470; --line: #DDE2E7;
  --accent: #A8322F; --accent-soft: #F6E4E3; --ok: #22643C; --ok-soft: #E6F1EA; --info: #1F5FA8; --info-soft: #E3EEFB;
  --warn: #8A5A00; --warn-soft: #FDF0D9;
  --font: 'Golos Text', system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  color-scheme: light;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #111417; --surface: #1A1F24; --surface2: #232A31; --fg: #E6E9ED; --muted: #A3ADB8; --line: #2E363E;
    --accent: #F09A93; --accent-soft: #3A2222; --ok: #8FD3A8; --ok-soft: #1D3326; --info: #9CC3F5; --info-soft: #1B2A3D;
    --warn: #F2C266; --warn-soft: #3A2E14; color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #111417; --surface: #1A1F24; --surface2: #232A31; --fg: #E6E9ED; --muted: #A3ADB8; --line: #2E363E;
  --accent: #F09A93; --accent-soft: #3A2222; --ok: #8FD3A8; --ok-soft: #1D3326; --info: #9CC3F5; --info-soft: #1B2A3D;
  --warn: #F2C266; --warn-soft: #3A2E14; color-scheme: dark;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font); font-size: 16px; line-height: 1.5; }
a { color: var(--accent); }
a:focus-visible, button:focus-visible, summary:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
.wrap { max-width: 860px; margin: 0 auto; padding: 0 16px 48px; }
header.top { background: var(--accent); color: #fff; }
:root[data-theme="dark"] header.top { background: #2A1716; }
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) header.top { background: #2A1716; } }
header.top .wrap { padding-top: 16px; padding-bottom: 16px; display: flex; flex-direction: column; gap: 4px; }
header.top h1 { margin: 0; font-size: 22px; font-weight: 800; text-wrap: balance; }
header.top p { margin: 0; font-size: 14px; opacity: .9; }
.banner { margin: 14px 0; padding: 12px 14px; border-radius: 12px; background: var(--warn-soft); color: var(--fg); font-size: 14px; border: 1px solid var(--line); }
.banner b { color: var(--warn); }
.list { display: flex; flex-direction: column; gap: 8px; margin: 0; padding: 0; list-style: none; }
.item a { display: flex; gap: 12px; align-items: center; padding: 12px 14px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; text-decoration: none; color: var(--fg); }
.item a:hover { border-color: var(--accent); }
.item .nm { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 6px; }
.item .t { font-weight: 700; line-height: 1.3; }
.chips { display: flex; flex-wrap: wrap; gap: 6px; }
.chip { font-size: 12px; font-weight: 600; border-radius: 7px; padding: 2px 8px; background: var(--surface2); color: var(--muted); white-space: nowrap; }
.chip.ok { background: var(--ok-soft); color: var(--ok); }
.chip.no { background: var(--accent-soft); color: var(--accent); }
.chip.info { background: var(--info-soft); color: var(--info); }
.chip.warn { background: var(--warn-soft); color: var(--warn); }
.back { display: inline-flex; margin: 14px 0 0; font-weight: 600; text-decoration: none; }
.krhead { margin: 10px 0 0; padding: 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 16px; display: flex; flex-direction: column; gap: 8px; }
.krhead h2 { margin: 0; font-size: 22px; font-weight: 800; line-height: 1.25; text-wrap: balance; }
.meta { font-size: 13.5px; color: var(--muted); }
nav.jump { position: sticky; top: 0; z-index: 5; display: flex; gap: 6px; overflow-x: auto; padding: 10px 0; background: var(--bg); }
nav.jump a { flex: none; font-size: 13.5px; font-weight: 600; text-decoration: none; color: var(--fg); background: var(--surface); border: 1px solid var(--line); border-radius: 18px; padding: 6px 12px; }
section.s { margin-top: 18px; }
section.s > h3 { margin: 0 0 8px; display: flex; align-items: baseline; gap: 10px; font-size: 19px; font-weight: 800; }
section.s > h3 .n { flex: none; width: 26px; height: 26px; border-radius: 13px; background: var(--accent); color: #fff; font-size: 14px; display: inline-flex; align-items: center; justify-content: center; align-self: center; }
:root[data-theme="dark"] section.s > h3 .n { color: #1A1F24; }
section.s > h3 .src { margin-left: auto; font-size: 12px; font-weight: 600; color: var(--muted); }
.card { padding: 14px 16px; background: var(--surface); border: 1px solid var(--line); border-radius: 14px; display: flex; flex-direction: column; gap: 10px; }
.kr p { margin: 0 0 8px; } .kr p:last-child { margin-bottom: 0; }
.kr ul, .kr ol { margin: 0 0 8px; padding-left: 22px; }
.kr h2, .kr h3, .kr h4 { font-size: 15px; margin: 10px 0 6px; }
.tbl { overflow-x: auto; border: 1px solid var(--line); border-radius: 10px; }
.kr table { border-collapse: collapse; font-size: 13.5px; min-width: 100%; }
.kr th, .kr td { border: 1px solid var(--line); padding: 6px 8px; vertical-align: top; text-align: left; }
.kr th { background: var(--surface2); }
.kr td p, .kr th p { margin: 0; }
.rec { border-top: 1px solid var(--line); padding-top: 10px; display: flex; flex-direction: column; gap: 6px; }
.rec:first-child { border-top: none; padding-top: 0; }
.rec .h { font-size: 12px; font-weight: 700; letter-spacing: .3px; text-transform: uppercase; color: var(--muted); }
.rec ul { margin: 0; padding-left: 20px; }
.rec .cm { font-size: 13.5px; color: var(--muted); border-left: 3px solid var(--line); padding-left: 10px; }
.grade { align-self: flex-start; font-size: 11.5px; font-weight: 700; color: var(--info); background: var(--info-soft); border-radius: 6px; padding: 2px 7px; }
details.tb { background: var(--surface); border: 1px solid var(--line); border-radius: 12px; }
details.tb > summary { cursor: pointer; padding: 10px 14px; font-weight: 600; font-size: 14.5px; }
details.tb > div { padding: 0 12px 12px; }
.empty { padding: 12px 14px; border-radius: 12px; background: var(--accent-soft); font-size: 14.5px; }
.checks { margin: 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 8px; }
.checks li { display: flex; gap: 10px; font-size: 14.5px; }
.checks li::before { content: ""; flex: none; width: 16px; height: 16px; margin-top: 3px; border: 2px solid var(--muted); border-radius: 4px; }
.dn { display: flex; flex-direction: column; gap: 8px; }
.dn .row1 { display: flex; flex-wrap: wrap; gap: 6px; }
.dn ul { margin: 0; padding-left: 20px; font-size: 14.5px; }
.foot { margin-top: 24px; font-size: 12.5px; color: var(--muted); }
@media (prefers-reduced-motion: reduce) { * { scroll-behavior: auto !important; } }
</style>
</head>
<body>
<header class="top"><div class="wrap"><h1 id="ttl">Краткие КР терапевта: пакет 1</h1><p id="sub"></p></div></header>
<main class="wrap" id="app"></main>
<script id="data" type="application/json">__DATA__</script>
<script>
const D = JSON.parse(document.getElementById('data').textContent);
const app = document.getElementById('app');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const slug = id => 'kr-' + id.replace('_', '-');
const ageW = a => ({1: 'взрослые', 3: 'взрослые и дети'}[a] || '');
const dt = s => s ? s.split('-').reverse().join('.') : '';
const wrapTables = h => h.replace(/<table>/g, '<div class="tbl"><table>').replace(/<\/table>/g, '</table></div>');

function chipsFor(d) {
  const f = d.formulation.length, t = d.treatment.length, tb = d.dose_tables.length, e = d.exam.items.length, n = d.dispensary.order.length;
  const fs = f ? ['ok', 'из КР'] : d.formulation_ext ? ['info', 'внешний источник'] : d.formulation_draft ? ['warn', 'черновик'] : ['no', 'нет'];
  const sum = d.doses || d.dose_table;
  return `<span class="chip ${fs[0]}">формулировка: ${fs[1]}</span>${sum ? '<span class="chip ok">сводная таблица доз</span>' : ''}
    <span class="chip ${t ? 'ok' : 'no'}">лечение: ${t}, из них с дозами ${d.treatment.filter(x => x.dose).length}</span>
    <span class="chip ${tb ? 'ok' : ''}">таблиц доз: ${tb}</span>
    <span class="chip ${e ? 'ok' : 'no'}">пунктов обследования: ${e}</span>
    <span class="chip ${n ? 'info' : 'no'}">168н: ${n ? 'стр. ' + d.dispensary.order.map(r => r.row).join(', ') : 'нет'}</span>`;
}

function index() {
  document.getElementById('sub').textContent = `${D.length} рекомендаций · база КР от ${dt(D[0].built)}`;
  app.innerHTML = `<div class="banner"><b>Черновик для проверки врачом.</b> Документы собраны автоматически из текста КР: фрагменты дословные, отбор — по правилам скрипта. Диспансерное наблюдение по приказу 168н — пересказ, сверить с официальным текстом.</div>
  <ul class="list">${D.map(d => `<li class="item"><a href="#${slug(d.id)}"><span class="nm"><span class="t">${esc(d.name)}${d.mode === 'brief' ? ' <span class="chip">сокращённая</span>' : ''}</span>
    <span class="meta">КР${esc(d.id)} · ${ageW(d.age)} · от ${dt(d.pub)} · ${esc(d.mkb.slice(0, 6).join(', '))}${d.mkb.length > 6 ? ' …' : ''}</span>
    <span class="chips">${chipsFor(d)}</span></span><span aria-hidden="true">›</span></a></li>`).join('')}</ul>
  <p class="foot">Порядок разделов в документе: классификация → формулировка диагноза → лечение с дозами → обязательное обследование → диспансерное наблюдение.</p>`;
}

function sec(n, id, title, src, body) {
  return `<section class="s" id="${id}"><h3><span class="n">${n}</span><span>${title}</span><span class="src">${esc(src)}</span></h3>${body}</section>`;
}

function krView(d) {
  document.getElementById('sub').textContent = `КР${d.id} · проверка документа`;
  const cls = d.classification.html ? `<div class="card kr">${wrapTables(d.classification.html)}</div>` : `<div class="empty">Раздела 1.5 в КР нет.</div>`;
  const fx = d.formulation_ext ? `<div class="card"><span class="chip" style="align-self:flex-start;background:var(--warn-soft);color:var(--warn)">не из КР · ${esc(d.formulation_ext.src)}</span><ul style="margin:0;padding-left:20px">${d.formulation_ext.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul><span class="meta">${esc(d.formulation_ext.note)} <a href="${esc(d.formulation_ext.url)}">Источник</a></span></div>` : (d.formulation_draft ? `<div class="card"><span class="chip" style="align-self:flex-start;background:var(--warn-soft);color:var(--warn)">черновик · составлен, не из КР</span><ul style="margin:0;padding-left:20px">${d.formulation_draft.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul><span class="meta">${esc(d.formulation_draft.note)}</span></div>` : '');
  const form = fx && !d.formulation.length ? fx : d.formulation.length ? d.formulation.map(f => `<div class="card kr"><span class="chip info" style="align-self:flex-start">КР, раздел ${esc(f.src)}</span>${wrapTables(f.html)}</div>`).join('<div style="height:8px"></div>')
    : `<div class="empty">В тексте КР примера формулировки нет — составить по классификации и критериям качества.</div>`;
  const form2 = d.formulation.length && fx ? form + '<div style="height:8px"></div>' + fx : form;
  const recHtml = r => `<div class="rec kr">${r.html}${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}${r.comment_doses.length ? `<div class="cm">${r.comment_doses.map(esc).join(' ')}</div>` : ''}</div>`;
  const groups = [];
  d.treatment.forEach(r => { const g = groups[groups.length - 1]; if (g && g.h === r.h) g.items.push(r); else groups.push({h: r.h, items: [r]}); });
  const recs = groups.map(g => `<details class="tb"><summary>${esc(g.h || 'Общие положения')} <span class="meta">· ${g.items.length}${g.items.some(x => x.dose) ? ' · есть дозы' : ''}</span></summary><div style="display:flex;flex-direction:column;gap:10px">${g.items.map(recHtml).join('')}</div></details>`).join('');
  const ext = d.doses ? `<div class="card"><b>${esc(d.doses.title)}</b><div class="tbl kr"><table><thead><tr><th>Класс</th><th>Препарат</th><th>Начальная</th><th>Обычная</th><th>Максимальная</th><th>Особенности</th><th>Источник</th></tr></thead><tbody>${d.doses.rows.map(r => `<tr>${r.slice(0, 6).map(c => `<td>${esc(c)}</td>`).join('')}<td><a href="${esc(r[6])}">инструкция</a></td></tr>`).join('')}</tbody></table></div><span class="meta">${esc(d.doses.note)}</span></div><div style="height:10px"></div>` : '';
  const dt2 = d.dose_table ? `<div class="card"><b>${esc(d.dose_table.title)}</b><div class="tbl kr"><table><thead><tr><th>Препарат</th><th>Доза и режим</th><th>Источник</th></tr></thead><tbody>${d.dose_table.rows.map(r => `<tr><td><b>${esc(r[0])}</b></td><td>${esc(r[1])}</td><td>${r[3] ? `<a href="${esc(r[3])}">${esc(r[2])}</a>` : esc(r[2]) + esc(d.id)}</td></tr>`).join('')}</tbody></table></div><span class="meta">${esc(d.dose_table.note)}</span></div><div style="height:10px"></div>` : '';
  const tabs = d.dose_tables.map(t => `<details class="tb"><summary>${esc(t.title)}</summary><div class="kr">${wrapTables(t.html)}</div></details>`).join('');
  const sp = (d.treatment_special || []).map(r => `<div class="rec kr"><div class="h">${esc(r.h)}</div>${r.html}${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}</div>`).join('');
  const spBox = sp ? `<details class="tb" style="margin-top:10px"><summary>Особые ситуации и стационар: ${d.treatment_special.length}</summary><div style="display:flex;flex-direction:column;gap:10px">${sp}</div></details>` : '';
  const treatFull = ext + dt2 + (recs ? `<div style="display:flex;flex-direction:column;gap:8px">${recs}</div>` : `<div class="empty">Рекомендаций с препаратами в разделе 3 не найдено — дозы по инструкции или у специалиста.</div>`)
    + (tabs ? `<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">${tabs}</div>` : '') + spBox;
  const refBox = d.referral ? `<details class="tb" ${d.mode === 'brief' ? 'open' : ''} style="margin-bottom:10px"><summary>Когда направить и госпитализировать (раздел 6 КР)</summary><div class="kr">${wrapTables(d.referral)}</div></details>` : '';
  const treat = d.mode === 'brief' ? `<div class="banner">Лечение ведёт профильный специалист или стационар. Терапевту — обследование, наблюдение и показания к направлению.</div>${refBox}<details class="tb"><summary>Рекомендации по лечению из КР: ${d.treatment.length + (d.treatment_special || []).length}</summary><div>${treatFull}</div></details>` : treatFull + '<div style="height:10px"></div>' + refBox;
  const exam = d.exam.items.length ? `<div class="card"><ul class="checks">${d.exam.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div>`
    + (d.exam.other.length ? `<details class="tb" style="margin-top:10px"><summary>Остальные критерии качества: ${d.exam.other.length}</summary><div><ul class="checks">${d.exam.other.map(i => `<li>${esc(i)}</li>`).join('')}</ul></div></details>` : '')
    : `<div class="empty">Критериев обследования не найдено.</div>`;
  const dn = (d.dispensary.order.length ? d.dispensary.order.map(r => `<div class="card dn"><div class="row1"><span class="chip info">168н, прил. 1, строка ${r.row} · ${esc(r.codes)}</span><span class="chip">${esc(r.freq)}</span><span class="chip">${esc(r.dur)}</span></div>
      <b>${esc(r.name)}</b><ul>${r.ind.map(i => `<li>${esc(i)}</li>`).join('')}</ul><span class="meta">${esc(r.note)}</span></div>`).join('<div style="height:8px"></div>')
      : `<div class="empty">Кодов этой КР нет в приложении 1 приказа 168н.</div>`)
    + (d.dispensary.kr.length ? `<div class="card" style="margin-top:10px"><span class="h" style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--muted)">Из текста КР</span>${d.dispensary.kr.map(r => `<div class="rec kr">${r.html}${r.grade ? `<span class="grade">${esc(r.grade)}</span>` : ''}</div>`).join('')}</div>` : '');

  app.innerHTML = `<a class="back" href="#">‹ Все рекомендации</a>
  <div class="krhead"><h2>${esc(d.name)}</h2><div class="meta">КР${esc(d.id)} · ${ageW(d.age)} · утверждена ${dt(d.pub)}</div>
    <div class="chips">${d.mkb.map(c => `<span class="chip">${esc(c)}</span>`).join('')}</div>
    <a href="${esc(d.url)}">Полный текст на cr.minzdrav.gov.ru</a></div>
  <nav class="jump" aria-label="Разделы документа"><a href="#${slug(d.id)}" data-s="s1">Классификация</a><a href="#${slug(d.id)}" data-s="s2">Диагноз</a><a href="#${slug(d.id)}" data-s="s3">Лечение</a><a href="#${slug(d.id)}" data-s="s4">Обследование</a><a href="#${slug(d.id)}" data-s="s5">Наблюдение</a></nav>
  ${sec(1, 's1', 'Классификация', 'раздел 1.5', cls)}
  ${sec(2, 's2', 'Формулировка диагноза', '', form2)}
  ${sec(3, 's3', 'Лечение: препараты и дозы', 'разделы 3, 7, прил. А3, Б', treat)}
  ${sec(4, 's4', 'Обязательное обследование', d.exam.src, exam)}
  ${sec(5, 's5', 'Диспансерное наблюдение', 'приказ 168н', dn)}
  <p class="foot">Фрагменты — из текста КР${esc(d.id)}, база КР от ${dt(d.built)}. ${esc(d.dispensary.order_note)}</p>`;
  app.querySelectorAll('nav.jump a').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.getElementById(a.dataset.s).scrollIntoView(); }));
}

function route() {
  const h = location.hash.slice(1);
  const d = D.find(x => slug(x.id) === h);
  if (d) krView(d); else index();
  window.scrollTo(0, 0);
}
window.addEventListener('hashchange', route);
route();
</script>
</body>
</html>
'''
open(OUT, 'w').write(HTML.replace('Краткие КР терапевта: пакет 1', TITLE).replace('__DATA__', data))
print(OUT, os.path.getsize(OUT))
