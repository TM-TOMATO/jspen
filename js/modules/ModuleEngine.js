import { SoundEffects } from '../engine/SoundEffects.js';

/**
 * ModuleEngine
 * Executes the reactive data pipeline across all 28 feature modules.
 * Connects sensors -> value remapping / event relays -> motions / particles / audio.
 */
export class ModuleEngine {
  constructor(documentModel) {
    this.doc = documentModel;

    // Global Sensor Bus
    this.bus = {
      mouse: { x: 0, y: 0, rawX: 0, rawY: 0, vx: 0, vy: 0, isDown: false, clicked: false },
      scroll: { deltaY: 0, progress: 0 },
      keysDown: {},
      time: 0,
      particles: []
    };

    this.active = false;
    this.lastTime = 0;
    this.draggedLayer = null;
    this.dragOffset = { x: 0, y: 0 };
  }

  start() {
    this.active = true;
    this.lastTime = performance.now();
    this.bus.particles = [];

    // Reset runtime state on each layer
    this.doc.layers.forEach(layer => {
      layer.resetRuntime();
      layer.runtime.initialX = layer.x;
      layer.runtime.initialY = layer.y;
      layer.runtime.initialRotation = layer.rotation;
      layer.runtime.initialOpacity = layer.opacity;
    });
  }

  stop() {
    this.active = false;
    this.bus.particles = [];
    this.draggedLayer = null;

    // Restore layers to design state
    this.doc.layers.forEach(layer => {
      layer.resetRuntime();
    });
  }

  update(deltaTime, mouseWorld, mouseScreen, isMouseDown, isMouseClicked) {
    if (!this.active) return;
    const dt = Math.min(deltaTime, 0.1);
    this.bus.time += dt;

    // Update mouse sensor in bus
    const prevMx = this.bus.mouse.x;
    const prevMy = this.bus.mouse.y;
    this.bus.mouse.x = mouseWorld.x;
    this.bus.mouse.y = mouseWorld.y;
    this.bus.mouse.rawX = mouseScreen.x;
    this.bus.mouse.rawY = mouseScreen.y;
    this.bus.mouse.vx = (this.bus.mouse.x - prevMx) / dt;
    this.bus.mouse.vy = (this.bus.mouse.y - prevMy) / dt;
    this.bus.mouse.isDown = isMouseDown;
    this.bus.mouse.clicked = isMouseClicked;

    // Handle Draggable Layer
    if (this.draggedLayer) {
      if (this.bus.mouse.isDown) {
        this.draggedLayer.runtime.x = this.bus.mouse.x - this.dragOffset.x;
        this.draggedLayer.runtime.y = this.bus.mouse.y - this.dragOffset.y;
      } else {
        this.draggedLayer = null;
      }
    }

    // 1. Process Modules for each Layer
    for (const layer of this.doc.layers) {
      if (!layer.visible) continue;

      for (const mod of layer.modules) {
        if (!mod.enabled) continue;
        this.processModule(mod, layer, dt);
      }
    }

    // 2. Update Active Particles
    for (let i = this.bus.particles.length - 1; i >= 0; i--) {
      const p = this.bus.particles[i];
      p.x += p.vx * dt * 60;
      p.y += p.vy * dt * 60;
      p.life -= dt / (p.maxLife || 0.8);
      if (p.life <= 0) {
        this.bus.particles.splice(i, 1);
      }
    }

    // Reset frame single-click
    this.bus.mouse.clicked = false;
  }

