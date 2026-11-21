// Responsive views (desktop / tablet / mobile) and canvas resizing.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => { await s.browser.close(); await server.stop(); });

const DOC = {
  name: 'resp', width: 1200, height: 800, transparentBackground: false, backgroundColor: '#101010',
  layers: [{ name: 'L', sprites: [
    { id: 'title', name: 'title', type: 'text', text: 'Hello', x: 600, y: 100, width: 600, height: 80, fontSize: 48, fill: '#ffffff' },
    { id: 'box', name: 'box', type: 'rect', x: 300, y: 400, width: 400, height: 200, fill: '#ff0000' },
    { id: 'deco', name: 'deco', type: 'rect', x: 1000, y: 400, width: 200, height: 200, fill: '#00ff00' }
  ] }]
};

test('views: switch, edit per view, save normalised, load back, undo', async () => {
  const r = await s.page.evaluate((DOC) => {
    jspenApp.loadProjectFromJSON(DOC);
    const doc = jspenApp.doc;
    const get = id => doc.findSpriteById(id);
    jspenApp.setView('mobile');
    const scaled = { w: doc.width, box: [get('box').x, get('box').width], font: get('title').fontSize };
    get('box').x = 195; get('box').width = 350; get('deco').visible = false; doc.saveState();
    const json = doc.toJSON();
    jspenApp.setView('desktop');
    const back = { w: doc.width, box: [get('box').x, get('box').width], deco: get('deco').visible };
    jspenApp.setView('mobile');
    const again = [get('box').x, get('box').width, get('deco').visible];
    // reload the saved file (it was saved while the mobile view was active)
    jspenApp.loadProjectFromJSON(JSON.parse(JSON.stringify(json)));
    const loaded = { view: jspenApp.doc.activeView, w: jspenApp.doc.width, box: jspenApp.doc.findSpriteById('box').x };
    jspenApp.doc.findSpriteById('box').x = 10; jspenApp.doc.saveState(); jspenApp.doc.undo();
    const undone = [jspenApp.doc.activeView, jspenApp.doc.findSpriteById('box').x];
    jspenApp.setView('desktop');
    return { scaled, json: { w: json.width, view: json.activeView, boxX: json.layers[0].sprites[1].x, mobile: json.layers[0].sprites[1].responsive.mobile.x, decoMobile: json.layers[0].sprites[2].responsive.mobile.visible }, back, again, loaded, undone };
  }, DOC);
  assert.deepEqual(r.scaled, { w: 390, box: [98, 130], font: 16 }, 'new view starts as the scaled desktop layout');
  assert.deepEqual(r.json, { w: 1200, view: 'mobile', boxX: 300, mobile: 195, decoMobile: false }, 'saved with desktop base + mobile overrides');
  assert.deepEqual(r.back, { w: 1200, box: [300, 400], deco: true }, 'desktop untouched');
  assert.deepEqual(r.again, [195, 350, false], 'mobile edits kept');
  assert.deepEqual(r.loaded, { view: 'mobile', w: 390, box: 195 });
  assert.deepEqual(r.undone, ['mobile', 195]);
});

test('view switcher buttons in the menu bar', async () => {
  await s.page.evaluate((DOC) => jspenApp.loadProjectFromJSON(DOC), DOC);
  await s.page.click('.jspen-view-btn[data-view="tablet"]');
  assert.deepEqual(await s.page.evaluate(() => [jspenApp.doc.activeView, jspenApp.doc.width]), ['tablet', 768]);
  assert.equal(await s.page.evaluate(() => document.querySelector('.jspen-view-btn.active').dataset.view), 'tablet');
  await s.page.click('.jspen-view-btn[data-view="desktop"]');
  assert.equal(await s.page.evaluate(() => jspenApp.doc.width), 1200);
});

