// Images (menu, drop, paste, fit, export) and fonts (choice, upload, export).
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { startServer, openStudio } = require('./helpers');

let server, s, tmp;
before(async () => {
  server = await startServer(); s = await openStudio(server.url);
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jspen-media-'));
});
after(async () => { await s.browser.close(); await server.stop(); });

// A PNG made in the page: left half red, right half blue.
const makePng = (w, h) => s.page.evaluate(([w, h]) => {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.fillStyle = '#ff0000'; x.fillRect(0, 0, w / 2, h); x.fillStyle = '#0000ff'; x.fillRect(w / 2, 0, w / 2, h);
  return c.toDataURL('image/png');
}, [w, h]);
const fresh = () => s.page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 'media', width: 800, height: 600, transparentBackground: false, backgroundColor: '#000000', layers: [{ name: 'L', sprites: [] }] }));
const images = () => s.page.evaluate(() => jspenApp.doc.layers.flatMap(l => l.sprites).filter(x => x.type === 'image')
  .map(x => ({ w: x.width, h: x.height, nw: x.naturalWidth, nh: x.naturalHeight, x: Math.round(x.x), y: Math.round(x.y), url: x.imageUrl.slice(0, 15) })));

test('images: import from the file menu (large images are downscaled and fitted)', async () => {
  await fresh();
  const png = await makePng(3000, 1000);
  const file = path.join(tmp, 'wide.png');
  fs.writeFileSync(file, Buffer.from(png.split(',')[1], 'base64'));
  const [fc] = await Promise.all([s.page.waitForEvent('filechooser'), s.page.evaluate(() => { document.querySelector('#mImportImage').click(); })]);
  await fc.setFiles(file);
  await s.page.waitForFunction(() => jspenApp.doc.layers[0].sprites.some(x => x.type === 'image'));
  const [img] = await images();
  assert.deepEqual([img.nw, img.nh], [2048, 683], 'downscaled to 2048px');
  assert.ok(img.w <= 480 && img.h <= 360, 'fits inside 60% of the artboard');
  assert.equal(img.url, 'data:image/png;');
  assert.equal(await s.page.evaluate(() => jspenApp.doc.layers.length), 1, 'no extra layer');
});

test('images: paste from the clipboard and drop onto the canvas', async () => {
  await fresh();
  const png = await makePng(200, 100);
  await s.page.evaluate(async (png) => {
    const blob = await (await fetch(png)).blob();
    const file = new File([blob], 'shot.png', { type: 'image/png' });
    const dt = new DataTransfer(); dt.items.add(file);
    window.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true }));
  }, png);
  await s.page.waitForFunction(() => jspenApp.doc.layers[0].sprites.filter(x => x.type === 'image').length === 1);
  const bb = await (await s.page.$('#viewportCanvas')).boundingBox();
  await s.page.evaluate(async ([png, cx, cy]) => {
    const blob = await (await fetch(png)).blob();
    const dt = new DataTransfer(); dt.items.add(new File([blob], 'drop.png', { type: 'image/png' }));
    window.dispatchEvent(new DragEvent('drop', { dataTransfer: dt, clientX: cx, clientY: cy, bubbles: true, cancelable: true }));
  }, [png, bb.x + 100, bb.y + 120]);
  await s.page.waitForFunction(() => jspenApp.doc.layers[0].sprites.filter(x => x.type === 'image').length === 2);
  const imgs = await images();
  const dropAt = await s.page.evaluate(([x, y]) => jspenApp.renderer.screenToWorld(x, y), [100, 120]);
  assert.deepEqual([imgs[1].x, imgs[1].y], [Math.round(dropAt.x), Math.round(dropAt.y)], 'dropped where released');
});

