/**
 * Menyuntikkan lapisan tanda air (watermark) pratinjau draf gratis dan bilah status aktivasi
 * sebelum `</body>`. Dipakai seragam oleh seluruh endpoint pratinjau agar tidak bisa dilewati
 * lewat `/{slug}?preview=true` maupun `/s/{subdomain}?preview=true`.
 */
export function injectFreeDraftWatermark(html: string): string {
  if (!html || html.includes("lux-free-draft-watermark-style")) return html;

  const watermarkOverlay = `
<style id="lux-free-draft-watermark-style">
  .lux-fd-wm-grid {
    position: fixed;
    inset: 0;
    z-index: 99990;
    pointer-events: none;
    overflow: hidden;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    grid-template-rows: repeat(4, 1fr);
    place-items: center;
    opacity: 0.16;
  }
  .lux-fd-wm-item {
    transform: rotate(-28deg);
    font-family: system-ui, -apple-system, sans-serif;
    font-size: clamp(14px, 2.2vw, 22px);
    font-weight: 800;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: var(--on-dark, var(--bg-light));
    text-shadow: 0 1px 6px color-mix(in srgb, var(--bg-dark) 75%, transparent);
    white-space: nowrap;
    user-select: none;
  }
  .lux-fd-preview-bar {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99995;
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 7px 14px;
    border-radius: 9999px;
    background: color-mix(in srgb, var(--bg-dark) 88%, transparent);
    border: 1px solid color-mix(in srgb, var(--on-dark, var(--bg-light)) 24%, transparent);
    color: var(--on-dark, var(--bg-light));
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 11px;
    font-weight: 700;
    letter-spacing: 0.06em;
    backdrop-filter: blur(8px);
    box-shadow: 0 8px 24px color-mix(in srgb, var(--bg-dark) 32%, transparent);
    max-width: calc(100vw - 24px);
  }
  .lux-fd-preview-bar a {
    color: var(--accent, var(--primary));
    text-decoration: underline;
    white-space: nowrap;
  }
</style>
<div class="lux-fd-wm-grid" aria-hidden="true">
  <span class="lux-fd-wm-item">DRAF GRATIS</span>
  <span class="lux-fd-wm-item">PRATINJAU</span>
  <span class="lux-fd-wm-item">DRAF GRATIS</span>
  <span class="lux-fd-wm-item">PRATINJAU</span>
  <span class="lux-fd-wm-item">DRAF GRATIS</span>
  <span class="lux-fd-wm-item">PRATINJAU</span>
  <span class="lux-fd-wm-item">DRAF GRATIS</span>
  <span class="lux-fd-wm-item">PRATINJAU</span>
  <span class="lux-fd-wm-item">DRAF GRATIS</span>
  <span class="lux-fd-wm-item">PRATINJAU</span>
  <span class="lux-fd-wm-item">DRAF GRATIS</span>
  <span class="lux-fd-wm-item">PRATINJAU</span>
</div>
<div class="lux-fd-preview-bar" role="status">
  <span>PRATINJAU DRAF GRATIS — BELUM DIPUBLIKASIKAN</span>
  <a href="/packages" target="_top">Aktifkan Paket</a>
</div>`;

  return /<\/body>/i.test(html)
    ? html.replace(/<\/body>/i, `${watermarkOverlay}\n</body>`)
    : `${html}\n${watermarkOverlay}`;
}
