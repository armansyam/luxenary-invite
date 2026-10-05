import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { adminActorId } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    const { hasAdminPermission } = await import("@/lib/adminPermissions");
    if (!session?.user || !hasAdminPermission(session.user, "invitations")) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { durationHours = 24, lockImmediately = false } = body;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const actorId = adminActorId(session);

    let updatedInvitation;
    if (lockImmediately) {
      // Perubahan kunci dan catatan auditnya satu transaksi, atas nama admin yang benar-benar menekan tombol.
      [updatedInvitation] = await prisma.$transaction([
        prisma.invitation.update({
          where: { id },
          data: {
            adminUnlockedUntil: null,
            isLockedPermanently: true,
          },
        }),
        prisma.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: "LOCK_INVITATION",
            details: `Mengunci kembali undangan ID: ${id} (${invitation.groomName} & ${invitation.brideName})`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: "Undangan berhasil dikunci kembali.",
        isUnlocked: false,
        adminUnlockedUntil: null,
        invitation: updatedInvitation,
      });
    } else {
      const unlockExpiry = new Date(Date.now() + durationHours * 3600 * 1000);
      [updatedInvitation] = await prisma.$transaction([
        prisma.invitation.update({
          where: { id },
          data: {
            adminUnlockedUntil: unlockExpiry,
            isLockedPermanently: false,
          },
        }),
        prisma.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: "UNLOCK_INVITATION",
            details: `Membuka kunci darurat undangan ID: ${id} (${invitation.groomName} & ${invitation.brideName}) selama ${durationHours} jam hingga ${unlockExpiry.toISOString()}`,
          },
        }),
      ]);

      return NextResponse.json({
        success: true,
        message: `Undangan berhasil dibuka kuncinya selama ${durationHours} jam.`,
        isUnlocked: true,
        adminUnlockedUntil: unlockExpiry.toISOString(),
        invitation: updatedInvitation,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
