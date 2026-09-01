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
      include: { 
        media: true,
        order: {
          select: { planType: true }
        }
      },
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
        const url = m.localPath || "";
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

    if (newSubdomain === undefined && (!currentInv?.subdomain || currentInv.subdomain === "mempelai-pria-wanita")) {
      if (newGroomSlug && newBrideSlug) {
        newSubdomain = `${newGroomSlug}-${newBrideSlug}`;
      }
    }

    // --- BUG FIX: Check Subdomain Uniqueness ---
    if (newSubdomain && newSubdomain !== currentInv.subdomain) {
      const existingSub = await prisma.invitation.findUnique({ where: { subdomain: newSubdomain } });
      if (existingSub && existingSub.id !== id) {
        return NextResponse.json(
          { error: `Tautan/Subdomain "${newSubdomain}" sudah digunakan oleh orang lain. Silakan ubah nama panggilan.` },
          { status: 400 }
        );
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
          
          let parsedFeatures = { ...existingObj, ...incomingObj };

          // --- SERVER-SIDE FEATURE GATING ---
          // Prevent API Bypass for premium features based on planType
          if (!isAdmin) {
            const { getPublicPlatformSettings } = await import("@/lib/settings");
            const platformSettings = await getPublicPlatformSettings();
            
            // Get PlanType from order
            let planType = "TRADITIONAL";
            if (currentInv.orderId) {
              const order = await prisma.order.findUnique({ where: { id: currentInv.orderId }, select: { planType: true } });
              if (order) planType = order.planType;
            }

            const packageConfig = platformSettings.packages?.find(p => p.id === planType);
            const allowedCaps = packageConfig?.capabilities || [];
            const hasCap = (cap: string) => allowedCaps.includes(cap);

            // Force override if they try to enable features they don't have
            if (parsedFeatures.showLiveStream && !hasCap("livestream")) parsedFeatures.showLiveStream = false;
            if (parsedFeatures.showQrCheckin && !hasCap("qr_checkin")) parsedFeatures.showQrCheckin = false;
            if (parsedFeatures.showGuestMemories && !hasCap("guest_memories")) parsedFeatures.showGuestMemories = false;
          }

          mergedFeatureSettings = JSON.stringify(parsedFeatures);
        } catch {
          mergedFeatureSettings = toStr(body.featureSettings);
        }
      }
    }

    // --- THEME TIER GATING & PUBLISH LOCK: Server-side validation ---
    if (body.themeId !== undefined && body.themeId !== currentInv.themeId && !isAdmin) {
      // 1. Publish Lock Check
      if (currentInv.status === "PUBLISHED") {
        return NextResponse.json(
          { error: "Tema tidak dapat diubah setelah undangan diterbitkan (Published). Hubungi Admin jika ingin mengganti tema." },
          { status: 403 }
        );
      }

      // 2. Fetch the order's planType via the orderId stored on the invitation
      const order = currentInv.orderId
        ? await prisma.order.findUnique({
            where: { id: currentInv.orderId },
            select: { planType: true },
          })
        : null;

      if (order) {
        // Fetch the requested theme's category from DB
        const requestedTheme = await prisma.theme.findUnique({
          where: { id: body.themeId },
          select: { category: true, isActive: true },
        });

        if (!requestedTheme || !requestedTheme.isActive) {
          return NextResponse.json(
            { error: "Tema yang dipilih tidak tersedia." },
            { status: 400 }
          );
        }

        const themeCat = requestedTheme.category.toUpperCase();
        const plan = order.planType?.toUpperCase();

        // Tier rules: TRADITIONAL → only TRADITIONAL, MODERN → TRADITIONAL+MODERN, PREMIUM → all
        const isAllowed =
          plan === "PREMIUM" ||
          (plan === "MODERN" && (themeCat === "MODERN" || themeCat === "TRADITIONAL")) ||
          (plan === "TRADITIONAL" && themeCat === "TRADITIONAL");

        if (!isAllowed) {
          return NextResponse.json(
            {
              error: `Tema "${body.themeId}" tidak tersedia di paket Anda (${plan}). Silakan upgrade paket untuk mengakses tema ini.`,
            },
            { status: 403 }
          );
        }
      }
    }
    // --- END THEME TIER GATING ---

    const newStatus = body.status !== undefined ? body.status : currentInv.status;
    const isStatusChangedToUnpublished = currentInv.status === "PUBLISHED" && newStatus !== "PUBLISHED";
    const isSubdomainChanged = newSubdomain !== undefined && newSubdomain !== currentInv.subdomain && currentInv.status === "PUBLISHED";
    
    if (isStatusChangedToUnpublished || isSubdomainChanged) {
      try {
        const { deletePublishedHtml } = await import("@/lib/staticPublisher");
        await deletePublishedHtml(currentInv.id); // This cleans up old subdomain and fallback files
      } catch (e) {
        console.error("Failed to delete old static HTML during edit", e);
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
        staffPin: body.staffPin !== undefined ? body.staffPin : undefined,
      },
    });

    // --- ARSITEKTUR PIRING: Hapus piring draft lama jika tema berubah ---
    if (body.themeId !== undefined && body.themeId !== currentInv.themeId) {
      try {
        const fs = await import("fs");
        const path = await import("path");
        const draftPath = path.join(process.cwd(), "data", "drafts", `${id}.html`);
        if (fs.existsSync(draftPath)) {
          await fs.promises.unlink(draftPath);
        }
      } catch (err) {
        console.error("Failed to delete old draft plate:", err);
      }
    }

    // Save media updates
    if (body.media && typeof body.media === "object" && !Array.isArray(body.media)) {
      const VALID_ENUM_SLOTS = ["LANDING_COVER", "HOME_PHOTO", "DESKTOP_SIDEBAR", "GLOBAL_FIXED_BG", "GROOM_PHOTO", "BRIDE_PHOTO", "GALLERY", "CLOSING_COVER"];
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
          try {
            const { deleteFile } = await import("@/lib/storage");
            await deleteFile(existing.localPath);
          } catch (e) {
            console.error("Gagal menghapus file media:", e);
          }
          await prisma.invitationMedia.delete({
            where: { id: existing.id },
          });
        }
      }
    }

    // If invitation is PUBLISHED, auto-rebake standalone HTML file and sync R2
    if (updated.status === "PUBLISHED") {
      // Jalankan secara asinkron (background) agar klien tidak menunggu lama
      import("@/lib/storage").then(async ({ syncDraftToR2 }) => {
        try {
          const provider = process.env.STORAGE_PROVIDER || "local";
          if (provider === "r2" || provider === "s3") {
            await syncDraftToR2(updated.id);
          } else {
            const { buildAndSavePublishedHtml } = await import("@/lib/staticPublisher");
            await buildAndSavePublishedHtml(updated.id);
          }
        } catch (err) {
          console.error("Auto-bake / R2 Sync failed (background):", err);
        }
      });
    }

    return NextResponse.json({ ...updated, ...getInvitationLockStatus(updated) });
  } catch (err: any) {
    console.error("Error updating invitation:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
