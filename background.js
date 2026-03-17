// ETHZ Auto-Login — Background service worker
// Handles first-install welcome page and login failure tracking.

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

  return false;
});
