/** Jenis pendapatan: paket baru, upgrade paket, dan dua add-on (top-up kuota foto Guest Camera, perpanjangan galeri). */
export type RevenueKind = "NEW" | "UPGRADE" | "GALLERY_EXTENSION" | "MEMORIES_TOPUP";

export const ADDON_KINDS: readonly RevenueKind[] = ["GALLERY_EXTENSION", "MEMORIES_TOPUP"];

export interface RevenuePart {
  kind: RevenueKind;
  /** Paket yang dibeli/dituju (NEW: paket order; UPGRADE: paket tujuan); null untuk add-on. */
  plan: string | null;
  amount: number;
}

interface OrderLike {
  amount: unknown;
  orderType: string;
  planType: string;
  itemsJson?: unknown;
}

const KINDS = new Set<RevenueKind>(["NEW", "UPGRADE", "GALLERY_EXTENSION", "MEMORIES_TOPUP"]);

/**
 * Memecah omzet satu order lunas per item. Order bundel (`itemsJson`, mis. upgrade + top-up foto dalam satu invoice)
 * dibagi proporsional terhadap harga item sehingga diskon ikut terbagi; sisa pembulatan masuk item terakhir agar total
 * bagian selalu sama dengan `amount` order.
 */
export function splitOrderRevenue(order: OrderLike): RevenuePart[] {
  const total = Number(order.amount || 0);
  const items = Array.isArray(order.itemsJson)
    ? (order.itemsJson as Array<Record<string, unknown>>).filter(
        (i) => i && KINDS.has(String(i.type) as RevenueKind) && Number(i.price) > 0
      )
    : [];
  if (!items.length) {
    const kind = KINDS.has(order.orderType as RevenueKind) ? (order.orderType as RevenueKind) : "NEW";
    return [{ kind, plan: ADDON_KINDS.includes(kind) ? null : order.planType, amount: total }];
  }
  const priceSum = items.reduce((s, i) => s + Number(i.price), 0);
  let allocated = 0;
  return items.map((item, idx) => {
    const kind = String(item.type) as RevenueKind;
    const amount = idx === items.length - 1 ? total - allocated : Math.round((total * Number(item.price)) / priceSum);
    allocated += amount;
    const plan = ADDON_KINDS.includes(kind) ? null : String(item.targetPlan || order.planType);
    return { kind, plan, amount };
  });
}
