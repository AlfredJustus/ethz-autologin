// ETHZ Auto-Login content script
// Shows a seamless overlay during the Shibboleth redirect chain and
// auto-fills credentials ONLY on the trusted IdP domain.

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

  // ── Detect whether this page is part of the SSO redirect chain ──
  const isIdpPage = () => TRUSTED_IDP_HOSTS.includes(location.hostname);

  const isShibbolethRedirect = () =>
    location.pathname.includes('Shibboleth.sso') ||
    location.pathname.includes('/auth/shibboleth') ||
    location.pathname.includes('/idp/') ||
    // POST-back pages with a hidden SAML form
    !!document.querySelector('form[action*="Shibboleth.sso"]') ||
    !!document.querySelector('input[name="SAMLResponse"]') ||
    !!document.querySelector('input[name="SAMLRequest"]');

  const hasLoginForm = () => {
    const u = findFirstMatch(USERNAME_SELECTORS);
    const p = findFirstMatch(PASSWORD_SELECTORS);
    return !!(u && p);
  };

  // ── Helpers ──
  const findFirstMatch = (selectors) => {
    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el) return el;
    }
    return null;
  };

  const dispatchInputEvents = (el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };

  const findSubmitButton = () => {
    // Primary: Shibboleth IdP proceed button
    const primary =
      document.querySelector('button[name="_eventId_proceed"]') ||
      document.querySelector('input[name="_eventId_proceed"]');
    if (primary) return primary;

    // Standard submit
    const submit =
      document.querySelector('button[type="submit"]') ||
      document.querySelector('input[type="submit"]');
    if (submit) return submit;

    // Fallback: text-match
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

  // ── Overlay ──
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
    // Append to <html> so it covers even before <body> is ready
    document.documentElement.appendChild(overlay);
  };

  const removeOverlay = () => {
    const el = document.getElementById('ethz-autologin-overlay');
    if (el) el.remove();
  };

  // ── Main logic ──
  const run = () => {
    chrome.storage.local.get(['ethz_username', 'ethz_password'], (result) => {
      const username = result.ethz_username;
      const password = result.ethz_password;

      // No credentials saved — do nothing anywhere
      if (!username || !password) return;

      // CASE 1: We're on the IdP login page — overlay + fill + submit
      if (isIdpPage() && hasLoginForm()) {
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

      // CASE 2: We're on a Shibboleth redirect / SAML POST-back page — just overlay
      if (isShibbolethRedirect()) {
        showOverlay();

        // Auto-click any "Continue" / submit button on SAML POST-back forms
        const autoSubmit =
          document.querySelector('form input[type="submit"]') ||
          document.querySelector('form button[type="submit"]');
        if (autoSubmit) {
          setTimeout(() => autoSubmit.click(), 100);
        }
        return;
      }

      // CASE 3: Normal ETHZ page — not part of login flow, do nothing
    });
  };

  run();
})();
