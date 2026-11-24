// Making things happen without code: action blocks ("언제 → 무엇을"), signals
// and variables picked from lists, and number controls (units, sliders, dials).
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => {
  if (s) await s.browser.close();
  if (server) await server.stop();
});

// Runs the engine with a fixed frame time; `frames` = [{ n, click: [x, y], snap }].
const RUN = (spec) => {
  const Engine = jspenApp.moduleEngine.constructor;
  const doc = new DocumentModel();
  doc.loadFromData({ name: 't', width: 800, height: 600, layers: [{ name: 'L', sprites: spec.sprites.map(o => Object.assign(
    { type: 'rect', width: 40, height: 40, rotation: 0, scaleX: 1, scaleY: 1, opacity: 1, fill: '#ffffff' }, o)) }] }, false);
  const eng = new Engine(doc);
  const signals = [];
  const emit = eng.bus.emitSignal;
  eng.bus.emitSignal = (n, src, pl) => { signals.push([n, +eng.bus.time.toFixed(3)]); emit(n, src, pl); };
  const played = [];
  Engine.playSynth = (sound) => played.push(sound);
  const opened = [];
  eng.navigateHyperlink = (url, target) => opened.push([url, target]);
  const navs = [];
  eng.onNavigateAnchor = (sp) => navs.push(sp.name);
  eng.start();
  const snaps = {};
  const away = { x: -1000, y: -1000 };
  for (const f of spec.frames) {
    for (let i = 0; i < (f.n || 1); i++) {
      const click = f.click && i === 0;
      const m = f.click ? { x: f.click[0], y: f.click[1] } : away;
      eng.update(0.1, m, m, false, click, click ? m : null);
    }
    if (f.snap) {
      const o = {};
      for (const sp of doc.layers[0].sprites) {
        const r = sp.runtime;
        o[sp.name] = { x: +r.x.toFixed(1), y: +r.y.toFixed(1), rot: +r.rotation.toFixed(1), sx: +r.scaleX.toFixed(3), op: +r.opacity.toFixed(3),
          shown: sp.visible !== false && r.visible !== false, fill: sp.fill, text: Engine.getText(sp) };
      }
      snaps[f.snap] = { sprites: o, vars: Object.fromEntries(eng.bus.vars), t: +eng.bus.time.toFixed(2) };
    }
  }
  return { snaps, signals, played, opened, navs };
};
const run = spec => s.page.evaluate(RUN, spec);
const rules = (params, id = 'r') => ({ id, type: 'action_rules', name: '동작', enabled: true,
  params: Object.assign({ condition: 'on_click', repeat: 'once', retrigger: 'restart' }, params) });

test('action blocks: on click the steps run in order, each over its own time', async () => {
  const r = await run({
    sprites: [{ id: 'b', name: 'btn', x: 100, y: 100, modules: [rules({ steps: [
      { type: 'move_by', dx: 100, dy: 0, duration: 0.5, ease: 'linear' },
      { type: 'emit', signal: 'arrived' },
      { type: 'color_to', color: '#ff0000', duration: 0 },
      { type: 'wait', seconds: 0.3 },
      { type: 'hide' }] })] }],
    frames: [{ n: 2, snap: 'before' }, { click: [100, 100], n: 3, snap: 'mid' }, { n: 3, snap: 'moved' }, { n: 5, snap: 'end' }]
  });
  assert.equal(r.snaps.before.sprites.btn.x, 100, 'nothing happens before the click');
  assert.equal(r.snaps.mid.sprites.btn.x, 160, 'halfway after 0.3 s of 0.5 s (linear)');
  assert.equal(r.snaps.moved.sprites.btn.x, 200);
  assert.equal(r.snaps.moved.sprites.btn.fill, '#ff0000', 'instant steps follow at once');
  assert.equal(r.snaps.moved.sprites.btn.shown, true, 'still waiting');
  assert.deepEqual(r.signals.filter(x => x[0] === 'arrived').length, 1);
  assert.equal(r.snaps.end.sprites.btn.shown, false);
});

