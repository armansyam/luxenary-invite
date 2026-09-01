import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { isSubdomainExpired } from "../lib/domainUtils";

// Initialize SQLite adapter securely
const dbPath = process.env.DATABASE_URL
  ? path.resolve(process.cwd(), process.env.DATABASE_URL.replace(/^file:/, ""))
  : path.resolve(process.cwd(), "dev.db");

const dbUrl = `file:${dbPath}`;
const adapter = new PrismaBetterSqlite3({ url: dbUrl, timeout: 5000 });
const prisma = new PrismaClient({ adapter });

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
    let totalDeleted = 0;
    let totalBytesFreed = 0;

    for (const draft of abandonedDrafts) {
      const draftFolder = path.join(uploadsDir, draft.id);
      
      // Jika foldernya ada, hitung isinya lalu hapus
      if (fs.existsSync(draftFolder)) {
        const files = await fs.promises.readdir(draftFolder);
        if (files.length > 0) {
          console.log(`- Folder: ${draft.id} memiliki ${files.length} file usang.`);
          
          for (const file of files) {
            const filePath = path.join(draftFolder, file);
            const stats = await fs.promises.stat(filePath);
            totalBytesFreed += stats.size;
            
            if (!DRY_RUN) {
              await fs.promises.unlink(filePath);
            }
          }
          
          if (!DRY_RUN) {
            await fs.promises.rmdir(draftFolder);
          }
          totalDeleted++;
        }
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
    const adminSetting = await prisma.adminSetting.findUnique({ where: { key: "retention_invitation_days" } });
    const retentionDays = adminSetting?.value ? parseInt(adminSetting.value, 10) : 30;
    
    const publishedInvitations = await prisma.invitation.findMany({
      where: {
        status: "PUBLISHED",
        subdomain: { not: null }
      },
      select: {
        id: true,
        subdomain: true,
        eventData: true
      }
    });

    let expiredCount = 0;
    const publishedDir = path.join(process.cwd(), "public", "published");

    for (const inv of publishedInvitations) {
      let eventDateToTest: string | null = null;
      try {
        if (inv.eventData) {
          const parsed = JSON.parse(inv.eventData);
          if (Array.isArray(parsed) && parsed[0]?.date) {
            eventDateToTest = parsed[0].date;
          }
        }
      } catch {}

      if (isSubdomainExpired(eventDateToTest, retentionDays)) {
        console.log(`- Undangan [${inv.subdomain}] telah kedaluwarsa (> ${retentionDays} hari setelah acara).`);
        expiredCount++;
        
        if (!DRY_RUN) {
          // 1. Hapus file fisik di public/published/ (TIDAK menghapus file di public/portfolio/)
          const subPath = path.join(publishedDir, `${inv.subdomain}.html`);
          try {
            if (fs.existsSync(subPath)) {
              await fs.promises.unlink(subPath);
            }
          } catch (e) {
            console.error(`Gagal menghapus file statis untuk ${inv.subdomain}:`, e);
          }

          // 2. Cabut subdomain dari database agar bisa dipakai pengguna lain
          await prisma.invitation.update({
            where: { id: inv.id },
            data: { subdomain: null }
          });
          console.log(`  ✅ Subdomain [${inv.subdomain}] berhasil dilepas dan diarsipkan menjadi portofolio permanen.`);
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
  }
}

runCleanup();
