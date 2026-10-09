import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { invalidateInvitationLookup } from "@/lib/cache";
import { removeInvitationFiles } from "@/lib/invitationFiles";
import { resolveInvitationDisplayName } from "@/lib/invitationUtils";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/[id]/reset-event-type
 *
 * Jenis acara tidak dapat diubah klien: tema, label, dan data peserta dibangun untuk jenisnya. Bila klien salah memilih,
 * admin menghapus draf ini sehingga klien kembali ke wizard langkah 1 dengan order lunas yang sama (Invitation.orderId
 * dilepas bersama barisnya). Hanya untuk draf yang belum pernah terbit, karena tautan dan QR undangan terbit sudah
 * tersebar. Ditolak bila ada add-on (top-up foto, perpanjangan galeri) yang menempel: manfaatnya tersimpan di undangan.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminModule("invitations");
    if (!guard.ok) return guard.response;
    if (guard.session.user.isRemote === true) {
      return NextResponse.json({ error: "Reset jenis acara tidak tersedia dari sesi remote." }, { status: 403 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 500) : "";
    if (!reason) {
      return NextResponse.json({ error: "Alasan reset wajib diisi untuk catatan audit." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: {
        media: { select: { localPath: true } },
        guestMemories: { select: { mediaUrl: true } },
        linkedOrders: { where: { orderType: { in: ["GALLERY_EXTENSION", "MEMORIES_TOPUP"] }, status: { in: ["PENDING", "PAID"] } }, select: { invoiceNumber: true, status: true } },
        user: { select: { email: true } },
      },
    });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }
    if (invitation.status !== "DRAFT" || invitation.publishedAt) {
      return NextResponse.json({ error: "Undangan sudah pernah terbit; jenis acara tidak dapat direset karena tautan dan QR tamu sudah tersebar." }, { status: 409 });
    }
    if (invitation.linkedOrders.length > 0) {
      const invoices = invitation.linkedOrders.map((o) => `${o.invoiceNumber} (${o.status})`).join(", ");
      return NextResponse.json({ error: `Undangan memiliki pembelian add-on yang tersimpan di undangan ini: ${invoices}. Selesaikan atau batalkan dulu.` }, { status: 409 });
    }

    const deleted = await prisma.$transaction(async (tx) => {
      const result = await tx.invitation.deleteMany({ where: { id, status: "DRAFT", publishedAt: null } });
      if (result.count === 1) {
        await tx.adminAuditLog.create({
          data: {
            adminId: adminActorId(guard.session),
            action: "RESET_EVENT_TYPE",
            details: `Mereset draf ${invitation.eventType} "${resolveInvitationDisplayName(invitation)}" (${invitation.invitationSlug}) milik ${invitation.user.email}; klien kembali ke wizard. Alasan: ${reason}`,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          },
        });
      }
      return result.count;
    });
    if (deleted !== 1) {
      return NextResponse.json({ error: "Undangan berubah saat diproses (mungkin baru saja diterbitkan). Muat ulang daftar." }, { status: 409 });
    }

    invalidateInvitationLookup(invitation.invitationSlug, invitation.subdomain);
    await removeInvitationFiles(invitation, "AdminResetEventType");

    return NextResponse.json({
      success: true,
      message: "Draf dihapus. Saat klien membuka dasbor, wizard dimulai dari pemilihan jenis acara dengan paket yang sama.",
    });
  } catch (err) {
    return routeError("AdminResetEventType", err, "Gagal mereset jenis acara.");
  }
}
