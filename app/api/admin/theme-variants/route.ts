/**
 * Varian Tema (lib/themeVariants.ts): tema baru yang menumpang ke master tulisan tangan dan menimpa warna/huruf :root-nya.
 * Berkas master tidak pernah ditulis. Varian baru selalu nonaktif sampai diterbitkan; undangan yang sudah memakai varian
 * menyimpan salinan bekunya sendiri, jadi mengubah varian hanya berlaku untuk undangan baru.
 *
 *   GET    ?parent=<id>        token warna (dikelompokkan per nilai) dan huruf master induk
 *   GET    ?id=<idVarian>      varian beserta token induknya
 *   POST   { parentId, name, description?, overrides }      buat varian (nonaktif)
 *   POST   ?preview  { parentId, overrides }                 HTML pratinjau dengan data demo induk
 *   PUT    { id, name?, description?, overrides?, isActive? } ubah atau terbitkan
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
import { applyMasterOverrides, clearVariantCache, masterColorGroups, masterTokens, parseMasterOverrides, type MasterOverrides } from "@/lib/themeVariants";
import { masterColorUsage } from "@/lib/themeVariantCss";

export const dynamic = "force-dynamic";

/** Master induk yang sah: tulisan tangan (bukan builder, bukan varian lain) dan berkasnya ada. */
async function loadParent(parentId: string) {
  const theme = await prisma.theme.findUnique({
    where: { id: parentId },
    select: { id: true, name: true, category: true, eventType: true, series: true, defaultMusicUrl: true, defaultMedia: true, builderSpec: true, parentTheme: true, masterOverrides: true },
  });
  if (!theme) return { error: "Tema induk tidak ditemukan.", status: 404 } as const;
  if (theme.builderSpec !== null || theme.masterOverrides !== null) return { error: "Varian hanya bisa dibuat dari tema master bawaan (tulisan tangan).", status: 409 } as const;
  const entry = resolveThemeEntry(theme.id);
  if (!entry) return { error: "Berkas master tema induk tidak ditemukan.", status: 404 } as const;
  const html = fs.readFileSync(masterFilePath(entry.eventType, entry.style, entry.file), "utf-8");
  return { theme, html } as const;
}

function tokenPayload(html: string) {
  return { colorGroups: masterColorGroups(html), fonts: masterTokens(html).fonts, usage: masterColorUsage(html) };
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

    return NextResponse.json({ error: "Parameter parent atau id wajib diisi." }, { status: 400 });
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

    try {
      await ensureOverrideFonts(parsed.value);
    } catch (err) {
      if (err instanceof FontError) return NextResponse.json({ error: err.message }, { status: 400 });
      throw err;
    }

    if (new URL(req.url).searchParams.has("preview")) {
      const data = (await composeInvitationData(buildDemoInvitation(parent.theme.id, undefined, parent.theme.eventType))) as Record<string, any>;
      const html = await renderTemplateFile(parent.theme.id, data, { eventType: parent.theme.eventType, templateSource: applyMasterOverrides(parent.html, parsed.value) });
      return NextResponse.json({ success: true, html });
    }

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
    const id = typeof input.id === "string" ? input.id : "";
    const variant = await prisma.theme.findUnique({ where: { id }, select: { id: true, parentTheme: true, masterOverrides: true, isActive: true } });
    if (!variant?.parentTheme || variant.masterOverrides === null) return NextResponse.json({ error: "Varian tema tidak ditemukan." }, { status: 404 });
    const parent = await loadParent(variant.parentTheme);
    if ("error" in parent) return NextResponse.json({ error: parent.error }, { status: parent.status });

    const data: Prisma.ThemeUpdateInput = {};
    if (input.overrides !== undefined) {
      const parsed = parseMasterOverrides(input.overrides, parent.html);
      if (!parsed.ok) return NextResponse.json({ error: "Override tidak valid.", details: parsed.errors }, { status: 400 });
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
