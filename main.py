"""
JSPen Studio - Native Desktop Shell (Python + PyQt6 QtWebEngine)

Hosts the HTML5 Canvas studio (index.html + js/bundle.js) in a frameless Qt
window and provides native services the web page cannot do on its own:
file dialogs for project save/open, file downloads, window controls and
.jspen file association on Windows.

JS <-> Python communication uses QWebChannel: the page sees a
`window.JSPenHost` object (see HostBridge below and NativeBridge in
js/bundle.js).

Security model: project files are untrusted and approved scripts run inside
the page, so the page itself is untrusted.
  * It is served from jspen://app/ and can read only the bundled app files.
  * It has no network; links open in the system browser after a confirmation.
  * Only Python decides which path is saved to: the page gets opaque tokens.
  * Previews run on their own origin and profile, without the bridge.
"""

import json
import os
import re
import secrets
import sys

from PyQt6.QtCore import QBuffer, QByteArray, QFile, QIODevice, QObject, Qt, QTimer, QUrl, pyqtSlot
from PyQt6.QtGui import QColor, QDesktopServices
from PyQt6.QtWebChannel import QWebChannel
from PyQt6.QtWidgets import QApplication, QFileDialog, QMainWindow, QMessageBox
from PyQt6.QtWebEngineCore import (
    QWebEngineDownloadRequest,
    QWebEnginePage,
    QWebEngineProfile,
    QWebEngineScript,
    QWebEngineSettings,
    QWebEngineUrlRequestInterceptor,
    QWebEngineUrlRequestJob,
    QWebEngineUrlScheme,
    QWebEngineUrlSchemeHandler,
)
from PyQt6.QtWebEngineWidgets import QWebEngineView

PROJECT_EXTENSIONS = (".jspen", ".json")
APP_TITLE = "JSPen Studio"
EXPORT_EXTENSIONS = (".html", ".js") + PROJECT_EXTENSIONS

APP_SCHEME = "jspen"
PREVIEW_SCHEME = "jspen-preview"
APP_URL = f"{APP_SCHEME}://app/index.html"
APP_DIRS = ("css", "js", "templates")
MIME_TYPES = {
    ".html": "text/html", ".css": "text/css", ".js": "text/javascript", ".json": "application/json",
    ".jspen": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
}
# 'unsafe-eval' is needed by the user script module and plugins (new Function).
STUDIO_CSP = (
    "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; "
    "img-src 'self' data: blob:; media-src 'self' data: blob:; font-src 'self' data:; "
    "connect-src 'self' data: blob:; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'"
)
# Exports consist of inline scripts. WebSockets bypass the request interceptor,
# so connections also have to be limited by policy.
PREVIEW_CSP = "connect-src data: blob:; object-src 'none'; frame-src 'none'; base-uri 'none'"


def register_url_schemes():
    """Must run before the QApplication is created."""
    for name in (APP_SCHEME, PREVIEW_SCHEME):
        scheme = QWebEngineUrlScheme(name.encode("ascii"))
        scheme.setSyntax(QWebEngineUrlScheme.Syntax.Host)
        scheme.setFlags(QWebEngineUrlScheme.Flag.SecureScheme | QWebEngineUrlScheme.Flag.CorsEnabled)
        QWebEngineUrlScheme.registerScheme(scheme)


register_url_schemes()


def resource_dir():
    """Directory holding index.html, css/, js/ and templates/ (PyInstaller aware)."""
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def is_project_file(path):
    return bool(path) and os.path.isfile(path) and path.lower().endswith(PROJECT_EXTENSIONS)


def configure_web_settings(settings):
    """Common QtWebEngine settings for the studio and preview windows."""
    attr = QWebEngineSettings.WebAttribute
    # App files come from jspen://app/; no page has any business reading file://.
    settings.setAttribute(attr.LocalContentCanAccessFileUrls, False)
    # Local pages must not be able to read arbitrary remote URLs (data exfiltration).
    settings.setAttribute(attr.LocalContentCanAccessRemoteUrls, False)
    settings.setAttribute(attr.JavascriptEnabled, True)
    settings.setAttribute(attr.Accelerated2dCanvasEnabled, True)
    settings.setAttribute(attr.WebGLEnabled, True)
    settings.setAttribute(attr.ScrollAnimatorEnabled, False)


