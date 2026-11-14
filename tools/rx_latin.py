#!/usr/bin/env python3
"""Латинские названия МНН для рецептов (родительный падеж) — data/rx/latin.json.

Русское МНН из справочника препаратов → английское МНН по коду АТХ (классификатор ВОЗ ATC/DDD) →
латинское МНН по правилам ВОЗ (английское окончание -e → -um, на согласную → +um; кислоты — acidum …icum;
натриевые/калиевые соли — natricum/kalicum) → родительный падеж. Ручные поправки — data/rx/latin_fix.json.

    python3 tools/rx_latin.py <search.json справочника препаратов> <ATC-DDD.csv>
"""
import collections, csv, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALT = {'hydrochloride': 'hydrochloridum', 'sodium': 'natricum', 'potassium': 'kalicum', 'calcium': 'calcicum', 'magnesium': 'magnesicum',
        'bromide': 'bromidum', 'chloride': 'chloridum', 'sulfate': 'sulfas', 'phosphate': 'phosphas', 'acetate': 'acetas', 'citrate': 'citras',
        'maleate': 'maleas', 'fumarate': 'fumaras', 'tartrate': 'tartras', 'succinate': 'succinas', 'besilate': 'besilas', 'mesilate': 'mesilas',
        'nitrate': 'nitras', 'lactate': 'lactas', 'gluconate': 'gluconas', 'propionate': 'propionas', 'dipropionate': 'dipropionas', 'valerate': 'valeras'}
BAD = {'food', 'various', 'pollen', 'extract', 'esters', 'natural', 'of', 'allergen', 'vaccine', 'vaccines', 'insect', 'factor', 'combinations',
       'products', 'preparations', 'agents', 'other', 'antiserum', 'immunoglobulin', 'toxin', 'ferrous', 'ferric', 'iron', 'oil', 'salts', 'mixtures'}
BAD_FIRST = {'sodium', 'potassium', 'calcium', 'magnesium', 'zinc', 'aluminium', 'silver', 'lithium', 'ammonium', 'hydrogen', 'water', 'oxygen'}
TWO = {'insulin', 'interferon', 'peginterferon', 'botulinum', 'factor'}
GEN_SALT = {'hydrochloridum': 'hydrochloridi', 'natricum': 'natrici', 'kalicum': 'kalici', 'calcicum': 'calcici', 'magnesicum': 'magnesici', 'bromidum': 'bromidi', 'chloridum': 'chloridi'}


def word_lat(w):
    w = w.lower()
    if w.endswith('ium') or w.endswith('um') or w.endswith('us'):
        return w
    if w.endswith('a'):
        return w
    if w.endswith('e'):
        return w[:-1] + 'um'
    if w.endswith('y'):
        return w[:-1] + 'um'
    return w + 'um'


def gen_word(w):
    if w in GEN_SALT:
        return GEN_SALT[w]
    if re.search(r'as$', w):          # sulfas → sulfatis
        return w[:-2] + 'atis'
    if w.endswith('ium'):
        return w[:-2] + 'i'           # tiotropium → tiotropii
    if w.endswith('um') or w.endswith('us'):
        return w[:-2] + 'i'
    if w.endswith('a'):
        return w + 'e'
    return w


def latin_gen(en):
    """'amlodipine' → 'Amlodipini'; 'acetylsalicylic acid' → 'Acidi acetylsalicylici'; 'levothyroxine sodium' → 'Levothyroxini natrici'."""
    en = en.strip().lower()
    if not re.fullmatch(r"[a-z][a-z\-]*( [a-z\-]+)?", en):
        return None
    ws = en.split()
    if ws[0] in BAD_FIRST or any(w in BAD for w in ws):
        return None
    if len(ws) == 2 and not (ws[1] in SALT or ws[1] == 'acid' or ws[0] in TWO):
        return None
    if ws[-1] == 'acid':
        adj = ' '.join(x[:-2] + 'i' if x.endswith('ic') else x for x in ws[:-1])
        out = 'acidi ' + ' '.join((x[:-2] + 'ici') if x.endswith('ic') else x for x in ws[:-1])
        return out[0].upper() + out[1:]
    lat = [SALT.get(x) or word_lat(x) for x in ws]
    out = ' '.join(gen_word(x) for x in lat)
    return out[0].upper() + out[1:]


TR = dict(zip('абвгдеёжзийклмнопрстуфхцчшщъыьэюя', ['a','b','v','g','d','e','e','zh','z','i','i','k','l','m','n','o','p','r','s','t','u','f','kh','c','ch','sh','sch','','y','','e','yu','ya']))


def similar(ru, en):
    """Русское и английское МНН — одно вещество: сверка транслитерации первого слова (эналаприлат ≠ enalapril)."""
    import difflib
    r = ''.join(TR.get(c, c) for c in ru.lower().split()[0])
    e = en.lower().split()[0].replace('ph', 'f').replace('th', 't').replace('y', 'i').replace('x', 'ks').replace('w', 'v').replace('qu', 'kv')
    r = re.sub(r'(а|я|ы|и)$', '', ru.lower().split()[0]) and ''.join(TR.get(c, c) for c in re.sub(r'(а|я)$', '', ru.lower().split()[0]))
    if ru.lower().split()[0].endswith('ат') and not e.endswith('at') and not e.endswith('ate'):
        return False
    return difflib.SequenceMatcher(None, r, e.rstrip('e')).ratio() >= 0.72


def main(search, atc_csv):
    atc = {}
    for r in csv.DictReader(open(atc_csv, encoding='utf-8')):
        if len(r['atc_code']) == 7:
            atc[r['atc_code']] = r['atc_name']
    rows = json.load(open(search, encoding='utf-8'))['rows']
    votes = collections.defaultdict(collections.Counter)
    for r in rows:
        mnn, code = (r[1] or '').strip(), (r[4] or '').strip()
        if not mnn or '+' in mnn or code not in atc:
            continue
        lg = latin_gen(atc[code])
        if lg and similar(mnn, atc[code]):
            votes[mnn.lower().replace('ё', 'е')][lg] += 1
    out = {k: v.most_common(1)[0][0] for k, v in votes.items()}
    fx = os.path.join(ROOT, 'data', 'rx', 'latin_fix.json')
    if os.path.exists(fx):
        for k, v in json.load(open(fx, encoding='utf-8')).items():
            if not k.startswith('_'):
                if v: out[k] = v
                else: out.pop(k, None)
    json.dump(dict(sorted(out.items())), open(os.path.join(ROOT, 'data', 'rx', 'latin.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=0)
    print(len(out), 'МНН')


if __name__ == '__main__':
    main(*sys.argv[1:3])
