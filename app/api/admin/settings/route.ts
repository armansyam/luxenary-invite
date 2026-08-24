import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Default seeds for AdminSetting
const DEFAULT_SETTINGS: Array<{ key: string; value: string; label: string; group: string }> = [
  { key: "platform_name", value: "Luxenary Invite", label: "Nama Platform", group: "platform" },
  { key: "platform_url", value: "http://localhost:3000", label: "URL Platform (APP_URL)", group: "platform" },
  { key: "support_email", value: "support@luxenary.id", label: "Email Support", group: "platform" },
  { key: "ipaymu_mode", value: "sandbox", label: "Mode iPaymu (sandbox/production)", group: "ipaymu" },
  { key: "ipaymu_va", value: "", label: "Virtual Account iPaymu", group: "ipaymu" },
  { key: "ipaymu_api_key", value: "", label: "API Key iPaymu", group: "ipaymu" },
  { key: "google_auth_enabled", value: "true", label: "Aktifkan Login Google", group: "google" },
  { key: "google_client_id", value: "", label: "Google Client ID", group: "google" },
  { key: "google_client_secret", value: "", label: "Google Client Secret", group: "google" },
  { key: "name_traditional", value: "Traditional Series", label: "Nama Paket Traditional", group: "pricing" },
  { key: "name_modern", value: "Modern Series", label: "Nama Paket Modern", group: "pricing" },
  { key: "name_premium", value: "Premium Series", label: "Nama Paket Premium", group: "pricing" },
  { key: "price_traditional", value: "299000", label: "Harga Paket Traditional (IDR)", group: "pricing" },
  { key: "price_modern", value: "499000", label: "Harga Paket Modern (IDR)", group: "pricing" },
  { key: "price_premium", value: "699000", label: "Harga Paket Premium (IDR)", group: "pricing" },
  { key: "desc_traditional", value: "Tema Traditional — Sakral, Megah & Bernuansa Tradisional", label: "Deskripsi Paket Traditional", group: "pricing" },
  { key: "desc_modern", value: "Tema Modern — Minimalis, Kontemporer & Sinematik", label: "Deskripsi Paket Modern", group: "pricing" },
  { key: "desc_premium", value: "Tema Premium — Editorial, Full-Text & Luxury Visual Motion", label: "Deskripsi Paket Premium", group: "pricing" },
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

    // Safely sync to .env file on disk if exists
    try {
      const fs = await import("fs");
      const path = await import("path");
      const envPath = path.join(process.cwd(), ".env");
      if (fs.existsSync(envPath) && Object.keys(envUpdates).length > 0) {
        let envContent = fs.readFileSync(envPath, "utf-8");
        for (const [envVar, envVal] of Object.entries(envUpdates)) {
          const regex = new RegExp(`^${envVar}=.*$`, "m");
          if (regex.test(envContent)) {
            envContent = envContent.replace(regex, `${envVar}="${envVal}"`);
          } else {
            envContent += `\n${envVar}="${envVal}"`;
          }
        }
        fs.writeFileSync(envPath, envContent, "utf-8");
      }
    } catch (fsErr) {
      console.warn("Could not sync .env file:", fsErr);
    }

    return NextResponse.json({ success: true, updated: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
