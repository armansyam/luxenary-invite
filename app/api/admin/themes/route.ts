import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const DEFAULT_THEMES = [
  { id: "kalandra", name: "Kalandra", category: "modern", series: "Modern", description: "Modern, Elegan & Minimalis", isPremium: true, sortOrder: 1, isActive: true },
  { id: "valente", name: "Valente", category: "modern", series: "Modern", description: "High-Fashion, Editorial & Mewah", isPremium: true, sortOrder: 2, isActive: true },
  { id: "aurelia", name: "Aurelia", category: "modern", series: "Modern", description: "Romantis, Sinematik & Anggun", isPremium: true, sortOrder: 3, isActive: true },
  { id: "artisan", name: "Artisan", category: "modern", series: "Modern", description: "Artistik, Hangat & Vintage", isPremium: true, sortOrder: 4, isActive: true },
  { id: "prameswari", name: "Prameswari", category: "traditional", series: "Traditional", description: "Sakral, Megah & Royal Keraton", isPremium: false, sortOrder: 5, isActive: true },
];

export async function GET() {
  try {
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
        series: series || (category === "traditional" ? "Traditional" : "Modern"),
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
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "ID Tema wajib disertakan" }, { status: 400 });
    }

    await prisma.theme.delete({ where: { id } });
    return NextResponse.json({ success: true, message: `Tema ${id} berhasil dihapus` });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
