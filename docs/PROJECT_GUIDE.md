# LGEAP Business Intelligence Portal — Project Guide

> Repository: `Josh-LGEAP/WEB_PROJECT` (branch `main`)
> Document state: **2026-11-17**. Sections marked **(verify)** describe things that could not be confirmed from the repository alone and must be checked in Azure / GitHub.
> Note: this repository is currently **public**. This guide deliberately avoids tenant, subscription and service-principal IDs.

---

## 1. What this project is

A web portal for the LGEAP Business Operations Planning team. It gives users one place to:

1. **Open Power BI dashboards** as tiles grouped by category (Sell-In, Inventory, Sell-Out, GTM, Operations), and see **when each dashboard's data was last refreshed**.
2. **Open KAM / GTM report packages** (HTML report, tutorial HTML, raw Excel) from a "Report Hub".
3. (Not yet released) **AI Insights** (natural-language questions answered through DAX) and **Analytics Hub** (KPI charts). Both currently show a "Coming Soon" page.

It is a plain static site (no bundler, no framework) hosted on **Azure Static Web Apps (SWA)**, plus an **Azure Functions** backend (Node.js 20) for data that must not be fetched from the browser.

---

## 2. Current status (2026-11-17)

| Area | State |
|---|---|
| Dashboard tiles | **18 tiles** in 5 categories. Served from the code (`EMBEDDED` list in `app/app.js`) or from `/api/registry` when that API works. |
| New in this release | **Data Validation** tile (category `Operations`, order 40, no image → shows initials "DA"). |
| Refresh time on tiles | Shown from `app/refresh-status.json`, a **snapshot** created by `tools/update-refresh-status.js` with a person's own `az login`. Not real time. |
| `/api/refreshes` (live data) | Returns no items yet. Needs Power BI access for the Function App identity (admin request pending). When it has data, it overrides the snapshot per dataset. |
| `/api/registry` | Code supports three sources: `sharepoint` (default), `excel`, `static`. SharePoint failed with `Graph 401` because the Function App's Managed Identity lacks Graph `Sites.Read.All`. `static` (reads `api/config/dashboards.json`) avoids Graph entirely. **(verify)** whether the Function App has been redeployed and set to `REGISTRY_SOURCE=static`. |
| KAM / GTM Report Hub | KAM has one report (BSR Traffic Light) using **public Blob URLs**. GTM is empty. Raw Excel link is not set (`null`). |
| AI Insights / Analytics Hub | Code exists, UI intercepted by the Coming Soon module. |
| TEST site | Auto-deploys from every push to `main`. |
| Production site | **Manual** deploy (GitHub Actions → *Deploy Production* → *Run workflow*). |
| Production API deploy from CI | Job `deploy_api` runs only when the repository variable `FUNCTION_APP_NAME` is set; otherwise it is skipped. OIDC secrets are **not yet configured (verify)**. API is deployed manually with `func`. |
| Tests | 26 tests, all passing (`cd api && npm test`). |

**Datasets that currently show a failed latest refresh (from the 2026-11-17 snapshot):** SPEC Report (last success today), (AU) Online Price and (NZ) Online Price (last success 2026-10-02), SOR (no success in the last 10 attempts, last attempt 2025-10-21). (NZ) Store Sell-Out shows a refresh still "in progress" since 2026-11-10 and may be stuck.

---

## 3. Architecture

```
                         ┌────────────────────────────────────────────────────┐
   Browser               │  Azure Static Web Apps  (resource: PowerBI-List)   │
 (LG employee) ─────────►│  • serves /app (HTML/CSS/JS, no build)             │
   Entra ID sign-in      │  • enforces login on every route (`authenticated`) │
                         │  • forwards /api/* to the linked Function App      │
                         └───────────────┬────────────────────────────────────┘
                                         │ /api/*  (adds x-ms-client-principal header)
                                         ▼
                         ┌────────────────────────────────────────────────────┐
                         │ Azure Function App  bopportal-api-3w2cduwqci3xu    │
                         │  registry · refreshes · refreshPoller (timer, 15m)  │
                         │  ask · analytics · analyticsQuery · reportResource  │
                         │  health                                             │
                         └──┬───────────┬──────────────┬──────────────┬───────┘
                            │           │              │              │
                            ▼           ▼              ▼              ▼
                   Power BI REST   Microsoft Graph   Table Storage   Blob Storage
                   (refresh        (SharePoint list  `refreshstate`  (analytics CSV,
                    history,        "DashboardRegistry"               report SAS)
                    DAX queries)    – only when
                                    REGISTRY_SOURCE=sharepoint)
                            ▲
                            │ Azure OpenAI (only for /api/ask)
```

