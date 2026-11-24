/* ── Anime3rb Ad Blocker v2 — content.js (ISOLATED world) ── */
/* Handles: DOM ad removal, download UI, chrome.storage messaging.           */
/* Page-level JS patches (Alpine, window.open, spoof) are in bypass.js       */
'use strict';

// ── 1. DOM ad removal ─────────────────────────────────────────────────────
const AD_SELECTORS = [
  'ins.adsbygoogle','[class*="adsbygoogle"]','[id*="adsbygoogle"]',
  '[data-ad-client]','[data-ad-slot]',
  '[class*="ad-container"]:not([class*="video"])',
  '[class*="ad-wrapper"]','[class*="ad-banner"]','[class*="ad-slot"]',
  '[class*="ads-container"]','[class*="banner-ad"]',
  'iframe[src*="exoclick"]','iframe[src*="propellerads"]',
  'iframe[src*="popcash"]','iframe[src*="adsterra"]',
  'iframe[src*="juicyads"]','iframe[src*="hilltopads"]',
  'iframe[src*="mgid"]','iframe[src*="adnxs"]',
  'iframe[src*="googlesyndication"]','iframe[src*="doubleclick"]',
  'iframe[src*="monetag"]','iframe[src*="valueimpression"]',
  'iframe[src*="llvpn"]','iframe[src*="hai8g"]',
  '[class*="preroll"]','[class*="midroll"]',
  '[id*="preroll"]','[id*="midroll"]',
  '[class*="interstitial"]','[id*="interstitial"]',
  '[class*="ad-overlay"]','[id*="ad-overlay"]',
  // Specific adblock-wall elements
  '#pnfzf29w',
  'a[href*="hai8g.com"]',
  'a[href*="llvpn.com"]',
];

// Adblock wall text signatures (Arabic)
const ADBLOCK_TEXT = ['مانع الإعلانات', 'تعطيل مانع', 'مانع الاعلانات'];

function hideEl(el) {
  el.style.setProperty('display','none','important');
  el.style.setProperty('visibility','hidden','important');
  el.style.setProperty('pointer-events','none','important');
}

function sweepAds(root) {
  AD_SELECTORS.forEach(sel => {
    try { root.querySelectorAll(sel).forEach(hideEl); } catch(_) {}
  });

  // Kill fixed-position full-viewport overlays
  root.querySelectorAll?.('div,section').forEach(el => {
    try {
      const st = window.getComputedStyle(el);
      const z = parseInt(st.zIndex, 10);
      if ((st.position === 'fixed' || st.position === 'absolute') && z > 40) {
        const r = el.getBoundingClientRect();
        // Covers >60% viewport
        if (r.width / window.innerWidth > 0.6 && r.height / window.innerHeight > 0.6) {
          const txt = el.textContent || '';
          if (ADBLOCK_TEXT.some(t => txt.includes(t))) {
            hideEl(el);
          }
        }
      }
    } catch(_) {}
  });

  // Restore body scroll if locked by adblock overlay
  const bodySt = document.body && window.getComputedStyle(document.body);
  if (bodySt?.overflow === 'hidden') {
    const txt = document.body.textContent || '';
    if (ADBLOCK_TEXT.some(t => txt.includes(t))) {
      document.body.style.removeProperty('overflow');
      document.documentElement.style.removeProperty('overflow');
    }
  }
}

// Block ad-domain link clicks
document.addEventListener('click', e => {
  const a = e.target.closest('a[target="_blank"]');
  if (!a) return;
  try {
    const h = new URL(a.href).hostname;
    const AD_DOMAINS = ['hai8g','llvpn','exoclick','propellerads','popcash',
      'popads','adsterra','trafficjunky','juicyads','hilltopads','mgid',
      'taboola','outbrain','adnxs','doubleclick','googlesyndication','monetag'];
    if (AD_DOMAINS.some(d => h.includes(d))) {
      e.preventDefault(); e.stopImmediatePropagation();
    }
  } catch (_) {}
}, true);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => sweepAds(document));
} else { sweepAds(document); }

new MutationObserver(muts => {
  for (const m of muts) for (const n of m.addedNodes) {
    if (n.nodeType !== 1) continue;
    sweepAds(n);
    try { if (AD_SELECTORS.some(s => n.matches(s))) hideEl(n); } catch(_) {}
  }
  sweepAds(document);
  // Re-inject panel if Livewire/Alpine wiped it from the DOM
  if (!document.getElementById(DOWNLOAD_BTN_ID) && document.body) {
    renderPanel();
  }
}).observe(document.documentElement, { childList: true, subtree: true });

