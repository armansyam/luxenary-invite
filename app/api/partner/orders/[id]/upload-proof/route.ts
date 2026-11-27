import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { PARTNER_COOKIE_NAME, getPartnerSessionFromRequest } from "@/lib/partnerAuth";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { deleteFile, uploadPrivateFile } from "@/lib/storage";
import { purgeObsoleteUserOrders } from "@/lib/upgradeHelper";
import { getTrustedAppUrl } from "@/lib/serverDomainUtils";
import { exceedsDeclaredBodySize } from "@/lib/requestLimits";
import { isPartnerWholesaleInvoice } from "@/lib/clientActivation";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_PROOF_BYTES = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getPartnerSessionFromRequest(req);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const partner = await prisma.partnerAffiliate.findUnique({
      where: { id: session.partnerId },
      select: { id: true, name: true, email: true, isActive: true, sessionVersion: true },
    });

    if (!partner || !partner.isActive) {
      return NextResponse.json({ error: "Akun mitra tidak aktif." }, { status: 403 });
    }

    if (session.sv !== partner.sessionVersion) {
      const expired = NextResponse.json(
        { error: "Sesi mitra telah berakhir. Silakan masuk kembali." },
        { status: 401 },
      );
      expired.cookies.set(PARTNER_COOKIE_NAME, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
      return expired;
    }

    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { id: true, name: true, email: true, provisionedByPartnerId: true },
        },
      },
    });

    if (!order || order.user?.provisionedByPartnerId !== partner.id || !isPartnerWholesaleInvoice(order.invoiceNumber)) {
      return NextResponse.json({ error: "Tagihan tidak ditemukan pada akun mitra Anda." }, { status: 404 });
    }

    if (order.status === "PAID") {
      return NextResponse.json({ error: "Tagihan ini sudah lunas." }, { status: 400 });
    }

    const platformMode = (await prisma.adminSetting.findUnique({ where: { key: "payment_mode" } }))?.value;
    if (platformMode !== "MANUAL" && order.paymentMethod !== "MANUAL_TRANSFER" && !order.proofImageUrl) {
      return NextResponse.json(
        { error: "Transfer manual tidak aktif. Selesaikan pembayaran lewat QRIS / Payment Gateway." },
        { status: 409 },
      );
    }

    if (exceedsDeclaredBodySize(req, MAX_PROOF_BYTES + 512 * 1024)) {
      return NextResponse.json({ error: "Ukuran file bukti transfer maksimal 10 MB." }, { status: 413 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0 || file.size > MAX_PROOF_BYTES) {
      return NextResponse.json(
        { error: "Unggah file bukti transfer (JPG, PNG, WebP, atau PDF maksimal 10 MB)." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const mime = file.type.toLowerCase();
    const now = new Date();
    const datePrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;
    const partnerSlug = partner.name.toLowerCase().replace(/[^a-z0-9]+/g, "_").slice(0, 20) || "mitra";
    const proofBaseName = `${datePrefix}-wo_${partnerSlug}-${randomBytes(12).toString("hex")}`;

    let proofRef: string;
    if (mime.includes("pdf")) {
      if (buffer.subarray(0, 4).toString("latin1") !== "%PDF") {
        return NextResponse.json({ error: "File PDF tidak valid." }, { status: 400 });
      }
      proofRef = await uploadPrivateFile(buffer, `proofs/${proofBaseName}.pdf`, "application/pdf");
    } else {
      try {
        const compressedWebp = await sharp(buffer)
          .rotate()
          .resize({ width: 1400, height: 2000, fit: "inside", withoutEnlargement: true })
          .webp({ quality: 82, effort: 4 })
          .toBuffer();
        proofRef = await uploadPrivateFile(compressedWebp, `proofs/${proofBaseName}.webp`, "image/webp");
      } catch {
        return NextResponse.json(
          { error: "File bukan gambar atau PDF yang valid. Unggah JPG, PNG, WebP, atau PDF." },
          { status: 400 },
        );
      }
    }

    const saved = await prisma.order.updateMany({
      where: { id: order.id, status: "PENDING" },
      data: {
        paymentMethod: "MANUAL_TRANSFER",
        proofImageUrl: proofRef,
        proofUploadedAt: now,
        status: "PENDING",
        paidAt: null,
        rejectReason: null,
      },
    });

    if (saved.count === 0) {
      await deleteFile(proofRef);
      return NextResponse.json({ error: "Tagihan sudah diproses sebelumnya." }, { status: 409 });
    }

    if (order.proofImageUrl && order.proofImageUrl !== proofRef) {
      await deleteFile(order.proofImageUrl);
    }
    await purgeObsoleteUserOrders(order.userId, order.id);

    const updatedOrder = await prisma.order.findUniqueOrThrow({ where: { id: order.id } });
    const isReupload = Boolean(order.proofImageUrl);

    // Notifikasi admin di latar agar admin bisa segera klik Approve
    (async () => {
      const admins = await prisma.admin.findMany({ select: { email: true, role: true, permissions: true } });
      const { sendProofUploadedAdminAlertEmail } = await import("@/lib/mailer");
      await sendProofUploadedAdminAlertEmail({
        invoiceNumber: updatedOrder.invoiceNumber,
        orderType: updatedOrder.orderType,
        planType: updatedOrder.planType,
        targetPlanType: updatedOrder.targetPlanType,
        amount: Number(updatedOrder.amount),
        clientName: `${order.user?.name || "Klien"} (via Mitra: ${partner.name})`,
        clientEmail: partner.email || order.user?.email || "",
        uploadedAt: updatedOrder.proofUploadedAt ?? now,
        isReupload,
        recipientEmails: admins.filter((a) => hasAdminPermission(a, "orders")).map((a) => a.email),
        appUrl: await getTrustedAppUrl(),
      });
    })().catch((err) =>
      logger.error("PartnerUploadProof", "Gagal mengirim notifikasi bukti transfer mitra ke admin", err, {
        orderId: order.id,
      }),
    );

    return NextResponse.json({
      success: true,
      message:
        "Bukti transfer berhasil diunggah. Setelah diverifikasi Admin, paket otomatis aktif dan email aktivasi 48 jam langsung terkirim ke pengantin.",
      hasProof: true,
      proofUploadedAt: updatedOrder.proofUploadedAt,
    });
  } catch (error) {
    return routeError("PartnerUploadProof", error, "Gagal mengunggah bukti transfer mitra.");
  }
}
