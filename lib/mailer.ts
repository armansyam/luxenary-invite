import nodemailer from "nodemailer";
import { prisma } from "./prisma";
import { escapeHtml } from "./escapeHtml";
import { getPublicPlatformSettings, getSmtpSettings } from "./settings";
import { logger } from "./logger";
import { getPlanDisplayName } from "./planUtils";
import {
  ClientActivationEmailOptions,
  InvoiceEmailOptions,
  LoginOtpEmailOptions,
  MemoriesQuotaAlertOptions,
  PartnerPayoutEmailOptions,
  RetentionExpiryAlertOptions,
  TestSmtpOptions,
  buildClientActivationEmailHtml,
  buildInvoiceEmailHtml,
  buildLoginOtpHtml,
  buildMemoriesQuotaHtml,
  buildPartnerPayoutHtml,
  buildProofUploadedAdminHtml,
  buildRetentionExpiryHtml,
  buildTestSmtpHtml,
} from "./email-templates";

export type {
  ClientActivationEmailOptions,
  InvoiceEmailOptions,
  LoginOtpEmailOptions,
  MemoriesQuotaAlertOptions,
  PartnerPayoutEmailOptions,
  RetentionExpiryAlertOptions,
  TestSmtpOptions,
};
export {
  buildClientActivationEmailHtml,
  buildInvoiceEmailHtml,
  buildLoginOtpHtml,
  buildMemoriesQuotaHtml,
  buildPartnerPayoutHtml,
  buildRetentionExpiryHtml,
  buildTestSmtpHtml,
};

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

export async function sendLoginOtpEmail(input: {
  to: string;
  code: string;
  purpose: "CLIENT_REGISTER" | "CLIENT_RESET_PASSWORD" | "PARTNER_ACTIVATE" | "PARTNER_RESET_PASSWORD";
}): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };

    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email kode OTP tidak dapat dikirim", { purpose: input.purpose });
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

    const { subject, html: htmlContent, text: textContent } = buildLoginOtpHtml(
      {
        recipientEmail: input.to,
        code: input.code,
        purpose: input.purpose,
        expiresMinutes: 10,
      },
      { platformName: settings.platformName },
    );

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: input.to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("Mailer", "Email kode OTP terkirim", { recipient: input.to, purpose: input.purpose });
    return { success: true };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email kode OTP", error, { recipient: input.to, purpose: input.purpose });
    return { success: false, error: error.message };
  }
}

export interface PartnerPayoutAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

export async function sendPartnerPayoutEmail(
  opts: PartnerPayoutEmailOptions & { attachment?: PartnerPayoutAttachment | null },
): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };

    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email pencairan komisi mitra dilewati", {
        recipient: opts.recipientEmail,
      });
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

    const { subject, html: htmlContent, text: textContent } = buildPartnerPayoutHtml(opts, {
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
      attachments: opts.attachment
        ? [
            {
              filename: opts.attachment.filename,
              content: opts.attachment.content,
              contentType: opts.attachment.contentType,
            },
          ]
        : undefined,
    });

    logger.info("Mailer", "Email pencairan komisi mitra terkirim", {
      recipient: opts.recipientEmail,
      hasAttachment: Boolean(opts.attachment),
    });
    return { success: true };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email pencairan komisi mitra", error, {
      recipient: opts.recipientEmail,
    });
    return { success: false, error: error.message };
  }
}

