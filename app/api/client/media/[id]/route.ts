import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const VALID_SLOTS = [
  "LANDING_COVER",
  "DESKTOP_SIDEBAR",
  "GLOBAL_FIXED_BG",
  "GROOM_PHOTO",
  "BRIDE_PHOTO",
  "GALLERY",
];

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const media = await prisma.invitationMedia.findMany({
    where: { invitationId: id },
  });

  // Return as map { slot: url }
  const mediaMap: Record<string, string> = {};
  for (const m of media) {
    const url = m.driveViewUrl || m.localPath || "";
    if (url) mediaMap[String(m.mediaSlot)] = url;
  }

  return NextResponse.json(mediaMap);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json(); // { slot: url, ... }

  for (const [slot, url] of Object.entries(body)) {
    if (!VALID_SLOTS.includes(slot)) continue;
    if (!url) continue;

    const existing = await prisma.invitationMedia.findFirst({
      where: { invitationId: id, mediaSlot: slot as any },
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
          mediaSlot: slot as any,
          localPath: String(url),
        },
      });
    }
  }

  return NextResponse.json({ success: true });
}