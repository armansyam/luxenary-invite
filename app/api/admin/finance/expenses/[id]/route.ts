import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { wibParts } from "@/lib/financePeriods";

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

    const body = await req.json();
    const { title, category, amount, expenseDate, paymentSource, referenceNumber, receiptUrl, notes } = body;

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
          ...(title && { title: title.trim() }),
          ...(category && { category }),
          ...(amount && { amount: Number(amount) }),
          ...(expenseDate && { expenseDate: new Date(expenseDate) }),
          ...(paymentSource && { paymentSource }),
          ...(referenceNumber !== undefined && { referenceNumber: referenceNumber?.trim() || null }),
          ...(receiptUrl !== undefined && { receiptUrl }),
          ...(notes !== undefined && { notes: notes?.trim() || null }),
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