setInterval(() => {
  sweepAds(document);
  // Keep panel alive against full re-renders
  if (!document.getElementById(DOWNLOAD_BTN_ID) && document.body) {
    renderPanel();
  }
}, 800);

// ── 2. Block pushState/replaceState popunder trick ────────────────────────
// (Handled in bypass.js MAIN world for page-level history API)

// ── 3. Download button injector ───────────────────────────────────────────
const DOWNLOAD_BTN_ID = 'anubis-dl-panel';
let detectedSources = [];
let currentEpisodeTitle = '';

function getEpisodeTitle() {
  return document.title.replace(/ - Anime3rb.*$/i,'').trim() ||
    document.querySelector('h1,h2')?.textContent?.trim() || 'episode';
}
function sanitizeFilename(name) {
  return name.replace(/[/\\?%*:|"<>]/g, '-').replace(/\s+/g, '_').trim();
}

// Method A: sources sent by background.js after it injects into the player iframe
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type !== 'ANIME3RB_SOURCES' || !msg.sources?.length) return;
  detectedSources = msg.sources;
  currentEpisodeTitle = getEpisodeTitle();
  renderPanel();
});

// Method A2: CustomEvent injected by background.js directly into this frame
window.addEventListener('__anubis_sources__', e => {
  if (!e.detail?.length) return;
  detectedSources = e.detail;
  currentEpisodeTitle = getEpisodeTitle();
  renderPanel();
}, false);

// Method A3: postMessage from player.js (MAIN world inside vid3rb iframe, fallback)
window.addEventListener('message', e => {
  if (e.data?.type !== 'ANIME3RB_SOURCES' || !e.data.sources?.length) return;
  detectedSources = e.data.sources;
  currentEpisodeTitle = getEpisodeTitle();
  renderPanel();
}, false);

