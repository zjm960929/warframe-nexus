import {
  badge,
  el,
  emptyState,
  meter,
  sectionHeader,
  timeElement,
} from '../dom.js';
import { icon } from '../icons.js';
import { hasCjk } from '../localize.js';

const LAYOUT_KEY = 'wf-nexus-worldstate-layout';

const MODULE_DEFS = [
  { key: 'cycles', labelKey: 'section.cycles', span: 'flex', preferred: 12, min: 4, max: 12 },
  { key: 'darvo', labelKey: 'section.darvo', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'nightwave', labelKey: 'section.nightwave', span: 'flex', preferred: 8, min: 4, max: 8 },
  { key: 'arbitration', labelKey: 'section.arbitration', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'alerts', labelKey: 'section.alerts', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'invasions', labelKey: 'section.invasions', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'events', labelKey: 'section.events', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'sortie', labelKey: 'section.sortie', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'archon', labelKey: 'section.archon', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'archimedeaDeep', labelKey: 'section.archimedeaDeep', span: 'flex', preferred: 6, min: 4, max: 8 },
  { key: 'archimedeaTemporal', labelKey: 'section.archimedeaTemporal', span: 'flex', preferred: 6, min: 4, max: 8 },
  { key: 'fissuresNormal', labelKey: 'section.fissuresNormal', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'fissuresSteel', labelKey: 'section.fissuresSteel', span: 'flex', preferred: 4, min: 4, max: 8 },
  { key: 'fissuresStorm', labelKey: 'section.fissuresStorm', span: 'flex', preferred: 4, min: 4, max: 8 },
];

const DEFAULT_LAYOUT = MODULE_DEFS.map((module) => module.key);
const MODULE_BY_KEY = new Map(MODULE_DEFS.map((module) => [module.key, module]));
const MASONRY_ROW_HEIGHT = 8;

function loadLayoutOrder() {
  try {
    const parsed = JSON.parse(localStorage.getItem(LAYOUT_KEY) || 'null');
    if (!Array.isArray(parsed)) return [...DEFAULT_LAYOUT];
    const expanded = [];
    for (const key of parsed) {
      if (key === 'archimedea') expanded.push('archimedeaDeep', 'archimedeaTemporal');
      else if (key === 'fissures') expanded.push('fissuresNormal', 'fissuresSteel', 'fissuresStorm');
      else expanded.push(key);
    }
    const valid = expanded.filter((key) => MODULE_BY_KEY.has(key));
    for (const key of DEFAULT_LAYOUT) {
      if (!valid.includes(key)) valid.push(key);
    }
    return valid;
  } catch {
    return [...DEFAULT_LAYOUT];
  }
}

function saveLayoutOrder(order) {
  try {
    localStorage.setItem(LAYOUT_KEY, JSON.stringify(order));
  } catch {
    // Storage may be unavailable (private mode / file:// restrictions).
  }
}

function marked(tag, text, loc, className = '') {
  const node = el(tag, { class: className, text });
  if (loc.isZh && text && !hasCjk(text) && /[A-Za-z]/.test(text)) node.setAttribute('lang', 'en');
  return node;
}