test('action blocks: a signal starts them; they move another sprite; "always" runs once at the start', async () => {
  const r = await run({
    sprites: [
      { id: 'a', name: 'starter', x: 100, y: 100, modules: [rules({ condition: 'always', steps: [{ type: 'wait', seconds: 0.2 }, { type: 'emit', signal: 'go' }] })] },
      { id: 'b', name: 'listener', x: 300, y: 100, modules: [rules({ condition: 'on_signal', condSignal: 'go', steps: [
        { type: 'move_to', spriteId: 'c', x: 500, y: 400, duration: 0 }, { type: 'rotate_by', deg: 45, duration: 0 }, { type: 'scale_to', spriteId: 'c', scale: 2, duration: 0 },
        { type: 'fade_to', opacity: 0.25, duration: 0 }, { type: 'set_text', spriteId: 'c', text: '<b>도착</b>' }] })] },
      { id: 'c', name: 'target', x: 50, y: 50 }],
    frames: [{ n: 10, snap: 's' }]
  });
  const v = r.snaps.s.sprites;
  assert.equal(r.signals.filter(x => x[0] === 'go').length, 1, '"always" runs once');
  assert.deepEqual([v.target.x, v.target.y, v.target.sx, v.target.text], [500, 400, 2, '<b>도착</b>']);
  assert.deepEqual([v.listener.rot, v.listener.op], [45, 0.25]);
});

test('action blocks: variables, a stop condition, a live value display, sounds and links', async () => {
  const r = await run({
    sprites: [{ id: 'b', name: 'btn', x: 100, y: 100, modules: [rules({ steps: [
      { type: 'add_var', varName: 'score', value: 5 },
      { type: 'show_var', spriteId: 'd', varName: 'score', prefix: '점수 ', suffix: '점' },
      { type: 'if_var', varName: 'score', compare: '>=', value: 10 },
      { type: 'sound', sound: 'ding', volume: 0.5 },
      { type: 'open_link', url: 'https://example.com/', newTab: false },
      { type: 'go_to', spriteId: 'd' }] })] },
    { id: 'd', name: 'display', x: 300, y: 300, text: '' }],
    frames: [{ click: [100, 100], n: 2, snap: 'one' }, { click: [100, 100], n: 2, snap: 'two' }]
  });
  assert.equal(r.snaps.one.vars.score, 5);
  assert.equal(r.snaps.one.sprites.display.text, '점수 5점');
  assert.deepEqual(r.played, ['ding'], 'the steps after a failed check do not run the first time');
  assert.equal(r.snaps.two.vars.score, 10);
  assert.equal(r.snaps.two.sprites.display.text, '점수 10점', 'the display follows the variable');
  assert.deepEqual(r.opened, [['https://example.com/', '_self']]);
  assert.deepEqual(r.navs, ['display']);
});

test('action blocks: repeat, retrigger, toggle visibility and "back to how it was"', async () => {
  const loop = await run({
    sprites: [{ id: 'b', name: 'b', x: 100, y: 100, modules: [rules({ condition: 'always', repeat: 'loop', steps: [{ type: 'move_by', dx: 10, duration: 0.1, ease: 'linear' }] })] }],
    frames: [{ n: 10, snap: 's' }]
  });
  assert.equal(loop.snaps.s.sprites.b.x, 200, 'loops while time passes');
  const once = (retrigger) => run({
    sprites: [{ id: 'b', name: 'b', x: 100, y: 100, modules: [rules({ retrigger, steps: [{ type: 'move_by', dx: 100, duration: 1, ease: 'linear' }] })] }],
    frames: [{ click: [100, 100], n: 5 }, { click: [150, 100], n: 20, snap: 's' }]
  });
  assert.equal((await once('ignore')).snaps.s.sprites.b.x, 200, 'a second click while running is ignored');
  assert.equal((await once('restart')).snaps.s.sprites.b.x, 250, 'restart moves another 100 from where it is');
  const back = await run({
    sprites: [{ id: 'b', name: 'b', x: 100, y: 100, fill: '#00ff00', modules: [rules({ steps: [
      { type: 'move_by', dx: 50, dy: 20, duration: 0 }, { type: 'scale_to', scale: 3, duration: 0 }, { type: 'color_to', color: '#0000ff', duration: 0 },
      { type: 'toggle_visible' }, { type: 'toggle_visible' }, { type: 'reset', duration: 0 }] })] }],
    frames: [{ click: [100, 100], n: 2, snap: 's' }]
  });
  assert.deepEqual(back.snaps.s.sprites.b, { x: 100, y: 100, rot: 0, sx: 1, op: 1, shown: true, fill: '#00ff00', text: '' });
});

