/**
 * Mode Master Tahap 2–3 (murni, tanpa database): ornamen, seksi bebas, latar per seksi, dan urutan seksi pada master
 * tulisan tangan, disimpan di `masterOverrides` dan diterapkan ke HTML master saat render. Berkas master tidak ditulis.
 * Isi admin masuk ke halaman tamu, jadi setiap nilai divalidasi saat disimpan dan lagi saat diterapkan.
 */
import { isAllowedBackdropSrc, isAllowedOrnamentSrc } from "@/lib/themeBuilder/spec";

export interface MasterOrnament {
  id: string;
  /** id elemen seksi master (section, footer, header, atau coverScreen) tempat ornamen menempel. */
  anchor: string;
  src: string;
  /** Titik tengah ornamen, persen dari lebar dan tinggi seksi. */
  x: number;
  y: number;
  /** Lebar ornamen, persen dari lebar seksi. */
  width: number;
  rotate: number;
  opacity: number;
  flipX?: boolean;
  flipY?: boolean;
  /** "back": di belakang isi seksi (di atas latar seksi); "front": di depan isi. */
  layer: "front" | "back";
  hideOn?: "mobile" | "desktop";
}

export interface MasterFreeSection {
  id: string;
  /** id `<section>` master yang menjadi tempat seksi ini disisipkan sesudahnya. */
  after: string;
  eyebrow?: string;
  title?: string;
  text?: string;
  image?: string;
  align: "center" | "left";
}

export const MASTER_BG_TOKENS = [
  { id: "light", label: "Latar terang", css: "var(--bg-light)" },
  { id: "dark", label: "Latar gelap", css: "var(--bg-dark)" },
  { id: "canvas", label: "Kanvas", css: "var(--bg-canvas)" },
  { id: "card", label: "Kartu", css: "var(--card-bg)" },
  { id: "primary", label: "Warna utama", css: "var(--primary)" },
  { id: "secondary", label: "Warna kedua", css: "var(--secondary)" },
  { id: "accent", label: "Aksen", css: "var(--accent)" },
] as const;
export type MasterBgToken = (typeof MASTER_BG_TOKENS)[number]["id"];

export interface MasterSectionBg {
  color?: MasterBgToken;
  image?: string;
  /** Kepekatan lapisan gelap (`--bg-dark`) di atas gambar, 0–90 persen. */
  overlay?: number;
}

export interface MasterLayout {
  ornaments?: MasterOrnament[];
  freeSections?: MasterFreeSection[];
  sectionBackgrounds?: Record<string, MasterSectionBg>;
  /** Urutan baru seksi yang boleh dipindah (`masterReorderable`), dalam urutan tampil. */
  sectionOrder?: string[];
}

const ID_RE = /^[a-z0-9]{6,16}$/;
const ANCHOR_RE = /^[A-Za-z][\w-]{0,60}$/;
export const MAX_MASTER_ORNAMENTS = 60;
export const MAX_FREE_SECTIONS = 8;
const TEXT_LIMITS = { eyebrow: 60, title: 120, text: 1200 } as const;

/** Elemen seksi master yang bisa ditempeli ornamen dan diberi latar: section/footer/header ber-id dan sampul. */
export function masterAnchors(html: string): string[] {
  const ids: string[] = [];
  if (/\bid="coverScreen"/.test(html)) ids.push("coverScreen");
  for (const m of html.matchAll(/<(?:section|footer|header)\b[^>]*\bid="([^"]+)"/gi)) {
    if (ANCHOR_RE.test(m[1]) && !ids.includes(m[1])) ids.push(m[1]);
  }
  return ids;
}

/** Rentang `<section id="...">…</section>` seimbang (aman untuk seksi bersarang). */
function sectionRangeById(html: string, id: string): { start: number; end: number } | null {
  const open = new RegExp(`<section\\b[^>]*\\bid="${id}"[^>]*>`).exec(html);
  if (!open) return null;
  const tags = /<section\b|<\/section>/g;
  tags.lastIndex = open.index;
  let depth = 0;
  for (let m = tags.exec(html); m; m = tags.exec(html)) {
    depth += m[0] === "</section>" ? -1 : 1;
    if (depth === 0) return { start: open.index, end: m.index + m[0].length };
  }
  return null;
}

/**
 * Seksi yang aman dipindah: `<section id>` tingkat atas (tidak bersarang di seksi lain) dan tidak dibungkus syarat mesin
 * (`{{#if}}` tepat sebelum atau `{{/if}}` tepat sesudahnya), karena syarat itu tidak ikut berpindah. Seksi buatan mesin
 * (galeri, kado, RSVP) berupa token, bukan `<section>` di master, jadi tidak termasuk. Urut sesuai kemunculan.
 */
