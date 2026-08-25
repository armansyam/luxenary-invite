import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import fs from "fs";
import path from "path";

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

/**
 * Auto-Cleanup Routine:
 * 1. Cleans expired wedding invitations past grace threshold (e.g. H+7).
 * 2. Cleans stale EXPIRED/FAILED orders & unlinks rejected/expired proof receipt files.
 * 3. Cleans abandoned ghost client accounts (registered but never purchased & no invitations after threshold).
 */
export async function POST(req: NextRequest) {
  try {
    if (!(await isAuthorized(req))) {
      return NextResponse.json({ error: "Unauthorized: Invalid or missing CRON_SECRET / Admin session" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const daysThreshold = Number(body.daysThreshold) || 7; // Default 7 hari

    const now = new Date();
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;
    const thresholdDate = new Date(now.getTime() - thresholdMs);

    // ── 1. Bersihkan Undangan yang Lewat Masa Acara ──
    const allInvs = await prisma.invitation.findMany();
    const targetInvitations: any[] = [];

    for (const inv of allInvs) {
      if (inv.status === "TAKEN_DOWN") {
        targetInvitations.push(inv);
        continue;
      }

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

        if (latestEventDate) {
          const diffMs = now.getTime() - latestEventDate.getTime();
          if (diffMs > thresholdMs) {
            targetInvitations.push(inv);
          }
        }
      }
    }

    let foldersRemoved = 0;
    let totalFreedBytes = 0;
    const cleanedIds: string[] = [];

    for (const inv of targetInvitations) {
      const targetDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
      if (fs.existsSync(targetDir)) {
        try {
          const files = fs.readdirSync(targetDir);
          for (const f of files) {
            const stat = fs.statSync(path.join(targetDir, f));
            totalFreedBytes += stat.size;
          }
          fs.rmSync(targetDir, { recursive: true, force: true });
          foldersRemoved++;
        } catch (e) {
          console.error(`Failed to remove folder for ${inv.id}:`, e);
        }
      }

      await prisma.invitationMedia.deleteMany({
        where: { invitationId: inv.id },
      });
      cleanedIds.push(inv.id);
    }

    // ── 2. Bersihkan File Bukti Transfer & Order Tidak Dibayar (PENDING/EXPIRED/FAILED) yang Lewat Batas Waktu ──
    const staleOrders = await prisma.order.findMany({
      where: {
        status: { in: ["EXPIRED", "FAILED", "PENDING"] },
        createdAt: { lt: thresholdDate },
      },
    });

    let proofsDeleted = 0;
    for (const ord of staleOrders) {
      if (ord.proofImageUrl) {
        const filePath = path.join(process.cwd(), "public", ord.proofImageUrl.replace(/^\//, ""));
        if (fs.existsSync(filePath)) {
          try {
            fs.unlinkSync(filePath);
            proofsDeleted++;
          } catch {}
        }
      }
    }

    const deletedOrdersCount = await prisma.order.deleteMany({
      where: {
        status: { in: ["EXPIRED", "FAILED", "PENDING"] },
        createdAt: { lt: thresholdDate },
      },
    });

    // ── 3. Bersihkan Akun Calon Klien yang Tidak Melanjutkan (Ghost Accounts) ──
    // Klien terdaftar > thresholdDate yang tidak memiliki order PAID dan tidak memiliki undangan
    const ghostUsers = await prisma.user.findMany({
      where: {
        role: "CLIENT",
        createdAt: { lt: thresholdDate },
        orders: {
          none: { status: "PAID" },
        },
        invitations: {
          none: {},
        },
      },
      select: { id: true, email: true },
    });

    let deletedGhostUsers = 0;
    if (ghostUsers.length > 0) {
      const ghostIds = ghostUsers.map((u) => u.id);
      const res = await prisma.user.deleteMany({
        where: { id: { in: ghostIds } },
      });
      deletedGhostUsers = res.count;
    }

    return NextResponse.json({
      success: true,
      cleanedInvitations: cleanedIds.length,
      foldersRemoved,
      freedSpaceKB: Math.round(totalFreedBytes / 1024),
      deletedStaleOrders: deletedOrdersCount.count,
      deletedProofFiles: proofsDeleted,
      deletedGhostUsers,
      message: `Pembersihan selesai: ${deletedOrdersCount.count} order kedaluwarsa dibersihkan, ${deletedGhostUsers} akun yang tidak aktif dihapus, dan ${foldersRemoved} folder undangan dibebaskan.`,
    });
  } catch (error: any) {
    console.error("[Cleanup Cron Error]", error);
    return NextResponse.json({ error: error.message || "Gagal menjalankan auto-cleanup" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
