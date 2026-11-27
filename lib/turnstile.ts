import { logger } from "@/lib/logger";

const TURNSTILE_VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";
const MAX_TOKEN_LENGTH = 2048;

export function getTurnstileSiteKey(): string {
  return (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || process.env.TURNSTILE_SITE_KEY || "").trim();
}

function getTurnstileSecret(): string {
  return (process.env.TURNSTILE_SECRET || "").trim();
}

export function isTurnstileConfigured(): boolean {
  return Boolean(getTurnstileSiteKey() && getTurnstileSecret());
}

export function isTurnstilePartiallyConfigured(): boolean {
  return Boolean(getTurnstileSiteKey()) !== Boolean(getTurnstileSecret());
}

export function resolveExpectedTurnstileHostnames(): Set<string> {
  const explicit = (process.env.TURNSTILE_HOSTNAMES ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);

  const isProd = process.env.NODE_ENV === "production";
  if (explicit.length > 0) {
    // Di produksi jangan pernah menerima localhost/127.0.0.1 dari daftar hostname Turnstile.
    return new Set(isProd ? explicit.filter((h) => h !== "localhost" && h !== "127.0.0.1") : explicit);
  }

  const derived = new Set<string>();
  const root = (process.env.NEXT_PUBLIC_ROOT_DOMAIN || "").split(":")[0].trim().toLowerCase();
  if (root && (!isProd || (root !== "localhost" && root !== "127.0.0.1"))) {
    derived.add(root);
    if (!root.startsWith("www.") && root !== "localhost" && root !== "127.0.0.1") {
      derived.add(`www.${root}`);
    }
  }
  const appUrl = (process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "").trim();
  if (appUrl) {
    try {
      const host = new URL(appUrl).hostname.toLowerCase();
      if (host && (!isProd || (host !== "localhost" && host !== "127.0.0.1"))) {
        derived.add(host);
      }
    } catch {
      // Abaikan URL tidak valid
    }
  }
  if (!isProd) {
    derived.add("localhost");
    derived.add("127.0.0.1");
  }
  return derived;
}

export type TurnstileVerifyResult =
  | { ok: true; skipped?: boolean }
  | { ok: false; reason: "MISCONFIGURED" | "MISSING_TOKEN" | "SITEVERIFY_ERROR" | "REJECTED" };

export async function verifyTurnstileToken(input: {
  token: unknown;
  remoteIp?: string;
  expectedAction: string;
}): Promise<TurnstileVerifyResult> {
  if (isTurnstilePartiallyConfigured()) {
    logger.error("Turnstile", "Konfigurasi Turnstile tidak lengkap (sitekey atau secret kosong); menolak permintaan (fail-closed).");
    return { ok: false, reason: "MISCONFIGURED" };
  }

  if (!isTurnstileConfigured()) {
    return { ok: true, skipped: true };
  }

  const token = typeof input.token === "string" ? input.token.trim() : "";
  const expectedHostnames = resolveExpectedTurnstileHostnames();

  if (!token || token.length > MAX_TOKEN_LENGTH || expectedHostnames.size === 0) {
    return { ok: false, reason: token ? "MISCONFIGURED" : "MISSING_TOKEN" };
  }

  const body = new URLSearchParams({
    secret: getTurnstileSecret(),
    response: token,
    ...(input.remoteIp && input.remoteIp !== "unknown" ? { remoteip: input.remoteIp } : {}),
  });

  let result: { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] };
  try {
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      signal: AbortSignal.timeout(10_000),
      body,
    });
    if (!res.ok) {
      logger.warn("Turnstile", `Siteverify mengembalikan HTTP ${res.status}`);
      return { ok: false, reason: "SITEVERIFY_ERROR" };
    }
    result = (await res.json()) as typeof result;
  } catch (err) {
    logger.warn("Turnstile", "Gagal menghubungi Cloudflare Turnstile siteverify (fail-closed)", {
      error: err instanceof Error ? err.message : String(err),
    });
    return { ok: false, reason: "SITEVERIFY_ERROR" };
  }

  const returnedHost = typeof result?.hostname === "string" ? result.hostname.trim().toLowerCase() : "";
  if (
    result?.success !== true ||
    result?.action !== input.expectedAction ||
    !expectedHostnames.has(returnedHost)
  ) {
    logger.warn("Turnstile", "Token Turnstile ditolak", {
      success: Boolean(result?.success),
      action: result?.action,
      expectedAction: input.expectedAction,
      hostname: returnedHost,
      errorCodes: result?.["error-codes"],
    });
    return { ok: false, reason: "REJECTED" };
  }

  return { ok: true };
}
