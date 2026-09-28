/**
 * ─────────────────────────────────────────────────────────────────────────────
 * LUXENARY / LUXVITE EMAIL TEMPLATE ENGINE
 * Aesthetic System: Warm White Cream & Royal Amber Gold
 * 
 * Modul murni (Zero Node.js dependency):
 * Aman diimpor di Client Component (Preview UI), API Routes, maupun Server Mailer.
 * ─────────────────────────────────────────────────────────────────────────────
 */

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

export interface MemoriesQuotaAlertOptions {
  invitationId: string;
  invitationSlug?: string;
  coupleNames: string;
  usedPhotos: number;
  totalQuota: number;
  remainingPhotos: number;
  milestonePercent?: number;
  recipientEmail: string;
  recipientName?: string;
  appUrl?: string;
}

export interface RetentionExpiryAlertOptions {
  invitationId: string;
  invitationSlug?: string;
  coupleNames: string;
  daysRemaining: number;
  expiryDateFormatted: string;
  totalPhotos: number;
  recipientEmail: string;
  recipientName?: string;
  appUrl?: string;
}

export interface TestSmtpOptions {
  fromName: string;
  smtpHost: string;
  port: number;
  isSecure: boolean;
  smtpUser: string;
  timestamp: string;
}

export interface EmailTemplateMeta {
  key: string;
  name: string;
  category: "TRANSAKSI" | "PERINGATAN" | "SISTEM";
  badgeText: string;
  description: string;
  triggerEvent: string;
  recipientTarget: string;
  samplePayload: any;
  render: (customPayload?: any, settings?: any) => { subject: string; html: string };
}

/**
 * 1. Template Faktur & Kuitansi (UNPAID / PAID)
 */
