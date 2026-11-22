import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { masterTemplateCache } from "@/lib/cache";
import { isSafePathSegment } from "@/lib/fsSafe";
import { masterFilePath } from "@/lib/themePaths";
import { applyMasterOverrides, resolveMasterEdits } from "@/lib/masterEdits";
import { logger } from "@/lib/logger";
import { createInvitationDraft, deleteStaleInvitationDraft, readInvitationDraft } from "@/lib/invitationDraft";
import { syncSharedFiles } from "@/lib/sharedFiles";
import { stripEmptyMediaRefs } from "@/lib/emptyMediaRefs";
import { BG_PHOTO_TONE_STYLE_ID, bgPhotoToneCss, bgScrimScript, parseBgScrim } from "@/lib/bgPhotoTone";

import {
  DESKTOP_CONTAINMENT_STYLE,
  LUXENARY_BANNER,
  LUXENARY_PROTECTION_SCRIPT,
  HEAD_AUDIO_BLOCKER_SCRIPT,
  AUTOPLAY_SHOWCASE_SCRIPT,
  INLINE_LIVE_EDITOR_SCRIPT,
} from "@/lib/renderTemplate/runtimeAssets";
import { UNIFIED_CLIENT_RUNTIME_SCRIPT } from "@/lib/renderTemplate/clientRuntime";

export { LUXENARY_BANNER, LUXENARY_PROTECTION_SCRIPT };
// /css/* disajikan dengan Cache-Control 7 hari dan /fonts/* dengan `immutable` 1 tahun (next.config.ts): tanpa versi di
// URL, perubahan modules.css atau fonts.css tidak sampai ke tamu dan Cloudflare sampai cache-nya kedaluwarsa. Versi = hash
// isi berkas, dihitung sekali per proses.
const versionedCssHrefs = new Map<string, string>();
function getVersionedCssHref(href: "/css/modules.css" | "/fonts/fonts.css"): string {
  const cached = versionedCssHrefs.get(href);
  if (cached) return cached;
  let versioned: string = href;
  try {
    const css = fs.readFileSync(path.join(process.cwd(), "public", href));
    versioned = `${href}?v=${createHash("sha1").update(css).digest("hex").slice(0, 10)}`;
  } catch (err) {
    logger.warn("RenderTemplate", `${href} tidak terbaca; tautan dipasang tanpa versi`, { error: err instanceof Error ? err.message : String(err) });
  }
  versionedCssHrefs.set(href, versioned);
  return versioned;
}

/** Helper pembacaan master template dengan memory cache untuk meminimalkan I/O disk */
async function readMasterTemplate(filePath: string): Promise<string> {
  // Di mode development, selalu baca file fisik langsung dari disk agar perubahan template instan tanpa tertahan memori
  if (process.env.NODE_ENV !== "production") {
    return await fs.promises.readFile(filePath, "utf-8");
  }
  const cached = masterTemplateCache.get(filePath);
  if (cached) return cached;
  const content = await fs.promises.readFile(filePath, "utf-8");
  masterTemplateCache.set(filePath, content);
  return content;
}

/** Sanitasi URL agar hanya mengizinkan karakter aman untuk digunakan di CSS url() */
function sanitizeCssUrl(url: string): string {
  // Hapus karakter berbahaya yang bisa digunakan untuk CSS injection atau data: URI
  // Izinkan http/https URL atau path lokal yang diawali '/'
  const trimmed = url.trim();
  if (!/^https?:\/\//i.test(trimmed) && !trimmed.startsWith("/")) return "";
  // Tidak izinkan karakter yang bisa break CSS context
  return trimmed.replace(/[()"'\\]/g, "");
}

/** Deteksi apakah URL merujuk ke file media video */
function isVideoMedia(url?: string | null): boolean {
  if (!url) return false;
  return /\.(mp4|webm|mov)(\?.*)?$/i.test(url.trim());
}

/** Escape HTML entities untuk mencegah Stored & Reflected XSS di konteks HTML & atribut */
function escapeHtmlSafe(str: string): string {
  if (!str) return "";
  return String(str)
    .replace(/&(?!([a-zA-Z0-9]+|#[0-9]+|#x[0-9a-fA-F]+);)/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

function escapeHtmlAttr(str: string): string {
  return escapeHtmlSafe(str);
}

const HTML_ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };

/**
 * Teks setiap elemen `data-lux-field="customLabels.<kunci>"` pada HTML hasil render, dalam bentuk teks polos.
 * Dipakai untuk label bawaan undangan: teks yang benar-benar tampil di tema terpilih untuk jenis acara undangan itu.
 */
// Token teks jenis acara (SINGLE_NAME_LABELS di lib/themeEngine.ts): tetap selama jenis acara sama, aman dibekukan
// menjadi label. Token lain di dalam elemen label adalah data klien (tanggal, nama) yang harus tetap mengikuti isian.
const EVENT_TEXT_TOKENS = new Set(["eventLabel", "eventIntro", "profileEyebrow", "profileTitle", "profileSub", "agendaTitle", "closingText"]);

/** Kunci label yang teks masternya memuat data klien (mis. `{{eventDateFormatted}}`), sehingga tidak boleh dibekukan. */
export function labelKeysWithClientData(rawTemplate: string): Set<string> {
  const keys = new Set<string>();
  const re = /<([a-zA-Z0-9]+)\b[^>]*data-lux-field="customLabels\.([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rawTemplate))) {
    for (const t of m[3].matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
      if (!EVENT_TEXT_TOKENS.has(t[1])) keys.add(m[2]);
    }
  }
  return keys;
}

export function extractRenderedLabels(html: string): Record<string, string> {
  const labels: Record<string, string> = {};
  const re = /<([a-zA-Z0-9]+)\b[^>]*data-lux-field="customLabels\.([^"]+)"[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (labels[m[2]] !== undefined) continue;
    labels[m[2]] = m[3]
      .replace(/<svg[\s\S]*?<\/svg>/gi, "")
      .replace(/<[^>]+>/g, "")
      .replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (ent, code: string) => {
        if (code[0] === "#") return String.fromCodePoint(code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10));
        return HTML_ENTITIES[code.toLowerCase()] ?? ent;
      })
      .replace(/\s+/g, " ")
      .trim();
  }
  return labels;
}

export interface ThemeEntry {
  file: string;
  eventType: "wedding" | "personal" | "event";
  subEvent?: string;
  style: "minimalist" | "modern" | "traditional";
}

