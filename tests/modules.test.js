// Module engine unit tests: every module in MODULE_REGISTRY, driven
// deterministically (fixed dt, scripted pointer) inside the studio page.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => { await s.browser.close(); await server.stop(); });

// Runs a scenario in the page. `spec.sprites` = [{name, ...sprite, mods: [[type, params]]}],
// `spec.frames` = [{ n, mouse: [x,y], down, click, wheel }]; returns runtime/signal snapshots.
const RUN = (spec) => {
  const Engine = jspenApp.moduleEngine.constructor;
  const doc = new DocumentModel();
  doc.loadFromData({ name: 't', width: 800, height: spec.height || 600, viewportHeight: 600, layers: [{ name: 'L', sprites: spec.sprites.map(o => {
    const sp = Object.assign({ type: 'rect', width: 40, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1 }, o);
    sp.modules = (o.mods || []).map(([type, params], i) => ({ id: o.name + '_m' + i, type, name: type, enabled: true,
      params: Object.assign(JSON.parse(JSON.stringify(MODULE_REGISTRY[type].defaultParams || {})), params || {}) }));
    delete sp.mods;
    return sp;
  }) }] }, false);
  doc.viewportHeight = spec.viewportHeight || 600;
  const eng = new Engine(doc);
  const signals = [];
  const emit = eng.bus.emitSignal;
  eng.bus.emitSignal = (n, src, pl) => { signals.push([n, +eng.bus.time.toFixed(2)]); emit(n, src, pl); };
  const played = [];
  Engine.playSynth = (sound) => played.push(sound);
  if (spec.audioLevel !== undefined) Engine.audioLevel = () => spec.audioLevel;
  Engine.requestMicrophone = () => {};
  const navs = [];
  eng.onNavigateAnchor = (sp, opts) => navs.push({ to: sp.name, smooth: !!(opts && opts.smooth), t: +eng.bus.time.toFixed(2) });
  eng.start();
  let mouse = { x: -1000, y: -1000 }, down = false, press = null;
  const dt = 1 / 60;
  const snaps = [];
  for (const f of spec.frames) {
    if (f.mouse) mouse = { x: f.mouse[0], y: f.mouse[1] };
    if (f.down !== undefined) down = f.down;
    if (f.click) press = { ...mouse };
    if (f.scrollY !== undefined) eng.bus.scroll.scrollY = f.scrollY;
    for (let i = 0; i < (f.n || 1); i++) {
      if (f.wheel && i === 0) eng.addWheel(f.wheel);
      eng.update(dt, mouse, mouse, down, !!f.click && i === 0, press);
    }
    if (f.snap) {
      const o = {};
      for (const sp of doc.layers[0].sprites) {
        const r = sp.runtime;
        o[sp.name] = { x: +r.x.toFixed(1), y: +r.y.toFixed(1), rot: +r.rotation.toFixed(1), sx: +r.scaleX.toFixed(3), op: +r.opacity.toFixed(3),
          blur: sp.filters && sp.filters.blur !== undefined ? +(+sp.filters.blur).toFixed(1) : undefined,
          trig: !!r.isTriggered, step: r.step, mx: r.mouseX !== undefined ? +r.mouseX.toFixed(1) : undefined,
          out: sp.modules.map(m => m.params.outputResult !== undefined ? +(+m.params.outputResult).toFixed(2) : (m.params.outputValue !== undefined ? +(+m.params.outputValue).toFixed(2) : null)),
          text: Engine.getText(sp), fill: sp.fill };
      }
      snaps.push({ label: f.snap, t: +eng.bus.time.toFixed(2), sprites: o, vars: Object.fromEntries(eng.bus.vars),
        fade: !!eng.bus.fade, hideCursor: eng.bus.hideCursor, particles: eng.bus.particles.length,
        pick: f.pick ? (eng.pickSprite(f.pick[0], f.pick[1]) || {}).name || null : undefined });
    }
  }
  return { snaps, signals, played, navs };
};
const run = spec => s.page.evaluate(RUN, spec);
const snap = (r, label) => r.snaps.find(x => x.label === label).sprites;
const frame = (r, label) => r.snaps.find(x => x.label === label);
const sigCount = (r, name) => r.signals.filter(x => x[0] === name).length;