test('website export switches layout by width; JS export picks the view', async () => {
  const html = await s.page.evaluate((DOC) => {
    jspenApp.loadProjectFromJSON(DOC);
    jspenApp.setView('mobile');
    const d = jspenApp.doc; d.findSpriteById('deco').visible = false; d.findSpriteById('box').x = 195; d.findSpriteById('box').width = 350;
    d.findSpriteById('box').modules = [{ id: 'mw', type: 'motion_wave', name: 'w', enabled: true, params: { condition: 'always', axis: 'y', amplitude: 10, frequency: 1 } }];
    d.saveState();
    return { web: jspenApp.generateWebsiteHTML(true), js: PhotoshopJSExporter.generateHTML(d) };
  }, DOC);
  const open = async (content, w) => { const q = await s.browser.newPage({ viewport: { width: w, height: 800 }, deviceScaleFactor: 1 }); await q.setContent(content); await q.waitForTimeout(300); return q; };
  // website: mobile
  let q = await open(html.web, 390);
  let r = await q.evaluate(() => {
    const box = document.querySelector('[data-sid="box"]'); const ab = document.getElementById('webArtboard');
    return { cls: document.documentElement.className, deco: getComputedStyle(document.querySelector('[data-sid="deco"]')).display,
      boxW: box.offsetWidth, boxLeft: box.offsetLeft, abW: ab.offsetWidth, runtimeView: window.JSPenWebRuntime.model.activeView };
  });
  await q.close();
  assert.match(r.cls, /jspen-view-mobile/);
  assert.deepEqual([r.deco, r.boxW, r.boxLeft, r.abW, r.runtimeView], ['none', 350, 20, 390, 'mobile']);
  // website: desktop
  q = await open(html.web, 1400);
  r = await q.evaluate(() => ({ cls: document.documentElement.className, deco: getComputedStyle(document.querySelector('[data-sid="deco"]')).display,
    boxW: document.querySelector('[data-sid="box"]').offsetWidth, runtimeView: window.JSPenWebRuntime.model.activeView }));
  await q.close();
  assert.match(r.cls, /jspen-view-desktop/);
  assert.deepEqual([r.deco, r.boxW, r.runtimeView], ['flex', 400, 'desktop']);
  // JS canvas export
  q = await open(html.js, 390);
  const cw = await q.evaluate(() => document.querySelector('canvas').width);
  await q.close();
  assert.equal(cw, 390);
  q = await open(html.js, 1400);
  assert.equal(await q.evaluate(() => document.querySelector('canvas').width), 1200);
  await q.close();
});

test('canvas resize asks how to treat the content (fit / stretch / keep)', async () => {
  const run = async (choice) => {
    await s.page.evaluate((DOC) => jspenApp.loadProjectFromJSON(DOC), DOC);
    await s.page.evaluate(() => { window.__p = jspenApp.resizeCanvasInteractive(600, 800); });
    await s.page.waitForSelector('.studio-modal-overlay [data-choice]');
    const idx = { fit: 0, stretch: 1, keep: 2 }[choice];
    await s.page.click(`.studio-modal-overlay [data-choice="${idx}"]`);
    await s.page.evaluate(() => window.__p);
    return s.page.evaluate(() => { const b = jspenApp.doc.findSpriteById('box'); return { W: jspenApp.doc.width, x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; });
  };
  assert.deepEqual(await run('fit'), { W: 600, x: 150, y: 400, w: 200, h: 100 }, 'uniform 0.5, centred vertically');
  assert.deepEqual(await run('stretch'), { W: 600, x: 150, y: 400, w: 200, h: 200 });
  assert.deepEqual(await run('keep'), { W: 600, x: 300, y: 400, w: 400, h: 200 });
});

test('the preview toolbar is only in the preview, not in the exported website', async () => {
  const r = await s.page.evaluate(() => ({ preview: /id="previewToolbar"/.test(jspenApp.generateWebsiteHTML(false)), exported: /id="previewToolbar"/.test(jspenApp.generateWebsiteHTML(true)) }));
  assert.deepEqual(r, { preview: true, exported: false });
});
