import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";
import { getPublicPlatformSettings } from "@/lib/settings";
import { buildTestSmtpHtml } from "@/lib/email-templates";

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

    const { subject, html, text } = buildTestSmtpHtml({
      fromName,
      smtpHost: settings.smtpHost,
      port,
      isSecure,
      smtpUser: settings.smtpUser,
      timestamp,
    });

    // 2. Kirim email uji coba
    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipientEmail,
      subject,
      text,
      html,
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
