"""
Desktop shell smoke test (PyQt6 + QtWebEngine, headless/offscreen).

Starts main.MainWindow with a project file, stubs the native file dialogs and
checks the QWebChannel bridge, template loading, project save, downloads and
window commands. Exits with status 1 on failure.

    python tests/desktop_smoke.py
"""

import json
import os
import sys
import tempfile
import time

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS", "--no-sandbox --disable-gpu")
os.environ.setdefault("QTWEBENGINE_DISABLE_SANDBOX", "1")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from PyQt6.QtCore import QTimer  # noqa: E402
from PyQt6.QtWidgets import QApplication, QFileDialog  # noqa: E402

import main as shell  # noqa: E402

OUT = tempfile.mkdtemp(prefix="jspen-desktop-")
dialog_calls = []


def fake_save(*args, **kwargs):
    name = os.path.basename(args[2]) if len(args) > 2 and args[2] else "file"
    path = os.path.join(OUT, f"{len(dialog_calls)}_{name}")
    dialog_calls.append(path)
    return path, ""


QFileDialog.getSaveFileName = staticmethod(fake_save)

window_calls = []
for _name in ("showMinimized", "showMaximized", "showNormal", "close"):
    def _make(name):
        def _stub(self, *a):
            window_calls.append(name)
            return True
        return _stub
    setattr(shell.MainWindow, _name, _make(_name))

STEPS = [
    ("bridge", "JSON.stringify({desktop: JSPenNative.isDesktop, host: typeof (window.JSPenHost || {}).command,"
               " layers: jspenApp.doc.layers.length, name: jspenApp.doc.name})"),
    ("templates", "jspenApp.templateModal.fetchTemplateList().then(l => { window.__n = l.length; }); 0"),
    ("templates_result", "String(window.__n)"),
    ("save", "jspenApp.saveProject(); 'ok'"),
    ("window", "['winMax','winMax','winMin','winClose'].forEach(id => document.getElementById(id).click()); 'ok'"),
    ("download", "(() => { jspenApp.exportModal.show(); document.querySelector('#btnDl').click(); return 'ok'; })()"),
    ("done", "'ok'"),
]


def main():
    app = QApplication(["jspen-smoke"])
    initial = os.path.join(ROOT, "templates", "navbar.jspen")
    win = shell.MainWindow(initial)
    win.show()
    results = {}
    state = {"i": 0, "busy": False, "loaded": False}
    started = time.time()

    def tick():
        if not state["loaded"] or state["busy"]:
            return
        if state["i"] >= len(STEPS):
            app.quit()
            return
        key, code = STEPS[state["i"]]
        state["busy"] = True

        def done(result, key=key):
            results[key] = result
            state["i"] += 1
            state["busy"] = False

        win.browser.page().runJavaScript(code, done)

    def loaded(ok):
        # give the template/initial-file load and the web channel a moment
        QTimer.singleShot(1500, lambda: state.update(loaded=ok))

    win.browser.loadFinished.connect(loaded)
    timer = QTimer()
    timer.timeout.connect(tick)
    timer.start(400)
    QTimer.singleShot(60000, app.quit)
    app.exec()

    failures = []

    def check(cond, msg):
        if not cond:
            failures.append(msg)

    bridge = json.loads(results.get("bridge") or "{}")
    check(bridge.get("desktop") is True, f"desktop bridge not detected: {bridge}")
    check(bridge.get("host") == "function", f"JSPenHost.command missing: {bridge}")
    check(bridge.get("layers") == 1 and "네비게이션" in (bridge.get("name") or ""), f"initial project not loaded: {bridge}")
    check(results.get("templates_result") == "7", f"templates: {results.get('templates_result')}")
    saved = [p for p in dialog_calls if p.endswith(".jspen")]
    check(saved and os.path.exists(saved[0]) and json.load(open(saved[0], encoding="utf-8")).get("layers"),
          f"project not saved: {dialog_calls}")
    downloads = [p for p in dialog_calls if p.endswith(".html")]
    time.sleep(0.5)
    check(downloads and os.path.exists(downloads[0]), f"download not saved: {dialog_calls}")
    # The stubs do not change the window state, so both max clicks maximize.
    check(window_calls == ["showMaximized", "showMaximized", "showMinimized", "close"],
          f"window commands: {window_calls}")

    print(json.dumps({"results": results, "dialogs": dialog_calls, "window": window_calls,
                      "seconds": round(time.time() - started, 1)}, ensure_ascii=False, indent=2))
    if failures:
        print("FAILED:\n  " + "\n  ".join(failures))
        sys.exit(1)
    print("desktop smoke test passed")


if __name__ == "__main__":
    main()
