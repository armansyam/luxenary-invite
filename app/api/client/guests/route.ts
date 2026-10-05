import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";

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

    // 1. Verifikasi Kepemilikan & Hak Akses Terlebih Dahulu
    const isOwner = invitation.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    // 2. D-Day Lock Backend Validation berdasarkan Sesi Acara Utama
    if (invitation.eventData) {
      try {
        const ev = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData;
        if (ev && ev.length > 0) {
          const primaryEv = ev.find((e: any) => e.isPrimary) || ev[0];
          const eventDateStr = primaryEv?.date;
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
      } catch (e) {
        logger.warn("ClientGuests", "eventData undangan tidak terbaca; sesi tamu tidak divalidasi", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    // Duplicate Name Validation
    const trimmedName = name.trim();
    const existingGuest = await prisma.guest.findFirst({
      where: {
        invitationId,
        name: trimmedName,
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
        category: category || null,
        sessionInfo: sessionInfo || null,
        guestQuota: Number(guestLimit) || 1,
        tableNumber: tableNumber || null,
        qrToken: randomUUID(),
      },
    });

    return NextResponse.json(guest);
  } catch (error) {
    return routeError("ClientGuests", error, "Gagal membuat data tamu");
  }
}