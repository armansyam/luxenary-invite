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

/** Latar yang dipotong ke bentuk huruf (`background-clip: text`) adalah warna teks, bukan latar. */
function clipsToText(cs: CSSStyleDeclaration): boolean {
  return cs.backgroundClip === "text" || cs.getPropertyValue("-webkit-background-clip") === "text";
}

/** Lapisan `background-image` dipisah pada koma tingkat atas (koma di dalam fungsi warna atau gradasi diabaikan). */
function splitLayers(image: string): string[] {
  const out: string[] = [];
  let depth = 0, start = 0;
  for (let i = 0; i < image.length; i++) {
    if (image[i] === "(") depth++;
    else if (image[i] === ")") depth--;
    else if (image[i] === "," && depth === 0) { out.push(image.slice(start, i).trim()); start = i + 1; }
  }
  out.push(image.slice(start).trim());
  return out.filter((l) => l && l !== "none");
}

/**
 * Warna rata-rata `background-image`: tiap lapisan gradasi dirata-ratakan dari titik-titiknya, lalu lapisan ditumpuk dari
 * atas (lapisan pertama) ke bawah. Lapisan foto (`url()`) yang tidak tertutup penuh: bila gradasi di atasnya cukup pekat
 * (alfa rata-rata >= 0,45, seperti scrim gelap sampul) warna gradasi itulah yang menentukan keterbacaan; bila lebih tipis
 * hasilnya null karena isi foto tidak diketahui.
 */
export function gradientAverage(image: string): Rgba | null {
  const layers = splitLayers(image);
  if (!layers.length) return null;
  const averaged: Array<Rgba | null> = layers.map((layer) => {
    if (/^url\(/i.test(layer)) return null;
    const stops = [...layer.matchAll(/rgba?\([^)]*\)|color\(srgb[^)]*\)/g)].map((m) => parseCssColor(m[0])).filter((c): c is Rgba => c !== null);
    if (!stops.length) return [0, 0, 0, 0];
    return [0, 1, 2, 3].map((i) => stops.reduce((a, s) => a + s[i], 0) / stops.length) as Rgba;
  });
  const composite = (stack: Rgba[]): Rgba => {
    let result: Rgba = [0, 0, 0, 0];
    for (let i = stack.length - 1; i >= 0; i--) {
      const top = stack[i];
      const a = top[3] + result[3] * (1 - top[3]);
      result = a === 0 ? [0, 0, 0, 0] : ([0, 1, 2].map((c) => (top[c] * top[3] + result[c] * result[3] * (1 - top[3])) / a).concat(a) as Rgba);
    }
    return result;
  };
  const photoAt = averaged.findIndex((l) => l === null);
  const opaqueAt = averaged.findIndex((l) => l !== null && l[3] >= 0.99);
  if (photoAt >= 0 && (opaqueAt < 0 || photoAt < opaqueAt)) {
    const over = composite(averaged.slice(0, photoAt) as Rgba[]);
    return over[3] >= 0.45 ? [over[0], over[1], over[2], 1] : null;
  }
  return composite((opaqueAt >= 0 ? averaged.slice(0, opaqueAt + 1) : averaged) as Rgba[]);
}

/**
 * Latar efektif sebuah elemen: lapisan leluhur ditumpuk dari atas sampai pekat. `background-image` berupa gradasi
 * dihitung sebagai rata-rata titik gradasinya (gradasi gelap di atas foto sampul menentukan keterbacaan teks di atasnya);
 * foto tanpa gradasi tidak bisa dihitung sehingga hasilnya null dan teks di atasnya tidak dinilai.
 */
export function effectiveBackground(el: Element, win: Window): Rgba | null {
  const layers: Rgba[] = [];
  for (let node: Element | null = el; node; node = node.parentElement) {
    const cs = win.getComputedStyle(node);
    if (cs.backgroundImage && cs.backgroundImage !== "none" && !clipsToText(cs)) {
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

/**
 * Lapisan latar satu elemen dari atas ke bawah: `::after`, `::before`, gambar latar, warna latar. null = foto tanpa
 * gradasi. Pseudo-elemen hanya dihitung bila menutupi sedikitnya separuh lebar dan tinggi elemen (panel latar), bukan
 * titik atau garis hias kecil.
 */
function layersOf(node: Element, win: Window): Rgba[] | null {
  const out: Rgba[] = [];
  const host = node.getBoundingClientRect();
  const styles = [win.getComputedStyle(node, "::after"), win.getComputedStyle(node, "::before")].filter(
    (p) => p.content !== "none" && p.content !== "normal" && parseFloat(p.width) >= host.width / 2 && parseFloat(p.height) >= host.height / 2,
  );
  for (const cs of [...styles, win.getComputedStyle(node)]) {
    if (clipsToText(cs)) continue;
    if (cs.backgroundImage && cs.backgroundImage !== "none") {
      const gradient = gradientAverage(cs.backgroundImage);
      if (!gradient) return null;
      out.push(gradient);
    }
    const bg = parseCssColor(cs.backgroundColor);
    if (bg && bg[3] > 0) out.push(bg);
  }
  return out;
}

/**
 * Latar dari tumpukan elemen yang benar-benar berada di bawah titik tengah teks (`elementsFromPoint`), termasuk lapisan
 * yang bukan leluhur seperti `.fixed-bg-layer` atau panel latar berposisi absolut. Elemen harus berada di layar dan
 * dokumen harus menyalakan `pointer-events` untuk semua elemen selama pengukuran. undefined = titik tidak mengenai teks.
 */
export function stackBackground(el: Element, doc: Document): Rgba | null | undefined {
  const win = doc.defaultView!;
  const r = el.getBoundingClientRect();
  const x = Math.min(Math.max(r.left + Math.min(r.width / 2, 40), 1), win.innerWidth - 1);
  const y = Math.min(Math.max(r.top + r.height / 2, 1), win.innerHeight - 1);
  const stack = doc.elementsFromPoint(x, y);
  const idx = stack.findIndex((n) => n === el || el.contains(n));
  if (idx < 0) return undefined;
  const layers: Rgba[] = [];
  for (const node of stack.slice(idx)) {
    const own = layersOf(node, win);
    if (!own) return null;
    for (const l of own) {
      layers.push(l);
      if (l[3] >= 0.99) return layers.reduceRight<Rgba>((acc, top) => blend(top, acc), [255, 255, 255, 1]);
    }
  }
  return layers.reduceRight<Rgba>((acc, top) => blend(top, acc), [255, 255, 255, 1]);
}

export interface TextSample {
  key: string;
  text: string;
  ratio: number;
  min: number;
  el: Element;
}

/**
 * Elemen yang memiliki teks langsung dan tampil; tiap elemen dinilai terhadap ambang WCAG AA (3 untuk teks besar).
 * `hitTest`: tiap elemen digulir ke layar dan latarnya dibaca dari tumpukan titik (`stackBackground`); lebih tepat tetapi
 * lambat, dipakai skrip audit. Tanpa itu latar dibaca dari rantai leluhur (editor varian, membandingkan sebelum/sesudah).
 */
export function measureText(doc: Document, opts: { hitTest?: boolean } = {}): TextSample[] {
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
    const fg = clipsToText(cs) ? gradientAverage(cs.backgroundImage) : parseCssColor(cs.color);
    let bg: Rgba | null | undefined;
    if (opts.hitTest) {
      el.scrollIntoView({ block: "center", inline: "nearest" });
      bg = stackBackground(el, doc);
      if (bg === undefined) return;
    } else bg = effectiveBackground(el, win);
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
