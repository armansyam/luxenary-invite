import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { Prisma } from "@prisma/client";

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
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const category = searchParams.get("category") || "ALL";
    const paymentSource = searchParams.get("paymentSource") || "ALL";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const isExport = searchParams.get("export") === "csv";

    const whereClause: Prisma.ExpenseWhereInput = {};

    if (search) {
      whereClause.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { referenceNumber: { contains: search, mode: "insensitive" } },
        { notes: { contains: search, mode: "insensitive" } },
      ];
    }

    if (category !== "ALL") {
      whereClause.category = category as any;
    }

    if (paymentSource !== "ALL") {
      whereClause.paymentSource = paymentSource;
    }

    if (startDate || endDate) {
      whereClause.expenseDate = {};
      if (startDate) whereClause.expenseDate.gte = new Date(startDate);
      if (endDate) whereClause.expenseDate.lte = new Date(endDate);
    }

    // Jika Export CSV
    if (isExport) {
      const allExpenses = await prisma.expense.findMany({
        where: whereClause,
        orderBy: { expenseDate: "desc" },
      });

      const csvRows = [
        ["ID", "Tanggal", "Nama Pengeluaran", "Kategori", "Nominal (IDR)", "Saluran Bayar", "No Referensi", "Catatan"].join(","),
        ...allExpenses.map((exp) => [
          exp.id,
          exp.expenseDate.toISOString().split("T")[0],
          `"${(exp.title || "").replace(/"/g, '""')}"`,
          exp.category,
          Number(exp.amount),
          `"${(exp.paymentSource || "").replace(/"/g, '""')}"`,
          `"${(exp.referenceNumber || "").replace(/"/g, '""')}"`,
          `"${(exp.notes || "").replace(/"/g, '""')}"`,
        ].join(",")),
      ];

      return new NextResponse(csvRows.join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="buku_kas_pengeluaran_${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    const [total, rawExpenses] = await Promise.all([
      prisma.expense.count({ where: whereClause }),
      prisma.expense.findMany({
        where: whereClause,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { expenseDate: "desc" },
      }),
    ]);

    const totalFilteredAmount = rawExpenses.reduce((sum, e) => sum + Number(e.amount), 0);

    return NextResponse.json({
      success: true,
      expenses: rawExpenses.map((e) => ({
        ...e,
        amount: Number(e.amount),
      })),
      summary: {
        totalFilteredAmount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (err: any) {
    console.error("Expenses GET error:", err);
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
    const { title, category, amount, expenseDate, paymentSource, referenceNumber, receiptUrl, notes } = body;

    if (!title || !amount || Number(amount) <= 0) {
      return NextResponse.json({ error: "Nama pengeluaran dan nominal valid wajib diisi." }, { status: 400 });
    }

    const dateVal = expenseDate ? new Date(expenseDate) : new Date();
    const expMonth = dateVal.getMonth() + 1;
    const expYear = dateVal.getFullYear();

    // Validasi Tutup Buku
    const closing = await prisma.financialClosing.findUnique({
      where: {
        periodMonth_periodYear: {
          periodMonth: expMonth,
          periodYear: expYear,
        },
      },
    });

    if (closing) {
      return NextResponse.json(
        { error: `Periode bulan ${expMonth}/${expYear} telah ditutup buku dan dikunci. Mutasi tidak dapat ditambahkan.` },
        { status: 400 }
      );
    }

    const newExpense = await prisma.expense.create({
      data: {
        title: title.trim(),
        category: category || "OTHER",
        amount: Number(amount),
        expenseDate: dateVal,
        paymentSource: paymentSource || "TRANSFER_BANK",
        referenceNumber: referenceNumber?.trim() || null,
        receiptUrl: receiptUrl || null,
        notes: notes?.trim() || null,
        createdById: session.user.id || (session.user as any).email || "admin",
      },
    });

    // Catat ke audit log jika model AuditLog tersedia
    try {
      await (prisma as any).adminAuditLog?.create({
        data: {
          adminId: session.user.id || "admin",
          action: "CREATE_EXPENSE",
          details: `Menambahkan beban pengeluaran: ${title} sebesar Rp ${Number(amount).toLocaleString("id-ID")}`,
          ipAddress: req.headers.get("x-forwarded-for") || "127.0.0.1",
        },
      });
    } catch {
      // Ignore audit log error
    }

    return NextResponse.json({
      success: true,
      expense: {
        ...newExpense,
        amount: Number(newExpense.amount),
      },
    });
  } catch (err: any) {
    console.error("Expenses POST error:", err);
    return NextResponse.json({ error: err.message || "Gagal menyimpan pengeluaran" }, { status: 500 });
  }
}
