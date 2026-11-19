/**
 * Kecerahan foto latar halaman (slot GLOBAL_FIXED_BG) yang diatur klien di Studio, disimpan sebagai
 * `featureSettings.bgPhotoTone`: negatif menggelapkan, positif menerangkan, batas ±80. Foto latar klien bisa sangat terang
 * atau sangat gelap, sedangkan warna teks tema tetap; yang disesuaikan adalah foto, bukan teks, dan tanpa nilai warna.
 *
 * Selektor mencakup ke-121 master (`.fixed-bg-layer.has-custom-bg`) dan video latar yang disisipkan mesin.
 */
export const BG_PHOTO_TONE_LIMIT = 80;
export const BG_PHOTO_TONE_SELECTOR = ".fixed-bg-layer.has-custom-bg, video.lux-fixed-bg-video";
export const BG_PHOTO_TONE_STYLE_ID = "luxBgPhotoTone";

export function parseBgPhotoTone(value: unknown): number {
  const n = typeof value === "number" ? value : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.max(-BG_PHOTO_TONE_LIMIT, Math.min(BG_PHOTO_TONE_LIMIT, Math.round(n)));
}

// Mandiri (tanpa rujukan ke luar fungsi): sumbernya disisipkan ke skrip pratinjau Studio lewat `toString()`, sehingga
// pratinjau dan HTML terbit memakai rumus yang sama.
export function bgPhotoToneFilter(tone: unknown): string {
  const n = Math.max(-80, Math.min(80, Math.round(Number(tone) || 0)));
  if (n === 0) return "";
  if (n < 0) return "brightness(" + (1 + n / 100).toFixed(2) + ")";
  return "brightness(" + (1 + n * 0.009).toFixed(2) + ") contrast(" + (1 - n * 0.0045).toFixed(2) + ")";
}

export function bgPhotoToneCss(tone: unknown): string {
  const filter = bgPhotoToneFilter(tone);
  return filter ? `${BG_PHOTO_TONE_SELECTOR} { filter: ${filter} !important; }` : "";
}

/**
 * Kepekatan scrim di atas foto latar klien (`featureSettings.bgScrim`, 0–90). Kosong = scrim master apa adanya.
 * Nilai awal disarankan dari kecerahan foto yang diunggah (`suggestBgScrim`) karena satu angka tetap di master tidak
 * cocok untuk semua foto klien; klien menggesernya di Studio. Warna dan bentuk gradasi tetap milik master: hanya alfa
 * setiap titik warna gradasi di atas foto yang diganti (`rescaleScrimLayers`).
 */
export const BG_SCRIM_MAX = 90;
export const BG_SCRIM_SCRIPT_ID = "luxBgScrim";

export function parseBgScrim(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(0, Math.min(BG_SCRIM_MAX, Math.round(n)));
}

/** Kecerahan rata-rata foto (0–1) → kepekatan awal: foto gelap 35%, foto terang hingga 80%. */
export function suggestBgScrim(meanLuminance: number): number {
  const l = Math.max(0, Math.min(1, meanLuminance));
  return Math.round(35 + l * 45);
}

// Mandiri: disisipkan ke undangan lewat `toString()`. Lapisan gradasi di atas foto (sebelum lapisan url pertama) diberi
// alfa `scrim`; lapisan url tidak diubah. Warna color()/rgb()/rgba() hasil getComputedStyle.
export function rescaleScrimLayers(backgroundImage: string, scrim: number): string {
  const a = Math.max(0, Math.min(90, scrim)) / 100;
  const layers: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of backgroundImage) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { layers.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) layers.push(cur.trim());
  let beforePhoto = true;
  return layers.map((layer) => {
    if (/^url\(/.test(layer)) { beforePhoto = false; return layer; }
    if (!beforePhoto || layer.indexOf("gradient") === -1) return layer;
    return layer
      .replace(/color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*[\d.]+%?)?\s*\)/g, (_m, r, g, b) => "color(srgb " + r + " " + g + " " + b + " / " + a + ")")
      .replace(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+[\d.]+%?)?\s*\)/g, (_m, r, g, b) => "rgba(" + r + ", " + g + ", " + b + ", " + a + ")");
  }).join(", ");
}

/** Penerap scrim di peramban (dipakai HTML undangan dan pratinjau langsung Studio). Butuh `luxRescaleScrim` di skop. */
export const BG_SCRIM_APPLY_JS = `function luxApplyBgScrim(scrim) {
  var layer = document.querySelector('.fixed-bg-layer.has-custom-bg');
  if (!layer) return;
  if (layer.dataset.luxScrimBase === undefined) { layer.style.removeProperty('background-image'); layer.dataset.luxScrimBase = getComputedStyle(layer).backgroundImage; }
  if (scrim === null || scrim === undefined || scrim === '') { layer.style.removeProperty('background-image'); return; }
  layer.style.setProperty('background-image', luxRescaleScrim(layer.dataset.luxScrimBase, Number(scrim)), 'important');
}`;

export function bgScrimScript(scrim: number): string {
  return `<script id="${BG_SCRIM_SCRIPT_ID}">(function(){var luxRescaleScrim=${rescaleScrimLayers.toString()};${BG_SCRIM_APPLY_JS}function run(){luxApplyBgScrim(${scrim});}if(document.readyState!=="loading")run();else document.addEventListener("DOMContentLoaded",run);})();</script>`;
}
