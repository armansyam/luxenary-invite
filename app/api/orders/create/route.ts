import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { deleteFile } from "@/lib/storage";

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

    // Baca harga paket dari AdminSetting — WAJIB ada. Jika belum dikonfigurasi, tolak order.
    // Tidak boleh ada fallback hardcode: harga bisa berubah sewaktu-waktu dari Admin.
    const priceKey = planType === "PREMIUM" ? "price_premium" : planType === "MODERN" ? "price_modern" : "price_traditional";
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: priceKey } });
    if (!priceSetting || !priceSetting.value || isNaN(Number(priceSetting.value)) || Number(priceSetting.value) <= 0) {
      return NextResponse.json(
        { error: `Harga paket ${planType} belum dikonfigurasi di sistem. Hubungi administrator.` },
        { status: 503 }
      );
    }
    const amount = Number(priceSetting.value);

    // Cek apakah user punya order PENDING atau FAILED yang belum lunas
    const existingPending = await prisma.order.findFirst({
      where: {
        userId: validUserId,
        status: { in: ["PENDING", "FAILED"] },
        linkedOrderId: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      // Cari dan bersihkan file bukti transfer pada duplikat draf order pending/failed lama lainnya
      try {
        const duplicateOrders = await prisma.order.findMany({
          where: {
            userId: validUserId,
            status: { in: ["PENDING", "FAILED"] },
            id: { not: existingPending.id },
            linkedOrderId: null,
          },
          select: { id: true, proofImageUrl: true },
        });

        for (const dup of duplicateOrders) {
          if (dup.proofImageUrl) {
            try {
              await deleteFile(dup.proofImageUrl);
            } catch (e) {
              console.error("Gagal menghapus file bukti order duplikat:", e);
            }
          }
        }

        if (duplicateOrders.length > 0) {
          await prisma.order.deleteMany({
            where: { id: { in: duplicateOrders.map((o) => o.id) } },
          });
        }
      } catch (dupErr) {
        console.error("Gagal membersihkan duplikat order:", dupErr);
      }

      // FIX: Jangan izinkan ubah paket jika status masih PENDING dan sudah ada bukti transfer (menunggu verifikasi admin)
      if (existingPending.status === "PENDING" && existingPending.proofImageUrl) {
        return NextResponse.json({
          message: "Anda memiliki pesanan yang sedang menunggu verifikasi admin. Tidak dapat mengubah paket saat ini.",
          orderId: existingPending.id,
          invoiceNumber: existingPending.invoiceNumber,
          planType: existingPending.planType,
          status: existingPending.status,
          proofImageUrl: existingPending.proofImageUrl,
        });
      }

      // Update planType & amount langsung ke order aktif, reset bukti transfer jika paket berubah atau sebelumnya FAILED
      const isPlanChanged = existingPending.planType !== planType;
      const isResetProof = isPlanChanged || existingPending.status === "FAILED";

      // Hapus file bukti lama dari storage jika paket berubah atau sebelumnya berstatus FAILED
      if (isResetProof && existingPending.proofImageUrl) {
        try {
          await deleteFile(existingPending.proofImageUrl);
        } catch (e) {
          console.error("Gagal menghapus file bukti lama saat reset order:", e);
        }
      }

      const updated = await prisma.order.update({
        where: { id: existingPending.id },
        data: {
          planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM",
          amount,
          status: "PENDING",
          proofImageUrl: isResetProof ? null : existingPending.proofImageUrl,
          proofUploadedAt: isResetProof ? null : existingPending.proofUploadedAt,
          rejectReason: isResetProof ? null : existingPending.rejectReason,
          snapToken: null,
          expiredAt: null,
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

    /**
     * Tidak ada order PENDING / FAILED — cek apakah ada order EXPIRED dengan planType yang sama.
     * Jika ada, reset ke PENDING dan reuse daripada membuat order baru.
     * Ini mencegah akumulasi order EXPIRED orphaned di DB setiap kali QRIS kedaluwarsa
     * dan user mencoba bayar ulang (flow: iPaymu kirim webhook expired → handleRegenerateOrder
     * → orders/create dipanggil lagi dengan planType yang sama).
     */
    const existingExpired = await prisma.order.findFirst({
      where: {
        userId: validUserId,
        status: "EXPIRED",
        planType: planType as "TRADITIONAL" | "MODERN" | "PREMIUM",
        // Hanya reuse order EXPIRED yang belum punya bukti transfer
        proofImageUrl: null,
        // Hanya reuse jika bukan order UPGRADE (order upgrade memiliki linkedOrderId)
        linkedOrderId: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingExpired) {
      // Reset order EXPIRED ke PENDING dengan harga terbaru dari AdminSetting
      const updated = await prisma.order.update({
        where: { id: existingExpired.id },
        data: {
          status: "PENDING",
          amount,
          // Bersihkan token lama yang sudah tidak valid
          snapToken: null,
          expiredAt: null,
          rejectReason: null,
        },
      });

      return NextResponse.json({
        orderId: updated.id,
        invoiceNumber: updated.invoiceNumber,
        amount,
        planType,
        existing: true,
        planChanged: false,
        reusedFromExpired: true,
      });
    }

    // Pastikan tidak ada order draf PENDING/FAILED lama yang tertinggal
    await prisma.order.deleteMany({
      where: {
        userId: validUserId,
        status: { in: ["PENDING", "FAILED"] },
        linkedOrderId: null,
      },
    });

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