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
    let invitation: { id: string; subdomain: string | null; status: string };

    invitation = await prisma.$transaction(async (tx) => {
      if (existingDraft) {
        return tx.invitation.update({
          where: { id: existingDraft.id },
          data: {
            orderId: paidOrder?.id ?? existingDraft.orderId ?? undefined,
            groomName: groomName?.trim() || finalGroomNick || existingDraft.groomName || "",
            brideName: brideName?.trim() || finalBrideNick || existingDraft.brideName || "",
            groomNickname: finalGroomNick || existingDraft.groomNickname || "",
            brideNickname: finalBrideNick || existingDraft.brideNickname || "",
            groomSlug: finalGroomNick ? groomSlug : existingDraft.groomSlug,
            brideSlug: finalBrideNick ? brideSlug : existingDraft.brideSlug,
            invitationSlug: (finalGroomNick || finalBrideNick) ? invitationSlug : existingDraft.invitationSlug,
            subdomain: finalSubdomain !== null ? finalSubdomain : existingDraft.subdomain,
            themeId: themeId?.trim() ? themeId.trim() : (existingDraft.themeId || ""),
            openingQuote: blueprint.openingQuote || existingDraft.openingQuote,
            openingQuoteRef: blueprint.openingQuoteRef || existingDraft.openingQuoteRef,
            eventData: initialEvents.length > 0 ? JSON.stringify(initialEvents) : existingDraft.eventData,
            status: "DRAFT",
            publishedAt: publishedAt || existingDraft.publishedAt,
          },
        });
      } else {
        return tx.invitation.create({
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
            themeId: themeId?.trim() || "",
            openingQuote: blueprint.openingQuote,
            openingQuoteRef: blueprint.openingQuoteRef,
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
    console.error("Failed to create/update invitation:", error);
    return NextResponse.json({ error: "Gagal membuat undangan. Terjadi kesalahan server." }, { status: 500 });
  }
}
