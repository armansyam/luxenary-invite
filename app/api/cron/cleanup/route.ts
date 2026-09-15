import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "@/lib/staticPublisher";
import { getLatestEventDate } from "@/lib/domainUtils";

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

    const retentionCleanupSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_cleanup_days" } });
    const retentionOrderSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_order_days" } });
    const subdomainAutoRecycleSetting = await prisma.adminSetting.findUnique({ where: { key: "subdomain_auto_recycle" } });

    // 1 Jadwal Tunggal Retensi Pasca-Acara (Default: 14 hari)
    const cleanupDays = Number(retentionCleanupSetting?.value) || 14;
    const retentionOrderDays = Number(retentionOrderSetting?.value) || 90;
    const isAutoRecycleSubdomain = (subdomainAutoRecycleSetting?.value || "true") === "true";

    const now = new Date();
    const thresholdOrderDate = new Date(now.getTime() - (retentionOrderDays * 24 * 60 * 60 * 1000));

    // ── FASE 1: Transisi Undangan Selesai ke EVENT_FINISHED ──
    // Undangan yang tanggal resepsinya sudah terlewati ditandai EVENT_FINISHED
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
      if (latestDate && now > latestDate) {
        // Pastikan canonical published HTML tersimpan
        await buildAndSavePublishedHtml(inv.id);

        await prisma.invitation.update({
          where: { id: inv.id },
          data: { status: "EVENT_FINISHED" }
        });
        transitionCount++;
      }
    }

    // ── FASE 2: Pembersihan Terpadu Pasca-Acara (H + cleanupDays ATAU galleryExpiresAt) ──
    // Berjalan serentak pada H+14 (atau sesuai batas extend time):
    // 1. Bersihkan foto candid tamu di R2 & local
    // 2. Daur ulang subdomain ke pool (subdomain: null) jika auto-recycle aktif
    // 3. Bersihkan data RSVP yang kedaluwarsa
    // 4. Ubah status undangan menjadi ARCHIVED (Akun klien tetap abadi)
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

    let cleanedCount = 0;
    let recycledSubdomainCount = 0;

    for (const inv of finishedInvs) {
      const latestDate = getLatestEventDate(inv.eventData);
      const effectiveExpiry = inv.galleryExpiresAt || (latestDate ? new Date(latestDate.getTime() + (cleanupDays * 24 * 60 * 60 * 1000)) : null);

      if (effectiveExpiry && now > effectiveExpiry) {
        // 1. Hapus foto candid tamu dari R2 & local
        const memories = await prisma.guestMemory.findMany({ where: { invitationId: inv.id } });
        if (memories.length > 0) {
          const { deleteFile } = await import("@/lib/storage");
          await Promise.all(memories.map(mem => mem.mediaUrl ? deleteFile(mem.mediaUrl) : Promise.resolve())).catch(() => {});
        }
        await prisma.guestMemory.deleteMany({ where: { invitationId: inv.id } });

        const memoriesDir = path.join(process.cwd(), "public", "uploads", "guest-memories", inv.id);
        const legacyMemoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id, "memories");
        try {
          if (await fileExists(memoriesDir)) await fs.promises.rm(memoriesDir, { recursive: true, force: true });
          if (await fileExists(legacyMemoriesDir)) await fs.promises.rm(legacyMemoriesDir, { recursive: true, force: true });
        } catch {}

        // 2. Bersihkan formulir RSVP kedaluwarsa
        await prisma.rsvp.deleteMany({ where: { invitationId: inv.id } });

        // 3. Daur ulang subdomain ke pool dan tandai ARCHIVED
        const shouldReleaseSubdomain = isAutoRecycleSubdomain && Boolean(inv.subdomain);
        await prisma.invitation.update({
          where: { id: inv.id },
          data: {
            memoriesUploadLocked: true,
            status: "ARCHIVED",
            subdomain: shouldReleaseSubdomain ? null : inv.subdomain,
          }
        });

        if (shouldReleaseSubdomain) recycledSubdomainCount++;
        cleanedCount++;
      }
    }

    // ── FASE 5: Pembersihan Mandiri Sampah File Draft (Orphaned Drafts) ──
    const draftsDir = path.join(process.cwd(), "data", "drafts");
    let cleanedOrphanedDraftsCount = 0;
    if (await fileExists(draftsDir)) {
      try {
        const draftFiles = await fs.promises.readdir(draftsDir);
        for (const file of draftFiles) {
          if (!file.endsWith(".html")) continue;
          const invId = file.replace(".html", "");
          const invExists = await prisma.invitation.findUnique({
            where: { id: invId },
            select: { id: true },
          });
          if (!invExists) {
            await fs.promises.unlink(path.join(draftsDir, file)).catch(() => {});
            cleanedOrphanedDraftsCount++;
          }
        }
      } catch (err) {
        console.error("Gagal membersihkan orphaned drafts:", err);
      }
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
      recycledSubdomains: recycledSubdomainCount,
      cleanedInvitations: cleanedCount,
      deletedOrders: deletedOrdersCount.count,
      message: `Pembersihan selesai: ${transitionCount} undangan ditransisikan ke selesai, ${recycledSubdomainCount} subdomain didaur ulang, ${cleanedCount} berkas foto/media kedaluwarsa dibersihkan.`,
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

