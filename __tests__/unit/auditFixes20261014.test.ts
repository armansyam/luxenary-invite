/**
 * Regresi audit 14 Okt 2026 (tanpa DB): pagar jalur berkas, URL media, sel CSV, cookie sesi remote, periode
 * keuangan WIB, tenggat galeri, dan jadwal sesi kamera tamu.
 */
import path from "path";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { isInvitationOwnedUpload, resolveLocalUploadPath } from "@/lib/storage";
import { safeMediaUrl } from "@/lib/safeUrl";
import { csvCell } from "@/lib/csv";
import { createRemoteCookieValue, readRemoteClientId } from "@/lib/remoteSession";
import { wibDateKey, wibDayStart, wibMonthStart } from "@/lib/financePeriods";
import { DAY_MS, DEFAULT_LIFECYCLE_SETTINGS, computeLifecycleDates, extendGalleryExpiry } from "@/lib/lifecycleDates";
import { getMemoriesActiveSchedule } from "@/lib/domainUtils";

const uploadsRoot = path.join(process.cwd(), "public", "uploads");

describe("resolveLocalUploadPath", () => {
  it("menerima berkas di dalam public/uploads", () => {
    expect(resolveLocalUploadPath("/uploads/invitations/abc/cover.webp?t=1")).toBe(path.join(uploadsRoot, "invitations", "abc", "cover.webp"));
  });

  it("menolak jalur yang keluar dari public/uploads, termasuk yang di-encode", () => {
    expect(resolveLocalUploadPath("/uploads/../../.env")).toBeNull();
    expect(resolveLocalUploadPath("/uploads/..%2F..%2F.env")).toBeNull();
    expect(resolveLocalUploadPath("/uploads/%E0%A4%A")).toBeNull();
    expect(resolveLocalUploadPath("/other/file.webp")).toBeNull();
  });
});

describe("isInvitationOwnedUpload", () => {
  it("hanya berkas di folder undangan itu sendiri", () => {
    expect(isInvitationOwnedUpload("/uploads/invitations/inv-a/cover.webp", "inv-a")).toBe(true);
    expect(isInvitationOwnedUpload("/uploads/invitations/inv-b/cover.webp", "inv-a")).toBe(false);
    expect(isInvitationOwnedUpload("/uploads/invitations/inv-a/../inv-b/cover.webp", "inv-a")).toBe(false);
    expect(isInvitationOwnedUpload("https://drive.google.com/file/d/x/view", "inv-a")).toBe(false);
  });
});

describe("safeMediaUrl", () => {
  it("menerima unggahan lokal dan https, menolak traversal dan skema berbahaya", () => {
    expect(safeMediaUrl("/uploads/invitations/a/cover.webp?t=1")).toBe("/uploads/invitations/a/cover.webp?t=1");
    expect(safeMediaUrl("https://cdn.example.com/a.webp")).toBe("https://cdn.example.com/a.webp");
    expect(safeMediaUrl("/uploads/../../.env")).toBe("");
    expect(safeMediaUrl("javascript:alert(1)")).toBe("");
  });
});

describe("csvCell", () => {
  it("menetralkan formula dan menggandakan tanda kutip", () => {
    expect(csvCell("=HYPERLINK(\"x\")")).toBe(`"'=HYPERLINK(""x"")"`);
    expect(csvCell("+62812")).toBe(`"'+62812"`);
    expect(csvCell("@SUM(A1)")).toBe(`"'@SUM(A1)"`);
    expect(csvCell("Budi")).toBe(`"Budi"`);
    expect(csvCell(null)).toBe(`""`);
  });
});

describe("cookie sesi remote", () => {
  const savedAuthSecret = process.env.AUTH_SECRET;
  beforeAll(() => {
    process.env.AUTH_SECRET = "vitest-remote-session-secret";
  });
  afterAll(() => {
    if (savedAuthSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = savedAuthSecret;
  });

  it("hanya sah untuk admin yang menandatanganinya dan sebelum kedaluwarsa", () => {
    const value = createRemoteCookieValue("client-1", "admin-1", 1_000);
    expect(readRemoteClientId(value, "admin-1", 2_000)).toBe("client-1");
    expect(readRemoteClientId(value, "admin-2", 2_000)).toBeNull();
    expect(readRemoteClientId(value, "admin-1", 1_000 + 3_600_001)).toBeNull();
  });

  it("nilai tulis tangan tanpa tanda tangan ditolak", () => {
    expect(readRemoteClientId("client-1", "admin-1")).toBeNull();
    expect(readRemoteClientId(`client-2.${Date.now() + 60_000}.deadbeef`, "admin-1")).toBeNull();
  });
});

describe("periode keuangan WIB", () => {
  it("awal bulan dan hari mengikuti 00.00 WIB", () => {
    expect(wibMonthStart(2026, 9).toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(wibMonthStart(2026, 12).toISOString()).toBe("2026-12-31T17:00:00.000Z");
    expect(wibDayStart(new Date("2026-10-31T18:30:00Z")).toISOString()).toBe("2026-10-31T17:00:00.000Z");
    expect(wibDateKey(new Date("2026-10-31T18:30:00Z"))).toBe("2026-11-01");
  });
});

describe("tenggat galeri", () => {
  const event = [{ date: "2027-01-15", isPrimary: true, timezone: "WIB" }];

  it("tenggat tersimpan yang lebih awal dari bawaan tidak memendekkan masa galeri", () => {
    const early = extendGalleryExpiry({ eventData: [] }, 30, DEFAULT_LIFECYCLE_SETTINGS, new Date("2026-10-14T03:00:00Z"));
    const dates = computeLifecycleDates({ eventData: event, galleryExpiresAt: early }, DEFAULT_LIFECYCLE_SETTINGS)!;
    expect(dates.galleryExpiresAt.getTime()).toBe(dates.eventDay.getTime() + DEFAULT_LIFECYCLE_SETTINGS.galleryRetentionDays * DAY_MS);
    expect(dates.galleryExpiresAt > dates.eventFinishedAt).toBe(true);
  });

  it("perpanjangan yang lebih lambat tetap berlaku", () => {
    const later = new Date("2027-04-01T00:00:00Z");
    expect(computeLifecycleDates({ eventData: event, galleryExpiresAt: later }, DEFAULT_LIFECYCLE_SETTINGS)!.galleryExpiresAt).toEqual(later);
  });
});

describe("jadwal sesi kamera tamu", () => {
  const eventData = [{ date: "2099-05-10", isPrimary: true, timezone: "WITA" }];
  const featureSettings = {
    memoriesSessions: [
      { id: "resepsi", name: "Resepsi", date: "2099-05-10", startTime: "19:00", endTime: "22:00", allocatedQuota: 100 },
      { id: "akad", name: "Akad", date: "2099-05-10", startTime: "08:00", endTime: "10:00", allocatedQuota: 50 },
    ],
  };

  it("sesi tanpa zona waktu memakai zona waktu acara utama, dan daftar sesi kronologis", () => {
    const schedule = getMemoriesActiveSchedule(featureSettings, eventData);
    expect(schedule.sessions.map((s) => s.id)).toEqual(["akad", "resepsi"]);
    expect(schedule.sessions.every((s) => s.timezone === "WITA")).toBe(true);
    expect(schedule.startTime?.toISOString()).toBe("2099-05-10T00:00:00.000Z");
    expect(schedule.nextSession?.id).toBe("akad");
  });
});
