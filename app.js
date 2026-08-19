(function () {
'use strict';

const {
  DEFAULT_STATIONS,
  LINE_TEMPLATES,
  cloneStations,
  createRuntime,
  createLine,
  inputTargetQuantity,
  calculateLine,
  isBatchProcess,
  parseBatchStartTimes,
  resizeRuntime,
  estimateBatchSeconds,
  advanceLine
} = window.ProductionModel;

const firstLine = createLine('Line 1');
firstLine.templateKey = 'hla';
const state = {
  lines: [firstLine],
  activeLineId: firstLine.id,
  speed: 1,
  lineZoom: 1,
  dashboardPinned: true,
  playing: true,
  presentation: false,
  lastTime: performance.now(),
  lastUiUpdate: 0,
  flashEditors: false,
  expandedProcessKeys: new Set()
};

const $ = id => document.getElementById(id);
const svg = $('lineSvg');

function activeLine() {
  return state.lines.find(line => line.id === state.activeLineId) || state.lines[0];
}

function statsFor(line = activeLine()) {
  return calculateLine(line);
}

function format(value, digits = 1) {
  if (!Number.isFinite(Number(value))) return 'STOP';
  return Number(value).toFixed(digits);
}

function formatClock(seconds) {
  const totalSeconds = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return [hours, minutes, remainingSeconds].map(value => String(value).padStart(2, '0')).join(':');
}

function formatCompletionTime(seconds, hoursPerDay) {
  if (!Number.isFinite(seconds)) return 'STOP';
  const totalMinutes = Math.max(0, Math.ceil(seconds / 60));
  if (totalMinutes === 0) return '0 min';
  const minutesPerDay = Math.max(1, Math.round(hoursPerDay * 60));
  const days = Math.floor(totalMinutes / minutesPerDay);
  const remainder = totalMinutes % minutesPerDay;
  const hours = Math.floor(remainder / 60);
  const minutes = remainder % 60;
  const parts = [];
  if (days > 0) parts.push(`${days} ${days === 1 ? 'day' : 'days'}`);
  if (hours > 0) parts.push(`${hours} h`);
  if (minutes > 0) parts.push(`${minutes} min`);
  return parts.join(' ');
}

function formatBatchDuration(hours) {
  const value = Math.max(0, Number(hours) || 0);
  return value >= 1 ? `${format(value, value % 1 ? 1 : 0)} h` : `${format(value * 60, 0)} min`;
}

function batchStartSummary(item) {
  const times = String(item.batchStartTimes || '').trim() || 'no valid time';
  if (item.batchStartMode === 'full') return 'Starts when batch is full';
  if (item.batchStartMode === 'full-or-schedule') return `Full or scheduled · ${times}`;
  return `Scheduled · ${times}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[character]);
}

function shortName(value, max = 19) {
  const text = String(value);
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function unitLabel(unitName, count = 2) {
  const unit = String(unitName || 'product');
  if (count === 1) return unit;
  if (unit.toUpperCase() === 'PCB') return 'PCBs';
  if (unit.toUpperCase() === 'PCBA') return 'PCBAs';
  return unit.endsWith('s') ? unit : `${unit}s`;
}

function unitLabelUpper(unitName, count = 2) {
  return unitLabel(unitName, count).toUpperCase();
}

function unitAbbreviation(unitName) {
  const unit = String(unitName || 'product').toUpperCase();
  if (unit === 'PANEL') return 'PNL';
  if (unit === 'PCB PANEL') return 'PCB PNL';
  if (unit === 'PCBA PANEL') return 'PCBA PNL';
  if (unit === 'PRODUCT') return 'UNIT';
  return unit;
}

function productDisplaySerial(product) {
  return product.displaySerial || product.serial;
}

const PRODUCT_TYPES = {
  product: { inputUnitName: 'product', outputUnitName: 'product' },
  pcb: { inputUnitName: 'PCB', outputUnitName: 'PCB' },
  'pcb-panel': { inputUnitName: 'PCB Panel', outputUnitName: 'PCB', conversion: true },
  pcba: { inputUnitName: 'PCBA', outputUnitName: 'PCBA' },
  'pcba-panel': { inputUnitName: 'PCBA Panel', outputUnitName: 'PCBA', conversion: true }
};

function productTypeMode(line) {
  if (line.inputUnitName === 'PCB Panel' && line.outputUnitName === 'PCB') return 'pcb-panel';
  if (line.inputUnitName === 'PCBA Panel' && line.outputUnitName === 'PCBA') return 'pcba-panel';
  if (line.inputUnitName === 'PCB' && line.outputUnitName === 'PCB') return 'pcb';
  if (line.inputUnitName === 'PCBA' && line.outputUnitName === 'PCBA') return 'pcba';
  return 'product';
}

function depanelingProcess(outputUnitName = 'PCB', automatic = false) {
  return {
    id: `depaneling-${Date.now()}`,
    name: 'Panel Depaneling',
    processType: 'unit',
    manualTime: 15,
    machineTime: 45,
    operators: 1,
    equipment: 1,
    equipmentName: 'Depaneling machine',
    transferTime: 3,
    conversionType: 'split',
    conversionEnabled: true,
    outputMultiplier: 4,
    inputUnitName: `${outputUnitName} Panel`,
    outputUnitName,
    autoProductConversion: automatic
  };
}

function applyProductType(line, mode) {
  const productType = PRODUCT_TYPES[mode] || PRODUCT_TYPES.product;
  line.inputUnitName = productType.inputUnitName;
  line.outputUnitName = productType.outputUnitName;
  let conversions = line.stations.filter(item => item.conversionType === 'split');
  if (productType.conversion) {
    let conversion = conversions[0];
    if (!conversion) {
      conversion = depanelingProcess(productType.outputUnitName, true);
      line.stations.push(conversion);
      conversions = [conversion];
    }
    conversion.conversionEnabled = true;
    conversion.inputUnitName = productType.inputUnitName;
    conversion.outputUnitName = productType.outputUnitName;
    conversion.outputMultiplier = Math.max(2, Math.floor(Number(conversion.outputMultiplier) || 4));
    conversions.slice(1).forEach(item => { item.conversionEnabled = false; });
  } else {
    line.stations = line.stations.filter(item => !item.autoProductConversion);
    line.stations.forEach(item => {
      if (item.conversionType === 'split') item.conversionEnabled = false;
    });
  }
  line.availableOperators = Math.max(line.availableOperators, line.stations.reduce((sum, item) => sum + Math.max(0, Number(item.operators) || 0), 0));
  line.runtime = createRuntime(line.stations.length);
}

function productIdentitySummary(line, stats) {
  const inputUnitName = line.inputUnitName || 'product';
  const outputUnitName = line.outputUnitName || 'product';
  const invalidConversionIndex = stats.details.findIndex(item => item.conversionInvalid);
  if (invalidConversionIndex >= 0) {
    const invalidConversion = stats.details[invalidConversionIndex];
    return `Wrong setup: P${String(invalidConversionIndex + 1).padStart(2, '0')} ${invalidConversion.name} is inactive for the current Product type. Remove it or select ${invalidConversion.outputUnitName || outputUnitName} Panel. The line is stopped.`;
  }
  if (inputUnitName === 'PCB Panel' || inputUnitName === 'PCBA Panel') {
    const conversionIndex = stats.details.findIndex(item => item.conversionActive);
    if (conversionIndex >= 0) {
      const conversion = stats.details[conversionIndex];
      return `${inputUnitName} enters as one four-board panel. P${String(conversionIndex + 1).padStart(2, '0')} converts each panel into ${conversion.outputMultiplier} individual ${unitLabel(outputUnitName)}. Target qty counts finished ${unitLabel(outputUnitName)}.`;
    }
    return `${inputUnitName} enters the line, but no active depaneling process exists. Add Panel depaneling before producing individual ${unitLabel(outputUnitName)}.`;
  }
  return `Each animated item is one individual ${inputUnitName}. Target qty counts finished ${unitLabel(outputUnitName)}.`;
}

function refresh(options = {}) {
  renderLineTabs();
  renderMetrics();
  syncControls();
  if (options.editor !== false) renderEditors(options.flash === true);
  renderSvg();
}

function renderLineTabs() {
  const totalThroughput = state.lines.reduce((sum, line) => sum + statsFor(line).throughput, 0);
  $('lineTabs').innerHTML = state.lines.map(line => {
    const stats = statsFor(line);
    return `<button class="line-tab ${line.id === state.activeLineId ? 'active' : ''}" data-line-id="${line.id}">${escapeHtml(line.name)}<small>${format(stats.throughput, 0)}/h</small></button>`;
  }).join('');
  $('networkSummary').textContent = `${state.lines.length} ${state.lines.length === 1 ? 'line' : 'lines'} · ${format(totalThroughput, 0)} combined finished units/h`;
  $('deleteLineBtn').disabled = state.lines.length === 1;
}

function renderMetrics() {
  const line = activeLine();
  const stats = statsFor(line);
  const overAvailable = Math.max(0, stats.totalOperators - line.availableOperators);
  const targetQty = Math.max(0, Math.floor(Number(line.targetQty) || 0));
  const inputTarget = inputTargetQuantity(line);
  const inputUnitName = line.inputUnitName || 'product';
  const outputUnitName = line.outputUnitName || 'product';
  const started = line.runtime.released || 0;
  const completed = line.runtime.completed || 0;
  const batchSeconds = estimateBatchSeconds(line, stats.details);
  const shiftHours = Math.max(.1, Number(line.shiftHours) || 8);
  const containsBatchProcess = line.stations.some(isBatchProcess);
  const completionDaySeconds = containsBatchProcess ? 86400 : shiftHours * 3600;
  const completionDay = batchSeconds > 0 && Number.isFinite(batchSeconds) ? Math.ceil(batchSeconds / completionDaySeconds) : 0;
  $('throughputMetric').textContent = format(stats.throughput);
  $('throughputDetail').textContent = stats.throughput <= 0
    ? 'line stopped'
    : isBatchProcess(stats.bottleneck)
      ? `${format(stats.throughput * shiftHours, 0)} ${unitLabel(outputUnitName)}/day batch capacity`
      : `1 ${outputUnitName} every ${format(3600 / stats.throughput, 1)} sec after line fills`;
  $('bottleneckMetric').textContent = stats.bottleneck?.name || '—';
  $('bottleneckMetric').closest('.metric')?.classList.toggle('bottleneck-balanced', Boolean(stats.bottleneck && stats.allProcessesBusy));
  $('bottleneckDetail').textContent = !stats.bottleneck
    ? 'No active process'
    : stats.bottleneck.conversionInvalid
      ? 'Wrong setup · depaneling inactive · line stopped'
    : isBatchProcess(stats.bottleneck)
      ? `${format(stats.bottleneck.batchProcessPercent, 0)}% processed · ${stats.bottleneck.batchCapacity} ${unitLabel(stats.bottleneck.inputUnitName, stats.bottleneck.batchCapacity)}/batch · ${formatBatchDuration(stats.bottleneck.batchDurationHours)} · ${stats.bottleneck.equipment} batch resource${stats.bottleneck.equipment === 1 ? '' : 's'}`
      : `${format(stats.bottleneck.cycle, 1)} sec cycle · ${format(stats.bottleneck.capacity, 0)} ${unitLabel(outputUnitName)}/h`;
  $('simulationTimeMetric').textContent = formatClock(line.runtime.clock);
  $('simulationTimeStatus').textContent = completed >= targetQty && targetQty > 0
    ? 'target batch complete'
    : state.playing
      ? `${format(state.speed, state.speed < 1 ? 1 : 0)}× simulation running`
      : 'simulation paused';
  $('completionTimeMetric').textContent = formatCompletionTime(batchSeconds, containsBatchProcess ? 24 : shiftHours);
  $('completionTimeDetail').textContent = !Number.isFinite(batchSeconds)
    ? 'required process resource or batch schedule is missing'
    : containsBatchProcess
      ? `Target completes on calendar day ${completionDay} · continuous clock`
      : `Target completes on workday ${completionDay} · ${format(shiftHours, shiftHours % 1 ? 1 : 0)} h/day`;
  $('operatorsMetric').textContent = `${stats.totalOperators} / ${line.availableOperators}`;
  $('operatorStatusMetric').textContent = overAvailable
    ? `${overAvailable} over available quantity`
    : 'within available quantity';
  $('equipmentMetric').textContent = String(stats.totalEquipment);
  $('batchMetric').textContent = `${started} / ${inputTarget}`;
  $('batchStatusMetric').textContent = completed >= targetQty && targetQty > 0
    ? `${targetQty} ${unitLabel(outputUnitName, targetQty)} complete`
    : started > 0
      ? `${started} ${unitLabel(inputUnitName, started)} started · ${completed}/${targetQty} ${unitLabel(outputUnitName)} finished`
      : 'not started';
  $('releasedMetric').textContent = `${started} / ${inputTarget}`;
  $('completedMetric').textContent = `${completed} / ${targetQty}`;
  $('startedUnitLabel').textContent = `${unitLabel(inputUnitName)} started`;
  $('finishedUnitLabel').textContent = `${unitLabel(outputUnitName)} finished`;
  $('targetQtyLabel').textContent = `Target finished ${outputUnitName} qty`;
  $('productIdentityHelp').textContent = productIdentitySummary(line, stats);
  $('productIdentityHelp').classList.toggle('is-warning', stats.details.some(item => item.conversionInvalid) || (inputUnitName.endsWith(' Panel') && !stats.details.some(item => item.conversionActive)));
  $('activeLineLabel').textContent = line.name;
  updateLiveStationKpis();
}

function waitingSeconds(line, stats, index) {
  const detail = stats.details[index];
  const arrivalRate = detail?.finishedUnitsPerInput > 0 ? stats.throughput / detail.finishedUnitsPerInput : 0;
  return arrivalRate > 0 ? (line.runtime.buffers[index] / arrivalRate) * 3600 : 0;
}

function queueSummary(queue, wait, unitName = 'product') {
  const count = Math.max(0, Math.floor(Number(queue) || 0));
  return `${count} ${unitLabel(unitName, count)} · ~${format(wait, 0)}s wait`;
}

function cycleDriverLabel(detail) {
  if (!detail) return 'No timing data';
  if (detail.cycleDriver === 'conversion-inactive') return 'Wrong setup · depaneling inactive · line stopped';
  if (detail.cycleDriver === 'batch') return `${format(detail.batchProcessPercent, 0)}% processed · ${detail.batchCapacity} ${unitLabel(detail.inputUnitName, detail.batchCapacity)}/batch · ${batchStartSummary(detail)}`;
  if (detail.cycleDriver === 'batch-settings-missing') return 'Complete the batch duration, capacity, and schedule';
  if (detail.cycleDriver === 'operator-and-machine-missing') return 'Operator and auto machine required';
  if (detail.cycleDriver === 'operator-missing') return 'Operator required';
  if (detail.cycleDriver === 'machine-missing') return isBatchProcess(detail) ? 'Assign at least one batch resource' : 'Auto machine required';
  if (detail.cycleDriver === 'operator') return `Operator sets cycle · ${format(detail.manualCycle, 1)}s`;
  if (detail.cycleDriver === 'machine') return `Auto machine sets cycle · ${format(detail.machineCycle, 1)}s`;
  if (detail.cycleDriver === 'balanced') return `Balanced resources · ${format(detail.cycle, 1)}s`;
  return 'No manual or machine time';
}

function operatorRequirementText(item) {
  if (isBatchProcess(item)) return 'Not required · transfer time covers handling';
  if (!(Number(item.manualTime) > 0)) return 'Not required · manual time is 0s';
  return Number(item.operators) > 0 ? 'Required · available' : 'Required · assign at least 1';
}

function machineRequirementText(item) {
  if (isBatchProcess(item)) return Number(item.equipment) > 0 ? 'Required · batch equipment available' : 'Required · assign at least 1 batch resource';
  if (!(Number(item.machineTime) > 0)) return 'Not required · machine time is 0s';
  return Number(item.equipment) > 0 ? 'Required · available' : 'Required · assign at least 1';
}

function renderEditors(flash = false) {
  const line = activeLine();
  const stats = statsFor(line);
  $('stationEditor').innerHTML = line.stations.map((item, index) => {
    const detail = stats.details[index];
    const queue = line.runtime.buffers[index] || 0;
    const wait = waitingSeconds(line, stats, index);
    const bottleneck = detail.id === stats.bottleneck?.id;
    const balancedBottleneck = bottleneck && stats.allProcessesBusy;
    const busyAttention = detail.utilization >= .85;
    const batchProcess = isBatchProcess(item);
    const processPercent = Math.max(1, Math.min(100, Number(detail.batchProcessPercent) || 100));
    const conversionMultiplier = Math.max(1, Math.floor(Number(item.outputMultiplier) || 1));
    const conversionProcess = item.conversionType === 'split';
    const processKey = `${line.id}:${item.id}`;
    const processOpen = state.expandedProcessKeys.has(processKey);
    return `
      <details class="station-card process-card-details ${batchProcess ? 'is-batch-process' : ''} ${bottleneck ? 'is-bottleneck' : ''} ${balancedBottleneck ? 'is-balanced-bottleneck' : ''} ${detail.conversionInvalid ? 'has-process-error' : ''} ${flash ? 'flash' : ''}" data-index="${index}" data-process-key="${escapeHtml(processKey)}" ${processOpen ? 'open' : ''}>
        <summary class="process-card-summary">
          <span class="process-summary-order">P${String(index + 1).padStart(2, '0')}</span>
          <span class="process-summary-title">
            <span class="process-summary-name-line">
              <span class="process-summary-tags process-summary-tags-left"><span class="${batchProcess ? 'batch-badge' : 'process-type-badge'}">${batchProcess ? `Batch / Chamber · ${format(processPercent, 0)}%` : conversionProcess ? 'Panel conversion' : 'Regular'}</span></span>
              <strong data-live="processName">${escapeHtml(item.name)}</strong>
              <span class="process-summary-tags process-summary-tags-right">
                ${conversionProcess ? detail.conversionActive
                  ? `<span class="conversion-badge">${escapeHtml(item.inputUnitName || `${item.outputUnitName || 'PCB'} Panel`)} → ${escapeHtml(item.outputUnitName || line.outputUnitName)} ×${conversionMultiplier}</span>`
                  : '<span class="conversion-badge is-error">Wrong · depaneling inactive</span>' : ''}
                <span class="bottleneck-badge ${balancedBottleneck ? 'is-balanced' : ''}" data-live="bottleneckBadge" ${bottleneck ? '' : 'hidden'}>Bottleneck</span>
              </span>
            </span>
          </span>
          <span class="process-summary-metrics">
            <span class="process-summary-metric ${balancedBottleneck ? 'is-balanced-bottleneck' : bottleneck ? 'is-critical' : ''}" data-cycle-highlight><small>${batchProcess ? 'Batch duration' : 'Cycle'}</small><b data-live="cycle">${batchProcess ? formatBatchDuration(item.batchDurationHours) : `${format(detail.cycle, 1)} sec`}</b></span>
            <span class="process-summary-metric"><small>Capacity</small><b data-live="capacity">${format(detail.capacity, 0)} /h</b></span>
            <span class="process-summary-metric ${busyAttention ? 'is-warning' : ''}"><small>Busy time</small><b data-live="utilization">${format(detail.utilization * 100, 0)}% busy</b></span>
            <span class="process-summary-metric"><small>Queue before process</small><b data-live="queue">${queueSummary(queue, wait, detail.inputUnitName)}</b></span>
          </span>
          <span class="details-chevron" aria-hidden="true">⌄</span>
        </summary>
        <div class="details-panel process-card-panel">
        <div class="station-overview">
          <header class="station-section station-card-head">
            <p class="station-section-label">Process details</p>
            <div class="process-title-row">
              <input class="name-input" data-key="name" value="${escapeHtml(item.name)}" aria-label="Process name" />
              <div class="station-actions">
                <button data-action="up" aria-label="Move ${escapeHtml(item.name)} up" ${index === 0 ? 'disabled' : ''}>↑</button>
                <button data-action="down" aria-label="Move ${escapeHtml(item.name)} down" ${index === line.stations.length - 1 ? 'disabled' : ''}>↓</button>
                <button class="remove" data-action="delete" aria-label="Delete ${escapeHtml(item.name)}">×</button>
              </div>
            </div>
            <div class="process-badges">
              ${batchProcess ? `<span class="batch-badge">Batch / Chamber · ${format(processPercent, 0)}%</span>` : ''}
              ${conversionProcess ? detail.conversionActive
                ? `<span class="conversion-badge">${escapeHtml(item.inputUnitName || `${item.outputUnitName || 'PCB'} Panel`)} → ${escapeHtml(item.outputUnitName || line.outputUnitName)} ×${conversionMultiplier}</span>`
                : '<span class="conversion-badge is-error">Wrong · depaneling inactive</span>' : ''}
              <span class="bottleneck-badge ${balancedBottleneck ? 'is-balanced' : ''}" data-live="bottleneckBadge" ${bottleneck ? '' : 'hidden'}>Bottleneck</span>
            </div>
            <label class="process-type-label"><span>Process type</span><select data-key="processType" aria-label="Process type for ${escapeHtml(item.name)}"><option value="unit" ${batchProcess ? '' : 'selected'}>Regular process</option><option value="batch" ${batchProcess ? 'selected' : ''}>Batch / Chamber</option></select></label>
          </header>

          <section class="station-section performance-section" aria-label="Live performance">
            <p class="station-section-label">Live performance</p>
            <div class="station-kpis">
              <div data-kpi="cycle" data-cycle-highlight class="${balancedBottleneck ? 'is-balanced-bottleneck' : bottleneck ? 'is-critical' : ''}"><span>${batchProcess ? 'Batch duration' : 'Cycle'}</span><b data-live="cycle">${batchProcess ? formatBatchDuration(item.batchDurationHours) : `${format(detail.cycle, 1)} sec`}</b><small data-live="cycleDriver">${cycleDriverLabel(detail)}</small></div>
              <div data-kpi="capacity"><span>Capacity (${unitAbbreviation(line.outputUnitName)}/h)</span><b data-live="capacity">${format(detail.capacity, 0)} /h</b></div>
              <div data-kpi="busy" class="${busyAttention ? 'is-warning' : ''}"><span>Busy time</span><b data-live="utilization">${format(detail.utilization * 100, 0)}% busy</b></div>
              <div data-kpi="queue"><span>Queue before process</span><b data-live="queue">${queueSummary(queue, wait, detail.inputUnitName)}</b></div>
            </div>
          </section>

          <section class="station-section resources-section" aria-label="Assigned resources">
            <p class="station-section-label">Assigned resources</p>
            <div class="resource-pair">
              <div class="resource-control">
                <span class="resource-type">Operators</span><span class="resource-name">${batchProcess ? 'No dedicated operator' : 'Manual work resource'}</span>
                <small class="resource-status" data-live="operatorRequirement">${operatorRequirementText(item)}</small>
                <label class="resource-input-label"><span>Assigned count</span><input class="resource-number" data-key="operators" type="number" min="0" step="1" value="${item.operators}" aria-label="Assigned operators" ${!batchProcess && Number(item.manualTime) > 0 ? '' : 'disabled'} /></label>
              </div>
              <div class="resource-control">
                <span class="resource-type">${batchProcess ? 'Batch equipment' : 'Auto machines'}</span><span class="resource-name" data-live="equipmentName">${batchProcess || Number(item.machineTime) > 0 ? escapeHtml(item.equipmentName || (batchProcess ? 'Batch equipment' : 'Automatic machine')) : 'Not required'}</span>
                <small class="resource-status" data-live="machineRequirement">${machineRequirementText(item)}</small>
                <label class="resource-input-label"><span>Assigned count</span><input class="resource-number" data-key="equipment" type="number" min="0" step="1" value="${item.equipment}" aria-label="Assigned ${batchProcess ? 'batch equipment' : 'automatic machines'}" ${batchProcess || Number(item.machineTime) > 0 ? '' : 'disabled'} /></label>
              </div>
            </div>
          </section>
        </div>

          <section class="process-details">
            <div class="process-details-heading">${batchProcess ? 'Batch schedule and equipment settings' : conversionProcess ? 'Timing, equipment and panel conversion' : 'Timing, transfer and automatic machine'}</div>
            ${renderProcessSettings(item, detail)}
          </section>
        </div>
      </details>`;
  }).join('');
  $('stationEditor').querySelectorAll('button[data-action]').forEach(button => {
    button.onclick = handleStationAction;
  });
  $('stationEditor').querySelectorAll('.process-card-details').forEach(details => {
    bindProcessDetails(details, open => {
      const processKey = details.dataset.processKey;
      if (open) state.expandedProcessKeys.add(processKey);
      else state.expandedProcessKeys.delete(processKey);
      syncProcessToggleButton();
    });
  });
  syncProcessToggleButton();
}

function syncProcessToggleButton() {
  const button = $('toggleAllProcessesBtn');
  if (!button) return;
  const cards = [...$('stationEditor').querySelectorAll('.process-card-details')];
  const allExpanded = cards.length > 0 && cards.every(card => card.open);
  button.textContent = allExpanded ? 'Collapse all processes' : 'Expand all processes';
  button.setAttribute('aria-label', button.textContent);
  button.disabled = cards.length === 0;
}

function toggleAllProcesses() {
  const cards = [...$('stationEditor').querySelectorAll('.process-card-details')];
  const expand = cards.some(card => !card.open);
  cards.forEach(card => {
    if (card.open !== expand) card.querySelector('summary')?.click();
  });
  setTimeout(syncProcessToggleButton, 380);
}

function helpNumberField(label, key, value, min, step, help, max = null) {
  const maxAttribute = Number.isFinite(max) ? ` max="${max}"` : '';
  return `<label>${label}<input data-key="${key}" type="number" min="${min}"${maxAttribute} step="${step}" value="${value}" /><em>${help}</em></label>`;
}

function renderProcessSettings(item, detail = {}) {
  const inputUnitName = detail.inputUnitName || 'product';
  const inputUnitPlural = unitLabel(inputUnitName);
  if (isBatchProcess(item)) {
    return `<div class="settings-body batch-settings-body">
      <section class="settings-group batch-settings-group">
        <div class="batch-settings-heading">
          <h4>Batch process and equipment</h4>
          <p class="machine-requirement" data-live="machineRequirementSettings">${machineRequirementText(item)}</p>
        </div>
        <div class="batch-settings-grid">
          ${helpNumberField('Batch duration (hours)', 'batchDurationHours', item.batchDurationHours, .1, .1, `Elapsed time for every ${inputUnitName} inside the batch.`)}
          ${helpNumberField(`${inputUnitPlural} per batch`, 'batchCapacity', item.batchCapacity, 1, 1, `Maximum ${inputUnitPlural} handled together in one batch run.`)}
          ${helpNumberField('Products processed (%)', 'batchProcessPercent', Math.max(1, Math.min(100, Number(item.batchProcessPercent) || 100)), 1, 1, `100% sends every ${inputUnitName} through this process. A lower percentage selects an evenly distributed sample; all other ${inputUnitPlural} bypass without waiting for the batch.`, 100)}
          ${helpNumberField('Transfer time', 'transferTime', item.transferTime, 0, .1, 'Seconds to move the completed batch to the next process.')}
          <label>Batch equipment name<input data-key="equipmentName" type="text" value="${escapeHtml(item.equipmentName || 'Batch equipment')}" /></label>
          <label>Start rule<select data-key="batchStartMode"><option value="scheduled" ${item.batchStartMode === 'scheduled' ? 'selected' : ''}>Scheduled time only</option><option value="full" ${item.batchStartMode === 'full' ? 'selected' : ''}>When batch is full</option><option value="full-or-schedule" ${item.batchStartMode === 'full-or-schedule' ? 'selected' : ''}>Full or scheduled time</option></select></label>
          <label>Scheduled start times<input data-key="batchStartTimes" type="text" value="${escapeHtml(item.batchStartTimes || '')}" placeholder="08:00, 20:00" ${item.batchStartMode === 'full' ? 'disabled' : ''} /><em>Use 24-hour time. Separate multiple starts with commas.</em></label>
          <label class="checkbox-field"><span>Allow partial batch at schedule</span><input data-key="allowPartialBatch" type="checkbox" ${item.allowPartialBatch !== false ? 'checked' : ''} ${item.batchStartMode === 'full' ? 'disabled' : ''} /><em>Used only by scheduled rules. The final remaining ${inputUnitPlural} always run when no more can arrive.</em></label>
        </div>
      </section>
    </div>`;
  }
  const conversionMultiplier = Math.max(1, Math.floor(Number(item.outputMultiplier) || 1));
  const conversionProcess = item.conversionType === 'split';
  return `<div class="settings-body">
    <section class="settings-group">
      <h4>Process timing</h4>
      <div class="timing-grid">
        ${helpNumberField('Manual work', 'manualTime', item.manualTime, 0, 1, `Hands-on seconds required for one ${inputUnitName}.`)}
        ${helpNumberField('Machine time', 'machineTime', item.machineTime, 0, 1, `Automatic equipment seconds required for one ${inputUnitName}.`)}
        ${helpNumberField('Transfer time', 'transferTime', item.transferTime, 0, .1, `Seconds to move the ${inputUnitName} to the next process or finished output.`)}
      </div>
    </section>
    <section class="settings-group resource-settings-group">
      <h4>${conversionProcess ? 'Equipment and panel output' : 'Automatic machine'}</h4>
      <div class="resource-settings-grid">
        <p class="machine-requirement" data-live="machineRequirementSettings">${machineRequirementText(item)}</p>
        <label class="equipment-name-field">Machine name<input data-key="equipmentName" type="text" value="${escapeHtml(item.equipmentName || '')}" ${Number(item.machineTime) > 0 ? '' : 'disabled'} /><em>Required only when Machine time is above 0 seconds.</em></label>
        ${conversionProcess ? `<label class="conversion-output-field">Individual ${escapeHtml(item.outputUnitName || 'unit')} output per ${escapeHtml(item.inputUnitName || `${item.outputUnitName || 'PCB'} Panel`)}<input data-key="outputMultiplier" type="number" min="1" step="1" value="${conversionMultiplier}" /><em>One completed panel becomes this many finished ${escapeHtml(unitLabel(item.outputUnitName || 'unit'))}.</em></label>` : ''}
      </div>
    </section>
  </div>`;
}

function bindProcessDetails(details, onStateChange) {
  const summary = details.querySelector('summary');
  const panel = details.querySelector('.details-panel');
  if (!summary || !panel) return;
  summary.setAttribute('aria-expanded', String(details.open));
  summary.addEventListener('click', event => {
    event.preventDefault();
    if (details.dataset.animating === 'true') return;
    const opening = !details.open;
    let finished = false;
    details.dataset.animating = 'true';

    if (opening) {
      details.open = true;
      panel.style.height = '0px';
      panel.style.opacity = '0';
    } else {
      panel.style.height = `${panel.scrollHeight}px`;
      panel.style.opacity = '1';
    }

    panel.getBoundingClientRect();
    requestAnimationFrame(() => {
      panel.style.height = opening ? `${panel.scrollHeight}px` : '0px';
      panel.style.opacity = opening ? '1' : '0';
    });

    const finish = () => {
      if (finished) return;
      finished = true;
      if (!opening) details.open = false;
      panel.style.height = opening ? 'auto' : '';
      panel.style.opacity = '';
      summary.setAttribute('aria-expanded', String(opening));
      delete details.dataset.animating;
      if (typeof onStateChange === 'function') onStateChange(opening);
    };
    const onTransitionEnd = transitionEvent => {
      if (transitionEvent.propertyName !== 'height') return;
      panel.removeEventListener('transitionend', onTransitionEnd);
      finish();
    };
    panel.addEventListener('transitionend', onTransitionEnd);
    setTimeout(finish, 360);
  });
}

function updateLiveStationKpis() {
  const line = activeLine();
  const stats = statsFor(line);
  document.querySelectorAll('.station-card').forEach(card => {
    const index = Number(card.dataset.index);
    const detail = stats.details[index];
    if (!detail) return;
    const values = {
      cycle: isBatchProcess(detail) ? formatBatchDuration(detail.batchDurationHours) : `${format(detail.cycle, 1)} sec`,
      cycleDriver: cycleDriverLabel(detail),
      capacity: `${format(detail.capacity, 0)} /h`,
      utilization: `${format(detail.utilization * 100, 0)}% busy`,
      queue: queueSummary(line.runtime.buffers[index] || 0, waitingSeconds(line, stats, index), detail.inputUnitName)
    };
    Object.entries(values).forEach(([key, value]) => {
      card.querySelectorAll(`[data-live="${key}"]`).forEach(node => { node.textContent = value; });
    });
    const bottleneck = detail.id === stats.bottleneck?.id;
    const balancedBottleneck = bottleneck && stats.allProcessesBusy;
    card.classList.toggle('is-bottleneck', bottleneck);
    card.classList.toggle('is-balanced-bottleneck', balancedBottleneck);
    card.querySelectorAll('[data-cycle-highlight]').forEach(cycleKpi => {
      cycleKpi.classList.toggle('is-critical', bottleneck && !balancedBottleneck);
      cycleKpi.classList.toggle('is-balanced-bottleneck', balancedBottleneck);
    });
    card.querySelector('[data-kpi="busy"]')?.classList.toggle('is-warning', detail.utilization >= .85);
    card.querySelectorAll('[data-live="bottleneckBadge"]').forEach(badge => {
      badge.hidden = !bottleneck;
      badge.classList.toggle('is-balanced', balancedBottleneck);
    });
  });
}

function syncControls() {
  const line = activeLine();
  $('lineNameInput').value = line.name;
  $('availableInput').value = line.availableOperators;
  $('targetQtyInput').value = line.targetQty;
  $('shiftHoursInput').value = line.shiftHours;
  $('productTypeInput').value = productTypeMode(line);
  $('speedInput').value = state.speed;
  $('speedValue').textContent = `${format(state.speed, state.speed < 1 ? 1 : 0)}× real time`;
  $('zoomValue').textContent = `${Math.round(state.lineZoom * 100)}%`;
  $('zoomOutBtn').disabled = state.lineZoom <= .6;
  $('zoomInBtn').disabled = state.lineZoom >= 1.8;
  $('playBtn').textContent = state.playing ? 'Pause' : 'Play';
  $('dashboardPinBtn').textContent = state.dashboardPinned ? 'Unfreeze dashboard' : 'Freeze dashboard';
  $('dashboardPinBtn').setAttribute('aria-pressed', String(state.dashboardPinned));
  $('dashboardPinBtn').title = state.dashboardPinned
    ? 'Unfreeze the dashboard and process flow'
    : 'Freeze the dashboard and process flow at the top';
}

function renderSvg() {
  const line = activeLine();
  const stats = statsFor(line);
  const isMobile = window.innerWidth <= 720;
  const verticalLayout = state.presentation
    ? { height: 338, conveyorY: 260, equipmentY: 108, operatorY: 128, equipmentNameY: 174, resourceLabelY: 190 }
    : { height: 234, conveyorY: 178, equipmentY: 99, operatorY: 123, equipmentNameY: 146, resourceLabelY: 159 };
  const stageWidth = Math.max(320, svg.parentElement?.clientWidth || 0);
  const regularWidth = Math.max(1120, line.stations.length * 185 + 120);
  const presentationWidth = Math.max(1440, line.stations.length * 250 + 160);
  const width = Math.max(stageWidth, state.presentation ? presentationWidth : regularWidth);
  const height = verticalLayout.height;
  const baseScale = state.presentation ? (isMobile ? .9 : 1.05) : (isMobile ? .66 : 1);
  const displayScale = baseScale * state.lineZoom;
  const displayWidth = Math.round(width * displayScale);
  const displayHeight = Math.round(height * displayScale);
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.style.width = `${displayWidth}px`;
  svg.style.height = `${displayHeight}px`;
  svg.style.minWidth = `${displayWidth}px`;
  svg.innerHTML = `${svgDefs()}${renderDesktopLine(line, stats, width, height, verticalLayout)}`;
}

function changeLineZoom(delta) {
  state.lineZoom = Math.max(.6, Math.min(1.8, Math.round((state.lineZoom + delta) * 10) / 10));
  syncControls();
  renderSvg();
}

function svgDefs() {
  return `<defs>
    <marker id="flow-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0L10 5L0 10Z" fill="var(--line-strong)" /></marker>
    <pattern id="deck-grid" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="var(--line)" stroke-width=".45" opacity=".42" /></pattern>
  </defs>`;
}

function renderDesktopLine(line, stats, width, height, verticalLayout) {
  const conveyorY = verticalLayout.conveyorY;
  const left = 125;
  const right = width - 85;
  const spacing = line.stations.length > 1 ? (right - left) / (line.stations.length - 1) : 0;
  let markup = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#deck-grid)" opacity=".45" />
    <path d="M45 ${conveyorY}H${width - 45}" stroke="var(--line-strong)" stroke-width="3" marker-end="url(#flow-arrow)" />
    <path d="M45 ${conveyorY + 17}H${width - 55}" stroke="var(--line)" stroke-width="1" />`;

  line.stations.forEach((item, index) => {
    const x = line.stations.length > 1 ? left + index * spacing : width / 2;
    markup += desktopStation(item, stats.details[index], line, index, x, conveyorY, stats.bottleneck?.id === item.id, stats.allProcessesBusy, verticalLayout);
  });
  markup += desktopQueues(line, stats, conveyorY, left, spacing, width);
  markup += pipelineProducts(line, stats, width, conveyorY, left, spacing);
  return markup;
}

function desktopStation(item, detail, line, index, x, conveyorY, bottleneck, allProcessesBusy, verticalLayout) {
  const utilization = detail.utilization;
  const stopped = detail.capacity === 0;
  const balancedBottleneck = bottleneck && allProcessesBusy;
  const bottleneckColor = balancedBottleneck ? 'var(--orange)' : 'var(--red)';
  const batchProcess = isBatchProcess(item);
  const machineRequired = batchProcess || Number(item.machineTime) > 0;
  const equipmentName = machineRequired ? ((item.equipmentName || '').trim() || (batchProcess ? 'Batch equipment' : 'Automatic machine')) : 'Not required';
  const performanceText = batchProcess
    ? `${formatBatchDuration(item.batchDurationHours)} · ${Math.max(0, Number(item.batchCapacity) || 0)}/batch · ${format(detail.batchProcessPercent, 0)}%`
    : `${format(detail.cycle, 1)}s · ${format(detail.rawCapacity, 0)} ${unitAbbreviation(detail.inputUnitName)}/h`;
  return `<g class="station" transform="translate(${x} 0)">
    <path d="M0 76V${conveyorY - 16}" stroke="${bottleneck ? bottleneckColor : 'var(--line-strong)'}" stroke-width="1" />
    <rect x="-61" y="27" width="122" height="49" fill="var(--panel)" stroke="${bottleneck ? bottleneckColor : 'var(--line-strong)'}" stroke-width="${bottleneck ? 2 : 1}" />
    <text class="station-name" text-anchor="middle" y="49">${escapeHtml(shortName(item.name, 16))}</text>
    <text class="station-meta mono ${stopped ? '' : 'muted'}" text-anchor="middle" y="66">${stopped ? 'RESOURCE STOP' : performanceText}</text>
    ${bottleneck ? `<text class="bottleneck-label ${balancedBottleneck ? 'is-balanced' : ''}" text-anchor="middle" y="14">◆ BOTTLENECK</text>` : ''}
    <rect x="-61" y="81" width="122" height="3" fill="var(--line)" />
    <rect x="-61" y="81" width="${122 * utilization}" height="3" fill="${bottleneck ? bottleneckColor : 'var(--accent)'}" />
    ${equipmentGlyph(-57, verticalLayout.equipmentY, item, stopped)}
    ${stickmenSvg(35, verticalLayout.operatorY, item.operators, utilization, line.runtime.clock, Number(item.manualTime) > 0)}
    <text class="equipment-name-label" data-equipment-name="${index}" text-anchor="middle" x="-34" y="${verticalLayout.equipmentNameY}">${escapeHtml(shortName(equipmentName, 15))}</text>
    <text class="resource-label" text-anchor="middle" x="-34" y="${verticalLayout.resourceLabelY}">${batchProcess ? 'BATCH EQ' : 'AUTO MACH'} ×${machineRequired ? item.equipment : 0}</text>
    <text class="resource-label" text-anchor="middle" x="35" y="${verticalLayout.resourceLabelY}">OPS ×${Number(item.manualTime) > 0 ? item.operators : 0}</text>
  </g>`;
}

function desktopQueues(line, stats, conveyorY, left, spacing, width) {
  return line.runtime.buffers.map((queue, index) => {
    const count = Math.max(0, Math.floor(Number(queue) || 0));
    if (count === 0) return '';
    const processX = line.stations.length > 1 ? left + index * spacing : width / 2;
    const queueX = index === 0
      ? Math.max(25, processX - 82)
      : processX - Math.min(92, Math.max(68, spacing * .46));
    const labelX = queueX - (Math.min(count, 3) - 1) * 12.5;
    const destination = line.stations[index].name;
    const unitName = stats.details[index]?.inputUnitName || line.inputUnitName || 'product';
    return `<g data-queue-for="${index}" data-queue-count="${count}" data-queue-destination="${escapeHtml(destination)}">
      <title>${count} ${unitLabel(unitName, count)} waiting before ${escapeHtml(destination)}</title>
      ${queueStack(count, queueX, conveyorY - 17, false, unitName)}
      <text class="queue-label" text-anchor="middle" x="${labelX}" y="${conveyorY + 23}">×${count} ${unitLabelUpper(unitName, count)} WAITING</text>
    </g>`;
  }).join('');
}

function renderMobileLine(line, stats, width, height) {
  const flowX = 88;
  let markup = `<rect x="0" y="0" width="${width}" height="${height}" fill="url(#deck-grid)" opacity=".45" />
    <path d="M${flowX} 25V${height - 35}" stroke="var(--line-strong)" stroke-width="3" marker-end="url(#flow-arrow)" />`;
  line.stations.forEach((item, index) => {
    const y = 48 + index * 205;
    const detail = stats.details[index];
    const queue = line.runtime.buffers[index] || 0;
    const bottleneck = stats.bottleneck?.id === item.id;
    const balancedBottleneck = bottleneck && stats.allProcessesBusy;
    const bottleneckColor = balancedBottleneck ? 'var(--orange)' : 'var(--red)';
    const stopped = detail.capacity === 0;
    const batchProcess = isBatchProcess(item);
    const machineRequired = batchProcess || Number(item.machineTime) > 0;
    const stationMeta = batchProcess
      ? `${formatBatchDuration(item.batchDurationHours)} batch · ${Math.max(0, Number(item.batchCapacity) || 0)} ${unitLabel(detail.inputUnitName)}/batch · ${format(detail.batchProcessPercent, 0)}% processed · ${format(detail.utilization * 100, 0)}% used`
      : `${format(detail.cycle, 1)} sec · ${format(detail.rawCapacity, 0)} ${unitLabel(detail.inputUnitName)}/h · ${format(detail.utilization * 100, 0)}% used`;
    markup += `<g class="station" transform="translate(0 ${y})">
      <path d="M${flowX} 36H130" stroke="${bottleneck ? bottleneckColor : 'var(--line-strong)'}" />
      <rect x="130" y="0" width="260" height="72" fill="var(--panel)" stroke="${bottleneck ? bottleneckColor : 'var(--line-strong)'}" stroke-width="${bottleneck ? 2 : 1}" />
      <path d="M130 21H390" stroke="var(--line)" />
      <text class="station-name" x="143" y="45">${escapeHtml(shortName(item.name, 25))}</text>
      <text class="station-meta mono muted" x="143" y="62">${stopped ? 'RESOURCE STOP' : stationMeta}</text>
      ${bottleneck ? `<text class="bottleneck-label ${balancedBottleneck ? 'is-balanced' : ''}" x="143" y="15">◆ BOTTLENECK</text>` : `<text class="resource-label" x="143" y="15">PROCESS ${String(index + 1).padStart(2, '0')}</text>`}
      <rect x="130" y="77" width="260" height="3" fill="var(--line)" />
      <rect x="130" y="77" width="${260 * detail.utilization}" height="3" fill="${bottleneck ? bottleneckColor : 'var(--accent)'}" />
      ${equipmentGlyph(155, 112, item, stopped)}
      ${stickmenSvg(300, 135, item.operators, detail.utilization, line.runtime.clock, Number(item.manualTime) > 0)}
      <text class="resource-label" x="143" y="177">${machineRequired ? `${escapeHtml(shortName(item.equipmentName || (batchProcess ? 'Batch equipment' : 'Automatic machine'), 17))} ×${item.equipment}` : 'AUTO MACHINE NOT REQUIRED'}</text>
      <text class="resource-label" x="280" y="177">OPERATORS ×${Number(item.manualTime) > 0 ? item.operators : 0}</text>
      ${queue > 0 ? `${queueStack(queue, 63, 38, true, detail.inputUnitName)}<text class="queue-label" text-anchor="middle" x="57" y="91">${format(queue, 0)} ${unitLabelUpper(detail.inputUnitName, queue)} WAITING</text>` : ''}
    </g>`;
  });
  markup += movingProducts(line, stats, true, width, height, flowX);
  return markup;
}

function equipmentGlyph(x, y, item, stopped) {
  const machineRequired = isBatchProcess(item) || Number(item.machineTime) > 0;
  if (!machineRequired) return `<text class="resource-label" text-anchor="middle" x="${x + 23}" y="${y + 18}">NOT REQUIRED</text>`;
  if (Number(item.equipment) <= 0) return `<text class="resource-label" text-anchor="middle" x="${x + 23}" y="${y + 18}" fill="var(--red)">MACHINE MISSING</text>`;
  const color = stopped ? 'var(--red)' : 'var(--line-strong)';
  const count = Math.min(3, Math.max(1, item.equipment));
  const positions = Array.from({ length: count }, (_, index) => ({ x: index * 17, y: 0 }));
  const machines = positions.map((position, index) => `<g transform="translate(${position.x} ${position.y})">
    <rect x="0" y="0" width="15" height="30" fill="var(--panel-2)" stroke="${color}" />
    <rect x="3" y="5" width="9" height="7" fill="var(--paper)" stroke="${color}" />
    <circle cx="5" cy="18" r="1.2" fill="${stopped ? 'var(--red)' : 'var(--accent)'}" stroke="none" />
    <path d="M3 23H12M3 30V33M12 30V33" stroke="${color}" />
  </g>`).join('');
  const connectors = `<path d="M7 -7V0M7 -7H${7 + (count - 1) * 17}M${7 + (count - 1) * 17} -7V0" stroke="var(--accent)" fill="none" />`;
  return `<g transform="translate(${x} ${y})" stroke-width="1">${connectors}${machines}</g>`;
}

function stickmenSvg(centerX, baseY, count, utilization, clock, required = true) {
  if (!required) return `<text class="resource-label" text-anchor="middle" x="${centerX}" y="${baseY}">NOT REQUIRED</text>`;
  if (count <= 0) return `<text class="resource-label" text-anchor="middle" x="${centerX}" y="${baseY}" fill="var(--red)">OPERATOR MISSING</text>`;
  const visible = Math.min(4, count);
  const active = utilization >= .65;
  const stroke = active ? 'var(--ink)' : 'var(--muted)';
  const pose = active ? Math.sin(clock * .08) * 4 : 0;
  const figures = Array.from({ length: visible }, (_, index) => {
    const x = centerX - ((visible - 1) * 14) / 2 + index * 14;
    const y = baseY + (index % 2) * 14;
    return `<g transform="translate(${x} ${y})" stroke="${stroke}" fill="none" stroke-width="1.3" opacity="${active ? 1 : .62}">
      <circle cy="-10" r="5" />
      <path d="M0-5V12M0 12L-6 23M0 12L6 23M-8 ${1 + pose}L0 2L8 ${1 - pose}" />
    </g>`;
  }).join('');
  const connector = `<path d="M${centerX - 22} ${baseY - 31}H${centerX + 22}M${centerX} ${baseY - 31}V${baseY - 22}" stroke="var(--accent)" fill="none" />`;
  return connector + figures;
}

function productShape(x, y, scale = 1, opacity = 1, unitName = 'product') {
  const normalizedUnit = String(unitName || 'product').toLowerCase();
  if (normalizedUnit === 'pcb panel' || normalizedUnit === 'pcba panel') {
    const assembledPanel = normalizedUnit === 'pcba panel';
    const panelBoards = [[-17, -10], [2, -10], [-17, 1], [2, 1]].map(([boardX, boardY]) => `
      <g transform="translate(${boardX} ${boardY})">
        <rect width="15" height="9" rx=".6" fill="var(--panel)" stroke="var(--accent)" stroke-width=".65" />
        ${assembledPanel
          ? '<rect x="2" y="2" width="4" height="3" fill="var(--line-strong)" /><rect x="8" y="1.5" width="3" height="5" fill="var(--accent)" /><circle cx="12.5" cy="6.5" r="1" fill="var(--green)" />'
          : '<path d="M2 2H6V5H11M4 7V5H8" fill="none" stroke="var(--accent)" stroke-width=".65" /><circle cx="12" cy="2" r=".8" fill="var(--green)" />'}
      </g>`).join('');
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
      <rect x="-22" y="-14" width="44" height="28" rx="1" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2" />
      ${panelBoards}
      <path d="M0-12V12M-20 0H20" stroke="var(--line-strong)" stroke-width=".6" opacity=".75" />
    </g>`;
  }
  if (normalizedUnit === 'pcb' || normalizedUnit === 'pcba') {
    const components = normalizedUnit === 'pcba'
      ? '<rect x="-9" y="-5" width="7" height="5" fill="var(--line-strong)" /><rect x="2" y="-5" width="5" height="8" fill="var(--accent)" /><circle cx="-6" cy="5" r="2" fill="var(--green)" />'
      : '<path d="M-9-4H-2V2H7M-5 6V2H1" fill="none" stroke="var(--accent)" stroke-width="1" /><circle cx="8" cy="-5" r="1.5" fill="var(--green)" />';
    return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
      <rect x="-15" y="-9" width="30" height="18" rx="1" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width="1.2" />
      ${components}
    </g>`;
  }
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <path d="M-18-9H12L18-3V10H-18Z" fill="var(--panel-2)" stroke="var(--accent)" stroke-width="1.2" />
    <path d="M12-9V-3H18" fill="none" stroke="var(--line-strong)" stroke-width=".8" />
    <rect x="-13" y="-5" width="16" height="10" rx="1" fill="var(--paper)" stroke="var(--line-strong)" stroke-width=".8" />
    <path d="M-10 1L-6-2L-2 2L1-1" fill="none" stroke="var(--accent)" stroke-width="1" />
    <circle cx="10" cy="1" r="3" fill="var(--accent-soft)" stroke="var(--accent)" stroke-width=".8" />
    <path d="M6 7H14M-14 10V13M12 10V13" stroke="var(--line-strong)" stroke-width="1.2" />
  </g>`;
}

function processingProgressRing(x, y, progress, radius = 25) {
  const completion = Math.max(0, Math.min(1, progress)) * 100;
  return `<circle class="processing-ring-track" cx="${x}" cy="${y}" r="${radius}" />
    <circle class="processing-ring-progress" cx="${x}" cy="${y}" r="${radius}" pathLength="100" stroke-dasharray="${completion} ${100 - completion}" transform="rotate(-90 ${x} ${y})" />`;
}

function pipelineProducts(line, stats, width, conveyorY, left, spacing) {
  const runtime = line.runtime;
  if (!runtime?.stationStates?.length) return '';
  let markup = '';

  runtime.stationStates.forEach((stationState, stationIndex) => {
    const activeBatches = stationState.activeBatches || [];
    if (activeBatches.length) {
      const products = activeBatches.flatMap(batch => batch.products || []);
      if (!products.length) return;
      const x = line.stations.length > 1 ? left + stationIndex * spacing : width / 2;
      const progress = activeBatches.reduce((sum, batch) => sum + Math.max(0, Math.min(1, 1 - batch.remaining / batch.total)), 0) / activeBatches.length;
      const product = products[0];
      const unitName = product.unitName || stats.details[stationIndex]?.inputUnitName || 'product';
      markup += `<g data-product-state="batch-processing" data-station="${escapeHtml(line.stations[stationIndex].name)}" data-station-index="${stationIndex}" data-batch-size="${products.length}" data-serial="${product.serial}" data-visited="${product.history.join(',')}">
        <title>Batch of ${products.length} ${unitLabel(unitName, products.length)} in ${activeBatches.length} active batch ${activeBatches.length === 1 ? 'run' : 'runs'} at ${escapeHtml(line.stations[stationIndex].name)}</title>
        ${processingProgressRing(x, conveyorY, progress, 27)}
        ${productShape(x, conveyorY, .92, 1, unitName)}
        <text class="product-status-label" text-anchor="middle" x="${x}" y="${conveyorY + 38}">${products.length} ${unitLabelUpper(unitName, products.length)} · BATCH ${stationIndex + 1}/${line.stations.length}</text>
      </g>`;
      return;
    }
    if (!stationState.current) return;
    const current = stationState.current;
    const x = line.stations.length > 1 ? left + stationIndex * spacing : width / 2;
    const progress = Math.max(0, Math.min(1, 1 - current.remaining / current.total));
    const product = current.product;
    const unitName = product.unitName || stats.details[stationIndex]?.inputUnitName || 'product';
    const displaySerial = productDisplaySerial(product);
    markup += `<g data-product-state="processing" data-station="${escapeHtml(line.stations[stationIndex].name)}" data-station-index="${stationIndex}" data-serial="${product.serial}" data-visited="${product.history.join(',')}">
      <title>${unitName} ${displaySerial} processing at ${escapeHtml(line.stations[stationIndex].name)} · process ${stationIndex + 1} of ${line.stations.length}</title>
      ${processingProgressRing(x, conveyorY, progress, 25)}
      ${productShape(x, conveyorY, .92, 1, unitName)}
      <text class="product-status-label" text-anchor="middle" x="${x}" y="${conveyorY + 38}">${unitLabelUpper(unitName, 1)} #${displaySerial} · STEP ${stationIndex + 1}/${line.stations.length}</text>
    </g>`;
  });

  runtime.transits.forEach(transit => {
    const fromX = line.stations.length > 1 ? left + transit.from * spacing : width / 2;
    const toX = transit.to >= line.stations.length ? width - 45 : left + transit.to * spacing;
    const progress = Math.max(0, Math.min(1, 1 - transit.remaining / transit.total));
    const x = fromX + (toX - fromX) * progress;
    const product = transit.product;
    const unitName = product.unitName || line.outputUnitName || 'product';
    const displaySerial = productDisplaySerial(product);
    markup += `<g data-product-state="${transit.bypassed ? 'batch-bypass' : 'transfer'}" data-station-index="${transit.from}" data-next-station-index="${transit.to}" data-serial="${product.serial}" data-visited="${product.history.join(',')}">
      <title>${unitName} ${displaySerial} ${transit.bypassed ? `bypassing sampled batch process ${transit.from + 1}` : `transferring from process ${transit.from + 1}`} to ${transit.to < line.stations.length ? `process ${transit.to + 1}` : 'finished output'}</title>
      ${productShape(x, conveyorY, .88, 1, unitName)}
      <text class="product-status-label transfer-status-label" text-anchor="middle" x="${x}" y="${conveyorY + 38}">${unitLabelUpper(unitName, 1)} #${displaySerial} · ${transit.bypassed ? 'BYPASS ' : ''}${transit.from + 1}→${transit.to < line.stations.length ? transit.to + 1 : 'OUT'}</text>
    </g>`;
  });
  return markup;
}

function queueStack(queue, x, y, mobile, unitName = 'product') {
  const wholeUnits = Math.floor(queue);
  const partial = queue - wholeUnits;
  const visible = Math.min(9, wholeUnits + (partial > .08 ? 1 : 0));
  let markup = '';
  for (let index = 0; index < visible; index += 1) {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const px = mobile ? x - column * 22 : x - column * 25;
    const py = mobile ? y + row * 16 : y - row * 17;
    const opacity = index === wholeUnits ? Math.max(.25, partial) : .92;
    markup += productShape(px, py, mobile ? .62 : .7, opacity, unitName);
  }
  if (wholeUnits > 9) {
    markup += `<text class="queue-label" text-anchor="middle" x="${mobile ? x - 22 : x - 25}" y="${mobile ? y + 60 : y - 55}">+${wholeUnits - 9}</text>`;
  }
  return markup;
}

function resetActiveLine() {
  const line = activeLine();
  const template = LINE_TEMPLATES[line.templateKey] || LINE_TEMPLATES.hla;
  const replacement = createLine(line.name, template?.stations || DEFAULT_STATIONS, template);
  line.stations = replacement.stations;
  line.inputUnitName = replacement.inputUnitName;
  line.outputUnitName = replacement.outputUnitName;
  line.availableOperators = line.stations.reduce((sum, item) => sum + Math.max(0, Number(item.operators) || 0), 0);
  line.runtime = createRuntime(line.stations.length);
  refresh({ flash: true });
}

function uniqueLineName(preferredName) {
  const names = new Set(state.lines.map(line => line.name));
  if (!names.has(preferredName)) return preferredName;
  let suffix = 2;
  while (names.has(`${preferredName} ${suffix}`)) suffix += 1;
  return `${preferredName} ${suffix}`;
}

function setLineTemplateMenu(open) {
  const menu = $('lineTemplateMenu');
  const returnFocus = !open && menu.contains(document.activeElement);
  menu.hidden = !open;
  $('addLineBtn').setAttribute('aria-expanded', String(open));
  if (open) requestAnimationFrame(() => menu.querySelector('[data-line-template]')?.focus());
  else if (returnFocus) $('addLineBtn').focus();
}

function addLine(templateKey) {
  const template = LINE_TEMPLATES[templateKey] || LINE_TEMPLATES.scratch;
  const preferredName = templateKey === 'scratch'
    ? `Line ${state.lines.length + 1}`
    : templateKey === 'hlaChamberAging'
      ? 'HLA + Chamber & Aging'
      : template.label;
  const line = createLine(uniqueLineName(preferredName), template.stations, template);
  line.templateKey = templateKey;
  state.lines.push(line);
  state.activeLineId = line.id;
  setLineTemplateMenu(false);
  refresh({ flash: true });
}

function deleteActiveLine() {
  if (state.lines.length <= 1) return;
  const index = state.lines.findIndex(line => line.id === state.activeLineId);
  state.lines.splice(index, 1);
  state.activeLineId = state.lines[Math.max(0, index - 1)].id;
  refresh();
}

function setProcessTypeMenu(open) {
  const menu = $('processTypeMenu');
  const returnFocus = !open && menu.contains(document.activeElement);
  menu.hidden = !open;
  $('addProcessBtn').setAttribute('aria-expanded', String(open));
  if (open) requestAnimationFrame(() => menu.querySelector('[data-add-process-type]')?.focus());
  else if (returnFocus) $('addProcessBtn').focus();
}

function addProcess(processType = 'unit') {
  const line = activeLine();
  const batchProcess = processType === 'batch';
  if (processType === 'depanel') {
    const outputUnitName = line.outputUnitName === 'PCBA' ? 'PCBA' : 'PCB';
    line.inputUnitName = `${outputUnitName} Panel`;
    line.outputUnitName = outputUnitName;
    const existingConversion = line.stations.find(item => item.conversionType === 'split');
    if (existingConversion) {
      existingConversion.conversionEnabled = true;
      existingConversion.inputUnitName = `${outputUnitName} Panel`;
      existingConversion.outputUnitName = outputUnitName;
      existingConversion.outputMultiplier = Math.max(2, Math.floor(Number(existingConversion.outputMultiplier) || 4));
    } else {
      line.stations.push(depanelingProcess(outputUnitName));
    }
  } else if (batchProcess) {
    line.stations.push({
      id: `batch-${Date.now()}`,
      name: 'Batch Process',
      processType: 'batch',
      manualTime: 0,
      machineTime: 0,
      operators: 0,
      equipment: 1,
      equipmentName: 'Batch equipment',
      transferTime: 3,
      batchDurationHours: 24,
      batchCapacity: 100,
      batchProcessPercent: 100,
      batchStartMode: 'scheduled',
      batchStartTimes: '08:00',
      allowPartialBatch: true
    });
  } else {
    line.stations.push({
      id: `process-${Date.now()}`,
      name: `Process ${line.stations.length + 1}`,
      processType: 'unit',
      manualTime: 30,
      machineTime: 20,
      operators: 1,
      equipment: 1,
      equipmentName: 'Automatic machine',
      transferTime: 3
    });
  }
  setProcessTypeMenu(false);
  line.runtime = createRuntime(line.stations.length);
  resizeRuntime(line);
  refresh({ flash: true });
}

function syncResourceRequirements(card, item) {
  const batchProcess = isBatchProcess(item);
  const operatorRequired = !batchProcess && Number(item.manualTime) > 0;
  const machineRequired = batchProcess || Number(item.machineTime) > 0;
  const operatorInput = card.querySelector('[data-key="operators"]');
  const machineInput = card.querySelector('[data-key="equipment"]');
  const machineNameInput = card.querySelector('[data-key="equipmentName"]');
  if (operatorInput) {
    operatorInput.disabled = !operatorRequired;
    operatorInput.value = item.operators;
  }
  if (machineInput) {
    machineInput.disabled = !machineRequired;
    machineInput.value = item.equipment;
  }
  if (machineNameInput) machineNameInput.disabled = !machineRequired;
  const operatorStatus = card.querySelector('[data-live="operatorRequirement"]');
  const machineStatuses = card.querySelectorAll('[data-live="machineRequirement"], [data-live="machineRequirementSettings"]');
  const equipmentName = card.querySelector('[data-live="equipmentName"]');
  if (operatorStatus) operatorStatus.textContent = operatorRequirementText(item);
  machineStatuses.forEach(status => { status.textContent = machineRequirementText(item); });
  if (equipmentName) equipmentName.textContent = machineRequired ? ((item.equipmentName || '').trim() || (batchProcess ? 'Batch equipment' : 'Automatic machine')) : 'Not required';
}

function handleStationAction(event) {
  const button = event.currentTarget?.matches?.('button') ? event.currentTarget : event.target.closest('button');
  const card = button?.closest('.station-card');
  if (!button || !card) return;
  const line = activeLine();
  const index = Number(card.dataset.index);
  const action = button.dataset.action;
  const resource = button.dataset.resource;
  if (action === 'increment' && resource) line.stations[index][resource] += 1;
  if (action === 'decrement' && resource) line.stations[index][resource] = Math.max(0, line.stations[index][resource] - 1);
  let structureChanged = false;
  if (action === 'up' && index > 0) { [line.stations[index - 1], line.stations[index]] = [line.stations[index], line.stations[index - 1]]; structureChanged = true; }
  if (action === 'down' && index < line.stations.length - 1) { [line.stations[index + 1], line.stations[index]] = [line.stations[index], line.stations[index + 1]]; structureChanged = true; }
  if (action === 'delete' && line.stations.length > 1) { line.stations.splice(index, 1); structureChanged = true; }
  if (structureChanged) line.runtime = createRuntime(line.stations.length);
  else resizeRuntime(line);
  refresh();
}

function handleStationInput(event) {
  const card = event.target.closest('.station-card');
  const key = event.target.dataset.key;
  if (!card || !key) return;
  const line = activeLine();
  const item = line.stations[Number(card.dataset.index)];
  if (key === 'processType') {
    const makeBatch = event.target.value === 'batch';
    item.processType = makeBatch ? 'batch' : 'unit';
    if (makeBatch) {
      item.manualTime = 0;
      item.machineTime = 0;
      item.operators = 0;
      item.equipment = Math.max(1, Number(item.equipment) || 0);
      item.equipmentName = (item.equipmentName || '').trim() || 'Batch equipment';
      item.batchDurationHours = Math.max(.1, Number(item.batchDurationHours) || 24);
      item.batchCapacity = Math.max(1, Math.floor(Number(item.batchCapacity) || 100));
      item.batchProcessPercent = Math.max(1, Math.min(100, Number(item.batchProcessPercent) || 100));
      item.batchStartMode = item.batchStartMode || 'scheduled';
      item.batchStartTimes = item.batchStartTimes || '08:00';
      item.allowPartialBatch = item.allowPartialBatch !== false;
    } else {
      item.manualTime = 30;
      item.machineTime = 20;
      item.operators = 1;
      item.equipment = 1;
      item.equipmentName = 'Automatic machine';
    }
    line.runtime = createRuntime(line.stations.length);
    refresh({ flash: true });
    return;
  }
  if (key === 'allowPartialBatch') item[key] = event.target.checked;
  else if (['name', 'equipmentName', 'batchStartMode', 'batchStartTimes'].includes(key)) item[key] = event.target.value;
  else item[key] = Math.max(0, Number(event.target.value) || 0);
  if (key === 'batchProcessPercent') {
    item.batchProcessPercent = Math.max(1, Math.min(100, item.batchProcessPercent));
    line.runtime = createRuntime(line.stations.length);
    refresh();
    return;
  }
  if (key === 'name') card.querySelectorAll('[data-live="processName"]').forEach(name => { name.textContent = item.name.trim() || 'Unnamed process'; });
  if (key === 'outputMultiplier') {
    item.outputMultiplier = Math.max(1, Math.floor(item.outputMultiplier));
    line.runtime = createRuntime(line.stations.length);
    const conversionDetail = statsFor(line).details[Number(card.dataset.index)];
    card.querySelectorAll('.conversion-badge').forEach(conversionBadge => {
      conversionBadge.classList.toggle('is-error', conversionDetail.conversionInvalid);
      conversionBadge.textContent = conversionDetail.conversionActive
        ? `${item.inputUnitName || `${item.outputUnitName || 'PCB'} Panel`} → ${item.outputUnitName || line.outputUnitName} ×${item.outputMultiplier}`
        : 'Wrong · depaneling inactive';
    });
    renderMetrics();
    renderLineTabs();
    renderSvg();
    return;
  }
  if (key === 'manualTime' && item.manualTime === 0) item.operators = 0;
  if (key === 'machineTime' && item.machineTime === 0 && !isBatchProcess(item)) item.equipment = 0;
  if (key === 'equipmentName') {
    const equipmentName = item.equipmentName.trim() || (isBatchProcess(item) ? 'Batch equipment' : 'Automatic machine');
    const liveName = card.querySelector('[data-live="equipmentName"]');
    if (liveName && (isBatchProcess(item) || Number(item.machineTime) > 0)) liveName.textContent = equipmentName;
  }
  if (key === 'batchStartMode') {
    line.runtime = createRuntime(line.stations.length);
    refresh();
    return;
  }
  syncResourceRequirements(card, item);
  renderMetrics();
  renderLineTabs();
  renderSvg();
}

function bindEvents() {
  bindProcessDetails($('lineControlsDetails'));
  bindProcessDetails($('processSettingsDetails'));
  $('lineTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-line-id]');
    if (!button) return;
    state.activeLineId = button.dataset.lineId;
    setLineTemplateMenu(false);
    refresh();
  });
  $('addLineBtn').addEventListener('click', () => setLineTemplateMenu($('lineTemplateMenu').hidden));
  $('lineTemplateMenu').addEventListener('click', event => {
    const button = event.target.closest('[data-line-template]');
    if (button) addLine(button.dataset.lineTemplate);
  });
  $('deleteLineBtn').addEventListener('click', deleteActiveLine);
  $('lineNameInput').addEventListener('change', event => {
    activeLine().name = event.target.value.trim() || 'Production Line';
    refresh({ editor: false });
  });
  $('availableInput').addEventListener('change', event => {
    activeLine().availableOperators = Math.max(0, Number(event.target.value) || 0);
    refresh({ editor: false });
  });
  $('productTypeInput').addEventListener('change', event => {
    applyProductType(activeLine(), event.target.value);
    refresh({ flash: true });
  });
  $('targetQtyInput').addEventListener('change', event => {
    const line = activeLine();
    line.targetQty = Math.max(1, Math.min(10000, Math.floor(Number(event.target.value) || 1)));
    event.target.value = line.targetQty;
    line.runtime = createRuntime(line.stations.length);
    refresh({ editor: false });
  });
  $('shiftHoursInput').addEventListener('change', event => {
    const line = activeLine();
    line.shiftHours = Math.max(.1, Math.min(24, Number(event.target.value) || 8));
    refresh({ editor: false });
  });
  $('speedInput').addEventListener('input', event => {
    state.speed = Number(event.target.value);
    syncControls();
  });
  $('playBtn').addEventListener('click', () => {
    state.playing = !state.playing;
    syncControls();
  });
  $('stepBtn').addEventListener('click', () => {
    state.lines.forEach(line => advanceLine(line, 60, 1));
    refresh({ editor: false });
  });
  $('hourBtn').addEventListener('click', () => {
    state.lines.forEach(line => advanceLine(line, 3600, 1));
    refresh({ editor: false });
  });
  $('dayBtn').addEventListener('click', () => {
    state.lines.forEach(line => advanceLine(line, 86400, 1));
    refresh({ editor: false });
  });
  $('clearQueueBtn').addEventListener('click', () => {
    activeLine().runtime = createRuntime(activeLine().stations.length);
    refresh({ editor: false });
  });
  $('zoomOutBtn').addEventListener('click', () => changeLineZoom(-.1));
  $('zoomInBtn').addEventListener('click', () => changeLineZoom(.1));
  $('resetBtn').addEventListener('click', resetActiveLine);
  $('dashboardPinBtn').addEventListener('click', () => {
    state.dashboardPinned = !state.dashboardPinned;
    document.body.classList.toggle('dashboard-unpinned', !state.dashboardPinned);
    syncControls();
  });
  $('revisionHistoryBtn').addEventListener('click', () => {
    const dialog = $('revisionHistoryDialog');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else dialog.setAttribute('open', '');
  });
  $('closeRevisionHistoryBtn').addEventListener('click', () => {
    const dialog = $('revisionHistoryDialog');
    if (typeof dialog.close === 'function') dialog.close();
    else dialog.removeAttribute('open');
  });
  $('presentationBtn').addEventListener('click', () => {
    state.presentation = !state.presentation;
    document.body.classList.toggle('presentation', state.presentation);
    $('presentationBtn').textContent = state.presentation ? 'Exit presentation' : 'Presentation';
    renderSvg();
  });
  $('addProcessBtn').addEventListener('click', () => setProcessTypeMenu($('processTypeMenu').hidden));
  $('toggleAllProcessesBtn').addEventListener('click', toggleAllProcesses);
  $('processTypeMenu').addEventListener('click', event => {
    const button = event.target.closest('[data-add-process-type]');
    if (button) addProcess(button.dataset.addProcessType);
  });
  $('stationEditor').addEventListener('input', handleStationInput);
  document.addEventListener('click', event => {
    if (!event.target.closest('.line-add-menu')) setLineTemplateMenu(false);
    if (!event.target.closest('.add-process-menu')) setProcessTypeMenu(false);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') {
      setLineTemplateMenu(false);
      setProcessTypeMenu(false);
    }
  });
  window.addEventListener('resize', renderSvg);
}

function animationLoop(time) {
  const delta = Math.min(.1, Math.max(0, (time - state.lastTime) / 1000));
  state.lastTime = time;
  if (state.playing) state.lines.forEach(line => advanceLine(line, delta, state.speed));
  renderSvg();
  if (time - state.lastUiUpdate > 250) {
    renderMetrics();
    renderLineTabs();
    state.lastUiUpdate = time;
  }
  requestAnimationFrame(animationLoop);
}

bindEvents();
refresh();
requestAnimationFrame(animationLoop);
})();
