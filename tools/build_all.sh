#!/bin/sh
# Полная пересборка: свежая база КР → 40 документов → оглавление → страница проверки
set -e
cd "$(dirname "$0")/.."
[ -f .cache/kr_full.db ] || sh tools/fetch_kr.sh
IDS=$(python3 -I -c "import json;print(' '.join(i['id'] for i in json.load(open('data/brief/index.json'))['items']))")
python3 -I tools/build.py .cache/kr_full.db tools/r168.json data/brief/kr $IDS
python3 -I tools/pack.py data/brief
python3 -I tools/page.py data/brief/kr review/index.html "Краткие КР терапевта"
