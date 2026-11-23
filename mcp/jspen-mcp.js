#!/usr/bin/env node
// JSPen MCP server: lets an AI assistant (e.g. Claude Code) open the studio in a
// real browser and test it - load projects, read the document, click and type,
// run the live preview, export, and take screenshots.
//
// Model Context Protocol over stdio (JSON-RPC 2.0, one message per line); no
// dependencies beyond Playwright, which the test suite already uses.
// Registered for Claude Code in the project's .mcp.json.
'use strict';

const { spawn } = require('node:child_process');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const ROOT = path.resolve(__dirname, '..');
const VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version || '0.0.0';

// ---------------------------------------------------------------- studio host
const state = { server: null, url: '', browser: null, page: null, errors: [], console: [] };

function waitForServer(url, ms = 15000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const once = () => http.get(url, r => { r.resume(); resolve(); }).on('error', () => {
      if (Date.now() - t0 > ms) reject(new Error('JSPen 서버가 시작되지 않았습니다: ' + url)); else setTimeout(once, 150);
    });
    once();
  });
}

async function startServer() {
  if (state.server) return;
  const port = 41000 + Math.floor(Math.random() * 9000);
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    cwd: ROOT, env: Object.assign({}, process.env, { PORT: String(port), JSPEN_NO_OPEN: '1' }), stdio: ['ignore', 'ignore', 'pipe']
  });
  child.stderr.on('data', () => {});
  state.server = child;
  state.url = `http://127.0.0.1:${port}`;
  await waitForServer(state.url + '/');
}

// Playwright's own Chromium if installed, otherwise the installed Chrome or Edge.
async function launchBrowser(headed) {
  const { chromium } = require('playwright');
  const tries = [process.env.JSPEN_MCP_CHANNEL, undefined, 'chrome', 'msedge'].filter((c, i, a) => a.indexOf(c) === i);
  let last;
  for (const channel of tries) {
    if (channel === '') continue;
    try { return await chromium.launch(Object.assign({ headless: !headed }, channel ? { channel } : {})); } catch (e) { last = e; }
  }
  throw new Error('브라우저를 열 수 없습니다 (Playwright Chromium, Chrome, Edge 모두 실패): ' + (last && last.message));
}

async function open({ headed = false, width = 1440, height = 900 } = {}) {
  if (state.page && !state.page.isClosed()) return describeHost();
  await startServer();
  state.browser = await launchBrowser(headed);
  const context = await state.browser.newContext({ viewport: { width, height }, acceptDownloads: true });
  state.page = await context.newPage();
  state.errors = []; state.console = [];
  state.page.on('pageerror', e => state.errors.push(e.message));
  state.page.on('console', m => { if (m.type() === 'error' || m.type() === 'warning') state.console.push(`[${m.type()}] ${m.text()}`); if (state.console.length > 200) state.console.shift(); });
  await state.page.goto(state.url + '/');
  await state.page.waitForFunction(() => window.jspenApp && window.jspenApp.doc, null, { timeout: 20000 });
  // The first-visit tutorial offer would cover part of the screen.
  await state.page.evaluate(() => { try { localStorage.setItem('jspen.tutorial', 'seen'); } catch (e) {} document.querySelectorAll('.jspen-tutorial-offer').forEach(e => e.remove()); });
  return describeHost();
}

function describeHost() {
  return { url: state.url, page: !!state.page, size: state.page ? state.page.viewportSize() : null };
}

async function page() {
  if (!state.page || state.page.isClosed()) await open();
  return state.page;
}

async function close() {
  if (state.browser) await state.browser.close().catch(() => {});
  if (state.server && state.server.exitCode === null) state.server.kill();
  state.browser = state.page = state.server = null;
  return { closed: true };
}

