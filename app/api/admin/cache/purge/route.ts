import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { purgeCloudflareCache } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Guard: hanya SUPER_ADMIN / ADMIN
  const session = await auth();
  const role = (session?.user as any)?.role;
  if (!session || !["ADMIN", "SUPER_ADMIN"].includes(role)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, any> = {};

  // ── 1. Purge Next.js ISR Server Cache ──
  try {
    revalidatePath("/");
    revalidatePath("/sitemap.xml");
    revalidatePath("/packages");
    revalidatePath("/demo");
    revalidatePath("/api/public/themes");
    results.nextjs = { success: true, paths: ["/", "/sitemap.xml", "/packages", "/demo", "/api/public/themes"] };
  } catch (err: any) {
    results.nextjs = { success: false, error: err.message };
  }

  // ── 2. Purge Cloudflare Edge Cache (opsional, hanya jika env tersedia) ──
  results.cloudflare = await purgeCloudflareCache({ purgeEverything: true });

  const allSuccess = results.nextjs?.success;
  return NextResponse.json(
    { success: allSuccess, results },
    { status: allSuccess ? 200 : 500 }
  );
}
