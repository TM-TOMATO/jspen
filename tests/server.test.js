// Dev server (server.js) security and API tests.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { ROOT, startServer } = require('./helpers');

let server;
let fixture;
before(async () => {
  server = await startServer();
  fixture = await startFixture();
});
after(async () => {
  await server?.stop();
  await fixture?.stop();
});

// A copy of server.js in a throwaway root that really contains the files that
// must stay private. In this repo some of them may be absent (node_modules not
// installed, .git being a file in a worktree) and a 404 would prove nothing.
async function startFixture() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jspen-server-'));
  const write = (rel, body = 'private') => {
    fs.mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    fs.writeFileSync(path.join(dir, rel), body);
  };
  fs.copyFileSync(path.join(ROOT, 'server.js'), path.join(dir, 'server.js'));
  write('package.json', '{}');
  for (const rel of ['.git/config', 'node_modules/pkg/index.js', 'main.py',
    'css-private/x.css', 'js/.env', 'js/.cache/data']) write(rel);
  for (const rel of ['index.html', 'css/style.css', 'js/bundle.js', 'js/lib/extra.js',
    'templates/내 템플릿 #1.jspen', 'templates/draft~2.jspen']) write(rel, 'public');
  // Windows creates these 8.3 aliases itself; elsewhere make them literal files
  // so the regression is exercised on every platform.
  for (const rel of ['GIT~1/config', 'js/ENV~1', 'js/CACHE~1/data']) {
    if (!fs.existsSync(path.join(dir, rel))) write(rel);
  }

  const port = 30000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [path.join(dir, 'server.js')], {
    env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), JSPEN_NO_OPEN: '1' },
    stdio: ['ignore', 'pipe', 'inherit']
  });
  const exited = new Promise(resolve => child.once('exit', resolve));
  const stop = async () => {
    child.kill();
    await exited;
    fs.rmSync(dir, { recursive: true, force: true });
  };
  // The banner is printed once listen() succeeds.
  const ready = await Promise.race([
    new Promise(resolve => child.stdout.once('data', () => resolve(true))),
    exited.then(() => false)
  ]);
  if (!ready) {
    await stop();
    throw new Error('fixture server did not start');
  }
  return { url: `http://127.0.0.1:${port}`, stop };
}

// Raw GET without URL normalisation (like curl --path-as-is).
function rawGet(path, base = server.url) {
  const u = new URL(base);
  return new Promise((resolve, reject) => {
    const req = http.request({ host: u.hostname, port: u.port, path, method: 'GET' }, res => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

test('serves the studio and the bundle', async () => {
  assert.equal((await rawGet('/')).status, 200);
  assert.equal((await rawGet('/js/bundle.js')).status, 200);
});

test('template API lists the bundled templates', async () => {
  const res = await rawGet('/api/templates');
  assert.equal(res.status, 200);
  const list = JSON.parse(res.body);
  assert.ok(list.length >= 7);
  assert.ok(list.every(t => t.file.endsWith('.jspen')));
});

test('path traversal cannot escape the project root', async () => {
  for (const p of ['/../../../../etc/hostname', '/%2e%2e/%2e%2e/%2e%2e/%2e%2e/etc/hostname', '/..%2f..%2f..%2fetc/hostname']) {
    const res = await rawGet(p);
    assert.notEqual(res.status, 200, p);
  }
});

test('dotfiles are not served', async () => {
  assert.equal((await rawGet('/.git/config')).status, 404);
});

test('malformed URLs are rejected without crashing the server', async () => {
  assert.equal((await rawGet('/%E0%A4%A')).status, 400);
  assert.equal((await rawGet('/%00')).status, 400);
  assert.equal((await rawGet('/')).status, 200, 'server still alive');
});

// Requests every path against the fixture and reports all wrong statuses at once.
async function assertStatus(expected, paths) {
  const wrong = [];
  for (const p of paths) {
    const { status } = await rawGet(p, fixture.url);
    if (status !== expected) wrong.push(`${p} -> ${status}`);
  }
  assert.deepEqual(wrong, [], `expected ${expected}`);
}

test('8.3 short names cannot reach dotfiles', async () => {
  await assertStatus(404, ['/GIT~1/config', '/git~1/config', '/GIT%7E1/config',
    '/js/ENV~1', '/js/env~1', '/js/ENV%7e1', '/js/CACHE~1/data']);
});

test('node_modules is not served', async () => {
  await assertStatus(404, ['/node_modules/pkg/index.js', '/NODE_M~1/pkg/index.js']);
});

test('repository files outside the allow list are not served', async () => {
  await assertStatus(404, ['/main.py', '/main.py?x=1', '/server.js', '/package.json',
    '/css-private/x.css', '/js/.env', '/api/other']);
});

test('backslashes are rejected, raw or encoded', async () => {
  await assertStatus(404, ['/js%5Cbundle.js', '/js/lib%5cextra.js', '/js\\bundle.js',
    '/js/..%5Cmain.py', '/%5C.git%5Cconfig']);
});

test('colons, dot segments and empty segments are rejected', async () => {
  await assertStatus(404, ['/js/bundle.js::$DATA', '/js/bundle.js%3A%3A$DATA',
    '/js/../index.html', '/js/%2e%2e/index.html', '/js/..%2fmain.py', '/js/./bundle.js',
    '//index.html', '/js//bundle.js', '/js%2f%2fbundle.js', '/js/bundle.js/']);
});

test('allowed paths are still served', async () => {
  await assertStatus(200, ['/', '/?v=1', '/index.html', '/css/style.css', '/js/bundle.js?v=1',
    '/js/lib/extra.js', '/api/templates', '/templates/draft~2.jspen',
    '/templates/' + encodeURIComponent('내 템플릿 #1.jspen')]);
});

test('every bundled css, js and template file is served', async () => {
  for (const dir of ['css', 'js', 'templates']) {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      const url = `/${dir}/${encodeURIComponent(name)}`;
      assert.equal((await rawGet(url)).status, 200, url);
    }
  }
});