export async function sendClientActivationEmail(
  opts: ClientActivationEmailOptions,
): Promise<{ success: boolean; error?: string; platformName?: string }> {
  try {
    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };
    const platformName = settings.platformName || "Luxvite";

    if (!settings.smtpHost || !settings.smtpUser) {
      logger.warn("Mailer", "SMTP belum dikonfigurasi; email aktivasi klien mitra dilewati", {
        recipient: opts.recipientEmail,
        partnerName: opts.partnerName,
      });
      return { success: false, error: "SMTP_NOT_CONFIGURED", platformName };
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

    const { subject, html: htmlContent, text: textContent } = buildClientActivationEmailHtml(opts, {
      platformName,
      appUrl: opts.appUrl,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || platformName;

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.recipientEmail,
      subject,
      text: textContent,
      html: htmlContent,
    });

    logger.info("Mailer", "Email aktivasi klien mitra terkirim", {
      recipient: opts.recipientEmail,
      partnerName: opts.partnerName,
    });
    return { success: true, platformName };
  } catch (error: any) {
    logger.error("Mailer", "Gagal mengirim email aktivasi klien mitra", error, {
      recipient: opts.recipientEmail,
      partnerName: opts.partnerName,
    });
    return { success: false, error: error?.message || "SEND_FAILED" };
  }
}

export async function sendCronFailureAlertEmail(opts: {
  jobName: string;
  summary: string;
  details?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const superAdmins = await prisma.admin.findMany({
      where: { role: "SUPER_ADMIN", email: { not: "" } },
      select: { email: true },
    });
    const recipients = superAdmins.map((a) => a.email.trim()).filter(Boolean);
    if (recipients.length === 0) return { success: false, error: "NO_RECIPIENTS" };

    const settings = { ...(await getPublicPlatformSettings()), ...(await getSmtpSettings()) };
    if (!settings.smtpHost || !settings.smtpUser) {
      return { success: false, error: "SMTP_NOT_CONFIGURED" };
    }

    const platformName = settings.platformName || "Platform Undangan";
    const timeWib = `${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta", dateStyle: "long", timeStyle: "medium" })} WIB`;
    const subject = `[Peringatan Cron] ${opts.jobName} gagal — ${platformName}`;
    const safeJob = escapeHtml(opts.jobName);
    const safeSummary = escapeHtml(opts.summary);
    const safeDetails = opts.details ? escapeHtml(opts.details) : "";

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; color: #1c1917; padding: 24px;">
        <h2 style="margin: 0 0 8px; font-size: 18px; color: #991b1b;">Peringatan Kegagalan Tugas Terjadwal (Cron)</h2>
        <p style="margin: 0 0 16px; font-size: 13px; color: #57534e;">${escapeHtml(platformName)} · ${escapeHtml(timeWib)}</p>
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
          <p style="margin: 0 0 6px; font-size: 13px;"><strong>Tugas:</strong> ${safeJob}</p>
          <p style="margin: 0; font-size: 13px;"><strong>Ringkasan:</strong> ${safeSummary}</p>
        </div>
        ${safeDetails ? `<pre style="background: #f5f5f4; border: 1px solid #e7e5e4; border-radius: 10px; padding: 12px; font-size: 12px; white-space: pre-wrap; word-break: break-word;">${safeDetails}</pre>` : ""}
        <p style="margin: 16px 0 0; font-size: 12px; color: #78716c;">Periksa log server PM2 dan tab Monitoring / Database di panel admin untuk menindaklanjuti.</p>
      </div>
    `;
    const text = `[Peringatan Cron] ${opts.jobName} (${timeWib})\nRingkasan: ${opts.summary}${opts.details ? `\n\nDetail:\n${opts.details}` : ""}`;

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port: settings.smtpPort || 587,
      secure: settings.smtpPort === 465,
      auth: { user: settings.smtpUser, pass: settings.smtpPassword || "" },
      tls: { rejectUnauthorized: process.env.NODE_ENV === "production" },
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || platformName;
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipients,
      subject,
      text,
      html,
    });
    logger.info("Mailer", "Peringatan kegagalan cron terkirim ke SUPER_ADMIN", { jobName: opts.jobName, recipients: recipients.length });
    return { success: true };
  } catch (error) {
    logger.error("Mailer", "Gagal mengirim peringatan kegagalan cron", error, { jobName: opts.jobName });
    return { success: false, error: error instanceof Error ? error.message : "SEND_FAILED" };
  }
}


