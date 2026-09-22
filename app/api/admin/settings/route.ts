import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export const dynamic = "force-dynamic";

async function verifyAdminSession() {
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "SUPER_ADMIN" || (session?.user as any)?.role === "ADMIN";
  if (!session?.user || !isAdmin) {
    return false;
  }
  return true;
}

// Default seeds for AdminSetting
const DEFAULT_SETTINGS: Array<{ key: string; value: string; label: string; group: string }> = [
  { key: "platform_name", value: "Sistem Undangan", label: "Nama Platform", group: "platform" },
  { key: "platform_url", value: "", label: "URL Platform (APP_URL)", group: "platform" },
  { key: "support_email", value: "", label: "Email Support", group: "platform" },
  { key: "support_whatsapp", value: "", label: "Nomor WhatsApp Support / Admin", group: "platform" },
  { key: "server_public_ip", value: "", label: "IP Public Server (Record A)", group: "setup" },
  { key: "cname_target", value: "", label: "Host Target CNAME (Custom Domain)", group: "setup" },
  { key: "custom_domain_enabled", value: "true", label: "Aktifkan Fitur Custom Domain Klien", group: "setup" },
  { key: "hero_tagline", value: "Undangan Pernikahan Digital Elegan, Hangat & Berkelas", label: "Tagline Hero", group: "platform" },
  { key: "hero_subtitle", value: "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.", label: "Deskripsi Hero", group: "platform" },
  { key: "service_status_mode", value: "OPEN", label: "Status Layanan & Pendaftaran (OPEN/CLOSED_ORDER/MAINTENANCE/COMING_SOON)", group: "platform" },
  { key: "service_status_title", value: "", label: "Judul Pengumuman Status Layanan", group: "platform" },
  { key: "service_status_message", value: "", label: "Pesan Penjelasan Status Layanan", group: "platform" },
  { key: "service_status_reopen_date", value: "", label: "Estimasi Dibuka Kembali", group: "platform" },
  { key: "service_status_contact_wa", value: "", label: "Nomor WhatsApp Kontak / Waiting List", group: "platform" },
  { key: "midtrans_server_key", value: "", label: "Server Key Midtrans", group: "midtrans" },
  { key: "midtrans_client_key", value: "", label: "Client Key Midtrans", group: "midtrans" },
  { key: "midtrans_environment", value: "sandbox", label: "Mode Lingkungan Midtrans (sandbox/production)", group: "midtrans" },
  { key: "midtrans_sandbox_client_key", value: "", label: "Client Key Midtrans (Sandbox)", group: "midtrans" },
  { key: "midtrans_sandbox_server_key", value: "", label: "Server Key Midtrans (Sandbox)", group: "midtrans" },
  { key: "midtrans_production_client_key", value: "", label: "Client Key Midtrans (Produksi)", group: "midtrans" },
  { key: "midtrans_production_server_key", value: "", label: "Server Key Midtrans (Produksi)", group: "midtrans" },
  { key: "xendit_api_key", value: "", label: "Secret API Key Xendit", group: "xendit" },
  { key: "xendit_webhook_token", value: "", label: "Webhook Token Xendit", group: "xendit" },
  { key: "google_auth_enabled", value: "true", label: "Aktifkan Login Google", group: "google" },
  { key: "google_client_id", value: "", label: "Google Client ID", group: "google" },
  { key: "google_client_secret", value: "", label: "Google Client Secret", group: "google" },
  { key: "desc_tier1", value: "Paket Intim & Esensial — Undangan Digital Berkelas, Musik & RSVP Online", label: "Deskripsi Paket Tier 1", group: "pricing" },
  { key: "desc_tier2", value: "Paket Harmoni Pesta — Dilengkapi Resepsionis QR Check-In & Kamera Momen Tamu", label: "Deskripsi Paket Tier 2", group: "pricing" },
  { key: "desc_tier3", value: "Paket Mahakarya Abadi — All-Inclusive dengan Custom Domain Pribadi (.com/.id) & Kuota Maksimal", label: "Deskripsi Paket Tier 3", group: "pricing" },
  // Biaya gateway — dikonfigurasi dinamis agar tidak perlu edit kode saat tarif berubah
  { key: "payment_fee_payer", value: "MERCHANT", label: "Penanggung Fee Gateway (MERCHANT/BUYER)", group: "payment" },
  { key: "payment_gateway_fee_percent", value: "0.7", label: "Tarif Fee Gateway (%)", group: "payment" },
  { key: "payment_fee_rate", value: "0.007", label: "Tarif Fee Gateway (desimal, contoh: 0.007 = 0.7%)", group: "payment" },
  { key: "payment_expiry_minutes", value: "60", label: "Masa Berlaku Tagihan (menit)", group: "payment" },
  { key: "payment_mode", value: "BOTH", label: "Mode Pembayaran (BOTH/GATEWAY/MANUAL)", group: "payment" },
  { key: "payment_invoice_prefix", value: "Tagihan Pembayaran", label: "Prefix Invoice Gateway", group: "payment" },
  // Server email SMTP
  { key: "smtp_host", value: "", label: "Host SMTP", group: "platform" },
  { key: "smtp_port", value: "587", label: "Port SMTP", group: "platform" },
  { key: "smtp_user", value: "", label: "Username / Email SMTP", group: "platform" },
  { key: "smtp_password", value: "", label: "Password SMTP", group: "platform" },
  { key: "smtp_from_email", value: "", label: "Email Pengirim", group: "platform" },
  { key: "smtp_from_name", value: "Billing & Finance", label: "Nama Pengirim", group: "platform" },
  // Gateway 2-arah aktif — admin pilih dari sini tanpa deploy ulang
  { key: "active_payment_gateway", value: "midtrans", label: "Gateway Pembayaran Aktif (midtrans/xendit)", group: "payment" },
  { key: "bank_name", value: "", label: "Nama Bank Transfer Manual", group: "payment" },
  { key: "bank_account_number", value: "", label: "Nomor Rekening Bank", group: "payment" },
  { key: "bank_account_holder", value: "", label: "Nama Pemilik Rekening", group: "payment" },
  { key: "bank_instructions", value: "Silakan transfer tepat sesuai total tagihan invoice. Setelah transfer, unggah foto bukti transfer di bawah ini untuk diverifikasi admin.", label: "Instruksi Transfer Manual", group: "payment" },
  { key: "backup_auto_enabled", value: "true", label: "Auto-Backup Harian Aktif", group: "backup" },
  { key: "backup_auto_time", value: "02:00", label: "Waktu Eksekusi Auto-Backup (HH:mm)", group: "backup" },
  { key: "backup_path", value: "./data/backups", label: "Path Direktori Backup", group: "backup" },
  { key: "backup_retention_count", value: "10", label: "Batas Jumlah Snapshot Disimpan", group: "backup" },
  { key: "subdomain_grace_days", value: "7", label: "Masa Tenggang Subdomain (Hari Pasca Acara)", group: "subdomain" },
  { key: "subdomain_auto_recycle", value: "true", label: "Otomatis Lepas Subdomain ke Pool", group: "subdomain" },
  // Retensi order — terpisah dari retensi undangan
  { key: "retention_order_days", value: "90", label: "Pembersihan Order Lama EXPIRED/FAILED/PENDING (Hari)", group: "subdomain" },
  // Batas upload file media
  { key: "max_upload_mb", value: "5", label: "Batas Upload Foto Tamu Memories (MB)", group: "setup" },
  { key: "max_video_upload_mb", value: "50", label: "Batas Upload Video Studio (MB)", group: "setup" },
  { key: "max_photo_upload_mb", value: "15", label: "Batas Upload Foto Studio (MB)", group: "setup" },
  { key: "memories_notify_milestones", value: "50,80,100", label: "Milestone Peringatan Kuota Roll Tamu (%)", group: "setup" },
];

