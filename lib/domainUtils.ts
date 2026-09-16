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
  const root = process.env.NEXT_PUBLIC_ROOT_DOMAIN || process.env.NEXT_PUBLIC_APP_URL || "localhost:3000";
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

/**
 * Evaluator rute Galeri Momen (/memories) - DEPRECATED
 * Sesuai arsitektur unhijacked URL: URL utama (/[slug] atau /s/[subdomain]) selalu menyajikan
 * halaman web undangan penuh. Galeri Momen dan Kamera Tamu masing-masing memiliki rute tersendiri
 * (/[slug]/memories dan /[slug]/sharemoment) dengan navigasi kembali ke undangan yang jelas.
 */
export function shouldDisplayMemoriesGallery(_invitation?: {
  status: string;
  eventData?: any;
  featureSettings?: string | null;
  order?: { planType?: string | null } | null;
}): boolean {
  return false;
}

export interface MemoriesSession {
  id: string;
  name: string;
  date: string; // "YYYY-MM-DD"
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  timezone?: string; // "WIB" | "WITA" | "WIT"
  allocatedQuota?: number; // Plafon kuota foto untuk sesi ini
}

export interface MemoriesScheduleResult {
  startTime: Date | null;
  endTime: Date | null;
  isCustom: boolean;
  isSessionActive: boolean;
  currentSession: MemoriesSession | null;
  nextSession: MemoriesSession | null;
  isAllFinished: boolean;
  sessions: MemoriesSession[];
  activeSessionIndex: number;
}

/**
 * Menghitung jadwal aktif kamera momen tamu (kapan mulai dibuka dan kapan ditutup).
 * Mendukung Multi-Session Camera Windows (misal: Sesi Akad & Sesi Resepsi) serta Auto-Sync dari eventData.
 */
