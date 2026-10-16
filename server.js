const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = 3000;
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/') reqPath = '/index.html';

  const filePath = path.join(__dirname, reqPath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  // Dynamic template discovery API
  if (reqPath === '/api/templates') {
    const tplDir = path.join(__dirname, 'templates');
    fs.readdir(tplDir, (err, files) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
        return;
      }
      const jsonFiles = files.filter(f => f.endsWith('.json') && f !== 'manifest.json');
      const list = jsonFiles.map(file => {
        let title = file.replace('.json', '');
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
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('500 Internal Server Error: ' + err.code);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  const url = `http://localhost:${PORT}`;
  console.log(`\n==================================================`);
  console.log(`⚡ JSPen Visual Studio 가 실행되었습니다!`);
  console.log(`👉 브라우저 주소: ${url}`);
  console.log(`종료하려면 터미널에서 Ctrl+C를 누르세요.`);
  console.log(`==================================================\n`);

  // Auto open browser on Windows
  exec(`start ${url}`);
});