export const THEME_MAP: Record<string, ThemeEntry> = {
  // Minimalist Series (6)
  "kalandra": { file: "kalandra.html", eventType: "wedding", style: "minimalist" },
  "valente": { file: "valente.html", eventType: "wedding", style: "minimalist" },
  "aurelia": { file: "aurelia.html", eventType: "wedding", style: "minimalist" },
  "artisan": { file: "artisan.html", eventType: "wedding", style: "minimalist" },
  "verona": { file: "verona.html", eventType: "wedding", style: "minimalist" },
  "aeterna": { file: "aeterna.html", eventType: "wedding", style: "minimalist" },

  // Traditional Series (15)
  "prameswari": { file: "prameswari.html", eventType: "wedding", style: "traditional" },
  "dillalucky": { file: "dillalucky.html", eventType: "wedding", style: "traditional" },
  "lagaligo": { file: "lagaligo.html", eventType: "wedding", style: "traditional" },
  "toraja": { file: "toraja.html", eventType: "wedding", style: "traditional" },
  "rantepao": { file: "rantepao.html", eventType: "wedding", style: "traditional" },
  "makale": { file: "makale.html", eventType: "wedding", style: "traditional" },
  "bugis": { file: "bugis.html", eventType: "wedding", style: "traditional" },
  "bone": { file: "bone.html", eventType: "wedding", style: "traditional" },
  "wajo": { file: "wajo.html", eventType: "wedding", style: "traditional" },
  "soppeng": { file: "soppeng.html", eventType: "wedding", style: "traditional" },
  "makassar": { file: "makassar.html", eventType: "wedding", style: "traditional" },
  "gowa": { file: "gowa.html", eventType: "wedding", style: "traditional" },
  "maros": { file: "maros.html", eventType: "wedding", style: "traditional" },
  "takalar": { file: "takalar.html", eventType: "wedding", style: "traditional" },
  "bulukumba": { file: "bulukumba.html", eventType: "wedding", style: "traditional" },

  // Modern Series (13)
  "badrika": { file: "badrika.html", eventType: "wedding", style: "modern" },
  "mayang": { file: "mayang.html", eventType: "wedding", style: "modern" },
  "candani": { file: "candani.html", eventType: "wedding", style: "modern" },
  "wave": { file: "wave.html", eventType: "wedding", style: "modern" },
  "papercut": { file: "papercut.html", eventType: "wedding", style: "modern" },
  "ameera": { file: "ameera.html", eventType: "wedding", style: "modern" },
  "chronicle": { file: "chronicle.html", eventType: "wedding", style: "modern" },
  "lumina": { file: "lumina.html", eventType: "wedding", style: "modern" },
  "solaria": { file: "solaria.html", eventType: "wedding", style: "modern" },
  "burgundy-royale": { file: "burgundy-royale.html", eventType: "wedding", style: "modern" },
  "starlit-dreams": { file: "starlit-dreams.html", eventType: "wedding", style: "modern" },
  "vintage-forest": { file: "vintage-forest.html", eventType: "wedding", style: "modern" },
  "hablur": { file: "hablur.html", eventType: "wedding", style: "modern" },

  // Personal & Keluarga Series (37)
  "festivo": { file: "festivo.html", eventType: "personal", subEvent: "Ulang Tahun", style: "modern" },
  "kalandra-birthday": { file: "kalandra-birthday.html", eventType: "personal", subEvent: "Ulang Tahun", style: "minimalist" },
  "riang": { file: "riang.html", eventType: "personal", subEvent: "Ulang Tahun", style: "modern" },
  "balonku": { file: "balonku.html", eventType: "personal", subEvent: "Ulang Tahun", style: "modern" },
  "gala": { file: "gala.html", eventType: "personal", subEvent: "Ulang Tahun", style: "minimalist" },
  "lilin": { file: "lilin.html", eventType: "personal", subEvent: "Ulang Tahun", style: "minimalist" },
  "konfeti": { file: "konfeti.html", eventType: "personal", subEvent: "Ulang Tahun", style: "modern" },
  "antariksa": { file: "antariksa.html", eventType: "personal", subEvent: "Ulang Tahun", style: "modern" },
  "rimba": { file: "rimba.html", eventType: "personal", subEvent: "Ulang Tahun", style: "minimalist" },
  "karnaval": { file: "karnaval.html", eventType: "personal", subEvent: "Ulang Tahun", style: "modern" },

  "al-fariz": { file: "al-fariz.html", eventType: "personal", subEvent: "Khitanan", style: "traditional" },
  "fajar": { file: "fajar.html", eventType: "personal", subEvent: "Khitanan", style: "traditional" },
  "nur": { file: "nur.html", eventType: "personal", subEvent: "Khitanan", style: "traditional" },
  "sakinah": { file: "sakinah.html", eventType: "personal", subEvent: "Khitanan", style: "minimalist" },
  "kubah": { file: "kubah.html", eventType: "personal", subEvent: "Khitanan", style: "traditional" },
  "sajadah": { file: "sajadah.html", eventType: "personal", subEvent: "Khitanan", style: "traditional" },
  "girih": { file: "girih.html", eventType: "personal", subEvent: "Khitanan", style: "modern" },
  "serambi": { file: "serambi.html", eventType: "personal", subEvent: "Khitanan", style: "minimalist" },
  "firdaus": { file: "firdaus.html", eventType: "personal", subEvent: "Khitanan", style: "traditional" },

  "al-khalid": { file: "al-khalid.html", eventType: "personal", subEvent: "Aqiqah", style: "minimalist" },
  "buaian": { file: "buaian.html", eventType: "personal", subEvent: "Aqiqah", style: "minimalist" },
  "mungil": { file: "mungil.html", eventType: "personal", subEvent: "Aqiqah", style: "minimalist" },
  "barakah": { file: "barakah.html", eventType: "personal", subEvent: "Aqiqah", style: "traditional" },
  "domba": { file: "domba.html", eventType: "personal", subEvent: "Aqiqah", style: "minimalist" },
  "lelap": { file: "lelap.html", eventType: "personal", subEvent: "Aqiqah", style: "minimalist" },
  "pelangi": { file: "pelangi.html", eventType: "personal", subEvent: "Aqiqah", style: "modern" },
  "kelopak": { file: "kelopak.html", eventType: "personal", subEvent: "Aqiqah", style: "modern" },
  "embun": { file: "embun.html", eventType: "personal", subEvent: "Aqiqah", style: "traditional" },

  "cendekia": { file: "cendekia.html", eventType: "personal", subEvent: "Wisuda", style: "modern" },
  "toga": { file: "toga.html", eventType: "personal", subEvent: "Wisuda", style: "modern" },
  "laurel": { file: "laurel.html", eventType: "personal", subEvent: "Wisuda", style: "modern" },
  "akademia": { file: "akademia.html", eventType: "personal", subEvent: "Wisuda", style: "minimalist" },
  "pena": { file: "pena.html", eventType: "personal", subEvent: "Wisuda", style: "minimalist" },
  "medali": { file: "medali.html", eventType: "personal", subEvent: "Wisuda", style: "modern" },
  "sorak": { file: "sorak.html", eventType: "personal", subEvent: "Wisuda", style: "modern" },
  "ijazah": { file: "ijazah.html", eventType: "personal", subEvent: "Wisuda", style: "traditional" },
  "pustaka": { file: "pustaka.html", eventType: "personal", subEvent: "Wisuda", style: "minimalist" },

  // Acara & Event Umum Series (10)
  "sinergi": { file: "sinergi.html", eventType: "event", subEvent: "Corporate", style: "modern" },
  "prakarsa": { file: "prakarsa.html", eventType: "event", subEvent: "Seminar & Workshop", style: "modern" },
  "forum": { file: "forum.html", eventType: "event", subEvent: "Seminar & Workshop", style: "modern" },
  "temu": { file: "temu.html", eventType: "event", subEvent: "Reuni", style: "minimalist" },
  "cakrawala": { file: "cakrawala.html", eventType: "event", subEvent: "Corporate", style: "modern" },
  "jamuan": { file: "jamuan.html", eventType: "event", subEvent: "Syukuran", style: "traditional" },
  "panggung": { file: "panggung.html", eventType: "event", subEvent: "Grand Opening", style: "modern" },
  "lapang": { file: "lapang.html", eventType: "event", subEvent: "Gathering", style: "minimalist" },
  "prisma": { file: "prisma.html", eventType: "event", subEvent: "Product Launch", style: "minimalist" },
  "biasan": { file: "biasan.html", eventType: "event", subEvent: "Gathering", style: "modern" },
};

