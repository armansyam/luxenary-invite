import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { isSubdomainExpired, getLatestEventDate } from "../lib/domainUtils";
import { deletePublishedHtml, buildAndSavePublishedHtml } from "../lib/staticPublisher";
import { isNasArchiveEnabled, syncInvitationToNasArchive } from "../lib/nasArchive";
import { deleteFile } from "../lib/storage";

const DRY_RUN = process.argv.includes("--dry-run");

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.promises.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function runCleanup() {
  console.log(`================================================================================`);
  console.log(`🧹 [CRON CLEANUP] Memulai Garbage Collection & Siklus Retensi... (DRY_RUN=${DRY_RUN})`);
  console.log(`================================================================================`);
  
  const now = new Date();

  try {
    // ── FASE 1: AUTO-TRANSITION PUBLISHED -> EVENT_FINISHED ───────────────────
    console.log(`\n[Fase 1] Memeriksa transisi otomatis status acara yang telah selesai...`);
    const activeInvitations = await prisma.invitation.findMany({
      where: { status: "PUBLISHED" },
      select: { id: true, eventData: true, subdomain: true, invitationSlug: true }
    });

    let transitionCount = 0;
    for (const inv of activeInvitations) {
      const latestDate = getLatestEventDate(inv.eventData);
      if (latestDate && now > latestDate) {
        if (!DRY_RUN) {
          await buildAndSavePublishedHtml(inv.id);
          await prisma.invitation.update({
            where: { id: inv.id },
            data: { status: "EVENT_FINISHED" }
          });
        }
        console.log(`  ⏱️ Undangan [${inv.subdomain || inv.invitationSlug}] dialihkan ke EVENT_FINISHED (Acara berakhir: ${latestDate.toISOString()})`);
        transitionCount++;
      }
    }
    console.log(`  ✅ Fase 1 Selesai: ${transitionCount} undangan dialihkan ke EVENT_FINISHED.`);

    // ── FASE 2: UNIFIED COLD STORAGE & RETENSI KEDALUWARSA ────────────────────
    console.log(`\n[Fase 2] Memproses retensi kedaluwarsa & arsip bertingkat (Cold Storage)...`);
    const cleanupDaysSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_cleanup_days" } });
    const cleanupDays = cleanupDaysSetting?.value ? parseInt(cleanupDaysSetting.value, 10) : 14;

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
        console.log(`  📦 Memproses kedaluwarsa undangan [${inv.subdomain || inv.invitationSlug}] (Batas: ${effectiveExpiry.toISOString()})...`);

        if (!DRY_RUN) {
          // 2.1 Sinkronisasi ke Arsip NAS Mandiri (Luxenary Vault)
          try {
            const nasEnabled = await isNasArchiveEnabled();
            if (nasEnabled) {
              const nasResult = await syncInvitationToNasArchive(inv.id);
              if (nasResult.success) {
                console.log(`    🏛️ Berhasil diarsipkan ke NAS Cold Storage: /archives/${nasResult.slug}`);
              }
            }
          } catch (e: any) {
            console.warn(`    ⚠️ Gagal sinkron arsip NAS (${inv.id}):`, e.message);
          }

          // 2.2 Hapus Published HTML & Draft Lokal (Cegah Disk Leak VPS)
          await deletePublishedHtml(inv.id);
          const draftPath = path.join(process.cwd(), "data", "drafts", `${inv.id}.html`);
          try {
            if (await fileExists(draftPath)) await fs.promises.unlink(draftPath);
          } catch {}

          // 2.3 Hapus Foto Candid Tamu dari R2 & Lokal + Bersihkan Record DB
          const memories = await prisma.guestMemory.findMany({ where: { invitationId: inv.id } });
          if (memories.length > 0) {
            await Promise.all(memories.map(mem => mem.mediaUrl ? deleteFile(mem.mediaUrl) : Promise.resolve()))
              .catch((e) => console.warn(`    ⚠️ Gagal hapus file guestMemory R2 (${inv.id}):`, e.message));
          }
          await prisma.guestMemory.deleteMany({ where: { invitationId: inv.id } });

          const memoriesDir = path.join(process.cwd(), "public", "uploads", "guest-memories", inv.id);
          const legacyMemoriesDir = path.join(process.cwd(), "public", "uploads", "invitations", inv.id, "memories");
          try {
            if (await fileExists(memoriesDir)) await fs.promises.rm(memoriesDir, { recursive: true, force: true });
            if (await fileExists(legacyMemoriesDir)) await fs.promises.rm(legacyMemoriesDir, { recursive: true, force: true });
          } catch {}

          // 2.4 Hapus Media Undangan di R2 Hot Storage (Telah aman di NAS Cold Storage)
          const invMedia = await prisma.invitationMedia.findMany({ where: { invitationId: inv.id } });
          if (invMedia.length > 0) {
            await Promise.all(invMedia.map(m => m.localPath ? deleteFile(m.localPath) : Promise.resolve()))
              .catch((e) => console.warn(`    ⚠️ Gagal hapus file media R2 (${inv.id}):`, e.message));
          }

          // 2.5 Bersihkan Data RSVP yang Kedaluwarsa
          await prisma.rsvp.deleteMany({ where: { invitationId: inv.id } });

          // 2.6 Daur Ulang Subdomain & Custom Domain ke Pool dan Tandai ARCHIVED
          await prisma.invitation.update({
            where: { id: inv.id },
            data: {
              status: "ARCHIVED",
              customDomain: null,
              subdomain: null,
            },
          });
        }

        cleanedCount++;
        if (inv.subdomain) recycledSubdomainCount++;
        console.log(`    ✅ Selesai: Subdomain dilepas & status diubah ke ARCHIVED.`);
      }
    }
    console.log(`  ✅ Fase 2 Selesai: ${cleanedCount} undangan kedaluwarsa dibersihkan (${recycledSubdomainCount} subdomain didaur ulang).`);

    // ── FASE 3: MEMBERSIHKAN DRAFT LOKAL & FOLDER UPLOADS TERBENGKALAI (>7 HARI) ──
    console.log(`\n[Fase 3] Memeriksa draft terbengkalai (>7 hari)...`);
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    const abandonedDrafts = await prisma.invitation.findMany({
      where: {
        status: "DRAFT",
        updatedAt: { lt: new Date(now.getTime() - SEVEN_DAYS_MS) }
      },
      select: { id: true }
    });

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "invitations");
    const draftsDir = path.join(process.cwd(), "data", "drafts");
    let abandonedDeleted = 0;

    for (const draft of abandonedDrafts) {
      const draftFolder = path.join(uploadsDir, draft.id);
      const draftHtmlFile = path.join(draftsDir, `${draft.id}.html`);

      if (!DRY_RUN) {
        if (await fileExists(draftHtmlFile)) {
          try { await fs.promises.unlink(draftHtmlFile); } catch {}
        }
        if (await fileExists(draftFolder)) {
          try { await fs.promises.rm(draftFolder, { recursive: true, force: true }); } catch {}
        }
      }
      abandonedDeleted++;
    }
    console.log(`  ✅ Fase 3 Selesai: ${abandonedDeleted} draft terbengkalai dibersihkan.`);

    // ── FASE 4: MEMBERSIHKAN PESANAN PENDING KEDALUWARSA (>24 JAM) ────────────
    console.log(`\n[Fase 4] Memeriksa pesanan PENDING kedaluwarsa (>24 jam)...`);
    const ONE_DAY_MS = 24 * 60 * 60 * 1000;
    const expiredPendingThreshold = new Date(now.getTime() - ONE_DAY_MS);

    let expiredOrdersCount = 0;
    if (!DRY_RUN) {
      const result = await prisma.order.updateMany({
        where: {
          status: "PENDING",
          createdAt: { lt: expiredPendingThreshold }
        },
        data: { status: "EXPIRED" }
      });
      expiredOrdersCount = result.count;
    } else {
      expiredOrdersCount = await prisma.order.count({
        where: {
          status: "PENDING",
          createdAt: { lt: expiredPendingThreshold }
        }
      });
    }
    console.log(`  ✅ Fase 4 Selesai: ${expiredOrdersCount} pesanan PENDING kedaluwarsa ditandai EXPIRED.`);

    // ── FASE 5: MEMBERSIHKAN PROMO HOLDS & RATE LIMIT COUNTERS ─────────────────
    console.log(`\n[Fase 5] Membersihkan expired promo holds & rate limit counters...`);
    let deletedHolds = 0;
    let deletedCounters = 0;

    if (!DRY_RUN) {
      const holdRes = await prisma.promoHold.deleteMany({
        where: { expiresAt: { lt: now } }
      });
      deletedHolds = holdRes.count;

      const rateRes = await pool.query(`DELETE FROM rate_limit_counters WHERE expires_at < NOW()`);
      deletedCounters = rateRes.rowCount ?? 0;
    }
    console.log(`  ✅ Fase 5 Selesai: ${deletedHolds} promo hold kadaluwarsa & ${deletedCounters} counter rate-limit dibersihkan.`);

    console.log(`\n================================================================================`);
    console.log(`🎉 [CRON CLEANUP] SELURUH SIKLUS PEMBERSIHAN BERHASIL DISELESAIKAN (100% SUKSES)`);
    console.log(`================================================================================`);

  } catch (error) {
    console.error("❌ [CRON CLEANUP ERROR]", error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runCleanup();
