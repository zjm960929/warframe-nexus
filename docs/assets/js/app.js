import { el } from './dom.js';
import { FEATURES, featureByPath } from './features.js';
import { createI18n, detectLang, loadLocale, normalizeLang } from './i18n.js';
import { createLocalizer } from './localize.js';
import { normalizeWorldstate } from './normalize.js';
import { parseArbitrationCsv } from './arbitration.js';
import { icon } from './icons.js';
import { renderHome } from './pages/home.js';
import { createEventsPage } from './pages/events.js';
import { createArbitrationPage } from './pages/arbitration.js';
import { renderNotFound, renderPlaceholder } from './pages/placeholder.js';

const THEME_KEY = 'wf-nexus-theme';
const LANG_KEY = 'wf-nexus-lang';
const REFRESH_MS = 60_000;
const FETCH_TIMEOUT_MS = 25_000;

const state = {
  lang: 'zh',
  i18n: null,
  loc: null,
  terms: null,
  page: null,
  route: null,
  loading: false,
  data: new Map(),
  arbitration: null,
  pendingSection: null,
  renderToken: 0,
};

const main = document.getElementById('main');
const navList = document.getElementById('nav-list');
const languageSwitch = document.getElementById('language-switch');
const themeSwitch = document.getElementById('theme-switch');
const nav = document.querySelector('.site-nav');

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage can be disabled; the site still works for this session.
  }
}

function currentTheme() {
  const value = readStorage(THEME_KEY);
  return value === 'light' || value === 'dark' ? value : 'auto';
}

