#!/usr/bin/env node
/**
 * Build a self-contained `test.html` that can be opened with file:// directly.
 *
 * It inlines CSS, the compiled application bundle, both UI locales, the
 * Simplified Chinese term dictionary, and the official English worldstate
 * snapshot created by `npm run build:pages`. Chinese is resolved in the
 * browser from the term dictionary. The result is deliberately a static
 * snapshot: a file:// page cannot proxy the official feed because browsers
 * block cross-origin and module/file requests in that context.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { minify } from 'terser';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DOCS_DIR = path.join(ROOT, 'docs');
const OUTPUT = path.join(ROOT, 'test.html');

const readJson = async (file) => JSON.parse(await fs.readFile(file, 'utf8'));

function escapeForInlineScript(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

async function main() {
  const snapshotPath = path.join(DOCS_DIR, 'data', 'worldstate.json');
  try {
    await fs.access(snapshotPath);
  } catch {
    throw new Error(`Missing ${snapshotPath}. Run "npm run build:pages" first.`);
  }

  const [htmlTemplate, css, zhLocale, enLocale, terms, snapshot, arbitrationCsv, arbitrationNodes, arbitrationNodeMeta] = await Promise.all([
    fs.readFile(path.join(PUBLIC_DIR, 'index.html'), 'utf8'),
    fs.readFile(path.join(PUBLIC_DIR, 'assets', 'css', 'styles.css'), 'utf8'),
    readJson(path.join(PUBLIC_DIR, 'locales', 'zh-CN.json')),
    readJson(path.join(PUBLIC_DIR, 'locales', 'en.json')),
    readJson(path.join(PUBLIC_DIR, 'data', 'terms.zh.json')),
    readJson(snapshotPath),
    fs.readFile(path.join(PUBLIC_DIR, 'data', 'arbitration-schedule.csv'), 'utf8'),
    readJson(path.join(PUBLIC_DIR, 'data', 'arbitration-nodes.json')),
    readJson(path.join(PUBLIC_DIR, 'data', 'arbitration-node-meta.json')),
  ]);

  // The standalone file lives outside public/, so a relative mask URL would
  // point at a missing directory. Inline the official GitHub mark instead.
  const githubMarkup = await fs.readFile(
    path.join(PUBLIC_DIR, 'assets', 'icons', 'github-invertocat.svg'),
    'utf8',
  );
  let inlinedCss = css.replaceAll(
    'url("../icons/github-invertocat.svg")',
    `url("data:image/svg+xml,${encodeURIComponent(githubMarkup)}")`,
  );

  for (const faction of [
    'grineer', 'corpus', 'infested', 'orokin',
    'narmer', 'murmur', 'sentient', 'amalgam',
    'deimos', 'kuva', 'scaldra', 'techrot',
  ]) {
    const icon = await fs.readFile(
      path.join(PUBLIC_DIR, 'assets', 'icons', 'factions', `${faction}.png`),
    );
    inlinedCss = inlinedCss.replaceAll(
      `url("../icons/factions/${faction}.png")`,
      `url("data:image/png;base64,${icon.toString('base64')}")`,
    );
  }

  for (const shard of ['azure', 'amber', 'crimson']) {
    const icon = await fs.readFile(
      path.join(PUBLIC_DIR, 'assets', 'icons', 'shards', `${shard}.png`),
    );
    inlinedCss = inlinedCss.replaceAll(
      `url("../icons/shards/${shard}.png")`,
      `url("data:image/png;base64,${icon.toString('base64')}")`,
    );
  }

  const bundle = await rollup({
    input: path.join(PUBLIC_DIR, 'js', 'app.js'),
    treeshake: true,
  });
  let code;
  try {
    const generated = await bundle.generate({
      format: 'iife',
      name: 'WarframeNexus',
      compact: true,
    });
    const minified = await minify(generated.output[0].code);
    if (!minified.code) throw new Error('Terser returned no standalone bundle');
    code = minified.code;
  } finally {
    await bundle.close();
  }

  const embedded = {
    locales: { zh: zhLocale, en: enLocale },
    terms,
    snapshot,
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
    .replace('name="wf-ocr-base" content="./assets/ocr/"', 'name="wf-ocr-base" content="./public/assets/ocr/"')
    .replace(
      '<link rel="stylesheet" href="./assets/css/styles.css">',
      `<style>\n${inlinedCss}\n</style>`,
    )
    .replace(
      '<script type="module" src="./js/app.js"></script>',
      () => standaloneScript,
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
