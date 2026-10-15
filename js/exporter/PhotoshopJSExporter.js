/**
 * Photoshop JS Exporter
 * Generates standalone, zero-dependency, pure Vanilla JavaScript (Canvas 2D) code
 * with reactive module pipeline (sensors, links, motions, particles).
 */
export class PhotoshopJSExporter {
  static generateJS(doc) {
    const layersJson = JSON.stringify(doc.layers.map(l => l.toJSON()), null, 2);

    return `/**
 * JSPen Studio - 순수 자바스크립트 HTML5 Canvas 애플리케이션
 * 아트보드: ${doc.width} x ${doc.height}
 * 레이어 수: ${doc.layers.length}개
 * 생성 일시: ${new Date().toLocaleString()}
 */

(function () {
  // 1. 캔버스 및 2D 컨텍스트 초기화
  const canvas = document.getElementById('canvas') || (() => {
    const c = document.createElement('canvas');
    c.id = 'canvas';
    document.body.appendChild(c);
    return c;
  })();

  const ctx = canvas.getContext('2d');
  canvas.width = ${doc.width};
  canvas.height = ${doc.height};

  // 2. 센서 버스 및 상태 관리
  const bus = {
    mouse: { x: ${doc.width / 2}, y: ${doc.height / 2}, vx: 0, vy: 0, isDown: false, clicked: false },
    scroll: { progress: 0, deltaY: 0 },
    time: 0,
    particles: []
  };

  // 3. 내장 Web Audio API 효과음 신디사이저
  const sound = {
    ctx: null,
    play(type) {
      try {
        if (!this.ctx && (window.AudioContext || window.webkitAudioContext)) {
          this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        }
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
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
          osc.start(t);
          osc.stop(t + 0.3);
        } else if (type === 'jump') {
          osc.type = 'square';
          osc.frequency.setValueAtTime(150, t);
          osc.frequency.exponentialRampToValueAtTime(450, t + 0.15);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
          osc.start(t);
          osc.stop(t + 0.2);
        } else {
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, t);
          gain.gain.setValueAtTime(0.15, t);
          gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
          osc.start(t);
          osc.stop(t + 0.08);
        }
      } catch (e) {}
    }
  };

  // 4. 레이어 정의
  const rawLayers = ${layersJson};

  const layers = rawLayers.map(data => ({
    ...data,
    runtime: {
      x: data.x,
      y: data.y,
      rotation: data.rotation,
      scaleX: data.scaleX,
      scaleY: data.scaleY,
      opacity: data.opacity,
      tiltAngle: 0,
      vx: 0,
      vy: 0,
      isHovered: false
    },
    imageElement: null
  }));

  // 이미지 비동기 로딩
  layers.forEach(l => {
    if (l.type === 'image' && l.imageUrl) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = l.imageUrl;
      l.imageElement = img;
    }
  });

  // 5. 마우스 및 휠 이벤트 리스너 등록
  let prevMx = bus.mouse.x, prevMy = bus.mouse.y;

  const getCanvasMouse = e => {
    const r = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - r.left) * (canvas.width / r.width),
      y: (e.clientY - r.top) * (canvas.height / r.height)
    };
  };

  window.addEventListener('mousemove', e => {
    const pos = getCanvasMouse(e);
    bus.mouse.x = pos.x;
    bus.mouse.y = pos.y;
  });

  window.addEventListener('mousedown', e => {
    const pos = getCanvasMouse(e);
    bus.mouse.x = pos.x;
    bus.mouse.y = pos.y;
    bus.mouse.isDown = true;
    bus.mouse.clicked = true;
  });

  window.addEventListener('mouseup', () => {
    bus.mouse.isDown = false;
  });

  window.addEventListener('wheel', e => {
    bus.scroll.deltaY = e.deltaY;
    bus.scroll.progress = Math.max(0, Math.min(1, bus.scroll.progress + e.deltaY * 0.001));
  }, { passive: true });

  // 6. 감지 헬퍼
  function isPointInLayer(px, py, layer) {
    const hw = (layer.width * layer.runtime.scaleX) / 2;
    const hh = (layer.height * layer.runtime.scaleY) / 2;
    const rad = (-layer.runtime.rotation * Math.PI) / 180;
    const dx = px - layer.runtime.x;
    const dy = py - layer.runtime.y;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (layer.type === 'circle') {
      const r = Math.max(hw, hh);
      return lx * lx + ly * ly <= r * r;
    }
    return Math.abs(lx) <= hw && Math.abs(ly) <= hh;
  }

  // 7. 모듈 실행 파이프라인
  let draggedLayer = null;
  let dragOffset = { x: 0, y: 0 };
  let lastTime = performance.now();

  function update() {
    const now = performance.now();
    const dt = Math.min((now - lastTime) / 1000, 0.1);
    lastTime = now;
    bus.time += dt;

    bus.mouse.vx = (bus.mouse.x - prevMx) / dt;
    bus.mouse.vy = (bus.mouse.y - prevMy) / dt;
    prevMx = bus.mouse.x;
    prevMy = bus.mouse.y;

    // 자유 드래그
    if (draggedLayer) {
      if (bus.mouse.isDown) {
        draggedLayer.runtime.x = bus.mouse.x - dragOffset.x;
        draggedLayer.runtime.y = bus.mouse.y - dragOffset.y;
      } else {
        draggedLayer = null;
      }
    }

    // 각 레이어의 모듈 처리
    for (const layer of layers) {
      if (!layer.visible) continue;
      layer.runtime.isHovered = isPointInLayer(bus.mouse.x, bus.mouse.y, layer);

      for (const mod of (layer.modules || [])) {
        if (!mod.enabled) continue;
        const p = mod.params || {};

        switch (mod.type) {
          case 'draggable':
            if (bus.mouse.clicked && !draggedLayer && layer.runtime.isHovered) {
              draggedLayer = layer;
              dragOffset = { x: bus.mouse.x - layer.runtime.x, y: bus.mouse.y - layer.runtime.y };
            }
            break;

          case 'follow_target': {
            const target = layers.find(l => l.id === p.targetLayerId);
            if (target) {
              const tx = target.runtime.x + (p.offsetX || 0);
              const ty = target.runtime.y + (p.offsetY || 0);
              const stiffness = p.stiffness || 0.08;
              const damping = p.damping || 0.85;
              layer.runtime.vx = ((layer.runtime.vx || 0) + (tx - layer.runtime.x) * stiffness) * damping;
              layer.runtime.vy = ((layer.runtime.vy || 0) + (ty - layer.runtime.y) * stiffness) * damping;
              layer.runtime.x += layer.runtime.vx;
              layer.runtime.y += layer.runtime.vy;
            }
            break;
          }

          case 'look_at': {
            let tx = bus.mouse.x, ty = bus.mouse.y;
            if (p.targetType === 'layer' && p.targetLayerId) {
              const target = layers.find(l => l.id === p.targetLayerId);
              if (target) { tx = target.runtime.x; ty = target.runtime.y; }
            }
            const deg = (Math.atan2(ty - layer.runtime.y, tx - layer.runtime.x) * 180 / Math.PI) + (p.rotationOffset || 0);
            layer.runtime.rotation = deg;
            break;
          }

          case 'value_remapper': {
            let inVal = 0;
            if (p.inputSource === 'mouse_x') inVal = bus.mouse.x;
            else if (p.inputSource === 'mouse_y') inVal = bus.mouse.y;
            else if (p.inputSource === 'scroll') inVal = bus.scroll.progress;
            else inVal = bus.time;

            const norm = Math.max(0, Math.min(1, (inVal - (p.inMin || 0)) / ((p.inMax || 800) - (p.inMin || 0))));
            const out = (p.outMin || 0) + norm * ((p.outMax || 100) - (p.outMin || 0));
            const prop = p.outputProperty || 'rotation';
            if (prop in layer.runtime) layer.runtime[prop] = out;
            break;
          }

          case 'parallax_3d_tilt': {
            const cx = canvas.width / 2;
            const normX = Math.max(-1, Math.min(1, (bus.mouse.x - cx) / cx));
            layer.runtime.tiltAngle = normX * (p.maxAngle || 25);
            break;
          }

          case 'particle_emitter': {
            let emit = (p.trigger === 'continuous') ||
                       (p.trigger === 'click' && bus.mouse.clicked && layer.runtime.isHovered) ||
                       (p.trigger === 'move' && Math.hypot(bus.mouse.vx, bus.mouse.vy) > 80);

            if (emit && Math.random() < 0.6) {
              for (let k = 0; k < (p.count || 3); k++) {
                const angle = Math.random() * Math.PI * 2;
                const spd = (p.speed || 3) * (0.5 + Math.random());
                bus.particles.push({
                  x: layer.runtime.x + (Math.random() - 0.5) * layer.width * 0.4,
                  y: layer.runtime.y + (Math.random() - 0.5) * layer.height * 0.4,
                  vx: Math.cos(angle) * spd,
                  vy: Math.sin(angle) * spd,
                  life: 1,
                  maxLife: p.lifetime || 0.8,
                  color: p.color || '#fbbf24',
                  size: 3 + Math.random() * 3
                });
              }
            }
            break;
          }

          case 'floating_wave': {
            const ampY = p.amplitudeY !== undefined ? p.amplitudeY : 15;
            const freq = p.frequency || 1.5;
            layer.runtime.y = (layer.y || layer.runtime.y) + Math.sin(bus.time * freq) * ampY;
            break;
          }

          case 'pulse_breathe': {
            const amt = p.scaleAmount || 0.1;
            const freq = p.frequency || 2.0;
            const s = 1 + Math.sin(bus.time * freq) * amt;
            layer.runtime.scaleX = s;
            layer.runtime.scaleY = s;
            break;
          }

          case 'spin_orbit': {
            const spd = p.speed || 60;
            layer.runtime.rotation = (layer.runtime.rotation + spd * dt) % 360;
            break;
          }

          case 'bounce_screen': {
            const hw = (layer.width * layer.runtime.scaleX) / 2;
            const hh = (layer.height * layer.runtime.scaleY) / 2;
            if (layer.runtime.bVx === undefined) { layer.runtime.bVx = p.speedX || 4; layer.runtime.bVy = p.speedY || 4; }
            layer.runtime.x += layer.runtime.bVx;
            layer.runtime.y += layer.runtime.bVy;
            if (layer.runtime.x - hw <= 0) { layer.runtime.x = hw; layer.runtime.bVx = Math.abs(layer.runtime.bVx); }
            else if (layer.runtime.x + hw >= canvas.width) { layer.runtime.x = canvas.width - hw; layer.runtime.bVx = -Math.abs(layer.runtime.bVx); }
            if (layer.runtime.y - hh <= 0) { layer.runtime.y = hh; layer.runtime.bVy = Math.abs(layer.runtime.bVy); }
            else if (layer.runtime.y + hh >= canvas.height) { layer.runtime.y = canvas.height - hh; layer.runtime.bVy = -Math.abs(layer.runtime.bVy); }
            break;
          }

          case 'synth_sfx':
            if (p.trigger === 'click' && bus.mouse.clicked && layer.runtime.isHovered) {
              sound.play(p.sound || 'pop');
            }
            break;
        }
      }
    }

    // 파티클 갱신
    for (let i = bus.particles.length - 1; i >= 0; i--) {
      const pt = bus.particles[i];
      pt.x += pt.vx * dt * 60;
      pt.y += pt.vy * dt * 60;
      pt.life -= dt / (pt.maxLife || 0.8);
      if (pt.life <= 0) bus.particles.splice(i, 1);
    }

    bus.mouse.clicked = false;
  }

  // 8. 렌더링 루프
  function render() {
    ctx.fillStyle = '${doc.backgroundColor}';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 레이어 그리기
    for (const l of layers) {
      if (!l.visible) continue;
      ctx.save();
      ctx.translate(l.runtime.x, l.runtime.y);
      ctx.rotate(((l.runtime.rotation + (l.runtime.tiltAngle || 0)) * Math.PI) / 180);
      ctx.scale(l.runtime.scaleX, l.runtime.scaleY);
      ctx.globalAlpha = Math.max(0, Math.min(1, l.runtime.opacity));

      if (l.blendMode) ctx.globalCompositeOperation = l.blendMode;

      const hw = l.width / 2, hh = l.height / 2;

      // Fill 적용
      if (l.fillType === 'linear-gradient' && l.gradient) {
        const grad = ctx.createLinearGradient(-hw + l.gradient.startX, -hh + l.gradient.startY, -hw + l.gradient.endX, -hh + l.gradient.endY);
        for (const s of l.gradient.stops) grad.addColorStop(s.offset, s.color);
        ctx.fillStyle = grad;
      } else {
        ctx.fillStyle = l.fill || '#38bdf8';
      }

      if (l.type === 'rect') {
        const b = Math.min(l.bevel || 0, hw, hh);
        ctx.beginPath();
        if (b > 0) {
          ctx.moveTo(-hw + b, -hh);
          ctx.lineTo(hw - b, -hh);
          ctx.lineTo(hw, -hh + b);
          ctx.lineTo(hw, hh - b);
          ctx.lineTo(hw - b, hh);
          ctx.lineTo(-hw + b, hh);
          ctx.lineTo(-hw, hh - b);
          ctx.lineTo(-hw, -hh + b);
        } else {
          ctx.rect(-hw, -hh, l.width, l.height);
        }
        ctx.closePath();
        ctx.fill();
        if (l.strokeWidth > 0 && l.stroke) {
          ctx.strokeStyle = l.stroke;
          ctx.lineWidth = l.strokeWidth;
          ctx.stroke();
        }
      } else if (l.type === 'circle') {
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, hw), 0, Math.PI * 2);
        ctx.fill();
        if (l.strokeWidth > 0 && l.stroke) {
          ctx.strokeStyle = l.stroke;
          ctx.lineWidth = l.strokeWidth;
          ctx.stroke();
        }
      } else if (l.type === 'path' && l.pathPoints && l.pathPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(l.pathPoints[0].x, l.pathPoints[0].y);
        for (let i = 1; i < l.pathPoints.length; i++) {
          const pt = l.pathPoints[i], prev = l.pathPoints[i - 1];
          if (pt.isCurve) {
            ctx.bezierCurveTo(prev.cp2x || prev.x, prev.cp2y || prev.y, pt.cp1x || pt.x, pt.cp1y || pt.y, pt.x, pt.y);
          } else {
            ctx.lineTo(pt.x, pt.y);
          }
        }
        if (l.isClosedPath) ctx.closePath();
        if (l.isClosedPath && l.fillType !== 'none') ctx.fill();
        if (l.strokeWidth > 0 && l.stroke) {
          ctx.strokeStyle = l.stroke;
          ctx.lineWidth = l.strokeWidth;
          ctx.stroke();
        }
      } else if (l.type === 'text') {
        ctx.font = \`\${l.fontWeight} \${l.fontSize}px \${l.fontFamily}\`;
        ctx.textAlign = l.textAlign || 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(l.text, 0, 0);
      } else if (l.type === 'image' && l.imageElement && l.imageElement.complete) {
        ctx.drawImage(l.imageElement, -hw, -hh, l.width, l.height);
      }

      ctx.restore();
    }

    // 파티클 그리기
    for (const p of bus.particles) {
      ctx.save();
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function loop() {
    update();
    render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);
})();
`;
  }

  static generateHTML(doc) {
    const jsCode = PhotoshopJSExporter.generateJS(doc);
    return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${doc.name} - JSPen Studio Export</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background-color: #0d0f17;
      color: #f8fafc;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      font-family: -apple-system, BlinkMacSystemFont, "Pretendard", sans-serif;
      overflow: hidden;
    }
    .artboard-container {
      position: relative;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255, 255, 255, 0.08);
    }
    #canvas {
      display: block;
      background-color: ${doc.backgroundColor};
    }
    .caption {
      margin-top: 14px;
      font-size: 13px;
      color: #71717a;
      display: flex;
      gap: 16px;
    }
  </style>
</head>
<body>
  <div class="artboard-container">
    <canvas id="canvas" width="${doc.width}" height="${doc.height}"></canvas>
  </div>
  <div class="caption">
    <span>🎨 <strong>${doc.name}</strong></span>
    <span>Exported with JSPen Studio</span>
  </div>

  <script>
${jsCode}
  </script>
</body>
</html>
`;
  }
}
