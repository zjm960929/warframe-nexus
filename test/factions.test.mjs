import test from 'node:test';
import assert from 'node:assert/strict';
import { factionSlug, factionVariant } from '../public/assets/js/factions.js';

test('Kuva Fortress Grineer resolve to the Kuva variant', () => {
  const item = { factionKey: 'FC_GRINEER', faction: 'Grineer' };
  assert.equal(factionVariant(item, 'Koro (Kuva Fortress)')?.slug, 'kuva');
  assert.equal(factionVariant(item, 'Koro（赤毒要塞）')?.zh, '赤毒 Grineer');
});

test('Jupiter Corpus resolve to the Amalgam variant', () => {
  const item = { factionKey: 'FC_CORPUS', faction: 'Corpus' };
  assert.equal(factionVariant(item, 'Themisto (Jupiter)')?.slug, 'amalgam');
  assert.equal(factionVariant(item, 'Themisto（木星）')?.zh, '并合 Corpus');
});

test('Deimos Infested resolve to the Deimos variant', () => {
  const item = { factionKey: 'FC_INFESTATION', faction: 'Infested' };
  assert.equal(factionVariant(item, 'Persto (Deimos)')?.slug, 'deimos');
  assert.equal(factionVariant(item, 'Persto（火卫二）')?.en, 'Deimos Infested');
});

test('Deimos Murmur and mismatched factions are not overridden', () => {
  assert.equal(factionVariant({ factionKey: 'FC_MURMUR', faction: 'The Murmur' }, 'Persto (Deimos)'), null);
  assert.equal(factionVariant({ factionKey: 'FC_CORPUS', faction: 'Corpus' }, 'Koro (Kuva Fortress)'), null);
  assert.equal(factionVariant({ factionKey: 'FC_GRINEER', faction: 'Grineer' }, 'Themisto (Jupiter)'), null);
});

test('Explicit API variant names select the matching icon', () => {
  assert.equal(factionSlug({ faction: 'Kuva Grineer' }), 'kuva');
  assert.equal(factionSlug({ faction: 'Amalgam Corpus' }), 'amalgam');
  assert.equal(factionSlug({ faction: 'Deimos Infested' }), 'deimos');
});
