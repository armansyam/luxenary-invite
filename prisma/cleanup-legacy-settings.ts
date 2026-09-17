import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const LEGACY_KEYS = [
  "price_traditional", "price_modern", "price_premium",
  "name_traditional", "name_modern", "name_premium",
  "capabilities_traditional", "capabilities_modern", "capabilities_premium",
];
async function main() {
  const found = await prisma.adminSetting.findMany({ where: { key: { in: LEGACY_KEYS } }, select: { key: true } });
  if (found.length === 0) { console.log("✅ DB sudah bersih, tidak ada key lama."); return; }
  console.log(`⚠️  Ditemukan ${found.length} key lama: ${found.map(f => f.key).join(", ")}`);
  const del = await prisma.adminSetting.deleteMany({ where: { key: { in: LEGACY_KEYS } } });
  console.log(`🗑️  Terhapus ${del.count} baris. DB bersih.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
