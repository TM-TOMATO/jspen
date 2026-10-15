/**
 * Photoshop-style Layer Model
 * Supports vector paths (Bezier), shapes with bevels, gradients, blend modes, and modular behaviors.
 */
export class Layer {
  constructor(options = {}) {
    this.id = options.id || 'layer_' + Math.random().toString(36).substr(2, 9);
    this.name = options.name || '새 레이어';
    this.type = options.type || 'rect'; // 'rect', 'circle', 'path', 'text', 'line', 'image'
    
    // Transform
    this.x = options.x !== undefined ? options.x : 400;
    this.y = options.y !== undefined ? options.y : 300;
    this.width = options.width !== undefined ? options.width : 120;
    this.height = options.height !== undefined ? options.height : 120;
    this.rotation = options.rotation || 0; // degrees
    this.scaleX = options.scaleX !== undefined ? options.scaleX : 1;
    this.scaleY = options.scaleY !== undefined ? options.scaleY : 1;
    this.lockAspectRatio = options.lockAspectRatio || false;

    // Photoshop Appearance & Styling
    this.opacity = options.opacity !== undefined ? options.opacity : 1; // 0 ~ 1
    this.fillOpacity = options.fillOpacity !== undefined ? options.fillOpacity : 1; // 0 ~ 1
    this.blendMode = options.blendMode || 'source-over'; // 'source-over'(Normal), 'multiply', 'screen', 'overlay', etc.
    
    // Fill & Gradient
    this.fillType = options.fillType || 'solid'; // 'solid', 'linear-gradient', 'radial-gradient', 'none'
    this.fill = options.fill || '#38bdf8';
    this.gradient = options.gradient || {
      startX: 0, startY: 0, endX: 120, endY: 120,
      stops: [
        { offset: 0, color: '#38bdf8' },
        { offset: 1, color: '#818cf8' }
      ]
    };

    // Stroke
    this.stroke = options.stroke || '#0284c7';
    this.strokeWidth = options.strokeWidth !== undefined ? options.strokeWidth : 0;
    this.strokePosition = options.strokePosition || 'center'; // 'center', 'inside', 'outside'
    this.strokeDash = options.strokeDash || []; // e.g. [5, 5] for dashed

    // Bevel & Corner Radius
    this.bevel = options.bevel || 0; // Corner chamfer depth in px
    this.cornerRadius = options.cornerRadius || 0; // Uniform or object { tl, tr, br, bl }
    this.cornerRadiusTL = options.cornerRadiusTL || 0;
    this.cornerRadiusTR = options.cornerRadiusTR || 0;
    this.cornerRadiusBR = options.cornerRadiusBR || 0;
    this.cornerRadiusBL = options.cornerRadiusBL || 0;

    // Vector Path Points (for Pen Tool bezier curves)
    // Array of { x, y, cp1x, cp1y, cp2x, cp2y, isCurve }
    this.pathPoints = options.pathPoints || [];
    this.isClosedPath = options.isClosedPath !== undefined ? options.isClosedPath : true;

    // Text specific
    this.text = options.text || '텍스트 레이어';
    this.fontSize = options.fontSize || 32;
    this.fontFamily = options.fontFamily || 'Pretendard, -apple-system, sans-serif';
    this.fontWeight = options.fontWeight || '600';
    this.textAlign = options.textAlign || 'center';
    this.letterSpacing = options.letterSpacing || 0;

    // Image specific
    this.imageUrl = options.imageUrl || '';
    this.imageElement = null;
    if (this.imageUrl) {
      this.loadImage(this.imageUrl);
    }

    // State & Layer Organization
    this.visible = options.visible !== undefined ? options.visible : true;
    this.locked = options.locked || false;
    this.zIndex = options.zIndex !== undefined ? options.zIndex : 0;

    // Attached Feature Modules (Added via [+] button)
    // Array of { id, type, name, category, enabled, params: { ... } }
    this.modules = options.modules || [];

    // Runtime state (used during live preview)
    this.runtime = {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      opacity: this.opacity,
      tiltAngle: 0,
      vx: 0,
      vy: 0,
      customValues: {}
    };
  }

  loadImage(url) {
    this.imageUrl = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.imageElement = img;
      if (this.width === 120 && this.height === 120 && img.naturalWidth) {
        this.width = Math.min(600, img.naturalWidth);
        this.height = (this.width / img.naturalWidth) * img.naturalHeight;
      }
    };
    img.src = url;
  }

  resetRuntime() {
    this.runtime = {
      x: this.x,
      y: this.y,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      opacity: this.opacity,
      tiltAngle: 0,
      vx: 0,
      vy: 0,
      customValues: {}
    };
  }

  clone() {
    const data = JSON.parse(JSON.stringify(this.toJSON()));
    data.id = 'layer_' + Math.random().toString(36).substr(2, 9);
    data.name = this.name + ' 복사본';
    data.x += 25;
    data.y += 25;
    return new Layer(data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      type: this.type,
      x: this.x,
      y: this.y,
      width: this.width,
      height: this.height,
      rotation: this.rotation,
      scaleX: this.scaleX,
      scaleY: this.scaleY,
      lockAspectRatio: this.lockAspectRatio,
      opacity: this.opacity,
      fillOpacity: this.fillOpacity,
      blendMode: this.blendMode,
      fillType: this.fillType,
      fill: this.fill,
      gradient: JSON.parse(JSON.stringify(this.gradient)),
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      strokePosition: this.strokePosition,
      strokeDash: this.strokeDash,
      bevel: this.bevel,
      cornerRadius: this.cornerRadius,
      cornerRadiusTL: this.cornerRadiusTL,
      cornerRadiusTR: this.cornerRadiusTR,
      cornerRadiusBR: this.cornerRadiusBR,
      cornerRadiusBL: this.cornerRadiusBL,
      pathPoints: JSON.parse(JSON.stringify(this.pathPoints)),
      isClosedPath: this.isClosedPath,
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      letterSpacing: this.letterSpacing,
      imageUrl: this.imageUrl,
      visible: this.visible,
      locked: this.locked,
      zIndex: this.zIndex,
      modules: JSON.parse(JSON.stringify(this.modules))
    };
  }
}
