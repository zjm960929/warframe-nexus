import { el } from './dom.js';

const FACTION_SLUGS = {
  FC_GRINEER: 'grineer',
  FC_CORPUS: 'corpus',
  FC_INFESTATION: 'infested',
  FC_OROKIN: 'orokin',
  FC_CORRUPTED: 'orokin',
  FC_NARMER: 'narmer',
  FC_MURMUR: 'murmur',
  FC_SENTIENT: 'sentient',
  FC_AMALGAM: 'amalgam',
  FC_DEIMOS: 'deimos',
  FC_ENTRATI: 'deimos',
  FC_KUVA: 'kuva',
  FC_SCALDRA: 'scaldra',
  FC_TECHROT: 'techrot',
  grineer: 'grineer',
  corpus: 'corpus',
  infested: 'infested',
  infestation: 'infested',
  orokin: 'orokin',
  奥罗金: 'orokin',
  corrupted: 'orokin',
  narmer: 'narmer',
  合一众: 'narmer',
  murmur: 'murmur',
  低语者: 'murmur',
  sentient: 'sentient',
  灵煞: 'sentient',
  amalgam: 'amalgam',
  'amalgam corpus': 'amalgam',
  deimos: 'deimos',
  'deimos infested': 'deimos',
  kuva: 'kuva',
  'kuva grineer': 'kuva',
  scaldra: 'scaldra',
  techrot: 'techrot',
};

const NODE_VARIANTS = [
  {
    slug: 'kuva',
    node: /kuva\s*(?:fortress|要塞)|赤毒要塞/i,
    base: /FC_GRINEER|\bgrineer\b/i,
    zh: '赤毒 Grineer',
    en: 'Kuva Grineer',
  },
  {
    slug: 'amalgam',
    node: /jupiter|木星/i,
    base: /FC_CORPUS|\bcorpus\b/i,
    zh: '并合 Corpus',
    en: 'Amalgam Corpus',
  },
  {
    slug: 'deimos',
    node: /deimos|火卫二/i,
    base: /FC_INFESTATION|\binfest/i,
    zh: '火卫二 Infested',
    en: 'Deimos Infested',
  },
];

const VARIANT_LABELS = Object.fromEntries(
  NODE_VARIANTS.map((variant) => [variant.slug, { zh: variant.zh, en: variant.en }]),
);

export function factionVariant(item, node) {
  const location = String(node || '');
  if (!location) return null;
  const source = `${item?.factionKey || ''} ${item?.faction || ''}`;
  return NODE_VARIANTS.find((variant) => variant.node.test(location) && variant.base.test(source)) || null;
}

export function factionLabel(loc, item) {
  if (!item?.factionKey && !item?.faction) return '';
  if (!loc.isZh) return item.faction || '';
  return loc.faction(item.factionKey, item.faction).trim()
    || loc.text(item.faction).trim()
    || item.faction;
}

export function factionSlug(item) {
  if (!item) return null;
  const raw = String(item.faction || '').trim().toLowerCase();
  if (['kuva grineer', 'deimos infested', 'amalgam corpus'].includes(raw)) return FACTION_SLUGS[raw];
  if (item.factionKey && FACTION_SLUGS[item.factionKey]) return FACTION_SLUGS[item.factionKey];
  return FACTION_SLUGS[raw] || null;
}

export function factionMark(loc, item, { showText = true, className = '', node = item?.node } = {}) {
  const nodeVariant = factionVariant(item, node);
  const slug = nodeVariant?.slug || factionSlug(item);
  const explicitVariant = !nodeVariant && VARIANT_LABELS[slug]
    && /kuva|deimos|amalgam/i.test(item?.faction || '');
  const label = nodeVariant
    ? (loc.isZh ? nodeVariant.zh : nodeVariant.en)
    : explicitVariant
      ? (loc.isZh ? VARIANT_LABELS[slug].zh : VARIANT_LABELS[slug].en)
      : factionLabel(loc, item);
  if (!label) return null;
  if (!slug) return el('span', { class: className, text: label });

  const children = [
    el('span', {
      class: `faction-icon faction-icon--${slug}`,
      attrs: { 'aria-hidden': 'true' },
    }),
  ];
  if (showText) {
    children.push(el('span', { class: 'faction-mark__text', text: label }));
  }
  return el('span', {
    class: `faction-mark faction-mark--${slug}${className ? ` ${className}` : ''}`,
    attrs: {
      role: 'img',
      'aria-label': label,
      title: label,
    },
  }, children);
}
