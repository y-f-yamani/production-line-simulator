# Production Line Simulator V1 — Release Validation

Validation date: **15 August 2026**  
Release file: `release/Production-Line-Simulator-V1.html`

## Result

The V1 release passed the calculation, high-volume stress, interface, responsive-layout, and standalone-package checks described below. No console errors or release-blocking defects remain.

## Calculation rules verified

- Regular-process cycle: `max(manual work ÷ assigned operators, machine time ÷ assigned automatic machines)`.
- Regular-process capacity: `3600 ÷ cycle`.
- Line capacity: the lowest finished-unit-equivalent process capacity.
- Busy time: `line capacity ÷ process capacity`, limited to 100%.
- Transfer time changes finite-batch completion time but does not change process cycle or steady output capacity.
- A positive manual workload with no operator stops the process.
- A positive automatic-machine workload with no automatic machine stops the process.
- A 0-second workload does not require its related resource.
- Batch capacity uses duration, products per batch, assigned batch equipment, start rule, scheduled times, shift hours, and sampling percentage.
- Active panel conversion multiplies upstream capacity into finished-board equivalents and starts `ceil(target ÷ output per panel)` panels.
- An inactive or incompatible depaneling conversion stops the line.

The automated formula matrix checks **192** manual-time, machine-time, operator-count, and machine-count combinations.

## Stress scenarios passed

- Default HLA line: **10,000 products**, all six processes completed exactly 10,000 products with no skipped process and no remaining queue, transfer, or active work.
- Default 10,000-product finite-batch estimate: **400,152.7 simulated seconds**.
- Long custom line: **48 processes × 2,000 products**, with ordered process history and all queues drained.
- Parallel full-batch process: **1,000 products**, batch size 40, two independent batch resources, including the final incomplete batch rule.
- Sampled batch process: **10,000 products at 1%**, exactly 100 products processed and 9,900 visibly bypassed in deterministic order.
- Scheduled partial batch: target smaller than batch capacity starts at the configured schedule when partial batches are enabled.
- Scheduled no-partial batch: correctly waits when the target cannot fill the configured batch.
- Panel conversion: **10,000 finished PCBs** started exactly 2,500 four-board panels and finished exactly 10,000 PCBs.
- Mixed PCB and PCBA templates: regular, batch, and depaneling processes completed together without skipped mandatory processes.
- Multiple lines: independent targets and runtime state remained isolated.
- Target input: values are enforced to the supported range of **1–10,000** in application logic.

The animated engine uses a maximum 0.25-second discrete step during large fast-forward operations. Its displayed completion clock is therefore checked within one simulation step per process, while the finite-batch completion formula remains exact.

## Browser and responsive checks passed

- Desktop layout at 1265 × 720.
- Phone layout at 390 × 844.
- No page-level horizontal overflow on the phone layout.
- Dashboard metrics and the long process flow use their intended independent horizontal scrolling.
- Batch-setting fields collapse to one readable column on the phone layout.
- Presentation mode expands both horizontal process spacing and vertical process-flow spacing on desktop and phone layouts.
- Freeze/Unfreeze dashboard changes the dashboard between sticky and normal document positioning.
- Add-line menu exposes all seven templates.
- PCBA Individual Finishing begins with Firmware Download.
- HLA Chamber and Aging fields, start-rule changes, disabled schedule fields, and live equipment-name updates work together.
- Process rows expand by pointer interaction and retain complete resource/timing controls.
- No browser console errors or warnings were produced during the release-candidate interaction run.

## Standalone and release checks passed

- The standalone release contains no external JavaScript or stylesheet references.
- The title, V1 metadata, developer credit, embedded browser icon, Windows icon, and shortcut creator are included.
- Source HTML IDs are unique and every application ID reference resolves.
- The standalone file rebuilds successfully from `index.html`, `styles.css`, `simulation.js`, and `app.js`.

## Re-run before publishing

```bash
npm test
npm run build
npm test
```

The second test run verifies the newly rebuilt standalone file.
