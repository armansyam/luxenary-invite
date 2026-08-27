import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const invitationId = searchParams.get("invitationId");

  if (!invitationId) {
    return NextResponse.json({ error: "invitationId required" }, { status: 400 });
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

    return NextResponse.json({ success: true, guests });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch guests" }, { status: 500 });
  }
}
