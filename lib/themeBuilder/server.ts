import fs from "fs";
import path from "path";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { renderTemplateFile, resolveThemeEntry, THEME_MAP } from "@/lib/renderTemplate";
import { auditBuilderMaster, type MasterIssue } from "@/lib/themeBuilder/audit";
import { compileBuilderMaster, readBuilderBlueprint } from "@/lib/themeBuilder/compile";
import { parseBuilderSpec, type BuilderSpec } from "@/lib/themeBuilder/spec";
import { isSafePathSegment } from "@/lib/fsSafe";
import type { ThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { masterPathOf } from "@/lib/themePaths";

export const THEME_ASSET_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "uploads", "theme-assets");
export const THEME_ASSET_URL_PREFIX = "/uploads/theme-assets/";
export const BUILTIN_ORNAMENT_DIR = path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "assets", "ornaments");

export type BuilderCategory = "minimalist" | "modern" | "traditional";
export const BUILDER_CATEGORIES: BuilderCategory[] = ["minimalist", "modern", "traditional"];

export function builderMasterPath(category: BuilderCategory, themeId: string): string {
  return masterPathOf("WEDDING", category, themeId);
}

/** ID dari nama tema: huruf kecil, angka, dan tanda hubung; sama dengan pola ID tema yang sudah ada. */
export function slugifyThemeId(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
}

/** ID baru tidak boleh menimpa tema lain: baris DB, entri THEME_MAP, maupun berkas master di folder mana pun. */
export async function themeIdTaken(themeId: string): Promise<boolean> {
  if (Object.prototype.hasOwnProperty.call(THEME_MAP, themeId)) return true;
  if (resolveThemeEntry(themeId)) return true;
  return Boolean(await prisma.theme.findUnique({ where: { id: themeId }, select: { id: true } }));
}

export function isSafeThemeId(themeId: string): boolean {
  return isSafePathSegment(themeId) && /^[a-z0-9][a-z0-9-]{1,39}$/.test(themeId);
}

export interface CompiledBuilderTheme {
  html: string;
  issues: MasterIssue[];
}

/** Latar bawaan tema builder adalah tekstur kanvasnya; "Polos" tidak punya gambar bawaan (kanvas berwarna palet). */
export function builderDefaultMedia(spec: BuilderSpec): ThemeDefaultMedia {
  return spec.texture ? { GLOBAL_FIXED_BG: spec.texture } : {};
}

export function compileAndAudit(spec: BuilderSpec): CompiledBuilderTheme {
  const blueprint = readBuilderBlueprint(spec.eventType);
  const html = compileBuilderMaster(spec, blueprint);
  return { html, issues: auditBuilderMaster(html, blueprint) };
}

/** Pratinjau dirender oleh engine undangan klien dengan data demo, persis seperti yang akan dilihat calon klien. */
export async function renderBuilderPreview(spec: BuilderSpec, demoThemeId = "kalandra"): Promise<CompiledBuilderTheme> {
  const compiled = compileAndAudit(spec);
  const data = (await composeInvitationData(buildDemoInvitation(demoThemeId))) as Record<string, any>;
  const html = await renderTemplateFile("builder-preview", data, { eventType: spec.eventType, templateSource: compiled.html });
  return { html, issues: compiled.issues };
}

/** Spesifikasi builder yang tersimpan di DB; null bila tema ditulis tangan atau spesifikasinya tidak lagi valid. */
export function storedBuilderSpec(value: unknown): BuilderSpec | null {
  if (!value) return null;
  const parsed = parseBuilderSpec(value);
  return parsed.ok ? parsed.spec : null;
}

/**
 * Tema hasil builder hanya boleh tampil di katalog bila master di disk lolos audit terhadap blueprint. Tema tulisan
 * tangan (builderSpec null) tidak diaudit di sini.
 */
