const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
const source = fs.readFileSync(path.join(__dirname, '..', 'simulation.js'), 'utf8');
new Function(source)();

const model = window.ProductionModel;

assert.deepEqual(Object.keys(model.LINE_TEMPLATES), ['scratch', 'hla', 'hlaChamberAging', 'pcb', 'pcbIndividual', 'pcba', 'pcbaIndividual']);
assert.deepEqual(
  Object.values(model.LINE_TEMPLATES).map(template => template.stations.length),
  [1, 6, 8, 10, 3, 9, 4]
);
for (const template of Object.values(model.LINE_TEMPLATES)) {
  const templateLine = model.createLine(template.label, template.stations, template);
  const assignedOperators = templateLine.stations.reduce((sum, item) => sum + item.operators, 0);
  assert.equal(templateLine.availableOperators, assignedOperators);
  assert.ok(model.calculateLine(templateLine).throughput > 0);
  templateLine.stations.forEach(item => {
    if (item.manualTime > 0) assert.ok(item.operators > 0);
    if (item.machineTime > 0) assert.ok(item.equipment > 0);
  });
}

const pcbTemplate = model.LINE_TEMPLATES.pcb;
const pcbBatchProcesses = pcbTemplate.stations.filter(model.isBatchProcess);
assert.deepEqual(pcbBatchProcesses.map(item => item.name), ['Panel Plating', 'Solder Mask Cure']);
assert.equal(pcbBatchProcesses[0].batchCapacity, 4);
assert.equal(pcbBatchProcesses[0].batchStartMode, 'full-or-schedule');
assert.equal(model.isBatchProcess(pcbTemplate.stations.find(item => item.id === 'etching')), false);

const pcbaTemplate = model.LINE_TEMPLATES.pcba;
const pcbaBatchProcesses = pcbaTemplate.stations.filter(model.isBatchProcess);
assert.deepEqual(pcbaBatchProcesses.map(item => item.name), ['Panel Burn-in']);
assert.equal(model.isBatchProcess(pcbaTemplate.stations.find(item => item.id === 'reflow')), false);
assert.equal(pcbaTemplate.stations.find(item => item.id === 'reflow').equipmentName, 'Conveyor reflow oven');
for (const template of [pcbTemplate, pcbaTemplate]) {
  const mixedLine = model.createLine(template.label, template.stations, template);
  assert.ok(Number.isFinite(model.estimateBatchSeconds(mixedLine)));
}

const pcbDepaneling = pcbTemplate.stations.find(item => item.id === 'depaneling');
assert.equal(pcbTemplate.inputUnitName, 'PCB Panel');
assert.equal(pcbTemplate.outputUnitName, 'PCB');
assert.equal(pcbDepaneling.outputMultiplier, 4);
assert.equal(pcbDepaneling.inputUnitName, 'PCB Panel');
assert.equal(pcbDepaneling.outputUnitName, 'PCB');

const pcbLine = model.createLine(pcbTemplate.label, pcbTemplate.stations, pcbTemplate);
pcbLine.targetQty = 10;
assert.equal(model.lineOutputMultiplier(pcbLine), 4);
assert.equal(model.inputTargetQuantity(pcbLine), 3);
const pcbStats = model.calculateLine(pcbLine);
const pcbDepanelDetail = pcbStats.details.find(item => item.id === 'depaneling');
assert.equal(pcbDepanelDetail.inputUnitName, 'PCB Panel');
assert.equal(pcbDepanelDetail.flowingOutputUnitName, 'PCB');
assert.equal(pcbDepanelDetail.finishedUnitsPerInput, 4);
assert.equal(pcbDepanelDetail.capacity, pcbDepanelDetail.rawCapacity * 4);
const pcbEstimate = model.estimateBatchSeconds(pcbLine, pcbStats.details);
assert.ok(Number.isFinite(pcbEstimate));
model.advanceLine(pcbLine, pcbEstimate + 60, 1);
assert.equal(pcbLine.runtime.released, 3);
assert.equal(pcbLine.runtime.completed, 10);
assert.equal(pcbLine.runtime.convertedOutput, 10);
assert.deepEqual(pcbLine.runtime.processed.slice(0, 8), Array(8).fill(3));
assert.deepEqual(pcbLine.runtime.processed.slice(8), Array(2).fill(10));
pcbLine.runtime.completedProducts.forEach(product => {
  assert.equal(product.unitName, 'PCB');
  assert.ok(product.parentSerial >= 1 && product.parentSerial <= 3);
  assert.deepEqual(product.history, Array.from({ length: 10 }, (_, index) => index));
});
assert.deepEqual(pcbLine.runtime.completedProducts.map(product => product.displaySerial), Array.from({ length: 10 }, (_, index) => index + 1));

