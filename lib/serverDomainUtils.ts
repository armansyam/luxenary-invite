import { headers } from "next/headers";
import { getApexRootDomain, isCustomDomainHost } from "@/lib/domainUtils";

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
 * Origin aplikasi untuk URL yang dikirim ke pihak ketiga, mis. halaman balik dan alamat notifikasi gateway pembayaran.
 * Memakai NEXT_PUBLIC_APP_URL, lalu NEXT_PUBLIC_ROOT_DOMAIN; header Host yang dapat dipalsukan hanya menjadi pilihan
 * terakhir (pengembangan lokal tanpa env).
 */
export async function getTrustedAppUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN?.trim().replace(/^https?:\/\//, "").replace(/\/$/, "");
  if (root) return `${process.env.NODE_ENV === "production" ? "https" : "http"}://${root}`;

  return getDynamicServerAppUrl();
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
  } catch {
    // Di luar konteks request (skrip latar atau build) headers() melempar; domain diambil dari lingkungan di bawah.
  }

  const envRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
  return envRoot.replace(/^https?:\/\//, "").replace(/\/$/, "") || defaultFallback;
}

/**
 * Alamat beranda undangan untuk redirect dari halaman turunannya (/memories, /sharemoment). Di host subdomain atau
 * custom domain undangan itu sendiri berandanya "/": "/<slug>" di host tersebut dibaca proxy sebagai tautan tamu
 * bernama <slug>.
 */
export async function invitationHomePath(invitation: { invitationSlug: string; subdomain: string | null; customDomain: string | null }): Promise<string> {
  const hostHeader = (await headers()).get("host");
  const host = (hostHeader || "").split(":")[0].toLowerCase();
  // Dicocokkan persis dengan <subdomain>.<apex>: awalan saja juga cocok dengan apex itu sendiri bila subdomain klien
  // sama dengan label pertama domain utama (mis. subdomain "luxenary" di luxenary.id).
  const apex = getApexRootDomain().split(":")[0].toLowerCase();
  const onSubdomain = !!invitation.subdomain && host === `${invitation.subdomain.toLowerCase()}.${apex}`;
  return onSubdomain || isCustomDomainHost(hostHeader, invitation.customDomain) ? "/" : `/${invitation.invitationSlug}`;
}
