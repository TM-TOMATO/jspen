// Untrusted project files: no markup injection, no unapproved scripts in previews.
'use strict';

const { test, before, after, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); });
after(async () => { await server.stop(); });
beforeEach(async () => { s = await openStudio(server.url); });
afterEach(async () => { await s.browser.close(); });

// Puts a markup payload in every field of a project, one at a time, and renders
// every panel that can show it. `data-pwn` elements exist only if markup got in.
test('no project field can inject markup into the studio', { timeout: 180000 }, async () => {
  const result = await s.page.evaluate(() => {
    const PAYLOADS = ['"><b data-pwn="1"></b>', '#"><b data-pwn="1"></b>'];
    const params = {
      text_label: { text: 'a', color: '#ffffff', fontFamily: '', fontWeight: 'bold', fontSize: 14, lineHeight: 1.35, letterSpacing: 0, textAlign: 'center', valign: 'middle' },
      path_follower: { pathSpriteId: 'p', speed: 1, autoRotate: true, loopMode: 'loop' },
      substance_mask: { maskType: 'clip', intensity: 100, targetSpriteId: 'p', mode: 'static' },
      photoshop_filter: { blur: 0, brightness: 100, contrast: 100, saturate: 100, grayscale: 0, sepia: 0, hueRotate: 0, invert: 0, opacity: 100, dropShadow: false },
      hyperlink: { url: '#a', target: '_blank', trigger: 'click', anchorId: 'a', customClass: '' },
      follow_target: { targetSpriteId: 'p', smooth: 0.15, stiffness: 0.1, damping: 0.8, speed: 5, trackMode: 'spring' },
      math_calculate: { operation: 'add', inputA: 1, inputB: 2, valA: 1, valB: 2 },
      opacity_fade: { alpha: 1 },
      orbit_spin: { condition: 'key_press', condKey: 'KeyA', conditionMode: 'duration', conditionDuration: 1 },
      motion_wave: { condition: 'timeline_active', condStartFrame: 0, condEndFrame: 10 },
      pulse_scale: { condition: 'on_signal', condSignal: 'go' }
    };
    const base = {
      name: 'sweep', width: 800, height: 600, backgroundColor: '#111111', foregroundColor: '#222222', totalFrames: 100, fps: 30,
      views: { mobile: { width: 390, height: 700 } },
      layers: [{
        id: 'l', name: 'L', opacity: 1, blendMode: 'source-over', zIndex: 0, modules: [],
        sprites: [{
          id: 's', name: 'S', type: 'rect', x: 400, y: 300, width: 100, height: 80, rotation: 0, scaleX: 1, scaleY: 1,
          opacity: 1, fill: '#333333', stroke: '#444444', strokeWidth: 1, cornerRadius: 2, fontSize: 16, fontFamily: 'Arial',
          fontWeight: 'bold', textAlign: 'center', linkGroup: 'g', brushSize: 4, textColor: '#555555', lineHeight: 1.2,
          gradient: { angle: 0, stops: [{ offset: 0, color: '#000000' }, { offset: 1, color: '#ffffff' }] },
          keyframes: { x: [{ frame: 0, value: 400 }] },
          responsive: { mobile: { x: 100, y: 100, width: 50, height: 40, fontSize: 10, rotation: 0 } },
          modules: Object.entries(params).map(([type, p], i) => ({ id: 'm' + i, type, name: type, enabled: true, params: p }))
        }, { id: 'p', name: 'P', type: 'path', pathPoints: [{ x: 0, y: 0 }, { x: 10, y: 10 }] }]
      }]
    };
    const paths = [];
    (function walk(v, at) {
      if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], at.concat(k));
      else paths.push(at);
    })(base, []);

    const hits = new Set();
    const app = jspenApp;
    const check = label => {
      const found = document.querySelectorAll('[data-pwn]');
      if (found.length) { hits.add(label); found.forEach(e => e.remove()); }
    };
    const attempt = fn => { try { fn(); } catch (e) { /* malformed values may be rejected */ } };

    let cases = 0;
    for (const payload of PAYLOADS) {
      for (const path of paths) {
        for (const variant of ['solid', 'linear-gradient', 'empty']) {
          if (variant === 'linear-gradient' && !path.includes('gradient')) continue;
          if (variant === 'empty' && path.includes('sprites')) continue;
          const d = JSON.parse(JSON.stringify(base));
          let o = d;
          for (const k of path.slice(0, -1)) o = o[k];
          o[path[path.length - 1]] = payload;
          if (variant === 'linear-gradient') d.layers[0].sprites[0].fillType = variant;
          if (variant === 'empty') d.layers[0].sprites = [];
          const label = path.join('.');
          cases++;
          attempt(() => app.loadProjectFromJSON(d));
          check(label);
          const layer = app.doc.layers[0], sp = layer && layer.sprites[0];
          const show = (spriteId, moduleId) => attempt(() => {
            app.doc.selectedSpriteId = spriteId; app.doc.selectedModuleId = moduleId;
            app.inspector.render();
            check(label);
          });
          show(null, null);
          if (sp) {
            show(sp.id, null);
            // Only the module holding the payload needs its detail panel.
            const i = path.indexOf('modules');
            if (i >= 0 && sp.modules[path[i + 1]]) {
              show(sp.id, sp.modules[path[i + 1]].id);
              attempt(() => { app.nodeEditor.syncFromDoc(); app.nodeEditor.render(); });
              check(label);
            }
          }
          if (path.includes('views') || path.includes('responsive')) {
            attempt(() => { app.doc.switchView('mobile'); app.refreshUI(); });
            check(label);
            show(null, null);
          }
          if (path.includes('keyframes')) {
            attempt(() => { app.doc.setFrame(5); app.refreshUI(); });
            check(label);
          }
        }
      }
    }
    return { cases, hits: [...hits] };
  });
  assert.ok(result.cases > 200);
  assert.deepEqual(result.hits, []);
});

