import {
  badge,
  el,
  emptyState,
  meter,
  sectionHeader,
  timeElement,
} from '../dom.js';
import { factionMark } from '../factions.js';
import { icon } from '../icons.js';
import { hasCjk } from '../localize.js';
import { findRivenWeapon } from '../riven-weapons.js';
import { darvoFallbackToken, sortieFallbackToken } from '../time.js';
import { resolveSteelPathIncursions } from '../steel-path-incursions.js';

const LAYOUT_KEY = 'wf-nexus-worldstate-layout';
const WIDTH_KEY = 'wf-nexus-worldstate-widths';
const HIDDEN_KEY = 'wf-nexus-worldstate-hidden';
const COMPLETED_KEY = 'wf-nexus-worldstate-completed';
const LAYOUT_VERSION_KEY = 'wf-nexus-worldstate-layout-version';
const LAYOUT_VERSION = '5';

const COMPLETABLE_MODULES = new Set([
  'arbitration', 'sortie', 'archon', 'nightwave', 'circuit',
  'archimedeaDeep', 'archimedeaTemporal', 'steelPathShop', 'steelPathIncursions', 'darvo',
]);

const MODULE_DEFS = [
  { key: 'cycles', labelKey: 'section.cycles', span: 'flex', preferred: 12, min: 4, max: 12 },
  { key: 'events', labelKey: 'section.events', span: 'flex', preferred: 12, min: 4, max: 12 },
  { key: 'alerts', labelKey: 'section.alerts', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'invasions', labelKey: 'section.invasions', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'arbitration', labelKey: 'section.arbitration', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'sortie', labelKey: 'section.sortie', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'archon', labelKey: 'section.archon', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'fissuresNormal', labelKey: 'section.fissuresNormal', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'fissuresSteel', labelKey: 'section.fissuresSteel', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'fissuresStorm', labelKey: 'section.fissuresStorm', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'nightwave', labelKey: 'section.nightwave', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'circuit', labelKey: 'section.circuit', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'archimedeaDeep', labelKey: 'section.archimedeaDeep', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'archimedeaTemporal', labelKey: 'section.archimedeaTemporal', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'steelPathIncursions', labelKey: 'section.steelPathIncursions', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'steelPathShop', labelKey: 'section.steelPathShop', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'darvo', labelKey: 'section.darvo', span: 'flex', preferred: 4, min: 4, max: 8 },
];

const LEGACY_DEFAULT_LAYOUT = [
  'cycles', 'darvo', 'nightwave', 'arbitration', 'alerts', 'invasions', 'events',
  'sortie', 'archon', 'circuit', 'steelPath', 'archimedeaDeep', 'archimedeaTemporal',
  'fissuresNormal', 'fissuresSteel', 'fissuresStorm',
];

const PREVIOUS_DEFAULT_LAYOUT = [
  'cycles', 'arbitration', 'sortie', 'archon',
  'fissuresNormal', 'fissuresSteel', 'fissuresStorm',
  'alerts', 'invasions', 'events', 'nightwave', 'circuit',
  'archimedeaDeep', 'archimedeaTemporal',
  'steelPathIncursions', 'steelPathShop', 'darvo',
];

const PREVIOUS_DEFAULT_LAYOUT_V3 = [
  'cycles', 'events', 'arbitration', 'sortie', 'archon',
  'fissuresNormal', 'fissuresSteel', 'fissuresStorm',
  'alerts', 'invasions', 'nightwave', 'circuit',
  'archimedeaDeep', 'archimedeaTemporal',
  'steelPathIncursions', 'steelPathShop', 'darvo',
];

const CIRCUIT_ROTATION = {
  warframes: [
    { label: '1', names: ['Excalibur', 'Trinity', 'Ember'] },
    { label: '2', names: ['Loki', 'Mag', 'Rhino'] },
    { label: '3', names: ['Ash', 'Frost', 'Nyx'] },
    { label: '4', names: ['Saryn', 'Vauban', 'Nova'] },
    { label: '5', names: ['Nekros', 'Valkyr', 'Oberon'] },
    { label: '6', names: ['Hydroid', 'Mirage', 'Limbo'] },
    { label: '7', names: ['Mesa', 'Chroma', 'Atlas'] },
    { label: '8', names: ['Ivara', 'Inaros', 'Titania'] },
    { label: '9', names: ['Nidus', 'Octavia', 'Harrow'] },
    { label: '10', names: ['Gara', 'Khora', 'Revenant'] },
    { label: '11', names: ['Garuda', 'Baruuk', 'Hildryn'] },
  ],
  incarnons: [
    { label: 'A', names: ['Braton', 'Lato', 'Skana', 'Paris', 'Kunai'] },
    { label: 'B', names: ['Boar', 'Gammacor', 'Angstrum', 'Gorgon', 'Anku'] },
    { label: 'C', names: ['Bo', 'Latron', 'Furis', 'Furax', 'Strun'] },
    { label: 'D', names: ['Lex', 'Magistar', 'Boltor', 'Bronco', 'Ceramic Dagger'] },
    { label: 'E', names: ['Torid', 'Dual Toxocyst', 'Dual Ichor', 'Miter', 'Atomos'] },
    { label: 'F', names: ['Ack & Brunt', 'Soma', 'Vasto', 'Nami Solo', 'Burston'] },
    { label: 'G', names: ['Zylok', 'Sibear', 'Dread', 'Despair', 'Hate'] },
    { label: 'H', names: ['Dera', 'Sybaris', 'Cestra', 'Sicarus', 'Okina'] },
    { label: 'I', names: ['Vectis', 'Stug', 'Ballistica', 'Destreza', 'Obex'] },
  ],
};

const DEFAULT_LAYOUT = MODULE_DEFS.map((module) => module.key);
const MODULE_BY_KEY = new Map(MODULE_DEFS.map((module) => [module.key, module]));
const MASONRY_ROW_HEIGHT = 8;

function loadLayoutOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (!Array.isArray(parsed)) {
      const next = [...DEFAULT_LAYOUT];
      saveLayoutOrder(next);
      return next;
    }
    const expanded = [];
    for (const key of parsed) {
      if (key === 'archimedea') expanded.push('archimedeaDeep', 'archimedeaTemporal');
      else if (key === 'fissures') expanded.push('fissuresNormal', 'fissuresSteel', 'fissuresStorm');
      else if (key === 'steelPath') expanded.push('steelPathIncursions', 'steelPathShop');
      else expanded.push(key);
    }
    const valid = expanded.filter((key) => MODULE_BY_KEY.has(key));
    for (const key of DEFAULT_LAYOUT) {
      if (!valid.includes(key)) valid.push(key);
    }
    const expandDefault = (keys) => keys.flatMap((key) => {
      if (key === 'archimedea') return ['archimedeaDeep', 'archimedeaTemporal'];
      if (key === 'fissures') return ['fissuresNormal', 'fissuresSteel', 'fissuresStorm'];
      if (key === 'steelPath') return ['steelPathIncursions', 'steelPathShop'];
      return [key];
    });
    const version = localStorage.getItem(LAYOUT_VERSION_KEY);
    const knownDefaults = [
      PREVIOUS_DEFAULT_LAYOUT_V3,
      PREVIOUS_DEFAULT_LAYOUT,
      expandDefault(LEGACY_DEFAULT_LAYOUT),
    ];
    const isKnownDefault = knownDefaults.some(
      (layout) => valid.join('\u0000') === layout.join('\u0000'),
    );
    if (version !== LAYOUT_VERSION && isKnownDefault) {
      localStorage.removeItem(WIDTH_KEY);
      const next = [...DEFAULT_LAYOUT];
      saveLayoutOrder(next);
      return next;
    }
    localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
    return valid;
  } catch {
    return [...DEFAULT_LAYOUT];
  }
}

function saveLayoutOrder(order) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(order));
    localStorage.setItem(LAYOUT_VERSION_KEY, LAYOUT_VERSION);
  } catch {
    // Storage may be unavailable (private mode / file:// restrictions).
  }
}

function loadLayoutWidths() {
  try {
    const parsed = JSON.parse(localStorage.getItem(WIDTH_KEY) || 'null');
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([key, width]) => {
          const module = MODULE_BY_KEY.get(key);
          return module
            && Number.isInteger(width)
            && width >= module.min
            && width <= module.max;
        })
        .map(([key, width]) => [key, width]),
    );
  } catch {
    return {};
  }
}

function saveLayoutWidths(widths) {
  try {
    localStorage.setItem(WIDTH_KEY, JSON.stringify(widths));
  } catch {
    // Storage may be unavailable (private mode / file:// restrictions).
  }
}

function loadHiddenModules() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HIDDEN_KEY) || '[]');
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((key) => MODULE_BY_KEY.has(key)));
  } catch {
    return new Set();
  }
}

function saveHiddenModules(hidden) {
  try {
    localStorage.setItem(HIDDEN_KEY, JSON.stringify([...hidden]));
  } catch {
    // Storage may be unavailable (private mode / file:// restrictions).
  }
}

function loadCompletedModules() {
  try {
    const parsed = JSON.parse(localStorage.getItem(COMPLETED_KEY) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(([key, token]) => (
        COMPLETABLE_MODULES.has(key) && typeof token === 'string'
      )),
    );
  } catch {
    return {};
  }
}

function saveCompletedModules(completed) {
  try {
    localStorage.setItem(COMPLETED_KEY, JSON.stringify(completed));
  } catch {
    // Storage may be unavailable (private mode / file:// restrictions).
  }
}



