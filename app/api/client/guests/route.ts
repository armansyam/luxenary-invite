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
    const { invitationId, name, phone, category, sessionInfo, guestLimit, tableNumber } = body;

    if (!invitationId || !name) {
      return NextResponse.json({ error: "invitationId and name are required" }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { userId: true, eventData: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    // D-Day Lock Backend Validation
    if (invitation.eventData) {
      try {
        const ev = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
        if (ev && ev.length > 0) {
          const eventDateStr = ev[0].date;
          if (eventDateStr) {
            const eventDate = new Date(eventDateStr);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            eventDate.setHours(0, 0, 0, 0);
            if (today >= eventDate) {
              return NextResponse.json(
                { error: "Daftar tamu sudah dikunci karena acara sedang/telah berlangsung. Tamu tambahan hanya dapat diinput oleh Resepsionis di lokasi." },
                { status: 403 }
              );
            }
          }
        }
      } catch (e) {}
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    // Duplicate Name Validation
    const trimmedName = name.trim();
    const existingGuest = await prisma.guest.findFirst({
      where: {
        invitationId,
        name: { equals: trimmedName, mode: "insensitive" }
      },
    });

    if (existingGuest) {
      return NextResponse.json(
        { error: `Nama "${trimmedName}" sudah ada di daftar. Harap tambahkan penanda khusus (misal: "${trimmedName} VIP" atau "${trimmedName} Keluarga") agar tidak tertukar.` },
        { status: 400 }
      );
    }

    const slug = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36);

    const guest = await prisma.guest.create({
      data: {
        invitationId,
        name: trimmedName,
        slug,
        phone: phone || null,
        phoneNumber: phone || null,
        category: category || null,
        sessionInfo: sessionInfo || null,
        guestQuota: Number(guestLimit) || 1,
        tableNumber: tableNumber || null,
        qrToken: randomUUID(),
      },
    });

    return NextResponse.json(guest);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal membuat data tamu" }, { status: 500 });
  }
}