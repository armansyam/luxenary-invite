import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { sendInvoiceEmail } from "@/lib/mailer";
import { hasPlanCapability } from "./settings";
import { getLatestEventDate } from "@/lib/domainUtils";

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
      linkedOrderId: true,
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
    where: {
      OR: [
        { id: order.linkedOrderId || undefined },
        { orderId: order.linkedOrderId || undefined },
        { userId: order.userId },
      ],
    },
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
    }

    // 4. Eksekusi PERPANJANGAN GALERI jika ada
    const extItem = items.find(i => i.type === "GALLERY_EXTENSION");
    let newExpiry: Date | null = invitation.galleryExpiresAt ? new Date(invitation.galleryExpiresAt) : null;

    if (extItem) {
      const extraDays = Number(extItem.days) || (Number(extItem.months) ? Number(extItem.months) * 30 : 30);
      curFs.extraGalleryDays = (curFs.extraGalleryDays || 0) + extraDays;

      const now = new Date();
      if (invitation.galleryExpiresAt && invitation.galleryExpiresAt > now) {
        // Jika sudah ada batas masa aktif berjalan di masa depan, tambahkan dari sana
        newExpiry = new Date(invitation.galleryExpiresAt.getTime() + extraDays * 24 * 60 * 60 * 1000);
      } else {
        // Cek tanggal acara resepsi
        const latestEventDate = getLatestEventDate(invitation.eventData);
        if (latestEventDate) {
          const effectivePlan = (targetPlan || invitation.order?.planType || "TRADITIONAL").toUpperCase();
          const baseRetentionDays = effectivePlan === "PREMIUM" ? 365 : (effectivePlan === "MODERN" ? 90 : 30);
          newExpiry = new Date(latestEventDate.getTime() + (baseRetentionDays + curFs.extraGalleryDays) * 24 * 60 * 60 * 1000);
        } else {
          // Jika draft belum ada tanggal acara, set sementara dari now
          newExpiry = new Date(now.getTime() + extraDays * 24 * 60 * 60 * 1000);
        }
      }
    }

    // 5. Eksekusi CUSTOM DOMAIN jika ada
    const domainItem = items.find(i => i.type === "CUSTOM_DOMAIN_ADDON");
    const domainToApply = domainItem?.domain || order.requestedDomain || null;

    // 6. Simpan seluruh pembaruan ke invitation
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        featureSettings: JSON.stringify(curFs),
        ...(newExpiry ? { galleryExpiresAt: newExpiry, memoriesUploadLocked: false } : {}),
        ...(domainToApply ? { customDomain: domainToApply } : {}),
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
      linkedOrderId: true,
      userId: true,
    },
  });

  if (!order || order.orderType !== "GALLERY_EXTENSION" || !order.linkedOrderId) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: order.linkedOrderId },
    select: { id: true, galleryExpiresAt: true },
  });

  if (!invitation) return;

  const now = new Date();
  const baseDate = invitation.galleryExpiresAt && invitation.galleryExpiresAt > now
    ? new Date(invitation.galleryExpiresAt)
    : now;

  const newExpiry = new Date(baseDate.getTime() + 30 * 24 * 60 * 60 * 1000);

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      galleryExpiresAt: newExpiry,
      memoriesUploadLocked: false,
    },
  });
}

/**
 * applyCustomDomainAddon
 * Dipanggil setelah order CUSTOM_DOMAIN_ADDON berhasil PAID.
 * Memasang custom domain dan menambahkan 365 hari (1 tahun) ke galleryExpiresAt.
 */
export async function applyCustomDomainAddon(addonOrderId: string): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: addonOrderId },
    select: {
      orderType: true,
      linkedOrderId: true,
      requestedDomain: true,
    },
  });

  if (!order || order.orderType !== "CUSTOM_DOMAIN_ADDON" || !order.linkedOrderId || !order.requestedDomain) return;

  const invitation = await prisma.invitation.findUnique({
    where: { id: order.linkedOrderId },
    select: { id: true, galleryExpiresAt: true },
  });

  if (!invitation) return;

  const now = new Date();
  const baseDate = invitation.galleryExpiresAt && invitation.galleryExpiresAt > now
    ? new Date(invitation.galleryExpiresAt)
    : now;

  const newExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 tahun

  await prisma.invitation.update({
    where: { id: invitation.id },
    data: {
      customDomain: order.requestedDomain,
      galleryExpiresAt: newExpiry,
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
        linkedOrderId: null,
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
 * Dipanggil setelah order UPGRADE atau GALLERY_EXTENSION berhasil PAID.
 *
 * @param paidOrderId - ID order yang baru saja PAID
 */
export async function applyUpgradePlan(paidOrderId: string): Promise<void> {
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

  if (order.orderType === "CUSTOM_DOMAIN_ADDON") {
    await applyCustomDomainAddon(paidOrderId);
    return;
  }

  if (order.orderType !== "UPGRADE") return;
  if (!order.linkedOrderId || !order.targetPlanType) return;

  // Resolusi ID order lama: linkedOrderId bisa berupa ID Order atau ID Invitation
  let targetOrderIdToUpdate = order.linkedOrderId;
  const possibleInv = await prisma.invitation.findUnique({
    where: { id: order.linkedOrderId },
    select: { orderId: true },
  });
  if (possibleInv?.orderId) {
    targetOrderIdToUpdate = possibleInv.orderId;
  }

  // Update planType di order LAMA → tier baru aktif
  await prisma.order.update({
    where: { id: targetOrderIdToUpdate },
    data: { planType: order.targetPlanType },
  });

  // Jika paket upgrade menyertakan custom domain dan target tier memiliki kapabilitas custom_domain
  const canHaveCustomDomain = await hasPlanCapability(order.targetPlanType, "custom_domain");
  if (canHaveCustomDomain && order.requestedDomain) {
    const invitation = await prisma.invitation.findFirst({
      where: {
        OR: [
          { orderId: order.linkedOrderId },
          { id: order.linkedOrderId },
        ],
      },
      select: { id: true, galleryExpiresAt: true },
    });

    if (invitation) {
      const now = new Date();
      const baseDate = invitation.galleryExpiresAt && invitation.galleryExpiresAt > now
        ? new Date(invitation.galleryExpiresAt)
        : now;
      const newExpiry = new Date(baseDate.getTime() + 365 * 24 * 60 * 60 * 1000); // 1 tahun

      await prisma.invitation.update({
        where: { id: invitation.id },
        data: {
          customDomain: order.requestedDomain,
          galleryExpiresAt: newExpiry,
        },
      });
    }
  }
}
