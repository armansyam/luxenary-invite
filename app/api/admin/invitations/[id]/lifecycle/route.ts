import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { deleteSubdomainHtmlOnly } from "@/lib/staticPublisher";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/[id]/lifecycle
 * Endpoint khusus Super Admin untuk mengelola siklus hidup undangan:
 * - CLOSE_TO_GALLERY: Menutup undangan seketika dan mengalihkan URL ke Galeri Momen
 * - EXTEND_GALLERY: Memperpanjang masa simpan galeri foto tamu (+30 hari)
 * - UPDATE_EVENT_DATE: Mengedit tanggal acara pernikahan secara darurat oleh Admin
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, days = 30, newDate } = body;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();

    if (action === "CLOSE_TO_GALLERY") {
      // 1. Hapus subdomain HTML agar URL otomatis rewrite ke galeri
      await deleteSubdomainHtmlOnly(id);

      // 2. Set status EVENT_FINISHED
      const updated = await prisma.invitation.update({
        where: { id },
        data: { status: "EVENT_FINISHED" },
      });

      return NextResponse.json({
        success: true,
        status: updated.status,
        message: "Undangan berhasil ditutup dan dialihkan ke Galeri Momen Acara.",
      });
    }

    if (action === "EXTEND_GALLERY") {
      const baseDate = invitation.galleryExpiresAt && invitation.galleryExpiresAt > now
        ? new Date(invitation.galleryExpiresAt)
        : now;

      const newExpiry = new Date(baseDate.getTime() + (Number(days) * 24 * 60 * 60 * 1000));

      const updated = await prisma.invitation.update({
        where: { id },
        data: {
          galleryExpiresAt: newExpiry,
          memoriesUploadLocked: false,
        },
      });

      return NextResponse.json({
        success: true,
        galleryExpiresAt: updated.galleryExpiresAt,
        message: `Masa aktif galeri berhasil diperpanjang hingga ${newExpiry.toLocaleDateString("id-ID")}.`,
      });
    }

    if (action === "UPDATE_EVENT_DATE") {
      if (!newDate) {
        return NextResponse.json({ error: "newDate wajib diisi." }, { status: 400 });
      }

      let events: any[] = [];
      try {
        events = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData || [];
      } catch {
        events = [];
      }

      if (events.length > 0) {
        events[0].date = String(newDate).trim();
      } else {
        events = [{ title: "Acara Utama", date: String(newDate).trim() }];
      }

      await prisma.invitation.update({
        where: { id },
        data: {
          eventData: JSON.stringify(events),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Tanggal acara berhasil diperbarui oleh Administrator.",
      });
    }

    return NextResponse.json({ error: `Aksi "${action}" tidak dikenali.` }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Invitation Lifecycle Error]", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message },
      { status: 500 }
    );
  }
}
