/**
 * Varian Tema (lib/themeVariants.ts): tema baru yang menumpang ke master tulisan tangan dan menimpa warna/huruf :root-nya.
 * Berkas master tidak pernah ditulis. Varian baru selalu nonaktif sampai diterbitkan; undangan yang sudah memakai varian
 * menyimpan salinan bekunya sendiri, jadi mengubah varian hanya berlaku untuk undangan baru.
 *
 * Editor Master memakai rute yang sama untuk menyunting master tulisan tangan itu sendiri: suntingannya (warna, huruf,
 * gambar pengganti, seksi tersembunyi, CSS tambahan) disimpan di `masterOverrides` baris master, bukan di berkasnya.
 *
 *   GET    ?parent=<id>        token warna (dikelompokkan per nilai), huruf, gambar, dan seksi master induk
 *   GET    ?id=<idVarian>      varian beserta token induknya
 *   GET    ?master=<id>        master beserta suntingan tersimpannya (Editor Master)
 *   POST   { parentId, name, description?, overrides }      buat varian (nonaktif)
 *   POST   ?preview  { parentId, overrides, mode? }          HTML pratinjau dengan data demo induk; mode "master"
 *                                                            merender master mentah + overrides, mode varian menumpuk
 *                                                            overrides di atas suntingan master induk
 *   PUT    { id, name?, description?, overrides?, isActive? } ubah atau terbitkan varian
 *   PUT    { masterId, overrides }                           simpan suntingan Editor Master
 *   DELETE ?id=<idVarian>      hapus varian yang belum dipakai undangan mana pun
 */
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { logger } from "@/lib/logger";
import { masterTemplateCache } from "@/lib/cache";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { requestThemeThumbnails } from "@/lib/themeThumbnailJob";
import { resolveThemeEntry, renderTemplateFile } from "@/lib/renderTemplate";
import { masterFilePath } from "@/lib/themePaths";
import { composeInvitationData } from "@/lib/themeEngine";
import { buildDemoInvitation } from "@/lib/demoInvitation";
import { ensureGoogleFont, FontError } from "@/lib/themeBuilder/fonts";
import { googleFontFamilyName, isGoogleFontId } from "@/lib/themeBuilder/spec";
import { recordBuilderAudit, slugifyThemeId, themeIdTaken } from "@/lib/themeBuilder/server";
import { applyMasterOverrides, clearVariantCache, masterColorGroups, masterTokens, parseMasterOverrides, storedOverrides, type MasterOverrides } from "@/lib/themeVariants";
import { masterColorUsage, masterImageRefs, masterSections, overrideCount } from "@/lib/themeVariantCss";
import { masterAnchors, masterReorderable } from "@/lib/masterLayout";

export const dynamic = "force-dynamic";

/**
 * Master tulisan tangan yang sah (bukan builder, bukan varian) dan berkasnya ada. `edits` = suntingan Editor Master yang
 * tersimpan pada baris master itu sendiri; varian menumpuk di atasnya.
 */
async function loadParent(parentId: string) {
  const theme = await prisma.theme.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, description: true, isActive: true, category: true, eventType: true, series: true, defaultMusicUrl: true, defaultMedia: true, builderSpec: true, parentTheme: true, masterOverrides: true },
  });
  if (!theme) return { error: "Tema induk tidak ditemukan.", status: 404 } as const;
  if (theme.builderSpec !== null || theme.parentTheme !== null) return { error: "Hanya tema master bawaan (tulisan tangan) yang bisa disunting di sini atau dibuatkan varian.", status: 409 } as const;
  const entry = resolveThemeEntry(theme.id);
  if (!entry) return { error: "Berkas master tema induk tidak ditemukan.", status: 404 } as const;
  const html = fs.readFileSync(masterFilePath(entry.eventType, entry.style, entry.file), "utf-8");
  return { theme, html, edits: storedOverrides(theme.masterOverrides) } as const;
}

function tokenPayload(html: string) {
  return { colorGroups: masterColorGroups(html), fonts: masterTokens(html).fonts, usage: masterColorUsage(html), images: masterImageRefs(html), sections: masterSections(html), anchors: masterAnchors(html), reorderable: masterReorderable(html) };
}

/** Gambar, seksi tersembunyi, dan CSS tambahan hanya lewat Editor Master; varian mewarisinya dari master induk. */
function variantOnlyColorsFonts(o: MasterOverrides): string | null {
  return Object.keys(o.images ?? {}).length || o.hiddenSections?.length || o.css || Object.keys(o.elements ?? {}).length || o.coverDesktop
    || o.ornaments?.length || o.freeSections?.length || Object.keys(o.sectionBackgrounds ?? {}).length || o.sectionOrder?.length
    ? "Varian hanya mengganti warna dan huruf. Gambar, seksi, CSS, tata letak, ornamen, dan seksi bebas disunting lewat Edit pada master induknya."
    : null;
}

