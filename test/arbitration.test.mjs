import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getArbitrationRange,
  parseArbitrationCsv,
  resolveArbitration,
} from '../public/js/arbitration.js';

const base = Date.UTC(2026, 10, 25, 10, 30, 0) / 1000;
const schedule = {
  entries: [
    [base - 3600, 'SolNode1'],
    [base, 'SolNode2'],
    [base + 3600, 'SolNode3'],
  ],
  nodes: {
    SolNode1: 'Hepit (Void)',
    SolNode2: 'Taranis (Void)',
    SolNode3: 'Ani (Void)',
  },
  nodeMeta: {
    SolNode1: { type: 'Capture', typeKey: 'MT_CAPTURE', faction: 'Corrupted', factionKey: 'FC_CORRUPTED' },
    SolNode2: { type: 'Survival', typeKey: 'MT_SURVIVAL', faction: 'Infested', factionKey: 'FC_INFESTATION' },
    SolNode3: { type: 'Defense', typeKey: 'MT_DEFENSE', faction: 'Grineer', factionKey: 'FC_GRINEER' },
  },
};

test('CSV parser sorts and ignores invalid lines', () => {
  const entries = parseArbitrationCsv('2,B\n1,A\nbad\n\n3,C');
  assert.deepEqual(entries, [[1, 'A'], [2, 'B'], [3, 'C']]);
});

test('resolveArbitration finds current, next, and upcoming entries', () => {
  const now = new Date((base + 600) * 1000);
  const result = resolveArbitration(schedule, now);
  assert.equal(result.current.node, 'Taranis (Void)');
  assert.equal(result.next.node, 'Ani (Void)');
  assert.equal(result.upcoming.length, 0);
});

test('getArbitrationRange includes overlapping hour and statuses', () => {
  const now = new Date((base + 600) * 1000);
  const start = new Date(base * 1000);
  const end = new Date((base + 7200) * 1000);
  const items = getArbitrationRange(schedule, start, end, now);
  assert.equal(items.length, 2);
  assert.equal(items[0].status, 'current');
  assert.equal(items[1].status, 'upcoming');
  assert.equal(items[0].node, 'Taranis (Void)');
  assert.equal(items[0].typeKey, 'MT_SURVIVAL');
  assert.equal(items[0].factionKey, 'FC_INFESTATION');
});
