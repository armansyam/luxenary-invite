import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { routeError } from "@/lib/routeError";
import { logger } from "@/lib/logger";
import { purgeInvitationEdgeCache } from "@/lib/cloudflare";

export const dynamic = "force-dynamic";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "ID klaim kado wajib diisi." }, { status: 400 });
    }

    const claim = await prisma.giftClaim.findUnique({
      where: { id },
      include: {
        invitation: {
          select: {
            id: true,
            userId: true,
            status: true,
            invitationSlug: true,
            subdomain: true,
            customDomain: true,
          },
        },
      },
    });

    if (!claim) {
      return NextResponse.json({ error: "Data klaim kado tidak ditemukan." }, { status: 404 });
    }

    const isOwner = claim.invitation.userId === session.user.id;
    const isAdmin = hasAdminPermission(session.user, "invitations");
    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await prisma.giftClaim.delete({ where: { id: claim.id } });

    if (claim.invitation.status === "PUBLISHED") {
      try {
        const provider = process.env.STORAGE_PROVIDER || "local";
        if (provider === "r2" || provider === "s3") {
          const { syncDraftToR2 } = await import("@/lib/storage");
          await syncDraftToR2(claim.invitation.id);
        } else {
          const { buildAndSavePublishedHtml } = await import("@/lib/staticPublisher");
          await buildAndSavePublishedHtml(claim.invitation.id);
        }
        await purgeInvitationEdgeCache(claim.invitation);
      } catch (err) {
        logger.warn("ClientGiftClaimDelete", "Bake ulang HTML setelah pembatalan klaim kado gagal", {
          invitationId: claim.invitation.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ success: true, deletedId: claim.id });
  } catch (error) {
    return routeError("ClientGiftClaimDelete", error, "Gagal membatalkan klaim kado.");
  }
}
