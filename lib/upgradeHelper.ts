import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { sendInvoiceEmail } from "@/lib/mailer";
import { hasPlanCapability } from "./settings";
import { extendGalleryExpiry } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";

/**
 * applyBundleFulfillment
 * Memproses pemenuhan pesanan multi-layanan (itemsJson) secara atomik dalam 1 transaksi database.
 * Urutan eksekusi presisi:
 * 1. UPGRADE TIER DAHULU (akun dinaikkan ke tier baru)
 * 2. TOP-UP KUOTA FOTO (menambah extraMemoriesQuota di featureSettings)
 * 3. PERPANJANGAN GALERI (menambah extraGalleryDays & menghitung galleryExpiresAt pasca acara)
 * 4. CUSTOM DOMAIN (memasang domain pribadi jika ada)
 */
export async function applyBundleFulfillment(paidOrderId: string): Promise<boolean> {
  const order = await prisma.order.findUnique({
    where: { id: paidOrderId },
    select: {
      id: true,
      userId: true,
      linkedInvitationId: true,
      targetPlanType: true,
      requestedDomain: true,
      itemsJson: true,
    },
  });

  if (!order || !order.itemsJson) return false;

  let items: any[] = [];
  try {
    items = JSON.parse(order.itemsJson);
    if (!Array.isArray(items) || items.length === 0) return false;
  } catch {
    return false;
  }

  // Cari undangan terkait
  const invitation = await prisma.invitation.findFirst({
    where: order.linkedInvitationId ? { id: order.linkedInvitationId } : { userId: order.userId },
    include: {
      order: { select: { id: true, planType: true } },
    },
  });

  if (!invitation) {
    console.error("[applyBundleFulfillment] Undangan tidak ditemukan untuk order:", paidOrderId);
    return false;
  }

  await prisma.$transaction(async (tx) => {
    // 1. Eksekusi UPGRADE jika ada
    const upgradeItem = items.find(i => i.type === "UPGRADE");
    const targetPlan = upgradeItem?.targetPlan || order.targetPlanType;
    if (targetPlan) {
      // Perbarui order registrasi induk klien jika ada
      if (invitation.orderId) {
        await tx.order.update({
          where: { id: invitation.orderId },
          data: { planType: targetPlan },
        });
      }
    }

    // 2. Baca featureSettings eksisting
    let curFs: Record<string, any> = {};
    try {
      curFs = typeof invitation.featureSettings === "object"
        ? (invitation.featureSettings || {})
        : JSON.parse((invitation.featureSettings as string) || "{}");
    } catch {
      curFs = {};
    }

    // 3. Eksekusi TOP-UP KUOTA FOTO jika ada
    const topupItem = items.find(i => i.type === "MEMORIES_TOPUP");
    if (topupItem && typeof topupItem.photos === "number" && topupItem.photos > 0) {
      curFs.extraMemoriesQuota = (curFs.extraMemoriesQuota || 0) + topupItem.photos;

      // Re-arm milestone notifikasi kuota yang berada di atas persentase baru
      try {
        const { getPlanMemoriesQuota } = await import("@/lib/settings");
        const planQuota = await getPlanMemoriesQuota(invitation.order?.planType);
        const baseQuota = planQuota.totalQuota > 0 ? planQuota.totalQuota : (planQuota.maxContributors * planQuota.shotsQuota);
        const newTotalQuota = baseQuota + curFs.extraMemoriesQuota;
        const currentPhotos = await tx.guestMemory.count({
          where: { invitationId: invitation.id },
        });
        const newUsagePercent = newTotalQuota > 0 ? (currentPhotos / newTotalQuota) * 100 : 0;
        if (Array.isArray(curFs.memoriesNotifiedMilestones)) {
          curFs.memoriesNotifiedMilestones = curFs.memoriesNotifiedMilestones.filter((m: number) => m <= newUsagePercent);
        }
        curFs.memoriesNotified80 = newUsagePercent >= 80;
      } catch (rearmErr) {
        console.warn("[applyBundleFulfillment] Gagal re-arm milestone notifikasi:", rearmErr);
      }
    }

    // 4. Eksekusi PERPANJANGAN GALERI jika ada
    const extItem = items.find(i => i.type === "GALLERY_EXTENSION");
    let newExpiry: Date | null = invitation.galleryExpiresAt ? new Date(invitation.galleryExpiresAt) : null;

    if (extItem) {
      const extraDays = Number(extItem.days) || (Number(extItem.months) ? Number(extItem.months) * 30 : 30);
      curFs.extraGalleryDays = (curFs.extraGalleryDays || 0) + extraDays;

      newExpiry = extendGalleryExpiry(invitation, extraDays, await getLifecycleSettings());
    }

    // 5. Simpan seluruh pembaruan ke invitation
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        featureSettings: JSON.stringify(curFs),
        ...(newExpiry ? { galleryExpiresAt: newExpiry, memoriesUploadLocked: false } : {}),
      },
    });
  });

  return true;
}

