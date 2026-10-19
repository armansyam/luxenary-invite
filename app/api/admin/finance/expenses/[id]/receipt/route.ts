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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const guard = await requireAdminModule("finance");
    if (!guard.ok) return guard.response;

    const { id } = await params;
    const expense = await prisma.expense.findUnique({ where: { id }, select: { receiptUrl: true } });
    const ref = expense?.receiptUrl;
    if (!isPrivateFileRef(ref)) {
      return NextResponse.json({ error: "Pengeluaran ini tidak memiliki struk." }, { status: 404 });
    }

    const file = await readPrivateFile(ref);
    if (!file) {
      return NextResponse.json({ error: "Berkas struk tidak ditemukan di penyimpanan." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": RECEIPT_MIME_TYPES[path.extname(ref).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(file.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return routeError("AdminExpenseReceipt", error, "Gagal membuka struk");
  }
}
