const OFFICIAL_URL = 'https://api.warframe.com/cdn/worldState.php';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': 'Accept, Content-Type',
  'Access-Control-Max-Age': '86400',
  Vary: 'Origin',
};

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(body, {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...CORS_HEADERS,
      ...extraHeaders,
    },
  });
}

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return jsonResponse(JSON.stringify({ error: 'method_not_allowed' }), 405);
    }

    if (url.pathname !== '/' && url.pathname !== '/worldstate') {
      return jsonResponse(JSON.stringify({ error: 'not_found' }), 404);
    }

    try {
      const upstream = await fetch(OFFICIAL_URL, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'User-Agent': 'warframe-nexus/0.2.0 (community fan utility)',
        },
        cf: { cacheTtl: 0 },
      });

      if (!upstream.ok) {
        return jsonResponse(
          JSON.stringify({
            error: 'upstream_unavailable',
            status: upstream.status,
          }),
          502,
        );
      }

      const body = await upstream.text();
      if (request.method === 'HEAD') {
        return new Response(null, {
          status: 200,
          headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...CORS_HEADERS,
          },
        });
      }
      return jsonResponse(body, 200);
    } catch (error) {
      return jsonResponse(
        JSON.stringify({
          error: 'upstream_unreachable',
          message: error instanceof Error ? error.message : 'unknown error',
        }),
        502,
      );
    }
  },
};