def add_csp(html, policy):
    """Make `policy` the first thing in the document's <head>."""
    meta = f'<meta http-equiv="Content-Security-Policy" content="{policy}">'
    return html.replace(b"<head>", b"<head>" + meta.encode("ascii"), 1)


def reply_bytes(job, mime, data):
    buffer = QBuffer(job)  # lives as long as the request
    buffer.setData(QByteArray(data))
    buffer.open(QIODevice.OpenModeFlag.ReadOnly)
    job.reply(QByteArray(mime.encode("ascii")), buffer)


def app_resource_path(url):
    """File behind a jspen://app/ URL, or None when it is not an app resource."""
    if url.host() != "app":
        return None
    rel = url.path(QUrl.ComponentFormattingOption.FullyDecoded).lstrip("/")
    parts = rel.split("/")
    # Checked before touching the disk: a UNC or drive path must not even be opened.
    if any(part in ("", ".", "..") or re.search(r'[\\:\x00]', part) for part in parts):
        return None
    if rel != "index.html" and (len(parts) < 2 or parts[0] not in APP_DIRS):
        return None
    if os.path.splitext(rel)[1].lower() not in MIME_TYPES:
        return None
    return os.path.join(resource_dir(), *parts)


class AppSchemeHandler(QWebEngineUrlSchemeHandler):
    """Serves the studio's own files and nothing else."""

    def requestStarted(self, job):
        path = app_resource_path(job.requestUrl())
        if path is None or job.requestMethod() != b"GET":
            job.fail(QWebEngineUrlRequestJob.Error.RequestDenied)
            return
        try:
            with open(path, "rb") as f:
                data = f.read()
        except OSError:
            job.fail(QWebEngineUrlRequestJob.Error.UrlNotFound)
            return
        if os.path.basename(path) == "index.html":
            data = add_csp(data, STUDIO_CSP)
        reply_bytes(job, MIME_TYPES[os.path.splitext(path)[1].lower()], data)


class PreviewSchemeHandler(QWebEngineUrlSchemeHandler):
    """Serves preview documents from memory, each on its own origin."""

    def __init__(self, parent=None):
        super().__init__(parent)
        self.documents = {}

    def add(self, html):
        key = secrets.token_hex(16)
        self.documents[key] = add_csp(html.encode("utf-8"), PREVIEW_CSP)
        return key

    def requestStarted(self, job):
        url = job.requestUrl()
        html = self.documents.get(url.host())
        if html is None or url.path() != "/index.html":
            job.fail(QWebEngineUrlRequestJob.Error.UrlNotFound)
            return
        reply_bytes(job, "text/html", html)


class OfflineInterceptor(QWebEngineUrlRequestInterceptor):
    """Blocks file:, http(s): and every other scheme the page does not need."""

    def __init__(self, scheme, parent=None):
        super().__init__(parent)
        self.allowed = (scheme, "data", "blob", "qrc")

    def interceptRequest(self, info):
        if info.requestUrl().scheme() not in self.allowed:
            info.block(True)


def same_document(url, target):
    return (url.scheme(), url.host(), url.path()) == (target.scheme(), target.host(), target.path())


def build_channel_bootstrap_script():
    """Inject qwebchannel.js plus a tiny bootstrap that exposes the host
    object as window.JSPenHost and fires a 'jspen-host-ready' event."""
    f = QFile(":/qtwebchannel/qwebchannel.js")
    if not f.open(QIODevice.OpenModeFlag.ReadOnly):
        raise RuntimeError("qwebchannel.js resource is not available")
    source = bytes(f.readAll()).decode("utf-8")
    f.close()
    source += """
;(function () {
  if (!window.qt || !qt.webChannelTransport) return;
  new QWebChannel(qt.webChannelTransport, function (channel) {
    window.JSPenHost = channel.objects.jspenHost;
    document.dispatchEvent(new Event('jspen-host-ready'));
  });
})();
"""
    script = QWebEngineScript()
    script.setName("jspen-webchannel")
    script.setSourceCode(source)
    script.setInjectionPoint(QWebEngineScript.InjectionPoint.DocumentCreation)
    script.setWorldId(QWebEngineScript.ScriptWorldId.MainWorld)
    script.setRunsOnSubFrames(False)
    return script


