/**
 * Photoshop Tool Option Bar
 * Displays context-specific settings for the active tool (Shapes, Pen, Brush, Bevel, Stroke).
 */
export class ToolOptionBar {
  constructor(container, drawingTools, documentModel, onUpdate) {
    this.container = container;
    this.tools = drawingTools;
    this.doc = documentModel;
    this.onUpdate = onUpdate;

    this.render();
  }

  render() {
    const tool = this.tools.activeTool;
    const selected = this.doc.getSelectedLayer();

    this.container.innerHTML = `
      <div class="opt-bar-inner">
        <!-- Current Tool Icon & Name -->
        <div class="opt-tool-badge">
          <span class="opt-tool-icon">${this.getToolIcon(tool)}</span>
          <span class="opt-tool-name">${this.getToolName(tool)}</span>
        </div>

        <div class="opt-divider"></div>

        <!-- Tool Context Controls -->
        ${this.renderContextControls(tool, selected)}

        <div class="opt-spacer"></div>

        <!-- Artboard Info -->
        <div class="opt-artboard-info">
          아트보드: <span>${this.doc.width} × ${this.doc.height} px</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  getToolIcon(tool) {
    switch (tool) {
      case 'move': return '↖';
      case 'direct': return '☩';
      case 'pen': return '✒️';
      case 'brush': return '🖌️';
      case 'gradient': return '🌈';
      case 'shape': return '⬛';
      case 'text': return '🔤';
      case 'eyedropper': return '💉';
      case 'hand': return '✋';
      case 'zoom': return '🔍';
      default: return '⚡';
    }
  }

  getToolName(tool) {
    switch (tool) {
      case 'move': return '이동 도구 (V)';
      case 'direct': return '직접 선택 도구 (A)';
      case 'pen': return '펜 도구 - 3차 베지어 (P)';
      case 'brush': return '브러시 도구 (B)';
      case 'gradient': return '그라디언트 도구 (G)';
      case 'shape': return '도형 도구 (U)';
      case 'text': return '문자 도구 (T)';
      case 'eyedropper': return '스포이드 (I)';
      case 'hand': return '손 도구 (Space)';
      case 'zoom': return '돋보기 도구 (Z)';
      default: return tool;
    }
  }

  renderContextControls(tool, selected) {
    if (tool === 'shape') {
      return `
        <div class="opt-group">
          <span class="opt-label">도형 유형:</span>
          <select id="selShapeType" class="opt-select">
            <option value="rect" ${this.tools.activeShapeType === 'rect' ? 'selected' : ''}>직사각형</option>
            <option value="bevel_rect" ${this.tools.activeShapeType === 'bevel_rect' ? 'selected' : ''}>베벨 모따기 사각형</option>
            <option value="circle" ${this.tools.activeShapeType === 'circle' ? 'selected' : ''}>원 / 타원</option>
          </select>
        </div>
        ${this.tools.activeShapeType === 'bevel_rect' ? `
          <div class="opt-group">
            <span class="opt-label">베벨 깊이:</span>
            <input type="number" id="inpShapeBevel" class="opt-number" value="${this.tools.shapeBevel}" min="1" max="60"> px
          </div>
        ` : ''}
      `;
    }

    if (tool === 'pen') {
      return `
        <div class="opt-group">
          <span class="opt-desc">💡 캔버스를 클릭하여 베지어 앵커를 추가하고, 드래그하여 핸들을 당기세요. 시작점을 클릭하면 패스가 완성됩니다.</span>
          <button class="btn btn-secondary btn-sm" id="btnFinishPenPath">완료 & 레이어 생성</button>
        </div>
      `;
    }

    if (tool === 'gradient') {
      return `
        <div class="opt-group">
          <span class="opt-desc">💡 캔버스 위를 마우스로 드래그하면 선택된 레이어에 전경색 ➔ 배경색 그라디언트가 적용됩니다.</span>
        </div>
      `;
    }

    if (selected) {
      return `
        <div class="opt-group">
          <span class="opt-label">선택 레이어:</span>
          <strong class="opt-layer-name">${selected.name}</strong>
        </div>
        <div class="opt-group">
          <span class="opt-label">불투명도:</span>
          <input type="number" id="inpQuickOpacity" class="opt-number" value="${Math.round(selected.opacity * 100)}" min="0" max="100"> %
        </div>
      `;
    }

    return `<span class="opt-desc">레이어를 선택하거나 도구를 사용해 자유롭게 디자인하세요.</span>`;
  }

  bindEvents() {
    const selShapeType = this.container.querySelector('#selShapeType');
    if (selShapeType) {
      selShapeType.addEventListener('change', () => {
        this.tools.activeShapeType = selShapeType.value;
        this.render();
      });
    }

    const inpBevel = this.container.querySelector('#inpShapeBevel');
    if (inpBevel) {
      inpBevel.addEventListener('change', () => {
        this.tools.shapeBevel = Math.max(1, Number(inpBevel.value) || 12);
      });
    }

    const btnFinishPen = this.container.querySelector('#btnFinishPenPath');
    if (btnFinishPen) {
      btnFinishPen.addEventListener('click', () => {
        this.tools.commitPenPath(true);
      });
    }

    const inpOpacity = this.container.querySelector('#inpQuickOpacity');
    if (inpOpacity) {
      inpOpacity.addEventListener('change', () => {
        const selected = this.doc.getSelectedLayer();
        if (selected) {
          selected.opacity = Math.max(0, Math.min(1, (Number(inpOpacity.value) || 100) / 100));
          this.doc.saveState();
          this.onUpdate();
        }
      });
    }
  }

  refresh() {
    this.render();
  }
}
