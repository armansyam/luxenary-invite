import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isReceptionistAuthorized, readReceptionistToken } from "@/lib/receptionistGuard";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const invitationId = new URL(req.url).searchParams.get("invitationId");

  if (!invitationId) {
    return NextResponse.json({ error: "invitationId required" }, { status: 400 });
  }

  const ip = getClientIp(req);
  if (!(await rateLimitDb(`rcpt_guests:${ip}`, 60, 60 * 1000))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }

  if (!(await isReceptionistAuthorized(invitationId, readReceptionistToken(req.headers)))) {
    return NextResponse.json({ error: "Akses ditolak. Sesi resepsionis tidak valid." }, { status: 401 });
  }

  try {
    const guests = await prisma.guest.findMany({
      where: { invitationId },
      select: {
        id: true,
        name: true,
        category: true,
        guestQuota: true,
        tableNumber: true,
        qrToken: true,
        isTokenRedeemed: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ success: true, guests }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Receptionist Guests] Gagal memuat tamu:", error);
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}
