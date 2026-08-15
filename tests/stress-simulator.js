const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

global.window = {};
const source = fs.readFileSync(path.join(__dirname, '..', 'simulation.js'), 'utf8');
new Function(source)();

const model = window.ProductionModel;

function runToCompletion(line, extraSeconds = 5) {
  const estimate = model.estimateBatchSeconds(line);
  assert.ok(Number.isFinite(estimate), `${line.name}: completion estimate must be finite`);
  const startedAt = Date.now();
  model.advanceLine(line, estimate + extraSeconds, 1);
  const elapsedMs = Date.now() - startedAt;
  const timingTolerance = Math.max(2, line.stations.length * .25 + .5);
  assert.equal(line.runtime.completed, line.targetQty, `${line.name}: exact target must finish`);
  assert.equal(line.runtime.released, model.inputTargetQuantity(line), `${line.name}: input release quantity must be exact`);
  assert.ok(
    Math.abs(line.runtime.clock - estimate) <= timingTolerance,
    `${line.name}: discrete ${line.runtime.clock.toFixed(3)}s must match estimate ${estimate.toFixed(3)}s within ${timingTolerance}s engine resolution`
  );
  assert.equal(line.runtime.transits.length, 0, `${line.name}: no transfer may remain after completion`);
  line.runtime.stationStates.forEach((state, index) => {
    assert.equal(state.queue.length, 0, `${line.name}: process ${index + 1} queue must drain`);
    assert.equal(state.current, null, `${line.name}: process ${index + 1} must be idle after completion`);
    assert.equal(state.activeBatches.length, 0, `${line.name}: process ${index + 1} cannot retain an active batch`);
  });
  line.runtime.completedProducts.forEach(product => {
    assert.deepEqual(product.history, Array.from({ length: line.stations.length }, (_, index) => index));
  });
  return { estimate, elapsedMs };
}

// Formula matrix: the slower divided workload controls the regular-process cycle.
for (const manualTime of [0, 15, 60, 125.5]) {
  for (const machineTime of [0, 20, 80, 140.25]) {
    for (const operators of [0, 1, 2, 5]) {
      for (const equipment of [0, 1, 3]) {
        const item = { manualTime, machineTime, operators, equipment };
        const timing = model.resourceTiming(item);
        const missingOperator = manualTime > 0 && operators === 0;
        const missingMachine = machineTime > 0 && equipment === 0;
        if (missingOperator || missingMachine) {
          assert.equal(timing.cycle, Infinity);
          assert.equal(model.capacityPerHour(item), 0);
          continue;
        }
        const expected = Math.max(.1, manualTime > 0 ? manualTime / operators : 0, machineTime > 0 ? machineTime / equipment : 0);
        assert.ok(Math.abs(timing.cycle - expected) < 1e-12);
        assert.ok(Math.abs(model.capacityPerHour(item) - 3600 / expected) < 1e-9);
      }
    }
  }
}

// Line capacity, busy time, transfer, and missing-resource relationships.
const relationLine = model.createLine('Formula relationship audit', [
  { id: 'manual', name: 'Manual', processType: 'unit', manualTime: 90, machineTime: 0, operators: 3, equipment: 0, transferTime: 12 },
  { id: 'mixed', name: 'Mixed', processType: 'unit', manualTime: 20, machineTime: 45, operators: 1, equipment: 1, transferTime: 8 },
  { id: 'machine', name: 'Machine', processType: 'unit', manualTime: 0, machineTime: 60, operators: 0, equipment: 2, transferTime: 4 }
]);
const relationStats = model.calculateLine(relationLine);
assert.deepEqual(relationStats.details.map(item => item.cycle), [30, 45, 30]);
assert.deepEqual(relationStats.details.map(item => item.capacity), [120, 80, 120]);
assert.equal(relationStats.throughput, 80);
assert.equal(relationStats.bottleneck.name, 'Mixed');
assert.deepEqual(relationStats.details.map(item => item.utilization), [2 / 3, 1, 2 / 3]);
const relationEstimate = model.estimateBatchSeconds(relationLine);
relationLine.stations.forEach(item => { item.transferTime += 100; });
assert.equal(model.calculateLine(relationLine).throughput, 80);
assert.ok(Math.abs(model.estimateBatchSeconds(relationLine) - relationEstimate - 300) < 1e-9);
relationLine.stations[1].equipment = 0;
assert.equal(model.calculateLine(relationLine).throughput, 0);
assert.equal(model.estimateBatchSeconds(relationLine), Infinity);

