interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// Global cache (preserves across hot-reloads in dev mode)
const globalForRateLimit = global as unknown as { rateLimitCache: Map<string, RateLimitRecord> };
const rateLimitCache = globalForRateLimit.rateLimitCache || new Map<string, RateLimitRecord>();

if (process.env.NODE_ENV !== 'production') {
  globalForRateLimit.rateLimitCache = rateLimitCache;
}

/**
 * Rate Limiter berbasis memori (In-Memory).
 * Sangat efisien, tidak butuh Redis, dan aman dari kebocoran memori (Memory Leak).
 * Cocok untuk single-process atau dev mode.
 *
 * @param ip IP Address klien (misal dari req.headers.get("x-forwarded-for"))
 * @param limit Batas maksimal request yang diizinkan
 * @param windowMs Jendela waktu dalam milidetik (misal 60000 untuk 1 menit)
 * @returns true jika diizinkan, false jika melebihi batas (rate limited)
 */
export function rateLimit(ip: string, limit: number, windowMs: number): boolean {
  const now = Date.now();

  // Lazy cleanup: Jika Map sudah terlalu besar (> 10.000 entri IP), bersihkan yang kadaluarsa
  // Mencegah RAM server penuh jika ada serangan DDoS massif dari jutaan IP berbeda.
  if (rateLimitCache.size > 10000) {
    for (const [key, record] of rateLimitCache.entries()) {
      if (now > record.resetTime) rateLimitCache.delete(key);
    }
  }

  const record = rateLimitCache.get(ip);

  // Jika belum ada data untuk IP ini
  if (!record) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  // Jika sudah lewat batas waktunya, reset hitungan
  if (now > record.resetTime) {
    rateLimitCache.set(ip, { count: 1, resetTime: now + windowMs });
    return true;
  }

  // Jika hitungan masih di bawah batas, tambahkan dan izinkan
  if (record.count < limit) {
    record.count += 1;
    return true;
  }

  // Melebihi batas!
  return false;
}

/**
 * Driver Status Rate Limiter Aktif
 */
export function getActiveRateLimitDriver(): "redis" | "postgresql" | "memory" {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    return "redis";
  }
  return "postgresql";
}

/**
 * Driver 1: Upstash Redis REST API Driver (Zero NPM Dependencies)
 * Eksekusi atomik <10ms yang membebaskan basis data PostgreSQL dari I/O hitungan request.
 */
async function rateLimitRedis(key: string, limit: number, windowMs: number): Promise<boolean | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  const windowSec = Math.ceil(windowMs / 1000);
  const redisKey = `rl:${key}`;

  try {
    const res = await fetch(`${url}/pipeline`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify([
        ["INCR", redisKey],
        ["EXPIRE", redisKey, windowSec, "NX"],
      ]),
      signal: AbortSignal.timeout(1500),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const currentCount = json[0]?.result;
    if (typeof currentCount === "number") {
      return currentCount <= limit;
    }
    return null;
  } catch {
    return null; // Graceful fallback ke PostgreSQL
  }
}

/**
 * Rate Limiter Multi-Driver Terdistribusi (Cascade: Redis -> PostgreSQL -> Memory)
 *
 * Aman digunakan di lingkungan PM2 multi-worker maupun kluster container.
 * 1. Prioritas 1: Redis REST (Zero disk I/O, ultra-cepat).
 * 2. Prioritas 2: PostgreSQL UPSERT Atomik (State tersimpan di tabel rate_limit_counters).
 * 3. Prioritas 3: In-Memory Fallback jika basis data sedang dalam pemeliharaan.
 *
 * @param key   Identifier unik (misal "rsvp:192.168.1.1" atau "scan:10.0.0.2")
 * @param limit Batas maksimal request yang diizinkan dalam window
 * @param windowMs Jendela waktu dalam milidetik
 * @returns true jika diizinkan, false jika rate limited
 */
export async function rateLimitDb(key: string, limit: number, windowMs: number): Promise<boolean> {
  // 1. Coba driver Redis jika dikonfigurasi
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    const redisResult = await rateLimitRedis(key, limit, windowMs);
    if (redisResult !== null) {
      return redisResult;
    }
  }

  // 2. Driver PostgreSQL Atomik UPSERT
  try {
    const { pool } = await import("@/lib/prisma");
    const windowSec = Math.ceil(windowMs / 1000);

    // Atomic UPSERT: increment counter jika key dan window sama.
    // Jika window sudah expired (now > expires_at), reset ke 1 dan perbarui window.
    const result = await pool.query<{ new_count: string }>(
      `INSERT INTO rate_limit_counters (key, count, expires_at)
       VALUES ($1, 1, NOW() + ($2 || ' seconds')::INTERVAL)
       ON CONFLICT (key) DO UPDATE SET
         count = CASE
           WHEN rate_limit_counters.expires_at <= NOW()
           THEN 1
           ELSE rate_limit_counters.count + 1
         END,
         expires_at = CASE
           WHEN rate_limit_counters.expires_at <= NOW()
           THEN NOW() + ($2 || ' seconds')::INTERVAL
           ELSE rate_limit_counters.expires_at
         END
       RETURNING count AS new_count`,
      [key, windowSec]
    );

    const newCount = parseInt(result.rows[0]?.new_count ?? "1", 10);
    return newCount <= limit;
  } catch (err) {
    // 3. Fallback ke in-memory jika basis data tidak tersedia
    console.warn("[rateLimitDb] DB rate limit error, falling back to in-memory:", (err as Error).message);
    return rateLimit(key, limit, windowMs);
  }
}

/**
 * Ekstraksi IP Klien yang Aman dari Reverse Proxy (Cloudflare / Caddy / Nginx)
 * Memprioritaskan header terpercaya dari cloud provider sebelum fallback ke header x-forwarded-for.
 */
export function getClientIp(req: Request | { headers: Headers }): string {
  const headers = req.headers;
  // 1. Cloudflare True Client IP
  const cfIp = headers.get("cf-connecting-ip");
  if (cfIp && cfIp.trim()) return cfIp.trim();

  // 2. Nginx / Caddy X-Real-IP
  const realIp = headers.get("x-real-ip");
  if (realIp && realIp.trim()) return realIp.trim();

  // 3. X-Forwarded-For: Ambil IP paling kiri yang valid (origin IP)
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded && forwarded.trim()) {
    const ips = forwarded.split(",").map((s) => s.trim());
    if (ips.length > 0 && ips[0]) return ips[0];
  }

  return "unknown-ip";
}
