import { SoundEffects } from './SoundEffects.js';

/**
 * Physics and Interaction Engine
 * Drives runtime movements, controls, collisions, and event actions during Play Mode.
 */
export class PhysicsEngine {
  constructor(project) {
    this.project = project;
    this.keysDown = {};
    this.keysPressed = {}; // single-frame edge triggers
    this.mouse = { x: 0, y: 0, isDown: false, clicked: false };
    this.active = false;
    this.lastTime = 0;
    this.boundKeyDown = this.handleKeyDown.bind(this);
    this.boundKeyUp = this.handleKeyUp.bind(this);
    this.listenersAttached = false;
  }

  attachListeners() {
    if (this.listenersAttached) return;
    window.addEventListener('keydown', this.boundKeyDown);
    window.addEventListener('keyup', this.boundKeyUp);
    this.listenersAttached = true;
  }

  detachListeners() {
    if (!this.listenersAttached) return;
    window.removeEventListener('keydown', this.boundKeyDown);
    window.removeEventListener('keyup', this.boundKeyUp);
    this.listenersAttached = false;
    this.keysDown = {};
    this.keysPressed = {};
  }

  handleKeyDown(e) {
    if (!this.active) return;
    const key = e.code;
    if (!this.keysDown[key]) {
      this.keysPressed[key] = true;
    }
    this.keysDown[key] = true;

    // Prevent default scroll on arrow keys or space during game play
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e) {
    if (!this.active) return;
    this.keysDown[e.code] = false;
  }

  start() {
    this.active = true;
    this.attachListeners();
    this.lastTime = performance.now();

    // Reset sprites to initial state
    this.project.sprites.forEach(sprite => {
      sprite.resetRuntime();
      sprite.runtime.initialX = sprite.x;
      sprite.runtime.initialY = sprite.y;
      sprite.runtime.initialRotation = sprite.rotation;
      sprite.runtime.initialFill = sprite.fill;
      sprite.runtime.initialScaleX = sprite.scaleX;
      sprite.runtime.initialScaleY = sprite.scaleY;
      sprite.runtime.initialVisible = sprite.visible;

      // Initialize movement defaults
      sprite.movements.forEach(m => {
        if (!m.enabled) return;
        if (m.type === 'bounce') {
          const speed = m.params.speed || 4;
          const angle = (m.params.angle !== undefined ? m.params.angle : 45) * (Math.PI / 180);
          sprite.runtime.vx = Math.cos(angle) * speed;
          sprite.runtime.vy = Math.sin(angle) * speed;
        } else if (m.type === 'patrol') {
          sprite.runtime.patrolStart = m.params.axis === 'y' ? sprite.y : sprite.x;
          sprite.runtime.patrolDir = 1;
        }
      });
    });

    this.project.resetVariables();
  }

  stop() {
    this.active = false;
    this.detachListeners();

    // Restore sprites initial state
    this.project.sprites.forEach(sprite => {
      if (sprite.runtime.initialX !== undefined) {
        sprite.x = sprite.runtime.initialX;
        sprite.y = sprite.runtime.initialY;
        sprite.rotation = sprite.runtime.initialRotation;
        sprite.fill = sprite.runtime.initialFill || sprite.fill;
        sprite.scaleX = sprite.runtime.initialScaleX || sprite.scaleX;
        sprite.scaleY = sprite.runtime.initialScaleY || sprite.scaleY;
        sprite.visible = sprite.runtime.initialVisible !== undefined ? sprite.runtime.initialVisible : true;
      }
      sprite.resetRuntime();
    });

    this.project.resetVariables();
  }

