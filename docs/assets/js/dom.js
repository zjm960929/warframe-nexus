export function el(tag, props = {}, ...children) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props || {})) {
    if (value == null || value === false) continue;
    if (key === 'class') node.className = value;
    else if (key === 'text') node.textContent = value;
    else if (key === 'dataset') Object.assign(node.dataset, value);
    else if (key === 'attrs') {
      for (const [attr, attrValue] of Object.entries(value)) {
        if (attrValue != null && attrValue !== false) node.setAttribute(attr, String(attrValue));
      }
    } else if (key.startsWith('on') && typeof value === 'function') {
      node.addEventListener(key.slice(2).toLowerCase(), value);
    } else if (key in node) {
      node[key] = value;
    } else {
      node.setAttribute(key, String(value));
    }
  }
  append(node, children);
  return node;
}

export function append(node, children) {
  for (const child of children.flat(Infinity)) {
    if (child == null || child === false) continue;
    if (Array.isArray(child)) append(node, child);
    else if (child instanceof Node) node.appendChild(child);
    else node.appendChild(document.createTextNode(String(child)));
  }
  return node;
}

export function clear(node) {
  node.replaceChildren();
  return node;
}

export function badge(text, variant = '') {
  return el('span', { class: `badge${variant ? ` badge--${variant}` : ''}`, text });
}

export function timeElement(i18n, value, className = 'countdown') {
  return el('time', {
    class: className,
    datetime: value || undefined,
    dataset: value ? { expiry: value } : {},
    text: value ? i18n.formatCountdown(new Date(value).getTime() - Date.now()) : '—',
  });
}

export function meter(percent, label, variant = '') {
  const value = Math.max(0, Math.min(100, Number(percent) || 0));
  return el('div', {
    class: `meter${variant ? ` meter--${variant}` : ''}`,
    attrs: {
      role: 'progressbar',
      'aria-label': label,
      'aria-valuemin': 0,
      'aria-valuemax': 100,
      'aria-valuenow': Math.round(value),
    },
  }, el('span', { class: 'meter__fill', style: `width:${value.toFixed(1)}%` }));
}

export function emptyState(message) {
  return el('p', { class: 'empty-state', text: message });
}

export function sectionHeader(i18n, title, options = {}) {
  const { id, hint } = options;
  return el('div', { class: 'section-heading' },
    el('div', { class: 'section-heading__copy' },
      el('h2', { id, text: title }),
      hint ? el('p', { class: 'section-hint', text: hint }) : null,
    ),
  );
}
