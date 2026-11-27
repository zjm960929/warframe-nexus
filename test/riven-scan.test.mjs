import test from 'node:test';
import assert from 'node:assert/strict';
import { inferRivenType, normalizeScanEntries, parseRivenScan } from '../public/assets/js/riven-scan.js';
import { findRivenWeapon } from '../public/assets/js/riven-weapons.js';
import { RIVEN_STAT_META, RIVEN_TYPES, RIVEN_TYPE_ORDER } from '../public/assets/js/riven-data.js';
import { RIVEN_SPLICE_META, RIVEN_SPLICE_TYPES } from '../public/assets/js/riven-splice-data.js';

const statTypes = {};
for (const type of RIVEN_TYPE_ORDER) {
  for (const tag of Object.keys({ ...RIVEN_TYPES[type], ...RIVEN_SPLICE_TYPES[type] })) {
    (statTypes[tag] ||= []).push(type);
  }
}
const infer = (statTags, preferred = []) => inferRivenType({
  statTags,
  availableTypes: statTypes,
  typeOrder: RIVEN_TYPE_ORDER,
  preferred,
});

const labels = [
  ['伤害', 'WeaponDamageAmountMod'],
  ['冲击伤害', 'WeaponImpactDamageMod'],
  ['穿刺伤害', 'WeaponArmorPiercingDamageMod'],
  ['弹药最大值', 'WeaponAmmoMaxMod'],
  ['暴击伤害', 'WeaponCritDamageMod'],
  ['攻击速度', 'WeaponFireRateMod'],
];

const types = [
  ['步枪', 'rifle'],
  ['近战', 'melee'],
];

test('parses a normal Riven card with four stats', () => {
  const result = parseRivenScan(`
    Cernos
    Visi-magnacak
    +202.7% 伤害
    冲击伤害 +139.6%
    穿刺伤害
    +122.1%
    -45.4% 弹药最大值
  `, { labels, typeLabels: types });

  assert.equal(result.weapon, 'Cernos');
  assert.equal(result.positive.length, 3);
  assert.deepEqual(result.positive.map((entry) => entry.tag), [
    'WeaponDamageAmountMod',
    'WeaponImpactDamageMod',
    'WeaponArmorPiercingDamageMod',
  ]);
  assert.equal(result.negative.tag, 'WeaponAmmoMaxMod');
  assert.equal(result.negative.value, '-45.4%');
});

test('uses the fourth stat as a negative when OCR loses the minus sign', () => {
  const result = parseRivenScan(`
    步枪
    +100% 伤害
    +50% 暴击伤害
    +40% 攻击速度
    45.4% 弹药最大值
  `, { labels, typeLabels: types });

  assert.equal(result.type, 'rifle');
  assert.equal(result.positive.length, 3);
  assert.equal(result.negative.tag, 'WeaponAmmoMaxMod');
});

test('matches a recognized weapon to its Riven category', () => {
  assert.equal(findRivenWeapon('Cernos')?.type, 'rifle');
  assert.equal(findRivenWeapon('Dragon Nikana')?.type, 'melee');
});

const normalize = (positive, negative) => normalizeScanEntries(
  { positive, negative },
  {
    getMeta: (tag) => RIVEN_STAT_META[tag] || RIVEN_SPLICE_META[tag],
    getBase: (tag) => RIVEN_TYPES.melee[tag],
  },
);

test('repairs a missing minus on the fourth negative entry', () => {
  const result = normalize(
    [{ tag: 'WeaponMeleeDamageMod', value: '+202.6%' }],
    { tag: 'SlideAttackCritChanceMod', value: '115%' },
  );
  assert.equal(result.negative.value, '-115%');
});

test('keeps recoil in the correct positive or negative section', () => {
  const positiveRecoil = normalize([], { tag: 'WeaponRecoilReductionMod', value: '-162%' });
  assert.equal(positiveRecoil.positive[0].value, '-162%');
  assert.equal(positiveRecoil.negative, null);

  const negativeRecoil = normalize([{ tag: 'WeaponRecoilReductionMod', value: '+162%' }], null);
  assert.equal(negativeRecoil.negative.value, '+162%');
});