  update(deltaTime) {
    if (!this.active) return;
    const dt = Math.min(deltaTime, 0.1); // prevent huge delta spikes
    const canvasW = this.project.width;
    const canvasH = this.project.height;

    // 1. Process Movements for each visible sprite
    for (const sprite of this.project.sprites) {
      if (!sprite.visible) continue;

      for (const m of sprite.movements) {
        if (!m.enabled) continue;

        switch (m.type) {
          case 'keyboard': {
            const speed = (m.params.speed || 250) * dt;
            const useArrows = m.params.controls !== 'wasd_only';
            const useWasd = m.params.controls !== 'arrows_only';

            let dx = 0;
            let dy = 0;

            if ((useArrows && this.keysDown['ArrowLeft']) || (useWasd && this.keysDown['KeyA'])) dx -= 1;
            if ((useArrows && this.keysDown['ArrowRight']) || (useWasd && this.keysDown['KeyD'])) dx += 1;
            if ((useArrows && this.keysDown['ArrowUp']) || (useWasd && this.keysDown['KeyW'])) dy -= 1;
            if ((useArrows && this.keysDown['ArrowDown']) || (useWasd && this.keysDown['KeyS'])) dy += 1;

            if (dx !== 0 && dy !== 0) {
              // Normalize diagonal movement
              dx *= 0.7071;
              dy *= 0.7071;
            }

            sprite.x += dx * speed;
            sprite.y += dy * speed;

            // Optional clamp to canvas boundary
            if (m.params.clampToScreen) {
              const halfW = (sprite.width * sprite.scaleX) / 2;
              const halfH = (sprite.height * sprite.scaleY) / 2;
              sprite.x = Math.max(halfW, Math.min(canvasW - halfW, sprite.x));
              sprite.y = Math.max(halfH, Math.min(canvasH - halfH, sprite.y));
            }
            break;
          }

          case 'mouse_follow': {
            const lerpSpeed = m.params.speed || 5;
            sprite.x += (this.mouse.x - sprite.x) * Math.min(1, lerpSpeed * dt);
            sprite.y += (this.mouse.y - sprite.y) * Math.min(1, lerpSpeed * dt);
            if (m.params.rotateTowards) {
              const angle = Math.atan2(this.mouse.y - sprite.y, this.mouse.x - sprite.x) * (180 / Math.PI);
              sprite.rotation = angle;
            }
            break;
          }

          case 'bounce': {
            const halfW = (sprite.width * sprite.scaleX) / 2;
            const halfH = (sprite.height * sprite.scaleY) / 2;

            sprite.x += sprite.runtime.vx;
            sprite.y += sprite.runtime.vy;

            // Bounce off edges
            if (sprite.x - halfW <= 0) {
              sprite.x = halfW;
              sprite.runtime.vx = Math.abs(sprite.runtime.vx);
            } else if (sprite.x + halfW >= canvasW) {
              sprite.x = canvasW - halfW;
              sprite.runtime.vx = -Math.abs(sprite.runtime.vx);
            }

            if (sprite.y - halfH <= 0) {
              sprite.y = halfH;
              sprite.runtime.vy = Math.abs(sprite.runtime.vy);
            } else if (sprite.y + halfH >= canvasH) {
              sprite.y = canvasH - halfH;
              sprite.runtime.vy = -Math.abs(sprite.runtime.vy);
            }
            break;
          }

          case 'rotate': {
            const rotSpeed = m.params.speed || 90; // deg per sec
            sprite.rotation = (sprite.rotation + rotSpeed * dt) % 360;
            break;
          }

          case 'patrol': {
            const speed = (m.params.speed || 150) * dt;
            const dist = m.params.distance || 150;
            const axis = m.params.axis || 'x';

            if (axis === 'x') {
              sprite.x += sprite.runtime.patrolDir * speed;
              if (Math.abs(sprite.x - sprite.runtime.patrolStart) >= dist) {
                sprite.runtime.patrolDir *= -1;
              }
            } else {
              sprite.y += sprite.runtime.patrolDir * speed;
              if (Math.abs(sprite.y - sprite.runtime.patrolStart) >= dist) {
                sprite.runtime.patrolDir *= -1;
              }
            }
            break;
          }

          case 'platformer': {
            const gravity = (m.params.gravity || 900) * dt;
            const jumpForce = m.params.jumpForce || 450;
            const speed = (m.params.speed || 200) * dt;

            // Horizontal input
            let hAxis = 0;
            if (this.keysDown['ArrowLeft'] || this.keysDown['KeyA']) hAxis -= 1;
            if (this.keysDown['ArrowRight'] || this.keysDown['KeyD']) hAxis += 1;
            sprite.x += hAxis * speed;

            // Apply gravity
            sprite.runtime.vy = (sprite.runtime.vy || 0) + gravity;
            sprite.y += sprite.runtime.vy * dt;

            // Ground floor collision
            const halfH = (sprite.height * sprite.scaleY) / 2;
            const floorY = canvasH - halfH;
            if (sprite.y >= floorY) {
              sprite.y = floorY;
              sprite.runtime.vy = 0;
              sprite.runtime.isGrounded = true;
            } else {
              sprite.runtime.isGrounded = false;
            }

            // Jump
            if ((this.keysDown['ArrowUp'] || this.keysDown['KeyW'] || this.keysDown['Space']) && sprite.runtime.isGrounded) {
              sprite.runtime.vy = -jumpForce;
              sprite.runtime.isGrounded = false;
              SoundEffects.play('jump');
            }
            break;
          }

          case 'forward': {
            const speed = (m.params.speed || 200) * dt;
            const rad = (sprite.rotation * Math.PI) / 180;
            sprite.x += Math.cos(rad) * speed;
            sprite.y += Math.sin(rad) * speed;

            // Wrap around screen if enabled
            if (m.params.wrapScreen) {
              const halfW = (sprite.width * sprite.scaleX) / 2;
              const halfH = (sprite.height * sprite.scaleY) / 2;
              if (sprite.x < -halfW) sprite.x = canvasW + halfW;
              if (sprite.x > canvasW + halfW) sprite.x = -halfW;
              if (sprite.y < -halfH) sprite.y = canvasH + halfH;
              if (sprite.y > canvasH + halfH) sprite.y = -halfH;
            }
            break;
          }
        }
      }
    }

    // 2. Process Interactions
    for (const sprite of this.project.sprites) {
      if (!sprite.visible) continue;

      for (const inter of sprite.interactions) {
        let triggered = false;

        switch (inter.trigger) {
          case 'click':
            if (this.mouse.clicked && this.isPointInsideSprite(this.mouse.x, this.mouse.y, sprite)) {
              triggered = true;
            }
            break;

          case 'hover':
            if (this.isPointInsideSprite(this.mouse.x, this.mouse.y, sprite)) {
              triggered = true;
            }
            break;

          case 'keydown':
            if (this.keysPressed[inter.triggerParams?.key || 'Space']) {
              triggered = true;
            }
            break;

          case 'collision': {
            const targetId = inter.triggerParams?.targetId;
            const targets = targetId === 'any'
              ? this.project.sprites.filter(s => s.id !== sprite.id && s.visible)
              : this.project.sprites.filter(s => s.id === targetId && s.visible);

            for (const other of targets) {
              if (this.checkCollision(sprite, other)) {
                triggered = true;
                break;
              }
            }
            break;
          }

          case 'tick':
            triggered = true;
            break;
        }

        if (triggered) {
          this.executeAction(inter.action, inter.actionParams, sprite);
        }
      }
    }

    // Reset per-frame flags
    this.mouse.clicked = false;
    this.keysPressed = {};
  }

