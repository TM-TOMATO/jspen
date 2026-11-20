// Export tests: JS/HTML player fidelity, website export, XSS in exports.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { startServer, openStudio, canvasMismatchPct } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => { await s.browser.close(); await server.stop(); });

// Render the artboard with the studio renderer on the real viewport canvas
// (so CSS applies exactly as in the studio) and return a PNG + exported HTML.
const RENDER_STUDIO = async (file) => {
  if (file) jspenApp.loadProjectFromJSON(await JSPenNative.loadJSON('templates/' + file));
  const doc = jspenApp.doc;
  const c = jspenApp.renderer.canvas; const keep = [c.width, c.height];
  c.width = doc.width; c.height = doc.height;
  doc.layers.forEach(l => l.sprites.forEach(sp => { sp._wrapCache = null; }));
  const r = new jspenApp.renderer.constructor(c, doc); r.panX = 0; r.panY = 0; r.zoom = 1;
  const ctx = c.getContext('2d');
  if (!doc.transparentBackground) { ctx.fillStyle = doc.backgroundColor; ctx.fillRect(0, 0, doc.width, doc.height); }
  for (const l of doc.layers) if (l.visible) r.drawLayer(ctx, l);
  const png = c.toDataURL();
  c.width = keep[0]; c.height = keep[1]; jspenApp.renderCanvas();
  return { png, html: PhotoshopJSExporter.generateHTML(doc), js: PhotoshopJSExporter.generateJS(doc), w: doc.width, h: doc.height };
};

test('exported JS draws every template exactly like the studio', async () => {
  const files = await s.page.evaluate(async () => (await JSPenNative.loadJSON('templates/manifest.json')).map(t => t.file));
  for (const f of files) {
    const out = await s.page.evaluate(RENDER_STUDIO, f);
    const q = await s.browser.newPage({ viewport: { width: out.w, height: out.h }, deviceScaleFactor: 1 });
    const errs = []; q.on('pageerror', e => errs.push(e.message));
    await q.setContent(out.html);
    await q.waitForTimeout(300);
    const pct = await canvasMismatchPct(q, out.png);
    await q.close();
    assert.deepEqual(errs, [], f);
    assert.ok(pct < 0.01, `${f}: ${pct.toFixed(3)}% pixels differ`);
  }
});

test('exported JS is valid standalone JavaScript', async () => {
  const out = await s.page.evaluate(RENDER_STUDIO, 'hero.jspen');
  assert.doesNotThrow(() => new vm.Script(out.js));
});

test('exports escape document content (no XSS)', async () => {
  const out = await s.page.evaluate(() => {
    const doc = jspenApp.doc;
    const sp = doc.layers.flatMap(l => l.sprites)[0];
    sp.text = '</script><script>window.__x2=1</script>';
    sp.linkUrl = ' JaVa\tScript:alert(1)';
    sp.tag = 'img src=x onerror=alert(1)';
    doc.name = '</title><script>window.__x3=1</script>';
    return { web: jspenApp.generateWebsiteHTML(false), html: PhotoshopJSExporter.generateHTML(doc) };
  });
  for (const html of [out.web, out.html]) {
    const q = await s.browser.newPage();
    const dialogs = []; q.on('dialog', d => { dialogs.push(d.message()); d.dismiss(); });
    await q.setContent(html); await q.waitForTimeout(200);
    const r = await q.evaluate(() => ({ x2: window.__x2, x3: window.__x3, js: [...document.querySelectorAll('[href]')].some(a => /script:/i.test(a.getAttribute('href'))) }));
    await q.close();
    assert.deepEqual(r, { x2: undefined, x3: undefined, js: false });
    assert.deepEqual(dialogs, []);
  }
});

test('website preview page scripts are valid (no SyntaxError)', async () => {
  const html = await s.page.evaluate(() => jspenApp.generateWebsiteHTML(false));
  const scripts = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  assert.ok(scripts.length > 0);
  for (const code of scripts) assert.doesNotThrow(() => new vm.Script(code));
});

test('exported player plays keyframes and renders sharply at devicePixelRatio 2', async () => {
  const html = await s.page.evaluate(() => {
    jspenApp.loadProjectFromJSON({ name: 'kf', width: 400, height: 300, transparentBackground: false, backgroundColor: '#000000',
      layers: [{ name: 'L', sprites: [{ name: 'box', type: 'rect', x: 50, y: 150, width: 40, height: 40, fill: '#ff0000' }] }] });
    const sp = jspenApp.doc.layers[0].sprites[0];
    sp.addKeyframe('x', 0, 50); sp.addKeyframe('x', 10, 350);
    jspenApp.doc.setFrame(0);
    return PhotoshopJSExporter.generateHTML(jspenApp.doc);
  });
  const q = await s.browser.newPage({ viewport: { width: 400, height: 300 }, deviceScaleFactor: 2 });
  await q.setContent(html);
  await q.waitForTimeout(800); // > 10 frames at 30 fps
  const r = await q.evaluate(() => {
    const c = document.querySelector('canvas');
    const px = (x, y) => Array.from(c.getContext('2d').getImageData(x * 2, y * 2, 1, 1).data).slice(0, 3).join(',');
    return { size: c.width + 'x' + c.height, left: px(50, 150) };
  });
  await q.close();
  assert.equal(r.size, '800x600');
  assert.notEqual(r.left, '255,0,0', 'box moved away from its start position');
});
