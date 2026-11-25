import { badge, el } from '../dom.js';
import { icon } from '../icons.js';

export function renderPlaceholder({ i18n, feature }) {
  const name = i18n.t(`feature.${feature.id}.name`);
  return el('div', { class: 'placeholder-page' },
    el('div', { class: 'page-heading' },
      el('p', { class: 'eyebrow', text: i18n.t('placeholder.eyebrow') }),
      el('div', { class: 'page-heading__title' },
        el('span', { class: 'page-heading__icon' }, icon(feature.icon, 'icon icon--large')),
        el('h1', { text: name }),
        badge(i18n.t('status.soon'), 'muted'),
      ),
      el('p', { class: 'lede', text: i18n.t(`feature.${feature.id}.desc`) }),
    ),
    el('div', { class: 'placeholder-panel' },
      el('p', { text: i18n.t('placeholder.body') }),
      el('p', { class: 'muted', text: i18n.t('placeholder.note') }),
      el('div', { class: 'button-row' },
        el('a', { class: 'button', href: '#/events', text: i18n.t('nav.events') }),
        el('a', { class: 'button button--ghost', href: '#/', text: i18n.t('common.backHome') }),
      ),
    ),
  );
}

export function renderNotFound({ i18n }) {
  return el('div', { class: 'placeholder-page' },
    el('div', { class: 'page-heading' },
      el('p', { class: 'eyebrow', text: '404' }),
      el('h1', { text: i18n.t('notFound.title') }),
      el('p', { class: 'lede', text: i18n.t('notFound.body') }),
    ),
    el('div', { class: 'button-row' },
      el('a', { class: 'button', href: '#/', text: i18n.t('common.backHome') }),
    ),
  );
}
