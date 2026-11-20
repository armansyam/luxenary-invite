import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
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
 * GET /api/partner/payouts/[expenseId]/receipt
 * Endpoint privat bagi mitra aktif untuk melihat / mengunduh bukti transfer
 * pencairan komisi miliknya sendiri.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ expenseId: string }> },
) {
  try {
    const session = await getPartnerSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.partnerAffiliate.findUnique({
      where: { id: session.partnerId },
      select: { id: true, isActive: true, sessionVersion: true },
    });
    if (!partner || !partner.isActive) {
      return NextResponse.json(
        { error: "Akun mitra tidak ditemukan atau sudah dinonaktifkan." },
        { status: 403 },
      );
    }
    if (session.sv !== partner.sessionVersion) {
      const expired = NextResponse.json(
        { error: "Sesi telah berakhir karena perubahan keamanan akun. Silakan masuk kembali." },
        { status: 401 },
      );
      expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return expired;
    }

    const { expenseId } = await params;
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        partnerAffiliateId: partner.id,
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
    const fileName = `bukti-transfer-komisi-${expense.id.slice(0, 8)}${ext || ""}`;

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
    return routeError("PartnerPayoutReceipt", error, "Gagal membuka bukti transfer");
  }
}
