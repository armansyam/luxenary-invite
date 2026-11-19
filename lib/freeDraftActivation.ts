import { prisma } from "@/lib/prisma";
import { deleteInvitationDraft } from "@/lib/invitationDraft";
import { logger } from "@/lib/logger";

/**
 * Mengaktifkan draf gratis milik pengguna menjadi undangan berbayar ketika order paket dasar (NEW) lunas.
 * Berjalan idempoten dan aman dari race condition: hanya draf dengan `isFreeDraft: true` dan `orderId: null`
 * yang dikaitkan ke order lunas, lalu cache HTML draf bertanda air dibersihkan.
 */
export async function activateFreeDraftForOrder(
  orderId: string,
  userId: string,
): Promise<string | null> {
  if (!orderId || !userId) return null;

  const freeDraft = await prisma.invitation.findFirst({
    where: {
      userId,
      isFreeDraft: true,
      orderId: null,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  if (!freeDraft) return null;

  const claimed = await prisma.invitation.updateMany({
    where: {
      id: freeDraft.id,
      userId,
      isFreeDraft: true,
      orderId: null,
    },
    data: {
      isFreeDraft: false,
      orderId,
    },
  });

  if (claimed.count === 0) return null;

  await deleteInvitationDraft(freeDraft.id).catch((err) => {
    logger.warn("FreeDraftActivation", "Gagal menghapus cache HTML draf setelah aktivasi", {
      invitationId: freeDraft.id,
      error: err instanceof Error ? err.message : String(err),
    });
  });

  return freeDraft.id;
}
