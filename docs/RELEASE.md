# Выпуск приложения и фоновые обновления

## Как устроено

- **APK** (`android/`) — оболочка WebView на Java, без AndroidX, Android 8.0+ (minSdk 26). Пакет `ru.klinrek.terapevt`.
- **Интерфейс и данные** — `web/` + сгенерированные `data_*.js`. Они встроены в APK (`assets/www`) и обновляются отдельно от него.
- **Фоновое обновление (OTA)**:
  - раз в сутки при наличии сети `UpdateJob` (JobScheduler, переживает перезагрузку) читает `ota/manifest.json` и `ota/manifest.sig` с GitHub Pages;
  - манифест подписан ECDSA P-256, публичный ключ зашит в `Ota.java`, неподписанные данные не принимаются;
  - скачиваются только изменившиеся файлы (сверка sha256), во временную папку, затем переименование;
  - новая версия включается при следующем запуске или по кнопке «Применить» в баннере;
  - если новая версия дважды не стартовала, приложение возвращается к встроенной.
- **Новый APK**: приложение читает `android.json` и показывает баннер «Новая версия приложения — Скачать».

## Сайт (ветка `gh-pages`)

| Путь | Что |
|---|---|
| `index.html` | страница скачивания |
| `download/SpravochnikTerapevt.apk` | APK |
| `android.json` | versionCode, versionName, url, sha256 |
| `ota/manifest.json`, `ota/manifest.sig`, `ota/files/*` | данные для фонового обновления |

GitHub Pages: Settings → Pages → Deploy from a branch → `gh-pages` / root. Репозиторий должен быть публичным (на бесплатном тарифе), иначе телефоны не скачают ни APK, ни обновления.

## Обновить данные (без нового APK)

```
tools/fetch_kr.sh                    # свежая база КР из Spravochnik_nmp (ветка kr-data)
tools/build_all.sh                   # пересобрать краткие КР
OTA_KEY=/путь/ota_private.pem tools/release.sh data
```

## Новый APK

Поднять `versionCode` и `versionName` в `android/app/build.gradle`, положить `android/keystore.properties`, затем:

```
OTA_KEY=/путь/ota_private.pem tools/release.sh apk 2 "1.1 (КР от ДД.ММ.ГГГГ)" "что нового"
```

`minNative` в манифесте (по умолчанию 1) — минимальный versionCode, которому подходят данные. Поднимайте его, если новый интерфейс требует нового Java-кода.

## Ключи — не в репозитории

- `terapevt-release.jks` + `keystore.properties` — подпись APK. Без них обновить приложение поверх установленного нельзя: Android примет только ту же подпись.
- `ota_private.pem` — подпись данных. Без него телефоны не примут новые данные (публичный ключ зашит в APK).

Храните копии в двух надёжных местах (менеджер паролей, зашифрованный диск).