test('every registry module has an engine implementation or renderer support', async () => {
  const missing = await s.page.evaluate(() => {
    const src = jspenApp.moduleEngine.constructor.toString();
    const renderOnly = ['text_label', 'substance_mask'];
    return Object.keys(MODULE_REGISTRY).filter(k => !renderOnly.includes(k) && !src.includes(`case '${k}'`));
  });
  assert.deepEqual(missing, []);
});

test('mouse_position smooths the pointer and passes its speed down the stack', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 100, y: 100, mods: [['mouse_position', { smoothFactor: 1 }], ['value_remapper', { inputSource: 'stack', inMin: 0, inMax: 1000, outMin: 0, outMax: 90, outputProperty: 'rotation' }]] }],
    frames: [{ mouse: [100, 100], n: 2 }, { mouse: [110, 100], snap: 'moved' }, { n: 30, snap: 'still' }] });
  assert.equal(snap(r, 'moved').a.mx, 10, 'relative x');
  assert.ok(snap(r, 'moved').a.rot > 0, 'speed drives rotation');
  assert.equal(snap(r, 'still').a.rot, 0, 'no speed when still');
  assert.ok(sigCount(r, 'mouse_move') >= 1);
});

test('scroll_wheel changes its value only while hovered, clamped to range', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 100, y: 100, mods: [['scroll_wheel', { minVal: 0, maxVal: 10, startVal: 5 }]] }],
    frames: [{ mouse: [500, 500], wheel: -100, n: 2, snap: 'away' }, { mouse: [100, 100], wheel: -40, n: 2, snap: 'up' }, { wheel: 1000, n: 2, snap: 'down' }] });
  assert.deepEqual([snap(r, 'away').a.out[0], snap(r, 'up').a.out[0], snap(r, 'down').a.out[0]], [5, 7, 0]);
  assert.ok(sigCount(r, 'wheel_up') === 1 && sigCount(r, 'wheel_down') === 1);
});

test('collision_detector signals once on contact and bounces back', async () => {
  const r = await run({ sprites: [
    { name: 'mover', x: 100, y: 100, mods: [['wall_bounce', { speedX: 300, speedY: 0.001 }], ['collision_detector', {}]] },
    { name: 'wall', x: 200, y: 100, width: 20, height: 200 }],
    frames: [{ n: 30, snap: 'after' }] });
  const m = snap(r, 'after').mover;
  assert.ok(m.x < 170, `stays left of the wall (x=${m.x})`);
  assert.equal(sigCount(r, 'collision'), 1);
});

test('viewport_visibility triggers when scrolled into view (and can latch)', async () => {
  const r = await run({ viewportHeight: 300, sprites: [
    { name: 'a', x: 100, y: 500, mods: [['viewport_visibility', {}]] },
    { name: 'b', x: 200, y: 500, mods: [['viewport_visibility', { triggerOnce: true, signalName: 'b_seen' }]] }],
    frames: [{ scrollY: 0, n: 2, snap: 'top' }, { scrollY: 400, n: 2, snap: 'in' }, { scrollY: 0, n: 2, snap: 'back' }] });
  assert.deepEqual([snap(r, 'top').a.trig, snap(r, 'in').a.trig, snap(r, 'back').a.trig], [false, true, false]);
  assert.equal(snap(r, 'back').b.trig, true, 'triggerOnce latches');
  assert.equal(sigCount(r, 'visible'), 1);
  assert.equal(sigCount(r, 'b_seen'), 1);
});

