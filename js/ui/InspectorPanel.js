import { MODULE_REGISTRY } from '../modules/ModuleRegistry.js';

/**
 * InspectorPanel (Right Sidebar)
 * 2-Tier Architecture:
 * Tier 1 (Top): Sprite Visual Editing Properties (Bevel, Corner Radius, Opacity, Blend Mode, Transform, Fill/Stroke)
 * Tier 2 (Bottom): Attached Feature Module Cards with full detailed parameter controls.
 */
export class InspectorPanel {
  constructor(container, documentModel, onUpdate) {
    this.container = container;
    this.doc = documentModel;
    this.onUpdate = onUpdate;

    this.render();
  }

  render() {
    const layer = this.doc.getSelectedLayer();

    if (!layer) {
      this.renderArtboardSettings();
      return;
    }

    this.container.innerHTML = `
      <div class="ps-insp-header">
        <span class="ps-insp-badge">${layer.type.toUpperCase()}</span>
        <input type="text" id="inpLayerName" class="ps-insp-name-input" value="${layer.name}">
      </div>

      <div class="ps-insp-scroll-area">
        <!-- TIER 1: Visual Editing Properties -->
        <div class="ps-prop-section">
          <div class="ps-section-title">📐 변형 (Transform)</div>
          
          <div class="ps-row-dual">
            <div class="ps-field-col">
              <span class="ps-field-label">X 위치</span>
              <input type="number" id="inpX" class="ps-input" value="${Math.round(layer.x)}">
            </div>
            <div class="ps-field-col">
              <span class="ps-field-label">Y 위치</span>
              <input type="number" id="inpY" class="ps-input" value="${Math.round(layer.y)}">
            </div>
          </div>

          <div class="ps-row-dual">
            <div class="ps-field-col">
              <span class="ps-field-label">너비 (W)</span>
              <input type="number" id="inpW" class="ps-input" value="${Math.round(layer.width)}" min="5">
            </div>
            <div class="ps-field-col">
              <span class="ps-field-label">높이 (H)</span>
              <input type="number" id="inpH" class="ps-input" value="${Math.round(layer.height)}" min="5">
            </div>
          </div>

          <div class="ps-row-dual">
            <div class="ps-field-col">
              <span class="ps-field-label">회전 각도 (°)</span>
              <input type="number" id="inpRot" class="ps-input" value="${Math.round(layer.rotation)}">
            </div>
            <div class="ps-field-col">
              <span class="ps-field-label">종횡비 고정</span>
              <button class="ps-btn-toggle ${layer.lockAspectRatio ? 'active' : ''}" id="btnLockAspect">
                ${layer.lockAspectRatio ? '🔒 고정됨' : '🔓 자유'}
              </button>
            </div>
          </div>
        </div>

        <!-- TIER 1: Bevel, Chamfer & Corner Radius -->
        <div class="ps-prop-section">
          <div class="ps-section-title">✨ 모서리 베벨 & 라운딩 (Bevel & Corners)</div>

          <div class="ps-prop-row">
            <span class="ps-field-label">모서리 베벨 (Chamfer)</span>
            <input type="range" id="rngBevel" class="ps-slider" min="0" max="50" value="${layer.bevel || 0}">
            <span class="ps-val-tag" id="valBevel">${layer.bevel || 0}px</span>
          </div>

          <div class="ps-prop-row">
            <span class="ps-field-label">코너 라운딩 (Radius)</span>
            <input type="range" id="rngCorner" class="ps-slider" min="0" max="60" value="${layer.cornerRadius || 0}">
            <span class="ps-val-tag" id="valCorner">${layer.cornerRadius || 0}px</span>
          </div>
        </div>

        <!-- TIER 1: Opacity, Blend & Styling -->
        <div class="ps-prop-section">
          <div class="ps-section-title">🎨 외형 및 포토샵 블렌딩</div>

          <div class="ps-prop-row">
            <span class="ps-field-label">불투명도 (Opacity)</span>
            <input type="range" id="rngOpacity" class="ps-slider" min="0" max="100" value="${Math.round(layer.opacity * 100)}">
            <span class="ps-val-tag" id="valOpacity">${Math.round(layer.opacity * 100)}%</span>
          </div>

          <div class="ps-prop-row">
            <span class="ps-field-label">블렌드 모드</span>
            <select id="selInspBlend" class="ps-select">
              <option value="source-over" ${layer.blendMode === 'source-over' ? 'selected' : ''}>표준 (Normal)</option>
              <option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>곱하기 (Multiply)</option>
              <option value="screen" ${layer.blendMode === 'screen' ? 'selected' : ''}>스크린 (Screen)</option>
              <option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>오버레이 (Overlay)</option>
              <option value="soft-light" ${layer.blendMode === 'soft-light' ? 'selected' : ''}>소프트 라이트</option>
              <option value="difference" ${layer.blendMode === 'difference' ? 'selected' : ''}>차이 (Difference)</option>
            </select>
          </div>

          <div class="ps-prop-row">
            <span class="ps-field-label">채우기 유형</span>
            <select id="selFillType" class="ps-select">
              <option value="solid" ${layer.fillType === 'solid' ? 'selected' : ''}>단색 컬러 (Solid)</option>
              <option value="linear-gradient" ${layer.fillType === 'linear-gradient' ? 'selected' : ''}>선형 그라디언트</option>
              <option value="none" ${layer.fillType === 'none' ? 'selected' : ''}>채우기 없음</option>
            </select>
          </div>

          ${layer.fillType === 'solid' ? `
            <div class="ps-prop-row">
              <span class="ps-field-label">채우기 색상</span>
              <div class="ps-color-picker-wrap">
                <input type="color" id="inpFillColor" value="${layer.fill || '#38bdf8'}">
                <input type="text" id="inpFillColorText" class="ps-input ps-input-hex" value="${layer.fill || '#38bdf8'}">
              </div>
            </div>
          ` : ''}

          <div class="ps-prop-row">
            <span class="ps-field-label">테두리 (Stroke)</span>
            <input type="number" id="inpStrokeW" class="ps-input" style="width: 60px;" value="${layer.strokeWidth || 0}" min="0" max="30"> px
            <input type="color" id="inpStrokeColor" value="${layer.stroke || '#0284c7'}">
          </div>
        </div>

        <!-- TIER 2: Attached Modules Detail Settings -->
        <div class="ps-prop-section ps-module-stack-section">
          <div class="ps-section-title" style="display: flex; justify-content: space-between; align-items: center;">
            <span>🧩 장착된 기능 모듈 (${(layer.modules || []).length}개)</span>
          </div>

          <div class="ps-attached-modules-list">
            ${(layer.modules || []).length === 0 ? `
              <div class="ps-no-modules-msg">
                장착된 기능이 없습니다.<br>
                레이어 패널의 <strong>[+]</strong> 버튼을 눌러 모듈을 추가하세요!
              </div>
            ` : layer.modules.map((m, idx) => this.renderModuleCard(m, idx, layer)).join('')}
          </div>
        </div>
      </div>
    `;

    this.bindEvents(layer);
  }

