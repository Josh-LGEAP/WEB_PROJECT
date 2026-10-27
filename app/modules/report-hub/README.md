# BOP Report Hub module

This directory is an additive KAM/GTM module. It intentionally does not modify or import the Dashboard implementation.

Namespace contract:

- DOM IDs: `bop-report-hub-*`
- CSS classes: `bop-report-hub*`
- Data attributes: `data-bop-report-hub-*`
- JavaScript: private IIFE; no generic global functions or variables

Add future KAM/GTM reports to `bop-report-hub.registry.json`, one report object per displayed row. Unknown links must remain JSON `null`. Report HTML and Tutorial HTML open in a new tab with `target="_blank"` and `rel="noopener noreferrer"`; Raw Excel keeps download semantics. Private Blob resources must use the same-origin `/api/report-resource` endpoint and also be allowlisted in `api/config/report-resources.json`; never place a SAS or storage key in this public registry. Direct public HTTPS Blob URLs remain supported as a temporary mode.