test('moves disallowed signs into the allowed section', () => {
  const elemental = normalize([], { tag: 'WeaponFireDamageMod', value: '-90%' });
  assert.equal(elemental.positive[0].value, '+90%');
  assert.equal(elemental.negative, null);

  const meleeDamage = normalize([], { tag: 'WeaponMeleeDamageMod', value: '-100%' });
  assert.equal(meleeDamage.positive[0].value, '+100%');

  const comboPoints = normalize([{ tag: 'WeaponMeleeComboPointsOnHitMod', value: '115%' }], null);
  assert.equal(comboPoints.negative.value, '-115%');
  assert.equal(comboPoints.positive.length, 0);
});

test('keeps multiplier curses in multiplier form', () => {
  const result = normalize([], { tag: 'WeaponFactionDamageGrineer', value: 'x0.55' });
  assert.equal(result.negative.value, 'x0.55');
  const positive = normalize([{ tag: 'WeaponFactionDamageGrineer', value: 'x1.48' }], null);
  assert.equal(positive.positive[0].value, 'x1.48');
});

test('stat availability marks forbidden positive and negative entries', () => {
  assert.equal(RIVEN_STAT_META.WeaponMeleeComboPointsOnHitMod.positive, false);
  assert.equal(RIVEN_STAT_META.WeaponMeleeComboBonusOnHitMod.negative, false);
  assert.equal(RIVEN_STAT_META.WeaponMeleeDamageMod.negative, false);
  assert.equal(RIVEN_STAT_META.WeaponPunctureDepthMod.negative, false);
  assert.equal(RIVEN_STAT_META.WeaponFireDamageMod.negative, false);
  assert.equal(RIVEN_STAT_META.WeaponFreezeDamageMod.negative, false);
  assert.equal(RIVEN_STAT_META.WeaponElectricityDamageMod.negative, false);
  assert.equal(RIVEN_STAT_META.WeaponToxinDamageMod.negative, false);
  for (const meta of Object.values(RIVEN_SPLICE_META)) {
    assert.equal(meta.negative, false);
  }
});

test('stat evidence overrides a conflicting weapon type', () => {
  assert.equal(infer(['WeaponMeleeDamageMod'], ['rifle']), 'melee');
  assert.equal(infer(['SlideAttackCritChanceMod'], ['rifle']), 'melee');
  assert.equal(infer(['SpliceWeakpointDamage'], ['melee']), 'rifle');
  assert.equal(infer(['SpliceWeakpointCritChance'], ['zaw']), 'rifle');
});

test('stat evidence keeps a matching Zaw preference', () => {
  assert.equal(infer(['WeaponMeleeDamageMod'], ['zaw']), 'zaw');
});

test('stat evidence narrows the available gun type', () => {
  assert.equal(infer(['SpliceReloadHolstered'], ['archgun']), 'rifle');
  assert.notEqual(infer(['SpliceReloadHolstered'], ['archgun']), 'archgun');
});

test('neutral or conflicting stats do not force a type', () => {
  assert.equal(infer(['WeaponCritChanceMod'], ['rifle']), null);
  assert.equal(infer(['WeaponMeleeDamageMod', 'SpliceWeakpointDamage'], ['melee']), null);
});

test('parses calculator-like text without treating table labels as weapon names', () => {
  const result = parseRivenScan(`
    RIVEN CALCULATOR
    数据分析
    属性 1
    +100% 伤害
    属性 2
    +50% 冲击伤害
    属性 3
    +40% 穿刺伤害
    -20% 弹药最大值
  `, { labels, typeLabels: types });

  assert.equal(result.weapon, '');
  assert.equal(result.positive.length, 3);
  assert.equal(result.negative.tag, 'WeaponAmmoMaxMod');
});
