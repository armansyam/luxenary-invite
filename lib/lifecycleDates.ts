/**
 * Patokan tanggal dan jam retensi siklus hidup undangan.
 *
 * Seluruh jam dihitung dari AWAL HARI ACARA UTAMA (isPrimary; jika tidak ada, acara pertama yang
 * bertanggal) pada zona waktu acara itu sendiri (WIB +07:00, WITA +08:00, WIT +09:00). Hasilnya instan
 * absolut, sehingga perbandingan dengan waktu server benar tanpa bergantung zona server.
 *
 * Modul ini murni (tanpa impor server) agar dapat dipakai bersama oleh server dan halaman klien.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;

export type EventTimezone = "WIB" | "WITA" | "WIT";

const TIMEZONE_OFFSET: Record<EventTimezone, string> = {
  WIB: "+07:00",
  WITA: "+08:00",
  WIT: "+09:00",
};

export function getEventTimezoneOffset(timezone: EventTimezone): string {
  return TIMEZONE_OFFSET[timezone];
}

const TIMEZONE_IANA: Record<EventTimezone, string> = {
  WIB: "Asia/Jakarta",
  WITA: "Asia/Makassar",
  WIT: "Asia/Jayapura",
};

/** Zona waktu acara: field `timezone`, lalu label pada teks `time` ("... WITA"), default WIB. */
export function resolveEventTimezone(ev: { timezone?: unknown; time?: unknown } | null | undefined): EventTimezone {
  const explicit = typeof ev?.timezone === "string" ? ev.timezone.trim().toUpperCase() : "";
  if (explicit === "WITA" || explicit === "WIT" || explicit === "WIB") return explicit;
  const label = typeof ev?.time === "string" ? ev.time : "";
  if (/WITA/i.test(label)) return "WITA";
  if (/WIT/i.test(label)) return "WIT";
  return "WIB";
}

type EventLike = { date?: unknown; timezone?: unknown; time?: unknown; isPrimary?: unknown };

