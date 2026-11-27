import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { routeError } from "@/lib/routeError";
import { PARTNER_WHOLESALE_INVOICE_PREFIX } from "@/lib/clientActivation";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Privasi B2B: tagihan grosir Mitra WO (INV-WO-...) tidak ditampilkan di riwayat tagihan klien.
    const orders = await prisma.order.findMany({
      where: {
        userId: session.user.id,
        NOT: { invoiceNumber: { startsWith: PARTNER_WHOLESALE_INVOICE_PREFIX } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(orders);
  } catch (error) {
    return routeError("ClientOrders", error, "Gagal memuat daftar pesanan");
  }
}
