import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";
import { buildAndSavePublishedHtml, deletePublishedHtml } from "@/lib/staticPublisher";

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
  
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  
  const session = await auth();
  const isAdmin = (session?.user as any)?.isAdmin === true || (session?.user as any)?.role === "ADMIN" || (session?.user as any)?.role === "SUPER_ADMIN";
  return isAdmin;
}

export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET / Admin session" }, { status: 401 });
    }

    const retentionInvitationSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_invitation_days" } });
    const retentionAccountSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_account_days" } });

    const retentionInvitationDays = Number(retentionInvitationSetting?.value) || 30;
    const retentionAccountDays = Number(retentionAccountSetting?.value) || 365;

    const now = new Date();
    const thresholdInvitationDate = new Date(now.getTime() - (retentionInvitationDays * 24 * 60 * 60 * 1000));
    const thresholdAccountDate = new Date(now.getTime() - (retentionAccountDays * 24 * 60 * 60 * 1000));

    // ── TAHAP 1: Retensi Undangan (H+30) ──
    const allInvs = await prisma.invitation.findMany({
      select: {
        id: true,
        status: true,
        eventData: true,
        groomSlug: true,
        brideSlug: true,
        invitationSlug: true,
      }
    });

    const targetInvitations: any[] = [];
    for (const inv of allInvs) {
      if (inv.status === "TAKEN_DOWN" || inv.status === "ARCHIVED") continue;

      let events: any[] = [];
      try {
        events = typeof inv.eventData === "string" ? JSON.parse(inv.eventData) : inv.eventData || [];
      } catch {
        events = [];
      }

      if (events.length > 0) {
        let latestEventDate: Date | null = null;
        for (const ev of events) {
          if (ev.date) {
            const d = new Date(ev.date);
            if (!isNaN(d.getTime())) {
              if (!latestEventDate || d > latestEventDate) latestEventDate = d;
            }
          }
        }
        if (latestEventDate && latestEventDate < thresholdInvitationDate) {
          targetInvitations.push(inv);
        }
      }
    }

    let archivedCount = 0;
    for (const inv of targetInvitations) {
      // 1. Bake Static HTML for Portfolio Archive (Saves to public/portfolio/...)
      await buildAndSavePublishedHtml(inv.id);

      // 2. Archive Invitation: Rename slugs to free up subdomain, mark as ARCHIVED
      const archiveSlug = `archived-${inv.id}`;
      await prisma.invitation.update({
        where: { id: inv.id },
        data: {
          groomSlug: `${archiveSlug}-groom`,
          brideSlug: `${archiveSlug}-bride`,
          invitationSlug: `${archiveSlug}-slug`,
          status: "ARCHIVED"
        }
      });

      // 3. Delete interactive data (Guests, RSVPs, Wishes, GuestMemories)
      await prisma.guest.deleteMany({ where: { invitationId: inv.id } });
      await prisma.rsvp.deleteMany({ where: { invitationId: inv.id } });
      await prisma.wish.deleteMany({ where: { invitationId: inv.id } });
      await prisma.guestMemory.deleteMany({ where: { invitationId: inv.id } });

      // 4. Delete the memories physical folder to free up space at H+30
      const memoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id, "memories");
      try {
        if (await fileExists(memoriesDir)) {
          await fs.promises.rm(memoriesDir, { recursive: true, force: true });
        }
      } catch (err) {
        console.warn(`[Cleanup Cron] Failed to delete memories folder for ${inv.id}:`, err);
      }

      archivedCount++;
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
        // Hapus folder media
        const targetDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
        if (await fileExists(targetDir)) {
          try {
            await fs.promises.rm(targetDir, { recursive: true, force: true });
            totalDeletedFolders++;
          } catch {}
        }
        
        // Hapus HTML
        await deletePublishedHtml(inv.id);
        // Hapus portfolio HTML juga jika kita tau pattern awalnya
        // (kita tidak tahu slug aslinya karena sudah direname, jadi portfolio mungkin jadi yatim.
        // Tapi setidaknya folder besarnya sudah terhapus)
      }

      // Hapus User (Otomatis Cascade Delete Invitation ARCHIVED nya)
      await prisma.user.delete({ where: { id: user.id } });
      totalDeletedUsers++;
    }

    // Bersihkan file Order (Sama seperti dulu)
    const staleOrders = await prisma.order.findMany({
      where: {
        status: { in: ["EXPIRED", "FAILED", "PENDING"] },
        createdAt: { lt: thresholdInvitationDate }, // Bebas, ikuti invitation date
      },
    });

    for (const ord of staleOrders) {
      if (ord.proofImageUrl) {
        const filePath = path.join(process.cwd(), "public", ord.proofImageUrl.replace(/^\//, ""));
        if (await fileExists(filePath)) {
          try { await fs.promises.unlink(filePath); } catch {}
        }
      }
    }

    const deletedOrdersCount = await prisma.order.deleteMany({
      where: {
        status: { in: ["EXPIRED", "FAILED", "PENDING"] },
        createdAt: { lt: thresholdInvitationDate },
      },
    });

    return NextResponse.json({
      success: true,
      archivedInvitations: archivedCount,
      deletedUsers: totalDeletedUsers,
      deletedFolders: totalDeletedFolders,
      deletedOrders: deletedOrdersCount.count,
      message: `Pembersihan selesai: ${archivedCount} undangan diarsipkan (Subdomain recycle), ${totalDeletedUsers} klien lama & ${totalDeletedFolders} folder dihapus.`
    });
  } catch (error: any) {
    console.error("[Cleanup Cron Error]", error);
    return NextResponse.json({ error: error.message || "Gagal menjalankan auto-cleanup" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
