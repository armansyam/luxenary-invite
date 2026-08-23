import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    let invitation = null;
    if (id) {
      invitation = await prisma.invitation.findUnique({
        where: { id },
        include: { media: true },
      });
    }

    if (!invitation) {
      // Fallback to first active invitation
      invitation = await prisma.invitation.findFirst({
        orderBy: { createdAt: "desc" },
        include: { media: true },
      });
    }

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    // Convert media array to key-value map for convenience
    const mediaMap: Record<string, string> = {};
    if (invitation.media && Array.isArray(invitation.media)) {
      for (const m of invitation.media) {
        const url = m.driveViewUrl || m.localPath || "";
        if (url) mediaMap[String(m.mediaSlot)] = url;
      }
    }

    return NextResponse.json({
      ...invitation,
      mediaMap,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const body = await req.json();

    const toStr = (v: any) => (v ? (typeof v === "object" ? JSON.stringify(v) : String(v)) : null);

    const updated = await prisma.invitation.update({
      where: { id },
      data: {
        groomName: body.groomName,
        brideName: body.brideName,
        groomNickname: body.groomNickname,
        brideNickname: body.brideNickname,
        groomParents: body.groomParents,
        brideParents: body.brideParents,
        groomInstagram: body.groomInstagram,
        brideInstagram: body.brideInstagram,
        openingQuote: body.openingQuote,
        openingQuoteRef: body.openingQuoteRef,
        themeId: body.themeId,
        subdomain: body.subdomain !== undefined ? (body.subdomain ? String(body.subdomain).trim().toLowerCase() : null) : undefined,
        musicUrl: body.musicUrl !== undefined ? String(body.musicUrl || "") : undefined,
        status: body.status !== undefined ? body.status : undefined,
        loveStory: toStr(body.loveStory),
        dresscode: body.dresscode,
        bankAccounts: toStr(body.bankAccounts),
        shippingAddress: body.shippingAddress,
        liveStreamUrl: body.liveStreamUrl,
        eventData: toStr(body.eventData),
        featureSettings: toStr(body.featureSettings),
      },
    });

    // If media map (key-value) is sent with the PUT payload, save it directly
    if (body.media && typeof body.media === "object" && !Array.isArray(body.media)) {
      const VALID_ENUM_SLOTS = ["LANDING_COVER", "DESKTOP_SIDEBAR", "GLOBAL_FIXED_BG", "GROOM_PHOTO", "BRIDE_PHOTO", "GALLERY"];
      for (const [slot, url] of Object.entries(body.media)) {
        if (!VALID_ENUM_SLOTS.includes(slot)) continue;
        const urlStr = typeof url === "string" ? url.trim() : "";

        const existing = await prisma.invitationMedia.findFirst({
          where: { invitationId: id, mediaSlot: slot as any },
        });

        if (urlStr) {
          if (existing) {
            await prisma.invitationMedia.update({
              where: { id: existing.id },
              data: { localPath: urlStr },
            });
          } else {
            await prisma.invitationMedia.create({
              data: {
                invitationId: id,
                mediaSlot: slot as any,
                localPath: urlStr,
              },
            });
          }
        } else if (existing) {
          await prisma.invitationMedia.delete({
            where: { id: existing.id },
          });
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err: any) {
    console.error("Error updating invitation:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
