// Mouse interaction tests: studio live preview (Ctrl+Space) and the exported player.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => { await s.browser.close(); await server.stop(); });

// Build an 800x600 document with interactive sprites at known positions.
const SETUP = () => {
  const mk = (type, params = {}) => ({ id: 'mod_' + type, type, name: type, enabled: true,
    params: Object.assign(JSON.parse(JSON.stringify(MODULE_REGISTRY[type].defaultParams || {})), params) });
  const sprite = (o, mods) => Object.assign({ type: 'rect', width: 80, height: 80, fill: '#ffffff', modules: mods }, o);
  jspenApp.loadProjectFromJSON({
    name: 'interactive', width: 800, height: 600, transparentBackground: false, backgroundColor: '#111111',
    layers: [{ name: 'L', sprites: [
      sprite({ name: 'drag', x: 100, y: 100, fill: '#ff0000' }, [mk('draggable')]),
      sprite({ name: 'hover', x: 300, y: 100, fill: '#00ff00' }, [mk('hover_proximity', { detectionRadius: 0, scaleOnHover: 1.5 })]),
      sprite({ name: 'toggle', x: 500, y: 100, fill: '#0000ff' }, [mk('toggle_switch')]),
      sprite({ name: 'follow', x: 700, y: 500, width: 20, height: 20, fill: '#ffff00' }, [mk('follow_target', { trackMode: 'direct' })]),
      sprite({ name: 'link', x: 100, y: 400, fill: '#ff00ff' }, [mk('hyperlink', { url: 'https://example.com/', target: '_blank' })]),
      sprite({ name: 'badlink', x: 300, y: 400, fill: '#00ffff' }, [mk('hyperlink', { url: 'javascript:alert(1)' })]),
      sprite({ name: 'counter', type: 'text', text: '0', x: 500, y: 400, width: 80, height: 40 }, [mk('counter_accumulator')])
    ] }]
  });
  const r = jspenApp.renderer; r.zoom = 1; r.panX = 0; r.panY = 0;
  jspenApp.renderCanvas();
  return JSON.stringify(jspenApp.doc.toJSON().layers);
};

const runtime = name => s.page.evaluate(n => {
  const sp = jspenApp.doc.layers[0].sprites.find(x => x.name === n);
  return { x: Math.round(sp.runtime.x), y: Math.round(sp.runtime.y), sx: +sp.runtime.scaleX.toFixed(2), toggle: sp.runtime.toggleState, text: sp.text };
}, name);

test('studio live preview runs module interactions and restores the document', async () => {
  const { page, context, errors } = s;
  const before = await page.evaluate(SETUP);
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  const at = (x, y) => [bb.x + x, bb.y + y];
  const popups = [];
  context.on('page', p => popups.push(p));

  await page.keyboard.press('Control+Space');
  assert.equal(await page.evaluate(() => jspenApp.moduleEngine.active && jspenApp.renderer.mode), 'preview');

  // drag
  await page.mouse.move(...at(100, 100)); await page.mouse.down();
  for (let i = 1; i <= 10; i++) { await page.mouse.move(...at(100 + 10 * i, 100 + 15 * i)); await page.waitForTimeout(16); }
  await page.mouse.up(); await page.waitForTimeout(100);
  assert.deepEqual([(await runtime('drag')).x, (await runtime('drag')).y], [200, 250]);

  // hover scale
  await page.mouse.move(...at(300, 100)); await page.waitForTimeout(400);
  assert.equal((await runtime('hover')).sx, 1.5);

  // toggle + counter clicks
  await page.mouse.click(...at(500, 100)); await page.waitForTimeout(150);
  assert.equal((await runtime('toggle')).toggle, true);
  for (let i = 0; i < 3; i++) { await page.mouse.click(...at(500, 400)); await page.waitForTimeout(250); }
  assert.equal((await runtime('counter')).text, '3');

  // follow mouse
  await page.mouse.move(...at(650, 300)); await page.waitForTimeout(150);
  const f = await runtime('follow');
  assert.deepEqual([f.x, f.y], [650, 300]);

  // editing is locked during preview
  await page.keyboard.press('Delete'); await page.keyboard.press('Control+z');
  assert.equal(await page.evaluate(() => jspenApp.doc.layers[0].sprites.length), 7);

  // links: https opens, javascript: is blocked
  await page.mouse.click(...at(100, 400)); await page.waitForTimeout(300);
  await page.mouse.click(...at(300, 400)); await page.waitForTimeout(300);
  assert.equal(popups.length, 1);
  for (const p of popups) await p.close();

  // Esc restores the edited document exactly
  await page.keyboard.press('Escape');
  const after = await page.evaluate(() => JSON.stringify(jspenApp.doc.toJSON().layers));
  assert.equal(await page.evaluate(() => jspenApp.moduleEngine.active), false);
  assert.equal(after, before);
  assert.deepEqual(errors, []);
});

