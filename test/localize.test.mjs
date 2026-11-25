import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalizer } from '../public/assets/js/localize.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const terms = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/terms.zh.json'), 'utf8'));
const loc = createLocalizer('zh', terms);

test('Arcocanid legacy key resolves to the official Chinese description', () => {
  const value = loc.conquest(
    'conditions',
    'EMPBlackHole',
    'description',
    'As Rogue Arcocanids charge attacks, they pull Warframes towards them.',
  );
  assert.equal(value, '当暴戾弧犬发起攻击时，它们会将战甲拉向自己。');
});

test('official templates receive values from the raw description', () => {
  const value = loc.personal('TimeDilation', 'description', 'Ability durations reduced by 50%.');
  assert.equal(value, '技能持续时间减少 50%。');
  const punctuation = loc.personal('AntiGuard', 'description', 'Warframe and ally Overguard gain reduced by 75%.');
  assert.equal(punctuation, '战甲和友军超宏防护获取量减少 75%。');
});

test('faction fallback resolves names even without a faction key', () => {
  assert.equal(loc.faction('', 'The Murmur'), '低语者');
});

test('Dark Sector mission types keep their prefix and Chinese name', () => {
  assert.equal(loc.missionType('MT_EXCAVATE', 'Dark Sector Excavation'), '黑暗地带挖掘');
  assert.equal(loc.missionType('', 'Dark Sector Excavation'), '黑暗地带挖掘');
});

test('Veil nodes use the full Proxima region name', () => {
  assert.equal(loc.node('H-2 Cloud (Veil)'), 'H-2 星云（面纱比邻星域）');
  assert.equal(loc.node('弗雷沙（面纱）'), '弗雷沙（面纱比邻星域）');
});

test('templates with unavailable values still render explanatory copy', () => {
  const value = loc.personal('AoeDebuff', 'description', '[PH] Aoe Debuff Desc');
  assert.equal(value, '具有范围攻击的武器爆炸半径固定为（官方数值未提供）米。');
});