async function seedDefaultSettings() {
  for (const s of DEFAULT_SETTINGS) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      create: s,
      update: {},
    });
  }
}

export async function GET() {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const settingCount = await prisma.adminSetting.count();
    if (settingCount === 0) {
      await seedDefaultSettings();
    }
    const settings = await prisma.adminSetting.findMany({
      orderBy: [{ group: "asc" }, { key: "asc" }],
    });
    const grouped: Record<string, Record<string, string>> = {};
    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = {};
      grouped[s.group][s.key] = s.value;
    }
    return NextResponse.json(
      { success: true, settings, grouped },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const isAuthorized = await verifyAdminSession();
    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const body = await req.json();
    const updates = Array.isArray(body) ? body : [body];
    const results = [];
    
    // Map of setting keys to environment variables
    const envKeyMap: Record<string, string> = {
      google_client_id: "GOOGLE_CLIENT_ID",
      google_client_secret: "GOOGLE_CLIENT_SECRET",
      platform_url: "APP_URL",
    };

    const envUpdates: Record<string, string> = {};

    for (const { key, value, group } of updates) {
      if (!key) continue;
      const strVal = String(value ?? "");
      const updated = await prisma.adminSetting.upsert({
        where: { key },
        create: { key, value: strVal, group: group || "general" },
        update: { value: strVal, ...(group ? { group } : {}) },
      });
      results.push(updated);

      if (envKeyMap[key]) {
        const envVar = envKeyMap[key];
        process.env[envVar] = strVal;
        envUpdates[envVar] = strVal;
      }

      // Sync Cloudflare R2 Object Lifecycle dynamically if retention setting is updated
      if (key === "retention_cleanup_days") {
        const retentionDays = Number(strVal);
        if (!isNaN(retentionDays) && retentionDays > 0) {
          import("@/lib/storage").then(({ syncR2LifecycleRule }) => {
            syncR2LifecycleRule(retentionDays).catch(console.error);
          });
        }
      }
    }

    // Sinkronisasi otomatis ke key legacy midtrans_client_key & midtrans_server_key sesuai mode aktif
    const hasMidtransUpdates = updates.some((u: any) => u.key && String(u.key).startsWith("midtrans_"));
    if (hasMidtransUpdates) {
      try {
        const mtSettings = await prisma.adminSetting.findMany({
          where: {
            key: {
              in: [
                "midtrans_environment",
                "midtrans_sandbox_client_key",
                "midtrans_sandbox_server_key",
                "midtrans_production_client_key",
                "midtrans_production_server_key",
              ],
            },
          },
        });
        const mtMap: Record<string, string> = {};
        mtSettings.forEach((s) => (mtMap[s.key] = s.value?.trim() || ""));
        const isProd = mtMap["midtrans_environment"] === "production";
        const activeClient = isProd ? (mtMap["midtrans_production_client_key"] || "") : (mtMap["midtrans_sandbox_client_key"] || "");
        const activeServer = isProd ? (mtMap["midtrans_production_server_key"] || "") : (mtMap["midtrans_sandbox_server_key"] || "");

        if (activeClient) {
          await prisma.adminSetting.upsert({
            where: { key: "midtrans_client_key" },
            create: { key: "midtrans_client_key", value: activeClient, group: "midtrans" },
            update: { value: activeClient },
          });
        }
        if (activeServer) {
          await prisma.adminSetting.upsert({
            where: { key: "midtrans_server_key" },
            create: { key: "midtrans_server_key", value: activeServer, group: "midtrans" },
            update: { value: activeServer },
          });
        }
      } catch (syncErr) {
        console.warn("[Admin Settings] Gagal sinkronisasi legacy Midtrans keys:", syncErr);
      }
    }

    // On-demand revalidation: perbarui cache landing page jika setting harga/platform berubah
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/");
    } catch (e) {
      console.warn("[settings revalidatePath error]", e);
    }

    return NextResponse.json({ success: true, updated: results });
  } catch (error: any) {
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message }, { status: 500 });
  }
}
