import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';

declare global {
  // allow global `var prisma` in development (hot reloading)
  var prisma: PrismaClient | undefined;
  var pgPool: Pool | undefined;
}

const connectionString = process.env.DATABASE_URL;
const maxConnections = process.env.DB_POOL_MAX ? parseInt(process.env.DB_POOL_MAX, 10) : 10;
export const pool = global.pgPool ?? new Pool({
  connectionString,
  max: maxConnections,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});
if (process.env.NODE_ENV !== 'production') global.pgPool = pool;

const adapter = new PrismaPg(pool);

// In development, recreate client if new models or schema fields are not yet on the cached global instance
const existingPrisma = global.prisma;
const hasPasswordHash = (existingPrisma as any)?._runtimeDataModel?.models?.User?.fields?.some((f: any) => f.name === 'passwordHash');
const isStale = existingPrisma && (
  !(existingPrisma as any).musicPreset || 
  !(existingPrisma as any).expense ||
  !(existingPrisma as any).recurringExpense ||
  !(existingPrisma as any).financialClosing ||
  !hasPasswordHash
);

export const prisma = (!existingPrisma || isStale)
  ? new PrismaClient({ adapter })
  : existingPrisma;

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;