test('exported player supports drag, hover, follow and links', async () => {
  const { page, context } = s;
  await page.evaluate(SETUP);
  const html = await page.evaluate(() => PhotoshopJSExporter.generateHTML(jspenApp.doc));
  const q = await context.newPage();
  const errs = []; q.on('pageerror', e => errs.push(e.message));
  await q.setViewportSize({ width: 800, height: 600 });
  await q.setContent(html); await q.waitForTimeout(300);
  const qb = await (await q.$('canvas')).boundingBox();
  const k = qb.width / 800;
  const at = (x, y) => [qb.x + x * k, qb.y + y * k];
  const px = (x, y) => q.evaluate(([x, y]) => {
    const c = document.querySelector('canvas'); const s = c.width / 800;
    return Array.from(c.getContext('2d').getImageData(Math.round(x * s), Math.round(y * s), 1, 1).data).slice(0, 3).join(',');
  }, [x, y]);

  assert.equal(await px(100, 100), '255,0,0');
  await q.mouse.move(...at(100, 100)); await q.mouse.down();
  for (let i = 1; i <= 10; i++) { await q.mouse.move(...at(100 + 10 * i, 100 + 15 * i)); await q.waitForTimeout(16); }
  await q.mouse.up();
  await q.mouse.move(...at(780, 20)); await q.waitForTimeout(150);
  assert.equal(await px(100, 100), '17,17,17', 'red square left its start');
  assert.equal(await px(200, 250), '255,0,0', 'red square dropped at the pointer');

  await q.mouse.move(...at(300, 100)); await q.waitForTimeout(400);
  assert.equal(await px(300, 150), '0,255,0', 'hovered square scaled up');

  await q.mouse.move(...at(650, 300)); await q.waitForTimeout(150);
  assert.equal(await px(650, 300), '255,255,0', 'follower under the pointer');

  const [popup] = await Promise.all([context.waitForEvent('page'), q.mouse.click(...at(100, 400))]);
  await popup.close();
  await q.close();
  assert.deepEqual(errs, []);
});

test('saving or opening a file during live preview never captures runtime changes', async () => {
  const { page } = s;
  await page.evaluate(SETUP);
  await page.evaluate(() => {
    const sp = jspenApp.doc.layers[0].sprites.find(x => x.name === 'counter');
    sp.modules.push({ id: 'tw', type: 'typewriter', name: 'tw', enabled: true,
      params: Object.assign(JSON.parse(JSON.stringify(MODULE_REGISTRY.typewriter.defaultParams)), { startOn: 'load', charsPerSec: 1, startDelay: 5 }) });
  });
  await page.keyboard.press('Control+Space');
  await page.waitForTimeout(200);
  // the typewriter has blanked the text at runtime
  assert.equal(await page.evaluate(() => jspenApp.doc.layers[0].sprites.find(x => x.name === 'counter').text.replace('|', '')), '');
  // a document action ends the preview first, so the saved data is the edited document
  const saved = await page.evaluate(() => { jspenApp.endLivePreview(); return jspenApp.doc.toJSON(); });
  assert.equal(saved.layers[0].sprites.find(x => x.name === 'counter').text, '0');
  // opening a project while previewing keeps the newly opened project
  await page.keyboard.press('Control+Space');
  await page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 'other', width: 400, height: 300, layers: [{ name: 'X', sprites: [] }] }));
  assert.deepEqual(await page.evaluate(() => [jspenApp.moduleEngine.active, jspenApp.doc.name]), [false, 'other']);
});

