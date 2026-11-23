// Resizing behaves like a website: canvas, website export and canvas player.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { ROOT, startServer, openStudio } = require('./helpers');

const read = name => JSON.parse(fs.readFileSync(path.join(ROOT, 'templates', name), 'utf8'));
const TEMPLATES = fs.readdirSync(path.join(ROOT, 'templates')).filter(f => f.endsWith('.jspen'));
const WIDTHS = [320, 360, 390, 480, 527, 530, 600, 601, 700, 768, 783, 786, 900, 1024, 1025, 1200, 1280, 1366, 1440, 1920, 2560];

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => {
  if (s) await s.browser.close();
  if (server) await server.stop();
});

const websiteOf = project => s.page.evaluate(d => {
  jspenApp.loadProjectFromJSON(d);
  return jspenApp.generateWebsiteHTML(true);
}, project);

async function withPage(html, width, fn) {
  const q = await s.browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 1 });
  const errors = [];
  q.on('pageerror', e => errors.push(e.message));
  try {
    await q.setContent(html);
    await fn(q);
    assert.deepEqual(errors, []);
  } finally {
    await q.close();
  }
}

async function resize(q, width) {
  await q.setViewportSize({ width, height: 800 });
  await q.waitForFunction(() => {
    const a = document.getElementById('webArtboard');
    return Math.abs(a.getBoundingClientRect().width - document.documentElement.clientWidth) < 1.5;
  }, null, { timeout: 5000 });
}

for (const name of TEMPLATES) {
  test(`website: ${name} reflows at every width (nothing clipped, overlapping or miniature)`, async () => {
    const html = await websiteOf(read(name));
    await withPage(html, 1440, async q => {
      const problems = [];
      let designed = null;
      for (const width of [1440, ...WIDTHS]) {
        await resize(q, width);
        const els = await q.evaluate(() => [...document.querySelectorAll('#webArtboard [data-sid]')].map(el => {
          const b = el.getBoundingClientRect();
          const range = document.createRange();
          range.selectNodeContents(el);
          const t = range.getBoundingClientRect(); // the rendered text
          return { id: el.dataset.sid, text: el.textContent.trim(), l: b.left, r: b.right, t: b.top, b: b.bottom,
            font: parseFloat(getComputedStyle(el).fontSize), scale: b.width / el.offsetWidth,
            spills: !!el.textContent.trim() && (t.top < b.top - 2 || t.bottom > b.bottom + 2 || t.left < b.left - 2 || t.right > b.right + 2) };
        }));
        if (!designed) designed = els;
        const overlap = (a, b) => Math.min(a.r, b.r) - Math.max(a.l, b.l) > 1.5 && Math.min(a.b, b.b) - Math.max(a.t, b.t) > 1.5;
        els.forEach((el, i) => {
          if (el.l < -1.5 || el.r > width + 1.5) problems.push(`${width}: "${el.text.slice(0, 12)}" outside the window`);
          if (el.spills && !designed[i].spills) problems.push(`${width}: "${el.text.slice(0, 12)}" text does not fit`);
          if (Math.abs(el.scale - 1) > 0.01) problems.push(`${width}: page is scaled`);
          if (el.text && el.font < Math.min(28, designed[i].font) - 0.1) problems.push(`${width}: "${el.text.slice(0, 12)}" font ${el.font}`);
          for (let j = i + 1; j < els.length; j++) {
            if (overlap(el, els[j]) && !overlap(designed[i], designed[j])) problems.push(`${width}: "${el.text.slice(0, 12)}" overlaps "${els[j].text.slice(0, 12)}"`);
          }
        });
      }
      assert.deepEqual([...new Set(problems)].slice(0, 15), []);
    });
  });
}

test('website: bands fill the window, cards go from three columns to one, and back', async () => {
  const html = await websiteOf(read('full_landing.jspen'));
  await withPage(html, 1440, async q => {
    const state = () => q.evaluate(() => {
      const all = [...document.querySelectorAll('#webArtboard [data-sid]')];
      const cards = all.filter(e => /드로잉|모디파이어|웹 내보내기/.test(e.textContent) && e.offsetHeight >= 200);
      const band = all[0];
      return { band: band.offsetWidth, tops: cards.map(e => e.offsetTop), widths: cards.map(e => e.offsetWidth),
        boxes: all.map(e => [e.offsetLeft, e.offsetTop, e.offsetWidth, e.offsetHeight]) };
    });
    const original = await state();
    assert.equal(original.tops.length, 3);
    await resize(q, 2560);
    let r = await state();
    assert.equal(r.band, 2560);
    assert.deepEqual(r.widths, [340, 340, 340], 'content is not magnified');
    await resize(q, 900);
    assert.equal(new Set((await state()).tops).size, 1, 'three columns');
    await resize(q, 700);
    assert.equal(new Set((await state()).tops).size, 2, 'two columns');
    await resize(q, 390);
    assert.equal(new Set((await state()).tops).size, 3, 'one column');
    await resize(q, 1440);
    assert.deepEqual((await state()).boxes, original.boxes, 'back at the design width: exactly the design');
  });
});

