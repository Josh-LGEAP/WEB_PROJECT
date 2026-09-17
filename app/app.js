// Dashboard list, embedded so the page renders with no backend and no extra
// requests. The API overrides this once the Functions backend is connected.
const EMBEDDED = [
  {
    "order": 1,
    "name": "Sales and Order Dashboard",
    "category": "Sell-In",
    "description": "",
    "url": "https://app.powerbi.com/links/mmn_QAKOou?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "so.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "ffdb364f-9e18-425c-8cd8-afe3dfab77c1",
    "visible": true,
    "archived": false
  },
  {
    "order": 2,
    "name": "Sell-In History Dashboard",
    "category": "Sell-In",
    "description": "",
    "url": "https://app.powerbi.com/links/ziCufy1qW0?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "sellin_history.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "b50b0164-913c-4514-b63f-619d9122dd44",
    "visible": true,
    "archived": false
  },
  {
    "order": 3,
    "name": "CE Regroup Dashboard (Store Sell-In)",
    "category": "Sell-In",
    "description": "",
    "url": "https://app.powerbi.com/links/IdfaCmSEy0?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "regroup.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "b50b0164-913c-4514-b63f-619d9122dd44",
    "visible": true,
    "archived": false
  },
  {
    "order": 4,
    "name": "SPEC Report",
    "category": "Sell-In",
    "description": "",
    "url": "https://app.powerbi.com/links/9axsmjN4NE?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "spec.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "",
    "visible": true,
    "archived": false
  },
  {
    "order": 10,
    "name": "Inventory Dashboard",
    "category": "Inventory",
    "description": "",
    "url": "https://app.powerbi.com/links/IMFaNQUoy6?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "inv.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "ed264e94-8987-4097-aba1-481d19336f10",
    "visible": true,
    "archived": false
  },
  {
    "order": 11,
    "name": "LTI Dashboard",
    "category": "Inventory",
    "description": "",
    "url": "https://app.powerbi.com/links/KAGeKgRvTL?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "lti.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "7175ccfa-78a1-42cc-9830-c8c51f863efb",
    "visible": true,
    "archived": false
  },
  {
    "order": 20,
    "name": "Ch. PSI Dashboard - CE",
    "category": "Sell-Out",
    "description": "",
    "url": "https://app.powerbi.com/links/dnylkqfNZC?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "ch_psi_ce.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "1b186906-7c7a-40bf-a328-128adaa94868",
    "visible": true,
    "archived": false
  },
  {
    "order": 21,
    "name": "Ch. PSI Dashboard - IT",
    "category": "Sell-Out",
    "description": "",
    "url": "https://app.powerbi.com/links/Ox_vjswp7R?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "ch_psi_it.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "1b186906-7c7a-40bf-a328-128adaa94868",
    "visible": true,
    "archived": false
  },
  {
    "order": 22,
    "name": "Ch. PSI Dashboard - NZ",
    "category": "Sell-Out",
    "description": "",
    "url": "https://app.powerbi.com/links/V4Zf_68VW0?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "ch_psi_nz.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "1b186906-7c7a-40bf-a328-128adaa94868",
    "visible": true,
    "archived": false
  },
  {
    "order": 23,
    "name": "(AU) Store Sell-Out",
    "category": "Sell-Out",
    "description": "",
    "url": "https://app.powerbi.com/links/j-6gRKOVYC?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "store_sellout_au.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "c2327efa-0513-41e9-8aa0-bc23ca3fcbe8",
    "visible": true,
    "archived": false
  },
  {
    "order": 24,
    "name": "(NZ) Store Sell-Out",
    "category": "Sell-Out",
    "description": "",
    "url": "https://app.powerbi.com/links/RumbgRkYBm?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "store_sell_out_nz.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "4aab36d0-0da8-4d50-9611-21ae5735d411",
    "visible": true,
    "archived": false
  },
  {
    "order": 30,
    "name": "(AU) Online Price",
    "category": "GTM",
    "description": "",
    "url": "https://app.powerbi.com/links/LXXNRjbIKP?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "au_online.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "2eebc3ae-598e-4b05-b3d2-7cc98e25e9b7",
    "visible": true,
    "archived": false
  },
  {
    "order": 31,
    "name": "(NZ) Online Price",
    "category": "GTM",
    "description": "",
    "url": "https://app.powerbi.com/links/92qRs_mFwU?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "nz_online_price.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "65c965c3-1fa2-4a61-b659-96bc2855f8ff",
    "visible": true,
    "archived": false
  },
  {
    "order": 32,
    "name": "Display Share",
    "category": "GTM",
    "description": "",
    "url": "https://app.powerbi.com/links/6-ObR-fCSH?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "display.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "fa0809d4-2c0d-4368-9f74-5879eb022b9e",
    "visible": true,
    "archived": false
  },
  {
    "order": 33,
    "name": "(AU) SoV (Share of Voice)",
    "category": "GTM",
    "description": "",
    "url": "https://app.powerbi.com/links/Sua9yZcxbf?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "au_sov.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "45d16feb-d2d8-4c13-ae76-96a0c1b4e965",
    "visible": true,
    "archived": false
  },
  {
    "order": 34,
    "name": "(NZ) SoV (Share of Voice)",
    "category": "GTM",
    "description": "",
    "url": "https://app.powerbi.com/links/gHYHzqSx9B?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "nz_sov.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "83c5891f-28f2-40da-86ac-4959f5471174",
    "visible": true,
    "archived": false
  },
  {
    "order": 35,
    "name": "SOR",
    "category": "GTM",
    "description": "",
    "url": "https://app.powerbi.com/links/yTWfCt5GlA?ctid=5069cde4-642a-45c0-8094-d0c2dec10be3&pbi_source=linkShare",
    "image": "sor.png",
    "owner": "",
    "workspaceId": "8ad98ef6-7036-4c54-a2d5-6710cf6c47c8",
    "datasetId": "2e668c8e-43bd-4488-aeb8-3761c98fecc6",
    "visible": true,
    "archived": false
  }
];

