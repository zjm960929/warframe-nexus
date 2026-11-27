#!/usr/bin/env node
/**
 * Build the static GitHub Pages output in `docs/`.
 *
 * GitHub Pages cannot call the official Warframe endpoint directly because the
 * endpoint does not send CORS headers. This script fetches the official feed
 * once at build time, parses it with the open-source worldstate parser in
 * English, and writes a single static snapshot used by the Pages deployment.
 * Chinese is resolved in the browser from the committed term dictionary. A
 * GitHub Actions workflow can run this on a schedule to keep it reasonably
 * fresh.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { rollup } from 'rollup';
import { minify } from 'terser';
import {
  fetchOfficialRaw,
  OFFICIAL_WORLDSTATE_URL,
  parseOfficialWorldstate,
} from '../src/official.mjs';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const PUBLIC_DIR = path.join(ROOT, 'public');
const DEFAULT_OUT = path.join(ROOT, 'docs');

function parseArgs(argv) {
  let out = DEFAULT_OUT;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--out') out = path.resolve(argv[++i]);
    if (argv[i] === '--help' || argv[i] === '-h') {
      console.log('node scripts/build-pages.mjs [--out <dir>]');
      process.exit(0);
    }
  }
  return { out };
}

async function readExistingSnapshot(out) {
  try {
    const text = await fs.readFile(path.join(out, 'data', 'worldstate.json'), 'utf8');
    const snapshot = JSON.parse(text);
    if (!snapshot?.data) throw new Error('missing worldstate snapshot data');
    return snapshot;
  } catch {
    return null;
  }
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  if (out === ROOT || out === PUBLIC_DIR) {
    throw new Error('Refusing to write the Pages build over the project root or public/');
  }

  let data;
  let raw = null;
  let fetchedAt;
  let fallback = false;

  try {
    console.log(`Fetching official worldstate: ${OFFICIAL_WORLDSTATE_URL}`);
    const fetched = await fetchOfficialRaw();
    raw = fetched.raw;
    fetchedAt = new Date().toISOString();
    console.log('Parsing official worldstate once in English…');
    data = await parseOfficialWorldstate(fetched.rawText);
  } catch (error) {
    const existing = await readExistingSnapshot(out);
    if (!existing) throw error;
    data = existing.data;
    fetchedAt = existing.meta?.fetchedAt || new Date().toISOString();
    fallback = true;
    console.warn(`Official feed unavailable (${error.message}); reusing existing snapshot from ${out}`);
  }

  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  await fs.cp(PUBLIC_DIR, out, { recursive: true });

  async function bundleWeb() {
    const bundle = await rollup({
      input: path.join(PUBLIC_DIR, 'js', 'app.js'),
      treeshake: true,
    });
    try {
      const generated = await bundle.generate({ format: 'es' });
      const minified = await minify(generated.output[0].code);
      if (!minified.code) throw new Error('Terser returned no web bundle');
      await fs.writeFile(path.join(out, 'js', 'app.js'), minified.code, 'utf8');
      console.log('Bundled and minified docs/js/app.js');
    } finally {
      await bundle.close();
    }
  }
  await bundleWeb();

  const apiBase = (process.env.WF_NEXUS_API_BASE || '').trim();
  const indexPath = path.join(out, 'index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  let builtIndex = indexHtml.replace('content="auto"', 'content="static"');
  if (apiBase) {
    const attr = apiBase.replaceAll('&', '&amp;').replaceAll('"', '&quot;');
    builtIndex = builtIndex.replace(
      'name="wf-nexus-api" content=""',
      `name="wf-nexus-api" content="${attr}"`,
    );
  }
  await fs.writeFile(indexPath, builtIndex, 'utf8');
  console.log(apiBase ? `External API: ${apiBase}` : 'External API: not configured (using static snapshots)');

  const buildLabel = raw?.BuildLabel || data.buildLabel || '';
  const snapshot = {
    data,
    meta: {
      fetchedAt,
      upstream: OFFICIAL_WORLDSTATE_URL,
      static: true,
      fallback,
      buildLabel,
      parser: 'warframe-worldstate-parser',
      dataLanguage: 'en',
      localization: 'terms.zh.json',
    },
  };
  await fs.writeFile(
    path.join(out, 'data', 'worldstate.json'),
    `${JSON.stringify(snapshot)}\n`,
    'utf8',
  );

  await fs.writeFile(
    path.join(out, 'data', 'build.json'),
    `${JSON.stringify({
      generatedAt: fetchedAt,
      buildLabel,
      fallback,
      source: OFFICIAL_WORLDSTATE_URL,
    }, null, 2)}\n`,
    'utf8',
  );
  await fs.writeFile(path.join(out, '.nojekyll'), '', 'utf8');

  const bytes = (await fs.readdir(path.join(out, 'data')))
    .filter((name) => name.endsWith('.json'))
    .length;
  console.log(`Wrote ${out}`);
  console.log(`  official build: ${buildLabel || 'unknown'}`);
  console.log(`  static snapshots: ${bytes}`);
  console.log('  GitHub Pages expects this directory as the publish root.');
}

main().catch((error) => {
  console.error('Pages build failed:', error);
  process.exit(1);
});
