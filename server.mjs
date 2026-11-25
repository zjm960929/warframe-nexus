import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import {
  mkdir,
  readFile,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { loadOfficialWorldstate } from './src/official.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(ROOT, 'public');
const CACHE_DIR = path.join(ROOT, '.cache');
const PORT = Number.parseInt(process.env.PORT || '4173', 10);
const HOST = process.env.HOST || '127.0.0.1';
const API_TTL_MS = 30_000;

const MIME_TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.csv', 'text/csv; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.webp', 'image/webp'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.woff2', 'font/woff2'],
]);

const memoryCache = new Map();
const inflight = new Map();

function jsonEnvelope(data, meta) {
  return { data, meta };
}

function cachePath(lang) {
  return path.join(CACHE_DIR, `worldstate-${lang}.json`);
}

async function readDiskCache(lang) {
  try {
    const raw = await readFile(cachePath(lang), 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.data || !parsed.meta) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeDiskCache(lang, envelope) {
  try {
    await mkdir(CACHE_DIR, { recursive: true });
    const target = cachePath(lang);
    const tmp = `${target}.${process.pid}.tmp`;
    await writeFile(tmp, JSON.stringify(envelope), 'utf8');
    await rename(tmp, target);
  } catch (error) {
    console.warn(`[cache] could not persist ${lang}: ${error.message}`);
  }
}

async function fetchWorldstateUpstream(lang) {
  return loadOfficialWorldstate(lang);
}

async function getWorldstate(lang, { fresh = false } = {}) {
  const now = Date.now();
  const cached = memoryCache.get(lang);
  if (!fresh && cached && now - cached.meta.fetchedAtMs < API_TTL_MS) {
    return cached.envelope;
  }

  if (!fresh && inflight.has(lang)) {
    return inflight.get(lang);
  }

  const task = (async () => {
    try {
      const { data, upstream } = await fetchWorldstateUpstream(lang);
      const fetchedAtMs = Date.now();
      const envelope = jsonEnvelope(data, {
        lang,
        fetchedAt: new Date(fetchedAtMs).toISOString(),
        fetchedAtMs,
        upstream,
        stale: false,
      });
      memoryCache.set(lang, { envelope, meta: envelope.meta });
      await writeDiskCache(lang, envelope);
      return envelope;
    } catch (error) {
      const staleEnvelope = cached?.envelope || (await readDiskCache(lang));
      if (staleEnvelope) {
        const stale = {
          data: staleEnvelope.data,
          meta: {
            ...staleEnvelope.meta,
            stale: true,
            error: error.message,
          },
        };
        memoryCache.set(lang, { envelope: stale, meta: stale.meta });
        return stale;
      }
      throw error;
    } finally {
      inflight.delete(lang);
    }
  })();

  inflight.set(lang, task);
  return task;
}

function setSecurityHeaders(response) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  response.setHeader(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "base-uri 'none'",
      "frame-ancestors 'none'",
      "img-src 'self' data: https://*.warframe.com",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self'",
      "font-src 'self'",
      "object-src 'none'",
    ].join('; '),
  );
}

function sendJson(response, status, value) {
  const body = JSON.stringify(value);
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Accept, Content-Type',
    Vary: 'Origin',
  };
  setSecurityHeaders(response);
  response.writeHead(status, headers);
  response.end(body);
}

function isTextual(contentType) {
  return /^(text\/|application\/(json|javascript|xml)|image\/svg\+xml)/.test(contentType);
}

async function serveStatic(request, response, url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    response.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Bad request');
    return;
  }

  if (pathname === '/') pathname = '/index.html';

  const candidate = path.resolve(PUBLIC_DIR, `.${pathname}`);
  if (!candidate.startsWith(PUBLIC_DIR + path.sep) && candidate !== PUBLIC_DIR) {
    response.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Forbidden');
    return;
  }

  let filePath = candidate;
  try {
    const info = await stat(filePath);
    if (info.isDirectory()) filePath = path.join(filePath, 'index.html');
  } catch {
    if (!path.extname(pathname)) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    } else {
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }
  }

  let body;
  try {
    body = await readFile(filePath);
  } catch {
    response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES.get(ext) || 'application/octet-stream';
  const headers = {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache',
  };
  setSecurityHeaders(response);

  const acceptEncoding = request.headers['accept-encoding'] || '';
  if (isTextual(contentType) && /\bgzip\b/.test(acceptEncoding) && body.length > 512) {
    body = gzipSync(body, { level: 6 });
    headers['Content-Encoding'] = 'gzip';
    headers.Vary = 'Accept-Encoding';
  }
  headers['Content-Length'] = body.length;
  response.writeHead(200, headers);
  if (request.method === 'HEAD') response.end();
  else response.end(body);
}

const server = http.createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  setSecurityHeaders(response);

  if (request.method === 'OPTIONS') {
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Accept, Content-Type');
    response.setHeader('Access-Control-Max-Age', '86400');
    response.setHeader('Vary', 'Origin');
    response.writeHead(204);
    response.end();
    return;
  }

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405, { Allow: 'GET, HEAD' });
    response.end();
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(response, 200, { ok: true, now: new Date().toISOString() });
    return;
  }

  if (url.pathname === '/api/worldstate') {
    const lang = url.searchParams.get('lang') === 'en' ? 'en' : 'zh';
    const fresh = url.searchParams.get('fresh') === '1';
    try {
      const envelope = await getWorldstate(lang, { fresh });
      sendJson(response, 200, envelope);
    } catch (error) {
      console.error(`[worldstate] unavailable: ${error.message}`);
      sendJson(response, 502, {
        error: 'worldstate_unavailable',
        message: 'Could not reach the public Warframe worldstate API.',
      });
    }
    return;
  }

  await serveStatic(request, response, url);
});

server.listen(PORT, HOST, () => {
  const displayHost = HOST === '0.0.0.0' ? '127.0.0.1' : HOST;
  console.log(`warframe-nexus running at http://${displayHost}:${PORT}`);
  console.log('Live data: official api.warframe.com/cdn/worldState.php (set HTTPS_PROXY + NODE_USE_ENV_PROXY=1 if needed)');
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
}
