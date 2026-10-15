/**
 * Photoshop Toolbox (Left Sidebar)
 * Move (V), Direct (A), Pen (P), Brush (B), Gradient (G), Shapes (U), Eyedropper (I), Text (T), Hand (H), Zoom (Z)
 * Includes Foreground / Background Color Swatches with Swap (X) and Reset (D).
 */
export class Toolbox {
  constructor(container, drawingTools, documentModel, onUpdate) {
    this.container = container;
    this.tools = drawingTools;
    this.doc = documentModel;
    this.onUpdate = onUpdate;

    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="ps-tools">
        <!-- Move Tool (V) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'move' ? 'active' : ''}" data-tool="move" title="이동 도구 (V)">
          <span class="ps-tool-icon">↖</span>
        </button>

        <!-- Direct Selection (A) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'direct' ? 'active' : ''}" data-tool="direct" title="직접 선택 도구 (A)">
          <span class="ps-tool-icon">☩</span>
        </button>

        <div class="ps-tool-sep"></div>

        <!-- Pen Tool (P) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'pen' ? 'active' : ''}" data-tool="pen" title="펜 도구 - 3차 베지어 곡선 (P)">
          <span class="ps-tool-icon">✒️</span>
        </button>

        <!-- Brush Tool (B) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'brush' ? 'active' : ''}" data-tool="brush" title="브러시 도구 (B)">
          <span class="ps-tool-icon">🖌️</span>
        </button>

        <!-- Gradient Tool (G) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'gradient' ? 'active' : ''}" data-tool="gradient" title="그라디언트 도구 (G)">
          <span class="ps-tool-icon">🌈</span>
        </button>

        <div class="ps-tool-sep"></div>

        <!-- Shape Tools (U) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'shape' ? 'active' : ''}" data-tool="shape" title="도형 도구 - 사각형, 베벨, 원 (U)">
          <span class="ps-tool-icon">⬛</span>
        </button>

        <!-- Type Tool (T) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'text' ? 'active' : ''}" data-tool="text" title="문자 텍스트 도구 (T)">
          <span class="ps-tool-icon">🔤</span>
        </button>

        <!-- Eyedropper Tool (I) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'eyedropper' ? 'active' : ''}" data-tool="eyedropper" title="스포이드 색상 추출 (I)">
          <span class="ps-tool-icon">💉</span>
        </button>

        <div class="ps-tool-sep"></div>

        <!-- Hand Tool (H / Space) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'hand' ? 'active' : ''}" data-tool="hand" title="손 도구 - 화면 이동 (H / Space)">
          <span class="ps-tool-icon">✋</span>
        </button>

        <!-- Zoom Tool (Z) -->
        <button class="ps-tool-btn ${this.tools.activeTool === 'zoom' ? 'active' : ''}" data-tool="zoom" title="돋보기 도구 - 확대/축소 (Z)">
          <span class="ps-tool-icon">🔍</span>
        </button>
      </div>

      <!-- Photoshop Color Swatches (Foreground / Background) -->
      <div class="ps-color-swatches">
        <button class="ps-color-reset" id="btnResetColors" title="기본 색상 리셋 (D)">◲</button>
        <button class="ps-color-swap" id="btnSwapColors" title="전경색/배경색 교체 (X)">⇄</button>
        <div class="ps-swatch-box">
          <input type="color" id="fgColorInput" class="ps-swatch ps-swatch-fg" value="${this.doc.foregroundColor}" title="전경색 (Foreground Color)">
          <input type="color" id="bgColorInput" class="ps-swatch ps-swatch-bg" value="${this.doc.backgroundColorSecondary}" title="배경색 (Background Color)">
        </div>
      </div>
    `;

    this.bindEvents();
  }

  bindEvents() {
    this.container.querySelectorAll('[data-tool]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.tools.setTool(btn.dataset.tool);
        this.render();
      });
    });

    const fgInput = this.container.querySelector('#fgColorInput');
    const bgInput = this.container.querySelector('#bgColorInput');

    fgInput.addEventListener('input', () => {
      this.doc.foregroundColor = fgInput.value;
      const selected = this.doc.getSelectedLayer();
      if (selected) {
        selected.fill = fgInput.value;
        this.onUpdate();
      }
    });

    bgInput.addEventListener('input', () => {
      this.doc.backgroundColorSecondary = bgInput.value;
    });

    this.container.querySelector('#btnSwapColors').addEventListener('click', () => {
      this.doc.swapColors();
      this.render();
      this.onUpdate();
    });

    this.container.querySelector('#btnResetColors').addEventListener('click', () => {
      this.doc.resetColors();
      this.render();
      this.onUpdate();
    });
  }

  refresh() {
    this.render();
  }
}
