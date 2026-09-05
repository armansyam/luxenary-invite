import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

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
  const p = path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
  try {
    await fs.promises.access(p);
    return await fs.promises.readFile(p, "utf-8");
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


  // 1. Generate Meta Tags (Generic to Couple, No Guest Name)
  const coupleName = `${invitation.groomNickname || invitation.groomName || "Groom"} & ${invitation.brideNickname || invitation.brideName || "Bride"}`;
  const title = `The Wedding of ${coupleName}`;
  const description = `Kami mengundang Anda untuk hadir di hari bahagia kami.`;
  
  const coverMedia = await prisma.invitationMedia.findFirst({
    where: { 
      invitationId: invitation.id, 
      mediaSlot: { in: ["LANDING_COVER", "HOME_PHOTO", "DESKTOP_SIDEBAR", "GROOM_PHOTO", "BRIDE_PHOTO"] } 
    },
    orderBy: { createdAt: "desc" },
  });
  
  const siteOrigin = (process.env.NEXT_PUBLIC_APP_URL || "https://luxvite.id").replace(/\/$/, "");
  const rawImage = coverMedia?.localPath || (data as any).landingCoverUrl || (data as any).sidebarPhotoUrl || (data as any).heroPhotoUrl || "/assets/brand/og-banner.png";
  const absoluteImageUrl = rawImage.startsWith("http") ? rawImage : `${siteOrigin}${rawImage.startsWith("/") ? "" : "/"}${rawImage}`;

  const metaTagsHtml = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:site_name" content="Luxenary">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${absoluteImageUrl}">
    <meta property="og:image:secure_url" content="${absoluteImageUrl}">
    <meta property="og:image:type" content="image/jpeg">
    <meta property="og:image:width" content="1200">
    <meta property="og:image:height" content="630">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${absoluteImageUrl}">
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

  console.log(`[Static Publisher] HTML baked (Single Source of Truth): ${masterPath} | size=${(standaloneHtml.length / 1024).toFixed(1)}KB`);

  return standaloneHtml;
}

/**
 * Deletes the standalone published HTML file.
 */
export async function deletePublishedHtml(invitationId: string): Promise<boolean> {
  let deleted = false;

  // Hapus file ID master (Single Source of Truth)
  const idPath = path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
  try {
    await fs.promises.access(idPath);
    await fs.promises.unlink(idPath);
    deleted = true;
  } catch {}
  
  return deleted;
}

/**
 * Deprecated: Fungsi ini dihapus karena sistem tidak lagi menggunakan file HTML subdomain terpisah.
 */
export async function deleteSubdomainHtmlOnly(invitationId: string): Promise<boolean> {
  return true; // No-op
}
