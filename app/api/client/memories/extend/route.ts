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

    // 3. Cek apakah ada order perpanjangan yang sedang menunggu verifikasi admin (sudah ada bukti transfer)
    const existingPendingWithProof = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        linkedOrderId: invitation.id,
        orderType: "GALLERY_EXTENSION",
        status: "PENDING",
        proofImageUrl: { not: null },
      },
    });

    if (existingPendingWithProof) {
      return NextResponse.json({
        error: "Anda memiliki tagihan perpanjangan galeri yang sedang menunggu verifikasi admin.",
        orderId: existingPendingWithProof.id,
        invoiceNumber: existingPendingWithProof.invoiceNumber,
        paymentUrl: `/payment?order=${existingPendingWithProof.id}`,
        isPendingVerification: true,
      }, { status: 409 });
    }

    // Cek apakah ada order perpanjangan PENDING aktif yang belum kedaluwarsa (hindari duplikasi)
    const now = new Date();
    const existingPendingUnpaid = await prisma.order.findFirst({
      where: {
        userId: session.user.id,
        linkedOrderId: invitation.id,
        orderType: "GALLERY_EXTENSION",
        status: "PENDING",
        proofImageUrl: null,
        OR: [
          { expiredAt: null },
          { expiredAt: { gt: now } },
        ],
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPendingUnpaid) {
      return NextResponse.json({
        success: true,
        orderId: existingPendingUnpaid.id,
        invoiceNumber: existingPendingUnpaid.invoiceNumber,
        amount: Number(existingPendingUnpaid.amount),
        paymentUrl: `/checkout?order=${existingPendingUnpaid.id}`,
        message: "Melanjutkan tagihan perpanjangan aktif Anda.",
      });
    }

    // Bersihkan / tandai usang order perpanjangan galeri PENDING yang sudah usang tanpa bukti transfer
    await prisma.order.updateMany({
      where: {
        userId: session.user.id,
        linkedOrderId: invitation.id,
        orderType: "GALLERY_EXTENSION",
        status: "PENDING",
        proofImageUrl: null,
      },
      data: {
        status: "EXPIRED",
        rejectReason: "Digantikan oleh tagihan perpanjangan baru",
      },
    });

    // Buat Invoice Number unik untuk order perpanjangan
    const invoiceNumber = `EXT-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    if (!invitation.order?.planType) {
      return NextResponse.json({ error: "Paket undangan tidak valid atau belum terdaftar pada pesanan." }, { status: 400 });
    }

    // Baca paymentMode dari AdminSetting (GATEWAY, MANUAL, atau BOTH → default ke GATEWAY)
    const paymentModeSetting = await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } });
    const activePaymentMode = paymentModeSetting?.value || "GATEWAY";
    const resolvedPaymentMethod = activePaymentMode === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    // Hitung batas waktu kadaluarsa order secara dinamis dari setting platform (default 24 jam / 1440 menit)
    const expirySetting = await prisma.adminSetting.findUnique({ where: { key: "payment_expiry_minutes" } });
    const expiryMinutes = Number(expirySetting?.value) || 1440;
    const expiredAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    // 4. Buat Order baru dengan orderType = GALLERY_EXTENSION & expiredAt otomatis
    const newOrder = await prisma.order.create({
      data: {
        id: randomUUID(),
        userId: session.user.id,
        invoiceNumber,
        planType: invitation.order.planType,
        orderType: "GALLERY_EXTENSION",
        amount: extensionPrice,
        status: "PENDING",
        paymentMethod: resolvedPaymentMethod,
        linkedOrderId: invitation.id,
        expiredAt,
      },
    });

    return NextResponse.json({
      success: true,
      orderId: newOrder.id,
      invoiceNumber: newOrder.invoiceNumber,
      amount: extensionPrice,
      paymentUrl: `/checkout?order=${newOrder.id}`,
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
