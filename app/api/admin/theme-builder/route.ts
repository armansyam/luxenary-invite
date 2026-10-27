import fs from "fs";
import path from "path";
import { createHash } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { logger } from "@/lib/logger";
import { masterTemplateCache } from "@/lib/cache";
import { removeIfExists } from "@/lib/fsSafe";
import { parseBuilderSpec } from "@/lib/themeBuilder/spec";
import { ensureSpecFonts } from "@/lib/themeBuilder/fonts";
import { fitSpecFrames } from "@/lib/themeBuilder/frameWindow";
import { seedSpecFromMaster } from "@/lib/themeBuilder/legacySeed";
import { masterPathOf } from "@/lib/themePaths";
import {
  BUILDER_CATEGORIES,
  builderDefaultMedia,
  builderMasterPath,
  builderPublishIssues,
  compileAndAudit,
  isSafeThemeId,
  recordBuilderAudit,
  slugifyThemeId,
  storedBuilderSpec,
  themeIdTaken,
  type BuilderCategory,
} from "@/lib/themeBuilder/server";

export const dynamic = "force-dynamic";

const SERIES: Record<BuilderCategory, string> = { minimalist: "Minimalist", modern: "Modern", traditional: "Traditional" };

function readMeta(body: Record<string, unknown>) {
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim().slice(0, 300) : "";
  const category = (BUILDER_CATEGORIES as string[]).includes(String(body.category)) ? (body.category as BuilderCategory) : null;
  return { name, description, category };
}

async function refreshPublicTheme(themeId: string, isActive: boolean) {
  masterTemplateCache.clear();
  if (isActive) {
    try {
      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(themeId);
    } catch (err) {
      logger.error("ThemeBuilder", "Master tersimpan tetapi demo statis gagal dibuat", err, { themeId });
    }
  }
  const { revalidatePath } = await import("next/cache");
  revalidatePath("/");
  revalidatePath("/demo");
  revalidatePath("/api/public/themes");
  // Katalog publik berumur s-maxage 24 jam di edge; tanpa purge tema yang baru terbit/ditarik baru terlihat keesokan harinya.
  const purge = await purgeCloudflareCache({ purgeEverything: true });
  if (!purge.success && !purge.skipped) logger.error("ThemeBuilder", "Purge cache Cloudflare gagal setelah perubahan tema", purge.error ?? purge.errors, { themeId });
}

/** Penanda versi spesifikasi tersimpan; admin kedua yang menyimpan dari salinan basi ditolak, bukan menimpa diam-diam. */
function specEtag(value: unknown): string {
  return createHash("sha1").update(JSON.stringify(value ?? null)).digest("hex").slice(0, 16);
}

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const params = new URL(req.url).searchParams;

    // Tema pernikahan tulisan tangan yang dapat dijadikan titik awal rancangan baru.
    if (params.get("legacy")) {
      const themes = await prisma.theme.findMany({
        where: { builderSpec: { equals: Prisma.DbNull }, eventType: "WEDDING" },
        select: { id: true, name: true, category: true },
        orderBy: { name: "asc" },
      });
      return NextResponse.json({ success: true, themes });
    }

    const from = params.get("from");
    if (from) {
      const legacy = await prisma.theme.findUnique({ where: { id: from }, select: { id: true, name: true, category: true, description: true, eventType: true, builderSpec: true } });
      if (!legacy || legacy.eventType !== "WEDDING" || legacy.builderSpec) {
        return NextResponse.json({ error: "Hanya tema pernikahan tulisan tangan yang dapat dijadikan titik awal." }, { status: 404 });
      }
      const file = masterPathOf("WEDDING", legacy.category, legacy.id);
      if (!fs.existsSync(file)) return NextResponse.json({ error: "Berkas master tema tidak ditemukan." }, { status: 404 });
      const seed = seedSpecFromMaster(fs.readFileSync(file, "utf-8"));
      return NextResponse.json({
        success: true,
        theme: { id: "", name: `${legacy.name} Builder`, category: legacy.category, description: `Titik awal dari tema ${legacy.name}.` },
        spec: seed.spec,
        report: { source: legacy.name, found: seed.found, missing: seed.missing, textureFound: seed.textureFound, hexOutsideRoot: seed.hexOutsideRoot },
      });
    }

    const id = params.get("id");
    if (!id) {
      const themes = await prisma.theme.findMany({
        where: { builderSpec: { not: Prisma.DbNull } },
        select: { id: true, name: true, category: true, isActive: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      });
      return NextResponse.json({ success: true, themes });
    }

    const theme = await prisma.theme.findUnique({
      where: { id },
      select: { id: true, name: true, category: true, description: true, isActive: true, builderSpec: true },
    });
    if (!theme) return NextResponse.json({ error: "Tema tidak ditemukan." }, { status: 404 });
    const spec = storedBuilderSpec(theme.builderSpec);
    if (!spec) {
      return NextResponse.json({ error: "Tema ini ditulis tangan sehingga tidak bisa dibuka di builder." }, { status: 409 });
    }
    const { builderSpec: stored, ...meta } = theme;
    return NextResponse.json({ success: true, theme: meta, spec, etag: specEtag(stored) });
  } catch (error) {
    return routeError("ThemeBuilder", error);
  }
}