export function buildInvoiceEmailHtml(
  opts: InvoiceEmailOptions,
  settings?: {
    platformName?: string;
    paymentGatewayFeePercent?: number;
    paymentGatewayFeePayer?: string;
    appUrl?: string;
  }
): { subject: string; html: string } {
  const platformName = settings?.platformName || "LUXVITE";
  const feePercent = settings?.paymentGatewayFeePercent ?? 0.7;
  const feePayer = settings?.paymentGatewayFeePayer || "BUYER";

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
  const baseUrl = opts.appUrl || (typeof window !== "undefined" ? window.location.origin : process.env.NEXTAUTH_URL) || "https://luxvite.id";

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

  const badgeBg = isPaid ? "#E8F5E9" : "#FFF8E1";
  const badgeText = isPaid ? "LUNAS / PAID" : "MENUNGGU PEMBAYARAN";
  const badgeBorder = isPaid ? "#C8E6C9" : "#FFE082";
  const badgeColor = isPaid ? "#1B5E20" : "#92400E";

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1C1917; -webkit-font-smoothing: antialiased; }
    .container { max-width: 600px; margin: 0 auto; padding: 36px 16px; }
    .card { background-color: #FFFFFF; border: 1px solid #EAE4D9; border-radius: 20px; padding: 36px 32px; box-shadow: 0 10px 30px rgba(44, 34, 20, 0.04); }
    .header { text-align: center; border-bottom: 1px solid #EAE4D9; padding-bottom: 24px; margin-bottom: 28px; }
    .brand { font-family: 'Cinzel', Georgia, serif; font-size: 17px; font-weight: 800; letter-spacing: 3px; text-transform: uppercase; color: #B45309; margin-bottom: 8px; }
    .invoice-title { font-size: 20px; font-weight: 700; color: #1C1917; margin: 0 0 12px 0; letter-spacing: -0.2px; }
    .status-badge { display: inline-block; padding: 6px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; }
    .info-grid { width: 100%; border-collapse: collapse; margin-bottom: 28px; }
    .info-grid td { padding: 9px 0; font-size: 13px; }
    .info-label { color: #78716C; width: 45%; }
    .info-val { color: #1C1917; font-weight: 600; text-align: right; }
    .table-box { border: 1px solid #EAE4D9; border-radius: 12px; overflow: hidden; margin-bottom: 28px; }
    .table-box table { width: 100%; border-collapse: collapse; }
    .table-box th { background-color: #FAF7F0; padding: 12px 16px; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #78716C; text-align: left; font-weight: 700; border-bottom: 1px solid #EAE4D9; }
    .table-box td { padding: 14px 16px; font-size: 13px; border-top: 1px solid #F0ECE4; }
    .subtotal-row td { color: #78716C; font-size: 12px; }
    .total-row td { background-color: #FAF5EB; border-top: 2px solid #E8DFCF; color: #92400E; font-size: 15px; font-weight: 800; }
    .btn-wrap { text-align: center; margin-top: 32px; margin-bottom: 24px; }
    .btn { display: inline-block; background: linear-gradient(135deg, #C9A227 0%, #A88218 100%); color: #FFFFFF !important; text-decoration: none; padding: 14px 34px; border-radius: 12px; font-weight: 700; font-size: 14px; letter-spacing: 0.3px; box-shadow: 0 8px 20px rgba(180, 83, 9, 0.22); }
    .footer { text-align: center; font-size: 11px; color: #8C827A; line-height: 1.6; border-top: 1px solid #EAE4D9; padding-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">${platformName}</div>
        <h1 class="invoice-title">FAKTUR PEMBAYARAN</h1>
        <span class="status-badge">${badgeText}</span>
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
                <div style="font-weight: 700; color: #1C1917;">${itemTitle}</div>
                <div style="font-size: 11px; color: #78716C; margin-top: 4px;">${itemDesc}</div>
              </td>
              <td style="text-align: right; font-weight: 600; color: #1C1917;">
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
                ${feePayer === "BUYER" ? `Rp ${feeAmount.toLocaleString("id-ID")}` : `<span style="color: #059669; font-weight: 600;">Rp 0 (Disubsidi)</span>`}
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

  return { subject, html };
}

/**
 * 2. Template Peringatan Kuota Roll Kamera Tamu (50%, 80%, 100%)
 */
export function buildMemoriesQuotaHtml(
  opts: MemoriesQuotaAlertOptions,
  settings?: {
    platformName?: string;
    appUrl?: string;
  }
): { subject: string; html: string } {
  const platformName = settings?.platformName || "LUXVITE";
  const percentUsed = opts.milestonePercent ?? Math.round((opts.usedPhotos / opts.totalQuota) * 100);
  const isFull = percentUsed >= 100;

  const subject = isFull
    ? `[Penuh] Kuota Roll Kamera Tamu Telah Habis — ${opts.coupleNames}`
    : `[Perhatian] Penggunaan Roll Kamera Tamu Telah Mencapai ${percentUsed}% — ${opts.coupleNames}`;

  const titleText = isFull ? "ROLL KAMERA TAMU TELAH PENUH" : `PROGRESS ROLL KAMERA TAMU (${percentUsed}%)`;
  const badgeText = isFull ? "ROLL 100% PENUH" : (percentUsed >= 80 ? `ANTUSIASME TINGGI (${percentUsed}%)` : `SEPARUH ROLL (${percentUsed}%)`);
  const badgeBg = isFull ? "#FEE2E2" : "#FEF3C7";
  const badgeColor = isFull ? "#991B1B" : "#92400E";
  const badgeBorder = isFull ? "#FECACA" : "#FDE68A";

  const baseUrl = opts.appUrl || (typeof window !== "undefined" ? window.location.origin : process.env.NEXTAUTH_URL) || "https://luxvite.id";
  const topupUrl = `${baseUrl}/dashboard/moments`;

  const greetingHtml = isFull
    ? `<p style="margin: 0 0 8px 0; color: #1C1917;">Halo <strong>${opts.recipientName || opts.coupleNames}</strong>,</p>
       <p style="margin: 0; color: #44403C; line-height: 1.6;">Seluruh kapasitas roll kamera kenangan untuk pernikahan Anda saat ini telah terisi penuh sebanyak <strong>${opts.usedPhotos} dari ${opts.totalQuota} foto</strong> (tersisa <strong>0 foto</strong>). Tamu baru saat ini tidak dapat mengunggah foto lagi kecuali kuota roll diperluas.</p>`
    : `<p style="margin: 0 0 8px 0; color: #1C1917;">Halo <strong>${opts.recipientName || opts.coupleNames}</strong>,</p>
       <p style="margin: 0; color: #44403C; line-height: 1.6;">Tamu undangan pernikahan Anda sangat antusias! Saat ini roll kamera kenangan telah terisi sebanyak <strong>${opts.usedPhotos} dari ${opts.totalQuota} foto</strong> (tersisa <strong>${opts.remainingPhotos} foto</strong>).</p>`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1C1917; -webkit-font-smoothing: antialiased; }
    .container { max-width: 560px; margin: 0 auto; padding: 36px 16px; }
    .card { background-color: #FFFFFF; border: 1px solid #EAE4D9; border-radius: 20px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(44, 34, 20, 0.05); }
    .header { text-align: center; border-bottom: 1px solid #EAE4D9; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 800; letter-spacing: 2px; text-transform: uppercase; color: #B45309; margin-bottom: 6px; }
    .title { font-size: 18px; font-weight: 700; color: #1C1917; margin: 0 0 10px 0; letter-spacing: -0.2px; }
    .badge { display: inline-block; padding: 5px 12px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; background-color: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder}; }
    .message-box { background-color: #FAF7F0; border-left: 4px solid ${isFull ? '#DC2626' : '#C9A227'}; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; line-height: 1.6; }
    .meter-container { background-color: #FAF7F0; border: 1px solid #EAE4D9; border-radius: 12px; padding: 20px; margin: 24px 0; text-align: center; }
    .meter-bar-bg { background-color: #E8E2D5; border-radius: 999px; height: 12px; overflow: hidden; margin: 12px 0; }
    .meter-bar-fill { background: ${isFull ? 'linear-gradient(90deg, #EF4444 0%, #DC2626 100%)' : 'linear-gradient(90deg, #C9A227 0%, #B45309 100%)'}; height: 100%; border-radius: 999px; }
    .meter-label { display: flex; justify-content: space-between; font-size: 12px; color: #78716C; font-weight: 600; }
    .btn-wrap { text-align: center; margin: 28px 0 20px 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #C9A227 0%, #A88218 100%); color: #FFFFFF !important; text-decoration: none; padding: 14px 30px; border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; box-shadow: 0 8px 20px rgba(180, 83, 9, 0.22); }
    .footer { text-align: center; font-size: 11px; color: #8C827A; line-height: 1.6; border-top: 1px solid #EAE4D9; padding-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">${platformName}</div>
        <h1 class="title">${titleText}</h1>
        <span class="badge">${badgeText}</span>
      </div>

      <div class="message-box">
        ${greetingHtml}
      </div>

      <div class="meter-container">
        <div class="meter-label">
          <span>Kapasitas Terpakai</span>
          <span style="color: ${isFull ? '#DC2626' : '#B45309'}; font-weight: 700;">${opts.usedPhotos} / ${opts.totalQuota} Foto (${percentUsed}%)</span>
        </div>
        <div class="meter-bar-bg">
          <div class="meter-bar-fill" style="width: ${Math.min(100, percentUsed)}%;"></div>
        </div>
        <div style="font-size: 11px; color: #78716C; margin-top: 6px;">
          ${isFull ? 'Seluruh jatah foto telah digunakan.' : `Sisa jatah jepretan: <strong>${opts.remainingPhotos} foto</strong> sebelum roll penuh.`}
        </div>
      </div>

      <p style="font-size: 12px; color: #78716C; text-align: center; line-height: 1.6;">
        Silakan buka Dasbor Momen Tamu untuk melihat foto-foto yang telah masuk atau memperluas kuota roll foto secara aman langsung dari dasbor Anda:
      </p>

      <div class="btn-wrap">
        <a href="${topupUrl}" class="btn" target="_blank">Buka Dasbor Momen Tamu &rarr;</a>
      </div>

      <div class="footer">
        <p>Pemberitahuan otomatis ini dikirimkan khusus untuk menjaga kelancaran dokumentasi pernikahan Anda di <strong>${platformName}</strong>.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

/**
 * 3. Template Diagnostik Uji Coba Server SMTP
 */
export function buildTestSmtpHtml(opts: TestSmtpOptions): { subject: string; html: string } {
  const subject = `[Uji Coba SMTP] Koneksi Email Berhasil — ${opts.fromName}`;
  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1C1917; -webkit-font-smoothing: antialiased; }
    .container { max-width: 560px; margin: 0 auto; padding: 36px 16px; }
    .card { background-color: #FFFFFF; border: 1px solid #EAE4D9; border-radius: 20px; padding: 32px 28px; box-shadow: 0 10px 30px rgba(44, 34, 20, 0.05); }
    .eyebrow { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 1.5px; color: #B45309; margin-bottom: 8px; }
    .title { margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1C1917; letter-spacing: -0.2px; }
    .lead { font-size: 13px; line-height: 1.6; color: #44403C; margin: 0 0 20px 0; }
    .box { background-color: #FAF7F0; border: 1px solid #EAE4D9; border-radius: 12px; padding: 18px; font-size: 12px; color: #44403C; line-height: 1.8; }
    .box strong { color: #1C1917; }
    .footer { font-size: 12px; color: #8C827A; margin: 20px 0 0 0; border-top: 1px solid #EAE4D9; padding-top: 16px; line-height: 1.5; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="eyebrow">Diagnostik Sistem</div>
      <h2 class="title">Koneksi SMTP Berhasil Diverifikasi</h2>
      <p class="lead">
        Pesan ini dikirim secara langsung dari Dashboard Admin <strong>${opts.fromName}</strong> untuk menguji keabsahan konfigurasi server pengiriman email (SMTP).
      </p>
      <div class="box">
        <div><strong>SMTP Host:</strong> ${opts.smtpHost}</div>
        <div><strong>SMTP Port:</strong> ${opts.port} (${opts.isSecure ? "SSL/TLS" : "STARTTLS"})</div>
        <div><strong>Akun Pengirim:</strong> ${opts.smtpUser}</div>
        <div><strong>Waktu Pengujian:</strong> ${opts.timestamp}</div>
      </div>
      <p class="footer">
        Email transaksi otomatis (invoice tagihan, konfirmasi lunas, dan notifikasi perpanjangan) kini siap digunakan dengan normal.
      </p>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

/**
 * 4. Template Peringatan Masa Aktif Galeri / Retensi Berakhir (H-3 / H-7)
 */
export function buildRetentionExpiryHtml(
  opts: RetentionExpiryAlertOptions,
  settings?: {
    platformName?: string;
    appUrl?: string;
  }
): { subject: string; html: string } {
  const platformName = settings?.platformName || "LUXVITE";
  const baseUrl = opts.appUrl || (typeof window !== "undefined" ? window.location.origin : process.env.NEXTAUTH_URL) || "https://luxvite.id";

  const extendUrl = `${baseUrl}/dashboard/moments`;
  const downloadUrl = `${baseUrl}/dashboard/moments`;

  const subject = `[PENTING] Masa Simpan Galeri Foto Tamu Berakhir dalam ${opts.daysRemaining} Hari — ${opts.coupleNames}`;

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #F7F5F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; color: #1C1917; -webkit-font-smoothing: antialiased; }
    .container { max-width: 580px; margin: 0 auto; padding: 36px 16px; }
    .card { background-color: #FFFFFF; border: 1px solid #EAE4D9; border-radius: 20px; padding: 34px 30px; box-shadow: 0 10px 30px rgba(44, 34, 20, 0.05); }
    .header { text-align: center; border-bottom: 1px solid #EAE4D9; padding-bottom: 22px; margin-bottom: 24px; }
    .brand { font-family: 'Cinzel', Georgia, serif; font-size: 16px; font-weight: 800; letter-spacing: 2.5px; text-transform: uppercase; color: #B45309; margin-bottom: 8px; }
    .title { font-size: 18px; font-weight: 700; color: #1C1917; margin: 0 0 10px 0; letter-spacing: -0.2px; }
    .badge { display: inline-block; padding: 5px 14px; border-radius: 9999px; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase; background-color: #FEF3C7; color: #92400E; border: 1px solid #FDE68A; }
    .message-box { background-color: #FAF7F0; border-left: 4px solid #B45309; border-radius: 8px; padding: 18px; margin: 22px 0; font-size: 13px; line-height: 1.6; color: #44403C; }
    .table-box { width: 100%; border-collapse: collapse; background-color: #FAF7F0; border: 1px solid #EAE4D9; border-radius: 12px; overflow: hidden; margin-bottom: 24px; }
    .table-box td { padding: 14px 16px; font-size: 12px; }
    .cta-container { text-align: center; margin: 28px 0 20px 0; }
    .btn-primary { display: inline-block; background: linear-gradient(135deg, #C9A227 0%, #A88218 100%); color: #FFFFFF !important; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 700; font-size: 13px; letter-spacing: 0.3px; box-shadow: 0 8px 20px rgba(180, 83, 9, 0.22); }
    .btn-secondary { display: inline-block; background: #FAF7F0; color: #78716C !important; text-decoration: none; padding: 12px 24px; border-radius: 12px; font-weight: 600; font-size: 12px; border: 1px solid #EAE4D9; margin-top: 10px; }
    .footer { text-align: center; font-size: 11px; color: #8C827A; line-height: 1.6; border-top: 1px solid #EAE4D9; padding-top: 20px; margin-top: 24px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header">
        <div class="brand">${platformName}</div>
        <h1 class="title">MASA SIMPAN FOTO TAMU SEGERA BERAKHIR</h1>
        <span class="badge">TERAKHIR ${opts.daysRemaining} HARI LAGI</span>
      </div>

      <div class="message-box">
        <p style="margin: 0 0 10px 0; font-weight: 700; color: #1C1917;">Halo ${opts.recipientName || opts.coupleNames},</p>
        <p style="margin: 0; line-height: 1.6;">
          Masa aktif penyimpanan foto kenangan momen pernikahan Anda di cloud storage akan berakhir pada <strong>${opts.expiryDateFormatted}</strong> (tersisa <strong>${opts.daysRemaining} hari lagi</strong>). Sesuai kebijakan retensi sistem, seluruh foto candid yang diunggah para tamu akan diarsipkan dan dibersihkan dari server demi menjaga privasi dan efisiensi penyimpanan data.
        </p>
      </div>

      <table class="table-box">
        <tr>
          <td style="color: #78716C; border-bottom: 1px solid #F0ECE4;">Total Foto Kenangan Tamu:</td>
          <td style="font-weight: 700; color: #1C1917; text-align: right; border-bottom: 1px solid #F0ECE4;"><strong>${opts.totalPhotos} Foto</strong></td>
        </tr>
        <tr>
          <td style="color: #78716C;">Batas Waktu Pengunduhan / Perpanjangan:</td>
          <td style="font-weight: 700; color: #DC2626; text-align: right;"><strong>${opts.expiryDateFormatted}</strong></td>
        </tr>
      </table>

      <p style="font-size: 12px; color: #78716C; text-align: center; line-height: 1.6; margin: 0 0 18px 0;">
        Silakan amankan dokumentasi pernikahan Anda sekarang atau perpanjang masa aktifnya:
      </p>

      <div class="cta-container">
        <div>
          <a href="${extendUrl}" class="btn-primary" target="_blank">
            Perpanjang Masa Simpan (+30 Hari) &rarr;
          </a>
        </div>
        <div>
          <a href="${downloadUrl}" class="btn-secondary" target="_blank">
            Unduh Semua Foto Kenangan (ZIP)
          </a>
        </div>
      </div>

      <div class="footer">
        <p>Pemberitahuan resmi ini dikirimkan otomatis oleh sistem <strong>${platformName}</strong> untuk menjaga keamanan dokumentasi berharga pernikahan Anda.</p>
      </div>
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EMAIL TEMPLATES CATALOGUE
 * Definisi 7 varian lengkap untuk pratinjau dan pengujian di /admin/emails
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const EMAIL_TEMPLATE_CATALOG: EmailTemplateMeta[] = [
  {
    key: "PAID_INVITATION",
    name: "Kuitansi Lunas Aktivasi Undangan",
    category: "TRANSAKSI",
    badgeText: "Lunas / Paid",
    description: "Bukti pembayaran kuitansi resmi lunas yang dikirim otomatis saat klien menyelesaikan checkout paket undangan digital.",
    triggerEvent: "Webhook Midtrans (settlement) atau konfirmasi manual admin",
    recipientTarget: "Klien / Mempelai Pengguna",
    samplePayload: {
      orderId: "ord_lux_88294719",
      orderType: "PACKAGE_ACTIVATION",
      plan: "Royal Diamond Signature",
      amount: 249000,
      paymentMethod: "QRIS Dinamis (GoPay / ShopeePay / BCA)",
      recipientEmail: "amanda.putri@gmail.com",
      recipientName: "Amanda Putri & Arya Pratama",
      type: "PAID",
    },
    render: (overrides = {}, settings = {}) => {
      const merged = {
        orderId: "ord_lux_88294719",
        orderType: "PACKAGE_ACTIVATION",
        plan: "Royal Diamond Signature",
        amount: 249000,
        paymentMethod: "QRIS Dinamis (GoPay / ShopeePay / BCA)",
        recipientEmail: "amanda.putri@gmail.com",
        recipientName: "Amanda Putri & Arya Pratama",
        type: "PAID" as const,
        ...overrides,
      };
      return buildInvoiceEmailHtml(merged, settings);
    },
  },
  {
    key: "UNPAID_INVOICE",
    name: "Faktur Tagihan Menunggu Pembayaran",
    category: "TRANSAKSI",
    badgeText: "Menunggu Pembayaran",
    description: "Faktur tagihan baru beserta rincian pesanan dan instruksi pembayaran yang dikirim sesaat setelah pesanan dibuat.",
    triggerEvent: "Klien mengklik Bayar / Generate Order di Studio atau Checkout",
    recipientTarget: "Klien / Mempelai Pengguna",
    samplePayload: {
      orderId: "ord_lux_73910248",
      orderType: "PACKAGE_ACTIVATION",
      plan: "Emerald Sapphire Premium",
      amount: 149000,
      paymentMethod: "QRIS / Transfer Bank",
      recipientEmail: "dimas.setiawan@gmail.com",
      recipientName: "Dimas & Sarah",
      type: "UNPAID",
    },
    render: (overrides = {}, settings = {}) => {
      const merged = {
        orderId: "ord_lux_73910248",
        orderType: "PACKAGE_ACTIVATION",
        plan: "Emerald Sapphire Premium",
        amount: 149000,
        paymentMethod: "QRIS / Transfer Bank",
        recipientEmail: "dimas.setiawan@gmail.com",
        recipientName: "Dimas & Sarah",
        type: "UNPAID" as const,
        ...overrides,
      };
      return buildInvoiceEmailHtml(merged, settings);
    },
  },
  {
    key: "PAID_EXTENSION",
    name: "Kuitansi Perpanjangan Galeri (+30 Hari)",
    category: "TRANSAKSI",
    badgeText: "Perpanjangan",
    description: "Kuitansi konfirmasi pembayaran perpanjangan retensi penyimpanan galeri foto momen tamu untuk 30 hari ke depan.",
    triggerEvent: "Pembayaran perpanjangan galeri tamu berhasil diselesaikan",
    recipientTarget: "Klien / Pemilik Undangan",
    samplePayload: {
      orderId: "ord_ext_49201852",
      orderType: "GALLERY_EXTENSION",
      plan: "+30 Hari Retensi Cloud",
      amount: 49000,
      paymentMethod: "QRIS Instant",
      recipientEmail: "clarissa.widjaja@gmail.com",
      recipientName: "Clarissa & Kevin",
      type: "PAID",
    },
    render: (overrides = {}, settings = {}) => {
      const merged = {
        orderId: "ord_ext_49201852",
        orderType: "GALLERY_EXTENSION",
        plan: "+30 Hari Retensi Cloud",
        amount: 49000,
        paymentMethod: "QRIS Instant",
        recipientEmail: "clarissa.widjaja@gmail.com",
        recipientName: "Clarissa & Kevin",
        type: "PAID" as const,
        ...overrides,
      };
      return buildInvoiceEmailHtml(merged, settings);
    },
  },
  {
    key: "QUOTA_50",
    name: "Peringatan Kuota Roll Tamu (50%)",
    category: "PERINGATAN",
    badgeText: "Separuh Roll (50%)",
    description: "Notifikasi ramah ketika tamu undangan telah mengunggah 50% dari total kuota kamera roll.",
    triggerEvent: "Upload foto tamu mencapai milestone 50% di endpoint memories",
    recipientTarget: "Mempelai Pemilik Undangan",
    samplePayload: {
      invitationId: "inv_demo_50",
      coupleNames: "Sarah & Dimas",
      usedPhotos: 50,
      totalQuota: 100,
      remainingPhotos: 50,
      milestonePercent: 50,
      recipientEmail: "sarah.dimas@gmail.com",
      recipientName: "Sarah & Dimas",
    },
    render: (overrides = {}, settings = {}) => {
      const merged = {
        invitationId: "inv_demo_50",
        coupleNames: "Sarah & Dimas",
        usedPhotos: 50,
        totalQuota: 100,
        remainingPhotos: 50,
        milestonePercent: 50,
        recipientEmail: "sarah.dimas@gmail.com",
        recipientName: "Sarah & Dimas",
        ...overrides,
      };
      return buildMemoriesQuotaHtml(merged, settings);
    },
  },
  {
    key: "QUOTA_100",
    name: "Peringatan Roll Tamu Penuh (100%)",
    category: "PERINGATAN",
    badgeText: "Roll 100% Penuh",
    description: "Peringatan penting saat kuota kamera roll tamu telah terisi penuh 100% dan tamu tidak dapat mengunggah lagi.",
    triggerEvent: "Foto terakhir terunggah memenuhi kuota maksimum",
    recipientTarget: "Mempelai Pemilik Undangan",
    samplePayload: {
      invitationId: "inv_demo_100",
      coupleNames: "Sarah & Dimas",
      usedPhotos: 100,
      totalQuota: 100,
      remainingPhotos: 0,
      milestonePercent: 100,
      recipientEmail: "sarah.dimas@gmail.com",
      recipientName: "Sarah & Dimas",
    },
    render: (overrides = {}, settings = {}) => {
      const merged = {
        invitationId: "inv_demo_100",
        coupleNames: "Sarah & Dimas",
        usedPhotos: 100,
        totalQuota: 100,
        remainingPhotos: 0,
        milestonePercent: 100,
        recipientEmail: "sarah.dimas@gmail.com",
        recipientName: "Sarah & Dimas",
        ...overrides,
      };
      return buildMemoriesQuotaHtml(merged, settings);
    },
  },
  {
    key: "SMTP_DIAGNOSTIC",
    name: "Diagnostik Koneksi Server SMTP",
    category: "SISTEM",
    badgeText: "Diagnostik Sistem",
    description: "Email pengujian handshake port dan kredensial autentikasi SMTP yang dikirim langsung dari control panel admin.",
    triggerEvent: "Admin mengklik 'Kirim Email Uji Coba' pada pengaturan SMTP",
    recipientTarget: "Administrator",
    samplePayload: {
      fromName: "Luxenary Undangan",
      smtpHost: "smtp.gmail.com",
      port: 587,
      isSecure: false,
      smtpUser: "luxenary.id@gmail.com",
      timestamp: "Senin, 28 September 2026 pukul 15.30 WIB",
    },
    render: (overrides = {}) => {
      const merged = {
        fromName: "Luxenary Undangan",
        smtpHost: "smtp.gmail.com",
        port: 587,
        isSecure: false,
        smtpUser: "luxenary.id@gmail.com",
        timestamp: new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" }),
        ...overrides,
      };
      return buildTestSmtpHtml(merged);
    },
  },
  {
    key: "RETENTION_EXPIRY_WARNING",
    name: "Peringatan Masa Simpan Galeri Berakhir (H-3)",
    category: "PERINGATAN",
    badgeText: "Tersisa 3 Hari",
    description: "Peringatan penting bagi mempelai saat masa simpan foto roll tamu tersisa 3 hari sebelum diarsipkan dan dibersihkan dari cloud storage.",
    triggerEvent: "Cron harian mendeteksi effectiveExpiry berada di rentang H-3 hari pasca acara",
    recipientTarget: "Mempelai / Pemilik Undangan",
    samplePayload: {
      invitationId: "inv_demo_retention",
      coupleNames: "Sarah & Dimas",
      daysRemaining: 3,
      expiryDateFormatted: "1 Oktober 2026",
      totalPhotos: 84,
      recipientEmail: "sarah.dimas@gmail.com",
      recipientName: "Sarah & Dimas",
    },
    render: (overrides = {}, settings = {}) => {
      const merged = {
        invitationId: "inv_demo_retention",
        coupleNames: "Sarah & Dimas",
        daysRemaining: 3,
        expiryDateFormatted: "1 Oktober 2026",
        totalPhotos: 84,
        recipientEmail: "sarah.dimas@gmail.com",
        recipientName: "Sarah & Dimas",
        ...overrides,
      };
      return buildRetentionExpiryHtml(merged, settings);
    },
  },
];
