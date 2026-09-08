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
    const month = parseInt(searchParams.get("month") || String(now.getMonth() + 1), 10);
    const year = parseInt(searchParams.get("year") || String(now.getFullYear()), 10);

    // Ambil semua recurring expenses
    const recurringList = await prisma.recurringExpense.findMany({
      orderBy: [{ isActive: "desc" }, { dueDayOfMonth: "asc" }],
    });

    // Ambil start dan end range bulan target
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

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
  } catch (err: any) {
    console.error("Recurring expenses GET error:", err);
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
    const { name, category, estimatedAmount, dueDayOfMonth, vendorName, paymentSource } = body;

    if (!name || !estimatedAmount || Number(estimatedAmount) <= 0) {
      return NextResponse.json({ error: "Nama tagihan dan estimasi nominal wajib diisi." }, { status: 400 });
    }

    const day = parseInt(dueDayOfMonth || "1", 10);
    if (day < 1 || day > 31) {
      return NextResponse.json({ error: "Tanggal jatuh tempo harus antara 1 sampai 31." }, { status: 400 });
    }

    const created = await prisma.recurringExpense.create({
      data: {
        name,
        category: category || "UTILITIES",
        estimatedAmount: Number(estimatedAmount),
        dueDayOfMonth: day,
        vendorName: vendorName || null,
        paymentSource: paymentSource || "TRANSFER_BANK",
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
  } catch (err: any) {
    console.error("Recurring expense POST error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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
    const { id, name, category, estimatedAmount, dueDayOfMonth, vendorName, paymentSource, isActive } = body;

    if (!id) {
      return NextResponse.json({ error: "ID tagihan rutin wajib disertakan." }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (category !== undefined) updateData.category = category;
    if (estimatedAmount !== undefined) updateData.estimatedAmount = Number(estimatedAmount);
    if (dueDayOfMonth !== undefined) updateData.dueDayOfMonth = Number(dueDayOfMonth);
    if (vendorName !== undefined) updateData.vendorName = vendorName;
    if (paymentSource !== undefined) updateData.paymentSource = paymentSource;
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
  } catch (err: any) {
    console.error("Recurring expense PUT error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
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
  } catch (err: any) {
    console.error("Recurring expense DELETE error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
