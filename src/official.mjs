import 'reflect-metadata';
import WorldState from 'warframe-worldstate-parser';

/**
 * Official DE worldstate feed. This is the raw feed used by the official
 * Warframe app; it is not a community API.
 */
export const OFFICIAL_WORLDSTATE_URL = 'https://api.warframe.com/cdn/worldState.php';

const DEFAULT_TIMEOUT_MS = 20_000;

const quietLogger = {
  debug: () => {},
  info: () => {},
  warn: () => {},
  error: (...args) => console.error(...args),
};

export async function fetchOfficialRaw({ timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(OFFICIAL_WORLDSTATE_URL, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'warframe-nexus/0.7.5 (community fan utility)',
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`official worldstate returned HTTP ${response.status}`);
    }
    const rawText = await response.text();
    if (rawText.length > 4 * 1024 * 1024) {
      throw new Error('official worldstate response was unexpectedly large');
    }
    let raw;
    try {
      raw = JSON.parse(rawText);
    } catch {
      throw new Error('official worldstate was not valid JSON');
    }
    if (!raw || typeof raw !== 'object' || !raw.Time) {
      throw new Error('official worldstate had an unexpected shape');
    }
    return { raw, rawText, upstream: OFFICIAL_WORLDSTATE_URL };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * The upstream parser optionally enriches bounty jobs through a community
 * drop-table API. That is explicitly not used here: while parsing, any request
 * to the community host is answered locally with an empty 404, so the project
 * only consumes the official DE feed. Bounty reward lists are omitted rather
 * than sourced from a third party.
 */
let parseQueue = Promise.resolve();

/**
 * Parsing temporarily replaces global fetch so the parser cannot call
 * community APIs. Keep parses serialized so concurrent builds cannot restore the real fetch
 * while another parse is still running. The parser always runs in English;
 * UI localization is applied from the official term table.
 */
export function parseOfficialWorldstate(rawText) {
  const task = parseQueue.then(() => parseOfficialWorldstateInternal(rawText));
  parseQueue = task.catch(() => {});
  return task;
}

async function parseOfficialWorldstateInternal(rawText) {
  const originalFetch = globalThis.fetch;
  let blockedRequests = 0;

  globalThis.fetch = async (input, init) => {
    const url = typeof input === 'string' ? input : input?.url || '';
    // The parser normally enriches bounty jobs from a community drop API.
    // Only the official host may be contacted during parsing; every other
    // request is answered locally instead of leaving the machine.
    if (!url.startsWith('https://api.warframe.com/')) {
      blockedRequests += 1;
      return new Response('{}', {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }
    return originalFetch(input, init);
  };

  try {
    const data = await WorldState.build(rawText, { locale: 'en', logger: quietLogger });
    if (blockedRequests > 0 && process.env.WF_DEBUG === '1') {
      console.info(`[official] blocked ${blockedRequests} non-official lookup request(s)`);
    }
    return sanitizeWorldstateData(data);
  } finally {
    globalThis.fetch = originalFetch;
  }
}

/**
 * Remove data that is not needed by this UI and any community CDN links that
 * the parser may attach to news/reward objects. The official feed remains the
 * only source of truth for the payload.
 */
export function sanitizeWorldstateData(data) {
  const clone = JSON.parse(JSON.stringify(data));
  delete clone.news;
  // Bounty reward pools are not part of the official feed. The parser can
  // normally fill them from a community API, but that lookup is disabled here.
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

export async function loadOfficialWorldstate() {
  const { rawText, upstream } = await fetchOfficialRaw();
  const data = await parseOfficialWorldstate(rawText);
  if (!data || !data.timestamp) {
    throw new Error('official worldstate parser returned no timestamp');
  }
  return { data, upstream };
}