test('action blocks: steps are data - unknown steps are skipped and nothing in them runs as code', async () => {
  const r = await s.page.evaluate(() => {
    window.__pwned = 0;
    const doc = new DocumentModel();
    doc.loadFromData({ name: 't', width: 400, height: 300, layers: [{ name: 'L', sprites: [{ id: 'b', name: 'b', type: 'rect', x: 50, y: 50, width: 40, height: 40,
      modules: [{ id: 'r', type: 'action_rules', name: 'x', enabled: true, params: { condition: 'always', steps: [
        { type: 'eval', code: 'window.__pwned = 1' }, { type: 'set_text', text: '${window.__pwned = 2}' }, { type: 'emit', signal: "');window.__pwned=3;('" },
        { type: 'open_link', url: 'javascript:window.__pwned=4' }, { type: 'move_by', dx: 'abc', dy: null, duration: 'x' }] } }] }] }] }, false);
    const eng = new jspenApp.moduleEngine.constructor(doc);
    eng.start();
    for (let i = 0; i < 5; i++) eng.update(0.1, { x: -1e9, y: -1e9 }, { x: 0, y: 0 }, false, false, null);
    const sp = doc.findSpriteById('b');
    return { pwned: window.__pwned, x: sp.runtime.x, y: sp.runtime.y, text: eng.constructor.getText(sp) };
  });
  assert.deepEqual(r, { pwned: 0, x: 50, y: 50, text: '${window.__pwned = 2}' });
});

// ---------------- In the studio ----------------

function load(page, sprites, select) {
  return page.evaluate(([sprites, select]) => {
    document.querySelectorAll('.jspen-tutorial-offer').forEach(e => e.remove());
    jspenApp.loadProjectFromJSON({ name: 'a', width: 800, height: 600, transparentBackground: false, backgroundColor: '#111111', layers: [{ id: 'L', name: 'L', sprites }] });
    jspenApp.doc.selectedSpriteId = select[0];
    jspenApp.doc.selectedModuleId = select[1] || null;
    jspenApp.refreshUI();
    const r = jspenApp.renderer; r.zoom = 1; r.panX = 0; r.panY = 0; jspenApp.renderCanvas();
  }, [sprites, select]);
}
const box = (id, x, y, modules = []) => ({ id, name: id, type: 'rect', x, y, width: 120, height: 60, fill: '#ffffff', modules });
const params = (page, sprite = 'btn', mod = 0) => page.evaluate(([sp, i]) => JSON.parse(JSON.stringify(jspenApp.doc.findSpriteById(sp).modules[i].params)), [sprite, mod]);

test('studio: build an action block with the mouse, then run it in the preview', async () => {
  const { page } = s;
  await load(page, [box('btn', 400, 300), box('other', 150, 120)], ['btn']);
  // the module library lists it; the code module is only under "고급"
  await page.evaluate(() => jspenApp.layersUI.showModuleLibraryModal(jspenApp.doc.findSpriteById('btn')));
  await page.click('.mod-category-tab[data-cat="all"]');
  const all = await page.$$eval('#modalModGrid .ps-module-card', c => c.map(x => x.dataset.key));
  assert.ok(all.includes('action_rules') && !all.includes('custom_script'), all.join());
  await page.click('.mod-category-tab[data-cat="advanced"]');
  assert.deepEqual(await page.$$eval('#modalModGrid .ps-module-card', c => c.map(x => x.dataset.key)), ['custom_script']);
  await page.click('.mod-category-tab[data-cat="logic"]');
  await page.click('#modalModGrid .ps-module-card[data-key="action_rules"]');
  await page.waitForSelector('.jspen-action');
  // one step to start with; change it, add two more, reorder, delete one
  const sum = () => page.$$eval('.jspen-action-sum', e => e.map(x => x.textContent.trim()));
  assert.deepEqual(await sum(), ['이 스프라이트: 오른쪽 100px 이동 · 0.5초']);
  await page.fill('.jspen-action[data-step-index="0"] [data-param-key="dx"]', '-40');
  await page.press('.jspen-action[data-step-index="0"] [data-param-key="dx"]', 'Enter');
  await page.waitForFunction(() => /왼쪽 40px/.test(document.querySelector('.jspen-action-sum')?.textContent));
  await page.selectOption('#actAddStep', 'color_to');
  await page.selectOption('#actAddStep', 'emit');
  assert.equal((await params(page)).steps.length, 3);
  await page.click('.jspen-action[data-step-index="2"] [data-step-act="up"]');
  assert.deepEqual((await params(page)).steps.map(x => x.type), ['move_by', 'emit', 'color_to']);
  await page.click('.jspen-action[data-step-index="2"] [data-step-act="delete"]');
  // the signal is named once through "+ 새 신호 만들기"
  await page.selectOption('.jspen-action[data-step-index="1"] [data-param-key="signal"]', '__new__');
  await page.fill('.jspen-new-name', '도착');
  await page.press('.jspen-new-name', 'Enter');
  await page.waitForFunction(() => /'도착' 신호 보내기/.test(document.querySelectorAll('.jspen-action-sum')[1]?.textContent));
  // the target is picked from the sprites
  await page.selectOption('.jspen-action[data-step-index="0"] [data-param-key="spriteId"]', 'other');
  const p = await params(page);
  assert.deepEqual(p.steps, [{ type: 'move_by', spriteId: 'other', dx: -40, dy: 0, duration: 0.5, ease: 'easeOutCubic' }, { type: 'emit', signal: '도착' }]);
  assert.equal(p.condition, 'on_click');
  // undo takes back one edit at a time
  await page.evaluate(() => { jspenApp.doc.undo(); jspenApp.refreshUI(); });
  assert.equal((await params(page)).steps[0].spriteId, '');
  await page.evaluate(() => { jspenApp.doc.redo(); jspenApp.refreshUI(); });
  // run it: click the button in the preview
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(150);
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  await page.mouse.click(bb.x + 400, bb.y + 300);
  await page.waitForTimeout(900);
  const x = await page.evaluate(() => jspenApp.doc.findSpriteById('other').runtime.x);
  assert.ok(Math.abs(x - 110) < 1, 'moved 40 px to the left: ' + x);
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => jspenApp.doc.findSpriteById('other').x), 150, 'the preview leaves the document as it was');
  assert.deepEqual(s.errors, []);
});

test('exports: action blocks run the same on the exported website and canvas page', async () => {
  const { page } = s;
  await load(page, [box('btn', 400, 300, [rules({ steps: [{ type: 'move_by', dx: 100, dy: 0, duration: 0.2, ease: 'linear' }, { type: 'color_to', color: '#ff0000', duration: 0 }] })])], ['btn']);
  const out = await page.evaluate(() => ({ web: jspenApp.generateWebsiteHTML(true), canvas: PhotoshopJSExporter.generateHTML(jspenApp.doc) }));
  const q = await s.browser.newPage({ viewport: { width: 800, height: 600 } });
  const errors = [];
  q.on('pageerror', e => errors.push(e.message));
  await q.setContent(out.web);
  await q.waitForTimeout(300);
  const el = await q.$('[data-sid="btn"]');
  const r0 = await el.boundingBox();
  await q.mouse.click(r0.x + r0.width / 2, r0.y + r0.height / 2);
  await q.waitForTimeout(700);
  const r1 = await el.boundingBox();
  const bg = await el.evaluate(e => getComputedStyle(e).backgroundColor);
  assert.ok(Math.abs((r1.x - r0.x) / r0.width * 120 - 100) < 2, `moved ${r1.x - r0.x}px`);
  assert.equal(bg, 'rgb(255, 0, 0)');
  await q.setContent(out.canvas);
  await q.waitForTimeout(300);
  const cv = await q.$('canvas');
  const c = await cv.boundingBox();
  const pixel = (x, y) => q.evaluate(([x, y]) => {
    const cvs = document.querySelector('canvas'), k = cvs.width / cvs.getBoundingClientRect().width;
    return [...cvs.getContext('2d').getImageData(Math.round(x * k), Math.round(y * k), 1, 1).data].slice(0, 3);
  }, [x, y]);
  const sx = c.width / 800;
  await q.mouse.click(c.x + 400 * sx, c.y + 300 * sx);
  await q.waitForTimeout(700);
  assert.deepEqual(await pixel(500 * sx, 300 * sx), [255, 0, 0], 'moved and turned red');
  await q.close();
  assert.deepEqual(errors, []);
});

