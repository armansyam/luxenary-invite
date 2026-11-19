/**
 * In-Memory High-Performance Bounded Cache System
 * 
 * Mengoptimalkan operasional produksi dengan menghilangkan disk I/O berulang
 * dan memangkas hingga 99% query basis data pada puncak lonjakan tamu undangan.
 * 
 * Komponen Cache:
 * 1. masterTemplateCache: Menyimpan string HTML master tema (TTL 1 jam / hingga proses restart).
 * 2. publishedHtmlCache: Menyimpan HTML terpublikasi kanonikal (TTL 5 menit).
 * 3. invitationLookupCache: Menyimpan resolusi metadata publik slug/subdomain (TTL 60 detik).
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

export class BoundedMemoryCache<T> {
  private map = new Map<string, CacheEntry<T>>();
  private maxItems: number;
  private defaultTtlMs: number;

  constructor(maxItems = 500, defaultTtlMs = 60_000) {
    this.maxItems = maxItems;
    this.defaultTtlMs = defaultTtlMs;
  }

  get(key: string): T | null {
    const entry = this.map.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.map.delete(key);
      return null;
    }

    // Refresh position for LRU-like behavior
    this.map.delete(key);
    this.map.set(key, entry);
    return entry.value;
  }

  set(key: string, value: T, ttlMs?: number): void {
    if (this.map.size >= this.maxItems) {
      const oldestKey = this.map.keys().next().value;
      if (oldestKey !== undefined) {
        this.map.delete(oldestKey);
      }
    }

    this.map.set(key, {
      value,
      expiresAt: Date.now() + (ttlMs ?? this.defaultTtlMs),
    });
  }

  delete(key: string): boolean {
    return this.map.delete(key);
  }

  clear(): void {
    this.map.clear();
  }

  size(): number {
    return this.map.size;
  }
}

// Global Singletons menjaga cache tetap persisten antar request di runtime Node.js
declare global {
  var masterTemplateCache: BoundedMemoryCache<string> | undefined;
  var publishedHtmlCache: BoundedMemoryCache<PublishedHtmlEntry> | undefined;
  var invitationLookupCache: BoundedMemoryCache<any> | undefined;
  var renderVersionCache: BoundedMemoryCache<number> | undefined;
  var portfolioHtmlCache: BoundedMemoryCache<string> | undefined;
  var portfolioListCache: BoundedMemoryCache<any[]> | undefined;
  var portfolioExistsCache: BoundedMemoryCache<boolean> | undefined;
}

export const masterTemplateCache =
  global.masterTemplateCache ?? new BoundedMemoryCache<string>(100, 3600_000); // 1 jam TTL untuk master template

/** `mtimeMs` berkas saat dibaca: PM2 menjalankan beberapa worker, dan worker lain dapat membangun ulang berkasnya. */
export type PublishedHtmlEntry = { html: string; version: number | null; mtimeMs: number };

export const publishedHtmlCache =
  global.publishedHtmlCache ?? new BoundedMemoryCache<PublishedHtmlEntry>(500, 300_000); // 5 menit TTL untuk published HTML

export const invitationLookupCache =
  global.invitationLookupCache ?? new BoundedMemoryCache<any>(1000, 60_000); // 60 detik TTL untuk resolusi slug/subdomain/visit

export const renderVersionCache =
  global.renderVersionCache ?? new BoundedMemoryCache<number>(1000, 10_000); // 10 detik TTL untuk versi render DB

export const portfolioHtmlCache =
  global.portfolioHtmlCache ?? new BoundedMemoryCache<string>(100, 300_000); // 5 menit TTL untuk HTML portofolio R2

export const portfolioListCache =
  global.portfolioListCache ?? new BoundedMemoryCache<any[]>(5, 300_000); // 5 menit TTL untuk daftar galeri portofolio R2

export const portfolioExistsCache =
  global.portfolioExistsCache ?? new BoundedMemoryCache<boolean>(500, 300_000); // 5 menit TTL untuk HeadObject portofolio R2

if (process.env.NODE_ENV !== "production") {
  global.masterTemplateCache = masterTemplateCache;
  global.publishedHtmlCache = publishedHtmlCache;
  global.invitationLookupCache = invitationLookupCache;
  global.renderVersionCache = renderVersionCache;
  global.portfolioHtmlCache = portfolioHtmlCache;
  global.portfolioListCache = portfolioListCache;
  global.portfolioExistsCache = portfolioExistsCache;
}

/**
 * Invalidate cache pencarian publik ketika undangan di-update atau di-publish
 */
export function invalidateInvitationLookup(
  invitationSlug?: string | null,
  subdomain?: string | null,
  invitationId?: string | null,
): void {
  if (invitationSlug) {
    invitationLookupCache.delete(`slug:${invitationSlug}`);
  }
  if (subdomain) {
    invitationLookupCache.delete(`subdomain:${subdomain}`);
  }
  if (invitationId) {
    invitationLookupCache.delete(`visit-inv:${invitationId}`);
  }
}

/**
 * Invalidate cache portofolio L1 saat admin menambah atau menghapus portofolio.
 */
export function invalidatePortfolioCache(slug?: string | null): void {
  portfolioListCache.clear();
  if (slug) {
    portfolioHtmlCache.delete(slug);
    portfolioExistsCache.delete(slug);
  } else {
    portfolioHtmlCache.clear();
    portfolioExistsCache.clear();
  }
}


