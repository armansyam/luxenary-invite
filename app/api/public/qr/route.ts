import { NextRequest, NextResponse } from "next/server";
import { rateLimitDb, getClientIp } from "@/lib/rateLimit";
import { buildQrSvg } from "@/lib/qrSvg";

export const dynamic = "force-dynamic";

const DATA_MAX = 600;

// QR dibuat di server sendiri agar nama tamu dan data pembayaran tidak dikirim ke layanan pihak ketiga.
export async function GET(req: NextRequest) {
  if (!(await rateLimitDb(`qr:${getClientIp(req)}`, 120, 60000))) {
    return NextResponse.json({ error: "Terlalu banyak permintaan." }, { status: 429 });
  }

  const params = new URL(req.url).searchParams;
  const data = params.get("data") ?? "";
  if (!data || data.length > DATA_MAX) {
    return NextResponse.json({ error: `data wajib diisi dan maksimal ${DATA_MAX} karakter` }, { status: 400 });
  }
  const size = Math.min(400, Math.max(80, parseInt(params.get("size") ?? "160", 10) || 160));

  return new Response(buildQrSvg(data, size, params.get("mark") ?? ""), {
    headers: { "Content-Type": "image/svg+xml; charset=utf-8", "Cache-Control": "public, max-age=86400" },
  });
}
