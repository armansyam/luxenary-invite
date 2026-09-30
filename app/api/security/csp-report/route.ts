import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getClientIp, rateLimitDb } from "@/lib/rateLimit";

const MAX_BODY_BYTES = 8 * 1024;
const clip = (value: unknown) => String(value ?? "").slice(0, 200);

/**
 * Penerima laporan pelanggaran Content-Security-Policy-Report-Only.
 * Publik (browser mengirim tanpa kredensial), sehingga dibatasi ukuran dan laju, dan hanya menulis log.
 */
export async function POST(req: NextRequest) {
  if (!(await rateLimitDb(`csp_report:${getClientIp(req)}`, 30, 60_000))) {
    return new NextResponse(null, { status: 429 });
  }

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return new NextResponse(null, { status: 413 });

  let report: Record<string, unknown>;
  try {
    const parsed = JSON.parse(raw);
    report = (parsed?.["csp-report"] ?? parsed) as Record<string, unknown>;
  } catch {
    return new NextResponse(null, { status: 400 });
  }

  logger.warn("CSP", "Pelanggaran CSP (Report-Only)", {
    directive: clip(report["violated-directive"] ?? report.effectiveDirective),
    blocked: clip(report["blocked-uri"] ?? report.blockedURL),
    document: clip(report["document-uri"] ?? report.documentURL),
  });
  return new NextResponse(null, { status: 204 });
}
