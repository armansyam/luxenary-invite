import type { PlanType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getAdminSetting, getPublicPlatformSettings } from "@/lib/settings";
import {
  MCP_COUPON_CEO_BOUNDS,
  MCP_COUPON_LIMITS,
  clampToCeoBounds,
  validateMcpCouponLimitSetting,
  type McpCouponCeoBounds,
  type McpCouponLimitDef,
  type McpCouponLimits,
} from "@/lib/mcpCouponLimits";

/** Penanda kupon milik tim AI (MCP `marketing:write`); hanya kupon berpenanda ini yang boleh dinonaktifkan lewat MCP. */
export const MCP_COUPON_DESCRIPTION_PREFIX = "[MCP]";

/** PPh Final UMKM 0,5% dari omzet bruto (PP 55/2022), sama dengan laporan keuangan. */
const PPH_FINAL_PERCENT = 0.5;

async function readLimitGroup(defs: Record<string, McpCouponLimitDef>): Promise<Record<string, number>> {
  const entries = await Promise.all(
    Object.entries(defs).map(async ([name, def]) => {
      const parsed = validateMcpCouponLimitSetting(def.key, await getAdminSetting(def.key, String(def.defaultValue)));
      return [name, parsed && parsed.ok ? Number(parsed.value) : def.defaultValue] as const;
    })
  );
  return Object.fromEntries(entries);
}

/** Batas yang tersimpan (ditetapkan Finance/admin) sebelum dipotong batas keras CEO. */
export async function getStoredMcpCouponLimits(): Promise<McpCouponLimits> {
  return (await readLimitGroup(MCP_COUPON_LIMITS)) as McpCouponLimits;
}

export async function getMcpCouponCeoBounds(): Promise<McpCouponCeoBounds> {
  return (await readLimitGroup(MCP_COUPON_CEO_BOUNDS)) as McpCouponCeoBounds;
}

/** Batas efektif yang ditegakkan saat membuat kupon: batas Finance dipotong ke batas keras CEO. */
export async function getMcpCouponLimits(): Promise<McpCouponLimits> {
  const [stored, ceo] = await Promise.all([getStoredMcpCouponLimits(), getMcpCouponCeoBounds()]);
  return clampToCeoBounds(stored, ceo);
}

export interface CouponMarginRow {
  planType: string;
  name: string;
  price: number;
  paidAfterDiscount: number;
  netAfterFeeAndTax: number;
  marginPercent: number;
}

/** Margin bersih tiap paket bila kupon persen ini dipakai: harga − potongan − fee gateway − PPh Final 0,5% dari harga bayar. */
export async function computeCouponMargins(discountPercent: number, plans: PlanType[], gatewayFeePercent: number): Promise<CouponMarginRow[]> {
  const settings = await getPublicPlatformSettings();
  return settings.packages
    .filter((p) => plans.length === 0 || (plans as string[]).includes(p.id))
    .map((p) => {
      const price = Number(p.price || 0);
      const paid = price - Math.round((price * discountPercent) / 100);
      const net = paid - Math.round((paid * gatewayFeePercent) / 100) - Math.round((paid * PPH_FINAL_PERCENT) / 100);
      return {
        planType: p.id,
        name: p.name,
        price,
        paidAfterDiscount: paid,
        netAfterFeeAndTax: net,
        marginPercent: price > 0 ? Math.round((net * 1000) / price) / 10 : 0,
      };
    });
}

export async function countActiveMcpCoupons(): Promise<number> {
  return prisma.promoCoupon.count({
    where: { isActive: true, description: { startsWith: MCP_COUPON_DESCRIPTION_PREFIX } },
  });
}
