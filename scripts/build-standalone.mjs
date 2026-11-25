#!/usr/bin/env node
/**
 * Build a self-contained `index.html` that can be opened with file:// directly.
 *
 * It inlines CSS, the compiled application bundle, both UI locales, the
 * Simplified Chinese term dictionary, and the official-data snapshots created
 * by `npm run build:pages`. The result is deliberately a static snapshot: a
 * file:// page cannot proxy the official feed because browsers block
 * cross-origin and module/file requests in that context.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUTPUT = path.join(ROOT, 'index.html');

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

function escapeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function main() {
  const snapshotPaths = {
    en: path.join(DOCS_DIR, 'data', 'worldstate-en.json'),
    zh: path.join(DOCS_DIR, 'data', 'worldstate-zh.json'),
  };
  for (const file of Object.values(snapshotPaths)) {
    try {
      await fs.access(file);
    } catch {
      throw new Error(`Missing ${file}. Run "npm run build:pages" first.`);
    }
  }

  const [htmlTemplate, css, zhLocale, enLocale, terms, snapshotEn, snapshotZh, arbitrationCsv, arbitrationNodes, arbitrationNodeMeta] = await Promise.all([
    fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8'),
    fs.readFile(path.join(PUBLIC_DIR, 'assets', 'css', 'styles.css'), 'utf8'),
    readJson(path.join(PUBLIC_DIR, 'locales', 'zh-CN.json')),
    readJson(path.join(PUBLIC_DIR, 'locales', 'en.json')),
    readJson(path.join(PUBLIC_DIR, 'data', 'terms.zh.json')),
    readJson(snapshotPaths.en),
    readJson(snapshotPaths.zh),
    fs.readFile(path.join(PUBLIC_DIR, 'data', 'arbitration-schedule.csv'), 'utf8'),
    readJson(path.join(PUBLIC_DIR, 'data', 'arbitration-nodes.json')),
    readJson(path.join(PUBLIC_DIR, 'data', 'arbitration-node-meta.json')),
  ]);

  const bundle = await rollup({
    input: path.join(PUBLIC_DIR, 'assets', 'js', 'app.js'),
    treeshake: true,
  });
  let code;
  try {
    const generated = await bundle.generate({
      format: 'iife',
      name: 'WarframeNexus',
      compact: true,
      inlineDynamicImports: true,
    });
    code = generated.output[0].code;
  } finally {
    await bundle.close();
  }

  const embedded = {
    locales: { zh: zhLocale, en: enLocale },
    terms,
    snapshots: { en: snapshotEn, zh: snapshotZh },
    arbitration: {
      csv: arbitrationCsv,
      nodes: arbitrationNodes,
      nodeMeta: arbitrationNodeMeta,
    },
  };

  const standaloneScript = [
    `<script>window.__WF_NEXUS_EMBEDDED__=${escapeForInlineScript(embedded)};</script>`,
    `<script>${code}</script>`,
  ].join('\n');

  const html = htmlTemplate
    .replace('content="auto"', 'content="static"')
    .replace(
      '<link rel="stylesheet" href="./assets/css/styles.css">',
      `<style>\n${css}\n</style>`,
    )
    .replace(
      '<script type="module" src="./assets/js/app.js"></script>',
      standaloneScript,
    );

  if (!html.includes('__WF_NEXUS_EMBEDDED__') || !html.includes('content="static"')) {
    throw new Error('Standalone HTML was not assembled correctly');
  }

  await fs.writeFile(OUTPUT, html, 'utf8');
  const size = (await fs.stat(OUTPUT)).size;
  console.log(`Wrote ${OUTPUT}`);
  console.log(`  ${(size / 1024 / 1024).toFixed(2)} MiB self-contained HTML`);
  console.log('  Open it directly with a browser; no server or npm required.');
}

main().catch((error) => {
  console.error('Standalone build failed:', error);
  process.exit(1);
});
