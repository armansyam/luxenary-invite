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

    const currentInv = await prisma.invitation.findUnique({ where: { id } });

    // Auto-generate slugs if names are provided
    const newGroomSlug = (body.groomNickname || body.groomName)
      ? String(body.groomNickname || body.groomName).toLowerCase().replace(/[^a-z0-9]/g, "")
      : undefined;
    const newBrideSlug = (body.brideNickname || body.brideName)
      ? String(body.brideNickname || body.brideName).toLowerCase().replace(/[^a-z0-9]/g, "")
      : undefined;

    let newSubdomain = body.subdomain !== undefined
      ? (body.subdomain ? String(body.subdomain).trim().toLowerCase() : null)
      : undefined;

    // If subdomain is empty or matches old default didan-nasha, sync to couple's names
    if (newSubdomain === undefined && (!currentInv?.subdomain || currentInv.subdomain === "didan-nasha")) {
      if (newGroomSlug && newBrideSlug) {
        newSubdomain = `${newGroomSlug}-${newBrideSlug}`;
      }
    }

    let mergedFeatureSettings = undefined;
    if (body.featureSettings !== undefined) {
      if (body.featureSettings === null) {
        mergedFeatureSettings = null;
      } else {
        try {
          const existingObj = currentInv?.featureSettings
            ? (typeof currentInv.featureSettings === "object" ? currentInv.featureSettings : JSON.parse(currentInv.featureSettings || "{}"))
            : {};
          const incomingObj = typeof body.featureSettings === "object"
            ? body.featureSettings
            : JSON.parse(body.featureSettings || "{}");
          mergedFeatureSettings = JSON.stringify({ ...existingObj, ...incomingObj });
        } catch {
          mergedFeatureSettings = toStr(body.featureSettings);
        }
      }
    }

    const updated = await prisma.invitation.update({
      where: { id },
      data: {
        groomName: body.groomName !== undefined ? body.groomName : undefined,
        brideName: body.brideName !== undefined ? body.brideName : undefined,
        groomNickname: body.groomNickname !== undefined ? body.groomNickname : undefined,
        brideNickname: body.brideNickname !== undefined ? body.brideNickname : undefined,
        groomSlug: newGroomSlug || undefined,
        brideSlug: newBrideSlug || undefined,
        groomParents: body.groomParents !== undefined ? body.groomParents : undefined,
        brideParents: body.brideParents !== undefined ? body.brideParents : undefined,
        groomInstagram: body.groomInstagram !== undefined ? body.groomInstagram : undefined,
        brideInstagram: body.brideInstagram !== undefined ? body.brideInstagram : undefined,
        openingQuote: body.openingQuote !== undefined ? body.openingQuote : undefined,
        openingQuoteRef: body.openingQuoteRef !== undefined ? body.openingQuoteRef : undefined,
        themeId: body.themeId !== undefined ? body.themeId : undefined,
        subdomain: newSubdomain !== undefined ? newSubdomain : undefined,
        musicUrl: body.musicUrl !== undefined ? String(body.musicUrl || "") : undefined,
        status: body.status !== undefined ? body.status : undefined,
        loveStory: body.loveStory !== undefined ? toStr(body.loveStory) : undefined,
        dresscode: body.dresscode !== undefined ? body.dresscode : undefined,
        bankAccounts: body.bankAccounts !== undefined ? toStr(body.bankAccounts) : undefined,
        shippingAddress: body.shippingAddress !== undefined ? body.shippingAddress : undefined,
        liveStreamUrl: body.liveStreamUrl !== undefined ? body.liveStreamUrl : undefined,
        eventData: body.eventData !== undefined ? toStr(body.eventData) : undefined,
        featureSettings: mergedFeatureSettings,
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