Two ways refresh times reach the screen:

```
 A) Snapshot (works today, manual)
    person runs tools/update-refresh-status.js  ──► app/refresh-status.json ──► git push ──► SWA
                  (az login → Power BI REST)                                   (static file)

 B) Live (needs Power BI permission for the Function identity)
    refreshPoller (every 15 min) ──► Table Storage ──► GET /api/refreshes ──► browser (every 5 min)
```

The browser merges both: `{ ...snapshot, ...api }` — the API wins per dataset.

---

## 4. Repository layout

```
.github/workflows/
  azure-static-web-apps.yml   TEST deploy: push to main, PR open/sync/close
  deploy-production.yml       PRODUCTION deploy: manual (workflow_dispatch)
app/                          Static site (deployed as the SWA app_location)
  index.html                  Page shell, nav, script/CSS includes
  app.js                      Dashboard tab + legacy AI/Analytics code (hash-protected)
  styles.css                  Dashboard styles (hash-protected)
  registry.json               Snapshot of the dashboard list (not read at runtime)
  refresh-status.json         Snapshot of latest refresh per dataset (generated)
  analytics.js / .css / fragment.html   Analytics Hub UI (hidden by Coming Soon)
  staticwebapp.config.json    SWA routes: login required, security headers
  staticwebapp.config.public.json   Open (no login) variant for demos only
  assets/logo.png, assets/tiles/*.png    Logo and tile images
  modules/report-hub/         KAM / GTM tabs (own JS, CSS, registry JSON)
  modules/coming-soon/        Intercepts AI Insights and Analytics Hub clicks
api/                          Azure Functions app (Node 20)
  src/functions/*.js          HTTP / timer functions (see section 6)
  src/registry.js             Dashboard list loader (sharepoint | excel | static)
  src/powerbi.js, powerbi-query.js   Power BI REST + DAX execution
  src/auth.js                 Tokens (Managed Identity or client secret) + principal parsing
  src/state.js                Table Storage access for refresh state
  src/authorization/policy.js Role / user / group policy evaluation
  src/report-resources.js     Allow-list of private blobs (future use)
  config/dashboards.json      Dashboard list for REGISTRY_SOURCE=static
  config/permissions/*.json   Server-side policies (tabs, reports)
  config/report-resources.json  Private blob allow-list
  test/*.test.js              Node test runner suites
tools/update-refresh-status.js  Creates app/refresh-status.json
infra/main.bicep, deploy.ps1, entra-setup.ps1   Azure resources and Entra app
qa/                           Regression baseline manifest, results, screenshots
docs/                         Operating notes (Korean) + this guide
config-examples/              Sample model / DAX configuration for AI and Analytics
```

---

## 5. Frontend

### 5.1 Page structure and tabs
`app/index.html` renders a header (user name from `/.auth/me`, sign-out link), a top navigation and one container per tab:

| Tab | Handler | Content |
|---|---|---|
| Dashboard | `app/app.js` | Tiles grouped by category, search box, status pills |
| KAM, GTM | `app/modules/report-hub/bop-report-hub.js` | Report rows with Report HTML / Tutorial HTML / Raw Excel actions |
| AI Insights, Analytics Hub | `app/modules/coming-soon/bop-coming-soon.js` | "Coming Soon" panel (the legacy handlers in `app.js` are blocked in the capture phase) |

### 5.2 Dashboard tab — load sequence (`app/app.js`)
1. `showUser()` reads `/.auth/me` and shows the signed-in user.
2. `main()` runs three requests in parallel:
   - `/api/registry` → dashboard list. If the call fails or returns no rows, the embedded `EMBEDDED` array is used.
   - `/api/refreshes` → live refresh state (may be empty).
   - `refresh-status.json` → committed snapshot.
3. Refresh entries are merged: `{ ...snapshotItems, ...apiItems }`. Snapshot entries get their health computed in the browser (`healthOf`, same rules as the API).
4. `render()` groups dashboards by `category` in the order they appear (the list is sorted by `order`), builds tiles, updates the status pills and the footer note.
5. `setInterval(main, 5 min)` repeats the whole sequence.

