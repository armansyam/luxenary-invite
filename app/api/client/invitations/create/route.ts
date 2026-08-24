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
    return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    city
  } = body;

  const finalGroomNick = groomNickname || groomName;
  const finalBrideNick = brideNickname || brideName;

  if (!finalGroomNick || !finalBrideNick) {
    return NextResponse.json({ error: "Nama kedua mempelai wajib diisi." }, { status: 400 });
  }

  const groomSlug = slugify(finalGroomNick);
  const brideSlug = slugify(finalBrideNick);
  const invitationSlug = slugify(invitationName || "wedding");

  // Check uniqueness or append suffix if necessary
  let finalSubdomain = `${groomSlug}-${brideSlug}`;
  let finalGroomSlug = groomSlug;
  let finalBrideSlug = brideSlug;

  const existing = await prisma.invitation.findFirst({
    where: {
      OR: [
        { subdomain: finalSubdomain },
        {
          groomSlug,
          brideSlug,
          invitationSlug,
        },
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
      badge: "Sakral"
    },
    {
      title: "Resepsi Pernikahan",
      date: weddingDate || "2026-10-05",
      time: "11:00 - 14:00 WITA",
      location: city ? `Grand Ballroom ${city}` : "Grand Ballroom Phinisi Hotel Clarion",
      address: city ? `Jl. Pettarani No. 1, ${city}` : "Jl. A.P. Pettarani No. 1, Makassar",
      mapsUrl: "https://maps.google.com",
      badge: "Umum"
    }
  ];

  const invitation = await prisma.invitation.create({
    data: {
      userId: user.id,
      groomName: groomName || finalGroomNick,
      brideName: brideName || finalBrideNick,
      groomNickname: finalGroomNick,
      brideNickname: finalBrideNick,
      groomSlug: finalGroomSlug,
      brideSlug: finalBrideSlug,
      invitationSlug,
      subdomain: finalSubdomain,
      themeId: themeId || "kalandra",
      openingQuote: "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri...",
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

  return NextResponse.json({ success: true, invitationId: invitation.id, subdomain: finalSubdomain });
}
