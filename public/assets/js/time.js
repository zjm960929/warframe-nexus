export const DARVO_CYCLE_MS = 26 * 3_600_000;
// Darvo deals cycle every 26 hours; use a known API activation as the phase
// anchor when the feed does not expose the current deal.
const DARVO_FALLBACK_ANCHOR_MS = Date.UTC(2026, 10, 27, 1, 0, 0);

const EASTERN_CLOCK = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'America/Toronto',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  hourCycle: 'h23',
});

function easternParts(value) {
  const parts = Object.fromEntries(
    EASTERN_CLOCK.formatToParts(value)
      .filter((part) => part.type !== 'literal')
      .map((part) => [part.type, part.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour),
  };
}

export function sortieFallbackToken(now = new Date()) {
  const current = easternParts(now);
  if (current.hour >= 12) return `sortie:${current.date}`;
  const previous = easternParts(new Date(now.getTime() - 86_400_000));
  return `sortie:${previous.date}`;
}

export function darvoFallbackToken(now = new Date()) {
  const cycle = Math.floor((now.getTime() - DARVO_FALLBACK_ANCHOR_MS) / DARVO_CYCLE_MS);
  const start = DARVO_FALLBACK_ANCHOR_MS + cycle * DARVO_CYCLE_MS;
  return `darvo:${new Date(start).toISOString()}`;
}