function dailyCompletionToken(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function weeklyCompletionToken(date = new Date()) {
  const start = new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  ));
  start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7));
  return start.toISOString().slice(0, 10);
}

function completionToken(key, model) {
  if (!model) return null;
  if (key === 'arbitration') {
    return `arbitration:${Math.floor(Date.now() / 3_600_000)}`;
  }
  if (key === 'sortie') {
    return `sortie:${model.sortie?.end || sortieFallbackToken()}`;
  }
  if (key === 'steelPathShop') {
    return `steelPathShop:${model.steelPath?.activation || weeklyCompletionToken()}`;
  }
  if (key === 'steelPathIncursions') {
    return `steelPathIncursions:${model.steelPath?.incursions?.expiry || dailyCompletionToken()}`;
  }
  if (key === 'darvo') {
    return `darvo:${model.darvo?.activation || model.darvo?.end || darvoFallbackToken()}`;
  }
  if (key === 'nightwave') {
    return `nightwave:${model.nightwave?.season || ''}:${weeklyCompletionToken()}`;
  }
  if (key === 'archon') {
    return `archon:${model.archon?.activation || weeklyCompletionToken()}`;
  }
  if (key === 'circuit') return `circuit:${weeklyCompletionToken()}`;
  if (key === 'archimedeaDeep' || key === 'archimedeaTemporal') {
    const kind = key === 'archimedeaDeep' ? 'deep' : 'temporal';
    const entry = model.archimedeas?.find((item) => item.kind === kind);
    return `${key}:${entry?.end || weeklyCompletionToken()}`;
  }
  return null;
}

function marked(tag, text, loc, className = '') {
  const node = el(tag, { class: className, text });
  if (loc.isZh && text && !hasCjk(text) && /[A-Za-z]/.test(text)) node.setAttribute('lang', 'en');
  return node;
}

function localized(tag, value, loc, className = '') {
  return marked(tag, loc.text(value), loc, className);
}

function localizedSentence(tag, value, loc, className = '') {
  return marked(tag, loc.sentence(value), loc, className);
}

function localizedNode(value, loc, className = '') {
  const text = loc.node(value);
  const node = el('span', { class: className, text });
  if (loc.isZh && text && !hasCjk(text) && /[A-Za-z]/.test(text)) node.setAttribute('lang', 'en');
  return node;
}

const NEXT_CYCLE_STATE = {
  day: 'night',
  night: 'day',
  warm: 'cold',
  cold: 'warm',
  fass: 'vome',
  vome: 'fass',
  corpus: 'grineer',
  grineer: 'corpus',
  joy: 'anger',
  anger: 'envy',
  envy: 'sorrow',
  sorrow: 'fear',
  fear: 'joy',
  spring: 'summer',
  summer: 'autumn',
  autumn: 'winter',
  winter: 'spring',
};

function cycleStateLabel(i18n, state) {
  const key = `cycle.state.${state}`;
  return i18n.messages[key] ? i18n.t(key) : state;
}

function section(id, i18n, titleKey, content, options = {}) {
  const { count, hintKey } = options;
  return el('section', { class: 'panel', id, attrs: { 'aria-labelledby': `${id}-title` } },
    sectionHeader(i18n, i18n.t(titleKey), {
      id: `${id}-title`,
      count,
      hint: hintKey ? i18n.t(hintKey) : '',
    }),
    content,
  );
}

function renderCycles(model, i18n, loc) {
  const grid = el('div', { class: 'cycle-grid' });
  for (const reset of [
    { id: 'daily-reset', labelKey: 'cycle.dailyReset', hintKey: 'cycle.dailyResetHint', end: model.dailyReset },
    { id: 'weekly-reset', labelKey: 'cycle.weeklyReset', hintKey: 'cycle.weeklyResetHint', end: model.weeklyReset },
  ]) {
    if (!reset.end) continue;
    grid.append(el('article', { class: 'cycle-card cycle-card--reset' },
      el('div', { class: 'cycle-card__top' },
        el('h3', { text: i18n.t(reset.labelKey) }),
        badge(i18n.t(reset.hintKey), 'muted'),
      ),
      el('div', { class: 'cycle-card__timer' },
        timeElement(i18n, reset.end, 'countdown countdown--large'),
      ),
    ));
  }
  for (const cycle of model.cycles) {
    if (cycle.id === 'earth') continue;
    const stateKey = `cycle.state.${cycle.state}`;
    const stateLabel = i18n.messages[stateKey] ? i18n.t(stateKey) : cycle.state;
    const variant = ['day', 'warm', 'joy', 'spring', 'summer'].includes(cycle.state)
      ? 'gold'
      : ['night', 'cold', 'anger', 'autumn', 'winter'].includes(cycle.state) ? 'blue' : 'muted';
    const labelKey = cycle.id === 'cetus' ? 'cycle.earthCetus' : `cycle.${cycle.id}`;
    const nextState = NEXT_CYCLE_STATE[cycle.state];
    grid.append(el('article', { class: 'cycle-card' },
      el('div', { class: 'cycle-card__top' },
        el('h3', { text: i18n.t(labelKey) }),
        badge(stateLabel, variant),
      ),
      el('div', { class: 'cycle-card__timer' },
        timeElement(i18n, cycle.end, 'countdown countdown--large'),
      ),
      nextState ? el('div', { class: 'cycle-card__next' },
        el('span', { class: 'label', text: i18n.t('cycle.nextState') }),
        badge(cycleStateLabel(i18n, nextState), 'muted'),
      ) : null,
    ));
  }
  return section('cycles', i18n, 'section.cycles', grid);
}

function renderDarvo(model, i18n, loc) {
  const content = model.darvo
    ? el('div', { class: 'darvo-card' },
      el('div', { class: 'darvo-card__head' },
        el('div', { class: 'darvo-card__title' },
          localized('h3', model.darvo.item, loc),
          model.darvo.discount > 0
            ? badge(i18n.t('darvo.discount', { discount: model.darvo.discount }), 'gold')
            : null,
        ),
      ),
      el('dl', { class: 'stat-list' },
        el('div', {}, el('dt', { text: i18n.t('darvo.sale') }), el('dd', { text: `${i18n.formatNumber(model.darvo.salePrice)} ${i18n.t('darvo.platinum')}` })),
        el('div', {}, el('dt', { text: i18n.t('darvo.original') }), el('dd', { class: 'muted', text: `${i18n.formatNumber(model.darvo.originalPrice)} ${i18n.t('darvo.platinum')}` })),
        el('div', {}, el('dt', { text: i18n.t('darvo.stock') }), el('dd', { text: i18n.formatNumber(Math.max(0, model.darvo.total - model.darvo.sold)) })),
      ),
    )
    : emptyState(i18n.t('darvo.empty'));
  const sectionNode = section('darvo', i18n, 'section.darvo', content);
  if (model.darvo?.end) {
    sectionNode.querySelector('.section-heading')?.append(
      el('span', { class: 'module-countdown' },
        timeElement(i18n, model.darvo.end),
      ),
    );
  }
  return sectionNode;
}

function renderNightwave(model, i18n, loc) {
  const nightwave = model.nightwave;
  if (!nightwave || (!nightwave.daily.length && !nightwave.weekly.length)) {
    return section('nightwave', i18n, 'section.nightwave', emptyState(i18n.t('nightwave.empty')));
  }

  const list = (challenges, typeKey) => {
    if (!challenges.length) return emptyState(i18n.t('common.empty'));
    return el('ul', { class: 'challenge-list' }, challenges.map((challenge) => el('li', { class: 'challenge' },
      el('div', { class: 'challenge__head' },
        localized('strong', challenge.title, loc),
        el('span', { class: 'challenge__badges' },
          challenge.isElite ? badge(i18n.t('nightwave.elite'), 'gold') : null,
          challenge.reputation > 0 ? badge(i18n.t('nightwave.reputation', { value: i18n.formatNumber(challenge.reputation) }), 'muted') : null,
        ),
      ),
      localizedSentence('p', challenge.description, loc, 'challenge__desc'),
      challenge.end ? el('div', { class: 'challenge__foot' },
        el('span', { class: 'muted', text: i18n.t('common.endsAt') }),
        timeElement(i18n, challenge.end, 'countdown countdown--small'),
      ) : null,
    )));
  };

  const nightwaveEndMs = nightwave.end ? new Date(nightwave.end).getTime() : NaN;
  const nightwaveRemaining = nightwaveEndMs - Date.now();
  const showNightwaveEnd = Number.isFinite(nightwaveRemaining)
    && nightwaveRemaining > 0
    && nightwaveRemaining <= 14 * 86_400_000;
  const content = el('div', {},
    el('div', { class: 'nightwave-head' },
      badge(i18n.t('nightwave.season', { season: nightwave.season }), 'blue'),
      showNightwaveEnd ? el('span', { class: 'muted', text: i18n.t('nightwave.ends') }) : null,
      showNightwaveEnd ? timeElement(i18n, nightwave.end) : null,
    ),
    el('div', { class: 'nightwave-columns' },
      el('div', {},
        el('h3', { class: 'subheading', text: i18n.t('nightwave.daily') }),
        list(nightwave.daily, 'daily'),
      ),
      el('div', {},
        el('h3', { class: 'subheading', text: i18n.t('nightwave.weekly') }),
        list(nightwave.weekly, 'weekly'),
      ),
    ),
  );
  return section('nightwave', i18n, 'section.nightwave', content, {
    count: nightwave.daily.length + nightwave.weekly.length,
  });
}

