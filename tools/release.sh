#!/bin/bash
# Публикация обновления на GitHub Pages (ветка gh-pages).
#   tools/release.sh data                     — только данные и интерфейс: телефоны скачают их в фоне (OTA)
#   tools/release.sh apk <versionCode> <имя>  — новый APK + данные (после смены Java-кода или versionCode в app/build.gradle)
# Нужны: база КР (tools/fetch_kr.sh), $OTA_KEY — закрытый ключ OTA, для apk — android/keystore.properties.
set -euo pipefail
cd "$(dirname "$0")/.."
: "${OTA_KEY:?укажите OTA_KEY=путь/к/ota_private.pem}"
MODE=${1:-data}
python3 tools/build_app.py www
rm -rf build/pages && git worktree add -f build/pages gh-pages 2>/dev/null || { git fetch origin gh-pages && git worktree add -f build/pages gh-pages; }
if [ "$MODE" = apk ]; then
  (cd android && ANDROID_HOME=${ANDROID_HOME:-/opt/android-sdk} gradle assembleRelease -q)
  cp android/app/build/outputs/apk/release/app-release.apk build/app.apk
  python3 tools/build_app.py site --key "$OTA_KEY" --apk build/app.apk --version-code "$2" --version-name "$3" --notes "${4:-}"
else
  python3 tools/build_app.py site --key "$OTA_KEY" --keep build/pages
fi
find build/pages -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} + && cp -a build/site/. build/pages/
cd build/pages && git add -A && git commit -qm "Публикация $(date -u +%Y%m%d%H%M)" && git push -q origin gh-pages
cd ../.. && git worktree remove --force build/pages
echo "Готово: https://victorpolekslab.github.io/Spravochnik_terapevt/"
