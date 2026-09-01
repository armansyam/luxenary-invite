import fs from "fs";
import path from "path";
import { prisma } from "@/lib/prisma";
import { composeTemplateData } from "@/lib/themeEngine";
import { renderTemplateFile } from "@/lib/renderTemplate";

const PUBLISHED_DIR = path.join(process.cwd(), "public", "published");

const CATEGORY_MAP: Record<string, "premium" | "traditional" | "modern"> = {
  kalandra: "premium",
  valente: "premium",
  aurelia: "premium",
  artisan: "premium",
  kila: "premium",
  "premium-kila": "premium",
  ivanna: "premium",
  "premium-ivanna": "premium",
  danila: "premium",
  "premium-danila": "premium",

  prameswari: "traditional",
  dillalucky: "traditional",
  badrika: "traditional",
  mayang: "traditional",
  candani: "traditional",
  aruna: "traditional",
  "heritage-aruna": "traditional",

  wave: "modern",
  papercut: "modern",
  ameera: "modern",
  chronicle: "modern",
  lumina: "modern",
  solaria: "modern",
  "moody-papercut": "modern",
};

export function getThemeCategory(themeId?: string): "premium" | "traditional" | "modern" {
  if (!themeId) return "premium";
  return CATEGORY_MAP[themeId.toLowerCase()] || "premium";
}

/**
 * Ensures the target published storage directory and its category subfolders exist.
 */
async function ensurePublishedDir(category?: string) {
  try {
    await fs.promises.access(PUBLISHED_DIR);
  } catch {
    await fs.promises.mkdir(PUBLISHED_DIR, { recursive: true });
  }
  if (category) {
    const catDir = path.join(PUBLISHED_DIR, category);
    try {
      await fs.promises.access(catDir);
    } catch {
      await fs.promises.mkdir(catDir, { recursive: true });
    }
  }
}

/**
 * Returns the absolute filepath for an invitation's standalone published HTML.
 */
export async function getPublishedFilePath(invitationId: string, category?: string): Promise<string> {
  const cat = category || "premium";
  await ensurePublishedDir(cat);
  return path.join(PUBLISHED_DIR, cat, `${invitationId}.html`);
}

/**
 * Checks if a standalone published HTML file exists for this invitation.
 */
export async function hasPublishedHtml(invitationId: string, category?: string): Promise<boolean> {
  if (category) {
    const catPath = path.join(PUBLISHED_DIR, category, `${invitationId}.html`);
    try {
      await fs.promises.access(catPath);
      return true;
    } catch {}
  }
  // Check across all category folders and root legacy folder
  const categories = ["premium", "traditional", "modern"];
  for (const c of categories) {
    const p = path.join(PUBLISHED_DIR, c, `${invitationId}.html`);
    try {
      await fs.promises.access(p);
      return true;
    } catch {}
  }
  try {
    await fs.promises.access(path.join(PUBLISHED_DIR, `${invitationId}.html`));
    return true;
  } catch {
    return false;
  }
}

/**
 * Reads the standalone published HTML file content.
 */