const oneBoardPanelStation = { ...pcbDepaneling, outputMultiplier: 1 };
const oneBoardPanelLine = model.createLine('One-board panel', [oneBoardPanelStation], { inputUnitName: 'PCB Panel', outputUnitName: 'PCB' });
oneBoardPanelLine.targetQty = 1;
model.advanceLine(oneBoardPanelLine, 60, 1);
assert.equal(oneBoardPanelLine.runtime.completed, 1);
assert.equal(oneBoardPanelLine.runtime.completedProducts[0].unitName, 'PCB');

const inactiveConversionLine = model.createLine('Individual PCB flow', [{ ...pcbDepaneling, conversionEnabled: false }], { inputUnitName: 'PCB', outputUnitName: 'PCB' });
inactiveConversionLine.targetQty = 4;
assert.equal(model.lineOutputMultiplier(inactiveConversionLine), 1);
const inactiveConversionStats = model.calculateLine(inactiveConversionLine);
assert.equal(inactiveConversionStats.details[0].conversionActive, false);
assert.equal(inactiveConversionStats.details[0].conversionInvalid, true);
assert.equal(inactiveConversionStats.details[0].cycleDriver, 'conversion-inactive');
assert.equal(inactiveConversionStats.details[0].capacity, 0);
assert.equal(inactiveConversionStats.throughput, 0);
assert.equal(model.estimateBatchSeconds(inactiveConversionLine, inactiveConversionStats.details), Infinity);
model.advanceLine(inactiveConversionLine, 240, 1);
assert.equal(inactiveConversionLine.runtime.released, 1);
assert.equal(inactiveConversionLine.runtime.completed, 0);
assert.equal(inactiveConversionLine.runtime.stationStates[0].queue.length, 1);

for (const targetQty of [1, 4, 5, 10]) {
  const exactOutputLine = model.createLine('Exact panel output', [pcbDepaneling], { inputUnitName: 'PCB Panel', outputUnitName: 'PCB' });
  exactOutputLine.targetQty = targetQty;
  model.advanceLine(exactOutputLine, 600, 1);
  assert.equal(exactOutputLine.runtime.released, Math.ceil(targetQty / 4));
  assert.equal(exactOutputLine.runtime.completed, targetQty);
}

const pcbaDepaneling = pcbaTemplate.stations.find(item => item.id === 'depaneling');
assert.equal(pcbaTemplate.inputUnitName, 'PCBA Panel');
assert.equal(pcbaDepaneling.inputUnitName, 'PCBA Panel');
assert.equal(pcbaTemplate.outputUnitName, 'PCBA');
assert.equal(pcbaDepaneling.outputMultiplier, 4);
assert.equal(model.lineOutputMultiplier(pcbaTemplate.stations), 4);
assert.deepEqual(
  model.LINE_TEMPLATES.pcbaIndividual.stations.map(item => item.name),
  ['Firmware Download', 'Functional Test', 'Final Inspection', 'PCBA Packaging']
);
assert.equal(model.LINE_TEMPLATES.pcbaIndividual.stations[0].equipmentName, 'Programming fixture');
for (const template of [model.LINE_TEMPLATES.pcbIndividual, model.LINE_TEMPLATES.pcbaIndividual]) {
  const individualLine = model.createLine(template.label, template.stations, template);
  assert.equal(model.lineOutputMultiplier(individualLine), 1);
  assert.equal(model.inputTargetQuantity(individualLine), individualLine.targetQty);
  assert.equal(individualLine.inputUnitName, individualLine.outputUnitName);
}

