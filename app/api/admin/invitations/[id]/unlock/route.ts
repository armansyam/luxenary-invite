import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

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
    const { durationHours = 24, lockImmediately = false } = body;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    let updatedInvitation;
    if (lockImmediately) {
      updatedInvitation = await prisma.invitation.update({
        where: { id },
        data: {
          adminUnlockedUntil: null,
          isLockedPermanently: true,
        },
      });

      // Audit Log
      try {
        const admin = await prisma.admin.findFirst();
        if (admin) {
          await prisma.adminAuditLog.create({
            data: {
              adminId: admin.id,
              action: "LOCK_INVITATION",
              details: `Mengunci kembali undangan ID: ${id} (${invitation.groomName} & ${invitation.brideName})`,
            },
          });
        }
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: "Undangan berhasil dikunci kembali.",
        isUnlocked: false,
        adminUnlockedUntil: null,
        invitation: updatedInvitation,
      });
    } else {
      const unlockExpiry = new Date(Date.now() + durationHours * 3600 * 1000);
      updatedInvitation = await prisma.invitation.update({
        where: { id },
        data: {
          adminUnlockedUntil: unlockExpiry,
          isLockedPermanently: false,
        },
      });

      // Audit Log
      try {
        const admin = await prisma.admin.findFirst();
        if (admin) {
          await prisma.adminAuditLog.create({
            data: {
              adminId: admin.id,
              action: "UNLOCK_INVITATION",
              details: `Membuka kunci darurat undangan ID: ${id} (${invitation.groomName} & ${invitation.brideName}) selama ${durationHours} jam hingga ${unlockExpiry.toISOString()}`,
            },
          });
        }
      } catch (e) {}

      return NextResponse.json({
        success: true,
        message: `Undangan berhasil dibuka kuncinya selama ${durationHours} jam.`,
        isUnlocked: true,
        adminUnlockedUntil: unlockExpiry.toISOString(),
        invitation: updatedInvitation,
      });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
