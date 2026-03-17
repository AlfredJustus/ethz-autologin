// ETHZ Auto-Login content script
// Shows a seamless overlay during the Shibboleth redirect chain,
// auto-fills credentials ONLY on the trusted IdP domain,
// detects login failures, respects manual logout, and shows contextual notifications.

(() => {
  'use strict';

  // ── Security: only auto-fill on the actual ETHZ Identity Provider ──
  const TRUSTED_IDP_HOSTS = ['aai-logon.ethz.ch'];

  const USERNAME_SELECTORS = [
    'input[name="j_username"]',
    'input[name="username"]',
    'input#username',
    'input[type="text"][name*="user"]'
  ];

  const PASSWORD_SELECTORS = [
    'input[name="j_password"]',
    'input[name="password"]',
    'input#password',
    'input[type="password"]'
  ];

  // ── Detection helpers ──
  const isIdpPage = () => TRUSTED_IDP_HOSTS.includes(location.hostname);

  const isShibbolethRedirect = () =>
    location.pathname.includes('Shibboleth.sso') ||
    location.pathname.includes('/auth/shibboleth') ||
    location.pathname.includes('/idp/') ||
    !!document.querySelector('form[action*="Shibboleth.sso"]') ||
    !!document.querySelector('input[name="SAMLResponse"]') ||
    !!document.querySelector('input[name="SAMLRequest"]');

  const findFirstMatch = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const hasLoginForm = () => {
    const u = findFirstMatch(USERNAME_SELECTORS);
    const p = findFirstMatch(PASSWORD_SELECTORS);
    return !!(u && p);
  };

  const dispatchInputEvents = (el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const findSubmitButton = () => {
    const primary =
      document.querySelector('button[name="_eventId_proceed"]') ||
      document.querySelector('input[name="_eventId_proceed"]');
    if (primary) return primary;

    const submit =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]');
    if (submit) return submit;

    const pattern = /login|anmelden|sign\s*in|weiter|continue/i;
    const candidates = Array.from(
      document.querySelectorAll('button, input[type="button"], input[type="submit"]')
    );
    return (
      candidates.find((el) => {
        const text = el.tagName === 'INPUT' ? (el.value || '') : (el.textContent || '');
        return pattern.test(text);
      }) || null
    );
  };

  // ── Logout detection ──
  // Watches for clicks on logout links/buttons. On click, notifies the background
  // script which stores a 30-second bypass window in chrome.storage.session.
  // This survives the page navigation (unlike JS variables) but expires quickly
  // (unlike the old 10-minute chrome.storage.local approach).
  const LOGOUT_PATTERN = /log\s*out|sign\s*out|abmelden|ausloggen|d[eé]connexion/i;

  const watchForLogout = () => {
    document.addEventListener('click', (e) => {
      const target = e.target.closest('a, button');
      if (!target) return;

      const text = target.textContent || '';
      const href = target.getAttribute('href') || '';

      if (LOGOUT_PATTERN.test(text) || LOGOUT_PATTERN.test(href) ||
          href.includes('logout') || href.includes('Logout') ||
          href.includes('Shibboleth.sso/Logout')) {
        // Tell background to set the bypass timestamp
        chrome.runtime.sendMessage({ type: 'LOGOUT_DETECTED' });
      }
    }, true); // capture phase — fires before navigation
  };

  // ── Detect login errors on the page ──
  const hasLoginError = () => {
    const errorSelectors = [
      '.login-error',
      '.error-message',
      '.form-error',
      'p.output--error',
      'p.output-error',
      '.alert-danger',
      '.alert-error'
    ];
    for (const sel of errorSelectors) {
      const el = document.querySelector(sel);
      if (el && el.offsetParent !== null) return true;
    }
    const body = document.body?.textContent || '';
    return /incorrect.*password|wrong.*password|invalid.*credentials|authentication.*failed|login.*failed|falsches.*passwort|anmeldung.*fehlgeschlagen/i.test(body);
  };

  // ── Toast notification system ──
  const TOAST_CSS = `
    #ethz-autologin-toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 2147483647;
      max-width: 360px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #1b1b1b;
      padding: 16px;
      animation: ethz-toast-in 0.3s ease-out;
    }
    #ethz-autologin-toast.toast-error {
      border-left: 4px solid #c62828;
    }
    #ethz-autologin-toast.toast-info {
      border-left: 4px solid #1F407A;
    }
    #ethz-autologin-toast .toast-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    #ethz-autologin-toast .toast-title {
      font-size: 14px;
      font-weight: 600;
      color: #1F407A;
    }
    #ethz-autologin-toast .toast-close {
      background: none;
      border: none;
      font-size: 18px;
      color: #999;
      cursor: pointer;
      padding: 0 4px;
      line-height: 1;
    }
    #ethz-autologin-toast .toast-close:hover {
      color: #333;
    }
    #ethz-autologin-toast .toast-body {
      font-size: 13px;
      line-height: 1.5;
      color: #444;
    }
    #ethz-autologin-toast .toast-body a {
      color: #1F407A;
      text-decoration: underline;
    }
    #ethz-autologin-toast .toast-action {
      display: inline-block;
      margin-top: 10px;
      padding: 6px 14px;
      background: #1F407A;
      color: #fff;
      border: none;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      text-decoration: none;
    }
    #ethz-autologin-toast .toast-action:hover {
      background: #163060;
    }
    #ethz-autologin-toast .toast-action.danger {
      background: #c62828;
    }
    #ethz-autologin-toast .toast-action.danger:hover {
      background: #a11f1f;
    }
    @keyframes ethz-toast-in {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }
  `;

  let toastStyleInjected = false;

  const showToast = ({ title, body, type = 'info', action = null }) => {
    const existing = document.getElementById('ethz-autologin-toast');
    if (existing) existing.remove();

    if (!toastStyleInjected) {
      const style = document.createElement('style');
      style.textContent = TOAST_CSS;
      document.documentElement.appendChild(style);
      toastStyleInjected = true;
    }

    const toast = document.createElement('div');
    toast.id = 'ethz-autologin-toast';
    toast.classList.add(type === 'error' ? 'toast-error' : 'toast-info');

    let actionHtml = '';
    if (action) {
      actionHtml = `<button class="toast-action ${action.danger ? 'danger' : ''}" id="ethz-toast-action">${action.label}</button>`;
    }

    toast.innerHTML = `
      <div class="toast-header">
        <span class="toast-title">${title}</span>
        <button class="toast-close" id="ethz-toast-close">×</button>
      </div>
      <div class="toast-body">${body}${actionHtml}</div>
    `;

    document.documentElement.appendChild(toast);

    toast.querySelector('#ethz-toast-close').addEventListener('click', () => toast.remove());

    if (action?.onClick) {
      toast.querySelector('#ethz-toast-action')?.addEventListener('click', action.onClick);
    }

    if (type !== 'error') {
      setTimeout(() => toast.remove(), 15000);
    }
  };

  const openExtensionPopup = () => {
    showToast({
      title: 'ETHZ Auto-Login',
      body: 'Click the extension icon <strong>(🔒 E)</strong> in your toolbar to add or update your credentials.',
      type: 'info'
    });
  };

  // ── Overlay (for seamless redirects) ──
  const OVERLAY_CSS = `
    #ethz-autologin-overlay {
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #ffffff;
      font-family: "Inter", "Segoe UI", system-ui, -apple-system, sans-serif;
      color: #1F407A;
    }
    #ethz-autologin-overlay .ethz-spinner {
      width: 32px;
      height: 32px;
      border: 3px solid #e0e0e0;
      border-top-color: #1F407A;
      border-radius: 50%;
      animation: ethz-spin 0.8s linear infinite;
      margin-bottom: 16px;
    }
    #ethz-autologin-overlay .ethz-label {
      font-size: 15px;
      font-weight: 500;
      letter-spacing: 0.01em;
    }
    @keyframes ethz-spin {
      to { transform: rotate(360deg); }
    }
  `;

  const showOverlay = () => {
    if (document.getElementById('ethz-autologin-overlay')) return;
    const overlay = document.createElement('div');
    overlay.id = 'ethz-autologin-overlay';
    overlay.innerHTML = `
      <style>${OVERLAY_CSS}</style>
      <div class="ethz-spinner"></div>
      <div class="ethz-label">Signing in to ETHZ…</div>
    `;
    document.documentElement.appendChild(overlay);

    // Safety timeout: if login hasn't completed in 5s, remove overlay
    // and let the user interact with the page manually
    setTimeout(() => {
      const el = document.getElementById('ethz-autologin-overlay');
      if (el) el.remove();
    }, 5000);
  };

  // ── Main logic ──
  const run = () => {
    // Always watch for logout clicks on any ETHZ page
    watchForLogout();

    // First check if we're in a post-logout bypass window (async, via background)
    chrome.runtime.sendMessage({ type: 'CHECK_LOGOUT_BYPASS' }, (response) => {
      if (response?.bypassed) return; // User just logged out — don't auto-login

      chrome.storage.local.get(
        ['ethz_username', 'ethz_password', 'ethz_login_failed'],
        (result) => {
          const username = result.ethz_username;
          const password = result.ethz_password;
          const hasCreds = !!(username && password);
          const previouslyFailed = !!result.ethz_login_failed;

          // ─── IdP login page ───
          if (isIdpPage() && hasLoginForm()) {

            if (hasLoginError() && hasCreds) {
              chrome.runtime.sendMessage({ type: 'LOGIN_FAILED' });
              showToast({
                title: 'Login failed',
                body: 'Your saved ETHZ credentials appear to be incorrect. Update or remove them in the extension settings.',
                type: 'error',
                action: {
                  label: 'Update credentials',
                  danger: true,
                  onClick: openExtensionPopup
                }
              });
              return;
            }

            if (previouslyFailed) {
              showToast({
                title: 'Auto-login paused',
                body: 'A previous login attempt failed. Update your credentials in the extension to try again.',
                type: 'error',
                action: {
                  label: 'Update credentials',
                  danger: true,
                  onClick: openExtensionPopup
                }
              });
              return;
            }

            if (!hasCreds) {
              showToast({
                title: 'ETHZ Auto-Login',
                body: 'You haven\'t set up your login credentials yet. Click the extension icon to add them and skip this page next time.',
                type: 'info'
              });
              return;
            }

            // Happy path: overlay + fill + submit
            showOverlay();

            const u = findFirstMatch(USERNAME_SELECTORS);
            const p = findFirstMatch(PASSWORD_SELECTORS);

            u.value = username;
            p.value = password;
            dispatchInputEvents(u);
            dispatchInputEvents(p);

            const btn = findSubmitButton();
            if (btn) {
              setTimeout(() => btn.click(), 300);
            }
            return;
          }

          // ─── Shibboleth redirect / SAML POST-back ───
          // These pages auto-redirect via the browser (302) or have hidden auto-submit forms.
          // We don't show an overlay here — the browser handles the redirect natively.
          // We only help by clicking submit on SAML POST-back forms that need a manual click.
          if (isShibbolethRedirect() && hasCreds && !previouslyFailed) {
            const autoSubmit =
              document.querySelector('form input[type="submit"]') ||
              document.querySelector('form button[type="submit"]');
            if (autoSubmit) {
              setTimeout(() => autoSubmit.click(), 100);
            }
            return;
          }

          // ─── Normal ETHZ page — login succeeded ───
          if (hasCreds && !isIdpPage() && !isShibbolethRedirect()) {
            chrome.runtime.sendMessage({ type: 'LOGIN_SUCCEEDED' });
          }
        }
      );
    });
  };

  run();
})();
