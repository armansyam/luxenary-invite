export const MCP_SERVER_NAME = "luxvite-server-mcp";
export const MCP_SERVER_VERSION = "1.1.0";
export const MCP_PROTOCOL_VERSION = "2025-03-26";
export const MCP_SUPPORTED_PROTOCOL_VERSIONS = [
  "2025-06-18",
  "2025-03-26",
  "2024-11-05",
] as const;

export const MCP_KEY_PREFIX = "lux_mcp_";
export const MCP_DEFAULT_RATE_LIMIT_PER_MIN = 60;

export type McpScope =
  | "docs:read"
  | "catalog:read"
  | "support:read"
  | "ops:read"
  | "finance:read"
  | "ops:write";

export interface McpScopeDefinition {
  id: McpScope;
  label: string;
  kind: "READ_ONLY" | "WRITE_SAFE";
  description: string;
}

export const MCP_SCOPE_DEFINITIONS: readonly McpScopeDefinition[] = [
  {
    id: "docs:read",
    label: "Dokumentasi Sistem (MCP Resources)",
    kind: "READ_ONLY",
    description:
      "Membaca dokumentasi resmi platform (README, arsitektur, skema DB, API, keamanan, dan SOP) langsung dari server.",
  },
  {
    id: "catalog:read",
    label: "Katalog Tema, Paket & Musik",
    kind: "READ_ONLY",
    description:
      "Membaca katalog 81 tema (audit sinkronisasi DB vs disk), daftar paket harga, pengaturan publik, dan portofolio.",
  },
  {
    id: "support:read",
    label: "Operasional Klien & Domain",
    kind: "READ_ONLY",
    description:
      "Mencari undangan klien (slug, subdomain, domain, email), status Draf Gratis, dan cek propagasi DNS custom domain (tanpa PIN/sandi).",
  },
  {
    id: "ops:read",
    label: "Monitoring Server & KPI Non-Finansial",
    kind: "READ_ONLY",
    description:
      "Membaca kesehatan DB/memori/backup, log webhook/audit, dan laporan KPI non-finansial (konversi Draf Gratis, tema populer, tamu/RSVP).",
  },
  {
    id: "finance:read",
    label: "Laporan Keuangan & Anti-Rugi",
    kind: "READ_ONLY",
    description:
      "Membaca laporan omzet, rincian order (NEW/UPGRADE/Add-on), antrean PENDING, OPEX, tagihan rutin, tutup buku, estimasi PPh Final 0,5%, kupon & mitra.",
  },
  {
    id: "ops:write",
    label: "Pemeliharaan Non-Finansial (Opt-In)",
    kind: "WRITE_SAFE",
    description:
      "Khusus sinkronisasi katalog tema disk→DB, pembersihan cache ISR/CDN, dan pembuatan tema draf nonaktif (DRAFT_REVIEW) dengan slug baru. Tidak mencakup mutasi uang, order, akun, maupun tema yang sudah ada di luar draf MCP.",
  },
] as const;

export const VALID_MCP_SCOPES: readonly McpScope[] = MCP_SCOPE_DEFINITIONS.map((s) => s.id);

export function isValidMcpScope(value: string): value is McpScope {
  return (VALID_MCP_SCOPES as readonly string[]).includes(value);
}

export function normalizeMcpScopes(input: unknown): McpScope[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<McpScope>();
  for (const item of input) {
    if (typeof item === "string" && isValidMcpScope(item.trim())) {
      seen.add(item.trim() as McpScope);
    }
  }
  return Array.from(seen);
}

export interface McpDepartmentPreset {
  id: string;
  label: string;
  roleSummary: string;
  defaultScopes: McpScope[];
}

export const MCP_DEPARTMENT_PRESETS: readonly McpDepartmentPreset[] = [
  {
    id: "DEPT_1_CONTENT",
    label: "Dept 1 — Medsos & Konten (Senna)",
    roleSummary: "Riset, skrip, katalog 81 tema, promo & dokumentasi produk",
    defaultScopes: ["docs:read", "catalog:read"],
  },
  {
    id: "DEPT_2_THEMES",
    label: "Dept 2 — Theme Lab & Portofolio (Bima)",
    roleSummary: "Audit katalog tema disk vs DB, portofolio, dan dokumentasi desain",
    defaultScopes: ["docs:read", "catalog:read", "ops:read"],
  },
  {
    id: "DEPT_3_COO",
    label: "Dept 3 — General Manager / COO (Raka)",
    roleSummary: "Laporan KPI operasional, keuangan read-only, mitra & dukungan klien",
    defaultScopes: ["docs:read", "catalog:read", "support:read", "ops:read", "finance:read"],
  },
  {
    id: "DEPT_4_SUPPORT",
    label: "Dept 4 — CS & Client Ops (Putri)",
    roleSummary: "Pencarian status undangan/draf gratis klien & pemeriksaan DNS custom domain",
    defaultScopes: ["docs:read", "catalog:read", "support:read"],
  },
  {
    id: "DEPT_5_ENGINEERING",
    label: "Dept 5 — Engineering & DevOps (Arya / Hermes)",
    roleSummary: "Monitoring kesehatan server, backup, webhook/audit logs, dan sinkronisasi tema",
    defaultScopes: ["docs:read", "catalog:read", "ops:read", "ops:write"],
  },
  {
    id: "DEPT_6_FINANCE",
    label: "Dept 6 — Finance & Anti-Rugi (Tika)",
    roleSummary: "Laporan omzet, OPEX, margin bersih, PPh Final 0,5%, rekonsiliasi order & KPI",
    defaultScopes: ["docs:read", "finance:read", "ops:read"],
  },
  {
    id: "GENERAL",
    label: "Kustom / Umum",
    roleSummary: "Pilih kombinasi scope izin secara manual sesuai kebutuhan",
    defaultScopes: ["docs:read"],
  },
] as const;
