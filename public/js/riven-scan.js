// Helpers for turning OCR text from a Riven screenshot into analysis rows.
// The OCR service returns text only; this module keeps the matching logic
// deterministic so the result can be reviewed before the user applies it.

const UI_NOISE = [
  'riven',
  'calculator',
  '计算器',
  '数据分析',
  '分析结果',
  '裂罅类型',
  '属性设置',
  '属性',
  '数值',
  '平均值',
  '最低',
  '最高',
  '分析',
  '正面属性',
  '负面属性',
  '普通',
  '熔接',
  '无',
  '有',
  '等级',
  '段位',
  'title',
];

const RIVEN_NAME = /^[A-Za-z]{2,}(?:[-'][A-Za-z]{2,})+$/;

export function normalizeScanText(value) {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/[|｜]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compact(value) {
  return normalizeScanText(value)
    .toLowerCase()
    .replace(/[\s:：,，.。()（）[\]【】]/g, '')
    .replace(/[’']/g, '');
}

function valueFromLine(line) {
  const text = normalizeScanText(line)
    .replace(/[，]/g, ',')
    .replace(/[。]/g, '.')
    .replace(/(\d),(\d)/g, '$1.$2');
  const match = text.match(/([+-]?\s*\d+(?:\.\d+)?\s*%|\bx\s*\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return match[0].replace(/\s+/g, '').replace(/^x/i, 'x');
}

function findLabel(line, labels) {
  const source = compact(line);
  if (!source) return null;
  let best = null;
  for (const [label, tag] of labels) {
    if (!label || !source.includes(label)) continue;
    if (!best || label.length > best.label.length) best = { label, tag };
  }
  return best;
}

function looksLikeWeapon(line) {
  const text = normalizeScanText(line);
  if (!text || text.length > 60) return false;
  if (RIVEN_NAME.test(text)) return false;
  const lower = text.toLowerCase();
  if (UI_NOISE.some((word) => lower === word || lower.includes(word))) return false;
  return /[A-Za-z\u4e00-\u9fff]/.test(text);
}

export function detectRivenType(text, typeLabels = []) {
  const source = compact(text);
  if (!source) return null;
  const normalized = typeLabels
    .map(([label, type]) => [compact(label), type])
    .filter(([label]) => label)
    .sort((a, b) => b[0].length - a[0].length);
  let best = null;
  for (const [label, type] of normalized) {
    if (!source.includes(label)) continue;
    if (!best || label.length > best.label.length) best = { label, type };
  }
  return best?.type || null;
}

/**
 * Resolve a Riven type from exclusive stat evidence.
 *
 * A stat that only exists on melee/Zaw weapons proves the weapon is melee or
 * Zaw; a stat that only exists on guns proves it is a gun. Weapon names and
 * explicit type text are only preferences inside the proven family, so a
 * conflicting OCR weapon name cannot override the stats.
 */
const hasMinus = (value) => String(value).trim().startsWith('-');

/**
 * Repair OCR section/sign mistakes before filling the calculator.
 *
 * A stat's displayed value does not always reveal its section: positive
 * recoil is displayed as a negative number, while negative recoil is
 * displayed as a positive number. Conversely, the fourth parsed entry may
 * have lost its minus sign entirely. The callback-based metadata keeps this
 * function independent from the page and test fixture.
 */
export function normalizeScanEntries(result, {
  getMeta = () => null,
  getBase = () => null,
} = {}) {
  const slotFor = (entry, wantedNegative) => {
    const meta = getMeta(entry.tag);
    if (!meta) return null;
    if (meta.positive === false) return meta.negative === false ? null : 'negative';
    if (meta.negative === false) return 'positive';
    if (meta.kind === 'multiplier') {
      const numeric = Number(String(entry.value).trim().replace(/^x/i, ''));
      if (Number.isFinite(numeric) && numeric < 1) return 'negative';
      if (Number.isFinite(numeric) && numeric >= 1) return 'positive';
      return wantedNegative ? 'negative' : 'positive';
    }
    if (meta.key === 'recoil' || meta.sliderQuality) {
      if (hasMinus(entry.value)) return 'positive';
      if (String(entry.value).trim().startsWith('+')) return 'negative';
      return wantedNegative ? 'negative' : 'positive';
    }
    return wantedNegative ? 'negative' : 'positive';
  };

  const normalizePositive = (entry) => {
    const meta = getMeta(entry.tag);
    const base = getBase(entry.tag);
    let value = String(entry.value).trim();
    if ((meta?.key === 'recoil' || meta?.sliderQuality) && base < 0) {
      if (value.startsWith('+')) value = `-${value.slice(1)}`;
      else if (!value.startsWith('-')) value = `-${value}`;
    } else if (meta?.negative === false && value.startsWith('-')) {
      value = `+${value.slice(1)}`;
    }
    return { ...entry, value };
  };

  const normalizeNegative = (entry) => {
    const meta = getMeta(entry.tag);
    const base = getBase(entry.tag);
    let value = String(entry.value).trim();
    if (meta?.kind === 'multiplier') return { ...entry, value };
    if (meta?.forceNegative || (base != null && base > 0)) {
      value = value.startsWith('-') ? value
        : value.startsWith('+') ? `-${value.slice(1)}`
          : `-${value}`;
    } else if (base != null && base < 0) {
      value = value.startsWith('-') ? `+${value.slice(1)}`
        : value.startsWith('+') ? value
          : `+${value}`;
    }
    return { ...entry, value };
  };

  const positiveCandidates = [];
  const negativeCandidates = [];
  for (const entry of result.positive) {
    const slot = slotFor(entry, false);
    if (slot === 'positive') positiveCandidates.push(entry);
    else if (slot === 'negative') negativeCandidates.push({ entry, wantedNegative: false });
  }
  if (result.negative) {
    const slot = slotFor(result.negative, true);
    if (slot === 'negative') negativeCandidates.unshift({ entry: result.negative, wantedNegative: true });
    else if (slot === 'positive') positiveCandidates.push(result.negative);
  }

  const positive = positiveCandidates.slice(0, 3).map(normalizePositive);
  const negativeEntry = (negativeCandidates.find((candidate) => candidate.wantedNegative)
    || negativeCandidates[0])?.entry;
  return {
    ...result,
    positive,
    negative: negativeEntry ? normalizeNegative(negativeEntry) : null,
  };
}

export function inferRivenType({
  statTags = [],
  availableTypes = {},
  typeOrder = [],
  meleeTypes = ['melee', 'zaw'],
  gunTypes = ['rifle', 'shotgun', 'pistol', 'kitgun', 'archgun'],
  preferred = [],
} = {}) {
  const meleeSet = new Set(meleeTypes);
  const gunSet = new Set(gunTypes);
  const knownTypes = new Set(typeOrder);
  const preference = preferred.filter((type) => knownTypes.has(type));

  const familyOf = (tag) => {
    const types = (availableTypes[tag] || []).filter((type) => knownTypes.has(type));
    if (!types.length) return null;
    if (types.every((type) => meleeSet.has(type))) return 'melee';
    if (types.every((type) => gunSet.has(type))) return 'gun';
    return null;
  };

  const meleeEvidence = statTags.filter((tag) => familyOf(tag) === 'melee');
  const gunEvidence = statTags.filter((tag) => familyOf(tag) === 'gun');

  const pick = (tags, familyTypes) => {
    const candidates = new Set(familyTypes.filter((type) => knownTypes.has(type)));
    for (const tag of tags) {
      const available = new Set(availableTypes[tag] || []);
      for (const type of candidates) {
        if (!available.has(type)) candidates.delete(type);
      }
    }
    if (!candidates.size) return null;
    return preference.find((type) => candidates.has(type))
      || familyTypes.find((type) => candidates.has(type))
      || null;
  };

  if (meleeEvidence.length && !gunEvidence.length) {
    return pick(meleeEvidence, meleeTypes);
  }
  if (gunEvidence.length && !meleeEvidence.length) {
    return pick(gunEvidence, gunTypes);
  }
  if (meleeEvidence.length > gunEvidence.length) {
    return pick(meleeEvidence, meleeTypes);
  }
  if (gunEvidence.length > meleeEvidence.length) {
    return pick(gunEvidence, gunTypes);
  }
  return null;
}

/**
 * Parse OCR text into the subset understood by the calculator.
 *
 * The parser deliberately accepts several common OCR shapes:
 *   +202.7% 伤害
 *   伤害 +202.7%
 *   伤害
 *   +202.7%
 * and ignores calculator UI/table text.
 */
export function parseRivenScan(text, { labels = [], typeLabels = [] } = {}) {
  const lines = String(text ?? '')
    .split(/\r?\n/)
    .map(normalizeScanText)
    .filter(Boolean);
  const normalizedLabels = labels
    .map(([label, tag]) => [compact(label), tag])
    .filter(([label]) => label)
    .sort((a, b) => b[0].length - a[0].length);
  const normalizedTypes = typeLabels
    .map(([label, type]) => [compact(label), type])
    .filter(([label]) => label)
    .sort((a, b) => b[0].length - a[0].length);

  const found = [];
  const usedLines = new Set();
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const label = findLabel(line, normalizedLabels);
    if (!label) continue;
    let value = valueFromLine(line);
    if (!value) value = valueFromLine(lines[index + 1] || '');
    if (!value) continue;
    const negative = value.startsWith('-') || /^\d/.test(value) && /-\s*\d/.test(line);
    found.push({
      tag: label.tag,
      value,
      negative,
      index,
      line: `${line} ${value}`,
    });
    usedLines.add(index);
    if (valueFromLine(line) == null) usedLines.add(index + 1);
  }

  // OCR sometimes emits all labels first and all values afterwards. Pair any
  // remaining label-only lines with the next unused numeric line.
  if (!found.length) {
    const labelLines = lines
      .map((line, index) => ({ line, index, label: findLabel(line, normalizedLabels) }))
      .filter((entry) => entry.label);
    const valueLines = lines
      .map((line, index) => ({ line, index, value: valueFromLine(line) }))
      .filter((entry) => entry.value);
    for (let index = 0; index < Math.min(labelLines.length, valueLines.length); index += 1) {
      const label = labelLines[index];
      const value = valueLines[index];
      found.push({
        tag: label.label.tag,
        value: value.value,
        negative: value.value.startsWith('-'),
        index: label.index,
        line: `${label.line} ${value.line}`,
      });
    }
  }

  const deduped = [];
  const seen = new Set();
  for (const entry of found.sort((a, b) => a.index - b.index)) {
    if (seen.has(entry.tag)) continue;
    seen.add(entry.tag);
    deduped.push(entry);
  }

  const positive = deduped.filter((entry) => !entry.negative).slice(0, 3);
  let negative = deduped.find((entry) => entry.negative) || null;
  if (!negative && deduped.length === 4) negative = deduped[3];

  const weaponLine = lines.find((line, index) => (
    !usedLines.has(index)
    && !findLabel(line, normalizedLabels)
    && looksLikeWeapon(line)
  ));

  return {
    weapon: weaponLine || '',
    type: detectRivenType(text, normalizedTypes),
    positive: positive.map(({ tag, value }) => ({ tag, value })),
    negative: negative ? { tag: negative.tag, value: negative.value } : null,
    raw: lines,
  };
}