function renderArbitration(model, i18n, loc) {
  const current = model.arbitration;
  const next = model.nextArbitration;
  const upcoming = model.arbitrationUpcoming || [];

  if (!current && !next) {
    return section('arbitration', i18n, 'section.arbitration',
      el('div', {},
        emptyState(i18n.t('arbitration.empty')),
        el('p', { class: 'fine-print', text: i18n.t('arbitration.note') }),
        el('a', { class: 'text-link', href: '#/arbitration', text: i18n.t('arbitration.viewSchedule') }),
      ),
    );
  }

  const content = el('div', { class: 'arbitration-module' });
  if (current) {
    content.append(el('div', { class: 'arbitration-card' },
      el('div', { class: 'arbitration-card__main' },
        el('span', { class: 'muted', text: i18n.t('arbitration.current') }),
        el('div', { class: 'arbitration-card__title' },
          el('h3', {}, localizedNode(current.node, loc)),
          current.type ? badge(loc.missionType(current.typeKey, current.type), 'blue') : null,
          factionMark(loc, current, { className: 'badge badge--muted' }),
        ),
      ),
      el('div', { class: 'arbitration-card__time' },
        timeElement(i18n, current.end, 'countdown countdown--large'),
      ),
    ));
  }

  if (upcoming.length) {
    content.append(el('div', { class: 'arbitration-upcoming' },
      el('span', { class: 'label', text: i18n.t('arbitration.upcoming') }),
      el('ul', { class: 'arbitration-list' }, upcoming.map((item) => el('li', {},
        el('time', { datetime: item.activation, text: i18n.formatClock(item.activation) }),
        localizedNode(item.node, loc, 'arbitration-list__node'),
        item.type ? badge(loc.missionType(item.typeKey, item.type), 'blue') : null,
        factionMark(loc, item, { className: 'badge badge--muted' }),
        timeElement(i18n, item.activation, 'countdown countdown--small'),
      ))),
    ));
  }

  content.append(el('a', { class: 'text-link', href: '#/arbitration', text: i18n.t('arbitration.viewSchedule') }));
  return section('arbitration', i18n, 'section.arbitration', content);
}

function rewardChips(values) {
  if (!values.length) return null;
  return el('ul', { class: 'reward-list' }, values.map((value) => el('li', { text: value })));
}

function renderAlerts(model, i18n, loc) {
  if (!model.alerts.length) {
    return section('alerts', i18n, 'section.alerts', emptyState(i18n.t('alerts.empty')));
  }
  const list = el('div', { class: 'stack' }, model.alerts.map((alert) => el('article', { class: 'alert-card' },
    el('div', { class: 'alert-card__head' },
      el('div', { class: 'alert-card__summary' },
        badge(loc.missionType(alert.typeKey, alert.type), 'blue'),
        factionMark(loc, alert, { className: 'badge badge--muted' }),
        alert.minLevel || alert.maxLevel
          ? el('span', { class: 'muted', text: i18n.t('alerts.level', { min: alert.minLevel, max: alert.maxLevel }) })
          : null,
      ),
      timeElement(i18n, alert.end, 'countdown countdown--small'),
    ),
    localizedNode(alert.node, loc, 'alert-card__node'),
    el('div', { class: 'alert-card__reward' },
      el('span', { class: 'label', text: i18n.t('alerts.reward') }),
      rewardChips(loc.reward(alert.reward)) || el('span', { class: 'muted', text: i18n.t('common.notAvailable') }),
    ),
  )));
  return section('alerts', i18n, 'section.alerts', list, { count: model.alerts.length });
}

function sideLabel(i18n, sideKey) {
  return i18n.t(`invasions.${sideKey}`);
}

function renderInvasions(model, i18n, loc) {
  if (!model.invasions.length) {
    return section('invasions', i18n, 'section.invasions', emptyState(i18n.t('invasions.empty')));
  }
  const list = el('div', { class: 'stack' }, model.invasions.map((invasion) => {
    const sides = [
      { key: 'attacker', data: invasion.attacker },
      { key: 'defender', data: invasion.defender },
    ];
    return el('article', { class: 'invasion-card' },
      el('div', { class: 'invasion-card__head' },
        localizedNode(invasion.node, loc, 'invasion-card__node'),
      ),
      el('div', { class: 'invasion-sides' }, sides.map(({ key, data }) => el('div', { class: 'invasion-side' },
        el('span', { class: 'label', text: sideLabel(i18n, key) }),
        el('strong', {}, factionMark(loc, data, { node: invasion.node })),
        data.reward.items.length || data.reward.credits
          ? rewardChips(loc.reward(data.reward))
          : el('span', { class: 'muted', text: i18n.t('common.notAvailable') }),
      ))),
      el('div', { class: 'invasion-progress' },
        el('div', { class: 'invasion-progress__label' },
          el('span', { text: i18n.t('invasions.progress') }),
          el('span', { text: `${Math.round(invasion.completion)}%` }),
        ),
        meter(invasion.completion, i18n.t('invasions.progress'), invasion.completion >= 100 ? 'ok' : ''),
      ),
    );
  }));
  return section('invasions', i18n, 'section.invasions', list, { count: model.invasions.length });
}

function renderActivities(model, i18n, loc) {
  if (!model.events.length) {
    return section('events', i18n, 'section.events', emptyState(i18n.t('live.empty')));
  }
  const list = el('div', { class: 'stack' }, model.events.map((event) => el('article', { class: 'event-card' },
    el('div', { class: 'event-card__head' },
      localized('h3', event.title || i18n.t('live.untitled'), loc),
      event.end ? timeElement(i18n, event.end, 'countdown countdown--small') : null,
    ),
    el('div', { class: 'event-card__meta' },
      event.node ? localizedNode(event.node, loc) : null,
      event.type ? localized('span', event.type, loc, 'muted') : null,
      factionMark(loc, event, { className: 'muted' }),
    ),
    event.progress != null ? el('div', {},
      el('div', { class: 'invasion-progress__label' },
        el('span', { text: i18n.t('live.progress') }),
        el('span', { text: `${Math.round(event.progress)}%` }),
      ),
      meter(event.progress, i18n.t('live.progress')),
    ) : null,
    event.rewards.length ? el('div', { class: 'alert-card__reward' },
      el('span', { class: 'label', text: i18n.t('live.reward') }),
      rewardChips(event.rewards),
    ) : null,
  )));
  return section('events', i18n, 'section.events', list, { count: model.events.length });
}

const ARCHON_SHARDS = [
  { pattern: /amar|欺谋狼主/i, slug: 'crimson', labelKey: 'archon.shardCrimson' },
  { pattern: /boreal|诡文枭主/i, slug: 'azure', labelKey: 'archon.shardAzure' },
  { pattern: /nira|混沌蛇主/i, slug: 'amber', labelKey: 'archon.shardAmber' },
];

function archonShardMark(i18n, boss) {
  const shard = ARCHON_SHARDS.find((entry) => entry.pattern.test(String(boss || '')));
  if (!shard) return null;
  return el('span', { class: 'badge badge--muted archon-shard' },
    el('span', {
      class: `shard-icon shard-icon--${shard.slug}`,
      attrs: { 'aria-hidden': 'true' },
    }),
    el('span', { text: i18n.t(shard.labelKey) }),
  );
}

function renderSortieLike({ model, i18n, loc, key, titleKey, emptyKey, bossKey, modifier = false }) {
  const data = model[key];
  if (!data) return section(key, i18n, titleKey, emptyState(i18n.t(emptyKey)));
  const content = el('div', {},
    el('div', { class: 'run-head' },
      el('div', {},
        el('span', { class: 'label', text: i18n.t(bossKey) }),
        el('div', { class: 'run-head__title' },
          localized('h3', data.boss, loc),
          factionMark(loc, data, {
            className: 'badge badge--muted',
            node: data.missions?.[0]?.node,
          }),
          key === 'archon' ? archonShardMark(i18n, data.boss) : null,
        ),
      ),
      el('div', { class: 'run-head__meta' },
        timeElement(i18n, data.end, 'countdown'),
      ),
    ),
    el('ol', { class: 'mission-list' }, data.missions.map((mission, index) => el('li', { class: 'mission' },
      el('span', { class: 'mission__index', text: String(index + 1).padStart(2, '0') }),
      el('div', { class: 'mission__body' },
        el('div', { class: 'mission__head' },
          badge(loc.missionType(mission.typeKey, mission.type), 'blue'),
          localizedNode(mission.node, loc, 'mission__node'),
        ),
        modifier && mission.modifier
          ? el('p', { class: 'mission__modifier' },
            el('span', { class: 'label', text: i18n.t('sortie.modifier') }),
            el('span', { text: loc.modifier(mission.modifier) }),
          )
          : null,
        modifier && mission.modifierDescription && (!loc.isZh || hasCjk(loc.text(mission.modifierDescription)))
          ? localizedSentence('p', mission.modifierDescription, loc, 'fine-print')
          : null,
      ),
    ))),
  );
  return section(key, i18n, titleKey, content, { count: data.missions.length });
}

function circuitChoiceName(loc, name, weapon = false) {
  const spaced = String(name || '').replace(/([a-z0-9])([A-Z])/g, '$1 $2');
  if (weapon) {
    const match = findRivenWeapon(spaced);
    if (match) return loc.isZh ? match.zh : match.en;
  }
  return loc.item(spaced) || String(name || '');
}

