/**
 * Registry of 28 all-in-one no-code feature modules.
 * Categorized into: Sensors, Links & Logic, Motions & Visual FX, Timing & Sequence, Audio.
 */
export const MODULE_REGISTRY = {
  // ==========================================
  // 1. Sensors & Inputs (9 Modules)
  // ==========================================
  mouse_tracker: {
    category: 'sensors',
    name: '마우스 위치 추적',
    icon: '🖱️',
    description: '마우스의 X/Y 좌표와 이동 속도를 실시간 감지합니다.',
    defaultParams: {
      speedFactor: 1,
      relativeToCenter: false
    }
  },
  hover_zone: {
    category: 'sensors',
    name: '호버 & 근접 반경 감지',
    icon: '🎯',
    description: '마우스가 레이어 위에 올라오거나 일정 반경(px)에 접근했을 때 반응합니다.',
    defaultParams: {
      proximityRadius: 100, // 0 means exact bounding box hover
      triggerType: 'hover' // 'hover', 'proximity', 'leave'
    }
  },
  click_gesture: {
    category: 'sensors',
    name: '클릭 & 제스처',
    icon: '👆',
    description: '클릭, 더블 클릭, 롱프레스(누르고 있기) 등의 제스처를 감지합니다.',
    defaultParams: {
      gesture: 'click', // 'click', 'dblclick', 'longpress', 'mousedown', 'mouseup'
      longPressDuration: 500
    }
  },
  draggable: {
    category: 'sensors',
    name: '자유 드래그 (Draggable)',
    icon: '🖐️',
    description: '마우스로 집어서 캔버스 위를 자유롭게 드래그 이동할 수 있게 합니다.',
    defaultParams: {
      clampToArtboard: true,
      snapBack: false, // Return to start position on release
      axis: 'both' // 'both', 'x', 'y'
    }
  },
  scroll_wheel: {
    category: 'sensors',
    name: '스크롤 & 마우스 휠',
    icon: '📜',
    description: '마우스 휠 스크롤 양과 진행도를 감지하여 패럴랙스 반응을 만듭니다.',
    defaultParams: {
      sensitivity: 1,
      direction: 'both'
    }
  },
  keyboard: {
    category: 'sensors',
    name: '키보드 단축키',
    icon: '⌨️',
    description: 'Space, Enter, 방향키 등 특정 키가 눌릴 때 반응합니다.',
    defaultParams: {
      key: 'Space', // 'Space', 'Enter', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
      event: 'keydown' // 'keydown', 'keyup'
    }
  },
  collision: {
    category: 'sensors',
    name: '충돌 & 겹침 감지',
    icon: '💥',
    description: '다른 레이어와 닿거나 겹쳤을 때 신호를 발생시킵니다.',
    defaultParams: {
      targetLayerId: 'any',
      mode: 'bounding' // 'bounding', 'radius'
    }
  },
  in_view: {
    category: 'sensors',
    name: '화면 가시성 (In-View)',
    icon: '👁️',
    description: '스크롤 시 캔버스/화면 안에 들어왔을 때 트리거합니다.',
    defaultParams: {
      threshold: 0.2, // 20% visible
      once: false
    }
  },
  timer: {
    category: 'sensors',
    name: '시간 & 크로노',
    icon: '⏱️',
    description: 'N초 후 1회 실행(지연) 또는 N초마다 주기적으로 신호를 발생시킵니다.',
    defaultParams: {
      interval: 1.0, // seconds
      mode: 'repeat' // 'repeat', 'delay_once'
    }
  },

  // ==========================================
  // 2. Links, Relations & Logic (7 Modules)
  // ==========================================
  follow_target: {
    category: 'links',
    name: '타겟 추적 (Follow Target)',
    icon: '🧲',
    description: '지정한 대상 레이어를 탄성 스프링이나 강체로 추적합니다.',
    defaultParams: {
      targetLayerId: '',
      type: 'spring', // 'spring', 'rigid', 'lag'
      stiffness: 0.08, // spring stiffness
      damping: 0.85,    // spring damping
      offsetX: 0,
      offsetY: 0
    }
  },
  look_at: {
    category: 'links',
    name: '타겟 조준 (Look At)',
    icon: '👀',
    description: '대상 레이어 또는 마우스 커서를 향해 각도를 자동 회전시킵니다.',
    defaultParams: {
      targetType: 'mouse', // 'mouse', 'layer'
      targetLayerId: '',
      rotationOffset: 0, // degrees
      smoothSpeed: 10
    }
  },
  distance_constraint: {
    category: 'links',
    name: '거리 제한 로프',
    icon: '🔗',
    description: '두 레이어 사이의 거리를 일정 범위로 묶어 줄/막대 효과를 냅니다.',
    defaultParams: {
      targetLayerId: '',
      maxDistance: 150,
      minDistance: 0
    }
  },
  value_remapper: {
    category: 'links',
    name: '값 매핑기 (수학 환산)',
    icon: '📐',
    description: '입력 수치 범위(예: 마우스X 0~800)를 출력 범위(각도 -30~+30)로 자동 환산합니다.',
    defaultParams: {
      inputSource: 'mouse_x', // 'mouse_x', 'mouse_y', 'scroll', 'time', 'distance'
      inMin: 0,
      inMax: 800,
      outputProperty: 'rotation', // 'rotation', 'x', 'y', 'width', 'height', 'opacity', 'scaleX'
      outMin: -30,
      outMax: 30
    }
  },
  event_relay: {
    category: 'links',
    name: '신호 전달기 (Event Relay)',
    icon: '⚡',
    description: '내가 특정 상태가 되었을 때 대상 레이어의 특정 모듈 동작을 원격 실행합니다.',
    defaultParams: {
      triggerSource: 'click', // 'click', 'hover', 'collision'
      targetLayerId: '',
      actionCommand: 'trigger_tween' // 'trigger_tween', 'toggle_visibility', 'emit_particles'
    }
  },
  state_toggle: {
    category: 'links',
    name: '토글 스위치 (State Toggle)',
    icon: '🔘',
    description: '클릭할 때마다 On/Off 상태를 전환하며 스타일(색상, 위치 등)을 스위칭합니다.',
    defaultParams: {
      stateA_color: '#38bdf8',
      stateB_color: '#10b981',
      stateA_scale: 1,
      stateB_scale: 1.15
    }
  },
  counter: {
    category: 'links',
    name: '숫자 카운터',
    icon: '🔢',
    description: '클릭 시 +1, 충돌 시 -1 등 숫자를 증감시키고 텍스트에 연동합니다.',
    defaultParams: {
      initialValue: 0,
      step: 1,
      targetTextLayerId: ''
    }
  },

  // ==========================================
  // 3. Motions & Visual FX (10 Modules)
  // ==========================================
  property_tween: {
    category: 'motions',
    name: '트윈 보간 모션',
    icon: '↔️',
    description: '위치, 크기, 각도, 투명도를 목표값으로 부드럽게 전환합니다.',
    defaultParams: {
      targetX: 0,
      targetY: 0,
      targetRotation: 0,
      targetScale: 1.2,
      duration: 0.6,
      easing: 'ease-out'
    }
  },
  path_follower: {
    category: 'motions',
    name: '베지어 패스 주행',
    icon: '🛤️',
    description: '펜 도구(P)로 그린 벡터 곡선 경로를 따라 물체가 기차처럼 달립니다.',
    defaultParams: {
      pathLayerId: '',
      speed: 1, // cycles per second
      orientToPath: true, // Auto rotate along tangent
      loop: true
    }
  },
  parallax_3d_tilt: {
    category: 'motions',
    name: '마우스 3D 입체 틸트',
    icon: '🎴',
    description: '마우스 위치에 따라 카드가 3D 원근감 있게 기울어지는 효과를 냅니다.',
    defaultParams: {
      maxAngle: 25,
      perspective: 1000,
      reverse: false
    }
  },
  particle_emitter: {
    category: 'motions',
    name: '파티클 분출기',
    icon: '✨',
    description: '이동하거나 클릭할 때 반짝이 별, 스파크, 연기 입자를 뿜어냅니다.',
    defaultParams: {
      count: 15,
      color: '#fbbf24',
      speed: 3,
      lifetime: 0.8,
      trigger: 'move' // 'move', 'click', 'continuous'
    }
  },
  floating_wave: {
    category: 'motions',
    name: '유기적 부유 모션',
    icon: '🌊',
    description: '물 위에 뜬 배처럼 위아래/좌우로 부드럽게 둥둥 떠 있는 모션입니다.',
    defaultParams: {
      amplitudeX: 0,
      amplitudeY: 15,
      frequency: 1.5 // Speed
    }
  },
  pulse_breathe: {
    category: 'motions',
    name: '두근거림 & 숨쉬기',
    icon: '💓',
    description: '심장박동처럼 크기와 투명도가 은은하게 커졌다 작아지는 유기적 루프입니다.',
    defaultParams: {
      scaleAmount: 0.1, // +10%
      opacityAmount: 0.2,
      frequency: 2.0
    }
  },
  wiggle_shake: {
    category: 'motions',
    name: '진동 & 흔들림',
    icon: '📳',
    description: '자연스러운 젤리 떨림이나 충격 시 덜덜 떨리는 쉐이크 효과입니다.',
    defaultParams: {
      intensity: 8,
      frequency: 15,
      decay: 0.9 // For single shock shake
    }
  },
  spin_orbit: {
    category: 'motions',
    name: '자전 및 공전',
    icon: '🌀',
    description: '제자리 자전 또는 특정 레이어 B를 중심축으로 원형 공전합니다.',
    defaultParams: {
      mode: 'spin', // 'spin', 'orbit'
      orbitTargetId: '',
      orbitRadius: 100,
      speed: 60 // deg per sec
    }
  },
  bounce_screen: {
    category: 'motions',
    name: '화면 벽 튕기기',
    icon: '🏀',
    description: '화면 가장자리 벽에 닿으면 입사각/반사각 물리 법칙으로 튕겨나갑니다.',
    defaultParams: {
      speedX: 4,
      speedY: 4
    }
  },
  rainbow_cycle: {
    category: 'motions',
    name: '무지개 색상 순환',
    icon: '🌈',
    description: '시간이 지남에 따라 채우기 색상이 무지개처럼 서서히 순환합니다.',
    defaultParams: {
      speed: 30, // hue deg per sec
      saturation: 80,
      lightness: 60
    }
  },

  // ==========================================
  // 4. Timing & Sequence (5 Modules)
  // ==========================================
  duration_delay: {
    category: 'timing',
    name: '동작 시간 & 지연',
    icon: '⏳',
    description: '동작 시간(Duration) 및 대기 시간(Delay)을 설정합니다.',
    defaultParams: {
      duration: 0.5, // seconds
      delay: 0.1
    }
  },
  action_sequencer: {
    category: 'timing',
    name: '단계별 시퀀서',
    icon: '📋',
    description: '1단계(이동) ➔ 2단계(대기) ➔ 3단계(회전) 등을 순차적으로 실행합니다.',
    defaultParams: {
      step1: 'move',
      step1_duration: 0.5,
      step2: 'wait',
      step2_duration: 0.2,
      step3: 'rotate',
      step3_duration: 0.5
    }
  },
  stagger_delay: {
    category: 'timing',
    name: '시차 도미노 (Stagger)',
    icon: '🌊',
    description: '여러 레이어가 0.05초 간격을 두고 파도타기하듯 연속 실행됩니다.',
    defaultParams: {
      staggerTime: 0.08
    }
  },
  easing_library: {
    category: 'timing',
    name: '이징 커브 프리셋',
    icon: '📈',
    description: 'Spring 물리 댐핑, Elastic 탄성, Bounce 튕김 등 가감속 곡선을 지정합니다.',
    defaultParams: {
      curve: 'spring', // 'spring', 'elastic', 'bounce', 'ease-in-out', 'linear'
      springStiffness: 100,
      springDamping: 10
    }
  },
  loop_mode: {
    category: 'timing',
    name: '반복 루프 모드',
    icon: '🔁',
    description: '1회 실행(Once), 무한 반복(Infinite), 왕복 재생(Ping-Pong)을 제어합니다.',
    defaultParams: {
      mode: 'infinite' // 'once', 'infinite', 'pingpong'
    }
  },

  // ==========================================
  // 5. Audio & Feedback (2 Modules)
  // ==========================================
  synth_sfx: {
    category: 'audio',
    name: '내장 신디사이저 SFX',
    icon: '🔊',
    description: '외부 파일 없이 즉시 뾱, 찰칵, 딩동, 팝, 스위치 효과음을 합성 재생합니다.',
    defaultParams: {
      sound: 'pop', // 'pop', 'click', 'ding', 'coin', 'jump', 'laser'
      trigger: 'click' // 'click', 'hover', 'signal'
    }
  },
  audio_clip: {
    category: 'audio',
    name: '오디오 파일 재생',
    icon: '🎵',
    description: '로컬 MP3 / WAV 파일을 지정하여 특정 타이밍이나 클릭 시 재생합니다.',
    defaultParams: {
      audioUrl: '',
      volume: 0.8,
      trigger: 'click'
    }
  }
};
