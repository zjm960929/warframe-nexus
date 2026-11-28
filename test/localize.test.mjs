import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createLocalizer } from '../public/js/localize.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const terms = JSON.parse(fs.readFileSync(path.join(ROOT, 'public/data/terms.zh.json'), 'utf8'));
const loc = createLocalizer('zh', terms);

test('official table translates parser English before falling back', () => {
  assert.equal(loc.missionType('', 'Defense'), '防御');
  assert.equal(loc.text('Claim an item from your Foundry.'), '从铸造厂中领取一件物品。');
  assert.equal(loc.sentence('Help Clem with his weekly mission.'), '帮助 Clem 完成他的周常任务。');
  assert.equal(loc.sentence('Kill 30 Eximus.'), '击杀 30 名卓越者。');
  assert.equal(loc.sentence('Complete any 15 missions.'), '完成 15 项任务。');
  assert.equal(loc.text('This string is not in the official table'), 'This string is not in the official table');
});

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

test('Nightwave titles and challenge templates match official punctuation', () => {
  assert.equal(loc.text("Builder's Touch"), '制造者之触');
  assert.equal(
    loc.sentence('Kill 20 enemies while riding a K-Drive, Kaithe, Velocipod or Merulina..'),
    '骑乘 K 式悬浮板、绝灵骥、迅敏节虫或原子摩托车时击杀 20 名敌人。',
  );
});

test('Zariman node names resolve through the official Zariman namespace', () => {
  assert.equal(loc.node('Everview Arc (Zariman)'), '永视弧域（扎里曼号）');
  assert.equal(loc.node('Tuvul Commons (扎里曼)'), '涂沃主厅（扎里曼）');
});

test('invasion component names resolve singular parser labels', () => {
  assert.equal(loc.item('Twin Vipers Wraith Barrel'), '双子蝰蛇·亡魂 枪管');
});

test('Steel Path shop names use official terms and spacing', () => {
  assert.equal(loc.item('Umbra Forma Blueprint'), 'Umbra Forma 蓝图');
  assert.equal(loc.item('Kitgun Riven Mod'), '组合枪裂罅 Mod');
  assert.equal(loc.item('50,000 Kuva'), '50,000 赤毒');
  assert.equal(loc.item('30,000 Endo'), '30,000 内融核心');
});

test('official Sortie modifier flavors replace parser descriptions', () => {
  assert.equal(loc.modifierFlavor('Energy Reduction'), '虚空的能量漩涡正流经此处，战甲的能量上限将会减半同时能量再生率也会大幅降低。');
  assert.equal(loc.modifierFlavor('Enhanced Enemy Shields'), '此处敌人护盾的已经过强化');
  assert.equal(loc.modifierFlavor('Enemy Physical Enhancement: Slash'), '敌人已获得额外的 切割 伤害和物理抗性强化。');
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

test('Sortie modifier descriptions are converted to Simplified Chinese', () => {
  assert.equal(
    loc.sentence('此任務中只能使用次要武器，其他類型的武器將會自動被換掉'),
    '此任务中只能使用次要武器，其他类型的武器将会自动被换掉。',
  );
});

test('Kuva Fortress nodes use the official Chinese region name', () => {
  assert.equal(loc.node('Taveuni (Kuva 要塞)'), 'Taveuni（赤毒要塞）');
  assert.equal(loc.node('Taveuni (Kuva Fortress)'), 'Taveuni（赤毒要塞）');
});

test('templates with unavailable values still render explanatory copy', () => {
  const value = loc.personal('AoeDebuff', 'description', '[PH] Aoe Debuff Desc');
  assert.equal(value, '具有范围攻击的武器爆炸半径固定为（官方数值未提供）米。');
});
