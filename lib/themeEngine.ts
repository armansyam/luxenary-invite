import { prisma } from "@/lib/prisma";
import { parseFeatureSettings } from "@/lib/featureSettings";
import { applyThemeDefaultMedia, parseThemeDefaultMedia } from "@/lib/themeDefaultMedia";
import { filterDeclaredMedia, parseThemeMediaSlots } from "@/lib/themeMediaSlots";
import { builderFreeSectionTokens, clientPhotoFlags } from "@/lib/themeEngine/shared";
import { composeWeddingData } from "@/lib/themeEngine/weddingComposer";
import {
  composeEventData,
  composePersonalData,
  finalizeEventData,
  finalizePersonalData,
} from "@/lib/themeEngine/modeComposers";

export { buildWeddingEventsHtml } from "@/lib/themeEngine/events";
export { clientPhotoFlags } from "@/lib/themeEngine/shared";
export { composeWeddingData } from "@/lib/themeEngine/weddingComposer";
export { composePersonalData, composeEventData } from "@/lib/themeEngine/modeComposers";

/**
 * `includeRsvps: false` dan `includeGift: false` dipakai salinan portofolio: nama dan ucapan tamu asli, nomor rekening,
 * QRIS, dan alamat kirim kado klien tidak ikut terbit di halaman publik lain. Data amplop dikosongkan di sumbernya
 * (bukan hanya `showGift`) karena beberapa master memakai `{{giftAddress}}` langsung.
 */
export async function composeTemplateData(
  invitationId: string,
  { includeRsvps = true, includeGift = true }: { includeRsvps?: boolean; includeGift?: boolean } = {},
) {
  const inv = await prisma.invitation.findUnique({
    where: { id: invitationId },
    include: {
      media: true,
      rsvps: {
        where: { isHidden: false },
        orderBy: { respondedAt: "desc" },
        take: includeRsvps ? 30 : 0,
      },
      ...(includeGift ? { giftClaims: true } : {}),
      order: { select: { planType: true } },
    },
  });

  if (!inv) return null;
  if (!includeGift) {
    const featureSettings = { ...parseFeatureSettings(inv.featureSettings), showGift: false, qrisImageUrl: null, giftRegistry: [] };
    return composeInvitationData({ ...inv, bankAccounts: [], shippingAddress: null, giftClaims: [], featureSettings });
  }
  return composeInvitationData(inv);
}

/**
 * Data template dari objek undangan berbentuk hasil query di atas (media, rsvps, order). Demo tema memakai fungsi ini
 * dengan undangan virtual (`lib/demoInvitation.ts`), sehingga demo dirender oleh engine yang sama dengan undangan klien.
 */
export async function composeInvitationData(inv: any): Promise<Record<string, any>> {
  // Foto di slot yang tidak dipakai tema (sisa tema sebelumnya) dibuang dulu agar tidak menutup gambar tema atau
  // membatalkan cover bawaan; barisnya di database tetap. Lalu media bawaan tema mengisi slot yang belum diisi klien.
  const declaredMedia = filterDeclaredMedia<{ mediaSlot: string; localPath?: string | null }>(inv.media || [], parseThemeMediaSlots(inv.themeMediaSlots));
  inv = { ...inv, media: applyThemeDefaultMedia(declaredMedia, parseThemeDefaultMedia(inv.themeDefaultMedia)) };
  let data: Record<string, any>;
  switch (inv.eventType || "WEDDING") {
    case "PERSONAL":
      data = await finalizePersonalData(await composePersonalData(inv), inv);
      break;
    case "EVENT":
      data = await finalizeEventData(await composeEventData(inv), inv);
      break;
    default:
      data = await composeWeddingData(inv);
  }
  return {
    ...data,
    ...clientPhotoFlags(data, inv.media, {
      eventType: inv.eventType || "WEDDING",
      displayOrder: (parseFeatureSettings(inv.featureSettings) as Record<string, any>)?.displayOrder,
    }),
    ...(await builderFreeSectionTokens(inv)),
  };
}
