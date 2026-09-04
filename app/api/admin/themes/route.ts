import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
  if (!session?.user || !isAdmin) {
    return false;
  }
  return true;
}

export const DEFAULT_THEMES = [
  // Premium Series (4)
  { id: "kalandra", name: "Kalandra", category: "premium", series: "Premium", description: "THE WEDDING OF — Modern, Elegan & Minimalis Editorial", isPremium: true, sortOrder: 1, isActive: true },
  { id: "valente", name: "Valente", category: "premium", series: "Premium", description: "A CELEBRATION OF LOVE — Elegan, Mewah & Berkelas", isPremium: true, sortOrder: 2, isActive: true },
  { id: "aurelia", name: "Aurelia", category: "premium", series: "Premium", description: "ROYAL LUXURY CELEBRATION — Sentuhan Emas & Kemegahan Kerajaan", isPremium: true, sortOrder: 3, isActive: true },
  { id: "artisan", name: "Artisan", category: "premium", series: "Premium", description: "HANDCRAFTED IN LOVE — Sentuhan Artistik & Tipografi Organik", isPremium: true, sortOrder: 4, isActive: true },
  // Modern Series (6)
  { id: "ameera", name: "Ameera", category: "modern", series: "Modern", description: "CONTEMPORARY HERITAGE — Perpaduan Estetika Timur & Modern", isPremium: false, sortOrder: 5, isActive: true },
  { id: "chronicle", name: "Chronicle", category: "modern", series: "Modern", description: "HIGH-FASHION VOGUE EDITORIAL — Estetika Majalah Mode Kontemporer", isPremium: false, sortOrder: 6, isActive: true },
  { id: "lumina", name: "Lumina", category: "modern", series: "Modern", description: "MINIMALIST GLASS & CINEMA — Sinematik Bersih dengan Efek Glassmorphism", isPremium: false, sortOrder: 7, isActive: true },
  { id: "papercut", name: "Papercut", category: "modern", series: "Modern", description: "TEXTURED CRAFT & MINIMALIST — Keanggunan Tekstur Kertas Alami", isPremium: false, sortOrder: 8, isActive: true },
  { id: "solaria", name: "Solaria", category: "modern", series: "Modern", description: "WARM SUNSET BOTANICAL — Kehangatan Golden Hour & Botani Segar", isPremium: false, sortOrder: 9, isActive: true },
  { id: "wave", name: "Wave", category: "modern", series: "Modern", description: "DYNAMIC FLUID OCEAN — Aliran Gelombang Modern Dinamis & Segar", isPremium: false, sortOrder: 10, isActive: true },
  // Traditional Series (5)
  { id: "badrika", name: "Badrika", category: "traditional", series: "Traditional", description: "Klasik Jawa Ningrat dengan Ornamen Khas Keraton", isPremium: false, sortOrder: 11, isActive: true },
  { id: "candani", name: "Candani", category: "traditional", series: "Traditional", description: "Tradisi Nusantara Elegan dengan Siluet Padi & Nuansa Tanah", isPremium: false, sortOrder: 12, isActive: true },
  { id: "dillalucky", name: "Dilla Lucky", category: "traditional", series: "Traditional", description: "Kehangatan Adat Melayu & Padang Modern", isPremium: false, sortOrder: 13, isActive: true },
  { id: "mayang", name: "Mayang", category: "traditional", series: "Traditional", description: "Kemegahan Adat Sunda Silih Wangi yang Anggun", isPremium: false, sortOrder: 14, isActive: true },
  { id: "prameswari", name: "Prameswari", category: "traditional", series: "Traditional", description: "Royal Heritage Tradisional Agung Nan Sarat Makna", isPremium: false, sortOrder: 15, isActive: true },
];

