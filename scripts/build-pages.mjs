#!/usr/bin/env node
/**
 * Build the static GitHub Pages output in `docs/`.
 *
 * GitHub Pages cannot call the official Warframe endpoint directly because the
 * endpoint does not send CORS headers. This script fetches the official feed
 * once at build time, parses it with the open-source worldstate parser, and
 * writes static snapshots used by the Pages deployment. A GitHub Actions
 * workflow can run this on a schedule to keep the snapshots reasonably fresh.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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

async function readExistingSnapshots(out) {
  try {
    const read = async (lang) => {
      const text = await fs.readFile(path.join(out, 'data', `worldstate-${lang}.json`), 'utf8');
      const snapshot = JSON.parse(text);
      if (!snapshot?.data) throw new Error(`missing ${lang} snapshot data`);
      return snapshot;
    };
    return { en: await read('en'), zh: await read('zh') };
  } catch {
    return null;
  }
}

async function main() {
  const { out } = parseArgs(process.argv.slice(2));
  if (out === ROOT || out === PUBLIC_DIR) {
    throw new Error('Refusing to write the Pages build over the project root or public/');
  }

  let en;
  let zh;
  let raw = null;
  let fetchedAt;
  let fallback = false;

  try {
    console.log(`Fetching official worldstate: ${OFFICIAL_WORLDSTATE_URL}`);
    const fetched = await fetchOfficialRaw();
    raw = fetched.raw;
    fetchedAt = new Date().toISOString();
    console.log('Parsing official worldstate for en + zh…');
    [en, zh] = await Promise.all([
      parseOfficialWorldstate(fetched.rawText, 'en'),
      parseOfficialWorldstate(fetched.rawText, 'zh'),
    ]);
  } catch (error) {
    const existing = await readExistingSnapshots(out);
    if (!existing) throw error;
    en = existing.en.data;
    zh = existing.zh.data;
    fetchedAt = existing.en.meta?.fetchedAt || new Date().toISOString();
    fallback = true;
    console.warn(`Official feed unavailable (${error.message}); reusing existing snapshots from ${out}`);
  }

  await fs.rm(out, { recursive: true, force: true });
  await fs.mkdir(out, { recursive: true });
  await fs.cp(PUBLIC_DIR, out, { recursive: true });

  // The static Pages copy must not attempt /api/worldstate (there is no server).
  const indexPath = path.join(out, 'index.html');
  const indexHtml = await fs.readFile(indexPath, 'utf8');
  await fs.writeFile(
    indexPath,
    indexHtml.replace('content="auto"', 'content="static"'),
    'utf8',
  );

  const buildLabel = raw?.BuildLabel || en.buildLabel || '';
  const writeSnapshot = async (lang, data) => {
    const snapshot = {
      data,
      meta: {
        lang,
        fetchedAt,
        upstream: OFFICIAL_WORLDSTATE_URL,
        static: true,
        fallback,
        buildLabel,
        parser: 'warframe-worldstate-parser',
      },
    };
    await fs.writeFile(
      path.join(out, 'data', `worldstate-${lang}.json`),
      `${JSON.stringify(snapshot)}\n`,
      'utf8',
    );
  };

  await writeSnapshot('en', en);
  await writeSnapshot('zh', zh);

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