test('website (HTML/CSS) export runs modules on the DOM elements', async () => {
  const { page, context } = s;
  const html = await page.evaluate(() => {
    const mk = (type, params = {}) => ({ id: 'w_' + type, type, name: type, enabled: true,
      params: Object.assign(JSON.parse(JSON.stringify(MODULE_REGISTRY[type].defaultParams || {})), params) });
    jspenApp.loadProjectFromJSON({ name: 'web', width: 1000, height: 2000, transparentBackground: false, backgroundColor: '#101010', layers: [{ name: 'L', sprites: [
      { id: 'btn', name: 'btn', type: 'rect', x: 500, y: 300, width: 200, height: 60, fill: '#222222', modules: [mk('text_label', { text: 'Go' }), mk('state_style', { hoverFill: '#ff0000', transition: 0.05 }), mk('scene_transition', { targetSpriteId: 'sec2', transition: 'smooth' })] },
      { id: 'drag', name: 'drag', type: 'rect', x: 150, y: 500, width: 80, height: 80, fill: '#0000ff', modules: [mk('draggable')] },
      { id: 'cnt', name: 'cnt', type: 'text', text: '0', x: 500, y: 1500, width: 300, height: 60, fill: '#ffffff', modules: [mk('count_up', { to: 1200, duration: 0.3 })] },
      { id: 'sec2', name: 'sec2', type: 'rect', x: 500, y: 1700, width: 600, height: 200, fill: '#00ff00', modules: [mk('entrance_animation', { duration: 0.3 })] }
    ] }] });
    return jspenApp.generateWebsiteHTML(true);
  });
  const q = await context.newPage();
  const errs = []; q.on('pageerror', e => errs.push(e.message));
  await q.setViewportSize({ width: 1000, height: 700 });
  await q.setContent(html);
  await q.waitForFunction(() => !!window.JSPenWebRuntime);
  const st = () => q.evaluate(() => {
    const g = id => document.querySelector('[data-sid="' + id + '"]');
    return { btnBg: getComputedStyle(g('btn')).backgroundColor, sec2Op: getComputedStyle(g('sec2')).opacity, cnt: g('cnt').textContent.trim(), scrollY: Math.round(scrollY) };
  });
  const before = await st();
  assert.equal(before.sec2Op, '0', 'entrance target hidden until scrolled into view');
  assert.equal(before.cnt, '0+');
  const ab = await (await q.$('#webArtboard')).boundingBox();
  const k = ab.width / 1000;
  const at = (x, y) => [ab.x + x * k, ab.y + y * k];
  await q.mouse.move(...at(500, 300)); await q.waitForTimeout(300);
  assert.equal((await st()).btnBg, 'rgb(255, 0, 0)', 'hover style');
  await q.mouse.move(...at(150, 500)); await q.mouse.down();
  for (let i = 1; i <= 10; i++) { await q.mouse.move(...at(150 + 15 * i, 500)); await q.waitForTimeout(16); }
  await q.mouse.up(); await q.waitForTimeout(100);
  const box = await (await q.$('[data-sid="drag"]')).boundingBox();
  assert.ok(Math.abs((box.x - ab.x + box.width / 2) / k - 300) < 2, 'dragged element moved');
  await q.mouse.click(...at(500, 300));
  await q.waitForFunction(() => window.scrollY > 1000, null, { timeout: 5000 });
  await q.waitForTimeout(800);
  const after = await st();
  assert.equal(after.sec2Op, '1');
  assert.equal(after.cnt, '1,200+');
  await q.close();
  assert.deepEqual(errs, []);
});

test('user scripts from an opened file ask before running; own scripts run; exports run scripts', async () => {
  const { page, context } = s;
  const code = "api.self.x = 400;";
  await page.evaluate((code) => jspenApp.loadProjectFromJSON({ name: 'scripted', width: 800, height: 600, layers: [{ name: 'L', sprites: [
    { name: 'a', type: 'rect', x: 100, y: 100, width: 40, height: 40, modules: [{ id: 'cs', type: 'custom_script', name: 'js', enabled: true, params: { condition: 'always', runOn: 'frame', code } }] }] }] }), code);
  // 1) not trusted: the preview asks; "cancel" keeps the script from running
  await page.keyboard.press('Control+Space');
  await page.waitForSelector('.studio-modal-overlay');
  await page.click('#btnStudioModalCancel');
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => Math.round(jspenApp.doc.layers[0].sprites[0].runtime.x)), 100);
  await page.keyboard.press('Escape');
  // 2) allowed: runs
  await page.keyboard.press('Control+Space');
  await page.waitForSelector('.studio-modal-overlay');
  await page.click('#btnStudioModalOk');
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => Math.round(jspenApp.doc.layers[0].sprites[0].runtime.x)), 400);
  await page.keyboard.press('Escape');
  // 3) a script with an error shows a toast
  await page.evaluate(() => { jspenApp.doc.layers[0].sprites[0].modules[0].params.code = 'nope('; jspenApp.trustScript('nope('); });
  await page.keyboard.press('Control+Space');
  await page.waitForFunction(() => /스크립트 오류/.test(document.querySelector('.studio-toast')?.textContent || ''));
  await page.keyboard.press('Escape');
  // 4) exported page runs the author's script
  await page.evaluate((code) => { jspenApp.doc.layers[0].sprites[0].modules[0].params.code = code; }, code);
  const html = await page.evaluate(() => PhotoshopJSExporter.generateHTML(jspenApp.doc));
  const q = await context.newPage();
  await q.setViewportSize({ width: 800, height: 600 });
  await q.setContent(html); await q.waitForTimeout(300);
  const px = await q.evaluate(() => { const c = document.querySelector('canvas'); const k = c.width / 800; return Array.from(c.getContext('2d').getImageData(Math.round(400 * k), Math.round(100 * k), 1, 1).data)[3]; });
  await q.close();
  assert.ok(px > 0, 'sprite drawn at x=400 by the script');
});