test('markup in a file never runs event handlers', async () => {
  await s.page.evaluate(() => {
    const el = document.createElement('div');
    // Backstop for a missed escape: the page policy blocks inline handlers.
    el.innerHTML = '<img src=x onerror="window.__handler=1">';
    document.body.appendChild(el);
  });
  await s.page.waitForTimeout(500);
  assert.equal(await s.page.evaluate(() => window.__handler), undefined);
});

test('numeric and string fields of a file are coerced when loading', async () => {
  const r = await s.page.evaluate(() => {
    jspenApp.loadProjectFromJSON({ width: '<b>', height: '700', layers: [{ opacity: '0.5', sprites: [
      { id: 's', x: '12', y: {}, rotation: '<i>', fill: 123, fontWeight: 700,
        keyframes: { x: [{ frame: '3', value: '9' }], modules: [{ frame: 0, value: [] }] } }] }] });
    const d = jspenApp.doc, l = d.layers[0], sp = l.sprites[0];
    return { w: typeof d.width, h: d.height, opacity: l.opacity, x: sp.x, y: sp.y, rotation: sp.rotation, fill: sp.fill, weight: sp.fontWeight, kf: sp.keyframes };
  });
  assert.deepEqual(r, { w: 'number', h: 700, opacity: 0.5, x: 12, y: 300, rotation: 0, fill: '123', weight: '700', kf: { x: [{ frame: 3, value: 9 }] } });
});

// The script reports through the popup's DOM and tries to reach the studio.
const CODE = 'document.documentElement.dataset.ran = "1";' +
  'if (window.opener) window.opener.document.documentElement.dataset.reached = "1";';

function scriptProject(smuggled) {
  const script = { id: 'x', type: 'custom_script', name: 'S', enabled: true, params: { code: CODE, runOn: 'start' } };
  const spin = { id: 'r', type: 'orbit_spin', name: 'R', enabled: true, params: {} };
  const sprite = { id: 's', name: 'S', type: 'rect', x: 100, y: 100, width: 50, height: 50, modules: smuggled ? [spin] : [spin, script] };
  if (smuggled) sprite.keyframes = { modules: [{ frame: 0, value: [script] }] };
  return { name: 'scripts', width: 400, height: 300, layers: [{ name: 'L', sprites: [sprite] }] };
}

