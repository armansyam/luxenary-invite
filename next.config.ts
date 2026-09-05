import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  allowedDevOrigins: ["*.trycloudflare.com"],
  experimental: {
    proxyClientMaxBodySize: "50mb",
  },
  async headers() {
    return [
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
      // ── Aset sistem (brand logo, favicon, vector icons) ──
      {
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=604800, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
