// Local stand-in for Vercel: serves the static files and /api/scenario.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { GET } from '../api/scenario.js';

const ROOT = new URL('..', import.meta.url).pathname;
const TYPES = { '.html': 'text/html', '.mp4': 'video/mp4', '.jpg': 'image/jpeg', '.png': 'image/png', '.js': 'text/javascript' };
const PORT = process.env.PORT || 3030;

http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://x').pathname;
  if (path === '/api/scenario') {
    const r = await GET();
    res.writeHead(r.status, { 'Content-Type': 'application/json' });
    return res.end(await r.text());
  }
  try {
    const file = join(ROOT, path === '/' ? 'index.html' : path);
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('not found');
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}`));