export function masterReorderable(html: string): string[] {
  const ranges = [...html.matchAll(/<section\b[^>]*\bid="([^"]+)"/gi)]
    .map((m) => ({ id: m[1], range: ANCHOR_RE.test(m[1]) ? sectionRangeById(html, m[1]) : null }))
    .filter((s): s is { id: string; range: { start: number; end: number } } => Boolean(s.range));
  return ranges
    .filter((s) => !ranges.some((o) => o !== s && o.range.start < s.range.start && o.range.end > s.range.end))
    .filter((s) => !/\{\{#if [^}]*\}\}\s*$/.test(html.slice(Math.max(0, s.range.start - 200), s.range.start)) && !/^\s*\{\{\/if\}\}/.test(html.slice(s.range.end, s.range.end + 40)))
    .map((s) => s.id);
}

const clamp = (v: unknown, min: number, max: number, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v * 10) / 10)) : fallback;

function cleanText(raw: unknown, max: number, label: string, errors: string[]): string | undefined {
  if (raw === undefined || raw === null || raw === "") return undefined;
  if (typeof raw !== "string") { errors.push(`${label} tidak terbaca.`); return undefined; }
  const v = raw.trim();
  if (!v) return undefined;
  if (v.length > max) { errors.push(`${label} paling panjang ${max} karakter.`); return undefined; }
  // Lapisan diterapkan sebelum token mesin diisi; kurung kurawal ganda akan dibaca sebagai token template.
  if (/\{\{|\}\}/.test(v)) { errors.push(`${label} tidak boleh memuat {{ atau }}.`); return undefined; }
  return v;
}

/** Lapisan Mode Master dari masukan admin, dicocokkan dengan seksi yang benar-benar ada di master. */
export function parseMasterLayout(input: Record<string, unknown>, parentHtml: string, errors: string[]): MasterLayout {
  const out: MasterLayout = {};
  const anchors = new Set(masterAnchors(parentHtml));
  const sections = new Set([...parentHtml.matchAll(/<section\b[^>]*\bid="([^"]+)"/gi)].map((m) => m[1]));

  if (Array.isArray(input.ornaments)) {
    const list: MasterOrnament[] = [];
    for (const raw of input.ornaments as Array<Record<string, any>>) {
      if (!raw || typeof raw !== "object") continue;
      if (!ID_RE.test(raw.id) || list.some((o) => o.id === raw.id)) { errors.push("Id ornamen tidak sah."); continue; }
      if (!anchors.has(raw.anchor)) { errors.push(`Seksi ornamen ${String(raw.anchor).slice(0, 40)} tidak ada di master.`); continue; }
      if (!isAllowedOrnamentSrc(raw.src)) { errors.push("Gambar ornamen harus dari pustaka ornamen atau unggahan builder."); continue; }
      list.push({
        id: raw.id, anchor: raw.anchor, src: raw.src,
        x: clamp(raw.x, -20, 120, 50), y: clamp(raw.y, -20, 120, 50), width: clamp(raw.width, 2, 150, 30),
        rotate: clamp(raw.rotate, -180, 180, 0), opacity: clamp(raw.opacity, 0.05, 1, 1),
        ...(raw.flipX === true ? { flipX: true } : {}), ...(raw.flipY === true ? { flipY: true } : {}),
        layer: raw.layer === "front" ? "front" : "back",
        ...(raw.hideOn === "mobile" || raw.hideOn === "desktop" ? { hideOn: raw.hideOn } : {}),
      });
    }
    if (list.length > MAX_MASTER_ORNAMENTS) errors.push(`Ornamen paling banyak ${MAX_MASTER_ORNAMENTS}.`);
    if (list.length) out.ornaments = list;
  }

  if (Array.isArray(input.freeSections)) {
    const list: MasterFreeSection[] = [];
    for (const raw of input.freeSections as Array<Record<string, any>>) {
      if (!raw || typeof raw !== "object") continue;
      if (!ID_RE.test(raw.id) || list.some((f) => f.id === raw.id)) { errors.push("Id seksi bebas tidak sah."); continue; }
      if (!sections.has(raw.after)) { errors.push(`Seksi ${String(raw.after).slice(0, 40)} tidak ada di master.`); continue; }
      const image = raw.image ? (isAllowedBackdropSrc(raw.image) || isAllowedOrnamentSrc(raw.image) ? raw.image : null) : undefined;
      if (image === null) { errors.push("Gambar seksi bebas harus dari pustaka atau unggahan builder."); continue; }
      const f: MasterFreeSection = {
        id: raw.id, after: raw.after, align: raw.align === "left" ? "left" : "center",
        eyebrow: cleanText(raw.eyebrow, TEXT_LIMITS.eyebrow, "Teks kecil seksi bebas", errors),
        title: cleanText(raw.title, TEXT_LIMITS.title, "Judul seksi bebas", errors),
        text: cleanText(raw.text, TEXT_LIMITS.text, "Isi seksi bebas", errors),
        ...(image ? { image } : {}),
      };
      for (const k of ["eyebrow", "title", "text"] as const) if (f[k] === undefined) delete f[k];
      if (!f.eyebrow && !f.title && !f.text && !f.image) { errors.push("Seksi bebas kosong: isi teks atau gambar."); continue; }
      list.push(f);
    }
    if (list.length > MAX_FREE_SECTIONS) errors.push(`Seksi bebas paling banyak ${MAX_FREE_SECTIONS}.`);
    if (list.length) out.freeSections = list;
  }

  if (input.sectionBackgrounds && typeof input.sectionBackgrounds === "object" && !Array.isArray(input.sectionBackgrounds)) {
    const bgs: Record<string, MasterSectionBg> = {};
    for (const [id, raw] of Object.entries(input.sectionBackgrounds as Record<string, any>)) {
      if (!anchors.has(id)) { errors.push(`Seksi latar ${id.slice(0, 40)} tidak ada di master.`); continue; }
      if (!raw || typeof raw !== "object") continue;
      const bg: MasterSectionBg = {};
      if (raw.color) {
        if (MASTER_BG_TOKENS.some((t) => t.id === raw.color)) bg.color = raw.color;
        else errors.push("Warna latar seksi harus dari token palet.");
      }
      if (raw.image) {
        if (isAllowedBackdropSrc(raw.image) && raw.image) bg.image = raw.image;
        else errors.push("Gambar latar seksi harus dari pustaka latar atau unggahan builder.");
      }
      if (bg.image) bg.overlay = clamp(raw.overlay, 0, 90, 0);
      if (bg.color || bg.image) bgs[id] = bg;
    }
    if (Object.keys(bgs).length) out.sectionBackgrounds = bgs;
  }

  if (Array.isArray(input.sectionOrder)) {
    const allowed = masterReorderable(parentHtml);
    const order = (input.sectionOrder as unknown[]).filter((s): s is string => typeof s === "string");
    if (order.some((s) => !allowed.includes(s)) || new Set(order).size !== order.length) errors.push("Urutan seksi memuat seksi yang tidak bisa dipindah.");
    else if (order.length && order.length !== allowed.length) errors.push("Urutan seksi harus memuat semua seksi yang bisa dipindah.");
    else if (order.some((s, i) => s !== allowed[i])) out.sectionOrder = order;
  }
  return out;
}

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

export function ornamentStyle(o: MasterOrnament): string {
  const flip = `${o.flipX ? " scaleX(-1)" : ""}${o.flipY ? " scaleY(-1)" : ""}`;
  return `left:${o.x}%;top:${o.y}%;width:${o.width}%;opacity:${o.opacity};transform:translate(-50%,-50%) rotate(${o.rotate}deg)${flip};z-index:${o.layer === "front" ? 6 : -1};`;
}

function ornamentTag(o: MasterOrnament): string {
  const hide = o.hideOn ? ` lux-mo-hide-${o.hideOn}` : "";
  return `<img class="lux-mo${hide}" data-lux-mo="${o.id}" src="${escapeHtml(o.src)}" alt="" aria-hidden="true" style="${ornamentStyle(o)}">`;
}

function freeSectionHtml(f: MasterFreeSection): string {
  const parts = [
    f.image ? `<img class="lux-free-img" src="${escapeHtml(f.image)}" alt="" loading="lazy">` : "",
    f.eyebrow ? `<p class="lux-free-eyebrow">${escapeHtml(f.eyebrow)}</p>` : "",
    f.title ? `<h2 class="lux-free-title">${escapeHtml(f.title)}</h2>` : "",
    f.text ? `<p class="lux-free-text">${escapeHtml(f.text).replace(/\n/g, "<br>")}</p>` : "",
  ].filter(Boolean).join("");
  return `<section id="lux-fs-${f.id}" class="lux-free-sec lux-free-sec--${f.align}">${parts}</section>`;
}

/**
 * Lapisan HTML: urutan seksi (isi seksi ditukar antar-slot sehingga markup di sekitarnya tetap), seksi bebas sesudah
 * seksi tujuan, lalu ornamen tepat sesudah tag pembuka seksinya. Entri yang tidak cocok lagi dengan master dilewati.
 */
export function applyMasterLayoutHtml(html: string, layout: MasterLayout, onSkip?: (name: string) => void): string {
  let out = html;
  if (layout.sectionOrder?.length) {
    const allowed = masterReorderable(out);
    const order = layout.sectionOrder.filter((id) => allowed.includes(id));
    if (order.length === layout.sectionOrder.length) {
      const blocks = order.map((id) => ({ id, range: sectionRangeById(out, id)! }));
      const slots = [...blocks].sort((a, b) => a.range.start - b.range.start);
      const contents = order.map((id) => { const r = blocks.find((b) => b.id === id)!.range; return out.slice(r.start, r.end); });
      for (let i = slots.length - 1; i >= 0; i--) out = out.slice(0, slots[i].range.start) + contents[i] + out.slice(slots[i].range.end);
    } else onSkip?.("sectionOrder");
  }
  for (const f of layout.freeSections ?? []) {
    if (!ID_RE.test(f.id) || !ANCHOR_RE.test(f.after)) { onSkip?.(f.id); continue; }
    const r = sectionRangeById(out, f.after);
    if (!r) { onSkip?.(f.after); continue; }
    out = out.slice(0, r.end) + freeSectionHtml(f) + out.slice(r.end);
  }
  for (const o of layout.ornaments ?? []) {
    if (!ID_RE.test(o.id) || !ANCHOR_RE.test(o.anchor) || !isAllowedOrnamentSrc(o.src)) { onSkip?.(o.id); continue; }
    const open = new RegExp(`<(?:section|footer|header|div)\\b[^>]*\\bid="${o.anchor}"[^>]*>`).exec(out);
    if (!open) { onSkip?.(o.anchor); continue; }
    const at = open.index + open[0].length;
    out = out.slice(0, at) + ornamentTag(o) + out.slice(at);
  }
  return out;
}

/** CSS lapisan: posisi ornamen, tampilan seksi bebas (token palet master), dan latar per seksi. */
export function masterLayoutCss(layout: MasterLayout): string {
  const parts: string[] = [];
  const anchorsWithOrnaments = [...new Set((layout.ornaments ?? []).map((o) => o.anchor).filter((a) => ANCHOR_RE.test(a)))];
  if (anchorsWithOrnaments.length) {
    // :where() tanpa spesifisitas: aturan posisi milik master tetap menang; isolation membuat ornamen "belakang"
    // (z-index -1) berada di atas latar seksi tetapi di bawah isinya.
    parts.push(`:where(${anchorsWithOrnaments.map((a) => `#${a}`).join(", ")}) { position: relative; isolation: isolate; }`);
    parts.push(".lux-mo { position: absolute; pointer-events: none; height: auto; max-width: none; }");
    parts.push("@media (max-width: 899.98px) { .lux-mo-hide-mobile { display: none !important; } }");
    parts.push("@media (min-width: 900px) { .lux-mo-hide-desktop { display: none !important; } }");
  }
  if (layout.freeSections?.length) {
    parts.push(".lux-free-sec { position: relative; padding: 56px 24px; max-width: 520px; margin: 0 auto; color: var(--text-main); }");
    parts.push(".lux-free-sec--center { text-align: center; } .lux-free-sec--left { text-align: left; }");
    parts.push(".lux-free-img { display: block; width: 100%; max-width: 420px; height: auto; margin: 0 auto 20px; border-radius: var(--radius-md, 12px); }");
    parts.push(".lux-free-eyebrow { font-size: 11px; font-weight: 600; letter-spacing: 0.24em; text-transform: uppercase; color: var(--accent); margin: 0 0 8px; }");
    parts.push(".lux-free-title { font-family: var(--font-heading, serif); font-size: 30px; line-height: 1.2; margin: 0 0 12px; color: var(--text-main); }");
    parts.push(".lux-free-text { font-size: 14px; line-height: 1.7; color: var(--text-muted); margin: 0; }");
  }
  for (const [id, bg] of Object.entries(layout.sectionBackgrounds ?? {})) {
    if (!ANCHOR_RE.test(id)) continue;
    const color = MASTER_BG_TOKENS.find((t) => t.id === bg.color)?.css;
    const image = bg.image && isAllowedBackdropSrc(bg.image) ? bg.image : "";
    const decl: string[] = [];
    if (color) decl.push(`background-color: ${color} !important;`);
    if (image) {
      const overlay = Math.min(90, Math.max(0, Number(bg.overlay) || 0));
      decl.push(`background-image: linear-gradient(color-mix(in srgb, var(--bg-dark) ${overlay}%, transparent), color-mix(in srgb, var(--bg-dark) ${overlay}%, transparent)), url('${image}') !important;`);
      decl.push("background-size: cover !important; background-position: center !important;");
    } else if (color) decl.push("background-image: none !important;");
    if (decl.length) parts.push(`#${id} { ${decl.join(" ")} }`);
  }
  return parts.join("\n");
}
