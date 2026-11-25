import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createI18n } from '../public/assets/js/i18n.js';
import { createLocalizer } from '../public/assets/js/localize.js';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const read = (name) => JSON.parse(fs.readFileSync(path.join(ROOT, 'public/locales', name), 'utf8'));

test('Chinese UI copy keeps typographic spacing and punctuation', () => {
  const copy = read('zh-CN.json');
  for (const [key, value] of Object.entries(copy)) {
    assert.ok(!/\s$/.test(value), `${key}: trailing whitespace`);
    assert.ok(!/\s{2,}/.test(value), `${key}: repeated whitespace`);
    assert.ok(
      !/[\u4e00-\u9fff][A-Za-z0-9]|[A-Za-z0-9][\u4e00-\u9fff]/.test(value),
      `${key}: missing space between Chinese and Latin/number`,
    );
    assert.ok(
      !/[\u4e00-\u9fff][,.;:!?]/.test(value) && !/[,.;:!?][\u4e00-\u9fff]/.test(value),
      `${key}: ASCII punctuation next to Chinese`,
    );
    assert.ok(!/\s+[，。；：！？、）]/.test(value), `${key}: space before Chinese punctuation`);
  }
});

test('English UI copy avoids spacing mistakes', () => {
  const copy = read('en.json');
  for (const [key, value] of Object.entries(copy)) {
    assert.ok(!/\s$/.test(value), `${key}: trailing whitespace`);
    assert.ok(!/\s{2,}/.test(value), `${key}: repeated whitespace`);
    assert.ok(!/\s+[,.;:!?]/.test(value), `${key}: space before punctuation`);
  }
});

test('Chinese dynamic copy normalizes spacing, parentheses, and sentence endings', () => {
  const loc = createLocalizer('zh', {});
  assert.equal(loc.sentence('使用毒气伤害击杀150名敌人'), '使用毒气伤害击杀 150 名敌人。');
  assert.equal(loc.sentence('帮助Clem完成他的周常任务'), '帮助 Clem 完成他的周常任务。');
  assert.equal(loc.sentence('测试(括号)'), '测试（括号）。');
});

test('Chinese dates and numbers follow the house style', () => {
  const i18n = createI18n('zh', read('zh-CN.json'));
  assert.match(i18n.formatDateTime(new Date()), /^\d{4} 年 \d{1,2} 月 \d{1,2} 日 \d{2}:\d{2}$/);
  assert.equal(i18n.formatNumber(10000), '10000');
  assert.equal(i18n.formatNumber(4500), '4500');
});
