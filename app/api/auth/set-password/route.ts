import { NextRequest, NextResponse } from "next/server";
import { routeError } from "@/lib/routeError";
import { rateLimitDb } from "@/lib/rateLimit";
import {
  consumeClientActivationTokenAndSetPassword,
  inspectClientActivationToken,
} from "@/lib/clientActivation";

export const dynamic = "force-dynamic";

function getClientIp(req: NextRequest): string {
  const fwd = req.headers.get("x-forwarded-for") || "";
  const first = fwd.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get("token") || "";
    const result = await inspectClientActivationToken(token);
    return NextResponse.json(result, {
      status: result.status === "VALID" ? 200 : 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return routeError("SetPasswordInspect", error, "Gagal memeriksa tautan aktivasi.");
  }
}

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    if (!(await rateLimitDb(`auth_set_password:${ip}`, 10, 15 * 60 * 1000))) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan aktivasi. Silakan tunggu beberapa menit lalu coba lagi." },
        { status: 429 },
      );
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body.token === "string" ? body.token : "";
    const password = typeof body.password === "string" ? body.password : "";

    const result = await consumeClientActivationTokenAndSetPassword(token, password);

    if (!result.ok) {
      const status = result.reason === "INVALID_PASSWORD" ? 400 : 410;
      return NextResponse.json(
        { error: result.error, reason: result.reason },
        { status },
      );
    }

    return NextResponse.json(
      {
        success: true,
        email: result.email,
        name: result.name,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError("SetPasswordConsume", error, "Gagal menyimpan kata sandi akun.");
  }
}
