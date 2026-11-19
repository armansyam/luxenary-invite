import { safeExternalUrl } from "@/lib/safeUrl";
import { parseFeatureSettings } from "@/lib/featureSettings";

export interface GiftRegistryItem {
  id: string;
  name: string;
  note?: string;
  url?: string;
  qtyNeeded: number;
}

export const MAX_GIFT_REGISTRY_ITEMS = 30;
export const MAX_GIFT_ITEM_NAME = 120;
export const MAX_GIFT_ITEM_NOTE = 300;

export function sanitizeGiftRegistryItems(raw: unknown): GiftRegistryItem[] {
  if (!Array.isArray(raw)) return [];
  const items: GiftRegistryItem[] = [];
  const seenIds = new Set<string>();

  for (let i = 0; i < Math.min(raw.length, MAX_GIFT_REGISTRY_ITEMS); i++) {
    const entry = raw[i];
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) continue;
    const rec = entry as Record<string, unknown>;
    const name = typeof rec.name === "string" ? rec.name.trim().slice(0, MAX_GIFT_ITEM_NAME) : "";
    if (!name) continue;

    const rawId = typeof rec.id === "string" ? rec.id.trim().replace(/[^a-zA-Z0-9_-]/g, "") : "";
    let id = rawId || `gift-${i + 1}`;
    while (seenIds.has(id)) id = `${id}-${items.length + 1}`;
    seenIds.add(id);

    const note = typeof rec.note === "string" ? rec.note.trim().slice(0, MAX_GIFT_ITEM_NOTE) : "";
    const url = typeof rec.url === "string" ? safeExternalUrl(rec.url) : "";
    const parsedQty = Number(rec.qtyNeeded);
    const qtyNeeded = Number.isInteger(parsedQty) && parsedQty >= 1 ? Math.min(99, parsedQty) : 1;

    items.push({
      id,
      name,
      ...(note ? { note } : {}),
      ...(url ? { url } : {}),
      qtyNeeded,
    });
  }

  return items;
}

export function parseGiftRegistryFromSettings(featureSettings: unknown): GiftRegistryItem[] {
  const fs = parseFeatureSettings(featureSettings);
  return sanitizeGiftRegistryItems(fs.giftRegistry);
}
