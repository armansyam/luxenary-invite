import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";
import { participantNames } from "@/lib/participantUtils";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const guard = await requireAdminModule("invitations");
    if (!guard.ok) return guard.response;

    const resolvedParams = await Promise.resolve(params);
    const { id } = resolvedParams;

    const invitation = await prisma.invitation.findUnique({
      where: { id },
      select: {
        id: true,
        subdomain: true,
        invitationSlug: true,
        customDomain: true,
        status: true,
        eventType: true,
        participantsJson: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    // 1. Re-bake berkas HTML statis (Single Source of Truth). Hanya undangan yang memang disajikan ke tamu: membangun ulang
    // draf, arsip, atau undangan yang diturunkan akan menulis kembali HTML yang sengaja dihapus dari hot storage.
    const isServed = invitation.status === "PUBLISHED" || invitation.status === "EVENT_FINISHED";
    let rebakeSuccess = false;
    if (isServed) {
      try {
        const provider = process.env.STORAGE_PROVIDER || "local";
        if (provider === "r2" || provider === "s3") {
          const { syncDraftToR2 } = await import("@/lib/storage");
          await syncDraftToR2(invitation.id);
        } else {
          await buildAndSavePublishedHtml(invitation.id);
        }
        rebakeSuccess = true;
      } catch (bakeErr) {
        return routeError("AdminPurge", bakeErr, "Gagal membakar ulang HTML undangan");
      }
    }

    // 2. Kumpulkan URL spesifik undangan ini
    const rootDomain = (await getDynamicServerRootDomain("")).split(":")[0].toLowerCase();
    const urlsToPurge: string[] = [];

    if (rootDomain && invitation.subdomain) {
      urlsToPurge.push(`https://${invitation.subdomain}.${rootDomain}/`);
    }
    if (rootDomain && invitation.invitationSlug) {
      urlsToPurge.push(`https://${rootDomain}/${invitation.invitationSlug}`);
    }
    if (invitation.customDomain) {
      urlsToPurge.push(`https://${invitation.customDomain}/`);
    }

    // 3. Purge edge cache Cloudflare secara terisolasi khusus URL undangan ini
    let cfResult: any = { skipped: true, reason: "Tidak ada URL untuk di-purge" };
    if (urlsToPurge.length > 0) {
      cfResult = await purgeCloudflareCache({ files: urlsToPurge });
    }

    const coupleName = participantNames(invitation.eventType, invitation.participantsJson).short || invitation.invitationSlug;

    return NextResponse.json({
      success: true,
      message: rebakeSuccess
        ? `Undangan ${coupleName} berhasil dibakar ulang dan cache Cloudflare untuk ${urlsToPurge.length} URL telah dibersihkan.`
        : `Undangan ${coupleName} berstatus ${invitation.status} sehingga tidak dibakar ulang; cache Cloudflare untuk ${urlsToPurge.length} URL telah dibersihkan.`,
      rebakeSuccess,
      purgedUrls: urlsToPurge,
      cloudflare: cfResult,
    });
  } catch (err) {
    return routeError("AdminPurge", err, "Terjadi kesalahan pada server saat memproses purge cache.");
  }
}
