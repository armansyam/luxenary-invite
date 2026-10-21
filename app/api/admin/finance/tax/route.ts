import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { wibMonthStart, wibParts } from "@/lib/financePeriods";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const targetYear = parseInt(searchParams.get("year") || String(wibParts(new Date()).year), 10);

    // Omzet diakui saat lunas (paidAt) per bulan WIB, sama dengan rute tutup buku.
    const ordersInYear = await prisma.order.findMany({
      where: {
        status: "PAID",
        paidAt: {
          gte: wibMonthStart(targetYear, 0),
          lt: wibMonthStart(targetYear + 1, 0),
        },
      },
      select: {
        amount: true,
        paidAt: true,
      },
    });

    // Ambil data financial closing di tahun tersebut untuk status closing & tax paid
    const closingsInYear = await prisma.financialClosing.findMany({
      where: {
        periodYear: targetYear,
      },
    });

    // Buat rekap 12 bulan (Januari - Desember)
    const monthNames = [
      "Januari",
      "Februari",
      "Maret",
      "April",
      "Mei",
      "Juni",
      "Juli",
      "Agustus",
      "September",
      "Oktober",
      "November",
      "Desember",
    ];

    let totalGrossRevenueYear = 0;
    let totalTaxDueYear = 0;
    let totalTaxPaidYear = 0;

    const monthlyBreakdown = monthNames.map((name, index) => {
      const monthNum = index + 1; // 1 - 12
      const closing = closingsInYear.find((c) => c.periodMonth === monthNum);

      // Hitung gross turnover (omzet) dari order paid
      const monthlyOrders = ordersInYear.filter((o) => o.paidAt && wibParts(o.paidAt).monthIndex + 1 === monthNum);

      // Jika ada snapshot di closing, gunakan snapshot resmi; jika belum ada closing, gunakan realtime order sum
      const grossRevenue = closing
        ? Number(closing.grossRevenue)
        : monthlyOrders.reduce((sum, o) => sum + Number(o.amount), 0);

      // PPh Final 0.5% (PP 55/2022)
      const taxDue = Math.round(grossRevenue * 0.005);
      const isTaxPaid = closing ? closing.taxPaid : false;
      const taxPaidAt = closing?.taxPaidAt ? closing.taxPaidAt.toISOString() : null;

      totalGrossRevenueYear += grossRevenue;
      totalTaxDueYear += taxDue;
      if (isTaxPaid) {
        totalTaxPaidYear += taxDue;
      }

      return {
        monthIndex: monthNum,
        monthName: name,
        year: targetYear,
        orderCount: monthlyOrders.length,
        grossRevenue,
        taxRate: 0.005,
        taxRateLabel: "0.5% (PP 55/2022)",
        taxDue,
        isTaxPaid,
        taxPaidAt,
        isClosed: Boolean(closing),
        closingId: closing?.id || null,
        notes: closing?.notes || null,
      };
    });

    return NextResponse.json({
      taxYear: targetYear,
      regulationBasis: "PP 55 Tahun 2022 (PPh Final UMKM / Omzet Peredaran Bruto)",
      monthlyBreakdown,
      summary: {
        totalGrossRevenueYear,
        totalTaxDueYear,
        totalTaxPaidYear,
        remainingTaxDueYear: Math.max(0, totalTaxDueYear - totalTaxPaidYear),
        paidMonthsCount: monthlyBreakdown.filter((m) => m.isTaxPaid).length,
      },
    });
  } catch (err) {
    return routeError("AdminTax", err, "Gagal memuat rincian pajak");
  }
}

