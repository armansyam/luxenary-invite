import { prisma } from "./prisma";
import { buildAndSavePublishedHtml } from "./staticPublisher";
import { purgeInvitationEdgeCache } from "./cloudflare";

/**
 * Melepas subdomain undangan ke pool. HTML terbit memuat tautan /s/<subdomain>/sharemoment dan /memories; setelah
 * subdomain diklaim pasangan lain tautan itu mengarah ke undangan mereka, jadi HTML yang masih ditayangkan dibangun
 * ulang (tanpa subdomain, tautan memakai slug) sebelum cache edge dibersihkan.
 */
export async function releaseInvitationSubdomain(inv: {
  id: string;
  status: string;
  invitationSlug: string | null;
  subdomain: string | null;
  customDomain?: string | null;
}): Promise<void> {
  await prisma.invitation.update({ where: { id: inv.id }, data: { subdomain: null } });
  if (inv.status === "PUBLISHED" || inv.status === "EVENT_FINISHED") await buildAndSavePublishedHtml(inv.id);
  await purgeInvitationEdgeCache(inv);
}
