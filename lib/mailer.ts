import nodemailer from "nodemailer";
import { getPublicPlatformSettings } from "./settings";
import {
  InvoiceEmailOptions,
  MemoriesQuotaAlertOptions,
  RetentionExpiryAlertOptions,
  TestSmtpOptions,
  buildInvoiceEmailHtml,
  buildMemoriesQuotaHtml,
  buildRetentionExpiryHtml,
  buildTestSmtpHtml,
} from "./email-templates";

export type { InvoiceEmailOptions, MemoriesQuotaAlertOptions, RetentionExpiryAlertOptions, TestSmtpOptions };
export { buildInvoiceEmailHtml, buildMemoriesQuotaHtml, buildRetentionExpiryHtml, buildTestSmtpHtml };

export async function sendInvoiceEmail(opts: InvoiceEmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getPublicPlatformSettings();

    // Graceful check: Jika SMTP belum dikonfigurasi, skip dengan aman tanpa throw error
    if (!settings.smtpHost || !settings.smtpUser) {
      console.log("[Mailer] SMTP belum dikonfigurasi di Admin Settings. Email dilewati.");
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

    const { subject, html: htmlContent } = buildInvoiceEmailHtml(opts, {
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
      html: htmlContent,
    });

    console.log(`[Mailer] Invoice email (${opts.type}) berhasil dikirim ke ${opts.recipientEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Mailer] Gagal mengirim email invoice:", error);
    return { success: false, error: error.message };
  }
}

export async function sendMemoriesQuotaAlertEmail(opts: MemoriesQuotaAlertOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getPublicPlatformSettings();

    // Graceful check: Jika SMTP belum dikonfigurasi, skip dengan aman
    if (!settings.smtpHost || !settings.smtpUser) {
      console.log("[Mailer] SMTP belum dikonfigurasi di Admin Settings. Email peringatan roll dilewati.");
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

    const { subject, html: htmlContent } = buildMemoriesQuotaHtml(opts, {
      platformName: settings.platformName,
      appUrl: opts.appUrl,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`[Mailer] Peringatan kuota roll berhasil dikirim ke ${opts.recipientEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Mailer] Gagal mengirim email peringatan kuota roll:", error);
    return { success: false, error: error.message };
  }
}

export async function sendRetentionExpiryAlertEmail(opts: RetentionExpiryAlertOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const settings = await getPublicPlatformSettings();

    // Graceful check: Jika SMTP belum dikonfigurasi, skip dengan aman
    if (!settings.smtpHost || !settings.smtpUser) {
      console.log("[Mailer] SMTP belum dikonfigurasi di Admin Settings. Email peringatan retensi dilewati.");
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

    const { subject, html: htmlContent } = buildRetentionExpiryHtml(opts, {
      platformName: settings.platformName,
      appUrl: opts.appUrl,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: opts.recipientEmail,
      subject,
      html: htmlContent,
    });

    console.log(`[Mailer] Peringatan retensi berhasil dikirim ke ${opts.recipientEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error("[Mailer] Gagal mengirim email peringatan retensi:", error);
    return { success: false, error: error.message };
  }
}