class HostBridge(QObject):
    """Object published to the studio page as window.JSPenHost.
    Only the main studio page gets the channel; preview windows do not."""

    def __init__(self, window):
        super().__init__(window)
        self._window = window

    @pyqtSlot(str)
    def command(self, name):
        self._window.handle_command(name)

    @pyqtSlot(str, str)
    def saveProject(self, json_text, file_name):
        self._window.save_project_text(json_text, file_name, save_as=True)

    @pyqtSlot(str, str, bool)
    def saveProjectTo(self, json_text, file_name, save_as):
        """Ctrl+S (save_as=False) overwrites the current file without asking."""
        self._window.save_project_text(json_text, file_name, save_as=save_as)

    @pyqtSlot(str, str)
    def saveFile(self, file_name, text):
        """Exports (HTML/JS) chosen with a native save dialog."""
        self._window.save_text_file(file_name, text)

    @pyqtSlot(str)
    def projectOpened(self, token):
        """The page loaded a project. `token` is the one open_project_file() gave
        it, or "" for a project without a file (template, browser file picker,
        HTML5 drop). Anything else is unknown: Ctrl+S then asks for a path."""
        self._window.confirm_opened(token)

    @pyqtSlot(str)
    def openPreview(self, html):
        """Show generated HTML in an isolated window."""
        self._window.open_preview_window(html)


class PreviewWindow(QMainWindow):
    """Separate window for the web preview and "run in new window"."""

    def __init__(self, parent, profile, url):
        super().__init__(parent)
        self.setAttribute(Qt.WidgetAttribute.WA_DeleteOnClose, True)
        self.setWindowTitle("JSPen Web Preview - 인터랙티브 웹사이트 라이브 미리보기")
        self.resize(1440, 900)
        self.setStyleSheet("QMainWindow { background-color: #18181b; }")
        self.view = QWebEngineView(self)
        self.view.setPage(PreviewPage(profile, self.view, parent, url))
        self.view.page().setBackgroundColor(QColor("#18181b"))
        self.view.setStyleSheet("background-color: #18181b;")
        self.setCentralWidget(self.view)
        configure_web_settings(self.view.settings())
        self.view.load(url)


class ContainedPage(QWebEnginePage):
    """A page that stays on its document. Links go to the system browser after
    the user confirms them; window.open() never creates a window in the app."""

    def __init__(self, profile, parent_view, owner, home):
        super().__init__(profile, parent_view)
        self.owner = owner
        self.home = home
        install_permission_prompt(self, owner)
        self.newWindowRequested.connect(lambda request: self.owner.request_external_link(request.requestedUrl()))

    def acceptNavigationRequest(self, url, nav_type, is_main_frame):
        allowed = same_document(url, self.home) if is_main_frame else url.scheme() == "about"
        if allowed:
            return super().acceptNavigationRequest(url, nav_type, is_main_frame)
        if is_main_frame:
            self.owner.request_external_link(url)
        return False


class PreviewPage(ContainedPage):
    """Page for preview windows (no bridge, separate profile and origin)."""


def install_permission_prompt(page, parent_widget):
    """Microphone access (audio_reactive module) is granted only after the user
    confirms it; every other permission request is denied."""

    def ask(origin_text):
        answer = QMessageBox.question(
            parent_widget, "마이크 사용 권한",
            f"이 문서의 '소리 반응' 모듈이 마이크를 사용하려고 합니다.\n\n허용하시겠습니까?\n({origin_text})",
        )
        return answer == QMessageBox.StandardButton.Yes

    if hasattr(page, "permissionRequested"):  # Qt >= 6.8
        try:
            from PyQt6.QtWebEngineCore import QWebEnginePermission
        except ImportError:  # pragma: no cover
            QWebEnginePermission = None

        def on_permission(permission):
            mic = QWebEnginePermission is not None and \
                permission.permissionType() == QWebEnginePermission.PermissionType.MediaAudioCapture
            if mic and ask(permission.origin().toString() or "local"):
                permission.grant()
            else:
                permission.deny()

        page.permissionRequested.connect(on_permission)
    else:  # Qt 6.5 - 6.7
        def on_feature(origin, feature):
            mic = feature == QWebEnginePage.Feature.MediaAudioCapture
            policy = QWebEnginePage.PermissionPolicy.PermissionGrantedByUser \
                if mic and ask(origin.toString() or "local") \
                else QWebEnginePage.PermissionPolicy.PermissionDeniedByUser
            page.setFeaturePermission(origin, feature, policy)

        page.featurePermissionRequested.connect(on_feature)


