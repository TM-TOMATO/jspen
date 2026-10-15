/**
 * Inspector Panel (Right Sidebar)
 * Detailed property editor, behavior/movement manager, and interaction rule editor.
 */
export class Inspector {
  constructor(container, project, onSpriteChanged) {
    this.container = container;
    this.project = project;
    this.onSpriteChanged = onSpriteChanged;

    this.activeTab = 'style'; // 'style', 'movements', 'interactions'
    this.render();
  }

  render() {
    const sprite = this.project.getSelectedSprite();

    if (!sprite) {
      this.renderCanvasSettings();
      return;
    }

    this.container.innerHTML = `
      <div class="inspector-header">
        <div class="inspector-title-row">
          <span class="inspector-badge">${sprite.type.toUpperCase()}</span>
          <input type="text" id="propName" class="inspector-name-input" value="${sprite.name}" placeholder="스프라이트 이름">
        </div>
        <div class="inspector-tabs">
          <button class="insp-tab ${this.activeTab === 'style' ? 'active' : ''}" data-tab="style">🎨 속성</button>
          <button class="insp-tab ${this.activeTab === 'movements' ? 'active' : ''}" data-tab="movements">
            🕹️ 움직임 (${sprite.movements.length})
          </button>
          <button class="insp-tab ${this.activeTab === 'interactions' ? 'active' : ''}" data-tab="interactions">
            ⚡ 상호작용 (${sprite.interactions.length})
          </button>
        </div>
      </div>

      <div class="inspector-body">
        <div class="insp-tab-content ${this.activeTab === 'style' ? 'active' : ''}" id="tabStyle">
          ${this.renderStyleTab(sprite)}
        </div>
        <div class="insp-tab-content ${this.activeTab === 'movements' ? 'active' : ''}" id="tabMovements">
          ${this.renderMovementsTab(sprite)}
        </div>
        <div class="insp-tab-content ${this.activeTab === 'interactions' ? 'active' : ''}" id="tabInteractions">
          ${this.renderInteractionsTab(sprite)}
        </div>
      </div>
    `;

    this.bindEvents(sprite);
  }

