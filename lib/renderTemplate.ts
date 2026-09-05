import fs from "fs";
import path from "path";

/** Sanitasi URL agar hanya mengizinkan karakter aman untuk digunakan di CSS url() */
function sanitizeCssUrl(url: string): string {
  // Hapus karakter berbahaya yang bisa digunakan untuk CSS injection atau data: URI
  // Izinkan http/https URL atau path lokal yang diawali '/'
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return "";
  // Tidak izinkan karakter yang bisa break CSS context
  return trimmed.replace(/[()"'\\]/g, "");
}

/** Deteksi apakah URL merujuk ke file media video */
function isVideoMedia(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url.trim());
}

/** Escape HTML entities untuk mencegah XSS di konteks HTML biasa */
function escapeHtmlAttr(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

const THEME_MAP: Record<string, { file: string; folder: "premium" | "traditional" | "modern" }> = {
  // Premium Series
  "kalandra": { file: "kalandra.html", folder: "premium" },
  "valente": { file: "valente.html", folder: "premium" },
  "aurelia": { file: "aurelia.html", folder: "premium" },
  "artisan": { file: "artisan.html", folder: "premium" },

  // Traditional Series
  "prameswari": { file: "prameswari.html", folder: "traditional" },
  "dillalucky": { file: "dillalucky.html", folder: "traditional" },
  "badrika": { file: "badrika.html", folder: "traditional" },
  "mayang": { file: "mayang.html", folder: "traditional" },
  "candani": { file: "candani.html", folder: "traditional" },

  // Modern Series
  "wave": { file: "wave.html", folder: "modern" },
  "papercut": { file: "papercut.html", folder: "modern" },
  "ameera": { file: "ameera.html", folder: "modern" },
  "chronicle": { file: "chronicle.html", folder: "modern" },
  "lumina": { file: "lumina.html", folder: "modern" },
  "solaria": { file: "solaria.html", folder: "modern" },

  // Backward compatibility alias mapping
  "kila": { file: "kalandra.html", folder: "premium" },
};

const HEAD_AUDIO_BLOCKER_SCRIPT = `
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

const AUTOPLAY_SHOWCASE_SCRIPT = `
<style id="luxCardCleanStyles">
  /* Card Preview Mode: Completely hide all floating UI buttons, dock navigation, and audio player */
  .music-fab, #musicFab, .floating-music, .audio-player,
  .fullscreen-btn, #fullscreenBtn, .btn-fullscreen, .btn-fs, .floating-action,
  .bottom-dock, nav.bottom-dock, .dock-container, nav.bottom-nav, .dock, .bottom-nav,
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
        '.bottom-dock', 'nav.bottom-dock', '.dock-container', 'nav.bottom-nav'
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

const INLINE_LIVE_EDITOR_SCRIPT = `
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
    top: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 999999;
    background: rgba(15, 23, 42, 0.96);
    border: 1px solid rgba(212, 175, 55, 0.4);
    padding: 8px 18px;
    border-radius: 50px;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.8), 0 0 20px rgba(212, 175, 55, 0.2);
    backdrop-filter: blur(16px);
    color: #ffffff;
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 12px;
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

  function createEditorDock() {
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
      <button onclick="if(window.__luxOriginalOpenInvitation) window.__luxOriginalOpenInvitation();" style="background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.2); color:#fff; padding:4px 10px; border-radius:20px; font-size:10px; cursor:pointer;">Buka Amplop</button>
    \`;
    document.body.appendChild(dock);

    // Override openInvitation to prevent accidental opening when clicking text to edit
    if (typeof window.openInvitation === 'function' && !window.__luxOriginalOpenInvitation) {
      window.__luxOriginalOpenInvitation = window.openInvitation;
      window.openInvitation = function() {
        const e = window.event;
        if (e && e.target && (e.target.hasAttribute('contenteditable') || e.target.closest('[contenteditable="true"]'))) {
          console.log("Click intercepted for editing.");
          return;
        }
        window.__luxOriginalOpenInvitation();
      };
    }
  }

  function initEditableFields() {
    createEditorDock();

    // Map common text tags if data-lux-field not explicitly set
    const fallbackMappings = [
      { sel: '#section-quote p.font-royal-quote, #section-quote p:not(.sec-eyebrow)', field: 'openingQuote' },
      { sel: '#section-quote span:last-of-type', field: 'openingQuoteRef' },
      { sel: '#section-quote .sec-heading', field: 'customLabels.quoteTitle' },
      { sel: '#section-couple .sec-heading', field: 'customLabels.coupleTitle' },
      { sel: '#section-events .sec-heading', field: 'customLabels.eventsTitle' },
      { sel: '#moments .sec-main-title', field: 'customLabels.galleryTitle' },
      { sel: '#story .journey-title', field: 'customLabels.storyTitle' },
      { sel: '#gift .sec-main-title', field: 'customLabels.giftTitle' },
      { sel: '#section-wishes .sec-heading', field: 'customLabels.wishesTitle' },
      { sel: '.btn-buka-undangan, .cover-btn-open', field: 'customLabels.openBtn' },
      { sel: '#btnSubmit, .btn-rsvp-submit, .btn-submit-rsvp', field: 'customLabels.rsvpBtnText' },
      { sel: '#section-wishes .sec-main-title, #section-rsvp .sec-main-title', field: 'customLabels.rsvpTitle' }
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
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({
          type: 'LUX_INLINE_SAVE_REQUEST',
          changes: pendingChanges
        }, '*');
      }

      try {
        const bc = new BroadcastChannel('lux_preview_sync');
        bc.postMessage({ type: 'LUX_INLINE_SAVED', changes: pendingChanges });
      } catch(e){}

      if (counter) counter.innerText = '✓ Semua perubahan tersimpan';
      if (saveBtn) saveBtn.style.display = 'none';
      Object.keys(pendingChanges).forEach(k => delete pendingChanges[k]);
    } catch(err) {
      if (counter) counter.innerText = 'Gagal menyimpan. Coba lagi.';
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerText = 'Simpan';
      }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initEditableFields);
  } else {
    initEditableFields();
  }
})();
</script>
`;

const UNIFIED_CLIENT_RUNTIME_SCRIPT = `
<script id="luxUnifiedClientRuntime">

(function() {
  // 1. Dynamic Guest Name Resolver via ?to= / ?u= / ?v=
  function resolveGuestName() {
    try {
      const p = new URLSearchParams(window.location.search);
      const gn = p.get('to') || p.get('v') || p.get('u') || '';
      if (!gn) return;
      
      const selectors = [
        '#coverGuestName', '#guestName', '#guestNameDisplay', '.cover-guest-val',
        '#modalGuestName', '#passGuestName', '.guest-recipient-name', '#recipientName'
      ];
      selectors.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          el.textContent = gn;
        });
      });
      
      const rsvpInput = document.getElementById('rsvpName');
      if (rsvpInput && !rsvpInput.value) {
        rsvpInput.value = gn;
      }

      // Update QR Code image to guest name
      document.querySelectorAll('#passQrImg, #modalQrImg, .pass-qr-img').forEach(function(img) {
        img.src = 'https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=' + encodeURIComponent(gn);
      });
    } catch(e){}
  }

  // 2. Universal Toast Notification
  window.showToast = window.showToast || function(msg, type) {
    var toast = document.getElementById('luxToast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'luxToast';
      toast.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%) translateY(20px);background:rgba(20,20,24,0.95);color:#fff;padding:12px 24px;border-radius:50px;font-size:0.8rem;letter-spacing:0.04em;font-weight:500;z-index:99999;box-shadow:0 10px 35px rgba(0,0,0,0.6);border:1px solid rgba(255,255,255,0.18);backdrop-filter:blur(16px);display:flex;align-items:center;gap:8px;opacity:0;transition:all 0.35s cubic-bezier(0.16,1,0.3,1);pointer-events:none;';
      document.body.appendChild(toast);
    }
    var icon = (type !== 'error')
      ? '<svg width="16" height="16" fill="none" stroke="#34d399" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>'
      : '<svg width="16" height="16" fill="none" stroke="#f87171" stroke-width="2.5" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>';
    toast.innerHTML = icon + '<span>' + msg + '</span>';
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(window._luxToastTimer);
    window._luxToastTimer = setTimeout(function() {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(20px)';
    }, 3500);
  };

  // 3. Universal Copy Clipboard Helper
  window.copyText = window.copyText || function(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() {
        window.showToast('Berhasil disalin ke papan klip!');
      }).catch(function() {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
    function fallbackCopy(t) {
      var el = document.createElement('textarea');
      el.value = t;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      window.showToast('Berhasil disalin ke papan klip!');
    }
  };

  // 4. Universal Modal Open / Close
  window.openModal = window.openModal || function() {
    var modal = document.getElementById('modalBg');
    if (modal) modal.classList.add('open');
  };
  window.closeModal = window.closeModal || function(e) {
    if (!e || e.target === document.getElementById('modalBg') || (e.target && e.target.classList && e.target.classList.contains('modal-close'))) {
      var modal = document.getElementById('modalBg');
      if (modal) modal.classList.remove('open');
    }
  };

  // 5. Universal AJAX RSVP Submission
  window.submitRsvp = window.submitRsvp || async function(e) {
    if (e && e.preventDefault) e.preventDefault();
    var btn = document.getElementById('btnSubmit') || document.getElementById('submitRsvpBtn');
    var nameEl = document.getElementById('rsvpName');
    var statusEl = document.getElementById('rsvpStatus');
    var countEl = document.getElementById('rsvpCount');
    var msgEl = document.getElementById('rsvpMessage');
    var name = nameEl ? nameEl.value.trim() : '';
    var status = statusEl ? statusEl.value : 'hadir';
    var count = countEl ? countEl.value : '1';
    var message = msgEl ? msgEl.value.trim() : '';

    if (!name) { window.showToast('Silakan isi nama Anda', 'error'); return; }
    if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }

    try {
      var invId = typeof INVITATION_ID !== 'undefined' ? INVITATION_ID : '{{invitationId}}';
      var res = await fetch('/api/public/rsvp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invId, guestName: name, status: status, guestCount: count, message: message })
      });
      var data = await res.json();
      if (data.success) {
        window.showToast('Konfirmasi kehadiran & doa restu berhasil dikirim!');
        if (message) {
          var wishesList = document.getElementById('wishesList');
          if (wishesList) {
            var newWishItem = document.createElement('div');
            newWishItem.className = 'wish-item';
            var esc = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
            newWishItem.innerHTML = '<div class="wish-name">' + esc(name) + ' <span style="font-size:0.68rem;opacity:0.7;font-weight:normal;">• ' + (status === 'hadir' ? 'Hadir' : 'Berhalangan') + '</span></div><div class="wish-msg">“' + esc(message) + '”</div>';
            wishesList.insertBefore(newWishItem, wishesList.firstChild);
          }
        }
        if (msgEl) msgEl.value = '';
      } else {
        window.showToast(data.error || 'Gagal mengirim RSVP', 'error');
      }
    } catch (err) {
      window.showToast('Terjadi kendala koneksi.', 'error');
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Kirim Konfirmasi & Doa'; }
    }
  };

  // 6. Universal Audio Engine & Status Controller
  window.playAudio = function() {
    if (window.__DISABLE_AUDIO__) return;
    try {
      var p = new URLSearchParams(window.location.search);
      if (p.get('autoplay') === '1') return;
      if (window !== window.top && p.get('mode') === 'cover') return;

      var audio = document.getElementById('luxAudioPlayer') ||
                  document.getElementById('bgAudio') ||
                  document.getElementById('weddingAudio') ||
                  document.querySelector('audio');
      if (!audio) return;

      var playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.then(function() {
          var fab = document.getElementById('musicFab') ||
                    document.getElementById('musicToggle') ||
                    document.querySelector('.audio-fab, .music-fab, .btn-music, .btn-audio-fab, #music-control');
          if (fab) fab.classList.add('playing');
        }).catch(function(err) {
          console.log('Audio autoplay prevented by browser policy until user gesture:', err);
        });
      }
    } catch(e) {}
  };

  window.luxToggleAudio = window.toggleAudio = function() {
    try {
      var audio = document.getElementById('luxAudioPlayer') ||
                  document.getElementById('bgAudio') ||
                  document.getElementById('weddingAudio') ||
                  document.querySelector('audio');
      if (!audio) return;
      var fab = document.getElementById('musicFab') ||
                document.getElementById('musicToggle') ||
                document.querySelector('.audio-fab, .music-fab, .btn-music, .btn-audio-fab, #music-control');
      if (audio.paused) {
        audio.play().then(function() {
          if (fab) fab.classList.add('playing');
        }).catch(function(err) {
          console.log('Audio toggle play failed:', err);
        });
      } else {
        audio.pause();
        if (fab) fab.classList.remove('playing');
      }
    } catch(e) {}
  };

  // 7. Auto-Sync Open Invitation Cover with Audio Playback
  var origOpenInvitation = window.openInvitation;
  window.openInvitation = function() {
    if (typeof origOpenInvitation === 'function' && origOpenInvitation !== window.openInvitation) {
      try { origOpenInvitation(); } catch(err) { console.warn(err); }
    } else {
      var cover = document.getElementById('coverScreen') || document.querySelector('.screen-cover, .landing-cover, .cover-screen');
      if (cover) cover.classList.add('slide-up-hidden', 'opened', 'hidden');
    }
    window.playAudio();
  };

  // Delegated Capture Listener for Any Open-Invitation Button
  document.addEventListener('click', function(e) {
    var target = e.target;
    if (!target) return;
    var openBtn = target.closest(
      '.btn-buka, .btn-buka-undangan, .cover-btn-open, .btn-open-issue, .cover-btn, [onclick*="openInvitation"], [data-lux-field="customLabels.openBtn"], #btnOpenInvitation'
    );
    if (openBtn) {
      window.playAudio();
    }
  }, { capture: true, passive: true });

  // 8. Interaction Fallback for Autoplay (First tap/click after cover opened)
  function initAudioInteractionFallback() {
    var unlockAudio = function() {
      try {
        var audio = document.getElementById('luxAudioPlayer') ||
                    document.getElementById('bgAudio') ||
                    document.getElementById('weddingAudio') ||
                    document.querySelector('audio');
        if (audio && audio.paused && !window.__DISABLE_AUDIO__) {
          var cover = document.getElementById('coverScreen') || document.querySelector('.screen-cover, .landing-cover, .cover-screen');
          var isCoverClosed = cover && !cover.classList.contains('slide-up-hidden') && !cover.classList.contains('opened') && !cover.classList.contains('hidden') && cover.style.display !== 'none';
          if (!isCoverClosed) {
            window.playAudio();
          }
        }
      } catch(e) {}
      document.removeEventListener('touchstart', unlockAudio);
      document.removeEventListener('click', unlockAudio);
    };
    document.addEventListener('touchstart', unlockAudio, { passive: true });
    document.addEventListener('click', unlockAudio, { passive: true });
  }

  // 9. Auto-Sync Navigation Dock & Audio FAB Based on Active Toggled Sections
  function syncActiveTogglesUI() {
    try {
      // A. Synchronize navigation links (bottom dock, side nav, etc.)
      var navLinks = document.querySelectorAll(
        '.bottom-dock a, nav.bottom-dock a, .side-nav a, .dock-btn, .dock-a, .side-nav-link'
      );
      navLinks.forEach(function(link) {
        var href = link.getAttribute('href');
        if (href && href.startsWith('#') && href.length > 1) {
          var targetId = href.substring(1);
          var targetEl = document.getElementById(targetId);
          if (!targetEl) {
            link.style.display = 'none';
          } else {
            link.style.display = '';
          }
        }
      });

      // B. Synchronize Audio Player FAB (hide button if audio is disabled / has no valid source)
      var audio = document.getElementById('luxAudioPlayer') ||
                  document.getElementById('bgAudio') ||
                  document.getElementById('weddingAudio') ||
                  document.querySelector('audio');
      var hasAudioSource = Boolean(
        audio && (audio.getAttribute('src') || (audio.querySelector('source') && audio.querySelector('source').getAttribute('src')))
      );
      var fabs = document.querySelectorAll(
        '#musicFab, #musicToggle, .audio-fab, .music-fab, .btn-music, .btn-audio-fab, #music-control'
      );
      fabs.forEach(function(fab) {
        if (!hasAudioSource) {
          fab.style.display = 'none';
        } else {
          fab.style.display = '';
        }
      });
    } catch(err) {
      console.warn('syncActiveTogglesUI error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      resolveGuestName();
      initAudioInteractionFallback();
      syncActiveTogglesUI();
    });
  } else {
    resolveGuestName();
    initAudioInteractionFallback();
    syncActiveTogglesUI();
  }
  window.addEventListener('load', syncActiveTogglesUI);
})();
</script>
`;

/**
 * Render a template file by replacing {{key}} placeholders with values from `data`.
 * Automatically resolves from themes/premium/, themes/traditional/, or themes/modern/.
 */
export async function renderTemplateFile(
  templateName: string,
  data: Record<string, any>,
  options?: { editMode?: boolean; invitationId?: string }
): Promise<string> {
  const info = THEME_MAP[templateName] || { file: `${templateName}.html`, folder: "premium" };

  let tplPath = path.join(process.cwd(), "themes", info.folder, info.file);

  // Helper to check file existence asynchronously
  async function fileExists(p: string): Promise<boolean> {
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  }

  // --- 1. CEK ARSITEKTUR PIRING (DRAFTS) LEBIH DULU ---
  let draftFound = false;
  if (options?.invitationId) {
    const draftsDir = path.join(process.cwd(), "data", "drafts");
    const draftPath = path.join(draftsDir, `${options.invitationId}.html`);

    if (!(await fileExists(draftsDir))) {
      await fs.promises.mkdir(draftsDir, { recursive: true });
    }

    if (await fileExists(draftPath)) {
      // Piring sudah ada, gunakan piring draft
      tplPath = draftPath;
      draftFound = true;
    }
  }

  // --- 2. JIKA TIDAK ADA DRAFT, CEK MASTER FILE ---
  if (!draftFound) {
    if (!(await fileExists(tplPath))) {
      const premiumCheck = path.join(process.cwd(), "themes", "premium", `${templateName}.html`);
      const traditionalCheck = path.join(process.cwd(), "themes", "traditional", `${templateName}.html`);
      const modernLegacyCheck = path.join(process.cwd(), "themes", "modern", `${templateName}.html`);
      
      if (await fileExists(premiumCheck)) {
        tplPath = premiumCheck;
      } else if (await fileExists(traditionalCheck)) {
        tplPath = traditionalCheck;
      } else if (await fileExists(modernLegacyCheck)) {
        tplPath = modernLegacyCheck;
      } else {
        // Tidak menggunakan fallback (Sesuai instruksi: Wajib memilih tema)
        return `
          <div style="padding:40px; text-align:center; font-family:sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fff;">
            <h2 style="color:#d32f2f;">Tema Tidak Tersedia</h2>
            <p>Tema yang Anda pilih tidak tersedia atau telah dihapus oleh sistem.</p>
            <p><b>Silakan kembali ke Dashboard Anda dan pilih tema lain yang aktif untuk melanjutkan pengeditan.</b></p>
          </div>
        `;
      }
    }

    // Karena draft belum ada dan master file tersedia, copy dari master ke draft
    if (options?.invitationId) {
      const draftPath = path.join(process.cwd(), "data", "drafts", `${options.invitationId}.html`);
      try {
        await fs.promises.copyFile(tplPath, draftPath);
        tplPath = draftPath;
      } catch (err) {
        console.error("Failed to copy master theme to draft:", err);
      }
    }
  }

  let tpl = await fs.promises.readFile(tplPath, "utf-8");

  // Fallback placement for Guest Memories if template doesn't explicitly have the placeholder
  if (!tpl.includes("{{memoriesSectionHtml}}") && data.memoriesSectionHtml) {
    if (tpl.includes("{{turutMengundangHtml}}")) {
      tpl = tpl.replace("{{turutMengundangHtml}}", `{{turutMengundangHtml}}\n    {{memoriesSectionHtml}}`);
    } else if (tpl.includes("{{giftSectionHtml}}")) {
      tpl = tpl.replace("{{giftSectionHtml}}", `{{giftSectionHtml}}\n    {{memoriesSectionHtml}}`);
    }
  }

  // Injections: Meta Tags, Head Audio Blocker, Global Modules CSS, Unified Runtime, Autoplay Script & Inline Live Editor Script
  const GLOBAL_MODULES_CSS = `<link rel="stylesheet" href="/css/modules.css">`;
  const metaTags = data.metaTagsHtml ? `${data.metaTagsHtml}\n` : '';
  let closingStyle = '';
  if (data.closingPhotoUrl) {
    const safeUrl = sanitizeCssUrl(String(data.closingPhotoUrl));
    if (safeUrl) {
      closingStyle = `\n<style>
      .site-footer, footer, footer#footer {
        background-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.92) 100%), url('${safeUrl}') !important;
        background-size: cover !important;
        background-position: center bottom !important;
        color: #fff !important;
        border-top: none !important;
        position: relative;
      }
      .site-footer::before, footer::before, footer#footer::before {
        display: none !important;
      }
      .site-footer *, footer *, footer#footer * {
        color: #fff !important;
      }
    </style>`;
    }
  }

  // Video Background Support (Landing Cover, Desktop Sidebar, Global Fixed BG)
  let videoStyles = "";
  let coverVideoHtml = "";
  let sidebarVideoHtml = "";
  let fixedBgVideoHtml = "";

  if (isVideoMedia(data.landingCoverUrl)) {
    const safeCoverVideo = escapeHtmlAttr(String(data.landingCoverUrl));
    coverVideoHtml = `<video class="lux-cover-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeCoverVideo}" type="video/mp4"></video>`;
    videoStyles += `
      .lux-cover-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        z-index: 0;
        pointer-events: none;
      }
      .cover-screen, #coverScreen {
        background-image: none !important;
        overflow: hidden !important;
      }
      .cover-screen::before, #coverScreen::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(7,7,9,0.22) 0%, rgba(7,7,9,0.04) 30%, rgba(7,7,9,0.20) 65%, rgba(7,7,9,0.60) 100%);
        z-index: 1;
        pointer-events: none;
      }
      .cover-screen > *:not(.lux-cover-video), #coverScreen > *:not(.lux-cover-video) {
        position: relative;
        z-index: 2;
      }
      .cover-names, .cover-title {
        text-shadow: 0 4px 20px rgba(0,0,0,0.85) !important;
      }
    `;
  }

  if (isVideoMedia(data.sidebarPhotoUrl)) {
    const safeSidebarVideo = escapeHtmlAttr(String(data.sidebarPhotoUrl));
    sidebarVideoHtml = `<video class="lux-sidebar-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeSidebarVideo}" type="video/mp4"></video>`;
    videoStyles += `
      .lux-sidebar-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        z-index: 1;
        pointer-events: none;
      }
      .left-hero {
        background-image: none !important;
        overflow: hidden !important;
      }
      .left-hero::after {
        z-index: 2 !important;
        background: linear-gradient(to top, rgba(7,7,9,0.65) 0%, rgba(7,7,9,0.10) 45%, transparent 100%) !important;
      }
      .left-hero-content {
        z-index: 3 !important;
      }
    `;
  }

  if (isVideoMedia(data.globalBgUrl)) {
    const safeFixedBgVideo = escapeHtmlAttr(String(data.globalBgUrl));
    fixedBgVideoHtml = `<video class="lux-fixed-bg-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeFixedBgVideo}" type="video/mp4"></video><div class="lux-fixed-bg-scrim"></div>`;
    videoStyles += `
      .lux-fixed-bg-video {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        object-position: center center;
        z-index: 0;
        pointer-events: none;
      }
      .lux-fixed-bg-scrim {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(to bottom, rgba(7,7,9,0.22) 0%, rgba(7,7,9,0.06) 35%, rgba(7,7,9,0.38) 100%);
        z-index: 1;
        pointer-events: none;
      }
      @media (min-width: 900px) {
        .lux-fixed-bg-video {
          left: calc(100% - 460px) !important;
          width: 460px !important;
          right: 0 !important;
        }
        .lux-fixed-bg-scrim {
          left: calc(100% - 460px) !important;
          width: 460px !important;
          right: 0 !important;
        }
      }
      .right-panel, .page-wrap, .main-scroll-panel {
        position: relative;
        z-index: 2;
        padding-bottom: 0 !important;
      }
      .fixed-bg-layer, .theme-fixed-bg {
        background-image: none !important;
      }
    `;
  }

  if (data.hasCustomHomePhoto && data.homePhotoUrl) {
    const safeHomePhoto = sanitizeCssUrl(String(data.homePhotoUrl));
    if (safeHomePhoto) {
      videoStyles += `
      .slide-opening#home, section#home.slide-opening, section#home, .sec-hero-slideshow#home {
        background-image: linear-gradient(to bottom, rgba(7,7,9,0.55) 0%, rgba(7,7,9,0.35) 40%, rgba(7,7,9,0.80) 100%), url('${safeHomePhoto}') !important;
        background-size: cover !important;
        background-position: center center !important;
        background-repeat: no-repeat !important;
      }
      `;
    }
  }

  const combinedVideoStyle = videoStyles ? `\n<style>\n${videoStyles}\n</style>` : "";

  if (coverVideoHtml) {
    tpl = tpl.replace(/(<div[^>]*class="[^"]*\bcover-screen\b[^"]*"[^>]*>)/i, `$1\n    ${coverVideoHtml}`);
  }
  if (sidebarVideoHtml) {
    tpl = tpl.replace(/(<div[^>]*class="[^"]*\bleft-hero\b[^"]*"[^>]*>)/i, `$1\n    ${sidebarVideoHtml}`);
  }
  if (fixedBgVideoHtml) {
    tpl = tpl.replace(/(<body[^>]*>)/i, `$1\n  ${fixedBgVideoHtml}`);
  }

  if (tpl.includes("<head>")) {
    tpl = tpl.replace("<head>", `<head>\n${metaTags}${HEAD_AUDIO_BLOCKER_SCRIPT}\n${GLOBAL_MODULES_CSS}${closingStyle}${combinedVideoStyle}`);
  } else if (tpl.includes("<HEAD>")) {
    tpl = tpl.replace("<HEAD>", `<HEAD>\n${metaTags}${HEAD_AUDIO_BLOCKER_SCRIPT}\n${GLOBAL_MODULES_CSS}${closingStyle}${combinedVideoStyle}`);
  }

  const injectedScripts = `${UNIFIED_CLIENT_RUNTIME_SCRIPT}\n${AUTOPLAY_SHOWCASE_SCRIPT}\n${options?.editMode || data.__editMode ? INLINE_LIVE_EDITOR_SCRIPT : ""}`;

  if (tpl.includes("</body>")) {
    tpl = tpl.replace("</body>", `${injectedScripts}\n</body>`);
  } else {
    tpl += injectedScripts;
  }


  // Server-Side Injection for Custom Labels (Zero-Hardcode Master Themes)
  const customLabels = data.featureSettings?.customLabels || data.customLabels || {};
  tpl = tpl.replace(
    /<([a-zA-Z0-9]+)\b([^>]*data-lux-field="customLabels\.([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tagName, attrs, labelKey, innerContent) => {
      const val = customLabels[labelKey];
      if (val !== undefined && val !== null && val !== "") {
        const svgMatch = innerContent.match(/<svg[\s\S]*?<\/svg>/i);
        const svgPrefix = svgMatch ? `${svgMatch[0]} ` : "";
        return `<${tagName}${attrs}>${svgPrefix}${escapeHtmlAttr(String(val))}</${tagName}>`;
      }
      return match;
    }
  );

  return tpl.replace(/\{[\s\n]*\{[\s\n]*([\w.]+)[\s\n]*\}[\s\n]*\}/g, (_, key: string) => {
    let val = data[key];
    if (val === undefined && key.includes(".")) {
      const parts = key.split(".");
      let curr: any = data;
      for (const p of parts) {
        if (curr && typeof curr === "object") {
          curr = curr[p];
        } else {
          curr = undefined;
          break;
        }
      }
      val = curr;
    }
    return val !== undefined && val !== null ? String(val) : "";
  });
}

