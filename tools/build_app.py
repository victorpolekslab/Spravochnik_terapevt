#!/usr/bin/env python3
"""Сборка приложения «Справочник терапевта».

  python3 tools/build_app.py www                 — собрать build/www и скопировать в android/app/src/main/assets/www
  python3 tools/build_app.py site --apk FILE     — собрать build/site для ветки gh-pages:
                                                   ota/manifest.json + manifest.sig + ota/files/*, android.json, download/*.apk, index.html

Данные: data/brief/kr/*.json, data/reference/*.json, data/cochrane/terms.json, база КР (--db, по умолчанию /home/claude/kr/kr_full.db).
Подпись OTA: закрытый ключ ECDSA P-256 (--key или $OTA_KEY), openssl dgst -sha256 -sign.
"""
import argparse, base64, datetime, glob, hashlib, json, os, re, shutil, sqlite3, subprocess, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WEB = os.path.join(ROOT, 'web')
OUT = os.path.join(ROOT, 'build')
ASSETS = os.path.join(ROOT, 'android', 'app', 'src', 'main', 'assets', 'www')
SITE_URL = 'https://victorpolekslab.github.io/Spravochnik_terapevt/'

W = r'\p{L}\p{N}_'


def py2js(rx):
    """Регулярное выражение Python (re.I, \\w и \\b — Юникод) → JS с флагом u: \\w и \\b в JS только ASCII."""
    out, i, inset = [], 0, False
    while i < len(rx):
        c = rx[i]
        if c == '\\' and i + 1 < len(rx):
            n = rx[i + 1]
            if n == 'w':
                out.append(W if inset else '[' + W + ']')
            elif n == 'b':
                prev = rx[i - 1] if i else ''
                start = i == 0 or prev in '(|' or rx[max(0, i - 3):i] in ('(?:',)
                out.append(f'(?<![{W}])' if start else f'(?![{W}])')
            else:
                out.append(c + n)
            i += 2
            continue
        if c == '[' and not inset:
            inset = True
        elif c == ']' and inset:
            inset = False
        out.append(c)
        i += 1
    return ''.join(out)


def js(name, obj):
    return f'var {name}=' + json.dumps(obj, ensure_ascii=False, separators=(',', ':')) + ';\n'


