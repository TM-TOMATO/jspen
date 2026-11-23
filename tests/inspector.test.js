// Module settings are set with controls (Blender-style), never by typing code-like values.
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

// Text a person writes (messages, links, names). Everything else is chosen.
// Signal and variable names are picked from lists (with "+ 새 … 만들기"), so they are not here;
// signalPrefix names a series (step_1, step_2, ...).
const FREE_TEXT = new Set(['text', 'url', 'audioUrl', 'anchorId', 'customClass', 'subject', 'successMessage', 'errorMessage',
  'prefix', 'suffix', 'cursor', 'signalPrefix']);
const COLORS = ['particleColor', 'hoverFill', 'pressFill', 'hoverStroke', 'hoverTextColor', 'color'];

function load(type, params) {
  return s.page.evaluate(([type, params]) => {
    const def = MODULE_REGISTRY[type];
    jspenApp.loadProjectFromJSON({ name: 'm', width: 800, height: 600, layers: [
      { id: 'L1', name: '배경 레이어', sprites: [{ id: 'other', name: '다른 것', type: 'rect', x: 100, y: 100, width: 50, height: 50 }] },
      { id: 'L2', name: 'L', sprites: [{ id: 's', name: 'S', type: 'rect', x: 400, y: 300, width: 100, height: 80,
        modules: [{ id: 'm', type, name: def.name, enabled: true, params: params || JSON.parse(JSON.stringify(def.defaultParams || {})) }] }] }] });
    jspenApp.doc.selectedSpriteId = 's';
    jspenApp.doc.selectedModuleId = 'm';
    jspenApp.inspector.render();
  }, [type, params || null]);
}

test('every module panel: readable labels and a control that fits each setting', async () => {
  const types = await s.page.evaluate(() => Object.keys(MODULE_REGISTRY));
  const problems = [];
  for (const type of types) {
    await load(type);
    const fields = await s.page.evaluate(() => [...document.querySelectorAll('#inspectorContainer [data-param-key]')].map(el => {
      const row = el.closest('.ps-prop-row');
      return { key: el.dataset.paramKey, tag: el.tagName, type: el.type, scrub: !!el.closest('.blender-scrub-group'), readOnly: !!el.readOnly,
        options: el.tagName === 'SELECT' ? [...el.options].map(o => o.textContent.trim()) : [],
        label: (row?.querySelector('.ps-prop-label')?.textContent || '').trim() };
    }));
    const value = await s.page.evaluate(() => MODULE_REGISTRY[jspenApp.doc.findSpriteById('s').modules[0].type].defaultParams);
    for (const f of fields) {
      const where = `${type}.${f.key}`;
      if (/^[a-z]+([A-Z][a-z]*)*:?$/.test(f.label) || !f.label) problems.push(`${where}: label "${f.label}"`);
      const v = value[f.key];
      if (f.tag === 'TEXTAREA' && f.key === 'code') continue;
      // on/off: a checkbox, or a list whose choices say what they do
      if (typeof v === 'boolean' && f.type !== 'checkbox' && (f.tag !== 'SELECT' || f.options.some(o => /^(true|false)$/i.test(o)))) problems.push(`${where}: on/off shown as true/false`);
      if (typeof v === 'number' && !f.scrub) problems.push(`${where}: number is not a drag field`);
      if (COLORS.includes(f.key) && f.type !== 'color') problems.push(`${where}: colour is typed`);
      if ((f.tag === 'INPUT' && f.type === 'text' && !f.readOnly || f.tag === 'TEXTAREA') && typeof v === 'string' && !FREE_TEXT.has(f.key)) problems.push(`${where}: value is typed ("${v}")`);
    }
  }
  assert.deepEqual(problems, []);
});

test('controls that the engine ignores are not shown; the ones it reads are', async () => {
  const shown = async (type) => { await load(type); return s.page.evaluate(() => [...document.querySelectorAll('#inspectorContainer [data-param-key]')].map(e => e.dataset.paramKey)); };
  const r = {
    math: await shown('math_calculate'), rainbow: await shown('rainbow_shift'), look: await shown('look_at'),
    keys: await shown('timeline_keyframes'), shake: await shown('shake_vibrate'), bounce: await shown('wall_bounce'), orbit: await shown('orbit_spin')
  };
  assert.ok(r.math.includes('targetParam') && !r.math.includes('outputProperty'), r.math.join());
  assert.ok(r.rainbow.includes('speed') && !r.rainbow.includes('cycleDuration'), r.rainbow.join());
  assert.ok(r.look.includes('targetLayerId') && !r.look.includes('targetType'), r.look.join());
  assert.deepEqual(r.keys, []);
  assert.ok(!r.shake.includes('decay') && !r.bounce.includes('elasticity') && !r.orbit.includes('radius'));
});