const SYD = 'Australia/Sydney';

const fmt = new Intl.DateTimeFormat('en-AU', {
  timeZone: SYD, day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false
});

const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function relative(iso) {
  if (!iso) return 'no refresh history';
  const mins = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (mins < 60) return `${mins} min ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)} h ago`;
  return `${Math.round(mins / 1440)} d ago`;
}

const LABEL = {
  fresh: 'Up to date', aging: 'Ageing', stale: 'Stale',
  failed: 'Refresh failed', running: 'Refreshing now', unknown: 'Unknown'
};

async function getJson(url) {
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.json();
}

/**
 * The API is the source of truth. registry.json is a snapshot committed with the
 * site so the page still renders before the backend identity is in place.
 */
async function loadRegistry() {
  try {
    const res = await fetch('/api/registry', { headers: { Accept: 'application/json' } });
    if (res.ok) {
      const live = await res.json();
      if (live.dashboards && live.dashboards.length) return { data: live, live: true };
    }
  } catch { /* backend not connected yet */ }
  return { data: { dashboards: EMBEDDED }, live: false };
}

function tile(d, refresh) {
  const health = refresh?.health || 'unknown';
  const when = refresh?.endTime ? `${fmt.format(new Date(refresh.endTime))} - ${relative(refresh.endTime)}` : LABEL[health];
  const thumb = d.image
    ? `<div class="thumb" style="background-image:url('assets/tiles/${encodeURIComponent(d.image)}')"></div>`
    : `<div class="thumb thumb-empty"><span>${esc(d.name.slice(0, 2).toUpperCase())}</span></div>`;
  return `
    <a class="tile" href="${esc(d.url)}" target="_blank" rel="noopener noreferrer"
       data-search="${esc((d.name + ' ' + d.category + ' ' + d.description + ' ' + d.owner).toLowerCase())}">
      ${thumb}
      <div class="tile-body">
        <div class="tile-title">${esc(d.name)}</div>
        ${d.description ? `<div class="tile-desc">${esc(d.description)}</div>` : '<div class="tile-spacer"></div>'}
        <div class="tile-meta">
          <span class="dot ${health}" title="${LABEL[health]}"></span>
          <span>${esc(when)}</span>
          ${d.owner ? `<span class="owner">${esc(d.owner)}</span>` : ''}
        </div>
      </div>
    </a>`;
}

