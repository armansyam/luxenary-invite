"use client";

declare global {
  interface Window {
    fbq?: (...args: any[]) => void;
    ttq?: {
      track?: (event: string, payload?: Record<string, any>) => void;
      page?: () => void;
    };
    gtag?: (...args: any[]) => void;
  }
}

export type FunnelEventName = "ViewContent" | "InitiateCheckout" | "Purchase";

export interface FunnelEventPayload {
  value?: number;
  currency?: string;
  plan?: string;
  orderId?: string;
  content_type?: string;
}

/** Kirim event standar ke Meta Pixel, TikTok Pixel, dan GA4 secara aman (no-op jika pixel tidak aktif). */
export function trackEvent(event: FunnelEventName, payload: FunnelEventPayload = {}): void {
  if (typeof window === "undefined") return;
  const currency = payload.currency || "IDR";
  const numericValue = Number.isFinite(Number(payload.value)) ? Number(payload.value) : 0;

  try {
    if (typeof window.fbq === "function") {
      window.fbq("track", event, {
        value: numericValue,
        currency,
        content_type: payload.content_type || "product",
        content_name: payload.plan || undefined,
      });
    }
  } catch {}

  try {
    if (window.ttq && typeof window.ttq.track === "function") {
      const ttEvent = event === "Purchase" ? "CompletePayment" : event;
      window.ttq.track(ttEvent, {
        value: numericValue,
        currency,
        content_type: payload.content_type || "product",
        content_name: payload.plan || undefined,
      });
    }
  } catch {}

  try {
    if (typeof window.gtag === "function") {
      const gaEvent =
        event === "ViewContent"
          ? "view_item"
          : event === "InitiateCheckout"
          ? "begin_checkout"
          : "purchase";
      window.gtag("event", gaEvent, {
        value: numericValue,
        currency,
        transaction_id: payload.orderId || undefined,
        items: payload.plan ? [{ item_id: payload.plan, item_name: payload.plan }] : undefined,
      });
    }
  } catch {}
}

/** Hindari event funnel duplikat pada refresh halaman atau event ganda menggunakan sessionStorage. */
export function trackEventOnce(
  dedupeKey: string,
  event: FunnelEventName,
  payload: FunnelEventPayload = {},
): void {
  if (typeof window === "undefined") return;
  const storageKey = `lux_px_${dedupeKey}`;
  try {
    if (window.sessionStorage.getItem(storageKey)) return;
    window.sessionStorage.setItem(storageKey, "1");
  } catch {}
  trackEvent(event, payload);
}

export function trackPurchaseOnce(orderId: string | null | undefined, payload: FunnelEventPayload = {}): void {
  if (!orderId) return;
  trackEventOnce(`purchase_${orderId}`, "Purchase", { ...payload, orderId });
}
