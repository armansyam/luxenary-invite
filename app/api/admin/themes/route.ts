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
  { id: "kalandra", name: "Kalandra", category: "premium", series: "Premium", description: "Modern, Elegan & Minimalis", isPremium: true, sortOrder: 1, isActive: true },
  { id: "valente", name: "Valente", category: "premium", series: "Premium", description: "High-Fashion, Editorial & Mewah", isPremium: true, sortOrder: 2, isActive: true },
  { id: "aurelia", name: "Aurelia", category: "premium", series: "Premium", description: "Romantis, Sinematik & Anggun", isPremium: true, sortOrder: 3, isActive: true },
  { id: "artisan", name: "Artisan", category: "premium", series: "Premium", description: "Artistik, Hangat & Vintage", isPremium: true, sortOrder: 4, isActive: true },
  { id: "prameswari", name: "Prameswari", category: "traditional", series: "Traditional", description: "Sakral, Megah & Royal Keraton", isPremium: false, sortOrder: 5, isActive: true },
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, category, description, series, isPremium, isActive, sortOrder } = body;

    if (!id || !name) {
      return NextResponse.json({ error: "ID Tema dan Nama Tema wajib diisi" }, { status: 400 });
    }

    const cleanId = id.toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");

    const existing = await prisma.theme.findUnique({ where: { id: cleanId } });
    if (existing) {
      return NextResponse.json({ error: `Tema dengan ID "${cleanId}" sudah ada.` }, { status: 409 });
    }

    const newTheme = await prisma.theme.create({
      data: {
        id: cleanId,
        name: name.trim(),
        category: category || "modern",
        description: description || "",
        series: series || (category === "traditional" ? "Traditional" : category === "premium" ? "Premium" : "Modern"),
        isPremium: Boolean(isPremium),
        isActive: isActive !== false,
        sortOrder: Number(sortOrder || 99),
      },
    });

    return NextResponse.json({ success: true, theme: newTheme });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json();
    const { id, name, category, description, series, isPremium, isActive, sortOrder } = body;

    if (!id) {
      return NextResponse.json({ error: "ID Tema wajib disertakan" }, { status: 400 });
    }

    const updated = await prisma.theme.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(category !== undefined && { category }),
        ...(description !== undefined && { description }),
        ...(series !== undefined && { series }),
        ...(isPremium !== undefined && { isPremium: Boolean(isPremium) }),
        ...(isActive !== undefined && { isActive: Boolean(isActive) }),
        ...(sortOrder !== undefined && { sortOrder: Number(sortOrder) }),
      },
    });

    return NextResponse.json({ success: true, theme: updated });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
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
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