async function openPreview(kind, answer, project = scriptProject(false)) {
  const { page, context } = s;
  await page.evaluate(d => { jspenApp.loadProjectFromJSON(d); }, project);
  const asks = await page.evaluate(() => jspenApp.untrustedScripts().length > 0);
  const popup = context.waitForEvent('page', { timeout: 8000 });
  popup.catch(() => {}); // reported by the await below
  if (kind === 'canvas') {
    await page.evaluate(() => jspenApp.exportModal.show());
    await page.click('#btnRun');
  } else {
    await page.evaluate(() => { void jspenApp.openWebPreviewWindow(); });
  }
  if (asks && answer) {
    await page.click(answer === 'allow' ? '#btnStudioModalOk' : '#btnStudioModalCancel', { timeout: 4000 });
  }
  const p = await popup;
  await p.waitForLoadState();
  await p.waitForTimeout(700);
  return {
    asked: asks,
    opener: await p.evaluate(() => !!window.opener),
    ran: await p.evaluate(() => document.documentElement.dataset.ran === '1'),
    reached: await page.evaluate(() => document.documentElement.dataset.reached === '1')
  };
}

for (const kind of ['canvas', 'web']) {
  test(`${kind} preview: a refused script does not run and has no opener`, async () => {
    assert.deepEqual(await openPreview(kind, 'deny'), { asked: true, opener: false, ran: false, reached: false });
  });

  test(`${kind} preview: an allowed script runs but cannot reach the studio`, async () => {
    assert.deepEqual(await openPreview(kind, 'allow'), { asked: true, opener: false, ran: true, reached: false });
  });

  test(`${kind} preview: a script smuggled in through keyframes does not run`, async () => {
    const r = await openPreview(kind, null, scriptProject(true));
    assert.equal(r.ran, false);
    assert.equal(r.reached, false);
  });
}

test('a click counts where it was pressed, even if the pointer left before the next frame', async () => {
  const r = await s.page.evaluate(() => {
    const run = (module, extra = {}) => {
      jspenApp.loadProjectFromJSON({ width: 800, height: 600, layers: [{ name: 'L', sprites: [Object.assign(
        { id: 's', name: 'S', type: 'rect', x: 400, y: 300, width: 100, height: 80,
          modules: module ? [Object.assign({ id: 'm', name: 'M', enabled: true }, module)] : [] }, extra)] }] });
      const e = jspenApp.moduleEngine, seen = [];
      const emit = e.bus.emitSignal;
      e.bus.emitSignal = function (name) { seen.push(name); return emit.apply(this, arguments); };
      e.start();
      const step = (at, down, clicked, press) => e.update(0.016, at, at, down, clicked, press);
      const out = { x: 20, y: 20 }, on = { x: 400, y: 300 };
      return { e, seen, step, out, on, sp: jspenApp.doc.findSpriteById('s'),
        done() { e.bus.emitSignal = emit; e.stop(); } };
    };
    const results = {};
    const cases = {
      on_click: [{ type: 'orbit_spin', params: { condition: 'on_click' } }, {}, c => !!c.sp.runtime._cond?.m?.active],
      click_gesture: [{ type: 'click_gesture', params: { gestureType: 'click', signalName: 'hit' } }, {}, c => c.seen.length > 0],
      toggle_switch: [{ type: 'toggle_switch', params: {} }, {}, c => c.sp.runtime.toggleState !== undefined],
      counter: [{ type: 'counter_accumulator', params: {} }, {}, c => c.sp.runtime._lastCountTime !== undefined],
      screen_trigger: [null, { type: 'screen_trigger', triggerEvent: 'click', triggerAction: 'emit_signal', signalName: 'hit' }, c => c.seen.includes('hit')]
    };
    for (const [name, [module, extra, fired]] of Object.entries(cases)) {
      for (const inside of [true, false]) {
        const c = run(module, extra);
        c.step(c.out, false, false, null);
        // inside: pressed on the sprite, already outside. Otherwise the reverse.
        if (inside) c.step(c.out, true, true, c.on); else c.step(c.on, true, true, c.out);
        results[`${name}:${inside ? 'pressed on it' : 'pressed elsewhere'}`] = !!fired(c);
        c.done();
      }
    }
    return results;
  });
  for (const [name, fired] of Object.entries(r)) assert.equal(fired, name.endsWith('pressed on it'), name);
});
