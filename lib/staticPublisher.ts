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
async function ensurePublishedDir() {
  try {
    await fs.promises.access(PUBLISHED_DIR);
  } catch {
    await fs.promises.mkdir(PUBLISHED_DIR, { recursive: true });
  }
  
  const subdomainsDir = path.join(PUBLISHED_DIR, "subdomains");
  const slugsDir = path.join(PUBLISHED_DIR, "slugs");
  const idsDir = path.join(PUBLISHED_DIR, "ids");
  
  try { await fs.promises.access(subdomainsDir); } catch { await fs.promises.mkdir(subdomainsDir, { recursive: true }); }
  try { await fs.promises.access(slugsDir); } catch { await fs.promises.mkdir(slugsDir, { recursive: true }); }
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

  await ensurePublishedDir();

  // 1. Simpan sebagai subdomains/{subdomain}.html → untuk subdomain routing (arman-siti.luxenary.id)
  let subdomainFilePath = "None (No Subdomain)";
  if (invitation.subdomain) {
    subdomainFilePath = path.join(PUBLISHED_DIR, "subdomains", `${invitation.subdomain}.html`);
    await fs.promises.writeFile(subdomainFilePath, standaloneHtml, "utf-8");
  }

  // 2. Simpan sebagai slugs/{invitationSlug}.html → untuk canonical path routing (luxenary.id/arman-siti-030326)
  const canonicalFilePath = path.join(PUBLISHED_DIR, "slugs", `${invitation.invitationSlug}.html`);
  await fs.promises.writeFile(canonicalFilePath, standaloneHtml, "utf-8");

  // 3. Simpan fallback berdasarkan ID (untuk getPublishedHtml fallback)
  const fallbackPath = path.join(PUBLISHED_DIR, "ids", `${invitation.id}.html`);
  await fs.promises.writeFile(fallbackPath, standaloneHtml, "utf-8");

  console.log(`[Static Publisher] HTML baked: subdomain=${subdomainFilePath} | canonical=${canonicalFilePath} | size=${(standaloneHtml.length / 1024).toFixed(1)}KB`);

  return standaloneHtml;
}

/**
 * Deletes the standalone published HTML files.
 * Protects the slug HTML (portfolio) from deletion unless isAdminDelete is true.
 */
export async function deletePublishedHtml(invitationId: string, isAdminDelete: boolean = false, category?: string): Promise<boolean> {
  let deleted = false;

  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { subdomain: true, invitationSlug: true },
  });

  // Hapus file subdomain
  if (inv?.subdomain) {
    const subPath = path.join(PUBLISHED_DIR, "subdomains", `${inv.subdomain}.html`);
    try {
      await fs.promises.access(subPath);
      await fs.promises.unlink(subPath);
      deleted = true;
    } catch {}
  }

  // Hapus file canonical slug HANYA jika dipaksa Admin (untuk retensi portofolio)
  if (inv?.invitationSlug && isAdminDelete) {
    const canonicalPath = path.join(PUBLISHED_DIR, "slugs", `${inv.invitationSlug}.html`);
    try {
      await fs.promises.access(canonicalPath);
      await fs.promises.unlink(canonicalPath);
      deleted = true;
    } catch {}
  }

  // Hapus file fallback ID
  const idPath = path.join(PUBLISHED_DIR, "ids", `${invitationId}.html`);
  try {
    await fs.promises.access(idPath);
    await fs.promises.unlink(idPath);
    deleted = true;
  } catch {}
  return deleted;
}

/**
 * Specifically deletes ONLY the subdomain HTML. Used by Cron Phase 1 (Expiration)
 * to take down custom domains and subdomains while leaving the portfolio completely intact.
 */
export async function deleteSubdomainHtmlOnly(invitationId: string): Promise<boolean> {
  let deleted = false;
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    select: { subdomain: true },
  });

  if (inv?.subdomain) {
    const subPath = path.join(PUBLISHED_DIR, "subdomains", `${inv.subdomain}.html`);
    try {
      await fs.promises.access(subPath);
      await fs.promises.unlink(subPath);
      deleted = true;
    } catch {}
  }
  return deleted;
}
