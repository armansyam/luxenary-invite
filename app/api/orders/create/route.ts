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
    const { planType, regenerate, buyerName, buyerPhone, phoneNumber } = body;

    if (!planType) {
      return NextResponse.json({ error: "Missing planType" }, { status: 400 });
    }

    if (!["TRADITIONAL", "MODERN", "PREMIUM"].includes(planType)) {
      return NextResponse.json({ error: "PlanType tidak valid. Gunakan TRADITIONAL, MODERN, atau PREMIUM." }, { status: 400 });
    }

    // 3. Verifikasi Single Source of Truth — User terdaftar di database
    let targetUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(session.user.id ? [{ id: session.user.id }] : []),
          ...(session.user.email ? [{ email: session.user.email.toLowerCase() }] : []),
        ],
      },
    });

    // Self-healing: Jika user memiliki sesi OAuth Google resmi namun record DB belum ada
    // (misal setelah database dibersihkan / di-reset), daftarkan ulang akun klien secara otomatis
    if (!targetUser && session?.user?.email) {
      targetUser = await prisma.user.create({
        data: {
          email: session.user.email.toLowerCase(),
          name: session.user.name || "Mempelai",
          avatarUrl: session.user.image || null,
          role: "CLIENT",
        },
      });
    }

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
      where: { userId: validUserId, status: "PAID", linkedOrderId: null },
    });

    if (existingPaid) {
      return NextResponse.json(
        { error: "Anda sudah memiliki paket aktif. Tidak dapat membuat pesanan baru.", redirectUrl: `/dashboard/setup?order=${existingPaid.id}` },
        { status: 400 }
      );
    }

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
      const nowMs = Date.now();
      let isExpired = false;
      if (existingPending.expiredAt && nowMs > existingPending.expiredAt.getTime()) {
        isExpired = true;
      }
      if (!isExpired && existingPending.snapToken) {
        try {
          const parsed = JSON.parse(existingPending.snapToken);
          if (parsed?.expiry && nowMs > parsed.expiry) {
            isExpired = true;
          }
        } catch {}
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
          serverTime: Date.now(),
        });
      }

      const isPlanChanged = existingPending.planType !== planType;
      const hadGatewaySession = !!(existingPending.snapToken || existingPending.gatewayTxId);

      // Jika regenerate diminta, atau tagihan sudah expired, atau paket diubah padahal sudah pernah diproses gateway:
      // Wajib matikan order lama (Soft Cancel ke EXPIRED) dan JANGAN PERNAH me-reuse ID lama (Midtrans melarang reuse order_id).
      if (regenerate || isExpired || (isPlanChanged && hadGatewaySession)) {
        await prisma.order.update({
          where: { id: existingPending.id },
          data: {
            status: "EXPIRED",
            rejectReason: regenerate
              ? "Digantikan oleh tagihan baru"
              : isExpired
              ? "Waktu pembayaran telah habis"
              : "Paket diubah oleh klien",
          },
        });

        // Hubungi gateway cancel jika ada transaksi gateway aktif
        if (hadGatewaySession && existingPending.gatewayId) {
          try {
            const { getGatewayById, getActiveGateway } = await import("@/lib/gatewayRegistry");
            const gw = existingPending.gatewayId ? await getGatewayById(existingPending.gatewayId) : await getActiveGateway();
            if (gw.cancel) {
              await gw.cancel(existingPending.gatewayTxId || existingPending.id);
            }
          } catch (cancelErr) {
            console.warn("[Orders Create] Gateway cancel notice:", cancelErr);
          }
        }
        // Biarkan alur lanjut ke bawah membuat order baru dengan UUID & Invoice baru yang segar!
      } else {
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

        const isResetProof = isPlanChanged || existingPending.status === "FAILED";

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
            snapToken: isPlanChanged ? null : existingPending.snapToken,
            expiredAt: isPlanChanged ? null : existingPending.expiredAt,
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
          snapToken: updated.snapToken,
          serverTime: Date.now(),
        });
      }
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
      serverTime: Date.now(),
    });
  } catch (error: any) {
    console.error("[Orders Create Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}