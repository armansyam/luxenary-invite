import fs from "fs";
import path from "path";

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
  "premium-kila": { file: "kalandra.html", folder: "premium" },
  "ivanna": { file: "valente.html", folder: "premium" },
  "premium-ivanna": { file: "valente.html", folder: "premium" },
  "danila": { file: "aurelia.html", folder: "premium" },
  "premium-danila": { file: "aurelia.html", folder: "premium" },
  "moody-papercut": { file: "papercut.html", folder: "modern" },
  "aruna": { file: "prameswari.html", folder: "traditional" },
  "heritage-aruna": { file: "prameswari.html", folder: "traditional" },
};

const AUTOPLAY_SHOWCASE_SCRIPT = `
<style id="luxCardCleanStyles">
  /* Card Preview Mode: Completely hide all floating UI buttons and dock navigation */
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

  // 1. Completely destroy audio and floating control nodes in card preview
  function cleanCardDOM() {
    const selectors = [
      'audio', '#bgAudio', '.music-fab', '#musicFab', '.floating-music',
      '.fullscreen-btn', '#fullscreenBtn', '.btn-fullscreen', '.btn-fs',
      '.bottom-dock', 'nav.bottom-dock', '.dock-container', 'nav.bottom-nav'
    ];
    selectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        if (el.tagName === 'AUDIO') {
          try { el.pause(); el.src = ''; el.removeAttribute('src'); } catch(e){}
        }
        try { el.remove(); } catch(e){ el.style.display = 'none'; }
      });
    });
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
    if (typeof openInvitation === 'function') {
      try { openInvitation(); } catch(e){}
    }
    const cover = document.getElementById('coverScreen') || document.querySelector('.cover-screen') || document.querySelector('.screen-cover') || document.querySelector('.landing-cover');
    if (cover) {
      cover.classList.add('opened');
      cover.style.transform = 'translateY(-100%)';
      cover.style.transition = 'transform 0.85s cubic-bezier(0.16, 1, 0.3, 1)';
    }
    const coverBtn = document.querySelector('.btn-open-invitation') || document.querySelector('.btn-open') || document.querySelector('#btnOpen') || document.querySelector('.open-btn');
    if (coverBtn) {
      try { coverBtn.click(); } catch(e){}
    }
  }

  function triggerCloseCover() {
    const cover = document.getElementById('coverScreen') || document.querySelector('.cover-screen') || document.querySelector('.screen-cover') || document.querySelector('.landing-cover');
    if (cover) {
      cover.classList.remove('opened');
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

/**
 * Render a template file by replacing {{key}} placeholders with values from `data`.
 * Automatically resolves from themes/premium/, themes/traditional/, or themes/modern/.
 */
export function renderTemplateFile(templateName: string, data: Record<string, any>): string {
  const info = THEME_MAP[templateName] || { file: `${templateName}.html`, folder: "premium" };

  let tplPath = path.join(process.cwd(), "themes", info.folder, info.file);

  // Fallback checks across folders
  if (!fs.existsSync(tplPath)) {
    const premiumCheck = path.join(process.cwd(), "themes", "premium", `${templateName}.html`);
    const traditionalCheck = path.join(process.cwd(), "themes", "traditional", `${templateName}.html`);
    const modernLegacyCheck = path.join(process.cwd(), "themes", "modern", `${templateName}.html`);
    if (fs.existsSync(premiumCheck)) {
      tplPath = premiumCheck;
    } else if (fs.existsSync(traditionalCheck)) {
      tplPath = traditionalCheck;
    } else if (fs.existsSync(modernLegacyCheck)) {
      tplPath = modernLegacyCheck;
    } else {
      // Default fallback
      tplPath = path.join(process.cwd(), "themes", "premium", "kalandra.html");
    }
  }

  let tpl = fs.readFileSync(tplPath, "utf-8");

  // Inject Autoplay script right before </body> if present
  if (tpl.includes("</body>")) {
    tpl = tpl.replace("</body>", `${AUTOPLAY_SHOWCASE_SCRIPT}\n</body>`);
  } else {
    tpl += AUTOPLAY_SHOWCASE_SCRIPT;
  }

  return tpl.replace(/\{\{(\w+)\}\}/g, (_, key: string) => {
    const val = data[key];
    return val !== undefined && val !== null ? String(val) : "";
  });
}