test('math: the chosen output is applied (it was ignored before)', async () => {
  await load('math_calculate', { condition: 'always', operation: 'add', inputA: 30, inputB: 15 });
  await s.page.selectOption('[data-param-key="targetParam"]', 'rotation');
  const r = await s.page.evaluate(() => {
    const e = jspenApp.moduleEngine;
    e.start(); e.update(0.016, { x: -1e9, y: -1e9 }, { x: 0, y: 0 }, false, false, null);
    const rot = jspenApp.doc.findSpriteById('s').runtime.rotation;
    e.stop();
    return rot;
  });
  assert.equal(r, 45);
});

test('a key is set by pressing it', async () => {
  await load('keyboard_trigger');
  await s.page.click('[data-param-key="targetKey"]');
  await s.page.keyboard.press('KeyD');
  const r = await s.page.evaluate(() => ({ value: jspenApp.doc.findSpriteById('s').modules[0].params.targetKey,
    shown: document.querySelector('[data-param-key="targetKey"]').value }));
  assert.equal(r.value, 'KeyD');
  assert.equal(r.shown, 'D');
});

test('the look-at target is picked from the layers', async () => {
  await load('look_at');
  const options = await s.page.$$eval('[data-param-key="targetLayerId"] option', o => o.map(x => x.textContent.trim()));
  assert.ok(options.includes('배경 레이어') && options.some(t => /마우스/.test(t)), options.join());
  await s.page.selectOption('[data-param-key="targetLayerId"]', 'L1');
  assert.equal(await s.page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.targetLayerId), 'L1');
});

test('dragging a number changes it in one undo step; Shift is finer', async () => {
  await load('pulse_scale');
  await s.page.locator('[data-param-key="speed"]').scrollIntoViewIfNeeded();
  const box = await (await s.page.$('[data-param-key="speed"]')).boundingBox();
  const value = () => s.page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.speed);
  const steps = () => s.page.evaluate(() => jspenApp.doc.history.length);
  const before = await steps();
  await s.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await s.page.mouse.down();
  await s.page.mouse.move(box.x + box.width / 2 + 40, box.y + box.height / 2, { steps: 8 });
  await s.page.mouse.up();
  const dragged = await value();
  assert.ok(dragged > 2, `value grew: ${dragged}`);
  assert.equal(await steps(), before + 1, 'one undo step for the whole drag');
  await s.page.locator('[data-param-key="speed"]').scrollIntoViewIfNeeded();
  const field = await (await s.page.$('[data-param-key="speed"]')).boundingBox();
  await s.page.keyboard.down('Shift');
  await s.page.mouse.move(field.x + field.width / 2, field.y + field.height / 2);
  await s.page.mouse.down();
  await s.page.mouse.move(field.x + field.width / 2 + 40, field.y + field.height / 2, { steps: 8 });
  await s.page.mouse.up();
  await s.page.keyboard.up('Shift');
  const fine = await value();
  assert.ok(fine > dragged && fine - dragged < (dragged - 2) / 3, `shift is finer: ${dragged} -> ${fine}`);
});

test('a click on a number field still lets you type a value', async () => {
  await load('pulse_scale');
  await s.page.click('[data-param-key="minScale"]'); // a click without moving: typing, not dragging
  await s.page.keyboard.press('Control+A');
  await s.page.keyboard.type('0.5');
  await s.page.keyboard.press('Enter');
  assert.equal(await s.page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.minScale), 0.5);
});

test('colours use a swatch, checkboxes switch, unknown old values are kept visible', async () => {
  await load('particle_emitter');
  await s.page.$eval('[data-param-key="particleColor"]', el => { el.value = '#ff0000'; el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); });
  assert.equal(await s.page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.particleColor), '#ff0000');

  await load('draggable');
  await s.page.check('[data-param-key="snapToGrid"]');
  assert.equal(await s.page.evaluate(() => jspenApp.doc.findSpriteById('s').modules[0].params.snapToGrid), true);

  await load('screen_trigger', { condition: 'always', triggerEvent: 'viewport_enter', action: 'trigger_module', signalName: 's' });
  assert.equal(await s.page.$eval('[data-param-key="action"]', el => el.value), 'trigger_module', 'an old value is not silently replaced');
});

test('an older file keeps behaving the same', async () => {
  // rainbow_shift files carry cycleDuration, which never did anything; the speed stays 60°/s.
  await load('rainbow_shift', { condition: 'always', cycleDuration: 3 });
  const r = await s.page.evaluate(() => {
    const e = jspenApp.moduleEngine, sp = jspenApp.doc.findSpriteById('s');
    e.start(); e.update(0.5, { x: -1e9, y: -1e9 }, { x: 0, y: 0 }, false, false, null);
    const hue = sp.filters.hueRotate;
    e.stop();
    return { hue, shown: document.querySelector('[data-param-key="speed"]').value };
  });
  assert.equal(r.hue, 30);
  assert.equal(r.shown, '60');
});
