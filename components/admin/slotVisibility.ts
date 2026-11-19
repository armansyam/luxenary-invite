/**
 * Pemeriksa slot media Editor Master: dengan foto uji per slot (URL unik), dokumen pratinjau dibaca untuk menentukan
 * apakah foto slot itu benar-benar terlihat tamu. Perkiraan dari gaya terhitung dan tumpukan elemen, bukan piksel:
 * - foto tidak dirujuk elemen mana pun: master tidak memakai slot itu;
 * - elemennya tersembunyi (display/visibility/opasitas/ukuran 0) pada tampilan sekarang;
 * - di `background-image` elemen yang sama ada gambar lain di lapisan atas (kasus sampul Wajo, 18 Nov 2026);
 * - elemen lain berlatar padat atau gambar menutup seluruh titik sampel;
 * - lapisan gelap di atasnya (gradasi di elemen yang sama atau elemen lain) menyisakan < 20% terang.
 */

export type SlotStatus = "visible" | "dim" | "covered" | "hidden" | "absent" | "other-view";

export interface SlotCheck {
  slot: string;
  status: SlotStatus;
  note: string;
  /** Status per tempat foto dipakai (mis. sampul dan latar halaman); `status` adalah yang terbaik di antaranya. */
  places?: Array<{ where: string; status: SlotStatus }>;
}

const DESKTOP_ONLY = new Set(["LANDING_COVER_DESKTOP", "DESKTOP_SIDEBAR"]);

/** Status yang berarti foto slot terlihat tamu (di tampilan ini atau tampilan lain); dasar usulan deklarasi slot. */
export const SLOT_SEEN: ReadonlySet<SlotStatus> = new Set(["visible", "dim", "other-view"]);

/** Nama tempat pemeriksa ("seksi host1") menjadi teks "Dipakai di" untuk klien; id seksi lain tidak ditulis. */
const PLACE_LABELS: Record<string, string> = {
  sampul: "Sampul",
  "latar halaman": "Latar halaman",
  penutup: "Penutup",
  "seksi closing": "Penutup",
  "seksi home": "Seksi pembuka",
  "seksi quote": "Kutipan",
  "seksi section-quote": "Kutipan",
  "seksi profile": "Profil",
  "seksi couple": "Profil mempelai",
  "seksi section-couple": "Profil mempelai",
  "seksi host1": "Profil mempelai",
  "seksi host2": "Profil mempelai",
  "seksi story": "Kisah",
  "seksi event": "Acara",
  "seksi events": "Acara",
  "seksi section-events": "Acara",
  "seksi countdown": "Hitung mundur",
  "seksi rsvp": "RSVP",
};

/** Tempat yang terlihat dari satu hasil pemeriksa, dalam bahasa klien. */
export function seenPlaceLabels(check: SlotCheck): string[] {
  return [...new Set((check.places ?? []).filter((p) => SLOT_SEEN.has(p.status)).map((p) => PLACE_LABELS[p.where]).filter((p): p is string => Boolean(p)))];
}
const RANK: Record<SlotStatus, number> = { visible: 5, dim: 4, covered: 3, hidden: 2, "other-view": 1, absent: 0 };

/** Lapisan `background-image` tingkat atas (koma di dalam fungsi tidak memisah). */
function splitLayers(value: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = "";
  for (const ch of value) {
    if (ch === "(") depth++;
    if (ch === ")") depth--;
    if (ch === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur.trim());
  return out;
}

/**
 * Alfa titik warna tertipis sebuah gradasi terhitung (rgba(...) atau color(srgb ... / a)); warna tanpa alfa = 1. Bagian
 * paling tipis yang menentukan apakah foto masih terlihat di suatu tempat (sesuai audit piksel 18 Nov 2026).
 */
function gradientAlpha(layer: string): number {
  const colors = layer.match(/rgba?\([^)]*\)|color\([^)]*\)/g) ?? [];
  if (!colors.length) return 0;
  const alphas = colors.map((c) => {
    const slash = c.match(/\/\s*([\d.]+)\s*\)/);
    if (slash) return Number(slash[1]);
    const rgba = c.match(/^rgba\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*,\s*([\d.]+)\s*\)/);
    return rgba ? Number(rgba[1]) : 1;
  });
  return Math.min(...alphas);
}

