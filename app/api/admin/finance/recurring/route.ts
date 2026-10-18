import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { wibMonthStart, wibParts } from "@/lib/financePeriods";
import { optionalText, parseExpenseCategory, parseMoney, requiredText } from "@/lib/financeInput";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const nowParts = wibParts(new Date());
    const month = parseInt(searchParams.get("month") || String(nowParts.monthIndex + 1), 10);
    const year = parseInt(searchParams.get("year") || String(nowParts.year), 10);
    if (!Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: "Bulan (1-12) dan tahun valid diperlukan." }, { status: 400 });
    }

    // Ambil semua recurring expenses
    const recurringList = await prisma.recurringExpense.findMany({
      orderBy: [{ isActive: "desc" }, { dueDayOfMonth: "asc" }],
    });

    // Batas bulan WIB, sama dengan tutup buku dan pencatatan pengeluaran (zona waktu server bisa UTC).
    const startOfMonth = wibMonthStart(year, month - 1);
    const endOfMonth = new Date(wibMonthStart(year, month).getTime() - 1);

    // Cari expense di bulan ini yang terkait dengan recurring
    const paidExpenses = await prisma.expense.findMany({
      where: {
        expenseDate: {
          gte: startOfMonth,
          lte: endOfMonth,
        },
      },
      select: {
        id: true,
        title: true,
        amount: true,
        expenseDate: true,
        referenceNumber: true,
      },
    });

    // Petakan status lunas di bulan ini
    const result = recurringList.map((rec) => {
      const matchPrefix = `REC-${rec.id.slice(0, 8)}-${year}-${String(month).padStart(2, "0")}`;
      const matchedExpense = paidExpenses.find(
        (exp) =>
          exp.referenceNumber === matchPrefix ||
          exp.title.toLowerCase().includes(rec.name.toLowerCase())
      );

      return {
        id: rec.id,
        name: rec.name,
        category: rec.category,
        estimatedAmount: Number(rec.estimatedAmount),
        dueDayOfMonth: rec.dueDayOfMonth,
        vendorName: rec.vendorName,
        paymentSource: rec.paymentSource,
        isActive: rec.isActive,
        createdAt: rec.createdAt,
        isPaidThisMonth: Boolean(matchedExpense),
        paidExpenseId: matchedExpense?.id || null,
        paidExpenseDate: matchedExpense?.expenseDate || null,
        paidAmount: matchedExpense ? Number(matchedExpense.amount) : null,
      };
    });

    return NextResponse.json({
      targetMonth: month,
      targetYear: year,
      recurringExpenses: result,
      summary: {
        totalItems: result.length,
        totalActive: result.filter((r) => r.isActive).length,
        totalEstimatedMonthly: result
          .filter((r) => r.isActive)
          .reduce((acc, curr) => acc + curr.estimatedAmount, 0),
        totalPaidThisMonth: result
          .filter((r) => r.isPaidThisMonth)
          .reduce((acc, curr) => acc + (curr.paidAmount || curr.estimatedAmount), 0),
      },
    });
  } catch (err) {
    return routeError("RecurringExpenses", err, "Gagal memuat tagihan rutin");
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const body = (await req.json().catch(() => null)) ?? {};
    const name = requiredText(body.name, 100);
    const estimatedAmount = parseMoney(body.estimatedAmount);
    if (!name || estimatedAmount === null) {
      return NextResponse.json({ error: "Nama tagihan (maksimal 100 karakter) dan estimasi nominal valid wajib diisi." }, { status: 400 });
    }
    const category = body.category ? parseExpenseCategory(body.category) : "UTILITIES";
    if (!category) {
      return NextResponse.json({ error: "Kategori tagihan tidak dikenal." }, { status: 400 });
    }

    const day = Number(body.dueDayOfMonth ?? 1);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      return NextResponse.json({ error: "Tanggal jatuh tempo harus antara 1 sampai 31." }, { status: 400 });
    }

    const created = await prisma.recurringExpense.create({
      data: {
        name,
        category,
        estimatedAmount,
        dueDayOfMonth: day,
        vendorName: optionalText(body.vendorName, 100),
        paymentSource: optionalText(body.paymentSource, 50) || "TRANSFER_BANK",
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      recurringExpense: {
        ...created,
        estimatedAmount: Number(created.estimatedAmount),
      },
    });
  } catch (err) {
    return routeError("RecurringExpenses", err, "Gagal menambah tagihan rutin");
  }
}

export async function PUT(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const body = (await req.json().catch(() => null)) ?? {};
    const { id, name, category, estimatedAmount, dueDayOfMonth, vendorName, paymentSource, isActive } = body;

    if (!id || typeof id !== "string") {
      return NextResponse.json({ error: "ID tagihan rutin wajib disertakan." }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) {
      const cleanName = requiredText(name, 100);
      if (!cleanName) return NextResponse.json({ error: "Nama tagihan wajib diisi (maksimal 100 karakter)." }, { status: 400 });
      updateData.name = cleanName;
    }
    if (category !== undefined) {
      const cleanCategory = parseExpenseCategory(category);
      if (!cleanCategory) return NextResponse.json({ error: "Kategori tagihan tidak dikenal." }, { status: 400 });
      updateData.category = cleanCategory;
    }
    if (estimatedAmount !== undefined) {
      const amount = parseMoney(estimatedAmount);
      if (amount === null) return NextResponse.json({ error: "Estimasi nominal harus lebih dari 0 dan masih dalam batas." }, { status: 400 });
      updateData.estimatedAmount = amount;
    }
    if (dueDayOfMonth !== undefined) {
      const day = Number(dueDayOfMonth);
      if (!Number.isInteger(day) || day < 1 || day > 31) {
        return NextResponse.json({ error: "Tanggal jatuh tempo harus antara 1 sampai 31." }, { status: 400 });
      }
      updateData.dueDayOfMonth = day;
    }
    if (vendorName !== undefined) updateData.vendorName = optionalText(vendorName, 100);
    if (paymentSource !== undefined) updateData.paymentSource = optionalText(paymentSource, 50) || "TRANSFER_BANK";
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      recurringExpense: {
        ...updated,
        estimatedAmount: Number(updated.estimatedAmount),
      },
    });
  } catch (err) {
    return routeError("RecurringExpenses", err, "Gagal memperbarui tagihan rutin");
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID tagihan rutin wajib disertakan." }, { status: 400 });
    }

    await prisma.recurringExpense.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: "Tagihan rutin berhasil dihapus.",
    });
  } catch (err) {
    return routeError("RecurringExpenses", err, "Gagal menghapus tagihan rutin");
  }
}
