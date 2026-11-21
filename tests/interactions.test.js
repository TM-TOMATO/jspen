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
