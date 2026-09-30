import { describe, it, expect } from "vitest";
import {
  DAY_MS,
  DEFAULT_LIFECYCLE_SETTINGS,
  computeLifecycleDates,
  getEventDayStart,
  getPrimaryEvent,
  getPrimaryEventDate,
  parseLifecycleSettings,
  resolveEventTimezone,
} from "@/lib/lifecycleDates";

describe("resolveEventTimezone", () => {
  it("memakai field timezone (tanpa peka huruf)", () => {
    expect(resolveEventTimezone({ timezone: "WITA" })).toBe("WITA");
    expect(resolveEventTimezone({ timezone: "wit" })).toBe("WIT");
    expect(resolveEventTimezone({ timezone: " wib " })).toBe("WIB");
  });

  it("jatuh ke label pada teks time, WITA tidak salah terbaca WIT", () => {
    expect(resolveEventTimezone({ time: "09:00 - 13:00 WITA" })).toBe("WITA");
    expect(resolveEventTimezone({ time: "09:00 WIT" })).toBe("WIT");
    expect(resolveEventTimezone({ time: "09:00 WIB" })).toBe("WIB");
  });

  it("default WIB", () => {
    expect(resolveEventTimezone({})).toBe("WIB");
    expect(resolveEventTimezone(null)).toBe("WIB");
    expect(resolveEventTimezone({ timezone: "PST" })).toBe("WIB");
  });
});

describe("getEventDayStart", () => {
  it("awal hari pada zona acara, sebagai instan absolut", () => {
    expect(getEventDayStart({ date: "2026-12-12", timezone: "WIB" })?.toISOString()).toBe("2026-12-11T17:00:00.000Z");
    expect(getEventDayStart({ date: "2026-12-12", timezone: "WITA" })?.toISOString()).toBe("2026-12-11T16:00:00.000Z");
    expect(getEventDayStart({ date: "2026-12-12", timezone: "WIT" })?.toISOString()).toBe("2026-12-11T15:00:00.000Z");
  });

  it("menerima tanggal ISO bertanda T dengan memakai bagian tanggalnya", () => {
    expect(getEventDayStart({ date: "2026-12-12T10:00:00+07:00", timezone: "WIB" })?.toISOString()).toBe("2026-12-11T17:00:00.000Z");
  });

  it("format selain YYYY-MM-DD ditolak", () => {
    expect(getEventDayStart({ date: "12/12/2026" })).toBeNull();
    expect(getEventDayStart({ date: "" })).toBeNull();
    expect(getEventDayStart({})).toBeNull();
    expect(getEventDayStart(null)).toBeNull();
  });
});

describe("getPrimaryEventDate", () => {
  const events = [
    { title: "Akad", date: "2026-12-11", isPrimary: false },
    { title: "Resepsi", date: "2026-12-14", isPrimary: true },
    { title: "Ngunduh Mantu", date: "2026-12-20", isPrimary: false },
  ];

  it("memakai acara utama, bukan tanggal acara terakhir", () => {
    expect(getPrimaryEventDate(events)?.toISOString()).toBe("2026-12-13T17:00:00.000Z");
    expect(getPrimaryEventDate(JSON.stringify(events))?.toISOString()).toBe("2026-12-13T17:00:00.000Z");
  });

  it("tanpa penanda isPrimary memakai acara pertama yang bertanggal", () => {
    const noPrimary = [{ title: "Tanpa tanggal" }, { date: "2026-12-11" }, { date: "2026-12-14" }];
    expect(getPrimaryEvent(noPrimary)).toEqual({ date: "2026-12-11" });
    expect(getPrimaryEventDate(noPrimary)?.toISOString()).toBe("2026-12-10T17:00:00.000Z");
  });

  it("mendukung bentuk objek { events: [...] } dan menolak data rusak", () => {
    expect(getPrimaryEventDate({ events })?.toISOString()).toBe("2026-12-13T17:00:00.000Z");
    expect(getPrimaryEventDate("bukan json")).toBeNull();
    expect(getPrimaryEventDate([])).toBeNull();
    expect(getPrimaryEventDate(null)).toBeNull();
  });
});

