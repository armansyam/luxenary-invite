import fs from "fs";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { resolveThemeEntry } from "@/lib/renderTemplate";
import { masterFilePath } from "@/lib/themePaths";
import { parseMasterOverrides, type MasterOverrides } from "@/lib/themeVariants";
import { overrideCount } from "@/lib/themeVariantCss";
import { clearVariantCache } from "@/lib/themeVariants";

export interface AcaraSyncResult {
  synced: boolean;
  acaraId?: string;
  isActive?: boolean;
  reason?: string;
}

/**
 * Menyinkronkan override aman (`colors`, `fonts`, `css`, `sectionBackgrounds`, `ornaments`) dari master
 * tema pernikahan (`<id>`) ke kembarannya satu-nama (`<id>-acara`) saat admin menyimpan Editor Master.
 */
export async function syncWeddingMasterToAcara(
  masterId: string,
  masterOverrides: MasterOverrides | null,
): Promise<AcaraSyncResult> {
  const cleanId = String(masterId || "").trim().toLowerCase();
  if (!cleanId || cleanId.endsWith("-acara")) {
    return { synced: false, reason: "SKIP_NON_WEDDING_ROOT" };
  }

  const acaraId = `${cleanId}-acara`;
  const sibling = await prisma.theme.findUnique({
    where: { id: acaraId },
    select: { id: true, isActive: true, builderSpec: true, parentTheme: true },
  });

  if (!sibling || sibling.builderSpec !== null || sibling.parentTheme !== null) {
    return { synced: false, reason: "SIBLING_NOT_FOUND" };
  }

  const entry = resolveThemeEntry(acaraId);
  if (!entry) {
    return { synced: false, reason: "SIBLING_HTML_NOT_FOUND" };
  }

  const acaraHtml = fs.readFileSync(masterFilePath(entry.eventType, entry.style, entry.file), "utf-8");

  if (!masterOverrides || overrideCount(masterOverrides) === 0) {
    await prisma.theme.update({
      where: { id: acaraId },
      data: { masterOverrides: Prisma.DbNull },
    });
    clearVariantCache(acaraId);
    return { synced: true, acaraId, isActive: sibling.isActive };
  }

  const fullCandidate: MasterOverrides = {
    colors: { ...(masterOverrides.colors ?? {}) },
    fonts: { ...(masterOverrides.fonts ?? {}) },
    ...(masterOverrides.css ? { css: masterOverrides.css } : {}),
    ...(masterOverrides.sectionBackgrounds
      ? { sectionBackgrounds: { ...masterOverrides.sectionBackgrounds } }
      : {}),
    ...(masterOverrides.ornaments ? { ornaments: [...masterOverrides.ornaments] } : {}),
  };

  let parsed = parseMasterOverrides(fullCandidate, acaraHtml);
  if (!parsed.ok) {
    const coreCandidate: MasterOverrides = {
      colors: { ...(masterOverrides.colors ?? {}) },
      fonts: { ...(masterOverrides.fonts ?? {}) },
      ...(masterOverrides.css ? { css: masterOverrides.css } : {}),
    };
    parsed = parseMasterOverrides(coreCandidate, acaraHtml);
    if (!parsed.ok) {
      return { synced: false, acaraId, reason: parsed.errors.join("; ") };
    }
  }

  const count = overrideCount(parsed.value);
  await prisma.theme.update({
    where: { id: acaraId },
    data: {
      masterOverrides: count ? (parsed.value as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
    },
  });
  clearVariantCache(acaraId);

  return { synced: true, acaraId, isActive: sibling.isActive };
}
