/**
 * Photoshop-style Free Transform Box (Ctrl+T)
 * 8 resize handles, rotation zone, and translation handling.
 */
export class TransformBox {
  constructor(documentModel, onTransformChange) {
    this.doc = documentModel;
    this.onTransformChange = onTransformChange;

    this.handleSize = 8;
    this.mode = null; // 'translate', 'resize', 'rotate'
    this.activeHandle = null;
    this.startMouse = { x: 0, y: 0 };
    this.startLayer = null;
  }

  getHandles(layer) {
    const hw = (layer.width * layer.scaleX) / 2;
    const hh = (layer.height * layer.scaleY) / 2;
    const rad = (layer.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const locals = {
      nw: { x: -hw, y: -hh },
      n:  { x: 0,   y: -hh },
      ne: { x: hw,  y: -hh },
      e:  { x: hw,  y: 0 },
      se: { x: hw,  y: hh },
      s:  { x: 0,   y: hh },
      sw: { x: -hw, y: hh },
      w:  { x: -hw, y: 0 }
    };

    const worlds = {};
    for (const [key, pt] of Object.entries(locals)) {
      worlds[key] = {
        x: layer.x + (pt.x * cos - pt.y * sin),
        y: layer.y + (pt.x * sin + pt.y * cos)
      };
    }
    return worlds;
  }

  hitTest(worldX, worldY, layer) {
    if (!layer || layer.locked || !layer.visible) return null;

    const handles = this.getHandles(layer);
    const hitRadius = this.handleSize + 4;

    // 1. Check 8 Resize handles
    for (const [handle, pt] of Object.entries(handles)) {
      const d = Math.hypot(worldX - pt.x, worldY - pt.y);
      if (d <= hitRadius) {
        return { mode: 'resize', handle };
      }
    }

    // 2. Check outer margin for Rotate
    const rad = (-layer.rotation * Math.PI) / 180;
    const dx = worldX - layer.x;
    const dy = worldY - layer.y;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    const hw = (layer.width * layer.scaleX) / 2;
    const hh = (layer.height * layer.scaleY) / 2;
    const rotateMargin = 20;

    if (
      Math.abs(lx) <= hw + rotateMargin &&
      Math.abs(ly) <= hh + rotateMargin &&
      (Math.abs(lx) > hw || Math.abs(ly) > hh)
    ) {
      return { mode: 'rotate', handle: null };
    }

    // 3. Inside body for Translate
    if (Math.abs(lx) <= hw && Math.abs(ly) <= hh) {
      return { mode: 'translate', handle: null };
    }

    return null;
  }

  startDrag(worldX, worldY, hit, layer) {
    if (!layer || !hit) return false;
    this.mode = hit.mode;
    this.activeHandle = hit.handle;
    this.startMouse = { x: worldX, y: worldY };
    this.startLayer = {
      x: layer.x,
      y: layer.y,
      width: layer.width,
      height: layer.height,
      rotation: layer.rotation,
      scaleX: layer.scaleX,
      scaleY: layer.scaleY
    };
    return true;
  }

  drag(worldX, worldY, isShiftDown = false, isAltDown = false) {
    const layer = this.doc.getSelectedLayer();
    if (!layer || !this.mode) return;

    if (this.mode === 'translate') {
      layer.x = Math.round(this.startLayer.x + (worldX - this.startMouse.x));
      layer.y = Math.round(this.startLayer.y + (worldY - this.startMouse.y));
    } else if (this.mode === 'rotate') {
      const angleRad = Math.atan2(worldY - layer.y, worldX - layer.x);
      let deg = angleRad * (180 / Math.PI) + 90;
      if (deg < 0) deg += 360;
      if (isShiftDown) {
        deg = Math.round(deg / 15) * 15; // 15 degree snap
      }
      layer.rotation = Math.round(deg);
    } else if (this.mode === 'resize') {
      const rad = (-this.startLayer.rotation * Math.PI) / 180;
      const dx = worldX - this.startMouse.x;
      const dy = worldY - this.startMouse.y;
      const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);

      let newW = this.startLayer.width;
      let newH = this.startLayer.height;

      const handle = this.activeHandle;
      if (handle.includes('e')) newW += ldx * 2;
      if (handle.includes('w')) newW -= ldx * 2;
      if (handle.includes('s')) newH += ldy * 2;
      if (handle.includes('n')) newH -= ldy * 2;

      newW = Math.max(10, Math.round(newW));
      newH = Math.max(10, Math.round(newH));

      if (isShiftDown || layer.lockAspectRatio) {
        const avg = Math.max(newW, newH);
        newW = avg;
        newH = avg;
      }

      layer.width = newW;
      layer.height = newH;
    }

    if (this.onTransformChange) {
      this.onTransformChange(layer);
    }
  }

  endDrag() {
    if (this.mode) {
      this.mode = null;
      this.activeHandle = null;
      this.doc.saveState();
    }
  }

  draw(ctx, layer, zoom = 1) {
    if (!layer || !layer.visible) return;

    const hw = (layer.width * layer.scaleX) / 2;
    const hh = (layer.height * layer.scaleY) / 2;
    const handles = this.getHandles(layer);

    ctx.save();
    ctx.translate(layer.x, layer.y);
    ctx.rotate((layer.rotation * Math.PI) / 180);

    // Photoshop Free Transform Box (Solid crisp cyan line)
    ctx.strokeStyle = '#0ea5e9';
    ctx.lineWidth = 1.5 / zoom;
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    ctx.restore();

    // 8 White Square Handles
    const hSize = this.handleSize / zoom;
    for (const pt of Object.values(handles)) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pt.x - hSize / 2, pt.y - hSize / 2, hSize, hSize);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5 / zoom;
      ctx.strokeRect(pt.x - hSize / 2, pt.y - hSize / 2, hSize, hSize);
    }
  }

  getCursor(hit) {
    if (!hit) return 'default';
    if (hit.mode === 'translate') return 'move';
    if (hit.mode === 'rotate') return 'crosshair';
    if (hit.mode === 'resize') {
      switch (hit.handle) {
        case 'n': case 's': return 'ns-resize';
        case 'e': case 'w': return 'ew-resize';
        case 'nw': case 'se': return 'nwse-resize';
        case 'ne': case 'sw': return 'nesw-resize';
      }
    }
    return 'default';
  }
}
