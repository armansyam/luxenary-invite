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
  { key: "platform_name", value: "Luxenary Invite", label: "Nama Platform", group: "platform" },
  { key: "platform_url", value: "http://localhost:3000", label: "URL Platform (APP_URL)", group: "platform" },
  { key: "support_email", value: "support@luxenary.id", label: "Email Support", group: "platform" },
  { key: "support_whatsapp", value: "6281234567890", label: "Nomor WhatsApp Support / Admin", group: "platform" },
  { key: "hero_tagline", value: "Undangan Pernikahan Digital Elegan, Hangat & Berkelas", label: "Tagline Hero", group: "platform" },
  { key: "hero_subtitle", value: "Didesain khusus dengan sentuhan estetika mewah dan eksklusif. Hadirkan pengalaman berkesan dengan layout split desktop, custom subdomain, buku tamu real-time, dan video booth ucapan.", label: "Deskripsi Hero", group: "platform" },
  { key: "ipaymu_mode", value: "sandbox", label: "Mode iPaymu (sandbox/production)", group: "ipaymu" },
  { key: "ipaymu_va", value: "", label: "Virtual Account iPaymu", group: "ipaymu" },
  { key: "ipaymu_api_key", value: "", label: "API Key iPaymu", group: "ipaymu" },
  { key: "google_auth_enabled", value: "true", label: "Aktifkan Login Google", group: "google" },
  { key: "google_client_id", value: "", label: "Google Client ID", group: "google" },
  { key: "google_client_secret", value: "", label: "Google Client Secret", group: "google" },
  { key: "name_traditional", value: "Traditional", label: "Nama Paket Traditional", group: "pricing" },
  { key: "name_modern", value: "Modern", label: "Nama Paket Modern", group: "pricing" },
  { key: "name_premium", value: "Premium", label: "Nama Paket Premium", group: "pricing" },
  { key: "price_traditional", value: "50000", label: "Harga Paket Traditional (IDR)", group: "pricing" },
  { key: "price_modern", value: "100000", label: "Harga Paket Modern (IDR)", group: "pricing" },
  { key: "price_premium", value: "120000", label: "Harga Paket Premium (IDR)", group: "pricing" },
  { key: "desc_traditional", value: "Tema Standart — Elegan, Bernuansa Tradisional", label: "Deskripsi Paket Traditional", group: "pricing" },
  { key: "desc_modern", value: "Tema Premium — Sinematik, Editorial, Kontemporer", label: "Deskripsi Paket Modern", group: "pricing" },
  { key: "desc_premium", value: "Tema Premium — Editorial, Full-Text & Luxury Visual Motion", label: "Deskripsi Paket Premium", group: "pricing" },
  { key: "backup_auto_enabled", value: "true", label: "Auto-Backup Harian Aktif", group: "backup" },
  { key: "backup_auto_time", value: "02:00", label: "Waktu Eksekusi Auto-Backup (HH:mm)", group: "backup" },
  { key: "backup_path", value: "/data/backups", label: "Path Direktori Backup", group: "backup" },
  { key: "backup_retention_count", value: "10", label: "Batas Jumlah Snapshot Disimpan", group: "backup" },
  { key: "subdomain_grace_days", value: "7", label: "Masa Tenggang Subdomain (Hari Pasca Acara)", group: "subdomain" },
  { key: "subdomain_auto_recycle", value: "true", label: "Otomatis Lepas Subdomain ke Pool", group: "subdomain" },
  { key: "gdrive_webhook_url", value: "", label: "Master Google Drive Webhook URL", group: "storage" },
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

    await seedDefaultSettings();
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
    return NextResponse.json({ error: error.message }, { status: 500 });
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
      ipaymu_va: "IPAYMU_VA",
      ipaymu_api_key: "IPAYMU_API_KEY",
      ipaymu_mode: "IPAYMU_SANDBOX",
      platform_url: "APP_URL",
    };

    const envUpdates: Record<string, string> = {};

    for (const { key, value, group } of updates) {
      if (!key) continue;
      const strVal = String(value ?? "");
      const updated = await prisma.adminSetting.upsert({
        where: { key },
        create: { key, value: strVal, group: group || "general" },
        update: { value: strVal },
      });
      results.push(updated);

      if (envKeyMap[key]) {
        const envVar = envKeyMap[key];
        const finalVal = key === "ipaymu_mode" ? (strVal === "sandbox" ? "true" : "false") : strVal;
        process.env[envVar] = finalVal;
        envUpdates[envVar] = finalVal;
      }
    }

    return NextResponse.json({ success: true, updated: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
