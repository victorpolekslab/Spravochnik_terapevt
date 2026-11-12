"""Сборщик краткой КР для терапевта: 5 разделов из дословных фрагментов КР + строки приказа 168н.
python3 -I build.py <kr_full.db> <r168.json> <out_dir> <ID> [<ID> ...]
"""
import sqlite3, zlib, re, json, sys, os
from html.parser import HTMLParser

DB, R168F, OUT = sys.argv[1:4]
IDS = sys.argv[4:]
db = sqlite3.connect(DB)
R168 = json.load(open(R168F))
BRIEF = {'160_2', '569_2', '838_1', '1033_1', '738_2', '783_1', '894_1', '816_1', '677_1', '814_1', '893_1', '157_5', '154_4', '949_1', '574_3', '1_4', '115_3', '795_1', '1000_1', '176_2', '193_2', '619_3'}
EXTRA = json.load(open(os.path.join(os.path.dirname(R168F), 'extras.json')))
BUILT = db.execute("select v from meta where k='built'").fetchone()[0]

KEEP = {'p', 'ul', 'ol', 'li', 'table', 'thead', 'tbody', 'tr', 'td', 'th', 'strong', 'b', 'em', 'i', 'sup', 'sub', 'br', 'h2', 'h3', 'h4'}

class Clean(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True); self.o = []
    def handle_starttag(self, t, a):
        if t in KEEP:
            span = [f' {k}="{v}"' for k, v in a if k in ('colspan', 'rowspan') and v and v.isdigit()] if t in ('td', 'th') else []
            self.o.append(f'<{t}{"".join(span)}>')
    def handle_endtag(self, t):
        if t in KEEP and t != 'br': self.o.append(f'</{t}>')
    def handle_data(self, d):
        self.o.append(d.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;'))

def clean(h):
    c = Clean(); c.feed(h); s = ''.join(c.o)
    s = re.sub(r'<p>\s*</p>', '', s)
    return re.sub(r'\s+', ' ', s).strip()

def plain(h):
    return re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', h)).replace('&lt;', '<').replace('&gt;', '>').replace('&amp;', '&').strip()

# разбиение HTML раздела на блоки верхнего уровня
BLK = re.compile(r'<(h[2-4]|p|ul|ol|table)\b[^>]*>.*?</\1>', re.S)
def blocks(h):
    return [(m.group(1), m.group(0)) for m in BLK.finditer(h)]

DOSE = re.compile(r'\d+(?:[.,]\d+)?(?:\s?[-–]\s?\d+(?:[.,]\d+)?)?\s?(?:мг|мкг|г|МЕ|ЕД|ммоль|мл)(?:/кг|/сут|/м²)?(?=[\s,.;:)\]/×x]|$)')
GRADE = re.compile(r'УУР\s*[ABCАВС]', re.I)
GRADE2 = re.compile(r'[Уу]ровень убедительности рекомендаций\s*([ABCАВС])\s*\(уровень достоверности доказательств\s*[–-]\s*(\d)', re.I)
def norm_grade(t):
    m = GRADE2.search(t)
    if m: return f'УУР {m.group(1)} · УДД {m.group(2)}'
    m = re.search(r'УУР\s*([ABCАВС])\s*,?\s*УДД\s*(\d)', t)
    return f'УУР {m.group(1)} · УДД {m.group(2)}' if m else t
DRUG = re.compile(r'\d+(?:[.,]\d+)?(?:\s?[-–]\s?\d+(?:[.,]\d+)?)?\s?(?:мг|мкг|МЕ|ЕД)(?![а-я])')
NONDRUG = re.compile(r'диет|питани|\bсол[ьи]\b|алкогол|ккал|этанол', re.I)
MARK = re.compile(r'\*\*|#|доз|сут|раз')
def is_dose(t):
    return bool(DRUG.search(t)) and bool(MARK.search(t)) and (not NONDRUG.search(t) or '**' in t)
FORM = re.compile(r'(пример\w*\s+(формулировк\w*\s+)?(клиническ\w+\s+)?диагноз\w*|формулировк\w*\s+(клиническ\w+\s+)?диагноз)', re.I)

def sec(cid, sid):
    r = db.execute("select html,title from sec where cr=? and sid=?", (cid, sid)).fetchone()
    return (zlib.decompress(r[0]).decode(), r[1]) if r and r[0] else ('', '')

def all_secs(cid):
    return [(s, t, zlib.decompress(h).decode()) for s, t, h in db.execute("select sid,title,html from sec where cr=? and html is not null order by ord", (cid,))]

def match168(code, spec):
    for part in [p.strip().replace('–', '-') for p in spec.split(';')]:
        if '-' in part:
            a, b = part.split('-')
            if '.' in a:
                if a <= code <= b + '~' or (len(code) == 3 and a[:3] <= code <= b[:3]): return True
            elif a <= code[:3] <= b: return True
        elif code == part or code.startswith(part + '.') or part.startswith(code + '.') or (len(part) == 3 and code[:3] == part):
            return True
    return False

def recs(h):
    """Рекомендации раздела: [{h, text, grade, comment}] в порядке текста."""
    out, head, cur = [], '', None
    for tag, b in blocks(h):
        t = plain(b)
        if tag in ('h2', 'h3', 'h4'):
            head = t; cur = None; continue
        if tag in ('ul', 'ol') and 'екоменд' in t:
            cur = {'h': head, 'html': clean(b), 'text': t, 'grade': '', 'comment': ''}; out.append(cur); continue
        if cur is not None and tag == 'p' and not cur['grade'] and len(t) < 160 and (GRADE.search(t) or GRADE2.search(t)):
            cur['grade'] = norm_grade(t); continue
        if cur is not None and tag == 'p' and t.startswith('Комментари'):
            cur['comment'] = t; continue
        if cur is not None and tag == 'p' and cur['comment']:
            cur['comment'] += ' ' + t
    return out

def sentences_with_dose(t):
    return [s.strip() for s in re.split(r'(?<=[.;])\s+(?=[А-ЯЁA-Z#])', t) if is_dose(s)]

CHILD = re.compile(r'дет(ям|ей|и|ский|ского|ском)\b|подростк|ребен|ребён|младше \d+ лет|до 1[0-8] лет|от \d+ до 1[0-7] лет|новорожд', re.I)
ADULT = re.compile(r'взросл', re.I)
def child_only(t):
    return bool(CHILD.search(t)) and not ADULT.search(t)
def tables_with_doses(h, sid, min_hits=4):
    out, title = [], ''
    for tag, b in blocks(h):
        t = plain(b)
        if tag in ('p', 'h2', 'h3', 'h4') and re.match(r'(Таблица|Приложение\s+[АБ]\d?\.\d)', t) and len(t) < 400:
            title = t[:220]
        elif tag == 'table':
            hits = len(DRUG.findall(t)) + (len(re.findall(r'\d+\s?[-–]\s?\d+|[>≥]\s?\d+', t)) if 'мкг' in t[:200] or 'доз' in title.lower() else 0)
            dosey = 'доз' in (title + ' ' + t[:300]).lower() or t.count('**') >= 3
            if hits >= min_hits and (dosey or 'сут' in t) and not re.search(r'фактор|критери|классификац|стади', title, re.I):
                out.append({'title': title or 'Таблица без названия', 'where': sid, 'html': clean(b), 'chars': len(t), 'child': child_only(title)})
            title = ''
    return out

def criteria(cid):
    h, _ = sec(cid, 'doc_criteria')
    groups, title = [], ''
    for tag, b in blocks(h):
        t = plain(b)
        if tag == 'p' and len(t) > 15: title = t
        elif tag == 'table':
            items = []
            for row in re.findall(r'<tr>(.*?)</tr>', b, re.S):
                cells = [plain(c) for c in re.findall(r'<t[dh][^>]*>(.*?)</t[dh]>', row, re.S)]
                if len(cells) >= 2 and not cells[1].lower().startswith('критери'):
                    items.append(cells[1])
            if items: groups.append({'title': title, 'items': items})
    pm = [g for g in groups if re.search(r'первичн|амбулатор|поликлин', g['title'], re.I)]
    return pm or groups, bool(pm)

SPECIAL = re.compile(r'беремен|лактац|диализ|реанима|хирург|операц|интенсивн|в стационар|внутривенн|в/в|трансплант|абляц|аблац|имплант|реваскуляр|шок|кровотечен|перфора|\bкома|гипертоническ\w+ криз|астматическ\w+ статус|\bОКС\b|катетер|доступ для|\bИВЛ\b|кислородотерап', re.I)
CLASSES = re.compile(r'иАПФ|ингибитор\w* АПФ|\bБРА\b|\bАРА\b|блокатор\w* кальциев|\bАК\b|диуретик|бета-адреноблокатор|β-АБ|\bББ\b|статин|\bИПН\b|ингибитор\w* протонн|метформин|антикоагулянт|антиагрегант|эзетимиб|\bИГКС\b|\bКДБА\b|\bДДБА\b|антибактериальн|иНГЛТ|АМКР|антагонист\w* альдостерон', re.I)
EXAM = re.compile(r'(выполнен|проведен|зафиксирован|определен|измерен|рассчитан|оценен|исследован)', re.I)
NOT_EXAM = re.compile(r'назнач|терапи|лечени|обучен|консультир|направлен|госпитализ|вакцин|отказ', re.I)

def build(cid):
    name, age, pub, mkb, ass = db.execute("select name,age,pub,mkb,ass from cr where id=?", (cid,)).fetchone()
    codes = [c.strip() for c in (mkb or '').split(',') if c.strip()]
    secs = all_secs(cid)
    S = {s: h for s, t, h in secs}
    doc = {'id': cid, 'name': name, 'age': age, 'pub': pub, 'ass': ass, 'mkb': codes, 'built': BUILT,
           'url': f'https://cr.minzdrav.gov.ru/preview-cr/{cid}', 'review': 'черновик — требует проверки врачом'}

    # 1. Классификация
    c15, t15 = sec(cid, 'doc_crat_info_1_5')
    doc['classification'] = {'src': '1.5', 'html': clean(c15)}

    # 2. Формулировка диагноза: блок с совпадением + следующие блоки до заголовка (≤ 3500 знаков)
    form = []
    for sid, title, h in secs:
        if sid in ('doc_bible', 'doc_a1', 'doc_a2', 'doc_criteria'): continue
        bl = blocks(h)
        for i, (tag, b) in enumerate(bl):
            if FORM.search(plain(b)):
                take, n = [], 0
                for tg, bb in bl[i:i + 12]:
                    if take and tg in ('h2', 'h3', 'h4'): break
                    take.append(clean(bb)); n += len(plain(bb))
                    if n > 3500: break
                form.append({'src': title.split(' ')[0] if title else sid, 'sid': sid, 'html': ''.join(take)})
    GOOD = re.compile(r'пример\w*\s+формулировк|принцип\w*\s+формулировк|^\s*формулировк\w*\s+(клиническ\w+\s+)?диагноз|в диагнозе должн|при формулировке диагноза\s+(отмеча|необходимо|указ|следует)', re.I)
    form = [f for f in form if GOOD.search(plain(f['html'])[:400])]
    form.sort(key=lambda f: 0 if re.search(r'[Пп]ример', plain(f['html'])[:300]) else 1)
    uniq = []
    for f in form:
        k = plain(f['html'])
        if any(k[:150] in plain(u['html']) for u in uniq): continue
        uniq = [u for u in uniq if plain(u['html'])[:150] not in k] + [f]
    doc['formulation'] = uniq[:3]

    # 3. Лечение: рекомендации с препаратом (** или #) или дозой; особые ситуации отдельно
    tr, special, dropped_child = [], [], 0
    for r in recs(S.get('doc_3', '')) + recs(S.get('doc_7', '')):
        has_dose = is_dose(r['text'])
        cs = sentences_with_dose(r['comment']) if r['comment'] else []
        named = '**' in r['text'] or '#' in r['text'] or bool(CLASSES.search(r['text']))
        if not (has_dose or cs or named): continue
        if age == 3 and child_only(r['text']): dropped_child += 1; continue
        item = {'h': r['h'], 'html': r['html'], 'grade': r['grade'], 'comment_doses': cs[:4], 'dose': bool(has_dose or cs)}
        (special if SPECIAL.search(r['h'] + ' ' + r['text'][:160]) else tr).append(item)
    doc['treatment'] = tr
    doc['treatment_special'] = special
    tabs = [t for sid in ('doc_3', 'doc_7', 'doc_a3', 'doc_b') for t in tables_with_doses(S.get(sid, ''), sid)]
    doc['dose_tables'] = [t for t in tabs if not t['child']]
    doc['dropped'] = {'child_recs': dropped_child, 'child_tables': sum(1 for t in tabs if t['child'])}

    # 4. Обследование: критерии качества (ПМСП, если есть) — пункты «выполнено…»
    groups, pm = criteria(cid)
    exam, other = [], []
    for g in groups:
        for it in g['items']:
            (exam if EXAM.search(it) and not NOT_EXAM.search(it) else other).append(it)
    doc['exam'] = {'src': 'Критерии оценки качества' + (' ПМСП' if pm else ''), 'items': list(dict.fromkeys(exam)), 'other': list(dict.fromkeys(other))}

    # 5. ДН: строки 168н по кодам + рекомендации КР о диспансерном наблюдении
    rows = sorted({k for k, v in R168.items() if k != '_note' for c in codes if match168(c, v['codes'])}, key=int)
    dn_recs = [r for sid in ('doc_5', 'doc_6') for r in recs(S.get(sid, '')) if 'испансер' in r['text']]
    doc['dispensary'] = {'order': [dict(R168[k], row=int(k)) for k in rows], 'order_note': R168['_note'],
                         'kr': [{'html': r['html'], 'grade': r['grade']} for r in dn_recs][:8]}
    r6 = S.get('doc_6', '')
    doc['referral'] = clean(r6) if len(plain(r6)) < 12000 else ''
    doc['mode'] = 'brief' if cid in BRIEF else 'full'
    doc.update(EXTRA.get(cid, {}))
    doc['stats'] = {'special': len(special), 'with_dose': sum(1 for t in tr if t['dose']), 'dropped': doc['dropped'], 'treatment_recs': len(tr), 'dose_tables': len(doc['dose_tables']), 'formulation': len(uniq), 'exam': len(exam), 'dn_rows': rows}
    return doc

os.makedirs(OUT, exist_ok=True)
for cid in IDS:
    d = build(cid)
    json.dump(d, open(os.path.join(OUT, f'{cid}.json'), 'w'), ensure_ascii=False, indent=1)
    print(cid, d['name'][:45], d['stats'])
