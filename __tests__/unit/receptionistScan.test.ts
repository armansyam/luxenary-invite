import { describe, it, expect } from "vitest";
import {
  isWalkInGuest,
  mergeServerGuests,
  nextDuplicateName,
  resolveScan,
  syncTokenFor,
  type ScanGuest,
} from "@/lib/receptionistScan";
import { buildCheckinPayload } from "@/lib/checkinQr";

const INV = "inv-1";
const OTHER_INV = "inv-2";

const guest = (over: Partial<ScanGuest> & { id: string; name: string }): ScanGuest => ({
  category: "UMUM",
  guestQuota: 1,
  tableNumber: null,
  qrToken: `tok-${over.id}`,
  isTokenRedeemed: false,
  ...over,
});

const list = [
  guest({ id: "1", name: "Ani Terdaftar", category: "VIP" }),
  guest({ id: "2", name: "Budi Santoso" }),
  guest({ id: "3", name: "Budi Santoso Putra" }),
];

describe("resolveScan: QR berformat LUX", () => {
  it("tamu terdaftar dicocokkan lewat nama, tanpa membedakan huruf besar/kecil dan spasi", () => {
    const r = resolveScan(buildCheckinPayload(INV, "  ani   TERDAFTAR "), list, INV);
    expect(r).toMatchObject({ kind: "match", guest: { id: "1" } });
  });

  it("nama yang tidak ada di daftar menjadi tamu umum, bukan penolakan", () => {
    expect(resolveScan(buildCheckinPayload(INV, "Tamu Dari Link Manual"), list, INV)).toEqual({ kind: "walkin", name: "Tamu Dari Link Manual" });
  });

  it("QR acara lain ditolak", () => {
    expect(resolveScan(buildCheckinPayload(OTHER_INV, "Ani Terdaftar"), list, INV)).toEqual({ kind: "wrong-event" });
  });

  it("payload tanpa nama tidak valid", () => {
    expect(resolveScan(`LUX|${INV}|`, list, INV)).toEqual({ kind: "invalid" });
  });

  it("nama persis menang atas nama yang mengandungnya (tidak salah orang)", () => {
    const reversed = [list[2], list[1]];
    expect(resolveScan(buildCheckinPayload(INV, "Budi Santoso"), reversed, INV)).toMatchObject({ kind: "match", guest: { id: "2" } });
  });

  it("tamu umum yang sudah tercatat di perangkat dikenali pada pemindaian berikutnya", () => {
    const walkIn = guest({ id: "local-9", name: "Tamu Dari Link Manual", qrToken: buildCheckinPayload(INV, "Tamu Dari Link Manual"), isTokenRedeemed: true });
    expect(resolveScan(buildCheckinPayload(INV, "Tamu Dari Link Manual"), [walkIn, ...list], INV)).toMatchObject({ kind: "match", guest: { id: "local-9" } });
  });
});

describe("resolveScan: teks yang diketik atau token tamu", () => {
  it("token tamu terdaftar", () => {
    expect(resolveScan("tok-2", list, INV)).toMatchObject({ kind: "match", guest: { id: "2" } });
  });

  it("nama persis", () => {
    expect(resolveScan("budi santoso", list, INV)).toMatchObject({ kind: "match", guest: { id: "2" } });
  });

  it("sebagian nama yang cocok dengan satu tamu", () => {
    expect(resolveScan("Ani", list, INV)).toMatchObject({ kind: "match", guest: { id: "1" } });
  });

  it("sebagian nama yang cocok dengan beberapa tamu tidak dipilihkan sembarang", () => {
    expect(resolveScan("Budi S", list, INV)).toMatchObject({ kind: "ambiguous", names: ["Budi Santoso", "Budi Santoso Putra"] });
  });

  it("nama yang tidak ada diminta konfirmasi sebagai tamu umum", () => {
    expect(resolveScan("Siti Baru", list, INV)).toEqual({ kind: "unknown", name: "Siti Baru" });
  });
});

describe("tamu umum tambahan (nama kembar)", () => {
  it("diberi nomor urut", () => {
    expect(nextDuplicateName("Budi Santoso", list)).toBe("Budi Santoso (3)");
    expect(nextDuplicateName("Ani Terdaftar", list)).toBe("Ani Terdaftar (2)");
    expect(nextDuplicateName("Siti", [])).toBe("Siti (1)");
  });
});

describe("sinkronisasi", () => {
  it("tamu terdaftar memakai tokennya; tamu umum memakai payload LUX", () => {
    expect(syncTokenFor(list[0], INV)).toBe("tok-1");
    expect(syncTokenFor(guest({ id: "local-1", name: "Tamu Umum", qrToken: null }), INV)).toBe(buildCheckinPayload(INV, "Tamu Umum"));
  });

  it("mengenali tamu umum", () => {
    expect(isWalkInGuest(guest({ id: "local-1", name: "x", qrToken: null }))).toBe(true);
    expect(isWalkInGuest(guest({ id: "u", name: "x", qrToken: "OTS-inv-1-123" }))).toBe(true);
    expect(isWalkInGuest(guest({ id: "u", name: "x", qrToken: "LUX|inv-1|x" }))).toBe(true);
    expect(isWalkInGuest(guest({ id: "u", name: "x", qrToken: "uuid-biasa" }))).toBe(false);
  });
});

describe("mergeServerGuests", () => {
  it("status hadir lokal yang belum tersinkron dipertahankan", () => {
    const server = [guest({ id: "1", name: "Ani Terdaftar" })];
    const local = [guest({ id: "1", name: "Ani Terdaftar", isTokenRedeemed: true })];
    expect(mergeServerGuests(server, local, ["1"])[0].isTokenRedeemed).toBe(true);
  });

  it("tamu umum yang masih mengantre tidak hilang saat daftar dimuat ulang dari server", () => {
    const server = [guest({ id: "1", name: "Ani Terdaftar" })];
    const walkIn = guest({ id: "local-1", name: "Tamu Umum", qrToken: "LUX|inv-1|Tamu Umum", isTokenRedeemed: true });
    const merged = mergeServerGuests(server, [walkIn, ...server], ["local-1"]);
    expect(merged.map((g) => g.id)).toEqual(["local-1", "1"]);
  });

  it("tamu umum yang sudah tersinkron (tidak mengantre) digantikan versi server, tanpa dobel", () => {
    const serverWalkIn = guest({ id: "srv-9", name: "Tamu Umum", qrToken: "OTS-inv-1-9", isTokenRedeemed: true });
    const localWalkIn = guest({ id: "local-1", name: "Tamu Umum", qrToken: "LUX|inv-1|Tamu Umum", isTokenRedeemed: true });
    const merged = mergeServerGuests([serverWalkIn], [localWalkIn], []);
    expect(merged).toEqual([serverWalkIn]);
  });

  it("status hadir dari server tidak diturunkan", () => {
    const server = [guest({ id: "1", name: "Ani", isTokenRedeemed: true })];
    expect(mergeServerGuests(server, [guest({ id: "1", name: "Ani" })], [])[0].isTokenRedeemed).toBe(true);
  });
});
