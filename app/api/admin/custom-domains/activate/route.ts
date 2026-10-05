import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { adminActorId } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const { hasAdminPermission } = await import("@/lib/adminPermissions");

    if (!session?.user || !hasAdminPermission(session.user, "custom_domains")) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID wajib disertakan." }, { status: 400 });
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        invitation: true,
        user: {
          include: {
            invitations: { take: 1, orderBy: { createdAt: "desc" } },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
    }

    const domain = (order.requestedDomain || "").trim().toLowerCase();
    if (!domain) {
      return NextResponse.json({ error: "Pesanan ini tidak memiliki nama domain yang diminta (requestedDomain kosong)." }, { status: 400 });
    }

    // Tentukan invitation target
    const targetInvitation = order.invitation || order.user?.invitations?.[0];
    if (!targetInvitation) {
      return NextResponse.json({ error: "Tidak ditemukan proyek undangan yang terhubung dengan klien ini." }, { status: 404 });
    }

    // Update custom domain pada undangan, satu transaksi dengan catatan auditnya.
    await prisma.$transaction([
      prisma.invitation.update({
        where: { id: targetInvitation.id },
        data: { customDomain: domain },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminActorId(session),
          action: "ACTIVATE_CUSTOM_DOMAIN",
          details: `Aktivasi domain ${domain} untuk undangan ${targetInvitation.invitationSlug || targetInvitation.id} (Order: ${order.invoiceNumber})`,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Domain ${domain} berhasil dihubungkan ke undangan ${targetInvitation.subdomain || targetInvitation.invitationSlug}.`,
      customDomain: domain,
    });
  } catch (error: any) {
    logger.error("ActivateCustomDomain", "Aktivasi custom domain gagal", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan custom domain" },
      { status: 500 }
    );
  }
}
