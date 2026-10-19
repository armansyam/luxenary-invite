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

    // Undangan menyimpan salinan URL lagu, bukan relasi: menghapus lagu yang dipakai membuat musik undangan itu hilang.
    const inUse = await prisma.invitation.count({ where: { musicUrl: existing.url } });
    if (inUse > 0) {
      return NextResponse.json(
        { error: `Lagu ini dipakai ${inUse} undangan dan tidak dapat dihapus. Nonaktifkan agar tidak muncul di pilihan klien baru.` },
        { status: 409 }
      );
    }

    await prisma.musicPreset.delete({
      where: { id },
    });

    // Hanya unggahan admin yang dihapus dari disk; preset bawaan di /public/music/ adalah berkas repo yang dibuat ulang oleh seed.
    if (existing.url.startsWith("/uploads/music/")) {
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