test('timer_interval emits a signal every interval', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 100, y: 100, mods: [['timer_interval', { intervalSec: 0.5 }]] }], frames: [{ n: 125 }] });
  assert.equal(sigCount(r, 'timer_tick'), 4);
});

test('distance_rope keeps the sprite within maxDistance of the pointer', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 100, y: 100, mods: [['distance_rope', { maxDistance: 50 }]] }],
    frames: [{ mouse: [400, 100], n: 2, snap: 'pulled' }, { mouse: [380, 100], n: 2, snap: 'slack' }] });
  assert.equal(snap(r, 'pulled').a.x, 350);
  assert.equal(snap(r, 'slack').a.x, 350, 'inside the rope length it stays put');
});

test('value_remapper maps mouse X to rotation (absolute) and to an x offset', async () => {
  const r = await run({ sprites: [
    { name: 'a', x: 100, y: 100, mods: [['value_remapper', { inputSource: 'mouse_x', inMin: 0, inMax: 800, outMin: 0, outMax: 360, outputProperty: 'rotation' }]] },
    { name: 'b', x: 300, y: 100, mods: [['value_remapper', { inputSource: 'mouse_x', inMin: 0, inMax: 800, outMin: 0, outMax: 100, outputProperty: 'x', outputMode: 'offset' }]] }],
    frames: [{ mouse: [400, 0], snap: 'mid' }, { mouse: [5000, 0], snap: 'clamped' }] });
  assert.equal(snap(r, 'mid').a.rot, 180);
  assert.equal(snap(r, 'mid').b.x, 350);
  assert.equal(snap(r, 'clamped').a.rot, 360);
});

test('node_math and node_merge transform the stack value / transform', async () => {
  const r = await run({ sprites: [
    { name: 'a', x: 100, y: 100, mods: [['step_sequencer', { stepCount: 10, stepInterval: 100 }], ['node_math', { op: 'add', factor: 3, offset: 1 }], ['value_remapper', { inputSource: 'stack', inMin: 0, inMax: 10, outMin: 0, outMax: 10, outputProperty: 'none' }]] },
    { name: 'b', x: 100, y: 100, mods: [['tween_interpolator', { property: 'x', toValue: 300, duration: 0.0001 }], ['node_merge', { blendMode: 'mix', weight: 0.5 }]] }],
    frames: [{ n: 2, snap: 's' }] });
  assert.equal(snap(r, 's').a.out[2], 4, 'step 0 -> 0+3 -> +1 = 4');
  assert.equal(snap(r, 's').b.x, 200, 'half of the tween offset');
});

test('tween_interpolator eases to the target; loop_mode and easing_presets apply', async () => {
  const r = await run({ sprites: [
    { name: 'once', x: 0, y: 0, mods: [['tween_interpolator', { property: 'x', toValue: 100, duration: 1, easing: 'linear' }]] },
    { name: 'pp', x: 0, y: 0, mods: [['loop_mode', { mode: 'pingpong' }], ['easing_presets', { curve: 'linear' }], ['tween_interpolator', { property: 'x', toValue: 100, duration: 1, easing: 'bounceOut' }]] },
    { name: 'op', x: 0, y: 0, opacity: 1, mods: [['tween_interpolator', { property: 'opacity', toValue: 0, duration: 1, easing: 'linear' }]] }],
    frames: [{ n: 30, snap: 'half' }, { n: 60, snap: 'later' }] });
  assert.ok(Math.abs(snap(r, 'half').once.x - 50) < 3);
  assert.equal(snap(r, 'later').once.x, 100, 'once holds the end value');
  assert.ok(Math.abs(snap(r, 'later').pp.x - 50) < 3, 'pingpong comes back (linear from easing preset)');
  assert.ok(Math.abs(snap(r, 'half').op.op - 0.5) < 0.05);
});

