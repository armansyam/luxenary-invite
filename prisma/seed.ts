import { PrismaClient, Prisma } from '@prisma/client'
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from "bcryptjs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config({ path: path.join(__dirname, "../.env") });

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const themes: Prisma.ThemeCreateInput[] = [
  // Premium Series (4)
  {
    id: 'kalandra',
    name: 'Kalandra',
    category: 'premium',
    series: 'Premium',
    description: 'THE WEDDING OF — Modern, Elegan & Minimalis Editorial',
    previewUrl: '/demo/kalandra',
    isPremium: true,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'valente',
    name: 'Valente',
    category: 'premium',
    series: 'Premium',
    description: 'A CELEBRATION OF LOVE — Elegan, Mewah & Berkelas',
    previewUrl: '/demo/valente',
    isPremium: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'aurelia',
    name: 'Aurelia',
    category: 'premium',
    series: 'Premium',
    description: 'ROYAL LUXURY CELEBRATION — Sentuhan Emas & Kemegahan Kerajaan',
    previewUrl: '/demo/aurelia',
    isPremium: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'artisan',
    name: 'Artisan',
    category: 'premium',
    series: 'Premium',
    description: 'HANDCRAFTED IN LOVE — Sentuhan Artistik & Tipografi Organik',
    previewUrl: '/demo/artisan',
    isPremium: true,
    isActive: true,
    sortOrder: 4,
  },
  // Modern Series (6)
  {
    id: 'ameera',
    name: 'Ameera',
    category: 'modern',
    series: 'Modern',
    description: 'CONTEMPORARY HERITAGE — Perpaduan Estetika Timur & Modern',
    previewUrl: '/demo/ameera',
    isPremium: false,
    isActive: true,
    sortOrder: 5,
  },
  {
    id: 'chronicle',
    name: 'Chronicle',
    category: 'modern',
    series: 'Modern',
    description: 'HIGH-FASHION VOGUE EDITORIAL — Estetika Majalah Mode Kontemporer',
    previewUrl: '/demo/chronicle',
    isPremium: false,
    isActive: true,
    sortOrder: 6,
  },
  {
    id: 'lumina',
    name: 'Lumina',
    category: 'modern',
    series: 'Modern',
    description: 'MINIMALIST GLASS & CINEMA — Sinematik Bersih dengan Efek Glassmorphism',
    previewUrl: '/demo/lumina',
    isPremium: false,
    isActive: true,
    sortOrder: 7,
  },
  {
    id: 'papercut',
    name: 'Papercut',
    category: 'modern',
    series: 'Modern',
    description: 'TEXTURED CRAFT & MINIMALIST — Keanggunan Tekstur Kertas Alami',
    previewUrl: '/demo/papercut',
    isPremium: false,
    isActive: true,
    sortOrder: 8,
  },
  {
    id: 'solaria',
    name: 'Solaria',
    category: 'modern',
    series: 'Modern',
    description: 'WARM SUNSET BOTANICAL — Kehangatan Golden Hour & Botani Segar',
    previewUrl: '/demo/solaria',
    isPremium: false,
    isActive: true,
    sortOrder: 9,
  },
  {
    id: 'wave',
    name: 'Wave',
    category: 'modern',
    series: 'Modern',
    description: 'DYNAMIC FLUID OCEAN — Aliran Gelombang Modern Dinamis & Segar',
    previewUrl: '/demo/wave',
    isPremium: false,
    isActive: true,
    sortOrder: 10,
  },
  // Traditional Series (5)
  {
    id: 'badrika',
    name: 'Badrika',
    category: 'traditional',
    series: 'Traditional',
    description: 'Klasik Jawa Ningrat dengan Ornamen Khas Keraton',
    previewUrl: '/demo/badrika',
    isPremium: false,
    isActive: true,
    sortOrder: 11,
  },
  {
    id: 'candani',
    name: 'Candani',
    category: 'traditional',
    series: 'Traditional',
    description: 'Tradisi Nusantara Elegan dengan Siluet Padi & Nuansa Tanah',
    previewUrl: '/demo/candani',
    isPremium: false,
    isActive: true,
    sortOrder: 12,
  },
  {
    id: 'dillalucky',
    name: 'Dilla Lucky',
    category: 'traditional',
    series: 'Traditional',
    description: 'Kehangatan Adat Melayu & Padang Modern',
    previewUrl: '/demo/dillalucky',
    isPremium: false,
    isActive: true,
    sortOrder: 13,
  },
  {
    id: 'mayang',
    name: 'Mayang',
    category: 'traditional',
    series: 'Traditional',
    description: 'Kemegahan Adat Sunda Silih Wangi yang Anggun',
    previewUrl: '/demo/mayang',
    isPremium: false,
    isActive: true,
    sortOrder: 14,
  },
  {
    id: 'prameswari',
    name: 'Prameswari',
    category: 'traditional',
    series: 'Traditional',
    description: 'Royal Heritage Tradisional Agung Nan Sarat Makna',
    previewUrl: '/demo/prameswari',
    isPremium: false,
    isActive: true,
    sortOrder: 15,
  },
]

async function main() {
  // Purge any obsolete themes not in the official 15 standalone list
  const validIds = themes.map((t) => t.id);
  await prisma.theme.deleteMany({
    where: {
      id: { notIn: validIds },
    },
  });

  // Create default themes (upsert to handle re-runs)
  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { id: theme.id },
      create: theme,
      update: {
        name: theme.name,
        category: theme.category,
        series: theme.series,
        description: theme.description,
        previewUrl: theme.previewUrl,
        isPremium: theme.isPremium,
        isActive: theme.isActive,
        sortOrder: theme.sortOrder,
      },
    })
  }

  // Create initial Super Admin (if not exists)
  const adminEmail = 'admin@luxenary.com'
  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } })
  if (!existingAdmin) {
    // Generate bcrypt hash for 'admin123'
    const passwordHash = await bcrypt.hash('admin123', 10);
    await prisma.admin.create({
      data: {
        username: 'admin',
        email: adminEmail,
        name: 'Super Admin',
        role: 'SUPER_ADMIN',
        passwordHash,
      },
    })
  }

  console.log('Seed data created successfully')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })