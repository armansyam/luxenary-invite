import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import nodemailer from "nodemailer";
import { getPublicPlatformSettings } from "@/lib/settings";
import { EMAIL_TEMPLATE_CATALOG } from "@/lib/email-templates";

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
    const { templateKey, recipientEmail: customRecipient, customOverrides } = body;

    const recipientEmail = (customRecipient || session.user.email || "").trim();
    if (!recipientEmail || !recipientEmail.includes("@")) {
      return NextResponse.json({ error: "Alamat email penerima tidak valid." }, { status: 400 });
    }

    const template = EMAIL_TEMPLATE_CATALOG.find((t) => t.key === templateKey);
    if (!template) {
      return NextResponse.json({ error: `Template email '${templateKey}' tidak ditemukan.` }, { status: 404 });
    }

    const settings = await getPublicPlatformSettings();

    if (!settings.smtpHost || !settings.smtpUser) {
      return NextResponse.json(
        {
          error: "Server SMTP belum dikonfigurasi di Pengaturan Admin (Host & User wajib diisi).",
        },
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
        rejectUnauthorized: process.env.NODE_ENV === "production",
      },
    });

    const overrides = {
      ...(template.samplePayload || {}),
      recipientEmail,
      ...(customOverrides || {}),
    };

    const { subject, html, text } = template.render(overrides, {
      platformName: settings.platformName || "LUXVITE",
      paymentGatewayFeePercent: settings.paymentGatewayFeePercent,
      paymentGatewayFeePayer: settings.paymentGatewayFeePayer,
    });

    const fromAddress = settings.smtpFromEmail || settings.smtpUser;
    const fromName = settings.smtpFromName || settings.platformName || "Platform Undangan";

    await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: recipientEmail,
      subject: `Pratinjau: ${subject}`,
      text,
      html,
    });

    return NextResponse.json({
      success: true,
      message: `Sampel "${template.name}" berhasil dikirim ke ${recipientEmail}.`,
    });
  } catch (error: any) {
    console.error("POST /api/admin/emails/preview-send error:", error);
    return NextResponse.json(
      {
        error: error.message || "Gagal mengirim sampel email. Periksa koneksi SMTP Anda.",
      },
      { status: 400 }
    );
  }
}
