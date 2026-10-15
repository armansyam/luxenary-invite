import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { routeError } from "@/lib/routeError";
import { extendGalleryExpiry, getEventDayStart, getPrimaryEventDate } from "@/lib/lifecycleDates";
import { getLifecycleSettings } from "@/lib/lifecycleSettings";
import { purgeInvitationEdgeCache } from "@/lib/cloudflare";
import { buildAndSavePublishedHtml } from "@/lib/staticPublisher";
import { adminActorId, requireAdminModule } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/invitations/[id]/lifecycle
 * Endpoint admin berizin modul Projek Undangan untuk mengelola siklus hidup undangan (setiap aksi tercatat di audit):
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
    const guard = await requireAdminModule("invitations");
    if (!guard.ok) return guard.response;
    const { session } = guard;

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
    const label = invitation.invitationSlug || invitation.id;
    const actorId = adminActorId(session);
    const ipAddress = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || null;
    const auditLog = (auditAction: string, details: string) =>
      prisma.adminAuditLog.create({ data: { adminId: actorId, action: auditAction, details, ipAddress } });

    if (action === "CLOSE_TO_GALLERY") {
      if (invitation.status !== "PUBLISHED") {
        return NextResponse.json({ error: "Hanya undangan yang sedang tayang (PUBLISHED) yang dapat ditutup ke galeri." }, { status: 409 });
      }
      const [updated] = await prisma.$transaction([
        prisma.invitation.update({
          where: { id },
          data: { status: "EVENT_FINISHED" },
        }),
        auditLog("CLOSE_TO_GALLERY", `Menutup undangan ${label} ke Galeri Momen`),
      ]);
      await purgeInvitationEdgeCache(invitation);

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

      const [updated] = await prisma.$transaction([
        prisma.invitation.update({ where: { id }, data: { status: targetStatus } }),
        auditLog(
          taking ? "TAKE_DOWN_INVITATION" : "REOPEN_INVITATION",
          taking ? `Menurunkan undangan ${label}. Alasan: ${reason}` : `Membuka kembali undangan ${label}`
        ),
      ]);

      const cloudflare = await purgeInvitationEdgeCache(invitation);

      return NextResponse.json({
        success: true,
        status: updated.status,
        cloudflare,
        message: taking ? "Undangan berhasil diturunkan." : "Undangan berhasil dibuka kembali.",
      });
    }

    if (action === "EXTEND_GALLERY") {
      const extraDays = Number(days);
      if (!Number.isInteger(extraDays) || extraDays < 1 || extraDays > 3650) {
        return NextResponse.json({ error: "Jumlah hari perpanjangan harus bilangan bulat 1 sampai 3650." }, { status: 400 });
      }
      if (!getPrimaryEventDate(invitation.eventData)) {
        return NextResponse.json({ error: "Undangan belum memiliki tanggal jadwal terima tamu; perpanjangan galeri tidak punya patokan." }, { status: 400 });
      }

      const newExpiry = extendGalleryExpiry(invitation, extraDays, await getLifecycleSettings(), now);

      const [updated] = await prisma.$transaction([
        prisma.invitation.update({
          where: { id },
          data: {
            galleryExpiresAt: newExpiry,
            memoriesUploadLocked: false,
          },
        }),
        auditLog("EXTEND_GALLERY", `Memperpanjang galeri ${label} +${extraDays} hari hingga ${newExpiry.toISOString()}`),
      ]);

      return NextResponse.json({
        success: true,
        galleryExpiresAt: updated.galleryExpiresAt,
        message: `Masa aktif berhasil diperpanjang hingga ${newExpiry.toLocaleDateString("id-ID")}.`,
      });
    }

    if (action === "UPDATE_EVENT_DATE") {
      const cleanDate = typeof newDate === "string" ? newDate.trim() : "";
      if (getEventDayStart({ date: cleanDate }) === null) {
        return NextResponse.json({ error: "newDate wajib tanggal nyata berformat YYYY-MM-DD." }, { status: 400 });
      }

      let events: any[] = Array.isArray(invitation.eventData) ? invitation.eventData : [];

      if (events.length > 0) {
        const target = events.find((e: any) => e.isPrimary) || events[0];
        target.date = cleanDate;
        target.isPrimary = true;
      } else {
        events = [{ title: "Acara Utama", date: cleanDate, isPrimary: true }];
      }

      await prisma.$transaction([
        prisma.invitation.update({
          where: { id },
          data: {
            eventData: events,
          },
        }),
        auditLog("UPDATE_EVENT_DATE", `Mengubah tanggal acara utama ${label} menjadi ${cleanDate}`),
      ]);

      // Tanggal tampil di HTML terbit; tanpa bake ulang dan purge, tamu tetap melihat tanggal lama.
      if (invitation.status === "PUBLISHED" || invitation.status === "EVENT_FINISHED") {
        await buildAndSavePublishedHtml(id);
      }
      await purgeInvitationEdgeCache(invitation);

      return NextResponse.json({
        success: true,
        message: "Tanggal acara berhasil diperbarui oleh Administrator.",
      });
    }

    return NextResponse.json({ error: `Aksi "${action}" tidak dikenali.` }, { status: 400 });
  } catch (error) {
    return routeError("AdminInvitationLifecycle", error);
  }
}
