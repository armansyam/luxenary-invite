import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { applyR2CorsPolicy, getR2CorsPolicy } from "@/lib/r2cors";

// GET /api/admin/r2-cors → baca CORS aktif di bucket
export async function GET(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getR2CorsPolicy();
  return NextResponse.json(result);
}

// POST /api/admin/r2-cors → terapkan CORS dari env vars secara otomatis
export async function POST(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await applyR2CorsPolicy();
  return NextResponse.json(result, { status: result.success ? 200 : 400 });
}
