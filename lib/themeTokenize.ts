/**
 * Tokenisasi master tema tulisan tangan: warna dan keluarga huruf yang tertulis langsung di CSS diganti variabel baru
 * di `:root` (`--lux-c-<hex>`, `--lux-font-*`), tanpa mengubah nilai yang dihitung peramban. Ini fondasi Varian Tema, yang menimpa variabel `:root` master
 * induk; tanpa tokenisasi, warna dan huruf yang tertulis langsung tidak ikut berganti.
 *
 * Hanya konteks CSS yang diubah (isi `<style>` dan atribut `style=""`), dan hanya di dalam badan deklarasi `{ ... }`,
 * bukan selektor. Yang sengaja tidak disentuh:
 * - hitam/putih netral (bayangan, overlay, teks di atas foto): memetakannya ke variabel palet membuat override satu
 *   warna ikut mengubah semua bayangan;
 * - warna di `<script>` (kanvas dan JS tidak memahami `var()`) dan atribut SVG `fill`/`stroke` (atribut presentasi
 *   tidak mendukung `var()`);
 * - isi `url(...)`, nilai di dalam blok `:root` itu sendiri, dan `font-family` yang sudah memakai `var()`, `inherit`,
 *   `initial`, atau hanya `monospace`.
 */

export interface TokenizeReport {
  /** Warna yang diganti variabel `--lux-c-<hex>`. */
  colors: number;
  newColorVars: string[];
  /** Deklarasi `font-family` yang diganti variabel `--lux-font-*`. */
  fonts: number;
  newFontVars: string[];
  skippedNeutral: number;
  /** Warna yang tetap tertulis langsung di luar konteks CSS (skrip, atribut SVG), untuk laporan. */
  untouchedOutsideCss: number;
}

const NEUTRAL = new Set(["000000", "ffffff"]);

function expandHex(hex: string): string {
  const h = hex.toLowerCase();
  return h.length === 3 || h.length === 4 ? h.split("").map((c) => c + c).join("") : h;
}

const toHex = (r: number, g: number, b: number) => [r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, "0")).join("");

/** Persen kepekatan untuk color-mix, dibulatkan agar sama dengan alpha aslinya setelah dikuantisasi peramban. */
const alphaPct = (a: number) => `${Math.round(a * 10000) / 100}%`;

