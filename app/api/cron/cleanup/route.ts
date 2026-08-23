import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

/**
 * Auto-Cleanup Routine for Expired Wedding Invitations (e.g. H+3 / H+7 after wedding date)
 * Triggerable via Cron / Webhook or Admin Manual Maintenance Action
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const daysThreshold = Number(body.daysThreshold) || 3; // Default H+3
    const specificInvitationId = body.invitationId as string | undefined;

    const now = new Date();
    const thresholdMs = daysThreshold * 24 * 60 * 60 * 1000;

    let targetInvitations = [];

    if (specificInvitationId) {
      const inv = await prisma.invitation.findUnique({ where: { id: specificInvitationId } });
      if (inv) targetInvitations.push(inv);
    } else {
      // Find all invitations with events past threshold or marked EXPIRED
      const allInvs = await prisma.invitation.findMany();
      for (const inv of allInvs) {
        if (inv.status === "TAKEN_DOWN") {
          targetInvitations.push(inv);
          continue;
        }

        // Check date of the latest event
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
    }

    let foldersRemoved = 0;
    let totalFreedBytes = 0;
    const cleanedIds: string[] = [];

    for (const inv of targetInvitations) {
      const targetDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id);
      if (fs.existsSync(targetDir)) {
        try {
          // Calculate folder size before deleting
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

      // Clean media records in database
      await prisma.invitationMedia.deleteMany({
        where: { invitationId: inv.id },
      });

      cleanedIds.push(inv.id);
    }

    return NextResponse.json({
      success: true,
      cleanedCount: cleanedIds.length,
      foldersRemoved,
      freedSpaceKB: Math.round(totalFreedBytes / 1024),
      cleanedInvitations: cleanedIds,
      message: `Pembersihan H+${daysThreshold} selesai. ${foldersRemoved} folder undangan dibersihkan (${Math.round(totalFreedBytes / 1024)} KB dibebaskan).`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Gagal menjalankan auto-cleanup" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