function defaultLine() {
  const line = model.createLine();
  return { line, stats: model.calculateLine(line) };
}

const balanced = defaultLine();
assert.equal(balanced.stats.throughput, 90);
assert.equal(balanced.stats.bottleneck.name, 'Software Download');
assert.equal(balanced.stats.totalOperators, 9);
assert.deepEqual(balanced.line.stations.map(item => item.operators), [3, 0, 1, 1, 2, 2]);
assert.deepEqual(balanced.line.stations.map(item => item.equipment), [0, 1, 0, 0, 1, 0]);
assert.deepEqual(balanced.line.stations.map(item => item.transferTime), [5, 4, 3.5, 2.2, 4.5, 1.5]);

const highBusyLine = model.createLine('All processes at least 65% busy', [
  { ...model.DEFAULT_STATIONS[0], id: 'high-busy-40', manualTime: 40, machineTime: 0, operators: 1, equipment: 0 },
  { ...model.DEFAULT_STATIONS[0], id: 'high-busy-50', manualTime: 50, machineTime: 0, operators: 1, equipment: 0 }
]);
const highBusyStats = model.calculateLine(highBusyLine);
assert.deepEqual(highBusyStats.details.map(item => item.utilization), [.8, 1]);
assert.equal(highBusyStats.allProcessesBusy, true);

const lowBusyLine = model.createLine('One process below 65% busy', [
  { ...model.DEFAULT_STATIONS[0], id: 'low-busy-20', manualTime: 20, machineTime: 0, operators: 1, equipment: 0 },
  { ...model.DEFAULT_STATIONS[0], id: 'low-busy-50', manualTime: 50, machineTime: 0, operators: 1, equipment: 0 }
]);
const lowBusyStats = model.calculateLine(lowBusyLine);
assert.deepEqual(lowBusyStats.details.map(item => item.utilization), [.4, 1]);
assert.equal(lowBusyStats.allProcessesBusy, false);

const laborDominant = { manualTime: 60, machineTime: 20, operators: 1, equipment: 1 };
assert.equal(model.effectiveCycle(laborDominant), 60);
assert.equal(model.effectiveCycle({ ...laborDominant, operators: 2 }), 30);
assert.equal(model.effectiveCycle({ ...laborDominant, equipment: 2 }), 60);
assert.equal(model.resourceTiming(laborDominant).cycleDriver, 'operator');

const machineDominant = { manualTime: 20, machineTime: 60, operators: 1, equipment: 1 };
assert.equal(model.effectiveCycle(machineDominant), 60);
assert.equal(model.effectiveCycle({ ...machineDominant, equipment: 2 }), 30);
assert.equal(model.effectiveCycle({ ...machineDominant, operators: 2 }), 60);
assert.equal(model.resourceTiming(machineDominant).cycleDriver, 'machine');

const noMachineRequired = { manualTime: 40, machineTime: 0, operators: 1, equipment: 0 };
assert.equal(model.effectiveCycle(noMachineRequired), 40);
assert.equal(model.resourceTiming(noMachineRequired).machineRequired, false);
assert.equal(model.effectiveCycle({ manualTime: 10, machineTime: 30, operators: 1, equipment: 0 }), Infinity);
assert.equal(model.resourceTiming({ manualTime: 30, machineTime: 30, operators: 1, equipment: 1 }).cycleDriver, 'balanced');

