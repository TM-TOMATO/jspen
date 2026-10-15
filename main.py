"""
JSPen Studio - Professional Native Desktop Application (Python + PyQt6)
Zero rendering error: Native Qt Desktop Frame with Embedded Canvas 2D Engine.
"""

import sys
import os
import json
from PyQt6.QtCore import Qt, QUrl, pyqtSlot
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QFileDialog, QMessageBox
)
from PyQt6.QtGui import QIcon, QKeySequence, QAction
from PyQt6.QtWebEngineWidgets import QWebEngineView
from PyQt6.QtWebEngineCore import QWebEngineSettings, QWebEnginePage

class DesktopCanvasPage(QWebEnginePage):
    """Custom page disabling browser context menus and text drag artifacts."""
    def __init__(self, parent=None):
        super().__init__(parent)

    # Disable default browser right-click menu (Inspect, Reload, etc.)
    def createStandardContextMenu(self):
        return None

class MainWindow(QMainWindow):
    def __init__(self):
        super().__init__()
        self.setWindowTitle("JSPen Studio - 포토샵형 인터랙티브 자바스크립트 스튜디오")
        self.resize(1360, 860)
        self.setMinimumSize(1024, 680)

        # Set Dark Professional Theme Palette
        self.setStyleSheet("""
            QMainWindow {
                background-color: #121214;
            }
            QMenuBar {
                background-color: #18181b;
                color: #e4e4e7;
                font-size: 12px;
                border-bottom: 1px solid #27272a;
                padding: 2px 6px;
            }
            QMenuBar::item {
                background: transparent;
                padding: 4px 10px;
                border-radius: 4px;
            }
            QMenuBar::item:selected {
                background-color: #27272a;
                color: #38bdf8;
            }
            QMenu {
                background-color: #1f1f23;
                color: #f4f4f5;
                border: 1px solid #333338;
                font-size: 12px;
                padding: 4px 0px;
            }
            QMenu::item {
                padding: 6px 24px;
            }
            QMenu::item:selected {
                background-color: #0284c7;
                color: #ffffff;
            }
            QMenu::separator {
                height: 1px;
                background-color: #2e2e34;
                margin: 4px 0px;
            }
            QStatusBar {
                background-color: #18181b;
                color: #71717a;
                font-size: 11px;
                border-top: 1px solid #27272a;
            }
        """)

        # Initialize Embedded WebEngine View (Zero-Error HTML5 Canvas Engine)
        self.browser = QWebEngineView(self)
        self.custom_page = DesktopCanvasPage(self.browser)
        self.browser.setPage(self.custom_page)
        self.setCentralWidget(self.browser)

        # Configure WebEngine Settings for Desktop App Feel
        settings = self.browser.settings()
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessFileUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.LocalContentCanAccessRemoteUrls, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.JavascriptEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.Accelerated2dCanvasEnabled, True)
        settings.setAttribute(QWebEngineSettings.WebAttribute.ScrollAnimatorEnabled, False)

        # Load Local Studio App
        base_dir = getattr(sys, '_MEIPASS', os.path.dirname(os.path.abspath(__file__)))
        html_path = os.path.abspath(os.path.join(base_dir, "index.html"))
        self.browser.load(QUrl.fromLocalFile(html_path))

        # Command Bridge via titleChanged for Native Windows File Dialogs
        self.browser.titleChanged.connect(self.handle_js_command)

        # Enable Frameless Window (Custom in-app title bar)
        self.setWindowFlags(Qt.WindowType.FramelessWindowHint | Qt.WindowType.Window)

        # Hide Qt menubar and statusbar to avoid duplicate menu bars (Single sleek in-app Photoshop menubar)
        self.menuBar().setVisible(False)
        self.statusBar().setVisible(False)

    def handle_js_command(self, title: str):
        if title.startswith("cmd:"):
            cmd = title.split(":", 1)[1]
            if cmd == "save":
                self.native_save_project()
            elif cmd == "open":
                self.native_open_project()
            elif cmd == "export_js":
                self.native_export_js()
            elif cmd == "export_html":
                self.native_export_html()
            elif cmd == "window_min":
                self.showMinimized()
            elif cmd == "window_max":
                if self.isMaximized():
                    self.showNormal()
                else:
                    self.showMaximized()
            elif cmd == "window_close":
                self.close()
            elif cmd == "window_drag_start":
                if self.windowHandle():
                    self.windowHandle().startSystemMove()
            self.run_js("document.title = 'JSPen Studio';")

    def init_native_menu(self):
        menubar = self.menuBar()
        file_menu = menubar.addMenu("파일(&F)")

        act_new = QAction("새 도큐먼트(&N)", self)
        act_new.setShortcut(QKeySequence("Ctrl+N"))
        act_new.triggered.connect(lambda: self.run_js("window.jspenApp.menuBar.container.querySelector('#mNew').click();"))
        file_menu.addAction(act_new)

        file_menu.addSeparator()

        act_save_proj = QAction("프로젝트 저장...(&S)", self)
        act_save_proj.setShortcut(QKeySequence("Ctrl+S"))
        act_save_proj.triggered.connect(self.native_save_project)
        file_menu.addAction(act_save_proj)

        act_open_proj = QAction("프로젝트 열기...(&O)", self)
        act_open_proj.setShortcut(QKeySequence("Ctrl+O"))
        act_open_proj.triggered.connect(self.native_open_project)
        file_menu.addAction(act_open_proj)

        file_menu.addSeparator()

        act_export_js = QAction("순수 자바스크립트 파일 내보내기...(&E)", self)
        act_export_js.setShortcut(QKeySequence("Ctrl+E"))
        act_export_js.triggered.connect(self.native_export_js)
        file_menu.addAction(act_export_js)

        act_export_html = QAction("독립 실행형 HTML 내보내기...(&H)", self)
        act_export_html.triggered.connect(self.native_export_html)
        file_menu.addAction(act_export_html)

        file_menu.addSeparator()

        act_exit = QAction("종료(&X)", self)
        act_exit.setShortcut(QKeySequence("Alt+F4"))
        act_exit.triggered.connect(self.close)
        file_menu.addAction(act_exit)

        # ----------------------------------------------------------------------
        # 2. 편집 (Edit)
        # ----------------------------------------------------------------------
        edit_menu = menubar.addMenu("편집(&E)")

        act_undo = QAction("실행 취소(&U)", self)
        act_undo.setShortcut(QKeySequence("Ctrl+Z"))
        act_undo.triggered.connect(lambda: self.run_js("if(window.jspenApp.doc.undo()) window.jspenApp.refreshUI();"))
        edit_menu.addAction(act_undo)

        act_redo = QAction("다시 실행(&R)", self)
        act_redo.setShortcut(QKeySequence("Ctrl+Y"))
        act_redo.triggered.connect(lambda: self.run_js("if(window.jspenApp.doc.redo()) window.jspenApp.refreshUI();"))
        edit_menu.addAction(act_redo)

        edit_menu.addSeparator()

        act_dup = QAction("선택 레이어 복제(&D)", self)
        act_dup.setShortcut(QKeySequence("Ctrl+J"))
        act_dup.triggered.connect(lambda: self.run_js("if(window.jspenApp.doc.selectedLayerId){ window.jspenApp.doc.duplicateLayer(window.jspenApp.doc.selectedLayerId); window.jspenApp.refreshUI(); }"))
        edit_menu.addAction(act_dup)

        act_del = QAction("선택 레이어 삭제(&L)", self)
        act_del.setShortcut(QKeySequence("Delete"))
        act_del.triggered.connect(lambda: self.run_js("if(window.jspenApp.doc.selectedLayerId){ window.jspenApp.doc.removeLayer(window.jspenApp.doc.selectedLayerId); window.jspenApp.refreshUI(); }"))
        edit_menu.addAction(act_del)

        # ----------------------------------------------------------------------
        # 3. 보기 (View)
        # ----------------------------------------------------------------------
        view_menu = menubar.addMenu("보기(&V)")

        act_rulers = QAction("눈금자 표시/숨김(&R)", self)
        act_rulers.setShortcut(QKeySequence("Ctrl+R"))
        act_rulers.triggered.connect(lambda: self.run_js("window.jspenApp.renderer.showRulers = !window.jspenApp.renderer.showRulers;"))
        view_menu.addAction(act_rulers)

        act_fit = QAction("화면 크기에 맞춤(&F)", self)
        act_fit.setShortcut(QKeySequence("Ctrl+0"))
        act_fit.triggered.connect(lambda: self.run_js("window.jspenApp.fitToScreen();"))
        view_menu.addAction(act_fit)

        act_100 = QAction("100% 실제 크기(&A)", self)
        act_100.setShortcut(QKeySequence("Ctrl+1"))
        act_100.triggered.connect(lambda: self.run_js("window.jspenApp.renderer.zoom = 1; window.jspenApp.centerArtboard();"))
        view_menu.addAction(act_100)

        # ----------------------------------------------------------------------
        # 4. 모드 (Mode)
        # ----------------------------------------------------------------------
        mode_menu = menubar.addMenu("실행(&R)")

        act_preview = QAction("실시간 모듈 미리보기 토글", self)
        act_preview.setShortcut(QKeySequence("F5"))
        act_preview.triggered.connect(lambda: self.run_js("window.jspenApp.menuBar.container.querySelector('#btnPrev').click();"))
        mode_menu.addAction(act_preview)

    def run_js(self, script, callback=None):
        """Execute JavaScript inside the embedded zero-error canvas view."""
        if callback:
            self.browser.page().runJavaScript(script, callback)
        else:
            self.browser.page().runJavaScript(script)

    def native_save_project(self):
        """Native Windows Save File Dialog for .jspen project file."""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "JSPen 프로젝트 저장", "", "JSPen Project (*.jspen);;JSON Files (*.json)"
        )
        if file_path:
            def on_json_ready(json_str):
                try:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(json_str)
                    self.statusBar().showMessage(f"프로젝트가 저장되었습니다: {os.path.basename(file_path)}", 4000)
                except Exception as e:
                    QMessageBox.critical(self, "저장 오류", f"파일을 저장할 수 없습니다:\n{e}")

            self.run_js("JSON.stringify(window.jspenApp.doc.toJSON(), null, 2);", on_json_ready)

    def native_open_project(self):
        """Native Windows Open File Dialog for loading .jspen project file."""
        file_path, _ = QFileDialog.getOpenFileName(
            self, "JSPen 프로젝트 열기", "", "JSPen Project (*.jspen *.json);;All Files (*.*)"
        )
        if file_path:
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                escaped = json.dumps(content)
                self.run_js(f"window.jspenApp.doc.loadFromData(JSON.parse({escaped}), true); window.jspenApp.refreshUI();")
                self.statusBar().showMessage(f"프로젝트를 불러왔습니다: {os.path.basename(file_path)}", 4000)
            except Exception as e:
                QMessageBox.critical(self, "불러오기 오류", f"파일을 열 수 없습니다:\n{e}")

    def native_export_js(self):
        """Export pure Vanilla JS Canvas code to a local .js file via native dialog."""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "자바스크립트 소스코드 저장", "artboard.js", "JavaScript Files (*.js);;All Files (*.*)"
        )
        if file_path:
            def on_code_ready(code_str):
                try:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(code_str)
                    self.statusBar().showMessage(f"순수 자바스크립트가 내보내졌습니다: {os.path.basename(file_path)}", 5000)
                    QMessageBox.information(self, "내보내기 완료", f"성공적으로 순수 자바스크립트 파일이 생성되었습니다!\n\n경로: {file_path}")
                except Exception as e:
                    QMessageBox.critical(self, "내보내기 오류", f"파일을 저장할 수 없습니다:\n{e}")

            self.run_js("PhotoshopJSExporter.generateJS(window.jspenApp.doc);", on_code_ready)

    def native_export_html(self):
        """Export standalone HTML file via native dialog."""
        file_path, _ = QFileDialog.getSaveFileName(
            self, "완성형 웹페이지 저장", "index.html", "HTML Files (*.html);;All Files (*.*)"
        )
        if file_path:
            def on_html_ready(html_str):
                try:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(html_str)
                    self.statusBar().showMessage(f"완성형 HTML이 저장되었습니다: {os.path.basename(file_path)}", 5000)
                    QMessageBox.information(self, "내보내기 완료", f"독립 실행형 웹페이지가 성공적으로 생성되었습니다!\n\n경로: {file_path}")
                except Exception as e:
                    QMessageBox.critical(self, "내보내기 오류", f"파일을 저장할 수 없습니다:\n{e}")

            self.run_js("PhotoshopJSExporter.generateHTML(window.jspenApp.doc);", on_html_ready)

def main():
    # Enable High DPI Scaling
    os.environ["QT_AUTO_SCREEN_SCALE_FACTOR"] = "1"
    app = QApplication(sys.argv)
    app.setApplicationName("JSPen Studio")

    window = MainWindow()
    window.show()

    sys.exit(app.exec())

if __name__ == "__main__":
    main()
