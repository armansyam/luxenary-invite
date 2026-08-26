/**
 * Centralized dynamic domain and invitation URL resolver:
 * Formats URLs in pure subdomain structure:
 * - Localhost:  http://[subdomain].localhost:3000
 * - Production: https://[subdomain].luxenary.id
 */

export function getApexRootDomain(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : "";
    
    // Localhost
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return `localhost${port}`;
    }

    // IP Access
    if (hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${hostname}${port}`;
    }

    // Live Apex Domain (strip app/admin/studio prefix if present)
    const parts = hostname.split(".");
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      return parts.slice(1).join(".") + port;
    }

    return hostname + port;
  }

  // Server-side fallback from environment or default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "luxenary.id" : "localhost:3000");
  return root.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Returns the full, pure subdomain public invitation URL:
 * - Localhost:  http://[subdomain].localhost:3000(?to=...)
 * - Production: https://[subdomain].[apexDomain](?to=...)
 */
export function getInvitationPublicUrl(subdomain: string, guestSlug?: string, isVip: boolean = true): string {
  const cleanSub = (subdomain || "wedding").toLowerCase().trim();
  
  let path = "";
  if (guestSlug) {
    const encoded = encodeURIComponent(guestSlug);
    path = isVip ? `/v=${encoded}` : `/${encoded}`;
  }

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port ? `:${port}` : "";

    // Localhost Subdomain support (supported natively in modern browsers)
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return `${protocol}//${cleanSub}.localhost${portSuffix}${path}`;
    }

    // Raw IP fallback
    if (hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${protocol}//${hostname}${portSuffix}/s/${cleanSub}${path}`;
    }

    // Live Domain Subdomain
    const parts = hostname.split(".");
    let apex = hostname;
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      apex = parts.slice(1).join(".");
    }

    return `${protocol}//${cleanSub}.${apex}${portSuffix}${path}`;
  }

  // Server-side default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || (process.env.NODE_ENV === "production" ? "luxenary.id" : "localhost:3000");
  const cleanRoot = root.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `http${process.env.NODE_ENV === "production" ? "s" : ""}://${cleanSub}.${cleanRoot}${path}`;
}

/**
 * Generates an Indonesian short month-year slug (e.g., "okt-2026", "nov-2026").
 */
export function getMonthYearSlug(dateInput?: string | Date | null): string {
  const MONTHS = ["jan", "feb", "mar", "apr", "mei", "jun", "jul", "agu", "sep", "okt", "nov", "des"];
  let date: Date;

  if (!dateInput) {
    date = new Date();
  } else if (typeof dateInput === "string") {
    date = new Date(dateInput);
    if (isNaN(date.getTime())) date = new Date();
  } else {
    date = dateInput;
  }

  const monthShort = MONTHS[date.getMonth()] || "okt";
  const year = date.getFullYear();
  return `${monthShort}-${year}`;
}

/**
 * Returns the permanent canonical path URL:
 * - Localhost:  http://localhost:3000/[groom]-[bride]/[invitationSlug](?to=...)
 * - Production: https://[apexDomain]/[groom]-[bride]/[invitationSlug](?to=...)
 */
export function getPermanentPathUrl(
  groomSlug: string,
  brideSlug: string,
  invitationSlug: string,
  guestSlug?: string
): string {
  const g = (groomSlug || "groom").toLowerCase().trim();
  const b = (brideSlug || "bride").toLowerCase().trim();
  const s = (invitationSlug || "wedding").toLowerCase().trim();
  const query = guestSlug ? `?to=${encodeURIComponent(guestSlug)}` : "";

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port ? `:${port}` : "";
    return `${protocol}//${hostname}${portSuffix}/${g}-${b}/${s}${query}`;
  }

  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || (process.env.NODE_ENV === "production" ? "luxenary.id" : "localhost:3000");
  const cleanRoot = root.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${cleanRoot}/${g}-${b}/${s}${query}`;
}

/**
 * Checks if a wedding event date has exceeded the grace period (default: 7 days).
 */
export function isSubdomainExpired(eventDateInput?: string | Date | null, gracePeriodDays: number = 7): boolean {
  if (!eventDateInput) return false;
  try {
    const eventDate = new Date(eventDateInput);
    if (isNaN(eventDate.getTime())) return false;

    const expiryTime = eventDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000;
    return Date.now() > expiryTime;
  } catch {
    return false;
  }
}