  renderArtboardSettings() {
    this.container.innerHTML = `
      <div class="ps-insp-header">
        <span class="ps-insp-badge">ARTBOARD</span>
        <span class="ps-section-title" style="margin:0;">아트보드 전역 설정</span>
      </div>
      <div class="ps-insp-scroll-area">
        <div class="ps-prop-section">
          <div class="ps-section-title">캔버스 해상도</div>
          <div class="ps-row-dual">
            <div class="ps-field-col">
              <span class="ps-field-label">너비 (Width)</span>
              <input type="number" id="artboardW" class="ps-input" value="${this.doc.width}">
            </div>
            <div class="ps-field-col">
              <span class="ps-field-label">높이 (Height)</span>
              <input type="number" id="artboardH" class="ps-input" value="${this.doc.height}">
            </div>
          </div>

          <div class="ps-prop-row" style="margin-top: 10px;">
            <span class="ps-field-label">배경 색상</span>
            <input type="color" id="artboardBg" value="${this.doc.backgroundColor}">
          </div>

          <div class="ps-prop-row">
            <span class="ps-field-label">투명 배경 체커보드</span>
            <input type="checkbox" id="chkTransparentBg" ${this.doc.transparentBackground ? 'checked' : ''}>
          </div>
        </div>
      </div>
    `;

    this.container.querySelector('#artboardW')?.addEventListener('change', e => {
      this.doc.width = Math.max(100, Number(e.target.value) || 800);
      this.doc.saveState();
      this.onUpdate();
    });

    this.container.querySelector('#artboardH')?.addEventListener('change', e => {
      this.doc.height = Math.max(100, Number(e.target.value) || 600);
      this.doc.saveState();
      this.onUpdate();
    });

    this.container.querySelector('#artboardBg')?.addEventListener('input', e => {
      this.doc.backgroundColor = e.target.value;
      this.doc.saveState();
      this.onUpdate();
    });

    this.container.querySelector('#chkTransparentBg')?.addEventListener('change', e => {
      this.doc.transparentBackground = e.target.checked;
      this.doc.saveState();
      this.onUpdate();
    });
  }

