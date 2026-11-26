import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const readJson = (relative) => JSON.parse(fs.readFileSync(path.join(ROOT, relative), 'utf8'));

const zh = readJson('public/locales/zh-CN.json');
const en = readJson('public/locales/en.json');
const terms = readJson('public/data/terms.zh.json');

test('Chinese and English locale files have the same keys', () => {
  assert.deepEqual(Object.keys(zh).sort(), Object.keys(en).sort());
});

test('locale values are non-empty strings', () => {
  for (const [key, value] of Object.entries(zh)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(value.trim().length > 0, key);
  }
  for (const [key, value] of Object.entries(en)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(value.trim().length > 0, key);
  }
});

test('every feature has bilingual card copy and keywords', () => {
  for (const id of ['live', 'arbitration', 'riven', 'glyphs', 'colors', 'messenger', 'drops']) {
    for (const key of ['name', 'desc', 'keywords']) {
      assert.ok(zh[`feature.${id}.${key}`], `zh feature.${id}.${key}`);
      assert.ok(en[`feature.${id}.${key}`], `en feature.${id}.${key}`);
    }
  }
});

test('term dictionary has the expected core maps', () => {
  for (const key of ['Assassination', 'Capture', 'Defense', 'Excavation', 'Survival', 'Spy', 'Void Cascade']) {
    assert.ok(terms.missionTypes[key], key);
  }
  assert.equal(terms.regions.Earth, '地球');
  assert.equal(terms.regions.Cetus, '希图斯');
  assert.equal(terms.regions['Cambion Drift'], '魔胎之境');
  assert.equal(terms.tiers.Axi, '后纪');
  assert.equal(terms.states.night, '黑夜');
  assert.equal(terms.strings['tenno united alert'], 'Tenno 联合警报');
  assert.equal(terms.strings.fieldron, '电磁力场装置');
  assert.equal(terms.strings['detonite injector'], '爆燃喷射器');
  assert.equal(terms.strings['mutagen mass'], '突变原聚合物');
  assert.equal(terms.conquest.conditions.EMPBlackHole.name, '迷人弧犬');
  assert.equal(terms.bountyTypes['cleanse the land'], '清净之地');
  assert.ok(Object.keys(terms.charMap).length > 0);
});

test('term dictionary contains no unresolved placeholder values', () => {
  for (const [key, value] of Object.entries(terms.strings)) {
    assert.equal(typeof value, 'string', key);
    assert.ok(!value.includes('[PH]'), `${key} has a PH placeholder`);
    assert.ok(!/[|<>]/.test(value), `${key} has a placeholder token`);
  }
});
