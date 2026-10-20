import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EventType } from "@prisma/client";

import { getMonthYearSlug, isSubdomainExpired, isReservedSubdomain, isReservedSlug } from "@/lib/domainUtils";
import { normalizeEventDateInput } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { releaseInvitationSubdomain } from "@/lib/subdomainRelease";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { DEFAULT_THEME_BY_EVENT, isThemeCompatible } from "@/lib/invitationUtils";
import { participantNames } from "@/lib/participantUtils";
import { normalizeJsonInput } from "@/lib/jsonText";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const SINGLE_NAME_SLUG_SUFFIX: Record<string, string> = {
  BIRTHDAY: "birthday",
  KHITAN: "khitan",
  AQIQAH: "aqiqah",
  WISUDA: "wisuda",
};

function buildBaseSlug(eventType: string, participants: unknown, dateSegment: string, randomId: string): string {
  const withDate = (slug: string) => `${slug}${dateSegment ? `-${dateSegment}` : ""}`;
  const { first, second } = participantNames(eventType, participants);

  if (eventType === "WEDDING") {
    const groom = slugify(first);
    const bride = slugify(second);
    if (!groom && !bride) return `undangan-${randomId}`;
    return withDate(`${groom || "mempelai"}-${bride || "mempelai"}`);
  }
  if (eventType === "GATHERING") return withDate(slugify(first) || "gathering");

  const suffix = SINGLE_NAME_SLUG_SUFFIX[eventType];
  if (!suffix) return `undangan-${randomId}`;
  return withDate(`${slugify(first) || suffix}-${suffix}`);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  if (!userId) {
    return NextResponse.json({ error: "Akun pengguna tidak ditemukan." }, { status: 404 });
  }

  // ── Guard: User must have a PAID order to create an invitation ──────────────
  const paidOrder = await prisma.order.findFirst({
    where: {
      userId: userId,
      status: "PAID",
      // Hanya order paket dasar: order upgrade/add-on tidak punya undangan sendiri dan tidak boleh membuka hak undangan baru
      orderType: "NEW",
      // No invitation linked yet — or linked invitation still DRAFT
      OR: [
        { invitation: null },
        { invitation: { status: "DRAFT" } },
      ],
    },
    orderBy: { paidAt: "desc" },
    include: { invitation: true },
  });

  const existingDraft = paidOrder?.invitation || (await prisma.invitation.findFirst({
    where: { userId: userId, status: "DRAFT" },
  }));

  if (!paidOrder && !existingDraft) {
    return NextResponse.json(
      { error: "Anda belum memiliki paket yang aktif. Silakan selesaikan pembayaran terlebih dahulu." },
      { status: 403 }
    );
  }

  const body = await req.json();
  const {
    themeId,
    weddingDate,
    eventDate,
    city,
    timeZone,
    akadTime,
    resepsiTime,
    subdomain: requestedSubdomain,
    eventType: rawEventType,
    participantsJson,
  } = body;

  const validEventTypes: EventType[] = ["WEDDING", "BIRTHDAY", "KHITAN", "AQIQAH", "WISUDA", "GATHERING"];
  const cleanType = typeof rawEventType === "string" ? rawEventType.trim().toUpperCase() : "";
  if (!validEventTypes.includes(cleanType as EventType)) {
    return NextResponse.json({ error: "Jenis acara wajib dipilih." }, { status: 400 });
  }
  const eventType = cleanType as EventType;

  // Tema, label, dan data peserta draf dibangun untuk jenis acaranya; mengganti jenis acara di sini akan
  // menyisakan tema pernikahan pada acara lain.
  if (existingDraft?.eventType && existingDraft.eventType !== eventType) {
    return NextResponse.json(
      { error: "Undangan Anda sudah dibuat untuk jenis acara lain. Hubungi admin bila jenis acara perlu diganti." },
      { status: 409 }
    );
  }

  const participants = normalizeJsonInput(participantsJson, "object");
  if (!participants.ok) {
    return NextResponse.json({ error: "participantsJson harus berupa objek JSON yang valid." }, { status: 400 });
  }

  if (themeId && typeof themeId === "string" && themeId.trim()) {
    const cleanThemeId = themeId.trim().toLowerCase();
    const requestedTheme = await prisma.theme.findUnique({
      where: { id: cleanThemeId },
      select: { isActive: true, eventType: true, name: true },
    });
    if (!requestedTheme || !requestedTheme.isActive) {
      return NextResponse.json(
        { error: "Tema yang dipilih tidak tersedia atau sedang dinonaktifkan." },
        { status: 400 }
      );
    }
    if (!isThemeCompatible(requestedTheme.eventType, eventType)) {
      return NextResponse.json(
        { error: `Tema '${requestedTheme.name}' tidak dapat dipakai untuk jenis acara ini: tema pernikahan hanya untuk pernikahan, tema satu nama untuk acara lain.` },
        { status: 400 }
      );
    }
  }

  const randomId = Date.now().toString(36).slice(-6);

  const effectiveEventDate = normalizeEventDateInput(weddingDate || eventDate || "");
  if (effectiveEventDate === null) {
    return NextResponse.json({ error: "Tanggal acara harus berupa tanggal nyata berformat TTTT-BB-HH." }, { status: 400 });
  }

  // 1. Permanent Canonical Slug: dynamic per eventType
  let dateSegment = "";
  if (effectiveEventDate) {
    const d = new Date(effectiveEventDate);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      dateSegment = `${dd}${mm}${yy}`;
    }
  }
  if (!dateSegment && effectiveEventDate) {
    dateSegment = getMonthYearSlug(effectiveEventDate);
  }

  const builtSlug = buildBaseSlug(eventType, participants.value, dateSegment, randomId);
  // Acara gathering tanpa tanggal dapat menghasilkan slug seperti "demo" yang kalah oleh rute aplikasi dan tidak terbuka.
  const baseSlug = isReservedSlug(builtSlug) ? `${builtSlug}-${randomId}` : builtSlug;

  let invitationSlug = baseSlug;
  const existingBase = await prisma.invitation.findUnique({ where: { invitationSlug: baseSlug } });
  // Draf milik pengguna sendiri bukan bentrok: submit ulang wizard tidak boleh mengganti slug permanennya.
  if (existingBase && existingBase.id !== existingDraft?.id) {
    const citySlug = city ? slugify(city) : "";
    const withCity = citySlug ? `${baseSlug}-${citySlug}` : baseSlug;
    const existingWithCity = await prisma.invitation.findUnique({ where: { invitationSlug: withCity } });
    invitationSlug = !existingWithCity ? withCity : `${withCity}-${Date.now().toString(36).slice(-4)}`;
  }

  // 2. Subdomain Assignment (Nullable if skipped)
  let finalSubdomain = null;

  const desiredSubdomain = requestedSubdomain ? slugify(String(requestedSubdomain)).slice(0, 63).replace(/-+$/, "") : "";
  if (desiredSubdomain) {

    if (isReservedSubdomain(desiredSubdomain)) {
      return NextResponse.json(
        { error: `Subdomain "${desiredSubdomain}" dilindungi oleh sistem (seperti CDN/System) dan tidak dapat digunakan.` },
        { status: 400 }
      );
    }

    finalSubdomain = desiredSubdomain;

    const existingSubdomain = await prisma.invitation.findUnique({
      where: { subdomain: desiredSubdomain },
    });

    if (existingSubdomain && existingSubdomain.id !== existingDraft?.id) {
      const { subdomainGraceDays, autoRecycleSubdomain } = await getLifecycleSettings();
      if (autoRecycleSubdomain && isSubdomainExpired(existingSubdomain.eventData, subdomainGraceDays)) {
        await releaseInvitationSubdomain(existingSubdomain);
        finalSubdomain = desiredSubdomain;
      } else {
        const suffix = Date.now().toString(36).slice(-4);
        finalSubdomain = `${desiredSubdomain}-${suffix}`;
      }
    }
  }

  // Initial Events: Dinamis murni dari input klien tanpa hardcode jam palsu
  const tzSuffix = (timeZone && typeof timeZone === "string" && timeZone.trim()) ? ` ${timeZone.trim().toUpperCase()}` : "";
  const formatTimeWithTz = (t?: string) => {
    if (!t || !t.trim()) return "";
    const clean = t.trim();
    if (clean.toUpperCase().includes("WIB") || clean.toUpperCase().includes("WITA") || clean.toUpperCase().includes("WIT")) {
      return clean;
    }
    return `${clean}${tzSuffix}`;
  };

  const finalAkadTime = formatTimeWithTz(akadTime);
  const finalResepsiTime = formatTimeWithTz(resepsiTime);
  // Zona waktu disimpan sebagai field sendiri: tanpa jam, akhiran di teks `time` hilang dan patokan jatuh ke WIB.
  const cleanTz = typeof timeZone === "string" ? timeZone.trim().toUpperCase() : "";
  const eventTimezone = cleanTz === "WIB" || cleanTz === "WITA" || cleanTz === "WIT" ? cleanTz : "WIB";

  let initialEvents: any[] = [];
  if (effectiveEventDate) {
    if (eventType === "WEDDING") {
      initialEvents = [
        {
          title: "Akad Nikah",
          date: effectiveEventDate,
          time: finalAkadTime,
          timezone: eventTimezone,
          location: "",
          address: city || "",
          mapsUrl: "",
          badge: "Sakral",
          isPrimary: false,
        },
        // Resepsi adalah jadwal terima tamu: patokan masa aktif, hitung mundur, dan kunci tanggal pasca terbit.
        {
          title: "Resepsi Pernikahan",
          date: effectiveEventDate,
          time: finalResepsiTime,
          timezone: eventTimezone,
          location: "",
          address: city || "",
          mapsUrl: "",
          badge: "Umum",
          isPrimary: true,
        },
      ];
    } else {
      const eventTitleMap: Record<string, string> = {
        BIRTHDAY: "Pesta Ulang Tahun",
        KHITAN: "Syukuran Khitanan",
        AQIQAH: "Tasyakuran Aqiqah",
        WISUDA: "Syukuran Wisuda",
        GATHERING: "Acara Gathering",
      };
      const mainTime = formatTimeWithTz(body.eventTime || resepsiTime || akadTime);
      initialEvents = [
        {
          title: eventTitleMap[eventType] || "Acara Utama",
          date: effectiveEventDate,
          time: mainTime,
          timezone: eventTimezone,
          location: "",
          address: city || "",
          mapsUrl: "",
          badge: "Utama",
          isPrimary: true,
        },
      ];
    }
  }

  const invitationStatus = "DRAFT";

  const chosenTheme = themeId?.trim() || DEFAULT_THEME_BY_EVENT[eventType] || "kalandra";
  let customDemoData: any = null;
  try {
    const customSetting = await prisma.adminSetting.findUnique({
      where: { key: `theme_demo_${chosenTheme.toLowerCase()}` },
      select: { value: true },
    });
    if (customSetting?.value) {
      customDemoData = JSON.parse(customSetting.value);
    }
  } catch (err) {
    logger.warn("InvitationCreate", "Data demo kustom tema tidak terbaca; undangan memakai bawaan tema", { theme: chosenTheme, error: err instanceof Error ? err.message : String(err) });
  }

  let themeMeta: { name: string; category: string; series: string | null; defaultMusicUrl?: string | null } | null = null;
  try {
    themeMeta = await prisma.theme.findUnique({
      where: { id: chosenTheme.toLowerCase() },
      select: { name: true, category: true, series: true, defaultMusicUrl: true },
    });
  } catch (err) {
    logger.warn("InvitationCreate", "Metadata tema tidak terbaca; undangan memakai bawaan", { theme: chosenTheme, error: err instanceof Error ? err.message : String(err) });
  }

  const blueprint = getThemeBlueprint(chosenTheme, {
    ...(customDemoData || {}),
    themeName: themeMeta?.name,
    series: themeMeta?.series || themeMeta?.category,
  });

  try {
    let invitation: { id: string; subdomain: string | null; status: string };

    const isWeddingEvent = eventType === "WEDDING";
    const defaultCoverBadge = blueprint.coverBadge || (
      eventType === "BIRTHDAY"
        ? "BIRTHDAY CELEBRATION"
        : eventType === "KHITAN"
        ? "WALIMATUL KHITAN"
        : eventType === "AQIQAH"
        ? "WALIMATUL AQIQAH"
        : eventType === "WISUDA"
        ? "GRADUATION CELEBRATION"
        : eventType === "GATHERING"
        ? "SPECIAL GATHERING"
        : "THE WEDDING OF"
    );

    const defaultCustomLabels = {
      coverSubtitle: blueprint.coverSubtitle,
      coverBadge: defaultCoverBadge,
      coverGuestLabel: "Kepada Yth. Bapak/Ibu/Saudara/i",
      openingGreeting: blueprint.openingGreeting || "",
      openBtn: blueprint.openBtn,
      rsvpTitle: blueprint.rsvpTitle,
      rsvpBtnText: blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa",
      quoteTitle: blueprint.quoteSectionTitle,
      quoteEyebrow: blueprint.quoteSectionEyebrow,
      coupleTitle: blueprint.coupleSectionTitle,
      coupleEyebrow: blueprint.coupleSectionEyebrow || (isWeddingEvent ? "THE COUPLE" : "EVENT PROFILE"),
      coupleSub: blueprint.coupleSectionSub,
      eventsTitle: blueprint.eventsSectionTitle,
      eventsEyebrow: blueprint.eventsSectionEyebrow || "AGENDA ACARA",
      eventsSub: blueprint.eventsSectionSub,
      storyTitle: blueprint.storySectionTitle,
      storyEyebrow: blueprint.storySectionEyebrow || (isWeddingEvent ? "OUR JOURNEY" : "HIGHLIGHTS"),
      galleryTitle: blueprint.gallerySectionTitle,
      galleryEyebrow: blueprint.gallerySectionEyebrow,
      galleryQuote: blueprint.galleryQuote,
      dressCodeTitle: blueprint.dressCodeTitle || "Dress Code",
      dressCodeEyebrow: blueprint.dressCodeEyebrow || "A Guide To",
      dressCodeSubtitle: blueprint.dressCodeSubtitle || "Kami mengundang tamu undangan untuk mengenakan palet warna berikut:",
      streamingTitle: blueprint.streamingTitle || "Live Streaming",
      streamingEyebrow: blueprint.streamingEyebrow || "Virtual Ceremony",
      streamingSubtitle: blueprint.streamingSubtitle || "Bagi keluarga & sahabat yang menyaksikan dari jauh, bergabunglah melalui siaran daring:",
      giftTitle: blueprint.giftSectionTitle,
      giftEyebrow: blueprint.giftSectionEyebrow || (isWeddingEvent ? "WEDDING GIFT" : "TANDA KASIH"),
      giftDesc: blueprint.giftSectionDesc,
      turutMengundangTitle: blueprint.turutMengundangTitle || "Turut Mengundang",
      turutMengundangEyebrow: blueprint.turutMengundangEyebrow || "Keluarga Besar",
      turutMengundangSubtitle: blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:",
      wishesTitle: blueprint.wishesSectionTitle,
      wishesEyebrow: blueprint.wishesSectionEyebrow || (isWeddingEvent ? "WISHES & RSVP" : "GUEST WISHES"),
      wishesSub: blueprint.wishesSectionSub,
      closingQuote: blueprint.closingQuote,
      closingSub: blueprint.closingSub,
      rsvpNameLabel: "Nama Lengkap",
      rsvpStatusLabel: "Konfirmasi Kehadiran",
      rsvpCountLabel: "Jumlah Tamu",
      rsvpMessageLabel: "Ucapan & Doa Restu",
      vendorTitle: blueprint.vendorTitle || (isWeddingEvent ? "Mitra Vendor" : "Mitra Acara"),
      vendorEyebrow: blueprint.vendorEyebrow || (isWeddingEvent ? "WEDDING CREDITS" : "EVENT CREDITS"),
      vendorSubtitle: blueprint.vendorSubtitle || (isWeddingEvent ? "Rasa terima kasih dan penghargaan setulusnya kepada seluruh vendor yang telah membantu menyempurnakan hari bahagia kami." : "Rasa terima kasih dan penghargaan setulusnya kepada seluruh pihak dan mitra yang telah membantu menyempurnakan acara kami."),
    };

    // Tema satu nama mengisi judul seksinya dari token jenis acara ({{profileEyebrow}}, {{eventDateFormatted}}, ...).
    // Label tersimpan menimpa token itu, dan blueprint satu nama berisi cadangan pernikahan ("THE COUPLE"), jadi
    // undangan non-pernikahan hanya menyimpan label yang memang diubah klien.
    const initialCustomLabels = isWeddingEvent ? defaultCustomLabels : {};

    const initialMusicUrl = customDemoData?.audioUrl || customDemoData?.defaultMusicUrl || themeMeta?.defaultMusicUrl || blueprint.defaultMusicUrl || "";

    invitation = await prisma.$transaction(async (tx) => {
      if (existingDraft) {
        const existingFs = parseFeatureSettings(existingDraft.featureSettings);

        const isThemeChanged = Boolean(themeId?.trim() && themeId.trim().toLowerCase() !== existingDraft.themeId?.toLowerCase());
        const effectiveMusicUrl = isThemeChanged
          ? (initialMusicUrl || existingDraft.musicUrl || undefined)
          : (existingDraft.musicUrl || initialMusicUrl || undefined);

        const mergedFs = {
          weddingTagline: existingFs.weddingTagline || defaultCoverBadge,
          musicUrl: isThemeChanged ? (initialMusicUrl || existingFs.musicUrl || undefined) : (existingFs.musicUrl || existingDraft.musicUrl || initialMusicUrl || undefined),
          showStory: existingFs.showStory !== undefined ? existingFs.showStory : (eventType === "WEDDING"),
          showGallery: existingFs.showGallery !== undefined ? existingFs.showGallery : true,
          showGift: existingFs.showGift !== undefined ? existingFs.showGift : true,
          showDresscode: existingFs.showDresscode !== undefined ? existingFs.showDresscode : true,
          showMusic: existingFs.showMusic !== undefined ? existingFs.showMusic : true,
          customLabels: {
            ...initialCustomLabels,
            ...(existingFs.customLabels || {}),
          },
        };

        return tx.invitation.update({
          where: { id: existingDraft.id },
          data: {
            orderId: paidOrder?.id ?? existingDraft.orderId ?? undefined,
            eventType: eventType || existingDraft.eventType,
            participantsJson: participantsJson !== undefined ? participants.value : undefined,
            invitationSlug: invitationSlug || existingDraft.invitationSlug,
            subdomain: finalSubdomain !== null ? finalSubdomain : existingDraft.subdomain,
            themeId: themeId?.trim() ? chosenTheme.toLowerCase() : (existingDraft.themeId || chosenTheme.toLowerCase()),
            musicUrl: effectiveMusicUrl,
            openingQuote: blueprint.openingQuote || existingDraft.openingQuote,
            openingQuoteRef: blueprint.openingQuoteRef || existingDraft.openingQuoteRef,
            eventData: initialEvents.length > 0 ? initialEvents : undefined,
            featureSettings: mergedFs,
            status: "DRAFT",
          },
        });
      } else {
        return tx.invitation.create({
          data: {
            userId: userId,
            orderId: paidOrder?.id ?? undefined,
            eventType: eventType,
            participantsJson: participants.value,
            musicUrl: initialMusicUrl || undefined,
            invitationSlug,
            subdomain: finalSubdomain,
            themeId: chosenTheme.toLowerCase(),
            openingQuote: blueprint.openingQuote,
            openingQuoteRef: blueprint.openingQuoteRef,
            eventData: initialEvents,
            featureSettings: {
              weddingTagline: defaultCoverBadge,
              musicUrl: initialMusicUrl || undefined,
              showStory: eventType === "WEDDING",
              showGallery: true,
              showGift: true,
              showDresscode: true,
              showMusic: true,
              customLabels: initialCustomLabels,
            },
            status: invitationStatus,
          },
        });
      }
    });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      subdomain: invitation.subdomain,
      status: "DRAFT",
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      const target = Array.isArray(error.meta?.target)
        ? error.meta.target.join(", ")
        : String(error.meta?.target || "");

      if (target.includes("subdomain")) {
        return NextResponse.json(
          { error: "Subdomain ini sudah digunakan oleh pengguna lain. Silakan coba lagi dengan nama lain." },
          { status: 409 }
        );
      }
      if (target.includes("orderId")) {
        const existing = await prisma.invitation.findFirst({
          where: {
            OR: [
              ...(paidOrder?.id ? [{ orderId: paidOrder.id }] : []),
              { userId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
        });
        if (existing) {
          return NextResponse.json({
            success: true,
            invitationId: existing.id,
            subdomain: existing.subdomain,
            status: existing.status,
          });
        }
      }
      if (target.includes("invitationSlug")) {
        return NextResponse.json(
          { error: "Tautan URL undangan ini sudah ada. Silakan ubah sedikit nama mempelai atau kota." },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: "Terjadi duplikasi data unik pada sistem. Silakan muat ulang halaman." },
        { status: 409 }
      );
    }
    if (error.code === "P2003") {
      return NextResponse.json({ error: "Tema yang dipilih tidak tersedia di katalog." }, { status: 400 });
    }
    return routeError("ClientInvitationCreate", error, "Gagal membuat undangan. Terjadi kesalahan server.");
  }
}