// ---------------------------------------------------------------- tools
const text = v => ({ content: [{ type: 'text', text: typeof v === 'string' ? v : JSON.stringify(v, null, 2) }] });
const image = (buf, note) => ({ content: [...(note ? [{ type: 'text', text: note }] : []), { type: 'image', data: buf.toString('base64'), mimeType: 'image/png' }] });

const SUMMARY = () => {
  const app = window.jspenApp, d = app.doc;
  return {
    name: d.name, width: d.width, height: d.height, view: d.activeView || 'desktop', dirty: app.isDirty(),
    preview: !!app.moduleEngine.active, nodeMode: !!app.isNodeMode,
    selected: { sprite: d.selectedSpriteId || null, module: d.selectedModuleId || null },
    layers: d.layers.map(l => ({ id: l.id, name: l.name, visible: l.visible !== false,
      modules: (l.modules || []).map(m => ({ id: m.id, type: m.type, name: m.name })),
      sprites: l.sprites.map(sp => ({ id: sp.id, name: sp.name, type: sp.type, x: Math.round(sp.x), y: Math.round(sp.y), w: Math.round(sp.width), h: Math.round(sp.height),
        text: sp.text || undefined, fill: sp.fill, pin: sp.pin,
        modules: (sp.modules || []).map(m => ({ id: m.id, type: m.type, name: m.name, enabled: m.enabled !== false, condition: (m.params || {}).condition })) })) }))
  };
};

