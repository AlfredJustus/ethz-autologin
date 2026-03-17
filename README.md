# ETHZ Auto-Login Chrome Extension

Automatically logs you into ETHZ Shibboleth/SWITCH AAI login pages on `*.ethz.ch` using locally stored credentials.

## Features
- Saves ETHZ username + password in `chrome.storage.local`
- Detects Shibboleth login form (`j_username` / `j_password`) on any `*.ethz.ch` page
- Auto-fills and submits the form
- Clean popup UI for managing credentials

## Install (Load Unpacked)
1. Open Chrome and go to `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `extension/` folder in this project

## Use
1. Click the extension icon
2. Enter your ETH username and password
3. Click **Save**
4. Visit any ETHZ site that triggers the Shibboleth login — it will auto-fill and submit

## Privacy
- Credentials are stored **locally only** in your browser via `chrome.storage.local`
- No external network calls, analytics, or tracking

## Files
- `content.js` – detects login forms and submits them
- `popup.html/css/js` – UI for managing credentials
- `icons/` – extension icons
