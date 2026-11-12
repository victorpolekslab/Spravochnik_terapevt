#!/bin/sh
# Скачивает свежую базу КР из ветки kr-data репозитория Spravochnik_nmp в .cache/
set -e
mkdir -p .cache && cd .cache
B=https://raw.githubusercontent.com/victorpolekslab/Spravochnik_nmp/kr-data
curl -sSLO $B/kr_full.db.gz.part1 -sSLO $B/kr_full.db.gz.part2 -sSLO $B/SHA256SUMS -sSLO $B/VERSION
cat kr_full.db.gz.part1 kr_full.db.gz.part2 > kr_full.db.gz
sha256sum -c --ignore-missing SHA256SUMS
gunzip -f kr_full.db.gz
echo "База КР от $(cat VERSION)"
