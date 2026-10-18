import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { deleteFile } from "@/lib/storage";
import { normalizePlanType } from "@/lib/planUtils";
import { releaseOrderPromoHold } from "@/lib/marketing";
import { purgeObsoleteUserOrders } from "@/lib/upgradeHelper";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

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
    const userRole = session.user.role;
    const isAdmin = session.user.isAdmin === true || userRole === "ADMIN" || userRole === "SUPER_ADMIN";
    if (isAdmin) {
      return NextResponse.json(
        { error: "Akun Administrator tidak dapat membuat pesanan paket klien." },
        { status: 403 }
      );
    }

    // 2.1 Proteksi Status Ketersediaan Layanan (Tutup Order / Maintenance / Coming Soon)
    const { getServiceAvailability } = await import("@/lib/settings");
    const availability = await getServiceAvailability();
    if (!availability.isOpen) {
      return NextResponse.json(
        {
          error: availability.message || "Pemesanan undangan baru sedang ditutup sementara.",
          code: availability.mode,
        },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { planType: rawPlanType, regenerate, buyerName, buyerPhone, phoneNumber } = body;

    if (!rawPlanType) {
      return NextResponse.json({ error: "Missing planType" }, { status: 400 });
    }

    const planType = normalizePlanType(rawPlanType);

    // 3. Verifikasi Single Source of Truth — User terdaftar di database
    const targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          ...(session.user.email ? [{ email: session.user.email.toLowerCase() }] : []),
        ],
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "Sesi login Anda tidak valid atau telah berakhir. Silakan masuk kembali dengan akun Google Anda." },
        { status: 401 }
      );
    }

    const validUserId = targetUser.id;

    // Sinkronisasi data pembeli jika disediakan saat pembuatan pesanan (sanitasi digit murni)
    const phoneVal = (buyerPhone || phoneNumber || "").replace(/\D/g, "");
    const nameVal = (buyerName || "").trim();
    if (phoneVal || (nameVal && !targetUser.name)) {
      await prisma.user.update({
        where: { id: validUserId },
        data: {
          ...(phoneVal ? { phoneNumber: phoneVal } : {}),
          ...(nameVal && !targetUser.name ? { name: nameVal } : {}),
        },
      });
    }

    // KONSISTENSI GUARD: Cegah klien yang sudah memiliki undangan / order PAID membuat order baru 
    // dari tab usang. (Tipe order NEW_INVITATION implicitly)
    const existingInvitation = await prisma.invitation.findFirst({
      where: { userId: validUserId },
    });
    
    if (existingInvitation) {
      return NextResponse.json(
        { error: "Anda sudah memiliki undangan aktif. Tidak dapat membuat pesanan baru.", redirectUrl: "/dashboard" },
        { status: 400 }
      );
    }

    const existingPaid = await prisma.order.findFirst({
      where: { userId: validUserId, status: "PAID", orderType: "NEW" },
    });

    if (existingPaid) {
      return NextResponse.json(
        { error: "Anda sudah memiliki paket aktif. Tidak dapat membuat pesanan baru.", redirectUrl: `/dashboard/setup?order=${existingPaid.id}` },
        { status: 400 }
      );
    }

    const tierNum = planType === "TIER_3" ? "3" : planType === "TIER_2" ? "2" : "1";
    const priceSetting = await prisma.adminSetting.findUnique({ where: { key: `price_tier${tierNum}` } });
    if (!priceSetting || !priceSetting.value || isNaN(Number(priceSetting.value)) || Number(priceSetting.value) <= 0) {
      return NextResponse.json(
        { error: `Harga paket ${planType} belum dikonfigurasi di sistem. Hubungi administrator.` },
        { status: 503 }
      );
    }
    const amount = Number(priceSetting.value);

    // Cek apakah user punya order PENDING yang belum lunas
    const existingPending = await prisma.order.findFirst({
      where: {
        userId: validUserId,
        status: "PENDING",
        orderType: "NEW",
      },
      orderBy: { createdAt: "desc" },
    });

    if (existingPending) {
      // Sesi QRIS yang habis tidak mengakhiri order (diterbitkan ulang di /payment); hanya batas hidup order.
      const isExpired = Boolean(existingPending.expiredAt && Date.now() > existingPending.expiredAt.getTime());

      // FIX: Jangan izinkan ubah paket jika status masih PENDING dan sudah ada bukti transfer (menunggu verifikasi admin)
      if (existingPending.status === "PENDING" && existingPending.proofImageUrl) {
        return NextResponse.json({
          message: "Anda memiliki pesanan yang sedang menunggu verifikasi admin. Tidak dapat mengubah paket saat ini.",
          orderId: existingPending.id,
          invoiceNumber: existingPending.invoiceNumber,
          planType: existingPending.planType,
          status: existingPending.status,
          proofImageUrl: existingPending.proofImageUrl,
          serverTime: Date.now(),
        });
      }

      const isPlanChanged = existingPending.planType !== planType;
      const hadGatewaySession = Boolean(existingPending.gatewayTxId);

      // Jika regenerate diminta, atau tagihan sudah expired, atau paket diubah padahal sudah pernah diproses gateway:
      // Wajib matikan order lama (Soft Cancel ke EXPIRED) dan terbitkan order baru: Midtrans melarang order_id dipakai ulang
      // selama transaksinya aktif atau sudah dibayar, jadi order lama harus dibatalkan lebih dulu.
      if (regenerate || isExpired || (isPlanChanged && hadGatewaySession)) {
        const softCancelled = await prisma.order.updateMany({
          where: { id: existingPending.id, status: "PENDING" },
          data: {
            status: "EXPIRED",
            rejectReason: regenerate
              ? "Digantikan oleh tagihan baru"
              : isExpired
              ? "Waktu pembayaran telah habis"
              : "Paket diubah oleh klien",
          },
        });
        if (softCancelled.count === 0) {
          return NextResponse.json(
            { error: "Pesanan Anda baru saja diproses. Muat ulang halaman untuk melihat status terbarunya." },
            { status: 409 }
          );
        }
        await releaseOrderPromoHold(existingPending.id);

        // Hubungi gateway cancel jika ada transaksi gateway aktif
        if (hadGatewaySession && existingPending.gatewayId) {
          try {
            const { getGatewayById, getActiveGateway } = await import("@/lib/gatewayRegistry");
            const gw = existingPending.gatewayId ? await getGatewayById(existingPending.gatewayId) : await getActiveGateway();
            if (gw.cancel) {
              await gw.cancel(existingPending.gatewayTxId || existingPending.id);
            }
          } catch (cancelErr) {
            logger.warn("OrdersCreate", "Pembatalan sesi gateway lama gagal; order baru tetap dibuat", { orderId: existingPending.id, error: cancelErr instanceof Error ? cancelErr.message : String(cancelErr) });
          }
        }
        // Biarkan alur lanjut ke bawah membuat order baru dengan UUID & Invoice baru yang segar!
      } else {
        // Draf duplikat dihapus; yang pernah punya sesi gateway atau bukti hanya ditutup, karena QR lamanya masih bisa dibayar.
        await purgeObsoleteUserOrders(validUserId, existingPending.id);

        const isResetProof = isPlanChanged;

        // Diskon dihitung terhadap paket sebelumnya (applicablePlans, minimum belanja, nominal): tidak boleh terbawa ke paket baru.
        if (isPlanChanged) await releaseOrderPromoHold(existingPending.id);

        // deleteFile mencatat galatnya sendiri dan tidak melempar.
        if (isResetProof && existingPending.proofImageUrl) {
          await deleteFile(existingPending.proofImageUrl);
        }

        const updated = await prisma.order.update({
          where: { id: existingPending.id },
          data: {
            planType: planType as "TIER_1" | "TIER_2" | "TIER_3",
            amount,
            status: "PENDING",
            proofImageUrl: isResetProof ? null : existingPending.proofImageUrl,
            proofUploadedAt: isResetProof ? null : existingPending.proofUploadedAt,
            rejectReason: isResetProof ? null : existingPending.rejectReason,
            ...(isPlanChanged
              ? { discountAmount: null, promoCodeApplied: null, promoCouponId: null, checkoutConfirmedAt: null, chargedAmount: null, gatewayQrString: null, gatewayCheckoutUrl: null, gatewaySessionExpiresAt: null }
              : {}),
            expiredAt: isPlanChanged ? new Date(Date.now() + 24 * 60 * 60 * 1000) : (existingPending.expiredAt || new Date(Date.now() + 24 * 60 * 60 * 1000)),
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
          serverTime: Date.now(),
        });
      }
    }

    const invoiceNumber = `INV-LUX-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;

    // Resolusi paymentMethod dari AdminSetting — platform setting wins, bukan schema default
    const paymentModeSetting = await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } });
    const resolvedPaymentMethod = paymentModeSetting?.value === "MANUAL" ? "MANUAL_TRANSFER" : "GATEWAY";

    // Satu order draf per pengguna: permintaan bersamaan diserialkan per pengguna. Yang tiba belakangan memakai ulang
    // order pemenang, bukan menghapusnya lalu membuat yang baru (sebelumnya klien bisa memegang ID order yang sudah terhapus).
    const { order, reused } = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`order_create:${validUserId}`}))`;

      const draft = await tx.order.findFirst({
        where: { userId: validUserId, status: "PENDING", orderType: "NEW" },
        orderBy: { createdAt: "desc" },
      });
      if (draft) {
        if (draft.planType === planType) return { order: draft, reused: true };
        await tx.promoHold.updateMany({ where: { orderId: draft.id, status: "HELD" }, data: { status: "RELEASED" } });
        const retargeted = await tx.order.update({
          where: { id: draft.id },
          data: {
            planType: planType as "TIER_1" | "TIER_2" | "TIER_3",
            amount,
            discountAmount: null,
            promoCodeApplied: null,
            promoCouponId: null,
            checkoutConfirmedAt: null,
            chargedAmount: null,
            gatewayQrString: null,
            gatewayCheckoutUrl: null,
            gatewaySessionExpiresAt: null,
            gatewayTxId: null,
          },
        });
        return { order: retargeted, reused: true };
      }

      const created = await tx.order.create({
        data: {
          userId: validUserId,
          invoiceNumber,
          planType: planType as "TIER_1" | "TIER_2" | "TIER_3",
          amount,
          status: "PENDING",
          paymentMethod: resolvedPaymentMethod,
          expiredAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });
      return { order: created, reused: false };
    });

    return NextResponse.json({
      orderId: order.id,
      invoiceNumber: order.invoiceNumber,
      amount,
      planType,
      existing: reused,
      serverTime: Date.now(),
    });
  } catch (error) {
    return routeError("OrdersCreate", error, "Gagal membuat pesanan");
  }
}