function applyTheme(theme) {
  const root = document.documentElement;
  const normalized = theme === 'light' || theme === 'dark' ? theme : 'auto';
  if (normalized === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', normalized);
  const meta = document.querySelector('meta[name="color-scheme"]');
  if (meta) meta.setAttribute('content', normalized === 'auto' ? 'light dark' : normalized);
  syncThemeSwitch(normalized);
  if (normalized === 'auto') writeStorage(THEME_KEY, null);
  else writeStorage(THEME_KEY, normalized);
}

function applyStaticTranslations() {
  for (const node of document.querySelectorAll('[data-i18n]')) {
    const key = node.getAttribute('data-i18n');
    const value = state.i18n.t(key);
    if (value && value !== key) node.textContent = value;
  }
  for (const node of document.querySelectorAll('[data-i18n-title]')) {
    const key = node.getAttribute('data-i18n-title');
    const value = state.i18n.t(key);
    if (value && value !== key) node.setAttribute('title', value);
  }
  for (const node of document.querySelectorAll('[data-i18n-aria-label]')) {
    const key = node.getAttribute('data-i18n-aria-label');
    const value = state.i18n.t(key);
    if (value && value !== key) node.setAttribute('aria-label', value);
  }
}

function syncThemeSwitch(theme = currentTheme()) {
  if (!themeSwitch) return;
  for (const button of themeSwitch.querySelectorAll('[data-theme]')) {
    const active = button.dataset.theme === theme;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function syncLanguageSwitch() {
  if (!languageSwitch) return;
  for (const button of languageSwitch.querySelectorAll('[data-lang]')) {
    const active = button.dataset.lang === state.lang;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-pressed', String(active));
  }
}

function syncControls() {
  syncLanguageSwitch();
  syncThemeSwitch(currentTheme());
}

function renderNav() {
  if (!navList) return;
  const items = [
    { route: 'home', href: '#/', label: state.i18n.t('nav.home') },
    ...FEATURES.filter((feature) => feature.available).map((feature) => ({
      route: feature.id,
      href: `#/${feature.path}`,
      label: state.i18n.t(`feature.${feature.id}.name`),
    })),
  ];
  navList.replaceChildren(
    ...items.map((item) => el('li', {},
      el('a', {
        href: item.href,
        dataset: { route: item.route },
        text: item.label,
      }),
    )),
    el('li', {},
      el('span', {
        class: 'nav-more',
        text: state.i18n.t('nav.more'),
        attrs: { 'aria-disabled': 'true' },
      }),
    ),
  );
  if (nav) nav.setAttribute('aria-label', state.i18n.t('nav.label'));
}

function updateNav(activeRoute) {
  for (const link of navList.querySelectorAll('a')) {
    if (link.dataset.route === activeRoute) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
}

function parseHash() {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [pathPart, section] = raw.split('/');
  const path = pathPart || '';
  if (!path) return { page: 'home', section: '' };
  return { page: path, section: section || '' };
}

function setDocumentMeta(title, description, { suffix = true } = {}) {
  document.title = suffix ? `${title} · ${state.i18n.t('app.name')}` : title;
  const meta = document.querySelector('meta[name="description"]');
  if (meta && description) meta.setAttribute('content', description);
}

function scrollToSection(section) {
  if (!section) return;
  const target = document.getElementById(section);
  if (!target) return;
  target.scrollIntoView({ block: 'start', behavior: 'auto' });
}

function focusMain() {
  if (!main) return;
  main.focus({ preventScroll: true });
}

function stopPage() {
  if (state.page && typeof state.page._cleanup === 'function') state.page._cleanup();
  state.page = null;
}

function setRouteView(node, options = {}) {
  main.replaceChildren(node);
  if (options.focus !== false) focusMain();
}

function renderRoute(options = {}) {
  const token = ++state.renderToken;
  const route = parseHash();
  state.route = route;
  state.loading = false;
  stopPage();

  if (route.page === 'home') {
    updateNav('home');
    const node = renderHome({ i18n: state.i18n });
    state.page = node;
    setRouteView(node);
    setDocumentMeta(state.i18n.t('app.name'), state.i18n.t('app.description'), { suffix: false });
    state.pendingSection = null;
    return;
  }

  const feature = featureByPath(route.page);
  if (!feature) {
    updateNav('');
    const node = renderNotFound({ i18n: state.i18n });
    setRouteView(node);
    setDocumentMeta(state.i18n.t('notFound.title'), state.i18n.t('notFound.body'));
    state.pendingSection = null;
    return;
  }

  updateNav(feature.id);

  if (feature.id === 'arbitration') {
    const token = state.renderToken;
    const page = createArbitrationPage({
      i18n: state.i18n,
      loc: state.loc,
      schedule: state.arbitration,
    });
    state.page = page;
    setRouteView(page.node, { focus: false });
    setDocumentMeta(state.i18n.t('arbitration.title'), state.i18n.t('feature.arbitration.desc'));
    state.pendingSection = null;
    if (state.arbitration) {
      focusMain();
      return;
    }
    loadArbitrationData().then((schedule) => {
      if (token !== state.renderToken || state.page !== page) return;
      page.update(schedule ? { schedule } : { error: 'arbitration_schedule_unavailable' });
      focusMain();
    });
    return;
  }

  if (feature.id !== 'events') {
    const node = renderPlaceholder({ i18n: state.i18n, feature });
    setRouteView(node);
    setDocumentMeta(state.i18n.t(`feature.${feature.id}.name`), state.i18n.t(`feature.${feature.id}.desc`));
    state.pendingSection = null;
    return;
  }

  const cached = state.data.get(state.lang);
  const hasModel = Boolean(cached?.model);
  state.pendingSection = route.section || null;
  const page = createEventsPage({
    i18n: state.i18n,
    loc: state.loc,
    model: cached?.model || null,
    meta: cached?.meta || null,
    error: cached?.error || null,
    onRefresh: () => refreshEvents(true),
  });
  state.page = page;
  setRouteView(page.node, { focus: false });
  if (!hasModel) {
    refreshEvents(false, token);
  } else {
    if (state.pendingSection) {
      requestAnimationFrame(() => {
        scrollToSection(state.pendingSection);
        state.pendingSection = null;
      });
    }
  }
  setDocumentMeta(state.i18n.t('events.title'), state.i18n.t('feature.events.desc'));
  if (options.focus !== false) focusMain();
}

async function fetchJson(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}

async function fetchText(url, timeoutMs = FETCH_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      cache: 'no-store',
      headers: { Accept: 'text/plain' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.text();
  } finally {
    clearTimeout(timer);
  }
}

async function loadArbitrationData() {
  if (state.arbitration) return state.arbitration;
  const embedded = globalThis.__WF_NEXUS_EMBEDDED__;
  if (embedded?.arbitration?.csv) {
    state.arbitration = {
      entries: parseArbitrationCsv(embedded.arbitration.csv),
      nodes: embedded.arbitration.nodes || {},
      nodeMeta: embedded.arbitration.nodeMeta || {},
    };
    return state.arbitration;
  }

  try {
    const [csv, nodes, nodeMeta] = await Promise.all([
      fetchText(new URL('data/arbitration-schedule.csv', document.baseURI)),
      fetchJson(new URL('data/arbitration-nodes.json', document.baseURI)),
      fetchJson(new URL('data/arbitration-node-meta.json', document.baseURI)),
    ]);
    state.arbitration = {
      entries: parseArbitrationCsv(csv),
      nodes: nodes || {},
      nodeMeta: nodeMeta || {},
    };
    return state.arbitration;
  } catch (error) {
    console.warn('Could not load arbitration schedule:', error);
    return null;
  }
}

function externalApiBase() {
  const value = document.querySelector('meta[name="wf-nexus-api"]')?.content?.trim();
  if (!value) return null;
  return new URL(value, document.baseURI);
}

async function loadWorldstate(lang, { fresh = false } = {}) {
  const embedded = globalThis.__WF_NEXUS_EMBEDDED__;
  const staticMode = document.querySelector('meta[name="wf-nexus-mode"]')?.content === 'static'
    || Boolean(embedded);
  if (embedded?.snapshots?.[lang]) {
    return {
      raw: embedded.snapshots[lang].data,
      meta: {
        ...(embedded.snapshots[lang].meta || {}),
        lang,
        stale: false,
        static: true,
      },
    };
  }

  let externalError = null;
  const apiBase = externalApiBase();
  if (apiBase) {
    try {
      const base = apiBase.href.endsWith('/') ? apiBase.href : `${apiBase.href}/`;
      const url = new URL('api/worldstate', base);
      url.searchParams.set('lang', lang);
      if (fresh) url.searchParams.set('fresh', '1');
      const payload = await fetchJson(url);
      if (!payload || !payload.data) throw new Error('Malformed external worldstate response');
      return {
        raw: payload.data,
        meta: {
          ...(payload.meta || {}),
          lang,
          static: false,
        },
      };
    } catch (error) {
      externalError = error;
    }
  }

  let serverError = null;
  if (!staticMode) {
    try {
      const url = new URL(`api/worldstate?lang=${encodeURIComponent(lang)}`, document.baseURI);
      if (fresh) url.searchParams.set('fresh', '1');
      const payload = await fetchJson(url);
      if (!payload || !payload.data) throw new Error('Malformed worldstate response');
      return { raw: payload.data, meta: payload.meta || { lang, fetchedAt: new Date().toISOString() } };
    } catch (error) {
      serverError = error;
    }
  }

  // GitHub Pages is static and cannot proxy the official feed (the official
  // endpoint does not send CORS headers). Use the build-time official
  // snapshot generated by `npm run build:pages`.
  try {
    const payload = await fetchJson(new URL(`data/worldstate-${lang}.json`, document.baseURI));
    if (!payload || !payload.data) throw new Error('Malformed static worldstate snapshot');
    return {
      raw: payload.data,
      meta: {
        ...(payload.meta || {}),
        lang,
        stale: false,
        static: true,
      },
    };
  } catch (staticError) {
    throw externalError || serverError || staticError;
  }
}

async function refreshEvents(manual = false, renderToken = state.renderToken) {
  if (state.loading) return;
  if (parseHash().page !== 'events') return;
  state.loading = true;
  state.page?.setLoading(true);
  try {
    const [{ raw, meta }, arbitrationSchedule] = await Promise.all([
      loadWorldstate(state.lang, { fresh: manual }),
      loadArbitrationData(),
    ]);
    if (renderToken !== state.renderToken) return;
    const model = normalizeWorldstate(raw, new Date(), { arbitrationSchedule });
    state.data.set(state.lang, { model, meta, fetchedAt: Date.now() });
    state.page?.update({ model, meta, error: null, loading: false });
    if (state.pendingSection) {
      requestAnimationFrame(() => {
        scrollToSection(state.pendingSection);
        state.pendingSection = null;
      });
    }
  } catch (error) {
    if (renderToken !== state.renderToken) return;
    const previous = state.data.get(state.lang);
    state.data.set(state.lang, {
      ...(previous || {}),
      error: error?.message || 'Network error',
    });
    state.page?.update({
      error: error?.message || 'Network error',
      loading: false,
    });
  } finally {
    state.loading = false;
  }
}

async function ensureLocaleAndTerms(lang) {
  state.lang = normalizeLang(lang);
  document.documentElement.lang = state.lang === 'zh' ? 'zh-CN' : 'en';
  const messages = await loadLocale(state.lang);
  state.i18n = createI18n(state.lang, messages);

  if (state.lang === 'zh') {
    const embedded = globalThis.__WF_NEXUS_EMBEDDED__;
    if (!state.terms) {
      if (embedded?.terms) {
        state.terms = embedded.terms;
      } else {
        try {
          state.terms = await fetchJson('./data/terms.zh.json');
        } catch (error) {
          console.warn('Could not load Chinese terms:', error);
          state.terms = {};
        }
      }
    }
    state.loc = createLocalizer('zh', state.terms);
  } else {
    state.loc = createLocalizer('en', null);
  }
}

async function setLanguage(lang) {
  const next = normalizeLang(lang);
  if (next === state.lang) return;
  writeStorage(LANG_KEY, next);
  try {
    await ensureLocaleAndTerms(next);
    applyStaticTranslations();
    syncControls();
    renderNav();
    renderRoute({ focus: false });
  } catch (error) {
    console.error('Language switch failed:', error);
  }
}

function setupControls() {
  languageSwitch?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-lang]');
    if (button) setLanguage(button.dataset.lang);
  });
  themeSwitch?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-theme]');
    if (button) applyTheme(button.dataset.theme);
  });
  syncControls();
}

