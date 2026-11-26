import test from 'node:test';
import assert from 'node:assert/strict';
import { featureByPath, featureById } from '../public/assets/js/features.js';

test('worldstate uses the live feature id and route path', () => {
  const feature = featureByPath('live');
  assert.ok(feature);
  assert.equal(feature.id, 'live');
  assert.equal(featureById('live').path, 'live');
  assert.equal(featureByPath('live'), feature);
  assert.equal(featureById('live'), feature);
});
