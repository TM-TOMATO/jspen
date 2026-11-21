// Forms: insertion, live inputs in the studio preview, validation, submit (mailto / POST),
// and the same in the JS and website exports.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startServer, openStudio } = require('./helpers');

let server, s;
before(async () => { server = await startServer(); s = await openStudio(server.url); });
after(async () => { await s.browser.close(); await server.stop(); });

const insertContactForm = async (submitParams) => {
  await s.page.evaluate(() => jspenApp.loadProjectFromJSON({ name: 'form', width: 800, height: 600, transparentBackground: false, backgroundColor: '#111111', layers: [{ name: 'L', sprites: [] }] }));
  await s.page.evaluate(() => { const r = jspenApp.renderer; r.zoom = 1; r.panX = 0; r.panY = 0; });
  await s.page.evaluate(() => document.querySelector('[data-form-kind="contact"]').click());
  await s.page.evaluate((p) => {
    const btn = jspenApp.doc.layers[0].sprites.find(x => x.name === '전송 버튼');
    Object.assign(btn.modules.find(m => m.type === 'form_submit').params, p);
  }, submitParams);
};

test('contact form: inserted into the current layer, drawn on the canvas', async () => {
  await insertContactForm({});
  const r = await s.page.evaluate(() => ({
    layers: jspenApp.doc.layers.length,
    kinds: jspenApp.doc.layers[0].sprites.filter(x => x.type === 'form_field').map(x => x.form.kind),
    saved: JSON.parse(JSON.stringify(jspenApp.doc.toJSON())).layers[0].sprites.filter(x => x.type === 'form_field').map(x => x.form.name)
  }));
  assert.equal(r.layers, 1);
  assert.deepEqual(r.kinds, ['text', 'email', 'textarea']);
  assert.deepEqual(r.saved, ['name', 'email', 'message'], 'form settings are saved');
});

test('studio preview: real inputs, validation, submit with a signal and a message', async () => {
  const { page } = s;
  await insertContactForm({ action: 'signal' });
  await page.keyboard.press('Control+Space');
  await page.waitForFunction(() => document.querySelectorAll('.jspen-form-overlay').length === 3);
  await page.fill('.jspen-form-overlay input[name="name"]', '홍길동');
  await page.fill('.jspen-form-overlay input[name="email"]', 'not-an-email');
  await page.fill('.jspen-form-overlay textarea[name="message"]', '안녕하세요');
  assert.equal(await page.evaluate(() => jspenApp.moduleEngine.bus.vars.get('form.name')), '홍길동');
  const btn = await page.evaluate(() => { const b = jspenApp.doc.layers[0].sprites.find(x => x.name === '전송 버튼'); const p = jspenApp.renderer.worldToScreen(b.x, b.y); return p; });
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  const msg = () => page.evaluate(() => jspenApp.doc.layers[0].sprites.find(x => x.name === '폼 결과 문구').text);
  await page.mouse.click(bb.x + btn.x, bb.y + btn.y); await page.waitForTimeout(150);
  assert.equal(await msg(), '', 'invalid email blocks the submit');
  await page.fill('.jspen-form-overlay input[name="email"]', 'hong@example.com');
  await page.mouse.click(bb.x + btn.x, bb.y + btn.y); await page.waitForTimeout(150);
  assert.equal(await msg(), '전송되었습니다. 감사합니다!');
  assert.equal(await page.inputValue('.jspen-form-overlay input[name="name"]'), '', 'reset after success');
  await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.querySelectorAll('.jspen-form-overlay').length), 0, 'overlays removed');
});

test('exports: JS canvas and website forms POST the values', async () => {
  const { page, context } = s;
  await insertContactForm({ action: 'post', url: 'https://forms.example.test/submit', encoding: 'json' });
  for (const kind of ['js', 'web']) {
    const html = await page.evaluate((k) => k === 'js' ? PhotoshopJSExporter.generateHTML(jspenApp.doc) : jspenApp.generateWebsiteHTML(true), kind);
    const q = await context.newPage();
    await q.setViewportSize({ width: 800, height: 600 });
    const posted = [];
    await q.route('https://forms.example.test/submit', async route => { posted.push(route.request().postDataJSON()); await route.fulfill({ status: 200, body: 'ok' }); });
    await q.setContent(html);
    const sel = (n) => `[name="${n}"]`;
    await q.waitForSelector(sel('name'));
    await q.fill(sel('name'), '김철수');
    await q.fill(sel('email'), 'kim@example.com');
    await q.fill(sel('message'), '견적 부탁드립니다');
    // click the submit button (document coords -> page)
    const target = kind === 'js' ? 'canvas' : '#webArtboard';
    const tb = await (await q.$(target)).boundingBox();
    const k = tb.width / 800;
    const btn = await page.evaluate(() => { const b = jspenApp.doc.layers[0].sprites.find(x => x.name === '전송 버튼'); return { x: b.x, y: b.y }; });
    await q.mouse.click(tb.x + btn.x * k, tb.y + btn.y * k);
    await q.waitForTimeout(500);
    await q.close();
    assert.deepEqual(posted, [{ name: '김철수', email: 'kim@example.com', message: '견적 부탁드립니다' }], kind);
  }
});

test('mailto submit opens the mail app with the field values', async () => {
  const { page } = s;
  await insertContactForm({ action: 'mailto', url: 'hello@example.com', subject: '문의' });
  await page.keyboard.press('Control+Space');
  await page.waitForFunction(() => document.querySelectorAll('.jspen-form-overlay').length === 3);
  await page.evaluate(() => { window.__nav = null; jspenApp.moduleEngine.navigateHyperlink = (h) => { window.__nav = h; }; });
  await page.fill('.jspen-form-overlay input[name="name"]', 'A');
  await page.fill('.jspen-form-overlay input[name="email"]', 'a@b.co');
  await page.fill('.jspen-form-overlay textarea[name="message"]', 'hi');
  const btn = await page.evaluate(() => { const b = jspenApp.doc.layers[0].sprites.find(x => x.name === '전송 버튼'); return jspenApp.renderer.worldToScreen(b.x, b.y); });
  const bb = await (await page.$('#viewportCanvas')).boundingBox();
  await page.mouse.click(bb.x + btn.x, bb.y + btn.y);
  await page.waitForFunction(() => !!window.__nav);
  const nav = await page.evaluate(() => window.__nav);
  await page.keyboard.press('Escape');
  assert.ok(nav.startsWith('mailto:hello@example.com?subject=%EB%AC%B8%EC%9D%98&body='), nav);
  assert.ok(decodeURIComponent(nav).includes('email: a@b.co'));
});
