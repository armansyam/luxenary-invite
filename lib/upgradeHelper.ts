import { prisma } from "@/lib/prisma";

/**
 * applyUpgradePlan
 * Dipanggil setelah order UPGRADE berhasil PAID.
 * Update planType di order LAMA yang terhubung ke invitation.
 *
 * @param upgradeOrderId - ID order UPGRADE yang baru saja PAID
 */
export async function applyUpgradePlan(upgradeOrderId: string): Promise<void> {
  const upgradeOrder = await prisma.order.findUnique({
    where: { id: upgradeOrderId },
    select: {
      orderType: true,
      linkedOrderId: true,
      targetPlanType: true,
      userId: true,
    },
  });

  if (!upgradeOrder || upgradeOrder.orderType !== "UPGRADE") return;
  if (!upgradeOrder.linkedOrderId || !upgradeOrder.targetPlanType) return;

  // Update planType di order LAMA → tier baru aktif
  await prisma.order.update({
    where: { id: upgradeOrder.linkedOrderId },
    data: { planType: upgradeOrder.targetPlanType },
  });
}
