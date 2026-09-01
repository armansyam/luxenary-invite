import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getAdminSetting } from "@/lib/settings";

export async function generateInvitationMetadata(invitationId: string, guestName?: string): Promise<Metadata> {
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: { media: true },
  });

  const platformName = await getAdminSetting("platform_name", "Platform Undangan");

  if (!inv) {
    return {
      title: `Undangan Pernikahan Online — ${platformName}`,
      description: "Undangan pernikahan digital eksklusif & modern.",
    };
  }

  let featureSettings: any = {};
  try {
    featureSettings = typeof inv.featureSettings === "string" ? JSON.parse(inv.featureSettings) : inv.featureSettings || {};
  } catch {}

  const displayOrder = featureSettings.displayOrder || "BRIDE_FIRST";
  const brideName = inv.brideNickname || inv.brideName || "Nasha";
  const groomName = inv.groomNickname || inv.groomName || "Didan";
  const coupleName = displayOrder === "BRIDE_FIRST" ? `${brideName} & ${groomName}` : `${groomName} & ${brideName}`;
  const weddingTagline = featureSettings.weddingTagline || "THE WEDDING OF";

  const title = `${weddingTagline} ${coupleName.toUpperCase()}`;
  const description = guestName
    ? `Undangan Spesial Pernikahan untuk ${decodeURIComponent(guestName)} — Mohon Doa Restu & Kehadiran Anda.`
    : `Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri perayaan pernikahan kami.`;

  // Determine OG Image from cover photos
  const mediaMap = new Map<string, string>();
  for (const m of inv.media) {
    const mediaUrl = m.localPath || "";
    if (mediaUrl) mediaMap.set(String(m.mediaSlot), mediaUrl);
  }

  const coverPhoto =
    mediaMap.get("LANDING_COVER") ||
    mediaMap.get("DESKTOP_SIDEBAR") ||
    mediaMap.get("BRIDE_PHOTO") ||
    mediaMap.get("GROOM_PHOTO") ||
    "/uploads/dummy/AMS06353.webp";

  // Convert relative /uploads/... to absolute URL for WhatsApp crawler
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
  const rootDomain = appUrl ? `https://${appUrl.replace(/^https?:\/\//, "").replace(/\/$/, "")}` : "";
  const baseUrl = rootDomain.startsWith("http") ? rootDomain : `https://${rootDomain}`;
  const absoluteImageUrl = coverPhoto.startsWith("http") ? coverPhoto : `${baseUrl}${coverPhoto.startsWith("/") ? "" : "/"}${coverPhoto}`;

  const canonicalUrl = inv.subdomain ? `https://${inv.subdomain}.${baseUrl.replace(/^https?:\/\//, "")}` : baseUrl;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl,
      siteName: `${platformName} Wedding Studio`,
      images: [
        {
          url: absoluteImageUrl,
          width: 1200,
          height: 630,
          alt: `Undangan Pernikahan ${coupleName}`,
        },
      ],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [absoluteImageUrl],
    },
  };
}
