// September 2026 Riven Splicer attributes.
// Base coefficients and name parts: Warframe wiki, Riven Mods § Spliced Values.
export const RIVEN_SPLICE_META = {
  SpliceAmmoEfficiency: { key: 'ammoEfficiency', kind: 'percent', negative: false, spliced: true },
  SpliceBlastDamage: { key: 'blastDamage', kind: 'percent', negative: false, spliced: true },
  SpliceCorrosiveDamage: { key: 'corrosiveDamage', kind: 'percent', negative: false, spliced: true },
  SpliceFactionOrokin: { key: 'damageOrokin', kind: 'multiplier', negative: false, spliced: true },
  SpliceFactionScaldra: { key: 'damageScaldra', kind: 'multiplier', negative: false, spliced: true },
  SpliceFactionTechrot: { key: 'damageTechrot', kind: 'multiplier', negative: false, spliced: true },
  SpliceGasDamage: { key: 'gasDamage', kind: 'percent', negative: false, spliced: true },
  SpliceHeavyAttackWindup: { key: 'heavyAttackWindup', kind: 'percent', negative: false, spliced: true },
  SpliceMagneticDamage: { key: 'magneticDamage', kind: 'percent', negative: false, spliced: true },
  SpliceMeleeHeavyDamage: { key: 'meleeHeavyDamage', kind: 'percent', negative: false, spliced: true },
  SpliceParryAngle: { key: 'parryAngle', kind: 'percent', negative: false, spliced: true },
  SpliceRadiationDamage: { key: 'radiationDamage', kind: 'percent', negative: false, spliced: true },
  SpliceReloadHolstered: { key: 'reloadHolstered', kind: 'percent', negative: false, spliced: true },
  SpliceSlamDamage: { key: 'slamDamage', kind: 'percent', negative: false, spliced: true },
  SpliceStatusDamage: { key: 'statusDamage', kind: 'percent', negative: false, spliced: true },
  SpliceViralDamage: { key: 'viralDamage', kind: 'percent', negative: false, spliced: true },
  SpliceWeakpointDamage: { key: 'weakpointDamage', kind: 'percent', negative: false, spliced: true },
  SpliceWeakpointCritChance: { key: 'weakpointCritChance', kind: 'percent', negative: false, spliced: true },
};

export const RIVEN_SPLICE_NAME_PARTS = {
  SpliceAmmoEfficiency: { prefix: 'parci', suffix: 'pia' },
  SpliceBlastDamage: { prefix: 'fraga', suffix: 'tus' },
  SpliceCorrosiveDamage: { prefix: 'cori', suffix: 'or' },
  SpliceFactionOrokin: { prefix: 'effi', suffix: 'tas' },
  SpliceFactionScaldra: { prefix: 'exsi', suffix: 'llo' },
  SpliceFactionTechrot: { prefix: 'muti', suffix: 'gia' },
  SpliceGasDamage: { prefix: 'cali', suffix: 'fel' },
  SpliceHeavyAttackWindup: { prefix: 'veri', suffix: 'lus' },
  SpliceMagneticDamage: { prefix: 'magni', suffix: 'bra' },
  SpliceMeleeHeavyDamage: { prefix: 'robi', suffix: 'ndo' },
  SpliceParryAngle: { prefix: 'defi', suffix: 'so' },
  SpliceRadiationDamage: { prefix: 'radi', suffix: 'lo' },
  SpliceReloadHolstered: { prefix: 'auxi', suffix: 'rro' },
  SpliceSlamDamage: { prefix: 'proci', suffix: 'lam' },
  SpliceStatusDamage: { prefix: 'plaga', suffix: 'mna' },
  SpliceViralDamage: { prefix: 'cari', suffix: 'sco' },
  SpliceWeakpointDamage: { prefix: 'eni', suffix: 'vo' },
  SpliceWeakpointCritChance: { prefix: 'exiti', suffix: 'eus' },
};

const RANGED = {
  SpliceAmmoEfficiency: 0.005,
  SpliceBlastDamage: 0.01,
  SpliceCorrosiveDamage: 0.01,
  SpliceFactionOrokin: 0.005,
  SpliceFactionScaldra: 0.005,
  SpliceFactionTechrot: 0.005,
  SpliceGasDamage: 0.01,
  SpliceMagneticDamage: 0.01,
  SpliceRadiationDamage: 0.01,
  SpliceReloadHolstered: 0.01,
  SpliceStatusDamage: 0.01,
  SpliceViralDamage: 0.01,
  SpliceWeakpointDamage: 0.025,
  SpliceWeakpointCritChance: 0.0275,
};

const ARCHGUN = {
  ...RANGED,
};
delete ARCHGUN.SpliceReloadHolstered;

const MELEE = {
  SpliceBlastDamage: 0.01,
  SpliceCorrosiveDamage: 0.01,
  SpliceFactionOrokin: 0.005,
  SpliceFactionScaldra: 0.005,
  SpliceFactionTechrot: 0.005,
  SpliceGasDamage: 0.01,
  SpliceHeavyAttackWindup: 0.0133,
  SpliceMagneticDamage: 0.01,
  SpliceMeleeHeavyDamage: 0.0133,
  SpliceParryAngle: 0.009,
  SpliceRadiationDamage: 0.01,
  SpliceSlamDamage: 0.0133,
  SpliceStatusDamage: 0.01,
  SpliceViralDamage: 0.01,
};

export const RIVEN_SPLICE_TYPES = {
  rifle: { ...RANGED },
  shotgun: { ...RANGED },
  pistol: { ...RANGED },
  melee: { ...MELEE },
  archgun: { ...ARCHGUN },
  kitgun: { ...RANGED },
  zaw: { ...MELEE },
};