test('canvas: dragging the edge reflows live, and back restores the design exactly', async () => {
  const { page } = s;
  await page.evaluate(d => {
    jspenApp.loadProjectFromJSON(d);
    jspenApp.inspector.canvasMode = undefined;
    jspenApp.tools.setTool('move');
    const r = jspenApp.renderer;
    r.zoom = 0.4; r.panX = 20; r.panY = 20;
    jspenApp.renderCanvas();
  }, read('full_landing.jspen'));
  const geometry = () => page.evaluate(() => ({ W: jspenApp.doc.width, H: jspenApp.doc.height,
    boxes: jspenApp.doc.layers.flatMap(l => l.sprites.map(p => [p.x, p.y, p.width, p.height, p.fontSize, p.modules.find(m => m.type === 'text_label')?.params.fontSize])) }));
  const original = await geometry();
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  const edge = () => page.evaluate(() => ({ x: jspenApp.renderer.panX + jspenApp.doc.width * jspenApp.renderer.zoom + 2, y: jspenApp.renderer.panY + 80 }));

  let p = await edge();
  await page.mouse.move(bb.x + p.x, bb.y + p.y);
  await page.mouse.down();
  await page.mouse.move(bb.x + p.x - 420, bb.y + p.y, { steps: 12 }); // 1050 document px
  const during = await geometry();
  assert.equal(during.W, 390);
  assert.ok(during.H > original.H, 'stacked content makes the page taller while dragging');
  for (const [x, , w] of during.boxes) assert.ok(x - w / 2 >= -1 && x + w / 2 <= 391, 'nothing is cut off');
  await page.mouse.up();

  // a second, separate drag
  p = await edge();
  await page.mouse.move(bb.x + p.x, bb.y + p.y);
  await page.mouse.down();
  await page.mouse.move(bb.x + p.x + 420, bb.y + p.y, { steps: 12 });
  await page.mouse.up();
  assert.deepEqual(await geometry(), original);

  await page.evaluate(() => { document.activeElement?.blur(); jspenApp.doc.undo(); });
  assert.equal((await geometry()).W, 390, 'each drag is one undo step');
  await page.evaluate(() => jspenApp.setCanvasSize(1440, jspenApp.doc.height, 'reflow'));
  assert.deepEqual(await geometry(), original, 'lossless after undo and through the width field too');
});

test('website with modules: resizing moves sprites without restarting them; animations follow', async () => {
  const html = await websiteOf({ name: 'live', width: 1000, height: 400, layers: [{ name: 'L', sprites: [
    { id: 'spin', type: 'rect', x: 300, y: 150, width: 100, height: 100, modules: [{ id: 'm', type: 'orbit_spin', name: 'spin', enabled: true, params: { speedDegPerSec: 90 } }] },
    { id: 'slide', type: 'rect', x: 500, y: 320, width: 80, height: 60, keyframes: { x: [{ frame: 0, value: 500 }, { frame: 1, value: 500 }] } }
  ] }] });
  await withPage(html, 1000, async q => {
    await q.waitForTimeout(600);
    const t0 = await q.evaluate(() => JSPenWebRuntime.engine.bus.time);
    await resize(q, 1400);
    await q.waitForTimeout(150);
    const r = await q.evaluate(() => {
      const at = id => { const b = document.querySelector(`[data-sid="${id}"]`).getBoundingClientRect(); return Math.round(b.left + b.width / 2); };
      return { t: JSPenWebRuntime.engine.bus.time, spin: at('spin'), slide: at('slide'), width: JSPenWebRuntime.model.width };
    });
    assert.ok(r.t > t0, 'the engine was not restarted');
    assert.equal(r.width, 1400);
    assert.ok(Math.abs(r.slide - 700) <= 2, `animated sprite follows: ${r.slide}`);
    assert.ok(Math.abs(r.spin - 500) <= 3, `spinning sprite follows: ${r.spin}`);
  });
});