// Maximum supported target on the default line: no products skip or duplicate a process.
const largeDefault = model.createLine('10,000-unit HLA stress');
largeDefault.targetQty = 10000;
const largeDefaultExpected = 192.7 + (largeDefault.targetQty - 1) * 40;
assert.ok(Math.abs(model.estimateBatchSeconds(largeDefault) - largeDefaultExpected) < 1e-9);
const largeDefaultRun = runToCompletion(largeDefault);
assert.deepEqual(largeDefault.runtime.processed, Array(largeDefault.stations.length).fill(10000));
assert.deepEqual(largeDefault.runtime.skipped, Array(largeDefault.stations.length).fill(0));
assert.ok(largeDefault.runtime.completedProducts.length <= 50, 'visual history must remain memory-bounded');

// A long editable line remains ordered and completes without expanding visual history indefinitely.
const longStations = Array.from({ length: 48 }, (_, index) => ({
  id: `long-${index}`,
  name: `Long process ${index + 1}`,
  processType: 'unit',
  manualTime: 2 + index % 5,
  machineTime: index % 3 === 0 ? 3 + index % 4 : 0,
  operators: 1,
  equipment: index % 3 === 0 ? 1 : 0,
  transferTime: index % 4
}));
const longLine = model.createLine('48-process stress', longStations);
longLine.targetQty = 2000;
const longRun = runToCompletion(longLine);
assert.deepEqual(longLine.runtime.processed, Array(longStations.length).fill(2000));

// Parallel batch equipment, final partial batches, and deterministic sample routing.
const batchBase = {
  id: 'batch',
  name: 'Parallel batch stress',
  processType: 'batch',
  manualTime: 0,
  machineTime: 0,
  operators: 0,
  equipment: 2,
  equipmentName: 'Batch equipment',
  transferTime: 0,
  batchDurationHours: .01,
  batchCapacity: 40,
  batchProcessPercent: 100,
  batchStartMode: 'full',
  batchStartTimes: '00:01',
  allowPartialBatch: false
};
const batchLine = model.createLine('1,000-unit parallel batch stress', [batchBase]);
batchLine.targetQty = 1000;
const batchRun = runToCompletion(batchLine);
assert.equal(batchLine.runtime.processed[0], 1000);
assert.equal(batchLine.runtime.skipped[0], 0);
assert.ok(Math.abs(batchRun.estimate - 13 * 36) < 1e-9);

const sampledLine = model.createLine('10,000-unit sampled batch stress', [{ ...batchBase, batchProcessPercent: 1, batchCapacity: 50 }]);
sampledLine.targetQty = 10000;
const sampledRun = runToCompletion(sampledLine);
assert.equal(sampledLine.runtime.processed[0], 100);
assert.equal(sampledLine.runtime.skipped[0], 9900);
assert.equal(sampledLine.runtime.processed[0] + sampledLine.runtime.skipped[0], sampledLine.targetQty);

const scheduledLine = model.createLine('Scheduled partial batch', [{
  ...batchBase,
  equipment: 1,
  batchCapacity: 20,
  batchStartMode: 'scheduled',
  batchStartTimes: '00:01',
  allowPartialBatch: true
}]);
scheduledLine.targetQty = 10;
const scheduledRun = runToCompletion(scheduledLine);
assert.ok(Math.abs(scheduledRun.estimate - 96) < 1e-9);

