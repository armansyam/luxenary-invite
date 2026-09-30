import { headers } from "next/headers";

/**
 * Mendeteksi URL origin aplikasi secara dinamis dari incoming request headers.
 * Bekerja di Server Components, Server Actions, dan Route Handlers.
 * Menghasilkan origin host yang sedang diakses (mis. http://localhost:3000, https://domain-platform.com,
 * atau https://domain-klien.com bila diakses lewat custom domain). Tanpa hardcode URL.
 * Jangan dipakai untuk konten yang dipersist atau dikirim ke pihak lain (HTML statis terbit, link email):
 * header Host dapat dipalsukan sehingga jalur itu wajib memakai NEXT_PUBLIC_APP_URL.
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
 * Origin apex platform untuk request yang masuk lewat subdomain klien
 * (`budi-sari.domain-platform.com` -> `https://domain-platform.com`): label subdomain klien dibuang dari host.
 * Host tanpa label tersebut (mis. akses via IP) dikembalikan apa adanya.
 */
export async function getDynamicServerApexUrl(clientSubdomain: string): Promise<string> {
  const origin = new URL(await getDynamicServerAppUrl());
  const label = `${clientSubdomain.toLowerCase().trim()}.`;
  if (origin.hostname.startsWith(label)) {
    origin.hostname = origin.hostname.slice(label.length);
  }
  return origin.origin;
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