  renderCanvasSettings() {
    this.container.innerHTML = `
      <div class="inspector-header">
        <h3 class="section-title">캔버스 & 전역 설정</h3>
        <p class="section-desc">오브젝트를 선택하지 않은 상태에서는 프로젝트 전체를 설정합니다.</p>
      </div>

      <div class="inspector-body">
        <div class="prop-group">
          <div class="prop-group-title">프로젝트 기본 정보</div>
          <div class="prop-row">
            <span class="prop-label">프로젝트명</span>
            <input type="text" id="canvasProjName" class="input-field" value="${this.project.name}">
          </div>
          <div class="prop-row-dual">
            <div class="prop-half">
              <span class="prop-label">캔버스 너비</span>
              <input type="number" id="canvasWidth" class="input-field" value="${this.project.width}" step="10">
            </div>
            <div class="prop-half">
              <span class="prop-label">캔버스 높이</span>
              <input type="number" id="canvasHeight" class="input-field" value="${this.project.height}" step="10">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">배경 색상</span>
            <div class="color-picker-wrap">
              <input type="color" id="canvasBgColor" value="${this.project.backgroundColor}">
              <input type="text" id="canvasBgColorText" class="input-field color-text" value="${this.project.backgroundColor}">
            </div>
          </div>
        </div>

        <div class="prop-group">
          <div class="prop-group-title" style="display:flex; justify-content:space-between; align-items:center;">
            <span>전역 변수 (점수, 목숨 등)</span>
            <button class="btn btn-secondary btn-sm" id="btnAddVariable">+ 변수 추가</button>
          </div>
          <div class="var-list">
            ${this.project.variables.map((v, idx) => `
              <div class="var-item">
                <input type="text" class="input-field var-name" data-idx="${idx}" value="${v.name}" placeholder="변수명">
                <input type="number" class="input-field var-val" data-idx="${idx}" value="${v.value}" placeholder="초깃값">
                <button class="icon-btn-sm btn-danger btn-del-var" data-idx="${idx}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    // Bind canvas settings events
    const nameEl = this.container.querySelector('#canvasProjName');
    nameEl.addEventListener('input', () => {
      this.project.name = nameEl.value;
    });

    const wEl = this.container.querySelector('#canvasWidth');
    const hEl = this.container.querySelector('#canvasHeight');
    const updateSize = () => {
      this.project.width = Math.max(100, Number(wEl.value) || 800);
      this.project.height = Math.max(100, Number(hEl.value) || 600);
      this.project.saveState();
      this.onSpriteChanged();
    };
    wEl.addEventListener('change', updateSize);
    hEl.addEventListener('change', updateSize);

    const bgPicker = this.container.querySelector('#canvasBgColor');
    const bgText = this.container.querySelector('#canvasBgColorText');
    bgPicker.addEventListener('input', () => {
      bgText.value = bgPicker.value;
      this.project.backgroundColor = bgPicker.value;
      this.onSpriteChanged();
    });
    bgText.addEventListener('change', () => {
      bgPicker.value = bgText.value;
      this.project.backgroundColor = bgText.value;
      this.onSpriteChanged();
    });

    // Variables management
    this.container.querySelector('#btnAddVariable').addEventListener('click', () => {
      const vName = 'var_' + (this.project.variables.length + 1);
      this.project.variables.push({ name: vName, value: 0, initial: 0 });
      this.project.saveState();
      this.render();
    });

    this.container.querySelectorAll('.var-name').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        this.project.variables[idx].name = inp.value.trim() || 'var';
      });
    });

    this.container.querySelectorAll('.var-val').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        const val = Number(inp.value) || 0;
        this.project.variables[idx].value = val;
        this.project.variables[idx].initial = val;
      });
    });

    this.container.querySelectorAll('.btn-del-var').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        this.project.variables.splice(idx, 1);
        this.project.saveState();
        this.render();
      });
    });
  }

  renderStyleTab(sprite) {
    return `
      <!-- Transform Group -->
      <div class="prop-group">
        <div class="prop-group-title">위치 및 크기 (Transform)</div>
        <div class="prop-row-dual">
          <div class="prop-half">
            <span class="prop-label">X 위치</span>
            <input type="number" id="propX" class="input-field" value="${Math.round(sprite.x)}">
          </div>
          <div class="prop-half">
            <span class="prop-label">Y 위치</span>
            <input type="number" id="propY" class="input-field" value="${Math.round(sprite.y)}">
          </div>
        </div>
        <div class="prop-row-dual">
          <div class="prop-half">
            <span class="prop-label">가로 너비 (W)</span>
            <input type="number" id="propW" class="input-field" value="${Math.round(sprite.width)}" min="5">
          </div>
          <div class="prop-half">
            <span class="prop-label">세로 높이 (H)</span>
            <input type="number" id="propH" class="input-field" value="${Math.round(sprite.height)}" min="5">
          </div>
        </div>
        <div class="prop-row-dual">
          <div class="prop-half">
            <span class="prop-label">회전 각도 (°)</span>
            <input type="number" id="propRot" class="input-field" value="${Math.round(sprite.rotation)}">
          </div>
          <div class="prop-half">
            <span class="prop-label">스케일 (배율)</span>
            <input type="number" id="propScale" class="input-field" value="${sprite.scaleX}" step="0.1" min="0.1">
          </div>
        </div>
      </div>

      <!-- Appearance Group -->
      <div class="prop-group">
        <div class="prop-group-title">색상 및 스타일</div>
        ${sprite.type !== 'image' ? `
          <div class="prop-row">
            <span class="prop-label">채우기 색상</span>
            <div class="color-picker-wrap">
              <input type="color" id="propFill" value="${sprite.fill}">
              <input type="text" id="propFillText" class="input-field color-text" value="${sprite.fill}">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">테두리 색상</span>
            <div class="color-picker-wrap">
              <input type="color" id="propStroke" value="${sprite.stroke}">
              <input type="text" id="propStrokeText" class="input-field color-text" value="${sprite.stroke}">
            </div>
          </div>
          <div class="prop-row">
            <span class="prop-label">테두리 두께</span>
            <input type="range" id="propStrokeW" min="0" max="20" value="${sprite.strokeWidth}" class="range-slider">
            <span class="range-val" id="valStrokeW">${sprite.strokeWidth}px</span>
          </div>
        ` : ''}

        ${sprite.type === 'rect' ? `
          <div class="prop-row">
            <span class="prop-label">둥근 모서리</span>
            <input type="range" id="propCorner" min="0" max="60" value="${sprite.cornerRadius || 0}" class="range-slider">
            <span class="range-val" id="valCorner">${sprite.cornerRadius || 0}px</span>
          </div>
        ` : ''}

        <div class="prop-row">
          <span class="prop-label">불투명도</span>
          <input type="range" id="propOpacity" min="0" max="100" value="${Math.round(sprite.opacity * 100)}" class="range-slider">
          <span class="range-val" id="valOpacity">${Math.round(sprite.opacity * 100)}%</span>
        </div>
      </div>

      <!-- Text specific -->
      ${sprite.type === 'text' ? `
        <div class="prop-group">
          <div class="prop-group-title">텍스트 설정</div>
          <div class="prop-row">
            <span class="prop-label">텍스트 내용</span>
            <input type="text" id="propText" class="input-field" value="${sprite.text}">
          </div>
          <div class="prop-row">
            <span class="prop-label">글자 크기</span>
            <input type="number" id="propFontSize" class="input-field" value="${sprite.fontSize}" min="8" max="120">
          </div>
        </div>
      ` : ''}

      <!-- Image specific -->
      ${sprite.type === 'image' ? `
        <div class="prop-group">
          <div class="prop-group-title">이미지 소스</div>
          <div class="prop-row">
            <span class="prop-label">이미지 URL</span>
            <input type="text" id="propImageUrl" class="input-field" value="${sprite.imageUrl}">
          </div>
        </div>
      ` : ''}
    `;
  }

  renderMovementsTab(sprite) {
    return `
      <div class="movement-header-action">
        <select id="selectMovementType" class="select-field">
          <option value="">+ 움직임 비헤이비어 선택...</option>
          <option value="keyboard">🎮 키보드 조작 (방향키/WASD)</option>
          <option value="mouse_follow">🧲 마우스 따라가기</option>
          <option value="bounce">💥 화면 가장자리 튕기기 (바운스)</option>
          <option value="rotate">🔄 계속 회전하기</option>
          <option value="patrol">↔️ 좌우/상하 왕복 순찰</option>
          <option value="platformer">🍎 점프 & 중력 (플랫포머)</option>
          <option value="forward">🚀 앞으로 직진</option>
        </select>
        <button class="btn btn-primary btn-sm" id="btnAddMovement">추가</button>
      </div>

      <div class="movement-list">
        ${sprite.movements.length === 0 ? `
          <div class="empty-state">
            추가된 움직임이 없습니다.<br>
            위 드롭다운에서 비헤이비어를 선택해보세요!
          </div>
        ` : sprite.movements.map((m, idx) => this.renderMovementCard(m, idx)).join('')}
      </div>
    `;
  }

  renderMovementCard(m, idx) {
    const titles = {
      keyboard: '🎮 키보드 조작',
      mouse_follow: '🧲 마우스 따라가기',
      bounce: '💥 화면 튕기기',
      rotate: '🔄 계속 회전',
      patrol: '↔️ 왕복 순찰',
      platformer: '🍎 점프 & 중력',
      forward: '🚀 앞으로 직진'
    };

    return `
      <div class="behavior-card" data-idx="${idx}">
        <div class="behavior-header">
          <div class="behavior-title">
            <input type="checkbox" class="toggle-mov-enabled" data-idx="${idx}" ${m.enabled ? 'checked' : ''}>
            <span>${titles[m.type] || m.type}</span>
          </div>
          <button class="icon-btn-sm btn-danger btn-del-mov" data-idx="${idx}">🗑️</button>
        </div>
        <div class="behavior-params">
          ${this.renderMovementParams(m, idx)}
        </div>
      </div>
    `;
  }

  renderMovementParams(m, idx) {
    switch (m.type) {
      case 'keyboard':
        return `
          <div class="prop-row">
            <span class="prop-label">이동 속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 250}" step="10">
          </div>
          <div class="prop-row">
            <span class="prop-label">조작 키</span>
            <select class="select-field mov-param" data-idx="${idx}" data-param="controls">
              <option value="both" ${m.params.controls === 'both' ? 'selected' : ''}>화살표 + WASD 모두</option>
              <option value="arrows_only" ${m.params.controls === 'arrows_only' ? 'selected' : ''}>화살표 키만</option>
              <option value="wasd_only" ${m.params.controls === 'wasd_only' ? 'selected' : ''}>WASD 키만</option>
            </select>
          </div>
          <div class="prop-row">
            <span class="prop-label">화면 밖 이탈 방지</span>
            <input type="checkbox" class="mov-param" data-idx="${idx}" data-param="clampToScreen" ${m.params.clampToScreen ? 'checked' : ''}>
          </div>
        `;

      case 'mouse_follow':
        return `
          <div class="prop-row">
            <span class="prop-label">추적 반응 속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 5}" step="1">
          </div>
          <div class="prop-row">
            <span class="prop-label">마우스 방향 회전</span>
            <input type="checkbox" class="mov-param" data-idx="${idx}" data-param="rotateTowards" ${m.params.rotateTowards ? 'checked' : ''}>
          </div>
        `;

      case 'bounce':
        return `
          <div class="prop-row">
            <span class="prop-label">이동 속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 5}" step="0.5">
          </div>
          <div class="prop-row">
            <span class="prop-label">시작 각도 (°)</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="angle" value="${m.params.angle || 45}" step="5">
          </div>
        `;

      case 'rotate':
        return `
          <div class="prop-row">
            <span class="prop-label">회전 속도 (도/초)</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 90}" step="10">
          </div>
        `;

      case 'patrol':
        return `
          <div class="prop-row">
            <span class="prop-label">이동 속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 150}" step="10">
          </div>
          <div class="prop-row">
            <span class="prop-label">왕복 거리 (px)</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="distance" value="${m.params.distance || 150}" step="10">
          </div>
          <div class="prop-row">
            <span class="prop-label">왕복 축</span>
            <select class="select-field mov-param" data-idx="${idx}" data-param="axis">
              <option value="x" ${m.params.axis === 'x' ? 'selected' : ''}>X축 (좌우 왕복)</option>
              <option value="y" ${m.params.axis === 'y' ? 'selected' : ''}>Y축 (상하 왕복)</option>
            </select>
          </div>
        `;

      case 'platformer':
        return `
          <div class="prop-row">
            <span class="prop-label">중력 가속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="gravity" value="${m.params.gravity || 900}" step="50">
          </div>
          <div class="prop-row">
            <span class="prop-label">점프 파워</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="jumpForce" value="${m.params.jumpForce || 450}" step="20">
          </div>
          <div class="prop-row">
            <span class="prop-label">좌우 이동 속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 200}" step="20">
          </div>
        `;

      case 'forward':
        return `
          <div class="prop-row">
            <span class="prop-label">직진 속도</span>
            <input type="number" class="input-field mov-param" data-idx="${idx}" data-param="speed" value="${m.params.speed || 200}" step="20">
          </div>
          <div class="prop-row">
            <span class="prop-label">화면 끝 루프</span>
            <input type="checkbox" class="mov-param" data-idx="${idx}" data-param="wrapScreen" ${m.params.wrapScreen ? 'checked' : ''}>
          </div>
        `;
    }
    return '';
  }

  renderInteractionsTab(sprite) {
    return `
      <div class="movement-header-action">
        <button class="btn btn-primary btn-block" id="btnAddInteraction">
          ⚡ 새 상호작용 규칙 추가
        </button>
      </div>

      <div class="interaction-list">
        ${sprite.interactions.length === 0 ? `
          <div class="empty-state">
            설정된 상호작용이 없습니다.<br>
            [새 상호작용 규칙 추가]를 눌러보세요!
          </div>
        ` : sprite.interactions.map((inter, idx) => this.renderInteractionCard(inter, idx, sprite)).join('')}
      </div>
    `;
  }

  renderInteractionCard(inter, idx, currentSprite) {
    const otherSprites = this.project.sprites.filter(s => s.id !== currentSprite.id);

    return `
      <div class="rule-card" data-idx="${idx}">
        <div class="rule-card-header">
          <span class="rule-badge">규칙 #${idx + 1}</span>
          <button class="icon-btn-sm btn-danger btn-del-inter" data-idx="${idx}">🗑️</button>
        </div>

        <!-- WHEN (Trigger) -->
        <div class="rule-part">
          <div class="rule-part-label">조건 (WHEN)</div>
          <div class="prop-row">
            <select class="select-field inter-trigger" data-idx="${idx}">
              <option value="click" ${inter.trigger === 'click' ? 'selected' : ''}>👆 클릭했을 때</option>
              <option value="hover" ${inter.trigger === 'hover' ? 'selected' : ''}>🖱️ 마우스 올렸을 때</option>
              <option value="keydown" ${inter.trigger === 'keydown' ? 'selected' : ''}>⌨️ 키보드 키 눌렀을 때</option>
              <option value="collision" ${inter.trigger === 'collision' ? 'selected' : ''}>💥 충돌했을 때</option>
              <option value="tick" ${inter.trigger === 'tick' ? 'selected' : ''}>⏱️ 매 프레임</option>
            </select>
          </div>

          ${inter.trigger === 'keydown' ? `
            <div class="prop-row">
              <span class="prop-label">대상 키</span>
              <select class="select-field inter-trigger-param" data-idx="${idx}" data-param="key">
                <option value="Space" ${inter.triggerParams?.key === 'Space' ? 'selected' : ''}>스페이스바 (Space)</option>
                <option value="Enter" ${inter.triggerParams?.key === 'Enter' ? 'selected' : ''}>엔터 (Enter)</option>
                <option value="KeyZ" ${inter.triggerParams?.key === 'KeyZ' ? 'selected' : ''}>Z 키</option>
                <option value="KeyX" ${inter.triggerParams?.key === 'KeyX' ? 'selected' : ''}>X 키</option>
              </select>
            </div>
          ` : ''}

          ${inter.trigger === 'collision' ? `
            <div class="prop-row">
              <span class="prop-label">충돌 대상</span>
              <select class="select-field inter-trigger-param" data-idx="${idx}" data-param="targetId">
                <option value="any" ${inter.triggerParams?.targetId === 'any' ? 'selected' : ''}>아무 오브젝트</option>
                ${otherSprites.map(s => `
                  <option value="${s.id}" ${inter.triggerParams?.targetId === s.id ? 'selected' : ''}>${s.name}</option>
                `).join('')}
              </select>
            </div>
          ` : ''}
        </div>

        <!-- DO (Action) -->
        <div class="rule-part">
          <div class="rule-part-label">실행 (THEN DO)</div>
          <div class="prop-row">
            <select class="select-field inter-action" data-idx="${idx}">
              <option value="playSound" ${inter.action === 'playSound' ? 'selected' : ''}>🔊 효과음 재생</option>
              <option value="addScore" ${inter.action === 'addScore' ? 'selected' : ''}>📈 변수/점수 증가</option>
              <option value="bounceOff" ${inter.action === 'bounceOff' ? 'selected' : ''}>🦘 튕겨나가기 (반사)</option>
              <option value="changeColor" ${inter.action === 'changeColor' ? 'selected' : ''}>🎨 색상 변경</option>
              <option value="destroy" ${inter.action === 'destroy' ? 'selected' : ''}>💥 사라지기 (파괴)</option>
              <option value="teleport" ${inter.action === 'teleport' ? 'selected' : ''}>🌀 랜덤 위치로 이동</option>
              <option value="scale" ${inter.action === 'scale' ? 'selected' : ''}>🔍 크기 확대</option>
              <option value="alert" ${inter.action === 'alert' ? 'selected' : ''}>💬 알림 메시지</option>
            </select>
          </div>

          ${inter.action === 'playSound' ? `
            <div class="prop-row">
              <span class="prop-label">소리 종류</span>
              <select class="select-field inter-action-param" data-idx="${idx}" data-param="sound">
                <option value="coin" ${inter.actionParams?.sound === 'coin' ? 'selected' : ''}>🪙 코인 획득</option>
                <option value="jump" ${inter.actionParams?.sound === 'jump' ? 'selected' : ''}>🦘 점프음</option>
                <option value="hit" ${inter.actionParams?.sound === 'hit' ? 'selected' : ''}>💥 충돌음</option>
                <option value="laser" ${inter.actionParams?.sound === 'laser' ? 'selected' : ''}>🔫 레이저 발사</option>
                <option value="powerup" ${inter.actionParams?.sound === 'powerup' ? 'selected' : ''}>✨ 파워업</option>
                <option value="explosion" ${inter.actionParams?.sound === 'explosion' ? 'selected' : ''}>💣 폭발음</option>
              </select>
            </div>
          ` : ''}

          ${inter.action === 'addScore' ? `
            <div class="prop-row">
              <span class="prop-label">증가량</span>
              <input type="number" class="input-field inter-action-param" data-idx="${idx}" data-param="amount" value="${inter.actionParams?.amount !== undefined ? inter.actionParams.amount : 1}">
            </div>
          ` : ''}

          ${inter.action === 'changeColor' ? `
            <div class="prop-row">
              <span class="prop-label">바꿀 색상</span>
              <input type="color" class="inter-action-param" data-idx="${idx}" data-param="color" value="${inter.actionParams?.color || '#ef4444'}">
            </div>
          ` : ''}

          ${inter.action === 'alert' ? `
            <div class="prop-row">
              <span class="prop-label">메시지</span>
              <input type="text" class="input-field inter-action-param" data-idx="${idx}" data-param="message" value="${inter.actionParams?.message || '이벤트 발생!'}">
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }

  bindEvents(sprite) {
    // Tab switching
    this.container.querySelectorAll('.insp-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.activeTab = tab.dataset.tab;
        this.render();
      });
    });

    // Sprite Name
    const nameEl = this.container.querySelector('#propName');
    if (nameEl) {
      nameEl.addEventListener('input', () => {
        sprite.name = nameEl.value;
        this.onSpriteChanged();
      });
    }

    // Transform bindings
    const bindNumeric = (id, prop, isFloat = false) => {
      const el = this.container.querySelector('#' + id);
      if (el) {
        el.addEventListener('change', () => {
          sprite[prop] = isFloat ? parseFloat(el.value) || 1 : parseInt(el.value) || 0;
          this.project.saveState();
          this.onSpriteChanged();
        });
      }
    };

    bindNumeric('propX', 'x');
    bindNumeric('propY', 'y');
    bindNumeric('propW', 'width');
    bindNumeric('propH', 'height');
    bindNumeric('propRot', 'rotation');
    bindNumeric('propScale', 'scaleX', true);
    const scaleEl = this.container.querySelector('#propScale');
    if (scaleEl) {
      scaleEl.addEventListener('change', () => {
        sprite.scaleY = sprite.scaleX;
      });
    }

    // Fill & Stroke
    const fillEl = this.container.querySelector('#propFill');
    const fillTextEl = this.container.querySelector('#propFillText');
    if (fillEl && fillTextEl) {
      fillEl.addEventListener('input', () => {
        fillTextEl.value = fillEl.value;
        sprite.fill = fillEl.value;
        this.onSpriteChanged();
      });
      fillTextEl.addEventListener('change', () => {
        fillEl.value = fillTextEl.value;
        sprite.fill = fillTextEl.value;
        this.project.saveState();
        this.onSpriteChanged();
      });
    }

    const strokeEl = this.container.querySelector('#propStroke');
    const strokeTextEl = this.container.querySelector('#propStrokeText');
    if (strokeEl && strokeTextEl) {
      strokeEl.addEventListener('input', () => {
        strokeTextEl.value = strokeEl.value;
        sprite.stroke = strokeEl.value;
        this.onSpriteChanged();
      });
      strokeTextEl.addEventListener('change', () => {
        strokeEl.value = strokeTextEl.value;
        sprite.stroke = strokeTextEl.value;
        this.project.saveState();
        this.onSpriteChanged();
      });
    }

    // Stroke width slider
    const strokeWEl = this.container.querySelector('#propStrokeW');
    const valStrokeW = this.container.querySelector('#valStrokeW');
    if (strokeWEl) {
      strokeWEl.addEventListener('input', () => {
        const v = Number(strokeWEl.value);
        valStrokeW.textContent = v + 'px';
        sprite.strokeWidth = v;
        this.onSpriteChanged();
      });
      strokeWEl.addEventListener('change', () => this.project.saveState());
    }

    // Corner radius slider
    const cornerEl = this.container.querySelector('#propCorner');
    const valCorner = this.container.querySelector('#valCorner');
    if (cornerEl) {
      cornerEl.addEventListener('input', () => {
        const v = Number(cornerEl.value);
        valCorner.textContent = v + 'px';
        sprite.cornerRadius = v;
        this.onSpriteChanged();
      });
      cornerEl.addEventListener('change', () => this.project.saveState());
    }

    // Opacity slider
    const opEl = this.container.querySelector('#propOpacity');
    const valOp = this.container.querySelector('#valOpacity');
    if (opEl) {
      opEl.addEventListener('input', () => {
        const v = Number(opEl.value);
        valOp.textContent = v + '%';
        sprite.opacity = v / 100;
        this.onSpriteChanged();
      });
      opEl.addEventListener('change', () => this.project.saveState());
    }

    // Text specific
    const textEl = this.container.querySelector('#propText');
    if (textEl) {
      textEl.addEventListener('input', () => {
        sprite.text = textEl.value;
        this.onSpriteChanged();
      });
    }
    const fontSzEl = this.container.querySelector('#propFontSize');
    if (fontSzEl) {
      fontSzEl.addEventListener('change', () => {
        sprite.fontSize = Number(fontSzEl.value) || 24;
        this.project.saveState();
        this.onSpriteChanged();
      });
    }

    // Image URL
    const imgUrlEl = this.container.querySelector('#propImageUrl');
    if (imgUrlEl) {
      imgUrlEl.addEventListener('change', () => {
        sprite.loadImage(imgUrlEl.value);
        this.project.saveState();
        this.onSpriteChanged();
      });
    }

    // Movements Management
    const btnAddMov = this.container.querySelector('#btnAddMovement');
    const selMovType = this.container.querySelector('#selectMovementType');
    if (btnAddMov && selMovType) {
      btnAddMov.addEventListener('click', () => {
        const type = selMovType.value;
        if (!type) return;

        const defaultParams = {
          keyboard: { speed: 250, controls: 'both', clampToScreen: true },
          mouse_follow: { speed: 5, rotateTowards: false },
          bounce: { speed: 5, angle: 45 },
          rotate: { speed: 90 },
          patrol: { speed: 150, distance: 150, axis: 'x' },
          platformer: { gravity: 900, jumpForce: 450, speed: 200 },
          forward: { speed: 200, wrapScreen: true }
        };

        sprite.movements.push({
          id: 'm_' + Date.now(),
          type,
          enabled: true,
          params: defaultParams[type] || {}
        });

        this.project.saveState();
        this.render();
      });
    }

    this.container.querySelectorAll('.toggle-mov-enabled').forEach(cb => {
      cb.addEventListener('change', () => {
        const idx = Number(cb.dataset.idx);
        sprite.movements[idx].enabled = cb.checked;
        this.project.saveState();
      });
    });

    this.container.querySelectorAll('.btn-del-mov').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        sprite.movements.splice(idx, 1);
        this.project.saveState();
        this.render();
      });
    });

    this.container.querySelectorAll('.mov-param').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        const param = inp.dataset.param;
        const val = inp.type === 'checkbox' ? inp.checked : (inp.type === 'number' ? Number(inp.value) : inp.value);
        sprite.movements[idx].params[param] = val;
        this.project.saveState();
      });
    });

    // Interactions Management
    const btnAddInter = this.container.querySelector('#btnAddInteraction');
    if (btnAddInter) {
      btnAddInter.addEventListener('click', () => {
        sprite.interactions.push({
          id: 'i_' + Date.now(),
          trigger: 'click',
          triggerParams: {},
          action: 'playSound',
          actionParams: { sound: 'coin' }
        });
        this.project.saveState();
        this.render();
      });
    }

    this.container.querySelectorAll('.btn-del-inter').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = Number(btn.dataset.idx);
        sprite.interactions.splice(idx, 1);
        this.project.saveState();
        this.render();
      });
    });

    this.container.querySelectorAll('.inter-trigger').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = Number(sel.dataset.idx);
        sprite.interactions[idx].trigger = sel.value;
        sprite.interactions[idx].triggerParams = {};
        this.project.saveState();
        this.render();
      });
    });

    this.container.querySelectorAll('.inter-action').forEach(sel => {
      sel.addEventListener('change', () => {
        const idx = Number(sel.dataset.idx);
        sprite.interactions[idx].action = sel.value;
        sprite.interactions[idx].actionParams = {};
        this.project.saveState();
        this.render();
      });
    });

    this.container.querySelectorAll('.inter-trigger-param').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        const param = inp.dataset.param;
        if (!sprite.interactions[idx].triggerParams) sprite.interactions[idx].triggerParams = {};
        sprite.interactions[idx].triggerParams[param] = inp.value;
        this.project.saveState();
      });
    });

    this.container.querySelectorAll('.inter-action-param').forEach(inp => {
      inp.addEventListener('change', () => {
        const idx = Number(inp.dataset.idx);
        const param = inp.dataset.param;
        if (!sprite.interactions[idx].actionParams) sprite.interactions[idx].actionParams = {};
        const val = inp.type === 'number' ? Number(inp.value) : inp.value;
        sprite.interactions[idx].actionParams[param] = val;
        this.project.saveState();
      });
    });
  }

  updateInputsFromGizmo(sprite) {
    // Fast update during drag without re-rendering entire HTML
    const xEl = this.container.querySelector('#propX');
    const yEl = this.container.querySelector('#propY');
    const wEl = this.container.querySelector('#propW');
    const hEl = this.container.querySelector('#propH');
    const rotEl = this.container.querySelector('#propRot');

    if (xEl) xEl.value = Math.round(sprite.x);
    if (yEl) yEl.value = Math.round(sprite.y);
    if (wEl) wEl.value = Math.round(sprite.width);
    if (hEl) hEl.value = Math.round(sprite.height);
    if (rotEl) rotEl.value = Math.round(sprite.rotation);
  }
}
