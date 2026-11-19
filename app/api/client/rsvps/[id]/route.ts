import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { hasAdminPermission } from "@/lib/adminPermissions";
import { readJsonBody } from "@/lib/requestBody";
import { routeError } from "@/lib/routeError";
import { invalidateRsvpListCache } from "@/lib/rsvpCache";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

const MAX_REPLY_LENGTH = 500;

/** Kembalikan entri RSVP beserta kepemilikan undangannya, atau respons HTTP penolakan. */
async function loadAuthorizedRsvp(rsvpId: string) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) } as const;
  }

  const rsvp = await prisma.rsvp.findUnique({
    where: { id: rsvpId },
    include: {
      invitation: { select: { id: true, userId: true } },
    },
  });
  if (!rsvp) {
    return { error: NextResponse.json({ error: "Data RSVP tidak ditemukan." }, { status: 404 }) } as const;
  }

  const isAdmin = hasAdminPermission(session.user, "invitations");
  if (rsvp.invitation.userId !== userId && !isAdmin) {
    return { error: NextResponse.json({ error: "Forbidden: Anda tidak memiliki akses ke ucapan ini." }, { status: 403 }) } as const;
  }

  return { rsvp } as const;
}

/** Sinkronkan ulang HTML terbit/draf jika status RSVP atau balasan berubah agar SSR dan edge cache tetap akurat. */
async function refreshPublishedSnapshotAfterModeration(invitationId: string): Promise<void> {
  try {
    const inv = await prisma.invitation.findUnique({
      where: { id: invitationId },
      select: { id: true, status: true, invitationSlug: true, subdomain: true, customDomain: true },
    });
    if (!inv || (inv.status !== "PUBLISHED" && inv.status !== "EVENT_FINISHED")) return;
    const { buildAndSavePublishedHtml } = await import("@/lib/staticPublisher");
    const { purgeInvitationEdgeCache } = await import("@/lib/cloudflare");
    await buildAndSavePublishedHtml(inv.id);
    await purgeInvitationEdgeCache(inv);
  } catch (err) {
    logger.warn("ClientRsvpModeration", "Gagal membangun ulang snapshot HTML pasca moderasi RSVP", {
      invitationId,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(params);
    if (!id) {
      return NextResponse.json({ error: "ID RSVP wajib disertakan." }, { status: 400 });
    }

    const authz = await loadAuthorizedRsvp(id);
    if ("error" in authz) return authz.error;

    const body = await readJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Body JSON tidak valid." }, { status: 400 });
    }

    const updateData: {
      isHidden?: boolean;
      replyMessage?: string | null;
      repliedAt?: Date | null;
    } = {};

    if ("isHidden" in body) {
      if (typeof body.isHidden !== "boolean") {
        return NextResponse.json({ error: "isHidden harus berupa boolean." }, { status: 400 });
      }
      updateData.isHidden = body.isHidden;
    }

    if ("replyMessage" in body) {
      const rawReply = body.replyMessage;
      if (rawReply === null || String(rawReply).trim() === "") {
        updateData.replyMessage = null;
        updateData.repliedAt = null;
      } else {
        if (typeof rawReply !== "string") {
          return NextResponse.json({ error: "replyMessage harus berupa teks." }, { status: 400 });
        }
        const trimmed = rawReply.trim();
        if (trimmed.length > MAX_REPLY_LENGTH) {
          return NextResponse.json(
            { error: `Balasan maksimal ${MAX_REPLY_LENGTH} karakter.` },
            { status: 400 },
          );
        }
        updateData.replyMessage = trimmed;
        updateData.repliedAt = new Date();
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan yang dikirim." }, { status: 400 });
    }

    const updated = await prisma.rsvp.update({
      where: { id },
      data: updateData,
      omit: { editTokenHash: true },
    });

    invalidateRsvpListCache(authz.rsvp.invitationId);
    await refreshPublishedSnapshotAfterModeration(authz.rsvp.invitationId);

    return NextResponse.json({ success: true, rsvp: updated });
  } catch (error) {
    return routeError("ClientRsvpPatch", error, "Gagal memperbarui ucapan RSVP");
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } },
) {
  try {
    const { id } = await Promise.resolve(params);
    if (!id) {
      return NextResponse.json({ error: "ID RSVP wajib disertakan." }, { status: 400 });
    }

    const authz = await loadAuthorizedRsvp(id);
    if ("error" in authz) return authz.error;

    await prisma.rsvp.delete({ where: { id } });
    invalidateRsvpListCache(authz.rsvp.invitationId);
    await refreshPublishedSnapshotAfterModeration(authz.rsvp.invitationId);

    return NextResponse.json({ success: true, deletedId: id });
  } catch (error) {
    return routeError("ClientRsvpDelete", error, "Gagal menghapus ucapan RSVP");
  }
}