const THEME_EVENT_FOLDERS: Array<[string, ThemeEntry["eventType"]]> = [
  ["wedding", "wedding"],
  ["personal", "personal"],
  ["event", "event"],
];
const THEME_STYLES: ThemeEntry["style"][] = ["minimalist", "modern", "traditional"];

/**
 * Tema bawaan terdaftar di THEME_MAP. Tema yang diunggah admin (POST /api/admin/themes) hanya memiliki berkas master
 * di themes/<acara>/<gaya>/<id>.html, jadi entrinya dibaca dari letak berkas itu.
 */
export function resolveThemeEntry(templateName: string): ThemeEntry | undefined {
  if (Object.prototype.hasOwnProperty.call(THEME_MAP, templateName)) return THEME_MAP[templateName];
  if (!isSafePathSegment(templateName)) return undefined;
  for (const [folder, eventType] of THEME_EVENT_FOLDERS) {
    for (const style of THEME_STYLES) {
      if (fs.existsSync(path.join(process.cwd(), "themes", folder, style, `${templateName}.html`))) {
        return { file: `${templateName}.html`, eventType, style };
      }
    }
  }
  return undefined;
}

/**
 * Render a template file by replacing {{key}} placeholders with values from `data`.
 * Automatically resolves from themes/[eventType]/[style]/[file].
 */
