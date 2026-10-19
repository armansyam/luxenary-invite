import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { wibParts } from "@/lib/financePeriods";
import { csvCell } from "@/lib/csv";
import { optionalText, parseExpenseCategory, parseMoney, receiptUrlInput, requiredText } from "@/lib/financeInput";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

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
      const parsedCategory = parseExpenseCategory(category);
      if (!parsedCategory) {
        return NextResponse.json({ error: "Kategori pengeluaran tidak dikenal." }, { status: 400 });
      }
      whereClause.category = parsedCategory;
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

      // csvCell menetralkan awalan = + - @ agar judul atau catatan tidak dieksekusi sebagai formula saat dibuka di Excel.
      const csvRows = [
        ["ID", "Tanggal", "Nama Pengeluaran", "Kategori", "Nominal (IDR)", "Saluran Bayar", "No Referensi", "Catatan"].join(","),
        ...allExpenses.map((exp) => [
          exp.id,
          exp.expenseDate.toISOString().split("T")[0],
          csvCell(exp.title),
          exp.category,
          Number(exp.amount),
          csvCell(exp.paymentSource),
          csvCell(exp.referenceNumber),
          csvCell(exp.notes),
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
  } catch (err) {
    return routeError("AdminExpenses", err, "Gagal memuat data pengeluaran");
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;
    const { session } = guard;

    const body = await req.json().catch(() => null);
    const { expenseDate } = body ?? {};

    const title = requiredText(body?.title, 200);
    const amount = parseMoney(body?.amount);
    if (!title || amount === null) {
      return NextResponse.json({ error: "Nama pengeluaran (maksimal 200 karakter) dan nominal valid wajib diisi." }, { status: 400 });
    }
    const category = body?.category ? parseExpenseCategory(body.category) : "OTHER";
    if (!category) {
      return NextResponse.json({ error: "Kategori pengeluaran tidak dikenal." }, { status: 400 });
    }
    const receipt = receiptUrlInput(body?.receiptUrl);
    if (!receipt.ok) {
      return NextResponse.json({ error: "Struk tidak valid. Unggah ulang berkas struknya." }, { status: 400 });
    }
    const paymentSource = optionalText(body?.paymentSource, 50);
    const referenceNumber = optionalText(body?.referenceNumber, 100);
    const notes = optionalText(body?.notes, 1000);

    const dateVal = expenseDate ? new Date(expenseDate) : new Date();
    if (Number.isNaN(dateVal.getTime())) {
      return NextResponse.json({ error: "Tanggal pengeluaran tidak valid." }, { status: 400 });
    }
    // Bulan WIB, sama dengan batas periode yang dipakai tutup buku.
    const { year: expYear, monthIndex } = wibParts(dateVal);
    const expMonth = monthIndex + 1;

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

    // Pengeluaran dan catatan auditnya satu transaksi: tidak ada pengeluaran tanpa jejak, dan sebaliknya.
    const actorId = adminActorId(session);
    const [newExpense] = await prisma.$transaction([
      prisma.expense.create({
        data: {
          title,
          category,
          amount,
          expenseDate: dateVal,
          paymentSource: paymentSource || "TRANSFER_BANK",
          referenceNumber,
          receiptUrl: receipt.value,
          notes,
          createdById: actorId,
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: "CREATE_EXPENSE",
          details: `Menambahkan beban pengeluaran: ${title} sebesar Rp ${amount.toLocaleString("id-ID")}`,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      expense: {
        ...newExpense,
        amount: Number(newExpense.amount),
      },
    });
  } catch (err) {
    return routeError("AdminExpenses", err, "Gagal menyimpan pengeluaran");
  }
}
