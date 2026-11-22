import fs from "fs";
import path from "path";

export interface McpDocResource {
  uri: string;
  name: string;
  description: string;
  mimeType: "text/markdown";
  relativePath: string;
}

/**
 * Daftar ketat dokumen resmi yang diekspos sebagai MCP Resources (`docs:read`).
 * Menggunakan allowlist eksplisit untuk mencegah path traversal atau kebocoran berkas rahasia.
 */
export const MCP_DOC_RESOURCES: readonly McpDocResource[] = [
  {
    uri: "luxvite://docs/index",
    name: "Pusat Indeks & Ground Truth Platform",
    description: "Kontrak arsitektur mutlak v1.1.0 dan panduan baca untuk seluruh departemen AI.",
    mimeType: "text/markdown",
    relativePath: "docs/README.md",
  },
  {
    uri: "luxvite://docs/readme",
    name: "README Induk Repositori",
    description: "Panduan alur bisnis B2C, 81 tema 3 mode, 29 model DB, struktur folder & deployment.",
    mimeType: "text/markdown",
    relativePath: "README.md",
  },
  {
    uri: "luxvite://docs/s-invitation",
    name: "Filosofi Bisnis & Spesifikasi Fitur (S-Invitation)",
    description: "Spesifikasi fungsional modul produk, aturan bisnis, dan riwayat fitur mutakhir.",
    mimeType: "text/markdown",
    relativePath: "docs/S-Invitation.md",
  },
  {
    uri: "luxvite://docs/architecture",
    name: "Arsitektur Sistem Menyeluruh",
    description: "Fondasi infrastruktur, struktur folder modular, URL routing, engine tema & skema DB.",
    mimeType: "text/markdown",
    relativePath: "docs/SYSTEM_ARCHITECTURE.md",
  },
  {
    uri: "luxvite://docs/database-schema",
    name: "Kamus Data & Skema PostgreSQL",
    description: "ERD, 29 model Prisma, 18 enum, 45 migrasi, CHECK constraints & indeks produksi.",
    mimeType: "text/markdown",
    relativePath: "docs/DATABASE_SCHEMA_DAN_RELASI.md",
  },
  {
    uri: "luxvite://docs/api-reference",
    name: "Katalog 135 REST API & Webhook",
    description: "Referensi endpoint Auth OTP, Publik, Resepsionis, Klien, Mitra, Pembayaran, Admin & Cron.",
    mimeType: "text/markdown",
    relativePath: "docs/API_REFERENCE.md",
  },
  {
    uri: "luxvite://docs/security",
    name: "Arsitektur Keamanan & Proteksi Data",
    description: "CSP nonce, AES-256-GCM PIN, rate limiter PostgreSQL lintas worker, RBAC & audit log.",
    mimeType: "text/markdown",
    relativePath: "docs/SECURITY_DAN_PROTEKSI_DATA.md",
  },
  {
    uri: "luxvite://docs/onboarding",
    name: "Alur Registrasi ke Dashboard Klien",
    description: "Perjalanan klien dari daftar Email+OTP, Draf Gratis / checkout, hingga Studio Editor.",
    mimeType: "text/markdown",
    relativePath: "docs/ALUR_REGISTRASI_KE_DASHBOARD.md",
  },
  {
    uri: "luxvite://docs/admin/finance",
    name: "SOP Finance, Pembukuan & PPh Final 0,5%",
    description: "Arus kas, buku pengeluaran OPEX, tagihan rutin, tutup buku & rekap pajak.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/MANAJEMEN_FINANCE_DAN_PEMBUKUAN.md",
  },
  {
    uri: "luxvite://docs/admin/marketing-partner",
    name: "SOP Marketing, Kupon & Portal Mitra Reseller",
    description: "Kupon promo publik, aturan anti-stacking, dan skema potongan harga langsung Mitra WO.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/MANAJEMEN_MARKETING_DAN_AFILIASI.md",
  },
  {
    uri: "luxvite://docs/admin/transactions",
    name: "SOP Transaksi & Payment Gateway",
    description: "Kontrol payment_mode (GATEWAY Midtrans vs MANUAL), rekonsiliasi & approval.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/MANAJEMEN_TRANSAKSI_DAN_GATEWAY.md",
  },
  {
    uri: "luxvite://docs/admin/invitations-domains",
    name: "SOP Undangan Klien & Custom Domain",
    description: "Siklus hidup 5 status undangan, emergency unlock 24 jam, cek DNS & Caddy Auto-SSL.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/MANAJEMEN_UNDANGAN_DAN_DOMAIN.md",
  },
  {
    uri: "luxvite://docs/admin/themes",
    name: "SOP Manajemen 81 Tema & Theme Builder",
    description: "Arsitektur 3 mode acara, Editor Master, Theme Builder 3.0 & sinkronisasi katalog.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/MANAJEMEN_TEMA_ADMIN.md",
  },
  {
    uri: "luxvite://docs/admin/cron",
    name: "SOP Cron Cleanup, Retensi & Backup DB",
    description: "Penjadwalan 02:00 cleanup, verifikasi NAS sebelum purge, 03:00 backup & alert SUPER_ADMIN.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/CRON_DAN_MAINTENANCE_OTOMATIS.md",
  },
  {
    uri: "luxvite://docs/admin/settings-database",
    name: "SOP Pengaturan Platform, Branding, R2 & DB",
    description: "White-label, Free Draft dinamis, SMTP OTP, R2 CORS, Purge Cache & Restore DB.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/PENGATURAN_SISTEM_BRANDING_DAN_DATABASE.md",
  },
  {
    uri: "luxvite://docs/admin/deployment",
    name: "Panduan Deployment VPS, Caddy & PM2",
    description: "Arsitektur server produksi Ubuntu, PostgreSQL 17, Caddy TLS, PM2 cluster & deploy.sh.",
    mimeType: "text/markdown",
    relativePath: "docs/admin/DEPLOYMENT_VPS_CADDY.md",
  },
  {
    uri: "luxvite://docs/client/studio",
    name: "Panduan Studio Editor 16 Seksi",
    description: "Dual-Native preview, 81 tema 3 mode terisolasi, palet terkunci & proteksi pasca-publish.",
    mimeType: "text/markdown",
    relativePath: "docs/client/TAHAP_STUDIO_EDITOR_UNDANGAN.md",
  },
  {
    uri: "luxvite://docs/client/settings-domain",
    name: "Panduan Subdomain, Custom Domain & Publikasi",
    description: "Subdomain checker, panduan DNS CNAME/A, PIN resepsionis & Audit Pra-Rilis.",
    mimeType: "text/markdown",
    relativePath: "docs/client/TAHAP_PENGATURAN_AKUN_CUSTOM_DOMAIN_DAN_ADDON.md",
  },
  {
    uri: "luxvite://docs/public/receptionist",
    name: "Panduan Portal Resepsionis & Check-In QR",
    description: "QR offline-first, Staff PIN, mode scanner fisik, rate limit Wi-Fi gedung 300/menit.",
    mimeType: "text/markdown",
    relativePath: "docs/public/05_SISTEM_RESEPSIONIS_DAN_CHECKIN_QR.md",
  },
] as const;

const RESOURCE_BY_URI = new Map<string, McpDocResource>(
  MCP_DOC_RESOURCES.map((item) => [item.uri, item])
);

export function listMcpDocResources(): Array<{
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}> {
  return MCP_DOC_RESOURCES.map(({ uri, name, description, mimeType }) => ({
    uri,
    name,
    description,
    mimeType,
  }));
}

export async function readMcpDocResource(
  uri: string
): Promise<{ uri: string; mimeType: string; text: string } | null> {
  const entry = RESOURCE_BY_URI.get(uri);
  if (!entry) return null;

  const rootDir = process.cwd();
  const fullPath = path.resolve(/*turbopackIgnore: true*/ rootDir, entry.relativePath);
  if (!fullPath.startsWith(rootDir + path.sep)) {
    return null;
  }

  const text = await fs.promises.readFile(fullPath, "utf-8");
  return {
    uri: entry.uri,
    mimeType: entry.mimeType,
    text,
  };
}
