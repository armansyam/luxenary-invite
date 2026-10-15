import { prisma } from "@/lib/prisma";
import { sendInvoiceEmail } from "@/lib/mailer";
import { getPlanMemoriesQuota } from "./settings";
import { extendGalleryExpiry } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import type { PlanType, Prisma } from "@prisma/client";
import { logger } from "@/lib/logger";

/** Bentuk butir `orders.itemsJson` yang ditulis checkout-bundle. */
type BundleItem = {
  type: string;
  targetPlan?: PlanType;
  photos?: number;
  days?: number;
  months?: number;
};

/**
 * applyBundleFulfillment
 * Memproses pemenuhan pesanan multi-layanan (itemsJson) secara atomik dalam 1 transaksi database.
 * Urutan eksekusi presisi:
 * 1. UPGRADE TIER DAHULU (akun dinaikkan ke tier baru)
 * 2. TOP-UP KUOTA FOTO (menambah kolom extraMemoriesQuota)
 * 3. PERPANJANGAN GALERI (menambah kolom extraGalleryDays & menghitung galleryExpiresAt pasca acara)
 */
export async function applyBundleFulfillment(paidOrderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: paidOrderId },
    select: {
      id: true,
      userId: true,
      linkedInvitationId: true,
      targetPlanType: true,
      itemsJson: true,
    },
  });

  if (!order || !Array.isArray(order.itemsJson) || order.itemsJson.length === 0) return false;
  const items = order.itemsJson as BundleItem[];

  // Cari undangan terkait
  const invitation = await prisma.invitation.findFirst({
    where: order.linkedInvitationId ? { id: order.linkedInvitationId } : { userId: order.userId },
    include: {
      order: { select: { id: true, planType: true } },
    },
  });

  if (!invitation) {
    logger.error("BundleFulfillment", "Undangan untuk order add-on tidak ditemukan; pemenuhan dilewati", undefined, { orderId: paidOrderId });
    return false;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Eksekusi UPGRADE jika ada
    const upgradeItem = items.find(i => i.type === "UPGRADE");
    const targetPlan = upgradeItem?.targetPlan || order.targetPlanType;
    if (targetPlan) {
      if (!invitation.orderId) {
        throw new Error(`Undangan ${invitation.id} tidak memiliki order paket dasar; upgrade dari order ${paidOrderId} tidak dapat diterapkan`);
      }
      await tx.order.update({
        where: { id: invitation.orderId },
        data: { planType: targetPlan },
      });
    }

    // 2. Eksekusi TOP-UP KUOTA FOTO jika ada
    const topupItem = items.find(i => i.type === "MEMORIES_TOPUP");
    const addedPhotos = topupItem && typeof topupItem.photos === "number" && topupItem.photos > 0 ? topupItem.photos : 0;

    // 3. Eksekusi PERPANJANGAN GALERI jika ada
    const extItem = items.find(i => i.type === "GALLERY_EXTENSION");
    const extraDays = extItem ? Number(extItem.days) || (Number(extItem.months) ? Number(extItem.months) * 30 : 30) : 0;
    const newExpiry = extItem ? extendGalleryExpiry(invitation, extraDays, await getLifecycleSettings()) : null;

    // 4. Simpan seluruh pembaruan ke invitation
    const updated = await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        extraMemoriesQuota: { increment: addedPhotos },
        extraGalleryDays: { increment: extraDays },
        ...(newExpiry ? { galleryExpiresAt: newExpiry, memoriesUploadLocked: false } : {}),
      },
      select: { extraMemoriesQuota: true, memoriesNotifiedMilestones: true },
    });
    if (addedPhotos > 0) {
      await rearmQuotaMilestones(tx, invitation.id, invitation.order?.planType, updated.extraMemoriesQuota, updated.memoriesNotifiedMilestones);
    }
  });

  return true;
}

/**
 * Setelah kuota foto bertambah, ambang notifikasi di atas persentase pemakaian baru dibuka lagi agar pemilik
 * diberi tahu kembali saat roll yang lebih besar mendekati penuh.
 */
async function rearmQuotaMilestones(
  tx: Prisma.TransactionClient,
  invitationId: string,
  planType: string | null | undefined,
  extraQuota: number,
  milestones: number[],
): Promise<void> {
  const planQuota = await getPlanMemoriesQuota(planType);
  const baseQuota = planQuota.totalQuota > 0 ? planQuota.totalQuota : planQuota.maxContributors * planQuota.shotsQuota;
  const totalQuota = baseQuota + extraQuota;
  const photos = await tx.guestMemory.count({ where: { invitationId } });
  const usagePercent = totalQuota > 0 ? (photos / totalQuota) * 100 : 0;
  const kept = milestones.filter((m) => m <= usagePercent);
  if (kept.length !== milestones.length) {
    await tx.invitation.update({ where: { id: invitationId }, data: { memoriesNotifiedMilestones: kept } });
  }
}


