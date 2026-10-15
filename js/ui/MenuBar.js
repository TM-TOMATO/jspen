/**
 * Photoshop-style Top Menu Bar
 * File (F), Edit (E), Layer (L), View (V), Live Preview Play/Stop, and JS Export.
 */
export class MenuBar {
  constructor(container, documentModel, callbacks = {}) {
    this.container = container;
    this.doc = documentModel;
    this.callbacks = callbacks;
    this.isPreviewing = false;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="ps-menubar-left">
        <div class="ps-app-logo">
          <span class="ps-logo-icon">⚡</span>
          <span class="ps-logo-text">JSPen Studio</span>
        </div>

        <div class="ps-menu-items">
          <div class="ps-menu-item">
            <span>파일(F)</span>
            <div class="ps-dropdown-menu">
              <button class="ps-dropdown-item" id="menuNewDoc">새 도큐먼트</button>
              <button class="ps-dropdown-item" id="menuSaveJson">프로젝트 저장 (.jspen)</button>
              <label class="ps-dropdown-item file-label">
                프로젝트 열기...
                <input type="file" id="menuLoadJsonInput" accept=".jspen,.json" style="display:none;">
              </label>
              <div class="ps-dropdown-sep"></div>
              <button class="ps-dropdown-item" id="menuExportJS">자바스크립트 내보내기...</button>
            </div>
          </div>

          <div class="ps-menu-item">
            <span>편집(E)</span>
            <div class="ps-dropdown-menu">
              <button class="ps-dropdown-item" id="menuUndo">실행 취소 <span class="shortcut">Ctrl+Z</span></button>
              <button class="ps-dropdown-item" id="menuRedo">다시 실행 <span class="shortcut">Ctrl+Y</span></button>
              <div class="ps-dropdown-sep"></div>
              <button class="ps-dropdown-item" id="menuFreeTransform">자유 변형 <span class="shortcut">Ctrl+T</span></button>
              <button class="ps-dropdown-item" id="menuDeleteSelected">삭제 <span class="shortcut">Delete</span></button>
            </div>
          </div>

          <div class="ps-menu-item">
            <span>레이어(L)</span>
            <div class="ps-dropdown-menu">
              <button class="ps-dropdown-item" id="menuNewLayer">새 레이어</button>
              <button class="ps-dropdown-item" id="menuDuplicateLayer">레이어 복제 <span class="shortcut">Ctrl+J</span></button>
              <div class="ps-dropdown-sep"></div>
              <button class="ps-dropdown-item" id="menuLayerUp">한 단계 위로 <span class="shortcut">Ctrl+]</span></button>
              <button class="ps-dropdown-item" id="menuLayerDown">한 단계 아래로 <span class="shortcut">Ctrl+[</span></button>
            </div>
          </div>

          <div class="ps-menu-item">
            <span>보기(V)</span>
            <div class="ps-dropdown-menu">
              <button class="ps-dropdown-item" id="menuToggleRulers">눈금자 켜기/끄기 <span class="shortcut">Ctrl+R</span></button>
              <button class="ps-dropdown-item" id="menuFitScreen">화면 맞춤 <span class="shortcut">Ctrl+0</span></button>
              <button class="ps-dropdown-item" id="menuResetZoom">100% 실제 크기 <span class="shortcut">Ctrl+1</span></button>
            </div>
          </div>
        </div>
      </div>

      <div class="ps-menubar-center">
        <!-- Live Preview / Edit Mode Toggle -->
        <button class="btn btn-preview ${this.isPreviewing ? 'active' : ''}" id="btnTogglePreview">
          <span class="preview-icon">${this.isPreviewing ? '⏹' : '▶'}</span>
          <span class="preview-text">${this.isPreviewing ? '편집 모드로 복귀' : '실시간 모듈 미리보기'}</span>
        </button>
      </div>

      <div class="ps-menubar-right">
        <button class="btn btn-accent btn-sm" id="btnTopExport">
          ⚡ 자바스크립트 출력
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Live Preview Toggle
    const btnPreview = this.container.querySelector('#btnTogglePreview');
    btnPreview.addEventListener('click', () => {
      this.isPreviewing = !this.isPreviewing;
      if (this.isPreviewing) {
        btnPreview.classList.add('active');
        btnPreview.innerHTML = `<span class="preview-icon">⏹</span><span class="preview-text">편집 모드로 복귀</span>`;
        if (this.callbacks.onStartLivePreview) this.callbacks.onStartLivePreview();
      } else {
        btnPreview.classList.remove('active');
        btnPreview.innerHTML = `<span class="preview-icon">▶</span><span class="preview-text">실시간 모듈 미리보기</span>`;
        if (this.callbacks.onStopLivePreview) this.callbacks.onStopLivePreview();
      }
    });

    // Top Export
    this.container.querySelector('#btnTopExport').addEventListener('click', () => {
      if (this.callbacks.onExport) this.callbacks.onExport();
    });

    this.container.querySelector('#menuExportJS').addEventListener('click', () => {
      if (this.callbacks.onExport) this.callbacks.onExport();
    });

    // File Operations
    this.container.querySelector('#menuNewDoc').addEventListener('click', () => {
      if (confirm('새 도큐먼트를 만드시겠습니까? 저장하지 않은 내용은 사라집니다.')) {
        this.doc.loadFromData({
          name: '무제-1',
          width: 800,
          height: 600,
          backgroundColor: '#111827',
          layers: []
        });
        if (this.callbacks.onUpdate) this.callbacks.onUpdate();
      }
    });

    this.container.querySelector('#menuSaveJson').addEventListener('click', () => {
      const data = JSON.stringify(this.doc.toJSON(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.doc.name || 'document'}.jspen`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    const fileInput = this.container.querySelector('#menuLoadJsonInput');
    fileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            this.doc.loadFromData(data, true);
            if (this.callbacks.onUpdate) this.callbacks.onUpdate();
          } catch (err) {
            alert('유효하지 않은 프로젝트 파일입니다.');
          }
        };
        reader.readAsText(file);
      }
    });

    // Edit Operations
    this.container.querySelector('#menuUndo').addEventListener('click', () => {
      if (this.doc.undo() && this.callbacks.onUpdate) this.callbacks.onUpdate();
    });
    this.container.querySelector('#menuRedo').addEventListener('click', () => {
      if (this.doc.redo() && this.callbacks.onUpdate) this.callbacks.onUpdate();
    });
    this.container.querySelector('#menuDuplicateLayer').addEventListener('click', () => {
      if (this.doc.selectedLayerId) {
        this.doc.duplicateLayer(this.doc.selectedLayerId);
        if (this.callbacks.onUpdate) this.callbacks.onUpdate();
      }
    });
    this.container.querySelector('#menuDeleteSelected').addEventListener('click', () => {
      if (this.doc.selectedLayerId) {
        this.doc.removeLayer(this.doc.selectedLayerId);
        if (this.callbacks.onUpdate) this.callbacks.onUpdate();
      }
    });

    // View Operations
    this.container.querySelector('#menuToggleRulers').addEventListener('click', () => {
      if (this.callbacks.onToggleRulers) this.callbacks.onToggleRulers();
    });
    this.container.querySelector('#menuFitScreen').addEventListener('click', () => {
      if (this.callbacks.onFitScreen) this.callbacks.onFitScreen();
    });
    this.container.querySelector('#menuResetZoom').addEventListener('click', () => {
      if (this.callbacks.onResetZoom) this.callbacks.onResetZoom();
    });
  }
}
