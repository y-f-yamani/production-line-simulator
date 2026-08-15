# Production Line Simulator V1

Production Line Simulator V1 is a framework-free production-line teaching tool for desktop and mobile browsers. It models people, equipment, finite production batches, queues, and independent production lines.

The generic assembled-product symbol is used consistently for the main logo and the embedded browser/app icon. Browser-created desktop and home-screen shortcuts can use this icon without downloading another asset. A raw `.html` file may still show the computer's default browser icon because Windows controls file-type icons globally.

## V1 release

- Version: **1.0.0**
- Release date: **2026-08-15**
- Developed by: **Yousuf Yamani**
- Runtime dependencies: **none**
- Supported use: open locally, host as a static site, or share the standalone HTML file

## Run it

Open `index.html` directly in a modern browser. No installation, build step, package manager, or web server is required.

For the easiest sharing option, use `release/Production-Line-Simulator-V1.html`. It contains the complete application—styles, simulation model, and interface logic—in one file with no internet dependency. Send that single file to a phone or PC, download it locally, and open it in Safari, Chrome, Edge, or Firefox. Some mobile messaging apps preview HTML as text; in that case save/download the attachment first and choose **Open in browser**.

The files can also be served from any static web server:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Windows desktop icon

Windows Explorer shows the Microsoft Edge, Chrome, or other default-browser icon for every raw `.html` file. HTML content and browser favicons cannot override that system-wide file association.

To get the simulator's generic-product icon on Windows, double-click **`Create Desktop Shortcut.cmd`**. It creates **Production Line Simulator V1** on the current user's Desktop, targets the standalone release, and uses `assets/Production-Line-Simulator-Icon.ico`. Keep the project folder in its current location after creating the shortcut. If the project is moved, run the shortcut creator again.

This Windows shortcut is optional. Sharing only `release/Production-Line-Simulator-V1.html` still works on mobile and PC, and its embedded icon remains available to browsers and browser-created shortcuts.

## Default line

The simulator opens with a balanced nine-operator allocation: 3 operators at Assembly, 1 at Calibration, 1 at Labeling, 2 at Testing, and 2 at Packaging. Software Download and Testing each have one automatic machine. Once the line is full and all processes are flowing, this produces a line capacity of 90 units/hour, with the 40-second automatic work setting the bottleneck pace.

There are no preset selectors. Every resource setting remains directly editable, and **Reset line** restores this balanced allocation for the active line.

## Operators and equipment

Each process has independent controls for:

- Assigned operators
- Assigned automatic machines
- Manual time, machine time, transfer time, and automatic-machine name

Changing **Machine name** immediately updates the process-row summary and the label beneath that process's automatic-machine symbol in the pinned production line. The name is descriptive only; machine time and assigned machine quantity control machine capacity.

## Batch equipment, chambers, and panel processes

Use **+ Add process** and choose **Batch / Chamber process** for environmental chambers, plating baths, batch ovens, burn-in racks, curing, aging, or another operation that holds several products and releases them together. Do not model a chamber as a regular automatic machine with 24 hours of machine time per product; that would incorrectly treat the products as sequential.

A batch process has these inputs:

- **Batch duration** — elapsed hours from batch start to batch finish
- **Products per batch** — maximum products handled in one batch-equipment run
- **Assigned batch equipment** — how many independent batch runs may overlap
- **Start rule** — scheduled time, full batch, or whichever occurs first
- **Scheduled start times** — one or more 24-hour times such as `08:00, 20:00`
- **Allow partial batch at schedule** — lets a scheduled rule start with the products currently waiting; it is not used by **When batch is full**
- **Transfer time** — movement and handling after the batch; no duplicate loading/unloading field is used

At a valid start, waiting products move into available batch equipment together, stay there for the full duration, and complete together. Capacity is based on batch size, duration, schedule, and equipment count, so a 24-hour test is not automatically the bottleneck merely because its elapsed time is long. For example, one 24-hour chamber starting once per day with 100 products has 100 products/day average capacity; two independent chambers have 200 products/day.

**Products processed (%)** controls whether a Batch / Chamber process is mandatory or sampled. Keep it at **100%** when every product must complete the chamber, aging, burn-in, cure, or other batch requirement. Set a lower value only when the real quality plan permits sample testing—for example, 20% processes an evenly distributed, deterministic sample and routes the remaining products past the batch without making them wait. The first product is always included, selection is repeatable rather than random, skipped products remain in the correct process history, and the effective line-capacity calculation is increased by the inverse sampling ratio. A chamber that can test 100 units/day at 20% sampling therefore supports up to 500 production units/day, subject to the capacity of the other processes.

