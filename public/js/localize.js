/**
 * Locale-aware helpers for worldstate values.
 *
 * The Chinese dictionary is generated from the official ee-localization table.
 * When an English value has no direct official entry, the original English is
 * kept instead of guessing a translation.
 */

export function normalizeKey(value) {
  return String(value ?? '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function hasCjk(value) {
  return /[\u3400-\u9fff]/u.test(String(value ?? ''));
}

const REGION_ALIASES = new Map([
  ['kuva 要塞', '赤毒要塞'],
  ['kuva fortress', '赤毒要塞'],
]);

export function createLocalizer(lang, terms) {
  const isZh = lang === 'zh';
  const data = terms || {};
  const strings = data.strings || {};
  const nodes = data.nodes || {};
  const regions = data.regions || {};
  const missionTypes = data.missionTypes || {};
  const bountyTypes = data.bountyTypes || {};
  const factions = data.factions || {};
  const syndicates = data.syndicates || {};
  const tiers = data.tiers || {};
  const states = data.states || {};
  const suffixes = data.suffixes || {};
  const elements = data.elements || {};
  const modifierBases = data.modifierBases || {};
  const modifierFlavors = data.modifierFlavors || {};
  const charMap = data.charMap || {};
  const templateEntries = Object.values(data.templates || {});
  const conquestData = data.conquest || { conditions: {}, lab: {}, hex: {}, personal: {} };

  function simplify(value) {
    if (!isZh || !value) return String(value ?? '');
    let output = '';
    for (const char of String(value)) {
      output += charMap[char] || char;
    }
    return output;
  }

  function normalizeChineseCopy(value) {
    const input = String(value ?? '');
    if (!isZh || !hasCjk(input)) return input;
    return input
      .replace(/([\u3400-\u9fff])([A-Za-z0-9])/g, '$1 $2')
      .replace(/([A-Za-z0-9])([\u3400-\u9fff])/g, '$1 $2')
      .replace(/\s+([，。！？；：、）】」』])/g, '$1')
      .replace(/([（【「『])\s+/g, '$1')
      .replace(/\(([^()]*)\)/g, '（$1）')
      .replace(/(\d),(\d)/g, '$1\u0000$2')
      .replace(/,/g, '，')
      .replace(/\u0000/g, ',')
      .replace(/;/g, '；')
      .replace(/!/g, '！')
      .replace(/\?/g, '？')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function exact(value) {
    if (!isZh) return null;
    const key = normalizeKey(value);
    const withoutTerminalPunctuation = key.replace(/[.!?]+$/, '').trim();
    const hit = strings[key]
      || strings[withoutTerminalPunctuation]
      || strings[`${withoutTerminalPunctuation}.`];
    return hit ? normalizeChineseCopy(simplify(hit)) : null;
  }

  function template(value) {
    if (!isZh || !templateEntries.length) return null;
    const input = normalizeKey(value)
      .replace(/\bany\s+(?=\d)/g, '')
      .replace(/[.!?]+$/, '')
      .trim();
    if (!input) return null;
    for (const entry of templateEntries) {
      const en = normalizeKey(entry.en)
        .replace(/\bany\s+(?=\d)/g, '')
        .replace(/[.!?]+$/, '')
        .trim();
      const parts = en.split(/(\|[A-Za-z0-9_]+\||\{[^}]+\})/g);
      const pattern = `^${parts.map((part) => (
        /^(\|[A-Za-z0-9_]+\||\{[^}]+\})$/.test(part)
          ? '(.+?)'
          : part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      )).join('')}$`;
      const match = new RegExp(pattern, 'i').exec(input);
      if (!match) continue;
      let index = 1;
      const translated = entry.zh.replace(/(\|[A-Za-z0-9_]+\||\{[^}]+\})/g, () => match[index++] || '');
      if (hasCjk(translated)) return normalizeChineseCopy(simplify(translated));
    }
    return null;
  }

  function node(value) {
    const text = String(value ?? '').trim();
    if (!isZh) return text.replace(/\(Veil\)/g, '(Veil Proxima)');
    const match = /^(.*?)\s*[（(]([^）)]+)[）)]\s*$/.exec(text);
    if (!match) {
      return nodes[normalizeKey(text)] || exact(text) || simplify(text);
    }
    const base = match[1].trim();
    const region = match[2].trim();
    const translatedBase = nodes[normalizeKey(base)] || exact(base) || simplify(base);
    const regionKey = /^(veil|面纱)$/i.test(region) ? 'Veil Proxima' : normalizeKey(region);
    const translatedRegion = regions[regionKey] || regions[region]
      || REGION_ALIASES.get(regionKey) || exact(regionKey) || simplify(regionKey);
    return `${translatedBase}（${translatedRegion}）`;
  }

  function component(value) {
    const match = /^(.+?)\s+(Chassis|Neuroptics|Systems)$/i.exec(value);
    if (!match) return null;
    const prefix = match[1];
    const part = match[2];
    const suffix = suffixes[part[0].toUpperCase() + part.slice(1).toLowerCase()] || part;
    return `${prefix} ${suffix}`;
  }

  function item(value) {
    let text = String(value ?? '').trim();
    if (!text) return '';
    if (!isZh) return text;

    const countMatch = /^(\d+)\s*[xX×]\s+(.+)$/.exec(text);
    if (countMatch) {
      return `${countMatch[1]} × ${item(countMatch[2])}`;
    }

    const direct = exact(text);
    if (direct) return direct;

    const creditMatch = /^([\d,]+)\s+Credits? Cache$/i.exec(text);
    if (creditMatch) return `${creditMatch[1]} 现金匣`;

    const blueprint = /^(.+?)\s+Blueprint$/i.exec(text);
    if (blueprint) {
      const base = blueprint[1];
      const translated = exact(base) || component(base) || simplify(base);
      const suffix = suffixes.Blueprint || '蓝图';
      return `${translated}${/[A-Za-z0-9]$/.test(translated) ? ' ' : ''}${suffix}`;
    }

    const amount = /^([\d,]+)\s+(.+)$/.exec(text);
    if (amount && !/^\d+\s*[xX×]\s+/.test(text)) {
      return `${amount[1]} ${item(amount[2])}`;
    }

    const relic = /^(Lith|Meso|Neo|Axi|Requiem)\s+(.+?)\s+Relic$/i.exec(text);
    if (relic) {
      const era = tiers[relic[1][0].toUpperCase() + relic[1].slice(1).toLowerCase()] || relic[1];
      return `${era} ${relic[2]} 遗物`;
    }

    const comp = component(text);
    if (comp) return comp;

    return simplify(text);
  }

  function missionType(key, fallback = '') {
    if (!isZh) return fallback || key || '';
    const dark = /^Dark Sector\s+/i.test(fallback);
    const base = dark ? fallback.replace(/^Dark Sector\s+/i, '') : fallback;
    let value = missionTypes[key] || '';
    if (!value) value = text(base) || node(base) || simplify(base || key) || '';
    value = value.trim();
    if (dark && value) {
      const prefix = exact('Dark Sector') || '黑暗地带';
      if (!value.startsWith(prefix)) value = `${prefix}${value}`;
    }
    return value || fallback;
  }

  function faction(key, fallback = '') {
    if (!isZh) return fallback || key || '';
    return factions[key] || factions[fallback] || exact(key) || simplify(fallback || key);
  }

  function syndicate(key, fallback = '') {
    if (!isZh) return fallback || key || '';
    return syndicates[key] || exact(key) || simplify(fallback || key);
  }

  function tier(key, fallback = '') {
    if (!isZh) return fallback || key || '';
    return tiers[key] || exact(fallback) || simplify(fallback || key);
  }

  function state(key) {
    if (!isZh) return key;
    return states[key] || simplify(key);
  }

  function modifier(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (!isZh) return text;
    const direct = exact(text);
    if (direct) return direct;
    const aliases = {
      'enhanced enemy armor': 'Augmented Enemy Armor',
      'enhanced enemy shields': 'Augmented Enemy Shields',
    };
    const alias = aliases[normalizeKey(text)];
    if (alias) return exact(alias) || text;
    const match = /^(Enemy (?:Elemental|Physical) Enhancement):\s*(.+)$/i.exec(text);
    if (match) {
      const base = modifierBases[match[1]] || match[1];
      const element = elements[match[2]] || match[2];
      return `${base}：${element}`;
    }
    return simplify(text);
  }

  function modifierFlavor(value) {
    const text = String(value ?? '').trim();
    if (!isZh || !text) return null;
    const [name, detail] = text.split(/:\s*/, 2);
    const key = normalizeKey(name);
    const aliases = {
      'enhanced enemy armor': 'augmented enemy armor',
      'enhanced enemy shields': 'augmented enemy shields',
    };
    let flavor = modifierFlavors[aliases[key] || key];
    if (!flavor) return null;
    if (detail) {
      flavor = flavor
        .replace(/\|DAMAGE_TYPE\|/gi, elements[detail] || detail)
        .replace(/\|WEAPON_TYPE\|/gi, detail);
    }
    return normalizeChineseCopy(simplify(flavor));
  }

  function sentence(value) {
    const raw = String(value || '').trim();
    const translated = isZh ? (exact(raw) || template(raw)) : null;
    const text = normalizeChineseCopy(translated || simplify(raw));
    if (!text) return '';
    if (/[\u3002\uFF01\uFF1F\u2026\u201D]$/.test(text)) return text;
    return /[\u3400-\u9fff]/u.test(text) ? `${text}\u3002` : `${text}.`;
  }

  function fillTemplate(template, fallback) {
    let text = String(template || '').trim();
    if (!text) return '';
    if (!/\|[^|]+\|/.test(text)) return text;

    const fallbackText = String(fallback || '');
    const percent = fallbackText.match(/-?\d+(?:\.\d+)?\s*%/);
    const number = fallbackText.match(/-?\d+(?:\.\d+)?/);
    const value = percent ? percent[0].replace(/\s*%$/, '') : number ? number[0] : '';

    if (!value) {
      const missing = isZh ? '（官方数值未提供）' : '(value not provided)';
      return text.replace(/\s*\|[^|]+\|\s*/g, missing).trim();
    }
    text = text.replace(/\|(?:val|percent|count|time|amount)\|/gi, value);
    text = text.replace(/\|[^|]+\|/g, '');
    return text.trim();
  }

  function bountyType(value) {
    const text = String(value ?? '').trim();
    if (!text) return '';
    if (!isZh) return text;
    const vault = /^Isolation Vault Chamber ([A-C])$/i.exec(text);
    if (vault) return `隔离库（Chamber ${vault[1].toUpperCase()}）`;
    return bountyTypes[normalizeKey(text)] || exact(text) || simplify(text);
  }

  function conquest(kind, key, field = 'name', fallback = '') {
    if (!isZh) return fallback || '';
    const table = kind === 'deep' ? conquestData.lab : kind === 'temporal' ? conquestData.hex : conquestData.conditions;
    const entry = key ? table?.[key] : null;
    let value = entry?.[field] || text(fallback);
    if (field === 'description') {
      value = fillTemplate(value, fallback);
      if (!value) return '';
      value = sentence(value);
    }
    return value;
  }

  function personal(key, field = 'name', fallback = '') {
    if (!isZh) return fallback || '';
    const entry = key ? conquestData.personal?.[key] : null;
    let value = entry?.[field] || text(fallback);
    if (field === 'description') {
      value = fillTemplate(value, fallback);
      if (!value) return '';
      value = sentence(value);
    }
    return value;
  }

  function text(value) {
    const raw = String(value ?? '').trim();
    if (!raw) return '';
    if (!isZh) return raw;
    if (hasCjk(raw)) return normalizeChineseCopy(simplify(raw));
    const direct = exact(raw);
    if (direct) return direct;
    const templated = template(raw);
    if (templated) return templated;
    if (/^.+ \([^)]+\)$/.test(raw)) return node(raw);
    if (/^\d+\s*[xX]\s+/.test(raw) || /\bBlueprint\b/i.test(raw) || /\bRelic\b/i.test(raw)) {
      return item(raw);
    }
    return normalizeChineseCopy(simplify(raw));
  }

  function reward(rewardValue) {
    if (!rewardValue) return [];
    const output = [];
    if (Number(rewardValue.credits) > 0) {
      output.push(`${Number(rewardValue.credits)} ${isZh ? '现金' : 'Credits'}`);
    }
    for (const entry of Array.isArray(rewardValue.items) ? rewardValue.items : []) {
      const name = item(entry.name || entry.label || '');
      if (!name) continue;
      const count = Number(entry.count) || 1;
      output.push(count > 1 ? `${count} × ${name}` : name);
    }
    return output;
  }

  return {
    lang,
    terms: data,
    isZh,
    simplify,
    exact,
    node,
    item,
    missionType,
    faction,
    syndicate,
    tier,
    state,
    modifier,
    modifierFlavor,
    bountyType,
    normalizeChineseCopy,
    sentence,
    conquest,
    personal,
    text,
    reward,
  };
}
