import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // allow global `var prisma` in development (hot reloading)
  var prisma: PrismaClient | undefined;
}

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);

// In development, recreate client if new models (e.g. musicPreset) are not yet on the cached global instance
const existingPrisma = global.prisma;
const isStale = existingPrisma && !(existingPrisma as any).musicPreset;

export const prisma = (!existingPrisma || isStale)
  ? new PrismaClient({ adapter })
  : existingPrisma;

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;