Categories are **not hard-coded**. A new `category` string creates a new section automatically; the `order` value decides where it appears (current maximum is 40 = Data Validation, in `Operations`).

### 5.3 Tile content
- Image: `assets/tiles/<image>`. If `image` is empty, a placeholder with the first two letters of the name is shown.
- Time line: the **last successful refresh** (`lastSuccessTime`), falling back to `endTime`. Format `DD Mon, HH:mm - N h ago` in Sydney time.
- If the latest attempt failed: red dot and `Last success …` (or `Failed …` when there is no success in the last 10 attempts).
- Dot colours / status: `fresh` ≤ 26 h, `aging` ≤ 52 h, `stale` older, `failed`, `running` (a refresh in progress), `unknown` (no data at all). The 26 h threshold is `STALE_AFTER_HOURS`; datasets that refresh weekly will therefore look "stale" even when healthy.
- Footer note: `Refresh status as at …` (live API data present) or `Refresh times from snapshot taken …` (snapshot only).

### 5.4 Report Hub (KAM / GTM)
Defined in `app/modules/report-hub/bop-report-hub.registry.json` (tabs + reports). Each report has three links (`reportHtml`, `tutorialHtml`, `rawExcel`); a `null` link renders a disabled button. HTML opens in a new tab (`noopener noreferrer`), Raw Excel uses the `download` attribute. Current links are **public Blob URLs** in storage account `lgeapbop`, container `bi-portal`. The `authorization` block hides tabs/reports in the UI only — it is **not** a security boundary for public Blob links. A private alternative (`/api/report-resource`, short-lived user-delegation SAS) is implemented but unused. Details: `docs/REPORT_RESOURCE_ACCESS.md`, `docs/AUTHORIZATION.md`.

### 5.5 Namespacing rule
New modules must not touch the Dashboard code. They use `bop-*` ids/classes/data attributes and a private IIFE. Regression tests enforce this.

---

## 6. Backend (Azure Functions)

All HTTP functions use `authLevel: anonymous` because SWA enforces sign-in in front of them. Most functions return **401 when the `x-ms-client-principal` header is missing**. Because the Function App also has its own `*.azurewebsites.net` address, make sure it only accepts traffic from SWA (a linked backend configures this) **(verify: opening the Function App URL directly should return 401/403)**.

| Function | Route | Purpose |
|---|---|---|
| `registry` | `GET /api/registry[?refresh=1]` | Dashboard list; in-process cache 5 min |
| `refreshes` | `GET /api/refreshes` | Latest refresh per dataset + computed `health` |
| `refreshPoller` | timer, `0 */15 * * * *` | Reads the registry, de-duplicates datasets, calls Power BI (4 at a time), writes to Table `refreshstate` |
| `ask` | `POST /api/ask` | AI Q&A: Azure OpenAI writes DAX → Power BI `executeQueries` (must start with `EVALUATE`, max 1000 rows) → second call summarises. UI currently hidden |
| `analyticsQuery` | `POST /api/analyticsQuery` | Runs configured DAX per dataset |
| `analytics` | `GET /api/analytics` | Streams a CSV blob and returns KPIs (15 min cache). **Has no principal check** |
| `reportResource` | `GET /api/report-resource` | Policy check, then 302 to a 5-minute user-delegation SAS. Unused today |
| `health` | `GET /api/health` | `{ ok: true }` |

### 6.1 Dashboard list sources (`REGISTRY_SOURCE`)
| Value | Reads | Needs |
|---|---|---|
| `sharepoint` (default) | SharePoint list `DashboardRegistry` via Graph (`SP_SITE_ID`, `SP_LIST_ID`) | Graph application permission `Sites.Read.All` for the identity |
| `excel` | Excel table via Graph | `GRAPH_DRIVE_ID`, `GRAPH_ITEM_ID`, `REGISTRY_TABLE_NAME` |
| `static` | `api/config/dashboards.json` shipped in the package | Nothing external |

Rows are kept only if `visible`, not `archived`, have a name and a URL beginning with `https://app.powerbi.com/`.

### 6.2 Identity used by the API
`api/src/auth.js`: if `AZURE_CLIENT_SECRET` is set, a service principal (`ClientSecretCredential`) is used; otherwise `DefaultAzureCredential`, i.e. the Function App's **system-assigned Managed Identity** (current configuration — no client id/secret are set). Note that if `AZURE_TENANT_ID`, `AZURE_CLIENT_ID` and `AZURE_CLIENT_SECRET` are all set, `DefaultAzureCredential` in `state.js` / `analytics.js` will also authenticate as that service principal, which then needs the Storage roles.

