import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readJsonBody } from "@/lib/requestBody";
import { routeError } from "@/lib/routeError";
import { rateLimitDb, getClientIp } from "@/lib/rateLimit";
import { isReceptionistAuthorized, readReceptionistToken } from "@/lib/receptionistGuard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitDb(`souvenir:${ip}`, 60, 60 * 1000))) {
      return NextResponse.json({ error: "Terlalu banyak permintaan. Silakan tunggu sebentar." }, { status: 429 });
    }

    const body = (await readJsonBody<{
      invitationId?: string;
      guestId?: string;
      claimed?: boolean;
      token?: string;
    }>(req)) ?? {};

    const invitationId = typeof body.invitationId === "string" ? body.invitationId.trim() : "";
    const guestId = typeof body.guestId === "string" ? body.guestId.trim() : "";
    const claimed = Boolean(body.claimed);
    const token = (typeof body.token === "string" && body.token.trim()) || readReceptionistToken(req.headers);

    if (!invitationId || !guestId) {
      return NextResponse.json({ error: "Data tidak lengkap." }, { status: 400 });
    }

    if (!token || !(await isReceptionistAuthorized(invitationId, token))) {
      return NextResponse.json({ error: "Akses Ditolak. Sesi tidak valid." }, { status: 401 });
    }

    const existing = await prisma.guest.findFirst({
      where: { id: guestId, invitationId },
      select: { id: true, name: true },
    });

    if (!existing) {
      return NextResponse.json({ error: "Tamu tidak ditemukan pada undangan ini." }, { status: 404 });
    }

    const updated = await prisma.guest.update({
      where: { id: existing.id },
      data: {
        souvenirClaimed: claimed,
        souvenirClaimedAt: claimed ? new Date() : null,
      },
      select: {
        id: true,
        name: true,
        category: true,
        tableNumber: true,
        souvenirClaimed: true,
        souvenirClaimedAt: true,
      },
    });

    return NextResponse.json({
      success: true,
      guest: updated,
      message: claimed
        ? `Souvenir untuk ${updated.name} ditandai sudah diambil.`
        : `Status souvenir untuk ${updated.name} dibatalkan.`,
    });
  } catch (error) {
    return routeError("ReceptionistSouvenir", error, "Gagal memperbarui status souvenir.");
  }
}
