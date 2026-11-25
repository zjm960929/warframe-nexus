import 'reflect-metadata';
import WorldState from 'warframe-worldstate-parser';

const quietLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: () => {},
};

function sanitizeWorldstateData(data) {
  const clone = JSON.parse(JSON.stringify(data));
  delete clone.news;
  for (const mission of clone.syndicateMissions || []) {
    for (const job of mission.jobs || []) {
      job.rewardPool = [];
      job.rewardPoolDrops = [];
    }
  }
  const walk = (value) => {
    if (Array.isArray(value)) {
      for (const item of value) walk(item);
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const key of Object.keys(value)) {
      const child = value[key];
      if (key === 'imageLink' || key === 'thumbnail') {
        delete value[key];
        continue;
      }
      if (typeof child === 'string' && /^https?:\/\//i.test(child) && !/^https?:\/\/[^/]*warframe\.com\//i.test(child)) {
        delete value[key];
        continue;
      }
      walk(child);
    }
  };
  walk(clone);
  return clone;
}

let parseQueue = Promise.resolve();

/**
 * Parse official raw worldstate in the browser. Parsing is serialized because
 * the parser may call fetch for optional community bounty data; the temporary
 * fetch guard below prevents those requests and makes that optional data empty.
 */
export function parseLiveWorldstate(rawText, lang = 'en') {
  const task = parseQueue.then(async () => {
    const originalFetch = globalThis.fetch;
    const base = typeof location !== 'undefined' ? location.href : 'http://localhost/';
    const sameOrigin = typeof location !== 'undefined' ? location.origin : null;
    globalThis.fetch = async (input, init) => {
      const url = typeof input === 'string' ? input : input?.url || '';
      let parsed;
      try {
        parsed = new URL(url, base);
      } catch {
        return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
      }
      if (sameOrigin && parsed.origin !== sameOrigin) {
        return new Response('{}', { status: 404, headers: { 'content-type': 'application/json' } });
      }
      return originalFetch(input, init);
    };
    try {
      const data = await WorldState.build(rawText, {
        locale: lang === 'zh' ? 'zh' : 'en',
        logger: quietLogger,
      });
      return sanitizeWorldstateData(data);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
  parseQueue = task.catch(() => {});
  return task;
}
