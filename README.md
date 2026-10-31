# UoL Bengaluru Canvas SAML Auto-Login Extension

A lightweight, cross-browser extension for **Google Chrome** and **Mozilla Firefox** that automatically redirects you to the working SAML 12 Single Sign-On (SSO) login endpoint for the **University of Liverpool Bengaluru** Canvas LMS.

---

## 🎯 The Problem Solved

Directly navigating to:
- `https://www.lms.bengaluru.liverpool.ac.uk/` (when logged out)
- `https://www.lms.bengaluru.liverpool.ac.uk/login/canvas`

displays the default Canvas login form (email/password) or an incompatible Microsoft login prompt that fails to authenticate university accounts.

To log in successfully, students and faculty must use:
**`https://www.lms.bengaluru.liverpool.ac.uk/login/saml/12`**

### What this extension does:
1. **Instant Auto-Redirect**: When you visit `lms.bengaluru.liverpool.ac.uk` or `/login/canvas` while not logged in, it immediately redirects you to `/login/saml/12`.
2. **Deep-Link Preservation**: If you click a direct link to an assignment, module, or quiz, the `return_to` parameter is preserved so you land directly on your assignment after authenticating.
3. **Loop Detection & Safeguard**: Prevents rapid redirect loops if authentication fails or is cancelled, displaying a clean banner instead.
4. **Fallback SAML Button**: Injects a branded, high-visibility "Log in with University SAML (SSO)" button directly on the Canvas login page.
5. **Toolbar Popup**: Provides a 1-click button to launch SAML login, open Canvas Dashboard, copy the URL, or toggle auto-redirect.

---

## 🚀 Installation Guide

### Google Chrome (and Chromium browsers: Edge, Brave, Opera)

1. Open Chrome and navigate to:
   ```
   chrome://extensions
   ```
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left.
4. Select the folder:
   ```
   c:\Users\prabh\Projects\LMS_FIX
   ```
   *(Alternatively, you can extract `dist/uol-canvas-saml-chrome.zip` and select that folder).*
5. The extension is now active! Click the puzzle icon in Chrome's toolbar and **pin** the extension.

---

### Mozilla Firefox

#### Option A: Quick Load (Temporary Add-on for development/testing)
1. Open Firefox and navigate to:
   ```
   about:debugging#/runtime/this-firefox
   ```
2. Under **Temporary Extensions**, click **Load Temporary Add-on...**.
3. Browse to `c:\Users\prabh\Projects\LMS_FIX` and select `manifest.json` (or select `dist/uol-canvas-saml-firefox.zip`).
4. The extension will be installed immediately.

#### Option B: Persistent Install (Firefox Developer Edition / Nightly / Unbranded)
1. Go to `about:config` in Firefox and set:
   ```
   xpinstall.signatures.required = false
   ```
2. Drag and drop `dist/uol-canvas-saml-firefox.xpi` into the Firefox window.

---

## 📁 Project Structure

```
LMS_FIX/
├── manifest.json              # WebExtension Manifest V3 (Cross-browser)
├── content.js                 # Content script for detection & auto-redirect
├── content.css                # Injected UI styles (SAML button, banners, toast)
├── popup/
│   ├── popup.html             # Extension toolbar popup interface
│   ├── popup.js               # Popup logic, settings, and tab control
│   └── popup.css              # Popup styling (Navy & Gold branding)
├── icons/
│   ├── icon16.png             # 16x16 icon
│   ├── icon48.png             # 48x48 icon
│   ├── icon128.png            # 128x128 icon
│   └── icon.svg               # Vector SVG icon
├── dist/                      # Pre-packaged ready-to-use zip files
│   ├── uol-canvas-saml-chrome.zip
│   ├── uol-canvas-saml-firefox.zip
│   └── uol-canvas-saml-firefox.xpi
├── generate_icons.py          # Script to re-generate icon assets
└── package_extensions.py      # Automated packager for distribution
```

---

## ⚙️ Configuration & Features

Clicking the extension icon in the browser toolbar opens the popup menu:

- **Open SAML 12 Login**: Instantly opens or updates the active tab to `https://www.lms.bengaluru.liverpool.ac.uk/login/saml/12`.
- **Dashboard**: Quick link to open the Canvas main dashboard.
- **Auto-Redirect Toggle**: Turn auto-redirection on or off at any time.
- **Preserve Deep Links**: Toggle whether assignment/quiz query parameters are carried over to SAML login.
- **Advanced Settings**: Change the SAML URL if your institution changes the ID in the future.

