"""
JSPen Studio - Native Desktop Shell (Python + PyQt6 QtWebEngine)

Hosts the HTML5 Canvas studio (index.html + js/bundle.js) in a frameless Qt
window and provides native services the web page cannot do on its own:
file dialogs for project save/open, file downloads, window controls and
.jspen file association on Windows.

JS -> Python commands are sent by setting document.title to
"cmd:<name>:<seq>" (see NativeBridge in js/bundle.js).
"""

import json
import os
import sys

from PyQt6.QtCore import Qt, QUrl
from PyQt6.QtGui import QColor, QDesktopServices
from PyQt6.QtWidgets import QApplication, QFileDialog, QMainWindow, QMessageBox
from PyQt6.QtWebEngineCore import (
    QWebEngineDownloadRequest,
    QWebEnginePage,
    QWebEngineProfile,
    QWebEngineSettings,
)
from PyQt6.QtWebEngineWidgets import QWebEngineView

PROJECT_EXTENSIONS = (".jspen", ".json")
APP_TITLE = "JSPen Studio"


def resource_dir():
    """Directory holding index.html, css/, js/ and templates/ (PyInstaller aware)."""
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def is_project_file(path):
    return bool(path) and os.path.isfile(path) and path.lower().endswith(PROJECT_EXTENSIONS)


def configure_web_settings(settings):
    """Common QtWebEngine settings for the studio and preview windows."""
    attr = QWebEngineSettings.WebAttribute
    # Needed so the studio (loaded from file://) can read templates/*.jspen via XHR.
    settings.setAttribute(attr.LocalContentCanAccessFileUrls, True)
    # Local pages must not be able to read arbitrary remote URLs (data exfiltration).
    settings.setAttribute(attr.LocalContentCanAccessRemoteUrls, False)
    settings.setAttribute(attr.JavascriptEnabled, True)
    settings.setAttribute(attr.Accelerated2dCanvasEnabled, True)
    settings.setAttribute(attr.WebGLEnabled, True)
    settings.setAttribute(attr.ScrollAnimatorEnabled, False)


