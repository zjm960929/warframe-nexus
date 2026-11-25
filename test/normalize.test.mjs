import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getDailyReset,
  getWeeklyReset,
  normalizeWorldstate,
} from '../public/assets/js/normalize.js';

const NOW = new Date('2026-11-25T00:00:00.000Z');

function fixture() {
  return {
    timestamp: '2026-11-24T23:50:00.000Z',
    earthCycle: {
      activation: '2026-11-24T20:00:00.000Z',
      expiry: '2026-11-25T00:00:00.000Z',
      state: 'night',
    },
    cetusCycle: {
      activation: '2026-11-24T23:16:00.000Z',
      expiry: '2026-11-25T00:06:00.000Z',
      state: 'night',
    },
    vallisCycle: {
      activation: '2026-11-24T23:26:00.000Z',
      expiry: '2026-11-25T00:46:00.000Z',
      state: 'cold',
    },
    cambionCycle: {
      activation: '2026-11-24T23:16:00.000Z',
      expiry: '2026-11-25T00:06:00.000Z',
      state: 'vome',
    },
    zarimanCycle: {
      activation: '2026-11-24T23:36:00.000Z',
      expiry: '2026-11-25T00:06:00.000Z',
      state: 'corpus',
    },
    duviriCycle: {
      activation: '2026-11-24T23:00:00.000Z',
      expiry: '2026-11-25T01:00:00.000Z',
      state: 'anger',
    },
    calendar: {
      activation: '2026-11-23T00:00:00.000Z',
      expiry: '2026-11-30T00:00:00.000Z',
      season: 'Spring',
      yearIteration: 25,
    },
    dailyDeals: [{
      item: 'Furax',
      discount: 10,
      originalPrice: 125,
      salePrice: 112,
      total: 500,
      sold: 0,
      expiry: '2026-11-25T23:00:00.000Z',
    }],
    nightwave: {
      season: 18,
      expiry: '2027-03-08T00:00:00.000Z',
      activeChallenges: [
        {
          title: 'One shot',
          desc: 'Kill two enemies',
          reputation: 1000,
          isDaily: true,
          expiry: '2026-11-25T00:05:00.000Z',
        },
        {
          title: 'Placeholder',
          desc: '[PH] Not ready',
          reputation: 4500,
          isDaily: false,
          expiry: '2026-11-30T00:00:00.000Z',
        },
        {
          title: 'Weekly real',
          desc: 'Do the thing',
          reputation: 4500,
          isDaily: false,
          expiry: '2026-11-30T00:00:00.000Z',
        },
      ],
    },
    alerts: [
      {
        id: 'active',
        activation: '2026-11-24T00:00:00.000Z',
        expiry: '2026-11-26T00:00:00.000Z',
        tag: 'LotusGift',
        mission: {
          node: 'Cinxia (Ceres)',
          type: 'Interception',
          typeKey: 'Interception',
          faction: 'Grineer',
          factionKey: 'Grineer',
          minEnemyLevel: 20,
          maxEnemyLevel: 30,
          reward: {
            credits: 10000,
            items: [],
            countedItems: [{ key: 'Exilus Warframe Adapter', type: 'Exilus Warframe Adapter', count: 1 }],
          },
        },
      },
      {
        id: 'expired',
        activation: '2026-11-20T00:00:00.000Z',
        expiry: '2026-11-24T00:00:00.000Z',
        mission: {},
      },
    ],
    invasions: [
      {
        id: 'inv',
        node: 'Telesto (Saturn)',
        desc: 'Corpus Siege',
        completed: false,
        completion: 70,
        requiredRuns: 47000,
        vsInfestation: false,
        attacker: { faction: 'Corpus', factionKey: 'Corpus', reward: { credits: 0, items: [], countedItems: [{ key: 'Fieldron', type: 'Fieldron', count: 3 }] } },
        defender: { faction: 'Grineer', factionKey: 'Grineer', reward: { credits: 0, items: [], countedItems: [] } },
      },
      {
        id: 'done',
        node: 'Done (Earth)',
        completed: true,
        completion: 100,
        attacker: {},
        defender: {},
      },
    ],
    events: [],
    sortie: {
      id: 'sortie',
      activation: '2026-11-24T17:00:00.000Z',
      expiry: '2026-11-25T17:00:00.000Z',
      boss: 'Corrupted Vor',
      faction: 'Corrupted',
      factionKey: 'Corrupted',
      variants: [
        { node: 'Hepit (Void)', type: 'Mobile Defense', typeKey: 'Mobile Defense', modifier: 'Energy Reduction', modifierDescription: 'Maximum Warframe Energy capacity is quartered.' },
        { node: 'Taranis (Void)', type: 'Interception', typeKey: 'Interception', modifier: 'Enemy Elemental Enhancement: Heat', modifierDescription: 'Enemies deal increased Heat damage.' },
        { node: 'Ani (Void)', type: 'Extermination', typeKey: 'Extermination', modifier: 'Enemy Physical Enhancement: Impact', modifierDescription: 'Enemies can deal enhanced impact damage.' },
      ],
    },
    archonHunt: {
      id: 'archon',
      activation: '2026-11-23T00:00:00.000Z',
      expiry: '2026-11-30T00:00:00.000Z',
      boss: 'Archon Boreal',
      faction: 'Narmer',
      factionKey: 'Narmer',
      missions: [
        { node: 'Cervantes (Earth)', type: 'Spy', typeKey: 'Spy' },
        { node: 'Everest (Earth)', type: 'Defense', typeKey: 'Defense' },
        { node: 'Oro (Earth)', type: 'Assassination', typeKey: 'Assassination' },
      ],
    },
    archimedeas: [
      {
        typeKey: 'C T_ L A B',
        activation: '2026-11-23T00:00:00.000Z',
        expiry: '2026-11-30T00:00:00.000Z',
        missions: [{
          faction: 'Man in the Wall',
          factionKey: 'Man in the Wall',
          missionType: 'Defense',
          missionTypeKey: 'Defense',
          deviation: { name: 'Eroding Senses', description: 'A description' },
          risks: [{ name: 'Fortified Foes', description: 'A risk', isHard: true }],
        }],
        personalModifiers: [{ name: 'Permanent Injury', description: 'A modifier' }],
      },
      {
        typeKey: 'C T_ H E X',
        activation: '2026-11-23T00:00:00.000Z',
        expiry: '2026-11-30T00:00:00.000Z',
        missions: [{
          faction: 'Techrot',
          factionKey: 'Techrot',
          missionType: 'Extermination',
          missionTypeKey: 'Extermination',
          deviation: { name: 'Growth Hormones', description: '' },
          risks: [],
        }],
        personalModifiers: [],
      },
    ],
    steelPath: {
      incursions: {
        activation: '2026-11-24T00:00:00.000Z',
        expiry: '2026-11-25T00:00:00.000Z',
      },
    },
    syndicateMissions: [
      {
        syndicateKey: 'Ostrons',
        expiry: '2026-11-25T00:06:00.000Z',
        jobs: [
          {
            id: 'job',
            type: 'Cleanse the Land',
            enemyLevels: [5, 15],
            standingStages: [400, 400, 400],
            minMR: 0,
            expiry: '2026-11-25T00:06:00.000Z',
            rewardPoolDrops: [
              { item: 'Redirection', rarity: 'Common', chance: 20, count: 1 },
              { item: 'Gara Chassis Blueprint', rarity: 'Rare', chance: 7.5, count: 1 },
            ],
          },
        ],
      },
      { syndicateKey: 'Cavia', expiry: '2026-11-25T00:06:00.000Z', jobs: [] },
    ],
    fissures: [
      {
        id: 'normal',
        activation: '2026-11-24T23:00:00.000Z',
        expiry: '2026-11-25T00:20:00.000Z',
        node: 'Stephano (Uranus)',
        missionType: 'Defense',
        missionTypeKey: 'Defense',
        enemy: 'Grineer',
        enemyKey: 'Grineer',
        tier: 'Meso',
        tierNum: 2,
        isHard: false,
        isStorm: false,
      },
      {
        id: 'steel',
        activation: '2026-11-24T23:00:00.000Z',
        expiry: '2026-11-25T00:30:00.000Z',
        node: 'Taveuni (Kuva Fortress)',
        missionType: 'Survival',
        missionTypeKey: 'Survival',
        enemy: 'Grineer',
        enemyKey: 'Grineer',
        tier: 'Requiem',
        tierNum: 5,
        isHard: true,
        isStorm: false,
      },
      {
        id: 'storm',
        activation: '2026-11-24T23:00:00.000Z',
        expiry: '2026-11-25T00:40:00.000Z',
        node: 'Sambir Cloud (Veil)',
        missionType: 'Skirmish',
        missionTypeKey: 'Skirmish',
        enemy: 'Corpus',
        enemyKey: 'Corpus',
        tier: 'Axi',
        tierNum: 4,
        isHard: true,
        isStorm: true,
      },
      {
        id: 'expired',
        activation: '2026-11-24T20:00:00.000Z',
        expiry: '2026-11-24T21:00:00.000Z',
        isHard: false,
        isStorm: false,
      },
    ],
  };
}

