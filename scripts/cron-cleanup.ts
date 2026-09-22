import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import fs from "fs";
import path from "path";
import { isSubdomainExpired } from "../lib/domainUtils";
import { deletePublishedHtml } from "../lib/staticPublisher";

const DRY_RUN = process.argv.includes("--dry-run");

async function runCleanup() {
  console.log(`[CLEANUP] Starting Garbage Collection... (DRY_RUN=${DRY_RUN})`);
  
  // Ambil batasan umur draft (7 hari)
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const thresholdDate = new Date(Date.now() - SEVEN_DAYS_MS);

  try {
    // 1. Cari semua undangan yang DRAFT dan sudah lama tidak diupdate
    const abandonedDrafts = await prisma.invitation.findMany({
      where: {
        status: "DRAFT",
        updatedAt: {
          lt: thresholdDate,
        }
      },
      select: {
        id: true,
        updatedAt: true
      }
    });

    console.log(`[CLEANUP] Ditemukan ${abandonedDrafts.length} undangan DRAFT yang diabaikan.`);

    const uploadsDir = path.join(process.cwd(), "public", "uploads", "invitations");
    const draftsDir = path.join(process.cwd(), "data", "drafts");
    let totalDeleted = 0;
    let totalBytesFreed = 0;

    for (const draft of abandonedDrafts) {
      const draftFolder = path.join(uploadsDir, draft.id);
      const draftHtmlFile = path.join(draftsDir, `${draft.id}.html`);
      
      // Hapus draft HTML fisik jika ada
      if (fs.existsSync(draftHtmlFile)) {
        const stat = await fs.promises.stat(draftHtmlFile);
        totalBytesFreed += stat.size;
        if (!DRY_RUN) {
          try { await fs.promises.unlink(draftHtmlFile); } catch {}
        }
      }

      // Jika folder uploads ada, hapus seluruh isinya secara rekursif
      if (fs.existsSync(draftFolder)) {
        if (!DRY_RUN) {
          try { await fs.promises.rm(draftFolder, { recursive: true, force: true }); } catch {}
        }
        totalDeleted++;
      }
    }

    const mbFreed = (totalBytesFreed / (1024 * 1024)).toFixed(2);
    if (DRY_RUN) {
      console.log(`[CLEANUP DRY-RUN] Simulasi Draft selesai. Potensi pembebasan ruang: ${mbFreed} MB dari ${totalDeleted} folder.`);
    } else {
      console.log(`[CLEANUP] Eksekusi Draft selesai. Berhasil membebaskan ${mbFreed} MB dari ${totalDeleted} folder.`);
    }

    // 2. Cari semua undangan PUBLISHED yang memiliki subdomain untuk dicek masa kedaluwarsanya
    console.log(`[CLEANUP] Mengecek masa aktif undangan PUBLISHED...`);
    const adminSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_cleanup_days" } });
    const retentionDays = adminSetting?.value ? parseInt(adminSetting.value, 10) : 30;
    
    const publishedInvitations = await prisma.invitation.findMany({
      where: {
        status: { in: ["PUBLISHED", "EVENT_FINISHED"] },
        subdomain: { not: null }
      },
      select: {
        id: true,
        subdomain: true,
        eventData: true
      }
    });

    let expiredCount = 0;

    for (const inv of publishedInvitations) {
      if (isSubdomainExpired(inv.eventData, retentionDays)) {
        console.log(`- Undangan [${inv.subdomain}] telah kedaluwarsa (> ${retentionDays} hari setelah acara).`);
        expiredCount++;
        
        if (!DRY_RUN) {
          // 1. Hapus Single Source of Truth Canonical HTML (public/published/ids/[id].html)
          await deletePublishedHtml(inv.id);

          // 2. Hapus draft lokal data/drafts/[id].html jika ada
          const draftHtml = path.join(process.cwd(), "data", "drafts", `${inv.id}.html`);
          if (fs.existsSync(draftHtml)) {
            try { await fs.promises.unlink(draftHtml); } catch {}
          }

          // 3. Cabut subdomain dari database dan ubah status menjadi ARCHIVED
          await prisma.invitation.update({
            where: { id: inv.id },
            data: {
              subdomain: null,
              status: "ARCHIVED"
            }
          });
          console.log(`  ✅ Subdomain [${inv.subdomain}] berhasil dilepas dan status dialihkan ke ARCHIVED.`);
        }
      }
    }

    if (DRY_RUN) {
      console.log(`[CLEANUP DRY-RUN] Ditemukan ${expiredCount} subdomain yang akan di-release.`);
    } else {
      console.log(`[CLEANUP] Eksekusi Expired Subdomain selesai. ${expiredCount} subdomain telah di-release.`);
    }

  } catch (error) {
    console.error("[CLEANUP ERROR]", error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

runCleanup();
