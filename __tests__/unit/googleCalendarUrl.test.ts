import { describe, it, expect } from "vitest";
import { buildGoogleCalendarUrl } from "@/lib/invitationUtils";

const datesOf = (url: string) => new URL(url).searchParams.get("dates");

describe("buildGoogleCalendarUrl", () => {
  it("mengubah jam lokal WIB/WITA/WIT ke UTC dengan jam selesai sesi", () => {
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-01-10", startTime: "19:00", endTime: "22:00", timezone: "WITA" }, "R", ""))).toBe(
      "20990110T110000Z/20990110T140000Z"
    );
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-01-10", startTime: "10:00", endTime: "12:30", timezone: "WIB" }, "R", ""))).toBe(
      "20990110T030000Z/20990110T053000Z"
    );
    // WIT pagi jatuh di hari sebelumnya dalam UTC.
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-01-10", startTime: "08:00", timezone: "WIT" }, "R", ""))).toBe(
      "20990109T230000Z/20990110T020000Z"
    );
  });

  it("membaca jam dan zona dari teks time, durasi bawaan 3 jam, dan acara lewat tengah malam", () => {
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-01-10", time: "19.00 – 22.00 WITA" }, "R", ""))).toBe("20990110T110000Z/20990110T140000Z");
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-01-10", startTime: "10:00" }, "R", ""))).toBe("20990110T030000Z/20990110T060000Z");
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-01-10", startTime: "20:00", endTime: "01:00", timezone: "WIB" }, "R", ""))).toBe(
      "20990110T130000Z/20990110T180000Z"
    );
  });

  it("tanpa jam menjadi acara sehari penuh; tanggal tidak sah menghasilkan kosong", () => {
    expect(datesOf(buildGoogleCalendarUrl({ date: "2099-12-31" }, "R", ""))).toBe("20991231/21000101");
    expect(buildGoogleCalendarUrl({ date: "" }, "R", "")).toBe("");
    expect(buildGoogleCalendarUrl({ date: "10 Januari 2099" }, "R", "")).toBe("");
  });

  it("judul dan lokasi di-encode", () => {
    const url = new URL(buildGoogleCalendarUrl({ date: "2099-01-10", startTime: "19:00" }, "The Wedding of A & B", "Gedung #1, Makassar"));
    expect(url.searchParams.get("text")).toBe("The Wedding of A & B");
    expect(url.searchParams.get("location")).toBe("Gedung #1, Makassar");
  });
});
