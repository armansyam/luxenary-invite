import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/memories/lock?invitationId=xxx
 * Mengunci upload momen tamu secara permanen untuk undangan milik client.
 * Dipanggil otomatis setelah client berhasil mengunduh ZIP momen.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const invitationId = searchParams.get("invitationId");

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId is required" }, { status: 400 });
    }

    // Verifikasi kepemilikan undangan
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { userId: true, memoriesUploadLocked: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = (session.user as any).isAdmin === true ||
      (session.user as any).role === "ADMIN" ||
      (session.user as any).role === "SUPER_ADMIN";

    if (!isAdmin && invitation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: Bukan undangan Anda" }, { status: 403 });
    }

    // Idempotent: jika sudah terkunci, kembalikan sukses tanpa update
    if (invitation.memoriesUploadLocked) {
      return NextResponse.json({ success: true, alreadyLocked: true });
    }

    await prisma.invitation.update({
      where: { id: invitationId },
      data: { memoriesUploadLocked: true },
    });

    return NextResponse.json({ success: true, locked: true });
  } catch (error: any) {
    console.error("[Memories Lock API Error]", error);
    const msg = process.env.NODE_ENV === "production" ? "Gagal mengunci upload momen" : (error.message || "Gagal mengunci upload momen");
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