function colorAlpha(color: string): number {
  if (!color || color === "transparent") return 0;
  const slash = color.match(/\/\s*([\d.]+)\s*\)/);
  if (slash) return Number(slash[1]);
  const rgba = color.match(/^rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\s*\)/);
  return rgba ? Number(rgba[1]) : 1;
}

interface Target { el: Element; viaBackground: boolean; pseudo?: "::before" | "::after" }

/**
 * Lapisan yang menutup isi undangan hanya sementara: sampul sebelum dibuka (pratinjau editor selalu menampilkannya) dan
 * preloader. Tidak dihitung sebagai penutup kecuali foto yang diperiksa memang berada di dalamnya.
 */
const TRANSIENT_LAYERS = "#coverScreen, .cover-screen, #coverOverlay, .cover-overlay, #themePreloader, .lux-universal-preloader";

function effectiveOpacity(el: Element, win: Window): number {
  let o = 1;
  for (let e: Element | null = el; e && e !== e.ownerDocument.documentElement; e = e.parentElement) o *= Number(win.getComputedStyle(e).opacity || 1);
  return o;
}

function findTargets(doc: Document, url: string): Target[] {
  const win = doc.defaultView!;
  const out: Target[] = [];
  for (const el of Array.from(doc.querySelectorAll("*"))) {
    const tag = el.tagName;
    if ((tag === "IMG" || tag === "SOURCE" || tag === "VIDEO") && (el.getAttribute("src") ?? "").includes(url)) {
      out.push({ el: tag === "SOURCE" && el.parentElement ? el.parentElement : el, viaBackground: false });
      continue;
    }
    if (win.getComputedStyle(el).backgroundImage.includes(url)) out.push({ el, viaBackground: true });
    for (const pseudo of ["::before", "::after"] as const) {
      if (win.getComputedStyle(el, pseudo).backgroundImage.includes(url)) out.push({ el, viaBackground: true, pseudo });
    }
  }
  return out;
}

function isFixed(el: Element, win: Window): boolean {
  for (let e: Element | null = el; e && e !== e.ownerDocument.documentElement; e = e.parentElement) {
    if (win.getComputedStyle(e).position === "fixed") return true;
  }
  return false;
}

/**
 * Tumpukan elemen di 9 titik bagian foto yang terlihat di layar: titik terhitung "terlihat" bila tidak ada elemen di
 * atasnya yang berlatar padat, bergambar, atau berupa gambar/video. `dark` = lapisan semi-transparan di atas titik
 * terlihat yang paling terang (kotak teks semi-gelap di satu titik tidak membuat seluruh foto dianggap gelap). Null bila
 * foto tidak berada di layar.
 */
function sampleStack(doc: Document, el: Element, url: string, rect: DOMRect): { seen: number; dark: number } | null {
  const win = doc.defaultView!;
  const x0 = Math.max(0, rect.left), x1 = Math.min(win.innerWidth, rect.right), y0 = Math.max(0, rect.top), y1 = Math.min(win.innerHeight, rect.bottom);
  if (x1 - x0 <= 4 || y1 - y0 <= 4) return null;
  let seen = 0;
  let lightest = 1;
  for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) {
    let blocked = false;
    let dark = 0;
    for (const above of doc.elementsFromPoint(x0 + (x1 - x0) * fx, y0 + (y1 - y0) * fy)) {
      if (above === el) break;
      const transient = above.closest(TRANSIENT_LAYERS);
      if (transient && !transient.contains(el)) continue;
      if (effectiveOpacity(above, win) < 0.05) continue;
      // Teks dan kotak transparan di atas foto tidak menutup; hanya latar padat, gambar, atau video.
      const s = win.getComputedStyle(above);
      const isMedia = above.tagName === "IMG" || above.tagName === "VIDEO";
      if (isMedia || /url\(/.test(s.backgroundImage) || colorAlpha(s.backgroundColor) >= 0.95) {
        if (isMedia && ((above.getAttribute("src") ?? "").includes(url) || above.hasAttribute("data-lux-cutout"))) continue;
        blocked = true;
        break;
      }
      const a = Math.max(colorAlpha(s.backgroundColor), ...splitLayers(s.backgroundImage).filter((l) => l.includes("gradient")).map(gradientAlpha), 0) * Number(s.opacity || 1);
      dark = 1 - (1 - dark) * (1 - a);
    }
    if (!blocked) { seen++; lightest = Math.min(lightest, dark); }
  }
  return { seen, dark: seen ? lightest : 0 };
}