test('responsive views keep their own layout when the window passes back and forth', async () => {
  const html = await s.page.evaluate(d => {
    jspenApp.loadProjectFromJSON(d);
    jspenApp.setView('mobile');
    const sp = jspenApp.doc.layers[0].sprites[1];
    sp.x = 123; jspenApp.doc.saveState();
    jspenApp.setView('desktop');
    const spin = { id: 'spin', type: 'orbit_spin', name: 'spin', enabled: true, params: { speedDegPerSec: 0 } };
    jspenApp.doc.layers[0].sprites[0].modules.push(spin); // makes the page use the module engine
    return jspenApp.generateWebsiteHTML(true);
  }, read('full_landing.jspen'));
  await withPage(html, 1440, async q => {
    for (const width of [390, 1300, 500, 1440, 390]) {
      await resize(q, width);
      await q.waitForTimeout(80);
    }
    const r = await q.evaluate(() => {
      const el = document.querySelectorAll('#webArtboard [data-sid]')[1];
      return { dom: el.offsetLeft + el.offsetWidth / 2, model: JSPenWebRuntime.model.layers[0].sprites[1].x };
    });
    assert.ok(Math.abs(r.dom - 123) <= 1.5 && Math.abs(r.model - 123) <= 1, JSON.stringify(r));
  });
});

test('animations end inside each responsive view, also after passing back and forth', async () => {
  const exported = await s.page.evaluate(() => {
    jspenApp.loadProjectFromJSON({ name: 'anim', width: 1200, height: 500, fps: 60, totalFrames: 100, isLooping: false, layers: [{ name: 'L', sprites: [
      { id: 'a', type: 'rect', x: 1000, y: 250, width: 100, height: 100, fill: '#ff0000', keyframes: { x: [{ frame: 0, value: 900 }, { frame: 4, value: 1000 }] } }
    ] }] });
    jspenApp.setView('mobile');
    jspenApp.doc.layers[0].sprites[0].x = 150;
    jspenApp.doc.saveState();
    jspenApp.setView('desktop');
    return { web: jspenApp.generateWebsiteHTML(true), canvas: PhotoshopJSExporter.generateHTML(jspenApp.doc) };
  });
  for (const kind of ['web', 'canvas']) {
    await withPage(exported[kind], 390, async q => {
      for (const [width, expected] of [[390, 150], [1200, 1000], [390, 150]]) {
        await q.setViewportSize({ width, height: 800 });
        await q.waitForTimeout(700);
        const x = await q.evaluate((k) => {
          if (k === 'web') {
            const b = document.querySelector('[data-sid="a"]').getBoundingClientRect();
            return b.left + b.width / 2;
          }
          const c = document.querySelector('canvas'), px = c.getContext('2d').getImageData(0, 250, c.width, 1).data;
          let l = -1, r = -1;
          for (let i = 0; i < c.width; i++) if (px[i * 4] > 200 && px[i * 4 + 1] < 60) { if (l < 0) l = i; r = i; }
          return (l + r) / 2;
        }, kind);
        assert.ok(Math.abs(x - expected) <= 3, `${kind} at ${width}: ${x}`);
      }
    });
  }
});

test('canvas export reflows with the window and draws at 1:1', async () => {
  const html = await s.page.evaluate(d => {
    jspenApp.loadProjectFromJSON(d);
    return PhotoshopJSExporter.generateHTML(jspenApp.doc);
  }, read('full_landing.jspen'));
  await withPage(html, 1440, async q => {
    const heights = [];
    for (const width of [1440, 768, 390, 1920]) {
      await q.setViewportSize({ width, height: 800 });
      await q.waitForFunction(() => Math.abs(document.querySelector('canvas').width - document.body.clientWidth) < 1.5, null, { timeout: 5000 });
      const c = await q.evaluate(() => { const c = document.querySelector('canvas'); return { bitmap: c.width, shown: c.getBoundingClientRect().width, h: c.height }; });
      assert.ok(Math.abs(c.bitmap - c.shown) < 1.5, 'not scaled');
      heights.push(c.h);
    }
    assert.ok(heights[2] > heights[1] && heights[1] > heights[0], `taller as it narrows: ${heights}`);
  });
});

// ---------------- "화면 폭이 바뀌면": chosen places, and the width slider ----------------

