import {
  badge,
  el,
  emptyState,
  timeElement,
} from '../dom.js';
import { getArbitrationRange, resolveArbitration } from '../arbitration.js';
import { icon } from '../icons.js';
import { hasCjk } from '../localize.js';

function startOfLocalDay(value = new Date()) {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addLocalDays(value, days) {
  const date = new Date(value);
  date.setDate(date.getDate() + days);
  return date;
}

function dateInputValue(value) {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseDateInput(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isFinite(date.getTime()) ? date : null;
}

function localDayKey(value) {
  const date = new Date(value);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function isSameLocalDay(a, b) {
  return localDayKey(a) === localDayKey(b);
}

function nodeLabel(loc, value) {
  const text = loc.node(value);
  const node = el('span', { class: 'arb-node', text });
  if (loc.isZh && text && !hasCjk(text) && /[A-Za-z]/.test(text)) node.setAttribute('lang', 'en');
  return node;
}

function missionTypeLabel(loc, item) {
  if (!item.type && !item.typeKey) return '';
  if (!loc.isZh) return item.type || '';
  if (item.typeKey && /^Dark Sector/i.test(item.type)) {
    const base = loc.missionType(item.typeKey, item.type.replace(/^Dark Sector\s+/i, '')).trim();
    const prefix = loc.text('Dark Sector');
    return base ? `${prefix}${base}` : loc.text(item.type).trim() || item.type;
  }
  return loc.missionType(item.typeKey, item.type).trim()
    || loc.text(item.type).trim()
    || item.type;
}

function factionLabel(loc, item) {
  if (!item.factionKey && !item.faction) return '';
  if (!loc.isZh) return item.faction || '';
  return loc.faction(item.factionKey, item.faction).trim()
    || loc.text(item.faction).trim()
    || item.faction;
}

function metaBadges(loc, item) {
  const badges = [];
  const type = missionTypeLabel(loc, item);
  if (type) badges.push(badge(type, 'blue'));
  const faction = factionLabel(loc, item);
  if (faction) badges.push(badge(faction, 'muted'));
  return badges.length ? el('span', { class: 'arb-tags' }, badges) : null;
}

export function createArbitrationPage({ i18n, loc, schedule = null, error = null }) {
  let data = schedule;
  let currentError = error;
  let anchor = startOfLocalDay(new Date());
  let rangeDays = 3;
  let typeFilter = '';
  let factionFilter = '';

  const currentHost = el('div', { class: 'arb-current-host' });
  const listHost = el('div', { class: 'arb-list-host' });
  const rangeLabel = el('p', { class: 'arb-range-label' });

  const dateInput = el('input', {
    type: 'date',
    class: 'arb-date',
    id: 'arb-date',
    value: dateInputValue(anchor),
    attrs: { 'aria-label': i18n.t('arbitration.date') },
  });
  const rangeSelect = el('select', {
    class: 'arb-range',
    id: 'arb-range',
    attrs: { 'aria-label': i18n.t('arbitration.range') },
  }, [1, 3, 7, 30, 90].map((days) => el('option', {
    value: String(days),
    text: i18n.t(days === 1 ? 'arbitration.oneDay' : 'arbitration.days', { count: days }),
  })));
  rangeSelect.value = String(rangeDays);
  const typeSelect = el('select', {
    class: 'arb-filter',
    id: 'arb-type',
    attrs: { 'aria-label': i18n.t('arbitration.filterType') },
  });
  const factionSelect = el('select', {
    class: 'arb-filter',
    id: 'arb-faction',
    attrs: { 'aria-label': i18n.t('arbitration.filterFaction') },
  });
  const clearFiltersButton = el('button', {
    type: 'button',
    class: 'button button--ghost',
    text: i18n.t('arbitration.clearFilters'),
  });

  const previousButton = el('button', {
    type: 'button',
    class: 'button button--ghost',
    text: '←',
    attrs: { 'aria-label': i18n.t('arbitration.previousDay') },
  });
  const nextButton = el('button', {
    type: 'button',
    class: 'button button--ghost',
    text: '→',
    attrs: { 'aria-label': i18n.t('arbitration.nextDay') },
  });
  const todayButton = el('button', {
    type: 'button',
    class: 'button button--ghost',
    text: i18n.t('arbitration.today'),
  });

  const controls = el('div', { class: 'arb-controls' },
    el('label', { class: 'arb-field' },
      el('span', { class: 'label', text: i18n.t('arbitration.date') }),
      dateInput,
    ),
    el('div', { class: 'arb-nav-buttons' }, previousButton, todayButton, nextButton),
    el('label', { class: 'arb-field' },
      el('span', { class: 'label', text: i18n.t('arbitration.range') }),
      rangeSelect,
    ),
    el('label', { class: 'arb-field' },
      el('span', { class: 'label', text: i18n.t('arbitration.filterType') }),
      typeSelect,
    ),
    el('label', { class: 'arb-field' },
      el('span', { class: 'label', text: i18n.t('arbitration.filterFaction') }),
      factionSelect,
    ),
    el('div', { class: 'arb-clear' }, clearFiltersButton),
  );

  const page = el('div', { class: 'arb-page' },
    el('div', { class: 'page-heading' },
      el('p', { class: 'eyebrow', text: i18n.t('arbitration.eyebrow') }),
      el('div', { class: 'page-heading__title' },
        el('h1', { text: i18n.t('arbitration.title') }),
      ),
    ),
    currentHost,
    el('section', { class: 'panel arb-schedule-panel', attrs: { 'aria-label': i18n.t('arbitration.title') } },
      controls,
      rangeLabel,
      listHost,
    ),
  );

  function renderCurrent() {
    currentHost.replaceChildren();
    if (!data) {
      currentHost.append(currentError
        ? el('div', { class: 'error-panel', attrs: { role: 'alert' } },
          icon('alert', 'icon'),
          el('div', {},
            el('h2', { text: i18n.t('live.errorTitle') }),
            el('p', { text: i18n.t('arbitration.noSchedule') }),
          ),
        )
        : el('div', { class: 'loading-panel', attrs: { role: 'status' } },
          icon('refresh', 'icon icon--spin'),
          el('p', { text: i18n.t('common.loading') }),
        ));
      return;
    }

    const resolved = resolveArbitration(data, new Date());
    if (!resolved?.current && !resolved?.next) {
      currentHost.append(el('div', { class: 'panel' }, emptyState(i18n.t('arbitration.noResults'))));
      return;
    }

    currentHost.append(el('section', { class: 'panel arb-current-panel' },
      el('div', { class: 'arb-current' },
        el('div', {},
          el('span', { class: 'label', text: i18n.t('arbitration.current') }),
          el('h2', {}, resolved.current
            ? nodeLabel(loc, resolved.current.node)
            : el('span', { class: 'muted', text: i18n.t('common.notAvailable') })),
          resolved.current ? metaBadges(loc, resolved.current) : null,
          resolved.current
            ? el('p', { class: 'arb-current__meta' },
              el('span', {
                class: 'arb-current__meta-line',
                text: `${i18n.t('arbitration.startsAt')} ${i18n.formatDateTime(resolved.current.activation)}`,
              }),
              el('span', {
                class: 'arb-current__meta-line',
                text: `${i18n.t('common.endsAt')} ${i18n.formatDateTime(resolved.current.expiry)}`,
              }),
            )
            : null,
        ),
        resolved.current
          ? el('div', { class: 'arb-current__time' },
            el('span', { class: 'muted', text: i18n.t('common.remaining') }),
            timeElement(i18n, resolved.current.expiry, 'countdown countdown--large'),
          )
          : null,
      ),
      resolved.next
        ? el('div', { class: 'arb-next' },
          el('span', { class: 'label', text: i18n.t('arbitration.next') }),
          nodeLabel(loc, resolved.next.node),
          metaBadges(loc, resolved.next),
          el('span', { class: 'muted', text: `${i18n.t('arbitration.startsAt')} ${i18n.formatDateTime(resolved.next.activation)}` }),
        )
        : null,
    ));
  }

  function renderRange() {
    const end = addLocalDays(anchor, rangeDays);
    const dateRangeSeparator = i18n.lang === 'zh' ? '至 ' : ' – ';
    rangeLabel.textContent = `${i18n.formatDateTime(anchor, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: undefined,
      minute: undefined,
    })}${dateRangeSeparator}${i18n.formatDateTime(end, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: undefined,
      minute: undefined,
    })}`;
  }

  function populateFilters() {
    const previousType = typeSelect.value;
    const previousFaction = factionSelect.value;
    const meta = data?.nodeMeta || {};
    const types = new Map();
    const factions = new Map();
    for (const item of Object.values(meta)) {
      const typeKey = item.typeKey || item.type;
      if (typeKey) types.set(typeKey, missionTypeLabel(loc, item));
      const factionKey = item.factionKey || item.faction;
      if (factionKey) factions.set(factionKey, factionLabel(loc, item));
    }
    const sorted = (map) => [...map.entries()].sort((a, b) => a[1].localeCompare(b[1], i18n.locale));
    typeSelect.replaceChildren(
      el('option', { value: '', text: i18n.t('arbitration.allTypes') }),
      ...sorted(types).map(([value, label]) => el('option', { value, text: label })),
    );
    factionSelect.replaceChildren(
      el('option', { value: '', text: i18n.t('arbitration.allFactions') }),
      ...sorted(factions).map(([value, label]) => el('option', { value, text: label })),
    );
    typeSelect.value = types.has(previousType) ? previousType : '';
    factionSelect.value = factions.has(previousFaction) ? previousFaction : '';
    typeFilter = typeSelect.value;
    factionFilter = factionSelect.value;
  }

  function renderList() {
    listHost.replaceChildren();
    if (!data) return;

    const end = addLocalDays(anchor, rangeDays);
    const now = new Date();
    const showFutureOnly = isSameLocalDay(anchor, now);
    const items = getArbitrationRange(data, anchor, end, now)
      .filter((item) => !showFutureOnly || item.status !== 'past')
      .filter((item) => !typeFilter || (item.typeKey || item.type) === typeFilter)
      .filter((item) => !factionFilter || (item.factionKey || item.faction) === factionFilter);

    if (!items.length) {
      listHost.append(emptyState(i18n.t('arbitration.noResults')));
      return;
    }

    const groups = new Map();
    for (const item of items) {
      const key = localDayKey(item.activation);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    }

    const fragment = document.createDocumentFragment();
    for (const group of groups.values()) {
      const day = new Date(group[0].activation);
      const heading = i18n.formatDateTime(day, {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: undefined,
        minute: undefined,
      });
      fragment.append(el('section', { class: 'arb-day' },
        el('div', { class: 'arb-day__head' },
          el('h2', { text: heading }),
          badge(i18n.t(group.length === 1 ? 'arbitration.oneEntry' : 'arbitration.total', { count: group.length }), 'muted'),
        ),
        el('ol', { class: 'arb-list' }, group.map((item) => {
          const statusKey = `arbitration.status.${item.status}`;
          const variant = item.status === 'current' ? 'ok' : item.status === 'past' ? 'muted' : 'blue';
          return el('li', {
            class: `arb-row${item.status === 'current' ? ' arb-row--current' : ''}${item.status === 'past' ? ' arb-row--past' : ''}`,
            attrs: item.status === 'current' ? { 'aria-current': 'time' } : {},
          },
            el('time', {
              class: 'arb-row__time',
              datetime: item.activation,
              text: i18n.formatClock(item.activation),
            }),
            el('span', { class: 'arb-row__body' },
              nodeLabel(loc, item.node),
              metaBadges(loc, item),
            ),
            el('span', { class: 'arb-row__end' },
              `${i18n.formatClock(item.expiry)}`,
            ),
            badge(i18n.t(statusKey), variant),
          );
        })),
      ));
    }
    listHost.append(fragment);
  }

  function renderAll() {
    renderCurrent();
    renderRange();
    populateFilters();
    renderList();
  }

  function setAnchor(next) {
    anchor = startOfLocalDay(next);
    dateInput.value = dateInputValue(anchor);
    renderRange();
    renderList();
  }

  dateInput.addEventListener('change', () => {
    const parsed = parseDateInput(dateInput.value);
    if (parsed) setAnchor(parsed);
  });
  previousButton.addEventListener('click', () => setAnchor(addLocalDays(anchor, -1)));
  nextButton.addEventListener('click', () => setAnchor(addLocalDays(anchor, 1)));
  todayButton.addEventListener('click', () => setAnchor(new Date()));
  rangeSelect.addEventListener('change', () => {
    rangeDays = Number(rangeSelect.value) || 3;
    renderRange();
    renderList();
  });
  typeSelect.addEventListener('change', () => {
    typeFilter = typeSelect.value;
    renderList();
  });
  factionSelect.addEventListener('change', () => {
    factionFilter = factionSelect.value;
    renderList();
  });
  clearFiltersButton.addEventListener('click', () => {
    typeSelect.value = '';
    factionSelect.value = '';
    typeFilter = '';
    factionFilter = '';
    renderList();
  });

  function update(next = {}) {
    if ('schedule' in next) data = next.schedule;
    if ('error' in next) currentError = next.error;
    renderAll();
  }

  const refreshTimer = setInterval(() => {
    renderCurrent();
    renderList();
  }, 60_000);

  renderAll();
  return {
    node: page,
    update,
    _cleanup() {
      clearInterval(refreshTimer);
    },
  };
}
