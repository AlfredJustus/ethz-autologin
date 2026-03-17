# ETHZ Auto-Login

Chrome extension that automatically logs you into ETHZ websites (Shibboleth / SWITCH AAI). Entirely local — your credentials never leave your browser.

## Features

- **Auto-login** on any `*.ethz.ch` site that uses Shibboleth SSO (Moodle, video.ethz.ch, etc.)
- **Seamless redirect** — clean spinner overlay while the SSO chain completes, no page flashing
- **Security first** — credentials only auto-filled on the trusted IdP (`aai-logon.ethz.ch`), never on arbitrary subdomains
- **Smart failure handling** — detects wrong credentials, shows a notification, and stops (no infinite retry loops)
- **First-install welcome** — guides new users to set up their credentials
- **No-credentials nudge** — subtle notification on login pages if credentials haven't been configured yet

## Install

1. Clone or download this repo
2. Open Chrome → `chrome://extensions`
3. Enable **Developer mode** (top-right toggle)
4. Click **Load unpacked** → select this folder

## Usage

1. Click the extension icon in your toolbar
2. Enter your ETH username and password
3. Click **Save**
4. Visit any ETHZ site — login happens automatically

If your credentials are wrong, the extension will notify you and stop trying. Update your credentials in the popup to try again.

## Privacy & Security

- Credentials stored **locally only** via `chrome.storage.local` (encrypted at rest by Chrome)
- No external network calls, analytics, or tracking
- Auto-fill restricted to `aai-logon.ethz.ch` — a compromised ETHZ subdomain cannot extract your password
- Passwords never displayed in plain text in the UI
- 100% open source — read every line of code

## Files

| File | Purpose |
|------|---------|
| `manifest.json` | Extension config (Manifest V3) |
| `background.js` | First-install handling, failure state management |
| `content.js` | Login form detection, overlay, auto-fill, notifications |
| `popup.html/css/js` | Settings UI for credentials |
| `icons/` | Extension icons |

## License

MIT
