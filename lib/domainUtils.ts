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
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "luxenary.id";
  return root.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/**
 * Returns the full, pure subdomain public invitation URL:
 * - Localhost:  http://[subdomain].localhost:3000(?to=...)
 * - Production: https://[subdomain].[apexDomain](?to=...)
 */
export function getInvitationPublicUrl(subdomain: string, guestSlug?: string): string {
  const cleanSub = (subdomain || "wedding").toLowerCase().trim();
  const query = guestSlug ? `?to=${encodeURIComponent(guestSlug)}` : "";

  if (typeof window !== "undefined") {
    const { protocol, hostname, port } = window.location;
    const portSuffix = port ? `:${port}` : "";

    // Localhost Subdomain support (supported natively in modern browsers)
    if (hostname === "localhost" || hostname.endsWith(".localhost")) {
      return `${protocol}//${cleanSub}.localhost${portSuffix}${query}`;
    }

    // Raw IP fallback
    if (hostname === "127.0.0.1" || hostname.startsWith("192.168.") || hostname.startsWith("10.")) {
      return `${protocol}//${hostname}${portSuffix}/s/${cleanSub}${query}`;
    }

    // Live Domain Subdomain
    const parts = hostname.split(".");
    let apex = hostname;
    if (parts.length > 2 && (parts[0] === "app" || parts[0] === "admin" || parts[0] === "studio" || parts[0] === "www")) {
      apex = parts.slice(1).join(".");
    }

    return `${protocol}//${cleanSub}.${apex}${portSuffix}${query}`;
  }

  // Server-side default
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || "luxenary.id";
  const cleanRoot = root.replace(/^https?:\/\//, "").replace(/\/$/, "");
  return `https://${cleanSub}.${cleanRoot}${query}`;
}