The percentage is limited to **1–100%**. To remove a Batch / Chamber step completely, delete that process instead of entering 0%. For a sampled scheduled batch, keep **Allow partial batch at schedule** enabled unless the selected sample will reliably fill the configured batch quantity.

**When batch is full** ignores Scheduled start times completely. It starts immediately when the configured batch quantity is waiting. At the end of the production target, the final incomplete batch also starts automatically once the simulator confirms that no product remains upstream or in transfer to that process; this prevents the last one or two panels from waiting forever. Scheduled-only rules still wait for their configured time.

The **HLA including Chamber and Aging Test** template includes separate 24-hour Chamber Test and Aging Test batch processes. Its completion estimate uses continuous calendar time through these batch operations. Use **+ 1 hour** or **+ 1 day** to inspect long tests without waiting in real time.

The full **PCB · Panel to Individual** and **PCBA · Panel to Individual** templates distinguish the carrier from the finished product. Before depaneling, one animated item is one **panel**. Panel Plating, Solder Mask Cure, and Panel Burn-in are batch processes because several panels can start and finish together. Conveyor etching, drilling, printing, placement, reflow, AOI, and similar steps remain regular processes even though their flowing item is a panel.

At **Panel Depaneling**, one panel is converted into multiple individual PCBs or PCBAs. The default is four boards per panel and can be edited in the depaneling process settings. The target always means finished individual output: for a target of 10 PCBs with four PCBs per panel, the simulator starts three panels and caps the finished output at exactly 10 PCBs. Process capacity before depaneling is converted to finished-board equivalent capacity, so the bottleneck comparison remains consistent across panel and individual stages.

Use **PCB · Individual Finishing** or **PCBA · Individual Finishing** when the incoming items are already depanelled. These shorter templates have no panel conversion and start one individual board for each target unit.

For **From scratch**, choose **Product type** in Line controls before defining the processes: Generic product, PCB, PCB Panel, PCBA, or PCBA Panel. PCB and PCBA represent one individual board. PCB Panel is drawn as four evenly spaced PCBs in one centered panel, while PCBA Panel is drawn as four evenly spaced assembled PCBAs. Choosing either panel type automatically adds **Panel Depaneling** at the end of the new line; move it up or down to the real split point. You can also add it from **+ Add process → Panel depaneling**. Its **Individual output per panel** value controls how many boards are created from one panel.

If Panel Depaneling does not match the selected Product type, it is marked **Wrong · depaneling inactive**. Its capacity becomes zero and the line stops. Correct the Product type, move depaneling to a valid panel position, or remove an unnecessary depaneling process before production can continue.

## Process card layout

Line controls and Process and resource settings use the same bordered accordion-window layout, with only a compact gap between them. Both complete sections start collapsed and can be expanded from their headings. The first explanation line shows the complete regular-process cycle formula, followed by separate bullet lines for Batch / Chamber, Transfer time, and Busy time.

Each numbered process also starts collapsed as one expandable row. Its compact header keeps P01/P02 at the far left, places the process-type tag before the process name, and places conversion, setup-error, and Bottleneck tags after the name. Cycle, Capacity, Busy time, and Queue before process remain visible in the same header. Expanding it shows all three overview sections—process identity, Busy time, Queue before process, operator and machine counts, applicable status tags—plus the complete Timing, transfer and automatic machine area. The P01/P02 identifier appears only once. Use **Expand all processes** or **Collapse all processes** to change every row together. There is no second disclosure to open. Timing fields collapse to two columns on tablets, while the groups stack on narrow phones. All chevrons include hover feedback and animated opening/closing, with reduced-motion support.

The station cycle calculation is:

`max(manual time / assigned operators, machine time / assigned automatic machines)`

In plain language, **cycle time is the longer of manual time per operator or machine time per automatic machine**. Both workloads must finish, so the slower side controls how frequently the process can complete a product. For example, if the operator workload is 30 seconds and the machine workload is 50 seconds, the process cycle is 50 seconds.

