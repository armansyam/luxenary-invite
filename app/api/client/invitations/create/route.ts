import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { getMonthYearSlug, isSubdomainExpired, isReservedSubdomain } from "@/lib/domainUtils";
import { getThemeBlueprint } from "@/lib/themeDefaults";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
      // No invitation linked yet — or linked invitation still DRAFT
      OR: [
        { invitation: null },
        { invitation: { status: "DRAFT" } },
      ],
    },
    orderBy: { paidAt: "desc" },
  });

  if (!paidOrder) {
    // Allow if there's already an existing DRAFT invitation (re-setup scenario)
    const existingDraft = await prisma.invitation.findFirst({
      where: { userId: userId, status: "DRAFT" },
    });
    if (!existingDraft) {
      return NextResponse.json(
        { error: "Anda belum memiliki paket yang aktif. Silakan selesaikan pembayaran terlebih dahulu." },
        { status: 403 }
      );
    }
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
    city,
    timeZone,
    akadTime,
    resepsiTime,
    subdomain: requestedSubdomain,
  } = body;

  if (themeId && typeof themeId === "string" && themeId.trim()) {
    const cleanThemeId = themeId.trim().toLowerCase();
    const requestedTheme = await prisma.theme.findUnique({
      where: { id: cleanThemeId },
      select: { isActive: true },
    });
    if (!requestedTheme || !requestedTheme.isActive) {
      return NextResponse.json(
        { error: "Tema yang dipilih tidak tersedia atau sedang dinonaktifkan." },
        { status: 400 }
      );
    }
  }

  const finalGroomNick = (groomNickname || groomName || "").trim();
  const finalBrideNick = (brideNickname || brideName || "").trim();

  const randomId = Date.now().toString(36).slice(-6);

  // 1. Permanent Canonical Slug: {groom}-{bride}-{DDMMYY} (flat, single segment)
  let dateSegment = "";
  if (weddingDate) {
    const d = new Date(weddingDate);
    if (!isNaN(d.getTime())) {
      const dd = String(d.getDate()).padStart(2, "0");
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const yy = String(d.getFullYear()).slice(-2);
      dateSegment = `${dd}${mm}${yy}`;
    }
  }
  if (!dateSegment && weddingDate) {
    dateSegment = getMonthYearSlug(weddingDate);
  }

  let groomSlug = "";
  let brideSlug = "";
  let invitationSlug = "";

  if (finalGroomNick || finalBrideNick) {
    groomSlug = finalGroomNick ? slugify(finalGroomNick) : "mempelai";
    brideSlug = finalBrideNick ? slugify(finalBrideNick) : "mempelai";
    const baseSlug = `${groomSlug}-${brideSlug}${dateSegment ? `-${dateSegment}` : ""}`;
    invitationSlug = baseSlug;

    const existingBase = await prisma.invitation.findUnique({ where: { invitationSlug: baseSlug } });
    if (existingBase) {
      const citySlug = city ? slugify(city) : "";
      const withCity = citySlug ? `${baseSlug}-${citySlug}` : baseSlug;
      const existingWithCity = await prisma.invitation.findUnique({ where: { invitationSlug: withCity } });
      invitationSlug = !existingWithCity ? withCity : `${withCity}-${Date.now().toString(36).slice(-4)}`;
    }
  } else {
    // Skenario Lewati Setup: Gunakan slug netral berbasis ID acak tanpa data tiruan
    invitationSlug = `undangan-${randomId}`;
    groomSlug = "undangan";
    brideSlug = randomId;
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
      let eventDateToTest: string | null = null;
      try {
        if (existingSubdomain.eventData) {
          const parsed = JSON.parse(existingSubdomain.eventData);
          if (Array.isArray(parsed) && parsed[0]?.date) {
            eventDateToTest = parsed[0].date;
          }
        }
      } catch {}

      if (isSubdomainExpired(eventDateToTest, 7)) {
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

  const initialEvents = weddingDate ? [
    {
      title: "Akad Nikah",
      date: weddingDate,
      time: finalAkadTime,
      location: city ? `Lokasi Acara di ${city}` : "",
      address: city ? `Alamat Acara di ${city}` : "",
      mapsUrl: "",
      badge: "Sakral",
    },
    {
      title: "Resepsi Pernikahan",
      date: weddingDate,
      time: finalResepsiTime,
      location: city ? `Lokasi Acara di ${city}` : "",
      address: city ? `Alamat Acara di ${city}` : "",
      mapsUrl: "",
      badge: "Umum",
    },
  ] : [];

  const invitationStatus = "DRAFT";
  const publishedAt = paidOrder ? new Date() : undefined;

  const chosenTheme = themeId?.trim() || "kalandra";
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

  let themeMeta: { name: string; category: string; series: string | null } | null = null;
  try {
    themeMeta = await prisma.theme.findUnique({
      where: { id: chosenTheme.toLowerCase() },
      select: { name: true, category: true, series: true },
    });
  } catch {}

  const blueprint = getThemeBlueprint(chosenTheme, {
    ...(customDemoData || {}),
    themeName: themeMeta?.name,
    series: themeMeta?.series || themeMeta?.category,
  });

  try {
    const invitation = await prisma.invitation.create({
      data: {
        userId: userId,
        orderId: paidOrder?.id ?? undefined,
        groomName: groomName?.trim() || finalGroomNick || "",
        brideName: brideName?.trim() || finalBrideNick || "",
        groomNickname: finalGroomNick || "",
        brideNickname: finalBrideNick || "",
        groomSlug,
        brideSlug,
        invitationSlug,
        subdomain: finalSubdomain,
        themeId: themeId?.trim() || "", // Murni kosong tanpa default tema paksaan
        openingQuote: blueprint.openingQuote,
        openingQuoteRef: blueprint.openingQuoteRef,
        // staffPin: Diisi secara mandiri oleh Klien sbg syarat Publish
        eventData: JSON.stringify(initialEvents),
        featureSettings: JSON.stringify({
          weddingTagline: "THE WEDDING OF",
          colorPalette: "champagne",
          showStory: true,
          showGallery: true,
          showGift: true,
          showDresscode: true,
          showMusic: true,
          customLabels: {
            coverSubtitle: blueprint.coverSubtitle,
            openBtn: blueprint.openBtn,
            rsvpTitle: blueprint.rsvpTitle,
            rsvpBtnText: blueprint.rsvpBtnText || "Kirim Konfirmasi & Doa",
            quoteTitle: blueprint.quoteSectionTitle,
            quoteEyebrow: blueprint.quoteSectionEyebrow,
            coupleTitle: blueprint.coupleSectionTitle,
            coupleEyebrow: blueprint.coupleSectionEyebrow || "THE COUPLE",
            coupleSub: blueprint.coupleSectionSub,
            eventsTitle: blueprint.eventsSectionTitle,
            eventsSub: blueprint.eventsSectionSub,
            storyTitle: blueprint.storySectionTitle,
            storyEyebrow: blueprint.storySectionEyebrow || "OUR JOURNEY",
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
            giftEyebrow: blueprint.giftSectionEyebrow,
            giftDesc: blueprint.giftSectionDesc,
            turutMengundangTitle: blueprint.turutMengundangTitle || "Turut Mengundang",
            turutMengundangEyebrow: blueprint.turutMengundangEyebrow || "Keluarga Besar",
            turutMengundangSubtitle: blueprint.turutMengundangSubtitle || "Keluarga Besar & Kerabat yang turut berbahagia:",
            wishesTitle: blueprint.wishesSectionTitle,
            wishesSub: blueprint.wishesSectionSub,
            rsvpNameLabel: "Nama Lengkap",
            rsvpStatusLabel: "Konfirmasi Kehadiran",
            rsvpCountLabel: "Jumlah Tamu",
            rsvpMessageLabel: "Ucapan & Doa Restu"
          }
        }),
        status: invitationStatus,
        publishedAt: publishedAt,
      },
    });

    return NextResponse.json({
      success: true,
      invitationId: invitation.id,
      subdomain: finalSubdomain,
      status: "DRAFT",
    });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json(
        { error: "Subdomain atau URL undangan sudah diklaim oleh pengguna lain di waktu bersamaan. Silakan coba lagi dengan nama lain." },
        { status: 409 }
      );
    }
    console.error("Failed to create invitation:", error);
    return NextResponse.json({ error: "Gagal membuat undangan. Terjadi kesalahan server." }, { status: 500 });
  }
}
