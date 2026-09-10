import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";
import { getPublicPlatformSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    const isAdmin =
      (session?.user as any)?.isAdmin === true ||
      (session?.user as any)?.role === "SUPER_ADMIN" ||
      (session?.user as any)?.role === "ADMIN";

    if (!session?.user || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const recipientEmail = (body.recipientEmail || session.user.email || "").trim();

    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "Alamat email penerima tidak valid." }, { status: 400 });
    }

    const settings = await getPublicPlatformSettings();

    if (!settings.smtpHost || !settings.smtpUser) {
      return NextResponse.json(
        { error: "Kredensial SMTP belum lengkap di Pengaturan (Host & User wajib diisi)." },
        { status: 400 }
      );
    }

    const port = Number(settings.smtpPort) || 587;
    const isSecure = port === 465;

    const transporter = nodemailer.createTransport({
      host: settings.smtpHost,
      port,
      secure: isSecure,
      auth: {
        user: settings.smtpUser,
        pass: settings.smtpPassword || "",
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    // 1. Verifikasi handshake koneksi SMTP
    await transporter.verify();

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";
    const timestamp = new Date().toLocaleString("id-ID", { dateStyle: "full", timeStyle: "medium" });

    // 2. Kirim email uji coba
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipientEmail,
      subject: `[Uji Coba SMTP] Koneksi Email Berhasil — ${fromName}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 20px; background-color: #fafaf9; border-radius: 16px;">
          <div style="background-color: #ffffff; padding: 28px; border-radius: 12px; border: 1px solid #e7e5e4; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #b45309; margin-bottom: 8px;">Diagnostik Sistem</div>
            <h2 style="margin: 0 0 12px 0; font-size: 20px; font-weight: 700; color: #1c1917;">Koneksi SMTP Berhasil Diverifikasi</h2>
            <p style="font-size: 14px; line-height: 1.6; color: #44403c; margin: 0 0 20px 0;">
              Pesan ini dikirim secara langsung dari Dashboard Admin <strong>${fromName}</strong> untuk menguji keabsahan konfigurasi server pengiriman email (SMTP).
            </p>
            <div style="background-color: #f5f5f4; border-radius: 8px; padding: 16px; font-size: 12px; color: #57534e; line-height: 1.8;">
              <div><strong>SMTP Host:</strong> ${settings.smtpHost}</div>
              <div><strong>SMTP Port:</strong> ${port} (${isSecure ? "SSL/TLS" : "STARTTLS"})</div>
              <div><strong>Akun Pengirim:</strong> ${settings.smtpUser}</div>
              <div><strong>Waktu Pengujian:</strong> ${timestamp}</div>
            </div>
            <p style="font-size: 12px; color: #78716c; margin: 20px 0 0 0; border-top: 1px solid #f5f5f4; pt: 16px;">
              Email transaksi otomatis (invoice tagihan, konfirmasi lunas, dan notifikasi perpanjangan) kini siap digunakan dengan normal.
            </p>
          </div>
        </div>
      `,
    });

    return NextResponse.json({
      success: true,
      message: `Email uji coba berhasil dikirim ke ${recipientEmail}. Handshake SMTP berfungsi normal.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/test-smtp error:", error);
    return NextResponse.json(
      {
        error: error.message || "Gagal menghubungi server SMTP. Periksa kembali host, port, dan kata sandi aplikasi.",
      },
      { status: 400 }
    );
  }
}