export async function GET() {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    let themes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
    if (themes.length === 0) {
      for (const t of DEFAULT_THEMES) {
        await prisma.theme.upsert({
          where: { id: t.id },
          create: t,
          update: t,
        });
      }
      themes = await prisma.theme.findMany({ orderBy: { sortOrder: "asc" } });
    }
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
    let isPremium = false;
    let isActive = true;
    let sortOrder = 99;
    let file: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      id = (formData.get("id") as string) || "";
      name = (formData.get("name") as string) || "";
      category = (formData.get("category") as string) || "modern";
      description = (formData.get("description") as string) || "";
      series = (formData.get("series") as string) || "";
      isPremium = formData.get("isPremium") === "true";
      isActive = formData.get("isActive") === null ? true : formData.get("isActive") === "true";
      sortOrder = Number(formData.get("sortOrder") || 99);
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
      isPremium = Boolean(body.isPremium);
      isActive = body.isActive !== false;
      sortOrder = Number(body.sortOrder || 99);
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

    const cat = category.toLowerCase() as "premium" | "modern" | "traditional";
    const fs = await import("fs/promises");
    const path = await import("path");

    // 1. Simpan fisik master file ke folder themes/[kategori]/[id].html
    const targetDir = path.join(process.cwd(), "themes", cat);
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
        description: description || "",
        series: series || (cat === "traditional" ? "Traditional" : cat === "premium" ? "Premium" : "Modern"),
        isPremium: Boolean(isPremium || cat === "premium"),
        isActive: isActive !== false,
        sortOrder: Number(sortOrder || 99),
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
    let isPremium: boolean | undefined;
    let isActive: boolean | undefined;
    let sortOrder: number | undefined;
    let file: File | null = null;

    const contentType = req.headers.get("content-type") || "";
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      id = (formData.get("id") as string) || "";
      if (formData.has("name")) name = (formData.get("name") as string) || "";
      if (formData.has("category")) category = (formData.get("category") as string) || "";
      if (formData.has("description")) description = (formData.get("description") as string) || "";
      if (formData.has("series")) series = (formData.get("series") as string) || "";
      if (formData.has("isPremium")) isPremium = formData.get("isPremium") === "true";
      if (formData.has("isActive")) isActive = formData.get("isActive") === "true";
      if (formData.has("sortOrder")) sortOrder = Number(formData.get("sortOrder"));
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
      if (body.isPremium !== undefined) isPremium = Boolean(body.isPremium);
      if (body.isActive !== undefined) isActive = Boolean(body.isActive);
      if (body.sortOrder !== undefined) sortOrder = Number(body.sortOrder);
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
    const targetCat = (category || existing.category).toLowerCase();

    // Jika ada file master baru yang diunggah
    if (file) {
      if (!file.name.toLowerCase().endsWith(".html")) {
        return NextResponse.json({ error: "Format file tidak valid. Wajib berekstensi .html." }, { status: 400 });
      }

      const targetDir = path.join(process.cwd(), "themes", targetCat);
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
        ...(isPremium !== undefined && { isPremium: Boolean(isPremium) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    const { revalidatePath } = await import("next/cache");
    revalidatePath("/demo");
    revalidatePath("/demo/[theme]", "page");
    revalidatePath("/admin");
    revalidatePath("/");

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

    // HARD DELETE: Karena sistem sudah menggunakan Arsitektur Piring (Draft mandiri),
    // kita bisa menghapus tema ini secara permanen dari database.
    await prisma.theme.delete({ 
      where: { id }
    });

    const { promises: fs } = await import("fs");
    const path = await import("path");

    // Remove the master HTML file physically from the themes/ folder
    try {
      const categoryDir = existingTheme.category.toLowerCase();
      const masterPath = path.join(process.cwd(), "themes", categoryDir, `${id.toLowerCase()}.html`);
      await fs.unlink(masterPath);
    } catch {
      // Ignore if master file is already gone
    }

    // Also remove the compiled static demo directory so it no longer appears in catalog
    try {
      const demoDir = path.join(process.cwd(), "public", "demo", id.toLowerCase());
      await fs.rm(demoDir, { recursive: true, force: true });
    } catch {
      // Non-fatal: demo dir may not exist yet
    }

    return NextResponse.json({ success: true, message: `Tema ${id} beserta file masternya berhasil dihapus permanen (Hard Delete)` });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
