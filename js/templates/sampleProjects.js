/**
 * Sample projects for beginners to explore and learn immediately.
 */

export const SAMPLE_PROJECTS = {
  bounce_game: {
    name: '벽돌 바운스 미니게임',
    width: 800,
    height: 600,
    backgroundColor: '#0f172a',
    variables: [
      { name: 'score', value: 0, initial: 0 },
      { name: 'lives', value: 3, initial: 3 }
    ],
    sprites: [
      // Paddle
      {
        id: 'paddle',
        name: '플레이어 패들',
        type: 'rect',
        x: 400,
        y: 550,
        width: 140,
        height: 20,
        cornerRadius: 10,
        fill: '#38bdf8',
        stroke: '#0284c7',
        strokeWidth: 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 1,
        movements: [
          {
            id: 'm_paddle_kb',
            type: 'keyboard',
            enabled: true,
            params: { speed: 450, controls: 'both', clampToScreen: true }
          }
        ],
        interactions: []
      },
      // Ball
      {
        id: 'ball',
        name: '바운싱 볼',
        type: 'circle',
        x: 400,
        y: 350,
        width: 24,
        height: 24,
        fill: '#f59e0b',
        stroke: '#d97706',
        strokeWidth: 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
        visible: true,
        zIndex: 2,
        movements: [
          {
            id: 'm_ball_bounce',
            type: 'bounce',
            enabled: true,
            params: { speed: 5, angle: 55 }
          }
        ],
        interactions: [
          {
            id: 'i_ball_paddle',
            trigger: 'collision',
            triggerParams: { targetId: 'paddle' },
            action: 'bounceOff',
            actionParams: {}
          },
          {
            id: 'i_ball_paddle_sfx',
            trigger: 'collision',
            triggerParams: { targetId: 'paddle' },
            action: 'playSound',
            actionParams: { sound: 'jump' }
          }
        ]
      },
      // Target Bricks
      {
        id: 'brick_1',
        name: '금빛 블록 1',
        type: 'rect',
        x: 200,
        y: 120,
        width: 90,
        height: 35,
        cornerRadius: 6,
        fill: '#ef4444',
        stroke: '#b91c1c',
        strokeWidth: 2,
        zIndex: 3,
        movements: [],
        interactions: [
          {
            id: 'i_hit1',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'destroy',
            actionParams: {}
          },
          {
            id: 'i_hit1_sfx',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'playSound',
            actionParams: { sound: 'coin' }
          },
          {
            id: 'i_hit1_score',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'addScore',
            actionParams: { variable: 'score', amount: 10 }
          }
        ]
      },
      {
        id: 'brick_2',
        name: '금빛 블록 2',
        type: 'rect',
        x: 320,
        y: 120,
        width: 90,
        height: 35,
        cornerRadius: 6,
        fill: '#10b981',
        stroke: '#047857',
        strokeWidth: 2,
        zIndex: 4,
        movements: [],
        interactions: [
          {
            id: 'i_hit2',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'destroy',
            actionParams: {}
          },
          {
            id: 'i_hit2_sfx',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'playSound',
            actionParams: { sound: 'coin' }
          },
          {
            id: 'i_hit2_score',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'addScore',
            actionParams: { variable: 'score', amount: 10 }
          }
        ]
      },
      {
        id: 'brick_3',
        name: '금빛 블록 3',
        type: 'rect',
        x: 440,
        y: 120,
        width: 90,
        height: 35,
        cornerRadius: 6,
        fill: '#8b5cf6',
        stroke: '#6d28d9',
        strokeWidth: 2,
        zIndex: 5,
        movements: [],
        interactions: [
          {
            id: 'i_hit3',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'destroy',
            actionParams: {}
          },
          {
            id: 'i_hit3_sfx',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'playSound',
            actionParams: { sound: 'coin' }
          },
          {
            id: 'i_hit3_score',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'addScore',
            actionParams: { variable: 'score', amount: 10 }
          }
        ]
      },
      {
        id: 'brick_4',
        name: '금빛 블록 4',
        type: 'rect',
        x: 560,
        y: 120,
        width: 90,
        height: 35,
        cornerRadius: 6,
        fill: '#f59e0b',
        stroke: '#b45309',
        strokeWidth: 2,
        zIndex: 6,
        movements: [],
        interactions: [
          {
            id: 'i_hit4',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'destroy',
            actionParams: {}
          },
          {
            id: 'i_hit4_sfx',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'playSound',
            actionParams: { sound: 'coin' }
          },
          {
            id: 'i_hit4_score',
            trigger: 'collision',
            triggerParams: { targetId: 'ball' },
            action: 'addScore',
            actionParams: { variable: 'score', amount: 10 }
          }
        ]
      },
      // Title Guide
      {
        id: 'txt_guide',
        name: '안내 텍스트',
        type: 'text',
        x: 400,
        y: 50,
        text: '방향키(← →)로 패들을 조종해 블록을 맞추세요!',
        fontSize: 18,
        fill: '#94a3b8',
        zIndex: 7,
        movements: [],
        interactions: []
      }
    ]
  },

  space_collector: {
    name: '우주 별 수집가',
    width: 800,
    height: 600,
    backgroundColor: '#030712',
    variables: [
      { name: 'score', value: 0, initial: 0 }
    ],
    sprites: [
      {
        id: 'spaceship',
        name: '우주선',
        type: 'triangle',
        x: 400,
        y: 480,
        width: 44,
        height: 54,
        fill: '#06b6d4',
        stroke: '#22d3ee',
        strokeWidth: 2,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        zIndex: 1,
        movements: [
          {
            id: 'm_ship_kb',
            type: 'keyboard',
            enabled: true,
            params: { speed: 300, controls: 'both', clampToScreen: true }
          }
        ],
        interactions: []
      },
      {
        id: 'star_coin',
        name: '빛나는 황금 별',
        type: 'star',
        x: 400,
        y: 180,
        width: 50,
        height: 50,
        fill: '#fbbf24',
        stroke: '#f59e0b',
        strokeWidth: 2,
        zIndex: 2,
        movements: [
          {
            id: 'm_star_rot',
            type: 'rotate',
            enabled: true,
            params: { speed: 120 }
          }
        ],
        interactions: [
          {
            id: 'i_star_touch',
            trigger: 'collision',
            triggerParams: { targetId: 'spaceship' },
            action: 'teleport',
            actionParams: {}
          },
          {
            id: 'i_star_sfx',
            trigger: 'collision',
            triggerParams: { targetId: 'spaceship' },
            action: 'playSound',
            actionParams: { sound: 'coin' }
          },
          {
            id: 'i_star_score',
            trigger: 'collision',
            triggerParams: { targetId: 'spaceship' },
            action: 'addScore',
            actionParams: { variable: 'score', amount: 1 }
          }
        ]
      },
      {
        id: 'patrol_enemy',
        name: '순찰하는 드론',
        type: 'circle',
        x: 400,
        y: 300,
        width: 36,
        height: 36,
        fill: '#ef4444',
        stroke: '#dc2626',
        strokeWidth: 3,
        zIndex: 3,
        movements: [
          {
            id: 'm_patrol',
            type: 'patrol',
            enabled: true,
            params: { speed: 200, distance: 220, axis: 'x' }
          }
        ],
        interactions: [
          {
            id: 'i_enemy_hit',
            trigger: 'collision',
            triggerParams: { targetId: 'spaceship' },
            action: 'playSound',
            actionParams: { sound: 'hit' }
          }
        ]
      }
    ]
  },

  interactive_clicker: {
    name: '인터랙티브 클릭 토이',
    width: 800,
    height: 600,
    backgroundColor: '#1e1b4b',
    variables: [
      { name: 'clicks', value: 0, initial: 0 }
    ],
    sprites: [
      {
        id: 'slime',
        name: '슬라임 캐릭터',
        type: 'circle',
        x: 400,
        y: 280,
        width: 120,
        height: 120,
        fill: '#a855f7',
        stroke: '#c084fc',
        strokeWidth: 4,
        zIndex: 1,
        movements: [
          {
            id: 'm_slime_rot',
            type: 'rotate',
            enabled: true,
            params: { speed: 40 }
          }
        ],
        interactions: [
          {
            id: 'i_slime_click_sfx',
            trigger: 'click',
            triggerParams: {},
            action: 'playSound',
            actionParams: { sound: 'powerup' }
          },
          {
            id: 'i_slime_click_score',
            trigger: 'click',
            triggerParams: {},
            action: 'addScore',
            actionParams: { variable: 'clicks', amount: 1 }
          },
          {
            id: 'i_slime_scale',
            trigger: 'click',
            triggerParams: {},
            action: 'scale',
            actionParams: { scale: 1.05 }
          }
        ]
      },
      {
        id: 'txt_click_hint',
        name: '안내 텍스트',
        type: 'text',
        x: 400,
        y: 420,
        text: '👉 슬라임을 클릭해보세요! (크기가 커지고 소리가 납니다)',
        fontSize: 20,
        fill: '#e2e8f0',
        zIndex: 2,
        movements: [],
        interactions: []
      }
    ]
  }
};
