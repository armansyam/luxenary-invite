import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db', timeout: 5000 });
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
  console.log("1. User dibuat:", user.email);

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
  
  if (files.length === 0) {
    console.log("Tidak ada gambar dummy!");
    return;
  }
  
  const selectedImage = files[0];
  const sourcePath = path.join(dummyDir, selectedImage);
  
  const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'proofs');
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  
  const targetName = `bot-proof-${Date.now()}${path.extname(selectedImage)}`;
  const targetPath = path.join(uploadDir, targetName);
  
  fs.copyFileSync(sourcePath, targetPath);
  
  // Update order dengan bukti bayar
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
  console.log("==========================================");
  console.log("SILAKAN CEK DI ADMIN PANEL DAN APPROVE ORDER INI!");
  console.log("Order ID:", order.id);
  console.log("Invoice :", order.invoiceNumber);
}

run().catch(console.error).finally(() => prisma.$disconnect());
