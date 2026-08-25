import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

declare global {
  // allow global `var prisma` in development (hot reloading)
  var prisma: PrismaClient | undefined;
}

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db' });
export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;