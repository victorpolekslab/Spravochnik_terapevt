import sqlite3, zlib, re, json, csv, sys

DB = sys.argv[1]
OUT = sys.argv[2]
db = sqlite3.connect(DB)

# Приказ 168н, приложение 1 (терапевт): номер строки -> коды
R168 = {1: 'I10-I15', 2: 'I20-I25;Z95.1;Z95.5', 3: 'I44-I49;Z95.0', 4: 'I50', 5: 'I65.2', 6: 'E78', 7: 'R73.0;R73.9', 8: 'E11',
        9: 'I69.0-I69.4;I67.8', 10: 'K20', 11: 'K21.0', 12: 'K25', 13: 'K26', 14: 'K31.7', 15: 'K86', 16: 'J41.0;J41.1;J41.8',
        17: 'J44.0;J44.8;J44.9', 18: 'J47.0', 19: 'J45.0;J45.1;J45.8;J45.9', 20: 'J12;J13;J14', 21: 'J84.1', 22: 'N18.1', 23: 'N18.9',
        24: 'M81.5', 25: 'K29.4;K29.5', 26: 'D12.6', 28: 'D12.8;K62.1', 29: 'K50;K51', 30: 'K22.0;K22.2', 31: 'K22.7',
        32: 'K70.3;K74.3-K74.6', 33: 'D13.4', 34: 'D37.6'}

def match(code, spec):
    for part in spec.split(';'):
        if '-' in part:
            a, b = part.split('-')
            if '.' in a:
                if a <= code <= b + '~' or (len(code) == 3 and a[:3] <= code <= b[:3]):
                    return True
            elif a <= code[:3] <= b:
                return True
        elif code == part or code.startswith(part + '.') or part.startswith(code + '.') or (len(part) == 3 and code[:3] == part):
            return True
    return False

def text(h):
    return re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', zlib.decompress(h).decode())) if h else ''

RX_FORM = re.compile(r'(пример\w*\s+(формулировк\w*\s+)?(клиническ\w+\s+)?диагноз\w*|формулировк\w*\s+(клиническ\w+\s+)?диагноз)', re.I)
RX_DOSE = re.compile(r'\d+(?:[.,]\d+)?\s?(?:мг|мкг|МЕ|ЕД|ммоль|мл)(?:/кг)?\b')
SKIP = {'doc_bible', 'doc_a1', 'doc_a2'}

rows = []
for cid, name, age, pub, mkb in db.execute("select id,name,age,pub,mkb from cr where age in (1,3) order by name"):
    secs = {sid: text(h) for sid, h in db.execute("select sid, html from sec where cr=?", (cid,))}
    codes = [c.strip() for c in (mkb or '').split(',') if c.strip()]
    r168 = sorted({n for n, sp in R168.items() for c in codes if match(c, sp)})
    cls = len(secs.get('doc_crat_info_1_5', ''))
    form = any(RX_FORM.search(t) for s, t in secs.items() if s not in SKIP)
    doses = sum(len(RX_DOSE.findall(secs.get(s, ''))) for s in ('doc_3', 'doc_a3', 'doc_b'))
    crit = len(secs.get('doc_criteria', ''))
    diag = sum(len(t) for s, t in secs.items() if s.startswith('doc_diag_2'))
    dn = 'диспансерн' in (secs.get('doc_5', '') + secs.get('doc_6', '')).lower()
    rows.append(dict(id=cid, name=name, age={1: 'взрослые', 3: 'все'}[age], pub=pub, codes=len(codes),
                     r168=','.join(map(str, r168)), cls=cls >= 150, form=form, doses=doses, dose_ok=doses >= 5,
                     exam=crit >= 100 and diag >= 300, crit=crit >= 100, dn_kr=dn))

with open(OUT, 'w', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0]))
    w.writeheader(); w.writerows(rows)

def summ(sub, title):
    n = len(sub)
    p = lambda k: f"{sum(1 for r in sub if r[k])} ({100*sum(1 for r in sub if r[k])//max(n,1)}%)"
    print(f"\n== {title}: {n}")
    for k, t in [('cls', 'классификация (1.5 ≥150 зн.)'), ('form', 'пример/формулировка диагноза'), ('dose_ok', 'дозы (≥5 упоминаний доз)'),
                 ('exam', 'обследование (разд.2 + критерии)'), ('crit', 'критерии качества'), ('dn_kr', 'ДН упомянуто в разд. 5/6')]:
        print(f"  {t}: {p(k)}")
    full = sum(1 for r in sub if r['cls'] and r['form'] and r['dose_ok'] and r['exam'])
    print(f"  все 4 раздела из КР: {full}")

summ(rows, 'Все взрослые КР')
ter = [r for r in rows if r['r168']]
summ(ter, 'КР с кодами из приложения 1 приказа 168н (терапевт)')
print('\n168н строки без КР:', sorted(set(R168) - {int(x) for r in ter for x in r['r168'].split(',')}))
print('\nтерапевт, нет формулировки:', [r['id'] + ' ' + r['name'][:40] for r in ter if not r['form']])
print('\nтерапевт, мало доз:', [r['id'] + ' ' + r['name'][:40] + f" ({r['doses']})" for r in ter if not r['dose_ok']])
