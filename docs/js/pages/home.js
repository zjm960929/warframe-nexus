import { el } from '../dom.js';
import { FEATURES } from '../features.js';
import { icon } from '../icons.js';

const BILIBILI_ICON = `
  <svg viewBox="0 0 28 24" width="22" height="19" aria-hidden="true" focusable="false">
    <line x1="8" y1="2" x2="11.2" y2="6.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <line x1="20" y1="2" x2="16.8" y2="6.4" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
    <rect x="3" y="6.2" width="22" height="15.6" rx="5.5" fill="none" stroke="currentColor" stroke-width="2.2"/>
    <rect x="9.4" y="11" width="2.7" height="6" rx="1.35" fill="currentColor"/>
    <rect x="15.9" y="11" width="2.7" height="6" rx="1.35" fill="currentColor"/>
  </svg>`;

const DOUYIN_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M16.6 3c.4 2.2 1.9 3.8 4.1 4v3.1c-1.6 0-3-.5-4.1-1.4v6.4c0 3.4-2.7 6-6 6s-6-2.6-6-6 2.7-6 6-6c.34 0 .67.03 1 .1v3.3c-.31-.1-.65-.16-1-.16-1.6 0-2.9 1.3-2.9 2.9s1.3 2.9 2.9 2.9 2.9-1.3 2.9-2.9V3h3.1z"/>
  </svg>`;

const GITHUB_ICON = '<span class="home-social-link__github" aria-hidden="true"></span>';

const EMAIL_ICON = `
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden="true" focusable="false">
    <rect x="3" y="5" width="18" height="14" rx="2.5" stroke="currentColor" stroke-width="1.8"/>
    <path d="m4 7 8 6 8-6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
  </svg>`;

function socialLink(href, label, markup, external = true) {
  const link = el('a', {
    class: 'home-social-link',
    href,
    title: label,
    target: external ? '_blank' : null,
    rel: external ? 'noopener noreferrer' : null,
    attrs: { 'aria-label': label },
  });
  link.innerHTML = markup;
  return link;
}

function searchText(i18n, feature) {
  return [
    i18n.t(`feature.${feature.id}.name`),
    i18n.t(`feature.${feature.id}.desc`),
    i18n.t(`feature.${feature.id}.keywords`),
    feature.id,
  ].join(' ').normalize('NFKC').toLowerCase();
}

export function renderHome({ i18n }) {
  const cards = [];
  const searchIndex = new Map();
  const features = FEATURES.filter((feature) => feature.available);

  for (const feature of features) {
    const text = searchText(i18n, feature);
    searchIndex.set(feature.id, text);
    cards.push(el('a', {
      class: 'tool-card tool-card--available',
      href: `#/${feature.path}`,
      dataset: { feature: feature.id },
      attrs: { 'data-search': text },
    },
      el('span', { class: 'tool-card__icon' }, icon(feature.icon, 'icon icon--large')),
      el('span', { class: 'tool-card__title', text: i18n.t(`feature.${feature.id}.name`) }),
    ));
  }

  const moreTitle = i18n.t('home.moreTitle');
  searchIndex.set('more', moreTitle.normalize('NFKC').toLowerCase());
  cards.push(el('div', {
    class: 'tool-card tool-card--more',
    dataset: { feature: 'more' },
    attrs: { 'data-search': searchIndex.get('more') },
  },
    el('span', { class: 'tool-card__icon' }, icon('more', 'icon icon--large')),
    el('span', { class: 'tool-card__title', text: moreTitle }),
  ));

  const grid = el('div', { class: 'tool-grid', id: 'tool-grid' }, cards);
  const empty = el('p', {
    class: 'empty-state search-empty',
    text: i18n.t('home.searchNoResults'),
    hidden: true,
  });

  const input = el('input', {
    id: 'tool-search',
    class: 'search-input',
    type: 'search',
    name: 'q',
    autocomplete: 'off',
    spellcheck: false,
    attrs: { 'aria-label': i18n.t('home.searchLabel') },
  });

  const form = el('form', {
    class: 'search-form',
    attrs: { role: 'search' },
    onSubmit(event) {
      event.preventDefault();
      const first = grid.querySelector('a.tool-card:not([hidden])');
      if (first) window.location.hash = first.getAttribute('href');
    },
  },
    el('label', { class: 'visually-hidden', for: 'tool-search', text: i18n.t('home.searchLabel') }),
    el('span', { class: 'search-form__icon' }, icon('search', 'icon')),
    input,
    el('button', {
      class: 'button button--ghost search-clear',
      type: 'button',
      text: '×',
      attrs: { 'aria-label': i18n.t('home.searchClear') },
      hidden: true,
    }),
  );

  const clearButton = form.querySelector('.search-clear');

  function applyFilter() {
    const query = input.value.normalize('NFKC').toLowerCase().trim();
    let visible = 0;
    for (const card of cards) {
      const match = !query || searchIndex.get(card.dataset.feature).includes(query);
      card.hidden = !match;
      if (match) visible += 1;
    }
    empty.hidden = visible !== 0;
    clearButton.hidden = query.length === 0;
  }

  input.addEventListener('input', applyFilter);
  clearButton.addEventListener('click', () => {
    input.value = '';
    applyFilter();
    input.focus();
  });

  const social = el('div', {
    class: 'home-social',
    attrs: { role: 'group', 'aria-label': i18n.t('social.label') },
  },
    socialLink('https://space.bilibili.com/16730771', i18n.t('social.bilibili'), BILIBILI_ICON),
    socialLink('https://www.douyin.com/user/MS4wLjABAAAAFIQ6-Ww8fODvrsOR2oFTtegpwDnpVq_PKHIUbxkvFSE', i18n.t('social.douyin'), DOUYIN_ICON),
    socialLink('https://github.com/zjm960929/warframe-nexus', i18n.t('social.github'), GITHUB_ICON),
    socialLink('mailto:zjm960929@outlook.com', i18n.t('social.email'), EMAIL_ICON, false),
  );

  const home = el('div', { class: 'home home--minimal' },
    el('section', { class: 'hero hero--home', attrs: { 'aria-labelledby': 'home-title' } },
      el('h1', { id: 'home-title', text: i18n.t('app.name') }),
      social,
      form,
    ),
    el('section', { class: 'home-tools' }, grid, empty),
  );

  // A small keyboard affordance, only while the home page is mounted.
  const onKeydown = (event) => {
    const tag = document.activeElement?.tagName;
    if (event.key === '/' && tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT') {
      event.preventDefault();
      input.focus();
    }
  };
  document.addEventListener('keydown', onKeydown);
  home._cleanup = () => document.removeEventListener('keydown', onKeydown);

  return home;
}
