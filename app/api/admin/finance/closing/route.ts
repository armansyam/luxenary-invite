import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule, requireSuperAdmin } from "@/lib/adminAuth";
import { wibMonthStart } from "@/lib/financePeriods";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const closings = await prisma.financialClosing.findMany({
      orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
    });

    const formatted = closings.map((c) => ({
      id: c.id,
      periodMonth: c.periodMonth,
      periodYear: c.periodYear,
      grossRevenue: Number(c.grossRevenue),
      totalExpenses: Number(c.totalExpenses),
      netProfit: Number(c.netProfit),
      taxAmount: Number(c.taxAmount),
      taxPaid: c.taxPaid,
      taxPaidAt: c.taxPaidAt,
      closedById: c.closedById,
      closedAt: c.closedAt,
      notes: c.notes,
    }));

    return NextResponse.json({
      closings: formatted,
      totalClosings: formatted.length,
    });
  } catch (err) {
    return routeError("FinanceClosing", err, "Gagal memuat tutup buku");
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const body = await req.json();
    const { month, year, notes } = body;

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12) {
      return NextResponse.json({ error: "Bulan (1-12) dan tahun valid wajib ditentukan." }, { status: 400 });
    }

    // Cek apakah periode sudah pernah ditutup buku
    const existing = await prisma.financialClosing.findUnique({
      where: {
        periodMonth_periodYear: {
          periodMonth: monthNum,
          periodYear: yearNum,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Periode ${monthNum}/${yearNum} sudah pernah ditutup buku pada ${new Date(existing.closedAt).toLocaleDateString("id-ID")}.` },
        { status: 400 }
      );
    }

    const startOfMonth = wibMonthStart(yearNum, monthNum - 1);
    const startOfNextMonth = wibMonthStart(yearNum, monthNum);

    // Omzet diakui saat lunas (paidAt), sama dengan ringkasan keuangan; createdAt menggeser order yang dibuat akhir bulan
    // tetapi dibayar bulan berikutnya ke periode yang salah.
    const revenueAgg = await prisma.order.aggregate({
      where: {
        status: "PAID",
        paidAt: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: { amount: true },
    });

    // Agregasi Beban Operasional (OPEX)
    const expenseAgg = await prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: startOfMonth,
          lt: startOfNextMonth,
        },
      },
      _sum: { amount: true },
    });

    const grossRevenue = Number(revenueAgg._sum?.amount || 0);
    const totalExpenses = Number(expenseAgg._sum?.amount || 0);
    const netProfit = grossRevenue - totalExpenses;
    const taxAmount = Math.round(grossRevenue * 0.005); // PPh Final 0.5%

    // Transaksi database: Simpan closing + kunci mutasi pengeluaran + catatan audit atas nama admin asli
    const actorId = adminActorId(session);
    const [createdClosing] = await prisma.$transaction([
      prisma.financialClosing.create({
        data: {
          periodMonth: monthNum,
          periodYear: yearNum,
          grossRevenue,
          totalExpenses,
          netProfit,
          taxAmount,
          closedById: actorId,
          notes: notes || `Tutup buku resmi periode ${monthNum}/${yearNum}`,
        },
      }),
      prisma.expense.updateMany({
        where: {
          expenseDate: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        data: {
          isLocked: true,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: "CLOSE_FINANCIAL_PERIOD",
          details: `Tutup buku periode ${monthNum}/${yearNum}: omzet Rp ${grossRevenue.toLocaleString("id-ID")}, beban Rp ${totalExpenses.toLocaleString("id-ID")}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Tutup buku periode ${monthNum}/${yearNum} berhasil diselesaikan. Semua mutasi kas pada periode ini telah dikunci.`,
      closing: {
        ...createdClosing,
        grossRevenue: Number(createdClosing.grossRevenue),
        totalExpenses: Number(createdClosing.totalExpenses),
        netProfit: Number(createdClosing.netProfit),
        taxAmount: Number(createdClosing.taxAmount),
      },
    });
  } catch (err) {
    return routeError("FinanceClosing", err, "Gagal menutup buku periode");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    // Pembukaan kembali tutup buku hanya diizinkan untuk SUPER_ADMIN
    const guard = await requireSuperAdmin();
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID tutup buku wajib disertakan." }, { status: 400 });
    }

    const closing = await prisma.financialClosing.findUnique({
      where: { id },
    });

    if (!closing) {
      return NextResponse.json({ error: "Data tutup buku tidak ditemukan." }, { status: 404 });
    }

    const startOfMonth = wibMonthStart(closing.periodYear, closing.periodMonth - 1);
    const startOfNextMonth = wibMonthStart(closing.periodYear, closing.periodMonth);

    // Hapus closing, buka kunci expense, dan catat siapa yang membuka kembali periode
    await prisma.$transaction([
      prisma.financialClosing.delete({
        where: { id },
      }),
      prisma.expense.updateMany({
        where: {
          expenseDate: {
            gte: startOfMonth,
            lt: startOfNextMonth,
          },
        },
        data: {
          isLocked: false,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminActorId(guard.session),
          action: "REOPEN_FINANCIAL_PERIOD",
          details: `Membuka kembali tutup buku periode ${closing.periodMonth}/${closing.periodYear}`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Periode ${closing.periodMonth}/${closing.periodYear} berhasil dibuka kembali (unlocked).`,
    });
  } catch (err) {
    return routeError("FinanceClosing", err, "Gagal membuka kembali periode");
  }
}