This is an aggregate production-cycle model: manual and automatic workloads can overlap across different products. Extra operators reduce the manual workload per product, while extra automatic machines reduce the machine workload per product. Adding resources to the faster side has no benefit until it becomes the slower side.

Manual time above 0 requires at least one operator. Machine time above 0 requires at least one automatic machine. Machine time of 0 automatically marks the machine as not required and sets its assigned quantity to 0. A process stops when a required resource has zero assigned quantity.

**Busy time** replaces the technical term utilization in the interface. It is calculated as `line throughput / process capacity`. A process at 100% busy works continuously; a process at 50% busy has approximately half of its capacity available or idle. When every process is at least 65% busy, Bottleneck indicators become orange to show a broadly loaded line. If any process is below 65%, the Bottleneck remains red to call attention to a stronger line imbalance; red also remains reserved for stopped resources and invalid setups.

Process capacity is `3600 / effective cycle`. **Line capacity** is the lowest process capacity, and that process is reported as the **Bottleneck**. A displayed capacity of 90 units/hour means that after start-up has filled the line, finished products can leave at an average interval of 40 seconds. It does not mean the first product finishes in 40 seconds. Target quantity limits the batch size, not the calculated hourly capacity. Transfer time is entered in seconds after each process; it affects product movement and batch completion time but does not incorrectly change the process cycle or hourly capacity.

## Queues and animation

The simulator uses discrete product records rather than a fluid-flow approximation. During every simulation step:

1. The batch feeder starts product 1 directly at the first available process.
2. Every process has its own waiting queue and one active processing slot.
3. A product remains in that slot for the complete calculated cycle time.
4. As soon as the first process completes one product, the feeder starts the next product with no rate-based delay.
5. Input items are started only until enough finished output can meet **Target qty**. Regular lines start one item per target unit. A panel line starts `ceil(target ÷ boards per panel)` panels.
6. After processing, each product remains in an explicit transfer state for the configured transfer seconds and is then added only to the next process queue.
7. Different processes operate concurrently, creating a real multi-product pipeline.
8. Excess products remain visibly accumulated before constrained downstream processes.

Waiting-product icons are drawn immediately before the process they are waiting to enter, not underneath that process. A zero queue draws no product icons and no waiting label. In the settings, **Queue before process** reports the exact product count and its estimated wait separately from the product currently being processed.

At 1× speed, one real second represents one simulated second. The speed range is 0.1×–10×, allowing a slow presentation view or a faster queue demonstration. The **+ 1 minute** button advances the flow model by exactly sixty simulated seconds. Product shapes include a chassis, panel, barcode, and status light so individual and accumulated units remain recognizable.

Every active and transferring item is rendered with its current identity. A panel uses a multi-board panel symbol; after depaneling, each child PCB or PCBA has its own serial number and inherits the panel's ordered process history. An item can enter process `n + 1` only after completing process `n`, so it cannot skip a station. Multiple items can be processing at different stations simultaneously while additional items wait in queues.

The top **Line capacity** value is the repeatable rate of finished output after the line has filled. **Batch progress** names and counts the input item actually started—for example, panels—while **finished output** names and counts the final PCB or PCBA. **Simulation time** is the simulated elapsed production time; it pauses with the simulation and stops increasing when the target batch is complete. Changing Target qty or selecting **Restart batch** clears the current batch, resets simulation time, and starts again from the first input item.

**Target qty** accepts 1–10,000 finished units. The same limit is enforced by the application logic—not only by the input control—to keep large runs responsive and memory-safe on phones and PCs.

**Shift time** is the number of productive hours in one working day. **Time to finish target** estimates when the required quantity will finish by scheduling the entire finite batch through every process and transfer. It displays a readable duration such as **5 h 2 min**, followed by **Target completes on workday 1 · 8 h/day**. This includes first-product pipeline warm-up and downstream waiting. A stopped process reports `STOP` instead of an invalid completion estimate.

## Multiple lines

Use **+ Add line** to open the line-template menu. Available starting layouts are:

- **From scratch** — one editable manual process
- **HLA** — the balanced high-level assembly flow
- **HLA including Chamber and Aging Test** — HLA with added environmental chamber and aging processes
- **PCB · Panel to Individual** — panel fabrication with batch plating and curing, then depaneling into individual PCBs
- **PCB · Individual Finishing** — electrical test, inspection, and packaging for already-depanelled PCBs
- **PCBA · Panel to Individual** — panel assembly with conveyor reflow and batch burn-in, then depaneling into individual PCBAs
- **PCBA · Individual Finishing** — firmware download, functional test, inspection, and packaging for already-depanelled PCBAs