function circuitCanonical(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function circuitCurrentGroup(kind, circuit) {
  const groups = CIRCUIT_ROTATION[kind] || [];
  const selected = new Set((kind === 'warframes' ? circuit.warframes : circuit.incarnons)
    .map(circuitCanonical));
  return groups.find((group) => group.names.length === selected.size
    && group.names.every((name) => selected.has(circuitCanonical(name)))) || null;
}

function openCircuitRotation(kind, circuit, i18n, loc) {
  const groups = CIRCUIT_ROTATION[kind] || [];
  const current = circuitCurrentGroup(kind, circuit);
  const titleId = `circuit-rotation-${kind}`;
  const title = i18n.t(kind === 'warframes' ? 'circuit.warframesRotation' : 'circuit.incarnonsRotation');
  const dialog = el('dialog', {
    class: 'circuit-dialog',
    attrs: { 'aria-labelledby': titleId, closedby: 'any' },
  },
    el('div', { class: 'circuit-dialog__head' },
      el('h1', { id: titleId, text: title }),
      el('button', {
        type: 'button',
        class: 'circuit-dialog__close',
        text: '×',
        attrs: { 'aria-label': i18n.t('circuit.close'), autofocus: '' },
        onclick: () => dialog.close(),
      }),
    ),
    el('div', {
      class: 'circuit-dialog__body',
      attrs: { tabindex: '0', role: 'region', 'aria-labelledby': titleId },
    },
      el('ol', { class: 'circuit-rotation-list' }, groups.map((group) => {
        const isCurrent = group === current;
        return el('li', { class: isCurrent ? 'is-current' : null },
          el('span', { class: 'circuit-rotation__names' },
            group.names.map((name) => el('span', {
              text: circuitChoiceName(loc, name, kind === 'incarnons'),
            })),
          ),
          isCurrent ? badge(i18n.t('circuit.current'), 'gold') : null,
        );
      })),
    ),
  );
  dialog.addEventListener('close', () => dialog.remove());
  document.body.append(dialog);
  dialog.showModal();
}

function renderCircuit(model, i18n, loc) {
  const circuit = model.circuit;
  if (!circuit || (!circuit.warframes.length && !circuit.incarnons.length)) {
    return section('circuit', i18n, 'section.circuit', emptyState(i18n.t('circuit.empty')));
  }
  const group = (titleKey, items, kind) => el('div', { class: 'circuit-group' },
    el('div', { class: 'circuit-group__head' },
      el('h3', { class: 'subheading', text: i18n.t(titleKey) }),
      el('button', {
        type: 'button',
        class: 'circuit-view-button',
        text: i18n.t('circuit.viewRotation'),
        onclick: () => openCircuitRotation(kind, circuit, i18n, loc),
      }),
    ),
    items.length
      ? el('ul', { class: 'circuit-list' }, items.map((name) => el('li', {
        class: 'circuit-item',
        text: circuitChoiceName(loc, name, kind === 'incarnons'),
      })))
      : emptyState(i18n.t('common.notAvailable')),
  );
  const content = el('div', { class: 'circuit-module' },
    group('circuit.warframes', circuit.warframes, 'warframes'),
    group('circuit.incarnons', circuit.incarnons, 'incarnons'),
  );
  const sectionNode = section('circuit', i18n, 'section.circuit', content, {
    count: circuit.warframes.length + circuit.incarnons.length,
  });
  if (model.weeklyReset) {
    sectionNode.querySelector('.section-heading')?.append(
      el('span', { class: 'module-countdown module-countdown--below' },
        timeElement(i18n, model.weeklyReset),
      ),
    );
  }
  return sectionNode;
}

function steelPathOffering(loc, item, i18n) {
  return el('li', {},
    el('span', { class: 'steel-path-item__name', text: loc.item(item.name) }),
    el('span', { class: 'steel-path-item__cost', text: i18n.t('steelPath.cost', { cost: item.cost }) }),
  );
}

function steelPathJobs(steelPath, loc) {
  const schedule = resolveSteelPathIncursions(new Date());
  return schedule
    ? schedule.nodes.map((job) => {
      const en = job.en || [];
      const zh = job.zh || en;
      const zhName = zh[0] || '';
      const zhBase = zhName.split(' (')[0];
      const name = loc.isZh && /[\u3400-\u9fff]/u.test(zhBase)
        ? loc.normalizeChineseCopy(loc.simplify(zhName))
        : loc.node(en[0] || zhName || job.id);
      const rawType = loc.isZh ? (zh[1] || en[1] || '') : (en[1] || zh[1] || '');
      let type = loc.missionType('', rawType);
      if (loc.isZh) {
        type = type
          .replace(/\bOrokin\b\s*/gi, '奥罗金')
          .replace(/\bSabotage\b/gi, '破坏')
          .replace(/\s+/g, ' ')
          .trim();
      }
      return {
        name,
        type,
        faction: loc.isZh ? (zh[2] || en[2] || '') : (en[2] || zh[2] || ''),
      };
    })
    : (steelPath.incursions?.jobs || []).map((job) => ({
      name: job.node || '',
      type: job.type || job.missionType || '',
      faction: job.faction || '',
      factionKey: job.factionKey || '',
    }));
}

function renderSteelPathShop(model, i18n, loc) {
  const steelPath = model.steelPath;
  if (!steelPath) {
    return section('steelPathShop', i18n, 'section.steelPathShop', emptyState(i18n.t('steelPath.empty')));
  }
  const rotation = steelPath.rotation || [];
  const current = steelPath.currentReward;
  const rotationBlock = rotation.length
    ? el('div', { class: 'steel-path-rotation' },
      el('div', { class: 'steel-path-rotation__head' },
        el('span', { class: 'label', text: i18n.t('steelPath.rotation') }),
        steelPath.expiry ? timeElement(i18n, steelPath.expiry, 'countdown countdown--small') : null,
      ),
      el('ol', { class: 'steel-path-list' }, rotation.map((item) => {
        const node = steelPathOffering(loc, item, i18n);
        if (current && item.name === current.name) node.classList.add('is-current');
        return node;
      })),
    )
    : emptyState(i18n.t('steelPath.empty'));
  return section('steelPathShop', i18n, 'section.steelPathShop', rotationBlock, { count: rotation.length });
}

function renderSteelPathIncursions(model, i18n, loc) {
  const steelPath = model.steelPath;
  if (!steelPath) {
    return section('steelPathIncursions', i18n, 'section.steelPathIncursions', emptyState(i18n.t('steelPath.empty')));
  }
  const jobs = steelPathJobs(steelPath, loc);
  const content = el('div', { class: 'steel-path-incursions' },
    el('div', { class: 'steel-path-incursions__head' },
      steelPath.incursions?.expiry
        ? timeElement(i18n, steelPath.incursions.expiry, 'countdown countdown--small')
        : null,
    ),
    jobs.length
      ? el('ul', { class: 'steel-path-list steel-path-list--incursions' }, jobs.slice(0, 6).map((job) => el('li', {},
        el('span', { class: 'steel-path-item__name', text: job.name }),
        job.type ? badge(job.type, 'muted') : null,
        job.faction
          ? factionMark(loc, { faction: job.faction, factionKey: job.factionKey }, {
            className: 'badge badge--muted',
            node: job.name,
          })
          : null,
      )))
      : emptyState(i18n.t('steelPath.incursionEmpty')),
  );
  return section('steelPathIncursions', i18n, 'section.steelPathIncursions', content, { count: jobs.length });
}

function renderArchimedea(model, i18n, loc, kind) {
  const key = kind === 'temporal' ? 'archimedeaTemporal' : 'archimedeaDeep';
  const titleKey = `section.${key}`;
  const archimedea = model.archimedeas.find((entry) => entry.kind === kind);
  if (!archimedea) {
    return section(key, i18n, titleKey, emptyState(i18n.t('archimedea.empty')));
  }

  const personalBlock = archimedea.personalModifiers.length
    ? el('div', { class: 'archimedea-block archimedea-block--personal' },
      el('span', { class: 'label', text: i18n.t('archimedea.personal') }),
      el('ul', { class: 'modifier-list' }, archimedea.personalModifiers.map((modifier) => {
        const description = loc.personal(modifier.key, 'description', modifier.description);
        return el('li', {},
          marked('strong', loc.personal(modifier.key, 'name', modifier.name), loc),
          description
            ? marked('span', description, loc, 'fine-print')
            : el('span', { class: 'fine-print muted', text: i18n.t('archimedea.valueUnavailable') }),
        );
      })),
    )
    : null;
  const content = el('div', { class: 'archimedea-grid archimedea-grid--single' },
    el('article', { class: `archimedea-card archimedea-card--${kind}` },
      personalBlock,
      el('div', { class: 'archimedea-missions' }, archimedea.missions.map((mission, index) => el('div', { class: 'archimedea-mission' },
        el('div', { class: 'archimedea-mission__head' },
          el('span', { class: 'mission__index', text: String(index + 1).padStart(2, '0') }),
          badge(loc.missionType(mission.missionTypeKey, mission.missionType), 'blue'),
          kind === 'deep'
            ? factionMark(loc, { factionKey: 'FC_MURMUR', faction: 'The Murmur' }, { className: 'muted' })
            : factionMark(loc, mission, { className: 'muted' }),
        ),
        mission.deviation.name ? (() => {
          const description = loc.conquest(kind, mission.deviation.key, 'description', mission.deviation.description);
          return el('div', { class: 'archimedea-block' },
            el('span', { class: 'label', text: i18n.t('archimedea.deviation') }),
            marked('strong', loc.conquest(kind, mission.deviation.key, 'name', mission.deviation.name), loc),
            description ? marked('p', description, loc, 'fine-print') : null,
          );
        })() : null,
        mission.risks.length ? el('div', { class: 'archimedea-block' },
          el('span', { class: 'label', text: i18n.t('archimedea.risks') }),
          el('ul', { class: 'risk-list' }, mission.risks.map((risk) => {
            const description = loc.conquest('conditions', risk.key, 'description', risk.description);
            return el('li', {},
              el('span', { class: 'risk-title' },
                marked('strong', loc.conquest('conditions', risk.key, 'name', risk.name), loc),
                risk.isHard ? badge(i18n.t('archimedea.hard'), 'gold') : null,
              ),
              description ? marked('span', description, loc, 'fine-print') : null,
            );
          })),
        ) : null,
      ))),
    ),
  );
  const sectionNode = section(key, i18n, titleKey, content);
  if (archimedea.end) {
    sectionNode.querySelector('.section-heading')?.append(
      el('span', { class: 'module-countdown module-countdown--below' },
        timeElement(i18n, archimedea.end, 'countdown countdown--small'),
      ),
    );
  }
  return sectionNode;
}

function renderFissureModule(model, i18n, loc, key, itemsKey, titleKey) {
  const items = model.fissures[itemsKey] || [];
  const content = items.length
    ? el('ul', { class: 'fissure-list' }, items.map((fissure) => {
      const soon = fissure.remainingMs > 0 && fissure.remainingMs < 5 * 60 * 1000;
      return el('li', { class: `fissure${soon ? ' fissure--soon' : ''}` },
        el('div', { class: 'fissure__top' },
          el('div', { class: 'fissure__identity' },
            badge(loc.tier(fissure.tierKey, fissure.tier), 'blue'),
            badge(loc.missionType(fissure.missionTypeKey, fissure.missionType), 'muted'),
            factionMark(loc, { factionKey: fissure.enemyKey, faction: fissure.enemy }, {
              className: 'badge badge--muted fissure__faction',
              node: fissure.node,
            }),
          ),
          soon ? el('div', { class: 'fissure__soon' },
            badge(i18n.t('fissure.endingSoon'), 'danger'),
          ) : null,
        ),
        el('div', { class: 'fissure__meta' },
          localizedNode(fissure.node, loc, 'fissure__node'),
          timeElement(i18n, fissure.end, 'countdown countdown--small'),
        ),
      );
    }))
    : emptyState(i18n.t('fissure.empty'));
  return section(key, i18n, titleKey, content);
}

function renderLoading(i18n) {
  return el('div', { class: 'loading-panel', attrs: { role: 'status' } },
    icon('refresh', 'icon icon--spin'),
    el('p', { text: i18n.t('live.loading') }),
  );
}

function renderError(i18n, message) {
  return el('div', { class: 'error-panel', attrs: { role: 'alert' } },
    icon('alert', 'icon'),
    el('div', {},
      el('h2', { text: i18n.t('live.errorTitle') }),
      el('p', { text: i18n.t('live.errorBody') }),
      message ? el('p', { class: 'fine-print', text: message }) : null,
    ),
  );
}

export function createLivePage({ i18n, loc, model = null, meta = null, error = null, onRefresh }) {
  let currentModel = model;
  let currentMeta = meta;
  let currentError = error;
  let loading = false;
  let layoutOrder = loadLayoutOrder();
  let currentModules = null;
  let currentWarning = null;
  let masonryFrame = 0;
  let widthOverrides = loadLayoutWidths();
  let hiddenModules = loadHiddenModules();
  let completedModules = loadCompletedModules();
  let completedTimer = 0;
  let editorOpen = false;
  let dragKey = null;
  let dragStartOrder = null;
  let dragSourceNode = null;
  let dragPointerX = 0;
  let dragPointerY = 0;
  let autoScrollFrame = 0;
  let pointerDragCleanup = null;
  const AUTO_SCROLL_EDGE = 96;
  const AUTO_SCROLL_MAX = 8;

  const refreshLabel = el('span', { text: i18n.t('live.refresh') });
  const refreshButton = el('button', {
    class: 'button button--primary live-refresh-button',
    type: 'button',
    onClick: () => onRefresh?.(),
  }, icon('refresh', 'icon'), refreshLabel);

  const layoutLabel = el('span', { text: i18n.t('layout.customize') });
  const layoutButton = el('button', {
    class: 'button button--ghost',
    type: 'button',
    attrs: { 'aria-expanded': 'false', 'aria-controls': 'layout-editor' },
  }, icon('layout', 'icon'), layoutLabel);

  const statusHost = el('div', { class: 'live-status', attrs: { role: 'status', 'aria-live': 'polite' } });
  const serverStartHint = el('span', {
    class: 'server-start-hint',
    hidden: true,
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  const body = el('div', { class: 'live-body' });
  const layoutList = el('ol', { class: 'layout-list' });
  const layoutStatus = el('p', { class: 'layout-status', attrs: { role: 'status', 'aria-live': 'polite' } });

  const resetLayoutButton = el('button', {
    class: 'button button--ghost',
    type: 'button',
    text: i18n.t('layout.reset'),
  });
  const showCompletedButton = el('button', {
    class: 'button button--ghost',
    type: 'button',
    text: i18n.t('layout.showCompleted'),
  });
  const showAllButton = el('button', {
    class: 'button button--ghost',
    type: 'button',
    text: i18n.t('layout.showAll'),
  });
  const closeLayoutButton = el('button', {
    class: 'button button--ghost',
    type: 'button',
    text: i18n.t('layout.close'),
  });

  const layoutEditor = el('section', {
    class: 'layout-editor',
    id: 'layout-editor',
    hidden: true,
    attrs: { 'aria-labelledby': 'layout-title' },
  },
    el('div', { class: 'layout-editor__head' },
      el('div', {},
        el('h2', { id: 'layout-title', text: i18n.t('layout.title') }),
        el('p', { id: 'layout-hint', class: 'section-hint', text: i18n.t('layout.hint') }),
      ),
      el('div', { class: 'layout-editor__actions' },
        showCompletedButton,
        showAllButton,
        resetLayoutButton,
        closeLayoutButton,
      ),
    ),
    layoutList,
    layoutStatus,
  );

  const page = el('div', { class: 'live-page' },
    el('div', { class: 'page-heading page-heading--live' },
      el('p', { class: 'eyebrow', text: i18n.t('live.eyebrow') }),
      el('div', { class: 'page-heading__title' },
        el('h1', { text: i18n.t('live.title') }),
      ),
      el('div', { class: 'page-heading__actions' }, refreshButton, serverStartHint, layoutButton),
    ),
    statusHost,
    layoutEditor,
    body,
  );

  function setEditorOpen(open) {
    editorOpen = Boolean(open);
    layoutEditor.hidden = !editorOpen;
    layoutButton.setAttribute('aria-expanded', String(editorOpen));
    if (!editorOpen) {
      endDrag(true);
      layoutButton.focus({ preventScroll: true });
    }
    syncModuleEditing();
  }

  layoutButton.addEventListener('click', () => {
    setEditorOpen(layoutEditor.hidden);
  });
  showCompletedButton.addEventListener('click', showCompletedModules);
  showAllButton.addEventListener('click', showAllModules);
  closeLayoutButton.addEventListener('click', () => setEditorOpen(false));

  function onDocumentDragOver(event) {
    if (!dragKey) return;
    dragPointerX = Number.isFinite(event.clientX) ? event.clientX : dragPointerX;
    dragPointerY = Number.isFinite(event.clientY) ? event.clientY : dragPointerY;
    startAutoScroll();
  }
  document.addEventListener('dragover', onDocumentDragOver);

  function announceSaved() {
    layoutStatus.textContent = i18n.t('layout.saved');
  }

  function isModuleHidden(key) {
    return hiddenModules.has(key) || Boolean(completedModules[key]);
  }

  function prefersReducedMotion() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  function transitionLayout(update, leavingKey = null) {
    if (prefersReducedMotion()) {
      update();
      return;
    }

    const run = () => update();
    if (typeof body.startViewTransition === 'function') {
      try {
        body.startViewTransition(run);
        return;
      } catch {
        // Fall through to the document-level API or FLIP fallback.
      }
    }
    if (typeof document.startViewTransition === 'function') {
      try {
        document.startViewTransition(run);
        return;
      } catch {
        // Fall through to the FLIP fallback.
      }
    }

    // FLIP fallback for browsers without View Transitions.
    const oldNodes = [...body.querySelectorAll(':scope > .module')];
    const oldKeys = new Set(oldNodes.map((node) => node.dataset.moduleKey));
    const previous = capturePositions(oldNodes);
    const finish = () => {
      update();
      const entering = [...body.querySelectorAll(':scope > .module')]
        .filter((node) => !oldKeys.has(node.dataset.moduleKey));
      for (const node of entering) node.classList.add('module--entering');
      animatePositions(previous);
      if (entering.length) {
        window.setTimeout(() => {
          for (const node of entering) node.classList.remove('module--entering');
        }, 260);
      }
    };
    const leaving = leavingKey ? currentModules?.[leavingKey] : null;
    if (leaving?.isConnected) {
      leaving.classList.add('module--leaving');
      window.setTimeout(finish, 160);
    } else {
      finish();
    }
  }

  function restoreCompletedModules() {
    if (!currentModel) return false;
    let changed = false;
    for (const key of Object.keys(completedModules)) {
      const token = completionToken(key, currentModel);
      if (!token || completedModules[key] !== token) {
        delete completedModules[key];
        changed = true;
      }
    }
    if (changed) {
      saveCompletedModules(completedModules);
      if (currentModules) applyLayout();
      renderLayoutEditor();
    }
    return changed;
  }

  function hideModule(key) {
    hiddenModules.add(key);
    saveHiddenModules(hiddenModules);
    transitionLayout(() => applyLayout(), key);
    renderLayoutEditor();
    announceSaved();
  }

  function markModuleCompleted(key) {
    const token = completionToken(key, currentModel) || 'pending';
    completedModules[key] = token;
    saveCompletedModules(completedModules);
    transitionLayout(() => applyLayout(), key);
    renderLayoutEditor();
    announceSaved();
  }

  function showCompletedModules() {
    completedModules = {};
    saveCompletedModules(completedModules);
    transitionLayout(() => applyLayout());
    renderLayoutEditor();
    announceSaved();
  }

  function showAllModules() {
    hiddenModules.clear();
    completedModules = {};
    saveHiddenModules(hiddenModules);
    saveCompletedModules(completedModules);
    transitionLayout(() => applyLayout());
    renderLayoutEditor();
    announceSaved();
  }

  function toggleModuleVisibility(key) {
    const wasHidden = isModuleHidden(key);
    if (wasHidden) {
      hiddenModules.delete(key);
      delete completedModules[key];
    } else {
      hiddenModules.add(key);
      delete completedModules[key];
    }
    saveHiddenModules(hiddenModules);
    saveCompletedModules(completedModules);
    transitionLayout(() => applyLayout(), wasHidden ? null : key);
    renderLayoutEditor();
    announceSaved();
  }

  function attachModuleActions() {
    for (const [key, node] of Object.entries(currentModules || {})) {
      const heading = node.querySelector(':scope > .section-heading');
      if (!heading) continue;
      const module = MODULE_BY_KEY.get(key);
      const name = i18n.t(module.labelKey);
      const actions = el('div', { class: 'module-actions' });
      if (COMPLETABLE_MODULES.has(key)) {
        const completedButton = el('button', {
          class: 'module-action',
          type: 'button',
          text: i18n.t('layout.markCompleted'),
          attrs: {
            'aria-label': i18n.t('layout.markCompletedFor', { name }),
            title: i18n.t('layout.markCompletedFor', { name }),
          },
        });
        completedButton.addEventListener('click', () => markModuleCompleted(key));
        actions.append(completedButton);
      }
      const hideButton = el('button', {
        class: 'module-action',
        type: 'button',
        text: i18n.t('layout.hideModule'),
        attrs: {
          'aria-label': i18n.t('layout.hideModuleFor', { name }),
          title: i18n.t('layout.hideModuleFor', { name }),
        },
      });
      hideButton.addEventListener('click', () => hideModule(key));
      actions.append(hideButton);
      heading.append(actions);
    }
  }

  function previewAtPoint() {
    if (!dragKey) return;
    const target = document.elementFromPoint(dragPointerX, dragPointerY)?.closest('.module, .layout-item');
    if (!target) return;
    const key = target.dataset.moduleKey || target.dataset.layoutKey;
    if (!key || key === dragKey) return;
    const rect = target.getBoundingClientRect();
    const isList = target.classList.contains('layout-item');
    const after = isList
      ? dragPointerX > rect.left + rect.width / 2
      : dragPointerY > rect.top + rect.height / 2;
    previewReorder(dragKey, key, after);
  }

  function autoScrollStep() {
    autoScrollFrame = 0;
    if (!dragKey) return;
    let delta = 0;
    if (dragPointerY > 0 && dragPointerY < AUTO_SCROLL_EDGE) {
      delta = -Math.max(2, Math.ceil((1 - dragPointerY / AUTO_SCROLL_EDGE) * AUTO_SCROLL_MAX));
    } else if (dragPointerY > window.innerHeight - AUTO_SCROLL_EDGE) {
      const distance = Math.max(0, window.innerHeight - dragPointerY);
      delta = Math.max(2, Math.ceil((1 - distance / AUTO_SCROLL_EDGE) * AUTO_SCROLL_MAX));
    }
    if (delta) {
      const before = window.scrollY;
      window.scrollBy(0, delta);
      if (window.scrollY !== before) previewAtPoint();
    }
    autoScrollFrame = requestAnimationFrame(autoScrollStep);
  }

  function startAutoScroll() {
    if (!autoScrollFrame) autoScrollFrame = requestAnimationFrame(autoScrollStep);
  }

  function stopAutoScroll() {
    if (autoScrollFrame) cancelAnimationFrame(autoScrollFrame);
    autoScrollFrame = 0;
  }

  function orderWithMove(sourceKey, targetKey, after) {
    const next = layoutOrder.filter((key) => key !== sourceKey);
    const targetIndex = next.indexOf(targetKey);
    if (targetIndex < 0) return null;
    next.splice(targetIndex + (after ? 1 : 0), 0, sourceKey);
    return next;
  }

  function finishAnimations(nodes) {
    for (const node of nodes) {
      for (const animation of node.getAnimations?.() || []) {
        animation.finish();
      }
    }
  }

  function capturePositions(nodes) {
    return new Map(nodes.map((node) => [node, node.getBoundingClientRect()]));
  }

  function animatePositions(previous) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (const [node, before] of previous) {
      if (node === dragSourceNode || typeof node.animate !== 'function') continue;
      const after = node.getBoundingClientRect();
      const x = before.left - after.left;
      const y = before.top - after.top;
      if (Math.abs(x) < 0.5 && Math.abs(y) < 0.5) continue;
      node.animate(
        [
          { transform: `translate(${x}px, ${y}px)` },
          { transform: 'translate(0, 0)' },
        ],
        { duration: 240, easing: 'cubic-bezier(0.2, 0.8, 0.2, 1)' },
      );
    }
  }

  function reorderChildren(container, orderedNodes, source) {
    if (!source || !orderedNodes.includes(source)) {
      for (const node of orderedNodes) container.append(node);
      return;
    }
    const sourceIndex = orderedNodes.indexOf(source);
    for (const node of orderedNodes.slice(0, sourceIndex)) {
      container.insertBefore(node, source);
    }
    for (const node of orderedNodes.slice(sourceIndex + 1).reverse()) {
      container.insertBefore(node, source.nextSibling);
    }
  }

  function previewReorder(sourceKey, targetKey, after) {
    const next = orderWithMove(sourceKey, targetKey, after);
    if (!next || next.join('\u0000') === layoutOrder.join('\u0000')) return;
    const nodes = [
      ...[...body.children].filter((node) => node.classList.contains('module')),
      ...layoutList.children,
    ];
    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    finishAnimations(nodes);
    const previous = capturePositions(nodes);
    layoutOrder = next;

    // Move existing nodes around the drag source instead of rebuilding the
    // grid. The source stays connected, so the native drag remains active.
    const moduleNodes = layoutOrder
      .map((key) => currentModules?.[key])
      .filter(Boolean);
    reorderChildren(body, moduleNodes, dragSourceNode);
    const itemNodes = layoutOrder
      .map((key) => layoutList.querySelector(`[data-layout-key="${key}"]`))
      .filter(Boolean);
    reorderChildren(layoutList, itemNodes, dragSourceNode);
    for (const [index, key] of layoutOrder.entries()) {
      const item = layoutList.querySelector(`[data-layout-key="${key}"]`);
      const number = item?.querySelector('.layout-item__index');
      if (number) number.textContent = String(index + 1).padStart(2, '0');
    }
    applyMasonry();
    animatePositions(previous);
    if (window.scrollX !== scrollX || window.scrollY !== scrollY) {
      window.scrollTo(scrollX, scrollY);
    }
  }

  function savePreview() {
    if (!dragStartOrder || layoutOrder.join('\u0000') === dragStartOrder.join('\u0000')) return;
    saveLayoutOrder(layoutOrder);
    announceSaved();
  }

  function endDrag(commit = true) {
    if (commit) savePreview();
    if (pointerDragCleanup) {
      const cleanup = pointerDragCleanup;
      pointerDragCleanup = null;
      cleanup();
    }
    stopAutoScroll();
    for (const node of document.querySelectorAll('.is-dragging')) {
      node.classList.remove('is-dragging');
    }
    dragKey = null;
    dragStartOrder = null;
    dragSourceNode = null;
  }

  function startDragState(key, node, clientX, clientY) {
    dragKey = key;
    dragStartOrder = [...layoutOrder];
    dragSourceNode = node;
    dragPointerX = Number.isFinite(clientX) ? clientX : 0;
    dragPointerY = Number.isFinite(clientY) ? clientY : 0;
    node.classList.add('is-dragging');
  }

  function beginDrag(event, key, node) {
    if (!editorOpen || dragKey) {
      event.preventDefault();
      return;
    }
    startDragState(key, node, event.clientX, event.clientY);
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', key);
    }
  }

  function startPointerDrag(event, key, node) {
    if (!editorOpen || dragKey || event.pointerType === 'mouse' || event.button !== 0) return;
    event.preventDefault();
    startDragState(key, node, event.clientX, event.clientY);
    const pointerId = event.pointerId;
    const rect = node.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const ghost = node.cloneNode(true);
    ghost.querySelectorAll('[id]').forEach((child) => child.removeAttribute('id'));
    ghost.querySelectorAll('.module-drag-handle').forEach((child) => child.remove());
    ghost.classList.remove('is-dragging');
    ghost.classList.add('drag-ghost');
    ghost.setAttribute('aria-hidden', 'true');
    ghost.inert = true;
    ghost.style.width = `${rect.width}px`;
    ghost.style.height = `${rect.height}px`;
    ghost.style.left = `${rect.left}px`;
    ghost.style.top = `${rect.top}px`;
    document.body.append(ghost);

    // Keep the source in the document for the live reorder, but disable
    // native drag so the touch pointer sequence stays uninterrupted.
    node.draggable = false;
    const handle = event.currentTarget;
    const handleWasDraggable = handle.draggable;
    handle.draggable = false;
    try {
      handle.setPointerCapture?.(pointerId);
    } catch {
      // Synthetic pointer events and some older engines have no active capture.
    }

    const move = (moveEvent) => {
      if (moveEvent.pointerId !== pointerId) return;
      moveEvent.preventDefault();
      dragPointerX = moveEvent.clientX;
      dragPointerY = moveEvent.clientY;
      ghost.style.left = `${moveEvent.clientX - offsetX}px`;
      ghost.style.top = `${moveEvent.clientY - offsetY}px`;
      startAutoScroll();
      previewAtPoint();
    };
    const end = (endEvent) => {
      if (endEvent.pointerId !== pointerId) return;
      endDrag(true);
    };
    const cancel = (cancelEvent) => {
      if (cancelEvent.pointerId !== pointerId) return;
      endDrag(true);
    };
    pointerDragCleanup = () => {
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerup', end);
      document.removeEventListener('pointercancel', cancel);
      ghost.remove();
      handle.draggable = handleWasDraggable;
      if (editorOpen) node.draggable = true;
    };
    document.addEventListener('pointermove', move, { passive: false });
    document.addEventListener('pointerup', end);
    document.addEventListener('pointercancel', cancel);
  }

  function markDrop(event, node, key) {
    if (!editorOpen || !dragKey || key === dragKey) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    dragPointerX = Number.isFinite(event.clientX) ? event.clientX : dragPointerX;
    dragPointerY = Number.isFinite(event.clientY) ? event.clientY : dragPointerY;
    startAutoScroll();
    const rect = node.getBoundingClientRect();
    const isList = node.classList.contains('layout-item');
    const after = isList
      ? event.clientX > rect.left + rect.width / 2
      : event.clientY > rect.top + rect.height / 2;
    previewReorder(dragKey, key, after);
  }

  function dropOn(event, node, key) {
    if (!editorOpen || !dragKey) return;
    event.preventDefault();
    if (key !== dragKey) {
      const rect = node.getBoundingClientRect();
      const isList = node.classList.contains('layout-item');
      const after = isList
        ? event.clientX > rect.left + rect.width / 2
        : event.clientY > rect.top + rect.height / 2;
      previewReorder(dragKey, key, after);
    }
    endDrag(true);
  }

  function reorderLayout(sourceKey, targetKey, after) {
    const next = orderWithMove(sourceKey, targetKey, after);
    if (!next || next.join('\u0000') === layoutOrder.join('\u0000')) return;
    layoutOrder = next;
    saveLayoutOrder(layoutOrder);
    applyLayout();
    renderLayoutEditor();
    announceSaved();
    const item = layoutList.querySelector(`[data-layout-key="${sourceKey}"]`);
    requestAnimationFrame(() => item?.focus({ preventScroll: true }));
  }

  function keyboardReorder(event, key) {
    if (!event.altKey || (event.key !== 'ArrowUp' && event.key !== 'ArrowDown')) return;
    event.preventDefault();
    const delta = event.key === 'ArrowUp' ? -1 : 1;
    const index = layoutOrder.indexOf(key);
    const targetKey = layoutOrder[index + delta];
    if (targetKey) reorderLayout(key, targetKey, delta > 0);
  }

  function widthLabel(width) {
    return i18n.t({
      4: 'layout.widthThird',
      6: 'layout.widthHalf',
      8: 'layout.widthTwoThirds',
      12: 'layout.widthFull',
    }[width] || 'layout.widthAuto');
  }

  function renderLayoutEditor() {
    layoutList.replaceChildren(...layoutOrder.map((key, index) => {
      const module = MODULE_BY_KEY.get(key);
      const name = i18n.t(module.labelKey);
      const widths = [4, 6, 8, 12].filter((width) => width >= module.min && width <= module.max);
      const widthSelect = el('select', {
        class: 'layout-width__select',
        attrs: { 'aria-label': i18n.t('layout.widthFor', { name }) },
      },
        el('option', { value: 'auto', text: i18n.t('layout.widthAuto') }),
        ...widths.map((width) => el('option', { value: String(width), text: widthLabel(width) })),
      );
      widthSelect.value = String(widthOverrides[key] || 'auto');
      widthSelect.addEventListener('change', () => {
        if (widthSelect.value === 'auto') delete widthOverrides[key];
        else widthOverrides[key] = Number(widthSelect.value);
        saveLayoutWidths(widthOverrides);
        scheduleMasonry();
        announceSaved();
      });
      const hidden = isModuleHidden(key);
      const visibilityButton = el('button', {
        class: 'layout-visibility',
        type: 'button',
        text: hidden ? i18n.t('layout.show') : i18n.t('layout.hide'),
        attrs: {
          'aria-pressed': String(!hidden),
          'aria-label': hidden
            ? i18n.t('layout.showFor', { name })
            : i18n.t('layout.hideFor', { name }),
        },
      });
      visibilityButton.addEventListener('click', (event) => {
        event.stopPropagation();
        toggleModuleVisibility(key);
      });
      const item = el('li', {
        class: `layout-item${hidden ? ' is-hidden' : ''}`,
        dataset: { layoutKey: key },
        tabIndex: 0,
        draggable: true,
        attrs: {
          'aria-label': name,
          'aria-describedby': 'layout-hint',
        },
      },
        el('span', { class: 'layout-item__grip', attrs: { 'aria-hidden': 'true' } }, icon('drag', 'icon')),
        el('span', { class: 'layout-item__index', text: String(index + 1).padStart(2, '0') }),
        el('span', { class: 'layout-item__name', text: name }),
        el('label', { class: 'layout-width' },
          el('span', { class: 'visually-hidden', text: i18n.t('layout.widthFor', { name }) }),
          widthSelect,
        ),
        visibilityButton,
      );
      item.querySelector('.layout-item__grip')?.addEventListener(
        'pointerdown',
        (event) => startPointerDrag(event, key, item),
      );
      item.addEventListener('dragstart', (event) => beginDrag(event, key, item));
      item.addEventListener('dragend', () => endDrag(true));
      item.addEventListener('dragover', (event) => markDrop(event, item, key));
      item.addEventListener('drop', (event) => dropOn(event, item, key));
      item.addEventListener('keydown', (event) => keyboardReorder(event, key));
      return item;
    }));
  }

  function spanToColumns(span, columns) {
    if (span === 'full') return columns;
    if (span === 'two-thirds') return Math.max(1, Math.round((columns * 2) / 3));
    if (span === 'half') return Math.max(1, Math.round(columns / 2));
    if (span === 'flex') return Math.max(1, Math.round(columns / 3));
    return Math.max(1, Math.round(columns / 3));
  }

  function widthCandidates(module, columns) {
    if (!module || module.span !== 'flex') {
      return [spanToColumns(module?.span || 'third', columns)];
    }
    if (window.matchMedia('(max-width: 900px)').matches) return [columns];
    const custom = widthOverrides[module.key];
    if (Number.isInteger(custom)) {
      return [Math.max(1, Math.min(columns, Math.round((columns * custom) / 12)))];
    }
    const preferred = Math.max(1, Math.round((columns * module.preferred) / 12));
    const minimum = Math.max(1, Math.round((columns * module.min) / 12));
    const maximum = Math.max(preferred, Math.round((columns * (module.max ?? module.preferred)) / 12));
    const widths = [];
    for (let width = minimum; width <= maximum; width += 1) widths.push(width);
    return [...new Set(widths)];
  }

  function scheduleMasonry() {
    if (masonryFrame) cancelAnimationFrame(masonryFrame);
    masonryFrame = requestAnimationFrame(() => {
      masonryFrame = 0;
      applyMasonry();
    });
  }

  /**
   * Fill holes left by tall modules. CSS grid alone aligns rows, which leaves
   * a large blank area under shorter neighbours. Use a skyline placement pass:
   * every module keeps its column span, but gets an explicit row span and start
   * position, allowing later modules to occupy the free space.
   */
  function applyMasonry() {
    if (!currentModules || !body.isConnected) return;
    const items = [...body.children].filter((node) => (
      node.classList.contains('module') || node.classList.contains('inline-warning')
    ));
    if (!items.length) return;

    // Clear inline placement so each item is measured at its natural width.
    for (const item of items) {
      item.style.gridColumn = '';
      item.style.gridRow = '';
    }

    const computed = getComputedStyle(body);
    const columns = `${computed.gridTemplateColumns}`.split(' ').filter(Boolean).length || 12;
    const rowGap = Number.parseFloat(computed.rowGap) || 16;
    const heights = Array(columns).fill(0);

    // Measure each candidate width for flexible modules. The height can change
    // when a module becomes narrower, so every width needs its own row span.
    const measurements = items.map((item) => {
      const moduleKey = item.dataset.moduleKey;
      const module = moduleKey ? MODULE_BY_KEY.get(moduleKey) : null;
      const widths = module ? widthCandidates(module, columns) : [columns];
      const candidates = widths.map((width) => {
        item.style.gridColumn = `1 / span ${width}`;
        item.style.gridRow = '';
        const height = item.getBoundingClientRect().height;
        return {
          width,
          units: Math.max(1, Math.ceil((height + rowGap) / (MASONRY_ROW_HEIGHT + rowGap))),
        };
      });
      item.style.gridColumn = '';
      item.style.gridRow = '';
      const preferred = module
        ? Math.max(1, Math.round((columns * module.preferred) / 12))
        : columns;
      return { item, candidates, preferred };
    });

    for (const { item, candidates, preferred } of measurements) {
      let best = null;
      for (const candidate of candidates) {
        for (let column = 0; column <= columns - candidate.width; column += 1) {
          let row = 0;
          for (let offset = 0; offset < candidate.width; offset += 1) {
            row = Math.max(row, heights[column + offset]);
          }
          const distance = Math.abs(candidate.width - preferred);
          const bestDistance = best ? Math.abs(best.width - preferred) : Number.POSITIVE_INFINITY;
          if (!best
            || row < best.row
            || (row === best.row && distance < bestDistance)
            || (row === best.row && distance === bestDistance && candidate.width > best.width)) {
            best = { row, column, ...candidate };
          }
        }
      }
      if (!best) {
        best = { row: Math.max(...heights), column: 0, ...candidates[candidates.length - 1] };
      }
      item.style.gridColumn = `${best.column + 1} / span ${best.width}`;
      item.style.gridRow = `${best.row + 1} / span ${best.units}`;
      for (let offset = 0; offset < best.width; offset += 1) {
        heights[best.column + offset] = best.row + best.units;
      }
    }
  }

  function syncModuleEditing() {
    body.classList.toggle('layout-editing', editorOpen);
    document.documentElement.classList.toggle('layout-editing', editorOpen);
    for (const [key, node] of Object.entries(currentModules || {})) {
      if (!node) continue;
      const handle = node.querySelector(':scope > .module-drag-handle');
      if (!editorOpen) {
        node.draggable = false;
        node.classList.remove('module--editing', 'is-dragging');
        handle?.remove();
        continue;
      }
      node.draggable = true;
      node.classList.add('module--editing');
      if (node.dataset.dragBound !== '1') {
        node.addEventListener('dragstart', (event) => beginDrag(event, key, node));
        node.addEventListener('dragend', () => endDrag(true));
        node.addEventListener('dragover', (event) => markDrop(event, node, key));
        node.addEventListener('drop', (event) => dropOn(event, node, key));
        node.dataset.dragBound = '1';
      }
      if (!handle) {
        const module = MODULE_BY_KEY.get(key);
        const name = i18n.t(module.labelKey);
        const nextHandle = el('button', {
          class: 'module-drag-handle',
          type: 'button',
          draggable: true,
          attrs: {
            'aria-label': i18n.t('layout.dragHandle', { name }),
            'aria-describedby': 'layout-hint',
            title: i18n.t('layout.dragHandle', { name }),
          },
        }, icon('drag', 'icon'));
        nextHandle.addEventListener('keydown', (event) => keyboardReorder(event, key));
        nextHandle.addEventListener(
          'pointerdown',
          (event) => startPointerDrag(event, key, node),
        );
        node.prepend(nextHandle);
      }
    }
  }

  function applyLayout() {
    if (!currentModules) return;
    body.replaceChildren();
    if (currentWarning) body.append(currentWarning);
    for (const key of layoutOrder) {
      const node = currentModules[key];
      const module = MODULE_BY_KEY.get(key);
      if (!node || !module || isModuleHidden(key)) continue;
      node.classList.add('module', `module--${module.span}`);
      node.dataset.moduleKey = key;
      node.style.viewTransitionName = `module-${key}`;
      body.append(node);
    }
    syncModuleEditing();
    if (body.isConnected) applyMasonry();
    else scheduleMasonry();
  }

  resetLayoutButton.addEventListener('click', () => {
    layoutOrder = [...DEFAULT_LAYOUT];
    widthOverrides = {};
    hiddenModules.clear();
    completedModules = {};
    saveLayoutOrder(layoutOrder);
    saveLayoutWidths(widthOverrides);
    saveHiddenModules(hiddenModules);
    saveCompletedModules(completedModules);
    transitionLayout(() => applyLayout());
    renderLayoutEditor();
    announceSaved();
  });

  function setLoading(value) {
    loading = Boolean(value);
    refreshButton.disabled = loading;
    refreshButton.classList.toggle('is-loading', loading);
    refreshLabel.textContent = loading ? i18n.t('live.refreshing') : i18n.t('live.refresh');
  }

  function renderStatus() {
    statusHost.replaceChildren();
    const serverStarting = Boolean(currentMeta?.serverStarting);
    serverStartHint.hidden = !serverStarting;
    serverStartHint.textContent = serverStarting ? i18n.t('live.serverStarting') : '';
    const staticMode = Boolean(currentMeta?.static);
    const fetchedAt = currentMeta?.fetchedAt;
    const items = [
      el('span', { class: 'live-status__item' },
        el('span', { class: 'live-dot', attrs: { 'aria-hidden': 'true' } }),
        fetchedAt ? i18n.t('live.updatedAt', { time: i18n.formatDateTime(fetchedAt) }) : i18n.t('common.loading'),
      ),
      el('span', { class: 'live-status__item muted', text: currentMeta?.static ? i18n.t('live.snapshotNote') : i18n.t('live.autoRefresh') }),
    ];
    if (currentMeta?.static) items.push(badge(i18n.t('live.snapshot'), 'blue'));
    if (currentMeta?.stale) items.push(badge(i18n.t('live.cached'), 'gold'));
    statusHost.append(...items);
  }

  function buildModules() {
    currentModules = {
      cycles: renderCycles(currentModel, i18n, loc),
      darvo: renderDarvo(currentModel, i18n, loc),
      nightwave: renderNightwave(currentModel, i18n, loc),
      arbitration: renderArbitration(currentModel, i18n, loc),
      alerts: renderAlerts(currentModel, i18n, loc),
      invasions: renderInvasions(currentModel, i18n, loc),
      events: renderActivities(currentModel, i18n, loc),
      sortie: renderSortieLike({
        model: currentModel,
        i18n,
        loc,
        key: 'sortie',
        titleKey: 'section.sortie',
        emptyKey: 'sortie.empty',
        bossKey: 'sortie.boss',
        modifier: true,
      }),
      archon: renderSortieLike({
        model: currentModel,
        i18n,
        loc,
        key: 'archon',
        titleKey: 'section.archon',
        emptyKey: 'archon.empty',
        bossKey: 'archon.boss',
      }),
      circuit: renderCircuit(currentModel, i18n, loc),
      steelPathShop: renderSteelPathShop(currentModel, i18n, loc),
      steelPathIncursions: renderSteelPathIncursions(currentModel, i18n, loc),
      archimedeaDeep: renderArchimedea(currentModel, i18n, loc, 'deep'),
      archimedeaTemporal: renderArchimedea(currentModel, i18n, loc, 'temporal'),
      fissuresNormal: renderFissureModule(currentModel, i18n, loc, 'fissuresNormal', 'normal', 'section.fissuresNormal'),
      fissuresSteel: renderFissureModule(currentModel, i18n, loc, 'fissuresSteel', 'steel', 'section.fissuresSteel'),
      fissuresStorm: renderFissureModule(currentModel, i18n, loc, 'fissuresStorm', 'storm', 'section.fissuresStorm'),
    };
    attachModuleActions();
  }

  function renderBody() {
    body.replaceChildren();
    currentModules = null;
    currentWarning = null;
    if (!currentModel) {
      body.append(currentError ? renderError(i18n, currentError) : renderLoading(i18n));
      return;
    }
    if (currentError) {
      currentWarning = el('div', { class: 'inline-warning', attrs: { role: 'alert' } },
        icon('alert', 'icon'),
        el('span', { text: currentError }),
      );
    }
    buildModules();
    restoreCompletedModules();
    applyLayout();
  }

  function update(next = {}) {
    if ('model' in next) currentModel = next.model;
    if ('meta' in next) currentMeta = next.meta;
    if ('error' in next) currentError = next.error;
    if ('loading' in next) setLoading(next.loading);
    renderStatus();
    renderBody();
  }

  const onResize = () => scheduleMasonry();
  window.addEventListener('resize', onResize, { passive: true });
  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleMasonry).catch(() => {});
  }

  renderLayoutEditor();
  renderStatus();
  renderBody();
  completedTimer = window.setInterval(restoreCompletedModules, 60_000);
  return {
    node: page,
    update,
    setLoading,
    _cleanup() {
      endDrag(false);
      document.removeEventListener('dragover', onDocumentDragOver);
      window.removeEventListener('resize', onResize);
      if (masonryFrame) cancelAnimationFrame(masonryFrame);
      masonryFrame = 0;
      if (completedTimer) window.clearInterval(completedTimer);
      completedTimer = 0;
      document.documentElement.classList.remove('layout-editing');
      body.classList.remove('layout-editing');
      document.querySelectorAll('dialog.circuit-dialog').forEach((dialog) => dialog.close());
    },
  };
}
