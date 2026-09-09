import { headers } from "next/headers";

/**
 * Mendeteksi URL origin aplikasi secara dinamis dari incoming request headers.
 * Bekerja di Server Components, Server Actions, dan Route Handlers.
 * Menghasilkan:
 * - http://localhost:3000 (di local dev)
 * - https://luxvite.id (di production VPS)
 * - https://namaklien.com (di custom domain)
 * Tanpa hardcode URL sama sekali.
 */
export async function getDynamicServerAppUrl(defaultFallback = "http://localhost:3000"): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    if (host) {
      const proto = headerList.get("x-forwarded-proto") || (host.includes("localhost") || host.startsWith("127.") || host.startsWith("192.168.") || host.startsWith("10.") ? "http" : "https");
      return `${proto}://${host}`.replace(/\/$/, "");
    }
  } catch {
    // Fallback jika dipanggil di luar konteks request (misal background script / build time)
  }

  const envUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.NEXT_PUBLIC_ROOT_DOMAIN ? `http://${process.env.NEXT_PUBLIC_ROOT_DOMAIN}` : "");
  return (envUrl || defaultFallback).replace(/\/$/, "");
}

/**
 * Mendeteksi apex / root domain secara dinamis dari incoming request headers.
 */
export async function getDynamicServerRootDomain(defaultFallback = "localhost:3000"): Promise<string> {
  try {
    const headerList = await headers();
    const host = headerList.get("x-forwarded-host") || headerList.get("host");
    if (host) {
      const parts = host.split(":");
      const hostname = parts[0];
      const port = parts[1] ? `:${parts[1]}` : "";

      if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.startsWith("127.") || hostname.startsWith("192.168.")) {
        return `${hostname}${port}`;
      }

      const domainParts = hostname.split(".");
      if (domainParts.length > 2 && ["app", "admin", "studio", "www"].includes(domainParts[0])) {
        return domainParts.slice(1).join(".") + port;
      }
      return host;
    }
  } catch {}

  const envRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
  return envRoot.replace(/^https?:\/\//, "").replace(/\/$/, "") || defaultFallback;
}
