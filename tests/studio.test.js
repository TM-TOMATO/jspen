// Studio UI tests: XSS escaping, project save/open, templates, editing smoke test.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, openStudio, ROOT } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => { if (s) await s.browser.close(); if (server) await server.stop(); });

test('user strings are escaped in the studio UI (no XSS)', async () => {
  const { page } = s;
  const title = await page.evaluate(() => {
    const payload = '<img src=x onerror="window.__xss=1">';
    const l = jspenApp.doc.layers[0];
    l.name = payload + ' & Co';
    l.sprites[0].name = payload;
    jspenApp.doc.selectedSpriteId = l.sprites[0].id;
    jspenApp.refreshUI();
    return document.querySelector('.ps-layer-title').textContent;
  });
  await page.waitForTimeout(200);
  assert.equal(await page.evaluate(() => window.__xss), undefined);
  assert.equal(title, '<img src=x onerror="window.__xss=1"> & Co');
});

test('safeUrl only allows http(s), mailto, tel, relative and #anchor links', async () => {
  const r = await s.page.evaluate(() => {
    const f = JSPenSecurity.safeUrl;
    return [f('https://a.b'), f('#x'), f('/p'), f('mailto:a@b'), f(' JaVa\tScript:alert(1)'), f('data:text/html,x'), f('vbscript:x')];
  });
  assert.deepEqual(r, ['https://a.b', '#x', '/p', 'mailto:a@b', '', '', '']);
});

test('template gallery loads every template', async () => {
  const r = await s.page.evaluate(async () => {
    const list = await jspenApp.templateModal.fetchTemplateList();
    const loaded = [];
    for (const t of list) loaded.push(!!(await jspenApp.templateModal.loadTemplateFile(t.file)));
    const traversal = await jspenApp.templateModal.loadTemplateFile('../main.py');
    return { n: list.length, loaded, traversal };
  });
  assert.ok(r.n >= 7);
  assert.ok(r.loaded.every(Boolean));
  assert.equal(r.traversal, null);
});

// Ctrl+O right after the previous file chooser closed: Chrome sometimes drops
// the new chooser request (the app did click its file input with a user
// gesture). A person cannot press Ctrl+O while a chooser is open, so press again.
async function openChooser(page) {
  for (let attempt = 1; ; attempt++) {
    try {
      const [fc] = await Promise.all([page.waitForEvent('filechooser', { timeout: 3000 }), page.keyboard.press('Control+o')]);
      return fc;
    } catch (e) {
      if (attempt >= 3) throw e;
    }
  }
}

test('browser mode: Ctrl+S downloads a .jspen file, Ctrl+O opens one', async () => {
  const { page } = s;
  // Shortcuts are ignored while an input has focus (typing priority).
  await page.evaluate(() => document.activeElement && document.activeElement.blur());
  const [dl] = await Promise.all([page.waitForEvent('download'), page.keyboard.press('Control+s')]);
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jspen-'));
  const saved = path.join(tmp, 'saved.jspen');
  await dl.saveAs(saved);
  const data = JSON.parse(fs.readFileSync(saved, 'utf8'));
  assert.ok(Array.isArray(data.layers));

  const fc = await openChooser(page);
  await fc.setFiles(path.join(ROOT, 'templates', 'full_landing.jspen'));
  await page.waitForFunction(() => jspenApp.doc.layers.length === 5);

  // A broken file is rejected and the current document is kept.
  const broken = path.join(tmp, 'broken.jspen');
  fs.writeFileSync(broken, '{not json');
  const fc2 = await openChooser(page);
  await fc2.setFiles(broken);
  await page.waitForFunction(() => /불러오지 못했습니다/.test(document.querySelector('.studio-toast')?.textContent || ''));
  assert.equal(await page.evaluate(() => jspenApp.doc.layers.length), 5);
});