const TOOLS = [
  { name: 'jspen_open', description: 'JSPen 스튜디오를 브라우저로 엽니다 (이미 열려 있으면 그대로). headed: true면 화면에 창을 띄웁니다.',
    inputSchema: { type: 'object', properties: { headed: { type: 'boolean' }, width: { type: 'number' }, height: { type: 'number' } } },
    run: async a => text(await open(a)) },
  { name: 'jspen_close', description: '브라우저와 JSPen 서버를 닫습니다.', inputSchema: { type: 'object', properties: {} }, run: async () => text(await close()) },
  { name: 'jspen_load', description: '프로젝트를 엽니다: templates/ 폴더의 템플릿 이름(예: "hero.jspen"), 프로젝트 JSON(객체나 문자열), 또는 빈 문서(new: true).',
    inputSchema: { type: 'object', properties: { template: { type: 'string' }, project: {}, new: { type: 'boolean' } } },
    run: async a => {
      const p = await page();
      let data = a.project;
      if (a.template) {
        const f = path.join(ROOT, 'templates', path.basename(a.template));
        if (!fs.existsSync(f)) throw new Error('템플릿이 없습니다: ' + a.template + ' (있는 것: ' + fs.readdirSync(path.join(ROOT, 'templates')).filter(x => x.endsWith('.jspen')).join(', ') + ')');
        data = fs.readFileSync(f, 'utf8');
      }
      if (a.new) data = { name: '새 문서', width: 1440, height: 900, layers: [{ name: '레이어 1', sprites: [] }] };
      if (data === undefined) throw new Error('template, project 또는 new 중 하나가 필요합니다.');
      const ok = await p.evaluate(d => { const r = window.jspenApp.loadProjectFromJSON(d); window.jspenApp.doc.markSaved && window.jspenApp.doc.markSaved(); return r !== false; }, typeof data === 'string' ? data : JSON.stringify(data));
      if (!ok) throw new Error('프로젝트를 불러오지 못했습니다.');
      // A short overview; jspen_state has every sprite and module.
      return text(await p.evaluate(() => {
        const d = window.jspenApp.doc;
        return { name: d.name, width: d.width, height: d.height, view: d.activeView || 'desktop', dirty: window.jspenApp.isDirty(),
          layers: d.layers.map(l => ({ id: l.id, name: l.name,
            sprites: l.sprites.map(sp => ({ id: sp.id, name: sp.name, type: sp.type, modules: (sp.modules || []).length })) })),
          hint: '위치·크기·모듈 세부는 jspen_state로 봅니다.' };
      }));
    } },
  { name: 'jspen_state', description: '현재 문서 요약: 레이어, 스프라이트(위치·크기), 모듈, 선택, 미리보기 상태, 저장 안 된 변경.',
    inputSchema: { type: 'object', properties: { full: { type: 'boolean', description: 'true면 프로젝트 JSON 전체' } } },
    run: async a => { const p = await page(); return text(a.full ? await p.evaluate(() => window.jspenApp.doc.toJSON()) : await p.evaluate(SUMMARY)); } },
  { name: 'jspen_eval', description: '스튜디오 페이지에서 자바스크립트를 실행하고 결과(JSON)를 돌려줍니다. window.jspenApp(앱), jspenApp.doc(문서), jspenApp.moduleEngine(모듈 엔진), MODULE_REGISTRY 등을 쓸 수 있습니다. 마지막 식의 값이 결과이며 await를 쓸 수 있습니다.',
    inputSchema: { type: 'object', properties: { code: { type: 'string' } }, required: ['code'] },
    run: async a => {
      const p = await page();
      const result = await p.evaluate(async code => {
        // Accept a single expression, or statements whose last line is the
        // result (or that `return` it). A `return` inside a nested function
        // no longer changes how the code is read.
        const make = body => new Function('return (async () => {\n' + body + '\n})()'); // eslint-disable-line no-new-func
        const lines = code.replace(/\s+$/, '').split('\n');
        const lastLine = lines[lines.length - 1];
        const exprLike = !/^\s*(return\b|const\b|let\b|var\b|if\b|for\b|while\b|do\b|switch\b|try\b|function\b|class\b|throw\b|\}|\/\/)/.test(lastLine);
        const attempts = ['return (\n' + code + '\n);'];
        if (exprLike) attempts.push(lines.slice(0, -1).concat('return ' + lastLine.replace(/;\s*$/, '') + ';').join('\n'));
        attempts.push(code);
        let fn = null, err = null;
        for (const body of attempts) {
          try { fn = make(body); break; } catch (e) { if (!(e instanceof SyntaxError)) throw e; err = err || e; }
        }
        if (!fn) throw err;
        const v = await fn();
        try { return JSON.parse(JSON.stringify(v === undefined ? null : v)); } catch (e) { return String(v); }
      }, a.code);
      return text(result);
    } },
  { name: 'jspen_screenshot', description: '스크린샷: target은 "window"(기본), "canvas", "inspector", "layers", "nodes" 또는 CSS 선택자.',
    inputSchema: { type: 'object', properties: { target: { type: 'string' } } },
    run: async a => {
      const p = await page();
      const map = { canvas: '#viewportContainer', inspector: '#inspectorContainer', layers: '#layersContainer', nodes: '#nodeGraphArea' };
      const sel = !a.target || a.target === 'window' ? null : (map[a.target] || a.target);
      const buf = sel ? await p.locator(sel).first().screenshot() : await p.screenshot();
      return image(buf);
    } },
  { name: 'jspen_click', description: '클릭: selector(CSS 또는 "text=글자"), 또는 화면 좌표 x,y, 또는 문서 좌표 docX,docY(캔버스 위). button: left/right, double: true면 더블클릭.',
    inputSchema: { type: 'object', properties: { selector: { type: 'string' }, x: { type: 'number' }, y: { type: 'number' }, docX: { type: 'number' }, docY: { type: 'number' },
      button: { type: 'string', enum: ['left', 'right', 'middle'] }, double: { type: 'boolean' } } },
    run: async a => {
      const p = await page();
      const opts = { button: a.button || 'left', clickCount: a.double ? 2 : 1 };
      if (a.selector) { await p.locator(a.selector).first().click(opts); return text('clicked ' + a.selector); }
      let x = a.x, y = a.y;
      if (a.docX !== undefined) ({ x, y } = await p.evaluate(([dx, dy]) => {
        const app = window.jspenApp, r = app.canvas.getBoundingClientRect(), s = app.renderer.worldToScreen(dx, dy);
        return { x: r.left + s.x, y: r.top + s.y };
      }, [a.docX, a.docY]));
      if (x === undefined) throw new Error('selector, x/y 또는 docX/docY가 필요합니다.');
      await p.mouse.click(x, y, opts);
      return text({ clicked: { x: Math.round(x), y: Math.round(y) } });
    } },
  { name: 'jspen_drag', description: '끌기: 화면 좌표(from/to) 또는 문서 좌표(docFrom/docTo). holdKeys로 누른 채 끌 키(예: ["Space"], ["Shift"]).',
    inputSchema: { type: 'object', properties: { from: { type: 'array', items: { type: 'number' } }, to: { type: 'array', items: { type: 'number' } },
      docFrom: { type: 'array', items: { type: 'number' } }, docTo: { type: 'array', items: { type: 'number' } }, holdKeys: { type: 'array', items: { type: 'string' } }, steps: { type: 'number' } } },
    run: async a => {
      const p = await page();
      const toScreen = pt => p.evaluate(([dx, dy]) => { const app = window.jspenApp, r = app.canvas.getBoundingClientRect(), s = app.renderer.worldToScreen(dx, dy); return [r.left + s.x, r.top + s.y]; }, pt);
      const from = a.docFrom ? await toScreen(a.docFrom) : a.from, to = a.docTo ? await toScreen(a.docTo) : a.to;
      if (!from || !to) throw new Error('from/to 또는 docFrom/docTo가 필요합니다.');
      for (const k of a.holdKeys || []) await p.keyboard.down(k);
      await p.mouse.move(from[0], from[1]); await p.mouse.down();
      await p.mouse.move(to[0], to[1], { steps: a.steps || 10 }); await p.mouse.up();
      for (const k of (a.holdKeys || []).slice().reverse()) await p.keyboard.up(k);
      return text({ from, to });
    } },
  { name: 'jspen_press', description: '키 누르기 (Playwright 형식, 예: "Control+Space", "Escape", "Delete"). 입력칸에 포커스가 있으면 그 칸에 들어갑니다.',
    inputSchema: { type: 'object', properties: { keys: { type: 'string' }, blurFirst: { type: 'boolean', description: 'true면 먼저 포커스를 풀어 단축키로 보냅니다' } }, required: ['keys'] },
    run: async a => {
      const p = await page();
      if (a.blurFirst) await p.evaluate(() => document.activeElement && document.activeElement.blur());
      await p.keyboard.press(a.keys);
      return text('pressed ' + a.keys);
    } },
  { name: 'jspen_fill', description: '입력칸에 값을 넣고 Enter: selector와 value. 선택 목록(select)이면 그 값을 고릅니다.',
    inputSchema: { type: 'object', properties: { selector: { type: 'string' }, value: { type: 'string' } }, required: ['selector', 'value'] },
    run: async a => {
      const p = await page();
      const el = p.locator(a.selector).first();
      if (await el.evaluate(e => e.tagName === 'SELECT')) await el.selectOption(a.value);
      else { await el.fill(a.value); await el.press('Enter'); }
      return text('set ' + a.selector + ' = ' + a.value);
    } },
  { name: 'jspen_preview', description: '실시간 미리보기(모듈 실행): action "start" / "stop" / "wait"(ms 동안 실행) / "click"(문서 좌표 docX, docY 클릭). 결과로 최근 신호, 변수와 편집 상태에서 달라진 스프라이트(위치·회전·크기·투명도·글자)를 돌려줍니다. ids로 볼 스프라이트를 정하거나 all: true면 모두.',
    inputSchema: { type: 'object', properties: { action: { type: 'string', enum: ['start', 'stop', 'wait', 'click'] }, ms: { type: 'number' }, docX: { type: 'number' }, docY: { type: 'number' },
      ids: { type: 'array', items: { type: 'string' } }, all: { type: 'boolean' } }, required: ['action'] },
    run: async a => {
      const p = await page();
      if (a.action === 'start') await p.evaluate(() => window.jspenApp.toggleModulePreview(true));
      if (a.action === 'stop') await p.evaluate(() => window.jspenApp.toggleModulePreview(false));
      if (a.action === 'click') {
        const pt = await p.evaluate(([dx, dy]) => { const app = window.jspenApp, r = app.canvas.getBoundingClientRect(), s = app.renderer.worldToScreen(dx, dy); return [r.left + s.x, r.top + s.y]; }, [a.docX, a.docY]);
        await p.mouse.click(pt[0], pt[1]);
      }
      await p.waitForTimeout(a.ms !== undefined ? a.ms : (a.action === 'wait' ? 500 : 150));
      return text(await p.evaluate(({ ids, all }) => {
        const e = window.jspenApp.moduleEngine;
        const list = window.jspenApp.doc.layers.flatMap(l => l.sprites).map(sp => {
          const rt = sp.runtime || {};
          const r = { id: sp.id, name: sp.name,
            x: +(rt.x ?? sp.x).toFixed(1), y: +(rt.y ?? sp.y).toFixed(1), rotation: +(rt.rotation || 0).toFixed(1), scale: +(rt.scaleX || 1).toFixed(3),
            opacity: +(rt.opacity ?? 1).toFixed(3), visible: sp.visible !== false && rt.visible !== false, fill: sp.fill, text: e.constructor.getText(sp) };
          // Changed from the edited state (only meaningful while running).
          r.changed = Math.abs(r.x - sp.x) > 0.05 || Math.abs(r.y - sp.y) > 0.05 || Math.abs(r.rotation - (sp.rotation || 0)) > 0.05 ||
            Math.abs(r.scale - (sp.scaleX || 1)) > 0.001 || Math.abs(r.opacity - (sp.opacity ?? 1)) > 0.001 || !r.visible || (rt.fill && rt.fill !== sp.fill) ||
            (sp.text !== undefined && r.text !== sp.text);
          return r;
        });
        const sprites = all ? list : (ids && ids.length ? list.filter(s => ids.includes(s.id)) : list.filter(s => s.changed));
        return { running: !!e.active, time: +e.bus.time.toFixed(2), vars: Object.fromEntries(e.bus.vars || []),
          signals: [...e.bus.signals.entries()].map(([n, v]) => ({ name: n, at: +v.time.toFixed(2) })),
          sprites, ...((all || (ids && ids.length)) ? {} : { note: `달라진 스프라이트 ${sprites.length}개 / 전체 ${list.length}개 (all: true면 모두)` }) };
      }, { ids: a.ids || null, all: !!a.all }));
    } },
  { name: 'jspen_export', description: '내보낸 결과를 새 탭에서 열어 스크린샷과 오류를 돌려줍니다. kind: "website"(HTML 사이트, 기본) 또는 "canvas"(캔버스 페이지). width로 창 폭을 정하고, clicks(스프라이트 id 목록)로 차례로 클릭해 볼 수 있습니다.',
    inputSchema: { type: 'object', properties: { kind: { type: 'string', enum: ['website', 'canvas'] }, width: { type: 'number' }, height: { type: 'number' },
      clicks: { type: 'array', items: { type: 'string' } }, waitMs: { type: 'number' } } },
    run: async a => {
      const p = await page();
      const html = await p.evaluate(kind => kind === 'canvas' ? PhotoshopJSExporter.generateHTML(window.jspenApp.doc) : window.jspenApp.generateWebsiteHTML(true), a.kind || 'website');
      const doc = await p.evaluate(() => ({ w: window.jspenApp.doc.width, at: Object.fromEntries(window.jspenApp.doc.layers.flatMap(l => l.sprites).map(s => [s.id, [s.x, s.y]])) }));
      const q = await p.context().newPage({});
      await q.setViewportSize({ width: a.width || 1440, height: a.height || 900 });
      const errs = [];
      q.on('pageerror', e => errs.push(e.message));
      try {
        await q.setContent(html);
        await q.waitForTimeout(400);
        for (const id of a.clicks || []) {
          // Website: the sprite's element. Canvas page: where the sprite is drawn.
          const pt = await q.evaluate(([id, at, w]) => {
            const el = document.querySelector('[data-sid="' + CSS.escape(id) + '"]');
            if (el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }
            const c = document.querySelector('canvas');
            if (!c || !at) return null;
            const r = c.getBoundingClientRect(), k = r.width / w;
            return [r.left + at[0] * k, r.top + at[1] * k];
          }, [id, doc.at[id], doc.w]);
          if (!pt) throw new Error('스프라이트를 찾을 수 없습니다: ' + id);
          await q.mouse.click(pt[0], pt[1]);
          await q.waitForTimeout(100);
        }
        await q.waitForTimeout(a.waitMs || 300);
        const buf = await q.screenshot({ fullPage: true });
        return image(buf, JSON.stringify({ kind: a.kind || 'website', bytes: html.length, errors: errs }));
      } finally { await q.close(); }
    } },
  { name: 'jspen_errors', description: '스튜디오 페이지의 자바스크립트 오류와 콘솔 경고·오류를 돌려줍니다. clear: true면 비웁니다.',
    inputSchema: { type: 'object', properties: { clear: { type: 'boolean' } } },
    run: async a => { const r = { errors: state.errors.slice(), console: state.console.slice(-50) }; if (a.clear) { state.errors = []; state.console = []; } return text(r); } }
];

