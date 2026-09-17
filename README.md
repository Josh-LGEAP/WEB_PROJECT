# BOP Power BI Dashboard Portal

An internal landing page for the team's Power BI dashboards: clickable tiles that
open each report, plus a live refresh-status badge per semantic model.

- **Static Web App:** `PowerBI-List` (resource group `BOP`)
- **Front end:** plain HTML/CSS/JS in `app/` - no build step, no bundler
- **Backend:** Node 20 Azure Functions in `api/`, linked to the SWA as a BYOF backend
- **Registry:** a SharePoint list (or the Excel workbook) that owns the dashboard list

## Layout

```
app/                     front end (deployed as-is)
  index.html
  app.js
  styles.css
  assets/logo.png        <- your company logo
  assets/tiles/*.png     <- one image per dashboard
api/                     Functions backend
  src/auth.js            token acquisition + SWA principal parsing
  src/registry.js        reads the dashboard registry via Graph
  src/powerbi.js         Power BI REST calls + concurrency limiter
  src/state.js           Table Storage cache of refresh state
  src/functions/         registry, refreshes, refreshPoller (timer), health
infra/main.bicep         storage, Key Vault, Function App, RBAC, SWA link
infra/deploy.ps1         one-shot infrastructure deployment
infra/entra-setup.ps1    app registration + API permissions
staticwebapp.config.json auth, routing, security headers
```

## Setup order

1. **Registry.** Already created - `DashboardRegistry` on the LGEAP Business
   Operations Planning site. Its ids are pre-filled in
   `api/local.settings.json.example`:

   ```
   SP_SITE_ID = lgeteams.sharepoint.com,539f3f3f-7258-44a6-9dae-1442529f1997,a28881ff-8e20-4eb8-bdc4-34b9458868ee
   SP_LIST_ID = 0ef2e979-be17-4cb5-b9b3-c1c58201ff68
   ```

   Internal column names are NOT the display names - `Order` is stored as
   `Order0` (SharePoint reserves `Order`) and `Show on Page` as `ShowonPage`.
   `registry.js` already reads the real names; do not "correct" them.
2. **Infrastructure.** `pwsh infra/deploy.ps1`
3. **Identity.** `pwsh infra/entra-setup.ps1`, then complete the four manual steps
   it prints (admin consent, tenant setting, workspace access, store the secret).
4. **App settings.** On the Function App set `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
   (Key Vault reference), `SP_SITE_ID`, `SP_LIST_ID`. On the Static Web App set
   `AAD_CLIENT_ID` and `AAD_CLIENT_SECRET`, and replace `AAD_TENANT_ID` in
   `staticwebapp.config.json` with the real tenant guid.
5. **Assets.** Drop `logo.png` and the tile images into `app/assets/`.
6. **Deploy.** Push to `main`. The workflow deploys the front end and the API.

## How refresh status works

`refreshPoller` runs every 15 minutes, reads the registry, de-duplicates by
`DatasetId` (several reports often share one semantic model), calls
`GET /groups/{g}/datasets/{d}/refreshes?$top=1` at a concurrency of 4, and writes
the result to Table Storage. `/api/refreshes` serves that cache and classifies each
entry:

| Badge | Meaning |
|---|---|
| fresh | succeeded within `STALE_AFTER_HOURS` (default 26 h) |
| aging | succeeded, but between 26 and 52 h ago |
| stale | succeeded, older than 52 h |
| failed | last refresh returned `Failed` |
| running | refresh currently in progress |
| unknown | no history (DirectQuery / live connection) or not yet polled |

The page never invents a timestamp: a dataset with no refresh history renders as
"no refresh history", not as a fake date.

## Known constraints

- Tenant admin must enable **"Service principals can use Fabric APIs"**. Nothing
  works without it, and it is not self-service.
- The refreshes endpoint throttles; the poller limits concurrency and the page
  reads only the cache. Do not call Power BI from the browser.
- Tile links inherit the user's own Power BI permissions - a user without access
  to a report gets Power BI's own access-denied page, which is correct behaviour.
- The `Archived` column was created with a default of Yes. Every new row is
  archived on creation and therefore hidden from the page until someone clears
  it. Change the default to No in list settings.
- `Category` still holds SharePoint's placeholder choices (Choice 1/2/3).
  Replace them with real categories before adding rows.
- Natural-language Q&A is deliberately out of scope for v1. Use the Power BI Q&A
  visual first; a custom NL-to-DAX layer needs the `executeQueries` tenant setting
  and must run on a delegated token so row-level security is honoured.
