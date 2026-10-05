import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

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
  } catch (error) {
    return routeError("AdminMusic", error, "Gagal memperbarui data musik");
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("themes");
    if (!guard.ok) return guard.response;

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
          logger.warn("AdminMusic", "Berkas lagu gagal dihapus; baris DB tetap dihapus", { filePath, error: unlinkErr instanceof Error ? unlinkErr.message : String(unlinkErr) });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Lagu berhasil dihapus",
    });
  } catch (error) {
    return routeError("AdminMusic", error, "Gagal menghapus musik");
  }
}
