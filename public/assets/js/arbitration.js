/**
 * Static arbitration rotation helpers.
 *
 * The provided `arbys.txt` format is one hourly entry per line:
 *   <unix timestamp>,<node key>
 * The schedule has no mission type; node names are resolved from a small
 * generated map produced from warframe-worldstate-data.
 */

export function parseArbitrationCsv(text) {
  const entries = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const comma = trimmed.indexOf(',');
    if (comma < 0) continue;
    const start = Number(trimmed.slice(0, comma));
    const nodeKey = trimmed.slice(comma + 1).trim();
    if (!Number.isFinite(start) || !nodeKey) continue;
    entries.push([start, nodeKey]);
  }
  entries.sort((a, b) => a[0] - b[0]);
  return entries;
}

export function getArbitrationRange(schedule, start, end, now = new Date()) {
  const entries = schedule?.entries || [];
  const nodes = schedule?.nodes || {};
  const nodeMeta = schedule?.nodeMeta || {};
  if (!entries.length) return [];

  const startMs = start.getTime();
  const endMs = end.getTime();
  const nowMs = now.getTime();
  let low = 0;
  let high = entries.length - 1;
  let index = entries.length;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (entries[mid][0] * 1000 + 3_600_000 > startMs) {
      index = mid;
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  const items = [];
  for (let i = index; i < entries.length; i += 1) {
    const [startSeconds, nodeKey] = entries[i];
    const activationMs = startSeconds * 1000;
    if (activationMs >= endMs) break;
    const expiryMs = activationMs + 3_600_000;
    if (expiryMs <= startMs) continue;
    const status = nowMs >= expiryMs ? 'past' : nowMs >= activationMs ? 'current' : 'upcoming';
    items.push({
      node: nodes[nodeKey] || nodeKey,
      nodeKey,
      ...(nodeMeta[nodeKey] || {}),
      activation: new Date(activationMs).toISOString(),
      expiry: new Date(expiryMs).toISOString(),
      remainingMs: Math.max(0, expiryMs - nowMs),
      status,
    });
  }
  return items;
}

export function resolveArbitration(schedule, now = new Date(), upcomingCount = 4) {
  const entries = schedule?.entries || [];
  const nodes = schedule?.nodes || {};
  const nodeMeta = schedule?.nodeMeta || {};
  if (!entries.length) return null;

  const nowSeconds = Math.floor(now.getTime() / 1000);
  let low = 0;
  let high = entries.length - 1;
  let index = -1;
  while (low <= high) {
    const mid = (low + high) >> 1;
    if (entries[mid][0] <= nowSeconds) {
      index = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  const toItem = ([start, nodeKey]) => ({
    node: nodes[nodeKey] || nodeKey,
    nodeKey,
    ...(nodeMeta[nodeKey] || {}),
    activation: new Date(start * 1000).toISOString(),
    expiry: new Date((start + 3600) * 1000).toISOString(),
    remainingMs: Math.max(0, (start + 3600) * 1000 - now.getTime()),
  });

  let current = null;
  let currentIndex = -1;
  if (index >= 0) {
    const candidate = entries[index];
    if (nowSeconds < candidate[0] + 3600) {
      current = toItem(candidate);
      currentIndex = index;
    }
  }

  const nextIndex = currentIndex >= 0
    ? currentIndex + 1
    : entries.findIndex(([start]) => start > nowSeconds);
  const next = nextIndex >= 0 && nextIndex < entries.length ? toItem(entries[nextIndex]) : null;

  const upcoming = [];
  let cursor = nextIndex >= 0 ? nextIndex + 1 : -1;
  while (cursor >= 0 && cursor < entries.length && upcoming.length < upcomingCount) {
    upcoming.push(toItem(entries[cursor]));
    cursor += 1;
  }

  return { current, next, upcoming };
}
