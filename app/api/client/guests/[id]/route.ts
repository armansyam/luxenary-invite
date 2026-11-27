import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { cleanGuestName, cleanGuestTextFields, guestQuotaFrom } from "@/lib/guestInput";
import { HttpError, routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { withGuestNameLock } from "@/lib/guestNameLock";

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

    // Ringkasan untuk dasbor: hitungan saja, tanpa memuat seluruh tamu beserta RSVP-nya.
    if (new URL(req.url).searchParams.get("summary") === "1") {
      const [guestCount, waSentCount, checkedInCount, souvenirCount, visits, opened, unopenedVipRows] = await Promise.all([
        prisma.guest.count({ where: { invitationId: id } }),
        prisma.guest.count({ where: { invitationId: id, waStatus: "SENT" } }),
        prisma.guest.count({ where: { invitationId: id, isTokenRedeemed: true } }),
        prisma.guest.count({ where: { invitationId: id, souvenirClaimed: true } }),
        prisma.invitationVisit.aggregate({ where: { invitationId: id }, _sum: { visitCount: true }, _count: true }),
        prisma.$queryRaw<{ total: bigint }[]>`
          SELECT COUNT(*) AS total FROM guests g
          WHERE g."invitationId" = ${id} AND EXISTS (
            SELECT 1 FROM invitation_visits v
            WHERE v.invitation_id = g."invitationId" AND lower(trim(v.guest_name)) = lower(trim(g.name)))`,
        prisma.$queryRaw<{ id: string; name: string }[]>`
          SELECT g.id, g.name FROM guests g
          WHERE g."invitationId" = ${id}
            AND upper(coalesce(g.category, '')) = 'VIP'
            AND NOT EXISTS (
              SELECT 1 FROM invitation_visits v
              WHERE v.invitation_id = g."invitationId" AND lower(trim(v.guest_name)) = lower(trim(g.name))
            )
          ORDER BY g."createdAt" DESC
          LIMIT 5`,
      ]);
      return NextResponse.json({
        guestCount,
        waSentCount,
        checkedInCount,
        souvenirCount,
        openCount: visits._sum.visitCount ?? 0,
        visitorCount: visits._count,
        openedGuestCount: Number(opened[0].total),
        unopenedVipGuests: unopenedVipRows,
      });
    }

    const [guests, openedRows] = await Promise.all([
      prisma.guest.findMany({
        where: { invitationId: id },
        include: { rsvps: true },
        orderBy: { createdAt: "desc" },
      }),
      // Link personal membawa ?to=<nama tamu> (resolveEffectiveInvitationUrl), jadi kunjungan dicocokkan lewat nama.
      prisma.$queryRaw<{ name: string; opened_at: Date }[]>`
        SELECT lower(trim(guest_name)) AS name, MIN(first_seen_at) AS opened_at FROM invitation_visits
        WHERE invitation_id = ${id} AND guest_name IS NOT NULL GROUP BY 1`,
    ]);
    const openedAt = new Map(openedRows.map((r) => [r.name, r.opened_at]));

    return NextResponse.json(guests.map((g) => ({ ...g, openedAt: openedAt.get(g.name.trim().toLowerCase()) ?? null })));
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
    const body = (await readJsonBody(req)) ?? {};

    const existingGuest = await prisma.guest.findUnique({
      where: { id },
      include: { invitation: { select: { userId: true, status: true } } },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: "Data tamu tidak ditemukan" }, { status: 404 });
    }

    const isOwner = existingGuest.invitation?.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAdmin && (existingGuest.invitation?.status === "EVENT_FINISHED" || existingGuest.invitation?.status === "ARCHIVED" || existingGuest.invitation?.status === "TAKEN_DOWN")) {
      return NextResponse.json(
        { error: "Acara telah selesai, diarsipkan, atau dinonaktifkan sehingga data tamu tidak dapat diubah." },
        { status: 403 }
      );
    }

    // Lindungi catatan kehadiran: tamu yang sudah check-in tidak boleh diubah nama/kuotanya oleh klien (status WA tetap boleh diperbarui).
    if (!isAdmin && existingGuest.isTokenRedeemed && (body.name !== undefined || body.guestQuota !== undefined)) {
      return NextResponse.json(
        { error: "Tamu ini sudah check-in. Nama dan kuota kehadirannya tidak dapat diubah." },
        { status: 409 }
      );
    }

    const allowedData: Record<string, any> = {};
    if (body.name !== undefined && !cleanGuestName(body.name)) {
      return NextResponse.json({ error: "Nama tamu wajib diisi (maksimal 100 karakter)." }, { status: 400 });
    }
    if (body.name !== undefined) {
      allowedData.name = cleanGuestName(body.name)!;
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

    const guest = await withGuestNameLock(existingGuest.invitationId, async (tx) => {
      if (allowedData.name !== undefined) {
        const clash = await tx.guest.findFirst({
          where: { invitationId: existingGuest.invitationId, id: { not: id }, name: { equals: allowedData.name, mode: "insensitive" } },
          select: { id: true },
        });
        if (clash) {
          throw new HttpError(400, `Nama "${allowedData.name}" sudah dipakai tamu lain. Tambahkan penanda agar tidak tertukar saat check-in.`);
        }
      }
      return tx.guest.update({ where: { id }, data: allowedData });
    });

    return NextResponse.json(guest);
  } catch (err) {
    return routeError("ClientGuest", err, "Gagal memperbarui data tamu.");
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
      include: { invitation: { select: { userId: true, status: true } } },
    });

    if (!existingGuest) {
      return NextResponse.json({ error: "Data tamu tidak ditemukan" }, { status: 404 });
    }

    const isOwner = existingGuest.invitation?.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!isAdmin && (existingGuest.invitation?.status === "EVENT_FINISHED" || existingGuest.invitation?.status === "ARCHIVED" || existingGuest.invitation?.status === "TAKEN_DOWN")) {
      return NextResponse.json(
        { error: "Acara telah selesai, diarsipkan, atau dinonaktifkan sehingga data tamu tidak dapat dihapus." },
        { status: 403 }
      );
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