(() => {
  'use strict';

  const MODULE_PREFIX = 'bop-report-hub';
  const REGISTRY_URL = 'modules/report-hub/bop-report-hub.registry.json';
  const LEGACY_VIEW_IDS = ['content', 'statusbar', 'ai-page', 'analytics-page'];
  const LEGACY_NAV_IDS = ['nav-dashboard', 'nav-ai', 'nav-analytics'];
  const state = { registry: null, principal: null, activeTabId: null };

  function element(id) {
    return document.getElementById(id);
  }

  function safeActionUrl(value) {
    if (!value) return null;
    try {
      const parsed = new URL(value, window.location.origin);
      const securedResourceEndpoint =
        parsed.origin === window.location.origin &&
        parsed.pathname === '/api/report-resource';
      return parsed.protocol === 'https:' || securedResourceEndpoint ? parsed.href : null;
    } catch {
      return null;
    }
  }

  function normalisedSet(values) {
    return new Set((values || []).map(value => String(value).trim().toLowerCase()).filter(Boolean));
  }

  // Display filtering only. Static Web Apps and future APIs remain the security boundary.
  function canDisplay(authorization = {}) {
    if (authorization.enabled === false) return false;
    const roles = normalisedSet(state.principal?.userRoles);
    const identity = String(state.principal?.userDetails || '').trim().toLowerCase();
    const deniedRoles = normalisedSet(authorization.deniedRoles);
    if ([...deniedRoles].some(role => roles.has(role))) return false;

    const allowedUsers = normalisedSet(authorization.allowedUsers);
    if (identity && allowedUsers.has(identity)) return true;
    const allowedRoles = normalisedSet(authorization.allowedRoles);
    if (!allowedRoles.size && !allowedUsers.size) return true;

    // The existing site route requires authentication. This fallback keeps local
    // static preview usable and must not be treated as server authorization.
    if (!state.principal && allowedRoles.size === 1 && allowedRoles.has('authenticated')) return true;
    return [...allowedRoles].some(role => roles.has(role));
  }

  function setLegacyDashboardChromeVisible(visible) {
    LEGACY_VIEW_IDS.forEach(id => {
      const node = element(id);
      if (node) node.style.display = visible && id === 'content' ? '' : 'none';
    });
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.style.display = visible ? '' : 'none';
    if (visible) {
      const statusbar = element('statusbar');
      if (statusbar) statusbar.style.display = '';
    }
  }

  function hideModuleViews() {
    document.querySelectorAll('[data-bop-report-hub-tab]').forEach(view => {
      view.hidden = true;
    });
    document.querySelectorAll(`.${MODULE_PREFIX}-nav-button`).forEach(button => {
      button.classList.remove(`${MODULE_PREFIX}-nav-button--active`);
      button.removeAttribute('aria-current');
    });
    state.activeTabId = null;
  }

  function leaveModule() {
    hideModuleViews();
    // Existing Dashboard/AI/Analytics handlers retain responsibility for
    // restoring their own views and events. This module only hides itself.
  }

  function createMeta(label, value) {
    const item = document.createElement('span');
    const strong = document.createElement('b');
    strong.textContent = label;
    item.append(strong, document.createTextNode(` ${value}`));
    return item;
  }

  function createAction(label, url, unavailableText, behavior) {
    const safeUrl = safeActionUrl(url);
    if (safeUrl) {
      const link = document.createElement('a');
      link.className = `${MODULE_PREFIX}__action`;
      link.href = safeUrl;
      if (behavior === 'html-preview') {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      } else if (behavior === 'download') {
        link.setAttribute('download', '');
        link.rel = 'noopener';
      }
      link.textContent = label;
      return link;
    }
    const button = document.createElement('button');
    button.className = `${MODULE_PREFIX}__action`;
    button.type = 'button';
    button.disabled = true;
    button.title = unavailableText;
    button.textContent = label;
    return button;
  }

  function createReportRow(report) {
    const row = document.createElement('article');
    row.className = `${MODULE_PREFIX}__row`;
    row.dataset.bopReportHubReportId = report.id;

    const copy = document.createElement('div');
    copy.className = `${MODULE_PREFIX}__copy`;
    const titleLine = document.createElement('div');
    titleLine.className = `${MODULE_PREFIX}__title-line`;
    const title = document.createElement('h3');
    title.className = `${MODULE_PREFIX}__report-name`;
    title.textContent = report.name;
    titleLine.append(title);
    if (report.status) {
      const status = document.createElement('span');
      status.className = `${MODULE_PREFIX}__status`;
      status.textContent = report.status;
      titleLine.append(status);
    }
    copy.append(titleLine);

    if (report.description) {
      const description = document.createElement('p');
      description.className = `${MODULE_PREFIX}__description`;
      description.textContent = report.description;
      copy.append(description);
    }

    const meta = document.createElement('div');
    meta.className = `${MODULE_PREFIX}__meta`;
    if (report.createdBy) {
      const creator = document.createElement('span');
      creator.textContent = report.createdBy;
      meta.append(creator);
    } else if (report.owner) {
      meta.append(createMeta('Owner', report.owner));
    }
    const access = report.authorization?.allowedRoles?.join(', ') || 'Policy controlled';
    meta.append(createMeta('Access', access));
    const candidate = report.rawExcel?.fileNameCandidate;
    if (candidate) meta.append(createMeta('Raw Excel candidate', candidate));
    copy.append(meta);

    const actions = document.createElement('div');
    actions.className = `${MODULE_PREFIX}__actions`;
    actions.setAttribute('aria-label', `${report.name} resources`);
    actions.append(
      createAction('Report HTML', report.links?.reportHtml, 'Report URL is not confirmed yet', 'html-preview'),
      createAction('Tutorial HTML', report.links?.tutorialHtml, 'Tutorial URL is not available', 'html-preview'),
      createAction('Raw Excel', report.links?.rawExcel, candidate ? `URL is not confirmed. Candidate: ${candidate}` : 'Raw Excel URL is not confirmed yet', 'download')
    );
    row.append(copy, actions);
    return row;
  }

  function renderTab(tabId) {
    const root = element(`${MODULE_PREFIX}-${tabId}-page`);
    if (!root || !state.registry) return;
    root.replaceChildren();

    const header = document.createElement('div');
    header.className = `${MODULE_PREFIX}__header`;
    const eyebrow = document.createElement('p');
    eyebrow.className = `${MODULE_PREFIX}__eyebrow`;
    eyebrow.textContent = 'REPORT LIBRARY';
    const title = document.createElement('h2');
    title.className = `${MODULE_PREFIX}__title`;
    title.textContent = tabId.toUpperCase();
    const subtitle = document.createElement('p');
    subtitle.className = `${MODULE_PREFIX}__subtitle`;
    subtitle.textContent = tabId === 'kam'
      ? 'Key Account Management reports, tutorials and source files.'
      : 'Go-to-market reports, tutorials and source files.';
    header.append(eyebrow, title, subtitle);

    const list = document.createElement('div');
    list.className = `${MODULE_PREFIX}__list`;
    list.id = `${MODULE_PREFIX}-${tabId}-report-list`;
    const reports = state.registry.reports
      .filter(report => report.tabId === tabId && report.visible !== false && canDisplay(report.authorization))
      .sort((left, right) => Number(left.order || 999) - Number(right.order || 999));

    if (reports.length) {
      reports.forEach(report => list.append(createReportRow(report)));
    } else {
      const empty = document.createElement('div');
      empty.className = `${MODULE_PREFIX}__empty`;
      const emptyTitle = document.createElement('h3');
      emptyTitle.textContent = 'No reports published yet';
      const emptyText = document.createElement('p');
      emptyText.textContent = 'Add a report to the Report Hub registry.';
      empty.append(emptyTitle, emptyText);
      list.append(empty);
    }
    root.append(header, list);
  }

  function showTab(tabId) {
    const tab = state.registry?.tabs?.find(item => item.id === tabId && item.visible !== false && canDisplay(item.authorization));
    if (!tab) return;
    setLegacyDashboardChromeVisible(false);
    hideModuleViews();
    const root = element(`${MODULE_PREFIX}-${tabId}-page`);
    const button = element(`${MODULE_PREFIX}-nav-${tabId}`);
    if (!root || !button) return;
    root.hidden = false;
    button.classList.add(`${MODULE_PREFIX}-nav-button--active`);
    button.setAttribute('aria-current', 'page');
    state.activeTabId = tabId;
    renderTab(tabId);
  }

  async function loadPrincipal() {
    try {
      const response = await fetch('/.auth/me', { headers: { Accept: 'application/json' } });
      if (!response.ok) return null;
      const payload = await response.json();
      return payload.clientPrincipal || null;
    } catch {
      return null;
    }
  }

  async function loadRegistry() {
    const response = await fetch(REGISTRY_URL, { headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Report Hub registry returned HTTP ${response.status}`);
    const payload = await response.json();
    if (!Array.isArray(payload.tabs) || !Array.isArray(payload.reports)) {
      throw new Error('Report Hub registry has an invalid shape');
    }
    return payload;
  }

  function wireNavigation() {
    ['kam', 'gtm'].forEach(tabId => {
      element(`${MODULE_PREFIX}-nav-${tabId}`)?.addEventListener('click', () => showTab(tabId));
    });
    LEGACY_NAV_IDS.forEach(id => element(id)?.addEventListener('click', leaveModule));
  }

  async function initialise() {
    wireNavigation();
    try {
      [state.principal, state.registry] = await Promise.all([loadPrincipal(), loadRegistry()]);
      state.registry.tabs.forEach(tab => {
        const button = element(`${MODULE_PREFIX}-nav-${tab.id}`);
        if (button) button.hidden = tab.visible === false || !canDisplay(tab.authorization);
      });
      renderTab('kam');
      renderTab('gtm');
    } catch (error) {
      ['kam', 'gtm'].forEach(tabId => {
        const root = element(`${MODULE_PREFIX}-${tabId}-page`);
        if (!root) return;
        const box = document.createElement('div');
        box.className = `${MODULE_PREFIX}__error`;
        const title = document.createElement('h3');
        title.textContent = 'Report Hub could not be loaded';
        const detail = document.createElement('p');
        detail.textContent = error.message;
        box.append(title, detail);
        root.replaceChildren(box);
      });
    }
  }

  initialise();
})();
