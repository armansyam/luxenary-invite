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

/**
 * Bakes / Compiles the standalone HTML document for a published invitation.
 * Saves to public/published/[category]/[invitationId].html.
 * Once generated, public guests load purely from this file without ever touching master templates.
 */
export async function buildAndSavePublishedHtml(invitationId: string): Promise<string | null> {
  const invitation = await prisma.invitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) return null;

  const data = await composeTemplateData(invitation.id);
  if (!data) return null;

  const category = getThemeCategory(invitation.themeId || "kalandra");

  // Render standalone HTML without edit controls
  const standaloneHtml = await renderTemplateFile(invitation.themeId || "kalandra", data, { editMode: false });

  await ensurePublishedDir(category);
  const filePath = await getPublishedFilePath(invitation.id, category);

  await fs.promises.writeFile(filePath, standaloneHtml, "utf-8");

  console.log(`[Static Publisher] Standalone HTML baked successfully: ${filePath} (${(standaloneHtml.length / 1024).toFixed(1)} KB)`);

  return standaloneHtml;
}

/**
 * Deletes the standalone published HTML file if an invitation is unpublished or deleted.
 */
export async function deletePublishedHtml(invitationId: string, category?: string): Promise<boolean> {
  let deleted = false;
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
