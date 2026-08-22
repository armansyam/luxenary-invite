import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const { invitationId, name, phone, category, sessionInfo, guestLimit } = body;

  if (!invitationId || !name) {
    return NextResponse.json({ error: "invitationId and name are required" }, { status: 400 });
  }

  const guest = await prisma.guest.create({
    data: {
      invitationId,
      name,
      phone: phone || null,
      category: category || null,
      sessionInfo: sessionInfo || null,
      guestLimit: guestLimit || 1,
      qrToken: randomUUID(),
    },
  });

  return NextResponse.json(guest);
}