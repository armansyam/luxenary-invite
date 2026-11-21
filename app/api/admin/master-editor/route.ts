/**
 * Editor Master Mandiri (/api/admin/master-editor):
 * Menyunting tema master tulisan tangan secara independen tanpa menimpa berkas `.html` di disk.
 * Suntingan (warna, huruf, gambar pengganti, seksi tersembunyi, tata letak elemen, ornamen, seksi bebas,
 * CSS tambahan, media bawaan slot, dan deklarasi slot media) disimpan di baris `Theme` itu sendiri.
 *
 *   GET  ?id=<themeId>  (alias ?master=<themeId>)    data master + token warna/huruf/gambar/seksi
 *   POST ?preview       { masterId, overrides, previewMode?, sim?, defaultMedia? }  pratinjau HTML
 *   PUT                 { masterId, overrides, defaultMedia?, mediaSlots? }         simpan suntingan master
 */
import fs from "fs";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { logger } from "@/lib/logger";
import { masterTemplateCache } from "@/lib/cache";
import { purgeThemeEdgeCache } from "@/lib/cloudflare";
import { requestThemeThumbnails } from "@/lib/themeThumbnailJob";
import { resolveThemeEntry, renderTemplateFile } from "@/lib/renderTemplate";
import { masterFilePath } from "@/lib/themePaths";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { ensureGoogleFont, FontError } from "@/lib/themeBuilder/fonts";
import { googleFontFamilyName, isGoogleFontId } from "@/lib/themeBuilder/spec";
import { recordBuilderAudit } from "@/lib/themeBuilder/server";
import { applyMasterOverrides, clearMasterEditsCache, masterColorGroups, masterTokens, parseMasterOverrides, storedOverrides, type MasterOverrides } from "@/lib/masterEdits";
import { masterColorUsage, masterImageRefs, masterSections, overrideCount } from "@/lib/masterOverrideCss";
import { masterAnchors, masterReorderable } from "@/lib/masterLayout";
import { fitMasterOrnaments } from "@/lib/themeBuilder/frameWindow";
import { parseThemeDefaultMedia, validateThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { parseThemeMediaSlots, validateThemeMediaSlots } from "@/lib/themeMediaSlots";
import { themeArtPreviews } from "@/lib/themeArtPreview";
import { parseSimMedia } from "@/lib/themeBuilder/simSlots";

export const dynamic = "force-dynamic";

async function loadMasterTheme(masterId: string) {
  const theme = await prisma.theme.findUnique({
    where: { id: masterId },
    select: {
      id: true,
      name: true,
      description: true,
      isActive: true,
      category: true,
      eventType: true,
      subEvent: true,
      series: true,
      defaultMusicUrl: true,
      defaultMedia: true,
      mediaSlots: true,
      builderSpec: true,
      masterOverrides: true,
    },
  });
  if (!theme) return { error: "Tema master tidak ditemukan.", status: 404 } as const;
  if (theme.builderSpec !== null) {
    return { error: "Tema hasil Theme Builder disunting langsung di Theme Builder, bukan Editor Master.", status: 409 } as const;
  }
  const entry = resolveThemeEntry(theme.id);
  if (!entry) return { error: "Berkas master HTML tema tidak ditemukan.", status: 404 } as const;
  const html = fs.readFileSync(masterFilePath(entry.eventType, entry.style, entry.file), "utf-8");
  return { theme, html, edits: storedOverrides(theme.masterOverrides) } as const;
}

function tokenPayload(html: string) {
  return {
    colorGroups: masterColorGroups(html),
    fonts: masterTokens(html).fonts,
    usage: masterColorUsage(html),
    images: masterImageRefs(html),
    sections: masterSections(html),
    anchors: masterAnchors(html),
    reorderable: masterReorderable(html),
  };
}

async function ensureOverrideFonts(overrides: MasterOverrides): Promise<void> {
  for (const id of new Set(Object.values(overrides.fonts))) {
    if (isGoogleFontId(id)) await ensureGoogleFont(googleFontFamilyName(id));
  }
}

async function refreshPublicTheme(themeId: string, isActive: boolean) {
  masterTemplateCache.clear();
  clearMasterEditsCache(themeId);
  if (isActive) {
    try {
      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(themeId);
    } catch (err) {
      logger.error("MasterEditor", "Master tersimpan tetapi demo statis gagal dibuat", err, { themeId });
    }
    try {
      requestThemeThumbnails(themeId);
    } catch (err) {
      logger.error("MasterEditor", "Thumbnail katalog gagal diantrekan", err, { themeId });
    }
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/");
  revalidatePath("/demo");
  revalidatePath("/api/public/themes");
  const purge = await purgeThemeEdgeCache(themeId);
  if (!purge.success && !purge.skipped) {
    logger.error("MasterEditor", "Purge cache Cloudflare gagal setelah perubahan master", purge.error ?? purge.errors, { themeId });
  }
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const params = new URL(req.url).searchParams;
    const masterId = params.get("id") || params.get("master") || "";
    if (!masterId) {
      return NextResponse.json({ error: "Parameter id tema master wajib diisi." }, { status: 400 });
    }

    const master = await loadMasterTheme(masterId);
    if ("error" in master) return NextResponse.json({ error: master.error }, { status: master.status });

    return NextResponse.json({
      success: true,
      master: {
        id: master.theme.id,
        name: master.theme.name,
        eventType: master.theme.eventType,
        subEvent: master.theme.subEvent,
        isActive: master.theme.isActive,
        overrides: master.edits ?? { colors: {}, fonts: {} },
        defaultMedia: parseThemeDefaultMedia(master.theme.defaultMedia),
        mediaSlots: parseThemeMediaSlots(master.theme.mediaSlots),
        builtinMedia: themeArtPreviews(master.theme.id),
      },
      ...tokenPayload(master.html),
    });
  } catch (error) {
    return routeError("MasterEditor", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    if (!new URL(req.url).searchParams.has("preview")) {
      return NextResponse.json({ error: "Suntingan master disimpan lewat PUT { masterId, overrides }." }, { status: 400 });
    }

    const input = await readJsonBody<Record<string, unknown>>(req);
    const masterId = typeof input.masterId === "string" ? input.masterId : "";
    const master = await loadMasterTheme(masterId);
    if ("error" in master) return NextResponse.json({ error: master.error }, { status: master.status });

    const parsed = parseMasterOverrides(input.overrides, master.html);
    if (!parsed.ok) return NextResponse.json({ error: "Suntingan tidak valid.", details: parsed.errors }, { status: 400 });
    if (parsed.value.ornaments) parsed.value.ornaments = await fitMasterOrnaments(parsed.value.ornaments);

    try {
      await ensureOverrideFonts(parsed.value);
    } catch (err) {
      if (err instanceof FontError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    const mode = input.previewMode === "client" || input.previewMode === "sim" ? input.previewMode : "demo";
    const demo = buildDemoInvitation(master.theme.id, mode === "demo" ? undefined : { galleryPhotos: [] }, master.theme.eventType, master.theme.subEvent);
    const sim = parseSimMedia(input.sim);
    const simMedia = mode === "sim"
      ? [
          ...Object.entries(sim.slots).map(([mediaSlot, localPath]) => ({ mediaSlot, localPath: localPath as string })),
          ...sim.gallery.map((localPath) => ({ mediaSlot: "GALLERY", localPath })),
        ]
      : [];
    const inv = mode === "demo"
      ? demo
      : { ...demo, media: simMedia, themeDefaultMedia: parseThemeDefaultMedia(input.defaultMedia ?? master.theme.defaultMedia) };
    const data = (await composeInvitationData(inv)) as Record<string, any>;
    const html = await renderTemplateFile(master.theme.id, data, {
      eventType: master.theme.eventType,
      templateSource: applyMasterOverrides(master.html, parsed.value, "lux-master-edits"),
    });
    return NextResponse.json({ success: true, html });
  } catch (error) {
    return routeError("MasterEditor", error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const input = await readJsonBody<Record<string, unknown>>(req);
    const masterId = typeof input.masterId === "string" ? input.masterId : "";
    if (!masterId) return NextResponse.json({ error: "masterId wajib diisi." }, { status: 400 });

    const master = await loadMasterTheme(masterId);
    if ("error" in master) return NextResponse.json({ error: master.error }, { status: master.status });

    const parsed = parseMasterOverrides(input.overrides, master.html);
    if (!parsed.ok) return NextResponse.json({ error: "Suntingan tidak valid.", details: parsed.errors }, { status: 400 });
    if (parsed.value.ornaments) parsed.value.ornaments = await fitMasterOrnaments(parsed.value.ornaments);

    try {
      await ensureOverrideFonts(parsed.value);
    } catch (err) {
      if (err instanceof FontError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    let defaultMedia: Prisma.ThemeUpdateInput["defaultMedia"];
    if (input.defaultMedia !== undefined) {
      const checked = validateThemeDefaultMedia(input.defaultMedia);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
      defaultMedia = Object.keys(checked.value).length ? (checked.value as Prisma.InputJsonValue) : Prisma.DbNull;
    }

    let mediaSlots: Prisma.ThemeUpdateInput["mediaSlots"];
    if (input.mediaSlots !== undefined) {
      const checked = validateThemeMediaSlots(input.mediaSlots);
      if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
      mediaSlots = checked.value ? (checked.value as Prisma.InputJsonValue) : Prisma.DbNull;
    }

    const count = overrideCount(parsed.value);
    await prisma.theme.update({
      where: { id: master.theme.id },
      data: {
        masterOverrides: count ? (parsed.value as unknown as Prisma.InputJsonValue) : Prisma.DbNull,
        ...(defaultMedia !== undefined && { defaultMedia }),
        ...(mediaSlots !== undefined && { mediaSlots }),
      },
    });

    await recordBuilderAudit(req, guard.session, "THEME_MASTER_EDIT", `Menyunting master ${master.theme.id} (${count} perubahan)`);
    await refreshPublicTheme(master.theme.id, master.theme.isActive);

    return NextResponse.json({ success: true, count });
  } catch (error) {
    return routeError("MasterEditor", error);
  }
}