test('images: fit modes (cover/contain/fill) in the studio; website export uses object-fit and alt', async () => {
  await fresh();
  const png = await makePng(400, 100);
  const out = await s.page.evaluate(async (png) => {
    const sp = await jspenApp.insertImage(png, 'fit');
    sp.x = 400; sp.y = 300; sp.width = 200; sp.height = 200;
    const probe = (fit) => {
      sp.imageFit = fit;
      const c = jspenApp.renderer.canvas; const keep = [c.width, c.height];
      c.width = 800; c.height = 600;
      const r = new jspenApp.renderer.constructor(c, jspenApp.doc); r.panX = 0; r.panY = 0; r.zoom = 1;
      const ctx = c.getContext('2d'); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, 800, 600);
      for (const l of jspenApp.doc.layers) r.drawLayer(ctx, l);
      const px = (x, y) => Array.from(ctx.getImageData(x, y, 1, 1).data).slice(0, 3).join(',');
      const res = { top: px(330, 210), left: px(310, 300), right: px(490, 300) };
      c.width = keep[0]; c.height = keep[1]; jspenApp.renderCanvas();
      return res;
    };
    await new Promise(r => setTimeout(r, 100));
    const cover = probe('cover'), contain = probe('contain'), fill = probe('fill');
    sp.alt = '빨강 파랑 이미지';
    return { cover, contain, fill, web: jspenApp.generateWebsiteHTML(true) };
  }, png);
  // cover: crops the sides -> the whole box is covered; contain: letterboxed (black above)
  assert.equal(out.cover.top, '255,0,0');
  assert.equal(out.contain.top, '0,0,0');
  assert.deepEqual([out.fill.left, out.fill.right], ['255,0,0', '0,0,255']);
  assert.match(out.web, /<img src="data:image\/png;base64,[^"]+" alt="빨강 파랑 이미지" style="[^"]*object-fit:fill/);
});

const FONT = ['/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf', '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'].find(f => fs.existsSync(f));

test('fonts: upload a font file, use it for text, and ship it in both exports', { skip: !FONT && 'no test font installed' }, async () => {
  await fresh();
  const family = path.basename(FONT, '.ttf');
  await s.page.evaluate(() => {
    const sp = jspenApp.doc.layers[0].addSprite({ name: 'T', type: 'text', text: 'iiiii', x: 400, y: 300, width: 400, height: 80, fontSize: 40, fill: '#ffffff' });
    jspenApp.doc.selectedSpriteId = sp.id; jspenApp.refreshUI();
  });
  const [fc] = await Promise.all([s.page.waitForEvent('filechooser'), s.page.evaluate(() => { document.querySelector('#mAddFont').click(); })]);
  await fc.setFiles(FONT);
  await s.page.waitForFunction((f) => jspenApp.doc.fonts.some(x => x.family === f), family);
  await s.page.selectOption('#inpFontFamily', family);
  await s.page.waitForFunction((f) => document.fonts.check('40px "' + f + '"'), family);
  const r = await s.page.evaluate((f) => {
    const sp = jspenApp.doc.layers[0].sprites[0];
    const c = document.createElement('canvas').getContext('2d');
    c.font = '40px ' + PhotoshopCanvas.fontStack(f); const w1 = c.measureText('iiiii').width;
    c.font = '40px ' + PhotoshopCanvas.fontStack(''); const w0 = c.measureText('iiiii').width;
    return { family: sp.fontFamily, mono: w1 > w0 * 1.3, saved: !!jspenApp.doc.toJSON().fonts[0].src.startsWith('data:font/ttf;base64,'),
      web: jspenApp.generateWebsiteHTML(true), html: PhotoshopJSExporter.generateHTML(jspenApp.doc) };
  }, family);
  assert.equal(r.family, family);
  assert.ok(r.mono, 'text uses the uploaded (monospace) font');
  assert.ok(r.saved, 'font embedded in the document');
  assert.match(r.web, new RegExp('@font-face \\{ font-family: "' + family + '"; src: url\\(data:font/ttf;base64,'));
  // exported JS page loads the embedded font
  const q = await s.browser.newPage();
  await q.setContent(r.html);
  await q.waitForFunction((f) => document.fonts.check('40px "' + f + '"'), family, { timeout: 5000 });
  await q.close();
});

test('fonts: inspector offers common fonts and keeps unknown families', async () => {
  await fresh();
  const opts = await s.page.evaluate(() => {
    const sp = jspenApp.doc.layers[0].addSprite({ name: 'T', type: 'text', text: 'a', x: 100, y: 100, fontFamily: 'Some Font' });
    jspenApp.doc.selectedSpriteId = sp.id; jspenApp.refreshUI();
    return [...document.querySelectorAll('#inpFontFamily option')].map(o => o.value);
  });
  assert.ok(opts.includes('Malgun Gothic') && opts.includes(''), JSON.stringify(opts));
  assert.ok(opts.includes('Some Font'), 'current unknown family stays selectable');
  assert.equal(await s.page.evaluate(() => PhotoshopCanvas.fontStack('My "Font"; x{')), 'My "Font" x', 'font names are sanitised');
});