  processModule(mod, layer, dt) {
    const params = mod.params || {};

    switch (mod.type) {
      // ==========================================
      // Sensors
      // ==========================================
      case 'draggable': {
        if (this.bus.mouse.clicked && !this.draggedLayer) {
          if (this.isPointInsideLayer(this.bus.mouse.x, this.bus.mouse.y, layer)) {
            this.draggedLayer = layer;
            this.dragOffset = {
              x: this.bus.mouse.x - layer.runtime.x,
              y: this.bus.mouse.y - layer.runtime.y
            };
          }
        }
        break;
      }

      case 'hover_zone': {
        const isHover = this.isPointInsideLayer(this.bus.mouse.x, this.bus.mouse.y, layer, params.proximityRadius || 0);
        layer.runtime.isHovered = isHover;
        break;
      }

      // ==========================================
      // Links & Logic
      // ==========================================
      case 'follow_target': {
        const target = this.doc.getLayer(params.targetLayerId);
        if (target) {
          const targetX = target.runtime.x + (params.offsetX || 0);
          const targetY = target.runtime.y + (params.offsetY || 0);

          if (params.type === 'rigid') {
            layer.runtime.x = targetX;
            layer.runtime.y = targetY;
          } else {
            // Spring damping
            const stiffness = params.stiffness || 0.08;
            const damping = params.damping || 0.85;
            const dx = targetX - layer.runtime.x;
            const dy = targetY - layer.runtime.y;
            layer.runtime.vx = ((layer.runtime.vx || 0) + dx * stiffness) * damping;
            layer.runtime.vy = ((layer.runtime.vy || 0) + dy * stiffness) * damping;
            layer.runtime.x += layer.runtime.vx;
            layer.runtime.y += layer.runtime.vy;
          }
        }
        break;
      }

      case 'look_at': {
        let tx = this.bus.mouse.x;
        let ty = this.bus.mouse.y;

        if (params.targetType === 'layer' && params.targetLayerId) {
          const target = this.doc.getLayer(params.targetLayerId);
          if (target) {
            tx = target.runtime.x;
            ty = target.runtime.y;
          }
        }

        const angleRad = Math.atan2(ty - layer.runtime.y, tx - layer.runtime.x);
        const deg = (angleRad * (180 / Math.PI)) + (params.rotationOffset || 0);
        layer.runtime.rotation = deg;
        break;
      }

      case 'value_remapper': {
        // [No-Code Math Remapping Pipeline]
        let inVal = 0;
        if (params.inputSource === 'mouse_x') inVal = this.bus.mouse.x;
        else if (params.inputSource === 'mouse_y') inVal = this.bus.mouse.y;
        else if (params.inputSource === 'scroll') inVal = this.bus.scroll.progress;
        else if (params.inputSource === 'time') inVal = this.bus.time;

        const inMin = params.inMin !== undefined ? params.inMin : 0;
        const inMax = params.inMax !== undefined ? params.inMax : 800;
        const outMin = params.outMin !== undefined ? params.outMin : -30;
        const outMax = params.outMax !== undefined ? params.outMax : 30;

        const norm = Math.max(0, Math.min(1, (inVal - inMin) / (inMax - inMin || 1)));
        const mapped = outMin + norm * (outMax - outMin);

        const prop = params.outputProperty || 'rotation';
        if (prop in layer.runtime) {
          layer.runtime[prop] = mapped;
        }
        break;
      }

      // ==========================================
      // Motions & FX
      // ==========================================
      case 'parallax_3d_tilt': {
        const cx = this.doc.width / 2;
        const cy = this.doc.height / 2;
        const maxAngle = params.maxAngle || 25;
        const normX = Math.max(-1, Math.min(1, (this.bus.mouse.x - cx) / cx));
        const normY = Math.max(-1, Math.min(1, (this.bus.mouse.y - cy) / cy));
        layer.runtime.tiltAngle = normX * maxAngle * (params.reverse ? -1 : 1);
        break;
      }

      case 'particle_emitter': {
        let shouldEmit = false;
        if (params.trigger === 'continuous') {
          shouldEmit = true;
        } else if (params.trigger === 'click' && this.bus.mouse.clicked && layer.runtime.isHovered) {
          shouldEmit = true;
        } else if (params.trigger === 'move' && Math.hypot(this.bus.mouse.vx, this.bus.mouse.vy) > 80) {
          shouldEmit = true;
        }

        if (shouldEmit && Math.random() < 0.6) {
          const count = params.count || 3;
          for (let k = 0; k < count; k++) {
            const angle = Math.random() * Math.PI * 2;
            const spd = (params.speed || 3) * (0.5 + Math.random());
            this.bus.particles.push({
              x: layer.runtime.x + (Math.random() - 0.5) * layer.width * 0.5,
              y: layer.runtime.y + (Math.random() - 0.5) * layer.height * 0.5,
              vx: Math.cos(angle) * spd,
              vy: Math.sin(angle) * spd,
              life: 1,
              maxLife: params.lifetime || 0.8,
              color: params.color || '#fbbf24',
              size: 3 + Math.random() * 3
            });
          }
        }
        break;
      }

      case 'floating_wave': {
        const ampY = params.amplitudeY !== undefined ? params.amplitudeY : 15;
        const ampX = params.amplitudeX !== undefined ? params.amplitudeX : 0;
        const freq = params.frequency || 1.5;
        const offset = Math.sin(this.bus.time * freq);
        layer.runtime.y = (layer.runtime.initialY || layer.y) + offset * ampY;
        if (ampX > 0) {
          layer.runtime.x = (layer.runtime.initialX || layer.x) + Math.cos(this.bus.time * freq) * ampX;
        }
        break;
      }

      case 'pulse_breathe': {
        const amt = params.scaleAmount || 0.1;
        const freq = params.frequency || 2.0;
        const scale = 1 + Math.sin(this.bus.time * freq) * amt;
        layer.runtime.scaleX = scale;
        layer.runtime.scaleY = scale;
        break;
      }

      case 'spin_orbit': {
        const spd = params.speed || 60;
        if (params.mode === 'orbit' && params.orbitTargetId) {
          const target = this.doc.getLayer(params.orbitTargetId);
          if (target) {
            const rad = ((this.bus.time * spd) % 360) * (Math.PI / 180);
            const dist = params.orbitRadius || 100;
            layer.runtime.x = target.runtime.x + Math.cos(rad) * dist;
            layer.runtime.y = target.runtime.y + Math.sin(rad) * dist;
          }
        } else {
          // Self spin
          layer.runtime.rotation = (layer.runtime.rotation + spd * dt) % 360;
        }
        break;
      }

      case 'bounce_screen': {
        const hw = (layer.width * layer.runtime.scaleX) / 2;
        const hh = (layer.height * layer.runtime.scaleY) / 2;

        if (layer.runtime.bVx === undefined) {
          layer.runtime.bVx = params.speedX || 4;
          layer.runtime.bVy = params.speedY || 4;
        }

        layer.runtime.x += layer.runtime.bVx;
        layer.runtime.y += layer.runtime.bVy;

        if (layer.runtime.x - hw <= 0) {
          layer.runtime.x = hw;
          layer.runtime.bVx = Math.abs(layer.runtime.bVx);
        } else if (layer.runtime.x + hw >= this.doc.width) {
          layer.runtime.x = this.doc.width - hw;
          layer.runtime.bVx = -Math.abs(layer.runtime.bVx);
        }

        if (layer.runtime.y - hh <= 0) {
          layer.runtime.y = hh;
          layer.runtime.bVy = Math.abs(layer.runtime.bVy);
        } else if (layer.runtime.y + hh >= this.doc.height) {
          layer.runtime.y = this.doc.height - hh;
          layer.runtime.bVy = -Math.abs(layer.runtime.bVy);
        }
        break;
      }

      // ==========================================
      // Audio
      // ==========================================
      case 'synth_sfx': {
        if (params.trigger === 'click' && this.bus.mouse.clicked && layer.runtime.isHovered) {
          SoundEffects.play(params.sound || 'pop');
        }
        break;
      }
    }
  }

  isPointInsideLayer(px, py, layer, padding = 0) {
    const hw = (layer.width * layer.runtime.scaleX) / 2 + padding;
    const hh = (layer.height * layer.runtime.scaleY) / 2 + padding;

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
}
