import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data pengeluaran tidak ditemukan." }, { status: 404 });
    }

    // Validasi Tutup Buku
    const expDate = new Date(existing.expenseDate);
    const closing = await prisma.financialClosing.findUnique({
      where: {
        periodMonth_periodYear: {
          periodMonth: expDate.getMonth() + 1,
          periodYear: expDate.getFullYear(),
        },
      },
    });

    if (closing || existing.isLocked) {
      return NextResponse.json(
        { error: "Pengeluaran pada periode yang telah ditutup buku tidak dapat diubah." },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { title, category, amount, expenseDate, paymentSource, referenceNumber, receiptUrl, notes } = body;

    const updated = await prisma.expense.update({
      where: { id },
      data: {
        ...(title && { title: title.trim() }),
        ...(category && { category }),
        ...(amount && { amount: Number(amount) }),
        ...(expenseDate && { expenseDate: new Date(expenseDate) }),
        ...(paymentSource && { paymentSource }),
        ...(referenceNumber !== undefined && { referenceNumber: referenceNumber?.trim() || null }),
        ...(receiptUrl !== undefined && { receiptUrl }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    });

    return NextResponse.json({
      success: true,
      expense: {
        ...updated,
        amount: Number(updated.amount),
      },
    });
  } catch (err: any) {
    console.error("Expense PUT error:", err);
    return NextResponse.json({ error: err.message || "Gagal memperbarui pengeluaran." }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
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

    const { id } = await context.params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data pengeluaran tidak ditemukan." }, { status: 404 });
    }

    // Validasi Tutup Buku
    const expDate = new Date(existing.expenseDate);
    const closing = await prisma.financialClosing.findUnique({
      where: {
        periodMonth_periodYear: {
          periodMonth: expDate.getMonth() + 1,
          periodYear: expDate.getFullYear(),
        },
      },
    });

    if (closing || existing.isLocked) {
      return NextResponse.json(
        { error: "Pengeluaran pada periode yang telah ditutup buku tidak dapat dihapus." },
        { status: 400 }
      );
    }

    await prisma.expense.delete({ where: { id } });

    return NextResponse.json({ success: true, message: "Pengeluaran berhasil dihapus." });
  } catch (err: any) {
    console.error("Expense DELETE error:", err);
    return NextResponse.json({ error: err.message || "Gagal menghapus pengeluaran." }, { status: 500 });
  }
}
