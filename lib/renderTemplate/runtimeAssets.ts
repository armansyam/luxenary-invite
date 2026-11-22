import { LIVE_EDIT_FIELD_PATTERN } from "@/lib/liveEditFields";
import {
  BG_PHOTO_TONE_SELECTOR,
  BG_PHOTO_TONE_STYLE_ID,
  BG_SCRIM_APPLY_JS,
  bgPhotoToneFilter,
  rescaleScrimLayers,
} from "@/lib/bgPhotoTone";

/**
 * toast dipatok ke kolom 460px. `clip` tidak membuat kontainer gulir dan tidak memotong elemen fixed; `hidden` hanya
 * cadangan peramban lama. Dua keluarga master memakai nama kelas berbeda, jadi kedua daftar selektor dimuat di sini.
 */
export const DESKTOP_CONTAINMENT_STYLE = `<style id="luxDesktopContainment">
@media (min-width: 900px) {
  .sidebar-desktop, .left-hero { z-index: 50 !important; overflow: hidden !important; }
  .main-scroll-panel, .right-panel, .page-wrap { overflow-x: hidden; overflow-x: clip; }
  .modal-bg { left: calc(100% - 460px) !important; right: 0 !important; width: 460px !important; }
  #luxCopyToast { left: calc(100% - 230px) !important; }
}
</style>`;

export const LUXENARY_BANNER = `<!--
  ==============================================================
  STOP! PERHATIAN!
  --------------------------------------------------------------
  Sistem dan desain tema ini adalah properti sistem berlisensi resmi.
  Dilarang keras menyalin, menduplikasi, atau menjual ulang
  tanpa izin resmi dari pemilik platform.

  Hak cipta dilindungi undang-undang.
  ==============================================================
-->\n`;

export const LUXENARY_PROTECTION_SCRIPT = `
<!-- PLATFORM PROTECTION SCRIPT -->
<script>
  (function() {
    try {
      if (window.console && console.log) {
        console.log("%cSTOP!", "color: #ef4444; font-size: 50px; font-weight: 900; text-shadow: 2px 2px 0 #000; font-family: sans-serif;");
        console.log("%cIni adalah properti sistem berlisensi resmi.", "color: #b5833c; font-size: 20px; font-weight: bold;");
        console.log("%cSegala bentuk pencurian kode, scraping, atau modifikasi ilegal dilarang keras. Domain saat ini: " + window.location.hostname, "font-size: 14px; color: #a8a29e;");
      }
    } catch(e) {}
  })();
</script>
`;

export const HEAD_AUDIO_BLOCKER_SCRIPT = `
<script>
(function() {
  const isAutoplay = new URLSearchParams(window.location.search).get('autoplay') === '1' || (window !== window.top && new URLSearchParams(window.location.search).get('mode') !== 'edit');
  if (isAutoplay) {
    window.__DISABLE_AUDIO__ = true;
    try {
      if (window.HTMLMediaElement) {
        window.HTMLMediaElement.prototype.play = function() {
          this.muted = true;
          this.pause();
          return Promise.resolve();
        };
      }
      if (window.Audio) {
        window.Audio.prototype.play = function() {
          this.muted = true;
          this.pause();
          return Promise.resolve();
        };
      }
    } catch(e) {}
  }
})();
</script>
`;

