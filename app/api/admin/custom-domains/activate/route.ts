import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const adminUser = session?.user as any;
    const isAdmin =
      adminUser?.isAdmin === true ||
      adminUser?.role === "SUPER_ADMIN" ||
      adminUser?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
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

    // Update custom domain pada undangan
    await prisma.invitation.update({
      where: { id: targetInvitation.id },
      data: { customDomain: domain },
    });

    // Catat log audit staf
    try {
      const adminRecord = await prisma.admin.findFirst({
        where: { email: adminUser.email },
      });
      if (adminRecord) {
        await prisma.adminAuditLog.create({
          data: {
            adminId: adminRecord.id,
            action: "ACTIVATE_CUSTOM_DOMAIN",
            details: `Aktivasi domain ${domain} untuk undangan ${targetInvitation.invitationSlug || targetInvitation.id} (Order: ${order.invoiceNumber})`,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "localhost",
          },
        });
      }
    } catch (e) {
      console.warn("Gagal menulis audit log activate domain:", e);
    }

    return NextResponse.json({
      success: true,
      message: `Domain ${domain} berhasil dihubungkan ke undangan ${targetInvitation.subdomain || targetInvitation.invitationSlug}.`,
      customDomain: domain,
    });
  } catch (error: any) {
    console.error("POST /api/admin/custom-domains/activate error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengaktifkan custom domain" },
      { status: 500 }
    );
  }
}
