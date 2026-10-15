/**
 * Code Generator
 * Converts visual canvas project into readable, modular, zero-dependency Vanilla JavaScript code.
 */
export class CodeGenerator {
  /**
   * Generates pure JavaScript source code
   */
  static generateJS(project) {
    const spritesJson = JSON.stringify(project.sprites.map(s => s.toJSON()), null, 2);
    const variablesJson = JSON.stringify(project.variables, null, 2);

    return `/**
 * JSPen으로 생성된 인터랙티브 자바스크립트 캔버스 애플리케이션
 * 프로젝트명: ${project.name}
 * 캔버스 크기: ${project.width} x ${project.height}
 */

(function () {
  // 1. 캔버스 초기화
  const canvas = document.getElementById('gameCanvas') || (() => {
    const c = document.createElement('canvas');
    c.id = 'gameCanvas';
    document.body.appendChild(c);
    return c;
  })();

  const ctx = canvas.getContext('2d');
  canvas.width = ${project.width};
  canvas.height = ${project.height};

  // 2. 전역 상태 및 변수
  const state = {
    variables: ${variablesJson}.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {}),
    keysDown: {},
    keysPressed: {},
    mouse: { x: 0, y: 0, isDown: false, clicked: false }
  };

  // 3. Web Audio API 내장 효과음 엔진
  class SoundManager {
    constructor() {
      this.ctx = null;
    }
    init() {
      if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    }
    play(type) {
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
        } else if (type === 'hit') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(120, t);
          osc.frequency.linearRampToValueAtTime(40, t + 0.1);
          gain.gain.setValueAtTime(0.25, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc.start(t);
          osc.stop(t + 0.15);
        } else if (type === 'laser') {
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(800, t);
          osc.frequency.exponentialRampToValueAtTime(100, t + 0.15);
          gain.gain.setValueAtTime(0.18, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
          osc.start(t);
          osc.stop(t + 0.15);
        } else if (type === 'powerup') {
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(260, t);
          osc.frequency.linearRampToValueAtTime(520, t + 0.1);
          osc.frequency.linearRampToValueAtTime(780, t + 0.2);
          gain.gain.setValueAtTime(0.2, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.start(t);
          osc.stop(t + 0.3);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t);
          gain.gain.setValueAtTime(0.1, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
          osc.start(t);
          osc.stop(t + 0.05);
        }
      } catch (e) {}
    }
  }
  const sound = new SoundManager();

  // 4. 스프라이트 데이터 정의
  const rawSprites = ${spritesJson};

  const sprites = rawSprites.map(data => {
    const s = {
      ...data,
      runtime: {
        vx: 0,
        vy: 0,
        isGrounded: false,
        patrolDir: 1,
        patrolStart: data.x
      },
      imageElement: null
    };

    // 이미지 스프라이트 로드
    if (s.type === 'image' && s.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = s.imageUrl;
      s.imageElement = img;
    }

    // 바운스/패트롤 초기화
    s.movements.forEach(m => {
      if (!m.enabled) return;
      if (m.type === 'bounce') {
        const speed = m.params.speed || 4;
        const angle = ((m.params.angle !== undefined ? m.params.angle : 45) * Math.PI) / 180;
        s.runtime.vx = Math.cos(angle) * speed;
        s.runtime.vy = Math.sin(angle) * speed;
      } else if (m.type === 'patrol') {
        s.runtime.patrolStart = m.params.axis === 'y' ? s.y : s.x;
      }
    });

    return s;
  });

  // 5. 이벤트 리스너 등록
  window.addEventListener('keydown', e => {
    if (!state.keysDown[e.code]) {
      state.keysPressed[e.code] = true;
    }
    state.keysDown[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', e => {
    state.keysDown[e.code] = false;
  });

  const getCanvasMousePos = e => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  canvas.addEventListener('mousemove', e => {
    const pos = getCanvasMousePos(e);
    state.mouse.x = pos.x;
    state.mouse.y = pos.y;
  });

  canvas.addEventListener('mousedown', e => {
    const pos = getCanvasMousePos(e);
    state.mouse.x = pos.x;
    state.mouse.y = pos.y;
    state.mouse.isDown = true;
    state.mouse.clicked = true;
  });

  window.addEventListener('mouseup', () => {
    state.mouse.isDown = false;
  });

  // 6. 충돌 및 위치 감지 유틸리티
  function isPointInSprite(px, py, s) {
    const halfW = (s.width * s.scaleX) / 2;
    const halfH = (s.height * s.scaleY) / 2;
    const rad = (-s.rotation * Math.PI) / 180;
    const dx = px - s.x;
    const dy = py - s.y;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (s.type === 'circle') {
      const r = Math.max(halfW, halfH);
      return lx * lx + ly * ly <= r * r;
    }
    return Math.abs(lx) <= halfW && Math.abs(ly) <= halfH;
  }

  function checkCollision(a, b) {
    const aHalfW = (a.width * a.scaleX) / 2;
    const aHalfH = (a.height * a.scaleY) / 2;
    const bHalfW = (b.width * b.scaleX) / 2;
    const bHalfH = (b.height * b.scaleY) / 2;
    return Math.abs(a.x - b.x) <= aHalfW + bHalfW && Math.abs(a.y - b.y) <= aHalfH + bHalfH;
  }

  function executeAction(action, params, sprite) {
    if (action === 'playSound') {
      sound.play(params.sound || 'coin');
    } else if (action === 'addScore') {
      const v = params.variable || 'score';
      const amt = params.amount !== undefined ? Number(params.amount) : 1;
      state.variables[v] = (state.variables[v] || 0) + amt;
    } else if (action === 'changeColor') {
      sprite.fill = params.color || '#ef4444';
    } else if (action === 'bounceOff') {
      if (sprite.runtime.vx !== undefined) sprite.runtime.vx *= -1;
      if (sprite.runtime.vy !== undefined) sprite.runtime.vy *= -1;
    } else if (action === 'destroy') {
      sprite.visible = false;
    } else if (action === 'teleport') {
      const pad = 50;
      sprite.x = pad + Math.random() * (canvas.width - pad * 2);
      sprite.y = pad + Math.random() * (canvas.height - pad * 2);
    } else if (action === 'scale') {
      const f = params.scale || 1.1;
      sprite.scaleX *= f;
      sprite.scaleY *= f;
    } else if (action === 'alert') {
      alert(params.message || '이벤트!');
    }
  }

  // 7. 업데이트 루프
  let lastTime = performance.now();

  function update() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;

    // 움직임 계산
    for (const s of sprites) {
      if (!s.visible) continue;

      for (const m of s.movements) {
        if (!m.enabled) continue;

        if (m.type === 'keyboard') {
          const speed = (m.params.speed || 250) * dt;
          let dx = 0, dy = 0;
          if (state.keysDown['ArrowLeft'] || state.keysDown['KeyA']) dx -= 1;
          if (state.keysDown['ArrowRight'] || state.keysDown['KeyD']) dx += 1;
          if (state.keysDown['ArrowUp'] || state.keysDown['KeyW']) dy -= 1;
          if (state.keysDown['ArrowDown'] || state.keysDown['KeyS']) dy += 1;
          if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }
          s.x += dx * speed;
          s.y += dy * speed;

          if (m.params.clampToScreen) {
            const hw = (s.width * s.scaleX) / 2;
            const hh = (s.height * s.scaleY) / 2;
            s.x = Math.max(hw, Math.min(canvas.width - hw, s.x));
            s.y = Math.max(hh, Math.min(canvas.height - hh, s.y));
          }
        } else if (m.type === 'mouse_follow') {
          const spd = m.params.speed || 5;
          s.x += (state.mouse.x - s.x) * Math.min(1, spd * dt);
          s.y += (state.mouse.y - s.y) * Math.min(1, spd * dt);
          if (m.params.rotateTowards) {
            s.rotation = Math.atan2(state.mouse.y - s.y, state.mouse.x - s.x) * (180 / Math.PI);
          }
        } else if (m.type === 'bounce') {
          const hw = (s.width * s.scaleX) / 2;
          const hh = (s.height * s.scaleY) / 2;
          s.x += s.runtime.vx;
          s.y += s.runtime.vy;
          if (s.x - hw <= 0) { s.x = hw; s.runtime.vx = Math.abs(s.runtime.vx); }
          else if (s.x + hw >= canvas.width) { s.x = canvas.width - hw; s.runtime.vx = -Math.abs(s.runtime.vx); }
          if (s.y - hh <= 0) { s.y = hh; s.runtime.vy = Math.abs(s.runtime.vy); }
          else if (s.y + hh >= canvas.height) { s.y = canvas.height - hh; s.runtime.vy = -Math.abs(s.runtime.vy); }
        } else if (m.type === 'rotate') {
          const rSpd = m.params.speed || 90;
          s.rotation = (s.rotation + rSpd * dt) % 360;
        } else if (m.type === 'patrol') {
          const spd = (m.params.speed || 150) * dt;
          const dist = m.params.distance || 150;
          const axis = m.params.axis || 'x';
          if (axis === 'x') {
            s.x += s.runtime.patrolDir * spd;
            if (Math.abs(s.x - s.runtime.patrolStart) >= dist) s.runtime.patrolDir *= -1;
          } else {
            s.y += s.runtime.patrolDir * spd;
            if (Math.abs(s.y - s.runtime.patrolStart) >= dist) s.runtime.patrolDir *= -1;
          }
        } else if (m.type === 'platformer') {
          const grav = (m.params.gravity || 900) * dt;
          const jmp = m.params.jumpForce || 450;
          const spd = (m.params.speed || 200) * dt;
          let h = 0;
          if (state.keysDown['ArrowLeft'] || state.keysDown['KeyA']) h -= 1;
          if (state.keysDown['ArrowRight'] || state.keysDown['KeyD']) h += 1;
          s.x += h * spd;
          s.runtime.vy = (s.runtime.vy || 0) + grav;
          s.y += s.runtime.vy * dt;

          const hh = (s.height * s.scaleY) / 2;
          const floor = canvas.height - hh;
          if (s.y >= floor) {
            s.y = floor;
            s.runtime.vy = 0;
            s.runtime.isGrounded = true;
          } else {
            s.runtime.isGrounded = false;
          }
          if ((state.keysDown['ArrowUp'] || state.keysDown['KeyW'] || state.keysDown['Space']) && s.runtime.isGrounded) {
            s.runtime.vy = -jmp;
            s.runtime.isGrounded = false;
            sound.play('jump');
          }
        } else if (m.type === 'forward') {
          const spd = (m.params.speed || 200) * dt;
          const rad = (s.rotation * Math.PI) / 180;
          s.x += Math.cos(rad) * spd;
          s.y += Math.sin(rad) * spd;
          if (m.params.wrapScreen) {
            const hw = (s.width * s.scaleX) / 2;
            const hh = (s.height * s.scaleY) / 2;
            if (s.x < -hw) s.x = canvas.width + hw;
            if (s.x > canvas.width + hw) s.x = -hw;
            if (s.y < -hh) s.y = canvas.height + hh;
            if (s.y > canvas.height + hh) s.y = -hh;
          }
        }
      }
    }

    // 상호작용 및 이벤트 처리
    for (const s of sprites) {
      if (!s.visible) continue;
      for (const inter of s.interactions) {
        let trigger = false;
        if (inter.trigger === 'click' && state.mouse.clicked && isPointInSprite(state.mouse.x, state.mouse.y, s)) {
          trigger = true;
        } else if (inter.trigger === 'hover' && isPointInSprite(state.mouse.x, state.mouse.y, s)) {
          trigger = true;
        } else if (inter.trigger === 'keydown' && state.keysPressed[inter.triggerParams?.key || 'Space']) {
          trigger = true;
        } else if (inter.trigger === 'collision') {
          const tId = inter.triggerParams?.targetId;
          const targets = tId === 'any' ? sprites.filter(o => o.id !== s.id && o.visible) : sprites.filter(o => o.id === tId && o.visible);
          for (const target of targets) {
            if (checkCollision(s, target)) {
              trigger = true;
              break;
            }
          }
        } else if (inter.trigger === 'tick') {
          trigger = true;
        }

        if (trigger) {
          executeAction(inter.action, inter.actionParams, s);
        }
      }
    }

    state.mouse.clicked = false;
    state.keysPressed = {};
  }

  // 8. 렌더링 루프
  function render() {
    // 배경 지우기
    ctx.fillStyle = '${project.backgroundColor}';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 스프라이트 그리기
    for (const s of sprites) {
      if (!s.visible) continue;
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate((s.rotation * Math.PI) / 180);
      ctx.scale(s.scaleX, s.scaleY);
      ctx.globalAlpha = s.opacity;

      const hw = s.width / 2;
      const hh = s.height / 2;

      if (s.type === 'rect') {
        const r = Math.min(s.cornerRadius || 0, hw, hh);
        ctx.beginPath();
        ctx.moveTo(-hw + r, -hh);
        ctx.arcTo(hw, -hh, hw, hh, r);
        ctx.arcTo(hw, hh, -hw, hh, r);
        ctx.arcTo(-hw, hh, -hw, -hh, r);
        ctx.arcTo(-hw, -hh, hw, -hh, r);
        ctx.closePath();
        if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
        if (s.strokeWidth > 0 && s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; ctx.stroke(); }
      } else if (s.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, hw), 0, Math.PI * 2);
        if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
        if (s.strokeWidth > 0 && s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; ctx.stroke(); }
      } else if (s.type === 'star') {
        let rot = (Math.PI / 2) * 3;
        const step = Math.PI / 5;
        ctx.beginPath();
        ctx.moveTo(0, -hw);
        for (let i = 0; i < 5; i++) {
          ctx.lineTo(Math.cos(rot) * hw, Math.sin(rot) * hw);
          rot += step;
          ctx.lineTo(Math.cos(rot) * (hw * 0.45), Math.sin(rot) * (hw * 0.45));
          rot += step;
        }
        ctx.closePath();
        if (s.fill) { ctx.fillStyle = s.fill; ctx.fill(); }
        if (s.strokeWidth > 0 && s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; ctx.stroke(); }
      } else if (s.type === 'text') {
        ctx.font = \`\${s.fontWeight || 'bold'} \${s.fontSize}px \${s.fontFamily}\`;
        ctx.textAlign = s.textAlign || 'center';
        ctx.textBaseline = 'middle';
        if (s.fill) { ctx.fillStyle = s.fill; ctx.fillText(s.text, 0, 0); }
        if (s.strokeWidth > 0 && s.stroke) { ctx.strokeStyle = s.stroke; ctx.lineWidth = s.strokeWidth; ctx.strokeText(s.text, 0, 0); }
      } else if (s.type === 'image' && s.imageElement && s.imageElement.complete) {
        ctx.drawImage(s.imageElement, -hw, -hh, s.width, s.height);
      }

      ctx.restore();
    }

    // UI HUD 표시
    ctx.save();
    let offsetY = 28;
    for (const [key, val] of Object.entries(state.variables)) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.fillText(\`\${key.toUpperCase()}: \${val}\`, 20, offsetY);
      offsetY += 24;
    }
    ctx.restore();
  }

  // 9. 메인 루프 실행
  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
`;
  }

  /**
   * Generates a complete standalone HTML document containing canvas, styles and the script
   */
  static generateHTML(project) {
    const jsCode = CodeGenerator.generateJS(project);

    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${project.name} - JSPen Canvas</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      background-color: #0b0f19;
      color: #f1f5f9;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      overflow: hidden;
    }
    .game-wrapper {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 20px 40px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1);
    }
    #gameCanvas {
      display: block;
      background-color: ${project.backgroundColor};
    }
    .game-footer {
      margin-top: 16px;
      font-size: 13px;
      color: #64748b;
      display: flex;
      gap: 16px;
      align-items: center;
    }
  </style>
</head>
<body>
  <div class="game-wrapper">
    <canvas id="gameCanvas" width="${project.width}" height="${project.height}"></canvas>
  </div>
  <div class="game-footer">
    <span>🎮 <strong>${project.name}</strong></span>
    <span>Powered by JSPen</span>
  </div>

  <script>
${jsCode}
  </script>
</body>
</html>
`;
  }
}