function checkTarget(doc: Document, t: Target, url: string): { status: SlotStatus; note: string } {
  const win = doc.defaultView!;
  const el = t.el as HTMLElement;
  const style = win.getComputedStyle(el, t.pseudo ?? null);
  // Opasitas tidak dihitung: elemen yang menunggu animasi muncul (opacity 0 sampai digulir) tampil di undangan nyata.
  const visible = typeof el.checkVisibility === "function" ? el.checkVisibility({ visibilityProperty: true }) : el.getClientRects().length > 0;
  const rect = el.getBoundingClientRect();
  if (!visible || style.display === "none" || rect.width < 2 || rect.height < 2) return { status: "hidden", note: "Elemen fotonya tersembunyi pada tampilan ini." };

  let darkness = 0;
  if (t.viaBackground) {
    const layers = splitLayers(style.backgroundImage);
    const idx = layers.findIndex((l) => l.includes(url));
    const above = layers.slice(0, Math.max(0, idx));
    if (above.some((l) => /^url\(/.test(l))) return { status: "covered", note: "Tertutup gambar lain di elemen yang sama (lapisan latar di atas foto)." };
    for (const l of above) darkness = 1 - (1 - darkness) * (1 - gradientAlpha(l));
  }

  // Latar `fixed` (latar tetap) diam di layar sementara seksi bergulir di atasnya: diperiksa di setiap layar sepanjang
  // halaman, lalu posisi gulir pratinjau dikembalikan. Foto lain diperiksa di 9 titik bagian yang terlihat di layar;
  // foto di luar layar hanya dicek gaya dan lapisannya.
  const fixed = isFixed(el, win) && !el.closest(TRANSIENT_LAYERS);
  const scroller = doc.scrollingElement ?? doc.documentElement;
  const startY = scroller.scrollTop;
  // elementsFromPoint melewati elemen `pointer-events: none` (latar tetap selalu begitu), dan master mengunci gulir
  // selama sampul tampil. Keduanya dilepas sementara selama sampel diambil, lalu dikembalikan sebelum digambar ulang.
  const restore: Array<() => void> = [];
  const force = (node: HTMLElement, prop: string, value: string) => {
    const prev = node.style.getPropertyValue(prop);
    const prio = node.style.getPropertyPriority(prop);
    node.style.setProperty(prop, value, "important");
    restore.push(() => (prev ? node.style.setProperty(prop, prev, prio) : node.style.removeProperty(prop)));
  };
  force(el, "pointer-events", "auto");
  // Master memakai scroll-behavior: smooth; tanpa ini scrollTop berpindah beranimasi dan setiap "layar" yang disampel
  // sebenarnya layar pertama (19 Nov 2026: latar tetap tercatat tertutup di semua layar karena slideshow Home).
  if (fixed) for (const node of [doc.documentElement, doc.body]) { force(node, "overflow-y", "auto"); force(node, "scroll-behavior", "auto"); }
  const positions = fixed ? Array.from({ length: Math.min(20, Math.ceil(scroller.scrollHeight / win.innerHeight)) }, (_, i) => i * win.innerHeight) : [startY];
  let screens = 0;
  let screensSeen = 0;
  let overlayDark = 1;
  try {
    for (const y of positions) {
      if (fixed) scroller.scrollTop = y;
      const r = sampleStack(doc, el, url, el.getBoundingClientRect());
      if (!r) continue;
      screens++;
      if (r.seen > 3) { screensSeen++; overlayDark = Math.min(overlayDark, r.dark); }
      if (!fixed && r.seen === 0) return { status: "covered", note: "Tertutup elemen lain berlatar padat atau gambar." };
      if (!fixed && r.seen <= 3) return { status: r.dark >= 0.8 || darkness >= 0.8 ? "dim" : "covered", note: `Sebagian besar tertutup elemen lain (${r.seen}/9 titik terlihat).` };
    }
  } finally {
    if (fixed) scroller.scrollTop = startY;
    for (const undo of restore.reverse()) undo();
  }
  if (fixed && screens) {
    if (!screensSeen) return { status: "covered", note: `Tertutup seksi berlatar padat di semua ${screens} layar.` };
    darkness = 1 - (1 - darkness) * (1 - overlayDark);
    if (darkness < 0.8) return { status: "visible", note: `Terlihat di ${screensSeen} dari ${screens} layar${darkness >= 0.5 ? `, lapisan gelap ±${Math.round(darkness * 100)}%` : ""}.` };
  } else if (screens && overlayDark < 1) {
    darkness = 1 - (1 - darkness) * (1 - overlayDark);
  }
  if (darkness >= 0.8) return { status: "dim", note: `Lapisan gelap di atas foto ±${Math.round(darkness * 100)}%; foto nyaris tidak terlihat.` };
  return { status: "visible", note: darkness >= 0.5 ? `Terlihat, dengan lapisan gelap ±${Math.round(darkness * 100)}%.` : "Terlihat." };
}

function placeOf(el: Element): string {
  if (el.closest(TRANSIENT_LAYERS)) return "sampul";
  if (el.closest(".fixed-bg-layer") || el.classList.contains("lux-fixed-bg-video")) return "latar halaman";
  const sec = el.closest("section[id], footer, header");
  return sec ? (sec.tagName === "FOOTER" ? "penutup" : `seksi ${sec.id || sec.tagName.toLowerCase()}`) : "halaman";
}

/** `slots`: slot → URL foto uji (unik per slot). `view`: tampilan pratinjau saat ini. */
export function checkSlots(doc: Document, slots: Record<string, string>, view: "mobile" | "desktop"): SlotCheck[] {
  const results: SlotCheck[] = [];
  for (const [slot, url] of Object.entries(slots)) {
    if (!url) continue;
    const targets = findTargets(doc, url);
    if (!targets.length) {
      // Di desktop, sampul HP wajar tidak dirujuk bila Sampul desktop terisi (mesin memakai foto mendatar itu).
      results.push(DESKTOP_ONLY.has(slot) && view === "mobile"
        ? { slot, status: "other-view", note: "Slot ini untuk desktop; periksa di tampilan Desktop." }
        : slot === "LANDING_COVER" && view === "desktop" && slots.LANDING_COVER_DESKTOP
          ? { slot, status: "other-view", note: "Di desktop sampul memakai foto Sampul desktop; periksa slot ini di tampilan HP." }
          : { slot, status: "absent", note: "Master tidak memakai slot ini: foto klien tidak akan tampil." });
      continue;
    }
    // Satu slot bisa dipakai di beberapa tempat (mis. latar halaman sekaligus slideshow sampul): status terbaik dipakai,
    // dan tempat lain yang tidak terlihat disebut agar admin tahu di mana foto klien hilang.
    const checked = targets.map((t) => ({ where: placeOf(t.el), ...checkTarget(doc, t, url) }));
    const best = checked.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a));
    const others = checked.filter((c) => c !== best && RANK[c.status] < RANK.dim && c.where !== best.where);
    const multi = new Set(checked.map((c) => c.where)).size > 1;
    const note = `${multi ? `Di ${best.where}: ` : ""}${best.note}${others.length ? ` Di ${others[0].where}: ${others[0].note.charAt(0).toLowerCase()}${others[0].note.slice(1)}` : ""}`;
    results.push({ slot, status: best.status, note, places: checked.map((c) => ({ where: c.where, status: c.status })) });
  }
  return results;
}
