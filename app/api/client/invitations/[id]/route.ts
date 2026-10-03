import { prisma } from "@/lib/prisma";
import { InvitationStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { encryptPin, decryptPin, isPinEncrypted } from "@/lib/pinEncryption";
import { isReservedSubdomain, isSubdomainExpired } from "@/lib/domainUtils";
import { DAY_MS, getPrimaryEventDate } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { getPlanMemoriesQuota } from "@/lib/settings";
import { VALID_MEDIA_SLOTS } from "@/lib/mediaSlots";
import { invalidateInvitationLookup } from "@/lib/cache";
import { safeExternalUrl, normalizeFeatureUrls } from "@/lib/safeUrl";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";
import { createPreviewToken } from "@/lib/previewAccess";
import { parseFeatureSettings, mergeClientFeatureSettings, gateFeaturesByPlan, SERVER_MANAGED_FEATURE_KEYS } from "@/lib/featureSettings";


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

  // 3. Hari acara utama (pada zona waktu acara) telah berlalu: terkunci permanen mulai awal hari berikutnya
  const eventDay = getPrimaryEventDate(inv.eventData);
  const hasPassed = eventDay !== null && Date.now() >= eventDay.getTime() + DAY_MS;

  if (hasPassed) {
    return {
      isLocked: true,
      isCoreLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "EVENT_DATE_PASSED",
    };
  }

  // 4. Check if PUBLISHED or EVENT_FINISHED: Studio editor locked pasca publikasi
  if (inv.status === "PUBLISHED" || inv.status === "EVENT_FINISHED") {
    return {
      isLocked: true,
      isCoreLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "PUBLISHED",
    };
  }

  // 5. Before Hari H & Draft: General fields editable, but core couple names & date are protected
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

    // Dekripsi staffPin untuk ditampilkan ke pemilik undangan
    let displayPin: string | null = null;
    if (invitation.staffPin) {
      displayPin = decryptPin(invitation.staffPin);
    }

    return NextResponse.json({
      ...invitation,
      staffPin: displayPin, // Tampilkan PIN plain-text (sudah di-decrypt) ke owner yang login
      previewToken: createPreviewToken(invitation.id),
      mediaMap,
      ...lockStatus,
      planMemoriesQuota: await getPlanMemoriesQuota(invitation.order?.planType),
    });
  } catch (err: any) {
    const msg = process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : (err.message || "Terjadi kesalahan server");
    return NextResponse.json({ error: msg }, { status: 500 });
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

    // ACTION: DEPLOY_AND_LOCK (Atomic Single Bake & Auto-Lock on Complete)
    if (body.action === "DEPLOY_AND_LOCK") {
      if (lockStatus.isLocked && !lockStatus.isEmergencyUnlocked && !isAdmin) {
        return NextResponse.json(
          { error: "Akses darurat tidak aktif. Hubungi Administrator untuk membuka kunci terlebih dahulu." },
          { status: 403 }
        );
      }

      try {
        const provider = process.env.STORAGE_PROVIDER || "local";
        if (provider === "r2" || provider === "s3") {
          const { syncDraftToR2 } = await import("@/lib/storage");
          await syncDraftToR2(currentInv.id);
        } else {
          const { buildAndSavePublishedHtml } = await import("@/lib/staticPublisher");
          await buildAndSavePublishedHtml(currentInv.id);
        }

        // Kunci kembali studio secara otomatis (hapus adminUnlockedUntil)
        const updated = await prisma.invitation.update({
          where: { id: currentInv.id },
          data: {
            adminUnlockedUntil: null,
          },
        });

        // Invalidate L1 memory lookup cache
        invalidateInvitationLookup(currentInv.invitationSlug, currentInv.subdomain);

        // Otomatis bersihkan (purge) edge cache Cloudflare untuk URL spesifik undangan ini (Anti-Stale Cache)
        try {
          const rootDomain = (await getDynamicServerRootDomain("")).split(":")[0].toLowerCase();
          const urlsToPurge: string[] = [];
          if (rootDomain && currentInv.subdomain) {
            urlsToPurge.push(`https://${currentInv.subdomain}.${rootDomain}/`);
          }
          if (rootDomain && currentInv.invitationSlug) {
            urlsToPurge.push(`https://${rootDomain}/${currentInv.invitationSlug}`);
          }
          if (currentInv.customDomain) {
            urlsToPurge.push(`https://${currentInv.customDomain}/`);
          }
          if (urlsToPurge.length > 0) {
            const { purgeCloudflareCache } = await import("@/lib/cloudflare");
            await purgeCloudflareCache({ files: urlsToPurge });
          }
        } catch (purgeErr: any) {
          console.warn("[DEPLOY_AND_LOCK] Auto purge Cloudflare failed (non-blocking):", purgeErr.message);
        }

        const newLockStatus = getInvitationLockStatus(updated);

        return NextResponse.json({
          success: true,
          message: "Undangan online berhasil diperbarui dan studio telah terkunci kembali.",
          ...updated,
          ...newLockStatus,
        });
      } catch (deployErr: any) {
        console.error("[DEPLOY_AND_LOCK Error]", deployErr);
        return NextResponse.json(
          { error: deployErr.message || "Gagal memperbarui undangan online." },
          { status: 500 }
        );
      }
    }

    // If completely locked, reject edit
    if (lockStatus.isLocked) {
      const errMsg = lockStatus.lockReason === "PUBLISHED"
        ? "Undangan ini telah diterbitkan dan studio terkunci. Silakan ajukan Buka Kunci Darurat kepada Administrator."
        : "Undangan ini telah terkunci permanen karena tanggal acara telah terlewati. Hubungi Administrator untuk membuka kunci darurat.";
      return NextResponse.json(
        { error: errMsg },
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

    let newSubdomain = body.subdomain !== undefined
      ? (body.subdomain && String(body.subdomain).trim()
          ? String(body.subdomain).trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
          : null)
      : undefined;

    if (newSubdomain === undefined && !currentInv.subdomain) {
      if (newGroomSlug && newBrideSlug) {
        newSubdomain = `${newGroomSlug}-${newBrideSlug}`;
      }
    }

    // --- BUG FIX: Check Subdomain Uniqueness & Reserved Subdomains ---
    if (newSubdomain && newSubdomain !== currentInv.subdomain) {
      if (isReservedSubdomain(newSubdomain)) {
        return NextResponse.json(
          { error: `Tautan/Subdomain "${newSubdomain}" dilindungi oleh sistem (seperti CDN/System) dan tidak dapat digunakan.` },
          { status: 400 }
        );
      }
      const existingSub = await prisma.invitation.findUnique({ where: { subdomain: newSubdomain } });
      if (existingSub && existingSub.id !== id) {
        const { subdomainGraceDays } = await getLifecycleSettings();
        if (isSubdomainExpired(existingSub.eventData, subdomainGraceDays)) {
          await prisma.invitation.update({
            where: { id: existingSub.id },
            data: { subdomain: null },
          });
        } else {
          return NextResponse.json(
            { error: `Tautan/Subdomain "${newSubdomain}" sudah digunakan oleh orang lain. Silakan ubah nama panggilan.` },
            { status: 400 }
          );
        }
      }
    }

    let mergedFeatureSettings: string | null | undefined = undefined;
    if (body.featureSettings !== undefined) {
      const existingObj = parseFeatureSettings(currentInv.featureSettings);
      if (body.featureSettings === null) {
        // Menghapus seluruh featureSettings juga menghapus add-on berbayar yang tersimpan di dalamnya.
        mergedFeatureSettings = isAdmin
          ? null
          : JSON.stringify(Object.fromEntries(SERVER_MANAGED_FEATURE_KEYS.filter((k) => k in existingObj).map((k) => [k, existingObj[k]])));
      } else {
        let incomingObj: Record<string, any>;
        try {
          incomingObj = typeof body.featureSettings === "object" ? body.featureSettings : JSON.parse(body.featureSettings || "{}");
        } catch {
          return NextResponse.json({ error: "featureSettings bukan JSON yang valid." }, { status: 400 });
        }
        if (!incomingObj || typeof incomingObj !== "object" || Array.isArray(incomingObj)) {
          return NextResponse.json({ error: "featureSettings harus berupa objek." }, { status: 400 });
        }

        let parsedFeatures = normalizeFeatureUrls(mergeClientFeatureSettings(existingObj, incomingObj, isAdmin));

        // Gating fitur per paket di sisi server: mencegah pembukaan fitur berbayar lewat API langsung.
        if (!isAdmin) {
          const order = currentInv.orderId
            ? await prisma.order.findUnique({ where: { id: currentInv.orderId }, select: { planType: true } })
            : null;
          parsedFeatures = await gateFeaturesByPlan(parsedFeatures, order?.planType);
        }

        mergedFeatureSettings = JSON.stringify(parsedFeatures);
      }
    }

    // --- THEME VALIDATION & PUBLISH LOCK: Server-side validation ---
    if (body.themeId !== undefined && body.themeId !== currentInv.themeId && !isAdmin) {
      // 1. Publish Lock Check
      if (currentInv.status === "PUBLISHED") {
        return NextResponse.json(
          { error: "Tema tidak dapat diubah setelah undangan diterbitkan (Published). Hubungi Admin jika ingin mengganti tema." },
          { status: 403 }
        );
      }

      // 2. All-Access Themes: Seluruh paket berhak memilih seluruh tema aktif
      const requestedTheme = await prisma.theme.findUnique({
        where: { id: body.themeId },
        select: { id: true, name: true, isActive: true, eventType: true },
      });

      if (!requestedTheme || !requestedTheme.isActive) {
        return NextResponse.json(
          { error: "Tema yang dipilih tidak tersedia atau sedang nonaktif." },
          { status: 400 }
        );
      }

      // 3. EventType Cross-Guard: Cegah memasang tema yang tidak cocok dengan tipe acara
      const currentEventType = (currentInv.eventType || "WEDDING").toUpperCase();
      const targetThemeEventType = (requestedTheme.eventType || "WEDDING").toUpperCase();
      if (targetThemeEventType !== currentEventType) {
        return NextResponse.json(
          { error: `Tema '${requestedTheme.name}' dirancang khusus untuk acara ${targetThemeEventType}, tidak cocok untuk undangan ${currentEventType} Anda.` },
          { status: 400 }
        );
      }
    }
    // --- END THEME VALIDATION ---

    // --- STATUS VALIDATION: nilai harus enum yang sah; klien hanya boleh DRAFT/PUBLISHED dan tidak dapat
    // mengubah status yang dikunci sistem/admin (TAKEN_DOWN, ARCHIVED, EVENT_FINISHED) ---
    if (body.status !== undefined) {
      const CLIENT_SETTABLE_STATUSES = ["DRAFT", "PUBLISHED"];
      if (!Object.values(InvitationStatus).includes(body.status)) {
        return NextResponse.json({ error: "Status undangan tidak valid." }, { status: 400 });
      }
      if (!isAdmin && body.status !== currentInv.status) {
        if (!CLIENT_SETTABLE_STATUSES.includes(body.status)) {
          return NextResponse.json({ error: "Status ini tidak dapat diatur oleh pemilik undangan." }, { status: 403 });
        }
        if (!CLIENT_SETTABLE_STATUSES.includes(currentInv.status)) {
          return NextResponse.json(
            { error: "Status undangan dikunci oleh sistem. Hubungi Administrator untuk membukanya." },
            { status: 403 }
          );
        }
      }
    }

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

    // --- EVENT DATA VALIDATION: Sesi Utama, Kunci Tanggal Pasca Publikasi, & Auto-Sort Kronologis ---
    let eventDataToSave = undefined;
    if (body.eventData !== undefined) {
      try {
        const incomingEvents = Array.isArray(body.eventData) ? body.eventData : JSON.parse(toStr(body.eventData) || "[]");
        let validatedEvents = incomingEvents.map((ev: any) => ({
          ...ev,
          title: typeof ev.title === "string" ? ev.title.trim() : (ev.title || ""),
          date: typeof ev.date === "string" ? ev.date.trim() : (ev.date || ""),
          time: typeof ev.time === "string" ? ev.time.trim() : (ev.time || ""),
          startTime: typeof ev.startTime === "string" ? ev.startTime.trim() : (ev.startTime || ""),
          endTime: typeof ev.endTime === "string" ? ev.endTime.trim() : (ev.endTime || ""),
          timezone: typeof ev.timezone === "string" ? ev.timezone.trim() : (ev.timezone || "WIB"),
          location: typeof ev.location === "string" ? ev.location.trim() : (ev.location || ""),
          address: typeof ev.address === "string" ? ev.address.trim() : (ev.address || ""),
          mapsUrl: safeExternalUrl(ev.mapsUrl),
          badge: typeof ev.badge === "string" ? ev.badge.trim() : (ev.badge || ""),
          notes: typeof ev.notes === "string" ? ev.notes.trim() : (ev.notes || ""),
          isUntilDone: Boolean(ev.isUntilDone),
          isPrimary: Boolean(ev.isPrimary),
        }));

        // Pastikan tepat satu sesi utama (isPrimary: true) jika list tidak kosong
        if (validatedEvents.length > 0) {
          const primaryCount = validatedEvents.filter((e: any) => e.isPrimary).length;
          if (primaryCount === 0) {
            validatedEvents[0].isPrimary = true;
          } else if (primaryCount > 1) {
            let foundFirst = false;
            validatedEvents.forEach((e: any) => {
              if (e.isPrimary) {
                if (!foundFirst) {
                  foundFirst = true;
                } else {
                  e.isPrimary = false;
                }
              }
            });
          }
        }

        // Kunci Tanggal Sesi Utama Pasca Publikasi (Hanya Admin yang dapat mengubah):
        if (currentInv.status === "PUBLISHED" && !isAdmin) {
          let savedEvents: any[] = [];
          try {
            savedEvents = typeof currentInv.eventData === "string"
              ? JSON.parse(currentInv.eventData || "[]")
              : (Array.isArray(currentInv.eventData) ? currentInv.eventData : []);
          } catch {}

          const savedPrimary = savedEvents.find((e: any) => e.isPrimary) || savedEvents[0];
          const newPrimary = validatedEvents.find((e: any) => e.isPrimary);

          if (savedPrimary?.date && newPrimary && newPrimary.date !== savedPrimary.date) {
            return NextResponse.json(
              {
                error: "Tanggal sesi acara utama telah dikunci pasca publikasi sebagai patokan masa aktif layanan. Hubungi Admin jika perlu penyesuaian tanggal acara utama.",
              },
              { status: 403 }
            );
          }
        }

        // Auto-Sort Kronologis: Tanggal (Ascending) -> Jam Mulai (Ascending)
        validatedEvents.sort((a: any, b: any) => {
          const dateA = a.date || "";
          const dateB = b.date || "";
          const cmp = dateA.localeCompare(dateB);
          if (cmp !== 0) return cmp;
          const timeA = a.startTime || a.time || "";
          const timeB = b.startTime || b.time || "";
          return timeA.localeCompare(timeB);
        });

        eventDataToSave = JSON.stringify(validatedEvents);
      } catch {
        // Data acara yang tidak dapat divalidasi tidak boleh disimpan mentah: kunci tanggal sesi utama dan sanitasi URL ada di blok ini.
        return NextResponse.json({ error: "Format eventData tidak valid." }, { status: 400 });
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
        groomFather: body.groomFather !== undefined ? body.groomFather : undefined,
        groomMother: body.groomMother !== undefined ? body.groomMother : undefined,
        brideParents: body.brideParents !== undefined ? body.brideParents : undefined,
        brideFather: body.brideFather !== undefined ? body.brideFather : undefined,
        brideMother: body.brideMother !== undefined ? body.brideMother : undefined,
        groomInstagram: body.groomInstagram !== undefined ? body.groomInstagram : undefined,
        brideInstagram: body.brideInstagram !== undefined ? body.brideInstagram : undefined,
        openingQuote: body.openingQuote !== undefined ? body.openingQuote : undefined,
        openingQuoteRef: body.openingQuoteRef !== undefined ? body.openingQuoteRef : undefined,
        themeId: body.themeId !== undefined ? body.themeId : undefined,
        subdomain: newSubdomain,
        musicUrl: body.musicUrl !== undefined ? safeExternalUrl(body.musicUrl) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        ...(body.status === "PUBLISHED" && currentInv.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
        loveStory: body.loveStory !== undefined ? toStr(body.loveStory) : undefined,
        dresscode: body.dresscode !== undefined ? body.dresscode : undefined,
        bankAccounts: body.bankAccounts !== undefined ? toStr(body.bankAccounts) : undefined,
        shippingAddress: body.shippingAddress !== undefined ? body.shippingAddress : undefined,
        liveStreamUrl: body.liveStreamUrl !== undefined ? safeExternalUrl(body.liveStreamUrl) : undefined,
        eventData: eventDataToSave,
        featureSettings: mergedFeatureSettings,
        participantsJson: body.participantsJson !== undefined
          ? (typeof body.participantsJson === "string" ? body.participantsJson : JSON.stringify(body.participantsJson))
          : undefined,
        // Enkripsi staffPin dengan AES-256 sebelum simpan ke database (cegah re-encrypt jika sudah terenkripsi)
        staffPin: body.staffPin !== undefined
          ? (body.staffPin
              ? (isPinEncrypted(String(body.staffPin)) ? String(body.staffPin) : encryptPin(String(body.staffPin)))
              : null)
          : undefined,

      },
    });

    // --- ARSITEKTUR PIRING: Hapus piring draft lama jika tema berubah ---
    if (body.themeId !== undefined && body.themeId !== currentInv.themeId) {
      try {
        const { promises: fs } = await import("fs");
        const path = await import("path");
        const draftPath = path.join(process.cwd(), "data", "drafts", `${id}.html`);
        await fs.unlink(draftPath).catch(() => {});
      } catch (err) {
        console.error("Failed to delete old draft plate:", err);
      }
    }

    // Save media updates
    if (body.media && typeof body.media === "object" && !Array.isArray(body.media)) {
      // Gunakan konstanta terpusat dari lib/mediaSlots.ts (Single Source of Truth)
      for (const [slot, url] of Object.entries(body.media)) {
        if (!(VALID_MEDIA_SLOTS as readonly string[]).includes(slot)) continue;
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

    // Hanya picu auto-rebake background jika ini adalah publikasi perdana (DRAFT -> PUBLISHED).
    // Untuk editan bertahap saat Kunci Darurat, kompilasi bake ditunda hingga klien menekan "Perbarui Undangan Online" (DEPLOY_AND_LOCK)
    const isInitialPublish = currentInv.status !== "PUBLISHED" && updated.status === "PUBLISHED";
    if (isInitialPublish) {
      import("@/lib/storage").then(async ({ syncDraftToR2 }) => {
        try {
          const provider = process.env.STORAGE_PROVIDER || "local";
          if (provider === "r2" || provider === "s3") {
            await syncDraftToR2(updated.id);
          } else {
            const { buildAndSavePublishedHtml } = await import("@/lib/staticPublisher");
            await buildAndSavePublishedHtml(updated.id);
          }

          // Bersihkan cache jika subdomain sebelumnya sempat diakses sebelum rilis
          const rootDomain = (await getDynamicServerRootDomain("")).split(":")[0].toLowerCase();
          const urlsToPurge: string[] = [];
          if (rootDomain && updated.subdomain) urlsToPurge.push(`https://${updated.subdomain}.${rootDomain}/`);
          if (rootDomain && updated.invitationSlug) urlsToPurge.push(`https://${rootDomain}/${updated.invitationSlug}`);
          if (urlsToPurge.length > 0) {
            const { purgeCloudflareCache } = await import("@/lib/cloudflare");
            await purgeCloudflareCache({ files: urlsToPurge });
          }
        } catch (err) {
          console.error("Initial publish auto-bake / R2 Sync failed (background):", err);
        }
      });
    }

    // Dekripsi staffPin agar frontend selalu menerima PIN plain-text asli
    const displayPin = updated.staffPin ? decryptPin(updated.staffPin) : null;

    return NextResponse.json({
      ...updated,
      staffPin: displayPin,
      ...getInvitationLockStatus(updated),
    });
  } catch (err: any) {
    console.error("Error updating invitation:", err);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal memperbarui undangan." : err.message }, { status: 500 });
  }
}

export async function PATCH(
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
    if (!id) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan." }, { status: 400 });
    }

    const body = await req.json();
    const currentInv = await prisma.invitation.findUnique({ where: { id } });
    if (!currentInv) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = currentInv.userId === session.user.id;
    const isAdmin = (session.user as any).isAdmin === true || (session.user as any).role === "SUPER_ADMIN" || (session.user as any).role === "ADMIN";

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki hak mengedit undangan ini." }, { status: 403 });
    }

    let updateData: any = {};

    if (body.featureSettings !== undefined) {
      const existingObj = parseFeatureSettings(currentInv.featureSettings);
      let incomingObj: Record<string, any>;
      try {
        incomingObj = typeof body.featureSettings === "object" ? body.featureSettings : JSON.parse(body.featureSettings || "{}");
      } catch {
        return NextResponse.json({ error: "featureSettings bukan JSON yang valid." }, { status: 400 });
      }
      if (!incomingObj || typeof incomingObj !== "object" || Array.isArray(incomingObj)) {
        return NextResponse.json({ error: "featureSettings harus berupa objek." }, { status: 400 });
      }

      let parsedFeatures = normalizeFeatureUrls(mergeClientFeatureSettings(existingObj, incomingObj, isAdmin));

      if (!isAdmin) {
        const order = currentInv.orderId
          ? await prisma.order.findUnique({ where: { id: currentInv.orderId }, select: { planType: true } })
          : null;
        parsedFeatures = await gateFeaturesByPlan(parsedFeatures, order?.planType);
      }

      if (parsedFeatures.memoriesShotsQuota !== undefined) {
        const sq = Number(parsedFeatures.memoriesShotsQuota);
        if (!isNaN(sq) && sq >= 1 && sq <= 30) {
          parsedFeatures.memoriesShotsQuota = sq;
        }
      }

      updateData.featureSettings = JSON.stringify(parsedFeatures);
    }

    if (body.participantsJson !== undefined) {
      // Nama peserta acara adalah data inti yang dikunci setelah publikasi, sama seperti groomName/brideName pada PUT.
      const lock = getInvitationLockStatus(currentInv);
      if (!isAdmin && lock.isCoreLocked && !lock.isEmergencyUnlocked) {
        return NextResponse.json({ error: "Data peserta acara terkunci. Hubungi Administrator untuk membuka kunci darurat." }, { status: 403 });
      }
      updateData.participantsJson = typeof body.participantsJson === "string"
        ? body.participantsJson
        : JSON.stringify(body.participantsJson);
    }

    const updated = await prisma.invitation.update({
      where: { id },
      data: updateData,
      include: {
        order: { select: { planType: true } },
        media: true,
      },
    });

    // Invalidate L1 memory lookup cache
    invalidateInvitationLookup(updated.invitationSlug, updated.subdomain);

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil diperbarui.",
      invitation: updated,
      ...updated,
    });
  } catch (err: any) {
    console.error("Error patching invitation:", err);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal memperbarui pengaturan undangan." : err.message }, { status: 500 });
  }
}

