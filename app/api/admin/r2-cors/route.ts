import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { applyR2CorsPolicy, getR2CorsPolicy } from "@/lib/r2cors";

// GET /api/admin/r2-cors → baca CORS aktif di bucket
export async function GET(req: NextRequest) {
  const guard = await requireAdminModule("settings");
  if (!guard.ok) return guard.response;

  const result = await getR2CorsPolicy();
  return NextResponse.json(result);
}

// POST /api/admin/r2-cors → terapkan CORS dari env vars secara otomatis
export async function POST(req: NextRequest) {
  const guard = await requireAdminModule("settings");
  if (!guard.ok) return guard.response;

  const result = await applyR2CorsPolicy();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
