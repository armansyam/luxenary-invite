import { SANITIZE_GUEST_LABEL_JS } from "@/lib/checkinQr";

export const UNIFIED_CLIENT_RUNTIME_SCRIPT = `
<script id="luxUnifiedClientRuntime">

(function() {
  // 1. Dynamic Guest Name Resolver via ?to= / ?u= / ?v=
  // QR check-in berisi LUX|<id undangan>|<nama tamu>; awalan (id undangan dan inisial) dibuat server di qrCheckinBaseUrl.
  var CHECKIN_QR_BASE = '{{qrCheckinBaseUrl}}';
  var sanitizeGuestLabel = ${SANITIZE_GUEST_LABEL_JS};
  function updateCheckinQr(guestName) {
    if (!CHECKIN_QR_BASE) return;
    var label = sanitizeGuestLabel(guestName) || 'Tamu Undangan';
    document.querySelectorAll('#passQrImg, #modalQrImg, .pass-qr-img').forEach(function(img) {
      img.src = CHECKIN_QR_BASE + encodeURIComponent(label);
    });
  }

  function resolveGuestName() {
    try {
      const p = new URLSearchParams(window.location.search);
      const gn = p.get('to') || p.get('v') || p.get('u') || '';
      updateCheckinQr(gn);
      if (!gn) return;

      const selectors = [
        '#coverGuestName', '#guestName', '#guestNameDisplay', '.cover-guest-val',
        '#modalGuestName', '#passGuestName', '.guest-recipient-name', '#recipientName',
        // Sampul tema khitan/aqiqah/wisuda/gathering (.guest-name) dan ulang tahun (.guest-name-val, .guest-name-text)
        '.guest-name', '.guest-name-val', '.guest-name-text'
      ];
      selectors.forEach(function(sel) {
        document.querySelectorAll(sel).forEach(function(el) {
          el.textContent = gn;
        });
      });

      ['rsvpName', 'universalRsvpName'].forEach(function(id) {
        const rsvpInput = document.getElementById(id);
        if (rsvpInput && !rsvpInput.value) {
          rsvpInput.value = gn;
        }
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
        var isEn = (document.documentElement.lang || '').toLowerCase() === 'en';
        window.showToast(isEn ? 'Thank you, your RSVP & wishes have been received!' : 'Konfirmasi kehadiran & doa restu berhasil dikirim!');
        if (message) {
          var wishesList = document.getElementById('wishesList');
          if (wishesList) {
            var newWishItem = document.createElement('div');
            newWishItem.className = 'wish-item';
            var esc = function(s) { var d = document.createElement('div'); d.textContent = s; return d.innerHTML; };
            var statusLbl = status === 'hadir' ? (isEn ? 'Attending' : 'Hadir') : (isEn ? 'Unable to Attend' : 'Berhalangan');
            newWishItem.innerHTML = '<div class="wish-name">' + esc(name) + ' <span style="font-size:0.68rem;opacity:0.7;font-weight:normal;">• ' + statusLbl + '</span></div><div class="wish-msg">“' + esc(message) + '”</div>';
            wishesList.insertBefore(newWishItem, wishesList.firstChild);
          }
        }
        if (msgEl) msgEl.value = '';
      } else {
        var isEnErr = (document.documentElement.lang || '').toLowerCase() === 'en';
        window.showToast(data.error || (isEnErr ? 'Failed to submit RSVP' : 'Gagal mengirim RSVP'), 'error');
      }
    } catch (err) {
      var isEnNet = (document.documentElement.lang || '').toLowerCase() === 'en';
      window.showToast(isEnNet ? 'Network error. Please try again.' : 'Terjadi kendala koneksi.', 'error');
    } finally {
      var isEnBtn = (document.documentElement.lang || '').toLowerCase() === 'en';
      if (btn) { btn.disabled = false; btn.textContent = isEnBtn ? 'Send RSVP & Wishes' : 'Kirim Konfirmasi & Doa'; }
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
    if (typeof window.__luxEvaluateHomeDock === 'function') {
      window.__luxEvaluateHomeDock();
    }
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
      if (typeof window.__luxEvaluateHomeDock === 'function') {
        window.__luxEvaluateHomeDock();
      }
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

  // 9b. Dock bawah yang meluber: tombol Ticket disisipkan engine ke semua tema, sehingga dock yang pas di master bisa
  // melewati tepi layar 320-375px (dan panel desktop 460px pada aeterna/verona). Kelas dipasang bertahap hanya bila
  // memang meluber; dock yang muat tidak berubah.
  function fitBottomDock() {
    var docks = document.querySelectorAll('.bottom-dock');
    Array.prototype.forEach.call(docks, function(dock) {
      // Dock tersembunyi (lebar 0) tidak dapat diukur: kelas tahap sebelumnya dibiarkan, diukur ulang saat tampil.
      if (!dock.getBoundingClientRect().width || dock.querySelector('.lux-drawer-toggle')) return;
      // Transisi tema (mis. transition: all pada tombol dock) dimatikan selama pengukuran. Tanpa ini melepas dan memasang
      // kelas tahap memulai animasi ukuran tombol, ResizeObserver memanggil fungsi ini lagi tiap frame, dan dock berkedip
      // tanpa henti sambil terukur di tengah animasi. Layout dipaksa sebelum kelas dilepas agar tidak ada animasi yang mulai.
      dock.classList.add('lux-dock-measuring');
      fitDockStage(dock);
      void dock.offsetWidth;
      dock.classList.remove('lux-dock-measuring');
    });
  }
  function fitDockStage(dock) {
      dock.classList.remove('lux-dock-compact', 'lux-dock-tight', 'lux-dock-icons');
      var dr = dock.getBoundingClientRect();
      // Dock diletakkan di tengah area tampilnya (layar penuh di HP, panel kanan 460px di desktop): ruang yang tersedia
      // dua kali jarak titik tengah dock ke tepi layar terdekat.
      var cx = (dr.left + dr.right) / 2;
      var avail = Math.floor(Math.min(window.innerWidth, 2 * Math.min(cx, window.innerWidth - cx)));
      var items = Array.prototype.filter.call(dock.children, function(c) { return c.getBoundingClientRect().width > 0; });
      function overflows() {
        var r = dock.getBoundingClientRect();
        if (dock.scrollWidth > dock.clientWidth + 1 || r.width > avail - 15 || r.left < 0 || r.right > window.innerWidth) return true;
        return items.some(function(c) { var cr = c.getBoundingClientRect(); return cr.right > r.right + 1 || cr.left < r.left - 1; });
      }
      function labelsClipped() {
        return items.some(function(c) { return c.scrollWidth > c.clientWidth + 1; });
      }
      if (!overflows()) return;
      dock.style.setProperty('--lux-dock-avail', avail + 'px');
      dock.classList.add('lux-dock-compact');
      if (!labelsClipped()) return;
      dock.classList.add('lux-dock-tight');
      if (!labelsClipped()) return;
      dock.classList.add('lux-dock-icons');
  }
  window.addEventListener('resize', fitBottomDock, { passive: true });
  // Lebar label berubah setelah web font tema selesai dimuat.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitBottomDock);

  // 9c. Video slot media hanya berputar saat terlihat: tanpa ini video sampul terus berputar di balik undangan yang
  // sudah dibuka, dan latar Home/penutup ikut didekode sejak awal (4 video sekaligus di HP).
  function initSlotVideoVisibility() {
    var vids = document.querySelectorAll('video.lux-cover-video, video.lux-cover-desktop-video, video.lux-sidebar-video, video.lux-fixed-bg-video, video.lux-home-video, video.lux-closing-video');
    if (!vids.length || !window.IntersectionObserver) return;
    // Sampul yang dibuka digeser tepat ke atas layar (bottom = 0) dan visibility: hidden; keduanya tidak terlihat oleh
    // IntersectionObserver, jadi posisi dan visibility diperiksa langsung, juga setiap kali transisi selesai.
    function shouldPlay(v) {
      var r = v.getBoundingClientRect();
      if (!r.width || !r.height) return false;
      if (r.bottom <= 0 || r.top >= window.innerHeight || r.right <= 0 || r.left >= window.innerWidth) return false;
      return window.getComputedStyle(v).visibility !== 'hidden';
    }
    function syncVideo(v) {
      if (shouldPlay(v)) {
        var p = v.play();
        if (p && p.catch) p.catch(function() {});
      } else if (!v.paused) {
        v.pause();
      }
    }
    var io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) { syncVideo(entry.target); });
    });
    Array.prototype.forEach.call(vids, function(v) {
      if (v.__luxVisObserved) return;
      v.__luxVisObserved = true;
      io.observe(v);
    });
    document.addEventListener('transitionend', function() {
      Array.prototype.forEach.call(vids, syncVideo);
    }, true);
  }
  // Sebagian tema mengubah ukuran dock sendiri setelah dimuat (label muncul belakangan, dock tampil setelah sampul
  // dibuka), tanpa resize jendela: dock dan tombolnya diamati, pengukuran ulang dijadwalkan sekali per frame.
  if (window.ResizeObserver) {
    var dockFitScheduled = false;
    var dockResizeObserver = new ResizeObserver(function() {
      if (dockFitScheduled) return;
      dockFitScheduled = true;
      window.requestAnimationFrame(function() { dockFitScheduled = false; fitBottomDock(); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('.bottom-dock'), function(dock) {
      dockResizeObserver.observe(dock);
      Array.prototype.forEach.call(dock.children, function(c) { dockResizeObserver.observe(c); });
    });
  }

  // 10. Universal Theme Preloader Dismissal Driver (Graceful Minimum Time & Zero Visual Leak)
  function initPreloaderGuard() {
    var preloader = document.getElementById('themePreloader');
    if (!preloader) return;
    if (preloader.__guardInitialized) return;
    preloader.__guardInitialized = true;

    var startTime = Date.now();
    var MIN_DISPLAY_MS = 1200; // 1.2s minimum duration for luxury brand entrance
    var MAX_SAFETY_MS = 2500;  // 2.5s absolute safety cap for slow network

    var dismissed = false;
    function dismiss() {
      if (dismissed) return;
      dismissed = true;
      preloader.classList.add('preloader-hidden');
      setTimeout(function() {
        try { preloader.remove(); } catch(e) { preloader.style.display = 'none'; }
      }, 650);
    }

    function scheduleDismiss() {
      var elapsed = Date.now() - startTime;
      var remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);
      setTimeout(dismiss, remaining);
    }

    // Try detecting cover image to wait for full decode
    var coverEl = document.getElementById('coverScreen') || document.querySelector('.cover-screen, #coverOverlay, .screen-cover');
    var coverUrl = '';
    if (coverEl) {
      var bg = window.getComputedStyle(coverEl).backgroundImage || '';
      var match = bg.match(/url\\(["']?([^"')]+)["']?\\)/);
      if (match && match[1]) coverUrl = match[1];
    }

    if (coverUrl && !coverUrl.startsWith('data:')) {
      var img = new Image();
      img.src = coverUrl;
      if (img.complete) {
        scheduleDismiss();
      } else {
        img.onload = scheduleDismiss;
        img.onerror = scheduleDismiss;
      }
    } else {
      if (document.readyState === 'complete') {
        scheduleDismiss();
      } else {
        window.addEventListener('load', scheduleDismiss);
      }
    }

    // Safety Timeout: Maximum 2500ms so visitors on slower networks never stall
    setTimeout(dismiss, MAX_SAFETY_MS);
  }
  initPreloaderGuard();

  // 11. Universal Smart Dock Home Zone State Guard
  function initHomeDockGuard() {
    var dock = document.querySelector('.bottom-dock, nav.bottom-dock');
    if (!dock) return;

    function getHomeBoundary() {
      var homeEl = document.querySelector(
        '#home, #section-quote, .slide-opening, .sec-hero-slideshow, .sec-hero-editorial, main > section:first-of-type, .main-scroll-panel > section:first-of-type, section:first-of-type'
      );
      if (homeEl) {
        var rect = homeEl.getBoundingClientRect();
        var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
        var top = scrollY + rect.top;
        var h = homeEl.offsetHeight || window.innerHeight;
        return Math.max(window.innerHeight * 0.65, (top + h) - 80);
      }
      return window.innerHeight * 0.75;
    }

    var isAtHome = true;
    var ticking = false;

    function evaluateHomeZone() {
      var scrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
      var baseThreshold = getHomeBoundary();
      var exitThreshold = baseThreshold;
      var enterThreshold = Math.max(80, baseThreshold - 40);

      if (isAtHome) {
        if (scrollY >= exitThreshold) {
          isAtHome = false;
          document.body.classList.remove('lux-at-home-zone');
        }
      } else {
        if (scrollY < enterThreshold) {
          isAtHome = true;
          document.body.classList.add('lux-at-home-zone');
        }
      }
      ticking = false;
    }

    window.__luxEvaluateHomeDock = evaluateHomeZone;

    evaluateHomeZone();

    window.addEventListener('scroll', function() {
      if (!ticking) {
        window.requestAnimationFrame(evaluateHomeZone);
        ticking = true;
      }
    }, { passive: true });

    window.addEventListener('resize', function() {
      evaluateHomeZone();
    }, { passive: true });

    dock.addEventListener('click', function(e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (!a) return;
      var href = a.getAttribute('href') || '';
      if (href === '#home' || href === '#section-quote' || href === '#section-opening' || href === '#quote') {
        setTimeout(evaluateHomeZone, 60);
      }
    }, { passive: true });
  }

  // Statistik kunjungan: sekali per sesi peramban. Pratinjau Studio/builder/showcase (iframe), mode edit, dan demo
  // tidak dihitung; server juga menolak pemilik undangan dan admin. Penyimpanan peramban bisa ditolak (mode privat):
  // kunjungan itu dilewati saja, undangan tetap tampil normal.
  function recordVisit() {
    try {
      var invId = '{{invitationId}}';
      var p = new URLSearchParams(window.location.search);
      if (!invId || invId.indexOf('{{') === 0 || invId.indexOf('demo') === 0) return;
      if (window !== window.top || p.get('mode') === 'edit' || p.get('autoplay') === '1' || window.__LUX_EDIT_MODE__ === true) return;
      var sessionKey = 'luxVisit:' + invId;
      if (sessionStorage.getItem(sessionKey)) return;
      var vid = localStorage.getItem('luxVisitorId');
      if (!vid || !/^[A-Za-z0-9_-]{16,64}$/.test(vid)) {
        vid = window.crypto && crypto.randomUUID ? crypto.randomUUID() : (Date.now().toString(36) + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2));
        localStorage.setItem('luxVisitorId', vid);
      }
      sessionStorage.setItem(sessionKey, '1');
      fetch('/api/public/visit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invitationId: invId, visitorId: vid, guestName: p.get('to') || p.get('v') || p.get('u') || null }),
        keepalive: true
      }).catch(function() {});
    } catch (e) {}
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      initPreloaderGuard();
      resolveGuestName();
      recordVisit();
      initAudioInteractionFallback();
      syncActiveTogglesUI();
      fitBottomDock();
      initSlotVideoVisibility();
      initHomeDockGuard();
    });
  } else {
    initPreloaderGuard();
    resolveGuestName();
    recordVisit();
    initAudioInteractionFallback();
    syncActiveTogglesUI();
    fitBottomDock();
    initSlotVideoVisibility();
    initHomeDockGuard();
  }
  window.addEventListener('load', function() {
    initPreloaderGuard();
    syncActiveTogglesUI();
    fitBottomDock();
    initHomeDockGuard();
  });

  // Universal PostMessage Dispatcher (Section Smooth Scroll)
  window.addEventListener('message', function(e) {
    if (!e.data || typeof e.data !== 'object') return;
    if (e.data.type === 'LUX_SCROLL_TO_SECTION' && e.data.sectionId) {
      var sid = e.data.sectionId;
      if (sid === 'cover' || sid === 'coverOverlay') {
        var cov = document.getElementById('coverOverlay');
        if (cov) {
          cov.classList.remove('opened');
          cov.style.display = '';
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        var covEl = document.getElementById('coverOverlay');
        if (covEl && !covEl.classList.contains('opened')) {
          covEl.classList.add('opened');
        }
        var sidAlias = sid === 'event' ? 'events' : (sid === 'events' ? 'event' : (sid === 'gallery' ? 'moments' : (sid === 'moments' ? 'gallery' : sid)));
        var target = document.getElementById(sid) ||
                     document.getElementById(sidAlias) ||
                     document.getElementById('section-' + sid) ||
                     document.getElementById('section-' + sidAlias) ||
                     document.querySelector('[data-section="' + sid + '"]') ||
                     document.querySelector('.' + sid + '-section');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }
    }
  });
})();
</script>
`;
