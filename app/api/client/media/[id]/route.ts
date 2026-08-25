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

    if (!id) return NextResponse.json({});

    const inv = await prisma.invitation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!inv) return NextResponse.json({});

    const isOwner = inv.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const media = await prisma.invitationMedia.findMany({
      where: { invitationId: id },
    });

    const mediaMap: Record<string, string> = {};
    for (const m of media) {
      const url = m.driveViewUrl || m.localPath || "";
      if (url) mediaMap[String(m.mediaSlot)] = url;
    }

    return NextResponse.json(mediaMap);
  } catch (err: any) {
    return NextResponse.json({});
  }
}

export async function POST(
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

    if (!id) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan" }, { status: 400 });
    }

    const inv = await prisma.invitation.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!inv) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = inv.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const VALID_ENUM_SLOTS = ["LANDING_COVER", "DESKTOP_SIDEBAR", "GLOBAL_FIXED_BG", "GROOM_PHOTO", "BRIDE_PHOTO", "GALLERY"];

    for (const [slot, url] of Object.entries(body)) {
      if (!url) continue;

      const enumSlot = VALID_ENUM_SLOTS.includes(slot) ? slot : "GALLERY";

      const existing = await prisma.invitationMedia.findFirst({
        where: { invitationId: id, mediaSlot: enumSlot as any },
      });

      if (existing) {
        await prisma.invitationMedia.update({
          where: { id: existing.id },
          data: { localPath: String(url) },
        });
      } else {
        await prisma.invitationMedia.create({
          data: {
            invitationId: id,
            mediaSlot: enumSlot as any,
            localPath: String(url),
          },
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}