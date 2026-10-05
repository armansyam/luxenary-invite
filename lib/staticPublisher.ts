import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";
import { getAdminSetting } from "@/lib/settings";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import { publishedHtmlCache } from "@/lib/cache";
import { escapeHtml } from "@/lib/escapeHtml";
import { logger } from "@/lib/logger";

const PUBLISHED_DIR = path.join(process.cwd(), "public", "published");



/**
 * Ensures the target published storage directory and its category subfolders exist.
 */
async function ensurePublishedDir() {
  try {
    await fs.promises.access(PUBLISHED_DIR);
  } catch {
    await fs.promises.mkdir(PUBLISHED_DIR, { recursive: true });
  }
  
  const idsDir = path.join(PUBLISHED_DIR, "ids");
  try { await fs.promises.access(idsDir); } catch { await fs.promises.mkdir(idsDir, { recursive: true }); }
}

/**
 * Returns the absolute filepath for an invitation's standalone published HTML.
 */
export async function getPublishedFilePath(invitationId: string, _category?: string): Promise<string> {
  await ensurePublishedDir();
  return path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
}

/**
 * Checks if a standalone published HTML file exists for this invitation.
 */
export async function hasPublishedHtml(invitationId: string, _category?: string): Promise<boolean> {
  const p = path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
  try {
    await fs.promises.access(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the standalone published HTML file content.
 */
export async function getPublishedHtml(invitationId: string, _category?: string): Promise<string | null> {
  // L1 Memory Cache: respons instan <0.05ms tanpa I/O disk saat lonjakan tamu
  const cached = publishedHtmlCache.get(invitationId);
  if (cached) return cached;

  const p = path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
  try {
    await fs.promises.access(p);
    const content = await fs.promises.readFile(p, "utf-8");
    publishedHtmlCache.set(invitationId, content);
    return content;
  } catch {
    return null;
  }
}

export async function buildAndSavePublishedHtml(invitationId: string): Promise<string | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) return null;

  const data = await composeTemplateData(invitation.id);
  if (!data) return null;


  // 1. Generate Meta Tags (Generic to Event, No Guest Name)
  const isWedding = !invitation.eventType || invitation.eventType === "WEDDING";
  const displayName = resolveInvitationDisplayName(invitation);
  const title = (data as any).calendarTitle || (isWedding ? `The Wedding of ${displayName}` : displayName);
  const description = isWedding
    ? `Kami mengundang Anda untuk hadir di hari bahagia pernikahan kami.`
    : `Kami mengundang Anda untuk hadir di acara ${displayName}.`;
  
  const coverMedia = await prisma.invitationMedia.findFirst({
    where: { 
      invitationId: invitation.id, 
      mediaSlot: { in: ["LANDING_COVER", "LANDING_COVER_DESKTOP", "HOME_PHOTO", "DESKTOP_SIDEBAR", "GROOM_PHOTO", "BRIDE_PHOTO"] as any } 
    },
    orderBy: { createdAt: "desc" },
  });
  
  const siteOrigin = (process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "http://localhost:3000")).replace(/\/$/, "");
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");
  const rawImage = coverMedia?.localPath || (data as any).landingCoverUrl || (data as any).sidebarPhotoUrl || (data as any).heroPhotoUrl || "/assets/brand/og-banner.png";
  const absoluteImageUrl = rawImage.startsWith("http") ? rawImage : `${siteOrigin}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

  const safeTitle = escapeHtml(title);
  const safeDescription = escapeHtml(description);
  const safePlatformName = escapeHtml(platformName);
  const safeImageUrl = escapeHtml(absoluteImageUrl);

  const metaTagsHtml = `
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>${safeTitle}</title>
    <meta name="description" content="${safeDescription}">
    <meta property="og:site_name" content="${safePlatformName}">
    <meta property="og:title" content="${safeTitle}">
    <meta property="og:description" content="${safeDescription}">
    <meta property="og:image" content="${safeImageUrl}">
    <meta property="og:image:secure_url" content="${safeImageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${safeTitle}">
    <meta name="twitter:description" content="${safeDescription}">
    <meta name="twitter:image" content="${safeImageUrl}">
  `;
  
  (data as any).metaTagsHtml = metaTagsHtml;

  if (!invitation.themeId) {
    throw new Error("Gagal mempublikasikan undangan: Desain tema belum dipilih. Silakan pilih tema di Studio Editor terlebih dahulu.");
  }

  // Render standalone HTML without edit controls (menggunakan Piring draft jika ada)
  const standaloneHtml = await renderTemplateFile(invitation.themeId, data, { editMode: false, invitationId: invitation.id });

  await ensurePublishedDir();

  // Hanya simpan 1 file sumber kebenaran (Single Source of Truth) berdasarkan ID
  const masterPath = path.join(PUBLISHED_DIR, "ids", `${invitation.id}.html`);
  await fs.promises.writeFile(masterPath, standaloneHtml, "utf-8");

  // Sinkronkan ke L1 Memory Cache secara instan
  publishedHtmlCache.set(invitation.id, standaloneHtml);

  logger.info("StaticPublisher", "HTML undangan dibangun", { path: masterPath, sizeKB: Number((standaloneHtml.length / 1024).toFixed(1)) });

  // Sinkronisasi non-blocking ke arsip NAS jika fitur diaktifkan
  import("./nasArchive").then(({ syncInvitationToNasArchive }) => {
    syncInvitationToNasArchive(invitationId).catch((err) => {
      logger.warn("StaticPublisher", "Sinkronisasi arsip NAS gagal", { invitationId, error: err instanceof Error ? err.message : String(err) });
    });
  }).catch((err) => logger.error("StaticPublisher", "Modul arsip NAS gagal dimuat", err));

  return standaloneHtml;
}

/**
 * Deletes the standalone published HTML file.
 */
export async function deletePublishedHtml(invitationId: string): Promise<boolean> {
  let deleted = false;

  // Invalidate dari L1 Memory Cache
  publishedHtmlCache.delete(invitationId);

  // Hapus file ID master (Single Source of Truth)
  const idPath = path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
  try {
    await fs.promises.unlink(idPath);
    deleted = true;
  } catch (err) {
    // Berkas yang memang belum pernah dibangun bukan masalah; galat lain (izin, I/O) dicatat.
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      logger.warn("StaticPublisher", "Gagal menghapus HTML terbit", { invitationId, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return deleted;
}

