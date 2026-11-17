import { describe, it, expect } from "vitest";
import { demoEventDate, buildDemoInvitation } from "@/lib/demoInvitation";

const NOW = new Date("2026-11-17T09:00:00Z");
const weekday = (iso: string) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const daysFromNow = (iso: string) => Math.round((Date.parse(`${iso}T00:00:00Z`) - Date.UTC(2026, 10, 17)) / 86_400_000);

describe("demoEventDate", () => {
  it("memakai tanggal tersimpan yang masih lebih dari 21 hari ke depan", () => {
    expect(demoEventDate("2026-12-26", NOW)).toBe("2026-12-26");
    expect(demoEventDate("2026-12-08", NOW)).toBe("2026-12-08");
  });

  it("menggeser tanggal yang sudah lewat ke hari yang sama dalam pekan, 60–66 hari ke depan", () => {
    const rolled = demoEventDate("2026-11-14", NOW); // Sabtu, demo Kalandra
    expect(weekday(rolled)).toBe(6);
    expect(daysFromNow(rolled)).toBeGreaterThanOrEqual(60);
    expect(daysFromNow(rolled)).toBeLessThanOrEqual(66);
    expect(rolled).toBe("2027-01-16");
  });

  it("menggeser tanggal yang kurang dari 21 hari ke depan", () => {
    const rolled = demoEventDate("2026-11-28", NOW); // Sabtu, 11 hari lagi
    expect(weekday(rolled)).toBe(6);
    expect(daysFromNow(rolled)).toBeGreaterThanOrEqual(60);
  });

  it("mempertahankan hari Minggu dan hari kerja", () => {
    expect(weekday(demoEventDate("2026-10-18", NOW))).toBe(0);
    expect(weekday(demoEventDate("2026-11-10", NOW))).toBe(2);
  });

  it("melewati pergantian tahun dan tahun kabisat dengan benar", () => {
    const rolled = demoEventDate("2027-12-30", new Date("2027-12-29T12:00:00Z")); // Kamis
    expect(weekday(rolled)).toBe(4);
    expect(rolled.startsWith("2028-02") || rolled.startsWith("2028-03")).toBe(true);
  });

  it("membiarkan tanggal kosong atau tidak terbaca", () => {
    expect(demoEventDate("", NOW)).toBe("");
    expect(demoEventDate("bukan tanggal", NOW)).toBe("bukan tanggal");
  });
});

describe("buildDemoInvitation", () => {
  it("tanggal semua sesi acara demo tidak pernah di masa lalu", () => {
    const inv = buildDemoInvitation("kalandra", { targetDate: "2026-11-14T08:00:00" });
    const today = new Date().toISOString().slice(0, 10);
    expect(inv.eventData.length).toBeGreaterThan(0);
    for (const ev of inv.eventData) expect(ev.date > today).toBe(true);
  });
});
