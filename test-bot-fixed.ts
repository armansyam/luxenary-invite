import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

// GUNAKAN PATH YANG BENAR SESUAI .env (../dev.db)
const adapter = new PrismaBetterSqlite3({ url: 'file:../dev.db', timeout: 5000 });
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Memulai Bot Klien...");

  // 1. Buat user dummy
  const user = await prisma.user.upsert({
    where: { email: 'client-bot@luxenary.id' },
    update: {},
    create: {
      email: 'client-bot@luxenary.id',
      name: 'Client Bot E2E',
      googleId: 'bot-google-12345',
      role: 'CLIENT'
    }
  });

  // 2. Buat Order (Premium)
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      invoiceNumber: `INV-BOT-${Date.now()}`,
      planType: 'PREMIUM',
      amount: 699000,
      status: 'PENDING'
    }
  });

  console.log("==========================================");
  console.log("ORDER BERHASIL DIBUAT DI DATABASE ASLI!");
  console.log("Silakan cek Admin Panel Anda sekarang, pasti muncul!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
