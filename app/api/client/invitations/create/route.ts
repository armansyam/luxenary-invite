import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { EventType } from "@prisma/client";

import { getMonthYearSlug, isSubdomainExpired, isReservedSubdomain } from "@/lib/domainUtils";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { getThemeBlueprint } from "@/lib/themeDefaults";
import { safeParseParticipants } from "@/lib/participantUtils";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function generateSlugByEventType(
  eventType: string,
  body: any,
  dateSegment: string,
  randomId: string
): { groomSlug: string; brideSlug: string; baseSlug: string } {
  const p = safeParseParticipants(body.participantsJson);

  switch (eventType) {
    case "WEDDING": {
      const g = slugify((body.groomNickname || body.groomName || "").trim());
      const b = slugify((body.brideNickname || body.brideName || "").trim());
      if (!g && !b) {
        return { groomSlug: "undangan", brideSlug: randomId, baseSlug: `undangan-${randomId}` };
      }
      const groom = g || "mempelai";
      const bride = b || "mempelai";
      return {
        groomSlug: groom,
        brideSlug: bride,
        baseSlug: `${groom}-${bride}${dateSegment ? `-${dateSegment}` : ""}`,
      };
    }
    case "BIRTHDAY": {
      const rawNick = p.person?.nickname || p.person?.name || body.groomNickname || "birthday";
      const nick = slugify(rawNick) || "birthday";
      return {
        groomSlug: nick,
        brideSlug: "birthday",
        baseSlug: `${nick}-birthday${dateSegment ? `-${dateSegment}` : ""}`,
      };
    }
    case "KHITAN": {
      const rawNick = p.child?.nickname || p.child?.name || body.groomNickname || "khitan";
      const nick = slugify(rawNick) || "khitan";
      return {
        groomSlug: nick,
        brideSlug: "khitan",
        baseSlug: `${nick}-khitan${dateSegment ? `-${dateSegment}` : ""}`,
      };
    }
    case "AQIQAH": {
      const rawNick = p.baby?.nickname || p.baby?.name || body.groomNickname || "aqiqah";
      const nick = slugify(rawNick) || "aqiqah";
      return {
        groomSlug: nick,
        brideSlug: "aqiqah",
        baseSlug: `${nick}-aqiqah${dateSegment ? `-${dateSegment}` : ""}`,
      };
    }
    case "WISUDA": {
      const rawNick = p.person?.nickname || p.person?.name || body.groomNickname || "wisuda";
      const nick = slugify(rawNick) || "wisuda";
      return {
        groomSlug: nick,
        brideSlug: "wisuda",
        baseSlug: `${nick}-wisuda${dateSegment ? `-${dateSegment}` : ""}`,
      };
    }
    case "GATHERING": {
      const rawTitle = p.event?.title || body.invitationName || "gathering";
      const title = slugify(rawTitle) || "gathering";
      return {
        groomSlug: title,
        brideSlug: "gathering",
        baseSlug: `${title}${dateSegment ? `-${dateSegment}` : ""}`,
      };
    }
    default:
      return {
        groomSlug: "undangan",
        brideSlug: randomId,
        baseSlug: `undangan-${randomId}`,
      };
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
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
    groomName,
    brideName,
    groomNickname,
    brideNickname,
    invitationName,
    themeId,
    planType,
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
  const cleanType = typeof rawEventType === "string" ? rawEventType.trim().toUpperCase() : "WEDDING";
  const eventType: EventType = (validEventTypes.includes(cleanType as EventType) ? cleanType : "WEDDING") as EventType;

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
    if (requestedTheme.eventType && requestedTheme.eventType !== eventType) {
      return NextResponse.json(
        { error: `Tema '${requestedTheme.name}' dirancang khusus untuk acara ${requestedTheme.eventType}, tidak dapat digunakan untuk ${eventType}.` },
        { status: 400 }
      );
    }
  }

  const finalGroomNick = (groomNickname || groomName || "").trim();
  const finalBrideNick = (brideNickname || brideName || "").trim();
  const randomId = Date.now().toString(36).slice(-6);

  const effectiveEventDate = weddingDate || eventDate || "";

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

  const { groomSlug, brideSlug, baseSlug } = generateSlugByEventType(
    eventType,
    body,
    dateSegment,
    randomId
  );

  let invitationSlug = baseSlug;
  const existingBase = await prisma.invitation.findUnique({ where: { invitationSlug: baseSlug } });
  if (existingBase) {
    const citySlug = city ? slugify(city) : "";
    const withCity = citySlug ? `${baseSlug}-${citySlug}` : baseSlug;
    const existingWithCity = await prisma.invitation.findUnique({ where: { invitationSlug: withCity } });
    invitationSlug = !existingWithCity ? withCity : `${withCity}-${Date.now().toString(36).slice(-4)}`;
  }

  // 2. Subdomain Assignment (Nullable if skipped)
  let finalSubdomain = null;

  if (requestedSubdomain) {
    let desiredSubdomain = slugify(requestedSubdomain);

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

    if (existingSubdomain) {
      const { subdomainGraceDays } = await getLifecycleSettings();
      if (isSubdomainExpired(existingSubdomain.eventData, subdomainGraceDays)) {
        await prisma.invitation.update({
          where: { id: existingSubdomain.id },
          data: { subdomain: null },
        });
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

  let initialEvents: any[] = [];
  if (effectiveEventDate) {
    if (eventType === "WEDDING") {
      initialEvents = [
        {
          title: "Akad Nikah",
          date: effectiveEventDate,
          time: finalAkadTime,
          location: city ? `Lokasi Acara di ${city}` : "",
          address: city ? `Alamat Acara di ${city}` : "",
          mapsUrl: "",
          badge: "Sakral",
        },
        {
          title: "Resepsi Pernikahan",
          date: effectiveEventDate,
          time: finalResepsiTime,
          location: city ? `Lokasi Acara di ${city}` : "",
          address: city ? `Alamat Acara di ${city}` : "",
          mapsUrl: "",
          badge: "Umum",
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
          location: city ? `Lokasi Acara di ${city}` : "",
          address: city ? `Alamat Acara di ${city}` : "",
          mapsUrl: "",
          badge: "Utama",
        },
      ];
    }
  }

  const invitationStatus = "DRAFT";
  const publishedAt = paidOrder ? new Date() : undefined;

  const DEFAULT_THEME_BY_EVENT: Record<EventType, string> = {
    WEDDING: "kalandra",
    BIRTHDAY: "kalandra-birthday",
    KHITAN: "al-fariz",
    AQIQAH: "al-khalid",
    WISUDA: "cendekia",
    GATHERING: "sinergi",
  };
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
  } catch {}

  let themeMeta: { name: string; category: string; series: string | null; defaultMusicUrl?: string | null } | null = null;
  try {
    themeMeta = await prisma.theme.findUnique({
      where: { id: chosenTheme.toLowerCase() },
      select: { name: true, category: true, series: true, defaultMusicUrl: true },
    });
  } catch {}

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

    const initialMusicUrl = customDemoData?.audioUrl || customDemoData?.defaultMusicUrl || themeMeta?.defaultMusicUrl || blueprint.defaultMusicUrl || "";

    invitation = await prisma.$transaction(async (tx) => {
      if (existingDraft) {
        let existingFs: any = {};
        if (existingDraft.featureSettings) {
          try {
            existingFs = typeof existingDraft.featureSettings === "string" ? JSON.parse(existingDraft.featureSettings) : existingDraft.featureSettings;
          } catch {}
        }

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
            ...defaultCustomLabels,
            ...(existingFs.customLabels || {}),
          },
        };

        return tx.invitation.update({
          where: { id: existingDraft.id },
          data: {
            orderId: paidOrder?.id ?? existingDraft.orderId ?? undefined,
            eventType: eventType || existingDraft.eventType,
            participantsJson: participantsJson !== undefined
              ? (typeof participantsJson === "string" ? participantsJson : JSON.stringify(participantsJson))
              : existingDraft.participantsJson,
            groomName: groomName?.trim() || finalGroomNick || existingDraft.groomName || "",
            brideName: brideName?.trim() || finalBrideNick || existingDraft.brideName || "",
            groomNickname: finalGroomNick || existingDraft.groomNickname || "",
            brideNickname: finalBrideNick || existingDraft.brideNickname || "",
            groomSlug: groomSlug || existingDraft.groomSlug,
            brideSlug: brideSlug || existingDraft.brideSlug,
            invitationSlug: invitationSlug || existingDraft.invitationSlug,
            subdomain: finalSubdomain !== null ? finalSubdomain : existingDraft.subdomain,
            themeId: themeId?.trim() ? chosenTheme.toLowerCase() : (existingDraft.themeId || chosenTheme.toLowerCase()),
            musicUrl: effectiveMusicUrl,
            openingQuote: blueprint.openingQuote || existingDraft.openingQuote,
            openingQuoteRef: blueprint.openingQuoteRef || existingDraft.openingQuoteRef,
            eventData: initialEvents.length > 0 ? JSON.stringify(initialEvents) : existingDraft.eventData,
            featureSettings: JSON.stringify(mergedFs),
            status: "DRAFT",
            publishedAt: publishedAt || existingDraft.publishedAt,
          },
        });
      } else {
        return tx.invitation.create({
          data: {
            userId: userId,
            orderId: paidOrder?.id ?? undefined,
            eventType: eventType,
            participantsJson: participantsJson
              ? (typeof participantsJson === "string" ? participantsJson : JSON.stringify(participantsJson))
              : null,
            musicUrl: initialMusicUrl || undefined,
            groomName: groomName?.trim() || finalGroomNick || "",
            brideName: brideName?.trim() || finalBrideNick || "",
            groomNickname: finalGroomNick || "",
            brideNickname: finalBrideNick || "",
            groomSlug,
            brideSlug,
            invitationSlug,
            subdomain: finalSubdomain,
            themeId: chosenTheme.toLowerCase(),
            openingQuote: blueprint.openingQuote,
            openingQuoteRef: blueprint.openingQuoteRef,
            eventData: JSON.stringify(initialEvents),
            featureSettings: JSON.stringify({
              weddingTagline: defaultCoverBadge,
              musicUrl: initialMusicUrl || undefined,
              showStory: eventType === "WEDDING",
              showGallery: true,
              showGift: true,
              showDresscode: true,
              showMusic: true,
              customLabels: defaultCustomLabels,
            }),
            status: invitationStatus,
            publishedAt: publishedAt,
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
    console.error("Failed to create/update invitation:", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Gagal membuat undangan. Terjadi kesalahan server." : error.message },
      { status: 500 }
    );
  }
}
