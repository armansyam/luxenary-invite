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

  const finalGroomNick = groomNickname || groomName;
  const finalBrideNick = brideNickname || brideName;

  if (!finalGroomNick || !finalBrideNick) {
    return NextResponse.json({ error: "Nama kedua mempelai wajib diisi." }, { status: 400 });
  }

  const groomSlug = slugify(finalGroomNick);
  const brideSlug = slugify(finalBrideNick);

  // 1. Permanent Canonical Path Slug: Month-Year format (e.g. "okt-2026")
  const defaultMonthYearSlug = getMonthYearSlug(weddingDate);
  const baseInvitationSlug = slugify(invitationName || defaultMonthYearSlug);
  let invitationSlug = baseInvitationSlug;

  // Collision disambiguation for path: [groom]-[bride]/[invitationSlug]
  let collisionCounter = 1;
  while (true) {
    const existingPath = await prisma.invitation.findFirst({
      where: { groomSlug, brideSlug, invitationSlug },
    });
    if (!existingPath) break;
    collisionCounter++;
    invitationSlug = `${baseInvitationSlug}-${collisionCounter}`;
  }

  // 2. Subdomain Assignment & Recycling (Lease System)
  let desiredSubdomain = requestedSubdomain ? slugify(requestedSubdomain) : `${groomSlug}-${brideSlug}`;
  let finalSubdomain = desiredSubdomain;

  const existingSubdomain = await prisma.invitation.findUnique({
    where: { subdomain: desiredSubdomain },
  });

  if (existingSubdomain) {
    // Check if the holding invitation's event has passed grace period (> 7 days)
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
      // Release expired subdomain back to the pool!
      await prisma.invitation.update({
        where: { id: existingSubdomain.id },
        data: { subdomain: null },
      });
      finalSubdomain = desiredSubdomain;
    } else {
      // Subdomain is actively in use by another couple → disambiguate with short suffix
      const suffix = Date.now().toString(36).slice(-4);
      finalSubdomain = `${desiredSubdomain}-${suffix}`;
    }
  }

  const initialEvents = [
    {
      title: "Akad Nikah",
      date: weddingDate || "2026-10-05",
      time: "08:00 - 10:00 WITA",
      location: city ? `Masjid Agung ${city}` : "Masjid Raya Makassar",
      address: city ? `Jl. Protokol No. 1, ${city}` : "Jl. Masjid Raya No. 1, Makassar",
      mapsUrl: "https://maps.google.com",
      badge: "Sakral",
    },
    {
      title: "Resepsi Pernikahan",
      date: weddingDate || "2026-10-05",
      time: "11:00 - 14:00 WITA",
      location: city ? `Grand Ballroom ${city}` : "Grand Ballroom Phinisi Hotel Clarion",
      address: city ? `Jl. Pettarani No. 1, ${city}` : "Jl. A.P. Pettarani No. 1, Makassar",
      mapsUrl: "https://maps.google.com",
      badge: "Umum",
    },
  ];

  const invitationStatus = paidOrder ? "PUBLISHED" : "DRAFT";
  const publishedAt = paidOrder ? new Date() : undefined;

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
      eventData: JSON.stringify(initialEvents),
      featureSettings: JSON.stringify({
        weddingTagline: "THE WEDDING OF",
        colorPalette: "champagne",
        showStory: true,
        showGallery: true,
        showGift: true,
        showDresscode: true,
        showMusic: true,
      }),
      status: invitationStatus,
      publishedAt: publishedAt,
    },
  });

  return NextResponse.json({
    success: true,
    invitationId: invitation.id,
    subdomain: finalSubdomain,
    status: paidOrder ? "PUBLISHED" : "DRAFT",
  });
}
