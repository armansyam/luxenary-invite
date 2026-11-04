import nodemailer from "nodemailer";
import { getPublicPlatformSettings, getSmtpSettings } from "./settings";
import { logger } from "./logger";
import { getPlanDisplayName } from "./planUtils";
import {
  InvoiceEmailOptions,
  MemoriesQuotaAlertOptions,
  RetentionExpiryAlertOptions,
  TestSmtpOptions,
  buildInvoiceEmailHtml,
  buildMemoriesQuotaHtml,
  buildProofUploadedAdminHtml,
  buildRetentionExpiryHtml,
  buildTestSmtpHtml,
} from "./email-templates";

export type { InvoiceEmailOptions, MemoriesQuotaAlertOptions, RetentionExpiryAlertOptions, TestSmtpOptions };
export { buildInvoiceEmailHtml, buildMemoriesQuotaHtml, buildRetentionExpiryHtml, buildTestSmtpHtml };

export interface ProofUploadedAdminAlertInput {
  invoiceNumber: string;
  orderType: string;
  planType: string;
  targetPlanType?: string | null;
  amount: number;
  clientName?: string | null;
  clientEmail: string;
  uploadedAt: Date;
  isReupload: boolean;
  recipientEmails: string[];
  appUrl: string;
}

/** Label pesanan sama dengan kolom Pesanan di tab Order admin. */
export function proofOrderLabel(
  input: Pick<ProofUploadedAdminAlertInput, "orderType" | "planType" | "targetPlanType">,
  packages?: Array<{ id: string; name: string }>
): string {
  if (input.orderType === "MEMORIES_TOPUP") return "Top-Up Kuota Momen Foto";
  if (input.orderType === "GALLERY_EXTENSION") return "Perpanjang Masa Aktif (+30 Hari)";
  if (input.orderType === "UPGRADE") return `Upgrade ke ${getPlanDisplayName(input.targetPlanType || input.planType, packages)}`;
  return `Paket ${getPlanDisplayName(input.planType, packages)}`;
}

export async function sendProofUploadedAdminAlertEmail(input: ProofUploadedAdminAlertInput): Promise<{ success: boolean; error?: string }> {
  try {
    if (input.recipientEmails.length === 0) {
      logger.warn("Mailer", "Tidak ada admin dengan akses Order; email bukti transfer dilewati", { invoice: input.invoiceNumber });
      return { success: false, error: "NO_RECIPIENTS" };
    }

    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };

    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email bukti transfer ke admin dilewati", { invoice: input.invoiceNumber });
      return { success: false, error: "SMTP_NOT_CONFIGURED" };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || "",
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const { subject, html: htmlContent, text: textContent } = buildProofUploadedAdminHtml(
      {
        invoiceNumber: input.invoiceNumber,
        itemLabel: proofOrderLabel(input, settings.packages),
        amount: input.amount,
        clientName: input.clientName || undefined,
        clientEmail: input.clientEmail,
        uploadedAtFormatted: `${input.uploadedAt.toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long", timeStyle: "short" })} WIB`,
        isReupload: input.isReupload,
        appUrl: input.appUrl,
      },
      { platformName: settings.platformName, appUrl: input.appUrl }
    );

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.recipientEmails,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("Mailer", "Email bukti transfer terkirim ke admin", { invoice: input.invoiceNumber, recipients: input.recipientEmails.length });
    return { success: true };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email bukti transfer ke admin", error, { invoice: input.invoiceNumber });
    return { success: false, error: error.message };
  }
}

export async function sendInvoiceEmail(opts: InvoiceEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };

    // Graceful check: Jika SMTP belum dikonfigurasi, skip dengan aman tanpa throw error
    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email invoice dilewati", { type: opts.type });
      return { success: false, error: "SMTP_NOT_CONFIGURED" };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || "",
      },
      tls: {
        // Production: wajib verifikasi sertifikat TLS untuk mencegah MITM pada email invoice.
        // Development/staging: boleh false untuk mendukung Mailhog / SMTP self-signed cert lokal.
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const { subject, html: htmlContent, text: textContent } = buildInvoiceEmailHtml(opts, {
      platformName: settings.platformName,
      paymentGatewayFeePercent: settings.paymentGatewayFeePercent,
      paymentGatewayFeePayer: settings.paymentGatewayFeePayer,
      appUrl: opts.appUrl,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("Mailer", "Email invoice terkirim", { type: opts.type, recipient: opts.recipientEmail });
    return { success: true };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email invoice", error, { type: opts.type, recipient: opts.recipientEmail });
    return { success: false, error: error.message };
  }
}

export async function sendMemoriesQuotaAlertEmail(opts: MemoriesQuotaAlertOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };

    // Graceful check: Jika SMTP belum dikonfigurasi, skip dengan aman
    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email peringatan kuota roll dilewati");
      return { success: false, error: "SMTP_NOT_CONFIGURED" };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || "",
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const { subject, html: htmlContent, text: textContent } = buildMemoriesQuotaHtml(opts, {
      platformName: settings.platformName,
      appUrl: opts.appUrl,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("Mailer", "Email peringatan kuota roll terkirim", { recipient: opts.recipientEmail });
    return { success: true };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email peringatan kuota roll", error, { recipient: opts.recipientEmail });
    return { success: false, error: error.message };
  }
}

export async function sendRetentionExpiryAlertEmail(opts: RetentionExpiryAlertOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };

    // Graceful check: Jika SMTP belum dikonfigurasi, skip dengan aman
    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email peringatan retensi dilewati");
      return { success: false, error: "SMTP_NOT_CONFIGURED" };
    }

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || "",
      },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const { subject, html: htmlContent, text: textContent } = buildRetentionExpiryHtml(opts, {
      platformName: settings.platformName,
      appUrl: opts.appUrl,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("Mailer", "Email peringatan retensi terkirim", { recipient: opts.recipientEmail });
    return { success: true };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email peringatan retensi", error, { recipient: opts.recipientEmail });
    return { success: false, error: error.message };
  }
}


