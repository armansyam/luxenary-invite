import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json();
    const { invitationId, name, phone, category, sessionInfo, guestLimit } = body;

    if (!invitationId || !name) {
      return NextResponse.json({ error: "invitationId and name are required" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { userId: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);

    const guest = await prisma.guest.create({
      data: {
        invitationId,
        name: name.trim(),
        slug,
        phone: phone || null,
        phoneNumber: phone || null,
        category: category || null,
        sessionInfo: sessionInfo || null,
        guestQuota: Number(guestLimit) || 1,
        qrToken: randomUUID(),
      },
    });

    return NextResponse.json(guest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat data tamu" }, { status: 500 });
  }
}