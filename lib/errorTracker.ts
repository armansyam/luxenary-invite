import { logger } from "./logger";

/**
 * Enterprise Centralized Error Tracking
 * 
 * Menangkap exception runtime, melakukan sanitasi data sensitif (PII/kredensial),
 * mencatat log terstruktur, dan mem-forward ke Sentry secara non-blocking jika
 * SENTRY_DSN terkonfigurasi pada environment.
 */

export interface ErrorContext {
  userId?: string;
  orderId?: string;
  invitationId?: string;
  path?: string;
  method?: string;
  ipAddress?: string;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

// Sensor daftar kata kunci sensitif yang wajib di-masking
const SENSITIVE_KEYS = new Set([
  "password",
  "passwordhash",
  "pin",
  "staffpin",
  "secret",
  "apikey",
  "serverkey",
  "clientkey",
  "token",
  "authorization",
  "cookie",
]);

function sanitizeData(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeData);
  }

  const sanitized: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      sanitized[key] = "[REDACTED]";
    } else if (val && typeof val === "object") {
      sanitized[key] = sanitizeData(val);
    } else {
      sanitized[key] = val;
    }
  }
  return sanitized;
}

/**
 * Parsing URL Sentry DSN menjadi API Ingestion Endpoint
 */
function parseSentryDsn(dsn: string) {
  try {
    const url = new URL(dsn);
    const publicKey = url.username;
    const projectId = url.pathname.replace(/^\//, "");
    const host = url.host;
    const protocol = url.protocol;

    if (!publicKey || !projectId) return null;

    const endpoint = `${protocol}//${host}/api/${projectId}/store/`;
    return { endpoint, publicKey };
  } catch {
    return null;
  }
}

/**
 * Kirim exception ke Sentry API via native fetch (Zero NPM Dependency)
 */
async function sendToSentry(err: Error, context?: ErrorContext) {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  const parsed = parseSentryDsn(dsn);
  if (!parsed) return;

  const payload = {
    event_id: crypto.randomUUID().replace(/-/g, ""),
    timestamp: new Date().toISOString(),
    platform: "node",
    level: "error",
    logger: "luxenary-error-tracker",
    environment: process.env.NODE_ENV || "development",
    exception: {
      values: [
        {
          type: err.name || "Error",
          value: err.message,
          stacktrace: err.stack
            ? {
                frames: err.stack
                  .split("\n")
                  .slice(1)
                  .map((line) => ({ filename: line.trim() })),
              }
            : undefined,
        },
      ],
    },
    tags: {
      platform: "luxenary-invite",
      ...(context?.tags || {}),
    },
    user: context?.userId ? { id: context.userId, ip_address: context.ipAddress } : undefined,
    extra: sanitizeData({
      orderId: context?.orderId,
      invitationId: context?.invitationId,
      path: context?.path,
      method: context?.method,
      ...(context?.extra || {}),
    }),
  };

  try {
    await fetch(parsed.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Sentry-Auth": `Sentry sentry_version=7, sentry_client=luxenary-agent/1.0, sentry_key=${parsed.publicKey}`,
      },
      body: JSON.stringify(payload),
    });
  } catch {
    // Non-blocking fail-safe
  }
}

/**
 * Tangkap exception dan catat ke seluruh log sink (Terminal/JSON + Sentry)
 */
export function captureException(err: unknown, context?: ErrorContext): void {
  const errorObj = err instanceof Error ? err : new Error(String(err));
  const safeContext = sanitizeData(context || {});

  // 1. Catat ke structured logger lokal
  logger.error("ErrorTracker", errorObj.message, errorObj, safeContext);

  // 2. Kirim ke Sentry jika DSN aktif secara non-blocking
  if (process.env.SENTRY_DSN) {
    sendToSentry(errorObj, safeContext).catch(() => {});
  }
}

export function isErrorTrackingConfigured(): boolean {
  return !!process.env.SENTRY_DSN;
}
