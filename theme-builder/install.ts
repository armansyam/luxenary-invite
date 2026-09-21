import fs from "fs";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import { compileTheme } from "./preview";

dotenv.config({ path: path.join(process.cwd(), ".env") });

function resolveWorkspace(name: string): { dir: string; id: string } {
  const root = path.join(process.cwd(), "theme-builder");
  const wsDir = path.join(root, "workspaces", name);
  if (fs.existsSync(wsDir)) return { dir: wsDir, id: name };

  const starterDir = path.join(root, "starter");
  if (name === "starter" && fs.existsSync(starterDir)) return { dir: starterDir, id: "starter" };

  throw new Error(`Workspace tema "${name}" tidak ditemukan di theme-builder/workspaces/`);
}

function copyRecursiveSync(src: string, dest: string) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursiveSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function main() {
  const args = process.argv.slice(2);
  const themeArg = args[0];

  if (!themeArg) {
    console.error("❌ Gunakan format: npx tsx theme-builder/install.ts <nama-workspace>");
    console.error("   Contoh: npx tsx theme-builder/install.ts jawa-keraton");
    process.exit(1);
  }

  const { dir: wsDir } = resolveWorkspace(themeArg);

  // 1. Baca Config
  const configPath = path.join(wsDir, "config.json");
  if (!fs.existsSync(configPath)) {
    console.error(`❌ File config.json tidak ditemukan di ${wsDir}`);
    process.exit(1);
  }
  const config = JSON.parse(fs.readFileSync(configPath, "utf-8"));
  const cleanId = (config.id || themeArg).toLowerCase().trim().replace(/[^a-z0-9_-]/g, "");
  const cat = (config.category || "traditional").toLowerCase();

  console.log("==============================================================");
  console.log(`🚀 MEMASANG TEMA KE SISTEM PRODUKSI: ${config.name} (${cleanId})`);
  console.log(`📂 Sumber Workspace : ${wsDir}`);
  console.log(`🏷️ Kategori         : ${cat} (${config.series || "Traditional"})`);
  console.log("==============================================================");

  // 2. Kompilasi & Validasi Blueprint
  console.log("\n[1/5] Memvalidasi kepatuhan blueprint...");
  const { warnings } = compileTheme(wsDir);
  if (warnings.length > 0) {
    console.log("⚠️ Peringatan terdeteksi:");
    warnings.forEach((w) => console.log(`  • ${w}`));
  } else {
    console.log("✅ 100% Lolos Audit Standar Emas!");
  }

  // 3. Salin master.html ke themes/<category>/<id>.html
  console.log("\n[2/5] Memindahkan master blueprint ke folder themes/...");
  const targetThemeDir = path.join(process.cwd(), "themes", cat);
  if (!fs.existsSync(targetThemeDir)) {
    fs.mkdirSync(targetThemeDir, { recursive: true });
  }
  const targetMasterPath = path.join(targetThemeDir, `${cleanId}.html`);
  fs.copyFileSync(path.join(wsDir, "master.html"), targetMasterPath);
  console.log(`✅ File tersimpan di: themes/${cat}/${cleanId}.html`);

  // 4. Salin isi folder demo/ ke public/demo/<id>/ dan lengkapi dari dummy-media bersama
  console.log("\n[3/5] Memindahkan aset demo ke public/demo/...");
  const wsDemoDir = path.join(wsDir, "demo");
  const targetDemoDir = path.join(process.cwd(), "public", "demo", cleanId);
  if (fs.existsSync(wsDemoDir)) {
    copyRecursiveSync(wsDemoDir, targetDemoDir);
  } else {
    fs.mkdirSync(targetDemoDir, { recursive: true });
  }

  // Lengkapi foto slot demo dari shared dummy-media jika tidak disediakan khusus oleh workspace
  const sharedDummyDir = path.join(process.cwd(), "theme-builder", "dummy-media");
  if (fs.existsSync(sharedDummyDir)) {
    const dummyFiles = fs.readdirSync(sharedDummyDir);
    for (const file of dummyFiles) {
      const dest = path.join(targetDemoDir, file);
      if (!fs.existsSync(dest)) {
        fs.copyFileSync(path.join(sharedDummyDir, file), dest);
      }
    }
  }
  console.log(`✅ Folder demo tersimpan di: public/demo/${cleanId}/`);

  // 5. Salin ornamen khas jika ada
  const wsOrnamentsDir = path.join(wsDir, "assets", "ornaments");
  if (fs.existsSync(wsOrnamentsDir)) {
    console.log("\n[4/5] Memindahkan ornamen khusus ke public/assets/ornaments/...");
    const targetOrnamentsDir = path.join(process.cwd(), "public", "assets", "ornaments", cleanId);
    copyRecursiveSync(wsOrnamentsDir, targetOrnamentsDir);
    console.log(`✅ Ornamen tersimpan di: public/assets/ornaments/${cleanId}/`);
  } else {
    console.log("\n[4/5] Menggunakan shared ornaments (tidak ada ornamen baru).");
  }

  // 6. Daftarkan ke Database (Prisma)
  console.log("\n[5/5] Mendaftarkan tema dan data demo ke Database...");
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("⚠️ DATABASE_URL tidak ditemukan di .env. Lewati registrasi database.");
  } else {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    const prisma = new PrismaClient({ adapter });

    try {
      const mockPath = path.join(wsDir, "mock-data.json");
      const mockData = fs.existsSync(mockPath) ? JSON.parse(fs.readFileSync(mockPath, "utf-8")) : {};

      // Upsert Theme
      await prisma.theme.upsert({
        where: { id: cleanId },
        update: {
          name: config.name,
          category: cat,
          series: config.series || (cat === "traditional" ? "Traditional" : cat === "premium" ? "Premium" : "Modern"),
          description: config.description || "",
          isPremium: Boolean(config.isPremium || cat === "premium"),
          isActive: true,
          sortOrder: Number(config.sortOrder || 99),
        },
        create: {
          id: cleanId,
          name: config.name,
          category: cat,
          series: config.series || (cat === "traditional" ? "Traditional" : cat === "premium" ? "Premium" : "Modern"),
          description: config.description || "",
          isPremium: Boolean(config.isPremium || cat === "premium"),
          isActive: true,
          sortOrder: Number(config.sortOrder || 99),
        },
      });

      // Simpan demo data ke AdminSetting
      if (Object.keys(mockData).length > 0) {
        await prisma.adminSetting.upsert({
          where: { key: `theme_demo_${cleanId}` },
          update: { value: JSON.stringify(mockData) },
          create: { key: `theme_demo_${cleanId}`, value: JSON.stringify(mockData) },
        });
      }

      console.log(`✅ Berhasil didaftarkan ke tabel Theme & AdminSetting!`);
    } catch (dbErr: any) {
      console.error("⚠️ Peringatan DB:", dbErr.message);
    } finally {
      await prisma.$disconnect();
    }
  }

  console.log("\n==============================================================");
  console.log(`🎉 TEMA BERHASIL DIPASANG SECARA PARIPURNA!`);
  console.log(`🌐 Demo Publik : /demo/${cleanId}`);
  console.log(`🛠️ Master File : themes/${cat}/${cleanId}.html`);
  console.log("==============================================================");
}

main().catch((err) => {
  console.error("❌ Terjadi kesalahan instalasi:", err);
  process.exit(1);
});