test('signals: picked from a list that shows who sends and receives each; a broken link is flagged', async () => {
  const { page } = s;
  await load(page, [
    box('timer', 100, 100, [{ id: 't', type: 'timer_interval', name: '타이머', enabled: true, params: { condition: 'always', intervalSec: 1, autoStart: true, signalName: 'tick' } }]),
    box('btn', 400, 300, [{ id: 'snd', type: 'synth_sfx', name: '효과음', enabled: true, params: { condition: 'always', sound: 'pop', trigger: 'click', listenSignal: '', volume: 0.6 } }])
  ], ['btn', 'snd']);
  // the signal field is shown only when the sound plays on a signal
  assert.equal(await page.$('[data-param-key="listenSignal"]'), null);
  await page.selectOption('[data-param-key="trigger"]', 'signal');
  await page.waitForSelector('select[data-param-key="listenSignal"]');
  const options = await page.$$eval('select[data-param-key="listenSignal"] option', o => o.map(x => [x.value, x.textContent.trim()]));
  assert.deepEqual(options.map(o => o[0]), ['', 'tick', '__new__']);
  assert.match(options[1][1], /tick \(타이머\)? ?· 보냄 1 · 받음 0|tick · 보냄 1 · 받음 0/);
  await page.selectOption('select[data-param-key="listenSignal"]', 'tick');
  assert.match(await page.textContent('.jspen-link-note'), /보내는 곳: timer › 타이머/);
  // a name nobody sends is flagged
  await page.selectOption('select[data-param-key="listenSignal"]', '__new__');
  await page.fill('.jspen-new-name', 'tock');
  await page.press('.jspen-new-name', 'Enter');
  await page.waitForSelector('.jspen-link-note.is-warn');
  assert.match(await page.textContent('.jspen-link-note.is-warn'), /보내는 곳이 없습니다/);
  assert.equal((await params(page)).listenSignal, 'tock');
  // Esc leaves the name as it was
  await page.selectOption('select[data-param-key="listenSignal"]', '__new__');
  await page.fill('.jspen-new-name', 'zzz');
  await page.press('.jspen-new-name', 'Escape');
  assert.equal((await params(page)).listenSignal, 'tock');
  // the sender's side lists the receiver
  await page.evaluate(() => { jspenApp.doc.selectedSpriteId = 'timer'; jspenApp.doc.selectedModuleId = 't'; jspenApp.refreshUI(); });
  assert.match(await page.textContent('.jspen-link-note'), /아직 이 신호를 받는 곳이 없습니다/);
  await page.selectOption('select[data-param-key="signalName"]', 'tock');
  assert.match(await page.textContent('.jspen-link-note'), /받는 곳: btn › 효과음/);
  // the trigger condition uses the same list
  await page.evaluate(() => { jspenApp.doc.selectedSpriteId = 'btn'; jspenApp.doc.selectedModuleId = 'snd'; jspenApp.refreshUI(); });
  await page.selectOption('#modCond', 'on_signal');
  assert.deepEqual(await page.$$eval('#modCondSignal option', o => o.map(x => x.value)), ['', 'tock', '__new__']);
  await page.selectOption('#modCondSignal', 'tock');
  assert.match(await page.textContent('#modCondSummary'), /'tock' 신호를 받으면/);
  await page.selectOption('#modCondSignal', '');
  assert.match(await page.textContent('#modCondSummary'), /아무 신호나 받으면/);
});

test('variables: picked from a list; the value shown as text is set with words around it', async () => {
  const { page } = s;
  const gv = (id, extra) => ({ id, type: 'global_variable', name: '점수', enabled: true,
    params: Object.assign({ condition: 'always', varName: 'score', action: 'add', value: 1, fireOn: 'click', listenSignal: '', initialValue: 0, displayTemplate: '' }, extra) });
  await load(page, [box('btn', 400, 300, [gv('g1')]),
    box('check', 100, 100, [{ id: 'cb', type: 'condition_branch', name: '조건', enabled: true, params: { condition: 'always', inputSource: 'variable', varName: 'lives', compare: '>=', threshold: 1, signalTrue: 'if_true', signalFalse: 'if_false', gateBelow: true } }])], ['btn', 'g1']);
  assert.deepEqual(await page.$$eval('select[data-param-key="varName"] option', o => o.map(x => x.value)), ['', 'lives', 'score', '__new__']);
  // value shown as text: a checkbox and the words before / after it
  await page.check('[data-template-part="on"]');
  await page.fill('[data-template-part="prefix"]', '점수: ');
  await page.fill('[data-template-part="suffix"]', '점');
  await page.press('[data-template-part="suffix"]', 'Tab');
  assert.equal((await params(page)).displayTemplate, '점수: {value}점');
  // "read" hides what only changing the value uses
  await page.selectOption('[data-param-key="action"]', 'read');
  await page.waitForFunction(() => !document.querySelector('[data-param-key="value"]'));
  // a variable that nothing changes is flagged where it is read
  await page.evaluate(() => { jspenApp.doc.selectedSpriteId = 'check'; jspenApp.doc.selectedModuleId = 'cb'; jspenApp.refreshUI(); });
  assert.match(await page.textContent('.jspen-link-note.is-warn'), /바꾸는 곳이 없습니다/);
  await page.selectOption('select[data-param-key="varName"]', 'score');
  assert.match(await page.textContent('.jspen-link-note'), /바꾸는 곳: btn › 점수/);
  // the field disappears when the input is not a variable
  await page.selectOption('[data-param-key="inputSource"]', 'time');
  await page.waitForFunction(() => !document.querySelector('[data-param-key="varName"]'));
});

