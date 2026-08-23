import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const { invitationId, name, phone, category, sessionInfo, guestLimit } = body;

  if (!invitationId || !name) {
    return NextResponse.json({ error: "invitationId and name are required" }, { status: 400 });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);

  const guest = await prisma.guest.create({
    data: {
      invitationId,
      name,
      slug,
      phone: phone || null,
      phoneNumber: phone || null,
      category: category || null,
      sessionInfo: sessionInfo || null,
      guestQuota: guestLimit || 1,
      qrToken: randomUUID(),
    },
  });

  return NextResponse.json(guest);
}