These are editable starter layouts rather than fixed industrial standards; process names, timings, resources, and order can all be changed. **Reset line** restores the active line to the template from which it was created.

Each line preserves its own:

- Processes and resource allocation
- Target quantity, shift time, and available operators
- Queues
- Completed output and bottleneck

The line tabs switch the active simulation. The complete line ribbon is pinned with the metrics and process-flow dashboard while the settings scroll. Select **Unfreeze dashboard** to let both areas scroll with the page; the same button becomes **Freeze dashboard** so they can be pinned again. Select the **Line controls** heading to collapse or expand its controls. The navigation summary shows combined throughput across all lines. Rename a line in **Line controls**, or remove the active line when more than one line exists. Process settings show an explicit **Process 01 of 06** style number so each row's position is immediately clear.

## Mobile behavior

At phone widths the horizontal production line stays compact and can be swiped left or right. The complete dashboard—metrics and production line—is pinned to the top while controls and station settings scroll underneath it. The − and + controls zoom the process flow from 60% to 180%, which keeps long lines readable. Process settings are full-width rows stacked one above another; their sections wrap cleanly on tablets and phones. Resource controls stack on very narrow screens, and the page itself avoids horizontal overflow. Presentation mode works at both desktop and mobile sizes, using additional horizontal station spacing and a taller process-flow canvas with extra separation between resources, the conveyor, products, queues, and status labels.

The seven main metrics remain in one horizontal row; on narrow phones that row can be swiped horizontally.

## Project structure

- `index.html` — page structure and browser-safe script loading
- `styles.css` — dark industrial visual system and responsive layouts
- `simulation.js` — resource model, balanced defaults, line calculations, and queue engine
- `app.js` — UI state, SVG drawing, interactions, animation, and multi-line management
- `release/Production-Line-Simulator-V1.html` — complete single-file V1 release
- `assets/Production-Line-Simulator-Icon.svg` — editable generic-product icon source
- `assets/Production-Line-Simulator-Icon.png` — high-resolution icon preview
- `assets/Production-Line-Simulator-Icon.ico` — Windows desktop-shortcut icon
- `Create Desktop Shortcut.cmd` — one-click Windows shortcut creator
- `scripts/build-standalone.js` — rebuilds the standalone release from the source files
- `scripts/build-windows-icon.ps1` — regenerates the PNG and ICO assets
- `scripts/create-desktop-shortcut.ps1` — creates the Windows Desktop shortcut
- `tests/verify-simulator.js` — simulation and calculation verification
- `tests/stress-simulator.js` — formula matrix, 10,000-product, long-line, batch, conversion, and multi-line stress verification
- `tests/verify-ui.js` — interface and standalone-package verification
- `RELEASE-VALIDATION.md` — final V1 calculation, stress, browser, responsive, and packaging test record
- `CHANGELOG.md` — release history
- `package.json` — project metadata and test/build commands

To change the initial balanced process list or allocation, edit `DEFAULT_STATIONS` in `simulation.js`.

## Build and verify

Node.js is needed only for the optional build and verification commands. The simulator itself does not require Node.js.

```bash
npm test
npm run build
npm run build:windows-icon
npm run create:desktop-shortcut
```

`npm test` runs the calculation, high-volume stress, and UI audits. `npm run build` regenerates `release/Production-Line-Simulator-V1.html`. The two Windows-only commands rebuild the custom icon or create the Desktop shortcut.

## Upload to GitHub

Upload the complete project folder so both the editable source and standalone release remain available. A typical first commit is:

```bash
git init
git add .
git commit -m "Release Production Line Simulator V1"
```

After creating an empty GitHub repository, follow GitHub's displayed commands to add its remote and push the branch. No generated dependency folder is required.

## License

This project is released under the [BSD Zero Clause License (0BSD)](LICENSE).
Anyone may use, copy, modify, and distribute it, including commercially, without
adding attribution or sending changes back to this repository. The software is
provided as-is; see the full license text in `LICENSE`.

The project name, logo, and other branding are not automatically granted as
trademarks by this license. Check the rights for any third-party material before
redistributing it.
