package ru.klinrek.terapevt;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Base64;

import org.json.JSONArray;
import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.KeyFactory;
import java.security.MessageDigest;
import java.security.PublicKey;
import java.security.Signature;
import java.security.spec.X509EncodedKeySpec;

/**
 * Фоновое обновление интерфейса и данных справочника (index.html, app.js, app.css, data_*.js) без переустановки APK.
 * Схема — как в «Справочнике НМП»: на сайте ota/manifest.json {v, minNative, files:[[имя, sha256, размер]]}
 * и ota/manifest.sig — подпись ECDSA P-256 над байтами манифеста; публичный ключ зашит ниже.
 * Файлы скачиваются в files/ota/<v>.tmp, сверяются по sha256 и переименовываются в files/ota/<v>.
 * Новая версия включается при следующем открытии (или по кнопке «Применить»). Если она дважды не сообщила
 * об успешном старте (Native.ok), приложение помечает её плохой и возвращается к встроенной.
 */
final class Ota {
    static final String SITE = "https://victorpolekslab.github.io/Spravochnik_terapevt/";
    static final String BASE = SITE + "ota/";
    static final String BUNDLED_URL = "file:///android_asset/www/index.html";
    private static final String PUBKEY = "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAE0GSKuXrCy/9dQ9gScOTDL82gjEMiBf8Jt39OTdIOC4jTqdhw62pS3i1FZFW8i7IvgNlP7qEBTJ7OzSNJ5IyX1Q==";
    private static volatile boolean busy = false;

    private Ota() {}

    static SharedPreferences sp(Context c) { return c.getSharedPreferences("ota", Context.MODE_PRIVATE); }

    static long bundledVersion(Context c) {
        try (InputStream in = c.getAssets().open("www/ota_version.txt")) {
            return Long.parseLong(new String(readAll(in), "UTF-8").trim());
        } catch (Exception e) { return 0; }
    }

    static long nativeCode(Context c) {
        try { return c.getPackageManager().getPackageInfo(c.getPackageName(), 0).getLongVersionCode(); } catch (Exception e) { return 0; }
    }

    private static File root(Context c) { return new File(c.getFilesDir(), "ota"); }

    static long usableVersion(Context c) {
        SharedPreferences p = sp(c);
        long v = p.getLong("ver", 0);
        if (v <= bundledVersion(c) || v == p.getLong("bad", -1) || p.getLong("min", 0) > nativeCode(c)) return 0;
        if (!new File(new File(root(c), String.valueOf(v)), "index.html").exists()) return 0;
        return v;
    }

    static String startUrl(Context c) {
        SharedPreferences p = sp(c);
        long v = usableVersion(c);
        if (v == 0) { p.edit().putLong("running", bundledVersion(c)).apply(); return BUNDLED_URL; }
        int tries = p.getInt("tries", 0);
        if (tries >= 2) { p.edit().putLong("bad", v).putInt("tries", 0).putLong("running", bundledVersion(c)).apply(); return BUNDLED_URL; }
        p.edit().putInt("tries", tries + 1).putLong("running", v).apply();
        return "file://" + new File(new File(root(c), String.valueOf(v)), "index.html").getAbsolutePath();
    }

    static void ok(Context c) { sp(c).edit().putInt("tries", 0).apply(); }

    static long running(Context c) { return sp(c).getLong("running", bundledVersion(c)); }

    static boolean pending(Context c) { long v = usableVersion(c); return v != 0 && v != running(c); }

    static long lastCheck(Context c) { return sp(c).getLong("checked", 0); }