/**
 * applyGalleryExtension
 * Dipanggil setelah order GALLERY_EXTENSION berhasil PAID.
 * Menambahkan 30 hari ke galleryExpiresAt pada invitation yang bersangkutan.
 */
export async function applyGalleryExtension(extensionOrderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: extensionOrderId },
    select: {
      orderType: true,
      linkedInvitationId: true,
      userId: true,
    },
  });

  if (!order || order.orderType !== "GALLERY_EXTENSION" || !order.linkedInvitationId) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: order.linkedInvitationId },
    select: { id: true, eventData: true, galleryExpiresAt: true },
  });

  if (!invitation) return;

  const newExpiry = extendGalleryExpiry(invitation, 30, await getLifecycleSettings());

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      galleryExpiresAt: newExpiry,
      memoriesUploadLocked: false,
    },
  });
}

/**
 * applyMemoriesTopup
 * Dipanggil setelah order MEMORIES_TOPUP berhasil PAID (fallback jika tanpa itemsJson).
 * Menambahkan kuota foto ke invitation.featureSettings.extraMemoriesQuota.
 */
export async function applyMemoriesTopup(topupOrderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: topupOrderId },
    select: {
      orderType: true,
      linkedInvitationId: true,
      userId: true,
    },
  });

  if (!order || order.orderType !== "MEMORIES_TOPUP" || !order.linkedInvitationId) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: order.linkedInvitationId },
    select: { id: true, featureSettings: true, order: { select: { planType: true } } },
  });

  if (!invitation) return;

  let curFs: Record<string, any> = {};
  try {
    curFs = typeof invitation.featureSettings === "object"
      ? (invitation.featureSettings || {})
      : JSON.parse((invitation.featureSettings as string) || "{}");
  } catch {
    curFs = {};
  }

  const topupSetting = await prisma.adminSetting.findUnique({
    where: { key: "addon_memories_topup_photos" },
  });
  const photosToAdd = Number(topupSetting?.value) || 100;

  curFs.extraMemoriesQuota = (curFs.extraMemoriesQuota || 0) + photosToAdd;

  // Re-arm milestone notifikasi kuota yang berada di atas persentase baru
  try {
    const { getPlanMemoriesQuota } = await import("@/lib/settings");
    const planQuota = await getPlanMemoriesQuota(invitation.order?.planType);
    const baseQuota = planQuota.totalQuota > 0 ? planQuota.totalQuota : (planQuota.maxContributors * planQuota.shotsQuota);
    const newTotalQuota = baseQuota + curFs.extraMemoriesQuota;
    const currentPhotos = await prisma.guestMemory.count({
      where: { invitationId: invitation.id },
    });
    const newUsagePercent = newTotalQuota > 0 ? (currentPhotos / newTotalQuota) * 100 : 0;
    if (Array.isArray(curFs.memoriesNotifiedMilestones)) {
      curFs.memoriesNotifiedMilestones = curFs.memoriesNotifiedMilestones.filter((m: number) => m <= newUsagePercent);
    }
    curFs.memoriesNotified80 = newUsagePercent >= 80;
  } catch (rearmErr) {
    console.warn("[applyMemoriesTopup] Gagal re-arm milestone notifikasi:", rearmErr);
  }

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      featureSettings: JSON.stringify(curFs),
    },
  });
}


