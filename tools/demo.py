#!/usr/bin/env python3
"""Демо-копия справочника на отдельном адресе: свой репозиторий GitHub Pages, по адресу не видно основной сайт.

    python3 tools/demo.py build <repo> <YYYY-MM-DD>   → build/demo/<repo>/ (затем git push в репозиторий <repo>)

Что внутри: текущая веб-версия (build/www) со сроком META.demo_until, ссылки «поделиться» ведут на демо,
баннера APK нет. В .github/workflows/expire.yml — ежедневная проверка: после срока содержимое заменяется
страницей «Демо-доступ закончился», а service worker удаляет офлайн-кэш демо и снимает себя с телефона.
"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from build_app import OUT, SW_JS, sha

OWNER = 'victorpolekslab'
MAIN = 'https://victorpolekslab.github.io/Spravochnik_terapevt/'

EXPIRED_HTML = '''<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Демо-доступ закончился</title><style>body{font:16px/1.5 system-ui,-apple-system,Roboto,sans-serif;margin:0;background:#F6F4F1;color:#1E2328}
main{max-width:520px;margin:0 auto;padding:48px 20px}.c{background:#fff;border-radius:14px;padding:20px;box-shadow:0 1px 2px rgba(0,0,0,.06)}h1{font-size:22px;margin:0 0 8px}</style>
<script>if('serviceWorker' in navigator)navigator.serviceWorker.getRegistrations().then(r=>r.forEach(x=>x.scope===new URL('./',location.href).href&&x.unregister()))</script>
</head><body><main><div class="c"><h1>Демо-доступ закончился</h1><p>Ссылка на демо-версию справочника действовала до __UNTIL__ включительно.</p>
<p>Чтобы продолжить, попросите у автора действующую ссылку.</p></div></main></body></html>
'''
# service worker после срока: удалить кэш этой копии и снять регистрацию, открытые вкладки — перезагрузить
KILL_SW = '''const PFX = 'terapevt-' + new URL('./', self.location).pathname + '@';
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PFX)).map(k => caches.delete(k))))
  .then(() => self.registration.unregister()).then(() => self.clients.matchAll()).then(cs => cs.forEach(c => c.navigate(c.url)))));
'''
EXPIRE_YML = '''name: Срок демо-доступа
on:
  schedule:
    - cron: '7 20 * * *'   # 01:07 по Екатеринбургу
  workflow_dispatch:
permissions:
  contents: write
jobs:
  expire:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - name: Закрыть демо после срока
        run: |
          UNTIL=__UNTIL_ISO__
          TODAY=$(TZ=Asia/Yekaterinburg date +%F)
          echo "сегодня $TODAY, доступ до $UNTIL"
          if [ ! -f .github/expired/index.html ] || [ ! "$TODAY" \\> "$UNTIL" ] || [ -f expired.flag ]; then exit 0; fi
          find . -mindepth 1 -maxdepth 1 ! -name .git ! -name .github -exec rm -rf {} +
          cp .github/expired/index.html .github/expired/sw.js . && touch .nojekyll expired.flag
          git config user.name "github-actions[bot]"
          git config user.email "41898283+github-actions[bot]@users.noreply.github.com"
          git add -A && git commit -m "Демо-доступ закончился" && git push
'''


def build(repo, until):
    www = os.path.join(OUT, 'www')
    if not os.path.exists(os.path.join(www, 'ota_version.txt')):
        sys.exit('сначала: build_app.py www')
    url = f'https://{OWNER}.github.io/{repo}/'
    d = os.path.join(OUT, 'demo', repo)
    shutil.rmtree(d, ignore_errors=True)
    os.makedirs(os.path.join(d, '.github', 'workflows'))
    os.makedirs(os.path.join(d, '.github', 'expired'))
    files = []
    for f in sorted(os.listdir(www)):
        if f == 'ota_version.txt':
            continue
        p = os.path.join(d, f)
        shutil.copy(os.path.join(www, f), p)
        if f == 'data_meta.js':
            meta = json.loads(open(p, encoding='utf-8').read()[len('var META='):-2])
            meta['demo_until'] = until
            open(p, 'w', encoding='utf-8').write('var META=' + json.dumps(meta, ensure_ascii=False, separators=(',', ':')) + ';\n')
        if f == 'app.js':   # ссылки «поделиться» и т. п. — на демо, а не на основной сайт
            t = open(p, encoding='utf-8').read()
            assert MAIN in t
            open(p, 'w', encoding='utf-8').write(t.replace(MAIN, url))
        files.append([f, sha(p)])
    v = open(os.path.join(www, 'ota_version.txt')).read().strip()
    tag = sha(os.path.join(d, 'data_meta.js'))[:10]
    open(os.path.join(d, 'sw.js'), 'w', encoding='utf-8').write(
        SW_JS.replace('__VERSION__', f'{v}-{tag}').replace('__FILES__', json.dumps(['./'] + [f'{f[0]}?h={f[1][:10]}' for f in files])))
    ru = '.'.join(reversed(until.split('-')))
    open(os.path.join(d, '.github', 'expired', 'index.html'), 'w', encoding='utf-8').write(EXPIRED_HTML.replace('__UNTIL__', ru))
    open(os.path.join(d, '.github', 'expired', 'sw.js'), 'w', encoding='utf-8').write(KILL_SW)
    open(os.path.join(d, '.github', 'workflows', 'expire.yml'), 'w', encoding='utf-8').write(EXPIRE_YML.replace('__UNTIL_ISO__', until))
    open(os.path.join(d, '.nojekyll'), 'w').close()
    open(os.path.join(d, 'README.md'), 'w', encoding='utf-8').write(f'Демо-версия, доступ до {ru}.\n')
    print(d, url)


if __name__ == '__main__':
    if len(sys.argv) != 4 or sys.argv[1] != 'build':
        sys.exit(__doc__)
    build(sys.argv[2], sys.argv[3])
