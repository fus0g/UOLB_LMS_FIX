/**
 * Popup Script for UoL Bengaluru Canvas SAML Auto-Login
 */

document.addEventListener('DOMContentLoaded', () => {
  const DEFAULT_SAML_URL = 'https://www.lms.bengaluru.liverpool.ac.uk/login/saml/12';
  const DASHBOARD_URL = 'https://www.lms.bengaluru.liverpool.ac.uk/';

  const btnLoginSaml = document.getElementById('btn-login-saml');
  const btnOpenDashboard = document.getElementById('btn-open-dashboard');
  const btnCopyUrl = document.getElementById('btn-copy-url');
  const copyText = document.getElementById('copy-text');
  const toggleAutoRedirect = document.getElementById('toggle-autoredirect');
  const toggleReturnTo = document.getElementById('toggle-returnto');
  const inputSamlUrl = document.getElementById('input-saml-url');
  const btnSaveSettings = document.getElementById('btn-save-settings');
  const btnResetDefault = document.getElementById('btn-reset-default');
  const statusPill = document.getElementById('status-pill');
  const statusText = document.getElementById('status-text');

  // Load existing settings
  chrome.storage.sync.get(
    {
      autoRedirect: true,
      samlUrl: DEFAULT_SAML_URL,
      preserveReturnTo: true
    },
    (items) => {
      toggleAutoRedirect.checked = items.autoRedirect !== false;
      toggleReturnTo.checked = items.preserveReturnTo !== false;
      inputSamlUrl.value = items.samlUrl || DEFAULT_SAML_URL;
      updateStatusDisplay(items.autoRedirect !== false);
    }
  );

  // Check active tab
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs && tabs[0] && tabs[0].url) {
      const currentUrl = tabs[0].url;
      if (currentUrl.includes('lms.bengaluru.liverpool.ac.uk')) {
        statusPill.style.borderColor = '#222B56';
        statusPill.style.background = 'rgba(34, 43, 86, 0.4)';
        statusText.textContent = 'On Canvas';
      }
    }
  });

  function updateStatusDisplay(enabled) {
    if (!enabled) {
      statusPill.style.borderColor = '#ef4444';
      statusPill.style.background = 'rgba(239, 68, 68, 0.2)';
      statusPill.querySelector('.status-dot').style.backgroundColor = '#ef4444';
      statusPill.querySelector('.status-dot').style.boxShadow = '0 0 6px #ef4444';
      statusText.textContent = 'Disabled';
    } else {
      statusPill.style.borderColor = '#10b981';
      statusPill.style.background = 'rgba(16, 185, 129, 0.18)';
      statusPill.querySelector('.status-dot').style.backgroundColor = '#10b981';
      statusPill.querySelector('.status-dot').style.boxShadow = '0 0 6px #10b981';
      statusText.textContent = 'Active';
    }
  }

  // Action: Open SAML 12
  btnLoginSaml.addEventListener('click', () => {
    const targetUrl = inputSamlUrl.value.trim() || DEFAULT_SAML_URL;
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0] && tabs[0].url && tabs[0].url.includes('lms.bengaluru.liverpool.ac.uk')) {
        chrome.tabs.update(tabs[0].id, { url: targetUrl });
      } else {
        chrome.tabs.create({ url: targetUrl });
      }
      window.close();
    });
  });

  // Action: Open Dashboard
  btnOpenDashboard.addEventListener('click', () => {
    chrome.tabs.create({ url: DASHBOARD_URL });
    window.close();
  });

  // Action: Copy SAML URL
  btnCopyUrl.addEventListener('click', () => {
    const targetUrl = inputSamlUrl.value.trim() || DEFAULT_SAML_URL;
    navigator.clipboard.writeText(targetUrl).then(() => {
      copyText.textContent = 'Copied!';
      setTimeout(() => {
        copyText.textContent = 'Copy URL';
      }, 1500);
    });
  });

  // Setting: Toggle Auto-Redirect
  toggleAutoRedirect.addEventListener('change', () => {
    const enabled = toggleAutoRedirect.checked;
    chrome.storage.sync.set({ autoRedirect: enabled }, () => {
      updateStatusDisplay(enabled);
    });
  });

  // Setting: Toggle Preserve ReturnTo
  toggleReturnTo.addEventListener('change', () => {
    const preserve = toggleReturnTo.checked;
    chrome.storage.sync.set({ preserveReturnTo: preserve });
  });

  // Setting: Save Custom URL
  btnSaveSettings.addEventListener('click', () => {
    const customUrl = inputSamlUrl.value.trim();
    if (!customUrl) return;

    chrome.storage.sync.set({ samlUrl: customUrl }, () => {
      btnSaveSettings.textContent = 'Saved!';
      setTimeout(() => {
        btnSaveSettings.textContent = 'Save';
      }, 1500);
    });
  });

  // Setting: Reset Default URL
  btnResetDefault.addEventListener('click', () => {
    inputSamlUrl.value = DEFAULT_SAML_URL;
    chrome.storage.sync.set({ samlUrl: DEFAULT_SAML_URL }, () => {
      btnResetDefault.textContent = 'Reset!';
      setTimeout(() => {
        btnResetDefault.textContent = 'Reset Default';
      }, 1200);
    });
  });
});

