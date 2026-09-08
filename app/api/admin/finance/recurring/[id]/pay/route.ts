import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: recurringId } = await params;
    if (!recurringId) {
      return NextResponse.json({ error: "ID tagihan rutin wajib diisi." }, { status: 400 });
    }

    const recurring = await prisma.recurringExpense.findUnique({
      where: { id: recurringId },
    });

    if (!recurring) {
      return NextResponse.json({ error: "Tagihan rutin tidak ditemukan." }, { status: 404 });
    }

    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    const dateVal = body.expenseDate ? new Date(body.expenseDate) : new Date();
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
        { error: `Periode bulan ${expMonth}/${expYear} telah ditutup buku dan dikunci. Mutasi tidak dapat dibukukan.` },
        { status: 400 }
      );
    }

    const referenceNumber =
      body.referenceNumber?.trim() ||
      `REC-${recurring.id.slice(0, 8)}-${expYear}-${String(expMonth).padStart(2, "0")}`;

    // Cek duplikasi pembayaran di bulan yang sama jika menggunakan referenceNumber bawaan
    const existingExpense = await prisma.expense.findFirst({
      where: {
        referenceNumber,
      },
    });

    if (existingExpense) {
      return NextResponse.json(
        {
          error: `Tagihan ini telah dibayar dan tercatat di buku kas untuk periode ${expMonth}/${expYear} (Ref: ${referenceNumber}).`,
          existingExpenseId: existingExpense.id,
        },
        { status: 400 }
      );
    }

    const finalAmount = body.amount ? Number(body.amount) : Number(recurring.estimatedAmount);
    const finalTitle = body.title?.trim() || `${recurring.name} (Bulan ${expMonth}/${expYear})`;
    const finalSource = body.paymentSource || recurring.paymentSource || "TRANSFER_BANK";

    const createdExpense = await prisma.expense.create({
      data: {
        title: finalTitle,
        category: recurring.category,
        amount: finalAmount,
        expenseDate: dateVal,
        paymentSource: finalSource,
        referenceNumber,
        receiptUrl: body.receiptUrl || null,
        notes: body.notes || `Pembayaran otomatis 1-klik untuk tagihan rutin: ${recurring.name}`,
        createdById: session.user.id || null,
        isLocked: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Tagihan ${recurring.name} berhasil dibukukan ke pengeluaran.`,
      expense: {
        ...createdExpense,
        amount: Number(createdExpense.amount),
      },
    });
  } catch (err: any) {
    console.error("1-Click pay recurring error:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
