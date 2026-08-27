import { PrismaClient } from '@prisma/client';
import { createClient } from '@libsql/client';
import { PrismaLibSQL } from '@prisma/adapter-libsql';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db', timeout: 5000 });
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Memulai Bot QRIS Klien...");

  // 1. Buat user dummy
  const user = await prisma.user.upsert({
    where: { email: 'qris-bot@luxenary.id' },
    update: {},
    create: {
      email: 'qris-bot@luxenary.id',
      name: 'QRIS Bot Kedaluwarsa',
      googleId: 'bot-qris-12345',
      role: 'CLIENT'
    }
  });
  console.log("1. User QRIS dibuat:", user.email);

  // 2. Buat snapToken palsu yang expired 5 menit yang lalu
  const now = Date.now();
  const expiredTime = now - (5 * 60000) - 120000; // 5 menit yang lalu + lewati grace period 2 mnt
  const fakeSnapToken = JSON.stringify({
    sessionId: "fake-ipaymu-session",
    qrString: "00020101021226590014ID.CO.QRIS.WWW0118936009153",
    expiry: expiredTime
  });

  // 3. Buat Order PENDING dengan metode GATEWAY dan snapToken yang sudah expired
  const order = await prisma.order.create({
    data: {
      userId: user.id,
      invoiceNumber: `INV-QRIS-${Date.now()}`,
      planType: 'MODERN',
      amount: 499000,
      paymentMethod: 'GATEWAY',
      status: 'PENDING',
      snapToken: fakeSnapToken
    }
  });
  console.log("2. Order QRIS PENDING dibuat:", order.invoiceNumber);
  console.log("3. Waktu kedaluwarsa QRIS diset ke masa lalu (-5 menit).");
  console.log("==========================================");
  console.log("Silakan REFRESH HALAMAN ADMIN Anda sekarang!");
  console.log("Sistem akan mendeteksi token ini sudah expired dan");
  console.log("langsung mengubahnya menjadi EXPIRED (Kedaluwarsa) di tabel.");
  console.log("Order ID:", order.id);
}

run().catch(console.error).finally(() => prisma.$disconnect());
