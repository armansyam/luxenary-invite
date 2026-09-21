import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { purgeCloudflareCache } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    const role = (session?.user as any)?.role;
    const isAdmin = (session?.user as any)?.isAdmin === true || role === "ADMIN" || role === "SUPER_ADMIN";

    if (!session || !isAdmin) {
      return NextResponse.json({ error: "Unauthorized: Akses dibatasi hanya untuk Administrator." }, { status: 401 });
    }

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
    } catch (bakeErr: any) {
      console.error("[Admin Purge] Gagal mengompilasi ulang HTML:", bakeErr);
      return NextResponse.json(
        { error: `Gagal membakar ulang HTML: ${bakeErr.message || "Unknown error"}` },
        { status: 500 }
      );
    }

    // 2. Kumpulkan URL spesifik undangan ini
    const rootDomain = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "luxvite.id").split(":")[0].toLowerCase();
    const urlsToPurge: string[] = [];

    if (invitation.subdomain) {
      urlsToPurge.push(`https://${invitation.subdomain}.${rootDomain}/`);
    }
    if (invitation.invitationSlug) {
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
  } catch (err: any) {
    console.error("[Admin Purge Error]:", err);
    return NextResponse.json(
      { error: err.message || "Terjadi kesalahan pada server saat memproses purge cache." },
      { status: 500 }
    );
  }
}