### 6.3 Function App settings
| Setting | Purpose |
|---|---|
| `AZURE_TENANT_ID` | Tenant for token requests |
| `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET` | Optional service principal (not currently set) |
| `REGISTRY_SOURCE` | `sharepoint` / `excel` / `static` |
| `SP_SITE_ID`, `SP_LIST_ID` | SharePoint list (added; used only for `sharepoint`) |
| `STORAGE_ACCOUNT_NAME`, `STATE_TABLE` | Table Storage for refresh state (`refreshstate`) |
| `REFRESH_POLL_CRON`, `STALE_AFTER_HOURS` | Poll interval (15 min) and staleness threshold (26 h) |
| `PBI_SCOPE`, `GRAPH_SCOPE` | Token scopes (defaults are correct) |
| `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_DEPLOYMENT`, `PBI_MODEL_CONFIG_JSON`, `PBI_ANALYTICS_QUERIES_JSON` | AI / Analytics |
| `ANALYTICS_STORAGE_ACCOUNT`, `ANALYTICS_CONTAINER`, `ANALYTICS_BLOB_NAME`, `ANALYTICS_CACHE_MINUTES` | Analytics CSV source (defaults: `lgeapbop`, `bi-portal`, `store_sellout_au.csv`, 15) |
| `ALLOW_LOCAL_UNAUTHENTICATED` | **Local development only.** If `true`, `/api/ask` accepts anonymous calls. Remove or set `false` in production |
| `AzureWebJobsStorage*`, `FUNCTIONS_*`, `WEBSITE_*`, `APPLICATIONINSIGHTS_CONNECTION_STRING` | Platform settings |

---

## 7. Data flows

### 7.1 Opening the portal
```
Browser ─► SWA: GET / ─► not signed in? 401 ─► redirect /.auth/login/aad ─► Entra ID
        ◄─ signed in: index.html, app.js, styles.css, registry/refresh JSON, tile images
        ─► GET /.auth/me  (user name, roles)
        ─► GET /api/registry     ──► Function ──► (static file | SharePoint via Graph)
        ─► GET /api/refreshes    ──► Function ──► Table Storage
        ─► GET refresh-status.json (static file)
```

### 7.2 Producing the snapshot (current method)
```
az login
node tools/update-refresh-status.js
   ├─ token:  az account get-access-token --resource https://analysis.windows.net/powerbi/api
   ├─ list:   api/config/dashboards.json  (unique workspace/dataset pairs, 15 today)
   ├─ call:   GET groups/{ws}/datasets/{ds}/refreshes?$top=10   (read-only, 4 parallel, retries on 429)
   └─ write:  app/refresh-status.json  { generatedAt, items: { datasetId: { status, startTime, endTime, lastSuccessTime, refreshType } } }
git add / commit / push  ──►  TEST auto-deploy  ──►  run "Deploy Production" for production
```
This is the same REST call as `Invoke-PowerBIRestMethod -Url "groups/<ws>/datasets/<ds>/refreshes?$top=1"` in PowerShell, using the operator's own permissions. **Never store a personal account or its token in the server or in GitHub.**

### 7.3 Live refresh status (target method)
`refreshPoller` → Power BI → Table `refreshstate` → `/api/refreshes`. Requires, for the Function App's identity (admin tasks):
1. Membership of the security group allowed in the Power BI tenant setting *"Service principals can use Fabric APIs"*.
2. **Viewer** (or higher) on workspaces `(BOP) Reports Share` and `(TEMP) Reports`.
3. If `REGISTRY_SOURCE=sharepoint`: Graph `Sites.Read.All`. Not needed with `static`.

### 7.4 Where the dashboard list lives
| Place | Role |
|---|---|
| `app/app.js` → `EMBEDDED` | Browser fallback; used whenever `/api/registry` fails (this is what production shows when the API is broken) |
| `api/config/dashboards.json` | Served by `/api/registry` when `REGISTRY_SOURCE=static` |
| `app/registry.json` | Committed snapshot, **not read at runtime** |
| SharePoint list `DashboardRegistry` (site `O365_196129`, 16 items on 2026-11-17) | Used only for `sharepoint`; **not kept in sync** |

The first three must always be identical; a test enforces it (`api/test/dashboard-sources.test.js`).

---

## 8. Authentication and authorization

