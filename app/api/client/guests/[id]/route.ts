import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";

export async function GET(
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

    const allowedData: Record<string, any> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      const newName = body.name.trim();
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
    if (body.phone !== undefined) allowedData.phone = body.phone || null;
    if (body.category !== undefined) allowedData.category = body.category || null;
    if (body.sessionInfo !== undefined) allowedData.sessionInfo = body.sessionInfo || null;
    if (body.tableNumber !== undefined) allowedData.tableNumber = body.tableNumber || null;
    if (body.guestQuota !== undefined) allowedData.guestQuota = Number(body.guestQuota) || 1;
    if (body.waStatus !== undefined) allowedData.waStatus = body.waStatus;

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