describe("parseLifecycleSettings", () => {
  it("memakai bawaan bila kosong atau tidak valid", () => {
    expect(parseLifecycleSettings({})).toEqual(DEFAULT_LIFECYCLE_SETTINGS);
    expect(parseLifecycleSettings({ subdomain_grace_days: "abc", retention_cleanup_days: "0", nas_archive_retention_days: "-5" })).toEqual(
      DEFAULT_LIFECYCLE_SETTINGS
    );
  });

  it("membaca empat jam terpisah dan sakelar auto-recycle", () => {
    expect(
      parseLifecycleSettings({
        subdomain_grace_days: "10",
        retention_cleanup_days: "45",
        nas_archive_retention_days: "400",
        retention_custom_domain_days: "500",
        subdomain_auto_recycle: "false",
      })
    ).toEqual({
      subdomainGraceDays: 10,
      galleryRetentionDays: 45,
      archiveRetentionDays: 400,
      customDomainRetentionDays: 500,
      autoRecycleSubdomain: false,
    });
  });
});

describe("computeLifecycleDates", () => {
  const eventData = JSON.stringify([
    { date: "2026-12-10", isPrimary: false, timezone: "WIB" },
    { date: "2026-12-12", isPrimary: true, timezone: "WIT" },
  ]);

  it("menurunkan empat jam terpisah dari awal hari acara utama pada zona WIT", () => {
    const dates = computeLifecycleDates({ eventData }, DEFAULT_LIFECYCLE_SETTINGS)!;
    const day = new Date("2026-12-11T15:00:00.000Z");
    expect(dates.eventDay.toISOString()).toBe(day.toISOString());
    expect(dates.eventFinishedAt.getTime()).toBe(day.getTime() + 1 * DAY_MS);
    expect(dates.subdomainReleaseAt.getTime()).toBe(day.getTime() + 7 * DAY_MS);
    expect(dates.galleryExpiresAt.getTime()).toBe(day.getTime() + 30 * DAY_MS);
    expect(dates.archiveExpiresAt.getTime()).toBe(day.getTime() + 365 * DAY_MS);
    expect(dates.customDomainExpiresAt.getTime()).toBe(day.getTime() + 365 * DAY_MS);
  });

  it("aturan UTC lama menutup undangan WIT pukul 09.00 WIT di hari-H; aturan baru menunggu hari berikutnya", () => {
    const dates = computeLifecycleDates({ eventData }, DEFAULT_LIFECYCLE_SETTINGS)!;
    const oldUtcRule = new Date("2026-12-12");
    const hour = 60 * 60 * 1000;
    expect(oldUtcRule.getTime() - dates.eventDay.getTime()).toBe(9 * hour);
    expect(dates.eventFinishedAt.getTime() - oldUtcRule.getTime()).toBe(15 * hour);
  });

  it("galleryExpiresAt hasil perpanjangan menggantikan tenggat galeri bawaan saja", () => {
    const extended = new Date("2027-03-01T00:00:00.000Z");
    const dates = computeLifecycleDates({ eventData, galleryExpiresAt: extended }, DEFAULT_LIFECYCLE_SETTINGS)!;
    expect(dates.galleryExpiresAt.toISOString()).toBe(extended.toISOString());
    expect(dates.subdomainReleaseAt.getTime()).toBe(dates.eventDay.getTime() + 7 * DAY_MS);
    expect(dates.archiveExpiresAt.getTime()).toBe(dates.eventDay.getTime() + 365 * DAY_MS);
  });

  it("null bila tidak ada tanggal acara valid", () => {
    expect(computeLifecycleDates({ eventData: "[]" }, DEFAULT_LIFECYCLE_SETTINGS)).toBeNull();
    expect(computeLifecycleDates({ eventData: null }, DEFAULT_LIFECYCLE_SETTINGS)).toBeNull();
  });
});
