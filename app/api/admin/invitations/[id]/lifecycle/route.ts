import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { extendGalleryExpiry } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { invalidateInvitationLookup } from "@/lib/cache";
import { purgeCloudflareCache } from "@/lib/cloudflare";
import { getDynamicServerRootDomain } from "@/lib/serverDomainUtils";
import { adminActorId } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/[id]/lifecycle
 * Endpoint khusus Super Admin untuk mengelola siklus hidup undangan:
 * - CLOSE_TO_GALLERY: Menutup undangan seketika dan mengalihkan URL ke Galeri Momen
 * - EXTEND_GALLERY: Memperpanjang masa simpan galeri foto tamu (+30 hari)
 * - UPDATE_EVENT_DATE: Mengedit tanggal acara pernikahan secara darurat oleh Admin
 * - TAKE_DOWN: Menurunkan undangan yang tayang karena pelanggaran (wajib beralasan, tercatat di audit log)
 * - REOPEN: Membuka kembali undangan yang diturunkan (TAKEN_DOWN -> PUBLISHED)
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> | { id: string } }
) {
  try {
    const session = await auth();
    const { hasAdminPermission } = await import("@/lib/adminPermissions");
    if (!session?.user || !hasAdminPermission(session.user, "invitations")) {
      return NextResponse.json({ error: "Unauthorized. Khusus Administrator." }, { status: 401 });
    }

    const resolvedParams = await Promise.resolve(params);
    const id = resolvedParams?.id;

    if (!id) {
      return NextResponse.json({ error: "ID Undangan wajib disertakan" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { action, days = 30, newDate } = body;

    const invitation = await prisma.invitation.findUnique({ where: { id } });
    if (!invitation) {
      return NextResponse.json({ error: "Undangan tidak ditemukan" }, { status: 404 });
    }

    const now = new Date();

    if (action === "CLOSE_TO_GALLERY") {
      // 1. Status langsung di-update ke EVENT_FINISHED (subdomain HTML sudah dihapus via single-source-of-truth flow)

      // 2. Set status EVENT_FINISHED
      const updated = await prisma.invitation.update({
        where: { id },
        data: { status: "EVENT_FINISHED" },
      });

      return NextResponse.json({
        success: true,
        status: updated.status,
        message: "Undangan berhasil ditutup dan dialihkan ke Galeri Momen Acara.",
      });
    }

    if (action === "TAKE_DOWN" || action === "REOPEN") {
      const taking = action === "TAKE_DOWN";
      const reason = typeof body.reason === "string" ? body.reason.trim() : "";

      if (taking) {
        if (!reason || reason.length > 500) {
          return NextResponse.json({ error: "Alasan penurunan wajib diisi (maksimal 500 karakter)." }, { status: 400 });
        }
        if (invitation.status !== "PUBLISHED" && invitation.status !== "EVENT_FINISHED") {
          return NextResponse.json({ error: "Hanya undangan yang sedang tayang yang dapat diturunkan." }, { status: 409 });
        }
      } else if (invitation.status !== "TAKEN_DOWN") {
        return NextResponse.json({ error: "Hanya undangan yang sedang diturunkan yang dapat dibuka kembali." }, { status: 409 });
      }

      const targetStatus = taking ? "TAKEN_DOWN" : "PUBLISHED";
      const label = invitation.invitationSlug || invitation.id;
      const actorId = adminActorId(session);

      const [updated] = await prisma.$transaction([
        prisma.invitation.update({ where: { id }, data: { status: targetStatus } }),
        prisma.adminAuditLog.create({
          data: {
            adminId: actorId,
            action: taking ? "TAKE_DOWN_INVITATION" : "REOPEN_INVITATION",
            details: taking ? `Menurunkan undangan ${label}. Alasan: ${reason}` : `Membuka kembali undangan ${label}`,
            ipAddress: req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null,
          },
        }),
      ]);

      invalidateInvitationLookup(invitation.invitationSlug, invitation.subdomain);

      const rootDomain = (await getDynamicServerRootDomain("")).split(":")[0].toLowerCase();
      const urlsToPurge: string[] = [];
      if (rootDomain && invitation.subdomain) urlsToPurge.push(`https://${invitation.subdomain}.${rootDomain}/`);
      if (rootDomain && invitation.invitationSlug) urlsToPurge.push(`https://${rootDomain}/${invitation.invitationSlug}`);
      if (invitation.customDomain) urlsToPurge.push(`https://${invitation.customDomain}/`);
      const cloudflare = urlsToPurge.length > 0 ? await purgeCloudflareCache({ files: urlsToPurge }) : null;

      return NextResponse.json({
        success: true,
        status: updated.status,
        cloudflare,
        message: taking ? "Undangan berhasil diturunkan." : "Undangan berhasil dibuka kembali.",
      });
    }

    if (action === "EXTEND_GALLERY") {
      const extraDays = Number(days);
      if (!Number.isFinite(extraDays) || extraDays < 1) {
        return NextResponse.json({ error: "Jumlah hari perpanjangan harus berupa angka minimal 1." }, { status: 400 });
      }

      const newExpiry = extendGalleryExpiry(invitation, extraDays, await getLifecycleSettings(), now);

      const updated = await prisma.invitation.update({
        where: { id },
        data: {
          galleryExpiresAt: newExpiry,
          memoriesUploadLocked: false,
        },
      });

      return NextResponse.json({
        success: true,
        galleryExpiresAt: updated.galleryExpiresAt,
        message: `Masa aktif berhasil diperpanjang hingga ${newExpiry.toLocaleDateString("id-ID")}.`,
      });
    }

    if (action === "UPDATE_EVENT_DATE") {
      if (!newDate) {
        return NextResponse.json({ error: "newDate wajib diisi." }, { status: 400 });
      }

      let events: any[] = [];
      try {
        events = typeof invitation.eventData === "string" ? JSON.parse(invitation.eventData) : invitation.eventData || [];
      } catch {
        events = [];
      }

      if (events.length > 0) {
        const target = events.find((e: any) => e.isPrimary) || events[0];
        target.date = String(newDate).trim();
        target.isPrimary = true;
      } else {
        events = [{ title: "Acara Utama", date: String(newDate).trim(), isPrimary: true }];
      }

      await prisma.invitation.update({
        where: { id },
        data: {
          eventData: JSON.stringify(events),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Tanggal acara berhasil diperbarui oleh Administrator.",
      });
    }

    return NextResponse.json({ error: `Aksi "${action}" tidak dikenali.` }, { status: 400 });
  } catch (error: any) {
    console.error("[Admin Invitation Lifecycle Error]", error);
    return NextResponse.json(
      { error: process.env.NODE_ENV === "production" ? "Terjadi kesalahan server" : error.message },
      { status: 500 }
    );
  }
}