test('drawing tools, undo/redo and menus run without errors', async () => {
  const { page, errors } = s;
  await page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 't', width: 1440, height: 900, layers: [{ name: 'L', sprites: [] }] }));
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  const cx = bb.x + bb.width / 2, cy = bb.y + bb.height / 2;
  const drag = async (x1, y1, x2, y2) => {
    await page.mouse.move(x1, y1); await page.mouse.down();
    for (let i = 1; i <= 8; i++) await page.mouse.move(x1 + (x2 - x1) * i / 8, y1 + (y2 - y1) * i / 8);
    await page.mouse.up();
  };
  const count = () => page.evaluate(() => jspenApp.doc.layers.reduce((a, l) => a + l.sprites.length, 0));

  await page.keyboard.press('u'); await drag(cx - 200, cy - 100, cx - 50, cy + 20);
  await page.keyboard.press('b'); await drag(cx - 100, cy + 100, cx + 150, cy + 160);
  await page.keyboard.press('p'); for (const [dx, dy] of [[0, 0], [80, 40], [160, -20]]) await page.mouse.click(cx + 200 + dx, cy + 80 + dy); await page.keyboard.press('Enter');
  await page.keyboard.press('c'); for (const [dx, dy] of [[0, 0], [60, 60], [120, 0]]) await page.mouse.click(cx - 300 + dx, cy + 150 + dy); await page.keyboard.press('Enter');
  assert.equal(await count(), 4);

  await page.keyboard.press('v'); await drag(cx - 125, cy - 40, cx - 60, cy - 10);
  await page.keyboard.press('Control+a'); await page.keyboard.press('Delete');
  assert.equal(await count(), 0);
  await page.keyboard.press('Control+z');
  assert.equal(await count(), 4);

  // Clicking a sprite without changing it must not add an undo step.
  const h0 = await page.evaluate(() => jspenApp.doc.history.length);
  await page.mouse.click(cx - 125, cy - 40); await page.mouse.click(cx - 125, cy - 40);
  assert.equal(await page.evaluate(() => jspenApp.doc.history.length), h0);

  await page.keyboard.press('i'); await page.mouse.move(cx, cy); await page.mouse.move(cx + 5, cy + 5);
  assert.equal(await page.evaluate(() => document.getElementById('eyedropperLoupe').classList.contains('hidden')), false);
  await page.keyboard.press('z'); await page.mouse.click(cx, cy);
  for (const m of await page.$$('.ps-menu-item')) { await m.click(); }
  await page.keyboard.press('Escape');
  // Menus also open on hover: move the pointer off the menu bar.
  await page.mouse.move(bb.x + 10, bb.y + bb.height - 10);
  assert.deepEqual(errors, []);
});

test('text tool: click and type immediately; Enter commits; single undo step', async () => {
  const { page } = s;
  await page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 't', width: 1440, height: 900, layers: [{ name: 'L', sprites: [] }] }));
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  await page.keyboard.press('t');
  await page.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2);
  await page.waitForFunction(() => document.activeElement?.classList.contains('jspen-inline-text-editor'));
  await page.keyboard.type('Hello 한글');
  await page.keyboard.press('Enter');
  const texts = () => page.evaluate(() => jspenApp.doc.layers.flatMap(l => l.sprites).filter(x => x.type === 'text').map(x => x.text));
  assert.deepEqual(await texts(), ['Hello 한글']);
  assert.equal(await page.evaluate(() => jspenApp.tools.activeTool), 'text');
  await page.keyboard.press('Control+z');
  assert.deepEqual(await texts(), []);
});

test('re-rendering panels does not leak window listeners', async () => {
  const { page, context } = s;
  const cdp = await context.newCDPSession(page);
  const countListeners = async () => {
    const { result } = await cdp.send('Runtime.evaluate', { expression: 'window' });
    const { listeners } = await cdp.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    return listeners.length;
  };
  const before = await countListeners();
  await page.evaluate(() => { for (let i = 0; i < 10; i++) { jspenApp.refreshUI(); jspenApp.menuBar.render(); jspenApp.timeline.render(); } });
  await page.keyboard.press('Shift+Tab'); await page.keyboard.press('Shift+Tab');
  assert.equal(await countListeners(), before);
});