  renderModuleCard(mod, idx, currentLayer) {
    const reg = MODULE_REGISTRY[mod.type] || {};
    const otherLayers = this.doc.layers.filter(l => l.id !== currentLayer.id);

    return `
      <div class="ps-mod-card" data-idx="${idx}">
        <div class="ps-mod-card-header">
          <div class="ps-mod-title-group">
            <input type="checkbox" class="ps-mod-enable-cb" data-idx="${idx}" ${mod.enabled ? 'checked' : ''}>
            <span class="ps-mod-icon">${reg.icon || '⚡'}</span>
            <span class="ps-mod-name">${reg.name || mod.type}</span>
          </div>
          <button class="ps-mod-del-btn" data-idx="${idx}" title="모듈 제거">🗑️</button>
        </div>

        <div class="ps-mod-params-body">
          ${this.renderModuleParamFields(mod, idx, otherLayers)}
        </div>
      </div>
    `;
  }

  renderModuleParamFields(mod, idx, otherLayers) {
    const p = mod.params || {};

    switch (mod.type) {
      case 'follow_target':
        return `
          <div class="ps-prop-row">
            <span class="ps-field-label">추적할 대상:</span>
            <select class="ps-select mod-param" data-idx="${idx}" data-param="targetLayerId">
              <option value="">(대상 선택...)</option>
              ${otherLayers.map(l => `<option value="${l.id}" ${p.targetLayerId === l.id ? 'selected' : ''}>${l.name}</option>`).join('')}
            </select>
          </div>
          <div class="ps-prop-row">
            <span class="ps-field-label">추종 방식:</span>
            <select class="ps-select mod-param" data-idx="${idx}" data-param="type">
              <option value="spring" ${p.type === 'spring' ? 'selected' : ''}>탄성 스프링 (Spring)</option>
              <option value="rigid" ${p.type === 'rigid' ? 'selected' : ''}>강체 고정 (Rigid)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <span class="ps-field-label">스프링 장력:</span>
            <input type="number" class="ps-input mod-param" data-idx="${idx}" data-param="stiffness" value="${p.stiffness || 0.08}" step="0.01" min="0.01" max="0.5">
          </div>
        `;

      case 'value_remapper':
        return `
          <div class="ps-prop-row">
            <span class="ps-field-label">입력 소스:</span>
            <select class="ps-select mod-param" data-idx="${idx}" data-param="inputSource">
              <option value="mouse_x" ${p.inputSource === 'mouse_x' ? 'selected' : ''}>마우스 X 좌표</option>
              <option value="mouse_y" ${p.inputSource === 'mouse_y' ? 'selected' : ''}>마우스 Y 좌표</option>
              <option value="scroll" ${p.inputSource === 'scroll' ? 'selected' : ''}>스크롤 진행률 (0~1)</option>
              <option value="time" ${p.inputSource === 'time' ? 'selected' : ''}>경과 시간 (초)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <span class="ps-field-label">출력 속성:</span>
            <select class="ps-select mod-param" data-idx="${idx}" data-param="outputProperty">
              <option value="rotation" ${p.outputProperty === 'rotation' ? 'selected' : ''}>회전 각도 (°)</option>
              <option value="x" ${p.outputProperty === 'x' ? 'selected' : ''}>X 좌표</option>
              <option value="y" ${p.outputProperty === 'y' ? 'selected' : ''}>Y 좌표</option>
              <option value="opacity" ${p.outputProperty === 'opacity' ? 'selected' : ''}>불투명도 (0~1)</option>
              <option value="scaleX" ${p.outputProperty === 'scaleX' ? 'selected' : ''}>스케일 (배율)</option>
            </select>
          </div>
          <div class="ps-row-dual">
            <div class="ps-field-col">
              <span class="ps-field-label">최소 출력값</span>
              <input type="number" class="ps-input mod-param" data-idx="${idx}" data-param="outMin" value="${p.outMin !== undefined ? p.outMin : -30}">
            </div>
            <div class="ps-field-col">
              <span class="ps-field-label">최대 출력값</span>
              <input type="number" class="ps-input mod-param" data-idx="${idx}" data-param="outMax" value="${p.outMax !== undefined ? p.outMax : 30}">
            </div>
          </div>
        `;

      case 'parallax_3d_tilt':
        return `
          <div class="ps-prop-row">
            <span class="ps-field-label">최대 틸트 각도:</span>
            <input type="number" class="ps-input mod-param" data-idx="${idx}" data-param="maxAngle" value="${p.maxAngle || 25}" min="5" max="60"> °
          </div>
        `;

      case 'particle_emitter':
        return `
          <div class="ps-prop-row">
            <span class="ps-field-label">파티클 색상:</span>
            <input type="color" class="mod-param" data-idx="${idx}" data-param="color" value="${p.color || '#fbbf24'}">
          </div>
          <div class="ps-prop-row">
            <span class="ps-field-label">분출 트리거:</span>
            <select class="ps-select mod-param" data-idx="${idx}" data-param="trigger">
              <option value="move" ${p.trigger === 'move' ? 'selected' : ''}>마우스 움직일 때</option>
              <option value="click" ${p.trigger === 'click' ? 'selected' : ''}>클릭할 때</option>
              <option value="continuous" ${p.trigger === 'continuous' ? 'selected' : ''}>항상 분출</option>
            </select>
          </div>
        `;

      case 'floating_wave':
        return `
          <div class="ps-prop-row">
            <span class="ps-field-label">상하 진폭 (px):</span>
            <input type="number" class="ps-input mod-param" data-idx="${idx}" data-param="amplitudeY" value="${p.amplitudeY !== undefined ? p.amplitudeY : 15}">
          </div>
          <div class="ps-prop-row">
            <span class="ps-field-label">부유 속도:</span>
            <input type="number" class="ps-input mod-param" data-idx="${idx}" data-param="frequency" value="${p.frequency || 1.5}" step="0.2">
          </div>
        `;

      case 'synth_sfx':
        return `
          <div class="ps-prop-row">
            <span class="ps-field-label">소리 종류:</span>
            <select class="ps-select mod-param" data-idx="${idx}" data-param="sound">
              <option value="pop" ${p.sound === 'pop' ? 'selected' : ''}>톡! (Pop)</option>
              <option value="coin" ${p.sound === 'coin' ? 'selected' : ''}>코인 (Coin)</option>
              <option value="jump" ${p.sound === 'jump' ? 'selected' : ''}>점프 (Jump)</option>
            </select>
          </div>
        `;

      default:
        return `<span class="ps-empty-param-msg">설정 가능한 파라미터가 자동으로 관리됩니다.</span>`;
    }
  }