test('numbers: units in the field, a fill for ranged values, drag on the label, and an angle dial', async () => {
  const { page } = s;
  await load(page, [box('btn', 400, 300, [rules({ steps: [{ type: 'rotate_by', spriteId: '', deg: 90, duration: 0.5, ease: 'easeOutCubic' }] }),
    { id: 'h', type: 'hover_proximity', name: '호버', enabled: true, params: { condition: 'always', detectionRadius: 60, scaleOnHover: 1.15 } }])], ['btn', 'r']);
  const row = '.jspen-action[data-step-index="0"]';
  assert.equal(await page.textContent(`${row} [data-param-key="duration"] + .jspen-unit`), '초');
  assert.equal(await page.textContent(`${row} [data-param-key="deg"] + .jspen-unit`), '도');
  // the dial: drag a quarter turn clockwise from the top
  await page.locator(`${row} .jspen-dial`).scrollIntoViewIfNeeded();
  const dial = await (await page.$(`${row} .jspen-dial`)).boundingBox();
  const cx = dial.x + dial.width / 2, cy = dial.y + dial.height / 2;
  await page.mouse.move(cx, cy - 10);
  await page.mouse.down();
  for (let a = 0; a <= 90; a += 10) await page.mouse.move(cx + 10 * Math.sin(a * Math.PI / 180), cy - 10 * Math.cos(a * Math.PI / 180));
  await page.mouse.up();
  assert.equal((await params(page)).steps[0].deg, 180, '90 + a quarter turn');
  // a ranged value has a fill; dragging its label changes it like the field
  await page.evaluate(() => { jspenApp.doc.selectedModuleId = 'h'; jspenApp.refreshUI(); });
  const group = '[data-param-key="scaleOnHover"]';
  const fill = await page.$eval(group, e => e.closest('.blender-scrub-group').style.getPropertyValue('--fill'));
  assert.equal(parseFloat(fill).toFixed(1), (0.65 / 1.5 * 100).toFixed(1));
  assert.equal(await page.textContent(`[data-param-key="detectionRadius"] + .jspen-unit`), 'px');
  const label = await page.$(`.ps-prop-row:has(${'[data-param-key="detectionRadius"]'}) .ps-prop-label`);
  await label.scrollIntoViewIfNeeded();
  const lb = await label.boundingBox();
  await page.mouse.move(lb.x + 10, lb.y + lb.height / 2);
  await page.mouse.down();
  await page.mouse.move(lb.x + 30, lb.y + lb.height / 2, { steps: 4 });
  await page.mouse.up();
  assert.equal((await params(page, 'btn', 1)).detectionRadius, 80);
  assert.deepEqual(s.errors, []);
});

test('signals: a sender left at its default name counts under that name', async () => {
  const { page } = s;
  await load(page, [
    box('timer', 100, 100, [{ id: 't', type: 'timer_interval', name: '타이머', enabled: true, params: { condition: 'always', intervalSec: 1, autoStart: true, signalName: '' } }]),
    box('btn', 400, 300, [{ id: 'r', type: 'signal_relay', name: '중계', enabled: true, params: { condition: 'always', inputSignal: 'timer_tick', delaySec: 0, outputSignal: '', action: 'emit_signal' } }])
  ], ['btn', 'r']);
  assert.match(await page.textContent('.jspen-link-note'), /보내는 곳: timer › 타이머/);
  const out = await page.$$eval('select[data-param-key="outputSignal"] option', o => o.map(x => x.value));
  assert.ok(out.includes('signal_relayed'), out.join());
});
