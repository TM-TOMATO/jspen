"""
Desktop shell smoke test (PyQt6 + QtWebEngine, headless/offscreen).

Starts main.MainWindow with a project file, stubs the native file dialogs and
checks the QWebChannel bridge, template loading, project save, downloads and
window commands. Exits with status 1 on failure.

    python tests/desktop_smoke.py
"""

import json
import os
import shutil
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

# Native message boxes would block the headless run: record them instead.
from PyQt6.QtWidgets import QMessageBox  # noqa: E402
message_boxes = []
QMessageBox.critical = staticmethod(lambda *a, **k: message_boxes.append(("critical",) + tuple(str(x) for x in a[1:3])))
QMessageBox.question = staticmethod(lambda *a, **k: (message_boxes.append(("question",) + tuple(str(x) for x in a[1:3])), QMessageBox.StandardButton.No)[1])

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
               " layers: jspenApp.doc.layers.length, name: jspenApp.doc.name, dirty: jspenApp.isDirty()})"),
    ("templates", "jspenApp.templateModal.fetchTemplateList().then(l => { window.__n = l.length; }); 0"),
    ("templates_result", "String(window.__n)"),
    # edit, then Ctrl+S: saved in place (no dialog) because the file was opened from disk
    ("edit", "jspenApp.doc.layers[0].sprites[0].name = 'edited-in-smoke'; jspenApp.doc.saveState(); String(jspenApp.isDirty())"),
    ("save", "jspenApp.saveProject(); 'ok'"),
    ("after_save", "String(jspenApp.isDirty())"),
    # save as: always asks
    ("save_as", "jspenApp.saveProject(true); 'ok'"),
    # after "save as", Ctrl+S keeps writing to that new file without asking
    ("resave", "jspenApp.doc.layers[0].sprites[0].name = 'resaved'; jspenApp.doc.saveState(); jspenApp.saveProject(); 'ok'"),
    ("resave_file", "PY:current_file"),
    # a project opened without a path (browser picker / HTML5 drop) must not
    # be saved over the previous file: Ctrl+S asks again
    ("js_open", "jspenApp.openProjectText(JSON.stringify(jspenApp.doc.toJSON()), 'x.jspen', false).then(() => {}); 'ok'"),
    ("js_open_file", "PY:current_file"),
    ("window", "['winMax','winMax','winMin','winClose'].forEach(id => document.getElementById(id).click()); 'ok'"),
    ("download", "(() => { jspenApp.exportModal.show(); document.querySelector('#btnDl').click(); return 'ok'; })()"),
    ("web_gen", "String(jspenApp.generateWebsiteHTML(true).length)"),
    ("web_export", "jspenApp.exportWebsiteFiles(); 'ok'"),
    # unsaved change + opening another file asks first (modal shown, document kept)
    ("dirty_again", "jspenApp.doc.layers[0].sprites[0].name = 'unsaved'; jspenApp.doc.saveState(); 'ok'"),
    ("drop_open", "OPEN_DROPPED"),
    ("drop_check", "JSON.stringify({modal: !!document.querySelector('.studio-modal-overlay'), name: jspenApp.doc.layers[0].sprites[0].name})"),
    ("done", "'ok'"),
]


