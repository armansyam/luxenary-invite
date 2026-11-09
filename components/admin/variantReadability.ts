import { contrastRatio } from "@/lib/themeBuilder/spec";

type Rgba = [number, number, number, number];

/** Warna terhitung peramban: `rgb()`, `rgba()`, atau `color(srgb …)` (hasil `color-mix`). Selain itu dianggap tidak terbaca. */
export function parseCssColor(value: string): Rgba | null {
  const v = value.trim();
  const rgb = v.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], alpha(rgb[4])];
  const srgb = v.match(/^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
  if (srgb) return [+srgb[1] * 255, +srgb[2] * 255, +srgb[3] * 255, alpha(srgb[4])];
  if (v === "transparent") return [0, 0, 0, 0];
  return null;
}

function alpha(raw: string | undefined): number {
  if (raw === undefined) return 1;
  return raw.endsWith("%") ? parseFloat(raw) / 100 : parseFloat(raw);
}

/** Warna `top` (boleh tembus pandang) di atas warna `bottom` yang sudah pekat. */
export function blend(top: Rgba, bottom: Rgba): Rgba {
  const a = top[3];
  return [top[0] * a + bottom[0] * (1 - a), top[1] * a + bottom[1] * (1 - a), top[2] * a + bottom[2] * (1 - a), 1];
}

export function toHex(c: Rgba): string {
  return `#${c.slice(0, 3).map((x) => Math.round(Math.max(0, Math.min(255, x))).toString(16).padStart(2, "0")).join("")}`;
}

/** Rata-rata warna titik-titik gradasi pada `background-image`; null bila tidak ada gradasi (misalnya hanya foto). */
export function gradientAverage(image: string): Rgba | null {
  const stops = [...image.matchAll(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g)].map((m) => parseCssColor(m[0])).filter((c): c is Rgba => c !== null);
  if (!stops.length) return null;
  return [0, 1, 2, 3].map((i) => stops.reduce((a, s) => a + s[i], 0) / stops.length) as Rgba;
}

/**
 * Latar efektif sebuah elemen: lapisan leluhur ditumpuk dari atas sampai pekat. `background-image` berupa gradasi
 * dihitung sebagai rata-rata titik gradasinya (gradasi gelap di atas foto sampul menentukan keterbacaan teks di atasnya);
 * foto tanpa gradasi tidak bisa dihitung sehingga hasilnya null dan teks di atasnya tidak dinilai.
 */
function effectiveBackground(el: Element, win: Window): Rgba | null {
  const layers: Rgba[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    const cs = win.getComputedStyle(node);
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      const gradient = gradientAverage(cs.backgroundImage);
      if (!gradient) return null;
      layers.push(gradient);
      if (gradient[3] >= 0.99) break;
    }
    const bg = parseCssColor(cs.backgroundColor);
    if (bg && bg[3] > 0) {
      layers.push(bg);
      if (bg[3] >= 0.99) break;
    }
  }
  let result: Rgba = [255, 255, 255, 1];
  for (let i = layers.length - 1; i >= 0; i--) result = blend(layers[i], result);
  return result;
}

export interface TextSample {
  key: string;
  text: string;
  ratio: number;
  min: number;
  el: Element;
}

/** Elemen yang memiliki teks langsung dan tampil; tiap elemen dinilai terhadap ambang WCAG AA (3 untuk teks besar). */
export function measureText(doc: Document): TextSample[] {
  const win = doc.defaultView;
  if (!win || !doc.body) return [];
  const out: TextSample[] = [];
  const all = doc.body.querySelectorAll("*");
  all.forEach((el, index) => {
    if (["SCRIPT", "STYLE", "NOSCRIPT", "svg", "SVG", "IMG", "IFRAME"].includes(el.tagName)) return;
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
    if (own.length < 2) return;
    const rect = el.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    const cs = win.getComputedStyle(el);
    if (cs.visibility === "hidden" || cs.display === "none") return;
    for (let node: Element | null = el; node; node = node.parentElement) {
      if (parseFloat(win.getComputedStyle(node).opacity) < 0.05) return;
    }
    const fg = parseCssColor(cs.color);
    const bg = effectiveBackground(el, win);
    if (!fg || !bg || fg[3] < 0.05) return;
    const size = parseFloat(cs.fontSize);
    const bold = parseInt(cs.fontWeight, 10) >= 600;
    const min = size >= 24 || (bold && size >= 18.66) ? 3 : 4.5;
    out.push({ key: `${index}:${el.tagName}`, text: own.slice(0, 60), ratio: contrastRatio(toHex(blend(fg, bg)), toHex(bg)), min, el });
  });
  return out;
}

/** Teks yang terbaca di master asli tetapi tidak lagi memenuhi ambang setelah varian diterapkan. */
export function newlyUnreadable(before: TextSample[], after: TextSample[]): TextSample[] {
  const baseline = new Map(before.map((s) => [s.key, s]));
  return after.filter((s) => {
    const b = baseline.get(s.key);
    return s.ratio < s.min && (!b || b.ratio >= b.min);
  });
}