test('pins: a sprite keeps the side it is pinned to, or stretches with the width (canvas and website)', async () => {
  const { page } = s;
  const project = { name: 'pins', width: 1200, height: 400, layers: [{ id: 'L', name: 'L', sprites: [
    { id: 'auto', name: 'auto', type: 'rect', x: 500, y: 60, width: 200, height: 40 },
    { id: 'left', name: 'left', type: 'rect', x: 500, y: 140, width: 200, height: 40 },
    { id: 'right', name: 'right', type: 'rect', x: 500, y: 220, width: 200, height: 40 },
    { id: 'wide', name: 'wide', type: 'rect', x: 600, y: 300, width: 1000, height: 40 }] }] };
  // chosen with the buttons in the sprite panel
  await page.evaluate(d => { jspenApp.loadProjectFromJSON(d); }, project);
  const pick = async (id, pin) => {
    await page.evaluate(i => { jspenApp.doc.selectedSpriteId = i; jspenApp.doc.selectedModuleId = null; jspenApp.refreshUI(); }, id);
    await page.locator(`.jspen-pin[data-pin="${pin}"]`).scrollIntoViewIfNeeded();
    await page.click(`.jspen-pin[data-pin="${pin}"]`);
    assert.equal(await page.getAttribute(`.jspen-pin[data-pin="${pin}"]`, 'aria-pressed'), 'true');
  };
  await pick('left', 'left'); await pick('right', 'right'); await pick('wide', 'stretch');
  const edges = () => page.evaluate(() => Object.fromEntries(jspenApp.doc.layers[0].sprites.map(p => [p.id, [+(p.x - p.width / 2).toFixed(1), +(1200 - (p.x + p.width / 2)).toFixed(1), +p.width.toFixed(1)]])));
  const before = await edges();
  await page.evaluate(() => jspenApp.setCanvasSize(1800, jspenApp.doc.height, 'reflow'));
  const wide = await page.evaluate(() => Object.fromEntries(jspenApp.doc.layers[0].sprites.map(p => [p.id, [p.x - p.width / 2, 1800 - (p.x + p.width / 2), p.width]])));
  assert.equal(wide.left[0], before.left[0], 'keeps its left margin');
  assert.equal(wide.right[1], before.right[1], 'keeps its right margin');
  assert.deepEqual([wide.wide[0], wide.wide[1], wide.wide[2]], [100, 100, 1600], 'both margins kept, wider');
  // changing a pin after resizing still lets the design come back exactly
  await page.evaluate(() => { jspenApp.doc.setPin(jspenApp.doc.findSpriteById('auto'), 'right'); jspenApp.doc.saveState(); });
  await page.evaluate(() => jspenApp.setCanvasSize(1200, jspenApp.doc.height, 'reflow'));
  assert.deepEqual(await edges(), before);
  // pins are saved with the project and drive the exported website too
  const json = await page.evaluate(() => jspenApp.doc.toJSON());
  assert.deepEqual(json.layers[0].sprites.map(p => p.pin), ['right', 'left', 'right', 'stretch']);
  const html = await page.evaluate(() => jspenApp.generateWebsiteHTML(true));
  await withPage(html, 1200, async q => {
    await resize(q, 1800);
    const r = await q.evaluate(() => Object.fromEntries([...document.querySelectorAll('[data-sid]')].map(el => {
      const b = el.getBoundingClientRect(), a = document.getElementById('webArtboard').getBoundingClientRect();
      return [el.dataset.sid, [Math.round(b.left - a.left), Math.round(a.right - b.right), Math.round(b.width)]];
    })));
    assert.deepEqual(r.left[0], before.left[0]);
    assert.deepEqual(r.right[1], before.right[1]);
    assert.deepEqual(r.wide, [100, 100, 1600]);
  });
  // an unknown value in a file is dropped
  const cleaned = await page.evaluate(() => { jspenApp.loadProjectFromJSON({ name: 'x', width: 400, height: 300, layers: [{ name: 'L', sprites: [{ id: 'a', type: 'rect', x: 1, y: 1, width: 5, height: 5, pin: '<img>' }] }] }); return jspenApp.doc.findSpriteById('a').pin; });
  assert.equal(cleaned, undefined);
});

test('canvas: the width slider reflows live; letting go is one undo step and sliding back is exact', async () => {
  const { page } = s;
  await page.evaluate(d => {
    jspenApp.loadProjectFromJSON(d);
    jspenApp.doc.selectedSpriteId = null; jspenApp.doc.selectedLayerId = null; jspenApp.refreshUI();
  }, read('full_landing.jspen'));
  const geometry = () => page.evaluate(() => ({ W: jspenApp.doc.width, H: jspenApp.doc.height,
    boxes: jspenApp.doc.layers.flatMap(l => l.sprites.map(p => [p.x, p.y, p.width, p.height])) }));
  const original = await geometry();
  await page.waitForSelector('#inpScreenWidth');
  const slide = (w) => page.$eval('#inpScreenWidth', (el, w) => {
    el.value = w; el.dispatchEvent(new Event('input', { bubbles: true }));
  }, w);
  await slide(900); await slide(600); await slide(390);
  const during = await geometry();
  assert.equal(during.W, 390);
  assert.equal(await page.textContent('#valScreenW'), '390px');
  await page.$eval('#inpScreenWidth', el => el.dispatchEvent(new Event('change', { bubbles: true })));
  await slide(1000); await slide(original.W);
  await page.$eval('#inpScreenWidth', el => el.dispatchEvent(new Event('change', { bubbles: true })));
  assert.deepEqual(await geometry(), original);
  await page.evaluate(() => { document.activeElement?.blur(); jspenApp.doc.undo(); });
  assert.equal((await geometry()).W, 390, 'each slide is one undo step');
});
