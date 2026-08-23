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
      rsvps: {
        orderBy: { respondedAt: "desc" },
        take: 20,
      },
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

  const waNumber = (inv.groomInstagram || "6281234567890").replace(/[^0-9]/g, "");
  const waLink = `https://wa.me/${waNumber.startsWith("0") ? "62" + waNumber.slice(1) : waNumber}`;

  // Serialize JSON fields safely
  const parseJson = (j: any) => {
    if (!j) return [];
    if (typeof j === "object") return j;
    try {
      return JSON.parse(j);
    } catch {
      return [];
    }
  };

  const eventData = parseJson(inv.eventData);
  const loveStory = parseJson(inv.loveStory);
  const bankAccounts = parseJson(inv.bankAccounts);
  const dresscode = typeof inv.dresscode === "object" ? inv.dresscode : parseJson(inv.dresscode);
  const galleryMedia = inv.media.filter((m) => m.mediaSlot === "GALLERY").sort((a, b) => a.displayOrder - b.displayOrder);

  // Build HTML snippets for complex sections
  const eventDataHtml = Array.isArray(eventData) && eventData.length > 0
    ? eventData.map((e: any) => `
      <div class="event-card">
        <h3 class="event-title">${e.title || "Acara"}</h3>
        <p class="event-datetime">📅 ${e.date || "Hari, Tanggal"} • ⏰ ${e.time || "Waktu"}</p>
        <p class="event-location">📍 ${e.location || "Lokasi Acara"}</p>
        ${e.mapsUrl ? `<a href="${e.mapsUrl}" target="_blank" class="btn-maps">Buka Google Maps ↗</a>` : ""}
      </div>
    `).join("")
    : `
      <div class="event-card">
        <h3 class="event-title">Akad & Resepsi</h3>
        <p class="event-datetime">📅 Sabtu, 15 Juni 2026 • ⏰ 09:00 WIB - Selesai</p>
        <p class="event-location">📍 Gedung Pertemuan Mulia, Jakarta</p>
      </div>
    `;

  const loveStoryHtml = Array.isArray(loveStory) && loveStory.length > 0
    ? loveStory.map((s: any) => `
      <div class="story-item">
        <h3 class="story-title">${s.title || "Momen Indah"}</h3>
        <p class="story-content">${s.content || ""}</p>
      </div>
    `).join("")
    : "";

  const galleryHtml = galleryMedia.length > 0
    ? galleryMedia.map((g) => `
      <div class="gallery-item">
        <img src="${g.driveViewUrl || g.localPath}" alt="Gallery Foto" loading="lazy" class="gallery-img">
      </div>
    `).join("")
    : "";

  const bankAccountsHtml = Array.isArray(bankAccounts) && bankAccounts.length > 0
    ? bankAccounts.map((b: any) => `
      <div class="bank-card">
        <div class="bank-header">
          <span class="bank-name">${b.bank || "BCA"}</span>
          <span class="bank-owner">a.n ${b.name || inv.groomName}</span>
        </div>
        <div class="bank-number-box">
          <span class="bank-number" id="acc-${b.number}">${b.number}</span>
          <button class="btn-copy" onclick="copyText('${b.number}', this)">Salin No. Rekening</button>
        </div>
      </div>
    `).join("")
    : "";

  const wishesHtml = inv.rsvps.length > 0
    ? inv.rsvps.map((r) => `
      <div class="wish-card">
        <div class="wish-header">
          <strong class="wish-author">${r.guestName}</strong>
          <span class="wish-status ${r.status === "hadir" ? "status-attending" : "status-absent"}">
            ${r.status === "hadir" ? "✓ Hadir (" + r.guestCount + " orang)" : "✕ Berhalangan"}
          </span>
        </div>
        ${r.message ? `<p class="wish-message">"${r.message}"</p>` : ""}
        <span class="wish-time">${new Date(r.respondedAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
      </div>
    `).join("")
    : `<p class="no-wishes">Belum ada ucapan. Jadilah yang pertama memberikan doa restu!</p>`;

  // Default target event date for countdown
  const targetDate = (Array.isArray(eventData) && eventData[0]?.date) || "2026-12-31T09:00:00";

  return {
    invitationId: inv.id,
    groomName: inv.groomName || "Adi",
    brideName: inv.brideName || "Irma",
    groomDisplayName: `${inv.groomName || "Adi"}${groomNickname}`,
    brideDisplayName: `${inv.brideName || "Irma"}${brideNickname}`,
    groomParents: inv.groomParents || "",
    brideParents: inv.brideParents || "",
    groomInstagram: inv.groomInstagram || "",
    brideInstagram: inv.brideInstagram || "",
    openingQuote: inv.openingQuote || "Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya.",
    openingQuoteRef: inv.openingQuoteRef || "QS. Ar-Rum: 21",
    globalBgUrl: mediaMap.get("GLOBAL_FIXED_BG") || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1920&q=80",
    groomPhotoUrl: mediaMap.get("GROOM_PHOTO") || "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=800&q=80",
    bridePhotoUrl: mediaMap.get("BRIDE_PHOTO") || "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=800&q=80",
    sidebarPhotoUrl: mediaMap.get("DESKTOP_SIDEBAR") || "https://images.unsplash.com/photo-1519225421980-715cb021543f?w=800&q=80",
    landingCoverUrl: mediaMap.get("LANDING_COVER") || "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80",
    waLink: waLink,
    eventDataHtml,
    loveStoryHtml,
    galleryHtml,
    bankAccountsHtml,
    wishesHtml,
    targetDate,
    shippingAddress: inv.shippingAddress || "",
    audioUrl: mediaMap.get("GALLERY") || "https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3?filename=romantic-wedding-113528.mp3",
  };
}
