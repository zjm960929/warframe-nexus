import test from 'node:test';
import assert from 'node:assert/strict';
import { DARVO_CYCLE_MS, darvoFallbackToken, sortieFallbackToken } from '../public/assets/js/time.js';

test('Sortie fallback rolls over at noon Toronto time in winter', () => {
  assert.equal(sortieFallbackToken(new Date('2026-01-15T17:00:00.000Z')), 'sortie:2026-01-15');
  assert.equal(sortieFallbackToken(new Date('2026-01-15T16:59:59.000Z')), 'sortie:2026-01-14');
});

test('Sortie fallback follows Toronto daylight time in summer', () => {
  assert.equal(sortieFallbackToken(new Date('2026-07-15T16:00:00.000Z')), 'sortie:2026-07-15');
  assert.equal(sortieFallbackToken(new Date('2026-07-15T15:59:59.000Z')), 'sortie:2026-07-14');
});

test('Darvo fallback follows the 26-hour deal cycle', () => {
  const anchor = new Date('2026-11-27T01:00:00.000Z');
  const token = darvoFallbackToken(anchor);
  assert.equal(darvoFallbackToken(new Date(anchor.getTime() + 25 * 3_600_000)), token);
  assert.notEqual(darvoFallbackToken(new Date(anchor.getTime() + DARVO_CYCLE_MS)), token);
});