function render(dashboards, refreshes) {
  const byCat = new Map();
  for (const d of dashboards) {
    if (!byCat.has(d.category)) byCat.set(d.category, []);
    byCat.get(d.category).push(d);
  }

  document.getElementById('content').innerHTML = [...byCat.entries()].map(([cat, items]) => `
    <section class="section">
      <div class="section-head">
        <h2 class="category">${esc(cat)}</h2>
        <span class="section-count">${items.length}</span>
        <span class="section-rule"></span>
      </div>
      <div class="grid">${items.map(d => tile(d, refreshes[d.datasetId])).join('')}</div>
    </section>
  `).join('') || '<p class="empty">No dashboards are published to this page yet.</p>';

  const tally = { fresh: 0, aging: 0, stale: 0, failed: 0 };
  for (const d of dashboards) {
    const h = refreshes[d.datasetId]?.health;
    if (h in tally) tally[h]++;
  }
  for (const k of Object.keys(tally)) document.getElementById(`count-${k}`).textContent = tally[k];
  const note = document.getElementById('asof');
  note.textContent = window.__liveApi
    ? `Refresh status as at ${fmt.format(new Date())} Sydney time`
    : 'Refresh status not connected yet - showing the dashboard list only';
  document.getElementById('statusbar').hidden = false;
}

function wireSearch() {
  const box = document.getElementById('search');
  box.addEventListener('input', () => {
    const q = box.value.trim().toLowerCase();
    for (const el of document.querySelectorAll('.tile')) {
      el.style.display = !q || el.dataset.search.includes(q) ? '' : 'none';
    }
    for (const sec of document.querySelectorAll('.section')) {
      const any = [...sec.querySelectorAll('.tile')].some(t => t.style.display !== 'none');
      sec.style.display = any ? '' : 'none';
    }
  });
}

async function showUser() {
  try {
    const me = await (await fetch('/.auth/me')).json();
    const p = me.clientPrincipal;
    if (p) {
      document.getElementById('user-name').textContent = p.userDetails;
    } else {
      document.querySelector('.user').hidden = true;
    }
  } catch {
    document.querySelector('.user').hidden = true;
  }
}

async function main() {
  showUser();
  wireSearch();
  try {
    const [{ data: reg, live }, ref] = await Promise.all([
      loadRegistry(),
      getJson('/api/refreshes').catch(() => null)
    ]);
    if (!reg) return;
    window.__liveApi = live && !!ref;
    render(reg.dashboards, ref?.items || {});
  } catch (e) {
    document.getElementById('content').innerHTML =
      `<p class="error">Could not load the dashboard list. ${esc(e.message)}</p>`;
  }
}

main();
setInterval(main, 5 * 60 * 1000);


function showDashboard() {
  document.getElementById('content').style.display = '';
  document.getElementById('statusbar').style.display = '';
  document.querySelector('.toolbar').style.display = '';

  document.getElementById('ai-page').style.display = 'none';
  document.getElementById('analytics-page').style.display = 'none';
}

function showAI() {
  document.getElementById('content').style.display = 'none';
  document.getElementById('statusbar').style.display = 'none';
  document.querySelector('.toolbar').style.display = 'none';

  document.getElementById('analytics-page').style.display = 'none';
  document.getElementById('ai-page').style.display = '';

  document.getElementById('ai-page').innerHTML = `
    <div class="page-container">
      <h2>Ask AI</h2>

      <label for="ai-dataset">Dashboard / Dataset</label>
      <select id="ai-dataset">
        ${EMBEDDED
          .filter(d => d.datasetId && d.workspaceId)
          .map(d => `
            <option value="${esc(d.datasetId)}">
              ${esc(d.name)}
            </option>
          `)
          .join('')}
      </select>

      <textarea
        id="ai-question"
        rows="5"
        placeholder="Ask a question about the selected dashboard"
      ></textarea>

      <button id="ask-ai-btn" type="button">
        Ask AI
      </button>

      <div id="ai-result"></div>
    </div>
  `;

  document
    .getElementById('ask-ai-btn')
    .addEventListener('click', askAI);
}