test('duration_delay gates the modules below it', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 0, y: 0, mods: [['duration_delay', { delay: 0.5, duration: 0.5 }], ['orbit_spin', { speedDegPerSec: 60 }]] }],
    frames: [{ n: 24, snap: 'before' }, { n: 30, snap: 'during' }, { n: 60, snap: 'after' }] });
  assert.equal(snap(r, 'before').a.rot, 0);
  assert.ok(snap(r, 'during').a.rot > 0);
  assert.ok(snap(r, 'after').a.rot <= 31, `stops after the window (${snap(r, 'after').a.rot})`);
});

test('stagger_domino starts each sprite later by its index', async () => {
  const mods = [['stagger_domino', { staggerDelay: 0.5 }], ['orbit_spin', { speedDegPerSec: 60 }]];
  const r = await run({ sprites: [{ name: 'a', x: 0, y: 0, mods }, { name: 'b', x: 0, y: 0, mods }, { name: 'c', x: 0, y: 0, mods }],
    frames: [{ n: 45, snap: 's' }] });
  const v = snap(r, 's');
  assert.ok(v.a.rot > 0 && v.b.rot > 0 && v.c.rot === 0, JSON.stringify([v.a.rot, v.b.rot, v.c.rot]));
  assert.ok(v.a.rot > v.b.rot);
});

test('step_sequencer advances and signals each step', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 0, y: 0, mods: [['step_sequencer', { stepCount: 3, stepInterval: 0.25 }]] }],
    frames: [{ n: 20, snap: 's1' }, { n: 40, snap: 's2' }] });
  assert.equal(snap(r, 's1').a.step, 1);
  assert.equal(snap(r, 's2').a.step, 0, 'wraps around (infinite by default)');
  assert.ok(sigCount(r, 'step_2') === 1);
});

test('mouse_tilt_3d tilts toward the pointer and settles back', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 100, y: 100, width: 100, height: 100, mods: [['mouse_tilt_3d', { maxTilt: 30 }]] }],
    frames: [{ mouse: [140, 140], n: 60, snap: 'tilted' }, { mouse: [600, 600], n: 90, snap: 'rest' }] });
  assert.ok(snap(r, 'tilted').a.sx < 0.99, 'foreshortened');
  assert.ok(snap(r, 'rest').a.sx > 0.999, 'back to rest');
});

test('hover_proximity / click_gesture / keyboard-free interactions still work', async () => {
  const r = await run({ sprites: [
    { name: 'h', x: 100, y: 100, mods: [['hover_proximity', { detectionRadius: 0, scaleOnHover: 2 }]] },
    { name: 'c', x: 300, y: 100, mods: [['click_gesture', { gestureType: 'click' }]] }],
    frames: [{ mouse: [100, 100], n: 60, snap: 'hover' }, { mouse: [300, 100], click: true, down: true, snap: 'click' }, { down: false, n: 2 }] });
  assert.ok(snap(r, 'hover').h.sx > 1.9);
  assert.equal(snap(r, 'click').c.trig, true);
  assert.equal(sigCount(r, 'gesture_click'), 1);
});

test('synth_sfx plays on click, hover enter and signal; trigger flags do not latch', async () => {
  const r = await run({ sprites: [
    { name: 'btn', x: 100, y: 100, mods: [['synth_sfx', { sound: 'ding', trigger: 'click' }]] },
    { name: 'hov', x: 300, y: 100, mods: [['synth_sfx', { sound: 'pop', trigger: 'hover' }]] },
    { name: 'sig', x: 500, y: 500, mods: [['timer_interval', { intervalSec: 0.5 }], ['synth_sfx', { sound: 'boop', trigger: 'signal', listenSignal: 'timer_tick' }]] }],
    frames: [{ mouse: [100, 100], click: true, down: true }, { down: false, n: 5 }, { mouse: [300, 100], n: 30 }, { mouse: [600, 100], n: 30 }] });
  assert.equal(r.played.filter(x => x === 'ding').length, 1);
  assert.equal(r.played.filter(x => x === 'pop').length, 1, 'once per hover enter');
  assert.equal(r.played.filter(x => x === 'boop').length, 2, 'once per tick');
});