- **Sign-in:** `app/staticwebapp.config.json` requires the `authenticated` role for `/*` and `/api/*`; a `401` redirects to `/.auth/login/aad` (Microsoft Entra ID). Security headers: `nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Cache-Control: no-store`.
- **API trust:** functions read the `x-ms-client-principal` header added by SWA.
- **UI visibility:** Report Hub tabs and reports have `authorization` objects (`allowedRoles`, `allowedUsers`, `entraGroupObjectIds`). This only hides items in the browser.
- **Server policies:** `api/config/permissions/*.json` evaluated by `api/src/authorization/policy.js` (denied roles win, then users, groups, roles; missing policy = deny). Used by `/api/report-resource`.
- **Custom roles / groups:** assigning SWA roles and mapping Entra groups to roles is described in `docs/AUTHORIZATION.md`.
- **Public content:** the KAM report and tutorial Blobs are public. Anyone with the URL can open them without signing in.

---

## 9. Azure and external resources

| Resource | Notes |
|---|---|
| Resource group `BOP` | Contains the resources below |
| Static Web App `PowerBI-List` | Standard plan; production host `ashy-hill-06cc70f00.7.azurestaticapps.net`; Function App linked as backend |
| Function App `bopportal-api-3w2cduwqci3xu` | Linked to the SWA; created from `infra/main.bicep` (Linux, Node 20, system-assigned identity) |
| Function App `bopportal-api-v2` | Separate app holding Analytics-style settings (looks like a Flex Consumption app). **Not linked, not used by this repository's pipeline (verify)** |
| Storage account `stbopportal…` | Table `refreshstate`; host storage for the Function App |
| Storage account `lgeapbop`, container `bi-portal` | Public Blob for KAM reports/tutorial; analytics CSV |
| Key Vault `kv-bopportal-…` | Intended for the client secret (Key Vault reference) |
| Application Insights `bopportal-ai` + Log Analytics `bopportal-logs` | Logs; use Function App → Log stream for live debugging |
| Entra app registration `BOP Dashboard Portal` | Created by `infra/entra-setup.ps1`; **(verify)** whether it exists and whether admin consent was granted |
| SharePoint list `DashboardRegistry` | Site `lgeteams.sharepoint.com/sites/O365_196129`; legacy source for the dashboard list |
| Power BI workspaces | `(BOP) Reports Share` (all tiles), `(TEMP) Reports` |
| Azure OpenAI | Only for `/api/ask` |

---

## 10. CI/CD and deployment

### 10.1 TEST — `.github/workflows/azure-static-web-apps.yml`
- Triggers: push to `main`; pull request opened / synchronize / reopened / closed.
- Job `build_and_deploy`: uploads `app/` (no build) using secret `AZURE_STATIC_WEB_APPS_API_TOKEN_TEST`. It also passes `api_location: "api"`, which makes SWA try to deploy managed functions to the TEST site — **decide whether TEST should have an API**; set `api_location: ""` if not.
- Job `deploy_api`: disabled (`if: false`).
- Job `close_pr`: on PR close, uses secret `AZURE_STATIC_WEB_APPS_API_TOKEN` (note the different secret name — **verify it exists**).

### 10.2 PRODUCTION — `.github/workflows/deploy-production.yml`
- Trigger: **manual only** (`workflow_dispatch`).
- Job `build_and_deploy_job`: uploads `app/` with secret `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` and `api_location: ""` (the API comes from the linked Function App). It logs a harmless warning for the unsupported input `skip_api_build` and an Oryx message "Could not detect the language" — both expected for a static site.
- Job `deploy_api`: runs only if the repository variable `FUNCTION_APP_NAME` is set. It needs OIDC secrets `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` in GitHub environment `production`, and a federated credential for that environment.
- The workflow deploys the **committed code of the branch you choose** (normally `main`). Always confirm the commit hash in the checkout step of the run log.

### 10.3 Deploying the API without CI
```powershell
az login
cd C:\portal_v1\api
npm ci
func azure functionapp publish bopportal-api-3w2cduwqci3xu
```
Then restart the Function App in the portal (the registry cache is in memory). Prerequisites: Azure Functions Core Tools v4 and `az login`. If `az login` fails with a token-cache decryption error, run `az account clear`, delete `%USERPROFILE%\.azure\msal_token_cache.bin`, and log in again.

