import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { readJsonBody } from "@/lib/requestBody";
import { requireAdminModule } from "@/lib/adminAuth";
import { logger } from "@/lib/logger";
import { invalidateSettingsCache } from "@/lib/settings";
import { defaultAdminSettings } from "@/prisma/defaultSettings";

export const dynamic = "force-dynamic";

async function denyUnlessSettingsAdmin() {
  const guard = await requireAdminModule("settings");
  return guard.ok ? null : guard.response;
}

// Nilai bawaan diambil dari data seed yang sama dengan `prisma db seed`; salinan terpisah di sini sempat berbeda
// (mis. nas_archive_enabled dan custom_domain_enabled terbalik).
async function seedDefaultSettings() {
  for (const s of defaultAdminSettings) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      create: { key: s.key, value: s.value, label: s.label, group: s.group || "general" },
      update: {},
    });
  }
}

export async function GET() {
  try {
    const denied = await denyUnlessSettingsAdmin();
    if (denied) return denied;

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
  } catch (error) {
    return routeError("AdminSettings", error, "Gagal memuat pengaturan");
  }
}

export async function POST(req: NextRequest) {
  try {
    const denied = await denyUnlessSettingsAdmin();
    if (denied) return denied;

    const body = await readJsonBody(req);
    const updates = Array.isArray(body) ? body : [body];
    const results = [];
    
    // Map of setting keys to environment variables
    const envKeyMap: Record<string, string> = {
      platform_url: "APP_URL",
      nas_archive_enabled: "NAS_ARCHIVE_ENABLED",
      nas_archive_path: "NAS_ARCHIVE_PATH",
      nas_archive_retention_days: "NAS_ARCHIVE_RETENTION_DAYS",
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

    // On-demand revalidation: perbarui cache landing page jika setting harga/platform berubah
    try {
      const { revalidatePath } = await import("next/cache");
      revalidatePath("/");
    } catch (e) {
      logger.warn("AdminSettings", "Revalidasi halaman utama gagal", { error: e instanceof Error ? e.message : String(e) });
    }

    // Invalidate in-memory settings cache agar pembaruan langsung terbaca
    invalidateSettingsCache();

    return NextResponse.json({ success: true, updated: results });
  } catch (error) {
    return routeError("AdminSettings", error, "Gagal menyimpan pengaturan");
  }
}
