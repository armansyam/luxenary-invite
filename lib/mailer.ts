import nodemailer from "nodemailer";
import { getPublicPlatformSettings } from "./settings";

export interface InvoiceEmailOptions {
  orderId: string;
  orderType: string;
  plan?: string | null;
  amount: number;
  paymentMethod?: string;
  recipientEmail: string;
  recipientName?: string;
  type: "PAID" | "UNPAID";
  appUrl?: string;
}

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
        rejectUnauthorized: false,
      },
    });

    const platformName = settings.platformName || "Platform Kami";
    const feePercent = settings.paymentGatewayFeePercent ?? 0.7;
    const feePayer = settings.paymentGatewayFeePayer || "BUYER";

    const subtotal = opts.amount;
    const feeAmount = feePayer === "BUYER" ? Math.round(subtotal * (feePercent / 100)) : 0;
    const totalAmount = subtotal + feeAmount;

    const invoiceNo = `INV-${opts.orderId.slice(-8).toUpperCase()}`;
    const dateFormatted = new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

    const isPaid = opts.type === "PAID";
    const baseUrl = opts.appUrl || process.env.NEXTAUTH_URL || `https://${process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'}`;

    // Kategori dinamis (Paket vs Galeri Extend)
    const isGallery = opts.orderType === "GALLERY_EXTENSION";
    const categoryTitle = isGallery
      ? "Perpanjangan Galeri Tamu (+30 Hari)"
      : `Aktivasi Paket Undangan — ${opts.plan || "Standar"}`;

    const itemTitle = isGallery
      ? "Perpanjangan Masa Simpan Galeri Tamu (+30 Hari)"
      : `Paket Undangan Digital (${opts.plan || "Standar"})`;

    const itemDesc = isGallery
      ? "Penyimpanan foto momen tamu aktif di cloud storage & subdomain tetap aktif."
      : "Akses tema lengkap, fitur RSVP, check-in QR tamu, dan buku tamu digital.";

    const subject = isPaid
      ? `[LUNAS] Kuitansi Pembayaran: ${categoryTitle} — #${invoiceNo}`
      : `[TAGIHAN] Menunggu Pembayaran: ${categoryTitle} — #${invoiceNo}`;

    const ctaUrl = isPaid
      ? `${baseUrl}/dashboard`
      : `${baseUrl}/checkout?order=${opts.orderId}`;

    const ctaText = isPaid
      ? (isGallery ? "Lihat Galeri Momen Tamu" : "Buka Studio Undangan")
      : "Bayar Tagihan Sekarang";

    const badgeBg = isPaid ? "#d1fae5" : "#fef3c7";
    const badgeText = isPaid ? "#065f46" : "#92400e";
    const badgeLabel = isPaid ? "LUNAS / PAID" : "MENUNGGU PEMBAYARAN";

    const htmlContent = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0c0a09; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f5f5f4; }
    .container { max-width: 600px; margin: 0 auto; padding: 32px 20px; }
    .card { background-color: #1c1917; border: 1px solid #292524; border-radius: 20px; padding: 36px 32px; box-shadow: 0 20px 40px rgba(0,0,0,0.5); }
    .header { text-align: center; border-bottom: 1px solid #292524; padding-bottom: 24px; margin-bottom: 28px; }
    .brand { font-family: 'Cinzel', Georgia, serif; font-size: 18px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #d97706; margin-bottom: 8px; }
    .invoice-title { font-size: 20px; font-weight: 700; color: #ffffff; margin: 0 0 12px 0; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; background-color: ${badgeBg}; color: ${badgeText}; }
    .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .info-grid td { padding: 8px 0; font-size: 13px; }
    .info-label { color: #a8a29e; width: 45%; }
    .info-val { color: #ffffff; font-weight: 600; text-align: right; }
    .table-box { border: 1px solid #292524; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
    .table-box table { width: 100%; border-collapse: collapse; }
    .table-box th { background-color: #292524; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #d6d3d1; text-align: left; }
    .table-box td { padding: 14px 16px; font-size: 13px; border-top: 1px solid #292524; }
    .subtotal-row td { color: #a8a29e; font-size: 12px; }
    .total-row td { background-color: #1f1a14; color: #fbbf24; font-size: 15px; font-weight: 800; }
    .btn-wrap { text-align: center; margin-top: 32px; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #d97706 0%, #b45309 100%); color: #ffffff !important; text-decoration: none; padding: 14px 32px; border-radius: 12px; font-weight: 700; font-size: 14px; box-shadow: 0 10px 20px rgba(217, 119, 6, 0.3); }
    .footer { text-align: center; font-size: 11px; color: #78716c; line-height: 1.6; border-top: 1px solid #292524; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">${platformName}</div>
        <h1 class="invoice-title">FAKTUR PEMBAYARAN</h1>
        <span class="status-badge">${badgeLabel}</span>
      </div>

      <table class="info-grid">
        <tr>
          <td class="info-label">No. Faktur / Invoice</td>
          <td class="info-val font-mono">#${invoiceNo}</td>
        </tr>
        <tr>
          <td class="info-label">Tanggal Transaksi</td>
          <td class="info-val">${dateFormatted}</td>
        </tr>
        <tr>
          <td class="info-label">Ditujukan Kepada</td>
          <td class="info-val">${opts.recipientName || opts.recipientEmail}</td>
        </tr>
        <tr>
          <td class="info-label">Metode Pembayaran</td>
          <td class="info-val">${opts.paymentMethod || "QRIS / Payment Gateway"}</td>
        </tr>
      </table>

      <div class="table-box">
        <table>
          <thead>
            <tr>
              <th>Rincian Layanan</th>
              <th style="text-align: right;">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <div style="font-weight: 700; color: #ffffff;">${itemTitle}</div>
                <div style="font-size: 11px; color: #a8a29e; margin-top: 4px;">${itemDesc}</div>
              </td>
              <td style="text-align: right; font-weight: 600; color: #ffffff;">
                Rp ${subtotal.toLocaleString("id-ID")}
              </td>
            </tr>
            <tr class="subtotal-row">
              <td>Subtotal</td>
              <td style="text-align: right;">Rp ${subtotal.toLocaleString("id-ID")}</td>
            </tr>
            <tr class="subtotal-row">
              <td>Biaya Layanan Aplikasi (${feePercent}%)</td>
              <td style="text-align: right;">
                ${feePayer === "BUYER" ? `Rp ${feeAmount.toLocaleString("id-ID")}` : `<span style="color: #34d399;">Rp 0 (Disubsidi)</span>`}
              </td>
            </tr>
            <tr class="total-row">
              <td>TOTAL PEMBAYARAN</td>
              <td style="text-align: right;">Rp ${totalAmount.toLocaleString("id-ID")}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="btn-wrap">
        <a href="${ctaUrl}" class="btn" target="_blank">${ctaText} &rarr;</a>
      </div>

      <div class="footer">
        <p>Email ini dikirimkan secara otomatis sebagai bukti transaksi yang sah pada sistem <strong>${platformName}</strong>.</p>
        <p>Jika ada pertanyaan atau kendala, silakan hubungi tim kami.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || platformName;

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