### 10.4 One-time infrastructure
`infra/deploy.ps1` (Bicep: Function App, storage, table, Key Vault, App Insights, role assignments, SWA link) and `infra/entra-setup.ps1` (app registration, permissions, secret). Manual follow-ups are printed by the scripts (admin consent, Power BI tenant setting, workspace access, Key Vault secret).

---

## 11. Git usage guide

### 11.1 Setup
```powershell
git clone https://github.com/Josh-LGEAP/WEB_PROJECT.git C:\portal_v1
cd C:\portal_v1
git config user.name  "<your name>"
git config user.email "<your email>"
cd api; npm ci; cd ..        # installs API dependencies (needed for tests)
```
`api/node_modules` and `api/local.settings.json` are git-ignored; never commit them or any secret, token or `.env` file.

### 11.2 Everyday cycle
```powershell
git checkout main
git pull origin main                 # always start from the latest
git status -sb                       # what changed?
# ... edit files ...
cd api; npm test; cd ..              # all tests must pass
git diff                             # review the change
git add <file1> <file2> ...          # add files by name, not "git add ."
git commit -m "Short, imperative summary of the change"
git push origin main                 # triggers the TEST deployment
```
Useful checks: `git log --oneline -10`, `git show --stat HEAD`, `git diff origin/main` (what is not pushed yet).

### 11.3 Safer way: branch + pull request
```powershell
git checkout -b feature/add-dashboard
# edit, test, commit as above
git push -u origin feature/add-dashboard
```
Open a pull request into `main` on GitHub. The TEST workflow runs for the PR (preview environment) and is cleaned up when the PR closes. Merge when the checks are green.

### 11.4 What a push triggers
| Action | Result |
|---|---|
| Push / merge to `main` | TEST SWA is redeployed automatically |
| GitHub → Actions → **Deploy Production** → **Run workflow** (branch `main`) | PRODUCTION static site is redeployed (sign in to GitHub; the button is hidden when signed out or without write access) |
| `func azure functionapp publish …` | API code on the Function App |

A push never changes production by itself, and a static deploy never changes the API.

### 11.5 Problems and rollback
| Situation | Command |
|---|---|
| `rejected … non-fast-forward` on push | `git pull --rebase origin main` then `git push origin main` |
| Undo a pushed change safely | `git revert <commit>` then push, then run Deploy Production again |
| Discard uncommitted edits to one file | `git restore <file>` |
| Unstage a file | `git restore --staged <file>` |
| See who changed a line | `git blame <file>` |
| Windows `LF will be replaced by CRLF` warning | Harmless |

Do not use `git reset --hard` or force-push on `main`.

### 11.6 Commit conventions
Short imperative first line (`Add Data Validation dashboard`), optional bullet list for details. Commits produced with Claude Code end with the line `🤖 Generated with Claude Code` (organisation policy).

---

## 12. Common tasks (runbooks)

### 12.1 Add or change a dashboard tile
1. Edit the entry in **all three** places so they are identical: `EMBEDDED` in `app/app.js`, `app/registry.json` (also update `count`), `api/config/dashboards.json`.
   Fields: `order` (unique), `name`, `category`, `description`, `url` (must start with `https://app.powerbi.com/`), `image` (file in `app/assets/tiles/`, or empty), `owner`, `workspaceId`, `datasetId`, `visible`, `archived`.
   New category = new `category` string; use a larger `order` to place it last.
2. Add the image (16:9, ≥ 640×360 PNG) to `app/assets/tiles/` if you have one.
3. Refresh the regression baseline (section 13.2).
4. If the dataset is new: `az login` then `node tools/update-refresh-status.js` and include `app/refresh-status.json`.
5. `cd api && npm test`.
6. Commit and push (TEST), then run **Deploy Production**.
7. If the API serves the list (`REGISTRY_SOURCE=static`), also publish the API (10.3).
To find a report's dataset: Power BI → report → Settings, or list reports in the workspace through the REST API and read `datasetId`.

### 12.2 Update refresh times (snapshot)
Two ways, both run with your own `az login`. The footer shows when the snapshot was taken. Stop doing this once `/api/refreshes` has live data.

**Blob (recommended, no deploy):** `node tools/update-refresh-status.js --upload` uploads the result to `https://lgeapbop.blob.core.windows.net/bi-portal/refresh-status/refresh-status.json`. TEST and production read it immediately. Requirements: your account has *Storage Blob Data Contributor* on `lgeapbop`, the container allows public read, and the storage account's Blob CORS rules allow `GET` from the SWA origins. The portal uses whichever of the Blob copy and `app/refresh-status.json` has the newer `generatedAt`, and silently falls back to the file if the Blob is unreachable.