/** Membuat draf tema baru dari spesifikasi builder; tema belum tampil di katalog sampai diterbitkan (PATCH). */
export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const { name, description, category } = readMeta(body);
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Nama tema wajib 2–60 karakter." }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Gaya tema tidak dikenali." }, { status: 400 });

    const themeId = typeof body.id === "string" && body.id.trim() ? body.id.trim().toLowerCase() : slugifyThemeId(name);
    if (!isSafeThemeId(themeId)) {
      return NextResponse.json({ error: "ID tema hanya boleh huruf kecil, angka, dan tanda hubung (2–40 karakter)." }, { status: 400 });
    }
    if (await themeIdTaken(themeId)) {
      return NextResponse.json({ error: `ID tema "${themeId}" sudah dipakai. Ganti nama atau ID tema.` }, { status: 409 });
    }

    const parsed = parseBuilderSpec(body.spec);
    if (!parsed.ok) return NextResponse.json({ error: "Rancangan tema tidak valid.", details: parsed.errors }, { status: 400 });

    await ensureSpecFonts(parsed.spec);
    const spec = await fitSpecFrames(parsed.spec);
    const { html, issues } = compileAndAudit(spec);
    if (issues.length) return NextResponse.json({ error: "Master hasil rancangan gagal diperiksa.", issues }, { status: 422 });

    const file = builderMasterPath(category, themeId);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, html, "utf-8");

    try {
      const maxOrder = await prisma.theme.aggregate({ _max: { sortOrder: true } });
      const theme = await prisma.theme.create({
        data: {
          id: themeId,
          name,
          description,
          category,
          eventType: parsed.spec.eventType,
          series: SERIES[category],
          isActive: false,
          sortOrder: (maxOrder._max.sortOrder ?? 0) + 1,
          builderSpec: spec as unknown as Prisma.InputJsonObject,
          defaultMedia: builderDefaultMedia(spec),
        },
        select: { id: true, name: true, category: true, description: true, isActive: true, builderSpec: true },
      });
      const { builderSpec: stored, ...meta } = theme;
      await recordBuilderAudit(req, guard.session, "THEME_BUILDER_CREATE", `Membuat draf tema builder ${meta.id} (${meta.name})`);
      return NextResponse.json({ success: true, theme: meta, etag: specEtag(stored) });
    } catch (err) {
      // Baris DB gagal dibuat (mis. ID direbut permintaan lain): berkas master yang baru ditulis tidak boleh tertinggal.
      await removeIfExists(file);
      throw err;
    }
  } catch (error) {
    return routeError("ThemeBuilder", error);
  }
}

/**
 * Menyimpan perubahan rancangan. Master di disk ditulis ulang; undangan klien yang sudah memakai tema ini tetap memakai
 * salinan master miliknya (data/drafts), sehingga tampilannya tidak berubah.
 */
