import { Layer } from '../models/Layer.js';
import { MODULE_REGISTRY } from '../modules/ModuleRegistry.js';

/**
 * Photoshop-style Layers Panel
 * Blending modes, opacity, layer visibility/lock, layer reordering,
 * and the [+] Button for attaching 28 no-code modules.
 */
export class LayersPanel {
  constructor(container, documentModel, onSelectLayer, onUpdate) {
    this.container = container;
    this.doc = documentModel;
    this.onSelectLayer = onSelectLayer;
    this.onUpdate = onUpdate;

    this.activeAddModuleLayerId = null; // Layer ID currently showing [+] popup
    this.render();
  }

  render() {
    const selected = this.doc.getSelectedLayer();

    this.container.innerHTML = `
      <div class="ps-panel-header">
        <span class="ps-panel-title">레이어 (Layers)</span>
        <span class="ps-layer-count">${this.doc.layers.length}개</span>
      </div>

      <!-- Top Blend Mode & Opacity -->
      <div class="ps-layer-top-controls">
        <div class="ps-blend-row">
          <select id="selBlendMode" class="ps-select ps-select-blend" ${!selected ? 'disabled' : ''}>
            <option value="source-over" ${selected?.blendMode === 'source-over' ? 'selected' : ''}>표준 (Normal)</option>
            <option value="multiply" ${selected?.blendMode === 'multiply' ? 'selected' : ''}>곱하기 (Multiply)</option>
            <option value="screen" ${selected?.blendMode === 'screen' ? 'selected' : ''}>스크린 (Screen)</option>
            <option value="overlay" ${selected?.blendMode === 'overlay' ? 'selected' : ''}>오버레이 (Overlay)</option>
            <option value="soft-light" ${selected?.blendMode === 'soft-light' ? 'selected' : ''}>소프트 라이트 (Soft Light)</option>
            <option value="hard-light" ${selected?.blendMode === 'hard-light' ? 'selected' : ''}>하드 라이트 (Hard Light)</option>
            <option value="color-dodge" ${selected?.blendMode === 'color-dodge' ? 'selected' : ''}>색상 닷지 (Color Dodge)</option>
            <option value="difference" ${selected?.blendMode === 'difference' ? 'selected' : ''}>차이 (Difference)</option>
          </select>

          <div class="ps-opacity-box">
            <span>불투명도:</span>
            <input type="number" id="inpLayerOpacity" class="ps-num-input" value="${selected ? Math.round(selected.opacity * 100) : 100}" min="0" max="100" ${!selected ? 'disabled' : ''}>
            <span>%</span>
          </div>
        </div>
      </div>

      <!-- Layer Stack List (Top to Bottom) -->
      <div class="ps-layer-list" id="layerStackList">
        ${this.renderLayerItems()}
      </div>

      <!-- Bottom Actions Toolbar -->
      <div class="ps-layer-bottom-bar">
        <button class="ps-layer-action-btn" id="btnAddEmptyLayer" title="새 사각형 레이어 생성">➕</button>
        <button class="ps-layer-action-btn" id="btnDupLayer" title="선택 레이어 복제 (Ctrl+J)">📑</button>
        <button class="ps-layer-action-btn" id="btnLayerUp" title="레이어 한 단계 위로 (Ctrl+])">⬆️</button>
        <button class="ps-layer-action-btn" id="btnLayerDown" title="레이어 한 단계 아래로 (Ctrl+[)">⬇️</button>
        <button class="ps-layer-action-btn ps-btn-danger" id="btnDelLayer" title="선택 레이어 삭제 (Delete)">🗑️</button>
      </div>

      <!-- Add Module Popup Modal if active -->
      ${this.activeAddModuleLayerId ? this.renderAddModuleModal() : ''}
    `;

    this.bindEvents();
  }

