import { loadOfficialWorldstate } from '../src/official.mjs';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

function sendJson(res, status, body) {
  res.statusCode = status;
  for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);
    res.end();
    return;
  }

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    sendJson(res, 405, { error: 'method_not_allowed' });
    return;
  }

  const requestUrl = new URL(req.url || '/api/worldstate', 'https://vercel.local');
  const lang = requestUrl.searchParams.get('lang') === 'zh' ? 'zh' : 'en';

  try {
    const { data, upstream } = await loadOfficialWorldstate(lang);
    const envelope = {
      data,
      meta: {
        lang,
        fetchedAt: new Date().toISOString(),
        upstream,
        stale: false,
      },
    };
    if (req.method === 'HEAD') {
      res.statusCode = 200;
      for (const [key, value] of Object.entries(CORS_HEADERS)) res.setHeader(key, value);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      res.end();
      return;
    }
    sendJson(res, 200, envelope);
  } catch (error) {
    sendJson(res, 502, {
      error: 'upstream_unavailable',
      message: error instanceof Error ? error.message : 'unknown error',
    });
  }
}
