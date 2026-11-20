const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = Number(process.env.PORT) || 3000;
// Bind to loopback only so the dev server is not reachable from the LAN.
const HOST = process.env.HOST || '127.0.0.1';
const ROOT = path.resolve(__dirname);
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jspen': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

function sendText(res, status, text) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(text);
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendText(res, 405, '405 Method Not Allowed');
    return;
  }

  let reqPath;
  try {
    reqPath = decodeURIComponent((req.url || '/').split('?')[0].split('#')[0]);
  } catch (_) {
    // Malformed percent-encoding (e.g. "/%E0%A4%A") must not crash the server.
    sendText(res, 400, '400 Bad Request');
    return;
  }
  if (reqPath.includes('\0')) {
    sendText(res, 400, '400 Bad Request');
    return;
  }
  if (reqPath === '/') reqPath = '/index.html';

  // Resolve against the project root and refuse anything that escapes it
  // (e.g. "/../../etc/passwd" or "/%2e%2e/%2e%2e/etc/passwd").
  const filePath = path.resolve(ROOT, '.' + path.posix.normalize('/' + reqPath));
  if (filePath !== ROOT && !filePath.startsWith(ROOT + path.sep)) {
    sendText(res, 403, '403 Forbidden');
    return;
  }
  // Do not serve repository internals or dotfiles.
  const relParts = path.relative(ROOT, filePath).split(path.sep);
  if (relParts.some(part => part.startsWith('.'))) {
    sendText(res, 404, '404 Not Found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Dynamic template discovery API (.jspen and .json)
  if (reqPath === '/api/templates') {
    const tplDir = path.join(__dirname, 'templates');
    fs.readdir(tplDir, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const tplFiles = files.filter(f => (f.endsWith('.jspen') || f.endsWith('.json')) && f !== 'manifest.json');
      const list = tplFiles.map(file => {
        let title = file.replace(/\.(jspen|json)$/i, '');
        try {
          const doc = JSON.parse(fs.readFileSync(path.join(tplDir, file), 'utf-8'));
          if (doc.name) title = doc.name;
        } catch (_) {}
        return { file, title };
      });
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify(list));
    });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT' || err.code === 'EISDIR' || err.code === 'ENOTDIR') {
        sendText(res, 404, '404 Not Found');
      } else {
        sendText(res, 500, '500 Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' });
      res.end(req.method === 'HEAD' ? undefined : content);
    }
  });
});

server.on('clientError', (err, socket) => {
  if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.listen(PORT, HOST, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n==================================================`);
  console.log(`⚡ JSPen Visual Studio 가 실행되었습니다!`);
  console.log(`👉 브라우저 주소: ${url}`);
  console.log(`종료하려면 터미널에서 Ctrl+C를 누르세요.`);
  console.log(`==================================================\n`);

  // Auto open the default browser (Windows / macOS / Linux)
  const opener = process.platform === 'win32' ? `start "" "${url}"`
    : process.platform === 'darwin' ? `open "${url}"`
    : `xdg-open "${url}"`;
  exec(opener, () => { /* ignore if no browser is available */ });
});