export function getMemoriesActiveSchedule(featureSettingsInput: any, eventDataInput: any): MemoriesScheduleResult {
  const fs = (() => {
    if (typeof featureSettingsInput === "string") {
      try {
        return JSON.parse(featureSettingsInput);
      } catch {
        return {};
      }
    }
    return featureSettingsInput || {};
  })();

  const rawSessions: MemoriesSession[] = [];

  // 1. Prioritaskan konfigurasi multi-session eksplisit jika ada
  if (Array.isArray(fs.memoriesSessions) && fs.memoriesSessions.length > 0) {
    for (const s of fs.memoriesSessions) {
      if (s && s.date) {
        rawSessions.push({
          id: s.id || `sess_${Math.random().toString(36).substring(2, 7)}`,
          name: s.name || "Sesi Acara",
          date: s.date,
          startTime: s.startTime || "08:00",
          endTime: s.endTime || "22:00",
          allocatedQuota: Number(s.allocatedQuota) || 0,
        });
      }
    }
  } else if (fs.memoriesCustomSchedule && fs.memoriesStartTime && fs.memoriesEndTime) {
    // Mode kustom mandiri rentang tunggal
    const sDate = new Date(fs.memoriesStartTime);
    const eDate = new Date(fs.memoriesEndTime);
    if (!isNaN(sDate.getTime()) && !isNaN(eDate.getTime())) {
      const pad = (n: number) => String(n).padStart(2, "0");
      rawSessions.push({
        id: "custom_single",
        name: "Sesi Kamera Kustom",
        date: `${sDate.getFullYear()}-${pad(sDate.getMonth() + 1)}-${pad(sDate.getDate())}`,
        startTime: `${pad(sDate.getHours())}:${pad(sDate.getMinutes())}`,
        endTime: `${pad(eDate.getHours())}:${pad(eDate.getMinutes())}`,
        allocatedQuota: 0,
      });
    }
  } else {
    // 2. Auto-sintesis sesi dari susunan acara undangan (eventData)
    try {
      const events = typeof eventDataInput === "string" ? JSON.parse(eventDataInput) : eventDataInput || [];
      const list = Array.isArray(events) ? events : events?.events;
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((ev: any, idx: number) => {
          if (ev?.date) {
            let sTime = ev.startTime;
            let eTime = ev.endTime;
            let tz = ev.timezone;
            if (!tz && ev.time) {
              if (/WITA/i.test(ev.time)) tz = "WITA";
              else if (/WIT/i.test(ev.time)) tz = "WIT";
              else if (/WIB/i.test(ev.time)) tz = "WIB";
            }
            if ((!sTime || !eTime) && ev.time) {
              const match = String(ev.time).match(/(\d{1,2}[:.]\d{2})\s*[-–—]\s*(\d{1,2}[:.]\d{2}|selesai)/i);
              if (match) {
                if (!sTime) sTime = match[1].replace(".", ":").padStart(5, "0");
                if (!eTime) {
                  eTime = /selesai/i.test(match[2]) ? "23:59" : match[2].replace(".", ":").padStart(5, "0");
                }
              }
            }
            rawSessions.push({
              id: ev.id || `ev_${idx}`,
              name: ev.title || (idx === 0 ? "Akad Nikah" : "Resepsi Pernikahan"),
              date: ev.date,
              startTime: sTime || "08:00",
              endTime: eTime || "22:00",
              timezone: tz || "WIB",
              allocatedQuota: 0,
            });
          }
        });
      }
    } catch {
      // fallback safe
    }
  }

  const now = new Date();
  const parsed = rawSessions.map((s, index) => {
    const cleanDate = s.date.includes("T") ? s.date.split("T")[0] : s.date;
    const tz = (s as any).timezone || "WIB";
    const offset = tz === "WITA" ? "+08:00" : tz === "WIT" ? "+09:00" : "+07:00";
    const sTime = (s.startTime || "00:00").slice(0, 5);
    const eTime = (s.endTime || "23:59").slice(0, 5);
    const startDate = new Date(`${cleanDate}T${sTime}:00${offset}`);
    const endDate = new Date(`${cleanDate}T${eTime}:00${offset}`);
    const graceEndDate = new Date(endDate.getTime() + 15 * 60 * 1000); // 15 menit toleransi pasca-sesi
    return {
      ...s,
      index,
      startDate,
      endDate,
      graceEndDate,
    };
  }).filter(s => !isNaN(s.startDate.getTime()) && !isNaN(s.endDate.getTime()));

  // Urutkan secara kronologis
  parsed.sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  let startTime: Date | null = parsed.length > 0 ? parsed[0].startDate : null;
  let endTime: Date | null = parsed.length > 0 ? parsed[parsed.length - 1].endDate : null;
  let currentSession: MemoriesSession | null = null;
  let nextSession: MemoriesSession | null = null;
  let activeSessionIndex = -1;
  let isSessionActive = parsed.length === 0;

  // Evaluasi status sesi saat ini terhadap waktu faktual
  for (const s of parsed) {
    if (now >= s.startDate && now <= s.graceEndDate) {
      currentSession = {
        id: s.id,
        name: s.name,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: (s as any).timezone || "WIB",
        allocatedQuota: s.allocatedQuota,
      };
      activeSessionIndex = s.index;
      isSessionActive = true;
      break;
    }
  }

  // Jika tidak ada sesi yang sedang berjalan, cari sesi berikutnya
  if (!isSessionActive) {
    for (const s of parsed) {
      if (now < s.startDate) {
        nextSession = {
          id: s.id,
          name: s.name,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          timezone: (s as any).timezone || "WIB",
          allocatedQuota: s.allocatedQuota,
        };
        break;
      }
    }
  }

  const isAllFinished = parsed.length > 0 && !isSessionActive && !nextSession && now > (parsed[parsed.length - 1].graceEndDate);

  return {
    startTime,
    endTime,
    isCustom: Boolean(fs.memoriesCustomSchedule || (Array.isArray(fs.memoriesSessions) && fs.memoriesSessions.length > 0)),
    isSessionActive,
    currentSession,
    nextSession,
    isAllFinished,
    sessions: rawSessions,
    activeSessionIndex,
  };
}

/**
 * Menghitung kuota kumulatif foto yang diizinkan untuk sesi saat ini (dengan Smart Rollover).
 */
export function calculateSessionCumulativeQuota(
  sessions: MemoriesSession[],
  activeIndex: number,
  totalEventQuota: number,
  totalPhotosBeforeCurrentSession: number = 0
): number {
  if (!sessions || sessions.length === 0 || activeIndex < 0 || activeIndex >= sessions.length) {
    return totalEventQuota;
  }

  const current = sessions[activeIndex];
  if (!current.allocatedQuota || current.allocatedQuota <= 0) {
    return totalEventQuota;
  }

  let pastAllocated = 0;
  for (let i = 0; i < activeIndex; i++) {
    pastAllocated += (sessions[i].allocatedQuota || 0);
  }

  const rolloverSurplus = Math.max(0, pastAllocated - totalPhotosBeforeCurrentSession);
  const allowedUntilThisSession = totalPhotosBeforeCurrentSession + current.allocatedQuota + rolloverSurplus;

  return Math.min(totalEventQuota, allowedUntilThisSession);
}

