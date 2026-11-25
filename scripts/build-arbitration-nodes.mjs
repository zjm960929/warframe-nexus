#!/usr/bin/env node
/**
 * Regenerate the small node-key → metadata maps used by the static
 * arbitration schedule (`public/data/arbitration-schedule.csv`).
 *
 * The schedule itself is supplied externally; this script only derives names,
 * mission types, and enemy factions from the local worldstate-data package.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import worldstateData from 'warframe-worldstate-data';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const schedulePath = path.join(ROOT, 'public', 'data', 'arbitration-schedule.csv');
const namesPath = path.join(ROOT, 'public', 'data', 'arbitration-nodes.json');
const metaPath = path.join(ROOT, 'public', 'data', 'arbitration-node-meta.json');

const text = fs.readFileSync(schedulePath, 'utf8');
const keys = new Set();
for (const line of text.split(/\r?\n/)) {
  const [stamp, key] = line.split(',');
  if (stamp && key) keys.add(key.trim());
}

const data = worldstateData.default || worldstateData;
const missionTypes = data.missionTypes || {};
const factions = data.factions || {};
const solNodes = data.solNodes || {};

const typeKeyByValue = new Map(Object.entries(missionTypes).map(([key, value]) => [value.value, key]));
const factionKeyByValue = new Map(Object.entries(factions).map(([key, value]) => [value.value, key]));

const names = {};
const meta = {};
for (const key of [...keys].sort()) {
  const node = solNodes[key] || {};
  const name = node.value || key;
  names[key] = name;
  const baseType = (node.type || '').replace(/^Dark Sector\s+/i, '');
  meta[key] = {
    name,
    type: node.type || '',
    typeKey: typeKeyByValue.get(node.type) || typeKeyByValue.get(baseType) || '',
    faction: node.enemy || '',
    factionKey: factionKeyByValue.get(node.enemy) || '',
  };
}

fs.writeFileSync(namesPath, `${JSON.stringify(names, null, 1)}\n`, 'utf8');
fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 1)}\n`, 'utf8');
console.log(`Wrote ${namesPath} (${Object.keys(names).length} nodes)`);
console.log(`Wrote ${metaPath} (${Object.keys(meta).length} node records)`);
