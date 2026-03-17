// ETHZ Auto-Login — Background service worker
// Handles first-install welcome page, login failure tracking, and logout bypass.

// Open the welcome/setup page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOGIN_FAILED') {
    chrome.storage.local.set({ ethz_login_failed: true });
    sendResponse({ ok: true });
  }

  if (message.type === 'LOGIN_SUCCEEDED') {
    chrome.storage.local.remove(['ethz_login_failed']);
    sendResponse({ ok: true });
  }

  if (message.type === 'CREDENTIALS_UPDATED') {
    chrome.storage.local.remove(['ethz_login_failed']);
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
  }

  // Logout detected by content script — store bypass timestamp
  // Uses chrome.storage.session (in-memory, cleared when browser closes)
  if (message.type === 'LOGOUT_DETECTED') {
    chrome.storage.session.set({ ethz_logout_at: Date.now() });
    sendResponse({ ok: true });
  }

  // Content script asks if logout bypass is active
  if (message.type === 'CHECK_LOGOUT_BYPASS') {
    chrome.storage.session.get(['ethz_logout_at'], (result) => {
      const logoutAt = result.ethz_logout_at || 0;
      const elapsed = Date.now() - logoutAt;
      // 30 second window — covers the redirect chain but not future visits
      sendResponse({ bypassed: elapsed < 30000 });
    });
    return true; // async sendResponse
  }

  return false;
});
