/**
 * Centralized dynamic domain and invitation URL resolver:
 * Formats URLs in pure subdomain structure:
 * - Localhost:  http://[subdomain].localhost:3000
 * - Production: https://[subdomain].[root_domain]
 */

import { DAY_MS, getEventTimezoneOffset, getPrimaryEventDate, getPrimaryEventTimezone, resolveEventTimezone } from "./lifecycleDates";

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
  "secure",
  "bayar",
  "payment",
  "billing",
  "account",
  "verify",
  "official",
  "wa",
  "whatsapp",
  "help",
]);

export function isReservedSubdomain(subdomain: string): boolean {
  if (!subdomain) return false;
  return RESERVED_SUBDOMAINS.has(subdomain.toLowerCase().trim());
}

/**
 * Segmen teratas yang sudah dipakai rute aplikasi atau folder `public/`. Slug undangan (`/{slug}`) yang sama dengan salah
 * satunya tidak akan pernah terbuka karena rute statis menang, jadi slug seperti itu diberi akhiran.
 */
export const RESERVED_SLUGS = new Set([
  "admin", "api", "archives", "assets", "checkout", "contact", "css", "dashboard", "demo", "downloads", "fonts",
  "how-it-works", "login", "memories", "music", "onboarding", "packages", "payment", "portfolio", "privacy", "published",
  "refund", "sharemoment", "terms", "uploads",
]);

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug.toLowerCase().trim());
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
 * 1. Active Custom Domain (e.g., https://domain-klien.com/?to=Budi)
 * 2. Active Subdomain (e.g., https://nama-klien.domain-platform.com/?to=Budi atau http://nama-klien.localhost:3000/?to=Budi)
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
 * Nama host custom domain dari masukan klien (skema `http(s)://` dan garis miring penutup dibuang), atau null bila
 * bukan nama host DNS yang sah. Nilai ini dipakai apa adanya di URL tautan tamu dan pembersihan cache tepi.
 */
export function normalizeCustomDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const host = input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const valid = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
  return valid.test(host) ? host : null;
}

/**
 * Apakah header Host sebuah permintaan adalah custom domain milik undangan ini (port dan awalan `www.` diabaikan).
 * Dipakai rute slug untuk tahu bahwa pengunjung datang lewat custom domain klien dan tidak boleh dialihkan ke domain utama.
 */
export function isCustomDomainHost(hostHeader: string | null | undefined, customDomain: string | null | undefined): boolean {
  if (!hostHeader || !customDomain) return false;
  const normalize = (value: string) => value.trim().toLowerCase().split(":")[0].replace(/^www\./, "");
  const host = normalize(hostHeader);
  return host !== "" && host === normalize(customDomain);
}

/**
 * Apakah masa tenggang subdomain (`subdomain_grace_days`) sudah lewat, dihitung dari awal hari acara utama
 * pada zona waktu acara. Menerima eventData (JSON string atau array). Tanpa tanggal valid: false.
 */
export function isSubdomainExpired(eventData: unknown, graceDays: number, now: Date = new Date()): boolean {
  const eventDay = getPrimaryEventDate(eventData);
  if (!eventDay) return false;
  return now.getTime() > eventDay.getTime() + graceDays * DAY_MS;
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

  // 1. Prioritaskan konfigurasi multi-session eksplisit jika ada. Sesi tanpa zona waktu memakai zona waktu acara utama:
  // jam sesi diketik sebagai jam setempat acara, bukan WIB.
  if (Array.isArray(fs.memoriesSessions) && fs.memoriesSessions.length > 0) {
    const eventTimezone = getPrimaryEventTimezone(eventDataInput);
    for (const s of fs.memoriesSessions) {
      if (s && s.date) {
        rawSessions.push({
          id: s.id || `sess_${Math.random().toString(36).substring(2, 7)}`,
          name: s.name || "Sesi Acara",
          date: s.date,
          startTime: s.startTime || "08:00",
          endTime: s.endTime || "22:00",
          timezone: s.timezone ? resolveEventTimezone(s) : eventTimezone,
          allocatedQuota: Number(s.allocatedQuota) || 0,
        });
      }
    }
  } else {
    // 2. Auto-sintesis sesi dari susunan acara undangan (eventData)
    try {
      const list = typeof eventDataInput === "string" ? JSON.parse(eventDataInput) : eventDataInput || [];
      if (Array.isArray(list) && list.length > 0) {
        list.forEach((ev: any, idx: number) => {
          if (ev?.date) {
            let sTime = ev.startTime;
            let eTime = ev.endTime;
            const tz = resolveEventTimezone(ev);
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
              timezone: tz,
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
  const parsed = rawSessions.map((s) => {
    const cleanDate = s.date.includes("T") ? s.date.split("T")[0] : s.date;
    const offset = getEventTimezoneOffset(resolveEventTimezone(s));
    const sTime = (s.startTime || "00:00").slice(0, 5);
    const eTime = (s.endTime || "23:59").slice(0, 5);
    const startDate = new Date(`${cleanDate}T${sTime}:00${offset}`);
    const endDate = new Date(`${cleanDate}T${eTime}:00${offset}`);
    const graceEndDate = new Date(endDate.getTime() + 15 * 60 * 1000); // 15 menit toleransi pasca-sesi
    return {
      ...s,
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

  // Evaluasi status sesi saat ini terhadap waktu faktual. Indeks mengacu ke daftar kronologis (`sessions` di bawah),
  // karena kuota kumulatif menjumlah sesi-sesi sebelumnya secara berurutan.
  for (const [chronologicalIndex, s] of parsed.entries()) {
    if (now >= s.startDate && now <= s.graceEndDate) {
      currentSession = {
        id: s.id,
        name: s.name,
        date: s.date,
        startTime: s.startTime,
        endTime: s.endTime,
        timezone: s.timezone || "WIB",
        allocatedQuota: s.allocatedQuota,
      };
      activeSessionIndex = chronologicalIndex;
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
          timezone: s.timezone || "WIB",
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
    isCustom: Array.isArray(fs.memoriesSessions) && fs.memoriesSessions.length > 0,
    isSessionActive,
    currentSession,
    nextSession,
    isAllFinished,
    sessions: parsed.map(({ id, name, date, startTime, endTime, timezone, allocatedQuota }) => ({ id, name, date, startTime, endTime, timezone, allocatedQuota })),
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

