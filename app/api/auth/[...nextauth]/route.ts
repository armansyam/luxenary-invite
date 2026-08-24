import { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { syncDatabaseSettingsToEnv } from "@/lib/settings";

export async function GET(req: NextRequest) {
  await syncDatabaseSettingsToEnv();
  return handlers.GET(req);
}

export async function POST(req: NextRequest) {
  await syncDatabaseSettingsToEnv();
  return handlers.POST(req);
}

