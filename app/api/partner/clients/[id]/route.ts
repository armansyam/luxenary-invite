import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { rateLimitDb } from "@/lib/rateLimit";
import { deleteFile } from "@/lib/storage";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * DELETE /api/partner/clients/[id]
 * Menghapus data calon klien yang didaftarkan mitra jika belum pernah memiliki pembayaran lunas,
 * belum mengaktivasi akun, belum memiliki undangan, dan tidak sedang menunggu verifikasi bukti transfer.
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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
      return NextResponse.json({ error: "Akun mitra tidak aktif." }, { status: 403 });
    }

    if (session.sv !== partner.sessionVersion) {
      const expired = NextResponse.json(
        { error: "Sesi mitra telah berakhir. Silakan masuk kembali." },
        { status: 401 },
      );
      expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return expired;
    }

    if (!(await rateLimitDb(`partner_del_client:${partner.id}`, 20, 60_000))) {
      return NextResponse.json(
        { error: "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi." },
        { status: 429 },
      );
    }

    const { id: clientId } = await params;
    const targetUser = await prisma.user.findUnique({
      where: { id: clientId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        provisionedByPartnerId: true,
        _count: { select: { invitations: true } },
        orders: {
          select: {
            id: true,
            status: true,
            gatewayId: true,
            gatewayTxId: true,
            proofImageUrl: true,
          },
        },
      },
    });

    if (!targetUser || targetUser.provisionedByPartnerId !== partner.id) {
      return NextResponse.json({ error: "Klien tidak ditemukan pada akun mitra Anda." }, { status: 404 });
    }

    if (targetUser.passwordHash) {
      return NextResponse.json(
        { error: "Akun klien ini sudah aktif sehingga tidak dapat dihapus dari Portal Mitra." },
        { status: 409 },
      );
    }

    if (targetUser._count.invitations > 0) {
      return NextResponse.json(
        { error: "Klien ini sudah memiliki undangan sehingga tidak dapat dihapus." },
        { status: 409 },
      );
    }

    if (targetUser.orders.some((o) => o.status === "PAID")) {
      return NextResponse.json(
        { error: "Klien ini sudah memiliki transaksi lunas sehingga tidak dapat dihapus." },
        { status: 409 },
      );
    }

    if (targetUser.orders.some((o) => o.status === "PENDING" && Boolean(o.proofImageUrl))) {
      return NextResponse.json(
        { error: "Klien ini memiliki bukti transfer yang sedang diverifikasi admin dan tidak dapat dihapus." },
        { status: 409 },
      );
    }

    // Batalkan sesi gateway aktif sebelum menghapus order PENDING agar QRIS tidak lagi valid.
    for (const o of targetUser.orders) {
      if (o.status === "PENDING" && o.gatewayTxId) {
        try {
          const { getGatewayById, getActiveGateway } = await import("@/lib/gatewayRegistry");
          const gw = o.gatewayId ? await getGatewayById(o.gatewayId) : await getActiveGateway();
          if (gw.cancel) {
            const cancelRes = await gw.cancel(o.gatewayTxId);
            if (cancelRes && !cancelRes.success && cancelRes.error?.includes("terbayar")) {
              return NextResponse.json(
                { error: "Tagihan klien ini baru saja terbayar di gateway sehingga tidak dapat dihapus." },
                { status: 409 },
              );
            }
          }
        } catch (err) {
          logger.warn("PartnerClientDelete", "Gagal membatalkan sesi gateway sebelum hapus klien", {
            orderId: o.id,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    }

    const proofUrls = targetUser.orders.map((o) => o.proofImageUrl).filter((u): u is string => Boolean(u));

    const deleted = await prisma.$transaction(async (tx) => {
      const paidNow = await tx.order.count({ where: { userId: clientId, status: "PAID" } });
      if (paidNow > 0) return false;
      await tx.order.deleteMany({ where: { userId: clientId, status: { not: "PAID" } } });
      await tx.user.delete({ where: { id: clientId } });
      return true;
    });

    if (!deleted) {
      return NextResponse.json(
        { error: "Klien ini baru saja memiliki transaksi lunas dan tidak dapat dihapus." },
        { status: 409 },
      );
    }

    for (const url of proofUrls) {
      await deleteFile(url);
    }

    return NextResponse.json({
      success: true,
      message: "Data calon klien berhasil dihapus.",
    });
  } catch (error) {
    return routeError("PartnerClientDelete", error, "Gagal menghapus data klien.");
  }
}
