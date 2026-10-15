/**
 * Transform Gizmo
 * Renders selection bounding box, 8 resize handles, and rotation handle.
 * Handles interactive mouse transformations.
 */
export class TransformGizmo {
  constructor(canvas, project, onTransformChange) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.project = project;
    this.onTransformChange = onTransformChange;

    this.handleSize = 8;
    this.rotateHandleOffset = 25;
    
    // Drag state
    this.mode = null; // 'translate', 'resize', 'rotate'
    this.activeHandle = null; // 'nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w', 'rot'
    this.startMouse = { x: 0, y: 0 };
    this.startSprite = null;

    this.snapToGrid = false;
    this.gridSize = 20;
  }

  getHandles(sprite) {
    const halfW = (sprite.width * sprite.scaleX) / 2;
    const halfH = (sprite.height * sprite.scaleY) / 2;
    const rad = (sprite.rotation * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const localPoints = {
      nw: { x: -halfW, y: -halfH },
      n:  { x: 0,      y: -halfH },
      ne: { x: halfW,  y: -halfH },
      e:  { x: halfW,  y: 0 },
      se: { x: halfW,  y: halfH },
      s:  { x: 0,      y: halfH },
      sw: { x: -halfW, y: halfH },
      w:  { x: -halfW, y: 0 },
      rot:{ x: 0,      y: -halfH - this.rotateHandleOffset }
    };

    const worldPoints = {};
    for (const [key, pt] of Object.entries(localPoints)) {
      worldPoints[key] = {
        x: sprite.x + (pt.x * cos - pt.y * sin),
        y: sprite.y + (pt.x * sin + pt.y * cos)
      };
    }

    return worldPoints;
  }

  hitTest(worldX, worldY, sprite) {
    if (!sprite || sprite.locked || !sprite.visible) return null;

    const handles = this.getHandles(sprite);
    const hitRadius = this.handleSize + 4;

    // 1. Check rotation handle
    const rotDist = Math.hypot(worldX - handles.rot.x, worldY - handles.rot.y);
    if (rotDist <= hitRadius) {
      return { mode: 'rotate', handle: 'rot' };
    }

    // 2. Check resize handles
    for (const [handle, pt] of Object.entries(handles)) {
      if (handle === 'rot') continue;
      const d = Math.hypot(worldX - pt.x, worldY - pt.y);
      if (d <= hitRadius) {
        return { mode: 'resize', handle };
      }
    }

    // 3. Check inside sprite body for translate
    const halfW = (sprite.width * sprite.scaleX) / 2;
    const halfH = (sprite.height * sprite.scaleY) / 2;
    const rad = (-sprite.rotation * Math.PI) / 180;
    const dx = worldX - sprite.x;
    const dy = worldY - sprite.y;
    const lx = dx * Math.cos(rad) - dy * Math.sin(rad);
    const ly = dx * Math.sin(rad) + dy * Math.cos(rad);

    if (Math.abs(lx) <= halfW && Math.abs(ly) <= halfH) {
      return { mode: 'translate', handle: null };
    }

    return null;
  }

  startDrag(worldX, worldY, hit) {
    const sprite = this.project.getSelectedSprite();
    if (!sprite || !hit) return false;

    this.mode = hit.mode;
    this.activeHandle = hit.handle;
    this.startMouse = { x: worldX, y: worldY };
    this.startSprite = {
      x: sprite.x,
      y: sprite.y,
      width: sprite.width,
      height: sprite.height,
      rotation: sprite.rotation,
      scaleX: sprite.scaleX,
      scaleY: sprite.scaleY
    };
    return true;
  }

  drag(worldX, worldY, isShiftDown = false) {
    const sprite = this.project.getSelectedSprite();
    if (!sprite || !this.mode) return;

    if (this.mode === 'translate') {
      let nx = this.startSprite.x + (worldX - this.startMouse.x);
      let ny = this.startSprite.y + (worldY - this.startMouse.y);

      if (this.snapToGrid) {
        nx = Math.round(nx / this.gridSize) * this.gridSize;
        ny = Math.round(ny / this.gridSize) * this.gridSize;
      }

      sprite.x = nx;
      sprite.y = ny;
    } else if (this.mode === 'rotate') {
      const angleRad = Math.atan2(worldY - sprite.y, worldX - sprite.x);
      let deg = (angleRad * (180 / Math.PI)) + 90;
      if (deg < 0) deg += 360;
      if (isShiftDown) {
        // Snap to 15 degrees
        deg = Math.round(deg / 15) * 15;
      }
      sprite.rotation = Math.round(deg);
    } else if (this.mode === 'resize') {
      // Calculate local delta
      const rad = (-this.startSprite.rotation * Math.PI) / 180;
      const dx = worldX - this.startMouse.x;
      const dy = worldY - this.startMouse.y;
      const ldx = dx * Math.cos(rad) - dy * Math.sin(rad);
      const ldy = dx * Math.sin(rad) + dy * Math.cos(rad);

      let newW = this.startSprite.width;
      let newH = this.startSprite.height;

      const handle = this.activeHandle;
      if (handle.includes('e')) newW += ldx * 2;
      if (handle.includes('w')) newW -= ldx * 2;
      if (handle.includes('s')) newH += ldy * 2;
      if (handle.includes('n')) newH -= ldy * 2;

      newW = Math.max(10, Math.round(newW));
      newH = Math.max(10, Math.round(newH));

      if (isShiftDown || sprite.type === 'circle') {
        // Uniform aspect ratio
        const avg = Math.max(newW, newH);
        newW = avg;
        newH = avg;
      }

      sprite.width = newW;
      sprite.height = newH;
    }

    if (this.onTransformChange) {
      this.onTransformChange(sprite);
    }
  }

  endDrag() {
    if (this.mode) {
      this.mode = null;
      this.activeHandle = null;
      this.project.saveState();
    }
  }

  draw(sprite, zoom = 1) {
    if (!sprite || !sprite.visible) return;

    const ctx = this.ctx;
    const halfW = (sprite.width * sprite.scaleX) / 2;
    const halfH = (sprite.height * sprite.scaleY) / 2;
    const handles = this.getHandles(sprite);

    ctx.save();
    ctx.translate(sprite.x, sprite.y);
    ctx.rotate((sprite.rotation * Math.PI) / 180);

    // 1. Draw Bounding Box
    ctx.strokeStyle = '#38bdf8'; // Sky blue
    ctx.lineWidth = 1.5 / zoom;
    ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.strokeRect(-halfW, -halfH, halfW * 2, halfH * 2);
    ctx.setLineDash([]);

    // 2. Line to rotation handle
    ctx.beginPath();
    ctx.moveTo(0, -halfH);
    ctx.lineTo(0, -halfH - this.rotateHandleOffset);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    ctx.restore();

    // 3. Draw Handles in world coordinates for sharp rendering
    const hSize = this.handleSize / zoom;

    // Rotation handle
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.arc(handles.rot.x, handles.rot.y, hSize * 0.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2 / zoom;
    ctx.stroke();

    // 8 Resize handles
    for (const [name, pt] of Object.entries(handles)) {
      if (name === 'rot') continue;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(pt.x - hSize / 2, pt.y - hSize / 2, hSize, hSize);
      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 1.5 / zoom;
      ctx.strokeRect(pt.x - hSize / 2, pt.y - hSize / 2, hSize, hSize);
    }
  }

  getCursorForHit(hit) {
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