export async function renderTemplateFile(
  templateName: string,
  data: Record<string, any>,
  options?: { editMode?: boolean; invitationId?: string; eventType?: string; templateSource?: string }
): Promise<string> {
  // Server replika menarik master Theme Builder dan aset yang dibuat di server lain sebelum mencari berkas master.
  await syncSharedFiles();

  // Pratinjau Theme Builder mengirim master hasil kompilasi yang belum ditulis ke disk: tanpa berkas master maupun piring.
  const templateSource = options?.templateSource;
  const info: ThemeEntry | undefined = templateSource === undefined
    ? resolveThemeEntry(templateName)
    : { file: `${templateName}.html`, eventType: "wedding", style: "modern" };
  if (!info) {
    throw new Error(`[renderTemplate] Tema "${templateName}" tidak terdaftar di THEME_MAP dan berkas masternya tidak ditemukan.`);
  }

  const tplPath = masterFilePath(info.eventType, info.style, info.file);

  async function fileExists(p: string): Promise<boolean> {
    try {
      await fs.promises.access(p);
      return true;
    } catch {
      return false;
    }
  }

  // --- ARSITEKTUR PIRING: undangan klien memakai salinan master miliknya sendiri (tabel invitation_drafts) ---
  // Salinan dibuat saat undangan pertama kali dirender dengan tema itu dan dipakai seterusnya, sehingga desain undangan
  // klien tidak berubah ketika admin mendesain ulang atau mengganti master. Ganti tema atau jenis acara menyalin ulang.
  // Demo dan portofolio (ID "demo-...") selalu dari master. Perbaikan mesin tema masuk lewat scripts/refresh-theme-drafts.ts.
  const draftId = templateSource === undefined && options?.invitationId && !options.invitationId.startsWith("demo-") && isSafePathSegment(options.invitationId) ? options.invitationId : null;
  const currentEvent = (options?.eventType || data?.eventType || info.eventType || "WEDDING").toUpperCase();
  let draftHtml: string | null = null;
  if (draftId) {
    const stored = await readInvitationDraft(draftId);
    if (stored && (stored.themeId.toLowerCase() !== templateName.toLowerCase() || stored.eventType.toUpperCase() !== currentEvent)) {
      await deleteStaleInvitationDraft(draftId, stored);
    } else if (stored) {
      draftHtml = stored.html;
    }
  }

  if (templateSource === undefined && draftHtml === null && !(await fileExists(tplPath))) {
    // Tidak menggunakan fallback (Sesuai instruksi: Wajib memilih tema)
    return `
        <div style="padding:40px; text-align:center; font-family:sans-serif; height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; background: #fff;">
          <h2 style="color:#d32f2f;">Tema Tidak Tersedia</h2>
          <p>Tema yang Anda pilih tidak tersedia atau telah dihapus oleh sistem.</p>
          <p><b>Silakan kembali ke Dashboard Anda dan pilih tema lain yang aktif untuk melanjutkan pengeditan.</b></p>
        </div>
      `;
  }

  let tpl: string;
  if (draftHtml !== null) {
    tpl = draftHtml;
  } else if (templateSource !== undefined) {
    tpl = templateSource;
  } else {
    tpl = await readMasterTemplate(tplPath);
    // Suntingan Editor Master disisipkan sebelum piring dibekukan: undangan yang sudah dibuat tetap sama walau admin menyunting master nanti.
    const masterEdits = await resolveMasterEdits(templateName);
    if (masterEdits) tpl = applyMasterOverrides(tpl, masterEdits, "lux-master-edits");
    if (draftId) {
      try {
        // Bila server lain lebih dulu membekukan piring, piring itulah yang dipakai agar semua server menyajikan hal sama.
        tpl = (await createInvitationDraft(draftId, { themeId: templateName, eventType: currentEvent, html: tpl })).html;
      } catch (err) {
        // Render tetap memakai master; salinan dicoba lagi pada render berikutnya.
        logger.warn("RenderTemplate", "Gagal menyalin master ke piring undangan", { invitationId: draftId, theme: templateName, error: err instanceof Error ? err.message : String(err) });
      }
    }
  }

  // Standarisasi banner kepemilikan dan proteksi Luxenary (Zero Hardcode & Identitas Publik Resmi)
  if (tpl.startsWith("<!--")) {
    const endCommentIdx = tpl.indexOf("-->");
    if (endCommentIdx !== -1 && endCommentIdx < 1200) {
      tpl = LUXENARY_BANNER + tpl.slice(endCommentIdx + 3).trimStart();
    }
  } else {
    tpl = LUXENARY_BANNER + tpl;
  }

  if (tpl.includes("AMSDEV PROTECTION SCRIPT")) {
    tpl = tpl.replace(/<!-- AMSDEV PROTECTION SCRIPT -->[\s\S]*?<\/script>/i, LUXENARY_PROTECTION_SCRIPT.trim());
  } else if (tpl.includes("properti eksklusif AMSDEV")) {
    tpl = tpl.replace(/properti eksklusif AMSDEV/g, "properti sistem berlisensi resmi");
  }

  // Fallback placement for Guest Memories if template doesn't explicitly have the placeholder
  if (!tpl.includes("{{memoriesSectionHtml}}") && data.memoriesSectionHtml) {
    if (tpl.includes("{{turutMengundangHtml}}")) {
      tpl = tpl.replace("{{turutMengundangHtml}}", `{{turutMengundangHtml}}\n    {{memoriesSectionHtml}}`);
    } else if (tpl.includes("{{giftSectionHtml}}")) {
      tpl = tpl.replace("{{giftSectionHtml}}", `{{giftSectionHtml}}\n    {{memoriesSectionHtml}}`);
    }
  }

  // Injections: Meta Tags, Head Audio Blocker, Global Modules CSS, Unified Runtime, Autoplay Script & Inline Live Editor Script
  // Master yang menautkan modules.css atau fonts.css sendiri ikut memakai URL berversi, agar salinan lama dari cache tidak
  // menimpa yang baru.
  const modulesHref = getVersionedCssHref("/css/modules.css");
  tpl = tpl.replace(/href="\/css\/modules\.css"/g, `href="${modulesHref}"`);
  tpl = tpl.replace(/href="\/fonts\/fonts\.css"/g, `href="${getVersionedCssHref("/fonts/fonts.css")}"`);
  const GLOBAL_MODULES_CSS = `<link rel="stylesheet" href="${modulesHref}">
  <style id="luxScrollbarHide">
    /* Keputusan pemilik (15 Nov 2026): scrollbar halaman dan daftar ucapan tidak ditampilkan di tema mana pun. Menang atas
       thumb berwarna milik master (aeterna, verona, burgundy-royale, vintage-forest); gulir tetap berfungsi. */
    html, body, #wishesStream, #wishesFeed, #wishesList, #luxMemoryModal, #luxMemoryModal * { scrollbar-width: none !important; }
    html::-webkit-scrollbar, body::-webkit-scrollbar, #wishesStream::-webkit-scrollbar, #wishesFeed::-webkit-scrollbar,
    #wishesList::-webkit-scrollbar, #luxMemoryModal ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
  </style>
  <style id="luxSmartDockStyles">
    /* Luxenary Engine Smart Dock Home Zone State Guard */
    body.lux-at-home-zone .bottom-dock,
    .bottom-dock.lux-dock-home-hidden {
      transform: translate3d(-50%, calc(100% + 48px), 0) !important;
      opacity: 0 !important;
      pointer-events: none !important;
      transition: transform 0.42s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease !important;
    }
    /* Tahap fitBottomDock(): compact = tombol navigasi berbagi lebar layar; tight = label dirapatkan; icons = label disembunyikan.
       Tombol audio (lingkaran berukuran tetap) tidak ikut direntangkan. measuring hanya ada selama pengukuran. */
    .bottom-dock > button.dock-a {
      color: var(--text-muted);
      font-family: var(--font-body);
      font-size: 0.65rem;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.2rem;
      padding: 0;
    }
    .bottom-dock > button.dock-a > svg {
      width: 18px;
      height: 18px;
    }
    .bottom-dock.lux-dock-measuring,
    .bottom-dock.lux-dock-measuring > * {
      transition: none !important;
    }
    .bottom-dock.lux-dock-compact {
      width: calc(var(--lux-dock-avail, 100vw) - 16px) !important;
      max-width: calc(var(--lux-dock-avail, 100vw) - 16px) !important;
      box-sizing: border-box !important;
      padding-left: 6px !important;
      padding-right: 6px !important;
      gap: 2px !important;
      justify-content: space-between !important;
    }
    .bottom-dock.lux-dock-compact > a,
    .bottom-dock.lux-dock-compact > button.dock-a,
    .bottom-dock.lux-dock-compact > button.dock-btn {
      flex: 1 1 0 !important;
      min-width: 0 !important;
      padding-left: 1px !important;
      padding-right: 1px !important;
    }
    .bottom-dock.lux-dock-tight > a,
    .bottom-dock.lux-dock-tight > button.dock-a,
    .bottom-dock.lux-dock-tight > button.dock-btn {
      letter-spacing: 0 !important;
      font-size: 0.5rem !important;
    }
    .bottom-dock.lux-dock-icons > a > span,
    .bottom-dock.lux-dock-icons > button > span {
      display: none !important;
    }
  </style>`;
  const metaTags = data.metaTagsHtml ? `${data.metaTagsHtml}\n` : '';
  let closingStyle = '';
  let closingVideoHtml = '';
  if (data.closingPhotoUrl) {
    if (isVideoMedia(data.closingPhotoUrl)) {
      const safeClosingVideo = escapeHtmlAttr(String(data.closingPhotoUrl));
      closingVideoHtml = `<video class="lux-closing-video" loop muted playsinline webkit-playsinline preload="metadata"><source src="${safeClosingVideo}" type="video/mp4"></video>`;
      closingStyle = `\n<style>
      .lux-closing-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center bottom;
        z-index: 0;
        pointer-events: none;
      }
      .site-footer, footer, footer#footer {
        position: relative !important;
        overflow: hidden !important;
        background-image: none !important;
        color: #fff !important;
        border-top: none !important;
      }
      .site-footer::before, footer::before, footer#footer::before {
        content: '' !important;
        position: absolute !important;
        inset: 0 !important;
        background: linear-gradient(to bottom, rgba(0,0,0,0.15) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.85) 100%) !important;
        z-index: 1 !important;
        pointer-events: none !important;
        display: block !important;
      }
      .site-footer > *:not(.lux-closing-video), footer > *:not(.lux-closing-video), footer#footer > *:not(.lux-closing-video) {
        position: relative !important;
        z-index: 2 !important;
        color: #fff !important;
      }
    </style>`;
    } else {
      const safeUrl = sanitizeCssUrl(String(data.closingPhotoUrl));
      if (safeUrl) {
        closingStyle = `\n<style>
        .site-footer, footer, footer#footer {
          background-image: linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,0) 38%, rgba(0,0,0,0.55) 65%, rgba(0,0,0,0.92) 100%), url('${safeUrl}') !important;
          background-size: cover !important;
          background-position: center bottom !important;
          color: #fff !important;
          border-top: none !important;
          position: relative;
        }
        .site-footer::before, footer::before, footer#footer::before {
          display: none !important;
        }
        .site-footer *:not(.footer-initials), footer *:not(.footer-initials), footer#footer *:not(.footer-initials) {
          color: #fff !important;
        }
      </style>`;
      }
    }
  }

  // Video Background Support (Landing Cover, Landing Cover Desktop, Desktop Sidebar, Global Fixed BG)
  let videoStyles = "";
  let coverVideoHtml = "";
  let coverDesktopVideoHtml = "";
  let coverDesktopCssStyle = "";
  let sidebarVideoHtml = "";
  let fixedBgVideoHtml = "";

  if (isVideoMedia(data.landingCoverUrl)) {
    const safeCoverVideo = escapeHtmlAttr(String(data.landingCoverUrl));
    coverVideoHtml = `<video class="lux-cover-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeCoverVideo}" type="video/mp4"></video>`;
    videoStyles += `
      .lux-cover-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        z-index: 0;
        pointer-events: none;
      }
      .cover-screen, #coverScreen, .cover-overlay, #coverOverlay {
        background-image: none !important;
        overflow: hidden !important;
      }
      .cover-screen::before, #coverScreen::before, .cover-overlay::before, #coverOverlay::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(7,7,9,0.22) 0%, rgba(7,7,9,0.04) 30%, rgba(7,7,9,0.20) 65%, rgba(7,7,9,0.60) 100%);
        z-index: 1;
        pointer-events: none;
      }
      .cover-screen > *:not(.lux-cover-video), #coverScreen > *:not(.lux-cover-video), .cover-overlay > *:not(.lux-cover-video), #coverOverlay > *:not(.lux-cover-video) {
        position: relative;
        z-index: 2;
      }
      .cover-names, .cover-title {
        text-shadow: 0 4px 20px rgba(0,0,0,0.85) !important;
      }
    `;
  }

  // Desktop Cover — diinjeksikan sebagai layer kedua via @media (min-width: 900px)
  // Hanya muncul di layar desktop, TIDAK mengganggu tampilan mobile
  const hasDesktopCover = data.hasCustomCoverDesktop
    ? Boolean(data.landingCoverDesktopUrl)
    : Boolean(data.landingCoverDesktopUrl && data.landingCoverDesktopUrl !== data.landingCoverUrl);

  // Tata letak split (hero kiri + kolom isi 460 px di kanan) ditandai lebar kolom itu di CSS master. Master tanpa hero
  // kiri (satu kolom di tengah) tidak memuatnya: sampul yang dipersempit akan membuka isi undangan di belakangnya.
  const hasSplitLayout = tpl.includes("calc(100% - 460px)");
  // Master berilustrasi yang menyusun sampul mendatar sendiri (data-lux-desktop-cover="full") tampil layar penuh selama
  // klien belum mengunggah foto sampul: alasan split (foto portrait terpotong bila dilebarkan) tidak berlaku untuk
  // gambar vektor. Begitu ada foto sampul portrait, aturan split di bawah tetap berlaku.
  const illustratedFullCover = /data-lux-desktop-cover="full"/.test(tpl) && !data.landingCoverUrl;

  if (!hasDesktopCover && hasSplitLayout && !illustratedFullCover) {
    // Tanpa cover landscape, sampul HP (umumnya portrait 9:16) tampil utuh di kolom undangan 460 px, sesuai janji
    // Studio; tema tulisan tangan yang melebarkan sampul ke seluruh layar memotong foto itu. Spesifisitas :root body
    // menang atas aturan sampul master tanpa !important. left: auto + right: 0 benar untuk sampul fixed seluas layar maupun sampul absolute di dalam kolom kanan.
    coverDesktopCssStyle = `
<style id="lux-cover-desktop-split">
  @media (min-width: 900px) {
    :root body .cover-screen, :root body #coverScreen, :root body .cover-overlay, :root body #coverOverlay {
      left: auto;
      right: 0;
      width: 460px;
    }
  }
</style>`;
  } else if (hasDesktopCover) {
    if (isVideoMedia(data.landingCoverDesktopUrl)) {
      const safeDesktopVideo = escapeHtmlAttr(String(data.landingCoverDesktopUrl));
      coverDesktopVideoHtml = `<video class="lux-cover-desktop-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeDesktopVideo}" type="video/mp4"></video>`;
      videoStyles += `
      /* Desktop Cover Video (Landscape 16:9) — hanya tampil di ≥900px */
      .lux-cover-desktop-video {
        display: none;
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        z-index: 0;
        pointer-events: none;
      }
      @media (min-width: 900px) {
        /* FULLSCREEN OVERRIDE — override constraint 460px dari tema panel-terbatas */
        .cover-screen, .cover-overlay, #coverScreen, #coverOverlay {
          position: fixed !important;
          inset: 0 !important;
          width: 100vw !important;
          left: 0 !important;
          right: 0 !important;
          max-width: none !important;
        }
        .lux-cover-desktop-video {
          display: block;
        }
        /* Sembunyikan mobile cover video di desktop jika ada desktop video */
        .lux-cover-video {
          display: none;
        }
        .cover-screen, #coverScreen, .cover-overlay, #coverOverlay {
          background-image: none !important;
          overflow: hidden !important;
        }
        .cover-screen::before, #coverScreen::before, .cover-overlay::before, #coverOverlay::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(to bottom, rgba(7,7,9,0.22) 0%, rgba(7,7,9,0.04) 30%, rgba(7,7,9,0.20) 65%, rgba(7,7,9,0.60) 100%);
          z-index: 1;
          pointer-events: none;
        }
        .cover-screen > *:not(.lux-cover-desktop-video):not(.lux-cover-video), #coverScreen > *:not(.lux-cover-desktop-video):not(.lux-cover-video), .cover-overlay > *:not(.lux-cover-desktop-video):not(.lux-cover-video), #coverOverlay > *:not(.lux-cover-desktop-video):not(.lux-cover-video) {
          position: relative;
          z-index: 2;
        }
        .cover-names, .cover-title {
          text-shadow: 0 4px 20px rgba(0,0,0,0.85) !important;
        }
      }
    `;
    } else {
      // Desktop Cover Photo (Landscape) — override background-image via CSS @media
      // + FULLSCREEN OVERRIDE untuk tema yang membatasi cover ke panel kanan 460px
      const safeDesktopPhoto = sanitizeCssUrl(String(data.landingCoverDesktopUrl));
      if (safeDesktopPhoto) {
        coverDesktopCssStyle = `
<style>
  @media (min-width: 900px) {
    /* FULLSCREEN OVERRIDE — override constraint 460px dari tema panel-terbatas */
    .cover-screen, .cover-overlay, #coverScreen, #coverOverlay {
      position: fixed !important;
      inset: 0 !important;
      width: 100vw !important;
      left: 0 !important;
      right: 0 !important;
      max-width: none !important;
    }
    .cover-screen, #coverScreen {
      background-image: linear-gradient(to bottom, rgba(7,7,9,0.2) 0%, rgba(7,7,9,0.0) 25%, rgba(7,7,9,0.55) 60%, rgba(7,7,9,0.92) 100%), url('${safeDesktopPhoto}') !important;
      background-size: cover !important;
      background-position: center center !important;
      background-repeat: no-repeat !important;
    }
    .cover-overlay, #coverOverlay {
      background-image: linear-gradient(to bottom, rgba(7,7,9,0.2) 0%, rgba(7,7,9,0.0) 25%, rgba(7,7,9,0.55) 60%, rgba(7,7,9,0.92) 100%), url('${safeDesktopPhoto}') !important;
      background-size: cover !important;
      background-position: center center !important;
      background-repeat: no-repeat !important;
    }
    /* Video sampul HP (absolute, inset 0) menutupi foto latar ini di desktop bila tidak disembunyikan. */
    .lux-cover-video {
      display: none !important;
    }
    .cover-names, .cover-title {
      text-shadow: 0 4px 20px rgba(0,0,0,0.85) !important;
    }
  }
</style>`;
      }
    }
  }

  if (isVideoMedia(data.sidebarPhotoUrl)) {
    const safeSidebarVideo = escapeHtmlAttr(String(data.sidebarPhotoUrl));
    sidebarVideoHtml = `<video class="lux-sidebar-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeSidebarVideo}" type="video/mp4"></video>`;
    videoStyles += `
      .lux-sidebar-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        z-index: 1;
        pointer-events: none;
      }
      .left-hero {
        background-image: none !important;
        overflow: hidden !important;
      }
      .left-hero::after {
        z-index: 2 !important;
        background: linear-gradient(to top, rgba(7,7,9,0.65) 0%, rgba(7,7,9,0.10) 45%, transparent 100%) !important;
      }
      .left-hero-content {
        z-index: 3 !important;
      }
    `;
  }

  if (isVideoMedia(data.globalBgUrl)) {
    const safeFixedBgVideo = escapeHtmlAttr(String(data.globalBgUrl));
    fixedBgVideoHtml = `<video class="lux-fixed-bg-video" autoplay loop muted playsinline webkit-playsinline preload="auto"><source src="${safeFixedBgVideo}" type="video/mp4"></video><div class="lux-fixed-bg-scrim"></div>`;
    videoStyles += `
      .lux-fixed-bg-video {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        object-fit: cover;
        object-position: center center;
        z-index: 0;
        pointer-events: none;
      }
      .lux-fixed-bg-scrim {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: linear-gradient(to bottom, rgba(7,7,9,0.55) 0%, rgba(7,7,9,0.38) 35%, rgba(7,7,9,0.70) 100%);
        z-index: 1;
        pointer-events: none;
      }
      @media (min-width: 900px) {
        .lux-fixed-bg-video {
          left: calc(100% - 460px) !important;
          width: 460px !important;
          right: 0 !important;
        }
        .lux-fixed-bg-scrim {
          left: calc(100% - 460px) !important;
          width: 460px !important;
          right: 0 !important;
        }
      }
      .right-panel, .page-wrap, .main-scroll-panel {
        position: relative;
        z-index: 2;
        padding-bottom: 0 !important;
      }
      .fixed-bg-layer, .theme-fixed-bg {
        background-image: none !important;
      }
    `;
  }

  let homeVideoHtml = "";
  // Master yang menempatkan foto Home sendiri (bingkai, lengkungan, potret) tidak boleh mendapat salinan kedua sebagai
  // latar penuh section#home. Bila slotnya video, <img src="{{homePhotoUrl}}"> diganti video di tempat yang sama.
  const homePhotoPlacedByTemplate = /\{\{\s*homePhotoUrl\s*\}\}/.test(tpl);
  if (homePhotoPlacedByTemplate && data.hasCustomHomePhoto && isVideoMedia(data.homePhotoUrl)) {
    const safeInlineHomeVideo = escapeHtmlAttr(String(data.homePhotoUrl));
    tpl = tpl.replace(
      /<img\b[^>]*\bsrc="\{\{\s*homePhotoUrl\s*\}\}"[^>]*>/gi,
      `<video class="lux-home-video lux-home-video-inline" loop muted playsinline webkit-playsinline preload="auto" src="${safeInlineHomeVideo}"></video>`
    );
    videoStyles += `
      .lux-home-video-inline {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    `;
  }
  if (data.hasCustomHomePhoto && data.homePhotoUrl && !homePhotoPlacedByTemplate) {
    if (isVideoMedia(data.homePhotoUrl)) {
      const safeHomeVideo = escapeHtmlAttr(String(data.homePhotoUrl));
      homeVideoHtml = `<video class="lux-home-video" loop muted playsinline webkit-playsinline preload="auto"><source src="${safeHomeVideo}" type="video/mp4"></video>`;
      videoStyles += `
      .lux-home-video {
        position: absolute;
        inset: 0;
        width: 100%;
        height: 100%;
        object-fit: cover;
        object-position: center center;
        z-index: 0;
        pointer-events: none;
      }
      .slide-opening#home, section#home.slide-opening, section#home, .sec-hero-slideshow#home {
        position: relative !important;
        overflow: hidden !important;
        background-image: none !important;
      }
      .slide-opening#home::before, section#home::before, .sec-hero-slideshow#home::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(to bottom, rgba(7,7,9,0.55) 0%, rgba(7,7,9,0.35) 40%, rgba(7,7,9,0.80) 100%);
        z-index: 1;
        pointer-events: none;
      }
      .slide-opening#home > *:not(.lux-home-video), section#home > *:not(.lux-home-video), .sec-hero-slideshow#home > *:not(.lux-home-video) {
        position: relative;
        z-index: 2;
      }
      `;
    } else {
      const safeHomePhoto = sanitizeCssUrl(String(data.homePhotoUrl));
      if (safeHomePhoto) {
        videoStyles += `
        .slide-opening#home, section#home.slide-opening, section#home, .sec-hero-slideshow#home {
          background-image: linear-gradient(to bottom, rgba(7,7,9,0.55) 0%, rgba(7,7,9,0.35) 40%, rgba(7,7,9,0.80) 100%), url('${safeHomePhoto}') !important;
          background-size: cover !important;
          background-position: center center !important;
          background-repeat: no-repeat !important;
        }
        `;
      }
    }
  }

  const combinedVideoStyle = videoStyles ? `\n<style>\n${videoStyles}\n</style>` : "";

  if (coverVideoHtml) {
    tpl = tpl.replace(/(<div[^>]*class="[^"]*\b(cover-screen|cover-overlay)\b[^"]*"[^>]*>)/i, `$1\n    ${coverVideoHtml}`);
  }
  // Inject desktop cover video AFTER mobile cover video (layered inside cover-screen)
  if (coverDesktopVideoHtml) {
    tpl = tpl.replace(/(<div[^>]*class="[^"]*\b(cover-screen|cover-overlay)\b[^"]*"[^>]*>)/i, `$1\n    ${coverDesktopVideoHtml}`);
  }
  // Inject desktop cover CSS (foto landscape) sebelum closing </head>
  if (coverDesktopCssStyle) {
    tpl = tpl.replace(/(<\/head>)/i, `${coverDesktopCssStyle}\n$1`);
  }
  tpl = tpl.replace(/(<\/head>)/i, `${DESKTOP_CONTAINMENT_STYLE}\n$1`);
  if (sidebarVideoHtml) {
    tpl = tpl.replace(/(<div[^>]*class="[^"]*\bleft-hero\b[^"]*"[^>]*>)/i, `$1\n    ${sidebarVideoHtml}`);
  }
  if (fixedBgVideoHtml) {
    tpl = tpl.replace(/(<body[^>]*>)/i, `$1\n  ${fixedBgVideoHtml}`);
  }
  // Disisipkan saat render (bukan ke piring), agar pengaturan kecerahan dari Studio langsung berlaku.
  const bgPhotoToneRule = data.globalBgUrl ? bgPhotoToneCss(data.featureSettings?.bgPhotoTone) : "";
  if (bgPhotoToneRule) {
    tpl = tpl.replace(/(<\/head>)/i, `<style id="${BG_PHOTO_TONE_STYLE_ID}">${bgPhotoToneRule}</style>\n$1`);
  }
  const bgScrim = data.globalBgUrl ? parseBgScrim(data.featureSettings?.bgScrim) : null;
  if (bgScrim !== null) {
    const script = bgScrimScript(bgScrim);
    tpl = /<\/body>/i.test(tpl) ? tpl.replace(/(<\/body>)(?![\s\S]*<\/body>)/i, `${script}\n$1`) : tpl + script;
  }
  if (homeVideoHtml) {
    tpl = tpl.replace(/(<section[^>]*id="home"[^>]*>|<div[^>]*class="[^"]*\bslide-opening\b[^"]*"[^>]*>)/i, `$1\n    ${homeVideoHtml}`);
  }
  if (closingVideoHtml) {
    tpl = tpl.replace(/(<footer[^>]*>|<div[^>]*class="[^"]*\bsite-footer\b[^"]*"[^>]*>)/i, `$1\n    ${closingVideoHtml}`);
  }

  // --- PRELOADER INJECTION (HYBRID ARCHITECTURE) ---
  // If master template already defines id="themePreloader", honor it and skip injecting fallback.
  // Otherwise, automatically inject the luxury Universal Obsidian & Shimmer Preloader.
  const hasCustomPreloader = tpl.includes('id="themePreloader"');
  let preloaderStyles = `
<style id="luxPreloaderGlobalStyle">
  .preloader-hidden {
    opacity: 0 !important;
    visibility: hidden !important;
    pointer-events: none !important;
    transition: opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.45s cubic-bezier(0.16, 1, 0.3, 1) !important;
  }
</style>
`;
  let universalPreloaderHtml = "";

  if (!hasCustomPreloader) {
    const rawEventType = String(
      options?.eventType ||
      data?.eventType ||
      info?.eventType ||
      "WEDDING"
    ).toUpperCase().trim();

    const isNonWedding = rawEventType === "PERSONAL" || rawEventType === "EVENT";

    let defaultTagline = "THE WEDDING INVITATION";
    if (rawEventType === "PERSONAL") {
      defaultTagline = String(data?.weddingTagline || data?.eventLabel || "PERSONAL INVITATION").toUpperCase();
    } else if (rawEventType === "EVENT") {
      defaultTagline = String(data?.weddingTagline || data?.eventLabel || "EXCLUSIVE INVITATION").toUpperCase();
    }

    const preloaderTagline = escapeHtmlAttr(
      String(
        data.featureSettings?.customLabels?.theWedding ||
        data.customLabels?.theWedding ||
        data.featureSettings?.customLabels?.preloaderTagline ||
        data.customLabels?.preloaderTagline ||
        defaultTagline
      )
    );

    // Monogram: Prioritaskan monogramInitial eksplisit dari data
    let monogramText = "";
    if (data.monogramInitial && String(data.monogramInitial).trim()) {
      monogramText = escapeHtmlAttr(String(data.monogramInitial).trim());
    } else {
      const firstInitial = escapeHtmlAttr(
        String(
          data.firstInitial ||
          (data.firstName ? String(data.firstName).trim().charAt(0).toUpperCase() : "") ||
          (data.personName ? String(data.personName).trim().charAt(0).toUpperCase() : "") ||
          (data.personNickname ? String(data.personNickname).trim().charAt(0).toUpperCase() : "") ||
          (data.mainName ? String(data.mainName).trim().charAt(0).toUpperCase() : "") ||
          (data.eventTitle ? String(data.eventTitle).trim().charAt(0).toUpperCase() : "") ||
          (data.groomName ? String(data.groomName).trim().charAt(0).toUpperCase() : "") ||
          "L"
        )
      );

      const rawSecondInitial = (
        data.secondInitial ||
        (data.secondName ? String(data.secondName).trim().charAt(0).toUpperCase() : "") ||
        (data.brideName ? String(data.brideName).trim().charAt(0).toUpperCase() : "") ||
        ""
      );
      const secondInitial = rawSecondInitial ? escapeHtmlAttr(String(rawSecondInitial)) : "";

      if (isNonWedding) {
        monogramText = secondInitial ? `${firstInitial} &amp; ${secondInitial}` : firstInitial;
      } else {
        monogramText = secondInitial ? `${firstInitial} &amp; ${secondInitial}` : `${firstInitial}`;
      }
    }

    preloaderStyles += `
<style id="luxUniversalPreloaderStyle">
  #themePreloader.lux-universal-preloader {
    position: fixed;
    inset: 0;
    width: 100vw;
    height: 100vh;
    height: 100dvh;
    background-color: #0c0c0e;
    z-index: 999999;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    pointer-events: auto;
    transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), visibility 0.6s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .lux-preloader-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
    max-width: 90vw;
  }
  .lux-preloader-badge {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 9px;
    letter-spacing: 0.32em;
    text-transform: uppercase;
    color: rgba(212, 175, 55, 0.75);
    margin-bottom: 14px;
    font-weight: 500;
  }
  .lux-preloader-monogram {
    font-family: Didot, "Bodoni MT", "Cinzel", "Times New Roman", Georgia, serif;
    font-size: clamp(2.4rem, 8vw, 3.4rem);
    font-weight: 400;
    letter-spacing: 0.12em;
    color: #f6e8cc;
    text-shadow: 0 2px 24px rgba(212, 175, 55, 0.28);
    line-height: 1;
    margin: 8px 0 24px;
  }
  .lux-preloader-track {
    width: 140px;
    height: 1.5px;
    background: rgba(255, 255, 255, 0.1);
    position: relative;
    overflow: hidden;
    border-radius: 2px;
  }
  .lux-preloader-bar {
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, #d4af37, #fdf6e2, transparent);
    animation: luxPreloadShimmer 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1);
  }
  @keyframes luxPreloadShimmer {
    0% { left: -100%; }
    100% { left: 100%; }
  }
  .cover-screen, #coverScreen, .screen-cover, #coverOverlay {
    background-color: #0c0c0e !important;
  }
</style>
`;

    universalPreloaderHtml = `
<div id="themePreloader" class="lux-universal-preloader" aria-label="Loading Invitation">
  <div class="lux-preloader-inner">
    <div class="lux-preloader-badge">${preloaderTagline}</div>
    <div class="lux-preloader-monogram">${monogramText}</div>
    <div class="lux-preloader-track" aria-hidden="true">
      <div class="lux-preloader-bar"></div>
    </div>
  </div>
</div>
`;
  }

  // Pre-seed body with lux-at-home-zone for zero-FOUC clean Home screen
  if (!tpl.includes("lux-at-home-zone")) {
    if (tpl.match(/<body\b([^>]*)class=(["'])([^"']*)\2/i)) {
      tpl = tpl.replace(/<body\b([^>]*)class=(["'])([^"']*)\2/i, '<body$1class=$2$3 lux-at-home-zone$2');
    } else if (tpl.match(/<body\b/i)) {
      tpl = tpl.replace(/<body\b/i, '<body class="lux-at-home-zone"');
    }
  }

  if (universalPreloaderHtml) {
    if (tpl.match(/(<body[^>]*>)/i)) {
      tpl = tpl.replace(/(<body[^>]*>)/i, `$1\n  ${universalPreloaderHtml}`);
    } else {
      tpl = universalPreloaderHtml + tpl;
    }
  }

  // Strip any existing static/template <title> if dynamic metaTags supplies a <title> to prevent duplicate tags or theme name leaks
  if (metaTags && /<title\b[^>]*>/i.test(metaTags)) {
    tpl = tpl.replace(/<title\b[^>]*>[\s\S]*?<\/title>\s*/gi, "");
  }

  if (tpl.includes("<head>")) {
    tpl = tpl.replace("<head>", `<head>\n${metaTags}${HEAD_AUDIO_BLOCKER_SCRIPT}\n${GLOBAL_MODULES_CSS}${closingStyle}${combinedVideoStyle}${preloaderStyles}`);
  } else if (tpl.includes("<HEAD>")) {
    tpl = tpl.replace("<HEAD>", `<HEAD>\n${metaTags}${HEAD_AUDIO_BLOCKER_SCRIPT}\n${GLOBAL_MODULES_CSS}${closingStyle}${combinedVideoStyle}${preloaderStyles}`);
  }

  const protectionScript = !tpl.includes("LUXENARY PROTECTION SCRIPT") ? LUXENARY_PROTECTION_SCRIPT : "";
  const injectedScripts = `${UNIFIED_CLIENT_RUNTIME_SCRIPT}\n${AUTOPLAY_SHOWCASE_SCRIPT}\n${protectionScript}\n${options?.editMode || data.__editMode ? INLINE_LIVE_EDITOR_SCRIPT : ""}`;

  if (tpl.includes("</body>")) {
    tpl = tpl.replace("</body>", `${injectedScripts}\n</body>`);
  } else {
    tpl += injectedScripts;
  }

  // Universal Wedding Vendors Section Auto-Placement (if not explicitly declared in template)
  if (data.vendorsSectionHtml && !tpl.includes("{{vendorsSectionHtml}}") && !tpl.includes('id="section-vendors"')) {
    if (tpl.includes("<footer")) {
      tpl = tpl.replace("<footer", `${data.vendorsSectionHtml}\n    <footer`);
    } else if (tpl.includes("<FOOTER")) {
      tpl = tpl.replace("<FOOTER", `${data.vendorsSectionHtml}\n    <FOOTER`);
    }
  }

  // Master pernikahan menulis "&amp;" literal di antara {{firstFather}} dan {{firstMother}}; bila salah satu kosong,
  // tamu melihat "&" yatim. Pemisah diganti token yang hanya terisi bila kedua nama ada (berlaku juga untuk piring lama).
  if ("firstParentsJoinHtml" in data) {
    tpl = tpl.replace(
      /(\{\{\s*(first|second)Father\s*\}\}(?:\s*<\/strong>)?)\s*&amp;\s*((?:<strong\b[^>]*>\s*)?\{\{\s*\2Mother\s*\}\})/g,
      "$1{{$2ParentsJoinHtml}}$3"
    );
  }

  // Conditional Template Blocks: recursively process innermost {{#if ...}} ... {{/if}} first
  const ifRegex = /\{[\s\n]*\{[\s\n]*#if\s+([\w.]+)[\s\n]*\}[\s\n]*\}((?:(?!\{[\s\n]*\{[\s\n]*#if\b)[\s\S])*?)\{[\s\n]*\{[\s\n]*\/if[\s\n]*\}[\s\n]*\}/i;
  let ifMatch;
  // Setiap putaran membuang satu blok, jadi batas ini hanya pengaman. Batas 25 (sampai 18 Nov 2026) adalah jumlah blok per
  // halaman, bukan kedalaman: master + suntingan Editor Master yang melewatinya meninggalkan `{{#if ...}}` mentah di halaman.
  let maxIfDepth = 2000;
  while ((ifMatch = ifRegex.exec(tpl)) !== null && maxIfDepth-- > 0) {
    const key = ifMatch[1];
    const innerContent = ifMatch[2];
    let val = data[key];
    if (val === undefined && key.includes(".")) {
      const parts = key.split(".");
      let curr: any = data;
      for (const p of parts) {
        if (curr && typeof curr === "object") {
          curr = curr[p];
        } else {
          curr = undefined;
          break;
        }
      }
      val = curr;
    }
    const isTruthy = Boolean(val && val !== "false" && val !== "0" && val !== 0);
    tpl = tpl.replace(ifMatch[0], isTruthy ? innerContent : "");
  }

  // Conditional Template Blocks: recursively process innermost {{#unless ...}} ... {{/unless}} first
  const unlessRegex = /\{[\s\n]*\{[\s\n]*#unless\s+([\w.]+)[\s\n]*\}[\s\n]*\}((?:(?!\{[\s\n]*\{[\s\n]*#unless\b)[\s\S])*?)\{[\s\n]*\{[\s\n]*\/unless[\s\n]*\}[\s\n]*\}/i;
  let unlessMatch;
  let maxUnlessDepth = 2000;
  while ((unlessMatch = unlessRegex.exec(tpl)) !== null && maxUnlessDepth-- > 0) {
    const key = unlessMatch[1];
    const innerContent = unlessMatch[2];
    let val = data[key];
    if (val === undefined && key.includes(".")) {
      const parts = key.split(".");
      let curr: any = data;
      for (const p of parts) {
        if (curr && typeof curr === "object") {
          curr = curr[p];
        } else {
          curr = undefined;
          break;
        }
      }
      val = curr;
    }
    const isTruthy = Boolean(val && val !== "false" && val !== "0" && val !== 0);
    tpl = tpl.replace(unlessMatch[0], !isTruthy ? innerContent : "");
  }

  const RAW_HTML_KEY_REGEX = /(Html|html|Svg|svg|Style|Styles|Css|css|Script|Scripts)$/;
  const URL_KEY_REGEX = /(Url|url|Src|src|Link|link)$/;
  // Teks klien yang boleh berbaris banyak: di-escape di sini lalu baris barunya dijadikan <br />. Composer mengirim teks
  // polos; dulu composer mengirim hasil nl2br yang lalu di-escape ulang, sehingga "<br />" tercetak sebagai teks.
  const MULTILINE_TEXT_KEYS = new Set(["openingQuote", "closingQuote"]);
  // Master yang sudah memiliki seksi #story native ({{storyItemsHtml}} / {{storySectionHtml}}) tidak boleh menggandakan
  // blok #story yang dibangkitkan oleh buildUniversalExtraSections di dalam {{extraSectionsHtml}}.
  const templateHasNativeStory = /\{\{\s*(?:storyItemsHtml|storySectionHtml)\s*\}\}/.test(tpl);

  tpl = tpl.replace(/\{[\s\n]*\{[\s\n]*([\w.]+)[\s\n]*\}[\s\n]*\}/g, (_, key: string) => {
    let val = data[key];
    if (key === "extraSectionsHtml" && templateHasNativeStory && typeof val === "string") {
      val = val.replace(/<section\b[^>]*\bid="story"[^>]*>[\s\S]*?<\/section>/gi, "");
    }
    if (val === undefined && key.includes(".")) {
      const parts = key.split(".");
      let curr: any = data;
      for (const p of parts) {
        if (curr && typeof curr === "object") {
          curr = curr[p];
        } else {
          curr = undefined;
          break;
        }
      }
      val = curr;
    }
    if (val === undefined || val === null) return "";

    // Key yang secara eksplisit berisi blok HTML/CSS/Script pre-rendered tidak di-escape
    if (RAW_HTML_KEY_REGEX.test(key)) {
      return String(val);
    }

    // Key URL disisipkan ke atribut HTML, url() CSS, dan string JS sekaligus, sehingga escape entitas HTML tidak cocok
    // (merusak "&" di string JS). Karakter pemutus konteks dan karakter kontrol di-percent-encode: URL sah tetap valid,
    // tetapi nilai seperti `x" onerror="...` tidak dapat keluar dari atribut, dan skema tidak dapat disamarkan.
    if (URL_KEY_REGEX.test(key)) {
      const strVal = String(val).trim();
      if (/^javascript:/i.test(strVal) || /^data:(?!image\/)/i.test(strVal)) {
        return "";
      }
      return strVal.replace(/[\u0000- \u007F"'<>`\\]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0")}`);
    }

    if (MULTILINE_TEXT_KEYS.has(key)) {
      return escapeHtmlSafe(String(val)).replace(/\r\n|\r|\n/g, "<br />");
    }

    // Seluruh field teks pengguna di-escape untuk proteksi mutlak dari Stored XSS
    return escapeHtmlSafe(String(val));
  });

  // Tombol Instagram tanpa handle (sebagian master tidak membungkusnya dengan {{#if}}) tampil sebagai "@" menuju
  // instagram.com; tombol dengan href kosong itu dibuang.
  tpl = tpl.replace(/<a\b[^>]*\bhref="https?:\/\/(?:www\.)?instagram\.com\/?"[^>]*>[\s\S]*?<\/a>/gi, "");

  // Label kustom disisipkan setelah placeholder diganti, agar seksi buatan engine ({{rsvpSectionHtml}}, galeri, kado,
  // dan seluruh seksi tema satu nama) ikut memakai label klien, bukan hanya elemen yang tertulis di master.
  const customLabels = data.featureSettings?.customLabels || data.customLabels || {};
  tpl = stripEmptyMediaRefs(tpl);
  if (data.invitationLocale === "en") {
    tpl = tpl.replace(/<html\b([^>]*)\blang=(["'])id\2/i, "<html$1lang=$2en$2");
  }
  return tpl.replace(
    /<([a-zA-Z0-9]+)\b([^>]*data-lux-field="customLabels\.([^"]+)"[^>]*)>([\s\S]*?)<\/\1>/gi,
    (match, tagName, attrs, labelKey, innerContent) => {
      const val = customLabels[labelKey];
      if (val !== undefined && val !== null) {
        if (val === "") {
          return `<${tagName}${attrs}></${tagName}>`;
        }
        const svgMatch = innerContent.match(/<svg[\s\S]*?<\/svg>/i);
        const svgPrefix = svgMatch ? `${svgMatch[0]} ` : "";
        return `<${tagName}${attrs}>${svgPrefix}${escapeHtmlAttr(String(val))}</${tagName}>`;
      }
      return match;
    }
  );
}

