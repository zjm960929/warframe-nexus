const LOCALE_PATHS = {
  zh: './locales/zh-CN.json',
  en: './locales/en.json',
};

const localeCache = new Map();

export function normalizeLang(value) {
  return value === 'en' ? 'en' : 'zh';
}

export function detectLang() {
  const stored = (() => {
    try {
      return localStorage.getItem('wf-nexus-lang');
    } catch {
      return null;
    }
  })();
  if (stored === 'zh' || stored === 'en') return stored;
  const languages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language || 'en'];
  return languages.some((language) => String(language).toLowerCase().startsWith('zh')) ? 'zh' : 'en';
}

export async function loadLocale(lang) {
  const normalized = normalizeLang(lang);
  if (localeCache.has(normalized)) return localeCache.get(normalized);
  const embedded = globalThis.__WF_NEXUS_EMBEDDED__;
  if (embedded?.locales?.[normalized]) {
    localeCache.set(normalized, embedded.locales[normalized]);
    return embedded.locales[normalized];
  }
  const response = await fetch(LOCALE_PATHS[normalized], { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load locale ${normalized}`);
  const messages = await response.json();
  localeCache.set(normalized, messages);
  return messages;
}

export function createI18n(lang, messages) {
  const normalized = normalizeLang(lang);
  const locale = normalized === 'zh' ? 'zh-CN' : 'en-US';

  function t(key, variables = {}) {
    const template = messages[key];
    if (typeof template !== 'string') return key;
    return template.replace(/\{(\w+)\}/g, (_, name) => (
      Object.prototype.hasOwnProperty.call(variables, name) ? String(variables[name]) : `{${name}}`
    ));
  }

  function formatNumber(value, options = {}) {
    return new Intl.NumberFormat(locale, { useGrouping: false, ...options }).format(Number(value) || 0);
  }

  function formatDateTime(value, options = {}) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    const formatter = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
      ...options,
    });
    const formatted = formatter.format(date);
    if (normalized !== 'zh') return formatted;
    return formatted
      .replace(/(\d)(年|月|日)/g, '$1 $2')
      .replace(/([年月日])(?=\d)/g, '$1 ')
      .replace(/(日)(?=周|星期)/g, '$1 ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function formatClock(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return '—';
    return new Intl.DateTimeFormat(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).format(date);
  }

  function formatCountdown(milliseconds, compact = false) {
    if (milliseconds == null || !Number.isFinite(milliseconds)) return '—';
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
    if (totalSeconds <= 0) return t('time.ended');

    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (compact) {
      if (days > 0) return `${days}d ${String(hours).padStart(2, '0')}h`;
      if (hours > 0) return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    if (days > 0) {
      return `${t('time.days', { n: days })} ${t('time.hours', { n: hours })}`;
    }
    if (hours > 0) {
      return `${t('time.hours', { n: hours })} ${t('time.minutes', { n: minutes })}`;
    }
    if (minutes > 0) {
      return `${t('time.minutes', { n: minutes })} ${t('time.seconds', { n: seconds })}`;
    }
    return t('time.seconds', { n: seconds });
  }

  return {
    lang: normalized,
    locale,
    messages,
    t,
    formatNumber,
    formatDateTime,
    formatClock,
    formatCountdown,
  };
}
