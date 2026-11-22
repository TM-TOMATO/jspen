"""
Desktop shell security test: code running inside the studio or a preview is
treated as hostile. Uses only decoy files and a loopback listener.

    python tests/desktop_security.py
"""

import http.server
import json
import os
import pathlib
import sys
import tempfile
import threading

os.environ.setdefault("QT_QPA_PLATFORM", "offscreen")
os.environ.setdefault("QTWEBENGINE_CHROMIUM_FLAGS", "--no-sandbox --disable-gpu")
os.environ.setdefault("QTWEBENGINE_DISABLE_SANDBOX", "1")

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
sys.path.insert(0, ROOT)

from PyQt6.QtCore import QEventLoop, QTimer  # noqa: E402
from PyQt6.QtWidgets import QApplication, QFileDialog, QMessageBox  # noqa: E402

import main as shell  # noqa: E402

WORK = pathlib.Path(tempfile.mkdtemp(prefix="jspen-security-"))
save_dialogs, boxes, browser_opened, link_prompts, hits, failures = [], [], [], [], [], []

QFileDialog.getSaveFileName = staticmethod(lambda *a, **k: (save_dialogs.append(a[2] if len(a) > 2 else ""), ("", ""))[1])
QMessageBox.critical = staticmethod(lambda *a, **k: boxes.append(a[1:3]))
QMessageBox.question = staticmethod(lambda *a, **k: QMessageBox.StandardButton.No)
# Never open a real browser from the test.
shell.QDesktopServices = type("NoBrowser", (), {"openUrl": staticmethod(lambda url: browser_opened.append(url.toString()))})
shell.MainWindow.confirm_external_link = lambda self, url: (link_prompts.append(url.toString()), False)[1]


