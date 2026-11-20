import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { isPrivateFileRef, readPrivateFile } from "@/lib/storage";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

const RECEIPT_MIME_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".pdf": "application/pdf",
};

/**
 * GET /api/admin/marketing/payouts/[expenseId]/receipt
 * Khusus admin modul marketing untuk melihat bukti transfer pencairan komisi mitra
 * tanpa membuka akses ke seluruh struk pengeluaran finance lain.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    const guard = await requireAdminModule("marketing");
    if (!guard.ok) return guard.response;

    const { expenseId } = await params;
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        partnerAffiliateId: { not: null },
      },
      select: { id: true, receiptUrl: true },
    });

    const ref = expense?.receiptUrl;
    if (!expense || !isPrivateFileRef(ref)) {
      return NextResponse.json({ error: "Bukti transfer pencairan tidak ditemukan." }, { status: 404 });
    }

    const file = await readPrivateFile(ref);
    if (!file) {
      return NextResponse.json({ error: "Berkas bukti transfer tidak ditemukan di penyimpanan." }, { status: 404 });
    }

    const ext = path.extname(ref).toLowerCase();
    const isDownload = req.nextUrl.searchParams.get("download") === "1";
    const fileName = `bukti-transfer-payout-${expense.id.slice(0, 8)}${ext || ""}`;

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": RECEIPT_MIME_TYPES[ext] || "application/octet-stream",
        "Content-Length": String(file.length),
        "Content-Disposition": `${isDownload ? "attachment" : "inline"}; filename="${fileName}"`,
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return routeError("AdminPartnerPayoutReceipt", error, "Gagal membuka bukti transfer pencairan");
  }
}