  executeAction(action, params = {}, sprite) {
    switch (action) {
      case 'playSound':
        SoundEffects.play(params.sound || 'coin');
        break;

      case 'addScore': {
        const varName = params.variable || 'score';
        const amount = params.amount !== undefined ? Number(params.amount) : 1;
        const current = this.project.getVariable(varName);
        this.project.setVariable(varName, current + amount);
        break;
      }

      case 'changeColor':
        sprite.fill = params.color || '#ef4444';
        break;

      case 'bounceOff': {
        // Reverse velocities
        if (sprite.runtime.vx !== undefined) sprite.runtime.vx *= -1;
        if (sprite.runtime.vy !== undefined) sprite.runtime.vy *= -1;
        break;
      }

      case 'destroy':
        sprite.visible = false;
        break;

      case 'teleport': {
        const pad = 60;
        sprite.x = pad + Math.random() * (this.project.width - pad * 2);
        sprite.y = pad + Math.random() * (this.project.height - pad * 2);
        break;
      }

      case 'scale': {
        const factor = params.scale || 1.1;
        sprite.scaleX *= factor;
        sprite.scaleY *= factor;
        break;
      }

      case 'alert':
        alert(params.message || '이벤트 발생!');
        break;
    }
  }

  isPointInsideSprite(px, py, sprite) {
    const halfW = (sprite.width * sprite.scaleX) / 2;
    const halfH = (sprite.height * sprite.scaleY) / 2;

    // Convert point to sprite local coordinates by reversing rotation
    const rad = (-sprite.rotation * Math.PI) / 180;
    const dx = px - sprite.x;
    const dy = py - sprite.y;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (sprite.type === 'circle') {
      const radius = Math.max(halfW, halfH);
      return (lx * lx + ly * ly) <= (radius * radius);
    }

    return Math.abs(lx) <= halfW && Math.abs(ly) <= halfH;
  }

  checkCollision(a, b) {
    // Circle to Circle fast check
    if (a.type === 'circle' && b.type === 'circle') {
      const rA = (a.width * a.scaleX) / 2;
      const rB = (b.width * b.scaleX) / 2;
      const distSq = (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
      return distSq <= (rA + rB) ** 2;
    }

    // AABB approximation
    const aHalfW = (a.width * a.scaleX) / 2;
    const aHalfH = (a.height * a.scaleY) / 2;
    const bHalfW = (b.width * b.scaleX) / 2;
    const bHalfH = (b.height * b.scaleY) / 2;

    return (
      Math.abs(a.x - b.x) <= aHalfW + bHalfW &&
      Math.abs(a.y - b.y) <= aHalfH + bHalfH
    );
  }
}
