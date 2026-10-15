/**
 * JSPen Studio - Standalone Zero-Server Bundle
 * Complete Professional Interactive Design & Motion Studio
 */

(function () {
  'use strict';

  // ==========================================================================
  // 1. SoundEffects Engine (Web Audio API Synthesizer)
  // ==========================================================================
  class SoundManager {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
    }
    play(type = 'pop') {
      try {
        this.init();
        if (!this.ctx) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        if (type === 'coin') {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(987.77, t);
          osc.frequency.setValueAtTime(1318.51, t + 0.08);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
          osc.start(t);
          osc.stop(t + 0.35);
        } else if (type === 'jump') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(450, t + 0.15);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
        } else if (type === 'cut') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, t);
          osc.frequency.exponentialRampToValueAtTime(120, t + 0.08);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.start(t);
          osc.stop(t + 0.08);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(400, t);
          osc.frequency.exponentialRampToValueAtTime(80, t + 0.1);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
          osc.start(t);
          osc.stop(t + 0.1);
        }
      } catch (e) {}
    }
  }

  // ==========================================================================
  // 2. Module Registry (28 Builtin Modules + Timeline Keyframe + Nodes)
  // ==========================================================================
  const MODULE_REGISTRY = {
    // 1. Sensory & Gestures
    mouse_position: {
      category: 'sensor', name: '마우스 위치 추적', icon: 'POS',
      description: '마우스 커서의 X, Y 좌표 및 이동 속도를 실시간 감지합니다.',
      defaultParams: { condition: 'always', coordinateMode: 'relative', smoothFactor: 0.15 }
    },
    hover_proximity: {
      category: 'sensor', name: '호버 및 근접 감지', icon: 'ZONE',
      description: '마우스가 스프라이트 위에 올라오거나 지정 반경에 진입했는지 감지합니다.',
      defaultParams: { condition: 'always', detectionRadius: 60, scaleOnHover: 1.15 }
    },
    click_gesture: {
      category: 'sensor', name: '클릭 및 제스처 감지', icon: 'TRG',
      description: '단일 클릭, 더블 클릭, 롱 프레스 이벤트를 발생시킵니다.',
      defaultParams: { condition: 'always', gestureType: 'click', activeDuration: 0.2 }
    },
    draggable: {
      category: 'sensor', name: '자유 드래그 모듈', icon: 'DRG',
      description: '마우스로 스프라이트를 집어 자유롭게 드래그 앤 드롭 이동합니다.',
      defaultParams: { condition: 'always', constrainAxis: 'none', snapToGrid: false, gridSize: 20 }
    },
    scroll_wheel: {
      category: 'sensor', name: '스크롤 휠 감지', icon: 'WHL',
      description: '마우스 휠 굴림을 감지하여 수치를 증감합니다.',
      defaultParams: { condition: 'always', sensitivity: 1.0, minVal: 0, maxVal: 100 }
    },
    keyboard_trigger: {
      category: 'sensor', name: '키보드 입력 감지', icon: 'KEY',
      description: '지정된 키(방향키, Space, Enter 등) 입력을 감지합니다.',
      defaultParams: { condition: 'always', targetKey: 'ArrowRight', moveSpeed: 5 }
    },
    collision_detector: {
      category: 'sensor', name: '충돌 및 겹침 감지', icon: 'COL',
      description: '다른 지정 레이어와 영역이 겹치거나 닿았을 때 신호를 보냅니다.',
      defaultParams: { condition: 'always', targetLayerId: null, bounceBack: true }
    },
    viewport_visibility: {
      category: 'sensor', name: '화면 가시성 감지', icon: 'VIEW',
      description: '캔버스 가시 영역 내에 들어왔을 때 트리거를 발동합니다.',
      defaultParams: { condition: 'always', triggerOnce: false }
    },
    timer_interval: {
      category: 'sensor', name: '타이머 및 주기 발신', icon: 'TIME',
      description: '지정한 주기(초)마다 반복 신호를 발생시킵니다.',
      defaultParams: { condition: 'always', intervalSec: 1.0, autoStart: true }
    },

    // 2. Link & Logic
    follow_target: {
      category: 'logic', name: '타겟 추적 (스프링)', icon: 'FLW',
      description: '다른 레이어나 마우스를 탄성 물리 스프링으로 부드럽게 추적합니다.',
      defaultParams: { condition: 'always', targetLayerId: null, stiffness: 0.1, damping: 0.8, offsetX: 0, offsetY: 0 }
    },
    look_at: {
      category: 'logic', name: '타겟 조준 (Look-At)', icon: 'AIM',
      description: '스프라이트가 항상 타겟 레이어나 마우스 방향을 바라보도록 자동 회전합니다.',
      defaultParams: { condition: 'always', targetType: 'mouse', targetLayerId: null, rotationOffset: 0 }
    },
    distance_rope: {
      category: 'logic', name: '거리 제한 로프', icon: 'ROPE',
      description: '타겟과의 최대 거리를 제한하여 밧줄처럼 매달리게 만듭니다.',
      defaultParams: { condition: 'always', targetLayerId: null, maxDistance: 150 }
    },
    value_remapper: {
      category: 'logic', name: '값 매핑기', icon: 'MAP',
      description: '입력 수치를 원하는 출력 범위로 비례 환산합니다.',
      defaultParams: { condition: 'always', inputSource: 'mouse_x', inMin: 0, inMax: 800, outMin: 0, outMax: 360, outputProperty: 'rotation' }
    },
    signal_relay: {
      category: 'logic', name: '신호 전달기', icon: 'RLY',
      description: '입력 신호를 지연시키거나 다른 레이어의 모듈로 분기 전달합니다.',
      defaultParams: { condition: 'always', delaySec: 0.3, targetLayerId: null }
    },
    toggle_switch: {
      category: 'logic', name: '토글 스위치', icon: 'TOG',
      description: '클릭할 때마다 켜짐(ON)/꺼짐(OFF) 상태를 반전 전환합니다.',
      defaultParams: { condition: 'always', initialValue: false }
    },
    counter_accumulator: {
      category: 'logic', name: '숫자 카운터', icon: 'CNT',
      description: '이벤트 발생 시마다 숫자를 1씩 증가시키고 텍스트에 반영합니다.',
      defaultParams: { condition: 'always', startVal: 0, stepVal: 1, maxVal: 9999 }
    },
    node_merge: {
      category: 'logic', name: '모듈 합치기', icon: 'MRG',
      description: '여러 모듈의 출력 신호 또는 변형 효과를 하나로 병합하여 적용합니다.',
      defaultParams: { condition: 'always', blendMode: 'add', weight: 1.0 }
    },
    node_math: {
      category: 'logic', name: '계산 및 설정 노드', icon: 'CALC',
      description: '입력 수치에 사칙연산(+ - * /) 및 범위 제한(Clamp) 연산을 수행합니다.',
      defaultParams: { condition: 'always', op: 'multiply', factor: 1.5, offset: 0 }
    },

    // 3. Motion & Visual FX
    tween_interpolator: {
      category: 'motion', name: '트윈 보간 모션', icon: 'TWN',
      description: '시작값에서 끝값까지 지정 시간 동안 부드럽게 변형합니다.',
      defaultParams: { condition: 'always', property: 'x', toValue: 200, duration: 1.0, easing: 'easeOutCubic' }
    },
    path_follower: {
      category: 'motion', name: '베지어 패스 주행', icon: 'PATH',
      description: '펜 도구로 그린 벡터 곡선 경로를 따라 물체가 부드럽게 주행합니다.',
      defaultParams: { condition: 'always', pathLayerId: null, speed: 1.0, autoRotate: true }
    },
    mouse_tilt_3d: {
      category: 'motion', name: '마우스 3D 틸트', icon: '3D',
      description: '마우스 위치에 따라 카드처럼 입체적으로 기울어지는 효과를 냅니다.',
      defaultParams: { condition: 'always', maxTilt: 20, perspective: 800 }
    },
    particle_emitter: {
      category: 'motion', name: '파티클 분출기', icon: 'FX',
      description: '반짝이, 스파크, 먼지 등의 파티클을 마우스나 위치에서 방출합니다.',
      defaultParams: { condition: 'always', rate: 10, speed: 80, particleColor: '#38bdf8', lifetime: 0.8 }
    },
    motion_wave: {
      category: 'motion', name: '부유 진동 효과', icon: 'WAVE',
      description: '공중에 떠 있는 것처럼 위아래/좌우로 은은하게 부유 진동합니다.',
      defaultParams: { condition: 'always', amplitude: 12, frequency: 1.5, axis: 'y' }
    },
    pulse_scale: {
      category: 'motion', name: '펄스 박동 효과', icon: 'PULS',
      description: '심장 박동처럼 크기가 주기적으로 커졌다 작아지는 효과입니다.',
      defaultParams: { condition: 'always', minScale: 0.92, maxScale: 1.08, speed: 2.0 }
    },
    shake_vibrate: {
      category: 'motion', name: '흔들림 및 진동', icon: 'SHK',
      description: '타격감이나 지진처럼 무작위로 화면을 진동시킵니다.',
      defaultParams: { condition: 'always', intensity: 8, decay: 0.9 }
    },
    orbit_spin: {
      category: 'motion', name: '공전 및 자전', icon: 'SPIN',
      description: '자체 중심축으로 자전하거나 타겟 주위를 공전합니다.',
      defaultParams: { condition: 'always', speedDegPerSec: 45, radius: 0 }
    },
    wall_bounce: {
      category: 'motion', name: '벽면 튕기기 반사', icon: 'BOUN',
      description: '캔버스 가장자리에 닿으면 당구공처럼 튕겨져 나옵니다.',
      defaultParams: { condition: 'always', speedX: 120, speedY: 90, elasticity: 0.95 }
    },
    rainbow_shift: {
      category: 'motion', name: '무지개 색상 순환', icon: 'RAIN',
      description: '시간 경과에 따라 색조(Hue)가 무지개색으로 부드럽게 순환합니다.',
      defaultParams: { condition: 'always', cycleDuration: 3.0 }
    },

    // 4. Timing & Control
    timeline_keyframes: {
      category: 'timing', name: '타임라인 키프레임', icon: 'TL',
      description: '타임라인에 기록된 키프레임 보간 애니메이션을 모듈 단위로 실행하고 제어합니다.',
      defaultParams: { condition: 'always', playMode: 'timeline', speed: 1.0 }
    },
    duration_delay: {
      category: 'timing', name: '듀레이션 및 지연', icon: 'DUR',
      description: '지정 초 동안 대기 후 작동하거나 실행 유지 시간을 제어합니다.',
      defaultParams: { condition: 'always', delay: 0.5, duration: 1.5 }
    },
    step_sequencer: {
      category: 'timing', name: '단계별 시퀀서', icon: 'SEQ',
      description: '1단계 ➔ 2단계 ➔ 3단계 등을 순차적으로 실행합니다.',
      defaultParams: { condition: 'always', stepCount: 4, stepInterval: 0.5 }
    },
    stagger_domino: {
      category: 'timing', name: '시차 도미노 모션', icon: 'STAG',
      description: '여러 레이어에 순차적인 시간차(Stagger)를 두고 효과를 발동합니다.',
      defaultParams: { condition: 'always', staggerDelay: 0.08 }
    },
    easing_presets: {
      category: 'timing', name: '이징 커브 프리셋', icon: 'EASE',
      description: 'Elastic, Bounce, Back, Expo 등의 가속도 곡선을 적용합니다.',
      defaultParams: { condition: 'always', curve: 'bounceOut' }
    },
    loop_mode: {
      category: 'timing', name: '반복 루프 모드', icon: 'LOOP',
      description: '1회 실행(Once), 무한 반복(Infinite), 왕복 재생(Ping-Pong)을 제어합니다.',
      defaultParams: { condition: 'always', mode: 'infinite' }
    },

    // 5. Audio
    synth_sfx: {
      category: 'audio', name: '내장 신디사이저 SFX', icon: 'SFX',
      description: '외부 파일 없이 즉시 뾱, 찰칵, 딩동, 팝, 스위치 효과음을 합성 재생합니다.',
      defaultParams: { condition: 'always', sound: 'pop', trigger: 'click' }
    },
    audio_clip: {
      category: 'audio', name: '오디오 파일 재생', icon: 'AUD',
      description: '오디오 파일을 지정하여 특정 타이밍이나 클릭 시 재생합니다.',
      defaultParams: { condition: 'always', audioUrl: '', volume: 0.8 }
    }
  };

  // ==========================================================================
  // 3. Sprite & Layer Models (Photoshop Layer Hierarchy)
  // ==========================================================================
  class Sprite {
    constructor(options = {}) {
      this.id = options.id || 'sprite_' + Math.random().toString(36).substr(2, 9);
      this.name = options.name || '스프라이트';
      this.type = options.type || 'rect'; // 'rect' | 'circle' | 'path' | 'brush' | 'text' | 'image' | 'empty'
      this.x = options.x !== undefined ? options.x : 400;
      this.y = options.y !== undefined ? options.y : 300;
      this.width = options.width !== undefined ? options.width : 120;
      this.height = options.height !== undefined ? options.height : 120;
      this.rotation = options.rotation || 0;
      this.scaleX = options.scaleX !== undefined ? options.scaleX : 1;
      this.scaleY = options.scaleY !== undefined ? options.scaleY : 1;
      this.lockAspectRatio = options.lockAspectRatio || false;

      this.opacity = options.opacity !== undefined ? options.opacity : 1;
      this.blendMode = options.blendMode || 'source-over';
      this.fillType = options.fillType || 'solid';
      this.fill = options.fill || '#38bdf8';
      this.gradient = options.gradient || {
        startX: 0, startY: 0, endX: 120, endY: 120,
        stops: [{ offset: 0, color: '#38bdf8' }, { offset: 1, color: '#818cf8' }]
      };

      this.stroke = options.stroke || '#0284c7';
      this.strokeWidth = options.strokeWidth !== undefined ? options.strokeWidth : 0;
      this.strokeOpacity = options.strokeOpacity !== undefined ? options.strokeOpacity : 1;
      this.fillOpacity = options.fillOpacity !== undefined ? options.fillOpacity : 1;
      this.bevel = options.bevel || 0;
      this.cornerRadius = options.cornerRadius || 0;

      this.pathPoints = options.pathPoints || [];
      this.isClosedPath = options.isClosedPath !== undefined ? options.isClosedPath : true;
      this.strokes = options.strokes || [];

      this.text = options.text || '텍스트';
      this.fontSize = options.fontSize || 32;
      this.fontFamily = options.fontFamily || 'Pretendard, sans-serif';
      this.fontWeight = options.fontWeight || 'bold';
      this.textAlign = options.textAlign || 'center';

      this.imageUrl = options.imageUrl || '';
      this.visible = options.visible !== undefined ? options.visible : true;
      this.locked = options.locked || false;
      this.modules = options.modules || [];
      this.keyframes = options.keyframes || {};

      this.runtime = {
        x: this.x, y: this.y, rotation: this.rotation,
        scaleX: this.scaleX, scaleY: this.scaleY, opacity: this.opacity,
        tiltAngle: 0, vx: 0, vy: 0, isHovered: false
      };
    }

    resetRuntime() {
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
        strokes: JSON.parse(JSON.stringify(this.strokes)),
        text: this.text, fontSize: this.fontSize, fontFamily: this.fontFamily,
        fontWeight: this.fontWeight, textAlign: this.textAlign,
        imageUrl: this.imageUrl, visible: this.visible, locked: this.locked,
        modules: JSON.parse(JSON.stringify(this.modules)),
        keyframes: JSON.parse(JSON.stringify(this.keyframes))
      };
    }
  }

  class Layer {
    constructor(options = {}) {
      this.id = options.id || 'layer_' + Math.random().toString(36).substr(2, 9);
      this.name = options.name || '새 레이어';
      this.visible = options.visible !== undefined ? options.visible : true;
      this.locked = options.locked || false;
      this.opacity = options.opacity !== undefined ? options.opacity : 1;
      this.blendMode = options.blendMode || 'source-over';
      this.zIndex = options.zIndex !== undefined ? options.zIndex : 0;
      this.expanded = options.expanded !== undefined ? options.expanded : true;
      this.modules = options.modules || [];

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
        sprites: this.sprites.map(s => s.toJSON())
      };
    }
  }

  // ==========================================================================
  // 4. Document Model
  // ==========================================================================
  class DocumentModel {
    constructor(options = {}) {
      this.name = options.name || '인터랙티브 배너';
      this.width = options.width || 800;
      this.height = options.height || 600;
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

      this.totalFrames = 100;
      this.fps = 30;
      this.currentFrame = 0;
      this.isPlaying = false;
      this.isLooping = true;
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

    getSelectedLayer() {
      if (this.selectedLayerId) {
        const found = this.layers.find(l => l.id === this.selectedLayerId);
        if (found) return found;
      }
      return this.layers.length > 0 ? this.layers[0] : null;
    }

    getSelectedSprite() {
      if (this.selectedSpriteId) {
        for (const l of this.layers) {
          const s = l.getSprite(this.selectedSpriteId);
          if (s) return s;
        }
      }
      const l = this.getSelectedLayer();
      return l && l.sprites.length > 0 ? l.sprites[0] : null;
    }

    sortLayers() {
      this.layers.forEach((l, i) => { l.zIndex = i; });
    }

    saveState() {
      if (this.historyIndex < this.history.length - 1) {
        this.history = this.history.slice(0, this.historyIndex + 1);
      }
      this.history.push(JSON.stringify(this.toJSON()));
      if (this.history.length > this.maxHistory) this.history.shift();
      this.historyIndex = this.history.length - 1;
    }

    undo() {
      if (this.historyIndex > 0) {
        this.historyIndex--;
        this.loadFromData(JSON.parse(this.history[this.historyIndex]), false);
        return true;
      }
      return false;
    }

    redo() {
      if (this.historyIndex < this.history.length - 1) {
        this.historyIndex++;
        this.loadFromData(JSON.parse(this.history[this.historyIndex]), false);
        return true;
      }
      return false;
    }

    loadFromData(data, recordHistory = true) {
      this.name = data.name || this.name;
      this.width = data.width || this.width;
      this.height = data.height || this.height;
      this.backgroundColor = data.backgroundColor || this.backgroundColor;
      this.transparentBackground = data.transparentBackground !== undefined ? data.transparentBackground : true;
      this.foregroundColor = data.foregroundColor || this.foregroundColor;
      this.totalFrames = data.totalFrames || this.totalFrames;
      this.fps = data.fps || this.fps;
      this.isLooping = data.isLooping !== undefined ? data.isLooping : this.isLooping;

      this.layers = (data.layers || []).map(lData => new Layer(lData));
      this.selectedLayerId = data.selectedLayerId || (this.layers.length > 0 ? this.layers[0].id : null);
      const selL = this.getSelectedLayer();
      this.selectedSpriteId = selL && selL.sprites.length > 0 ? selL.sprites[0].id : null;
      this.sortLayers();

      if (recordHistory) {
        this.history = [];
        this.historyIndex = -1;
        this.saveState();
      }
    }

    toJSON() {
      return {
        name: this.name, width: this.width, height: this.height,
        backgroundColor: this.backgroundColor, transparentBackground: this.transparentBackground,
        foregroundColor: this.foregroundColor, backgroundColorSecondary: this.backgroundColorSecondary,
        totalFrames: this.totalFrames, fps: this.fps, isLooping: this.isLooping,
        currentFrame: this.currentFrame,
        selectedLayerId: this.selectedLayerId,
        selectedSpriteId: this.selectedSpriteId,
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
    }

    getTarget() {
      return this.doc.getSelectedSprite() || this.doc.getSelectedLayer();
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

    startDrag(wx, wy, mode, target) {
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
        target.x = this.origLayer.x + dx;
        target.y = this.origLayer.y + dy;
      } else if (this.mode === 'rot') {
        const startAngle = Math.atan2(this.startPos.y - target.y, this.startPos.x - target.x);
        const curAngle = Math.atan2(wy - target.y, wx - target.x);
        let deg = this.origLayer.rotation + ((curAngle - startAngle) * 180) / Math.PI;
        if (shiftKey) deg = Math.round(deg / 15) * 15;
        target.rotation = Math.round(deg);
      } else {
        // Resize handle dragging
        const rad = (-this.origLayer.rotation * Math.PI) / 180;
        const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
        const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);

        let nw = this.origLayer.width;
        let nh = this.origLayer.height;

        if (this.mode.includes('e')) nw += ldx;
        if (this.mode.includes('w')) nw -= ldx;
        if (this.mode.includes('s')) nh += ldy;
        if (this.mode.includes('n')) nh -= ldy;

        if (shiftKey || target.lockAspectRatio) {
          const ratio = this.origLayer.width / (this.origLayer.height || 1);
          if (Math.abs(ldx) > Math.abs(ldy)) nh = nw / ratio;
          else nw = nh * ratio;
        }

        target.width = Math.max(10, Math.round(nw));
        target.height = Math.max(10, Math.round(nh));

        // Rescale path points proportionally
        if (target.pathPoints && this.origPathPoints && this.origLayer.width > 0 && this.origLayer.height > 0) {
          const sx = target.width / this.origLayer.width;
          const sy = target.height / this.origLayer.height;
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

    centerArtboard() {
      const parent = this.canvas.parentElement;
      if (!parent) return;
      const pw = parent.clientWidth, ph = parent.clientHeight;
      this.panX = Math.round((pw - this.doc.width * this.zoom) / 2);
      this.panY = Math.round((ph - this.doc.height * this.zoom) / 2);
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

    render(activeTool, transformBox, activePenPoints, activeGradientDrag, activeCurvePoints, shapeDragStart, shapeDragCurrent) {
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
      if (window.jspenApp?.moduleEngine?.bus?.particles) {
        for (const p of window.jspenApp.moduleEngine.bus.particles) {
          ctx.save();
          ctx.fillStyle = p.color;
          ctx.globalAlpha = Math.max(0, p.life);
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

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
        const selSprite = this.doc.getSelectedSprite();
        if (selSprite && transformBox && (activeTool === 'move' || activeTool === 'direct')) {
          this.drawTransformGizmo(ctx, selSprite, transformBox);
        }

        // Pen Overlay
        if (activePenPoints && activePenPoints.length > 0) {
          this.drawPenPathOverlay(ctx, activePenPoints);
        }

        // Bezier Curve Tool Overlay
        if (activeCurvePoints && activeCurvePoints.length > 0) {
          this.drawCurveOverlay(ctx, activeCurvePoints);
        }
      }

      ctx.restore();

      if (this.showRulers && this.mode === 'edit') {
        this.drawRulers(ctx, w, h);
      }
    }

    drawCheckerboard(ctx, w, h) {
      const size = 16;
      for (let y = 0; y < h; y += size) {
        for (let x = 0; x < w; x += size) {
          ctx.fillStyle = ((Math.floor(x / size) + Math.floor(y / size)) % 2 === 0) ? '#242428' : '#1c1c20';
          ctx.fillRect(x, y, Math.min(size, w - x), Math.min(size, h - y));
        }
      }
    }

    drawLayer(ctx, layer) {
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, layer.opacity));
      if (layer.blendMode) ctx.globalCompositeOperation = layer.blendMode;

      for (const sprite of layer.sprites) {
        if (!sprite.visible) continue;
        this.drawSprite(ctx, sprite);
      }
      ctx.restore();
    }

    drawSprite(ctx, sprite) {
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

      // Draw Brush Strokes
      if (sprite.strokes && sprite.strokes.length > 0) {
        for (const st of sprite.strokes) {
          if (!st.points || st.points.length === 0) continue;
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = st.color || '#38bdf8';
          ctx.lineWidth = st.size || 4;
          if (st.opacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * st.opacity));
          ctx.beginPath();
          ctx.moveTo(st.points[0].x, st.points[0].y);
          for (let i = 1; i < st.points.length; i++) {
            ctx.lineTo(st.points[i].x, st.points[i].y);
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
        const grad = ctx.createLinearGradient(-hw, -hh, hw, hh);
        for (const s of sprite.gradient.stops) grad.addColorStop(s.offset, s.color);
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
      } else if (sprite.type === 'path') {
        if (sprite.pathPoints && sprite.pathPoints.length > 0) {
          ctx.beginPath();
          ctx.moveTo(sprite.pathPoints[0].x, sprite.pathPoints[0].y);
          for (let i = 1; i < sprite.pathPoints.length; i++) {
            const p = sprite.pathPoints[i];
            if (p.type === 'C' && p.cp1x !== undefined) {
              ctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
            } else if (p.type === 'Q' && p.cpx !== undefined) {
              ctx.quadraticCurveTo(p.cpx, p.cpy, p.x, p.y);
            } else {
              ctx.lineTo(p.x, p.y);
            }
          }
          if (sprite.isClosedPath) ctx.closePath();

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
        }
      } else if (sprite.type === 'text') {
        ctx.font = `${sprite.fontWeight} ${sprite.fontSize}px ${sprite.fontFamily}`;
        ctx.textAlign = sprite.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sprite.text, 0, 0);
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
      ctx.save();
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2 / this.zoom;

      ctx.beginPath();
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        const p = points[i];
        if (p.cp1x !== undefined) {
          ctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.stroke();

      // Tangent handles and anchors
      for (const p of points) {
        if (p.cp1x !== undefined) {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
          ctx.lineWidth = 1 / this.zoom;
          ctx.beginPath();
          ctx.moveTo(p.cp1x, p.cp1y);
          ctx.lineTo(p.x, p.y);
          ctx.lineTo(p.cp2x, p.cp2y);
          ctx.stroke();

          // Tangent handle diamonds
          ctx.fillStyle = '#f59e0b';
          ctx.beginPath();
          ctx.arc(p.cp1x, p.cp1y, 3 / this.zoom, 0, Math.PI * 2);
          ctx.arc(p.cp2x, p.cp2y, 3 / this.zoom, 0, Math.PI * 2);
          ctx.fill();
        }

        // Anchor points
        ctx.fillStyle = '#ffffff';
        ctx.strokeStyle = '#0284c7';
        ctx.beginPath();
        ctx.arc(p.x, p.y, 4 / this.zoom, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
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

      if (this.activeTool === 'brush') {
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
        this.activeCurvePoints.push({ x: wx, y: wy, cp1x: wx, cp1y: wy, cp2x: wx, cp2y: wy });
        if (this.activeCurvePoints.length > 1) {
          const first = this.activeCurvePoints[0];
          if (Math.hypot(wx - first.x, wy - first.y) < 14) {
            this.activeCurvePoints.pop();
            this.commitCurvePath(true);
            return;
          }
        }
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
        const text = prompt('텍스트 내용을 입력하세요:', 'Interactive Text');
        if (text) {
          const sp = activeLayer.addSprite({
            name: '텍스트: ' + text.slice(0, 10),
            type: 'text',
            text: text,
            x: wx, y: wy,
            fontSize: 24,
            fill: this.doc.foregroundColor
          });
          this.doc.selectedSpriteId = sp.id;
          this.doc.saveState();
          if (this.onCommit) this.onCommit();
        }
        return;
      }
    }

    handleMouseMove(wx, wy) {
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
      if (!this.activeBrushStroke || this.activeBrushStroke.length < 2) {
        this.activeBrushStroke = null;
        return;
      }
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      const pts = this.activeBrushStroke;
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
        name: `브러쉬 스트로크 ${activeLayer.sprites.length + 1}`,
        type: 'brush',
        x: cx, y: cy,
        width: Math.max(20, maxX - minX),
        height: Math.max(20, maxY - minY),
        brushSize: this.brushSize,
        brushStrokePoints: relPts,
        stroke: this.doc.foregroundColor,
        fill: 'transparent'
      });

      this.activeBrushStroke = null;
      this.doc.selectedSpriteId = sp.id;
      this.doc.saveState();
    }

    commitShape(start, end) {
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      const x = (start.x + end.x) / 2;
      const y = (start.y + end.y) / 2;
      let w = Math.abs(end.x - start.x);
      let h = Math.abs(end.y - start.y);

      if (w < 5 && h < 5) return;

      if (this.activeShapeType === 'circle') {
        const side = Math.max(w, h);
        w = side;
        h = side;
      }

      const sp = activeLayer.addSprite({
        name: `${this.activeShapeType === 'rect' ? '사각형' : '원형'} 스프라이트`,
        type: this.activeShapeType,
        x: x, y: y,
        width: w, height: h,
        fill: this.doc.foregroundColor,
        stroke: '#ffffff',
        strokeWidth: 2,
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
        fill: closed ? this.doc.foregroundColor : 'transparent',
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
        minX = Math.min(minX, p.x);
        minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x);
        maxY = Math.max(maxY, p.y);
      });

      const cx = (minX + maxX) / 2;
      const cy = (minY + maxY) / 2;
      const relPts = pts.map(p => ({
        x: Math.round(p.x - cx), y: Math.round(p.y - cy),
        cp1x: Math.round(p.cp1x - cx), cp1y: Math.round(p.cp1y - cy),
        cp2x: Math.round(p.cp2x - cx), cp2y: Math.round(p.cp2y - cy)
      }));

      const sp = activeLayer.addSprite({
        name: `베지에 곡선 ${activeLayer.sprites.length + 1}`,
        type: 'path',
        x: cx, y: cy,
        width: Math.max(20, maxX - minX),
        height: Math.max(20, maxY - minY),
        pathPoints: relPts,
        pathClosed: closed,
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

  class ModuleEngine {
    constructor(docModel) {
      this.doc = docModel;
      this.bus = {
        mouse: { x: 0, y: 0, rawX: 0, rawY: 0, vx: 0, vy: 0, isDown: false, clicked: false },
        scroll: { deltaY: 0, progress: 0 },
        time: 0,
        particles: [],
        keyState: {}
      };
      this.active = false;
      this.draggedSprite = null;
      this.dragOffset = { x: 0, y: 0 };
      this.activeModuleIds = null; // Filtered by Node Graph OUTPUT connectivity
    }

    start() {
      this.active = true;
      this.bus.particles = [];
      for (const l of this.doc.layers) l.resetRuntime();
    }

    stop() {
      this.active = false;
      this.bus.particles = [];
      this.draggedSprite = null;
      for (const l of this.doc.layers) l.resetRuntime();
    }

    evaluateCondition(mod, sprite, bus) {
      const cond = mod.params?.condition || 'always';
      if (cond === 'always') return true;
      if (cond === 'on_click') return bus.mouse.clicked && sprite.runtime.isHovered;
      if (cond === 'on_hover') return sprite.runtime.isHovered;
      if (cond === 'key_press') {
        const targetK = mod.params?.targetKey || 'Space';
        return !!bus.keyState[targetK];
      }
      if (cond === 'timeline_active') {
        const sf = mod.params?.startFrame || 0;
        const ef = mod.params?.endFrame || this.doc.totalFrames;
        return this.doc.currentFrame >= sf && this.doc.currentFrame <= ef;
      }
      return true;
    }

    update(dt, mw, ms, isDown, clicked) {
      if (!this.active) return;
      this.bus.time += dt;
      const prevX = this.bus.mouse.x, prevY = this.bus.mouse.y;
      this.bus.mouse.x = mw.x; this.bus.mouse.y = mw.y;
      this.bus.mouse.rawX = ms.x; this.bus.mouse.rawY = ms.y;
      this.bus.mouse.vx = (this.bus.mouse.x - prevX) / (dt || 0.016);
      this.bus.mouse.vy = (this.bus.mouse.y - prevY) / (dt || 0.016);
      this.bus.mouse.isDown = isDown;
      this.bus.mouse.clicked = clicked;

      // Handle free dragging via draggable module
      if (this.draggedSprite) {
        if (this.bus.mouse.isDown) {
          this.draggedSprite.runtime.x = this.bus.mouse.x - this.dragOffset.x;
          this.draggedSprite.runtime.y = this.bus.mouse.y - this.dragOffset.y;
        } else {
          this.draggedSprite = null;
        }
      }

      // Update particles
      for (let i = this.bus.particles.length - 1; i >= 0; i--) {
        const p = this.bus.particles[i];
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.life -= dt / p.maxLife;
        if (p.life <= 0) this.bus.particles.splice(i, 1);
      }

      for (const layer of this.doc.layers) {
        if (!layer.visible) continue;

        for (const sprite of layer.sprites) {
          if (!sprite.visible) continue;
          sprite.runtime.isHovered = this.isPointInside(this.bus.mouse.x, this.bus.mouse.y, sprite);

          for (const mod of (sprite.modules || [])) {
            if (!mod.enabled) continue;
            // Node editor connectivity check: Only modules wired to Output node run!
            if (this.activeModuleIds && !this.activeModuleIds.has(mod.id)) continue;
            // Condition evaluation
            if (!this.evaluateCondition(mod, sprite, this.bus)) continue;

            const p = mod.params || {};

            switch (mod.type) {
              case 'draggable':
                if (this.bus.mouse.clicked && !this.draggedSprite && sprite.runtime.isHovered) {
                  this.draggedSprite = sprite;
                  this.dragOffset = { x: this.bus.mouse.x - sprite.runtime.x, y: this.bus.mouse.y - sprite.runtime.y };
                }
                break;

              case 'follow_target': {
                let tx = this.bus.mouse.x, ty = this.bus.mouse.y;
                if (p.targetLayerId) {
                  const target = this.doc.getLayer(p.targetLayerId)?.primarySprite;
                  if (target) { tx = target.runtime.x; ty = target.runtime.y; }
                }
                const st = p.stiffness || 0.1, dp = p.damping || 0.8;
                sprite.runtime.vx = ((sprite.runtime.vx || 0) + (tx + (p.offsetX || 0) - sprite.runtime.x) * st) * dp;
                sprite.runtime.vy = ((sprite.runtime.vy || 0) + (ty + (p.offsetY || 0) - sprite.runtime.y) * st) * dp;
                sprite.runtime.x += sprite.runtime.vx;
                sprite.runtime.y += sprite.runtime.vy;
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
                const amp = p.amplitude || 12;
                const freq = p.frequency || 1.5;
                const off = Math.sin(this.bus.time * freq * Math.PI * 2) * amp;
                if (p.axis === 'x') sprite.runtime.x = sprite.x + off;
                else sprite.runtime.y = sprite.y + off;
                break;
              }

              case 'pulse_scale': {
                const minS = p.minScale || 0.9, maxS = p.maxScale || 1.1;
                const spd = p.speed || 2.0;
                const s = minS + ((Math.sin(this.bus.time * spd * Math.PI * 2) + 1) / 2) * (maxS - minS);
                sprite.runtime.scaleX = sprite.scaleX * s;
                sprite.runtime.scaleY = sprite.scaleY * s;
                break;
              }

              case 'orbit_spin': {
                const spd = p.speedDegPerSec || 45;
                sprite.runtime.rotation = (sprite.runtime.rotation + spd * dt) % 360;
                break;
              }

              case 'timeline_keyframes': {
                // Execute keyframes through encapsulated module
                sprite.evaluateKeyframes(this.doc.currentFrame);
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
      const rad = (-sprite.rotation * Math.PI) / 180;
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
    static generateJS(doc, activeModuleIds = null) {
      const docData = JSON.stringify(doc.toJSON(), null, 2);
      return `/**
 * JSPen Studio - Zero-Discrepancy Vanilla Canvas 2D Engine
 * Exported pure JavaScript: 0 external dependencies!
 */
(function() {
  'use strict';
  const doc = ${docData};
  const canvas = document.getElementById('viewportCanvas') || document.querySelector('canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  canvas.width = doc.width;
  canvas.height = doc.height;

  const bus = {
    mouse: { x: 0, y: 0, vx: 0, vy: 0, isDown: false, clicked: false },
    time: 0
  };
  let prevX = 0, prevY = 0, frameAcc = 0;
  let currentFrame = 0;

  for (const l of doc.layers) {
    for (const s of l.sprites) {
      s.runtime = { x: s.x, y: s.y, rotation: s.rotation, scaleX: s.scaleX, scaleY: s.scaleY, opacity: s.opacity, vx: 0, vy: 0 };
    }
  }

  canvas.addEventListener('mousemove', e => {
    const r = canvas.getBoundingClientRect();
    bus.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
    bus.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
  });
  canvas.addEventListener('mousedown', () => { bus.mouse.isDown = true; bus.mouse.clicked = true; });
  window.addEventListener('mouseup', () => { bus.mouse.isDown = false; });

  let lastTime = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    bus.time += dt;
    bus.mouse.vx = (bus.mouse.x - prevX) / (dt || 0.016);
    bus.mouse.vy = (bus.mouse.y - prevY) / (dt || 0.016);
    prevX = bus.mouse.x; prevY = bus.mouse.y;

    // Timeline stepping
    frameAcc += dt;
    const interval = 1 / doc.fps;
    while (frameAcc >= interval) {
      frameAcc -= interval;
      currentFrame = (currentFrame + 1) % doc.totalFrames;
    }

    // Render Clean Canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!doc.transparentBackground) {
      ctx.fillStyle = doc.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (const l of doc.layers) {
      if (!l.visible) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, l.opacity));
      if (l.blendMode) ctx.globalCompositeOperation = l.blendMode;

      for (const s of l.sprites) {
        if (!s.visible) continue;
        ctx.save();
        ctx.translate(s.runtime.x, s.runtime.y);
        ctx.rotate((s.runtime.rotation * Math.PI) / 180);
        ctx.scale(s.runtime.scaleX, s.runtime.scaleY);
        ctx.globalAlpha = Math.max(0, Math.min(1, s.runtime.opacity));

        const hw = s.width / 2, hh = s.height / 2;
        ctx.fillStyle = s.fill || '#38bdf8';
        ctx.strokeStyle = s.stroke || '#0284c7';
        ctx.lineWidth = s.strokeWidth || 0;

        if (s.type === 'rect' || s.type === 'bevel_rect') {
          ctx.beginPath();
          const cr = s.cornerRadius || 0, bv = s.bevel || 0;
          if (cr > 0 && bv > 0) {
            const b = Math.min(bv, hw, hh);
            const r = Math.min(cr, b * 0.5);
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
            ctx.roundRect(-hw, -hh, s.width, s.height, cr);
          } else {
            ctx.rect(-hw, -hh, s.width, s.height);
          }
          if (s.fill !== 'transparent') ctx.fill();
          if (s.strokeWidth > 0) ctx.stroke();
        } else if (s.type === 'circle') {
          ctx.beginPath();
          ctx.ellipse(0, 0, Math.max(1, hw), Math.max(1, hh), 0, 0, Math.PI * 2);
          if (s.fill !== 'transparent') ctx.fill();
          if (s.strokeWidth > 0) ctx.stroke();
        } else if (s.type === 'path' && s.pathPoints) {
          ctx.beginPath();
          ctx.moveTo(s.pathPoints[0].x, s.pathPoints[0].y);
          for (let i = 1; i < s.pathPoints.length; i++) {
            const p = s.pathPoints[i];
            if (p.type === 'C') ctx.bezierCurveTo(p.cp1x, p.cp1y, p.cp2x, p.cp2y, p.x, p.y);
            else ctx.lineTo(p.x, p.y);
          }
          if (s.isClosedPath) ctx.closePath();
          if (s.fill !== 'transparent') ctx.fill();
          if (s.strokeWidth > 0) ctx.stroke();
        }
        ctx.restore();
      }
      ctx.restore();
    }
    bus.mouse.clicked = false;
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();`;
    }

    static generateHTML(doc) {
      const jsCode = this.generateJS(doc);
      return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${doc.name || 'JSPen Output'}</title>
  <style>
    body { margin: 0; background: #000; display: flex; align-items: center; justify-content: center; min-height: 100vh; overflow: hidden; }
    canvas { box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
  </style>
</head>
<body>
  <canvas id="viewportCanvas"></canvas>
  <script>${jsCode}<\/script>
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
            <input type="color" class="ps-swatch ps-swatch-fg" id="colFg" value="${this.tools.doc.foregroundColor}">
            <input type="color" class="ps-swatch ps-swatch-bg" id="colBg" value="${this.tools.doc.backgroundColorSecondary}">
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
      let html = `<div class="ps-option-group"><span class="ps-option-title">${this.getToolName(t)}</span></div>`;

      if (t === 'brush') {
        html += `
          <div class="ps-option-group">
            <label class="ps-option-label">두께:</label>
            <input type="range" class="ps-slider" id="optBrushSize" min="1" max="40" value="${this.tools.brushSize}">
            <span class="ps-val-tag" id="valBrushSize">${this.tools.brushSize}px</span>
          </div>
          <div class="ps-stabilizer-group">
            <button class="ps-stabilizer-btn ${this.tools.brushStabilize ? 'active' : ''}" id="btnToggleStab">
              ${this.tools.brushStabilize ? '✓ 곡선 보정 ON' : '곡선 보정 OFF'}
            </button>
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
        this.el.querySelector('#valBrushSize').textContent = `${this.tools.brushSize}px`;
      });
      this.el.querySelector('#btnToggleStab')?.addEventListener('click', () => {
        this.tools.brushStabilize = !this.tools.brushStabilize;
        this.render();
      });
      this.el.querySelector('#optShapeType')?.addEventListener('change', e => {
        this.tools.activeShapeType = e.target.value;
      });
      this.el.querySelector('#btnZoomReset')?.addEventListener('click', () => {
        this.tools.renderer.zoom = 1.0;
        this.tools.renderer.centerArtboard();
        this.onUpdate();
        this.render();
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
        <div class="ps-dock-header">
          <span class="ps-dock-title">레이어 (Layers)</span>
          <div class="ps-dock-tools">
            <button class="ps-dock-tool-btn" id="btnNewLayer" title="새 레이어 생성">+ 레이어</button>
            <button class="ps-dock-tool-btn" id="btnFloatLayers" title="패널 팝업 띄우기">⧉</button>
          </div>
        </div>

        <div class="ps-layer-list">
          ${reversedLayers.length === 0 ? '<div class="ps-empty-layers">레이어가 없습니다. 상단 + 레이어를 클릭하세요.</div>' : reversedLayers.map(l => `
            <div class="ps-layer-group ${l.id === this.doc.selectedLayerId ? 'selected' : ''}" data-layer-id="${l.id}">
              <!-- Layer Container Row (Entire row clickable to select layer) -->
              <div class="ps-layer-row ${l.id === this.doc.selectedLayerId ? 'selected' : ''}" data-act="select-layer" data-layer-id="${l.id}" draggable="true">
                <button class="ps-layer-fold-btn" data-act="fold-layer" title="접기/펼치기">${l.expanded ? '▼' : '▶'}</button>
                <button class="ps-layer-vis-btn ${l.visible ? '' : 'muted'}" data-act="vis-layer" title="레이어 가시성">${l.visible ? '●' : '○'}</button>
                <div class="ps-layer-color-tag"></div>

                ${this.renamingId === l.id ? `
                  <input type="text" class="ps-layer-title-input" value="${l.name}" autofocus>
                ` : `
                  <span class="ps-layer-title" data-act="select-layer" title="더블 클릭하여 이름 변경">${l.name}</span>
                `}

                <span class="ps-layer-count-badge">${l.sprites.length}개</span>
                <button class="ps-btn-layer-add-sp" data-act="add-child-sprite" title="이 레이어 안에 새 스프라이트 생성">+스프라이트</button>
                <button class="ps-btn-add-module ${(l.modules && l.modules.length > 0) ? 'has-modules' : ''}" data-act="add-layer-mod" title="레이어 모듈 추가">+fx</button>
                <button class="ps-btn-del-item" data-act="delete-layer" title="레이어 삭제">✕</button>
              </div>

              <!-- Child Sprites (Clearly Nested in Fabric Tree Structure) -->
              ${l.expanded ? `
                <div class="ps-layer-sub-sprites">
                  ${l.sprites.length === 0 ? '<div style="font-size:10.5px;color:#71717a;padding:4px 2px;">스프라이트가 없습니다 (+스프라이트 클릭)</div>' : l.sprites.map(s => `
                    <div class="ps-sprite-sub-item ${s.id === this.doc.selectedSpriteId ? 'selected' : ''}" data-act="select-sprite" data-sprite-id="${s.id}" data-layer-id="${l.id}" draggable="true">
                      <div class="ps-sprite-header">
                        <button class="ps-layer-vis-btn ${s.visible ? '' : 'muted'}" data-act="vis-sprite" title="스프라이트 가시성">${s.visible ? '●' : '○'}</button>
                        <span class="ps-layer-type-icon">${s.type === 'rect' ? '▭' : (s.type === 'circle' ? '○' : (s.type === 'path' ? '⟿' : '✎'))}</span>
                        
                        ${this.renamingId === s.id ? `
                          <input type="text" class="ps-layer-title-input" value="${s.name}" autofocus>
                        ` : `
                          <span class="ps-sprite-title" data-act="select-sprite" title="더블 클릭하여 이름 변경">${s.name}</span>
                        `}

                        <button class="ps-btn-add-module ${(s.modules && s.modules.length > 0) ? 'has-modules' : ''}" data-act="add-sprite-mod" title="스프라이트 모듈 추가">
                          +fx ${(s.modules && s.modules.length > 0) ? `<span class="mod-count">${s.modules.length}</span>` : ''}
                        </button>
                        <button class="ps-btn-del-item" data-act="delete-sprite" title="스프라이트 삭제">✕</button>
                      </div>

                      <!-- Sub-Modules under Sprite -->
                      ${(s.modules && s.modules.length > 0) ? `
                        <div class="ps-layer-sub-modules">
                          ${s.modules.map((m, mIdx) => `
                            <div class="ps-layer-module-row ${m.id === this.doc.selectedModuleId ? 'selected-mod' : ''}" data-mod-id="${m.id}" data-mod-idx="${mIdx}" draggable="true">
                              <span class="mod-indent">↳</span>
                              <span class="mod-badge" style="background:${MODULE_REGISTRY[m.type]?.color || '#0284c7'};">${MODULE_REGISTRY[m.type]?.icon || 'MOD'}</span>
                              <span class="mod-name" data-act="select-mod">${m.name}</span>
                              <button class="mod-toggle ${m.enabled ? 'active' : ''}" data-act="toggle-mod">${m.enabled ? 'ON' : 'OFF'}</button>
                              <button class="mod-del" data-act="del-mod" title="모듈 삭제">×</button>
                            </div>
                          `).join('')}
                        </div>
                      ` : ''}
                    </div>
                  `).join('')}
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
    }

    initEventsOnce() {
      // 1. Single click delegation on persistent container
      this.el.addEventListener('click', e => {
        if (e.target.closest('#btnFloatLayers')) {
          this.cb.onToggleFloat('layers');
          return;
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
          this.cb.onUpdate();
        } else if (act === 'delete-layer' && layer) {
          if (this.doc.layers.length <= 1) {
            alert('최소 1개의 레이어가 유지되어야 합니다.');
            return;
          }
          this.doc.removeLayer(layer.id);
          this.cb.onUpdate();
        } else if (act === 'vis-sprite' && sprite) {
          sprite.visible = !sprite.visible;
          this.cb.onUpdate();
        } else if (act === 'select-sprite' && sprite) {
          this.doc.selectedLayerId = layerId;
          this.doc.selectedSpriteId = sprite.id;
          this.doc.selectedModuleId = null;
          this.cb.onUpdate();
        } else if (act === 'delete-sprite' && layer && sprite) {
          layer.removeSprite(sprite.id);
          if (this.doc.selectedSpriteId === sprite.id) {
            this.doc.selectedSpriteId = layer.sprites.length > 0 ? layer.sprites[0].id : null;
          }
          this.cb.onUpdate();
        } else if (act === 'select-mod' && modId) {
          this.doc.selectedModuleId = modId;
          this.cb.onUpdate();
        } else if (act === 'toggle-mod' && sprite && modRow) {
          const mod = sprite.modules?.find(m => m.id === modId);
          if (mod) { mod.enabled = !mod.enabled; this.cb.onUpdate(); }
        } else if (act === 'del-mod' && sprite && modRow) {
          sprite.modules = sprite.modules?.filter(m => m.id !== modId);
          if (this.doc.selectedModuleId === modId) this.doc.selectedModuleId = null;
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
          this.dragInfo = { type: 'mod', id: row.dataset.modId };
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

        if (type === 'layer' && row.classList.contains('ps-layer-row')) {
          const targetId = row.dataset.layerId;
          if (id && targetId && id !== targetId) {
            const srcIdx = this.doc.layers.findIndex(l => l.id === id);
            const dstIdx = this.doc.layers.findIndex(l => l.id === targetId);
            if (srcIdx !== -1 && dstIdx !== -1) {
              const [moved] = this.doc.layers.splice(srcIdx, 1);
              this.doc.layers.splice(isTop ? dstIdx : dstIdx + 1, 0, moved);
              this.doc.sortLayers();
              this.cb.onUpdate();
            }
          }
        } else if (type === 'sprite' && row.classList.contains('ps-sprite-sub-item')) {
          const targetSpriteId = row.dataset.spriteId;
          const targetLayerId = row.dataset.layerId;
          const srcLayer = this.doc.getLayer(srcLayerId);
          const dstLayer = this.doc.getLayer(targetLayerId);
          if (srcLayer && dstLayer) {
            const srcIdx = srcLayer.sprites.findIndex(s => s.id === id);
            const dstIdx = dstLayer.sprites.findIndex(s => s.id === targetSpriteId);
            if (srcIdx !== -1 && dstIdx !== -1) {
              const [moved] = srcLayer.sprites.splice(srcIdx, 1);
              dstLayer.sprites.splice(isTop ? dstIdx : dstIdx + 1, 0, moved);
              this.cb.onUpdate();
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
            <div class="ps-modal-title">${isLayer ? '레이어 모듈 장착' : '스프라이트 모듈 장착'} (${target.name})</div>
            <button class="ps-modal-close" id="closeModal">✕</button>
          </div>
          <div class="mod-category-tabs">
            <button class="mod-category-tab ${this.activeCategory==='all'?'active':''}" data-cat="all">전체</button>
            <button class="mod-category-tab ${this.activeCategory==='sensor'?'active':''}" data-cat="sensor">감지 & 제스처</button>
            <button class="mod-category-tab ${this.activeCategory==='motion'?'active':''}" data-cat="motion">모션 & FX</button>
            <button class="mod-category-tab ${this.activeCategory==='logic'?'active':''}" data-cat="logic">연결 & 로직</button>
            <button class="mod-category-tab ${this.activeCategory==='timing'?'active':''}" data-cat="timing">타이밍 & 사운드</button>
          </div>
          <div class="ps-module-grid" id="modalModGrid"></div>
        </div>
      `;
      document.body.appendChild(modal);

      const renderGrid = () => {
        const grid = modal.querySelector('#modalModGrid');
        const keys = Object.keys(MODULE_REGISTRY).filter(k => {
          if (this.activeCategory === 'all') return true;
          if (this.activeCategory === 'timing') return MODULE_REGISTRY[k].category === 'timing' || MODULE_REGISTRY[k].category === 'audio';
          return MODULE_REGISTRY[k].category === this.activeCategory;
        });

        grid.innerHTML = keys.map(k => {
          const m = MODULE_REGISTRY[k];
          return `
            <div class="ps-module-card" data-key="${k}">
              <div class="ps-mod-badge" style="background:${m.color || '#0284c7'};">${m.icon}</div>
              <div class="ps-mod-info">
                <div class="ps-mod-name">${m.name}</div>
                <div class="ps-mod-desc">${m.description}</div>
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
  // 14. InspectorPanelUI (Non-Destructive Live Scrubbing & Module Inspector)
  // ==========================================================================
  class InspectorPanelUI {
    constructor(el, doc, callbacks) {
      this.el = el;
      this.doc = doc;
      this.cb = callbacks;
      this.render();
    }

    render() {
      const selectedSprite = this.doc.getSelectedSprite();
      const selectedLayer = this.doc.getSelectedLayer();
      const selectedMod = this.getSelectedModule(selectedSprite);

      this.el.innerHTML = `
        <div class="ps-dock-header">
          <span class="ps-dock-title">속성 (Inspector)</span>
          <div class="ps-dock-tools">
            <button class="ps-dock-tool-btn" id="btnFloatInspector" title="패널 팝업 띄우기">⧉</button>
          </div>
        </div>

        <div class="ps-insp-scroll-area">
          ${selectedMod ? this.renderModuleInspector(selectedMod, selectedSprite) : this.renderVisualInspector(selectedSprite, selectedLayer)}
        </div>
      `;

      this.bindScrubbing();
      this.bindInputs(selectedSprite, selectedMod);

      this.el.querySelector('#btnFloatInspector')?.addEventListener('click', () => {
        this.cb.onToggleFloat('inspector');
      });
    }

    getSelectedModule(sprite) {
      if (!this.doc.selectedModuleId || !sprite || !sprite.modules) return null;
      return sprite.modules.find(m => m.id === this.doc.selectedModuleId) || null;
    }

    renderModuleInspector(mod, sprite) {
      const def = MODULE_REGISTRY[mod.type] || {};
      const params = mod.params || {};

      return `
        <div class="ps-prop-section">
          <div class="ps-prop-header" style="justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span class="mod-badge" style="background:${def.color||'#0284c7'};">${def.icon||'MOD'}</span>
              <span style="font-weight:700;color:#fff;">${mod.name}</span>
            </div>
            <button class="btn btn-secondary btn-sm" id="btnBackToVisual">스프라이트 속성 보기</button>
          </div>
          
          <div class="ps-prop-row" style="margin-top:10px;">
            <label class="ps-prop-label">작동 조건 (Condition):</label>
            <select class="ps-select" id="modCond">
              <option value="always" ${params.condition==='always'?'selected':''}>상시 실행 (Always)</option>
              <option value="on_click" ${params.condition==='on_click'?'selected':''}>마우스 클릭 시 (On Click)</option>
              <option value="on_hover" ${params.condition==='on_hover'?'selected':''}>마우스 호버 시 (On Hover)</option>
              <option value="key_press" ${params.condition==='key_press'?'selected':''}>키보드 입력 시 (Key Press)</option>
              <option value="timeline_active" ${params.condition==='timeline_active'?'selected':''}>특정 프레임 구간 (Timeline)</option>
            </select>
          </div>

          <div style="margin-top:12px;font-size:11px;font-weight:700;color:#a1a1aa;">모듈 파라미터 (사용자 수동 제어)</div>
          ${Object.keys(params).filter(k => k !== 'condition').map(key => `
            <div class="ps-prop-row" style="margin-top:8px;">
              <label class="ps-prop-label">${key}:</label>
              ${typeof params[key] === 'number' ? `
                <div class="blender-scrub-group">
                  <input type="number" class="blender-scrub-input" data-param-key="${key}" value="${params[key]}">
                </div>
              ` : `
                <input type="text" class="ps-input" data-param-key="${key}" value="${params[key]}">
              `}
            </div>
          `).join('')}
        </div>
      `;
    }

    renderVisualInspector(sprite, layer) {
      if (!sprite) {
        return '<div class="ps-empty-layers">선택된 스프라이트가 없습니다. 레이어 창에서 스프라이트를 선택하세요.</div>';
      }

      return `
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
              <input type="number" class="blender-scrub-input" id="inpW" value="${Math.round(sprite.width)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">H</span>
              <input type="number" class="blender-scrub-input" id="inpH" value="${Math.round(sprite.height)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">Rot</span>
              <input type="number" class="blender-scrub-input" id="inpRot" value="${Math.round(sprite.rotation)}">
            </div>
            <div class="blender-scrub-group">
              <span class="blender-scrub-label">Opac</span>
              <input type="number" class="blender-scrub-input" id="inpOpacity" step="0.05" min="0" max="1" value="${sprite.opacity}">
            </div>
          </div>
        </div>

        <!-- Appearance Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">모양 및 곡률 (Bevel & Style)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">채우기 색상:</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" id="inpFill" value="${sprite.fill && sprite.fill.startsWith('#') ? sprite.fill : '#38bdf8'}">
              <span class="ps-val-tag">${sprite.fill}</span>
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">테두리 색상:</label>
            <div class="ps-color-picker-wrap">
              <input type="color" class="ps-color-picker" id="inpStroke" value="${sprite.stroke && sprite.stroke.startsWith('#') ? sprite.stroke : '#ffffff'}">
              <span class="ps-val-tag">${sprite.stroke}</span>
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">선 두께:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpStrokeWidth" min="0" max="50" value="${sprite.strokeWidth || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">코너 라운딩:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpCornerRadius" min="0" max="100" value="${sprite.cornerRadius || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">베벨 수치:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpBevelChamfer" min="0" max="100" value="${sprite.bevelChamfer || 0}">
            </div>
          </div>
        </div>
      `;
    }

    bindScrubbing() {
      this.el.querySelectorAll('.blender-scrub-group').forEach(group => {
        const inp = group.querySelector('.blender-scrub-input');
        if (!inp) return;
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
              const step = inp.step ? parseFloat(inp.step) : 1;
              const nVal = Math.round((startVal + dx * step) * 10) / 10;
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
      });
    }

    bindInputs(sprite, mod) {
      if (mod) {
        this.el.querySelector('#btnBackToVisual')?.addEventListener('click', () => {
          this.doc.selectedModuleId = null;
          this.render();
        });

        this.el.querySelector('#modCond')?.addEventListener('change', e => {
          if (!mod.params) mod.params = {};
          mod.params.condition = e.target.value;
          this.doc.saveState();
          this.cb.onUpdate();
        });

        this.el.querySelectorAll('[data-param-key]').forEach(input => {
          const key = input.dataset.paramKey;
          input.addEventListener('change', e => {
            if (!mod.params) mod.params = {};
            mod.params[key] = input.type === 'number' ? parseFloat(e.target.value) : e.target.value;
            this.doc.saveState();
            this.cb.onUpdate();
          });
        });
        return;
      }

      if (!sprite) return;

      const bindProp = (id, prop, isNum = true) => {
        const el = this.el.querySelector('#' + id);
        if (!el) return;
        el.addEventListener('input', () => {
          sprite[prop] = isNum ? (parseFloat(el.value) || 0) : el.value;
          // Synchronize related bevel chamfer and corner radius
          if (prop === 'cornerRadius' && sprite.bevelChamfer !== undefined) {
            sprite.bevelChamfer = sprite.cornerRadius;
            const bEl = this.el.querySelector('#inpBevelChamfer');
            if (bEl) bEl.value = sprite.cornerRadius;
          } else if (prop === 'bevelChamfer' && sprite.cornerRadius !== undefined) {
            sprite.cornerRadius = sprite.bevelChamfer;
            const cEl = this.el.querySelector('#inpCornerRadius');
            if (cEl) cEl.value = sprite.bevelChamfer;
          }
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
        });

        el.addEventListener('change', () => {
          this.doc.saveState();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });
      };

      bindProp('inpX', 'x');
      bindProp('inpY', 'y');
      bindProp('inpW', 'width');
      bindProp('inpH', 'height');
      bindProp('inpRot', 'rotation');
      bindProp('inpOpacity', 'opacity');
      bindProp('inpCornerRadius', 'cornerRadius');
      bindProp('inpBevelChamfer', 'bevelChamfer');
      bindProp('inpFill', 'fill', false);
      bindProp('inpStroke', 'stroke', false);
      bindProp('inpStrokeWidth', 'strokeWidth');
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
              <input type="number" id="tlCurFrame" class="tl-frame-num" value="${current}" min="0" max="${total}">
              <span class="tl-frame-total">/ ${total}</span>
            </div>
            <select class="tl-select" id="tlFps">
              <option value="24" ${this.doc.fps === 24 ? 'selected' : ''}>24 fps</option>
              <option value="30" ${this.doc.fps === 30 ? 'selected' : ''}>30 fps</option>
              <option value="60" ${this.doc.fps === 60 ? 'selected' : ''}>60 fps</option>
            </select>
            <button class="tl-btn ${loop ? 'active' : ''}" id="tlLoop" title="루프 반복 재생">⟳</button>
          </div>

          <div class="tl-controls-right">
            <button class="tl-btn" id="tlFloatTimeline" title="패널 팝업 띄우기">⧉</button>
            <button class="tl-btn" id="tlToggleCollapse" title="타임라인 접기/펼치기">${this.collapsed ? '▲ 펼치기' : '▼ 접기'}</button>
          </div>
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

      this.el.querySelector('#tlFloatTimeline')?.addEventListener('click', () => {
        this.cb.onToggleFloat('timeline');
      });

      this.el.querySelector('#tlToggleCollapse')?.addEventListener('click', () => {
        this.collapsed = !this.collapsed;
        this.el.classList.toggle('collapsed', this.collapsed);
        this.render();
        if (window.jspenApp) window.jspenApp.handleResize();
      });

      this.el.querySelector('#tlCurFrame')?.addEventListener('change', e => {
        this.doc.setFrame(parseInt(e.target.value, 10) || 0);
        this.onSeek();
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
          <span class="tl-track-name">${sprite.name}</span>
        </div>
        ${PROPS.map(p => `
          <div class="tl-track-row tl-track-sub">
            <span class="tl-track-sub-indent">└</span>
            <span class="tl-track-name">${p.label}</span>
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

      const rcv = this.el.querySelector('#tlRulerCanvas');
      const gcv = this.el.querySelector('#tlGridCanvas');
      if (!rcv || !gcv) return;

      rcv.width = rw; rcv.height = rh;
      gcv.width = gw; gcv.height = gh;

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
      this.el.innerHTML = `
        <div class="ps-menubar-left">
          <div class="ps-app-logo">
            <span class="ps-logo-icon" style="font-size:11px;font-weight:900;background:#0284c7;color:#fff;padding:2px 5px;border-radius:3px;">JS</span>
            <span class="ps-logo-text">JSPen Studio</span>
          </div>

          <!-- Mode Switcher -->
          <button class="ps-mode-switch-btn" id="btnSwitchMode">
            ${this.cb.isNodeMode ? '스튜디오로 복귀 (Shift+Tab)' : '모듈 노드 모드 (Shift+Tab)'}
          </button>

          <div class="ps-menu-items">
            <div class="ps-menu-item"><span>파일(F)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="mNew">새 도큐먼트 <span class="shortcut">Ctrl+N</span></button>
                <button class="ps-dropdown-item" id="mOpen">열기... <span class="shortcut">Ctrl+O</span></button>
                <button class="ps-dropdown-item" id="mSave">프로젝트 저장 (.jspen) <span class="shortcut">Ctrl+S</span></button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mSettings">환경 설정... <span class="shortcut">Ctrl+,</span></button>
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
            <div class="ps-menu-item"><span>창(W)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="wToolbox">${this.windowToggles.toolbox ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}도구 상자 (Toolbox)</button>
                <button class="ps-dropdown-item" id="wOptionBar">${this.windowToggles.optionBar ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}옵션 바 (Option Bar)</button>
                <button class="ps-dropdown-item" id="wInspector">${this.windowToggles.inspector ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}속성 패널 (Inspector)</button>
                <button class="ps-dropdown-item" id="wLayers">${this.windowToggles.layers ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}레이어 패널 (Layers)</button>
                <button class="ps-dropdown-item" id="wTimeline">${this.windowToggles.timeline ? '✓ ' : '&nbsp;&nbsp;&nbsp;'}타임라인 (Timeline)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="wResetLayout">기본 작업영역 재설정 (Reset Layout)</button>
              </div>
            </div>
          </div>
        </div>

        <!-- Draggable Native Window Title Bar Region -->
        <div class="ps-menubar-drag-region" id="titleDragRegion">
          ${this.doc.name} - JSPen Studio
        </div>

        <!-- Native Window Controls -->
        <div class="ps-menubar-right">
          <div class="ps-window-controls">
            <button class="ps-win-btn win-min" id="winMin" title="최소화">─</button>
            <button class="ps-win-btn win-max" id="winMax" title="최대화 / 이전 크기">□</button>
            <button class="ps-win-btn win-close" id="winClose" title="닫기">✕</button>
          </div>
        </div>
      `;

      this.bindEvents();
    }

    bindEvents() {
      // Window drag start
      this.el.querySelector('#titleDragRegion')?.addEventListener('mousedown', e => {
        if (e.button === 0) {
          document.title = 'cmd:window_drag_start';
          setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
        }
      });

      // Window controls
      this.el.querySelector('#winMin')?.addEventListener('click', () => {
        document.title = 'cmd:window_min';
        setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
      });
      this.el.querySelector('#winMax')?.addEventListener('click', () => {
        document.title = 'cmd:window_max';
        setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
      });
      this.el.querySelector('#winClose')?.addEventListener('click', () => {
        document.title = 'cmd:window_close';
        setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
      });

      // Mode switch
      this.el.querySelector('#btnSwitchMode')?.addEventListener('click', () => {
        this.cb.onToggleNodeMode();
      });

      // File actions
      this.el.querySelector('#mExp')?.addEventListener('click', () => this.cb.onExport());
      this.el.querySelector('#mSettings')?.addEventListener('click', () => this.cb.onOpenSettings());
      this.el.querySelector('#mNew')?.addEventListener('click', () => {
        if (confirm('새 도큐먼트를 생성하시겠습니까? 저장되지 않은 작업은 유실됩니다.')) {
          location.reload();
        }
      });
      this.el.querySelector('#mSave')?.addEventListener('click', () => {
        document.title = 'cmd:save';
        setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
      });
      this.el.querySelector('#mOpen')?.addEventListener('click', () => {
        document.title = 'cmd:open';
        setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
      });

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
      const togglePanel = (name, selector) => {
        this.windowToggles[name] = !this.windowToggles[name];
        const el = document.querySelector(selector);
        if (el) el.classList.toggle('hidden', !this.windowToggles[name]);
        this.render();
      };

      this.el.querySelector('#wToolbox')?.addEventListener('click', () => togglePanel('toolbox', '#leftToolbox'));
      this.el.querySelector('#wOptionBar')?.addEventListener('click', () => togglePanel('optionBar', '#toolOptionBar'));
      this.el.querySelector('#wInspector')?.addEventListener('click', () => togglePanel('inspector', '#inspectorContainer'));
      this.el.querySelector('#wLayers')?.addEventListener('click', () => togglePanel('layers', '#layersContainer'));
      this.el.querySelector('#wTimeline')?.addEventListener('click', () => togglePanel('timeline', '#bottomTimeline'));
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
      this.sound = new SoundManager();

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

      // Output Master Node (Red Header)
      const masterPos = existingPositions.get('output_master') || { x: 800, y: 120 };
      this.nodes.push({
        id: 'output_master',
        category: 'output',
        type: 'output_master',
        title: '최종 출력 (OUTPUT)',
        badge: 'MASTER',
        x: masterPos.x, y: masterPos.y,
        inputs: [{ name: 'In', type: 'flow' }],
        outputs: [],
        params: {}
      });

      let curY = 60;
      for (const layer of this.doc.layers) {
        for (const sprite of layer.sprites) {
          const spNodeId = 'sp_' + sprite.id;
          const spPos = existingPositions.get(spNodeId) || { x: 80, y: curY };
          this.nodes.push({
            id: spNodeId,
            category: 'output',
            type: 'output_sprite',
            spriteId: sprite.id,
            title: sprite.name,
            badge: 'SPRITE',
            x: spPos.x, y: spPos.y,
            inputs: [],
            outputs: [
              { name: 'Transform', type: 'vector' },
              { name: 'Visual', type: 'color' },
              { name: 'Flow', type: 'flow' }
            ],
            params: {}
          });

          let modX = 380;
          let prevModNodeId = spNodeId;
          for (const mod of (sprite.modules || [])) {
            const mNodeId = 'node_' + mod.id;
            const mPos = existingPositions.get(mNodeId) || { x: modX, y: curY };
            const def = MODULE_REGISTRY[mod.type] || {};
            const cat = def.category || 'motion';
            this.nodes.push({
              id: mNodeId,
              category: cat,
              type: mod.type,
              modId: mod.id,
              spriteId: sprite.id,
              title: mod.name,
              badge: def.icon || 'MOD',
              x: mPos.x, y: mPos.y,
              inputs: [
                { name: 'In', type: 'flow' },
                { name: 'Value', type: 'float' }
              ],
              outputs: [
                { name: 'Out', type: 'flow' },
                { name: 'Transform', type: 'vector' }
              ],
              params: mod.params || {}
            });

            newWires.push({
              id: 'w_' + Math.random().toString(36).substr(2, 7),
              fromNode: prevModNodeId, fromPort: 'Flow',
              toNode: mNodeId, toPort: 'In'
            });
            prevModNodeId = mNodeId;
            modX += 280;
          }

          if (prevModNodeId !== spNodeId) {
            newWires.push({
              id: 'w_' + Math.random().toString(36).substr(2, 7),
              fromNode: prevModNodeId, fromPort: 'Out',
              toNode: 'output_master', toPort: 'In'
            });
          }

          curY += 200;
        }
      }

      // Keep existing manual wires if valid, otherwise seed newWires
      if (this.wires.length === 0) {
        this.wires = newWires;
      } else {
        const validNodeIds = new Set(this.nodes.map(n => n.id));
        this.wires = this.wires.filter(w => validNodeIds.has(w.fromNode) && validNodeIds.has(w.toNode));
        for (const nw of newWires) {
          if (!this.wires.some(w => w.toNode === nw.toNode)) {
            this.wires.push(nw);
          }
        }
      }
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

    render() {
      const area = this.container.querySelector('#nodeGraphArea');
      const nodesLayer = this.container.querySelector('#nodesLayer');
      if (!area || !nodesLayer) return;

      this.updateTransform();

      const activeMods = this.getActiveModuleIds();

      nodesLayer.innerHTML = this.nodes.map(n => {
        const isActive = n.type === 'output_master' || (n.modId && activeMods.has(n.modId));
        const catClass = 'cat-' + (n.category || 'motion');

        return `
          <div class="graph-node ${catClass} ${n.type === 'output_master' ? 'node-output' : ''} ${n.id === this.doc.selectedNodeId ? 'selected' : ''}" id="${n.id}" style="left:${n.x}px; top:${n.y}px;">
            <div class="graph-node-header">
              <span class="graph-node-title">
                <span class="graph-node-badge">${n.badge}</span>
                ${n.title}
              </span>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:9px;font-weight:700;color:${isActive ? '#22c55e' : '#71717a'};">${isActive ? '● ON' : '○ OFF'}</span>
                ${n.type !== 'output_master' && n.type !== 'output_sprite' ? `<button class="graph-node-close" data-act="del-node" data-node-id="${n.id}">✕</button>` : ''}
              </div>
            </div>
            
            <div class="graph-node-body">
              <div class="graph-ports-col graph-inputs">
                ${(n.inputs || []).map(p => `
                  <div class="graph-port-row">
                    <div class="graph-port graph-port-input port-${p.type || 'flow'}" data-node="${n.id}" data-port="${p.name}" data-type="${p.type || 'flow'}" title="${p.name} (${p.type || 'flow'})"></div>
                    <span class="graph-port-label">${p.name}</span>
                  </div>
                `).join('')}
              </div>

              <div class="graph-ports-col graph-outputs">
                ${(n.outputs || []).map(p => `
                  <div class="graph-port-row" style="justify-content:flex-end;">
                    <span class="graph-port-label">${p.name}</span>
                    <div class="graph-port graph-port-output port-${p.type || 'flow'}" data-node="${n.id}" data-port="${p.name}" data-type="${p.type || 'flow'}" title="${p.name} (${p.type || 'flow'})"></div>
                  </div>
                `).join('')}
              </div>
            </div>

            <!-- Inline Blender-like On-Node Controls -->
            <div class="graph-node-controls">
              ${this.renderNodeInlineControls(n)}
            </div>
          </div>
        `;
      }).join('');

      this.renderWires();
    }

    renderNodeInlineControls(n) {
      if (n.category === 'logic' || n.type === 'math_op') {
        return `
          <div class="node-inline-control">
            <span class="node-inline-label">값 A:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="valA" value="${n.params.valA || 0}">
          </div>
          <div class="node-inline-control">
            <span class="node-inline-label">값 B:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="valB" value="${n.params.valB || 1}">
          </div>
        `;
      }
      if (n.category === 'color' || n.type === 'color_val') {
        return `
          <div class="node-inline-control">
            <span class="node-inline-label">색상:</span>
            <input type="color" class="node-inline-color" data-node-ctrl="color" value="${n.params.color || '#38bdf8'}">
          </div>
          <div class="node-inline-control">
            <span class="node-inline-label">투명도:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="alpha" step="0.1" min="0" max="1" value="${n.params.alpha !== undefined ? n.params.alpha : 1}">
          </div>
        `;
      }
      if (n.category === 'motion' || n.type === 'motion_pos') {
        return `
          <div class="node-inline-control">
            <span class="node-inline-label">속도:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="speed" step="0.1" value="${n.params.speed || 1}">
          </div>
          <div class="node-inline-control">
            <span class="node-inline-label">스무딩:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="smooth" step="0.05" min="0" max="1" value="${n.params.smooth || 0.15}">
          </div>
        `;
      }
      return '';
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

        // Render in local node space (0 to width) because SVG has identical CSS transform
        const x1 = fromN.x + 220;
        const y1 = fromN.y + 45;
        const x2 = toN.x;
        const y2 = toN.y + 45;

        const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
        const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;
        const isAct = toN.id === 'output_master' || (toN.modId && activeMods.has(toN.modId));

        paths += `<path id="wire_${w.id}" d="${d}" class="graph-wire ${isAct ? 'wire-active' : ''}" data-wire-id="${w.id}" data-from="${w.fromNode}" data-to="${w.toNode}" title="클릭하여 연결 끊기" />`;
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
        const toN = this.nodes.find(n => n.id === w.toNode);
        if (!toN) return;
        const x1 = node.x + 220, y1 = node.y + 45;
        const x2 = toN.x, y2 = toN.y + 45;
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
        pathEl.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      });

      svg.querySelectorAll(`.graph-wire[data-to="${nodeId}"]`).forEach(pathEl => {
        const wId = pathEl.dataset.wireId;
        const w = this.wires.find(wire => wire.id === wId);
        if (!w) return;
        const fromN = this.nodes.find(n => n.id === w.fromNode);
        if (!fromN) return;
        const x1 = fromN.x + 220, y1 = fromN.y + 45;
        const x2 = node.x, y2 = node.y + 45;
        const dx = Math.max(40, Math.abs(x2 - x1) * 0.5);
        pathEl.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
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
        temp.style.stroke = '#fbbf24';
        temp.style.strokeDasharray = '4,4';
        temp.style.strokeWidth = '2.5';
        svg.appendChild(temp);
      }
      const dx = Math.max(30, Math.abs(curX - startX) * 0.5);
      temp.setAttribute('d', `M ${startX} ${startY} C ${startX + dx} ${startY}, ${curX - dx} ${curY}, ${curX} ${curY}`);
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
      this.sound.play('pop');
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
      this.container.querySelector('#btnNodeAddMenu')?.addEventListener('click', e => {
        const r = area.getBoundingClientRect();
        this.showSearchMenu(r.width / 2 - 130, r.height / 2 - 150);
      });

      // Auto Layout
      this.container.querySelector('#btnNodeAutoLayout')?.addEventListener('click', () => {
        this.syncFromDoc();
        this.render();
      });

      // Knife Cut Mode Toggle Button Info
      this.container.querySelector('#btnNodeCutKnife')?.addEventListener('click', () => {
        alert('나이프 자르기 사용법: Ctrl 키를 누른 상태에서 우클릭 드래그로 전선을 자릅니다.');
      });

      // Single-point delegation for clicking wires to sever
      svg.addEventListener('click', e => {
        const wireEl = e.target.closest('.graph-wire[data-wire-id]');
        if (wireEl) {
          const wId = wireEl.dataset.wireId;
          this.wires = this.wires.filter(w => w.id !== wId);
          this.sound.play('cut');
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
              startX = fromN ? fromN.x + 220 : 0;
              startY = fromN ? fromN.y + 45 : 0;
              this.sound.play('pop');
              this.renderWires();
            } else {
              return; // Input port with no wire cannot drag out
            }
          } else {
            const fromN = this.nodes.find(n => n.id === nId);
            startX = fromN ? fromN.x + 220 : 0;
            startY = fromN ? fromN.y + 45 : 0;
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
              this.sound.play('coin');
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
          
          // Fast selection class update without innerHTML
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

      // Canvas Panning & Knife Cutting on area
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
              knifeSvg.innerHTML = `<line x1="${p1.x}" y1="${p1.y}" x2="${p2.x}" y2="${p2.y}" class="node-knife-line" />`;
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

      // Pan mousemove: Only update transform (0ms CPU, 60fps)
      window.addEventListener('mousemove', e => {
        if (this.isPanning) {
          this.pan.x = e.clientX - this.panStart.x;
          this.pan.y = e.clientY - this.panStart.y;
          this.updateTransform();
        }
      });

      window.addEventListener('mouseup', () => { this.isPanning = false; });

      // Canvas Zooming: Only update transform (0ms CPU, 60fps)
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
          this.showSearchMenu(r.width / 2 - 130, r.height / 2 - 150);
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

        const x1 = fromN.x + 220;
        const y1 = fromN.y + 45;
        const x2 = toN.x;
        const y2 = toN.y + 45;

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
        this.sound.play('cut');
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

      menu.style.left = `${Math.max(10, x)}px`;
      menu.style.top = `${Math.max(10, y)}px`;
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
        // 1. Input / Sensor
        { cat: 'input', name: '마우스 위치 감지', icon: 'POS', type: 'mouse_pos', in: [], out: [{ name: 'Vector', type: 'vector' }, { name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '클릭 & 제스처', icon: 'TRG', type: 'click_sensor', in: [], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '호버 & 근접 감지', icon: 'ZONE', type: 'hover_sensor', in: [], out: [{ name: 'Distance', type: 'float' }, { name: 'Flow', type: 'flow' }] },
        { cat: 'input', name: '자유 드래그 감지', icon: 'DRG', type: 'drag_sensor', in: [], out: [{ name: 'Position', type: 'vector' }] },
        { cat: 'input', name: '스크롤 휠 감지', icon: 'WHL', type: 'wheel_sensor', in: [], out: [{ name: 'Delta', type: 'float' }] },
        { cat: 'input', name: '타이머 / 펄스 틱', icon: 'CLK', type: 'time_tick', in: [], out: [{ name: 'Time', type: 'float' }] },

        // 2. Color & Visual
        { cat: 'color', name: 'RGB 색상 지정', icon: 'RGB', type: 'color_val', in: [], out: [{ name: 'Color', type: 'color' }] },
        { cat: 'color', name: '베벨 & 라운딩 FX', icon: 'BVL', type: 'bevel_fx', in: [{ name: 'Radius', type: 'float' }], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'color', name: '그림자 효과 (Shadow)', icon: 'SHD', type: 'shadow_fx', in: [{ name: 'Color', type: 'color' }], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'color', name: '투명도 조절 (Opacity)', icon: 'ALP', type: 'opacity_fx', in: [{ name: 'Alpha', type: 'float' }], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'color', name: '외곽선 스트로크', icon: 'STR', type: 'stroke_fx', in: [{ name: 'Color', type: 'color' }, { name: 'Width', type: 'float' }], out: [{ name: 'Flow', type: 'flow' }] },

        // 3. Motion & Physics
        { cat: 'motion', name: '위치 이동 (Position)', icon: 'MOV', type: 'motion_pos', in: [{ name: 'Vector', type: 'vector' }], out: [{ name: 'Transform', type: 'vector' }] },
        { cat: 'motion', name: '회전 모션 (Rotation)', icon: 'ROT', type: 'motion_rot', in: [{ name: 'Angle', type: 'float' }], out: [{ name: 'Angle', type: 'float' }] },
        { cat: 'motion', name: '크기 스케일 (Scale)', icon: 'SCL', type: 'motion_scale', in: [{ name: 'Scale', type: 'float' }], out: [{ name: 'Scale', type: 'float' }] },
        { cat: 'motion', name: '물리 중력 (Gravity)', icon: 'GRV', type: 'physics_gravity', in: [{ name: 'Weight', type: 'float' }], out: [{ name: 'Transform', type: 'vector' }] },
        { cat: 'motion', name: '스프링 댐핑 (Spring)', icon: 'SPG', type: 'spring_damp', in: [{ name: 'Target', type: 'vector' }], out: [{ name: 'Position', type: 'vector' }] },
        { cat: 'motion', name: '궤도 공전 (Orbit)', icon: 'ORB', type: 'orbit_rot', in: [{ name: 'Speed', type: 'float' }], out: [{ name: 'Position', type: 'vector' }] },

        // 4. Logic & Math
        { cat: 'logic', name: '수학 연산 (Math)', icon: 'MTH', type: 'math_op', in: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }], out: [{ name: 'Value', type: 'float' }] },
        { cat: 'logic', name: '비교 연산 (Compare)', icon: 'CMP', type: 'compare_op', in: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }], out: [{ name: 'Flow', type: 'flow' }] },
        { cat: 'logic', name: '실수 값 상수 (Float)', icon: 'NUM', type: 'float_val', in: [], out: [{ name: 'Value', type: 'float' }] },
        { cat: 'logic', name: '2D 벡터 (Vector2)', icon: 'VEC', type: 'vector2_val', in: [{ name: 'X', type: 'float' }, { name: 'Y', type: 'float' }], out: [{ name: 'Vector', type: 'vector' }] },
        { cat: 'logic', name: '조건 스위치 (Switch)', icon: 'SWT', type: 'switch_cond', in: [{ name: 'True', type: 'flow' }, { name: 'False', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },

        // 5. Combine & Mix
        { cat: 'combine', name: '모듈 합치기 (Mix)', icon: 'MRG', type: 'combine_mix', in: [{ name: 'In A', type: 'flow' }, { name: 'In B', type: 'flow' }], out: [{ name: 'Out', type: 'flow' }] },
        { cat: 'combine', name: '보간 블렌드 (Lerp)', icon: 'LRP', type: 'lerp_blend', in: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }, { name: 'Factor', type: 'float' }], out: [{ name: 'Value', type: 'float' }] },

        // 6. Output
        { cat: 'output', name: '스프라이트 최종 출력', icon: 'OUT', type: 'output_sprite', in: [{ name: 'Transform', type: 'vector' }, { name: 'Visual', type: 'color' }, { name: 'Flow', type: 'flow' }], out: [] }
      ];

      this.filterSearchMenu = (query) => {
        const q = query.trim().toLowerCase();
        const filtered = NODE_PRESETS.filter(p => !q || p.name.toLowerCase().includes(q) || p.cat.toLowerCase().includes(q));

        const cats = {
          input: '입력 / 센서 (Input & Sensor)',
          color: '시각 / 색상 (Color & Visual)',
          motion: '모션 / 물리 (Motion & Physics)',
          logic: '로직 / 연산 (Logic & Math)',
          combine: '합성 / 믹스 (Mix & Combine)',
          output: '출력 (Output)'
        };

        let html = '';
        Object.keys(cats).forEach(catKey => {
          const items = filtered.filter(p => p.cat === catKey);
          if (items.length > 0) {
            html += `<div class="nsm-cat-title">${cats[catKey]}</div>`;
            items.forEach((item, idx) => {
              html += `
                <div class="nsm-item ${idx === 0 && q ? 'highlighted' : ''}" data-type="${item.type}">
                  <span>${item.name}</span>
                  <span style="font-size:9px;color:#71717a;">${item.icon}</span>
                </div>
              `;
            });
          }
        });

        body.innerHTML = html || '<div style="padding:10px;font-size:11px;color:#71717a;text-align:center;">일치하는 노드가 없습니다</div>';

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

      // Close menu when clicking outside
      window.addEventListener('mousedown', e => {
        if (!e.target.closest('#nodeSearchMenu') && !e.target.closest('#btnNodeAddMenu')) {
          menu.classList.add('hidden');
        }
      });
    }

    createNodeFromPreset(p) {
      const nId = 'node_' + Math.random().toString(36).substr(2, 7);
      const spawnX = Math.round((-this.pan.x + 300) / this.zoom);
      const spawnY = Math.round((-this.pan.y + 200) / this.zoom);

      // Create functional module on selected sprite if available
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

      // Automatically wire to output master if possible
      if (this.nodes.some(n => n.id === 'output_master')) {
        this.wires.push({
          id: 'w_' + Math.random().toString(36).substr(2, 7),
          fromNode: nId,
          fromPort: (p.out && p.out[0]) ? p.out[0].name : 'Flow',
          toNode: 'output_master',
          toPort: 'In'
        });
      }

      this.sound.play('coin');
      this.render();
      this.cb.onUpdate();
    }
  }
  class SettingsModalUI {
    constructor(pluginManager) {
      this.pm = pluginManager;
      this.el = document.createElement('div');
      this.el.className = 'modal-overlay hidden';
      this.activeTab = 'shortcuts';
      this.render();
      document.body.appendChild(this.el);
    }

    show(tab = 'shortcuts') {
      this.activeTab = tab;
      this.render();
      this.el.classList.remove('hidden');
    }

    hide() {
      this.el.classList.add('hidden');
    }

    render() {
      this.el.innerHTML = `
        <div class="modal-card" style="max-width:680px;height:520px;">
          <div class="modal-header">
            <div class="modal-title-group">
              <span class="modal-icon" style="font-size:12px;font-weight:700;color:#38bdf8;">⚙</span>
              <div>
                <h2 class="modal-title">환경 설정 (Settings)</h2>
                <p class="modal-desc">단축키 구성 확인 및 오픈소스 커스텀 플러그인을 설치/관리합니다.</p>
              </div>
            </div>
            <button class="modal-close-btn" id="sClose">✕</button>
          </div>

          <div class="settings-tabs">
            <button class="settings-tab ${this.activeTab==='shortcuts'?'active':''}" id="tabShortcuts">단축키 안내 (Shortcuts)</button>
            <button class="settings-tab ${this.activeTab==='plugins'?'active':''}" id="tabPlugins">플러그인 관리 (Plugins)</button>
          </div>

          <div class="settings-panel">
            ${this.activeTab === 'shortcuts' ? this.renderShortcutsTab() : this.renderPluginsTab()}
          </div>
        </div>
      `;

      this.el.querySelector('#sClose').addEventListener('click', () => this.hide());
      this.el.addEventListener('click', e => { if (e.target === this.el) this.hide(); });

      this.el.querySelector('#tabShortcuts').addEventListener('click', () => { this.activeTab = 'shortcuts'; this.render(); });
      this.el.querySelector('#tabPlugins').addEventListener('click', () => { this.activeTab = 'plugins'; this.render(); });

      if (this.activeTab === 'plugins') {
        this.el.querySelector('#btnInstallPlugin')?.addEventListener('click', () => {
          const code = this.el.querySelector('#txtPluginCode').value;
          if (this.pm.loadFromCode(code)) {
            alert('오픈소스 플러그인이 성공적으로 등록되었습니다!');
            this.render();
          }
        });
      }
    }

    renderShortcutsTab() {
      const SHORTCUTS = [
        { key: 'Ctrl + Space', desc: '실시간 모듈 미리보기 즉시 토글' },
        { key: 'Shift + Tab', desc: '모듈 노드 모드 / 스튜디오 모드 전환' },
        { key: 'Ctrl + A', desc: '전체 스프라이트/레이어 선택' },
        { key: 'F2', desc: '선택 레이어 및 스프라이트 이름 변경' },
        { key: 'Ctrl + E', desc: '순수 자바스크립트 및 HTML 내보내기' },
        { key: 'Ctrl + S', desc: '프로젝트 파일(.jspen) 저장' },
        { key: 'Ctrl + O', desc: '프로젝트 파일(.jspen) 열기' },
        { key: 'Ctrl + Z / Y', desc: '실행 취소 / 다시 실행' },
        { key: 'V / A', desc: '이동 도구 / 직접 선택 도구' },
        { key: 'C / P / B', desc: '베지어 곡선 / 펜 / 브러시 도구' },
        { key: 'U / T / I', desc: '도형 / 문자 / 스포이드 도구' },
        { key: 'Space', desc: '손 도구 (Pan 뷰포트 이동)' },
        { key: 'Z (우클릭 / Alt)', desc: '돋보기 (우클릭: 축소, Alt클릭: 100% 초기화)' }
      ];

      return `
        <table class="shortcuts-table">
          <thead>
            <tr><th style="width:180px;">단축키</th><th>설명</th></tr>
          </thead>
          <tbody>
            ${SHORTCUTS.map(s => `
              <tr>
                <td><span class="shortcut-key-badge">${s.key}</span></td>
                <td>${s.desc}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    }

    renderPluginsTab() {
      return `
        <div style="font-size:11.5px;color:#a1a1aa;">
          JSPen Studio는 오픈소스 생태계를 위해 <code style="color:#38bdf8;">window.JSPen.registerPlugin</code> API를 지원합니다.<br>
          커스텀 모듈 및 도구를 누구나 5줄의 자바스크립트로 제작하여 추가할 수 있습니다.
        </div>

        <div style="font-weight:700;color:#fff;font-size:12px;margin-top:4px;">설치된 플러그인 목록:</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${this.pm.plugins.map(p => `
            <div class="plugin-card">
              <div class="plugin-info">
                <span class="plugin-name">${p.name} <span style="font-size:10px;color:#71717a;">v${p.version||'1.0'}</span></span>
                <span class="plugin-desc">${p.description||'커스텀 확장 플러그인'} (작성자: ${p.author||'Community'})</span>
              </div>
              <span style="font-size:11px;color:#22c55e;font-weight:700;">● 활성화됨</span>
            </div>
          `).join('')}
        </div>

        <div style="font-weight:700;color:#fff;font-size:12px;margin-top:10px;">새 오픈소스 플러그인 코드 추가:</div>
        <textarea class="plugin-code-area" id="txtPluginCode" placeholder="JSPen.registerPlugin({\n  id: 'custom_glow',\n  name: '네온 글로우 모듈',\n  init(api) { ... }\n});"></textarea>
        <button class="btn btn-primary btn-sm" id="btnInstallPlugin">+ 플러그인 등록 및 적용</button>
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
        alert('플러그인 실행 오류:\n' + e.message);
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
              <span class="modal-icon" style="font-size:12px;font-weight:700;color:#38bdf8;">&lt;/&gt;</span>
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
        const b = new Blob([PhotoshopJSExporter.generateHTML(this.doc)], { type: 'text/html' });
        const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = 'index.html'; a.click();
      });
      this.el.querySelector('#btnRun')?.addEventListener('click', () => {
        const win = window.open();
        win.document.write(PhotoshopJSExporter.generateHTML(this.doc));
        win.document.close();
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
  // 19. Main Application Controller (Decoupled Loop, Anti-Lag, Snap Docking)
  // ==========================================================================
  class App {
    constructor() {
      this.canvas = document.getElementById('viewportCanvas');
      this.doc = new DocumentModel();
      this.renderer = new PhotoshopCanvas(this.canvas, this.doc);
      this.moduleEngine = new ModuleEngine(this.doc);
      this.pluginManager = new PluginManager();
      this.isNodeMode = false;
      this.floatingPanels = new Set();

      // Setup Tools with Decoupled Canvas Repaint vs History Commit
      this.tools = new DrawingTools(
        this.renderer,
        this.doc,
        () => this.renderCanvas(),
        () => this.refreshUI()
      );
      this.transformBox = new TransformBox(
        this.doc,
        () => this.renderCanvas(),
        () => this.refreshUI()
      );

      // Setup UI Panels
      this.toolbox = new ToolboxUI(document.getElementById('leftToolbox'), this.tools, () => this.refreshUI());
      this.optionBar = new ToolOptionBarUI(document.getElementById('toolOptionBar'), this.tools, () => this.refreshUI());
      this.layersUI = new LayersPanelUI(document.getElementById('layersContainer'), this.doc, {
        onUpdate: () => this.refreshUI(),
        onToggleFloat: id => this.toggleFloatPanel(id)
      });
      this.inspector = new InspectorPanelUI(document.getElementById('inspectorContainer'), this.doc, {
        onCanvasRender: () => this.renderCanvas(),
        onUpdate: () => this.refreshUI(),
        onToggleFloat: id => this.toggleFloatPanel(id)
      });
      this.timeline = new TimelineUI(document.getElementById('bottomTimeline'), this.doc, {
        onSeek: () => this.renderCanvas(),
        onTogglePreview: () => this.togglePreview(),
        onToggleFloat: id => this.toggleFloatPanel(id),
        get isPreview() { return window.jspenApp?.renderer.mode === 'preview'; }
      });
      this.menuBar = new MenuBarUI(document.getElementById('topMenuBar'), this.doc, {
        onExport: () => this.exportModal.show(),
        onOpenSettings: () => this.settingsModal.show(),
        onToggleNodeMode: () => this.toggleNodeMode(),
        onResetLayout: () => this.resetLayout(),
        onUpdate: () => this.refreshUI(),
        get isNodeMode() { return window.jspenApp?.isNodeMode; }
      });

      // Modals & Node Editor
      this.exportModal = new ExportModalUI(this.doc);
      this.settingsModal = new SettingsModalUI(this.pluginManager);
      this.nodeEditor = new NodeEditorUI(document.getElementById('nodeEditorContainer'), this.doc, {
        onUpdate: () => {
          this.moduleEngine.activeModuleIds = this.nodeEditor.getActiveModuleIds();
          this.renderCanvas();
        },
        onToggleNodeMode: () => this.toggleNodeMode()
      });

      this.handleResize();
      this.initEvents();
      this.initSplitters();
      this.initPanelSnapping();
      this.startLoop();
    }

    togglePreview() {
      const isPrev = this.renderer.mode === 'preview';
      this.renderer.mode = isPrev ? 'edit' : 'preview';
      if (this.renderer.mode === 'preview') {
        this.moduleEngine.start();
      } else {
        this.moduleEngine.stop();
      }
      this.renderCanvas();
    }

    toggleNodeMode() {
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
    }

    toggleFloatPanel(panelName) {
      const idMap = {
        inspector: '#inspectorContainer',
        layers: '#layersContainer',
        timeline: '#bottomTimeline',
        toolbox: '#leftToolbox'
      };
      const el = document.querySelector(idMap[panelName]);
      if (!el) return;

      const isFloat = this.floatingPanels.has(panelName);
      if (isFloat) {
        this.dockPanel(panelName);
      } else {
        this.floatPanel(panelName, 220, 100);
      }
    }

    floatPanel(panelName, x = 200, y = 100) {
      const idMap = {
        inspector: '#inspectorContainer',
        layers: '#layersContainer',
        timeline: '#bottomTimeline',
        toolbox: '#leftToolbox'
      };
      const el = document.querySelector(idMap[panelName]);
      if (!el) return;

      this.floatingPanels.add(panelName);
      el.classList.add('is-floating');
      el.style.left = `${x}px`;
      el.style.top = `${y}px`;
      if (panelName === 'inspector') { el.style.width = '300px'; el.style.height = '420px'; }
      else if (panelName === 'layers') { el.style.width = '300px'; el.style.height = '420px'; }
      else if (panelName === 'timeline') { el.style.width = '700px'; el.style.height = '240px'; }
      else if (panelName === 'toolbox') { el.style.width = '50px'; el.style.height = '480px'; }
      this.handleResize();
    }

    dockPanel(panelName, zone = null) {
      const idMap = {
        inspector: '#inspectorContainer',
        layers: '#layersContainer',
        timeline: '#bottomTimeline',
        toolbox: '#leftToolbox'
      };
      const el = document.querySelector(idMap[panelName]);
      if (!el) return;

      this.floatingPanels.delete(panelName);
      el.classList.remove('is-floating');
      el.style.left = '';
      el.style.top = '';
      el.style.width = '';
      el.style.height = '';
      this.handleResize();
    }

    resetLayout() {
      ['inspector', 'layers', 'timeline', 'toolbox'].forEach(p => this.dockPanel(p));
      const rightDock = document.getElementById('rightDock');
      if (rightDock) rightDock.style.width = '280px';
      const inspSec = document.getElementById('inspectorContainer');
      if (inspSec) { inspSec.style.height = ''; inspSec.style.flex = '1'; }
      const tl = document.getElementById('bottomTimeline');
      if (tl) tl.style.height = '180px';
      this.handleResize();
      this.refreshUI();
    }

    initPanelSnapping() {
      const overlay = document.getElementById('snapZoneOverlay');
      if (!overlay) return;

      const panelSelectors = [
        { name: 'inspector', selector: '#inspectorContainer', header: '#inspectorContainer .ps-dock-header' },
        { name: 'layers', selector: '#layersContainer', header: '#layersContainer .ps-dock-header' },
        { name: 'timeline', selector: '#bottomTimeline', header: '#bottomTimeline .timeline-header' },
        { name: 'toolbox', selector: '#leftToolbox', header: '#leftToolbox' }
      ];

      panelSelectors.forEach(({ name, selector, header }) => {
        const headerEl = document.querySelector(header);
        const panelEl = document.querySelector(selector);
        if (!headerEl || !panelEl) return;

        headerEl.addEventListener('mousedown', e => {
          if (e.target.closest('button, input, select, .ps-win-btn')) return;
          e.preventDefault();

          const startX = e.clientX;
          const startY = e.clientY;
          let isDragging = false;
          let grabOffsetX = 100, grabOffsetY = 15;

          const onMove = ev => {
            const dx = ev.clientX - startX;
            const dy = ev.clientY - startY;

            if (!isDragging && (Math.hypot(dx, dy) > 6)) {
              isDragging = true;
              if (!this.floatingPanels.has(name)) {
                this.floatPanel(name, ev.clientX - grabOffsetX, ev.clientY - grabOffsetY);
              }
              overlay.classList.remove('hidden');
            }

            if (isDragging) {
              panelEl.style.left = `${ev.clientX - grabOffsetX}px`;
              panelEl.style.top = `${ev.clientY - grabOffsetY}px`;

              // Check snap zones
              overlay.querySelectorAll('.snap-indicator').forEach(ind => {
                const r = ind.getBoundingClientRect();
                const inside = ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
                ind.classList.toggle('active', inside);
              });
            }
          };

          const onUp = ev => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);

            if (isDragging) {
              overlay.classList.add('hidden');
              const activeZone = overlay.querySelector('.snap-indicator.active');
              if (activeZone) {
                const z = activeZone.dataset.zone;
                activeZone.classList.remove('active');
                this.dockPanel(name, z);
              }
              this.handleResize();
            }
          };

          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      });
    }

    renderCanvas() {
      this.renderer.render(
        this.tools.activeTool,
        this.transformBox,
        this.tools.activePenPoints,
        this.tools.activeGradientDrag,
        this.tools.activeCurvePoints,
        this.tools.shapeDragStart,
        this.tools.shapeDragCurrent
      );
      if (this.timeline) this.timeline.updatePlayheadPosition();
    }

    refreshUI() {
      this.renderCanvas();
      this.layersUI.render();
      this.inspector.render();
      this.timeline.renderTracks();
      this.timeline.renderCanvases();
      this.optionBar.render();
      this.toolbox.render();
    }

    handleResize() {
      const p = this.canvas.parentElement;
      if (!p) return;
      this.canvas.width = p.clientWidth;
      this.canvas.height = p.clientHeight;
      this.renderer.centerArtboard();
      this.renderCanvas();
    }

    initSplitters() {
      const splitH = document.getElementById('dockSplitterH');
      const rightDock = document.getElementById('rightDock');
      if (splitH && rightDock) {
        splitH.addEventListener('mousedown', e => {
          e.preventDefault();
          const startX = e.clientX;
          const startW = rightDock.offsetWidth;
          splitH.classList.add('dragging');

          const onMove = ev => {
            const newW = Math.max(220, Math.min(600, startW - (ev.clientX - startX)));
            rightDock.style.width = `${newW}px`;
            this.handleResize();
          };
          const onUp = () => {
            splitH.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      }

      const splitV = document.getElementById('dockSplitterV');
      const inspSec = document.getElementById('inspectorContainer');
      if (splitV && inspSec) {
        splitV.addEventListener('mousedown', e => {
          e.preventDefault();
          const startY = e.clientY;
          const startH = inspSec.offsetHeight;
          splitV.classList.add('dragging');

          const onMove = ev => {
            const newH = Math.max(120, Math.min(800, startH + (ev.clientY - startY)));
            inspSec.style.height = `${newH}px`;
            inspSec.style.flex = 'none';
          };
          const onUp = () => {
            splitV.classList.remove('dragging');
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
          };
          window.addEventListener('mousemove', onMove);
          window.addEventListener('mouseup', onUp);
        });
      }
    }

    initEvents() {
      let isPanning = false, panStart = { x: 0, y: 0 }, initPan = { x: 0, y: 0 };
      let ms = { x: 0, y: 0 }, mw = { x: 0, y: 0 }, isDown = false;
      const loupe = document.getElementById('eyedropperLoupe');
      const loupeSwatch = document.getElementById('loupeSwatch');
      const loupeHex = document.getElementById('loupeHex');

      window.addEventListener('resize', () => this.handleResize());

      // 1. BLOCK BROWSER PAGE ZOOM ON CTRL + MOUSE WHEEL
      window.addEventListener('wheel', e => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      }, { passive: false });

      // BLOCK BROWSER PAGE ZOOM ON CTRL + '+', '-', '=', '0'
      window.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0')) {
          e.preventDefault();
        }
      });

      // Canvas Mouse Handling
      this.canvas.addEventListener('mousedown', e => {
        const r = this.canvas.getBoundingClientRect();
        ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        mw = this.renderer.screenToWorld(ms.x, ms.y);
        isDown = true;

        if (this.renderer.mode === 'preview') return;

        if (this.tools.activeTool === 'hand' || e.spaceKey || e.button === 1) {
          isPanning = true;
          panStart = { x: e.clientX, y: e.clientY };
          initPan = { x: this.renderer.panX, y: this.renderer.panY };
          return;
        }

        if (this.tools.activeTool === 'move') {
          const hit = this.transformBox.hitTest(mw.x, mw.y, this.transformBox.getTarget());
          if (hit) {
            this.transformBox.startDrag(hit, mw.x, mw.y);
            return;
          }

          const clickedSprite = this.doc.hitTestSprite(mw.x, mw.y);
          if (clickedSprite) {
            const ownerLayer = this.doc.layers.find(l => l.sprites.some(s => s.id === clickedSprite.id));
            if (ownerLayer) this.doc.selectedLayerId = ownerLayer.id;
            this.doc.selectedSpriteId = clickedSprite.id;
            this.doc.selectedModuleId = null;
            this.refreshUI();
            this.transformBox.startDrag('body', mw.x, mw.y);
            return;
          }
        }

        this.tools.handleMouseDown(mw.x, mw.y, e);
      });

      window.addEventListener('mousemove', e => {
        const r = this.canvas.getBoundingClientRect();
        ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        mw = this.renderer.screenToWorld(ms.x, ms.y);

        if (this.renderer.mode === 'preview') {
          const m = this.moduleEngine.bus.mouse;
          m.x = mw.x; m.y = mw.y; m.rawX = ms.x; m.rawY = ms.y;
          return;
        }

        // Eyedropper Live Loupe Swatch
        if (this.tools.activeTool === 'eyedropper' && loupe) {
          loupe.classList.remove('hidden');
          loupe.style.left = `${e.clientX + 16}px`;
          loupe.style.top = `${e.clientY + 16}px`;
          const hex = this.renderer.samplePixelColor(ms.x, ms.y);
          if (loupeSwatch) loupeSwatch.style.background = hex;
          if (loupeHex) loupeHex.textContent = hex;
        } else if (loupe && !loupe.classList.contains('hidden')) {
          loupe.classList.add('hidden');
        }

        if (isPanning) {
          this.renderer.panX = initPan.x + (e.clientX - panStart.x);
          this.renderer.panY = initPan.y + (e.clientY - panStart.y);
          this.renderCanvas();
          return;
        }

        if (this.transformBox.mode) {
          this.transformBox.drag(mw.x, mw.y, e.shiftKey, e.altKey);
          return;
        }

        if (isDown) {
          this.tools.handleMouseMove(mw.x, mw.y, e);
        }
      });

      window.addEventListener('mouseup', e => {
        isDown = false;
        if (this.renderer.mode === 'preview') return;
        if (isPanning) isPanning = false;
        if (this.transformBox.mode) {
          this.transformBox.endDrag();
          return;
        }
        this.tools.handleMouseUp(mw.x, mw.y);
      });

      // Global Keydown Shortcuts
      window.addEventListener('keydown', e => {
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        // 1. Ctrl + Space: Instant Live Preview Toggle
        if (e.ctrlKey && e.code === 'Space') {
          e.preventDefault();
          this.togglePreview();
          return;
        }

        // 2. Shift + Tab: Toggle Module Node Mode
        if (e.shiftKey && e.key === 'Tab') {
          e.preventDefault();
          this.toggleNodeMode();
          return;
        }

        // 3. F2: Inline Rename
        if (e.key === 'F2') {
          e.preventDefault();
          this.layersUI.startRenameSelected();
          return;
        }

        // 4. Ctrl + A: Select All
        if ((e.ctrlKey || e.metaKey) && (e.key === 'a' || e.key === 'A') && !isInput) {
          e.preventDefault();
          this.doc.selectAll();
          this.refreshUI();
          return;
        }

        // 5. Ctrl + , : Settings
        if ((e.ctrlKey || e.metaKey) && e.key === ',') {
          e.preventDefault();
          this.settingsModal.show();
          return;
        }

        if (isInput) return;

        // Tool Hotkeys
        const k = e.key.toLowerCase();
        if (k === 'v') this.tools.setTool('move');
        else if (k === 'a') this.tools.setTool('direct');
        else if (k === 'c') this.tools.setTool('curve');
        else if (k === 'p') this.tools.setTool('pen');
        else if (k === 'b') this.tools.setTool('brush');
        else if (k === 'u') this.tools.setTool('shape');
        else if (k === 't') this.tools.setTool('text');
        else if (k === 'i') this.tools.setTool('eyedropper');
        else if (k === 'z') this.tools.setTool('zoom');
        else if (e.code === 'Space') this.tools.setTool('hand');
        else if (e.ctrlKey && k === 'e') { e.preventDefault(); this.exportModal.show(); }
        else if (e.ctrlKey && k === 's') { e.preventDefault(); document.title = 'cmd:save'; setTimeout(() => { document.title = 'JSPen Studio'; }, 100); }
        else if (e.ctrlKey && k === 'o') { e.preventDefault(); document.title = 'cmd:open'; setTimeout(() => { document.title = 'JSPen Studio'; }, 100); }
        else if (e.ctrlKey && k === 'z') { e.preventDefault(); if (this.doc.undo()) this.refreshUI(); }
        else if (e.ctrlKey && k === 'y') { e.preventDefault(); if (this.doc.redo()) this.refreshUI(); }
      });
    }

    startLoop() {
      let last = (typeof performance !== 'undefined' ? performance.now() : Date.now());
      let frameAcc = 0;

      const loop = (now) => {
        const dt = Math.min((now - last) / 1000, 0.1);
        last = now;

        // When Node Graph full screen mode is active, pause canvas rendering for zero CPU usage!
        if (this.isNodeMode) {
          requestAnimationFrame(loop);
          return;
        }

        if (this.doc.isPlaying) {
          frameAcc += dt;
          const frameInterval = 1 / this.doc.fps;
          while (frameAcc >= frameInterval) {
            frameAcc -= frameInterval;
            this.doc.stepFrame(1);
            if (this.timeline) this.timeline.updatePlayheadPosition();
            this.inspector.updateInputs(this.doc.getSelectedSprite());
          }
        }

        if (this.renderer.mode === 'preview') {
          const m = this.moduleEngine.bus.mouse;
          this.moduleEngine.update(dt, m, m, m.isDown, m.clicked);
          this.moduleEngine.bus.mouse.clicked = false;
        }

        this.renderer.render(
          this.tools.activeTool,
          this.transformBox,
          this.tools.activePenPoints,
          this.tools.activeGradientDrag,
          this.tools.activeCurvePoints,
          this.tools.shapeDragStart,
          this.tools.shapeDragCurrent
        );
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    }
  }

  // Expose key modules for Native Python Bridge & Extensibility
  window.PhotoshopJSExporter = PhotoshopJSExporter;
  window.DocumentModel = DocumentModel;
  window.Layer = Layer;
  window.Sprite = Sprite;
  window.MODULE_REGISTRY = MODULE_REGISTRY;

  window.addEventListener('DOMContentLoaded', () => {
    window.jspenApp = new App();
  });
})();