export async function getPublishedHtml(invitationId: string, category?: string): Promise<string | null> {
  if (category) {
    const catPath = path.join(PUBLISHED_DIR, category, `${invitationId}.html`);
    try {
      await fs.promises.access(catPath);
      return await fs.promises.readFile(catPath, "utf-8");
    } catch {}
  }
  // Search across category folders
  const categories = ["premium", "traditional", "modern"];
  for (const c of categories) {
    const p = path.join(PUBLISHED_DIR, c, `${invitationId}.html`);
    try {
      await fs.promises.access(p);
      return await fs.promises.readFile(p, "utf-8");
    } catch {}
  }
  // Root legacy fallback
  const rootPath = path.join(PUBLISHED_DIR, `${invitationId}.html`);
  try {
    await fs.promises.access(rootPath);
    return await fs.promises.readFile(rootPath, "utf-8");
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

  const category = getThemeCategory(invitation.themeId || "kalandra");

  // 1. Generate Meta Tags (Generic to Couple, No Guest Name)
  const coupleName = `${invitation.groomNickname || invitation.groomName || "Groom"} & ${invitation.brideNickname || invitation.brideName || "Bride"}`;
  const title = `The Wedding of ${coupleName}`;
  const description = `Kami mengundang Anda untuk hadir di hari bahagia kami.`;
  
  const coverMedia = await prisma.invitationMedia.findFirst({
    where: { invitationId: invitation.id, mediaSlot: "LANDING_COVER" }
  });
  const appBaseUrl = (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").replace(/\/$/, "");
  const ogFallback = appBaseUrl ? `${appBaseUrl.startsWith("http") ? "" : "https://"}${appBaseUrl}/default-og.jpg` : "/default-og.jpg";
  const imageUrl = coverMedia?.localPath || ogFallback;

  const metaTagsHtml = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1">
    <title>${title}</title>
    <meta name="description" content="${description}">
    <meta property="og:title" content="${title}">
    <meta property="og:description" content="${description}">
    <meta property="og:image" content="${imageUrl}">
    <meta property="og:type" content="website">
    <meta name="twitter:card" content="summary_large_image">
    <meta name="twitter:title" content="${title}">
    <meta name="twitter:description" content="${description}">
    <meta name="twitter:image" content="${imageUrl}">
  `;
  
  (data as any).metaTagsHtml = metaTagsHtml;

  // Render standalone HTML without edit controls (menggunakan Piring draft jika ada)
  const standaloneHtml = await renderTemplateFile(invitation.themeId || "kalandra", data, { editMode: false, invitationId: invitation.id });

  await ensurePublishedDir(category);

  // 1. Simpan sebagai {subdomain}.html → untuk subdomain routing (arman-siti.luxenary.id)
  let subdomainFilePath = "None (No Subdomain)";
  if (invitation.subdomain) {
    subdomainFilePath = path.join(PUBLISHED_DIR, `${invitation.subdomain}.html`);
    await fs.promises.writeFile(subdomainFilePath, standaloneHtml, "utf-8");
  }

  // 2. Simpan sebagai {invitationSlug}.html → untuk canonical path routing (luxenary.id/arman-siti-030326)
  const canonicalFilePath = path.join(PUBLISHED_DIR, `${invitation.invitationSlug}.html`);
  await fs.promises.writeFile(canonicalFilePath, standaloneHtml, "utf-8");

  // 3. Simpan fallback berdasarkan ID (untuk getPublishedHtml fallback)
  const fallbackPath = await getPublishedFilePath(invitation.id, category);
  await fs.promises.writeFile(fallbackPath, standaloneHtml, "utf-8");

  console.log(`[Static Publisher] HTML baked: subdomain=${subdomainFilePath} | canonical=${canonicalFilePath} | size=${(standaloneHtml.length / 1024).toFixed(1)}KB`);

  return standaloneHtml;
}

/**
 * Deletes the standalone published HTML file if an invitation is unpublished or deleted.
 */
export async function deletePublishedHtml(invitationId: string, category?: string): Promise<boolean> {
  let deleted = false;

  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { subdomain: true, invitationSlug: true },
  });

  // Hapus file subdomain
  if (inv?.subdomain) {
    const subPath = path.join(PUBLISHED_DIR, `${inv.subdomain}.html`);
    try {
      await fs.promises.access(subPath);
      await fs.promises.unlink(subPath);
      deleted = true;
    } catch {}
  }

  // Hapus file canonical slug
  if (inv?.invitationSlug) {
    const canonicalPath = path.join(PUBLISHED_DIR, `${inv.invitationSlug}.html`);
    try {
      await fs.promises.access(canonicalPath);
      await fs.promises.unlink(canonicalPath);
      deleted = true;
    } catch {}
  }

  // Hapus file fallback per-kategori
  const categories = category ? [category] : ["premium", "traditional", "modern"];
  for (const c of categories) {
    const p = path.join(PUBLISHED_DIR, c, `${invitationId}.html`);
    try {
      await fs.promises.access(p);
      await fs.promises.unlink(p);
      deleted = true;
    } catch {}
  }
  const rootPath = path.join(PUBLISHED_DIR, `${invitationId}.html`);
  try {
    await fs.promises.access(rootPath);
    await fs.promises.unlink(rootPath);
    deleted = true;
  } catch {}
  return deleted;
}
