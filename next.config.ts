import type { NextConfig } from "next";

// Ambil custom domain R2/S3 dari env untuk whitelist Image Optimizer
// Format: https://cdn.example.com → hostname: cdn.example.com
const s3CustomDomain = (process.env.S3_CUSTOM_DOMAIN || process.env.R2_PUBLIC_URL || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "")
  .trim();

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Cloudflare R2 / S3-compatible storage (custom domain dari env)
      ...(s3CustomDomain ? [{ protocol: "https" as const, hostname: s3CustomDomain }] : []),
      // Cloudflare R2 default dev subdomain (sebelum custom domain aktif)
      { protocol: "https" as const, hostname: "*.r2.cloudflarestorage.com" },
      // Google OAuth user avatar (foto profil Google login klien)
      { protocol: "https" as const, hostname: "lh3.googleusercontent.com" },
      { protocol: "https" as const, hostname: "lh4.googleusercontent.com" },
      { protocol: "https" as const, hostname: "lh5.googleusercontent.com" },
      { protocol: "https" as const, hostname: "lh6.googleusercontent.com" },
      // AWS S3 jika digunakan sebagai fallback storage
      { protocol: "https" as const, hostname: "*.amazonaws.com" },
      // Lokal development (localhost)
      { protocol: "http" as const, hostname: "localhost" },
    ],
  },
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  async headers() {
    return [
      // ── Security Headers Global (diterapkan ke semua route) ──
      {
        source: "/(.*)",
        headers: [
          // Mencegah browser menebak MIME type (XSS via MIME sniffing)
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Mencegah clickjacking: hanya halaman dari origin yang sama yang boleh embed via iframe
          // Catatan: halaman undangan publik (/s/*, /:slug) mungkin ingin allow embedding — override per-route jika perlu
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          // Kirim referrer hanya ke same-origin, dan origin-only ke cross-origin HTTPS
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Matikan akses ke fitur browser yang tidak digunakan platform ini
          // camera: TIDAK diblokir — platform menggunakan kamera aktif di:
          //   1. /sharemoment (DisposableCameraViewfinder — foto momen tamu via getUserMedia)
          //   2. /receptionist (ReceptionistScannerClient — QR code check-in via getUserMedia)
          // microphone & geolocation tidak digunakan — diblokir untuk keamanan.
          { key: "Permissions-Policy", value: "microphone=(), geolocation=(), payment=()" },
          // Paksa HTTPS untuk browser yang sudah pernah mengunjungi (HSTS — aktif hanya jika production)
          ...(process.env.NODE_ENV === "production"
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
        ],
      },
      // ── Font statis: cache permanen (tidak pernah berubah) ──
      {
        source: "/fonts/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Musik BGM statis bawaan (Canon in D, dll) ──
      // Cache permanen 1 tahun di browser & Cloudflare CDN karena file audio tidak pernah berubah
      {
        source: "/music/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Halaman Utama (Landing Page): cache 1 hari browser, 7 hari CDN ──
      {
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },

      // ── HTML undangan baked (subdomains, slugs, ids) ──
      // s-maxage = di-cache Cloudflare selama 7 hari
      // stale-while-revalidate = Cloudflare serve stale sambil refresh di background
      {
        source: "/published/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, s-maxage=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // ── HTML portofolio terisolasi + aset ──
      // Lebih agresif karena konten ini sangat jarang berubah
      {
        source: "/portfolio/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, s-maxage=2592000, stale-while-revalidate=86400",
          },
        ],
      },
      // ── Media upload lokal klien (draft / dev) ──
      // Cache 1 hari dengan background revalidasi agar pergantian media draft tetap mulus
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=86400",
          },
        ],
      },
      // ── Modul CSS sistem (modules.css) ──
      {
        source: "/css/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // ── Aset sistem umum (brand logo, favicon, vector icons) ──
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
      // ── Aset homepage (hero, mockup, showcase) — override dengan no-cache must-revalidate ──
      // no-cache: browser wajib tanya server setiap kali (via ETag/304), tidak pernah serve stale
      {
        source: "/assets/homepage/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, must-revalidate",
          },
        ],
      },
      // ── Aset showroom tema demo (thumbnail, cover, background, foto) ──
      {
        source: "/demo/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=604800, must-revalidate",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