const scheduledNoPartial = model.createLine('Scheduled batch waits for quantity', [{
  ...batchBase,
  equipment: 1,
  batchCapacity: 20,
  batchStartMode: 'scheduled',
  batchStartTimes: '00:01',
  allowPartialBatch: false
}]);
scheduledNoPartial.targetQty = 10;
assert.equal(model.estimateBatchSeconds(scheduledNoPartial), Infinity);

// Panel-to-individual conversion keeps targets exact at the 10,000-unit limit.
const depanel = {
  id: 'depanel',
  name: 'Panel Depaneling',
  processType: 'unit',
  manualTime: 8,
  machineTime: 0,
  operators: 2,
  equipment: 0,
  transferTime: 0,
  conversionType: 'split',
  outputMultiplier: 4,
  inputUnitName: 'PCB Panel',
  outputUnitName: 'PCB'
};
const conversionLine = model.createLine('10,000-PCB conversion stress', [depanel], { inputUnitName: 'PCB Panel', outputUnitName: 'PCB' });
conversionLine.targetQty = 10000;
const conversionRun = runToCompletion(conversionLine);
assert.equal(conversionLine.runtime.released, 2500);
assert.equal(conversionLine.runtime.processed[0], 2500);
assert.equal(conversionLine.runtime.completed, 10000);
assert.equal(conversionLine.runtime.convertedOutput, 10000);

for (const templateKey of ['pcb', 'pcba']) {
  const template = model.LINE_TEMPLATES[templateKey];
  const mixedLine = model.createLine(`${templateKey.toUpperCase()} mixed-process stress`, template.stations, template);
  mixedLine.targetQty = 500;
  const mixedRun = runToCompletion(mixedLine, 10);
  assert.equal(mixedLine.runtime.completed, 500);
  assert.ok(mixedLine.runtime.processed.every(value => value > 0));
  assert.ok(mixedLine.runtime.skipped.every(value => value === 0));
  assert.ok(mixedRun.estimate > 0);
}

// Multiple line objects must remain completely independent.
const firstLine = model.createLine('Independent A');
const secondLine = model.createLine('Independent B');
firstLine.targetQty = 250;
secondLine.targetQty = 400;
model.advanceLine(firstLine, model.estimateBatchSeconds(firstLine) + 5, 1);
assert.equal(firstLine.runtime.completed, 250);
assert.equal(secondLine.runtime.completed, 0);
model.advanceLine(secondLine, model.estimateBatchSeconds(secondLine) + 5, 1);
assert.equal(secondLine.runtime.completed, 400);
assert.equal(firstLine.runtime.completed, 250);

console.log(JSON.stringify({
  formulaCombinations: 192,
  maximumTargetQty: largeDefault.targetQty,
  maximumTargetCompleted: largeDefault.runtime.completed,
  maximumTargetEstimateSeconds: largeDefaultRun.estimate,
  maximumTargetSimulationMs: largeDefaultRun.elapsedMs,
  longLineProcesses: longLine.stations.length,
  longLineTarget: longLine.targetQty,
  longLineSimulationMs: longRun.elapsedMs,
  batchTarget: batchLine.targetQty,
  batchSimulationMs: batchRun.elapsedMs,
  sampledBatchTarget: sampledLine.targetQty,
  sampledBatchProcessed: sampledLine.runtime.processed[0],
  sampledBatchBypassed: sampledLine.runtime.skipped[0],
  sampledBatchSimulationMs: sampledRun.elapsedMs,
  scheduledPartialCompletionSeconds: scheduledRun.estimate,
  conversionTarget: conversionLine.targetQty,
  conversionPanelsStarted: conversionLine.runtime.released,
  conversionSimulationMs: conversionRun.elapsedMs,
  mixedPcbAndPcbaStress: true,
  multiLineIsolation: true
}));
