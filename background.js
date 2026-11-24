/* ── Anime3rb Ad Blocker v2 — Background Service Worker ── */
'use strict';

const AD_HOSTNAMES = [
  'exoclick','propellerads','popcash','popads','adsterra','trafficjunky',
  'juicyads','hilltopads','mgid.com','taboola','outbrain','revcontent',
  'valueimpression','adskeeper','bidvertiser','adcash','monetag','adnxs',
  'doubleclick','googlesyndication','media.net','amazon-adsystem',
  'a-ads.com','popunder','adsense','adservice.google',
];

function isAdHost(url) {
  try {
    const h = new URL(url).hostname;
    return AD_HOSTNAMES.some(d => h.includes(d));
  } catch { return false; }
}

// ── Persist stats across sessions ─────────────────────────────────────────
async function getStats() {
  return new Promise(r => chrome.storage.local.get(
    { blocked_total: 0, blocked_session: 0, downloads: 0, session_start: Date.now() },
    r
  ));
}

async function incrementBlocked() {
  const stats = await getStats();
  await chrome.storage.local.set({
    blocked_total: stats.blocked_total + 1,
    blocked_session: stats.blocked_session + 1,
  });
}

// ── Reset session counter on startup ──────────────────────────────────────
chrome.runtime.onStartup.addListener(async () => {
  const stats = await getStats();
  chrome.storage.local.set({ blocked_session: 0, session_start: Date.now() });
});

chrome.runtime.onInstalled.addListener(async () => {
  chrome.storage.local.set({
    blocked_total: 0, blocked_session: 0,
    downloads: 0, session_start: Date.now(),
  });
  updateBadge(0);
});

// ── webRequest observer — count blocked requests ───────────────────────────
chrome.webRequest.onBeforeRequest.addListener(
  async (details) => {
    if (isAdHost(details.url)) {
      await incrementBlocked();
      const stats = await getStats();
      updateBadge(stats.blocked_session);
    }
  },
  { urls: ['<all_urls>'] }
);

function updateBadge(count) {
  const label = count > 999 ? '999+' : count > 0 ? String(count) : '';
  chrome.action.setBadgeText({ text: label });
  chrome.action.setBadgeBackgroundColor({ color: '#6366f1' });
}

// ── Inject into vid3rb player iframes via webNavigation ───────────────────
// Runs when the player iframe commits, extracts video_sources in MAIN world
// and sends them back to the parent tab's content script.
chrome.webNavigation.onCommitted.addListener(details => {
  if (details.frameId === 0) return; // top frame only skipped, want sub-frames
  if (!details.url.includes('vid3rb.com/player/')) return;

  function tryExtract(tabId, frameId, attempt) {
    chrome.scripting.executeScript({
      target: { tabId, frameIds: [frameId] },
      world: 'MAIN',
      func: () => {
        if (window.video_sources?.length) return window.video_sources;
        for (const s of document.querySelectorAll('script:not([src])')) {
          const m = s.textContent.match(/var video_sources\s*=\s*(\[[\s\S]*?\]);/);
          if (m) { try { return JSON.parse(m[1]); } catch(_) {} }
        }
        return null;
      },
    }).then(results => {
      const raw = results?.[0]?.result;
      if (raw?.length) {
        const sources = raw
          .filter(s => s.src && !s.premium)
          .map(s => ({ label: s.label || s.res + 'p', url: s.src, res: parseInt(s.res) || 0 }))
          .sort((a, b) => b.res - a.res);
        if (!sources.length) return;
        // Inject a CustomEvent into the parent frame (frameId 0) so content.js always gets it
        chrome.scripting.executeScript({
          target: { tabId, frameIds: [0] },
          world: 'ISOLATED',
          func: (srcs) => {
            window.dispatchEvent(new CustomEvent('__anubis_sources__', { detail: srcs }));
          },
          args: [sources],
        }).catch(() => {});
        // Also try sendMessage as backup
        chrome.tabs.sendMessage(tabId, { type: 'ANIME3RB_SOURCES', sources }).catch(() => {});
      } else if (attempt < 15) {
        setTimeout(() => tryExtract(tabId, frameId, attempt + 1), 500);
      }
    }).catch(() => {
      if (attempt < 15) setTimeout(() => tryExtract(tabId, frameId, attempt + 1), 500);
    });
  }

  setTimeout(() => tryExtract(details.tabId, details.frameId, 0), 1000);
}, { url: [{ hostContains: 'vid3rb.com' }] });

// ── Message relay: popup requests stats ───────────────────────────────────
chrome.runtime.onMessage.addListener((msg, sender, respond) => {
  if (msg.type === 'GET_STATS') {
    getStats().then(respond);
    return true;
  }
  if (msg.type === 'RESET_SESSION') {
    chrome.storage.local.set({ blocked_session: 0, session_start: Date.now() }, () => {
      updateBadge(0);
      respond({ ok: true });
    });
    return true;
  }
  if (msg.type === 'INCREMENT_DOWNLOAD') {
    getStats().then(stats => {
      chrome.storage.local.set({ downloads: stats.downloads + 1 }, () => respond({ ok: true }));
    });
    return true;
  }
  // Relay a cross-origin fetch from content.js (bypasses CORS in background)
  if (msg.type === 'FETCH_URL') {
    fetch(msg.url, { credentials: 'omit' })
      .then(r => r.text())
      .then(text => respond({ ok: true, text }))
      .catch(err => respond({ ok: false, error: err.message }));
    return true;
  }
});