To run it hourly on a Windows PC that stays signed in:
```powershell
schtasks /Create /SC HOURLY /MO 1 /TN "BOP Refresh Status" /F /TR "cmd /c cd /d C:\portal_v1 && node tools\update-refresh-status.js --upload"
```
It stops working when the PC is off or the `az` sign-in expires.

**Git (needs a deploy):** `.\tools\publish-refresh-status.ps1` (or run the script, then commit `app/refresh-status.json`), push, then run Deploy Production.

### 12.3 Add a KAM / GTM report
Add an object to `reports` in `app/modules/report-hub/bop-report-hub.registry.json` (keep unknown links as `null`), add a matching policy in `api/config/permissions/reports.permissions.json`, upload the HTML/Excel to Blob with correct headers (`Content-Type: text/html`, `Content-Disposition: inline` for HTML), then deploy. Private Blobs must go through `/api/report-resource` and be allow-listed in `api/config/report-resources.json`.

### 12.4 Switch the API to the repository list
Publish the API (10.3), set `REGISTRY_SOURCE=static` in the Function App, restart, then open `/api/registry?refresh=1` while signed in; expect `"count":18`.

### 12.5 Turn on live refresh status
Ask admins to grant the Function App identity Power BI access (7.3). Run `refreshPoller` once from the portal (Functions → refreshPoller → Code + Test → Run); the log must read `Polled N semantic models, 0 errored`. Then `/api/refreshes` returns `items` and the screen note changes to `Refresh status as at …`.

---

## 13. Testing

### 13.1 Run
```powershell
cd C:\portal_v1\api
npm test          # node --test
```
| Suite | Checks |
|---|---|
| `dashboard-regression.test.js` | SHA-256 of protected files, tile assets, dashboard projection, HTML block and namespace isolation |
| `dashboard-sources.test.js` | `EMBEDDED`, `app/registry.json` and `api/config/dashboards.json` are identical; `count`; unique `order`; `static` source works |
| `refresh-status.test.js` | Snapshot has a date and an entry for every dataset |
| `registry-contract.test.js` | Report Hub registry shape and link behaviour |
| `report-resources.test.js`, `authorization.test.js` | Private resource allow-list and policy evaluation |

### 13.2 Regression baseline (`qa/dashboard-baseline-manifest.json`)
`app/app.js`, `app/registry.json`, `api/src/registry.js` and several API files are protected by hash. When you intentionally change one, regenerate the baseline:
```powershell
node -e "
const fs=require('fs'),c=require('crypto');
const sha=f=>c.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const r=JSON.parse(fs.readFileSync('app/registry.json','utf8'));
const p='qa/dashboard-baseline-manifest.json',m=JSON.parse(fs.readFileSync(p,'utf8'));
for(const f of ['app/app.js','app/registry.json','api/src/registry.js']) m.coreFileSha256[f]=sha(f);
m.dashboardRegistryProjection=r.dashboards.map(i=>({order:i.order,name:i.name,category:i.category,url:i.url,image:i.image,workspaceId:i.workspaceId,datasetId:i.datasetId,visible:i.visible,archived:i.archived}));
m.dashboardCount=r.dashboards.length;
m.powerBiLinkCount=r.dashboards.filter(i=>i.url.startsWith('https://app.powerbi.com/')).length;
fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');"
```
Add any other changed protected file (listed in `coreFileSha256`) to the loop.

### 13.3 Local preview
The site is static; serving `app/` with any static server shows the Dashboard tab using `EMBEDDED` and `refresh-status.json` (`/api/*` and `/.auth/*` will not respond locally). Running the full SWA emulator with the API was not verified in this repository.

---

## 14. Troubleshooting

