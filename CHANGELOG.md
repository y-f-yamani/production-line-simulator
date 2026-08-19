# Changelog

All notable changes to Production Line Simulator are documented here.

## 1.1.0 — 2026-08-19

- Updated the application to Production Line Simulator V1.1.
- Added a Revision history button beside the dashboard freeze control.
- Added a responsive revision table explaining the V1.1 and V1.0 updates.
- Kept the standalone filename `Production-Line-Simulator-V1.html` for easy sharing.

## 1.0.0 — 2026-08-15

- Added a permanent release-candidate stress suite covering 192 formula combinations, 10,000-product runs, a 48-process line, parallel/sampled/scheduled batches, PCB/PCBA conversion, and multi-line isolation.
- Enforced the documented 1–10,000 target range in application logic to prevent oversized manual entries from causing excessive memory allocation.
- Added `RELEASE-VALIDATION.md` with the final calculation, browser, responsive, and standalone verification record.
- Released the responsive navy-and-green industrial interface for desktop and mobile browsers.
- Added multiple editable production lines and HLA, PCB, PCBA, chamber, aging, and individual-finishing templates.
- Added regular, automatic-machine, batch/chamber, panel, depaneling, queue, transfer, bottleneck, and finite-target simulation behavior.
- Added scheduled, full-batch, and full-or-scheduled batch start rules with final-incomplete-batch completion handling.
- Added collapsible controls, process settings, process rows, presentation mode, zoom, dashboard pinning, and standalone offline sharing.
- Added a generic assembled-product release logo, Yousuf Yamani developer credit, and the regular-process cycle formula inside Process and resource settings.
- Increased Presentation-mode vertical spacing to prevent resource, conveyor, product, queue, and status-label overlap.
- Changed Bottleneck indicators to orange when every process is at least 65% busy, while retaining red for stronger imbalance, stopped resources, and invalid setups.
- Changed Batch / Chamber process tags from green to the same neutral style as Regular process tags.
- Added 1–100% Batch / Chamber processing with deterministic sampling, explicit bypass routing, adjusted effective capacity, and finite-target completion estimation.
- Reused the generic assembled-product logo as the embedded browser and shortcut icon without adding an external runtime asset.
- Added PNG/ICO generic-product assets and a one-click Windows Desktop shortcut creator because raw HTML file icons are controlled by Windows file associations.
- Added calculation, flow-integrity, responsive-interface, and standalone-package verification scripts.
