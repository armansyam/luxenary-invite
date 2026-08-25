import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export function getInvitationLockStatus(inv: any) {
  // 1. Check if Admin Emergency Unlock is actively running
  if (inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date()) {
    return {
      isLocked: false,
      isCoreLocked: false,
      isEmergencyUnlocked: true,
      unlockExpiresAt: inv.adminUnlockedUntil,
      lockReason: null,
    };
  }

  // 2. Check if explicitly marked as permanently locked
  if (inv.isLockedPermanently) {
    return {
      isLocked: true,
      isCoreLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "LOCKED_PERMANENT",
    };
  }

  // 3. Check if wedding event date has passed (Hari H + 1 day grace period)
  let hasPassed = false;
  if (inv.eventData) {
    try {
      const parsed = typeof inv.eventData === "string" ? JSON.parse(inv.eventData) : inv.eventData;
      if (Array.isArray(parsed)) {
        for (const ev of parsed) {
          if (ev.date) {
            const evDate = new Date(ev.date).getTime();
            // 24 hours grace period after event day
            if (Date.now() > evDate + 24 * 3600 * 1000) {
              hasPassed = true;
              break;
            }
          }
        }
      }
    } catch (e) {}
  }

  if (hasPassed) {
    return {
      isLocked: true,
      isCoreLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "EVENT_DATE_PASSED",
    };
  }

  // 4. Before Hari H: General fields editable, but core couple names & date are protected
  const hasExistingNames = Boolean(inv.groomName && inv.brideName);
  return {
    isLocked: false,
    isCoreLocked: hasExistingNames,
    isEmergencyUnlocked: false,
    unlockExpiresAt: null,
    lockReason: null,
  };
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan." }, { status: 400 });
    }

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      include: { media: true },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = invitation.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki akses ke undangan ini." }, { status: 403 });
    }

    const mediaMap: Record<string, string> = {};
    if (invitation.media && Array.isArray(invitation.media)) {
      for (const m of invitation.media) {
        const url = m.driveViewUrl || m.localPath || "";
        if (url) mediaMap[String(m.mediaSlot)] = url;
      }
    }

    const lockStatus = getInvitationLockStatus(invitation);

    return NextResponse.json({
      ...invitation,
      mediaMap,
      ...lockStatus,
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
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized. Silakan login terlebih dahulu." }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;
    const body = await req.json();

    const toStr = (v: any) => (v ? (typeof v === "object" ? JSON.stringify(v) : String(v)) : null);

    const currentInv = await prisma.invitation.findUnique({ where: { id } });
    if (!currentInv) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = currentInv.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki hak mengedit undangan ini." }, { status: 403 });
    }

    const lockStatus = getInvitationLockStatus(currentInv);

    // If completely locked, reject edit
    if (lockStatus.isLocked) {
      return NextResponse.json(
        {
          error:
            "Undangan ini telah terkunci permanen karena tanggal acara telah terlewati. Hubungi Administrator untuk membuka kunci darurat.",
        },
        { status: 403 }
      );
    }

    // Auto-generate slugs if names are provided
    let newGroomSlug = undefined;
    let newBrideSlug = undefined;

    // Check if core names can be modified (only if emergency unlocked or names not set yet)
    const canEditCore = lockStatus.isEmergencyUnlocked || !lockStatus.isCoreLocked;

    let groomNameToSave = undefined;
    let brideNameToSave = undefined;
    let groomNicknameToSave = undefined;
    let brideNicknameToSave = undefined;

    if (canEditCore) {
      if (body.groomName !== undefined) groomNameToSave = body.groomName;
      if (body.brideName !== undefined) brideNameToSave = body.brideName;
      if (body.groomNickname !== undefined) groomNicknameToSave = body.groomNickname;
      if (body.brideNickname !== undefined) brideNicknameToSave = body.brideNickname;

      if (body.groomNickname || body.groomName) {
        newGroomSlug = String(body.groomNickname || body.groomName).toLowerCase().replace(/[^a-z0-9]/g, "");
      }
      if (body.brideNickname || body.brideName) {
        newBrideSlug = String(body.brideNickname || body.brideName).toLowerCase().replace(/[^a-z0-9]/g, "");
      }
    }

    let newSubdomain = canEditCore && body.subdomain !== undefined
      ? (body.subdomain ? String(body.subdomain).trim().toLowerCase() : null)
      : undefined;

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
        groomName: groomNameToSave,
        brideName: brideNameToSave,
        groomNickname: groomNicknameToSave,
        brideNickname: brideNicknameToSave,
        groomSlug: newGroomSlug,
        brideSlug: newBrideSlug,
        groomParents: body.groomParents !== undefined ? body.groomParents : undefined,
        brideParents: body.brideParents !== undefined ? body.brideParents : undefined,
        groomInstagram: body.groomInstagram !== undefined ? body.groomInstagram : undefined,
        brideInstagram: body.brideInstagram !== undefined ? body.brideInstagram : undefined,
        openingQuote: body.openingQuote !== undefined ? body.openingQuote : undefined,
        openingQuoteRef: body.openingQuoteRef !== undefined ? body.openingQuoteRef : undefined,
        themeId: body.themeId !== undefined ? body.themeId : undefined,
        subdomain: newSubdomain,
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

    // Save media updates
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

    // If invitation is PUBLISHED, auto-rebake standalone HTML file
    if (updated.status === "PUBLISHED") {
      try {
        const { buildAndSavePublishedHtml } = await import("@/lib/staticPublisher");
        await buildAndSavePublishedHtml(updated.id);
      } catch (bakeErr) {
        console.error("Auto-bake standalone HTML failed:", bakeErr);
      }
    }

    return NextResponse.json({ ...updated, ...getInvitationLockStatus(updated) });
  } catch (err: any) {
    console.error("Error updating invitation:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
