/**
 * Pure normalisation helpers for the Warframe worldstate payload.
 * This module is deliberately DOM-free so the same code can run in the
 * browser, in Node tests, and in small build checks.
 */

import { resolveArbitration } from './arbitration.js';

export const CYCLE_DEFINITIONS = [
  { id: 'earth', rawKey: 'earthCycle' },
  { id: 'cetus', rawKey: 'cetusCycle' },
  { id: 'vallis', rawKey: 'vallisCycle' },
  { id: 'cambion', rawKey: 'cambionCycle' },
  { id: 'zariman', rawKey: 'zarimanCycle' },
  { id: 'duviri', rawKey: 'duviriCycle' },
];

export const BOUNTY_REGIONS = [
  { key: 'ostrons', syndicateKey: 'Ostrons', labelKey: 'cycle.cetus', localeRegion: '希图斯' },
  { key: 'solaris', syndicateKey: 'Solaris United', labelKey: 'cycle.vallis', localeRegion: '奥布山谷' },
  { key: 'entrati', syndicateKey: 'Entrati', labelKey: 'cycle.cambion', localeRegion: '魔胎之境' },
  { key: 'cavia', syndicateKey: 'Cavia', labelKey: 'cycle.labs', localeRegion: '阿尔布雷希特实验室' },
  { key: 'hex', syndicateKey: 'The Hex', labelKey: 'cycle.hollvania', localeRegion: '霍瓦尼亚' },
  { key: 'holdfasts', syndicateKey: 'The Holdfasts', labelKey: 'cycle.zariman', localeRegion: '扎里曼号' },
];

