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
    const horizon = searchParams.get("timeframe") || searchParams.get("horizon") || "month"; // "day" | "month" | "year"
    const now = new Date();
    const targetYear = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);
    const targetMonth = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);

    // Rentang Tanggal Sesuai Horizon
    let startDate: Date;
    let endDate: Date;

    if (horizon === "day") {
      // 30 Hari Terakhir
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      startDate = new Date(endDate);
      startDate.setDate(startDate.getDate() - 29);
      startDate.setHours(0, 0, 0, 0);
    } else if (horizon === "year") {
      // 5 Tahun Terakhir
      startDate = new Date(targetYear - 4, 0, 1, 0, 0, 0, 0);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    } else {
      // Default: 12 Bulan dalam targetYear
      startDate = new Date(targetYear, 0, 1, 0, 0, 0, 0);
      endDate = new Date(targetYear, 11, 31, 23, 59, 59, 999);
    }

    // Query Data Pemasukan dari Order PAID
    const paidOrders = await prisma.order.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
      orderBy: { paidAt: "asc" },
    });

    // Query Data Pengeluaran dari Expense
    const expenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        amount: true,
        category: true,
        expenseDate: true,
      },
      orderBy: { expenseDate: "asc" },
    });

    // Kalkulasi Metrik Utama Periode Aktif
    const totalRevenue = paidOrders.reduce((sum, o) => sum + Number(o.amount || 0), 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Kalkulasi MoM (Month-over-Month) Revenue Growth jika horizon bulan
    let momGrowth = 0;
    if (horizon === "month") {
      const currentMonthStart = new Date(targetYear, targetMonth - 1, 1);
      const currentMonthEnd = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);
      const prevMonthStart = new Date(targetYear, targetMonth - 2, 1);
      const prevMonthEnd = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59, 999);

      const [curRev, prevRev] = await Promise.all([
        prisma.order.aggregate({
          where: { status: "PAID", paidAt: { gte: currentMonthStart, lte: currentMonthEnd } },
          _sum: { amount: true },
        }),
        prisma.order.aggregate({
          where: { status: "PAID", paidAt: { gte: prevMonthStart, lte: prevMonthEnd } },
          _sum: { amount: true },
        }),
      ]);

      const curVal = Number(curRev._sum.amount || 0);
      const prevVal = Number(prevRev._sum.amount || 0);
      if (prevVal > 0) {
        momGrowth = ((curVal - prevVal) / prevVal) * 100;
      } else if (curVal > 0) {
        momGrowth = 100;
      }
    }

    // Konstruksi Series Chart (Day / Month / Year)
    let chartSeries: Array<{
      key: string;
      label: string;
      revenue: number;
      expense: number;
      net: number;
    }> = [];

    if (horizon === "day") {
      // 30 Titik Tanggal
      const daysMap = new Map<string, { label: string; revenue: number; expense: number }>();
      const cursor = new Date(startDate);
      while (cursor <= endDate) {
        const key = cursor.toISOString().split("T")[0];
        const label = cursor.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
        daysMap.set(key, { label, revenue: 0, expense: 0 });
        cursor.setDate(cursor.getDate() + 1);
      }

      paidOrders.forEach((o) => {
        if (!o.paidAt) return;
        const key = o.paidAt.toISOString().split("T")[0];
        const item = daysMap.get(key);
        if (item) item.revenue += Number(o.amount || 0);
      });

      expenses.forEach((e) => {
        const key = e.expenseDate.toISOString().split("T")[0];
        const item = daysMap.get(key);
        if (item) item.expense += Number(e.amount || 0);
      });

      chartSeries = Array.from(daysMap.entries()).map(([key, val]) => ({
        key,
        label: val.label,
        revenue: val.revenue,
        expense: val.expense,
        net: val.revenue - val.expense,
      }));
    } else if (horizon === "year") {
      // 5 Titik Tahun
      for (let y = targetYear - 4; y <= targetYear; y++) {
        const yStart = new Date(y, 0, 1);
        const yEnd = new Date(y, 11, 31, 23, 59, 59, 999);

        const rev = paidOrders
          .filter((o) => o.paidAt && o.paidAt >= yStart && o.paidAt <= yEnd)
          .reduce((sum, o) => sum + Number(o.amount || 0), 0);

        const exp = expenses
          .filter((e) => e.expenseDate >= yStart && e.expenseDate <= yEnd)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        chartSeries.push({
          key: String(y),
          label: String(y),
          revenue: rev,
          expense: exp,
          net: rev - exp,
        });
      }
    } else {
      // 12 Bulan (Jan - Des)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
      for (let m = 0; m < 12; m++) {
        const mStart = new Date(targetYear, m, 1);
        const mEnd = new Date(targetYear, m + 1, 0, 23, 59, 59, 999);

        const rev = paidOrders
          .filter((o) => o.paidAt && o.paidAt >= mStart && o.paidAt <= mEnd)
          .reduce((sum, o) => sum + Number(o.amount || 0), 0);

        const exp = expenses
          .filter((e) => e.expenseDate >= mStart && e.expenseDate <= mEnd)
          .reduce((sum, e) => sum + Number(e.amount || 0), 0);

        chartSeries.push({
          key: `${targetYear}-${String(m + 1).padStart(2, "0")}`,
          label: monthNames[m],
          revenue: rev,
          expense: exp,
          net: rev - exp,
        });
      }
    }

    // Cost Breakdown Allocation
    const categoryTotals: Record<string, number> = {
      INFRASTRUCTURE: 0,
      UTILITIES: 0,
      MARKETING: 0,
      SOFTWARE_LICENSES: 0,
      OPERATIONAL: 0,
      OTHER: 0,
    };

    expenses.forEach((e) => {
      const cat = e.category || "OTHER";
      categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(e.amount || 0);
    });

    const costBreakdown = Object.entries(categoryTotals).map(([cat, amount]) => ({
      category: cat,
      amount,
      percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
    }));

    // Recurring Bills Status untuk Bulan Berjalan
    const recurringList = await prisma.recurringExpense.findMany({
      where: { isActive: true },
      orderBy: { dueDayOfMonth: "asc" },
    });

    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const thisMonthExpenses = await prisma.expense.findMany({
      where: {
        expenseDate: { gte: currentMonthStart, lte: currentMonthEnd },
      },
      select: { title: true, amount: true, expenseDate: true, category: true },
    });

    const todayDay = now.getDate();
    const recurringWithStatus = recurringList.map((rec) => {
      // Cek apakah sudah ada pembayaran beban yang mirip namanya di bulan ini
      const isPaid = thisMonthExpenses.some(
        (exp) =>
          exp.title.toLowerCase().includes(rec.name.toLowerCase().split(" ")[0]) ||
          (rec.vendorName && exp.title.toLowerCase().includes(rec.vendorName.toLowerCase()))
      );

      let status = "UPCOMING";
      if (isPaid) {
        status = "PAID";
      } else if (todayDay > rec.dueDayOfMonth) {
        status = "OVERDUE";
      } else if (rec.dueDayOfMonth - todayDay <= 5) {
        status = "DUE_SOON";
      }

      return {
        ...rec,
        estimatedAmount: Number(rec.estimatedAmount),
        status,
        isPaidThisMonth: isPaid,
      };
    });

    const unpaidRecurringCount = recurringWithStatus.filter((r) => r.status !== "PAID").length;
    const roundedMargin = totalRevenue > 0 ? Math.round(profitMargin * 10) / 10 : 0;
    const roundedMoM = Math.round(momGrowth * 10) / 10;

    return NextResponse.json({
      success: true,
      period: {
        horizon,
        targetYear,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      metrics: {
        revenue: totalRevenue,
        grossRevenue: totalRevenue,
        expenses: totalExpenses,
        totalExpenses,
        netProfit,
        margin: roundedMargin,
        profitMargin: roundedMargin,
        revenueMoM: roundedMoM,
        momGrowth: roundedMoM,
        expensesMoM: 0,
        netProfitMoM: roundedMoM,
        unpaidRecurringCount,
      },
      timeSeriesData: chartSeries.map((c) => ({
        label: c.label,
        revenue: c.revenue,
        expenses: c.expense,
        netProfit: c.net,
      })),
      chartSeries,
      categoryBreakdown: costBreakdown.map((b) => ({
        category: b.category,
        label: b.category,
        total: b.amount,
        percentage: Math.round(b.percentage * 10) / 10,
      })),
      costBreakdown,
      recurringExpensesStatus: recurringWithStatus,
      recurringBills: recurringWithStatus,
    });
  } catch (err: any) {
    console.error("Finance overview error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
