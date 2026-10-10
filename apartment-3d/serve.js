// Tiny static server for local use: node apartment-3d/serve.js, then open http://localhost:8765/apartment-3d/
const http = require('http'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..'), port = +process.env.PORT || 8765;
const types = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.md': 'text/plain; charset=utf-8' };
http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (req.method === 'POST' && p.startsWith('/__film/')) { // frames from the planner's film recorder
    const out = path.join(__dirname, 'film', 'frames'), chunks = []; fs.mkdirSync(out, { recursive: true });
    req.on('data', c => chunks.push(c)); req.on('end', () => { fs.writeFileSync(path.join(out, path.basename(p)), Buffer.concat(chunks)); res.writeHead(200); res.end('ok'); });
    return;
  }
  if (p.endsWith('/')) p += 'index.html';
  const f = path.join(root, p);
  if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
}).listen(port, () => console.log(`Planner: http://localhost:${port}/apartment-3d/`));