| Symptom | Likely cause and action |
|---|---|
| All tiles show "Unknown" | No refresh data: `refresh-status.json` missing/stale and `/api/refreshes` empty. Run 12.2 or enable 12.5 |
| `/api/…` returns 404 | The Function App is not linked to the SWA, or no code is deployed. SWA → APIs shows the linked backend; Function App → Functions lists functions |
| `/api/registry` → `Registry unavailable` | Log stream shows the cause. `Graph 401/403` = missing `Sites.Read.All`: use `REGISTRY_SOURCE=static` or ask an admin |
| `/api/refreshes` → `{"polled":0,"items":{}}` | `refreshPoller` has not succeeded yet (runs every 15 min, not on startup). Run it manually and read the log |
| Poller says `N errored` | Power BI access for the identity (7.3) or Table Storage role missing; per-dataset messages are not logged |
| Production shows an old link, TEST is correct | `/api/registry` on the Function App returns an old `dashboards.json` (publish the API again) or a cached page (Ctrl+F5 / private window) |
| *Run workflow* button not visible | Signed out of GitHub, no write access, or the wrong workflow selected in the left list |
| Workflow log "Could not detect the language" | Expected for the static site |
| `az login` → decryption failed | Clear the Azure CLI token cache (see 10.3) |
| `AADSTS50105` with Microsoft Graph PowerShell | The tenant blocks that app for your account; an admin must run the permission commands |
| Test says `<file> changed` | You edited a protected file; update the baseline (13.2) |

---

## 15. Known issues and recommendations

1. **Repository is public.** It exposes internal IDs, Power BI links and org structure. Make it private (GitHub → Settings → General → Danger Zone).
2. **Live refresh and Graph permissions are pending admin work** (7.3). Until then the snapshot is manual.
3. **`ALLOW_LOCAL_UNAUTHENTICATED` exists on the production Function App.** Remove it or set `false`.
4. **`/api/analytics` has no principal check** and should use the same 401 guard as the other functions before the Analytics Hub is enabled.
5. **Direct access to the Function App URL** must be blocked (verify).
6. **TEST workflow** still passes `api_location: "api"`; decide between "no API on TEST" and "separate Function App for TEST".
7. **`close_pr` uses a different secret name** than the TEST deploy job.
8. **`skip_api_build`** is not a valid input of the deploy action (warning only).
9. **`npm ci` reports 3 vulnerabilities** (1 low, 2 high). Review with `npm audit` before running `npm audit fix`, because it rewrites `package-lock.json`.
10. **SharePoint list and repository list can diverge.** If SharePoint is no longer maintained, keep `REGISTRY_SOURCE=static` and treat `api/config/dashboards.json` as the single source (the other two copies are guarded by tests).
11. **Stale threshold of 26 h** marks weekly datasets as stale; consider per-dashboard expected frequency.
12. **Public KAM Blobs** have no authentication; move them behind `/api/report-resource` when private access is required.
13. **Unused / legacy files:** `api/src/auth.patch.js` (comment only), `staticwebapp.config.full.json`, `app/analytics-fragment.html`, `DEPLOY-NOW.md` (old manual CLI deployment to a different folder).
14. **Datasets with failed refreshes** (SPEC Report, AU/NZ Online Price, SOR, and a possibly stuck NZ Store Sell-Out) should be checked by their owners in Power BI → Refresh history.

---

## 16. Reference

### GitHub secrets and variables
| Name | Used by |
|---|---|
| `AZURE_STATIC_WEB_APPS_API_TOKEN_TEST` | TEST deploy |
| `AZURE_STATIC_WEB_APPS_API_TOKEN_PRODUCTION` | PRODUCTION deploy |
| `AZURE_STATIC_WEB_APPS_API_TOKEN` | `close_pr` job of the TEST workflow |
| `AZURE_CLIENT_ID`, `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID` (environment `production`) | Optional OIDC login for `deploy_api` |
| variable `FUNCTION_APP_NAME` | Enables and targets `deploy_api` |

### Dashboards in the portal (18)
| Category | Dashboards |
|---|---|
| Sell-In | Sales and Order · Sell-In History · CE Regroup (Store Sell-In) · SPEC Report |
| Inventory | Inventory · LTI |
| Sell-Out | Ch. PSI – CE / IT / NZ · (AU) Store Sell-Out · (NZ) Store Sell-Out |
| GTM | (AU) Online Price · (NZ) Online Price · Display Share · (AU) SoV · (NZ) SoV · SOR |
| Operations | Data Validation |

Several dashboards share one semantic model (Sell-In History + CE Regroup; the three Ch. PSI dashboards), so the 18 tiles map to **15 unique datasets**.

### Related documents
`docs/AUTHORIZATION.md` · `docs/REPORT_RESOURCE_ACCESS.md` · `docs/DASHBOARD_LINK_SOURCES.md` · `docs/DASHBOARD_REGRESSION.md` · `docs/APPLY.md` · `docs/CHANGED_FILES.md` (Korean operating notes).
