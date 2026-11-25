#!/usr/bin/env node
/**
 * Bundle the browser-side worldstate parser used by the live API mode.
 * The official raw feed is fetched through the Cloudflare Worker; parsing then
 * happens in the browser without any community API lookups.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const INPUT = path.join(ROOT, 'src', 'browser', 'live-parser.js');
const OUTPUT = path.join(ROOT, 'public', 'assets', 'js', 'live-parser.bundle.js');
const CRYPTO_SHIM = path.join(ROOT, 'src', 'browser', 'crypto-shim.mjs');
const DATA_DIR = path.join(
  ROOT,
  'node_modules',
  'warframe-worldstate-data',
  'dist',
  'data',
);
const DATA_KEYS = [
  ['arcanes', 'arcanes.json'],
  ['archonShards', 'archonShards.json'],
  ['conclave', 'conclaveData.json'],
  ['events', 'eventsData.json'],
  ['factions', 'factionsData.json'],
  ['fissureModifiers', 'fissureModifiers.json'],
  ['languages', 'languages.json'],
  ['missionTypes', 'missionTypes.json'],
  ['operationTypes', 'operationTypes.json'],
  ['persistentEnemy', 'persistentEnemyData.json'],
  ['solNodes', 'solNodes.json'],
  ['sortie', 'sortieData.json'],
  ['syndicates', 'syndicatesData.json'],
  ['tutorials', 'tutorials.json'],
  ['upgradeTypes', 'upgradeTypes.json'],
  ['synthTargets', 'synthTargets.json'],
  ['steelPath', 'steelPath.json'],
];

function worldstateDataModule() {
  const imports = [];
  const enEntries = [];
  const zhEntries = [];
  for (const [key, file] of DATA_KEYS) {
    const enId = `en_${key}`;
    const zhId = `zh_${key}`;
    imports.push(`import ${enId} from ${JSON.stringify(path.join(DATA_DIR, file))};`);
    imports.push(`import ${zhId} from ${JSON.stringify(path.join(DATA_DIR, 'zh', file))};`);
    enEntries.push(`${key}: ${enId}`);
    zhEntries.push(`${key}: ${zhId}`);
  }
  return `${imports.join('\n')}
const en = { ${enEntries.join(', ')} };
const zh = { ${zhEntries.join(', ')} };
const data = { en, zh, ...en, locales: ['en', 'zh'] };
export { data as t };
export default data;
`;
}

const browserShims = {
  name: 'browser-shims',
  resolveId(source) {
    if (source === 'node:crypto' || source === 'crypto') return CRYPTO_SHIM;
    if (source === 'warframe-worldstate-data' || source.includes('exports-C0Wr9zZc')) {
      return '\0worldstate-data';
    }
    return null;
  },
  load(id) {
    if (id === '\0worldstate-data') return worldstateDataModule();
    return null;
  },
  transform(code, id) {
    if (id.includes('warframe-worldstate-parser')) {
      return code.replaceAll('process.env', '({})');
    }
    return null;
  },
};

const bundle = await rollup({
  input: INPUT,
  plugins: [
    browserShims,
    nodeResolve({ browser: true, extensions: ['.mjs', '.js', '.json'] }),
    commonjs({ include: /node_modules/ }),
    json(),
  ],
  treeshake: { moduleSideEffects: true },
});

try {
  await bundle.write({
    file: OUTPUT,
    format: 'es',
    compact: true,
    sourcemap: false,
  });
} finally {
  await bundle.close();
}

const { stat } = await import('node:fs/promises');
const info = await stat(OUTPUT);
console.log(`Wrote ${OUTPUT} (${(info.size / 1024 / 1024).toFixed(2)} MiB)`);
