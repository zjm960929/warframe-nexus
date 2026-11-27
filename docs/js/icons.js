import { el } from './dom.js';

const ICONS = {
  mark: '<path d="M12 2.5 14.6 9l6.9 3-6.9 3L12 21.5 9.4 15l-6.9-3 6.9-3Z"/><path d="M12 7v10M7.5 12h9"/>',
  live: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3.5 2M4.5 4.5 6 6M19.5 4.5 18 6"/>',
  arbitration: '<path d="M12 3v18M5 7h14M7 7l-3 6h6L7 7Zm10 0-3 6h6l-3-6Z"/><path d="M8 21h8"/>',
  riven: '<path d="m12 3 7 5-2.5 9L12 21l-4.5-4L5 8Z"/><path d="m12 3 1 8 6-3M12 11l-7-3M12 11l-4 6M12 11l4 6"/>',
  glyphs: '<rect x="4" y="5" width="16" height="14" rx="2"/><circle cx="9" cy="10" r="1.5"/><path d="m5 17 5-5 3 3 2-2 4 4"/>',
  colors: '<path d="M12 3a9 9 0 1 0 0 18h1.5a2 2 0 0 0 0-4H12a2 2 0 0 1 0-4h4.5A4.5 4.5 0 0 0 21 8.5C21 5.5 17 3 12 3Z"/><circle cx="7.5" cy="9" r="1"/><circle cx="10" cy="6.5" r="1"/><circle cx="14" cy="6.5" r="1"/><circle cx="16.5" cy="9" r="1"/>',
  messenger: '<path d="M4 5h11a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><path d="M8 9h7M8 12h4"/><path d="M18 8h2a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v3l-3-3"/>',
  drops: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/>',
  chevron: '<path d="m8 10 4 4 4-4"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2.3 6.7"/><path d="M20 4v7h-7"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="M12 3 2.5 20h19Z"/><path d="M12 9v5M12 17h.01"/>',
  layout: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="8" cy="6" r="2"/><circle cx="15" cy="12" r="2"/><circle cx="10" cy="18" r="2"/>',
  drag: '<path d="M9 6h.01M15 6h.01M9 12h.01M15 12h.01M9 18h.01M15 18h.01" stroke-width="3" stroke-linecap="round"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  more: '<circle cx="12" cy="12" r="8.5"/><path d="M12 8v8M8 12h8"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.3"/><path d="m15.5 15.5 4.2 4.2"/>',
};

export function icon(name, className = 'icon') {
  const markup = ICONS[name] || ICONS.live;
  const wrapper = el('span', {
    class: className,
    attrs: { 'aria-hidden': 'true', focusable: 'false' },
  });
  wrapper.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${markup}</svg>`;
  return wrapper;
}