export async function POST(req: NextRequest) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;
    const session = guard.session;

    const body = (await readJsonBody(req)) ?? {};
    const { month, year, taxPaid, ntpn, taxPaidAt } = body;

    const monthNum = parseInt(month, 10);
    const yearNum = parseInt(year, 10);

    if (!monthNum || !yearNum || monthNum < 1 || monthNum > 12 || yearNum < 2000 || yearNum > 2100) {
      return NextResponse.json({ error: "Bulan (1-12) dan tahun valid wajib disertakan." }, { status: 400 });
    }
    const ntpnClean = typeof ntpn === "string" ? ntpn.trim().slice(0, 50) : "";
    if (ntpn !== undefined && ntpn !== null && typeof ntpn !== "string") {
      return NextResponse.json({ error: "NTPN harus berupa teks." }, { status: 400 });
    }

    // Cek apakah closing sudah ada untuk bulan ini
    let closing = await prisma.financialClosing.findUnique({
      where: {
        periodMonth_periodYear: {
          periodMonth: monthNum,
          periodYear: yearNum,
        },
      },
    });

    const isPaid = Boolean(taxPaid);
    const paymentDate = taxPaidAt ? new Date(taxPaidAt) : isPaid ? new Date() : null;
    if (paymentDate && Number.isNaN(paymentDate.getTime())) {
      return NextResponse.json({ error: "Tanggal setoran pajak tidak valid." }, { status: 400 });
    }

    if (closing) {
      // Update status pajak pada closing yang sudah ada; NTPN yang sama tidak ditambahkan dua kali ke catatan.
      let updatedNotes = closing.notes || "";
      if (ntpnClean && !updatedNotes.includes(`NTPN: ${ntpnClean}`)) {
        updatedNotes = updatedNotes ? `${updatedNotes} | NTPN: ${ntpnClean}` : `NTPN: ${ntpnClean}`;
      }

      [closing] = await prisma.$transaction([
        prisma.financialClosing.update({
          where: { id: closing.id },
          data: {
            taxPaid: isPaid,
            taxPaidAt: paymentDate,
            notes: updatedNotes,
          },
        }),
        prisma.adminAuditLog.create({
          data: {
            adminId: adminActorId(session),
            action: "UPDATE_TAX_STATUS",
            details: `Status setoran pajak ${monthNum}/${yearNum}: ${isPaid ? "lunas" : "belum lunas"}${ntpnClean ? ` (NTPN ${ntpnClean})` : ""}`,
          },
        }),
      ]);
    } else {
      // Belum pernah tutup buku: periode ditutup di sini dengan aturan yang sama dengan rute tutup buku (omzet per paidAt,
      // bulan WIB, pengeluaran dikunci, tercatat di audit), karena angka snapshot ini menjadi dasar pajak yang disimpan.
      // Bulan yang masih berjalan tidak boleh ditutup lewat jalur ini: omzetnya masih bertambah dan pengeluarannya terkunci.
      if (new Date() < wibMonthStart(yearNum, monthNum)) {
        return NextResponse.json(
          { error: `Periode ${monthNum}/${yearNum} belum berakhir sehingga setoran pajaknya belum dapat dicatat.` },
          { status: 400 }
        );
      }

      const startOfMonth = wibMonthStart(yearNum, monthNum - 1);
      const startOfNextMonth = wibMonthStart(yearNum, monthNum);

      const [revenueAgg, expenseAgg] = await Promise.all([
        prisma.order.aggregate({
          where: {
            status: "PAID",
            paidAt: { gte: startOfMonth, lt: startOfNextMonth },
          },
          _sum: { amount: true },
        }),
        prisma.expense.aggregate({
          where: {
            expenseDate: { gte: startOfMonth, lt: startOfNextMonth },
          },
          _sum: { amount: true },
        }),
      ]);

      const grossRev = Number(revenueAgg._sum?.amount || 0);
      const totalExp = Number(expenseAgg._sum?.amount || 0);
      const net = grossRev - totalExp;
      const taxDue = Math.round(grossRev * 0.005);
      const actorId = adminActorId(session);

      [closing] = await prisma.$transaction([
        prisma.financialClosing.create({
          data: {
            periodMonth: monthNum,
            periodYear: yearNum,
            grossRevenue: grossRev,
            totalExpenses: totalExp,
            netProfit: net,
            taxAmount: taxDue,
            taxPaid: isPaid,
            taxPaidAt: paymentDate,
            closedById: actorId,
            notes: ntpnClean ? `NTPN/BPN Setoran: ${ntpnClean}` : "Status pajak disetor",
          },
        }),
        prisma.expense.updateMany({
          where: { expenseDate: { gte: startOfMonth, lt: startOfNextMonth } },
          data: { isLocked: true },
        }),
        prisma.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: "CLOSE_FINANCIAL_PERIOD",
            details: `Tutup buku periode ${monthNum}/${yearNum} saat mencatat setoran pajak: omzet Rp ${grossRev.toLocaleString("id-ID")}, beban Rp ${totalExp.toLocaleString("id-ID")}`,
          },
        }),
      ]);
    }

    return NextResponse.json({
      success: true,
      message: `Status setoran pajak bulan ${monthNum}/${yearNum} berhasil diperbarui.`,
      closing,
    });
  } catch (err) {
    return routeError("AdminTax", err, "Gagal memperbarui status pajak");
  }
}
