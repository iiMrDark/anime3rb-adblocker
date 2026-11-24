<div align="center">

# 🛡️ Anime3rb Ad Blocker

[![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![Manifest V3](https://img.shields.io/badge/Manifest-V3-7c3aed?style=for-the-badge&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/Version-2.0-22c55e?style=for-the-badge)](https://github.com/iiMrDark/anime3rb-adblocker)
[![License](https://img.shields.io/badge/License-MIT-f59e0b?style=for-the-badge)](LICENSE)

**A powerful Chrome extension that eliminates all ads, popups, and anti-adblock walls on [anime3rb.com](https://anime3rb.com) — with a built-in video downloader.**

*إضافة كروم تحجب جميع الإعلانات والنوافذ المنبثقة على موقع أنمي:rb مع خاصية تحميل الحلقات مباشرة.*

</div>

---

## ✨ Features

- 🌐 **29+ Ad Networks Blocked** — declarativeNetRequest rules kill requests at the network level before they load
- 🚫 **Anti-Adblock Wall Bypassed** — patches Alpine.js event dispatch and spoofs ad globals so the site never shows its "please disable adblock" modal
- 🧹 **DOM Sweep** — MutationObserver continuously removes popups, overlays, and injected ad elements
- 🔇 **Popunder Blocker** — intercepts `window.open` calls to known ad domains
- 🎞️ **In-Page Video Downloader** — floating cat button on every episode page; pick your quality and download directly
- 📊 **Blocked Request Counter** — badge on the extension icon shows how many requests were blocked this session

---

## 🔧 How It Works

The extension uses a **3-layer protection system**:

### Layer 1 — Network Rules
`rules.json` contains 29 `declarativeNetRequest` rules that block ad network domains (DoubleClick, ExoClick, PropellerAds, llvpn.com, hai8g.com, and more) **before** the browser even makes the request.

### Layer 2 — JavaScript Bypass (`bypass.js`)
Runs in the **page's MAIN world** at `document_start`, before Alpine.js or Livewire initialise:
- Spoofs `window.adsbygoogle`, `window.googletag`, `window.google_jobrunner`
- Patches `EventTarget.prototype.dispatchEvent` to intercept the `open-dialog` event that opens the anti-adblock modal (`#pnfzf29w`)
- Patches `window.setInterval` to drop the countdown timer the modal uses
- Blocks `window.open` to ad destinations

### Layer 3 — DOM Sweep (`content.js`)
Runs in an **ISOLATED world** at `document_idle`:
- CSS selector sweep hides any surviving ad elements
- MutationObserver re-runs the sweep on every DOM change
- `setInterval` sweep every 800ms as a final safety net

---

## 📦 Installation

> Chrome Web Store listing coming soon. For now, load it unpacked:

1. **Download or clone** this repository
   ```bash
   git clone https://github.com/iiMrDark/anime3rb-adblocker.git
   ```

2. Open Chrome and navigate to:
   ```
   chrome://extensions/
   ```

3. Enable **Developer mode** (toggle in the top-right corner)

4. Click **"Load unpacked"** and select the `anime3rb-adblocker` folder

5. The extension icon will appear in your toolbar — visit [anime3rb.com](https://anime3rb.com) and enjoy ad-free anime 🎉

---

## 🎞️ Download Video

On any episode page, a **floating pixel-cat button** appears in the bottom-left corner.

1. Click the cat 🐱
2. The panel opens showing the available qualities for the current episode (e.g. `1080p`, `720p`, `480p`)
3. Click a quality button — the video downloads directly via your browser

> **How it finds the video:** The background service worker listens for the vid3rb.com player iframe to load, injects into it with MAIN world access, reads the `video_sources` JS variable, and sends the URLs back to the page — no scraping, no guessing.

---

## 📁 Files

| File | Description |
|------|-------------|
| `manifest.json` | Extension manifest (MV3), permissions, content script declarations |
| `bypass.js` | MAIN world script — patches Alpine.js, spoofs ad globals, blocks modal events |
| `content.js` | ISOLATED world — DOM sweep, ad removal, download panel UI |
| `player.js` | MAIN world on vid3rb.com — reads `window.video_sources` from the player iframe |
| `background.js` | Service worker — blocked request counter, webNavigation iframe injection, fetch relay |
| `rules.json` | 29 declarativeNetRequest block rules |
| `blocker.css` | CSS injected at document_start to hide ad elements instantly |
| `popup.html` | Extension popup UI |
| `cat.png` | Pixel cat mascot (download button icon) |
| `bg.png` | Anime background for popup |
| `icons/` | Extension icons at 16×16, 48×48, 128×128 |

---

## 📄 License

MIT License — see [LICENSE](LICENSE) for details.

---

<div align="center">

Made with ❤️ by [iiMrDark](https://github.com/iiMrDark)

</div>
