import test from 'node:test';
import assert from 'node:assert/strict';
import { RIVEN_DISPOSITION, RIVEN_STAT_META, RIVEN_TYPES } from '../public/assets/js/riven-data.js';
import { RIVEN_SPLICE_META, RIVEN_SPLICE_TYPES } from '../public/assets/js/riven-splice-data.js';
import {
  formatRivenValue,
  rivenNameFromStats,
  rivenRange,
  rivenRollForQuality,
  rivenRollFromDisplay,
  rivenValue,
} from '../public/assets/js/riven.js';

const close = (actual, expected, epsilon = 0.002) => {
  assert.ok(Math.abs(actual - expected) <= epsilon, `${actual} != ${expected}`);
};

test('Riven disposition is fixed at 1.20x', () => {
  assert.equal(RIVEN_DISPOSITION, 1.2);
  assert.equal(rivenRollForQuality(0), 0.9);
  assert.equal(rivenRollForQuality(50), 1);
  assert.equal(rivenRollForQuality(100), 1.1);
});

test('Rifle critical chance matches the current +3/-1 range', () => {
  const base = RIVEN_TYPES.rifle.WeaponCritChanceMod;
  const min = rivenValue(base, { rank: 8, buffs: 3, curses: 1, roll: 0.9 });
  const max = rivenValue(base, { rank: 8, buffs: 3, curses: 1, roll: 1.1 });
  close(min, 1.518658);
  close(max, 1.856138);
  assert.equal(formatRivenValue('WeaponCritChanceMod', min), '+151.9%');
  assert.equal(formatRivenValue('WeaponCritChanceMod', max), '+185.6%');
});

test('Rifle damage and negative critical chance match the wiki range', () => {
  const base = RIVEN_TYPES.rifle.WeaponDamageAmountMod;
  const range = rivenRange(base, { rank: 8, buffs: 3, curses: 1, roll: 1 });
  close(range.min, 1.670956);
  close(range.max, 2.042796);
  assert.equal(formatRivenValue('WeaponDamageAmountMod', range.min), '+167.1%');

  const crit = RIVEN_TYPES.rifle.WeaponCritChanceMod;
  const negative = rivenValue(crit, {
    rank: 8,
    buffs: 3,
    curses: 1,
    roll: 0.9,
    negative: true,
  });
  close(negative, -1.214926);
  assert.equal(formatRivenValue('WeaponCritChanceMod', negative), '-121.5%');
});

test('Faction damage is formatted as a multiplier', () => {
  const base = RIVEN_TYPES.rifle.WeaponFactionDamageGrineer;
  const value = rivenValue(base, { rank: 8, buffs: 3, curses: 1, roll: 0.9 });
  assert.equal(formatRivenValue('WeaponFactionDamageGrineer', value), 'x1.46');
});

test('Negative-only combo stats do not appear as positives', () => {
  assert.ok('WeaponMeleeComboPointsOnHitMod' in RIVEN_TYPES.melee);
  assert.equal(RIVEN_STAT_META.WeaponMeleeComboPointsOnHitMod.positive, false);
  assert.equal(RIVEN_STAT_META.WeaponMeleeComboBonusOnHitMod.negative, false);
});

test('Manual values invert to the correct roll quality', () => {
  const base = RIVEN_TYPES.rifle.WeaponCritChanceMod;
  const low = rivenRollFromDisplay(base, 'WeaponCritChanceMod', '151.9', {
    rank: 8, buffs: 3, curses: 1,
  });
  const high = rivenRollFromDisplay(base, 'WeaponCritChanceMod', '185.6', {
    rank: 8, buffs: 3, curses: 1,
  });
  close(low.roll, 0.9);
  close(high.roll, 1.1);
  close(low.quality, 0, 0.2);
  close(high.quality, 100, 0.2);
});