test('on_trigger modules stop when the trigger ends', async () => {
  const r = await run({ sprites: [{ name: 'a', x: 100, y: 100, mods: [['click_gesture', { activeDuration: 0.1 }], ['orbit_spin', { condition: 'on_trigger', speedDegPerSec: 60 }]] }],
    frames: [{ mouse: [100, 100], click: true, down: true }, { down: false, n: 20, snap: 'after' }, { n: 60, snap: 'later' }] });
  assert.equal(snap(r, 'after').a.rot, snap(r, 'later').a.rot, 'no more spinning after the trigger window');
});

// ---------------- Web interaction modules ----------------

test('offset outputs do not accumulate over frames (value_remapper offset)', async () => {
  const r = await run({ sprites: [{ name: 'b', x: 300, y: 100, mods: [['value_remapper', { inputSource: 'mouse_x', inMin: 0, inMax: 800, outMin: 0, outMax: 100, outputProperty: 'x', outputMode: 'offset' }]] }],
    frames: [{ mouse: [400, 0], n: 60, snap: 'a' }, { mouse: [0, 0], n: 5, snap: 'b' }] });
  assert.equal(snap(r, 'a').b.x, 350);
  assert.equal(snap(r, 'b').b.x, 300);
});

test('scroll_progress maps page scroll to a parallax offset', async () => {
  const r = await run({ height: 1600, sprites: [{ name: 'a', x: 100, y: 300, mods: [['scroll_progress', { property: 'y', fromValue: 0, toValue: -200 }]] }],
    frames: [{ scrollY: 0, n: 10, snap: 'top' }, { scrollY: 500, n: 30, snap: 'half' }, { scrollY: 1000, n: 3, snap: 'end' }] });
  assert.deepEqual([snap(r, 'top').a.y, snap(r, 'half').a.y, snap(r, 'end').a.y], [300, 200, 100]);
});

test('entrance_animation hides until visible, then animates in once', async () => {
  const r = await run({ height: 1600, sprites: [{ name: 'a', x: 100, y: 1200, mods: [['entrance_animation', { effect: 'fade_up', distance: 40, duration: 0.5 }]] }],
    frames: [{ scrollY: 0, n: 30, snap: 'hidden' }, { scrollY: 900, n: 6, snap: 'mid' }, { n: 60, snap: 'done' }, { scrollY: 0, n: 10 }, { scrollY: 900, n: 2, snap: 'again' }] });
  assert.equal(snap(r, 'hidden').a.op, 0);
  assert.ok(snap(r, 'mid').a.op > 0 && snap(r, 'mid').a.op < 1 && snap(r, 'mid').a.y > 1200);
  assert.deepEqual([snap(r, 'done').a.op, snap(r, 'done').a.y], [1, 1200]);
  assert.equal(snap(r, 'again').a.op, 1, 'once: does not replay');
});

test('state_style blends hover and press styles', async () => {
  const r = await run({ sprites: [{ name: 'btn', x: 100, y: 100, fill: '#000000', mods: [['state_style', { hoverFill: '#ff0000', pressFill: '#0000ff', hoverScale: 1.1, pressScale: 0.9, transition: 0.1 }]] }],
    frames: [{ mouse: [400, 400], n: 5, snap: 'rest' }, { mouse: [100, 100], n: 40, snap: 'hover' }, { click: true, down: true, n: 40, snap: 'press' }, { down: false, mouse: [400, 400], n: 60, snap: 'back' }] });
  assert.equal(snap(r, 'rest').btn.fill, '#000000');
  assert.equal(snap(r, 'hover').btn.fill, 'rgba(255,0,0,1)');
  assert.equal(snap(r, 'hover').btn.sx, 1.1);
  assert.equal(snap(r, 'press').btn.fill, 'rgba(0,0,255,1)');
  assert.equal(snap(r, 'press').btn.sx, 0.9);
  assert.equal(snap(r, 'back').btn.fill, 'rgba(0,0,0,1)');
});