export const AUTOPLAY_SHOWCASE_SCRIPT = `
<style id="luxCardCleanStyles">
  /* Card Preview Mode: Completely hide all floating UI buttons, dock navigation, and audio player */
  .music-fab, #musicFab, .floating-music, .audio-player,
  .fullscreen-btn, #fullscreenBtn, .btn-fullscreen, .btn-fs, .floating-action,
  .bottom-dock, nav.bottom-dock, .dock-container, nav.bottom-nav, .dock, .bottom-nav,
  #themePreloader, .lux-universal-preloader,
  button[onclick*="toggleFullscreen"], button[onclick*="toggleAudio"] {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    pointer-events: none !important;
  }
</style>

<script>
(function() {
  const isAutoplay = new URLSearchParams(window.location.search).get('autoplay') === '1';
  if (!isAutoplay) {
    const s = document.getElementById('luxCardCleanStyles');
    if (s) s.remove();
    return;
  }

  // 1. Completely silence & disable audio playback in card preview mode
  try {
    window.playAudio = function() {};
    window.toggleAudio = function() {};
    if (window.HTMLMediaElement) {
      window.HTMLMediaElement.prototype.play = function() { return Promise.resolve(); };
    }
  } catch(e) {}

  function cleanCardDOM() {
    try {
      window.playAudio = function() {};
      window.toggleAudio = function() {};
      document.querySelectorAll('audio, video, #bgAudio').forEach(el => {
        try {
          el.muted = true;
          el.pause();
          el.volume = 0;
          el.src = '';
          el.removeAttribute('src');
        } catch(e){}
        try { el.remove(); } catch(e){ el.style.display = 'none'; }
      });
      const selectors = [
        '.music-fab', '#musicFab', '.floating-music',
        '.fullscreen-btn', '#fullscreenBtn', '.btn-fullscreen', '.btn-fs',
        '.bottom-dock', 'nav.bottom-dock', '.dock-container', 'nav.bottom-nav',
        '#themePreloader', '.lux-universal-preloader'
      ];
      selectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          try { el.remove(); } catch(e){ el.style.display = 'none'; }
        });
      });
    } catch(e){}
  }

  cleanCardDOM();
  document.addEventListener('DOMContentLoaded', cleanCardDOM);

  // 2. Pre-decode and preload all images in the background so there is zero blank flash
  function prefetchPageImages() {
    const imgs = Array.from(document.querySelectorAll('img'));
    imgs.forEach(img => {
      if (img.loading === 'lazy') img.loading = 'eager';
      if (img.decode) {
        try { img.decode().catch(() => {}); } catch(e){}
      }
    });
  }

  function findScrollTarget() {
    const rp = document.getElementById('rightPanel') || document.querySelector('.right-panel') || document.querySelector('.main-scroll-panel');
    if (rp && rp.scrollHeight > rp.clientHeight + 40) return rp;
    
    const sc = document.querySelector('.scroll-wrapper') || document.querySelector('.main-content') || document.getElementById('mainContent') || document.getElementById('app');
    if (sc && sc.scrollHeight > sc.clientHeight + 40) return sc;

    if (document.documentElement.scrollHeight > window.innerHeight + 40) return window;
    if (document.body.scrollHeight > window.innerHeight + 40) return document.body;

    const allDivs = document.querySelectorAll('div, section, main');
    for (let i = 0; i < allDivs.length; i++) {
      const el = allDivs[i];
      if (el.scrollHeight > el.clientHeight + 80 && el.clientHeight > 150) {
        return el;
      }
    }
    return window;
  }

  function triggerOpenCover() {
    const cover = document.getElementById('coverScreen') || document.querySelector('.cover-screen') || document.querySelector('.screen-cover') || document.querySelector('.landing-cover');
    if (cover) {
      cover.classList.add('hidden', 'opened');
      cover.style.transform = 'translateY(-100%)';
      cover.style.transition = 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
    }
  }

  function triggerCloseCover() {
    const cover = document.getElementById('coverScreen') || document.querySelector('.cover-screen') || document.querySelector('.screen-cover') || document.querySelector('.landing-cover');
    if (cover) {
      cover.classList.remove('opened', 'hidden');
      cover.style.transform = 'translateY(0%)';
      cover.style.transition = 'transform 0.65s ease-in-out';
    }
  }

  function runAutoplay() {
    cleanCardDOM();
    prefetchPageImages();

    // Step 1: Relaxed Cover display (3.0s) giving plenty of time to admire cover & prefetch images
    setTimeout(() => {
      triggerOpenCover();

      // Step 2: Calm pause (1.4s) on the opening hero section before scrolling
      setTimeout(() => {
        const target = findScrollTarget();
        const isWin = target === window;

        function getMax() {
          if (isWin) {
            return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
          } else {
            return target.scrollHeight - target.clientHeight;
          }
        }

        let direction = 1; // 1 = down, -1 = up
        let speed = 2.0; // calm, comfortable, elegant speed

        function scrollStep() {
          const max = getMax();
          if (max <= 10) {
            requestAnimationFrame(scrollStep);
            return;
          }

          let cur = isWin ? (window.pageYOffset || document.documentElement.scrollTop || 0) : target.scrollTop;
          let next = cur + (direction * speed);

          if (direction === 1 && next >= max) {
            // Reached bottom footer, pause for 2.0s to let visitor see closing
            setTimeout(() => {
              direction = -1;
              speed = 6.5; // smooth rewind to top
              requestAnimationFrame(scrollStep);
            }, 2000);
            return;
          } else if (direction === -1 && next <= 0) {
            // Reached top, close cover and restart relaxed cycle
            if (isWin) window.scrollTo(0, 0);
            else target.scrollTop = 0;

            triggerCloseCover();

            setTimeout(() => {
              triggerOpenCover();
              setTimeout(() => {
                direction = 1;
                speed = 2.0;
                requestAnimationFrame(scrollStep);
              }, 1400);
            }, 3000);
            return;
          }

          if (isWin) window.scrollTo(0, next);
          else target.scrollTop = next;

          requestAnimationFrame(scrollStep);
        }

        requestAnimationFrame(scrollStep);
      }, 1400);
    }, 3000);
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    runAutoplay();
  } else {
    document.addEventListener('DOMContentLoaded', runAutoplay);
  }
})();
</script>
`;

