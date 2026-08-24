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

  // Modern Series
  "wave": { file: "wave.html", folder: "modern" },
  "papercut": { file: "papercut.html", folder: "modern" },
  "ameera": { file: "ameera.html", folder: "modern" },

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
<script>
(function() {
  const isAutoplay = new URLSearchParams(window.location.search).get('autoplay') === '1';
  if (!isAutoplay) return;

  // Mute audio during card preview
  const audio = document.getElementById('bgAudio');
  if (audio) { audio.muted = true; }

  // Step 1: Wait 1.8s on cover, then trigger openInvitation
  setTimeout(() => {
    if (typeof openInvitation === 'function') {
      openInvitation();
    } else {
      const cover = document.getElementById('coverScreen') || document.querySelector('.cover-screen') || document.querySelector('.screen-cover');
      if (cover) cover.classList.add('opened');
    }

    // Step 2: After cover opens (1.5s transition), start smooth continuous scrolling
    setTimeout(() => {
      startAutoScrollLoop();
    }, 1500);
  }, 1800);

  function startAutoScrollLoop() {
    const scrollContainer = document.getElementById('rightPanel') || window;
    const isWindow = scrollContainer === window;
    
    function getMaxScroll() {
      if (isWindow) {
        return Math.max(document.documentElement.scrollHeight, document.body.scrollHeight) - window.innerHeight;
      } else {
        return scrollContainer.scrollHeight - scrollContainer.clientHeight;
      }
    }

    let direction = 1; // 1 = down, -1 = up
    let speed = 1.1; // pixels per frame

    function step() {
      const maxScroll = getMaxScroll();
      if (maxScroll <= 0) {
        requestAnimationFrame(step);
        return;
      }

      let current = isWindow ? (window.pageYOffset || document.documentElement.scrollTop) : scrollContainer.scrollTop;
      let next = current + (direction * speed);

      if (direction === 1 && next >= maxScroll) {
        // Reached bottom, pause for 2.5s, then scroll back up
        setTimeout(() => {
          direction = -1;
          speed = 3.2; // scroll up faster
          requestAnimationFrame(step);
        }, 2500);
        return;
      } else if (direction === -1 && next <= 0) {
        // Reached top, reset to cover and loop again
        if (isWindow) window.scrollTo(0, 0);
        else scrollContainer.scrollTop = 0;

        const cover = document.getElementById('coverScreen') || document.querySelector('.cover-screen') || document.querySelector('.screen-cover');
        if (cover) cover.classList.remove('opened');

        setTimeout(() => {
          if (typeof openInvitation === 'function') openInvitation();
          else if (cover) cover.classList.add('opened');

          setTimeout(() => {
            direction = 1;
            speed = 1.1;
            requestAnimationFrame(step);
          }, 1500);
        }, 2200);
        return;
      }

      if (isWindow) window.scrollTo(0, next);
      else scrollContainer.scrollTop = next;

      requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
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
