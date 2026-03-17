// ETHZ Auto-Login — Background service worker
// Handles first-install welcome and login failure tracking.

const GITHUB_URL = 'https://github.com/AlfredJustus/ethz-autologin';

// Show welcome page on first install
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Set a flag so the popup knows to show the welcome message
    chrome.storage.local.set({ ethz_show_welcome: true });

    // Open the popup by showing a notification-style badge
    chrome.action.setBadgeText({ text: '!' });
    chrome.action.setBadgeBackgroundColor({ color: '#1F407A' });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'LOGIN_FAILED') {
    // Store failure flag so content script won't retry
    chrome.storage.local.set({ ethz_login_failed: true });
    sendResponse({ ok: true });
  }

  if (message.type === 'LOGIN_SUCCEEDED') {
    // Clear any failure state
    chrome.storage.local.remove(['ethz_login_failed']);
    sendResponse({ ok: true });
  }

  if (message.type === 'CREDENTIALS_UPDATED') {
    // User saved new credentials — clear failure flag so next login attempt proceeds
    chrome.storage.local.remove(['ethz_login_failed']);
    chrome.action.setBadgeText({ text: '' });
    sendResponse({ ok: true });
  }

  return false; // sync response
});
