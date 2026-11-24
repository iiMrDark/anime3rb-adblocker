/* ── Anime3rb Ad Blocker v2 — bypass.js (MAIN world, runs before page JS) ── */
/* This file runs in the PAGE's JS context, so it can patch Alpine/window.    */
/* No chrome.* APIs available here.                                            */

'use strict';

// ── A. Spoof ad globals so the site's detection thinks ads are present ──────
(function spoofAdGlobals() {
  const noop = { loaded: true, push: function() {} };
  try {
    Object.defineProperty(window, 'adsbygoogle', { get: () => noop, configurable: true });
  } catch(_) { window.adsbygoogle = noop; }
  window.google_jobrunner = true;
  window._taboola = window._taboola || [];
  window.googletag = window.googletag || { cmd: [], pubadsReady: true, apiReady: true };
})();

// ── B. Block ad detection scripts from running (called from DOM) ─────────────
// These domain strings appear in the llvpn.com tag script injection
const AD_DETECT_HOSTS = ['llvpn.com', 'hai8g.com', 'popads', 'popcash', 'adsterra', 'exoclick'];

// ── C. Intercept CustomEvent dispatches — block adblock-wall open-dialog ────
const ADBLOCK_MODAL_IDS = new Set(['pnfzf29w']);
const PAGE_LOAD_MS = Date.now();

// Obfuscated event name the site uses: u7zhcvo8
const BLOCKED_EVENT_TYPES = new Set(['open-dialog', 'u7zhcvo8']);

const _origDispatch = EventTarget.prototype.dispatchEvent;
EventTarget.prototype.dispatchEvent = function interceptDispatch(event) {
  if (BLOCKED_EVENT_TYPES.has(event.type)) {
    const detail = event.detail;
    const modalId = (typeof detail === 'string' ? detail : detail?.modal) || '';
    if (ADBLOCK_MODAL_IDS.has(modalId)) return true;
    // Auto-fired within 10s of load with no user gesture = adblock wall
    if (Date.now() - PAGE_LOAD_MS < 10000 && !event.isTrusted) {
      try {
        const target = document.getElementById(modalId);
        if (!target || target.textContent.includes('مانع') || target.textContent.includes('اعلان')) {
          return true;
        }
      } catch(_) { return true; }
    }
  }
  return _origDispatch.call(this, event);
};

// Also patch window.dispatchEvent shortcut Alpine uses
const _origWinDispatch = Window.prototype.dispatchEvent;
Window.prototype.dispatchEvent = function interceptWinDispatch(event) {
  if (BLOCKED_EVENT_TYPES.has(event.type)) {
    const detail = event.detail;
    const modalId = (typeof detail === 'string' ? detail : detail?.modal) || '';
    if (ADBLOCK_MODAL_IDS.has(modalId)) return true;
    if (Date.now() - PAGE_LOAD_MS < 10000 && !event.isTrusted) {
      return true;
    }
  }
  return _origWinDispatch.call(this, event);
};

// ── D. Block setInterval used for the countdown (p497s46w) ──────────────────
// The adblock modal uses: setInterval(() => { p497s46w-- ... }, 1000)
// We identify it by patching setInterval and dropping timers that reference adblock vars
const _origSetInterval = window.setInterval;
window.setInterval = function patchedSetInterval(fn, delay, ...args) {
  // Drop suspicious 1000ms intervals that run very early (adblock countdown timer)
  if (delay === 1000 && Date.now() - PAGE_LOAD_MS < 8000) {
    const src = fn?.toString?.() || '';
    if (src.includes('p497s46w') || src.includes('zvex1xtz') || src.includes('isOpen')) {
      return 0; // return fake timer id, don't schedule
    }
  }
  return _origSetInterval.call(window, fn, delay, ...args);
};

// ── E. Patch Alpine.js $dispatch magic once Alpine initialises ───────────────
document.addEventListener('alpine:init', function patchAlpine() {
  if (!window.Alpine) return;
  const _origMagic = window.Alpine.magic.bind(window.Alpine);
  window.Alpine.magic = function(name, fn) {
    if (name === 'dispatch') {
      return _origMagic(name, (el, Alpine) => {
        const orig = fn(el, Alpine);
        return function safeDispatch(eventName, detail = {}) {
          if (BLOCKED_EVENT_TYPES.has(eventName)) {
            const modalId = (typeof detail === 'string' ? detail : detail?.modal) || '';
            if (ADBLOCK_MODAL_IDS.has(modalId)) return;
            if (Date.now() - PAGE_LOAD_MS < 10000) return;
          }
          return orig(eventName, detail);
        };
      });
    }
    return _origMagic(name, fn);
  };
}, { once: true });

// ── F. DOM killer — remove modal + overlay nodes as they appear ─────────────
function killAdblockWall() {
  // Remove full-screen clickjack <a> links
  document.querySelectorAll('a[href*="hai8g.com"], a[href*="llvpn.com"]').forEach(a => {
    const wrapper = a.closest('[id]');
    if (wrapper) ADBLOCK_MODAL_IDS.add(wrapper.id);
    a.remove();
  });

  // Hide each known adblock modal + try to reset Alpine reactive state
  ADBLOCK_MODAL_IDS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.setProperty('display', 'none', 'important');
    // Reset Alpine isOpen reactive state
    try {
      const stack = el._x_dataStack;
      if (stack) {
        for (const ctx of stack) {
          if ('isOpen' in ctx) ctx.isOpen = false;
          if ('p497s46w' in ctx) ctx.p497s46w = 0;
        }
      }
    } catch(_) {}
  });

  // Kill fixed full-screen overlay backdrops containing the adblock modal
  document.querySelectorAll('div').forEach(el => {
    const st = window.getComputedStyle(el);
    if (st.position !== 'fixed' || parseInt(st.zIndex) < 40) return;
    if (el.textContent.includes('مانع الإعلانات') ||
        el.querySelector?.('a[href*="hai8g"]') ||
        el.querySelector?.('[id*="pnfzf"]')) {
      el.style.setProperty('display', 'none', 'important');
    }
  });

  // Unlock body scroll the anti-adblock overlay imposes
  document.body?.style.removeProperty('overflow');
  document.documentElement?.style.removeProperty('overflow');
}

// Run once early and observe DOM changes
if (document.body) killAdblockWall();
document.addEventListener('DOMContentLoaded', killAdblockWall, { once: true });

new MutationObserver(killAdblockWall).observe(
  document.documentElement,
  { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] }
);

// Periodic sweep (catches timer-fired modal opens)
setInterval(killAdblockWall, 600);

// ── G. Block window.open ad popunders ───────────────────────────────────────
const AD_HOSTS = [
  'hai8g','llvpn','exoclick','propellerads','popcash','popads','adsterra',
  'trafficjunky','juicyads','hilltopads','mgid','taboola','outbrain',
  'revcontent','valueimpression','adskeeper','bidvertiser','adcash','monetag',
  'adnxs','doubleclick','googlesyndication',
];
const _origOpen = window.open;
window.open = function safeOpen(url, name, features) {
  if (!url || url === 'about:blank') return null;
  try {
    const h = new URL(url).hostname;
    if (AD_HOSTS.some(d => h.includes(d))) return null;
  } catch(_) {}
  return _origOpen?.call(window, url, name, features);
};
