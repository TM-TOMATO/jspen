import { Sprite } from './Sprite.js';

/**
 * Project Model
 * Manages canvas settings, sprite list, global variables, and undo/redo history.
 */
export class Project {
  constructor(options = {}) {
    this.name = options.name || '새 인터랙티브 프로젝트';
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.backgroundColor = options.backgroundColor || '#0f172a'; // Deep slate
    
    this.sprites = [];
    this.variables = options.variables || [
      { name: 'score', value: 0, initial: 0 },
      { name: 'lives', value: 3, initial: 3 }
    ];

    this.selectedSpriteId = null;
    
    // History for Undo / Redo
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 40;

    if (options.sprites && Array.isArray(options.sprites)) {
      this.sprites = options.sprites.map(s => new Sprite(s));
    }
  }

  addSprite(sprite) {
    if (!sprite.zIndex) {
      sprite.zIndex = this.sprites.length;
    }
    this.sprites.push(sprite);
    this.sortLayers();
    this.saveState();
    return sprite;
  }

  removeSprite(id) {
    const index = this.sprites.findIndex(s => s.id === id);
    if (index !== -1) {
      this.sprites.splice(index, 1);
      if (this.selectedSpriteId === id) {
        this.selectedSpriteId = null;
      }
      this.sortLayers();
      this.saveState();
    }
  }

  getSprite(id) {
    return this.sprites.find(s => s.id === id) || null;
  }

  getSelectedSprite() {
    if (!this.selectedSpriteId) return null;
    return this.getSprite(this.selectedSpriteId);
  }

  duplicateSprite(id) {
    const target = this.getSprite(id);
    if (target) {
      const cloned = target.clone();
      cloned.zIndex = this.sprites.length;
      this.sprites.push(cloned);
      this.selectedSpriteId = cloned.id;
      this.sortLayers();
      this.saveState();
      return cloned;
    }
    return null;
  }

  moveLayer(id, direction) {
    // direction: 'up', 'down', 'top', 'bottom'
    const index = this.sprites.findIndex(s => s.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < this.sprites.length - 1) {
      const temp = this.sprites[index];
      this.sprites[index] = this.sprites[index + 1];
      this.sprites[index + 1] = temp;
    } else if (direction === 'down' && index > 0) {
      const temp = this.sprites[index];
      this.sprites[index] = this.sprites[index - 1];
      this.sprites[index - 1] = temp;
    } else if (direction === 'top' && index < this.sprites.length - 1) {
      const item = this.sprites.splice(index, 1)[0];
      this.sprites.push(item);
    } else if (direction === 'bottom' && index > 0) {
      const item = this.sprites.splice(index, 1)[0];
      this.sprites.unshift(item);
    }

    this.sprites.forEach((s, i) => s.zIndex = i);
    this.saveState();
  }

  sortLayers() {
    this.sprites.sort((a, b) => a.zIndex - b.zIndex);
    this.sprites.forEach((s, i) => s.zIndex = i);
  }

  resetVariables() {
    this.variables.forEach(v => {
      v.value = v.initial;
    });
  }

  getVariable(name) {
    const v = this.variables.find(item => item.name === name);
    return v ? v.value : 0;
  }

  setVariable(name, val) {
    const v = this.variables.find(item => item.name === name);
    if (v) {
      v.value = val;
    } else {
      this.variables.push({ name, value: val, initial: val });
    }
  }

  saveState() {
    const snapshot = JSON.stringify(this.toJSON());
    // Remove future states if we performed an action after undo
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    this.history.push(snapshot);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      const snapshot = JSON.parse(this.history[this.historyIndex]);
      this.loadFromData(snapshot, false);
      return true;
    }
    return false;
  }

  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const snapshot = JSON.parse(this.history[this.historyIndex]);
      this.loadFromData(snapshot, false);
      return true;
    }
    return false;
  }

  loadFromData(data, resetHistory = true) {
    this.name = data.name || this.name;
    this.width = data.width || this.width;
    this.height = data.height || this.height;
    this.backgroundColor = data.backgroundColor || this.backgroundColor;
    this.variables = data.variables || [];
    this.sprites = (data.sprites || []).map(s => new Sprite(s));
    this.sortLayers();

    if (resetHistory) {
      this.history = [];
      this.historyIndex = -1;
      this.saveState();
    }
  }

  toJSON() {
    return {
      name: this.name,
      width: this.width,
      height: this.height,
      backgroundColor: this.backgroundColor,
      variables: JSON.parse(JSON.stringify(this.variables)),
      sprites: this.sprites.map(s => s.toJSON())
    };
  }
}
