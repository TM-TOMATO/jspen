import { Document } from './models/Document.js';
import { Layer } from './models/Layer.js';
import { PhotoshopCanvas } from './engine/PhotoshopCanvas.js';
import { DrawingTools } from './engine/DrawingTools.js';
import { TransformBox } from './engine/TransformBox.js';
import { ModuleEngine } from './modules/ModuleEngine.js';
import { MenuBar } from './ui/MenuBar.js';
import { ToolOptionBar } from './ui/ToolOptionBar.js';
import { Toolbox } from './ui/Toolbox.js';
import { LayersPanel } from './ui/LayersPanel.js';
import { InspectorPanel } from './ui/InspectorPanel.js';
import { ExportModal } from './ui/ExportModal.js';

/**
 * Main Application Controller for JSPen Studio
 */
class App {
  constructor() {
    this.canvas = document.getElementById('viewportCanvas');
    this.viewportContainer = document.getElementById('viewportContainer');

    // 1. Initialize Document Model with Default Design Artwork
    this.doc = new Document({
      name: '인터랙티브 배너 (Banner-1)',
      width: 800,
      height: 600,
      backgroundColor: '#0f172a',
      layers: [
        // Layer 1: Beveled Glass Card with 3D Tilt & Particle Emitter
        new Layer({
          id: 'card_main',
          name: '메인 베벨 카드',
          type: 'rect',
          x: 400,
          y: 300,
          width: 280,
          height: 180,
          bevel: 16,
          fill: '#38bdf8',
          opacity: 0.95,
          stroke: '#0284c7',
          strokeWidth: 2,
          modules: [
            {
              id: 'm_tilt',
              type: 'parallax_3d_tilt',
              name: '마우스 3D 입체 틸트',
              category: 'motions',
              enabled: true,
              params: { maxAngle: 25, reverse: false }
            },
            {
              id: 'm_particles',
              type: 'particle_emitter',
              name: '파티클 분출기',
              category: 'motions',
              enabled: true,
              params: { count: 4, color: '#fbbf24', speed: 3, trigger: 'move' }
            }
          ]
        }),
        // Layer 2: Pet Sprite with Follow Target (Spring Link)
        new Layer({
          id: 'orb_pet',
          name: '추적 오브 (Spring Pet)',
          type: 'circle',
          x: 400,
          y: 200,
          width: 50,
          height: 50,
          fill: '#ec4899',
          stroke: '#f43f5e',
          strokeWidth: 2,
          modules: [
            {
              id: 'm_follow',
              type: 'follow_target',
              name: '타겟 추적',
              category: 'links',
              enabled: true,
              params: { targetLayerId: 'card_main', type: 'spring', stiffness: 0.08, damping: 0.85 }
            }
          ]
        }),
        // Layer 3: Title Text
        new Layer({
          id: 'txt_title',
          name: '타이틀 텍스트',
          type: 'text',
          x: 400,
          y: 300,
          text: 'JSPen Studio',
          fontSize: 32,
          fontWeight: 'bold',
          fill: '#ffffff',
          modules: []
        })
      ]
    });
    this.doc.selectedLayerId = 'card_main';

    // 2. Initialize Engines
    this.renderer = new PhotoshopCanvas(this.canvas, this.doc);
    this.moduleEngine = new ModuleEngine(this.doc);

    this.transformBox = new TransformBox(this.doc, (layer) => {
      this.inspector.updateInputsFromTransform(layer);
    });

    this.tools = new DrawingTools(this.renderer, this.doc, () => this.refreshAllUI());

    // 3. Initialize UI Components
    this.exportModal = new ExportModal(this.doc);

    this.menuBar = new MenuBar(document.getElementById('topMenuBar'), this.doc, {
      onStartLivePreview: () => this.startLivePreview(),
      onStopLivePreview: () => this.stopLivePreview(),
      onUpdate: () => this.refreshAllUI(),
      onToggleRulers: () => {
        this.renderer.showRulers = !this.renderer.showRulers;
      },
      onFitScreen: () => this.fitToScreen(),
      onResetZoom: () => {
        this.renderer.zoom = 1;
        this.centerArtboard();
      },
      onExport: () => this.exportModal.show()
    });

    this.toolOptionBar = new ToolOptionBar(
      document.getElementById('toolOptionBar'),
      this.tools,
      this.doc,
      () => this.refreshAllUI()
    );

    this.toolbox = new Toolbox(
      document.getElementById('leftToolbox'),
      this.tools,
      this.doc,
      () => {
        this.toolOptionBar.refresh();
      }
    );

    this.layersPanel = new LayersPanel(
      document.getElementById('layersContainer'),
      this.doc,
      (id) => {
        this.doc.selectedLayerId = id;
        this.inspector.render();
      },
      () => this.refreshAllUI()
    );

    this.inspector = new InspectorPanel(
      document.getElementById('inspectorContainer'),
      this.doc,
      () => {
        this.layersPanel.refresh();
      }
    );

    // 4. Setup Viewport Events & Photoshop Shortcuts
    this.initViewportEvents();
    this.initKeyboardShortcuts();
    this.handleWindowResize();
    this.centerArtboard();

    window.addEventListener('resize', () => this.handleWindowResize());

    // 5. Start Render & Update Loop
    this.startMainLoop();
  }

