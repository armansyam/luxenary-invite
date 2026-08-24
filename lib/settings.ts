import { prisma } from "./prisma";

let isLoaded = false;

export async function getAdminSetting(key: string, defaultValue = ""): Promise<string> {
  try {
    const setting = await prisma.adminSetting.findUnique({ where: { key } });
    return setting?.value || defaultValue;
  } catch {
    return defaultValue;
  }
}

export async function syncDatabaseSettingsToEnv() {
  try {
    const all = await prisma.adminSetting.findMany();
    for (const s of all) {
      if (s.key === "google_client_id" && s.value) process.env.GOOGLE_CLIENT_ID = s.value;
      if (s.key === "google_client_secret" && s.value) process.env.GOOGLE_CLIENT_SECRET = s.value;
      if (s.key === "ipaymu_va" && s.value) process.env.IPAYMU_VA = s.value;
      if (s.key === "ipaymu_api_key" && s.value) process.env.IPAYMU_API_KEY = s.value;
      if (s.key === "ipaymu_mode" && s.value) process.env.IPAYMU_SANDBOX = s.value === "sandbox" ? "true" : "false";
      if (s.key === "platform_url" && s.value) process.env.APP_URL = s.value;
    }
    isLoaded = true;
  } catch (e) {
    // Database might be connecting
  }
}

// Initial eager sync
if (!isLoaded) {
  syncDatabaseSettingsToEnv().catch(() => {});
}
