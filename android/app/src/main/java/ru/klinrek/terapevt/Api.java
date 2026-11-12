package ru.klinrek.terapevt;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import org.json.JSONObject;

import java.net.URL;

/** Мост для страницы: версии и обновления, внешние ссылки, сетевые запросы к разрешённым адресам (PubMed, сайт приложения). */
final class Api {
    private final Activity act;
    private final WebView web;

    Api(Activity a, WebView w) { act = a; web = w; }

    private void js(String code) { act.runOnUiThread(() -> web.evaluateJavascript(code, null)); }

    @JavascriptInterface
    public String info() {
        try {
            JSONObject o = new JSONObject();
            o.put("versionName", act.getPackageManager().getPackageInfo(act.getPackageName(), 0).versionName);
            o.put("versionCode", Ota.nativeCode(act));
            o.put("running", Ota.running(act));
            o.put("bundled", Ota.bundledVersion(act));
            o.put("pending", Ota.pending(act));
            o.put("checked", Ota.lastCheck(act));
            o.put("site", Ota.SITE);
            return o.toString();
        } catch (Exception e) { return "{}"; }
    }

    @JavascriptInterface
    public void ok() { Ota.ok(act); }

    @JavascriptInterface
    public void reload() { act.runOnUiThread(() -> web.loadUrl(Ota.startUrl(act))); }

    @JavascriptInterface
    public void checkUpdates() {
        Ota.check(act, null, () -> js("window.App&&App.otaChecked&&App.otaChecked(" + Ota.pending(act) + ")"));
    }

    @JavascriptInterface
    public void openUrl(String url) {
        if (url == null || !(url.startsWith("https://") || url.startsWith("http://"))) return;
        act.runOnUiThread(() -> {
            try { act.startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url))); } catch (Exception ignored) {}
        });
    }

    /** GET к разрешённому адресу; ответ — App.native(id, ok, body). */
    @JavascriptInterface
    public void fetch(String id, String url) {
        new Thread(() -> {
            boolean ok = false; String body;
            try {
                String host = new URL(url).getHost();
                if (!url.startsWith("https://") || !(host.equals("eutils.ncbi.nlm.nih.gov") || host.equals("victorpolekslab.github.io")))
                    throw new SecurityException("адрес не разрешён");
                body = new String(Ota.get(url), "UTF-8");
                ok = true;
            } catch (Exception e) { body = String.valueOf(e.getMessage()); }
            js("window.App&&App.native(" + JSONObject.quote(id) + "," + ok + "," + JSONObject.quote(body) + ")");
        }).start();
    }
}
