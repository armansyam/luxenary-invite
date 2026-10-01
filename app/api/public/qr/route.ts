import { NextRequest, NextResponse } from "next/server";
import qrcode from "qrcode-generator";
import { rateLimitDb, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

const DATA_MAX = 600;
const QUIET_ZONE = 4;

// Bawaan pustaka bukan UTF-8; nama bertanda aksen (mis. "Syâmil") tidak terbaca benar tanpa ini.
// Build CJS dan ESM pustaka berbeda (hanya CJS membawa fungsi UTF-8), jadi encoder disediakan di sini.
qrcode.stringToBytes = (s: string) => Array.from(Buffer.from(s, "utf8"));

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

  const qr = qrcode(0, "M");
  qr.addData(data);
  qr.make();

  const modules = qr.getModuleCount();
  const total = modules + QUIET_ZONE * 2;
  let path = "";
  for (let row = 0; row < modules; row++) {
    for (let col = 0; col < modules; col++) {
      if (qr.isDark(row, col)) path += `M${col + QUIET_ZONE} ${row + QUIET_ZONE}h1v1h-1z`;
    }
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges">` +
    `<rect width="${total}" height="${total}" fill="#fff"/><path d="${path}" fill="#000"/></svg>`;

  return new Response(svg, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