function fontSlug(stack: string): string {
  const first = stack.split(",")[0].replace(/['"]/g, "").trim().toLowerCase();
  return first.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "font";
}

export function tokenizeMaster(html: string): { html: string; report: TokenizeReport } {
  const report: TokenizeReport = { colors: 0, newColorVars: [], fonts: 0, newFontVars: [], skippedNeutral: 0, untouchedOutsideCss: 0 };
  if (!/:root\s*\{[^}]*\}/.test(html)) throw new Error("Master tidak memiliki blok :root.");
  const newColors = new Map<string, string>();
  const fontVars = new Map<string, string>();
  const usedFontNames = new Set<string>();

  /**
   * Selalu variabel baru per nilai, bukan variabel `:root` lama yang kebetulan bernilai sama: variabel lama bisa
   * didefinisikan ulang di cakupan lain (mis. seksi yang menimpa --primary) atau ditimpa saat render, sehingga warna yang
   * tadinya tertulis langsung ikut berubah. Pengelompokan per nilai asli dilakukan Varian Tema saat menimpa.
   */
  const colorVar = (hex: string): string => {
    let name = newColors.get(hex);
    if (!name) { name = `--lux-c-${hex}`; newColors.set(hex, name); }
    report.colors++;
    return name;
  };
  const colorExpr = (hex: string, alpha: number | null): string | null => {
    if (NEUTRAL.has(hex)) { report.skippedNeutral++; return null; }
    const v = colorVar(hex);
    return alpha === null || alpha >= 1 ? `var(${v})` : `color-mix(in srgb, var(${v}) ${alphaPct(alpha)}, transparent)`;
  };

  /** Satu badan deklarasi (tanpa kurung kurawal). `url(...)` disamarkan dulu agar isinya tidak tersentuh. */
  const tokenizeBody = (body: string): string => {
    const urls: string[] = [];
    let out = body.replace(/url\([^)]*\)|\{\{[^{}]*\}\}/gi, (u) => { urls.push(u); return `\u0000U${urls.length - 1}\u0000`; });
    out = out.replace(/rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*(?:,\s*([\d.]+%?)\s*)?\)/gi, (full, r, g, b, a) => {
      const alpha = a === undefined ? null : a.endsWith("%") ? parseFloat(a) / 100 : parseFloat(a);
      return colorExpr(toHex(+r, +g, +b), alpha) ?? full;
    });
    out = out.replace(/#([0-9a-f]{8}|[0-9a-f]{6}|[0-9a-f]{4}|[0-9a-f]{3})\b/gi, (full, h: string) => {
      const ex = expandHex(h);
      const alpha = ex.length === 8 ? parseInt(ex.slice(6), 16) / 255 : null;
      return colorExpr(ex.slice(0, 6), alpha) ?? full;
    });
    out = out.replace(/(font-family\s*:\s*)([^;]+?)(\s*!important)?(\s*(?:;|$))/gi, (full, prop: string, value: string, imp: string | undefined, end: string) => {
      const v = value.trim();
      if (/^var\(|^(inherit|initial|unset|monospace)$/i.test(v)) return full;
      const stack = v.replace(/\s+/g, " ").replace(/\s*,\s*/g, ", ");
      let name = fontVars.get(stack);
      if (!name) {
        const base = `--lux-font-${fontSlug(stack)}`;
        name = base;
        for (let i = 2; usedFontNames.has(name); i++) name = `${base}-${i}`;
        usedFontNames.add(name);
        fontVars.set(stack, name);
      }
      report.fonts++;
      return `${prop}var(${name})${imp ?? ""}${end}`;
    });
    return out.replace(/\u0000U(\d+)\u0000/g, (_m, i) => urls[+i]);
  };

  const tokenizeCss = (css: string): string => {
    // Blok :root disamarkan agar nilai variabelnya sendiri tidak diganti; badan lain diproses dari yang terdalam.
    // Token engine ({{...}}) juga disamarkan: kurung kurawalnya membuat badan deklarasi yang memuatnya tidak terbaca.
    const roots: string[] = [];
    const tokens: string[] = [];
    const masked = css
      .replace(/\{\{[^{}]*\}\}/g, (t) => { tokens.push(t); return `\u0000T${tokens.length - 1}\u0000`; })
      .replace(/:root\s*\{[^}]*\}/g, (r) => { roots.push(r); return `\u0000R${roots.length - 1}\u0000`; });
    return masked
      .replace(/\{([^{}]*)\}/g, (_m, body: string) => `{${tokenizeBody(body)}}`)
      .replace(/\u0000R(\d+)\u0000/g, (_m, i) => roots[+i])
      .replace(/\u0000T(\d+)\u0000/g, (_m, i) => tokens[+i]);
  };

  let out = html.replace(/(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi, (_m, open: string, css: string, close: string) => `${open}${tokenizeCss(css)}${close}`);
  out = out.replace(/(\sstyle=")([^"]*)(")/gi, (_m, open: string, body: string, close: string) => `${open}${tokenizeBody(body)}${close}`);

  report.newColorVars = [...newColors.values()];
  report.newFontVars = [...fontVars.values()];
  const additions = [
    ...[...newColors.entries()].map(([hex, name]) => `${name}: #${hex};`),
    ...[...fontVars.entries()].map(([stack, name]) => `${name}: ${stack};`),
  ];
  if (additions.length) {
    out = out.replace(/(:root\s*\{)([^}]*)(\})/, (_m, open: string, body: string, close: string) => {
      const indent = body.match(/\n([ \t]+)--/)?.[1] ?? "      ";
      return `${open}${body.replace(/\s*$/, "")}\n${indent}/* Ditambahkan tokenisasi master (warna dan huruf yang sebelumnya tertulis langsung). */\n${additions.map((a) => `${indent}${a}`).join("\n")}\n    ${close}`;
    });
  }

  const outsideCss = out
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/\sstyle="[^"]*"/gi, "")
    .replace(/&#x?[0-9a-f]+;/gi, "");
  report.untouchedOutsideCss = [...outsideCss.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b|rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/gi)].filter((m) => {
    const hex = m[1] ? expandHex(m[1]) : toHex(+m[2], +m[3], +m[4]);
    return !NEUTRAL.has(hex);
  }).length;
  return { html: out, report };
}

/**
 * Variabel `:root` master yang boleh ditimpa Varian Tema: warna (hex/rgb) dan tumpukan huruf. Dipakai untuk memvalidasi
 * kunci override terhadap master induknya.
 */
export function masterTokenNames(html: string): { colors: string[]; fonts: string[] } {
  const body = html.match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const colors: string[] = [];
  const fonts: string[] = [];
  for (const m of body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);?/g)) {
    const value = m[2].trim();
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) || /^rgb\(/i.test(value)) colors.push(m[1]);
    else if (m[1].startsWith("--lux-font-") || /^--font-/.test(m[1])) fonts.push(m[1]);
  }
  return { colors, fonts };
}
