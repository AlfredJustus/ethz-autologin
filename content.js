// ETHZ Auto-Login content script
// Detects Shibboleth/SWITCH AAI login forms and submits stored credentials.

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

const attemptAutoLogin = () => {
  const fields = findLoginFields();
  if (!fields) return;

  chrome.storage.local.get(['ethz_username', 'ethz_password'], (result) => {
    const username = result.ethz_username;
    const password = result.ethz_password;

    if (!username || !password) return;

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
