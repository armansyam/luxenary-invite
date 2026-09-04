import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/custom-domain/buy
 * Membuat order untuk pembelian Add-on Custom Domain (Jasa Integrasi)
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { invitationId, requestedDomain } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib disertakan." }, { status: 400 });
    }

    if (!requestedDomain || typeof requestedDomain !== "string") {
      return NextResponse.json({ error: "Domain yang diminta (requestedDomain) wajib disertakan." }, { status: 400 });
    }

    const cleanDomain = requestedDomain.toLowerCase().replace(/^https?:\/\//, "").replace(/\/$/, "").replace(/\s/g, "").trim();

    if (!cleanDomain.includes(".")) {
      return NextResponse.json({ error: "Format domain tidak valid." }, { status: 400 });
    }

    // 1. Verifikasi kepemilikan undangan
    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      include: {
        order: { select: { planType: true } },
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any)?.isAdmin === true || (session.user as any)?.role === "SUPER_ADMIN" || (session.user as any)?.role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    // 2. Harga Add-on Custom Domain (Default 150.000)
    const priceSetting = await prisma.adminSetting.findUnique({
      where: { key: "addon_custom_domain_price" },
    });
    const extensionPrice = Number(priceSetting?.value) || 150000;

    // 3. Buat Invoice Number unik
    const invoiceNumber = `CD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (!invitation.order?.planType) {
      return NextResponse.json({ error: "Paket undangan tidak valid atau belum terdaftar pada pesanan." }, { status: 400 });
    }

    // 4. Buat Order baru dengan orderType = CUSTOM_DOMAIN_ADDON
    const newOrder = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        invoiceNumber,
        planType: invitation.order.planType,
        orderType: "CUSTOM_DOMAIN_ADDON",
        amount: extensionPrice,
        status: "PENDING",
        paymentMethod: "GATEWAY", // Sesuai default untuk checkout otomatis
        linkedOrderId: invitation.id, // Menyimpan referensi ID invitation
        requestedDomain: cleanDomain,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      invoiceNumber: newOrder.invoiceNumber,
      amount: extensionPrice,
      message: "Order Custom Domain berhasil dibuat.",
    });
  } catch (error: any) {
    console.error("[Custom Domain Order Error]", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message },
      { status: 500 }
    );
  }
}
