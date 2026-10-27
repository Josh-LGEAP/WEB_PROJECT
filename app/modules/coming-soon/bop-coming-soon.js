(() => {
  'use strict';

  const PREFIX = 'bop-coming-soon';
  const PAGE_BY_NAV = {
    'nav-ai': { pageId: 'ai-page', label: 'AI Insights' },
    'nav-analytics': { pageId: 'analytics-page', label: 'Analytics Hub' }
  };

  function hideDashboardChrome() {
    ['content', 'statusbar'].forEach(id => {
      const node = document.getElementById(id);
      if (node) node.style.display = 'none';
    });
    const toolbar = document.querySelector('.toolbar');
    if (toolbar) toolbar.style.display = 'none';
  }

  function hideReportHub() {
    document.querySelectorAll('[data-bop-report-hub-tab]').forEach(view => {
      view.hidden = true;
    });
    document.querySelectorAll('.bop-report-hub-nav-button').forEach(button => {
      button.classList.remove('bop-report-hub-nav-button--active');
      button.removeAttribute('aria-current');
    });
  }

  function clearComingSoonNavigation() {
    Object.keys(PAGE_BY_NAV).forEach(id => {
      const button = document.getElementById(id);
      button?.classList.remove(`${PREFIX}-nav-active`);
      button?.removeAttribute('aria-current');
    });
  }

  function render(page, label) {
    page.replaceChildren();
    const wrapper = document.createElement('section');
    wrapper.className = PREFIX;
    wrapper.setAttribute('aria-labelledby', `${PREFIX}-${page.id}-title`);
    const panel = document.createElement('div');
    panel.className = `${PREFIX}__panel`;
    const visual = document.createElement('div');
    visual.className = `${PREFIX}__visual`;
    visual.setAttribute('aria-hidden', 'true');
    const eyebrow = document.createElement('p');
    eyebrow.className = `${PREFIX}__eyebrow`;
    eyebrow.textContent = label.toUpperCase();
    const title = document.createElement('h2');
    title.className = `${PREFIX}__title`;
    title.id = `${PREFIX}-${page.id}-title`;
    title.textContent = 'Coming Soon';
    const message = document.createElement('p');
    message.className = `${PREFIX}__message`;
    message.textContent = 'This workspace is being prepared. Please continue to use the Dashboard, KAM and GTM areas in the meantime.';
    panel.append(visual, eyebrow, title, message);
    wrapper.append(panel);
    page.append(wrapper);
  }

  function showComingSoon(navId) {
    const config = PAGE_BY_NAV[navId];
    if (!config) return;
    hideDashboardChrome();
    hideReportHub();
    clearComingSoonNavigation();
    Object.values(PAGE_BY_NAV).forEach(item => {
      const page = document.getElementById(item.pageId);
      if (page) page.style.display = 'none';
    });
    const page = document.getElementById(config.pageId);
    const button = document.getElementById(navId);
    if (!page || !button) return;
    render(page, config.label);
    page.style.display = '';
    button.classList.add(`${PREFIX}-nav-active`);
    button.setAttribute('aria-current', 'page');
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('button');
    if (!button) return;
    if (PAGE_BY_NAV[button.id]) {
      // Capture phase prevents the legacy AI/Analytics handlers from rendering
      // or starting API calls. Dashboard handlers are never intercepted.
      event.preventDefault();
      event.stopImmediatePropagation();
      showComingSoon(button.id);
      return;
    }
    if (button.id === 'nav-dashboard' || button.classList.contains('bop-report-hub-nav-button')) {
      clearComingSoonNavigation();
    }
  }, true);
})();