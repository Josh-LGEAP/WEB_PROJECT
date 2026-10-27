# BOP Report Hub module

This directory is an additive KAM/GTM module. It intentionally does not modify or import the Dashboard implementation.

Namespace contract:

- DOM IDs: `bop-report-hub-*`
- CSS classes: `bop-report-hub*`
- Data attributes: `data-bop-report-hub-*`
- JavaScript: private IIFE; no generic global functions or variables

Add future KAM/GTM reports to `bop-report-hub.registry.json`, one report object per displayed row. Unknown links must remain JSON `null`.
