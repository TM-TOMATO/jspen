// The tutorial, the link module's wording and long names in the inspector.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server;
before(async () => { server = await startServer(); });
after(async () => { if (server) await server.stop(); });

async function studio(fn) {
  const s = await openStudio(server.url);
  try { await fn(s); } finally { await s.browser.close(); }
}

const card = page => page.evaluate(() => {
  const c = document.querySelector('.jspen-tutorial-card');
  return c && !document.querySelector('.jspen-tutorial').classList.contains('is-covered')
    ? { title: c.querySelector('.jspen-tutorial-title').textContent, progress: c.querySelector('.jspen-tutorial-progress').textContent } : null;
});

test('a first visit offers the tutorial once; it can be declined', async () => {
  await studio(async ({ page }) => {
    await page.waitForSelector('.jspen-tutorial-offer', { timeout: 4000 });
    await page.click('[data-offer="no"]');
    await page.reload();
    await page.waitForFunction(() => window.jspenApp?.renderer);
    await page.waitForTimeout(1800);
    assert.equal(await page.$('.jspen-tutorial-offer'), null, 'not offered again');
  });
});

test('the tutorial is followed by doing the steps, with the studio usable throughout', async () => {
  await studio(async ({ page }) => {
    await page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 't', width: 800, height: 600, layers: [{ name: '레이어 1', sprites: [] }] }));
    await page.hover('.ps-menu-item:has-text("도움말")');
    await page.click('#mTutorial');
    assert.equal((await card(page)).progress, '1 / 10');
    await page.click('[data-tut="next"]');
    await page.click('[data-tut="next"]');
    assert.match((await card(page)).title, /사각형/);

    // draw a rectangle on the canvas through the highlight
    await page.click('#leftToolbox [data-t="shape"]');
    const bb = await (await page.$('#viewportCanvas')).boundingBox();
    await page.mouse.move(bb.x + bb.width / 2 - 60, bb.y + bb.height / 2 - 40);
    await page.mouse.down();
    await page.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2 + 40, { steps: 6 });
    await page.mouse.up();
    await page.waitForFunction(() => /속성/.test(document.querySelector('.jspen-tutorial-title')?.textContent || ''), null, { timeout: 4000 });
    await page.click('[data-tut="next"]');

    // add a module from the library; the highlight steps aside for the dialog
    await page.click('.ps-sprite-sub-item.selected .ps-btn-add-module');
    assert.equal(await card(page), null, 'hidden while the module library is open');
    await page.click('.ps-module-card[data-key="pulse_scale"]');
    await page.waitForFunction(() => /모듈 설정/.test(document.querySelector('.jspen-tutorial-title')?.textContent || ''), null, { timeout: 4000 });
    await page.click('[data-tut="next"]');
    assert.match((await card(page)).title, /발동 조건/);
    await page.click('[data-tut="next"]');

    await page.evaluate(() => document.activeElement?.blur());
    await page.keyboard.press('Control+Space');
    await page.waitForFunction(() => /노드/.test(document.querySelector('.jspen-tutorial-title')?.textContent || ''), null, { timeout: 4000 });
    await page.keyboard.press('Escape');
    await page.click('[data-tut="next"]');
    await page.click('[data-tut="next"]');
    assert.equal(await page.$('.jspen-tutorial'), null, 'finished and removed');
    const r = await page.evaluate(() => ({ sprites: jspenApp.doc.layers[0].sprites.length, mods: jspenApp.doc.layers[0].sprites[0].modules.map(m => m.type) }));
    assert.deepEqual(r, { sprites: 1, mods: ['pulse_scale'] });
  });
});

test('the tutorial can be closed at any step', async () => {
  await studio(async ({ page }) => {
    await page.evaluate(() => jspenApp.tutorial.start());
    await page.click('[data-tut="next"]');
    await page.click('.jspen-tutorial-close');
    assert.equal(await page.$('.jspen-tutorial'), null);
  });
});

test('link module: says when it opens, and offers that choice', async () => {
  await studio(async ({ page }) => {
    await page.evaluate(() => {
      jspenApp.loadProjectFromJSON({ name: 'l', width: 800, height: 600, layers: [{ name: 'L', sprites: [{ id: 's', name: 'S', type: 'rect', x: 400, y: 300, width: 100, height: 60,
        modules: [{ id: 'm', type: 'hyperlink', name: '링크', enabled: true, params: { condition: 'always', url: 'https://example.com', trigger: 'click' } }] }] }] });
      jspenApp.doc.selectedSpriteId = 's'; jspenApp.doc.selectedModuleId = 'm'; jspenApp.inspector.render();
    });
    const text = () => page.textContent('#modCondSummary');
    assert.match(await text(), /클릭하면 이동합니다/);
    assert.match(await text(), /켜자마자 이동하지는 않습니다/);
    await page.selectOption('[data-param-key="trigger"]', 'signal');
    await page.selectOption('[data-param-key="signalName"]', '__new__');
    await page.fill('.jspen-new-name', 'go');
    await page.press('.jspen-new-name', 'Enter');
    assert.match(await text(), /'go' 신호를 받으면 이동합니다/);
  });
});

test('long names stay inside the inspector', async () => {
  await studio(async ({ page }) => {
    const r = await page.evaluate(() => {
      const name = '상단 네비게이션 무료 시작하기 버튼 스프라이트 이름이 아주 깁니다';
      jspenApp.loadProjectFromJSON({ name: 'n', width: 800, height: 600, layers: [{ name: '아주 긴 레이어 이름이 들어가는 섹션 레이어입니다', sprites: [{ id: 's', name, type: 'rect', x: 400, y: 300, width: 100, height: 60,
        modules: [{ id: 'm', type: 'pulse_scale', name: '펄스', enabled: true, params: {} }] }] }] });
      jspenApp.doc.selectedSpriteId = 's';
      const out = {};
      for (const mod of [null, 'm']) {
        jspenApp.doc.selectedModuleId = mod; jspenApp.inspector.render();
        const panel = document.querySelector('#inspectorContainer .ps-insp-scroll-area').getBoundingClientRect();
        out[mod || 'sprite'] = [...document.querySelectorAll('#inspectorContainer .ps-val-name')].map(t => {
          const b = t.getBoundingClientRect();
          return { inside: b.left >= panel.left - 0.5 && b.right <= panel.right + 0.5, title: t.title };
        });
      }
      return out;
    });
    assert.ok(r.sprite.length && r.m.length);
    for (const t of [...r.sprite, ...r.m]) assert.ok(t.inside && t.title.length > 10, JSON.stringify(t));
  });
});
