#!/usr/bin/env node
/**
 * Build the Simplified Chinese term dictionary used by the worldstate page.
 *
 * Source of truth: the ee-localization TSV extracted from the local Warframe
 * cache (key / en / zh). The script deliberately keeps English when the table
 * has no direct Chinese value; it must not invent game terminology.
 *
 * Usage:
 *   node scripts/build-terms.mjs [--tsv <path>] [--worldstate <en.json>] [--out <path>]
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

function parseArgs(argv) {
  const args = { tsv: null, worldstate: null, out: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--tsv') args.tsv = argv[++i];
    else if (arg === '--worldstate') args.worldstate = argv[++i];
    else if (arg === '--out') args.out = argv[++i];
    else if (arg === '--help' || arg === '-h') {
      console.log('node scripts/build-terms.mjs [--tsv <path>] [--worldstate <en.json>] [--out <path>]');
      process.exit(0);
    }
  }
  args.tsv = args.tsv || path.join(ROOT, '..', 'out', 'skill-cache', 'ee-localization', 'Warframe_zh_en.tsv');
  args.worldstate = args.worldstate || null;
  args.out = args.out || path.join(ROOT, 'public', 'data', 'terms.zh.json');
  return args;
}

function normalize(value) {
  return String(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/['’‘`´]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isUsable(en, zh) {
  if (!en || !zh) return false;
  if (en.length > 140) return false;
  if (/\[PH\]/i.test(en) || /\[PH\]/i.test(zh)) return false;
  if (/[|<>]/.test(en) || /[|<>]/.test(zh)) return false;
  return true;
}

const TEMPLATE_PLACEHOLDER = /\|(?:COUNT|NUM|VAL|VALUE|PERCENT|TIME|AMOUNT)\||\{[^}]+\}/i;

function isTemplateUsable(en, zh) {
  if (!en || !zh) return false;
  if (en.length > 400 || zh.length > 400) return false;
  if (/\[PH\]/i.test(en) || /\[PH\]/i.test(zh)) return false;
  return TEMPLATE_PLACEHOLDER.test(en) && TEMPLATE_PLACEHOLDER.test(zh);
}

function addTemplate(map, key, en, zh) {
  if (!isTemplateUsable(en, zh)) return;
  const normalized = normalize(en);
  const score = scoreRow(key, en, zh);
  const previous = map.get(normalized);
  if (!previous || score > previous.score) {
    map.set(normalized, { key, en, zh, score });
  }
}

const NAMESPACE_SCORES = [
  [/\/GameModes\//, 140],
  [/\/Missions\/MissionName_/, 135],
  [/\/Zariman\/MissionType_/, 135],
  [/\/Locations\//, 130],
  [/\/Relics\//, 120],
  [/\/Sorties\//, 115],
  [/\/Alerts\//, 110],
  [/\/Events\//, 100],
  [/\/Invasions\//, 100],
  [/\/Narmer\//, 110],
  [/\/Menu\/InfestedInvasionBoss/, 110],
  [/\/Menu\/.*Invasion/, 100],
  [/\/ClanTech\//, 90],
  [/\/InfestedMicroplanet\/DeimosBounty/, 115],
  [/\/OstronJobs\//, 115],
  [/\/SolarisJobs\//, 115],
  [/\/NightwaveChallenges\//, 105],
  [/\/Conquest\//, 105],
  [/\/Omega\//, 100],
  [/\/Consumables\//, 95],
  [/\/CircleOfHell\//, 100],
  [/\/EntratiLab\//, 100],
  [/\/1999\//, 95],
  [/\/Syndicates\//, 95],
  [/\/Factions\//, 95],
  [/\/Menu\/CraftingComponent_/, 90],
  [/\/Primes\/CraftingComponent_/, 90],
  [/\/Items\//, 85],
];

const NAMESPACE_DENY = [
  /\/Subtitles\//,
  /\/Lore\//,
  /\/Fragments\//,
  /\/Inbox\//,
  /\/Changyou\//,
  /\/Quest/,
  /\/Dojo/,
  /\/CapturaScenes\//,
  /\/Bundles\//,
  /\/PrimeStore\//,
];

function scoreRow(key, en, zh) {
  let score = 0;
  for (const [re, value] of NAMESPACE_SCORES) {
    if (re.test(key)) score += value;
  }
  if (NAMESPACE_DENY.some((re) => re.test(key))) score -= 200;
  if (/Name$|Name_|Title$|_Title$/.test(key)) score += 20;
  if (/Desc$|Description$/.test(key)) score -= 15;
  if (en === en.trim()) score += 5;
  if (zh.length > 90) score -= 10;
  if (zh === en) score += 1;
  return score;
}

function addCandidate(map, key, en, zh) {
  if (!isUsable(en, zh)) return;
  const normalized = normalize(en);
  const score = scoreRow(key, en, zh);
  const previous = map.get(normalized);
  if (!previous || score > previous.score) {
    map.set(normalized, { key, en, zh, score });
  }
}

function parseTsv(file) {
  const raw = fs.readFileSync(file, 'utf8');
  const lines = raw.split(/\r?\n/);
  const rows = [];
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const tab = line.indexOf('\t');
    if (tab < 0) continue;
    const tab2 = line.indexOf('\t', tab + 1);
    if (tab2 < 0) continue;
    const key = line.slice(0, tab);
    const en = line.slice(tab + 1, tab2);
    const zh = line.slice(tab2 + 1);
    rows.push({ key, en, zh });
  }
  return rows;
}

const MISSION_TYPES = [
  'Alchemy',
  'Assassination',
  'Assault',
  'Capture',
  'Defection',
  'Defense',
  'Disruption',
  'Excavation',
  'Extermination',
  'Hijack',
  'Infested Salvage',
  'Interception',
  'Legacyte Harvest',
  'Mirror Defense',
  'Mobile Defense',
  'Orphix',
  'Rescue',
  'Sabotage',
  'Skirmish',
  'Spy',
  'Survival',
  'Void Armageddon',
  'Void Cascade',
  'Void Flood',
  'Volatile',
];

const FACTION_OVERRIDES = {
  Corpus: 'Corpus',
  Grineer: 'Grineer',
  Infested: 'Infested',
  Corrupted: '堕落者',
  Orokin: '奥罗金',
  Narmer: '合一众',
  Sentient: 'Sentient',
  'Man in the Wall': '墙中人',
  'The Murmur': '低语者',
  Scaldra: '炽蛇军',
  Techrot: '科腐者',
  Tenno: 'Tenno',
};

const SYNDICATE_OVERRIDES = {
  Ostrons: 'Ostron',
  'Solaris United': '索拉里斯联盟',
  Entrati: '英择谛',
  Cavia: '科维兽',
  'The Hex': '六人组',
  'The Holdfasts': '坚守者',
  Quills: '夜羽',
  Necraloid: '殁世械灵',
  'Vox Solaris': '索拉里斯之声',
  'Vent Kids': '通风小子',
  "Kahl's Garrison": '卡尔驻军',
  'Arbiters of Hexis': '均衡仲裁者',
  'Cephalon Suda': '中枢苏达',
  'New Loka': '新世间',
  'Perrin Sequence': '佩兰数列',
  'Red Veil': '血色面纱',
  'Steel Meridian': '钢铁防线',
};

const REGION_OVERRIDES = {
  Earth: '地球',
  Venus: '金星',
  Mercury: '水星',
  Mars: '火星',
  Jupiter: '木星',
  Saturn: '土星',
  Uranus: '天王星',
  Neptune: '海王星',
  Pluto: '冥王星',
  Sedna: '赛德娜',
  Eris: '阋神星',
  Ceres: '谷神星',
  Europa: '欧罗巴',
  Phobos: '火卫一',
  Deimos: '火卫二',
  Lua: '月球',
  Void: '虚空',
  'Kuva Fortress': '赤毒要塞',
  Zariman: '扎里曼号',
  Duviri: '双衍王境',
  Veil: '面纱',
  'Veil Proxima': '面纱比邻星域',
  'Earth Proxima': '地球比邻星域',
  'Venus Proxima': '金星比邻星域',
  'Neptune Proxima': '海王星比邻星域',
  'Pluto Proxima': '冥王星比邻星域',
  'Saturn Proxima': '土星比邻星域',
  Cetus: '希图斯',
  'Orb Vallis': '奥布山谷',
  'Cambion Drift': '魔胎之境',
  'Plains of Eidolon': '夜灵平野',
  Höllvania: '霍瓦尼亚',
  Hollvania: '霍瓦尼亚',
  "Albrecht's Laboratories": '阿尔布雷希特实验室',
  'Sanctum Anatomica': '解剖圣所',
  'The Circuit': '无尽回廊',
};

const TIER_OVERRIDES = {
  Lith: '古纪',
  Meso: '前纪',
  Neo: '中纪',
  Axi: '后纪',
  Requiem: '安魂',
  Omnia: '全能',
};

const STATE_OVERRIDES = {
  day: '白昼',
  night: '黑夜',
  warm: '温暖',
  cold: '寒冷',
  fass: 'Fass',
  vome: 'Vome',
  corpus: 'Corpus',
  grineer: 'Grineer',
  anger: '愤怒',
  joy: '喜悦',
  envy: '嫉妒',
  sorrow: '悲伤',
  fear: '恐惧',
  spring: '春季',
  summer: '夏季',
  autumn: '秋季',
  winter: '冬季',
};

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!fs.existsSync(args.tsv)) {
    console.error(`Localization TSV not found: ${args.tsv}`);
    console.error('Run ee-localization first, or pass --tsv <path>.');
    process.exit(1);
  }

  const rows = parseTsv(args.tsv);
  const all = new Map();
  const allowed = new Map();
  const templates = new Map();

  for (const row of rows) {
    if (NAMESPACE_DENY.some((re) => re.test(row.key))) continue;
    if (!NAMESPACE_SCORES.some(([re]) => re.test(row.key))) continue;
    addTemplate(templates, row.key, row.en, row.zh);
    if (!isUsable(row.en, row.zh)) continue;
    addCandidate(all, row.key, row.en, row.zh);
    addCandidate(allowed, row.key, row.en, row.zh);
  }

  const snapshotPath = args.worldstate;
  if (snapshotPath && fs.existsSync(snapshotPath)) {
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    const strings = new Set();
    const skipKeys = new Set([
      'id', 'uniqueName', 'nodeKey', 'typeKey', 'factionKey', 'syndicateKey',
      'categoryKey', 'missionTypeKey', 'challengeKey', 'levelUniqueName',
      'thumbnail', 'color', 'activation', 'expiry', 'timestamp', 'psId',
      'initialStart', 'buildLabel', 'translations',
    ]);
    const walk = (value) => {
      if (Array.isArray(value)) {
        for (const item of value) walk(item);
      } else if (value && typeof value === 'object') {
        for (const [key, item] of Object.entries(value)) {
          if (!skipKeys.has(key)) walk(item);
        }
      } else if (typeof value === 'string') {
        const text = value.trim();
        if (text && text.length <= 140 && !/^(https?:|\/Lotus\/|\d{4}-)/.test(text)) {
          strings.add(text);
        }
      }
    };
    walk(snapshot);
    for (const text of strings) {
      const hit = all.get(normalize(text));
      if (!hit) continue;
      const previous = allowed.get(normalize(text));
      if (!previous || hit.score > previous.score) {
        allowed.set(normalize(text), hit);
      }
    }
  }

  const strings = {};
  for (const [key, value] of allowed) {
    strings[key] = value.zh;
  }

  const templateStrings = {};
  for (const [key, value] of templates) {
    templateStrings[key] = { en: value.en, zh: value.zh };
  }

  const modifierNames = new Map();
  const modifierFlavors = {};
  for (const row of rows) {
    const nameMatch = /\/Sorties\/(SOModifier[^/]+)$/.exec(row.key);
    if (nameMatch && !/Flavor$/.test(nameMatch[1])) {
      if (row.en && row.zh) modifierNames.set(nameMatch[1], row);
      continue;
    }
    const flavorMatch = /\/Sorties\/(SOModifier[^/]+)Flavor$/.exec(row.key);
    if (!flavorMatch) continue;
    const nameRow = modifierNames.get(flavorMatch[1]);
    if (!nameRow?.en || !row.zh || row.zh.length > 400) continue;
    modifierFlavors[normalize(nameRow.en)] = row.zh;
  }

  const missionTypes = {};
  for (const name of MISSION_TYPES) {
    const hit = all.get(normalize(name));
    if (hit) missionTypes[name] = hit.zh;
  }
  // Values that are not present as exact English rows in older localization
  // tables, but are present under a known mission key.
  const missionKeys = {
    Disruption: '/Lotus/Language/DisruptionMission/UIMissionName',
    Extermination: '/Lotus/Language/EidolonPlains/ExterminateName',
    'Void Cascade': '/Lotus/Language/Missions/MissionName_VoidCascade',
    'Void Flood': '/Lotus/Language/Zariman/MissionType_Corruption',
    'Void Armageddon': '/Lotus/Language/Zariman/MissionType_InfAssassinate',
    Volatile: '/Lotus/Language/Missions/MissionName_RailjackVolatile',
    Skirmish: '/Lotus/Language/Railjack/SkirmishComplete',
    Assault: '/Lotus/Language/Missions/MissionName_Assault',
    Defection: '/Lotus/Language/Missions/MissionName_Evacuation',
    'Infested Salvage': '/Lotus/Language/GameModes/InfestedSalvage',
    Hijack: '/Lotus/Language/GameModes/Hijack',
    Orphix: '/Lotus/Language/Missions/MissionName_RailjackOrphix',
  };
  for (const [name, key] of Object.entries(missionKeys)) {
    if (missionTypes[name]) continue;
    const row = rows.find((item) => item.key === key);
    if (row?.zh) missionTypes[name] = row.zh;
  }
  // The Railjack "Skirmish complete" row is a status string, not a mission
  // name; use the canonical mission label when available.
  const skirmishRow = rows.find((item) => item.en?.toLowerCase() === 'skirmish');
  if (skirmishRow?.zh) missionTypes.Skirmish = skirmishRow.zh;

  const conquest = {
    conditions: {},
    lab: {},
    hex: {},
    personal: {},
  };
  for (const row of rows) {
    const match = /\/Conquest\/(Condition|MissionVariant_LabConquest|MissionVariant_HexConquest|PersonalMod)_([A-Za-z0-9]+?)(_Desc)?$/.exec(row.key);
    if (!match) continue;
    if (!row.en || !row.zh || row.en.length > 200) continue;
    if (/\[PH\]/i.test(row.en) || /\[PH\]/i.test(row.zh)) continue;
    const [, prefix, id, isDesc] = match;
    const table = prefix === 'Condition'
      ? conquest.conditions
      : prefix === 'MissionVariant_LabConquest'
        ? conquest.lab
        : prefix === 'MissionVariant_HexConquest'
          ? conquest.hex
          : conquest.personal;
    const target = table[id] || (table[id] = {});
    const value = row.zh
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    if (!value) continue;
    if (isDesc) {
      if (!target.description) target.description = value;
    } else if (!target.name) {
      target.name = value;
    }
  }

  // The parser still uses the legacy key EMPBlackHole for the Arcocanid
  // condition, while the localization table calls it MagneticHounds.
  if (conquest.conditions.MagneticHounds && !conquest.conditions.EMPBlackHole) {
    conquest.conditions.EMPBlackHole = conquest.conditions.MagneticHounds;
  }

  const bountyTypes = {};
  const bountyCandidates = new Map();
  for (const row of rows) {
    const isBountyKey = (
      /\/OstronJobs\/.*Title$/.test(row.key)
      || /\/SolarisJobs\/.*Title$/.test(row.key)
      || /\/InfestedMicroplanet\/DeimosBounty.*Name$/.test(row.key)
      || /\/EntratiLab\/.*(Name|Title)$/.test(row.key)
      || /\/1999\/.*(Bounty|Job).*Name$/.test(row.key)
      || /\/Narmer\/.*Bounty.*Title$/.test(row.key)
    );
    if (!isBountyKey) continue;
    if (!isUsable(row.en, row.zh)) continue;
    const key = normalize(row.en);
    const previous = bountyCandidates.get(key);
    const score = scoreRow(row.key, row.en, row.zh);
    if (!previous || score > previous.score) {
      bountyCandidates.set(key, { zh: row.zh, score });
    }
  }
  for (const [key, value] of bountyCandidates) bountyTypes[key] = value.zh;
  for (const type of ['Capture the New Grineer Commander', 'Weaken the Grineer Foothold', 'Capture the Grineer Commander', 'Search and Rescue', 'Cull the Enemy', 'Capture the Grineer Agent', 'For the Unum (Narmer)']) {
    const hit = all.get(normalize(type));
    if (hit) bountyTypes[normalize(type)] = hit.zh;
  }

  const nodes = {};
  for (const row of rows) {
    if (!row.key.includes('/Locations/') && !/\/Zariman\/ZarimanNode/.test(row.key)) continue;
    if (!isUsable(row.en, row.zh)) continue;
    if (row.en.length > 50) continue;
    const key = normalize(row.en);
    if (!nodes[key]) nodes[key] = row.zh;
  }

  const charMapPath = path.join(ROOT, 'public', 'data', 'zh-hant-map.json');
  let charMap = {};
  if (fs.existsSync(charMapPath)) {
    charMap = JSON.parse(fs.readFileSync(charMapPath, 'utf8'));
  }

  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      source: path.basename(args.tsv),
      note: 'Official Simplified Chinese strings extracted with ee-localization. English fallback is retained when no direct entry exists.',
    },
    strings,
    templates: templateStrings,
    modifierFlavors,
    missionTypes,
    bountyTypes,
    conquest,
    factions: FACTION_OVERRIDES,
    syndicates: SYNDICATE_OVERRIDES,
    regions: REGION_OVERRIDES,
    nodes,
    tiers: TIER_OVERRIDES,
    states: STATE_OVERRIDES,
    suffixes: {
      Blueprint: '蓝图',
      Chassis: '机体',
      Neuroptics: '头部神经光元',
      Systems: '系统',
    },
    rarities: {
      Common: '常见',
      Uncommon: '罕见',
      Rare: '稀有',
      Legendary: '传说',
    },
    elements: {
      Heat: '火焰',
      Cold: '冰冻',
      Toxin: '毒素',
      Electricity: '电击',
      Impact: '冲击',
      Puncture: '穿刺',
      Slash: '切割',
      Magnetic: '磁力',
      Radiation: '辐射',
      Gas: '毒气',
      Viral: '病毒',
      Corrosive: '腐蚀',
      Blast: '爆炸',
    },
    modifierBases: {
      'Enemy Elemental Enhancement': '敌人元素强化',
      'Enemy Physical Enhancement': '敌人物理强化',
    },
    charMap,
  };

  fs.mkdirSync(path.dirname(args.out), { recursive: true });
  fs.writeFileSync(args.out, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  const size = fs.statSync(args.out).size;
  console.log(`Wrote ${args.out}`);
  console.log(`  strings: ${Object.keys(strings).length}`);
  console.log(`  mission types: ${Object.keys(missionTypes).length}`);
  console.log(`  bounty types: ${Object.keys(bountyTypes).length}`);
  console.log(`  nodes: ${Object.keys(nodes).length}`);
  console.log(`  char map: ${Object.keys(charMap).length}`);
  console.log(`  size: ${(size / 1024).toFixed(1)} KiB`);
}

main();
