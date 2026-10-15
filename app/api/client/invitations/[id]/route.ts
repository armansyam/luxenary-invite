import { prisma } from "@/lib/prisma";
import { InvitationStatus, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { normalizeJsonInput } from "@/lib/jsonText";
import { participantNames } from "@/lib/participantUtils";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";
import { removeIfExists } from "@/lib/fsSafe";
import { encryptPin, decryptPin } from "@/lib/pinEncryption";
import { STAFF_PIN_PATTERN, isThemeCompatible } from "@/lib/invitationUtils";
import { isReservedSubdomain, isSubdomainExpired } from "@/lib/domainUtils";
import { DAY_MS, getPrimaryEventDate, getPrimaryEventDateString } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { getPlanMemoriesQuota } from "@/lib/settings";
import { VALID_MEDIA_SLOTS } from "@/lib/mediaSlots";
import { invalidateInvitationLookup } from "@/lib/cache";
import { safeExternalUrl, safeMediaUrl } from "@/lib/safeUrl";
import { deleteFile, isInvitationOwnedUpload } from "@/lib/storage";
import { purgeInvitationEdgeCache } from "@/lib/cloudflare";
import { createPreviewToken } from "@/lib/previewAccess";
import { mergeFeatureSettingsInput } from "@/lib/featureSettings";


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
    const body = await req.json();

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

    let newSubdomain = body.subdomain !== undefined
      ? (body.subdomain && String(body.subdomain).trim()
          ? String(body.subdomain).trim().toLowerCase().replace(/[^a-z0-9-]/g, "")
          : null)
      : undefined;

    // Undangan pernikahan tanpa subdomain mendapat subdomain dari nama panggilan mempelai saat studio menyimpan peserta.
    // Subdomain turunan ini tidak diminta klien, jadi bentrok atau nama sistem tidak boleh menggagalkan penyimpanan nama:
    // nama sistem dilewati, nama yang sudah dipakai diberi akhiran seperti pada wizard pembuatan undangan.
    if (newSubdomain === undefined && !currentInv.subdomain && currentInv.eventType === "WEDDING" && body.participantsJson !== undefined) {
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
          await prisma.invitation.update({
            where: { id: existingSub.id },
            data: { subdomain: null },
          });
          await purgeInvitationEdgeCache(existingSub);
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

      // 3. Keluarga tema: pernikahan hanya memakai tema pernikahan; acara lain boleh memakai tema satu nama mana pun.
      if (!isThemeCompatible(requestedTheme.eventType, currentInv.eventType)) {
        return NextResponse.json(
          { error: `Tema '${requestedTheme.name}' tidak cocok untuk undangan Anda: tema pernikahan hanya untuk pernikahan, tema satu nama untuk acara lain.` },
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
    }

    // PIN membuka portal resepsionis; batas percobaan verify-pin (30 per 15 menit) hanya berarti bila ruang tebakannya cukup besar.
    if (body.staffPin && !STAFF_PIN_PATTERN.test(String(body.staffPin))) {
      return NextResponse.json({ error: "PIN harus 4–10 karakter berupa huruf atau angka." }, { status: 400 });
    }

    const updated = await prisma.invitation.update({
      where: { id },
      data: {
        openingQuote: body.openingQuote !== undefined ? body.openingQuote : undefined,
        openingQuoteRef: body.openingQuoteRef !== undefined ? body.openingQuoteRef : undefined,
        themeId: body.themeId !== undefined ? body.themeId : undefined,
        subdomain: newSubdomain,
        musicUrl: body.musicUrl !== undefined ? safeExternalUrl(body.musicUrl) : undefined,
        status: body.status !== undefined ? body.status : undefined,
        ...(body.status === "PUBLISHED" && currentInv.status !== "PUBLISHED" ? { publishedAt: new Date() } : {}),
        loveStory: jsonFields.loveStory,
        dresscode: body.dresscode !== undefined ? body.dresscode : undefined,
        bankAccounts: jsonFields.bankAccounts,
        shippingAddress: body.shippingAddress !== undefined ? body.shippingAddress : undefined,
        liveStreamUrl: body.liveStreamUrl !== undefined ? safeExternalUrl(body.liveStreamUrl) : undefined,
        eventData: eventDataToSave,
        featureSettings: mergedFeatureSettings,
        participantsJson: jsonFields.participantsJson,
        staffPin: body.staffPin !== undefined
          ? (body.staffPin ? encryptPin(String(body.staffPin)) : null)
          : undefined,

      },
    });

    // --- ARSITEKTUR PIRING: Hapus piring draft lama jika tema berubah ---
    if (body.themeId !== undefined && body.themeId !== currentInv.themeId) {
      const path = await import("path");
      await removeIfExists(path.join(process.cwd(), "data", "drafts", `${id}.html`));
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

    const body = await req.json();
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
    invalidateInvitationLookup(updated.invitationSlug, updated.subdomain);

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

