/**
 * Centralized dynamic domain and invitation URL resolver:
 * Formats URLs in pure subdomain structure:
 * - Localhost:  http://[subdomain].localhost:3000
 * - Production: https://[subdomain].[root_domain]
 */

/**
 * Subdomain cadangan sistem yang dilindungi dan dilarang digunakan oleh klien.
 * Termasuk cdn (Cloudflare R2), admin, api, auth, media, cname, dll.
 */
export const RESERVED_SUBDOMAINS = new Set([
  "admin",
  "api",
  "receptionist",
  "dashboard",
  "demo",
  "login",
  "checkout",
  "pay",
  "app",
  "www",
  "mail",
  "support",
  "dev",
  "staging",
  "cdn",
  "auth",
  "order",
  "orders",
  "cname",
  "host",
  "alias",
  "invite",
  "static",
  "assets",
  "media",
  "storage",
  "r2",
  "s3",
]);

export function isReservedSubdomain(subdomain: string): boolean {
  if (!subdomain) return false;
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase().trim());
}

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

    // Live Apex Domain (strip app/admin/studio/www prefix if present)
    const parts = hostname.split(".");
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      return parts.slice(1).join(".") + port;
    }

    return hostname + port;
  }

  // Server-side fallback from environment or default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "";
  return root.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Returns the full, pure subdomain public invitation URL:
 * - Localhost:  http://[subdomain].localhost:3000(?to=...)
 * - Production: https://[subdomain].[apexDomain](?to=...)
 */
export function getInvitationPublicUrl(subdomain: string, guestSlug?: string): string {
  const cleanSub = (subdomain || "").toLowerCase().trim();
  if (!cleanSub) return "";
  
  const queryParam = guestSlug ? `?to=${encodeURIComponent(guestSlug)}` : "";

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port ? `:${port}` : "";

    // Localhost Subdomain support (supported natively in modern browsers)
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return `${protocol}//${cleanSub}.localhost${portSuffix}/${queryParam}`;
    }

    // Raw IP fallback
    if (hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${protocol}//${hostname}${portSuffix}/s/${cleanSub}${queryParam ? `/${queryParam}` : ""}`;
    }

    // Live Domain Subdomain
    const parts = hostname.split(".");
    let apex = hostname;
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      apex = parts.slice(1).join(".");
    }

    return `${protocol}//${cleanSub}.${apex}${portSuffix}/${queryParam}`;
  }

  // Server-side default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "";
  const cleanRoot = root.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `http${process.env.NODE_ENV === "production" ? "s" : ""}://${cleanSub}.${cleanRoot}/${queryParam}`;
}

export interface ResolveInvitationUrlOptions {
  customDomain?: string | null;
  subdomain?: string | null;
  groomSlug?: string | null;
  brideSlug?: string | null;
  invitationSlug?: string | null;
  guestSlug?: string | null;
}

export interface ResolvedInvitationUrl {
  url: string;
  domainType: "CUSTOM_DOMAIN" | "SUBDOMAIN" | "FALLBACK";
  domainIdentifier: string;
  isConfigured: boolean;
}

/**
 * Resolves the primary public URL for an invitation with strict precedence:
 * 1. Active Custom Domain (e.g., https://yoga-nisa.com/?to=Budi)
 * 2. Active Subdomain (e.g., https://yoga-nisa.luxenary.id/?to=Budi atau http://yoga-nisa.localhost:3000/?to=Budi)
 * 3. Unconfigured / Empty state (No fake simulation fallbacks)
 */
export function resolveEffectiveInvitationUrl(options: ResolveInvitationUrlOptions): ResolvedInvitationUrl {
  const { customDomain, subdomain, guestSlug, invitationSlug } = options;
  const queryParam = guestSlug ? `?to=${encodeURIComponent(guestSlug)}` : "";

  // 1. Custom Domain Priority
  if (customDomain && customDomain.trim()) {
    const cleanCustom = customDomain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
    let protocol = "https:";
    if (typeof window !== "undefined") {
      protocol = window.location.protocol;
    } else {
      protocol = process.env.NODE_ENV === "production" ? "https:" : "http:";
    }
    return {
      url: `${protocol}//${cleanCustom}/${queryParam}`,
      domainType: "CUSTOM_DOMAIN",
      domainIdentifier: cleanCustom,
      isConfigured: true,
    };
  }

  // 2. Subdomain Priority
  if (subdomain && subdomain.trim()) {
    const cleanSub = subdomain.trim().toLowerCase();
    return {
      url: getInvitationPublicUrl(cleanSub, guestSlug || undefined),
      domainType: "SUBDOMAIN",
      domainIdentifier: cleanSub,
      isConfigured: true,
    };
  }

  // 3. Fallback to Canonical Flat Slug (URL Asli) if subdomain is absent/recycled
  if (invitationSlug && invitationSlug.trim()) {
    const cleanSlug = invitationSlug.trim().toLowerCase();
    const apexRoot = getApexRootDomain();
    let protocol = "https:";
    if (typeof window !== "undefined") {
      protocol = window.location.protocol;
    } else {
      protocol = process.env.NODE_ENV === "production" ? "https:" : "http:";
    }
    return {
      url: `${protocol}//${apexRoot}/${cleanSlug}${queryParam}`,
      domainType: "FALLBACK",
      domainIdentifier: cleanSlug,
      isConfigured: true,
    };
  }

  // 4. Unconfigured state: No fake fallback URLs
  return {
    url: "",
    domainType: "FALLBACK",
    domainIdentifier: "",
    isConfigured: false,
  };
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
 * Resolves the latest/most recent wedding event date from an eventData JSON array or string.
 * Ensures multi-session weddings (e.g. Akad on Day 1, Reception on Day 3) use the final event date.
 */
export function getLatestEventDate(eventData: any): Date | null {
  try {
    const events = typeof eventData === "string" ? JSON.parse(eventData) : eventData || [];
    const list = Array.isArray(events) ? events : events?.events;
    if (!Array.isArray(list)) return null;
    let latest: Date | null = null;
    for (const ev of list) {
      if (ev?.date) {
        const d = new Date(ev.date);
        if (!isNaN(d.getTime())) {
          if (!latest || d > latest) latest = d;
        }
      }
    }
    return latest;
  } catch {
    return null;
  }
}

/**
 * Checks if a wedding event date has exceeded the grace period (default: 7 days).
 * Accepts Date object, ISO date string, or raw eventData JSON string.
 */
export function isSubdomainExpired(eventDateInput?: string | Date | null, gracePeriodDays: number = 7): boolean {
  if (!eventDateInput) return false;
  try {
    let eventDate: Date | null = null;
    if (eventDateInput instanceof Date) {
      eventDate = eventDateInput;
    } else if (typeof eventDateInput === "string") {
      const trimmed = eventDateInput.trim();
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        eventDate = getLatestEventDate(trimmed);
      } else {
        eventDate = new Date(trimmed);
      }
    }
    if (!eventDate || isNaN(eventDate.getTime())) return false;

    const expiryTime = eventDate.getTime() + gracePeriodDays * 24 * 60 * 60 * 1000;
    return Date.now() > expiryTime;
  } catch {
    return false;
  }
}
