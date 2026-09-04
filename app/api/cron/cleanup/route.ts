import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { buildAndSavePublishedHtml, deletePublishedHtml, deleteSubdomainHtmlOnly } from "@/lib/staticPublisher";

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export const dynamic = "force-dynamic";

async function isAuthorized(req: NextRequest): Promise<boolean> {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  // Warning jika CRON_SECRET tidak dikonfigurasi di production
  if (!cronSecret && process.env.NODE_ENV === "production") {
    console.error("[SECURITY WARNING] CRON_SECRET tidak diset di production! Endpoint cleanup tidak aman.");
  }

  // Bearer token check (untuk cron job eksternal seperti cron-job.org atau server cron)
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Admin session fallback (hanya jika tidak ada CRON_SECRET atau request dari browser admin)
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";
  return isAdmin;
}


export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET / Admin session" }, { status: 401 });
    }

    const retentionGraceSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_invitation_grace_days" } });
    const retentionGallerySetting = await prisma.adminSetting.findUnique({ where: { key: "retention_gallery_default_days" } });
    const retentionAccountSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_account_days" } });
    const retentionOrderSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_order_days" } });

    const graceDays = Number(retentionGraceSetting?.value) || 7; // H+7 hari: tutup undangan utama & alihkan ke galeri
    const galleryDays = Number(retentionGallerySetting?.value) || 30; // H+30 hari: bersihkan foto tamu jika tidak diperpanjang
    const retentionAccountDays = Number(retentionAccountSetting?.value) || 365;
    const retentionOrderDays = Number(retentionOrderSetting?.value) || 30;

    const now = new Date();
    const thresholdGraceDate = new Date(now.getTime() - (graceDays * 24 * 60 * 60 * 1000));
    const thresholdAccountDate = new Date(now.getTime() - (retentionAccountDays * 24 * 60 * 60 * 1000));
    const thresholdOrderDate = new Date(now.getTime() - (retentionOrderDays * 24 * 60 * 60 * 1000));

    // Helper untuk mengambil tanggal pernikahan terbaru dari eventData
    function getLatestEventDate(eventData: any): Date | null {
      try {
        const events = typeof eventData === "string" ? JSON.parse(eventData) : eventData || [];
        if (!Array.isArray(events)) return null;
        let latest: Date | null = null;
        for (const ev of events) {
          if (ev?.date) {
            const d = new Date(ev.date);
            if (!isNaN(d.getTime())) {
              if (!latest || d > latest) latest = d;
            }
          }
        }
        return latest;
      } catch {
        return null;
      }
    }

    // ── FASE 1: Transisi Undangan ke Galeri Momen (H + graceDays) ──
    // Undangan yang sudah lewat H+graceDays ditutup file fisiknya dan beralih peran ke Galeri Momen
    const activeInvs = await prisma.invitation.findMany({
      where: { status: "PUBLISHED" },
      select: {
        id: true,
        eventData: true,
        subdomain: true,
        customDomain: true,
        invitationSlug: true,
      }
    });

    let transitionCount = 0;
    for (const inv of activeInvs) {
      const latestDate = getLatestEventDate(inv.eventData);
      if (latestDate && latestDate < thresholdGraceDate) {
        // 1. Pastikan canonical HTML sudah tersimpan sebelum subdomain ditakedown
        await buildAndSavePublishedHtml(inv.id);

        // 2. Hapus fisik file subdomain HTML (agar URL otomatis fallback / rewrite ke galeri)
        await deleteSubdomainHtmlOnly(inv.id);

        // 3. Update status menjadi EVENT_FINISHED
        await prisma.invitation.update({
          where: { id: inv.id },
          data: { status: "EVENT_FINISHED" }
        });

        // 4. Bersihkan data formulir RSVP yang sudah kedaluwarsa
        await prisma.rsvp.deleteMany({ where: { invitationId: inv.id } });

        transitionCount++;
      }
    }

    // ── FASE 2: Pembersihan Galeri Tamu R2 (H + galleryDays ATAU galleryExpiresAt) ──
    // Undangan yang berstatus EVENT_FINISHED atau lewat masa aktif galeri
    const finishedInvs = await prisma.invitation.findMany({
      where: { status: { in: ["EVENT_FINISHED", "TAKEN_DOWN"] } },
      select: {
        id: true,
        eventData: true,
        galleryExpiresAt: true,
        invitationSlug: true,
        customDomain: true,
        subdomain: true,
      }
    });

    let cleanedGalleryCount = 0;
    for (const inv of finishedInvs) {
      const latestDate = getLatestEventDate(inv.eventData);
      // Batas waktu: jika ada perpanjangan (galleryExpiresAt), gunakan itu. Jika tidak, gunakan default H+galleryDays
      const effectiveExpiry = inv.galleryExpiresAt || (latestDate ? new Date(latestDate.getTime() + (galleryDays * 24 * 60 * 60 * 1000)) : null);

      if (effectiveExpiry && now > effectiveExpiry) {
        // Klien TIDAK memperpanjang galeri / masa perpanjangan sudah habis
        // 1. Hapus fisik Guest Memories dari R2 & Local
        const memories = await prisma.guestMemory.findMany({ where: { invitationId: inv.id } });
        if (memories.length > 0) {
          const { deleteFile } = await import("@/lib/storage");
          await Promise.all(memories.map(mem => mem.mediaUrl ? deleteFile(mem.mediaUrl) : Promise.resolve())).catch(() => {});
        }
        await prisma.guestMemory.deleteMany({ where: { invitationId: inv.id } });

        // Hapus folder fisik lokal jika ada
        const memoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id, "memories");
        try {
          if (await fileExists(memoriesDir)) {
            await fs.promises.rm(memoriesDir, { recursive: true, force: true });
          }
        } catch {}

        // 2. Kunci upload, tandai ARCHIVED, dan lepaskan subdomain ke pool
        await prisma.invitation.update({
          where: { id: inv.id },
          data: {
            memoriesUploadLocked: true,
            status: "ARCHIVED",
            subdomain: null, // Subdomain dilepaskan kembali ke pool untuk pasangan baru
          }
        });

        cleanedGalleryCount++;
      }
    }

    // ── TAHAP 2: Pembersihan Total Klien & Portofolio (H+365) ──
    // Cari Klien yang mendaftar lebih lama dari thresholdAccountDate
    // dan tidak memiliki undangan yang BUKAN ARCHIVED (semua undangannya sudah ARCHIVED atau kosong)
    const oldUsers = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        createdAt: { lt: thresholdAccountDate },
      },
      select: { id: true, invitations: { select: { id: true, status: true } } }
    });

    let totalDeletedUsers = 0;
    let totalDeletedFolders = 0;

    for (const user of oldUsers) {
      // Jika user masih punya undangan aktif (belum ARCHIVED), jangan hapus
      const hasActiveInvitation = user.invitations.some(inv => inv.status !== "ARCHIVED");
      if (hasActiveInvitation) continue;

      // Hapus fisik folder & portofolio HTML
      for (const inv of user.invitations) {
        // Hapus file fisik InvitationMedia dari R2 (sebelum user dihapus dan cascade)
        const medias = await prisma.invitationMedia.findMany({ where: { invitationId: inv.id } });
        if (medias.length > 0) {
          import("@/lib/storage").then(({ deleteFile }) => {
            Promise.all(medias.map(m => m.localPath ? deleteFile(m.localPath) : Promise.resolve())).catch(() => {});
          });
        }

        // Hapus folder media (untuk mode Local)
        const targetDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
        if (await fileExists(targetDir)) {
          try {
            await fs.promises.rm(targetDir, { recursive: true, force: true });
            totalDeletedFolders++;
          } catch {}
        }
        
        // Hapus HTML
        await deletePublishedHtml(inv.id);
      }

      // Hapus file fisik Order proofImageUrl dari R2 (sebelum user dihapus dan cascade)
      const userOrders = await prisma.order.findMany({ where: { userId: user.id } });
      if (userOrders.length > 0) {
        import("@/lib/storage").then(({ deleteFile }) => {
          Promise.all(userOrders.map(ord => ord.proofImageUrl ? deleteFile(ord.proofImageUrl) : Promise.resolve())).catch(() => {});
        });
      }

      // Hapus User (Otomatis Cascade Delete Invitation ARCHIVED nya beserta Order nya)
      await prisma.user.delete({ where: { id: user.id } });
      totalDeletedUsers++;
    }

    // Bersihkan file Order (Sama seperti dulu)
    const staleOrders = await prisma.order.findMany({
      where: {
        status: { in: ["EXPIRED", "FAILED", "PENDING"] },
        createdAt: { lt: thresholdOrderDate }, // Gunakan retensi order terpisah
      },
    });

    for (const ord of staleOrders) {
      if (ord.proofImageUrl) {
        try {
          const { deleteFile } = await import("@/lib/storage");
          await deleteFile(ord.proofImageUrl);
        } catch (e) {
          console.error("Gagal menghapus file proof lama dari cron:", e);
        }
      }
    }

    const deletedOrdersCount = await prisma.order.deleteMany({
      where: {
        status: { in: ["EXPIRED", "FAILED", "PENDING"] },
        createdAt: { lt: thresholdOrderDate },
      },
    });

    return NextResponse.json({
      success: true,
      transitionedInvitations: transitionCount,
      cleanedGalleries: cleanedGalleryCount,
      deletedUsers: totalDeletedUsers,
      deletedFolders: totalDeletedFolders,
      deletedOrders: deletedOrdersCount.count,
      message: `Pembersihan selesai: ${transitionCount} undangan dialihkan ke galeri momen, ${cleanedGalleryCount} galeri tamu kadaluarsa dibersihkan, ${totalDeletedUsers} klien lama dihapus.`
    });
  } catch (error: any) {
    console.error("[Cleanup Cron Error]", error);
    return NextResponse.json({ error: process.env.NODE_ENV === "production" ? "Gagal menjalankan auto-cleanup" : (error.message || "Gagal menjalankan auto-cleanup") }, { status: 500 });
  }
}

export async function GET(_req: NextRequest) {
  // GET endpoint sengaja dinonaktifkan — gunakan POST dengan Authorization: Bearer {CRON_SECRET}
  return NextResponse.json(
    { error: "Method tidak diizinkan. Gunakan POST dengan Authorization: Bearer {CRON_SECRET}" },
    { status: 405 }
  );
}