// Method B: fetch via background service worker (no CORS restriction)
function fetchSourcesDirect() {
  if (detectedSources.length) return;
  let playerUrl = null;

  // 1. iframe src directly in DOM
  document.querySelectorAll('iframe').forEach(f => {
    if (f.src?.includes('vid3rb.com')) playerUrl = f.src;
  });
  // 2. Livewire wire:snapshot component data
  if (!playerUrl) {
    document.querySelectorAll('[wire\\:snapshot]').forEach(el => {
      try {
        const snap = JSON.parse(el.getAttribute('wire:snapshot'));
        const url = snap?.data?.video_url || snap?.data?.videoUrl ||
                    snap?.data?.player_url || snap?.data?.playerUrl;
        if (url?.includes('vid3rb.com')) playerUrl = url;
      } catch(_) {}
    });
  }
  // 3. Regex scan of raw HTML
  if (!playerUrl) {
    const m = document.documentElement.innerHTML
      .match(/https?:\/\/[^"'<>\s]*vid3rb\.com\/player\/[^"'<>\s]+/);
    if (m) playerUrl = m[0];
  }
  if (!playerUrl) return;

  chrome.runtime.sendMessage({ type: 'FETCH_URL', url: playerUrl }, res => {
    if (!res?.ok) return;
    const m = res.text.match(/var video_sources\s*=\s*(\[[\s\S]*?\]);/);
    if (!m) return;
    try {
      const sources = JSON.parse(m[1])
        .filter(s => s.src && !s.premium)
        .map(s => ({ label: s.label || s.res + 'p', url: s.src, res: parseInt(s.res) || 0 }))
        .sort((a, b) => b.res - a.res);
      if (!sources.length) return;
      detectedSources = sources;
      currentEpisodeTitle = getEpisodeTitle();
      renderPanel();
    } catch(_) {}
  });
}

function renderPanel() {
  if (!document.body) return;
  let panel = document.getElementById(DOWNLOAD_BTN_ID);
  if (!panel) {
    panel = document.createElement('div');
    panel.id = DOWNLOAD_BTN_ID;
    document.body.appendChild(panel);
  }

  const isEp = /\/episode\//.test(location.pathname);
  const catUrl = chrome.runtime.getURL('cat.png');

  panel.innerHTML = `
    <div id="anubis-toggle" title="Download video">
      <img src="${catUrl}" alt=""/>
    </div>
    <div id="anubis-box">
      <div class="a-head">
        <span class="a-title">Download</span>
        <button class="a-close" id="anubis-close">✕</button>
      </div>
      <div class="a-body">
        ${!isEp ? `
          <p class="a-hint">Open an episode page to download.</p>
        ` : detectedSources.length ? `
          <p class="a-ep">${currentEpisodeTitle.slice(0,52) || 'Current episode'}</p>
          <div class="a-quals">
            ${detectedSources.map(s => `
              <a class="a-q" href="${s.url}" download="${sanitizeFilename(currentEpisodeTitle)}_${s.label}.mp4" data-url="${s.url}">
                <span class="a-q-label">${s.label}</span>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
            `).join('')}
          </div>
        ` : `
          <div class="a-loading">
            <div class="a-spin"></div>
            <span>Detecting video…</span>
          </div>
        `}
      </div>
    </div>
  `;

  const toggle = panel.querySelector('#anubis-toggle');
  const box    = panel.querySelector('#anubis-box');
  toggle.onclick = () => box.classList.toggle('open');
  panel.querySelector('#anubis-close').onclick = () => box.classList.remove('open');
  panel.querySelectorAll('.a-q').forEach(a => {
    a.onclick = () => chrome.runtime?.sendMessage({ type: 'INCREMENT_DOWNLOAD' });
  });
}

// ── 4. Inject styles ─────────────────────────────────────────────────────────
const style = document.createElement('style');
style.textContent = `
#anubis-dl-panel{position:fixed;bottom:28px;left:28px;z-index:2147483646;font-family:'Segoe UI',system-ui,sans-serif}
#anubis-toggle{width:54px;height:54px;border-radius:50%;overflow:hidden;cursor:pointer;box-shadow:0 4px 18px rgba(99,102,241,.55),0 0 0 2px rgba(139,92,246,.35);transition:transform .18s,box-shadow .18s;user-select:none}
#anubis-toggle:hover{transform:scale(1.1);box-shadow:0 6px 24px rgba(99,102,241,.75),0 0 0 2.5px #8b5cf6}
#anubis-toggle img{width:54px;height:54px;object-fit:cover;image-rendering:pixelated;display:block}
#anubis-box{display:none;position:absolute;bottom:62px;left:0;width:260px;background:#0d1017;border:1px solid rgba(99,102,241,.2);border-radius:14px;overflow:hidden;box-shadow:0 16px 48px rgba(0,0,0,.7),0 0 0 1px rgba(99,102,241,.1)}
#anubis-box.open{display:block;animation:a-in .15s ease}
@keyframes a-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.a-head{display:flex;align-items:center;justify-content:space-between;padding:12px 14px 10px;border-bottom:1px solid rgba(255,255,255,.06)}
.a-title{font-size:12px;font-weight:700;color:#e2e8f0;letter-spacing:.02em}
.a-close{background:none;border:none;cursor:pointer;color:#475569;font-size:13px;padding:2px 5px;border-radius:4px;line-height:1;transition:color .12s}
.a-close:hover{color:#e2e8f0}
.a-body{padding:14px}
.a-hint{font-size:12px;color:#475569;text-align:center;padding:4px 0}
.a-ep{font-size:11px;color:#64748b;margin-bottom:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.a-quals{display:flex;flex-direction:column;gap:7px}
.a-q{display:flex;align-items:center;justify-content:space-between;padding:9px 14px;border-radius:9px;background:rgba(99,102,241,.08);border:1px solid rgba(99,102,241,.18);color:#c7d2fe;font-size:12px;font-weight:600;text-decoration:none;transition:background .15s,border-color .15s,transform .12s}
.a-q:hover{background:rgba(99,102,241,.22);border-color:#6366f1;color:white;transform:translateX(2px)}
.a-q svg{opacity:.7;flex-shrink:0}
.a-q-label{flex:1}
.a-loading{display:flex;align-items:center;gap:9px;color:#475569;font-size:12px;justify-content:center;padding:4px 0}
.a-spin{width:14px;height:14px;border:2px solid #1e293b;border-top-color:#6366f1;border-radius:50%;animation:a-spin .7s linear infinite;flex-shrink:0}
@keyframes a-spin{to{transform:rotate(360deg)}}
`;
(document.head || document.documentElement).appendChild(style);

function initPanel() {
  detectedSources = [];
  currentEpisodeTitle = getEpisodeTitle();
  renderPanel();
  // Also try direct fetch as a belt-and-suspenders fallback
  setTimeout(fetchSourcesDirect, 3000);
  setTimeout(() => { if (!detectedSources.length) fetchSourcesDirect(); }, 7000);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPanel);
} else { initPanel(); }

// Livewire v3 fires this after SPA navigation
document.addEventListener('livewire:navigated', () => { detectedSources = []; initPanel(); });

console.log('[Anime3rb AdBlocker v2] Content ✓');
