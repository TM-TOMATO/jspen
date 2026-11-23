// The MCP server (mcp/jspen-mcp.js) that lets an AI assistant open and test the
// studio: spoken to over stdio exactly like Claude Code does.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');
const readline = require('node:readline');
const { ROOT } = require('./helpers');

let child, rl, nextId = 1;
const pending = new Map();

function call(method, params) {
  const id = nextId++;
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { pending.delete(id); reject(new Error('timeout: ' + method)); }, 60000);
    pending.set(id, msg => { clearTimeout(timer); resolve(msg); });
  });
}
const tool = async (name, args = {}) => {
  const r = await call('tools/call', { name, arguments: args });
  assert.ok(r.result, JSON.stringify(r));
  return r.result;
};
const json = r => JSON.parse(r.content.find(c => c.type === 'text').text);

before(() => {
  child = spawn(process.execPath, [path.join(ROOT, 'mcp', 'jspen-mcp.js')], { cwd: ROOT, stdio: ['pipe', 'pipe', 'inherit'] });
  rl = readline.createInterface({ input: child.stdout });
  rl.on('line', line => {
    const msg = JSON.parse(line);
    const done = pending.get(msg.id);
    if (done) { pending.delete(msg.id); done(msg); }
  });
});
after(async () => {
  if (!child) return;
  child.stdin.end();
  await new Promise(r => { const t = setTimeout(() => { child.kill(); r(); }, 15000); child.once('exit', () => { clearTimeout(t); r(); }); });
});

test('mcp: registered for Claude Code and answers the handshake', async () => {
  const cfg = JSON.parse(fs.readFileSync(path.join(ROOT, '.mcp.json'), 'utf8'));
  assert.deepEqual(cfg.mcpServers.jspen, { command: 'node', args: ['mcp/jspen-mcp.js'] });
  const init = await call('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: 'test', version: '1' } });
  assert.equal(init.result.serverInfo.name, 'jspen');
  assert.ok(init.result.capabilities.tools);
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n');
  const list = await call('tools/list', {});
  const names = list.result.tools.map(t => t.name);
  for (const n of ['jspen_open', 'jspen_load', 'jspen_state', 'jspen_eval', 'jspen_screenshot', 'jspen_click', 'jspen_drag', 'jspen_press', 'jspen_fill', 'jspen_preview', 'jspen_export', 'jspen_errors', 'jspen_close']) {
    assert.ok(names.includes(n), n);
  }
  for (const t of list.result.tools) assert.equal(t.inputSchema.type, 'object');
  const unknown = await call('tools/call', { name: 'nope', arguments: {} });
  assert.ok(unknown.error);
});

test('mcp: open the studio, load a template, read it, run code and take a screenshot', async () => {
  const opened = json(await tool('jspen_open'));
  assert.match(opened.url, /^http:\/\/127\.0\.0\.1:\d+$/);
  const st = json(await tool('jspen_load', { template: 'hero.jspen' }));
  assert.ok(st.layers.length > 0 && st.layers.some(l => l.sprites.length > 0));
  assert.equal(st.dirty, false);
  assert.equal(json(await tool('jspen_eval', { code: 'jspenApp.doc.layers.length' })), st.layers.length);
  assert.equal(json(await tool('jspen_eval', { code: 'const n = 2; await new Promise(r => setTimeout(r, 10)); return n * 21;' })), 42);
  const shot = await tool('jspen_screenshot', { target: 'canvas' });
  const img = shot.content.find(c => c.type === 'image');
  assert.equal(img.mimeType, 'image/png');
  assert.ok(Buffer.from(img.data, 'base64').length > 1000);
  const missing = await tool('jspen_load', { template: 'nothing.jspen' });
  assert.equal(missing.isError, true);
  assert.match(missing.content[0].text, /hero\.jspen/);
});

test('mcp: build with clicks and fields, run the preview, and check the exported site', async () => {
  await tool('jspen_load', { project: { name: 'm', width: 800, height: 600, layers: [{ id: 'L', name: 'L', sprites: [
    { id: 'btn', name: '버튼', type: 'rect', x: 400, y: 300, width: 120, height: 60, fill: '#ffffff',
      modules: [{ id: 'r', type: 'action_rules', name: '동작', enabled: true, params: { condition: 'on_click', steps: [{ type: 'move_by', dx: 100, dy: 0, duration: 0.2, ease: 'linear' }] } }] }] }] } });
  await tool('jspen_eval', { code: "jspenApp.doc.selectedSpriteId = 'btn'; jspenApp.doc.selectedModuleId = 'r'; jspenApp.refreshUI(); const r = jspenApp.renderer; r.zoom = 1; r.panX = 0; r.panY = 0; jspenApp.renderCanvas(); return true" });
  await tool('jspen_fill', { selector: '.jspen-action[data-step-index="0"] [data-param-key="dx"]', value: '150' });
  const dx = await tool('jspen_eval', { code: "jspenApp.doc.findSpriteById('btn').modules[0].params.steps[0].dx" });
  assert.ok(!dx.isError, dx.content[0].text);
  assert.equal(json(dx), 150);
  await tool('jspen_preview', { action: 'start' });
  const run = json(await tool('jspen_preview', { action: 'click', docX: 400, docY: 300, ms: 600 }));
  assert.equal(run.running, true);
  assert.equal(run.sprites.find(s => s.id === 'btn').x, 550);
  const stopped = json(await tool('jspen_preview', { action: 'stop' }));
  assert.equal(stopped.running, false);
  const site = await tool('jspen_export', { kind: 'website', width: 800, clicks: ['btn'], waitMs: 500 });
  const meta = JSON.parse(site.content[0].text);
  assert.deepEqual(meta.errors, []);
  assert.equal(site.content[1].type, 'image');
  assert.deepEqual(json(await tool('jspen_errors')).errors, []);
  assert.deepEqual(json(await tool('jspen_close')), { closed: true });
});
