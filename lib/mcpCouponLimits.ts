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

const LIMIT_BY_SETTING_KEY = new Map<string, McpCouponLimitDef>(Object.values(MCP_COUPON_LIMITS).map((d) => [d.key, d]));

/** Validasi nilai batas saat admin menyimpan; null bila key bukan batas kupon tim AI. */
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