test('count_up counts to the target with separators once visible', async () => {
  const r = await run({ sprites: [{ name: 'n', type: 'text', text: '?', x: 100, y: 100, mods: [['count_up', { from: 0, to: 1200, duration: 1, suffix: '+' }]] }],
    frames: [{ n: 1, snap: 'start' }, { n: 20, snap: 'mid' }, { n: 60, snap: 'end' }] });
  assert.equal(snap(r, 'start').n.text, '0+');
  const mid = parseInt(snap(r, 'mid').n.text.replace(/[^0-9]/g, ''), 10);
  assert.ok(mid > 0 && mid < 1200);
  assert.equal(snap(r, 'end').n.text, '1,200+');
});

test('typewriter reveals text character by character (and loops)', async () => {
  const r = await run({ sprites: [
    { name: 't', type: 'text', text: 'Hello', x: 100, y: 100, mods: [['typewriter', { charsPerSec: 10, startDelay: 0, cursor: '' }]] },
    { name: 'lp', type: 'text', text: 'Hi', x: 300, y: 100, mods: [['typewriter', { charsPerSec: 10, startDelay: 0, cursor: '', loop: true, holdSec: 0.2 }]] }],
    frames: [{ n: 15, snap: 'early' }, { n: 45, snap: 'done' }] });
  assert.equal(snap(r, 'early').t.text, 'He');
  assert.equal(snap(r, 'done').t.text, 'Hello');
  assert.equal(snap(r, 'done').lp.text, '', 'looped: erased again');
});

test('magnetic pulls toward the cursor without drifting and springs back', async () => {
  const r = await run({ sprites: [{ name: 'm', x: 200, y: 200, mods: [['magnetic', { radius: 120, strength: 0.5, smoothing: 0.5 }]] }],
    frames: [{ mouse: [250, 200], n: 120, snap: 'pulled' }, { mouse: [700, 500], n: 60, snap: 'back' }] });
  assert.ok(Math.abs(snap(r, 'pulled').m.x - 225) < 1, String(snap(r, 'pulled').m.x));
  assert.equal(snap(r, 'back').m.x, 200);
});

test('cursor_fx: custom cursor follows the pointer and is not hit-tested; trail emits particles', async () => {
  const r = await run({ sprites: [
    { name: 'under', x: 300, y: 300, width: 100, height: 100 },
    { name: 'cur', x: 0, y: 0, width: 20, height: 20, mods: [['cursor_fx', { mode: 'cursor' }]] },
    { name: 'trail', x: 700, y: 50, mods: [['cursor_fx', { mode: 'trail' }]] }],
    frames: [{ n: 3 }, { mouse: [100, 100], n: 2 }, { mouse: [300, 300], n: 1, snap: 'at', pick: [300, 300] }] });
  assert.deepEqual([snap(r, 'at').cur.x, snap(r, 'at').cur.y], [300, 300]);
  assert.equal(snap(r, 'at').cur.op, 1, 'visible again once the pointer is inside');
  assert.equal(frame(r, 'at').hideCursor, true);
  assert.equal(frame(r, 'at').pick, 'under');
  assert.ok(frame(r, 'at').particles > 0);
});

test('property_binding follows another sprite', async () => {
  const r = await run({ sprites: [
    { name: 'a', x: 100, y: 100, mods: [['motion_wave', { axis: 'x', amplitude: 50, frequency: 1 }]] },
    { name: 'b', x: 0, y: 300, mods: [['property_binding', { targetSpriteId: 'a_id', sourceProperty: 'x', targetProperty: 'x', factor: 2, offset: 10 }]] }].map((o, i) => Object.assign(o, { id: i ? 'b_id' : 'a_id' })),
    frames: [{ n: 13, snap: 's' }] });
  assert.ok(Math.abs(snap(r, 's').b.x - (snap(r, 's').a.x * 2 + 10)) < 0.01);
});

