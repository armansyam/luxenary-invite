import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { HttpError, routeError } from "@/lib/routeError";
import { wibParts } from "@/lib/financePeriods";
import { optionalText, parseMoney, receiptUrlInput } from "@/lib/financeInput";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;
    const session = guard.session;

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
    if (Number.isNaN(dateVal.getTime())) {
      return NextResponse.json({ error: "Tanggal pembayaran tidak valid." }, { status: 400 });
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
        { error: `Periode bulan ${expMonth}/${expYear} telah ditutup buku dan dikunci. Mutasi tidak dapat dibukukan.` },
        { status: 400 }
      );
    }

    const referenceNumber =
      optionalText(body.referenceNumber, 100) ||
      `REC-${recurring.id.slice(0, 8)}-${expYear}-${String(expMonth).padStart(2, "0")}`;

    const finalAmount = body.amount !== undefined && body.amount !== null && body.amount !== "" ? parseMoney(body.amount) : Number(recurring.estimatedAmount);
    if (finalAmount === null) {
      return NextResponse.json({ error: "Nominal harus lebih dari 0 dan masih dalam batas." }, { status: 400 });
    }
    const receipt = receiptUrlInput(body.receiptUrl);
    if (!receipt.ok) {
      return NextResponse.json({ error: "Struk tidak valid. Unggah ulang berkas struknya." }, { status: 400 });
    }
    const finalTitle = optionalText(body.title, 200) || `${recurring.name} (Bulan ${expMonth}/${expYear})`;
    const finalSource = optionalText(body.paymentSource, 50) || recurring.paymentSource || "TRANSFER_BANK";
    const actorId = adminActorId(session);

    // Pemeriksaan duplikat dan pencatatan dalam satu transaksi dengan kunci per referensi: klik ganda tidak membukukan
    // tagihan yang sama dua kali (pemeriksaan di luar transaksi lolos untuk dua permintaan yang tiba bersamaan).
    const createdExpense = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`recurring_pay:${referenceNumber}`}))`;

      const existingExpense = await tx.expense.findFirst({ where: { referenceNumber } });
      if (existingExpense) {
        throw new HttpError(
          400,
          `Tagihan ini telah dibayar dan tercatat di buku kas untuk periode ${expMonth}/${expYear} (Ref: ${referenceNumber}).`
        );
      }

      const expense = await tx.expense.create({
        data: {
          title: finalTitle,
          category: recurring.category,
          amount: finalAmount,
          expenseDate: dateVal,
          paymentSource: finalSource,
          referenceNumber,
          receiptUrl: receipt.value,
          notes: optionalText(body.notes, 1000) || `Pembayaran otomatis 1-klik untuk tagihan rutin: ${recurring.name}`,
          createdById: actorId,
          isLocked: false,
        },
      });
      await tx.adminAuditLog.create({
        data: {
          adminId: actorId,
          action: "CREATE_EXPENSE",
          details: `Membukukan tagihan rutin ${recurring.name}: Rp ${finalAmount.toLocaleString("id-ID")} (Ref ${referenceNumber})`,
          ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
        },
      });
      return expense;
    });

    return NextResponse.json({
      success: true,
      message: `Tagihan ${recurring.name} berhasil dibukukan ke pengeluaran.`,
      expense: {
        ...createdExpense,
        amount: Number(createdExpense.amount),
      },
    });
  } catch (err) {
    return routeError("RecurringExpensePay", err, "Gagal mencatat pembayaran beban rutin");
  }
}
