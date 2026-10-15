import { Layer } from '../models/Layer.js';

/**
 * Photoshop Drawing Tools Controller
 * Handles Move (V), Pen (P), Gradient (G), Brush (B), Eyedropper (I), Shapes (U), Text (T), Hand (H), Zoom (Z)
 */
export class DrawingTools {
  constructor(canvasRenderer, documentModel, onUpdateUI) {
    this.renderer = canvasRenderer;
    this.doc = documentModel;
    this.onUpdateUI = onUpdateUI;

    this.activeTool = 'move'; // 'move', 'direct', 'pen', 'brush', 'gradient', 'shape', 'eyedropper', 'text', 'hand', 'zoom'
    this.activeShapeType = 'rect'; // 'rect', 'bevel_rect', 'circle', 'line'
    this.shapeBevel = 12;

    // Active tool working states
    this.activePenPoints = [];
    this.activeGradientDrag = null;
    this.shapeDragStart = null;
    this.brushPath = [];
  }

  setTool(tool) {
    // If finishing pen tool with points, commit as path layer
    if (this.activeTool === 'pen' && this.activePenPoints.length > 1 && tool !== 'pen') {
      this.commitPenPath();
    }
    this.activeTool = tool;
    this.activePenPoints = [];
    this.activeGradientDrag = null;
    this.shapeDragStart = null;
    this.onUpdateUI();
  }

  handleMouseDown(worldX, worldY, screenX, screenY, e) {
    const isShift = e.shiftKey;
    const isAlt = e.altKey;

    switch (this.activeTool) {
      case 'pen': {
        // Pen Tool (Bezier Curve Creation)
        if (this.activePenPoints.length > 0) {
          const firstPt = this.activePenPoints[0];
          const distToFirst = Math.hypot(worldX - firstPt.x, worldY - firstPt.y);
          if (distToFirst <= 12 / this.renderer.zoom) {
            // Close path!
            this.commitPenPath(true);
            return;
          }
        }

        const newPt = {
          x: Math.round(worldX),
          y: Math.round(worldY),
          cp2x: Math.round(worldX),
          cp2y: Math.round(worldY),
          isCurve: false
        };
        this.activePenPoints.push(newPt);
        this.isDraggingPenHandle = true;
        break;
      }

      case 'gradient': {
        // Gradient Tool (Linear Drag)
        this.activeGradientDrag = {
          startX: worldX,
          startY: worldY,
          currentX: worldX,
          currentY: worldY
        };
        break;
      }

      case 'eyedropper': {
        // Sample pixel color from 2D canvas context
        this.sampleColorAt(screenX, screenY);
        break;
      }

      case 'shape': {
        this.shapeDragStart = { x: worldX, y: worldY };
        break;
      }

      case 'text': {
        const textLayer = new Layer({
          name: '텍스트 레이어',
          type: 'text',
          text: '새 텍스트',
          fontSize: 32,
          x: worldX,
          y: worldY,
          fill: this.doc.foregroundColor
        });
        this.doc.addLayer(textLayer);
        this.setTool('move');
        break;
      }

      case 'zoom': {
        const factor = isAlt ? 0.75 : 1.33;
        this.zoomAt(screenX, screenY, factor);
        break;
      }
    }
  }

  handleMouseMove(worldX, worldY, isShift = false) {
    if (this.activeTool === 'pen' && this.isDraggingPenHandle && this.activePenPoints.length > 0) {
      const lastPt = this.activePenPoints[this.activePenPoints.length - 1];
      lastPt.cp2x = Math.round(worldX);
      lastPt.cp2y = Math.round(worldY);
      lastPt.isCurve = true;
    } else if (this.activeTool === 'gradient' && this.activeGradientDrag) {
      this.activeGradientDrag.currentX = worldX;
      this.activeGradientDrag.currentY = worldY;
    }
  }

