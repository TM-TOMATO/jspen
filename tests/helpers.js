// Shared helpers for the JSPen test suite (node:test + Playwright).
'use strict';

const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');
const { chromium } = require('playwright');

const ROOT = path.resolve(__dirname, '..');

function waitForServer(url, timeoutMs = 10000) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      http.get(url, res => { res.resume(); resolve(); })
        .on('error', () => {
          if (Date.now() - started > timeoutMs) reject(new Error('server did not start: ' + url));
          else setTimeout(tryOnce, 100);
        });
    };
    tryOnce();
  });
}

// Start server.js on a free-ish port; returns { url, stop }.
async function startServer() {
  const port = 30000 + Math.floor(Math.random() * 20000);
  const child = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    cwd: ROOT,
    env: Object.assign({}, process.env, { PORT: String(port), JSPEN_NO_OPEN: '1' }),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  let stderr = '';
  child.stderr.on('data', d => { stderr += d; });
  const url = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(url + '/');
  } catch (e) {
    child.kill();
    throw new Error(e.message + '\n' + stderr);
  }
  return {
    url,
    child,
    stop: () => new Promise(resolve => {
      if (child.exitCode !== null) return resolve();
      child.once('exit', resolve);
      child.kill();
    })
  };
}

// Open the studio and collect page errors. Returns { browser, page, errors }.
async function openStudio(url, viewport = { width: 1440, height: 900 }) {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport, acceptDownloads: true });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url + '/');
  await page.waitForFunction(() => window.jspenApp && window.jspenApp.renderer);
  return { browser, context, page, errors };
}

// Pixel comparison of a PNG data URL against the first <canvas> of a page.
// Returns the percentage of pixels whose RGBA distance exceeds `tolerance`.
async function canvasMismatchPct(page, pngDataUrl, tolerance = 24) {
  return page.evaluate(async ([png, tol]) => {
    const cv = document.querySelector('canvas');
    const img = new Image(); img.src = png; await img.decode();
    const a = document.createElement('canvas'); a.width = cv.width; a.height = cv.height;
    const actx = a.getContext('2d'); actx.drawImage(img, 0, 0, a.width, a.height);
    const A = actx.getImageData(0, 0, a.width, a.height).data;
    const B = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data;
    let bad = 0;
    for (let i = 0; i < A.length; i += 4) {
      const d = Math.abs(A[i] - B[i]) + Math.abs(A[i + 1] - B[i + 1]) + Math.abs(A[i + 2] - B[i + 2]) + Math.abs(A[i + 3] - B[i + 3]);
      if (d > tol) bad++;
    }
    return 100 * bad / (A.length / 4);
  }, [pngDataUrl, tolerance]);
}

module.exports = { ROOT, startServer, openStudio, canvasMismatchPct };
