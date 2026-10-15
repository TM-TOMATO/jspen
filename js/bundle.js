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
    constructor() {}
    init() {}
    play() {}
  }

  // ==========================================================================
  // 2. Module Registry (28 Builtin Modules + Timeline Keyframe + Nodes)
  // ==========================================================================
  const MODULE_REGISTRY = {
    // 0. Web & Hyperlink Modifier (Blender-Style Modifier Pipeline)
    hyperlink: {
      category: 'web', name: '하이퍼링크 (Hyperlink)', icon: 'LINK',
      description: '스프라이트에 클릭, 호버, 신호 수신 시 외부 웹 URL이나 내부 앵커(#id)로 이동하는 웹 네비게이션 모디파이어를 부여합니다.',
      defaultParams: {
        condition: 'always',
        url: 'https://example.com',
        target: '_blank', // '_blank' | '_self'
        trigger: 'click', // 'click' | 'hover' | 'signal' | 'viewport_enter'
        signalName: '',
        hoverEffect: 'lift', // 'none' | 'lift' | 'zoom' | 'glow' | 'fade' | 'bounce'
        anchorId: '',
        customClass: '',
        enabled: true,
        showInRender: true
      }
    },

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
      }
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
        outputProperty: 'x' // x, y, rotation, scaleX, scaleY, opacity, filter_blur, filter_brightness, filter_contrast, filter_opacity, filter_grayscale, filter_invert, filter_hueRotate
      }
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
      }
    },
    photoshop_filter: {
      category: 'motion', name: '포토샵 필터 FX', icon: 'FLTR',
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
      description: '입력 수치를 원하는 출력 범위로 비례 환산하여 속성이나 필터에 연결합니다.',
      defaultParams: { condition: 'always', inputSource: 'mouse_x', inMin: 0, inMax: 800, outMin: 0, outMax: 360, outputProperty: 'rotation' }
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
      }
    },
    toggle_switch: {
      category: 'logic', name: '토글 스위치', icon: 'TOG',
      description: '트리거 감지, 신호 수신 또는 클릭할 때마다 켜짐(ON)/꺼짐(OFF) 상태를 반전 전환하고 신호를 방출합니다.',
      defaultParams: { condition: 'always', inputSignal: '', initialValue: false }
    },
    counter_accumulator: {
      category: 'logic', name: '숫자 카운터', icon: 'CNT',
      description: '트리거 감지 또는 신호 발생 시마다 숫자를 증가시키고 텍스트/신호에 반영합니다.',
      defaultParams: { condition: 'always', inputSignal: '', startVal: 0, stepVal: 1, maxVal: 9999 }
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
      this.brushStrokePoints = options.brushStrokePoints || [];
      this.brushSize = options.brushSize || 6;

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
      this.linkGroup = options.linkGroup || null;
      this.tag = options.tag || 'div';
      this.linkUrl = options.linkUrl || '';
      this.linkTarget = options.linkTarget || '_blank'; // '_blank' | '_self'
      this.anchorId = options.anchorId || '';
      this.cssClass = options.cssClass || '';
      this.hoverEffect = options.hoverEffect || 'none';
      this.collapsed = options.collapsed || false;
      this.triggerEvent = options.triggerEvent || 'viewport_enter';
      this.triggerAction = options.triggerAction || 'trigger_module';
      this.targetSpriteId = options.targetSpriteId || '';
      this.targetModuleId = options.targetModuleId || '';
      this.signalName = options.signalName || '';
      this.filterEffect = options.filterEffect || 'blur';
      this.filterValue = options.filterValue !== undefined ? options.filterValue : 20;

      // Photoshop-style Mask & Clipping Mask support
      this.isMask = options.isMask || false;
      this.maskMode = options.maskMode || 'none'; // 'none' | 'clip_mask' | 'inverted_mask'
      this.maskTargetId = options.maskTargetId || null;

      this.filters = options.filters || {
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
        filters: JSON.parse(JSON.stringify(this.filters || {}))
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
      this.filters = options.filters || {
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
        const ldx = dx * cos + dy * sin;
        const ldy = -dx * sin + dy * cos;

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
              ctx.strokeStyle = '#38bdf8';
              ctx.lineWidth = 1 / this.zoom;
              ctx.setLineDash([4 / this.zoom, 3 / this.zoom]);
              const ohw = (otherSp.width * (otherSp.scaleX || 1)) / 2;
              const ohh = (otherSp.height * (otherSp.scaleY || 1)) / 2;
              ctx.translate(otherSp.x, otherSp.y);
              ctx.rotate(((otherSp.rotation || 0) * Math.PI) / 180);
              ctx.strokeRect(-ohw, -ohh, ohw * 2, ohh * 2);
              ctx.restore();
            }
          }
        }

        // Pen Overlay
        if (activePenPoints && activePenPoints.length > 0) {
          this.drawPenPathOverlay(ctx, activePenPoints);
        }

        // Bezier Curve Tool Overlay
        if (activeCurvePoints && activeCurvePoints.length > 0) {
          this.drawCurveOverlay(ctx, activeCurvePoints);
        }

        // Real-time Brush Tool Stroke Overlay
        if (activeBrushStroke && activeBrushStroke.length > 0) {
          ctx.save();
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.strokeStyle = this.doc.foregroundColor || '#ffffff';
          ctx.lineWidth = (window.jspenApp?.tools?.brushSize || 6);
          ctx.beginPath();
          ctx.moveTo(activeBrushStroke[0].x, activeBrushStroke[0].y);
          for (let i = 1; i < activeBrushStroke.length; i++) {
            ctx.lineTo(activeBrushStroke[i].x, activeBrushStroke[i].y);
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

        // True Photoshop Clipping Mask & Inverted Mask rendering
        const isMask = sprite.isMask || (sprite.maskMode && sprite.maskMode !== 'none');
        if (isMask) {
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

      // Apply Photoshop-style Graphic Filters (including Alpha Opacity)
      if (sprite.filters) {
        const f = sprite.filters;
        const fltrs = [];
        if (f.blur) fltrs.push(`blur(${f.blur}px)`);
        if (f.brightness !== undefined && f.brightness !== 100) fltrs.push(`brightness(${f.brightness}%)`);
        if (f.contrast !== undefined && f.contrast !== 100) fltrs.push(`contrast(${f.contrast}%)`);
        if (f.saturate !== undefined && f.saturate !== 100) fltrs.push(`saturate(${f.saturate}%)`);
        if (f.grayscale) fltrs.push(`grayscale(${f.grayscale}%)`);
        if (f.sepia) fltrs.push(`sepia(${f.sepia}%)`);
        if (f.hueRotate) fltrs.push(`hue-rotate(${f.hueRotate}deg)`);
        if (f.invert) fltrs.push(`invert(${f.invert}%)`);
        if (f.opacity !== undefined && f.opacity !== 100) {
          fltrs.push(`opacity(${f.opacity}%)`);
          ctx.globalAlpha *= Math.max(0, Math.min(1, f.opacity / 100));
        }
        if (f.dropShadow) fltrs.push(`drop-shadow(0px 8px 16px rgba(0,0,0,0.5))`);
        if (fltrs.length > 0) ctx.filter = fltrs.join(' ');
      }

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
        if (sprite.text) {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop);
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
        if (sprite.text) {
          this.drawSpriteLabelText(ctx, sprite, hw, hh, lop);
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
          if (sprite.isClosedPath || sprite.pathClosed) ctx.closePath();

          // Paths from Bezier & Pen have no fill
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
      } else if (sprite.type === 'image') {
        if (sprite.imageUrl) {
          if (!sprite._imgObj) {
            sprite._imgObj = new Image();
            sprite._imgObj.src = sprite.imageUrl;
            sprite._imgObj.onload = () => { if (window.jspenApp?.renderCanvas) window.jspenApp.renderCanvas(); };
          }
          if (sprite._imgObj.complete && sprite._imgObj.naturalWidth) {
            ctx.drawImage(sprite._imgObj, -hw, -hh, sprite.width, sprite.height);
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
        ctx.font = `${sprite.fontWeight || 'normal'} ${sprite.fontSize || 16}px ${sprite.fontFamily || '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif'}`;
        ctx.fillStyle = sprite.fill || '#ffffff';
        if (sprite.fillOpacity !== undefined) ctx.globalAlpha = Math.max(0, Math.min(1, lop * sprite.fillOpacity));
        const textAlign = sprite.textAlign || 'center';
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'middle';
        const lines = String(sprite.text || '').split('\n');
        const lh = (sprite.fontSize || 16) * 1.35;
        const startY = -(lines.length - 1) * lh / 2;
        const textX = textAlign === 'left' ? -hw : (textAlign === 'right' ? hw : 0);
        for (let i = 0; i < lines.length; i++) {
          ctx.fillText(lines[i], textX, startY + i * lh);
        }
        ctx.restore();
      }

      ctx.restore();
    }

    drawSpriteLabelText(ctx, sprite, hw, hh, lop) {
      ctx.save();
      const isLight = (hex) => {
        if (!hex || hex === 'transparent') return false;
        let c = String(hex).replace('#', '');
        if (c.length === 3) c = c.split('').map(x => x + x).join('');
        if (c.length !== 6) return false;
        const r = parseInt(c.substr(0, 2), 16), g = parseInt(c.substr(2, 2), 16), b = parseInt(c.substr(4, 2), 16);
        return (0.299 * r + 0.587 * g + 0.114 * b) > 160;
      };
      ctx.fillStyle = sprite.textColor || (isLight(sprite.fill) ? '#09090b' : '#ffffff');
      ctx.font = `${sprite.fontWeight || 'bold'} ${sprite.fontSize || 14}px ${sprite.fontFamily || '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif'}`;
      const textAlign = sprite.textAlign || 'center';
      ctx.textAlign = textAlign;
      ctx.textBaseline = 'middle';
      const lines = String(sprite.text || '').split('\n');
      const lh = (sprite.fontSize || 14) * 1.35;
      const startY = -(lines.length - 1) * lh / 2;
      const pad = 14;
      const textX = textAlign === 'left' ? (-hw + pad) : (textAlign === 'right' ? (hw - pad) : 0);
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
      const activeLayer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!activeLayer) return;

      const pts = this.activeBrushStroke;
      if (pts.length === 1) {
        pts.push({ x: pts[0].x + 0.1, y: pts[0].y + 0.1 });
      }

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
        brushSize: this.brushSize || 6,
        brushStrokePoints: relPts,
        stroke: this.doc.foregroundColor || '#ffffff',
        fill: 'transparent'
      });

      this.activeBrushStroke = null;
      this.doc.selectedSpriteId = sp.id;
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
        activeTriggerTargets: new Set()
      };
      this.bus.emitSignal = (signalName, sourceId = '', payload = null) => {
        if (!signalName) return;
        this.bus.signals.set(signalName, { time: this.bus.time, sourceId, payload });
      };
      this.bus.hasSignal = (signalName, maxAgeSec = 0.35) => {
        if (!signalName || signalName === '*') return this.bus.signals.size > 0;
        const s = this.bus.signals.get(signalName);
        if (!s) return false;
        return (this.bus.time - s.time) <= maxAgeSec;
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

    navigateHyperlink(href, target = '_blank') {
      if (!href) return;
      href = href.trim();
      if (href.startsWith('#')) {
        const targetId = href.slice(1);
        const targetSp = this.doc.layers.flatMap(l => l.sprites).find(s => s.anchorId === targetId || s.id === targetId);
        if (targetSp && window.jspenApp?.renderer) {
          window.jspenApp.renderer.panY = -(targetSp.y - 120);
          window.jspenApp.renderCanvas();
        }
      } else {
        window.open(href, target);
      }
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
      if (cond === 'on_trigger') {
        if (sprite.runtime && sprite.runtime.isTriggered) return true;
        if (bus.activeTriggerTargets && bus.activeTriggerTargets.has(sprite.id)) return true;
        if (mod.params?.triggerId && bus.activeTriggers && bus.activeTriggers.has(mod.params.triggerId)) return true;
        return false;
      }
      if (cond === 'on_signal') {
        const sName = mod.params?.listenSignal || mod.params?.inputSignal || '*';
        return bus.hasSignal(sName);
      }
      if (cond === 'on_toggle') {
        return sprite.runtime && sprite.runtime.toggleState !== false;
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

      // Clean up stale signals (> 0.6s)
      for (const [sigName, sigData] of this.bus.signals.entries()) {
        if (this.bus.time - sigData.time > 0.6) {
          this.bus.signals.delete(sigName);
        }
      }
      this.bus.activeTriggers.clear();
      this.bus.activeTriggerTargets.clear();

      // Free dragging
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
            else if (trgEvt === 'click') triggered = isMouseInside && this.bus.mouse.clicked;

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

          for (const mod of (sprite.modules || [])) {
            if (!mod.enabled) continue;
            if (this.activeModuleIds && !this.activeModuleIds.has(mod.id)) continue;
            if (!this.evaluateCondition(mod, sprite, this.bus)) continue;

            const p = mod.params || {};

            switch (mod.type) {
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
                if (this.bus.mouse.clicked && !this.draggedSprite && sprite.runtime.isHovered) {
                  this.draggedSprite = sprite;
                  this.dragOffset = { x: this.bus.mouse.x - sprite.runtime.x, y: this.bus.mouse.y - sprite.runtime.y };
                }
                break;

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
                const shouldToggle = (inSig && this.bus.hasSignal(inSig)) || (this.bus.mouse.clicked && sprite.runtime.isHovered);
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
                const shouldCount = (inSig && this.bus.hasSignal(inSig)) || (this.bus.mouse.clicked && sprite.runtime.isHovered) || sprite.runtime.isTriggered;
                if (shouldCount) {
                  if (!sprite.runtime._lastCountTime || (this.bus.time - sprite.runtime._lastCountTime > 0.15)) {
                    sprite.runtime._lastCountTime = this.bus.time;
                    sprite.runtime.counterValue = (sprite.runtime.counterValue !== undefined ? sprite.runtime.counterValue : (p.startVal || 0)) + (p.stepVal || 1);
                    if (p.maxVal !== undefined && sprite.runtime.counterValue > p.maxVal) {
                      sprite.runtime.counterValue = p.startVal || 0;
                      this.bus.emitSignal('counter_max', sprite.id);
                    }
                    if (sprite.type === 'text') sprite.text = String(sprite.runtime.counterValue);
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
                const maxS = parseFloat(p.maxSpeed !== undefined ? p.maxSpeed : 15);
                const ox = parseFloat(p.offsetX || 0);
                const oy = parseFloat(p.offsetY || 0);
                const destX = tx + ox, destY = ty + oy;
                const dx = destX - sprite.runtime.x, dy = destY - sprite.runtime.y;
                const dist = Math.hypot(dx, dy);

                if (mode === 'direct') {
                  sprite.runtime.x = destX;
                  sprite.runtime.y = destY;
                } else if (mode === 'lerp') {
                  const factor = Math.min(1, Math.max(0, st * 2));
                  sprite.runtime.x += dx * factor;
                  sprite.runtime.y += dy * factor;
                } else if (mode === 'constant') {
                  if (dist > 1) {
                    const step = Math.min(dist, maxS);
                    sprite.runtime.x += (dx / dist) * step;
                    sprite.runtime.y += (dy / dist) * step;
                  }
                } else if (mode === 'orbit') {
                  const spd = parseFloat(p.orbitSpeed || 2);
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
                const intensity = parseFloat(p.intensity || 8);
                sprite.runtime.x += (Math.random() - 0.5) * intensity;
                sprite.runtime.y += (Math.random() - 0.5) * intensity;
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
      let html = `
        <div class="ps-option-group"><span class="ps-option-title">${this.getToolName(t)}</span></div>
        <!-- Mode Switcher & Quick Controls -->
        <div class="ps-option-group" style="border-left:1px solid var(--ps-border);padding-left:10px;margin-left:4px;display:flex;align-items:center;gap:6px;">
          <button class="btn btn-primary btn-sm" id="btnOptNodeMode" style="height:24px;font-size:11px;padding:2px 10px;display:flex;align-items:center;gap:5px;font-weight:600;" title="모듈 노드 모드 / 스튜디오 전환 (Shift+Tab)">
            ${window.jspenApp?.isNodeMode ? '스튜디오로 복귀 (Shift+Tab)' : '모듈 노드 모드 (Shift+Tab)'}
          </button>
          <button class="btn btn-secondary btn-sm" id="btnOptWebPreview" style="height:24px;font-size:11px;padding:2px 8px;color:#38bdf8;border-color:#38bdf8;display:flex;align-items:center;gap:4px;" title="새 창에서 실시간 웹 미리보기 (Alt+W / Ctrl+Space)">
            🌐 웹 미리보기
          </button>
        </div>
      `;

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
                <button class="ps-btn-layer-add-sp" data-act="add-screen-trigger" title="화면 트리거 생성" style="background:#1e293b;border-color:#38bdf8;color:#38bdf8;">+트리거</button>
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
                      <div class="ps-sprite-sub-item ${s.id === this.doc.selectedSpriteId ? 'selected' : ''}" data-act="select-sprite" data-sprite-id="${s.id}" data-layer-id="${l.id}" draggable="true">
                        <button class="ps-sp-fold-btn" data-act="toggle-sprite-fold" title="모듈 접기/펼치기" style="${hasMods ? '' : 'visibility:hidden;'}">
                          ${isFolded ? '▶' : '▼'}
                        </button>
                        <button class="ps-layer-vis-btn ${s.visible ? '' : 'muted'}" data-act="vis-sprite" title="스프라이트 가시성">${s.visible ? '●' : '○'}</button>
                        ${(s.isMask || (s.maskMode && s.maskMode !== 'none')) ? '<span title="클리핑 마스크 적용됨" style="color:#a855f7;font-weight:bold;margin-right:2px;font-size:12px;">↳</span>' : ''}
                        <span class="ps-sp-icon">${s.type === 'rect' ? '▭' : (s.type === 'circle' ? '○' : (s.type === 'text' ? 'T' : (s.type === 'path' ? '⟿' : '✎')))}</span>
                        
                        ${this.renamingId === s.id ? `
                          <input type="text" class="ps-layer-title-input" value="${s.name}" autofocus>
                        ` : `
                          <span class="ps-sprite-title" data-act="select-sprite" title="더블 클릭하여 이름 변경">${s.name}</span>
                        `}

                        <button class="ps-sp-link-btn ${s.linkGroup ? 'active' : ''}" data-act="toggle-link" title="${s.linkGroup ? '스프라이트 링크 해제 (현재 그룹: ' + s.linkGroup + ')' : '다른 스프라이트와 링크하기'}">
                          ${s.linkGroup ? `🔗${s.linkGroup}` : '🔗'}
                        </button>

                        <button class="ps-btn-add-module ${hasMods ? 'has-modules' : ''}" data-act="add-sprite-mod" title="모듈 추가">
                          +fx ${hasMods ? `<span class="mod-count">${s.modules.length}</span>` : ''}
                        </button>
                        <button class="ps-layer-fold-btn" data-act="rename-item" title="이름 변경" style="font-size:10px;">✎</button>
                        <button class="ps-btn-del-item" data-act="delete-sprite" title="스프라이트 삭제">✕</button>
                      </div>

                      <!-- Sub-Modules nested under sprite like layers inside folder -->
                      ${(hasMods && !isFolded) ? `
                        <div class="ps-layer-sub-modules">
                          ${s.modules.map((m, mIdx) => `
                            <div class="ps-layer-module-row ${m.id === this.doc.selectedModuleId ? 'selected-mod' : ''}" data-mod-id="${m.id}" data-sprite-id="${s.id}" data-mod-idx="${mIdx}">
                              <span class="mod-indent">↳</span>
                              <span class="mod-badge">${MODULE_REGISTRY[m.type]?.icon || 'MOD'}</span>
                              <span class="mod-name" data-act="select-mod" title="클릭하여 모듈 설정">${m.name}</span>
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
            <button class="mod-category-tab ${this.activeCategory==='web'?'active':''}" data-cat="web">웹 & 인터랙션</button>
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
          if (this.activeCategory === 'timing') return MODULE_REGISTRY[k].category === 'timing';
          return MODULE_REGISTRY[k].category === this.activeCategory;
        });

        grid.innerHTML = keys.map(k => {
          const m = MODULE_REGISTRY[k];
          return `
            <div class="ps-module-card" data-key="${k}">
              <div class="ps-mod-badge">${m.icon}</div>
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
        <div class="ps-dock-header krita-docker-titlebar">
          <span class="ps-dock-title">속성 (Inspector)</span>
          <div class="ps-dock-tools">
            <button class="krita-action-btn" data-docker-act="toggle-collapse" title="접기/펼치기">▼</button>
            <button class="krita-action-btn" data-docker-act="toggle-float" title="창 분리(Float) / 도킹(Dock)">⧉</button>
          </div>
        </div>

        <div class="ps-insp-scroll-area">
          ${selectedMod ? this.renderModuleInspector(selectedMod, selectedSprite) : this.renderVisualInspector(selectedSprite, selectedLayer)}
        </div>
      `;

      this.bindScrubbing();
      this.bindInputs(selectedSprite, selectedMod);

      
    }

    getSelectedModule(sprite) {
      if (!this.doc.selectedModuleId || !sprite || !sprite.modules) return null;
      return sprite.modules.find(m => m.id === this.doc.selectedModuleId) || null;
    }

    renderModuleInspector(mod, sprite) {
      const def = MODULE_REGISTRY[mod.type] || {};
      const params = mod.params || {};
      const modIdx = sprite?.modules ? sprite.modules.findIndex(m => m.id === mod.id) : -1;
      const totalMods = sprite?.modules ? sprite.modules.length : 1;
      const isFirst = modIdx === 0;
      const isLast = modIdx === totalMods - 1;

      const allSprites = [];
      const allLayers = [];
      const allModules = [];
      for (const ly of this.doc.layers) {
        allLayers.push({ id: ly.id, name: ly.name });
        if (ly.modules) {
          for (const m of ly.modules) {
            allModules.push({ id: m.id, name: `[레이어] ${m.name} (${ly.name})` });
          }
        }
        for (const sp of ly.sprites) {
          allSprites.push({ id: sp.id, name: `${sp.name} (${ly.name})`, type: sp.type });
          if (sp.modules) {
            for (const m of sp.modules) {
              allModules.push({ id: m.id, name: `[스프라이트] ${m.name} (${sp.name})` });
            }
          }
        }
      }

      // Render specific controls based on module type
      let typeSpecificHtml = '';
      if (mod.type === 'hyperlink') {
        typeSpecificHtml = `
          <div class="ps-prop-row">
            <label class="ps-prop-label">이동 링크 URL:</label>
            <input type="text" class="ps-input" data-param-key="url" placeholder="https://... 또는 #section" value="${params.url || ''}">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">열기 방식 (Target):</label>
            <select class="ps-select" data-param-key="target">
              <option value="_blank" ${(params.target || '_blank') === '_blank' ? 'selected' : ''}>새 탭에서 열기 (_blank)</option>
              <option value="_self" ${params.target === '_self' ? 'selected' : ''}>현재 창에서 열기 (_self)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">발동 조건 (Trigger):</label>
            <select class="ps-select" data-param-key="trigger">
              <option value="click" ${(params.trigger || 'click') === 'click' ? 'selected' : ''}>🖱️ 클릭 시 이동 (Click)</option>
              <option value="hover" ${params.trigger === 'hover' ? 'selected' : ''}>🎯 마우스 호버 시 이동 (Hover)</option>
              <option value="signal" ${params.trigger === 'signal' ? 'selected' : ''}>📡 신호 수신 시 이동 (On Signal)</option>
              <option value="viewport_enter" ${params.trigger === 'viewport_enter' ? 'selected' : ''}>👁️ 화면 진입 시 이동 (Viewport)</option>
            </select>
          </div>
          ${params.trigger === 'signal' ? `
          <div class="ps-prop-row">
            <label class="ps-prop-label">트리거 신호명:</label>
            <input type="text" class="ps-input" data-param-key="signalName" placeholder="예: signal_1" value="${params.signalName || ''}">
          </div>` : ''}
          <div class="ps-prop-row">
            <label class="ps-prop-label">호버 효과:</label>
            <select class="ps-select" data-param-key="hoverEffect">
              <option value="none" ${params.hoverEffect === 'none' ? 'selected' : ''}>없음 (None)</option>
              <option value="lift" ${(params.hoverEffect || 'lift') === 'lift' ? 'selected' : ''}>살짝 뜨기 (Lift Up -3px)</option>
              <option value="zoom" ${params.hoverEffect === 'zoom' ? 'selected' : ''}>부드럽게 확대 (Zoom 1.05x)</option>
              <option value="glow" ${params.hoverEffect === 'glow' ? 'selected' : ''}>화려한 발광 (Cyan Glow)</option>
              <option value="fade" ${params.hoverEffect === 'fade' ? 'selected' : ''}>투명도 전환 (Fade 80%)</option>
              <option value="bounce" ${params.hoverEffect === 'bounce' ? 'selected' : ''}>통통 튀기 (Bounce)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">인페이지 앵커 ID:</label>
            <input type="text" class="ps-input" data-param-key="anchorId" placeholder="예: features, pricing" value="${params.anchorId || ''}">
          </div>
          <div class="ps-prop-row" style="margin-top:6px;">
            <button class="btn btn-secondary btn-sm" id="btnTestModDetailLink" style="width:100%;justify-content:center;color:#38bdf8;border-color:#38bdf8;gap:6px;" ${!params.url ? 'disabled' : ''}>
              🔗 브라우저에서 링크 바로 열기 (테스트)
            </button>
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
            <label class="ps-prop-label">가우시안 블러:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="blur" min="0" max="60" value="${params.blur || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">밝기 (Brightness):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="brightness" min="0" max="300" value="${params.brightness ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">대비 (Contrast):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="contrast" min="0" max="300" value="${params.contrast ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">채도 (Saturation):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="saturate" min="0" max="300" value="${params.saturate ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">흑백 (Grayscale):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="grayscale" min="0" max="100" value="${params.grayscale || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">색조 회전 (Hue):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="hueRotate" min="0" max="360" value="${params.hueRotate || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">알파값 (Opacity):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="opacity" min="0" max="100" value="${params.opacity !== undefined ? params.opacity : 100}">
            </div>
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
            <label class="ps-prop-label">진폭 (Amplitude):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="amplitude" min="1" max="100" value="${params.amplitude || 10}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">주파수 (Hz):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" data-param-key="frequency" min="0.1" max="5" step="0.1" value="${params.frequency || 1}">
            </div>
          </div>
        `;
      } else {
        // Generic properties
        typeSpecificHtml = `
          <!-- Target Entity Selector (Sprite / Layer / Module) -->
          <div class="ps-prop-row">
            <label class="ps-prop-label">타겟 스프라이트:</label>
            <select class="ps-select" data-param-key="targetSpriteId">
              <option value="">(선택 안 됨 - 대상 없음)</option>
              ${allSprites.map(s => `
                <option value="${s.id}" ${params.targetSpriteId === s.id ? 'selected' : ''}>${s.name} [${s.type}]</option>
              `).join('')}
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">타겟 모듈/레이어:</label>
            <select class="ps-select" data-param-key="targetModuleId">
              <option value="">(선택 안 됨 - 대상 없음)</option>
              ${allModules.map(m => `
                <option value="${m.id}" ${params.targetModuleId === m.id ? 'selected' : ''}>${m.name}</option>
              `).join('')}
            </select>
          </div>
          <div style="margin-top:10px;font-size:11px;font-weight:700;color:#a1a1aa;">모듈 파라미터 수동 제어</div>
          ${Object.keys(params).filter(k => k !== 'condition' && k !== 'targetSpriteId' && k !== 'targetModuleId').map(key => `
            <div class="ps-prop-row" style="margin-top:6px;">
              <label class="ps-prop-label">${key}:</label>
              ${typeof params[key] === 'boolean' ? `
                <select class="ps-select" data-param-key="${key}">
                  <option value="true" ${params[key] ? 'selected' : ''}>true</option>
                  <option value="false" ${!params[key] ? 'selected' : ''}>false</option>
                </select>
              ` : `
                <input type="${typeof params[key] === 'number' ? 'number' : 'text'}" class="ps-input" data-param-key="${key}" value="${params[key]}">
              `}
            </div>
          `).join('')}
        `;
      }

      return `
        <div class="ps-prop-section" style="border-left: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.03);">
          <!-- Module Header with Blender Modifier Tools -->
          <div class="ps-prop-header" style="justify-content:space-between; align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;min-width:0;overflow:hidden;">
              <span class="ps-mod-icon-tag" style="background:#0f172a;color:#38bdf8;padding:2px 6px;border-radius:3px;font-weight:bold;font-size:10px;">${def.icon || 'MOD'}</span>
              <span style="font-weight:700;color:#f1f5f9;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${mod.name}</span>
            </div>
            <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
              <button class="ps-mod-tool-btn ${mod.enabled !== false ? 'active' : ''}" id="modDetailToggleViewport" title="뷰포트 시뮬레이션 토글">${mod.enabled !== false ? '👁️' : '🕶️'}</button>
              <button class="ps-mod-tool-btn ${mod.showInRender !== false ? 'active' : ''}" id="modDetailToggleRender" title="웹사이트 내보내기/미리보기 반영 토글">🌐</button>
              <button class="ps-mod-tool-btn" id="modDetailMoveUp" ${isFirst ? 'disabled' : ''} title="스택 위로 이동 (우선 평가)">▲</button>
              <button class="ps-mod-tool-btn" id="modDetailMoveDown" ${isLast ? 'disabled' : ''} title="스택 아래로 이동 (후순위 평가)">▼</button>
              <button class="ps-mod-tool-btn" id="modDetailDuplicate" title="모디파이어 복제 (Duplicate)">📄</button>
              <button class="ps-mod-tool-btn" id="modDetailApply" title="스프라이트에 영구 적용 (Apply to Base)" style="color:#22c55e;">✓</button>
              <button class="ps-mod-tool-btn" id="modDetailDelete" title="모듈 삭제 (Delete)" style="color:#ef4444;">✕</button>
            </div>
          </div>

          <div style="margin-top:6px;display:flex;justify-content:flex-end;">
            <button class="btn btn-secondary btn-sm" id="btnBackToVisual" style="font-size:11px;padding:2px 8px;color:#94a3b8;">
              스프라이트 기본 속성 ➔
            </button>
          </div>

          <!-- Execution Condition -->
          <div class="ps-prop-row" style="margin-top:10px;">
            <label class="ps-prop-label">작동 조건 (Condition):</label>
            <select class="ps-select" id="modCond">
              <option value="always" ${params.condition === 'always' ? 'selected' : ''}>항상 작동 (Always)</option>
              <option value="on_trigger" ${params.condition === 'on_trigger' ? 'selected' : ''}>화면 트리거 감지 시 (On Trigger)</option>
              <option value="on_signal" ${params.condition === 'on_signal' ? 'selected' : ''}>신호 수신 시 (On Signal)</option>
              <option value="on_toggle" ${params.condition === 'on_toggle' ? 'selected' : ''}>토글 스위치 켜짐 시 (On Toggle)</option>
              <option value="on_click" ${params.condition === 'on_click' ? 'selected' : ''}>마우스 클릭 시 (On Click)</option>
              <option value="on_hover" ${params.condition === 'on_hover' ? 'selected' : ''}>마우스 호버 시 (On Hover)</option>
              <option value="key_press" ${params.condition === 'key_press' ? 'selected' : ''}>키보드 입력 시 (Key Press)</option>
              <option value="timeline_active" ${params.condition === 'timeline_active' ? 'selected' : ''}>특정 프레임 구간 (Timeline)</option>
            </select>
          </div>

          <!-- Type-Specific Properties -->
          ${typeSpecificHtml}
        </div>
      `;
    }
    renderModifierStack(sprite) {
      if (!sprite || !sprite.modules || sprite.modules.length === 0) {
        // "속성창에는 속성만 뜨고": No add dropdown or empty state placeholder here!
        return '';
      }

      const modules = sprite.modules;
      const total = modules.length;

      return `
        <!-- Attached Modules Properties Overview -->
        <div class="ps-prop-section" style="border-left: 3px solid #38bdf8; background: rgba(56, 189, 248, 0.03);">
          <div class="ps-prop-header" style="justify-content:space-between; align-items:center;">
            <div style="display:flex;align-items:center;gap:6px;">
              <span style="font-weight:700;color:#38bdf8;">📦 장착된 모듈 속성 (${total}개)</span>
            </div>
            <span style="font-size:10px;color:#71717a;">레이어 창 +fx 로 추가됨</span>
          </div>

          <div style="display:flex;flex-direction:column;gap:5px;margin-top:8px;">
            ${modules.map((m, mIdx) => {
              const def = MODULE_REGISTRY[m.type] || { name: m.name, icon: 'MOD' };
              const isEnabled = m.enabled !== false;
              const isFirst = mIdx === 0;
              const isLast = mIdx === total - 1;
              return `
                <div style="display:flex;align-items:center;justify-content:space-between;background:#18181e;border:1px solid #2e2e38;padding:5px 8px;border-radius:4px;gap:6px;">
                  <div style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:1;min-width:0;overflow:hidden;" data-act="jump-to-mod" data-mod-id="${m.id}" title="클릭하여 모듈 상세 속성 편집">
                    <span class="ps-mod-icon-tag">${def.icon || 'MOD'}</span>
                    <span style="font-size:11.5px;font-weight:600;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${m.name}</span>
                  </div>
                  <div style="display:flex;align-items:center;gap:3px;flex-shrink:0;">
                    <button class="ps-mod-tool-btn ${isEnabled ? 'active' : ''}" data-act="mod-toggle-viewport" data-mod-idx="${mIdx}" title="뷰포트 시뮬레이션 토글">${isEnabled ? '👁️' : '🕶️'}</button>
                    <button class="ps-mod-tool-btn" data-act="jump-to-mod" data-mod-id="${m.id}" title="속성 상세 편집" style="color:#38bdf8;font-size:10.5px;">✎</button>
                    <button class="ps-mod-tool-btn" data-act="mod-move-up" data-mod-idx="${mIdx}" ${isFirst ? 'disabled' : ''} title="스택 위로 이동">▲</button>
                    <button class="ps-mod-tool-btn" data-act="mod-move-down" data-mod-idx="${mIdx}" ${isLast ? 'disabled' : ''} title="스택 아래로 이동">▼</button>
                    <button class="ps-mod-tool-btn" data-act="mod-apply" data-mod-idx="${mIdx}" title="스프라이트에 영구 적용 (Apply)" style="color:#22c55e;">✓</button>
                    <button class="ps-mod-tool-btn" data-act="mod-delete" data-mod-idx="${mIdx}" title="삭제" style="color:#ef4444;">✕</button>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }
    applyModifier(sprite, idx) {
      if (!sprite || !sprite.modules || !sprite.modules[idx]) return;
      const mod = sprite.modules[idx];
      const p = mod.params || {};

      if (mod.type === 'hyperlink') {
        if (p.url) sprite.linkUrl = p.url;
        if (p.target) sprite.linkTarget = p.target;
        if (p.hoverEffect) sprite.hoverEffect = p.hoverEffect;
        if (p.anchorId) sprite.anchorId = p.anchorId;
        if (p.customClass) sprite.cssClass = (sprite.cssClass ? sprite.cssClass + ' ' : '') + p.customClass;
      } else if (mod.type === 'photoshop_filter') {
        if (!sprite.filters) sprite.filters = {};
        ['blur', 'brightness', 'contrast', 'saturate', 'grayscale', 'sepia', 'hueRotate', 'invert', 'opacity', 'dropShadow'].forEach(k => {
          if (p[k] !== undefined) sprite.filters[k] = p[k];
        });
      } else if (sprite.runtime) {
        sprite.x = Math.round(sprite.runtime.x);
        sprite.y = Math.round(sprite.runtime.y);
        sprite.rotation = Math.round(sprite.runtime.rotation);
        sprite.scaleX = sprite.runtime.scaleX;
        sprite.scaleY = sprite.runtime.scaleY;
        sprite.opacity = sprite.runtime.opacity;
      }

      sprite.modules.splice(idx, 1);
      this.doc.saveState();
      this.render();
      if (this.cb.onCanvasRender) this.cb.onCanvasRender();
      if (this.cb.onUpdate) this.cb.onUpdate();
    }

    renderVisualInspector(sprite, layer) {
      const target = sprite || layer;
      if (!target) {
        return '<div class="ps-empty-layers">선택된 레이어나 스프라이트가 없습니다. 레이어 창에서 항목을 선택하세요.</div>';
      }

      const isLayer = !sprite && !!layer;
      const targetName = isLayer ? `[레이어] ${layer.name}` : `[스프라이트] ${sprite.name}`;
      const filters = target.filters || { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0, opacity: 100, dropShadow: false };

      const renderFiltersSection = () => `
        <div class="ps-prop-section">
          <div class="ps-prop-header" style="justify-content:space-between;">
            <span>포토샵 그래픽 필터 (${isLayer ? '레이어 전체' : '스프라이트'})</span>
            <button class="btn btn-secondary btn-sm" id="btnResetFilters" style="font-size:10px;padding:2px 6px;">⟲ 초기화</button>
          </div>
          ${isLayer ? '<div style="font-size:10.5px;color:#71717a;margin-bottom:8px;">이 레이어에 속한 모든 요소에 필터 효과가 일괄 적용됩니다.</div>' : ''}
          <div class="ps-prop-row">
            <label class="ps-prop-label">가우시안 블러:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrBlur" min="0" max="60" value="${filters.blur || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">밝기 (Brightness):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrBrightness" min="0" max="300" value="${filters.brightness ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">대비 (Contrast):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrContrast" min="0" max="300" value="${filters.contrast ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">채도 (Saturation):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrSaturate" min="0" max="300" value="${filters.saturate ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">흑백 (Grayscale):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrGrayscale" min="0" max="100" value="${filters.grayscale || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">세피아 (Sepia):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrSepia" min="0" max="100" value="${filters.sepia || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">색조 회전 (Hue):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrHue" min="0" max="360" value="${filters.hueRotate || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">반전 (Invert):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrInvert" min="0" max="100" value="${filters.invert || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">알파값 (Alpha Opacity):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrOpacity" min="0" max="100" value="${filters.opacity !== undefined ? filters.opacity : 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">드롭 섀도우:</label>
            <select class="ps-select" id="fltrDropShadow">
              <option value="false" ${!filters.dropShadow ? 'selected' : ''}>없음 (None)</option>
              <option value="true" ${filters.dropShadow ? 'selected' : ''}>소프트 그림자 (Drop Shadow)</option>
            </select>
          </div>
        </div>
      `;

      if (isLayer) {
        return `
          <div class="ps-prop-section">
            <div class="ps-prop-header" style="justify-content:space-between;">
              <span style="font-weight:700;color:#38bdf8;">📂 ${layer.name}</span>
              <span style="font-size:10px;color:#71717a;">선택된 레이어</span>
            </div>
            <div class="ps-prop-row" style="margin-top:8px;">
              <label class="ps-prop-label">투명도 (Opacity):</label>
              <div class="blender-scrub-group">
                <input type="number" class="blender-scrub-input" id="inpLayerOpacity" step="0.05" min="0" max="1" value="${layer.opacity}">
              </div>
            </div>
            <div class="ps-prop-row">
              <label class="ps-prop-label">블렌드 모드:</label>
              <select class="ps-select" id="inpLayerBlend">
                <option value="source-over" ${layer.blendMode === 'source-over' ? 'selected' : ''}>표준 (Normal)</option>
                <option value="multiply" ${layer.blendMode === 'multiply' ? 'selected' : ''}>곱하기 (Multiply)</option>
                <option value="screen" ${layer.blendMode === 'screen' ? 'selected' : ''}>스크린 (Screen)</option>
                <option value="overlay" ${layer.blendMode === 'overlay' ? 'selected' : ''}>오버레이 (Overlay)</option>
              </select>
            </div>
          </div>

          ${renderFiltersSection()}
        `;
      }

      return `
        ${this.renderModifierStack(sprite)}



        <!-- Sprite Link Group & Hierarchy Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">스프라이트 링크 & 그룹</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">링크 그룹:</label>
            <select class="ps-select" id="inpLinkGroup">
              <option value="">링크 없음 (None)</option>
              <option value="1" ${sprite.linkGroup === '1' ? 'selected' : ''}>🔗 그룹 1</option>
              <option value="2" ${sprite.linkGroup === '2' ? 'selected' : ''}>🔗 그룹 2</option>
              <option value="3" ${sprite.linkGroup === '3' ? 'selected' : ''}>🔗 그룹 3</option>
              <option value="4" ${sprite.linkGroup === '4' ? 'selected' : ''}>🔗 그룹 4</option>
              <option value="5" ${sprite.linkGroup === '5' ? 'selected' : ''}>🔗 그룹 5</option>
            </select>
          </div>
        </div>

        ${sprite.type === 'screen_trigger' ? `
        <!-- Screen Trigger Properties -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">화면 트리거 설정 (Screen Trigger)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">발동 조건:</label>
            <select class="ps-select" id="inpTriggerEvent">
              <option value="viewport_enter" ${sprite.triggerEvent === 'viewport_enter' ? 'selected' : ''}>화면 진입 시 (Viewport Enter)</option>
              <option value="viewport_exit" ${sprite.triggerEvent === 'viewport_exit' ? 'selected' : ''}>화면 이탈 시 (Viewport Exit)</option>
              <option value="mouse_enter" ${sprite.triggerEvent === 'mouse_enter' ? 'selected' : ''}>마우스 진입 시 (Mouse Enter)</option>
              <option value="mouse_move" ${sprite.triggerEvent === 'mouse_move' ? 'selected' : ''}>마우스 이동 시 (Mouse Move)</option>
              <option value="scroll_reach" ${sprite.triggerEvent === 'scroll_reach' ? 'selected' : ''}>스크롤 도달 시 (Scroll Reach)</option>
              <option value="click" ${sprite.triggerEvent === 'click' ? 'selected' : ''}>클릭 시 (Click)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">신호 이름:</label>
            <input type="text" class="ps-input" id="inpTriggerSignalName" value="${sprite.signalName || 'signal_1'}" placeholder="예: signal_1">
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">발동 액션:</label>
            <select class="ps-select" id="inpTriggerAction">
              <option value="emit_signal" ${sprite.triggerAction === 'emit_signal' ? 'selected' : ''}>신호 방출 (Emit Signal)</option>
              <option value="animate_filter" ${sprite.triggerAction === 'animate_filter' ? 'selected' : ''}>필터 애니메이션 효과 (Filter FX)</option>
              <option value="set_filter" ${sprite.triggerAction === 'set_filter' ? 'selected' : ''}>필터 값 즉시 설정</option>
              <option value="trigger_module" ${sprite.triggerAction === 'trigger_module' ? 'selected' : ''}>연결 모듈 실행</option>
              <option value="show_sprite" ${sprite.triggerAction === 'show_sprite' ? 'selected' : ''}>스프라이트 표시</option>
              <option value="hide_sprite" ${sprite.triggerAction === 'hide_sprite' ? 'selected' : ''}>스프라이트 숨김</option>
              <option value="pulse" ${sprite.triggerAction === 'pulse' ? 'selected' : ''}>펄스 박동 확대</option>
              <option value="animate_in" ${sprite.triggerAction === 'animate_in' ? 'selected' : ''}>페이드인 모션</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">대상 스프라이트:</label>
            <select class="ps-select" id="inpTriggerTargetSprite">
              <option value="">(대상 없음)</option>
              ${this.doc.layers.flatMap(l => l.sprites).filter(s => s.id !== sprite.id).map(s => `
                <option value="${s.id}" ${sprite.targetSpriteId === s.id ? 'selected' : ''}>${s.name} [${s.type}]</option>
              `).join('')}
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">필터 FX 종류:</label>
            <select class="ps-select" id="inpTriggerFilterEffect">
              <option value="blur" ${sprite.filterEffect === 'blur' ? 'selected' : ''}>가우시안 블러 (Blur)</option>
              <option value="grayscale" ${sprite.filterEffect === 'grayscale' ? 'selected' : ''}>흑백 전환 (Grayscale)</option>
              <option value="invert" ${sprite.filterEffect === 'invert' ? 'selected' : ''}>색상 반전 (Invert)</option>
              <option value="brightness" ${sprite.filterEffect === 'brightness' ? 'selected' : ''}>밝기 (Brightness)</option>
              <option value="contrast" ${sprite.filterEffect === 'contrast' ? 'selected' : ''}>대비 (Contrast)</option>
              <option value="opacity" ${sprite.filterEffect === 'opacity' ? 'selected' : ''}>알파값/투명도 (Opacity)</option>
            </select>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">필터 목표치:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="inpTriggerFilterValue" value="${sprite.filterValue !== undefined ? sprite.filterValue : 20}">
            </div>
          </div>
        </div>
        ` : ''}

        <!-- Photoshop-Style Mask & Clipping Mask Section -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">마스크 설정 (Mask & Clipping)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">마스크 모드:</label>
            <select class="ps-select" id="inpMaskMode">
              <option value="none" ${(!sprite.maskMode || sprite.maskMode === 'none') ? 'selected' : ''}>없음 (None)</option>
              <option value="clip_mask" ${sprite.maskMode === 'clip_mask' ? 'selected' : ''}>클리핑 마스크 (Clipping Mask)</option>
              <option value="inverted_mask" ${sprite.maskMode === 'inverted_mask' ? 'selected' : ''}>반전 마스크 (Inverted Mask)</option>
            </select>
          </div>
          <div class="ps-prop-row" id="rowMaskTarget" style="${(!sprite.maskMode || sprite.maskMode === 'none') ? 'display:none;' : ''}">
            <label class="ps-prop-label">클리핑 대상:</label>
            <select class="ps-select" id="inpMaskTarget">
              <option value="">(아래 스프라이트에 클리핑)</option>
              ${(this.doc.layers.find(l => l.sprites.some(s => s.id === sprite.id))?.sprites || []).filter(s => s.id !== sprite.id).map(s => `
                <option value="${s.id}" ${sprite.maskTargetId === s.id ? 'selected' : ''}>${s.name} [${s.type}]</option>
              `).join('')}
            </select>
          </div>
        </div>

        <!-- Photoshop-Style Graphics Filters -->
        <div class="ps-prop-section">
          <div class="ps-prop-header">포토샵 그래픽 필터 (Filters)</div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">가우시안 블러:</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrBlur" min="0" max="60" value="${sprite.filters?.blur || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">밝기 (Brightness):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrBrightness" min="0" max="300" value="${sprite.filters?.brightness ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">대비 (Contrast):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrContrast" min="0" max="300" value="${sprite.filters?.contrast ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">채도 (Saturation):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrSaturate" min="0" max="300" value="${sprite.filters?.saturate ?? 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">흑백 (Grayscale):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrGrayscale" min="0" max="100" value="${sprite.filters?.grayscale || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">세피아 (Sepia):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrSepia" min="0" max="100" value="${sprite.filters?.sepia || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">색조 회전 (Hue):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrHue" min="0" max="360" value="${sprite.filters?.hueRotate || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">반전 (Invert):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrInvert" min="0" max="100" value="${sprite.filters?.invert || 0}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">알파값 (Alpha Opacity):</label>
            <div class="blender-scrub-group">
              <input type="number" class="blender-scrub-input" id="fltrOpacity" min="0" max="100" value="${sprite.filters?.opacity !== undefined ? sprite.filters.opacity : 100}">
            </div>
          </div>
          <div class="ps-prop-row">
            <label class="ps-prop-label">드롭 섀도우:</label>
            <select class="ps-select" id="fltrDropShadow">
              <option value="false" ${!sprite.filters?.dropShadow ? 'selected' : ''}>없음 (None)</option>
              <option value="true" ${sprite.filters?.dropShadow ? 'selected' : ''}>소프트 그림자 (Drop Shadow)</option>
            </select>
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
              <input type="color" class="ps-color-picker" id="inpFill" value="${sprite.fill && sprite.fill.startsWith('#') ? sprite.fill : '#d4d4d8'}">
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
        const modIdx = sprite?.modules ? sprite.modules.findIndex(m => m.id === mod.id) : -1;

        // Back to sprite visual properties
        this.el.querySelector('#btnBackToVisual')?.addEventListener('click', () => {
          this.doc.selectedModuleId = null;
          this.render();
        });

        // Viewport Toggle
        this.el.querySelector('#modDetailToggleViewport')?.addEventListener('click', () => {
          mod.enabled = !mod.enabled;
          this.doc.saveState();
          this.render();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        // Render Toggle
        this.el.querySelector('#modDetailToggleRender')?.addEventListener('click', () => {
          mod.showInRender = (mod.showInRender === undefined) ? false : !mod.showInRender;
          this.doc.saveState();
          this.render();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        // Move Up in Stack
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

        // Move Down in Stack
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

        // Duplicate Modifier
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

        // Apply Modifier (Bake into base)
        this.el.querySelector('#modDetailApply')?.addEventListener('click', () => {
          if (sprite && modIdx >= 0) {
            this.applyModifier(sprite, modIdx);
          }
        });

        // Delete Modifier
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

        // Test Link button in detail view
        this.el.querySelector('#btnTestModDetailLink')?.addEventListener('click', () => {
          if (mod.params?.url) {
            window.open(mod.params.url, mod.params.target || '_blank');
          }
        });

        // Condition change
        this.el.querySelector('#modCond')?.addEventListener('change', e => {
          if (!mod.params) mod.params = {};
          mod.params.condition = e.target.value;
          this.doc.saveState();
          this.render();
          if (this.cb.onCanvasRender) this.cb.onCanvasRender();
          if (this.cb.onUpdate) this.cb.onUpdate();
        });

        // Inputs with data-param-key
        this.el.querySelectorAll('[data-param-key]').forEach(input => {
          const key = input.dataset.paramKey;
          const onValChange = () => {
            if (!mod.params) mod.params = {};
            let val = input.value;
            if (input.type === 'number') {
              val = parseFloat(val) || 0;
            } else if (val === 'true') {
              val = true;
            } else if (val === 'false') {
              val = false;
            }
            mod.params[key] = val;
            this.doc.saveState();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (key === 'url') {
              const btn = this.el.querySelector('#btnTestModDetailLink');
              if (btn) btn.disabled = !val;
            }
          };

          input.addEventListener('input', onValChange);
          input.addEventListener('change', () => {
            onValChange();
            if (this.cb.onUpdate) this.cb.onUpdate();
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

      // Jump into module detail properties
      this.el.querySelectorAll('[data-act="jump-to-mod"]').forEach(el => {
        el.addEventListener('click', () => {
          const mId = el.dataset.modId;
          if (mId) {
            this.doc.selectedModuleId = mId;
            this.render();
          }
        });
      });

      // Viewport toggle from sprite properties overview
      this.el.querySelectorAll('[data-act="mod-toggle-viewport"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.modIdx, 10);
          if (sprite.modules && sprite.modules[idx]) {
            sprite.modules[idx].enabled = !sprite.modules[idx].enabled;
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });
      });

      // Move Up / Move Down from sprite properties overview
      this.el.querySelectorAll('[data-act="mod-move-up"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.modIdx, 10);
          if (sprite.modules && idx > 0) {
            const [item] = sprite.modules.splice(idx, 1);
            sprite.modules.splice(idx - 1, 0, item);
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });
      });

      this.el.querySelectorAll('[data-act="mod-move-down"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.modIdx, 10);
          if (sprite.modules && idx < sprite.modules.length - 1) {
            const [item] = sprite.modules.splice(idx, 1);
            sprite.modules.splice(idx + 1, 0, item);
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });
      });

      // Apply from sprite properties overview
      this.el.querySelectorAll('[data-act="mod-apply"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.modIdx, 10);
          if (sprite.modules && sprite.modules[idx]) {
            this.applyModifier(sprite, idx);
          }
        });
      });

      // Delete from sprite properties overview
      this.el.querySelectorAll('[data-act="mod-delete"]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const idx = parseInt(btn.dataset.modIdx, 10);
          if (sprite.modules && sprite.modules[idx]) {
            sprite.modules.splice(idx, 1);
            this.doc.saveState();
            this.render();
            if (this.cb.onCanvasRender) this.cb.onCanvasRender();
            if (this.cb.onUpdate) this.cb.onUpdate();
          }
        });
      });

      // Link Group
      this.el.querySelector('#inpLinkGroup')?.addEventListener('change', e => {
        sprite.linkGroup = e.target.value || null;
        this.doc.saveState();
        this.cb.onUpdate();
      });

      // Screen Trigger
      this.el.querySelector('#inpTriggerEvent')?.addEventListener('change', e => {
        sprite.triggerEvent = e.target.value;
        this.doc.saveState();
        this.cb.onUpdate();
      });
      this.el.querySelector('#inpTriggerAction')?.addEventListener('change', e => {
        sprite.triggerAction = e.target.value;
        this.doc.saveState();
        this.cb.onUpdate();
      });

      // Filter Inputs
      const bindFilter = (id, key, isBool = false) => {
        const inp = this.el.querySelector('#' + id);
        if (!inp) return;
        inp.addEventListener('input', () => {
          if (!sprite.filters) sprite.filters = {};
          sprite.filters[key] = isBool ? (inp.value === 'true') : (parseFloat(inp.value) || 0);
          this.cb.onCanvasRender();
        });
        inp.addEventListener('change', () => {
          if (!sprite.filters) sprite.filters = {};
          sprite.filters[key] = isBool ? (inp.value === 'true') : (parseFloat(inp.value) || 0);
          this.doc.saveState();
          this.cb.onUpdate();
        });
      };
      bindFilter('fltrBlur', 'blur');
      bindFilter('fltrBrightness', 'brightness');
      bindFilter('fltrContrast', 'contrast');
      bindFilter('fltrSaturate', 'saturate');
      bindFilter('fltrGrayscale', 'grayscale');
      bindFilter('fltrSepia', 'sepia');
      bindFilter('fltrHue', 'hueRotate');
      bindFilter('fltrInvert', 'invert');
      bindFilter('fltrOpacity', 'opacity');
      bindFilter('fltrDropShadow', 'dropShadow', true);

      // Mask & Clipping Mask Bindings
      this.el.querySelector('#inpMaskMode')?.addEventListener('change', e => {
        if (sprite) {
          sprite.maskMode = e.target.value;
          sprite.isMask = (e.target.value !== 'none');
          this.doc.saveState();
          this.cb.onCanvasRender();
          this.render();
        }
      });
      this.el.querySelector('#inpMaskTarget')?.addEventListener('change', e => {
        if (sprite) {
          sprite.maskTargetId = e.target.value || null;
          this.doc.saveState();
          this.cb.onCanvasRender();
        }
      });

      // Screen Trigger Bindings
      this.el.querySelector('#inpTriggerSignalName')?.addEventListener('input', e => {
        if (sprite) { sprite.signalName = e.target.value; this.doc.saveState(); }
      });
      this.el.querySelector('#inpTriggerTargetSprite')?.addEventListener('change', e => {
        if (sprite) { sprite.targetSpriteId = e.target.value; this.doc.saveState(); this.cb.onCanvasRender(); }
      });
      this.el.querySelector('#inpTriggerFilterEffect')?.addEventListener('change', e => {
        if (sprite) { sprite.filterEffect = e.target.value; this.doc.saveState(); }
      });
      this.el.querySelector('#inpTriggerFilterValue')?.addEventListener('input', e => {
        if (sprite) { sprite.filterValue = parseFloat(e.target.value) || 0; this.doc.saveState(); }
      });

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
              <span style="color:#71717a;font-size:11px;margin:0 2px;">/</span><input type="number" id="tlTotalFrames" class="tl-frame-num" value="${total}" min="10" max="9999" style="width:52px;" title="타임라인 총 프레임 길이">
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
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mSettings">환경 설정... <span class="shortcut">Ctrl+,</span></button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mWebPreview">🌐 새 창에서 웹 미리보기 <span class="shortcut">Alt+W</span></button>
                <button class="ps-dropdown-item" id="mWebExport">📦 웹사이트 (HTML/CSS/JS) 내보내기...</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 8px;font-size:10px;color:#a1a1aa;font-weight:600;">웹 템플릿 삽입</div>
                <button class="ps-dropdown-item" data-web-tpl="full_landing">🚀 [풀 패키지] 전체 사이트</button>
                <button class="ps-dropdown-item" data-web-tpl="navbar">📌 상단 네비게이션 헤더</button>
                <button class="ps-dropdown-item" data-web-tpl="hero">✨ 메인 히어로 섹션</button>
                <button class="ps-dropdown-item" data-web-tpl="feature_grid">🗂️ 3열 기능 카드 그리드</button>
                <button class="ps-dropdown-item" data-web-tpl="cta_banner">🎯 전환 유도 CTA 배너</button>
                <button class="ps-dropdown-item" data-web-tpl="footer">📄 하단 푸터</button>
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
                <button class="ps-dropdown-item" data-filter-act="blur">🌫️ 가우시안 블러 (Gaussian Blur)...</button>
                <button class="ps-dropdown-item" data-filter-act="brightness">☀️ 밝기 / 대비 (Brightness & Contrast)...</button>
                <button class="ps-dropdown-item" data-filter-act="saturate">🎨 색조 / 채도 (Hue & Saturation)...</button>
                <button class="ps-dropdown-item" data-filter-act="grayscale">🖤 흑백 필터 (Grayscale)</button>
                <button class="ps-dropdown-item" data-filter-act="sepia">📜 세피아 빈티지 (Sepia)</button>
                <button class="ps-dropdown-item" data-filter-act="invert">🔄 색상 반전 (Invert)</button>
                <button class="ps-dropdown-item" data-filter-act="opacity">👁️ 알파값 / 투명도 조절 (Alpha Opacity)...</button>
                <button class="ps-dropdown-item" data-filter-act="shadow">🌑 드롭 섀도우 (Drop Shadow)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" data-filter-act="mask">🎭 클리핑 마스크 만들기 (Create Clipping Mask)</button>
                <button class="ps-dropdown-item" data-filter-act="unmask">🔓 클리핑 마스크 해제 (Release Clipping Mask)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" data-filter-act="reset">⟲ 선택 대상 필터 초기화</button>
              </div>
            </div>
            <div class="ps-menu-item"><span>웹(W)</span>
              <div class="ps-dropdown-menu">
                <button class="ps-dropdown-item" id="mWPreview">🌐 실시간 웹 미리보기 <span class="shortcut">Ctrl+Space</span></button>
                <button class="ps-dropdown-item" id="mWExport">💾 완성 웹사이트 (HTML 파일) 다운로드...</button>
                <button class="ps-dropdown-item" id="mWCopy">📋 HTML/CSS 소스 코드 복사</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#38bdf8;">⚡ 웹 컴포넌트 템플릿 원클릭 삽입</div>
                <button class="ps-dropdown-item" data-web-tpl="full_landing">🚀 [풀 패키지] 완성형 랜딩페이지 전체 삽입</button>
                <button class="ps-dropdown-item" data-web-tpl="navbar">📌 상단 네비게이션 헤더 (Navbar)</button>
                <button class="ps-dropdown-item" data-web-tpl="hero">✨ 메인 히어로 섹션 (Hero Section)</button>
                <button class="ps-dropdown-item" data-web-tpl="feature_grid">🗂️ 3열 기능 소개 카드 그리드 (Features)</button>
                <button class="ps-dropdown-item" data-web-tpl="cta_banner">🎯 전환 유도 CTA 배너 (CTA Banner)</button>
                <button class="ps-dropdown-item" data-web-tpl="footer">📄 하단 푸터 (Footer Section)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">📐 반응형 캔버스 규격 전환</div>
                <button class="ps-dropdown-item" data-preset-w="1920" data-preset-h="1080">🖥️ 데스크톱 Full HD (1920 × 1080)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="900">💻 맥북 / 노트북 (1440 × 900)</button>
                <button class="ps-dropdown-item" data-preset-w="768" data-preset-h="1024">📱 태블릿 iPad (768 × 1024)</button>
                <button class="ps-dropdown-item" data-preset-w="390" data-preset-h="844">📱 모바일 스마트폰 (390 × 844)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="3600">📜 세로 롱페이지 웹 (1440 × 3600)</button>
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
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">🖥️ 데스크톱 웹 규격 (Desktop)</div>
                <button class="ps-dropdown-item" data-preset-w="1920" data-preset-h="1080">Full HD 표준 (1920 × 1080)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="900">맥북 / 노트북 (1440 × 900)</button>
                <button class="ps-dropdown-item" data-preset-w="1280" data-preset-h="800">소형 랩탑 (1280 × 800)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">📱 모바일 & 태블릿 (Mobile & Tablet)</div>
                <button class="ps-dropdown-item" data-preset-w="390" data-preset-h="844">iPhone 14/15/16 (390 × 844)</button>
                <button class="ps-dropdown-item" data-preset-w="412" data-preset-h="915">Galaxy S / Android (412 × 915)</button>
                <button class="ps-dropdown-item" data-preset-w="768" data-preset-h="1024">iPad / 태블릿 (768 × 1024)</button>
                <div class="ps-dropdown-sep"></div>
                <div style="padding:4px 14px;font-size:10px;font-weight:700;color:#71717a;">📜 세로 스크롤 롱페이지 웹 (Vertical Long-page)</div>
                <button class="ps-dropdown-item" data-preset-w="1920" data-preset-h="3200">데스크톱 랜딩페이지 (1920 × 3200)</button>
                <button class="ps-dropdown-item" data-preset-w="1440" data-preset-h="4800">포트폴리오 / 쇼핑몰 (1440 × 4800)</button>
                <button class="ps-dropdown-item" data-preset-w="390" data-preset-h="2500">모바일 세로 웹사이트 (390 × 2500)</button>
                <div class="ps-dropdown-sep"></div>
                <button class="ps-dropdown-item" id="mCustomCanvasSize">📐 사용자 정의 크기 직접 입력...</button>
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

      window.addEventListener('mousedown', e => {
        if (!e.target?.closest || !e.target.closest('#topMenuBar')) {
          closeAllMenus();
        }
      });

      window.addEventListener('keydown', e => {
        if (e.key === 'Escape') {
          closeAllMenus();
        }
      });

      // Photoshop Filter Menu Actions
      this.el.querySelectorAll('[data-filter-act]').forEach(btn => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.filterAct;
          const target = this.doc.getSelectedSprite() || this.doc.getSelectedLayer();
          if (!target) {
            alert('필터를 적용할 레이어 또는 스프라이트를 먼저 선택하세요.');
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
            const val = prompt('알파값 / 불투명도 입력 (0 ~ 100):', target.filters.opacity !== undefined ? target.filters.opacity : 100);
            if (val !== null) target.filters.opacity = Math.max(0, Math.min(100, parseFloat(val) || 0));
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
          if (w && h) {
            this.doc.width = w;
            this.doc.height = h;
            this.doc.saveState();
            this.cb.onCanvasResize();
          }
        });
      });

      this.el.querySelector('#mCustomCanvasSize')?.addEventListener('click', () => {
        const curW = this.doc.width || 1440;
        const curH = this.doc.height || 900;
        const wStr = prompt('캔버스 가로 너비(px)를 입력하세요:', curW);
        if (!wStr) return;
        const hStr = prompt('캔버스 세로 높이(px)를 입력하세요 (긴 페이지는 3000~8000 가능):', curH);
        if (!hStr) return;
        const w = parseInt(wStr, 10);
        const h = parseInt(hStr, 10);
        if (w > 0 && h > 0) {
          this.doc.width = w;
          this.doc.height = h;
          this.doc.saveState();
          this.cb.onCanvasResize();
        }
      });

      this.el.querySelector('#winClose')?.addEventListener('click', () => {
        document.title = 'cmd:window_close';
        setTimeout(() => { document.title = 'JSPen Studio'; }, 50);
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
          title: sprite.name + (sprite.linkGroup ? ` (🔗그룹${sprite.linkGroup})` : ''),
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
          const linkStr = sp.linkGroup ? ` (🔗그룹${sp.linkGroup})` : '';
          options += `<option value="${sp.id}" ${isSelected ? 'selected' : ''}>${sp.name}${linkStr}</option>`;
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
          <div class="graph-node ${catClass} ${n.type === 'output_master' ? 'node-output' : ''} ${n.id === this.doc.selectedNodeId ? 'selected' : ''}" id="${n.id}" style="left:${n.x}px; top:${n.y}px;">
            <div class="graph-node-header">
              <span class="graph-node-title">
                <span class="graph-node-badge">${n.badge}</span>
                ${n.title}
              </span>
              <div style="display:flex;align-items:center;gap:6px;">
                <span style="font-size:9px;font-weight:700;color:${isActive ? '#e4e4e7' : '#52525b'};">${isActive ? '● ON' : '○ OFF'}</span>
                ${n.type !== 'output_master' && n.type !== 'output_sprite' ? `<button class="graph-node-close" data-act="del-node" data-node-id="${n.id}">✕</button>` : ''}
              </div>
            </div>
            
            <div class="graph-node-body">
              <div class="graph-ports-col graph-inputs">
                ${mainInputs.map(p => `
                  <div class="graph-port-row">
                    <div class="graph-port graph-port-input port-${p.type || 'flow'}" data-node="${n.id}" data-port="${p.name}" data-type="${p.type || 'flow'}" title="${p.name} (${p.type || 'flow'})"></div>
                    <span class="graph-port-label">${p.name}</span>
                  </div>
                `).join('')}
              </div>

              <div class="graph-ports-col graph-outputs">
                ${mainOutputs.map(p => `
                  <div class="graph-port-row" style="justify-content:flex-end;">
                    <span class="graph-port-label">${p.name}</span>
                    <div class="graph-port graph-port-output port-${p.type || 'flow'}" data-node="${n.id}" data-port="${p.name}" data-type="${p.type || 'flow'}" title="${p.name} (${p.type || 'flow'})"></div>
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
            <div class="graph-port graph-port-input port-float ${aConnected?'port-connected':''}" data-node="${n.id}" data-port="param_inputA" data-type="float" title="값 A 입력 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">값 A:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="inputA" value="${n.params.inputA !== undefined ? n.params.inputA : (n.params.valA || 0)}" ${aConnected?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${bConnected?'port-connected':''}" data-node="${n.id}" data-port="param_inputB" data-type="float" title="값 B 입력 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">값 B:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="inputB" value="${n.params.inputB !== undefined ? n.params.inputB : (n.params.valB !== undefined ? n.params.valB : 1)}" ${bConnected?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.type === 'photoshop_filter') {
        const blurConn = isConnected('param_blur');
        const brightConn = isConnected('param_brightness');
        return `
          <div class="node-inline-control" style="display:flex;align-items:center;margin-bottom:4px;position:relative;">
            <div class="graph-port graph-port-input port-float ${blurConn?'port-connected':''}" data-node="${n.id}" data-port="param_blur" data-type="float" title="블러 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">블러(px):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="blur" step="1" min="0" value="${n.params.blur || 0}" ${blurConn?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${brightConn?'port-connected':''}" data-node="${n.id}" data-port="param_brightness" data-type="float" title="밝기 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">밝기(%):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="brightness" step="5" min="0" value="${n.params.brightness !== undefined ? n.params.brightness : 100}" ${brightConn?'disabled style="opacity:0.6;"':''}>
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
            <div class="graph-port graph-port-input port-float ${stConn?'port-connected':''}" data-node="${n.id}" data-port="param_stiffness" data-type="float" title="강도 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">강도 (Stiffness):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="stiffness" step="0.05" value="${n.params.stiffness !== undefined ? n.params.stiffness : 0.1}" ${stConn?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${dpConn?'port-connected':''}" data-node="${n.id}" data-port="param_damping" data-type="float" title="감쇠 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">감쇠 (Damping):</span>
            <input type="number" class="node-inline-input" data-node-ctrl="damping" step="0.05" value="${n.params.damping !== undefined ? n.params.damping : 0.8}" ${dpConn?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.category === 'motion' || n.type === 'motion_pos') {
        const spdConn = isConnected('param_speed');
        const smConn = isConnected('param_smooth');
        return `
          <div class="node-inline-control" style="display:flex;align-items:center;margin-bottom:4px;position:relative;">
            <div class="graph-port graph-port-input port-float ${spdConn?'port-connected':''}" data-node="${n.id}" data-port="param_speed" data-type="float" title="속도 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">속도:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="speed" step="0.1" value="${n.params.speed || 1}" ${spdConn?'disabled style="opacity:0.6;"':''}>
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${smConn?'port-connected':''}" data-node="${n.id}" data-port="param_smooth" data-type="float" title="스무딩 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">스무딩:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="smooth" step="0.05" min="0" max="1" value="${n.params.smooth || 0.15}" ${smConn?'disabled style="opacity:0.6;"':''}>
          </div>
        `;
      }

      if (n.category === 'color' || n.type === 'color_val') {
        const alpConn = isConnected('param_alpha');
        return `
          <div class="node-inline-control" style="margin-bottom:4px;">
            <span class="node-inline-label">색상:</span>
            <input type="color" class="node-inline-color" data-node-ctrl="color" value="${n.params.color || '#d4d4d8'}">
          </div>
          <div class="node-inline-control" style="display:flex;align-items:center;position:relative;">
            <div class="graph-port graph-port-input port-float ${alpConn?'port-connected':''}" data-node="${n.id}" data-port="param_alpha" data-type="float" title="투명도 소켓" style="position:static;margin-right:6px;flex-shrink:0;"></div>
            <span class="node-inline-label" style="flex:1;">투명도:</span>
            <input type="number" class="node-inline-input" data-node-ctrl="alpha" step="0.1" min="0" max="1" value="${n.params.alpha !== undefined ? n.params.alpha : 1}" ${alpConn?'disabled style="opacity:0.6;"':''}>
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
        let portEl = nodeEl.querySelector(`.graph-port[data-port="${portName}"]`);
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
        alert('나이프 자르기 사용법: Ctrl 키를 누른 상태에서 우클릭 드래그로 전선을 자릅니다.');
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
          color: '🎨 필터 & 시각 (Filter & Visual)',
          combine: '🔀 합성 & 블렌드 (Mix & Combine)',
          output: '📤 출력 (Output)'
        };

        let html = '';
        Object.keys(cats).forEach(catKey => {
          const items = filtered.filter(p => p.cat === catKey);
          if (items.length > 0) {
            html += `<div class="nsm-cat-title">${cats[catKey]}</div>`;
            items.forEach((item, idx) => {
              html += `
                <div class="nsm-item ${idx === 0 && q ? 'highlighted' : ''}" data-type="${item.type}">
                  <div style="display:flex;flex-direction:column;gap:2px;">
                    <div style="font-weight:700;color:#f4f4f5;font-size:11.5px;">${item.name}</div>
                    <div style="font-size:10px;color:#71717a;">${item.desc}</div>
                  </div>
                  <span class="nsm-badge">${item.icon}</span>
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
              <span class="modal-icon" style="font-size:12px;font-weight:700;color:#38bdf8;">⚙</span>
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
            alert('오픈소스 플러그인이 성공적으로 등록되었습니다!');
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
                  <td style="padding:8px 10px;color:#e4e4e7;">${s.name}</td>
                  <td style="padding:8px 10px;">
                    <span class="shortcut-key-badge ${isRec ? 'recording' : ''}" style="${isRec ? 'background:#38bdf8;color:#000;font-weight:700;' : ''}">
                      ${isRec ? '키 입력 대기 중 (ESC 취소)...' : s.key}
                    </span>
                  </td>
                  <td style="padding:8px 10px;text-align:right;">
                    <button class="btn btn-secondary btn-sm btn-edit-shortcut" data-id="${s.id}" style="font-size:10.5px;padding:2px 8px;">
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
      this.el.querySelector('#btnResetShortcuts')?.addEventListener('click', () => {
        if (confirm('모든 단축키를 기본값으로 되돌리시겠습니까?')) {
          localStorage.removeItem('jspen_custom_shortcuts');
          this.shortcuts = JSON.parse(JSON.stringify(this.defaultShortcuts));
          this.render();
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
          JSPen Studio는 오픈소스 생태계를 위해 <code style="color:#38bdf8;">window.JSPen.registerPlugin</code> API를 지원합니다.<br>
          커스텀 모듈 및 도구를 누구나 자바스크립트로 제작하여 추가할 수 있습니다.
        </div>

        <div style="font-weight:700;color:#fff;font-size:12px;margin-bottom:6px;">설치된 플러그인 목록:</div>
        <div style="display:flex;flex-direction:column;gap:8px;margin-bottom:14px;">
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

        <div style="font-weight:700;color:#fff;font-size:12px;margin-bottom:6px;">새 오픈소스 플러그인 코드 추가:</div>
        <textarea class="plugin-code-area" id="txtPluginCode" placeholder="JSPen.registerPlugin({
  id: 'custom_glow',
  name: '네온 글로우 모듈',
  init(api) { ... }
});" style="width:100%;height:100px;background:#141416;border:1px solid #27272a;color:#f4f4f5;font-family:monospace;font-size:11px;padding:8px;border-radius:2px;margin-bottom:8px;"></textarea>
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
            const newW = Math.max(200, Math.min(600, startW - (ev.clientX - startX)));
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
            const newH = Math.max(100, Math.min(500, startH - (ev.clientY - startY)));
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
            const newInspH = Math.max(80, Math.min(rightColH - 100, startInspH + dy));
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
  
  class App {
    constructor() {
      this.canvas = document.getElementById('viewportCanvas');
      this.doc = new DocumentModel();
      this.renderer = new PhotoshopCanvas(this.canvas, this.doc);
      this.moduleEngine = new ModuleEngine(this.doc);
      this.pluginManager = new PluginManager();
      this.isNodeMode = false;

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
        onUpdate: () => this.refreshUI()
      });
      this.inspector = new InspectorPanelUI(document.getElementById('inspectorContainer'), this.doc, {
        onCanvasRender: () => this.renderCanvas(),
        onUpdate: () => this.refreshUI()
      });
      this.timeline = new TimelineUI(document.getElementById('bottomTimeline'), this.doc, {
        onSeek: () => this.renderCanvas(),
        onTogglePreview: () => this.openWebPreviewWindow(),
        get isPreview() { return false; }
      });
      this.dockerManager = new KritaDockerManager(this);
      this.menuBar = new MenuBarUI(document.getElementById('topMenuBar'), this.doc, {
        onExport: () => this.exportModal.show(),
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
      this.nodeEditor = new NodeEditorUI(document.getElementById('nodeEditorContainer'), this.doc, {
        onUpdate: () => {
          this.moduleEngine.activeModuleIds = this.nodeEditor.getActiveModuleIds();
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

    loadProjectFromJSON(jsonObjOrString) {
      try {
        const data = typeof jsonObjOrString === 'string' ? JSON.parse(jsonObjOrString) : jsonObjOrString;
        this.doc.loadFromData(data, true);
        this.refreshUI();
        if (this.isNodeMode) {
          this.nodeEditor.syncFromDoc();
          this.nodeEditor.render();
        }
        return true;
      } catch (err) {
        console.error("Failed to load project:", err);
        return false;
      }
    }

    insertWebsiteTemplate(type) {
      const W = this.doc.width || 1440;
      const layer = this.doc.getSelectedLayer() || this.doc.layers[0];
      if (!layer) return;

      this.doc.transparentBackground = false;
      this.doc.backgroundColor = '#0b0f17';

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
          text: '⚡ Live Interactive Canvas',
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
          text: '🔗 실시간 하이퍼링크\n\n버튼과 배너, 텍스트에 클릭 링크를 삽입하여 바로 실전 웹사이트로 활용하세요.',
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

    generateWebsiteHTML(forExport = false) {
      const doc = this.doc;
      const W = doc.width || 1440;
      const H = doc.height || 900;
      // Artboard background matches the Studio Document background exactly
      const artboardBg = doc.backgroundColor || '#18181b';
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
        let tag = sprite.tag || 'div';
        if (effectiveLinkUrl && tag === 'div') tag = 'a';

        const isLink = !!effectiveLinkUrl || tag === 'a';
        const isBtn = tag === 'button';
        const hrefAttr = effectiveLinkUrl ? `href="${effectiveLinkUrl}" target="${effectiveLinkTarget}" rel="noopener noreferrer"` : '';
        const anchorAttr = effectiveAnchorId ? `id="${effectiveAnchorId}"` : `id="${sprite.id}"`;
        const classAttr = `web-sprite ${effectiveHoverEffect && effectiveHoverEffect !== 'none' ? 'hover-' + effectiveHoverEffect : ''} ${effectiveCustomClass}`.trim();
        const cursorStyle = (isBtn || isLink) ? 'cursor:pointer;' : '';

        let innerContent = '';
        let bgStyle = 'transparent';
        let textColor = '#ffffff';

        if (sprite.type === 'text') {
          innerContent = sprite.text || '';
          bgStyle = 'transparent';
          textColor = sprite.fill || '#ffffff';
        } else if (sprite.type === 'image' && sprite.imageUrl) {
          innerContent = `<img src="${sprite.imageUrl}" style="width:100%;height:100%;object-fit:cover;display:block;border-radius:inherit;" />`;
          bgStyle = 'transparent';
        } else if (sprite.type === 'brush') {
          const pts = sprite.brushStrokePoints || [];
          if (pts.length > 0) {
            let pathD = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
              pathD += ` L ${pts[i].x} ${pts[i].y}`;
            }
            innerContent = `<svg viewBox="-${sprite.width/2} -${sprite.height/2} ${sprite.width} ${sprite.height}" style="width:100%;height:100%;overflow:visible;"><path d="${pathD}" stroke="${sprite.stroke || '#ffffff'}" stroke-width="${sprite.brushSize || 6}" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
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
            innerContent = `<svg viewBox="-${sprite.width/2} -${sprite.height/2} ${sprite.width} ${sprite.height}" style="width:100%;height:100%;overflow:visible;"><path d="${d}" stroke="${sprite.stroke || '#ffffff'}" stroke-width="${sprite.strokeWidth || 2}" fill="none" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
          }
        } else {
          // rect, circle, bevel_rect
          if (sprite.fillType === 'linear-gradient' && sprite.gradient?.stops) {
            const stops = sprite.gradient.stops.map(s => `${s.color} ${Math.round((s.offset || 0) * 100)}%`).join(', ');
            bgStyle = `linear-gradient(135deg, ${stops})`;
          } else if (sprite.fillType !== 'none') {
            bgStyle = sprite.fill || '#38bdf8';
          }
          if (sprite.text) {
            innerContent = sprite.text;
          }
          textColor = sprite.textColor || (isLightColor(sprite.fill) ? '#09090b' : '#ffffff');
        }

        const borderRadius = sprite.type === 'circle' ? '50%' : `${sprite.cornerRadius || 0}px`;
        const stroke = (sprite.strokeWidth && sprite.strokeWidth > 0 && sprite.stroke) ? `${sprite.strokeWidth}px solid ${sprite.stroke}` : 'none';

        // Filters
        const fltrs = [];
        if (sprite.filters) {
          const f = sprite.filters;
          if (f.blur) fltrs.push(`blur(${f.blur}px)`);
          if (f.brightness !== undefined && f.brightness !== 100) fltrs.push(`brightness(${f.brightness}%)`);
          if (f.contrast !== undefined && f.contrast !== 100) fltrs.push(`contrast(${f.contrast}%)`);
          if (f.saturate !== undefined && f.saturate !== 100) fltrs.push(`saturate(${f.saturate}%)`);
          if (f.grayscale) fltrs.push(`grayscale(${f.grayscale}%)`);
          if (f.sepia) fltrs.push(`sepia(${f.sepia}%)`);
          if (f.hueRotate) fltrs.push(`hue-rotate(${f.hueRotate}deg)`);
          if (f.invert) fltrs.push(`invert(${f.invert}%)`);
          if (f.opacity !== undefined && f.opacity !== 100) fltrs.push(`opacity(${f.opacity}%)`);
          if (f.dropShadow) fltrs.push(`drop-shadow(0px 8px 16px rgba(0,0,0,0.4))`);
        }
        const filterStyle = fltrs.length > 0 ? `filter: ${fltrs.join(' ')};` : '';

        // Clipping Mask in Web Preview
        let clipStyle = '';
        if (sprite.maskMode === 'clip_mask') {
          if (sprite.type === 'circle') clipStyle = 'clip-path: circle(50% at 50% 50%); -webkit-clip-path: circle(50% at 50% 50%);';
          else if (sprite.cornerRadius) clipStyle = `clip-path: inset(0 round ${sprite.cornerRadius}px); -webkit-clip-path: inset(0 round ${sprite.cornerRadius}px);`;
        }

        // Coordinates: Center (x, y) translated to CSS Top-Left (x - w/2, y - h/2)
        const leftPos = Math.round(sprite.x - sprite.width / 2);
        const topPos = Math.round(sprite.y - sprite.height / 2);

        const textAlign = sprite.textAlign || 'center';
        const justify = textAlign === 'left' ? 'flex-start' : (textAlign === 'right' ? 'flex-end' : 'center');
        const padding = sprite.type === 'text' ? '0' : '8px 16px';

        elementsHtml += `
          <${tag} class="${classAttr}" ${anchorAttr} ${hrefAttr} style="
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
            font-family: ${sprite.fontFamily || '-apple-system, BlinkMacSystemFont, "Pretendard", "Segoe UI", Roboto, sans-serif'};
            font-size: ${sprite.fontSize || 16}px;
            font-weight: ${sprite.fontWeight || 'normal'};
            text-align: ${textAlign};
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.35;
            user-select: none;
            text-decoration: none;
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          ">${innerContent}</${tag}>
        `;
      });

      return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.name} - JSPen Website</title>
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
      overflow-y: auto;
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
      transition: width 0.3s cubic-bezier(0.16, 1, 0.3, 1);
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
  </style>
</head>
<body>
  <div id="webArtboard">
    ${elementsHtml}
  </div>

  <script>
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
      const htmlContent = '<!DOCTYPE html>
' + clone.outerHTML;
      const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'index.html';
      a.click();
    }

    function copyCode() {
      const clone = document.documentElement.cloneNode(true);
      navigator.clipboard.writeText('<!DOCTYPE html>
' + clone.outerHTML).then(() => {
        alert('HTML 코드가 클립보드에 복사되었습니다! 실제 웹 프로젝트에 붙여넣기 하세요.');
      });
    }
  </script>
</body>
</html>`;
    }

    openWebPreviewWindow() {
      const previewHtml = this.generateWebsiteHTML(false);
      const blob = new Blob([previewHtml], { type: 'text/html;charset=utf-8' });
      const blobUrl = URL.createObjectURL(blob);
      const previewWin = window.open(blobUrl, '_blank', 'width=1500,height=960');
      if (!previewWin || previewWin.closed) {
        const a = document.createElement('a');
        a.href = blobUrl;
        a.target = '_blank';
        a.click();
      }
    }

    copyWebsiteCode() {
      const exportHtml = this.generateWebsiteHTML(true);
      navigator.clipboard.writeText(exportHtml).then(() => {
        alert('웹사이트 전체 HTML 코드가 클립보드에 복사되었습니다!');
      }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = exportHtml;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        alert('웹사이트 전체 HTML 코드가 클립보드에 복사되었습니다!');
      });
    }

    exportWebsiteFiles() {
      const exportHtml = this.generateWebsiteHTML(true);
      const blob = new Blob([exportHtml], { type: 'text/html;charset=utf-8' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (this.doc.name || 'website').replace(/\s+/g, '_') + '.html';
      a.click();
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
              this.loadProjectFromJSON(ev.target.result);
            };
            reader.readAsText(file);
          }
        }
      });

      window.addEventListener('wheel', e => {
        if (e.ctrlKey) {
          e.preventDefault();
        }
      }, { passive: false });

      window.addEventListener('keydown', e => {
        if (e.ctrlKey && (e.key === '=' || e.key === '-' || e.key === '+' || e.key === '0')) {
          e.preventDefault();
        }
      });

      // Hyperlink Click Navigation (Preview Mode & Ctrl+Click in Edit Mode)
      this.canvas.addEventListener('click', e => {
        const r = this.canvas.getBoundingClientRect();
        const ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        const mw = this.renderer.screenToWorld(ms.x, ms.y);
        const clickedSprite = this.doc.hitTestSprite(mw.x, mw.y);

        if (clickedSprite) {
          // Check for active Hyperlink Modifier first (Blender modifier style), fallback to sprite.linkUrl
          const linkMod = (clickedSprite.modules || []).find(m => m.enabled && m.type === 'hyperlink');
          const href = (linkMod ? linkMod.params?.url : clickedSprite.linkUrl)?.trim();
          const target = (linkMod ? linkMod.params?.target : clickedSprite.linkTarget) || '_blank';
          const trigger = linkMod ? (linkMod.params?.trigger || 'click') : 'click';

          if (href && (trigger === 'click' || !linkMod)) {
            if (this.moduleEngine.active || e.ctrlKey || e.metaKey) {
              e.preventDefault();
              if (href.startsWith('#')) {
                const targetId = href.slice(1);
                const targetSp = this.doc.layers.flatMap(l => l.sprites).find(s => s.anchorId === targetId || s.id === targetId);
                if (targetSp) {
                  this.renderer.panY = -(targetSp.y - 120);
                  this.renderCanvas();
                }
              } else {
                window.open(href, target);
              }
            }
          }
        }
      });

      this.canvas.addEventListener('mousedown', e => {
        const r = this.canvas.getBoundingClientRect();
        ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        mw = this.renderer.screenToWorld(ms.x, ms.y);
        isDown = true;

        if (this.tools.activeTool === 'hand' || e.spaceKey || e.button === 1) {
          isPanning = true;
          panStart = { x: e.clientX, y: e.clientY };
          initPan = { x: this.renderer.panX, y: this.renderer.panY };
          return;
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
        const r = this.canvas.getBoundingClientRect();
        ms = { x: e.clientX - r.left, y: e.clientY - r.top };
        mw = this.renderer.screenToWorld(ms.x, ms.y);

        // Pointer cursor for hyperlinks during preview mode
        if (this.moduleEngine.active) {
          const hoveredSp = this.doc.hitTestSprite(mw.x, mw.y);
          const hasLinkMod = hoveredSp && (hoveredSp.modules || []).some(m => m.enabled && m.type === 'hyperlink' && m.params?.url);
          const hasDirectLink = hoveredSp && !!hoveredSp.linkUrl;
          if (hasLinkMod || hasDirectLink) {
            this.canvas.style.cursor = 'pointer';
          } else {
            this.canvas.style.cursor = 'default';
          }
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

        if (!isDown) return;

        if (isPanning) {
          const dx = e.clientX - panStart.x;
          const dy = e.clientY - panStart.y;
          this.renderer.panX = initPan.x + dx;
          this.renderer.panY = initPan.y + dy;
          this.renderCanvas();
          return;
        }

        if (this.transformBox.mode) {
          this.transformBox.drag(mw.x, mw.y, e.shiftKey);
          this.renderCanvas();
          return;
        }

        this.tools.handleMouseMove(mw.x, mw.y);
      });

      window.addEventListener('mouseup', () => {
        isDown = false;
        if (isPanning) isPanning = false;
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
        const isInput = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName);

        const undoKey = this.settingsModal?.getShortcutKey('undo') || 'Ctrl + Z';
        const redoKey = this.settingsModal?.getShortcutKey('redo') || 'Ctrl + Y';
        const prevKey = this.settingsModal?.getShortcutKey('preview') || 'Ctrl + Space';
        const nodeKey = this.settingsModal?.getShortcutKey('nodeMode') || 'Shift + Tab';
        const selKey  = this.settingsModal?.getShortcutKey('selectAll') || 'Ctrl + A';
        const copyKey = this.settingsModal?.getShortcutKey('copy') || 'Ctrl + C';
        const pasteKey= this.settingsModal?.getShortcutKey('paste') || 'Ctrl + V';
        const renKey  = this.settingsModal?.getShortcutKey('rename') || 'F2';
        const deleteKey = this.settingsModal?.getShortcutKey('delete') || 'Delete';

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

        // 3. Web Preview (Alt + W or Ctrl + Space)
        if (checkShortcutMatch(e, 'Alt + W') || (e.altKey && (e.key === 'w' || e.key === 'W')) || checkShortcutMatch(e, prevKey) || (e.ctrlKey && e.code === 'Space')) {
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
        else if (k === 'u') this.tools.setTool('shape');
        else if (k === 't') this.tools.setTool('text');
        else if (k === 'i') this.tools.setTool('eyedropper');
        else if (k === 'z') this.tools.setTool('zoom');
        else if (e.code === 'Space' && !e.ctrlKey) {
          e.preventDefault();
          if (document.activeElement && document.activeElement !== document.body) {
            document.activeElement.blur();
          }
          this.doc.isPlaying = !this.doc.isPlaying;
          this.timeline.render();
          return;
        }
        else if (k === 'h') this.tools.setTool('hand');
        else if (e.ctrlKey && k === 'e') { e.preventDefault(); this.exportModal.show(); }
        else if (e.ctrlKey && k === 's') { e.preventDefault(); document.title = 'cmd:save'; setTimeout(() => { document.title = 'JSPen Studio'; }, 100); }
        else if (e.ctrlKey && k === 'o') { e.preventDefault(); document.title = 'cmd:open'; setTimeout(() => { document.title = 'JSPen Studio'; }, 100); }
        else if (e.key === 'Enter' || e.key === 'Escape') {
          if (this.tools.activeTool === 'curve' && this.tools.activeCurvePoints.length > 1) {
            e.preventDefault();
            this.tools.commitCurvePath(e.key === 'Enter');
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
  window.MODULE_REGISTRY = MODULE_REGISTRY;

  window.addEventListener('DOMContentLoaded', () => {
    window.jspenApp = new App();
  });
})();