const immediateFeed = defaultLine().line;
immediateFeed.targetQty = 3;
model.advanceLine(immediateFeed, 25, 1);
assert.equal(immediateFeed.runtime.processed[0], 1);
assert.equal(immediateFeed.runtime.released, 2);
assert.equal(immediateFeed.runtime.stationStates[0].current.product.serial, 2);

const running = defaultLine().line;
running.targetQty = 10;
running.shiftHours = 8;
const estimatedBatchSeconds = model.estimateBatchSeconds(running);
const estimatedProductionDays = estimatedBatchSeconds / (running.shiftHours * 3600);
assert.ok(Math.abs(estimatedBatchSeconds - 552.7) < 1e-9);
assert.ok(Math.abs(estimatedProductionDays - (552.7 / (8 * 3600))) < 1e-12);

const transferAudit = defaultLine().line;
const originalCapacity = model.calculateLine(transferAudit).throughput;
const originalBatchSeconds = model.estimateBatchSeconds(transferAudit);
transferAudit.stations[0].transferTime = 15;
assert.equal(model.calculateLine(transferAudit).throughput, originalCapacity);
assert.ok(Math.abs(model.estimateBatchSeconds(transferAudit) - originalBatchSeconds - 10) < 1e-9);
model.advanceLine(running, 1200, 1);
assert.equal(running.runtime.released, 10);
assert.equal(running.runtime.completed, 10);
assert.equal(running.runtime.nextSerial, 11);
assert.ok(Math.abs(running.runtime.clock - estimatedBatchSeconds) < 2);
const completedClock = running.runtime.clock;
model.advanceLine(running, 600, 1);
assert.equal(running.runtime.clock, completedClock);
const allProducts = [
  ...running.runtime.completedProducts,
  ...running.runtime.transits.map(item => item.product),
  ...running.runtime.stationStates.flatMap(item => [
    item.current?.product,
    ...item.queue,
    ...(item.activeBatches || []).flatMap(batch => batch.products)
  ]).filter(Boolean)
];
assert.equal(new Set(allProducts.map(item => item.serial)).size, 10);
for (const product of allProducts) {
  assert.equal(product.history.length, running.stations.length);
  product.history.forEach((stationIndex, historyIndex) => assert.equal(stationIndex, historyIndex));
}

const environmental = model.createLine('HLA + Chamber & Aging', model.LINE_TEMPLATES.hlaChamberAging.stations);
environmental.targetQty = 10;
const environmentalStats = model.calculateLine(environmental);
const [chamberDetail, agingDetail] = environmentalStats.details.filter(model.isBatchProcess);
assert.equal(chamberDetail.name, 'Chamber Test');
assert.equal(agingDetail.name, 'Aging Test');
assert.equal(chamberDetail.batchDurationSeconds, 24 * 3600);
assert.equal(chamberDetail.batchCapacity, 100);
assert.equal(chamberDetail.dailyCapacity, 100);
assert.equal(chamberDetail.capacity, 12.5);
assert.equal(environmentalStats.bottleneck.name, 'Chamber Test');
assert.deepEqual(model.parseBatchStartTimes('08:00, 20:30, bad'), [8 * 3600, 20 * 3600 + 30 * 60]);

const twoChambers = { ...environmental.stations[3], equipment: 2 };
const twoChamberTiming = model.resourceTiming(twoChambers, 8);
assert.equal(twoChamberTiming.dailyCapacity, 200);
assert.equal(model.capacityPerHour(twoChambers, 8), 25);

const environmentalEstimate = model.estimateBatchSeconds(environmental, environmentalStats.details);
assert.ok(Math.abs(environmentalEstimate - 205650.2) < 1e-9);
model.advanceLine(environmental, 58 * 3600, 1);
assert.equal(environmental.runtime.released, 10);
assert.equal(environmental.runtime.completed, 10);
assert.deepEqual(environmental.runtime.processed, Array(8).fill(10));
environmental.runtime.completedProducts.forEach(product => {
  assert.deepEqual(product.history, [0, 1, 2, 3, 4, 5, 6, 7]);
});

