import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
import { readFormBody, readJsonBody } from "@/lib/requestBody";
import { removeIfExists } from "@/lib/fsSafe";
import { EventType, Prisma } from "@prisma/client";
import { validateThemeDefaultMedia, type ThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { masterDir, masterPathOf } from "@/lib/themePaths";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const dbThemes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });

    const themeSettingKeys = dbThemes.map((t) => `theme_demo_${t.id.toLowerCase()}`);
    const themeSettings = await prisma.adminSetting.findMany({
      where: { key: { in: themeSettingKeys } },
      select: { key: true, value: true, updatedAt: true },
    });

    const themeCustomDataMap: Record<string, { data: any; updatedAt: number }> = {};
    for (const s of themeSettings) {
      const themeId = s.key.replace("theme_demo_", "");
      try {
        themeCustomDataMap[themeId] = {
          data: JSON.parse(s.value),
          updatedAt: s.updatedAt ? new Date(s.updatedAt).getTime() : 1,
        };
      } catch (err) {
        logger.warn("AdminThemes", "Data demo kustom bukan JSON valid; tema memakai bawaan di daftar", { key: s.key, error: err instanceof Error ? err.message : String(err) });
      }
    }

    const themes = dbThemes.map((t) => {
      const themeKey = t.id.toLowerCase();
      const customEntry = themeCustomDataMap[themeKey];
      const customData = customEntry?.data;

      const rawThumbMobile = customData?.thumbnailMobileUrl || `/demo/${themeKey}/thumbnail_mobile.webp`;
      const rawThumbDesktop = customData?.thumbnailDesktopUrl || `/demo/${themeKey}/thumbnail_desktop.webp`;

      return {
        ...t,
        thumbnailMobile: rawThumbMobile,
        thumbnailDesktop: rawThumbDesktop,
      };
    });

    return NextResponse.json({ success: true, themes });
  } catch (error) {
    return routeError("AdminThemes", error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    let id = "";
    let name = "";
    let category = "modern";
    let description = "";
    let series = "";
    let isActive = true;
    let sortOrder = 99;
    let defaultMusicUrl = "";
    let eventType = "WEDDING";
    let file: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await readFormBody(req);
      id = (formData.get("id") as string) || "";
      name = (formData.get("name") as string) || "";
      category = (formData.get("category") as string) || "modern";
      description = (formData.get("description") as string) || "";
      series = (formData.get("series") as string) || "";
      if (formData.has("eventType")) eventType = (formData.get("eventType") as string) || "WEDDING";
      isActive = formData.get("isActive") === null ? true : formData.get("isActive") === "true";
      sortOrder = Number(formData.get("sortOrder") || 99);
      if (formData.has("defaultMusicUrl")) defaultMusicUrl = (formData.get("defaultMusicUrl") as string) || "";
      const rawFile = formData.get("file");
      if (rawFile && typeof rawFile === "object" && "arrayBuffer" in rawFile) {
        file = rawFile as File;
      }
    } else {
      const body = (await readJsonBody(req)) ?? {};
      id = body.id || "";
      name = body.name || "";
      category = body.category || "modern";
      description = body.description || "";
      series = body.series || "";
      if (body.eventType) eventType = body.eventType || "WEDDING";
      isActive = body.isActive !== false;
      sortOrder = Number(body.sortOrder || 99);
      if (body.defaultMusicUrl !== undefined) defaultMusicUrl = body.defaultMusicUrl || "";
    }

    if (!id || !name) {
      return NextResponse.json({ error: "ID Tema dan Nama Tema wajib diisi" }, { status: 400 });
    }

    // eventType menjadi nama folder tujuan berkas master; nilai di luar enum (mis. "../..") keluar dari themes/.
    eventType = eventType.toUpperCase();
    if (!(Object.values(EventType) as string[]).includes(eventType)) {
      return NextResponse.json({ error: "Jenis acara tema tidak valid." }, { status: 400 });
    }

    const cleanId = id.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
    if (!cleanId) {
      return NextResponse.json({ error: "ID Tema tidak valid." }, { status: 400 });
    }

    // Wajib upload file master .html untuk tema baru
    if (!file) {
      return NextResponse.json({ error: "File master template (.html) wajib diunggah untuk tema baru." }, { status: 400 });
    }

    if (!file.name.toLowerCase().endsWith(".html")) {
      return NextResponse.json({ error: "Format file tidak valid. File master wajib berekstensi .html." }, { status: 400 });
    }

    const existing = await prisma.theme.findUnique({ where: { id: cleanId } });
    if (existing) {
      return NextResponse.json({ error: `Tema dengan ID "${cleanId}" sudah ada.` }, { status: 409 });
    }

    const rawCat = category.toLowerCase();
    const cat = (rawCat === "premium" || rawCat === "minimalist" ? "minimalist" : rawCat === "traditional" ? "traditional" : "modern") as "minimalist" | "modern" | "traditional";
    const fs = await import("fs/promises");
    const path = await import("path");

    // 1. Simpan fisik master file ke folder themes/[eventType]/[kategori]/[id].html
    const targetDir = masterDir(eventType, cat);
    await fs.mkdir(targetDir, { recursive: true });
    const targetFilePath = path.join(targetDir, `${cleanId}.html`);

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.writeFile(targetFilePath, buffer, "utf-8");

    // 2. Simpan record tema ke database
    const newTheme = await prisma.theme.create({
      data: {
        id: cleanId,
        name: name.trim(),
        category: cat,
        eventType: eventType as EventType,
        description: description || "",
        series: series || (cat === "traditional" ? "Traditional" : cat === "minimalist" ? "Minimalist" : "Modern"),
        isActive: isActive !== false,
        sortOrder: Number(sortOrder || 99),
        defaultMusicUrl: defaultMusicUrl || null,
      },
    });

    // 3. Otomatis kompilasi file demo statis ke public/demo/[id]/index.html
    try {
      const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
      await compileAndSaveStaticDemo(cleanId);
    } catch (demoErr) {
      logger.error("AdminThemes", "Tema tersimpan tetapi demo statis gagal dibuat", demoErr, { themeId: cleanId });
    }

    // 4. Invalidate Next.js cache
    const { revalidatePath } = await import("next/cache");
    revalidatePath("/demo");
    revalidatePath("/demo/[theme]", "page");
    revalidatePath("/admin");
    revalidatePath("/");

    return NextResponse.json({
      success: true,
      theme: newTheme,
      message: `Tema ${newTheme.name} berhasil ditambahkan dan demo statis otomatis terbuat.`
    });
  } catch (error) {
    return routeError("AdminThemes", error);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    let id = "";
    let name: string | undefined;
    let category: string | undefined;
    let description: string | undefined;
    let series: string | undefined;
    let isActive: boolean | undefined;
    let sortOrder: number | undefined;
    let defaultMusicUrl: string | undefined;
    let defaultMedia: ThemeDefaultMedia | undefined;
    let file: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await readFormBody(req);
      id = (formData.get("id") as string) || "";
      if (formData.has("name")) name = (formData.get("name") as string) || "";
      if (formData.has("category")) category = (formData.get("category") as string) || "";
      if (formData.has("description")) description = (formData.get("description") as string) || "";
      if (formData.has("series")) series = (formData.get("series") as string) || "";
      if (formData.has("isActive")) isActive = formData.get("isActive") === "true";
      if (formData.has("sortOrder")) sortOrder = Number(formData.get("sortOrder"));
      if (formData.has("defaultMusicUrl")) defaultMusicUrl = (formData.get("defaultMusicUrl") as string) || "";
      const rawFile = formData.get("file");
      if (rawFile && typeof rawFile === "object" && "arrayBuffer" in rawFile) {
        file = rawFile as File;
      }
    } else {
      const body = (await readJsonBody(req)) ?? {};
      id = body.id || "";
      name = body.name;
      category = body.category;
      description = body.description;
      series = body.series;
      if (body.isActive !== undefined) isActive = Boolean(body.isActive);
      if (body.sortOrder !== undefined) sortOrder = Number(body.sortOrder);
      if (body.defaultMusicUrl !== undefined) defaultMusicUrl = body.defaultMusicUrl || "";
      if (body.defaultMedia !== undefined) {
        const checked = validateThemeDefaultMedia(body.defaultMedia);
        if (!checked.ok) return NextResponse.json({ error: checked.error }, { status: 400 });
        defaultMedia = checked.value;
      }
    }

    if (!id) {
      return NextResponse.json({ error: "ID Tema wajib disertakan" }, { status: 400 });
    }

    const cleanId = id.toLowerCase().trim();
    const existing = await prisma.theme.findUnique({ where: { id: cleanId } });
    if (!existing) {
      return NextResponse.json({ error: "Tema tidak ditemukan" }, { status: 404 });
    }

    if (isActive === true && !existing.isActive) {
      const { builderPublishIssues } = await import("@/lib/themeBuilder/server");
      const issues = await builderPublishIssues(cleanId);
      if (issues?.length) {
        return NextResponse.json({ error: "Tema builder belum lolos pemeriksaan. Buka di Theme Builder untuk memperbaikinya.", issues }, { status: 422 });
      }
    }

    const fs = await import("fs/promises");
    const path = await import("path");
    const rawTargetCat = (category || existing.category).toLowerCase();
    const targetCat = (rawTargetCat === "premium" || rawTargetCat === "minimalist" ? "minimalist" : rawTargetCat === "traditional" ? "traditional" : "modern");

    // Jika ada file master baru yang diunggah
    if (file) {
      if (!file.name.toLowerCase().endsWith(".html")) {
        return NextResponse.json({ error: "Format file tidak valid. Wajib berekstensi .html." }, { status: 400 });
      }

      const targetDir = masterDir(existing.eventType, targetCat);
      await fs.mkdir(targetDir, { recursive: true });
      const targetFilePath = path.join(targetDir, `${cleanId}.html`);

      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      await fs.writeFile(targetFilePath, buffer, "utf-8");

      // Kompilasi ulang demo statis dengan master HTML baru
      try {
        const { compileAndSaveStaticDemo } = await import("@/lib/demoPublisher");
        await compileAndSaveStaticDemo(cleanId);
      } catch (demoErr) {
        logger.error("AdminThemes", "Demo statis gagal diperbarui", demoErr, { themeId: cleanId });
      }
    }

    const updated = await prisma.theme.update({
      where: { id: cleanId },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category: targetCat }),
        ...(description !== undefined && { description }),
        ...(series !== undefined && { series }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
        ...(defaultMusicUrl !== undefined && { defaultMusicUrl: defaultMusicUrl || null }),
        ...(defaultMedia !== undefined && { defaultMedia }),
        // Master yang diganti unggahan manual bukan lagi hasil builder; spesifikasi lama akan menimpanya bila dibuka di builder.
        ...(file && { builderSpec: Prisma.DbNull }),
      },
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/api/public/themes");
    revalidatePath("/demo");

    return NextResponse.json({
      success: true,
      theme: updated,
      message: `Tema ${updated.name} berhasil diperbarui.`
    });
  } catch (error) {
    return routeError("AdminThemes", error);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID Tema wajib disertakan" }, { status: 400 });
    }

    const existingTheme = await prisma.theme.findUnique({ where: { id } });
    if (!existingTheme) {
      return NextResponse.json({ error: "Tema tidak ditemukan" }, { status: 404 });
    }

    const usedBy = await prisma.invitation.count({ where: { themeId: id } });
    if (usedBy > 0) {
      return NextResponse.json({
        error: `Tema masih dipakai ${usedBy} undangan dan tidak bisa dihapus. Nonaktifkan tema agar tidak muncul di katalog.`,
      }, { status: 409 });
    }

    await prisma.theme.delete({
      where: { id }
    });

    // 2. Remove any custom demo settings associated with this theme from admin_settings
    await prisma.adminSetting.deleteMany({
      where: { key: `theme_demo_${id.toLowerCase()}` },
    });

    const path = await import("path");

    // 3. Remove the master HTML file physically from the themes/ folder
    const categoryDir = existingTheme.category.toLowerCase();
    // Master ada di folder jenis acaranya; tema lama ada yang tersimpan di folder pernikahan, jadi keduanya dibersihkan.
    const possiblePaths = [
      masterPathOf(existingTheme.eventType || "WEDDING", categoryDir, id),
      masterPathOf("WEDDING", categoryDir, id),
    ];
    for (const p of possiblePaths) await removeIfExists(p);

    // 4. Also remove the compiled static demo directory so it no longer appears in catalog
    await removeIfExists(path.join(process.cwd(), "public", "demo", id.toLowerCase()), { recursive: true });
    await removeIfExists(path.join(process.cwd(), "public", "uploads", "demo", id.toLowerCase()), { recursive: true });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/demo");
    revalidatePath("/api/public/themes");

    return NextResponse.json({ success: true, message: `Tema ${id} beserta file masternya berhasil dihapus permanen (Hard Delete)` });
  } catch (error) {
    return routeError("AdminThemes", error);
  }
}