test('layers panel: double-click renames, long lists scroll, brush never adds layers', async () => {
  const { page } = s;
  await page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 't', width: 1440, height: 900, layers: [{ name: 'L1', sprites: [{ name: 'S', type: 'rect', x: 300, y: 300, width: 100, height: 100 }] }] }));
  // rename by double-click (the first click re-renders the panel)
  await page.dblclick('#layersContainer .ps-layer-title');
  await page.waitForSelector('#layersContainer input.ps-layer-title-input');
  await page.keyboard.press('Control+a'); await page.keyboard.type('배경'); await page.keyboard.press('Enter');
  assert.equal(await page.evaluate(() => jspenApp.doc.layers[0].name), '배경');
  const titleWidth = await page.evaluate(() => document.querySelector('#layersContainer .ps-layer-title').getBoundingClientRect().width);
  assert.ok(titleWidth >= 40, `layer name visible (${titleWidth}px)`);

  // brush strokes stay in the selected layer, also after undo/redo
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  const stroke = async (y) => { await page.mouse.move(bb.x + 300, bb.y + y); await page.mouse.down(); await page.mouse.move(bb.x + 380, bb.y + y + 20); await page.mouse.up(); };
  await page.keyboard.press('b'); await stroke(200); await page.keyboard.press('Control+z'); await page.keyboard.press('Control+y'); await stroke(260);
  await page.keyboard.press('u'); await page.mouse.move(bb.x + 500, bb.y + 300); await page.mouse.down(); await page.mouse.move(bb.x + 560, bb.y + 360); await page.mouse.up();
  const r = await page.evaluate(() => ({ layers: jspenApp.doc.layers.length, brushSprites: jspenApp.doc.layers[0].sprites.filter(x => x.type === 'brush').length,
    strokes: (jspenApp.doc.layers[0].sprites.find(x => x.type === 'brush') || {}).strokes?.length }));
  assert.deepEqual(r, { layers: 1, brushSprites: 1, strokes: 2 });

  // a long list scrolls
  await page.evaluate(() => { for (let i = 0; i < 40; i++) jspenApp.doc.layers[0].addSprite({ name: 'n' + i, type: 'rect', x: 10, y: 10, width: 10, height: 10 }); jspenApp.refreshUI(); });
  const lb = await (await page.$('#layersContainer .ps-layer-list')).boundingBox();
  await page.mouse.move(lb.x + lb.width / 2, lb.y + lb.height / 2); await page.mouse.wheel(0, 400); await page.waitForTimeout(200);
  assert.ok(await page.evaluate(() => document.querySelector('#layersContainer .ps-layer-list').scrollTop) > 0, 'layer list scrolled');
  await page.keyboard.press('v');
});

test('layer modules run for every sprite of the layer; unsaved changes are confirmed', async () => {
  const { page } = s;
  await page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 't', width: 800, height: 600, layers: [{ name: 'L', modules: [
    { id: 'lm', type: 'motion_wave', name: 'w', enabled: true, params: { condition: 'always', axis: 'y', amplitude: 30, frequency: 1 } }],
    sprites: [{ name: 'a', type: 'rect', x: 100, y: 300, width: 40, height: 40 }, { name: 'b', type: 'rect', x: 300, y: 300, width: 40, height: 40 }] }] }));
  assert.equal(await page.evaluate(() => jspenApp.isDirty()), false, 'fresh document is clean');
  await page.keyboard.press('Control+Space'); await page.waitForTimeout(400);
  const moved = await page.evaluate(() => jspenApp.doc.layers[0].sprites.map(x => Math.round(x.runtime.y) !== 300));
  await page.keyboard.press('Escape');
  assert.deepEqual(moved, [true, true]);
  await page.evaluate(() => { jspenApp.doc.layers[0].sprites[0].name = 'changed'; jspenApp.doc.saveState(); });
  assert.equal(await page.evaluate(() => jspenApp.isDirty()), true);
  await page.evaluate(() => { window.__opened = null; jspenApp.openProjectText(JSON.stringify({ name: 'other', layers: [] }), 'o.jspen', true).then(ok => { window.__opened = ok; }); });
  await page.waitForSelector('.studio-modal-overlay');
  await page.click('#btnStudioModalCancel');
  await page.waitForFunction(() => window.__opened !== null);
  assert.deepEqual(await page.evaluate(() => [window.__opened, jspenApp.doc.name]), [false, 't']);
});