const fullRuleFeeder = {
  ...model.DEFAULT_STATIONS[0],
  id: 'full-rule-feeder',
  name: 'Full-rule feeder',
  manualTime: 20,
  machineTime: 0,
  operators: 1,
  equipment: 0,
  transferTime: 0
};
const fullRuleBatch = {
  ...pcbBatchProcesses[0],
  id: 'full-rule-batch',
  name: 'Full-rule batch',
  batchDurationHours: 1,
  batchCapacity: 3,
  equipment: 1,
  batchStartMode: 'full',
  batchStartTimes: '00:01',
  allowPartialBatch: true,
  transferTime: 0
};
const fullRuleScheduleAudit = model.createLine('Full ignores schedule', [fullRuleFeeder, fullRuleBatch]);
fullRuleScheduleAudit.targetQty = 3;
model.advanceLine(fullRuleScheduleAudit, 61, 1);
assert.equal(fullRuleScheduleAudit.runtime.stationStates[1].activeBatches.length, 1);
assert.equal(fullRuleScheduleAudit.runtime.stationStates[1].activeBatches[0].products.length, 3);

const finalPartialBatch = {
  ...fullRuleBatch,
  id: 'final-partial-batch',
  name: 'Final partial batch',
  batchDurationHours: .01,
  batchStartTimes: '08:00',
  allowPartialBatch: false
};
const finalPartialLine = model.createLine('Final partial batch', [finalPartialBatch]);
finalPartialLine.targetQty = 2;
const finalPartialEstimate = model.estimateBatchSeconds(finalPartialLine);
assert.ok(Number.isFinite(finalPartialEstimate));
assert.ok(finalPartialEstimate < 60);
model.advanceLine(finalPartialLine, .2, 1);
assert.equal(finalPartialLine.runtime.stationStates[0].activeBatches.length, 1);
assert.equal(finalPartialLine.runtime.stationStates[0].activeBatches[0].products.length, 2);
model.advanceLine(finalPartialLine, 40, 1);
assert.equal(finalPartialLine.runtime.completed, 2);

const downstreamFinalPartialLine = model.createLine('Downstream final partial batch', [
  { ...fullRuleFeeder, id: 'short-feeder', manualTime: 1 },
  { ...finalPartialBatch, id: 'downstream-final-partial' }
]);
downstreamFinalPartialLine.targetQty = 2;
model.advanceLine(downstreamFinalPartialLine, 1.5, 1);
assert.equal(downstreamFinalPartialLine.runtime.stationStates[1].activeBatches.length, 0);
model.advanceLine(downstreamFinalPartialLine, 1.5, 1);
assert.equal(downstreamFinalPartialLine.runtime.stationStates[1].activeBatches.length, 1);
assert.equal(downstreamFinalPartialLine.runtime.stationStates[1].activeBatches[0].products.length, 2);

const sampledBatch = {
  ...pcbBatchProcesses[0],
  id: 'sampled-batch',
  name: 'Sampled Batch Test',
  batchDurationHours: .01,
  batchCapacity: 10,
  equipment: 1,
  batchStartMode: 'full',
  batchStartTimes: '',
  batchProcessPercent: 40,
  transferTime: 0
};
assert.equal(model.batchProcessPercent(sampledBatch), 40);
assert.deepEqual(
  Array.from({ length: 10 }, (_, index) => index + 1).filter(sequence => model.shouldProcessBatchSequence(sequence, sampledBatch)),
  [1, 4, 6, 9]
);
const fullBatchTiming = model.resourceTiming({ ...sampledBatch, batchProcessPercent: 100 });
const sampledBatchTiming = model.resourceTiming(sampledBatch);
assert.equal(sampledBatchTiming.dailyCapacity, fullBatchTiming.dailyCapacity);
assert.equal(sampledBatchTiming.effectiveDailyCapacity, fullBatchTiming.dailyCapacity / .4);
assert.equal(model.capacityPerHour(sampledBatch), model.capacityPerHour({ ...sampledBatch, batchProcessPercent: 100 }) / .4);