test('trigger conditions are explained in the inspector, shown in the layers panel and in the preview status panel', async () => {
  const { page } = s;
  await page.evaluate(() => {
    jspenApp.loadProjectFromJSON({ name: 'cond', width: 800, height: 600, transparentBackground: false, backgroundColor: '#111111', layers: [{ name: 'L', sprites: [
      { id: 'btn', name: '버튼', type: 'rect', x: 400, y: 300, width: 120, height: 60, fill: '#ffffff',
        modules: [{ id: 'm1', type: 'orbit_spin', name: '회전', enabled: true, params: { condition: 'on_click', speedDegPerSec: 90 } }] }] }] });
    jspenApp.doc.selectedSpriteId = 'btn'; jspenApp.doc.selectedModuleId = 'm1'; jspenApp.refreshUI();
    const r = jspenApp.renderer; r.zoom = 1; r.panX = 0; r.panY = 0; jspenApp.renderCanvas();
  });
  const summary = () => page.textContent('#modCondSummary');
  assert.match(await summary(), /클릭하면 작동을 시작해 계속 유지합니다/);
  assert.match(await page.textContent('#modCondMode option[value="auto"]'), /자동: 한 번 발동하면 계속/);
  assert.match(await page.textContent('.ps-layer-module-row .mod-cond'), /클릭→계속/);
  // key condition: capture a key by pressing it in the field
  await page.selectOption('#modCond', 'key_press');
  await page.click('#modCondKey');
  await page.keyboard.press('KeyA');
  assert.equal(await page.evaluate(() => jspenApp.doc.findSpriteById('btn').modules[0].params.condKey), 'KeyA');
  assert.match(await summary(), /'KeyA' 키를 누르면 누르고 있는 동안만 작동합니다/);
  // signal condition offers the known signal names
  await page.selectOption('#modCond', 'on_signal');
  assert.ok((await page.$$eval('#modCondSignalList option', o => o.map(x => x.value))).includes('drag_end'));
  await page.fill('#modCondSignal', 'go'); await page.press('#modCondSignal', 'Enter');
  assert.match(await summary(), /'go' 신호를 받으면 작동을 시작해 계속 유지합니다/);
  await page.selectOption('#modCondMode', 'duration');
  await page.fill('#modCondDuration', '2'); await page.press('#modCondDuration', 'Enter');
  assert.match(await summary(), /2초 동안 작동합니다/);
  // back to click; the preview status panel shows waiting -> running
  await page.selectOption('#modCond', 'on_click');
  await page.selectOption('#modCondMode', 'auto');
  await page.evaluate(() => document.activeElement?.blur());
  await page.keyboard.press('Control+Space');
  await page.waitForSelector('.jspen-module-hud .hud-row');
  await page.waitForTimeout(250);
  assert.match(await page.textContent('.jspen-module-hud .hud-row'), /○ 대기.*버튼 › 회전.*클릭→계속/);
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  await page.mouse.click(bb.x + 400, bb.y + 300);
  await page.mouse.move(bb.x + 50, bb.y + 50);
  await page.waitForTimeout(400);
  assert.match(await page.textContent('.jspen-module-hud .hud-row'), /● 작동 중/);
  // the panel never blocks clicks on the canvas
  assert.equal(await page.evaluate(() => getComputedStyle(document.querySelector('.jspen-module-hud')).pointerEvents), 'none');
  await page.keyboard.press('Escape');
  assert.equal(await page.$('.jspen-module-hud'), null, 'removed with the preview');
});
