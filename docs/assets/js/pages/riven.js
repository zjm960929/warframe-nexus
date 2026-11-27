import { el, sectionHeader } from '../dom.js';
import { RIVEN_TYPES, RIVEN_TYPE_ORDER } from '../riven-data.js';
import { RIVEN_SPLICE_TYPES } from '../riven-splice-data.js';
import {
  detectRivenType,
  inferRivenType,
  normalizeScanEntries,
  normalizeScanText,
  parseRivenScan,
} from '../riven-scan.js';
import { findRivenWeapon } from '../riven-weapons.js';
import {
  formatRivenValue,
  rivenDisplayNumber,
  rivenDisplayToRaw,
  rivenNameFromStats,
  rivenQualityFromRoll,
  rivenRange,
  rivenRollFromDisplay,
  rivenRollFromQuality,
  rivenRollFromSliderRatio,
  rivenValue,
  statMeta,
} from '../riven.js';

const NORMAL_ORDER = [
  'WeaponDamageAmountMod', 'WeaponMeleeDamageMod',
  'WeaponImpactDamageMod', 'WeaponArmorPiercingDamageMod', 'WeaponSlashDamageMod',
  'WeaponElectricityDamageMod', 'WeaponFireDamageMod', 'WeaponFreezeDamageMod', 'WeaponToxinDamageMod',
  'WeaponFactionDamageGrineer', 'WeaponFactionDamageCorpus', 'WeaponFactionDamageInfested',
  'WeaponMeleeFactionDamageGrineer', 'WeaponMeleeFactionDamageCorpus', 'WeaponMeleeFactionDamageInfested',
  'WeaponCritChanceMod', 'WeaponCritDamageMod', 'SlideAttackCritChanceMod',
  'WeaponStunChanceMod', 'WeaponProcTimeMod',
  'WeaponFireRateMod', 'WeaponFireIterationsMod', 'WeaponClipMaxMod', 'WeaponAmmoMaxMod',
  'WeaponReloadSpeedMod', 'WeaponProjectileSpeedMod', 'WeaponPunctureDepthMod',
  'WeaponRecoilReductionMod', 'WeaponZoomFovMod',
  'ComboDurationMod', 'WeaponMeleeComboEfficiencyMod', 'WeaponMeleeComboInitialBonusMod',
  'WeaponMeleeComboPointsOnHitMod', 'WeaponMeleeComboBonusOnHitMod',
  'WeaponMeleeRangeIncMod', 'WeaponMeleeFinisherDamageMod',
];

function ocrAssetBase() {
  const meta = document.querySelector('meta[name="wf-ocr-base"]');
  return new URL(meta?.content || './assets/ocr/', document.baseURI).href;
}

const SPLICE_ORDER = [
  'SpliceBlastDamage', 'SpliceCorrosiveDamage', 'SpliceGasDamage',
  'SpliceMagneticDamage', 'SpliceRadiationDamage', 'SpliceViralDamage',
  'SpliceFactionOrokin', 'SpliceFactionScaldra', 'SpliceFactionTechrot',
  'SpliceStatusDamage', 'SpliceWeakpointDamage', 'SpliceWeakpointCritChance',
  'SpliceAmmoEfficiency', 'SpliceReloadHolstered',
  'SpliceHeavyAttackWindup', 'SpliceMeleeHeavyDamage', 'SpliceParryAngle', 'SpliceSlamDamage',
];

function sortByOrder(tags, order) {
  const index = new Map(order.map((tag, i) => [tag, i]));
  return tags.toSorted((a, b) => (index.get(a) ?? 9999) - (index.get(b) ?? 9999));
}

function orderIndex(tag, order) {
  const index = order.indexOf(tag);
  return index === -1 ? 9999 : index;
}

function statsForType(type) {
  if (!type) return {};
  return { ...(RIVEN_TYPES[type] || {}), ...(RIVEN_SPLICE_TYPES[type] || {}) };
}

const TYPE_LABEL_KEYS = {
  rifle: 'riven.type.rifle',
  shotgun: 'riven.type.shotgun',
  pistol: 'riven.type.pistol',
  melee: 'riven.type.melee',
  archgun: 'riven.type.archgun',
  kitgun: 'riven.type.kitgun',
  zaw: 'riven.type.zaw',
};

function toggleField(id, leftLabel, rightLabel, labelText, checked, onChange) {
  const input = el('input', {
    type: 'checkbox',
    id,
    class: 'riven-toggle__input',
    checked,
    attrs: { role: 'switch' },
  });
  const node = el('label', { class: 'riven-toggle', for: id },
    el('span', { class: 'riven-toggle__control' },
      el('span', {
        class: 'riven-toggle__option riven-toggle__option--left',
        text: leftLabel,
        attrs: { 'aria-hidden': 'true' },
      }),
      el('span', {
        class: 'riven-toggle__option riven-toggle__option--right',
        text: rightLabel,
        attrs: { 'aria-hidden': 'true' },
      }),
      el('span', {
        class: 'riven-toggle__thumb',
        attrs: { 'aria-hidden': 'true' },
      }),
      input,
    ),
    el('span', { class: 'riven-toggle__label', text: labelText }),
  );
  input.addEventListener('change', () => {
    onChange?.(input.checked);
  });
  return { node, input, sync: () => {} };
}

function analysisUnit(tag) {
  const kind = statMeta(tag)?.kind;
  if (kind === 'multiplier') return 'x';
  if (kind === 'seconds') return 's';
  if (kind === 'meters') return 'm';
  if (kind === 'number') return '';
  return '%';
}

function analysisPlaceholder() {
  return '';
}

function renderTable(i18n, captionId, caption, rows) {
  const table = el('table', { class: 'riven-table riven-table--viewer' },
    el('caption', { id: captionId, class: 'visually-hidden', text: caption }),
    el('colgroup', {},
      el('col', { class: 'riven-col-stat' }),
      el('col', { class: 'riven-col-num' }),
      el('col', { class: 'riven-col-num' }),
      el('col', { class: 'riven-col-num' }),
    ),
    el('thead', {},
      el('tr', {},
        el('th', { scope: 'col', text: i18n.t('riven.stat') }),
        el('th', { scope: 'col', class: 'riven-table__num', text: i18n.t('riven.min') }),
        el('th', { scope: 'col', class: 'riven-table__num', text: i18n.t('riven.max') }),
        el('th', { scope: 'col', class: 'riven-table__num', text: i18n.t('riven.average') }),
      ),
    ),
    el('tbody', {}, rows),
  );
  return el('div', {
    class: 'riven-table-wrap',
    tabindex: 0,
    attrs: { role: 'region', 'aria-labelledby': captionId },
  }, table);
}