// ---------------------------------------------------------------- JSON-RPC over stdio
function send(msg) { process.stdout.write(JSON.stringify(msg) + '\n'); }

async function handle(msg) {
  const { id, method, params } = msg;
  const reply = result => { if (id !== undefined) send({ jsonrpc: '2.0', id, result }); };
  const fail = (code, message) => { if (id !== undefined) send({ jsonrpc: '2.0', id, error: { code, message } }); };
  try {
    if (method === 'initialize') {
      return reply({ protocolVersion: (params && params.protocolVersion) || '2024-11-05', capabilities: { tools: {} },
        serverInfo: { name: 'jspen', version: VERSION },
        instructions: 'JSPen Studio를 실제 브라우저에서 열어 테스트합니다. jspen_open → jspen_load(템플릿이나 프로젝트) → jspen_state / jspen_screenshot으로 확인하고, jspen_click·jspen_fill·jspen_press로 조작, jspen_preview로 모듈을 실행, jspen_export로 내보낸 결과를 봅니다. 세부 확인은 jspen_eval.' });
    }
    if (method === 'notifications/initialized' || (method && method.startsWith('notifications/'))) return;
    if (method === 'ping') return reply({});
    if (method === 'tools/list') return reply({ tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    if (method === 'tools/call') {
      const tool = TOOLS.find(t => t.name === (params && params.name));
      if (!tool) return fail(-32602, 'unknown tool: ' + (params && params.name));
      try { return reply(await tool.run((params && params.arguments) || {})); }
      catch (e) { return reply({ isError: true, content: [{ type: 'text', text: String(e && e.message || e) }] }); }
    }
    return fail(-32601, 'method not found: ' + method);
  } catch (e) {
    return fail(-32603, String(e && e.message || e));
  }
}

// Requests run one at a time (they drive one page).
let queue = Promise.resolve();
const rl = readline.createInterface({ input: process.stdin });
rl.on('line', line => {
  if (!line.trim()) return;
  let msg;
  try { msg = JSON.parse(line); } catch (e) { send({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }); return; }
  queue = queue.then(() => handle(msg));
});
rl.on('close', () => { queue.then(close).then(() => process.exit(0)); });
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { close().then(() => process.exit(0)); });
