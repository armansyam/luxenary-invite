import { prisma } from "@/lib/prisma";

/**
 * Compose the data object needed to render a theme template from the
 * Invitation record in the database.
 */
export async function composeTemplateData(invitationId: string) {
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      media: true,
      guests: true,
    },
  });

  if (!inv) return null;

  const mediaMap = new Map<string, string>();
  for (const m of inv.media) {
    if (m.driveViewUrl) mediaMap.set(String(m.mediaSlot), m.driveViewUrl);
    else if (m.localPath) mediaMap.set(String(m.mediaSlot), m.localPath);
  }

  const groomNickname = inv.groomNickname ? ` (${inv.groomNickname})` : "";
  const brideNickname = inv.brideNickname ? ` (${inv.brideNickname})` : "";

  const waLink = `https://wa.me/${(inv.groomInstagram || "").replace(/[^0-9]/g, "")}`;

  // Serialize JSON fields safely
  const parseJson = (j: string | null | undefined) => {
    if (!j) return [];
    try {
      return JSON.parse(j);
    } catch {
      return [];
    }
  };

  const eventData = parseJson(typeof inv?.eventData === "string" ? inv.eventData : (inv as any)?.eventData);
  const loveStory = parseJson(typeof inv?.loveStory === "string" ? inv.loveStory : (inv as any)?.loveStory);
  const galleryMedia = inv.media.filter((m) => m.mediaSlot === "GALLERY").sort((a, b) => a.displayOrder - b.displayOrder);

  const features = typeof inv?.featureSettings === "string" ? JSON.parse(inv.featureSettings) : inv?.featureSettings || {};

  // Build HTML snippets for complex sections
  const eventDataHtml = eventData.map((e: any) => `
    <div style="margin-bottom:1rem">
      <h3>${e.title}</h3>
      <p>${e.date} • ${e.time}</p>
      <p>${e.location}</p>
    </div>
  `).join("");

  const loveStoryHtml = loveStory.map((s: any) => `
    <div style="margin-bottom:1.5rem">
      <h3>${s.title}</h3>
      <p>${s.content}</p>
    </div>
  `).join("");

  const galleryHtml = galleryMedia.map((g) => `
    <img src="${g.driveViewUrl || g.localPath}" alt="Gallery" style="width:100%; margin-bottom:0.5rem; border-radius:8px;">
  `).join("");

  return {
    groomName: inv.groomName || "Nama Pengantin",
    brideName: inv.brideName || "Nama Pengantin",
    groomDisplayName: `${inv.groomName || ""}${groomNickname}`,
    brideDisplayName: `${inv.brideName || ""}${brideNickname}`,
    groomParents: inv.groomParents || "",
    brideParents: inv.brideParents || "",
    groomInstagram: inv.groomInstagram || "",
    brideInstagram: inv.brideInstagram || "",
    openingQuote: inv.openingQuote || "",
    openingQuoteRef: inv.openingQuoteRef || "",
    globalBgUrl: mediaMap.get("GLOBAL_FIXED_BG") || "",
    groomPhotoUrl: mediaMap.get("GROOM_PHOTO") || "",
    bridePhotoUrl: mediaMap.get("BRIDE_PHOTO") || "",
    sidebarPhotoUrl: mediaMap.get("DESKTOP_SIDEBAR") || "",
    landingCoverUrl: mediaMap.get("LANDING_COVER") || "",
    waLink: waLink,
    eventDataHtml,
    loveStoryHtml,
    galleryHtml,
    rsvpHtml: "",
    audioUrl: mediaMap.get("GALLERY") || "",
  };
}
