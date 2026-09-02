import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    // 1. Wajib memiliki sesi login aktif
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Silakan login dengan akun Google Anda untuk melanjutkan pemesanan." },
        { status: 401 }
      );
    }

    // 2. Proteksi Isolasi Admin — Akun Admin dilarang membuat pesanan klien
    const userRole = (session.user as any)?.role;
    const isAdmin = (session.user as any)?.isAdmin === true || userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    if (isAdmin) {
      return NextResponse.json(
        { error: "Akun Administrator tidak dapat membuat pesanan paket klien." },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { planType } = body;

    if (!planType) {
      return NextResponse.json({ error: "Missing planType" }, { status: 400 });
    }

    if (!["TRADITIONAL", "MODERN", "PREMIUM"].includes(planType)) {
      return NextResponse.json({ error: "PlanType tidak valid. Gunakan TRADITIONAL, MODERN, atau PREMIUM." }, { status: 400 });
    }

    // 3. Verifikasi Single Source of Truth — User WAJIB akun Google OAuth yang terdaftar di database
    const targetUser = await prisma.user.findFirst({
      where: {
        id: session.user.id,
      },
    });

    if (!targetUser || !targetUser.googleId) {
      return NextResponse.json(
        { error: "Hanya akun Google resmi yang terverifikasi yang dapat melakukan pemesanan." },
        { status: 403 }
      );
    }

    const validUserId = targetUser.id;

    // Baca harga paket realtime dari AdminSetting database
    const priceKey = planType === "PREMIUM" ? "price_premium" : planType === "MODERN" ? "price_modern" : "price_traditional";
    const defaultAmount = planType === "PREMIUM" ? 699000 : planType === "MODERN" ? 499000 : 299000;
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
    const amount = priceSetting ? Number(priceSetting.value) : defaultAmount;

    // Cek apakah user punya order PENDING yang belum dibayar
    const existingPending = await prisma.order.findFirst({
      where: {
        userId: validUserId,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      // Hapus jika ada duplikat draf order pending lama lainnya untuk user ini
      await prisma.order.deleteMany({
        where: {
          userId: validUserId,
          status: "PENDING",
          id: { not: existingPending.id },
        },
      });

      // FIX: Jangan izinkan ubah paket jika sudah ada bukti transfer (menunggu verifikasi admin)
      if (existingPending.proofImageUrl) {
        return NextResponse.json({
          message: "Anda memiliki pesanan yang sedang menunggu verifikasi admin. Tidak dapat mengubah paket saat ini.",
          orderId: existingPending.id,
          invoiceNumber: existingPending.invoiceNumber,
          planType: existingPending.planType,
          status: existingPending.status,
          proofImageUrl: existingPending.proofImageUrl,
        });
      }

      // Update planType & amount langsung ke order aktif, reset bukti transfer jika paket berubah
      // (Sekarang aman karena if di atas memastikan tidak ada proofImageUrl jika isPlanChanged true)
      const isPlanChanged = existingPending.planType !== planType;

      const updated = await prisma.order.update({
        where: { id: existingPending.id },
        data: {
          planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM",
          amount,
        },
      });

      return NextResponse.json({
        orderId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        amount,
        planType,
        existing: true,
        planChanged: isPlanChanged,
        proofImageUrl: updated.proofImageUrl,
      });
    }



    const invoiceNumber = `INV-LUX-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        userId: validUserId,
        invoiceNumber,
        planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM",
        amount,
        status: "PENDING",
      },
    });

    return NextResponse.json({
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      amount,
      planType,
      existing: false,
    });
  } catch (error: any) {
    console.error("[Orders Create Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}