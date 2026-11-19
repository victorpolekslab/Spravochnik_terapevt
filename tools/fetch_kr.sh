#!/bin/sh
# Fetch pinned clinical recommendations, reusing only a checksum-verified local archive.
set -eu
mkdir -p .cache
cd .cache
EXPECTED=ae62b884144dda073c96c8546b3a688728b2acb765851da491d6e06e63cadf22
B=https://raw.githubusercontent.com/victorpolekslab/Spravochnik_nmp/59fae5458f9feb293f7bb1e479e746cb4fdadeac
if [ -f kr_full.db.gz ] && printf '%s  %s\n' "$EXPECTED" kr_full.db.gz | sha256sum -c -; then
  echo "Using verified cached KR archive"
else
  rm -f kr_full.db.gz
  for name in kr_full.db.gz.part1 kr_full.db.gz.part2 SHA256SUMS VERSION; do
    curl --fail --location --retry 3 --silent --show-error "$B/$name" --output "$name"
  done
  if ! grep -Fqx "$EXPECTED  kr_full.db.gz" SHA256SUMS; then
    echo "ERROR: upstream KR checksum manifest differs from pinned digest" >&2
    exit 1
  fi
  cat kr_full.db.gz.part1 kr_full.db.gz.part2 > kr_full.db.gz
  printf '%s  %s\n' "$EXPECTED" kr_full.db.gz | sha256sum -c -
  rm -f kr_full.db.gz.part1 kr_full.db.gz.part2
fi
# Keep the compressed archive for the next CI run; never trust it without SHA-256.
gzip -dc kr_full.db.gz > kr_full.db.tmp
mv kr_full.db.tmp kr_full.db
echo "Verified pinned KR database ready"
