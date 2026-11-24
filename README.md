<div align="center">

<img src="icons/icon128.png" width="96" alt="icon"/>

# Anime3rb Ad Blocker

[![Chrome](https://img.shields.io/badge/Chrome-Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white)](https://developer.chrome.com/docs/extensions/)
[![MV3](https://img.shields.io/badge/Manifest-V3-7c3aed?style=flat-square)](https://developer.chrome.com/docs/extensions/mv3/intro/)
[![Version](https://img.shields.io/badge/version-2.0-22c55e?style=flat-square)](https://github.com/iiMrDark/anime3rb-adblocker/releases)
[![Made by iiMrDark](https://img.shields.io/badge/by-iiMrDark-7c3aed?style=flat-square)](https://github.com/iiMrDark)

<br/>

> **Watch anime the way it was meant to be — no ads, no modals, no interruptions.**

<img src="logo.png" alt="Anime3rb" height="36"/>

</div>

<br/>

---

## What it does

A Chrome extension built for [anime3rb.com](https://anime3rb.com) that silently kills every ad, popup, and anti-adblock wall the moment the page loads — and adds a floating download button so you can save any episode in your preferred quality with one click.

No configuration. No toggles. Install and forget.

---

## Features

| | |
|---|---|
| 🛡️ **Network-level blocking** | 29+ ad network domains blocked before the browser even makes the request — via `declarativeNetRequest` |
| 🔮 **Anti-adblock bypass** | Patches Alpine.js event dispatch and spoofs ad globals so the site never shows its "disable adblock" wall |
| 🧹 **Live DOM sweep** | MutationObserver + interval sweeper continuously removes any ad elements that slip through |
| 🔇 **Popunder trap** | Intercepts `window.open` calls to ad domains at the JS level |
| 🐱 **In-page downloader** | Floating pixel-cat button on every episode — click to pick quality and download instantly |
| 🔢 **Block counter** | Extension badge shows how many requests were blocked this session |

---

## How it works

Three layers run in sequence on every page load:

```
Request → [Layer 1: Network Rules] → blocked before it loads
Page JS → [Layer 2: bypass.js MAIN world] → ad globals spoofed, modal events intercepted
DOM     → [Layer 3: content.js ISOLATED] → remaining elements swept and hidden
```

**Layer 1 — Network rules** (`rules.json`)
Declarative block rules for 29+ ad networks. No JS overhead — the browser engine handles it.

**Layer 2 — JS bypass** (`bypass.js`)
Injected at `document_start` in the page's own JS context. Spoofs `window.adsbygoogle`, `window.googletag`, intercepts the Alpine.js `open-dialog` event that triggers the adblock modal, and kills the countdown timer.

**Layer 3 — DOM sweep** (`content.js`)
CSS selector sweep + MutationObserver on every DOM mutation + interval check. Catches anything that renders dynamically after load.

---

## Download Video

<img align="right" src="cat.png" width="72" alt="pixel cat"/>

On any episode page a **floating pixel-cat** appears in the bottom-left corner.

1. Click the cat
2. A panel slides open with the available qualities (`1080p HEVC`, `1080p`, `720p`, `480p` …)
3. Click a quality — it opens the download in a new tab

The extension reads the direct-download links that anime3rb already provides on every episode page. No scraping the player, no guessing — instant, reliable.

<br clear="right"/>

---

## Installation

> No Web Store listing yet — load it as an unpacked extension:

```bash
git clone https://github.com/iiMrDark/anime3rb-adblocker.git
```

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked** → select the cloned folder
4. Done — visit [anime3rb.com](https://anime3rb.com)

Or download the latest **[Release ZIP](https://github.com/iiMrDark/anime3rb-adblocker/releases)** and load that folder instead.

---

<div align="center">

<sub>crafted in the dark by <a href="https://github.com/iiMrDark"><strong>iiMrDark</strong></a> · 2026</sub>

</div>