  renderLayerItems() {
    if (this.doc.layers.length === 0) {
      return `<div class="ps-empty-layers">레이어가 없습니다.<br>좌측 도구로 도형이나 패스를 그려보세요.</div>`;
    }

    // Photoshop stacks bottom to top, so top layer appears first
    const reversed = [...this.doc.layers].reverse();

    return reversed.map(layer => {
      const isSelected = layer.id === this.doc.selectedLayerId;
      const moduleCount = (layer.modules || []).length;

      return `
        <div class="ps-layer-row ${isSelected ? 'selected' : ''}" data-id="${layer.id}">
          <button class="ps-layer-vis-btn ${layer.visible ? '' : 'muted'}" data-action="toggle-vis" title="가시성 켜기/끄기">
            ${layer.visible ? '👁️' : '🙈'}
          </button>

          <button class="ps-layer-lock-btn ${layer.locked ? 'active' : ''}" data-action="toggle-lock" title="편집 잠금 토글">
            ${layer.locked ? '🔒' : '🔓'}
          </button>

          <span class="ps-layer-type-icon">${this.getTypeIcon(layer.type, layer.bevel)}</span>

          <span class="ps-layer-title" title="${layer.name}">${layer.name}</span>

          <!-- [+] Button for Attaching Modules -->
          <button class="ps-btn-add-module ${moduleCount > 0 ? 'has-modules' : ''}" data-id="${layer.id}" title="기능 모듈 장착 (감지, 링크, 모션, 타이밍)">
            <span class="plus-icon">+</span>
            ${moduleCount > 0 ? `<span class="mod-count">${moduleCount}</span>` : ''}
          </button>
        </div>
      `;
    }).join('');
  }

  getTypeIcon(type, bevel) {
    if (type === 'rect') return bevel > 0 ? '⯃' : '⬛';
    if (type === 'circle') return '⚪';
    if (type === 'path') return '✒️';
    if (type === 'text') return '🔤';
    if (type === 'image') return '🖼️';
    return '📦';
  }