  handleWindowResize() {
    const rect = this.viewportContainer.getBoundingClientRect();
    this.renderer.resize(rect.width, rect.height);
  }

  centerArtboard() {
    const rect = this.viewportContainer.getBoundingClientRect();
    this.renderer.panX = (rect.width - this.doc.width * this.renderer.zoom) / 2;
    this.renderer.panY = (rect.height - this.doc.height * this.renderer.zoom) / 2;
  }

  fitToScreen() {
    const rect = this.viewportContainer.getBoundingClientRect();
    const pad = 60;
    const scaleX = (rect.width - pad * 2) / this.doc.width;
    const scaleY = (rect.height - pad * 2) / this.doc.height;
    this.renderer.zoom = Math.min(scaleX, scaleY, 1.5);
    this.centerArtboard();
  }

  startLivePreview() {
    this.renderer.mode = 'preview';
    this.moduleEngine.start();
  }

  stopLivePreview() {
    this.renderer.mode = 'edit';
    this.moduleEngine.stop();
    this.refreshAllUI();
  }

  refreshAllUI() {
    this.toolOptionBar.refresh();
    this.toolbox.refresh();
    this.layersPanel.refresh();
    this.inspector.render();
  }

  initViewportEvents() {
    let isPanning = false;
    let panStart = { x: 0, y: 0 };
    let initialPan = { x: 0, y: 0 };
    let mouseWorld = { x: 0, y: 0 };
    let mouseScreen = { x: 0, y: 0 };
    let isMouseDown = false;
    let isMouseClicked = false;

    this.canvas.addEventListener('contextmenu', e => e.preventDefault());

    this.canvas.addEventListener('mousedown', e => {
      const rect = this.canvas.getBoundingClientRect();
      mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      mouseWorld = this.renderer.screenToWorld(mouseScreen.x, mouseScreen.y);
      isMouseDown = true;
      isMouseClicked = true;

      // In Preview Mode, send inputs to Module Engine
      if (this.renderer.mode === 'preview') {
        return;
      }

      // Hand Tool or Spacebar or Middle/Right Click: Pan
      if (this.tools.activeTool === 'hand' || e.spaceKey || e.button === 1 || e.button === 2) {
        isPanning = true;
        panStart = { x: e.clientX, y: e.clientY };
        initialPan = { x: this.renderer.panX, y: this.renderer.panY };
        this.canvas.style.cursor = 'grab';
        return;
      }

      // Move Tool (V) Interaction
      if (this.tools.activeTool === 'move') {
        const selected = this.doc.getSelectedLayer();
        const hit = selected ? this.transformBox.hitTest(mouseWorld.x, mouseWorld.y, selected) : null;

        if (hit) {
          this.transformBox.startDrag(mouseWorld.x, mouseWorld.y, hit, selected);
          return;
        }

        // Hit-test other visible layers (top to bottom)
        let found = null;
        for (let i = this.doc.layers.length - 1; i >= 0; i--) {
          const l = this.doc.layers[i];
          if (!l.visible || l.locked) continue;
          if (this.moduleEngine.isPointInsideLayer(mouseWorld.x, mouseWorld.y, l)) {
            found = l;
            break;
          }
        }

        if (found) {
          this.doc.selectedLayerId = found.id;
          this.refreshAllUI();
          const newHit = this.transformBox.hitTest(mouseWorld.x, mouseWorld.y, found);
          if (newHit) {
            this.transformBox.startDrag(mouseWorld.x, mouseWorld.y, newHit, found);
          }
        } else {
          this.doc.selectedLayerId = null;
          this.refreshAllUI();
        }
        return;
      }

      // Other drawing tools
      this.tools.handleMouseDown(mouseWorld.x, mouseWorld.y, mouseScreen.x, mouseScreen.y, e);
    });

    window.addEventListener('mousemove', e => {
      const rect = this.canvas.getBoundingClientRect();
      mouseScreen = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      mouseWorld = this.renderer.screenToWorld(mouseScreen.x, mouseScreen.y);

      if (this.renderer.mode === 'preview') return;

      if (isPanning) {
        this.renderer.panX = initialPan.x + (e.clientX - panStart.x);
        this.renderer.panY = initialPan.y + (e.clientY - panStart.y);
        this.canvas.style.cursor = 'grabbing';
        return;
      }

      if (this.transformBox.mode) {
        this.transformBox.drag(mouseWorld.x, mouseWorld.y, e.shiftKey, e.altKey);
        return;
      }

      if (['pen', 'gradient', 'shape'].includes(this.tools.activeTool)) {
        this.tools.handleMouseMove(mouseWorld.x, mouseWorld.y, e.shiftKey);
        return;
      }

      // Update Cursor for Move tool
      if (this.tools.activeTool === 'move') {
        const selected = this.doc.getSelectedLayer();
        const hit = selected ? this.transformBox.hitTest(mouseWorld.x, mouseWorld.y, selected) : null;
        this.canvas.style.cursor = this.transformBox.getCursor(hit);
      } else {
        this.canvas.style.cursor = 'crosshair';
      }
    });

    window.addEventListener('mouseup', e => {
      isMouseDown = false;

      if (this.renderer.mode === 'preview') return;

      if (isPanning) {
        isPanning = false;
        this.canvas.style.cursor = 'default';
      }

      if (this.transformBox.mode) {
        this.transformBox.endDrag();
        this.inspector.render();
      }

      this.tools.handleMouseUp(mouseWorld.x, mouseWorld.y, e.shiftKey);
    });

    // Zoom on Alt + Wheel (Photoshop Standard)
    this.canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const factor = e.deltaY < 0 ? 1.08 : 0.92;
      this.tools.zoomAt(mouseScreen.x, mouseScreen.y, factor);
    }, { passive: false });

    // Store state for loop
    this.mouseWorld = mouseWorld;
    this.mouseScreen = mouseScreen;
    this.getMouseState = () => ({ mouseWorld, mouseScreen, isMouseDown, isMouseClicked });
    this.resetMouseClicked = () => { isMouseClicked = false; };
  }

  initKeyboardShortcuts() {
    window.addEventListener('keydown', e => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      const key = e.key.toLowerCase();

      // Tool Shortcuts
      if (!e.ctrlKey && !e.metaKey) {
        switch (key) {
          case 'v': this.tools.setTool('move'); this.toolbox.refresh(); break;
          case 'a': this.tools.setTool('direct'); this.toolbox.refresh(); break;
          case 'p': this.tools.setTool('pen'); this.toolbox.refresh(); break;
          case 'b': this.tools.setTool('brush'); this.toolbox.refresh(); break;
          case 'g': this.tools.setTool('gradient'); this.toolbox.refresh(); break;
          case 'u': this.tools.setTool('shape'); this.toolbox.refresh(); break;
          case 't': this.tools.setTool('text'); this.toolbox.refresh(); break;
          case 'i': this.tools.setTool('eyedropper'); this.toolbox.refresh(); break;
          case 'h': this.tools.setTool('hand'); this.toolbox.refresh(); break;
          case 'z': this.tools.setTool('zoom'); this.toolbox.refresh(); break;
          case 'x': this.doc.swapColors(); this.toolbox.refresh(); break;
          case 'd': this.doc.resetColors(); this.toolbox.refresh(); break;
          case 'delete':
          case 'backspace':
            if (this.doc.selectedLayerId) {
              e.preventDefault();
              this.doc.removeLayer(this.doc.selectedLayerId);
              this.refreshAllUI();
            }
            break;
        }
      }

      // Ctrl Combinations
      if (e.ctrlKey || e.metaKey) {
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          if (this.doc.undo()) this.refreshAllUI();
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          if (this.doc.redo()) this.refreshAllUI();
        } else if (key === 'j') {
          e.preventDefault();
          if (this.doc.selectedLayerId) {
            this.doc.duplicateLayer(this.doc.selectedLayerId);
            this.refreshAllUI();
          }
        } else if (key === '0') {
          e.preventDefault();
          this.fitToScreen();
        } else if (key === '1') {
          e.preventDefault();
          this.renderer.zoom = 1;
          this.centerArtboard();
        } else if (key === 'r') {
          e.preventDefault();
          this.renderer.showRulers = !this.renderer.showRulers;
        }
      }
    });
  }

  startMainLoop() {
    let lastTime = performance.now();

    const loop = (now) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      const mState = this.getMouseState();

      if (this.renderer.mode === 'preview') {
        this.moduleEngine.update(dt, mState.mouseWorld, mState.mouseScreen, mState.isMouseDown, mState.isMouseClicked);
      }

      this.renderer.render(
        this.tools.activeTool,
        this.transformBox,
        this.tools.activePenPoints,
        this.tools.activeGradientDrag
      );

      this.resetMouseClicked();
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

// Bootstrap
window.addEventListener('DOMContentLoaded', () => {
  window.jspenApp = new App();
});
