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
  } catch (err: any) {
    console.error("Closing GET error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAuthorized =
      (session?.user as any)?.isAdmin === true ||
      role === "SUPER_ADMIN" ||
      role === "ADMIN";

    if (!session?.user || !isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Hanya Admin Utama yang dapat mengeksekusi Tutup Buku." }, { status: 401 });
    }

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

    const startOfMonth = new Date(yearNum, monthNum - 1, 1);
    const endOfMonth = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

    // Agregasi Omzet (Revenue dari Order PAID)
    const revenueAgg = await prisma.order.aggregate({
      where: {
        status: "PAID",
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    });

    // Agregasi Beban Operasional (OPEX)
    const expenseAgg = await prisma.expense.aggregate({
      where: {
        expenseDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      _sum: { amount: true },
    });

    const grossRevenue = Number(revenueAgg._sum?.amount || 0);
    const totalExpenses = Number(expenseAgg._sum?.amount || 0);
    const netProfit = grossRevenue - totalExpenses;
    const taxAmount = Math.round(grossRevenue * 0.005); // PPh Final 0.5%

    // Transaksi database: Simpan closing + kunci mutasi pengeluaran
    const [createdClosing] = await prisma.$transaction([
      prisma.financialClosing.create({
        data: {
          periodMonth: monthNum,
          periodYear: yearNum,
          grossRevenue,
          totalExpenses,
          netProfit,
          taxAmount,
          closedById: session.user.id || "admin",
          notes: notes || `Tutup buku resmi periode ${monthNum}/${yearNum} oleh ${session.user.name || session.user.email || "Admin"}`,
        },
      }),
      prisma.expense.updateMany({
        where: {
          expenseDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        data: {
          isLocked: true,
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
  } catch (err: any) {
    console.error("Closing POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    // Pembukaan kembali tutup buku hanya diizinkan untuk SUPER_ADMIN
    const isSuperAdmin = (session?.user as any)?.isAdmin === true || role === "SUPER_ADMIN";

    if (!session?.user || !isSuperAdmin) {
      return NextResponse.json(
        { error: "Akses ditolak. Pembukaan kembali periode tutup buku hanya diizinkan untuk Super Administrator." },
        { status: 403 }
      );
    }

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

    const startOfMonth = new Date(closing.periodYear, closing.periodMonth - 1, 1);
    const endOfMonth = new Date(closing.periodYear, closing.periodMonth, 0, 23, 59, 59, 999);

    // Hapus closing dan buka kunci expense
    await prisma.$transaction([
      prisma.financialClosing.delete({
        where: { id },
      }),
      prisma.expense.updateMany({
        where: {
          expenseDate: {
            gte: startOfMonth,
            lte: endOfMonth,
          },
        },
        data: {
          isLocked: false,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Periode ${closing.periodMonth}/${closing.periodYear} berhasil dibuka kembali (unlocked).`,
    });
  } catch (err: any) {
    console.error("Closing DELETE error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
