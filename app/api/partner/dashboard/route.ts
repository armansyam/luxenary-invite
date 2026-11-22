import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { getPublicPlatformSettings } from "@/lib/settings";
import {
  MIN_PAYABLE_AMOUNT_IDR,
  calculatePartnerWholesaleDiscount,
} from "@/lib/clientActivation";

export const dynamic = "force-dynamic";

function maskAccountNumber(accountNumber: string | null): string | null {
  if (!accountNumber) return null;
  const clean = accountNumber.trim();
  if (clean.length <= 4) return clean;
  return `${"*".repeat(Math.max(4, clean.length - 4))}${clean.slice(-4)}`;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getPartnerSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.partnerAffiliate.findUnique({
      where: { id: session.partnerId },
      select: {
        id: true,
        name: true,
        email: true,
        phoneNumber: true,
        bankName: true,
        accountNumber: true,
        accountName: true,
        commissionType: true,
        commissionValue: true,
        pendingBalance: true,
        totalPaidOut: true,
        isActive: true,
        sessionVersion: true,
        coupons: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            code: true,
            description: true,
            discountType: true,
            discountValue: true,
            quotaLimit: true,
            usageCount: true,
            validFrom: true,
            validUntil: true,
            isActive: true,
          },
        },
        commissions: {
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            orderId: true,
            orderAmount: true,
            commissionAmount: true,
            status: true,
            paidAt: true,
            createdAt: true,
            order: {
              select: {
                invoiceNumber: true,
                planType: true,
                amount: true,
                paidAt: true,
              },
            },
          },
        },
        payoutExpenses: {
          orderBy: { expenseDate: "desc" },
          take: 50,
          select: {
            id: true,
            amount: true,
            expenseDate: true,
            paymentSource: true,
            referenceNumber: true,
            notes: true,
            receiptUrl: true,
          },
        },
        provisionedClients: {
          select: {
            id: true,
            passwordHash: true,
            googleId: true,
            orders: {
              where: { orderType: "NEW" },
              orderBy: { createdAt: "desc" },
              select: {
                id: true,
                invoiceNumber: true,
                planType: true,
                orderType: true,
                status: true,
                amount: true,
                discountAmount: true,
                promoCodeApplied: true,
                paidAt: true,
                createdAt: true,
              },
            },
            name: true,
            email: true,
          },
        },
      },
    });

    if (!partner || !partner.isActive) {
      return NextResponse.json(
        { error: "Akun mitra tidak ditemukan atau sudah dinonaktifkan." },
        { status: 403 },
      );
    }

    if (session.sv !== partner.sessionVersion) {
      const expired = NextResponse.json(
        { error: "Sesi telah berakhir karena perubahan keamanan akun. Silakan masuk kembali." },
        { status: 401 },
      );
      expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return expired;
    }

    const pendingBalance = Number(partner.pendingBalance);
    const totalPaidOut = Number(partner.totalPaidOut);
    const totalEarned = partner.commissions.reduce(
      (sum, item) => sum + Number(item.commissionAmount),
      0,
    );
    const totalClients = partner.provisionedClients.length;
    const activeClients = partner.provisionedClients.filter(
      (c) => Boolean(c.passwordHash || c.googleId),
    ).length;
    const pendingActivationClients = totalClients - activeClients;

    const allClientTransactions = partner.provisionedClients
      .flatMap((c) =>
        c.orders.map((o) => {
          const finalAmount = Number(o.amount || 0);
          const discountAmount = o.discountAmount ? Number(o.discountAmount) : 0;
          const baseAmount = o.status === "PAID" || discountAmount > 0 ? finalAmount + discountAmount : finalAmount;
          return {
            id: o.id,
            invoiceNumber: o.invoiceNumber,
            clientId: c.id,
            clientName: c.name,
            clientEmail: c.email,
            planType: o.planType,
            orderType: o.orderType,
            status: o.status,
            baseAmount,
            discountAmount,
            finalAmount,
            promoCodeApplied: o.promoCodeApplied,
            paidAt: o.paidAt,
            createdAt: o.createdAt,
          };
        }),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const paidTransactions = allClientTransactions.filter((t) => t.status === "PAID");
    const pendingTransactions = allClientTransactions.filter((t) => t.status === "PENDING");
    const totalPaidNetAmount = paidTransactions.reduce((sum, t) => sum + t.finalAmount, 0);
    const totalWholesaleSavings = paidTransactions.reduce((sum, t) => sum + t.discountAmount, 0);

    const platformSettings = await getPublicPlatformSettings();
    const partnerPackages = (platformSettings.packages || []).map((pkg) => {
      const basePrice = Number(pkg.price || 0);
      const discountAmount = calculatePartnerWholesaleDiscount(basePrice, partner);
      const partnerPrice = Math.max(MIN_PAYABLE_AMOUNT_IDR, basePrice - discountAmount);
      return {
        id: pkg.id,
        name: pkg.name,
        desc: pkg.desc,
        badge: pkg.badge || null,
        isFeatured: Boolean(pkg.isFeatured),
        basePrice,
        discountAmount,
        partnerPrice,
      };
    });

    return NextResponse.json(
      {
        success: true,
        platform: {
          name: platformSettings.platformName,
          paymentMode: platformSettings.paymentMode,
          feePercent: platformSettings.paymentGatewayFeePercent,
          feePayer: platformSettings.paymentGatewayFeePayer,
          bank: {
            bankName: platformSettings.bankName,
            bankAccountNumber: platformSettings.bankAccountNumber,
            bankAccountHolder: platformSettings.bankAccountHolder,
            bankInstructions: platformSettings.bankInstructions,
          },
          packages: partnerPackages,
        },
        partner: {
          id: partner.id,
          name: partner.name,
          email: partner.email,
          phoneNumber: partner.phoneNumber,
          bankName: partner.bankName,
          accountNumberMasked: maskAccountNumber(partner.accountNumber),
          accountName: partner.accountName,
          commissionType: partner.commissionType,
          commissionValue: Number(partner.commissionValue),
          pendingBalance,
          totalPaidOut,
          totalEarned,
          totalTransactions: paidTransactions.length,
          clientStats: {
            totalClients,
            activeClients,
            pendingActivationClients,
            paidClientOrders: paidTransactions.length,
            pendingClientOrders: pendingTransactions.length,
            totalPaidNetAmount,
            totalWholesaleSavings,
          },
        },
        clientTransactions: allClientTransactions.slice(0, 150),
        coupons: partner.coupons.map((coupon) => ({
          ...coupon,
          discountValue: Number(coupon.discountValue),
        })),
        commissions: partner.commissions.map((item) => ({
          id: item.id,
          orderId: item.orderId,
          orderAmount: Number(item.orderAmount),
          commissionAmount: Number(item.commissionAmount),
          status: item.status,
          paidAt: item.paidAt,
          createdAt: item.createdAt,
          order: item.order
            ? {
                invoiceNumber: item.order.invoiceNumber,
                planType: item.order.planType,
                amount: Number(item.order.amount),
                paidAt: item.order.paidAt,
              }
            : null,
        })),
        payouts: partner.payoutExpenses.map((p) => ({
          id: p.id,
          amount: Number(p.amount),
          expenseDate: p.expenseDate,
          paymentSource: p.paymentSource || "TRANSFER_BANK",
          referenceNumber: p.referenceNumber,
          notes: p.notes,
          hasReceipt: Boolean(p.receiptUrl),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError("PartnerDashboard", error, "Gagal memuat data portal mitra.");
  }
}
