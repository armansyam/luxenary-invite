import "dotenv/config";
import { prisma, pool } from "../lib/prisma";
import { deletePublishedHtml } from "../lib/staticPublisher";
import fs from "fs";
import path from "path";

export interface CleanReport {
  timestamp: string;
  durationMs: number;
  database: {
    usersDeleted: number;
    ordersDeleted: number;
    invitationsDeleted: number;
    promoCouponsDeleted: number;
    promoHoldsDeleted: number;
  };
  filesystem: {
    orphanedDraftsDeleted: number;
    orphanedPublishedHtmlDeleted: number;
    orphanedUploadDirsDeleted: number;
    deletedFilesList: string[];
  };
}

export async function runTestCleanup(): Promise<CleanReport> {
  const startTime = performance.now();
  console.log("================================================================================");
  console.log("🧹 [CLEANUP SUITE] PEMBERSIHAN TOTAL DATA UJI & BERKAS FISIK YATIM (ORPHANS) 🧹");
  console.log("================================================================================\n");

  const report: CleanReport = {
    timestamp: new Date().toISOString(),
    durationMs: 0,
    database: {
      usersDeleted: 0,
      ordersDeleted: 0,
      invitationsDeleted: 0,
      promoCouponsDeleted: 0,
      promoHoldsDeleted: 0,
    },
    filesystem: {
      orphanedDraftsDeleted: 0,
      orphanedPublishedHtmlDeleted: 0,
      orphanedUploadDirsDeleted: 0,
      deletedFilesList: [],
    },
  };

  try {
    // -------------------------------------------------------------------------
    // 1. PEMBERSIHAN KUPON PROMO UJI & PROMO HOLD
    // -------------------------------------------------------------------------
    console.log("▶ [1/4] Memindai & membersihkan kupon promo dan promo hold uji...");
    const testCouponCodes = [
      { code: { startsWith: "FLASH_" } },
      { code: { startsWith: "TEST_" } },
      { code: { startsWith: "QA_" } },
      { code: { contains: "PENTEST" } },
    ];

    const deletedHolds = await prisma.promoHold.deleteMany({
      where: {
        OR: [
          { promoCode: { startsWith: "FLASH_" } },
          { promoCode: { startsWith: "TEST_" } },
          { promoCode: { startsWith: "QA_" } },
          { promoCode: { contains: "PENTEST" } },
        ],
      },
    });
    report.database.promoHoldsDeleted = deletedHolds.count;

    const deletedCoupons = await prisma.promoCoupon.deleteMany({
      where: { OR: testCouponCodes },
    });
    report.database.promoCouponsDeleted = deletedCoupons.count;
    console.log(`  ✅ Kupon Uji Dihapus: ${deletedCoupons.count} kupon, ${deletedHolds.count} promo hold.`);

    // -------------------------------------------------------------------------
    // 2. PEMBERSIHAN USER & RELASI DATA UJI COBA
    // -------------------------------------------------------------------------
    console.log("\n▶ [2/4] Memindai & membersihkan akun pengguna uji coba...");
    const testUserFilters = [
      { email: { startsWith: "qa_" } },
      { email: { startsWith: "test_" } },
      { email: { startsWith: "audit_" } },
      { email: { startsWith: "client_" } },
      { email: { contains: "@test.luxenary.com" } },
      { email: { contains: "pentest" } },
      { email: { contains: "competitor" } },
    ];

    // Ambil daftar ID user uji sebelum dihapus untuk melacak pesanan/undangan terkait
    const testUsers = await prisma.user.findMany({
      where: { OR: testUserFilters },
      select: { id: true, email: true },
    });

    const testUserIds = testUsers.map((u) => u.id);

    if (testUserIds.length > 0) {
      // Hapus order terkait user uji
      const deletedOrders = await prisma.order.deleteMany({
        where: { userId: { in: testUserIds } },
      });
      report.database.ordersDeleted += deletedOrders.count;

      // Hapus undangan terkait user uji
      const deletedInvs = await prisma.invitation.deleteMany({
        where: { userId: { in: testUserIds } },
      });
      report.database.invitationsDeleted += deletedInvs.count;

      // Hapus akun user uji
      const deletedUsers = await prisma.user.deleteMany({
        where: { id: { in: testUserIds } },
      });
      report.database.usersDeleted = deletedUsers.count;
      console.log(`  ✅ Akun Uji Dihapus: ${deletedUsers.count} users, ${deletedOrders.count} orders, ${deletedInvs.count} invitations.`);
    } else {
      console.log("  ℹ️ Tidak ditemukan akun pengguna uji di database.");
    }

    // Bersihkan order uji yatim yang tersisa berdasarkan format invoice
    const orphanOrders = await prisma.order.deleteMany({
      where: {
        OR: [
          { invoiceNumber: { startsWith: "INV-TEST" } },
          { invoiceNumber: { startsWith: "INV-AUDIT" } },
          { invoiceNumber: { startsWith: "INV-STRESS" } },
          { invoiceNumber: { startsWith: "INV-PEN" } },
          { invoiceNumber: { startsWith: "INV-RACE" } },
          { invoiceNumber: { startsWith: "INV-FIN" } },
          { invoiceNumber: { startsWith: "INV-UPG" } },
          { invoiceNumber: { startsWith: "INV-INIT" } },
          { invoiceNumber: { startsWith: "INV-TOPUP" } },
        ],
      },
    });
    report.database.ordersDeleted += orphanOrders.count;

    // -------------------------------------------------------------------------
    // 3. PEMBERSIHAN BERKAS FISIK YATIM (ORPHANED FILES PURGE)
    // -------------------------------------------------------------------------
    console.log("\n▶ [3/4] Memindai berkas fisik yatim (Drafts, Published HTML, Uploads)...");

    // Ambil seluruh ID undangan aktif yang sah di PostgreSQL
    const allActiveInvitations = await prisma.invitation.findMany({
      select: { id: true },
    });
    const validInvitationIds = new Set(allActiveInvitations.map((inv) => inv.id));

    // 3A. Scan data/drafts/
    const draftsDir = path.join(process.cwd(), "data", "drafts");
    if (fs.existsSync(draftsDir)) {
      const draftFiles = fs.readdirSync(draftsDir);
      for (const file of draftFiles) {
        if (!file.endsWith(".html")) continue;
        const invId = file.replace(/\.html$/, "");
        if (!validInvitationIds.has(invId)) {
          const filePath = path.join(draftsDir, file);
          try {
            fs.unlinkSync(filePath);
            report.filesystem.orphanedDraftsDeleted++;
            report.filesystem.deletedFilesList.push(`data/drafts/${file}`);
            console.log(`  🗑️ Menghapus draft yatim: data/drafts/${file}`);
          } catch (e: any) {
            console.warn(`  ⚠️ Gagal menghapus draft: ${file} (${e.message})`);
          }
        }
      }
    }

    // 3B. Scan public/published/ids/
    const publishedDir = path.join(process.cwd(), "public", "published", "ids");
    if (fs.existsSync(publishedDir)) {
      const publishedFiles = fs.readdirSync(publishedDir);
      for (const file of publishedFiles) {
        if (!file.endsWith(".html")) continue;
        const invId = file.replace(/\.html$/, "");
        if (!validInvitationIds.has(invId)) {
          const filePath = path.join(publishedDir, file);
          try {
            fs.unlinkSync(filePath);
            report.filesystem.orphanedPublishedHtmlDeleted++;
            report.filesystem.deletedFilesList.push(`public/published/ids/${file}`);
            console.log(`  🗑️ Menghapus published HTML yatim: public/published/ids/${file}`);
          } catch (e: any) {
            console.warn(`  ⚠️ Gagal menghapus published file: ${file} (${e.message})`);
          }
        }
      }
    }

    // 3C. Scan public/uploads/invitations/
    const uploadsBaseDir = path.join(process.cwd(), "public", "uploads", "invitations");
    if (fs.existsSync(uploadsBaseDir)) {
      const uploadFolders = fs.readdirSync(uploadsBaseDir);
      for (const folder of uploadFolders) {
        const fullPath = path.join(uploadsBaseDir, folder);
        if (fs.statSync(fullPath).isDirectory() && !validInvitationIds.has(folder)) {
          try {
            fs.rmSync(fullPath, { recursive: true, force: true });
            report.filesystem.orphanedUploadDirsDeleted++;
            report.filesystem.deletedFilesList.push(`public/uploads/invitations/${folder}/`);
            console.log(`  🗑️ Menghapus folder upload yatim: public/uploads/invitations/${folder}/`);
          } catch (e: any) {
            console.warn(`  ⚠️ Gagal menghapus upload folder: ${folder} (${e.message})`);
          }
        }
      }
    }

    // -------------------------------------------------------------------------
    // 4. MEMBUKUKAN LAPORAN PEMBERSIHAN KE reports/
    // -------------------------------------------------------------------------
    console.log("\n▶ [4/4] Menyimpan laporan pembersihan...");
    const reportsDir = path.join(process.cwd(), "reports");
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    report.durationMs = Number((performance.now() - startTime).toFixed(2));
    const reportFilePath = path.join(reportsDir, "clean-report.json");
    fs.writeFileSync(reportFilePath, JSON.stringify(report, null, 2), "utf-8");
    console.log(`  ✅ Laporan pembersihan disimpan di: ${reportFilePath}`);

  } catch (err: any) {
    console.error("❌ Terjadi kesalahan selama proses pembersihan:", err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }

  console.log("\n================================================================================");
  console.log("📊 RINGKASAN METRIK PEMBERSIHAN TOTAL (CLEANUP AUDIT)");
  console.log("================================================================================");
  console.log(`• Akun Pengguna Uji Dihapus : ${report.database.usersDeleted} row`);
  console.log(`• Pesanan/Order Uji Dihapus : ${report.database.ordersDeleted} row`);
  console.log(`• Undangan Uji Dihapus      : ${report.database.invitationsDeleted} row`);
  console.log(`• Kupon & Hold Uji Dihapus  : ${report.database.promoCouponsDeleted} kupon / ${report.database.promoHoldsDeleted} hold`);
  console.log(`• Draft HTML Yatim Dihapus  : ${report.filesystem.orphanedDraftsDeleted} file`);
  console.log(`• Published Yatim Dihapus   : ${report.filesystem.orphanedPublishedHtmlDeleted} file`);
  console.log(`• Folder Upload Yatim Dihapus: ${report.filesystem.orphanedUploadDirsDeleted} dir`);
  console.log(`• Total Durasi Pembersihan  : ${report.durationMs} ms`);
  console.log("================================================================================\n");

  return report;
}

if (require.main === module) {
  runTestCleanup().then(() => {
    process.exit(0);
  }).catch((err) => {
    console.error("Fatal cleanup error:", err);
    process.exit(1);
  });
}
