import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { routeError } from "@/lib/routeError";
import { parseGiftRegistryFromSettings } from "@/lib/giftRegistry";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invitationId = new URL(req.url).searchParams.get("invitationId")?.trim() || "";
    const isAdmin = hasAdminPermission(session.user, "invitations");

    const invitation = invitationId
      ? await prisma.invitation.findUnique({
          where: { id: invitationId },
          select: { id: true, userId: true, featureSettings: true },
        })
      : await prisma.invitation.findFirst({
          where: { userId: session.user.id },
          orderBy: { createdAt: "desc" },
          select: { id: true, userId: true, featureSettings: true },
        });

    if (!invitation) {
      return NextResponse.json({ success: true, items: [], claims: [], stats: { totalClaims: 0, totalQtyClaimed: 0 } });
    }

    if (invitation.userId !== session.user.id && !isAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const items = parseGiftRegistryFromSettings(invitation.featureSettings);
    const itemNameById = new Map(items.map((item) => [item.id, item]));

    const claims = await prisma.giftClaim.findMany({
      where: { invitationId: invitation.id },
      orderBy: { claimedAt: "desc" },
      select: {
        id: true,
        itemId: true,
        guestName: true,
        quantity: true,
        note: true,
        claimedAt: true,
      },
    });

    const totalQtyClaimed = claims.reduce((sum, c) => sum + Math.max(1, c.quantity), 0);

    return NextResponse.json(
      {
        success: true,
        invitationId: invitation.id,
        items,
        claims: claims.map((c) => ({
          ...c,
          itemName: itemNameById.get(c.itemId)?.name || c.itemId,
          qtyNeeded: itemNameById.get(c.itemId)?.qtyNeeded ?? 1,
        })),
        stats: {
          totalClaims: claims.length,
          totalQtyClaimed,
          totalItems: items.length,
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return routeError("ClientGiftClaimsGet", error, "Gagal memuat daftar klaim kado.");
  }
}
