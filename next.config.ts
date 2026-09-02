import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["*.trycloudflare.com"],
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
      // ── Demo tema: cache 1 hari, stale 7 hari ──
      {
        source: "/demo/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
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
      // ── Media upload (foto, musik) ──
      // Immutable karena nama file menyertakan hash/ID unik
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      // ── Aset sistem (brand, icon, css) ──
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