class DesktopCanvasPage(ContainedPage):
    """Studio page: the only one that gets the bridge."""

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
        self._pending_open = None  # (token, path) of the file handed to the page last
        self._asking_link = False
        self._close_confirmed = False
        self.initial_file = initial_file if is_project_file(initial_file) else None

        # Profiles are owned by the application: they must outlive their pages.
        app = QApplication.instance()
        self.profile = QWebEngineProfile(app)  # off the record
        self.profile.installUrlSchemeHandler(APP_SCHEME.encode("ascii"), AppSchemeHandler(self.profile))
        self.profile.setUrlRequestInterceptor(OfflineInterceptor(APP_SCHEME, self.profile))
        self.preview_profile = QWebEngineProfile(app)
        self.preview_documents = PreviewSchemeHandler(self.preview_profile)
        self.preview_profile.installUrlSchemeHandler(PREVIEW_SCHEME.encode("ascii"), self.preview_documents)
        self.preview_profile.setUrlRequestInterceptor(OfflineInterceptor(PREVIEW_SCHEME, self.preview_profile))

        # Embedded studio view
        self.browser = QWebEngineView(self)
        self.custom_page = DesktopCanvasPage(self.profile, self.browser, self, QUrl(APP_URL))
        self.custom_page.setBackgroundColor(QColor("#0f0f11"))
        self.browser.setPage(self.custom_page)
        self.browser.setStyleSheet("background-color: #0f0f11;")
        self.setCentralWidget(self.browser)
        configure_web_settings(self.browser.settings())

        # QWebChannel bridge (window.JSPenHost)
        self.host_bridge = HostBridge(self)
        self.channel = QWebChannel(self.custom_page)
        self.channel.registerObject("jspenHost", self.host_bridge)
        self.custom_page.setWebChannel(self.channel)
        self.custom_page.scripts().insert(build_channel_bootstrap_script())

        # Downloads triggered by <a download> (export modal, website export, ...)
        for profile in (self.profile, self.preview_profile):
            profile.downloadRequested.connect(self.on_download_requested)

        # Drag & drop of .jspen files onto the window
        # Qt6 delivers drops to an internal child widget of the web view, so
        # filter at the application level and keep only events for the view.
        self.setAcceptDrops(True)
        QApplication.instance().installEventFilter(self)

        self.browser.load(QUrl(APP_URL))
        self.browser.loadFinished.connect(self.on_load_finished)

        # Frameless window: the in-app menu bar acts as the title bar
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)

    # ------------------------------------------------------------------
    # JS bridge
    # ------------------------------------------------------------------
    def handle_command(self, cmd):
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
        else:
            print(f"[JSPen] unknown host command: {cmd!r}", flush=True)

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
        # A (re)load is a fresh document ("새 도큐먼트" reloads the page):
        # never keep saving into the previous file.
        self.current_file = None
        self._pending_open = None
        if ok and self.initial_file:
            self.open_project_file(self.initial_file, confirm=False)
            self.initial_file = None

    def confirm_opened(self, token):
        """Map the page's token to the path chosen on the Python side."""
        self.current_file = None
        if token and self._pending_open and token == self._pending_open[0]:
            self.current_file = self._pending_open[1]
            self._pending_open = None

    def native_save_project(self):
        """Ask the page for the document, then save it (used by the 'save' command)."""
        def on_json_ready(result):
            if not result:
                QMessageBox.critical(self, "저장 오류", "프로젝트 데이터를 가져오지 못했습니다.")
                return
            data = json.loads(result)
            self.save_project_text(data["json"], data.get("fileName") or "project.jspen")

        self.run_js(
            "JSON.stringify({"
            " json: JSON.stringify(window.jspenApp.doc.toJSON(), null, 2),"
            " fileName: window.jspenApp.getProjectFileName() })",
            on_json_ready,
        )

    def save_project_text(self, json_text, file_name, save_as=False):
        """Write the project JSON. Asks for a path only for "save as" or when
        the document has not been saved/opened from a file yet."""
        file_path = None if save_as else self.current_file
        if not file_path:
            default_path = self.current_file or os.path.basename(file_name or "project.jspen")
            file_path, _ = QFileDialog.getSaveFileName(
                self, "JSPen 프로젝트 저장", default_path,
                "JSPen Project (*.jspen);;JSON Files (*.json)"
            )
            if not file_path:
                return
            if not file_path.lower().endswith(PROJECT_EXTENSIONS):
                file_path += ".jspen"
        try:
            tmp_path = file_path + ".tmp"
            with open(tmp_path, "w", encoding="utf-8") as f:
                f.write(json_text)
            os.replace(tmp_path, file_path)  # never leave a half-written project
            self.current_file = file_path
            self.run_js("window.jspenApp && jspenApp.markSaved();")
            self.notify(f"프로젝트가 저장되었습니다: {os.path.basename(file_path)}")
        except OSError as e:
            QMessageBox.critical(self, "저장 오류", f"파일을 저장할 수 없습니다:\n{e}")

    def save_text_file(self, file_name, text):
        """Save an exported file (HTML/JS) through a native dialog."""
        base = os.path.basename(file_name or "") or "export.html"
        if not base.lower().endswith(EXPORT_EXTENSIONS):
            base = "export.html"  # the page must not suggest startup.bat and the like
        start = os.path.join(os.path.dirname(self.current_file), base) if self.current_file else base
        ext = os.path.splitext(base)[1].lower()
        filters = {".html": "HTML Files (*.html)", ".js": "JavaScript Files (*.js)",
                   ".jspen": "JSPen Project (*.jspen)"}.get(ext, "All Files (*.*)")
        file_path, _ = QFileDialog.getSaveFileName(self, "파일 저장", start, filters + ";;All Files (*.*)")
        if not file_path:
            return
        try:
            with open(file_path, "w", encoding="utf-8") as f:
                f.write(text)
            self.notify(f"저장되었습니다: {os.path.basename(file_path)}")
        except OSError as e:
            QMessageBox.critical(self, "저장 오류", f"파일을 저장할 수 없습니다:\n{e}")

    def native_open_project(self):
        start_dir = os.path.dirname(self.current_file) if self.current_file else ""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "JSPen 프로젝트 열기", start_dir,
            "JSPen Project (*.jspen *.json);;All Files (*.*)"
        )
        if file_path:
            # The page already asked about unsaved changes before the dialog.
            self.open_project_file(file_path, confirm=False)

    def open_project_file(self, file_path, confirm=True):
        """Load a .jspen/.json file into the studio. With confirm=True the page
        asks first when the current document has unsaved changes."""
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                content = f.read()
        except (OSError, UnicodeDecodeError) as e:
            QMessageBox.critical(self, "불러오기 오류", f"파일을 열 수 없습니다:\n{e}")
            return
        token = secrets.token_hex(16)
        self._pending_open = (token, os.path.abspath(file_path))
        self.run_js(
            "window.jspenApp && Promise.resolve(window.jspenApp.openProjectText("
            f"{json.dumps(content)}, {json.dumps(os.path.basename(file_path))}, {json.dumps(bool(confirm))}, "
            f"{json.dumps(token)}));"
        )

    def closeEvent(self, event):
        """Ask before closing when the document has unsaved changes."""
        if self._close_confirmed:
            super().closeEvent(event)
            return
        event.ignore()

        def on_dirty(dirty):
            if dirty:
                box = QMessageBox(self)
                box.setIcon(QMessageBox.Icon.Warning)
                box.setWindowTitle("저장하지 않은 변경 사항")
                box.setText("저장하지 않은 변경 사항이 있습니다.\n저장하지 않고 닫을까요?")
                discard = box.addButton("저장하지 않고 닫기", QMessageBox.ButtonRole.DestructiveRole)
                box.addButton("취소", QMessageBox.ButtonRole.RejectRole)
                box.exec()
                if box.clickedButton() is not discard:
                    return
            self._close_confirmed = True
            self.close()

        self.run_js("!!(window.jspenApp && window.jspenApp.isDirty())", on_dirty)

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
    def open_preview_window(self, html):
        key = self.preview_documents.add(html)
        win = PreviewWindow(self, self.preview_profile, QUrl(f"{PREVIEW_SCHEME}://{key}/index.html"))
        self.preview_windows.append(win)
        windows, documents = self.preview_windows, self.preview_documents.documents

        def forget(*_):
            if win in windows:
                windows.remove(win)
            documents.pop(key, None)

        win.destroyed.connect(forget)
        win.show()

    # ------------------------------------------------------------------
    # External links
    # ------------------------------------------------------------------
    def request_external_link(self, url):
        """A page wants to open `url`. It may carry anything the page knows, so
        nothing is opened before the user has seen the address and agreed."""
        if url.scheme() not in ("http", "https", "mailto") or self._asking_link:
            return
        self._asking_link = True
        url = QUrl(url)  # the caller's object does not outlive its signal

        def ask():
            try:
                if self.confirm_external_link(url):
                    QDesktopServices.openUrl(url)
            finally:
                self._asking_link = False

        # Not inside the navigation callback: the dialog runs its own event loop.
        QTimer.singleShot(0, ask)

    def confirm_external_link(self, url):
        address = url.toString(QUrl.ComponentFormattingOption.FullyEncoded)
        shown = address if len(address) <= 600 else f"{address[:600]}...\n(전체 {len(address)}자)"
        box = QMessageBox(self)
        box.setIcon(QMessageBox.Icon.Question)
        box.setWindowTitle("외부 링크 열기")
        box.setTextFormat(Qt.TextFormat.PlainText)
        box.setText(f"기본 브라우저(또는 메일 앱)에서 다음 주소를 열까요?\n\n{url.host() or url.scheme()}\n\n{shown}")
        open_button = box.addButton("열기", QMessageBox.ButtonRole.AcceptRole)
        cancel = box.addButton("취소", QMessageBox.ButtonRole.RejectRole)
        box.setDefaultButton(cancel)
        box.exec()
        return box.clickedButton() is open_button

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

    def _is_view_widget(self, obj):
        try:
            while obj is not None:
                if obj is self.browser:
                    return True
                obj = obj.parent()
        except (AttributeError, RuntimeError):  # non-widget objects, teardown
            pass
        return False

    def eventFilter(self, watched, event):
        kind = event.type()
        if kind in (event.Type.DragEnter, event.Type.DragMove, event.Type.Drop) and self._is_view_widget(watched):
            if kind in (event.Type.DragEnter, event.Type.DragMove) and self._dropped_project(event.mimeData()):
                event.acceptProposedAction()
                return True
            if kind == event.Type.Drop:
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


