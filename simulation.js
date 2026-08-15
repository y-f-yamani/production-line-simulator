(function () {
'use strict';

const DEFAULT_STATIONS = [
  station('assembly', 'Assembly', 60, 0, 3, 0, 'Automatic machine', 5),
  station('download', 'Software Download', 0, 40, 0, 1, 'Download rig', 4),
  station('calibration', 'Calibration', 35, 0, 1, 0, 'Automatic machine', 3.5),
  station('labeling', 'Labeling', 22, 0, 1, 0, 'Automatic machine', 2.2),
  station('testing', 'Testing', 10, 40, 2, 1, 'Test rack', 4.5),
  station('packaging', 'Packaging', 30, 0, 2, 0, 'Automatic machine', 1.5)
];

function station(id, name, manualTime, machineTime, operators, equipment, equipmentName, transferTime = 3) {
  return { id, name, processType: 'unit', manualTime, machineTime, operators, equipment, equipmentName, transferTime };
}

function batchStation(id, name, batchDurationHours, batchCapacity, equipment, equipmentName, batchStartTimes, transferTime = 3, batchStartMode = 'scheduled', allowPartialBatch = true) {
  return {
    id,
    name,
    processType: 'batch',
    manualTime: 0,
    machineTime: 0,
    operators: 0,
    equipment,
    equipmentName,
    transferTime,
    batchDurationHours,
    batchCapacity,
    batchProcessPercent: 100,
    batchStartMode,
    batchStartTimes,
    allowPartialBatch
  };
}

function depanelStation(id, name, manualTime, machineTime, operators, equipment, equipmentName, transferTime, unitsPerPanel, outputUnitName) {
  return {
    ...station(id, name, manualTime, machineTime, operators, equipment, equipmentName, transferTime),
    conversionType: 'split',
    outputMultiplier: unitsPerPanel,
    inputUnitName: `${outputUnitName} Panel`,
    outputUnitName
  };
}

const LINE_TEMPLATES = {
  scratch: {
    label: 'From scratch',
    description: 'One editable manual process',
    stations: [
      station('process-1', 'Process 1', 30, 0, 1, 0, 'Automatic machine', 3)
    ]
  },
  hla: {
    label: 'HLA',
    description: 'Balanced high-level assembly flow',
    stations: DEFAULT_STATIONS
  },
  hlaChamberAging: {
    label: 'HLA including Chamber and Aging Test',
    description: 'HLA with environmental and aging processes',
    stations: [
      station('assembly', 'Assembly', 60, 0, 3, 0, 'Automatic machine', 5),
      station('download', 'Software Download', 0, 40, 0, 1, 'Download rig', 4),
      station('calibration', 'Calibration', 35, 0, 1, 0, 'Automatic machine', 3.5),
      batchStation('chamber', 'Chamber Test', 24, 100, 1, 'Environmental chamber', '08:00', 5),
      batchStation('aging', 'Aging Test', 24, 100, 1, 'Aging chamber', '09:00', 5),
      station('labeling', 'Labeling', 22, 0, 1, 0, 'Automatic machine', 2.2),
      station('testing', 'Testing', 10, 40, 2, 1, 'Test rack', 4.5),
      station('packaging', 'Packaging', 30, 0, 2, 0, 'Automatic machine', 1.5)
    ]
  },
  pcb: {
    label: 'PCB · Panel to Individual',
    description: 'Production panels become individual PCBs at depaneling',
    inputUnitName: 'PCB Panel',
    outputUnitName: 'PCB',
    stations: [
      station('material-inspection', 'Material Inspection', 45, 0, 1, 0, 'Automatic machine', 4),
      station('imaging', 'Panel Imaging', 10, 50, 1, 1, 'Imaging machine', 4),
      station('etching', 'Panel Etching', 8, 60, 1, 1, 'Conveyor etching line', 5),
      station('drilling', 'Panel Drilling', 5, 45, 1, 1, 'CNC drill', 4),
      batchStation('panel-plating', 'Panel Plating', 1.5, 4, 2, 'Panel plating bath', '00:15, 02:15, 04:15, 06:15, 08:15, 10:15, 12:15, 14:15, 16:15, 18:15, 20:15, 22:15', 5, 'full-or-schedule', true),
      station('solder-mask', 'Solder Mask Print', 20, 50, 1, 1, 'Coating machine', 4),
      batchStation('solder-mask-cure', 'Solder Mask Cure', 1, 12, 1, 'Batch curing oven', '00:30, 02:30, 04:30, 06:30, 08:30, 10:30, 12:30, 14:30, 16:30, 18:30, 20:30, 22:30', 4, 'full-or-schedule', true),
      depanelStation('depaneling', 'Panel Depaneling', 15, 45, 1, 1, 'CNC depaneling router', 3, 4, 'PCB'),
      station('electrical-test', 'Electrical Test', 15, 60, 1, 1, 'Flying probe tester', 4),
      station('final-inspection', 'Final Inspection', 35, 0, 1, 0, 'Automatic machine', 3)
    ]
  },
  pcbIndividual: {
    label: 'PCB · Individual Finishing',
    description: 'Regular processes for already-depanelled individual PCBs',
    inputUnitName: 'PCB',
    outputUnitName: 'PCB',
    stations: [
      station('electrical-test', 'Electrical Test', 15, 60, 1, 1, 'Flying probe tester', 4),
      station('final-inspection', 'Final Inspection', 35, 0, 1, 0, 'Automatic machine', 3),
      station('packaging', 'PCB Packaging', 25, 0, 1, 0, 'Automatic machine', 2)
    ]
  },
  pcba: {
    label: 'PCBA · Panel to Individual',
    description: 'Assembly panels become individual PCBAs at depaneling',
    inputUnitName: 'PCBA Panel',
    outputUnitName: 'PCBA',
    stations: [
      station('paste-printing', 'Panel Paste Printing', 10, 30, 1, 1, 'Stencil printer', 3),
      station('placement', 'Panel Component Placement', 5, 45, 1, 1, 'Pick-and-place machine', 3),
      station('reflow', 'Panel Reflow Soldering', 5, 60, 1, 1, 'Conveyor reflow oven', 5),
      station('aoi', 'Panel AOI', 10, 40, 1, 1, 'AOI machine', 3),
      batchStation('burn-in', 'Panel Burn-in', 2, 24, 2, 'Burn-in rack', '00:30, 04:30, 08:30, 12:30, 16:30, 20:30', 5, 'full-or-schedule', true),
      depanelStation('depaneling', 'Panel Depaneling', 40, 0, 1, 0, 'Automatic machine', 3, 4, 'PCBA'),
      station('functional-test', 'Functional Test', 30, 50, 1, 1, 'Functional tester', 4),
      station('final-inspection', 'Final Inspection', 35, 0, 1, 0, 'Automatic machine', 3),
      station('packaging', 'Packaging', 25, 0, 1, 0, 'Automatic machine', 2)
    ]
  },
  pcbaIndividual: {
    label: 'PCBA · Individual Finishing',
    description: 'Regular processes for already-depanelled individual PCBAs',
    inputUnitName: 'PCBA',
    outputUnitName: 'PCBA',
    stations: [
      station('firmware-download', 'Firmware Download', 0, 40, 0, 1, 'Programming fixture', 4),
      station('functional-test', 'Functional Test', 30, 50, 1, 1, 'Functional tester', 4),
      station('final-inspection', 'Final Inspection', 35, 0, 1, 0, 'Automatic machine', 3),
      station('packaging', 'PCBA Packaging', 25, 0, 1, 0, 'Automatic machine', 2)
    ]
  }
};

function cloneStations(stations = DEFAULT_STATIONS) {
  return stations.map(item => ({ ...item }));
}

function createProduct(runtime, unitName = 'product', history = [], parentSerial = null, skippedProcesses = []) {
  if (!runtime.unitSerials) runtime.unitSerials = {};
  const unitKey = String(unitName || 'product').toLowerCase();
  const displaySerial = (runtime.unitSerials[unitKey] || 0) + 1;
  runtime.unitSerials[unitKey] = displaySerial;
  return { serial: runtime.nextSerial++, displaySerial, history: [...history], skippedProcesses: [...skippedProcesses], unitName, parentSerial };
}

function createRuntime(stationCount) {
  const runtime = {
    stationStates: Array.from({ length: stationCount }, () => ({ queue: [], current: null, activeBatches: [], lastScheduleEvent: -Infinity })),
    transits: [],
    buffers: Array(stationCount).fill(0),
    processed: Array(stationCount).fill(0),
    skipped: Array(stationCount).fill(0),
    lastProcessed: Array(stationCount).fill(0),
    completed: 0,
    completedProducts: [],
    clock: 0,
    nextSerial: 1,
    unitSerials: {},
    released: 0,
    convertedOutput: 0
  };
  runtime.buffers = runtime.stationStates.map(item => item.queue.length);
  return runtime;
}

function createLine(name = 'Line 1', stations = DEFAULT_STATIONS, options = {}) {
  const cloned = cloneStations(stations);
  const conversion = cloned.find(item => item.conversionType === 'split' || Math.max(1, Math.floor(Number(item.outputMultiplier) || 1)) > 1);
  return {
    id: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    stations: cloned,
    targetQty: 10,
    shiftHours: 8,
    inputUnitName: options.inputUnitName || conversion?.inputUnitName || 'product',
    outputUnitName: options.outputUnitName || conversion?.outputUnitName || 'product',
    availableOperators: cloned.reduce((sum, item) => sum + Math.max(0, Number(item.operators) || 0), 0),
    runtime: createRuntime(cloned.length)
  };
}

function lineOutputMultiplier(lineOrStations) {
  const stations = Array.isArray(lineOrStations) ? lineOrStations : lineOrStations.stations;
  if (Array.isArray(lineOrStations)) {
    return stations.reduce((multiplier, item) => multiplier * Math.max(1, Math.floor(Number(item.outputMultiplier) || 1)), 1);
  }
  let flowingUnitName = lineOrStations.inputUnitName || 'product';
  return stations.reduce((multiplier, item) => {
    const conversionActive = item.conversionType === 'split' && item.conversionEnabled !== false && (!item.inputUnitName || item.inputUnitName === flowingUnitName);
    if (!conversionActive) return multiplier;
    flowingUnitName = item.outputUnitName || lineOrStations.outputUnitName || 'product';
    return multiplier * Math.max(1, Math.floor(Number(item.outputMultiplier) || 1));
  }, 1);
}

function inputTargetQuantity(line) {
  const targetQty = Math.max(0, Math.floor(Number(line.targetQty) || 0));
  return Math.ceil(targetQty / lineOutputMultiplier(line));
}

function isBatchProcess(item) {
  return item?.processType === 'batch';
}

function parseBatchStartTimes(value) {
  const source = String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  const seconds = source.map(item => {
    const match = item.match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return NaN;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    return hours >= 0 && hours < 24 && minutes >= 0 && minutes < 60 ? hours * 3600 + minutes * 60 : NaN;
  }).filter(Number.isFinite);
  return [...new Set(seconds)].sort((a, b) => a - b);
}

function batchProcessPercent(item) {
  const value = Number(item?.batchProcessPercent);
  return Number.isFinite(value) ? Math.max(1, Math.min(100, value)) : 100;
}

function shouldProcessBatchSequence(sequenceNumber, item) {
  const percentage = batchProcessPercent(item);
  if (percentage >= 100) return true;
  const sequence = Math.max(1, Math.floor(Number(sequenceNumber) || 1));
  if (sequence === 1) return true;
  return Math.floor((sequence - 1) * percentage / 100) > Math.floor((sequence - 2) * percentage / 100);
}

function shouldProcessBatchProduct(product, item) {
  return shouldProcessBatchSequence(product?.displaySerial || product?.serial || 1, item);
}

function scheduledBatchStartsPerDay(item) {
  const duration = Math.max(0, Number(item.batchDurationHours) || 0) * 3600;
  const chambers = Math.max(0, Math.floor(Number(item.equipment) || 0));
  const startTimes = parseBatchStartTimes(item.batchStartTimes);
  if (duration <= 0 || chambers === 0 || startTimes.length === 0) return 0;

  const warmupDays = Math.max(14, Math.ceil(duration / 86400) * 3);
  const measuredDays = 90;
  const availableAt = Array(chambers).fill(-Infinity);
  let measuredStarts = 0;
  for (let day = 0; day < warmupDays + measuredDays; day += 1) {
    startTimes.forEach(secondsIntoDay => {
      const eventTime = day * 86400 + secondsIntoDay;
      availableAt.forEach((available, chamberIndex) => {
        if (available <= eventTime + 1e-9) {
          availableAt[chamberIndex] = eventTime + duration;
          if (day >= warmupDays) measuredStarts += 1;
        }
      });
    });
  }
  return measuredStarts / measuredDays;
}

function resourceTiming(item, shiftHours = 8) {
  if (isBatchProcess(item)) {
    const batchDurationSeconds = Math.max(0, Number(item.batchDurationHours) || 0) * 3600;
    const batchCapacity = Math.max(0, Math.floor(Number(item.batchCapacity) || 0));
    const assignedEquipment = Math.max(0, Math.floor(Number(item.equipment) || 0));
    const productiveHours = Math.max(.1, Number(shiftHours) || 8);
    const processPercent = batchProcessPercent(item);
    const processRatio = processPercent / 100;
    const startMode = item.batchStartMode || 'scheduled';
    const batchStartsPerDay = startMode === 'scheduled'
      ? scheduledBatchStartsPerDay(item)
      : batchDurationSeconds > 0 ? assignedEquipment * 86400 / batchDurationSeconds : 0;
    const dailyCapacity = batchCapacity * batchStartsPerDay;
    const effectiveDailyCapacity = dailyCapacity / processRatio;
    const capacity = effectiveDailyCapacity / productiveHours;
    const cycle = capacity > 0 ? 3600 / capacity : Infinity;
    const missingMachine = assignedEquipment === 0;
    const settingsValid = batchDurationSeconds > 0 && batchCapacity > 0 && (startMode !== 'scheduled' || parseBatchStartTimes(item.batchStartTimes).length > 0);
    return {
      manualSeconds: 0,
      machineSeconds: batchDurationSeconds,
      assignedOperators: 0,
      assignedEquipment,
      operatorRequired: false,
      machineRequired: true,
      missingOperator: false,
      missingMachine,
      manualCycle: 0,
      machineCycle: cycle,
      cycle,
      cycleDriver: missingMachine ? 'machine-missing' : settingsValid ? 'batch' : 'batch-settings-missing',
      batchDurationSeconds,
      batchCapacity,
      batchProcessPercent: processPercent,
      batchProcessRatio: processRatio,
      batchStartsPerDay,
      dailyCapacity,
      effectiveDailyCapacity
    };
  }

  const manualSeconds = Math.max(0, Number(item.manualTime) || 0);
  const machineSeconds = Math.max(0, Number(item.machineTime) || 0);
  const assignedOperators = Math.max(0, Number(item.operators) || 0);
  const assignedEquipment = Math.max(0, Number(item.equipment) || 0);
  const operatorRequired = manualSeconds > 0;
  const machineRequired = machineSeconds > 0;
  const missingOperator = operatorRequired && assignedOperators === 0;
  const missingMachine = machineRequired && assignedEquipment === 0;
  const manualCycle = missingOperator ? Infinity : operatorRequired ? manualSeconds / assignedOperators : 0;
  const machineCycle = missingMachine ? Infinity : machineRequired ? machineSeconds / assignedEquipment : 0;
  const cycle = missingOperator || missingMachine ? Infinity : Math.max(.1, manualCycle, machineCycle);
  let cycleDriver = 'none';
  if (missingOperator && missingMachine) cycleDriver = 'operator-and-machine-missing';
  else if (missingOperator) cycleDriver = 'operator-missing';
  else if (missingMachine) cycleDriver = 'machine-missing';
  else if (manualCycle > machineCycle) cycleDriver = 'operator';
  else if (machineCycle > manualCycle) cycleDriver = 'machine';
  else if (manualCycle > 0) cycleDriver = 'balanced';
  return {
    manualSeconds,
    machineSeconds,
    assignedOperators,
    assignedEquipment,
    operatorRequired,
    machineRequired,
    manualCycle,
    machineCycle,
    cycle,
    cycleDriver
  };
}

function effectiveCycle(item, shiftHours = 8) {
  return resourceTiming(item, shiftHours).cycle;
}

function capacityPerHour(item, shiftHours = 8) {
  const cycle = effectiveCycle(item, shiftHours);
  return Number.isFinite(cycle) ? 3600 / cycle : 0;
}

function calculateLine(lineOrStations) {
  const line = Array.isArray(lineOrStations) ? { stations: lineOrStations, shiftHours: 8, inputUnitName: 'product', outputUnitName: 'product' } : lineOrStations;
  const stationInputUnits = [];
  const stationOutputUnits = [];
  const activeConversions = [];
  const invalidConversions = [];
  let flowingUnitName = line.inputUnitName || 'product';
  line.stations.forEach((item, index) => {
    stationInputUnits[index] = flowingUnitName;
    const conversionActive = item.conversionType === 'split' && item.conversionEnabled !== false && (!item.inputUnitName || item.inputUnitName === flowingUnitName);
    activeConversions[index] = conversionActive;
    invalidConversions[index] = item.conversionType === 'split' && !conversionActive;
    if (conversionActive) flowingUnitName = item.outputUnitName || line.outputUnitName || 'product';
    stationOutputUnits[index] = flowingUnitName;
  });
  const finishedUnitsPerInput = Array(line.stations.length).fill(1);
  let remainingMultiplier = 1;
  for (let index = line.stations.length - 1; index >= 0; index -= 1) {
    if (activeConversions[index]) remainingMultiplier *= Math.max(1, Math.floor(Number(line.stations[index].outputMultiplier) || 1));
    finishedUnitsPerInput[index] = remainingMultiplier;
  }
  const details = line.stations.map((item, index) => {
    const baseTiming = resourceTiming(item, line.shiftHours);
    const timing = invalidConversions[index]
      ? { ...baseTiming, cycle: Infinity, cycleDriver: 'conversion-inactive' }
      : baseTiming;
    const rawCapacity = Number.isFinite(timing.cycle) ? 3600 / timing.cycle : 0;
    const capacity = rawCapacity * finishedUnitsPerInput[index];
    return {
      ...item,
      ...timing,
      inputUnitName: stationInputUnits[index],
      flowingOutputUnitName: stationOutputUnits[index],
      conversionActive: activeConversions[index],
      conversionInvalid: invalidConversions[index],
      finishedUnitsPerInput: finishedUnitsPerInput[index],
      rawCapacity,
      capacity
    };
  });
  const slowestStation = details.length ? details.reduce((slowest, item) => item.capacity < slowest.capacity ? item : slowest, details[0]) : null;
  const throughput = slowestStation?.capacity || 0;
  const bottleneck = slowestStation;
  details.forEach(item => { item.utilization = item.capacity > 0 ? Math.min(1, throughput / item.capacity) : 0; });
  const allProcessesBusy = details.length > 0 && details.every(item => item.capacity > 0 && item.utilization >= .65);

  const totalOperators = line.stations.reduce((sum, item) => sum + Math.max(0, Number(item.operators) || 0), 0);
  const totalEquipment = line.stations.reduce((sum, item) => sum + Math.max(0, Number(item.equipment) || 0), 0);
  return {
    details,
    throughput,
    bottleneck,
    slowestStation,
    allProcessesBusy,
    totalOperators,
    totalEquipment
  };
}

function resizeRuntime(line) {
  const size = line.stations.length;
  if (!line.runtime?.stationStates || line.runtime.stationStates.length !== size) {
    line.runtime = createRuntime(size);
    return;
  }
  line.runtime.stationStates.forEach(state => {
    if (!Array.isArray(state.activeBatches)) state.activeBatches = [];
    if (!Number.isFinite(state.lastScheduleEvent)) state.lastScheduleEvent = -Infinity;
  });
  line.runtime.buffers = line.runtime.stationStates.map(item => item.queue.length);
  line.runtime.processed = Array.from({ length: size }, (_, index) => line.runtime.processed[index] || 0);
  line.runtime.skipped = Array.from({ length: size }, (_, index) => line.runtime.skipped?.[index] || 0);
  line.runtime.lastProcessed = Array.from({ length: size }, (_, index) => line.runtime.lastProcessed[index] || 0);
  if (!Number.isFinite(line.runtime.convertedOutput)) line.runtime.convertedOutput = 0;
  if (!line.runtime.unitSerials) line.runtime.unitSerials = {};
}

function transferDuration(detail) {
  return Math.max(0, Number(detail.transferTime) || 0);
}

function nextScheduledTime(item, afterTime, includeCurrent = true) {
  const startTimes = parseBatchStartTimes(item.batchStartTimes);
  if (startTimes.length === 0) return Infinity;
  const threshold = Math.max(0, Number(afterTime) || 0);
  const firstDay = Math.floor(threshold / 86400);
  for (let dayOffset = 0; dayOffset < 3; dayOffset += 1) {
    const day = firstDay + dayOffset;
    for (const secondsIntoDay of startTimes) {
      const eventTime = day * 86400 + secondsIntoDay;
      if (includeCurrent ? eventTime >= threshold - 1e-9 : eventTime > threshold + 1e-9) return eventTime;
    }
  }
  return Infinity;
}

function estimateBatchProcess(readyTimes, detail) {
  const outputs = Array(readyTimes.length).fill(Infinity);
  const duration = detail.batchDurationSeconds;
  const capacity = detail.batchCapacity;
  const chambers = Math.max(0, Math.floor(detail.assignedEquipment));
  const mode = detail.batchStartMode || 'scheduled';
  const allowPartial = detail.allowPartialBatch !== false;
  if (!(duration > 0) || capacity <= 0 || chambers <= 0) return outputs;

  const waiting = [];
  const availableAt = Array(chambers).fill(0);
  let arrivalIndex = 0;
  let assigned = 0;
  let currentTime = -1e-6;
  let nextSchedule = mode === 'full' ? Infinity : nextScheduledTime(detail, 0, true);
  let guard = 0;

  while (assigned < readyTimes.length && guard < readyTimes.length * 20 + 20000) {
    guard += 1;
    const nextArrival = arrivalIndex < readyTimes.length ? readyTimes[arrivalIndex] : Infinity;
    const finalPartialWaiting = mode !== 'scheduled' && arrivalIndex >= readyTimes.length && waiting.length > 0 && waiting.length < capacity;
    const canStartWithoutSchedule = mode !== 'scheduled' && (waiting.length >= capacity || finalPartialWaiting);
    const idleNow = availableAt.some(time => time <= currentTime + 1e-9);
    const nextAvailable = canStartWithoutSchedule && !idleNow
      ? Math.min(...availableAt.filter(time => time > currentTime + 1e-9))
      : Infinity;
    const candidate = Math.min(nextArrival, nextSchedule, nextAvailable);
    if (!Number.isFinite(candidate)) break;
    currentTime = candidate;

    while (arrivalIndex < readyTimes.length && readyTimes[arrivalIndex] <= currentTime + 1e-9) {
      waiting.push(arrivalIndex);
      arrivalIndex += 1;
    }

    const scheduleDue = Number.isFinite(nextSchedule) && Math.abs(nextSchedule - currentTime) < 1e-6;
    const mayStartFull = mode !== 'scheduled' || scheduleDue;
    const idleChamberIndexes = () => availableAt
      .map((time, index) => ({ time, index }))
      .filter(chamber => chamber.time <= currentTime + 1e-9)
      .map(chamber => chamber.index);

    if (mayStartFull) {
      let idle = idleChamberIndexes();
      while (idle.length && waiting.length >= capacity) {
        const chamberIndex = idle.shift();
        const products = waiting.splice(0, capacity);
        const completion = currentTime + duration;
        availableAt[chamberIndex] = completion;
        products.forEach(productIndex => { outputs[productIndex] = completion; });
        assigned += products.length;
        idle = idleChamberIndexes();
      }
    }

    const allProductsArrived = arrivalIndex >= readyTimes.length;
    const finalRemainderReady = mode !== 'scheduled' && allProductsArrived && waiting.length > 0 && waiting.length < capacity;
    const mayStartPartial = finalRemainderReady || (allowPartial && waiting.length > 0 && scheduleDue);
    if (mayStartPartial) {
      const chamberIndex = idleChamberIndexes()[0];
      if (chamberIndex !== undefined) {
        const products = waiting.splice(0, Math.min(capacity, waiting.length));
        const completion = currentTime + duration;
        availableAt[chamberIndex] = completion;
        products.forEach(productIndex => { outputs[productIndex] = completion; });
        assigned += products.length;
      }
    }

    if (scheduleDue) nextSchedule = nextScheduledTime(detail, currentTime, false);
    if (mode === 'scheduled' && allProductsArrived && waiting.length > 0 && !allowPartial && waiting.length < capacity) break;
  }
  return outputs;
}

function estimateSampledBatchProcess(readyTimes, detail) {
  if (batchProcessPercent(detail) >= 100) return estimateBatchProcess([...readyTimes].sort((a, b) => a - b), detail);
  const completionTimes = [...readyTimes];
  const sampledArrivals = [];
  readyTimes.forEach((readyTime, index) => {
    if (!shouldProcessBatchSequence(index + 1, detail)) return;
    sampledArrivals.push({ productIndex: index, readyTime });
  });
  sampledArrivals.sort((a, b) => a.readyTime - b.readyTime);
  const sampledCompletionTimes = estimateBatchProcess(sampledArrivals.map(arrival => arrival.readyTime), detail);
  sampledArrivals.forEach((arrival, sampleIndex) => {
    completionTimes[arrival.productIndex] = sampledCompletionTimes[sampleIndex];
  });
  return completionTimes;
}

function estimateBatchSeconds(line, suppliedDetails) {
  const targetQty = Math.max(0, Math.floor(Number(line.targetQty) || 0));
  const inputQty = inputTargetQuantity(line);
  const details = suppliedDetails || calculateLine(line).details;
  if (targetQty === 0 || details.length === 0) return 0;
  if (details.some(detail => detail.capacity <= 0 || !Number.isFinite(detail.cycle))) return Infinity;

  let completionTimes = Array(inputQty).fill(0);
  details.forEach((detail, stationIndex) => {
    const readyTimes = stationIndex === 0
      ? completionTimes
      : completionTimes.map(time => time + transferDuration(details[stationIndex - 1]));
    if (isBatchProcess(detail)) {
      completionTimes = estimateSampledBatchProcess(readyTimes, detail);
    } else {
      let previousCompletion = 0;
      completionTimes = [...readyTimes].sort((a, b) => a - b).map(readyTime => {
        const completion = Math.max(previousCompletion, readyTime) + detail.cycle;
        previousCompletion = completion;
        return completion;
      });
    }
    const outputMultiplier = Math.max(1, Math.floor(Number(detail.outputMultiplier) || 1));
    if (detail.conversionActive && outputMultiplier > 1) {
      completionTimes = completionTimes.flatMap(time => Array(outputMultiplier).fill(time)).slice(0, targetQty);
    }
  });
  const finalCompletion = Math.max(...completionTimes);
  return Number.isFinite(finalCompletion) ? finalCompletion + transferDuration(details[details.length - 1]) : Infinity;
}

function batchComplete(line) {
  const targetQty = Math.max(0, Math.floor(Number(line.targetQty) || 0));
  return targetQty === 0 || line.runtime.completed >= targetQty;
}

function scheduledEventBetween(item, startTime, endTime, lastEvent) {
  const startTimes = parseBatchStartTimes(item.batchStartTimes);
  if (startTimes.length === 0) return null;
  const firstDay = Math.floor(Math.max(0, startTime) / 86400);
  const lastDay = Math.floor(Math.max(0, endTime) / 86400);
  for (let day = firstDay; day <= lastDay; day += 1) {
    for (const secondsIntoDay of startTimes) {
      const eventTime = day * 86400 + secondsIntoDay;
      if (eventTime > lastEvent + 1e-9 && eventTime >= startTime - 1e-9 && eventTime <= endTime + 1e-9) return eventTime;
    }
  }
  return null;
}

function noMoreProductsCanReachStation(line, stationIndex) {
  const runtime = line.runtime;
  if (runtime.released < inputTargetQuantity(line)) return false;
  for (let index = 0; index < stationIndex; index += 1) {
    const state = runtime.stationStates[index];
    if (!state) continue;
    if (state.queue.length > 0 || state.current || (state.activeBatches || []).length > 0) return false;
  }
  return !runtime.transits.some(transit => transit.to <= stationIndex);
}

function startBatch(stationState, stationIndex, detail, productCount) {
  const products = stationState.queue.splice(0, productCount);
  products.forEach(product => product.history.push(stationIndex));
  stationState.activeBatches.push({ products, remaining: detail.batchDurationSeconds, total: detail.batchDurationSeconds });
}

function outputsAfterProcess(line, product, detail) {
  const multiplier = Math.max(1, Math.floor(Number(detail.outputMultiplier) || 1));
  if (!detail.conversionActive) return [product];
  const targetQty = Math.max(0, Math.floor(Number(line.targetQty) || 0));
  const remainingNeeded = Math.max(0, targetQty - line.runtime.convertedOutput);
  const outputCount = Math.min(multiplier, remainingNeeded);
  const unitName = detail.outputUnitName || line.outputUnitName || 'product';
  const outputs = Array.from({ length: outputCount }, () => createProduct(line.runtime, unitName, product.history, product.serial, product.skippedProcesses));
  line.runtime.convertedOutput += outputs.length;
  return outputs;
}

function routeProductToStation(line, product, stationIndex, stats) {
  const runtime = line.runtime;
  if (stationIndex >= line.stations.length) {
    runtime.completed += 1;
    runtime.completedProducts.push(product);
    if (runtime.completedProducts.length > 50) runtime.completedProducts.shift();
    return;
  }
  const detail = stats.details[stationIndex];
  if (isBatchProcess(detail) && !shouldProcessBatchProduct(product, detail)) {
    product.history.push(stationIndex);
    if (!Array.isArray(product.skippedProcesses)) product.skippedProcesses = [];
    product.skippedProcesses.push(stationIndex);
    runtime.skipped[stationIndex] += 1;
    const duration = transferDuration(detail);
    runtime.transits.push({ product, from: stationIndex, to: stationIndex + 1, remaining: duration, total: duration, bypassed: true });
    return;
  }
  runtime.stationStates[stationIndex].queue.push(product);
}

function simulateDiscreteStep(line, step, stats) {
  const runtime = line.runtime;
  const firstStation = runtime.stationStates[0];
  const firstDetail = stats.details[0];
  const targetQty = inputTargetQuantity(line);
  if (firstStation && isBatchProcess(firstDetail)) {
    while (runtime.released < targetQty) {
      routeProductToStation(line, createProduct(runtime, line.inputUnitName || 'product'), 0, stats);
      runtime.released += 1;
    }
  } else if (firstStation && !firstStation.current && firstStation.queue.length === 0 && runtime.released < targetQty) {
    routeProductToStation(line, createProduct(runtime, line.inputUnitName || 'product'), 0, stats);
    runtime.released += 1;
  }

  runtime.transits.forEach(transit => { transit.remaining -= step; });
  const arrived = runtime.transits.filter(transit => transit.remaining <= 0);
  runtime.transits = runtime.transits.filter(transit => transit.remaining > 0);
  arrived.forEach(transit => {
    routeProductToStation(line, transit.product, transit.to, stats);
  });

  runtime.stationStates.forEach((stationState, index) => {
    const detail = stats.details[index];
    if (isBatchProcess(detail)) {
      const mode = detail.batchStartMode || 'scheduled';
      const scheduleEnabled = mode !== 'full';
      const eventTime = scheduleEnabled
        ? scheduledEventBetween(detail, runtime.clock, runtime.clock + step, stationState.lastScheduleEvent)
        : null;
      const scheduleDue = eventTime !== null;
      if (scheduleDue) stationState.lastScheduleEvent = eventTime;
      const batchCapacity = detail.batchCapacity;
      const allowPartial = detail.allowPartialBatch !== false;
      let availableSlots = Math.max(0, detail.assignedEquipment - stationState.activeBatches.length);
      while (availableSlots > 0 && stationState.queue.length > 0 && detail.capacity > 0) {
        const fullBatchReady = stationState.queue.length >= batchCapacity;
        const fullStartAllowed = fullBatchReady && (mode !== 'scheduled' || scheduleDue);
        const scheduledPartialAllowed = scheduleEnabled && allowPartial && !fullBatchReady && scheduleDue;
        const finalPartialAllowed = mode !== 'scheduled' && !fullBatchReady && noMoreProductsCanReachStation(line, index);
        const partialStartAllowed = scheduledPartialAllowed || finalPartialAllowed;
        if (!fullStartAllowed && !partialStartAllowed) break;
        startBatch(stationState, index, detail, Math.min(batchCapacity, stationState.queue.length));
        availableSlots -= 1;
      }
      return;
    }
    if (!stationState.current && stationState.queue.length && detail?.capacity > 0) {
      const product = stationState.queue.shift();
      product.history.push(index);
      stationState.current = { product, remaining: detail.cycle, total: detail.cycle };
    }
  });

  runtime.lastProcessed.fill(0);
  runtime.stationStates.forEach((stationState, index) => {
    const detail = stats.details[index];
    if (isBatchProcess(detail)) {
      const completedBatches = [];
      stationState.activeBatches.forEach(batch => {
        if (Math.abs(batch.total - detail.batchDurationSeconds) > 1e-9) {
          const completedShare = Math.max(0, Math.min(1, 1 - batch.remaining / batch.total));
          batch.total = detail.batchDurationSeconds;
          batch.remaining = detail.batchDurationSeconds * (1 - completedShare);
        }
        batch.remaining -= step;
        runtime.lastProcessed[index] += batch.products.length;
        if (batch.remaining <= 0) completedBatches.push(batch);
      });
      if (completedBatches.length) {
        stationState.activeBatches = stationState.activeBatches.filter(batch => !completedBatches.includes(batch));
        completedBatches.forEach(batch => {
          runtime.processed[index] += batch.products.length;
          const duration = transferDuration(detail);
          batch.products.forEach(product => {
            outputsAfterProcess(line, product, detail).forEach(outputProduct => {
              runtime.transits.push({ product: outputProduct, from: index, to: index + 1, remaining: duration, total: duration });
            });
          });
        });
      }
      return;
    }
    if (!stationState.current) return;
    if (!detail || detail.capacity <= 0 || !Number.isFinite(detail.cycle)) return;
    if (Math.abs(stationState.current.total - detail.cycle) > 1e-9) {
      const completedShare = Math.max(0, Math.min(1, 1 - stationState.current.remaining / stationState.current.total));
      stationState.current.total = detail.cycle;
      stationState.current.remaining = detail.cycle * (1 - completedShare);
    }
    stationState.current.remaining -= step;
    runtime.lastProcessed[index] = 1;
    if (stationState.current.remaining <= 0) {
      runtime.processed[index] += 1;
      const duration = transferDuration(detail);
      outputsAfterProcess(line, stationState.current.product, detail).forEach(outputProduct => {
        runtime.transits.push({ product: outputProduct, from: index, to: index + 1, remaining: duration, total: duration });
      });
      stationState.current = null;
    }
  });

  runtime.buffers = runtime.stationStates.map(item => item.queue.length);
}

function advanceLine(line, seconds, speed) {
  resizeRuntime(line);
  const stats = calculateLine(line);
  const simulatedSeconds = Math.max(0, seconds) * Math.max(0, speed);
  let remaining = simulatedSeconds;
  const maximumStep = simulatedSeconds > 600 ? .25 : .1;
  while (remaining > 1e-9) {
    if (batchComplete(line)) break;
    const step = Math.min(maximumStep, remaining);
    simulateDiscreteStep(line, step, stats);
    line.runtime.clock += step;
    remaining -= step;
  }
  return stats;
}

window.ProductionModel = {
  DEFAULT_STATIONS,
  LINE_TEMPLATES,
  cloneStations,
  createRuntime,
  createLine,
  lineOutputMultiplier,
  inputTargetQuantity,
  resourceTiming,
  effectiveCycle,
  capacityPerHour,
  calculateLine,
  isBatchProcess,
  parseBatchStartTimes,
  batchProcessPercent,
  shouldProcessBatchSequence,
  resizeRuntime,
  transferDuration,
  estimateBatchSeconds,
  batchComplete,
  advanceLine
};
})();