/**
 * purgeObsoleteUserOrders
 * Memastikan prinsip Single State (Opsi B):
 * Saat order PAID, bersihkan semua draft/failed orders lama milik user beserta file struknya di Cloudflare R2
 */
export async function purgeObsoleteUserOrders(userId: string, currentOrderId: string): Promise<void> {
  try {
    const obsolete = await prisma.order.findMany({
      where: {
        userId,
        id: { not: currentOrderId },
        status: { in: ["PENDING", "FAILED", "EXPIRED"] },
        orderType: "NEW",
      },
      select: { id: true, proofImageUrl: true },
    });

    for (const ord of obsolete) {
      if (ord.proofImageUrl) {
        try {
          await deleteFile(ord.proofImageUrl);
        } catch (e) {
          console.error("Gagal menghapus file bukti order usang:", e);
        }
      }
    }

    if (obsolete.length > 0) {
      const obsoleteIds = obsolete.map((o) => o.id);
      // Lepas relasi ke invitation agar tidak melanggar foreign key constraint PostgreSQL
      await prisma.invitation.updateMany({
        where: { orderId: { in: obsoleteIds } },
        data: { orderId: null },
      });
      await prisma.order.deleteMany({
        where: { id: { in: obsoleteIds } },
      });
    }
  } catch (err) {
    console.error("[Purge Obsolete User Orders Error]:", err);
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

  // Kirim email bukti pembayaran lunas (PAID) secara asynchronous non-blocking
  if (order.user?.email) {
    const recipientEmail = order.user.email;
    const recipientName = order.user.name || undefined;
    sendInvoiceEmail({
      orderId: order.id,
      orderType: order.orderType,
      plan: order.planType,
      amount: Number(order.amount),
      paymentMethod: order.paymentMethod || "QRIS / Payment Gateway",
      recipientEmail,
      recipientName,
      type: "PAID",
    }).catch(err => console.error("[Payment Webhook] Gagal kirim email PAID:", err));
  }

  // Single State Enforcement: Bersihkan order usang non-PAID milik user ini
  if (order.userId) {
    await purgeObsoleteUserOrders(order.userId, paidOrderId);
  }

  // Jika order memiliki itemsJson (pesanan multi-layanan / bundle terpadu)
  if (order.itemsJson) {
    const fulfilled = await applyBundleFulfillment(paidOrderId);
    if (fulfilled) return;
  }

  if (order.orderType === "GALLERY_EXTENSION") {
    await applyGalleryExtension(paidOrderId);
    return;
  }

  if (order.orderType === "MEMORIES_TOPUP") {
    await applyMemoriesTopup(paidOrderId);
    return;
  }


  if (order.orderType !== "UPGRADE") return;
  if (!order.linkedInvitationId || !order.targetPlanType) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: order.linkedInvitationId },
    select: { id: true, orderId: true },
  });
  if (!invitation?.orderId) return;

  // Update planType di order LAMA → tier baru aktif
  await prisma.order.update({
    where: { id: invitation.orderId },
    data: { planType: order.targetPlanType },
  });

  // Jika paket upgrade menyertakan custom domain dan target tier memiliki kapabilitas custom_domain
  const canHaveCustomDomain = await hasPlanCapability(order.targetPlanType, "custom_domain");
  if (canHaveCustomDomain && order.requestedDomain) {
    await prisma.invitation.update({
      where: { id: invitation.id },
      data: { customDomain: order.requestedDomain },
    });
  }
}
