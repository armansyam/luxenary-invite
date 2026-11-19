import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { getPartnerSessionFromRequest } from "@/lib/partnerAuth";

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
      },
    });

    if (!partner || !partner.isActive) {
      return NextResponse.json(
        { error: "Akun mitra tidak ditemukan atau sudah dinonaktifkan." },
        { status: 403 },
      );
    }

    const pendingBalance = Number(partner.pendingBalance);
    const totalPaidOut = Number(partner.totalPaidOut);
    const totalEarned = partner.commissions.reduce(
      (sum, item) => sum + Number(item.commissionAmount),
      0,
    );

    return NextResponse.json(
      {
        success: true,
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
          totalTransactions: partner.commissions.length,
        },
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
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError("PartnerDashboard", error, "Gagal memuat data portal mitra.");
  }
}
