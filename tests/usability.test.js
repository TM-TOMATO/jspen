// Fixes from tester feedback: panning with Space, readable menus and tooltips,
// module library tabs, corner controls, and the tutorial's highlights.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url, { width: 1280, height: 760 }); });
after(async () => {
  if (s) await s.browser.close();
  if (server) await server.stop();
});

const reset = () => s.page.evaluate(() => {
  document.querySelectorAll('.jspen-tutorial-offer, .modal-overlay').forEach(e => e.remove());
  if (jspenApp.tutorial.running) jspenApp.tutorial.stop();
  jspenApp.loadProjectFromJSON({ name: 'u', width: 800, height: 600, layers: [{ id: 'L', name: 'L', sprites: [
    { id: 's', name: '사각형 스프라이트', type: 'rect', x: 400, y: 300, width: 120, height: 80, fill: '#38bdf8' }] }] });
  jspenApp.doc.selectedSpriteId = 's';
  jspenApp.tools.setTool('move');
  jspenApp.refreshUI();
});

// WCAG contrast of two CSS colours ("rgb(r, g, b)").
function contrast(a, b) {
  const lum = c => {
    const v = c.match(/\d+(\.\d+)?/g).slice(0, 3).map(n => Number(n) / 255).map(x => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
    return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2];
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

test('Space: held while dragging pans the canvas; a tap plays and pauses the timeline', async () => {
  const { page } = s;
  await reset();
  await page.evaluate(() => document.activeElement?.blur());
  const state = () => page.evaluate(() => ({ playing: !!jspenApp.doc.isPlaying, panX: jspenApp.renderer.panX, x: jspenApp.doc.findSpriteById('s').x }));
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  const before = await state();
  await page.keyboard.down('Space');
  await page.mouse.move(bb.x + 200, bb.y + 200);
  await page.mouse.down();
  await page.mouse.move(bb.x + 280, bb.y + 230, { steps: 5 });
  await page.mouse.up();
  await page.keyboard.up('Space');
  const dragged = await state();
  assert.equal(Math.round(dragged.panX - before.panX), 80, 'the view moved with the pointer');
  assert.equal(dragged.playing, false, 'dragging does not start playback');
  assert.equal(dragged.x, before.x, 'nothing on the canvas moved');
  await page.keyboard.press('Space');
  assert.equal((await state()).playing, true);
  await page.keyboard.press('Space');
  assert.equal((await state()).playing, false);
});

test('menus: the item under the pointer stays readable', async () => {
  const { page } = s;
  await reset();
  await page.click('.ps-menu-item >> text=파일(F)');
  await page.hover('#mImportImage');
  await page.waitForTimeout(150);
  const c = await page.$eval('#mImportImage', el => { const st = getComputedStyle(el); return [st.color, st.backgroundColor]; });
  assert.ok(contrast(c[0], c[1]) >= 4.5, `${c[0]} on ${c[1]}`);
  await page.keyboard.press('Escape');
  await page.mouse.click(5, 740);
});

test('tooltips: hovering an icon shows its name at once, readable, and puts the title back', async () => {
  const { page } = s;
  await reset();
  const btn = '#leftToolbox [data-t="brush"]';
  await page.hover(btn);
  await page.waitForSelector('.jspen-tip.is-on', { timeout: 2000 });
  const tip = await page.$eval('.jspen-tip', el => { const st = getComputedStyle(el); const r = el.getBoundingClientRect();
    return { text: el.textContent, color: st.color, bg: st.backgroundColor, inside: r.left >= 0 && r.top >= 0 && r.right <= innerWidth && r.bottom <= innerHeight }; });
  assert.equal(tip.text, '브러시 도구 (B)');
  assert.ok(tip.inside);
  assert.ok(contrast(tip.color, tip.bg) >= 4.5, `${tip.color} on ${tip.bg}`);
  assert.equal(await page.getAttribute(btn, 'title'), null, 'no second, native tooltip on top');
  await page.mouse.move(640, 400);
  await page.waitForSelector('.jspen-tip:not(.is-on)', { state: 'attached' });
  assert.equal(await page.getAttribute(btn, 'title'), '브러시 도구 (B)');
});

test('module library: every category tab is shown whole', async () => {
  const { page } = s;
  await reset();
  await page.evaluate(() => jspenApp.layersUI.showModuleLibraryModal(jspenApp.doc.findSpriteById('s')));
  const tabs = await page.$$eval('.mod-category-tab', els => {
    const row = els[0].parentElement.getBoundingClientRect();
    return els.map(el => { const r = el.getBoundingClientRect();
      return { t: el.textContent.trim(), whole: r.top >= row.top - 0.5 && r.bottom <= row.bottom + 0.5 && el.scrollHeight <= el.clientHeight + 1 && r.height >= 20 }; });
  });
  assert.deepEqual(tabs.filter(t => !t.whole), []);
  await page.evaluate(() => document.querySelectorAll('.modal-overlay').forEach(m => m.remove()));
});

test('corners: rounding and bevel are two different controls', async () => {
  const { page } = s;
  await reset();
  const set = async (id, v) => {
    await page.locator('#' + id).scrollIntoViewIfNeeded();
    await page.fill('#' + id, String(v));
    await page.press('#' + id, 'Enter');
  };
  await set('inpCornerRadius', 12);
  await set('inpBevel', 20);
  const sp = await page.evaluate(() => { const p = jspenApp.doc.findSpriteById('s'); return [p.cornerRadius, p.bevel]; });
  assert.deepEqual(sp, [12, 20]);
  assert.equal(await page.inputValue('#inpCornerRadius'), '12', 'changing one leaves the other alone');
});

test('tutorial: the trigger step shows the module\'s trigger box, and the last step frames the menu bar', async () => {
  const { page } = s;
  await reset();
  // a module was added in the step before, then the sprite (not the module) got selected
  await page.evaluate(() => {
    const sp = jspenApp.doc.findSpriteById('s');
    sp.modules = [{ id: 'm1', type: 'pulse_scale', name: '펄스', enabled: true, params: JSON.parse(JSON.stringify(MODULE_REGISTRY.pulse_scale.defaultParams)) }];
    jspenApp.doc.selectedSpriteId = 's'; jspenApp.doc.selectedModuleId = null; jspenApp.refreshUI();
    jspenApp.tutorial.start();
    jspenApp.tutorial.go(6);
  });
  await page.waitForTimeout(400);
  const spotOn = sel => page.evaluate(sel => {
    const t = document.querySelector(sel), spot = document.querySelector('.jspen-tutorial-spot');
    if (!t || getComputedStyle(spot).display === 'none') return false;
    const a = t.getBoundingClientRect(), b = spot.getBoundingClientRect();
    // the frame is drawn around the target, and the target is not hidden behind anything
    const c = document.elementFromPoint(Math.max(1, a.left + 4), Math.max(1, a.top + 4));
    const shown = a.top >= 0 && a.bottom <= innerHeight && (t.contains(c) || c === t);
    return shown && b.left <= a.left + 7 && b.right >= a.right - 7 && b.top <= Math.max(2, a.top) && b.bottom >= a.bottom - 7;
  }, sel);
  assert.equal(await page.textContent('.jspen-tutorial-title'), '언제 움직일까: 발동 조건');
  assert.ok(await spotOn('#modCondSection'), 'trigger box framed and in view');
  await page.evaluate(() => jspenApp.tutorial.go(9));
  await page.waitForTimeout(300);
  const top = await page.evaluate(() => {
    const spot = document.querySelector('.jspen-tutorial-spot'), bar = document.querySelector('#topMenuBar .ps-menu-items');
    const z = el => Number(getComputedStyle(el).zIndex) || 0;
    const b = spot.getBoundingClientRect(), r = bar.getBoundingClientRect();
    return { above: z(document.querySelector('.jspen-tutorial')) > z(document.querySelector('#topMenuBar')), framed: b.top >= 0 && b.left <= r.left && b.right >= r.right };
  });
  assert.deepEqual(top, { above: true, framed: true });
  await page.evaluate(() => jspenApp.tutorial.stop());
  assert.deepEqual(s.errors, []);
});
