import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

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

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "Akun pengguna tidak ditemukan." }, { status: 404 });
  }

  // ── Guard: User must have a PAID order to create an invitation ──────────────
  const paidOrder = await prisma.order.findFirst({
    where: {
      userId: user.id,
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
      where: { userId: user.id, status: "DRAFT" },
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
  const invitationSlug = slugify(invitationName || "wedding");

  let finalSubdomain = requestedSubdomain ? slugify(requestedSubdomain) : `${groomSlug}-${brideSlug}`;
  let finalGroomSlug = groomSlug;
  let finalBrideSlug = brideSlug;

  const existing = await prisma.invitation.findFirst({
    where: {
      OR: [
        { subdomain: finalSubdomain },
        { groomSlug, brideSlug, invitationSlug },
      ],
    },
  });

  if (existing) {
    const suffix = Date.now().toString(36).slice(-4);
    finalSubdomain = `${groomSlug}-${brideSlug}-${suffix}`;
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

  const invitation = await prisma.invitation.create({
    data: {
      userId: user.id,
      orderId: paidOrder?.id ?? undefined,
      groomName: groomName || finalGroomNick,
      brideName: brideName || finalBrideNick,
      groomNickname: finalGroomNick,
      brideNickname: finalBrideNick,
      groomSlug: finalGroomSlug,
      brideSlug: finalBrideSlug,
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
      status: "DRAFT",
    },
  });

  // Immediately publish if PAID order exists
  if (paidOrder) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { status: "PUBLISHED", publishedAt: new Date() },
    });
  }

  return NextResponse.json({
    success: true,
    invitationId: invitation.id,
    subdomain: finalSubdomain,
    status: paidOrder ? "PUBLISHED" : "DRAFT",
  });
}
