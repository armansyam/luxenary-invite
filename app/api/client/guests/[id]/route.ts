import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { cleanGuestName, cleanGuestTextFields, guestQuotaFrom } from "@/lib/guestInput";
import { getPrimaryEventDate } from "@/lib/lifecycleDates";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID undangan wajib disertakan." }, { status: 400 });
    }

    // Verify invitation ownership
    const invitation = await prisma.invitation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Ringkasan untuk dasbor: tiga hitungan, tanpa memuat seluruh tamu beserta RSVP-nya.
    if (new URL(req.url).searchParams.get("summary") === "1") {
      const [guestCount, waSentCount, checkedInCount] = await Promise.all([
        prisma.guest.count({ where: { invitationId: id } }),
        prisma.guest.count({ where: { invitationId: id, waStatus: "SENT" } }),
        prisma.guest.count({ where: { invitationId: id, isTokenRedeemed: true } }),
      ]);
      return NextResponse.json({ guestCount, waSentCount, checkedInCount });
    }

    const guests = await prisma.guest.findMany({
      where: { invitationId: id },
      include: { rsvps: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(guests);
  } catch (err) {
    logger.error("ClientGuest", "Gagal memuat daftar tamu", err);
    return NextResponse.json({ error: "Gagal memuat daftar tamu." }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const body = await req.json();

    const existingGuest = await prisma.guest.findUnique({
      where: { id },
      include: { invitation: { select: { userId: true, eventData: true } } },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: "Data tamu tidak ditemukan" }, { status: 404 });
    }

    const isOwner = existingGuest.invitation?.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Sama dengan tambah tamu: mulai hari terima tamu, nama dan kuota yang tercetak di QR tidak boleh berubah dari dasbor.
    const guestDay = getPrimaryEventDate(existingGuest.invitation.eventData);
    if (!isAdmin && guestDay && Date.now() >= guestDay.getTime()) {
      return NextResponse.json(
        { error: "Daftar tamu sudah dikunci karena acara sedang/telah berlangsung. Perubahan data tamu hanya dapat dilakukan Resepsionis di lokasi." },
        { status: 403 }
      );
    }

    const allowedData: Record<string, any> = {};
    if (body.name !== undefined && !cleanGuestName(body.name)) {
      return NextResponse.json({ error: "Nama tamu wajib diisi (maksimal 100 karakter)." }, { status: 400 });
    }
    if (body.name !== undefined) {
      const newName = cleanGuestName(body.name)!;
      const clash = await prisma.guest.findFirst({
        where: { invitationId: existingGuest.invitationId, id: { not: id }, name: { equals: newName, mode: "insensitive" } },
        select: { id: true },
      });
      if (clash) {
        return NextResponse.json(
          { error: `Nama "${newName}" sudah dipakai tamu lain. Tambahkan penanda agar tidak tertukar saat check-in.` },
          { status: 400 }
        );
      }
      allowedData.name = newName;
    }
    const textFields = cleanGuestTextFields(body);
    for (const field of ["phone", "category", "sessionInfo", "tableNumber"] as const) {
      if (body[field] !== undefined) allowedData[field] = textFields[field];
    }
    if (body.guestQuota !== undefined) allowedData.guestQuota = guestQuotaFrom(body.guestQuota, 1);
    if (body.waStatus !== undefined) {
      if (body.waStatus !== "PENDING" && body.waStatus !== "SENT") {
        return NextResponse.json({ error: "Status WhatsApp tidak valid." }, { status: 400 });
      }
      allowedData.waStatus = body.waStatus;
    }

    const guest = await prisma.guest.update({
      where: { id },
      data: allowedData,
    });

    return NextResponse.json(guest);
  } catch (err) {
    logger.error("ClientGuest", "Gagal memperbarui tamu", err);
    return NextResponse.json({ error: "Gagal memperbarui data tamu." }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    const existingGuest = await prisma.guest.findUnique({
      where: { id },
      include: { invitation: { select: { userId: true } } },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: "Data tamu tidak ditemukan" }, { status: 404 });
    }

    const isOwner = existingGuest.invitation?.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (existingGuest.isTokenRedeemed && !isAdmin) {
      return NextResponse.json(
        { error: "Tamu ini sudah check-in. Data kehadirannya tidak dapat dihapus." },
        { status: 409 }
      );
    }

    await prisma.guest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err) {
    logger.error("ClientGuest", "Gagal menghapus tamu", err);
    return NextResponse.json({ error: "Gagal menghapus tamu." }, { status: 500 });
  }
}