// Dev server (server.js) security and API tests.
'use strict';

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { startServer } = require('./helpers');

let server;
before(async () => { server = await startServer(); });
after(async () => { await server.stop(); });

// Raw GET without URL normalisation (like curl --path-as-is).
function rawGet(path) {
  const u = new URL(server.url);
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