test('daily reset is the next UTC midnight', () => {
  assert.equal(getDailyReset(NOW).toISOString(), '2026-11-26T00:00:00.000Z');
});

test('weekly reset is the next Monday 00:00 UTC', () => {
  assert.equal(getWeeklyReset(NOW).toISOString(), '2026-11-30T00:00:00.000Z');
  assert.equal(
    getWeeklyReset(new Date('2026-11-30T00:00:00.000Z')).toISOString(),
    '2026-12-07T00:00:00.000Z',
  );
  assert.equal(
    getWeeklyReset(new Date('2026-11-29T23:59:00.000Z')).toISOString(),
    '2026-11-30T00:00:00.000Z',
  );
});

test('cycles and Darvo deal are normalised', () => {
  const model = normalizeWorldstate(fixture(), NOW);
  assert.equal(model.cycles.length, 7);
  assert.equal(model.cycles[0].state, 'night');
  assert.equal(model.cycles[5].state, 'anger');
  assert.equal(model.cycles[6].id, 'hollvania');
  assert.equal(model.cycles[6].state, 'spring');
  assert.equal(model.darvo.item, 'Furax');
  assert.equal(model.darvo.salePrice, 112);
});

test('static arbitration schedule fills current and next arbitration', () => {
  const start = Math.floor(NOW.getTime() / 1000) - 1800;
  const schedule = {
    entries: [
      [start, 'SolNode1'],
      [start + 3600, 'SolNode2'],
      [start + 7200, 'SolNode3'],
    ],
    nodes: {
      SolNode1: 'Hepit (Void)',
      SolNode2: 'Taranis (Void)',
      SolNode3: 'Ani (Void)',
    },
  };
  const model = normalizeWorldstate(fixture(), NOW, { arbitrationSchedule: schedule });
  assert.equal(model.arbitration.source, 'schedule');
  assert.equal(model.arbitration.node, 'Hepit (Void)');
  assert.ok(model.arbitration.end, 'current arbitration must have an end timestamp');
  assert.equal(model.nextArbitration.node, 'Taranis (Void)');
  assert.equal(model.arbitrationUpcoming[0].node, 'Ani (Void)');
});

