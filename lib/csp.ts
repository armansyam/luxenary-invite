const PIXEL_SCRIPT_HOSTS = [
  "https://connect.facebook.net",
  "https://analytics.tiktok.com",
  "https://www.googletagmanager.com",
  "https://www.google-analytics.com",
];

const PAYMENT_SCRIPT_HOSTS = [
  "https://app.midtrans.com",
  "https://app.sandbox.midtrans.com",
  "https://static.cloudflareinsights.com",
];

const BASE_DIRECTIVES = [
  "default-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data: blob: https:",
  "media-src 'self' blob: https:",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https:",
  "frame-src 'self' https://app.midtrans.com https://app.sandbox.midtrans.com https://www.youtube.com https://player.vimeo.com https://www.google.com",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "report-uri /api/security/csp-report",
];

/** Membuat nonce acak kriptografis per permintaan (kompatibel Edge & Node Web Crypto). */
export function generateCspNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin);
}

const APP_PREFIXES = [
  "/admin",
  "/dashboard",
  "/login",
  "/partner",
  "/onboarding",
  "/packages",
  "/checkout",
  "/payment",
  "/contact",
  "/how-it-works",
  "/privacy",
  "/terms",
  "/refund",
  "/archives",
];

/** Menentukan apakah path merupakan HTML undangan / pratinjau / demo / portofolio publik. */
export function isInvitationHtmlRoute(pathname: string): boolean {
  if (!pathname || pathname === "/") return false;
  if (
    pathname.startsWith("/s/") ||
    pathname.startsWith("/demo") ||
    pathname.startsWith("/portfolio") ||
    pathname.startsWith("/sharemoment") ||
    pathname.startsWith("/memories")
  ) {
    return true;
  }
  if (/^\/api\/client\/invitations\/[^/]+\/preview/.test(pathname)) return true;
  if (pathname.startsWith("/api/")) return false;
  if (APP_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return false;
  }
  // Rute slug datar (/:slug, /:slug/memories, /:slug/receptionist, /:slug/welcome, dll.)
  return true;
}

/**
 * Rute aplikasi platform yang bebas dari `<iframe srcDoc>` (bukan /admin dan bukan HTML undangan).
 * Pada rute ini CSP enforced menggunakan nonce per permintaan tanpa `'unsafe-inline'`, sehingga
 * Next.js 16 otomatis menyematkan nonce ke seluruh skrip hidrasi RSC & chunk tanpa false positive.
 */
export function isStrictNonceAppRoute(pathname: string): boolean {
  if (!pathname) return false;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return false;
  return !isInvitationHtmlRoute(pathname);
}

/** CSP enforced untuk seluruh halaman (mengizinkan inline skrip tema publik & pixel pemasaran). */
export function buildEnforcedCsp(): string {
  const scriptSrc = [
    "script-src 'self' 'unsafe-inline'",
    ...PAYMENT_SCRIPT_HOSTS,
    ...PIXEL_SCRIPT_HOSTS,
  ].join(" ");
  return [BASE_DIRECTIVES[0], scriptSrc, ...BASE_DIRECTIVES.slice(1)].join("; ");
}

/**
 * CSP strict Report-Only berbasis nonce untuk rute aplikasi platform Next.js.
 * Memantau skrip inline tanpa nonce sebelum pengetatan penuh tanpa 'unsafe-inline'.
 */
export function buildStrictAppCspReportOnly(nonce: string): string {
  const safeNonce = nonce.replace(/[^a-zA-Z0-9+/=_-]/g, "");
  const scriptSrc = [
    `script-src 'self' 'nonce-${safeNonce}'`,
    ...PAYMENT_SCRIPT_HOSTS,
    ...PIXEL_SCRIPT_HOSTS,
  ].join(" ");
  return [BASE_DIRECTIVES[0], scriptSrc, ...BASE_DIRECTIVES.slice(1)].join("; ");
}