export function createRivenPage({ i18n }) {
  const positiveCaption = 'riven-positive-caption';
  const splicedCaption = 'riven-spliced-caption';
  const negativeCaption = 'riven-negative-caption';
  const positiveTable = renderTable(
    i18n,
    positiveCaption,
    i18n.t('riven.normalTable'),
    [],
  );
  const splicedTable = renderTable(
    i18n,
    splicedCaption,
    i18n.t('riven.splicedTable'),
    [],
  );
  const negativeTable = renderTable(
    i18n,
    negativeCaption,
    i18n.t('riven.negativeTable'),
    [],
  );
  const positivePanel = el('section', {
    class: 'panel riven-results__panel',
    attrs: { 'aria-labelledby': positiveCaption },
  },
    sectionHeader(i18n, i18n.t('riven.normalTable')),
    positiveTable,
  );
  const splicedPanel = el('section', {
    class: 'panel riven-results__panel',
    attrs: { 'aria-labelledby': splicedCaption },
  },
    sectionHeader(i18n, i18n.t('riven.splicedTable')),
    splicedTable,
  );
  const negativePanel = el('section', {
    class: 'panel riven-results__panel',
    attrs: { 'aria-labelledby': negativeCaption },
  },
    sectionHeader(i18n, i18n.t('riven.negativeTable')),
    negativeTable,
  );

  const top = el('div', { class: 'riven-top' });
  const tables = el('div', { class: 'riven-tables', hidden: true });
  const stage = el('div', { class: 'riven-stage' }, top, tables);
  const page = el('div', { class: 'riven-page' },
    el('div', { class: 'page-heading' },
      el('p', { class: 'eyebrow', text: i18n.t('riven.eyebrow') }),
      el('div', { class: 'page-heading__title' },
        el('h1', { text: i18n.t('riven.title') }),
      ),
    ),
    stage,
  );



  let tableViewerMode = false;
  let viewerOpen = false;

  function applyViewerState(open) {
    viewerOpen = open;
    top.classList.toggle('is-viewer', open);
    analysisSection.hidden = open;
    resultColumn.hidden = open;
    analysisResultPanel.hidden = open;
    tableViewerPanel.hidden = !open;
    tableViewerMode = open;
    renderTables();
    requestAnimationFrame(() => {
      (open ? viewerTitle : analysisTitle).focus({ preventScroll: true });
    });
  }

  function setViewerOpen(open) {
    if (viewerOpen === open) return;
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (!reduceMotion && 'startViewTransition' in Element.prototype) {
      const transition = stage.startViewTransition(() => applyViewerState(open));
      transition.ready.catch(() => {});
      return;
    }
    applyViewerState(open);
    if (reduceMotion) return;
    stage.classList.remove('is-entering');
    void stage.offsetWidth;
    stage.classList.add('is-entering');
    stage.addEventListener('animationend', () => {
      stage.classList.remove('is-entering');
    }, { once: true });
  }

  function tableConfig() {
    if (tableViewerMode) {
      return {
        type: viewerType.value,
        rank: Number(viewerRank.value),
        buffs: viewerThird.input.checked ? 3 : 2,
        curses: viewerNegative.input.checked ? 1 : 0,
      };
    }
    return {
      type: analysisType.value,
      rank: Number(analysisRank.value),
      buffs: analysisThird.input.checked ? 3 : 2,
      curses: analysisNegative.input.checked ? 1 : 0,
    };
  }

  function activateAnalysisTables() {
    if (viewerOpen || !tableViewerMode) return;
    tableViewerMode = false;
    renderTables();
  }

  function activateViewerTables() {
    if (tableViewerMode) return;
    tableViewerMode = true;
    renderTables();
  }

  function statRows(negative, spliced = false) {
    const config = tableConfig();
    const selectedTags = tableViewerMode
      ? new Set()
      : new Set(analysisRows
        .filter((row) => row.negative === negative && row.select.value && row.select.value !== 'none')
        .map((row) => row.select.value));
    const stats = Object.entries(statsForType(config.type));
    const roll = 1;
    return stats
      .filter(([tag]) => {
        const meta = statMeta(tag);
        if (!meta || Boolean(meta.spliced) !== spliced) return false;
        if (negative) return !meta.spliced && meta.negative !== false;
        return meta.positive !== false;
      })
      .map(([tag, base]) => ({ tag, base }))
      .sort((a, b) => {
        const order = spliced ? SPLICE_ORDER : NORMAL_ORDER;
        return orderIndex(a.tag, order) - orderIndex(b.tag, order);
      })
      .map(({ tag, base }) => {
        const range = rivenRange(base, {
          rank: config.rank,
          buffs: config.buffs,
          curses: config.curses,
          roll,
          negative,
        });
        const minValue = formatRivenValue(tag, range.min, i18n.lang);
        const maxValue = formatRivenValue(tag, range.max, i18n.lang);
        const averageValue = formatRivenValue(tag, range.current, i18n.lang);
        const minLabel = i18n.t('riven.min');
        const maxLabel = i18n.t('riven.max');
        const averageLabel = i18n.t('riven.average');
        return el('tr', {
          class: selectedTags.has(tag) ? 'is-selected' : null,
          dataset: { tag },
        },
          el('th', { scope: 'row', text: i18n.t(`riven.stat.${statMeta(tag).key}`) }),
          el('td', {
            class: 'riven-table__num',
            text: minValue,
            dataset: { label: minLabel },
            attrs: { 'aria-label': `${minLabel}: ${minValue}` },
          }),
          el('td', {
            class: 'riven-table__num',
            text: maxValue,
            dataset: { label: maxLabel },
            attrs: { 'aria-label': `${maxLabel}: ${maxValue}` },
          }),
          el('td', {
            class: 'riven-table__num riven-table__current',
            text: averageValue,
            dataset: { label: averageLabel },
            attrs: { 'aria-label': `${averageLabel}: ${averageValue}` },
          }),
        );
      });
  }

  function renderTables() {
    positiveTable.querySelector('tbody').replaceChildren(...statRows(false, false));
    splicedTable.querySelector('tbody').replaceChildren(...statRows(false, true));
    negativeTable.querySelector('tbody').replaceChildren(...statRows(true, false));
    const config = tableConfig();
    tables.hidden = !config.type;
    negativePanel.hidden = !config.type || config.curses === 0;
  }

  const analysisType = el('select', { id: 'riven-analysis-type', class: 'riven-select' },
    el('option', {
      value: '',
      text: i18n.t('riven.chooseType'),
      disabled: true,
      hidden: true,
    }),
    ...RIVEN_TYPE_ORDER.map((type) => el('option', {
      value: type,
      text: i18n.t(TYPE_LABEL_KEYS[type]),
    })),
  );
  analysisType.value = '';

  const analysisRank = el('input', {
    type: 'range',
    id: 'riven-analysis-rank',
    class: 'riven-range',
    min: 0,
    max: 8,
    step: 1,
    value: '8',
  });
  const analysisRankOutput = el('output', {
    class: 'riven-range__value',
    for: 'riven-analysis-rank',
    text: i18n.t('riven.rankOption', { rank: 8 }),
  });
  const analysisRankField = el('label', { class: 'riven-field', for: 'riven-analysis-rank' },
    el('span', { class: 'label', text: i18n.t('riven.rank') }),
    el('span', { class: 'riven-range-box' },
      el('span', { class: 'riven-range-wrap' }, analysisRank, analysisRankOutput),
    ),
  );
  const analysisThird = toggleField(
    'riven-analysis-third',
    '2',
    '3',
    i18n.t('riven.positiveSwitch'),
    false,
    () => onAnalysisThirdToggle(),
  );
  const analysisNegative = toggleField(
    'riven-analysis-negative',
    i18n.t('riven.none'),
    i18n.t('riven.has'),
    i18n.t('riven.negativeSwitch'),
    false,
    () => onAnalysisNegativeToggle(),
  );
  let switchesTouched = false;

  const analysisRowsHost = el('div', { class: 'riven-analysis-rows' });
  const analysisResultHost = el('div', {
    class: 'riven-analysis__result',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  const analysisBasicSettings = el('div', { class: 'riven-basic-settings' },
    el('label', { class: 'riven-field', for: 'riven-analysis-type' },
      el('span', { class: 'label', text: i18n.t('riven.type') }),
      analysisType,
    ),
    analysisRankField,
    el('div', { class: 'riven-switch-group' },
      el('span', { class: 'label', text: i18n.t('riven.attributeSettings') }),
      el('div', { class: 'riven-switch-group__box' },
        analysisThird.node,
        analysisNegative.node,
      ),
    ),
    el('button', {
      type: 'button',
      class: 'riven-reset',
      text: i18n.t('riven.reset'),
      onclick: () => resetAnalysis(),
    }),
  );
  const analysisTop = el('div', { class: 'riven-analysis__top' },
    analysisBasicSettings,
  );
  const analysisForm = el('form', {
    class: 'riven-analysis__form',
    attrs: { 'aria-labelledby': 'riven-analysis-title' },
    onsubmit: (event) => event.preventDefault(),
  },
    analysisTop,
    analysisRowsHost,
  );
  analysisForm.querySelector('.riven-switch-group__box')?.addEventListener('pointerdown', (event) => {
    if (analysisType.value) return;
    event.preventDefault();
    showTypeWarning();
  });
  syncSwitchAvailability();

  const scanFile = el('input', {
    id: 'riven-scan-file',
    class: 'visually-hidden',
    type: 'file',
    accept: 'image/*',
    attrs: { 'aria-label': i18n.t('riven.scan.upload'), tabindex: '-1' },
    onchange: (event) => {
      const [file] = event.target.files || [];
      if (file) handleScanFile(file);
    },
  });
  const scanUploadIcon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  scanUploadIcon.setAttribute('class', 'riven-scan__icon');
  scanUploadIcon.setAttribute('viewBox', '0 0 48 48');
  scanUploadIcon.setAttribute('aria-hidden', 'true');
  const scanUploadPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  scanUploadPath.setAttribute('d', 'M24 31V8m0 0-8 8m8-8 8 8M8 29v7a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4v-7');
  scanUploadIcon.append(scanUploadPath);
  const scanEmpty = el('div', { class: 'riven-scan__empty' },
    scanUploadIcon,
    el('p', { class: 'riven-scan__upload', text: i18n.t('riven.scan.upload') }),
    el('p', { class: 'riven-scan__model-hint', text: i18n.t('riven.scan.modelHint') }),
  );
  const scanPreviewImage = el('img', {
    class: 'riven-scan__image',
    alt: '',
    hidden: true,
  });
  const scanRetry = el('p', {
    class: 'riven-scan__retry',
    text: i18n.t('riven.scan.retryHint'),
  });
  const scanPreview = el('div', { class: 'riven-scan__preview', hidden: true },
    scanPreviewImage,
    scanRetry,
  );
  const scanStatus = el('p', {
    class: 'visually-hidden',
    attrs: { role: 'status', 'aria-live': 'polite' },
  });
  const scanAction = el('button', {
    type: 'button',
    class: 'riven-scan__action',
    attrs: { 'aria-label': i18n.t('riven.scan.upload') },
    onclick: () => {
      if (!scanPanel.classList.contains('is-busy')) scanFile.click();
    },
  });
  const scanPanel = el('section', {
    class: 'riven-scan',
  },
    scanAction,
    el('div', { class: 'riven-scan__head' },
      el('h3', { id: 'riven-scan-title', text: i18n.t('riven.scan.title') }),
    ),
    scanEmpty,
    scanPreview,
    scanStatus,
    scanFile,
  );
  scanPanel.addEventListener('dragover', (event) => {
    event.preventDefault();
    scanPanel.classList.add('is-dragging');
  });
  scanPanel.addEventListener('dragleave', () => scanPanel.classList.remove('is-dragging'));
  scanPanel.addEventListener('drop', (event) => {
    event.preventDefault();
    scanPanel.classList.remove('is-dragging');
    const [file] = event.dataTransfer?.files || [];
    if (file) handleScanFile(file);
  });
  analysisTop.prepend(scanPanel);

  const analysisTitle = el('h2', {
    id: 'riven-analysis-title',
    text: i18n.t('riven.analysis.title'),
    attrs: { tabindex: '-1' },
  });
  const openViewerButton = el('button', {
    type: 'button',
    class: 'button button--ghost riven-view-toggle',
    text: i18n.t('riven.viewer.open'),
    attrs: { 'aria-controls': 'riven-table-viewer' },
    onclick: () => setViewerOpen(true),
  });
  const analysisSection = el('section', {
    id: 'riven-analysis-panel',
    class: 'panel riven-analysis',
    attrs: { 'aria-labelledby': 'riven-analysis-title' },
  },
    el('div', { class: 'riven-panel-head' }, analysisTitle, openViewerButton),
    analysisForm,
  );
  const analysisResultPanel = el('section', {
    id: 'riven-analysis-result-panel',
    class: 'panel riven-analysis-result',
    attrs: { 'aria-labelledby': 'riven-analysis-result-title' },
  },
    el('h2', {
      id: 'riven-analysis-result-title',
      text: i18n.t('riven.analysis.resultTitle'),
    }),
    analysisResultHost,
  );

  const viewerType = el('select', { id: 'riven-viewer-type', class: 'riven-select' },
    el('option', {
      value: '',
      text: i18n.t('riven.chooseType'),
      disabled: true,
      hidden: true,
    }),
    ...RIVEN_TYPE_ORDER.map((type) => el('option', {
      value: type,
      text: i18n.t(TYPE_LABEL_KEYS[type]),
    })),
  );
  viewerType.value = '';
  const viewerRank = el('input', {
    type: 'range',
    id: 'riven-viewer-rank',
    class: 'riven-range',
    min: 0,
    max: 8,
    step: 1,
    value: '8',
  });
  const viewerRankOutput = el('output', {
    class: 'riven-range__value',
    for: 'riven-viewer-rank',
    text: i18n.t('riven.rankOption', { rank: 8 }),
  });
  const viewerRankField = el('label', { class: 'riven-field', for: 'riven-viewer-rank' },
    el('span', { class: 'label', text: i18n.t('riven.rank') }),
    el('span', { class: 'riven-range-box' },
      el('span', { class: 'riven-range-wrap' }, viewerRank, viewerRankOutput),
    ),
  );
  const viewerThird = toggleField(
    'riven-viewer-third',
    '2',
    '3',
    i18n.t('riven.positiveSwitch'),
    false,
    () => onViewerControlChange(),
  );
  const viewerNegative = toggleField(
    'riven-viewer-negative',
    i18n.t('riven.none'),
    i18n.t('riven.has'),
    i18n.t('riven.negativeSwitch'),
    false,
    () => onViewerControlChange(),
  );
  const viewerTitle = el('h2', {
    id: 'riven-table-viewer-title',
    text: i18n.t('riven.tableViewerTitle'),
    attrs: { tabindex: '-1' },
  });
  const backToAnalysisButton = el('button', {
    type: 'button',
    class: 'button button--ghost riven-view-toggle',
    text: i18n.t('riven.viewer.back'),
    attrs: { 'aria-controls': 'riven-analysis-panel' },
    onclick: () => setViewerOpen(false),
  });
  const tableViewerPanel = el('section', {
    id: 'riven-table-viewer',
    class: 'panel riven-table-viewer',
    hidden: true,
    attrs: { 'aria-labelledby': 'riven-table-viewer-title' },
  },
    el('div', { class: 'riven-panel-head' }, viewerTitle, backToAnalysisButton),
    el('div', { class: 'riven-table-viewer__controls' },
      el('label', { class: 'riven-field', for: 'riven-viewer-type' },
        el('span', { class: 'label', text: i18n.t('riven.type') }),
        viewerType,
      ),
      viewerRankField,
      el('div', { class: 'riven-switch-group' },
        el('span', { class: 'label', text: i18n.t('riven.attributeSettings') }),
        el('div', { class: 'riven-switch-group__box' },
          viewerThird.node,
          viewerNegative.node,
        ),
      ),
    ),
  );
  const resultColumn = el('div', { class: 'riven-top__right' },
    analysisResultPanel,
  );
  top.append(analysisSection, resultColumn, tableViewerPanel);
  tables.append(positivePanel, splicedPanel, negativePanel);

  function onViewerControlChange() {
    tableViewerMode = true;
    viewerRankOutput.textContent = i18n.t('riven.rankOption', { rank: Number(viewerRank.value) });
    renderTables();
  }

  viewerType.addEventListener('change', () => onViewerControlChange());
  viewerRank.addEventListener('input', () => onViewerControlChange());
  tableViewerPanel.addEventListener('pointerdown', () => {
    if (tableViewerMode) return;
    tableViewerMode = true;
    renderTables();
  });
  for (const eventName of ['pointerdown', 'focusin', 'input', 'change']) {
    analysisForm.addEventListener(eventName, activateAnalysisTables);
  }

  let analysisRows = [];

  function analysisTagGroups(negative) {
    const tags = Object.keys(statsForType(analysisType.value)).filter((tag) => {
      const meta = statMeta(tag);
      if (!meta) return false;
      if (negative) return !meta.spliced && meta.negative !== false;
      return meta.positive !== false;
    });
    const normal = sortByOrder(tags.filter((tag) => !statMeta(tag).spliced), NORMAL_ORDER);
    const spliced = sortByOrder(tags.filter((tag) => statMeta(tag).spliced), SPLICE_ORDER);
    return negative ? { normal, spliced: [] } : { normal, spliced };
  }

  function showTypeWarning() {
    analysisType.classList.add('is-type-warning');
    analysisEmpty('riven.analysis.selectType');
  }

  function clearTypeWarning() {
    analysisType.classList.remove('is-type-warning');
  }

  function showAttributeWarning(row) {
    if (!analysisType.value) {
      showTypeWarning();
      return;
    }
    if (!row.select.value) {
      row.select.classList.add('is-attribute-warning');
      refreshAnalysis();
    }
  }

  function syncSwitchAvailability() {
    const disabled = !analysisType.value;
    analysisThird.input.disabled = disabled;
    analysisNegative.input.disabled = disabled;
    analysisThird.node.classList.toggle('is-disabled', disabled);
    analysisNegative.node.classList.toggle('is-disabled', disabled);
    analysisForm.querySelector('.riven-switch-group__box')?.classList.toggle('is-disabled', disabled);
  }

  function analysisEmpty(keys = 'riven.analysis.empty') {
    const list = [...new Set(Array.isArray(keys) ? keys : [keys])].filter(Boolean);
    const warning = list.some((key) => key !== 'riven.analysis.empty');
    tables.hidden = !analysisType.value;
    const box = el('div', {
      class: warning ? 'empty-state riven-result-warning' : 'empty-state',
      attrs: warning ? { role: 'alert', 'aria-live': 'assertive' } : {},
    });
    if (!warning) {
      box.textContent = i18n.t('riven.analysis.empty');
    } else {
      for (const key of list) {
        box.append(el('p', {
          class: 'riven-result-warning__line',
          text: i18n.t(key),
        }));
      }
    }
    analysisResultHost.replaceChildren(box);
  }

  function makeAnalysisRow(negative, index, groups, { optional = false, preferred = null } = {}) {
    const id = `riven-analysis-${negative ? 'curse' : 'buff'}-${index + 1}`;
    const tags = [...groups.normal, ...groups.spliced];
    const select = el('select', {
      id: `${id}-stat`,
      class: 'riven-select',
    });
    select.append(el('option', {
      value: '',
      text: i18n.t('riven.chooseAttribute'),
      disabled: true,
      hidden: true,
    }));
    if (optional) {
      select.append(el('option', {
        value: 'none',
        text: i18n.t('riven.none'),
      }));
    }
    for (const [label, list] of [
      [i18n.t('riven.normalGroup'), groups.normal],
      [i18n.t('riven.splicedGroup'), groups.spliced],
    ]) {
      if (!list.length) continue;
      const group = el('optgroup', { label });
      for (const tag of list) {
        group.append(el('option', {
          value: tag,
          text: i18n.t(`riven.stat.${statMeta(tag).key}`),
        }));
      }
      select.append(group);
    }
    const defaultTag = preferred && tags.includes(preferred) ? preferred : (tags[index] || tags[0]);
    select.value = '';
    const input = el('input', {
      id: `${id}-value`,
      class: 'riven-analysis-input',
      type: 'text',
      inputmode: 'decimal',
      autocomplete: 'off',
      spellcheck: false,
      placeholder: '',
    });
    const unit = el('span', {
      class: 'riven-analysis-unit',
      text: '',
      attrs: { 'aria-hidden': 'true' },
    });
    const toggleSignValue = () => {
      if (!select.value || select.value === 'none') return;
      const current = input.value.trim();
      if (!current) {
        input.value = '-';
      } else if (current.startsWith('-')) {
        input.value = current.slice(1);
      } else if (current.startsWith('+')) {
        input.value = `-${current.slice(1)}`;
      } else {
        input.value = `-${current}`;
      }
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.focus();
    };
    const signButton = el('button', {
      type: 'button',
      class: 'riven-sign-toggle',
      text: '±',
      attrs: {
        'aria-label': i18n.t('riven.analysis.toggleSign'),
        title: i18n.t('riven.analysis.toggleSign'),
      },
      onclick: toggleSignValue,
    });
    const slider = el('input', {
      type: 'range',
      id: `${id}-slider`,
      class: 'riven-analysis-slider',
      attrs: {
        'aria-label': i18n.t('riven.analysis.slider'),
      },
    });
    const syncUnit = () => {
      const none = !select.value || select.value === 'none';
      unit.textContent = none ? '' : analysisUnit(select.value);
      input.placeholder = '';
      input.disabled = none;
      input.readOnly = none;
      input.tabIndex = none ? -1 : 0;
      input.value = none ? '' : input.value;
      const signable = !none && statMeta(select.value)?.kind !== 'multiplier';
      signButton.hidden = !signable;
      signButton.disabled = !signable;
      if (none && document.activeElement === input) input.blur();
      input.closest('.riven-analysis-row')?.classList.toggle('is-none', none);
    };
    select.addEventListener('pointerdown', () => {
      if (!analysisType.value) showTypeWarning();
    });
    select.addEventListener('focus', () => {
      if (!analysisType.value) showTypeWarning();
    });
    select.addEventListener('change', () => {
      select.classList.remove('is-attribute-warning');
      syncUnit();
      const empty = !select.value || select.value === 'none';
      if (!empty) {
        row.required = false;
        select.classList.remove('is-required-warning');
      }
      if (row.optional && switchesTouched) {
        const toggle = negative ? analysisNegative : analysisThird;
        toggle.input.checked = !empty;
      }
      syncSwitchesFromRows();
      if (!empty) {
        fillAverage(row);
        row.autoValue = true;
      } else {
        row.input.value = '';
        row.autoValue = false;
      }
      syncAnalysisSliders();
      renderTables();
      refreshAnalysis();
    });
    const label = i18n.t(negative ? 'riven.analysis.negativeSlot' : 'riven.analysis.slot', {
      index: index + 1,
    });
    const valueLabel = el('span', { class: 'label', text: i18n.t('riven.analysis.value') });
    const inputWrap = el('span', { class: 'riven-input-wrap' }, input, signButton, unit);
    const sliderWrap = el('div', { class: 'riven-analysis-slider-wrap' }, slider);
    const row = {
      node: el('div', { class: 'riven-analysis-row' },
        el('label', { class: 'riven-field', for: `${id}-stat` },
          el('span', { class: 'label', text: label }),
          select,
        ),
        el('label', { class: 'riven-field', for: `${id}-value` },
          valueLabel,
          inputWrap,
        ),
        sliderWrap,
      ),
      select,
      input,
      inputWrap,
      valueLabel,
      unit,
      slider,
      sliderWrap,
      negative,
      optional,
      defaultTag,
      fromSlider: false,
      autoValue: false,
      sliderInverted: false,
      required: false,
      syncUnit,
      setEnabled(enabled, { manual = false } = {}) {
        if (!optional) return;
        if (!enabled) {
          select.value = manual ? 'none' : '';
          this.autoValue = false;
          this.required = false;
          select.classList.remove('is-required-warning');
          select.classList.remove('is-attribute-warning');
        } else if (select.value === 'none') {
          select.value = '';
        }
        syncUnit();
      },
    };
    input.addEventListener('input', () => {
      row.fromSlider = false;
      row.autoValue = false;
      syncSliderFromInput(row);
      refreshAnalysis();
    });
    input.addEventListener('focus', () => {
      if (!select.value || select.value === 'none') input.blur();
    });
    inputWrap.addEventListener('pointerdown', (event) => {
      if (select.value && select.value !== 'none') return;
      showAttributeWarning(row);
      event.preventDefault();
      input.blur();
    });
    sliderWrap.addEventListener('pointerdown', () => {
      if (!select.value || select.value === 'none') showAttributeWarning(row);
    });
    slider.addEventListener('input', () => {
      row.autoValue = false;
      syncInputFromSlider(row);
      refreshAnalysis();
    });
    syncUnit();
    return row;
  }

  function renderAnalysisRows() {
    const positiveGroups = analysisTagGroups(false);
    const negativeGroups = analysisTagGroups(true);
    const negativeTags = negativeGroups.normal;
    analysisRows = [0, 1, 2].map((index) => makeAnalysisRow(
      false,
      index,
      positiveGroups,
      { optional: index === 2 },
    ));
    const usedPositive = analysisRows.map((row) => row.select.value);
    const preferredNegative = [
      'WeaponDamageAmountMod',
      'WeaponAmmoMaxMod',
      'WeaponRecoilReductionMod',
      'WeaponReloadSpeedMod',
      'WeaponZoomFovMod',
    ].find((tag) => negativeTags.includes(tag) && !usedPositive.includes(tag))
      || negativeTags.find((tag) => !usedPositive.includes(tag))
      || negativeTags[0];
    analysisRows.push(makeAnalysisRow(true, 0, negativeGroups, {
      optional: true,
      preferred: preferredNegative,
    }));
    analysisRows[2].setEnabled(analysisThird.input.checked);
    analysisRows[3].setEnabled(analysisNegative.input.checked);
    analysisRowsHost.replaceChildren(...analysisRows.map((row) => row.node));
    analysisEmpty();
    syncAnalysisSliders();
    renderTables();
  }

  function activeAnalysisRows() {
    return analysisRows.filter((row) => row.select.value && row.select.value !== 'none');
  }

  function scanTypeLabels() {
    return [
      [i18n.t('riven.type.rifle'), 'rifle'],
      [i18n.t('riven.type.shotgun'), 'shotgun'],
      [i18n.t('riven.type.pistol'), 'pistol'],
      [i18n.t('riven.type.melee'), 'melee'],
      [i18n.t('riven.type.archgun'), 'archgun'],
      [i18n.t('riven.type.kitgun'), 'kitgun'],
      [i18n.t('riven.type.zaw'), 'zaw'],
      ['Rifle', 'rifle'],
      ['Shotgun', 'shotgun'],
      ['Pistol', 'pistol'],
      ['Melee', 'melee'],
      ['Archgun', 'archgun'],
      ['Kitgun', 'kitgun'],
      ['Zaw', 'zaw'],
    ];
  }

  function scanStatLabels(type = analysisType.value) {
    const labels = [];
    for (const tag of Object.keys(statsForType(type))) {
      const meta = statMeta(tag);
      if (meta) labels.push([i18n.t(`riven.stat.${meta.key}`), tag]);
    }
    return labels;
  }

  function scanStatLabelsAll() {
    return RIVEN_TYPE_ORDER.flatMap((type) => scanStatLabels(type));
  }

  function scanStatAvailability() {
    const available = {};
    for (const type of RIVEN_TYPE_ORDER) {
      for (const tag of Object.keys(statsForType(type))) {
        (available[tag] ||= []).push(type);
      }
    }
    return available;
  }

  function ambiguousScanStatTags() {
    const labels = new Map();
    for (const [label, tag] of scanStatLabelsAll()) {
      const key = normalizeScanText(label).toLowerCase();
      if (!key) continue;
      if (!labels.has(key)) labels.set(key, new Set());
      labels.get(key).add(tag);
    }
    const ambiguous = new Set();
    for (const tags of labels.values()) {
      if (tags.size > 1) {
        for (const tag of tags) ambiguous.add(tag);
      }
    }
    return ambiguous;
  }

  function scanTextWithoutStatLabels(lines, labels) {
    const normalized = labels
      .map(([label]) => normalizeScanText(label).toLowerCase())
      .filter(Boolean);
    return lines
      .filter((line) => {
        const text = normalizeScanText(line).toLowerCase();
        return !normalized.some((label) => text.includes(label));
      })
      .join('\n');
  }

  function setAnalysisRow(row, tag, value) {
    const exists = [...row.select.options].some((option) => option.value === tag);
    if (!exists) return false;
    row.select.value = tag;
    row.syncUnit();
    row.input.value = String(value).replace(/\s+/g, '');
    row.fromSlider = false;
    row.autoValue = false;
    return true;
  }

  function applyScanResult(result) {
    activateAnalysisTables();
    const positives = result.positive.slice(0, 3);
    switchesTouched = false;
    syncSwitchAvailability();
    analysisThird.input.checked = positives.length >= 3;
    analysisNegative.input.checked = Boolean(result.negative);
    renderAnalysisRows();
    let count = 0;
    positives.forEach((entry, index) => {
      if (setAnalysisRow(analysisRows[index], entry.tag, entry.value)) count += 1;
    });
    if (result.negative && setAnalysisRow(analysisRows[3], result.negative.tag, result.negative.value)) {
      count += 1;
    }
    syncAnalysisSliders();
    renderTables();
    analysisEmpty();
    refreshAnalysis();
    return count;
  }

  function resetScanPanel() {
    if (scanPreviewImage.src) URL.revokeObjectURL(scanPreviewImage.src);
    scanPreviewImage.src = '';
    scanPreviewImage.hidden = true;
    scanPreview.hidden = true;
    scanRetry.hidden = false;
    scanEmpty.hidden = false;
    scanPanel.classList.remove('is-busy', 'is-complete', 'is-dragging');
    scanPanel.setAttribute('aria-busy', 'false');
    scanStatus.textContent = '';
    scanStatus.classList.remove('is-error');
    scanFile.value = '';
  }

  function scanStatusText(key, variables = {}, error = false) {
    const message = i18n.t(key, variables);
    if (error) {
      if (typeof window.alert === 'function') window.alert(message);
      resetScanPanel();
      return;
    }
    scanStatus.textContent = message;
    scanStatus.classList.remove('is-error');
  }

  async function prepareScanImage(file) {
    const limit = 2400;
    let source;
    try {
      source = await createImageBitmap(file);
    } catch {
      source = await new Promise((resolve, reject) => {
        const image = new Image();
        const url = URL.createObjectURL(file);
        image.onload = () => {
          URL.revokeObjectURL(url);
          resolve(image);
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('image_decode_failed'));
        };
        image.src = url;
      });
    }
    const width = source.width || source.naturalWidth;
    const height = source.height || source.naturalHeight;
    const scale = Math.min(1, limit / Math.max(width, height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(width * scale));
    canvas.height = Math.max(1, Math.round(height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('canvas_unavailable');
    context.filter = 'grayscale(1) contrast(1.15)';
    context.drawImage(source, 0, 0, canvas.width, canvas.height);
    if (source.close) source.close();
    return new Promise((resolve) => {
      canvas.toBlob((blob) => resolve(blob), 'image/jpeg', 0.92);
    });
  }

  let scanWorkerPromise = null;
  let tesseractPromise = null;

  function loadTesseract() {
    if (globalThis.Tesseract) return Promise.resolve(globalThis.Tesseract);
    if (!tesseractPromise) {
      tesseractPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = new URL('tesseract.min.js', ocrAssetBase()).href;
        script.async = true;
        script.onload = () => {
          if (globalThis.Tesseract) resolve(globalThis.Tesseract);
          else reject(new Error('ocr_loader_failed'));
        };
        script.onerror = () => reject(new Error('ocr_loader_failed'));
        document.head.appendChild(script);
      }).catch((error) => {
        tesseractPromise = null;
        throw error;
      });
    }
    return tesseractPromise;
  }

  async function getScanWorker() {
    if (!scanWorkerPromise) {
      const base = ocrAssetBase();
      const Tesseract = await loadTesseract();
      const workerCreation = Tesseract.createWorker(['chi_sim', 'eng'], 1, {
        workerPath: new URL('worker.min.js', base).href,
        workerBlobURL: false,
        corePath: new URL('tesseract-core-lstm.wasm.js', base).href,
        langPath: new URL('lang/', base).href,
        gzip: true,
        logger: (message) => {
          if (message.status !== 'recognizing text') return;
          const progress = Math.round((message.progress || 0) * 100);
          scanStatusText('riven.scan.recognizingProgress', { progress });
        },
      });
      const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('ocr_timeout')), 60_000);
      });
      scanWorkerPromise = Promise.race([workerCreation, timeout])
        .then(async (worker) => {
          await worker.setParameters({
            tessedit_pageseg_mode: '6',
            preserve_interword_spaces: '1',
          });
          return worker;
        })
        .catch((error) => {
          scanWorkerPromise = null;
          throw error;
        });
    }
    return scanWorkerPromise;
  }

  async function recognizeScan(file) {
    const image = await prepareScanImage(file);
    if (!image) throw new Error('image_prepare_failed');
    scanStatusText('riven.scan.loading');
    const worker = await getScanWorker();
    const { data } = await worker.recognize(image);
    const text = String(data?.text || '').trim();
    if (!text) throw new Error('ocr_empty');
    return text;
  }

  async function handleScanFile(file) {
    activateAnalysisTables();
    scanPanel.classList.remove('is-complete');
    if (!file.type.startsWith('image/')) {
      scanStatusText('riven.scan.notImage', {}, true);
      scanFile.value = '';
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      scanStatusText('riven.scan.tooLarge', {}, true);
      scanFile.value = '';
      return;
    }
    if (window.location.protocol === 'file:') {
      scanStatusText('riven.scan.requiresHttp', {}, true);
      scanFile.value = '';
      return;
    }
    if (scanPreviewImage.src) URL.revokeObjectURL(scanPreviewImage.src);
    scanPreviewImage.src = URL.createObjectURL(file);
    scanPreviewImage.hidden = false;
    scanPreview.hidden = false;
    scanEmpty.hidden = true;
    scanStatusText('riven.scan.recognizing');
    scanPanel.classList.add('is-busy');
    scanPanel.setAttribute('aria-busy', 'true');
    try {
      const text = await recognizeScan(file);
      const currentType = analysisType.value;
      const typeLabels = scanTypeLabels();
      const allStatLabels = scanStatLabelsAll();
      const broadResult = parseRivenScan(text, {
        labels: allStatLabels,
        typeLabels,
      });
      const textType = detectRivenType(
        scanTextWithoutStatLabels(broadResult.raw, allStatLabels),
        typeLabels,
      );
      const matchedWeaponRaw = findRivenWeapon(broadResult.weapon);
      const matchedWeapon = matchedWeaponRaw?.score >= 80 ? matchedWeaponRaw : null;
      const ambiguousTags = ambiguousScanStatTags();
      const statTags = [
        ...broadResult.positive,
        ...(broadResult.negative ? [broadResult.negative] : []),
      ]
        .map((entry) => entry.tag)
        .filter((tag) => !ambiguousTags.has(tag));
      const provenType = inferRivenType({
        statTags,
        availableTypes: scanStatAvailability(),
        typeOrder: RIVEN_TYPE_ORDER,
        preferred: [matchedWeapon?.type, textType, currentType],
      });
      const scanType = provenType || matchedWeapon?.type || textType || currentType;
      let result = parseRivenScan(text, {
        labels: scanStatLabels(scanType),
        typeLabels,
      });
      result = normalizeScanEntries(result, {
        getMeta: (tag) => statMeta(tag),
        getBase: (tag) => statsForType(scanType)[tag],
      });
      if (RIVEN_TYPE_ORDER.includes(scanType)) {
        analysisType.value = scanType;
        clearTypeWarning();
      }
      syncSwitchAvailability();
      if (!result.positive.length && !result.negative) {
        scanStatusText('riven.scan.noStats', {}, true);
        return;
      }
      const count = applyScanResult(result);
      if (!count) {
        scanStatusText('riven.scan.noStats', {}, true);
        return;
      }
      scanStatus.textContent = i18n.t('riven.scan.applied', { count });
      scanStatus.classList.remove('is-error');
      scanRetry.hidden = false;
      scanPanel.classList.add('is-complete');
    } catch {
      scanStatusText('riven.scan.failed', {}, true);
    } finally {
      scanPanel.classList.remove('is-busy');
      scanPanel.setAttribute('aria-busy', 'false');
      scanFile.value = '';
    }
  }

  function analysisSnapshot() {
    return analysisRows.map((row) => ({
      tag: row.select.value,
      value: row.input.value,
      negative: row.negative,
      autoValue: row.autoValue,
      required: row.required,
    }));
  }

  function restoreAnalysisSnapshot(snapshot) {
    snapshot.forEach((saved, index) => {
      const row = analysisRows[index];
      if (!row) return;
      if (saved.required && (!saved.tag || saved.tag === 'none')) {
        row.required = true;
        row.select.classList.add('is-required-warning');
        return;
      }
      if (!saved.tag) return;
      const available = [...row.select.options].some((option) => option.value === saved.tag);
      if (saved.tag === 'none' || !available) {
        if (row.optional) row.setEnabled(false);
        else row.input.value = '';
        return;
      }
      row.select.value = saved.tag;
      row.syncUnit();
      row.input.value = saved.value;
      row.fromSlider = false;
      row.autoValue = Boolean(saved.autoValue);
    });
  }

  function resetAnalysis() {
    activateAnalysisTables();
    resetScanPanel();
    clearTypeWarning();
    analysisType.value = '';
    syncSwitchAvailability();
    analysisRank.value = '8';
    analysisRankOutput.textContent = i18n.t('riven.rankOption', { rank: 8 });
    switchesTouched = false;
    analysisThird.input.checked = false;
    analysisNegative.input.checked = false;
    renderAnalysisRows();
    syncAnalysisSliders();
    renderTables();
    analysisEmpty();
    refreshAnalysis();
  }

  function analysisValuesComplete() {
    const rows = activeAnalysisRows();
    return rows.length > 0 && rows.every((row) => row.input.value.trim().length > 0);
  }

  function analysisCounts() {
    const rows = activeAnalysisRows();
    return {
      buffs: rows.filter((row) => !row.negative).length,
      curses: rows.filter((row) => row.negative).length,
    };
  }

  function syncSwitchesFromRows() {
    if (switchesTouched) return;
    const rows = activeAnalysisRows();
    analysisThird.input.checked = rows.filter((row) => !row.negative).length >= 3;
    analysisNegative.input.checked = rows.some((row) => row.negative);
  }

  function sliderPrecision(tag) {
    const kind = statMeta(tag)?.kind;
    return kind === 'multiplier' || kind === 'seconds' || kind === 'meters' ? 2 : 1;
  }

  function sliderStep(tag) {
    const kind = statMeta(tag)?.kind;
    return kind === 'multiplier' || kind === 'seconds' || kind === 'meters' ? 0.01 : 0.1;
  }

  function sliderRound(tag, value) {
    const factor = 10 ** sliderPrecision(tag);
    return Math.round(value * factor) / factor;
  }

  function sliderBounds(row) {
    const { buffs, curses } = analysisCounts();
    const range = rivenRange(statsForType(analysisType.value)[row.select.value], {
      rank: Number(analysisRank.value),
      buffs,
      curses,
      negative: row.negative,
    });
    const first = sliderRound(row.select.value, rivenDisplayNumber(row.select.value, range.min));
    const second = sliderRound(row.select.value, rivenDisplayNumber(row.select.value, range.max));
    return {
      min: Math.min(first, second),
      max: Math.max(first, second),
      inverted: first > second,
    };
  }

  function syncRowSlider(row) {
    if (!row.select.value || row.select.value === 'none') {
      row.slider.disabled = true;
      row.slider.min = '0';
      row.slider.max = '100';
      row.slider.value = '50';
      row.sliderInverted = false;
      row.slider.removeAttribute('aria-valuetext');
      return;
    }
    const meta = statMeta(row.select.value);
    if (meta?.sliderQuality) {
      const { buffs, curses } = analysisCounts();
      const base = statsForType(analysisType.value)[row.select.value];
      const parsed = rivenRollFromDisplay(base, row.select.value, row.input.value, {
        rank: Number(analysisRank.value),
        buffs,
        curses,
        negative: row.negative,
      });
      row.slider.disabled = false;
      row.slider.min = '0';
      row.slider.max = '100';
      row.slider.step = '1';
      row.sliderInverted = false;
      row.slider.value = String(Math.round(
        parsed ? rivenQualityFromRoll(parsed.roll, { negative: row.negative }) : 50,
      ));
      row.slider.setAttribute('aria-valuetext', row.input.value || '');
      row.fromSlider = false;
      return;
    }
    const { min, max, inverted } = sliderBounds(row);
    row.slider.disabled = false;
    row.slider.min = String(min);
    row.slider.max = String(max);
    row.slider.step = String(sliderStep(row.select.value));
    row.sliderInverted = inverted;
    row.slider.removeAttribute('aria-valuetext');
    const raw = rivenDisplayToRaw(row.select.value, row.input.value);
    const current = raw == null ? (min + max) / 2 : rivenDisplayNumber(row.select.value, raw);
    row.slider.value = String(Math.min(max, Math.max(min, current)));
    row.fromSlider = false;
  }

  function syncAnalysisSliders() {
    for (const row of analysisRows) syncRowSlider(row);
  }

  function fillAverage(row) {
    const tag = row.select.value;
    if (!tag || tag === 'none') return false;
    const base = statsForType(analysisType.value)[tag];
    if (base == null) return false;
    const { buffs, curses } = analysisCounts();
    const value = rivenValue(base, {
      rank: Number(analysisRank.value),
      buffs,
      curses,
      roll: 1,
      negative: row.negative,
    });
    row.input.value = formatRivenValue(tag, value, i18n.lang);
    row.fromSlider = false;
    return true;
  }

  function syncAutoAverages() {
    for (const row of analysisRows) {
      if (row.autoValue) fillAverage(row);
    }
  }

  function syncRowRangeState(row) {
    const outOfRange = !row.fromSlider
      && row.select.value
      && row.select.value !== 'none'
      && row.input.value.trim().length > 0
      && (() => {
        const raw = rivenDisplayToRaw(row.select.value, row.input.value);
        if (raw == null) return true;
        const { buffs, curses } = analysisCounts();
        const result = rivenRollFromDisplay(
          statsForType(analysisType.value)[row.select.value],
          row.select.value,
          row.input.value,
          {
            rank: Number(analysisRank.value),
            buffs,
            curses,
            negative: row.negative,
          },
        );
        return !result || !result.inRange;
      })();
    row.inputWrap.classList.toggle('is-out-of-range', outOfRange);
    row.sliderWrap.classList.toggle('is-out-of-range', outOfRange);
    row.slider.classList.toggle('is-out-of-range', outOfRange);
    return outOfRange;
  }

  function syncRangeStates() {
    let hasOutOfRange = false;
    for (const row of analysisRows) {
      if (syncRowRangeState(row)) hasOutOfRange = true;
    }
    const spliced = analysisRows.filter((row) => (
      row.select.value
      && row.select.value !== 'none'
      && statMeta(row.select.value)?.spliced
    ));
    const overLimit = spliced.length > 1;
    for (const row of analysisRows) {
      const isSpliced = Boolean(
        row.select.value
        && row.select.value !== 'none'
        && statMeta(row.select.value)?.spliced,
      );
      row.select.classList.toggle('is-spliced-warning', overLimit && isSpliced);
    }
    return { hasOutOfRange, splicedOverLimit: overLimit };
  }

  function syncSliderFromInput(row) {
    if (!row.select.value || row.select.value === 'none') return;
    const meta = statMeta(row.select.value);
    if (meta?.sliderQuality) {
      const { buffs, curses } = analysisCounts();
      const parsed = rivenRollFromDisplay(
        statsForType(analysisType.value)[row.select.value],
        row.select.value,
        row.input.value,
        {
          rank: Number(analysisRank.value),
          buffs,
          curses,
          negative: row.negative,
        },
      );
      if (!parsed) return;
      const quality = rivenQualityFromRoll(parsed.roll, { negative: row.negative });
      row.slider.value = String(Math.round(Math.min(100, Math.max(0, quality))));
      row.slider.setAttribute('aria-valuetext', row.input.value);
      return;
    }
    const raw = rivenDisplayToRaw(row.select.value, row.input.value);
    if (raw == null) return;
    const value = rivenDisplayNumber(row.select.value, raw);
    row.slider.value = String(Math.min(Number(row.slider.max), Math.max(Number(row.slider.min), value)));
  }

  function syncInputFromSlider(row) {
    if (!row.select.value || row.select.value === 'none' || row.slider.disabled) return;
    const meta = statMeta(row.select.value);
    const { buffs, curses } = analysisCounts();
    const roll = meta?.sliderQuality
      ? rivenRollFromQuality(Number(row.slider.value), { negative: row.negative })
      : rivenRollFromSliderRatio(
        Number(row.slider.max) === Number(row.slider.min)
          ? 0.5
          : (Number(row.slider.value) - Number(row.slider.min))
            / (Number(row.slider.max) - Number(row.slider.min)),
        { inverted: row.sliderInverted },
      );
    const raw = rivenValue(statsForType(analysisType.value)[row.select.value], {
      rank: Number(analysisRank.value),
      buffs,
      curses,
      roll,
      negative: row.negative,
    });
    row.input.value = formatRivenValue(row.select.value, raw, i18n.lang);
    if (meta?.sliderQuality) row.slider.setAttribute('aria-valuetext', row.input.value);
    row.fromSlider = true;
  }

  function showAnalysisError(key) {
    analysisEmpty(key);
  }

  function analysisRowsData() {
    const type = analysisType.value;
    return activeAnalysisRows().map((row) => ({
      tag: row.select.value,
      base: statsForType(type)[row.select.value],
      input: row.input.value,
      negative: row.negative,
    }));
  }

  function analysisBand(delta) {
    if (delta < -6) return i18n.t('riven.analysis.veryLow');
    if (delta < -2) return i18n.t('riven.analysis.slightlyLow');
    if (delta < 2) return i18n.t('riven.analysis.average');
    if (delta < 6) return i18n.t('riven.analysis.slightlyHigh');
    return i18n.t('riven.analysis.veryHigh');
  }

  function renderAnalysis(name, stats) {
    const buffs = stats.filter((stat) => !stat.negative).length;
    const curses = stats.filter((stat) => stat.negative).length;
    const rank = Number(analysisRank.value);
    const resultRows = stats.map((stat) => {
      const averageRaw = rivenValue(stat.base, {
        rank,
        buffs,
        curses,
        roll: 1,
        negative: stat.negative,
      });
      const averageText = formatRivenValue(stat.tag, averageRaw, i18n.lang);
      const inputRaw = rivenDisplayToRaw(stat.tag, stat.input);
      const inputNumber = inputRaw == null ? null : rivenDisplayNumber(stat.tag, inputRaw);
      const averageNumber = rivenDisplayNumber(stat.tag, averageRaw);
      const multiplier = statMeta(stat.tag)?.kind === 'multiplier';
      const inputValue = inputNumber == null
        ? null
        : (multiplier ? inputNumber - 1 : Math.abs(inputNumber));
      const averageValue = averageNumber == null || (multiplier && averageNumber === 1)
        ? null
        : (multiplier ? averageNumber - 1 : Math.abs(averageNumber));
      const delta = inputValue == null || averageValue == null || averageValue === 0
        ? null
        : ((inputValue / averageValue) - 1) * 100;
      const shownDelta = delta == null ? null : Math.max(-10, Math.min(10, delta));
      const analysisText = shownDelta == null
        ? '—'
        : `${shownDelta >= 0 ? '+' : ''}${shownDelta.toFixed(1)}%（${analysisBand(shownDelta)}）`;
      const valueLabel = i18n.t('riven.analysis.value');
      const averageLabel = i18n.t('riven.average');
      const analysisLabel = i18n.t('riven.analysis.analysis');
      return el('tr', { class: stat.negative ? 'is-negative' : null },
        el('th', { scope: 'row', text: i18n.t(`riven.stat.${statMeta(stat.tag).key}`) }),
        el('td', {
          class: 'riven-table__num',
          text: stat.input,
          dataset: { label: valueLabel },
          attrs: { 'aria-label': `${valueLabel}: ${stat.input}` },
        }),
        el('td', {
          class: 'riven-table__num',
          text: averageText,
          dataset: { label: averageLabel },
          attrs: { 'aria-label': `${averageLabel}: ${averageText}` },
        }),
        el('td', {
          class: 'riven-table__num',
          text: analysisText,
          dataset: { label: analysisLabel },
          attrs: { 'aria-label': `${analysisLabel}: ${analysisText}` },
        }),
      );
    });
    const captionId = 'riven-analysis-caption';
    const table = el('table', { class: 'riven-table riven-table--result' },
      el('caption', {
        id: captionId,
        class: 'visually-hidden',
        text: i18n.t('riven.analysis.caption'),
      }),
      el('colgroup', {},
        el('col', { class: 'riven-col-stat' }),
        el('col', { class: 'riven-col-num' }),
        el('col', { class: 'riven-col-num' }),
        el('col', { class: 'riven-col-analysis' }),
      ),
      el('thead', {},
        el('tr', {},
          el('th', { scope: 'col', text: i18n.t('riven.stat') }),
          el('th', { scope: 'col', class: 'riven-table__num', text: i18n.t('riven.analysis.value') }),
          el('th', { scope: 'col', class: 'riven-table__num', text: i18n.t('riven.average') }),
          el('th', { scope: 'col', class: 'riven-table__num', text: i18n.t('riven.analysis.analysis') }),
        ),
      ),
      el('tbody', {}, resultRows),
    );
    const summary = el('div', { class: 'riven-analysis__summary' },
      el('div', {},
        el('span', { class: 'label', text: i18n.t('riven.analysis.name') }),
        el('strong', { class: 'riven-analysis__name', text: name.name }),
      ),
    );
    tables.hidden = !analysisType.value;
    analysisResultHost.replaceChildren(summary, el('div', {
      class: 'riven-table-wrap',
      tabindex: 0,
      attrs: { role: 'region', 'aria-labelledby': captionId },
    }, table));
  }

  function analyzeRiven(showErrors = false) {
    if (!showErrors && !analysisValuesComplete()) return;
    const data = analysisRowsData();
    if (data.length === 0 || data.some((row) => !row.input.trim())) {
      if (showErrors) showAnalysisError('riven.analysis.invalid');
      return;
    }
    const selected = new Set();
    for (const row of data) {
      if (selected.has(row.tag)) {
        showAnalysisError('riven.analysis.duplicate');
        return;
      }
      selected.add(row.tag);
    }
    const { buffs, curses } = analysisCounts();
    const stats = [];
    for (const row of data) {
      const result = rivenRollFromDisplay(row.base, row.tag, row.input, {
        rank: Number(analysisRank.value),
        buffs,
        curses,
        negative: row.negative,
      });
      if (!result) {
        if (showErrors) showAnalysisError('riven.analysis.invalid');
        return;
      }
      stats.push({ ...row, ...result });
    }
    const positives = stats.filter((stat) => !stat.negative);
    if (positives.length < 2) {
      showAnalysisError('riven.analysis.needPositive');
      return;
    }
    const name = rivenNameFromStats(positives);
    if (!name) {
      showAnalysisError('riven.analysis.invalid');
      return;
    }
    renderAnalysis(name, stats);
  }

  function refreshAnalysis() {
    syncAutoAverages();
    syncAnalysisSliders();
    const { hasOutOfRange, splicedOverLimit } = syncRangeStates();
    const notices = [];
    if (analysisType.classList.contains('is-type-warning')) {
      notices.push('riven.analysis.selectType');
    }
    if (analysisRows.some((row) => row.required && !row.select.value)) {
      notices.push('riven.analysis.selectAttribute');
    } else if (analysisRows.some((row) => row.select.classList.contains('is-attribute-warning'))) {
      notices.push('riven.analysis.selectAttribute');
    }
    if (splicedOverLimit) notices.push('riven.splicedLimit');
    if (hasOutOfRange) notices.push('riven.analysis.invalid');
    if (notices.length) {
      analysisEmpty(notices);
      return;
    }
    if (!analysisValuesComplete()) {
      analysisEmpty();
      return;
    }
    analyzeRiven(false);
  }

  function onAnalysisThirdToggle() {
    switchesTouched = true;
    const positiveRows = analysisRows.slice(0, 3);
    analysisRows[2]?.setEnabled(analysisThird.input.checked, { manual: true });
    for (const row of positiveRows) {
      row.required = analysisThird.input.checked && (!row.select.value || row.select.value === 'none');
      row.select.classList.toggle('is-required-warning', row.required);
    }
    syncAnalysisSliders();
    renderTables();
    analysisEmpty();
    refreshAnalysis();
  }

  function onAnalysisNegativeToggle() {
    switchesTouched = true;
    const row = analysisRows[3];
    row?.setEnabled(analysisNegative.input.checked, { manual: true });
    if (row) {
      row.required = analysisNegative.input.checked && (!row.select.value || row.select.value === 'none');
      row.select.classList.toggle('is-required-warning', row.required);
    }
    syncAnalysisSliders();
    renderTables();
    analysisEmpty();
    refreshAnalysis();
  }

  analysisType.addEventListener('change', () => {
    clearTypeWarning();
    syncSwitchAvailability();
    const snapshot = analysisSnapshot();
    renderAnalysisRows();
    restoreAnalysisSnapshot(snapshot);
    syncAnalysisSliders();
    renderTables();
    refreshAnalysis();
  });
  analysisRank.addEventListener('input', () => {
    analysisRankOutput.textContent = i18n.t('riven.rankOption', { rank: Number(analysisRank.value) });
    syncAnalysisSliders();
    renderTables();
    refreshAnalysis();
  });
  analysisForm.addEventListener('change', refreshAnalysis);
  analysisForm.addEventListener('input', refreshAnalysis);

  function onScanPaste(event) {
    const items = [...(event.clipboardData?.items || [])];
    const image = items.find((item) => item.kind === 'file' && item.type.startsWith('image/'));
    const file = image?.getAsFile();
    if (!file) return;
    event.preventDefault();
    handleScanFile(file);
  }
  document.addEventListener('paste', onScanPaste);

  renderAnalysisRows();

  return {
    node: page,
    _cleanup() {
      document.removeEventListener('paste', onScanPaste);
      if (scanPreviewImage.src) URL.revokeObjectURL(scanPreviewImage.src);
      scanWorkerPromise?.then((worker) => worker.terminate()).catch(() => {});
    },
  };
}
