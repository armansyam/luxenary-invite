import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

import { getMonthYearSlug, isSubdomainExpired } from "@/lib/domainUtils";

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
        openingQuote:
          "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri...",
        openingQuoteRef: "QS. AR-RUM : 21",
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
            coverSubtitle: "Dengan segala hormat, kami mengundang Anda untuk menghadiri acara pernikahan kami.",
            openBtn: "Buka Undangan",
            rsvpTitle: "RSVP & Doa Restu",
            rsvpNameLabel: "Nama Lengkap",
            rsvpStatusLabel: "Konfirmasi Kehadiran",
            rsvpCountLabel: "Jumlah Tamu",
            rsvpMessageLabel: "Ucapan & Doa Restu",
            rsvpBtnText: "Kirim Konfirmasi & Doa"
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
