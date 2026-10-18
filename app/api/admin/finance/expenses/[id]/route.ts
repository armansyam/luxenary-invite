import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { wibParts } from "@/lib/financePeriods";
import { optionalText, parseExpenseCategory, parseMoney, receiptUrlInput, requiredText } from "@/lib/financeInput";

export const dynamic = "force-dynamic";

/** Tutup buku bulan WIB yang memuat tanggal ini (batas periode yang sama dengan rute tutup buku). */
function findClosingFor(date: Date) {
  const { year, monthIndex } = wibParts(date);
  return prisma.financialClosing.findUnique({
    where: { periodMonth_periodYear: { periodMonth: monthIndex + 1, periodYear: year } },
  });
}

export async function PUT(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data pengeluaran tidak ditemukan." }, { status: 404 });
    }

    if (existing.isLocked || (await findClosingFor(existing.expenseDate))) {
      return NextResponse.json(
        { error: "Pengeluaran pada periode yang telah ditutup buku tidak dapat diubah." },
        { status: 400 }
      );
    }

    const body = (await req.json().catch(() => null)) ?? {};
    const { title, category, amount, expenseDate, paymentSource, referenceNumber, receiptUrl, notes } = body;

    // Isian yang dikirim divalidasi; nilai bebas membuat Prisma gagal (kategori di luar enum, nominal NaN) dengan 500.
    if (title !== undefined && !requiredText(title, 200)) {
      return NextResponse.json({ error: "Nama pengeluaran wajib diisi (maksimal 200 karakter)." }, { status: 400 });
    }
    if (category !== undefined && category !== "" && !parseExpenseCategory(category)) {
      return NextResponse.json({ error: "Kategori pengeluaran tidak dikenal." }, { status: 400 });
    }
    if (amount !== undefined && parseMoney(amount) === null) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0 dan masih dalam batas." }, { status: 400 });
    }
    const receipt = receiptUrl !== undefined ? receiptUrlInput(receiptUrl) : null;
    if (receipt && !receipt.ok) {
      return NextResponse.json({ error: "URL bukti pembayaran tidak valid." }, { status: 400 });
    }

    // Memindahkan tanggal ke bulan yang sudah ditutup akan mengubah isi periode yang angkanya sudah dibekukan.
    if (expenseDate) {
      const target = new Date(expenseDate);
      if (Number.isNaN(target.getTime())) {
        return NextResponse.json({ error: "Tanggal pengeluaran tidak valid." }, { status: 400 });
      }
      if (await findClosingFor(target)) {
        return NextResponse.json(
          { error: "Tanggal tujuan berada pada periode yang telah ditutup buku." },
          { status: 400 }
        );
      }
    }

    const actorId = adminActorId(guard.session);
    const [updated] = await prisma.$transaction([
      prisma.expense.update({
        where: { id },
        data: {
          ...(title !== undefined && { title: requiredText(title, 200)! }),
          ...(category && { category: parseExpenseCategory(category)! }),
          ...(amount !== undefined && { amount: parseMoney(amount)! }),
          ...(expenseDate && { expenseDate: new Date(expenseDate) }),
          ...(optionalText(paymentSource, 50) && { paymentSource: optionalText(paymentSource, 50)! }),
          ...(referenceNumber !== undefined && { referenceNumber: optionalText(referenceNumber, 100) }),
          ...(receipt && receipt.ok && { receiptUrl: receipt.value }),
          ...(notes !== undefined && { notes: optionalText(notes, 1000) }),
        },
      }),
      prisma.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: "UPDATE_EXPENSE",
          details: `Mengubah pengeluaran ${existing.title} (Rp ${Number(existing.amount).toLocaleString("id-ID")})`,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      expense: {
        ...updated,
        amount: Number(updated.amount),
      },
    });
  } catch (err) {
    return routeError("AdminExpense", err, "Gagal memperbarui pengeluaran.");
  }
}

export async function DELETE(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const { id } = await context.params;
    const existing = await prisma.expense.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Data pengeluaran tidak ditemukan." }, { status: 404 });
    }

    if (existing.isLocked || (await findClosingFor(existing.expenseDate))) {
      return NextResponse.json(
        { error: "Pengeluaran pada periode yang telah ditutup buku tidak dapat dihapus." },
        { status: 400 }
      );
    }

    await prisma.$transaction([
      prisma.expense.delete({ where: { id } }),
      prisma.adminAuditLog.create({
        data: {
          adminId: adminActorId(guard.session),
          action: "DELETE_EXPENSE",
          details: `Menghapus pengeluaran ${existing.title} (Rp ${Number(existing.amount).toLocaleString("id-ID")}, ${existing.expenseDate.toISOString().slice(0, 10)})`,
        },
      }),
    ]);

    return NextResponse.json({ success: true, message: "Pengeluaran berhasil dihapus." });
  } catch (err) {
    return routeError("AdminExpense", err, "Gagal menghapus pengeluaran.");
  }
}