test('Rounded endpoint values stay inside the slider range', () => {
  const base = RIVEN_TYPES.rifle.WeaponDamageAmountMod;
  for (const roll of [0.9, 1.1]) {
    const value = rivenValue(base, { rank: 8, buffs: 3, curses: 1, roll });
    const display = formatRivenValue('WeaponDamageAmountMod', value);
    const parsed = rivenRollFromDisplay(base, 'WeaponDamageAmountMod', display, {
      rank: 8, buffs: 3, curses: 1,
    });
    assert.equal(parsed.inRange, true);
    assert.ok(parsed.quality >= 0 && parsed.quality <= 100);
  }
});

test('Every slider endpoint stays inside the standard range', () => {
  const categories = { ...RIVEN_TYPES };
  for (const [type, stats] of Object.entries(categories)) {
    for (const [tag, base] of Object.entries({ ...stats, ...RIVEN_SPLICE_TYPES[type] })) {
      const meta = RIVEN_STAT_META[tag] || RIVEN_SPLICE_META[tag];
      if (!meta) continue;
      for (const buffs of [2, 3]) {
        for (const curses of [0, 1]) {
          for (const negative of [false, true]) {
            if (negative && (curses === 0 || meta.spliced || meta.negative === false)) continue;
            if (!negative && meta.positive === false) continue;
            for (const roll of [0.9, 1.1]) {
              const value = rivenValue(base, { rank: 8, buffs, curses, roll, negative });
              const display = formatRivenValue(tag, value);
              const parsed = rivenRollFromDisplay(base, tag, display, {
                rank: 8, buffs, curses, negative,
              });
              assert.ok(parsed, `${type} ${tag} did not parse`);
              assert.equal(parsed.inRange, true, `${type} ${tag} ${display} out of range`);
              assert.ok(parsed.quality >= 0 && parsed.quality <= 100, `${type} ${tag} quality`);
            }
          }
        }
      }
    }
  }
});

test('Spliced attributes use the September ranges', () => {
  const blast = RIVEN_SPLICE_TYPES.rifle.SpliceBlastDamage;
  const blastRange = rivenRange(blast, { rank: 8, buffs: 3, curses: 1, roll: 1 });
  assert.equal(formatRivenValue('SpliceBlastDamage', blastRange.min), '+91.1%');
  assert.equal(formatRivenValue('SpliceBlastDamage', blastRange.max), '+111.4%');

  const weakpoint = RIVEN_SPLICE_TYPES.rifle.SpliceWeakpointDamage;
  const weakpointRange = rivenRange(weakpoint, { rank: 8, buffs: 3, curses: 1, roll: 1 });
  assert.equal(formatRivenValue('SpliceWeakpointDamage', weakpointRange.min), '+227.8%');

  const faction = RIVEN_SPLICE_TYPES.rifle.SpliceFactionOrokin;
  const factionRange = rivenRange(faction, { rank: 8, buffs: 3, curses: 1, roll: 1 });
  assert.equal(formatRivenValue('SpliceFactionOrokin', factionRange.min), 'x1.46');

  assert.equal(RIVEN_SPLICE_META.SpliceBlastDamage.negative, false);
  assert.ok(!('SpliceReloadHolstered' in RIVEN_SPLICE_TYPES.archgun));
  assert.ok('SpliceHeavyAttackWindup' in RIVEN_SPLICE_TYPES.melee);
});

test('Riven names follow prefix, middle prefix, and suffix rules', () => {
  const stats = [
    { tag: 'WeaponCritChanceMod', base: 0.016666, roll: 1.1 },
    { tag: 'WeaponCritDamageMod', base: 0.013333, roll: 1.0 },
    { tag: 'WeaponSlashDamageMod', base: 0.013333, roll: 0.9 },
  ];
  assert.deepEqual(rivenNameFromStats(stats), {
    name: 'Crita-acrisus',
    suffix: 'sus',
  });

  const tied = [
    { tag: 'WeaponCritChanceMod', base: 0.016666, roll: 1 },
    { tag: 'WeaponCritDamageMod', base: 0.013333, roll: 1 },
  ];
  assert.deepEqual(rivenNameFromStats(tied), {
    name: 'Acricron',
    suffix: 'cron',
  });
});
