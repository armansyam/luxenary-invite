import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { fileTypeFromBuffer } from "file-type";
import { CommissionType, DiscountType } from "@prisma/client";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { HttpError, routeError } from "@/lib/routeError";
import { readFormBody, readJsonBody } from "@/lib/requestBody";
import { optionalText, receiptUrlInput } from "@/lib/financeInput";
import { deleteFile, readPrivateFile, uploadPrivateFile } from "@/lib/storage";
import { sendPartnerPayoutEmail } from "@/lib/mailer";
import { getTrustedAppUrl } from "@/lib/serverDomainUtils";

export const dynamic = "force-dynamic";

const ALLOWED_PAYOUT_SOURCES = new Set(["TRANSFER_BANK", "E_WALLET", "TUNAI"]);
const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const EXT_TO_MIME: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};
const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const VENDOR_CATEGORIES_SETTING_KEY = "partner_vendor_categories";
const DEFAULT_VENDOR_CATEGORIES = [
  "Wedding Organizer (WO)",
  "Event Organizer (EO)",
  "Fotografer & Videografer",
  "MUA & Busana",
  "Venue & Gedung",
  "Dekorasi",
  "Catering",
];

function parseVendorCategoryList(raw: string | null | undefined, existingFromPartners: (string | null | undefined)[] = []): string[] {
  const seen = new Map<string, string>();
  const addUnique = (val: unknown) => {
    if (typeof val !== "string") return;
    const clean = val.trim().replace(/\s+/g, " ").slice(0, 60);
    if (!clean) return;
    const key = clean.toLowerCase();
    if (!seen.has(key)) seen.set(key, clean);
  };

  let parsed: unknown[] = [];
  if (raw) {
    try {
      const json = JSON.parse(raw);
      if (Array.isArray(json)) parsed = json;
    } catch {
      parsed = [];
    }
  }

  if (parsed.length > 0) {
    parsed.forEach(addUnique);
  } else {
    DEFAULT_VENDOR_CATEGORIES.forEach(addUnique);
  }
  existingFromPartners.forEach(addUnique);
  return Array.from(seen.values());
}

async function ensureVendorCategorySaved(rawCategory: string | null): Promise<string[]> {
  const setting = await prisma.adminSetting.findUnique({ where: { key: VENDOR_CATEGORIES_SETTING_KEY } });
  const current = parseVendorCategoryList(setting?.value);
  const clean = typeof rawCategory === "string" ? rawCategory.trim().replace(/\s+/g, " ").slice(0, 60) : "";
  if (clean && !current.some((c) => c.toLowerCase() === clean.toLowerCase())) {
    const next = [...current, clean];
    await prisma.adminSetting.upsert({
      where: { key: VENDOR_CATEGORIES_SETTING_KEY },
      update: { value: JSON.stringify(next) },
      create: { key: VENDOR_CATEGORIES_SETTING_KEY, value: JSON.stringify(next) },
    });
    return next;
  }
  return current;
}

