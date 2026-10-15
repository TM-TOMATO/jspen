/**
 * Photoshop Canvas Renderer
 * Renders artboard with rulers, guides, bezier paths, bevel shapes, gradients, blend modes, and transform gizmos.
 */
export class PhotoshopCanvas {
  constructor(canvas, documentModel) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.doc = documentModel;

    // Viewport transforms (Zoom & Pan)
    this.zoom = 1;
    this.panX = 0;
    this.panY = 0;

    this.showRulers = true;
    this.mode = 'edit'; // 'edit' or 'preview'
  }

  resize(w, h) {
    this.canvas.width = w;
    this.canvas.height = h;
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

  render(activeTool, transformBox, activePenPath = null, activeGradientDrag = null) {
    const ctx = this.ctx;
    const cw = this.canvas.width;
    const ch = this.canvas.height;

    // 1. Clear Workspace background (Photoshop Dark Slate)
    ctx.fillStyle = '#1e1e24';
    ctx.fillRect(0, 0, cw, ch);

    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.zoom, this.zoom);

    // 2. Draw Artboard Paper with Drop Shadow
    const aw = this.doc.width;
    const ah = this.doc.height;

    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 25 / this.zoom;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 8 / this.zoom;

    if (this.doc.transparentBackground) {
      this.drawCheckerboard(ctx, 0, 0, aw, ah);
    } else {
      ctx.fillStyle = this.doc.backgroundColor;
      ctx.fillRect(0, 0, aw, ah);
    }
    ctx.shadowColor = 'transparent'; // Reset shadow

    // 3. Clip to Artboard for Layer Rendering
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, 0, aw, ah);
    ctx.clip();

    // Draw Layers (Sorted by zIndex)
    for (const layer of this.doc.layers) {
      if (!layer.visible) continue;
      this.drawLayer(ctx, layer);
    }

    // Draw Live Particles if any
    if (window.jspenApp?.moduleEngine?.bus?.particles) {
      for (const p of window.jspenApp.moduleEngine.bus.particles) {
        ctx.save();
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size || 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    }

    ctx.restore(); // End artboard clip

    // 4. Draw Artboard Border
    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1 / this.zoom;
    ctx.strokeRect(0, 0, aw, ah);

    // 5. Draw Overlays (Edit Mode Only)
    if (this.mode === 'edit') {
      const selected = this.doc.getSelectedLayer();
      if (selected && transformBox && activeTool === 'move') {
        transformBox.draw(ctx, selected, this.zoom);
      }

      // Draw Pen Tool In-Progress Path
      if (activePenPath && activePenPath.length > 0) {
        this.drawPenPathOverlay(ctx, activePenPath);
      }

      // Draw Gradient Drag Line
      if (activeGradientDrag) {
        this.drawGradientOverlay(ctx, activeGradientDrag);
      }
    }

    ctx.restore(); // Restore Viewport

    // 6. Draw Photoshop Rulers
    if (this.showRulers) {
      this.drawRulers(ctx, cw, ch);
    }
  }

  drawLayer(ctx, layer) {
    ctx.save();

    // Use runtime transform if in preview mode
    const lx = this.mode === 'preview' ? layer.runtime.x : layer.x;
    const ly = this.mode === 'preview' ? layer.runtime.y : layer.y;
    const lrot = this.mode === 'preview' ? (layer.runtime.rotation + (layer.runtime.tiltAngle || 0)) : layer.rotation;
    const lsx = this.mode === 'preview' ? layer.runtime.scaleX : layer.scaleX;
    const lsy = this.mode === 'preview' ? layer.runtime.scaleY : layer.scaleY;
    const lop = this.mode === 'preview' ? layer.runtime.opacity : layer.opacity;

    ctx.translate(lx, ly);
    ctx.rotate((lrot * Math.PI) / 180);
    ctx.scale(lsx, lsy);
    ctx.globalAlpha = Math.max(0, Math.min(1, lop));

    // Photoshop Blend Mode
    if (layer.blendMode) {
      ctx.globalCompositeOperation = layer.blendMode;
    }

    const halfW = layer.width / 2;
    const halfH = layer.height / 2;

    // Apply Fill
    this.applyLayerFill(ctx, layer);

    switch (layer.type) {
      case 'rect':
        if (layer.bevel > 0) {
          this.drawBevelRectPath(ctx, -halfW, -halfH, layer.width, layer.height, layer.bevel);
        } else {
          this.drawCornerRadiusRectPath(ctx, -halfW, -halfH, layer.width, layer.height, layer);
        }
        if (layer.fillType !== 'none') ctx.fill();
        if (layer.strokeWidth > 0 && layer.stroke) {
          ctx.strokeStyle = layer.stroke;
          ctx.lineWidth = layer.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, Math.max(1, halfW), 0, Math.PI * 2);
        if (layer.fillType !== 'none') ctx.fill();
        if (layer.strokeWidth > 0 && layer.stroke) {
          ctx.strokeStyle = layer.stroke;
          ctx.lineWidth = layer.strokeWidth;
          ctx.stroke();
        }
        break;

      case 'path':
        if (layer.pathPoints && layer.pathPoints.length > 0) {
          this.drawBezierPath(ctx, layer.pathPoints, layer.isClosedPath);
          if (layer.isClosedPath && layer.fillType !== 'none') ctx.fill();
          if (layer.strokeWidth > 0 && layer.stroke) {
            ctx.strokeStyle = layer.stroke;
            ctx.lineWidth = layer.strokeWidth;
            ctx.stroke();
          }
        }
        break;

      case 'text':
        ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`;
        ctx.textAlign = layer.textAlign || 'center';
        ctx.textBaseline = 'middle';
        if (layer.fillType !== 'none') ctx.fillText(layer.text, 0, 0);
        if (layer.strokeWidth > 0 && layer.stroke) {
          ctx.strokeStyle = layer.stroke;
          ctx.lineWidth = layer.strokeWidth;
          ctx.strokeText(layer.text, 0, 0);
        }
        break;

      case 'image':
        if (layer.imageElement && layer.imageElement.complete) {
          ctx.drawImage(layer.imageElement, -halfW, -halfH, layer.width, layer.height);
        }
        break;
    }

    ctx.restore();
  }

  applyLayerFill(ctx, layer) {
    if (layer.fillType === 'linear-gradient' && layer.gradient) {
      const g = layer.gradient;
      const grad = ctx.createLinearGradient(
        -layer.width / 2 + g.startX,
        -layer.height / 2 + g.startY,
        -layer.width / 2 + g.endX,
        -layer.height / 2 + g.endY
      );
      for (const stop of g.stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      ctx.fillStyle = grad;
    } else if (layer.fillType === 'radial-gradient' && layer.gradient) {
      const g = layer.gradient;
      const r = Math.max(layer.width, layer.height) / 2;
      const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
      for (const stop of g.stops) {
        grad.addColorStop(stop.offset, stop.color);
      }
      ctx.fillStyle = grad;
    } else {
      ctx.fillStyle = layer.fill || '#38bdf8';
    }
  }

  drawBevelRectPath(ctx, x, y, w, h, bevel) {
    const b = Math.min(bevel, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + b, y);
    ctx.lineTo(x + w - b, y);
    ctx.lineTo(x + w, y + b);
    ctx.lineTo(x + w, y + h - b);
    ctx.lineTo(x + w - b, y + h);
    ctx.lineTo(x + b, y + h);
    ctx.lineTo(x, y + h - b);
    ctx.lineTo(x, y + b);
    ctx.closePath();
  }

  drawCornerRadiusRectPath(ctx, x, y, w, h, layer) {
    const rTL = Math.min(layer.cornerRadiusTL || layer.cornerRadius || 0, w / 2, h / 2);
    const rTR = Math.min(layer.cornerRadiusTR || layer.cornerRadius || 0, w / 2, h / 2);
    const rBR = Math.min(layer.cornerRadiusBR || layer.cornerRadius || 0, w / 2, h / 2);
    const rBL = Math.min(layer.cornerRadiusBL || layer.cornerRadius || 0, w / 2, h / 2);

    ctx.beginPath();
    ctx.moveTo(x + rTL, y);
    ctx.lineTo(x + w - rTR, y);
    ctx.arcTo(x + w, y, x + w, y + rTR, rTR);
    ctx.lineTo(x + w, y + h - rBR);
    ctx.arcTo(x + w, y + h, x + w - rBR, y + h, rBR);
    ctx.lineTo(x + rBL, y + h);
    ctx.arcTo(x, y + h, x, y + h - rBL, rBL);
    ctx.lineTo(x, y + rTL);
    ctx.arcTo(x, y, x + rTL, y, rTL);
    ctx.closePath();
  }

  drawBezierPath(ctx, points, isClosed) {
    if (!points || points.length === 0) return;
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);

    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const prev = points[i - 1];

      if (p.isCurve && (p.cp1x !== undefined || prev.cp2x !== undefined)) {
        const cp1x = prev.cp2x !== undefined ? prev.cp2x : prev.x;
        const cp1y = prev.cp2y !== undefined ? prev.cp2y : prev.y;
        const cp2x = p.cp1x !== undefined ? p.cp1x : p.x;
        const cp2y = p.cp1y !== undefined ? p.cp1y : p.y;
        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }

    if (isClosed) {
      ctx.closePath();
    }
  }

  drawPenPathOverlay(ctx, points) {
    ctx.save();
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5 / this.zoom;
    this.drawBezierPath(ctx, points, false);
    ctx.stroke();

    // Draw Anchor Points & Handles
    const ptSize = 6 / this.zoom;
    for (const pt of points) {
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5 / this.zoom;
      ctx.fillRect(pt.x - ptSize / 2, pt.y - ptSize / 2, ptSize, ptSize);
      ctx.strokeRect(pt.x - ptSize / 2, pt.y - ptSize / 2, ptSize, ptSize);

      // Handle lines
      if (pt.cp2x !== undefined) {
        ctx.beginPath();
        ctx.moveTo(pt.x, pt.y);
        ctx.lineTo(pt.cp2x, pt.cp2y);
        ctx.strokeStyle = '#94a3b8';
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.beginPath();
        ctx.arc(pt.cp2x, pt.cp2y, ptSize * 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  drawGradientOverlay(ctx, drag) {
    ctx.save();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 2 / this.zoom;
    ctx.beginPath();
    ctx.moveTo(drag.startX, drag.startY);
    ctx.lineTo(drag.currentX, drag.currentY);
    ctx.stroke();

    const pinR = 6 / this.zoom;
    ctx.fillStyle = '#fbbf24';
    ctx.beginPath();
    ctx.arc(drag.startX, drag.startY, pinR, 0, Math.PI * 2);
    ctx.arc(drag.currentX, drag.currentY, pinR, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawCheckerboard(ctx, x, y, w, h) {
    const size = 16;
    for (let px = x; px < x + w; px += size) {
      for (let py = y; py < y + h; py += size) {
        ctx.fillStyle = ((px / size + py / size) % 2 === 0) ? '#ffffff' : '#e2e8f0';
        ctx.fillRect(px, py, Math.min(size, x + w - px), Math.min(size, y + h - py));
      }
    }
  }

  drawRulers(ctx, cw, ch) {
    const rSize = 18; // Ruler thickness
    ctx.save();
    ctx.fillStyle = '#18181b';
    ctx.fillRect(0, 0, cw, rSize);
    ctx.fillRect(0, 0, rSize, ch);

    ctx.strokeStyle = '#3f3f46';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, rSize);
    ctx.lineTo(cw, rSize);
    ctx.moveTo(rSize, 0);
    ctx.lineTo(rSize, ch);
    ctx.stroke();

    // Corner square
    ctx.fillStyle = '#27272a';
    ctx.fillRect(0, 0, rSize, rSize);

    // Ticks & Numbers
    ctx.fillStyle = '#71717a';
    ctx.font = '9px monospace';
    ctx.textAlign = 'left';

    // Horizontal Ruler
    const step = 50 * this.zoom;
    for (let wx = 0; wx <= this.doc.width; wx += 50) {
      const sx = this.worldToScreen(wx, 0).x;
      if (sx >= rSize && sx <= cw) {
        ctx.beginPath();
        ctx.moveTo(sx, rSize - 5);
        ctx.lineTo(sx, rSize);
        ctx.stroke();
        ctx.fillText(wx, sx + 2, rSize - 6);
      }
    }

    // Vertical Ruler
    for (let wy = 0; wy <= this.doc.height; wy += 50) {
      const sy = this.worldToScreen(0, wy).y;
      if (sy >= rSize && sy <= ch) {
        ctx.beginPath();
        ctx.moveTo(rSize - 5, sy);
        ctx.lineTo(rSize, sy);
        ctx.stroke();
        ctx.save();
        ctx.translate(rSize - 6, sy + 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText(wy, 0, 0);
        ctx.restore();
      }
    }

    ctx.restore();
  }
}