function localized(tag, value, loc, className = '') {
  return marked(tag, loc.text(value), loc, className);
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
        localized('h3', model.darvo.item, loc),
        model.darvo.discount > 0
          ? badge(i18n.t('darvo.discount', { discount: model.darvo.discount }), 'gold')
          : null,
      ),
      el('dl', { class: 'stat-list' },
        el('div', {}, el('dt', { text: i18n.t('darvo.sale') }), el('dd', { text: `${i18n.formatNumber(model.darvo.salePrice)} ${i18n.t('darvo.platinum')}` })),
        el('div', {}, el('dt', { text: i18n.t('darvo.original') }), el('dd', { class: 'muted', text: `${i18n.formatNumber(model.darvo.originalPrice)} ${i18n.t('darvo.platinum')}` })),
        el('div', {}, el('dt', { text: i18n.t('darvo.stock') }), el('dd', { text: i18n.formatNumber(Math.max(0, model.darvo.total - model.darvo.sold)) })),
      ),
      el('div', { class: 'card-foot' },
        el('span', { class: 'muted', text: i18n.t('common.endsAt') }),
        timeElement(i18n, model.darvo.end),
      ),
    )
    : emptyState(i18n.t('darvo.empty'));
  return section('darvo', i18n, 'section.darvo', content);
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
      localized('p', challenge.description, loc, 'challenge__desc'),
      challenge.end ? el('div', { class: 'challenge__foot' },
        el('span', { class: 'muted', text: i18n.t('common.endsAt') }),
        timeElement(i18n, challenge.end, 'countdown countdown--small'),
      ) : null,
    )));
  };

  const content = el('div', {},
    el('div', { class: 'nightwave-head' },
      badge(i18n.t('nightwave.season', { season: nightwave.season }), 'blue'),
      el('span', { class: 'muted', text: i18n.t('nightwave.ends') }),
      timeElement(i18n, nightwave.end),
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
        el('h3', {}, localizedNode(current.node, loc)),
        el('p', {},
          badge(i18n.t('arbitration.hourly'), 'blue'),
          current.type ? ` ${loc.missionType(current.typeKey, current.type)}` : null,
        ),
      ),
      el('div', { class: 'arbitration-card__time' },
        el('span', { class: 'muted', text: i18n.t('common.endsAt') }),
        timeElement(i18n, current.end, 'countdown countdown--large'),
      ),
    ));
  }

  if (next) {
    content.append(el('div', { class: 'arbitration-next' },
      el('span', { class: 'label', text: i18n.t('arbitration.next') }),
      localizedNode(next.node, loc, 'arbitration-next__node'),
      el('span', { class: 'muted', text: `${i18n.t('arbitration.startsAt')} ${i18n.formatDateTime(next.activation)}` }),
    ));
  }

  if (upcoming.length) {
    content.append(el('div', { class: 'arbitration-upcoming' },
      el('span', { class: 'label', text: i18n.t('arbitration.upcoming') }),
      el('ul', { class: 'arbitration-list' }, upcoming.map((item) => el('li', {},
        el('time', { datetime: item.activation, text: i18n.formatDateTime(item.activation) }),
        el('span', { class: 'arbitration-list__main' },
          localizedNode(item.node, loc),
          el('span', { class: 'arbitration-list__type', text: loc.missionType(item.typeKey, item.type) }),
        ),
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
      badge(loc.missionType(alert.typeKey, alert.type), 'blue'),
      localizedNode(alert.node, loc, 'alert-card__node'),
      timeElement(i18n, alert.end, 'countdown countdown--small'),
    ),
    el('div', { class: 'alert-card__meta' },
      alert.faction ? localized('span', alert.faction, loc, 'muted') : null,
      alert.minLevel || alert.maxLevel
        ? el('span', { class: 'muted', text: i18n.t('alerts.level', { min: alert.minLevel, max: alert.maxLevel }) })
        : null,
    ),
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
        invasion.vsInfestation ? badge(i18n.t('invasions.vsInfestation'), 'muted') : null,
      ),
      localized('p', invasion.description, loc, 'invasion-card__desc'),
      el('div', { class: 'invasion-sides' }, sides.map(({ key, data }) => el('div', { class: 'invasion-side' },
        el('span', { class: 'label', text: sideLabel(i18n, key) }),
        el('strong', {}, localized('span', data.faction, loc)),
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
        invasion.requiredRuns
          ? el('span', { class: 'muted', text: i18n.t(Number(invasion.requiredRuns) === 1 ? 'invasions.requiredOne' : 'invasions.required', { count: i18n.formatNumber(invasion.requiredRuns) }) })
          : null,
      ),
    );
  }));
  return section('invasions', i18n, 'section.invasions', list, { count: model.invasions.length });
}

function renderEvents(model, i18n, loc) {
  if (!model.events.length) {
    return section('events', i18n, 'section.events', emptyState(i18n.t('events.empty')));
  }
  const list = el('div', { class: 'stack' }, model.events.map((event) => el('article', { class: 'event-card' },
    el('div', { class: 'event-card__head' },
      localized('h3', event.title || i18n.t('events.untitled'), loc),
      event.end ? timeElement(i18n, event.end, 'countdown countdown--small') : null,
    ),
    el('div', { class: 'event-card__meta' },
      event.node ? localizedNode(event.node, loc) : null,
      event.type ? localized('span', event.type, loc, 'muted') : null,
      event.faction ? localized('span', event.faction, loc, 'muted') : null,
    ),
    event.progress != null ? el('div', {},
      el('div', { class: 'invasion-progress__label' },
        el('span', { text: i18n.t('events.progress') }),
        el('span', { text: `${Math.round(event.progress)}%` }),
      ),
      meter(event.progress, i18n.t('events.progress')),
    ) : null,
    event.rewards.length ? el('div', { class: 'alert-card__reward' },
      el('span', { class: 'label', text: i18n.t('events.reward') }),
      rewardChips(event.rewards),
    ) : null,
  )));
  return section('events', i18n, 'section.events', list, { count: model.events.length });
}

function renderSortieLike({ model, i18n, loc, key, titleKey, emptyKey, bossKey, modifier = false }) {
  const data = model[key];
  if (!data) return section(key, i18n, titleKey, emptyState(i18n.t(emptyKey)));
  const content = el('div', {},
    el('div', { class: 'run-head' },
      el('div', {},
        el('span', { class: 'label', text: i18n.t(bossKey) }),
        localized('h3', data.boss, loc),
      ),
      el('div', { class: 'run-head__meta' },
        data.faction ? badge(loc.faction(data.factionKey, data.faction), 'muted') : null,
        el('span', { class: 'muted', text: i18n.t('common.endsAt') }),
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
          ? localized('p', mission.modifierDescription, loc, 'fine-print')
          : null,
      ),
    ))),
  );
  return section(key, i18n, titleKey, content, { count: data.missions.length });
}

