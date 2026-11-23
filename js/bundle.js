/**
 * JSPen Studio - Standalone Zero-Server Bundle
 * Complete Professional Interactive Design & Motion Studio
 */

(function () {

  // ==========================================================================
  // Security helpers: HTML escaping & URL scheme allowlist
  // ==========================================================================
  // Escape a value for safe insertion into HTML text or a quoted attribute.
  function escapeHtml(value) {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Return the URL if it is a relative link, an in-page anchor, or uses an
  // allowed scheme (http, https, mailto, tel). Anything else (javascript:,
  // data:, vbscript:, ...) yields ''. Pass allowImageData to also accept
  // data:image/* URLs (for <img src>).
  function safeUrl(url, allowImageData = false) {
    if (url === null || url === undefined) return '';
    const raw = String(url).trim();
    if (!raw) return '';
    // Browsers ignore control characters and whitespace when parsing the scheme.
    const compact = raw.replace(/[\u0000-\u0020\u007F]+/g, '').toLowerCase();
    const scheme = compact.match(/^([a-z][a-z0-9+.-]*):/);
    if (!scheme) return raw;
    if (['http', 'https', 'mailto', 'tel'].includes(scheme[1])) return raw;
    if (allowImageData && /^data:image\/(png|jpe?g|gif|webp|bmp);/.test(compact)) return raw;
    return '';
  }

  // Serialize data as a JS literal that is safe to embed inside <script>.
  function jsonForScript(data, space) {
    return JSON.stringify(data, null, space)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/\u2028/g, '\\u2028')
      .replace(/\u2029/g, '\\u2029');
  }

  if (typeof window !== 'undefined') {
    window.JSPenSecurity = { escapeHtml, safeUrl, jsonForScript };
  }

  // ==========================================================================
  // Native Bridge: desktop (PyQt6 QtWebEngine) vs. plain browser
  // ==========================================================================
  // In the desktop shell (main.py) a QWebChannel publishes `window.JSPenHost`
  // (slots: command(name), saveProject(json, fileName)). The channel connects
  // asynchronously, so calls made before it is ready are queued.
  const NativeBridge = {
    isDesktop: typeof window !== 'undefined' && !!(window.qt && window.qt.webChannelTransport),
    _queue: [],

    _host() {
      return (typeof window !== 'undefined' && window.JSPenHost) || null;
    },

    _flush() {
      const host = this._host();
      if (!host) return;
      const pending = this._queue.splice(0);
      for (const [method, args] of pending) {
        if (typeof host[method] === 'function') host[method](...args);
      }
    },

    call(method, ...args) {
      if (!this.isDesktop) return false;
      this._queue.push([method, args]);
      this._flush();
      return true;
    },

    // Window / file commands handled by the desktop shell.
    send(cmd) {
      return this.call('command', String(cmd));
    },

    // Show generated HTML in a new window that cannot reach the studio: the
    // desktop shell uses an isolated window, browsers a window without opener.
    openPreview(html) {
      if (this.call('openPreview', String(html))) return;
      const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
      window.open(url, '_blank', 'noopener,width=1500,height=960');
    },

    // Load a JSON resource by relative URL. fetch() only works over http(s), so
    // the desktop shell (jspen://) and file:// use XMLHttpRequest.
    loadJSON(url) {
      if (/^https?:$/.test(location.protocol)) {
        return fetch(url).then(res => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        });
      }
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.overrideMimeType('application/json');
        xhr.onload = () => {
          // file:// and custom-scheme responses may report status 0 on success
          if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
            try { resolve(JSON.parse(xhr.responseText)); } catch (e) { reject(e); }
          } else {
            reject(new Error(`HTTP ${xhr.status}`));
          }
        };
        xhr.onerror = () => reject(new Error('load failed: ' + url));
        xhr.send();
      });
    },

    downloadText(filename, text, mime = 'application/json') {
      // Desktop: native save dialog (Chromium downloads are unreliable there).
      if (this.call('saveFile', String(filename), String(text))) return;
      const blob = new Blob([text], { type: mime + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    // Pick a file and read it as text or as a data URL: { name, size, data }.
    pickFile(accept, as = 'text') {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          input.remove();
          if (!file) { resolve(null); return; }
          NativeBridge.readFile(file, as).then(resolve);
        });
        document.body.appendChild(input);
        input.click();
      });
    },

    readFile(file, as = 'text') {
      return new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve({ name: file.name, size: file.size, type: file.type, data: reader.result });
        reader.onerror = () => resolve(null);
        if (as === 'dataurl') reader.readAsDataURL(file); else reader.readAsText(file);
      });
    },

    pickTextFile(accept) {
      return new Promise(resolve => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = accept;
        input.style.display = 'none';
        input.addEventListener('change', () => {
          const file = input.files && input.files[0];
          input.remove();
          if (!file) { resolve(null); return; }
          const reader = new FileReader();
          reader.onload = () => resolve({ name: file.name, text: String(reader.result) });
          reader.onerror = () => resolve(null);
          reader.readAsText(file);
        });
        document.body.appendChild(input);
        input.click();
      });
    }
  };

  if (typeof window !== 'undefined') {
    window.JSPenNative = NativeBridge;
    if (NativeBridge.isDesktop) {
      document.addEventListener('jspen-host-ready', () => NativeBridge._flush());
      NativeBridge._flush();
    }
  }

  // ==========================================================================
  // Studio Modal & Toast Engine (Replacing all native browser dialogs)
  // ==========================================================================
  class StudioModal {
    static alert(msg, title = '알림') {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'studio-modal-overlay';
        overlay.innerHTML = `
          <div class="studio-modal-box">
            <div class="studio-modal-header">
              <span class="studio-modal-title">${escapeHtml(title)}</span>
              <button class="studio-modal-close" id="btnStudioModalClose">✕</button>
            </div>
            <div class="studio-modal-body">
              <div class="studio-modal-msg">${escapeHtml(msg)}</div>
            </div>
            <div class="studio-modal-footer">
              <button class="btn btn-primary btn-sm" id="btnStudioModalOk" style="min-width:70px;">확인</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        const close = () => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(true);
        };
        overlay.querySelector('#btnStudioModalOk').onclick = close;
        overlay.querySelector('#btnStudioModalClose').onclick = close;
        overlay.addEventListener('keydown', e => {
          if (e.key === 'Escape' || e.key === 'Enter') {
            e.stopPropagation();
            close();
          }
        });
        overlay.querySelector('#btnStudioModalOk').focus();
      });
    }

    static confirm(msg, title = '확인') {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'studio-modal-overlay';
        overlay.innerHTML = `
          <div class="studio-modal-box">
            <div class="studio-modal-header">
              <span class="studio-modal-title">${escapeHtml(title)}</span>
              <button class="studio-modal-close" id="btnStudioModalClose">✕</button>
            </div>
            <div class="studio-modal-body">
              <div class="studio-modal-msg">${escapeHtml(msg)}</div>
            </div>
            <div class="studio-modal-footer">
              <button class="btn btn-secondary btn-sm" id="btnStudioModalCancel" style="min-width:65px;">취소</button>
              <button class="btn btn-primary btn-sm" id="btnStudioModalOk" style="min-width:65px;">확인</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        const done = val => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(val);
        };
        overlay.querySelector('#btnStudioModalOk').onclick = () => done(true);
        overlay.querySelector('#btnStudioModalCancel').onclick = () => done(false);
        overlay.querySelector('#btnStudioModalClose').onclick = () => done(false);
        overlay.addEventListener('keydown', e => {
          if (e.key === 'Escape') { e.stopPropagation(); done(false); }
          if (e.key === 'Enter') { e.stopPropagation(); done(true); }
        });
        overlay.querySelector('#btnStudioModalOk').focus();
      });
    }

    // Choice dialog: resolves with the chosen value, or null when cancelled.
    static choose(msg, options, title = '선택') {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'studio-modal-overlay';
        overlay.innerHTML = `
          <div class="studio-modal-box">
            <div class="studio-modal-header">
              <span class="studio-modal-title">${escapeHtml(title)}</span>
              <button class="studio-modal-close" id="btnStudioModalClose">✕</button>
            </div>
            <div class="studio-modal-body">
              <div class="studio-modal-msg">${escapeHtml(msg)}</div>
              <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px;">
                ${options.map(([v, label, hint], i) => `<button class="btn btn-secondary btn-sm" data-choice="${i}" style="text-align:left;justify-content:flex-start;white-space:normal;">
                  <b>${escapeHtml(label)}</b>${hint ? `<span style="display:block;font-weight:400;color:#a1a1aa;font-size:11px;">${escapeHtml(hint)}</span>` : ''}</button>`).join('')}
              </div>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        const done = v => { overlay.remove(); resolve(v); };
        overlay.querySelectorAll('[data-choice]').forEach(b => b.addEventListener('click', () => done(options[+b.dataset.choice][0])));
        overlay.querySelector('#btnStudioModalClose').onclick = () => done(null);
        overlay.addEventListener('keydown', e => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } });
        overlay.querySelector('[data-choice]')?.focus();
      });
    }

    static prompt(msg, defaultVal = '', title = '입력') {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'studio-modal-overlay';
        overlay.innerHTML = `
          <div class="studio-modal-box">
            <div class="studio-modal-header">
              <span class="studio-modal-title">${escapeHtml(title)}</span>
              <button class="studio-modal-close" id="btnStudioModalClose">✕</button>
            </div>
            <div class="studio-modal-body">
              <div class="studio-modal-msg">${escapeHtml(msg)}</div>
              <input type="text" class="studio-modal-input" id="studioModalInput" value="${escapeHtml(defaultVal || '')}" />
            </div>
            <div class="studio-modal-footer">
              <button class="btn btn-secondary btn-sm" id="btnStudioModalCancel" style="min-width:65px;">취소</button>
              <button class="btn btn-primary btn-sm" id="btnStudioModalOk" style="min-width:65px;">확인</button>
            </div>
          </div>
        `;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#studioModalInput');
        input.focus();
        input.select();
        const done = val => {
          if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
          resolve(val);
        };
        overlay.querySelector('#btnStudioModalOk').onclick = () => done(input.value);
        overlay.querySelector('#btnStudioModalCancel').onclick = () => done(null);
        overlay.querySelector('#btnStudioModalClose').onclick = () => done(null);
        input.addEventListener('keydown', e => {
          e.stopPropagation();
          if (e.key === 'Enter') done(input.value);
          if (e.key === 'Escape') done(null);
        });
      });
    }
  }

  class StudioToast {
    static show(msg, duration = 2200) {
      const existing = document.querySelector('.studio-toast');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);
      const toast = document.createElement('div');
      toast.className = 'studio-toast';
      toast.textContent = msg;
      document.body.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
          if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
      }, duration);
    }
  }

  if (typeof window !== 'undefined') {
    window.StudioModal = StudioModal;
    window.StudioToast = StudioToast;
    window.alert = (msg) => { StudioToast.show(msg); };
  }

  'use strict';

  // ==========================================================================
  // 2. Module Registry (every module here must be handled by ModuleEngine or
  //    the renderer; tests/modules.test.js enforces this)
  // ==========================================================================
  const MODULE_REGISTRY = {
    text_label: {
      category: 'content', name: '텍스트 라벨 (Text)', icon: 'TXT',
      description: '스프라이트 내부에 표시할 텍스트 문구, 글자 크기, 색상, 정렬 및 줄바꿈을 제어합니다.',
      defaultParams: {
        text: '텍스트 라벨',
        fontSize: 16,
        color: '#ffffff',
        fontWeight: 'normal',
        textAlign: 'center',
        valign: 'middle',
        lineHeight: 1.35
      }
    },
    // 0. Web & Hyperlink Modifier (Blender-Style Modifier Pipeline)
    hyperlink: {
      category: 'web', name: '링크 이동 (Link)', icon: 'LINK',
      description: '스프라이트에 클릭, 호버, 신호 수신 시 외부 웹 URL이나 내부 앵커(#id)로 이동하는 웹 네비게이션 모디파이어를 부여합니다.',
      defaultParams: {
        condition: 'always',
        url: 'https://example.com',
        target: '_blank', // '_blank' | '_self'
        trigger: 'click', // 'click' | 'hover' | 'signal' | 'viewport_enter'
        signalName: '',
                anchorId: '',
        customClass: '',
        enabled: true,
        showInRender: true
      }
    },

    // 1. Sensory & Gestures
    mouse_position: {
      category: 'sensor', name: '마우스 위치 추적', icon: 'POS',
      description: '마우스 좌표와 이동 속도를 부드럽게 감지해 다음 모듈의 입력 값(속도)으로 넘깁니다. 움직이면 신호를 보냅니다.',
      defaultParams: { condition: 'always', coordinateMode: 'relative', smoothFactor: 0.15, signalName: 'mouse_move' },
      paramOptions: { coordinateMode: [['relative', '스프라이트 기준'], ['absolute', '캔버스 기준']] },
      paramLabels: { coordinateMode: '좌표 기준', smoothFactor: '부드러움 (0~1)', signalName: '이동 신호 이름' }
    },
    hover_proximity: {
      category: 'sensor', name: '호버 및 근접 감지', icon: 'ZONE',
      description: '마우스가 스프라이트 위에 올라오거나 지정 반경에 진입했는지 감지합니다.',
      defaultParams: { condition: 'always', detectionRadius: 60, scaleOnHover: 1.15 },
      paramLabels: { detectionRadius: '감지 거리 (px)', scaleOnHover: '올렸을 때 크기' },
      paramRanges: { detectionRadius: [0, 400, 1], scaleOnHover: [0.5, 2, 0.01] }
    },
    click_gesture: {
      category: 'sensor', name: '클릭 및 제스처 감지', icon: 'TRG',
      description: '단일 클릭, 더블 클릭, 롱 프레스 이벤트를 발생시킵니다.',
      defaultParams: { condition: 'always', gestureType: 'click', activeDuration: 0.2 },
      paramLabels: { gestureType: '동작', activeDuration: '발동 유지 (초)' },
      paramOptions: { gestureType: [['click', '클릭'], ['double_click', '더블 클릭'], ['long_press', '길게 누르기']] },
      paramRanges: { activeDuration: [0, 3, 0.05] }
    },
    draggable: {
      category: 'sensor', name: '자유 드래그 모듈', icon: 'DRG',
      description: '마우스로 스프라이트를 집어 자유롭게 드래그 앤 드롭 이동합니다.',
      defaultParams: { condition: 'always', constrainAxis: 'none', snapToGrid: false, gridSize: 20 },
      paramLabels: { constrainAxis: '움직일 방향', snapToGrid: '격자에 맞추기', gridSize: '격자 간격 (px)' },
      paramOptions: { constrainAxis: [['none', '자유롭게'], ['x', '가로만'], ['y', '세로만']] },
      paramRanges: { gridSize: [1, 200, 1] }
    },
    scroll_wheel: {
      category: 'sensor', name: '스크롤 휠 감지', icon: 'WHL',
      description: '스프라이트 위에서 마우스 휠을 굴리면 수치를 증감해 다음 모듈의 입력 값으로 넘깁니다.',
      defaultParams: { condition: 'always', sensitivity: 1.0, minVal: 0, maxVal: 100, startVal: 0 },
      paramLabels: { sensitivity: '감도', minVal: '최솟값', maxVal: '최댓값', startVal: '시작값' }
    },
    keyboard_trigger: {
      category: 'sensor', name: '키보드 입력 감지', icon: 'KEY',
      description: '지정된 키(방향키, Space, Enter 등) 입력을 감지합니다.',
      defaultParams: { condition: 'always', targetKey: 'ArrowRight', moveSpeed: 5 },
      paramLabels: { targetKey: '키', moveSpeed: '이동 속도 (px)' },
      paramTypes: { targetKey: 'key' },
      paramRanges: { moveSpeed: [0, 50, 0.5] }
    },
    collision_detector: {
      category: 'sensor', name: '충돌 및 겹침 감지', icon: 'COL',
      description: '대상 스프라이트(비우면 모든 스프라이트)와 겹치면 트리거와 신호를 발생시키고, 선택하면 튕겨 나갑니다.',
      defaultParams: { condition: 'always', targetSpriteId: '', bounceBack: true, signalName: 'collision' },
      paramLabels: { targetSpriteId: '충돌 대상', bounceBack: '튕겨내기', signalName: '충돌 신호 이름' }
    },
    viewport_visibility: {
      category: 'sensor', name: '화면 가시성 감지', icon: 'VIEW',
      description: '스프라이트가 화면(스크롤 영역) 안에 보이면 트리거를 발동하고 신호를 보냅니다.',
      defaultParams: { condition: 'always', triggerOnce: false, signalName: 'visible' },
      paramLabels: { triggerOnce: '한 번만 발동', signalName: '진입 신호 이름' }
    },
    timer_interval: {
      category: 'sensor', name: '타이머 및 주기 발신', icon: 'TIME',
      description: '지정한 주기(초)마다 반복 신호를 보내고, 누적 횟수를 다음 모듈의 입력 값으로 넘깁니다.',
      defaultParams: { condition: 'always', intervalSec: 1.0, autoStart: true, signalName: 'timer_tick' },
      paramLabels: { intervalSec: '주기 (초)', autoStart: '즉시 시작', signalName: '신호 이름' }
    },

    // 2. Link & Logic
    follow_target: {
      category: 'logic', name: '타겟 추적 모듈', icon: 'FLW',
      description: '타겟 스프라이트를 다양한 방식(스프링, 감속 추적, 등속 추적, 궤도 공전, 탄성, 즉시 고정)으로 추적합니다.',
      defaultParams: {
        condition: 'always',
        targetSpriteId: '',
        trackMode: 'lerp', // lerp, spring, constant, orbit, elastic, direct
        smoothSpeed: 0.15,
        constantSpeed: 300,
        stiffness: 0.12,
        damping: 0.75,
        orbitRadius: 100,
        orbitSpeed: 90,
        followAxis: 'both', // both, x_only, y_only
        offsetX: 0,
        offsetY: 0,
        rotateToTarget: false
      },
      paramLabels: { targetSpriteId: '따라갈 대상', trackMode: '따라가는 방식', smoothSpeed: '부드러움 (0~1)', constantSpeed: '속도 (px/초)', stiffness: '스프링 강도', damping: '감쇠', orbitRadius: '공전 반지름 (px)', orbitSpeed: '공전 속도 (도/초)', followAxis: '따라갈 축', offsetX: '가로 간격 (px)', offsetY: '세로 간격 (px)', rotateToTarget: '대상 쪽으로 회전' },
      paramOptions: { trackMode: [['lerp', '부드럽게 감속'], ['spring', '스프링'], ['constant', '일정한 속도'], ['orbit', '주위를 공전'], ['direct', '바로 붙기']], followAxis: [['both', '가로·세로'], ['x_only', '가로만'], ['y_only', '세로만']] },
      paramRanges: { smoothSpeed: [0, 1, 0.01], constantSpeed: [0, 2000, 1], stiffness: [0, 1, 0.01], damping: [0, 1, 0.01], orbitRadius: [0, 1000, 1], orbitSpeed: [-720, 720, 1] }
    },
    math_calculate: {
      category: 'logic', name: '수학 계산 (Math)', icon: 'CALC',
      description: '사칙연산, 삼각함수, 비교, 클램프 연산을 수행하여 변형 속성 또는 포토샵 필터(블러, 밝기, 대비, 알파 등)를 실시간 조작합니다.',
      defaultParams: {
        condition: 'always',
        operation: 'add', // add, subtract, multiply, divide, sin, cos, min, max, clamp, lerp
        inputA: 0,
        inputB: 1,
        clampMin: 0,
        clampMax: 100,
        targetVal: 0,
        targetParam: 'none',
        outputProperty: 'x' // x, y, rotation, scaleX, scaleY, opacity, filter_blur, filter_brightness, filter_contrast, filter_opacity, filter_grayscale, filter_invert, filter_hueRotate
      },
      paramLabels: { operation: '연산', inputA: '값 A', inputB: '값 B', clampMin: '최솟값 (범위 제한)', clampMax: '최댓값 (범위 제한)', targetVal: '목표값 (보간)', targetParam: '결과 적용 대상' },
      paramOptions: { operation: [['add', '더하기 (A + B)'], ['subtract', '빼기 (A − B)'], ['multiply', '곱하기 (A × B)'], ['divide', '나누기 (A ÷ B)'], ['min', '작은 값'], ['max', '큰 값'], ['modulo', '나머지 (A ÷ B)'], ['abs', '절댓값 (A)'], ['round', '반올림 (A)'], ['sin', '사인 (A)'], ['cos', '코사인 (A)'], ['clamp', '범위 제한 (A)'], ['lerp', '보간 (A → 목표값, 비율 B)']], targetParam: [['none', '적용 안 함 (값만 전달)'], ['x', 'X 위치'], ['y', 'Y 위치'], ['rotation', '회전 (도)'], ['scaleX', '가로 배율'], ['scaleY', '세로 배율'], ['opacity', '불투명도 (0~1)'], ['filter_blur', '필터: 흐림'], ['filter_brightness', '필터: 밝기'], ['filter_contrast', '필터: 대비'], ['filter_grayscale', '필터: 흑백'], ['filter_invert', '필터: 반전'], ['filter_hueRotate', '필터: 색조 회전'], ['filter_opacity', '필터: 불투명도']] },
      paramHidden: ['outputProperty']
    },
    screen_trigger: {
      category: 'sensor', name: '화면 트리거 (뷰포트)', icon: 'TRIG',
      description: '화면 스크롤이 이 위치에 도달하거나 마우스가 진입했을 때 지정된 신호를 방출하거나 모듈/필터 애니메이션을 발동합니다.',
      defaultParams: {
        condition: 'always',
        triggerEvent: 'viewport_enter', // viewport_enter, viewport_exit, mouse_enter, mouse_move, scroll_reach, click
        action: 'emit_signal', // emit_signal, trigger_module, animate_filter, set_filter, show_sprite, hide_sprite, pulse, animate_in
        signalName: 'signal_1',
        targetSpriteId: '',
        targetModuleId: '',
        filterEffect: 'blur', // blur, brightness, contrast, saturate, grayscale, sepia, hueRotate, invert, opacity
        filterValue: 20,
        once: false
      },
      paramLabels: { triggerEvent: '발동 시점', action: '할 일', signalName: '보낼 신호 이름', targetSpriteId: '대상 스프라이트', filterEffect: '필터', filterValue: '필터 값', once: '한 번만 발동' },
      paramOptions: { triggerEvent: [['viewport_enter', '화면에 들어올 때'], ['viewport_exit', '화면에서 나갈 때'], ['mouse_enter', '마우스가 올라올 때'], ['mouse_move', '위에서 마우스가 움직일 때'], ['scroll_reach', '스크롤이 닿았을 때'], ['click', '클릭했을 때']], action: [['emit_signal', '신호만 보내기'], ['show_sprite', '대상 보이기'], ['hide_sprite', '대상 숨기기'], ['pulse', '대상 강조 (펄스)'], ['animate_in', '대상 등장'], ['animate_filter', '대상 필터 서서히'], ['set_filter', '대상 필터 바로']], filterEffect: [['blur', '흐림'], ['brightness', '밝기'], ['contrast', '대비'], ['saturate', '채도'], ['grayscale', '흑백'], ['sepia', '세피아'], ['hueRotate', '색조 회전'], ['invert', '반전'], ['opacity', '불투명도']] },
      paramRanges: { filterValue: [0, 200, 1] }
    },
    photoshop_filter: {
      category: 'motion', name: '그래픽 필터 (Filter FX)', icon: 'FLTR',
      description: '블러, 밝기, 대비, 채도, 흑백, 세피아, 색조 회전, 알파값(투명도) 등 필터를 정적 또는 신호/트리거/박동에 연동하여 실시간 적용합니다.',
      defaultParams: {
        condition: 'always',
        mode: 'static', // static, pulse, reactive, on_trigger
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        invert: 0,
        opacity: 100,
        dropShadow: false,
        pulseSpeed: 2.0,
        pulseMin: 0,
        pulseMax: 20
      }
    },
    substance_mask: {
      category: 'motion', name: '마스크 (Mask)', icon: 'MASK',
      description: '서브스턴스 페인터 스타일의 마스크: 화이트 마스크(전체 통과), 블랙 마스크(전체 가림), 클리핑 마스크, 반전 마스크를 적용합니다.',
      defaultParams: {
        condition: 'always',
        maskType: 'white', // 'white', 'black', 'clip', 'invert'
        intensity: 100, // 0 to 100
        invert: false,
        feather: 0,
        targetSpriteId: ''
      }
    },
    look_at: {
      category: 'logic', name: '타겟 조준 (Look-At)', icon: 'AIM',
      description: '스프라이트가 항상 타겟 레이어나 마우스 방향을 바라보도록 자동 회전합니다.',
      defaultParams: { condition: 'always', targetType: 'mouse', targetLayerId: null, rotationOffset: 0 },
      paramLabels: { targetLayerId: '바라볼 대상', rotationOffset: '회전 보정 (도)' },
      paramTypes: { targetLayerId: 'layer' },
      paramEmpty: { targetLayerId: '마우스 커서' },
      paramRanges: { rotationOffset: [-180, 180, 1] },
      paramHidden: ['targetType']
    },
    distance_rope: {
      category: 'logic', name: '거리 제한 로프', icon: 'ROPE',
      description: '대상(비우면 마우스)과의 거리를 최대 거리 이내로 제한해 밧줄에 매달린 것처럼 움직입니다.',
      defaultParams: { condition: 'always', targetSpriteId: '', maxDistance: 150 },
      paramLabels: { targetSpriteId: '연결 대상', maxDistance: '최대 거리 (px)' }
    },
    value_remapper: {
      category: 'logic', name: '값 매핑기', icon: 'MAP',
      description: '입력 수치를 원하는 출력 범위로 비례 환산하여 속성이나 필터에 연결합니다.',
      defaultParams: { condition: 'always', inputSource: 'mouse_x', varName: '', inMin: 0, inMax: 800, outMin: 0, outMax: 360, outputProperty: 'rotation', outputMode: 'absolute', clamp: true },
      paramOptions: {
        inputSource: [['mouse_x', '마우스 X'], ['mouse_y', '마우스 Y'], ['mouse_distance', '마우스와의 거리'], ['mouse_speed', '마우스 속도'], ['time', '경과 시간 (초)'], ['scroll', '스크롤 위치'], ['scroll_progress', '스크롤 진행률 (0~1)'], ['variable', '전역 변수'], ['audio_level', '소리 크기 (0~1)'], ['stack', '이전 모듈 값']],
        outputProperty: [['x','X 위치'],['y','Y 위치'],['rotation','회전 (도)'],['scale','크기 (배율)'],['scaleX','가로 배율'],['scaleY','세로 배율'],['opacity','불투명도 (0~1)'], ['filter_blur', '필터: 흐림'], ['filter_brightness', '필터: 밝기'], ['filter_hueRotate', '필터: 색조 회전'], ['filter_grayscale', '필터: 흑백'], ['none', '출력 없음 (값만 전달)']],
        outputMode: [['absolute', '절댓값으로 설정'], ['offset', '원래 값에 더하기']]
      },
      paramLabels: { inputSource: '입력 소스', varName: '변수 이름 (전역 변수 입력 시)', inMin: '입력 최소', inMax: '입력 최대', outMin: '출력 최소', outMax: '출력 최대', outputProperty: '출력 속성', outputMode: '출력 방식', clamp: '범위 제한' }
    },
    signal_relay: {
      category: 'logic', name: '신호 전달기 (Signal Relay)', icon: 'RLY',
      description: '화면 트리거 또는 다른 모듈의 신호를 수신하여 지연 후 재전송하거나 대상 모듈/필터를 연계 발동합니다.',
      defaultParams: {
        condition: 'always',
        inputSignal: 'signal_1',
        delaySec: 0.3,
        outputSignal: 'signal_relayed',
        action: 'emit_signal', // emit_signal, trigger_module, animate_filter, set_filter, toggle_active
        targetSpriteId: '',
        targetModuleId: '',
        targetLayerId: '',
        filterEffect: 'invert',
        filterValue: 100
      },
      paramLabels: { inputSignal: '받을 신호', delaySec: '지연 (초)', outputSignal: '보낼 신호', action: '할 일', targetSpriteId: '대상 스프라이트', targetLayerId: '대상 레이어', filterEffect: '필터', filterValue: '필터 값' },
      paramOptions: { action: [['emit_signal', '신호 다시 보내기'], ['toggle_active', '대상 켜기 / 끄기'], ['animate_filter', '대상 필터 적용'], ['set_filter', '대상 필터 바로']], filterEffect: [['blur', '흐림'], ['brightness', '밝기'], ['contrast', '대비'], ['saturate', '채도'], ['grayscale', '흑백'], ['sepia', '세피아'], ['hueRotate', '색조 회전'], ['invert', '반전'], ['opacity', '불투명도']] },
      paramTypes: { targetLayerId: 'layer' },
      paramEmpty: { targetLayerId: '없음' },
      paramRanges: { delaySec: [0, 10, 0.05], filterValue: [0, 200, 1] }
    },
    toggle_switch: {
      category: 'logic', name: '토글 스위치', icon: 'TOG',
      description: '트리거 감지, 신호 수신 또는 클릭할 때마다 켜짐(ON)/꺼짐(OFF) 상태를 반전 전환하고 신호를 방출합니다.',
      defaultParams: { condition: 'always', inputSignal: '', initialValue: false },
      paramLabels: { inputSignal: '받을 신호 (비우면 클릭)', initialValue: '처음에 켜짐' }
    },
    counter_accumulator: {
      category: 'logic', name: '숫자 카운터', icon: 'CNT',
      description: '트리거 감지 또는 신호 발생 시마다 숫자를 증가시키고 텍스트/신호에 반영합니다.',
      defaultParams: { condition: 'always', inputSignal: '', startVal: 0, stepVal: 1, maxVal: 9999 },
      paramLabels: { inputSignal: '받을 신호 (비우면 클릭)', startVal: '시작값', stepVal: '증가량', maxVal: '최댓값' }
    },
    node_merge: {
      category: 'logic', name: '모듈 합치기', icon: 'MRG',
      description: '앞선 모듈들이 만든 변형 효과(또는 전달 값)에 가중치를 곱해 하나로 합칩니다.',
      defaultParams: { condition: 'always', blendMode: 'mix', weight: 1.0 },
      paramOptions: { blendMode: [['mix', '변형 효과 혼합'], ['value', '전달 값에 곱하기']] },
      paramLabels: { blendMode: '합치기 방식', weight: '가중치' }
    },
    node_math: {
      category: 'logic', name: '계산 및 설정 노드', icon: 'CALC',
      description: '이전 모듈이 전달한 수치에 연산(값 = 연산(입력, 계수) + 오프셋)을 적용해 다음 모듈로 넘깁니다.',
      defaultParams: { condition: 'always', op: 'multiply', factor: 1.5, offset: 0 },
      paramOptions: { op: [['add', '더하기'], ['subtract', '빼기'], ['multiply', '곱하기'], ['divide', '나누기'], ['power', '거듭제곱'], ['min', '최솟값'], ['max', '최댓값'], ['clamp', '0~계수 범위 제한'], ['modulo', '나머지']] },
      paramLabels: { op: '연산', factor: '계수', offset: '오프셋' }
    },

    // 3. Motion & Visual FX
    tween_interpolator: {
      category: 'motion', name: '트윈 보간 모션', icon: 'TWN',
      description: '원래 값에서 목표값까지 지정 시간 동안 부드럽게 변형합니다. 앞에 반복 루프·이징 모듈을 두면 그 설정을 따릅니다.',
      defaultParams: { condition: 'always', property: 'x', toValue: 200, duration: 1.0, easing: 'easeOutCubic' },
      paramOptions: { property: [['x','X 위치'],['y','Y 위치'],['rotation','회전 (도)'],['scale','크기 (배율)'],['scaleX','가로 배율'],['scaleY','세로 배율'],['opacity','불투명도 (0~1)']], easing: [['linear','선형 (Linear)'], ['easeInQuad','가속 (In Quad)'], ['easeOutQuad','감속 (Out Quad)'], ['easeInOutQuad','가감속 (InOut Quad)'], ['easeOutCubic','감속 (Out Cubic)'], ['easeInOutCubic','가감속 (InOut Cubic)'], ['easeOutBack','반동 (Out Back)'], ['elasticOut','탄성 (Elastic)'], ['bounceOut','바운스 (Bounce)'], ['expoOut','지수 감속 (Expo)']] },
      paramLabels: { property: '속성', toValue: '목표값', duration: '시간 (초)', easing: '이징' }
    },
    path_follower: {
      category: 'motion', name: '패스 주행 (Path)', icon: 'PATH',
      description: '펜 도구로 그린 벡터 곡선 경로를 따라 물체가 부드럽게 주행합니다.',
      defaultParams: { condition: 'always', pathLayerId: null, speed: 1.0, autoRotate: true }
    },
    mouse_tilt_3d: {
      category: 'motion', name: '마우스 3D 틸트', icon: '3D',
      description: '마우스 위치에 따라 카드처럼 입체적으로 기울어지는 효과를 냅니다.',
      defaultParams: { condition: 'always', maxTilt: 20, perspective: 800 },
      paramLabels: { maxTilt: '최대 기울기 (도)', perspective: '원근 거리 (작을수록 강함)' }
    },
    particle_emitter: {
      category: 'motion', name: '파티클 분출기', icon: 'FX',
      description: '반짝이, 스파크, 먼지 등의 파티클을 마우스나 위치에서 방출합니다.',
      defaultParams: { condition: 'always', rate: 10, speed: 80, particleColor: '#e4e4e7', lifetime: 0.8 },
      paramLabels: { rate: '초당 개수', speed: '속도 (px/초)', particleColor: '색', lifetime: '수명 (초)' },
      paramTypes: { particleColor: 'color' },
      paramRanges: { rate: [0, 200, 1], speed: [0, 1000, 1], lifetime: [0.05, 10, 0.05] }
    },
    motion_wave: {
      category: 'motion', name: '부유 진동 (Wave)', icon: 'WAVE',
      description: '공중에 떠 있는 것처럼 위아래/좌우로 은은하게 부유 진동합니다.',
      defaultParams: { condition: 'always', amplitude: 12, frequency: 1.5, axis: 'y' }
    },
    pulse_scale: {
      category: 'motion', name: '펄스 박동 효과', icon: 'PULS',
      description: '심장 박동처럼 크기가 주기적으로 커졌다 작아지는 효과입니다.',
      defaultParams: { condition: 'always', minScale: 0.92, maxScale: 1.08, speed: 2.0 },
      paramLabels: { minScale: '최소 크기', maxScale: '최대 크기', speed: '속도' },
      paramRanges: { minScale: [0.1, 3, 0.01], maxScale: [0.1, 3, 0.01], speed: [0, 20, 0.1] }
    },
    shake_vibrate: {
      category: 'motion', name: '흔들림 및 진동', icon: 'SHK',
      description: '타격감이나 지진처럼 무작위로 화면을 진동시킵니다.',
      defaultParams: { condition: 'always', intensity: 8, decay: 0.9 },
      paramLabels: { intensity: '세기 (px)' },
      paramRanges: { intensity: [0, 100, 0.5] },
      paramHidden: ['decay']
    },
    orbit_spin: {
      category: 'motion', name: '공전 및 자전', icon: 'SPIN',
      description: '자체 중심축으로 자전하거나 타겟 주위를 공전합니다.',
      defaultParams: { condition: 'always', speedDegPerSec: 45, radius: 0 },
      paramLabels: { speedDegPerSec: '회전 속도 (도/초)' },
      paramRanges: { speedDegPerSec: [-1440, 1440, 1] },
      paramHidden: ['radius']
    },
    wall_bounce: {
      category: 'motion', name: '벽면 튕기기 반사', icon: 'BOUN',
      description: '캔버스 가장자리에 닿으면 당구공처럼 튕겨져 나옵니다.',
      defaultParams: { condition: 'always', speedX: 120, speedY: 90, elasticity: 0.95 },
      paramLabels: { speedX: '가로 속도 (px/초)', speedY: '세로 속도 (px/초)' },
      paramRanges: { speedX: [-2000, 2000, 1], speedY: [-2000, 2000, 1] },
      paramHidden: ['elasticity']
    },
    rainbow_shift: {
      category: 'motion', name: '무지개 색상 순환', icon: 'RAIN',
      description: '시간 경과에 따라 색조(Hue)가 무지개색으로 부드럽게 순환합니다.',
      defaultParams: { condition: 'always', speed: 60, cycleDuration: 3.0 },
      paramLabels: { speed: '색 변화 속도 (도/초)' },
      paramRanges: { speed: [0, 720, 1] },
      paramHidden: ['cycleDuration']
    },

    // 4. Timing & Control
    timeline_keyframes: {
      category: 'timing', name: '타임라인 키프레임', icon: 'TL',
      description: '타임라인에 기록된 키프레임 보간 애니메이션을 모듈 단위로 실행하고 제어합니다.',
      defaultParams: { condition: 'always', playMode: 'timeline', speed: 1.0 },
      paramHidden: ['playMode', 'speed']
    },
    duration_delay: {
      category: 'timing', name: '듀레이션 및 지연', icon: 'DUR',
      description: '아래에 있는 모듈들을 지연 시간 뒤에 시작해 지속 시간 동안만 실행합니다 (지속 0 = 계속).',
      defaultParams: { condition: 'always', delay: 0.5, duration: 1.5 },
      paramLabels: { delay: '지연 (초)', duration: '지속 (초, 0=계속)' }
    },
    step_sequencer: {
      category: 'timing', name: '단계별 시퀀서', icon: 'SEQ',
      description: '단계(0, 1, 2, …)를 일정 간격으로 넘기며 단계마다 신호를 보내고, 현재 단계를 다음 모듈의 입력 값으로 넘깁니다.',
      defaultParams: { condition: 'always', stepCount: 4, stepInterval: 0.5, signalPrefix: 'step_' },
      paramLabels: { stepCount: '단계 수', stepInterval: '간격 (초)', signalPrefix: '신호 접두어' }
    },
    stagger_domino: {
      category: 'timing', name: '시차 도미노 모션', icon: 'STAG',
      description: '레이어 안 순서에 따라 (순서 × 시차)만큼 늦게 아래 모듈들을 시작해 도미노처럼 연쇄 동작합니다.',
      defaultParams: { condition: 'always', staggerDelay: 0.08 },
      paramLabels: { staggerDelay: '시차 (초)' }
    },
    easing_presets: {
      category: 'timing', name: '이징 커브 프리셋', icon: 'EASE',
      description: '아래에 있는 트윈 모듈에 Elastic, Bounce, Back, Expo 등의 가속도 곡선을 적용합니다.',
      defaultParams: { condition: 'always', curve: 'bounceOut' },
      paramOptions: { curve: [['linear','선형 (Linear)'], ['easeInQuad','가속 (In Quad)'], ['easeOutQuad','감속 (Out Quad)'], ['easeInOutQuad','가감속 (InOut Quad)'], ['easeOutCubic','감속 (Out Cubic)'], ['easeInOutCubic','가감속 (InOut Cubic)'], ['easeOutBack','반동 (Out Back)'], ['elasticOut','탄성 (Elastic)'], ['bounceOut','바운스 (Bounce)'], ['expoOut','지수 감속 (Expo)']] },
      paramLabels: { curve: '곡선' }
    },
    loop_mode: {
      category: 'timing', name: '반복 루프 모드', icon: 'LOOP',
      description: '아래에 있는 트윈·시퀀서·지연 모듈을 1회 실행, 무한 반복, 왕복 재생 중 하나로 동작시킵니다.',
      defaultParams: { condition: 'always', mode: 'infinite' },
      paramOptions: { mode: [['once', '1회 실행'], ['infinite', '무한 반복'], ['pingpong', '왕복 재생']] },
      paramLabels: { mode: '반복 방식' }
    },

    // 5. Audio
    synth_sfx: {
      category: 'audio', name: '내장 신디사이저 SFX', icon: 'SFX',
      description: '외부 파일 없이 뾱, 찰칵, 딩동, 팝, 스위치 효과음을 합성 재생합니다.',
      defaultParams: { condition: 'always', sound: 'pop', trigger: 'click', listenSignal: '', volume: 0.6 },
      paramOptions: { sound: [['pop', '팝'], ['click', '찰칵'], ['ding', '딩동'], ['switch', '스위치'], ['boop', '뾱'], ['whoosh', '휙']], trigger: [['click','클릭 시'],['hover','마우스 진입 시'],['trigger','트리거 발동 시'],['signal','신호 수신 시']] },
      paramLabels: { sound: '효과음', trigger: '재생 시점', listenSignal: '수신 신호 (신호 수신 시)', volume: '볼륨 (0~1)' }
    },
    audio_clip: {
      category: 'audio', name: '오디오 파일 재생', icon: 'AUD',
      description: '오디오 파일(URL)을 클릭, 진입, 트리거, 신호 시점에 재생합니다.',
      defaultParams: { condition: 'always', audioUrl: '', volume: 0.8, trigger: 'click', listenSignal: '', loop: false },
      paramOptions: { trigger: [['click','클릭 시'],['hover','마우스 진입 시'],['trigger','트리거 발동 시'],['signal','신호 수신 시']] },
      paramLabels: { audioUrl: '오디오 URL', volume: '볼륨 (0~1)', trigger: '재생 시점', listenSignal: '수신 신호 (신호 수신 시)', loop: '반복 재생' }
    },
    // ---------------- Web interaction modules ----------------
    scroll_progress: {
      category: 'motion', name: '스크롤 진행 연동', icon: 'SCRL',
      description: '페이지(또는 이 요소가 화면을 지나가는) 스크롤 진행률 0~1에 따라 속성을 시작값에서 끝값으로 바꿉니다. 패럴랙스에 사용합니다.',
      defaultParams: { condition: 'always', range: 'page', property: 'y', fromValue: 0, toValue: -200, outputMode: 'offset', easing: 'linear' },
      paramOptions: { range: [['page', '페이지 전체'], ['element', '요소가 화면을 지나는 동안']], property: [['x','X 위치'],['y','Y 위치'],['rotation','회전 (도)'],['scale','크기 (배율)'],['scaleX','가로 배율'],['scaleY','세로 배율'],['opacity','불투명도 (0~1)'],['filter_blur','필터: 흐림'],['filter_brightness','필터: 밝기'],['filter_hueRotate','필터: 색조 회전'],['filter_grayscale','필터: 흑백']], outputMode: [['offset', '원래 값에 더하기'], ['absolute', '절댓값으로 설정']], easing: [['linear','선형'],['easeOutQuad','감속 (Quad)'],['easeInOutQuad','가감속 (Quad)'],['easeOutCubic','감속 (Cubic)'],['easeInOutCubic','가감속 (Cubic)'],['easeOutBack','반동 (Back)'],['elasticOut','탄성'],['bounceOut','바운스'],['expoOut','지수 감속']] },
      paramLabels: { range: '진행 기준', property: '속성', fromValue: '시작값', toValue: '끝값', outputMode: '출력 방식', easing: '이징' }
    },
    entrance_animation: {
      category: 'web', name: '등장 애니메이션', icon: 'IN',
      description: '화면에 들어오면 페이드업, 슬라이드, 줌 등으로 등장합니다. 들어오기 전에는 숨겨져 있습니다.',
      defaultParams: { condition: 'always', effect: 'fade_up', distance: 40, duration: 0.7, delay: 0, easing: 'easeOutCubic', startOn: 'visible', once: true },
      paramOptions: {
        effect: [['fade_up', '페이드 업'], ['fade_down', '페이드 다운'], ['fade_in', '페이드 인'], ['slide_left', '왼쪽에서 슬라이드'], ['slide_right', '오른쪽에서 슬라이드'], ['zoom_in', '줌 인'], ['zoom_out', '줌 아웃'], ['rotate_in', '회전하며 등장']],
        easing: [['linear','선형'],['easeOutQuad','감속 (Quad)'],['easeInOutQuad','가감속 (Quad)'],['easeOutCubic','감속 (Cubic)'],['easeInOutCubic','가감속 (Cubic)'],['easeOutBack','반동 (Back)'],['elasticOut','탄성'],['bounceOut','바운스'],['expoOut','지수 감속']], startOn: [['visible', '화면에 보일 때'], ['load', '시작하자마자']]
      },
      paramLabels: { effect: '효과', distance: '이동 거리 (px)', duration: '시간 (초)', delay: '지연 (초)', easing: '이징', startOn: '시작 시점', once: '한 번만 재생' }
    },
    state_style: {
      category: 'web', name: '상태 전환 스타일', icon: 'STAT',
      description: '마우스를 올리거나 누를 때 채우기·테두리·글자색·크기를 부드럽게 바꿉니다. 버튼 호버 효과에 사용합니다. (빈 칸은 바꾸지 않음)',
      defaultParams: { condition: 'always', hoverFill: '#3f3f46', pressFill: '#52525b', hoverStroke: '', hoverTextColor: '', hoverScale: 1.04, pressScale: 0.97, transition: 0.15 },
      paramLabels: { hoverFill: '호버 채우기 색', pressFill: '눌림 채우기 색', hoverStroke: '호버 테두리 색', hoverTextColor: '호버 글자 색', hoverScale: '호버 크기', pressScale: '눌림 크기', transition: '전환 시간 (초)' },
      paramTypes: { hoverFill: 'color', pressFill: 'color', hoverStroke: 'color', hoverTextColor: 'color' },
      paramEmpty: { hoverFill: '바꾸지 않음', pressFill: '바꾸지 않음', hoverStroke: '바꾸지 않음', hoverTextColor: '바꾸지 않음' }
    },
    count_up: {
      category: 'web', name: '숫자 카운트업', icon: '123',
      description: '화면에 들어오면 텍스트를 시작값에서 목표 숫자까지 올립니다. (예: 1,200+ 고객)',
      defaultParams: { condition: 'always', from: 0, to: 1200, duration: 1.6, decimals: 0, prefix: '', suffix: '+', separator: true, startOn: 'visible', easing: 'easeOutCubic' },
      paramOptions: { startOn: [['visible', '화면에 보일 때'], ['load', '시작하자마자']], easing: [['linear','선형'],['easeOutQuad','감속 (Quad)'],['easeInOutQuad','가감속 (Quad)'],['easeOutCubic','감속 (Cubic)'],['easeInOutCubic','가감속 (Cubic)'],['easeOutBack','반동 (Back)'],['elasticOut','탄성'],['bounceOut','바운스'],['expoOut','지수 감속']] },
      paramLabels: { from: '시작값', to: '목표값', duration: '시간 (초)', decimals: '소수 자릿수', prefix: '앞 글자', suffix: '뒤 글자', separator: '천 단위 쉼표', startOn: '시작 시점', easing: '이징' }
    },
    typewriter: {
      category: 'web', name: '타자기 텍스트', icon: 'TYPE',
      description: '텍스트를 한 글자씩 타이핑하듯 보여 주고 커서를 깜빡입니다. 반복 시 지웠다가 다시 씁니다.',
      defaultParams: { condition: 'always', charsPerSec: 14, startDelay: 0.3, cursor: '|', loop: false, holdSec: 1.5, startOn: 'visible' },
      paramOptions: { startOn: [['visible', '화면에 보일 때'], ['load', '시작하자마자']] },
      paramLabels: { charsPerSec: '초당 글자 수', startDelay: '시작 지연 (초)', cursor: '커서 문자 (비우면 없음)', loop: '반복 (지우고 다시 쓰기)', holdSec: '완성 후 유지 (초)', startOn: '시작 시점' }
    },
    magnetic: {
      category: 'motion', name: '마그네틱 끌림', icon: 'MAG',
      description: '커서가 가까이 오면 스프라이트가 커서 쪽으로 살짝 끌려옵니다.',
      defaultParams: { condition: 'always', radius: 120, strength: 0.35, smoothing: 0.18 },
      paramLabels: { radius: '감지 반경 (px)', strength: '끌림 세기 (0~1)', smoothing: '부드러움 (0~1)' }
    },
    cursor_fx: {
      category: 'motion', name: '커서 트레일 / 커스텀 커서', icon: 'CUR',
      description: '트레일: 커서를 따라 잔상 입자를 남깁니다. 커스텀 커서: 이 스프라이트가 시스템 커서를 대신합니다.',
      defaultParams: { condition: 'always', mode: 'trail', color: '#e4e4e7', size: 5, lifetime: 0.5, lag: 0 },
      paramOptions: { mode: [['trail', '커서 트레일'], ['cursor', '커스텀 커서 (이 스프라이트)']] },
      paramLabels: { mode: '방식', color: '트레일 색', size: '트레일 크기', lifetime: '잔상 시간 (초)', lag: '따라오는 지연 (0~0.95)' },
      paramTypes: { color: 'color' }
    },
    property_binding: {
      category: 'logic', name: '속성 바인딩', icon: 'BIND',
      description: '다른 스프라이트의 속성 값을 (값 × 계수 + 오프셋)으로 따라 합니다.',
      defaultParams: { condition: 'always', targetSpriteId: '', sourceProperty: 'x', targetProperty: 'x', factor: 1, offset: 0 },
      paramOptions: { sourceProperty: [['x','X 위치'],['y','Y 위치'],['rotation','회전 (도)'],['scale','크기 (배율)'],['scaleX','가로 배율'],['scaleY','세로 배율'],['opacity','불투명도 (0~1)']], targetProperty: [['x','X 위치'],['y','Y 위치'],['rotation','회전 (도)'],['scale','크기 (배율)'],['scaleX','가로 배율'],['scaleY','세로 배율'],['opacity','불투명도 (0~1)'],['filter_blur','필터: 흐림'],['filter_brightness','필터: 밝기'],['filter_hueRotate','필터: 색조 회전'],['filter_grayscale','필터: 흑백']] },
      paramLabels: { targetSpriteId: '원본 스프라이트', sourceProperty: '원본 속성', targetProperty: '적용할 속성', factor: '계수', offset: '오프셋' }
    },
    condition_branch: {
      category: 'logic', name: '조건 분기 (If)', icon: 'IF',
      description: '입력 값을 기준값과 비교해 참/거짓이 바뀔 때 신호를 보냅니다. 거짓이면 아래 모듈을 멈출 수 있습니다.',
      defaultParams: { condition: 'always', inputSource: 'stack', varName: 'score', compare: '>=', threshold: 10, signalTrue: 'if_true', signalFalse: 'if_false', gateBelow: true },
      paramOptions: { inputSource: [['mouse_x','마우스 X'],['mouse_y','마우스 Y'],['mouse_distance','마우스와의 거리'],['mouse_speed','마우스 속도'],['time','경과 시간 (초)'],['scroll','스크롤 위치'],['scroll_progress','스크롤 진행률 (0~1)'],['variable','전역 변수'],['audio_level','소리 크기 (0~1)'],['stack','이전 모듈 값']], compare: [['>', '>'], ['>=', '≥'], ['<', '<'], ['<=', '≤'], ['==', '='], ['!=', '≠']] },
      paramLabels: { inputSource: '입력 소스', varName: '변수 이름 (전역 변수 입력 시)', compare: '비교', threshold: '기준값', signalTrue: '참이 될 때 신호', signalFalse: '거짓이 될 때 신호', gateBelow: '거짓이면 아래 모듈 정지' }
    },
    global_variable: {
      category: 'logic', name: '전역 변수', icon: 'VAR',
      description: '문서 전체가 공유하는 변수를 설정·증감·토글하거나 읽습니다. 텍스트 스프라이트에 값을 표시할 수 있습니다.',
      defaultParams: { condition: 'always', varName: 'score', action: 'add', value: 1, fireOn: 'click', listenSignal: '', initialValue: 0, displayTemplate: '' },
      paramOptions: { action: [['read', '읽기 (값 전달만)'], ['set', '값으로 설정'], ['add', '값만큼 더하기'], ['toggle', '0/1 토글']], fireOn: [['click','클릭 시'],['hover','마우스 진입 시'],['trigger','트리거 발동 시'],['signal','신호 수신 시'],['always','항상 (매 프레임)']] },
      paramLabels: { varName: '변수 이름', action: '동작', value: '값', fireOn: '실행 시점', listenSignal: '수신 신호 (신호 수신 시)', initialValue: '초기값', displayTemplate: '텍스트 표시 (예: 점수: {value})' }
    },
    physics_body: {
      category: 'motion', name: '중력 및 물리 바디', icon: 'PHYS',
      description: '중력으로 떨어지고 캔버스 가장자리에 튕깁니다. 드래그 모듈과 함께 쓰면 던질 수 있습니다.',
      defaultParams: { condition: 'always', gravity: 900, bounce: 0.6, friction: 0.12, collideEdges: true },
      paramLabels: { gravity: '중력 (px/s²)', bounce: '반발 (0~1)', friction: '바닥 마찰 (0~1)', collideEdges: '가장자리 충돌' }
    },
    audio_reactive: {
      category: 'audio', name: '소리 반응', icon: 'MIC',
      description: '마이크 또는 문서의 효과음·오디오 크기(0~1)에 따라 속성을 바꿉니다. 마이크는 처음 사용할 때 권한을 요청합니다.',
      defaultParams: { condition: 'always', source: 'microphone', sensitivity: 1.5, smoothing: 0.25, property: 'scale', minValue: 1, maxValue: 1.4 },
      paramOptions: { source: [['microphone', '마이크'], ['document', '문서 효과음·오디오']], property: [['x','X 위치'],['y','Y 위치'],['rotation','회전 (도)'],['scale','크기 (배율)'],['scaleX','가로 배율'],['scaleY','세로 배율'],['opacity','불투명도 (0~1)'],['filter_blur','필터: 흐림'],['filter_brightness','필터: 밝기'],['filter_hueRotate','필터: 색조 회전'],['filter_grayscale','필터: 흑백']] },
      paramLabels: { source: '소리 입력', sensitivity: '감도', smoothing: '부드러움 (0~1)', property: '속성', minValue: '조용할 때 값', maxValue: '최대 소리일 때 값' }
    },
    action_rules: {
      category: 'logic', name: '동작 블록 (언제 → 무엇을)', icon: 'DO',
      description: '발동 조건(클릭, 신호, 키 등)이 되면 이동·색 바꾸기·신호 보내기 같은 동작을 위에서부터 차례로 실행합니다. 코드 없이 스크립트를 대신합니다.',
      defaultParams: { condition: 'on_click', repeat: 'once', retrigger: 'restart',
        steps: [{ type: 'move_by', spriteId: '', dx: 100, dy: 0, duration: 0.5, ease: 'easeOutCubic' }] },
      paramOptions: { repeat: [['once', '한 번 실행'], ['loop', '계속 반복']], retrigger: [['restart', '처음부터 다시'], ['ignore', '끝날 때까지 무시']] },
      paramLabels: { repeat: '반복', retrigger: '실행 중에 다시 발동하면' }
    },
    custom_script: {
      category: 'logic', advanced: true, name: '사용자 스크립트 (JS)', icon: 'JS',
      description: '(고급) 직접 작성한 자바스크립트를 매 프레임(또는 시작할 때 한 번) 실행합니다. api 객체로 스프라이트·입력·변수·신호를 다룹니다.',
      defaultParams: { condition: 'always', runOn: 'frame', code: "// api.self 로 이 스프라이트를, api.mouse / api.time 등으로 입력을 다룹니다.\n// 예: 마우스 쪽을 바라보며 천천히 커졌다 작아지기\nconst dx = api.mouse.x - api.self.x;\nconst dy = api.mouse.y - api.self.y;\napi.self.rotation = Math.atan2(dy, dx) * 180 / Math.PI;\napi.self.scale = 1 + Math.sin(api.time * 2) * 0.1;" },
      paramOptions: { runOn: [['frame', '매 프레임'], ['start', '시작할 때 한 번']] },
      paramLabels: { runOn: '실행 시점', code: '코드' },
      paramTypes: { code: 'code' }
    },
    form_submit: {
      category: 'web', name: '폼 전송 버튼', icon: 'SEND',
      description: '클릭하면 같은 레이어(또는 문서 전체)의 입력칸을 검증하고 메일·서버(POST)로 보내거나 신호만 보냅니다. 결과 문구를 텍스트 스프라이트에 표시할 수 있습니다.',
      defaultParams: { condition: 'always', action: 'mailto', url: '', subject: '웹사이트 문의', encoding: 'json', scope: 'layer',
        messageSpriteId: '', successMessage: '전송되었습니다. 감사합니다!', errorMessage: '전송에 실패했습니다. 잠시 후 다시 시도해 주세요.',
        resetOnSuccess: true, successSignal: 'form_success', errorSignal: 'form_error' },
      paramOptions: {
        action: [['mailto', '메일 앱으로 보내기 (mailto)'], ['post', '서버로 전송 (POST)'], ['signal', '신호만 보내기']],
        encoding: [['json', 'JSON'], ['form', '폼 형식 (x-www-form-urlencoded)']],
        scope: [['layer', '같은 레이어의 입력칸'], ['document', '문서 전체 입력칸']]
      },
      paramLabels: { action: '전송 방식', url: '받는 주소 (메일 주소 또는 https URL)', subject: '메일 제목', encoding: 'POST 형식', scope: '보낼 입력칸',
        messageSpriteId: '결과 문구를 표시할 스프라이트', successMessage: '성공 문구', errorMessage: '실패 문구', resetOnSuccess: '성공 후 입력칸 비우기',
        successSignal: '성공 신호', errorSignal: '실패 신호' }
    },
    scene_transition: {
      category: 'web', name: '씬 전환 / 섹션 이동', icon: 'SCN',
      description: '클릭·신호 등에 반응해 다른 섹션(스프라이트)으로 부드럽게 이동하거나 페이지를 엽니다. 페이드 전환을 지원합니다.',
      defaultParams: { condition: 'always', fireOn: 'click', listenSignal: '', action: 'section', targetSpriteId: '', url: '', transition: 'smooth', duration: 0.6 },
      paramOptions: { fireOn: [['click','클릭 시'],['hover','마우스 진입 시'],['trigger','트리거 발동 시'],['signal','신호 수신 시']], action: [['section', '섹션(스프라이트)으로 이동'], ['url', 'URL 열기']], transition: [['smooth', '부드러운 스크롤'], ['fade', '페이드 전환'], ['instant', '즉시']] },
      paramLabels: { fireOn: '실행 시점', listenSignal: '수신 신호 (신호 수신 시)', action: '동작', targetSpriteId: '이동할 섹션', url: 'URL', transition: '전환 효과', duration: '전환 시간 (초)' }
    }
  };

  // Fields that connect modules by name. The inspector shows them as lists of
  // the names the document already uses, with how many places send / receive
  // each one, so a connection cannot silently break by a typo.
  //   signal-out: the module sends it   signal-in: it waits for it   var: a variable
  // paramShowIf: { field: [otherField, ...values] } - shown only for those values.
  (() => {
    const meta = (type, types, showIf, labels, empty) => {
      const def = MODULE_REGISTRY[type];
      def.paramTypes = Object.assign({}, def.paramTypes, types);
      if (showIf) def.paramShowIf = Object.assign({}, def.paramShowIf, showIf);
      if (labels) def.paramLabels = Object.assign({}, def.paramLabels, labels);
      if (empty) def.paramEmpty = Object.assign({}, def.paramEmpty, empty);
    };
    const filterActions = ['action', 'animate_filter', 'set_filter'];
    meta('hyperlink', { signalName: 'signal-in' }, { signalName: ['trigger', 'signal'] }, { signalName: '받을 신호' }, { signalName: '고르세요' });
    meta('mouse_position', { signalName: 'signal-out' }, null, { signalName: '움직이면 보낼 신호' }, { signalName: '보내지 않음' });
    meta('collision_detector', { signalName: 'signal-out' }, null, { signalName: '부딪히면 보낼 신호' }, { signalName: "기본: 'collision'" });
    meta('viewport_visibility', { signalName: 'signal-out' }, null, { signalName: '화면에 들어오면 보낼 신호' }, { signalName: "기본: 'visible'" });
    meta('timer_interval', { signalName: 'signal-out' }, null, { signalName: '주기마다 보낼 신호' }, { signalName: "기본: 'timer_tick'" });
    meta('screen_trigger', { signalName: 'signal-out' }, { filterEffect: filterActions, filterValue: filterActions }, null, { signalName: '자동 이름' });
    // The relay always sends its signal and triggers its target; the action adds to that.
    meta('signal_relay', { inputSignal: 'signal-in', outputSignal: 'signal-out' }, { filterEffect: filterActions, filterValue: filterActions },
      null, { inputSignal: '아무 신호나', outputSignal: "기본: 'signal_relayed'" });
    meta('toggle_switch', { inputSignal: 'signal-in' }, null, { inputSignal: '받을 신호' }, { inputSignal: '없음: 클릭하면 전환' });
    meta('counter_accumulator', { inputSignal: 'signal-in' }, null, { inputSignal: '받을 신호' }, { inputSignal: '없음: 클릭하면 증가' });
    meta('synth_sfx', { listenSignal: 'signal-in' }, { listenSignal: ['trigger', 'signal'] }, { listenSignal: '받을 신호' }, { listenSignal: '고르세요' });
    meta('audio_clip', { listenSignal: 'signal-in' }, { listenSignal: ['trigger', 'signal'] }, { listenSignal: '받을 신호' }, { listenSignal: '고르세요' });
    meta('global_variable', { varName: 'var', listenSignal: 'signal-in', displayTemplate: 'template' },
      { listenSignal: ['fireOn', 'signal'], value: ['action', 'set', 'add'], fireOn: ['action', 'set', 'add', 'toggle'] },
      { varName: '변수', listenSignal: '받을 신호', displayTemplate: '값을 글자로 표시' }, { varName: '고르세요', listenSignal: '고르세요' });
    meta('scene_transition', { listenSignal: 'signal-in' }, { listenSignal: ['fireOn', 'signal'], targetSpriteId: ['action', 'section'], url: ['action', 'url'] },
      { listenSignal: '받을 신호' }, { listenSignal: '고르세요', targetSpriteId: '고르세요' });
    meta('condition_branch', { varName: 'var', signalTrue: 'signal-out', signalFalse: 'signal-out' }, { varName: ['inputSource', 'variable'] },
      { varName: '변수' }, { varName: '고르세요', signalTrue: '보내지 않음', signalFalse: '보내지 않음' });
    meta('value_remapper', { varName: 'var' }, { varName: ['inputSource', 'variable'] }, { varName: '변수' }, { varName: '고르세요' });
    meta('form_submit', { successSignal: 'signal-out', errorSignal: 'signal-out' }, { url: ['action', 'mailto', 'post'], subject: ['action', 'mailto'], encoding: ['action', 'post'] },
      null, { successSignal: "기본: 'form_success'", errorSignal: "기본: 'form_error'" });
    meta('step_sequencer', {}, null, { signalPrefix: '신호 이름 앞부분 (뒤에 단계 번호)' });
  })();

  // ==========================================================================
  // 3. Sprite & Layer Models (Photoshop Layer Hierarchy)
  // ==========================================================================
  class Sprite {
    // Optional fields that are saved only when set (text styling, brush canvas,
    // responsive overrides, form fields, accessibility, ...).
    static extraFields() {
      return ['textColor', 'isBrushCanvas', 'letterSpacing', 'lineHeight', 'fontStyle', 'textDecoration',
        'valign', 'responsive', 'form', 'alt', 'headingLevel', 'imageFit', 'naturalWidth', 'naturalHeight', 'pin'];
    }

    // Project files are untrusted: every field gets its expected type on load.
    static num(value, fallback) {
      if (typeof value === 'number' && isFinite(value)) return value;
      if (typeof value === 'string' && value.trim() !== '' && isFinite(Number(value))) return Number(value);
      return fallback;
    }

    static str(value) {
      return value === undefined || value === null || value === '' || value === false ? '' : String(value);
    }

    // Properties that can be animated. Any other keyframe track is dropped:
    // playback assigns `sprite[prop]`, so e.g. `modules` would inject modules.
    static animatableProps() {
      return ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'width', 'height', 'opacity'];
    }

    static cleanKeyframes(tracks) {
      const out = {};
      if (!tracks || typeof tracks !== 'object') return out;
      for (const prop of Object.keys(tracks)) {
        if (!Sprite.animatableProps().includes(prop) || !Array.isArray(tracks[prop])) continue;
        const list = [];
        for (const k of tracks[prop]) {
          const frame = Sprite.num(k && k.frame), value = Sprite.num(k && k.value);
          if (frame !== undefined && value !== undefined) list.push(Object.assign({}, k, { frame, value }));
        }
        out[prop] = list;
      }
      return out;
    }

    static cleanModules(modules) {
      if (!Array.isArray(modules)) return [];
      const list = modules.filter(m => m && typeof m === 'object');
      for (const m of list) {
        for (const k of ['id', 'type', 'name']) if (m[k] !== undefined) m[k] = Sprite.str(m[k]);
        if (m.params === undefined) continue;
        if (!m.params || typeof m.params !== 'object') m.params = {};
        for (const k of ['color', 'fontFamily', 'fontWeight', 'targetSpriteId', 'messageSpriteId', 'pathSpriteId']) {
          if (m.params[k] !== undefined && m.params[k] !== null) m.params[k] = Sprite.str(m.params[k]);
        }
      }
      return list;
    }

    static cleanFilters(filters) {
      if (!filters || typeof filters !== 'object') return null;
      const full = ['brightness', 'contrast', 'saturate', 'opacity'];
      for (const k of ['blur', 'grayscale', 'sepia', 'hueRotate', 'invert'].concat(full)) {
        if (filters[k] !== undefined) filters[k] = Sprite.num(filters[k], full.includes(k) ? 100 : 0);
      }
      return filters;
    }

    static cleanGradient(gradient) {
      if (!gradient || typeof gradient !== 'object') return null;
      if (gradient.angle !== undefined) gradient.angle = Sprite.num(gradient.angle, 0);
      if (gradient.stops !== undefined) {
        gradient.stops = (Array.isArray(gradient.stops) ? gradient.stops : []).filter(s => s && typeof s === 'object');
        for (const s of gradient.stops) {
          s.offset = Sprite.num(s.offset, 0);
          s.color = Sprite.str(s.color) || '#000000';
        }
      }
      return gradient;
    }

    static cleanResponsive(responsive) {
      if (!responsive || typeof responsive !== 'object') return undefined;
      for (const view of Object.keys(responsive)) {
        const o = responsive[view];
        if (!o || typeof o !== 'object') { delete responsive[view]; continue; }
        for (const k of Object.keys(o)) {
          if (k === 'visible') { o[k] = o[k] !== false; continue; }
          const v = Sprite.num(o[k]);
          if (v === undefined) delete o[k]; else o[k] = v;
        }
      }
      return responsive;
    }

    constructor(options = {}) {
      const num = Sprite.num, str = Sprite.str;
      for (const f of Sprite.extraFields()) {
        if (options[f] !== undefined && options[f] !== null) this[f] = JSON.parse(JSON.stringify(options[f]));
      }
      for (const f of ['letterSpacing', 'lineHeight', 'naturalWidth', 'naturalHeight']) {
        if (this[f] === undefined) continue;
        const v = num(this[f]);
        if (v === undefined) delete this[f]; else this[f] = v;
      }
      if (this.textColor !== undefined) this.textColor = str(this.textColor);
      if (this.responsive !== undefined) this.responsive = Sprite.cleanResponsive(this.responsive);
      // Where it sticks when the width changes (unset: decided from the layout).
      if (this.pin !== undefined && !Reflow.pins().includes(this.pin)) delete this.pin;
      this.id = str(options.id) || 'sprite_' + Math.random().toString(36).substr(2, 9);
      this.name = str(options.name) || '스프라이트';
      this.type = str(options.type) || 'rect'; // 'rect' | 'circle' | 'path' | 'brush' | 'text' | 'image' | 'empty'
      this.x = num(options.x, 400);
      this.y = num(options.y, 300);
      this._width = Math.max(1, num(options.width, 120));
      this._height = Math.max(1, num(options.height, 120));
      this.rotation = num(options.rotation, 0);
      this.scaleX = num(options.scaleX, 1);
      this.scaleY = num(options.scaleY, 1);
      this.lockAspectRatio = options.lockAspectRatio || false;

      this._opacity = Math.max(0, Math.min(1, num(options.opacity, 1)));
      this.blendMode = str(options.blendMode) || 'source-over';
      this.fillType = str(options.fillType) || 'solid';
      this.fill = str(options.fill) || '#38bdf8';
      this.gradient = Sprite.cleanGradient(options.gradient) || {
        startX: 0, startY: 0, endX: 120, endY: 120,
        stops: [{ offset: 0, color: '#38bdf8' }, { offset: 1, color: '#818cf8' }]
      };

      this.stroke = str(options.stroke) || '#0284c7';
      this._strokeWidth = Math.max(0, num(options.strokeWidth, 0));
      this.strokeOpacity = Math.max(0, Math.min(1, num(options.strokeOpacity, 1)));
      this.fillOpacity = Math.max(0, Math.min(1, num(options.fillOpacity, 1)));
      this.bevel = Math.max(0, num(options.bevel, 0));
      this._cornerRadius = Math.max(0, num(options.cornerRadius, 0));
      this._bevelChamfer = Math.max(0, num(options.bevelChamfer, 0) || num(options.cornerRadius, 0));

      this.pathPoints = options.pathPoints || [];
      this.isClosedPath = options.isClosedPath !== undefined ? options.isClosedPath : true;
      this.strokes = options.strokes || [];
      this.brushStrokePoints = options.brushStrokePoints || [];
      this.brushSize = Math.max(1, num(options.brushSize, 0) || 6);

      this.text = options.text !== undefined ? String(options.text ?? '') : (options.type === 'text' ? '텍스트' : '');
      this._fontSize = Math.max(1, num(options.fontSize, 0) || 32);
      this.fontFamily = str(options.fontFamily) || 'Pretendard, sans-serif';
      this.fontWeight = str(options.fontWeight) || 'bold';
      this.textAlign = str(options.textAlign) || 'center';

      this.imageUrl = str(options.imageUrl);
      this.visible = options.visible !== undefined ? options.visible : true;
      this.locked = options.locked || false;
      this.modules = Sprite.cleanModules(options.modules);
      this.keyframes = Sprite.cleanKeyframes(options.keyframes);
      this.linkGroup = str(options.linkGroup) || null;
      this.tag = str(options.tag) || 'div';
      this.linkUrl = str(options.linkUrl);
      this.linkTarget = str(options.linkTarget) || '_blank'; // '_blank' | '_self'
      this.anchorId = str(options.anchorId);
      this.cssClass = str(options.cssClass);
      this.hoverEffect = str(options.hoverEffect) || 'none';
      this.collapsed = options.collapsed || false;
      this.triggerEvent = options.triggerEvent || 'viewport_enter';
      this.triggerAction = options.triggerAction || 'trigger_module';
      this.targetSpriteId = str(options.targetSpriteId);
      this.targetModuleId = str(options.targetModuleId);
      this.signalName = str(options.signalName);
      this.filterEffect = options.filterEffect || 'blur';
      this.filterValue = options.filterValue !== undefined ? options.filterValue : 20;

      // Photoshop-style Mask & Clipping Mask support
      this.isMask = options.isMask || false;
      this.maskMode = options.maskMode || 'none'; // 'none' | 'clip_mask' | 'inverted_mask'
      this.maskTargetId = options.maskTargetId || null;

      this.filters = Sprite.cleanFilters(options.filters) || {
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        invert: 0,
        opacity: 100,
        dropShadow: false
      };
      if (this.filters.opacity === undefined) this.filters.opacity = 100;

      this.runtime = {
        x: this.x, y: this.y, rotation: this.rotation,
        scaleX: this.scaleX, scaleY: this.scaleY, opacity: this.opacity,
        tiltAngle: 0, vx: 0, vy: 0, isHovered: false
      };
    }

    resetRuntime() {
      this.runtime._cond = null;
      this.runtime.x = this.x;
      this.runtime.y = this.y;
      this.runtime.rotation = this.rotation;
      this.runtime.scaleX = this.scaleX;
      this.runtime.scaleY = this.scaleY;
      this.runtime.opacity = this.opacity;
      this.runtime.tiltAngle = 0;
      this.runtime.vx = 0;
      this.runtime.vy = 0;
      this.runtime.isHovered = false;
    }

    addKeyframe(prop, frame, value, ease = 'ease') {
      if (!this.keyframes[prop]) this.keyframes[prop] = [];
      const list = this.keyframes[prop];
      const existing = list.find(k => k.frame === frame);
      if (existing) {
        existing.value = value;
        existing.ease = ease;
      } else {
        list.push({ frame, value, ease });
        list.sort((a, b) => a.frame - b.frame);
      }
    }

    removeKeyframe(prop, frame) {
      if (!this.keyframes[prop]) return;
      this.keyframes[prop] = this.keyframes[prop].filter(k => k.frame !== frame);
      if (this.keyframes[prop].length === 0) delete this.keyframes[prop];
    }

    evaluateKeyframes(frame) {
      for (const prop in this.keyframes) {
        const kfs = this.keyframes[prop];
        if (!kfs || kfs.length === 0) continue;
        let val = kfs[0].value;
        if (frame <= kfs[0].frame) {
          val = kfs[0].value;
        } else if (frame >= kfs[kfs.length - 1].frame) {
          val = kfs[kfs.length - 1].value;
        } else {
          for (let i = 0; i < kfs.length - 1; i++) {
            const k0 = kfs[i], k1 = kfs[i + 1];
            if (frame >= k0.frame && frame <= k1.frame) {
              let t = (frame - k0.frame) / (k1.frame - k0.frame);
              if (k1.ease === 'ease' || !k1.ease) t = t * t * (3 - 2 * t);
              else if (k1.ease === 'step') t = 0;
              val = k0.value + (k1.value - k0.value) * t;
              break;
            }
          }
        }
        this.runtime[prop] = val;
        this[prop] = val;
      }
    }

    toJSON() {
      return {
        id: this.id, name: this.name, type: this.type,
        x: this.x, y: this.y, width: this.width, height: this.height,
        rotation: this.rotation, scaleX: this.scaleX, scaleY: this.scaleY,
        lockAspectRatio: this.lockAspectRatio, opacity: this.opacity,
        blendMode: this.blendMode, fillType: this.fillType, fill: this.fill,
        fillOpacity: this.fillOpacity,
        gradient: JSON.parse(JSON.stringify(this.gradient)),
        stroke: this.stroke, strokeWidth: this.strokeWidth, strokeOpacity: this.strokeOpacity,
        bevel: this.bevel, cornerRadius: this.cornerRadius,
        pathPoints: JSON.parse(JSON.stringify(this.pathPoints)),
        isClosedPath: this.isClosedPath,
        brushStrokePoints: JSON.parse(JSON.stringify(this.brushStrokePoints || [])),
        brushSize: this.brushSize,
        strokes: JSON.parse(JSON.stringify(this.strokes)),
        text: this.text, fontSize: this.fontSize, fontFamily: this.fontFamily,
        fontWeight: this.fontWeight, textAlign: this.textAlign,
        imageUrl: this.imageUrl, visible: this.visible, locked: this.locked,
        modules: JSON.parse(JSON.stringify(this.modules)),
        keyframes: JSON.parse(JSON.stringify(this.keyframes)),
        linkGroup: this.linkGroup,
        tag: this.tag,
        linkUrl: this.linkUrl,
        linkTarget: this.linkTarget,
        anchorId: this.anchorId,
        cssClass: this.cssClass,
        hoverEffect: this.hoverEffect,
        collapsed: this.collapsed,
        triggerEvent: this.triggerEvent,
        triggerAction: this.triggerAction,
        targetSpriteId: this.targetSpriteId,
        targetModuleId: this.targetModuleId,
        signalName: this.signalName,
        filterEffect: this.filterEffect,
        filterValue: this.filterValue,
        isMask: this.isMask,
        maskMode: this.maskMode,
        maskTargetId: this.maskTargetId,
        filters: JSON.parse(JSON.stringify(this.filters || {})),
        ...Object.fromEntries(Sprite.extraFields().filter(f => this[f] !== undefined && this[f] !== null)
          .map(f => [f, JSON.parse(JSON.stringify(this[f]))]))
      };
    }

    get width() { return Math.max(1, this._width !== undefined ? this._width : 120); }
    set width(v) { this._width = Math.max(1, Number(v) || 1); }
    get height() { return Math.max(1, this._height !== undefined ? this._height : 120); }
    set height(v) { this._height = Math.max(1, Number(v) || 1); }
    get opacity() { return Math.max(0, Math.min(1, this._opacity !== undefined ? this._opacity : 1)); }
    set opacity(v) { this._opacity = Math.max(0, Math.min(1, Number(v) || 0)); }
    get strokeWidth() { return Math.max(0, this._strokeWidth !== undefined ? this._strokeWidth : 0); }
    set strokeWidth(v) { this._strokeWidth = Math.max(0, Number(v) || 0); }
    get cornerRadius() { return Math.max(0, this._cornerRadius !== undefined ? this._cornerRadius : 0); }
    set cornerRadius(v) { this._cornerRadius = Math.max(0, Number(v) || 0); }
    get bevelChamfer() { return Math.max(0, this._bevelChamfer !== undefined ? this._bevelChamfer : 0); }
    set bevelChamfer(v) { this._bevelChamfer = Math.max(0, Number(v) || 0); }
    get fontSize() { return Math.max(1, this._fontSize !== undefined ? this._fontSize : 16); }
    set fontSize(v) { this._fontSize = Math.max(1, Number(v) || 1); }
  }

  class Layer {
    constructor(options = {}) {
      this.id = Sprite.str(options.id) || 'layer_' + Math.random().toString(36).substr(2, 9);
      this.name = Sprite.str(options.name) || '새 레이어';
      this.visible = options.visible !== undefined ? options.visible : true;
      this.locked = options.locked || false;
      this.opacity = Sprite.num(options.opacity, 1);
      this.blendMode = Sprite.str(options.blendMode) || 'source-over';
      this.zIndex = Sprite.num(options.zIndex, 0);
      this.expanded = options.expanded !== undefined ? options.expanded : true;
      this.modules = Sprite.cleanModules(options.modules);
      this.filters = Sprite.cleanFilters(options.filters) || {
        blur: 0,
        brightness: 100,
        contrast: 100,
        saturate: 100,
        grayscale: 0,
        sepia: 0,
        hueRotate: 0,
        invert: 0,
        opacity: 100,
        dropShadow: false
      };

      this.sprites = [];
      if (Array.isArray(options.sprites)) {
        this.sprites = options.sprites.map(s => (s instanceof Sprite ? s : new Sprite(s)));
      } else if (options.type) {
        // Backward-compatibility: auto wrap flat layer into a child sprite
        this.sprites.push(new Sprite(options));
      }
    }

    // Delegation to primary sprite for backwards compatibility
    get primarySprite() {
      if (this.sprites.length === 0) {
        this.sprites.push(new Sprite({ name: this.name + ' 스프라이트', type: 'empty', fill: 'transparent' }));
      }
      return this.sprites[0];
    }
    get type() { return this.primarySprite.type; }
    set type(v) { this.primarySprite.type = v; }
    get x() { return this.primarySprite.x; }
    set x(v) { this.primarySprite.x = v; }
    get y() { return this.primarySprite.y; }
    set y(v) { this.primarySprite.y = v; }
    get width() { return this.primarySprite.width; }
    set width(v) { this.primarySprite.width = v; }
    get height() { return this.primarySprite.height; }
    set height(v) { this.primarySprite.height = v; }
    get rotation() { return this.primarySprite.rotation; }
    set rotation(v) { this.primarySprite.rotation = v; }
    get scaleX() { return this.primarySprite.scaleX; }
    set scaleX(v) { this.primarySprite.scaleX = v; }
    get scaleY() { return this.primarySprite.scaleY; }
    set scaleY(v) { this.primarySprite.scaleY = v; }
    get fill() { return this.primarySprite.fill; }
    set fill(v) { this.primarySprite.fill = v; }
    get stroke() { return this.primarySprite.stroke; }
    set stroke(v) { this.primarySprite.stroke = v; }
    get strokeWidth() { return this.primarySprite.strokeWidth; }
    set strokeWidth(v) { this.primarySprite.strokeWidth = v; }
    get strokeOpacity() { return this.primarySprite.strokeOpacity; }
    set strokeOpacity(v) { this.primarySprite.strokeOpacity = v; }
    get fillOpacity() { return this.primarySprite.fillOpacity; }
    set fillOpacity(v) { this.primarySprite.fillOpacity = v; }
    get bevel() { return this.primarySprite.bevel; }
    set bevel(v) { this.primarySprite.bevel = v; }
    get cornerRadius() { return this.primarySprite.cornerRadius; }
    set cornerRadius(v) { this.primarySprite.cornerRadius = v; }
    get pathPoints() { return this.primarySprite.pathPoints; }
    set pathPoints(v) { this.primarySprite.pathPoints = v; }
    get strokes() { return this.primarySprite.strokes; }
    set strokes(v) { this.primarySprite.strokes = v; }
    get keyframes() { return this.primarySprite.keyframes; }
    set keyframes(v) { this.primarySprite.keyframes = v; }
    get runtime() { return this.primarySprite.runtime; }
    set runtime(v) { this.primarySprite.runtime = v; }

    addSprite(sprite) {
      if (!(sprite instanceof Sprite)) sprite = new Sprite(sprite || {});
      this.sprites.push(sprite);
      return sprite;
    }

    removeSprite(id) {
      const idx = this.sprites.findIndex(s => s.id === id);
      if (idx !== -1) return this.sprites.splice(idx, 1)[0];
      return null;
    }

    getSprite(id) {
      return this.sprites.find(s => s.id === id) || null;
    }

    resetRuntime() {
      for (const s of this.sprites) s.resetRuntime();
    }

    evaluateKeyframes(frame) {
      for (const s of this.sprites) s.evaluateKeyframes(frame);
    }

    clone() {
      const data = JSON.parse(JSON.stringify(this.toJSON()));
      data.id = 'layer_' + Math.random().toString(36).substr(2, 9);
      data.name = this.name + ' 복사본';
      for (const s of data.sprites) {
        s.id = 'sprite_' + Math.random().toString(36).substr(2, 9);
        s.x += 20; s.y += 20;
      }
      return new Layer(data);
    }

    toJSON() {
      return {
        id: this.id, name: this.name, visible: this.visible, locked: this.locked,
        opacity: this.opacity, blendMode: this.blendMode, zIndex: this.zIndex,
        expanded: this.expanded, modules: JSON.parse(JSON.stringify(this.modules)),
        filters: JSON.parse(JSON.stringify(this.filters || {})),
        sprites: this.sprites.map(s => s.toJSON())
      };
    }
  }

  // ==========================================================================
  // Reflow: lay a fixed-position design out for another width, like a website
  // ==========================================================================
  // The design is read as boxes inside boxes, split into rows and columns:
  //   * full-width backgrounds and bands follow the width
  //   * content keeps its size while it fits: the margins shrink first, then
  //     the gaps, then the boxes
  //   * text keeps its size and wraps (only big headings get smaller), and
  //     what is below moves down
  //   * columns that no longer fit continue on the next line
  //   * a row with items at both edges (a navigation bar) keeps them there
  //   * overlapping artwork scales as one piece
  // Pure: the same design and width always give the same layout, and the
  // design's own width gives the design back. Also embedded in exported pages,
  // so it must not refer to anything outside the class.
  class Reflow {
    // Serializable description of a document's current layout.
    static describe(doc, fontStack) {
      const items = [];
      for (const layer of doc.layers) {
        for (const sp of layer.sprites) {
          const sx = Math.abs(sp.scaleX) || 1, sy = Math.abs(sp.scaleY) || 1;
          let w = sp.width * sx, h = sp.height * sy;
          const angle = ((sp.rotation || 0) % 180) * Math.PI / 180;
          if (angle) {
            const c = Math.abs(Math.cos(angle)), s = Math.abs(Math.sin(angle));
            [w, h] = [w * c + h * s, w * s + h * c];
          }
          const item = {
            id: sp.id, type: sp.type, x: Reflow.rest(sp, 'x', doc.activeView) - w / 2, y: Reflow.rest(sp, 'y', doc.activeView) - h / 2, w, h,
            cx: Reflow.rest(sp, 'x', doc.activeView), cy: Reflow.rest(sp, 'y', doc.activeView),
            width: sp.width, height: sp.height, scaleX: sp.scaleX, scaleY: sp.scaleY,
            hidden: layer.visible === false || sp.visible === false || sp.type === 'screen_trigger',
            // Drawn relative to the centre: can only be scaled as a whole.
            rigid: !!angle || sx !== 1 || sy !== 1 || ['path', 'brush', 'circle'].includes(sp.type) ||
              !!sp.isBrushCanvas || !!(sp.strokes && sp.strokes.length)
          };
          if (sp.pin) item.pin = sp.pin;
          const label = (sp.modules || []).find(m => m.type === 'text_label' && m.enabled !== false && m.params);
          if (sp.type === 'text') {
            if (sp.text) {
              item.text = { value: String(sp.text), size: sp.fontSize || 16, weight: sp.fontWeight || 'normal',
                family: fontStack(sp.fontFamily), line: 1.35, padX: 0, padY: 0 };
            }
          } else if (sp.type !== 'form_field') {
            const value = label ? label.params.text : sp.text;
            if (value) {
              const p = label ? label.params : {};
              item.text = { value: String(value), size: Number(p.fontSize) || sp.fontSize || 14, weight: p.fontWeight || sp.fontWeight || 'normal',
                family: fontStack(p.fontFamily), line: Math.max(1.35, Number(p.lineHeight) || 0), padX: 16, padY: 8, label: !!label };
            }
          }
          items.push(item);
        }
      }
      return { width: doc.width, height: doc.height, items };
    }

    // Chosen "붙는 위치": keep the left / right margin, stay centred, or keep
    // both margins and change the width.
    static pins() { return ['left', 'center', 'right', 'stretch']; }

    // An animated sprite is laid out where its animation ends. Animations hold
    // desktop values, so in a responsive view the view's own position counts.
    static rest(sp, prop, view) {
      const track = sp.keyframes && sp.keyframes[prop];
      return track && track.length && (!view || view === 'desktop') ? track[track.length - 1].value : sp[prop];
    }

    constructor(design) {
      this.design = design;
      this.widths = new Map();
      this.mins = new Map();
      this.ctx = document.createElement('canvas').getContext('2d');
      const W = design.width, H = design.height;
      this.flow = [];
      this.loose = []; // not part of the flow: moves along with what it is next to
      for (const it of design.items) {
        const outside = it.x + it.w <= 0 || it.x >= W || it.y + it.h <= 0 || it.y >= H;
        const bleeds = it.x < -2 || it.x + it.w > W + 2;
        const spans = it.x <= 2 && it.x + it.w >= W - 2;
        const backdrop = spans && it.y <= 2 && it.y + it.h >= H - 2;
        if (it.hidden || outside || backdrop || (bleeds && !spans)) this.loose.push({ it, backdrop, spans });
        else this.flow.push(it);
      }
      this.root = this.flow.length ? this.nest(this.flow) : null;
    }

    // Boxes that contain others become their parents.
    nest(items) {
      const boxes = items.filter(it => !it.rigid && ['rect', 'bevel_rect', 'image'].includes(it.type));
      const children = new Map(), top = [];
      for (const it of items) {
        let parent = null;
        for (const b of boxes) {
          if (b === it || b.w * b.h <= it.w * it.h * 1.02) continue;
          if (it.x < b.x - 1 || it.y < b.y - 1 || it.x + it.w > b.x + b.w + 1 || it.y + it.h > b.y + b.h + 1) continue;
          if (!parent || b.w * b.h < parent.w * parent.h) parent = b;
        }
        if (!parent) top.push(it);
        else if (children.has(parent)) children.get(parent).push(it);
        else children.set(parent, [it]);
      }
      const toNode = it => ({ kind: 'box', x: it.x, y: it.y, w: it.w, h: it.h, item: it,
        inner: children.has(it) ? this.split(children.get(it).map(toNode)) : null });
      return this.split(top.map(toNode));
    }

    static group(kind, parts) {
      const x = Math.min(...parts.map(p => p.x)), y = Math.min(...parts.map(p => p.y));
      return { kind, parts, x, y,
        w: Math.max(...parts.map(p => p.x + p.w)) - x,
        h: Math.max(...parts.map(p => p.y + p.h)) - y };
    }

    // Rows, inside them columns, inside those rows again.
    split(nodes) {
      if (nodes.length === 1) return nodes[0];
      const rows = Reflow.separate(nodes, 'y', 'h');
      if (rows.length > 1) return Reflow.group('stack', rows.map(r => this.split(r)));
      const columns = Reflow.separate(nodes, 'x', 'w');
      if (columns.length > 1) return Reflow.group('row', columns.map(c => this.split(c)));
      return Reflow.group('overlay', nodes);
    }

    // Sets of nodes that do not share space along an axis (slight overlaps allowed).
    static separate(nodes, pos, size) {
      const sorted = nodes.slice().sort((a, b) => a[pos] - b[pos]);
      let sets = [];
      for (const n of sorted) {
        const joined = [], apart = [];
        for (const set of sets) {
          const shares = set.some(m => Math.min(m[pos] + m[size], n[pos] + n[size]) - n[pos] > 0.3 * Math.min(m[size], n[size]));
          (shares ? joined : apart).push(set);
        }
        sets = apart.concat([[].concat(...joined, [n])]);
      }
      return sets.sort((a, b) => Math.min(...a.map(n => n[pos])) - Math.min(...b.map(n => n[pos])));
    }

    // ---------------- Text ----------------
    charWidths(text, size) {
      const font = `${text.weight} ${size}px ${text.family}`;
      if (!this.widths.has(font)) this.widths.set(font, new Map());
      const known = this.widths.get(font);
      let ready = false;
      return (ch) => {
        if (!known.has(ch)) {
          if (!ready) { this.ctx.font = font; ready = true; }
          known.set(ch, this.ctx.measureText(ch).width);
        }
        return known.get(ch);
      };
    }

    longestLine(text) {
      const width = this.charWidths(text, text.size);
      return Math.max(...text.value.split('\n').map(line => Array.from(line).reduce((sum, ch) => sum + width(ch), 0)));
    }

    // The canvas wraps at any character, a browser between words (CJK: between
    // characters, but punctuation never starts or ends a line on its own).
    // Use whichever needs more lines, so both fit.
    lineCount(text, size, room) {
      const width = this.charWidths(text, size);
      const limit = Math.max(20, room); // no tolerance: browsers wrap at a fraction of a pixel
      let total = 0;
      for (const line of text.value.split('\n')) {
        let byChar = 1, used = 0;
        for (const ch of line) {
          const w = width(ch);
          if (used && used + w > limit) { byChar++; used = w; } else used += w;
        }
        let byWord = 1;
        used = 0;
        for (const word of line.match(/[(\[{\u201C\u2018]*[\u2E80-\u9FFF\uAC00-\uD7A3][.,!?:;)\]}%\u201D\u2019\u2026\u3001\u3002]*|[^\s\u2E80-\u9FFF\uAC00-\uD7A3]+|\s+/g) || []) {
          let w = 0;
          for (const ch of word) w += width(ch);
          if (!word.trim()) { used += w; continue; }
          if (used && used + w > limit) { byWord++; used = 0; }
          while (w > limit) { byWord++; w -= limit; }
          used += w;
        }
        total += Math.max(byChar, byWord);
      }
      return total;
    }

    // The narrowest a node may get before its row breaks.
    minWidth(node) {
      if (!this.mins.has(node)) this.mins.set(node, this.measureMinWidth(node));
      return this.mins.get(node);
    }

    measureMinWidth(node) {
      if (node.kind === 'stack' || node.kind === 'row') return Math.max(...node.parts.map(p => this.minWidth(p)));
      if (node.kind === 'overlay') return Math.min(node.w, 160);
      const it = node.item;
      if (node.inner) return Math.min(node.w, Math.max(200, this.minWidth(node.inner) + 24));
      if (it.rigid) return Math.min(node.w, 120);
      if (it.text) {
        const needed = this.longestLine(it.text) + it.text.padX * 2 + 2;
        // Buttons and menu items never wrap; paragraphs and cards do.
        return Math.min(node.w, it.h <= 64 && needed <= 240 ? needed : 240);
      }
      if (it.type === 'form_field') return Math.min(node.w, 160);
      return Math.min(node.w, node.w <= 120 ? node.w : 200);
    }

    // ---------------- Layout ----------------
    layout(width) {
      const d = this.design, boxes = Object.create(null);
      const W = d.width, T = Math.max(50, width);
      if (Math.abs(T - W) < 0.5) {
        // The design's own width: exactly the design, unrounded.
        for (const it of d.items) boxes[it.id] = { x: it.cx, y: it.cy, width: it.width, height: it.height, scaleX: it.scaleX, scaleY: it.scaleY };
        return { width: T, height: d.height, boxes };
      }
      this.out = new Map();
      this.target = T;
      let grown = 0;
      if (this.root) grown = this.place(this.root, { x0: 0, w0: W, x: 0, w: T }, this.root.y) - this.root.h;
      const height = Math.max(50, d.height + grown);

      const ratio = Math.min(1, T / W);
      for (const { it, backdrop, spans } of this.loose) {
        // Follows whatever flow item ends closest above it.
        let above = null;
        for (const f of this.flow) if (f.y <= it.y && (!above || f.y > above.y)) above = f;
        const dy = above && this.out.has(above) ? this.out.get(above).y - above.y : 0;
        const right = W - it.x - it.w;
        let x, w = it.w, h = it.h;
        if (it.pin === 'stretch' && !it.rigid) { x = it.x; w = Math.max(1, T - it.x - right); }
        else if (it.pin === 'left') x = it.x;
        else if (it.pin === 'right') x = T - right - w;
        else if (it.pin === 'center') x = T / 2 + (it.x + w / 2 - W / 2) * ratio - w / 2;
        else if (spans) {
          x = it.x; w = Math.max(1, T - it.x - right);
          if (backdrop) h = Math.max(1, it.h + grown);
          if (it.rigid) { w = it.w; x = (T - w) / 2; h = it.h; }
        } else if (it.x < W * 0.1 && it.x < right) x = it.x;
        else if (right < W * 0.1) x = T - right - w;
        else x = T / 2 + (it.x + w / 2 - W / 2) * ratio - w / 2;
        this.out.set(it, { x, y: backdrop ? it.y : it.y + dy, w, h, k: 1 });
      }
      for (const [it, r] of this.out) {
        boxes[it.id] = Reflow.result(it, r);
      }
      return { width: T, height, boxes };
    }

    // The sprite values for a laid-out box (x / y are the centre).
    static result(it, r) {
      const fix = v => Math.round(v * 100) / 100;
      const box = { x: fix(r.x + r.w / 2), y: fix(r.y + r.h / 2), width: it.width, height: it.height, scaleX: it.scaleX, scaleY: it.scaleY };
      if (it.rigid) {
        box.scaleX = it.scaleX * r.k; box.scaleY = it.scaleY * r.k;
      } else {
        if (Math.abs(r.w - it.w) > 0.001) box.width = fix(r.w);
        if (Math.abs(r.h - it.h) > 0.001) box.height = fix(r.h);
        if (r.size) box.fontSize = fix(r.size);
      }
      return box;
    }

    // Where a node sits in its frame. Frame: the span it was designed in
    // (x0, w0) and the span it gets now (x, w).
    align(node, f, width) {
      const left = node.x - f.x0, right = f.x0 + f.w0 - node.x - node.w;
      const ratio = Math.min(1, f.w / f.w0);
      const gl = Math.min(16, Math.max(0, left)), gr = Math.min(16, Math.max(0, right));
      let x;
      const pin = node.item && node.item.pin;
      if (pin === 'left') x = f.x + left * ratio;
      else if (pin === 'right') x = f.x + f.w - right * ratio - width;
      else if (pin === 'center') x = f.x + f.w / 2 + (node.x + node.w / 2 - f.x0 - f.w0 / 2) * ratio - width / 2;
      else if (node.w < f.w0 * 0.8 && left < f.w0 * 0.1 && left < right - 2) x = f.x + left * ratio;
      else if (node.w < f.w0 * 0.8 && right < f.w0 * 0.1 && right < left - 2) x = f.x + f.w - right * ratio - width;
      else x = f.x + f.w / 2 + (node.x + node.w / 2 - f.x0 - f.w0 / 2) * ratio - width / 2;
      return Math.max(f.x + gl, Math.min(x, f.x + f.w - gr - width));
    }

    available(node, f) {
      const left = node.x - f.x0, right = f.x0 + f.w0 - node.x - node.w;
      return Math.max(20, f.w - Math.min(16, Math.max(0, left)) - Math.min(16, Math.max(0, right)));
    }

    static fills(node, f) {
      return node.x - f.x0 <= 2 && f.x0 + f.w0 - node.x - node.w <= 2;
    }

    // Lays a node out with its top at `top`; returns its height.
    place(node, f, top) {
      if (node.kind === 'stack') return this.placeStack(node, f, top);
      if (node.kind === 'row') return this.placeRow(node, f, top);
      if (node.kind === 'overlay') return this.placeScaled(node, f, top);
      return this.placeBox(node, f, top);
    }

    placeStack(node, f, top) {
      let shift = 0, bottom = top;
      for (const part of node.parts) {
        const y = top + part.y - node.y + shift;
        const h = this.place(part, f, y);
        shift += h - part.h;
        bottom = Math.max(bottom, y + h);
      }
      return bottom - top;
    }

    placeScaled(node, f, top) {
      const k = Math.min(1, this.available(node, f) / node.w);
      const left = this.align(node, f, node.w * k);
      const put = (n) => {
        if (n.item) {
          this.out.set(n.item, { x: left + (n.x - node.x) * k, y: top + (n.y - node.y) * k, w: n.w * k, h: n.h * k, k,
            size: n.item.text && k !== 1 ? n.item.text.size * k : undefined });
        }
        if (n.inner) put(n.inner);
        for (const p of n.parts || []) put(p);
      };
      put(node);
      return node.h * k;
    }

    placeBox(node, f, top) {
      const it = node.item;
      const pin = it.rigid ? '' : it.pin;
      const fills = pin === 'stretch' || (!pin && Reflow.fills(node, f) && !it.rigid);
      // "폭 채우기" keeps both margins (narrowed with the frame).
      const k0 = pin === 'stretch' ? Math.min(1, f.w / f.w0) : 1;
      const ml = (node.x - f.x0) * k0, mr = (f.x0 + f.w0 - node.x - node.w) * k0;
      const w = fills ? Math.max(1, f.w - ml - mr) : Math.min(node.w, this.available(node, f));
      const x = fills ? f.x + ml : this.align(node, f, w);
      let h = node.h, k = 1, size;
      if (it.rigid) {
        k = w / node.w;
        h = node.h * k;
        if (it.text && k !== 1) size = it.text.size * k;
      } else {
        if (it.type === 'image' && !node.inner && w < node.w) h = node.h * w / node.w;
        const t = it.text;
        if (t) {
          let fs = t.size;
          if (fs > 28 && this.target < this.design.width) {
            fs = Math.max(28, Math.round(fs * (0.45 + 0.55 * this.target / this.design.width) * 10) / 10);
            if (fs !== t.size) size = fs;
          }
          if (w < node.w || size) {
            const before = this.lineCount(t, t.size, node.w - t.padX * 2) * t.size * t.line + t.padY * 2;
            const after = this.lineCount(t, fs, w - t.padX * 2) * fs * t.line + t.padY * 2;
            h += Math.max(0, after - Math.max(node.h, before));
          }
        }
        if (node.inner) {
          const inner = node.inner;
          const grown = this.place(inner, { x0: node.x, w0: node.w, x, w }, top + inner.y - node.y) - inner.h;
          h = Math.max(h, node.h + grown);
        }
      }
      this.out.set(it, { x, y: top, w, h, k, size });
      return h;
    }

    // Places a row's part in exactly the given span.
    placePart(part, x, w, top) {
      return this.place(part, { x0: part.x, w0: part.w, x, w }, top);
    }

    placeRow(node, f, top) {
      const parts = node.parts;
      const gaps = parts.slice(1).map((p, i) => p.x - parts[i].x - parts[i].w);
      const left = node.x - f.x0, right = f.x0 + f.w0 - node.x - node.w;
      const wide = [];
      gaps.forEach((g, i) => { if (g > f.w0 * 0.12) wide.push(i); });
      if (wide.length && left < f.w0 * 0.1 && right < f.w0 * 0.1) return this.placeSpread(node, f, top, wide);

      // Panels that share the whole width keep sharing it.
      if (f.w > f.w0 && Reflow.fills(node, f) && gaps.every(g => g <= 2)) {
        let x = f.x + left, height = 0;
        for (const p of parts) {
          const w = p.w * f.w / f.w0, y = p.y - node.y;
          height = Math.max(height, y + this.placePart(p, x, w, top + y));
          x += w;
        }
        return height;
      }
      return this.placePacked(node, f, top, gaps);
    }

    placePacked(node, f, top, gaps) {
      const parts = node.parts, room = this.available(node, f);
      // Small items (menu entries) may move closer together than cards.
      const closest = parts.every(q => q.w <= 120) ? 8 : 16;
      const tight = gaps.map(g => Math.min(g, closest));
      const sum = list => list.reduce((a, b) => a + b, 0);
      const mins = parts.map(p => Math.min(room, this.minWidth(p)));

      // Break into lines, as few as possible, with no lone item if avoidable.
      let lines = [];
      let line = [], used = 0;
      parts.forEach((p, i) => {
        const gap = line.length ? tight[i - 1] : 0;
        if (line.length && used + gap + mins[i] > room + 0.5) {
          lines.push(line);
          line = [i]; used = mins[i];
        } else {
          line.push(i); used += gap + mins[i];
        }
      });
      lines.push(line);
      const last = lines[lines.length - 1], prev = lines[lines.length - 2];
      if (prev && last.length === 1 && prev.length > 2) last.unshift(prev.pop());

      const sameSize = parts.every(p => p.kind === 'box' && Math.abs(p.h - parts[0].h) < 1 && Math.abs(p.y - parts[0].y) < 1);
      const between = Math.max(8, Math.min(24, ...gaps.filter(g => g > 0)));
      let y = top;
      lines.forEach((ids, n) => {
        const inner = ids.slice(1).map(i => gaps[i - 1]), least = ids.slice(1).map(i => tight[i - 1]);
        const natural = ids.map(i => parts[i].w), narrow = ids.map(i => mins[i]);
        let widths = natural, space = inner;
        if (sum(natural) + sum(inner) > room + 0.01) {
          if (sum(natural) + sum(least) <= room) {
            const t = (room - sum(natural) - sum(least)) / Math.max(1e-6, sum(inner) - sum(least));
            space = inner.map((g, i) => least[i] + (g - least[i]) * t);
          } else {
            space = least;
            const t = Math.max(0, (room - sum(least) - sum(narrow)) / Math.max(1e-6, sum(natural) - sum(narrow)));
            widths = natural.map((w, i) => narrow[i] + (w - narrow[i]) * Math.min(1, t));
          }
        }
        let x = this.align(node, f, sum(widths) + sum(space));
        let height = 0;
        const placed = [];
        ids.forEach((id, i) => {
          const p = parts[id], offset = lines.length > 1 ? 0 : p.y - node.y;
          const h = this.placePart(p, x, widths[i], y + offset);
          height = Math.max(height, offset + h);
          placed.push(p);
          x += widths[i] + (i < space.length ? space[i] : 0);
        });
        // Equal cards stay equally tall.
        if (sameSize) {
          for (const p of placed) {
            if (!p.item.rigid && p.item.type !== 'image') this.out.get(p.item).h = height;
          }
        }
        y += height + (n < lines.length - 1 ? between : 0);
      });
      return y - top;
    }

    // Items at both edges stay there, what is between them stays centred.
    placeSpread(node, f, top, wide) {
      const parts = node.parts;
      if (!node.sides) {
        const make = list => (list.length === 1 ? list[0] : Reflow.group('row', list));
        const first = wide[0], last = wide[wide.length - 1];
        node.sides = { start: make(parts.slice(0, first + 1)), end: make(parts.slice(last + 1)),
          middle: last > first ? make(parts.slice(first + 1, last + 1)) : null };
      }
      const { start, end, middle } = node.sides;
      const left = node.x - f.x0, right = f.x0 + f.w0 - node.x - node.w;
      const gl = Math.min(16, Math.max(0, left)), gr = Math.min(16, Math.max(0, right));
      const ratio = Math.min(1, f.w / f.w0);
      const oneLine = start.w + end.w + (middle ? middle.w + 32 : 16);
      const slack = f.w - gl - gr - oneLine;
      let height = 0;
      if (slack >= 0) {
        const l = Math.max(gl, Math.min(left * ratio, gl + slack / 2));
        const r = Math.max(gr, Math.min(right * ratio, gr + slack / 2));
        const put = (part, x) => {
          const offset = part.y - node.y;
          height = Math.max(height, offset + this.placePart(part, x, part.w, top + offset));
        };
        put(start, f.x + l);
        put(end, f.x + f.w - r - end.w);
        if (middle) {
          const centre = f.x + f.w / 2 + (middle.x + middle.w / 2 - f.x0 - f.w0 / 2) * ratio;
          put(middle, Math.max(f.x + l + start.w + 16, Math.min(centre - middle.w / 2, f.x + f.w - r - end.w - 16 - middle.w)));
        }
        return height;
      }

      // Too narrow: the edges share the first line, the middle goes below.
      const room = Math.max(20, f.w - gl - gr);
      const need = this.minWidth(start) + this.minWidth(end) + 16;
      let bottom;
      if (need <= room) {
        const t = Math.min(1, (room - need) / Math.max(1e-6, start.w + end.w + 16 - need));
        const a = this.minWidth(start) + (start.w - this.minWidth(start)) * t;
        const b = this.minWidth(end) + (end.w - this.minWidth(end)) * t;
        const base = Math.min(start.y, end.y);
        bottom = top + Math.max(start.y - base + this.placePart(start, f.x + gl, a, top + start.y - base),
          end.y - base + this.placePart(end, f.x + f.w - gr - b, b, top + end.y - base));
      } else {
        bottom = top + this.placePart(start, f.x + gl, Math.min(room, start.w), top);
        bottom += 12;
        bottom += this.placePart(end, f.x + gl, Math.min(room, end.w), bottom);
      }
      if (middle) {
        // Centred in the full span, whatever side it was designed on.
        const span = { x0: middle.x, w0: middle.w, x: f.x + gl, w: Math.min(room, middle.w) };
        span.x += (room - span.w) / 2;
        bottom += 12;
        bottom += this.place(middle, span, bottom);
      }
      return bottom - top;
    }
  }

  // ==========================================================================
  // 4. Document Model
  // ==========================================================================
  class DocumentModel {
    constructor(options = {}) {
      this.name = options.name || '인터랙티브 웹 프로젝트';
      this.width = options.width || 1440;
      this.height = options.height || 900;
      this.backgroundColor = options.backgroundColor || '#18181b';
      this.transparentBackground = options.transparentBackground !== undefined ? options.transparentBackground : true;
      this.foregroundColor = options.foregroundColor || '#38bdf8';
      this.backgroundColorSecondary = options.backgroundColorSecondary || '#ffffff';
      this.layers = [];
      this.selectedLayerId = null;
      this.selectedSpriteId = null;
      this.selectedModuleId = null;
      this.selectedSpriteIds = new Set();

      this.history = [];
      this.historyIndex = -1;
      this.maxHistory = 40;
      this.maxHistoryChars = 40 * 1024 * 1024; // ~80MB of UTF-16 strings at most

      this.totalFrames = 100;
      this.fps = 30;
      this.currentFrame = 0;
      this.isPlaying = false;
      this.isLooping = true;
      this.fonts = [];          // uploaded fonts: [{ family, src: data URL }]
      this.views = {};          // responsive layouts: { tablet: {width, height}, mobile: {...} }
      this.activeView = 'desktop';
      this.autoKey = true;

      if (options.layers && options.layers.length > 0) {
        this.loadFromData(options);
      } else {
        const l = new Layer({ name: '레이어 1' });
        const sp = l.addSprite({
          name: '사각형 스프라이트', type: 'rect',
          x: this.width / 2, y: this.height / 2,
          width: 140, height: 140, fill: '#0284c7',
          stroke: '#38bdf8', strokeWidth: 2
        });
        this.addLayer(l);
        this.selectedLayerId = l.id;
        this.selectedSpriteId = sp.id;
      }
    }

    selectAll() {
      this.selectedSpriteIds.clear();
      for (const l of this.layers) {
        l.expanded = true;
        for (const s of l.sprites) {
          this.selectedSpriteIds.add(s.id);
        }
      }
      if (this.layers.length > 0) {
        this.selectedLayerId = this.layers[0].id;
        if (this.layers[0].sprites.length > 0) {
          this.selectedSpriteId = this.layers[0].sprites[0].id;
        }
      }
    }

    deleteSelected() {
      const idsToDelete = new Set(this.selectedSpriteIds);
      if (this.selectedSpriteId) idsToDelete.add(this.selectedSpriteId);
      if (idsToDelete.size === 0) return false;

      let deleted = false;
      for (const layer of this.layers) {
        const before = layer.sprites.length;
        layer.sprites = layer.sprites.filter(s => !idsToDelete.has(s.id));
        if (layer.sprites.length !== before) {
          deleted = true;
        }
      }

      this.selectedSpriteIds.clear();
      this.selectedSpriteId = null;

      const curLayer = this.getSelectedLayer();
      if (curLayer && curLayer.sprites.length > 0) {
        this.selectedSpriteId = curLayer.sprites[curLayer.sprites.length - 1].id;
        this.selectedSpriteIds.add(this.selectedSpriteId);
      }

      if (deleted) {
        this.saveState();
      }
      return deleted;
    }

    setFrame(frame) {
      this.currentFrame = Math.max(0, Math.min(this.totalFrames, frame));
      this.layers.forEach(l => l.evaluateKeyframes(this.currentFrame));
    }

    stepFrame(delta = 1) {
      let next = this.currentFrame + delta;
      if (next > this.totalFrames) next = this.isLooping ? 0 : this.totalFrames;
      if (next < 0) next = this.isLooping ? this.totalFrames : 0;
      this.setFrame(next);
    }

    togglePlay() {
      this.isPlaying = !this.isPlaying;
    }

    addLayer(layer) {
      if (!(layer instanceof Layer)) layer = new Layer(layer || {});
      layer.zIndex = this.layers.length;
      this.layers.push(layer);
      this.sortLayers();
      this.selectedLayerId = layer.id;
      if (layer.sprites.length > 0) this.selectedSpriteId = layer.sprites[0].id;
      this.saveState();
      return layer;
    }

    removeLayer(id) {
      const idx = this.layers.findIndex(l => l.id === id);
      if (idx !== -1) {
        this.layers.splice(idx, 1);
        this.selectedLayerId = this.layers.length > 0 ? this.layers[Math.max(0, idx - 1)].id : null;
        const selL = this.getSelectedLayer();
        this.selectedSpriteId = selL && selL.sprites.length > 0 ? selL.sprites[0].id : null;
        this.sortLayers();
        this.saveState();
      }
    }

    duplicateLayer(id) {
      const l = this.getLayer(id);
      if (l) {
        const dup = l.clone();
        this.addLayer(dup);
      }
    }

    getLayer(id) {
      return this.layers.find(l => l.id === id) || null;
    }

    findSpriteById(id) {
      if (!id) return null;
      for (const l of this.layers) {
        for (const s of l.sprites) {
          if (s.id === id) return s;
        }
      }
      return null;
    }

    getSelectedLayer() {
      if (this.selectedLayerId) {
        const found = this.layers.find(l => l.id === this.selectedLayerId);
        if (found) return found;
      }
      return this.layers.length > 0 ? this.layers[0] : null;
    }

    // fallback=false: only an explicitly selected sprite (the inspector then
    // shows the layer / canvas settings instead of the layer's first sprite).
    getSelectedSprite(fallback = true) {
      if (this.selectedSpriteId) {
        for (const l of this.layers) {
          const s = l.getSprite(this.selectedSpriteId);
          if (s) return s;
        }
      }
      if (!fallback) return null;
      const l = this.getSelectedLayer();
      return l && l.sprites.length > 0 ? l.sprites[0] : null;
    }

    hitTestSprite(wx, wy) {
      const reversedLayers = [...this.layers].reverse();
      for (const layer of reversedLayers) {
        if (!layer.visible) continue;
        const reversedSprites = [...layer.sprites].reverse();
        for (const sprite of reversedSprites) {
          if (!sprite.visible) continue;
          const rad = (-sprite.rotation * Math.PI) / 180;
          const dx = wx - sprite.x;
          const dy = wy - sprite.y;
          const lx = (dx * Math.cos(rad) - dy * Math.sin(rad)) / (sprite.scaleX || 1);
          const ly = (dx * Math.sin(rad) + dy * Math.cos(rad)) / (sprite.scaleY || 1);
          const hw = Math.max(8, (sprite.width || 20) / 2);
          const hh = Math.max(8, (sprite.height || 20) / 2);
          if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
            return sprite;
          }
        }
      }
      return null;
    }

    sortLayers() {
      this.layers.forEach((l, i) => { l.zIndex = i; });
    }

    saveState() {
      const snapshot = JSON.stringify(this.historySnapshot());
      // Clicking without changing anything must not add an undo step.
      if (this.historyIndex >= 0 && this.history[this.historyIndex] === snapshot) return;
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      this.history.push(snapshot);
      // Bound history by count and by total size (large brush documents).
      let total = this.history.reduce((n, h) => n + h.length, 0);
      while (this.history.length > 1 && (this.history.length > this.maxHistory || total > this.maxHistoryChars)) {
        total -= this.history.shift().length;
      }
      this.historyIndex = this.history.length - 1;
    }

    // Unsaved changes = current undo state differs from the last saved/loaded one.
    markSaved() {
      this.savedEntry = this.history[this.historyIndex];
    }

    isDirty() {
      return this.history.length > 0 && this.history[this.historyIndex] !== this.savedEntry;
    }

    // Load an undo snapshot while keeping the current selection when it still exists.
    restoreHistoryEntry(entry) {
      const selLayerId = this.selectedLayerId, selSpriteId = this.selectedSpriteId;
      const frame = this.currentFrame;
      this.loadFromData(JSON.parse(entry), false);
      if (selLayerId && this.getLayer(selLayerId)) this.selectedLayerId = selLayerId;
      if (selSpriteId && this.findSpriteById(selSpriteId)) this.selectedSpriteId = selSpriteId;
      this.currentFrame = frame;
    }

    // Undo snapshots exclude selection/playhead so selecting does not count as an edit.
    historySnapshot() {
      const data = this.toJSON();
      delete data.selectedLayerId;
      delete data.selectedSpriteId;
      delete data.currentFrame;
      return data;
    }

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.restoreHistoryEntry(this.history[this.historyIndex]);
        return true;
      }
      return false;
    }

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.restoreHistoryEntry(this.history[this.historyIndex]);
        return true;
      }
      return false;
    }

    loadFromData(data, recordHistory = true) {
      const num = Sprite.num, str = Sprite.str;
      this.name = str(data.name) || this.name;
      this.width = Math.max(1, num(data.width, 0) || this.width);
      this.height = Math.max(1, num(data.height, 0) || this.height);
      this.backgroundColor = str(data.backgroundColor) || this.backgroundColor;
      this.transparentBackground = data.transparentBackground !== undefined ? data.transparentBackground : true;
      this.foregroundColor = str(data.foregroundColor) || this.foregroundColor;
      this.totalFrames = Math.max(1, num(data.totalFrames, 0) || this.totalFrames);
      this.fps = Math.max(1, num(data.fps, 0) || this.fps);
      this.isLooping = data.isLooping !== undefined ? data.isLooping : this.isLooping;
      this.fonts = Array.isArray(data.fonts) ? data.fonts.filter(f => f && f.family && f.src).map(f => ({ family: String(f.family), src: String(f.src) })) : [];

      this.layers = (data.layers || []).map(lData => new Layer(lData));
      this.selectedLayerId = str(data.selectedLayerId) || (this.layers.length > 0 ? this.layers[0].id : null);
      const selL = this.getSelectedLayer();
      this.selectedSpriteId = selL && selL.sprites.length > 0 ? selL.sprites[0].id : null;
      this.sortLayers();

      // Responsive views: the data always holds desktop values; other views
      // are per-sprite overrides (sprite.responsive[view]).
      this.views = {};
      for (const [view, defaultWidth] of Object.entries(DocumentModel.viewWidths())) {
        const v = data.views && data.views[view];
        if (!v || typeof v !== 'object') continue;
        this.views[view] = {
          width: Math.max(1, num(v.width, 0) || defaultWidth),
          height: Math.max(1, num(v.height, 0) || Math.max(200, Math.round(this.height * defaultWidth / this.width)))
        };
      }
      this.activeView = 'desktop';
      this._desktopSize = null;
      if (data.activeView && data.activeView !== 'desktop' && DocumentModel.viewNames().includes(data.activeView)) {
        this.switchView(data.activeView);
      }

      if (recordHistory) {
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
        this.markSaved();
      }
    }

    // ---------------- Responsive views ----------------
    static viewNames() { return ['desktop', 'tablet', 'mobile']; }
    static viewWidths() { return { tablet: 768, mobile: 390 }; }
    static viewProps() { return ['x', 'y', 'width', 'height', 'rotation', 'scaleX', 'scaleY', 'fontSize', 'visible']; }

    static labelOf(sp) {
      return (sp.modules || []).find(m => m.type === 'text_label' && m.params);
    }

    static captureView(sp) {
      const o = {};
      for (const k of DocumentModel.viewProps()) o[k] = sp[k];
      const lbl = DocumentModel.labelOf(sp);
      if (lbl && lbl.params.fontSize !== undefined) o.labelFontSize = lbl.params.fontSize;
      return o;
    }

    static applyView(sp, o) {
      if (!o) return;
      for (const k of DocumentModel.viewProps()) if (o[k] !== undefined) sp[k] = o[k];
      const lbl = DocumentModel.labelOf(sp);
      if (lbl && o.labelFontSize !== undefined) lbl.params.fontSize = o.labelFontSize;
      sp._wrapCache = null;
    }

    // For a sprite added after its view was created: desktop values scaled.
    static scaledView(desk, s) {
      const o = Object.assign({}, desk);
      for (const k of ['x', 'y', 'width', 'height']) if (isFinite(o[k])) o[k] = Math.round(o[k] * s);
      // Proportional (no minimum): a clean, non-overlapping copy to adjust from.
      if (isFinite(o.fontSize)) o.fontSize = Math.max(1, Math.round(o.fontSize * s));
      if (isFinite(o.labelFontSize)) o.labelFontSize = Math.max(1, Math.round(o.labelFontSize * s));
      return o;
    }

    // ---------------- Reflow ----------------
    // The values a layout changes, as they are before it.
    static geometryOf(sp, view) {
      const g = { width: sp.width, height: sp.height, scaleX: sp.scaleX, scaleY: sp.scaleY, fontSize: sp.fontSize,
        x: Reflow.rest(sp, 'x', view), y: Reflow.rest(sp, 'y', view), tracks: {} };
      const label = DocumentModel.labelOf(sp);
      if (label && Number(label.params.fontSize)) g.labelFontSize = Number(label.params.fontSize);
      for (const k of ['x', 'y', 'width', 'height', 'scaleX', 'scaleY']) {
        const track = sp.keyframes && sp.keyframes[k];
        if (track && track.length) g.tracks[k] = track.map(kf => Object.assign({}, kf));
      }
      return g;
    }

    captureGeometry() {
      const map = new Map();
      for (const l of this.layers) for (const sp of l.sprites) map.set(sp.id, DocumentModel.geometryOf(sp, this.activeView));
      return map;
    }

    // Set a layout from Reflow. `geometry` is captureGeometry() of the design
    // it was computed from. Sprites that are moving keep moving: their runtime
    // values shift along. withTracks: move the animations too.
    applyLayout(layout, geometry, withTracks = true) {
      for (const l of this.layers) {
        for (const sp of l.sprites) {
          const box = layout.boxes[sp.id], g = geometry.get(sp.id);
          if (!box || !g) continue;
          const old = { x: sp.x, y: sp.y, scaleX: sp.scaleX, scaleY: sp.scaleY };
          for (const k of ['x', 'y', 'width', 'height', 'scaleX', 'scaleY']) sp[k] = box[k];
          const label = DocumentModel.labelOf(sp);
          // A label without a size of its own uses the sprite's.
          if (label && g.labelFontSize) {
            sp.fontSize = g.fontSize;
            label.params.fontSize = box.fontSize || g.labelFontSize;
          } else {
            sp.fontSize = box.fontSize || g.fontSize;
          }
          if (withTracks && Object.keys(g.tracks).length) {
            for (const k of Object.keys(g.tracks)) {
              // Positions move to end in the new place; sizes scale along.
              const moves = k === 'x' || k === 'y', track = g.tracks[k];
              const end = track[track.length - 1].value;
              sp.keyframes[k] = track.map(kf => Object.assign({}, kf,
                { value: moves ? kf.value + box[k] - end : (g[k] ? kf.value * box[k] / g[k] : kf.value) }));
            }
            sp.evaluateKeyframes(this.currentFrame);
          }
          const rt = sp.runtime;
          if (rt) {
            rt.x += sp.x - old.x; rt.y += sp.y - old.y;
            if (rt._px !== undefined) { rt._px += sp.x - old.x; rt._py += sp.y - old.y; }
            if (old.scaleX) rt.scaleX *= sp.scaleX / old.scaleX;
            if (old.scaleY) rt.scaleY *= sp.scaleY / old.scaleY;
          }
          sp._wrapCache = null;
        }
      }
      this.width = layout.width;
      this.height = Math.round(layout.height);
    }

    // Undo what applyLayout did to the animations.
    restoreTracks(geometry) {
      for (const l of this.layers) {
        for (const sp of l.sprites) {
          const g = geometry.get(sp.id);
          if (g) for (const k of Object.keys(g.tracks)) sp.keyframes[k] = g.tracks[k].map(kf => Object.assign({}, kf));
        }
      }
    }

    // Identifies the current arrangement (the canvas height does not matter).
    layoutKey() {
      return JSON.stringify([this.activeView, this.width, this.layers.map(l => [l.visible, l.sprites.map(sp => {
        const g = DocumentModel.geometryOf(sp, this.activeView), label = DocumentModel.labelOf(sp);
        return [sp.id, sp.visible, sp.rotation, g, sp.text, label && label.params.text];
      })])]);
    }

    // The design to lay out from. While the result of the last resize has not
    // been edited, that is the design before it, so resizing back and forth
    // loses nothing (like resizing a browser window).
    reflowSource() {
      const known = this._reflowed && this._reflowed.get(this.layoutKey());
      if (known) return Object.assign({}, known.source, { extra: known.source.extra + this.height - known.height });
      return { flow: new Reflow(Reflow.describe(this, PhotoshopCanvas.fontStack)), geometry: this.captureGeometry(), extra: 0 };
    }

    reflowTo(width, source = this.reflowSource()) {
      this.applyLayout(source.flow.layout(width), source.geometry, (this.activeView || 'desktop') === 'desktop');
      this.height = Math.max(50, this.height + source.extra);
      return source;
    }

    setPin(sp, pin) {
      if (Reflow.pins().includes(pin)) sp.pin = pin; else delete sp.pin;
      for (const { source } of (this._reflowed || new Map()).values()) {
        const it = source.flow.design.items.find(i => i.id === sp.id);
        if (it) { if (sp.pin) it.pin = sp.pin; else delete it.pin; }
      }
    }

    rememberLayout(source, height = this.height) {
      this._reflowed = this._reflowed || new Map();
      this._reflowed.set(this.layoutKey(), { source, height });
      if (this._reflowed.size > this.maxHistory) this._reflowed.delete(this._reflowed.keys().next().value);
    }

    hasView(name) {
      return name === 'desktop' || !!(this.views && this.views[name]);
    }

    // Switch the edited layout. Base sprite fields always hold the active
    // view's values; the desktop values are kept in sprite._desktop meanwhile.
    switchView(name) {
      if (!DocumentModel.viewNames().includes(name) || name === this.activeView) return false;
      const from = this.activeView || 'desktop';
      const all = this.layers.flatMap(l => l.sprites);
      if (from === 'desktop') {
        this._desktopSize = { width: this.width, height: this.height };
        for (const sp of all) sp._desktop = DocumentModel.captureView(sp);
      } else {
        this.views[from] = { width: this.width, height: this.height };
        for (const sp of all) { sp.responsive = sp.responsive || {}; sp.responsive[from] = DocumentModel.captureView(sp); }
      }
      const desk = this._desktopSize || { width: this.width, height: this.height };
      if (name === 'desktop') {
        for (const sp of all) { if (sp._desktop) DocumentModel.applyView(sp, sp._desktop); delete sp._desktop; }
        this.width = desk.width; this.height = desk.height;
      } else if (!this.views[name]) {
        // A new view starts as the desktop design reflowed to its width.
        for (const sp of all) {
          if (sp._desktop) DocumentModel.applyView(sp, sp._desktop);
          else sp._desktop = DocumentModel.captureView(sp);
        }
        this.width = desk.width; this.height = desk.height;
        const flow = new Reflow(Reflow.describe(this, PhotoshopCanvas.fontStack));
        // Animations are shared by all views: they are left as they are.
        this.applyLayout(flow.layout(DocumentModel.viewWidths()[name]), this.captureGeometry(), false);
        this.views[name] = { width: this.width, height: this.height };
      } else {
        const s = this.views[name].width / desk.width;
        for (const sp of all) {
          const deskVals = sp._desktop || DocumentModel.captureView(sp);
          if (!sp._desktop) sp._desktop = deskVals;
          const saved = sp.responsive && sp.responsive[name];
          DocumentModel.applyView(sp, saved || DocumentModel.scaledView(deskVals, s));
        }
        this.width = this.views[name].width; this.height = this.views[name].height;
      }
      this.activeView = name;
      return true;
    }

    // Change the canvas (current view) size. mode: 'fit' scales the content
    // uniformly and centres it, 'stretch' maps positions to the new size,
    // 'keep' leaves the content where it is.
    resizeCanvas(w, h, mode = 'fit') {
      const ow = this.width, oh = this.height;
      if (!(w > 0 && h > 0)) return;
      if (mode !== 'keep' && ow > 0 && oh > 0) {
        const sx = w / ow, sy = h / oh, k = Math.min(sx, sy);
        const offX = mode === 'fit' ? (w - ow * k) / 2 : 0, offY = mode === 'fit' ? (h - oh * k) / 2 : 0;
        for (const l of this.layers) {
          for (const sp of l.sprites) {
            if (mode === 'fit') {
              sp.x = sp.x * k + offX; sp.y = sp.y * k + offY;
              sp.width = sp.width * k; sp.height = sp.height * k;
            } else {
              sp.x = sp.x * sx; sp.y = sp.y * sy;
              sp.width = sp.width * sx; sp.height = sp.height * sy;
            }
            const fk = mode === 'fit' ? k : Math.min(sx, sy);
            if (sp.fontSize) sp.fontSize = Math.max(6, Math.round(sp.fontSize * fk));
            const lbl = DocumentModel.labelOf(sp);
            if (lbl && lbl.params.fontSize) lbl.params.fontSize = Math.max(6, Math.round(lbl.params.fontSize * fk));
            if (sp.strokeWidth) sp.strokeWidth = sp.strokeWidth * fk;
            // brush strokes / path points are stored relative to the sprite centre
            const scalePts = pts => (pts || []).forEach(pt => { for (const key of ['x', 'cp1x', 'cp2x']) if (isFinite(pt[key])) pt[key] *= (mode === 'fit' ? k : sx);
              for (const key of ['y', 'cp1y', 'cp2y']) if (isFinite(pt[key])) pt[key] *= (mode === 'fit' ? k : sy); });
            scalePts(sp.pathPoints);
            for (const st of sp.strokes || []) { scalePts(st.points); if (st.size) st.size *= fk; }
            sp._wrapCache = null;
          }
        }
      }
      this.width = Math.round(w);
      this.height = Math.round(h);
    }

    // Remove a tablet/mobile layout (its overrides) entirely.
    removeView(name) {
      if (name === 'desktop' || !this.views[name]) return;
      if (this.activeView === name) this.switchView('desktop');
      delete this.views[name];
      for (const l of this.layers) for (const sp of l.sprites) if (sp.responsive) delete sp.responsive[name];
    }

    toJSON() {
      const json = this._toJSONRaw();
      json.activeView = this.activeView || 'desktop';
      if (json.activeView === 'desktop') return json;
      // Normalise: desktop values in the base fields, the active view as an override.
      const desk = this._desktopSize || { width: this.width, height: this.height };
      json.views = Object.assign({}, this.views, { [json.activeView]: { width: this.width, height: this.height } });
      json.width = desk.width; json.height = desk.height;
      const byId = new Map(this.layers.flatMap(l => l.sprites).map(sp => [sp.id, sp]));
      for (const lj of json.layers) {
        for (const sj of lj.sprites) {
          const sp = byId.get(sj.id);
          if (!sp) continue;
          sj.responsive = Object.assign({}, sj.responsive || {}, { [json.activeView]: DocumentModel.captureView(sp) });
          const d = sp._desktop || DocumentModel.captureView(sp);
          for (const k of DocumentModel.viewProps()) if (d[k] !== undefined) sj[k] = d[k];
          const lbl = DocumentModel.labelOf(sj);
          if (lbl && d.labelFontSize !== undefined) lbl.params.fontSize = d.labelFontSize;
        }
      }
      return json;
    }

    _toJSONRaw() {
      return {
        name: this.name, width: this.width, height: this.height,
        backgroundColor: this.backgroundColor, transparentBackground: this.transparentBackground,
        foregroundColor: this.foregroundColor, backgroundColorSecondary: this.backgroundColorSecondary,
        totalFrames: this.totalFrames, fps: this.fps, isLooping: this.isLooping,
        currentFrame: this.currentFrame,
        selectedLayerId: this.selectedLayerId,
        selectedSpriteId: this.selectedSpriteId,
        fonts: (this.fonts || []).map(f => ({ family: f.family, src: f.src })),
        views: JSON.parse(JSON.stringify(this.views || {})),
        layers: this.layers.map(l => l.toJSON())
      };
    }
  }

  // ==========================================================================
  // 5. TransformBox (Free Transform)
  // ==========================================================================
  // ==========================================================================
  // 6. TransformBox (Decoupled Performance: Canvas Repaint vs History Commit)
  // ==========================================================================
  class TransformBox {
    constructor(docModel, onTransformMove, onTransformEnd) {
      this.doc = docModel;
      this.onTransformMove = onTransformMove;
      this.onTransformEnd = onTransformEnd;
      this.handleSize = 8;
      this.mode = null; // 'body', 'nw', 'ne', 'se', 'sw', 'n', 's', 'e', 'w', 'rot'
      this.startPos = { x: 0, y: 0 };
      this.origLayer = null;
      this.origPathPoints = null;
      this.snapGuides = [];
    }

    getTarget() {
      return this.doc.getSelectedSprite(false);
    }

    getHandles(target) {
      if (!target) return [];
      const hw = (target.width * target.scaleX) / 2;
      const hh = (target.height * target.scaleY) / 2;
      const rad = (target.rotation * Math.PI) / 180;
      const cos = Math.cos(rad), sin = Math.sin(rad);

      const toWorld = (lx, ly) => ({
        x: target.x + lx * cos - ly * sin,
        y: target.y + lx * sin + ly * cos
      });

      return [
        { id: 'nw', ...toWorld(-hw, -hh), cursor: 'nwse-resize' },
        { id: 'ne', ...toWorld(hw, -hh), cursor: 'nesw-resize' },
        { id: 'se', ...toWorld(hw, hh), cursor: 'nwse-resize' },
        { id: 'sw', ...toWorld(-hw, hh), cursor: 'nesw-resize' },
        { id: 'n', ...toWorld(0, -hh), cursor: 'ns-resize' },
        { id: 's', ...toWorld(0, hh), cursor: 'ns-resize' },
        { id: 'w', ...toWorld(-hw, 0), cursor: 'ew-resize' },
        { id: 'e', ...toWorld(hw, 0), cursor: 'ew-resize' },
        { id: 'rot', ...toWorld(0, -hh - 24), cursor: 'grab' }
      ];
    }

    hitTest(wx, wy, target) {
      if (!target) return null;
      const handles = this.getHandles(target);
      const hitRadius = 8;

      for (const h of handles) {
        if (Math.hypot(wx - h.x, wy - h.y) <= hitRadius) return h.id;
      }

      // Inside body check
      const rad = (-target.rotation * Math.PI) / 180;
      const dx = wx - target.x, dy = wy - target.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      const hw = (target.width * target.scaleX) / 2;
      const hh = (target.height * target.scaleY) / 2;

      if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) return 'body';
      return null;
    }

    startDrag(a, b, c, d) {
      let wx, wy, mode, target;
      if (typeof a === 'string') {
        mode = a; wx = b; wy = c; target = d;
      } else {
        wx = a; wy = b; mode = c; target = d;
      }
      if (!target) target = this.getTarget();
      if (!target) return;
      this.mode = mode;
      this.startPos = { x: wx, y: wy };
      this.origLayer = JSON.parse(JSON.stringify(target));
      if (target.pathPoints) {
        this.origPathPoints = JSON.parse(JSON.stringify(target.pathPoints));
      }
    }

    drag(wx, wy, shiftKey = false) {
      if (!this.mode) return;
      const target = this.getTarget();
      if (!target) return;
      const dx = wx - this.startPos.x;
      const dy = wy - this.startPos.y;

      if (this.mode === 'body') {
        let nx = this.origLayer.x + dx;
        let ny = this.origLayer.y + dy;

        // Smart Snapping to Artboard & Other Sprites
        const snapDist = 7;
        const guides = [];
        const artW = this.doc.width, artH = this.doc.height;
        const hw = target.width / 2, hh = target.height / 2;

        const xCands = [
          { pos: hw, line: 0 },
          { pos: artW / 2, line: artW / 2 },
          { pos: artW - hw, line: artW }
        ];
        const yCands = [
          { pos: hh, line: 0 },
          { pos: artH / 2, line: artH / 2 },
          { pos: artH - hh, line: artH }
        ];

        for (const ly of this.doc.layers) {
          if (!ly.visible) continue;
          for (const sp of ly.sprites) {
            if (!sp.visible || sp.id === target.id) continue;
            const sphw = sp.width / 2, sphh = sp.height / 2;
            xCands.push({ pos: sp.x, line: sp.x });
            xCands.push({ pos: sp.x - sphw - hw, line: sp.x - sphw });
            xCands.push({ pos: sp.x + sphw + hw, line: sp.x + sphw });
            xCands.push({ pos: sp.x - sphw + hw, line: sp.x - sphw });
            xCands.push({ pos: sp.x + sphw - hw, line: sp.x + sphw });

            yCands.push({ pos: sp.y, line: sp.y });
            yCands.push({ pos: sp.y - sphh - hh, line: sp.y - sphh });
            yCands.push({ pos: sp.y + sphh + hh, line: sp.y + sphh });
            yCands.push({ pos: sp.y - sphh + hh, line: sp.y - sphh });
            yCands.push({ pos: sp.y + sphh - hh, line: sp.y + sphh });
          }
        }

        if (!shiftKey) {
          for (const c of xCands) {
            if (Math.abs(nx - c.pos) < snapDist) {
              nx = c.pos;
              guides.push({ type: 'v', x: c.line });
              break;
            }
          }
          for (const c of yCands) {
            if (Math.abs(ny - c.pos) < snapDist) {
              ny = c.pos;
              guides.push({ type: 'h', y: c.line });
              break;
            }
          }
        }

        this.snapGuides = guides;
        target.x = Math.round(nx);
        target.y = Math.round(ny);
      } else if (this.mode === 'rot') {
        const startAngle = Math.atan2(this.startPos.y - target.y, this.startPos.x - target.x);
        const curAngle = Math.atan2(wy - target.y, wx - target.x);
        let deg = this.origLayer.rotation + ((curAngle - startAngle) * 180) / Math.PI;
        if (shiftKey) deg = Math.round(deg / 15) * 15;
        target.rotation = Math.round(deg);
      } else {
        // FIXED OPPOSITE ANCHOR RESIZING (Opposite edge/corner remains 100% fixed)
        const origW = this.origLayer.width;
        const origH = this.origLayer.height;
        const rad = (this.origLayer.rotation * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);

        // Local displacement
        let ldx = dx * cos + dy * sin;
        let ldy = -dx * sin + dy * cos;

        // Smart Snapping during resizing
        const snapDist = 7;
        const guides = [];
        const artW = this.doc.width, artH = this.doc.height;
        let snapX = null, snapY = null;
        if (!shiftKey) {
          const checkSnap = (val, lineVal, isHoriz) => {
            if (isHoriz) {
              if (snapY === null && Math.abs(val - lineVal) < snapDist) {
                snapY = lineVal;
                guides.push({ type: 'h', y: lineVal });
              }
            } else {
              if (snapX === null && Math.abs(val - lineVal) < snapDist) {
                snapX = lineVal;
                guides.push({ type: 'v', x: lineVal });
              }
            }
          };

          for (const ly of this.doc.layers) {
            if (!ly.visible) continue;
            for (const sp of ly.sprites) {
              if (!sp.visible || sp.id === target.id) continue;
              const sphw = sp.width / 2, sphh = sp.height / 2;
              checkSnap(wx, sp.x - sphw, false);
              checkSnap(wx, sp.x, false);
              checkSnap(wx, sp.x + sphw, false);
              checkSnap(wy, sp.y - sphh, true);
              checkSnap(wy, sp.y, true);
              checkSnap(wy, sp.y + sphh, true);
            }
          }
          checkSnap(wx, 0, false);
          checkSnap(wx, artW / 2, false);
          checkSnap(wx, artW, false);
          checkSnap(wy, 0, true);
          checkSnap(wy, artH / 2, true);
          checkSnap(wy, artH, true);
        }
        this.snapGuides = guides;

        // Apply magnetic snap displacement to resize handle
        const effWx = snapX !== null ? snapX : wx;
        const effWy = snapY !== null ? snapY : wy;
        const effDx = effWx - this.startPos.x;
        const effDy = effWy - this.startPos.y;
        ldx = effDx * cos + effDy * sin;
        ldy = -effDx * sin + effDy * cos;

        let uOpp = 0, vOpp = 0;
        let uOppNew = 0, vOppNew = 0;
        let nw = origW;
        let nh = origH;

        if (this.mode === 'e') {
          nw = Math.max(10, origW + ldx);
          uOpp = -origW / 2; vOpp = 0;
          uOppNew = -nw / 2; vOppNew = 0;
        } else if (this.mode === 'w') {
          nw = Math.max(10, origW - ldx);
          uOpp = origW / 2; vOpp = 0;
          uOppNew = nw / 2; vOppNew = 0;
        } else if (this.mode === 's') {
          nh = Math.max(10, origH + ldy);
          uOpp = 0; vOpp = -origH / 2;
          uOppNew = 0; vOppNew = -nh / 2;
        } else if (this.mode === 'n') {
          nh = Math.max(10, origH - ldy);
          uOpp = 0; vOpp = origH / 2;
          uOppNew = 0; vOppNew = nh / 2;
        } else if (this.mode === 'se') {
          nw = Math.max(10, origW + ldx);
          nh = Math.max(10, origH + ldy);
          if (shiftKey || target.lockAspectRatio) {
            const r = origW / (origH || 1);
            if (Math.abs(ldx) > Math.abs(ldy)) nh = Math.max(10, nw / r);
            else nw = Math.max(10, nh * r);
          }
          uOpp = -origW / 2; vOpp = -origH / 2;
          uOppNew = -nw / 2; vOppNew = -nh / 2;
        } else if (this.mode === 'sw') {
          nw = Math.max(10, origW - ldx);
          nh = Math.max(10, origH + ldy);
          if (shiftKey || target.lockAspectRatio) {
            const r = origW / (origH || 1);
            if (Math.abs(ldx) > Math.abs(ldy)) nh = Math.max(10, nw / r);
            else nw = Math.max(10, nh * r);
          }
          uOpp = origW / 2; vOpp = -origH / 2;
          uOppNew = nw / 2; vOppNew = -nh / 2;
        } else if (this.mode === 'ne') {
          nw = Math.max(10, origW + ldx);
          nh = Math.max(10, origH - ldy);
          if (shiftKey || target.lockAspectRatio) {
            const r = origW / (origH || 1);
            if (Math.abs(ldx) > Math.abs(ldy)) nh = Math.max(10, nw / r);
            else nw = Math.max(10, nh * r);
          }
          uOpp = -origW / 2; vOpp = origH / 2;
          uOppNew = -nw / 2; vOppNew = nh / 2;
        } else if (this.mode === 'nw') {
          nw = Math.max(10, origW - ldx);
          nh = Math.max(10, origH - ldy);
          if (shiftKey || target.lockAspectRatio) {
            const r = origW / (origH || 1);
            if (Math.abs(ldx) > Math.abs(ldy)) nh = Math.max(10, nw / r);
            else nw = Math.max(10, nh * r);
          }
          uOpp = origW / 2; vOpp = origH / 2;
          uOppNew = nw / 2; vOppNew = nh / 2;
        }

        // Fixed opposite world anchor point
        const oppWorldX = this.origLayer.x + (uOpp * cos - vOpp * sin);
        const oppWorldY = this.origLayer.y + (uOpp * sin + vOpp * cos);

        // Shift center to keep opposite point perfectly anchored
        target.x = Math.round(oppWorldX - (uOppNew * cos - vOppNew * sin));
        target.y = Math.round(oppWorldY - (uOppNew * sin + vOppNew * cos));
        target.width = Math.round(nw);
        target.height = Math.round(nh);

        if (target.pathPoints && this.origPathPoints && origW > 0 && origH > 0) {
          const sx = target.width / origW;
          const sy = target.height / origH;
          target.pathPoints = this.origPathPoints.map(p => ({
            ...p,
            x: Math.round(p.x * sx),
            y: Math.round(p.y * sy),
            cp1x: p.cp1x !== undefined ? Math.round(p.cp1x * sx) : undefined,
            cp1y: p.cp1y !== undefined ? Math.round(p.cp1y * sy) : undefined,
            cp2x: p.cp2x !== undefined ? Math.round(p.cp2x * sx) : undefined,
            cp2y: p.cp2y !== undefined ? Math.round(p.cp2y * sy) : undefined
          }));
        }
      }

      if (this.doc.autoKey && this.doc.isPlaying === false) {
        ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'width', 'height'].forEach(p => {
          if (target[p] !== this.origLayer[p]) target.addKeyframe(p, this.doc.currentFrame, target[p]);
        });
      }

      // Fast canvas repaint only (no DOM rebuild!)
      if (this.onTransformMove) this.onTransformMove();
    }

    endDrag() {
      if (!this.mode) return;
      this.mode = null;
      this.snapGuides = [];
      this.doc.saveState();
      // Commit state and update Inspector inputs
      if (this.onTransformEnd) this.onTransformEnd();
    }

    getCursor(mode) {
      if (!mode) return 'default';
      if (mode === 'body') return 'move';
      if (mode === 'rot') return 'grab';
      const map = {
        nw: 'nwse-resize', ne: 'nesw-resize', se: 'nwse-resize', sw: 'nesw-resize',
        n: 'ns-resize', s: 'ns-resize', e: 'ew-resize', w: 'ew-resize'
      };
      return map[mode] || 'default';
    }
  }

  class PhotoshopCanvas {
    constructor(canvasEl, docModel) {
      this.canvas = canvasEl;
      this.ctx = canvasEl.getContext('2d');
      this.doc = docModel;
      this.panX = 0;
      this.panY = 0;
      this.zoom = 1;
      this.mode = 'edit'; // 'edit' or 'preview'
      this.showRulers = true;
      this.centerArtboard();
    }

    // Artboard resize grips (screen-sized) on the right edge, bottom edge
    // and bottom-right corner, in world coordinates of the current transform.
    artboardHandles() {
      const W = this.doc.width, H = this.doc.height;
      return [['r', W, H / 2], ['b', W / 2, H], ['rb', W, H]];
    }

    // Which grip / edge band (just outside the artboard) is under a screen point.
    hitArtboardHandle(sx, sy) {
      const W = this.doc.width * this.zoom, H = this.doc.height * this.zoom;
      const x = sx - this.panX, y = sy - this.panY;
      const near = (v, t) => v >= t - 4 && v <= t + 10;
      if (near(x, W) && near(y, H)) return 'rb';
      if (near(x, W) && y >= 0 && y <= H) return 'r';
      if (near(y, H) && x >= 0 && x <= W) return 'b';
      return null;
    }

    drawArtboardHandles(ctx) {
      const app = typeof window !== 'undefined' ? window.jspenApp : null;
      const drag = app && app.artboardDrag;
      const z = this.zoom;
      ctx.save();
      for (const [edge, x, y] of this.artboardHandles()) {
        const active = drag && drag.edge === edge;
        const w = (edge === 'b' ? 18 : 6) / z, h = (edge === 'r' ? 18 : 6) / z;
        ctx.fillStyle = active ? '#38bdf8' : 'rgba(228,228,231,0.85)';
        ctx.strokeStyle = 'rgba(0,0,0,0.6)';
        ctx.lineWidth = 1 / z;
        ctx.fillRect(x - w / 2, y - h / 2, w, h);
        ctx.strokeRect(x - w / 2, y - h / 2, w, h);
      }
      if (drag) {
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5 / z;
        ctx.setLineDash([6 / z, 4 / z]);
        ctx.strokeRect(0, 0, this.doc.width, this.doc.height);
        ctx.setLineDash([]);
        const label = `${this.doc.width} × ${this.doc.height}`;
        ctx.font = `bold ${12 / z}px sans-serif`;
        const tw = ctx.measureText(label).width;
        const lx = this.doc.width + 10 / z, ly = this.doc.height + 10 / z;
        ctx.fillStyle = 'rgba(24,24,27,0.92)';
        ctx.fillRect(lx, ly, tw + 14 / z, 20 / z);
        ctx.fillStyle = '#f4f4f5';
        ctx.fillText(label, lx + 7 / z, ly + 14 / z);
      }
      ctx.restore();
    }

    centerArtboard() {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth, ph = parent.clientHeight;
      this.panX = Math.round((pw - this.doc.width * this.zoom) / 2);
      this.panY = Math.round((ph - this.doc.height * this.zoom) / 2);
    }

    // Sample the rendered viewport pixel at screen coords (eyedropper loupe).
    getPixelColor(sx, sy) {
      const x = Math.floor(sx), y = Math.floor(sy);
      if (x < 0 || y < 0 || x >= this.canvas.width || y >= this.canvas.height) return null;
      try {
        const [r, g, b, a] = this.ctx.getImageData(x, y, 1, 1).data;
        const hex = '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
        return { r, g, b, a, hex };
      } catch (_) {
        return null;
      }
    }

    screenToWorld(sx, sy) {
      return {
        x: (sx - this.panX) / this.zoom,
        y: (sy - this.panY) / this.zoom
      };
    }

    worldToScreen(wx, wy) {
      return {
        x: wx * this.zoom + this.panX,
        y: wy * this.zoom + this.panY
      };
    }

    render(activeTool, transformBox, activePenPoints, activeGradientDrag, activeCurvePoints, shapeDragStart, shapeDragCurrent, activeBrushStroke) {
      const ctx = this.ctx;
      const w = this.canvas.width, h = this.canvas.height;
      ctx.clearRect(0, 0, w, h);

      // Dark Workspace Background
      ctx.fillStyle = '#141416';
      ctx.fillRect(0, 0, w, h);

      ctx.save();
      ctx.translate(this.panX, this.panY);
      ctx.scale(this.zoom, this.zoom);

      const aw = this.doc.width, ah = this.doc.height;

      // Draw Artboard Base
      if (this.doc.transparentBackground) {
        // Flat 2D checkerboard with zero 3D shadow or gradient
        this.drawCheckerboard(ctx, aw, ah);
        ctx.strokeStyle = '#3f3f46';
        ctx.lineWidth = 1 / this.zoom;
        ctx.strokeRect(0, 0, aw, ah);
      } else {
        ctx.fillStyle = this.doc.backgroundColor;
        ctx.fillRect(0, 0, aw, ah);
      }

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, aw, ah);
      ctx.clip();

      // Render all layers and their child sprites
      for (const layer of this.doc.layers) {
        if (!layer.visible) continue;
        this.drawLayer(ctx, layer);
      }

      // Draw particles if emitter active
      if (this.mode === 'preview') { this.drawParticles(ctx); this.drawScreenFade(ctx); }

      ctx.restore(); // end clip

      // Live shape creation preview
      if (shapeDragStart && shapeDragCurrent) {
        ctx.save();
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5 / this.zoom;
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        const sx = Math.min(shapeDragStart.x, shapeDragCurrent.x);
        const sy = Math.min(shapeDragStart.y, shapeDragCurrent.y);
        const sw = Math.abs(shapeDragCurrent.x - shapeDragStart.x);
        const sh = Math.abs(shapeDragCurrent.y - shapeDragStart.y);
        if (activeTool === 'shape' && window.jspenApp?.tools?.activeShapeType === 'circle') {
          ctx.beginPath();
          ctx.ellipse(sx + sw / 2, sy + sh / 2, sw / 2, sh / 2, 0, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          ctx.strokeRect(sx, sy, sw, sh);
        }
        ctx.restore();
      }

      // Edit Mode Overlays
      if (this.mode === 'edit') {
        this.drawArtboardHandles(ctx);
        const selSprite = this.doc.getSelectedSprite(false);
        if (selSprite && transformBox && (activeTool === 'move' || activeTool === 'direct')) {
          this.drawTransformGizmo(ctx, selSprite, transformBox);
        }

        // Draw selection outlines for all other selected sprites (e.g. from Ctrl+A / multi-selection)
        if (this.doc.selectedSpriteIds && this.doc.selectedSpriteIds.size > 1 && (activeTool === 'move' || activeTool === 'direct')) {
          for (const spId of this.doc.selectedSpriteIds) {
            if (selSprite && spId === selSprite.id) continue;
            let otherSp = null;
            for (const layer of this.doc.layers) {
              otherSp = layer.getSprite(spId);
              if (otherSp) break;
            }
            if (otherSp) {
              ctx.save();
              ctx.strokeStyle = '#e4e4e7';
              ctx.lineWidth = 1.2 / this.zoom;
              ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
              const ohw = (otherSp.width * (otherSp.scaleX || 1)) / 2;
              const ohh = (otherSp.height * (otherSp.scaleY || 1)) / 2;
              ctx.translate(otherSp.x, otherSp.y);
              ctx.rotate(((otherSp.rotation || 0) * Math.PI) / 180);
              ctx.strokeRect(-ohw, -ohh, ohw * 2, ohh * 2);
              ctx.restore();
            }
          }

          // Visual Feedback HUD Badge
          ctx.save();
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          const badgeText = `선택된 스프라이트: ${this.doc.selectedSpriteIds.size}개`;
          ctx.font = 'bold 11px sans-serif';
          const tw = ctx.measureText(badgeText).width;
          ctx.fillStyle = 'rgba(24, 24, 27, 0.9)';
          ctx.strokeStyle = '#52525b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(16, 16, tw + 20, 24, 4);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f4f4f5';
          ctx.fillText(badgeText, 26, 32);
          ctx.restore();
        }

        // Pen Overlay
        if (activePenPoints && activePenPoints.length > 0) {
          this.drawPenPathOverlay(ctx, activePenPoints);
        }

        // Bezier Curve Tool Overlay
        if (activeCurvePoints && activeCurvePoints.length > 0) {
          this.drawCurveOverlay(ctx, activeCurvePoints);
        }

        // Real-time Brush Tool Stroke Overlay with Quadratic Smoothing
        if (activeBrushStroke && activeBrushStroke.length > 0) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = this.doc.foregroundColor || '#ffffff';
          ctx.lineWidth = (window.jspenApp?.tools?.brushSize || 6);
          ctx.beginPath();
          ctx.moveTo(activeBrushStroke[0].x, activeBrushStroke[0].y);
          for (let i = 1; i < activeBrushStroke.length - 1; i++) {
            const xc = (activeBrushStroke[i].x + activeBrushStroke[i + 1].x) / 2;
            const yc = (activeBrushStroke[i].y + activeBrushStroke[i + 1].y) / 2;
            ctx.quadraticCurveTo(activeBrushStroke[i].x, activeBrushStroke[i].y, xc, yc);
          }
          if (activeBrushStroke.length > 1) {
            const last = activeBrushStroke[activeBrushStroke.length - 1];
            ctx.lineTo(last.x, last.y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      ctx.restore();

      // Draw Pink Smart Snap Guidelines
      if (transformBox && transformBox.snapGuides && transformBox.snapGuides.length > 0) {
        ctx.save();
        ctx.translate(this.panX, this.panY);
        ctx.scale(this.zoom, this.zoom);
        ctx.strokeStyle = '#f43f5e';
        ctx.lineWidth = 1.2 / this.zoom;
        ctx.setLineDash([4 / this.zoom, 4 / this.zoom]);
        for (const g of transformBox.snapGuides) {
          ctx.beginPath();
          if (g.type === 'v') {
            ctx.moveTo(g.x, -5000);
            ctx.lineTo(g.x, 15000);
          } else if (g.type === 'h') {
            ctx.moveTo(-5000, g.y);
            ctx.lineTo(15000, g.y);
          }
          ctx.stroke();
        }
        ctx.restore();
      }

      if (this.showRulers && this.mode === 'edit') {
        this.drawRulers(ctx, w, h);
      }
    }

    drawCheckerboard(ctx, w, h) {
      if (!this._checkerPattern) {
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 32;
        pCanvas.height = 32;
        const pCtx = pCanvas.getContext('2d');
        pCtx.fillStyle = '#242428';
        pCtx.fillRect(0, 0, 32, 32);
        pCtx.fillStyle = '#1c1c20';
        pCtx.fillRect(0, 0, 16, 16);
        pCtx.fillRect(16, 16, 16, 16);
        this._checkerPattern = ctx.createPattern(pCanvas, 'repeat');
      }
      ctx.fillStyle = this._checkerPattern;
      ctx.fillRect(0, 0, w, h);
    }

    drawLayer(ctx, layer) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
      if (layer.blendMode) ctx.globalCompositeOperation = layer.blendMode;

      // Photoshop Layer-level Filters
      if (layer.filters) {
        const lf = layer.filters;
        const fltrs = [];
        if (lf.blur) fltrs.push(`blur(${lf.blur}px)`);
        if (lf.brightness !== undefined && lf.brightness !== 100) fltrs.push(`brightness(${lf.brightness}%)`);
        if (lf.contrast !== undefined && lf.contrast !== 100) fltrs.push(`contrast(${lf.contrast}%)`);
        if (lf.saturate !== undefined && lf.saturate !== 100) fltrs.push(`saturate(${lf.saturate}%)`);
        if (lf.grayscale) fltrs.push(`grayscale(${lf.grayscale}%)`);
        if (lf.sepia) fltrs.push(`sepia(${lf.sepia}%)`);
        if (lf.hueRotate) fltrs.push(`hue-rotate(${lf.hueRotate}deg)`);
        if (lf.invert) fltrs.push(`invert(${lf.invert}%)`);
        if (lf.opacity !== undefined && lf.opacity !== 100) {
          fltrs.push(`opacity(${lf.opacity}%)`);
          ctx.globalAlpha *= Math.max(0, Math.min(1, lf.opacity / 100));
        }
        if (lf.dropShadow) fltrs.push(`drop-shadow(0px 8px 16px rgba(0,0,0,0.5))`);
        if (fltrs.length > 0) ctx.filter = fltrs.join(' ');
      }

      for (let sIdx = 0; sIdx < layer.sprites.length; sIdx++) {
        const sprite = layer.sprites[sIdx];
        if (!sprite.visible) continue;

        // Check for active Substance Painter style mask module
        const subMask = (sprite.modules || []).find(m => m.enabled !== false && m.type === 'substance_mask');
        const isMask = sprite.isMask || (sprite.maskMode && sprite.maskMode !== 'none');

        if (subMask) {
          const p = subMask.params || {};
          const maskType = p.maskType || 'white';
          const intensity = Math.max(0, Math.min(100, p.intensity !== undefined ? p.intensity : 100)) / 100;
          const invert = !!p.invert;
          const feather = Math.max(0, p.feather || 0);

          if (maskType === 'black') {
            const effectiveAlpha = invert ? intensity : (1 - intensity);
            ctx.save();
            ctx.globalAlpha *= effectiveAlpha;
            this.drawSprite(ctx, sprite);
            ctx.restore();
            continue;
          } else if (maskType === 'white') {
            const effectiveAlpha = invert ? (1 - intensity) : intensity;
            ctx.save();
            ctx.globalAlpha *= effectiveAlpha;
            this.drawSprite(ctx, sprite);
            ctx.restore();
            continue;
          } else if (maskType === 'clip' || maskType === 'invert') {
            let maskBase = null;
            if (p.targetSpriteId) {
              maskBase = layer.sprites.find(s => s.id === p.targetSpriteId);
            }
            if (!maskBase && sIdx > 0) {
              maskBase = layer.sprites[sIdx - 1];
            }
            if (maskBase && maskBase.visible) {
              if (!this._maskCanvas) this._maskCanvas = document.createElement('canvas');
              if (this._maskCanvas.width !== this.doc.width || this._maskCanvas.height !== this.doc.height) {
                this._maskCanvas.width = this.doc.width;
                this._maskCanvas.height = this.doc.height;
              }
              const mCtx = this._maskCanvas.getContext('2d');
              mCtx.clearRect(0, 0, this.doc.width, this.doc.height);

              // 1. Draw base mask silhouette
              mCtx.save();
              if (feather > 0) {
                mCtx.filter = `blur(${feather}px)`;
              }
              this.drawSprite(mCtx, maskBase);
              mCtx.restore();

              // 2. Composite sprite into mask silhouette
              mCtx.save();
              const compOp = (maskType === 'invert' || invert) ? 'source-out' : 'source-in';
              mCtx.globalCompositeOperation = compOp;
              this.drawSprite(mCtx, sprite);
              mCtx.restore();

              // 3. Composite onto main canvas with intensity
              ctx.save();
              ctx.globalAlpha *= intensity;
              ctx.drawImage(this._maskCanvas, 0, 0);
              ctx.restore();
              continue;
            }
          }
        } else if (isMask) {
          let maskBase = null;
          if (sprite.maskTargetId) {
            maskBase = layer.sprites.find(s => s.id === sprite.maskTargetId);
          }
          if (!maskBase && sIdx > 0) {
            maskBase = layer.sprites[sIdx - 1];
          }

          if (maskBase && maskBase.visible) {
            if (!this._maskCanvas) this._maskCanvas = document.createElement('canvas');
            if (this._maskCanvas.width !== this.doc.width || this._maskCanvas.height !== this.doc.height) {
              this._maskCanvas.width = this.doc.width;
              this._maskCanvas.height = this.doc.height;
            }
            const mCtx = this._maskCanvas.getContext('2d');
            mCtx.clearRect(0, 0, this.doc.width, this.doc.height);

            // 1. Draw base mask silhouette
            mCtx.save();
            this.drawSprite(mCtx, maskBase);
            mCtx.restore();

            // 2. Composite target sprite into mask silhouette
            mCtx.save();
            mCtx.globalCompositeOperation = (sprite.maskMode === 'inverted_mask' ? 'source-out' : 'source-in');
            this.drawSprite(mCtx, sprite);
            mCtx.restore();

            // 3. Composite onto main canvas
            ctx.save();
            ctx.drawImage(this._maskCanvas, 0, 0);
            ctx.restore();
            continue;
          }
        }

        this.drawSprite(ctx, sprite);
      }
      ctx.restore();
    }

    static defaultFontStack() {
      return '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif';
    }

    // CSS/canvas font-family for a chosen family. A plain name is quoted and
    // gets the default fallbacks; a full stack is used as is (sanitised).
    static fontStack(family) {
      const f = String(family || '').replace(/[;{}<>\\]/g, '').trim();
      if (!f) return PhotoshopCanvas.defaultFontStack();
      if (f.includes(',') || /["']/.test(f) || /^(serif|sans-serif|monospace|cursive|fantasy|system-ui)$/.test(f)) return f;
      return '"' + f + '", ' + PhotoshopCanvas.defaultFontStack();
    }

    static safeFontFamilyName(name) {
      return String(name || '').replace(/[^\w\s\-\uAC00-\uD7A3\u3131-\u318E]/g, '').trim().slice(0, 64);
    }

    // Register document fonts ({ family, src: data URL }) with the page;
    // onLoad runs after each font is ready (re-render, clear text caches).
    static loadDocumentFonts(fonts, onLoad) {
      if (typeof FontFace === 'undefined' || !document.fonts) return;
      PhotoshopCanvas._loadedFonts = PhotoshopCanvas._loadedFonts || new Set();
      for (const f of fonts || []) {
        const family = PhotoshopCanvas.safeFontFamilyName(f.family);
        const src = String(f.src || '');
        const key = family + '|' + src.length + '|' + src.slice(-32);
        if (!family || !/^data:(font|application)\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(src) || PhotoshopCanvas._loadedFonts.has(key)) continue;
        PhotoshopCanvas._loadedFonts.add(key);
        try {
          const face = new FontFace(family, 'url(' + src + ')');
          face.load().then(ff => { document.fonts.add(ff); if (onLoad) onLoad(family); }).catch(() => {});
        } catch (_) {}
      }
    }

    // Particles emitted by the module engine (studio preview / exported player).
    drawParticles(ctx) {
      const engine = this.moduleEngine || (typeof window !== 'undefined' && window.jspenApp ? window.jspenApp.moduleEngine : null);
      const particles = engine && engine.active && engine.bus ? engine.bus.particles : null;
      if (!particles || particles.length === 0) return;
      for (const p of particles) {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    // scene_transition fade: black overlay rising to full and back (triangle).
    drawScreenFade(ctx) {
      const engine = this.moduleEngine || (typeof window !== 'undefined' && window.jspenApp ? window.jspenApp.moduleEngine : null);
      const f = engine && engine.active && engine.bus ? engine.bus.fade : null;
      if (!f) return;
      const t = Math.max(0, Math.min(1, (engine.bus.time - f.start) / f.duration));
      const a = 1 - Math.abs(2 * t - 1);
      if (a <= 0) return;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, this.doc.width, this.doc.height);
      ctx.restore();
    }

    drawSprite(ctx, sprite) {
      // Sprites hidden at runtime by a trigger (hide_sprite) are skipped in preview.
      if (this.mode === 'preview' && sprite.runtime && sprite.runtime.visible === false) return;
      ctx.save();
      const lx = this.mode === 'preview' ? sprite.runtime.x : sprite.x;
      const ly = this.mode === 'preview' ? sprite.runtime.y : sprite.y;
      const lrot = this.mode === 'preview' ? (sprite.runtime.rotation + (sprite.runtime.tiltAngle || 0)) : sprite.rotation;
      const lsx = this.mode === 'preview' ? sprite.runtime.scaleX : sprite.scaleX;
      const lsy = this.mode === 'preview' ? sprite.runtime.scaleY : sprite.scaleY;
      const lop = this.mode === 'preview' ? sprite.runtime.opacity : sprite.opacity;

      ctx.translate(lx, ly);
      ctx.rotate((lrot * Math.PI) / 180);
      ctx.scale(lsx, lsy);
      ctx.globalAlpha = Math.max(0, Math.min(1, lop));

      if (sprite.blendMode) ctx.globalCompositeOperation = sprite.blendMode;

      // Apply Photoshop-style Graphic Filters (from sprite.filters and any active photoshop_filter module)
      const filterSources = [];
      if (sprite.filters) filterSources.push(sprite.filters);
      for (const m of (sprite.modules || [])) {
        if (m.enabled !== false && m.type === 'photoshop_filter' && m.params) {
          filterSources.push(m.params);
        }
      }
      if (filterSources.length > 0) {
        const fltrs = [];
        for (const f of filterSources) {
          if (f.blur) fltrs.push(`blur(${Math.max(0, f.blur)}px)`);
          if (f.brightness !== undefined && f.brightness !== 100) fltrs.push(`brightness(${Math.max(0, f.brightness)}%)`);
          if (f.contrast !== undefined && f.contrast !== 100) fltrs.push(`contrast(${Math.max(0, f.contrast)}%)`);
          if (f.saturate !== undefined && f.saturate !== 100) fltrs.push(`saturate(${Math.max(0, f.saturate)}%)`);
          if (f.grayscale) fltrs.push(`grayscale(${Math.max(0, Math.min(100, f.grayscale))}%)`);
          if (f.sepia) fltrs.push(`sepia(${Math.max(0, Math.min(100, f.sepia))}%)`);
          if (f.hueRotate) fltrs.push(`hue-rotate(${f.hueRotate}deg)`);
          if (f.invert) fltrs.push(`invert(${Math.max(0, Math.min(100, f.invert))}%)`);
          if (f.opacity !== undefined && f.opacity !== 100) {
            const clOp = Math.max(0, Math.min(100, f.opacity));
            fltrs.push(`opacity(${clOp}%)`);
            ctx.globalAlpha *= (clOp / 100);
          }
          if (f.dropShadow) fltrs.push(`drop-shadow(0px 8px 16px rgba(0,0,0,0.5))`);
        }
        if (fltrs.length > 0) ctx.filter = fltrs.join(' ');
      }

      // Draw Brush Strokes with Quadratic Midpoint Smoothing
      if (sprite.strokes && sprite.strokes.length > 0) {
        for (const st of sprite.strokes) {
          if (!st.points || st.points.length === 0) continue;
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = st.color || '#e4e4e7';
          ctx.lineWidth = st.size || 4;
          if (st.opacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * st.opacity));
          ctx.beginPath();
          ctx.moveTo(st.points[0].x, st.points[0].y);
          for (let i = 1; i < st.points.length - 1; i++) {
            const xc = (st.points[i].x + st.points[i + 1].x) / 2;
            const yc = (st.points[i].y + st.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(st.points[i].x, st.points[i].y, xc, yc);
          }
          if (st.points.length > 1) {
            const last = st.points[st.points.length - 1];
            ctx.lineTo(last.x, last.y);
          }
          ctx.stroke();
          ctx.restore();
        }
      }

      if (sprite.type === 'empty') {
        ctx.restore();
        return;
      }

      const hw = sprite.width / 2, hh = sprite.height / 2;

      // Fill style
      if (sprite.fillType === 'linear-gradient' && sprite.gradient) {
        const angleDeg = sprite.gradient.angle !== undefined ? sprite.gradient.angle : (sprite.gradientAngle || 0);
        const rad = (angleDeg * Math.PI) / 180;
        const cos = Math.cos(rad);
        const sin = Math.sin(rad);
        const length = Math.max(10, Math.abs(hw * cos) + Math.abs(hh * sin));
        const grad = ctx.createLinearGradient(-cos * length, -sin * length, cos * length, sin * length);
        const stops = (sprite.gradient.stops && sprite.gradient.stops.length > 0) ? sprite.gradient.stops : [
          { offset: 0, color: '#ffffff' },
          { offset: 1, color: '#27272a' }
        ];
        for (const s of stops) grad.addColorStop(s.offset, s.color);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = sprite.fill || '#38bdf8';
      }

      if (sprite.type === 'rect' || sprite.type === 'bevel_rect') {
        ctx.beginPath();
        const cr = Number(sprite.cornerRadius) || 0;
        const bv = Number(sprite.bevel) || 0;

        if (cr > 0 && bv > 0) {
          // Interacting Bevel Chamfer + Corner Radius!
          const maxB = Math.min(hw, hh);
          const b = Math.min(bv, maxB);
          const r = Math.min(cr, b * 0.5, (hw - b) * 0.5, (hh - b) * 0.5);
          ctx.moveTo(-hw + b + r, -hh);
          ctx.arcTo(hw - b, -hh, hw, -hh + b, r);
          ctx.arcTo(hw, -hh + b, hw, hh - b, r);
          ctx.arcTo(hw, hh - b, hw - b, hh, r);
          ctx.arcTo(hw - b, hh, -hw + b, hh, r);
          ctx.arcTo(-hw + b, hh, -hw, hh - b, r);
          ctx.arcTo(-hw, hh - b, -hw, -hh + b, r);
          ctx.arcTo(-hw, -hh + b, -hw + b, -hh, r);
          ctx.arcTo(-hw + b, -hh, hw - b, -hh, r);
        } else if (cr > 0) {
          const r = Math.min(cr, hw, hh);
          ctx.moveTo(-hw + r, -hh);
          ctx.arcTo(hw, -hh, hw, hh, r);
          ctx.arcTo(hw, hh, -hw, hh, r);
          ctx.arcTo(-hw, hh, -hw, -hh, r);
          ctx.arcTo(-hw, -hh, hw, -hh, r);
        } else if (bv > 0) {
          const b = Math.min(bv, hw, hh);
          ctx.moveTo(-hw + b, -hh);
          ctx.lineTo(hw - b, -hh);
          ctx.lineTo(hw, -hh + b);
          ctx.lineTo(hw, hh - b);
          ctx.lineTo(hw - b, hh);
          ctx.lineTo(-hw + b, hh);
          ctx.lineTo(-hw, hh - b);
          ctx.lineTo(-hw, -hh + b);
        } else {
          ctx.rect(-hw, -hh, sprite.width, sprite.height);
        }
        ctx.closePath();

        if (sprite.fillType !== 'none' && sprite.fill !== 'transparent') {
          ctx.save();
          if (sprite.fillOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.fillOpacity));
          ctx.fill();
          ctx.restore();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.save();
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          if (sprite.strokeOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.strokeOpacity));
          ctx.stroke();
          ctx.restore();
        }
        const textMod = (sprite.modules || []).find(m => m.enabled !== false && m.type === 'text_label');
        if (textMod && textMod.params && textMod.params.text) {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop, textMod.params);
        } else if (sprite.text && sprite.type !== 'text') {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop, { text: sprite.text, fontSize: sprite.fontSize, color: sprite.textColor, fontWeight: sprite.fontWeight, textAlign: sprite.textAlign });
        }
      } else if (sprite.type === 'circle') {
        // True Ellipse supporting independent non-uniform scaling
        ctx.beginPath();
        ctx.ellipse(0, 0, Math.max(1, hw), Math.max(1, hh), 0, 0, Math.PI * 2);
        ctx.closePath();

        if (sprite.fillType !== 'none' && sprite.fill !== 'transparent') {
          ctx.save();
          if (sprite.fillOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.fillOpacity));
          ctx.fill();
          ctx.restore();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.save();
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          if (sprite.strokeOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.strokeOpacity));
          ctx.stroke();
          ctx.restore();
        }
        const textMod = (sprite.modules || []).find(m => m.enabled !== false && m.type === 'text_label');
        if (textMod && textMod.params && textMod.params.text) {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop, textMod.params);
        } else if (sprite.text && sprite.type !== 'text') {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop, { text: sprite.text, fontSize: sprite.fontSize, color: sprite.textColor, fontWeight: sprite.fontWeight, textAlign: sprite.textAlign });
        }
      } else if (sprite.type === 'star') {
        const outerR = Math.min(hw, hh);
        const innerR = outerR * (sprite.starInnerRatio || 0.45);
        const points = sprite.starPoints || 5;
        const totalPts = points * 2;
        const step = Math.PI / points;
        ctx.beginPath();
        for (let i = 0; i < totalPts; i++) {
          const r = (i % 2 === 0) ? outerR : innerR;
          const a = i * step - Math.PI / 2;
          const px = Math.cos(a) * r;
          const py = Math.sin(a) * r;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();

        if (sprite.fillType !== 'none' && sprite.fill !== 'transparent') {
          ctx.save();
          ctx.fillStyle = sprite.fill;
          if (sprite.fillOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.fillOpacity));
          ctx.fill();
          ctx.restore();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.save();
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          if (sprite.strokeOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.strokeOpacity));
          ctx.stroke();
          ctx.restore();
        }
        const textMod = (sprite.modules || []).find(m => m.enabled !== false && m.type === 'text_label');
        if (textMod && textMod.params && textMod.params.text) {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop, textMod.params);
        } else if (sprite.text && sprite.type !== 'text') {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop, { text: sprite.text, fontSize: sprite.fontSize, color: sprite.textColor, fontWeight: sprite.fontWeight, textAlign: sprite.textAlign });
        }
      } else if (sprite.type === 'brush') {
        const pts = sprite.brushStrokePoints || [];
        if (pts.length > 0) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = sprite.stroke || sprite.fill || '#ffffff';
          ctx.lineWidth = sprite.brushSize || 6;
          if (sprite.strokeOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.strokeOpacity));
          if (pts.length === 1) {
            ctx.beginPath();
            ctx.arc(pts[0].x, pts[0].y, (sprite.brushSize || 6) / 2, 0, Math.PI * 2);
            ctx.fillStyle = sprite.stroke || sprite.fill || '#ffffff';
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.moveTo(pts[0].x, pts[0].y);
            for (let i = 1; i < pts.length; i++) {
              ctx.lineTo(pts[i].x, pts[i].y);
            }
            ctx.stroke();
          }
          ctx.restore();
        }
      } else if (sprite.type === 'path') {
        if (sprite.pathPoints && sprite.pathPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(sprite.pathPoints[0].x, sprite.pathPoints[0].y);
          for (let i = 1; i < sprite.pathPoints.length; i++) {
            const prev = sprite.pathPoints[i - 1];
            const cur = sprite.pathPoints[i];
            const cp1x = prev.cp2x !== undefined ? prev.cp2x : prev.x;
            const cp1y = prev.cp2y !== undefined ? prev.cp2y : prev.y;
            const cp2x = cur.cp1x !== undefined ? cur.cp1x : cur.x;
            const cp2y = cur.cp1y !== undefined ? cur.cp1y : cur.y;
            ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, cur.x, cur.y);
          }
          if (sprite.isClosedPath || sprite.pathClosed) {
            const last = sprite.pathPoints[sprite.pathPoints.length - 1];
            const first = sprite.pathPoints[0];
            if (last && first) {
              const cp1x = last.cp2x !== undefined ? last.cp2x : last.x;
              const cp1y = last.cp2y !== undefined ? last.cp2y : last.y;
              const cp2x = first.cp1x !== undefined ? first.cp1x : first.x;
              const cp2y = first.cp1y !== undefined ? first.cp1y : first.y;
              ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, first.x, first.y);
            }
            ctx.closePath();
          }

          if (sprite.isClosedPath || sprite.pathClosed) {
            if (sprite.fill && sprite.fill !== 'transparent' && sprite.fillType !== 'none') {
              ctx.save();
              ctx.fillStyle = sprite.fill;
              if (sprite.fillOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.fillOpacity));
              ctx.fill();
              ctx.restore();
            }
          }

          if (sprite.strokeWidth > 0 && sprite.stroke) {
            ctx.save();
            ctx.strokeStyle = sprite.stroke;
            ctx.lineWidth = sprite.strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (sprite.strokeOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.strokeOpacity));
            ctx.stroke();
            ctx.restore();
          }
        }
      } else if (sprite.type === 'screen_trigger') {
        if (this.mode === 'preview') {
          ctx.restore();
          return;
        }
        // Screen Trigger Area (Dotted Cyan Border + Label)
        ctx.save();
        ctx.setLineDash([6, 4]);
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.5;
        ctx.fillStyle = 'rgba(56, 189, 248, 0.08)';
        ctx.fillRect(-hw, -hh, sprite.width, sprite.height);
        ctx.strokeRect(-hw, -hh, sprite.width, sprite.height);

        ctx.fillStyle = '#38bdf8';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(`⚡ ${sprite.name} (${sprite.triggerEvent || '진입 감지'})`, -hw + 8, -hh + 8);
        ctx.restore();
      } else if (sprite.type === 'form_field') {
        // Static look of an input (live inputs are DOM overlays at runtime).
        const spec = FormRuntime.fieldSpec(sprite);
        const W = sprite.width, H = sprite.height;
        const fs = Math.max(8, sprite.fontSize || 16);
        ctx.save();
        ctx.font = `${fs}px ${PhotoshopCanvas.fontStack(sprite.fontFamily && sprite.fontFamily !== 'Pretendard, sans-serif' ? sprite.fontFamily : '')}`;
        ctx.textBaseline = 'middle';
        if (spec.kind === 'checkbox') {
          const box = Math.min(H, fs + 4);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = sprite.stroke || '#a1a1aa';
          ctx.lineWidth = 1.5;
          ctx.beginPath(); ctx.roundRect(-W / 2, -box / 2, box, box, 3); ctx.fill(); ctx.stroke();
          if (spec.value === 'true' || spec.value === '1') {
            ctx.strokeStyle = '#18181b'; ctx.lineWidth = 2;
            ctx.beginPath(); ctx.moveTo(-W / 2 + box * 0.22, 0); ctx.lineTo(-W / 2 + box * 0.42, box * 0.22); ctx.lineTo(-W / 2 + box * 0.8, -box * 0.25); ctx.stroke();
          }
          ctx.fillStyle = sprite.textColor || '#e4e4e7';
          ctx.textAlign = 'left';
          ctx.fillText(spec.label || spec.placeholder || spec.name, -W / 2 + box + 8, 0);
        } else {
          const r = Math.min(sprite.cornerRadius || 6, H / 2, W / 2);
          ctx.fillStyle = sprite.fill && sprite.fill !== 'transparent' ? sprite.fill : '#ffffff';
          ctx.strokeStyle = sprite.stroke || '#a1a1aa';
          ctx.lineWidth = Math.max(1, sprite.strokeWidth || 1);
          ctx.beginPath(); ctx.roundRect(-W / 2, -H / 2, W, H, r); ctx.fill(); ctx.stroke();
          const shown = spec.value || spec.placeholder || (spec.kind === 'select' ? '선택하세요' : '');
          ctx.fillStyle = spec.value ? (sprite.textColor || '#18181b') : '#a1a1aa';
          ctx.textAlign = 'left';
          const ty = spec.kind === 'textarea' ? -H / 2 + 8 + fs / 2 : 0;
          ctx.save();
          ctx.beginPath(); ctx.rect(-W / 2 + 4, -H / 2, W - (spec.kind === 'select' ? 28 : 8), H); ctx.clip();
          ctx.fillText(shown, -W / 2 + 10, ty);
          ctx.restore();
          if (spec.kind === 'select') { ctx.fillStyle = '#71717a'; ctx.textAlign = 'right'; ctx.fillText('▾', W / 2 - 10, 0); }
        }
        ctx.restore();
      } else if (sprite.type === 'image') {
        if (sprite.imageUrl) {
          if (!sprite._imgObj || sprite._imgSrc !== sprite.imageUrl) {
            sprite._imgObj = new Image();
            sprite._imgSrc = sprite.imageUrl;
            sprite._imgObj.src = sprite.imageUrl;
            sprite._imgObj.onload = () => { if (typeof window !== 'undefined' && window.jspenApp?.renderCanvas) window.jspenApp.renderCanvas(); };
          }
          const img = sprite._imgObj;
          if (img.complete && img.naturalWidth) {
            // imageFit: 'cover' (default, crop to fill), 'contain' (whole image), 'fill' (stretch)
            const fit = sprite.imageFit || 'cover';
            const W = sprite.width, H = sprite.height, iw = img.naturalWidth, ih = img.naturalHeight;
            if (fit === 'fill') {
              ctx.drawImage(img, -hw, -hh, W, H);
            } else if (fit === 'contain') {
              const k = Math.min(W / iw, H / ih);
              ctx.drawImage(img, -iw * k / 2, -ih * k / 2, iw * k, ih * k);
            } else {
              const k = Math.max(W / iw, H / ih);
              const sw = W / k, sh = H / k;
              ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, -hw, -hh, W, H);
            }
          } else {
            ctx.fillStyle = '#27272a';
            ctx.fillRect(-hw, -hh, sprite.width, sprite.height);
            ctx.fillStyle = '#71717a';
            ctx.font = '12px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('🖼️ 이미지 로딩 중...', 0, 0);
          }
        }
      } else if (sprite.type === 'text') {
        ctx.save();
        const fontSize = sprite.fontSize || 16;
        ctx.font = `${sprite.fontWeight || 'normal'} ${fontSize}px ${PhotoshopCanvas.fontStack(sprite.fontFamily)}`;
        ctx.fillStyle = sprite.fill || '#ffffff';
        if (sprite.fillOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.fillOpacity));
        const textAlign = sprite.textAlign || 'center';
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';
        const maxTextW = Math.max(20, sprite.width || 40);
        const lines = this.wrapTextLines(ctx, sprite.text || '', maxTextW, sprite);
        const lh = fontSize * 1.35;
        const startY = -(lines.length - 1) * lh / 2;
        const textX = textAlign === 'left' ? -hw : (textAlign === 'right' ? hw : 0);
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], textX, startY + i * lh);
        }
        ctx.restore();
      }

      ctx.restore();
    }

    wrapTextLines(ctx, text, maxWidth, sprite = null) {
      if (!text) return [];
      const fontKey = ctx.font || '';
      if (sprite && sprite._wrapCache && sprite._wrapCache.text === text && sprite._wrapCache.maxWidth === maxWidth && sprite._wrapCache.font === fontKey) {
        return sprite._wrapCache.lines;
      }
      const paragraphs = String(text).split('\n');
      const resultLines = [];
      for (const para of paragraphs) {
        if (para === '') {
          resultLines.push('');
          continue;
        }
        let curLine = '';
        for (let i = 0; i < para.length; i++) {
          const char = para[i];
          const testLine = curLine + char;
          const testW = ctx.measureText(testLine).width;
          if (testW <= maxWidth || curLine === '') {
            curLine = testLine;
          } else {
            resultLines.push(curLine);
            curLine = char;
          }
        }
        if (curLine) resultLines.push(curLine);
      }
      if (sprite) {
        sprite._wrapCache = { text, maxWidth, font: fontKey, lines: resultLines };
      }
      return resultLines;
    }

    drawSpriteLabelText(ctx, sprite, hw, hh, lop, optParams = null) {
      const p = optParams || {};
      const rawText = p.text !== undefined ? p.text : sprite.text;
      if (!rawText) return;

      ctx.save();
      const fontSize = p.fontSize || sprite.fontSize || 14;
      const fontWeight = p.fontWeight || sprite.fontWeight || 'normal';
      const color = p.color || sprite.textColor || (this.isLightColor ? (this.isLightColor(sprite.fill) ? '#09090b' : '#ffffff') : '#ffffff');
      const textAlign = p.textAlign || sprite.textAlign || 'center';
      const valign = p.valign || sprite.valign || 'middle';
      const lhRatio = p.lineHeight || 1.35;
      const lh = fontSize * lhRatio;

      ctx.fillStyle = color;
      ctx.font = `${fontWeight} ${fontSize}px ${PhotoshopCanvas.fontStack(p.fontFamily)}`;
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';

      const padX = 16;
      const padY = 8;
      const maxTextW = Math.max(20, (sprite.width || 40) - padX * 2);
      const lines = this.wrapTextLines(ctx, rawText, maxTextW, sprite);
      const totalTextH = lines.length * lh;

      let startY = 0;
      if (valign === 'top') {
        startY = -hh + padY + lh / 2;
      } else if (valign === 'bottom') {
        startY = hh - padY - totalTextH + lh / 2;
      } else {
        startY = -(lines.length - 1) * lh / 2;
      }

      const textX = textAlign === 'left' ? (-hw + padX) : (textAlign === 'right' ? (hw - padX) : 0);
      for (let i = 0; i < lines.length; i++) {
        ctx.fillText(lines[i], textX, startY + i * lh);
      }
      ctx.restore();
    }


    drawTransformGizmo(ctx, sprite, transformBox) {
      const handles = transformBox.getHandles(sprite);
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1 / this.zoom;
      ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);

      // Bounding box outline
      const hw = (sprite.width * sprite.scaleX) / 2;
      const hh = (sprite.height * sprite.scaleY) / 2;
      ctx.translate(sprite.x, sprite.y);
      ctx.rotate((sprite.rotation * Math.PI) / 180);
      ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);

      // Line to rotation handle
      ctx.beginPath();
      ctx.moveTo(0, -hh);
      ctx.lineTo(0, -hh - 24);
      ctx.stroke();
      ctx.restore();

      // Handles
      const hSize = 7 / this.zoom;
      for (const h of handles) {
        ctx.save();
        if (h.id === 'rot') {
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(h.x, h.y, 4.5 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#0284c7';
          ctx.lineWidth = 1.2 / this.zoom;
          ctx.fillRect(h.x - hSize / 2, h.y - hSize / 2, hSize, hSize);
          ctx.strokeRect(h.x - hSize / 2, h.y - hSize / 2, hSize, hSize);
        }
        ctx.restore();
      }
    }

    drawPenPathOverlay(ctx, points) {
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
      ctx.stroke();

      const sz = 6 / this.zoom;
      for (const p of points) {
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      ctx.restore();
    }

    drawCurveOverlay(ctx, points) {
      if (!points || points.length === 0) return;
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 / this.zoom;

      // Correct cubic bezier path connecting prev.cp2 -> cur.cp1 -> cur.x,y
      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const prev = points[i - 1];
        const cur = points[i];
        const cp1x = prev.cp2x !== undefined ? prev.cp2x : prev.x;
        const cp1y = prev.cp2y !== undefined ? prev.cp2y : prev.y;
        const cp2x = cur.cp1x !== undefined ? cur.cp1x : cur.x;
        const cp2y = cur.cp1y !== undefined ? cur.cp1y : cur.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, cur.x, cur.y);
      }
      ctx.stroke();

      // Tangent handles and interactive anchors
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (p.cp1x !== undefined && p.cp2x !== undefined) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.45)';
          ctx.lineWidth = 1 / this.zoom;
          ctx.beginPath();
          ctx.moveTo(p.cp1x, p.cp1y);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(p.cp2x, p.cp2y);
          ctx.stroke();

          // Control point handles (Circular dots)
          ctx.fillStyle = '#38bdf8';
          ctx.beginPath();
          ctx.arc(p.cp1x, p.cp1y, 4 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(p.cp2x, p.cp2y, 4 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Anchor point (Solid white square)
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.lineWidth = 1.5 / this.zoom;
        const sz = 7 / this.zoom;
        ctx.fillRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
        ctx.strokeRect(p.x - sz / 2, p.y - sz / 2, sz, sz);
      }
      ctx.restore();
    }

    drawRulers(ctx, cw, ch) {
      const rSize = 18;
      ctx.save();
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, cw, rSize);
      ctx.fillRect(0, 0, rSize, ch);
      ctx.strokeStyle = '#3f3f46';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, rSize); ctx.lineTo(cw, rSize);
      ctx.moveTo(rSize, 0); ctx.lineTo(rSize, ch);
      ctx.stroke();

      ctx.fillStyle = '#71717a';
      ctx.font = '9px monospace';
      for (let wx = 0; wx <= this.doc.width; wx += 50) {
        const sx = this.worldToScreen(wx, 0).x;
        if (sx >= rSize && sx <= cw) {
          ctx.beginPath(); ctx.moveTo(sx, rSize - 5); ctx.lineTo(sx, rSize); ctx.stroke();
          ctx.fillText(wx, sx + 2, rSize - 6);
        }
      }
      ctx.restore();
    }
  }

  // ==========================================================================
  // 7. DrawingTools Controller
  // ==========================================================================
  // ==========================================================================
  // 8. DrawingTools (Decoupled Performance: Canvas Repaint vs History Commit)
  // ==========================================================================
  class DrawingTools {
    constructor(canvasRenderer, docModel, onCanvasRender, onCommit) {
      this.renderer = canvasRenderer;
      this.doc = docModel;
      this.onCanvasRender = onCanvasRender;
      this.onCommit = onCommit;
      this.activeTool = 'move';
      this.activeShapeType = 'rect';
      this.shapeBevel = 12;
      this.brushSize = 6;
      this.brushStabilize = true; // Curve stabilizer toggle
      this.activePenPoints = [];
      this.activeCurvePoints = [];
      this.activeGradientDrag = null;
      this.shapeDragStart = null;
      this.shapeDragCurrent = null;
      this.activeBrushStroke = null;
      this.activePathDragPoint = null;
    }

    setTool(t) {
      if (this.activeTool === 'pen' && this.activePenPoints.length > 1 && t !== 'pen') {
        this.commitPenPath();
      }
      if (this.activeTool === 'curve' && this.activeCurvePoints.length > 1 && t !== 'curve') {
        this.commitCurvePath();
      }
      this.activeTool = t;
      this.activePenPoints = [];
      this.activeCurvePoints = [];
      this.activeBrushStroke = null;
      this.shapeDragStart = null;
      this.shapeDragCurrent = null;
      if (this.onCommit) this.onCommit();
    }

    zoomAt(screenX, screenY, factor) {
      const oldZoom = this.renderer.zoom;
      const newZoom = Math.max(0.1, Math.min(10, oldZoom * factor));
      this.renderer.zoom = newZoom;
      this.renderer.panX = screenX - (screenX - this.renderer.panX) * (newZoom / oldZoom);
      this.renderer.panY = screenY - (screenY - this.renderer.panY) * (newZoom / oldZoom);
      if (this.onCanvasRender) this.onCanvasRender();
    }

    handleMouseDown(wx, wy, sx, sy, e) {
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      if (this.activeTool === 'bucket') {
        const sp = this.doc.hitTestSprite(wx, wy) || this.doc.getSelectedSprite();
        if (sp) {
          sp.fill = this.doc.foregroundColor || '#ffffff';
          sp.fillType = 'color';
          this.doc.saveState();
          if (this.onCommit) this.onCommit();
        }
        return;
      }

      if (this.activeTool === 'gradient') {
        this.gradientStart = { x: wx, y: wy };
        return;
      }

      if (this.activeTool === 'brush') {
        // Strokes go into the selected layer (no extra layers are created).
        this.activeBrushStroke = [{ x: wx, y: wy }];
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }

      if (this.activeTool === 'shape') {
        this.shapeDragStart = { x: wx, y: wy };
        this.shapeDragCurrent = { x: wx, y: wy };
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }

      if (this.activeTool === 'pen') {
        this.activePenPoints.push({ x: wx, y: wy });
        if (this.activePenPoints.length > 1) {
          const first = this.activePenPoints[0];
          if (Math.hypot(wx - first.x, wy - first.y) < 14) {
            this.activePenPoints.pop();
            this.commitPenPath(true);
            return;
          }
        }
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }

      if (this.activeTool === 'curve') {
        // Hit test existing anchor points and handles to allow adjusting already placed points
        for (let i = 0; i < this.activeCurvePoints.length; i++) {
          const pt = this.activeCurvePoints[i];
          if (Math.hypot(wx - pt.x, wy - pt.y) < 10) {
            this.activeCurveDragTarget = { index: i, type: 'anchor', origX: pt.x, origY: pt.y };
            return;
          }
          if (pt.cp1x !== undefined && Math.hypot(wx - pt.cp1x, wy - pt.cp1y) < 8) {
            this.activeCurveDragTarget = { index: i, type: 'cp1' };
            return;
          }
          if (pt.cp2x !== undefined && Math.hypot(wx - pt.cp2x, wy - pt.cp2y) < 8) {
            this.activeCurveDragTarget = { index: i, type: 'cp2' };
            return;
          }
        }

        if (this.activeCurvePoints.length > 2) {
          const first = this.activeCurvePoints[0];
          if (Math.hypot(wx - first.x, wy - first.y) < 16) {
            this.commitCurvePath(true);
            return;
          }
        }

        const newPt = { type: 'C', x: wx, y: wy, cp1x: wx, cp1y: wy, cp2x: wx, cp2y: wy };
        this.activeCurvePoints.push(newPt);
        this.activeCurveDragTarget = { index: this.activeCurvePoints.length - 1, type: 'new_cp2' };
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }

      if (this.activeTool === 'zoom') {
        if (e.altKey) {
          this.renderer.zoom = 1;
          this.renderer.centerArtboard();
        } else {
          const factor = e.shiftKey ? 0.8 : 1.25;
          this.zoomAt(sx, sy, factor);
        }
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }

      if (this.activeTool === 'eyedropper') {
        try {
          const pix = this.renderer.ctx.getImageData(sx, sy, 1, 1).data;
          const hex = '#' + ((1 << 24) + (pix[0] << 16) + (pix[1] << 8) + pix[2]).toString(16).slice(1);
          this.doc.foregroundColor = hex;
          const sel = this.doc.getSelectedSprite();
          if (sel) {
            sel.fill = hex;
            this.doc.saveState();
          }
        } catch (err) {}
        if (this.onCommit) this.onCommit();
        return;
      }

      if (this.activeTool === 'text') {
        const text = '텍스트';
        const sp = activeLayer.addSprite({
          name: '텍스트: ' + text,
          type: 'text',
          text: text,
          x: wx, y: wy,
          fontSize: 24,
          fill: '#ffffff'
        });
        this.doc.selectedSpriteId = sp.id;
        this.doc.saveState();
        if (this.onCommit) this.onCommit();
        // Start typing right away (inline editor provided by the app).
        if (typeof this.onTextCreated === 'function') this.onTextCreated(sp, true);
        return;
      }
    }

    handleMouseMove(wx, wy) {
      if (this.activeTool === 'curve' && this.activeCurveDragTarget && this.activeCurvePoints.length > 0) {
        const { index, type } = this.activeCurveDragTarget;
        const pt = this.activeCurvePoints[index];
        if (pt) {
          if (type === 'anchor') {
            const dx = wx - pt.x;
            const dy = wy - pt.y;
            pt.x = wx;
            pt.y = wy;
            if (pt.cp1x !== undefined) { pt.cp1x += dx; pt.cp1y += dy; }
            if (pt.cp2x !== undefined) { pt.cp2x += dx; pt.cp2y += dy; }
          } else if (type === 'cp1') {
            pt.cp1x = wx;
            pt.cp1y = wy;
            pt.cp2x = 2 * pt.x - wx;
            pt.cp2y = 2 * pt.y - wy;
          } else if (type === 'cp2' || type === 'new_cp2') {
            pt.cp2x = wx;
            pt.cp2y = wy;
            pt.cp1x = 2 * pt.x - wx;
            pt.cp1y = 2 * pt.y - wy;
          }
          if (this.onCanvasRender) this.onCanvasRender();
          return;
        }
      }

      if (this.activeTool === 'brush' && this.activeBrushStroke) {
        let ptX = wx, ptY = wy;
        if (this.brushStabilize && this.activeBrushStroke.length > 0) {
          const last = this.activeBrushStroke[this.activeBrushStroke.length - 1];
          ptX = last.x + (wx - last.x) * 0.45;
          ptY = last.y + (wy - last.y) * 0.45;
        }
        this.activeBrushStroke.push({ x: ptX, y: ptY });
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }

      if (this.activeTool === 'shape' && this.shapeDragStart) {
        this.shapeDragCurrent = { x: wx, y: wy };
        if (this.onCanvasRender) this.onCanvasRender();
        return;
      }
    }

    handleMouseUp(wx, wy) {
      if (this.activeTool === 'curve') {
        this.activeCurveDragTarget = null;
        return;
      }

      if (this.activeTool === 'gradient' && this.gradientStart) {
        const sp = this.doc.hitTestSprite(wx, wy) || this.doc.getSelectedSprite();
        if (sp) {
          const gdx = wx - this.gradientStart.x;
          const gdy = wy - this.gradientStart.y;
          const angleDeg = Math.round((Math.atan2(gdy, gdx) * 180) / Math.PI);
          sp.fillType = 'linear-gradient';
          sp.gradientAngle = angleDeg;
          sp.gradient = {
            type: 'linear',
            angle: angleDeg,
            stops: [
              { offset: 0, color: this.doc.foregroundColor || '#ffffff' },
              { offset: 1, color: this.doc.backgroundColor || '#27272a' }
            ]
          };
          this.doc.saveState();
          if (this.onCommit) this.onCommit();
          if (typeof StudioToast !== 'undefined') {
            StudioToast.show(`그라데이션 방향이 적용되었습니다 (${angleDeg}°).`);
          }
        }
        this.gradientStart = null;
        return;
      }

      if (this.activeTool === 'brush' && this.activeBrushStroke) {
        this.commitBrushStroke();
        if (this.onCommit) this.onCommit();
        return;
      }

      if (this.activeTool === 'shape' && this.shapeDragStart) {
        this.commitShape(this.shapeDragStart, { x: wx, y: wy });
        this.shapeDragStart = null;
        this.shapeDragCurrent = null;
        if (this.onCommit) this.onCommit();
        return;
      }
    }

    commitBrushStroke() {
      if (!this.activeBrushStroke || this.activeBrushStroke.length === 0) {
        this.activeBrushStroke = null;
        return;
      }
      let activeLayer = this.doc.getSelectedLayer() || this.doc.layers[this.doc.layers.length - 1];
      if (!activeLayer) {
        activeLayer = this.doc.addLayer({ name: '레이어 1' });
      }
      this.doc.selectedLayerId = activeLayer.id;

      const pts = this.activeBrushStroke;
      if (pts.length === 1) {
        pts.push({ x: pts[0].x + 0.1, y: pts[0].y + 0.1 });
      }

      // Keep painting into the selected brush canvas, else the layer's one.
      const sel = this.doc.getSelectedSprite();
      let brushSprite = (sel && sel.type === 'brush' && sel.isBrushCanvas && activeLayer.sprites.includes(sel)) ? sel
        : activeLayer.sprites.find(s => s.type === 'brush' && s.isBrushCanvas);
      if (!brushSprite) {
        brushSprite = activeLayer.addSprite({
          name: '브러시 아트워크',
          type: 'brush',
          isBrushCanvas: true,
          x: this.doc.width / 2,
          y: this.doc.height / 2,
          width: this.doc.width,
          height: this.doc.height,
          fill: 'transparent',
          strokeWidth: 0,
          strokes: []
        });
      }

      if (!brushSprite.strokes) brushSprite.strokes = [];

      const relPts = pts.map(p => ({
        x: Math.round(p.x - brushSprite.x),
        y: Math.round(p.y - brushSprite.y)
      }));

      brushSprite.strokes.push({
        points: relPts,
        size: this.brushSize || 6,
        color: this.doc.foregroundColor || '#ffffff'
      });

      this.activeBrushStroke = null;
      this.doc.selectedSpriteId = brushSprite.id;
      this.doc.saveState();
      if (this.onCommit) this.onCommit();
    }

    commitShape(start, end) {
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      const x = (start.x + end.x) / 2;
      const y = (start.y + end.y) / 2;
      let w = Math.abs(end.x - start.x);
      let h = Math.abs(end.y - start.y);

      if (w < 5 && h < 5) return;

      if (this.activeShapeType === 'circle' || this.activeShapeType === 'star') {
        const side = Math.max(w, h);
        w = side;
        h = side;
      }

      const sp = activeLayer.addSprite({
        name: `${this.activeShapeType === 'rect' ? '사각형' : (this.activeShapeType === 'star' ? '별' : '원형')} 스프라이트`,
        type: this.activeShapeType,
        x: x, y: y,
        width: w, height: h,
        fill: this.doc.foregroundColor,
        stroke: '#ffffff',
        strokeWidth: 2,
        starPoints: 5,
        starInnerRatio: 0.45,
        cornerRadius: this.shapeBevel,
        bevelChamfer: this.shapeBevel
      });

      this.doc.selectedSpriteId = sp.id;
      this.doc.saveState();
    }

    commitPenPath(closed = false) {
      if (this.activePenPoints.length < 2) {
        this.activePenPoints = [];
        return;
      }
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      const pts = this.activePenPoints;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(p => {
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const relPts = pts.map(p => ({ x: Math.round(p.x - cx), y: Math.round(p.y - cy) }));

      const sp = activeLayer.addSprite({
        name: `펜 패스 ${activeLayer.sprites.length + 1}`,
        type: 'path',
        x: cx, y: cy,
        width: Math.max(20, maxX - minX),
        height: Math.max(20, maxY - minY),
        pathPoints: relPts,
        pathClosed: closed,
        fill: 'transparent', fillType: 'none',
        stroke: this.doc.foregroundColor,
        strokeWidth: 2
      });

      this.activePenPoints = [];
      this.doc.selectedSpriteId = sp.id;
      this.doc.saveState();
      if (this.onCommit) this.onCommit();
    }

    commitCurvePath(closed = false) {
      if (this.activeCurvePoints.length < 2) {
        this.activeCurvePoints = [];
        return;
      }
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      const pts = this.activeCurvePoints;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      pts.forEach(p => {
        minX = Math.min(minX, p.x, p.cp1x ?? p.x, p.cp2x ?? p.x);
        minY = Math.min(minY, p.y, p.cp1y ?? p.y, p.cp2y ?? p.y);
        maxX = Math.max(maxX, p.x, p.cp1x ?? p.x, p.cp2x ?? p.x);
        maxY = Math.max(maxY, p.y, p.cp1y ?? p.y, p.cp2y ?? p.y);
      });

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const relPts = pts.map(p => ({
        type: 'C',
        x: Math.round(p.x - cx), y: Math.round(p.y - cy),
        cp1x: Math.round((p.cp1x !== undefined ? p.cp1x : p.x) - cx),
        cp1y: Math.round((p.cp1y !== undefined ? p.cp1y : p.y) - cy),
        cp2x: Math.round((p.cp2x !== undefined ? p.cp2x : p.x) - cx),
        cp2y: Math.round((p.cp2y !== undefined ? p.cp2y : p.y) - cy)
      }));

      const sp = activeLayer.addSprite({
        name: `베지에 곡선 ${activeLayer.sprites.length + 1}`,
        type: 'path',
        x: cx, y: cy,
        width: Math.max(20, maxX - minX),
        height: Math.max(20, maxY - minY),
        pathPoints: relPts,
        pathClosed: closed,
        isClosedPath: closed,
        fill: closed ? this.doc.foregroundColor : 'transparent',
        stroke: this.doc.foregroundColor,
        strokeWidth: 2
      });

      this.activeCurvePoints = [];
      this.doc.selectedSpriteId = sp.id;
      this.doc.saveState();
      if (this.onCommit) this.onCommit();
    }
  }

  // ==========================================================================
  // Form fields at runtime: real DOM inputs for `form_field` sprites.
  // - canvas hosts (studio preview, exported JS) get overlay inputs placed
  //   over the canvas each frame;
  // - the website export already contains the inputs (bound by data-sid).
  // Values are mirrored into the engine variables as "form.<name>".
  // ==========================================================================
  class FormRuntime {
    // host: { container, place(sprite) -> {x, y, w, h, scale} | null, existing(sprite) -> Element | null }
    constructor(engine, host) {
      this.engine = engine;
      this.host = host;
      this.fields = new Map(); // sprite id -> { el, input, sprite, owned }
    }

    static fieldSpec(sp) {
      const f = sp.form || {};
      const kind = ['text', 'email', 'tel', 'number', 'textarea', 'checkbox', 'select'].includes(f.kind) ? f.kind : 'text';
      const name = String(f.name || sp.name || 'field').replace(/[^\w\-가-힣]/g, '_').slice(0, 40) || 'field';
      return { kind, name, label: String(f.label || ''), placeholder: String(f.placeholder || ''), required: !!f.required,
        options: String(f.options || '').split(',').map(o => o.trim()).filter(Boolean), value: f.value !== undefined ? String(f.value) : '' };
    }

    static formSprites(doc) {
      const out = [];
      for (const l of doc.layers) {
        if (!l.visible) continue;
        for (const sp of l.sprites) if (sp.type === 'form_field' && sp.visible !== false) out.push({ sp, layer: l });
      }
      return out;
    }

    // Build the input element for a field (used for overlays and for the
    // website export markup via outerHTML).
    static createInput(sp, doc) {
      const spec = FormRuntime.fieldSpec(sp);
      let input;
      if (spec.kind === 'textarea') input = doc.createElement('textarea');
      else if (spec.kind === 'select') {
        input = doc.createElement('select');
        const ph = doc.createElement('option'); ph.value = ''; ph.textContent = spec.placeholder || '선택하세요'; input.appendChild(ph);
        for (const o of spec.options) { const op = doc.createElement('option'); op.value = o; op.textContent = o; input.appendChild(op); }
      } else {
        input = doc.createElement('input');
        input.type = spec.kind;
      }
      input.name = spec.name;
      input.className = 'jspen-form-input';
      if (spec.required) input.required = true;
      if (spec.placeholder && spec.kind !== 'select' && spec.kind !== 'checkbox') input.placeholder = spec.placeholder;
      if (spec.kind === 'checkbox') input.checked = spec.value === 'true' || spec.value === '1';
      else if (spec.value) input.value = spec.value;
      input.setAttribute('aria-label', spec.label || spec.placeholder || spec.name);
      return input;
    }

    static inputStyle(sp, scale = 1) {
      const fs = Math.max(8, (sp.fontSize || 16) * scale);
      return 'box-sizing:border-box;width:100%;height:100%;margin:0;padding:' + Math.round(6 * scale) + 'px ' + Math.round(10 * scale) + 'px;' +
        'font:' + fs + 'px ' + PhotoshopCanvas.fontStack(sp.fontFamily && sp.fontFamily !== 'Pretendard, sans-serif' ? sp.fontFamily : '') + ';' +
        'color:' + (sp.textColor || '#18181b') + ';background:' + (sp.fill && sp.fill !== 'transparent' ? sp.fill : '#ffffff') + ';' +
        'border:' + Math.max(1, sp.strokeWidth || 1) * scale + 'px solid ' + (sp.stroke || '#a1a1aa') + ';border-radius:' + (sp.cornerRadius || 6) * scale + 'px;' +
        'outline:none;resize:none;';
    }

    ensure(sp) {
      let f = this.fields.get(sp.id);
      if (f) return f;
      const existing = this.host.existing ? this.host.existing(sp) : null;
      if (existing) {
        const input = existing.matches('input,textarea,select') ? existing : existing.querySelector('input,textarea,select');
        f = { el: existing, input, sprite: sp, owned: false };
      } else {
        const spec = FormRuntime.fieldSpec(sp);
        const wrap = document.createElement(spec.kind === 'checkbox' ? 'label' : 'div');
        wrap.className = 'jspen-form-overlay';
        wrap.style.cssText = 'position:absolute;z-index:40;' + (spec.kind === 'checkbox' ? 'display:flex;align-items:center;gap:8px;cursor:pointer;' : '');
        const input = FormRuntime.createInput(sp, document);
        if (spec.kind === 'checkbox') {
          wrap.appendChild(input);
          const t = document.createElement('span'); t.textContent = spec.label || spec.placeholder || spec.name; wrap.appendChild(t);
        } else {
          wrap.appendChild(input);
        }
        // Keys typed into a field must not reach studio shortcuts / modules.
        wrap.addEventListener('keydown', e => e.stopPropagation());
        wrap.addEventListener('pointerdown', e => e.stopPropagation());
        wrap.addEventListener('mousedown', e => e.stopPropagation());
        this.host.container.appendChild(wrap);
        f = { el: wrap, input, sprite: sp, owned: true };
      }
      if (f.input) {
        const sync = () => this.publish(f);
        f.input.addEventListener('input', sync);
        f.input.addEventListener('change', sync);
      }
      this.fields.set(sp.id, f);
      this.publish(f);
      return f;
    }

    value(f) {
      if (!f.input) return '';
      return f.input.type === 'checkbox' ? (f.input.checked ? 1 : 0) : f.input.value;
    }

    publish(f) {
      const spec = FormRuntime.fieldSpec(f.sprite);
      this.engine.bus.vars.set('form.' + spec.name, this.value(f));
    }

    // Called every frame: create/position overlays, hide removed fields.
    sync(doc) {
      const seen = new Set();
      for (const { sp } of FormRuntime.formSprites(doc)) {
        seen.add(sp.id);
        const f = this.ensure(sp);
        if (!f.owned) continue;
        const r = this.host.place(sp);
        if (!r) { f.el.style.display = 'none'; continue; }
        const spec = FormRuntime.fieldSpec(sp);
        f.el.style.display = '';
        f.el.style.left = r.x + 'px'; f.el.style.top = r.y + 'px';
        f.el.style.width = r.w + 'px'; f.el.style.height = r.h + 'px';
        if (f.scale !== r.scale) {
          f.scale = r.scale;
          if (spec.kind === 'checkbox') {
            f.el.style.font = Math.max(8, (sp.fontSize || 16) * r.scale) + 'px ' + PhotoshopCanvas.fontStack('');
            f.el.style.color = sp.textColor || '#e4e4e7';
          } else {
            f.input.style.cssText = FormRuntime.inputStyle(sp, r.scale);
          }
        }
      }
      for (const [id, f] of this.fields) {
        if (!seen.has(id) && f.owned) { f.el.remove(); this.fields.delete(id); }
      }
    }

    fieldsIn(layer) {
      return [...this.fields.values()].filter(f => !layer || layer.sprites.includes(f.sprite));
    }

    // Validate; focuses and reports the first invalid field.
    validate(fields) {
      for (const f of fields) {
        if (f.input && typeof f.input.checkValidity === 'function' && !f.input.checkValidity()) {
          if (typeof f.input.reportValidity === 'function') f.input.reportValidity();
          return false;
        }
      }
      return true;
    }

    values(fields) {
      const out = {};
      for (const f of fields) out[FormRuntime.fieldSpec(f.sprite).name] = this.value(f);
      return out;
    }

    reset(fields) {
      for (const f of fields) {
        if (!f.input) continue;
        if (f.input.type === 'checkbox') f.input.checked = false; else f.input.value = '';
        this.publish(f);
      }
    }

    destroy() {
      for (const f of this.fields.values()) if (f.owned) f.el.remove();
      this.fields.clear();
    }
  }

  class ModuleEngine {
    constructor(docModel) {
      this.doc = docModel;
      this.bus = {
        mouse: { x: 0, y: 0, rawX: 0, rawY: 0, vx: 0, vy: 0, isDown: false, clicked: false },
        scroll: { deltaY: 0, progress: 0, scrollY: 0 },
        time: 0,
        particles: [],
        keyState: {},
        signals: new Map(),
        activeTriggers: new Set(),
        activeTriggerTargets: new Set(),
        vars: new Map(),      // global_variable store shared by the document
        fade: null,           // scene_transition fade overlay { start, duration }
        hideCursor: false     // cursor_fx custom cursor active this frame
      };
      this._pendingNavs = [];
      this.bus.emitSignal = (signalName, sourceId = '', payload = null) => {
        if (!signalName) return;
        this.bus.signals.set(signalName, { time: this.bus.time, sourceId, payload });
      };
      this.bus.hasSignal = (signalName, maxAgeSec = 0.35) => this.bus.signalTime(signalName, maxAgeSec) !== null;
      // Time of the latest matching signal still fresh ('*' = any signal), or null.
      this.bus.signalTime = (signalName, maxAgeSec = 0.35) => {
        let best = null;
        const consider = s => { if (s && (this.bus.time - s.time) <= maxAgeSec && (best === null || s.time > best)) best = s.time; };
        if (!signalName || signalName === '*') for (const s of this.bus.signals.values()) consider(s);
        else consider(this.bus.signals.get(signalName));
        return best;
      };
      this.active = false;
      this.draggedSprite = null;
      this.dragOffset = { x: 0, y: 0 };
      // Module ids disconnected from the Node Graph OUTPUT; these do not run.
      this.disabledModuleIds = null;
      // Anchor (#id) navigation is host specific (studio pans, exported page scrolls).
      this.onNavigateAnchor = null;
      this.scriptGate = null;     // (code) => bool; null = run all scripts
      this.onScriptError = null;  // (sprite, module, error)
    }

    // Finish a drag at the exact release position (called from the pointer-up
    // handler, so a pointer move right after release cannot shift the drop).
    endDrag(wx, wy) {
      if (!this.draggedSprite) return;
      this.applyDragPosition(wx, wy);
      this.bus.emitSignal('drag_end', this.draggedSprite.id);
      this.draggedSprite = null;
    }

    applyDragPosition(wx, wy) {
      const dp = this.dragParams || {};
      let nx = wx - this.dragOffset.x;
      let ny = wy - this.dragOffset.y;
      if (dp.snapToGrid) {
        const g = Math.max(1, parseFloat(dp.gridSize) || 20);
        nx = Math.round(nx / g) * g;
        ny = Math.round(ny / g) * g;
      }
      if (dp.constrainAxis !== 'y') this.draggedSprite.runtime.x = nx;
      if (dp.constrainAxis !== 'x') this.draggedSprite.runtime.y = ny;
    }

    // ---------------- User scripts (custom_script) ----------------
    // Scripts run only when allowed (the studio asks before running scripts
    // from an opened file). Compiled functions are cached per source text.
    compileScript(code) {
      this._scriptCache = this._scriptCache || new Map();
      if (!this._scriptCache.has(code)) {
        let entry;
        try { entry = { fn: new Function('api', '"use strict";\n' + code) }; }
        catch (e) { entry = { error: e }; }
        this._scriptCache.set(code, entry);
      }
      return this._scriptCache.get(code);
    }

    // Live view of a sprite for scripts: reading/writing runtime values.
    scriptSprite(sp) {
      if (!sp) return null;
      const rt = sp.runtime;
      const eng = this;
      return {
        get id() { return sp.id; }, get name() { return sp.name; }, get type() { return sp.type; },
        get width() { return sp.width; }, get height() { return sp.height; },
        get x() { return rt.x; }, set x(v) { if (isFinite(v)) rt.x = +v; },
        get y() { return rt.y; }, set y(v) { if (isFinite(v)) rt.y = +v; },
        get rotation() { return rt.rotation; }, set rotation(v) { if (isFinite(v)) rt.rotation = +v; },
        get scale() { return rt.scaleX; }, set scale(v) { if (isFinite(v)) { rt.scaleX = +v; rt.scaleY = +v; } },
        get scaleX() { return rt.scaleX; }, set scaleX(v) { if (isFinite(v)) rt.scaleX = +v; },
        get scaleY() { return rt.scaleY; }, set scaleY(v) { if (isFinite(v)) rt.scaleY = +v; },
        get opacity() { return rt.opacity; }, set opacity(v) { if (isFinite(v)) rt.opacity = Math.max(0, Math.min(1, +v)); },
        get visible() { return rt.visible !== false; }, set visible(v) { rt.visible = !!v; },
        get fill() { return sp.fill; }, set fill(v) { sp.fill = String(v); },
        get text() { return ModuleEngine.getText(sp); }, set text(v) { ModuleEngine.setText(sp, v); },
        get hovered() { return !!rt.isHovered; },
        get restX() { return sp.x; }, get restY() { return sp.y; },
        contains(x, y) { return eng.isPointInside(x, y, sp); }
      };
    }

    runScript(sprite, mod, p, ctx, clock, dt) {
      // The studio sets scriptGate to allow only scripts the user wrote or
      // approved; exported pages run their author's scripts.
      if (typeof this.scriptGate === 'function' && !this.scriptGate(String(p.code || ''))) { this.bus.scriptsBlocked = true; return; }
      const rt = sprite.runtime;
      rt._scriptDead = rt._scriptDead || {};
      if (rt._scriptDead[mod.id]) return;
      if (p.runOn === 'start') {
        rt._scriptRan = rt._scriptRan || {};
        if (rt._scriptRan[mod.id]) return;
        rt._scriptRan[mod.id] = true;
      }
      const compiled = this.compileScript(String(p.code || ''));
      const fail = (err) => {
        rt._scriptDead[mod.id] = true; // stop this module for this run
        if (typeof this.onScriptError === 'function') this.onScriptError(sprite, mod, err);
        else if (typeof console !== 'undefined') console.error('[JSPen script]', sprite.name, err);
      };
      if (compiled.error) { fail(compiled.error); return; }
      rt._scriptState = rt._scriptState || {};
      const state = rt._scriptState[mod.id] || (rt._scriptState[mod.id] = {});
      const bus = this.bus, eng = this;
      const api = {
        self: this.scriptSprite(sprite),
        find: (nameOrId) => {
          for (const l of eng.doc.layers) for (const s of l.sprites) if (s.id === nameOrId || s.name === nameOrId) return eng.scriptSprite(s);
          return null;
        },
        all: () => eng.doc.layers.flatMap(l => l.sprites).map(s => eng.scriptSprite(s)),
        time: bus.time, dt, local: clock,
        mouse: { x: bus.mouse.x, y: bus.mouse.y, vx: bus.mouse.vx, vy: bus.mouse.vy, down: !!bus.mouse.isDown, clicked: !!bus.mouse.clicked },
        key: (k) => !!bus.keyState[k],
        scroll: { y: bus.scroll?.scrollY || 0, progress: eng.scrollProgress() },
        vars: {
          get: (n) => bus.vars.get(String(n)),
          set: (n, v) => { bus.vars.set(String(n), v); },
          add: (n, d = 1) => { const v = (Number(bus.vars.get(String(n))) || 0) + Number(d); bus.vars.set(String(n), v); return v; }
        },
        emit: (name, payload) => bus.emitSignal(String(name), sprite.id, payload),
        hasSignal: (name) => bus.hasSignal(String(name)),
        value: ctx.value,
        setValue: (v) => { ctx.value = Number(v) || 0; },
        state,
        open: (url, target = '_blank') => eng.navigateHyperlink(String(url || ''), target),
        random: (a = 0, b = 1) => a + Math.random() * (b - a),
        lerp: (a, b, t) => a + (b - a) * t,
        clamp: (v, a, b) => Math.max(a, Math.min(b, v)),
        log: (...args) => { if (typeof console !== 'undefined') console.log('[JSPen script]', ...args); }
      };
      try { compiled.fn(api); } catch (e) { fail(e); }
    }

    // ---------------- Action blocks (action_rules) ----------------
    // "언제 → 무엇을": when the module's trigger condition fires, its steps run
    // from the top. A step with a duration animates over that time and the next
    // one starts after it; instant steps run in the same frame. Steps are plain
    // data, so a file can never run code through them.
    static actionTakesTime(step) {
      if (!step) return false;
      if (step.type === 'wait') return (Number(step.seconds) || 0) > 0;
      return ['move_by', 'move_to', 'rotate_by', 'scale_to', 'fade_to', 'color_to', 'reset'].includes(step.type) && (Number(step.duration) || 0) > 0;
    }

    // Did the module's condition fire on this frame? "Always" fires once at the start.
    actionFired(mod, sprite) {
      const cond = (mod.params && mod.params.condition) || 'always';
      const rt = sprite.runtime;
      if (cond === 'always') {
        rt._actStarted = rt._actStarted || {};
        if (rt._actStarted[mod.id]) return false;
        rt._actStarted[mod.id] = true;
        return true;
      }
      this.evaluateCondition(mod, sprite, this.bus);
      const st = rt._cond && rt._cond[mod.id];
      return !!(st && st.lastFired === this.bus.time);
    }

    runActions(sprite, mod, p, fired, dt) {
      const rt = sprite.runtime;
      rt._acts = rt._acts || {};
      let st = rt._acts[mod.id];
      const steps = Array.isArray(p.steps) ? p.steps : [];
      if (fired && steps.length && !(st && st.running && p.retrigger === 'ignore')) {
        st = rt._acts[mod.id] = { running: true, i: 0, t: 0, from: null, holds: st ? st.holds : {} };
      }
      if (!st) return;
      if (st.running) {
        let left = dt;
        for (let guard = 0; st.running && guard <= steps.length + 1; guard++) {
          if (st.i >= steps.length) {
            if (p.repeat === 'loop' && steps.some(s => ModuleEngine.actionTakesTime(s))) { st.i = 0; st.t = 0; st.from = null; continue; }
            st.running = false;
            break;
          }
          const done = this.runActionStep(sprite, steps[st.i] || {}, st, left);
          if (!done) break;
          if (ModuleEngine.actionTakesTime(steps[st.i])) left = 0; // the next timed step starts on the next frame
          st.i++; st.t = 0; st.from = null;
        }
      }
      this.applyActionHolds(st);
    }

    // Scale and "show a variable" have to be applied every frame (scale is reset
    // each frame, a variable can change at any time).
    applyActionHolds(st) {
      for (const [id, h] of Object.entries(st.holds || {})) {
        const sp = this.doc.findSpriteById(id);
        if (!sp) continue;
        if (h.scale !== undefined) { sp.runtime.scaleX *= h.scale; sp.runtime.scaleY *= h.scale; }
        if (h.showVar) {
          const v = Number(this.bus.vars.get(h.showVar.name)) || 0;
          ModuleEngine.setText(sp, (h.showVar.prefix || '') + (Number.isInteger(v) ? String(v) : v.toFixed(2)) + (h.showVar.suffix || ''));
        }
      }
    }

    // Runs one step for this frame; true when it has finished.
    runActionStep(sprite, step, st, dt) {
      const tgt = step.spriteId ? this.doc.findSpriteById(step.spriteId) : sprite;
      if (!tgt) return true;
      const rt = tgt.runtime, num = (v, d = 0) => { const n = Number(v); return isFinite(n) ? n : d; };
      const hold = () => (st.holds[tgt.id] = st.holds[tgt.id] || {});
      // Timed steps: progress 0..1 with easing; the start values are read once.
      const timed = (capture, apply) => {
        if (st.from === null) st.from = capture();
        const d = Math.max(0, num(step.duration));
        st.t += dt;
        const k = d > 0 ? Math.min(1, st.t / d) : 1;
        apply(st.from, ModuleEngine.ease(step.ease || 'easeOutCubic', k));
        return k >= 1;
      };
      switch (step.type) {
        case 'move_by':
          return timed(() => ({ x: rt.x, y: rt.y }), (f, e) => { rt.x = f.x + num(step.dx) * e; rt.y = f.y + num(step.dy) * e; });
        case 'move_to':
          return timed(() => ({ x: rt.x, y: rt.y }), (f, e) => { rt.x = f.x + (num(step.x, tgt.x) - f.x) * e; rt.y = f.y + (num(step.y, tgt.y) - f.y) * e; });
        case 'rotate_by':
          return timed(() => ({ r: rt.rotation || 0 }), (f, e) => { rt.rotation = f.r + num(step.deg) * e; });
        case 'scale_to':
          return timed(() => ({ s: hold().scale !== undefined ? hold().scale : 1 }), (f, e) => { hold().scale = f.s + (num(step.scale, 1) - f.s) * e; });
        case 'fade_to':
          return timed(() => ({ o: rt.opacity }), (f, e) => { rt.opacity = Math.max(0, Math.min(1, f.o + (num(step.opacity, 1) - f.o) * e)); });
        case 'color_to':
          return timed(() => {
            if (rt._origFill === undefined) rt._origFill = tgt.fill;
            return { c: tgt.fill };
          }, (f, e) => { tgt.fill = e >= 1 ? String(step.color || f.c) : ModuleEngine.mixColor(f.c, String(step.color || f.c), e); });
        case 'reset':
          return timed(() => ({ x: rt.x, y: rt.y, r: rt.rotation || 0, o: rt.opacity, s: hold().scale !== undefined ? hold().scale : 1, c: tgt.fill }), (f, e) => {
            rt.x = f.x + (tgt.x - f.x) * e; rt.y = f.y + (tgt.y - f.y) * e;
            rt.rotation = f.r + ((tgt.rotation || 0) - f.r) * e;
            rt.opacity = f.o + ((tgt.opacity ?? 1) - f.o) * e;
            hold().scale = f.s + (1 - f.s) * e;
            if (rt._origFill !== undefined) tgt.fill = e >= 1 ? rt._origFill : ModuleEngine.mixColor(f.c, rt._origFill, e);
          });
        case 'show': tgt.visible = true; rt.visible = true; return true;
        case 'hide': rt.visible = false; return true;
        case 'toggle_visible': {
          const shown = tgt.visible !== false && rt.visible !== false;
          if (shown) rt.visible = false; else { tgt.visible = true; rt.visible = true; }
          return true;
        }
        case 'set_text': ModuleEngine.setText(tgt, String(step.text ?? '')); return true;
        case 'show_var':
          if (step.varName) hold().showVar = { name: String(step.varName), prefix: step.prefix, suffix: step.suffix };
          return true;
        case 'emit': if (step.signal) this.bus.emitSignal(String(step.signal), sprite.id); return true;
        case 'set_var':
        case 'add_var': {
          if (!step.varName) return true;
          const name = String(step.varName), vars = this.bus.vars;
          vars.set(name, step.type === 'set_var' ? num(step.value) : (Number(vars.get(name)) || 0) + num(step.value, 1));
          this.bus.emitSignal('var_' + name, sprite.id, vars.get(name));
          return true;
        }
        case 'if_var': {
          const v = Number(this.bus.vars.get(String(step.varName || ''))) || 0, k = num(step.value);
          const ok = { '>': v > k, '>=': v >= k, '<': v < k, '<=': v <= k, '==': v === k, '!=': v !== k }[step.compare || '>='];
          if (!ok) st.running = false; // the steps below do not run
          return true;
        }
        case 'wait':
          st.t += dt;
          return st.t >= Math.max(0, num(step.seconds));
        case 'sound': ModuleEngine.playSynth(step.sound || 'pop', Math.max(0, Math.min(1, num(step.volume, 0.6)))); return true;
        case 'open_link': if (step.url) this.navigateHyperlink(String(step.url), step.newTab === false ? '_self' : '_blank'); return true;
        case 'go_to':
          if (step.spriteId && typeof this.onNavigateAnchor === 'function') this.onNavigateAnchor(tgt, { smooth: true, duration: 0.6 });
          return true;
        default: return true;
      }
    }

    // Host -> engine wheel input (consumed on the next update).
    addWheel(deltaY) {
      this._pendingWheel = (this._pendingWheel || 0) + deltaY;
    }

    // True when a sprite under the pointer listens to the wheel.
    wantsWheel(wx, wy) {
      const sp = this.pickSprite(wx, wy);
      return !!(sp && (sp.modules || []).some(m => m.enabled !== false && m.type === 'scroll_wheel'));
    }

    // ---------------- Forms ----------------
    // Validate and send the form fields (needs this.forms: a FormRuntime).
    submitForm(sprite, layer, p) {
      const forms = this.forms;
      const fields = forms ? forms.fieldsIn(p.scope === 'document' ? null : layer) : [];
      if (forms && !forms.validate(fields)) return;
      const data = forms ? forms.values(fields) : {};
      const msgSp = p.messageSpriteId ? this.doc.findSpriteById(p.messageSpriteId) : null;
      const done = (ok) => {
        if (msgSp) ModuleEngine.setText(msgSp, ok ? (p.successMessage || '') : (p.errorMessage || ''));
        this.bus.emitSignal(ok ? (p.successSignal || 'form_success') : (p.errorSignal || 'form_error'), sprite.id, data);
        if (ok && p.resetOnSuccess !== false && forms) forms.reset(fields);
      };
      const action = p.action || 'mailto';
      if (action === 'signal') { done(true); return; }
      if (action === 'mailto') {
        const to = String(p.url || '').replace(/^mailto:/i, '').trim();
        if (!/^[^@\s]+@[^@\s]+$/.test(to)) { done(false); return; }
        const body = Object.entries(data).map(([k, v]) => k + ': ' + v).join('\n');
        this.navigateHyperlink('mailto:' + to + '?subject=' + encodeURIComponent(p.subject || '') + '&body=' + encodeURIComponent(body), '_self');
        done(true);
        return;
      }
      // POST to an http(s) endpoint
      const url = safeUrl(String(p.url || ''));
      if (!/^https?:/i.test(url) || typeof fetch === 'undefined') { done(false); return; }
      const json = p.encoding !== 'form';
      const body = json ? JSON.stringify(data) : new URLSearchParams(Object.entries(data).map(([k, v]) => [k, String(v)])).toString();
      fetch(url, { method: 'POST', headers: { 'Content-Type': json ? 'application/json' : 'application/x-www-form-urlencoded' }, body })
        .then(r => done(r.ok)).catch(() => done(false));
    }

    // Topmost visible sprite under (wx, wy) using runtime (animated) transforms.
    pickSprite(wx, wy) {
      for (let li = this.doc.layers.length - 1; li >= 0; li--) {
        const layer = this.doc.layers[li];
        if (!layer.visible) continue;
        for (let si = layer.sprites.length - 1; si >= 0; si--) {
          const sp = layer.sprites[si];
          if (!sp.visible || sp.type === 'screen_trigger') continue;
          if (sp.runtime && (sp.runtime.visible === false || sp.runtime._isCursor)) continue;
          if (this.isPointInside(wx, wy, sp)) return sp;
        }
      }
      return null;
    }

    // Link of a sprite for click navigation (hyperlink module first, then sprite.linkUrl).
    getClickLink(sprite) {
      if (!sprite) return null;
      const linkMod = (sprite.modules || []).find(m => m.enabled !== false && m.type === 'hyperlink' &&
        !(this.disabledModuleIds && this.disabledModuleIds.has(m.id)));
      const href = String((linkMod ? (linkMod.params?.url || sprite.linkUrl) : sprite.linkUrl) || '').trim();
      if (!href) return null;
      const trigger = linkMod ? (linkMod.params?.trigger || 'click') : 'click';
      if (trigger !== 'click') return null;
      return { href, target: (linkMod ? linkMod.params?.target : sprite.linkTarget) || '_blank' };
    }

    start() {
      this.active = true;
      this.bus.particles = [];
      this.bus.time = 0;
      this.bus.signals.clear();
      this.bus.scroll.deltaY = 0;
      this.bus.vars = new Map();
      this.bus.fade = null;
      this.bus.hideCursor = false;
      this._pendingNavs = [];
      this._frame = 0;
      for (const l of this.doc.layers) {
        l.resetRuntime();
        for (const sp of l.sprites) {
          const rt = sp.runtime;
          for (const k of Object.keys(rt)) {
            if (k.startsWith('_') || ['toggleState', 'counterValue', 'isTriggered', 'wasTriggered', 'visible', 'activeLink', 'step'].includes(k)) delete rt[k];
          }
        }
      }
    }

    // Seconds since `mod` became active on `sprite` (it restarts when the module
    // was not executed on the previous frame, e.g. its condition was false or a
    // timing gate above it was closed).
    moduleClock(sprite, mod) {
      const rt = sprite.runtime;
      rt._clocks = rt._clocks || {};
      const c = rt._clocks[mod.id];
      if (!c || c.frame < this._frame - 1) {
        rt._clocks[mod.id] = { start: this.bus.time, frame: this._frame };
        return 0;
      }
      c.frame = this._frame;
      return this.bus.time - c.start;
    }

    // Normalised progress (0..1) of a clock for a given loop mode.
    static loopProgress(t, duration, loopMode) {
      if (!(duration > 0)) return 1;
      const r = t / duration;
      if (loopMode === 'infinite') return r % 1;
      if (loopMode === 'pingpong') { const f = r % 2; return f > 1 ? 2 - f : f; }
      return Math.min(1, r);
    }

    static ease(name, t) {
      t = Math.max(0, Math.min(1, t));
      switch (name) {
        case 'linear': return t;
        case 'easeInQuad': return t * t;
        case 'easeOutQuad': return t * (2 - t);
        case 'easeInOutQuad': return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        case 'easeInOutCubic': return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
        case 'easeOutBack': { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); }
        case 'elasticOut': return t === 0 || t === 1 ? t : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1;
        case 'bounceOut': {
          const n1 = 7.5625, d1 = 2.75;
          if (t < 1 / d1) return n1 * t * t;
          if (t < 2 / d1) { t -= 1.5 / d1; return n1 * t * t + 0.75; }
          if (t < 2.5 / d1) { t -= 2.25 / d1; return n1 * t * t + 0.9375; }
          t -= 2.625 / d1; return n1 * t * t + 0.984375;
        }
        case 'expoOut': return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
        case 'easeOutCubic':
        default: return 1 - Math.pow(1 - t, 3);
      }
    }

    // Read / write a transform property in runtime space ('scale' = both axes).
    static getProp(sprite, prop, fromRest = false) {
      const src = fromRest ? sprite : sprite.runtime;
      if (prop === 'scale') return src.scaleX;
      return src[prop];
    }

    static setProp(sprite, prop, value) {
      if (!isFinite(value)) return;
      const rt = sprite.runtime;
      if (prop === 'scale') { rt.scaleX = value; rt.scaleY = value; }
      else if (prop === 'opacity') rt.opacity = Math.max(0, Math.min(1, value));
      else if (prop === 'x' || prop === 'y' || prop === 'rotation' || prop === 'scaleX' || prop === 'scaleY') rt[prop] = value;
      else if (prop && prop.startsWith('filter_')) {
        if (!sprite.filters) sprite.filters = {};
        sprite.filters[prop.slice(7)] = value;
      }
    }

    // ---------------- Shared helpers for interaction modules ----------------

    // Numeric inputs shared by value_remapper / condition_branch.
    readInput(source, p, sprite, ctx, clock) {
      const rt = sprite.runtime, m = this.bus.mouse;
      switch (source) {
        case 'mouse_x': return m.x;
        case 'mouse_y': return m.y;
        case 'mouse_distance': return Math.hypot(m.x - rt.x, m.y - rt.y);
        case 'mouse_speed': return Math.hypot(m.vx, m.vy);
        case 'time': return clock;
        case 'scroll': return this.bus.scroll?.scrollY || 0;
        case 'scroll_progress': return this.scrollProgress();
        case 'variable': return Number(this.bus.vars.get(p.varName || '')) || 0;
        case 'audio_level': return Math.max(ModuleEngine.audioLevel('microphone'), ModuleEngine.audioLevel('document'));
        case 'stack': return ctx.value;
        default: return m.x;
      }
    }

    viewportHeight() {
      return this.doc.viewportHeight || this.doc.height || 900;
    }

    // Page scroll progress 0..1 (top .. bottom of the document).
    scrollProgress() {
      const range = Math.max(1, (this.doc.height || 0) - this.viewportHeight());
      return Math.max(0, Math.min(1, (this.bus.scroll?.scrollY || 0) / range));
    }

    // 0 when the sprite's top enters the bottom of the viewport, 1 when its
    // bottom leaves the top.
    elementProgress(sprite) {
      const top = this.bus.scroll?.scrollY || 0, vh = this.viewportHeight();
      const hh = Math.abs(sprite.height * (sprite.scaleY || 1)) / 2;
      const span = vh + 2 * hh;
      return Math.max(0, Math.min(1, (top + vh - (sprite.y - hh)) / span));
    }

    // Is at least `ratio` of the sprite's height inside the viewport?
    isInView(sprite, ratio = 0.15) {
      const top = this.bus.scroll?.scrollY || 0, vh = this.viewportHeight();
      const h = Math.abs(sprite.height * (sprite.scaleY || 1));
      const y0 = sprite.y - h / 2, y1 = sprite.y + h / 2;
      const visible = Math.min(y1, top + vh) - Math.max(y0, top);
      return visible >= Math.min(h, vh) * ratio;
    }

    // Start time for "startOn: visible | load" modules; null while waiting.
    startTime(sprite, mod, p, resetWhenHidden = false) {
      const rt = sprite.runtime, key = '_start_' + mod.id;
      const ready = p.startOn === 'load' || this.isInView(sprite);
      if (ready && rt[key] === undefined) rt[key] = this.bus.time;
      if (!ready && resetWhenHidden && !this.isInView(sprite, 0)) delete rt[key];
      return rt[key] === undefined ? null : rt[key];
    }

    static parseColor(c) {
      if (!c || typeof c !== 'string') return null;
      c = c.trim();
      let m = c.match(/^#([0-9a-f]{3,8})$/i);
      if (m) {
        let h = m[1];
        if (h.length === 3 || h.length === 4) h = h.split('').map(x => x + x).join('');
        const n = parseInt(h.slice(0, 6), 16);
        const a = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
        return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a];
      }
      m = c.match(/^rgba?\(([^)]+)\)$/i);
      if (m) {
        const v = m[1].split(',').map(x => parseFloat(x));
        if (v.length >= 3 && v.slice(0, 3).every(isFinite)) return [v[0], v[1], v[2], isFinite(v[3]) ? v[3] : 1];
      }
      return null;
    }

    // Blend colour a -> b by t; non-parsable colours switch at t >= 0.5.
    static mixColor(a, b, t) {
      if (!b || t <= 0) return a;
      if (t >= 1 || !a) return b;
      const ca = ModuleEngine.parseColor(a), cb = ModuleEngine.parseColor(b);
      if (!ca || !cb) return t < 0.5 ? a : b;
      const r = ca.map((v, i) => v + (cb[i] - v) * t);
      return `rgba(${Math.round(r[0])},${Math.round(r[1])},${Math.round(r[2])},${+r[3].toFixed(3)})`;
    }

    // Text shown by a sprite: a text sprite's text, else its text_label module.
    static getText(sprite) {
      if (sprite.type !== 'text') {
        const lbl = (sprite.modules || []).find(m => m.type === 'text_label' && m.enabled !== false);
        if (lbl) return String(lbl.params?.text ?? '');
      }
      return String(sprite.text ?? '');
    }

    static setText(sprite, text) {
      text = String(text);
      if (ModuleEngine.getText(sprite) === text) return;
      const lbl = sprite.type !== 'text' && (sprite.modules || []).find(m => m.type === 'text_label' && m.enabled !== false);
      if (lbl) { lbl.params = lbl.params || {}; lbl.params.text = text; }
      else sprite.text = text;
      sprite._wrapCache = null;
    }

    static formatNumber(v, decimals, separator) {
      const d = Math.max(0, Math.min(6, Math.round(decimals) || 0));
      let str = Math.abs(v).toFixed(d);
      if (separator) {
        const [i, f] = str.split('.');
        str = i.replace(/\B(?=(\d{3})+(?!\d))/g, ',') + (f !== undefined ? '.' + f : '');
      }
      return (v < 0 ? '-' : '') + str;
    }

    // Apply an additive offset from `mod` to a runtime property. Runtime
    // position/rotation/opacity persist between frames (drag, physics, ...), so
    // the offset applied on the previous frame is replaced instead of added
    // again. Scale is reset every frame, so it is simply added.
    offsetProp(sprite, mod, prop, offset) {
      if (!isFinite(offset)) return;
      const rt = sprite.runtime;
      if (prop.startsWith('filter_')) { ModuleEngine.setProp(sprite, prop, offset); return; }
      if (prop === 'scale' || prop === 'scaleX' || prop === 'scaleY') {
        if (prop !== 'scaleY') rt.scaleX += offset;
        if (prop !== 'scaleX') rt.scaleY += offset;
        return;
      }
      rt._offs = rt._offs || {};
      const key = mod.id + ':' + prop;
      const prev = rt._offs[key] || 0;
      rt[prop] = (rt[prop] || 0) + offset - prev; // opacity is clamped by the renderer
      rt._offs[key] = offset;
    }

    // Queue a navigation (used to switch sections in the middle of a fade).
    queueNavigation(at, sprite, opts) {
      this._pendingNavs.push({ at, sprite, opts });
    }

    // ---------------- Audio ----------------
    static audioContext() {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext);
      if (!AC) return null;
      if (!ModuleEngine._audioCtx) {
        const ac = new AC();
        // Everything the document plays goes through one master node with an
        // analyser so audio_reactive can listen to it.
        const master = ac.createGain();
        const analyser = ac.createAnalyser();
        analyser.fftSize = 1024;
        master.connect(analyser);
        analyser.connect(ac.destination);
        ModuleEngine._audioCtx = ac;
        ModuleEngine._master = master;
        ModuleEngine._docAnalyser = analyser;
      }
      return ModuleEngine._audioCtx;
    }

    // Call from a user gesture (pointer down / key) so browsers allow audio.
    static resumeAudio() {
      try {
        // Create (or resume) inside a user gesture so browsers allow sound.
        const ac = ModuleEngine.audioContext();
        if (ac && ac.state === 'suspended') ac.resume();
      } catch (_) {}
    }

    static requestMicrophone() {
      if (ModuleEngine._micState) return;
      ModuleEngine._micState = 'pending';
      try {
        const ac = ModuleEngine.audioContext();
        if (!ac || !navigator.mediaDevices?.getUserMedia) { ModuleEngine._micState = 'unavailable'; return; }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          const src = ac.createMediaStreamSource(stream);
          const an = ac.createAnalyser();
          an.fftSize = 1024;
          src.connect(an); // not connected to the speakers (no feedback)
          ModuleEngine._micAnalyser = an;
          ModuleEngine._micState = 'on';
        }).catch(() => { ModuleEngine._micState = 'denied'; });
      } catch (_) { ModuleEngine._micState = 'unavailable'; }
    }

    // RMS level 0..1 of the microphone or of the document's own audio.
    static audioLevel(source) {
      const an = source === 'microphone' ? ModuleEngine._micAnalyser : ModuleEngine._docAnalyser;
      if (!an) return 0;
      const buf = ModuleEngine._levelBuf && ModuleEngine._levelBuf.length === an.fftSize
        ? ModuleEngine._levelBuf : (ModuleEngine._levelBuf = new Float32Array(an.fftSize));
      an.getFloatTimeDomainData(buf);
      let sum = 0;
      for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
      return Math.min(1, Math.sqrt(sum / buf.length) * 3);
    }

    // Built-in synthesizer for synth_sfx (Web Audio, no files).
    static playSynth(sound, volume = 0.6) {
      try {
        const ac = ModuleEngine.audioContext();
        if (!ac) return;
        if (ac.state === 'suspended') ac.resume();
        const now = ac.currentTime;
        const out = ac.createGain();
        out.gain.value = Math.max(0, Math.min(1, volume));
        out.connect(ModuleEngine._master);
        const tone = (type, f0, f1, t0, dur, peak = 0.6) => {
          const o = ac.createOscillator(), g = ac.createGain();
          o.type = type;
          o.frequency.setValueAtTime(f0, now + t0);
          o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), now + t0 + dur);
          g.gain.setValueAtTime(0.0001, now + t0);
          g.gain.exponentialRampToValueAtTime(peak, now + t0 + 0.01);
          g.gain.exponentialRampToValueAtTime(0.0001, now + t0 + dur);
          o.connect(g); g.connect(out);
          o.start(now + t0); o.stop(now + t0 + dur + 0.02);
        };
        if (sound === 'click') tone('square', 1800, 900, 0, 0.03, 0.3);
        else if (sound === 'ding') { tone('sine', 1320, 1318, 0, 0.35); tone('sine', 990, 988, 0.12, 0.45); }
        else if (sound === 'switch') { tone('square', 600, 600, 0, 0.025, 0.25); tone('square', 900, 900, 0.05, 0.025, 0.25); }
        else if (sound === 'boop') tone('sine', 520, 260, 0, 0.18);
        else if (sound === 'whoosh') {
          const len = Math.floor(ac.sampleRate * 0.35);
          const buf = ac.createBuffer(1, len, ac.sampleRate);
          const d = buf.getChannelData(0);
          for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * i / len);
          const src = ac.createBufferSource(), f = ac.createBiquadFilter();
          f.type = 'bandpass'; f.frequency.setValueAtTime(400, now); f.frequency.exponentialRampToValueAtTime(3000, now + 0.35);
          src.buffer = buf; src.connect(f); f.connect(out); src.start(now);
        }
        else tone('sine', 900, 200, 0, 0.12); // pop
      } catch (_) { /* audio unavailable */ }
    }

    // Shared "when to play" logic for synth_sfx / audio_clip.
    shouldFire(sprite, mod, p, key = 'trigger') {
      const rt = sprite.runtime;
      const trig = p[key] || 'click';
      let fire = false;
      if (trig === 'always') {
        fire = true;
      } else if (trig === 'click') {
        fire = this.clickedOn(sprite);
      } else if (trig === 'hover') {
        const key = '_sndHover_' + mod.id;
        fire = rt.isHovered && !rt[key];
        rt[key] = rt.isHovered;
      } else if (trig === 'trigger') {
        const key = '_sndTrig_' + mod.id;
        const on = !!(rt.isTriggered || rt.wasTriggered || this.bus.activeTriggerTargets.has(sprite.id));
        fire = on && !rt[key];
        rt[key] = on;
      } else if (trig === 'signal') {
        const sName = p.listenSignal || '';
        const sig = sName ? this.bus.signals.get(sName) : null;
        const key = '_sndSig_' + mod.id;
        if (sig && sig.time !== rt[key] && this.bus.time - sig.time <= 0.35) { fire = true; rt[key] = sig.time; }
      }
      return fire;
    }

    stop() {
      this.active = false;
      this.bus.particles = [];
      this.draggedSprite = null;
      for (const l of this.doc.layers) l.resetRuntime();
    }

    navigateHyperlink(href, target = '_blank') {
      if (!href) return;
      href = href.trim();
      if (href.startsWith('#')) {
        const targetId = href.slice(1);
        const targetSp = this.doc.layers.flatMap(l => l.sprites).find(s => s.anchorId === targetId || s.id === targetId);
        if (targetSp && typeof this.onNavigateAnchor === 'function') this.onNavigateAnchor(targetSp);
      } else {
        const safeHref = safeUrl(href);
        if (safeHref) window.open(safeHref, target);
      }
    }

    // ---- Trigger conditions -------------------------------------------------
    // condition  : what starts the module (click, hover, key, signal, ...).
    // conditionMode: how long it then runs
    //   while    - only while the condition is true (a click / signal is a
    //              single instant, a hover or held key lasts)
    //   latch    - starts on the event and keeps running
    //   toggle   - each event switches it on / off
    //   duration - runs for conditionDuration seconds after each event
    //   auto     - latch for animations started by an instant event
    //              (click / signal), otherwise while (a trigger already
    //              lasts for its own active window)
    static instantCondition(cond) { return cond === 'on_click' || cond === 'on_signal'; }

    // Modules that animate over time (vs. one-shot actions such as sounds,
    // signals or counters). Kept as a list: exports do not ship the registry.
    static continuousModule(type) {
      return ['photoshop_filter', 'substance_mask', 'tween_interpolator', 'path_follower', 'mouse_tilt_3d', 'particle_emitter',
        'motion_wave', 'pulse_scale', 'shake_vibrate', 'orbit_spin', 'wall_bounce', 'rainbow_shift', 'timeline_keyframes',
        'duration_delay', 'step_sequencer', 'stagger_domino', 'scroll_progress', 'entrance_animation', 'typewriter',
        'count_up', 'magnetic', 'cursor_fx', 'physics_body', 'audio_reactive', 'follow_target', 'look_at'].includes(type);
    }

    static conditionSignal(mod) {
      const p = mod.params || {};
      return p.condSignal || p.listenSignal || p.inputSignal || '*';
    }

    static resolveConditionMode(mod) {
      const p = mod.params || {};
      const m = p.conditionMode || 'auto';
      if (m !== 'auto') return m;
      return ModuleEngine.instantCondition(p.condition) && ModuleEngine.continuousModule(mod.type) ? 'latch' : 'while';
    }

    evaluateCondition(mod, sprite, bus) {
      const cond = mod.params?.condition || 'always';
      if (cond === 'always') return true;
      const raw = this.rawCondition(mod, sprite, bus, cond);
      const mode = ModuleEngine.resolveConditionMode(mod);
      const rt = sprite.runtime;
      rt._cond = rt._cond || {};
      const st = rt._cond[mod.id] || (rt._cond[mod.id] = { on: false, prev: false, until: -1, sig: null });
      // Rising edge; for signals a new emission counts even while still fresh.
      let fired = raw && !st.prev;
      if (cond === 'on_signal') {
        const t = bus.signalTime ? bus.signalTime(ModuleEngine.conditionSignal(mod)) : null;
        fired = t !== null && t !== st.sig;
        if (t !== null) st.sig = t;
      }
      st.prev = raw;
      let out;
      if (mode === 'latch') { if (fired) st.on = true; out = st.on; }
      else if (mode === 'toggle') { if (fired) st.on = !st.on; out = st.on; }
      else if (mode === 'duration') {
        if (fired) st.until = bus.time + Math.max(0.05, Number(mod.params?.conditionDuration) || 1);
        out = bus.time < st.until;
      } else out = raw;
      st.active = out;
      st.lastFired = fired ? bus.time : st.lastFired;
      return out;
    }

    // A click belongs to where it was pressed: by the time of the next frame
    // the pointer may already have left the sprite.
    clickedOn(sprite) {
      const m = this.bus.mouse;
      return !!m.clicked && this.isPointInside(m.pressX, m.pressY, sprite);
    }

    rawCondition(mod, sprite, bus, cond) {
      if (cond === 'on_click') return this.clickedOn(sprite);
      if (cond === 'on_hover') return sprite.runtime.isHovered;
      if (cond === 'key_press') {
        const targetK = mod.params?.condKey || mod.params?.targetKey || 'Space';
        return !!bus.keyState[targetK];
      }
      if (cond === 'timeline_active') {
        const sf = Number(mod.params?.condStartFrame ?? mod.params?.startFrame) || 0;
        const ef = Number(mod.params?.condEndFrame ?? mod.params?.endFrame) || this.doc.totalFrames;
        return this.doc.currentFrame >= sf && this.doc.currentFrame <= ef;
      }
      if (cond === 'on_trigger') {
        if (sprite.runtime && (sprite.runtime.isTriggered || sprite.runtime.wasTriggered)) return true;
        if (bus.activeTriggerTargets && bus.activeTriggerTargets.has(sprite.id)) return true;
        if (mod.params?.triggerId && bus.activeTriggers && bus.activeTriggers.has(mod.params.triggerId)) return true;
        return false;
      }
      if (cond === 'on_signal') return bus.hasSignal(ModuleEngine.conditionSignal(mod));
      if (cond === 'on_toggle') {
        return sprite.runtime && sprite.runtime.toggleState !== false;
      }
      return true;
    }

    // pressPos: document coords where the button went down (a click can be
    // processed a frame after the pointer already moved on).
    update(dt, mw, ms, isDown, clicked, pressPos = null) {
      if (!this.active) return;
      this._frame = (this._frame || 0) + 1;
      // Trigger flags live for one frame (kept one more as wasTriggered so
      // modules evaluated earlier in the next frame still see them).
      for (const layer of this.doc.layers) {
        for (const sp of layer.sprites) {
          if (!sp.runtime) continue;
          sp.runtime.wasTriggered = !!sp.runtime.isTriggered;
          sp.runtime.isTriggered = false;
        }
      }
      this.bus.hideCursor = false;
      if (this.bus.fade && this.bus.time + dt - this.bus.fade.start > this.bus.fade.duration) this.bus.fade = null;
      if (this._pendingNavs.length) {
        const due = this._pendingNavs.filter(n => n.at <= this.bus.time);
        this._pendingNavs = this._pendingNavs.filter(n => n.at > this.bus.time);
        for (const n of due) if (typeof this.onNavigateAnchor === 'function') this.onNavigateAnchor(n.sprite, n.opts);
      }

      // Wheel delta accumulated by the host since the last frame.
      this.bus.scroll.deltaY = this._pendingWheel || 0;
      this._pendingWheel = 0;
      this.bus.mouse.pressX = pressPos ? pressPos.x : mw.x;
      this.bus.mouse.pressY = pressPos ? pressPos.y : mw.y;
      this.bus.time += dt;
      const prevX = this.bus.mouse.x, prevY = this.bus.mouse.y;
      this.bus.mouse.x = mw.x; this.bus.mouse.y = mw.y;
      this.bus.mouse.rawX = ms.x; this.bus.mouse.rawY = ms.y;
      this.bus.mouse.vx = (this.bus.mouse.x - prevX) / (dt || 0.016);
      this.bus.mouse.vy = (this.bus.mouse.y - prevY) / (dt || 0.016);
      this.bus.mouse.isDown = isDown;
      this.bus.mouse.clicked = clicked;

      // Clean up stale signals (> 0.6s)
      for (const [sigName, sigData] of this.bus.signals.entries()) {
        if (this.bus.time - sigData.time > 0.6) {
          this.bus.signals.delete(sigName);
        }
      }
      this.bus.activeTriggers.clear();
      this.bus.activeTriggerTargets.clear();

      // Scale is a per-frame effect (pulse modules / pulse triggers set it every
      // frame they are active); reset it so it returns to rest when they stop.
      for (const layer of this.doc.layers) {
        for (const sprite of layer.sprites) {
          if (!sprite.runtime) continue;
          sprite.runtime.scaleX = sprite.scaleX;
          sprite.runtime.scaleY = sprite.scaleY;
        }
      }

      // Free dragging
      if (this.draggedSprite) {
        if (this.bus.mouse.isDown) this.applyDragPosition(this.bus.mouse.x, this.bus.mouse.y);
        else this.endDrag(this.bus.mouse.x, this.bus.mouse.y);
      }

      // Update particles
      for (let i = this.bus.particles.length - 1; i >= 0; i--) {
        const p = this.bus.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) this.bus.particles.splice(i, 1);
      }

      // --- PHASE 1: Screen Triggers Detection & Signal Emission ---
      for (const layer of this.doc.layers) {
        if (!layer.visible) continue;
        for (const sprite of layer.sprites) {
          if (!sprite.visible) continue;
          sprite.runtime.isHovered = this.isPointInside(this.bus.mouse.x, this.bus.mouse.y, sprite);

          // Check if sprite is a screen_trigger sprite OR has screen_trigger module
          const triggerMod = (sprite.modules || []).find(m => m.enabled && m.type === 'screen_trigger');
          const isTriggerSprite = sprite.type === 'screen_trigger' || !!triggerMod;

          if (isTriggerSprite) {
            const trgEvt = triggerMod?.params?.triggerEvent || sprite.triggerEvent || 'viewport_enter';
            const trgAct = triggerMod?.params?.action || sprite.triggerAction || 'emit_signal';
            const trgSig = triggerMod?.params?.signalName || sprite.signalName || ('trig_' + sprite.id);
            const trgTgtId = triggerMod?.params?.targetSpriteId || sprite.targetSpriteId || '';
            const trgFx = triggerMod?.params?.filterEffect || sprite.filterEffect || 'blur';
            const trgFxVal = parseFloat(triggerMod?.params?.filterValue !== undefined ? triggerMod.params.filterValue : (sprite.filterValue ?? 20));

            const halfW = (sprite.width || 100) / 2;
            const halfH = (sprite.height || 100) / 2;
            const isMouseInside = this.bus.mouse.x >= sprite.x - halfW && this.bus.mouse.x <= sprite.x + halfW &&
                                  this.bus.mouse.y >= sprite.y - halfH && this.bus.mouse.y <= sprite.y + halfH;
            const scrollY = this.bus.scroll?.scrollY || 0;
            const vpHeight = this.doc.viewportHeight || 900;
            const isInsideViewport = (sprite.y + halfH >= scrollY) && (sprite.y - halfH <= scrollY + vpHeight);

            let triggered = false;
            if (trgEvt === 'viewport_enter') triggered = isInsideViewport;
            else if (trgEvt === 'viewport_exit') triggered = !isInsideViewport;
            else if (trgEvt === 'mouse_enter') triggered = isMouseInside;
            else if (trgEvt === 'mouse_move') triggered = isMouseInside && (Math.abs(this.bus.mouse.vx) > 0.5 || Math.abs(this.bus.mouse.vy) > 0.5);
            else if (trgEvt === 'scroll_reach') triggered = scrollY >= (sprite.y - 300);
            else if (trgEvt === 'click') triggered = this.clickedOn(sprite);

            sprite.runtime.isTriggered = triggered;

            if (triggered) {
              this.bus.activeTriggers.add(sprite.id);
              this.bus.emitSignal(trgSig, sprite.id);

              if (trgTgtId) {
                this.bus.activeTriggerTargets.add(trgTgtId);
                const tgt = this.doc.findSpriteById(trgTgtId);
                if (tgt) {
                  tgt.runtime.isTriggered = true;
                  if (trgAct === 'show_sprite') { tgt.visible = true; tgt.runtime.visible = true; }
                  else if (trgAct === 'hide_sprite') { tgt.runtime.visible = false; }
                  else if (trgAct === 'pulse') {
                    tgt.runtime.scaleX = (tgt.scaleX || 1) * 1.15;
                    tgt.runtime.scaleY = (tgt.scaleY || 1) * 1.15;
                  }
                  else if (trgAct === 'animate_in') {
                    tgt.runtime.opacity = Math.min(1, (tgt.runtime.opacity || 0) + dt * 2.5);
                  }
                  else if (trgAct === 'animate_filter' || trgAct === 'filter_fx') {
                    if (!tgt.filters) tgt.filters = {};
                    if (trgFx === 'blur') tgt.filters.blur = Math.min(trgFxVal, (tgt.filters.blur || 0) + dt * 30);
                    else if (trgFx === 'grayscale') tgt.filters.grayscale = Math.min(trgFxVal, (tgt.filters.grayscale || 0) + dt * 100);
                    else if (trgFx === 'invert') tgt.filters.invert = Math.min(trgFxVal, (tgt.filters.invert || 0) + dt * 100);
                    else if (trgFx === 'opacity') tgt.filters.opacity = trgFxVal;
                    else tgt.filters[trgFx] = trgFxVal;
                  }
                  else if (trgAct === 'set_filter') {
                    if (!tgt.filters) tgt.filters = {};
                    tgt.filters[trgFx] = trgFxVal;
                  }
                }
              }
            }
          }
        }
      }

      // --- PHASE 2: Complete Module Execution & Signal Relay ---
      for (const layer of this.doc.layers) {
        if (!layer.visible) continue;

        for (const sprite of layer.sprites) {
          if (!sprite.visible) continue;

          // Module stack context: modules run top to bottom; timing modules can
          // close the gate for the modules below them, settings modules
          // (loop_mode, easing_presets) configure them, and value modules pass
          // a number down the stack (ctx.value).
          const ctx = { value: 0, loopMode: null, easing: null, gateOpen: true, index: layer.sprites.indexOf(sprite) };
          const rest = { x: sprite.runtime.x, y: sprite.runtime.y, rotation: sprite.runtime.rotation,
            scaleX: sprite.runtime.scaleX, scaleY: sprite.runtime.scaleY, opacity: sprite.runtime.opacity };

          // Layer modules (added with the layer's +fx) apply to every sprite of
          // the layer, before the sprite's own modules.
          const stack = (layer.modules && layer.modules.length) ? [...layer.modules, ...(sprite.modules || [])] : (sprite.modules || []);
          for (const mod of stack) {
            if (!mod.enabled) continue;
            if (this.disabledModuleIds && this.disabledModuleIds.has(mod.id)) continue;
            // Action blocks keep running after their trigger (a move takes time).
            if (mod.type === 'action_rules') { this.runActions(sprite, mod, mod.params || {}, ctx.gateOpen && this.actionFired(mod, sprite), dt); continue; }
            if (!ctx.gateOpen) continue;
            if (!this.evaluateCondition(mod, sprite, this.bus)) continue;

            const p = mod.params || {};
            const clock = this.moduleClock(sprite, mod);

            switch (mod.type) {
              case 'path_follower': {
                let pathSp = null;
                const pathId = p.pathSpriteId || p.pathLayerId;
                if (pathId) {
                  for (const ly of this.doc.layers) {
                    pathSp = ly.getSprite(pathId);
                    if (pathSp) break;
                  }
                }
                if (!pathSp) {
                  for (const ly of this.doc.layers) {
                    pathSp = ly.sprites.find(s => s.type === 'path' && s.id !== sprite.id);
                    if (pathSp) break;
                  }
                }
                if (pathSp && pathSp.pathPoints && pathSp.pathPoints.length > 1) {
                  const pts = pathSp.pathPoints;
                  const speed = Number(p.speed) || 1.0;
                  const loopMode = p.loopMode || 'loop';
                  const tCycle = (this.bus.time * speed * 0.25);
                  let t = 0;
                  if (loopMode === 'pingpong') {
                    const frac = tCycle % 2;
                    t = frac > 1 ? 2 - frac : frac;
                  } else if (loopMode === 'once') {
                    t = Math.min(1, tCycle);
                  } else {
                    t = tCycle % 1;
                  }
                  const segCount = pts.length - 1;
                  const totalIdx = t * segCount;
                  const curIdx = Math.min(segCount - 1, Math.floor(totalIdx));
                  const segT = totalIdx - curIdx;
                  const p0 = pts[curIdx];
                  const p1 = pts[curIdx + 1];
                  const posX = p0.x + (p1.x - p0.x) * segT;
                  const posY = p0.y + (p1.y - p0.y) * segT;
                  sprite.runtime.x = pathSp.x + posX;
                  sprite.runtime.y = pathSp.y + posY;
                  if (p.autoRotate !== false) {
                    const angle = Math.atan2(p1.y - p0.y, p1.x - p0.x) * (180 / Math.PI);
                    sprite.runtime.rotation = angle;
                  }
                }
                break;
              }

              case 'hyperlink': {
                const hUrl = p.url || sprite.linkUrl || '';
                const hTarget = p.target || sprite.linkTarget || '_blank';
                const hAnchor = p.anchorId || sprite.anchorId || '';
                const hHoverFx = p.hoverEffect || sprite.hoverEffect || 'lift';
                const hTrig = p.trigger || 'click';
                const hSig = p.signalName || '';

                sprite.runtime.activeLink = {
                  url: hUrl,
                  target: hTarget,
                  anchorId: hAnchor,
                  hoverEffect: hHoverFx,
                  trigger: hTrig
                };

                // Signal-based link navigation
                if (hTrig === 'signal' && hSig && this.bus.hasSignal(hSig)) {
                  if (!sprite.runtime._lastLinkNavTime || (this.bus.time - sprite.runtime._lastLinkNavTime > 0.8)) {
                    sprite.runtime._lastLinkNavTime = this.bus.time;
                    this.navigateHyperlink(hUrl, hTarget);
                  }
                }

                // Hover-based link navigation
                if (hTrig === 'hover' && sprite.runtime.isHovered) {
                  if (!sprite.runtime._lastHoverNavTime || (this.bus.time - sprite.runtime._lastHoverNavTime > 2.0)) {
                    sprite.runtime._lastHoverNavTime = this.bus.time;
                    this.navigateHyperlink(hUrl, hTarget);
                  }
                }

                // Viewport-enter-based navigation
                if (hTrig === 'viewport_enter' && sprite.runtime.isTriggered) {
                  if (!sprite.runtime._lastVpNavTime || (this.bus.time - sprite.runtime._lastVpNavTime > 3.0)) {
                    sprite.runtime._lastVpNavTime = this.bus.time;
                    this.navigateHyperlink(hUrl, hTarget);
                  }
                }
                break;
              }

              case 'draggable':
                if (this.bus.mouse.clicked && !this.draggedSprite &&
                    this.isPointInside(this.bus.mouse.pressX, this.bus.mouse.pressY, sprite)) {
                  this.draggedSprite = sprite;
                  this.dragParams = p;
                  this.dragOffset = { x: this.bus.mouse.pressX - sprite.runtime.x, y: this.bus.mouse.pressY - sprite.runtime.y };
                  this.bus.emitSignal('drag_start', sprite.id);
                }
                break;

              case 'hover_proximity': {
                // Hover or within detectionRadius of the sprite edge: scale up and signal.
                const radius = Math.max(0, parseFloat(p.detectionRadius) || 0);
                const hw = (sprite.width * (sprite.scaleX || 1)) / 2 + radius;
                const hh = (sprite.height * (sprite.scaleY || 1)) / 2 + radius;
                const near = sprite.runtime.isHovered ||
                  (Math.abs(this.bus.mouse.x - sprite.runtime.x) <= hw && Math.abs(this.bus.mouse.y - sprite.runtime.y) <= hh);
                const target = near ? (parseFloat(p.scaleOnHover) || 1) : 1;
                const cur = sprite.runtime._hoverScale || 1;
                const next = cur + (target - cur) * Math.min(1, dt * 12);
                sprite.runtime._hoverScale = next;
                sprite.runtime.scaleX *= next;
                sprite.runtime.scaleY *= next;
                if (near && !sprite.runtime._wasNear) this.bus.emitSignal('hover_enter', sprite.id);
                if (!near && sprite.runtime._wasNear) this.bus.emitSignal('hover_exit', sprite.id);
                sprite.runtime._wasNear = near;
                sprite.runtime.isTriggered = sprite.runtime.isTriggered || near;
                break;
              }

              case 'click_gesture': {
                // click / double_click / long_press on the sprite -> signal + short trigger pulse.
                const rt = sprite.runtime;
                const gesture = p.gestureType || 'click';
                const hold = parseFloat(p.activeDuration) || 0.2;
                let fired = false;
                if (this.clickedOn(sprite)) {
                  if (gesture === 'click') fired = true;
                  if (gesture === 'double_click') {
                    fired = rt._lastClickTime !== undefined && (this.bus.time - rt._lastClickTime) < 0.35;
                    rt._lastClickTime = fired ? undefined : this.bus.time;
                  }
                  rt._pressStart = this.bus.time;
                  rt._longFired = false;
                }
                if (gesture === 'long_press' && this.bus.mouse.isDown && rt.isHovered && rt._pressStart !== undefined &&
                    !rt._longFired && (this.bus.time - rt._pressStart) >= 0.5) {
                  fired = true;
                  rt._longFired = true;
                }
                if (!this.bus.mouse.isDown) rt._pressStart = undefined;
                if (fired) {
                  rt._gestureUntil = this.bus.time + hold;
                  this.bus.emitSignal(p.signalName || ('gesture_' + gesture), sprite.id);
                }
                if (rt._gestureUntil !== undefined && this.bus.time <= rt._gestureUntil) {
                  rt.isTriggered = true;
                  this.bus.activeTriggerTargets.add(sprite.id);
                }
                break;
              }

              case 'keyboard_trigger': {
                // Arrow keys / WASD move the sprite; any configured key emits a signal.
                const speed = parseFloat(p.moveSpeed) || 5;
                const k = this.bus.keyState;
                const step = speed * 60 * dt;
                if (k.ArrowLeft || k.KeyA) sprite.runtime.x -= step;
                if (k.ArrowRight || k.KeyD) sprite.runtime.x += step;
                if (k.ArrowUp || k.KeyW) sprite.runtime.y -= step;
                if (k.ArrowDown || k.KeyS) sprite.runtime.y += step;
                const tk = p.targetKey || 'ArrowRight';
                if (k[tk]) this.bus.emitSignal('key_' + tk, sprite.id);
                break;
              }

              case 'screen_trigger':
                // Already evaluated in Phase 1
                break;

              case 'signal_relay': {
                const inSig = p.inputSignal || '*';
                const outSig = p.outputSignal || 'signal_relayed';
                const delay = parseFloat(p.delaySec !== undefined ? p.delaySec : 0.3);

                sprite.runtime._relayQueue = sprite.runtime._relayQueue || [];

                if (this.bus.hasSignal(inSig)) {
                  const sObj = this.bus.signals.get(inSig) || { time: this.bus.time };
                  if (!sprite.runtime._lastHandledSigTime || (sObj.time - sprite.runtime._lastHandledSigTime > 0.15)) {
                    sprite.runtime._lastHandledSigTime = sObj.time;
                    sprite.runtime._relayQueue.push({
                      timer: delay,
                      outputSignal: outSig,
                      action: p.action || 'emit_signal',
                      targetSpriteId: p.targetSpriteId,
                      targetModuleId: p.targetModuleId,
                      targetLayerId: p.targetLayerId,
                      filterEffect: p.filterEffect || 'invert',
                      filterValue: parseFloat(p.filterValue !== undefined ? p.filterValue : 100)
                    });
                  }
                }

                if (sprite.runtime._relayQueue.length > 0) {
                  for (let qIdx = sprite.runtime._relayQueue.length - 1; qIdx >= 0; qIdx--) {
                    const item = sprite.runtime._relayQueue[qIdx];
                    item.timer -= dt;
                    if (item.timer <= 0) {
                      this.bus.emitSignal(item.outputSignal, sprite.id);
                      if (item.targetSpriteId) {
                        const tgt = this.doc.findSpriteById(item.targetSpriteId);
                        if (tgt) {
                          tgt.runtime.isTriggered = true;
                          this.bus.activeTriggerTargets.add(tgt.id);
                          if (item.action === 'animate_filter' || item.action === 'set_filter') {
                            if (!tgt.filters) tgt.filters = {};
                            tgt.filters[item.filterEffect] = item.filterValue;
                          } else if (item.action === 'toggle_active') {
                            tgt.visible = !tgt.visible;
                          }
                        }
                      }
                      if (item.targetLayerId) {
                        const tgtL = this.doc.getLayer(item.targetLayerId);
                        if (tgtL) {
                          if (item.action === 'animate_filter' || item.action === 'set_filter') {
                            if (!tgtL.filters) tgtL.filters = {};
                            tgtL.filters[item.filterEffect] = item.filterValue;
                          } else if (item.action === 'toggle_active') {
                            tgtL.visible = !tgtL.visible;
                          }
                        }
                      }
                      sprite.runtime._relayQueue.splice(qIdx, 1);
                    }
                  }
                }
                break;
              }

              case 'toggle_switch': {
                const inSig = p.inputSignal || '';
                const shouldToggle = (inSig && this.bus.hasSignal(inSig)) || this.clickedOn(sprite);
                if (shouldToggle) {
                  if (!sprite.runtime._lastToggleTime || (this.bus.time - sprite.runtime._lastToggleTime > 0.2)) {
                    sprite.runtime._lastToggleTime = this.bus.time;
                    sprite.runtime.toggleState = (sprite.runtime.toggleState === undefined ? !(p.initialValue || false) : !sprite.runtime.toggleState);
                    this.bus.emitSignal(sprite.runtime.toggleState ? 'toggle_on' : 'toggle_off', sprite.id);
                  }
                }
                break;
              }

              case 'counter_accumulator': {
                const inSig = p.inputSignal || '';
                const shouldCount = (inSig && this.bus.hasSignal(inSig)) || this.clickedOn(sprite) || sprite.runtime.isTriggered;
                if (shouldCount) {
                  if (!sprite.runtime._lastCountTime || (this.bus.time - sprite.runtime._lastCountTime > 0.15)) {
                    sprite.runtime._lastCountTime = this.bus.time;
                    sprite.runtime.counterValue = (sprite.runtime.counterValue !== undefined ? sprite.runtime.counterValue : (p.startVal || 0)) + (p.stepVal || 1);
                    if (p.maxVal !== undefined && sprite.runtime.counterValue > p.maxVal) {
                      sprite.runtime.counterValue = p.startVal || 0;
                      this.bus.emitSignal('counter_max', sprite.id);
                    }
                    if (sprite.type === 'text') { sprite.text = String(sprite.runtime.counterValue); sprite._wrapCache = null; }
                    this.bus.emitSignal('counter_tick', sprite.id, sprite.runtime.counterValue);
                  }
                }
                break;
              }

              case 'follow_target': {
                let tx = this.bus.mouse.x, ty = this.bus.mouse.y;
                if (p.targetSpriteId) {
                  const targetSp = this.doc.findSpriteById(p.targetSpriteId);
                  if (targetSp) { tx = targetSp.runtime.x; ty = targetSp.runtime.y; }
                } else if (p.targetLayerId) {
                  const target = this.doc.getLayer(p.targetLayerId)?.primarySprite;
                  if (target) { tx = target.runtime.x; ty = target.runtime.y; }
                }
                const mode = p.trackMode || 'spring';
                const st = parseFloat(p.stiffness !== undefined ? p.stiffness : 0.1);
                const dp = parseFloat(p.damping !== undefined ? p.damping : 0.8);
                // constantSpeed is px/sec (registry); maxSpeed is the legacy px/frame cap.
                const maxS = p.constantSpeed !== undefined ? parseFloat(p.constantSpeed) * dt : parseFloat(p.maxSpeed !== undefined ? p.maxSpeed : 15);
                const axis = p.followAxis || 'both';
                const baseX = sprite.runtime.x, baseY = sprite.runtime.y;
                const ox = parseFloat(p.offsetX || 0);
                const oy = parseFloat(p.offsetY || 0);
                const destX = tx + ox, destY = ty + oy;
                const dx = destX - sprite.runtime.x, dy = destY - sprite.runtime.y;
                const dist = Math.hypot(dx, dy);

                if (mode === 'direct') {
                  sprite.runtime.x = destX;
                  sprite.runtime.y = destY;
                } else if (mode === 'lerp') {
                  const factor = Math.min(1, Math.max(0, p.smoothSpeed !== undefined ? parseFloat(p.smoothSpeed) : st * 2));
                  sprite.runtime.x += dx * factor;
                  sprite.runtime.y += dy * factor;
                } else if (mode === 'constant') {
                  if (dist > 1) {
                    const step = Math.min(dist, maxS);
                    sprite.runtime.x += (dx / dist) * step;
                    sprite.runtime.y += (dy / dist) * step;
                  }
                } else if (mode === 'orbit') {
                  // orbitSpeed is degrees per second
                  const spd = parseFloat(p.orbitSpeed || 90) * Math.PI / 180;
                  const rad = parseFloat(p.orbitRadius || 80);
                  const angle = this.bus.time * spd;
                  sprite.runtime.x = tx + Math.cos(angle) * rad;
                  sprite.runtime.y = ty + Math.sin(angle) * rad;
                } else {
                  sprite.runtime.vx = ((sprite.runtime.vx || 0) + dx * st) * dp;
                  sprite.runtime.vy = ((sprite.runtime.vy || 0) + dy * st) * dp;
                  sprite.runtime.x += sprite.runtime.vx;
                  sprite.runtime.y += sprite.runtime.vy;
                }

                if (axis === 'x_only') sprite.runtime.y = baseY;
                else if (axis === 'y_only') sprite.runtime.x = baseX;

                if (p.rotateToTarget) {
                  sprite.runtime.rotation = Math.atan2(dy, dx) * 180 / Math.PI;
                }
                break;
              }

              case 'math_calculate': {
                const valA = parseFloat(p.inputA !== undefined ? p.inputA : (p.valA || 0));
                const valB = parseFloat(p.inputB !== undefined ? p.inputB : (p.valB || 0));
                let res = 0;
                const op = p.operation || 'add';
                switch (op) {
                  case 'add': res = valA + valB; break;
                  case 'subtract': res = valA - valB; break;
                  case 'multiply': res = valA * valB; break;
                  case 'divide': res = valB !== 0 ? valA / valB : 0; break;
                  case 'sin': res = Math.sin(valA); break;
                  case 'cos': res = Math.cos(valA); break;
                  case 'min': res = Math.min(valA, valB); break;
                  case 'max': res = Math.max(valA, valB); break;
                  case 'clamp': {
                    const cMin = parseFloat(p.clampMin || 0);
                    const cMax = parseFloat(p.clampMax !== undefined ? p.clampMax : 1);
                    res = Math.max(cMin, Math.min(cMax, valA));
                    break;
                  }
                  case 'lerp': {
                    const f = Math.max(0, Math.min(1, valB));
                    res = valA + (parseFloat(p.targetVal || 0) - valA) * f;
                    break;
                  }
                  case 'modulo': res = valB !== 0 ? valA % valB : 0; break;
                  case 'abs': res = Math.abs(valA); break;
                  case 'round': res = Math.round(valA); break;
                  default: res = valA + valB; break;
                }
                p.outputResult = res;
                ctx.value = res;

                const tgt = p.targetParam || 'none';
                if (tgt === 'x') sprite.runtime.x = res;
                else if (tgt === 'y') sprite.runtime.y = res;
                else if (tgt === 'rotation') sprite.runtime.rotation = res;
                else if (tgt === 'scaleX') sprite.runtime.scaleX = res;
                else if (tgt === 'scaleY') sprite.runtime.scaleY = res;
                else if (tgt === 'opacity') sprite.runtime.opacity = Math.max(0, Math.min(1, res));
                else if (tgt.startsWith('filter_')) {
                  if (!sprite.filters) sprite.filters = {};
                  const fltrKey = tgt.replace('filter_', '');
                  if (fltrKey === 'opacity') sprite.filters.opacity = Math.max(0, Math.min(100, res));
                  else sprite.filters[fltrKey] = res;
                }
                break;
              }

              case 'photoshop_filter': {
                if (!sprite.filters) sprite.filters = {};
                const fMode = p.mode || 'static';
                if (fMode === 'pulse') {
                  const spd = parseFloat(p.pulseSpeed || 2.0);
                  const wave = (Math.sin(this.bus.time * spd * Math.PI * 2) + 1) / 2;
                  const pMin = parseFloat(p.pulseMin || 0);
                  const pMax = parseFloat(p.pulseMax || 25);
                  sprite.filters.blur = pMin + wave * (pMax - pMin);
                  if (p.opacity !== undefined) sprite.filters.opacity = 40 + wave * 60;
                  if (p.hueRotate) sprite.filters.hueRotate = (this.bus.time * 60) % 360;
                } else if (fMode === 'reactive') {
                  const dist = Math.hypot(this.bus.mouse.x - sprite.runtime.x, this.bus.mouse.y - sprite.runtime.y);
                  const normDist = Math.max(0, Math.min(1, dist / 400));
                  sprite.filters.blur = (1 - normDist) * 20;
                  sprite.filters.brightness = 100 + (1 - normDist) * 50;
                } else {
                  if (p.blur !== undefined) sprite.filters.blur = parseFloat(p.blur || 0);
                  if (p.brightness !== undefined) sprite.filters.brightness = parseFloat(p.brightness || 100);
                  if (p.contrast !== undefined) sprite.filters.contrast = parseFloat(p.contrast || 100);
                  if (p.saturate !== undefined) sprite.filters.saturate = parseFloat(p.saturate || 100);
                  if (p.grayscale !== undefined) sprite.filters.grayscale = parseFloat(p.grayscale || 0);
                  if (p.sepia !== undefined) sprite.filters.sepia = parseFloat(p.sepia || 0);
                  if (p.hueRotate !== undefined) sprite.filters.hueRotate = parseFloat(p.hueRotate || 0);
                  if (p.invert !== undefined) sprite.filters.invert = parseFloat(p.invert || 0);
                  if (p.opacity !== undefined) sprite.filters.opacity = parseFloat(p.opacity !== undefined ? p.opacity : 100);
                  if (p.shadowBlur !== undefined) sprite.filters.shadowBlur = parseFloat(p.shadowBlur || 0);
                  if (p.shadowColor !== undefined) sprite.filters.shadowColor = p.shadowColor || 'rgba(0,0,0,0.5)';
                }
                break;
              }

              case 'look_at': {
                let tx = this.bus.mouse.x, ty = this.bus.mouse.y;
                if (p.targetLayerId) {
                  const target = this.doc.getLayer(p.targetLayerId)?.primarySprite;
                  if (target) { tx = target.runtime.x; ty = target.runtime.y; }
                }
                sprite.runtime.rotation = (Math.atan2(ty - sprite.runtime.y, tx - sprite.runtime.x) * 180 / Math.PI) + (p.rotationOffset || 0);
                break;
              }

              case 'motion_wave': {
                const amp = parseFloat(p.amplitude || 12);
                const freq = parseFloat(p.frequency || 1.5);
                const off = Math.sin(this.bus.time * freq * Math.PI * 2) * amp;
                if (p.axis === 'x') sprite.runtime.x = sprite.x + off;
                else sprite.runtime.y = sprite.y + off;
                break;
              }

              case 'pulse_scale': {
                const minS = parseFloat(p.minScale || 0.9), maxS = parseFloat(p.maxScale || 1.1);
                const spd = parseFloat(p.speed || 2.0);
                const s = minS + ((Math.sin(this.bus.time * spd * Math.PI * 2) + 1) / 2) * (maxS - minS);
                sprite.runtime.scaleX = sprite.scaleX * s;
                sprite.runtime.scaleY = sprite.scaleY * s;
                break;
              }

              case 'shake_vibrate': {
                // Jitter around the current position without accumulating drift.
                const intensity = parseFloat(p.intensity || 8);
                const prev = sprite.runtime._shake || { x: 0, y: 0 };
                const next = { x: (Math.random() - 0.5) * intensity, y: (Math.random() - 0.5) * intensity };
                sprite.runtime.x += next.x - prev.x;
                sprite.runtime.y += next.y - prev.y;
                sprite.runtime._shake = next;
                break;
              }

              case 'wall_bounce': {
                sprite.runtime.vx = sprite.runtime.vx || parseFloat(p.speedX || 120);
                sprite.runtime.vy = sprite.runtime.vy || parseFloat(p.speedY || 80);
                sprite.runtime.x += sprite.runtime.vx * dt;
                sprite.runtime.y += sprite.runtime.vy * dt;
                const hw = sprite.width / 2, hh = sprite.height / 2;
                if (sprite.runtime.x - hw <= 0 || sprite.runtime.x + hw >= this.doc.width) {
                  sprite.runtime.vx *= -1;
                  this.bus.emitSignal('wall_bounce', sprite.id);
                }
                if (sprite.runtime.y - hh <= 0 || sprite.runtime.y + hh >= this.doc.height) {
                  sprite.runtime.vy *= -1;
                  this.bus.emitSignal('wall_bounce', sprite.id);
                }
                break;
              }

              case 'rainbow_shift': {
                if (!sprite.filters) sprite.filters = {};
                const spd = parseFloat(p.speed || 60);
                sprite.filters.hueRotate = ((sprite.filters.hueRotate || 0) + spd * dt) % 360;
                break;
              }

              case 'orbit_spin': {
                const spd = parseFloat(p.speedDegPerSec || 45);
                sprite.runtime.rotation = (sprite.runtime.rotation + spd * dt) % 360;
                break;
              }

              case 'timeline_keyframes': {
                sprite.evaluateKeyframes(this.doc.currentFrame);
                break;
              }

              // ---------------- Web interaction modules ----------------
              case 'scroll_progress': {
                const prog = p.range === 'element' ? this.elementProgress(sprite) : this.scrollProgress();
                const e = ModuleEngine.ease(p.easing || 'linear', prog);
                const from = parseFloat(p.fromValue) || 0;
                const to = parseFloat(p.toValue);
                const val = from + ((isFinite(to) ? to : from) - from) * e;
                const prop = p.property || 'y';
                if (p.outputMode === 'absolute') ModuleEngine.setProp(sprite, prop, val);
                else this.offsetProp(sprite, mod, prop, val);
                ctx.value = prog;
                break;
              }

              case 'entrance_animation': {
                const rt = sprite.runtime;
                const start = this.startTime(sprite, mod, p, p.once === false);
                const dur = Math.max(0.01, parseFloat(p.duration) || 0.7);
                const t = start === null ? -1 : this.bus.time - start - (parseFloat(p.delay) || 0);
                const prog = t < 0 ? 0 : ModuleEngine.ease(p.easing || 'easeOutCubic', Math.min(1, t / dur));
                const inv = 1 - prog;
                const dist = parseFloat(p.distance);
                const d = isFinite(dist) ? dist : 40;
                let ox = 0, oy = 0, orot = 0;
                switch (p.effect) {
                  case 'fade_down': oy = -d * inv; break;
                  case 'fade_in': break;
                  case 'slide_left': ox = -d * inv; break;
                  case 'slide_right': ox = d * inv; break;
                  case 'zoom_in': rt.scaleX *= 0.6 + 0.4 * prog; rt.scaleY *= 0.6 + 0.4 * prog; break;
                  case 'zoom_out': rt.scaleX *= 1.4 - 0.4 * prog; rt.scaleY *= 1.4 - 0.4 * prog; break;
                  case 'rotate_in': orot = -15 * inv; oy = d * 0.5 * inv; break;
                  default: oy = d * inv; // fade_up
                }
                this.offsetProp(sprite, mod, 'x', ox);
                this.offsetProp(sprite, mod, 'y', oy);
                this.offsetProp(sprite, mod, 'rotation', orot);
                this.offsetProp(sprite, mod, 'opacity', -(sprite.opacity ?? 1) * inv);
                ctx.value = prog;
                break;
              }

              case 'state_style': {
                const rt = sprite.runtime, m = this.bus.mouse;
                if (!rt._ssBase) {
                  const lbl = (sprite.modules || []).find(x => x.type === 'text_label' && x.enabled !== false);
                  rt._ssBase = { fill: sprite.fill, stroke: sprite.stroke, textColor: sprite.textColor, label: lbl ? lbl.params?.color : undefined };
                }
                const hovered = !!rt.isHovered && !this.draggedSprite;
                const pressed = hovered && m.isDown && this.isPointInside(m.pressX, m.pressY, sprite);
                const k = Math.min(1, dt / Math.max(0.01, parseFloat(p.transition) || 0.15));
                rt._ssH = (rt._ssH || 0) + ((hovered ? 1 : 0) - (rt._ssH || 0)) * k;
                rt._ssP = (rt._ssP || 0) + ((pressed ? 1 : 0) - (rt._ssP || 0)) * k;
                const h = rt._ssH, pr = rt._ssP, base = rt._ssBase;
                const mix = ModuleEngine.mixColor;
                if (p.hoverFill || p.pressFill) sprite.fill = mix(mix(base.fill, p.hoverFill, p.hoverFill ? h : 0), p.pressFill, p.pressFill ? pr : 0);
                if (p.hoverStroke) sprite.stroke = mix(base.stroke, p.hoverStroke, h);
                if (p.hoverTextColor) {
                  const lbl = (sprite.modules || []).find(x => x.type === 'text_label' && x.enabled !== false);
                  if (lbl) lbl.params.color = mix(base.label || '#ffffff', p.hoverTextColor, h);
                  else if (sprite.type === 'text') sprite.fill = mix(base.fill, p.hoverTextColor, h);
                  else sprite.textColor = mix(base.textColor || '#ffffff', p.hoverTextColor, h);
                }
                const hs = parseFloat(p.hoverScale), ps = parseFloat(p.pressScale);
                let sc = 1 + ((isFinite(hs) ? hs : 1) - 1) * h;
                sc += ((isFinite(ps) ? ps : sc) - sc) * pr;
                rt.scaleX *= sc; rt.scaleY *= sc;
                ctx.value = h;
                break;
              }

              case 'count_up': {
                const start = this.startTime(sprite, mod, p);
                const from = parseFloat(p.from) || 0, to = parseFloat(p.to);
                const dur = Math.max(0.01, parseFloat(p.duration) || 1.6);
                const prog = start === null ? 0 : Math.min(1, (this.bus.time - start) / dur);
                const v = from + ((isFinite(to) ? to : from) - from) * ModuleEngine.ease(p.easing || 'easeOutCubic', prog);
                const shown = prog >= 1 ? (isFinite(to) ? to : from) : v;
                ModuleEngine.setText(sprite, (p.prefix || '') + ModuleEngine.formatNumber(shown, p.decimals, p.separator !== false) + (p.suffix || ''));
                ctx.value = shown;
                break;
              }

              case 'typewriter': {
                const rt = sprite.runtime;
                if (rt._twFull === undefined) rt._twFull = ModuleEngine.getText(sprite);
                const chars = Array.from(rt._twFull);
                const start = this.startTime(sprite, mod, p);
                const cps = Math.max(1, parseFloat(p.charsPerSec) || 14);
                const t = start === null ? -1 : this.bus.time - start - (parseFloat(p.startDelay) || 0);
                let n = 0, typing = false;
                if (t >= 0) {
                  const typeT = chars.length / cps, hold = Math.max(0, parseFloat(p.holdSec) || 0), delT = typeT / 2;
                  if (p.loop) {
                    const cyc = typeT + hold + delT + 0.4;
                    const u = t % cyc;
                    if (u < typeT) { n = Math.floor(u * cps); typing = true; }
                    else if (u < typeT + hold) n = chars.length;
                    else if (u < typeT + hold + delT) { n = Math.max(0, chars.length - Math.floor((u - typeT - hold) * cps * 2)); typing = true; }
                    else n = 0;
                  } else {
                    n = Math.min(chars.length, Math.floor(t * cps));
                    typing = n < chars.length;
                  }
                }
                const blinkOn = typing || Math.floor(this.bus.time * 2) % 2 === 0;
                const cursor = p.cursor && blinkOn ? p.cursor : '';
                ModuleEngine.setText(sprite, chars.slice(0, n).join('') + cursor);
                ctx.value = n;
                break;
              }

              case 'magnetic': {
                const rt = sprite.runtime, m = this.bus.mouse;
                const radius = Math.max(1, parseFloat(p.radius) || 120);
                // Measure from the position without this module's own pull.
                const offs = rt._offs || {};
                const dx = m.x - (rt.x - (offs[mod.id + ':x'] || 0)), dy = m.y - (rt.y - (offs[mod.id + ':y'] || 0));
                const d = Math.hypot(dx, dy);
                const str = Math.max(0, Math.min(1, parseFloat(p.strength) || 0));
                const tx = d < radius ? dx * str : 0, ty = d < radius ? dy * str : 0;
                const k = Math.max(0.01, Math.min(1, parseFloat(p.smoothing) || 0.18));
                rt._magX = (rt._magX || 0) + (tx - (rt._magX || 0)) * k;
                rt._magY = (rt._magY || 0) + (ty - (rt._magY || 0)) * k;
                this.offsetProp(sprite, mod, 'x', rt._magX);
                this.offsetProp(sprite, mod, 'y', rt._magY);
                ctx.value = d < radius ? 1 - d / radius : 0;
                break;
              }

              case 'cursor_fx': {
                const rt = sprite.runtime, m = this.bus.mouse;
                const inside = m.x > -1e8 && m.y > -1e8;
                if (p.mode === 'cursor') {
                  rt._isCursor = true;
                  if (inside) {
                    const lag = Math.max(0, Math.min(0.95, parseFloat(p.lag) || 0));
                    if (rt._cx === undefined) { rt._cx = m.x; rt._cy = m.y; }
                    rt._cx += (m.x - rt._cx) * (1 - lag);
                    rt._cy += (m.y - rt._cy) * (1 - lag);
                    rt.x = rt._cx; rt.y = rt._cy;
                    this.bus.hideCursor = true;
                  }
                  // Hidden while the pointer is outside the canvas.
                  this.offsetProp(sprite, mod, 'opacity', inside ? 0 : -(sprite.opacity ?? 1));
                } else if (inside && Math.hypot(m.vx, m.vy) > 5 && this.bus.particles.length < 600) {
                  this.bus.particles.push({
                    x: m.x, y: m.y, vx: 0, vy: 0, color: p.color || '#e4e4e7',
                    size: Math.max(0.5, parseFloat(p.size) || 5), life: 1, maxLife: Math.max(0.05, parseFloat(p.lifetime) || 0.5)
                  });
                }
                break;
              }

              case 'property_binding': {
                const src = p.targetSpriteId ? this.doc.findSpriteById(p.targetSpriteId) : null;
                if (!src || src === sprite) break;
                const v = ModuleEngine.getProp(src, p.sourceProperty || 'x');
                if (!isFinite(v)) break;
                const f = parseFloat(p.factor);
                const out = v * (isFinite(f) ? f : 1) + (parseFloat(p.offset) || 0);
                ModuleEngine.setProp(sprite, p.targetProperty || 'x', out);
                ctx.value = out;
                break;
              }

              case 'condition_branch': {
                const rt = sprite.runtime;
                const v = this.readInput(p.inputSource || 'stack', p, sprite, ctx, clock);
                const th = parseFloat(p.threshold) || 0;
                let ok;
                switch (p.compare) {
                  case '>': ok = v > th; break;
                  case '<': ok = v < th; break;
                  case '<=': ok = v <= th; break;
                  case '==': ok = Math.abs(v - th) < 1e-9; break;
                  case '!=': ok = Math.abs(v - th) >= 1e-9; break;
                  default: ok = v >= th;
                }
                const key = '_if_' + mod.id;
                if (rt[key] !== ok) {
                  if (ok && p.signalTrue) this.bus.emitSignal(p.signalTrue, sprite.id, v);
                  if (!ok && rt[key] !== undefined && p.signalFalse) this.bus.emitSignal(p.signalFalse, sprite.id, v);
                  rt[key] = ok;
                }
                if (ok) { rt.isTriggered = true; }
                if (!ok && p.gateBelow !== false) ctx.gateOpen = false;
                ctx.value = ok ? 1 : 0;
                break;
              }

              case 'global_variable': {
                const vars = this.bus.vars, name = String(p.varName || 'var');
                if (!vars.has(name)) {
                  const iv = parseFloat(p.initialValue);
                  vars.set(name, isFinite(iv) ? iv : 0);
                }
                if (p.action && p.action !== 'read' && this.shouldFire(sprite, mod, p, 'fireOn')) {
                  const cur = Number(vars.get(name)) || 0;
                  const val = parseFloat(p.value);
                  const k = isFinite(val) ? val : 0;
                  if (p.action === 'set') vars.set(name, k);
                  else if (p.action === 'toggle') vars.set(name, cur ? 0 : 1);
                  else vars.set(name, cur + k);
                  this.bus.emitSignal('var_' + name, sprite.id, vars.get(name));
                }
                const value = Number(vars.get(name)) || 0;
                if (p.displayTemplate) {
                  const shown = Number.isInteger(value) ? String(value) : value.toFixed(2);
                  ModuleEngine.setText(sprite, String(p.displayTemplate).split('{value}').join(shown));
                }
                ctx.value = value;
                break;
              }

              case 'physics_body': {
                const rt = sprite.runtime;
                if (this.draggedSprite === sprite) {
                  // Held by a draggable module: remember the throw velocity.
                  const cap = 3000;
                  rt.vx = Math.max(-cap, Math.min(cap, this.bus.mouse.vx));
                  rt.vy = Math.max(-cap, Math.min(cap, this.bus.mouse.vy));
                  rt._px = rt.x; rt._py = rt.y;
                  break;
                }
                if (rt._px === undefined) { rt._px = rt.x; rt._py = rt.y; rt.vx = rt.vx || 0; rt.vy = rt.vy || 0; }
                const g = parseFloat(p.gravity);
                rt.vy += (isFinite(g) ? g : 900) * dt;
                rt._px += rt.vx * dt;
                rt._py += rt.vy * dt;
                if (p.collideEdges !== false) {
                  const hw = Math.abs(sprite.width * rt.scaleX) / 2, hh = Math.abs(sprite.height * rt.scaleY) / 2;
                  const W = this.doc.width || 800, H = this.doc.height || 600;
                  const bounce = Math.max(0, Math.min(1, parseFloat(p.bounce) || 0));
                  if (rt._py + hh > H) {
                    rt._py = H - hh;
                    rt.vy = Math.abs(rt.vy) < 40 ? 0 : -Math.abs(rt.vy) * bounce;
                    const fr = Math.max(0, Math.min(1, parseFloat(p.friction) || 0));
                    rt.vx *= Math.pow(1 - fr, dt * 60);
                    if (Math.abs(rt.vx) < 2) rt.vx = 0;
                  }
                  if (rt._py - hh < 0) { rt._py = hh; rt.vy = Math.abs(rt.vy) * bounce; }
                  if (rt._px - hw < 0) { rt._px = hw; rt.vx = Math.abs(rt.vx) * bounce; }
                  if (rt._px + hw > W) { rt._px = W - hw; rt.vx = -Math.abs(rt.vx) * bounce; }
                }
                rt.x = rt._px; rt.y = rt._py;
                ctx.value = Math.hypot(rt.vx, rt.vy);
                break;
              }

              case 'audio_reactive': {
                const rt = sprite.runtime;
                const src = p.source === 'document' ? 'document' : 'microphone';
                if (src === 'microphone') ModuleEngine.requestMicrophone();
                else ModuleEngine.audioContext();
                const raw = Math.min(1, ModuleEngine.audioLevel(src) * (parseFloat(p.sensitivity) || 1));
                const k = 1 - Math.max(0, Math.min(0.98, parseFloat(p.smoothing) || 0));
                rt._lvl = (rt._lvl || 0) + (raw - (rt._lvl || 0)) * k;
                const lo = parseFloat(p.minValue) || 0, hi = parseFloat(p.maxValue);
                const val = lo + ((isFinite(hi) ? hi : 1) - lo) * rt._lvl;
                const prop = p.property || 'scale';
                // Position properties move relative to the sprite's place.
                if (prop === 'x' || prop === 'y') this.offsetProp(sprite, mod, prop, val);
                else ModuleEngine.setProp(sprite, prop, val);
                ctx.value = rt._lvl;
                break;
              }

              case 'form_submit':
                if (this.shouldFire(sprite, mod, Object.assign({}, p, { trigger: 'click' }))) this.submitForm(sprite, layer, p);
                break;

              case 'custom_script':
                this.runScript(sprite, mod, p, ctx, clock, dt);
                break;

              case 'scene_transition': {
                if (!this.shouldFire(sprite, mod, p, 'fireOn')) break;
                const dur = Math.max(0.05, parseFloat(p.duration) || 0.6);
                if (p.action === 'url') {
                  this.navigateHyperlink(String(p.url || ''), '_blank');
                  break;
                }
                const tgt = p.targetSpriteId ? this.doc.findSpriteById(p.targetSpriteId) : null;
                if (!tgt) break;
                if (p.transition === 'fade') {
                  this.bus.fade = { start: this.bus.time, duration: dur };
                  this.queueNavigation(this.bus.time + dur / 2, tgt, { smooth: false });
                } else {
                  if (typeof this.onNavigateAnchor === 'function') this.onNavigateAnchor(tgt, { smooth: p.transition !== 'instant', duration: dur });
                }
                this.bus.emitSignal('scene_change', sprite.id, tgt.id);
                break;
              }

              case 'mouse_tilt_3d': {
                // 2D approximation of a card tilt: rotate toward the pointer and
                // squash the axis facing away (perspective foreshortening).
                const rt = sprite.runtime;
                const hw = Math.max(1, sprite.width / 2), hh = Math.max(1, sprite.height / 2);
                let nx = 0, ny = 0;
                if (rt.isHovered) {
                  nx = Math.max(-1, Math.min(1, (this.bus.mouse.x - rt.x) / hw));
                  ny = Math.max(-1, Math.min(1, (this.bus.mouse.y - rt.y) / hh));
                }
                const k = Math.min(1, dt * 10);
                rt._tnx = (rt._tnx || 0) + (nx - (rt._tnx || 0)) * k;
                rt._tny = (rt._tny || 0) + (ny - (rt._tny || 0)) * k;
                const maxTilt = parseFloat(p.maxTilt) || 20;
                const strength = 800 / Math.max(100, parseFloat(p.perspective) || 800);
                rt.tiltAngle = rt._tnx * rt._tny * maxTilt * 0.25 * strength;
                const squash = maxTilt / 300 * strength;
                rt.scaleX *= 1 - Math.abs(rt._tnx) * squash;
                rt.scaleY *= 1 - Math.abs(rt._tny) * squash;
                break;
              }

              // ---------------- Sensors ----------------
              case 'mouse_position': {
                const rt = sprite.runtime;
                const k = Math.max(0.01, Math.min(1, parseFloat(p.smoothFactor) || 0.15));
                const tx = this.bus.mouse.x, ty = this.bus.mouse.y;
                if (rt._mx === undefined) { rt._mx = tx; rt._my = ty; }
                rt._mx += (tx - rt._mx) * k;
                rt._my += (ty - rt._my) * k;
                const speed = Math.hypot(this.bus.mouse.vx, this.bus.mouse.vy);
                rt._mspeed = (rt._mspeed || 0) + (speed - (rt._mspeed || 0)) * k;
                const rel = p.coordinateMode !== 'absolute';
                rt.mouseX = rel ? rt._mx - rt.x : rt._mx;
                rt.mouseY = rel ? rt._my - rt.y : rt._my;
                p.outputX = rt.mouseX; p.outputY = rt.mouseY; p.outputSpeed = rt._mspeed;
                ctx.value = rt._mspeed;
                if (speed > 20 && p.signalName) this.bus.emitSignal(p.signalName, sprite.id, { x: rt.mouseX, y: rt.mouseY });
                break;
              }

              case 'scroll_wheel': {
                const rt = sprite.runtime;
                const lo = parseFloat(p.minVal) || 0;
                const hi = p.maxVal !== undefined ? parseFloat(p.maxVal) : 100;
                if (rt._wheel === undefined) rt._wheel = Math.max(lo, Math.min(hi, parseFloat(p.startVal) || lo));
                const dy = this.bus.scroll.deltaY || 0;
                if (dy && rt.isHovered) {
                  rt._wheel = Math.max(lo, Math.min(hi, rt._wheel - dy * 0.05 * (parseFloat(p.sensitivity) || 1)));
                  this.bus.emitSignal(dy < 0 ? 'wheel_up' : 'wheel_down', sprite.id, rt._wheel);
                }
                p.outputValue = rt._wheel;
                ctx.value = rt._wheel;
                break;
              }

              case 'collision_detector': {
                const rt = sprite.runtime;
                const box = sp => {
                  const w = Math.abs(sp.width * (sp.runtime.scaleX ?? sp.scaleX ?? 1)) / 2;
                  const h = Math.abs(sp.height * (sp.runtime.scaleY ?? sp.scaleY ?? 1)) / 2;
                  return { x: sp.runtime.x, y: sp.runtime.y, w, h };
                };
                let targets;
                if (p.targetSpriteId) targets = [this.doc.findSpriteById(p.targetSpriteId)].filter(Boolean);
                else if (p.targetLayerId) targets = (this.doc.getLayer(p.targetLayerId)?.sprites || []).slice();
                else targets = this.doc.layers.filter(l => l.visible).flatMap(l => l.sprites);
                const a = box(sprite);
                let hit = null;
                for (const t of targets) {
                  if (!t || t === sprite || !t.visible || t.type === 'screen_trigger' || t.runtime.visible === false) continue;
                  const b = box(t);
                  const ox = (a.w + b.w) - Math.abs(a.x - b.x);
                  const oy = (a.h + b.h) - Math.abs(a.y - b.y);
                  if (ox > 0 && oy > 0) { hit = { t, ox, oy, b }; break; }
                }
                if (hit) {
                  rt.isTriggered = true;
                  this.bus.activeTriggerTargets.add(sprite.id);
                  if (!rt._colliding) this.bus.emitSignal(p.signalName || 'collision', sprite.id, hit.t.id);
                  if (p.bounceBack !== false) {
                    if (hit.ox < hit.oy) {
                      rt.x += a.x < hit.b.x ? -hit.ox : hit.ox;
                      if (rt.vx) rt.vx = Math.abs(rt.vx) * (a.x < hit.b.x ? -1 : 1);
                    } else {
                      rt.y += a.y < hit.b.y ? -hit.oy : hit.oy;
                      if (rt.vy) rt.vy = Math.abs(rt.vy) * (a.y < hit.b.y ? -1 : 1);
                    }
                  }
                }
                rt._colliding = !!hit;
                break;
              }

              case 'viewport_visibility': {
                const rt = sprite.runtime;
                const top = this.bus.scroll?.scrollY || 0;
                const vh = this.doc.viewportHeight || this.doc.height || 900;
                const hh = Math.abs(sprite.height * (rt.scaleY || 1)) / 2;
                let visible = (rt.y + hh >= top) && (rt.y - hh <= top + vh);
                if (p.triggerOnce && rt._seenOnce) visible = true;
                if (visible && !rt._wasVisible) this.bus.emitSignal(p.signalName || 'visible', sprite.id);
                if (visible) { rt._seenOnce = true; rt.isTriggered = true; this.bus.activeTriggerTargets.add(sprite.id); }
                rt._wasVisible = visible;
                break;
              }

              case 'timer_interval': {
                const rt = sprite.runtime;
                const iv = Math.max(0.05, parseFloat(p.intervalSec) || 1);
                const t = p.autoStart === false ? clock : this.bus.time;
                const ticks = Math.floor(t / iv);
                if (rt._ticks === undefined) rt._ticks = p.autoStart === false ? 0 : ticks;
                if (ticks > rt._ticks) {
                  rt._ticks = ticks;
                  rt._tickCount = (rt._tickCount || 0) + 1;
                  this.bus.emitSignal(p.signalName || 'timer_tick', sprite.id, rt._tickCount);
                  rt.isTriggered = true;
                }
                ctx.value = rt._tickCount || 0;
                break;
              }

              // ---------------- Logic ----------------
              case 'distance_rope': {
                const rt = sprite.runtime;
                let tx = this.bus.mouse.x, ty = this.bus.mouse.y;
                const tgt = p.targetSpriteId ? this.doc.findSpriteById(p.targetSpriteId)
                  : (p.targetLayerId ? this.doc.getLayer(p.targetLayerId)?.primarySprite : null);
                if (tgt) { tx = tgt.runtime.x; ty = tgt.runtime.y; }
                const maxD = Math.max(0, parseFloat(p.maxDistance) || 0);
                const dx = rt.x - tx, dy = rt.y - ty;
                const d = Math.hypot(dx, dy);
                if (d > maxD && d > 0) {
                  rt.x = tx + dx / d * maxD;
                  rt.y = ty + dy / d * maxD;
                }
                ctx.value = Math.min(d, maxD);
                break;
              }

              case 'value_remapper': {
                const rt = sprite.runtime;
                let v = this.readInput(p.inputSource, p, sprite, ctx, clock);
                if (!isFinite(v)) v = 0;
                const inMin = parseFloat(p.inMin) || 0, inMax = parseFloat(p.inMax);
                const outMin = parseFloat(p.outMin) || 0, outMax = parseFloat(p.outMax);
                let t = (isFinite(inMax) && inMax !== inMin) ? (v - inMin) / (inMax - inMin) : 0;
                if (p.clamp !== false) t = Math.max(0, Math.min(1, t));
                const out = outMin + t * ((isFinite(outMax) ? outMax : 1) - outMin);
                p.outputResult = out;
                ctx.value = out;
                const prop = p.outputProperty || 'none';
                if (prop !== 'none') {
                  if (p.outputMode === 'offset') this.offsetProp(sprite, mod, prop, out);
                  else ModuleEngine.setProp(sprite, prop, out);
                }
                break;
              }

              case 'node_math': {
                const v = ctx.value, f = parseFloat(p.factor);
                const k = isFinite(f) ? f : 1;
                let r;
                switch (p.op) {
                  case 'add': r = v + k; break;
                  case 'subtract': r = v - k; break;
                  case 'divide': r = k !== 0 ? v / k : 0; break;
                  case 'power': r = Math.pow(v, k); break;
                  case 'min': r = Math.min(v, k); break;
                  case 'max': r = Math.max(v, k); break;
                  case 'clamp': r = Math.max(0, Math.min(k, v)); break;
                  case 'modulo': r = k !== 0 ? v % k : 0; break;
                  default: r = v * k;
                }
                ctx.value = r + (parseFloat(p.offset) || 0);
                p.outputResult = ctx.value;
                break;
              }

              case 'node_merge': {
                const w = parseFloat(p.weight);
                const k = isFinite(w) ? w : 1;
                if (p.blendMode === 'value') {
                  ctx.value *= k;
                } else {
                  // Scale the transform changes made by the modules above by `weight`.
                  const rt = sprite.runtime;
                  for (const key of ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity']) {
                    rt[key] = rest[key] + (rt[key] - rest[key]) * k;
                  }
                  rt.opacity = Math.max(0, Math.min(1, rt.opacity));
                }
                break;
              }

              // ---------------- Motion / timing ----------------
              case 'tween_interpolator': {
                const prop = p.property || 'x';
                const from = ModuleEngine.getProp(sprite, prop, true) ?? 0;
                const to = parseFloat(p.toValue);
                const prog = ModuleEngine.loopProgress(clock, parseFloat(p.duration) || 0, ctx.loopMode || 'once');
                const e = ModuleEngine.ease(ctx.easing || p.easing || 'easeOutCubic', prog);
                const val = from + ((isFinite(to) ? to : from) - from) * e;
                ModuleEngine.setProp(sprite, prop, val);
                ctx.value = val;
                break;
              }

              case 'duration_delay': {
                const delay = Math.max(0, parseFloat(p.delay) || 0);
                const dur = Math.max(0, parseFloat(p.duration) || 0);
                let t = clock;
                if (ctx.loopMode === 'infinite' && dur > 0) t = t % (delay + dur);
                else if (ctx.loopMode === 'pingpong' && dur > 0) { const c = delay + dur; const f = t % (2 * c); t = f > c ? 2 * c - f : f; }
                ctx.gateOpen = t >= delay && (dur === 0 || t <= delay + dur);
                break;
              }

              case 'stagger_domino': {
                const delay = Math.max(0, ctx.index) * Math.max(0, parseFloat(p.staggerDelay) || 0);
                ctx.gateOpen = clock >= delay;
                break;
              }

              case 'step_sequencer': {
                const rt = sprite.runtime;
                const n = Math.max(1, Math.round(parseFloat(p.stepCount) || 1));
                const iv = Math.max(0.05, parseFloat(p.stepInterval) || 0.5);
                const raw = Math.floor(clock / iv);
                let step;
                if ((ctx.loopMode || 'infinite') === 'once') step = Math.min(n - 1, raw);
                else if (ctx.loopMode === 'pingpong' && n > 1) { const f = raw % (2 * n - 2); step = f < n ? f : 2 * n - 2 - f; }
                else step = raw % n;
                if (step !== rt.step) {
                  rt.step = step;
                  this.bus.emitSignal((p.signalPrefix || 'step_') + step, sprite.id, step);
                }
                ctx.value = step;
                break;
              }

              case 'easing_presets':
                ctx.easing = p.curve || 'easeOutCubic';
                break;

              case 'loop_mode':
                ctx.loopMode = p.mode || 'infinite';
                break;

              // ---------------- Audio ----------------
              case 'synth_sfx':
                if (this.shouldFire(sprite, mod, p)) ModuleEngine.playSynth(p.sound || 'pop', p.volume !== undefined ? parseFloat(p.volume) : 0.6);
                break;

              case 'audio_clip': {
                if (!this.shouldFire(sprite, mod, p)) break;
                const url = String(p.audioUrl || '').trim();
                const ok = safeUrl(url) || /^data:audio\//i.test(url);
                if (!url || !ok || typeof Audio === 'undefined') break;
                const rt = sprite.runtime;
                if (!rt._audio || rt._audioSrc !== url) {
                  rt._audio = new Audio(url);
                  rt._audioSrc = url;
                  // Same-origin / data: audio is routed through the analyser so
                  // audio_reactive can follow it (cross-origin audio would be muted).
                  try {
                    const sameOrigin = /^data:/i.test(url) || new URL(url, location.href).origin === location.origin;
                    const ac = sameOrigin ? ModuleEngine.audioContext() : null;
                    if (ac) ac.createMediaElementSource(rt._audio).connect(ModuleEngine._master);
                  } catch (_) {}
                }
                ModuleEngine.resumeAudio();
                rt._audio.volume = Math.max(0, Math.min(1, p.volume !== undefined ? parseFloat(p.volume) : 0.8));
                rt._audio.loop = !!p.loop;
                try { rt._audio.currentTime = 0; } catch (_) {}
                const pr = rt._audio.play();
                if (pr && pr.catch) pr.catch(() => {});
                break;
              }

              case 'particle_emitter': {
                if (Math.random() < (p.rate || 10) * dt) {
                  this.bus.particles.push({
                    x: sprite.runtime.x, y: sprite.runtime.y,
                    vx: (Math.random() - 0.5) * (p.speed || 80),
                    vy: (Math.random() - 0.5) * (p.speed || 80),
                    color: p.particleColor || '#38bdf8',
                    size: 3 + Math.random() * 3,
                    life: 1.0, maxLife: p.lifetime || 0.8
                  });
                }
                break;
              }
            }
          }
        }
      }
    }

    isPointInside(wx, wy, sprite) {
      const rot = sprite.runtime && sprite.runtime.rotation !== undefined ? sprite.runtime.rotation : sprite.rotation;
      const rad = (-(rot || 0) * Math.PI) / 180;
      const dx = wx - sprite.runtime.x, dy = wy - sprite.runtime.y;
      const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ly = dx * Math.sin(rad) + dy * Math.cos(rad);
      const hw = (sprite.width * sprite.runtime.scaleX) / 2;
      const hh = (sprite.height * sprite.runtime.scaleY) / 2;
      return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
    }
  }

  // ==========================================================================
  // 9. Photoshop JS Exporter (Pure Vanilla HTML5 Canvas 2D)
  // ==========================================================================
  class PhotoshopJSExporter {
    // The exported player embeds the studio's own model and renderer classes
    // (Sprite, Layer, DocumentModel, PhotoshopCanvas) via their source text, so
    // the output is drawn by exactly the same code as the studio canvas:
    // shapes, paths, brush strokes, text and text_label modules, gradients,
    // images, filters, masks and timeline keyframes.
    static getRuntimeSource(withEngine = true) {
      const parts = [safeUrl, Sprite, Layer, Reflow, DocumentModel, PhotoshopCanvas];
      if (withEngine) parts.push(FormRuntime, ModuleEngine);
      let src = parts.map(c => PhotoshopJSExporter.compactSource(c.toString())).join('\n');
      if (!withEngine) {
        // Documents without interactive modules: a small stand-in with only the
        // hit-testing and link navigation the player needs.
        const P = ModuleEngine.prototype;
        const methods = [P.pickSprite, P.getClickLink, P.isPointInside, P.navigateHyperlink].map(f => f.toString()).join('\n');
        src += '\nclass ModuleEngine {\n' +
          'constructor(doc) { this.doc = doc; this.active = false; this.disabledModuleIds = null; this.draggedSprite = null; this.onNavigateAnchor = null;' +
          ' this.bus = { particles: [], fade: null, hideCursor: false, keyState: {}, scroll: {}, mouse: {} }; }\n' +
          'start() { this.active = true; }\nupdate() {}\nendDrag() {}\nwantsWheel() { return false; }\naddWheel() {}\nstatic resumeAudio() {}\n' +
          PhotoshopJSExporter.compactSource(methods) + '\n}';
      }
      return src;
    }

    // Runtime for the HTML/CSS website export: the studio's ModuleEngine drives
    // the exported DOM elements (one per sprite, matched by data-sid). Each
    // frame applies runtime transforms, opacity, colours, text and filters;
    // particles and the scene fade are drawn on an overlay canvas.
    // allowedScripts: code of the scripts that may run (studio previews);
    // null runs all of them (exports run their author's scripts).
    static webRuntimeScript(doc, disabledModuleIds, allowedScripts = null) {
      const allowed = jsonForScript(allowedScripts);
      const data = jsonForScript(doc.toJSON());
      const disabled = jsonForScript(disabledModuleIds ? [...disabledModuleIds] : []);
      const engineSrc = [safeUrl, Sprite, Layer, Reflow, DocumentModel, FormRuntime, ModuleEngine].map(c => PhotoshopJSExporter.compactSource(c.toString())).join('\n');
      const player = function () {
        const artboard = document.getElementById('webArtboard');
        if (!artboard) return;
        const model = new DocumentModel();
        model.loadFromData(DOC_DATA, false);
        model.selectedSpriteIds = new Set();
        const startView = (window.JSPenView && window.JSPenView.current) || 'desktop';
        model.setFrame(0);
        if (startView !== 'desktop' && model.hasView(startView)) model.switchView(startView);
        for (const l of model.layers) l.resetRuntime();
        const engine = new ModuleEngine(model);
        engine.disabledModuleIds = new Set(DISABLED_MODULE_IDS);
        if (ALLOWED_SCRIPTS) engine.scriptGate = code => ALLOWED_SCRIPTS.includes(code);
        engine.start();
        // Form inputs are part of the exported markup: bind them by data-sid.
        engine.forms = new FormRuntime(engine, {
          container: artboard,
          place: () => null,
          existing: sp => artboard.querySelector('[data-sid="' + CSS.escape(sp.id) + '"]')
        });

        // Rest position of each element = the sprite's values in the current view.
        const base = new Map();
        const captureBase = () => { base.clear(); for (const l of model.layers) for (const s of l.sprites) base.set(s.id, { x: s.x, y: s.y, opacity: s.opacity }); };
        captureBase();
        // The page script lays the elements out; the model follows it.
        let authored = model.captureGeometry(), authoredSize = { width: model.width, height: model.height };
        const followLayout = (layout) => {
          model.applyLayout(layout, authored);
          for (const [id, b] of base) {
            const box = layout.boxes[id];
            if (box) { b.x = box.x; b.y = box.y; }
          }
        };
        const unfollowLayout = () => {
          const boxes = Object.create(null);
          for (const [id, g] of authored) boxes[id] = { x: g.x, y: g.y, width: g.width, height: g.height, scaleX: g.scaleX, scaleY: g.scaleY };
          followLayout({ width: authoredSize.width, height: authoredSize.height, boxes });
          model.restoreTracks(authored);
        };
        if (window.JSPenView && window.JSPenView.layout) followLayout(window.JSPenView.layout);
        const cssFilter = sp => {
          const out = [];
          const srcs = [];
          if (sp.filters) srcs.push(sp.filters);
          for (const m of sp.modules || []) if (m.enabled !== false && m.showInRender !== false && m.type === 'photoshop_filter' && m.params) srcs.push(m.params);
          for (const f of srcs) {
            if (f.blur) out.push('blur(' + Math.max(0, f.blur) + 'px)');
            if (f.brightness !== undefined && f.brightness !== 100) out.push('brightness(' + Math.max(0, f.brightness) + '%)');
            if (f.contrast !== undefined && f.contrast !== 100) out.push('contrast(' + Math.max(0, f.contrast) + '%)');
            if (f.saturate !== undefined && f.saturate !== 100) out.push('saturate(' + Math.max(0, f.saturate) + '%)');
            if (f.grayscale) out.push('grayscale(' + Math.max(0, Math.min(100, f.grayscale)) + '%)');
            if (f.sepia) out.push('sepia(' + Math.max(0, Math.min(100, f.sepia)) + '%)');
            if (f.hueRotate) out.push('hue-rotate(' + f.hueRotate + 'deg)');
            if (f.invert) out.push('invert(' + Math.max(0, Math.min(100, f.invert)) + '%)');
            if (f.opacity !== undefined && f.opacity !== 100) out.push('opacity(' + Math.max(0, Math.min(100, f.opacity)) + '%)');
          }
          return out.join(' ');
        };
        const labelOf = sp => (sp.modules || []).find(m => m.type === 'text_label' && m.enabled !== false);
        const snapshot = sp => {
          const lbl = labelOf(sp);
          return { fill: sp.fill, stroke: sp.stroke, color: lbl ? lbl.params && lbl.params.color : sp.textColor,
            text: ModuleEngine.getText(sp), filter: cssFilter(sp) };
        };
        const transformOf = (sp, b) => {
          const rt = sp.runtime;
          return 'translate(' + (rt.x - b.x) + 'px,' + (rt.y - b.y) + 'px) rotate(' + (rt.rotation + (rt.tiltAngle || 0)) +
            'deg) scale(' + rt.scaleX + ',' + rt.scaleY + ')';
        };
        const items = [];
        for (const layer of model.layers) {
          for (const sp of layer.sprites) {
            const el = artboard.querySelector('[data-sid="' + CSS.escape(sp.id) + '"]');
            const b = base.get(sp.id);
            if (!el || !b) continue;
            const hasText = sp.type === 'text' || !!labelOf(sp) || !!sp.text;
            items.push({ sp, el, b, textEl: hasText && !el.querySelector('img,svg') ? el : null,
              snap: snapshot(sp), transform: transformOf(sp, b), opacity: null, hidden: false });
          }
        }

        // Overlay for particles and the scene fade.
        const old = document.getElementById('jspenFx');
        if (old) old.remove(); // a saved copy of this page may contain the previous overlay
        const fx = document.createElement('canvas');
        fx.id = 'jspenFx';
        fx.width = model.width; fx.height = model.height;
        fx.style.cssText = 'position:absolute;left:0;top:0;width:' + model.width + 'px;height:' + model.height + 'px;pointer-events:none;z-index:2147483000;';
        artboard.appendChild(fx);
        const fxCtx = fx.getContext('2d');
        let fxDirty = false;

        const scaleOf = r => (artboard.offsetWidth ? r.width / artboard.offsetWidth : 1);
        engine.onNavigateAnchor = (sp, opts) => {
          const r = artboard.getBoundingClientRect();
          window.scrollTo({ top: window.scrollY + r.top + (sp.y - sp.height / 2) * scaleOf(r), behavior: opts && opts.smooth === false ? 'auto' : 'smooth' });
        };

        const pointer = { mw: { x: -1e9, y: -1e9 }, ms: { x: 0, y: 0 }, isDown: false, clicked: false, press: null };
        const toDoc = e => {
          const r = artboard.getBoundingClientRect(), s = scaleOf(r) || 1;
          return { x: (e.clientX - r.left) / s, y: (e.clientY - r.top) / s, sx: e.clientX - r.left, sy: e.clientY - r.top };
        };
        window.addEventListener('pointermove', e => { const p = toDoc(e); pointer.mw = { x: p.x, y: p.y }; pointer.ms = { x: p.sx, y: p.sy }; });
        document.addEventListener('mouseleave', () => { if (!pointer.isDown) pointer.mw = { x: -1e9, y: -1e9 }; });
        artboard.addEventListener('pointerdown', e => {
          if (e.button !== 0) return;
          ModuleEngine.resumeAudio();
          const p = toDoc(e);
          pointer.mw = { x: p.x, y: p.y }; pointer.isDown = true; pointer.clicked = true; pointer.press = { x: p.x, y: p.y };
          const hit = engine.pickSprite(p.x, p.y);
          if (hit && (hit.modules || []).some(m => m.enabled !== false && m.type === 'draggable')) e.preventDefault();
        });
        window.addEventListener('pointerup', e => {
          pointer.isDown = false;
          const p = toDoc(e);
          pointer.mw = { x: p.x, y: p.y };
          engine.endDrag(p.x, p.y);
        });
        artboard.addEventListener('wheel', e => {
          const p = toDoc(e);
          if (engine.wantsWheel(p.x, p.y)) { e.preventDefault(); engine.addWheel(e.deltaY); }
        }, { passive: false });
        window.addEventListener('keydown', e => { engine.bus.keyState[e.code] = true; engine.bus.keyState[e.key] = true; });
        window.addEventListener('keyup', e => { delete engine.bus.keyState[e.code]; delete engine.bus.keyState[e.key]; });
        window.addEventListener('blur', () => { engine.bus.keyState = {}; pointer.isDown = false; });

        const hasKeyframes = model.layers.some(l => l.sprites.some(s => s.keyframes && Object.keys(s.keyframes).some(k => Array.isArray(s.keyframes[k]) && s.keyframes[k].length > 0)));

        // Elements driven by the runtime must not use the static CSS transition
        // (it would make every frame lag ~0.2s behind, e.g. while dragging).
        const own = it => { if (!it.owned) { it.el.style.transition = 'none'; it.owned = true; } };
        const apply = () => {
          for (const it of items) {
            const sp = it.sp, rt = sp.runtime, el = it.el;
            const t0 = transformOf(sp, it.b), o0 = Math.max(0, Math.min(1, rt.opacity)), s0 = snapshot(sp), p0 = it.snap;
            if (t0 !== it.transform || (o0 !== it.opacity && (it.opacity !== null || o0 !== (it.b.opacity ?? 1))) ||
                s0.fill !== p0.fill || s0.stroke !== p0.stroke || s0.color !== p0.color || s0.filter !== p0.filter) own(it);
            const t = t0;
            // important: responsive view rules use !important for positions
            if (t !== it.transform) { el.style.setProperty('transform', t, 'important'); it.transform = t; }
            const o = o0;
            if (o !== it.opacity) { if (it.opacity !== null || o !== (it.b.opacity ?? 1)) el.style.setProperty('opacity', String(o), 'important'); it.opacity = o; }
            const hidden = rt.visible === false || sp.visible === false;
            if (hidden !== it.hidden) { el.style.visibility = hidden ? 'hidden' : ''; it.hidden = hidden; }
            const s = s0, prev = p0;
            if (s.fill !== prev.fill) {
              if (sp.type === 'text') el.style.color = s.fill;
              else if (sp.fillType !== 'linear-gradient') el.style.background = s.fill;
            }
            if (s.stroke !== prev.stroke && sp.strokeWidth > 0) el.style.borderColor = s.stroke;
            if (s.color !== prev.color && s.color) el.style.color = s.color;
            if (s.text !== prev.text && it.textEl) it.textEl.textContent = s.text;
            if (s.filter !== prev.filter) el.style.filter = s.filter;
            it.snap = s;
          }
          artboard.style.cursor = engine.bus.hideCursor ? 'none' : '';
          const parts = engine.bus.particles, fade = engine.bus.fade;
          if (parts.length || fade || fxDirty) {
            fxCtx.clearRect(0, 0, fx.width, fx.height);
            for (const p of parts) {
              fxCtx.globalAlpha = Math.max(0, p.life);
              fxCtx.fillStyle = p.color;
              fxCtx.beginPath(); fxCtx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2); fxCtx.fill();
            }
            if (fade) {
              const t = Math.max(0, Math.min(1, (engine.bus.time - fade.start) / fade.duration));
              fxCtx.globalAlpha = 1 - Math.abs(2 * t - 1);
              fxCtx.fillStyle = '#000000';
              fxCtx.fillRect(0, 0, fx.width, fx.height);
            }
            fxCtx.globalAlpha = 1;
            fxDirty = parts.length > 0 || !!fade;
          }
        };

        let last = performance.now(), frameAcc = 0;
        const step = (dt) => {
          if (hasKeyframes && model.fps > 0) {
            frameAcc += dt;
            const iv = 1 / model.fps;
            while (frameAcc >= iv) { frameAcc -= iv; model.stepFrame(1); }
          }
          const r = artboard.getBoundingClientRect(), s = scaleOf(r) || 1;
          engine.bus.scroll.scrollY = Math.max(0, -r.top / s);
          model.viewportHeight = window.innerHeight / s;
          engine.update(dt, pointer.mw, pointer.ms, pointer.isDown, pointer.clicked, pointer.press);
          pointer.clicked = false;
          engine.forms.sync(model);
          apply();
        };
        // A new width: everything moves, nothing restarts.
        window.addEventListener('jspen-layout', e => {
          followLayout(e.detail);
          fx.width = model.width; fx.height = model.height;
          fx.style.width = model.width + 'px'; fx.style.height = model.height + 'px';
          for (const it of items) {
            it.transform = transformOf(it.sp, it.b);
            if (it.owned) it.el.style.setProperty('transform', it.transform, 'important');
            it.snap = snapshot(it.sp);
          }
        });
        // Responsive view changes (window resize / preview toolbar).
        window.addEventListener('jspen-view', e => {
          const v = e.detail;
          if (!model.hasView(v) && v !== 'desktop') return;
          // Never store a reflowed arrangement as a view's own layout.
          unfollowLayout();
          model.switchView(v);
          authored = model.captureGeometry(); authoredSize = { width: model.width, height: model.height };
          for (const l of model.layers) l.resetRuntime();
          captureBase();
          engine.start();
          for (const it of items) {
            it.b = base.get(it.sp.id) || it.b;
            it.el.style.transform = ''; it.el.style.opacity = ''; it.el.style.visibility = '';
            it.transform = transformOf(it.sp, it.b); it.opacity = null; it.hidden = false; it.owned = false;
            it.el.style.transition = '';
          }
        });

        // First frame right away so entrance animations start hidden (no flash).
        step(0);
        const loop = now => {
          const dt = Math.min((now - last) / 1000, 0.1);
          last = now;
          step(dt);
          requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
        window.JSPenWebRuntime = { model, engine };
      };
      const code = '(function () {\n  \'use strict\';\n  const DOC_DATA = ' + data + ';\n  const DISABLED_MODULE_IDS = ' + disabled + ';\n' +
        '  const ALLOWED_SCRIPTS = ' + allowed + ';\n' +
        engineSrc + '\n  (' + player.toString() + ')();\n})();';
      return code.replace(/<\/script/gi, '<\\/script');
    }

    // Does a document need the module engine at runtime? In the DOM website
    // export (forDom) plain click links are real <a> elements and need none.
    static needsEngine(doc, disabledModuleIds, forDom = false) {
      const dis = disabledModuleIds || new Set();
      const layers = doc.layers || [];
      const passive = m => m.type === 'text_label' || m.type === 'substance_mask' ||
        (forDom && m.type === 'hyperlink' && (m.params?.trigger || 'click') === 'click');
      return layers.some(l => (l.sprites || []).some(s => s.type === 'screen_trigger' || s.type === 'form_field' || (!forDom && !!s.linkUrl) ||
        (s.modules || []).some(m => m.enabled !== false && !passive(m) && !dis.has(m.id))));
    }

    static hasKeyframes(doc) {
      return (doc.layers || []).some(l => (l.sprites || []).some(s => s.keyframes &&
        Object.keys(s.keyframes).some(k => Array.isArray(s.keyframes[k]) && s.keyframes[k].length > 0)));
    }

    // Strip whole-line comments and indentation from embedded class sources
    // (never inside multi-line template literals).
    static compactSource(src) {
      const out = [];
      let inTemplate = false;
      for (const line of src.split('\n')) {
        const ticks = (line.replace(/\\`/g, '').match(/`/g) || []).length;
        if (inTemplate) {
          out.push(line);
        } else {
          const t = line.trim();
          if (t && !t.startsWith('//')) out.push(t);
        }
        if (ticks % 2 === 1) inTemplate = !inTemplate;
      }
      return out.join('\n');
    }

    // Text and links of a document for accessible / indexable fallback content.
    static fallbackItems(doc) {
      const items = [];
      for (const l of doc.layers || []) {
        if (l.visible === false) continue;
        for (const s of l.sprites || []) {
          if (s.visible === false || s.type === 'screen_trigger') continue;
          const lbl = (s.modules || []).find(m => m.type === 'text_label' && m.enabled !== false);
          const text = String((s.type !== 'text' && lbl ? lbl.params?.text : s.text) || '').trim();
          const link = (s.modules || []).find(m => m.type === 'hyperlink' && m.enabled !== false);
          const href = safeUrl((link ? link.params?.url : s.linkUrl) || '');
          if (!text && !href) continue;
          items.push({ y: s.y || 0, x: s.x || 0, text: text || s.name || href, href: href && !href.startsWith('#') ? href : '' });
        }
      }
      items.sort((a, b) => (a.y - b.y) || (a.x - b.x));
      return items.map(({ text, href }) => ({ text, href }));
    }


    // disabledModuleIds: modules disconnected from the Node Graph OUTPUT
    // (defaults to the studio's current node graph).
    static generateJS(doc, disabledModuleIds = undefined, allowedScripts = null) {
      const allowedData = jsonForScript(allowedScripts);
      const docData = jsonForScript(doc.toJSON(), 2);
      if (disabledModuleIds === undefined) {
        disabledModuleIds = (typeof window !== 'undefined' && window.jspenApp?.nodeEditor)
          ? window.jspenApp.nodeEditor.getDisabledModuleIds() : null;
      }
      const disabledData = jsonForScript(disabledModuleIds ? [...disabledModuleIds] : []);
      // Plain click links are handled by the small stand-in engine.
      const withEngine = PhotoshopJSExporter.needsEngine(doc.toJSON(), disabledModuleIds, true);
      const fallbackData = jsonForScript(PhotoshopJSExporter.fallbackItems(doc.toJSON()));
      return `/**
 * JSPen Studio - Exported Vanilla Canvas 2D Player
 * Uses the same rendering engine as the studio. No external dependencies.
 * Expects a <canvas id="viewportCanvas"> (or any <canvas>) on the page.
 */
(function () {
  'use strict';
  const DOC_DATA = ${docData};
  const DISABLED_MODULE_IDS = ${disabledData};
  const ALLOWED_SCRIPTS = ${allowedData};
  const FALLBACK = ${fallbackData};

  // ---- JSPen engine (identical to the studio) ----
${this.getRuntimeSource(withEngine)}

  // ---- Player ----
  class JSPenPlayerCanvas extends PhotoshopCanvas {
    centerArtboard() { this.panX = 0; this.panY = 0; this.zoom = 1; }

    drawSprite(ctx, sprite) {
      // Editor-only helpers are not part of the output.
      if (sprite.type === 'screen_trigger') return;
      super.drawSprite(ctx, sprite);
      // Images load asynchronously: redraw once they are ready.
      const img = sprite._imgObj;
      if (img && !img._jspenHooked) {
        img._jspenHooked = true;
        img.addEventListener('load', () => player.requestDraw());
      }
    }
  }

  const canvas = document.getElementById('viewportCanvas') || document.querySelector('canvas');
  if (!canvas) return;

  // Accessible / indexable fallback: the document's text and links inside the
  // canvas (exposed to screen readers, not painted).
  if (!canvas.firstElementChild && FALLBACK.length) {
    const box = document.createElement('div');
    for (const item of FALLBACK) {
      const el = document.createElement(item.href ? 'a' : 'p');
      el.textContent = item.text;
      if (item.href) el.href = item.href;
      box.appendChild(el);
    }
    canvas.appendChild(box);
  }
  if (!canvas.getAttribute('aria-label')) canvas.setAttribute('aria-label', DOC_DATA.name || 'JSPen');

  const model = new DocumentModel();
  model.loadFromData(DOC_DATA, false);
  model.selectedSpriteIds = new Set();

  const renderer = new JSPenPlayerCanvas(canvas, model);
  renderer.showRulers = false;
  const ctx = renderer.ctx;
  // Uploaded fonts: redraw (and re-wrap text) once they are loaded.
  PhotoshopCanvas.loadDocumentFonts(model.fonts, () => {
    for (const l of model.layers) for (const s of l.sprites) s._wrapCache = null;
    player.requestDraw();
  });

  const hasKeyframes = model.layers.some(l => l.sprites.some(s =>
    s.keyframes && Object.keys(s.keyframes).some(k => Array.isArray(s.keyframes[k]) && s.keyframes[k].length > 0)));

  // ---- Interactions: the studio's module engine ----
  const engine = new ModuleEngine(model);
  engine.disabledModuleIds = new Set(DISABLED_MODULE_IDS);
  if (ALLOWED_SCRIPTS) engine.scriptGate = code => ALLOWED_SCRIPTS.includes(code);
  const hasModules = model.layers.some(l => l.sprites.some(s => s.type === 'screen_trigger' || s.type === 'form_field' ||
    (s.modules || []).some(m => m.enabled !== false && m.type !== 'text_label' && !engine.disabledModuleIds.has(m.id))));
  const interactive = hasModules || model.layers.some(l => l.sprites.some(s => s.linkUrl));
  renderer.moduleEngine = engine;
  renderer.mode = 'preview';
  engine.start();

  // Form fields: real inputs placed over the canvas.
  if (typeof FormRuntime !== 'undefined' && model.layers.some(l => l.sprites.some(s => s.type === 'form_field'))) {
    const holder = canvas.parentElement || document.body;
    if (getComputedStyle(holder).position === 'static') holder.style.position = 'relative';
    engine.forms = new FormRuntime(engine, {
      container: holder,
      place: (sp) => {
        const rt = sp.runtime;
        if (rt.visible === false) return null;
        const cr = canvas.getBoundingClientRect(), hr = holder.getBoundingClientRect();
        const k = cr.width / model.width;
        const w = sp.width * rt.scaleX * k, h = sp.height * rt.scaleY * k;
        return { x: cr.left - hr.left + holder.scrollLeft + rt.x * k - w / 2, y: cr.top - hr.top + holder.scrollTop + rt.y * k - h / 2, w, h, scale: k };
      }
    });
  }

  // Document coordinates of a pointer event (the canvas may be scaled by CSS).
  const toDoc = (e) => {
    const r = canvas.getBoundingClientRect();
    const sx = r.width ? model.width / r.width : 1;
    const sy = r.height ? model.height / r.height : 1;
    return { x: (e.clientX - r.left) * sx, y: (e.clientY - r.top) * sy, sx: e.clientX - r.left, sy: e.clientY - r.top };
  };
  const pointer = { mw: { x: -1e9, y: -1e9 }, ms: { x: 0, y: 0 }, isDown: false, clicked: false, downAt: null };

  // #anchor links scroll the page to the target sprite.
  engine.onNavigateAnchor = (sp, opts = { smooth: true }) => {
    const r = canvas.getBoundingClientRect();
    const scale = r.height / model.height;
    window.scrollTo({ top: window.scrollY + r.top + (sp.y - sp.height / 2) * scale, behavior: opts.smooth === false ? 'auto' : 'smooth' });
  };

  if (interactive) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointermove', e => {
      const p = toDoc(e);
      pointer.mw = { x: p.x, y: p.y }; pointer.ms = { x: p.sx, y: p.sy };
      const link = engine.getClickLink(engine.pickSprite(p.x, p.y));
      canvas.style.cursor = engine.bus.hideCursor ? 'none' : (link ? 'pointer' : (engine.draggedSprite ? 'grabbing' : 'default'));
    });
    canvas.addEventListener('pointerdown', e => {
      if (e.button !== 0) return;
      ModuleEngine.resumeAudio();
      const p = toDoc(e);
      pointer.mw = { x: p.x, y: p.y }; pointer.ms = { x: p.sx, y: p.sy };
      pointer.isDown = true; pointer.clicked = true; pointer.downAt = { x: p.x, y: p.y }; pointer.press = { x: p.x, y: p.y };
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    });
    const release = () => { pointer.isDown = false; };
    canvas.addEventListener('pointerup', e => {
      release();
      // Treat as a click only when the pointer did not travel (not a drag).
      const p = toDoc(e);
      pointer.mw = { x: p.x, y: p.y };
      engine.endDrag(p.x, p.y);
      const d = pointer.downAt;
      pointer.downAt = null;
      if (!d || Math.hypot(p.x - d.x, p.y - d.y) > 6) return;
      const link = engine.getClickLink(engine.pickSprite(p.x, p.y));
      if (link) engine.navigateHyperlink(link.href, link.target);
    });
    canvas.addEventListener('pointercancel', release);
    canvas.addEventListener('wheel', e => {
      const p = toDoc(e);
      if (engine.wantsWheel(p.x, p.y)) { e.preventDefault(); engine.addWheel(e.deltaY); }
    }, { passive: false });
    canvas.addEventListener('pointerleave', () => { if (!pointer.isDown) pointer.mw = { x: -1e9, y: -1e9 }; });
    window.addEventListener('keydown', e => { engine.bus.keyState[e.code] = true; engine.bus.keyState[e.key] = true; });
    window.addEventListener('keyup', e => { delete engine.bus.keyState[e.code]; delete engine.bus.keyState[e.key]; });
    window.addEventListener('blur', () => { engine.bus.keyState = {}; pointer.isDown = false; });
  }

  const player = {
    dirty: true,
    requestDraw() { this.dirty = true; },
    resize() {
      const dpr = Math.max(1, window.devicePixelRatio || 1);
      canvas.width = Math.round(model.width * dpr);
      canvas.height = Math.round(model.height * dpr);
      canvas.style.width = model.width + 'px';
      canvas.style.aspectRatio = model.width + ' / ' + model.height;
      this.dpr = dpr;
      this.dirty = true;
    },
    draw() {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      if (!model.transparentBackground) {
        ctx.fillStyle = model.backgroundColor;
        ctx.fillRect(0, 0, model.width, model.height);
      }
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, model.width, model.height);
      ctx.clip();
      for (const layer of model.layers) {
        if (layer.visible) renderer.drawLayer(ctx, layer);
      }
      renderer.drawParticles(ctx);
      renderer.drawScreenFade(ctx);
      ctx.restore();
      this.dirty = false;
    }
  };

  // Responsive views: pick the layout for the available width, then reflow it.
  const availableWidth = () => {
    const box = canvas.parentElement;
    if (!box || !box.clientWidth) return window.innerWidth;
    const css = getComputedStyle(box);
    return Math.max(50, box.clientWidth - (parseFloat(css.paddingLeft) || 0) - (parseFloat(css.paddingRight) || 0));
  };
  const pickView = () => {
    const w = availableWidth();
    if (model.hasView('mobile') && w <= 600) return 'mobile';
    if (model.hasView('tablet') && w <= 1024) return 'tablet';
    return 'desktop';
  };
  let source = null, shownWidth = 0;
  const useView = (v) => {
    if (v === (model.activeView || 'desktop')) return false;
    if (source) {
      // Never store a reflowed arrangement as a view's own layout.
      model.applyLayout(source.flow.layout(source.width), source.geometry);
      model.restoreTracks(source.geometry);
      source = null;
    }
    model.switchView(v);
    for (const l of model.layers) l.resetRuntime();
    if (engine.active) engine.start();
    return true;
  };
  const fitWidth = () => {
    const changed = useView(pickView());
    if (!source) {
      source = { design: Reflow.describe(model, PhotoshopCanvas.fontStack), geometry: model.captureGeometry(), width: model.width };
      source.flow = new Reflow(source.design);
      shownWidth = 0;
    }
    const w = Math.round(availableWidth());
    const moved = w !== shownWidth;
    if (moved) {
      shownWidth = w;
      model.applyLayout(source.flow.layout(w), source.geometry);
    }
    if (changed || moved || Math.max(1, window.devicePixelRatio || 1) !== player.dpr) player.resize();
  };
  model.setFrame(0);
  useView(pickView());
  for (const l of model.layers) l.resetRuntime();
  fitWidth();
  window.addEventListener('resize', fitWidth);
  if (typeof ResizeObserver !== 'undefined' && canvas.parentElement) {
    new ResizeObserver(() => requestAnimationFrame(fitWidth)).observe(canvas.parentElement);
  }
  // Text is measured: lay out again once web fonts have arrived.
  if (document.fonts && document.fonts.addEventListener) {
    document.fonts.addEventListener('loadingdone', () => {
      if (!source) return;
      source.flow = new Reflow(source.design);
      shownWidth = 0;
      fitWidth();
    });
  }

  let last = performance.now();
  let frameAcc = 0;
  function loop(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    if (hasKeyframes && model.fps > 0) {
      frameAcc += dt;
      const interval = 1 / model.fps;
      while (frameAcc >= interval) {
        frameAcc -= interval;
        model.stepFrame(1);
        player.dirty = true;
      }
    }
    if (hasModules) {
      // Scroll position of the canvas inside the page, in document units.
      const r = canvas.getBoundingClientRect();
      const scale = r.height ? model.height / r.height : 1;
      engine.bus.scroll.scrollY = Math.max(0, -r.top * scale);
      model.viewportHeight = window.innerHeight * scale;
      engine.update(dt, pointer.mw, pointer.ms, pointer.isDown, pointer.clicked, pointer.press);
      pointer.clicked = false;
      if (engine.forms) engine.forms.sync(model);
      if (engine.bus.hideCursor) canvas.style.cursor = 'none';
      player.dirty = true;
    }
    if (player.dirty) player.draw();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
`;
    }

    static generateHTML(doc, allowedScripts = null) {
      const jsCode = this.generateJS(doc, undefined, allowedScripts);
      return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.name || 'JSPen Output')}</title>
  <style>
    html, body { margin: 0; min-height: 100%; background: #000; }
    /* Always a scrollbar: its appearing must not change the width to lay out for. */
    body { display: flex; align-items: flex-start; justify-content: center; overflow-x: auto; overflow-y: scroll; }
    canvas { display: block; max-width: 100%; height: auto; letter-spacing: normal; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
  </style>
</head>
<body>
  <canvas id="viewportCanvas" aria-label="${escapeHtml(doc.name || 'JSPen')}">${PhotoshopJSExporter.fallbackItems(doc.toJSON()).map(i => i.href
    ? `<a href="${escapeHtml(i.href)}">${escapeHtml(i.text)}</a>`
    : `<p>${escapeHtml(i.text)}</p>`).join('')}</canvas>
  <script>${jsCode.replace(/<\/script/gi, '<\\/script')}<\/script>
</body>
</html>`;
    }
  }

  // ==========================================================================
  // 10. Toolbox & Option Bar UI
  // ==========================================================================
  class ToolboxUI {
    constructor(el, tools, onSelect) {
      this.el = el;
      this.tools = tools;
      this.onSelect = onSelect;
      this.render();
    }

    render() {
      const t = this.tools.activeTool;
      this.el.innerHTML = `
        <div class="ps-tools">
          <button class="ps-tool-btn ${t==='move'?'active':''}" data-t="move" title="이동 도구 (V)"><span class="ps-tool-icon">↖</span></button>
          <button class="ps-tool-btn ${t==='direct'?'active':''}" data-t="direct" title="직접 선택 (A)"><span class="ps-tool-icon">☩</span></button>
          <div class="ps-tool-sep"></div>
          <button class="ps-tool-btn ${t==='curve'?'active':''}" data-t="curve" title="베지어 곡선 도구 (C)"><span class="ps-tool-icon" style="font-weight:900;">⤹</span></button>
          <button class="ps-tool-btn ${t==='pen'?'active':''}" data-t="pen" title="펜 도구 (P)"><span class="ps-tool-icon">✒</span></button>
          <button class="ps-tool-btn ${t==='brush'?'active':''}" data-t="brush" title="브러시 도구 (B)"><span class="ps-tool-icon">✎</span></button>
          <button class="ps-tool-btn ${t==='gradient'?'active':''}" data-t="gradient" title="그라데이션 도구 (G)"><span class="ps-tool-icon">▨</span></button>
          <button class="ps-tool-btn ${t==='bucket'?'active':''}" data-t="bucket" title="페인트 통 / 채우기 (K)"><span class="ps-tool-icon">◩</span></button>
          <div class="ps-tool-sep"></div>
          <button class="ps-tool-btn ${t==='shape'?'active':''}" data-t="shape" title="도형 도구 (U)"><span class="ps-tool-icon">▭</span></button>
          <button class="ps-tool-btn ${t==='text'?'active':''}" data-t="text" title="문자 도구 (T)"><span class="ps-tool-icon" style="font-weight:700;">T</span></button>
          <button class="ps-tool-btn ${t==='eyedropper'?'active':''}" data-t="eyedropper" title="스포이드 (I)"><span class="ps-tool-icon">⌖</span></button>
          <div class="ps-tool-sep"></div>
          <button class="ps-tool-btn ${t==='hand'?'active':''}" data-t="hand" title="손 도구 (Space)"><span class="ps-tool-icon" style="font-size:10px;font-weight:700;">PAN</span></button>
          <button class="ps-tool-btn ${t==='zoom'?'active':''}" data-t="zoom" title="돋보기 (Z - 좌클릭 확대 / 우클릭 축소 / Alt클릭 초기화)"><span class="ps-tool-icon">⌕</span></button>
        </div>
        <div class="ps-color-swatches">
          <button class="ps-color-reset" id="btnResetCol" title="리셋 (D)">◲</button>
          <button class="ps-color-swap" id="btnSwapCol" title="스왑 (X)">⇄</button>
          <div class="ps-swatch-box">
            <input type="color" class="ps-swatch ps-swatch-fg" id="colFg" value="${escapeHtml(this.tools.doc.foregroundColor)}">
            <input type="color" class="ps-swatch ps-swatch-bg" id="colBg" value="${escapeHtml(this.tools.doc.backgroundColorSecondary)}">
          </div>
        </div>
      `;

      this.el.querySelectorAll('.ps-tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          this.tools.setTool(btn.dataset.t);
          this.render();
        });
      });

      this.el.querySelector('#colFg')?.addEventListener('input', e => {
        this.tools.doc.foregroundColor = e.target.value;
        this.onSelect();
      });
      this.el.querySelector('#colBg')?.addEventListener('input', e => {
        this.tools.doc.backgroundColorSecondary = e.target.value;
        this.onSelect();
      });
      this.el.querySelector('#btnResetCol')?.addEventListener('click', () => {
        this.tools.doc.foregroundColor = '#38bdf8';
        this.tools.doc.backgroundColorSecondary = '#ffffff';
        this.render();
        this.onSelect();
      });
      this.el.querySelector('#btnSwapCol')?.addEventListener('click', () => {
        const tmp = this.tools.doc.foregroundColor;
        this.tools.doc.foregroundColor = this.tools.doc.backgroundColorSecondary;
        this.tools.doc.backgroundColorSecondary = tmp;
        this.render();
        this.onSelect();
      });
    }
  }

  class ToolOptionBarUI {
    constructor(el, tools, onUpdate) {
      this.el = el;
      this.tools = tools;
      this.onUpdate = onUpdate;
      this.render();
    }

    render() {
      const t = this.tools.activeTool;
      let html = `
        <div class="ps-option-group"><span class="ps-option-title">${this.getToolName(t)}</span></div>
        <!-- Mode Switcher & Quick Controls -->
        <div class="ps-option-group" style="border-left:1px solid var(--ps-border);padding-left:10px;margin-left:4px;display:flex;align-items:center;gap:6px;">
          <button class="btn btn-primary btn-sm" id="btnOptNodeMode" style="height:24px;font-size:11px;padding:2px 10px;display:flex;align-items:center;gap:5px;font-weight:600;" title="모듈 노드 모드 / 스튜디오 전환 (Shift+Tab)">
            ${window.jspenApp?.isNodeMode ? '스튜디오로 복귀 (Shift+Tab)' : '모듈 노드 모드 (Shift+Tab)'}
          </button>
          <button class="btn btn-secondary btn-sm" id="btnOptWebPreview" style="height:24px;font-size:11px;padding:2px 8px;color:#e4e4e7;border-color:#e4e4e7;display:flex;align-items:center;gap:4px;" title="새 창에서 실시간 웹 미리보기 (Alt+W / Ctrl+Space)">
            웹 미리보기
          </button>
        </div>
      `;

      if (t === 'brush') {
        html += `
          <div class="ps-option-group">
            <label class="ps-option-label">두께:</label>
            <input type="range" class="ps-slider" id="optBrushSize" min="1" max="40" value="${escapeHtml(this.tools.brushSize)}">
            <span class="ps-val-tag" id="valBrushSize">${escapeHtml(this.tools.brushSize)}px</span>
          </div>
          <div class="ps-stabilizer-group">
            <button class="ps-stabilizer-btn ${this.tools.brushStabilize ? 'active' : ''}" id="btnToggleStab">
              ${this.tools.brushStabilize ? '✓ 곡선 보정 ON' : '곡선 보정 OFF'}
            </button>
          </div>
        `;
      } else if (t === 'curve' || t === 'pen') {
        html += `
          <div class="ps-option-group">
            <button class="btn btn-secondary btn-sm" id="btnFinishOpenPath" title="현재 곡선을 열린 상태로 완료 (Enter / Esc)">열린 패스 완료</button>
            <button class="btn btn-secondary btn-sm" id="btnFinishClosedPath" title="첫 점과 연결하여 닫힌 도형으로 완료">닫힌 도형 완료</button>
          </div>
        `;
      } else if (t === 'gradient') {
        html += `
          <div class="ps-option-group">
            <span class="ps-option-label">스프라이트를 드래그하여 전경/배경 그라데이션 적용</span>
          </div>
        `;
      } else if (t === 'bucket') {
        html += `
          <div class="ps-option-group">
            <span class="ps-option-label">클릭한 스프라이트에 전경색(${escapeHtml(this.tools.doc.foregroundColor)}) 채우기</span>
          </div>
        `;
      } else if (t === 'shape') {
        html += `
          <div class="ps-option-group">
            <label class="ps-option-label">도형 유형:</label>
            <select class="ps-select" id="optShapeType">
              <option value="rect" ${this.tools.activeShapeType === 'rect' ? 'selected' : ''}>직사각형</option>
              <option value="bevel_rect" ${this.tools.activeShapeType === 'bevel_rect' ? 'selected' : ''}>베벨(모따기) 사각형</option>
              <option value="circle" ${this.tools.activeShapeType === 'circle' ? 'selected' : ''}>원형 / 타원</option>
              <option value="star" ${this.tools.activeShapeType === 'star' ? 'selected' : ''}>별(Star) 벡터 도형</option>
            </select>
          </div>
        `;
      } else if (t === 'zoom') {
        html += `
          <div class="ps-option-group">
            <span class="ps-option-label">배율: ${Math.round(this.tools.renderer.zoom * 100)}%</span>
            <button class="btn btn-secondary btn-sm" id="btnZoomReset">100% 리셋 (Alt+클릭)</button>
          </div>
        `;
      }

      this.el.innerHTML = html;

      this.el.querySelector('#optBrushSize')?.addEventListener('input', e => {
        this.tools.brushSize = Number(e.target.value);
        this.el.querySelector('#valBrushSize').textContent = `${escapeHtml(this.tools.brushSize)}px`;
      });
      this.el.querySelector('#btnToggleStab')?.addEventListener('click', () => {
        this.tools.brushStabilize = !this.tools.brushStabilize;
        this.render();
      });
      this.el.querySelector('#optShapeType')?.addEventListener('change', e => {
        this.tools.activeShapeType = e.target.value;
      });

      this.el.querySelector('#btnFinishOpenPath')?.addEventListener('click', () => {
        if (this.tools.activeTool === 'curve') this.tools.commitCurvePath(false);
        else if (this.tools.activeTool === 'pen') this.tools.commitPenPath(false);
        if (this.onUpdate) this.onUpdate();
      });

      this.el.querySelector('#btnFinishClosedPath')?.addEventListener('click', () => {
        if (this.tools.activeTool === 'curve') this.tools.commitCurvePath(true);
        else if (this.tools.activeTool === 'pen') this.tools.commitPenPath(true);
        if (this.onUpdate) this.onUpdate();
      });
      this.el.querySelector('#btnZoomReset')?.addEventListener('click', () => {
        this.tools.renderer.zoom = 1.0;
        this.tools.renderer.centerArtboard();
        this.onUpdate();
        this.render();
      });

      // Quick Mode Switcher & Web Preview Controls Event Handlers
      this.el.querySelector('#btnOptNodeMode')?.addEventListener('click', () => {
        if (window.jspenApp?.toggleNodeMode) {
          window.jspenApp.toggleNodeMode();
        }
      });
      this.el.querySelector('#btnOptWebPreview')?.addEventListener('click', () => {
        if (window.jspenApp?.openWebPreviewWindow) {
          window.jspenApp.openWebPreviewWindow();
        }
      });
    }

    getToolName(t) {
      const map = {
        move: '이동 도구 (V)', direct: '직접 선택 도구 (A)', curve: '베지어 곡선 도구 (C)',
        pen: '펜 도구 (P)', brush: '브러시 도구 (B)', shape: '도형 도구 (U)',
        text: '문자 도구 (T)', eyedropper: '스포이드 도구 (I)', hand: '손 도구 (Space)', zoom: '돋보기 도구 (Z)'
      };
      return map[t] || '도구 옵션';
    }
  }

  // ==========================================================================
  // 11. Layers Panel UI (Hierarchical Layers & Sprites with Drag & Drop)
  // ==========================================================================
  // ==========================================================================
  // 13. Layers Panel UI (Fabric Sleek Styling, Single-Bind Delegation)
  // ==========================================================================
  class LayersPanelUI {
    constructor(el, doc, callbacks) {
      this.el = el;
      this.doc = doc;
      this.cb = callbacks;
      this.activeCategory = 'all';
      this.renamingId = null;
      this.dragInfo = null;

      this.initEventsOnce();
      this.render();
    }

    startRenameSelected() {
      const target = this.doc.getSelectedSprite() || this.doc.getSelectedLayer();
      if (target) {
        this.renamingId = target.id;
        this.render();
      }
    }

    render() {
      const reversedLayers = [...this.doc.layers].reverse();
      this.el.innerHTML = `
        <div class="ps-dock-header krita-docker-titlebar">
          <span class="ps-dock-title">레이어 (Layers)</span>
          <div class="ps-dock-tools">
            <button class="ps-dock-tool-btn" id="btnNewLayer" title="새 레이어 생성">+ 레이어</button>
            <button class="krita-action-btn" data-docker-act="toggle-collapse" title="접기/펼치기">▼</button>
            <button class="krita-action-btn" data-docker-act="toggle-float" title="창 분리(Float) / 도킹(Dock)">⧉</button>
          </div>
        </div>

        <div class="ps-layer-list">
          ${reversedLayers.length === 0 ? '<div class="ps-empty-layers">레이어가 없습니다. 상단 + 레이어를 클릭하세요.</div>' : reversedLayers.map(l => `
            <div class="ps-layer-group ${l.id === this.doc.selectedLayerId ? 'selected' : ''}" data-layer-id="${escapeHtml(l.id)}">
              <!-- Layer Container Row (Entire row clickable to select layer) -->
              <div class="ps-layer-row ${l.id === this.doc.selectedLayerId ? 'selected' : ''}" data-act="select-layer" data-layer-id="${escapeHtml(l.id)}" draggable="true">
                <button class="ps-layer-fold-btn" data-act="fold-layer" title="접기/펼치기">${l.expanded ? '▼' : '▶'}</button>
                <button class="ps-layer-vis-btn ${l.visible ? '' : 'muted'}" data-act="vis-layer" title="레이어 가시성">${l.visible ? '●' : '○'}</button>
                <div class="ps-layer-color-tag"></div>

                ${this.renamingId === l.id ? `
                  <input type="text" class="ps-layer-title-input" value="${escapeHtml(l.name)}" autofocus>
                ` : `
                  <span class="ps-layer-title" data-act="select-layer" title="더블 클릭하여 이름 변경">${escapeHtml(l.name)}</span>
                `}

                <span class="ps-layer-count-badge">${escapeHtml(l.sprites.length)}개</span>
                <button class="ps-btn-layer-add-sp" data-act="add-child-sprite" title="이 레이어 안에 새 스프라이트 생성">+</button>
                <button class="ps-btn-layer-add-sp" data-act="add-screen-trigger" title="화면 트리거 생성" style="background:#1e293b;border-color:#e4e4e7;color:#e4e4e7;">⚡</button>
                <button class="ps-btn-add-module ${(l.modules && l.modules.length > 0) ? 'has-modules' : ''}" data-act="add-layer-mod" title="레이어 모듈 추가">+fx</button>
                <button class="ps-layer-fold-btn" data-act="rename-item" title="이름 변경" style="font-size:10px;">✎</button>
                <button class="ps-btn-del-item" data-act="delete-layer" title="레이어 삭제">✕</button>
              </div>

              <!-- Child Sprites (Clearly Nested in Fabric Tree Structure) -->
              ${l.expanded ? `
                <div class="ps-layer-sub-sprites">
                  ${l.sprites.length === 0 ? '<div style="font-size:10px;color:#71717a;padding:2px 4px;">스프라이트 없음</div>' : [...l.sprites].reverse().map(s => {
                    const hasMods = s.modules && s.modules.length > 0;
                    const isFolded = s.collapsed === true;
                    return `
                    <div class="ps-sprite-item-wrap">
                      <div class="ps-sprite-sub-item ${s.id === this.doc.selectedSpriteId ? 'selected' : (this.doc.selectedSpriteIds && this.doc.selectedSpriteIds.has(s.id) ? 'multi-selected' : '')}" data-act="select-sprite" data-sprite-id="${escapeHtml(s.id)}" data-layer-id="${escapeHtml(l.id)}" draggable="true">
                        <button class="ps-sp-fold-btn" data-act="toggle-sprite-fold" title="모듈 접기/펼치기" style="${hasMods ? '' : 'visibility:hidden;'}">
                          ${isFolded ? '▶' : '▼'}
                        </button>
                        <button class="ps-layer-vis-btn ${s.visible ? '' : 'muted'}" data-act="vis-sprite" title="스프라이트 가시성">${s.visible ? '●' : '○'}</button>
                        ${(s.isMask || (s.maskMode && s.maskMode !== 'none')) ? '<span title="클리핑 마스크 적용됨" style="color:#a855f7;font-weight:bold;margin-right:2px;font-size:12px;">↳</span>' : ''}
                        <span class="ps-sp-icon">${s.type === 'rect' ? '▭' : (s.type === 'circle' ? '○' : (s.type === 'text' ? 'T' : (s.type === 'path' ? '⟿' : '✎')))}</span>
                        
                        ${this.renamingId === s.id ? `
                          <input type="text" class="ps-layer-title-input" value="${escapeHtml(s.name)}" autofocus>
                        ` : `
                          <span class="ps-sprite-title" data-act="select-sprite" title="더블 클릭하여 이름 변경">${escapeHtml(s.name)}</span>
                        `}

                        <button class="ps-sp-link-btn ${s.linkGroup ? 'active' : ''}" data-act="toggle-link" title="${s.linkGroup ? '스프라이트 링크 해제 (현재 그룹: ' + escapeHtml(s.linkGroup) + ')' : '다른 스프라이트와 링크하기'}">
                          ${s.linkGroup ? `[LINK]${escapeHtml(s.linkGroup)}` : '[LINK]'}
                        </button>

                        <button class="ps-btn-add-module ${hasMods ? 'has-modules' : ''}" data-act="add-sprite-mod" title="모듈 추가">
                          +fx ${hasMods ? `<span class="mod-count">${escapeHtml(s.modules.length)}</span>` : ''}
                        </button>
                        <button class="ps-layer-fold-btn" data-act="rename-item" title="이름 변경" style="font-size:10px;">✎</button>
                        <button class="ps-btn-del-item" data-act="delete-sprite" title="스프라이트 삭제">✕</button>
                      </div>

                      <!-- Sub-Modules nested under sprite like layers inside folder -->
                      ${(hasMods && !isFolded) ? `
                        <div class="ps-layer-sub-modules">
                          ${s.modules.map((m, mIdx) => `
                            <div class="ps-layer-module-row ${m.id === this.doc.selectedModuleId ? 'selected-mod' : ''}" data-mod-id="${escapeHtml(m.id)}" data-sprite-id="${escapeHtml(s.id)}" data-mod-idx="${mIdx}" draggable="true">
                              <span class="mod-indent">↳</span>
                              <span class="mod-badge">${escapeHtml(MODULE_REGISTRY[m.type]?.icon || 'MOD')}</span>
                              <span class="mod-name" data-act="select-mod" title="클릭하여 모듈 설정">${escapeHtml(m.name)}</span>
                              <span class="mod-cond mod-cond-${escapeHtml((m.params && m.params.condition) || 'always')}" title="${escapeHtml(InspectorPanelUI.conditionSummary(m))}">${escapeHtml(InspectorPanelUI.conditionShort(m))}</span>
                              <button class="mod-toggle ${m.enabled ? 'active' : ''}" data-act="toggle-mod" title="모듈 활성/비활성">${m.enabled ? 'ON' : 'OFF'}</button>
                              <button class="mod-del" data-act="del-mod" title="모듈 삭제">×</button>
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `;
                  }).join('')}
                </div>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;

      // Handle renaming input autofocus and events
      const nameInput = this.el.querySelector('.ps-layer-title-input');
      if (nameInput) {
        nameInput.focus();
        nameInput.select();
        const commit = () => {
          const val = nameInput.value.trim();
          if (val && this.renamingId) {
            for (const l of this.doc.layers) {
              if (l.id === this.renamingId) { l.name = val; break; }
              const sp = l.getSprite(this.renamingId);
              if (sp) { sp.name = val; break; }
            }
          }
          this.renamingId = null;
          this.cb.onUpdate();
        };
        nameInput.addEventListener('keydown', ev => {
          if (ev.key === 'Enter') commit();
          if (ev.key === 'Escape') { this.renamingId = null; this.render(); }
        });
        nameInput.addEventListener('blur', commit);
      }

      this.scrollToSelected();
    }

    scrollToSelected() {
      setTimeout(() => {
        const target = this.el.querySelector(`.ps-sprite-sub-item[data-sprite-id="${this.doc.selectedSpriteId}"]`) ||
                       this.el.querySelector(`.ps-layer-row[data-layer-id="${this.doc.selectedLayerId}"]`);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 40);
    }

    initEventsOnce() {
      // 1. Single click delegation on persistent container
      this.el.addEventListener('click', e => {
        // Double-click on a name starts renaming. The first click re-renders the
        // panel (selection), so the native dblclick never fires; use e.detail.
        if (e.detail === 2) {
          const titleEl = e.target.closest('.ps-layer-title, .ps-sprite-title');
          if (titleEl) {
            const spriteItem = e.target.closest('[data-sprite-id]');
            const layerGroup = e.target.closest('[data-layer-id]');
            this.renamingId = spriteItem ? spriteItem.dataset.spriteId : layerGroup?.dataset.layerId;
            this.render();
            const inp = this.el.querySelector('.ps-layer-title-input');
            if (inp) { inp.focus(); inp.select(); }
            return;
          }
        }

        if (e.target.closest('#btnNewLayer')) {
          const l = new Layer({ name: `레이어 ${this.doc.layers.length + 1}` });
          this.doc.addLayer(l);
          this.cb.onUpdate();
          return;
        }

        const btn = e.target.closest('button, [data-act]');
        const spriteItem = e.target.closest('[data-sprite-id]');
        const layerGroup = e.target.closest('[data-layer-id]');

        const layerId = layerGroup?.dataset.layerId;
        const layer = this.doc.getLayer(layerId);

        const spriteId = spriteItem?.dataset.spriteId;
        const sprite = layer?.getSprite(spriteId);

        const modRow = e.target.closest('[data-mod-id]');
        const modId = modRow?.dataset.modId;

        const act = btn ? btn.dataset.act : (spriteItem ? 'select-sprite' : (layerGroup ? 'select-layer' : null));

        if (act === 'fold-layer' && layer) {
          layer.expanded = !layer.expanded;
          this.render();
        } else if (act === 'vis-layer' && layer) {
          layer.visible = !layer.visible;
          this.cb.onUpdate();
        } else if (act === 'select-layer' && layer) {
          this.doc.selectedLayerId = layer.id;
          this.doc.selectedModuleId = null;
          if (layer.sprites.length > 0 && !layer.sprites.some(s => s.id === this.doc.selectedSpriteId)) {
            this.doc.selectedSpriteId = layer.sprites[0].id;
          }
          this.cb.onUpdate();
        } else if (act === 'rename-item') {
          const spRow = e.target.closest('[data-sprite-id]');
          const lyRow = e.target.closest('[data-layer-id]');
          this.renamingId = spRow ? spRow.dataset.spriteId : lyRow?.dataset.layerId;
          this.render();
          return;
        } else if (act === 'add-screen-trigger' && layer) {
          const trg = layer.addSprite({
            name: `화면 트리거 ${layer.sprites.length + 1}`,
            type: 'screen_trigger',
            x: Math.round(this.doc.width / 2),
            y: Math.min(600, this.doc.height - 200),
            width: Math.min(500, this.doc.width - 100),
            height: 180,
            triggerEvent: 'viewport_enter',
            triggerAction: 'trigger_module'
          });
          layer.expanded = true;
          this.doc.selectedLayerId = layer.id;
          this.doc.selectedSpriteId = trg.id;
          this.doc.saveState();
          this.cb.onUpdate();
        } else if (act === 'add-child-sprite' && layer) {
          const sp = layer.addSprite({
            name: `스프라이트 ${layer.sprites.length + 1}`,
            type: 'rect',
            x: this.doc.width / 2, y: this.doc.height / 2,
            width: 120, height: 120,
            fill: this.doc.foregroundColor
          });
          this.doc.selectedLayerId = layer.id;
          this.doc.selectedSpriteId = sp.id;
          this.doc.saveState();
          this.cb.onUpdate();
        } else if (act === 'delete-layer' && layer) {
          if (this.doc.layers.length <= 1) {
            StudioToast.show('최소 1개의 레이어가 유지되어야 합니다.');
            return;
          }
          this.doc.removeLayer(layer.id);
          this.cb.onUpdate();
        } else if (act === 'vis-sprite' && sprite) {
          sprite.visible = !sprite.visible;
          this.cb.onUpdate();
        } else if (act === 'select-sprite' && sprite) {
          this.doc.selectedLayerId = layerId;
          this.doc.selectedSpriteId = sprite.id; this.doc.selectedModuleId = null;
          this.doc.selectedModuleId = null;
          this.cb.onUpdate();
        } else if (act === 'delete-sprite' && layer && sprite) {
          layer.removeSprite(sprite.id);
          if (this.doc.selectedSpriteId === sprite.id) {
            this.doc.selectedSpriteId = layer.sprites.length > 0 ? layer.sprites[0].id : null;
          }
          this.cb.onUpdate();
        } else if (act === 'select-mod' && modId) {
          if (sprite) { this.doc.selectedSpriteId = sprite.id; } this.doc.selectedModuleId = modId;
          this.cb.onUpdate();
        } else if (act === 'toggle-mod' && sprite && modRow) {
          const mod = sprite.modules?.find(m => m.id === modId);
          if (mod) { mod.enabled = !mod.enabled; this.cb.onUpdate(); }
        } else if (act === 'del-mod' && sprite && modRow) {
          sprite.modules = sprite.modules?.filter(m => m.id !== modId);
          if (this.doc.selectedModuleId === modId) this.doc.selectedModuleId = null;
          this.cb.onUpdate();
                } else if (act === 'toggle-sprite-fold' && sprite) {
          sprite.collapsed = !sprite.collapsed;
          this.render();
          return;
        } else if (act === 'toggle-link' && sprite) {
          if (sprite.linkGroup) {
            sprite.linkGroup = null;
          } else {
            const existingGroups = new Set();
            for (const ly of this.doc.layers) {
              for (const sp of ly.sprites) {
                if (sp.linkGroup) existingGroups.add(sp.linkGroup);
              }
            }
            let targetGroup = '1';
            let gNum = 1;
            while (existingGroups.has(String(gNum))) { gNum++; }
            targetGroup = String(gNum);

            const allSprites = this.doc.layers.flatMap(ly => ly.sprites);
            const otherSprite = allSprites.find(sp => sp.id !== sprite.id);
            if (otherSprite && !otherSprite.linkGroup) {
              otherSprite.linkGroup = targetGroup;
            }
            sprite.linkGroup = otherSprite?.linkGroup || targetGroup;
          }
          this.doc.saveState();
          this.cb.onUpdate();
        } else if (act === 'add-sprite-mod' && sprite) {
          this.showModuleLibraryModal(sprite, false);
        } else if (act === 'add-layer-mod' && layer) {
          this.showModuleLibraryModal(layer, true);
        }
      });

      // 2. Double-click delegation for rename
      this.el.addEventListener('dblclick', e => {
        const titleEl = e.target.closest('.ps-layer-title, .ps-sprite-title');
        if (titleEl) {
          const layerGroup = e.target.closest('[data-layer-id]');
          const spriteItem = e.target.closest('[data-sprite-id]');
          this.renamingId = spriteItem ? spriteItem.dataset.spriteId : layerGroup?.dataset.layerId;
          this.render();
        }
      });

      // 3. Drag and Drop delegation on container
      this.el.addEventListener('dragstart', e => {
        const row = e.target.closest('[draggable="true"]');
        if (!row) return;
        if (row.classList.contains('ps-layer-row')) {
          this.dragInfo = { type: 'layer', id: row.dataset.layerId };
        } else if (row.classList.contains('ps-sprite-sub-item')) {
          this.dragInfo = { type: 'sprite', id: row.dataset.spriteId, layerId: row.dataset.layerId };
        } else if (row.classList.contains('ps-layer-module-row')) {
          this.dragInfo = { type: 'mod', id: row.dataset.modId, spriteId: row.dataset.spriteId };
        }
        row.classList.add('is-dragging');
      });

      this.el.addEventListener('dragend', e => {
        const row = e.target.closest('[draggable="true"]');
        if (row) row.classList.remove('is-dragging');
        this.el.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(n => {
          n.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        this.dragInfo = null;
      });

      this.el.addEventListener('dragover', e => {
        const row = e.target.closest('[draggable="true"]');
        if (!row || !this.dragInfo) return;
        e.preventDefault();
        const r = row.getBoundingClientRect();
        const isTop = (e.clientY - r.top) < r.height / 2;
        this.el.querySelectorAll('.drag-over-top, .drag-over-bottom').forEach(n => {
          if (n !== row) n.classList.remove('drag-over-top', 'drag-over-bottom');
        });
        row.classList.toggle('drag-over-top', isTop);
        row.classList.toggle('drag-over-bottom', !isTop);
      });

      this.el.addEventListener('dragleave', e => {
        const row = e.target.closest('[draggable="true"]');
        if (row) row.classList.remove('drag-over-top', 'drag-over-bottom');
      });

      this.el.addEventListener('drop', e => {
        const row = e.target.closest('[draggable="true"]');
        if (!row || !this.dragInfo) return;
        e.preventDefault();
        const r = row.getBoundingClientRect();
        const isTop = (e.clientY - r.top) < r.height / 2;
        row.classList.remove('drag-over-top', 'drag-over-bottom');

        const { type, id, layerId: srcLayerId } = this.dragInfo;

        if (type === 'layer') {
          const targetRow = row.closest('.ps-layer-row, .ps-layer-group');
          const targetId = targetRow?.dataset?.layerId;
          if (id && targetId && id !== targetId) {
            const srcIdx = this.doc.layers.findIndex(l => l.id === id);
            if (srcIdx !== -1) {
              const [moved] = this.doc.layers.splice(srcIdx, 1);
              const dstIdx = this.doc.layers.findIndex(l => l.id === targetId);
              this.doc.layers.splice(isTop ? dstIdx + 1 : dstIdx, 0, moved);
              this.doc.sortLayers();
              this.doc.saveState();
              this.cb.onUpdate();
            }
          }
        } else if (type === 'sprite') {
          const spriteRow = row.closest('.ps-sprite-sub-item');
          if (spriteRow) {
            const targetSpriteId = spriteRow.dataset.spriteId;
            const targetLayerId = spriteRow.dataset.layerId;
            const srcLayer = this.doc.getLayer(srcLayerId);
            const dstLayer = this.doc.getLayer(targetLayerId);
            if (srcLayer && dstLayer) {
              const srcIdx = srcLayer.sprites.findIndex(s => s.id === id);
              if (srcIdx !== -1) {
                const [moved] = srcLayer.sprites.splice(srcIdx, 1);
                const dstIdx = dstLayer.sprites.findIndex(s => s.id === targetSpriteId);
                dstLayer.sprites.splice(isTop ? dstIdx + 1 : dstIdx, 0, moved);
                dstLayer.expanded = true;
                this.doc.selectedLayerId = dstLayer.id;
                this.doc.selectedSpriteId = moved.id;
                this.doc.saveState();
                this.cb.onUpdate();
              }
            }
          } else {
            const layerGroup = row.closest('[data-layer-id]');
            const targetLayerId = layerGroup?.dataset?.layerId;
            const srcLayer = this.doc.getLayer(srcLayerId);
            const dstLayer = this.doc.getLayer(targetLayerId);
            if (srcLayer && dstLayer) {
              const srcIdx = srcLayer.sprites.findIndex(s => s.id === id);
              if (srcIdx !== -1) {
                const [moved] = srcLayer.sprites.splice(srcIdx, 1);
                dstLayer.sprites.push(moved);
                dstLayer.expanded = true;
                this.doc.selectedLayerId = dstLayer.id;
                this.doc.selectedSpriteId = moved.id;
                this.doc.saveState();
                this.cb.onUpdate();
              }
            }
          }
        } else if (type === 'mod') {
          const modRow = row.closest('.ps-layer-module-row');
          const spriteRow = row.closest('.ps-sprite-sub-item');
          let targetSpriteId = null;
          let targetModId = null;

          if (modRow) {
            targetModId = modRow.dataset.modId;
            targetSpriteId = modRow.dataset.spriteId;
          } else if (spriteRow) {
            targetSpriteId = spriteRow.dataset.spriteId;
          }

          if (targetSpriteId) {
            let srcSprite = null;
            let movedMod = null;
            for (const ly of this.doc.layers) {
              for (const sp of ly.sprites) {
                if (sp.modules) {
                  const mIdx = sp.modules.findIndex(m => m.id === id);
                  if (mIdx !== -1) {
                    srcSprite = sp;
                    movedMod = sp.modules.splice(mIdx, 1)[0];
                    break;
                  }
                }
              }
              if (movedMod) break;
            }

            if (movedMod) {
              let dstSprite = null;
              for (const ly of this.doc.layers) {
                dstSprite = ly.getSprite(targetSpriteId);
                if (dstSprite) break;
              }

              if (dstSprite) {
                if (!dstSprite.modules) dstSprite.modules = [];
                if (targetModId && targetModId !== id) {
                  const dstIdx = dstSprite.modules.findIndex(m => m.id === targetModId);
                  dstSprite.modules.splice(isTop ? dstIdx : dstIdx + 1, 0, movedMod);
                } else {
                  dstSprite.modules.push(movedMod);
                }
                this.doc.selectedSpriteId = dstSprite.id;
                this.doc.selectedModuleId = movedMod.id;
                this.doc.saveState();
                if (this.cb.onUpdate) this.cb.onUpdate();
              }
            }
          }
        }
      });
    }

    showModuleLibraryModal(target, isLayer = false) {
      if (!target) return;
      if (!target.modules) target.modules = [];

      // Clean up any lingering modal first
      document.querySelectorAll('.modal-overlay').forEach(m => m.remove());

      const modal = document.createElement('div');
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="ps-module-modal">
          <div class="ps-modal-header">
            <div class="ps-modal-title">${isLayer ? '레이어 모듈 장착' : '스프라이트 모듈 장착'} (${escapeHtml(target.name)})</div>
            <button class="ps-modal-close" id="closeModal">✕</button>
          </div>
          <div class="mod-category-tabs">
            <button class="mod-category-tab ${this.activeCategory==='all'?'active':''}" data-cat="all">전체</button>
            <button class="mod-category-tab ${this.activeCategory==='mask'?'active':''}" data-cat="mask">마스크</button>
            <button class="mod-category-tab ${this.activeCategory==='filter'?'active':''}" data-cat="filter">필터</button>
            <button class="mod-category-tab ${this.activeCategory==='web'?'active':''}" data-cat="web">웹 & 인터랙션</button>
            <button class="mod-category-tab ${this.activeCategory==='motion'?'active':''}" data-cat="motion">모션 & FX</button>
            <button class="mod-category-tab ${this.activeCategory==='sensor'?'active':''}" data-cat="sensor">감지 & 제스처</button>
            <button class="mod-category-tab ${this.activeCategory==='logic'?'active':''}" data-cat="logic">연결 & 로직</button>
            <button class="mod-category-tab ${this.activeCategory==='timing'?'active':''}" data-cat="timing">타이밍</button>
            <button class="mod-category-tab ${this.activeCategory==='audio'?'active':''}" data-cat="audio">오디오</button>
            <button class="mod-category-tab ${this.activeCategory==='advanced'?'active':''}" data-cat="advanced" title="코드를 직접 쓰는 모듈">고급 (코드)</button>
          </div>
          <div class="ps-module-grid" id="modalModGrid"></div>
        </div>
      `;
      document.body.appendChild(modal);

      const renderGrid = () => {
        const grid = modal.querySelector('#modalModGrid');
        const keys = Object.keys(MODULE_REGISTRY).filter(k => {
          // Code-only modules are listed only under "고급".
          if (MODULE_REGISTRY[k].advanced) return this.activeCategory === 'advanced';
          if (this.activeCategory === 'advanced') return false;
          if (this.activeCategory === 'all') return true;
          if (this.activeCategory === 'mask') return k === 'substance_mask' || MODULE_REGISTRY[k].category === 'mask';
          if (this.activeCategory === 'filter') return k === 'photoshop_filter' || MODULE_REGISTRY[k].category === 'filter';
          return MODULE_REGISTRY[k].category === this.activeCategory;
        });

        grid.innerHTML = keys.map(k => {
          const m = MODULE_REGISTRY[k];
          return `
            <div class="ps-module-card" data-key="${escapeHtml(k)}">
              <div class="ps-mod-badge">${escapeHtml(m.icon)}</div>
              <div class="ps-mod-info">
                <div class="ps-mod-name">${escapeHtml(m.name)}</div>
                <div class="ps-mod-desc">${escapeHtml(m.description)}</div>
              </div>
            </div>
          `;
        }).join('');

        grid.querySelectorAll('.ps-module-card').forEach(c => {
          c.addEventListener('click', () => {
            const mKey = c.dataset.key;
            const def = MODULE_REGISTRY[mKey];
            const newMod = {
              id: 'mod_' + Math.random().toString(36).substr(2, 9),
              type: mKey,
              name: def.name,
              enabled: true,
              params: JSON.parse(JSON.stringify(def.defaultParams || {}))
            };
            target.modules.push(newMod);
            this.doc.selectedModuleId = newMod.id;
            modal.remove();
            this.cb.onUpdate();
          });
        });
      };

      modal.querySelectorAll('.mod-category-tab').forEach(t => {
        t.addEventListener('click', () => {
          modal.querySelectorAll('.mod-category-tab').forEach(b => b.classList.remove('active'));
          t.classList.add('active');
          this.activeCategory = t.dataset.cat;
          renderGrid();
        });
      });

      renderGrid();

      const closeModal = () => modal.remove();
      modal.querySelector('#closeModal').addEventListener('click', closeModal);
      modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
      const onKeyDown = ev => {
        if (ev.key === 'Escape') { closeModal(); window.removeEventListener('keydown', onKeyDown); }
      };
      window.addEventListener('keydown', onKeyDown);
    }
  }
  // ==========================================================================
  // 14. InspectorPanelUI (Strictly Separated Layer, Sprite & Module Inspectors)
  // ==========================================================================
  class InspectorPanelUI {
    constructor(el, doc, callbacks) {
      this.el = el;
      this.doc = doc;
      this.cb = callbacks;
      this.render();
    }

    render() {
      const selectedSprite = this.doc.getSelectedSprite(false);
      const selectedLayer = this.doc.getSelectedLayer();
      const selectedMod = this.getSelectedModule(selectedSprite);

      let contentHtml = '';
      if (selectedMod && selectedSprite) {
        contentHtml = this.renderModuleInspector(selectedMod, selectedSprite);
      } else if (selectedSprite) {
        contentHtml = this.renderSpriteInspector(selectedSprite);
      } else if (selectedLayer) {
        contentHtml = this.renderCanvasSection() + this.renderLayerInspector(selectedLayer);
      } else {
        contentHtml = this.renderCanvasSection() + '<div class="ps-empty-layers">선택된 레이어나 스프라이트가 없습니다.</div>';
      }

      // Editing a value re-renders the panel: keep its scroll position while
      // the same sprite / module stays selected (long action lists).
      const selKey = (selectedSprite ? selectedSprite.id : '') + '|' + (selectedMod ? selectedMod.id : '') + '|' + (selectedLayer ? selectedLayer.id : '');
      const oldArea = this.el.querySelector('.ps-insp-scroll-area');
      const keepScroll = oldArea && this._selKey === selKey ? oldArea.scrollTop : 0;
      this._selKey = selKey;

      this.el.innerHTML = `
        <div class="ps-dock-header krita-docker-titlebar">
          <span class="ps-dock-title">속성 (Inspector)</span>
          <div class="ps-dock-tools">
            <button class="krita-action-btn" data-docker-act="toggle-collapse" title="접기/펼치기">▼</button>
            <button class="krita-action-btn" data-docker-act="toggle-float" title="창 분리(Float) / 도킹(Dock)">⧉</button>
          </div>
        </div>

        <div class="ps-insp-scroll-area">
          ${contentHtml}
        </div>
      `;

      if (keepScroll) { const area = this.el.querySelector('.ps-insp-scroll-area'); if (area) area.scrollTop = keepScroll; }
      this.bindScrubbing();
      this.bindCanvasSection();
      this.bindInputs(selectedSprite, selectedMod, selectedLayer);
    }

    getSelectedModule(sprite) {
      if (!this.doc.selectedModuleId || !sprite || !sprite.modules) return null;
      return sprite.modules.find(m => m.id === this.doc.selectedModuleId) || null;
    }

    // Canvas (artboard) size: free W/H inputs. The artboard edges can also be
    // dragged on the canvas (handles on the right / bottom / corner).
    renderCanvasSection() {
      const mode = this.canvasMode || 'reflow';
      const view = this.doc.activeView && this.doc.activeView !== 'desktop' ? ` (${this.doc.activeView === 'mobile' ? '모바일' : '태블릿'} 화면)` : '';
      return `
        <div class="ps-prop-section" id="canvasSizeSection">
          <div class="ps-prop-header" style="justify-content:space-between;">
            <span style="font-weight:700;color:#e4e4e7;">캔버스 크기${view}</span>
            <span class="ps-val-tag">${escapeHtml(this.doc.width)}×${escapeHtml(this.doc.height)}</span>
          </div>
          <div style="display:grid;grid-template-columns:auto 1fr auto 1fr;gap:6px;align-items:center;margin:8px 0 6px;">
            <label for="inpCanvasW" style="font-size:11px;color:#a1a1aa;">가로 W</label>
            <input type="number" class="ps-input" id="inpCanvasW" min="50" max="10000" step="1" value="${escapeHtml(this.doc.width)}" style="width:100%;min-width:0;">
            <label for="inpCanvasH" style="font-size:11px;color:#a1a1aa;">세로 H</label>
            <input type="number" class="ps-input" id="inpCanvasH" min="50" max="20000" step="1" value="${escapeHtml(this.doc.height)}" style="width:100%;min-width:0;">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label" for="inpScreenWidth">화면 폭:</label>
            <input type="range" class="jspen-width-slider" id="inpScreenWidth" min="320" max="${escapeHtml(Math.max(1920, this.doc.width))}" step="10" value="${escapeHtml(this.doc.width)}" title="끌면서 웹사이트처럼 재배치되는 모습을 봅니다">
            <span class="ps-val-tag" id="valScreenW">${escapeHtml(this.doc.width)}px</span>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">작업물 처리:</label>
            <select class="ps-select" id="inpCanvasMode">
              <option value="reflow" ${mode === 'reflow' ? 'selected' : ''}>웹사이트처럼 재배치</option>
              <option value="keep" ${mode === 'keep' ? 'selected' : ''}>그대로 두기</option>
              <option value="fit" ${mode === 'fit' ? 'selected' : ''}>비율 유지하며 맞추기</option>
              <option value="stretch" ${mode === 'stretch' ? 'selected' : ''}>캔버스에 맞춰 늘리기</option>
            </select>
          </div>
          <div class="ps-help-text" style="font-size:10.5px;color:#71717a;line-height:1.5;margin-top:4px;">값을 입력하고 Enter. 캔버스 오른쪽·아래 가장자리의 손잡이를 끌어도 바뀝니다 (Shift: 10px 단위). 손잡이는 '그대로 두기'일 때만 내용을 고정하고, 나머지는 웹사이트처럼 재배치합니다.</div>
        </div>`;
    }

    bindCanvasSection() {
      const wEl = this.el.querySelector('#inpCanvasW'), hEl = this.el.querySelector('#inpCanvasH');
      if (!wEl || !hEl) return;
      this.el.querySelector('#inpCanvasMode')?.addEventListener('change', e => { this.canvasMode = e.target.value; });
      const apply = () => {
        const w = Math.round(parseFloat(wEl.value)), h = Math.round(parseFloat(hEl.value));
        if (!(w >= 50 && h >= 50)) { wEl.value = this.doc.width; hEl.value = this.doc.height; return; }
        window.jspenApp?.setCanvasSize(Math.min(10000, w), Math.min(20000, h), this.canvasMode || 'reflow');
      };
      wEl.addEventListener('change', apply);
      hEl.addEventListener('change', apply);
      // The width slider reflows live like resizing a browser window; letting
      // go is one undo step, and sliding back restores the design exactly.
      const slider = this.el.querySelector('#inpScreenWidth'), label = this.el.querySelector('#valScreenW');
      if (!slider) return;
      let source = null;
      slider.addEventListener('input', () => {
        const app = window.jspenApp;
        if (!app) return;
        if (!source) { app.endLivePreview(); source = this.doc.reflowSource(); }
        this.doc.reflowTo(Math.round(parseFloat(slider.value)), source);
        if (label) label.textContent = this.doc.width + 'px';
        wEl.value = this.doc.width; hEl.value = this.doc.height;
        app.handleResize();
        app.requestRender();
      });
      slider.addEventListener('change', () => {
        if (!source) return;
        this.doc.rememberLayout(source, this.doc.height);
        source = null;
        this.doc.saveState();
        window.jspenApp?.fitToScreen();
        window.jspenApp?.refreshUI();
      });
    }

    // 1. Layer Inspector (Pure layer properties only - No sprite or module properties)
    renderLayerInspector(layer) {
      if (!layer) return '<div class="ps-empty-layers">선택된 레이어가 없습니다.</div>';
      return `
        <div class="ps-prop-section">
          <div class="ps-prop-header" style="justify-content:space-between;">
            <span style="font-weight:700;color:#e4e4e7;">레이어: ${escapeHtml(layer.name)}</span>
            <span class="ps-val-tag">레이어</span>
          </div>
          <div class="ps-prop-row" style="margin-top:8px;">
            <label class="ps-prop-label">레이어 이름:</label>
            <input type="text" class="ps-input" id="inpLayerName" value="${escapeHtml(layer.name)}">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">투명도 (Opacity):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpLayerOpacity" step="0.05" min="0" max="1" value="${escapeHtml(layer.opacity !== undefined ? layer.opacity : 1)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">블렌드 모드:</label>
            <select class="ps-select" id="inpLayerBlend">
              <option value="source-over" ${layer.blendMode === 'source-over' ? 'selected' : ''}>표준 (Normal)</option>
              <option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>곱하기 (Multiply)</option>
              <option value="screen" ${layer.blendMode === 'screen' ? 'selected' : ''}>스크린 (Screen)</option>
              <option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>오버레이 (Overlay)</option>
              <option value="darken" ${layer.blendMode === 'darken' ? 'selected' : ''}>어둡게 (Darken)</option>
              <option value="lighten" ${layer.blendMode === 'lighten' ? 'selected' : ''}>밝게 (Lighten)</option>
              <option value="color-dodge" ${layer.blendMode === 'color-dodge' ? 'selected' : ''}>색상 닷지 (Color Dodge)</option>
              <option value="color-burn" ${layer.blendMode === 'color-burn' ? 'selected' : ''}>색상 번 (Color Burn)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">표시 여부 (가시성):</label>
            <select class="ps-select" id="inpLayerVis">
              <option value="true" ${layer.visible !== false ? 'selected' : ''}>표시 (Visible)</option>
              <option value="false" ${layer.visible === false ? 'selected' : ''}>숨김 (Hidden)</option>
            </select>
          </div>
        </div>
      `;
    }

    // 2. Sprite Inspector (Pure sprite intrinsic properties only - No modifier stack, no modules)
    renderSpriteInspector(sprite) {
      if (!sprite) return '<div class="ps-empty-layers">선택된 스프라이트가 없습니다.</div>';
      const ownerLayer = this.doc.layers.find(l => l.sprites.some(s => s.id === sprite.id));
      const layerName = ownerLayer ? ownerLayer.name : '';

      return `
        <!-- Sprite Header -->
        <div class="ps-prop-section">
          <div class="ps-prop-header" style="display:flex;align-items:center;justify-content:space-between;gap:8px;">
            <span style="font-weight:700;color:#e4e4e7;flex:0 1 auto;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(sprite.name)}">스프라이트: ${escapeHtml(sprite.name)}</span>
            <span class="ps-val-tag ps-val-name" title="${escapeHtml(layerName ? layerName : sprite.type)}">${escapeHtml(layerName ? layerName : sprite.type)}</span>
          </div>
          <div class="ps-prop-row" style="margin-top:6px;">
            <label class="ps-prop-label">이름:</label>
            <input type="text" class="ps-input" id="inpSpriteName" value="${escapeHtml(sprite.name)}">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">유형 (Type):</label>
            <span class="ps-val-tag" style="padding:2px 6px;">${escapeHtml(sprite.type)}</span>
          </div>
        </div>

        <!-- Transform Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">변형 (Transform)</div>
          <div class="ps-prop-grid-2">
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">X</span>
              <input type="number" class="blender-scrub-input" id="inpX" value="${Math.round(sprite.x)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">Y</span>
              <input type="number" class="blender-scrub-input" id="inpY" value="${Math.round(sprite.y)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">W</span>
              <input type="number" class="blender-scrub-input" id="inpW" min="1" value="${Math.round(sprite.width)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">H</span>
              <input type="number" class="blender-scrub-input" id="inpH" min="1" value="${Math.round(sprite.height)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">Rot</span>
              <input type="number" class="blender-scrub-input" id="inpRot" value="${Math.round(sprite.rotation)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">Opac</span>
              <input type="number" class="blender-scrub-input" id="inpOpacity" step="0.05" min="0" max="1" value="${escapeHtml(sprite.opacity)}">
            </div>
          </div>
        </div>

        <!-- When the width changes -->
        <div class="ps-prop-section" id="pinSection">
          <div class="ps-prop-header">화면 폭이 바뀌면</div>
          <div class="jspen-pin-buttons" role="group" aria-label="화면 폭이 바뀌면 붙는 위치">
            ${[['', '자동', '주변 배치를 보고 알아서 정합니다'], ['left', '왼쪽', '왼쪽 여백을 지킵니다'], ['center', '가운데', '가운데를 지킵니다'],
              ['right', '오른쪽', '오른쪽 여백을 지킵니다'], ['stretch', '폭 채움', '양쪽 여백을 지키고 폭이 늘거나 줄어듭니다']].map(([v, l, t]) =>
              `<button type="button" class="jspen-pin ${(sprite.pin || '') === v ? 'is-on' : ''}" data-pin="${v}" title="${t}" aria-pressed="${(sprite.pin || '') === v}">${l}</button>`).join('')}
          </div>
          <div class="ps-help-text" style="font-size:10.5px;color:#71717a;line-height:1.5;margin-top:4px;">캔버스 폭을 바꾸거나 내보낸 페이지의 창 폭이 바뀔 때 붙을 곳입니다. 감싸는 상자가 있으면 그 상자 안에서 정합니다.</div>
        </div>

        <!-- Appearance Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">모양 및 스타일 (Appearance)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">채우기 방식:</label>
            <select class="ps-select" id="inpFillType">
              <option value="color" ${sprite.fillType !== 'linear-gradient' && sprite.fillType !== 'none' ? 'selected' : ''}>단색 (Solid Color)</option>
              <option value="linear-gradient" ${sprite.fillType === 'linear-gradient' ? 'selected' : ''}>선형 그라데이션 (Linear)</option>
              <option value="none" ${sprite.fillType === 'none' ? 'selected' : ''}>없음 / 투명 (None)</option>
            </select>
          </div>
          ${sprite.fillType === 'linear-gradient' ? `
          <div class="ps-prop-row">
            <label class="ps-prop-label">그라데이션 각도:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpGradientAngle" min="-360" max="360" step="5" value="${escapeHtml(sprite.gradient?.angle !== undefined ? sprite.gradient.angle : (sprite.gradientAngle || 0))}">
            </div>
          </div>
          <div class="ps-prop-row" style="gap:4px;">
            <label class="ps-prop-label">방향 프리셋:</label>
            <div style="display:flex;gap:3px;flex:1;">
              <button class="btn btn-secondary btn-sm btn-grad-dir" data-angle="0" style="flex:1;padding:2px 4px;font-size:10px;">0°(➔)</button>
              <button class="btn btn-secondary btn-sm btn-grad-dir" data-angle="90" style="flex:1;padding:2px 4px;font-size:10px;">90°(↓)</button>
              <button class="btn btn-secondary btn-sm btn-grad-dir" data-angle="45" style="flex:1;padding:2px 4px;font-size:10px;">45°(↘)</button>
              <button class="btn btn-secondary btn-sm btn-grad-dir" data-angle="180" style="flex:1;padding:2px 4px;font-size:10px;">180°(←)</button>
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">시작 색상 (0%):</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" id="inpGradStop0" value="${escapeHtml(sprite.gradient?.stops?.[0]?.color || '#ffffff')}">
              <span class="ps-val-tag">${escapeHtml(sprite.gradient?.stops?.[0]?.color || '#ffffff')}</span>
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">끝 색상 (100%):</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" id="inpGradStop1" value="${escapeHtml(sprite.gradient?.stops?.[1]?.color || '#27272a')}">
              <span class="ps-val-tag">${escapeHtml(sprite.gradient?.stops?.[1]?.color || '#27272a')}</span>
            </div>
          </div>
          ` : `
          <div class="ps-prop-row">
            <label class="ps-prop-label">채우기 색상:</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" id="inpFill" value="${escapeHtml(sprite.fill && sprite.fill.startsWith('#') ? sprite.fill : '#71717a')}">
              <span class="ps-val-tag">${escapeHtml(sprite.fill || '#71717a')}</span>
            </div>
          </div>
          `}
          <div class="ps-prop-row">
            <label class="ps-prop-label">테두리 색상:</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" id="inpStroke" value="${escapeHtml(sprite.stroke && sprite.stroke.startsWith('#') ? sprite.stroke : '#0284c7')}">
              <span class="ps-val-tag">${escapeHtml(sprite.stroke || 'none')}</span>
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">선 두께 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpStrokeWidth" min="0" max="100" value="${escapeHtml(sprite.strokeWidth || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label" title="모서리를 둥글게 만듭니다">모서리 둥글게 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpCornerRadius" min="0" max="500" value="${escapeHtml(sprite.cornerRadius || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label" title="모서리를 비스듬히 잘라 냅니다 (둥글게와 함께 쓰면 잘린 모서리가 둥글어집니다)">모서리 깎기 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpBevel" min="0" max="500" value="${escapeHtml(sprite.bevel || 0)}">
            </div>
          </div>
        </div>

        ${sprite.type === 'text' ? `
        <!-- Text Specific Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">텍스트 속성 (Typography)</div>
${sprite.type === 'text' ? `
          <div class="ps-prop-row">
            <label class="ps-prop-label">텍스트 내용:</label>
            <input type="text" class="ps-input" id="inpText" value="${escapeHtml(sprite.text || '')}">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">글자 크기 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpFontSize" min="1" max="200" value="${escapeHtml(sprite.fontSize || 32)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">글꼴:</label>
            <select class="ps-select" id="inpFontFamily">
              ${(window.jspenApp ? window.jspenApp.fontChoices() : [['', '기본 글꼴']]).map(([v, l]) => `<option value="${escapeHtml(v)}" ${((sprite.fontFamily === 'Pretendard, sans-serif' ? '' : sprite.fontFamily) || '') === v ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
              ${(sprite.fontFamily && sprite.fontFamily !== 'Pretendard, sans-serif') && !(window.jspenApp ? window.jspenApp.fontChoices() : []).some(([v]) => v === sprite.fontFamily) ? `<option value="${escapeHtml(sprite.fontFamily)}" selected>${escapeHtml(sprite.fontFamily)}</option>` : ''}
            </select>
            <button class="btn btn-secondary btn-sm" data-act-font-upload title="글꼴 파일(.ttf/.otf/.woff/.woff2)을 문서에 추가" style="margin-left:4px;padding:2px 6px;">+</button>
          </div>` : `
          <div class="ps-prop-row" style="margin-top:6px;">
            <button class="btn btn-secondary btn-sm" id="btnQuickAddTextMod" style="width:100%;font-size:11px;padding:4px 8px;display:flex;align-items:center;justify-content:center;gap:4px;" title="스프라이트 안에 텍스트 라벨 모듈을 추가합니다">
              + 텍스트 라벨 모듈 추가
            </button>
          </div>`
}
          <div class="ps-prop-row">
            <label class="ps-prop-label">정렬:</label>
            <select class="ps-select" id="inpTextAlign">
              <option value="left" ${sprite.textAlign === 'left' ? 'selected' : ''}>왼쪽 정렬</option>
              <option value="center" ${sprite.textAlign === 'center' ? 'selected' : ''}>가운데 정렬</option>
              <option value="right" ${sprite.textAlign === 'right' ? 'selected' : ''}>오른쪽 정렬</option>
            </select>
          </div>
        </div>
        ` : ''}

        ${sprite.type === 'form_field' ? (() => { const fs = FormRuntime.fieldSpec(sprite); return `
        <!-- Form Field Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">폼 입력칸 (Form Field)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">종류:</label>
            <select class="ps-select" data-form-prop="kind">
              ${[['text', '텍스트'], ['email', '이메일'], ['tel', '전화번호'], ['number', '숫자'], ['textarea', '여러 줄'], ['checkbox', '체크박스'], ['select', '선택 목록']]
                .map(([v, l]) => `<option value="${v}" ${fs.kind === v ? 'selected' : ''}>${l}</option>`).join('')}
            </select>
          </div>
          <div class="ps-prop-row"><label class="ps-prop-label">이름 (전송 키):</label><input type="text" class="ps-input" data-form-prop="name" value="${escapeHtml(fs.name)}"></div>
          <div class="ps-prop-row"><label class="ps-prop-label">안내 문구:</label><input type="text" class="ps-input" data-form-prop="placeholder" value="${escapeHtml(fs.placeholder)}"></div>
          ${fs.kind === 'checkbox' ? `<div class="ps-prop-row"><label class="ps-prop-label">라벨:</label><input type="text" class="ps-input" data-form-prop="label" value="${escapeHtml(fs.label)}"></div>` : ''}
          ${fs.kind === 'select' ? `<div class="ps-prop-row"><label class="ps-prop-label">선택지 (쉼표로 구분):</label><input type="text" class="ps-input" data-form-prop="options" value="${escapeHtml(fs.options.join(', '))}"></div>` : ''}
          <div class="ps-prop-row"><label class="ps-prop-label">기본값:</label><input type="text" class="ps-input" data-form-prop="value" value="${escapeHtml(fs.value)}"></div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">필수 입력:</label>
            <select class="ps-select" data-form-prop="required"><option value="false" ${!fs.required ? 'selected' : ''}>아니요</option><option value="true" ${fs.required ? 'selected' : ''}>예</option></select>
          </div>
          <div class="ps-prop-row" style="font-size:10.5px;color:#71717a;">입력값은 전역 변수 <code>form.${escapeHtml(fs.name)}</code> 으로도 읽을 수 있습니다.</div>
        </div>`; })() : ''}

        ${sprite.type === 'image' ? `
        <!-- Image Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">이미지 (Image)</div>
          <div class="ps-prop-row">
            <button class="btn btn-secondary btn-sm" id="btnReplaceImage" style="width:100%;">이미지 교체...</button>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">맞춤 방식:</label>
            <select class="ps-select" id="inpImageFit">
              <option value="cover" ${(sprite.imageFit || 'cover') === 'cover' ? 'selected' : ''}>채우기 (잘라서 꽉 채움)</option>
              <option value="contain" ${sprite.imageFit === 'contain' ? 'selected' : ''}>전체 보이기 (여백 허용)</option>
              <option value="fill" ${sprite.imageFit === 'fill' ? 'selected' : ''}>늘리기 (비율 무시)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">대체 텍스트:</label>
            <input type="text" class="ps-input" id="inpImageAlt" placeholder="화면 낭독기·검색엔진용 설명" value="${escapeHtml(sprite.alt || '')}">
          </div>
          ${sprite.naturalWidth ? `<div class="ps-prop-row"><button class="btn btn-secondary btn-sm" id="btnImageNatural" style="width:100%;">원본 비율로 (${escapeHtml(sprite.naturalWidth)} × ${escapeHtml(sprite.naturalHeight)})</button></div>` : ''}
        </div>
        ` : ''}

        ${sprite.type === 'screen_trigger' ? `
        <!-- Screen Trigger Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">화면 트리거 설정 (Screen Trigger)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">발동 조건:</label>
            <select class="ps-select" id="inpTriggerEvent">
              <option value="viewport_enter" ${sprite.triggerEvent === 'viewport_enter' ? 'selected' : ''}>화면 진입 시 (Viewport Enter)</option>
              <option value="viewport_exit" ${sprite.triggerEvent === 'viewport_exit' ? 'selected' : ''}>화면 이탈 시 (Viewport Exit)</option>
              <option value="mouse_enter" ${sprite.triggerEvent === 'mouse_enter' ? 'selected' : ''}>마우스 진입 시 (Mouse Enter)</option>
              <option value="scroll_reach" ${sprite.triggerEvent === 'scroll_reach' ? 'selected' : ''}>스크롤 도달 시 (Scroll Reach)</option>
              <option value="click" ${sprite.triggerEvent === 'click' ? 'selected' : ''}>클릭 시 (Click)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">신호 이름:</label>
            <input type="text" class="ps-input" id="inpTriggerSignalName" value="${escapeHtml(sprite.signalName || 'signal_1')}">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">발동 액션:</label>
            <select class="ps-select" id="inpTriggerAction">
              <option value="emit_signal" ${sprite.triggerAction === 'emit_signal' ? 'selected' : ''}>신호 방출 (Emit Signal)</option>
              <option value="trigger_module" ${sprite.triggerAction === 'trigger_module' ? 'selected' : ''}>연결 모듈 실행</option>
              <option value="show_sprite" ${sprite.triggerAction === 'show_sprite' ? 'selected' : ''}>스프라이트 표시</option>
              <option value="hide_sprite" ${sprite.triggerAction === 'hide_sprite' ? 'selected' : ''}>스프라이트 숨김</option>
            </select>
          </div>
        </div>
        ` : ''}
      `;
    }

    // 3. Module Inspector (Matches Sprite Inspector layout exactly, without Blender modifier card clutter)
    renderModuleInspector(mod, sprite) {
      const def = MODULE_REGISTRY[mod.type] || { name: mod.name, icon: 'MOD' };
      const params = mod.params || {};
      const modIdx = sprite?.modules ? sprite.modules.findIndex(m => m.id === mod.id) : -1;
      const totalMods = sprite?.modules ? sprite.modules.length : 1;
      const isFirst = modIdx === 0;
      const isLast = modIdx === totalMods - 1;

      const allSprites = [];
      for (const ly of this.doc.layers) {
        for (const sp of ly.sprites) {
          if (sp.id !== sprite.id) {
            allSprites.push({ id: sp.id, name: `${sp.name} (${ly.name})`, type: sp.type });
          }
        }
      }

      let typeSpecificHtml = '';
      const linkCtx = { allSprites, catalog: InspectorPanelUI.linkCatalog(this.doc) };

      if (mod.type === 'text_label') {
        typeSpecificHtml = `
          <div class="ps-prop-row" style="align-items:flex-start;">
            <label class="ps-prop-label">텍스트 내용:</label>
            <textarea class="ps-input" data-param-key="text" rows="3" style="resize:vertical;font-family:inherit;min-height:54px;">${escapeHtml(params.text || '')}</textarea>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">글자 크기 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="fontSize" min="8" max="160" value="${escapeHtml(params.fontSize || 16)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">글꼴:</label>
            <select class="ps-select" data-param-key="fontFamily">
              ${(window.jspenApp ? window.jspenApp.fontChoices() : [['', '기본 글꼴']]).map(([v, l]) => `<option value="${escapeHtml(v)}" ${(params.fontFamily || '') === v ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
              ${params.fontFamily && !(window.jspenApp ? window.jspenApp.fontChoices() : []).some(([v]) => v === params.fontFamily) ? `<option value="${escapeHtml(params.fontFamily)}" selected>${escapeHtml(params.fontFamily)}</option>` : ''}
            </select>
            <button class="btn btn-secondary btn-sm" data-act-font-upload title="글꼴 파일(.ttf/.otf/.woff/.woff2)을 문서에 추가" style="margin-left:4px;padding:2px 6px;">+</button>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">글자 색상:</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" data-param-key="color" value="${escapeHtml(params.color && params.color.startsWith('#') ? params.color : '#ffffff')}">
              <span class="ps-val-tag">${escapeHtml(params.color || '#ffffff')}</span>
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">글자 굵기:</label>
            <select class="ps-select" data-param-key="fontWeight">
              <option value="normal" ${(params.fontWeight || 'normal') === 'normal' ? 'selected' : ''}>보통 (Normal)</option>
              <option value="bold" ${params.fontWeight === 'bold' ? 'selected' : ''}>굵게 (Bold)</option>
              <option value="300" ${params.fontWeight === '300' ? 'selected' : ''}>가늘게 (Light)</option>
              <option value="900" ${params.fontWeight === '900' ? 'selected' : ''}>매우 굵게 (Black)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">가로 정렬:</label>
            <select class="ps-select" data-param-key="textAlign">
              <option value="center" ${(params.textAlign || 'center') === 'center' ? 'selected' : ''}>가운데 정렬</option>
              <option value="left" ${params.textAlign === 'left' ? 'selected' : ''}>왼쪽 정렬</option>
              <option value="right" ${params.textAlign === 'right' ? 'selected' : ''}>오른쪽 정렬</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">세로 정렬:</label>
            <select class="ps-select" data-param-key="valign">
              <option value="middle" ${(params.valign || 'middle') === 'middle' ? 'selected' : ''}>중앙 (Middle)</option>
              <option value="top" ${params.valign === 'top' ? 'selected' : ''}>상단 (Top)</option>
              <option value="bottom" ${params.valign === 'bottom' ? 'selected' : ''}>하단 (Bottom)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">줄 간격 (배수):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="lineHeight" step="0.05" min="1" max="3" value="${escapeHtml(params.lineHeight || 1.35)}">
            </div>
          </div>
        `;
      } else if (mod.type === 'path_follower') {
        const pathSprites = [];
        for (const ly of this.doc.layers) {
          for (const sp of ly.sprites) {
            if (sp.type === 'path' && sp.id !== sprite.id) {
              pathSprites.push({ id: sp.id, name: `${sp.name} (${ly.name})` });
            }
          }
        }
        typeSpecificHtml = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">주행 경로 (Path):</label>
            <select class="ps-select" data-param-key="pathSpriteId">
              <option value="">-- 경로 스프라이트 선택 --</option>
              ${pathSprites.map(p => `<option value="${escapeHtml(p.id)}" ${(params.pathSpriteId || params.pathLayerId) === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`).join('')}
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">주행 속도:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="speed" step="0.1" min="0.1" max="10" value="${escapeHtml(params.speed !== undefined ? params.speed : 1)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">진행 방향 자동 회전:</label>
            <select class="ps-select" data-param-key="autoRotate">
              <option value="true" ${params.autoRotate !== false ? 'selected' : ''}>사용 (곡선 탄젠트 각도 회전)</option>
              <option value="false" ${params.autoRotate === false ? 'selected' : ''}>사용 안 함</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">반복 모드:</label>
            <select class="ps-select" data-param-key="loopMode">
              <option value="loop" ${(params.loopMode || 'loop') === 'loop' ? 'selected' : ''}>무한 반복 (Loop)</option>
              <option value="pingpong" ${params.loopMode === 'pingpong' ? 'selected' : ''}>왕복 (Ping-Pong)</option>
              <option value="once" ${params.loopMode === 'once' ? 'selected' : ''}>1회 주행 후 정지</option>
            </select>
          </div>
        `;
      } else if (mod.type === 'substance_mask') {
        typeSpecificHtml = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">마스크 종류:</label>
            <select class="ps-select" data-param-key="maskType">
              <option value="white" ${(params.maskType || 'white') === 'white' ? 'selected' : ''}>화이트 마스크 (전체 통과 - Reveal All)</option>
              <option value="black" ${params.maskType === 'black' ? 'selected' : ''}>블랙 마스크 (전체 가림 - Conceal All)</option>
              <option value="clip" ${params.maskType === 'clip' ? 'selected' : ''}>클리핑 마스크 (타겟 형태 투과 - Clip)</option>
              <option value="invert" ${params.maskType === 'invert' ? 'selected' : ''}>반전 마스크 (Invert Mask)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">마스크 강도 (%):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="intensity" min="0" max="100" value="${escapeHtml(params.intensity !== undefined ? params.intensity : 100)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">마스크 반전 (Invert):</label>
            <select class="ps-select" data-param-key="invert">
              <option value="false" ${!params.invert ? 'selected' : ''}>정방향 (Normal)</option>
              <option value="true" ${params.invert ? 'selected' : ''}>반전 (Inverted)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">페더 / 흐림 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="feather" min="0" max="50" value="${escapeHtml(params.feather || 0)}">
            </div>
          </div>
          <div class="ps-prop-row" id="rowSubMaskTarget" style="${(params.maskType === 'clip' || params.maskType === 'invert') ? '' : 'display:none;'}">
            <label class="ps-prop-label">클리핑 대상:</label>
            <select class="ps-select" data-param-key="targetSpriteId">
              <option value="">(바로 아래 스프라이트에 클리핑)</option>
              ${allSprites.map(s => `
                <option value="${escapeHtml(s.id)}" ${params.targetSpriteId === s.id ? 'selected' : ''}>${escapeHtml(s.name)} [${escapeHtml(s.type)}]</option>
              `).join('')}
            </select>
          </div>
        `;
      } else if (mod.type === 'photoshop_filter') {
        typeSpecificHtml = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">작동 모드:</label>
            <select class="ps-select" data-param-key="mode">
              <option value="static" ${(params.mode || 'static') === 'static' ? 'selected' : ''}>정적 필터 (Static)</option>
              <option value="pulse" ${params.mode === 'pulse' ? 'selected' : ''}>박동 펄스 (Pulse Animation)</option>
              <option value="reactive" ${params.mode === 'reactive' ? 'selected' : ''}>마우스 거리 반응 (Reactive)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">가우시안 블러 (px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="blur" min="0" max="60" value="${escapeHtml(params.blur || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">밝기 (Brightness %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="brightness" min="0" max="300" value="${escapeHtml(params.brightness !== undefined ? params.brightness : 100)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">대비 (Contrast %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="contrast" min="0" max="300" value="${escapeHtml(params.contrast !== undefined ? params.contrast : 100)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">채도 (Saturation %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="saturate" min="0" max="300" value="${escapeHtml(params.saturate !== undefined ? params.saturate : 100)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">흑백 (Grayscale %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="grayscale" min="0" max="100" value="${escapeHtml(params.grayscale || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">세피아 (Sepia %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="sepia" min="0" max="100" value="${escapeHtml(params.sepia || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">색조 회전 (Hue deg):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="hueRotate" min="0" max="360" value="${escapeHtml(params.hueRotate || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">색상 반전 (Invert %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="invert" min="0" max="100" value="${escapeHtml(params.invert || 0)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">알파 투명도 (Opacity %):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="opacity" min="0" max="100" value="${escapeHtml(params.opacity !== undefined ? params.opacity : 100)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">소프트 그림자:</label>
            <select class="ps-select" data-param-key="dropShadow">
              <option value="false" ${!params.dropShadow ? 'selected' : ''}>없음 (None)</option>
              <option value="true" ${params.dropShadow ? 'selected' : ''}>적용 (Drop Shadow)</option>
            </select>
          </div>
        `;
      } else if (mod.type === 'hyperlink') {
        typeSpecificHtml = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">이동 링크 URL:</label>
            <input type="text" class="ps-input" data-param-key="url" placeholder="https://... 또는 #section" value="${escapeHtml(params.url || '')}">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">열기 방식 (Target):</label>
            <select class="ps-select" data-param-key="target">
              <option value="_blank" ${(params.target || '_blank') === '_blank' ? 'selected' : ''}>새 탭에서 열기 (_blank)</option>
              <option value="_self" ${params.target === '_self' ? 'selected' : ''}>현재 창에서 열기 (_self)</option>
            </select>
          </div>
          
          <div class="ps-prop-row">
            <label class="ps-prop-label">이동 시점:</label>
            <select class="ps-select" data-param-key="trigger">
              ${['click', 'hover', 'signal'].includes(params.trigger || 'click') ? '' : `<option value="${escapeHtml(params.trigger)}" selected>(이전 값: ${escapeHtml(params.trigger)})</option>`}
              <option value="click" ${(params.trigger || 'click') === 'click' ? 'selected' : ''}>클릭할 때</option>
              <option value="hover" ${params.trigger === 'hover' ? 'selected' : ''}>마우스를 올릴 때</option>
              <option value="signal" ${params.trigger === 'signal' ? 'selected' : ''}>신호를 받을 때</option>
            </select>
          </div>
          ${params.trigger === 'signal' ? this.renderParamField(InspectorPanelUI.fieldOf(def, 'signalName', mod), 'signalName', params.signalName || '', linkCtx) : ''}
          <div class="ps-prop-row">
            <label class="ps-prop-label">인페이지 앵커 ID:</label>
            <input type="text" class="ps-input" data-param-key="anchorId" placeholder="예: features, pricing" value="${escapeHtml(params.anchorId || '')}">
          </div>
          <div class="ps-prop-row" style="margin-top:6px;">
            <button class="btn btn-secondary btn-sm" id="btnTestModDetailLink" style="width:100%;justify-content:center;color:#e4e4e7;border-color:#e4e4e7;gap:6px;" ${!params.url ? 'disabled' : ''}>
              브라우저에서 링크 바로 열기 (테스트)
            </button>
          </div>
        `;
      } else if (mod.type === 'motion_wave') {
        typeSpecificHtml = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">진동 축 (Axis):</label>
            <select class="ps-select" data-param-key="axis">
              <option value="y" ${(params.axis || 'y') === 'y' ? 'selected' : ''}>Y축 (상하 부유)</option>
              <option value="x" ${params.axis === 'x' ? 'selected' : ''}>X축 (좌우 흔들림)</option>
              <option value="both" ${params.axis === 'both' ? 'selected' : ''}>XY 복합 (원형)</option>
              <option value="rotation" ${params.axis === 'rotation' ? 'selected' : ''}>회전 틸트 (Rotation)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">진폭 (Amplitude px):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="amplitude" min="1" max="100" value="${escapeHtml(params.amplitude || 10)}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">주파수 (Hz):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="frequency" min="0.1" max="5" step="0.1" value="${escapeHtml(params.frequency || 1)}">
            </div>
          </div>
        `;
      } else {
        // Settings in the registry's order, then any extra ones a file carries.
        const skip = ['condition', 'conditionMode', 'conditionDuration', 'condKey', 'condSignal', 'condStartFrame', 'condEndFrame', 'targetModuleId', 'outputResult']
          .concat(def.paramHidden || []);
        const keys = [...new Set([...Object.keys(def.defaultParams || {}), ...Object.keys(params)])]
          .filter(k => !skip.includes(k) && InspectorPanelUI.fieldShown(def, params, k));
        if (mod.type === 'action_rules') {
          typeSpecificHtml = this.renderActionSteps(mod, sprite, linkCtx);
        } else {
          typeSpecificHtml = (def.advanced ? `<div class="jspen-advanced-note">코드를 직접 쓰는 고급 모듈입니다. 이동, 색 바꾸기, 신호·변수 같은 동작은 '동작 블록 (언제 → 무엇을)' 모듈로 코드 없이 만들 수 있습니다.</div>` : '') +
            keys.map(key => this.renderParamField(InspectorPanelUI.fieldOf(def, key, mod), key, params[key] !== undefined ? params[key] : (def.defaultParams || {})[key], linkCtx)).join('');
        }
      }

      return `
        <!-- Module Header -->
        <div class="ps-prop-section" style="border-left: 3px solid #38bdf8;">
          <div class="ps-prop-header" style="justify-content:space-between; align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;">
              <span class="ps-val-tag" style="background:#0f172a;color:#e4e4e7;padding:2px 6px;font-weight:bold;">${escapeHtml(def.icon || 'MOD')}</span>
              <span style="font-weight:700;color:#f1f5f9;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(mod.name)}</span>
            </div>
            
          </div>

          <div class="ps-prop-row" style="margin-top:8px;">
            <label class="ps-prop-label">소속 스프라이트:</label>
            <span class="ps-val-tag ps-val-name" title="${escapeHtml(sprite ? sprite.name : '없음')}">${escapeHtml(sprite ? sprite.name : '없음')}</span>
          </div>

          <div class="ps-prop-row">
            <label class="ps-prop-label">모듈 활성화 (ON/OFF):</label>
            <select class="ps-select" id="modEnabledSelect">
              <option value="true" ${mod.enabled !== false ? 'selected' : ''}>활성화 (ON)</option>
              <option value="false" ${mod.enabled === false ? 'selected' : ''}>비활성화 (OFF)</option>
            </select>
          </div>

        </div>

        ${this.renderConditionSection(mod)}

        <!-- Parameter Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">모듈 상세 설정</div>
          ${typeSpecificHtml}
        </div>

        <!-- Action Tools Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">모듈 순서 및 관리</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-top:6px;">
            <button class="btn btn-secondary btn-sm" id="modDetailMoveUp" ${isFirst ? 'disabled' : ''}>▲ 위로 이동</button>
            <button class="btn btn-secondary btn-sm" id="modDetailMoveDown" ${isLast ? 'disabled' : ''}>▼ 아래로 이동</button>
            <button class="btn btn-secondary btn-sm" id="modDetailDuplicate">복제 (Duplicate)</button>
            <button class="btn btn-secondary btn-sm" id="modDetailDelete" style="color:#ef4444;border-color:#ef4444;">✕ 삭제</button>
          </div>
        </div>
      `;
    }

    // "언제 작동하나요?" - the module's trigger condition, the fields that
    // condition needs, how long it then runs, and a plain-language summary.
    static conditionInfo() {
      return {
        always: ['항상', '미리보기(Ctrl+Space)를 시작하면 바로 작동합니다.'],
        on_hover: ['마우스를 올렸을 때', '마우스 포인터가 이 스프라이트 위에 있을 때 작동합니다.'],
        on_click: ['클릭했을 때', '이 스프라이트를 클릭하면 작동합니다.'],
        key_press: ['키를 눌렀을 때', '지정한 키보드 키를 누르면 작동합니다.'],
        on_signal: ['신호를 받았을 때', '다른 모듈이나 화면 트리거가 보낸 신호를 받으면 작동합니다.'],
        on_trigger: ['화면 트리거가 가리킬 때', '화면 트리거 스프라이트의 "연결 모듈 실행" 대상이 이 스프라이트일 때 작동합니다.'],
        on_toggle: ['토글이 켜져 있을 때', '이 스프라이트의 토글 스위치 모듈이 켜짐 상태일 때 작동합니다.'],
        timeline_active: ['타임라인 구간 안에서', '타임라인 재생 위치가 지정한 프레임 구간 안에 있을 때 작동합니다.']
      };
    }

    // A link is always ready; it opens at its own moment.
    static linkSummary(p) {
      const when = { hover: '마우스를 올리면', signal: `'${p.signalName || '(신호 이름 없음)'}' 신호를 받으면` }[p.trigger] || '클릭하면';
      return `링크가 켜져 있고, ${when} 이동합니다. 켜자마자 이동하지는 않습니다.`;
    }

    // ---- Fields shared by module panels and action steps ----------------------
    // f: { label, type, options, range: [min, max, step], empty, unit, dial }.
    // ctx: { allSprites, catalog, step } (step: index of an action step).
    static fieldOf(def, key, mod) {
      const f = {
        label: (def.paramLabels && def.paramLabels[key]) || key,
        type: def.paramTypes && def.paramTypes[key],
        options: def.paramOptions && def.paramOptions[key],
        range: def.paramRanges && def.paramRanges[key],
        empty: def.paramEmpty && def.paramEmpty[key]
      };
      if (key === 'targetSpriteId' || key === 'messageSpriteId') {
        f.type = 'sprite';
        f.empty = f.empty || (key === 'messageSpriteId' ? '표시 안 함' : (mod.type === 'distance_rope' || mod.type === 'follow_target' ? '마우스 커서' : '모든 스프라이트'));
      }
      return f;
    }

    // paramShowIf: { field: [otherField, ...values] } - shown only for those values.
    static fieldShown(def, params, key) {
      const rule = def.paramShowIf && def.paramShowIf[key];
      if (!rule) return true;
      const [ctl, ...vals] = rule;
      const v = params && params[ctl] !== undefined ? params[ctl] : (def.defaultParams || {})[ctl];
      return vals.map(String).includes(String(v));
    }

    static controlsShowIf(def, key) {
      return Object.values(def.paramShowIf || {}).some(rule => rule[0] === key);
    }

    // Fill of a slider with a known range (Blender's bar inside the field).
    static updateFill(input) {
      const group = input.closest('.blender-scrub-group');
      const min = parseFloat(input.min), max = parseFloat(input.max);
      if (!group || !isFinite(min) || !isFinite(max) || !(max > min)) return;
      const v = parseFloat(input.value);
      group.classList.add('is-factor');
      group.style.setProperty('--fill', Math.max(0, Math.min(1, ((isFinite(v) ? v : min) - min) / (max - min))) * 100 + '%');
    }

    renderParamField(f, key, value, ctx) {
      const step = ctx.step !== undefined ? ` data-step="${escapeHtml(ctx.step)}"` : '';
      const at = `data-param-key="${escapeHtml(key)}"${step}`;
      let label = String(f.label || key), unit = f.unit || '';
      const um = !unit && label.match(/\s*\((px|초|도|%|배|Hz|ms)\)\s*$/);
      if (um) { unit = um[1]; label = label.slice(0, um.index); }
      const row = (control, after = '') => `
            <div class="ps-prop-row">
              <label class="ps-prop-label">${escapeHtml(label)}:</label>
              ${control}
            </div>${after}`;
      const type = f.type;
      if (type === 'sprite') {
        return row(`<select class="ps-select" ${at}>
                <option value="">(${escapeHtml(f.empty || '없음')})</option>
                ${ctx.allSprites.map(sp => `<option value="${escapeHtml(sp.id)}" ${value === sp.id ? 'selected' : ''}>${escapeHtml(sp.name)}</option>`).join('')}
              </select>`);
      }
      if (type === 'layer') {
        return row(`<select class="ps-select" ${at}>
                <option value="">(${escapeHtml(f.empty || '없음')})</option>
                ${this.doc.layers.map(l => `<option value="${escapeHtml(l.id)}" ${value === l.id ? 'selected' : ''}>${escapeHtml(l.name)}</option>`).join('')}
              </select>`);
      }
      if (type === 'signal-in' || type === 'signal-out' || type === 'var') {
        return row(this.renderLinkPicker(type, value, at, f.empty, ctx.catalog), InspectorPanelUI.linkNote(type, value, ctx.catalog));
      }
      if (type === 'template') {
        const parts = String(value || '').split('{value}');
        if (!value || parts.length === 2) {
          const on = parts.length === 2;
          return row(`<input type="checkbox" class="jspen-checkbox" data-template="${escapeHtml(key)}" data-template-part="on" ${on ? 'checked' : ''} aria-label="${escapeHtml(label)}">`) + `
            <div class="ps-prop-row jspen-template-row" ${on ? '' : 'hidden'}>
              <label class="ps-prop-label">표시 모양:</label>
              <input type="text" class="ps-input" data-template="${escapeHtml(key)}" data-template-part="prefix" placeholder="앞 글자 (예: 점수: )" value="${escapeHtml(on ? parts[0] : '')}">
              <span class="jspen-template-value">값</span>
              <input type="text" class="ps-input" data-template="${escapeHtml(key)}" data-template-part="suffix" placeholder="뒤 글자 (예: 점)" value="${escapeHtml(on ? parts[1] : '')}">
            </div>`;
        }
        return row(`<input type="text" class="ps-input" ${at} value="${escapeHtml(value)}">`);
      }
      if (f.options) {
        // A value from an older file that is not in the list stays visible.
        const known = f.options.some(([v]) => String(v) === String(value));
        return row(`<select class="ps-select" ${at}>
                ${known || value === undefined || value === '' ? '' : `<option value="${escapeHtml(value)}" selected>(이전 값: ${escapeHtml(value)})</option>`}
                ${f.options.map(([v, l]) => `<option value="${escapeHtml(v)}" ${String(value) === String(v) ? 'selected' : ''}>${escapeHtml(l)}</option>`).join('')}
              </select>`);
      }
      if (type === 'color') {
        const hex = /^#[0-9a-f]{6}$/i.test(String(value)) ? value : (/^#[0-9a-f]{3}$/i.test(String(value)) ? '#' + String(value).slice(1).split('').map(c => c + c).join('') : '#000000');
        return row(`<span class="jspen-color-field ${value ? '' : 'is-empty'}">
                <input type="color" ${at} data-param-type="color" value="${escapeHtml(hex)}" aria-label="${escapeHtml(label)}">
                ${f.empty ? `<button type="button" class="jspen-color-clear" data-param-clear="${escapeHtml(key)}"${ctx.step !== undefined ? ` data-clear-step="${escapeHtml(ctx.step)}"` : ''} title="${escapeHtml(f.empty)}">${value ? '×' : escapeHtml(f.empty)}</button>` : ''}
              </span>`);
      }
      if (type === 'key') {
        return row(`<input type="text" readonly class="ps-input jspen-key-field" ${at} data-param-type="key" value="${escapeHtml(InspectorPanelUI.keyLabel(value))}" title="클릭한 뒤 원하는 키를 누르세요">`);
      }
      if (typeof value === 'boolean') {
        return row(`<input type="checkbox" class="jspen-checkbox" ${at} ${value ? 'checked' : ''} aria-label="${escapeHtml(label)}">`);
      }
      if (typeof value === 'number') {
        const [min, max, stepSize] = f.range || [null, null, InspectorPanelUI.stepFor(value)];
        const ranged = isFinite(min) && isFinite(max) && min !== null && max !== null && max > min;
        const fill = ranged ? Math.max(0, Math.min(1, (value - min) / (max - min))) * 100 : 0;
        const dial = f.dial || unit === '도';
        return row(`<div class="blender-scrub-group jspen-param-scrub ${ranged ? 'is-factor' : ''}" ${ranged ? `style="--fill:${escapeHtml(fill)}%"` : ''}>
                <input type="number" class="blender-scrub-input" ${at} step="${escapeHtml(stepSize)}" ${min !== null ? `min="${escapeHtml(min)}"` : ''} ${max !== null ? `max="${escapeHtml(max)}"` : ''} value="${escapeHtml(value)}" aria-label="${escapeHtml(label)}">
                ${unit ? `<span class="jspen-unit">${escapeHtml(unit)}</span>` : ''}
              </div>${dial ? `<span class="jspen-dial" title="돌려서 각도 조절 (Shift: 15° 단위)"><span class="jspen-dial-needle" style="transform:rotate(${escapeHtml(Number(value) || 0)}deg)"></span></span>` : ''}`);
      }
      if (type === 'code') {
        return `
            <div class="ps-prop-row" style="flex-direction:column;align-items:stretch;gap:4px;">
              <label class="ps-prop-label">${escapeHtml(label)}: <span style="color:#71717a;font-weight:400;">(api.self, api.find(), api.mouse, api.time, api.vars, api.emit() …)</span></label>
              <textarea class="ps-input jspen-code-input" ${at} data-param-type="code" rows="10" spellcheck="false"
                style="font-family:Consolas,'Courier New',monospace;font-size:11px;line-height:1.45;white-space:pre;tab-size:2;resize:vertical;min-height:140px;">${escapeHtml(value || '')}</textarea>
            </div>`;
      }
      return row(`<input type="text" class="ps-input" ${at} value="${escapeHtml(value ?? '')}">`);
    }

    // ---- Signals and variables chosen from lists -------------------------------
    // Every signal / variable name in the document with who sends and receives
    // it (signals) or changes and reads it (variables).
    static linkCatalog(doc) {
      const signals = new Map(), vars = new Map();
      const add = (map, name, side, who) => {
        name = String(name ?? '').trim();
        if (!name || name === '*') return;
        if (!map.has(name)) map.set(name, { out: [], in: [] });
        map.get(name)[side].push(who);
      };
      const S = (n, side, who) => add(signals, n, side, who), V = (n, side, who) => add(vars, n, side, who);
      // Senders that send a default name when theirs is left empty.
      const fallback = { collision_detector: { signalName: 'collision' }, viewport_visibility: { signalName: 'visible' }, timer_interval: { signalName: 'timer_tick' },
        signal_relay: { outputSignal: 'signal_relayed' }, form_submit: { successSignal: 'form_success', errorSignal: 'form_error' } };
      const scan = (m, owner, sp) => {
        const def = MODULE_REGISTRY[m.type] || {}, p = m.params || {}, d = def.defaultParams || {};
        const val = k => (p[k] !== undefined ? p[k] : d[k]);
        const who = owner + ' › ' + (m.name || def.name || m.type);
        if (p.condition === 'on_signal') S(ModuleEngine.conditionSignal(m), 'in', who);
        for (const [k, t] of Object.entries(def.paramTypes || {})) {
          if (!InspectorPanelUI.fieldShown(def, p, k)) continue;
          if (t === 'signal-out') S(val(k) || (fallback[m.type] || {})[k] || (m.type === 'screen_trigger' && sp ? 'trig_' + sp.id : ''), 'out', who);
          else if (t === 'signal-in') S(p[k], 'in', who);
          else if (t === 'var') V(val(k), m.type === 'global_variable' ? 'out' : 'in', who);
        }
        const fixed = {
          draggable: ['drag_start', 'drag_end'], hover_proximity: ['hover_enter', 'hover_exit'], toggle_switch: ['toggle_on', 'toggle_off'],
          counter_accumulator: ['counter_tick', 'counter_max'], wall_bounce: ['wall_bounce'], scene_transition: ['scene_change'], scroll_wheel: ['wheel_up', 'wheel_down']
        }[m.type] || [];
        for (const n of fixed) S(n, 'out', who);
        if (m.type === 'keyboard_trigger') S('key_' + (val('targetKey') || 'ArrowRight'), 'out', who);
        if (m.type === 'global_variable' && val('action') !== 'read') S('var_' + (val('varName') || 'var'), 'out', who);
        if (m.type === 'click_gesture') S(p.signalName || ('gesture_' + (val('gestureType') || 'click')), 'out', who);
        if (m.type === 'step_sequencer') for (let i = 1; i <= Math.min(32, Number(val('stepCount')) || 0); i++) S((val('signalPrefix') || 'step_') + i, 'out', who);
        if (m.type === 'custom_script') {
          const code = String(p.code || '');
          for (const x of code.matchAll(/\bemit\(\s*['"]([^'"]+)['"]/g)) S(x[1], 'out', who);
          for (const x of code.matchAll(/\bhasSignal\(\s*['"]([^'"]+)['"]/g)) S(x[1], 'in', who);
          for (const x of code.matchAll(/\bvars\.(get|set|add)\(\s*['"]([^'"]+)['"]/g)) V(x[2], x[1] === 'get' ? 'in' : 'out', who);
        }
        if (m.type === 'action_rules') {
          for (const st of Array.isArray(p.steps) ? p.steps : []) {
            if (st.type === 'emit') S(st.signal, 'out', who);
            if (st.type === 'set_var' || st.type === 'add_var') V(st.varName, 'out', who);
            if (st.type === 'if_var' || st.type === 'show_var') V(st.varName, 'in', who);
          }
        }
      };
      for (const l of doc.layers) {
        for (const m of l.modules || []) scan(m, l.name + ' (레이어)');
        for (const sp of l.sprites) {
          if (sp.type === 'screen_trigger') S(sp.signalName || ('trig_' + sp.id), 'out', sp.name);
          for (const m of sp.modules || []) scan(m, sp.name, sp);
        }
      }
      return { signals, vars };
    }

    // What a built-in signal means.
    static signalHint(name) {
      const fixed = {
        drag_start: '드래그 시작', drag_end: '드래그 끝', hover_enter: '마우스가 올라옴', hover_exit: '마우스가 나감',
        form_success: '폼 전송 성공', form_error: '폼 전송 실패', toggle_on: '토글 켜짐', toggle_off: '토글 꺼짐',
        counter_tick: '카운터 증가', counter_max: '카운터 최대', wall_bounce: '벽에 부딪힘', scene_change: '섹션 이동',
        wheel_up: '휠 위로', wheel_down: '휠 아래로', collision: '충돌', visible: '화면에 보임', timer_tick: '타이머', mouse_move: '마우스 이동'
      };
      if (fixed[name]) return fixed[name];
      let m;
      if ((m = /^key_(.+)$/.exec(name))) return InspectorPanelUI.keyLabel(m[1]) + ' 키';
      if ((m = /^var_(.+)$/.exec(name))) return `'${m[1]}' 변수가 바뀜`;
      if ((m = /^gesture_(.+)$/.exec(name))) return { click: '클릭', double_click: '더블 클릭', long_press: '길게 누르기' }[m[1]] || '';
      return '';
    }

    renderLinkPicker(kind, value, attrs, emptyLabel, catalog) {
      const isVar = kind === 'var', map = isVar ? catalog.vars : catalog.signals;
      value = String(value ?? '');
      const names = [...map.keys()];
      if (value && !map.has(value)) names.push(value);
      names.sort((a, b) => a.localeCompare(b));
      const text = n => {
        const e = map.get(n) || { out: [], in: [] }, hint = isVar ? '' : InspectorPanelUI.signalHint(n);
        return `${n}${hint ? ` (${hint})` : ''} · ${isVar ? `바꿈 ${e.out.length} · 읽음 ${e.in.length}` : `보냄 ${e.out.length} · 받음 ${e.in.length}`}`;
      };
      return `<select class="ps-select jspen-link-pick" ${attrs} data-param-type="${isVar ? 'var' : 'signal'}" data-link="${escapeHtml(kind)}">
                <option value="" ${value ? '' : 'selected'}>(${escapeHtml(emptyLabel || '없음')})</option>
                ${names.map(n => `<option value="${escapeHtml(n)}" ${n === value ? 'selected' : ''}>${escapeHtml(text(n))}</option>`).join('')}
                <option value="__new__">＋ 새 ${isVar ? '변수' : '신호'} 만들기…</option>
              </select>`;
    }

    // The other end of a connection, under its picker; a broken one is flagged.
    static linkNote(kind, value, catalog) {
      value = String(value ?? '').trim();
      if (!value || value === '*') return '';
      const list = arr => { const u = [...new Set(arr)]; return u.slice(0, 3).join(', ') + (u.length > 3 ? ` 외 ${u.length - 3}곳` : ''); };
      let cls = '', text;
      if (kind === 'var') {
        const e = catalog.vars.get(value) || { out: [], in: [] };
        if (!e.out.length) { cls = 'is-warn'; text = '⚠ 이 변수를 바꾸는 곳이 없습니다. 값이 계속 0입니다.'; }
        else text = `바꾸는 곳: ${list(e.out)}${e.in.length ? ` · 읽는 곳: ${list(e.in)}` : ''}`;
      } else {
        const e = catalog.signals.get(value) || { out: [], in: [] };
        if (kind === 'signal-in') {
          if (!e.out.length) { cls = 'is-warn'; text = '⚠ 이 신호를 보내는 곳이 없습니다. 보내는 모듈에서 같은 신호를 고르세요.'; }
          else text = '보내는 곳: ' + list(e.out);
        } else {
          if (!e.in.length) { cls = 'is-info'; text = '아직 이 신호를 받는 곳이 없습니다.'; }
          else text = '받는 곳: ' + list(e.in);
        }
      }
      return `<div class="jspen-link-note ${cls}">${escapeHtml(text)}</div>`;
    }

    // "＋ 새 신호 만들기": the list turns into a name field (Enter keeps it, Esc cancels).
    askNewName(select, kind, done) {
      const input = document.createElement('input');
      input.type = 'text';
      input.className = 'ps-input jspen-new-name';
      input.placeholder = kind === 'var' ? '새 변수 이름 (예: 점수)' : '새 신호 이름 (예: 문 열기)';
      select.style.display = 'none';
      select.after(input);
      input.focus();
      let finished = false;
      const finish = ok => {
        if (finished) return;
        finished = true;
        const v = input.value.trim();
        if (ok && v) done(v); else this.render();
      };
      input.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter') { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      input.addEventListener('blur', () => finish(true));
    }

    // ---- Action blocks ("언제 → 무엇을") ---------------------------------------
    static actionCatalog() {
      const ease = [['easeOutCubic', '부드럽게 멈춤'], ['linear', '일정한 속도'], ['easeInOutQuad', '천천히 출발해 천천히 멈춤'],
        ['easeOutBack', '살짝 지나쳤다 돌아옴'], ['bounceOut', '통통 튀며 멈춤'], ['elasticOut', '고무줄처럼']];
      const who = { type: 'sprite', label: '대상', empty: '이 스프라이트' };
      const time = { label: '걸리는 시간', unit: '초', range: [0, 10, 0.05] };
      const how = { label: '움직임', options: ease };
      const v = { label: '변수', type: 'var', empty: '고르세요' };
      return {
        move_by: { group: '움직이기', label: '이동하기', defaults: { spriteId: '', dx: 100, dy: 0, duration: 0.5, ease: 'easeOutCubic' },
          fields: { spriteId: who, dx: { label: '가로 (+오른쪽)', unit: 'px' }, dy: { label: '세로 (+아래)', unit: 'px' }, duration: time, ease: how } },
        move_to: { group: '움직이기', label: '정한 위치로 이동', defaults: { spriteId: '', x: 0, y: 0, duration: 0.5, ease: 'easeOutCubic' },
          fields: { spriteId: who, x: { label: 'X 위치', unit: 'px' }, y: { label: 'Y 위치', unit: 'px' }, duration: time, ease: how } },
        rotate_by: { group: '움직이기', label: '회전하기', defaults: { spriteId: '', deg: 90, duration: 0.5, ease: 'easeOutCubic' },
          fields: { spriteId: who, deg: { label: '돌릴 각도', unit: '도', dial: true, range: [-720, 720, 1] }, duration: time, ease: how } },
        scale_to: { group: '움직이기', label: '크기 바꾸기', defaults: { spriteId: '', scale: 1.2, duration: 0.3, ease: 'easeOutBack' },
          fields: { spriteId: who, scale: { label: '크기', unit: '배', range: [0, 5, 0.01] }, duration: time, ease: how } },
        reset: { group: '움직이기', label: '원래대로 되돌리기', defaults: { spriteId: '', duration: 0.4, ease: 'easeOutCubic' },
          fields: { spriteId: who, duration: time, ease: how } },
        fade_to: { group: '모양', label: '투명도 바꾸기', defaults: { spriteId: '', opacity: 0.3, duration: 0.4 },
          fields: { spriteId: who, opacity: { label: '불투명도', range: [0, 1, 0.01] }, duration: time } },
        color_to: { group: '모양', label: '색 바꾸기', defaults: { spriteId: '', color: '#38bdf8', duration: 0.3 },
          fields: { spriteId: who, color: { label: '색', type: 'color' }, duration: time } },
        show: { group: '모양', label: '보이기', defaults: { spriteId: '' }, fields: { spriteId: who } },
        hide: { group: '모양', label: '숨기기', defaults: { spriteId: '' }, fields: { spriteId: who } },
        toggle_visible: { group: '모양', label: '보이기 / 숨기기 전환', defaults: { spriteId: '' }, fields: { spriteId: who } },
        set_text: { group: '모양', label: '글자 바꾸기', defaults: { spriteId: '', text: '새 글자' },
          fields: { spriteId: who, text: { label: '글자', type: 'text' } } },
        show_var: { group: '모양', label: '변수 값을 글자로 보여주기', defaults: { spriteId: '', varName: '', prefix: '', suffix: '' },
          fields: { spriteId: who, varName: v, prefix: { label: '앞 글자', type: 'text' }, suffix: { label: '뒤 글자', type: 'text' } } },
        emit: { group: '신호 · 변수', label: '신호 보내기', defaults: { signal: '' }, fields: { signal: { label: '보낼 신호', type: 'signal-out', empty: '고르세요' } } },
        set_var: { group: '신호 · 변수', label: '변수 정하기', defaults: { varName: '', value: 0 }, fields: { varName: v, value: { label: '값' } } },
        add_var: { group: '신호 · 변수', label: '변수에 더하기', defaults: { varName: '', value: 1 }, fields: { varName: v, value: { label: '더할 값 (빼려면 -)' } } },
        if_var: { group: '흐름', label: '변수가 맞을 때만 계속', defaults: { varName: '', compare: '>=', value: 10 },
          fields: { varName: v, compare: { label: '비교', options: [['>=', '이상 (≥)'], ['>', '초과 (>)'], ['==', '같음 (=)'], ['!=', '다름 (≠)'], ['<=', '이하 (≤)'], ['<', '미만 (<)']] }, value: { label: '기준값' } } },
        wait: { group: '흐름', label: '기다리기', defaults: { seconds: 0.5 }, fields: { seconds: { label: '기다릴 시간', unit: '초', range: [0, 60, 0.05] } } },
        sound: { group: '소리 · 이동', label: '효과음 내기', defaults: { sound: 'pop', volume: 0.6 },
          fields: { sound: { label: '효과음', options: MODULE_REGISTRY.synth_sfx.paramOptions.sound }, volume: { label: '볼륨', range: [0, 1, 0.01] } } },
        open_link: { group: '소리 · 이동', label: '링크 열기', defaults: { url: 'https://', newTab: true },
          fields: { url: { label: '주소', type: 'text' }, newTab: { label: '새 탭에서 열기' } } },
        go_to: { group: '소리 · 이동', label: '섹션으로 스크롤', defaults: { spriteId: '' },
          fields: { spriteId: { type: 'sprite', label: '보여줄 섹션', empty: '고르세요' } } }
      };
    }

    // One line per step: "버튼: 오른쪽 100px 이동 · 0.5초".
    static actionSummary(st, doc) {
      const who = id => { if (!id) return '이 스프라이트'; const sp = doc.findSpriteById(id); return sp ? sp.name : '(없는 스프라이트)'; };
      const n = v => { const x = Number(v) || 0; return Number.isInteger(x) ? String(x) : String(+x.toFixed(2)); };
      const time = (Number(st.duration) || 0) > 0 ? ` · ${n(st.duration)}초` : ' · 바로';
      const dir = (v, pos, neg) => (Number(v) || 0) === 0 ? '' : `${Number(v) > 0 ? pos : neg} ${n(Math.abs(v))}px`;
      const vn = st.varName ? `'${st.varName}'` : '(변수 없음)';
      const t = who(st.spriteId);
      switch (st.type) {
        case 'move_by': { const d = [dir(st.dx, '오른쪽', '왼쪽'), dir(st.dy, '아래', '위')].filter(Boolean).join(', '); return `${t}: ${d || '제자리'} 이동${time}`; }
        case 'move_to': return `${t}: (${n(st.x)}, ${n(st.y)}) 위치로 이동${time}`;
        case 'rotate_by': return `${t}: ${Number(st.deg) < 0 ? '반시계 방향' : '시계 방향'} ${n(Math.abs(st.deg))}도 회전${time}`;
        case 'scale_to': return `${t}: 크기 ${n(st.scale)}배${time}`;
        case 'reset': return `${t}: 원래 위치·크기·색으로${time}`;
        case 'fade_to': return `${t}: 불투명도 ${Math.round((Number(st.opacity) || 0) * 100)}%${time}`;
        case 'color_to': return `${t}: 색 ${st.color || ''}${time}`;
        case 'show': return `${t}: 보이기`;
        case 'hide': return `${t}: 숨기기`;
        case 'toggle_visible': return `${t}: 보이면 숨기고, 숨어 있으면 보이기`;
        case 'set_text': return `${t}: “${st.text ?? ''}” 표시`;
        case 'show_var': return `${t}: “${st.prefix || ''}[${st.varName || '변수'}]${st.suffix || ''}” 표시 (값이 바뀌면 따라 바뀜)`;
        case 'emit': return st.signal ? `'${st.signal}' 신호 보내기` : '보낼 신호를 고르세요';
        case 'set_var': return `${vn}을(를) ${n(st.value)}(으)로`;
        case 'add_var': return `${vn}에 ${Number(st.value) < 0 ? '−' : '+'}${n(Math.abs(Number(st.value)))}`;
        case 'if_var': return `${vn} ${{ '>=': '≥', '>': '>', '==': '=', '!=': '≠', '<=': '≤', '<': '<' }[st.compare] || st.compare} ${n(st.value)}일 때만 아래 동작 계속`;
        case 'wait': return `${n(st.seconds)}초 기다리기`;
        case 'sound': return `효과음: ${(MODULE_REGISTRY.synth_sfx.paramOptions.sound.find(o => o[0] === st.sound) || [0, st.sound])[1]}`;
        case 'open_link': return `${st.url || '(주소 없음)'} 열기 · ${st.newTab === false ? '현재 창' : '새 탭'}`;
        case 'go_to': return st.spriteId ? `${t}(으)로 스크롤` : '보여줄 섹션을 고르세요';
        default: return st.type || '';
      }
    }

    renderActionSteps(mod, sprite, ctx) {
      const def = MODULE_REGISTRY.action_rules;
      const p = mod.params || {}, steps = Array.isArray(p.steps) ? p.steps : [];
      const cat = InspectorPanelUI.actionCatalog();
      const groups = {};
      for (const [t, a] of Object.entries(cat)) (groups[a.group] = groups[a.group] || []).push([t, a]);
      return `
          <div class="jspen-actions-help">위의 <b>발동 조건</b>이 되면 아래 동작을 위에서부터 차례로 실행합니다.</div>
          <ol class="jspen-action-list">
            ${steps.map((st, i) => {
              const a = cat[st.type] || { label: st.type, fields: {}, defaults: {} };
              return `
            <li class="jspen-action" data-step-index="${i}">
              <div class="jspen-action-head">
                <span class="jspen-action-num">${i + 1}</span>
                <span class="jspen-action-title">${escapeHtml(a.label)}</span>
                <span class="jspen-action-tools">
                  <button type="button" data-step-act="up" data-step="${i}" title="위로" ${i === 0 ? 'disabled' : ''}>▲</button>
                  <button type="button" data-step-act="down" data-step="${i}" title="아래로" ${i === steps.length - 1 ? 'disabled' : ''}>▼</button>
                  <button type="button" data-step-act="copy" data-step="${i}" title="복제">⧉</button>
                  <button type="button" data-step-act="delete" data-step="${i}" title="삭제">✕</button>
                </span>
              </div>
              <div class="jspen-action-sum">${escapeHtml(InspectorPanelUI.actionSummary(st, this.doc))}</div>
              <div class="jspen-action-fields">
                ${Object.entries(a.fields).map(([k, f]) => this.renderParamField(f, k, st[k] !== undefined ? st[k] : a.defaults[k], Object.assign({}, ctx, { step: i }))).join('')}
              </div>
            </li>`;
            }).join('')}
          </ol>
          ${steps.length ? '' : '<div class="jspen-actions-empty">아직 동작이 없습니다. 아래에서 추가하세요.</div>'}
          <div class="ps-prop-row">
            <select class="ps-select jspen-action-add" id="actAddStep" aria-label="동작 추가">
              <option value="">＋ 동작 추가…</option>
              ${Object.entries(groups).map(([g, list]) => `<optgroup label="${escapeHtml(g)}">${list.map(([t, a]) => `<option value="${escapeHtml(t)}">${escapeHtml(a.label)}</option>`).join('')}</optgroup>`).join('')}
            </select>
          </div>
          ${['repeat', 'retrigger'].map(k => this.renderParamField(InspectorPanelUI.fieldOf(def, k, mod), k, p[k] !== undefined ? p[k] : def.defaultParams[k], ctx)).join('')}`;
    }

    bindActionSteps(mod, sprite) {
      if (mod.type !== 'action_rules') return;
      const commit = () => {
        this.doc.saveState();
        this.render();
        if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        if (this.cb.onUpdate) this.cb.onUpdate();
      };
      const steps = () => { if (!mod.params) mod.params = {}; if (!Array.isArray(mod.params.steps)) mod.params.steps = []; return mod.params.steps; };
      this.el.querySelector('#actAddStep')?.addEventListener('change', e => {
        const type = e.target.value;
        const a = InspectorPanelUI.actionCatalog()[type];
        if (!a) return;
        const step = Object.assign({ type }, JSON.parse(JSON.stringify(a.defaults)));
        if (type === 'move_to' && sprite) { step.x = Math.round(sprite.x); step.y = Math.round(sprite.y); }
        steps().push(step);
        commit();
      });
      this.el.querySelectorAll('[data-step-act]').forEach(btn => btn.addEventListener('click', () => {
        const list = steps(), i = +btn.dataset.step, act = btn.dataset.stepAct;
        if (!list[i]) return;
        if (act === 'delete') list.splice(i, 1);
        else if (act === 'copy') list.splice(i + 1, 0, JSON.parse(JSON.stringify(list[i])));
        else {
          const j = act === 'up' ? i - 1 : i + 1;
          if (j < 0 || j >= list.length) return;
          [list[i], list[j]] = [list[j], list[i]];
        }
        commit();
      }));
    }

    // "값을 글자로 표시" with a text before and after the value.
    bindTemplates(mod) {
      this.el.querySelectorAll('[data-template]').forEach(input => {
        const key = input.dataset.template;
        const part = name => this.el.querySelector(`[data-template="${CSS.escape(key)}"][data-template-part="${name}"]`);
        const compose = () => (part('on')?.checked ? (part('prefix')?.value || '') + '{value}' + (part('suffix')?.value || '') : '');
        input.addEventListener('input', () => {
          if (!mod.params) mod.params = {};
          mod.params[key] = compose();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        });
        input.addEventListener('change', () => {
          if (!mod.params) mod.params = {};
          mod.params[key] = compose();
          this.doc.saveState();
          // Only the checkbox changes what is shown; typing the words keeps focus.
          if (input.dataset.templatePart === 'on' && this.cb.onUpdate) this.cb.onUpdate();
        });
      });
    }

    // Angle dials next to degree fields: drag around the dial; turns add up.
    bindDials() {
      this.el.querySelectorAll('.blender-scrub-group').forEach(group => {
        const inp = group.querySelector('.blender-scrub-input');
        const row = group.parentElement;
        if (!inp || !row || row.querySelector('.jspen-dial')) return;
        // Fields of the hand-written panels with a full-turn range get one too.
        if (parseFloat(inp.min) === 0 && parseFloat(inp.max) === 360) {
          const d = document.createElement('span');
          d.className = 'jspen-dial';
          d.title = '돌려서 각도 조절 (Shift: 15° 단위)';
          d.innerHTML = '<span class="jspen-dial-needle"></span>';
          group.after(d);
        }
      });
      this.el.querySelectorAll('.jspen-dial').forEach(dial => {
        const inp = dial.parentElement.querySelector('.blender-scrub-input');
        const needle = dial.querySelector('.jspen-dial-needle');
        if (!inp || !needle) return;
        const show = () => { needle.style.transform = `rotate(${parseFloat(inp.value) || 0}deg)`; };
        show();
        inp.addEventListener('input', show);
        dial.addEventListener('pointerdown', e => {
          e.preventDefault();
          const r = dial.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
          const angle = ev => Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI;
          let prev = angle(e), raw = parseFloat(inp.value) || 0;
          const min = parseFloat(inp.min), max = parseFloat(inp.max);
          const move = ev => {
            const a = angle(ev);
            let d = a - prev;
            if (d > 180) d -= 360; else if (d < -180) d += 360;
            prev = a;
            raw += d;
            let v = ev.shiftKey ? Math.round(raw / 15) * 15 : Math.round(raw);
            if (isFinite(min)) v = Math.max(min, v);
            if (isFinite(max)) v = Math.min(max, v);
            inp.value = v;
            inp.dispatchEvent(new Event('input', { bubbles: true }));
          };
          const up = () => {
            window.removeEventListener('pointermove', move);
            window.removeEventListener('pointerup', up);
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          };
          window.addEventListener('pointermove', move);
          window.addEventListener('pointerup', up);
        });
      });
    }

    // Drag step for a number without a known range.
    static stepFor(value) {
      const v = Math.abs(Number(value) || 0);
      return Number.isInteger(Number(value)) && v >= 2 ? 1 : (v <= 1 ? 0.01 : 0.1);
    }

    // A key code shown the way it is printed on the keyboard.
    static keyLabel(code) {
      const c = String(code || '');
      const named = { ArrowRight: '→', ArrowLeft: '←', ArrowUp: '↑', ArrowDown: '↓', Space: '스페이스', Enter: 'Enter',
        Escape: 'Esc', ShiftLeft: '왼쪽 Shift', ShiftRight: '오른쪽 Shift', ControlLeft: '왼쪽 Ctrl', ControlRight: '오른쪽 Ctrl',
        AltLeft: '왼쪽 Alt', AltRight: '오른쪽 Alt', Tab: 'Tab', Backspace: 'Backspace', ' ': '스페이스' };
      if (named[c]) return named[c];
      const m = c.match(/^(?:Key|Digit|Numpad)(.+)$/);
      return m ? m[1] : (c || '(없음)');
    }

    // Compact badge text for the layers panel.
    static conditionShort(mod) {
      const p = mod.params || {};
      const c = p.condition || 'always';
      const base = { always: '항상', on_hover: '호버', on_click: '클릭', key_press: `키 ${String(p.condKey || p.targetKey || 'Space').replace(/^Key/, '')}`,
        on_signal: `신호 ${ModuleEngine.conditionSignal(mod) === '*' ? '*' : ModuleEngine.conditionSignal(mod)}`, on_trigger: '트리거', on_toggle: '토글', timeline_active: '구간' }[c] || c;
      if (c === 'always') return base;
      const mode = ModuleEngine.resolveConditionMode(mod);
      return base + ({ while: '', latch: '→계속', toggle: '→켜기/끄기', duration: `→${Math.max(0.05, Number(p.conditionDuration) || 1)}초` }[mode] || '');
    }

    static conditionModes() {
      return {
        auto: '자동 (권장)',
        while: '조건이 맞는 동안만',
        latch: '한 번 발동하면 계속',
        toggle: '발동할 때마다 켜기/끄기',
        duration: '발동 후 정해진 시간 동안'
      };
    }

    // Plain-language summary: "클릭하면 → 계속 작동" etc.
    static conditionSummary(mod) {
      const p = mod.params || {};
      const cond = p.condition || 'always';
      if (cond === 'always' && mod.type === 'hyperlink') return InspectorPanelUI.linkSummary(p);
      if (cond === 'always' && mod.type === 'action_rules') return '시작하면 아래 동작을 위에서부터 한 번 차례로 실행합니다.';
      if (cond === 'always') return '미리보기를 시작하면 바로, 계속 작동합니다.';
      const mode = ModuleEngine.resolveConditionMode(mod);
      const instant = ModuleEngine.instantCondition(cond);
      const what = {
        on_hover: '마우스를 올리면', on_click: '클릭하면', key_press: `'${p.condKey || p.targetKey || 'Space'}' 키를 누르면`,
        on_signal: ModuleEngine.conditionSignal(mod) === '*' ? '아무 신호나 받으면' : `'${ModuleEngine.conditionSignal(mod)}' 신호를 받으면`,
        on_trigger: '화면 트리거가 발동하면', on_toggle: '토글이 켜지면', timeline_active: '타임라인이 구간에 들어오면'
      }[cond] || '조건이 맞으면';
      if (mod.type === 'action_rules') return `${what} 아래 동작을 위에서부터 차례로 실행합니다.`;
      const how = {
        while: instant ? '그 순간(한 프레임)만 작동합니다. 한 번 실행되는 동작(소리, 신호, 링크 등)에 알맞습니다.'
          : (cond === 'on_hover' ? '올려 둔 동안만 작동합니다.' : cond === 'key_press' ? '누르고 있는 동안만 작동합니다.' : '그동안만 작동합니다.'),
        latch: '작동을 시작해 계속 유지합니다.',
        toggle: '켜지고, 다시 발동하면 꺼집니다.',
        duration: `${Math.max(0.05, Number(p.conditionDuration) || 1)}초 동안 작동합니다.`
      }[mode];
      return `${what} ${how}`;
    }

    renderConditionSection(mod) {
      const p = mod.params || {};
      const cond = p.condition || 'always';
      const info = InspectorPanelUI.conditionInfo();
      const modes = InspectorPanelUI.conditionModes();
      const mode = p.conditionMode || 'auto';
      const resolved = ModuleEngine.resolveConditionMode(mod);
      let extra = '';
      if (cond === 'key_press') {
        extra = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">키:</label>
            <input type="text" class="ps-input" id="modCondKey" readonly title="클릭한 뒤 원하는 키를 누르세요" value="${escapeHtml(p.condKey || p.targetKey || 'Space')}" style="cursor:pointer;">
          </div>
          <div class="ps-help-text" style="font-size:10.5px;color:#71717a;margin:-2px 0 4px;">칸을 클릭한 뒤 원하는 키를 누르면 등록됩니다.</div>`;
      } else if (cond === 'on_signal') {
        const sig = ModuleEngine.conditionSignal(mod);
        const catalog = InspectorPanelUI.linkCatalog(this.doc);
        extra = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">받을 신호:</label>
            ${this.renderLinkPicker('signal-in', sig === '*' ? '' : sig, 'id="modCondSignal"', '아무 신호나', catalog)}
          </div>${InspectorPanelUI.linkNote('signal-in', sig, catalog)}`;
      } else if (cond === 'timeline_active') {
        extra = `
          <div class="ps-prop-row" style="gap:6px;">
            <label class="ps-prop-label">프레임 구간:</label>
            <input type="number" class="ps-input" id="modCondStart" min="0" step="1" value="${escapeHtml(p.condStartFrame ?? p.startFrame ?? 0)}" style="width:64px;">
            <span style="color:#71717a;">~</span>
            <input type="number" class="ps-input" id="modCondEnd" min="0" step="1" value="${escapeHtml(p.condEndFrame ?? p.endFrame ?? (this.doc.totalFrames || 0))}" style="width:64px;">
          </div>`;
      }
      // Action blocks run their steps once per trigger: no "how long" choice.
      const modeRow = cond === 'always' || mod.type === 'action_rules' ? '' : `
          <div class="ps-prop-row">
            <label class="ps-prop-label">작동 방식:</label>
            <select class="ps-select" id="modCondMode">
              ${Object.entries(modes).map(([k, label]) => `<option value="${k}" ${mode === k ? 'selected' : ''}>${escapeHtml(k === 'auto' ? `자동: ${modes[resolved]}` : label)}</option>`).join('')}
            </select>
          </div>
          ${resolved === 'duration' ? `
          <div class="ps-prop-row">
            <label class="ps-prop-label">작동 시간 (초):</label>
            <input type="number" class="ps-input" id="modCondDuration" min="0.05" step="0.1" value="${escapeHtml(p.conditionDuration || 1)}">
          </div>` : ''}`;
      return `
        <div class="ps-prop-section" id="modCondSection" style="border-left:3px solid #a78bfa;">
          <div class="ps-prop-header">언제 작동하나요? (발동 조건)</div>
          <div class="ps-prop-row" style="margin-top:6px;">
            <label class="ps-prop-label">발동 조건:</label>
            <select class="ps-select" id="modCond">
              ${Object.entries(info).map(([k, [label]]) => `<option value="${k}" ${cond === k ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('')}
            </select>
          </div>
          <div class="ps-help-text" style="font-size:10.5px;color:#a1a1aa;margin:-2px 0 6px;line-height:1.5;">${escapeHtml(cond === 'always' && mod.type === 'hyperlink' ? '이 링크 기능이 언제 켜져 있을지 고릅니다. 이동하는 때는 아래 \'이동 시점\'에서 정합니다.' : (cond === 'always' && mod.type === 'action_rules' ? '미리보기를 시작하면(내보낸 페이지는 열리면) 아래 동작을 한 번 실행합니다.' : (info[cond] || info.always)[1]))}</div>
          ${extra}
          ${modeRow}
          <div class="jspen-cond-summary" id="modCondSummary" style="margin-top:6px;padding:7px 9px;border-radius:6px;background:#1e1b4b;color:#e0e7ff;font-size:11px;line-height:1.5;">
            ▶ ${escapeHtml(InspectorPanelUI.conditionSummary(mod))}
          </div>
          <div class="ps-help-text" style="font-size:10.5px;color:#71717a;margin-top:6px;line-height:1.5;">Ctrl+Space로 미리보기를 켜면 왼쪽 아래 상태창에서 각 모듈이 작동 중인지 볼 수 있습니다.</div>
        </div>`;
    }

    bindConditionSection(mod) {
      const q = sel => this.el.querySelector(sel);
      const set = (patch, rerender = true) => {
        mod.params = Object.assign(mod.params || {}, patch);
        this.doc.saveState();
        if (rerender) this.render();
        if (this.cb.onUpdate) this.cb.onUpdate();
      };
      q('#modCond')?.addEventListener('change', e => set({ condition: e.target.value }));
      q('#modCondMode')?.addEventListener('change', e => set({ conditionMode: e.target.value }));
      q('#modCondDuration')?.addEventListener('change', e => set({ conditionDuration: Math.max(0.05, parseFloat(e.target.value) || 1) }));
      q('#modCondSignal')?.addEventListener('change', e => {
        if (e.target.value === '__new__') this.askNewName(e.target, 'signal', v => set({ condSignal: v }));
        else set({ condSignal: e.target.value || '*' });
      });
      q('#modCondStart')?.addEventListener('change', e => set({ condStartFrame: Math.max(0, parseInt(e.target.value, 10) || 0) }));
      q('#modCondEnd')?.addEventListener('change', e => set({ condEndFrame: Math.max(0, parseInt(e.target.value, 10) || 0) }));
      const keyEl = q('#modCondKey');
      if (keyEl) {
        keyEl.addEventListener('focus', () => { keyEl.value = '키를 누르세요…'; });
        keyEl.addEventListener('blur', () => { keyEl.value = mod.params.condKey || mod.params.targetKey || 'Space'; });
        keyEl.addEventListener('keydown', e => {
          e.preventDefault(); e.stopPropagation();
          if (e.key === 'Tab') return;
          set({ condKey: e.code || e.key });
        });
      }
    }

    bindScrubbing() {
      this.el.querySelectorAll('.blender-scrub-group').forEach(group => {
        const inp = group.querySelector('.blender-scrub-input');
        if (!inp) return;
        InspectorPanelUI.updateFill(inp);
        inp.addEventListener('input', () => InspectorPanelUI.updateFill(inp));
        let startX = 0, startVal = 0, isDragging = false;

        const onDown = e => {
          startX = e.clientX;
          startVal = parseFloat(inp.value) || 0;
          isDragging = false;

          const onMove = ev => {
            const dx = ev.clientX - startX;
            if (Math.abs(dx) > 3) {
              isDragging = true;
              inp.blur();
              const step = (parseFloat(inp.step) || 1) * (ev.shiftKey ? 0.1 : 1);
              const digits = Math.min(6, Math.max(0, Math.ceil(-Math.log10(step) - 1e-9)));
              let nVal = Number((startVal + dx * step).toFixed(digits));
              if (inp.min !== '' && !isNaN(inp.min)) {
                nVal = Math.max(parseFloat(inp.min), nVal);
              }
              if (inp.max !== '' && !isNaN(inp.max)) {
                nVal = Math.min(parseFloat(inp.max), nVal);
              }
              inp.value = nVal;
              inp.dispatchEvent(new Event('input', { bubbles: true }));
            }
          };

          const onUp = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            if (isDragging) {
              inp.dispatchEvent(new Event('change', { bubbles: true }));
              if (this.cb.onUpdate) this.cb.onUpdate();
            }
          };

          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        };

        group.addEventListener('mousedown', onDown);
        // The row's label drags the value too (like the X / Y labels).
        const row = group.parentElement;
        const label = row && row.classList.contains('ps-prop-row') ? row.querySelector(':scope > .ps-prop-label') : null;
        if (label && !label.dataset.scrub) {
          label.dataset.scrub = '1';
          label.classList.add('jspen-scrub-label');
          label.title = label.title || '좌우로 끌어서 값 조절 (Shift: 세밀하게)';
          label.addEventListener('mousedown', e => { e.preventDefault(); onDown(e); });
        }
      });
      this.bindDials();
    }

    bindInputs(sprite, mod, layer) {
      if (mod) {
        const modIdx = sprite?.modules ? sprite.modules.findIndex(m => m.id === mod.id) : -1;

        // Back to sprite properties
        this.el.querySelector('#btnBackToVisual')?.addEventListener('click', () => {
          this.doc.selectedModuleId = null;
          this.render();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        // Module Enabled
        this.el.querySelector('#modEnabledSelect')?.addEventListener('change', e => {
          mod.enabled = (e.target.value === 'true');
          this.doc.saveState();
          this.render();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        // Condition ("언제 작동하나요?")
        this.bindConditionSection(mod);

        // Move Up
        this.el.querySelector('#modDetailMoveUp')?.addEventListener('click', () => {
          if (sprite?.modules && modIdx > 0) {
            const [item] = sprite.modules.splice(modIdx, 1);
            sprite.modules.splice(modIdx - 1, 0, item);
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });

        // Move Down
        this.el.querySelector('#modDetailMoveDown')?.addEventListener('click', () => {
          if (sprite?.modules && modIdx < sprite.modules.length - 1) {
            const [item] = sprite.modules.splice(modIdx, 1);
            sprite.modules.splice(modIdx + 1, 0, item);
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });

        // Duplicate
        this.el.querySelector('#modDetailDuplicate')?.addEventListener('click', () => {
          if (sprite?.modules && modIdx >= 0) {
            const copy = JSON.parse(JSON.stringify(mod));
            copy.id = 'mod_' + Math.random().toString(36).substr(2, 9);
            copy.name = copy.name + ' (복제본)';
            sprite.modules.splice(modIdx + 1, 0, copy);
            this.doc.selectedModuleId = copy.id;
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });

        // Delete
        this.el.querySelector('#modDetailDelete')?.addEventListener('click', () => {
          if (sprite?.modules && modIdx >= 0) {
            sprite.modules.splice(modIdx, 1);
            this.doc.selectedModuleId = null;
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });

        // Test Link button
        this.el.querySelector('#btnTestModDetailLink')?.addEventListener('click', () => {
          const safeHref = safeUrl(mod.params?.url);
          if (safeHref) {
            window.open(safeHref, mod.params.target || '_blank');
          } else if (mod.params?.url) {
            StudioToast.show('허용되지 않는 링크 형식입니다 (http, https, mailto, tel, # 만 지원).');
          }
        });

        // Colours that may also be left unset
        this.el.querySelectorAll('[data-param-clear]').forEach(btn => btn.addEventListener('click', () => {
          if (!mod.params) mod.params = {};
          const owner = btn.dataset.clearStep !== undefined ? (mod.params.steps || [])[+btn.dataset.clearStep] : mod.params;
          if (owner) owner[btn.dataset.paramClear] = '';
          this.doc.saveState();
          this.render();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        }));

        // Parameters with data-param-key
        this.el.querySelector('select[data-param-key="fontFamily"]')?.parentElement?.querySelector('[data-act-font-upload]')?.addEventListener('click', async () => {
          const family = window.jspenApp ? await window.jspenApp.addFontFile() : null;
          if (!family) return;
          if (!mod.params) mod.params = {};
          mod.params.fontFamily = family;
          if (sprite) sprite._wrapCache = null;
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelectorAll('[data-param-key]').forEach(input => {
          const key = input.dataset.paramKey;
          const def = MODULE_REGISTRY[mod.type] || {};
          // Fields of an action step write to that step.
          const owner = () => {
            if (!mod.params) mod.params = {};
            if (input.dataset.step === undefined) return mod.params;
            if (!Array.isArray(mod.params.steps)) mod.params.steps = [];
            return mod.params.steps[+input.dataset.step] || {};
          };
          if (input.dataset.paramType === 'signal' || input.dataset.paramType === 'var') {
            input.addEventListener('change', () => {
              const apply = v => { owner()[key] = v; this.doc.saveState(); this.render(); if (this.cb.onUpdate) this.cb.onUpdate(); };
              if (input.value === '__new__') this.askNewName(input, input.dataset.paramType, apply);
              else apply(input.value);
            });
            return;
          }
          if (input.dataset.paramType === 'key') {
            input.addEventListener('focus', () => { input.value = '키를 누르세요…'; });
            input.addEventListener('blur', () => { input.value = InspectorPanelUI.keyLabel(owner()[key]); });
            input.addEventListener('keydown', e => {
              if (e.key === 'Tab') return;
              e.preventDefault(); e.stopPropagation();
              owner()[key] = e.code || e.key;
              input.value = InspectorPanelUI.keyLabel(owner()[key]);
              this.doc.saveState();
              input.blur();
            });
            return;
          }
          // Values change live while typing or dragging; the change is one undo step.
          const onValChange = (commit = true) => {
            if (!mod.params) mod.params = {};
            let val = input.value;
            if (input.type === 'checkbox') {
              val = input.checked;
            } else if (input.type === 'color') {
              const field = input.closest('.jspen-color-field');
              if (field) field.classList.remove('is-empty');
            } else if (input.type === 'number') {
              val = parseFloat(val) || 0;
              if (input.min !== '' && !isNaN(input.min)) val = Math.max(parseFloat(input.min), val);
              if (input.max !== '' && !isNaN(input.max)) val = Math.min(parseFloat(input.max), val);
            } else if (val === 'true') {
              val = true;
            } else if (val === 'false') {
              val = false;
            }
            owner()[key] = val;

            if (key === 'maskType') {
              const rowTarget = this.el.querySelector('#rowSubMaskTarget');
              if (rowTarget) {
                rowTarget.style.display = (val === 'clip' || val === 'invert') ? '' : 'none';
              }
            }

            if (input.type === 'number') InspectorPanelUI.updateFill(input);
            if (commit) this.doc.saveState();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
          };

          if (input.dataset.paramType === 'code') {
            // Code: keep typing cheap (no undo step per key); commit on blur.
            input.addEventListener('input', () => {
              if (!mod.params) mod.params = {};
              mod.params[key] = input.value;
              window.jspenApp?.trustScript(input.value); // written by the user here
            });
            input.addEventListener('keydown', e => {
              if (e.key === 'Tab') {
                e.preventDefault();
                const a = input.selectionStart, b = input.selectionEnd;
                input.setRangeText('  ', a, b, 'end');
                mod.params[key] = input.value;
              }
            });
            input.addEventListener('change', () => { mod.params[key] = input.value; window.jspenApp?.trustScript(input.value); this.doc.saveState(); });
            return;
          }
          input.addEventListener('input', () => onValChange(input.type === 'checkbox'));
          input.addEventListener('change', () => {
            onValChange(true);
            // A step's summary line, or fields shown only for some values, follow the change.
            const sum = input.dataset.step !== undefined && input.closest('.jspen-action')?.querySelector('.jspen-action-sum');
            if (sum) sum.textContent = InspectorPanelUI.actionSummary(owner(), this.doc);
            if (InspectorPanelUI.controlsShowIf(def, key)) this.render();
            if (this.cb.onUpdate) this.cb.onUpdate();
          });
        });
        this.bindActionSteps(mod, sprite);
        this.bindTemplates(mod);

        return;
      }

      if (sprite) {
        // "화면 폭이 바뀌면" - where it sticks
        this.el.querySelectorAll('[data-pin]').forEach(btn => btn.addEventListener('click', () => {
          this.doc.setPin(sprite, btn.dataset.pin);
          this.doc.saveState();
          this.cb.onUpdate();
        }));

        // Sprite Name
        this.el.querySelector('#inpSpriteName')?.addEventListener('change', e => {
          sprite.name = e.target.value.trim() || sprite.name;
          this.doc.saveState();
          this.cb.onUpdate();
        });

        const bindProp = (id, prop, isNum = true, minVal = null) => {
          const el = this.el.querySelector('#' + id);
          if (!el) return;
          el.addEventListener('input', () => {
            let val = isNum ? (parseFloat(el.value) || 0) : el.value;
            if (isNum && minVal !== null) {
              val = Math.max(minVal, val);
            }
            sprite[prop] = val;
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
          });

          el.addEventListener('change', () => {
            this.doc.saveState();
            if (this.cb.onUpdate) this.cb.onUpdate();
          });
        };

        bindProp('inpX', 'x', true, null);
        bindProp('inpY', 'y', true, null);
        bindProp('inpW', 'width', true, 1);
        bindProp('inpH', 'height', true, 1);
        bindProp('inpRot', 'rotation', true, null);
        bindProp('inpOpacity', 'opacity', true, 0);
        bindProp('inpCornerRadius', 'cornerRadius', true, 0);
        bindProp('inpBevel', 'bevel', true, 0);
        bindProp('inpFill', 'fill', false);
        bindProp('inpStroke', 'stroke', false);
        bindProp('inpStrokeWidth', 'strokeWidth', true, 0);
        bindProp('inpText', 'text', false);
        bindProp('inpFontSize', 'fontSize', true, 1);

        this.el.querySelector('#inpTextAlign')?.addEventListener('change', e => {
          sprite.textAlign = e.target.value;
          this.doc.saveState();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        });
        this.el.querySelector('#inpFontFamily')?.parentElement?.querySelector('[data-act-font-upload]')?.addEventListener('click', async () => {
          const family = window.jspenApp ? await window.jspenApp.addFontFile() : null;
          if (!family) return;
          sprite.fontFamily = family;
          sprite._wrapCache = null;
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });
        this.el.querySelector('#inpFontFamily')?.addEventListener('change', e => {
          sprite.fontFamily = e.target.value || 'Pretendard, sans-serif';
          sprite._wrapCache = null;
          this.doc.saveState();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        });
        // Image
        this.el.querySelector('#btnReplaceImage')?.addEventListener('click', async () => {
          const f = await NativeBridge.pickFile('image/*', 'dataurl');
          if (!f) return;
          try {
            const info = await App.prepareImage(f.data);
            sprite.imageUrl = info.url;
            sprite.naturalWidth = info.width; sprite.naturalHeight = info.height;
            this.doc.saveState();
            if (this.cb.onUpdate) this.cb.onUpdate();
          } catch (err) { StudioToast.show(err.message); }
        });
        this.el.querySelectorAll('[data-form-prop]').forEach(inp => {
          inp.addEventListener('change', () => {
            sprite.form = sprite.form || {};
            const k = inp.dataset.formProp;
            sprite.form[k] = k === 'required' ? inp.value === 'true' : inp.value;
            if (k === 'kind' && inp.value === 'checkbox') { sprite.height = 28; }
            this.doc.saveState();
            if (this.cb.onUpdate) this.cb.onUpdate();
          });
        });
        this.el.querySelector('#inpImageFit')?.addEventListener('change', e => {
          sprite.imageFit = e.target.value;
          this.doc.saveState();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        });
        this.el.querySelector('#inpImageAlt')?.addEventListener('change', e => {
          sprite.alt = e.target.value;
          this.doc.saveState();
        });
        this.el.querySelector('#btnImageNatural')?.addEventListener('click', () => {
          if (!sprite.naturalWidth) return;
          sprite.height = Math.round(sprite.width * sprite.naturalHeight / sprite.naturalWidth);
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        // Quick add text_label module
        this.el.querySelector('#btnQuickAddTextMod')?.addEventListener('click', () => {
          if (!sprite.modules) sprite.modules = [];
          const textMod = {
            id: 'mod_' + Math.random().toString(36).substring(2, 9),
            type: 'text_label',
            name: '텍스트 라벨 (Text)',
            enabled: true,
            params: {
              text: '텍스트',
              fontSize: 16,
              color: '#ffffff',
              fontWeight: 'normal',
              textAlign: 'center',
              valign: 'middle',
              lineHeight: 1.35
            }
          };
          sprite.modules.push(textMod);
          this.doc.selectedModuleId = textMod.id;
          this.doc.saveState();
          this.render();
          if (this.cb.onUpdate) this.cb.onUpdate();
          if (typeof StudioToast !== 'undefined') StudioToast.show('텍스트 라벨 모듈이 추가되었습니다.');
        });

        // Gradient Angle & Stop controls in Inspector
        this.el.querySelector('#inpFillType')?.addEventListener('change', e => {
          sprite.fillType = e.target.value;
          if (sprite.fillType === 'linear-gradient' && !sprite.gradient) {
            sprite.gradient = {
              type: 'linear',
              angle: 0,
              stops: [{ offset: 0, color: '#ffffff' }, { offset: 1, color: '#27272a' }]
            };
          }
          this.doc.saveState();
          this.render();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelector('#inpGradientAngle')?.addEventListener('input', e => {
          const a = parseInt(e.target.value, 10) || 0;
          if (!sprite.gradient) sprite.gradient = { type: 'linear', angle: a, stops: [] };
          sprite.gradient.angle = a;
          sprite.gradientAngle = a;
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelectorAll('.btn-grad-dir').forEach(b => {
          b.addEventListener('click', () => {
            const a = parseInt(b.dataset.angle, 10) || 0;
            if (!sprite.gradient) sprite.gradient = { type: 'linear', angle: a, stops: [] };
            sprite.gradient.angle = a;
            sprite.gradientAngle = a;
            this.doc.saveState();
            this.render();
            if (this.cb.onUpdate) this.cb.onUpdate();
          });
        });

        this.el.querySelector('#inpGradStop0')?.addEventListener('input', e => {
          if (!sprite.gradient?.stops) return;
          sprite.gradient.stops[0].color = e.target.value;
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelector('#inpGradStop1')?.addEventListener('input', e => {
          if (!sprite.gradient?.stops) return;
          if (!sprite.gradient.stops[1]) sprite.gradient.stops[1] = { offset: 1, color: e.target.value };
          else sprite.gradient.stops[1].color = e.target.value;
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelector('#inpTriggerEvent')?.addEventListener('change', e => {
          sprite.triggerEvent = e.target.value;
          this.doc.saveState();
        });

        this.el.querySelector('#inpTriggerSignalName')?.addEventListener('input', e => {
          sprite.signalName = e.target.value;
          this.doc.saveState();
        });

        this.el.querySelector('#inpTriggerAction')?.addEventListener('change', e => {
          sprite.triggerAction = e.target.value;
          this.doc.saveState();
        });

        return;
      }

      if (layer) {
        this.el.querySelector('#inpLayerName')?.addEventListener('change', e => {
          layer.name = e.target.value.trim() || layer.name;
          this.doc.saveState();
          this.cb.onUpdate();
        });

        this.el.querySelector('#inpLayerOpacity')?.addEventListener('input', e => {
          layer.opacity = Math.max(0, Math.min(1, parseFloat(e.target.value) || 0));
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        });

        this.el.querySelector('#inpLayerOpacity')?.addEventListener('change', () => {
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelector('#inpLayerBlend')?.addEventListener('change', e => {
          layer.blendMode = e.target.value;
          this.doc.saveState();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        this.el.querySelector('#inpLayerVis')?.addEventListener('change', e => {
          layer.visible = (e.target.value === 'true');
          this.doc.saveState();
          this.cb.onUpdate();
        });
      }
    }

    updateInputs(sprite) {
      if (!sprite || this.doc.selectedModuleId) return;
      const setVal = (id, v) => {
        const el = this.el.querySelector('#' + id);
        if (el && document.activeElement !== el) el.value = v;
      };
      setVal('inpX', Math.round(sprite.x));
      setVal('inpY', Math.round(sprite.y));
      setVal('inpW', Math.round(sprite.width));
      setVal('inpH', Math.round(sprite.height));
      setVal('inpRot', Math.round(sprite.rotation));
      setVal('inpOpacity', sprite.opacity);
    }
  }

  class TimelineUI {
    constructor(el, doc, callbacks) {
      this.el = el;
      this.doc = doc;
      this.cb = callbacks;
      this.frameWidth = 10;
      this.rowHeight = 24;
      this.showAll = false;
      this.collapsed = false;
      this.draggingKeyframe = null;
      this.render();
    }

    render() {
      if (!this.el) return;
      const current = this.doc.currentFrame;
      const total = this.doc.totalFrames;
      const isPlay = this.doc.isPlaying;
      const autoKey = this.doc.autoKey;
      const loop = this.doc.isLooping;

      this.el.innerHTML = `
        <div class="timeline-splitter" title="드래그하여 타임라인 높이 조절"></div>
        <div class="timeline-header">
          <div class="tl-controls-left">
            <span class="tl-badge">TIMELINE</span>
            <button class="tl-btn" id="tlJumpStart" title="첫 프레임으로 이동">|◀</button>
            <button class="tl-btn" id="tlStepPrev" title="이전 프레임 (◀)">◀</button>
            <button class="tl-btn tl-btn-play ${isPlay ? 'playing' : ''}" id="tlPlayPause" title="재생 / 일시정지 (Space)">
              ${isPlay ? '❚❚ 정지' : '▶ 재생'}
            </button>
            <button class="tl-btn" id="tlStepNext" title="다음 프레임 (▶)">▶</button>
            <button class="tl-btn" id="tlJumpEnd" title="마지막 프레임으로 이동">▶|</button>
            <button class="tl-btn tl-btn-record ${autoKey ? 'active' : ''}" id="tlAutoKey" title="오토 키프레임">
              ● Auto Key
            </button>
            
            <!-- Live Preview Button Moved to Timeline! -->
            <button class="btn btn-preview ${this.cb.isPreview ? 'active' : ''}" id="btnTlPreview">
              ${this.cb.isPreview ? '⏹ 편집 모드로 복귀' : '▶ 실시간 모듈 미리보기'} <span class="shortcut">Ctrl+Space</span>
            </button>
          </div>

          <div class="tl-controls-center">
            <div class="tl-frame-box">
              <input type="number" id="tlCurFrame" class="tl-frame-num" value="${escapeHtml(current)}" min="0" max="${escapeHtml(total)}">
              <span style="color:#71717a;font-size:11px;margin:0 2px;">/</span><input type="number" id="tlTotalFrames" class="tl-frame-num" value="${escapeHtml(total)}" min="10" max="9999" style="width:52px;" title="타임라인 총 프레임 길이">
            </div>
            <select class="tl-select" id="tlFps">
              <option value="24" ${this.doc.fps === 24 ? 'selected' : ''}>24 fps</option>
              <option value="30" ${this.doc.fps === 30 ? 'selected' : ''}>30 fps</option>
              <option value="60" ${this.doc.fps === 60 ? 'selected' : ''}>60 fps</option>
            </select>
            <button class="tl-btn ${loop ? 'active' : ''}" id="tlLoop" title="루프 반복 재생">⟳</button>
          </div>

          <div class="tl-controls-right"></div>
        </div>

        <div class="tl-body">
          <div class="tl-tracks-col">
            <div class="tl-tracks-header">
              <span>스프라이트 채널 (Tracks)</span>
            </div>
            <div class="tl-tracks-tree" id="tlTrackTree"></div>
          </div>

          <div class="tl-sheet-col" id="tlSheetCol">
            <div class="tl-ruler-area" id="tlRulerArea">
              <canvas class="tl-ruler-canvas" id="tlRulerCanvas"></canvas>
            </div>
            <div class="tl-grid-area" id="tlGridArea">
              <canvas class="tl-grid-canvas" id="tlGridCanvas"></canvas>
              <div class="tl-playhead-line" id="tlPlayheadLine"></div>
              <div class="tl-playhead-cap" id="tlPlayheadCap"></div>
            </div>
          </div>
        </div>
      `;

      this.bindButtons();
      this.renderTracks();
      this.renderCanvases();
      this.updatePlayheadPosition();

      // RE-ATTACH ALL DRAG LISTENERS ON EVERY RENDER (CRITICAL FIX!)
      this.initEvents();
    }

    bindButtons() {
      this.el.querySelector('#tlJumpStart')?.addEventListener('click', () => { this.doc.setFrame(0); this.onSeek(); });
      this.el.querySelector('#tlStepPrev')?.addEventListener('click', () => { this.doc.stepFrame(-1); this.onSeek(); });
      this.el.querySelector('#tlPlayPause')?.addEventListener('click', () => { this.doc.togglePlay(); this.render(); });
      this.el.querySelector('#tlStepNext')?.addEventListener('click', () => { this.doc.stepFrame(1); this.onSeek(); });
      this.el.querySelector('#tlJumpEnd')?.addEventListener('click', () => { this.doc.setFrame(this.doc.totalFrames); this.onSeek(); });

      this.el.querySelector('#tlAutoKey')?.addEventListener('click', () => {
        this.doc.autoKey = !this.doc.autoKey;
        this.render();
      });

      this.el.querySelector('#btnTlPreview')?.addEventListener('click', () => {
        this.cb.onTogglePreview();
      });

      

      this.el.querySelector('#tlToggleCollapse')?.addEventListener('click', () => {
        this.collapsed = !this.collapsed;
        this.el.classList.toggle('collapsed', this.collapsed);
        this.render();
        if (window.jspenApp) window.jspenApp.handleResize();
      });

      // Mouse Wheel Horizontal Scrolling on Keyframe Tracks
      const gArea = this.el.querySelector('#tlGridArea');
      const rArea = this.el.querySelector('#tlRulerArea');
      if (gArea) {
        gArea.addEventListener('wheel', e => {
          e.preventDefault();
          const d = e.deltaX !== 0 ? e.deltaX : e.deltaY;
          gArea.scrollLeft += d;
          if (rArea) rArea.scrollLeft = gArea.scrollLeft;
        }, { passive: false });
      }

      this.el.querySelector('#tlCurFrame')?.addEventListener('change', e => {
        this.doc.setFrame(parseInt(e.target.value, 10) || 0);
        this.onSeek();
      });
      this.el.querySelector('#tlTotalFrames')?.addEventListener('change', e => {
        const val = Math.max(10, Math.min(9999, parseInt(e.target.value, 10) || 120));
        this.doc.totalFrames = val;
        if (this.doc.currentFrame > val) this.doc.setFrame(val);
        this.render();
        if (window.jspenApp) window.jspenApp.refreshUI();
      });
      this.el.querySelector('#tlFps')?.addEventListener('change', e => {
        this.doc.fps = parseInt(e.target.value, 10) || 30;
      });
      this.el.querySelector('#tlLoop')?.addEventListener('click', () => {
        this.doc.isLooping = !this.doc.isLooping;
        this.render();
      });
    }

    renderTracks() {
      const tree = this.el.querySelector('#tlTrackTree');
      if (!tree) return;
      const sprite = this.doc.getSelectedSprite();
      const PROPS = [
        { key: 'x', label: '위치 X' },
        { key: 'y', label: '위치 Y' },
        { key: 'rotation', label: '회전(°)' },
        { key: 'scaleX', label: '가로 비율' },
        { key: 'scaleY', label: '세로 비율' },
        { key: 'opacity', label: '불투명도' }
      ];

      if (!sprite) {
        tree.innerHTML = '<div style="padding:10px;font-size:11px;color:#71717a;">선택된 스프라이트 없음</div>';
        return;
      }

      tree.innerHTML = `
        <div class="tl-track-row tl-track-parent selected">
          <span class="tl-track-name">${escapeHtml(sprite.name)}</span>
        </div>
        ${PROPS.map(p => `
          <div class="tl-track-row tl-track-sub">
            <span class="tl-track-sub-indent">└</span>
            <span class="tl-track-name">${escapeHtml(p.label)}</span>
          </div>
        `).join('')}
      `;
    }

    renderCanvases() {
      const rArea = this.el.querySelector('#tlRulerArea');
      const gArea = this.el.querySelector('#tlGridArea');
      if (!rArea || !gArea) return;

      const rw = rArea.clientWidth, rh = rArea.clientHeight;
      const gw = gArea.clientWidth, gh = gArea.clientHeight;
      if (rw <= 0 || gw <= 0) return;

      const rcv = this.el.querySelector('#tlRulerCanvas');
      const gcv = this.el.querySelector('#tlGridCanvas');
      if (!rcv || !gcv) return;

      if (rcv.width !== rw || rcv.height !== rh) {
        rcv.width = rw; rcv.height = rh;
      }
      if (gcv.width !== gw || gcv.height !== gh) {
        gcv.width = gw; gcv.height = gh;
      }

      this.drawRuler(rcv.getContext('2d'), rw, rh);
      this.drawGrid(gcv.getContext('2d'), gw, gh);
    }

    drawRuler(ctx, w, h) {
      ctx.fillStyle = '#18181c';
      ctx.fillRect(0, 0, w, h);

      const total = this.doc.totalFrames;
      ctx.font = '9px Consolas, monospace';
      ctx.textAlign = 'center';

      for (let f = 0; f <= total; f++) {
        const x = f * this.frameWidth + 12;
        if (x > w) break;

        if (f % 10 === 0) {
          ctx.strokeStyle = '#71717a';
          ctx.beginPath(); ctx.moveTo(x, h - 14); ctx.lineTo(x, h); ctx.stroke();
          ctx.fillStyle = '#a1a1aa';
          ctx.fillText(String(f), x, h - 16);
        } else if (f % 5 === 0) {
          ctx.strokeStyle = '#52525b';
          ctx.beginPath(); ctx.moveTo(x, h - 8); ctx.lineTo(x, h); ctx.stroke();
        } else {
          ctx.strokeStyle = '#33333b';
          ctx.beginPath(); ctx.moveTo(x, h - 4); ctx.lineTo(x, h); ctx.stroke();
        }
      }
    }

    drawGrid(ctx, w, h) {
      ctx.fillStyle = '#131316';
      ctx.fillRect(0, 0, w, h);

      const sprite = this.doc.getSelectedSprite();
      const PROPS = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'];
      let rowIndex = 0;

      if (sprite) {
        // Summary diamond row
        const py = rowIndex * this.rowHeight;
        ctx.fillStyle = '#1a1a20';
        ctx.fillRect(0, py, w, this.rowHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.strokeRect(0, py, w, this.rowHeight);

        const summaryFrames = new Set();
        for (const p in sprite.keyframes) {
          for (const k of sprite.keyframes[p]) summaryFrames.add(k.frame);
        }
        for (const f of summaryFrames) {
          const cx = f * this.frameWidth + 12;
          this.drawDiamond(ctx, cx, py + this.rowHeight / 2, 4.5, '#f59e0b', '#b45309');
        }
        rowIndex++;

        // Property diamond rows
        for (const p of PROPS) {
          const sy = rowIndex * this.rowHeight;
          if (rowIndex % 2 === 0) {
            ctx.fillStyle = '#161619';
            ctx.fillRect(0, sy, w, this.rowHeight);
          }
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
          ctx.strokeRect(0, sy, w, this.rowHeight);

          const kfs = sprite.keyframes[p] || [];
          for (const k of kfs) {
            const cx = k.frame * this.frameWidth + 12;
            const isCur = k.frame === this.doc.currentFrame;
            this.drawDiamond(ctx, cx, sy + this.rowHeight / 2, isCur ? 5.5 : 4.5, isCur ? '#38bdf8' : '#eab308', '#d97706');
          }
          rowIndex++;
        }
      }

      // Vertical frame grid lines
      const total = this.doc.totalFrames;
      for (let f = 0; f <= total; f += 10) {
        const x = f * this.frameWidth + 12;
        if (x > w) break;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
    }

    drawDiamond(ctx, cx, cy, size, fill, stroke) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(cx, cy - size);
      ctx.lineTo(cx + size, cy);
      ctx.lineTo(cx, cy + size);
      ctx.lineTo(cx - size, cy);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      if (stroke) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      ctx.restore();
    }

    updatePlayheadPosition() {
      const x = this.doc.currentFrame * this.frameWidth + 12;
      const line = this.el.querySelector('#tlPlayheadLine');
      const cap = this.el.querySelector('#tlPlayheadCap');
      const curInp = this.el.querySelector('#tlCurFrame');
      if (line) line.style.left = `${x}px`;
      if (cap) cap.style.left = `${x}px`;
      if (curInp && document.activeElement !== curInp) curInp.value = this.doc.currentFrame;
    }

    initEvents() {
      // 1. Splitter Drag Resizing
      const splitter = this.el.querySelector('.timeline-splitter');
      splitter?.addEventListener('mousedown', e => {
        e.preventDefault();
        const startY = e.clientY;
        const startH = this.el.offsetHeight;
        splitter.classList.add('dragging');

        const onMove = ev => {
          const newH = Math.max(36, Math.min(600, startH - (ev.clientY - startY)));
          this.el.style.height = `${newH}px`;
          if (window.jspenApp) window.jspenApp.handleResize();
        };
        const onUp = () => {
          splitter.classList.remove('dragging');
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      });

      // 2. Ruler, Grid & Playhead Scrubbing + Keyframe Dragging
      const handleSeek = (clientX) => {
        const grid = this.el.querySelector('#tlGridArea');
        if (!grid) return;
        const rect = grid.getBoundingClientRect();
        const clickX = clientX - rect.left;
        const f = Math.max(0, Math.min(this.doc.totalFrames, Math.round((clickX - 12) / this.frameWidth)));
        this.doc.setFrame(f);
        this.onSeek();
      };

      const startScrub = (e) => {
        e.preventDefault();
        // Check if clicked directly on a keyframe diamond to drag it!
        const grid = this.el.querySelector('#tlGridArea');
        const sprite = this.doc.getSelectedSprite();
        if (grid && sprite) {
          const rect = grid.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const clickedRow = Math.floor(my / this.rowHeight);
          const PROPS = ['x', 'y', 'rotation', 'scaleX', 'scaleY', 'opacity'];

          if (clickedRow >= 1 && clickedRow <= PROPS.length) {
            const p = PROPS[clickedRow - 1];
            const kfs = sprite.keyframes[p] || [];
            const targetKf = kfs.find(k => Math.abs(k.frame * this.frameWidth + 12 - mx) <= 8);
            if (targetKf) {
              // Start dragging keyframe
              const onKfMove = ev => {
                const nx = ev.clientX - rect.left;
                const newF = Math.max(0, Math.min(this.doc.totalFrames, Math.round((nx - 12) / this.frameWidth)));
                targetKf.frame = newF;
                this.doc.setFrame(newF);
                this.onSeek();
              };
              const onKfUp = () => {
                window.removeEventListener('mousemove', onKfMove);
                window.removeEventListener('mouseup', onKfUp);
                this.doc.saveState();
              };
              window.addEventListener('mousemove', onKfMove);
              window.addEventListener('mouseup', onKfUp);
              return;
            }
          }
        }

        handleSeek(e.clientX);
        const onMove = ev => {
          ev.preventDefault();
          handleSeek(ev.clientX);
        };
        const onUp = () => {
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
      };

      this.el.querySelector('#tlRulerArea')?.addEventListener('mousedown', startScrub);
      this.el.querySelector('#tlGridArea')?.addEventListener('mousedown', startScrub);
      this.el.querySelector('#tlPlayheadCap')?.addEventListener('mousedown', startScrub);
      this.el.querySelector('#tlPlayheadLine')?.addEventListener('mousedown', startScrub);
    }

    onSeek() {
      this.updatePlayheadPosition();
      this.renderTracks();
      this.renderCanvases();
      if (this.cb.onSeek) this.cb.onSeek(this.doc.currentFrame);
    }
  }

  // ==========================================================================
  // 14. MenuBar UI (Frameless Window Title Bar + Node Mode Switcher)
  // ==========================================================================
  // ==========================================================================
  // 16. MenuBarUI (Custom Title Bar, Window Menu with Reset Layout)
  // ==========================================================================
  class MenuBarUI {
    constructor(el, doc, callbacks) {
      this.el = el;
      this.doc = doc;
      this.cb = callbacks;
      this.windowToggles = {
        toolbox: true, optionBar: true, inspector: true, layers: true, timeline: true
      };
      this.render();
    }

    render() {
      const isToolbox = this.cb.isToolboxVisible ? this.cb.isToolboxVisible() : true;
      const isOptBar = this.cb.isOptionBarVisible ? this.cb.isOptionBarVisible() : true;
      const isInspector = this.cb.isDockerVisible ? this.cb.isDockerVisible('inspector') : true;
      const isLayers = this.cb.isDockerVisible ? this.cb.isDockerVisible('layers') : true;
      const isTimeline = this.cb.isDockerVisible ? this.cb.isDockerVisible('timeline') : true;

      this.el.innerHTML = `
        <div class="ps-menubar-left">
          <div class="ps-app-logo">
            <span class="ps-logo-icon" style="font-size:11px;font-weight:900;background:#0284c7;color:#fff;padding:2px 5px;border-radius:3px;">JS</span>
            <span class="ps-logo-text">JSPen Studio</span>
          </div>

          <div class="ps-menu-items">
            <div class="ps-menu-item"><span>파일(F)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="mNew">새 도큐먼트 <span class="shortcut">Ctrl+N</span></button>
                <button class="ps-dropdown-item" id="mOpen">열기... <span class="shortcut">Ctrl+O</span></button>
                <button class="ps-dropdown-item" id="mSave">프로젝트 저장 (.jspen) <span class="shortcut">Ctrl+S</span></button>
                <button class="ps-dropdown-item" id="mSaveAs">다른 이름으로 저장... <span class="shortcut">Ctrl+Shift+S</span></button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mImportImage">이미지 가져오기... <span class="shortcut">Ctrl+Shift+I</span></button>
                <button class="ps-dropdown-item" id="mAddFont">글꼴 파일 추가...</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mSettings">환경 설정... <span class="shortcut">Ctrl+,</span></button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mWebPreview">새 창에서 웹 미리보기 <span class="shortcut">Alt+W</span></button>
                <button class="ps-dropdown-item" id="mWebExport">웹사이트 (HTML) 내보내기...</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 8px;font-size:10px;color:#a1a1aa;font-weight:600;">웹 템플릿 삽입</div>
                <button class="ps-dropdown-item" id="btnOpenTemplateGallery" style="color:#f4f4f5;font-weight:600;">📂 템플릿 갤러리 열기...</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" data-web-tpl="full_landing">[풀 패키지] 전체 사이트</button>
                <button class="ps-dropdown-item" data-web-tpl="navbar">상단 네비게이션 헤더 (Navbar)</button>
                <button class="ps-dropdown-item" data-web-tpl="hero">메인 히어로 섹션 (Hero)</button>
                <button class="ps-dropdown-item" data-web-tpl="feature_grid">3열 기능 카드 그리드 (Features)</button>
                <button class="ps-dropdown-item" data-web-tpl="cta_banner">전환 유도 CTA 배너 (CTA)</button>
                <button class="ps-dropdown-item" data-web-tpl="footer">하단 푸터 (Footer)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mExp">자바스크립트 내보내기... <span class="shortcut">Ctrl+E</span></button>
              </div>
            </div>
            <div class="ps-menu-item"><span>편집(E)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="mUndo">실행 취소 <span class="shortcut">Ctrl+Z</span></button>
                <button class="ps-dropdown-item" id="mRedo">다시 실행 <span class="shortcut">Ctrl+Y</span></button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mSelectAll">전체 선택 <span class="shortcut">Ctrl+A</span></button>
              </div>
            </div>
            <div class="ps-menu-item"><span>필터(T)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" data-filter-act="blur">가우시안 블러 (Gaussian Blur)...</button>
                <button class="ps-dropdown-item" data-filter-act="brightness">밝기 / 대비 (Brightness & Contrast)...</button>
                <button class="ps-dropdown-item" data-filter-act="saturate">색조 / 채도 (Hue & Saturation)...</button>
                <button class="ps-dropdown-item" data-filter-act="grayscale">흑백 필터 (Grayscale)</button>
                <button class="ps-dropdown-item" data-filter-act="sepia">세피아 빈티지 (Sepia)</button>
                <button class="ps-dropdown-item" data-filter-act="invert">색상 반전 (Invert)</button>
                <button class="ps-dropdown-item" data-filter-act="opacity">알파값 / 투명도 조절 (Alpha Opacity)...</button>
                <button class="ps-dropdown-item" data-filter-act="shadow">드롭 섀도우 (Drop Shadow)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" data-filter-act="mask">클리핑 마스크 만들기 (Create Clipping Mask)</button>
                <button class="ps-dropdown-item" data-filter-act="unmask">클리핑 마스크 해제 (Release Clipping Mask)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" data-filter-act="reset">⟲ 선택 대상 필터 초기화</button>
              </div>
            </div>
            <div class="ps-menu-item"><span>웹(W)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="mWPreview">새 창에서 웹 미리보기 <span class="shortcut">Alt+W</span></button>
                <button class="ps-dropdown-item" id="mWExport">웹사이트 (HTML) 내보내기...</button>
                <button class="ps-dropdown-item" id="mWCopy">HTML/CSS 소스 코드 복사</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#e4e4e7;">웹 컴포넌트 템플릿 원클릭 삽입</div>
                <button class="ps-dropdown-item" data-web-tpl="full_landing">[풀 패키지] 완성형 랜딩페이지 전체 삽입</button>
                <button class="ps-dropdown-item" data-web-tpl="navbar">상단 네비게이션 헤더 (Navbar)</button>
                <button class="ps-dropdown-item" data-web-tpl="hero">메인 히어로 섹션 (Hero)</button>
                <button class="ps-dropdown-item" data-web-tpl="feature_grid">3열 기능 소개 카드 그리드 (Features)</button>
                <button class="ps-dropdown-item" data-web-tpl="cta_banner">전환 유도 CTA 배너 (CTA)</button>
                <button class="ps-dropdown-item" data-web-tpl="footer">하단 푸터 (Footer)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#e4e4e7;">폼 요소 삽입</div>
                <button class="ps-dropdown-item" data-form-kind="text">텍스트 입력칸</button>
                <button class="ps-dropdown-item" data-form-kind="email">이메일 입력칸</button>
                <button class="ps-dropdown-item" data-form-kind="textarea">여러 줄 입력칸</button>
                <button class="ps-dropdown-item" data-form-kind="checkbox">체크박스</button>
                <button class="ps-dropdown-item" data-form-kind="select">선택 목록</button>
                <button class="ps-dropdown-item" data-form-kind="submit">전송 버튼</button>
                <button class="ps-dropdown-item" data-form-kind="contact">[세트] 문의 폼 (이름·이메일·내용·전송)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">캔버스 크기 변경 (현재 화면)</div>
                <button class="ps-dropdown-item" data-preset-w="1920" data-preset-h="1080">데스크톱 Full HD (1920 × 1080)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="900">맥북 / 노트북 (1440 × 900)</button>
                <button class="ps-dropdown-item" data-preset-w="768" data-preset-h="1024">태블릿 iPad (768 × 1024)</button>
                <button class="ps-dropdown-item" data-preset-w="390" data-preset-h="844">모바일 스마트폰 (390 × 844)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="3600">세로 롱페이지 웹 (1440 × 3600)</button>
              </div>
            </div>
            <div class="ps-menu-item"><span>도움말(H)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="mTutorial">튜토리얼 시작하기</button>
                <button class="ps-dropdown-item" id="mShortcutsHelp">단축키 보기 <span class="shortcut">Ctrl+,</span></button>
              </div>
            </div>
            <div class="ps-menu-item"><span>창(V)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="wToolbox">${isToolbox ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}도구 상자 (Toolbox)</button>
                <button class="ps-dropdown-item" id="wOptionBar">${isOptBar ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}옵션 바 (Option Bar)</button>
                <button class="ps-dropdown-item" id="wInspector">${isInspector ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}속성 패널 (Inspector)</button>
                <button class="ps-dropdown-item" id="wLayers">${isLayers ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}레이어 패널 (Layers)</button>
                <button class="ps-dropdown-item" id="wTimeline">${isTimeline ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}타임라인 (Timeline)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="wResetLayout">기본 작업영역 재설정 (Reset Layout)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">데스크톱 웹 규격 (Desktop)</div>
                <button class="ps-dropdown-item" data-preset-w="1920" data-preset-h="1080">Full HD 표준 (1920 × 1080)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="900">맥북 / 노트북 (1440 × 900)</button>
                <button class="ps-dropdown-item" data-preset-w="1280" data-preset-h="800">소형 랩탑 (1280 × 800)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">모바일 & 태블릿 (Mobile & Tablet)</div>
                <button class="ps-dropdown-item" data-preset-w="390" data-preset-h="844">iPhone 14/15/16 (390 × 844)</button>
                <button class="ps-dropdown-item" data-preset-w="412" data-preset-h="915">Galaxy S / Android (412 × 915)</button>
                <button class="ps-dropdown-item" data-preset-w="768" data-preset-h="1024">iPad / 태블릿 (768 × 1024)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">세로 스크롤 롱페이지 웹 (Vertical Long-page)</div>
                <button class="ps-dropdown-item" data-preset-w="1920" data-preset-h="3200">데스크톱 랜딩페이지 (1920 × 3200)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="4800">포트폴리오 / 쇼핑몰 (1440 × 4800)</button>
                <button class="ps-dropdown-item" data-preset-w="390" data-preset-h="2500">모바일 세로 웹사이트 (390 × 2500)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mCustomCanvasSize">사용자 정의 크기 직접 입력...</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Draggable Native Window Title Bar Region -->
        <div class="ps-menubar-drag-region" id="titleDragRegion">
          ${escapeHtml(this.doc.name)} - JSPen Studio
        </div>

        <!-- Native Window Controls -->
        <div class="ps-menubar-right">
          <div class="jspen-view-switch" title="반응형 화면: 화면마다 위치·크기·글자 크기·표시 여부를 따로 지정합니다">
            ${[['desktop', '데스크톱'], ['tablet', '태블릿'], ['mobile', '모바일']].map(([v, l]) =>
              `<button class="jspen-view-btn ${(this.doc.activeView || 'desktop') === v ? 'active' : ''} ${v !== 'desktop' && !this.doc.hasView(v) ? 'is-new' : ''}" data-view="${v}">${l}</button>`).join('')}
          </div>
          <div class="ps-window-controls"${NativeBridge.isDesktop ? '' : ' style="display:none;"'}>
            <button class="ps-win-btn win-min" id="winMin" title="최소화">─</button>
            <button class="ps-win-btn win-max" id="winMax" title="최대화 / 이전 크기">□</button>
            <button class="ps-win-btn win-close" id="winClose" title="닫기">✕</button>
          </div>
        </div>
      `;

      this.bindEvents();
    }

    bindEvents() {
      // Desktop-grade Menu Interactions (Click to toggle/open, hover-switch, click-outside to close)
      let activeMenu = null;
      const closeAllMenus = () => {
        this.el.querySelectorAll('.ps-menu-item').forEach(m => m.classList.remove('active'));
        activeMenu = null;
      };

      this.el.querySelectorAll('.ps-menu-item').forEach(menuItem => {
        menuItem.addEventListener('click', e => {
          if (e.target.closest('.ps-dropdown-menu')) return;
          e.stopPropagation();
          const wasActive = menuItem.classList.contains('active');
          closeAllMenus();
          if (!wasActive) {
            menuItem.classList.add('active');
            activeMenu = menuItem;
          }
        });

        menuItem.addEventListener('mouseenter', () => {
          if (activeMenu && activeMenu !== menuItem) {
            closeAllMenus();
            menuItem.classList.add('active');
            activeMenu = menuItem;
          }
        });
      });

      this.el.querySelectorAll('.ps-dropdown-item').forEach(btn => {
        btn.addEventListener('click', () => {
          closeAllMenus();
        });
      });

      // Global listeners are bound only once; render() runs many times
      // (mode switch, docker toggles) and must not stack window listeners.
      this._closeAllMenus = closeAllMenus;
      if (!this._globalMenuListenersBound) {
        this._globalMenuListenersBound = true;
        window.addEventListener('mousedown', e => {
          if (!e.target?.closest || !e.target.closest('#topMenuBar')) {
            this._closeAllMenus?.();
          }
        });
        window.addEventListener('keydown', e => {
          if (e.key === 'Escape') {
            this._closeAllMenus?.();
          }
        });
      }

      // Photoshop Filter Menu Actions
      this.el.querySelectorAll('[data-filter-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.filterAct;
          const target = this.doc.getSelectedSprite() || this.doc.getSelectedLayer();
          if (!target) {
            StudioToast.show('필터를 적용할 대상(레이어/스프라이트)을 선택하세요.');
            return;
          }
          if (!target.filters) {
            target.filters = { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0, opacity: 100, dropShadow: false };
          }
          if (act === 'blur') target.filters.blur = (target.filters.blur || 0) + 10;
          else if (act === 'brightness') target.filters.brightness = 135;
          else if (act === 'saturate') target.filters.saturate = 150;
          else if (act === 'grayscale') target.filters.grayscale = 100;
          else if (act === 'sepia') target.filters.sepia = 80;
          else if (act === 'invert') target.filters.invert = 100;
          else if (act === 'opacity') {
            StudioModal.prompt('불투명도 입력 (0 ~ 100):', target.filters.opacity !== undefined ? target.filters.opacity : 100, '투명도').then(val => {
              if (val !== null) {
                target.filters.opacity = Math.max(0, Math.min(100, parseFloat(val) || 0));
                this.doc.saveState();
                if (this.onUpdate) this.onUpdate();
              }
            });
          }
          else if (act === 'mask') {
            if (target instanceof Sprite || target.sprites === undefined) {
              target.isMask = true;
              target.maskMode = 'clip_mask';
            }
          }
          else if (act === 'unmask') {
            if (target instanceof Sprite || target.sprites === undefined) {
              target.isMask = false;
              target.maskMode = 'none';
              target.maskTargetId = null;
            }
          }
          else if (act === 'shadow') target.filters.dropShadow = true;
          else if (act === 'reset') {
            target.filters = { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0, opacity: 100, dropShadow: false };
          }
          this.doc.saveState();
          this.cb.onUpdate();
        });
      });

      // Window drag start
      this.el.querySelector('#titleDragRegion')?.addEventListener('mousedown', e => {
        if (e.button === 0) {
          NativeBridge.send('window_drag_start');
        }
      });

      // Window controls
      this.el.querySelector('#winMin')?.addEventListener('click', () => {
        NativeBridge.send('window_min');
      });
      this.el.querySelector('#winMax')?.addEventListener('click', () => {
        NativeBridge.send('window_max');
      });
      
      this.el.querySelector('#mWebPreview')?.addEventListener('click', () => {
        this.cb.onWebPreview();
      });
      this.el.querySelector('#mWPreview')?.addEventListener('click', () => {
        this.cb.onWebPreview();
      });
      this.el.querySelector('#mWebExport')?.addEventListener('click', () => {
        this.cb.onWebExport();
      });
      this.el.querySelector('#mWExport')?.addEventListener('click', () => {
        this.cb.onWebExport();
      });
      this.el.querySelector('#mWCopy')?.addEventListener('click', () => {
        if (this.cb.onWebCopy) this.cb.onWebCopy();
      });

      // Web Template insertion clicks
      this.el.querySelectorAll('[data-web-tpl]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tpl = btn.dataset.webTpl;
          if (this.cb.onInsertWebTemplate) this.cb.onInsertWebTemplate(tpl);
        });
      });
      this.el.querySelectorAll('[data-preset-w]').forEach(btn => {
        btn.addEventListener('click', () => {
          const w = parseInt(btn.dataset.presetW, 10);
          const h = parseInt(btn.dataset.presetH, 10);
          if (w && h) window.jspenApp?.resizeCanvasInteractive(w, h);
        });
      });

      this.el.querySelector('#mCustomCanvasSize')?.addEventListener('click', () => {
        const curW = this.doc.width || 1440;
        const curH = this.doc.height || 900;
        StudioModal.prompt('캔버스 가로 너비(px)를 입력하세요:', curW, '캔버스 크기').then(wStr => {
          if (!wStr) return;
          StudioModal.prompt('캔버스 세로 높이(px)를 입력하세요:', curH, '캔버스 크기').then(hStr => {
            if (!hStr) return;
            const w = parseInt(wStr, 10);
            const h = parseInt(hStr, 10);
            if (w > 0 && h > 0) window.jspenApp?.resizeCanvasInteractive(w, h);
          });
        });
      });

      this.el.querySelector('#winClose')?.addEventListener('click', () => {
        NativeBridge.send('window_close');
      });

      this.el.querySelector('#btnOpenTemplateGallery')?.addEventListener('click', () => {
        if (window.jspenApp?.templateModal) {
          window.jspenApp.templateModal.show();
        }
      });

      // Web template items
      this.el.querySelectorAll('[data-web-tpl]').forEach(btn => {
        btn.addEventListener('click', () => {
          const tpl = btn.getAttribute('data-web-tpl');
          if (tpl && window.jspenApp?.insertWebsiteTemplate) {
            window.jspenApp.insertWebsiteTemplate(tpl);
          }
        });
      });

      // File actions
      this.el.querySelector('#mExp')?.addEventListener('click', () => this.cb.onExport());
      this.el.querySelector('#mSettings')?.addEventListener('click', () => this.cb.onOpenSettings());
      this.el.querySelector('#mShortcutsHelp')?.addEventListener('click', () => this.cb.onOpenSettings());
      this.el.querySelector('#mTutorial')?.addEventListener('click', () => window.jspenApp?.tutorial.start());
      this.el.querySelector('#mNew')?.addEventListener('click', async () => {
        const ok = window.jspenApp && !window.jspenApp.isDirty()
          ? true : await StudioModal.confirm('새 도큐먼트를 생성하시겠습니까? 저장되지 않은 작업은 유실됩니다.', '새 도큐먼트');
        if (ok) {
          location.reload();
        }
      });
      this.el.querySelector('#mSave')?.addEventListener('click', () => window.jspenApp?.saveProject());
      this.el.querySelector('#mSaveAs')?.addEventListener('click', () => window.jspenApp?.saveProject(true));
      this.el.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => window.jspenApp?.setView(btn.dataset.view)));
      this.el.querySelectorAll('[data-form-kind]').forEach(btn => btn.addEventListener('click', () => window.jspenApp?.insertFormElement(btn.dataset.formKind)));
      this.el.querySelector('#mImportImage')?.addEventListener('click', () => window.jspenApp?.pickImage());
      this.el.querySelector('#mAddFont')?.addEventListener('click', () => window.jspenApp?.addFontFile());
      this.el.querySelector('#mOpen')?.addEventListener('click', () => window.jspenApp?.openProject());

      // Edit actions
      this.el.querySelector('#mUndo')?.addEventListener('click', () => {
        if (this.doc.undo()) this.cb.onUpdate();
      });
      this.el.querySelector('#mRedo')?.addEventListener('click', () => {
        if (this.doc.redo()) this.cb.onUpdate();
      });
      this.el.querySelector('#mSelectAll')?.addEventListener('click', () => {
        this.doc.selectAll();
        this.cb.onUpdate();
      });

      // Window layout toggle
      this.el.querySelector('#wToolbox')?.addEventListener('click', () => {
        if (this.cb.onToggleToolbox) this.cb.onToggleToolbox();
        this.render();
      });
      this.el.querySelector('#wOptionBar')?.addEventListener('click', () => {
        if (this.cb.onToggleOptionBar) this.cb.onToggleOptionBar();
        this.render();
      });
      this.el.querySelector('#wInspector')?.addEventListener('click', () => {
        if (this.cb.onToggleDocker) this.cb.onToggleDocker('inspector');
        this.render();
      });
      this.el.querySelector('#wLayers')?.addEventListener('click', () => {
        if (this.cb.onToggleDocker) this.cb.onToggleDocker('layers');
        this.render();
      });
      this.el.querySelector('#wTimeline')?.addEventListener('click', () => {
        if (this.cb.onToggleDocker) this.cb.onToggleDocker('timeline');
        this.render();
      });
      this.el.querySelector('#wResetLayout')?.addEventListener('click', () => {
        if (this.cb.onResetLayout) this.cb.onResetLayout();
      });
    }
  }

  // ==========================================================================
  // 17. NodeEditorUI (Blender Shader Node Editor Standard - GPU Transform Edition)
  // ==========================================================================
  class NodeEditorUI {
    constructor(container, doc, callbacks) {
      this.container = container;
      this.doc = doc;
      this.cb = callbacks;
      this.pan = { x: 50, y: 50 };
      this.zoom = 1;
      this.nodes = [];
      this.wires = []; // { id, fromNode, fromPort, toNode, toPort }
      this.connectingWire = null;
      this.isPanning = false;
      this.panStart = { x: 0, y: 0 };
      this.knifeCutting = false;
      this.knifePath = [];

      this.syncFromDoc();
      this.bindEventsOnce();
    }

    updateTransform() {
      const nodesLayer = this.container.querySelector('#nodesLayer');
      const svg = this.container.querySelector('#nodeWiresSvg');
      const knifeSvg = this.container.querySelector('#nodeKnifeSvg');
      const transformVal = `translate(${this.pan.x}px, ${this.pan.y}px) scale(${this.zoom})`;
      if (nodesLayer) {
        nodesLayer.style.transformOrigin = '0 0';
        nodesLayer.style.transform = transformVal;
      }
      if (svg) {
        svg.style.transformOrigin = '0 0';
        svg.style.transform = transformVal;
      }
      if (knifeSvg) {
        knifeSvg.style.transformOrigin = '0 0';
        knifeSvg.style.transform = transformVal;
      }
    }

    syncFromDoc() {
      const existingPositions = new Map();
      for (const n of this.nodes) {
        existingPositions.set(n.id, { x: n.x, y: n.y });
      }

      this.nodes = [];
      const newWires = [];

      // Output Master Node (Header: OUTPUT)
      const masterPos = existingPositions.get('output_master') || { x: 860, y: 120 };
      this.nodes.push({
        id: 'output_master',
        category: 'output',
        type: 'output_master',
        title: '최종 웹사이트 출력 (OUTPUT)',
        badge: 'MASTER',
        x: masterPos.x, y: masterPos.y,
        inputs: [{ name: 'In', type: 'flow' }],
        outputs: [],
        params: {}
      });

      const selSprite = this.doc.getSelectedSprite();
      let targetSprites = [];

      if (selSprite) {
        if (selSprite.linkGroup) {
          for (const ly of this.doc.layers) {
            for (const sp of ly.sprites) {
              if (sp.linkGroup === selSprite.linkGroup && !targetSprites.some(ts => ts.id === sp.id)) {
                targetSprites.push(sp);
              }
            }
          }
        } else {
          targetSprites = [selSprite];
        }
      } else {
        for (const ly of this.doc.layers) {
          if (ly.sprites.length > 0) {
            targetSprites = [ly.sprites[0]];
            break;
          }
        }
      }

      this.updateToolbarSpriteSelector(targetSprites[0]);

      let curY = 60;
      for (const sprite of targetSprites) {
        const spNodeId = 'sp_' + sprite.id;
        const spPos = existingPositions.get(spNodeId) || { x: 80, y: curY };
        this.nodes.push({
          id: spNodeId,
          category: 'output',
          type: 'output_sprite',
          spriteId: sprite.id,
          title: sprite.name + (sprite.linkGroup ? ` ([링크그룹${sprite.linkGroup})` : ''),
          badge: sprite.type === 'screen_trigger' ? 'TRIG' : 'SPRITE',
          x: spPos.x, y: spPos.y,
          inputs: [],
          outputs: [
            { name: 'Transform', type: 'vector' },
            { name: 'Visual', type: 'color' },
            { name: 'Flow', type: 'flow' }
          ],
          params: {}
        });

        let modX = 360;
        let prevModNodeId = spNodeId;
        for (const mod of (sprite.modules || [])) {
          const mNodeId = 'node_' + mod.id;
          const mPos = existingPositions.get(mNodeId) || { x: modX, y: curY };
          const def = MODULE_REGISTRY[mod.type] || {};
          const cat = def.category || 'motion';

          // Build dynamic input ports corresponding to parameters
          const modInputs = [{ name: 'In', type: 'flow' }];
          const pKeys = Object.keys(mod.params || {});
          for (const k of pKeys) {
            modInputs.push({ name: 'param_' + k, type: 'float', paramKey: k });
          }

          const modOutputs = [
            { name: 'Out', type: 'flow' }
          ];
          if (mod.type === 'math_calculate' || cat === 'logic') {
            modOutputs.push({ name: 'Result', type: 'float' });
          } else {
            modOutputs.push({ name: 'Transform', type: 'vector' });
          }

          this.nodes.push({
            id: mNodeId,
            category: cat,
            type: mod.type,
            modId: mod.id,
            spriteId: sprite.id,
            title: mod.name,
            badge: def.icon || 'MOD',
            x: mPos.x, y: mPos.y,
            inputs: modInputs,
            outputs: modOutputs,
            params: mod.params || {}
          });

          newWires.push({
            id: 'w_' + Math.random().toString(36).substr(2, 7),
            fromNode: prevModNodeId, fromPort: 'Flow',
            toNode: mNodeId, toPort: 'In'
          });
          prevModNodeId = mNodeId;
          modX += 270;
        }

        if (prevModNodeId !== spNodeId) {
          newWires.push({
            id: 'w_' + Math.random().toString(36).substr(2, 7),
            fromNode: prevModNodeId, fromPort: 'Out',
            toNode: 'output_master', toPort: 'In'
          });
        }

        curY += 240;
      }

      // Preserve existing valid wires
      if (this.wires.length === 0) {
        this.wires = newWires;
      } else {
        const validNodeIds = new Set(this.nodes.map(n => n.id));
        this.wires = this.wires.filter(w => validNodeIds.has(w.fromNode) && validNodeIds.has(w.toNode));
        for (const nw of newWires) {
          if (!this.wires.some(w => w.toNode === nw.toNode && w.toPort === nw.toPort)) {
            this.wires.push(nw);
          }
        }
      }
    }

    updateToolbarSpriteSelector(curSel) {
      const tb = this.container.querySelector('.node-editor-toolbar .ne-title-group');
      if (!tb) return;

      let selEl = tb.querySelector('#neSpriteFilter');
      if (!selEl) {
        selEl = document.createElement('select');
        selEl.id = 'neSpriteFilter';
        selEl.className = 'form-control form-control-sm';
        selEl.style.cssText = 'background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;height:24px;font-size:11px;border-radius:2px;max-width:170px;margin-left:8px;';
        tb.appendChild(selEl);

        selEl.addEventListener('change', () => {
          const chosenId = selEl.value;
          if (chosenId) {
            this.doc.selectedSpriteId = chosenId;
            this.syncFromDoc();
            this.render();
            this.cb.onUpdate();
          }
        });
      }

      let options = '';
      for (const ly of this.doc.layers) {
        for (const sp of ly.sprites) {
          const isSelected = curSel && curSel.id === sp.id;
          const linkStr = sp.linkGroup ? ` ([링크그룹${escapeHtml(sp.linkGroup)})` : '';
          options += `<option value="${escapeHtml(sp.id)}" ${isSelected ? 'selected' : ''}>${escapeHtml(sp.name)}${linkStr}</option>`;
        }
      }
      selEl.innerHTML = options || '<option value="">스프라이트 없음</option>';
    }

    getActiveModuleIds() {
      const activeMods = new Set();
      const visited = new Set(['output_master']);
      const queue = ['output_master'];

      while (queue.length > 0) {
        const curId = queue.shift();
        for (const w of this.wires) {
          if (w.toNode === curId) {
            const fromId = w.fromNode;
            const node = this.nodes.find(n => n.id === fromId);
            if (node && node.modId) activeMods.add(node.modId);
            if (!visited.has(fromId)) {
              visited.add(fromId);
              queue.push(fromId);
            }
          }
        }
      }
      return activeMods;
    }

    // Module nodes present in the graph but not connected to OUTPUT.
    getDisabledModuleIds() {
      const active = this.getActiveModuleIds();
      const disabled = new Set();
      for (const n of this.nodes) {
        if (n.modId && !active.has(n.modId)) disabled.add(n.modId);
      }
      return disabled;
    }

    evaluateParamWires() {
      // Propagate connected parameter sockets
      for (const w of this.wires) {
        if (w.toPort && w.toPort.startsWith('param_')) {
          const paramKey = w.toPort.replace('param_', '');
          const fromN = this.nodes.find(n => n.id === w.fromNode);
          const toN = this.nodes.find(n => n.id === w.toNode);
          if (fromN && toN) {
            let val = 0;
            if (fromN.type === 'math_calculate') {
              const a = parseFloat(fromN.params?.inputA || fromN.params?.valA || 0);
              const b = parseFloat(fromN.params?.inputB || fromN.params?.valB || 0);
              const op = fromN.params?.operation || 'add';
              if (op === 'add') val = a + b;
              else if (op === 'subtract') val = a - b;
              else if (op === 'multiply') val = a * b;
              else if (op === 'divide') val = b !== 0 ? a / b : 0;
              else if (op === 'sin') val = Math.sin(a);
              else if (op === 'cos') val = Math.cos(a);
              else if (op === 'clamp') val = Math.max(0, Math.min(1, a));
              else val = a + b;
            } else if (fromN.params && fromN.params.value !== undefined) {
              val = parseFloat(fromN.params.value || 0);
            }
            if (!toN.params) toN.params = {};
            toN.params[paramKey] = val;
            if (toN.modId) {
              const sp = this.doc.findSpriteById(toN.spriteId);
              const mod = sp?.modules?.find(m => m.id === toN.modId);
              if (mod) mod.params[paramKey] = val;
            }
          }
        }
      }
    }

    render() {
      const area = this.container.querySelector('#nodeGraphArea');
      const nodesLayer = this.container.querySelector('#nodesLayer');
      if (!area || !nodesLayer) return;

      this.updateTransform();
      this.evaluateParamWires();

      const activeMods = this.getActiveModuleIds();

      nodesLayer.innerHTML = this.nodes.map(n => {
        const isActive = n.type === 'output_master' || (n.modId && activeMods.has(n.modId));
        const catClass = 'cat-' + (n.category || 'motion');

        // Main input/output ports (excluding parameter inputs)
        const mainInputs = (n.inputs || []).filter(p => !p.name.startsWith('param_'));
        const mainOutputs = n.outputs || [];

        return `
          <div class="graph-node ${escapeHtml(catClass)} ${n.type === 'output_master' ? 'node-output' : ''} ${n.id === this.doc.selectedNodeId ? 'selected' : ''}" id="${escapeHtml(n.id)}" style="left:${escapeHtml(n.x)}px; top:${escapeHtml(n.y)}px;">
            <div class="graph-node-header">
              <span class="graph-node-title">
                <span class="graph-node-badge">${escapeHtml(n.badge)}</span>
                ${escapeHtml(n.title)}
              </span>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:9px;font-weight:700;color:${isActive ? '#e4e4e7' : '#52525b'};">${isActive ? '● ON' : '○ OFF'}</span>
                ${n.type !== 'output_master' && n.type !== 'output_sprite' ? `<button class="graph-node-close" data-act="del-node" data-node-id="${escapeHtml(n.id)}">✕</button>` : ''}
              </div>
            </div>
            
            <div class="graph-node-body">
              <div class="graph-ports-col graph-inputs">
                ${mainInputs.map(p => `
                  <div class="graph-port-row">
                    <div class="graph-port graph-port-input port-${escapeHtml(p.type || 'flow')}" data-node="${escapeHtml(n.id)}" data-port="${escapeHtml(p.name)}" data-type="${escapeHtml(p.type || 'flow')}" title="${escapeHtml(p.name)} (${escapeHtml(p.type || 'flow')})"></div>
                    <span class="graph-port-label">${escapeHtml(p.name)}</span>
                  </div>
                `).join('')}
              </div>

              <div class="graph-ports-col graph-outputs">
                ${mainOutputs.map(p => `
                  <div class="graph-port-row" style="justify-content:flex-end;">
                    <span class="graph-port-label">${escapeHtml(p.name)}</span>
                    <div class="graph-port graph-port-output port-${escapeHtml(p.type || 'flow')}" data-node="${escapeHtml(n.id)}" data-port="${escapeHtml(p.name)}" data-type="${escapeHtml(p.type || 'flow')}" title="${escapeHtml(p.name)} (${escapeHtml(p.type || 'flow')})"></div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Inline Blender-like Parameter Sockets & Controls -->
            <div class="graph-node-controls">
              ${this.renderNodeInlineControls(n)}
            </div>
          </div>
        `;
      }).join('');

      this.renderWires();
    }

    renderNodeInlineControls(n) {
      const isConnected = (pName) => this.wires.some(w => w.toNode === n.id && w.toPort === pName);

      if (n.type === 'math_calculate' || n.category === 'logic') {
        const op = n.params.operation || 'add';
        const aConnected = isConnected('param_valA') || isConnected('param_inputA');
        const bConnected = isConnected('param_valB') || isConnected('param_inputB');
        return `
          <div class="node-inline-control" style="margin-bottom:6px;">
            <span class="node-inline-label">연산:</span>
            <select class="node-inline-select" data-node-ctrl="operation" style="width:100px;background:#27272a;border:1px solid #3f3f46;color:#f4f4f5;font-size:10px;padding:2px;border-radius:2px;">
              <option value="add" ${op==='add'?'selected':''}>+ 더하기 (Add)</option>
              <option value="subtract" ${op==='subtract'?'selected':''}>- 빼기 (Subtract)</option>
              <option value="multiply" ${op==='multiply'?'selected':''}>× 곱하기 (Multiply)</option>
              <option value="divide" ${op==='divide'?'selected':''}>÷ 나누기 (Divide)</option>
              <option value="sin" ${op==='sin'?'selected':''}>sin 사인</option>
              <option value="cos" ${op==='cos'?'selected':''}>cos 코사인</option>
              <option value="clamp" ${op==='clamp'?'selected':''}>clamp (0~1)</option>
              <option value="min" ${op==='min'?'selected':''}>min 최솟값</option>
              <option value="max" ${op==='max'?'selected':''}>max 최댓값</option>
            </select>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;margin-bottom:4px;position:relative;">
            <div class="graph-port graph-port-input port-float ${aConnected?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_inputA" data-type="float" title="값 A 입력 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">값 A:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="inputA" value="${escapeHtml(n.params.inputA !== undefined ? n.params.inputA : (n.params.valA || 0))}" ${aConnected?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${bConnected?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_inputB" data-type="float" title="값 B 입력 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">값 B:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="inputB" value="${escapeHtml(n.params.inputB !== undefined ? n.params.inputB : (n.params.valB !== undefined ? n.params.valB : 1))}" ${bConnected?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.type === 'photoshop_filter') {
        const blurConn = isConnected('param_blur');
        const brightConn = isConnected('param_brightness');
        return `
          <div class="node-inline-control" style="display:flex;align-items:center;margin-bottom:4px;position:relative;">
            <div class="graph-port graph-port-input port-float ${blurConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_blur" data-type="float" title="블러 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">블러(px):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="blur" step="1" min="0" value="${escapeHtml(n.params.blur || 0)}" ${blurConn?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${brightConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_brightness" data-type="float" title="밝기 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">밝기(%):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="brightness" step="5" min="0" value="${escapeHtml(n.params.brightness !== undefined ? n.params.brightness : 100)}" ${brightConn?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.type === 'follow_target') {
        const stConn = isConnected('param_stiffness');
        const dpConn = isConnected('param_damping');
        return `
          <div class="node-inline-control" style="margin-bottom:6px;">
            <span class="node-inline-label">모드:</span>
            <select class="node-inline-select" data-node-ctrl="trackMode" style="width:100px;background:#27272a;border:1px solid #3f3f46;color:#f4f4f5;font-size:10px;padding:2px;border-radius:2px;">
              <option value="spring" ${n.params.trackMode==='spring'?'selected':''}>스프링 (Spring)</option>
              <option value="lerp" ${n.params.trackMode==='lerp'?'selected':''}>부드러운 추적 (Lerp)</option>
              <option value="constant" ${n.params.trackMode==='constant'?'selected':''}>일정 속도 (Constant)</option>
              <option value="orbit" ${n.params.trackMode==='orbit'?'selected':''}>주변 공전 (Orbit)</option>
              <option value="elastic" ${n.params.trackMode==='elastic'?'selected':''}>탄성 (Elastic)</option>
              <option value="direct" ${n.params.trackMode==='direct'?'selected':''}>즉시 고정 (Direct)</option>
            </select>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;margin-bottom:4px;position:relative;">
            <div class="graph-port graph-port-input port-float ${stConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_stiffness" data-type="float" title="강도 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">강도 (Stiffness):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="stiffness" step="0.05" value="${escapeHtml(n.params.stiffness !== undefined ? n.params.stiffness : 0.1)}" ${stConn?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${dpConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_damping" data-type="float" title="감쇠 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">감쇠 (Damping):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="damping" step="0.05" value="${escapeHtml(n.params.damping !== undefined ? n.params.damping : 0.8)}" ${dpConn?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.category === 'motion' || n.type === 'motion_pos') {
        const spdConn = isConnected('param_speed');
        const smConn = isConnected('param_smooth');
        return `
          <div class="node-inline-control" style="display:flex;align-items:center;margin-bottom:4px;position:relative;">
            <div class="graph-port graph-port-input port-float ${spdConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_speed" data-type="float" title="속도 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">속도:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="speed" step="0.1" value="${escapeHtml(n.params.speed || 1)}" ${spdConn?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${smConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_smooth" data-type="float" title="스무딩 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">스무딩:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="smooth" step="0.05" min="0" max="1" value="${escapeHtml(n.params.smooth || 0.15)}" ${smConn?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.category === 'color' || n.type === 'color_val') {
        const alpConn = isConnected('param_alpha');
        return `
          <div class="node-inline-control" style="margin-bottom:4px;">
            <span class="node-inline-label">색상:</span>
            <input type="color" class="node-inline-color" data-node-ctrl="color" value="${escapeHtml(n.params.color || '#d4d4d8')}">
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${alpConn?'port-connected':''}" data-node="${escapeHtml(n.id)}" data-port="param_alpha" data-type="float" title="투명도 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">투명도:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="alpha" step="0.1" min="0" max="1" value="${escapeHtml(n.params.alpha !== undefined ? n.params.alpha : 1)}" ${alpConn?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      return '';
    }

    calculateWirePath(x1, y1, x2, y2) {
      const dx = x2 - x1;
      const dy = y2 - y1;
      if (dx >= 0) {
        // Forward flow: Blender cubic bezier
        const tension = Math.max(45, Math.min(200, dx * 0.55));
        return `M ${x1} ${y1} C ${x1 + tension} ${y1}, ${x2 - tension} ${y2}, ${x2} ${y2}`;
      } else {
        // Backward loop
        const tension = Math.min(180, Math.max(55, Math.abs(dx) * 0.45 + 40));
        const vBow = (dy >= 0 ? 1 : -1) * Math.min(Math.abs(dy) * 0.25 + 20, 70);
        return `M ${x1} ${y1} C ${x1 + tension} ${y1 + vBow}, ${x2 - tension} ${y2 - vBow}, ${x2} ${y2}`;
      }
    }

    getPortCoord(nodeId, portName, isOutput) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return { x: 0, y: 0 };
      const nodeEl = document.getElementById(nodeId);
      if (nodeEl) {
        // Exact port lookup by data-port
        let portEl = nodeEl.querySelector(`.graph-port[data-port="${CSS.escape(String(portName))}"]`);
        if (!portEl) {
          portEl = nodeEl.querySelector(isOutput ? '.graph-port-output' : '.graph-port-input');
        }
        if (portEl) {
          const nRect = nodeEl.getBoundingClientRect();
          const pRect = portEl.getBoundingClientRect();
          const z = this.zoom || 1;
          const px = node.x + (pRect.left + pRect.width / 2 - nRect.left) / z;
          const py = node.y + (pRect.top + pRect.height / 2 - nRect.top) / z;
          return { x: px, y: py };
        }
      }
      return {
        x: isOutput ? node.x + 220 : node.x,
        y: node.y + 42
      };
    }

    renderWires() {
      const svg = this.container.querySelector('#nodeWiresSvg');
      if (!svg) return;

      const activeMods = this.getActiveModuleIds();
      let paths = '';

      for (const w of this.wires) {
        const fromN = this.nodes.find(n => n.id === w.fromNode);
        const toN = this.nodes.find(n => n.id === w.toNode);
        if (!fromN || !toN) continue;

        const p1 = this.getPortCoord(w.fromNode, w.fromPort, true);
        const p2 = this.getPortCoord(w.toNode, w.toPort, false);
        const d = this.calculateWirePath(p1.x, p1.y, p2.x, p2.y);
        const isAct = toN.id === 'output_master' || (toN.modId && activeMods.has(toN.modId)) || w.toPort?.startsWith('param_');

        paths += `<path id="wire_${escapeHtml(w.id)}" d="${escapeHtml(d)}" class="graph-wire ${isAct ? 'wire-active' : ''}" data-wire-id="${escapeHtml(w.id)}" data-from="${escapeHtml(w.fromNode)}" data-to="${escapeHtml(w.toNode)}" title="클릭하여 연결 끊기" />`;
      }

      svg.innerHTML = paths;
    }

    updateNodeWires(nodeId) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) return;
      const svg = this.container.querySelector('#nodeWiresSvg');
      if (!svg) return;

      svg.querySelectorAll(`.graph-wire[data-from="${nodeId}"]`).forEach(pathEl => {
        const wId = pathEl.dataset.wireId;
        const w = this.wires.find(wire => wire.id === wId);
        if (!w) return;
        const p1 = this.getPortCoord(w.fromNode, w.fromPort, true);
        const p2 = this.getPortCoord(w.toNode, w.toPort, false);
        pathEl.setAttribute('d', this.calculateWirePath(p1.x, p1.y, p2.x, p2.y));
      });

      svg.querySelectorAll(`.graph-wire[data-to="${nodeId}"]`).forEach(pathEl => {
        const wId = pathEl.dataset.wireId;
        const w = this.wires.find(wire => wire.id === wId);
        if (!w) return;
        const p1 = this.getPortCoord(w.fromNode, w.fromPort, true);
        const p2 = this.getPortCoord(w.toNode, w.toPort, false);
        pathEl.setAttribute('d', this.calculateWirePath(p1.x, p1.y, p2.x, p2.y));
      });
    }

    updateTempWire(startX, startY, curX, curY) {
      const svg = this.container.querySelector('#nodeWiresSvg');
      if (!svg) return;
      let temp = svg.querySelector('#tempConnectingWire');
      if (!temp) {
        temp = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        temp.id = 'tempConnectingWire';
        temp.setAttribute('class', 'graph-wire');
        svg.appendChild(temp);
      }
      temp.setAttribute('d', this.calculateWirePath(startX, startY, curX, curY));
    }

    removeTempWire() {
      const temp = this.container.querySelector('#tempConnectingWire');
      if (temp) temp.remove();
    }

    deleteNode(nId) {
      if (nId === 'output_master' || nId.startsWith('sp_')) return;
      const node = this.nodes.find(n => n.id === nId);
      if (node && node.modId) {
        for (const l of this.doc.layers) {
          for (const s of l.sprites) {
            s.modules = (s.modules || []).filter(m => m.id !== node.modId);
          }
        }
      }
      this.nodes = this.nodes.filter(n => n.id !== nId);
      this.wires = this.wires.filter(w => w.fromNode !== nId && w.toNode !== nId);
      this.render();
      this.cb.onUpdate();
    }

    bindEventsOnce() {
      const area = this.container.querySelector('#nodeGraphArea');
      const nodesLayer = this.container.querySelector('#nodesLayer');
      const svg = this.container.querySelector('#nodeWiresSvg');
      const knifeSvg = this.container.querySelector('#nodeKnifeSvg');
      if (!area || !nodesLayer || !svg) return;

      // Return to Studio Button
      this.container.querySelector('#btnNodeClose')?.addEventListener('click', () => {
        this.cb.onToggleNodeMode();
      });

      // Shift+A / Add Node Menu Button
      this.container.querySelector('#btnNodeAddMenu')?.addEventListener('click', () => {
        const r = area.getBoundingClientRect();
        this.showSearchMenu(r.width / 2 - 250, r.height / 2 - 200);
      });

      // Auto Layout
      this.container.querySelector('#btnNodeAutoLayout')?.addEventListener('click', () => {
        this.syncFromDoc();
        this.render();
      });

      // Knife Cut Mode Toggle Button Info
      this.container.querySelector('#btnNodeCutKnife')?.addEventListener('click', () => {
        StudioToast.show('나이프: Ctrl + 우클릭 드래그로 전선을 자릅니다.');
      });

      // Single-point delegation for clicking wires to sever
      svg.addEventListener('click', e => {
        const wireEl = e.target.closest('.graph-wire[data-wire-id]');
        if (wireEl) {
          const wId = wireEl.dataset.wireId;
          this.wires = this.wires.filter(w => w.id !== wId);
          this.renderWires();
          this.cb.onUpdate();
        }
      });

      // Inline controls & close buttons delegation on nodesLayer
      nodesLayer.addEventListener('change', e => {
        const input = e.target.closest('[data-node-ctrl]');
        if (!input) return;
        const nodeEl = input.closest('.graph-node');
        if (!nodeEl) return;
        const node = this.nodes.find(n => n.id === nodeEl.id);
        if (!node) return;

        const ctrlKey = input.dataset.nodeCtrl;
        if (!node.params) node.params = {};
        node.params[ctrlKey] = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;
        if (node.modId) {
          const sp = this.doc.getSelectedSprite();
          const mod = sp?.modules?.find(m => m.id === node.modId);
          if (mod) mod.params[ctrlKey] = node.params[ctrlKey];
        }
        this.cb.onUpdate();
      });

      nodesLayer.addEventListener('click', e => {
        const delBtn = e.target.closest('[data-act="del-node"]');
        if (delBtn) {
          e.stopPropagation();
          this.deleteNode(delBtn.dataset.nodeId);
        }
      });

      // Port Dragging & Node Selection / Dragging on nodesLayer
      nodesLayer.addEventListener('mousedown', e => {
        const port = e.target.closest('.graph-port');
        if (port) {
          e.stopPropagation();
          const isInput = port.classList.contains('graph-port-input');
          const nId = port.dataset.node;
          const pName = port.dataset.port;

          const rArea = area.getBoundingClientRect();
          let startNodeId = nId;
          let startPortName = pName;
          let startX = 0, startY = 0;

          // Socket Detach: If dragging an input port that already has a connection, unplug it!
          if (isInput) {
            const existingWire = this.wires.find(w => w.toNode === nId && w.toPort === pName);
            if (existingWire) {
              this.wires = this.wires.filter(w => w.id !== existingWire.id);
              const fromN = this.nodes.find(n => n.id === existingWire.fromNode);
              startNodeId = existingWire.fromNode;
              startPortName = existingWire.fromPort;
              const pStart = this.getPortCoord(existingWire.fromNode, existingWire.fromPort, true);
              startX = pStart.x;
              startY = pStart.y;
              this.renderWires();
            } else {
              return; // Input port with no wire cannot drag out
            }
          } else {
            const pStart = this.getPortCoord(nId, pName, true);
            startX = pStart.x;
            startY = pStart.y;
          }

          const onPortMove = ev => {
            const curX = (ev.clientX - rArea.left - this.pan.x) / this.zoom;
            const curY = (ev.clientY - rArea.top - this.pan.y) / this.zoom;
            this.updateTempWire(startX, startY, curX, curY);
          };

          const onPortUp = ev => {
            this.removeTempWire();
            window.removeEventListener('mousemove', onPortMove);
            window.removeEventListener('mouseup', onPortUp);

            const targetPort = document.elementFromPoint(ev.clientX, ev.clientY)?.closest('.graph-port-input');
            if (targetPort && targetPort.dataset.node !== startNodeId) {
              this.wires.push({
                id: 'w_' + Math.random().toString(36).substr(2, 7),
                fromNode: startNodeId,
                fromPort: startPortName,
                toNode: targetPort.dataset.node,
                toPort: targetPort.dataset.port
              });
              this.renderWires();
              this.cb.onUpdate();
            }
          };

          window.addEventListener('mousemove', onPortMove);
          window.addEventListener('mouseup', onPortUp);
          return;
        }

        // Node card selection & dragging
        const nodeEl = e.target.closest('.graph-node');
        if (nodeEl && e.target.closest('.graph-node-header')) {
          e.stopPropagation();
          const node = this.nodes.find(n => n.id === nodeEl.id);
          if (!node) return;
          this.doc.selectedNodeId = node.id;
          if (node.modId) this.doc.selectedModuleId = node.modId;
          
          nodesLayer.querySelectorAll('.graph-node').forEach(el => el.classList.toggle('selected', el.id === node.id));
          this.cb.onUpdate();

          const startMx = e.clientX, startMy = e.clientY;
          const origX = node.x, origY = node.y;

          const onNodeMove = ev => {
            node.x = origX + (ev.clientX - startMx) / this.zoom;
            node.y = origY + (ev.clientY - startMy) / this.zoom;
            nodeEl.style.left = `${node.x}px`;
            nodeEl.style.top = `${node.y}px`;
            this.updateNodeWires(node.id);
          };

          const onNodeUp = () => {
            window.removeEventListener('mousemove', onNodeMove);
            window.removeEventListener('mouseup', onNodeUp);
          };

          window.addEventListener('mousemove', onNodeMove);
          window.addEventListener('mouseup', onNodeUp);
        }
      });

      // Canvas Panning & Knife Cutting
      area.addEventListener('mousedown', e => {
        // Knife Cut Tool: Ctrl + Right Click drag
        if (e.ctrlKey && e.button === 2) {
          e.preventDefault();
          this.knifeCutting = true;
          const rArea = area.getBoundingClientRect();
          const p0 = {
            x: (e.clientX - rArea.left - this.pan.x) / this.zoom,
            y: (e.clientY - rArea.top - this.pan.y) / this.zoom
          };
          this.knifePath = [p0];

          const onKnifeMove = ev => {
            const p = {
              x: (ev.clientX - rArea.left - this.pan.x) / this.zoom,
              y: (ev.clientY - rArea.top - this.pan.y) / this.zoom
            };
            this.knifePath.push(p);
            if (this.knifePath.length > 1) {
              const p1 = this.knifePath[0];
              const p2 = this.knifePath[this.knifePath.length - 1];
              knifeSvg.innerHTML = `<line x1="${escapeHtml(p1.x)}" y1="${escapeHtml(p1.y)}" x2="${escapeHtml(p2.x)}" y2="${escapeHtml(p2.y)}" class="node-knife-line" />`;
            }
          };

          const onKnifeUp = () => {
            this.knifeCutting = false;
            knifeSvg.innerHTML = '';
            window.removeEventListener('mousemove', onKnifeMove);
            window.removeEventListener('mouseup', onKnifeUp);

            if (this.knifePath.length > 1) {
              const p1 = this.knifePath[0];
              const p2 = this.knifePath[this.knifePath.length - 1];
              this.severWiresIntersecting(p1, p2);
            }
          };

          window.addEventListener('mousemove', onKnifeMove);
          window.addEventListener('mouseup', onKnifeUp);
          return;
        }

        // Panning canvas: Middle click or background click
        if (e.button === 1 || e.target === area || e.target.id === 'nodesLayer' || e.target.id === 'nodeWiresSvg') {
          this.isPanning = true;
          this.panStart = { x: e.clientX - this.pan.x, y: e.clientY - this.pan.y };
        }
      });

      area.addEventListener('contextmenu', e => {
        e.preventDefault();
        if (!e.ctrlKey) {
          const r = area.getBoundingClientRect();
          this.showSearchMenu(e.clientX - r.left, e.clientY - r.top);
        }
      });

      // Pan mousemove
      window.addEventListener('mousemove', e => {
        if (this.isPanning) {
          this.pan.x = e.clientX - this.panStart.x;
          this.pan.y = e.clientY - this.panStart.y;
          this.updateTransform();
        }
      });

      window.addEventListener('mouseup', () => { this.isPanning = false; });

      // Canvas Zooming
      area.addEventListener('wheel', e => {
        e.preventDefault();
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        this.zoom = Math.max(0.3, Math.min(2.5, this.zoom * factor));
        this.updateTransform();
      }, { passive: false });

      // Global hotkeys in Node Mode
      window.addEventListener('keydown', e => {
        if (!this.container || this.container.classList.contains('hidden')) return;

        if (e.shiftKey && (e.key === 'A' || e.key === 'a')) {
          e.preventDefault();
          const r = area.getBoundingClientRect();
          this.showSearchMenu(r.width / 2 - 250, r.height / 2 - 200);
          return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
          const activeTag = document.activeElement?.tagName;
          if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') return;
          if (this.doc.selectedNodeId) {
            this.deleteNode(this.doc.selectedNodeId);
          }
        }
      });

      this.initSearchMenu();
    }

    severWiresIntersecting(p1, p2) {
      let severedCount = 0;
      this.wires = this.wires.filter(w => {
        const fromN = this.nodes.find(n => n.id === w.fromNode);
        const toN = this.nodes.find(n => n.id === w.toNode);
        if (!fromN || !toN) return true;

        const pStart = this.getPortCoord(w.fromNode, w.fromPort, true);
        const pEnd = this.getPortCoord(w.toNode, w.toPort, false);

        const x1 = pStart.x, y1 = pStart.y;
        const x2 = pEnd.x, y2 = pEnd.y;

        const minX = Math.min(x1, x2) - 10, maxX = Math.max(x1, x2) + 10;
        const minY = Math.min(y1, y2) - 10, maxY = Math.max(y1, y2) + 10;
        const kMinX = Math.min(p1.x, p2.x), kMaxX = Math.max(p1.x, p2.x);
        const kMinY = Math.min(p1.y, p2.y), kMaxY = Math.max(p1.y, p2.y);

        if (maxX < kMinX || minX > kMaxX || maxY < kMinY || minY > kMaxY) return true;

        const hit = this.lineIntersect(p1.x, p1.y, p2.x, p2.y, x1, y1, x2, y2);
        if (hit) {
          severedCount++;
          return false;
        }
        return true;
      });

      if (severedCount > 0) {
        this.renderWires();
        this.cb.onUpdate();
      }
    }

    lineIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
      const denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
      if (denom === 0) return false;
      const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
      const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
      return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1;
    }

    showSearchMenu(x, y) {
      const menu = this.container.querySelector('#nodeSearchMenu');
      const input = this.container.querySelector('#nsmSearchInput');
      if (!menu || !input) return;

      menu.style.left = `${Math.max(10, Math.min(window.innerWidth - 560, x))}px`;
      menu.style.top = `${Math.max(10, Math.min(window.innerHeight - 440, y))}px`;
      menu.classList.remove('hidden');
      input.value = '';
      input.focus();
      this.filterSearchMenu('');
    }

    initSearchMenu() {
      const menu = this.container.querySelector('#nodeSearchMenu');
      const input = this.container.querySelector('#nsmSearchInput');
      const body = this.container.querySelector('#nsmCategories');
      if (!menu || !input || !body) return;

      const NODE_PRESETS = [
        // 1. Math & Calculation
        { cat: 'logic', name: '계산 노드 (Math Node)', desc: '사칙연산, 삼각함수, 클램프 연산', icon: 'CALC', type: 'math_calculate', in: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }], out: [{ name: 'Result', type: 'float' }, { name: 'Out', type: 'flow' }] },
        { cat: 'logic', name: '실수 값 상수 (Float Value)', desc: '지정된 고정 숫자 출력', icon: 'NUM', type: 'float_val', in: [], out: [{ name: 'Value', type: 'float' }] },
        { cat: 'logic', name: '2D 벡터 (Vector2)', desc: 'X, Y 2차원 좌표값', icon: 'VEC', type: 'vector2_val', in: [{ name: 'X', type: 'float' }, { name: 'Y', type: 'float' }], out: [{ name: 'Vector', type: 'vector' }] },
        { cat: 'logic', name: '비교 연산 (Compare)', desc: '값 크기 비교 및 참/거짓 판단', icon: 'CMP', type: 'compare_op', in: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }], out: [{ name: 'Flow', type: 'flow' }] },

        // 2. Input / Sensor / Triggers
        { cat: 'input', name: '마우스 위치 감지 (Mouse Pos)', desc: '마우스 X, Y 실시간 추적', icon: 'POS', type: 'mouse_pos', in: [], out: [{ name: 'Vector', type: 'vector' }, { name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '클릭 & 제스처 (Click Sensor)', desc: '클릭 및 터치 상호작용', icon: 'TRG', type: 'click_sensor', in: [], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '호버 & 근접 감지 (Hover Area)', desc: '마우스 오버 및 진입 감지', icon: 'ZONE', type: 'hover_sensor', in: [], out: [{ name: 'Distance', type: 'float' }, { name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '화면 트리거 (Screen Trigger)', desc: '뷰포트 스크롤 진입 및 마우스 감지', icon: 'TRIG', type: 'screen_trigger', in: [], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '자유 드래그 (Draggable)', desc: '스프라이트를 마우스로 드래그', icon: 'DRG', type: 'draggable', in: [], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '타이머 / 펄스 틱 (Time Tick)', desc: '실시간 시간 흐름 및 주기 펄스', icon: 'CLK', type: 'time_tick', in: [], out: [{ name: 'Time', type: 'float' }] },

        // 3. Motion & Physics
        { cat: 'motion', name: '타겟 추적 (Follow Target)', desc: '스프링/보간/궤도/탄성 물리 추적', icon: 'FLW', type: 'follow_target', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }, { name: 'Transform', type: 'vector' }] },
        { cat: 'motion', name: '위치 이동 (Position Transform)', desc: '스프라이트 X, Y 위치 변형', icon: 'MOV', type: 'motion_pos', in: [{ name: 'In', type: 'flow' }, { name: 'Vector', type: 'vector' }], out: [{ name: 'Out', type: 'flow' }, { name: 'Transform', type: 'vector' }] },
        { cat: 'motion', name: '회전 모션 (Rotation)', desc: '각도 회전 및 스핀', icon: 'ROT', type: 'motion_rot', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }, { name: 'Angle', type: 'float' }] },
        { cat: 'motion', name: '크기 스케일 (Scale Pulse)', desc: '크기 확대/축소 및 펄스', icon: 'SCL', type: 'pulse_scale', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },
        { cat: 'motion', name: '파티클 방출 (Particle Emitter)', desc: '화려한 입자 이펙트 생성', icon: 'PRT', type: 'particle_emitter', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },

        // 4. Color & Filters
        { cat: 'color', name: '포토샵 필터 (Photoshop Filter)', desc: '블러, 밝기, 대비, 채도, 흑백, 그림자 FX', icon: 'FLTR', type: 'photoshop_filter', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },
        { cat: 'color', name: 'RGB 색상 지정 (Color Value)', desc: '색상 및 알파 투명도 제어', icon: 'RGB', type: 'color_val', in: [], out: [{ name: 'Color', type: 'color' }] },
        { cat: 'color', name: '외곽선 테두리 (Stroke Outline)', desc: '스프라이트 테두리 선 렌더링', icon: 'STR', type: 'stroke_fx', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },
        { cat: 'color', name: '베벨 & 라운딩 (Bevel & Radius)', desc: '모서리 둥글기 및 베벨 효과', icon: 'BVL', type: 'bevel_fx', in: [{ name: 'In', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },

        // 5. Mix & Combine
        { cat: 'combine', name: '모듈 합치기 (Mix / Merge)', desc: '여러 노드 흐름을 하나로 결합', icon: 'MRG', type: 'combine_mix', in: [{ name: 'In A', type: 'flow' }, { name: 'In B', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },
        { cat: 'combine', name: '보간 블렌드 (Lerp Blend)', desc: '두 값 사이를 부드럽게 보간', icon: 'LRP', type: 'lerp_blend', in: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }, { name: 'Factor', type: 'float' }], out: [{ name: 'Value', type: 'float' }] },

        // 6. Output
        { cat: 'output', name: '스프라이트 최종 출력', desc: '스프라이트 객체로 데이터 전달', icon: 'OUT', type: 'output_sprite', in: [{ name: 'Transform', type: 'vector' }, { name: 'Visual', type: 'color' }, { name: 'Flow', type: 'flow' }], out: [] }
      ];

      this.filterSearchMenu = (query) => {
        const q = query.trim().toLowerCase();
        const filtered = NODE_PRESETS.filter(p => !q || p.name.toLowerCase().includes(q) || p.desc.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));

        const cats = {
          logic: '🧮 계산 & 수학 (Math & Logic)',
          input: '📥 입력 & 센서 (Input & Sensor)',
          motion: '🏃 모션 & 물리 (Motion & Physics)',
          color: '필터 & 시각 (Filter & Visual)',
          combine: '🔀 합성 & 블렌드 (Mix & Combine)',
          output: '출력 (Output)'
        };

        let html = '';
        Object.keys(cats).forEach(catKey => {
          const items = filtered.filter(p => p.cat === catKey);
          if (items.length > 0) {
            html += `<div class="nsm-cat-title">${escapeHtml(cats[catKey])}</div>`;
            items.forEach((item, idx) => {
              html += `
                <div class="nsm-item ${idx === 0 && q ? 'highlighted' : ''}" data-type="${escapeHtml(item.type)}">
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <div style="font-weight:700;color:#f4f4f5;font-size:11.5px;">${escapeHtml(item.name)}</div>
                    <div style="font-size:10px;color:#71717a;">${escapeHtml(item.desc)}</div>
                  </div>
                  <span class="nsm-badge">${escapeHtml(item.icon)}</span>
                </div>
              `;
            });
          }
        });

        body.innerHTML = html || '<div style="padding:16px;font-size:11px;color:#71717a;text-align:center;">일치하는 노드가 없습니다</div>';

        body.querySelectorAll('.nsm-item').forEach(itemEl => {
          itemEl.addEventListener('click', () => {
            const pType = itemEl.dataset.type;
            const preset = NODE_PRESETS.find(p => p.type === pType);
            if (preset) {
              this.createNodeFromPreset(preset);
              menu.classList.add('hidden');
            }
          });
        });
      };

      input.addEventListener('input', e => this.filterSearchMenu(e.target.value));
      input.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          menu.classList.add('hidden');
        } else if (e.key === 'Enter') {
          const first = body.querySelector('.nsm-item');
          if (first) {
            first.click();
          }
        }
      });

      window.addEventListener('mousedown', e => {
        if (!e.target?.closest || (!e.target.closest('#nodeSearchMenu') && !e.target.closest('#btnNodeAddMenu'))) {
          menu.classList.add('hidden');
        }
      });
    }

    createNodeFromPreset(p) {
      const nId = 'node_' + Math.random().toString(36).substr(2, 7);
      const spawnX = Math.round((-this.pan.x + 380) / this.zoom);
      const spawnY = Math.round((-this.pan.y + 180) / this.zoom);

      const sp = this.doc.getSelectedSprite() || this.doc.layers[0]?.sprites[0];
      let newModId = null;
      if (sp && p.cat !== 'output') {
        if (!sp.modules) sp.modules = [];
        const newMod = {
          id: 'mod_' + Math.random().toString(36).substr(2, 9),
          type: p.type,
          name: p.name,
          enabled: true,
          params: {}
        };
        sp.modules.push(newMod);
        newModId = newMod.id;
      }

      this.nodes.push({
        id: nId,
        category: p.cat,
        type: p.type,
        modId: newModId,
        spriteId: sp?.id,
        title: p.name,
        badge: p.icon,
        x: spawnX, y: spawnY,
        inputs: p.in || [],
        outputs: p.out || [],
        params: {}
      });

      if (this.nodes.some(n => n.id === 'output_master')) {
        this.wires.push({
          id: 'w_' + Math.random().toString(36).substr(2, 7),
          fromNode: nId,
          fromPort: (p.out && p.out[0]) ? p.out[0].name : 'Flow',
          toNode: 'output_master',
          toPort: 'In'
        });
      }

      this.render();
      this.cb.onUpdate();
    }
  }

  // ==========================================================================
  // SettingsModalUI with Customizable Shortcuts & Plugin Manager
  // ==========================================================================
  class SettingsModalUI {
    constructor(pluginManager, appInstance) {
      this.pm = pluginManager;
      this.app = appInstance;
      this.el = document.createElement('div');
      this.el.className = 'modal-overlay hidden';
      this.activeTab = 'shortcuts';
      this.recordingId = null;

      this.defaultShortcuts = [
        { id: 'webPreview', name: '실시간 웹 미리보기 (Alt+W)', key: 'Alt + W' },
        { id: 'preview', name: '실시간 웹 미리보기 (Ctrl+Space)', key: 'Ctrl + Space' },
        { id: 'delete', name: '선택 스프라이트 삭제 (Delete)', key: 'Delete' },
        { id: 'nodeMode', name: '모듈 노드 모드 / 스튜디오 전환', key: 'Shift + Tab' },
        { id: 'selectAll', name: '전체 스프라이트 선택', key: 'Ctrl + A' },
        { id: 'copy', name: '스프라이트 복사', key: 'Ctrl + C' },
        { id: 'paste', name: '스프라이트 붙여넣기', key: 'Ctrl + V' },
        { id: 'undo', name: '실행 취소 (Undo)', key: 'Ctrl + Z' },
        { id: 'redo', name: '다시 실행 (Redo)', key: 'Ctrl + Y' },
        { id: 'rename', name: '이름 변경 (Rename)', key: 'F2' },
        { id: 'toolMove', name: '이동 도구 (Move)', key: 'V' },
        { id: 'toolDirect', name: '직접 선택 도구 (Direct)', key: 'A' },
        { id: 'toolCurve', name: '베지어 곡선 도구 (Bezier)', key: 'C' },
        { id: 'toolPen', name: '펜 도구 (Pen)', key: 'P' },
        { id: 'toolBrush', name: '브러시 도구 (Brush)', key: 'B' },
        { id: 'toolShape', name: '도형 도구 (Shape)', key: 'U' },
        { id: 'toolText', name: '문자 도구 (Text)', key: 'T' },
        { id: 'toolEyedropper', name: '스포이드 도구 (Eyedropper)', key: 'I' },
        { id: 'toolZoom', name: '돋보기 도구 (Zoom)', key: 'Z' }
      ];

      this.loadShortcuts();
      this.render();
      document.body.appendChild(this.el);
    }

    loadShortcuts() {
      try {
        const saved = localStorage.getItem('jspen_custom_shortcuts');
        if (saved) {
          const map = JSON.parse(saved);
          this.shortcuts = this.defaultShortcuts.map(s => ({
            ...s,
            key: map[s.id] || s.key
          }));
          return;
        }
      } catch (err) {}
      this.shortcuts = JSON.parse(JSON.stringify(this.defaultShortcuts));
    }

    saveShortcuts() {
      try {
        const map = {};
        for (const s of this.shortcuts) map[s.id] = s.key;
        localStorage.setItem('jspen_custom_shortcuts', JSON.stringify(map));
      } catch (err) {}
    }

    getShortcutKey(id) {
      const s = this.shortcuts.find(item => item.id === id);
      return s ? s.key : null;
    }

    show(tab = 'shortcuts') {
      this.activeTab = tab;
      this.recordingId = null;
      this.render();
      this.el.classList.remove('hidden');
    }

    hide() {
      this.recordingId = null;
      this.el.classList.add('hidden');
    }

    render() {
      this.el.innerHTML = `
        <div class="modal-card" style="max-width:700px;height:540px;display:flex;flex-direction:column;">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-icon" style="font-size:12px;font-weight:700;color:#e4e4e7;">⚙</span>
              <div>
                <h2 class="modal-title">환경 설정 (Settings)</h2>
                <p class="modal-desc">원하는 키로 단축키를 자유롭게 수정하거나 오픈소스 플러그인을 관리합니다.</p>
              </div>
            </div>
            <button class="modal-close-btn" id="sClose">✕</button>
          </div>

          <div class="settings-tabs">
            <button class="settings-tab ${this.activeTab==='shortcuts'?'active':''}" id="tabShortcuts">단축키 커스텀 (Hotkeys)</button>
            <button class="settings-tab ${this.activeTab==='plugins'?'active':''}" id="tabPlugins">플러그인 관리 (Plugins)</button>
          </div>

          <div class="settings-panel" style="flex:1;overflow-y:auto;padding:16px;">
            ${this.activeTab === 'shortcuts' ? this.renderShortcutsTab() : this.renderPluginsTab()}
          </div>
        </div>
      `;

      this.el.querySelector('#sClose').addEventListener('click', () => this.hide());
      this.el.addEventListener('click', e => { if (e.target === this.el) this.hide(); });

      this.el.querySelector('#tabShortcuts').addEventListener('click', () => { this.activeTab = 'shortcuts'; this.render(); });
      this.el.querySelector('#tabPlugins').addEventListener('click', () => { this.activeTab = 'plugins'; this.render(); });

      if (this.activeTab === 'shortcuts') {
        this.bindShortcutsTabEvents();
      } else {
        this.el.querySelector('#btnInstallPlugin')?.addEventListener('click', () => {
          const code = this.el.querySelector('#txtPluginCode').value;
          if (this.pm.loadFromCode(code)) {
            StudioToast.show('오픈소스 플러그인이 등록되었습니다!');
            this.render();
          }
        });
      }
    }

    renderShortcutsTab() {
      return `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
          <span style="font-size:11.5px;color:#a1a1aa;">원하는 단축키 항목의 <strong style="color:#f4f4f5;">[수정]</strong> 버튼을 누른 후 새 키를 입력하세요.</span>
          <button class="btn btn-secondary btn-sm" id="btnResetShortcuts" style="font-size:11px;">기본값으로 복원</button>
        </div>
        <table class="shortcuts-table" style="width:100%;border-collapse:collapse;font-size:11.5px;">
          <thead>
            <tr style="border-bottom:1px solid #27272a;text-align:left;color:#71717a;">
              <th style="padding:6px 10px;">기능</th>
              <th style="padding:6px 10px;width:180px;">현재 단축키</th>
              <th style="padding:6px 10px;width:90px;text-align:right;">설정</th>
            </tr>
          </thead>
          <tbody>
            ${this.shortcuts.map(s => {
              const isRec = this.recordingId === s.id;
              return `
                <tr style="border-bottom:1px solid #1f1f23;">
                  <td style="padding:8px 10px;color:#e4e4e7;">${escapeHtml(s.name)}</td>
                  <td style="padding:8px 10px;">
                    <span class="shortcut-key-badge ${isRec ? 'recording' : ''}" style="${isRec ? 'background:#38bdf8;color:#000;font-weight:700;' : ''}">
                      ${isRec ? '키 입력 대기 중 (ESC 취소)...' : escapeHtml(s.key)}
                    </span>
                  </td>
                  <td style="padding:8px 10px;text-align:right;">
                    <button class="btn btn-secondary btn-sm btn-edit-shortcut" data-id="${escapeHtml(s.id)}" style="font-size:10.5px;padding:2px 8px;">
                      ${isRec ? '취소' : '수정'}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    bindShortcutsTabEvents() {
      this.el.querySelector('#btnResetShortcuts')?.addEventListener('click', async () => {
        const ok = await StudioModal.confirm('모든 단축키를 기본값으로 되돌리시겠습니까?', '단축키 초기화');
        if (ok) {
          localStorage.removeItem('jspen_custom_shortcuts');
          this.shortcuts = JSON.parse(JSON.stringify(this.defaultShortcuts));
          this.render();
          StudioToast.show('단축키가 초기화되었습니다.');
        }
      });

      this.el.querySelectorAll('.btn-edit-shortcut').forEach(btn => {
        btn.addEventListener('click', () => {
          const id = btn.dataset.id;
          if (this.recordingId === id) {
            this.recordingId = null;
            this.render();
            return;
          }
          this.recordingId = id;
          this.render();

          const onRecordKey = e => {
            e.preventDefault();
            e.stopPropagation();

            if (e.key === 'Escape') {
              this.recordingId = null;
              window.removeEventListener('keydown', onRecordKey, true);
              this.render();
              return;
            }

            if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return;

            let combo = '';
            if (e.ctrlKey || e.metaKey) combo += 'Ctrl + ';
            if (e.altKey) combo += 'Alt + ';
            if (e.shiftKey) combo += 'Shift + ';

            let keyName = e.key.toUpperCase();
            if (e.code === 'Space') keyName = 'Space';
            combo += keyName;

            const target = this.shortcuts.find(s => s.id === this.recordingId);
            if (target) {
              target.key = combo;
              this.saveShortcuts();
            }

            this.recordingId = null;
            window.removeEventListener('keydown', onRecordKey, true);
            this.render();
          };

          window.addEventListener('keydown', onRecordKey, true);
        });
      });
    }

    renderPluginsTab() {
      return `
        <div style="font-size:11.5px;color:#a1a1aa;margin-bottom:12px;">
          JSPen Studio는 오픈소스 생태계를 위해 <code style="color:#e4e4e7;">window.JSPen.registerPlugin</code> API를 지원합니다.<br>
          커스텀 모듈 및 도구를 누구나 자바스크립트로 제작하여 추가할 수 있습니다.
        </div>

        <div style="font-weight:700;color:#fff;font-size:12px;margin-bottom:6px;">설치된 플러그인 목록:</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
          ${this.pm.plugins.map(p => `
            <div class="plugin-card">
              <div class="plugin-info">
                <span class="plugin-name">${escapeHtml(p.name)} <span style="font-size:10px;color:#71717a;">v${escapeHtml(p.version||'1.0')}</span></span>
                <span class="plugin-desc">${escapeHtml(p.description||'커스텀 확장 플러그인')} (작성자: ${escapeHtml(p.author||'Community')})</span>
              </div>
              <span style="font-size:11px;color:#22c55e;font-weight:700;">● 활성화됨</span>
            </div>
          `).join('')}
        </div>

        <details class="jspen-advanced">
          <summary>고급: 플러그인 코드 직접 추가 (개발자용)</summary>
        <div style="font-weight:700;color:#fff;font-size:12px;margin-bottom:6px;">새 오픈소스 플러그인 코드 추가:</div>
        <textarea class="plugin-code-area" id="txtPluginCode" placeholder="JSPen.registerPlugin({
  id: 'custom_glow',
  name: '네온 글로우 모듈',
  init(api) { ... }
});" style="width:100%;height:100px;background:#141416;border:1px solid #27272a;color:#f4f4f5;font-family:monospace;font-size:11px;padding:8px;border-radius:2px;margin-bottom:8px;"></textarea>
        <button class="btn btn-primary btn-sm" id="btnInstallPlugin">+ 플러그인 등록 및 적용</button>
        </details>
      `;
    }
  }

  class PluginManager {
    constructor() {
      this.plugins = [];
      this.initBuiltins();
    }

    initBuiltins() {
      this.register({
        id: 'neon_fx',
        name: '네온 발광 효과 (Neon FX)',
        version: '1.0.0',
        author: 'JSPen OpenSource',
        description: '스프라이트에 부드러운 네온 빛과 발광 효과를 추가하는 샘플 오픈소스 플러그인입니다.',
        init: (api) => {}
      });
    }

    register(def) {
      if (this.plugins.some(p => p.id === def.id)) return;
      this.plugins.push(def);
      if (typeof def.init === 'function') {
        def.init({
          MODULE_REGISTRY,
          registerModule: (id, modDef) => { MODULE_REGISTRY[id] = modDef; }
        });
      }
    }

    loadFromCode(jsCode) {
      try {
        const fn = new Function('JSPen', jsCode);
        fn({
          registerPlugin: def => this.register(def),
          MODULE_REGISTRY: MODULE_REGISTRY
        });
        return true;
      } catch (e) {
        StudioToast.show('플러그인 실행 오류: ' + e.message);
        return false;
      }
    }
  }

  // ==========================================================================
  // 17. Export Modal
  // ==========================================================================
  class ExportModalUI {
    constructor(doc) {
      this.doc = doc;
      this.el = document.createElement('div');
      this.el.className = 'modal-overlay hidden';
      this.el.innerHTML = `
        <div class="modal-card">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-icon" style="font-size:12px;font-weight:700;color:#e4e4e7;">&lt;/&gt;</span>
              <div>
                <h2 class="modal-title">순수 자바스크립트 코드 출력</h2>
                <p class="modal-desc">외부 라이브러리 없는 순수 HTML5 Canvas 2D 코드가 자동 생성되었습니다.</p>
              </div>
            </div>
            <button class="modal-close-btn" id="mClose">✕</button>
          </div>
          <div class="modal-body">
            <div class="code-container">
              <div class="code-header">
                <span>Vanilla JS (HTML5 Canvas 2D)</span>
                <div class="code-actions">
                  <button class="btn btn-secondary btn-sm" id="btnCopy">코드 복사</button>
                  <button class="btn btn-primary btn-sm" id="btnDl">파일 다운로드</button>
                  <button class="btn btn-accent btn-sm" id="btnRun">새 창에서 바로 실행</button>
                </div>
              </div>
              <pre class="code-pre"><code id="codeText"></code></pre>
            </div>
          </div>
        </div>
      `;
      document.body.appendChild(this.el);
      this.el.querySelector('#mClose').addEventListener('click', () => this.hide());
      this.el.addEventListener('click', e => { if (e.target === this.el) this.hide(); });
      this.el.querySelector('#btnCopy').addEventListener('click', () => {
        navigator.clipboard.writeText(PhotoshopJSExporter.generateJS(this.doc)).then(() => {
          const b = this.el.querySelector('#btnCopy'); b.textContent = '복사 완료!';
          setTimeout(() => b.textContent = '코드 복사', 1500);
        });
      });
      this.el.querySelector('#btnDl').addEventListener('click', () => {
        NativeBridge.downloadText('index.html', PhotoshopJSExporter.generateHTML(this.doc), 'text/html');
      });
      this.el.querySelector('#btnRun')?.addEventListener('click', async () => {
        const allowed = await window.jspenApp.scriptsForPreview();
        NativeBridge.openPreview(PhotoshopJSExporter.generateHTML(this.doc, allowed));
      });
    }
    show() {
      this.el.querySelector('#codeText').textContent = PhotoshopJSExporter.generateJS(this.doc);
      this.el.classList.remove('hidden');
    }
    hide() { this.el.classList.add('hidden'); }
  }

  // ==========================================================================
  // 18. Main Application Controller
  // ==========================================================================
  // ==========================================================================
  // 18. Krita Docker Manager (4-Way 50% Split Docking: Left/Right/Top/Bottom, Live Drag, Window Menu Sync)
  // ==========================================================================
  class KritaDockerManager {
    constructor(app) {
      this.app = app;
      this.dockers = {
        inspector: {
          id: 'inspector',
          title: '속성 (Inspector)',
          el: document.getElementById('inspectorContainer'),
          state: 'docked', // 'docked' or 'floating'
          dockArea: 'right', // 'right' or 'bottom'
          dockSlot: 'top', // 'top' or 'bottom'
          splitDir: null, // null, 'row', 'col'
          splitPos: 0,
          floatingRect: { x: window.innerWidth - 320, y: 70, w: 290, h: 420 },
          collapsed: false,
          hidden: false
        },
        layers: {
          id: 'layers',
          title: '레이어 (Layers)',
          el: document.getElementById('layersContainer'),
          state: 'docked',
          dockArea: 'right',
          dockSlot: 'bottom',
          splitDir: null,
          splitPos: 0,
          floatingRect: { x: window.innerWidth - 320, y: 500, w: 290, h: 360 },
          collapsed: false,
          hidden: false
        },
        timeline: {
          id: 'timeline',
          title: '타임라인 (Timeline)',
          el: document.getElementById('bottomTimeline'),
          state: 'docked',
          dockArea: 'bottom',
          dockSlot: 'bottom',
          splitDir: null,
          splitPos: 0,
          floatingRect: { x: 50, y: window.innerHeight - 240, w: 760, h: 220 },
          collapsed: false,
          hidden: false
        }
      };

      this.activeDropTarget = null;
      this.init();
    }

    init() {
      this.renderDockers();
      this.bindTitlebars();
      this.bindSplitters();
      this.attachFloatingResizeHandles();
    }

    isVisible(id) {
      return this.dockers[id] ? !this.dockers[id].hidden : true;
    }

    toggleVisibility(dockerId) {
      const d = this.dockers[dockerId];
      if (!d) return;
      d.hidden = !d.hidden;
      this.renderDockers();
      this.app.handleResize();
      if (this.app.menuBar) this.app.menuBar.render();
    }

    toggleFloat(dockerId) {
      const d = this.dockers[dockerId];
      if (!d) return;
      if (d.state === 'docked') {
        d.state = 'floating';
        d.splitDir = null;
        d.splitPos = 0;
        d.floatingRect.x = Math.max(80, window.innerWidth - 340);
        d.floatingRect.y = dockerId === 'inspector' ? 70 : (dockerId === 'layers' ? 480 : 200);
      } else {
        d.state = 'docked';
        d.splitDir = null;
        d.splitPos = 0;
        if (dockerId === 'inspector') { d.dockArea = 'right'; d.dockSlot = 'top'; }
        else if (dockerId === 'layers') { d.dockArea = 'right'; d.dockSlot = 'bottom'; }
        else if (dockerId === 'timeline') { d.dockArea = 'bottom'; d.dockSlot = 'bottom'; }
      }
      this.renderDockers();
    }

    toggleCollapse(dockerId) {
      const d = this.dockers[dockerId];
      if (!d) return;
      d.collapsed = !d.collapsed;
      this.renderDockers();
    }

    renderDockers() {
      const rightCol = document.getElementById('kritaDockRight');
      const bottomRow = document.getElementById('kritaDockBottom');
      const floatLayer = document.getElementById('kritaFloatingLayer');
      const splitRight = document.getElementById('kritaSplitterRight');
      const splitInner = document.getElementById('kritaSplitterRightInner');
      const splitBottom = document.getElementById('kritaSplitterBottom');

      // Unwrap any existing split rows or cols so elements can be cleanly reorganized
      document.querySelectorAll('.krita-dock-split-row, .krita-dock-split-col').forEach(wrapper => {
        const p = wrapper.parentElement;
        if (p) {
          while (wrapper.firstChild) {
            p.insertBefore(wrapper.firstChild, wrapper);
          }
          wrapper.remove();
        }
      });

      const visibleDockers = Object.values(this.dockers).filter(d => !d.hidden);
      const hiddenDockers = Object.values(this.dockers).filter(d => d.hidden);

      // Hide toggled-off dockers
      hiddenDockers.forEach(d => {
        if (d.el) {
          d.el.classList.add('hidden');
          d.el.style.display = 'none';
        }
      });

      // 1. Right Dock Column
      const rightDockers = visibleDockers.filter(d => d.state === 'docked' && d.dockArea === 'right');
      if (rightDockers.length > 0) {
        if (rightCol) rightCol.classList.remove('hidden');
        if (splitRight) splitRight.classList.remove('hidden');

        const slots = { top: [], bottom: [] };
        rightDockers.forEach(d => {
          const s = d.dockSlot === 'top' ? 'top' : 'bottom';
          slots[s].push(d);
        });

        // Show inner horizontal splitter only when both slots are occupied
        if (splitInner) {
          splitInner.classList.toggle('hidden', slots.top.length === 0 || slots.bottom.length === 0);
        }

        ['top', 'bottom'].forEach(slotName => {
          const slotGroup = slots[slotName];
          if (slotGroup.length === 0) return;

          if (slotGroup.length === 1) {
            const d = slotGroup[0];
            d.splitDir = null;
            d.splitPos = 0;
            if (slotName === 'top' && splitInner && splitInner.parentElement === rightCol) {
              rightCol.insertBefore(d.el, splitInner);
            } else {
              rightCol.appendChild(d.el);
            }
            d.el.classList.remove('is-floating', 'hidden');
            d.el.classList.add('docked-flex');
            d.el.style.position = '';
            d.el.style.left = '';
            d.el.style.top = '';
            d.el.style.width = '100%';
            d.el.style.display = 'flex';
            if (d.collapsed) {
              d.el.style.height = '32px';
              d.el.style.flex = 'none';
            } else if (d.id === 'inspector' && this.inspectorHeight) {
              d.el.style.height = `${this.inspectorHeight}px`;
              d.el.style.flex = 'none';
            } else {
              d.el.style.height = '';
              d.el.style.flex = '1';
            }
          } else {
            // Check if horizontal (row) or vertical (col) split!
            const isCol = slotGroup.some(d => d.splitDir === 'col');
            const splitWrapper = document.createElement('div');
            splitWrapper.className = isCol ? 'krita-dock-split-col' : 'krita-dock-split-row';
            splitWrapper.dataset.slot = slotName;

            slotGroup.sort((a, b) => (a.splitPos || 0) - (b.splitPos || 0));

            slotGroup.forEach(d => {
              splitWrapper.appendChild(d.el);
              d.el.classList.remove('is-floating', 'hidden');
              d.el.classList.add('docked-flex');
              d.el.style.position = '';
              d.el.style.left = '';
              d.el.style.top = '';
              d.el.style.display = 'flex';

              if (isCol) {
                // Vertical 50% split: 50% height each
                d.el.style.width = '100%';
                d.el.style.height = d.collapsed ? '32px' : '50%';
                d.el.style.flex = '1 1 50%';
                d.el.style.minHeight = '0';
              } else {
                // Horizontal 50% split: 50% width each
                d.el.style.width = '50%';
                d.el.style.height = d.collapsed ? '32px' : '100%';
                d.el.style.flex = '1 1 50%';
                d.el.style.minWidth = '0';
              }
            });

            if (slotName === 'top' && splitInner && splitInner.parentElement === rightCol) {
              rightCol.insertBefore(splitWrapper, splitInner);
            } else {
              rightCol.appendChild(splitWrapper);
            }
          }
        });
      } else {
        if (rightCol) rightCol.classList.add('hidden');
        if (splitRight) splitRight.classList.add('hidden');
      }

      // 2. Bottom Dock Row
      const bottomDockers = visibleDockers.filter(d => d.state === 'docked' && d.dockArea === 'bottom');
      if (bottomDockers.length > 0) {
        if (bottomRow) bottomRow.classList.remove('hidden');
        if (splitBottom) splitBottom.classList.remove('hidden');

        if (bottomDockers.length === 1) {
          const d = bottomDockers[0];
          d.splitDir = null;
          d.splitPos = 0;
          bottomRow.appendChild(d.el);
          d.el.classList.remove('is-floating', 'hidden');
          d.el.classList.add('docked-flex');
          d.el.style.position = '';
          d.el.style.left = '';
          d.el.style.top = '';
          d.el.style.width = '100%';
          d.el.style.display = 'flex';
          if (d.collapsed) {
            d.el.style.height = '35px';
            d.el.style.flex = 'none';
          } else {
            d.el.style.height = '';
            d.el.style.flex = '1';
          }
        } else {
          // Check if horizontal (row) or vertical (col) split in bottom dock!
          const isCol = bottomDockers.some(d => d.splitDir === 'col');
          const splitWrapper = document.createElement('div');
          splitWrapper.className = isCol ? 'krita-dock-split-col' : 'krita-dock-split-row';

          bottomDockers.sort((a, b) => (a.splitPos || 0) - (b.splitPos || 0));

          bottomDockers.forEach(d => {
            splitWrapper.appendChild(d.el);
            d.el.classList.remove('is-floating', 'hidden');
            d.el.classList.add('docked-flex');
            d.el.style.position = '';
            d.el.style.left = '';
            d.el.style.top = '';
            d.el.style.display = 'flex';

            if (isCol) {
              d.el.style.width = '100%';
              d.el.style.height = d.collapsed ? '35px' : '50%';
              d.el.style.flex = '1 1 50%';
              d.el.style.minHeight = '0';
            } else {
              d.el.style.width = '50%';
              d.el.style.height = d.collapsed ? '35px' : '100%';
              d.el.style.flex = '1 1 50%';
              d.el.style.minWidth = '0';
            }
          });
          bottomRow.appendChild(splitWrapper);
        }
      } else {
        if (bottomRow) bottomRow.classList.add('hidden');
        if (splitBottom) splitBottom.classList.add('hidden');
      }

      // 3. Floating Layer
      const floatingDockers = visibleDockers.filter(d => d.state === 'floating');
      floatingDockers.forEach(d => {
        if (d.el && floatLayer) {
          floatLayer.appendChild(d.el);
          d.el.classList.add('is-floating');
          d.el.classList.remove('docked-flex', 'hidden');
          d.el.style.display = 'flex';
          d.el.style.position = 'absolute';
          d.el.style.left = `${d.floatingRect.x}px`;
          d.el.style.top = `${d.floatingRect.y}px`;
          d.el.style.width = `${d.floatingRect.w}px`;
          d.el.style.height = d.collapsed ? '32px' : `${d.floatingRect.h}px`;
        }
      });

      this.attachFloatingResizeHandles();
      this.app.handleResize();
    }

    bindTitlebars() {
      const ws = document.getElementById('psWorkspace');
      const preview = document.getElementById('kritaDropPreview');
      if (!ws) return;

      Object.values(this.dockers).forEach(docker => {
        const el = docker.el;
        if (!el) return;

        this.ensureTitlebar(docker);

        // Persistent event delegation on container element so innerHTML replacements don't sever dragging
        el.addEventListener('mousedown', e => {
          const header = e.target.closest('.krita-docker-titlebar, .timeline-header, .ps-dock-header, .ps-panel-header');
          if (!header || !el.contains(header)) return;

          // Check for collapse / float action buttons
          const actBtn = e.target.closest('[data-docker-act]');
          if (actBtn) {
            e.stopPropagation();
            const act = actBtn.dataset.dockerAct;
            if (act === 'toggle-collapse') {
              this.toggleCollapse(docker.id);
            } else if (act === 'toggle-float') {
              this.toggleFloat(docker.id);
            }
            return;
          }

          if (e.target.closest('button, input, select, .ps-win-btn, .win-resize-handle')) return;
          e.preventDefault();

          if (e.detail === 2) {
            this.toggleFloat(docker.id);
            return;
          }

          const startX = e.clientX;
          const startY = e.clientY;
          const initRect = el.getBoundingClientRect();
          let grabOffsetX = Math.min(e.clientX - initRect.left, 160);
          let grabOffsetY = Math.min(e.clientY - initRect.top, 24);
          let isDragging = false;

          const onMove = ev => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            if (!isDragging && Math.hypot(dx, dy) > 4) {
              isDragging = true;
              el.classList.add('is-dragging-ghost');
              el.style.position = 'fixed';
              el.style.zIndex = '999999';
              el.style.pointerEvents = 'none';
              el.style.width = `${Math.min(initRect.width, 320)}px`;
              el.style.height = `${Math.min(initRect.height, 280)}px`;
              if (preview) preview.classList.remove('hidden');
            }

            if (isDragging) {
              // Window follows mouse directly!
              el.style.left = `${ev.clientX - grabOffsetX}px`;
              el.style.top = `${ev.clientY - grabOffsetY}px`;

              const wsRect = ws.getBoundingClientRect();

              // Hit test other docked dockers for 4-way 50% split docking (상하좌우 50% 분할)
              let dropTarget = null;
              for (const other of Object.values(this.dockers)) {
                if (other.id !== docker.id && other.state === 'docked' && !other.hidden && other.el) {
                  const oRect = other.el.getBoundingClientRect();
                  if (ev.clientX >= oRect.left && ev.clientX <= oRect.right &&
                      ev.clientY >= oRect.top && ev.clientY <= oRect.bottom) {

                    const relX = (ev.clientX - oRect.left) / oRect.width;
                    const relY = (ev.clientY - oRect.top) / oRect.height;

                    // 4-Quadrant partition using diagonals
                    let side = 'top';
                    if (relY < relX) {
                      side = (relY < 1 - relX) ? 'top' : 'right';
                    } else {
                      side = (relY < 1 - relX) ? 'left' : 'bottom';
                    }

                    dropTarget = {
                      type: 'split',
                      area: other.dockArea,
                      slot: other.dockSlot,
                      side: side,
                      targetId: other.id
                    };

                    if (preview) {
                      preview.style.display = 'flex';
                      if (side === 'top') {
                        preview.style.left = `${oRect.left - wsRect.left}px`;
                        preview.style.top = `${oRect.top - wsRect.top}px`;
                        preview.style.width = `${oRect.width}px`;
                        preview.style.height = `${Math.floor(oRect.height * 0.5)}px`;
                        preview.textContent = '상단 50% 분할 도킹 (Split Top)';
                      } else if (side === 'bottom') {
                        preview.style.left = `${oRect.left - wsRect.left}px`;
                        preview.style.top = `${oRect.top - wsRect.top + Math.floor(oRect.height * 0.5)}px`;
                        preview.style.width = `${oRect.width}px`;
                        preview.style.height = `${Math.floor(oRect.height * 0.5)}px`;
                        preview.textContent = '하단 50% 분할 도킹 (Split Bottom)';
                      } else if (side === 'left') {
                        preview.style.left = `${oRect.left - wsRect.left}px`;
                        preview.style.top = `${oRect.top - wsRect.top}px`;
                        preview.style.width = `${Math.floor(oRect.width * 0.5)}px`;
                        preview.style.height = `${oRect.height}px`;
                        preview.textContent = '좌측 50% 분할 도킹 (Split Left)';
                      } else { // right
                        preview.style.left = `${oRect.left - wsRect.left + Math.floor(oRect.width * 0.5)}px`;
                        preview.style.top = `${oRect.top - wsRect.top}px`;
                        preview.style.width = `${Math.floor(oRect.width * 0.5)}px`;
                        preview.style.height = `${oRect.height}px`;
                        preview.textContent = '우측 50% 분할 도킹 (Split Right)';
                      }
                    }
                    break;
                  }
                }
              }

              // Hit test dock areas if not hovering over another docker
              if (!dropTarget) {
                const W = wsRect.width;
                const H = wsRect.height;
                const mx = ev.clientX - wsRect.left;
                const my = ev.clientY - wsRect.top;

                if (mx > W - 280 && mx <= W) {
                  const isTop = my < H * 0.5;
                  dropTarget = { type: 'dock', area: 'right', slot: isTop ? 'top' : 'bottom' };
                  if (preview) {
                    preview.style.display = 'flex';
                    preview.style.left = `${W - 290}px`;
                    preview.style.top = `${isTop ? 4 : Math.floor(H * 0.5)}px`;
                    preview.style.width = '286px';
                    preview.style.height = `${Math.floor(H * 0.48)}px`;
                    preview.textContent = isTop ? '우측 상단 도킹 (Dock Top)' : '우측 하단 도킹 (Dock Bottom)';
                  }
                } else if (my > H - 190 && my <= H && mx > 40 && mx < W - 280) {
                  dropTarget = { type: 'dock', area: 'bottom', slot: 'bottom' };
                  if (preview) {
                    preview.style.display = 'flex';
                    preview.style.left = '40px';
                    preview.style.top = `${H - 190}px`;
                    preview.style.width = `${W - 330}px`;
                    preview.style.height = '186px';
                    preview.textContent = '하단 도킹 (Dock Bottom)';
                  }
                } else {
                  dropTarget = {
                    type: 'float',
                    x: Math.max(40, ev.clientX - grabOffsetX),
                    y: Math.max(40, ev.clientY - grabOffsetY)
                  };
                  if (preview) preview.style.display = 'none';
                }
              }

              this.activeDropTarget = dropTarget;
            }
          };

          const onUp = ev => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            if (preview) {
              preview.classList.add('hidden');
              preview.style.display = 'none';
            }

            if (isDragging) {
              el.classList.remove('is-dragging-ghost');
              el.style.position = '';
              el.style.pointerEvents = '';
              el.style.zIndex = '';
              el.style.width = '';
              el.style.height = '';

              const target = this.activeDropTarget || { type: 'float', x: ev.clientX - grabOffsetX, y: ev.clientY - grabOffsetY };

              if (target.type === 'split') {
                const other = this.dockers[target.targetId];
                docker.state = 'docked';
                docker.dockArea = other.dockArea;

                if (other.dockArea === 'right') {
                  if (target.side === 'top' || target.side === 'bottom') {
                    // Check if other was the only docker in right dock
                    const rightDockers = Object.values(this.dockers).filter(d => d.id !== docker.id && d.state === 'docked' && d.dockArea === 'right' && !d.hidden);
                    if (rightDockers.length === 1) {
                      // Stack vertically in right dock column using top/bottom slots
                      if (target.side === 'top') {
                        docker.dockSlot = 'top';
                        docker.splitDir = null;
                        docker.splitPos = 0;
                        other.dockSlot = 'bottom';
                        other.splitDir = null;
                        other.splitPos = 0;
                      } else {
                        other.dockSlot = 'top';
                        other.splitDir = null;
                        other.splitPos = 0;
                        docker.dockSlot = 'bottom';
                        docker.splitDir = null;
                        docker.splitPos = 0;
                      }
                    } else {
                      // Multiple dockers: split this specific slot vertically!
                      docker.dockSlot = other.dockSlot;
                      docker.splitDir = 'col';
                      other.splitDir = 'col';
                      if (target.side === 'top') {
                        docker.splitPos = 0;
                        other.splitPos = 1;
                      } else {
                        other.splitPos = 0;
                        docker.splitPos = 1;
                      }
                    }
                  } else { // left or right horizontal split
                    docker.dockSlot = other.dockSlot;
                    docker.splitDir = 'row';
                    other.splitDir = 'row';
                    if (target.side === 'left') {
                      docker.splitPos = 0;
                      other.splitPos = 1;
                    } else {
                      other.splitPos = 0;
                      docker.splitPos = 1;
                    }
                  }
                } else { // bottom dock
                  docker.dockArea = 'bottom';
                  docker.dockSlot = 'bottom';
                  other.dockArea = 'bottom';
                  other.dockSlot = 'bottom';
                  if (target.side === 'top' || target.side === 'bottom') {
                    docker.splitDir = 'col';
                    other.splitDir = 'col';
                    if (target.side === 'top') {
                      docker.splitPos = 0;
                      other.splitPos = 1;
                    } else {
                      other.splitPos = 0;
                      docker.splitPos = 1;
                    }
                  } else { // left or right
                    docker.splitDir = 'row';
                    other.splitDir = 'row';
                    if (target.side === 'left') {
                      docker.splitPos = 0;
                      other.splitPos = 1;
                    } else {
                      other.splitPos = 0;
                      docker.splitPos = 1;
                    }
                  }
                }
              } else if (target.type === 'dock') {
                docker.state = 'docked';
                docker.dockArea = target.area;
                docker.dockSlot = target.slot;
                docker.splitDir = null;
                docker.splitPos = 0;
              } else {
                docker.state = 'floating';
                docker.splitDir = null;
                docker.splitPos = 0;
                docker.floatingRect.x = target.x;
                docker.floatingRect.y = target.y;
              }

              this.renderDockers();
            }
          };

          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      });
    }

    ensureTitlebar(docker) {
      const el = docker.el;
      if (!el) return;

      const titlebar = el.querySelector('.ps-dock-header, .timeline-header, .ps-panel-header');
      if (!titlebar) return;

      titlebar.classList.add('krita-docker-titlebar');

      let actions = titlebar.querySelector('.krita-docker-actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'krita-docker-actions';
        titlebar.appendChild(actions);

        actions.innerHTML = `
          <button class="krita-action-btn" data-docker-act="toggle-collapse" title="접기/펼치기">▼</button>
          <button class="krita-action-btn" data-docker-act="toggle-float" title="창 분리(Float) / 도킹(Dock)">⧉</button>
        `;

        actions.querySelector('[data-docker-act="toggle-collapse"]')?.addEventListener('click', e => {
          e.stopPropagation();
          this.toggleCollapse(docker.id);
        });

        actions.querySelector('[data-docker-act="toggle-float"]')?.addEventListener('click', e => {
          e.stopPropagation();
          this.toggleFloat(docker.id);
        });
      }
    }

    bindSplitters() {
      const splitRight = document.getElementById('kritaSplitterRight');
      const rightCol = document.getElementById('kritaDockRight');
      if (splitRight && rightCol) {
        splitRight.addEventListener('mousedown', e => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = rightCol.offsetWidth;
          splitRight.classList.add('dragging');

          const onMove = ev => {
            const newW = Math.max(160, Math.min(window.innerWidth - 150, startW - (ev.clientX - startX)));
            rightCol.style.width = `${newW}px`;
            this.app.handleResize();
          };
          const onUp = () => {
            splitRight.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            this.app.handleResize();
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      }

      const splitBottom = document.getElementById('kritaSplitterBottom');
      const bottomRow = document.getElementById('kritaDockBottom');
      if (splitBottom && bottomRow) {
        splitBottom.addEventListener('mousedown', e => {
          e.preventDefault();
          const startY = e.clientY;
          const startH = bottomRow.offsetHeight;
          splitBottom.classList.add('dragging');

          const onMove = ev => {
            const newH = Math.max(40, Math.min(window.innerHeight - 150, startH - (ev.clientY - startY)));
            bottomRow.style.height = `${newH}px`;
            this.app.handleResize();
          };
          const onUp = () => {
            splitBottom.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            this.app.handleResize();
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      }

      // Inner Splitter between Inspector and Layers in Right Dock Column
      const splitInner = document.getElementById('kritaSplitterRightInner');
      const inspEl = document.getElementById('inspectorContainer');
      const layersEl = document.getElementById('layersContainer');
      if (splitInner && rightCol && inspEl && layersEl) {
        splitInner.addEventListener('mousedown', e => {
          e.preventDefault();
          const startY = e.clientY;
          const startInspH = inspEl.offsetHeight;
          const rightColH = rightCol.offsetHeight;
          splitInner.classList.add('dragging');

          const onMove = ev => {
            const dy = ev.clientY - startY;
            const newInspH = Math.max(60, Math.min(rightColH - 60, startInspH + dy));
            this.inspectorHeight = newInspH;
            inspEl.style.height = `${newInspH}px`;
            inspEl.style.flex = 'none';
            layersEl.style.flex = '1 1 0';
            this.app.handleResize();
          };

          const onUp = () => {
            splitInner.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            this.app.handleResize();
          };

          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });

        splitInner.addEventListener('dblclick', () => {
          this.inspectorHeight = null;
          inspEl.style.height = '';
          inspEl.style.flex = '1 1 0';
          layersEl.style.height = '';
          layersEl.style.flex = '1 1 0';
          this.app.handleResize();
        });
      }
    }

    attachFloatingResizeHandles() {
      const handles = ['n', 's', 'e', 'w', 'nw', 'ne', 'sw', 'se'];
      Object.values(this.dockers).forEach(docker => {
        const el = docker.el;
        if (!el) return;

        el.querySelectorAll('.win-resize-handle').forEach(h => h.remove());

        if (docker.state === 'floating' && !docker.collapsed) {
          handles.forEach(dir => {
            const h = document.createElement('div');
            h.className = `win-resize-handle handle-${dir}`;
            el.appendChild(h);

            h.addEventListener('mousedown', e => {
              e.preventDefault();
              e.stopPropagation();

              const startX = e.clientX;
              const startY = e.clientY;
              const startL = el.offsetLeft;
              const startT = el.offsetTop;
              const startW = el.offsetWidth;
              const startH = el.offsetHeight;

              const onMove = ev => {
                const dx = ev.clientX - startX;
                const dy = ev.clientY - startY;

                let newW = startW;
                let newH = startH;
                let newL = startL;
                let newT = startT;

                if (dir.includes('e')) newW = Math.max(200, startW + dx);
                if (dir.includes('w')) {
                  newW = Math.max(200, startW - dx);
                  newL = startL + (startW - newW);
                }
                if (dir.includes('s')) newH = Math.max(100, startH + dy);
                if (dir.includes('n')) {
                  newH = Math.max(100, startH - dy);
                  newT = startT + (startH - newH);
                }

                el.style.left = `${newL}px`;
                el.style.top = `${newT}px`;
                el.style.width = `${newW}px`;
                el.style.height = `${newH}px`;

                docker.floatingRect.x = newL;
                docker.floatingRect.y = newT;
                docker.floatingRect.w = newW;
                docker.floatingRect.h = newH;
              };

              const onUp = () => {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onUp);
                this.app.handleResize();
              };

              window.addEventListener('mousemove', onMove);
              window.addEventListener('mouseup', onUp);
            });
          });
        }
      });
    }
  }

  // ==========================================================================
  // 19. Main Application Controller (Decoupled Loop, Anti-Lag, Web Studio)
  // ==========================================================================
  

  // ==========================================================================
  // Template Gallery Modal (Dynamic loading from templates folder & project files)
  // ==========================================================================
  class TemplateModalUI {
    constructor(app) {
      this.app = app;
      this.overlay = null;
    }

    async fetchTemplateList() {
      // 1. Try server API (only available when served by server.js)
      if (/^https?:$/.test(location.protocol)) {
        try {
          const list = await NativeBridge.loadJSON('api/templates');
          if (Array.isArray(list) && list.length > 0) return list;
        } catch (_) {}
      }

      // 2. Try manifest.json (works for both http:// and the desktop file:// shell)
      try {
        const manifest = await NativeBridge.loadJSON('templates/manifest.json');
        if (Array.isArray(manifest) && manifest.length > 0) return manifest;
      } catch (_) {}

      // 3. Fallback bundled template list
      return [
        { file: 'full_landing.jspen', title: '전체 웹사이트 풀 패키지 (Full Website)', description: '네비게이션, 히어로, 3단 기능 카드, CTA, 푸터까지 완성된 전체 웹사이트 템플릿입니다.', layersCount: 5 },
        { file: 'navbar.jspen', title: '상단 네비게이션 헤더 (Navbar)', description: '로고, 3개 메뉴 링크, CTA 버튼이 포함된 반응형 헤더 바입니다.', layersCount: 1 },
        { file: 'hero.jspen', title: '메인 히어로 섹션 (Hero)', description: '헤드라인, 서브텍스트, 배지, 주요/보조 버튼으로 구성된 히어로 섹션입니다.', layersCount: 1 },
        { file: 'feature_grid.jspen', title: '3열 기능 카드 그리드 (Features)', description: '3개의 모던 다크 카드와 섹션 헤딩이 포함된 특징 소개 그리드입니다.', layersCount: 1 },
        { file: 'cta_banner.jspen', title: '전환 유도 CTA 배너 (CTA)', description: '방문자의 행동을 유도하는 하이라이트 전환 배너 박스입니다.', layersCount: 1 },
        { file: 'footer.jspen', title: '하단 푸터 (Footer)', description: '로고, 저작권 문구, 각종 정책 및 소셜 링크가 배치된 푸터입니다.', layersCount: 1 },
        { file: 'portfolio.jspen', title: '다크 포트폴리오 쇼케이스 (Portfolio)', description: '디자이너 및 크리에이터를 위한 모던 다크 테마 포트폴리오 템플릿입니다.', layersCount: 3 }
      ];
    }

    async loadTemplateFile(filename) {
      const name = String(filename || '');
      // Only plain file names inside templates/ are allowed.
      if (!name || /[\\/]|\.\./.test(name)) return null;
      const candidates = [name];
      if (name.endsWith('.json')) candidates.push(name.replace(/\.json$/, '.jspen'));
      else if (!name.includes('.')) candidates.push(name + '.jspen');
      for (const c of candidates) {
        try {
          return await NativeBridge.loadJSON('templates/' + encodeURIComponent(c));
        } catch (_) {}
      }
      return null;
    }

    async show() {
      this.app.endLivePreview?.();
      const templates = await this.fetchTemplateList();
      this.close();

      this.overlay = document.createElement('div');
      this.overlay.className = 'studio-modal-overlay';
      this.overlay.innerHTML = `
        <div class="tpl-modal-box">
          <div class="studio-modal-header">
            <span class="studio-modal-title">웹사이트 템플릿 갤러리 (templates/ 폴더 연동)</span>
            <button class="studio-modal-close" id="btnTplClose">✕</button>
          </div>
          <div style="padding:10px 14px;background:#18181b;border-bottom:1px solid #28282c;display:flex;align-items:center;justify-content:space-between;gap:10px;">
            <span style="font-size:11.5px;color:#a1a1aa;">templates/ 폴더에 프로젝트(.jspen) 파일을 넣으면 자동으로 템플릿으로 인식됩니다.</span>
            <label class="btn btn-secondary btn-sm" style="cursor:pointer;white-space:nowrap;font-size:11px;padding:3px 10px;">
              📁 템플릿 파일 직접 열기 (.jspen)...
              <input type="file" id="inpCustomTplFile" accept=".jspen,.json" style="display:none;" />
            </label>
          </div>
          <div style="padding:14px;overflow-y:auto;flex:1;">
            <div class="tpl-grid">
              ${templates.map(t => `
                <div class="tpl-card" data-tpl-file="${escapeHtml(t.file)}">
                  <div>
                    <div class="tpl-card-title">${escapeHtml(t.title || t.file)}</div>
                    <div class="tpl-card-desc">${escapeHtml(t.description || 'JSPen 모던 v11 프로젝트 템플릿입니다.')}</div>
                  </div>
                  <div class="tpl-card-footer">
                    <span class="tpl-card-meta">${t.layersCount ? `레이어 ${escapeHtml(t.layersCount)}개` : escapeHtml(t.file)}</span>
                    <div style="display:flex;gap:4px;">
                      <button class="btn btn-secondary btn-sm btn-insert-tpl" data-tpl-file="${escapeHtml(t.file)}" style="font-size:11px;padding:2px 8px;">레이어 삽입</button>
                      <button class="btn btn-primary btn-sm btn-open-tpl" data-tpl-file="${escapeHtml(t.file)}" style="font-size:11px;padding:2px 8px;">전체 열기</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;

      document.body.appendChild(this.overlay);

      this.overlay.querySelector('#btnTplClose').onclick = () => this.close();
      this.overlay.addEventListener('click', e => {
        if (e.target === this.overlay) this.close();
      });

      // Custom file direct load
      this.overlay.querySelector('#inpCustomTplFile')?.addEventListener('change', e => {
        const file = e.target.files?.[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = ev => {
            try {
              const docData = JSON.parse(ev.target.result);
              this.applyTemplateData(docData, false);
              this.close();
              StudioToast.show(`'${file.name}' 템플릿이 적용되었습니다.`);
            } catch (err) {
              StudioToast.show('올바른 .jspen 프로젝트 파일이 아닙니다: ' + err.message);
            }
          };
          reader.readAsText(file);
        }
      });

      // Template card buttons
      this.overlay.querySelectorAll('.btn-insert-tpl').forEach(btn => {
        btn.addEventListener('click', async () => {
          const file = btn.dataset.tplFile;
          const data = await this.loadTemplateFile(file);
          if (data) {
            this.applyTemplateData(data, true);
            this.close();
            StudioToast.show(`'${file}' 템플릿 레이어가 삽입되었습니다.`);
          }
        });
      });

      this.overlay.querySelectorAll('.btn-open-tpl').forEach(btn => {
        btn.addEventListener('click', async () => {
          const file = btn.dataset.tplFile;
          const data = await this.loadTemplateFile(file);
          if (data) {
            this.applyTemplateData(data, false);
            this.close();
            StudioToast.show(`'${file}' 프로젝트 템플릿이 로드되었습니다.`);
          }
        });
      });
    }

    applyTemplateData(docData, insertAsLayers = false) {
      if (!docData) return;
      if (insertAsLayers) {
        // Append layers with vertical offset below existing sprites
        let maxY = 0;
        for (const l of this.app.doc.layers) {
          for (const s of l.sprites) {
            maxY = Math.max(maxY, (s.y || 0) + (s.height || 0) / 2);
          }
        }
        const yOffset = maxY > 0 ? (maxY + 40) : 0;
        const newLayers = (docData.layers || []).map(lData => {
          const layer = new Layer(lData);
          layer.id = 'layer_' + Math.random().toString(36).substring(2, 9);
          for (const s of layer.sprites) {
            s.id = 'sp_' + Math.random().toString(36).substring(2, 9);
            s.y = (s.y || 0) + yOffset;
          }
          return layer;
        });

        this.app.doc.layers.push(...newLayers);
        if (yOffset > 0) {
          this.app.doc.height = Math.max(this.app.doc.height, maxY + (Sprite.num(docData.height, 0) || 800) + 100);
        }
        this.app.doc.saveState();
        this.app.refreshUI();
      } else {
        // Load entire document (a new, unsaved project)
        this.app.loadProjectFromJSON(docData);
        this.app.setSaveTarget('');
      }
    }

    close() {
      if (this.overlay && this.overlay.parentNode) {
        this.overlay.parentNode.removeChild(this.overlay);
        this.overlay = null;
      }
    }
  }

  // ==========================================================================
  // Tutorial: a guided first project. Each step points at a part of the
  // studio; steps with a task move on when the task is done. The studio
  // stays fully usable while it runs (nothing is blocked).
  // ==========================================================================
  // Tooltips for buttons and fields: shown quickly, in readable colours (the
  // native ones are slow, and the desktop app draws them dark on dark).
  class StudioTooltip {
    static install() {
      if (StudioTooltip.el) return;
      const tip = StudioTooltip.el = document.createElement('div');
      tip.className = 'jspen-tip';
      tip.setAttribute('role', 'tooltip');
      document.body.appendChild(tip);
      let owner = null, timer = null;
      const hide = () => {
        clearTimeout(timer);
        timer = null;
        tip.classList.remove('is-on');
        // The title goes back, so screen readers and the next hover still have it.
        if (owner && owner.dataset.tip !== undefined) { owner.setAttribute('title', owner.dataset.tip); delete owner.dataset.tip; }
        owner = null;
      };
      document.addEventListener('mouseover', e => {
        const el = e.target.closest ? e.target.closest('[title]') : null;
        if (!el || el === owner) return;
        hide();
        const text = el.getAttribute('title');
        if (!text) return;
        owner = el;
        el.dataset.tip = text;
        el.removeAttribute('title');
        timer = setTimeout(() => {
          if (owner !== el || !el.isConnected) return;
          tip.textContent = text;
          tip.classList.add('is-on');
          const r = el.getBoundingClientRect(), W = window.innerWidth, H = window.innerHeight;
          const tw = tip.offsetWidth, th = tip.offsetHeight;
          let x = r.left + r.width / 2 - tw / 2, y = r.bottom + 6;
          // Tool buttons on the left edge: beside the button.
          if (r.left < 80 && r.width < 60) { x = r.right + 8; y = r.top + r.height / 2 - th / 2; }
          if (y + th > H - 4) y = r.top - th - 6;
          tip.style.left = Math.max(4, Math.min(x, W - tw - 4)) + 'px';
          tip.style.top = Math.max(4, Math.min(y, H - th - 4)) + 'px';
        }, 300);
      });
      document.addEventListener('mouseout', e => {
        if (owner && !(e.relatedTarget && owner.contains(e.relatedTarget))) hide();
      });
      for (const ev of ['mousedown', 'wheel', 'keydown']) window.addEventListener(ev, hide, true);
    }
  }

  class Tutorial {
    constructor(app) {
      this.app = app;
      this.index = -1;
      this.el = null;
      this.timer = null;
    }

    static storageKey() { return 'jspen.tutorial'; }

    counts() {
      const sprites = this.app.doc.layers.flatMap(l => l.sprites);
      return { sprites: sprites.length, modules: sprites.reduce((n, sp) => n + (sp.modules || []).length, 0) };
    }

    steps() {
      const q = sel => document.querySelector(sel);
      return [
        { title: 'JSPen에 오신 것을 환영합니다',
          text: '코드 없이 버튼과 다이얼만으로 움직이는 웹 화면을 만드는 도구입니다. 사각형 하나에 움직임을 붙여 보면서 기본을 익혀요. 직접 따라 하면 다음 단계로 넘어갑니다.' },
        { title: '가운데: 캔버스', target: () => q('#viewportContainer'),
          text: '만든 결과가 그대로 보이는 미리보기 화면입니다. 휠로 확대·축소하고, 스페이스를 누른 채 끌면(또는 휠 버튼을 누른 채 끌면) 화면을 옮깁니다. 스페이스를 짧게 누르면 타임라인이 재생·정지됩니다.' },
        { title: '사각형 그리기', target: () => q('#leftToolbox [data-t="shape"]'),
          text: '도형 도구(U)를 누른 다음, 캔버스에서 끌어서 사각형을 하나 그려 보세요.',
          task: true, begin: () => { this.base = this.counts(); }, done: () => this.counts().sprites > this.base.sprites },
        { title: '오른쪽: 속성', target: () => q('#inspectorContainer'),
          text: '선택한 것의 위치·크기·색을 바꿉니다. 숫자 칸은 좌우로 끌면 바뀌고(블렌더처럼), Shift를 누른 채 끌면 정밀하게 바뀝니다. 클릭하면 직접 입력할 수 있어요.' },
        { title: '움직임 붙이기: 모듈', target: () => q('.ps-sprite-sub-item.selected .ps-btn-add-module') || q('#layersContainer .ps-btn-add-module'),
          text: '레이어 목록에서 사각형 옆의 +fx를 눌러 모듈을 붙여 보세요. 모듈은 블렌더의 모디파이어처럼 차례로 쌓여 움직임을 만듭니다. "펄스 박동 효과"가 보기 쉬워요.',
          task: true, begin: () => { this.base = this.counts(); }, done: () => this.counts().modules > this.base.modules },
        { title: '모듈 설정', target: () => q('#inspectorContainer'), begin: () => this.showModule(),
          text: '방금 붙인 모듈의 설정입니다. 숫자 칸을 끌어서 속도와 크기를 바꿔 보세요. 선택지는 목록에서 고르고, 색은 색 견본을 누릅니다.' },
        { title: '언제 움직일까: 발동 조건', target: () => q('#modCondSection'), begin: () => this.showModule(),
          text: '오른쪽 속성창의 "언제 작동하나요?"(보라색 줄) 상자입니다. "발동 조건"이 "항상"이면 바로 움직이고, "클릭했을 때"로 바꾸면 클릭해야 움직입니다. 키보드, 마우스 올리기, 신호도 고를 수 있어요.' },
        { title: '움직여 보기: 실시간 미리보기', target: () => q('#btnTlPreview'),
          text: 'Ctrl+Space를 누르거나 이 버튼을 눌러 실제로 움직이는 모습을 보세요. 다시 누르거나 Esc를 누르면 편집으로 돌아옵니다.',
          task: true, done: () => !!this.app.moduleEngine.active },
        { title: '연결해서 보기: 노드', target: () => q('#btnOptNodeMode'),
          text: 'Shift+Tab을 누르면 모듈들이 블렌더의 셰이딩 노드처럼 선으로 이어진 모습으로 보입니다. 값을 다른 모듈로 넘기는 연결을 여기서 만듭니다.' },
        { title: '저장하고 내보내기', target: () => q('#topMenuBar .ps-menu-items'),
          text: 'Ctrl+S로 저장합니다. 웹(W) 메뉴에서 웹 미리보기를 보고 HTML로 내보내면 그대로 웹사이트가 됩니다. 튜토리얼은 도움말(H) 메뉴에서 언제든 다시 볼 수 있어요.' }
      ];
    }

    // Steps about a module's settings: show the module the person just added.
    showModule() {
      const doc = this.app.doc;
      const has = sp => sp && (sp.modules || []).length;
      const sel = doc.getSelectedSprite(false);
      const sp = has(sel) ? sel : doc.layers.flatMap(l => l.sprites).filter(has).pop();
      if (!sp || sp.modules.some(m => m.id === doc.selectedModuleId)) return;
      doc.selectedSpriteId = sp.id;
      doc.selectedModuleId = sp.modules[sp.modules.length - 1].id;
      this.app.refreshUI();
    }

    start() {
      this.stop();
      this.list = this.steps();
      this.el = document.createElement('div');
      this.el.className = 'jspen-tutorial';
      this.el.innerHTML = '<div class="jspen-tutorial-spot"></div>' +
        '<div class="jspen-tutorial-card" role="dialog" aria-live="polite">' +
        '<div class="jspen-tutorial-top"><span class="jspen-tutorial-progress"></span>' +
        '<button type="button" class="jspen-tutorial-close" aria-label="튜토리얼 닫기" title="튜토리얼 닫기">✕</button></div>' +
        '<div class="jspen-tutorial-title"></div><div class="jspen-tutorial-text"></div>' +
        '<div class="jspen-tutorial-status"></div>' +
        '<div class="jspen-tutorial-actions"><button type="button" class="btn btn-secondary btn-sm" data-tut="prev">이전</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-tut="next">다음</button></div></div>';
      document.body.appendChild(this.el);
      this.el.querySelector('.jspen-tutorial-close').addEventListener('click', () => this.stop(true));
      this.el.querySelector('[data-tut="prev"]').addEventListener('click', () => this.go(this.index - 1));
      this.el.querySelector('[data-tut="next"]').addEventListener('click', () => this.go(this.index + 1));
      this.markSeen();
      this.go(0);
      this.timer = setInterval(() => this.tick(), 200);
      // Dialogs opening or closing: react at once, not on the next tick.
      this.observer = new MutationObserver(() => this.tick());
      this.observer.observe(document.body, { childList: true });
    }

    stop(byUser = false) {
      clearInterval(this.timer);
      this.timer = null;
      if (this.observer) this.observer.disconnect();
      this.observer = null;
      if (this.el) this.el.remove();
      this.el = null;
      this.index = -1;
      if (byUser) StudioToast.show('튜토리얼은 도움말(H) 메뉴에서 다시 볼 수 있습니다.');
    }

    get running() { return !!this.el; }

    go(i) {
      if (!this.el) return;
      if (i >= this.list.length) { this.stop(); StudioToast.show('튜토리얼을 마쳤습니다. 이제 자유롭게 만들어 보세요!', 3500); return; }
      this.index = Math.max(0, i);
      const step = this.list[this.index];
      this.finished = false;
      this.scrolled = false;
      if (step.begin) step.begin();
      this.el.querySelector('.jspen-tutorial-progress').textContent = `${this.index + 1} / ${this.list.length}`;
      this.el.querySelector('.jspen-tutorial-title').textContent = step.title;
      this.el.querySelector('.jspen-tutorial-text').textContent = step.text;
      this.el.querySelector('.jspen-tutorial-status').textContent = step.task ? '직접 해 보면 다음으로 넘어갑니다.' : '';
      this.el.querySelector('[data-tut="prev"]').style.visibility = this.index ? '' : 'hidden';
      const next = this.el.querySelector('[data-tut="next"]');
      next.textContent = this.index === this.list.length - 1 ? '마치기' : (this.index === 0 ? '시작하기' : (step.task ? '건너뛰기' : '다음'));
      next.classList.toggle('btn-primary', !step.task);
      next.classList.toggle('btn-secondary', !!step.task);
      this.tick();
    }

    tick() {
      if (!this.el) return;
      const step = this.list[this.index];
      if (step.task && !this.finished && step.done && step.done()) {
        this.finished = true;
        this.el.querySelector('.jspen-tutorial-status').textContent = '잘했어요!';
        const at = this.index;
        setTimeout(() => { if (this.index === at) this.go(at + 1); }, 700);
      }
      // A dialog (module library, confirmations) is in front: stay out of its way.
      const covered = !!document.querySelector('.modal-overlay:not(.hidden), .studio-modal-overlay');
      this.el.classList.toggle('is-covered', covered);
      this.place(step.target ? step.target() : null);
    }

    place(target) {
      const spot = this.el.querySelector('.jspen-tutorial-spot'), card = this.el.querySelector('.jspen-tutorial-card');
      const r = target && target.getClientRects().length ? target.getBoundingClientRect() : null;
      spot.style.display = r ? '' : 'none';
      const W = window.innerWidth, H = window.innerHeight, cw = card.offsetWidth || 320, ch = card.offsetHeight || 180, gap = 14;
      let x = (W - cw) / 2, y = (H - ch) / 2;
      if (r && !this.scrolled && r.width < W * 0.4) {
        // A part of a scrolled panel (the inspector): bring it into view once.
        this.scrolled = true;
        target.scrollIntoView({ block: 'nearest' });
      }
      if (r) {
        const pad = 6;
        // Kept on screen: a target at the very top (the menu bar) still shows its frame.
        const top = Math.max(2, r.top - pad), left = Math.max(2, r.left - pad);
        Object.assign(spot.style, { left: left + 'px', top: top + 'px',
          width: Math.min(W - 2, r.right + pad) - left + 'px', height: Math.min(H - 2, r.bottom + pad) - top + 'px' });
        // Beside the target where there is room, otherwise below or above it.
        if (r.right + gap + cw <= W) { x = r.right + gap; y = r.top; }
        else if (r.left - gap - cw >= 0) { x = r.left - gap - cw; y = r.top; }
        else if (r.bottom + gap + ch <= H) { x = r.left; y = r.bottom + gap; }
        else { x = r.left; y = r.top - gap - ch; }
        // A large target (the canvas): keep the card inside it, in a corner.
        if (r.width > W * 0.4 && r.height > H * 0.4) { x = r.left + 16; y = r.bottom - ch - 16; }
      }
      card.style.left = Math.max(8, Math.min(x, W - cw - 8)) + 'px';
      card.style.top = Math.max(8, Math.min(y, H - ch - 8)) + 'px';
    }

    markSeen() {
      try { localStorage.setItem(Tutorial.storageKey(), 'seen'); } catch (e) { /* storage blocked */ }
    }

    // First visit: a small offer, never in the way.
    offer() {
      let seen = false;
      try { seen = localStorage.getItem(Tutorial.storageKey()) === 'seen'; } catch (e) { /* storage blocked */ }
      if (seen || this.running || document.querySelector('.jspen-tutorial-offer')) return;
      const box = document.createElement('div');
      box.className = 'jspen-tutorial-offer';
      box.innerHTML = '<div class="jspen-tutorial-title">처음이신가요?</div>' +
        '<div class="jspen-tutorial-text">3분짜리 튜토리얼로 사각형 하나에 움직임을 붙여 보세요.</div>' +
        '<div class="jspen-tutorial-actions"><button type="button" class="btn btn-secondary btn-sm" data-offer="no">괜찮아요</button>' +
        '<button type="button" class="btn btn-primary btn-sm" data-offer="yes">튜토리얼 시작</button></div>';
      document.body.appendChild(box);
      box.querySelector('[data-offer="no"]').addEventListener('click', () => { this.markSeen(); box.remove(); });
      box.querySelector('[data-offer="yes"]').addEventListener('click', () => { box.remove(); this.start(); });
    }
  }

  // ==========================================================================
  // Live-preview status panel (studio only): which modules run right now,
  // recent signals, the hovered sprite and held keys - so trigger conditions
  // can be tested without guessing.
  // ==========================================================================
  class ModuleHud {
    constructor(app) {
      this.app = app;
      this.last = 0;
      let collapsed = false;
      try { collapsed = localStorage.getItem('jspen.moduleHud') === 'collapsed'; } catch (e) { /* storage blocked */ }
      const el = document.createElement('div');
      el.className = 'jspen-module-hud' + (collapsed ? ' collapsed' : '');
      el.innerHTML = '<div class="hud-head"><span>모듈 상태 · 미리보기</span><button type="button" class="hud-fold" title="접기/펼치기">' + (collapsed ? '▸' : '▾') + '</button></div><div class="hud-body"></div>';
      el.querySelector('.hud-fold').addEventListener('mousedown', e => e.stopPropagation());
      el.querySelector('.hud-fold').addEventListener('click', () => {
        const c = el.classList.toggle('collapsed');
        el.querySelector('.hud-fold').textContent = c ? '▸' : '▾';
        try { localStorage.setItem('jspen.moduleHud', c ? 'collapsed' : 'open'); } catch (e) { /* storage blocked */ }
      });
      (app.canvas.parentElement || document.body).appendChild(el);
      this.el = el;
      this.body = el.querySelector('.hud-body');
    }

    rows() {
      const eng = this.app.moduleEngine, doc = this.app.doc;
      const selected = doc.selectedSpriteId;
      const out = [];
      for (const layer of doc.layers) {
        for (const sp of layer.sprites) {
          const stack = [...(layer.modules || []), ...(sp.modules || [])];
          for (const mod of stack) {
            const p = mod.params || {};
            const cond = p.condition || 'always';
            let state;
            if (!layer.visible || sp.visible === false) state = 'hidden';
            else if (!mod.enabled) state = 'off';
            else if (eng.disabledModuleIds && eng.disabledModuleIds.has(mod.id)) state = 'graph';
            else if (cond === 'always') state = 'on';
            else {
              const st = sp.runtime && sp.runtime._cond && sp.runtime._cond[mod.id];
              state = st && st.active ? 'on' : 'wait';
            }
            const fired = sp.runtime && sp.runtime._cond && sp.runtime._cond[mod.id] && sp.runtime._cond[mod.id].lastFired;
            out.push({ sp, mod, state, cond, recent: fired !== undefined && fired !== null && eng.bus.time - fired < 0.6,
              rank: (sp.id === selected ? 0 : 2) + (cond === 'always' ? 1 : 0) });
          }
        }
      }
      return out.sort((a, b) => a.rank - b.rank);
    }

    update(force = false) {
      const now = performance.now();
      if (!force && now - this.last < 150) return;
      this.last = now;
      if (this.el.classList.contains('collapsed')) return;
      const eng = this.app.moduleEngine;
      const rows = this.rows();
      const label = { on: '● 작동 중', wait: '○ 대기', off: 'OFF', graph: '노드 연결 끊김', hidden: '숨김' };
      const shown = rows.slice(0, 12);
      let html = shown.length ? '' : '<div class="hud-empty">모듈이 없습니다. 스프라이트의 +fx로 모듈을 추가하세요.</div>';
      for (const r of shown) {
        html += '<div class="hud-row hud-' + r.state + (r.recent ? ' hud-fired' : '') + '">' +
          '<span class="hud-state">' + label[r.state] + '</span>' +
          '<span class="hud-name">' + escapeHtml(r.sp.name) + ' › ' + escapeHtml(r.mod.name) + '</span>' +
          '<span class="hud-cond">' + escapeHtml(InspectorPanelUI.conditionShort(r.mod)) + '</span></div>';
      }
      if (rows.length > shown.length) html += '<div class="hud-more">외 ' + (rows.length - shown.length) + '개 (선택한 스프라이트가 먼저 표시됩니다)</div>';
      const t = eng.bus.time;
      const sigs = [...eng.bus.signals.entries()].filter(([, v]) => t - v.time < 3).sort((a, b) => b[1].time - a[1].time).slice(0, 4);
      html += '<div class="hud-sec">최근 신호: ' + (sigs.length ? sigs.map(([n, v]) => '<b>' + escapeHtml(n) + '</b> ' + (t - v.time).toFixed(1) + '초 전').join(', ') : '없음') + '</div>';
      const hov = this.app.doc.layers.flatMap(l => l.sprites).find(sp => sp.runtime && sp.runtime.isHovered);
      const keys = Object.keys(eng.bus.keyState || {}).filter(k => eng.bus.keyState[k] && /^(Key|Digit|Arrow|Space|Enter|Shift|Escape)/.test(k));
      html += '<div class="hud-sec">마우스 위: ' + (hov ? '<b>' + escapeHtml(hov.name) + '</b>' : '없음') + ' · 누른 키: ' + (keys.length ? escapeHtml(keys.join(' ')) : '없음') + '</div>';
      this.body.innerHTML = html;
    }

    destroy() { this.el.remove(); }
  }

  class App {
    constructor() {
      this.canvas = document.getElementById('viewportCanvas');
      this.doc = new DocumentModel();
      this.renderer = new PhotoshopCanvas(this.canvas, this.doc);
      this.moduleEngine = new ModuleEngine(this.doc);
      // Pointer state shared by the canvas handlers and the live-preview loop.
      this.pointer = { ms: { x: 0, y: 0 }, mw: { x: -1e9, y: -1e9 }, isDown: false, clicked: false };
      this._previewSnapshot = null;
      this.pluginManager = new PluginManager();
      this.isNodeMode = false;

      // Setup Tools with Decoupled Canvas Repaint vs History Commit
      this.tools = new DrawingTools(
        this.renderer,
        this.doc,
        () => this.requestRender(),
        () => this.refreshUI()
      );
      this.transformBox = new TransformBox(
        this.doc,
        () => this.requestRender(),
        () => this.refreshUI()
      );
      this.tools.onTextCreated = (sp, isNew) => this.editTextSprite(sp, isNew);

      // Setup UI Panels
      this.toolbox = new ToolboxUI(document.getElementById('leftToolbox'), this.tools, () => this.refreshUI());
      this.optionBar = new ToolOptionBarUI(document.getElementById('toolOptionBar'), this.tools, () => this.refreshUI());
      this.layersUI = new LayersPanelUI(document.getElementById('layersContainer'), this.doc, {
        onUpdate: () => this.refreshUI()
      });
      this.inspector = new InspectorPanelUI(document.getElementById('inspectorContainer'), this.doc, {
        onCanvasRender: () => this.renderCanvas(),
        onUpdate: () => this.refreshUI()
      });
      this.timeline = new TimelineUI(document.getElementById('bottomTimeline'), this.doc, {
        onSeek: () => this.renderCanvas(),
        onTogglePreview: () => this.toggleModulePreview(),
        get isPreview() { return !!window.jspenApp?.moduleEngine?.active; }
      });
      this.dockerManager = new KritaDockerManager(this);
      this.menuBar = new MenuBarUI(document.getElementById('topMenuBar'), this.doc, {
        onExport: () => { this.endLivePreview(); this.exportModal.show(); },
        onOpenSettings: () => this.settingsModal.show(),
        onToggleNodeMode: () => this.toggleNodeMode(),
        onResetLayout: () => this.resetLayout(),
        onWebPreview: () => this.openWebPreviewWindow(),
        onWebExport: () => this.exportWebsiteFiles(),
        onWebCopy: () => this.copyWebsiteCode(),
        onInsertWebTemplate: tpl => this.insertWebsiteTemplate(tpl),
        onCanvasResize: () => { this.handleResize(); this.refreshUI(); },
        onUpdate: () => this.refreshUI(),
        onToggleToolbox: () => this.toggleToolbox(),
        onToggleOptionBar: () => this.toggleOptionBar(),
        onToggleDocker: id => this.dockerManager?.toggleVisibility(id),
        isToolboxVisible: () => !document.getElementById('leftToolbox')?.classList.contains('hidden'),
        isOptionBarVisible: () => !document.getElementById('toolOptionBar')?.classList.contains('hidden'),
        isDockerVisible: id => this.dockerManager?.isVisible(id) ?? true,
        get isNodeMode() { return window.jspenApp?.isNodeMode; }
      });

      // Modals & Node Editor
      this.exportModal = new ExportModalUI(this.doc);
      this.settingsModal = new SettingsModalUI(this.pluginManager);
      this.templateModal = new TemplateModalUI(this);
      StudioTooltip.install();
      this.tutorial = new Tutorial(this);
      setTimeout(() => this.tutorial.offer(), 1200);
      this.nodeEditor = new NodeEditorUI(document.getElementById('nodeEditorContainer'), this.doc, {
        onUpdate: () => {
          this.moduleEngine.disabledModuleIds = this.nodeEditor.getDisabledModuleIds();
          this.renderCanvas();
        },
        onToggleNodeMode: () => this.toggleNodeMode()
      });

      this.handleResize();
      this.initEvents();
      this.startLoop();
    }

    toggleToolbox() {
      const el = document.getElementById('leftToolbox');
      if (el) el.classList.toggle('hidden');
      this.handleResize();
    }

    toggleOptionBar() {
      const el = document.getElementById('toolOptionBar');
      if (el) el.classList.toggle('hidden');
      this.handleResize();
    }

    // Actions that read or replace the document must not see the live
    // preview's runtime changes (and must not be undone by its restore).
    endLivePreview() {
      if (this.moduleEngine && this.moduleEngine.active) this.toggleModulePreview(false);
    }

    loadProjectFromJSON(jsonObjOrString) {
      this.endLivePreview();
      // Snapshot the current document so a broken file cannot leave it half-loaded.
      const backup = this.doc.toJSON();
      const backupHistory = this.doc.history.slice();
      const backupHistoryIndex = this.doc.historyIndex;
      try {
        const data = typeof jsonObjOrString === 'string' ? JSON.parse(jsonObjOrString) : jsonObjOrString;
        if (!data || typeof data !== 'object' || Array.isArray(data)) {
          throw new Error('프로젝트 데이터가 객체 형식이 아닙니다.');
        }
        if (data.layers !== undefined && !Array.isArray(data.layers)) {
          throw new Error('layers 항목이 배열이 아닙니다.');
        }
        for (const l of (data.layers || [])) {
          if (!l || typeof l !== 'object' || (l.sprites !== undefined && !Array.isArray(l.sprites))) {
            throw new Error('레이어 데이터 형식이 올바르지 않습니다.');
          }
        }
        this.doc.loadFromData(data, true);
        this.loadDocumentFonts();
        this.refreshUI();
        if (this.isNodeMode) {
          this.nodeEditor.syncFromDoc();
          this.nodeEditor.render();
        }
        return true;
      } catch (err) {
        console.error('Failed to load project:', err);
        try {
          this.doc.loadFromData(backup, false);
          this.doc.history = backupHistory;
          this.doc.historyIndex = backupHistoryIndex;
          this.refreshUI();
        } catch (_) { /* keep whatever state we have */ }
        StudioToast.show('프로젝트 파일을 불러오지 못했습니다: ' + (err && err.message ? err.message : err), 3500);
        return false;
      }
    }

    // ---------------- Images ----------------
    // Decode an image data URL; downscale anything larger than maxSide so the
    // document (and its undo history) stays reasonable.
    static prepareImage(dataUrl, maxSide = 2048) {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
          let w = img.naturalWidth, h = img.naturalHeight, url = dataUrl;
          if (Math.max(w, h) > maxSide) {
            const k = maxSide / Math.max(w, h);
            w = Math.round(w * k); h = Math.round(h * k);
            const c = document.createElement('canvas'); c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            url = /^data:image\/jpe?g/i.test(dataUrl) ? c.toDataURL('image/jpeg', 0.9) : c.toDataURL('image/png');
          }
          resolve({ url, width: w, height: h });
        };
        img.onerror = () => reject(new Error('이미지를 읽을 수 없습니다.'));
        img.src = dataUrl;
      });
    }

    // Insert an image sprite (centre of the view, or at a world point).
    async insertImage(dataUrl, name = '이미지', at = null) {
      this.endLivePreview();
      if (!/^data:image\/(png|jpe?g|gif|webp|bmp|svg\+xml);/i.test(String(dataUrl))) {
        StudioToast.show('지원하지 않는 이미지 형식입니다 (PNG, JPG, GIF, WebP, BMP, SVG).');
        return null;
      }
      let info;
      try { info = await App.prepareImage(dataUrl); } catch (e) { StudioToast.show(e.message); return null; }
      const layer = this.doc.getSelectedLayer() || this.doc.layers[this.doc.layers.length - 1] || this.doc.addLayer({ name: '레이어 1' });
      // Fit inside 60% of the artboard, never upscale.
      const k = Math.min(1, (this.doc.width * 0.6) / info.width, (this.doc.height * 0.6) / info.height);
      const r = this.renderer;
      const center = at || r.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
      const sp = layer.addSprite({
        name: String(name || '이미지').replace(/\.[^.]+$/, '').slice(0, 40) || '이미지', type: 'image', imageUrl: info.url,
        x: Math.round(center.x), y: Math.round(center.y), width: Math.max(1, Math.round(info.width * k)), height: Math.max(1, Math.round(info.height * k)),
        naturalWidth: info.width, naturalHeight: info.height, imageFit: 'cover', fill: 'transparent', strokeWidth: 0
      });
      this.doc.selectedLayerId = layer.id;
      this.doc.selectedSpriteId = sp.id;
      this.doc.selectedSpriteIds = new Set([sp.id]);
      this.doc.saveState();
      this.refreshUI();
      StudioToast.show('이미지를 추가했습니다.');
      return sp;
    }

    async importImageFile(file, at = null) {
      if (!file) return null;
      if (file.size > 25 * 1024 * 1024) { StudioToast.show('이미지 파일이 너무 큽니다 (최대 25MB).'); return null; }
      const r = await NativeBridge.readFile(file, 'dataurl');
      return r ? this.insertImage(r.data, file.name, at) : null;
    }

    async pickImage() {
      const f = await NativeBridge.pickFile('image/*', 'dataurl');
      if (f) return this.insertImage(f.data, f.name);
      return null;
    }

    // ---------------- Canvas size & responsive views ----------------
    async resizeCanvasInteractive(w, h) {
      this.endLivePreview();
      if (w === this.doc.width && h === this.doc.height) return;
      const hasContent = this.doc.layers.some(l => l.sprites.length > 0);
      const mode = !hasContent ? 'keep' : await StudioModal.choose(
        `캔버스를 ${this.doc.width}×${this.doc.height} → ${w}×${h}px로 바꿉니다. 작업물은 어떻게 할까요?`,
        [['reflow', '웹사이트처럼 재배치', '글자 크기를 유지한 채 폭에 맞춰 배치합니다. 내용이 길어지면 세로도 늘어납니다.'],
         ['fit', '비율 유지하며 맞추기', '내용 전체를 같은 비율로 줄이거나 키워 가운데에 배치합니다.'],
         ['stretch', '캔버스에 맞춰 늘리기', '위치와 크기를 가로·세로 비율에 따라 각각 맞춥니다.'],
         ['keep', '그대로 두기', '캔버스 크기만 바꾸고 내용은 움직이지 않습니다.']], '캔버스 크기 변경');
      if (!mode) return;
      if (mode === 'reflow') {
        const source = this.doc.reflowTo(w);
        const natural = this.doc.height;
        this.doc.height = Math.max(h, natural); // never cut the content off
        this.doc.rememberLayout(source, natural);
      } else {
        this.doc.resizeCanvas(w, h, mode);
      }
      this.doc.saveState();
      this.handleResize();
      this.fitToScreen ? this.fitToScreen() : this.renderer.centerArtboard();
      this.refreshUI();
      StudioToast.show(`캔버스 크기: ${this.doc.width}×${this.doc.height}px`);
    }

    // Resize without asking (inspector fields, artboard handles).
    setCanvasSize(w, h, mode = 'keep', { quiet = false } = {}) {
      w = Math.round(w); h = Math.round(h);
      if (!(w > 0 && h > 0) || (w === this.doc.width && h === this.doc.height)) return false;
      this.endLivePreview();
      if (mode === 'reflow') {
        if (w === this.doc.width) {
          this.doc.resizeCanvas(w, h, 'keep'); // only the height was typed
        } else {
          const typedHeight = h !== this.doc.height;
          const source = this.doc.reflowTo(w);
          const natural = this.doc.height;
          if (typedHeight) this.doc.height = h;
          this.doc.rememberLayout(source, natural);
        }
      } else {
        this.doc.resizeCanvas(w, h, mode);
      }
      this.doc.saveState();
      this.fitToScreen();
      this.refreshUI();
      if (!quiet) StudioToast.show(`캔버스 크기: ${this.doc.width}×${this.doc.height}px`);
      return true;
    }

    // Zoom so the whole artboard fits the viewport, then centre it.
    fitToScreen() {
      const p = this.canvas.parentElement;
      if (!p) return;
      const z = Math.min((p.clientWidth - 80) / this.doc.width, (p.clientHeight - 80) / this.doc.height);
      this.renderer.zoom = Math.max(0.05, Math.min(1, z));
      this.renderer.centerArtboard();
      this.renderCanvas();
    }

    setView(name) {
      this.endLivePreview();
      const first = !this.doc.hasView(name);
      if (!this.doc.switchView(name)) return;
      this.handleResize();
      this.fitToScreen ? this.fitToScreen() : this.renderer.centerArtboard();
      this.refreshUI();
      if (this.menuBar) this.menuBar.render();
      const label = { desktop: '데스크톱', tablet: '태블릿', mobile: '모바일' }[name];
      StudioToast.show(first
        ? `${label} 화면을 만들었습니다. 데스크톱 배치를 이 폭에 맞춰 재배치한 상태에서 시작하니, 이 화면에서 위치·크기·글자 크기·표시 여부를 따로 조정하세요.`
        : `${label} 화면 편집 중`, first ? 5000 : 1800);
    }

    // ---------------- Forms ----------------
    insertFormElement(kind) {
      this.endLivePreview();
      const layer = this.doc.getSelectedLayer() || this.doc.layers[this.doc.layers.length - 1] || this.doc.addLayer({ name: '레이어 1' });
      const c = this.renderer.screenToWorld(this.canvas.width / 2, this.canvas.height / 2);
      const x = Math.round(c.x), y0 = Math.round(c.y);
      const field = (k, name, extra, dy = 0) => layer.addSprite(Object.assign({
        name: '폼: ' + name, type: 'form_field', x, y: y0 + dy, width: 320, height: k === 'textarea' ? 120 : 44,
        fill: '#ffffff', stroke: '#a1a1aa', strokeWidth: 1, cornerRadius: 6, fontSize: 15, textColor: '#18181b',
        form: Object.assign({ kind: k, name, placeholder: '', required: false }, extra)
      }));
      const submit = (dy = 0) => {
        const msg = layer.addSprite({ name: '폼 결과 문구', type: 'text', text: '', x, y: y0 + dy + 44, width: 320, height: 28, fontSize: 14, fill: '#a1a1aa', fontWeight: 'normal' });
        const def = MODULE_REGISTRY.form_submit, st = MODULE_REGISTRY.state_style;
        const btn = layer.addSprite({ name: '전송 버튼', type: 'rect', x, y: y0 + dy, width: 320, height: 48, fill: '#e4e4e7', cornerRadius: 8, strokeWidth: 0,
          modules: [
            { id: 'mod_' + Math.random().toString(36).slice(2, 10), type: 'text_label', name: '텍스트 라벨', enabled: true, params: { condition: 'always', text: '보내기', fontSize: 16, color: '#18181b', fontWeight: 'bold', textAlign: 'center', valign: 'middle' } },
            { id: 'mod_' + Math.random().toString(36).slice(2, 10), type: 'form_submit', name: def.name, enabled: true, params: Object.assign(JSON.parse(JSON.stringify(def.defaultParams)), { messageSpriteId: msg.id }) },
            { id: 'mod_' + Math.random().toString(36).slice(2, 10), type: 'state_style', name: st.name, enabled: true, params: Object.assign(JSON.parse(JSON.stringify(st.defaultParams)), { hoverFill: '#ffffff', pressFill: '#a1a1aa' }) }
          ] });
        return btn;
      };
      let last;
      switch (kind) {
        case 'email': last = field('email', 'email', { placeholder: '이메일 주소', required: true }); break;
        case 'textarea': last = field('textarea', 'message', { placeholder: '내용을 입력하세요' }); break;
        case 'checkbox': last = field('checkbox', 'agree', { label: '개인정보 수집에 동의합니다' }); last.width = 320; last.height = 28; break;
        case 'select': last = field('select', 'topic', { placeholder: '문의 유형', options: '일반 문의, 견적 요청, 기타' }); break;
        case 'submit': last = submit(); break;
        case 'contact':
          field('text', 'name', { placeholder: '이름', required: true }, -150);
          field('email', 'email', { placeholder: '이메일 주소', required: true }, -96);
          field('textarea', 'message', { placeholder: '문의 내용', required: true }, 0);
          last = submit(96);
          break;
        default: last = field('text', 'name', { placeholder: '이름' });
      }
      this.doc.selectedLayerId = layer.id;
      this.doc.selectedSpriteId = last.id;
      this.doc.selectedSpriteIds = new Set([last.id]);
      this.doc.saveState();
      this.refreshUI();
      StudioToast.show('폼 요소를 추가했습니다. Ctrl+Space 미리보기에서 입력해 볼 수 있습니다.');
      return last;
    }

    // Register uploaded document fonts and re-render when they are ready.
    loadDocumentFonts() {
      PhotoshopCanvas.loadDocumentFonts(this.doc.fonts, () => {
        for (const l of this.doc.layers) for (const sp of l.sprites) sp._wrapCache = null;
        this.renderCanvas();
      });
    }

    // Font choices for the inspector: document fonts first, then common
    // fonts available on Windows / macOS, then generic families.
    fontChoices() {
      const doc = (this.doc.fonts || []).map(f => [f.family, f.family + ' (문서 글꼴)']);
      const common = [['Malgun Gothic', '맑은 고딕'], ['Noto Sans KR', 'Noto Sans KR'], ['Nanum Gothic', '나눔고딕'],
        ['Apple SD Gothic Neo', 'Apple SD 산돌고딕 Neo'], ['Arial', 'Arial'], ['Helvetica', 'Helvetica'], ['Verdana', 'Verdana'],
        ['Georgia', 'Georgia'], ['Times New Roman', 'Times New Roman'], ['Courier New', 'Courier New'],
        ['serif', '세리프 (기본)'], ['monospace', '고정폭 (기본)']];
      return [['', '기본 글꼴']].concat(doc, common);
    }

    // Add a font file (.ttf/.otf/.woff/.woff2) to the document.
    async addFontFile() {
      const file = await NativeBridge.pickFile('.ttf,.otf,.woff,.woff2,font/*', 'dataurl');
      if (!file) return null;
      if (file.size > 8 * 1024 * 1024) { StudioToast.show('글꼴 파일이 너무 큽니다 (최대 8MB).'); return null; }
      const ext = (file.name.split('.').pop() || '').toLowerCase();
      const mime = { ttf: 'font/ttf', otf: 'font/otf', woff: 'font/woff', woff2: 'font/woff2' }[ext] || 'font/ttf';
      const src = String(file.data).replace(/^data:[^;,]*;base64,/, 'data:' + mime + ';base64,');
      const family = PhotoshopCanvas.safeFontFamilyName(file.name.replace(/\.[^.]+$/, '')) || 'CustomFont';
      this.doc.fonts = (this.doc.fonts || []).filter(f => f.family !== family).concat([{ family, src }]);
      this.doc.saveState();
      this.loadDocumentFonts();
      this.refreshUI(); // the new font appears in the font lists
      StudioToast.show(`글꼴 '${family}'을(를) 문서에 추가했습니다.`);
      return family;
    }

    getProjectFileName() {
      const base = String(this.doc.name || 'project').replace(/[\\/:*?"<>|]+/g, '_').trim() || 'project';
      return base + '.jspen';
    }

    // Ctrl+S saves to the current file (desktop) without asking again;
    // Ctrl+Shift+S / "다른 이름으로 저장" always asks.
    saveProject(saveAs = false) {
      this.endLivePreview();
      const json = JSON.stringify(this.doc.toJSON(), null, 2);
      if (NativeBridge.call('saveProjectTo', json, this.getProjectFileName(), !!saveAs)) return;
      NativeBridge.downloadText(this.getProjectFileName(), json);
      this.doc.markSaved();
      StudioToast.show('프로젝트 파일(.jspen)을 다운로드했습니다.');
    }

    // Called by the desktop shell after a successful save.
    markSaved() {
      this.doc.markSaved();
    }

    isDirty() {
      return !!(this.doc && this.doc.isDirty());
    }

    // Ask before replacing a document with unsaved changes.
    async confirmDiscard(action = '다른 프로젝트를 열면') {
      if (!this.isDirty()) return true;
      return StudioModal.confirm(`저장하지 않은 변경 사항이 있습니다. ${action} 지금 작업은 사라집니다. 계속할까요?`, '변경 사항 버리기');
    }

    async openProject() {
      this.endLivePreview();
      if (!(await this.confirmDiscard())) return;
      if (NativeBridge.send('open')) return;
      const file = await NativeBridge.pickTextFile('.jspen,.json');
      if (file) this.openProjectText(file.text, file.name, false);
    }

    // Open project text (file picker, drag & drop, desktop shell).
    // `token` stands for the file on disk (desktop shell only; the page never
    // chooses a path). Opens without one (browser file picker, HTML5 drop)
    // make the next Ctrl+S ask, so a different file can never be overwritten.
    async openProjectText(text, name = '', confirm = true, token = '') {
      this.endLivePreview();
      if (confirm && !(await this.confirmDiscard())) return false;
      const ok = this.loadProjectFromJSON(text);
      if (ok) this.setSaveTarget(token);
      if (ok && name) StudioToast.show(`'${name}' 프로젝트를 불러왔습니다.`);
      return ok;
    }

    // Tell the desktop shell which file Ctrl+S writes to ('' = none yet).
    setSaveTarget(token = '') {
      NativeBridge.call('projectOpened', String(token || ''));
    }

    async insertWebsiteTemplate(type) {
      this.endLivePreview();
      const W = this.doc.width || 1440;
      // If template file exists in templates folder, load it cleanly!
      const filenameMap = {
        full_landing: 'full_landing.jspen',
        navbar: 'navbar.jspen',
        hero: 'hero.jspen',
        feature_grid: 'feature_grid.jspen',
        cta_banner: 'cta_banner.jspen',
        footer: 'footer.jspen'
      };
      const fname = filenameMap[type];
      if (fname && this.templateModal) {
        const data = await this.templateModal.loadTemplateFile(fname);
        if (data) {
          this.templateModal.applyTemplateData(data, type !== 'full_landing');
          if (typeof StudioToast !== 'undefined') StudioToast.show(`템플릿('${fname}')이 적용되었습니다.`);
          return;
        }
      }

      const layer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!layer) return;
      this.doc.transparentBackground = false;
      this.doc.backgroundColor = '#18181b';

      if (type === 'navbar') {
        const bg = layer.addSprite({
          name: '네비게이션 헤더 배경',
          type: 'rect',
          x: Math.round(W / 2), y: 35,
          width: W, height: 70,
          fill: '#141417',
          stroke: '#27272a', strokeWidth: 1,
          tag: 'nav'
        });
        const logo = layer.addSprite({
          name: '브랜드 로고',
          type: 'text',
          text: '✦ JSPen Studio',
          fontSize: 20, fontWeight: 'bold', fill: '#ffffff',
          x: 130, y: 35,
          tag: 'a', linkUrl: '#', linkTarget: '_self'
        });
        const l1 = layer.addSprite({
          name: '메뉴 - 기능',
          type: 'text',
          text: '기능 소개',
          fontSize: 13, fill: '#a1a1aa',
          x: Math.round(W / 2) - 130, y: 35,
          tag: 'a', linkUrl: '#features', linkTarget: '_self', hoverEffect: 'glow'
        });
        const l2 = layer.addSprite({
          name: '메뉴 - 가격',
          type: 'text',
          text: '요금 안내',
          fontSize: 13, fill: '#a1a1aa',
          x: Math.round(W / 2), y: 35,
          tag: 'a', linkUrl: '#pricing', linkTarget: '_self', hoverEffect: 'glow'
        });
        const l3 = layer.addSprite({
          name: '메뉴 - 문의',
          type: 'text',
          text: '고객 지원',
          fontSize: 13, fill: '#a1a1aa',
          x: Math.round(W / 2) + 130, y: 35,
          tag: 'a', linkUrl: '#contact', linkTarget: '_self', hoverEffect: 'glow'
        });
        const cta = layer.addSprite({
          name: '헤더 CTA 버튼',
          type: 'rect',
          text: '무료 시작하기',
          fontSize: 13, fontWeight: 'bold',
          x: W - 120, y: 35,
          width: 130, height: 40, cornerRadius: 20,
          fill: '#0284c7',
          tag: 'a', linkUrl: 'https://github.com', linkTarget: '_blank', hoverEffect: 'lift'
        });
      }
      else if (type === 'hero') {
        const badge = layer.addSprite({
          name: '히어로 배지',
          type: 'rect',
          text: '✨ 2026 차세대 인터랙티브 웹사이트 빌더',
          fontSize: 12, fill: '#1e293b', stroke: '#38bdf8', strokeWidth: 1, cornerRadius: 16,
          width: 290, height: 32,
          x: Math.round(W / 2), y: 150
        });
        const title = layer.addSprite({
          name: '히어로 메인 타이틀',
          type: 'text',
          text: '상상을 현실로 만드는\n가장 진보된 웹 디자인',
          fontSize: 44, fontWeight: '900', fill: '#ffffff',
          x: Math.round(W / 2), y: 240, width: 850, height: 110,
          tag: 'h1', textAlign: 'center'
        });
        const desc = layer.addSprite({
          name: '히어로 설명 텍스트',
          type: 'text',
          text: '복잡한 코딩 없이 그래픽 툴처럼 자유롭게 디자인하고, 실시간 반응형 애니메이션과 링크를 웹사이트에 즉시 적용하세요.',
          fontSize: 16, fill: '#a1a1aa',
          x: Math.round(W / 2), y: 340, width: 720, height: 50,
          tag: 'p', textAlign: 'center'
        });
        const btn1 = layer.addSprite({
          name: '히어로 메인 CTA 버튼',
          type: 'rect',
          text: '지금 바로 시작하기 ➔',
          fontSize: 15, fontWeight: 'bold',
          x: Math.round(W / 2) - 110, y: 410,
          width: 190, height: 50, cornerRadius: 25,
          fill: '#38bdf8',
          tag: 'a', linkUrl: 'https://example.com/start', linkTarget: '_blank', hoverEffect: 'lift'
        });
        const btn2 = layer.addSprite({
          name: '히어로 둘러보기 버튼',
          type: 'rect',
          text: '기능 둘러보기',
          fontSize: 15, fontWeight: 'bold',
          x: Math.round(W / 2) + 100, y: 410,
          width: 160, height: 50, cornerRadius: 25,
          fill: '#27272a', stroke: '#52525b', strokeWidth: 1,
          tag: 'a', linkUrl: '#features', linkTarget: '_self', hoverEffect: 'zoom'
        });
        const card = layer.addSprite({
          name: '히어로 인터랙티브 카드',
          type: 'rect',
          text: 'Live Interactive Canvas',
          fontSize: 18, fontWeight: 'bold',
          x: Math.round(W / 2), y: 580,
          width: 680, height: 240, cornerRadius: 14,
          fill: '#18181b', stroke: '#38bdf8', strokeWidth: 1.5,
          modules: [{ id: 'hero_wave_' + Date.now(), type: 'motion_wave', name: '부유 진동', enabled: true, params: { condition: 'always', amplitude: 8, frequency: 1, axis: 'y' } }]
        });
      }
      else if (type === 'feature_grid') {
        const title = layer.addSprite({
          name: '기능 섹션 타이틀',
          type: 'text',
          text: '강력한 핵심 기능',
          fontSize: 32, fontWeight: 'bold', fill: '#ffffff',
          x: Math.round(W / 2), y: 760, width: 600, height: 40,
          tag: 'h2', anchorId: 'features', textAlign: 'center'
        });
        const c1 = layer.addSprite({
          name: '기능 카드 1',
          type: 'rect',
          text: '⚡ 초고속 반응형 웹\n\n모든 화면 규격(1920/1440/390)에 완벽 대응하는 반응형 웹 레이아웃을 생성합니다.',
          fontSize: 14, fill: '#18181b', stroke: '#27272a', strokeWidth: 1, cornerRadius: 12,
          x: Math.round(W / 2) - 380, y: 900, width: 340, height: 200,
          tag: 'article', hoverEffect: 'lift'
        });
        const c2 = layer.addSprite({
          name: '기능 카드 2',
          type: 'rect',
          text: '🎨 포토샵 그래픽 필터\n\n블러, 색조 회전, 클리핑 마스크, 알파 투명도 등 최고급 그래픽 효과를 실시간 적용합니다.',
          fontSize: 14, fill: '#18181b', stroke: '#38bdf8', strokeWidth: 1, cornerRadius: 12,
          x: Math.round(W / 2), y: 900, width: 340, height: 200,
          tag: 'article', hoverEffect: 'lift'
        });
        const c3 = layer.addSprite({
          name: '기능 카드 3',
          type: 'rect',
          text: '[LINK] 실시간 하이퍼링크\n\n버튼과 배너, 텍스트에 클릭 링크를 삽입하여 바로 실전 웹사이트로 활용하세요.',
          fontSize: 14, fill: '#18181b', stroke: '#27272a', strokeWidth: 1, cornerRadius: 12,
          x: Math.round(W / 2) + 380, y: 900, width: 340, height: 200,
          tag: 'article', hoverEffect: 'lift'
        });
      }
      else if (type === 'cta_banner') {
        const ctaBg = layer.addSprite({
          name: 'CTA 배너 배경',
          type: 'rect',
          x: Math.round(W / 2), y: 1150, width: Math.min(1100, W - 100), height: 200,
          cornerRadius: 16, fill: '#0f172a', stroke: '#0284c7', strokeWidth: 1.5,
          anchorId: 'pricing'
        });
        const ctaText = layer.addSprite({
          name: 'CTA 타이틀',
          type: 'text',
          text: '지금 바로 당신의 아이디어를 웹사이트로 완성하세요',
          fontSize: 26, fontWeight: 'bold', fill: '#ffffff',
          x: Math.round(W / 2), y: 1120, width: 800, height: 40,
          textAlign: 'center'
        });
        const ctaBtn = layer.addSprite({
          name: 'CTA 링크 버튼',
          type: 'rect',
          text: '지금 무료로 시작하기 ➔',
          fontSize: 15, fontWeight: 'bold',
          x: Math.round(W / 2), y: 1180, width: 230, height: 48, cornerRadius: 24,
          fill: '#0284c7',
          tag: 'a', linkUrl: 'https://github.com', linkTarget: '_blank', hoverEffect: 'lift',
          modules: [{
            id: 'mod_hl_' + Date.now(),
            type: 'hyperlink',
            name: '하이퍼링크 모디파이어',
            enabled: true,
            showInRender: true,
            params: {
              condition: 'always',
              url: 'https://github.com/TM-TOMATO/jspen',
              target: '_blank',
              trigger: 'click',
              hoverEffect: 'lift'
            }
          }]
        });
      }
      else if (type === 'footer') {
        const footBg = layer.addSprite({
          name: '푸터 배경',
          type: 'rect',
          x: Math.round(W / 2), y: 1360, width: W, height: 120,
          fill: '#09090b', stroke: '#18181b', strokeWidth: 1,
          tag: 'footer', anchorId: 'contact'
        });
        const footCopy = layer.addSprite({
          name: '푸터 저작권',
          type: 'text',
          text: '© 2026 JSPen Studio. All rights reserved. Powered by Advanced Interactive Web Engine.',
          fontSize: 12, fill: '#71717a',
          x: Math.round(W / 2), y: 1345, width: 800, height: 25,
          textAlign: 'center'
        });
        const footLinks = layer.addSprite({
          name: '푸터 링크 목록',
          type: 'text',
          text: '개인정보처리방침  |  이용약관  |  고객지원  |  GitHub 저장소',
          fontSize: 12, fill: '#a1a1aa',
          x: Math.round(W / 2), y: 1375, width: 600, height: 25,
          tag: 'a', linkUrl: 'https://github.com/TM-TOMATO/jspen', linkTarget: '_blank', textAlign: 'center'
        });
      }
      else if (type === 'full_landing') {
        this.doc.width = 1440;
        this.doc.height = 1450;
        this.insertWebsiteTemplate('navbar');
        this.insertWebsiteTemplate('hero');
        this.insertWebsiteTemplate('feature_grid');
        this.insertWebsiteTemplate('cta_banner');
        this.insertWebsiteTemplate('footer');
      }

      this.doc.saveState();
      this.refreshUI();
      this.renderCanvas();
    }

    // Inline text editor over the canvas for text sprites.
    // Enter commits (Shift+Enter = new line), Escape cancels, blur commits.
    editTextSprite(sprite, isNew = false) {
      if (!sprite || this._textEditor) return;
      const container = this.canvas.parentElement;
      const r = this.renderer;
      const pos = r.worldToScreen(sprite.x, sprite.y);
      const fontSize = Math.max(8, (sprite.fontSize || 24) * r.zoom);
      const ta = document.createElement('textarea');
      ta.className = 'jspen-inline-text-editor';
      ta.value = sprite.text || '';
      ta.spellcheck = false;
      ta.style.cssText = `position:absolute;left:${pos.x}px;top:${pos.y}px;transform:translate(-50%,-50%);` +
        `min-width:${Math.max(80, (sprite.width || 120) * r.zoom)}px;font-size:${fontSize}px;` +
        `font-weight:${sprite.fontWeight || 'normal'};line-height:1.35;color:${sprite.fill || '#ffffff'};` +
        'background:rgba(24,24,27,0.92);border:1px solid #e4e4e7;border-radius:2px;outline:none;' +
        'padding:2px 6px;resize:none;overflow:hidden;z-index:50;text-align:center;font-family:inherit;';
      const autosize = () => { ta.style.height = 'auto'; ta.style.height = ta.scrollHeight + 'px'; };
      ta.rows = 1;
      container.appendChild(ta);
      this._textEditor = ta;
      const prevText = sprite.text;
      let done = false;
      const finish = (commit) => {
        if (done) return;
        done = true;
        const val = ta.value;
        ta.remove();
        this._textEditor = null;
        if (commit && val.trim() && val !== prevText) {
          sprite.text = val;
          if (!sprite.name || sprite.name.startsWith('텍스트')) {
            sprite.name = '텍스트: ' + val.replace(/\s+/g, ' ').slice(0, 24);
          }
          sprite._wrapCache = null;
          if (isNew && this.doc.history.length > 0) {
            // Fold the edit into the "text created" undo step.
            this.doc.history[this.doc.historyIndex] = JSON.stringify(this.doc.historySnapshot());
          } else {
            this.doc.saveState();
          }
        }
        this.refreshUI();
        this.renderCanvas();
      };
      ta.addEventListener('input', autosize);
      ta.addEventListener('keydown', e => {
        e.stopPropagation();
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); finish(true); }
        else if (e.key === 'Escape') { e.preventDefault(); finish(false); }
      });
      ta.addEventListener('blur', () => finish(true));
      ta.addEventListener('mousedown', e => e.stopPropagation());
      autosize();
      setTimeout(() => { ta.focus(); ta.select(); }, 0);
    }

    // ---------------- User script trust ----------------
    // Code typed or added in this session is trusted. Scripts that came with
    // an opened file run only after the user allows them (once per session).
    trustScript(code) {
      this._trustedScripts = this._trustedScripts || new Set();
      this._trustedScripts.add(String(code));
    }

    isScriptTrusted(code) {
      if (code === String(MODULE_REGISTRY.custom_script.defaultParams.code)) return true;
      return !!(this._trustedScripts && this._trustedScripts.has(String(code)));
    }

    untrustedScripts() {
      const out = [];
      for (const l of this.doc.layers) {
        for (const m of [...(l.modules || []), ...l.sprites.flatMap(sp => sp.modules || [])]) {
          if (m.type === 'custom_script' && m.enabled !== false && !this.isScriptTrusted(String(m.params?.code || ''))) out.push(m);
        }
      }
      return out;
    }

    // Asks like the live preview, then lists the code a preview window may run.
    async scriptsForPreview() {
      await this.askToTrustScripts();
      const allowed = new Set([String(MODULE_REGISTRY.custom_script.defaultParams.code)]);
      for (const l of this.doc.layers) {
        for (const m of [...(l.modules || []), ...l.sprites.flatMap(sp => sp.modules || [])]) {
          const code = String(m.params?.code || '');
          if (m.type === 'custom_script' && this.isScriptTrusted(code)) allowed.add(code);
        }
      }
      return [...allowed];
    }

    // Callers arriving while the question is open wait for the same answer.
    askToTrustScripts() {
      if (!this._askingScripts) {
        this._askingScripts = this.confirmScripts().finally(() => { this._askingScripts = null; });
      }
      return this._askingScripts;
    }

    async confirmScripts() {
      const pending = this.untrustedScripts();
      if (!pending.length) return;
      // Approve exactly the code that was present when the question was asked.
      const codes = pending.map(m => String(m.params?.code || ''));
      const ok = await StudioModal.confirm(
        `이 문서에는 직접 작성하지 않은 사용자 스크립트가 ${pending.length}개 있습니다. ` +
        '스크립트는 이 프로그램 안에서 자바스크립트로 실행됩니다. 신뢰하는 파일일 때만 허용하세요. 실행할까요?',
        '사용자 스크립트 실행');
      if (ok) codes.forEach(code => this.trustScript(code));
      else StudioToast.show('사용자 스크립트는 실행하지 않고 미리보기합니다.');
    }

    // Live module preview (Ctrl+Space): runs the module engine on the studio
    // canvas. The document is snapshotted on start and restored on stop because
    // modules change sprite data (filters, visibility, text, ...) while running.
    toggleModulePreview(force) {
      const on = force === undefined ? !this.moduleEngine.active : !!force;
      if (on === this.moduleEngine.active) return;
      if (on) {
        if (this.isNodeMode) this.toggleNodeMode();
        this._previewSnapshot = {
          data: this.doc.toJSON(),
          history: this.doc.history.slice(),
          historyIndex: this.doc.historyIndex,
          selectedSpriteIds: new Set(this.doc.selectedSpriteIds || [])
        };
        this.moduleEngine.disabledModuleIds = this.nodeEditor ? this.nodeEditor.getDisabledModuleIds() : null;
        this.moduleEngine.scriptGate = code => this.isScriptTrusted(code);
        this.moduleEngine.onScriptError = (sp, mod, err) => {
          StudioToast.show(`스크립트 오류 (${sp.name}): ${err && err.message ? err.message : err}`, 5000);
        };
        this.askToTrustScripts();
        this.moduleEngine.onNavigateAnchor = (sp, opts = {}) => {
          const to = -(sp.y - sp.height / 2) * this.renderer.zoom + 24;
          if (opts.smooth) {
            this._panAnim = { from: this.renderer.panY, to, start: performance.now(), dur: Math.max(0.05, opts.duration || 0.6) * 1000 };
          } else {
            this._panAnim = null;
            this.renderer.panY = to;
          }
        };
        this.pointer.clicked = false;
        this.pointer.isDown = false;
        this.renderer.mode = 'preview';
        this.moduleEngine.start();
        const vp = this.canvas.parentElement;
        this.moduleEngine.forms = new FormRuntime(this.moduleEngine, {
          container: vp,
          place: (sp) => {
            const rt = sp.runtime, z = this.renderer.zoom;
            if (rt.visible === false) return null;
            const c = this.renderer.worldToScreen(rt.x, rt.y);
            const w = sp.width * rt.scaleX * z, h = sp.height * rt.scaleY * z;
            return { x: this.canvas.offsetLeft + c.x - w / 2, y: this.canvas.offsetTop + c.y - h / 2, w, h, scale: z };
          }
        });
        document.body.classList.add('jspen-live-preview');
        this.moduleHud = new ModuleHud(this);
        this.moduleHud.update(true);
        StudioToast.show('실시간 모듈 미리보기: Esc 또는 Ctrl+Space로 편집 모드 복귀');
      } else {
        this.moduleEngine.stop();
        if (this.moduleEngine.forms) { this.moduleEngine.forms.destroy(); this.moduleEngine.forms = null; }
        if (this.moduleHud) { this.moduleHud.destroy(); this.moduleHud = null; }
        this._panAnim = null;
        this.renderer.mode = 'edit';
        document.body.classList.remove('jspen-live-preview');
        this.canvas.style.cursor = '';
        const snap = this._previewSnapshot;
        this._previewSnapshot = null;
        if (snap) {
          this.doc.loadFromData(snap.data, false);
          this.doc.history = snap.history;
          this.doc.historyIndex = snap.historyIndex;
          this.doc.currentFrame = snap.data.currentFrame || 0;
          this.doc.selectedSpriteId = snap.data.selectedSpriteId || this.doc.selectedSpriteId;
          this.doc.selectedSpriteIds = snap.selectedSpriteIds;
          this.doc.selectedModuleId = null;
        }
      }
      this.refreshUI();
      if (this.timeline) this.timeline.render();
      this.renderCanvas();
    }

    toggleNodeMode() {
      if (this.moduleEngine?.active) this.toggleModulePreview(false);
      this.isNodeMode = !this.isNodeMode;
      const nodeCont = document.getElementById('nodeEditorContainer');
      const vpCont = document.getElementById('viewportContainer');
      if (nodeCont) nodeCont.classList.toggle('hidden', !this.isNodeMode);
      if (vpCont) vpCont.style.display = this.isNodeMode ? 'none' : '';
      if (this.isNodeMode) {
        this.nodeEditor.syncFromDoc();
        this.nodeEditor.render();
      }
      this.menuBar.render();
      if (this.optionBar) this.optionBar.render();
    }

    resetLayout() {
      Object.values(this.dockerManager.dockers).forEach(d => {
        d.state = 'docked';
        d.collapsed = false;
        d.hidden = false;
        d.splitDir = null;
        d.splitPos = 0;
        if (d.id === 'inspector') { d.dockArea = 'right'; d.dockSlot = 'top'; }
        else if (d.id === 'layers') { d.dockArea = 'right'; d.dockSlot = 'bottom'; }
        else if (d.id === 'timeline') { d.dockArea = 'bottom'; d.dockSlot = 'bottom'; }
      });
      const rightCol = document.getElementById('kritaDockRight');
      if (rightCol) rightCol.style.width = '290px';
      const bottomRow = document.getElementById('kritaDockBottom');
      if (bottomRow) bottomRow.style.height = '195px';

      const tb = document.getElementById('leftToolbox');
      if (tb) tb.classList.remove('hidden');
      const ob = document.getElementById('toolOptionBar');
      if (ob) ob.classList.remove('hidden');

      this.dockerManager.renderDockers();
      this.handleResize();
      this.refreshUI();
      this.menuBar.render();
    }

    // A preview (forExport false) runs only the scripts in allowedScripts.
    generateWebsiteHTML(forExport = false, allowedScripts = []) {
      // Always export from the desktop layout; other views become CSS overrides.
      let doc = this.doc;
      if (doc.activeView && doc.activeView !== 'desktop') {
        const copy = new DocumentModel();
        copy.loadFromData(doc.toJSON(), false);
        copy.switchView('desktop');
        doc = copy;
      }
      // Module interactions / keyframes run on the exported DOM via the engine.
      const disabledIds = this.nodeEditor ? this.nodeEditor.getDisabledModuleIds() : null;
      const docJson = doc.toJSON();
      // What the page lays out from: the design of every responsive view.
      const designs = {};
      for (const v of DocumentModel.viewNames()) {
        if (!doc.hasView(v)) continue;
        let design = doc;
        if (v !== 'desktop') {
          design = new DocumentModel();
          design.loadFromData(Object.assign({}, docJson, { activeView: 'desktop' }), false);
          design.switchView(v);
        }
        designs[v] = Reflow.describe(design, PhotoshopCanvas.fontStack);
      }
      const runtimeScript = (PhotoshopJSExporter.needsEngine(docJson, disabledIds, true) || PhotoshopJSExporter.hasKeyframes(docJson))
        ? `<script>${PhotoshopJSExporter.webRuntimeScript(doc, disabledIds, forExport ? null : allowedScripts)}<\/script>` : '';
      const W = Number(doc.width) || 1440;
      const H = Number(doc.height) || 900;
      // Artboard background matches the Studio Document background exactly
      // (characters that could break out of the <style> block are stripped)
      const artboardBg = String(doc.backgroundColor || '#18181b').replace(/[<>{};]/g, '');
      // Empty surrounding space is clean white as requested ("빈 공간은 흰색으로 채우기")
      const pageBg = '#ffffff';

      let elementsHtml = '';
      const allSprites = [];
      doc.layers.forEach((layer, lIdx) => {
        if (!layer.visible) return;
        layer.sprites.forEach((sprite, sIdx) => {
          if (!sprite.visible) return;
          allSprites.push({ layer, sprite, z: lIdx * 100 + sIdx });
        });
      });
      allSprites.sort((a, b) => a.z - b.z);

      const isLightColor = (hex) => {
        if (!hex || hex === 'transparent') return false;
        if (hex.startsWith('rgba') || hex.startsWith('rgb')) return false;
        let c = String(hex).replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length !== 6) return false;
        const r = parseInt(c.substr(0, 2), 16);
        const g = parseInt(c.substr(2, 2), 16);
        const b = parseInt(c.substr(4, 2), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) > 145;
      };

      allSprites.forEach(({ sprite, z }) => {
        if (sprite.type === 'screen_trigger') return; // Sensor trigger only

        // Check for active Hyperlink Modifier first (Blender modifier pipeline)
        const linkMod = (sprite.modules || []).find(m => m.enabled !== false && m.showInRender !== false && m.type === 'hyperlink');
        const effectiveLinkUrl = (linkMod ? linkMod.params?.url : sprite.linkUrl) || '';
        const effectiveLinkTarget = (linkMod ? linkMod.params?.target : sprite.linkTarget) || '_blank';
        const effectiveHoverEffect = (linkMod ? linkMod.params?.hoverEffect : sprite.hoverEffect) || 'none';
        const effectiveAnchorId = (linkMod ? linkMod.params?.anchorId : sprite.anchorId) || '';
        const effectiveCustomClass = (linkMod ? linkMod.params?.customClass : sprite.cssClass) || '';

        // Tag: If link is present, default to <a> for true HTML hyperlink navigation
        const ALLOWED_TAGS = ['div', 'a', 'button', 'span', 'p', 'section', 'header', 'footer', 'nav', 'main', 'article', 'aside', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'];
        let tag = String(sprite.tag || 'div').toLowerCase();
        if (!ALLOWED_TAGS.includes(tag)) tag = 'div';
        if (effectiveLinkUrl && tag === 'div') tag = 'a';
        const safeLinkUrl = safeUrl(effectiveLinkUrl);

        const isLink = !!effectiveLinkUrl || tag === 'a';
        const isBtn = tag === 'button';
        const hrefAttr = safeLinkUrl ? `href="${escapeHtml(safeLinkUrl)}" target="${escapeHtml(effectiveLinkTarget)}" rel="noopener noreferrer"` : '';
        const anchorAttr = effectiveAnchorId ? `id="${escapeHtml(effectiveAnchorId)}"` : `id="${escapeHtml(sprite.id)}"`;
        const classAttr = `web-sprite ${effectiveHoverEffect && effectiveHoverEffect !== 'none' ? 'hover-' + effectiveHoverEffect : ''} ${effectiveCustomClass}`.trim();
        const cursorStyle = (isBtn || isLink) ? 'cursor:pointer;' : '';

        let innerContent = '';
        let bgStyle = 'transparent';
        let textColor = '#ffffff';

        // Check for text_label module
        const textMod = (sprite.modules || []).find(m => m.enabled !== false && m.type === 'text_label');
        if (textMod && textMod.params) {
          innerContent = escapeHtml(textMod.params.text || '');
          textColor = textMod.params.color || '#ffffff';
        }

        if (sprite.type === 'form_field') {
          // Real form control; the web runtime binds it (validation, submit).
          const spec = FormRuntime.fieldSpec(sprite);
          const input = FormRuntime.createInput(sprite, document);
          input.setAttribute('style', spec.kind === 'checkbox' ? 'width:auto;height:auto;margin:0;' : FormRuntime.inputStyle(sprite, 1));
          innerContent = spec.kind === 'checkbox'
            ? `<label style="display:flex;align-items:center;gap:8px;width:100%;height:100%;cursor:pointer;color:${escapeHtml(sprite.textColor || '#e4e4e7')};">${input.outerHTML}<span>${escapeHtml(spec.label || spec.placeholder || spec.name)}</span></label>`
            : input.outerHTML;
          bgStyle = 'transparent';
        } else if (sprite.type === 'text') {
          innerContent = escapeHtml(sprite.text || '');
          bgStyle = 'transparent';
          textColor = sprite.fill || '#ffffff';
        } else if (sprite.type === 'image' && sprite.imageUrl) {
          const fit = ['cover', 'contain', 'fill'].includes(sprite.imageFit) ? sprite.imageFit : 'cover';
          innerContent = `<img src="${escapeHtml(safeUrl(sprite.imageUrl, true))}" alt="${escapeHtml(sprite.alt || '')}" style="width:100%;height:100%;object-fit:${fit};display:block;border-radius:inherit;" />`;
          bgStyle = 'transparent';
        } else if (sprite.type === 'brush') {
          const pts = sprite.brushStrokePoints || [];
          if (pts.length > 0) {
            let pathD = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
              pathD += ` L ${pts[i].x} ${pts[i].y}`;
            }
            innerContent = `<svg viewBox="${escapeHtml(`-${sprite.width/2} -${sprite.height/2} ${sprite.width} ${sprite.height}`)}" style="width:100%;height:100%;overflow:visible;"><path d="${escapeHtml(pathD)}" stroke="${escapeHtml(sprite.stroke || '#ffffff')}" stroke-width="${escapeHtml(sprite.brushSize || 6)}" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
          }
          bgStyle = 'transparent';
        } else if (sprite.type === 'path') {
          bgStyle = 'transparent';
          if (sprite.pathPoints && sprite.pathPoints.length > 0) {
            let d = `M ${sprite.pathPoints[0].x} ${sprite.pathPoints[0].y}`;
            for (let i = 1; i < sprite.pathPoints.length; i++) {
              const prev = sprite.pathPoints[i - 1], cur = sprite.pathPoints[i];
              const cp1x = prev.cp2x !== undefined ? prev.cp2x : prev.x;
              const cp1y = prev.cp2y !== undefined ? prev.cp2y : prev.y;
              const cp2x = cur.cp1x !== undefined ? cur.cp1x : cur.x;
              const cp2y = cur.cp1y !== undefined ? cur.cp1y : cur.y;
              d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${cur.x} ${cur.y}`;
            }
            if (sprite.isClosedPath || sprite.pathClosed) d += ' Z';
            innerContent = `<svg viewBox="${escapeHtml(`-${sprite.width/2} -${sprite.height/2} ${sprite.width} ${sprite.height}`)}" style="width:100%;height:100%;overflow:visible;"><path d="${escapeHtml(d)}" stroke="${escapeHtml(sprite.stroke || '#ffffff')}" stroke-width="${escapeHtml(sprite.strokeWidth || 2)}" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
          }
        } else {
          // rect, circle, bevel_rect
          if (sprite.fillType === 'linear-gradient' && sprite.gradient?.stops) {
            const stops = sprite.gradient.stops.map(s => `${s.color} ${Math.round((s.offset || 0) * 100)}%`).join(', ');
            const gAngle = (sprite.gradient.angle !== undefined ? sprite.gradient.angle : (sprite.gradientAngle || 0)) + 90;
            bgStyle = `linear-gradient(${gAngle}deg, ${stops})`;
          } else if (sprite.fillType !== 'none') {
            bgStyle = sprite.fill || '#38bdf8';
          }
          if (sprite.text) {
            innerContent = escapeHtml(sprite.text);
          }
          textColor = sprite.textColor || (isLightColor(sprite.fill) ? '#09090b' : '#ffffff');
        }

        const borderRadius = sprite.type === 'circle' ? '50%' : `${sprite.cornerRadius || 0}px`;
        const stroke = (sprite.type !== 'form_field' && sprite.strokeWidth && sprite.strokeWidth > 0 && sprite.stroke) ? `${sprite.strokeWidth}px solid ${sprite.stroke}` : 'none';

        // Filters (sprite.filters and active photoshop_filter module)
        const fltrs = [];
        const filterSources = [];
        if (sprite.filters) filterSources.push(sprite.filters);
        for (const m of (sprite.modules || [])) {
          if (m.enabled !== false && m.showInRender !== false && m.type === 'photoshop_filter' && m.params) {
            filterSources.push(m.params);
          }
        }
        for (const f of filterSources) {
          if (f.blur) fltrs.push(`blur(${Math.max(0, f.blur)}px)`);
          if (f.brightness !== undefined && f.brightness !== 100) fltrs.push(`brightness(${Math.max(0, f.brightness)}%)`);
          if (f.contrast !== undefined && f.contrast !== 100) fltrs.push(`contrast(${Math.max(0, f.contrast)}%)`);
          if (f.saturate !== undefined && f.saturate !== 100) fltrs.push(`saturate(${Math.max(0, f.saturate)}%)`);
          if (f.grayscale) fltrs.push(`grayscale(${Math.max(0, Math.min(100, f.grayscale))}%)`);
          if (f.sepia) fltrs.push(`sepia(${Math.max(0, Math.min(100, f.sepia))}%)`);
          if (f.hueRotate) fltrs.push(`hue-rotate(${f.hueRotate}deg)`);
          if (f.invert) fltrs.push(`invert(${Math.max(0, Math.min(100, f.invert))}%)`);
          if (f.opacity !== undefined && f.opacity !== 100) fltrs.push(`opacity(${Math.max(0, Math.min(100, f.opacity))}%)`);
          if (f.dropShadow) fltrs.push(`drop-shadow(0px 8px 16px rgba(0,0,0,0.4))`);
        }

        // Substance Mask in Web Preview
        let clipStyle = '';
        const subMaskMod = (sprite.modules || []).find(m => m.enabled !== false && m.showInRender !== false && m.type === 'substance_mask');
        if (subMaskMod && subMaskMod.params) {
          const mp = subMaskMod.params;
          const intens = Math.max(0, Math.min(100, mp.intensity !== undefined ? mp.intensity : 100)) / 100;
          if (mp.maskType === 'black') {
            const effAlpha = mp.invert ? intens : (1 - intens);
            fltrs.push(`opacity(${Math.round(effAlpha * 100)}%)`);
          } else if (mp.maskType === 'white') {
            const effAlpha = mp.invert ? (1 - intens) : intens;
            fltrs.push(`opacity(${Math.round(effAlpha * 100)}%)`);
          } else if (mp.maskType === 'clip') {
            if (sprite.type === 'circle') clipStyle = 'clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%);';
            else if (sprite.cornerRadius) clipStyle = `clip-path: inset(0 round ${sprite.cornerRadius}px); -webkit-clip-path: inset(0 round ${sprite.cornerRadius}px);`;
          }
        } else if (sprite.maskMode === 'clip_mask') {
          if (sprite.type === 'circle') clipStyle = 'clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%);';
          else if (sprite.cornerRadius) clipStyle = `clip-path: inset(0 round ${sprite.cornerRadius}px); -webkit-clip-path: inset(0 round ${sprite.cornerRadius}px);`;
        }
        const filterStyle = fltrs.length > 0 ? `filter: ${fltrs.join(' ')};` : '';

        // Coordinates: Center (x, y) translated to CSS Top-Left (x - w/2, y - h/2)
        const leftPos = Math.round(sprite.x - sprite.width / 2);
        const topPos = Math.round(sprite.y - sprite.height / 2);

        const textAlign = sprite.textAlign || 'center';
        const justify = textAlign === 'left' ? 'flex-start' : (textAlign === 'right' ? 'flex-end' : 'center');
        const padding = (sprite.type === 'text' || sprite.type === 'form_field') ? '0' : '8px 16px';

        const styleAttr = `
            position: absolute;
            left: ${leftPos}px;
            top: ${topPos}px;
            width: ${sprite.width}px;
            height: ${sprite.height}px;
            transform: rotate(${sprite.rotation || 0}deg) scale(${sprite.scaleX || 1}, ${sprite.scaleY || 1});
            transform-origin: center center;
            opacity: ${sprite.opacity !== undefined ? sprite.opacity : 1};
            background: ${bgStyle};
            border: ${stroke};
            border-radius: ${borderRadius};
            z-index: ${z};
            ${cursorStyle}
            ${filterStyle}
            ${clipStyle}
            display: flex;
            align-items: center;
            justify-content: ${justify};
            padding: ${padding};
            color: ${textColor};
            font-family: ${PhotoshopCanvas.fontStack(textMod && textMod.params && textMod.params.fontFamily ? textMod.params.fontFamily : (sprite.type === 'text' ? sprite.fontFamily : ''))};
            font-size: ${(sprite.type !== 'text' && textMod && textMod.params) ? (textMod.params.fontSize || sprite.fontSize || 14) : (sprite.fontSize || 16)}px;
            font-weight: ${(sprite.type !== 'text' && textMod && textMod.params) ? (textMod.params.fontWeight || 'normal') : (sprite.fontWeight || 'normal')};
            text-align: ${textAlign};
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.35;
            user-select: none;
            text-decoration: none;
            transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s, box-shadow 0.2s, background-color 0.2s, color 0.2s, border-color 0.2s, filter 0.2s;
          `;
        elementsHtml += `
          <${tag} class="${escapeHtml(classAttr)}" ${anchorAttr} data-sid="${escapeHtml(sprite.id)}" ${hrefAttr} style="${escapeHtml(styleAttr)}">${innerContent}</${tag}>
        `;
      });

      // Responsive views: per-sprite overrides as CSS. JS picks the view
      // (html.jspen-view-*); media queries cover pages without JS.
      const viewWidths = { desktop: W };
      let viewCss = '';
      const BREAK = { tablet: 1024, mobile: 600 };
      for (const v of ['tablet', 'mobile']) {
        const dims = doc.views && doc.views[v];
        if (!dims) continue;
        viewWidths[v] = Number(dims.width) || DocumentModel.viewWidths()[v];
        const rules = [`#webArtboard { width: ${viewWidths[v]}px !important; min-height: ${Number(dims.height) || H}px !important; }`];
        for (const layer of doc.layers) {
          for (const sp of layer.sprites) {
            const o = sp.responsive && sp.responsive[v];
            if (!o) continue;
            const w = Number(o.width) || sp.width, h = Number(o.height) || sp.height;
            const lbl = DocumentModel.labelOf(sp);
            const fsz = sp.type !== 'text' && lbl ? (o.labelFontSize || lbl.params.fontSize) : o.fontSize;
            const decl = o.visible === false ? 'display: none !important;' :
              `left: ${Math.round(Number(o.x) - w / 2)}px !important; top: ${Math.round(Number(o.y) - h / 2)}px !important; ` +
              `width: ${w}px !important; height: ${h}px !important; ` +
              `transform: rotate(${Number(o.rotation) || 0}deg) scale(${Number(o.scaleX) || 1}, ${Number(o.scaleY) || 1}) !important;` +
              (fsz ? ` font-size: ${Number(fsz)}px !important;` : '');
            rules.push(`[data-sid="${escapeHtml(sp.id).replace(/"/g, '')}"] { ${decl} }`);
          }
        }
        viewCss += `html.jspen-view-${v} ${rules.join(`\n    html.jspen-view-${v} `)}\n`;
        viewCss += `@media (max-width: ${BREAK[v]}px) { html:not(.jspen-js) ${rules.join(' html:not(.jspen-js) ')} }\n`;
      }

      return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(doc.name)} - JSPen Website</title>
  ${(doc.fonts || []).filter(f => /^data:(font|application)\/[\w.+-]+;base64,[A-Za-z0-9+/=]+$/.test(f.src || '')).map(f =>
    `<style>@font-face { font-family: "${PhotoshopCanvas.safeFontFamilyName(f.family)}"; src: url(${f.src}); font-display: swap; }</style>`).join('\n  ')}
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html { scroll-behavior: smooth; }
    body {
      background: ${pageBg};
      color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
      width: 100%;
      margin: 0;
      padding: 0;
      overflow-x: hidden;
      overflow-y: scroll;
      scrollbar-gutter: stable;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }
    #webArtboard {
      position: relative;
      width: ${W}px;
      min-height: ${H}px;
      margin: 0 auto;
      background: ${artboardBg};
      box-shadow: 0 4px 24px rgba(0,0,0,0.12);
      overflow: visible;
      flex-shrink: 0;
    }
    .web-sprite {
      text-decoration: none !important;
      color: inherit;
    }
    .hover-lift:hover {
      transform: translateY(-8px) scale(1.02) !important;
      box-shadow: 0 16px 32px rgba(0,0,0,0.35);
    }
    .hover-zoom:hover {
      transform: scale(1.06) !important;
    }
    .hover-glow:hover {
      box-shadow: 0 0 28px rgba(56, 189, 248, 0.5);
    }
    .hover-fade:hover {
      opacity: 0.75 !important;
    }
    ${viewCss}
  </style>
</head>
<body>
  <div id="previewStage" style="width:100%; display:flex; flex-direction:column; align-items:center; position:relative;">
    <div id="artboardScaler" style="transform-origin: top center;">
      <div id="webArtboard">
        ${elementsHtml}
      </div>
    </div>
  </div>

  ${forExport ? '' : `  <!-- Sleek Monochromatic Preview Control Bar -->
  <div id="previewToolbar" style="max-width:calc(100% - 16px);width:max-content;overflow-x:auto;white-space:nowrap;position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#18181b;border:1px solid #3f3f46;border-radius:24px;padding:6px 14px;display:flex;align-items:center;gap:8px;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.5);font-size:12px;color:#f4f4f5;user-select:none;">
    <span style="font-weight:700;color:#e4e4e7;margin-right:2px;">화면 폭:</span>
    <span id="valScreenWidth" style="min-width:52px;font-weight:600;color:#a1a1aa;"></span>
    <button class="pv-btn active" data-mode="fit" style="background:#3f3f46;color:#ffffff;border:1px solid #71717a;padding:3px 10px;border-radius:12px;cursor:pointer;font-size:11px;font-weight:600;">창 맞춤 (Fit)</button>
    <button class="pv-btn" data-mode="100" style="background:transparent;color:#a1a1aa;border:1px solid #52525b;padding:3px 8px;border-radius:12px;cursor:pointer;font-size:11px;">100%</button>
    <button class="pv-btn" data-mode="768" style="background:transparent;color:#a1a1aa;border:1px solid #52525b;padding:3px 8px;border-radius:12px;cursor:pointer;font-size:11px;">태블릿 (768)</button>
    <button class="pv-btn" data-mode="390" style="background:transparent;color:#a1a1aa;border:1px solid #52525b;padding:3px 8px;border-radius:12px;cursor:pointer;font-size:11px;">모바일 (390)</button>
  </div>`}

  <script>
    // Responsive layout: the page reflows to the window's width
    ${PhotoshopJSExporter.compactSource(Reflow.toString())}
    const DESIGNS = ${jsonForScript(designs)};
    let flows = {};
    let lastLayout = null;
    document.documentElement.classList.add('jspen-js');
    let currentZoomMode = 'fit';
    const baseW = ${W};
    const baseH = ${H};
    const VIEW_WIDTHS = ${JSON.stringify(viewWidths)};
    let rAFResize = null;
    let currentView = 'desktop';

    // Responsive layout for the available width (or forced by the toolbar).
    function pickView(availW) {
      if (currentZoomMode === '390' && VIEW_WIDTHS.mobile) return 'mobile';
      if (currentZoomMode === '768' && VIEW_WIDTHS.tablet) return 'tablet';
      if (currentZoomMode === '100') return 'desktop';
      if (currentZoomMode === 'fit') {
        if (VIEW_WIDTHS.mobile && availW <= 600) return 'mobile';
        if (VIEW_WIDTHS.tablet && availW <= 1024) return 'tablet';
      }
      return 'desktop';
    }

    function applyView(view) {
      const root = document.documentElement;
      ['desktop', 'tablet', 'mobile'].forEach(v => root.classList.toggle('jspen-view-' + v, v === view));
      window.JSPenView = { current: view, layout: view === currentView ? lastLayout : null };
      if (view !== currentView) {
        currentView = view;
        lastLayout = null;
        window.dispatchEvent(new CustomEvent('jspen-view', { detail: view }));
      }
    }

    let elements = null;
    function applyLayout(view, width) {
      if (lastLayout && lastLayout.width === width) return;
      if (!flows[view]) flows[view] = new Reflow(DESIGNS[view]);
      const layout = flows[view].layout(width);
      if (!elements) {
        elements = Array.from(document.querySelectorAll('#webArtboard [data-sid]'), el => ({
          el, id: el.getAttribute('data-sid'), transform: el.style.transform, fontSize: el.style.fontSize
        }));
      }
      const designed = new Map(DESIGNS[view].items.map(it => [it.id, it]));
      for (const { el, id, transform, fontSize } of elements) {
        const box = layout.boxes[id], it = designed.get(id);
        if (!box || !it) continue;
        // important: responsive view rules use !important
        el.style.setProperty('left', (box.x - box.width / 2) + 'px', 'important');
        el.style.setProperty('top', (box.y - box.height / 2) + 'px', 'important');
        el.style.setProperty('width', box.width + 'px', 'important');
        el.style.setProperty('height', box.height + 'px', 'important');
        if (box.fontSize) el.style.setProperty('font-size', box.fontSize + 'px', 'important');
        else el.style.setProperty('font-size', fontSize);
        if (box.scaleX !== it.scaleX || box.scaleY !== it.scaleY) {
          const rotate = (transform.match(/rotate\([^)]*\)/) || [''])[0];
          el.style.setProperty('transform', rotate + ' scale(' + box.scaleX + ',' + box.scaleY + ')', 'important');
        } else {
          el.style.setProperty('transform', transform);
        }
      }
      const artboard = document.getElementById('webArtboard');
      artboard.style.setProperty('width', width + 'px', 'important');
      artboard.style.setProperty('min-height', layout.height + 'px', 'important');
      lastLayout = layout;
      window.JSPenView.layout = layout;
      window.dispatchEvent(new CustomEvent('jspen-layout', { detail: layout }));
    }

    function updatePreviewScale() {
      const scaler = document.getElementById('artboardScaler');
      const artboard = document.getElementById('webArtboard');
      const stage = document.getElementById('previewStage');
      if (!scaler || !artboard) return;

      const availW = document.documentElement.clientWidth || window.innerWidth;
      const view = pickView(availW);
      applyView(view);
      const viewW = VIEW_WIDTHS[view] || baseW;
      let scale = 1;
      let width = availW;
      if (currentZoomMode === '100') {
        width = viewW;
      } else if (currentZoomMode !== 'fit') {
        width = VIEW_WIDTHS[view] && view !== 'desktop' ? viewW : (parseInt(currentZoomMode, 10) || baseW);
        scale = Math.min(1, availW / width); // a device wider than the window
      }
      applyLayout(view, width);

      scaler.style.transform = scale === 1 ? 'none' : "scale(" + scale + ")";
      const scaledH = (artboard.offsetHeight || baseH) * scale;
      if (stage) stage.style.height = scaledH + 'px';

      const lbl = document.getElementById('valScreenWidth');
      if (lbl) lbl.textContent = width + 'px';
    }

    window.addEventListener('resize', () => {
      if (rAFResize) cancelAnimationFrame(rAFResize);
      rAFResize = requestAnimationFrame(updatePreviewScale);
    });
    window.addEventListener('DOMContentLoaded', updatePreviewScale);
    updatePreviewScale(); // pick the view before the module runtime starts
    setTimeout(updatePreviewScale, 30);
    // Text is measured: lay out again once web fonts have arrived.
    if (document.fonts && document.fonts.addEventListener) {
      document.fonts.addEventListener('loadingdone', () => {
        flows = {};
        lastLayout = null;
        updatePreviewScale();
      });
    }

    document.querySelectorAll('.pv-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pv-btn').forEach(b => {
          b.classList.remove('active');
          b.style.background = 'transparent';
          b.style.color = '#a1a1aa';
          b.style.borderColor = '#52525b';
        });
        btn.classList.add('active');
        btn.style.background = '#3f3f46';
        btn.style.color = '#ffffff';
        btn.style.borderColor = '#71717a';
        currentZoomMode = btn.dataset.mode;
        updatePreviewScale();
      });
    });

    // Smooth scrolling for in-page section links
    document.querySelectorAll('a[href^="#"]').forEach(a => {
      a.addEventListener('click', e => {
        const targetId = a.getAttribute('href').slice(1);
        if (!targetId) return;
        const targetEl = document.getElementById(targetId);
        if (targetEl) {
          e.preventDefault();
          targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    });

    function setArtboardWidth(w) {
      const artboard = document.getElementById('webArtboard');
      if (artboard) {
        artboard.style.width = typeof w === 'number' ? (w + 'px') : w;
      }
    }

    function downloadHtml() {
      const clone = document.documentElement.cloneNode(true);
      const htmlContent = '<!DOCTYPE html>\\n' + clone.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'index.html';
      a.click();
    }

    function copyCode() {
      const clone = document.documentElement.cloneNode(true);
      navigator.clipboard.writeText('<!DOCTYPE html>\\n' + clone.outerHTML).then(() => {
        showNotice('HTML 코드가 클립보드에 복사되었습니다!');
      });
    }

    function showNotice(msg) {
      const n = document.createElement('div');
      n.textContent = msg;
      n.style.cssText = 'position:fixed;left:50%;bottom:72px;transform:translateX(-50%);background:#27272a;color:#f4f4f5;padding:8px 14px;border-radius:4px;font:12px sans-serif;z-index:99999;';
      document.body.appendChild(n);
      setTimeout(() => n.remove(), 2000);
    }
  </script>
  ${runtimeScript}
</body>
</html>`;
    }

    async openWebPreviewWindow() {
      this.endLivePreview();
      const allowed = await this.scriptsForPreview();
      NativeBridge.openPreview(this.generateWebsiteHTML(false, allowed));
    }

    copyWebsiteCode() {
      this.endLivePreview();
      const exportHtml = this.generateWebsiteHTML(true);
      navigator.clipboard.writeText(exportHtml).then(() => {
        StudioToast.show('웹사이트 전체 HTML 코드가 클립보드에 복사되었습니다!');
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = exportHtml;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        StudioToast.show('웹사이트 전체 HTML 코드가 클립보드에 복사되었습니다!');
      });
    }

    exportWebsiteFiles() {
      this.endLivePreview();
      const exportHtml = this.generateWebsiteHTML(true);
      const name = String(this.doc.name || 'website').replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, '_') + '.html';
      NativeBridge.downloadText(name, exportHtml, 'text/html');
    }

    renderCanvas() {
      this.renderer.render(
        this.tools.activeTool,
        this.transformBox,
        this.tools.activePenPoints,
        this.tools.activeGradientDrag,
        this.tools.activeCurvePoints,
        this.tools.shapeDragStart,
        this.tools.shapeDragCurrent,
        this.tools.activeBrushStroke
      );
      if (this.timeline) this.timeline.updatePlayheadPosition();
    }

    requestRender() {
      if (this._rAFPending) return;
      this._rAFPending = true;
      requestAnimationFrame(() => {
        this._rAFPending = false;
        this.renderCanvas();
      });
    }

    refreshUI() {
      this.renderCanvas();
      this.layersUI.render();
      this.inspector.render();
      this.timeline.renderTracks();
      this.timeline.renderCanvases();
      this.optionBar.render();
      this.toolbox.render();
      if (this.nodeEditor && this.isNodeMode) {
        this.nodeEditor.syncFromDoc();
        this.nodeEditor.render();
      }
    }

    handleResize() {
      const p = this.canvas.parentElement;
      if (!p) return;
      const pw = p.clientWidth;
      const ph = p.clientHeight;
      if (this.canvas.width === pw && this.canvas.height === ph) return;
      this.canvas.width = pw;
      this.canvas.height = ph;
      this.renderer.centerArtboard();
      this.renderCanvas();
      if (this.timeline) {
        this.timeline.renderCanvases();
        this.timeline.updatePlayheadPosition();
      }
    }

    initEvents() {
      let isPanning = false, panStart = { x: 0, y: 0 }, initPan = { x: 0, y: 0 };
      let ms = { x: 0, y: 0 }, mw = { x: 0, y: 0 }, isDown = false;
      const loupe = document.getElementById('eyedropperLoupe');
      const loupeSwatch = document.getElementById('loupeSwatch');
      const loupeHex = document.getElementById('loupeHex');

      window.addEventListener('resize', () => {
        this.handleResize();
      });

      // HTML5 Drag & Drop from Windows Explorer
      window.addEventListener('dragover', e => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
      });

      window.addEventListener('drop', e => {
        e.preventDefault();
        const files = e.dataTransfer.files;
        if (files && files.length > 0) {
          const file = files[0];
          if (file.name.endsWith('.jspen') || file.name.endsWith('.json')) {
            const reader = new FileReader();
            reader.onload = ev => {
              this.openProjectText(ev.target.result, file.name, true);
            };
            reader.readAsText(file);
          } else if (/^image\//.test(file.type) || /\.(png|jpe?g|gif|webp|bmp|svg)$/i.test(file.name)) {
            // Dropped images land where they were dropped on the canvas.
            const r = this.canvas.getBoundingClientRect();
            const inside = e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
            const at = inside ? this.renderer.screenToWorld(e.clientX - r.left, e.clientY - r.top) : null;
            this.importImageFile(file, at);
          } else if (/\.(ttf|otf|woff2?)$/i.test(file.name)) {
            StudioToast.show('글꼴은 텍스트 속성의 "글꼴 파일 추가"로 넣을 수 있습니다.');
          }
        }
      });

      // Paste an image from the system clipboard (screenshot, copied image).
      window.addEventListener('paste', e => {
        const t = document.activeElement;
        if (t && (['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName) || t.isContentEditable)) return;
        const item = [...(e.clipboardData?.items || [])].find(i => i.kind === 'file' && /^image\//.test(i.type));
        if (!item) return;
        e.preventDefault();
        if (this._pasteTimer) { clearTimeout(this._pasteTimer); this._pasteTimer = null; this._pasteDeferred = false; }
        this.importImageFile(item.getAsFile());
      });

      window.addEventListener('wheel', e => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
        // A focused number input (or select) swallows the wheel to change its
        // value, which blocks panel scrolling; blur it so the panel scrolls.
        const t = e.target;
        if (t && t === document.activeElement && t.matches &&
            t.matches('input[type="number"], input[type="color"], input[type="range"], select')) {
          t.blur();
        }
      }, { passive: false, capture: true });

      this.canvas.addEventListener('wheel', e => {
        e.preventDefault();
        const r = this.canvas.getBoundingClientRect();
        const sx = e.clientX - r.left;
        const sy = e.clientY - r.top;
        // Live preview: the wheel goes to scroll_wheel modules under the pointer.
        if (this.moduleEngine.active && !e.ctrlKey) {
          const w = this.renderer.screenToWorld(sx, sy);
          if (this.moduleEngine.wantsWheel(w.x, w.y)) { this.moduleEngine.addWheel(e.deltaY); return; }
        }
        const factor = e.deltaY < 0 ? 1.1 : 0.9;
        this.tools.zoomAt(sx, sy, factor);
        if (this.optionBar) this.optionBar.render();
      }, { passive: false });

      window.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0')) {
          e.preventDefault();
        }
      });

      // Keyboard state for 'key_press' module conditions during live preview.
      window.addEventListener('keydown', e => {
        if (!this.moduleEngine.active) return;
        const ks = this.moduleEngine.bus.keyState;
        ks[e.code] = true; ks[e.key] = true;
      });
      window.addEventListener('keyup', e => {
        const ks = this.moduleEngine.bus.keyState;
        delete ks[e.code]; delete ks[e.key];
        if (e.code === 'Space' && this._space) {
          const tap = !this._space.panned;
          this._space = null;
          this.canvas.style.cursor = '';
          if (tap && !this.moduleEngine.active) { this.doc.isPlaying = !this.doc.isPlaying; this.timeline.render(); }
        }
      });
      window.addEventListener('blur', () => {
        this._space = null;
        this.moduleEngine.bus.keyState = {};
        this.pointer.isDown = false;
      });

      // Double-click a text sprite to edit its text inline.
      this.canvas.addEventListener('dblclick', e => {
        if (this.moduleEngine.active) return;
        const r = this.canvas.getBoundingClientRect();
        const mw = this.renderer.screenToWorld(e.clientX - r.left, e.clientY - r.top);
        const sp = this.doc.hitTestSprite(mw.x, mw.y);
        if (sp && sp.type === 'text') this.editTextSprite(sp, false);
      });

      // Hyperlink Click Navigation (Preview Mode & Ctrl+Click in Edit Mode)
      this.canvas.addEventListener('click', e => {
        const r = this.canvas.getBoundingClientRect();
        const ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        const mw = this.renderer.screenToWorld(ms.x, ms.y);

        if (this.moduleEngine.active) {
          const link = this.moduleEngine.getClickLink(this.moduleEngine.pickSprite(mw.x, mw.y));
          if (link) {
            e.preventDefault();
            this.moduleEngine.navigateHyperlink(link.href, link.target);
          }
          return;
        }

        const clickedSprite = this.doc.hitTestSprite(mw.x, mw.y);

        if (clickedSprite) {
          // Check for active Hyperlink Modifier first (Blender modifier style), fallback to sprite.linkUrl
          const linkMod = (clickedSprite.modules || []).find(m => m.enabled && m.type === 'hyperlink');
          const href = (linkMod ? linkMod.params?.url : clickedSprite.linkUrl)?.trim();
          const target = (linkMod ? linkMod.params?.target : clickedSprite.linkTarget) || '_blank';
          const trigger = linkMod ? (linkMod.params?.trigger || 'click') : 'click';

          if (href && (trigger === 'click' || !linkMod)) {
            if (e.ctrlKey || e.metaKey) {
              e.preventDefault();
              if (href.startsWith('#')) {
                const targetId = href.slice(1);
                const targetSp = this.doc.layers.flatMap(l => l.sprites).find(s => s.anchorId === targetId || s.id === targetId);
                if (targetSp) {
                  this.renderer.panY = -(targetSp.y - 120);
                  this.renderCanvas();
                }
              } else {
                const safeHref = safeUrl(href);
                if (safeHref) window.open(safeHref, target);
              }
            }
          }
        }
      });

      let canvasRect = null;
      const getCanvasRect = () => {
        if (!canvasRect) canvasRect = this.canvas.getBoundingClientRect();
        return canvasRect;
      };
      const invalidateRect = () => { canvasRect = null; };
      window.addEventListener('resize', invalidateRect);
      window.addEventListener('scroll', invalidateRect, true);

      this.canvas.addEventListener('mousedown', e => {
        canvasRect = this.canvas.getBoundingClientRect();
        const r = canvasRect;
        ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        mw = this.renderer.screenToWorld(ms.x, ms.y);
        isDown = true;
        this.pointer.ms = ms; this.pointer.mw = mw;

        // Live preview: only the middle button pans; everything else is an
        // interaction for the module engine.
        if (this.moduleEngine.active) {
          if (e.button === 1) {
            isPanning = true;
            panStart = { x: e.clientX, y: e.clientY };
            initPan = { x: this.renderer.panX, y: this.renderer.panY };
          } else if (e.button === 0) {
            ModuleEngine.resumeAudio();
            this.pointer.isDown = true;
            this.pointer.clicked = true;
            this.pointer.press = { x: mw.x, y: mw.y };
          }
          return;
        }

        if (this.tools.activeTool === 'hand' || this._space || e.button === 1) {
          if (this._space) this._space.panned = true;
          isPanning = true;
          panStart = { x: e.clientX, y: e.clientY };
          initPan = { x: this.renderer.panX, y: this.renderer.panY };
          return;
        }

        // Artboard edge grips: drag to resize the canvas freely.
        if (e.button === 0 && ['move', 'direct'].includes(this.tools.activeTool) && this.renderer.mode === 'edit') {
          const edge = this.renderer.hitArtboardHandle(ms.x, ms.y);
          if (edge) {
            this.artboardDrag = { edge, start: { x: mw.x, y: mw.y }, w: this.doc.width, h: this.doc.height };
            // Lay out from the design at the start of the drag, so dragging back restores it.
            if (edge !== 'b' && this.inspector.canvasMode !== 'keep') this.artboardDrag.source = this.doc.reflowSource();
            this.requestRender();
            return;
          }
        }

        if (this.tools.activeTool === 'move' || this.tools.activeTool === 'direct') {
          const curTarget = this.transformBox.getTarget();
          const hit = curTarget ? this.transformBox.hitTest(mw.x, mw.y, curTarget) : null;
          if (hit) {
            this.transformBox.startDrag(mw.x, mw.y, hit, curTarget);
            return;
          }

          const clickedSprite = this.doc.hitTestSprite(mw.x, mw.y);
          if (clickedSprite) {
            const ownerLayer = this.doc.layers.find(l => l.sprites.some(s => s.id === clickedSprite.id));
            if (ownerLayer) {
              this.doc.selectedLayerId = ownerLayer.id;
              ownerLayer.expanded = true;
            }
            this.doc.selectedSpriteId = clickedSprite.id;
            this.doc.selectedSpriteIds = new Set([clickedSprite.id]);
            this.doc.selectedModuleId = null;
            this.refreshUI();
            if (this.layersUI?.scrollToSelected) {
              this.layersUI.scrollToSelected();
            }
            this.transformBox.startDrag(mw.x, mw.y, 'body', clickedSprite);
            return;
          }
        }

        this.tools.handleMouseDown(mw.x, mw.y, ms.x, ms.y, e);
      });

      window.addEventListener('mousemove', e => {
        const r = getCanvasRect();
        ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        mw = this.renderer.screenToWorld(ms.x, ms.y);

        this.pointer.ms = ms; this.pointer.mw = mw;

        // Pointer cursor for hyperlinks during preview mode
        if (this.moduleEngine.active) {
          const hoveredSp = this.moduleEngine.pickSprite(mw.x, mw.y);
          this.canvas.style.cursor = this.moduleEngine.bus.hideCursor ? 'none'
            : (this.moduleEngine.getClickLink(hoveredSp) ? 'pointer' : 'default');
        }

        if (this.tools.activeTool === 'eyedropper' && loupe) {
          const pixel = this.renderer.getPixelColor(ms.x, ms.y);
          if (pixel) {
            loupe.classList.remove('hidden');
            loupe.style.left = `${e.clientX + 16}px`;
            loupe.style.top = `${e.clientY + 16}px`;
            loupeSwatch.style.backgroundColor = pixel.hex;
            loupeHex.textContent = pixel.hex.toUpperCase();
          }
        } else if (loupe) {
          loupe.classList.add('hidden');
        }

        if (!isDown) {
          // resize cursor over the artboard grips
          if (!this.moduleEngine.active && ['move', 'direct'].includes(this.tools.activeTool)) {
            const edge = this.renderer.mode === 'edit' && e.target === this.canvas ? this.renderer.hitArtboardHandle(ms.x, ms.y) : null;
            const cur = edge ? { r: 'ew-resize', b: 'ns-resize', rb: 'nwse-resize' }[edge] : '';
            if (cur || this._artboardCursor) { this.canvas.style.cursor = cur; this._artboardCursor = !!cur; }
          }
          return;
        }

        if (this.artboardDrag) {
          const d = this.artboardDrag;
          const snap = v => e.shiftKey ? Math.round(v / 10) * 10 : Math.round(v);
          const w = d.edge === 'b' ? d.w : Math.max(50, Math.min(10000, snap(d.w + mw.x - d.start.x)));
          const h = d.edge === 'r' ? d.h : Math.max(50, Math.min(20000, snap(d.h + mw.y - d.start.y)));
          if (d.source) {
            if (w === d.lastW && h === d.lastH) return;
            d.lastW = w; d.lastH = h;
            this.doc.reflowTo(w, d.source);
            d.natural = this.doc.height;
            // The corner also sets the height, on top of what the content needs.
            if (d.edge === 'rb') this.doc.height = Math.max(50, h + d.natural - d.h);
            this.handleResize();
            this.requestRender();
          } else if (w !== this.doc.width || h !== this.doc.height) {
            this.doc.resizeCanvas(w, h, 'keep');
            this.handleResize();
            this.requestRender();
          }
          return;
        }

        if (isPanning) {
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          this.renderer.panX = initPan.x + dx;
          this.renderer.panY = initPan.y + dy;
          this.requestRender();
          return;
        }

        if (this.moduleEngine.active) return;

        if (this.transformBox.mode) {
          this.transformBox.drag(mw.x, mw.y, e.shiftKey);
          this.requestRender();
          return;
        }

        this.tools.handleMouseMove(mw.x, mw.y);
      });

      window.addEventListener('mouseup', e => {
        isDown = false;
        this.pointer.isDown = false;
        if (isPanning) isPanning = false;
        if (this.artboardDrag) {
          const d = this.artboardDrag;
          this.artboardDrag = null;
          if (this.doc.width !== d.w || this.doc.height !== d.h) {
            if (d.source) this.doc.rememberLayout(d.source, d.natural);
            this.doc.saveState();
            StudioToast.show(`캔버스 크기: ${this.doc.width}×${this.doc.height}px`);
          }
          this.refreshUI();
          return;
        }
        if (this.moduleEngine.active) {
          const r = getCanvasRect();
          const up = this.renderer.screenToWorld(e.clientX - r.left, e.clientY - r.top);
          this.pointer.mw = up;
          this.moduleEngine.endDrag(up.x, up.y);
          return;
        }
        if (this.transformBox.mode) {
          this.transformBox.endDrag();
          this.refreshUI();
          return;
        }
        this.tools.handleMouseUp(mw.x, mw.y);
      });

            // Helper to match key combo with configured shortcuts
      const checkShortcutMatch = (e, comboStr) => {
        if (!comboStr) return false;
        const parts = comboStr.split('+').map(p => p.trim().toUpperCase());
        const hasCtrl = parts.includes('CTRL') || parts.includes('CMD');
        const hasShift = parts.includes('SHIFT');
        const hasAlt = parts.includes('ALT');
        const mainKey = parts.filter(p => !['CTRL', 'CMD', 'SHIFT', 'ALT'].includes(p))[0];

        if (hasCtrl !== (e.ctrlKey || e.metaKey)) return false;
        if (hasShift !== e.shiftKey) return false;
        if (hasAlt !== e.altKey) return false;

        const k = (e.key || '').toUpperCase();
        const code = (e.code || '').toUpperCase();
        if (mainKey === 'SPACE') return code === 'SPACE';
        return k === mainKey;
      };

      // Global Keydown Shortcuts - Undo / Redo FIRST!
      window.addEventListener('keydown', e => {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName) || document.activeElement?.isContentEditable;
        if (isInput) return; // Requirement 18: Typing priority!

        // Requirement 12: tab키 눌러서 선택 기능 제거 (Prevent Tab key cycling buttons)
        if (e.key === 'Tab' && !e.shiftKey) {
          e.preventDefault();
          return;
        }

        const undoKey = this.settingsModal?.getShortcutKey('undo') || 'Ctrl + Z';
        const redoKey = this.settingsModal?.getShortcutKey('redo') || 'Ctrl + Y';
        const prevKey = this.settingsModal?.getShortcutKey('preview') || 'Ctrl + Space';
        const nodeKey = this.settingsModal?.getShortcutKey('nodeMode') || 'Shift + Tab';
        const selKey  = this.settingsModal?.getShortcutKey('selectAll') || 'Ctrl + A';
        const copyKey = this.settingsModal?.getShortcutKey('copy') || 'Ctrl + C';
        const pasteKey= this.settingsModal?.getShortcutKey('paste') || 'Ctrl + V';
        const renKey  = this.settingsModal?.getShortcutKey('rename') || 'F2';
        const deleteKey = this.settingsModal?.getShortcutKey('delete') || 'Delete';

        // While the live module preview runs the document is not editable:
        // only the preview toggle and Escape (exit) are handled here.
        if (this.moduleEngine.active && !(checkShortcutMatch(e, prevKey) || (e.ctrlKey && e.code === 'Space'))) {
          if (e.key === 'Escape') { e.preventDefault(); this.toggleModulePreview(false); }
          if (e.code === 'Space') e.preventDefault();
          return;
        }

        // 1. UNDO
        if (checkShortcutMatch(e, undoKey) || ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey)) {
          if (!isInput) {
            e.preventDefault();
            if (this.doc.undo()) {
              this.refreshUI();
              if (this.isNodeMode) {
                this.nodeEditor.syncFromDoc();
                this.nodeEditor.render();
              }
            }
            return;
          }
        }

        // 2. REDO
        if (checkShortcutMatch(e, redoKey) || ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y'))) {
          if (!isInput) {
            e.preventDefault();
            if (this.doc.redo()) {
              this.refreshUI();
              if (this.isNodeMode) {
                this.nodeEditor.syncFromDoc();
                this.nodeEditor.render();
              }
            }
            return;
          }
        }

        // 3. Live module preview (Ctrl + Space) / Web preview window (Alt + W)
        if (checkShortcutMatch(e, prevKey) || (e.ctrlKey && e.code === 'Space')) {
          e.preventDefault();
          this.toggleModulePreview();
          return;
        }
        if (checkShortcutMatch(e, 'Alt + W') || (e.altKey && (e.key === 'w' || e.key === 'W'))) {
          e.preventDefault();
          this.openWebPreviewWindow();
          return;
        }


        // 4. Node Mode Toggle
        if (checkShortcutMatch(e, nodeKey) || (e.shiftKey && e.key === 'Tab')) {
          e.preventDefault();
          this.toggleNodeMode();
          return;
        }

        // 5. Rename
        if (checkShortcutMatch(e, renKey) || e.key === 'F2') {
          e.preventDefault();
          this.layersUI.startRenameSelected();
          return;
        }

        // 6. Copy
        if (checkShortcutMatch(e, copyKey) || ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C') && !isInput)) {
          const sel = this.doc.getSelectedSprite();
          if (sel) {
            e.preventDefault();
            this.clipboardSprite = JSON.parse(JSON.stringify(sel));
          }
          return;
        }

        // 7. Paste
        if (checkShortcutMatch(e, pasteKey) || ((e.ctrlKey || e.metaKey) && (e.key === 'v' || e.key === 'V') && !isInput)) {
          // Let the paste event check the system clipboard for an image
          // first; the internal sprite clipboard is used when there is none.
          if (this.clipboardSprite && !this._pasteDeferred) {
            this._pasteDeferred = true;
            const replay = { ...e, key: e.key, code: e.code, ctrlKey: e.ctrlKey, metaKey: e.metaKey, shiftKey: e.shiftKey, altKey: e.altKey, preventDefault() {} };
            this._pasteTimer = setTimeout(() => {
              this._pasteTimer = null;
              window.dispatchEvent(new KeyboardEvent('keydown', { key: replay.key, code: replay.code, ctrlKey: replay.ctrlKey, metaKey: replay.metaKey }));
              this._pasteDeferred = false;
            }, 60);
            return;
          }
          this._pasteDeferred = false;
          if (this.clipboardSprite) {
            e.preventDefault();
            const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
            if (activeLayer) {
              const clone = JSON.parse(JSON.stringify(this.clipboardSprite));
              clone.id = 'sp_' + Math.random().toString(36).substring(2, 9);
              clone.name = clone.name + ' 복사본';
              clone.x = (clone.x || 0) + 24;
              clone.y = (clone.y || 0) + 24;
              if (clone.modules) {
                clone.modules.forEach(m => {
                  m.id = 'mod_' + Math.random().toString(36).substring(2, 9);
                });
              }
              const added = activeLayer.addSprite(clone);
              this.doc.selectedSpriteId = added.id;
              this.doc.saveState();
              this.refreshUI();
            }
          }
          return;
        }

        // 8. Select All
        if (checkShortcutMatch(e, selKey) || ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A') && !isInput)) {
          e.preventDefault();
          this.doc.selectAll();
          this.refreshUI();
          return;
        }

        // 9. Delete Selected Sprites (Delete / Backspace)
        if (checkShortcutMatch(e, deleteKey) || e.key === 'Delete' || e.key === 'Backspace') {
          if (!isInput && !this.isNodeMode) {
            e.preventDefault();
            if (this.doc.deleteSelected()) {
              this.refreshUI();
            }
            return;
          }
        }

        if (isInput) return;

        const k = e.key.toLowerCase();
        if (k === 'v') this.tools.setTool('move');
        else if (k === 'a') this.tools.setTool('direct');
        else if (k === 'c') this.tools.setTool('curve');
        else if (k === 'p') this.tools.setTool('pen');
        else if (k === 'b') this.tools.setTool('brush');
        else if (k === 'g') this.tools.setTool('gradient');
        else if (k === 'k') this.tools.setTool('bucket');
        else if (k === 'u') this.tools.setTool('shape');
        else if (k === 't') this.tools.setTool('text');
        else if (k === 'i') this.tools.setTool('eyedropper');
        else if (k === 'z') this.tools.setTool('zoom');
        else if (e.code === 'Space' && !e.ctrlKey) {
          e.preventDefault();
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
          // Held: drag the canvas (like Photoshop). A tap plays / pauses the
          // timeline when the key comes up without a drag.
          if (!this._space) { this._space = { panned: false }; this.canvas.style.cursor = 'grab'; }
          return;
        }
        else if (k === 'h') this.tools.setTool('hand');
        else if (e.ctrlKey && k === 'e') { e.preventDefault(); this.exportModal.show(); }
        else if (e.ctrlKey && k === 's') { e.preventDefault(); this.saveProject(e.shiftKey); }
        else if (e.ctrlKey && e.shiftKey && k === 'i') { e.preventDefault(); this.pickImage(); }
        else if (e.ctrlKey && k === 'o') { e.preventDefault(); this.openProject(); }
        else if (e.key === 'Enter' || e.key === 'Escape') {
          if (this.tools.activeTool === 'curve' && this.tools.activeCurvePoints.length > 1) {
            e.preventDefault();
            this.tools.commitCurvePath(false);
            this.refreshUI();
          } else if (this.tools.activeTool === 'pen' && this.tools.activePenPoints.length > 1) {
            e.preventDefault();
            this.tools.commitPenPath(false);
            this.refreshUI();
          }
        }
      });

      // Prevent clicked buttons from retaining focus and triggering on Spacebar
      window.addEventListener('contextmenu', e => e.preventDefault());

      window.addEventListener('click', e => {
        if (e.target.closest('button')) {
          setTimeout(() => {
            if (document.activeElement && document.activeElement.tagName === 'BUTTON') {
              document.activeElement.blur();
            }
          }, 30);
        }
      }, true);
    }

    startLoop() {
      let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      let frameAcc = 0;

      const loop = (now) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        if (this.isNodeMode) {
          requestAnimationFrame(loop);
          return;
        }

        // Live module preview: run the module engine every frame.
        if (this.moduleEngine.active) {
          if (this.doc.isPlaying) {
            frameAcc += dt;
            const frameInterval = 1 / this.doc.fps;
            while (frameAcc >= frameInterval) {
              frameAcc -= frameInterval;
              this.doc.stepFrame(1);
            }
          }
          const r = this.renderer;
          if (this._panAnim) {
            const a = this._panAnim;
            const t = Math.min(1, (now - a.start) / a.dur);
            r.panY = a.from + (a.to - a.from) * ModuleEngine.ease('easeInOutCubic', t);
            if (t >= 1) this._panAnim = null;
          }
          this.moduleEngine.bus.scroll.scrollY = Math.max(0, -r.panY / r.zoom);
          this.doc.viewportHeight = this.canvas.height / r.zoom;
          this.moduleEngine.update(dt, this.pointer.mw, this.pointer.ms, this.pointer.isDown, this.pointer.clicked, this.pointer.press);
          this.pointer.clicked = false;
          if (this.moduleEngine.forms) this.moduleEngine.forms.sync(this.doc);
          if (this.moduleHud) this.moduleHud.update();
          if (this.moduleEngine.bus.hideCursor) this.canvas.style.cursor = 'none';
          this.renderCanvas();
          requestAnimationFrame(loop);
          return;
        }

        if (this.doc.isPlaying) {
          frameAcc += dt;
          const frameInterval = 1 / this.doc.fps;
          while (frameAcc >= frameInterval) {
            frameAcc -= frameInterval;
            this.doc.stepFrame(1);
          }
          this.renderCanvas();
        }

        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  window.DocumentModel = DocumentModel;
  window.Layer = Layer;
  window.Sprite = Sprite;
  window.PhotoshopJSExporter = PhotoshopJSExporter;
  window.PhotoshopCanvas = PhotoshopCanvas;
  window.MODULE_REGISTRY = MODULE_REGISTRY;

  window.addEventListener('DOMContentLoaded', () => {
    window.jspenApp = new App();
  });
})();
