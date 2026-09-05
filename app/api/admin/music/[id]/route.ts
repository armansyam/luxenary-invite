import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    const existing = await prisma.musicPreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lagu tidak ditemukan" }, { status: 404 });
    }

    const updated = await prisma.musicPreset.update({
      where: { id },
      data: {
        title: body.title !== undefined ? String(body.title).trim() : undefined,
        composer: body.composer !== undefined ? (body.composer ? String(body.composer).trim() : null) : undefined,
        genre: body.genre !== undefined ? (body.genre ? String(body.genre).trim() : null) : undefined,
        isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
        sortOrder: body.sortOrder !== undefined ? Number(body.sortOrder) : undefined,
      },
    });

    return NextResponse.json({
      success: true,
      music: updated,
    });
  } catch (error: any) {
    console.error("[Admin Update Music Error]:", error);
    return NextResponse.json({ error: "Gagal memperbarui data musik" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { id } = await params;

    const existing = await prisma.musicPreset.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Lagu tidak ditemukan" }, { status: 404 });
    }

    // Delete record from database
    await prisma.musicPreset.delete({
      where: { id },
    });

    // Clean up physical file if it's stored locally in /public/music/
    if (existing.url.startsWith("/music/")) {
      const filePath = path.join(process.cwd(), "public", existing.url);
      if (fs.existsSync(filePath)) {
        try {
          await fs.promises.unlink(filePath);
        } catch (unlinkErr) {
          console.warn("[Admin Delete Music File Warning]:", unlinkErr);
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lagu berhasil dihapus",
    });
  } catch (error: any) {
    console.error("[Admin Delete Music Error]:", error);
    return NextResponse.json({ error: "Gagal menghapus musik" }, { status: 500 });
  }
}