def build_data(db, version):
    docs = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'brief', 'kr', '*.json'))):
        d = json.load(open(f, encoding='utf-8'))
        for k in ('dropped', 'stats', 'review'):
            d.pop(k, None)
        docs[d['id']] = d
    idx = json.load(open(os.path.join(ROOT, 'data', 'brief', 'index.json'), encoding='utf-8'))
    built = idx['meta'].get('built') or next(iter(docs.values()))['built']

    ref = {}
    for f in sorted(glob.glob(os.path.join(ROOT, 'data', 'reference', '*.json'))):
        r = json.load(open(f, encoding='utf-8'))
        ref[r['id']] = r

    t = json.load(open(os.path.join(ROOT, 'data', 'cochrane', 'terms.json'), encoding='utf-8'))
    terms = [{'id': x['id'], 'kind': x['kind'], 'ru': x['ru'], 'en': x['en'], 'jsrx': py2js(x['rx'])} for x in t['terms']]

    c = sqlite3.connect(db)
    adult = {r[0]: [r[1], r[2]] for r in c.execute('SELECT id, name, age FROM cr WHERE age IN (1,3)')}
    nodes = [[code, name, lvl] for code, name, lvl in c.execute('SELECT code, name, lvl FROM mkb ORDER BY sort')]
    direct = {}
    for cr, code in c.execute('SELECT cr, code FROM cr_mkb'):
        if cr in adult:
            direct.setdefault(code, set()).add(cr)
    # КР к коду: указан сам код, любой из его подкодов или трёхзначная рубрика, в которую он входит
    kr = {}
    codes = [n[0] for n in nodes if '-' not in n[0]]
    for code in codes:
        s = set(direct.get(code, ()))
        if '.' in code:
            s |= direct.get(code.split('.')[0], set())
        for k, v in direct.items():
            if k.startswith(code + '.') or (len(code) == 3 and k.startswith(code) and k != code and k[3:4] == '.'):
                s |= v
        if s:
            kr[code] = sorted(s, key=lambda x: (x not in docs, x))
    used = set(x for v in kr.values() for x in v)
    mkb = {'n': nodes, 'kr': kr, 'cr': {k: v for k, v in adult.items() if k in used}}
    meta = {'v': str(version), 'kr_built': built, 'built': datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%d'), 'ndocs': len(docs)}
    return {
        'data_meta.js': js('META', meta),
        'data_brief.js': js('BRIEF', {'docs': docs}),
        'data_ref.js': js('REF', ref),
        'data_terms.js': js('TERMS', {'terms': terms, 'conditions': t['conditions']}),
        'data_mkb.js': js('MKB', mkb),
    }


def build_www(a):
    version = a.version or int(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%d%H%M'))
    www = os.path.join(OUT, 'www')
    shutil.rmtree(www, ignore_errors=True)
    os.makedirs(www)
    for f in ('index.html', 'app.css', 'app.js'):
        shutil.copy(os.path.join(WEB, f), www)
    for name, text in build_data(a.db, version).items():
        open(os.path.join(www, name), 'w', encoding='utf-8').write(text)
    open(os.path.join(www, 'ota_version.txt'), 'w').write(str(version))
    shutil.rmtree(ASSETS, ignore_errors=True)
    shutil.copytree(www, ASSETS)
    for f in sorted(os.listdir(www)):
        print(f'{f:18} {os.path.getsize(os.path.join(www, f)):>9}')
    print('version', version)


def sha(p):
    return hashlib.sha256(open(p, 'rb').read()).hexdigest()


def build_site(a):
    www = os.path.join(OUT, 'www')
    site = os.path.join(OUT, 'site')
    if not os.path.exists(os.path.join(www, 'ota_version.txt')):
        sys.exit('сначала: build_app.py www')
    v = int(open(os.path.join(www, 'ota_version.txt')).read().strip())
    shutil.rmtree(site, ignore_errors=True)
    os.makedirs(os.path.join(site, 'ota', 'files'))
    files = []
    for f in sorted(os.listdir(www)):
        if f == 'ota_version.txt':
            continue
        shutil.copy(os.path.join(www, f), os.path.join(site, 'ota', 'files', f))
        files.append([f, sha(os.path.join(www, f)), os.path.getsize(os.path.join(www, f))])
    man = json.dumps({'v': v, 'minNative': a.min_native, 'files': files}, ensure_ascii=False, separators=(',', ':')).encode()
    mp = os.path.join(site, 'ota', 'manifest.json')
    open(mp, 'wb').write(man)
    key = a.key or os.environ.get('OTA_KEY')
    if not key:
        sys.exit('нужен закрытый ключ OTA: --key или OTA_KEY')
    sig = subprocess.run(['openssl', 'dgst', '-sha256', '-sign', key, mp], check=True, capture_output=True).stdout
    open(os.path.join(site, 'ota', 'manifest.sig'), 'w').write(base64.b64encode(sig).decode() + '\n')
    if a.pub:
        subprocess.run(['openssl', 'dgst', '-sha256', '-verify', a.pub, '-signature', '/dev/stdin', mp], input=sig, check=True, capture_output=True)

    meta = json.loads(open(os.path.join(www, 'data_meta.js'), encoding='utf-8').read()[len('var META='):-2])
    apk_info = {}
    if a.apk:
        os.makedirs(os.path.join(site, 'download'))
        shutil.copy(a.apk, os.path.join(site, 'download', 'SpravochnikTerapevt.apk'))
        apk_info = {'versionCode': a.version_code, 'versionName': a.version_name, 'url': SITE_URL + 'download/SpravochnikTerapevt.apk',
                    'size': os.path.getsize(a.apk), 'sha256': sha(a.apk), 'notes': a.notes, 'minSdk': 26}
        open(os.path.join(site, 'android.json'), 'w', encoding='utf-8').write(json.dumps(apk_info, ensure_ascii=False, indent=1))
    if not a.apk and a.keep and os.path.exists(os.path.join(a.keep, 'android.json')):
        # обновление только данных: APK и android.json — с прошлой публикации
        shutil.copytree(os.path.join(a.keep, 'download'), os.path.join(site, 'download'))
        shutil.copy(os.path.join(a.keep, 'android.json'), site)
        apk_info = json.load(open(os.path.join(site, 'android.json'), encoding='utf-8'))
    mb = round(apk_info.get('size', 0) / 1048576, 1)
    html = f'''<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Справочник терапевта — скачать</title><style>
body{{font:16px/1.5 system-ui,-apple-system,Roboto,sans-serif;margin:0;background:#F6F4F1;color:#1E2328}}main{{max-width:560px;margin:0 auto;padding:28px 18px 40px}}
h1{{font-size:26px;margin:0 0 4px}}.m{{color:#5C6670;font-size:14px}}.b{{display:block;text-align:center;background:#A8322F;color:#fff;text-decoration:none;font-weight:700;padding:16px;border-radius:14px;margin:22px 0 8px;font-size:18px}}
.c{{background:#fff;border-radius:14px;padding:14px 16px;margin:14px 0;box-shadow:0 1px 2px rgba(0,0,0,.06)}}ol{{padding-left:20px;margin:6px 0}}code{{font-size:12px;word-break:break-all}}a{{color:#A8322F}}
</style></head><body><main>
<h1>Справочник терапевта</h1><div class="m">Калькуляторы, краткие клинические рекомендации Минздрава по МКБ-10, алгоритмы. Android 8.0 и новее.</div>
{f'<a class="b" href="download/SpravochnikTerapevt.apk">Скачать APK · {mb} МБ</a><div class="m">Версия {apk_info["versionName"]}</div>' if apk_info else ''}
<div class="c"><b>Установка</b><ol><li>Скачайте файл и откройте его из уведомления или «Загрузок».</li><li>Разрешите установку из этого источника, если телефон спросит.</li><li>Новые данные приложение загрузит само: раз в сутки в фоне, при наличии интернета.</li></ol></div>
<div class="c"><b>Сейчас в справочнике</b><div>{meta['ndocs']} кратких КР · база КР от {'.'.join(reversed(meta['kr_built'].split('-')))} · данные {v}</div>
<div class="m">Черновик для проверки врачом. Не заменяет инструкцию к препарату и решение врача.</div></div>
{f'<div class="m">SHA-256 APK: <code>{apk_info["sha256"]}</code></div>' if apk_info else ''}
</main></body></html>'''
    open(os.path.join(site, 'index.html'), 'w', encoding='utf-8').write(html)
    open(os.path.join(site, '.nojekyll'), 'w').close()
    print('site', site, 'ota v', v, 'files', len(files))


if __name__ == '__main__':
    p = argparse.ArgumentParser()
    p.add_argument('what', choices=['www', 'site'])
    p.add_argument('--db', default='/home/claude/kr/kr_full.db')
    p.add_argument('--version', type=int)
    p.add_argument('--key'); p.add_argument('--pub')
    p.add_argument('--min-native', type=int, default=1)
    p.add_argument('--apk'); p.add_argument('--version-code', type=int, default=1); p.add_argument('--version-name', default='1.0')
    p.add_argument('--notes', default='')
    p.add_argument('--keep', help='папка прошлой публикации (ветка gh-pages): взять из неё APK, если --apk не задан')
    a = p.parse_args()
    build_www(a) if a.what == 'www' else build_site(a)
