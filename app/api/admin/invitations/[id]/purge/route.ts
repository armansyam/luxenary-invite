import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminModule } from "@/lib/adminAuth";
import { routeError } from "@/lib/routeError";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";

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
        groomNickname: true,
        groomName: true,
        brideNickname: true,
        brideName: true,
      },
    });

    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan." }, { status: 404 });
    }

    // 1. Re-bake berkas HTML statis (Single Source of Truth)
    let rebakeSuccess = false;
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

    const coupleName = `${invitation.groomNickname || invitation.groomName || "Pria"} & ${invitation.brideNickname || invitation.brideName || "Wanita"}`;

    return NextResponse.json({
      success: true,
      message: `Undangan ${coupleName} berhasil dibakar ulang dan cache Cloudflare untuk ${urlsToPurge.length} URL telah dibersihkan.`,
      rebakeSuccess,
      purgedUrls: urlsToPurge,
      cloudflare: cfResult,
    });
  } catch (err) {
    return routeError("AdminPurge", err, "Terjadi kesalahan pada server saat memproses purge cache.");
  }
}
