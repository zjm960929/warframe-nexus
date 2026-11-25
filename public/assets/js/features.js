export const FEATURES = [
  { id: 'events', path: 'events', icon: 'events', available: true },
  { id: 'arbitration', path: 'arbitration', icon: 'arbitration', available: true },
  { id: 'riven', path: 'riven', icon: 'riven' },
  { id: 'glyphs', path: 'glyphs', icon: 'glyphs' },
  { id: 'colors', path: 'colors', icon: 'colors' },
  { id: 'messenger', path: 'messenger', icon: 'messenger' },
  { id: 'drops', path: 'drops', icon: 'drops' },
];

export function featureById(id) {
  return FEATURES.find((feature) => feature.id === id) || null;
}

export function featureByPath(path) {
  return FEATURES.find((feature) => feature.path === path) || null;
}
