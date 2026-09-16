import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

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
      return NextResponse.json([]);
    }

    // Verify invitation ownership
    const invitation = await prisma.invitation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!invitation) {
      return NextResponse.json([]);
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const guests = await prisma.guest.findMany({
      where: { invitationId: id },
      include: { rsvps: true },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(guests || []);
  } catch (err: any) {
    return NextResponse.json([], { status: 200 });
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
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const allowedData: Record<string, any> = {};
    if (typeof body.name === "string" && body.name.trim()) {
      allowedData.name = body.name.trim();
    }
    if (body.phone !== undefined) allowedData.phone = body.phone || null;
    if (body.category !== undefined) allowedData.category = body.category || null;
    if (body.sessionInfo !== undefined) allowedData.sessionInfo = body.sessionInfo || null;
    if (body.tableNumber !== undefined) allowedData.tableNumber = body.tableNumber || null;
    if (body.guestQuota !== undefined) allowedData.guestQuota = Number(body.guestQuota) || 1;
    if (body.waStatus !== undefined) allowedData.waStatus = body.waStatus;
    if (body.waSentAt !== undefined) allowedData.waSentAt = body.waSentAt ? new Date(body.waSentAt) : null;

    const guest = await prisma.guest.update({
      where: { id },
      data: allowedData,
    });

    return NextResponse.json(guest);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
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
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.guest.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}