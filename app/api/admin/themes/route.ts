import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { logger } from "@/lib/logger";
import { removeIfExists } from "@/lib/fsSafe";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const { hasAdminPermission } = await import("@/lib/adminPermissions");
  if (!session?.user || !hasAdminPermission(session.user as any, "themes")) {
    return false;
  }
  return true;
}

export async function GET() {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

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
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

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
      const formData = await req.formData();
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
      const body = await req.json();
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
    const eventFolder = eventType.toUpperCase() === "GATHERING" ? "general" : eventType.toLowerCase();
    const targetDir = path.join(process.cwd(), "themes", eventFolder, cat);
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
        eventType: (eventType as any) || "WEDDING",
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
      console.error("Warning: Gagal membuat demo statis otomatis:", demoErr);
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
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    let id = "";
    let name: string | undefined;
    let category: string | undefined;
    let description: string | undefined;
    let series: string | undefined;
    let isActive: boolean | undefined;
    let sortOrder: number | undefined;
    let defaultMusicUrl: string | undefined;
    let file: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
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
      const body = await req.json();
      id = body.id || "";
      name = body.name;
      category = body.category;
      description = body.description;
      series = body.series;
      if (body.isActive !== undefined) isActive = Boolean(body.isActive);
      if (body.sortOrder !== undefined) sortOrder = Number(body.sortOrder);
      if (body.defaultMusicUrl !== undefined) defaultMusicUrl = body.defaultMusicUrl || "";
    }

    if (!id) {
      return NextResponse.json({ error: "ID Tema wajib disertakan" }, { status: 400 });
    }

    const cleanId = id.toLowerCase().trim();
    const existing = await prisma.theme.findUnique({ where: { id: cleanId } });
    if (!existing) {
      return NextResponse.json({ error: "Tema tidak ditemukan" }, { status: 404 });
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

      const eventFolder = (existing.eventType || "WEDDING").toLowerCase();
      const targetDir = path.join(process.cwd(), "themes", eventFolder, targetCat);
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
        console.error("Warning: Gagal memperbarui demo statis:", demoErr);
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
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

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
    const evType = (existingTheme.eventType || "WEDDING").toUpperCase();
    const evFolder = evType === "GATHERING" ? "general" : evType.toLowerCase();
    // Lokasi master bergantung pada jenis acara dan riwayat folder tema, jadi ketiga kemungkinan dibersihkan.
    const possiblePaths = [
      path.join(process.cwd(), "themes", evFolder, categoryDir, `${id.toLowerCase()}.html`),
      path.join(process.cwd(), "themes", "wedding", categoryDir, `${id.toLowerCase()}.html`),
      path.join(process.cwd(), "themes", categoryDir, `${id.toLowerCase()}.html`),
    ];
    for (const p of possiblePaths) await removeIfExists(p);

    // 4. Also remove the compiled static demo directory so it no longer appears in catalog
    await removeIfExists(path.join(process.cwd(), "public", "demo", id.toLowerCase()), { recursive: true });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/demo");
    revalidatePath("/api/public/themes");

    return NextResponse.json({ success: true, message: `Tema ${id} beserta file masternya berhasil dihapus permanen (Hard Delete)` });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
