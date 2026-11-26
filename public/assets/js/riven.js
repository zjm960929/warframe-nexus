import {
  RIVEN_DISPOSITION,
  RIVEN_NAME_PARTS,
  RIVEN_STAT_META,
} from './riven-data.js';
import {
  RIVEN_SPLICE_META,
  RIVEN_SPLICE_NAME_PARTS,
} from './riven-splice-data.js';

export function statMeta(tag) {
  return RIVEN_STAT_META[tag] || RIVEN_SPLICE_META[tag] || null;
}

const POSITIVE_ATTEN = [0, 1, 0.66000003, 0.5, 0.40000001, 0.34999999];
const NEGATIVE_ATTEN = [0, 1, 0.33000001, 0.5, 1.25, 1.5];
const BASE_ATTEN = 1.5 * RIVEN_DISPOSITION * 10;

export function rivenRollForQuality(quality) {
  return 0.9 + (Math.min(100, Math.max(0, Number(quality) || 0)) / 100) * 0.2;
}

export function rivenValue(base, {
  rank = 8,
  buffs = 3,
  curses = 1,
  roll = 1,
  negative = false,
} = {}) {
  const level = Number(rank) + 1;
  if (negative) {
    return base * -1
      * BASE_ATTEN
      * roll
      * NEGATIVE_ATTEN[Math.min(Math.max(0, buffs), NEGATIVE_ATTEN.length - 1)]
      * POSITIVE_ATTEN[Math.min(Math.max(0, curses), POSITIVE_ATTEN.length - 1)]
      * level;
  }
  return base
    * BASE_ATTEN
    * (1.25 ** curses)
    * roll
    * POSITIVE_ATTEN[Math.min(Math.max(0, buffs), POSITIVE_ATTEN.length - 1)]
    * level;
}

export function rivenRange(base, options = {}) {
  return {
    min: rivenValue(base, { ...options, roll: 0.9 }),
    current: rivenValue(base, { ...options, roll: options.roll ?? 1 }),
    max: rivenValue(base, { ...options, roll: 1.1 }),
  };
}

function signed(value, digits) {
  const amount = Math.abs(Number(value) || 0).toFixed(digits);
  return Number(value) < 0 ? `-${amount}` : `+${amount}`;
}

export function formatRivenValue(tag, value, lang = 'zh') {
  const meta = statMeta(tag);
  const shown = meta?.forceNegative ? -Math.abs(value) : value;
  const units = lang === 'zh'
    ? { seconds: ' 秒', meters: ' 米' }
    : { seconds: ' s', meters: ' m' };

  switch (meta?.kind) {
    case 'multiplier':
      return `x${(1 + shown).toFixed(2)}`;
    case 'seconds':
      return `${signed(shown, 2)}${units.seconds}`;
    case 'meters':
      return `${signed(shown, 2)}${units.meters}`;
    case 'number':
      return signed(shown, 1);
    case 'recoil':
    case 'percent':
    default:
      return `${signed(shown * 100, 1)}%`;
  }
}

export function rivenDisplayToRaw(tag, input) {
  const meta = statMeta(tag);
  const text = String(input ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/[％%]/g, '')
    .replace(/^[xX]/, '')
    .replace(/(秒|s|米|m)$/i, '')
    .replace(/^\+/, '');
  if (!text) return null;
  const number = Number(text);
  if (!Number.isFinite(number)) return null;
  if (meta?.kind === 'multiplier') return number - 1;
  if (meta?.kind === 'percent' || meta?.kind === 'recoil') return number / 100;
  return number;
}

export function rivenDisplayNumber(tag, value) {
  const meta = statMeta(tag);
  const shown = meta?.forceNegative ? -Math.abs(value) : value;
  switch (meta?.kind) {
    case 'multiplier':
      return 1 + shown;
    case 'seconds':
    case 'meters':
    case 'number':
      return shown;
    case 'recoil':
    case 'percent':
    default:
      return shown * 100;
  }
}

export function rivenRollFromDisplay(base, tag, display, {
  rank = 8,
  buffs = 3,
  curses = 1,
  negative = false,
} = {}) {
  const meta = statMeta(tag);
  const raw = rivenDisplayToRaw(tag, display);
  if (raw == null) return null;
  const adjusted = meta?.forceNegative ? Math.abs(raw) : raw;
  const denominator = negative
    ? -base
      * BASE_ATTEN
      * NEGATIVE_ATTEN[Math.min(Math.max(0, buffs), NEGATIVE_ATTEN.length - 1)]
      * POSITIVE_ATTEN[Math.min(Math.max(0, curses), POSITIVE_ATTEN.length - 1)]
      * (Number(rank) + 1)
    : base
      * BASE_ATTEN
      * (1.25 ** curses)
      * POSITIVE_ATTEN[Math.min(Math.max(0, buffs), POSITIVE_ATTEN.length - 1)]
      * (Number(rank) + 1);
  if (!denominator) return null;
  const roll = adjusted / denominator;
  // Display values are rounded to one decimal place. A value at the exact
  // 0.90x/1.10x endpoint can invert a fraction outside the range, so clamp
  // that tiny rounding error instead of showing a false out-of-range warning.
  const inRange = roll >= 0.9 - 0.02 && roll <= 1.1 + 0.02;
  const quality = inRange
    ? Math.min(100, Math.max(0, ((roll - 0.9) / 0.2) * 100))
    : ((roll - 0.9) / 0.2) * 100;
  return {
    display: Number(String(display).replace(/[^\d.+-]/g, '')),
    roll,
    quality,
    inRange,
  };
}

export function rivenNameFromStats(stats) {
  const usable = stats
    .filter((stat) => RIVEN_NAME_PARTS[stat.tag] || RIVEN_SPLICE_NAME_PARTS[stat.tag])
    .toSorted((a, b) => (b.roll - a.roll) || ((a.base ?? 0) - (b.base ?? 0)));
  if (usable.length < 2) return null;
  const parts = usable.map((stat) => RIVEN_NAME_PARTS[stat.tag] || RIVEN_SPLICE_NAME_PARTS[stat.tag]);
  const suffix = parts.at(-1).suffix;
  let name = parts[0].prefix[0].toUpperCase() + parts[0].prefix.slice(1);
  for (const part of parts.slice(1, -1)) name += `-${part.prefix}`;
  name += suffix;
  return { name, suffix };
}
