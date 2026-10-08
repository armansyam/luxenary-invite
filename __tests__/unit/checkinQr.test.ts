import { describe, it, expect } from "vitest";
import {
  SANITIZE_GUEST_LABEL_JS,
  buildCheckinPayload,
  buildCheckinQrBaseUrl,
  buildCheckinQrUrl,
  firstLetter,
  normalizeQrMark,
  parseCheckinPayload,
  qrInitials,
  sanitizeGuestLabel,
} from "@/lib/checkinQr";

const INV = "afef09d3-de6c-49ac-9766-704f7cd727dc";

describe("payload QR check-in", () => {
  it("membangun dan membaca LUX|id undangan|nama", () => {
    const payload = buildCheckinPayload(INV, "Budi Santoso");
    expect(payload).toBe(`LUX|${INV}|Budi Santoso`);
    expect(parseCheckinPayload(payload)).toEqual({ invitationId: INV, name: "Budi Santoso", category: "" });
  });

  it("kategori opsional ikut dibawa", () => {
    expect(parseCheckinPayload(buildCheckinPayload(INV, "Ani", "VIP"))).toMatchObject({ name: "Ani", category: "VIP" });
  });

  it("tanda | dan karakter kontrol di nama tidak memecah format", () => {
    const payload = buildCheckinPayload(INV, "Bud|i\n\tSantoso|VIP");
    expect(payload.split("|")).toHaveLength(3);
    expect(parseCheckinPayload(payload)?.name).toBe("Bud i Santoso VIP");
  });

  it("bukan payload LUX bila awalannya berbeda", () => {
    expect(parseCheckinPayload("Budi Santoso")).toBeNull();
    expect(parseCheckinPayload("OTS-abc")).toBeNull();
  });

  it("nama dipotong 100 karakter", () => {
    expect(sanitizeGuestLabel("x".repeat(500))).toHaveLength(100);
  });

  it("sanitasi di skrip inline halaman undangan identik dengan versi TypeScript", () => {
    const inline = new Function(`return (${SANITIZE_GUEST_LABEL_JS});`)() as (s: unknown) => string;
    for (const sample of ["Budi", "  Bud|i   Santoso  ", "a\u0000b\u001fc", "Syâmil & Keluarga", "|||", "", "x".repeat(300), null, undefined, 42]) {
      expect(inline(sample)).toBe(sanitizeGuestLabel(sample));
    }
  });
});

describe("inisial di tengah QR", () => {
  it("firstLetter mengambil huruf atau angka pertama, kapital", () => {
    expect(firstLetter("raka")).toBe("R");
    expect(firstLetter("  ...ayu")).toBe("A");
    expect(firstLetter("")).toBe("");
    expect(firstLetter("!!!")).toBe("");
  });

  it("normalizeQrMark dibatasi 2 karakter huruf/angka", () => {
    expect(normalizeQrMark("rdx")).toBe("RD");
    expect(normalizeQrMark("r & d")).toBe("RD");
    expect(normalizeQrMark("<b>")).toBe("B");
    expect(normalizeQrMark(undefined)).toBe("");
  });

  it("pernikahan: 2 huruf, urutan mengikuti tampilan undangan", () => {
    const base = { eventType: "WEDDING", groomName: "Raka Putra", groomNickname: "Raka", brideName: "Dewi Ayu", brideNickname: "Dewi" };
    expect(qrInitials(base)).toBe("RD");
    expect(qrInitials({ ...base, featureSettings: JSON.stringify({ displayOrder: "BRIDE_FIRST" }) })).toBe("DR");
    expect(qrInitials({ ...base, featureSettings: { displayOrder: "GROOM_FIRST" } })).toBe("RD");
  });

  it("pernikahan tanpa panggilan memakai nama lengkap; satu nama saja jadi 1 huruf", () => {
    expect(qrInitials({ eventType: "WEDDING", groomName: "Raka Putra", brideName: "Dewi Ayu" })).toBe("RD");
    expect(qrInitials({ eventType: "WEDDING", groomName: "Raka Putra" })).toBe("R");
    expect(qrInitials({ eventType: "WEDDING" })).toBe("");
  });

  it("eventType kosong dianggap pernikahan", () => {
    expect(qrInitials({ groomName: "Raka", brideName: "Dewi" })).toBe("RD");
  });

  it("acara tunggal: 1 huruf dari nama utama", () => {
    const p = (obj: object) => JSON.stringify(obj);
    expect(qrInitials({ eventType: "BIRTHDAY", participantsJson: p({ person: { nickname: "Rani", name: "Rani Kartika" } }) })).toBe("R");
    expect(qrInitials({ eventType: "WISUDA", participantsJson: p({ person: { name: "Fajar" } }) })).toBe("F");
    expect(qrInitials({ eventType: "KHITAN", participantsJson: p({ child: { nickname: "Umar" } }) })).toBe("U");
    expect(qrInitials({ eventType: "AQIQAH", participantsJson: p({ baby: { nickname: "Zahra" } }) })).toBe("Z");
    expect(qrInitials({ eventType: "GATHERING", participantsJson: p({ event: { title: "Syukuran Kantor" } }) })).toBe("S");
  });

  it("acara tunggal tanpa data peserta tidak menghasilkan inisial", () => {
    expect(qrInitials({ eventType: "BIRTHDAY", participantsJson: null })).toBe("");
    expect(qrInitials({ eventType: "KHITAN", participantsJson: "bukan json" })).toBe("");
  });
});

describe("URL gambar QR check-in", () => {
  it("awalan memuat id undangan dan inisial; nama ditambahkan di belakang", () => {
    const base = buildCheckinQrBaseUrl(INV, "RD");
    expect(base).toBe(`/api/public/qr?size=160&mark=RD&data=${encodeURIComponent(`LUX|${INV}|`)}`);
    expect(buildCheckinQrUrl(INV, "Budi Santoso", "RD")).toBe(base + encodeURIComponent("Budi Santoso"));
  });

  it("tanpa inisial, parameter mark tidak ada", () => {
    expect(buildCheckinQrBaseUrl(INV, "")).not.toContain("mark=");
  });

  it("URL yang dirangkai dapat dibaca kembali menjadi payload yang sama", () => {
    const url = new URL(buildCheckinQrUrl(INV, "Syâmil & Keluarga", "SK"), "http://localhost");
    expect(url.searchParams.get("data")).toBe(`LUX|${INV}|Syâmil & Keluarga`);
    expect(url.searchParams.get("mark")).toBe("SK");
  });
});
