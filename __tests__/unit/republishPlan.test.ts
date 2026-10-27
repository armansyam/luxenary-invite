/**
 * Rencana terbit ulang undangan: hanya PUBLISHED yang tidak terkunci permanen dan acaranya masih cukup jauh.
 */
import { describe, it, expect } from "vitest";
import { planRepublish } from "@/lib/republishPlan";

const NOW = new Date("2026-10-27T03:00:00Z");
const day = (offset: number) => new Date(NOW.getTime() + offset * 86_400_000).toISOString().slice(0, 10);
const inv = (id: string, over: Record<string, unknown> = {}) => ({
  id,
  status: "PUBLISHED",
  isLockedPermanently: false,
  eventData: [{ title: "Resepsi", date: day(30), time: "10.00 WITA", isPrimary: true }],
  ...over,
});

describe("planRepublish", () => {
  it("memilih undangan terbit dengan acara >= 7 hari lagi", () => {
    const plan = planRepublish([inv("a"), inv("b", { eventData: [{ title: "Resepsi", date: day(8), isPrimary: true }] })], NOW, 7);
    expect(plan.eligible).toEqual(["a", "b"]);
    expect(plan.skipped).toEqual([]);
  });

  it("melewati acara yang dekat, sudah lewat, tanpa tanggal, bukan PUBLISHED, atau terkunci permanen, dengan alasan", () => {
    const plan = planRepublish(
      [
        inv("dekat", { eventData: [{ title: "Resepsi", date: day(3), isPrimary: true }] }),
        inv("lewat", { eventData: [{ title: "Resepsi", date: day(-2), isPrimary: true }] }),
        inv("tanpa-tanggal", { eventData: [{ title: "Resepsi", isPrimary: true }] }),
        inv("draf", { status: "DRAFT" }),
        inv("arsip", { status: "ARCHIVED" }),
        inv("terkunci", { isLockedPermanently: true }),
        inv("ok"),
      ],
      NOW,
      7,
    );
    expect(plan.eligible).toEqual(["ok"]);
    expect(Object.fromEntries(plan.skipped.map((s) => [s.id, s.reason]))).toEqual({
      dekat: "acara kurang dari 7 hari lagi atau sudah lewat",
      lewat: "acara kurang dari 7 hari lagi atau sudah lewat",
      "tanpa-tanggal": "tanpa tanggal acara",
      draf: "status DRAFT",
      arsip: "status ARCHIVED",
      terkunci: "terkunci permanen",
    });
  });

  it("ambang --min-days dihormati", () => {
    const rows = [inv("a", { eventData: [{ title: "Resepsi", date: day(10), isPrimary: true }] })];
    expect(planRepublish(rows, NOW, 14).eligible).toEqual([]);
    expect(planRepublish(rows, NOW, 7).eligible).toEqual(["a"]);
  });
});
