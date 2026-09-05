import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";
import { sendInvoiceEmail } from "@/lib/mailer";

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

  // Update planType di order LAMA → tier baru aktif
  await prisma.order.update({
    where: { id: order.linkedOrderId },
    data: { planType: order.targetPlanType },
  });

  // Jika paket upgrade ke PREMIUM dan menyertakan custom domain (order.requestedDomain)
  if (order.targetPlanType === "PREMIUM" && order.requestedDomain) {
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