function parseEventList(eventData: unknown): EventLike[] {
  try {
    const parsed = typeof eventData === "string" ? JSON.parse(eventData) : eventData ?? [];
    const list = Array.isArray(parsed) ? parsed : (parsed as { events?: unknown } | null)?.events;
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

/** Awal hari (00:00) tanggal acara pada zona waktu acara; null bila tanggal bukan format YYYY-MM-DD. */
export function getEventDayStart(ev: EventLike | null | undefined): Date | null {
  const raw = typeof ev?.date === "string" ? ev.date.trim() : "";
  const day = raw.includes("T") ? raw.split("T")[0] : raw;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00${TIMEZONE_OFFSET[resolveEventTimezone(ev)]}`);
  return Number.isNaN(start.getTime()) ? null : start;
}

/**
 * Acara utama = jadwal terima tamu (isPrimary). Bila sesi itu belum bertanggal, hasilnya null: sesi lain tidak
 * diam-diam menjadi patokan. Undangan lama tanpa penanda memakai acara pertama yang bertanggal.
 */
export function getPrimaryEvent(eventData: unknown): EventLike | null {
  const list = parseEventList(eventData);
  const flagged = list.find((ev) => ev?.isPrimary === true);
  if (flagged) return getEventDayStart(flagged) !== null ? flagged : null;
  return list.find((ev) => getEventDayStart(ev) !== null) ?? null;
}

/** Patokan tunggal seluruh jam retensi: awal hari acara utama pada zona waktu acara. */
export function getPrimaryEventDate(eventData: unknown): Date | null {
  const ev = getPrimaryEvent(eventData);
  return ev ? getEventDayStart(ev) : null;
}

/** Tanggal kalender acara utama apa adanya (YYYY-MM-DD), untuk ditampilkan tanpa konversi zona. */
export function getPrimaryEventDateString(eventData: unknown): string | null {
  const ev = getPrimaryEvent(eventData);
  if (typeof ev?.date !== "string") return null;
  const raw = ev.date.trim();
  return raw.includes("T") ? raw.split("T")[0] : raw;
}

/** Tanggal acara utama untuk tampilan ("12 Desember 2026") tanpa pergeseran zona waktu peramban. */
export function formatPrimaryEventDate(eventData: unknown): string | null {
  const day = getPrimaryEventDateString(eventData);
  if (!day || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Zona waktu acara utama undangan (WIB bila tidak ada acara bertanggal). */
export function getPrimaryEventTimezone(eventData: unknown): EventTimezone {
  return resolveEventTimezone(getPrimaryEvent(eventData));
}

/** Format tanggal Indonesia pada zona waktu acara, bukan zona server. */
export function formatDateInEventTimezone(date: Date, timezone: EventTimezone): string {
  return date.toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: TIMEZONE_IANA[timezone] });
}

export interface LifecycleSettings {
  /** Hari sejak acara utama hingga subdomain dikembalikan ke pool (`subdomain_grace_days`). */
  subdomainGraceDays: number;
  /** Hari sejak acara utama hingga galeri tamu/memories dibersihkan (`retention_cleanup_days`). */
  galleryRetentionDays: number;
  /** Hari sejak acara utama undangan diamankan di arsip (`nas_archive_retention_days`). */
  archiveRetentionDays: number;
  /** Hari sejak acara utama custom domain klien tetap melayani slug (`retention_custom_domain_days`). */
  customDomainRetentionDays: number;
  /** Subdomain dilepas otomatis oleh cron dan rute publik (`subdomain_auto_recycle`). */
  autoRecycleSubdomain: boolean;
}

export const DEFAULT_LIFECYCLE_SETTINGS: LifecycleSettings = {
  subdomainGraceDays: 7,
  galleryRetentionDays: 30,
  archiveRetentionDays: 365,
  customDomainRetentionDays: 365,
  autoRecycleSubdomain: true,
};

/** Empat jam retensi tanpa sakelar auto-recycle; cukup untuk seluruh perhitungan tanggal. */
export type LifecycleDaySettings = Omit<LifecycleSettings, "autoRecycleSubdomain">;

/** Membaca objek pengaturan publik (`/api/public/settings`) menjadi jam retensi, bawaan bila tidak valid. */
export function lifecycleSettingsFromPublic(
  source: Partial<Record<keyof LifecycleDaySettings, unknown>> | null | undefined
): LifecycleDaySettings {
  const d = DEFAULT_LIFECYCLE_SETTINGS;
  const pick = (value: unknown, fallback: number) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
  };
  return {
    subdomainGraceDays: pick(source?.subdomainGraceDays, d.subdomainGraceDays),
    galleryRetentionDays: pick(source?.galleryRetentionDays, d.galleryRetentionDays),
    archiveRetentionDays: pick(source?.archiveRetentionDays, d.archiveRetentionDays),
    customDomainRetentionDays: pick(source?.customDomainRetentionDays, d.customDomainRetentionDays),
  };
}

function parseDays(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : fallback;
}

/** Satu-satunya parser pengaturan siklus hidup (server dan endpoint publik memakai fungsi ini). */
export function parseLifecycleSettings(map: Record<string, string | undefined>): LifecycleSettings {
  const d = DEFAULT_LIFECYCLE_SETTINGS;
  return {
    subdomainGraceDays: parseDays(map["subdomain_grace_days"], d.subdomainGraceDays),
    galleryRetentionDays: parseDays(map["retention_cleanup_days"], d.galleryRetentionDays),
    archiveRetentionDays: parseDays(map["nas_archive_retention_days"], d.archiveRetentionDays),
    customDomainRetentionDays: parseDays(map["retention_custom_domain_days"], d.customDomainRetentionDays),
    autoRecycleSubdomain: (map["subdomain_auto_recycle"] ?? "true") === "true",
  };
}

/** Label durasi untuk teks publik: 365 -> "1 tahun", 60 -> "2 bulan", 45 -> "45 hari". */
export function formatRetentionLabel(days: number): string {
  if (days >= 365 && days % 365 === 0) return `${days / 365} tahun`;
  if (days >= 30 && days % 30 === 0) return `${days / 30} bulan`;
  return `${days} hari`;
}

/**
 * Tenggat galeri baru setelah perpanjangan: `extraDays` ditambahkan di atas tenggat galeri yang berlaku
 * (bawaan atau hasil perpanjangan sebelumnya), atau dari `now` bila tenggat itu sudah lewat.
 * Satu-satunya rumus perpanjangan galeri untuk add-on klien, upgrade, dan aksi admin.
 */
export function extendGalleryExpiry(
  invitation: { eventData: unknown; galleryExpiresAt?: Date | string | null },
  extraDays: number,
  settings: LifecycleDaySettings,
  now: Date = new Date()
): Date {
  const current = computeLifecycleDates(invitation, settings)?.galleryExpiresAt ?? null;
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + extraDays * DAY_MS);
}

export interface LifecycleDates {
  eventDay: Date;
  eventFinishedAt: Date;
  subdomainReleaseAt: Date;
  galleryExpiresAt: Date;
  archiveExpiresAt: Date;
  customDomainExpiresAt: Date;
}

/**
 * Seluruh tenggat siklus hidup satu undangan. `galleryExpiresAt` kolom (hasil add-on perpanjangan)
 * menggantikan tenggat galeri bawaan. Null bila undangan belum memiliki tanggal acara valid.
 */
export function computeLifecycleDates(
  invitation: { eventData: unknown; galleryExpiresAt?: Date | string | null },
  settings: LifecycleDaySettings
): LifecycleDates | null {
  const eventDay = getPrimaryEventDate(invitation.eventData);
  if (!eventDay) return null;
  const after = (days: number) => new Date(eventDay.getTime() + days * DAY_MS);
  const extended = invitation.galleryExpiresAt ? new Date(invitation.galleryExpiresAt) : null;
  return {
    eventDay,
    eventFinishedAt: after(1),
    subdomainReleaseAt: after(settings.subdomainGraceDays),
    galleryExpiresAt: extended && !Number.isNaN(extended.getTime()) ? extended : after(settings.galleryRetentionDays),
    archiveExpiresAt: after(settings.archiveRetentionDays),
    customDomainExpiresAt: after(settings.customDomainRetentionDays),
  };
}