SELFTEST_JS = """
(async () => {
  const out = { app: !!window.jspenApp, desktop: !!(window.JSPenNative && JSPenNative.isDesktop) };
  try {
    out.templates = (await jspenApp.templateModal.fetchTemplateList()).length;
    out.templateLoads = !!(await jspenApp.templateModal.loadTemplateFile('hero.jspen'));
    out.engine = typeof jspenApp.moduleEngine.update === 'function';
    out.exportBytes = PhotoshopJSExporter.generateHTML(jspenApp.doc).length;
  } catch (e) { out.error = String(e); }
  return JSON.stringify(out);
})()
"""


def run_selftest(app, window):
    """--selftest: load the studio, check it from JS, print JSON, exit 0/1.
    Useful to verify a PyInstaller build (also without a display)."""
    state = {"code": 1}

    def report(result):
        print(f"JSPEN_SELFTEST {result}", flush=True)
        try:
            data = json.loads(result or "{}")
            ok = data.get("app") and data.get("desktop") and data.get("templates", 0) >= 7 and \
                data.get("templateLoads") and data.get("engine") and data.get("exportBytes", 0) > 1000
            state["code"] = 0 if ok else 1
        except ValueError:
            state["code"] = 1
        window._close_confirmed = True
        app.quit()

    def poll():
        # runJavaScript cannot await promises: store the result, then read it.
        window.run_js("window.__selftest || null", lambda r: report(r) if r else QTimer.singleShot(300, poll))

    def on_loaded(ok):
        if not ok:
            report('{"error": "page did not load"}')
            return
        window.run_js(SELFTEST_JS.strip() + ".then(r => { window.__selftest = r; });")
        QTimer.singleShot(500, poll)

    window.browser.loadFinished.connect(on_loaded)
    QTimer.singleShot(60000, lambda: report('{"error": "timeout"}'))
    app.exec()
    return state["code"]


def main():
    configure_chromium_flags()
    app = QApplication(sys.argv)
    app.setApplicationName(APP_TITLE)

    selftest = "--selftest" in sys.argv[1:]
    if not selftest:
        register_windows_file_association()

    initial = next((a for a in sys.argv[1:] if is_project_file(a)), None)
    window = MainWindow(os.path.abspath(initial) if initial else None)
    window.show()

    if selftest:
        sys.exit(run_selftest(app, window))
    sys.exit(app.exec())


if __name__ == "__main__":
    main()
