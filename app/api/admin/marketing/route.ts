import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { NextRequest, NextResponse } from "next/server";
import { CommissionType, DiscountType, PlanType } from "@prisma/client";

export const dynamic = "force-dynamic";

/**
 * GET & POST /api/admin/marketing
 * API Admin untuk Manajemen Pemasaran: Master Switch, Kupon Promo, Mitra Afiliasi, & Payout Komisi
 */

async function checkAdminAuth() {
  const session = await auth();
  const isAdmin =
    (session?.user as any)?.isAdmin === true ||
    (session?.user as any)?.role === "SUPER_ADMIN" ||
    (session?.user as any)?.role === "ADMIN";

  if (!session?.user || !isAdmin) {
    return null;
  }
  return session;
}

export async function GET() {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
  }

  try {
    const [promoSetting, coupons, partners, commissions] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: "promo_enabled" } }),
      prisma.promoCoupon.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          partner: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              holds: { where: { status: "HELD" } },
              orders: { where: { status: "PAID" } },
            },
          },
        },
      }),
      prisma.partnerAffiliate.findMany({
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              coupons: true,
              commissions: true,
            },
          },
        },
      }),
      prisma.affiliateCommission.findMany({
        take: 100,
        orderBy: { createdAt: "desc" },
        include: {
          partner: { select: { id: true, name: true, bankName: true, accountNumber: true } },
          order: { select: { id: true, invoiceNumber: true, planType: true, status: true, paidAt: true } },
        },
      }),
    ]);

    return NextResponse.json({
      promoEnabled: promoSetting?.value === "true",
      coupons,
      partners,
      commissions,
    });
  } catch (error: any) {
    console.error("[Admin Marketing GET Error]", error);
    return NextResponse.json({ error: error.message || "Gagal memuat data pemasaran" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await checkAdminAuth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: "Action wajib disertakan" }, { status: 400 });
    }

    // ─────────────────────────────────────────────────────────────
    // 1. TOGGLE MASTER SWITCH PROMO
    // ─────────────────────────────────────────────────────────────
    if (action === "TOGGLE_MASTER_SWITCH") {
      const { value } = body;
      const strVal = value === true || value === "true" ? "true" : "false";

      await prisma.adminSetting.upsert({
        where: { key: "promo_enabled" },
        update: { value: strVal },
        create: {
          key: "promo_enabled",
          value: strVal,
          label: "Master Switch Fitur Promo & Referral",
          group: "payment",
        },
      });

      return NextResponse.json({ success: true, promoEnabled: strVal === "true" });
    }

    // ─────────────────────────────────────────────────────────────
    // 2. KELOLA KUPON PROMO (CRUD)
    // ─────────────────────────────────────────────────────────────
    if (action === "CREATE_COUPON") {
      const {
        code,
        description,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        quotaLimit,
        isSingleUse,
        perUserLimit,
        applicablePlans,
        validFrom,
        validUntil,
        isActive,
        partnerId,
      } = body;

      if (!code || typeof code !== "string" || !code.trim()) {
        return NextResponse.json({ error: "Kode kupon wajib diisi" }, { status: 400 });
      }

      const cleanCode = code.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
      if (cleanCode.length < 3 || cleanCode.length > 20) {
        return NextResponse.json({ error: "Kode kupon harus berupa 3-20 karakter huruf, angka, atau tanda minus" }, { status: 400 });
      }

      if (!discountValue || isNaN(Number(discountValue)) || Number(discountValue) <= 0) {
        return NextResponse.json({ error: "Nilai diskon harus lebih besar dari 0" }, { status: 400 });
      }

      const existing = await prisma.promoCoupon.findUnique({ where: { code: cleanCode } });
      if (existing) {
        return NextResponse.json({ error: `Kode "${cleanCode}" sudah digunakan. Silakan gunakan kode lain.` }, { status: 400 });
      }

      const coupon = await prisma.promoCoupon.create({
        data: {
          code: cleanCode,
          description: description?.trim() || null,
          discountType: (discountType === "PERCENT" ? "PERCENT" : "NOMINAL") as DiscountType,
          discountValue: Number(discountValue),
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          quotaLimit: quotaLimit !== null && quotaLimit !== undefined && quotaLimit !== "" ? Number(quotaLimit) : null,
          isSingleUse: Boolean(isSingleUse),
          perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
          applicablePlans: Array.isArray(applicablePlans) ? applicablePlans : [],
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          isActive: isActive !== false,
          partnerId: partnerId || null,
        },
      });

      return NextResponse.json({ success: true, coupon });
    }

    if (action === "UPDATE_COUPON") {
      const {
        id,
        description,
        discountType,
        discountValue,
        minOrderAmount,
        maxDiscountAmount,
        quotaLimit,
        isSingleUse,
        perUserLimit,
        applicablePlans,
        validFrom,
        validUntil,
        isActive,
        partnerId,
      } = body;

      if (!id) {
        return NextResponse.json({ error: "ID kupon diperlukan" }, { status: 400 });
      }

      const updated = await prisma.promoCoupon.update({
        where: { id },
        data: {
          description: description?.trim() || null,
          discountType: (discountType === "PERCENT" ? "PERCENT" : "NOMINAL") as DiscountType,
          discountValue: Number(discountValue),
          minOrderAmount: minOrderAmount ? Number(minOrderAmount) : 0,
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          quotaLimit: quotaLimit !== null && quotaLimit !== undefined && quotaLimit !== "" ? Number(quotaLimit) : null,
          isSingleUse: Boolean(isSingleUse),
          perUserLimit: perUserLimit ? Number(perUserLimit) : 1,
          applicablePlans: Array.isArray(applicablePlans) ? applicablePlans : [],
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          isActive: Boolean(isActive),
          partnerId: partnerId || null,
        },
      });

      return NextResponse.json({ success: true, coupon: updated });
    }

    if (action === "DELETE_COUPON") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID kupon diperlukan" }, { status: 400 });

      await prisma.promoCoupon.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Kupon berhasil dihapus" });
    }

    // ─────────────────────────────────────────────────────────────
    // 3. KELOLA MITRA AFILIASI (CRUD)
    // ─────────────────────────────────────────────────────────────
    if (action === "CREATE_PARTNER") {
      const {
        name,
        phoneNumber,
        email,
        bankName,
        accountNumber,
        accountName,
        commissionType,
        commissionValue,
        notes,
      } = body;

      if (!name || typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Nama mitra wajib diisi" }, { status: 400 });
      }

      if (!commissionValue || isNaN(Number(commissionValue)) || Number(commissionValue) < 0) {
        return NextResponse.json({ error: "Nilai komisi tidak valid" }, { status: 400 });
      }

      const partner = await prisma.partnerAffiliate.create({
        data: {
          name: name.trim(),
          phoneNumber: phoneNumber?.trim() || null,
          email: email?.trim() || null,
          bankName: bankName?.trim() || null,
          accountNumber: accountNumber?.trim() || null,
          accountName: accountName?.trim() || null,
          commissionType: (commissionType === "NOMINAL" ? "NOMINAL" : "PERCENT") as CommissionType,
          commissionValue: Number(commissionValue),
          notes: notes?.trim() || null,
          isActive: true,
        },
      });

      return NextResponse.json({ success: true, partner });
    }

    if (action === "UPDATE_PARTNER") {
      const {
        id,
        name,
        phoneNumber,
        email,
        bankName,
        accountNumber,
        accountName,
        commissionType,
        commissionValue,
        isActive,
        notes,
      } = body;

      if (!id) return NextResponse.json({ error: "ID mitra diperlukan" }, { status: 400 });

      const updated = await prisma.partnerAffiliate.update({
        where: { id },
        data: {
          name: name?.trim(),
          phoneNumber: phoneNumber?.trim() || null,
          email: email?.trim() || null,
          bankName: bankName?.trim() || null,
          accountNumber: accountNumber?.trim() || null,
          accountName: accountName?.trim() || null,
          commissionType: (commissionType === "NOMINAL" ? "NOMINAL" : "PERCENT") as CommissionType,
          commissionValue: Number(commissionValue),
          isActive: Boolean(isActive),
          notes: notes?.trim() || null,
        },
      });

      return NextResponse.json({ success: true, partner: updated });
    }

    if (action === "DELETE_PARTNER") {
      const { id, forceConfirm } = body;
      if (!id) return NextResponse.json({ error: "ID mitra diperlukan" }, { status: 400 });

      const partner = await prisma.partnerAffiliate.findUnique({
        where: { id },
        include: { _count: { select: { commissions: true } } },
      });

      if (!partner) {
        return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
      }

      // Proteksi saldo pending belum dicairkan
      if (Number(partner.pendingBalance) > 0 && !forceConfirm) {
        return NextResponse.json({
          error: `Mitra ini masih memiliki saldo komisi belum dibayar sebesar Rp ${Number(partner.pendingBalance).toLocaleString("id-ID")}. Silakan proses Payout terlebih dahulu atau konfirmasi penghapusan sadar.`,
          requiresForceConfirm: true,
          pendingBalance: Number(partner.pendingBalance),
        }, { status: 400 });
      }

      // Hapus komisi terkait jika forceConfirm aktif
      if (forceConfirm) {
        await prisma.affiliateCommission.deleteMany({ where: { partnerId: id } });
      }

      await prisma.partnerAffiliate.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Mitra berhasil dihapus" });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PAYOUT KOMISI MITRA (Otomatis Catat ke Expense Kategori MARKETING)
    // ─────────────────────────────────────────────────────────────
    if (action === "PAYOUT_PARTNER") {
      const { partnerId, amount, paymentSource, referenceNumber, notes } = body;
      if (!partnerId) {
        return NextResponse.json({ error: "partnerId wajib disertakan" }, { status: 400 });
      }

      const partner = await prisma.partnerAffiliate.findUnique({ where: { id: partnerId } });
      if (!partner) {
        return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
      }

      const currentPending = Number(partner.pendingBalance);
      if (currentPending <= 0) {
        return NextResponse.json({ error: "Mitra tidak memiliki saldo komisi yang perlu dibayar (Rp 0)." }, { status: 400 });
      }

      const payoutAmount = amount ? Number(amount) : currentPending;
      if (payoutAmount <= 0 || payoutAmount > currentPending) {
        return NextResponse.json({
          error: `Nominal pencairan tidak valid. Maksimal pencairan: Rp ${currentPending.toLocaleString("id-ID")}.`,
        }, { status: 400 });
      }

      // Eksekusi payout atomik dalam transaksi
      const payoutResult = await prisma.$transaction(async (tx) => {
        // 1. Buat catatan pengeluaran di tabel expenses
        const expense = await tx.expense.create({
          data: {
            title: `Payout Komisi Mitra: ${partner.name}`,
            category: "MARKETING",
            amount: payoutAmount,
            expenseDate: new Date(),
            paymentSource: paymentSource || "TRANSFER_BANK",
            referenceNumber: referenceNumber || null,
            notes: notes || `Transfer pencairan komisi mitra ke ${partner.bankName || "Bank"} ${partner.accountNumber || ""} a.n. ${partner.accountName || partner.name}`,
            createdById: (session.user as any)?.id || null,
          },
        });

        // 2. Tandai komisi PENDING menjadi PAID
        await tx.affiliateCommission.updateMany({
          where: {
            partnerId: partner.id,
            status: "PENDING",
          },
          data: {
            status: "PAID",
            paidAt: new Date(),
            payoutExpenseId: expense.id,
          },
        });

        // 3. Kurangi pendingBalance dan tambah totalPaidOut pada mitra
        const updatedPartner = await tx.partnerAffiliate.update({
          where: { id: partner.id },
          data: {
            pendingBalance: { decrement: payoutAmount },
            totalPaidOut: { increment: payoutAmount },
          },
        });

        return { expense, partner: updatedPartner };
      });

      return NextResponse.json({
        success: true,
        message: `Payout berhasil dicatat sebesar Rp ${payoutAmount.toLocaleString("id-ID")}`,
        expenseId: payoutResult.expense.id,
        remainingBalance: Number(payoutResult.partner.pendingBalance),
      });
    }

    return NextResponse.json({ error: `Action "${action}" tidak dikenali.` }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Marketing POST Error]", error);
    return NextResponse.json({ error: error.message || "Gagal memproses aksi pemasaran" }, { status: 500 });
  }
}
