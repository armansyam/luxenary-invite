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
  {
    id: 'heritage-aruna',
    name: 'Heritage Aruna',
    series: 'heritage',
    description: 'Ornamental traditional with vibrant colors and cultural audio backdrop.',
    previewUrl: 'https://attarivitation.com/demo-heritage-series-aruna/',
    isPremium: false,
    isActive: true,
    sortOrder: 1,
  },
  {
    id: 'premium-ivanna',
    name: 'Premium Ivanna',
    series: 'premium',
    description: 'Full-screen section slide, smooth 60 FPS transitions without scrollbar cutoff.',
    previewUrl: 'https://attarivitation.com/demo-premium-09-ivanna/',
    isPremium: true,
    isActive: true,
    sortOrder: 2,
  },
  {
    id: 'premium-kila',
    name: 'Premium Kila',
    series: 'premium',
    description: 'Fixed global background + section overlay for slide background effect between sections.',
    previewUrl: 'https://attarivitation.com/demo-premium-11-kila/',
    isPremium: true,
    isActive: true,
    sortOrder: 3,
  },
  {
    id: 'premium-danila',
    name: 'Premium Danila Redesign',
    series: 'premium',
    description: 'Video background with section overlay, elegant and modern.',
    previewUrl: 'https://attarivitation.com/demo-premium-06-danila-redesign/',
    isPremium: true,
    isActive: true,
    sortOrder: 4,
  },
  {
    id: 'moody-papercut',
    name: 'Moody Papercut',
    series: 'moody',
    description: 'Minimalist, paper texture, low bandwidth.',
    previewUrl: 'https://attarivitation.com/demo-moody-papercut/',
    isPremium: false,
    isActive: true,
    sortOrder: 5,
  },
]

async function main() {
  // Create default themes (upsert to handle re-runs)
  for (const theme of themes) {
    await prisma.theme.upsert({
      where: { id: theme.id },
      create: theme,
      update: {
        name: theme.name,
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