function maskAccountNumber(accountNumber: string | null): string | null {
  if (!accountNumber) return null;
  const clean = accountNumber.trim();
  if (clean.length <= 4) return clean;
  return `${"*".repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

function safeSlugSegment(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 32) || "mitra"
  );
}

/**
 * GET & POST /api/admin/marketing
 * API Admin untuk Manajemen Pemasaran: Master Switch, Kupon Promo, Mitra Afiliasi, & Payout Komisi
 */

// Aturan yang sama dijaga CHECK di database (migrasi 20261005120000); di sini input buruk dijawab 400, bukan 500.
function couponInputError(input: {
  discountType: unknown;
  discountValue: unknown;
  maxDiscountAmount: unknown;
  quotaLimit: unknown;
  validFrom: unknown;
  validUntil: unknown;
}): string | null {
  const value = Number(input.discountValue);
  if (!Number.isFinite(value) || value <= 0) return "Nilai diskon harus lebih besar dari 0";
  if (input.discountType === "PERCENT" && value > 99) return "Diskon persen maksimal 99: paket gratis tidak didukung";
  if (input.maxDiscountAmount && !(Number(input.maxDiscountAmount) >= 0)) return "Batas diskon maksimal tidak valid";
  const hasQuota = input.quotaLimit !== null && input.quotaLimit !== undefined && input.quotaLimit !== "";
  if (hasQuota && !(Number.isInteger(Number(input.quotaLimit)) && Number(input.quotaLimit) >= 0)) {
    return "Kuota harus bilangan bulat tidak negatif";
  }
  if (input.validFrom && input.validUntil && new Date(String(input.validUntil)) < new Date(String(input.validFrom))) {
    return "Tanggal berakhir tidak boleh sebelum tanggal mulai";
  }
  return null;
}

function partnerCommissionError(commissionType: unknown, commissionValue: unknown): string | null {
  const value = Number(commissionValue);
  if (!Number.isFinite(value) || value < 0) return "Nilai potongan mitra tidak valid";
  if (commissionType !== "NOMINAL" && value > 95) return "Potongan mitra persen maksimal 95%";
  return null;
}

function sanitizePartner<T extends { passwordHash?: string | null }>(partner: T): Omit<T, "passwordHash"> & { hasPassword: boolean } {
  const { passwordHash, ...rest } = partner;
  return { ...rest, hasPassword: Boolean(passwordHash) };
}

export async function GET() {
  const guard = await requireAdminModule("marketing");
  if (!guard.ok) return guard.response;

  try {
    const [promoSetting, vendorCategoriesSetting, coupons, partners, commissions, payouts] = await Promise.all([
      prisma.adminSetting.findUnique({ where: { key: "promo_enabled" } }),
      prisma.adminSetting.findUnique({ where: { key: VENDOR_CATEGORIES_SETTING_KEY } }),
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
              provisionedClients: true,
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
      prisma.expense.findMany({
        where: { partnerAffiliateId: { not: null } },
        take: 100,
        orderBy: { expenseDate: "desc" },
        select: {
          id: true,
          amount: true,
          expenseDate: true,
          paymentSource: true,
          referenceNumber: true,
          notes: true,
          receiptUrl: true,
          partnerAffiliateId: true,
          partnerAffiliate: {
            select: { id: true, name: true, email: true, bankName: true, accountNumber: true },
          },
        },
      }),
    ]);

    const vendorCategories = parseVendorCategoryList(
      vendorCategoriesSetting?.value,
      partners.map((p) => p.vendorCategory),
    );

    return NextResponse.json({
      promoEnabled: promoSetting?.value === "true",
      vendorCategories,
      coupons,
      partners: partners.map(sanitizePartner),
      commissions,
      payouts: payouts.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        expenseDate: p.expenseDate,
        paymentSource: p.paymentSource,
        referenceNumber: p.referenceNumber,
        notes: p.notes,
        hasReceipt: Boolean(p.receiptUrl),
        partnerAffiliateId: p.partnerAffiliateId,
        partner: p.partnerAffiliate,
      })),
    });
  } catch (error) {
    return routeError("AdminMarketing", error, "Gagal memuat data pemasaran");
  }
}

export async function POST(req: NextRequest) {
  const guard = await requireAdminModule("marketing");
  if (!guard.ok) return guard.response;
  const { session } = guard;

  try {
    const contentType = req.headers.get("content-type") || "";
    let body: Record<string, any> = {};
    let uploadedReceiptFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const formData = await readFormBody(req);
      for (const [key, val] of formData.entries()) {
        if (typeof val === "string") {
          body[key] = val;
        } else if (key === "receiptFile" && val instanceof File && val.size > 0) {
          uploadedReceiptFile = val;
        }
      }
    } else {
      body = (await readJsonBody(req)) ?? {};
    }
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
        maxDiscountAmount,
        quotaLimit,
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

      const couponError = couponInputError({ discountType, discountValue, maxDiscountAmount, quotaLimit, validFrom, validUntil });
      if (couponError) {
        return NextResponse.json({ error: couponError }, { status: 400 });
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
          minOrderAmount: 0, // Tidak diekspos di form — selalu 0 (filter paket via applicablePlans)
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          quotaLimit: quotaLimit !== null && quotaLimit !== undefined && quotaLimit !== "" ? Number(quotaLimit) : null,
          perUserLimit: 1, // Hardcode: 1 akun = 1 kali pakai, tidak bisa diubah dari form
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
        maxDiscountAmount,
        quotaLimit,
        applicablePlans,
        validFrom,
        validUntil,
        isActive,
        partnerId,
      } = body;

      if (!id) {
        return NextResponse.json({ error: "ID kupon diperlukan" }, { status: 400 });
      }

      const couponError = couponInputError({ discountType, discountValue, maxDiscountAmount, quotaLimit, validFrom, validUntil });
      if (couponError) {
        return NextResponse.json({ error: couponError }, { status: 400 });
      }

      const updated = await prisma.promoCoupon.update({
        where: { id },
        data: {
          description: description?.trim() || null,
          discountType: (discountType === "PERCENT" ? "PERCENT" : "NOMINAL") as DiscountType,
          discountValue: Number(discountValue),
          minOrderAmount: 0, // Tidak diekspos di form — selalu 0
          maxDiscountAmount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
          quotaLimit: quotaLimit !== null && quotaLimit !== undefined && quotaLimit !== "" ? Number(quotaLimit) : null,
          perUserLimit: 1, // Hardcode: 1 akun = 1 kali pakai
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
    if (action === "ADD_VENDOR_CATEGORY") {
      const rawName = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
      if (rawName.length < 2 || rawName.length > 60) {
        return NextResponse.json({ error: "Nama kategori vendor harus 2–60 karakter." }, { status: 400 });
      }
      const vendorCategories = await ensureVendorCategorySaved(rawName);
      return NextResponse.json({ success: true, category: rawName, vendorCategories });
    }

    if (action === "CREATE_PARTNER") {
      const {
        name,
        vendorCategory,
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

      const commissionError = commissionValue ? partnerCommissionError(commissionType, commissionValue) : "Nilai potongan mitra tidak valid";
      if (commissionError) {
        return NextResponse.json({ error: commissionError }, { status: 400 });
      }

      const cleanEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
      const cleanCategory =
        typeof vendorCategory === "string" && vendorCategory.trim()
          ? vendorCategory.trim().replace(/\s+/g, " ").slice(0, 60)
          : null;
      if (cleanEmail) {
        const dupEmail = await prisma.partnerAffiliate.findFirst({
          where: { email: { equals: cleanEmail, mode: "insensitive" } },
          select: { id: true, name: true },
        });
        if (dupEmail) {
          return NextResponse.json(
            { error: `Email "${cleanEmail}" sudah terdaftar pada mitra "${dupEmail.name}". Gunakan email yang berbeda.` },
            { status: 409 },
          );
        }
      }

      const partner = await prisma.partnerAffiliate.create({
        data: {
          name: name.trim(),
          vendorCategory: cleanCategory,
          phoneNumber: phoneNumber?.trim() || null,
          email: cleanEmail,
          bankName: bankName?.trim() || null,
          accountNumber: accountNumber?.trim() || null,
          accountName: accountName?.trim() || null,
          commissionType: (commissionType === "NOMINAL" ? "NOMINAL" : "PERCENT") as CommissionType,
          commissionValue: Number(commissionValue),
          notes: notes?.trim() || null,
          isActive: true,
        },
      });

      const vendorCategories = await ensureVendorCategorySaved(cleanCategory);
      return NextResponse.json({ success: true, partner: sanitizePartner(partner), vendorCategories });
    }

    if (action === "UPDATE_PARTNER") {
      const {
        id,
        name,
        vendorCategory,
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

      const commissionError = partnerCommissionError(commissionType, commissionValue);
      if (commissionError) {
        return NextResponse.json({ error: commissionError }, { status: 400 });
      }

      const existingPartner = await prisma.partnerAffiliate.findUnique({
        where: { id },
        select: { id: true, email: true, isActive: true },
      });
      if (!existingPartner) {
        return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
      }

      const cleanEmail = typeof email === "string" && email.trim() ? email.trim().toLowerCase() : null;
      const cleanCategory =
        typeof vendorCategory === "string" && vendorCategory.trim()
          ? vendorCategory.trim().replace(/\s+/g, " ").slice(0, 60)
          : null;
      if (cleanEmail) {
        const dupEmail = await prisma.partnerAffiliate.findFirst({
          where: {
            email: { equals: cleanEmail, mode: "insensitive" },
            id: { not: id },
          },
          select: { id: true, name: true },
        });
        if (dupEmail) {
          return NextResponse.json(
            { error: `Email "${cleanEmail}" sudah terdaftar pada mitra "${dupEmail.name}". Gunakan email yang berbeda.` },
            { status: 409 },
          );
        }
      }

      const emailChanged = (existingPartner.email || "").trim().toLowerCase() !== (cleanEmail || "");
      const deactivated = existingPartner.isActive && !Boolean(isActive);

      const updated = await prisma.partnerAffiliate.update({
        where: { id },
        data: {
          name: name?.trim(),
          vendorCategory: cleanCategory,
          phoneNumber: phoneNumber?.trim() || null,
          email: cleanEmail,
          bankName: bankName?.trim() || null,
          accountNumber: accountNumber?.trim() || null,
          accountName: accountName?.trim() || null,
          commissionType: (commissionType === "NOMINAL" ? "NOMINAL" : "PERCENT") as CommissionType,
          commissionValue: Number(commissionValue),
          isActive: Boolean(isActive),
          notes: notes?.trim() || null,
          ...(emailChanged || deactivated ? { sessionVersion: { increment: 1 } } : {}),
        },
      });

      const vendorCategories = await ensureVendorCategorySaved(cleanCategory);
      return NextResponse.json({ success: true, partner: sanitizePartner(updated), vendorCategories });
    }

    if (action === "DELETE_PARTNER") {
      const { id } = body;
      if (!id) return NextResponse.json({ error: "ID mitra diperlukan" }, { status: 400 });

      const partner = await prisma.partnerAffiliate.findUnique({
        where: { id },
        include: { _count: { select: { commissions: true } } },
      });

      if (!partner) {
        return NextResponse.json({ error: "Mitra tidak ditemukan" }, { status: 404 });
      }

      // Komisi adalah catatan keuangan (dibayar lewat pengeluaran MARKETING) dan relasinya Restrict: mitra yang
      // pernah mendapat komisi hanya dapat dinonaktifkan.
      if (partner._count.commissions > 0) {
        return NextResponse.json({
          error: `Mitra ini punya ${partner._count.commissions} catatan komisi yang harus tetap tersimpan, sehingga tidak dapat dihapus. Nonaktifkan mitra agar kodenya tidak dapat dipakai lagi.`,
        }, { status: 409 });
      }

      await prisma.partnerAffiliate.delete({ where: { id } });
      return NextResponse.json({ success: true, message: "Mitra berhasil dihapus" });
    }

    // ─────────────────────────────────────────────────────────────
    // 4. PAYOUT KOMISI MITRA (Catat Expense MARKETING + Bukti Transfer + Email Mitra)
    // ─────────────────────────────────────────────────────────────
    if (action === "PAYOUT_PARTNER") {
      const { partnerId, amount, paymentSource, referenceNumber, notes, receiptUrl } = body;
      if (!partnerId || typeof partnerId !== "string") {
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

      const payoutAmount = amount !== undefined && amount !== null && String(amount).trim() !== ""
        ? Number(amount)
        : currentPending;
      if (!Number.isFinite(payoutAmount) || payoutAmount <= 0 || payoutAmount > currentPending) {
        return NextResponse.json({
          error: `Nominal pencairan tidak valid. Maksimal pencairan: Rp ${currentPending.toLocaleString("id-ID")}.`,
        }, { status: 400 });
      }

      const cleanPaymentSource =
        typeof paymentSource === "string" && ALLOWED_PAYOUT_SOURCES.has(paymentSource)
          ? paymentSource
          : "TRANSFER_BANK";
      const cleanReferenceNumber = optionalText(referenceNumber, 100);
      const cleanNotes = optionalText(notes, 500);

      let storedReceiptRef: string | null = null;
      let uploadedFreshRef = false;
      let attachmentBuffer: Buffer | null = null;
      let attachmentMime: string | null = null;
      let attachmentExt: string | null = null;

      if (uploadedReceiptFile) {
        if (uploadedReceiptFile.size > MAX_RECEIPT_BYTES) {
          return NextResponse.json({ error: "Ukuran bukti transfer maksimal 5MB." }, { status: 400 });
        }
        const buffer = Buffer.from(await uploadedReceiptFile.arrayBuffer());
        const detected = await fileTypeFromBuffer(buffer);
        const ext = detected ? ALLOWED_RECEIPT_TYPES[detected.mime] : undefined;
        if (!ext || !detected) {
          return NextResponse.json(
            { error: "Format bukti transfer tidak didukung. Gunakan JPG, PNG, WEBP, atau PDF." },
            { status: 400 },
          );
        }
        const uniqueFileName = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;
        storedReceiptRef = await uploadPrivateFile(buffer, `receipts/${uniqueFileName}`, detected.mime);
        uploadedFreshRef = true;
        attachmentBuffer = buffer;
        attachmentMime = detected.mime;
        attachmentExt = ext;
      } else if (receiptUrl !== undefined && receiptUrl !== null && receiptUrl !== "") {
        const parsedReceipt = receiptUrlInput(receiptUrl);
        if (!parsedReceipt.ok) {
          return NextResponse.json({ error: "Referensi bukti transfer tidak valid." }, { status: 400 });
        }
        storedReceiptRef = parsedReceipt.value;
        if (storedReceiptRef) {
          attachmentBuffer = await readPrivateFile(storedReceiptRef);
          const extWithDot = path.extname(storedReceiptRef).toLowerCase();
          attachmentExt = extWithDot.replace(/^\./, "") || "bin";
          attachmentMime = EXT_TO_MIME[extWithDot] || "application/octet-stream";
        }
      }

      // Eksekusi payout atomik dalam transaksi. Saldo dipotong bersyarat (saldo saat ini masih mencukupi): klik ganda atau
      // dua admin bersamaan tidak boleh mencairkan saldo yang sama dua kali.
      const actorId = adminActorId(session);
      const paidAt = new Date();
      let payoutResult: { expenseId: string; remainingBalance: number };
      try {
        payoutResult = await prisma.$transaction(async (tx) => {
          const debited = await tx.partnerAffiliate.updateMany({
            where: { id: partner.id, pendingBalance: { gte: payoutAmount } },
            data: {
              pendingBalance: { decrement: payoutAmount },
              totalPaidOut: { increment: payoutAmount },
            },
          });
          if (debited.count === 0) {
            throw new HttpError(409, "Saldo komisi mitra baru saja berubah (mungkin sudah dicairkan). Muat ulang lalu coba lagi.");
          }

          // 1. Buat catatan pengeluaran di tabel expenses (terhubung langsung ke mitra + struk privat)
          const expense = await tx.expense.create({
            data: {
              title: `Payout Komisi Mitra: ${partner.name}`,
              category: "MARKETING",
              amount: payoutAmount,
              expenseDate: paidAt,
              paymentSource: cleanPaymentSource,
              referenceNumber: cleanReferenceNumber,
              receiptUrl: storedReceiptRef,
              partnerAffiliateId: partner.id,
              notes:
                cleanNotes ||
                `Transfer pencairan komisi mitra ke ${partner.bankName || "Bank"} ${partner.accountNumber || ""} a.n. ${partner.accountName || partner.name}`,
              createdById: actorId,
            },
          });

          // 2. Tandai komisi PENDING menjadi PAID secara FIFO (createdAt ASC) sepanjang nominalnya tercukupi oleh
          // pencairan ini, atau seluruhnya apabila sisa saldo pending sudah 0.
          const updatedPartner = await tx.partnerAffiliate.findUniqueOrThrow({ where: { id: partner.id } });
          if (Number(updatedPartner.pendingBalance) <= 0) {
            await tx.affiliateCommission.updateMany({
              where: {
                partnerId: partner.id,
                status: "PENDING",
              },
              data: {
                status: "PAID",
                paidAt,
                payoutExpenseId: expense.id,
              },
            });
          } else {
            const pendingCommissions = await tx.affiliateCommission.findMany({
              where: { partnerId: partner.id, status: "PENDING" },
              orderBy: { createdAt: "asc" },
              select: { id: true, commissionAmount: true },
            });
            let budget = payoutAmount;
            const settledIds: string[] = [];
            for (const comm of pendingCommissions) {
              const commAmt = Number(comm.commissionAmount);
              if (commAmt <= budget + 1e-6) {
                settledIds.push(comm.id);
                budget -= commAmt;
              } else {
                break;
              }
            }
            if (settledIds.length > 0) {
              await tx.affiliateCommission.updateMany({
                where: { id: { in: settledIds }, status: "PENDING" },
                data: {
                  status: "PAID",
                  paidAt,
                  payoutExpenseId: expense.id,
                },
              });
            }
          }

          await tx.adminAuditLog.create({
            data: {
              adminId: actorId,
              action: "PAYOUT_PARTNER",
              details: `Pencairan komisi mitra ${partner.name} sebesar Rp ${payoutAmount.toLocaleString("id-ID")}; sisa saldo Rp ${Number(updatedPartner.pendingBalance).toLocaleString("id-ID")}${storedReceiptRef ? " (dengan bukti transfer)" : ""}`,
            },
          });

          return {
            expenseId: expense.id,
            remainingBalance: Number(updatedPartner.pendingBalance),
          };
        });
      } catch (txError) {
        if (uploadedFreshRef && storedReceiptRef) {
          await deleteFile(storedReceiptRef).catch(() => {});
        }
        throw txError;
      }

      const { expenseId, remainingBalance } = payoutResult;
      let emailSent = false;
      let emailError: string | null = null;

      if (partner.email?.trim()) {
        const recipientEmail = partner.email.trim();
        const paidAtFormatted = `${paidAt.toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "long",
          timeStyle: "short",
        })} WIB`;
        const dateYmd = paidAt.toISOString().slice(0, 10);
        const appUrl = await getTrustedAppUrl();

        const emailRes = await sendPartnerPayoutEmail({
          partnerName: partner.name,
          recipientEmail,
          amount: payoutAmount,
          remainingBalance,
          paidAtFormatted,
          bankName: partner.bankName,
          accountNumberMasked: maskAccountNumber(partner.accountNumber),
          accountName: partner.accountName,
          paymentSource: cleanPaymentSource,
          referenceNumber: cleanReferenceNumber,
          notes: cleanNotes,
          hasAttachment: Boolean(attachmentBuffer && attachmentMime && attachmentExt),
          appUrl,
          attachment:
            attachmentBuffer && attachmentMime && attachmentExt
              ? {
                  filename: `bukti-transfer-komisi-${safeSlugSegment(partner.name)}-${dateYmd}.${attachmentExt}`,
                  content: attachmentBuffer,
                  contentType: attachmentMime,
                }
              : null,
        });
        emailSent = emailRes.success;
        emailError = emailRes.success ? null : emailRes.error || "EMAIL_SEND_FAILED";
      } else {
        emailError = "PARTNER_EMAIL_MISSING";
      }

      return NextResponse.json({
        success: true,
        message: `Payout berhasil dicatat sebesar Rp ${payoutAmount.toLocaleString("id-ID")}`,
        expenseId,
        remainingBalance,
        hasReceipt: Boolean(storedReceiptRef),
        emailSent,
        emailRecipient: partner.email?.trim() || null,
        emailError,
      });
    }

    return NextResponse.json({ error: `Action "${action}" tidak dikenali.` }, { status: 400 });
  } catch (error) {
    return routeError("AdminMarketing", error, "Gagal memproses aksi pemasaran");
  }
}
