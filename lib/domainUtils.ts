/**
 * Centralized dynamic domain and invitation URL resolver:
 * Automatically detects current runtime host (localhost, staging, custom domain, or production apex).
 */

export function getApexRootDomain(): string {
  if (typeof window !== "undefined") {
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : "";
    
    // Local development
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${hostname}${port}`;
    }

    // Subdomain-stripped apex domain (e.g. app.luxenary.id -> luxenary.id)
    const parts = hostname.split(".");
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      return parts.slice(1).join(".") + port;
    }

    return hostname + port;
  }

  // Server-side fallback from environment or default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "luxenary.id";
  return root.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Returns the full, clickable public invitation URL for guests:
 * - On localhost / IP dev: returns `${origin}/s/${subdomain}`
 * - On production / custom host: returns `https://${subdomain}.${apexDomain}`
 */
export function getInvitationPublicUrl(subdomain: string, guestSlug?: string): string {
  const cleanSub = (subdomain || "wedding").toLowerCase().trim();
  const query = guestSlug ? `?to=${encodeURIComponent(guestSlug)}` : "";

  if (typeof window !== "undefined") {
    const { protocol, hostname, port, origin } = window.location;

    // In local development or raw IP, use pathname routing /s/[subdomain] for 100% instant reliability
    if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${origin}/s/${cleanSub}${query}`;
    }

    // Production / Live Domain
    const parts = hostname.split(".");
    let apex = hostname;
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      apex = parts.slice(1).join(".");
    }

    const portSuffix = port ? `:${port}` : "";
    return `${protocol}//${cleanSub}.${apex}${portSuffix}${query}`;
  }

  // Server-side default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "luxenary.id";
  const cleanRoot = root.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${cleanSub}.${cleanRoot}${query}`;
}