test('expired alerts and completed invasions are removed', () => {
  const model = normalizeWorldstate(fixture(), NOW);
  assert.equal(model.alerts.length, 1);
  assert.equal(model.alerts[0].node, 'Cinxia (Ceres)');
  assert.equal(model.alerts[0].reward.credits, 10000);
  assert.equal(model.invasions.length, 1);
  assert.equal(model.invasions[0].completion, 70);
});

test('Nightwave placeholder challenges are hidden', () => {
  const model = normalizeWorldstate(fixture(), NOW);
  assert.equal(model.nightwave.daily.length, 1);
  assert.equal(model.nightwave.weekly.length, 1);
  assert.equal(model.nightwave.weekly[0].title, 'Weekly real');
  assert.equal(model.weekly.some((item) => item.id === 'nightwave'), true);
});

test('sortie, Archon Hunt, and both Archimedeas are classified', () => {
  const model = normalizeWorldstate(fixture(), NOW);
  assert.equal(model.sortie.missions.length, 3);
  assert.equal(model.archon.missions.length, 3);
  assert.equal(model.archimedeas.length, 2);
  assert.equal(model.archimedeas[0].kind, 'deep');
  assert.equal(model.archimedeas[1].kind, 'temporal');
});

test('fissures are split into normal, Steel Path, and Void Storms', () => {
  const model = normalizeWorldstate(fixture(), NOW);
  assert.equal(model.fissures.normal.length, 1);
  assert.equal(model.fissures.steel.length, 1);
  assert.equal(model.fissures.storm.length, 1);
  assert.equal(model.fissures.storm[0].tierKey, 'Axi');
  assert.equal(model.counts.activeFissures, 3);
});

test('bounties keep configured regions and sort rewards by rarity', () => {
  const model = normalizeWorldstate(fixture(), NOW);
  assert.equal(model.bounties.length, 6);
  const ostrons = model.bounties.find((region) => region.key === 'ostrons');
  assert.equal(ostrons.jobs.length, 1);
  assert.equal(ostrons.jobs[0].type, 'Cleanse the Land');
  assert.equal(ostrons.jobs[0].rewards[0].name, 'Gara Chassis Blueprint');
  const cavia = model.bounties.find((region) => region.key === 'cavia');
  assert.equal(cavia.jobs.length, 0);
});
