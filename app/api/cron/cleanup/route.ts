import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import crypto from "crypto";
import { runLifecycleCleanup, runStaleDataCleanup } from "@/lib/lifecycleCleanup";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { logger } from "@/lib/logger";
import { routeError } from "@/lib/routeError";

export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Warning jika CRON_SECRET tidak dikonfigurasi di production
  if (!cronSecret && process.env.NODE_ENV === "production") {
    logger.error("CronCleanup", "CRON_SECRET tidak diset di production; endpoint cleanup hanya terbuka untuk sesi admin");
  }

  // Bearer token check (untuk cron job eksternal seperti cron-job.org atau server cron)
  // Menggunakan timingSafeEqual untuk mencegah timing attack dari internet
  if (cronSecret && authHeader) {
    const expected = `Bearer ${cronSecret}`;
    const isTimingSafe =
      authHeader.length === expected.length &&
      crypto.timingSafeEqual(Buffer.from(authHeader), Buffer.from(expected));
    if (isTimingSafe) return true;
  }

  // Admin session fallback (hanya jika tidak ada CRON_SECRET atau request dari browser admin)
  const session = await auth();
  return hasAdminPermission(session?.user, "invitations");
}


export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET / Admin session" }, { status: 401 });
    }

    const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";
    const lifecycle = await runLifecycleCleanup({ dryRun });
    const stale = await runStaleDataCleanup({ dryRun });
    const failedCount = lifecycle.archiveFailures.length;

    return NextResponse.json({
      success: failedCount === 0,
      dryRun,
      transitionedInvitations: lifecycle.transitionedInvitations,
      recycledSubdomains: lifecycle.recycledSubdomains,
      cleanedInvitations: lifecycle.archivedInvitations,
      archiveFailures: lifecycle.archiveFailures,
      purgedArchives: lifecycle.purgedArchives,
      retentionWarningsSent: lifecycle.retentionWarningsSent,
      deletedOrders: stale.deletedOrders,
      refulfilledOrders: stale.refulfilledOrders,
      purgedRateLimitRows: stale.purgedRateLimitRows,
      message:
        `${dryRun ? "Simulasi pembersihan" : "Pembersihan selesai"}: ${lifecycle.transitionedInvitations} undangan ditransisikan ke selesai, ` +
        `${lifecycle.retentionWarningsSent} peringatan retensi terkirim, ${lifecycle.recycledSubdomains} subdomain dikembalikan ke pool, ` +
        `${lifecycle.archivedInvitations} undangan diarsipkan, ${lifecycle.purgedArchives} arsip kedaluwarsa dibersihkan` +
        (failedCount > 0 ? `, ${failedCount} undangan gagal diarsipkan dan akan dicoba lagi.` : "."),
    });
  } catch (error) {
    return routeError("CronCleanup", error, "Gagal menjalankan auto-cleanup");
  }
}

export async function GET(_req: NextRequest) {
  // GET endpoint sengaja dinonaktifkan — gunakan POST dengan Authorization: Bearer {CRON_SECRET}
  return NextResponse.json(
    { error: "Method tidak diizinkan. Gunakan POST dengan Authorization: Bearer {CRON_SECRET}" },
    { status: 405 }
  );
}

