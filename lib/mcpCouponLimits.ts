export interface McpCouponLimitDef {
  key: string;
  label: string;
  min: number;
  max: number;
  defaultValue: number;
  step: number;
}

/** Batas kupon tim AI (MCP `marketing:write`); nilainya diatur admin di tab Pemasaran, bawaan di bawah dipakai bila belum diisi. */
export const MCP_COUPON_LIMITS = {
  maxPercent: { key: "mcp_coupon_max_percent", label: "Potongan maksimum (%)", min: 1, max: 90, defaultValue: 20, step: 1 },
  maxQuota: { key: "mcp_coupon_max_quota", label: "Kuota pemakaian maksimum per kupon", min: 1, max: 10000, defaultValue: 50, step: 1 },
  maxValidDays: { key: "mcp_coupon_max_valid_days", label: "Masa berlaku maksimum (hari)", min: 1, max: 365, defaultValue: 30, step: 1 },
  maxActive: { key: "mcp_coupon_max_active", label: "Kupon tim AI aktif maksimum", min: 0, max: 100, defaultValue: 10, step: 1 },
  minMarginPercent: { key: "mcp_coupon_min_margin_percent", label: "Margin bersih minimum per paket (%)", min: 0, max: 99, defaultValue: 50, step: 1 },
  gatewayFeePercent: { key: "mcp_coupon_gateway_fee_percent", label: "Fee gateway untuk hitung margin (%)", min: 0, max: 10, defaultValue: 0.7, step: 0.1 },
} as const satisfies Record<string, McpCouponLimitDef>;

export type McpCouponLimits = { [K in keyof typeof MCP_COUPON_LIMITS]: number };

/**
 * Batas keras CEO: hanya bisa diubah admin di tab Pemasaran, tidak lewat MCP. Batas yang ditetapkan Finance
 * (`finance:guard`) wajib berada di dalamnya, dan batas efektif selalu dipotong ke rentang ini.
 */
export const MCP_COUPON_CEO_BOUNDS = {
  maxPercent: { key: "mcp_coupon_ceo_max_percent", label: "Batas keras: potongan maksimum (%)", min: 1, max: 90, defaultValue: 30, step: 1 },
  maxQuota: { key: "mcp_coupon_ceo_max_quota", label: "Batas keras: kuota maksimum per kupon", min: 1, max: 10000, defaultValue: 200, step: 1 },
  maxValidDays: { key: "mcp_coupon_ceo_max_valid_days", label: "Batas keras: masa berlaku maksimum (hari)", min: 1, max: 365, defaultValue: 90, step: 1 },
  maxActive: { key: "mcp_coupon_ceo_max_active", label: "Batas keras: kupon tim AI aktif maksimum", min: 0, max: 100, defaultValue: 20, step: 1 },
  minMarginPercent: { key: "mcp_coupon_ceo_min_margin_percent", label: "Batas keras: margin bersih minimum (%)", min: 0, max: 99, defaultValue: 40, step: 1 },
} as const satisfies Partial<Record<keyof typeof MCP_COUPON_LIMITS, McpCouponLimitDef>>;

export type McpCouponCeoBounds = { [K in keyof typeof MCP_COUPON_CEO_BOUNDS]: number };

/** Batas efektif = batas Finance yang dipotong ke batas keras CEO (margin minimum tidak boleh lebih rendah dari lantai CEO). */
export function clampToCeoBounds(limits: McpCouponLimits, ceo: McpCouponCeoBounds): McpCouponLimits {
  return {
    ...limits,
    maxPercent: Math.min(limits.maxPercent, ceo.maxPercent),
    maxQuota: Math.min(limits.maxQuota, ceo.maxQuota),
    maxValidDays: Math.min(limits.maxValidDays, ceo.maxValidDays),
    maxActive: Math.min(limits.maxActive, ceo.maxActive),
    minMarginPercent: Math.max(limits.minMarginPercent, ceo.minMarginPercent),
  };
}

/** Pelanggaran usulan Finance terhadap batas keras CEO (kosong = boleh diterapkan). */
export function ceoBoundViolations(proposed: Partial<McpCouponLimits>, ceo: McpCouponCeoBounds): string[] {
  const out: string[] = [];
  if (proposed.maxPercent !== undefined && proposed.maxPercent > ceo.maxPercent) out.push(`potongan maksimum ${proposed.maxPercent}% melebihi batas keras CEO ${ceo.maxPercent}%`);
  if (proposed.maxQuota !== undefined && proposed.maxQuota > ceo.maxQuota) out.push(`kuota ${proposed.maxQuota} melebihi batas keras CEO ${ceo.maxQuota}`);
  if (proposed.maxValidDays !== undefined && proposed.maxValidDays > ceo.maxValidDays) out.push(`masa berlaku ${proposed.maxValidDays} hari melebihi batas keras CEO ${ceo.maxValidDays} hari`);
  if (proposed.maxActive !== undefined && proposed.maxActive > ceo.maxActive) out.push(`kupon aktif ${proposed.maxActive} melebihi batas keras CEO ${ceo.maxActive}`);
  if (proposed.minMarginPercent !== undefined && proposed.minMarginPercent < ceo.minMarginPercent) out.push(`margin minimum ${proposed.minMarginPercent}% di bawah lantai CEO ${ceo.minMarginPercent}%`);
  return out;
}

const LIMIT_BY_SETTING_KEY = new Map<string, McpCouponLimitDef>(
  [...Object.values(MCP_COUPON_LIMITS), ...Object.values(MCP_COUPON_CEO_BOUNDS)].map((d) => [d.key, d])
);

/** Validasi nilai batas (Finance maupun batas keras CEO) saat disimpan; null bila key bukan batas kupon tim AI. */
export function validateMcpCouponLimitSetting(key: string, raw: unknown): { ok: true; value: string } | { ok: false; error: string } | null {
  const def = LIMIT_BY_SETTING_KEY.get(key);
  if (!def) return null;
  const n = Number(String(raw ?? "").trim().replace(",", "."));
  const isInt = Number.isInteger(def.step);
  if (!Number.isFinite(n) || n < def.min || n > def.max || (isInt && !Number.isInteger(n))) {
    return { ok: false, error: `${def.label} harus ${isInt ? "bilangan bulat" : "angka"} ${def.min} sampai ${def.max}.` };
  }
  return { ok: true, value: String(n) };
}
