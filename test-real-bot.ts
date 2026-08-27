import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

// Gunakan path absolut ke dev.db di root workspace
const dbPath = path.resolve(process.cwd(), 'dev.db');
const adapter = new PrismaBetterSqlite3({ url: `file:${dbPath}`, timeout: 5000 });
const prisma = new PrismaClient({ adapter });

async function run() {
  console.log("Memulai Bot Klien...");

  // 1. Buat user dummy (dan yang QRIS)
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
  console.log("1. User dibuat:", user.email);

  const qrisUser = await prisma.user.upsert({
    where: { email: 'qris-bot@luxenary.id' },
    update: {},
    create: {
      email: 'qris-bot@luxenary.id',
      name: 'QRIS Bot Kedaluwarsa',
      googleId: 'bot-qris-12345',
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
  console.log("2. Order PENDING dibuat:", order.invoiceNumber);

  // 3. Simulasikan Upload Bukti Bayar
  const dummyDir = path.join(process.cwd(), 'dummy');
  if (!fs.existsSync(dummyDir)) {
      console.log("Folder dummy tidak ditemukan, membuat dummy acak...");
      fs.mkdirSync(dummyDir);
      fs.writeFileSync(path.join(dummyDir, 'test.png'), 'dummy data');
  }
  const files = fs.readdirSync(dummyDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
  
  if (files.length > 0) {
    const selectedImage = files[0];
    const sourcePath = path.join(dummyDir, selectedImage);
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    
    const targetName = `bot-proof-${Date.now()}${path.extname(selectedImage)}`;
    const targetPath = path.join(uploadDir, targetName);
    
    fs.copyFileSync(sourcePath, targetPath);
    
    await prisma.order.update({
      where: { id: order.id },
      data: {
        paymentMethod: 'MANUAL_TRANSFER',
        proofImageUrl: `/uploads/proofs/${targetName}`,
        proofUploadedAt: new Date(),
        status: 'PENDING'
      }
    });
    console.log(`3. Bukti bayar (${selectedImage}) berhasil diunggah.`);
  }

  // 4. Buat Order QRIS Expired
  const now = Date.now();
  const expiredTime = now - (5 * 60000) - 120000;
  const fakeSnapToken = JSON.stringify({
    sessionId: "fake-ipaymu-session",
    qrString: "00020101021226590014ID.CO.QRIS.WWW0118936009153",
    expiry: expiredTime
  });

  await prisma.order.create({
    data: {
      userId: qrisUser.id,
      invoiceNumber: `INV-QRIS-${Date.now()}`,
      planType: 'MODERN',
      amount: 499000,
      paymentMethod: 'GATEWAY',
      status: 'PENDING',
      snapToken: fakeSnapToken
    }
  });
  console.log("4. Order QRIS Kedaluwarsa berhasil dibuat.");

  console.log("==========================================");
  console.log("SEMUA DATA TELAH BERHASIL DISUNTIKKAN KE DATABASE UTAMA!");
}

run().catch(console.error).finally(() => prisma.$disconnect());
