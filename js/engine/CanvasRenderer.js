/**
 * Canvas Renderer
 * Renders sprites, background, grid, and overlays for both Editor and Play modes.
 */
export class CanvasRenderer {
  constructor(canvas, project) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.project = project;

    // Viewport transforms (Zoom & Pan)
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.showGrid = true;
    this.gridSize = 20;
    this.mode = 'edit'; // 'edit' or 'play'
  }

  resize(width, height) {
    this.canvas.width = width;
    this.canvas.height = height;
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.panX) / this.zoom,
      y: (screenY - this.panY) / this.zoom
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: worldX * this.zoom + this.panX,
      y: worldY * this.zoom + this.panY
    };
  }

  render(gizmo = null) {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // 1. Clear outer area with workspace background
    ctx.save();
    ctx.fillStyle = '#0b0f19'; // Studio background
    ctx.fillRect(0, 0, width, height);

    // 2. Apply Zoom & Pan
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 3. Draw Project Canvas Area (Paper)
    const pWidth = this.project.width;
    const pHeight = this.project.height;

    // Canvas boundary shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
    ctx.shadowBlur = 20;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = this.project.backgroundColor;
    ctx.fillRect(0, 0, pWidth, pHeight);
    ctx.shadowColor = 'transparent'; // reset shadow

    // 4. Draw Grid in Edit Mode
    if (this.mode === 'edit' && this.showGrid) {
      this.drawGrid(pWidth, pHeight);
    }

    // Clip to project canvas boundary so objects don't bleed out in play mode
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, pWidth, pHeight);
    ctx.clip();

    // 5. Draw Sprites (Sorted by zIndex)
    for (const sprite of this.project.sprites) {
      if (!sprite.visible) continue;
      this.drawSprite(sprite);
    }

    // 6. Draw Score / HUD Overlay if in Play Mode
    if (this.mode === 'play') {
      this.drawHUD();
    }

    ctx.restore(); // end clip

    // 7. Draw Canvas Border outline
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(0, 0, pWidth, pHeight);

    // 8. Draw Gizmo for Selected Sprite in Edit Mode
    if (this.mode === 'edit' && gizmo) {
      const selected = this.project.getSelectedSprite();
      if (selected) {
        gizmo.draw(selected, this.zoom);
      }
    }

    ctx.restore(); // restore viewport transform
  }

  drawGrid(width, height) {
    const ctx = this.ctx;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1 / this.zoom;

    ctx.beginPath();
    for (let x = 0; x <= width; x += this.gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    for (let y = 0; y <= height; y += this.gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  drawSprite(sprite) {
    const ctx = this.ctx;
    ctx.save();

    ctx.translate(sprite.x, sprite.y);
    ctx.rotate((sprite.rotation * Math.PI) / 180);
    ctx.scale(sprite.scaleX, sprite.scaleY);
    ctx.globalAlpha = sprite.opacity;

    // Apply shadow if set
    if (sprite.shadowBlur > 0 && sprite.shadowColor !== 'transparent') {
      ctx.shadowColor = sprite.shadowColor;
      ctx.shadowBlur = sprite.shadowBlur;
    }

    const halfW = sprite.width / 2;
    const halfH = sprite.height / 2;

    switch (sprite.type) {
      case 'rect':
        this.drawRoundedRect(ctx, -halfW, -halfH, sprite.width, sprite.height, sprite.cornerRadius || 0);
        if (sprite.fill) {
          ctx.fillStyle = sprite.fill;
          ctx.fill();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, halfW), 0, Math.PI * 2);
        if (sprite.fill) {
          ctx.fillStyle = sprite.fill;
          ctx.fill();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'triangle':
        ctx.beginPath();
        ctx.moveTo(0, -halfH);
        ctx.lineTo(halfW, halfH);
        ctx.lineTo(-halfW, halfH);
        ctx.closePath();
        if (sprite.fill) {
          ctx.fillStyle = sprite.fill;
          ctx.fill();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'star':
        this.drawStar(ctx, 0, 0, 5, halfW, halfW * 0.45);
        if (sprite.fill) {
          ctx.fillStyle = sprite.fill;
          ctx.fill();
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'text':
        ctx.font = `${sprite.fontWeight || 'bold'} ${sprite.fontSize}px ${sprite.fontFamily}`;
        ctx.textAlign = sprite.textAlign || 'center';
        ctx.textBaseline = 'middle';
        if (sprite.fill) {
          ctx.fillStyle = sprite.fill;
          ctx.fillText(sprite.text, 0, 0);
        }
        if (sprite.strokeWidth > 0 && sprite.stroke) {
          ctx.strokeStyle = sprite.stroke;
          ctx.lineWidth = sprite.strokeWidth;
          ctx.strokeText(sprite.text, 0, 0);
        }
        break;

      case 'image':
        if (sprite.imageElement && sprite.imageElement.complete) {
          ctx.drawImage(sprite.imageElement, -halfW, -halfH, sprite.width, sprite.height);
        } else {
          // Placeholder box while image is loading
          ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
          ctx.fillRect(-halfW, -halfH, sprite.width, sprite.height);
          ctx.strokeStyle = '#64748b';
          ctx.setLineDash([4, 4]);
          ctx.strokeRect(-halfW, -halfH, sprite.width, sprite.height);
          ctx.fillStyle = '#94a3b8';
          ctx.font = '12px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('🖼️ Image', 0, 0);
        }
        break;
    }

    ctx.restore();
  }

  drawRoundedRect(ctx, x, y, width, height, radius) {
    const r = Math.min(radius, width / 2, height / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + width - r, y);
    ctx.arcTo(x + width, y, x + width, y + r, r);
    ctx.lineTo(x + width, y + height - r);
    ctx.arcTo(x + width, y + height, x + width - r, y + height, r);
    ctx.lineTo(x + r, y + height);
    ctx.arcTo(x, y + height, x, y + height - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  drawStar(ctx, cx, cy, spikes, outerRadius, innerRadius) {
    let rot = (Math.PI / 2) * 3;
    let x = cx;
    let y = cy;
    const step = Math.PI / spikes;

    ctx.beginPath();
    ctx.moveTo(cx, cy - outerRadius);
    for (let i = 0; i < spikes; i++) {
      x = cx + Math.cos(rot) * outerRadius;
      y = cy + Math.sin(rot) * outerRadius;
      ctx.lineTo(x, y);
      rot += step;

      x = cx + Math.cos(rot) * innerRadius;
      y = cy + Math.sin(rot) * innerRadius;
      ctx.lineTo(x, y);
      rot += step;
    }
    ctx.lineTo(cx, cy - outerRadius);
    ctx.closePath();
  }

  drawHUD() {
    const ctx = this.ctx;
    ctx.save();
    let offsetY = 28;
    for (const v of this.project.variables) {
      ctx.font = 'bold 18px monospace';
      ctx.fillStyle = '#f8fafc';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      ctx.shadowBlur = 4;
      ctx.textAlign = 'left';
      ctx.fillText(`${v.name.toUpperCase()}: ${v.value}`, 20, offsetY);
      offsetY += 24;
    }
    ctx.restore();
  }
}
