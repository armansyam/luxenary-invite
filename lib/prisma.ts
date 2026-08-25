import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';
import Database from 'better-sqlite3';
import path from 'path';

declare global {
  // allow global `var prisma` in development (hot reloading)
  var prisma: PrismaClient | undefined;
}

// Inisialisasi PRAGMA performa tinggi SQLite untuk mencegah SQLITE_BUSY saat beban puncak
const dbPath = path.resolve(process.cwd(), 'dev.db');
try {
  const directDb = new Database(dbPath, { timeout: 5000 });
  directDb.pragma('journal_mode = WAL');
  directDb.pragma('synchronous = NORMAL');
  directDb.pragma('busy_timeout = 5000');
  directDb.pragma('cache_size = -64000');
  directDb.close();
} catch (err) {
  console.warn('[Prisma SQLite WAL Init Warning]:', err);
}

const adapter = new PrismaBetterSqlite3({ url: 'file:./dev.db', timeout: 5000 });
export const prisma = global.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== 'production') global.prisma = prisma;