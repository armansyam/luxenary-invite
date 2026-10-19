import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { prisma } from "@/lib/prisma";
import { isPrivateFileRef, readPrivateFile } from "@/lib/storage";
import { verifyProofLink } from "@/lib/proofLink";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

const PROOF_MIME_TYPES: Record<string, string> = {
  ".webp": "image/webp",
  ".pdf": "application/pdf",
  // Bukti hasil migrasi dari penyimpanan lama dapat berformat asli.
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
};

/** Menyajikan bukti transfer hanya untuk tautan bertanda tangan yang masih berlaku (dibuat oleh rute admin). */
export async function GET(req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await params;
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { proofImageUrl: true } });
    const proofRef = order?.proofImageUrl;
    const exp = req.nextUrl.searchParams.get("exp");
    const sig = req.nextUrl.searchParams.get("sig");

    // Order tanpa bukti dan tanda tangan salah dijawab sama, agar tautan tidak dapat dipakai untuk menebak ID order.
    if (!isPrivateFileRef(proofRef) || !verifyProofLink(orderId, proofRef, exp, sig)) {
      return NextResponse.json({ error: "Tautan bukti transfer tidak valid atau sudah kedaluwarsa." }, { status: 403 });
    }

    const file = await readPrivateFile(proofRef);
    if (!file) {
      return NextResponse.json({ error: "Berkas bukti transfer tidak ditemukan di penyimpanan." }, { status: 404 });
    }

    return new NextResponse(new Uint8Array(file), {
      status: 200,
      headers: {
        "Content-Type": PROOF_MIME_TYPES[path.extname(proofRef).toLowerCase()] || "application/octet-stream",
        "Content-Length": String(file.length),
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
      },
    });
  } catch (error) {
    return routeError("ProofFile", error, "Gagal membuka bukti transfer");
  }
}
