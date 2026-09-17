/*
 * BI Portal Analytics
 *
 * Scalable structure:
 *   Portal
 *     -> /api/analytics?report=store_sellout_au
 *     -> Function App resolves report ID to an approved Blob file
 *
 * IMPORTANT:
 * - The browser sends a report ID, not a Blob file name.
 * - The Function App must maintain the secure report-to-blob mapping.
 * - Add future reports to REPORTS after the corresponding backend mapping exists.
 */

let analyticsCharts = [];

/*
 * ============================================================
 * REPORT REGISTRY
 * ============================================================
 *
 * Add future reports here.
 *
 * Example:
 *
 * inventory_au: {
 *   id: 'inventory_au',
 *   title: 'AU Inventory',
 *   description: 'Inventory position by product and channel',
 *   enabled: true,
 *   ...
 * }
 *
 * The id must match the report ID configured in the Function App.
 */

const REPORTS = {

  store_sellout_au: {
      title: 'Store Sell-Out AU',
      icon: '📈'
  },

  inventory_au: {
      title: 'Inventory AU',
      icon: '📦'
  },

  sellin_au: {
      title: 'Sell-In AU',
      icon: '💰'
  },

  online_price_au: {
      title: 'Online Price AU',
      icon: '🏷️'
  }

};

const REPORT_FILES = {

   store_sellout_au:
      'store_sellout_au.csv',

   inventory_au:
      'inventory_au.csv',

   sellin_au:
      'sellin_au.csv'

};

  /*
   * FUTURE REPORT EXAMPLE
   *
   * Add a comma after the closing brace above before enabling this.
   *
   * inventory_au: {
   *   id: 'inventory_au',
   *   title: 'AU Inventory',
   *   shortTitle: 'Inventory AU',
   *   description: 'Available and blocked inventory analytics',
   *   category: 'Inventory',
   *   enabled: true,
   *
   *   kpis: [
   *     {
   *       id: 'total-stock',
   *       title: 'Total Stock',
   *       dataPath: 'kpis.totalStock',
   *       format: 'quantity'
   *     }
   *   ],
   *
   *   charts: [
   *     {
   *       id: 'stock-by-pg',
   *       title: 'Stock by Product Group',
   *       dataPath: 'stockByProductGroup',
   *       type: 'bar',
   *       label: 'Stock Quantity',
   *       format: 'quantity'
   *     }
   *   ]
   * }
   */

const moneyFormatter = new Intl.NumberFormat('en-AU', {
  style: 'currency',
  currency: 'AUD',
  maximumFractionDigits: 0
});

const quantityFormatter = new Intl.NumberFormat('en-AU', {
  maximumFractionDigits: 0
});

const dateTimeFormatter = new Intl.DateTimeFormat('en-AU', {
  dateStyle: 'medium',
  timeStyle: 'short'
});

/*
 * ============================================================
 * BASIC HELPERS
 * ============================================================
 */

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[character]);
}

function getAnalyticsRoot() {
  return (
    document.getElementById('analytics-page') ||
    document.getElementById('analytics-view')
  );
}

function getEnabledReports() {
  return Object.values(REPORTS).filter(report => report.enabled);
}

function getDefaultReportId() {
  return getEnabledReports()[0]?.id || null;
}

function getValue(object, path, fallback = null) {
  if (!object || !path) return fallback;

  const value = path
    .split('.')
    .reduce((current, key) => current?.[key], object);

  return value ?? fallback;
}