class Listener(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        hits.append(self.path)
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()

    do_POST = do_GET

    def log_message(self, *args):
        pass


def wait(ms):
    loop = QEventLoop()
    QTimer.singleShot(ms, loop.quit)
    loop.exec()


def js(page, code):
    box = []
    page.runJavaScript(code, box.append)
    for _ in range(100):
        if box:
            return box[0]
        wait(50)
    return None


def wait_for(condition, seconds=15):
    for _ in range(seconds * 10):
        if condition():
            return True
        wait(100)
    return False


def check(ok, message):
    print(("ok    " if ok else "FAIL  ") + message, flush=True)
    if not ok:
        failures.append(message)


def main():
    server = http.server.HTTPServer(("127.0.0.1", 0), Listener)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    remote = f"http://127.0.0.1:{server.server_port}"

    victim = WORK / "victim.json"
    victim.write_text("ORIGINAL", encoding="utf-8")
    secret = WORK / "secret.txt"
    secret.write_text("CANARY", encoding="utf-8")
    project = WORK / "project.jspen"
    script = "document.documentElement.dataset.ran = '1';"
    project.write_text(json.dumps({"name": "decoy", "width": 400, "height": 300, "layers": [{"name": "L", "sprites": [
        {"id": "s", "name": "S", "type": "rect", "x": 100, "y": 100, "width": 50, "height": 50,
         "modules": [{"id": "m", "type": "custom_script", "name": "S", "enabled": True,
                      "params": {"code": script, "runOn": "start"}}]}]}]}), encoding="utf-8")

    app = QApplication(["jspen-security"])
    win = shell.MainWindow(str(project))
    win.show()
    page = win.browser.page()
    check(wait_for(lambda: win.current_file), "the project chosen by the user becomes the save target")
    check(os.path.normcase(str(win.current_file)) == os.path.normcase(str(project)), "save target is that project")

    # 1. The page cannot choose the file Ctrl+S writes to.
    js(page, f"JSPenHost.projectOpened({json.dumps(str(victim))});"
             "JSPenHost.saveProjectTo('OVERWRITTEN', '', false); 0")
    wait(1000)
    check(victim.read_text(encoding="utf-8") == "ORIGINAL", "a page-supplied path is never written")
    check(len(save_dialogs) == 1, "an unknown save target asks with a dialog")

    # 2. A suggested export name cannot carry a path or an executable extension.
    save_dialogs.clear()
    js(page, "JSPenHost.saveFile('../../startup.bat', 'echo'); 0")
    wait(700)
    check(len(save_dialogs) == 1 and not save_dialogs[0].lower().endswith(".bat") and ".." not in save_dialogs[0],
          f"export name is sanitised: {save_dialogs}")

    # 3. The page reads only the app's own resources.
    outside = [secret.as_uri(), "jspen://app/main.py", "jspen://app/css/..%5Cmain.py",
               "jspen://app/templates/..%2F..%2Fmain.py", "jspen://app/C:/Windows/win.ini",
               "jspen://app/js/%5C%5C127.0.0.1%5Cshare%5Cx.js"]
    check(js(page, "getComputedStyle(document.body).margin === '0px' && !!window.jspenApp") is True, "app resources load")
    for url in outside:
        js(page, "window.__read = ''; try { const x = new XMLHttpRequest();"
                 f"x.open('GET', {json.dumps(url)}); x.onload = () => {{ __read = x.responseText; }}; x.send(); }}"
                 " catch (e) {} 0")
        wait(700)
        check(not js(page, "window.__read"), f"unreadable: {url}")

    # 4. The page cannot send data out by itself.
    js(page, f"(new Image).src = '{remote}/image'; fetch('{remote}/fetch', {{method: 'POST', body: 'x'}}).catch(() => {{}});"
             f"try {{ new WebSocket('{remote.replace('http', 'ws')}/socket'); }} catch (e) {{}} 0")
    wait(1500)
    check(not hits, f"no network requests from the studio: {hits}")

    # 5. Links reach the system browser only after confirmation.
    js(page, f"location.href = '{remote}/navigate'; 0")
    wait(1200)
    check(not browser_opened and len(link_prompts) == 1, f"navigation asks first: {link_prompts} {browser_opened}")
    link_prompts.clear()
    js(page, f"window.open('{remote}/popup'); 0")
    wait(1200)
    check(not browser_opened and len(link_prompts) == 1, f"window.open asks first: {link_prompts} {browser_opened}")
    before = len(win.preview_windows)
    js(page, f"window.open({json.dumps(secret.as_uri())}); window.open('../x.html'); 0")
    wait(1000)
    check(len(win.preview_windows) == before, "window.open never shows local files")

    # 6. Previews: refused scripts do not run; there is no route to the bridge or files.
    js(page, "void jspenApp.openWebPreviewWindow(); 0")
    check(wait_for(lambda: js(page, "!!document.querySelector('#btnStudioModalCancel')"), 5), "preview asks about scripts")
    js(page, "document.querySelector('#btnStudioModalCancel')?.click(); 0")
    if wait_for(lambda: win.preview_windows, 8):
        preview = win.preview_windows[-1].view.page()
        check(wait_for(lambda: js(preview, "!!document.getElementById('webArtboard')"), 8), "preview renders")
        check(js(preview, "document.documentElement.dataset.ran === '1'") is False, "refused script did not run")
        check(js(preview, "!window.opener && !window.JSPenHost && !(window.qt && qt.webChannelTransport)") is True,
              "preview has no opener and no bridge")
        for url in (secret.as_uri(), "jspen://app/index.html"):
            js(preview, "window.__read = ''; try { const x = new XMLHttpRequest();"
                        f"x.open('GET', {json.dumps(url)}); x.onload = () => {{ __read = x.responseText; }}; x.send(); }}"
                        " catch (e) {} 0")
            wait(700)
            check(not js(preview, "window.__read"), f"unreadable from preview: {url}")
        js(preview, f"(new Image).src = '{remote}/preview-image';"
                    f"try {{ new WebSocket('{remote.replace('http', 'ws')}/preview-socket'); }} catch (e) {{}} 0")
        wait(800)
        check(not hits, f"no network requests from the preview: {hits}")
    else:
        check(False, "preview window opened")

    check(not boxes, f"unexpected error boxes: {boxes}")
    print("FAILED: %d" % len(failures) if failures else "desktop security test passed", flush=True)
    sys.stdout.flush()
    # Skip Qt teardown: the windows are intentionally left mid-state.
    os._exit(1 if failures else 0)


if __name__ == "__main__":
    main()
