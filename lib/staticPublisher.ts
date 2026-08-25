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
function ensurePublishedDir(category?: string) {
  if (!fs.existsSync(PUBLISHED_DIR)) {
    fs.mkdirSync(PUBLISHED_DIR, { recursive: true });
  }
  if (category) {
    const catDir = path.join(PUBLISHED_DIR, category);
    if (!fs.existsSync(catDir)) {
      fs.mkdirSync(catDir, { recursive: true });
    }
  }
}

/**
 * Returns the absolute filepath for an invitation's standalone published HTML.
 */
export function getPublishedFilePath(invitationId: string, category?: string): string {
  const cat = category || "premium";
  ensurePublishedDir(cat);
  return path.join(PUBLISHED_DIR, cat, `${invitationId}.html`);
}

/**
 * Checks if a standalone published HTML file exists for this invitation.
 */
export function hasPublishedHtml(invitationId: string, category?: string): boolean {
  if (category) {
    const catPath = path.join(PUBLISHED_DIR, category, `${invitationId}.html`);
    if (fs.existsSync(catPath)) return true;
  }
  // Check across all category folders and root legacy folder
  const categories = ["premium", "traditional", "modern"];
  for (const c of categories) {
    const p = path.join(PUBLISHED_DIR, c, `${invitationId}.html`);
    if (fs.existsSync(p)) return true;
  }
  return fs.existsSync(path.join(PUBLISHED_DIR, `${invitationId}.html`));
}

/**
 * Reads the standalone published HTML file content.
 */
export function getPublishedHtml(invitationId: string, category?: string): string | null {
  if (category) {
    const catPath = path.join(PUBLISHED_DIR, category, `${invitationId}.html`);
    if (fs.existsSync(catPath)) {
      try {
        return fs.readFileSync(catPath, "utf-8");
      } catch {
        return null;
      }
    }
  }
  // Search across category folders
  const categories = ["premium", "traditional", "modern"];
  for (const c of categories) {
    const p = path.join(PUBLISHED_DIR, c, `${invitationId}.html`);
    if (fs.existsSync(p)) {
      try {
        return fs.readFileSync(p, "utf-8");
      } catch {
        return null;
      }
    }
  }
  // Root legacy fallback
  const rootPath = path.join(PUBLISHED_DIR, `${invitationId}.html`);
  if (fs.existsSync(rootPath)) {
    try {
      return fs.readFileSync(rootPath, "utf-8");
    } catch {
      return null;
    }
  }
  return null;
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
  const standaloneHtml = renderTemplateFile(invitation.themeId || "kalandra", data, { editMode: false });

  ensurePublishedDir(category);
  const filePath = getPublishedFilePath(invitation.id, category);

  fs.writeFileSync(filePath, standaloneHtml, "utf-8");

  console.log(`[Static Publisher] Standalone HTML baked successfully: ${filePath} (${(standaloneHtml.length / 1024).toFixed(1)} KB)`);

  return standaloneHtml;
}

/**
 * Deletes the standalone published HTML file if an invitation is unpublished or deleted.
 */
export function deletePublishedHtml(invitationId: string, category?: string): boolean {
  let deleted = false;
  const categories = category ? [category] : ["premium", "traditional", "modern"];
  for (const c of categories) {
    const p = path.join(PUBLISHED_DIR, c, `${invitationId}.html`);
    if (fs.existsSync(p)) {
      try {
        fs.unlinkSync(p);
        deleted = true;
      } catch {}
    }
  }
  const rootPath = path.join(PUBLISHED_DIR, `${invitationId}.html`);
  if (fs.existsSync(rootPath)) {
    try {
      fs.unlinkSync(rootPath);
      deleted = true;
    } catch {}
  }
  return deleted;
}