function formatValue(value, format) {
  const numericValue = Number(value);

  if (!Number.isFinite(numericValue)) {
    return '-';
  }

  if (format === 'money') {
    return moneyFormatter.format(numericValue);
  }

  if (format === 'percent') {
    return `${numericValue.toFixed(1)}%`;
  }

  if (format === 'decimal') {
    return numericValue.toLocaleString('en-AU', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  return quantityFormatter.format(numericValue);
}

function destroyAnalyticsCharts() {
  analyticsCharts.forEach(existingChart => {
    try {
      existingChart.destroy();
    } catch {
      // Ignore an already-destroyed chart.
    }
  });

  analyticsCharts = [];
}

/*
 * ============================================================
 * PAGE RENDERING
 * ============================================================
 */

function renderAnalyticsShell(selectedReportId) {
  const root = getAnalyticsRoot();

  if (!root) {
    console.error(
      'Analytics page element was not found. Expected #analytics-page or #analytics-view.'
    );
    return false;
  }

  const reports = getEnabledReports();
  const selectedReport =
    REPORTS[selectedReportId] ||
    REPORTS[getDefaultReportId()];

  if (!selectedReport) {
    root.innerHTML = `
      <div class="page-container">
        <h2>Analytics</h2>
        <div class="analytics-error">
          No analytics reports are currently configured.
        </div>
      </div>
    `;

    return false;
  }

  root.innerHTML = `
    <div class="page-container analytics-platform">

      <div class="analytics-header">
        <div>
          <h2 id="analytics-title">
            ${escapeHtml(selectedReport.title)}
          </h2>

          <p
            id="analytics-description"
            class="analytics-description"
          >
            ${escapeHtml(selectedReport.description)}
          </p>

          <p
            id="analytics-asof"
            class="analytics-asof"
          >
            Loading data...
          </p>
        </div>

        <button
          id="analytics-refresh"
          class="analytics-refresh"
          type="button"
        >
          Refresh data
        </button>
      </div>

      ${
        reports.length > 1
          ? `
            <div class="analytics-report-selector">
              <label for="analytics-report">
                Analytics report
              </label>

              <select id="analytics-report">
                ${reports.map(report => `
                  <option
                    value="${escapeHtml(report.id)}"
                    ${report.id === selectedReport.id ? 'selected' : ''}
                  >
                    ${escapeHtml(report.shortTitle || report.title)}
                  </option>
                `).join('')}
              </select>
            </div>
          `
          : ''
      }

      <div
        id="analytics-loading"
        class="analytics-loading"
      >
        Reading the latest data...
      </div>

      <div
        id="analytics-error"
        class="analytics-error"
        hidden
      ></div>

      <div
        id="analytics-kpis"
        class="analytics-cards"
      ></div>

      <div
        id="analytics-charts"
        class="analytics-chart-grid"
      ></div>

    </div>
  `;

  const selector = document.getElementById('analytics-report');

  if (selector) {
    selector.addEventListener('change', event => {
      loadAnalytics(false, event.target.value);
    });
  }

  document
    .getElementById('analytics-refresh')
    ?.addEventListener('click', () => {
      const currentReportId =
        document.getElementById('analytics-report')?.value ||
        selectedReport.id;

      loadAnalytics(true, currentReportId);
    });

  renderReportContainers(selectedReport);

  return true;
}

function renderReportContainers(report) {
  const kpiContainer = document.getElementById('analytics-kpis');
  const chartContainer = document.getElementById('analytics-charts');

  if (kpiContainer) {
    kpiContainer.innerHTML = report.kpis.map(kpi => `
      <article class="card analytics-kpi-card">
        <h3>${escapeHtml(kpi.title)}</h3>

        <p
          id="analytics-kpi-${escapeHtml(kpi.id)}"
          class="analytics-kpi-value"
        >
          -
        </p>
      </article>
    `).join('');
  }

  if (chartContainer) {
    chartContainer.innerHTML = report.charts.map(chartConfig => `
      <article class="analytics-chart-card">
        <h3>${escapeHtml(chartConfig.title)}</h3>

        <div class="analytics-chart-box">
          <canvas
            id="analytics-chart-${escapeHtml(chartConfig.id)}"
          ></canvas>
        </div>
      </article>
    `).join('');
  }
}

/*
 * ============================================================
 * CHART RENDERING
 * ============================================================
 */

function createAnalyticsChart(chartConfig, rows) {
  const canvas = document.getElementById(
    `analytics-chart-${chartConfig.id}`
  );

  if (!canvas) {
    return;
  }

  if (typeof Chart === 'undefined') {
    throw new Error(
      'Chart.js is not loaded. Add the Chart.js script before app.js and analytics.js in index.html.'
    );
  }

  const safeRows = Array.isArray(rows) ? rows : [];

  const labels = safeRows.map(row =>
    row.label ??
    row.name ??
    row.category ??
    'Unknown'
  );

  const values = safeRows.map(row => {
    const value = Number(row.value);
    return Number.isFinite(value) ? value : 0;
  });

  const isLineChart = chartConfig.type === 'line';

  const newChart = new Chart(canvas, {
    type: chartConfig.type || 'bar',

    data: {
      labels,

      datasets: [
        {
          label: chartConfig.label || chartConfig.title,
          data: values,
          backgroundColor: isLineChart
            ? 'rgba(165, 0, 52, 0.12)'
            : '#a50034',
          borderColor: '#a50034',
          borderWidth: 2,
          tension: 0.25,
          fill: isLineChart
        }
      ]
    },

    options: {
      responsive: true,
      maintainAspectRatio: false,

      interaction: {
        intersect: false,
        mode: 'index'
      },

      plugins: {
        legend: {
          display: false
        },

        tooltip: {
          callbacks: {
            label: context => {
              const formattedValue = formatValue(
                context.parsed.y,
                chartConfig.format
              );

              return `${chartConfig.label || chartConfig.title}: ${formattedValue}`;
            }
          }
        }
      },

      scales: {
        x: {
          grid: {
            display: false
          }
        },

        y: {
          beginAtZero: true,

          ticks: {
            callback: value =>
              formatValue(value, chartConfig.format)
          }
        }
      }
    }
  });

  analyticsCharts.push(newChart);
}

/*
 * ============================================================
 * DATA RENDERING
 * ============================================================
 */

function renderAnalyticsData(report, data) {
  report.kpis.forEach(kpi => {
    const value = getValue(data, kpi.dataPath, 0);
    const element = document.getElementById(
      `analytics-kpi-${kpi.id}`
    );

    if (element) {
      element.textContent = formatValue(value, kpi.format);
    }
  });

  destroyAnalyticsCharts();

  report.charts.forEach(chartConfig => {
    const rows = getValue(data, chartConfig.dataPath, []);
    createAnalyticsChart(chartConfig, rows);
  });

  const latestDataDate =
    data.latestDataDate ||
    data.metadata?.latestDataDate ||
    'n/a';

  const rowCount =
    data.rowCount ??
    data.metadata?.rowCount ??
    0;

  const blobLastModified =
    data.source?.lastModified ||
    data.metadata?.lastModified ||
    null;

  const sourceUpdatedText = blobLastModified
    ? dateTimeFormatter.format(new Date(blobLastModified))
    : 'n/a';

  const asOfElement = document.getElementById('analytics-asof');

  if (asOfElement) {
    asOfElement.textContent =
      `Data through ${latestDataDate}` +
      ` | ${quantityFormatter.format(rowCount)} rows` +
      ` | Source updated ${sourceUpdatedText}`;
  }
}

/*
 * ============================================================
 * API CALL
 * ============================================================
 */

async function loadAnalytics(
  force = false,
  requestedReportId = null
) {
  const root = getAnalyticsRoot();

  if (!root) {
    console.error(
      'Analytics page element was not found. Expected #analytics-page or #analytics-view.'
    );
    return;
  }

  const reportId =
    requestedReportId ||
    document.getElementById('analytics-report')?.value ||
    root.dataset.currentReport ||
    getDefaultReportId();

  const report = REPORTS[reportId];

  if (!report || !report.enabled) {
    root.innerHTML = `
      <div class="page-container">
        <h2>Analytics</h2>

        <div class="analytics-error">
          The requested analytics report is not configured.
        </div>
      </div>
    `;

    return;
  }

  const currentRenderedReport =
    root.dataset.currentReport;

  if (
    currentRenderedReport !== report.id ||
    !document.getElementById('analytics-kpis')
  ) {
    renderAnalyticsShell(report.id);
  }

  root.dataset.currentReport = report.id;
  root.classList.add('is-loading');

  const loadingElement =
    document.getElementById('analytics-loading');

  const errorElement =
    document.getElementById('analytics-error');

  if (loadingElement) {
    loadingElement.hidden = false;
    loadingElement.textContent =
      `Loading ${report.title}...`;
  }

  if (errorElement) {
    errorElement.hidden = true;
    errorElement.textContent = '';
  }

  const query = new URLSearchParams({
    report: report.id
  });

  if (force) {
    query.set('refresh', '1');
  }

  try {
    const response = await fetch(
      `/api/analytics?${query.toString()}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      }
    );

    let data;

    try {
      data = await response.json();
    } catch {
      throw new Error(
        `The Analytics API returned an invalid response with HTTP ${response.status}.`
      );
    }

    if (!response.ok) {
      throw new Error(
        data.detail ||
        data.error ||
        `Analytics API returned HTTP ${response.status}.`
      );
    }

    if (
      data.report &&
      data.report !== report.id
    ) {
      throw new Error(
        `The API returned report "${data.report}" instead of "${report.id}".`
      );
    }

    renderAnalyticsData(report, data);
  } catch (error) {
    console.error('Analytics loading failed:', error);

    if (errorElement) {
      errorElement.textContent =
        `Could not load ${report.title}: ${error.message}`;

      errorElement.hidden = false;
    }
  } finally {
    if (loadingElement) {
      loadingElement.hidden = true;
    }

    root.classList.remove('is-loading');
  }
}

/*
 * ============================================================
 * PUBLIC FUNCTIONS
 * ============================================================
 *
 * Existing app.js currently calls loadAnalyticsData().
 * Keep this compatibility wrapper so app.js does not need to
 * be changed immediately.
 */

function loadAnalyticsData(force = false, reportId = null) {
  return loadAnalytics(force, reportId);
}

window.REPORTS = REPORTS;
window.loadAnalytics = loadAnalytics;
window.loadAnalyticsData = loadAnalyticsData;