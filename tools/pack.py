"""Собирает оглавление и общий файл. python3 -I pack.py <dir с kr/*.json>"""
import json, glob, os, gzip, sys, datetime
D = sys.argv[1]
docs = [json.load(open(f)) for f in sorted(glob.glob(os.path.join(D, 'kr', '*.json')))]
def form_src(d):
    return 'kr' if d['formulation'] else 'external' if d.get('formulation_ext') else 'draft' if d.get('formulation_draft') else 'none'
def dose_src(d):
    return 'instructions' if d.get('doses') else 'mixed' if d.get('dose_table') else 'kr_tables' if d['dose_tables'] else 'kr_text'
idx = [{'id': d['id'], 'name': d['name'], 'age': d['age'], 'pub': d['pub'], 'mkb': d['mkb'], 'mode': d['mode'],
        'r168': [r['row'] for r in d['dispensary']['order']], 'formulation': form_src(d), 'dose_table': dose_src(d),
        'treatment': len(d['treatment']), 'special': len(d.get('treatment_special', [])), 'exam': len(d['exam']['items']), 'url': d['url']} for d in docs]
idx.sort(key=lambda x: (x['mode'] != 'full', x['name']))
meta = {'title': 'Краткие клинические рекомендации для врача-терапевта', 'kr_built': docs[0]['built'],
        'generated': datetime.date.today().isoformat(), 'count': len(idx), 'status': 'черновик — требует проверки врачом'}
json.dump({'meta': meta, 'items': idx}, open(os.path.join(D, 'index.json'), 'w'), ensure_ascii=False, indent=1)
raw = json.dumps({'meta': meta, 'items': idx, 'docs': {d['id']: d for d in docs}}, ensure_ascii=False, separators=(',', ':')).encode()
with gzip.GzipFile(os.path.join(D, 'brief_kr.json.gz'), 'wb', mtime=0) as g: g.write(raw)
print(len(idx), 'КР, база КР от', meta['kr_built'])
