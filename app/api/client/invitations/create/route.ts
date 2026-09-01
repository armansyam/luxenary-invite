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
    subdomain: requestedSubdomain,
  } = body;

  const finalGroomNick = groomNickname || groomName || "";
  const finalBrideNick = brideNickname || brideName || "";

  const randomId = Date.now().toString(36).slice(-6);
  const groomSlug = finalGroomNick ? slugify(finalGroomNick) : `pria-${randomId}`;
  const brideSlug = finalBrideNick ? slugify(finalBrideNick) : `wanita-${randomId}`;

  // 1. Permanent Canonical Slug: {groom}-{bride}-{DDMMYY} (flat, single segment)
  //    Format tanggal: DDMMYY (e.g. 03-03-26 → 030326)
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
  if (!dateSegment) {
    dateSegment = getMonthYearSlug(weddingDate); // fallback: okt-2026
  }

  const baseSlug = `${groomSlug}-${brideSlug}-${dateSegment}`;

  // Cek collision — jika ada, tambahkan kota
  let invitationSlug = baseSlug;
  const existingBase = await prisma.invitation.findUnique({ where: { invitationSlug: baseSlug } });

  if (existingBase) {
    // Tambah kota untuk disambiguasi (lebih bermakna daripada angka)
    const citySlug = city ? slugify(city) : "";
    const withCity = citySlug ? `${baseSlug}-${citySlug}` : baseSlug;
    const existingWithCity = await prisma.invitation.findUnique({ where: { invitationSlug: withCity } });

    if (!existingWithCity) {
      invitationSlug = withCity;
    } else {
      // Collision dengan kota juga → suffix acak pendek (sangat jarang terjadi)
      const suffix = Date.now().toString(36).slice(-4);
      invitationSlug = `${withCity}-${suffix}`;
    }
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

  const initialEvents = weddingDate ? [
    {
      title: "Akad Nikah",
      date: weddingDate,
      time: "08:00 - 10:00 WITA",
      location: city ? `Masjid Agung ${city}` : "Masjid Raya",
      address: city ? `Jl. Protokol No. 1, ${city}` : "Jl. Masjid Raya No. 1",
      mapsUrl: "https://maps.google.com",
      badge: "Sakral",
    },
    {
      title: "Resepsi Pernikahan",
      date: weddingDate,
      time: "11:00 - 14:00 WITA",
      location: city ? `Grand Ballroom ${city}` : "Grand Ballroom Hotel",
      address: city ? `Jl. Protokol No. 2, ${city}` : "Jl. Jend. Sudirman",
      mapsUrl: "https://maps.google.com",
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
        groomName: groomName || finalGroomNick,
        brideName: brideName || finalBrideNick,
        groomNickname: finalGroomNick,
        brideNickname: finalBrideNick,
        groomSlug,
        brideSlug,
        invitationSlug,
        subdomain: finalSubdomain,
        themeId: themeId || "kalandra",
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