  renderAddModuleModal() {
    const layer = this.doc.getLayer(this.activeAddModuleLayerId);
    if (!layer) return '';

    const categories = [
      { key: 'sensors', name: '📡 감지 및 입력 모듈 (Sensors)', items: [] },
      { key: 'links', name: '🔗 링크 & 관계 모듈 (Links & Logic)', items: [] },
      { key: 'motions', name: '🎬 모션 & 시각 효과 (Motions & FX)', items: [] },
      { key: 'timing', name: '⏱️ 타이밍 & 제어 (Timing & Sequence)', items: [] },
      { key: 'audio', name: '🔊 사운드 & 피드백 (Audio)', items: [] }
    ];

    for (const [key, mod] of Object.entries(MODULE_REGISTRY)) {
      const cat = categories.find(c => c.key === mod.category);
      if (cat) cat.items.push({ type: key, ...mod });
    }

    return `
      <div class="ps-mod-modal-overlay" id="modModalOverlay">
        <div class="ps-mod-modal-card">
          <div class="ps-mod-modal-header">
            <div class="ps-mod-header-title">
              <span class="badge">[+] 기능 모듈 장착</span>
              <strong>${layer.name}</strong> 레이어에 추가할 기능을 선택하세요
            </div>
            <button class="ps-modal-close" id="btnCloseModModal">✕</button>
          </div>

          <div class="ps-mod-modal-body">
            ${categories.map(cat => `
              <div class="ps-mod-category-block">
                <div class="ps-mod-cat-title">${cat.name}</div>
                <div class="ps-mod-grid">
                  ${cat.items.map(item => `
                    <div class="ps-mod-card-btn" data-mod-type="${item.type}">
                      <span class="ps-mod-card-icon">${item.icon}</span>
                      <div class="ps-mod-card-info">
                        <div class="ps-mod-card-name">${item.name}</div>
                        <div class="ps-mod-card-desc">${item.description}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Select Blend Mode
    const selBlend = this.container.querySelector('#selBlendMode');
    if (selBlend) {
      selBlend.addEventListener('change', () => {
        const selected = this.doc.getSelectedLayer();
        if (selected) {
          selected.blendMode = selBlend.value;
          this.doc.saveState();
          this.onUpdate();
        }
      });
    }

    // Layer Opacity Input
    const inpOpacity = this.container.querySelector('#inpLayerOpacity');
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

    // Layer stack row selection
    this.container.querySelectorAll('.ps-layer-row').forEach(row => {
      const id = row.dataset.id;
      row.addEventListener('click', e => {
        if (e.target.closest('button')) return;
        this.doc.selectedLayerId = id;
        this.onSelectLayer(id);
        this.render();
      });

      // Toggle vis
      const visBtn = row.querySelector('[data-action="toggle-vis"]');
      if (visBtn) {
        visBtn.addEventListener('click', e => {
          e.stopPropagation();
          const l = this.doc.getLayer(id);
          if (l) {
            l.visible = !l.visible;
            this.doc.saveState();
            this.onUpdate();
            this.render();
          }
        });
      }

      // Toggle lock
      const lockBtn = row.querySelector('[data-action="toggle-lock"]');
      if (lockBtn) {
        lockBtn.addEventListener('click', e => {
          e.stopPropagation();
          const l = this.doc.getLayer(id);
          if (l) {
            l.locked = !l.locked;
            this.doc.saveState();
            this.onUpdate();
            this.render();
          }
        });
      }

      // [+] Button click: open modal
      const addModBtn = row.querySelector('.ps-btn-add-module');
      if (addModBtn) {
        addModBtn.addEventListener('click', e => {
          e.stopPropagation();
          this.activeAddModuleLayerId = id;
          this.doc.selectedLayerId = id;
          this.onSelectLayer(id);
          this.render();
        });
      }
    });

    // Modal Events
    const overlay = this.container.querySelector('#modModalOverlay');
    if (overlay) {
      overlay.addEventListener('click', e => {
        if (e.target === overlay) {
          this.activeAddModuleLayerId = null;
          this.render();
        }
      });

      this.container.querySelector('#btnCloseModModal').addEventListener('click', () => {
        this.activeAddModuleLayerId = null;
        this.render();
      });

      // Add selected module
      this.container.querySelectorAll('[data-mod-type]').forEach(btn => {
        btn.addEventListener('click', () => {
          const modType = btn.dataset.modType;
          const reg = MODULE_REGISTRY[modType];
          const layer = this.doc.getLayer(this.activeAddModuleLayerId);

          if (reg && layer) {
            layer.modules.push({
              id: 'mod_' + Date.now(),
              type: modType,
              name: reg.name,
              category: reg.category,
              enabled: true,
              params: JSON.parse(JSON.stringify(reg.defaultParams))
            });
            this.doc.saveState();
            this.activeAddModuleLayerId = null;
            this.onUpdate();
            this.render();
          }
        });
      });
    }

    // Bottom Action Buttons
    const btnAdd = this.container.querySelector('#btnAddEmptyLayer');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const l = new Layer({
          name: '새 레이어 ' + (this.doc.layers.length + 1),
          type: 'rect',
          x: this.doc.width / 2,
          y: this.doc.height / 2,
          fill: this.doc.foregroundColor
        });
        this.doc.addLayer(l);
        this.onUpdate();
        this.render();
      });
    }

    const btnDup = this.container.querySelector('#btnDupLayer');
    if (btnDup) {
      btnDup.addEventListener('click', () => {
        if (this.doc.selectedLayerId) {
          this.doc.duplicateLayer(this.doc.selectedLayerId);
          this.onUpdate();
          this.render();
        }
      });
    }

    const btnUp = this.container.querySelector('#btnLayerUp');
    if (btnUp) {
      btnUp.addEventListener('click', () => {
        if (this.doc.selectedLayerId) {
          this.doc.moveLayerOrder(this.doc.selectedLayerId, 'up');
          this.onUpdate();
          this.render();
        }
      });
    }

    const btnDown = this.container.querySelector('#btnLayerDown');
    if (btnDown) {
      btnDown.addEventListener('click', () => {
        if (this.doc.selectedLayerId) {
          this.doc.moveLayerOrder(this.doc.selectedLayerId, 'down');
          this.onUpdate();
          this.render();
        }
      });
    }

    const btnDel = this.container.querySelector('#btnDelLayer');
    if (btnDel) {
      btnDel.addEventListener('click', () => {
        if (this.doc.selectedLayerId) {
          this.doc.removeLayer(this.doc.selectedLayerId);
          this.onUpdate();
          this.render();
        }
      });
    }
  }

  refresh() {
    this.render();
  }
}