function updateCountdowns() {
  if (!state.i18n) return;
  const now = Date.now();
  for (const node of document.querySelectorAll('[data-expiry]')) {
    const end = Date.parse(node.dataset.expiry);
    if (!Number.isFinite(end)) continue;
    const remaining = end - now;
    node.textContent = state.i18n.formatCountdown(remaining);
    node.classList.toggle('is-ended', remaining <= 0);
  }
}

function setupAutoRefresh() {
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (parseHash().page !== 'events') return;
    const cached = state.data.get(state.lang);
    const refreshAfter = cached?.meta?.static ? 5 * 60_000 : REFRESH_MS;
    if (cached && Date.now() - cached.fetchedAt < refreshAfter) return;
    refreshEvents(false);
  }, 15_000);

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    if (parseHash().page !== 'events') return;
    const cached = state.data.get(state.lang);
    const refreshAfter = cached?.meta?.static ? 5 * 60_000 : REFRESH_MS;
    if (!cached || Date.now() - cached.fetchedAt >= refreshAfter) refreshEvents(false);
  });
}

function setupStorageSync() {
  window.addEventListener('storage', (event) => {
    if (event.key === LANG_KEY && event.newValue && event.newValue !== state.lang) {
      setLanguage(event.newValue);
    }
    if (event.key === THEME_KEY) {
      applyTheme(event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : 'auto');
    }
  });
}

async function init() {
  applyTheme(currentTheme());
  state.lang = normalizeLang(readStorage(LANG_KEY) || detectLang());
  await ensureLocaleAndTerms(state.lang);
  applyStaticTranslations();
  syncControls();
  renderNav();
  setupControls();
  setupStorageSync();
  setupAutoRefresh();
  renderRoute({ focus: false });
  setInterval(updateCountdowns, 1000);
  window.addEventListener('hashchange', () => renderRoute());
}

init().catch((error) => {
  console.error('Warframe Nexus failed to start:', error);
  if (main) {
    const zh = /^zh/i.test(navigator.language || '');
    main.replaceChildren(el('div', { class: 'error-panel', attrs: { role: 'alert' } },
      icon('alert', 'icon'),
      el('div', {},
        el('h1', { text: zh ? 'Warframe 星际枢纽' : 'Warframe Nexus' }),
        el('p', {
          text: zh
            ? '应用未能启动。请检查浏览器控制台，然后刷新页面。'
            : 'The application did not start. Check the browser console and refresh the page.',
        }),
      ),
    ));
  }
});
