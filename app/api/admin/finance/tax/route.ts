import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      role === "SUPPORT" ||
      role === "FINANCE";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const now = new Date();
    const targetYear = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    const startOfYear = new Date(targetYear, 0, 1);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    // Ambil semua order PAID di tahun tersebut
    const ordersInYear = await prisma.order.findMany({
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      select: {
        amount: true,
        createdAt: true,
      },
    });

    // Ambil data financial closing di tahun tersebut untuk status closing & tax paid
    const closingsInYear = await prisma.financialClosing.findMany({
      where: {
        periodYear: targetYear,
      },
    });

    // Buat rekap 12 bulan (Januari - Desember)
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    let totalGrossRevenueYear = 0;
    let totalTaxDueYear = 0;
    let totalTaxPaidYear = 0;

    const monthlyBreakdown = monthNames.map((name, index) => {
      const monthNum = index + 1; // 1 - 12
      const closing = closingsInYear.find((c) => c.periodMonth === monthNum);

      // Hitung gross turnover (omzet) dari order paid
      const monthlyOrders = ordersInYear.filter((o) => {
        const orderMonth = new Date(o.createdAt).getMonth() + 1;
        return orderMonth === monthNum;
      });

      // Jika ada snapshot di closing, gunakan snapshot resmi; jika belum ada closing, gunakan realtime order sum
      const grossRevenue = closing
        ? Number(closing.grossRevenue)
        : monthlyOrders.reduce((sum, o) => sum + Number(o.amount), 0);

      // PPh Final 0.5% (PP 55/2022)
      const taxDue = Math.round(grossRevenue * 0.005);
      const isTaxPaid = closing ? closing.taxPaid : false;
      const taxPaidAt = closing?.taxPaidAt ? closing.taxPaidAt.toISOString() : null;

      totalGrossRevenueYear += grossRevenue;
      totalTaxDueYear += taxDue;
      if (isTaxPaid) {
        totalTaxPaidYear += taxDue;
      }

      return {
        monthIndex: monthNum,
        monthName: name,
        year: targetYear,
        orderCount: monthlyOrders.length,
        grossRevenue,
        taxRate: 0.005,
        taxRateLabel: "0.5% (PP 55/2022)",
        taxDue,
        isTaxPaid,
        taxPaidAt,
        isClosed: Boolean(closing),
        closingId: closing?.id || null,
        notes: closing?.notes || null,
      };
    });

    return NextResponse.json({
      taxYear: targetYear,
      regulationBasis: "PP 55 Tahun 2022 (PPh Final UMKM / Omzet Peredaran Bruto)",
      monthlyBreakdown,
      summary: {
        totalGrossRevenueYear,
        totalTaxDueYear,
        totalTaxPaidYear,
        remainingTaxDueYear: Math.max(0, totalTaxDueYear - totalTaxPaidYear),
        paidMonthsCount: monthlyBreakdown.filter((m) => m.isTaxPaid).length,
      },
    });
  } catch (err: any) {
    console.error("Tax breakdown GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN" ||
      role === "FINANCE";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator Finance." }, { status: 401 });
    }

    const body = await req.json();
    const { month, year, taxPaid, ntpn, taxPaidAt } = body;

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: "Bulan (1-12) dan tahun valid wajib disertakan." }, { status: 400 });
    }

    // Cek apakah closing sudah ada untuk bulan ini
    let closing = await prisma.financialClosing.findUnique({
      where: {
        periodMonth_periodYear: {
          periodMonth: monthNum,
          periodYear: yearNum,
        },
      },
    });

    const isPaid = Boolean(taxPaid);
    const paymentDate = taxPaidAt ? new Date(taxPaidAt) : isPaid ? new Date() : null;

    if (closing) {
      // Update status pajak pada closing yang sudah ada
      let updatedNotes = closing.notes || "";
      if (ntpn) {
        updatedNotes = updatedNotes ? `${updatedNotes} | NTPN: ${ntpn}` : `NTPN: ${ntpn}`;
      }

      closing = await prisma.financialClosing.update({
        where: { id: closing.id },
        data: {
          taxPaid: isPaid,
          taxPaidAt: paymentDate,
          notes: updatedNotes,
        },
      });
    } else {
      // Jika belum pernah tutup buku, hitung snapshot otomatis lalu buat closing
      const startOfMonth = new Date(yearNum, monthNum - 1, 1);
      const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      const [revenueAgg, expenseAgg] = await Promise.all([
        prisma.order.aggregate({
          where: {
            status: "PAID",
            createdAt: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            expenseDate: { gte: startOfMonth, lte: endOfMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      const grossRev = Number(revenueAgg._sum?.amount || 0);
      const totalExp = Number(expenseAgg._sum?.amount || 0);
      const net = grossRev - totalExp;
      const taxDue = Math.round(grossRev * 0.005);

      closing = await prisma.financialClosing.create({
        data: {
          periodMonth: monthNum,
          periodYear: yearNum,
          grossRevenue: grossRev,
          totalExpenses: totalExp,
          netProfit: net,
          taxAmount: taxDue,
          taxPaid: isPaid,
          taxPaidAt: paymentDate,
          closedById: session.user.id || "admin",
          notes: ntpn ? `NTPN/BPN Setoran: ${ntpn}` : "Status pajak disetor",
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Status setoran pajak bulan ${monthNum}/${yearNum} berhasil diperbarui.`,
      closing,
    });
  } catch (err: any) {
    console.error("Tax status update error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
