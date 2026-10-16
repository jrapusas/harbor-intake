import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { handleRunRequest, handleHealthRequest, handleValidateRequest } from './lib/run-handler.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(__dirname, 'dist');
const PUBLIC = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT || 3848);

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  return fs
    .readFile(envPath, 'utf8')
    .then((raw) => {
      for (const line of raw.split('\n')) {
        const t = line.trim();
        if (!t || t.startsWith('#')) continue;
        const i = t.indexOf('=');
        if (i === -1) continue;
        const key = t.slice(0, i).trim();
        const val = t.slice(i + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    })
    .catch(() => {});
}

async function readBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  if (chunks.length === 0) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    return {};
  }
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(JSON.stringify(data));
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

async function tryStatic(urlPath, res) {
  const rel = urlPath === '/' ? '/index.html' : urlPath;
  const file = path.join(DIST, rel);
  if (!file.startsWith(DIST)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  try {
    const data = await fs.readFile(file);
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
    return res.end(data);
  } catch {
    return false;
  }
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Demo-Token',
    });
    return res.end();
  }

  const url = new URL(req.url || '/', `http://${req.headers.host}`);

  if (req.method === 'GET' && url.pathname.startsWith('/sample-run.json')) {
    const file = path.join(PUBLIC, 'sample-run.json');
    const data = await fs.readFile(file);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(data);
  }

  if (req.method === 'POST' && url.pathname === '/api/run') {
    const body = await readBody(req);
    const { status, body: payload } = await handleRunRequest({ body, headers: req.headers });
    return sendJson(res, status, payload);
  }

  if (req.method === 'POST' && url.pathname === '/api/validate') {
    const body = await readBody(req);
    const { status, body: payload } = await handleValidateRequest({ body, headers: req.headers });
    return sendJson(res, status, payload);
  }

  if (req.method === 'GET' && url.pathname === '/api/health') {
    const { status, body } = handleHealthRequest();
    return sendJson(res, status, body);
  }

  if (req.method === 'GET') {
    const served = await tryStatic(url.pathname, res);
    if (served !== false) return;
    const spa = await tryStatic('/index.html', res);
    if (spa !== false) return;
  }

  res.writeHead(404);
  res.end('Not found');
});

await loadEnvFile();
server.listen(PORT, () => {
  console.log(`Harbor Intake http://localhost:${PORT} (serve dist after npm run build)`);
});