test('global_variable + condition_branch: clicks add to a shared score that unlocks a branch', async () => {
  const r = await run({ sprites: [
    { name: 'btn', x: 100, y: 100, mods: [['global_variable', { varName: 'score', action: 'add', value: 1, fireOn: 'click' }]] },
    { name: 'label', type: 'text', text: '', x: 300, y: 100, mods: [['global_variable', { varName: 'score', action: 'read', displayTemplate: '점수: {value}' }]] },
    { name: 'gate', x: 500, y: 100, mods: [['condition_branch', { inputSource: 'variable', varName: 'score', compare: '>=', threshold: 3, signalTrue: 'unlocked' }], ['orbit_spin', { speedDegPerSec: 60 }]] }],
    frames: [{ mouse: [100, 100], click: true, down: true }, { down: false, n: 3 }, { click: true, down: true }, { down: false, n: 30, snap: 'two' },
      { click: true, down: true }, { down: false, n: 30, snap: 'three' }] });
  assert.equal(frame(r, 'two').vars.score, 2);
  assert.equal(snap(r, 'two').label.text, '점수: 2');
  assert.equal(snap(r, 'two').gate.rot, 0, 'gate closed below threshold');
  assert.equal(frame(r, 'three').vars.score, 3);
  assert.ok(snap(r, 'three').gate.rot > 0, 'gate open');
  assert.equal(sigCount(r, 'unlocked'), 1);
});

test('physics_body falls, bounces and comes to rest on the floor', async () => {
  const r = await run({ sprites: [{ name: 'ball', x: 400, y: 100, width: 40, height: 40, mods: [['physics_body', { gravity: 1000, bounce: 0.5 }]] }],
    frames: [{ n: 20, snap: 'falling' }, { n: 300, snap: 'rest' }] });
  assert.ok(snap(r, 'falling').ball.y > 100);
  assert.equal(snap(r, 'rest').ball.y, 580);
});

test('audio_reactive maps the sound level to a property', async () => {
  const r = await run({ audioLevel: 0.5, sprites: [{ name: 'a', x: 100, y: 100, mods: [['audio_reactive', { source: 'document', sensitivity: 1, smoothing: 0.5, property: 'scale', minValue: 1, maxValue: 1.4 }]] }],
    frames: [{ n: 60, snap: 's' }] });
  assert.ok(Math.abs(snap(r, 's').a.sx - 1.2) < 0.01, String(snap(r, 's').a.sx));
});

test('scene_transition moves to a section smoothly, or with a fade', async () => {
  const r = await run({ height: 2000, sprites: [
    { id: 'sec2', name: 'section2', x: 400, y: 1500, width: 800, height: 400 },
    { name: 'go', x: 100, y: 100, mods: [['scene_transition', { fireOn: 'click', targetSpriteId: 'sec2', transition: 'smooth' }]] },
    { name: 'fade', x: 300, y: 100, mods: [['scene_transition', { fireOn: 'click', targetSpriteId: 'sec2', transition: 'fade', duration: 0.6 }]] }],
    frames: [{ mouse: [100, 100], click: true, down: true }, { down: false, n: 2 },
      { mouse: [300, 100], click: true, down: true, snap: 'fading' }, { down: false, n: 40, snap: 'after' }] });
  assert.deepEqual(r.navs[0], { to: 'section2', smooth: true, t: r.navs[0].t });
  assert.equal(frame(r, 'fading').fade, true);
  assert.equal(r.navs.length, 2);
  assert.equal(r.navs[1].smooth, false);
  assert.ok(r.navs[1].t >= 0.3, 'switches in the middle of the fade');
  assert.equal(frame(r, 'after').fade, false);
});
