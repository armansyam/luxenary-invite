import { NextRequest, NextResponse } from "next/server";
import { requireAdminModule } from "@/lib/adminAuth";
import { revalidatePath } from "next/cache";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { forwardException } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Guard: hanya SUPER_ADMIN / ADMIN
  const guard = await requireAdminModule("settings");
  if (!guard.ok) return guard.response;

  const results: Record<string, any> = {};

  // ── 1. Purge Next.js ISR Server Cache ──
  try {
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/packages");
    revalidatePath("/demo");
    revalidatePath("/api/public/themes");
    results.nextjs = { success: true, paths: ["/", "/sitemap.xml", "/packages", "/demo", "/api/public/themes"] };
  } catch (err) {
    logger.error("AdminCachePurge", "Gagal membersihkan ISR cache Next.js", err);
    forwardException(err, { tags: { route: "AdminCachePurge" } });
    results.nextjs = { success: false, error: err instanceof Error ? err.message : "Gagal membersihkan cache." };
  }

  // ── 2. Purge Cloudflare Edge Cache (opsional, hanya jika env tersedia) ──
  results.cloudflare = await purgeCloudflareCache({ purgeEverything: true });

  const allSuccess = results.nextjs?.success;
  return NextResponse.json(
    { success: allSuccess, results },
    { status: allSuccess ? 200 : 500 }
  );
}
