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
import { bumpRenderVersion, currentRenderVersion, publishedVersionKey, splitVersionMarker, withVersionMarker, writeFileAtomic } from "@/lib/renderVersion";
import { syncSharedFiles } from "@/lib/sharedFiles";
import { resolvePublicAppOrigin } from "@/lib/domainUtils";

const PUBLISHED_DIR = path.join(process.cwd(), "public", "published");
const publishedPath = (invitationId: string) => path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);

/** Berkas HTML terbit di disk server ini beserta versi saat dibangun (null untuk berkas sebelum penanda versi ada). */
export async function readPublishedHtml(invitationId: string): Promise<{ html: string; version: number | null } | null> {
  const p = publishedPath(invitationId);
  // Cache memori hanya menghemat pembacaan berkas. Berkas di disk adalah sumber kebenaran: worker PM2 lain yang
  // membangun ulang hanya memperbarui cache-nya sendiri, jadi tanpa cek mtime worker ini menyajikan HTML lama.
  let mtimeMs: number;
  try {
    mtimeMs = (await fs.promises.stat(p)).mtimeMs;
  } catch {
    publishedHtmlCache.delete(invitationId);
    return null;
  }
  const cached = publishedHtmlCache.get(invitationId);
  if (cached && cached.mtimeMs === mtimeMs) return { html: cached.html, version: cached.version };

  try {
    const { html, version } = splitVersionMarker(await fs.promises.readFile(p, "utf-8"));
    publishedHtmlCache.set(invitationId, { html, version, mtimeMs });
    return { html, version };
  } catch {
    return null;
  }
}

/**
 * HTML terbit untuk tamu. Server lain mungkin sudah menerbitkan ulang undangan ini (versi di DB naik); berkas di disk
 * server ini yang bertanda versi lain dibangun ulang dari DB tanpa menaikkan versi lagi.
 */
export async function servePublishedHtml(invitationId: string): Promise<string | null> {
  const version = await currentRenderVersion(publishedVersionKey(invitationId));
  const file = await readPublishedHtml(invitationId);
  if (file && file.version === version) return file.html;
  return savePublishedHtml(invitationId, version);
}

/** HTML terbit tanpa menyimpannya; `includeRsvps: false` dan `includeGift: false` untuk salinan portofolio. */
export async function renderPublishedHtml(
  invitationId: string,
  { includeRsvps = true, includeGift = true }: { includeRsvps?: boolean; includeGift?: boolean } = {},
): Promise<string | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) return null;

  const data = await composeTemplateData(invitation.id, { includeRsvps, includeGift });
  if (!data) return null;


  // 1. Generate Meta Tags (Generic to Event, No Guest Name)
  const isWedding = !invitation.eventType || invitation.eventType === "WEDDING";
  const displayName = resolveInvitationDisplayName(invitation);
  const title = (data as any).calendarTitle || (isWedding ? `The Wedding of ${displayName}` : displayName);
  const description = isWedding
    ? `Kami mengundang Anda untuk hadir di hari bahagia pernikahan kami.`
    : `Kami mengundang Anda untuk hadir di acara ${displayName}.`;
  
  const ogSlotPriority = ["LANDING_COVER", "LANDING_COVER_DESKTOP", "HOME_PHOTO", "DESKTOP_SIDEBAR", "PROFILE_PHOTO", "EVENT_PHOTO", "GROOM_PHOTO", "BRIDE_PHOTO"];
  const ogCandidates = await prisma.invitationMedia.findMany({
    where: { invitationId: invitation.id, mediaSlot: { in: ogSlotPriority as any } },
    orderBy: { createdAt: "desc" },
  });
  // Urutan daftar adalah prioritas pratinjau tautan: sampul lebih dulu, foto mempelai hanya bila sampul tidak ada.
  // Sebelumnya unggahan terbaru yang menang, sehingga pratinjau WhatsApp bergantung pada urutan unggah klien.
  const coverMedia = ogSlotPriority.map((slot) => ogCandidates.find((m) => m.mediaSlot === slot)).find(Boolean);
  
  const siteOrigin = resolvePublicAppOrigin();
  const platformName = await getAdminSetting("platform_name", "Platform Undangan");
  const rawImage = coverMedia?.localPath || (data as any).landingCoverUrl || (data as any).sidebarPhotoUrl || (data as any).heroPhotoUrl || "/assets/brand/og-banner.jpg";
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
  return renderTemplateFile(invitation.themeId, data, { editMode: false, invitationId: invitation.id });
}

async function savePublishedHtml(invitationId: string, version: number): Promise<string | null> {
  await syncSharedFiles({ force: true });
  const standaloneHtml = await renderPublishedHtml(invitationId);
  if (standaloneHtml === null) return null;

  const masterPath = publishedPath(invitationId);
  await writeFileAtomic(masterPath, withVersionMarker(standaloneHtml, version));
  publishedHtmlCache.set(invitationId, { html: standaloneHtml, version, mtimeMs: (await fs.promises.stat(masterPath)).mtimeMs });

  logger.info("StaticPublisher", "HTML undangan dibangun", { path: masterPath, version, sizeKB: Number((standaloneHtml.length / 1024).toFixed(1)) });
  return standaloneHtml;
}

/** Dipanggil setelah data undangan berubah: menaikkan versi agar server lain membangun ulang salinannya. */
export async function buildAndSavePublishedHtml(invitationId: string): Promise<string | null> {
  const version = await bumpRenderVersion(publishedVersionKey(invitationId));
  const standaloneHtml = await savePublishedHtml(invitationId, version);
  if (standaloneHtml === null) return null;

  // Sinkronisasi non-blocking ke arsip NAS jika fitur diaktifkan
  const archiveSync = import("./nasArchive").then(({ syncInvitationToNasArchive }) =>
    syncInvitationToNasArchive(invitationId).catch((err) => {
      logger.warn("StaticPublisher", "Sinkronisasi arsip NAS gagal", { invitationId, error: err instanceof Error ? err.message : String(err) });
    })
  ).catch((err) => logger.error("StaticPublisher", "Modul arsip NAS gagal dimuat", err));
  pendingArchiveSyncs.add(archiveSync);
  void archiveSync.finally(() => pendingArchiveSyncs.delete(archiveSync));

  return standaloneHtml;
}

const pendingArchiveSyncs = new Set<Promise<unknown>>();

/** Skrip CLI wajib menunggu ini sebelum menutup pool DB; tanpa itu sinkron arsip terakhir gagal "Cannot use a pool after calling end". */
export async function waitForPendingArchiveSyncs(): Promise<void> {
  await Promise.allSettled([...pendingArchiveSyncs]);
}

/**
 * Deletes the standalone published HTML file.
 */
export async function deletePublishedHtml(invitationId: string): Promise<boolean> {
  let deleted = false;

  publishedHtmlCache.delete(invitationId);
  // Salinan di server lain ikut basi; rute publik juga memeriksa status undangan sebelum menyajikannya.
  await bumpRenderVersion(publishedVersionKey(invitationId));

  const idPath = publishedPath(invitationId);
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

