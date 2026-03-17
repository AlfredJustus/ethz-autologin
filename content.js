// ETHZ Auto-Login content script
// Detects Shibboleth/SWITCH AAI login forms, shows a clean overlay, and submits stored credentials.

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

const findFirstMatch = (selectors) => {
  for (const selector of selectors) {
    const el = document.querySelector(selector);
    if (el) return el;
  }
  return null;
};

const findLoginFields = () => {
  const usernameInput = findFirstMatch(USERNAME_SELECTORS);
  const passwordInput = findFirstMatch(PASSWORD_SELECTORS);
  if (!usernameInput || !passwordInput) return null;
  return { usernameInput, passwordInput };
};

const dispatchInputEvents = (el) => {
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

const findSubmitButton = () => {
  // Primary target: Shibboleth IdP submit button
  const primary =
    document.querySelector('button[name="_eventId_proceed"]') ||
    document.querySelector('input[name="_eventId_proceed"]');
  if (primary) return primary;

  // Standard submit buttons
  const submit =
    document.querySelector('button[type="submit"]') ||
    document.querySelector('input[type="submit"]');
  if (submit) return submit;

  // Fallback: match by button text/value
  const textMatches = /login|anmelden|sign\s*in|weiter/i;
  const candidates = Array.from(
    document.querySelectorAll('button, input[type="button"], input[type="submit"]')
  );

  return (
    candidates.find((el) => {
      if (el.tagName.toLowerCase() === 'input') {
        return textMatches.test(el.value || '');
      }
      return textMatches.test(el.textContent || '');
    }) || null
  );
};

/**
 * Shows a full-page overlay that covers the login form flash.
 * Displayed while credentials are being filled and the form submits.
 */
const showOverlay = () => {
  const overlay = document.createElement('div');
  overlay.id = 'ethz-autologin-overlay';
  overlay.innerHTML = `
    <style>
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
      #ethz-autologin-overlay .spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #e0e0e0;
        border-top-color: #1F407A;
        border-radius: 50%;
        animation: ethz-spin 0.8s linear infinite;
        margin-bottom: 16px;
      }
      #ethz-autologin-overlay .label {
        font-size: 15px;
        font-weight: 500;
        letter-spacing: 0.01em;
      }
      @keyframes ethz-spin {
        to { transform: rotate(360deg); }
      }
    </style>
    <div class="spinner"></div>
    <div class="label">Signing in to ETHZ…</div>
  `;
  document.documentElement.appendChild(overlay);
};

const attemptAutoLogin = () => {
  const fields = findLoginFields();
  if (!fields) return;

  chrome.storage.local.get(['ethz_username', 'ethz_password'], (result) => {
    const username = result.ethz_username;
    const password = result.ethz_password;

    if (!username || !password) return;

    // Show overlay immediately to cover the raw form
    showOverlay();

    fields.usernameInput.value = username;
    fields.passwordInput.value = password;

    dispatchInputEvents(fields.usernameInput);
    dispatchInputEvents(fields.passwordInput);

    const submitButton = findSubmitButton();
    if (!submitButton) return;

    setTimeout(() => {
      submitButton.click();
    }, 300);
  });
};

// Run after DOM is idle.
attemptAutoLogin();