export function toDate(value) {
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value : null;
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function isActive(value, now = new Date()) {
  if (!value) return false;
  const start = toDate(value.activation);
  const end = toDate(value.expiry);
  if (!end) return false;
  if (start && start > now) return false;
  return end > now;
}

export function remainingMs(value, now = new Date()) {
  const end = toDate(typeof value === 'string' ? value : value?.expiry);
  if (!end) return null;
  return Math.max(0, end.getTime() - now.getTime());
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function getDailyReset(now = new Date()) {
  const result = new Date(now.getTime());
  result.setUTCHours(24, 0, 0, 0);
  return result;
}

export function getWeeklyReset(now = new Date()) {
  const result = new Date(now.getTime());
  result.setUTCHours(0, 0, 0, 0); // Monday 00:00 UTC
  const day = result.getUTCDay(); // 0 = Sunday, 1 = Monday
  let days = (8 - day) % 7;
  if (days === 0 && result <= now) days = 7;
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function normalizeCircuit(raw) {
  if (!raw || !Array.isArray(raw.choices)) return null;
  const byCategory = new Map(raw.choices.map((entry) => [entry.category, entry.choices || []]));
  const warframes = byCategory.get('normal') || [];
  const incarnons = byCategory.get('hard') || [];
  if (!warframes.length && !incarnons.length) return null;
  return {
    activation: raw.activation || null,
    expiry: raw.expiry || null,
    state: raw.state || '',
    warframes,
    incarnons,
  };
}

function normalizeSteelPath(raw) {
  if (!raw) return null;
  const normalizeOffering = (item) => ({
    name: item?.name || '',
    cost: Number(item?.cost) || 0,
  });
  const jobs = Array.isArray(raw.incursions?.jobs)
    ? raw.incursions.jobs.map((job) => ({
      id: job.id || '',
      node: job.node || '',
      nodeKey: job.nodeKey || '',
      type: job.type || job.missionType || '',
      typeKey: job.typeKey || job.missionTypeKey || '',
      faction: job.faction || '',
      factionKey: job.factionKey || '',
      reward: normalizeReward(job.reward),
    }))
    : [];
  return {
    activation: raw.activation || null,
    expiry: raw.expiry || null,
    currentReward: raw.currentReward ? normalizeOffering(raw.currentReward) : null,
    rotation: Array.isArray(raw.rotation) ? raw.rotation.map(normalizeOffering) : [],
    incursions: raw.incursions ? {
      activation: raw.incursions.activation || null,
      expiry: raw.incursions.expiry || null,
      jobs,
    } : null,
  };
}

function normalizeCycle(definition, raw, now) {
  if (!raw) return null;
  const start = toDate(raw.activation);
  const end = toDate(raw.expiry);
  let state = raw.state;
  if (!state && definition.id === 'earth') state = raw.isDay ? 'day' : 'night';
  if (!state && definition.id === 'vallis') state = raw.isWarm ? 'warm' : 'cold';
  if (!state && definition.id === 'zariman') state = raw.isCorpus ? 'corpus' : 'grineer';
  if (!state) state = 'unknown';

  const total = start && end ? end.getTime() - start.getTime() : 0;
  const elapsed = start ? now.getTime() - start.getTime() : 0;
  return {
    id: definition.id,
    state,
    start: start ? start.toISOString() : null,
    end: end ? end.toISOString() : null,
    remainingMs: end ? Math.max(0, end.getTime() - now.getTime()) : null,
    progress: total > 0 ? clamp((elapsed / total) * 100, 0, 100) : 0,
  };
}

function normalizeReward(reward) {
  if (!reward) return { credits: 0, items: [] };
  const counted = Array.isArray(reward.countedItems) ? reward.countedItems : [];
  const plain = Array.isArray(reward.items) ? reward.items : [];
  const items = [];
  const seen = new Set();

  for (const item of counted) {
    if (!item) continue;
    const name = item.key || item.type || '';
    const count = Number(item.count) || 1;
    const signature = `${name}|${count}`;
    if (!name || seen.has(signature)) continue;
    seen.add(signature);
    items.push({ name, label: item.type || name, count });
  }
  for (const item of plain) {
    if (!item) continue;
    const name = typeof item === 'string' ? item : item.key || item.type || item.name || '';
    const count = typeof item === 'string' ? 1 : Number(item.count) || 1;
    const signature = `${name}|${count}`;
    if (!name || seen.has(signature)) continue;
    seen.add(signature);
    items.push({ name, label: typeof item === 'string' ? item : item.type || name, count });
  }

  return {
    credits: Number(reward.credits) || 0,
    items,
  };
}

function normalizeRewardList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((item) => normalizeRewardList(item));
  if (typeof value === 'string') return [{ name: value, label: value, count: 1 }];
  if (typeof value === 'object') {
    if (Array.isArray(value.items) || Array.isArray(value.countedItems)) {
      return normalizeReward(value).items;
    }
    if (value.item || value.name || value.type) {
      return [{
        name: value.key || value.item || value.name || value.type,
        label: value.type || value.item || value.name,
        count: Number(value.count) || 1,
      }];
    }
  }
  return [];
}

function normalizeMission(mission) {
  if (!mission) return null;
  return {
    node: mission.node || '',
    nodeKey: mission.nodeKey || '',
    type: mission.type || mission.missionType || '',
    typeKey: mission.typeKey || mission.missionTypeKey || '',
    modifier: mission.modifier || '',
    modifierDescription: mission.modifierDescription || '',
    nightmare: Boolean(mission.nightmare),
  };
}

function normalizeSortieLike(raw, now) {
  if (!raw || !isActive(raw, now)) return null;
  const missions = Array.isArray(raw.variants) && raw.variants.length > 0
    ? raw.variants
    : Array.isArray(raw.missions) ? raw.missions : [];
  return {
    id: raw.id || '',
    boss: raw.boss || '',
    faction: raw.faction || '',
    factionKey: raw.factionKey || '',
    end: raw.expiry,
    rewardPool: raw.rewardPool || '',
    missions: missions.map(normalizeMission).filter(Boolean),
  };
}

function normalizeArchimedea(raw, index, now) {
  if (!raw || !isActive(raw, now)) return null;
  const code = String(raw.typeKey || raw.type || '').replace(/[^a-zA-Z]/g, '').toUpperCase();
  let kind = 'deep';
  if (code.includes('HEX')) kind = 'temporal';
  else if (code.includes('LAB')) kind = 'deep';
  else if (index > 0) kind = 'temporal';

  const missions = (Array.isArray(raw.missions) ? raw.missions : []).map((mission) => ({
    faction: mission?.faction || '',
    factionKey: mission?.factionKey || '',
    missionType: mission?.missionType || '',
    missionTypeKey: mission?.missionTypeKey || '',
    deviation: {
      key: mission?.deviation?.key || '',
      name: mission?.deviation?.name || '',
      description: mission?.deviation?.description || '',
    },
    risks: (Array.isArray(mission?.risks) ? mission.risks : []).map((risk) => ({
      key: risk?.key || '',
      name: risk?.name || '',
      description: risk?.description || '',
      isHard: Boolean(risk?.isHard),
    })),
  }));

  return {
    kind,
    id: raw.id || '',
    end: raw.expiry,
    missions,
    personalModifiers: (Array.isArray(raw.personalModifiers) ? raw.personalModifiers : []).map((modifier) => ({
      key: modifier?.key || '',
      name: modifier?.name || '',
      description: modifier?.description || '',
    })),
  };
}

function normalizeBountyRewards(job) {
  const drops = Array.isArray(job.rewardPoolDrops) ? job.rewardPoolDrops : [];
  const pool = Array.isArray(job.rewardPool) ? job.rewardPool : [];
  const seen = new Map();

  for (const drop of drops) {
    if (!drop || !drop.item || /pattern mismatch/i.test(drop.item)) continue;
    const name = drop.item;
    const previous = seen.get(name);
    const chance = Number(drop.chance) || 0;
    if (!previous || chance > previous.chance) {
      seen.set(name, {
        name,
        rarity: drop.rarity || '',
        chance,
        count: Number(drop.count) || 1,
      });
    }
  }
  if (seen.size === 0) {
    for (const item of pool) {
      if (typeof item !== 'string' || /pattern mismatch/i.test(item)) continue;
      if (!seen.has(item)) seen.set(item, { name: item, rarity: '', chance: 0, count: 1 });
    }
  }

  return [...seen.values()].sort((a, b) => {
    const rarityOrder = { Rare: 0, Uncommon: 1, Common: 2 };
    const rarity = (rarityOrder[a.rarity] ?? 3) - (rarityOrder[b.rarity] ?? 3);
    return rarity || b.chance - a.chance;
  });
}

function normalizeBounties(raw, now) {
  const syndicateMissions = Array.isArray(raw.syndicateMissions) ? raw.syndicateMissions : [];
  return BOUNTY_REGIONS.map((region) => {
    const entries = syndicateMissions.filter((entry) => entry?.syndicateKey === region.syndicateKey);
    const jobs = [];
    for (const entry of entries) {
      for (const job of Array.isArray(entry.jobs) ? entry.jobs : []) {
        if (!job) continue;
        if (job.expiry && !isActive({ activation: job.activation, expiry: job.expiry }, now)) continue;
        const levels = Array.isArray(job.enemyLevels) ? job.enemyLevels : [];
        jobs.push({
          id: job.id || '',
          type: job.type || '',
          levels: [Number(levels[0]) || 0, Number(levels[1]) || 0],
          standingStages: (Array.isArray(job.standingStages) ? job.standingStages : []).map(Number),
          minMR: Number(job.minMR) || 0,
          expiry: job.expiry || entry.expiry || '',
          timeBound: job.timeBound || '',
          isVault: Boolean(job.isVault),
          locationTag: job.locationTag || '',
          rewards: normalizeBountyRewards(job),
        });
      }
    }
    const expiry = jobs
      .map((job) => toDate(job.expiry))
      .filter(Boolean)
      .sort((a, b) => a - b)[0];
    return {
      ...region,
      jobs,
      end: expiry ? expiry.toISOString() : null,
    };
  });
}

const FISSURE_TIER_ORDER = {
  Lith: 1,
  Meso: 2,
  Neo: 3,
  Axi: 4,
  Requiem: 5,
  Omnia: 6,
  Omni: 6,
};

function normalizeFissures(raw, now) {
  const all = (Array.isArray(raw.fissures) ? raw.fissures : [])
    .filter((fissure) => fissure && isActive(fissure, now))
    .map((fissure) => {
      const tierByNumber = {
        1: 'Lith',
        2: 'Meso',
        3: 'Neo',
        4: 'Axi',
        5: 'Requiem',
        6: 'Omnia',
      };
      return {
        id: fissure.id || '',
        node: fissure.node || '',
        nodeKey: fissure.nodeKey || '',
        missionType: fissure.missionType || '',
        missionTypeKey: fissure.missionTypeKey || '',
        enemy: fissure.enemy || '',
        enemyKey: fissure.enemyKey || '',
        tier: fissure.tier || '',
        tierKey: tierByNumber[Number(fissure.tierNum)] || '',
        tierNum: Number(fissure.tierNum) || 0,
        isStorm: Boolean(fissure.isStorm),
        isHard: Boolean(fissure.isHard),
        end: fissure.expiry,
        remainingMs: remainingMs(fissure.expiry, now) ?? 0,
      };
    })
    .sort((a, b) => {
      const aRank = FISSURE_TIER_ORDER[a.tierKey] || a.tierNum || 99;
      const bRank = FISSURE_TIER_ORDER[b.tierKey] || b.tierNum || 99;
      return aRank - bRank || a.remainingMs - b.remainingMs;
    });

  return {
    normal: all.filter((fissure) => !fissure.isStorm && !fissure.isHard),
    steel: all.filter((fissure) => !fissure.isStorm && fissure.isHard),
    storm: all.filter((fissure) => fissure.isStorm),
  };
}

function normalizeNightwave(raw, now) {
  if (!raw) return null;
  const challenges = (Array.isArray(raw.activeChallenges) ? raw.activeChallenges : [])
    .filter((challenge) => challenge && (!challenge.expiry || remainingMs(challenge.expiry, now) > 0))
    .filter((challenge) => {
      const title = String(challenge.title || '');
      const description = String(challenge.desc || '');
      return !/\[PH\]/i.test(`${title} ${description}`) && !/^Season Weekly\b/i.test(title);
    })
    .map((challenge) => ({
      id: challenge.id || '',
      title: challenge.title || '',
      description: challenge.desc || '',
      reputation: Number(challenge.reputation) || 0,
      isDaily: Boolean(challenge.isDaily),
      isElite: Boolean(challenge.isElite),
      isPermanent: Boolean(challenge.isPermanent),
      end: challenge.expiry,
      remainingMs: remainingMs(challenge.expiry, now),
    }))
    .sort((a, b) => (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));

  return {
    season: Number(raw.season) || 0,
    end: raw.expiry,
    daily: challenges.filter((challenge) => challenge.isDaily),
    weekly: challenges.filter((challenge) => !challenge.isDaily),
  };
}

export function normalizeWorldstate(raw, now = new Date(), options = {}) {
  if (!raw || typeof raw !== 'object') {
    throw new TypeError('normalizeWorldstate expects a worldstate object');
  }

  const cycles = CYCLE_DEFINITIONS
    .map((definition) => normalizeCycle(definition, raw[definition.rawKey], now))
    .filter(Boolean);

  // Höllvania's 1999 calendar advances by season at the weekly reset; the
  // public worldstate does not expose a separate day/night clock for it.
  if (raw.calendar && raw.calendar.season && isActive(raw.calendar, now)) {
    const start = toDate(raw.calendar.activation);
    const end = toDate(raw.calendar.expiry);
    const total = start && end ? end.getTime() - start.getTime() : 0;
    const elapsed = start ? now.getTime() - start.getTime() : 0;
    cycles.push({
      id: 'hollvania',
      state: String(raw.calendar.season).toLowerCase(),
      start: start ? start.toISOString() : null,
      end: end ? end.toISOString() : null,
      remainingMs: end ? Math.max(0, end.getTime() - now.getTime()) : null,
      progress: total > 0 ? clamp((elapsed / total) * 100, 0, 100) : 0,
    });
  }

  const darvoRaw = Array.isArray(raw.dailyDeals) ? raw.dailyDeals[0] : null;
  const darvo = darvoRaw && (!darvoRaw.expiry || remainingMs(darvoRaw.expiry, now) > 0)
    ? {
      item: darvoRaw.item || '',
      discount: Number(darvoRaw.discount) || 0,
      originalPrice: Number(darvoRaw.originalPrice) || 0,
      salePrice: Number(darvoRaw.salePrice) || 0,
      total: Number(darvoRaw.total) || 0,
      sold: Number(darvoRaw.sold) || 0,
      end: darvoRaw.expiry,
      remainingMs: remainingMs(darvoRaw.expiry, now),
    }
    : null;

  const nightwave = normalizeNightwave(raw.nightwave, now);
  const sortie = normalizeSortieLike(raw.sortie, now);
  const archon = normalizeSortieLike(raw.archonHunt, now);

  const archimedeas = (Array.isArray(raw.archimedeas) ? raw.archimedeas : [])
    .map((archimedea, index) => normalizeArchimedea(archimedea, index, now))
    .filter(Boolean)
    .sort((a, b) => (a.kind === b.kind ? 0 : a.kind === 'deep' ? -1 : 1));

  const alerts = (Array.isArray(raw.alerts) ? raw.alerts : [])
    .filter((alert) => alert && isActive(alert, now))
    .map((alert) => ({
      id: alert.id || '',
      node: alert.mission?.node || '',
      nodeKey: alert.mission?.nodeKey || '',
      type: alert.mission?.type || '',
      typeKey: alert.mission?.typeKey || '',
      faction: alert.mission?.faction || '',
      factionKey: alert.mission?.factionKey || '',
      minLevel: Number(alert.mission?.minEnemyLevel) || 0,
      maxLevel: Number(alert.mission?.maxEnemyLevel) || 0,
      reward: normalizeReward(alert.mission?.reward),
      tag: alert.tag || '',
      end: alert.expiry,
      remainingMs: remainingMs(alert.expiry, now),
    }))
    .sort((a, b) => (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));

  const invasions = (Array.isArray(raw.invasions) ? raw.invasions : [])
    .filter((invasion) => invasion && !invasion.completed)
    .map((invasion) => ({
      id: invasion.id || '',
      node: invasion.node || '',
      nodeKey: invasion.nodeKey || '',
      description: invasion.desc || '',
      attacker: {
        faction: invasion.attacker?.faction || '',
        factionKey: invasion.attacker?.factionKey || '',
        reward: normalizeReward(invasion.attacker?.reward),
      },
      defender: {
        faction: invasion.defender?.faction || '',
        factionKey: invasion.defender?.factionKey || '',
        reward: normalizeReward(invasion.defender?.reward),
      },
      completion: clamp(Number(invasion.completion) || 0, 0, 100),
      requiredRuns: Number(invasion.requiredRuns) || 0,
      vsInfestation: Boolean(invasion.vsInfestation),
    }));

  const events = (Array.isArray(raw.events) ? raw.events : [])
    .filter((event) => event && (!event.expiry || isActive(event, now)))
    .map((event) => {
      const health = Number(event.health) || 0;
      const maximumHealth = Number(event.maximumHealth) || 0;
      return {
        id: event.id || '',
        title: event.description || event.tooltip || event.type || '',
        node: event.node || '',
        type: event.type || '',
        faction: event.faction || '',
        end: event.expiry,
        remainingMs: remainingMs(event.expiry, now),
        progress: maximumHealth > 0 ? clamp((health / maximumHealth) * 100, 0, 100) : null,
        rewards: normalizeRewardList(event.reward || event.rewards || event.job?.reward),
      };
    })
    .sort((a, b) => (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));

  const officialArbitration = raw.arbitration && !raw.arbitration.expired && isActive(raw.arbitration, now)
    ? {
      node: raw.arbitration.node || '',
      nodeKey: raw.arbitration.nodeKey || '',
      type: raw.arbitration.type || '',
      typeKey: raw.arbitration.typeKey || '',
      enemy: raw.arbitration.enemy || '',
      end: raw.arbitration.expiry,
      remainingMs: remainingMs(raw.arbitration.expiry, now),
      source: 'official',
    }
    : null;

  const scheduledArbitration = options.arbitrationSchedule
    ? resolveArbitration(options.arbitrationSchedule, now)
    : null;
  const arbitration = scheduledArbitration?.current
    ? { ...scheduledArbitration.current, end: scheduledArbitration.current.expiry, source: 'schedule' }
    : officialArbitration;
  const nextArbitration = scheduledArbitration?.next
    ? { ...scheduledArbitration.next, end: scheduledArbitration.next.expiry }
    : null;
  const arbitrationUpcoming = (scheduledArbitration?.upcoming || []).map((item) => ({
    ...item,
    end: item.expiry,
  }));

  const bounties = normalizeBounties(raw, now);
  const fissures = normalizeFissures(raw, now);

  const weekly = [];
  if (sortie) {
    weekly.push({
      id: 'sortie',
      labelKey: 'weekly.sortie',
      end: sortie.end,
      remainingMs: remainingMs(sortie.end, now),
      detail: `${sortie.missions.length}`,
      anchor: 'sortie',
    });
  }
  if (archon) {
    weekly.push({
      id: 'archon',
      labelKey: 'weekly.archon',
      end: archon.end,
      remainingMs: remainingMs(archon.end, now),
      detail: `${archon.missions.length}`,
      anchor: 'archon',
    });
  }
  for (const archimedea of archimedeas) {
    weekly.push({
      id: archimedea.kind,
      labelKey: archimedea.kind === 'deep' ? 'weekly.deep' : 'weekly.temporal',
      end: archimedea.end,
      remainingMs: remainingMs(archimedea.end, now),
      detail: `${archimedea.missions.length}`,
      anchor: 'archimedea',
    });
  }
  if (raw.steelPath?.incursions) {
    weekly.push({
      id: 'steel',
      labelKey: 'weekly.steel',
      end: raw.steelPath.incursions.expiry,
      remainingMs: remainingMs(raw.steelPath.incursions.expiry, now),
      detail: '',
      anchor: 'weekly',
    });
  }
  if (nightwave?.weekly?.length) {
    const latest = nightwave.weekly.reduce((max, challenge) => {
      const time = toDate(challenge.end)?.getTime() || 0;
      return Math.max(max, time);
    }, 0);
    weekly.push({
      id: 'nightwave',
      labelKey: 'weekly.nightwave',
      end: latest ? new Date(latest).toISOString() : nightwave.end,
      remainingMs: latest ? Math.max(0, latest - now.getTime()) : remainingMs(nightwave.end, now),
      detail: `${nightwave.weekly.length}`,
      anchor: 'nightwave',
    });
  }
  weekly.sort((a, b) => (a.remainingMs ?? Infinity) - (b.remainingMs ?? Infinity));

  return {
    now: now.toISOString(),
    dailyReset: getDailyReset(now).toISOString(),
    weeklyReset: getWeeklyReset(now).toISOString(),
    cycles,
    darvo,
    nightwave,
    weekly,
    arbitration,
    nextArbitration,
    arbitrationUpcoming,
    alerts,
    invasions,
    events,
    circuit: normalizeCircuit(raw.duviriCycle),
    steelPath: normalizeSteelPath(raw.steelPath),
    sortie,
    archon,
    archimedeas,
    bounties,
    fissures,
    counts: {
      alerts: alerts.length,
      invasions: invasions.length,
      events: events.length,
      activeFissures: fissures.normal.length + fissures.steel.length + fissures.storm.length,
      bounties: bounties.reduce((total, region) => total + region.jobs.length, 0),
    },
  };
}
