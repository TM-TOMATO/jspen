import { PhotoshopJSExporter } from '../exporter/PhotoshopJSExporter.js';

/**
 * Export Modal
 * Provides code preview, copying, file downloading, and sandbox execution in a new tab.
 */
export class ExportModal {
  constructor(documentModel) {
    this.doc = documentModel;
    this.activeTab = 'js'; // 'js' or 'html'
    this.initDOM();
  }

  initDOM() {
    this.overlay = document.createElement('div');
    this.overlay.className = 'modal-overlay hidden';
    this.overlay.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-title-group">
            <span class="modal-icon">⚡</span>
            <div>
              <h2 class="modal-title">자바스크립트 코드 출력 & 내보내기</h2>
              <p class="modal-desc">포토샵 드로잉과 28종 노코드 모듈 인터랙션을 순수 자바스크립트 및 독립형 HTML로 추출합니다.</p>
            </div>
          </div>
          <button class="modal-close-btn" id="modalCloseBtn">✕</button>
        </div>

        <div class="modal-tabs">
          <button class="modal-tab active" data-tab="js">📜 순수 자바스크립트 (main.js)</button>
          <button class="modal-tab" data-tab="html">🌐 완성형 웹페이지 (index.html)</button>
        </div>

        <div class="modal-body">
          <div class="code-container">
            <div class="code-header">
              <span id="codeLangLabel">JavaScript (Vanilla Canvas 2D - Zero Dependency)</span>
              <div class="code-actions">
                <button class="btn btn-secondary btn-sm" id="btnCopyCode">📋 코드 복사</button>
                <button class="btn btn-primary btn-sm" id="btnDownloadFile">💾 파일 다운로드</button>
                <button class="btn btn-accent btn-sm" id="btnRunSandbox">🚀 새 창에서 바로 실행</button>
              </div>
            </div>
            <pre class="code-pre"><code id="codeOutput"></code></pre>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.overlay);

    // Event listeners
    this.overlay.querySelector('#modalCloseBtn').addEventListener('click', () => this.hide());
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.hide();
    });

    const tabs = this.overlay.querySelectorAll('.modal-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.activeTab = tab.dataset.tab;
        this.refreshCode();
      });
    });

    this.overlay.querySelector('#btnCopyCode').addEventListener('click', () => this.copyToClipboard());
    this.overlay.querySelector('#btnDownloadFile').addEventListener('click', () => this.downloadFile());
    this.overlay.querySelector('#btnRunSandbox').addEventListener('click', () => this.runInNewTab());
  }

  show() {
    this.overlay.classList.remove('hidden');
    this.refreshCode();
  }

  hide() {
    this.overlay.classList.add('hidden');
  }

  refreshCode() {
    const codeEl = this.overlay.querySelector('#codeOutput');
    const langLabel = this.overlay.querySelector('#codeLangLabel');

    if (this.activeTab === 'js') {
      langLabel.textContent = 'JavaScript (Vanilla Canvas 2D - Zero Dependency)';
      codeEl.textContent = PhotoshopJSExporter.generateJS(this.doc);
    } else {
      langLabel.textContent = 'Standalone HTML5 File';
      codeEl.textContent = PhotoshopJSExporter.generateHTML(this.doc);
    }
  }

  copyToClipboard() {
    const code = this.activeTab === 'js'
      ? PhotoshopJSExporter.generateJS(this.doc)
      : PhotoshopJSExporter.generateHTML(this.doc);

    navigator.clipboard.writeText(code).then(() => {
      const btn = this.overlay.querySelector('#btnCopyCode');
      const original = btn.textContent;
      btn.textContent = '✅ 복사 완료!';
      setTimeout(() => btn.textContent = original, 2000);
    });
  }

  downloadFile() {
    const isJs = this.activeTab === 'js';
    const content = isJs ? PhotoshopJSExporter.generateJS(this.doc) : PhotoshopJSExporter.generateHTML(this.doc);
    const filename = isJs ? 'artboard.js' : 'index.html';
    const type = isJs ? 'text/javascript' : 'text/html';

    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  runInNewTab() {
    const htmlContent = PhotoshopJSExporter.generateHTML(this.doc);
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
  }
}
