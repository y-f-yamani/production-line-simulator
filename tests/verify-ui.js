const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const simulation = fs.readFileSync(path.join(root, 'simulation.js'), 'utf8');
const styles = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const bundle = fs.readFileSync(path.join(root, 'release', 'Production-Line-Simulator-V1.html'), 'utf8');
const windowsIconSvg = fs.readFileSync(path.join(root, 'assets', 'Production-Line-Simulator-Icon.svg'), 'utf8');
const windowsIconPng = fs.readFileSync(path.join(root, 'assets', 'Production-Line-Simulator-Icon.png'));
const windowsIconIco = fs.readFileSync(path.join(root, 'assets', 'Production-Line-Simulator-Icon.ico'));
const shortcutLauncher = fs.readFileSync(path.join(root, 'Create Desktop Shortcut.cmd'), 'utf8');
const shortcutScript = fs.readFileSync(path.join(root, 'scripts', 'create-desktop-shortcut.ps1'), 'utf8');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const idSet = new Set(ids);
assert.equal(idSet.size, ids.length, 'HTML IDs must be unique');

const appIdReferences = [...app.matchAll(/\$\('([^']+)'\)/g)].map(match => match[1]);
const missingIds = [...new Set(appIdReferences.filter(id => !idSet.has(id)))];
assert.deepEqual(missingIds, [], `Missing HTML IDs: ${missingIds.join(', ')}`);

assert.match(html, /id="targetQtyInput"/);
assert.match(html, /Time to finish target/);
assert.match(html, /id="completionTimeMetric"/);
assert.match(html, /id="completionTimeDetail"/);
assert.doesNotMatch(html, /Production days/);
assert.match(html, /id="productTypeInput"/);
assert.match(html, /id="productIdentityHelp"/);
assert.match(html, /<details class="control-block global-block settings-window line-controls-details" id="lineControlsDetails">/);
assert.match(html, /class="details-panel settings-window-panel line-controls-panel"/);
assert.match(html, /<details class="settings-window process-settings-details" id="processSettingsDetails">/);
assert.match(html, /class="details-panel settings-window-panel process-settings-panel"/);
assert.match(html, /id="toggleAllProcessesBtn"[^>]*>Expand all processes<\/button>/);
assert.match(html, /<ul class="busy-explainer">[\s\S]*?<li class="cycle-formula"><strong>Cycle time formula:<\/strong>[\s\S]*?max\(Manual work ÷ assigned operators, Machine time ÷ assigned automatic machines\)[\s\S]*?<li><strong>Batch \/ Chamber:<\/strong>[\s\S]*?<li><strong>Transfer time:<\/strong>[\s\S]*?<li><strong>Busy time:<\/strong>/);
assert.match(styles, /\.busy-explainer li\s*\{[^}]*color:\s*var\(--muted\)[^}]*font-family:\s*var\(--font\)/);
assert.match(styles, /\.busy-explainer code\s*\{[^}]*color:\s*inherit[^}]*font:\s*inherit/);
assert.deepEqual(
  [...html.matchAll(/<option value="(product|pcb|pcb-panel|pcba|pcba-panel)"/g)].map(match => match[1]),
  ['product', 'pcb', 'pcb-panel', 'pcba', 'pcba-panel']
);
assert.match(html, /Product type/);
assert.doesNotMatch(html, /Product flow/);
assert.match(html, /<title>Production Line Simulator V1\.1<\/title>/);
assert.match(html, /<meta name="application-name" content="Production Line Simulator V1\.1" \/>/);
assert.match(html, /<link rel="icon" type="image\/svg\+xml" sizes="any" href="data:image\/svg\+xml,[^"]*M12%2020H43L51%2028V45H12Z[^"]*" \/>/);
assert.match(windowsIconSvg, /viewBox="0 0 256 256"/);
assert.match(windowsIconSvg, /M52 80H172L204 112V180H52Z/);
assert.equal(windowsIconPng.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'Windows icon PNG must be valid');
assert.equal(windowsIconIco.readUInt16LE(0), 0, 'ICO reserved field must be zero');
assert.equal(windowsIconIco.readUInt16LE(2), 1, 'ICO image type must be icon');
assert.equal(windowsIconIco.readUInt16LE(4), 1, 'ICO must contain one image');
assert.match(shortcutLauncher, /scripts\\create-desktop-shortcut\.ps1/i);
assert.match(shortcutScript, /Production-Line-Simulator-V1\.html/);
assert.match(shortcutScript, /Production-Line-Simulator-Icon\.ico/);
assert.match(shortcutScript, /CreateShortcut/);
assert.match(shortcutScript, /IconLocation/);
assert.match(packageJson.scripts['build:windows-icon'], /build-windows-icon\.ps1/);
assert.match(packageJson.scripts['create:desktop-shortcut'], /create-desktop-shortcut\.ps1/);
assert.match(html, /<h1>Production Line Simulator V1\.1<\/h1>/);
assert.match(html, /Interactive manufacturing model/);
assert.match(html, /Model processes, resources, queues, and bottlenecks\./);
assert.match(html, /class="brand-mark"[\s\S]*?class="brand-product-body"/);
assert.match(html, /Developed by Yousuf Yamani · 15 August 2026/);
assert.doesNotMatch(html, /Prepared by: Project Owner|Cycle time = the longer of manual time per operator or machine time per automatic machine/);
assert.doesNotMatch(html, /Cycle = slower of operator workload and automatic-machine workload/);
assert.doesNotMatch(html, /Industrial flow laboratory|<h1>Constraint Line<\/h1>/);
assert.match(html, /class="dashboard-dock"/);
assert.match(html, /id="dashboardPinBtn"/);
assert.match(html, /id="revisionHistoryBtn"/);
assert.match(html, /id="revisionHistoryDialog"/);
assert.match(html, /<th scope="row">V1\.1<\/th>/);
assert.match(html, /Unfreeze dashboard/);
assert.match(html, /class="dashboard-dock"[\s\S]*?<nav class="line-nav"/);
assert.match(html, /id="zoomOutBtn"/);
assert.match(html, /id="zoomInBtn"/);
assert.match(html, /id="zoomValue"/);
assert.match(html, /id="hourBtn"/);
assert.match(html, /id="dayBtn"/);
assert.match(html, /id="lineTemplateMenu"/);
assert.match(html, /id="processTypeMenu"/);
assert.deepEqual(
  [...html.matchAll(/data-line-template="([^"]+)"/g)].map(match => match[1]),
  ['scratch', 'hla', 'hlaChamberAging', 'pcb', 'pcbIndividual', 'pcba', 'pcbaIndividual']
);
assert.match(html, /· process flow/);
assert.doesNotMatch(html, /material flow/i);
assert.match(html, /id="startedUnitLabel"/);
assert.match(html, /id="finishedUnitLabel"/);
assert.match(html, /id="targetQtyLabel"/);
assert.doesNotMatch(html + styles, /legend-dot|product-dot|bottleneck-dot|idle-dot/);
assert.match(app, /\$\{started\} \$\{unitLabel\(inputUnitName, started\)\} started · \$\{completed\}\/\$\{targetQty\}/);
assert.doesNotMatch(html + app + simulation, /\b(cost|demand|SAR)\b/i);
assert.doesNotMatch(html + app + simulation + styles + bundle, /SCENARIOS|applyScenario|data-scenario|scenario-bar|Wrong-place staffing|Unbalanced line/i);
assert.doesNotMatch(app, /renderLesson|renderComparison|renderScenarioStatus|markCustom|runScenario/);
assert.match(app, /function resetActiveLine\(\)/);
assert.match(app, /line\.targetQty = Math\.max\(1, Math\.min\(10000, Math\.floor\(Number\(event\.target\.value\) \|\| 1\)\)\)/);
assert.match(app, /event\.target\.value = line\.targetQty/);
assert.match(app, /function formatCompletionTime\(/);
assert.match(app, /Math\.ceil\(seconds \/ 60\)/);
assert.match(app, /Target completes on workday \$\{completionDay\}/);
assert.doesNotMatch(app, /formatProductionDuration|productionDays/);
assert.match(app, /lineZoom: 1/);
assert.match(app, /LINE_TEMPLATES/);
assert.match(app, /function setLineTemplateMenu\(open\)/);
assert.match(app, /function addLine\(templateKey\)/);
assert.match(app, /function addProcess\(processType = 'unit'\)/);
assert.match(html, /data-add-process-type="batch"/);
assert.match(html, /data-add-process-type="depanel"/);
assert.match(html, /Panel depaneling/);
assert.match(app, /line\.templateKey = templateKey/);
assert.match(app, /function productTypeMode\(/);
assert.match(app, /function applyProductType\(/);
assert.match(app, /function productIdentitySummary\(/);
assert.match(app, /function depanelingProcess\(/);
assert.match(app, /applyProductType\(activeLine\(\), event\.target\.value\)/);
assert.match(app, /function changeLineZoom\(delta\)/);
assert.match(app, /1 \$\{outputUnitName\} every \$\{format\(3600 \/ stats\.throughput, 1\)\} sec after line fills/);
assert.doesNotMatch(app, /at steady state/i);
assert.match(simulation, /station\('assembly', 'Assembly', 60, 0, 3, 0/);
assert.match(app, /data-action="up"[^>]*>↑<\/button>/);
assert.match(app, /data-action="down"[^>]*>↓<\/button>/);
assert.doesNotMatch(app, /REALLOCATING|state\.walk|walkingOperators/);
assert.doesNotMatch(app + styles, /process-list-guide/);
assert.match(app, /'Transfer time', 'transferTime'/);
assert.match(app, /<details class="station-card process-card-details/);
assert.match(app, /<summary class="process-card-summary">/);
assert.match(app, /class="process-summary-tags process-summary-tags-left"/);
assert.match(app, /class="process-summary-tags process-summary-tags-right"/);
assert.match(app, /class="process-summary-metrics"/);
assert.match(app, /<small>Busy time<\/small><b data-live="utilization">/);
assert.match(app, /<small>Queue before process<\/small><b data-live="queue">/);
assert.match(app, /<section class="process-details">/);
assert.match(app, /class="process-details-heading"/);
assert.doesNotMatch(app, /<details class="process-details">/);
assert.match(app, /class="process-summary-order">P\$\{String\(index \+ 1\)\.padStart\(2, '0'\)\}/);
assert.doesNotMatch(app, /class="station-order"/);
assert.match(styles, /\.station-editor\s*\{[^}]*gap:\s*6px/);
assert.match(app, /class="station-overview"/);
assert.match(app, /class="process-badges"/);
assert.match(app, /class="bottleneck-badge \$\{balancedBottleneck \? 'is-balanced' : ''\}"/);
assert.match(app, /data-kpi="cycle"/);
assert.match(app, /data-kpi="busy"/);
assert.match(app, /data-kpi="queue"/);
assert.match(app, /data-key="operators"/);
assert.match(app, /data-key="equipment"/);
assert.match(styles, /\.station-kpis\s*\{[^}]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\)/);
assert.match(styles, /\.station-kpis \.is-critical b\s*\{[^}]*var\(--red\)/);
assert.match(styles, /\.station-kpis \.is-balanced-bottleneck b\s*\{[^}]*var\(--orange\)/);
assert.match(styles, /\.station-kpis \.is-warning b\s*\{[^}]*var\(--orange\)/);
assert.match(styles, /\.process-type-badge, \.batch-badge\s*\{[^}]*color:\s*var\(--muted\)[^}]*border-color:\s*var\(--line-strong\)[^}]*background:\s*var\(--paper\)/);
assert.doesNotMatch(styles.match(/\.batch-badge\s*\{[^}]*\}/)?.[0] || '', /var\(--accent\)|var\(--accent-soft\)/);
assert.doesNotMatch(app + simulation, /operatorParallel|equipmentParallel|Operator flow|Equipment flow/);
assert.match(app, /'Automatic machine'/);
assert.match(app, /data-live="machineRequirement"/);
assert.match(app, /function machineRequirementText\(/);
assert.match(app, /function syncResourceRequirements\(/);
assert.match(app, /data-live="cycleDriver"/);
assert.match(app, /data-key="processType"/);
assert.match(app, /Batch duration \(hours\)/);
assert.match(app, /\$\{inputUnitPlural\} per batch/);
assert.match(app, /renderProcessSettings\(item, detail\)/);
assert.match(app, /data-key="batchStartMode"/);
assert.match(app, /data-key="batchStartTimes"/);
assert.match(app, /Products processed \(%\)/);
assert.match(app, /helpNumberField\('Products processed \(%\)', 'batchProcessPercent'[\s\S]*?, 100\)\}/);
assert.match(app, /const maxAttribute = Number\.isFinite\(max\) \? ` max="\$\{max\}"` : ''/);
assert.match(app, /100% sends every/);
assert.match(app, /bypass without waiting for the batch/);
assert.match(app, /Batch \/ Chamber · \$\{format\(processPercent, 0\)\}%/);
assert.match(app, /data-key="allowPartialBatch"/);
assert.match(app, /Allow partial batch at schedule/);
assert.match(app, /item\.batchStartMode === 'full' \? 'disabled' : ''/);
assert.match(app, /class="settings-body batch-settings-body"/);
assert.match(app, /class="batch-settings-grid"/);
assert.doesNotMatch(app, /<h4>Batch timing<\/h4>/);
assert.match(styles, /\.batch-settings-body\s*\{[^}]*display:\s*block/);
assert.match(styles, /\.batch-settings-grid\s*\{[^}]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\)/);
assert.match(styles, /\.batch-settings-grid \.checkbox-field\s*\{[^}]*grid-column:\s*1 \/ -1/);
assert.match(app, /data-product-state="batch-processing"/);
assert.match(app, /BATCH EQ/);
assert.match(app, /Batch equipment/);
assert.match(simulation, /batchStation\('panel-plating', 'Panel Plating'/);
assert.match(simulation, /batchStation\('solder-mask-cure', 'Solder Mask Cure'/);
assert.match(simulation, /batchStation\('burn-in', 'Panel Burn-in'/);
assert.match(simulation, /station\('reflow', 'Panel Reflow Soldering'/);
assert.match(simulation, /pcbaIndividual:[\s\S]*station\('firmware-download', 'Firmware Download'[\s\S]*station\('functional-test', 'Functional Test'/);
assert.match(html, /Panels split into individual PCBs at depaneling/);
assert.match(html, /Assembly panels split into individual PCBAs/);
assert.match(html, /already-depanelled PCBs/);
assert.match(html, /already-depanelled PCBAs/);
assert.match(simulation, /function depanelStation\(/);
assert.match(simulation, /function lineOutputMultiplier\(/);
assert.match(simulation, /function inputTargetQuantity\(/);
assert.match(simulation, /conversionEnabled !== false/);
assert.match(simulation, /cycleDriver: 'conversion-inactive'/);
assert.match(simulation, /conversionInvalid: invalidConversions\[index\]/);
assert.match(app, /Wrong setup · depaneling inactive · line stopped/);
assert.match(app, /Wrong · depaneling inactive/);
assert.match(styles, /\.station-card\.has-process-error/);
assert.match(styles, /\.conversion-badge\.is-error/);
assert.match(simulation, /outputMultiplier: unitsPerPanel/);
assert.match(app, /class="conversion-badge"/);
assert.match(app, /data-key="outputMultiplier"/);
const outputMultiplierBranch = app.match(/if \(key === 'outputMultiplier'\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.match(outputMultiplierBranch, /renderMetrics\(\)/);
assert.match(outputMultiplierBranch, /renderSvg\(\)/);
assert.doesNotMatch(outputMultiplierBranch, /refresh\(/);
assert.match(app, /conversionProcess = item\.conversionType === 'split'/);
assert.match(app, /normalizedUnit === 'pcb panel'/);
assert.match(app, /normalizedUnit === 'pcba panel'/);
assert.match(app, /const panelBoards = \[\[-17, -10\], \[2, -10\], \[-17, 1\], \[2, 1\]\]/);
assert.match(app, /const assembledPanel = normalizedUnit === 'pcba panel'/);
assert.match(app, /normalizedUnit === 'pcb'/);
assert.match(app, /normalizedUnit === 'pcba'/);
assert.doesNotMatch(html + app + simulation, /loading time|unloading time/i);
assert.match(simulation, /function batchStation\(/);
assert.match(simulation, /function scheduledBatchStartsPerDay\(/);
assert.match(simulation, /const scheduleEnabled = mode !== 'full'/);
assert.match(simulation, /function noMoreProductsCanReachStation\(/);
assert.match(simulation, /const finalPartialAllowed = mode !== 'scheduled'/);
assert.match(simulation, /const finalRemainderReady = mode !== 'scheduled'/);
assert.match(simulation, /activeBatches/);
assert.match(simulation, /batchDurationHours/);
assert.match(simulation, /batchCapacity/);
assert.match(simulation, /batchStartTimes/);
assert.match(simulation, /Math\.max\(\.1, manualCycle, machineCycle\)/);
assert.match(simulation, /machineRequired/);
assert.match(simulation, /function batchProcessPercent\(/);
assert.match(simulation, /function shouldProcessBatchSequence\(/);
assert.match(simulation, /function routeProductToStation\(/);
assert.match(simulation, /runtime\.skipped\[stationIndex\] \+= 1/);
assert.match(simulation, /bypassed: true/);
assert.match(simulation, /effectiveDailyCapacity = dailyCapacity \/ processRatio/);
assert.match(app, /data-product-state="\$\{transit\.bypassed \? 'batch-bypass' : 'transfer'\}"/);
assert.match(app, /class="timing-grid"/);
assert.match(app, /class="resource-settings-grid"/);
assert.match(app, /function bindProcessDetails\(/);
assert.match(app, /bindProcessDetails\(\$\('lineControlsDetails'\)\)/);
assert.match(app, /bindProcessDetails\(\$\('processSettingsDetails'\)\)/);
assert.match(app, /querySelectorAll\('\.process-card-details'\)/);
assert.match(app, /expandedProcessKeys:\s*new Set\(\)/);
assert.match(app, /const processOpen = state\.expandedProcessKeys\.has\(processKey\)/);
assert.match(app, /function toggleAllProcesses\(\)/);
assert.match(app, /function syncProcessToggleButton\(\)/);
assert.match(app, /'toggleAllProcessesBtn'\)\.addEventListener\('click', toggleAllProcesses\)/);
assert.match(styles, /\.details-panel\s*\{[^}]*transition:\s*height/);
assert.match(styles, /\.settings-window\[open\] > \.settings-window-panel\s*\{[^}]*height:\s*auto[^}]*opacity:\s*1/);
assert.match(styles, /\.process-card-details\[open\] > \.process-card-panel\s*\{[^}]*height:\s*auto[^}]*opacity:\s*1/);
assert.match(styles, /\.controls-grid\s*\{[^}]*padding:\s*24px 0 0/);
assert.doesNotMatch(styles.match(/\.controls-grid\s*\{[^}]*\}/)?.[0] || '', /border-bottom/);
assert.match(styles, /\.dashboard-dock\s*\{[^}]*position:\s*sticky/);
assert.match(styles, /\.dashboard-unpinned \.dashboard-dock\s*\{[^}]*position:\s*static/);
assert.match(app, /dashboardPinned: true/);
assert.match(app, /state\.dashboardPinned = !state\.dashboardPinned/);
assert.match(app, /classList\.toggle\('dashboard-unpinned', !state\.dashboardPinned\)/);
assert.match(app, /state\.dashboardPinned \? 'Unfreeze dashboard' : 'Freeze dashboard'/);
assert.match(app, /\? \{ height: 338, conveyorY: 260, equipmentY: 108, operatorY: 128, equipmentNameY: 174, resourceLabelY: 190 \}/);
assert.match(app, /: \{ height: 234, conveyorY: 178, equipmentY: 99, operatorY: 123, equipmentNameY: 146, resourceLabelY: 159 \}/);
assert.match(app, /const height = verticalLayout\.height;/);
assert.match(app, /const conveyorY = verticalLayout\.conveyorY;/);
assert.match(app, /const presentationWidth = Math\.max\(1440, line\.stations\.length \* 250 \+ 160\);/);
assert.match(app, /state\.presentation \? \(isMobile \? \.9 : 1\.05\)/);
assert.match(app, /x="-61" y="27" width="122" height="49"/);
assert.doesNotMatch(app, /M-69 39H69/);
assert.match(styles, /\.line-nav\s*\{[^}]*min-height:\s*44px/);
assert.match(styles, /\.metric\s*\{[^}]*padding:\s*5px 9px 4px/);
assert.match(styles, /\.metric small\s*\{[^}]*white-space:\s*normal/);
assert.match(styles, /\.metric small\s*\{[^}]*overflow:\s*visible/);
assert.match(styles, /\.presentation \.app-shell\s*\{[^}]*max-width:\s*none/);
assert.match(styles, /\.presentation \.line-svg\s*\{[^}]*max-height:\s*none/);
assert.match(styles, /\.presentation \.svg-stage\s*\{[^}]*overflow-y:\s*visible[^}]*padding-bottom:\s*4px/);
assert.doesNotMatch(app, /const height = 365;/);
assert.match(styles, /\.settings-body\s*\{[^}]*grid-template-columns:\s*minmax\(0, 3fr\) minmax\(230px, 1fr\)/);
assert.match(app, /◆ BOTTLENECK/);
assert.doesNotMatch(html + app + styles, /ACTIVE CONSTRAINT/i);
assert.match(app, /Queue before process/);
assert.match(app, /function desktopQueues\(/);
assert.match(app, /if \(count === 0\) return '';/);
assert.match(app, /data-queue-destination=/);
assert.doesNotMatch(app.match(/function desktopStation[\s\S]*?\n\}/)?.[0] || '', /queueStack\(/);
assert.match(app, /function processingProgressRing\(/);
assert.match(app, /class="processing-ring-progress"/);
assert.match(app, /class="product-status-label"/);
assert.match(app, /\$\{unitLabelUpper\(unitName, 1\)\} #\$\{displaySerial\} · STEP \$\{stationIndex \+ 1\}/);
assert.match(app, /processX - Math\.min\(92, Math\.max\(68, spacing \* \.46\)\)/);
assert.doesNotMatch(app, /PRODUCT #\$\{product\.serial\} · PROCESSING/);
assert.match(app, /const completion = Math\.max\(0, Math\.min\(1, progress\)\) \* 100;/);
assert.match(app, /stroke-dasharray="\$\{completion\} \$\{100 - completion\}"/);
assert.doesNotMatch(app, /stroke-dashoffset="\$\{orbit\}"/);
assert.match(styles, /\.processing-ring-progress\s*\{[^}]*stroke-linecap:\s*round/);
assert.match(app, /data-live="equipmentName"/);
assert.match(app, /data-equipment-name="\$\{index\}"/);
assert.match(app, /card\.querySelector\('\[data-live="equipmentName"\]'\)/);
assert.match(styles, /\.line-svg \.equipment-name-label/);
assert.match(simulation, /const allProcessesBusy = details\.length > 0 && details\.every\(item => item\.capacity > 0 && item\.utilization >= \.65\)/);
assert.match(app, /balancedBottleneck = bottleneck && stats\.allProcessesBusy/);
assert.match(app, /bottleneckColor = balancedBottleneck \? 'var\(--orange\)' : 'var\(--red\)'/);
assert.match(styles, /\.bottleneck-badge\.is-balanced\s*\{[^}]*var\(--orange\)/);
assert.match(styles, /\.metric\.warning\.bottleneck-balanced strong\s*\{[^}]*var\(--orange\)/);
const stickmenSource = app.match(/function stickmenSvg[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(stickmenSource, /count > visible|count - visible/);
assert.match(bundle, /class="dashboard-dock"/);
assert.match(bundle, /id="zoomOutBtn"/);
assert.match(bundle, /id="lineTemplateMenu"/);
assert.match(bundle, /data-line-template="hlaChamberAging"/);
assert.match(bundle, /data-line-template="pcbIndividual"/);
assert.match(bundle, /data-line-template="pcbaIndividual"/);
assert.match(bundle, /id="processTypeMenu"/);
assert.match(bundle, /Batch \/ Chamber process/);
assert.match(bundle, /id="dayBtn"/);
assert.doesNotMatch(bundle, /at steady state/i);
assert.doesNotMatch(bundle, /<script\s+src=|<link\s+rel="stylesheet"/i);

console.log(JSON.stringify({
  htmlIds: ids.length,
  referencedIds: new Set(appIdReferences).size,
  missingIds: missingIds.length,
  targetControl: true,
  targetQuantityHardLimit: 10000,
  clearTargetCompletionTime: true,
  scratchProductIdentityControl: true,
  fiveProductTypes: true,
  centeredSymmetricPanelIcons: true,
  distinctPcbAndPcbaPanelIcons: true,
  assembledGenericProductIcon: true,
  windowsGenericProductIcon: true,
  desktopShortcutCreator: true,
  automaticScratchDepaneling: true,
  frozenDashboard: true,
  frozenLineRibbon: true,
  dashboardFreezeToggle: true,
  compactPinnedDashboard: true,
  completeDashboardDetailText: true,
  compactProcessBlocks: true,
  extraProcessHeaderLineRemoved: true,
  expandedPresentationProcessFlow: true,
  lineTemplateMenu: true,
  batchChamberProcessType: true,
  batchSamplingPercentage: true,
  visibleBatchBypass: true,
  compactBatchSettingsGrid: true,
  mixedPcbPanelProcesses: true,
  mixedPcbaPanelProcesses: true,
  panelToIndividualConversion: true,
  inactiveDepanelingStopsLine: true,
  conversionInputKeepsDetailsOpen: true,
  productIdentityVisible: true,
  individualFinishingTemplates: true,
  pcbaIndividualFirmwareDownload: true,
  scheduledBatchStarts: true,
  fullBatchRuleIgnoresSchedule: true,
  finalIncompleteBatchAutoStarts: true,
  longTestFastForward: true,
  processLineZoom: true,
  compactInlineMachineSettings: true,
  operatorOverflowMarkerRemoved: true,
  startedBatchProgress: true,
  processFlowLabel: true,
  flowLegendRemoved: true,
  verticalReorderControls: true,
  reallocationAnimationRemoved: true,
  clearerProcessHierarchy: true,
  compactExpandableRows: true,
  compactHeaderStatusTags: true,
  compactHeaderBusyAndQueue: true,
  collapsibleLineControls: true,
  mainSettingsCollapsedByDefault: true,
  matchingSettingsWindows: true,
  collapsibleProcessSettings: true,
  collapsibleCompleteProcessRows: true,
  allProcessesCollapsedByDefault: true,
  expandCollapseAllProcesses: true,
  bulletProcessExplanation: true,
  noDuplicateProcessIdTag: true,
  explicitProcessNumbering: true,
  responsiveSettingsGrid: true,
  animatedDetails: true,
  resourceFlowSelectorsRemoved: true,
  automaticMachineRequirement: true,
  slowerResourceSetsCycle: true,
  attentionColorsOnly: true,
  editableTransferSeconds: true,
  bottleneckTerminology: true,
  queuesBeforeDestinationProcess: true,
  zeroQueueIconsHidden: true,
  explicitProcessingLabel: true,
  processingLoadingRing: true,
  compactNonOverlappingFlowLabels: true,
  liveEquipmentName: true,
  removedTerms: true,
  scenarioPresetsRemoved: true,
  balancedAllocationDefault: true,
  standaloneExternalReferences: 0
}));