export async function builderPublishIssues(themeId: string): Promise<MasterIssue[] | null> {
  const theme = await prisma.theme.findUnique({ where: { id: themeId }, select: { builderSpec: true, category: true } });
  const spec = storedBuilderSpec(theme?.builderSpec);
  if (!theme || !spec) return null;
  const file = builderMasterPath(theme.category as BuilderCategory, themeId);
  if (!fs.existsSync(file)) return [{ code: "section", message: "Berkas master tema tidak ditemukan. Simpan ulang dari builder." }];
  return auditBuilderMaster(fs.readFileSync(file, "utf-8"), readBuilderBlueprint(spec.eventType));
}

const REFERENCE_DIRS = [
  path.join(/*turbopackIgnore: true*/ process.cwd(), "themes"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "data", "drafts"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "published"),
  path.join(/*turbopackIgnore: true*/ process.cwd(), "public", "demo"),
];

function htmlFilesUnder(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const out: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...htmlFilesUnder(full));
    else if (entry.name.endsWith(".html")) out.push(full);
  }
  return out;
}

/**
 * Tempat aset ornamen masih dipakai. Undangan klien membekukan salinan master (data/drafts) dan HTML terbit
 * (public/published) yang menautkan URL ornamen, jadi menghapus berkas yang masih ditaut merusak undangan yang sudah jalan.
 */
export async function assetUsage(url: string): Promise<string[]> {
  const usage: string[] = [];
  const themes = await prisma.theme.findMany({ where: { builderSpec: { not: Prisma.DbNull } }, select: { id: true, builderSpec: true } });
  for (const t of themes) {
    if (t.builderSpec && JSON.stringify(t.builderSpec).includes(url)) usage.push(`tema ${t.id}`);
  }
  for (const dir of REFERENCE_DIRS) {
    for (const file of htmlFilesUnder(dir)) {
      if (fs.readFileSync(file, "utf-8").includes(url)) usage.push(path.relative(process.cwd(), file));
      if (usage.length > 20) return usage;
    }
  }
  return usage;
}

export interface OrnamentLibraryGroup {
  id: string;
  label: string;
  items: string[];
}

/** Ornamen bawaan di public/assets/ornaments/<folder>/ (tanpa latar), dikelompokkan per folder. */
export function builtinOrnamentGroups(): OrnamentLibraryGroup[] {
  if (!fs.existsSync(BUILTIN_ORNAMENT_DIR)) return [];
  return fs
    .readdirSync(BUILTIN_ORNAMENT_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== "background" && /^[A-Za-z0-9_-]+$/.test(d.name))
    .map((d) => ({
      id: d.name,
      label: d.name.replace(/_assets.*$/i, "").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()),
      items: fs
        .readdirSync(path.join(BUILTIN_ORNAMENT_DIR, d.name))
        .filter((f) => /^[A-Za-z0-9_.-]+\.(webp|png)$/i.test(f))
        .sort()
        .map((f) => `/assets/ornaments/${d.name}/${f}`),
    }))
    .filter((g) => g.items.length > 0)
    // Folder seperti bugis/ dan bugis_assets_.../ menghasilkan label sama; diberi nomor agar admin bisa membedakan.
    .map((g, i, all) => {
      const order = all.slice(0, i + 1).filter((other) => other.label === g.label).length;
      return order > 1 ? { ...g, label: `${g.label} ${order}` } : g;
    });
}

export function uploadedOrnaments(): Array<{ url: string; size: number; uploadedAt: number }> {
  if (!fs.existsSync(THEME_ASSET_DIR)) return [];
  return fs
    .readdirSync(THEME_ASSET_DIR)
    .filter((f) => /^[a-f0-9]{24}\.(webp|png)$/.test(f))
    .map((f) => {
      const stat = fs.statSync(path.join(THEME_ASSET_DIR, f));
      return { url: `${THEME_ASSET_URL_PREFIX}${f}`, size: stat.size, uploadedAt: stat.mtimeMs };
    })
    .sort((a, b) => b.uploadedAt - a.uploadedAt);
}
