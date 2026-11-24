/* ── Anime3rb Ad Blocker v2 — player.js (MAIN world, vid3rb.com iframe) ── */
console.log('[Anubis] player.js injected on', location.href);
/* Runs inside the video player iframe at vid3rb.com/player/*                 */
/* MAIN world = can read window.video_sources set by the page's inline script */
'use strict';

function extractSources() {
  // Method 1: read the JS variable directly (MAIN world can do this)
  if (window.video_sources && Array.isArray(window.video_sources)) {
    const srcs = window.video_sources
      .filter(s => s.src && !s.premium)
      .map(s => ({ label: s.label || s.res + 'p', url: s.src, res: parseInt(s.res) || 0 }))
      .sort((a, b) => b.res - a.res);
    if (srcs.length) return srcs;
  }

  // Method 2: parse inline script text (fallback if variable not yet assigned)
  const scripts = document.querySelectorAll('script:not([src])');
  for (const s of scripts) {
    const m = s.textContent.match(/var video_sources\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) continue;
    try {
      const arr = JSON.parse(m[1]);
      const srcs = arr
        .filter(x => x.src && !x.premium)
        .map(x => ({ label: x.label || x.res + 'p', url: x.src, res: parseInt(x.res) || 0 }))
        .sort((a, b) => b.res - a.res);
      if (srcs.length) return srcs;
    } catch(_) {}
  }
  return null;
}

function trySend() {
  const sources = extractSources();
  if (!sources || !sources.length) return false;
  try {
    window.parent.postMessage({ type: 'ANIME3RB_SOURCES', sources }, '*');
  } catch(_) {}
  return true;
}

// Try immediately, then wait for scripts to load
if (!trySend()) {
  let tries = 0;
  const poll = setInterval(() => {
    if (trySend() || ++tries > 30) clearInterval(poll);
  }, 300);

  // Also observe DOM for new inline scripts being added
  new MutationObserver(() => {
    if (trySend()) { tries = 999; }
  }).observe(document.documentElement, { childList: true, subtree: true });
}
