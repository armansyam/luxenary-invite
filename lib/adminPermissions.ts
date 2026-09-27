/**
 * lib/adminPermissions.ts
 * Single Source of Truth untuk Otorisasi Granular Admin Dashboard
 * Mendukung pembagian hak akses dinamis per staf dengan fallback backward-compatibility.
 */

export interface AdminModuleDefinition {
  id: string;
  label: string;
  description: string;
  category: "OPERATIONAL" | "FINANCE" | "CREATIVE" | "SYSTEM";
  isSuperAdminOnly?: boolean;
}

// 13 Modul Sistem Admin Dashboard
export const ADMIN_MODULES: AdminModuleDefinition[] = [
  {
    id: "overview",
    label: "Ringkasan",
    description: "Statistik performa, grafik pertumbuhan, dan metrik operasional.",
    category: "OPERATIONAL",
  },
  {
    id: "orders",
    label: "Transaksi",
    description: "Daftar pesanan klien, status pembayaran, dan verifikasi transfer.",
    category: "FINANCE",
  },
  {
    id: "users",
    label: "Klien & Akun",
    description: "Daftar klien terdaftar, reset sesi, dan monitoring kuota undangan.",
    category: "OPERATIONAL",
  },
  {
    id: "invitations",
    label: "Projek Undangan",
    description: "Kelola status proyek undangan, ganti slug, dan buka kunci darurat.",
    category: "OPERATIONAL",
  },
  {
    id: "portfolio",
    label: "Portofolio",
    description: "Katalog etalase portofolio publik, manajemen showcase dan slug.",
    category: "CREATIVE",
  },
  {
    id: "custom_domains",
    label: "Custom Domain",
    description: "Pemeriksaan DNS, aktivasi domain pribadi klien, dan sertifikat SSL.",
    category: "OPERATIONAL",
  },
  {
    id: "themes",
    label: "Tema & Musik",
    description: "Manajemen 40 katalog tema, aset demo, thumbnail, dan musik preset.",
    category: "CREATIVE",
  },
  {
    id: "marketing",
    label: "Pemasaran & Afiliasi",
    description: "Kupon diskon, promo flash sale, dan komisi program kemitraan.",
    category: "FINANCE",
  },
  {
    id: "finance",
    label: "Finance & Keuangan",
    description: "Arus kas harian, pengeluaran rutin, tutup buku, dan rekap pajak.",
    category: "FINANCE",
  },
  {
    id: "logs",
    label: "Monitoring & Audit",
    description: "Pencatatan riwayat audit aktivitas admin dan kesehatan sistem.",
    category: "SYSTEM",
  },
  // MODUL KHUSUS SUPER ADMIN (TERKUNCI MUTLAK)
  {
    id: "settings",
    label: "Pengaturan Platform",
    description: "Kunci API gateway pembayaran, SMTP email, dan konfigurasi master.",
    category: "SYSTEM",
    isSuperAdminOnly: true,
  },
  {
    id: "database",
    label: "Database & Backup",
    description: "Snapshot database, unduh dump berkala, dan verifikasi integritas data.",
    category: "SYSTEM",
    isSuperAdminOnly: true,
  },
  {
    id: "team",
    label: "Tim & Hak Akses",
    description: "Manajemen akun staf administrator dan konfigurasi hak akses modul.",
    category: "SYSTEM",
    isSuperAdminOnly: true,
  },
];

// Modul yang boleh dikonfigurasi secara dinamis untuk staf biasa (10 Modul)
export const CONFIGURABLE_MODULES = ADMIN_MODULES.filter(m => !m.isSuperAdminOnly);

// Modul yang terkunci mutlak khusus Super Admin (3 Modul)
export const SUPER_ADMIN_ONLY_MODULE_IDS = ADMIN_MODULES
  .filter(m => m.isSuperAdminOnly)
  .map(m => m.id);

// Template Preset Default per Role
export const ROLE_DEFAULT_PERMISSIONS: Record<string, string[]> = {
  SUPPORT: ["users", "invitations", "custom_domains"],
  FINANCE: ["overview", "orders", "users", "finance"],
  ADMIN: ["overview", "orders", "users", "invitations", "portfolio", "custom_domains", "themes"],
  SUPER_ADMIN: ADMIN_MODULES.map(m => m.id),
};

/**
 * Menyelesaikan daftar tab yang sah untuk seorang admin.
 * Memiliki fallback otomatis: Jika permissions masih kosong [] (akun lama),
 * sistem akan merujuk ke ROLE_DEFAULT_PERMISSIONS agar tidak terjadi lockout.
 */
export function resolveAdminPermissions(
  role: string | null | undefined,
  customPermissions?: string[] | null
): string[] {
  if (role === "SUPER_ADMIN") {
    return ADMIN_MODULES.map(m => m.id);
  }

  // Jika memiliki custom permissions eksplisit
  if (Array.isArray(customPermissions) && customPermissions.length > 0) {
    // Saring agar tidak bisa menyusupkan modul Super Admin Only
    return customPermissions.filter(p => !SUPER_ADMIN_ONLY_MODULE_IDS.includes(p));
  }

  // Fallback ke template default role (backward compatibility untuk akun lama)
  const defaultList = ROLE_DEFAULT_PERMISSIONS[role || "SUPPORT"] || [];
  return defaultList.filter(p => !SUPER_ADMIN_ONLY_MODULE_IDS.includes(p));
}

/**
 * Pengecekan izin sentral (Server & Client Guard).
 * Memeriksa apakah session user memiliki izin untuk modul tertentu.
 */
export function hasAdminPermission(
  user: {
    role?: string | null;
    originalRole?: string | null;
    isAdmin?: boolean;
    permissions?: string[] | null;
  } | null | undefined,
  moduleId: string
): boolean {
  if (!user) return false;

  const role = user.originalRole || user.role || "";
  const isAdmin = user.isAdmin === true || role === "SUPER_ADMIN" || role === "ADMIN" || role === "SUPPORT" || role === "FINANCE";

  if (!isAdmin) return false;

  // Super Admin memiliki akses mutlak ke semua modul
  if (role === "SUPER_ADMIN") return true;

  // Modul terkunci mutlak hanya boleh dibuka oleh SUPER_ADMIN
  if (SUPER_ADMIN_ONLY_MODULE_IDS.includes(moduleId)) {
    return false;
  }

  const effectivePermissions = resolveAdminPermissions(role, user.permissions);
  return effectivePermissions.includes(moduleId);
}
