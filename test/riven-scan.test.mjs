import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRivenScan } from '../public/assets/js/riven-scan.js';
import { findRivenWeapon } from '../public/assets/js/riven-weapons.js';

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