    /** Проверить сайт и скачать новую версию в фоне. onReady — если загружено новое, onDone — в любом случае. */
    static void check(Context ctx, Runnable onReady, Runnable onDone) {
        if (busy) { if (onDone != null) onDone.run(); return; }
        busy = true;
        final Context c = ctx.getApplicationContext();
        new Thread(() -> {
            boolean got = false;
            try {
                byte[] man = get(BASE + "manifest.json?t=" + System.currentTimeMillis());
                byte[] sig = Base64.decode(new String(get(BASE + "manifest.sig?t=" + System.currentTimeMillis()), "UTF-8").trim(), Base64.DEFAULT);
                PublicKey key = KeyFactory.getInstance("EC").generatePublic(new X509EncodedKeySpec(Base64.decode(PUBKEY, Base64.DEFAULT)));
                Signature s = Signature.getInstance("SHA256withECDSA");
                s.initVerify(key); s.update(man);
                if (!s.verify(sig)) throw new SecurityException("bad signature");
                SharedPreferences p = sp(c);
                p.edit().putLong("checked", System.currentTimeMillis()).apply();
                JSONObject m = new JSONObject(new String(man, "UTF-8"));
                long v = m.getLong("v");
                if (v <= Math.max(bundledVersion(c), p.getLong("ver", 0)) || v == p.getLong("bad", -1)) return;
                if (m.optLong("minNative", 0) > nativeCode(c)) return;
                File dir = new File(root(c), String.valueOf(v)), tmp = new File(root(c), v + ".tmp");
                deleteTree(tmp); tmp.mkdirs();
                File cur = new File(root(c), String.valueOf(p.getLong("ver", 0)));
                JSONArray files = m.getJSONArray("files");
                for (int i = 0; i < files.length(); i++) {
                    JSONArray f = files.getJSONArray(i);
                    String name = f.getString(0), hash = f.getString(1);
                    if (!name.matches("[A-Za-z0-9_.-]{1,80}") || name.startsWith(".")) throw new SecurityException("bad name " + name);
                    byte[] data = null;
                    File old = new File(cur, name);
                    if (old.exists() && hash.equals(sha256(readFile(old)))) data = readFile(old);
                    if (data == null) { try (InputStream in = c.getAssets().open("www/" + name)) { byte[] b = readAll(in); if (hash.equals(sha256(b))) data = b; } catch (Exception ignored) {} }
                    if (data == null) { data = get(BASE + "files/" + name + "?h=" + hash.substring(0, 12)); if (!hash.equals(sha256(data))) throw new SecurityException("hash " + name); }
                    try (OutputStream o = new FileOutputStream(new File(tmp, name))) { o.write(data); }
                }
                deleteTree(dir);
                if (!tmp.renameTo(dir)) throw new Exception("rename");
                p.edit().putLong("ver", v).putLong("min", m.optLong("minNative", 0)).putInt("tries", 0).apply();
                File[] all = root(c).listFiles();
                if (all != null) for (File d : all) {
                    String n = d.getName();
                    if (!n.equals(String.valueOf(v)) && !n.equals(String.valueOf(running(c)))) deleteTree(d);
                }
                got = true;
            } catch (Exception ignored) {
            } finally {
                busy = false;
                if (got && onReady != null) onReady.run();
                if (onDone != null) onDone.run();
            }
        }).start();
    }

    // ------------------------------------------------------------ helpers
    static byte[] get(String url) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(url).openConnection();
        c.setConnectTimeout(15000); c.setReadTimeout(30000); c.setUseCaches(false);
        c.setRequestProperty("Cache-Control", "no-cache");
        c.setRequestProperty("User-Agent", "SpravochnikTerapevt/Android");
        try {
            if (c.getResponseCode() != 200) throw new Exception("HTTP " + c.getResponseCode());
            try (InputStream in = c.getInputStream()) { return readAll(in); }
        } finally { c.disconnect(); }
    }

    static byte[] readAll(InputStream in) throws Exception {
        ByteArrayOutputStream o = new ByteArrayOutputStream();
        byte[] b = new byte[16384]; int n;
        while ((n = in.read(b)) > 0) o.write(b, 0, n);
        return o.toByteArray();
    }

    private static byte[] readFile(File f) throws Exception { try (InputStream in = new FileInputStream(f)) { return readAll(in); } }

    private static String sha256(byte[] b) throws Exception {
        byte[] d = MessageDigest.getInstance("SHA-256").digest(b);
        StringBuilder s = new StringBuilder();
        for (byte x : d) s.append(String.format("%02x", x));
        return s.toString();
    }

    private static void deleteTree(File f) {
        if (f == null || !f.exists()) return;
        File[] k = f.listFiles();
        if (k != null) for (File x : k) deleteTree(x);
        //noinspection ResultOfMethodCallIgnored
        f.delete();
    }
}