  bindEvents(layer) {
    const bindNumeric = (id, prop) => {
      const el = this.container.querySelector('#' + id);
      if (el) {
        el.addEventListener('change', () => {
          layer[prop] = Number(el.value) || 0;
          this.doc.saveState();
          this.onUpdate();
        });
      }
    };

    bindNumeric('inpX', 'x');
    bindNumeric('inpY', 'y');
    bindNumeric('inpW', 'width');
    bindNumeric('inpH', 'height');
    bindNumeric('inpRot', 'rotation');

    // Layer Name
    const nameEl = this.container.querySelector('#inpLayerName');
    if (nameEl) {
      nameEl.addEventListener('input', () => {
        layer.name = nameEl.value;
        this.onUpdate();
      });
    }

    // Aspect ratio lock toggle
    const btnLock = this.container.querySelector('#btnLockAspect');
    if (btnLock) {
      btnLock.addEventListener('click', () => {
        layer.lockAspectRatio = !layer.lockAspectRatio;
        this.doc.saveState();
        this.render();
      });
    }

    // Bevel Slider
    const rngBevel = this.container.querySelector('#rngBevel');
    const valBevel = this.container.querySelector('#valBevel');
    if (rngBevel) {
      rngBevel.addEventListener('input', () => {
        const v = Number(rngBevel.value);
        valBevel.textContent = v + 'px';
        layer.bevel = v;
        this.onUpdate();
      });
      rngBevel.addEventListener('change', () => this.doc.saveState());
    }

    // Corner Radius Slider
    const rngCorner = this.container.querySelector('#rngCorner');
    const valCorner = this.container.querySelector('#valCorner');
    if (rngCorner) {
      rngCorner.addEventListener('input', () => {
        const v = Number(rngCorner.value);
        valCorner.textContent = v + 'px';
        layer.cornerRadius = v;
        this.onUpdate();
      });
      rngCorner.addEventListener('change', () => this.doc.saveState());
    }

    // Opacity Slider
    const rngOpacity = this.container.querySelector('#rngOpacity');
    const valOpacity = this.container.querySelector('#valOpacity');
    if (rngOpacity) {
      rngOpacity.addEventListener('input', () => {
        const v = Number(rngOpacity.value);
        valOpacity.textContent = v + '%';
        layer.opacity = v / 100;
        this.onUpdate();
      });
      rngOpacity.addEventListener('change', () => this.doc.saveState());
    }

    // Blend Mode
    const selBlend = this.container.querySelector('#selInspBlend');
    if (selBlend) {
      selBlend.addEventListener('change', () => {
        layer.blendMode = selBlend.value;
        this.doc.saveState();
        this.onUpdate();
      });
    }

    // Fill Type & Color
    const selFillType = this.container.querySelector('#selFillType');
    if (selFillType) {
      selFillType.addEventListener('change', () => {
        layer.fillType = selFillType.value;
        this.doc.saveState();
        this.render();
        this.onUpdate();
      });
    }

    const inpFillColor = this.container.querySelector('#inpFillColor');
    const inpFillColorText = this.container.querySelector('#inpFillColorText');
    if (inpFillColor && inpFillColorText) {
      inpFillColor.addEventListener('input', () => {
        inpFillColorText.value = inpFillColor.value;
        layer.fill = inpFillColor.value;
        this.onUpdate();
      });
      inpFillColorText.addEventListener('change', () => {
        inpFillColor.value = inpFillColorText.value;
        layer.fill = inpFillColorText.value;
        this.doc.saveState();
        this.onUpdate();
      });
    }

    // Stroke
    const inpStrokeW = this.container.querySelector('#inpStrokeW');
    const inpStrokeColor = this.container.querySelector('#inpStrokeColor');
    if (inpStrokeW) {
      inpStrokeW.addEventListener('change', () => {
        layer.strokeWidth = Math.max(0, Number(inpStrokeW.value) || 0);
        this.doc.saveState();
        this.onUpdate();
      });
    }
    if (inpStrokeColor) {
      inpStrokeColor.addEventListener('input', () => {
        layer.stroke = inpStrokeColor.value;
        this.doc.saveState();
        this.onUpdate();
      });
    }

    // Module Card Events (Enable, Delete, Params)
    this.container.querySelectorAll('.ps-mod-enable-cb').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.idx);
        layer.modules[idx].enabled = cb.checked;
        this.doc.saveState();
      });
    });

    this.container.querySelectorAll('.ps-mod-del-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        layer.modules.splice(idx, 1);
        this.doc.saveState();
        this.render();
        this.onUpdate();
      });
    });

    this.container.querySelectorAll('.mod-param').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        const param = inp.dataset.param;
        const val = inp.type === 'number' ? Number(inp.value) : inp.value;
        layer.modules[idx].params[param] = val;
        this.doc.saveState();
      });
    });
  }

  updateInputsFromTransform(layer) {
    const xEl = this.container.querySelector('#inpX');
    const yEl = this.container.querySelector('#inpY');
    const wEl = this.container.querySelector('#inpW');
    const hEl = this.container.querySelector('#inpH');
    const rotEl = this.container.querySelector('#inpRot');

    if (xEl) xEl.value = Math.round(layer.x);
    if (yEl) yEl.value = Math.round(layer.y);
    if (wEl) wEl.value = Math.round(layer.width);
    if (hEl) hEl.value = Math.round(layer.height);
    if (rotEl) rotEl.value = Math.round(layer.rotation);
  }
}