const sampledBatchLine = model.createLine('Sampled batch routing', [
  { ...fullRuleFeeder, id: 'sample-feeder', manualTime: 1 },
  sampledBatch,
  { ...fullRuleFeeder, id: 'sample-finishing', name: 'Sample finishing', manualTime: 1 }
]);
sampledBatchLine.targetQty = 10;
const sampledEstimate = model.estimateBatchSeconds(sampledBatchLine);
assert.ok(Number.isFinite(sampledEstimate));
model.advanceLine(sampledBatchLine, sampledEstimate + 10, 1);
assert.equal(sampledBatchLine.runtime.released, 10);
assert.equal(sampledBatchLine.runtime.completed, 10);
assert.equal(sampledBatchLine.runtime.processed[1], 4);
assert.equal(sampledBatchLine.runtime.skipped[1], 6);
assert.equal(sampledBatchLine.runtime.completedProducts.filter(product => product.skippedProcesses.includes(1)).length, 6);
sampledBatchLine.runtime.completedProducts.forEach(product => assert.deepEqual(product.history, [0, 1, 2]));

console.log(JSON.stringify({
  lineTemplates: Object.keys(model.LINE_TEMPLATES),
  templateProcessCounts: Object.values(model.LINE_TEMPLATES).map(template => template.stations.length),
  defaultThroughput: balanced.stats.throughput,
  defaultBottleneck: balanced.stats.bottleneck.name,
  orangeBottleneckWhenAllProcessesAtLeast65PercentBusy: highBusyStats.allProcessesBusy,
  redBottleneckWhenAnyProcessBelow65PercentBusy: !lowBusyStats.allProcessesBusy,
  defaultOperatorAllocation: balanced.line.stations.map(item => item.operators),
  laborDominantCycle: model.effectiveCycle(laborDominant),
  laborCycleWithTwoOperators: model.effectiveCycle({ ...laborDominant, operators: 2 }),
  machineDominantCycle: model.effectiveCycle(machineDominant),
  machineCycleWithTwoMachines: model.effectiveCycle({ ...machineDominant, equipment: 2 }),
  zeroMachineTimeRequiresMachine: model.resourceTiming(noMachineRequired).machineRequired,
  targetQty: running.targetQty,
  released: running.runtime.released,
  completed: running.runtime.completed,
  simulatedCompletionSeconds: Number(running.runtime.clock.toFixed(1)),
  estimatedCompletionSeconds: estimatedBatchSeconds,
  estimatedProductionDays,
  productsTracked: allProducts.length,
  nextProductStartedImmediately: true,
  noSkippedProcesses: true,
  batchChamberModel: true,
  pcbBatchProcesses: pcbBatchProcesses.map(item => item.name),
  pcbaBatchProcesses: pcbaBatchProcesses.map(item => item.name),
  pcbTargetOutput: pcbLine.targetQty,
  pcbPanelsStarted: pcbLine.runtime.released,
  pcbIndividualOutput: pcbLine.runtime.completed,
  pcbOutputPerPanel: pcbDepaneling.outputMultiplier,
  oneBoardPanelIdentityConverted: true,
  inactiveDepanelingStopsLine: true,
  panelToIndividualConversion: true,
  individualFinishingTemplates: true,
  pcbaIndividualStartsWithFirmwareDownload: true,
  conveyorReflowRemainsRegular: true,
  scheduledBatchCompletionSeconds: environmentalEstimate,
  fullRuleIgnoresScheduledTime: true,
  finalIncompleteFullRuleBatchRuns: true,
  sampledBatchPercent: sampledBatch.batchProcessPercent,
  sampledProductsProcessed: sampledBatchLine.runtime.processed[1],
  sampledProductsBypassed: sampledBatchLine.runtime.skipped[1],
  sampledProductsKeepOrderedHistory: true
}));
