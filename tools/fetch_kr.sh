#!/bin/sh
# Скачивает свежую базу КР из ветки kr-data репозитория Spravochnik_nmp в .cache/
set -e
mkdir -p .cache && cd .cache
# Immutable source revision: prevents an unreviewed upstream update from changing builds.
B=https://raw.githubusercontent.com/victorpolekslab/Spravochnik_nmp/59fae5458f9feb293f7bb1e479e746cb4fdadeac
curl -sSLO $B/kr_full.db.gz.part1 -sSLO $B/kr_full.db.gz.part2 -sSLO $B/SHA256SUMS -sSLO $B/VERSION
# Verify the checksum manifest itself; otherwise an upstream change could replace both data and hash.
printf '%s  %s\\n' 'ae62b884144dda073c96c8546b3a688728b2acb765851da491d6e06e63cadf22' 'kr_full.db.gz' > PINNED_SHA256SUMS
grep -Fxf PINNED_SHA256SUMS SHA256SUMS >/dev/null
cat kr_full.db.gz.part1 kr_full.db.gz.part2 > kr_full.db.gz
sha256sum -c --ignore-missing SHA256SUMS
gunzip -f kr_full.db.gz
echo "База КР от $(cat VERSION)"