export const INLINE_LIVE_EDITOR_SCRIPT = `
<style id="luxInlineEditorStyles">
  [data-lux-field] {
    outline: 1.5px dashed rgba(212, 175, 55, 0.45);
    outline-offset: 4px;
    cursor: text !important;
    position: relative;
    transition: outline 0.2s, background-color 0.2s;
    border-radius: 4px;
  }
  [data-lux-field]:hover {
    outline: 2px solid #d4af37 !important;
    background-color: rgba(212, 175, 55, 0.12) !important;
  }
  [data-lux-field]:focus {
    outline: 2px solid #f3e5ab !important;
    background-color: rgba(212, 175, 55, 0.2) !important;
  }
  .lux-live-editor-dock {
    position: fixed;
    top: 14px;
    right: 14px;
    z-index: 999999;
    background: rgba(15, 23, 42, 0.92);
    border: 1px solid rgba(212, 175, 55, 0.4);
    padding: 6px 14px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.2);
    backdrop-filter: blur(16px);
    color: #ffffff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    user-select: none;
  }
  .lux-dock-btn {
    padding: 5px 14px;
    border-radius: 20px;
    border: none;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    transition: transform 0.2s, opacity 0.2s;
  }
  .lux-dock-btn-save {
    background: linear-gradient(90deg, #d4af37 0%, #f3e5ab 100%);
    color: #071712;
  }
  .lux-dock-btn-save:hover { transform: scale(1.05); }
  .lux-dock-btn-save:disabled { opacity: 0.5; cursor: not-allowed; }
  .lux-dock-status {
    display: flex;
    align-items: center;
    gap: 6px;
    color: #f3e5ab;
    font-size: 11px;
    font-weight: 600;
  }
  .lux-dock-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #10b981;
    box-shadow: 0 0 8px #10b981;
  }
</style>

<script id="luxInlineEditorEngine">
(function() {
  const isEditMode = new URLSearchParams(window.location.search).get('mode') === 'edit' || window.__LUX_EDIT_MODE__ === true;
  if (!isEditMode) return;

  const pendingChanges = {};
  const viewRole = new URLSearchParams(window.location.search).get('view') || (window.innerWidth < 600 ? 'mobile' : 'desktop');
  const LIVE_EDIT_FIELD_RE = new RegExp(${JSON.stringify(LIVE_EDIT_FIELD_PATTERN)});

  // Universal open invitation with cross-iframe synchronization
  function executeUniversalOpenInvitation(isRemote) {
    try {
      if (typeof window.__luxOriginalOpenInvitation === 'function') {
        window.__luxOriginalOpenInvitation();
      } else if (typeof window.openInvitation === 'function' && window.openInvitation !== executeUniversalOpenInvitation) {
        window.openInvitation();
      }
    } catch(err) {
      console.warn("Original openInvitation execution error:", err);
    }
    // Universal cover removal for all themes (Candani, Aurelia, Badrika, etc.)
    const covers = document.querySelectorAll('#coverScreen, #coverOverlay, .cover-screen, .cover-overlay, .envelope-overlay, .cover-container');
    covers.forEach(function(c) {
      c.classList.add('opened', 'slide-up-hidden', 'hidden');
      c.style.transition = 'opacity 0.5s ease, transform 0.6s ease';
      c.style.opacity = '0';
      c.style.pointerEvents = 'none';
      setTimeout(function() { c.style.display = 'none'; }, 600);
    });
    const dock = document.querySelector('.bottom-dock');
    if (dock) dock.classList.remove('dock-hidden');
    const musicFab = document.querySelector('.music-fab');
    if (musicFab) musicFab.classList.remove('fab-hidden');

    // Trigger reveal animations
    document.querySelectorAll('.lux-reveal, .lux-reveal-top').forEach(function(el) {
      el.classList.add('revealed');
    });

    // Notify parent dashboard so sibling iframe also opens
    if (!isRemote && window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'LUX_INVITATION_OPENED',
        senderRole: viewRole
      }, '*');
    }
  }

  function setupOpenInvitationSync() {
    function hook() {
      if (typeof window.openInvitation === 'function' && window.openInvitation !== executeUniversalOpenInvitation && !window.__luxOriginalOpenInvitation) {
        window.__luxOriginalOpenInvitation = window.openInvitation;
        window.openInvitation = function(isRemote) {
          executeUniversalOpenInvitation(isRemote);
        };
      }
      document.querySelectorAll('.btn-buka, .btn-buka-undangan, .btn-open-issue, .cover-btn-open, .envelope-text-btn, [onclick*="openInvitation"], #coverOpenBtn').forEach(function(btn) {
        if (!btn.__luxBoundOpen) {
          btn.__luxBoundOpen = true;
          btn.addEventListener('click', function() {
            executeUniversalOpenInvitation(false);
          });
        }
      });
    }
    hook();
    window.addEventListener('load', hook);
    setTimeout(hook, 300);
    setTimeout(hook, 1000);
  }

  // ==========================================
  // TWO-WAY DUAL-VIEW SCROLL SYNCHRONIZATION
  // ==========================================
  let isProgrammaticScroll = false;
  let programmaticScrollTimer = null;
  let lastReportedRatio = -1;
  let scrollTicking = false;

  function findScrollContainer() {
    const candidate = document.querySelector('#rightPanel, .right-panel, .main-scroll-panel, .scroll-container');
    if (candidate && candidate.scrollHeight > candidate.clientHeight + 60) {
      return candidate;
    }
    return window;
  }

  function getScrollMetrics() {
    const container = findScrollContainer();
    if (container === window) {
      const doc = document.documentElement || document.body;
      const current = window.scrollY || doc.scrollTop || 0;
      const max = Math.max(1, (doc.scrollHeight || document.body.scrollHeight) - window.innerHeight);
      return {
        container: window,
        current: current,
        max: max,
        ratio: Math.max(0, Math.min(1, current / max))
      };
    } else {
      const current = container.scrollTop;
      const max = Math.max(1, container.scrollHeight - container.clientHeight);
      return {
        container: container,
        current: current,
        max: max,
        ratio: Math.max(0, Math.min(1, current / max))
      };
    }
  }

  function applyScrollRatio(ratio) {
    if (typeof ratio !== 'number' || isNaN(ratio)) return;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const metrics = getScrollMetrics();
    const targetScroll = Math.round(clampedRatio * metrics.max);

    isProgrammaticScroll = true;
    if (metrics.container === window) {
      window.scrollTo({ top: targetScroll, behavior: 'auto' });
    } else {
      metrics.container.scrollTop = targetScroll;
    }

    if (programmaticScrollTimer) clearTimeout(programmaticScrollTimer);
    programmaticScrollTimer = setTimeout(function() {
      isProgrammaticScroll = false;
    }, 150);
  }

  function onLocalScroll() {
    if (isProgrammaticScroll) return;
    if (!scrollTicking) {
      window.requestAnimationFrame(function() {
        scrollTicking = false;
        if (isProgrammaticScroll) return;
        const metrics = getScrollMetrics();
        const ratio = metrics.ratio;
        if (Math.abs(ratio - lastReportedRatio) < 0.002) return;
        lastReportedRatio = ratio;

        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'LUX_SCROLL_SYNC',
            senderRole: viewRole,
            ratio: ratio
          }, '*');
        }
      });
      scrollTicking = true;
    }
  }

  function setupScrollSync() {
    window.addEventListener('scroll', onLocalScroll, { passive: true });
    document.addEventListener('scroll', onLocalScroll, { passive: true });
    const splitContainer = document.querySelector('#rightPanel, .right-panel, .main-scroll-panel, .scroll-container');
    if (splitContainer) {
      splitContainer.addEventListener('scroll', onLocalScroll, { passive: true });
    }
  }

  function createEditorDock() {
    // Sembunyikan dock mengambang jika berada di dalam iframe dasbor agar kanvas undangan 100% bersih
    if (window !== window.top) return;
    if (document.getElementById('luxLiveEditorDock')) return;
    const dock = document.createElement('div');
    dock.id = 'luxLiveEditorDock';
    dock.className = 'lux-live-editor-dock';
    dock.innerHTML = \`
      <div class="lux-dock-status">
        <span class="lux-dock-dot"></span>
        <span>Live Editor</span>
      </div>
      <span style="opacity: 0.35;">|</span>
      <span id="luxChangeCounter" style="font-size: 11px; opacity: 0.85;">Klik teks mana saja untuk mengedit</span>
      <button id="luxSaveBtn" class="lux-dock-btn lux-dock-btn-save" style="display:none;" onclick="window.luxSaveInlineChanges()">Simpan</button>
      <span style="opacity: 0.35; margin: 0 8px;">|</span>
      <button onclick="if(typeof window.openInvitation === 'function') { window.openInvitation(); } else if(window.__luxOriginalOpenInvitation) { window.__luxOriginalOpenInvitation(); }" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 10px; border-radius:20px; font-size:10px; cursor:pointer;">Buka Amplop</button>
    \`;
    document.body.appendChild(dock);
  }

  function initEditableFields() {
    setupOpenInvitationSync();
    setupScrollSync();
    createEditorDock();

    // Map common text tags if data-lux-field not explicitly set
    const fallbackMappings = [
      { sel: '#section-quote p.font-royal-quote, #section-quote p:not(.sec-eyebrow)', field: 'openingQuote' },
      { sel: '#section-quote span:last-of-type', field: 'openingQuoteRef' },
      { sel: '#section-quote .opening-greeting, #section-quote span[style*="font-size: 2rem"], .opening-greeting, .opening-bismillah', field: 'customLabels.openingGreeting' },
      { sel: '#section-quote .sec-eyebrow, #section-quote .quote-eyebrow, .opening-sub-title', field: 'customLabels.quoteEyebrow' },
      { sel: '#section-quote .sec-heading, #home .sec-heading', field: 'customLabels.quoteTitle' },
      { sel: '.cover-badge, .cover-top p, .envelope-badge, .cover-tagline', field: 'customLabels.coverBadge' },
      { sel: '#section-couple .sec-heading, #couple .sec-main-title', field: 'customLabels.coupleTitle' },
      { sel: '#section-couple .sec-subheading, #couple .sec-sub', field: 'customLabels.coupleSub' },
      { sel: '#section-events .sec-heading, #events .sec-main-title', field: 'customLabels.eventsTitle' },
      { sel: '#section-events .sec-subheading, #events .sec-sub', field: 'customLabels.eventsSub' },
      { sel: '#moments .sec-main-title', field: 'customLabels.galleryTitle' },
      { sel: '#story .journey-title, #story .sec-main-title', field: 'customLabels.storyTitle' },
      { sel: '#gift .sec-main-title', field: 'customLabels.giftTitle' },
      { sel: '#section-wishes .sec-heading, #rsvp .sec-main-title', field: 'customLabels.wishesTitle' },
      { sel: '#section-wishes .sec-subheading, #rsvp .sec-sub', field: 'customLabels.wishesSub' },
      { sel: '#section-wishes .sec-main-title, #section-rsvp .sec-main-title', field: 'customLabels.rsvpTitle' },
      { sel: '.groom-name, .groom-title, #groomName', field: 'groomName' },
      { sel: '.bride-name, .bride-title, #brideName', field: 'brideName' },
      { sel: '.wedding-tagline, .hero-tagline', field: 'weddingTagline' }
    ];

    fallbackMappings.forEach(m => {
      document.querySelectorAll(m.sel).forEach(el => {
        if (!el.hasAttribute('data-lux-field')) {
          el.setAttribute('data-lux-field', m.field);
        }
      });
    });

    // Disable native form submission and validation popups in edit mode
    document.querySelectorAll('form').forEach(form => {
      form.noValidate = true;
      form.addEventListener('submit', function(e) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      });
    });

    document.querySelectorAll('[data-lux-field]').forEach(el => {
      const isOpenBtn = el.classList.contains('btn-buka') ||
                        el.classList.contains('btn-buka-undangan') ||
                        el.classList.contains('btn-open-issue') ||
                        el.classList.contains('cover-btn-open') ||
                        el.classList.contains('envelope-text-btn') ||
                        el.closest('.btn-buka, .btn-buka-undangan, .btn-open-issue, .cover-btn-open, .envelope-text-btn, [onclick*="openInvitation"]');

      // Do not hijack the open invitation button; allow it to open the invitation on click
      if (isOpenBtn) {
        return;
      }
      // Nilai turunan tanpa tempat simpan (tanggal terformat, nama orang tua gabungan) tidak dibuat dapat disunting.
      if (!LIVE_EDIT_FIELD_RE.test(el.getAttribute('data-lux-field') || '')) {
        return;
      }

      el.setAttribute('contenteditable', 'true');
      el.setAttribute('spellcheck', 'false');

      // Neutralize button and link behaviors so clicks and keypresses are treated as text editing
      const btn = el.tagName === 'BUTTON' ? el : el.closest('button');
      if (btn) {
        btn.setAttribute('type', 'button');
      }

      if (el.tagName === 'BUTTON' || el.tagName === 'A' || btn) {
        el.addEventListener('click', function(e) {
          e.preventDefault();
          e.stopPropagation();
          el.focus();
        });

        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            el.blur();
          } else if (e.key === ' ') {
            e.stopPropagation();
            const sel = window.getSelection();
            if (sel && sel.rangeCount > 0) {
              const range = sel.getRangeAt(0);
              range.deleteContents();
              const textNode = document.createTextNode(' ');
              range.insertNode(textNode);
              range.setStartAfter(textNode);
              range.setEndAfter(textNode);
              sel.removeAllRanges();
              sel.addRange(range);
              e.preventDefault();
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
          }
        });
      }

      el.addEventListener('input', function() {
        const fieldKey = el.getAttribute('data-lux-field');
        const newVal = el.innerText.trim();
        pendingChanges[fieldKey] = newVal;

        const saveBtn = document.getElementById('luxSaveBtn');
        const counter = document.getElementById('luxChangeCounter');
        if (saveBtn) saveBtn.style.display = 'inline-block';
        const changeCount = Object.keys(pendingChanges).length;
        if (counter) counter.innerText = changeCount + ' teks diubah (belum tersimpan)';

        // Post message to parent dashboard
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'LUX_INLINE_EDIT_CHANGE',
            senderRole: viewRole,
            field: fieldKey,
            value: newVal,
            allChanges: pendingChanges
          }, '*');
        }
      });
    });
  }

  window.luxSaveInlineChanges = async function() {
    const saveBtn = document.getElementById('luxSaveBtn');
    const counter = document.getElementById('luxChangeCounter');
    if (saveBtn) {
      saveBtn.disabled = true;
      saveBtn.innerText = 'Menyimpan...';
    }

    try {
      if (!window.parent || window.parent === window) throw new Error('Simpan hanya tersedia dari Studio.');
      // Hasil simpan dikirim balik oleh Studio setelah PUT selesai; tanpa jawaban dalam 20 detik dianggap gagal.
      const result = await new Promise(function(resolve) {
        const timer = setTimeout(function() { window.removeEventListener('message', onResult); resolve({ ok: false, error: 'Tidak ada jawaban dari Studio.' }); }, 20000);
        function onResult(e) {
          if (e.origin !== window.location.origin || !e.data || e.data.type !== 'LUX_INLINE_SAVE_RESULT') return;
          clearTimeout(timer);
          window.removeEventListener('message', onResult);
          resolve(e.data);
        }
        window.addEventListener('message', onResult);
        window.parent.postMessage({ type: 'LUX_INLINE_SAVE_REQUEST', changes: pendingChanges }, window.location.origin);
      });
      if (!result.ok) throw new Error(result.error || 'Gagal menyimpan.');

      try {
        const bc = new BroadcastChannel('lux_preview_sync');
        bc.postMessage({ type: 'LUX_INLINE_SAVED', changes: pendingChanges });
      } catch(e){}

      if (counter) counter.innerText = 'Semua perubahan tersimpan';
      if (saveBtn) saveBtn.style.display = 'none';
      Object.keys(pendingChanges).forEach(k => delete pendingChanges[k]);
    } catch(err) {
      if (counter) counter.innerText = (err && err.message ? err.message + ' ' : '') + 'Coba lagi.';
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Simpan';
      }
    }
  };

  var luxBgPhotoToneFilter = ${bgPhotoToneFilter.toString()};
  function luxSetBgPhotoTone(tone) {
    var filter = luxBgPhotoToneFilter(tone);
    var style = document.getElementById('${BG_PHOTO_TONE_STYLE_ID}');
    if (!filter) { if (style) style.remove(); return; }
    if (!style) { style = document.createElement('style'); style.id = '${BG_PHOTO_TONE_STYLE_ID}'; document.head.appendChild(style); }
    style.textContent = '${BG_PHOTO_TONE_SELECTOR} { filter: ' + filter + ' !important; }';
  }
  var luxRescaleScrim = ${rescaleScrimLayers.toString()};
  ${BG_SCRIM_APPLY_JS}

  // Remote Dual-View Synchronization Listener
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'LUX_REMOTE_OPEN_INVITATION') {
      executeUniversalOpenInvitation(true);
    } else if (e.data.type === 'LUX_PAUSE_AUDIO') {
      try {
        var audios = document.querySelectorAll('audio, video');
        audios.forEach(function(a) { a.pause(); });
        var musicFabs = document.querySelectorAll('.audio-fab, .music-fab, .btn-music, .btn-audio-fab, #music-control, #musicFab');
        musicFabs.forEach(function(fab) {
          fab.classList.remove('playing', 'spin', 'rotate');
        });
      } catch(err) {}
    } else if (e.data.type === 'LUX_SCROLL_SYNC') {
      if (typeof e.data.ratio === 'number') {
        applyScrollRatio(e.data.ratio);
      }
    } else if (e.data.type === 'LUX_REMOTE_EDIT_CHANGE') {
      const fieldKey = e.data.field;
      const val = e.data.value;
      if (!fieldKey) return;
      // Kecerahan foto latar disimpan lewat Studio, bukan lewat simpan sunting langsung di pratinjau.
      if (fieldKey === 'bgPhotoTone') { luxSetBgPhotoTone(val); return; }
      if (fieldKey === 'bgScrim') { luxApplyBgScrim(val); return; }
      pendingChanges[fieldKey] = val;
      const matching = document.querySelectorAll('[data-lux-field="' + fieldKey + '"]');
      matching.forEach(function(el) {
        if (document.activeElement !== el) {
          const svg = el.querySelector('svg');
          if (svg) {
            let textFound = false;
            for (let i = 0; i < el.childNodes.length; i++) {
              if (el.childNodes[i].nodeType === Node.TEXT_NODE) {
                el.childNodes[i].nodeValue = ' ' + val;
                textFound = true;
                break;
              }
            }
            if (!textFound) {
              el.appendChild(document.createTextNode(' ' + val));
            }
          } else {
            el.innerText = val;
          }
        }
      });
      const counter = document.getElementById('luxChangeCounter');
      const saveBtn = document.getElementById('luxSaveBtn');
      const changeCount = Object.keys(pendingChanges).length;
      if (counter && changeCount > 0) counter.innerText = changeCount + ' teks diubah (belum tersimpan)';
      if (saveBtn && changeCount > 0) saveBtn.style.display = 'inline-block';
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditableFields);
  } else {
    initEditableFields();
  }
})();
</script>
`;
