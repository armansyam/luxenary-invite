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
  { key: "price_traditional", value: "299000", label: "Harga Paket Traditional (IDR)", group: "pricing" },
  { key: "price_modern", value: "499000", label: "Harga Paket Modern (IDR)", group: "pricing" },
  { key: "desc_traditional", value: "Tema Heritage & Moody — Elegan, Bernuansa Tradisional", label: "Deskripsi Paket Traditional", group: "pricing" },
  { key: "desc_modern", value: "Tema Premium — Sinematik, Editorial, Kontemporer", label: "Deskripsi Paket Modern", group: "pricing" },
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
    return NextResponse.json({ success: true, settings, grouped });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const updates = Array.isArray(body) ? body : [body];
    const results = [];
    for (const { key, value, group } of updates) {
      if (!key) continue;
      const updated = await prisma.adminSetting.upsert({
        where: { key },
        create: { key, value: String(value ?? ""), group: group || "general" },
        update: { value: String(value ?? "") },
      });
      results.push(updated);
    }
    return NextResponse.json({ success: true, updated: results });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
