# LGEAP Business Intelligence Portal — additive KAM/GTM module

The existing Dashboard implementation is preserved as the default and initial view. KAM and GTM are added as an isolated Report Hub module.

## Dashboard preservation boundary

These original files are byte-identical to `portal_v1_source.zip`:

- `app/app.js`
- `app/styles.css`
- `app/registry.json`
- `app/assets/logo.png`
- all files under `app/assets/tiles/`

`app/index.html` keeps the original Dashboard DOM block and controls unchanged; it only adds two navigation buttons, two hidden module roots, a namespaced stylesheet/script, and corrects the malformed Chart.js script tag.

## Added module

- `app/modules/report-hub/bop-report-hub.js`
- `app/modules/report-hub/bop-report-hub.css`
- `app/modules/report-hub/bop-report-hub.registry.json`

The module uses only `bop-report-hub-*` IDs/classes/data attributes and a private JavaScript IIFE. AI Insights and Analytics Hub are intercepted by the separate `bop-coming-soon` module without invoking their legacy handlers. V4 opens the user-confirmed public Report HTML and Tutorial HTML Blob URLs directly in safe new tabs; Raw Excel remains disabled until its exact full URL is confirmed. The authenticated `/api/report-resource` and short-lived user-delegation SAS implementation is retained for a future private-Blob migration. See `docs/DASHBOARD_LINK_SOURCES.md`, `docs/DASHBOARD_REGRESSION.md`, `docs/REPORT_RESOURCE_ACCESS.md`, `docs/AUTHORIZATION.md`, and `docs/APPLY.md`.
