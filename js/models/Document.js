import { Layer } from './Layer.js';

/**
 * Photoshop Document Model
 * Manages canvas artboard, layer stack, foreground/background colors, and undo/redo history.
 */
export class Document {
  constructor(options = {}) {
    this.name = options.name || '무제-1 (Untitled-1)';
    this.width = options.width || 800;
    this.height = options.height || 600;
    this.backgroundColor = options.backgroundColor || '#111827';
    this.transparentBackground = options.transparentBackground || false;

    // Photoshop Tool Colors (Foreground / Background)
    this.foregroundColor = options.foregroundColor || '#38bdf8';
    this.backgroundColorSecondary = options.backgroundColorSecondary || '#ffffff';

    this.layers = [];
    this.selectedLayerId = null;

    // Undo / Redo History
    this.history = [];
    this.historyIndex = -1;
    this.maxHistory = 50;

    if (options.layers && Array.isArray(options.layers)) {
      this.layers = options.layers.map(l => new Layer(l));
    }
  }

  addLayer(layer) {
    if (layer.zIndex === undefined || layer.zIndex === 0) {
      layer.zIndex = this.layers.length;
    }
    this.layers.push(layer);
    this.sortLayers();
    this.selectedLayerId = layer.id;
    this.saveState();
    return layer;
  }

  removeLayer(id) {
    const idx = this.layers.findIndex(l => l.id === id);
    if (idx !== -1) {
      this.layers.splice(idx, 1);
      if (this.selectedLayerId === id) {
        this.selectedLayerId = this.layers.length > 0 ? this.layers[Math.max(0, idx - 1)].id : null;
      }
      this.sortLayers();
      this.saveState();
    }
  }

  getLayer(id) {
    return this.layers.find(l => l.id === id) || null;
  }

  getSelectedLayer() {
    if (!this.selectedLayerId) return null;
    return this.getLayer(this.selectedLayerId);
  }

  duplicateLayer(id) {
    const target = this.getLayer(id);
    if (target) {
      const cloned = target.clone();
      cloned.zIndex = this.layers.length;
      this.layers.push(cloned);
      this.selectedLayerId = cloned.id;
      this.sortLayers();
      this.saveState();
      return cloned;
    }
    return null;
  }

  moveLayerOrder(id, direction) {
    // direction: 'up', 'down', 'top', 'bottom'
    const index = this.layers.findIndex(l => l.id === id);
    if (index === -1) return;

    if (direction === 'up' && index < this.layers.length - 1) {
      const temp = this.layers[index];
      this.layers[index] = this.layers[index + 1];
      this.layers[index + 1] = temp;
    } else if (direction === 'down' && index > 0) {
      const temp = this.layers[index];
      this.layers[index] = this.layers[index - 1];
      this.layers[index - 1] = temp;
    } else if (direction === 'top' && index < this.layers.length - 1) {
      const item = this.layers.splice(index, 1)[0];
      this.layers.push(item);
    } else if (direction === 'bottom' && index > 0) {
      const item = this.layers.splice(index, 1)[0];
      this.layers.unshift(item);
    }

    this.sortLayers();
    this.saveState();
  }

  sortLayers() {
    this.layers.sort((a, b) => a.zIndex - b.zIndex);
    this.layers.forEach((l, i) => l.zIndex = i);
  }

  // Photoshop Color Shortcuts
  swapColors() {
    const temp = this.foregroundColor;
    this.foregroundColor = this.backgroundColorSecondary;
    this.backgroundColorSecondary = temp;
  }

  resetColors() {
    this.foregroundColor = '#000000';
    this.backgroundColorSecondary = '#ffffff';
  }

  saveState() {
    const snapshot = JSON.stringify(this.toJSON());
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
    this.transparentBackground = data.transparentBackground || false;
    this.foregroundColor = data.foregroundColor || this.foregroundColor;
    this.backgroundColorSecondary = data.backgroundColorSecondary || this.backgroundColorSecondary;
    this.layers = (data.layers || []).map(l => new Layer(l));
    this.selectedLayerId = data.selectedLayerId || (this.layers[0] ? this.layers[0].id : null);
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
      transparentBackground: this.transparentBackground,
      foregroundColor: this.foregroundColor,
      backgroundColorSecondary: this.backgroundColorSecondary,
      selectedLayerId: this.selectedLayerId,
      layers: this.layers.map(l => l.toJSON())
    };
  }
}
