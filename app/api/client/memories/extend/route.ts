import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

/**
 * POST /api/client/memories/extend
 * Membuat order perpanjangan masa aktif galeri tamu (Guest Moments) via QRIS/Gateway
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json({ error: "invitationId wajib disertakan." }, { status: 400 });
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

    // 2. Baca tarif perpanjangan galeri secara dinamis dari AdminSetting (Zero Hardcode)
    const priceSetting = await prisma.adminSetting.findUnique({
      where: { key: "gallery_extension_price_per_month" },
    });
    const extensionPrice = Number(priceSetting?.value) || 50000;

    // 3. Buat Invoice Number unik untuk order perpanjangan
    const invoiceNumber = `EXT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (!invitation.order?.planType) {
      return NextResponse.json({ error: "Paket undangan tidak valid atau belum terdaftar pada pesanan." }, { status: 400 });
    }

    // 4. Buat Order baru dengan orderType = GALLERY_EXTENSION
    const newOrder = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        invoiceNumber,
        planType: invitation.order.planType,
        orderType: "GALLERY_EXTENSION",
        amount: extensionPrice,
        status: "PENDING",
        paymentMethod: "QRIS",
        linkedOrderId: invitation.id, // Menyimpan referensi ID invitation
      },
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      invoiceNumber: newOrder.invoiceNumber,
      amount: extensionPrice,
      message: "Order perpanjangan galeri berhasil dibuat. Silakan lanjutkan ke pembayaran QRIS.",
    });
  } catch (error: any) {
    console.error("[Extend Memories Order Error]", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message },
      { status: 500 }
    );
  }
}
