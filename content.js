/**
 * UoL Bengaluru Canvas LMS Extension
 * Features:
 * 1. SAML 12 SSO Auto-Login for Liverpool Canvas.
 * 2. Course Completion Checker & Tracker (Modules & Assignments).
 * 3. Activity Logger (views, completions, timestamps, CSV export).
 */

(function () {
  'use strict';

  /* ==========================================================================
     SECTION 1: SAML 12 AUTO-LOGIN LOGIC
     ========================================================================== */

  const DEFAULT_SAML_URL = 'https://www.lms.bengaluru.liverpool.ac.uk/login/saml/12';
  const LOOP_STORAGE_KEY_TS = 'uol_saml_last_redirect_ts';
  const LOOP_STORAGE_KEY_COUNT = 'uol_saml_redirect_count';
  const MAX_RAPID_REDIRECTS = 2;
  const RAPID_WINDOW_MS = 8000;

  let isAutoRedirectEnabled = true;
  let targetSamlBaseUrl = DEFAULT_SAML_URL;
  let preserveReturnTo = true;
  let autoMarkOnOpen = false;

  try {
    const cachedEnabled = localStorage.getItem('uol_saml_auto_redirect');
    if (cachedEnabled !== null) isAutoRedirectEnabled = cachedEnabled === 'true';
    const cachedUrl = localStorage.getItem('uol_saml_base_url');
    if (cachedUrl) targetSamlBaseUrl = cachedUrl;
    const cachedAutoMark = localStorage.getItem('uol_lms_automark');
    if (cachedAutoMark !== null) autoMarkOnOpen = cachedAutoMark === 'true';
  } catch (e) {}

  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
    chrome.storage.sync.get(
      {
        autoRedirect: true,
        samlUrl: DEFAULT_SAML_URL,
        preserveReturnTo: true,
        autoMarkOnOpen: false
      },
      (items) => {
        isAutoRedirectEnabled = items.autoRedirect !== false;
        targetSamlBaseUrl = items.samlUrl || DEFAULT_SAML_URL;
        preserveReturnTo = items.preserveReturnTo !== false;
        autoMarkOnOpen = items.autoMarkOnOpen === true;
        try {
          localStorage.setItem('uol_saml_auto_redirect', String(isAutoRedirectEnabled));
          localStorage.setItem('uol_saml_base_url', targetSamlBaseUrl);
          localStorage.setItem('uol_lms_automark', String(autoMarkOnOpen));
        } catch (e) {}

        if (!isAutoRedirectEnabled && isLoginPage()) {
          injectSamlUI(buildTargetUrl());
        }
      }
    );
  }

  function isSamlOrOAuthRoute() {
    const path = window.location.pathname.toLowerCase();
    return (
      path.startsWith('/login/saml') ||
      path.startsWith('/saml_consume') ||
      path.startsWith('/login/oauth2') ||
      window.location.search.includes('no_saml_redirect=1') ||
      window.location.search.includes('manual_login=1')
    );
  }

  function buildTargetUrl() {
    try {
      const currentUrl = new URL(window.location.href);
      const target = new URL(targetSamlBaseUrl, window.location.origin);

      if (preserveReturnTo) {
        const existingReturnTo = currentUrl.searchParams.get('return_to');
        if (existingReturnTo) {
          target.searchParams.set('return_to', existingReturnTo);
        } else if (
          currentUrl.pathname !== '/' &&
          currentUrl.pathname !== '/login' &&
          currentUrl.pathname !== '/login/canvas' &&
          !currentUrl.pathname.startsWith('/login/')
        ) {
          target.searchParams.set('return_to', currentUrl.href);
        }
      }

      return target.href;
    } catch (e) {
      return targetSamlBaseUrl;
    }
  }

  function isLoopDetected() {
    try {
      const now = Date.now();
      const lastTs = parseInt(sessionStorage.getItem(LOOP_STORAGE_KEY_TS) || '0', 10);
      const count = parseInt(sessionStorage.getItem(LOOP_STORAGE_KEY_COUNT) || '0', 10);
      if (now - lastTs < RAPID_WINDOW_MS && count >= MAX_RAPID_REDIRECTS) {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function recordRedirectAttempt() {
    try {
      const now = Date.now();
      const lastTs = parseInt(sessionStorage.getItem(LOOP_STORAGE_KEY_TS) || '0', 10);
      let count = parseInt(sessionStorage.getItem(LOOP_STORAGE_KEY_COUNT) || '0', 10);
      count = now - lastTs < RAPID_WINDOW_MS ? count + 1 : 1;
      sessionStorage.setItem(LOOP_STORAGE_KEY_TS, String(now));
      sessionStorage.setItem(LOOP_STORAGE_KEY_COUNT, String(count));
    } catch (e) {}
  }

  function clearLoopCounters() {
    try {
      sessionStorage.removeItem(LOOP_STORAGE_KEY_TS);
      sessionStorage.removeItem(LOOP_STORAGE_KEY_COUNT);
    } catch (e) {}
  }

  function isLoginPage() {
    const path = window.location.pathname.toLowerCase();
    if (path === '/login/canvas' || path === '/login' || path === '/login/') {
      return true;
    }
    if (
      document.body &&
      (document.body.classList.contains('ic-Login-Body') ||
        document.getElementById('login_form') ||
        document.querySelector('form[action*="/login/canvas"]'))
    ) {
      return true;
    }
    if (document.title && document.title.toLowerCase().includes('log in to canvas')) {
      return true;
    }
    return false;
  }

  function performRedirect(targetUrl) {
    if (isLoopDetected()) {
      showLoopNotice(targetUrl);
      injectSamlUI(targetUrl);
      return;
    }
    recordRedirectAttempt();
    try {
      if (document.body) {
        const toast = document.createElement('div');
        toast.className = 'uol-saml-redirect-overlay';
        toast.innerHTML = `
          <div class="uol-saml-spinner"></div>
          <span>Connecting to University SAML SSO...</span>
        `;
        document.body.appendChild(toast);
      }
    } catch (e) {}
    window.location.replace(targetUrl);
  }

  function showLoopNotice(targetUrl) {
    if (document.getElementById('uol-saml-loop-banner')) return;
    const loginBody = document.querySelector('.ic-Login__body') || document.getElementById('login_form');
    if (!loginBody) return;
    const banner = document.createElement('div');
    banner.id = 'uol-saml-loop-banner';
    banner.className = 'uol-saml-banner';
    banner.innerHTML = `
      <strong>Auto-Redirect Paused</strong>
      A rapid redirect was detected. To sign in with your University of Liverpool credentials, 
      <a href="${targetUrl}" class="uol-saml-link">click here to use SAML 12 Login</a>, 
      or sign in using the form below.
    `;
    loginBody.parentNode.insertBefore(banner, loginBody);
  }

  function injectSamlUI(targetUrl) {
    if (document.getElementById('uol-saml-custom-btn')) return;
    const loginForm = document.getElementById('login_form') || document.querySelector('form[action*="/login/canvas"]');
    if (!loginForm) return;
    const container = document.createElement('div');
    container.id = 'uol-saml-custom-btn';
    container.className = 'uol-saml-btn-container';
    container.innerHTML = `
      <a href="${targetUrl}" class="uol-saml-btn" role="button">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
          <polyline points="10 17 15 12 10 7"/>
          <line x1="15" y1="12" x2="3" y2="12"/>
        </svg>
        <span>Log in with University SAML (SSO)</span>
      </a>
      <div class="uol-saml-divider">
        <span>or standard canvas login</span>
      </div>
    `;
    const firstControl = loginForm.querySelector('.ic-Form-control');
    if (firstControl) {
      loginForm.insertBefore(container, firstControl);
    } else {
      loginForm.prepend(container);
    }
  }

  // Handle immediate login redirection
  if (!isSamlOrOAuthRoute()) {
    const currentPath = window.location.pathname.toLowerCase();
    const targetUrl = buildTargetUrl();

    if (currentPath === '/login/canvas' || currentPath === '/login' || currentPath === '/login/') {
      if (isAutoRedirectEnabled) {
        performRedirect(targetUrl);
        return;
      } else {
        document.addEventListener('DOMContentLoaded', () => injectSamlUI(targetUrl));
        return;
      }
    }

    let handledLogin = false;
    function checkLoginState() {
      if (handledLogin) return;
      if (isLoginPage()) {
        handledLogin = true;
        if (isAutoRedirectEnabled) {
          performRedirect(targetUrl);
        } else {
          injectSamlUI(targetUrl);
        }
      } else if (
        document.getElementById('wrapper') ||
        document.getElementById('dashboard') ||
        document.getElementById('header')
      ) {
        clearLoopCounters();
        handledLogin = true;
      }
    }

    const loginObserver = new MutationObserver(() => checkLoginState());
    loginObserver.observe(document.documentElement || document, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', checkLoginState);
  }

  /* ==========================================================================
     SECTION 2: COMPLETION CHECKER & ACTIVITY LOGGER
     ========================================================================== */

  // Course Detection Helper
  function getCourseInfo() {
    const match = window.location.pathname.match(/\/courses\/(\d+)/);
    if (!match) return null;
    const courseId = match[1];

    let courseName = 'Current Course';
    const breadcrumbLinks = document.querySelectorAll('#breadcrumbs li a');
    if (breadcrumbLinks.length >= 2) {
      const text = breadcrumbLinks[1].textContent.trim();
      if (text) courseName = text;
    } else {
      const mobileTitle = document.querySelector('.mobile-header-title div:first-child');
      if (mobileTitle && mobileTitle.textContent.trim()) {
        courseName = mobileTitle.textContent.trim();
      }
    }

    return { courseId, courseName };
  }

  // Storage Key Helpers
  function getCourseStorageKey(courseId) {
    return `uol_lms_course_${courseId}`;
  }

  const GLOBAL_LOG_KEY = 'uol_lms_activity_logs';

  // Activity Logger Helper
  function logActivity(eventData) {
    if (typeof chrome === 'undefined' || !chrome.storage || !chrome.storage.local) return;

    chrome.storage.local.get([GLOBAL_LOG_KEY], (res) => {
      const logs = res[GLOBAL_LOG_KEY] || [];
      const entry = {
        id: 'log_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
        timestamp: Date.now(),
        dateStr: new Date().toLocaleString(),
        ...eventData
      };
      // Keep last 500 events
      logs.unshift(entry);
      if (logs.length > 500) logs.pop();

      chrome.storage.local.set({ [GLOBAL_LOG_KEY]: logs });
    });
  }

  // Initialize Tracker on Canvas Modules & Assignments pages
  function initCompletionTracker() {
    const course = getCourseInfo();
    if (!course) return;

    const contextModules = document.getElementById('context_modules');
    const isModulesPage = window.location.pathname.includes('/modules') || contextModules;
    const isAssignmentsPage = window.location.pathname.includes('/assignments');

    if (!isModulesPage && !isAssignmentsPage) return;

    const storageKey = getCourseStorageKey(course.courseId);

    // Fetch existing completions
    chrome.storage.local.get([storageKey], (res) => {
      const completedItems = res[storageKey] || {};

      if (isModulesPage) {
        setupModulesTracker(course, completedItems, storageKey);
      }
    });
  }

  // Setup tracker for /courses/*/modules
  function setupModulesTracker(course, completedItems, storageKey) {
    const modulesContainer = document.getElementById('context_modules');
    if (!modulesContainer) return;

    // Inject Course Overview Card if not present
    let trackerCard = document.getElementById('uol-course-tracker-card');
    if (!trackerCard) {
      trackerCard = createTrackerCard(course);
      const parent = modulesContainer.parentElement;
      if (parent) {
        parent.insertBefore(trackerCard, modulesContainer);
      } else {
        modulesContainer.prepend(trackerCard);
      }
    }

    let currentFilter = 'all'; // 'all', 'todo', 'completed'

    function updateProgress() {
      const allItemRows = modulesContainer.querySelectorAll('.context_module_item:not(#context_module_item_blank)');
      let totalCount = allItemRows.length;
      let completedCount = 0;

      // Module-level stats map: moduleId -> { total, completed }
      const moduleStats = {};

      allItemRows.forEach((row) => {
        const itemId = extractItemId(row);
        const moduleRow = row.closest('.context_module');
        const moduleId = moduleRow ? (moduleRow.dataset.moduleId || moduleRow.id.replace('context_module_', '')) : 'unknown';

        if (!moduleStats[moduleId]) {
          moduleStats[moduleId] = { total: 0, completed: 0, el: moduleRow };
        }
        moduleStats[moduleId].total += 1;

        const isCompleted = !!completedItems[itemId];
        if (isCompleted) {
          completedCount += 1;
          moduleStats[moduleId].completed += 1;
          row.classList.add('uol-item-completed');
        } else {
          row.classList.remove('uol-item-completed');
        }

        // Apply visual filter
        if (currentFilter === 'todo') {
          row.classList.toggle('uol-filter-hidden', isCompleted);
        } else if (currentFilter === 'completed') {
          row.classList.toggle('uol-filter-hidden', !isCompleted);
        } else {
          row.classList.remove('uol-filter-hidden');
        }
      });

      // Update Course Card
      const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
      const pctEl = trackerCard.querySelector('.pct');
      const countEl = trackerCard.querySelector('.count');
      const barFillEl = trackerCard.querySelector('.uol-progress-fill');

      if (pctEl) pctEl.textContent = `${pct}%`;
      if (countEl) countEl.textContent = `${completedCount} of ${totalCount} completed`;
      if (barFillEl) barFillEl.style.width = `${pct}%`;

      // Update Module Headers
      Object.keys(moduleStats).forEach((modId) => {
        const stat = moduleStats[modId];
        if (!stat.el) return;
        const headerTitle = stat.el.querySelector('.ig-header-title') || stat.el.querySelector('.header');
        if (!headerTitle) return;

        let pill = stat.el.querySelector('.uol-module-progress-pill');
        if (!pill) {
          pill = document.createElement('span');
          pill.className = 'uol-module-progress-pill';
          const titleName = stat.el.querySelector('.ig-header-title .name');
          if (titleName) {
            titleName.parentNode.insertBefore(pill, titleName.nextSibling);
          } else {
            headerTitle.appendChild(pill);
          }
        }

        const modPct = stat.total > 0 ? Math.round((stat.completed / stat.total) * 100) : 0;
        pill.className = `uol-module-progress-pill ${stat.completed === stat.total && stat.total > 0 ? 'completed' : ''}`;
        pill.innerHTML = `
          <span class="uol-module-mini-bar"><span class="uol-module-mini-fill" style="width: ${modPct}%"></span></span>
          <span>${stat.completed}/${stat.total}</span>
        `;
      });
    }

    // Process each item row
    const itemRows = modulesContainer.querySelectorAll('.context_module_item:not(#context_module_item_blank)');
    itemRows.forEach((row) => {
      const itemId = extractItemId(row);
      if (!itemId) return;

      const titleEl = row.querySelector('.item_name a.ig-title') || row.querySelector('.item_name .title');
      const itemTitle = titleEl ? titleEl.textContent.trim() : 'Module Item ' + itemId;
      const moduleRow = row.closest('.context_module');
      const moduleTitleEl = moduleRow ? moduleRow.querySelector('.ig-header-title .name') : null;
      const moduleTitle = moduleTitleEl ? moduleTitleEl.textContent.trim() : 'Module';

      // Attach check button in status icon container
      let statusIconContainer = row.querySelector('.module-item-status-icon');
      if (!statusIconContainer) {
        statusIconContainer = document.createElement('div');
        statusIconContainer.className = 'module-item-status-icon';
        row.querySelector('.ig-row')?.appendChild(statusIconContainer);
      }

      let checkBtn = statusIconContainer.querySelector('.uol-checkbox-btn');
      if (!checkBtn) {
        checkBtn = document.createElement('button');
        checkBtn.className = 'uol-checkbox-btn';
        checkBtn.type = 'button';
        checkBtn.title = 'Click to toggle completion';
        checkBtn.setAttribute('aria-label', `Mark ${itemTitle} as complete`);
        checkBtn.innerHTML = `
          <svg viewBox="0 0 24 24">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;

        if (completedItems[itemId]) {
          checkBtn.classList.add('checked');
        }

        checkBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const nowCompleted = !checkBtn.classList.contains('checked');
          checkBtn.classList.toggle('checked', nowCompleted);

          if (nowCompleted) {
            completedItems[itemId] = {
              title: itemTitle,
              moduleTitle: moduleTitle,
              completedAt: Date.now()
            };
            logActivity({
              courseId: course.courseId,
              courseName: course.courseName,
              itemId: itemId,
              itemTitle: itemTitle,
              moduleTitle: moduleTitle,
              action: 'completed'
            });
          } else {
            delete completedItems[itemId];
            logActivity({
              courseId: course.courseId,
              courseName: course.courseName,
              itemId: itemId,
              itemTitle: itemTitle,
              moduleTitle: moduleTitle,
              action: 'uncompleted'
            });
          }

          chrome.storage.local.set({ [storageKey]: completedItems }, () => {
            updateProgress();
          });
        });

        statusIconContainer.innerHTML = '';
        statusIconContainer.appendChild(checkBtn);
      }

      // Auto-Log View when student clicks the item link
      if (titleEl && !titleEl.dataset.uolLogBound) {
        titleEl.dataset.uolLogBound = 'true';
        titleEl.addEventListener('click', () => {
          logActivity({
            courseId: course.courseId,
            courseName: course.courseName,
            itemId: itemId,
            itemTitle: itemTitle,
            moduleTitle: moduleTitle,
            action: 'viewed'
          });

          // If auto-mark on click is enabled
          if (autoMarkOnOpen && !completedItems[itemId]) {
            completedItems[itemId] = {
              title: itemTitle,
              moduleTitle: moduleTitle,
              completedAt: Date.now()
            };
            checkBtn.classList.add('checked');
            chrome.storage.local.set({ [storageKey]: completedItems }, () => {
              updateProgress();
            });
          }
        });
      }
    });

    // Toolbar Filter Bindings
    const filterButtons = trackerCard.querySelectorAll('.uol-filter-btn');
    filterButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        filterButtons.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        updateProgress();
      });
    });

    // Toolbar "Mark All Done"
    const markAllBtn = trackerCard.querySelector('#uol-mark-all-btn');
    if (markAllBtn) {
      markAllBtn.addEventListener('click', () => {
        const rows = modulesContainer.querySelectorAll('.context_module_item:not(#context_module_item_blank)');
        rows.forEach((r) => {
          const id = extractItemId(r);
          const t = r.querySelector('.item_name a.ig-title')?.textContent.trim() || 'Item';
          completedItems[id] = { title: t, completedAt: Date.now() };
          r.querySelector('.uol-checkbox-btn')?.classList.add('checked');
        });
        logActivity({
          courseId: course.courseId,
          courseName: course.courseName,
          action: 'completed_all'
        });
        chrome.storage.local.set({ [storageKey]: completedItems }, () => updateProgress());
      });
    }

    // Toolbar "Reset All"
    const resetAllBtn = trackerCard.querySelector('#uol-reset-all-btn');
    if (resetAllBtn) {
      resetAllBtn.addEventListener('click', () => {
        if (!confirm('Are you sure you want to reset all completion checks for this course?')) return;
        for (let k in completedItems) delete completedItems[k];
        modulesContainer.querySelectorAll('.uol-checkbox-btn').forEach((b) => b.classList.remove('checked'));
        chrome.storage.local.set({ [storageKey]: {} }, () => updateProgress());
      });
    }

    // Toolbar "Activity Log" Modal Trigger
    const viewLogBtn = trackerCard.querySelector('#uol-view-log-btn');
    if (viewLogBtn) {
      viewLogBtn.addEventListener('click', () => {
        showActivityLogModal(course.courseId);
      });
    }

    updateProgress();
  }

  // Create the Course Tracker Header Card
  function createTrackerCard(course) {
    const card = document.createElement('div');
    card.id = 'uol-course-tracker-card';
    card.className = 'uol-tracker-card';
    card.innerHTML = `
      <div class="uol-tracker-header">
        <div class="uol-tracker-title-area">
          <span class="uol-tracker-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            Tracker
          </span>
          <h2 class="uol-tracker-heading">Course Progress: ${course.courseName}</h2>
        </div>
        <div class="uol-tracker-stats">
          <span class="pct">0%</span> • <span class="count">0 of 0 completed</span>
        </div>
      </div>

      <div class="uol-progress-track">
        <div class="uol-progress-fill" style="width: 0%"></div>
      </div>

      <div class="uol-tracker-toolbar">
        <div class="uol-filter-group">
          <button type="button" class="uol-filter-btn active" data-filter="all">All Items</button>
          <button type="button" class="uol-filter-btn" data-filter="todo">To Do</button>
          <button type="button" class="uol-filter-btn" data-filter="completed">Completed</button>
        </div>

        <div class="uol-tracker-actions">
          <button type="button" id="uol-mark-all-btn" class="uol-tool-btn" title="Mark all items completed">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 11 12 14 22 4"></polyline>
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path>
            </svg>
            Mark All Done
          </button>
          <button type="button" id="uol-view-log-btn" class="uol-tool-btn" title="View study activity log">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Activity Log
          </button>
          <button type="button" id="uol-reset-all-btn" class="uol-tool-btn" title="Reset completions">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Reset
          </button>
        </div>
      </div>
    `;
    return card;
  }

  // Extract Item ID from item row
  function extractItemId(row) {
    if (row.dataset && row.dataset.moduleItemId) return row.dataset.moduleItemId;
    if (row.id && row.id.startsWith('context_module_item_')) {
      return row.id.replace('context_module_item_', '');
    }
    const idSpan = row.querySelector('.module_item_icons .id');
    if (idSpan && idSpan.textContent.trim()) return idSpan.textContent.trim();
    const link = row.querySelector('.item_link');
    if (link && link.href) {
      const m = link.href.match(/items\/(\d+)/);
      if (m) return m[1];
    }
    return null;
  }

  // Activity Log Viewer Modal
  function showActivityLogModal(courseId) {
    let backdrop = document.getElementById('uol-activity-log-modal');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.id = 'uol-activity-log-modal';
      backdrop.className = 'uol-log-modal-backdrop';
      backdrop.innerHTML = `
        <div class="uol-log-modal">
          <div class="uol-log-modal-header">
            <h3>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Study Activity Log & History
            </h3>
            <button class="uol-log-close-btn">&times;</button>
          </div>
          <div class="uol-log-modal-body" id="uol-log-body">
            <!-- Dynamic Log Items -->
          </div>
          <div class="uol-log-modal-footer">
            <button type="button" id="uol-export-csv-btn" class="uol-tool-btn">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Export as CSV
            </button>
            <button type="button" id="uol-clear-log-btn" class="uol-tool-btn">Clear Log</button>
          </div>
        </div>
      `;

      document.body.appendChild(backdrop);

      backdrop.querySelector('.uol-log-close-btn').addEventListener('click', () => {
        backdrop.classList.remove('open');
      });
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) backdrop.classList.remove('open');
      });
    }

    const logBody = backdrop.querySelector('#uol-log-body');
    logBody.innerHTML = '<div class="uol-log-empty">Loading activity history...</div>';
    backdrop.classList.add('open');

    chrome.storage.local.get([GLOBAL_LOG_KEY], (res) => {
      const logs = res[GLOBAL_LOG_KEY] || [];
      const courseLogs = courseId ? logs.filter((l) => l.courseId === courseId) : logs;

      if (courseLogs.length === 0) {
        logBody.innerHTML = '<div class="uol-log-empty">No activity recorded yet for this course. Start checking off items or viewing lectures!</div>';
        return;
      }

      let html = '<ul class="uol-log-list">';
      courseLogs.forEach((l) => {
        let iconHtml = '✓';
        let actionClass = 'completed';
        let actionLabel = 'Completed';

        if (l.action === 'viewed') {
          iconHtml = '👁';
          actionClass = 'viewed';
          actionLabel = 'Opened/Viewed';
        } else if (l.action === 'uncompleted') {
          iconHtml = '✗';
          actionClass = 'uncompleted';
          actionLabel = 'Unmarked';
        } else if (l.action === 'completed_all') {
          iconHtml = '★';
          actionClass = 'completed';
          actionLabel = 'Marked All Completed';
        }

        const dateStr = l.timestamp ? new Date(l.timestamp).toLocaleString() : l.dateStr || '';

        html += `
          <li class="uol-log-item">
            <div class="uol-log-icon ${actionClass}">${iconHtml}</div>
            <div class="uol-log-content">
              <div class="uol-log-text">${actionLabel}: ${l.itemTitle || l.courseName || 'Course Activity'}</div>
              <div class="uol-log-meta">
                ${l.moduleTitle ? `Module: ${l.moduleTitle} • ` : ''}${dateStr}
              </div>
            </div>
          </li>
        `;
      });
      html += '</ul>';
      logBody.innerHTML = html;

      // CSV Export Handler
      const exportBtn = backdrop.querySelector('#uol-export-csv-btn');
      exportBtn.onclick = () => {
        exportLogsToCSV(courseLogs);
      };

      // Clear Log Handler
      const clearBtn = backdrop.querySelector('#uol-clear-log-btn');
      clearBtn.onclick = () => {
        if (!confirm('Clear all recorded activity logs?')) return;
        chrome.storage.local.set({ [GLOBAL_LOG_KEY]: [] }, () => {
          logBody.innerHTML = '<div class="uol-log-empty">Activity log cleared.</div>';
        });
      };
    });
  }

  // Export logs to downloadable CSV
  function exportLogsToCSV(logs) {
    if (!logs || logs.length === 0) return;
    const headers = ['Timestamp', 'Date', 'Course ID', 'Course Name', 'Module', 'Action', 'Item Title'];
    const rows = logs.map((l) => [
      l.timestamp,
      `"${new Date(l.timestamp).toISOString()}"`,
      `"${l.courseId || ''}"`,
      `"${(l.courseName || '').replace(/"/g, '""')}"`,
      `"${(l.moduleTitle || '').replace(/"/g, '""')}"`,
      `"${l.action || ''}"`,
      `"${(l.itemTitle || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `canvas_activity_log_${Date.now()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Initialize tracker on page load or when DOM elements update
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCompletionTracker);
  } else {
    initCompletionTracker();
  }

  // Observe Canvas dynamic module AJAX loading
  const pageObserver = new MutationObserver(() => {
    if (document.getElementById('context_modules') && !document.getElementById('uol-course-tracker-card')) {
      initCompletionTracker();
    }
  });

  pageObserver.observe(document.body || document.documentElement, {
    childList: true,
    subtree: true
  });
})();