/** Font Google pada override diunduh ke server sebelum dipakai, sama seperti font Theme Builder. */
async function ensureOverrideFonts(overrides: MasterOverrides): Promise<void> {
  for (const id of new Set(Object.values(overrides.fonts))) {
    if (isGoogleFontId(id)) await ensureGoogleFont(googleFontFamilyName(id));
  }
}

async function refreshPublicTheme(themeId: string, isActive: boolean) {
  masterTemplateCache.clear();
  clearVariantCache(themeId);
  if (isActive) {
    try {
      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(themeId);
    } catch (err) {
      logger.error("ThemeVariants", "Varian tersimpan tetapi demo statis gagal dibuat", err, { themeId });
    }
    try {
      requestThemeThumbnails(themeId);
    } catch (err) {
      logger.error("ThemeVariants", "Thumbnail katalog gagal diantrekan", err, { themeId });
    }
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/");
  revalidatePath("/demo");
  revalidatePath("/api/public/themes");
  const purge = await purgeCloudflareCache({ purgeEverything: true });
  if (!purge.success && !purge.skipped) logger.error("ThemeVariants", "Purge cache Cloudflare gagal setelah perubahan varian", purge.error ?? purge.errors, { themeId });
}

function readName(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 300) : "";
  return { name, description };
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const params = new URL(req.url).searchParams;

    const parentId = params.get("parent");
    if (parentId) {
      const parent = await loadParent(parentId);
      if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: parent.status });
      return NextResponse.json({ success: true, parent: { id: parent.theme.id, name: parent.theme.name, eventType: parent.theme.eventType }, ...tokenPayload(parent.html) });
    }

    const id = params.get("id");
    if (id) {
      const variant = await prisma.theme.findUnique({ where: { id }, select: { id: true, name: true, description: true, isActive: true, parentTheme: true, masterOverrides: true } });
      if (!variant?.parentTheme || variant.masterOverrides === null) return NextResponse.json({ error: "Varian tema tidak ditemukan." }, { status: 404 });
      const parent = await loadParent(variant.parentTheme);
      if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: parent.status });
      const { masterOverrides, parentTheme, ...meta } = variant;
      return NextResponse.json({
        success: true,
        variant: { ...meta, overrides: masterOverrides },
        parent: { id: parentTheme, name: parent.theme.name, eventType: parent.theme.eventType },
        ...tokenPayload(parent.html),
      });
    }

    const masterId = params.get("master");
    if (masterId) {
      const master = await loadParent(masterId);
      if ("error" in master) return NextResponse.json({ error: master.error }, { status: master.status });
      return NextResponse.json({
        success: true,
        master: { id: master.theme.id, name: master.theme.name, eventType: master.theme.eventType, isActive: master.theme.isActive, overrides: master.edits ?? { colors: {}, fonts: {} } },
        parent: { id: master.theme.id, name: master.theme.name, eventType: master.theme.eventType },
        variantCount: await prisma.theme.count({ where: { parentTheme: master.theme.id } }),
        ...tokenPayload(master.html),
      });
    }

    return NextResponse.json({ error: "Parameter parent, id, atau master wajib diisi." }, { status: 400 });
  } catch (error) {
    return routeError("ThemeVariants", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const input = await readJsonBody<Record<string, unknown>>(req);
    const parentId = typeof input.parentId === "string" ? input.parentId : "";
    const parent = await loadParent(parentId);
    if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: parent.status });
    const parsed = parseMasterOverrides(input.overrides, parent.html);
    if (!parsed.ok) return NextResponse.json({ error: "Override tidak valid.", details: parsed.errors }, { status: 400 });
    const masterMode = input.mode === "master";
    const variantError = masterMode ? null : variantOnlyColorsFonts(parsed.value);
    if (variantError) return NextResponse.json({ error: variantError }, { status: 400 });

    try {
      await ensureOverrideFonts(parsed.value);
    } catch (err) {
      if (err instanceof FontError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    if (new URL(req.url).searchParams.has("preview")) {
      const data = (await composeInvitationData(buildDemoInvitation(parent.theme.id, undefined, parent.theme.eventType))) as Record<string, any>;
      const base = !masterMode && parent.edits ? applyMasterOverrides(parent.html, parent.edits, "lux-master-edits") : parent.html;
      const html = await renderTemplateFile(parent.theme.id, data, { eventType: parent.theme.eventType, templateSource: applyMasterOverrides(base, parsed.value) });
      return NextResponse.json({ success: true, html });
    }
    if (masterMode) return NextResponse.json({ error: "Suntingan master disimpan lewat PUT { masterId, overrides }." }, { status: 400 });

    const { name, description } = readName(input);
    if (!name) return NextResponse.json({ error: "Nama varian wajib diisi." }, { status: 400 });
    const id = slugifyThemeId(name);
    if (!id) return NextResponse.json({ error: "Nama varian harus memuat huruf atau angka." }, { status: 400 });
    if (await themeIdTaken(id)) return NextResponse.json({ error: `ID tema "${id}" sudah dipakai. Pilih nama lain.` }, { status: 409 });

    await prisma.theme.create({
      data: {
        id,
        name,
        description: description || null,
        category: parent.theme.category,
        eventType: parent.theme.eventType,
        series: parent.theme.series,
        defaultMusicUrl: parent.theme.defaultMusicUrl,
        defaultMedia: parent.theme.defaultMedia ?? Prisma.DbNull,
        parentTheme: parent.theme.id,
        masterOverrides: parsed.value as unknown as Prisma.InputJsonValue,
        isActive: false,
      },
    });
    await recordBuilderAudit(req, guard.session, "THEME_VARIANT_CREATE", `Membuat varian ${id} dari ${parent.theme.id}`);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return routeError("ThemeVariants", error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const input = await readJsonBody<Record<string, unknown>>(req);

    if (typeof input.masterId === "string") {
      const master = await loadParent(input.masterId);
      if ("error" in master) return NextResponse.json({ error: master.error }, { status: master.status });
      const parsed = parseMasterOverrides(input.overrides, master.html);
      if (!parsed.ok) return NextResponse.json({ error: "Suntingan tidak valid.", details: parsed.errors }, { status: 400 });
      try {
        await ensureOverrideFonts(parsed.value);
      } catch (err) {
        if (err instanceof FontError) return NextResponse.json({ error: err.message }, { status: 400 });
        throw err;
      }
      const count = overrideCount(parsed.value);
      await prisma.theme.update({ where: { id: master.theme.id }, data: { masterOverrides: count ? (parsed.value as unknown as Prisma.InputJsonValue) : Prisma.DbNull } });
      await recordBuilderAudit(req, guard.session, "THEME_MASTER_EDIT", `Menyunting master ${master.theme.id} (${count} perubahan)`);
      // Varian mewarisi suntingan master induknya, jadi demo varian yang tayang ikut dibuat ulang.
      clearVariantCache();
      await refreshPublicTheme(master.theme.id, master.theme.isActive);
      const variants = await prisma.theme.findMany({ where: { parentTheme: master.theme.id, isActive: true }, select: { id: true } });
      for (const v of variants) await refreshPublicTheme(v.id, true);
      return NextResponse.json({ success: true, count });
    }

    const id = typeof input.id === "string" ? input.id : "";
    const variant = await prisma.theme.findUnique({ where: { id }, select: { id: true, parentTheme: true, masterOverrides: true, isActive: true } });
    if (!variant?.parentTheme || variant.masterOverrides === null) return NextResponse.json({ error: "Varian tema tidak ditemukan." }, { status: 404 });
    const parent = await loadParent(variant.parentTheme);
    if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: parent.status });

    const data: Prisma.ThemeUpdateInput = {};
    if (input.overrides !== undefined) {
      const parsed = parseMasterOverrides(input.overrides, parent.html);
      if (!parsed.ok) return NextResponse.json({ error: "Override tidak valid.", details: parsed.errors }, { status: 400 });
      const variantError = variantOnlyColorsFonts(parsed.value);
      if (variantError) return NextResponse.json({ error: variantError }, { status: 400 });
      try {
        await ensureOverrideFonts(parsed.value);
      } catch (err) {
        if (err instanceof FontError) return NextResponse.json({ error: err.message }, { status: 400 });
        throw err;
      }
      data.masterOverrides = parsed.value as unknown as Prisma.InputJsonValue;
    }
    if (input.name !== undefined) {
      const { name, description } = readName(input);
      if (!name) return NextResponse.json({ error: "Nama varian wajib diisi." }, { status: 400 });
      data.name = name;
      data.description = description || null;
    }
    if (typeof input.isActive === "boolean") data.isActive = input.isActive;

    const updated = await prisma.theme.update({ where: { id }, data, select: { isActive: true } });
    await recordBuilderAudit(req, guard.session, "THEME_VARIANT_UPDATE", `Mengubah varian ${id}${typeof input.isActive === "boolean" ? (input.isActive ? " (terbit)" : " (ditarik)") : ""}`);
    await refreshPublicTheme(id, updated.isActive);
    return NextResponse.json({ success: true, isActive: updated.isActive });
  } catch (error) {
    return routeError("ThemeVariants", error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;
    const id = new URL(req.url).searchParams.get("id") ?? "";
    const variant = await prisma.theme.findUnique({ where: { id }, select: { id: true, parentTheme: true, masterOverrides: true } });
    if (!variant?.parentTheme || variant.masterOverrides === null) return NextResponse.json({ error: "Varian tema tidak ditemukan." }, { status: 404 });
    const used = await prisma.invitation.count({ where: { themeId: id } });
    if (used > 0) return NextResponse.json({ error: `Varian dipakai ${used} undangan dan tidak dapat dihapus. Nonaktifkan saja agar tidak tampil di katalog.` }, { status: 409 });
    await prisma.theme.delete({ where: { id } });
    fs.rmSync(path.join(process.cwd(), "public", "demo", id.toLowerCase()), { recursive: true, force: true });
    await recordBuilderAudit(req, guard.session, "THEME_VARIANT_DELETE", `Menghapus varian ${id}`);
    await refreshPublicTheme(id, false);
    return NextResponse.json({ success: true });
  } catch (error) {
    return routeError("ThemeVariants", error);
  }
}
