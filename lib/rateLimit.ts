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