/**
 * purgeObsoleteUserOrders
 * Satu paket aktif per pengguna: saat order PAID, order paket lain yang masih PENDING milik pengguna ditutup.
 */
export async function purgeObsoleteUserOrders(userId: string, currentOrderId: string): Promise<void> {
  try {
    const others = { userId, id: { not: currentOrderId }, orderType: "NEW" as const };
    // Hanya draf yang tidak pernah sampai ke gateway dan tanpa bukti transfer yang dihapus. Order yang pernah punya sesi
    // gateway atau bukti tetap disimpan (ditandai EXPIRED): QR lamanya bisa saja tetap dibayar, dan webhook
    // pelunasan (settlementSourceStatuses) membutuhkan barisnya. Baris lama dibersihkan runStaleDataCleanup.
    const deleted = await prisma.order.deleteMany({
      where: { ...others, status: "PENDING", gatewayTxId: null, proofImageUrl: null },
    });
    const expired = await prisma.order.updateMany({
      where: { ...others, status: "PENDING" },
      data: { status: "EXPIRED", rejectReason: "Digantikan pesanan lain yang sudah lunas" },
    });
    if (deleted.count + expired.count > 0) {
      logger.info("PurgeObsoleteOrders", "Order paket usang dibereskan", { userId, deleted: deleted.count, expired: expired.count });
    }
  } catch (err) {
    logger.error("PurgeObsoleteOrders", "Pembersihan order usang pengguna gagal", err);
  }
}

/**
 * applyUpgradePlan
 * Dipanggil setelah order berhasil PAID (upgrade, perpanjangan galeri, top-up kuota, bundle, email lunas).
 *
 * Idempoten: pemenuhan diklaim lewat `fulfilledAt` sehingga pemanggilan ganda (webhook ulang, polling, cron)
 * tidak melipatgandakan kuota atau hari galeri. Bila pemenuhan gagal, klaim dilepas dan error dilempar ulang
 * agar webhook dicoba lagi gateway dan sapuan cron dapat mengulanginya.
 *
 * @param paidOrderId - ID order yang sudah PAID
 */
export async function applyUpgradePlan(paidOrderId: string): Promise<void> {
  const claimed = await prisma.order.updateMany({
    where: { id: paidOrderId, status: "PAID", fulfilledAt: null },
    data: { fulfilledAt: new Date() },
  });
  if (claimed.count === 0) return;

  try {
    await runPaidOrderFulfillment(paidOrderId);
  } catch (err) {
    await prisma.order.updateMany({ where: { id: paidOrderId }, data: { fulfilledAt: null } });
    throw err;
  }
}

async function runPaidOrderFulfillment(paidOrderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: paidOrderId },
    include: {
      user: { select: { email: true, name: true } },
    },
  });

  if (!order) return;

  // Single State Enforcement: Bersihkan order usang non-PAID milik user ini
  if (order.userId) {
    await purgeObsoleteUserOrders(order.userId, paidOrderId);
  }

  // Add-on dan upgrade dari checkout terpadu selalu membawa itemsJson; upgrade lama (/api/payments/upgrade) tidak.
  // Custom domain (requestedDomain) tidak dipasang otomatis: admin mengaktifkannya, atau klien lewat verifikasi DNS.
  if (Array.isArray(order.itemsJson) && order.itemsJson.length > 0) {
    await applyBundleFulfillment(paidOrderId);
  } else if (order.orderType === "UPGRADE" && order.linkedInvitationId && order.targetPlanType) {
    const invitation = await prisma.invitation.findUnique({
      where: { id: order.linkedInvitationId },
      select: { orderId: true },
    });
    if (!invitation?.orderId) {
      logger.error("PaymentFulfillment", "Undangan atau order paket dasar untuk upgrade tidak ditemukan", undefined, { orderId: paidOrderId });
    } else {
      await prisma.order.update({
        where: { id: invitation.orderId },
        data: { planType: order.targetPlanType },
      });
    }
  }

  // Email lunas dikirim setelah pemenuhan berhasil: bila pemenuhan gagal, klaim dilepas dan dicoba ulang (cron),
  // sehingga email sebelum pemenuhan akan terkirim berulang kali.
  if (order.user?.email) {
    sendInvoiceEmail({
      orderId: order.id,
      orderType: order.orderType,
      plan: order.planType,
      amount: Number(order.amount),
      paymentMethod: order.paymentMethod || "QRIS / Payment Gateway",
      recipientEmail: order.user.email,
      recipientName: order.user.name || undefined,
      type: "PAID",
    }).catch((err) => logger.error("PaymentFulfillment", "Email invoice PAID gagal dikirim", err));
  }
}
