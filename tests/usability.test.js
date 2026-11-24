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

test('text colour: a label\'s colour reaches the exported website; a text sprite calls its colour "글자 색상"', async () => {
  const { page } = s;
  await page.evaluate(() => {
    jspenApp.loadProjectFromJSON({ name: 't', width: 800, height: 600, layers: [{ id: 'L', name: 'L', sprites: [
      { id: 'lab', name: 'lab', type: 'rect', x: 200, y: 200, width: 300, height: 120, fill: '#000000',
        modules: [{ id: 'tl', type: 'text_label', name: '텍스트', enabled: true, params: { text: '안녕', fontSize: 40, color: '#ffffff' } }] },
      { id: 'txt', name: 'txt', type: 'text', x: 600, y: 400, width: 300, height: 120, text: '글자', fontSize: 40, fill: '#ffffff' }] }] });
    jspenApp.doc.selectedSpriteId = 'lab'; jspenApp.doc.selectedModuleId = 'tl'; jspenApp.refreshUI();
  });
  await page.$eval('[data-param-key="color"]', el => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  const html = await page.evaluate(() => jspenApp.generateWebsiteHTML(true));
  const q = await s.browser.newPage({ viewport: { width: 800, height: 600 } });
  await q.setContent(html);
  assert.equal(await q.$eval('[data-sid="lab"]', e => getComputedStyle(e).color), 'rgb(255, 0, 0)');
  await q.close();
  await page.evaluate(() => { jspenApp.doc.selectedSpriteId = 'txt'; jspenApp.doc.selectedModuleId = null; jspenApp.refreshUI(); });
  assert.match(await page.textContent('.ps-prop-row:has(#inpFill) .ps-prop-label'), /글자 색상/);
});

test('nodes: inputs on the left edge, outputs on the right, named for what they do; values flow along wires', async () => {
  const { page } = s;
  await page.evaluate(() => {
    const mod = (id, type, p) => ({ id, type, name: MODULE_REGISTRY[type].name, enabled: true, params: Object.assign(JSON.parse(JSON.stringify(MODULE_REGISTRY[type].defaultParams)), p || {}) });
    jspenApp.loadProjectFromJSON({ name: 'n', width: 800, height: 600, layers: [{ id: 'L', name: 'L', sprites: [{ id: 's', name: '버튼', type: 'rect', x: 400, y: 300, width: 120, height: 60,
      modules: [mod('m0', 'math_calculate', { inputA: 5, inputB: 7 }), mod('m1', 'value_remapper'), mod('m2', 'pulse_scale')] }] }] });
    jspenApp.doc.selectedSpriteId = 's'; jspenApp.refreshUI();
    if (!jspenApp.isNodeMode) jspenApp.toggleNodeMode();
  });
  await page.waitForSelector('#node_m0');
  const r = await page.evaluate(() => [...document.querySelectorAll('.graph-node')].map(n => {
    const nr = n.getBoundingClientRect(), mid = e => { const b = e.getBoundingClientRect(); return b.left + b.width / 2; };
    return { id: n.id, ins: [...n.querySelectorAll('.graph-port-input')].map(e => Math.round(mid(e) - nr.left)),
      outs: [...n.querySelectorAll('.graph-port-output')].map(e => Math.round(mid(e) - nr.right)),
      outLabels: [...n.querySelectorAll('.graph-outputs .graph-port-label')].map(e => e.textContent.trim()),
      settings: [...n.querySelectorAll('.node-inline-label')].map(e => e.textContent.trim()) };
  }));
  for (const n of r) {
    assert.ok(new Set(n.ins).size <= 1, `${n.id}: every input on one edge ${n.ins}`);
    assert.ok(new Set(n.outs).size <= 1, `${n.id}: every output on one edge ${n.outs}`);
    for (const l of n.outLabels) assert.ok(!/^(Out|Result|Transform|Visual|Flow)$/.test(l), `${n.id}: "${l}"`);
  }
  const math = r.find(n => n.id === 'node_m0'), remap = r.find(n => n.id === 'node_m1');
  assert.ok(math.outLabels.includes('값 = 12'), math.outLabels.join());
  assert.deepEqual(math.settings.slice(0, 3), ['연산:', '값 A', '값 B']);
  assert.ok(!remap.settings.includes('연산:'), 'not a math node: ' + remap.settings.join());
  assert.ok(remap.settings.includes('입력 최소'), remap.settings.join());
  // a wire from the math value into a setting sets that setting
  const speed = await page.evaluate(() => {
    const ne = jspenApp.nodeEditor;
    ne.wires.push({ id: 'wv', fromNode: 'node_m0', fromPort: 'Result', toNode: 'node_m2', toPort: 'param_speed' });
    ne.render();
    return jspenApp.doc.findSpriteById('s').modules[2].params.speed;
  });
  assert.equal(speed, 12);
  // changing a value on the node is one undo step
  await page.fill('#node_m0 [data-node-ctrl="inputA"]', '10');
  await page.press('#node_m0 [data-node-ctrl="inputA"]', 'Tab');
  assert.equal(await page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.inputA), 10);
  const outs = await page.textContent('#node_m0 .graph-outputs');
  assert.ok(outs.includes('값 = 17'), outs);
  await page.evaluate(() => { jspenApp.doc.undo(); jspenApp.refreshUI(); });
  assert.equal(await page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.inputA), 5);
  await page.evaluate(() => jspenApp.toggleNodeMode());
});
