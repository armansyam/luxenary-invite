import { prisma } from "@/lib/prisma";

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
    import("@/lib/mailer").then(({ sendInvoiceEmail }) => {
      sendInvoiceEmail({
        orderId: order.id,
        orderType: order.orderType,
        plan: order.planType,
        amount: Number(order.amount),
        paymentMethod: order.paymentMethod || "QRIS / Payment Gateway",
        recipientEmail: order.user.email,
        recipientName: order.user.name || undefined,
        type: "PAID",
      }).catch(err => console.error("[Payment Webhook] Gagal kirim email PAID:", err));
    });
  }

  if (order.orderType === "GALLERY_EXTENSION") {
    await applyGalleryExtension(paidOrderId);
    return;
  }

  if (order.orderType !== "UPGRADE") return;
  if (!order.linkedOrderId || !order.targetPlanType) return;

  // Update planType di order LAMA → tier baru aktif
  await prisma.order.update({
    where: { id: order.linkedOrderId },
    data: { planType: order.targetPlanType },
  });
}