def contrast(a, b):
    """WCAG contrast ratio of two QColors."""
    def lum(c):
        ch = [v / 255 for v in (c.red(), c.green(), c.blue())]
        ch = [v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4 for v in ch]
        return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2]
    hi, lo = sorted((lum(a), lum(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def main():
    app = QApplication(["jspen-smoke"])
    # Native windows (colour picker, dialogs, tooltips) get readable text.
    shell.apply_dark_theme(app)
    from PyQt6.QtGui import QPalette
    R = QPalette.ColorRole
    pal = app.palette()
    weak_text = [(fg.name, bg.name) for fg, bg in [(R.WindowText, R.Window), (R.Text, R.Base), (R.ButtonText, R.Button),
                                                  (R.ToolTipText, R.ToolTipBase), (R.HighlightedText, R.Highlight)]
                 if contrast(pal.color(fg), pal.color(bg)) < 4.5]
    # Work on a copy: Ctrl+S now overwrites the opened file in place.
    initial = os.path.join(OUT, "opened.jspen")
    shutil.copy(os.path.join(ROOT, "templates", "navbar.jspen"), initial)
    other = os.path.join(OUT, "other.jspen")
    shutil.copy(os.path.join(ROOT, "templates", "hero.jspen"), other)
    win = shell.MainWindow(initial)
    win.show()
    results = {}
    state = {"i": 0, "busy": False, "loaded": False}
    started = time.time()

    def tick():
        if not state["loaded"] or state["busy"]:
            return
        if state["i"] >= len(STEPS):
            # The document is dirty on purpose: the real close asks first
            # (checked below); skip that dialog when the test quits.
            win._close_confirmed = True
            app.quit()
            return
        key, code = STEPS[state["i"]]
        state["busy"] = True
        if code.startswith("PY:"):
            results[key] = getattr(win, code[3:])
            state["i"] += 1
            state["busy"] = False
            return
        if code == "OPEN_DROPPED":
            win.open_project_file(other, confirm=True)  # same path as a drag & drop
            code = "'ok'"

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
    if weak_text:
        failures.append("hard to read text in native windows: %s" % weak_text)

    def check(cond, msg):
        if not cond:
            failures.append(msg)

    bridge = json.loads(results.get("bridge") or "{}")
    check(bridge.get("desktop") is True, f"desktop bridge not detected: {bridge}")
    check(bridge.get("host") == "function", f"JSPenHost.command missing: {bridge}")
    check(bridge.get("layers") == 1 and "네비게이션" in (bridge.get("name") or ""), f"initial project not loaded: {bridge}")
    check(results.get("templates_result") == "7", f"templates: {results.get('templates_result')}")
    check(bridge.get("dirty") is False, f"freshly opened document is dirty: {bridge}")
    check(results.get("edit") == "true", f"edit not marked dirty: {results.get('edit')}")
    in_place = json.load(open(initial, encoding="utf-8"))
    check(in_place["layers"][0]["sprites"][0]["name"] == "edited-in-smoke", "Ctrl+S did not save in place")
    check(results.get("after_save") == "false", f"still dirty after save: {results.get('after_save')}")
    saved_as = [p for p in dialog_calls if p.endswith(".jspen")]
    check(len(saved_as) == 1 and os.path.exists(saved_as[0]), f"save-as did not ask exactly once: {dialog_calls}")
    if saved_as:
        check(results.get("resave_file") == os.path.abspath(saved_as[0]), f"Ctrl+S after save-as: {results.get('resave_file')}")
        resaved = json.load(open(saved_as[0], encoding="utf-8"))
        check(resaved["layers"][0]["sprites"][0]["name"] == "resaved", "Ctrl+S after save-as did not write in place")
    check(results.get("js_open_file") is None, f"pathless open kept the old file: {results.get('js_open_file')}")
    exports = [p for p in dialog_calls if p.endswith(".html")]
    check(len(exports) == 2 and all(os.path.exists(p) and os.path.getsize(p) > 1000 for p in exports),
          f"exports not saved: {dialog_calls}")
    drop = json.loads(results.get("drop_check") or "{}")
    check(drop.get("modal") is True and drop.get("name") == "unsaved", f"drop without confirmation: {drop}")
    # The stubs do not change the window state, so both max clicks maximize.
    check(window_calls == ["showMaximized", "showMaximized", "showMinimized", "close"],
          f"window commands: {window_calls}")

    check(not message_boxes, f"unexpected message boxes: {message_boxes}")
    print(json.dumps({"results": results, "dialogs": dialog_calls, "window": window_calls,
                      "seconds": round(time.time() - started, 1)}, ensure_ascii=False, indent=2))
    if failures:
        print("FAILED:\n  " + "\n  ".join(failures))
        sys.exit(1)
    print("desktop smoke test passed")


if __name__ == "__main__":
    main()
