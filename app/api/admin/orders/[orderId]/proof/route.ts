import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { isPrivateFileRef } from "@/lib/storage";
import { createProofLink } from "@/lib/proofLink";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

/**
 * Mengalihkan admin ke tautan bertanda tangan berumur pendek, sehingga `<img src>` dan "buka di tab baru" selalu
 * mendapat tautan segar walau daftar order dibuka lama.
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const guard = await requireAdminModule("orders");
    if (!guard.ok) return guard.response;

    const { orderId } = await params;
    const order = await prisma.order.findUnique({ where: { id: orderId }, select: { proofImageUrl: true } });
    if (!isPrivateFileRef(order?.proofImageUrl)) {
      return NextResponse.json({ error: "Order ini tidak memiliki bukti transfer." }, { status: 404 });
    }

    return new Response(null, {
      status: 302,
      headers: { Location: createProofLink(orderId, order.proofImageUrl), "Cache-Control": "no-store" },
    });
  } catch (error) {
    return routeError("AdminOrderProof", error, "Gagal membuka bukti transfer");
  }
}