  handleMouseUp(worldX, worldY, isShift = false) {
    if (this.activeTool === 'pen') {
      this.isDraggingPenHandle = false;
    } else if (this.activeTool === 'gradient' && this.activeGradientDrag) {
      // Commit gradient to selected layer
      const selected = this.doc.getSelectedLayer();
      if (selected) {
        const dx = this.activeGradientDrag.currentX - this.activeGradientDrag.startX;
        const dy = this.activeGradientDrag.currentY - this.activeGradientDrag.startY;
        selected.fillType = 'linear-gradient';
        selected.gradient = {
          startX: 0,
          startY: 0,
          endX: selected.width,
          endY: selected.height,
          stops: [
            { offset: 0, color: this.doc.foregroundColor },
            { offset: 1, color: this.doc.backgroundColorSecondary }
          ]
        };
        this.doc.saveState();
        this.onUpdateUI();
      }
      this.activeGradientDrag = null;
    } else if (this.activeTool === 'shape' && this.shapeDragStart) {
      let w = Math.abs(worldX - this.shapeDragStart.x);
      let h = Math.abs(worldY - this.shapeDragStart.y);
      if (isShift) {
        const avg = Math.max(w, h);
        w = avg;
        h = avg;
      }

      if (w > 5 && h > 5) {
        const cx = (this.shapeDragStart.x + worldX) / 2;
        const cy = (this.shapeDragStart.y + worldY) / 2;

        let layer = null;
        if (this.activeShapeType === 'rect') {
          layer = new Layer({
            name: '사각형 레이어',
            type: 'rect',
            x: cx,
            y: cy,
            width: w,
            height: h,
            fill: this.doc.foregroundColor,
            bevel: 0
          });
        } else if (this.activeShapeType === 'bevel_rect') {
          layer = new Layer({
            name: '베벨 사각형 레이어',
            type: 'rect',
            x: cx,
            y: cy,
            width: w,
            height: h,
            fill: this.doc.foregroundColor,
            bevel: Math.min(this.shapeBevel, w / 3, h / 3)
          });
        } else if (this.activeShapeType === 'circle') {
          layer = new Layer({
            name: '원 레이어',
            type: 'circle',
            x: cx,
            y: cy,
            width: w,
            height: h,
            fill: this.doc.foregroundColor
          });
        }

        if (layer) {
          this.doc.addLayer(layer);
          this.onUpdateUI();
        }
      }
      this.shapeDragStart = null;
    }
  }

  commitPenPath(isClosed = false) {
    if (this.activePenPoints.length < 2) {
      this.activePenPoints = [];
      return;
    }

    // Calculate bounding box center
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const pt of this.activePenPoints) {
      minX = Math.min(minX, pt.x);
      minY = Math.min(minY, pt.y);
      maxX = Math.max(maxX, pt.x);
      maxY = Math.max(maxY, pt.y);
    }

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const w = Math.max(20, maxX - minX);
    const h = Math.max(20, maxY - minY);

    // Normalize points relative to center
    const localPoints = this.activePenPoints.map(p => ({
      x: p.x - cx,
      y: p.y - cy,
      cp1x: p.cp1x !== undefined ? p.cp1x - cx : undefined,
      cp1y: p.cp1y !== undefined ? p.cp1y - cy : undefined,
      cp2x: p.cp2x !== undefined ? p.cp2x - cx : undefined,
      cp2y: p.cp2y !== undefined ? p.cp2y - cy : undefined,
      isCurve: p.isCurve
    }));

    const pathLayer = new Layer({
      name: '베지어 패스 레이어',
      type: 'path',
      x: cx,
      y: cy,
      width: w,
      height: h,
      pathPoints: localPoints,
      isClosedPath: isClosed,
      fill: isClosed ? this.doc.foregroundColor : 'transparent',
      fillType: isClosed ? 'solid' : 'none',
      stroke: this.doc.foregroundColor,
      strokeWidth: 2
    });

    this.doc.addLayer(pathLayer);
    this.activePenPoints = [];
    this.setTool('move');
    this.onUpdateUI();
  }

  sampleColorAt(screenX, screenY) {
    try {
      const pixel = this.renderer.ctx.getImageData(screenX, screenY, 1, 1).data;
      const hex = `#${((1 << 24) + (pixel[0] << 16) + (pixel[1] << 8) + pixel[2]).toString(16).slice(1)}`;
      this.doc.foregroundColor = hex;
      this.onUpdateUI();
    } catch (err) {
      console.warn('Eyedropper pixel read error:', err);
    }
  }

  zoomAt(screenX, screenY, factor) {
    const newZoom = Math.min(4, Math.max(0.2, this.renderer.zoom * factor));
    this.renderer.panX = screenX - (screenX - this.renderer.panX) * (newZoom / this.renderer.zoom);
    this.renderer.panY = screenY - (screenY - this.renderer.panY) * (newZoom / this.renderer.zoom);
    this.renderer.zoom = newZoom;
    this.onUpdateUI();
  }
}