class PreviewWindow(QMainWindow):
    """Separate window used for window.open() (web preview, "run in new window")."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose, True)
        self.setWindowTitle("JSPen Web Preview - 인터랙티브 웹사이트 라이브 미리보기")
        self.resize(1440, 900)
        self.setStyleSheet("QMainWindow { background-color: #18181b; }")
        self.view = QWebEngineView(self)
        self.view.setPage(PreviewPage(self.view, parent))
        self.view.page().setBackgroundColor(QColor("#18181b"))
        self.view.setStyleSheet("background-color: #18181b;")
        self.setCentralWidget(self.view)
        configure_web_settings(self.view.settings())


class PreviewPage(QWebEnginePage):
    """Page for preview windows; nested window.open() calls open more previews."""

    def __init__(self, parent_view=None, owner=None):
        super().__init__(parent_view)
        self.owner = owner

    def createWindow(self, _type):
        if self.owner is not None and hasattr(self.owner, "open_preview_window"):
            return self.owner.open_preview_window()
        return None


class DesktopCanvasPage(QWebEnginePage):
    """Studio page: routes window.open to preview windows and keeps the studio
    itself from navigating away from the local app."""

    def __init__(self, parent_view=None, parent_window=None):
        super().__init__(parent_view)
        self.parent_window = parent_window

    def createWindow(self, _type):
        if self.parent_window is not None:
            return self.parent_window.open_preview_window()
        return None

    def acceptNavigationRequest(self, url, nav_type, is_main_frame):
        if is_main_frame and url.scheme() not in ("file", "qrc", "about"):
            # External links clicked inside the studio go to the system browser.
            if url.scheme() in ("http", "https", "mailto"):
                QDesktopServices.openUrl(url)
            return False
        return super().acceptNavigationRequest(url, nav_type, is_main_frame)

    def javaScriptConsoleMessage(self, level, message, line_number, source_id):
        print(f"[Console {level.name}] {source_id}:{line_number} -> {message}", flush=True)


class MainWindow(QMainWindow):
    def __init__(self, initial_file=None):
        super().__init__()
        self.setWindowTitle(APP_TITLE)
        self.resize(1360, 860)
        self.setMinimumSize(1024, 680)
        self.setStyleSheet("QMainWindow { background-color: #121214; }")

        self.preview_windows = []
        self.current_file = None
        self.initial_file = initial_file if is_project_file(initial_file) else None

        # Embedded studio view
        self.browser = QWebEngineView(self)
        self.custom_page = DesktopCanvasPage(self.browser, self)
        self.custom_page.setBackgroundColor(QColor("#0f0f11"))
        self.browser.setPage(self.custom_page)
        self.browser.setStyleSheet("background-color: #0f0f11;")
        self.setCentralWidget(self.browser)
        configure_web_settings(self.browser.settings())

        # Downloads triggered by <a download> (export modal, website export, ...)
        QWebEngineProfile.defaultProfile().downloadRequested.connect(self.on_download_requested)

        # Drag & drop of .jspen files onto the window
        self.setAcceptDrops(True)
        self.browser.installEventFilter(self)

        html_path = os.path.join(resource_dir(), "index.html")
        self.browser.load(QUrl.fromLocalFile(html_path))
        self.browser.loadFinished.connect(self.on_load_finished)
        self.browser.titleChanged.connect(self.handle_js_command)

        # Frameless window: the in-app menu bar acts as the title bar
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)

    # ------------------------------------------------------------------
    # JS bridge
    # ------------------------------------------------------------------
    def handle_js_command(self, title):
        if not title.startswith("cmd:"):
            return
        parts = title.split(":")
        cmd = parts[1] if len(parts) > 1 else ""
        if cmd == "save":
            self.native_save_project()
        elif cmd == "open":
            self.native_open_project()
        elif cmd == "window_min":
            self.showMinimized()
        elif cmd == "window_max":
            self.showNormal() if self.isMaximized() else self.showMaximized()
        elif cmd == "window_close":
            self.close()
        elif cmd == "window_drag_start":
            if self.windowHandle():
                self.windowHandle().startSystemMove()
        self.run_js(f"document.title = {json.dumps(APP_TITLE)};")

    def run_js(self, script, callback=None):
        if callback:
            self.browser.page().runJavaScript(script, callback)
        else:
            self.browser.page().runJavaScript(script)

    def notify(self, message):
        """Show a toast inside the studio (the Qt status bar is hidden)."""
        self.run_js(f"window.StudioToast && StudioToast.show({json.dumps(message)}, 3000);")

    # ------------------------------------------------------------------
    # Project files
    # ------------------------------------------------------------------
    def on_load_finished(self, ok):
        if ok and self.initial_file:
            self.open_project_file(self.initial_file)
            self.initial_file = None

    def native_save_project(self):
        def on_json_ready(result):
            if not result:
                QMessageBox.critical(self, "저장 오류", "프로젝트 데이터를 가져오지 못했습니다.")
                return
            data = json.loads(result)
            default_path = self.current_file or (data.get("fileName") or "project.jspen")
            file_path, _ = QFileDialog.getSaveFileName(
                self, "JSPen 프로젝트 저장", default_path,
                "JSPen Project (*.jspen);;JSON Files (*.json)"
            )
            if not file_path:
                return
            if not file_path.lower().endswith(PROJECT_EXTENSIONS):
                file_path += ".jspen"
            try:
                with open(file_path, "w", encoding="utf-8") as f:
                    f.write(data["json"])
                self.current_file = file_path
                self.notify(f"프로젝트가 저장되었습니다: {os.path.basename(file_path)}")
            except OSError as e:
                QMessageBox.critical(self, "저장 오류", f"파일을 저장할 수 없습니다:\n{e}")

        self.run_js(
            "JSON.stringify({"
            " json: JSON.stringify(window.jspenApp.doc.toJSON(), null, 2),"
            " fileName: window.jspenApp.getProjectFileName() })",
            on_json_ready,
        )

    def native_open_project(self):
        start_dir = os.path.dirname(self.current_file) if self.current_file else ""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "JSPen 프로젝트 열기", start_dir,
            "JSPen Project (*.jspen *.json);;All Files (*.*)"
        )
        if file_path:
            self.open_project_file(file_path)

    def open_project_file(self, file_path):
        """Load a .jspen/.json file into the studio."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except (OSError, UnicodeDecodeError) as e:
            QMessageBox.critical(self, "불러오기 오류", f"파일을 열 수 없습니다:\n{e}")
            return

        def on_loaded(ok):
            if ok:
                self.current_file = file_path
                self.notify(f"프로젝트를 불러왔습니다: {os.path.basename(file_path)}")
            # On failure the studio already shows an error toast.

        self.run_js(
            f"!!(window.jspenApp && window.jspenApp.loadProjectFromJSON({json.dumps(content)}))",
            on_loaded,
        )

    # ------------------------------------------------------------------
    # Downloads (<a download>, blob URLs)
    # ------------------------------------------------------------------
    def on_download_requested(self, download: QWebEngineDownloadRequest):
        suggested = os.path.join(download.downloadDirectory(), download.downloadFileName())
        file_path, _ = QFileDialog.getSaveFileName(self, "파일 저장", suggested)
        if not file_path:
            download.cancel()
            return
        download.setDownloadDirectory(os.path.dirname(file_path))
        download.setDownloadFileName(os.path.basename(file_path))

        def on_state_changed(state):
            if state == QWebEngineDownloadRequest.DownloadState.DownloadCompleted:
                self.notify(f"저장되었습니다: {os.path.basename(file_path)}")
            elif state == QWebEngineDownloadRequest.DownloadState.DownloadInterrupted:
                QMessageBox.critical(self, "저장 오류", download.interruptReasonString())

        download.stateChanged.connect(on_state_changed)
        download.accept()

    # ------------------------------------------------------------------
    # Preview windows
    # ------------------------------------------------------------------
    def open_preview_window(self):
        win = PreviewWindow(self)
        self.preview_windows.append(win)
        win.destroyed.connect(lambda *_: self.preview_windows.remove(win) if win in self.preview_windows else None)
        win.show()
        return win.view.page()

    # ------------------------------------------------------------------
    # Drag & drop
    # ------------------------------------------------------------------
    @staticmethod
    def _dropped_project(mime):
        if mime.hasUrls():
            for url in mime.urls():
                path = url.toLocalFile()
                if path.lower().endswith(PROJECT_EXTENSIONS):
                    return path
        return None

    def dragEnterEvent(self, event):
        if self._dropped_project(event.mimeData()):
            event.acceptProposedAction()
        else:
            event.ignore()

    def dropEvent(self, event):
        path = self._dropped_project(event.mimeData())
        if path:
            self.open_project_file(path)
            event.acceptProposedAction()

    def eventFilter(self, watched, event):
        if watched == self.browser:
            if event.type() == event.Type.DragEnter and self._dropped_project(event.mimeData()):
                event.acceptProposedAction()
                return True
            if event.type() == event.Type.Drop:
                path = self._dropped_project(event.mimeData())
                if path:
                    self.open_project_file(path)
                    event.acceptProposedAction()
                    return True
        return super().eventFilter(watched, event)


