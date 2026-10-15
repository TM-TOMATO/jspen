/**
 * Sprite Model
 * Represents any visual object on canvas: shape, image, text, etc.
 */
export class Sprite {
  constructor(options = {}) {
    this.id = options.id || 'sprite_' + Math.random().toString(36).substr(2, 9);
    this.name = options.name || '새 스프라이트';
    this.type = options.type || 'rect'; // 'rect', 'circle', 'text', 'image', 'star', 'triangle'
    
    // Transform
    this.x = options.x !== undefined ? options.x : 400;
    this.y = options.y !== undefined ? options.y : 300;
    this.width = options.width !== undefined ? options.width : 80;
    this.height = options.height !== undefined ? options.height : 80;
    this.rotation = options.rotation || 0; // degrees
    this.scaleX = options.scaleX !== undefined ? options.scaleX : 1;
    this.scaleY = options.scaleY !== undefined ? options.scaleY : 1;
    this.anchorX = 0.5; // Center anchor
    this.anchorY = 0.5;
    
    // Styling
    this.fill = options.fill || '#3b82f6';
    this.stroke = options.stroke || '#1d4ed8';
    this.strokeWidth = options.strokeWidth !== undefined ? options.strokeWidth : 0;
    this.cornerRadius = options.cornerRadius || 0;
    this.opacity = options.opacity !== undefined ? options.opacity : 1;
    this.visible = options.visible !== undefined ? options.visible : true;
    this.shadowColor = options.shadowColor || 'transparent';
    this.shadowBlur = options.shadowBlur || 0;
    
    // Text specific
    this.text = options.text || 'Hello JS';
    this.fontSize = options.fontSize || 32;
    this.fontFamily = options.fontFamily || 'Pretendard, -apple-system, BlinkMacSystemFont, sans-serif';
    this.fontWeight = options.fontWeight || 'bold';
    this.textAlign = options.textAlign || 'center';
    
    // Image specific
    this.imageUrl = options.imageUrl || '';
    this.imageElement = null;
    if (this.imageUrl) {
      this.loadImage(this.imageUrl);
    }
    
    // State & Layer
    this.zIndex = options.zIndex !== undefined ? options.zIndex : 0;
    this.locked = options.locked || false;
    
    // Movements (Behaviors)
    // Array of { id, type, enabled, params: { ... } }
    this.movements = options.movements || [];
    
    // Interactions (Events & Actions)
    // Array of { id, trigger, triggerParams, action, actionParams }
    this.interactions = options.interactions || [];

    // Runtime state (used during play mode)
    this.runtime = {
      vx: 0,
      vy: 0,
      initialX: this.x,
      initialY: this.y,
      initialRotation: this.rotation,
      isGrounded: false,
      patrolDir: 1,
      patrolStart: this.x,
      customVars: {}
    };
  }

  loadImage(url) {
    this.imageUrl = url;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      this.imageElement = img;
      if (this.width === 80 && this.height === 80 && img.naturalWidth) {
        // Auto adjust aspect ratio
        const aspect = img.naturalWidth / img.naturalHeight;
        this.width = 100 * aspect;
        this.height = 100;
      }
    };
    img.src = url;
  }

  resetRuntime() {
    this.runtime = {
      vx: 0,
      vy: 0,
      initialX: this.x,
      initialY: this.y,
      initialRotation: this.rotation,
      isGrounded: false,
      patrolDir: 1,
      patrolStart: this.x,
      customVars: {}
    };
  }

  clone() {
    const data = JSON.parse(JSON.stringify(this.toJSON()));
    data.id = 'sprite_' + Math.random().toString(36).substr(2, 9);
    data.name = this.name + ' (복사본)';
    data.x += 30;
    data.y += 30;
    return new Sprite(data);
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
      fill: this.fill,
      stroke: this.stroke,
      strokeWidth: this.strokeWidth,
      cornerRadius: this.cornerRadius,
      opacity: this.opacity,
      visible: this.visible,
      shadowColor: this.shadowColor,
      shadowBlur: this.shadowBlur,
      text: this.text,
      fontSize: this.fontSize,
      fontFamily: this.fontFamily,
      fontWeight: this.fontWeight,
      textAlign: this.textAlign,
      imageUrl: this.imageUrl,
      zIndex: this.zIndex,
      locked: this.locked,
      movements: JSON.parse(JSON.stringify(this.movements)),
      interactions: JSON.parse(JSON.stringify(this.interactions))
    };
  }
}
