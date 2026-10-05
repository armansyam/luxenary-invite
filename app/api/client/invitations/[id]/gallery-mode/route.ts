import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { prisma } from "@/lib/prisma";
import { invalidateInvitationLookup } from "@/lib/cache";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { hasPlanCapability } from "@/lib/settings";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/invitations/[id]/gallery-mode
 * 
 * Mengizinkan klien pemilik undangan untuk mengalihkan mode tampilan URL utama
 * secara manual antara:
 * - "PUBLISHED" (Mode Web Undangan Pernikahan Aktif)
 * - "EVENT_FINISHED" (Mode Galeri Kenangan Tamu Pasca-Acara Aktif)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Parameter ID undangan wajib disertakan" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        status: true,
        subdomain: true,
        invitationSlug: true,
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isAdmin && invitation.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden: Bukan undangan milik Anda" }, { status: 403 });
    }

    // Hanya undangan berstatus PUBLISHED atau EVENT_FINISHED yang dapat di-switch
    if (invitation.status !== "PUBLISHED" && invitation.status !== "EVENT_FINISHED") {
      return NextResponse.json(
        {
          error:
            invitation.status === "DRAFT"
              ? "Undangan masih berstatus DRAFT. Silakan publikasikan undangan terlebih dahulu."
              : `Undangan berada dalam status ${invitation.status} dan tidak dapat diubah modenya.`,
        },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      // Body opsional: tanpa body, mode berpindah (toggle) dari status sekarang.
    }

    // Tentukan mode tujuan (toggle atau eksplisit)
    let nextStatus: "PUBLISHED" | "EVENT_FINISHED";
    if (body.targetMode === "PUBLISHED" || body.targetMode === "EVENT_FINISHED") {
      nextStatus = body.targetMode;
    } else {
      nextStatus = invitation.status === "PUBLISHED" ? "EVENT_FINISHED" : "PUBLISHED";
    }

    // Jika beralih ke EVENT_FINISHED, pastikan paket memiliki hak akses guest_memories
    if (nextStatus === "EVENT_FINISHED") {
      const canAccessMemories = await hasPlanCapability(invitation.order?.planType, "guest_memories");
      if (!canAccessMemories) {
        return NextResponse.json(
          { error: "Paket Anda tidak menyertakan fitur Galeri Kenangan Tamu (Memories). Silakan upgrade paket terlebih dahulu." },
          { status: 403 }
        );
      }
    }

    // Jika status sudah sesuai, idempotent return
    if (invitation.status === nextStatus) {
      return NextResponse.json({
        success: true,
        status: nextStatus,
        isGalleryMode: nextStatus === "EVENT_FINISHED",
        message: nextStatus === "EVENT_FINISHED"
          ? "Mode Galeri Kenangan Pasca-Acara sudah aktif."
          : "Mode Web Undangan sudah aktif.",
      });
    }

    // Jika beralih ke EVENT_FINISHED, pastikan master HTML publik sudah ter-bake
    if (nextStatus === "EVENT_FINISHED") {
      try {
        await buildAndSavePublishedHtml(invitation.id);
      } catch (err) {
        logger.error("GalleryMode", "HTML terbit gagal dibangun ulang saat mengalihkan mode", err, { invitationId: invitation.id });
      }
    }

    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: nextStatus },
    });

    // Invalidate L1 lookup cache agar proxy langsung membaca status mutakhir
    invalidateInvitationLookup(invitation.subdomain, invitation.invitationSlug);

    return NextResponse.json({
      success: true,
      status: nextStatus,
      isGalleryMode: nextStatus === "EVENT_FINISHED",
      message: nextStatus === "EVENT_FINISHED"
        ? "Acara berhasil ditandai selesai. Alamat utama undangan kini otomatis menampilkan Galeri Kenangan Tamu."
        : "Mode Web Undangan berhasil diaktifkan kembali.",
    });
  } catch (error) {
    return routeError("GalleryMode", error, "Gagal mengalihkan mode galeri");
  }
}