export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const themeId = typeof body.id === "string" ? body.id : "";
    const existing = themeId ? await prisma.theme.findUnique({ where: { id: themeId } }) : null;
    if (!existing) return NextResponse.json({ error: "Tema tidak ditemukan." }, { status: 404 });
    if (!storedBuilderSpec(existing.builderSpec)) {
      return NextResponse.json({ error: "Tema ini ditulis tangan sehingga tidak bisa disimpan dari builder." }, { status: 409 });
    }

    // Admin lain menyimpan sesudah rancangan ini dibuka: tolak agar perubahannya tidak tertimpa tanpa sepengetahuan.
    if (typeof body.baseEtag === "string" && body.baseEtag !== specEtag(existing.builderSpec)) {
      return NextResponse.json({ error: "Tema ini sudah diubah admin lain sejak Anda membukanya. Muat ulang halaman agar perubahannya tidak tertimpa.", code: "STALE" }, { status: 409 });
    }

    const { name, description, category } = readMeta(body);
    if (name.length < 2 || name.length > 60) return NextResponse.json({ error: "Nama tema wajib 2–60 karakter." }, { status: 400 });
    if (!category) return NextResponse.json({ error: "Gaya tema tidak dikenali." }, { status: 400 });

    const parsed = parseBuilderSpec(body.spec);
    if (!parsed.ok) return NextResponse.json({ error: "Rancangan tema tidak valid.", details: parsed.errors }, { status: 400 });

    await ensureSpecFonts(parsed.spec);
    const spec = await fitSpecFrames(parsed.spec);
    const { html, issues } = compileAndAudit(spec);
    if (issues.length) return NextResponse.json({ error: "Master hasil rancangan gagal diperiksa.", issues }, { status: 422 });

    const file = builderMasterPath(category, themeId);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    await fs.promises.writeFile(file, html, "utf-8");
    if (existing.category !== category) await removeIfExists(builderMasterPath(existing.category as BuilderCategory, themeId));

    const theme = await prisma.theme.update({
      where: { id: themeId },
      data: { name, description, category, series: SERIES[category], builderSpec: spec as unknown as Prisma.InputJsonObject, defaultMedia: builderDefaultMedia(spec) },
      select: { id: true, name: true, category: true, description: true, isActive: true, builderSpec: true },
    });
    await refreshPublicTheme(themeId, theme.isActive);
    const { builderSpec: stored, ...meta } = theme;
    await recordBuilderAudit(req, guard.session, "THEME_BUILDER_SAVE", `Menyimpan tema builder ${meta.id}${meta.isActive ? " (aktif di katalog)" : ""}`);
    return NextResponse.json({ success: true, theme: meta, etag: specEtag(stored) });
  } catch (error) {
    return routeError("ThemeBuilder", error);
  }
}

/** Terbitkan ke katalog atau tarik kembali menjadi draf. Terbit hanya bila master di disk lolos audit blueprint. */
export async function PATCH(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const body = (await readJsonBody<Record<string, unknown>>(req)) ?? {};
    const themeId = typeof body.id === "string" ? body.id : "";
    if (typeof body.isActive !== "boolean") return NextResponse.json({ error: "Status terbit wajib diisi." }, { status: 400 });

    const issues = await builderPublishIssues(themeId);
    if (issues === null) return NextResponse.json({ error: "Tema builder tidak ditemukan." }, { status: 404 });
    if (body.isActive && issues.length) return NextResponse.json({ error: "Tema belum lolos pemeriksaan.", issues }, { status: 422 });

    const theme = await prisma.theme.update({
      where: { id: themeId },
      data: { isActive: body.isActive },
      select: { id: true, name: true, category: true, description: true, isActive: true },
    });
    await refreshPublicTheme(themeId, theme.isActive);
    await recordBuilderAudit(req, guard.session, theme.isActive ? "THEME_BUILDER_PUBLISH" : "THEME_BUILDER_UNPUBLISH", `${theme.isActive ? "Menerbitkan" : "Menarik"} tema builder ${theme.id} ${theme.isActive ? "ke" : "dari"} katalog`);
    return NextResponse.json({ success: true, theme });
  } catch (error) {
    return routeError("ThemeBuilder", error);
  }
}