async function askAI() {
  const datasetId =
    document.getElementById('ai-dataset').value;

  const question =
    document.getElementById('ai-question').value.trim();

  const result =
    document.getElementById('ai-result');

  const button =
    document.getElementById('ask-ai-btn');

  if (!datasetId) {
    result.innerHTML =
      '<p class="error">Please select a dataset.</p>';
    return;
  }

  if (!question) {
    result.innerHTML =
      '<p class="error">Please enter a question.</p>';
    return;
  }

  button.disabled = true;
  button.textContent = 'Analysing...';

  result.innerHTML = `
    <div class="ai-loading">
      Querying the selected Power BI semantic model...
    </div>
  `;

  try {
    const response = await fetch('/api/ask', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      body: JSON.stringify({
        datasetId,
        question
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(
        data.error ||
        `Ask AI request failed with status ${response.status}`
      );
    }

    result.innerHTML = `
      <div class="ai-answer">
        <h3>Answer</h3>
        <p>${esc(data.answer || 'No answer was returned.')}</p>

        ${
          data.dataset
            ? `<p class="ai-source">
                 Source: ${esc(data.dataset)}
               </p>`
            : ''
        }

        ${
          data.dax
            ? `
              <details class="ai-query-details">
                <summary>View generated DAX</summary>
                <pre>${esc(data.dax)}</pre>
              </details>
            `
            : ''
        }
      </div>
    `;
  } catch (error) {
    result.innerHTML = `
      <div class="error">
        <strong>Ask AI could not complete the request.</strong>
        <p>${esc(error.message)}</p>
      </div>
    `;
  } finally {
    button.disabled = false;
    button.textContent = 'Ask AI';
  }
}

function showAnalytics() {
  console.log('Analytics button clicked');

  document.getElementById('content').style.display = 'none';
  document.getElementById('statusbar').style.display = 'none';
  document.querySelector('.toolbar').style.display = 'none';

  document.getElementById('ai-page').style.display = 'none';

  const analyticsPage =
    document.getElementById('analytics-page');

  analyticsPage.style.display = '';
  analyticsPage.innerHTML = '';

  loadAnalyticsData();
}


window.addEventListener('load', () => {

  document.getElementById('nav-dashboard')
    .addEventListener('click', showDashboard);

  document.getElementById('nav-ai')
    .addEventListener('click', showAI);

  document.getElementById('nav-analytics')
    .addEventListener('click', showAnalytics);

});

async function loadAnalyticsData() {

  try {

    const res = await fetch('/api/analytics');

    const data = await res.json();

    console.log(data);

    document.getElementById('analytics-asof').innerText =
      `Rows : ${data.rowCount}`;

    document.getElementById('kpi-sellout-amt').innerText =
      data.kpis.sellOutAmt.toLocaleString();

    document.getElementById('kpi-sellout-qty').innerText =
      data.kpis.sellOutQty.toLocaleString();

    document.getElementById('kpi-display-qty').innerText =
      data.kpis.displayQty.toLocaleString();

    document.getElementById('kpi-sellable-qty').innerText =
      data.kpis.sellableQty.toLocaleString();

    new Chart(
      document.getElementById('chart-week'),
      {
        type: 'line',
        data: {
          labels: data.weeklySellOutAmt.map(x => x.label),
          datasets: [{
            label: 'Sell-Out Amount',
            data: data.weeklySellOutAmt.map(x => x.value),
            borderColor: '#a50034'
          }]
        }
      }
    );

  } catch (err) {

    console.error(err);

    document.getElementById('analytics-page').innerHTML =
      '<h3>Failed to load analytics data</h3>';

  }

}