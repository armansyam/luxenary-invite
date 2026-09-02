/**
 * ONE-TIME PIN ENCRYPTION MIGRATION SCRIPT
 * =========================================
 * Mengenkripsi semua staffPin existing (plain-text) ke format AES-256-GCM
 *
 * JALANKAN SEKALI SAJA dengan perintah:
 *   npx tsx scripts/migrate-pin-encrypt.ts
 *
 * SEBELUM MENJALANKAN:
 * 1. Pastikan PIN_ENCRYPTION_KEY sudah diset di .env
 *    Generate: openssl rand -hex 32
 * 2. Buat backup database terlebih dahulu!
 *    cp dev.db dev.db.backup-before-pin-migration
 */

import * as dotenv from "dotenv";
import path from "path";

// Load .env dari root proyek (HARUS sebelum import lib/prisma)
dotenv.config({ path: path.join(process.cwd(), ".env") });

// Import SETELAH env terload
import { prisma } from "../lib/prisma";
import { encryptPin, isPinEncrypted } from "../lib/pinEncryption";

async function migratePinEncryption() {
  console.log("=".repeat(60));
  console.log("PIN ENCRYPTION MIGRATION SCRIPT");
  console.log("=".repeat(60));

  // Cek apakah PIN_ENCRYPTION_KEY sudah diset
  if (!process.env.PIN_ENCRYPTION_KEY) {
    console.error("\n❌ ERROR: PIN_ENCRYPTION_KEY tidak diset di .env!");
    console.error("Generate dengan perintah: openssl rand -hex 32");
    process.exit(1);
  }

  console.log("\n✅ PIN_ENCRYPTION_KEY terdeteksi\n");

  // Ambil semua undangan yang punya staffPin
  const invitations = await prisma.invitation.findMany({
    where: {
      staffPin: { not: null },
    },
    select: { id: true, staffPin: true, invitationSlug: true },
  });

  console.log(`📊 Total undangan dengan staffPin: ${invitations.length}`);

  let skipped = 0;
  let migrated = 0;
  let failed = 0;

  for (const inv of invitations) {
    if (!inv.staffPin) continue;

    // Skip jika sudah dalam format terenkripsi
    if (isPinEncrypted(inv.staffPin)) {
      console.log(`  ⏭️  Skip (sudah terenkripsi): ${inv.invitationSlug}`);
      skipped++;
      continue;
    }

    try {
      const encryptedPin = encryptPin(inv.staffPin);
      await prisma.invitation.update({
        where: { id: inv.id },
        data: { staffPin: encryptedPin },
      });
      console.log(`  ✅ Migrated: ${inv.invitationSlug} (PIN length: ${inv.staffPin.length})`);
      migrated++;
    } catch (err) {
      console.error(`  ❌ GAGAL: ${inv.invitationSlug}`, err);
      failed++;
    }
  }

  console.log("\n" + "=".repeat(60));
  console.log("HASIL MIGRASI:");
  console.log(`  Berhasil dienkripsi : ${migrated}`);
  console.log(`  Sudah terenkripsi   : ${skipped}`);
  console.log(`  Gagal               : ${failed}`);
  console.log("=".repeat(60));

  if (failed > 0) {
    console.error("\n⚠️  Ada yang gagal! Cek log di atas dan jalankan ulang script ini.");
    process.exit(1);
  } else {
    console.log("\n🎉 Migrasi PIN berhasil selesai!");
  }

  await prisma.$disconnect();
}

migratePinEncryption().catch((err) => {
  console.error("Migration fatal error:", err);
  process.exit(1);
});
