import { SAMPLE_PROJECTS } from '../templates/sampleProjects.js';

/**
 * Top Toolbar
 * Handles Play/Stop, Undo/Redo, Canvas presets, Sample loader, Project Save/Load, and Export trigger.
 */
export class Toolbar {
  constructor(container, project, callbacks = {}) {
    this.container = container;
    this.project = project;
    this.callbacks = callbacks;
    this.isPlaying = false;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="toolbar-left">
        <div class="brand-logo">
          <span class="brand-icon">⚡</span>
          <span class="brand-text">JSPen</span>
          <span class="brand-tag">Visual Studio</span>
        </div>

        <div class="divider"></div>

        <!-- Sample Projects Dropdown -->
        <select id="selTemplate" class="select-field select-sm" title="샘플 프로젝트 불러오기">
          <option value="">📂 템플릿 프로젝트...</option>
          <option value="bounce_game">🎮 벽돌 바운스 미니게임</option>
          <option value="space_collector">🚀 우주 별 수집가</option>
          <option value="interactive_clicker">✨ 클릭 인터랙티브 토이</option>
        </select>

        <div class="divider"></div>

        <!-- Undo / Redo -->
        <div class="btn-group">
          <button class="icon-btn" id="btnUndo" title="실행 취소 (Ctrl+Z)">↩️</button>
          <button class="icon-btn" id="btnRedo" title="다시 실행 (Ctrl+Y)">↪️</button>
        </div>

        <div class="divider"></div>

        <!-- Canvas Resolution Presets -->
        <select id="selCanvasSize" class="select-field select-sm" title="캔버스 해상도 변경">
          <option value="800x600" ${this.project.width === 800 && this.project.height === 600 ? 'selected' : ''}>800 x 600 (기본)</option>
          <option value="1280x720" ${this.project.width === 1280 && this.project.height === 720 ? 'selected' : ''}>1280 x 720 (HD 16:9)</option>
          <option value="1024x768" ${this.project.width === 1024 && this.project.height === 768 ? 'selected' : ''}>1024 x 768 (4:3)</option>
          <option value="600x400" ${this.project.width === 600 && this.project.height === 400 ? 'selected' : ''}>600 x 400 (미니)</option>
        </select>

        <!-- Grid snap toggle -->
        <button class="icon-btn" id="btnToggleGrid" title="그리드 스냅 켜기/끄기">
          <span id="gridIcon">📐</span>
        </button>
      </div>

      <div class="toolbar-center">
        <!-- Play / Stop Toggle -->
        <button class="btn btn-play" id="btnPlay">
          <span class="play-icon">▶</span>
          <span class="play-text">실행 (Play)</span>
        </button>
      </div>

      <div class="toolbar-right">
        <!-- Project Save / Load JSON -->
        <button class="btn btn-secondary btn-sm" id="btnSaveJson" title="프로젝트를 JSON 파일로 저장">
          💾 프로젝트 저장
        </button>
        <label class="btn btn-secondary btn-sm file-input-label" title="저장된 JSON 프로젝트 불러오기">
          📂 불러오기
          <input type="file" id="loadJsonInput" accept=".json" style="display:none;">
        </label>

        <!-- Primary Export JS Button -->
        <button class="btn btn-accent btn-sm" id="btnExport">
          ⚡ 자바스크립트 출력
        </button>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    // Play / Stop
    const btnPlay = this.container.querySelector('#btnPlay');
    btnPlay.addEventListener('click', () => {
      this.isPlaying = !this.isPlaying;
      if (this.isPlaying) {
        btnPlay.classList.add('playing');
        btnPlay.innerHTML = `<span class="play-icon">⏹</span><span class="play-text">정지 (Stop)</span>`;
        if (this.callbacks.onPlay) this.callbacks.onPlay();
      } else {
        btnPlay.classList.remove('playing');
        btnPlay.innerHTML = `<span class="play-icon">▶</span><span class="play-text">실행 (Play)</span>`;
        if (this.callbacks.onStop) this.callbacks.onStop();
      }
    });

    // Undo / Redo
    this.container.querySelector('#btnUndo').addEventListener('click', () => {
      if (this.project.undo() && this.callbacks.onStateChanged) {
        this.callbacks.onStateChanged();
      }
    });

    this.container.querySelector('#btnRedo').addEventListener('click', () => {
      if (this.project.redo() && this.callbacks.onStateChanged) {
        this.callbacks.onStateChanged();
      }
    });

    // Resolution Presets
    const selCanvasSize = this.container.querySelector('#selCanvasSize');
    selCanvasSize.addEventListener('change', () => {
      const [w, h] = selCanvasSize.value.split('x').map(Number);
      this.project.width = w;
      this.project.height = h;
      this.project.saveState();
      if (this.callbacks.onStateChanged) this.callbacks.onStateChanged();
    });

    // Grid toggle
    const btnGrid = this.container.querySelector('#btnToggleGrid');
    btnGrid.addEventListener('click', () => {
      if (this.callbacks.onToggleGrid) {
        const active = this.callbacks.onToggleGrid();
        btnGrid.classList.toggle('active', active);
      }
    });

    // Template Selector
    const selTemplate = this.container.querySelector('#selTemplate');
    selTemplate.addEventListener('change', () => {
      const key = selTemplate.value;
      if (key && SAMPLE_PROJECTS[key]) {
        if (confirm('현재 작업 내용을 덮어쓰고 템플릿 프로젝트를 불러오시겠습니까?')) {
          this.project.loadFromData(SAMPLE_PROJECTS[key], true);
          if (this.callbacks.onStateChanged) this.callbacks.onStateChanged();
        }
      }
      selTemplate.value = '';
    });

    // Export button
    this.container.querySelector('#btnExport').addEventListener('click', () => {
      if (this.callbacks.onExport) this.callbacks.onExport();
    });

    // Save JSON
    this.container.querySelector('#btnSaveJson').addEventListener('click', () => {
      const data = JSON.stringify(this.project.toJSON(), null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${this.project.name || 'project'}.jspen.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    });

    // Load JSON
    const loadInput = this.container.querySelector('#loadJsonInput');
    loadInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = ev => {
          try {
            const data = JSON.parse(ev.target.result);
            this.project.loadFromData(data, true);
            if (this.callbacks.onStateChanged) this.callbacks.onStateChanged();
          } catch (err) {
            alert('유효하지 않은 프로젝트 JSON 파일입니다.');
          }
        };
        reader.readAsText(file);
      }
    });

    // Global keyboard shortcuts
    window.addEventListener('keydown', e => {
      // Undo
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          if (this.project.undo() && this.callbacks.onStateChanged) {
            this.callbacks.onStateChanged();
          }
        }
      }
      // Redo
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey))) {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          e.preventDefault();
          if (this.project.redo() && this.callbacks.onStateChanged) {
            this.callbacks.onStateChanged();
          }
        }
      }
      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
          if (this.project.selectedSpriteId) {
            e.preventDefault();
            this.project.removeSprite(this.project.selectedSpriteId);
            if (this.callbacks.onStateChanged) this.callbacks.onStateChanged();
          }
        }
      }
    });
  }

  setPlaying(playing) {
    this.isPlaying = playing;
    const btnPlay = this.container.querySelector('#btnPlay');
    if (btnPlay) {
      if (playing) {
        btnPlay.classList.add('playing');
        btnPlay.innerHTML = `<span class="play-icon">⏹</span><span class="play-text">정지 (Stop)</span>`;
      } else {
        btnPlay.classList.remove('playing');
        btnPlay.innerHTML = `<span class="play-icon">▶</span><span class="play-text">실행 (Play)</span>`;
      }
    }
  }
}
