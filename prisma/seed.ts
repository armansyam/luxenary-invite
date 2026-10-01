import { PrismaClient } from '@prisma/client'
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from "bcryptjs";
import crypto from "crypto";
import path from "path";
import * as dotenv from "dotenv";
import { defaultAdminSettings, defaultMusicPresets } from "./defaultSettings";

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Tema dikelola oleh scripts/sync-themes.ts (npm run themes:sync), yang memindai berkas tema
  // dan mempertahankan isActive yang diubah admin. Seed sengaja tidak menyentuh tabel themes.

  // Seed default admin settings (84 items)
  for (const s of defaultAdminSettings) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      create: {
        key: s.key,
        value: s.value,
        label: s.label,
        group: s.group || "general",
      },
      update: {
        label: s.label,
        group: s.group || "general",
      },
    });
  }
  console.log(`✅ Admin settings seeded: ${defaultAdminSettings.length} settings.`);

  // Seed default music presets
  for (const m of defaultMusicPresets) {
    await prisma.musicPreset.upsert({
      where: { url: m.url },
      create: {
        id: m.id,
        title: m.title,
        composer: m.composer,
        genre: m.genre,
        url: m.url,
        durationSec: m.durationSec,
        isActive: m.isActive,
        sortOrder: m.sortOrder,
      },
      // Preset yang sudah ada dibiarkan apa adanya: admin dapat mengubah judul, status aktif, dan urutan lewat panel.
      update: {},
    });
  }
  console.log(`✅ Music presets seeded: ${defaultMusicPresets.length} presets.`);

  // Seed Super Admin awal. Identitas dan password berasal dari environment; tidak ada kredensial bawaan.
  const seedAdminEmail = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  if (!seedAdminEmail) {
    console.warn('⚠️  SEED_ADMIN_EMAIL tidak diset: akun Super Admin tidak dibuat. Set SEED_ADMIN_EMAIL (dan opsional SEED_ADMIN_PASSWORD) lalu jalankan ulang seed.');
  } else {
    const existingAdmin = await prisma.admin.findUnique({ where: { email: seedAdminEmail } });
    if (!existingAdmin) {
      const providedPassword = process.env.SEED_ADMIN_PASSWORD?.trim();
      if (providedPassword !== undefined && providedPassword.length > 0 && providedPassword.length < 12) {
        throw new Error('SEED_ADMIN_PASSWORD minimal 12 karakter.');
      }
      const initialPassword = providedPassword || crypto.randomBytes(15).toString('base64url');
      await prisma.admin.create({
        data: {
          username: process.env.SEED_ADMIN_USERNAME?.trim() || 'superadmin',
          email: seedAdminEmail,
          name: process.env.SEED_ADMIN_NAME?.trim() || 'Super Admin',
          role: 'SUPER_ADMIN',
          passwordHash: await bcrypt.hash(initialPassword, 12),
        },
      });
      console.log(`✅ Super Admin dibuat: ${seedAdminEmail}`);
      if (!providedPassword) {
        console.log(`🔐 Password awal (hanya ditampilkan sekali, simpan sekarang): ${initialPassword}`);
      }
    } else {
      console.log(`✅ Super Admin sudah ada: ${seedAdminEmail}`);
    }
  }

  // Peringatan keras jika masih ada akun admin yang memakai password bawaan lama.
  const allAdmins = await prisma.admin.findMany({ select: { email: true, passwordHash: true } });
  for (const adm of allAdmins) {
    if (adm.passwordHash && await bcrypt.compare('admin123', adm.passwordHash)) {
      console.error(`🚨 AKUN ADMIN MEMAKAI PASSWORD BAWAAN LAMA: ${adm.email} — segera ganti password di Portal Admin.`);
    }
  }

  console.log('✨ Master database seed executed successfully!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })