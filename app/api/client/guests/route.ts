import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { getPrimaryEventDate } from "@/lib/lifecycleDates";
import { cleanGuestName, cleanGuestTextFields, guestQuotaFrom } from "@/lib/guestInput";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const body = await req.json();
    const { invitationId, name, phone, category, sessionInfo, guestLimit, tableNumber } = body;

    if (typeof invitationId !== "string" || !invitationId || !cleanGuestName(name)) {
      return NextResponse.json({ error: "invitationId dan nama tamu wajib diisi (nama maksimal 100 karakter)." }, { status: 400 });
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

    // 2. Mulai hari terima tamu (pada zona waktu acara) tamu baru hanya dicatat Resepsionis di lokasi.
    const guestDay = getPrimaryEventDate(invitation.eventData);
    if (guestDay && Date.now() >= guestDay.getTime()) {
      return NextResponse.json(
        { error: "Daftar tamu sudah dikunci karena acara sedang/telah berlangsung. Tamu tambahan hanya dapat diinput oleh Resepsionis di lokasi." },
        { status: 403 }
      );
    }

    // Duplicate Name Validation: QR, RSVP, dan resepsionis mencocokkan nama tanpa membedakan huruf besar/kecil.
    const trimmedName = cleanGuestName(name)!;
    const existingGuest = await prisma.guest.findFirst({
      where: {
        invitationId,
        name: { equals: trimmedName, mode: "insensitive" },
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
        ...cleanGuestTextFields({ phone, category, sessionInfo, tableNumber }),
        guestQuota: guestQuotaFrom(guestLimit, 1),
        qrToken: randomUUID(),
      },
    });

    return NextResponse.json(guest);
  } catch (error) {
    return routeError("ClientGuests", error, "Gagal membuat data tamu");
  }
}