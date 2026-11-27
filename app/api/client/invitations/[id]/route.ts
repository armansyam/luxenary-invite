import { prisma } from "@/lib/prisma";
import { EventType, InvitationStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { normalizeJsonInput } from "@/lib/jsonText";
import { participantNames } from "@/lib/participantUtils";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { deleteInvitationDraft } from "@/lib/invitationDraft";
import { encryptPin, decryptPin } from "@/lib/pinEncryption";
import { DEFAULT_THEME_BY_EVENT, EVENT_TYPES, STAFF_PIN_PATTERN, isThemeInMode, resolveSubEventMeta, sanitizeSubEvent, selectableEventTypes } from "@/lib/invitationUtils";
import { isReservedSubdomain, isSubdomainExpired } from "@/lib/domainUtils";
import { DAY_MS, getPrimaryEventDate, getPrimaryEventDateString, isClockTimeInput, normalizeEventDateInput } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { getAdminSetting, getEnabledEventTypes, getPlanMemoriesQuota } from "@/lib/settings";
import { VALID_MEDIA_SLOTS } from "@/lib/mediaSlots";
import { invalidateInvitationLookup } from "@/lib/cache";
import { safeExternalUrl, safeMediaUrl } from "@/lib/safeUrl";
import { deleteFile, isInvitationOwnedUpload } from "@/lib/storage";
import { purgeInvitationEdgeCache } from "@/lib/cloudflare";
import { releaseInvitationSubdomain } from "@/lib/subdomainRelease";
import { createPreviewToken } from "@/lib/previewAccess";
import { mergeFeatureSettingsInput, parseFeatureSettings } from "@/lib/featureSettings";
import { featureSettingsForThemeChange, loadThemeLabelContext } from "@/lib/themeLabels";
import { copyMasterToDraft, seedRenderedLabels } from "@/lib/renderedLabels";
import { loadThemeMediaSnapshot } from "@/lib/themeDefaultMedia";
import { loadThemeArtPreview } from "@/lib/themeArtPreview";
import { themeMainColor } from "@/lib/themePalette";
import { buildCanonicalSlugForActivatedDraft, isPlaceholderFreeDraftSlug } from "@/lib/freeDraftActivation";


export function getInvitationLockStatus(inv: any) {
  // 1. Check if Admin Emergency Unlock is actively running
  if (inv.adminUnlockedUntil && new Date(inv.adminUnlockedUntil) > new Date()) {
    return {
      isLocked: false,
      isEmergencyUnlocked: true,
      unlockExpiresAt: inv.adminUnlockedUntil,
      lockReason: null,
    };
  }

  // 2. Check if explicitly marked as permanently locked
  if (inv.isLockedPermanently) {
    return {
      isLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "LOCKED_PERMANENT",
    };
  }

  // 3. Hari acara utama (pada zona waktu acara) telah berlalu: terkunci permanen mulai awal hari berikutnya.
  // Draf dikecualikan: belum pernah dilihat tamu, dan klien harus bisa memperbaiki tanggal yang salah ketik.
  const eventDay = getPrimaryEventDate(inv.eventData);
  const hasPassed = eventDay !== null && Date.now() >= eventDay.getTime() + DAY_MS;

  if (hasPassed && inv.status !== "DRAFT") {
    return {
      isLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "EVENT_DATE_PASSED",
    };
  }

  // 4. Check if PUBLISHED or EVENT_FINISHED: Studio editor locked pasca publikasi
  if (inv.status === "PUBLISHED" || inv.status === "EVENT_FINISHED") {
    return {
      isLocked: true,
      isEmergencyUnlocked: false,
      unlockExpiresAt: null,
      lockReason: "PUBLISHED",
    };
  }

  // 5. Draf sebelum hari acara: seluruh isian, termasuk nama peserta, masih dapat diperbaiki.
  return {
    isLocked: false,
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
    const isAdmin = hasAdminPermission(session.user, "invitations");

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
      themeMainColor: await themeMainColor(invitation.id),
      themeArtPreview: await loadThemeArtPreview(invitation.themeId),
      mediaMap,
      ...lockStatus,
      planMemoriesQuota: await getPlanMemoriesQuota(invitation.order?.planType),
    });
  } catch (err) {
    return routeError("ClientInvitation", err, "Gagal memuat undangan.");
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
    const body = (await readJsonBody(req)) ?? {};

    const currentInv = await prisma.invitation.findUnique({ where: { id }, include: { order: { select: { planType: true } } } });
    if (!currentInv) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = currentInv.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki hak mengedit undangan ini." }, { status: 403 });
    }

    const lockStatus = getInvitationLockStatus(currentInv);

    // ACTION: DEPLOY_AND_LOCK (Atomic Single Bake & Auto-Lock on Complete)
    if (body.action === "DEPLOY_AND_LOCK") {
      if (currentInv.isFreeDraft && !isAdmin) {
        return NextResponse.json(
          {
            error: "Draf gratis tidak dapat dipublikasikan sebelum paket diaktifkan. Silakan pilih paket terlebih dahulu.",
            code: "FREE_DRAFT_PAYMENT_REQUIRED",
          },
          { status: 402 }
        );
      }
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

        try {
          await purgeInvitationEdgeCache(currentInv);
        } catch (purgeErr) {
          logger.warn("DeployAndLock", "Purge cache Cloudflare gagal; perubahan tetap tersimpan", { invitationId: id, error: purgeErr instanceof Error ? purgeErr.message : String(purgeErr) });
        }

        const newLockStatus = getInvitationLockStatus(updated);

        return NextResponse.json({
          success: true,
          message: "Undangan online berhasil diperbarui dan studio telah terkunci kembali.",
          ...updated,
          ...newLockStatus,
        });
      } catch (deployErr) {
        return routeError("DeployAndLock", deployErr, "Gagal memperbarui undangan online.");
      }
    }

    // ACTION: CHANGE_SUB_EVENT — ganti label/jenis sub-acara dinamis (preset maupun tulis sendiri, mis. "Tamatan Ngaji" / "Corporate")
    // untuk kategori Personal & Keluarga (PERSONAL) maupun Acara & Event Umum (EVENT) selama status masih DRAFT.
    // Tema dan data peserta yang sudah diketik klien tetap utuh.
    if (body.action === "CHANGE_SUB_EVENT") {
      if (currentInv.eventType === "WEDDING") {
        return NextResponse.json(
          { error: "Pergantian sub-acara hanya tersedia untuk kategori Personal & Keluarga atau Acara & Event Umum.", code: "WEDDING_NO_SUB_EVENT" },
          { status: 400 },
        );
      }
      if (currentInv.status !== "DRAFT" && !lockStatus.isEmergencyUnlocked && !isAdmin) {
        return NextResponse.json(
          { error: "Sub-acara tidak dapat diubah setelah undangan diterbitkan.", code: "EVENT_TYPE_LOCKED" },
          { status: 403 },
        );
      }

      const nextSubEvent = sanitizeSubEvent(body.subEvent);
      if ((nextSubEvent ?? null) === (currentInv.subEvent ?? null)) {
        return NextResponse.json({ success: true, unchanged: true, invitation: currentInv });
      }

      const subMeta = resolveSubEventMeta(currentInv.eventType, nextSubEvent);
      const currentFs = parseFeatureSettings(currentInv.featureSettings);
      // Pertahankan label hasil suntingan klien dan status sakelar showStory; hanya label yang masih default ikut sub-acara baru.
      const reconciled = (await featureSettingsForThemeChange(
        currentFs,
        currentInv.themeId,
        currentInv.themeId,
        currentInv.eventType,
        nextSubEvent,
      )) as Record<string, unknown>;
      const nextFs: Record<string, unknown> = {
        ...reconciled,
        showStory: currentFs.showStory !== undefined ? currentFs.showStory : true,
      };

      const updated = await prisma.invitation.update({
        where: { id },
        data: {
          subEvent: nextSubEvent,
          openingQuote: subMeta.defaultQuote,
          openingQuoteRef: subMeta.defaultQuoteRef,
          featureSettings: nextFs as Prisma.InputJsonValue,
        },
      });

      await deleteInvitationDraft(id);
      invalidateInvitationLookup(updated.invitationSlug, updated.subdomain, updated.id);
      await seedRenderedLabels(id);

      return NextResponse.json({
        success: true,
        message: nextSubEvent ? `Sub-acara berhasil diubah menjadi "${nextSubEvent}".` : "Label sub-acara berhasil direset.",
        invitation: updated,
      });
    }

    // ACTION: CHANGE_INVITATION_MODE (mengganti mode acara & sub-acara selama undangan masih berstatus DRAFT)
    if (body.action === "CHANGE_INVITATION_MODE") {
      if (currentInv.status !== "DRAFT" && !lockStatus.isEmergencyUnlocked && !isAdmin) {
        return NextResponse.json(
          {
            error: "Mode / kategori acara tidak dapat diubah setelah undangan diterbitkan.",
            code: "EVENT_TYPE_LOCKED",
          },
          { status: 403 }
        );
      }

      const rawEvent = typeof body.eventType === "string" ? body.eventType.trim().toUpperCase() : "";
      if (!(EVENT_TYPES as readonly string[]).includes(rawEvent)) {
        return NextResponse.json({ error: "Jenis acara tidak valid." }, { status: 400 });
      }
      const nextEventType = rawEvent as EventType;
      const nextSubEvent = nextEventType === "WEDDING" ? null : sanitizeSubEvent(body.subEvent);

      const [enabledTypes, activeThemes] = await Promise.all([
        getEnabledEventTypes(),
        prisma.theme.findMany({
          where: { isActive: true },
          select: { id: true, eventType: true },
          orderBy: { sortOrder: "asc" },
        }),
      ]);
      const selectableTypes = selectableEventTypes(
        enabledTypes,
        activeThemes.map((t) => t.eventType),
      );
      if (!enabledTypes.includes(nextEventType) || !selectableTypes.includes(nextEventType)) {
        return NextResponse.json({ error: "Jenis acara ini belum tersedia." }, { status: 400 });
      }

      const requestedThemeId = typeof body.themeId === "string" && body.themeId.trim()
        ? body.themeId.trim().toLowerCase()
        : null;
      let validRequestedThemeId: string | null = null;
      if (requestedThemeId) {
        const reqTheme = activeThemes.find((t) => t.id.toLowerCase() === requestedThemeId);
        if (!reqTheme || !isThemeInMode(reqTheme.eventType, nextEventType)) {
          return NextResponse.json(
            { error: "Tema pilihan tidak aktif atau berasal dari mode undangan yang berbeda." },
            { status: 400 },
          );
        }
        validRequestedThemeId = reqTheme.id;
      }

      const isEventChanged = nextEventType !== currentInv.eventType;
      const isSubEventChanged =
        body.subEvent !== undefined && (nextSubEvent ?? null) !== (currentInv.subEvent ?? null);
      const effectiveSubEvent = isEventChanged
        ? nextSubEvent
        : (body.subEvent !== undefined ? nextSubEvent : currentInv.subEvent);

      if (
        !isEventChanged &&
        !isSubEventChanged &&
        (!validRequestedThemeId || validRequestedThemeId.toLowerCase() === currentInv.themeId?.toLowerCase())
      ) {
        return NextResponse.json({ success: true, unchanged: true, invitation: currentInv });
      }

      // Pertahankan tema saat ini hanya bila masih dalam mode yang sama.
      const currentActiveTheme = activeThemes.find((t) => t.id.toLowerCase() === (currentInv.themeId || "").toLowerCase());
      const preserveCurrentTheme =
        !validRequestedThemeId && currentActiveTheme && isThemeInMode(currentActiveTheme.eventType, nextEventType)
          ? currentActiveTheme.id
          : null;

      const preferredId =
        nextEventType === "WEDDING"
          ? DEFAULT_THEME_BY_EVENT.WEDDING
          : (effectiveSubEvent ? resolveSubEventMeta(nextEventType, effectiveSubEvent).demoFallbackThemeId : DEFAULT_THEME_BY_EVENT[nextEventType]);
      const chosenTheme =
        validRequestedThemeId ||
        preserveCurrentTheme ||
        activeThemes.find((t) => t.id === preferredId && isThemeInMode(t.eventType, nextEventType))?.id ||
        activeThemes.find((t) => t.eventType === nextEventType)?.id ||
        activeThemes.find((t) => isThemeInMode(t.eventType, nextEventType))?.id;

      if (!chosenTheme) {
        return NextResponse.json({ error: "Belum ada tema aktif untuk jenis acara ini." }, { status: 503 });
      }

      const currentFs = parseFeatureSettings(currentInv.featureSettings);
      const snapshot = await loadThemeMediaSnapshot(chosenTheme);

      let nextFs: Record<string, unknown>;
      let nextOpeningQuote: string | undefined;
      let nextOpeningQuoteRef: string | undefined;

      if (isEventChanged || isSubEventChanged) {
        const { defaultCoverBadge, blueprint, initialCustomLabels } = await loadThemeLabelContext(chosenTheme, nextEventType, effectiveSubEvent);
        const subMeta = nextEventType === "WEDDING" ? null : resolveSubEventMeta(nextEventType, effectiveSubEvent);
        nextFs = {
          ...currentFs,
          weddingTagline: defaultCoverBadge,
          showStory: currentFs.showStory !== undefined ? currentFs.showStory : true,
          customLabels: initialCustomLabels,
          labelDefaults: initialCustomLabels,
        };
        nextOpeningQuote = subMeta ? subMeta.defaultQuote : blueprint.openingQuote;
        nextOpeningQuoteRef = subMeta ? subMeta.defaultQuoteRef : blueprint.openingQuoteRef;
      } else {
        // Kategori & sub-acara tetap, hanya ganti tema pada Draf Gratis: pertahankan label dan kutipan yang sudah diedit klien.
        nextFs = (await featureSettingsForThemeChange(
          currentFs,
          currentInv.themeId,
          chosenTheme,
          nextEventType,
          effectiveSubEvent,
        )) as Record<string, unknown>;
      }

      // Migrasi nama peserta saat berpindah kategori draf agar isian klien tidak hilang begitu saja.
      let migratedParticipants: Prisma.InputJsonValue | undefined = undefined;
      if (isEventChanged) {
        const prevNames = participantNames(currentInv.eventType, currentInv.participantsJson);
        const prevPrimary = prevNames.first || prevNames.full;
        if (prevPrimary) {
          if (nextEventType === "EVENT") {
            migratedParticipants = { event: { title: prevNames.full || prevPrimary } };
          } else if (nextEventType === "PERSONAL") {
            migratedParticipants = { person: { name: prevNames.full || prevPrimary, nickname: prevPrimary } };
          } else {
            migratedParticipants = {
              groom: { name: prevNames.full || prevPrimary, nickname: prevPrimary },
              ...(prevNames.second ? { bride: { name: prevNames.second, nickname: prevNames.second } } : {}),
            };
          }
        } else {
          migratedParticipants = {};
        }
      }

      const updated = await prisma.invitation.update({
        where: { id },
        data: {
          eventType: nextEventType,
          subEvent: effectiveSubEvent,
          themeId: chosenTheme,
          ...(isEventChanged
            ? {
                participantsJson: migratedParticipants ?? ({} as Prisma.InputJsonValue),
                openingQuote: nextOpeningQuote,
                openingQuoteRef: nextOpeningQuoteRef,
              }
            : isSubEventChanged
            ? {
                openingQuote: nextOpeningQuote,
                openingQuoteRef: nextOpeningQuoteRef,
              }
            : {}),
          featureSettings: nextFs as Prisma.InputJsonValue,
          themeDefaultMedia: snapshot.themeDefaultMedia,
          themeMediaSlots: snapshot.themeMediaSlots
            ? (snapshot.themeMediaSlots as Prisma.InputJsonValue)
            : Prisma.DbNull,
        },
      });

      // Migrasi slot foto profil utama (GROOM_PHOTO <-> PROFILE_PHOTO <-> EVENT_PHOTO) bila slot tujuan masih kosong.
      if (isEventChanged) {
        const slotOf = (ev: string) =>
          ev === "PERSONAL" ? "PROFILE_PHOTO" : ev === "EVENT" ? "EVENT_PHOTO" : "GROOM_PHOTO";
        const fromSlot = slotOf(currentInv.eventType);
        const toSlot = slotOf(nextEventType);
        if (fromSlot !== toSlot) {
          const [sourcePhoto, existingTarget] = await Promise.all([
            prisma.invitationMedia.findFirst({ where: { invitationId: id, mediaSlot: fromSlot as any } }),
            prisma.invitationMedia.findFirst({ where: { invitationId: id, mediaSlot: toSlot as any }, select: { id: true } }),
          ]);
          if (sourcePhoto && !existingTarget) {
            await prisma.invitationMedia.update({
              where: { id: sourcePhoto.id },
              data: { mediaSlot: toSlot as any },
            });
          }
        }
      }

      await deleteInvitationDraft(id);
      invalidateInvitationLookup(updated.invitationSlug, updated.subdomain, updated.id);
      if (nextEventType === "WEDDING") await copyMasterToDraft(id);
      else await seedRenderedLabels(id);

      return NextResponse.json({
        success: true,
        message: "Mode acara berhasil diubah.",
        invitation: updated,
      });
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

    // Label DNS: huruf kecil, angka, tanda hubung di tengah, maksimal 63 karakter; hasil kosong berarti tanpa subdomain.
    let newSubdomain = body.subdomain !== undefined
      ? String(body.subdomain ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").replace(/^-+|-+$/g, "").slice(0, 63) || null
      : undefined;

    // Draf gratis tidak boleh mengklaim/menyandera subdomain unik sebelum paket diaktifkan.
    if (currentInv.isFreeDraft && !isAdmin) {
      if (newSubdomain) {
        return NextResponse.json(
          {
            error: "Subdomain eksklusif hanya dapat diklaim setelah paket diaktifkan.",
            code: "FREE_DRAFT_SUBDOMAIN_BLOCKED",
          },
          { status: 403 }
        );
      }
      newSubdomain = undefined;
    }

    // Batas yang sama dengan /api/client/subdomain/check.
    if (newSubdomain && newSubdomain.length < 3) {
      return NextResponse.json({ error: "Subdomain minimal terdiri dari 3 karakter." }, { status: 400 });
    }

    // Undangan pernikahan tanpa subdomain mendapat subdomain dari nama panggilan mempelai saat studio menyimpan peserta.
    // Subdomain turunan ini tidak diminta klien, jadi bentrok atau nama sistem tidak boleh menggagalkan penyimpanan nama:
    // nama sistem dilewati, nama yang sudah dipakai diberi akhiran seperti pada wizard pembuatan undangan.
    if (!currentInv.isFreeDraft && newSubdomain === undefined && !currentInv.subdomain && currentInv.eventType === "WEDDING" && body.participantsJson !== undefined) {
      const { first, second } = participantNames("WEDDING", body.participantsJson);
      const groomPart = first.toLowerCase().replace(/[^a-z0-9]/g, "");
      const bridePart = second.toLowerCase().replace(/[^a-z0-9]/g, "");
      const derived = groomPart && bridePart ? `${groomPart}-${bridePart}` : "";
      if (derived && !isReservedSubdomain(derived)) {
        const holder = await prisma.invitation.findUnique({ where: { subdomain: derived }, select: { id: true } });
        newSubdomain = holder && holder.id !== id ? `${derived}-${Date.now().toString(36).slice(-4)}` : derived;
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
        const { subdomainGraceDays, autoRecycleSubdomain } = await getLifecycleSettings();
        if (autoRecycleSubdomain && isSubdomainExpired(existingSub.eventData, subdomainGraceDays)) {
          await releaseInvitationSubdomain(existingSub);
        } else {
          return NextResponse.json(
            { error: `Tautan/Subdomain "${newSubdomain}" sudah digunakan oleh orang lain. Silakan ubah nama panggilan.` },
            { status: 400 }
          );
        }
      }
    }

    let mergedFeatureSettings: Prisma.InputJsonValue | typeof Prisma.DbNull | undefined = undefined;
    if (body.featureSettings === null) {
      mergedFeatureSettings = Prisma.DbNull;
    } else if (body.featureSettings !== undefined) {
      const merged = await mergeFeatureSettingsInput(currentInv.featureSettings, body.featureSettings, currentInv.order?.planType, isAdmin);
      if (!merged.ok) return NextResponse.json({ error: merged.error }, { status: 400 });
      mergedFeatureSettings = merged.value;
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

      // 2. Isolasi 3 Kategori Tegas: tema wajib aktif dan berada pada kategori undangan yang sama.
      const cleanReqId = String(body.themeId || "").trim().toLowerCase();
      const requestedTheme = await prisma.theme.findUnique({
        where: { id: cleanReqId },
        select: { id: true, name: true, isActive: true, eventType: true },
      });

      if (!requestedTheme || !requestedTheme.isActive) {
        return NextResponse.json(
          { error: "Tema yang dipilih tidak tersedia atau sedang nonaktif." },
          { status: 400 }
        );
      }

      if (!isThemeInMode(requestedTheme.eventType, currentInv.eventType)) {
        return NextResponse.json(
          { error: `Tema '${requestedTheme.name}' berasal dari mode undangan yang berbeda dan tidak dapat dipakai pada undangan ini.` },
          { status: 400 }
        );
      }
      body.themeId = requestedTheme.id;
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
      if (!isAdmin && body.status === "PUBLISHED" && currentInv.isFreeDraft) {
        return NextResponse.json(
          {
            error: "Draf gratis tidak dapat dipublikasikan sebelum paket diaktifkan. Silakan pilih paket terlebih dahulu.",
            code: "FREE_DRAFT_PAYMENT_REQUIRED",
          },
          { status: 402 }
        );
      }
      if (!isAdmin && body.status === "PUBLISHED" && currentInv.status !== "PUBLISHED") {
        const nextEventDay = getPrimaryEventDate(body.eventData !== undefined ? body.eventData : currentInv.eventData);
        // Jadwal terima tamu adalah patokan seluruh masa aktif; tanpa itu undangan tidak pernah kedaluwarsa.
        if (nextEventDay === null) {
          return NextResponse.json(
            { error: "Tanggal jadwal terima tamu belum diisi. Lengkapi tanggal sesi yang ditandai Jadwal Terima Tamu sebelum menerbitkan undangan." },
            { status: 400 }
          );
        }
        if (Date.now() >= nextEventDay.getTime() + DAY_MS) {
          return NextResponse.json(
            { error: "Tanggal acara utama sudah lewat. Perbaiki tanggal acara sebelum menerbitkan undangan." },
            { status: 400 }
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
        logger.error("ClientInvitation", "HTML statis lama gagal dihapus saat penyuntingan", e, { invitationId: currentInv.id });
      }
      await purgeInvitationEdgeCache(currentInv);
    }

    // --- EVENT DATA VALIDATION: Sesi Utama, Kunci Tanggal Pasca Publikasi, & Auto-Sort Kronologis ---
    let eventDataToSave = undefined;
    if (body.eventData !== undefined) {
      try {
        const incomingEvents = typeof body.eventData === "string" ? JSON.parse(body.eventData || "[]") : body.eventData;
        if (!Array.isArray(incomingEvents)) throw new Error("eventData bukan daftar sesi");
        for (const ev of incomingEvents) {
          if (normalizeEventDateInput(ev?.date) === null) {
            return NextResponse.json({ error: "Tanggal acara harus berupa tanggal nyata berformat TTTT-BB-HH." }, { status: 400 });
          }
          if (!isClockTimeInput(ev?.startTime) || !isClockTimeInput(ev?.endTime)) {
            return NextResponse.json({ error: "Jam mulai dan jam selesai harus berformat JJ:MM." }, { status: 400 });
          }
        }
        let validatedEvents = incomingEvents.map((ev: any) => ({
          ...ev,
          title: typeof ev.title === "string" ? ev.title.trim() : (ev.title || ""),
          date: normalizeEventDateInput(ev.date) ?? "",
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
          const savedPrimaryDate = getPrimaryEventDateString(currentInv.eventData);
          const newPrimary = validatedEvents.find((e: any) => e.isPrimary);

          if (savedPrimaryDate && (!newPrimary || newPrimary.date !== savedPrimaryDate)) {
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

        eventDataToSave = validatedEvents;
      } catch {
        // Data acara yang tidak dapat divalidasi tidak boleh disimpan mentah: kunci tanggal sesi utama dan sanitasi URL ada di blok ini.
        return NextResponse.json({ error: "Format eventData tidak valid." }, { status: 400 });
      }
    }

    const jsonFields: Partial<Record<"loveStory" | "bankAccounts" | "participantsJson", Prisma.InputJsonValue | typeof Prisma.DbNull>> = {};
    for (const [field, shape] of [["loveStory", "array"], ["bankAccounts", "array"], ["participantsJson", "object"]] as const) {
      if (body[field] === undefined) continue;
      const parsed = normalizeJsonInput(body[field], shape);
      if (!parsed.ok) {
        return NextResponse.json({ error: `${field} harus berupa ${shape === "array" ? "daftar" : "objek"} JSON yang valid.` }, { status: 400 });
      }
      jsonFields[field] = parsed.value;
    }

    if (body.media && typeof body.media === "object" && !Array.isArray(body.media)) {
      for (const [slot, url] of Object.entries(body.media)) {
        if (typeof url === "string" && url.trim() && !safeMediaUrl(url)) {
          return NextResponse.json({ error: `URL media ${slot} tidak valid.` }, { status: 400 });
        }
      }

      if (currentInv.isFreeDraft && !isAdmin) {
        const existingMedia = await prisma.invitationMedia.findMany({
          where: { invitationId: id },
          select: { id: true, mediaSlot: true },
        });
        const nonGallerySlots = new Set<string>(
          existingMedia.filter((m) => m.mediaSlot !== "GALLERY").map((m) => m.mediaSlot),
        );
        let projectedGalleryCount = existingMedia.filter((m) => m.mediaSlot === "GALLERY").length;
        for (const [slot, url] of Object.entries(body.media)) {
          if (!(VALID_MEDIA_SLOTS as readonly string[]).includes(slot)) continue;
          if (slot === "GALLERY") {
            if (safeMediaUrl(url) && projectedGalleryCount === 0) projectedGalleryCount = 1;
            else if (!safeMediaUrl(url) && projectedGalleryCount > 0) projectedGalleryCount = Math.max(0, projectedGalleryCount - 1);
          } else if (safeMediaUrl(url)) {
            nonGallerySlots.add(slot);
          } else {
            nonGallerySlots.delete(slot);
          }
        }
        const parsedMaxPhotos = Number.parseInt(await getAdminSetting("free_draft_max_photos", "3"), 10);
        const maxFreeDraftPhotos = Number.isFinite(parsedMaxPhotos) && parsedMaxPhotos >= 1 ? parsedMaxPhotos : 3;
        if (nonGallerySlots.size + projectedGalleryCount > maxFreeDraftPhotos) {
          return NextResponse.json(
            {
              error: `Draf gratis dibatasi maksimal ${maxFreeDraftPhotos} foto. Aktifkan paket untuk mengunggah lebih banyak foto.`,
              code: "FREE_DRAFT_PHOTO_LIMIT",
            },
            { status: 403 }
          );
        }
      }
    }

    if (currentInv.isFreeDraft && !isAdmin && mergedFeatureSettings && typeof mergedFeatureSettings === "object") {
      const fsObj = mergedFeatureSettings as Record<string, unknown>;
      if (typeof fsObj.galleryDriveFolderUrl === "string" && fsObj.galleryDriveFolderUrl.trim()) {
        return NextResponse.json(
          {
            error: "Galeri Google Drive hanya tersedia setelah paket diaktifkan.",
            code: "FREE_DRAFT_MEDIA_BLOCKED",
          },
          { status: 403 }
        );
      }
    }

    // PIN membuka portal resepsionis; batas percobaan verify-pin (30 per 15 menit) hanya berarti bila ruang tebakannya cukup besar.
    if (currentInv.isFreeDraft && !isAdmin && body.staffPin !== undefined && String(body.staffPin).trim()) {
      return NextResponse.json(
        {
          error: "PIN Panitia & Portal Resepsionis hanya tersedia setelah paket diaktifkan.",
          code: "FREE_DRAFT_STAFF_PIN_BLOCKED",
        },
        { status: 403 },
      );
    }
    if (body.staffPin && !STAFF_PIN_PATTERN.test(String(body.staffPin))) {
      return NextResponse.json({ error: "PIN harus 4–10 karakter berupa huruf atau angka." }, { status: 400 });
    }

    // Ganti tema: label yang belum pernah diubah klien mengikuti tema baru (hasil edit klien dipertahankan).
    const nextSubEventOnPut =
      body.subEvent !== undefined && currentInv.eventType !== "WEDDING"
        ? sanitizeSubEvent(body.subEvent)
        : undefined;
    const effectiveSubEventOnPut = nextSubEventOnPut !== undefined ? nextSubEventOnPut : currentInv.subEvent;
    const themeChanged = body.themeId !== undefined && body.themeId !== currentInv.themeId;
    if (themeChanged) {
      const base = mergedFeatureSettings === undefined || mergedFeatureSettings === Prisma.DbNull ? currentInv.featureSettings : mergedFeatureSettings;
      mergedFeatureSettings = (await featureSettingsForThemeChange(parseFeatureSettings(base), currentInv.themeId, String(body.themeId), currentInv.eventType, effectiveSubEventOnPut)) as Prisma.InputJsonValue;
    }
    const themeSnapshot = themeChanged ? await loadThemeMediaSnapshot(String(body.themeId)) : null;

    // Draf yang berasal dari Free Draft tetapi baru diisi nama pesertanya sesudah paket lunas: perbarui slug sementara
    // `draf-xxxxxxxx` menjadi slug kanonikal permanen berbasis nama peserta dan tanggal acara utama.
    let upgradedCanonicalSlug: string | undefined = undefined;
    if (
      !currentInv.isFreeDraft &&
      currentInv.status === "DRAFT" &&
      isPlaceholderFreeDraftSlug(currentInv.invitationSlug) &&
      (body.participantsJson !== undefined || body.eventData !== undefined)
    ) {
      const candidateSlug = await buildCanonicalSlugForActivatedDraft({
        invitationId: currentInv.id,
        eventType: currentInv.eventType,
        subEvent: effectiveSubEventOnPut,
        participantsJson: body.participantsJson !== undefined ? body.participantsJson : currentInv.participantsJson,
        eventData: eventDataToSave !== undefined ? eventDataToSave : currentInv.eventData,
      });
      if (candidateSlug) {
        upgradedCanonicalSlug = candidateSlug;
      }
    }

    const updated = await prisma.invitation.update({
      where: { id },
      data: {
        ...(upgradedCanonicalSlug ? { invitationSlug: upgradedCanonicalSlug } : {}),
        ...(nextSubEventOnPut !== undefined ? { subEvent: nextSubEventOnPut } : {}),
        openingQuote: body.openingQuote !== undefined ? body.openingQuote : undefined,
        openingQuoteRef: body.openingQuoteRef !== undefined ? body.openingQuoteRef : undefined,
        themeId: body.themeId !== undefined ? body.themeId : undefined,
        ...(themeSnapshot ? {
          themeDefaultMedia: themeSnapshot.themeDefaultMedia,
          themeMediaSlots: themeSnapshot.themeMediaSlots ? (themeSnapshot.themeMediaSlots as Prisma.InputJsonValue) : Prisma.DbNull,
        } : {}),
        subdomain: newSubdomain,
        musicUrl: body.musicUrl !== undefined ? safeExternalUrl(body.musicUrl) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        ...(body.status === "PUBLISHED" && currentInv.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
        loveStory: jsonFields.loveStory,
        dresscode: body.dresscode !== undefined ? body.dresscode : undefined,
        bankAccounts: jsonFields.bankAccounts,
        shippingAddress: body.shippingAddress !== undefined ? body.shippingAddress : undefined,
        eventData: eventDataToSave,
        featureSettings: mergedFeatureSettings,
        participantsJson: jsonFields.participantsJson,
        staffPin: body.staffPin !== undefined
          ? (body.staffPin ? encryptPin(String(body.staffPin)) : null)
          : undefined,

      },
    });

    // --- ARSITEKTUR PIRING: Hapus piring draft lama jika tema berubah lalu bentuk piring baru secara eager ---
    if (body.themeId !== undefined && body.themeId !== currentInv.themeId) {
      await deleteInvitationDraft(id);
      if (updated.eventType === "WEDDING") await copyMasterToDraft(id);
      else await seedRenderedLabels(id);
    }

    // Save media updates
    if (body.media && typeof body.media === "object" && !Array.isArray(body.media)) {
      // Gunakan konstanta terpusat dari lib/mediaSlots.ts (Single Source of Truth)
      for (const [slot, url] of Object.entries(body.media)) {
        if (!(VALID_MEDIA_SLOTS as readonly string[]).includes(slot)) continue;
        const urlStr = safeMediaUrl(url);

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
          // Hanya berkas unggahan undangan ini yang ikut dihapus; URL eksternal atau milik undangan lain dibiarkan.
          if (isInvitationOwnedUpload(existing.localPath, id)) await deleteFile(existing.localPath);
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
          await purgeInvitationEdgeCache(updated);
        } catch (err) {
          logger.error("ClientInvitation", "Bake HTML atau sinkronisasi R2 setelah terbit pertama gagal", err, { invitationId: id });
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
  } catch (err) {
    return routeError("ClientInvitation", err, "Gagal memperbarui undangan.");
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

    const body = (await readJsonBody(req)) ?? {};
    const currentInv = await prisma.invitation.findUnique({ where: { id }, include: { order: { select: { planType: true } } } });
    if (!currentInv) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const isOwner = currentInv.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden. Anda tidak memiliki hak mengedit undangan ini." }, { status: 403 });
    }

    const updateData: Prisma.InvitationUpdateInput = {};

    if (body.featureSettings !== undefined) {
      const merged = await mergeFeatureSettingsInput(currentInv.featureSettings, body.featureSettings, currentInv.order?.planType, isAdmin);
      if (!merged.ok) return NextResponse.json({ error: merged.error }, { status: 400 });
      if (
        currentInv.isFreeDraft &&
        !isAdmin &&
        merged.value &&
        typeof merged.value === "object" &&
        typeof (merged.value as Record<string, unknown>).galleryDriveFolderUrl === "string" &&
        String((merged.value as Record<string, unknown>).galleryDriveFolderUrl).trim()
      ) {
        return NextResponse.json(
          { error: "Galeri Google Drive hanya tersedia setelah paket diaktifkan.", code: "FREE_DRAFT_MEDIA_BLOCKED" },
          { status: 403 },
        );
      }
      updateData.featureSettings = merged.value;
    }

    if (body.participantsJson !== undefined) {
      // Nama peserta acara mengikuti kunci studio: terkunci setelah terbit kecuali admin membuka kunci darurat.
      if (!isAdmin && getInvitationLockStatus(currentInv).isLocked) {
        return NextResponse.json({ error: "Data peserta acara terkunci. Hubungi Administrator untuk membuka kunci darurat." }, { status: 403 });
      }
      const participants = normalizeJsonInput(body.participantsJson, "object");
      if (!participants.ok) {
        return NextResponse.json({ error: "participantsJson harus berupa objek JSON yang valid." }, { status: 400 });
      }
      updateData.participantsJson = participants.value;
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
    invalidateInvitationLookup(updated.invitationSlug, updated.subdomain, updated.id);

    return NextResponse.json({
      success: true,
      message: "Pengaturan berhasil diperbarui.",
      invitation: updated,
      ...updated,
    });
  } catch (err) {
    return routeError("ClientInvitation", err, "Gagal memperbarui pengaturan undangan.");
  }
}

