'use strict';
/*
 * Standalone server — for your own computer, a VPS or Docker.
 * (On Vercel this file is not used: Vercel serves public/ and runs api/index.js.)
 */
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

try { if (fs.existsSync(path.join(__dirname, '.env'))) process.loadEnvFile(path.join(__dirname, '.env')); } catch (_) { }
const { handleApi, getDb } = require('./lib/app');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');
const HEADERS = JSON.parse(fs.readFileSync(path.join(__dirname, 'vercel.json'), 'utf8')).headers[0].headers
  .reduce((o, h) => (o[h.key] = h.value, o), {});
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json' };

function serveStatic(req, res) {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p === '/') p = '/index.html';
  if (p === '/login') p = '/login.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(404); res.end('Not found'); return; }
  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) { res.writeHead(404, HEADERS); res.end('Not found'); return; }
    res.writeHead(200, { ...HEADERS, 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream', 'Content-Length': st.size, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).pipe(res);
  });
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api/')) return handleApi(req, res);
  if (req.method !== 'GET' && req.method !== 'HEAD') { res.writeHead(405); res.end(); return; }
  serveStatic(req, res);
});
server.requestTimeout = 120_000;

getDb().then(db => {
  server.listen(PORT, HOST, () => {
    console.log(`Thematic Coder is running on http://localhost:${PORT}`);
    console.log(db.kind === 'postgres' ? 'Using the PostgreSQL database from DATABASE_URL.' : `Using the built-in database in ${path.resolve(process.env.DATA_DIR || 'data')}.`);
    console.log('The first person to sign up becomes the owner.');
  });
}).catch(e => { console.error('Could not open the database:', e.message); process.exit(1); });

process.on('SIGINT', () => process.exit(0));
process.on('SIGTERM', () => process.exit(0));