def register_windows_file_association():
    """Register the .jspen extension under HKCU (no admin rights needed)."""
    if sys.platform != "win32":
        return
    try:
        import ctypes
        import winreg

        if getattr(sys, "frozen", False):
            app_cmd = f'"{sys.executable}" "%1"'
            icon_path = f'"{sys.executable}",0'
        else:
            main_py = os.path.abspath(__file__)
            pyw = os.path.join(os.path.dirname(sys.executable), "pythonw.exe")
            exec_bin = pyw if os.path.exists(pyw) else sys.executable
            app_cmd = f'"{exec_bin}" "{main_py}" "%1"'
            icon_path = f'"{exec_bin}",0'

        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\.jspen") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, "JSPenStudio.Project")
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\JSPenStudio.Project") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, "JSPen Studio 프로젝트")
            winreg.SetValueEx(key, "FriendlyTypeName", 0, winreg.REG_SZ, "JSPen Studio Project File")
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\JSPenStudio.Project\DefaultIcon") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, icon_path)
        with winreg.CreateKey(winreg.HKEY_CURRENT_USER, r"Software\Classes\JSPenStudio.Project\shell\open\command") as key:
            winreg.SetValue(key, "", winreg.REG_SZ, app_cmd)

        ctypes.windll.shell32.SHChangeNotify(0x08000000, 0, 0, 0)
    except Exception as e:  # registry access is best-effort
        print(f"[JSPen] .jspen file association failed: {e}", flush=True)


def configure_chromium_flags():
    """GPU flags for smooth canvas rendering. A user-provided
    QTWEBENGINE_CHROMIUM_FLAGS always takes precedence."""
    if os.environ.get("QTWEBENGINE_CHROMIUM_FLAGS"):
        return
    flags = ["--enable-gpu-rasterization", "--enable-zero-copy", "--enable-smooth-scrolling"]
    if sys.platform == "win32":
        # Direct3D 11 via ANGLE on Windows (60-144 FPS canvas rendering)
        flags += ["--ignore-gpu-blocklist", "--use-angle=d3d11"]
    os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = " ".join(flags)


def main():
    configure_chromium_flags()
    app = QApplication(sys.argv)
    app.setApplicationName(APP_TITLE)

    register_windows_file_association()

    initial = next((a for a in sys.argv[1:] if is_project_file(a)), None)
    window = MainWindow(os.path.abspath(initial) if initial else None)
    window.show()

    sys.exit(app.exec())


if __name__ == "__main__":
    main()