function renderArchimedea(model, i18n, loc, kind) {
  const key = kind === 'temporal' ? 'archimedeaTemporal' : 'archimedeaDeep';
  const titleKey = `section.${key}`;
  const archimedea = model.archimedeas.find((entry) => entry.kind === kind);
  if (!archimedea) {
    return section(key, i18n, titleKey, emptyState(i18n.t('archimedea.empty')));
  }

  const content = el('div', { class: 'archimedea-grid archimedea-grid--single' },
    el('article', { class: `archimedea-card archimedea-card--${kind}` },
      el('div', { class: 'archimedea-card__head' },
        el('span', { class: 'label', text: i18n.t('archimedea.expires') }),
        timeElement(i18n, archimedea.end, 'countdown countdown--small'),
      ),
      el('div', { class: 'archimedea-missions' }, archimedea.missions.map((mission, index) => el('div', { class: 'archimedea-mission' },
        el('div', { class: 'archimedea-mission__head' },
          el('span', { class: 'mission__index', text: String(index + 1).padStart(2, '0') }),
          badge(loc.missionType(mission.missionTypeKey, mission.missionType), 'blue'),
          el('span', { class: 'muted', text: kind === 'deep' ? i18n.t('archimedea.murmur') : loc.faction(mission.factionKey, mission.faction) }),
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
      archimedea.personalModifiers.length ? el('div', { class: 'archimedea-block archimedea-block--personal' },
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
      ) : null,
    ),
  );
  return section(key, i18n, titleKey, content);
}

function renderFissureModule(model, i18n, loc, key, itemsKey, titleKey) {
  const items = model.fissures[itemsKey] || [];
  const content = items.length
    ? el('ul', { class: 'fissure-list' }, items.map((fissure) => {
      const soon = fissure.remainingMs > 0 && fissure.remainingMs < 5 * 60 * 1000;
      return el('li', { class: `fissure${soon ? ' fissure--soon' : ''}` },
        el('div', { class: 'fissure__top' },
          badge(loc.tier(fissure.tierKey, fissure.tier), 'blue'),
          el('strong', { text: loc.missionType(fissure.missionTypeKey, fissure.missionType) }),
        ),
        localizedNode(fissure.node, loc, 'fissure__node'),
        el('div', { class: 'fissure__meta' },
          el('span', { class: 'muted', text: loc.faction(fissure.enemyKey, fissure.enemy) }),
          soon ? badge(i18n.t('fissure.endingSoon'), 'danger') : null,
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
    el('p', { text: i18n.t('events.loading') }),
  );
}

function renderError(i18n, message) {
  return el('div', { class: 'error-panel', attrs: { role: 'alert' } },
    icon('alert', 'icon'),
    el('div', {},
      el('h2', { text: i18n.t('events.errorTitle') }),
      el('p', { text: i18n.t('events.errorBody') }),
      message ? el('p', { class: 'fine-print', text: message }) : null,
    ),
  );
}

export function createEventsPage({ i18n, loc, model = null, meta = null, error = null, onRefresh }) {
  let currentModel = model;
  let currentMeta = meta;
  let currentError = error;
  let loading = false;
  let layoutOrder = loadLayoutOrder();
  let currentModules = null;
  let currentWarning = null;
  let masonryFrame = 0;

  const refreshLabel = el('span', { text: i18n.t('events.refresh') });
  const refreshButton = el('button', {
    class: 'button button--primary',
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
  const body = el('div', { class: 'events-body' });
  const modeBadge = badge(i18n.t('common.live'), 'ok');
  const layoutList = el('ol', { class: 'layout-list' });
  const layoutStatus = el('p', { class: 'layout-status', attrs: { role: 'status', 'aria-live': 'polite' } });

  const resetLayoutButton = el('button', {
    class: 'button button--ghost',
    type: 'button',
    text: i18n.t('layout.reset'),
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
        el('p', { class: 'section-hint', text: i18n.t('layout.hint') }),
      ),
      el('div', { class: 'layout-editor__actions' }, resetLayoutButton, closeLayoutButton),
    ),
    layoutList,
    layoutStatus,
  );

  const page = el('div', { class: 'events-page' },
    el('div', { class: 'page-heading page-heading--events' },
      el('p', { class: 'eyebrow', text: i18n.t('events.eyebrow') }),
      el('div', { class: 'page-heading__title' },
        el('h1', { text: i18n.t('events.title') }),
        modeBadge,
      ),
      el('div', { class: 'page-heading__actions' }, refreshButton, layoutButton),
    ),
    statusHost,
    layoutEditor,
    body,
  );

  function setEditorOpen(open) {
    layoutEditor.hidden = !open;
    layoutButton.setAttribute('aria-expanded', String(open));
    if (!open) layoutButton.focus({ preventScroll: true });
  }

  layoutButton.addEventListener('click', () => {
    setEditorOpen(layoutEditor.hidden);
  });
  closeLayoutButton.addEventListener('click', () => setEditorOpen(false));

  function announceSaved() {
    layoutStatus.textContent = i18n.t('layout.saved');
  }

  function renderLayoutEditor() {
    layoutList.replaceChildren(...layoutOrder.map((key, index) => {
      const module = MODULE_BY_KEY.get(key);
      const name = i18n.t(module.labelKey);
      const up = el('button', {
        class: 'layout-move',
        type: 'button',
        text: '↑',
        attrs: { 'aria-label': i18n.t('layout.moveUp', { name }) },
        disabled: index === 0,
        onClick: () => moveModule(key, -1),
      });
      const down = el('button', {
        class: 'layout-move',
        type: 'button',
        text: '↓',
        attrs: { 'aria-label': i18n.t('layout.moveDown', { name }) },
        disabled: index === layoutOrder.length - 1,
        onClick: () => moveModule(key, 1),
      });
      return el('li', { class: 'layout-item', dataset: { layoutKey: key } },
        el('span', { class: 'layout-item__index', text: String(index + 1).padStart(2, '0') }),
        el('span', { class: 'layout-item__name', text: name }),
        el('span', { class: 'layout-item__actions' }, up, down),
      );
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

  function applyLayout() {
    if (!currentModules) return;
    body.replaceChildren();
    if (currentWarning) body.append(currentWarning);
    for (const key of layoutOrder) {
      const node = currentModules[key];
      const module = MODULE_BY_KEY.get(key);
      if (!node || !module) continue;
      node.classList.add('module', `module--${module.span}`);
      node.dataset.moduleKey = key;
      body.append(node);
    }
    scheduleMasonry();
  }

  function moveModule(key, delta) {
    const index = layoutOrder.indexOf(key);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= layoutOrder.length) return;
    [layoutOrder[index], layoutOrder[target]] = [layoutOrder[target], layoutOrder[index]];
    saveLayoutOrder(layoutOrder);
    applyLayout();
    renderLayoutEditor();
    announceSaved();
    const moved = layoutList.querySelector(`[data-layout-key="${key}"] button:not([disabled])`);
    moved?.focus({ preventScroll: true });
  }

  resetLayoutButton.addEventListener('click', () => {
    layoutOrder = [...DEFAULT_LAYOUT];
    saveLayoutOrder(layoutOrder);
    applyLayout();
    renderLayoutEditor();
    announceSaved();
  });

  function setLoading(value) {
    loading = Boolean(value);
    refreshButton.disabled = loading;
    refreshButton.classList.toggle('is-loading', loading);
    refreshLabel.textContent = loading ? i18n.t('events.refreshing') : i18n.t('events.refresh');
  }

  function renderStatus() {
    statusHost.replaceChildren();
    const staticMode = Boolean(currentMeta?.static);
    modeBadge.textContent = staticMode ? i18n.t('events.snapshot') : i18n.t('common.live');
    modeBadge.className = `badge badge--${staticMode ? 'blue' : 'ok'}`;
    const fetchedAt = currentMeta?.fetchedAt;
    const items = [
      el('span', { class: 'live-status__item' },
        el('span', { class: 'live-dot', attrs: { 'aria-hidden': 'true' } }),
        fetchedAt ? i18n.t('events.updatedAt', { time: i18n.formatDateTime(fetchedAt) }) : i18n.t('common.loading'),
      ),
      el('span', { class: 'live-status__item muted', text: currentMeta?.static ? i18n.t('events.snapshotNote') : i18n.t('events.autoRefresh') }),
      el('span', { class: 'live-status__item muted', text: i18n.t('events.dataNote') }),
    ];
    if (currentMeta?.static) items.push(badge(i18n.t('events.snapshot'), 'blue'));
    if (currentMeta?.stale) items.push(badge(i18n.t('events.cached'), 'gold'));
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
      events: renderEvents(currentModel, i18n, loc),
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
      archimedeaDeep: renderArchimedea(currentModel, i18n, loc, 'deep'),
      archimedeaTemporal: renderArchimedea(currentModel, i18n, loc, 'temporal'),
      fissuresNormal: renderFissureModule(currentModel, i18n, loc, 'fissuresNormal', 'normal', 'section.fissuresNormal'),
      fissuresSteel: renderFissureModule(currentModel, i18n, loc, 'fissuresSteel', 'steel', 'section.fissuresSteel'),
      fissuresStorm: renderFissureModule(currentModel, i18n, loc, 'fissuresStorm', 'storm', 'section.fissuresStorm'),
    };
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
  return {
    node: page,
    update,
    setLoading,
    _cleanup() {
      window.removeEventListener('resize', onResize);
      if (masonryFrame) cancelAnimationFrame(masonryFrame);
      masonryFrame = 0;
    },
  };
}
