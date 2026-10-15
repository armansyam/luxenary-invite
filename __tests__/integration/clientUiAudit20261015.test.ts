/**
 * Regresi audit UI klien 15 Okt 2026: layar pembuka kamera tamu tanpa foto sampul tidak memakai foto pasangan demo,
 * modal add-on menampilkan harga paket dari pengaturan (sumber yang sama dengan tagihan checkout-bundle), dan sampul
 * yang disimpan lewat PATCH undangan umum disaring seperti di rute Momen.
 */
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, it, expect, vi, afterAll } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn() }) }));

let sessionUser: Record<string, unknown> | null = null;
vi.mock("@/auth", () => ({ auth: vi.fn(async () => (sessionUser ? { user: sessionUser } : null)) }));

import GuestMomentOpening from "@/app/components/features/GuestMomentOpening";
import UnifiedAddonModal from "@/components/client/UnifiedAddonModal";
import { wrapCanvasText } from "@/components/client/PrintableQRCardModal";
import { AUDIT_ACTION_OPTIONS } from "@/components/admin/AdminMonitoringTab";
import { toDateTimeLocalValue } from "@/components/admin/AdminMarketingTab";
import fs from "fs";
import path from "path";
import { getPublicPlatformSettings } from "@/lib/settings";
import { formatRetentionLabel } from "@/lib/lifecycleDates";
import { mergeFeatureSettingsInput } from "@/lib/featureSettings";
import { prisma, pool } from "@/lib/prisma";
import { PATCH as patchInvitation, PUT as putInvitation } from "@/app/api/client/invitations/[id]/route";
import { waPresets } from "@/lib/waPresets";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const RUN = `vitest_clientui_${Date.now()}`;
const created = { userId: "", orderId: "", invitationId: "" };

describe("layar pembuka kamera tamu", () => {
  it("tanpa foto sampul tidak menampilkan foto pasangan demo di ketiga gaya", () => {
    for (const layoutId of ["editorial_showcase", "cinematic_hero", "polaroid_nostalgia"] as const) {
      const html = renderToStaticMarkup(
        createElement(GuestMomentOpening, { coupleName: "Raka & Sinta", layoutId, backUrl: "/raka", galleryUrl: "/raka/memories", onStartCamera: () => {} }),
      );
      expect(html).not.toContain("/demo/");
      expect(html).not.toContain("<img");
    }
  });

  it("foto sampul klien tetap ditampilkan", () => {
    const html = renderToStaticMarkup(
      createElement(GuestMomentOpening, { coupleName: "Raka & Sinta", coverUrl: "/uploads/raka/cover.webp", backUrl: "/raka", galleryUrl: "/raka/memories", onStartCamera: () => {} }),
    );
    expect(html).toContain('src="/uploads/raka/cover.webp"');
  });
});

describe("modal upgrade & add-on", () => {
  it("harga dan nama paket diambil dari pengaturan, bukan angka bawaan", () => {
    const packages = [
      { id: "TIER_1", name: "Dasar", price: 120000, desc: "Paket dasar", features: [], capabilities: [], themes: [], color: "amber" },
      { id: "TIER_2", name: "Menengah", price: 195000, desc: "Kamera tamu 300 foto", features: [], capabilities: [], themes: [], color: "slate" },
      { id: "TIER_3", name: "Lengkap", price: 310000, desc: "Domain pribadi", features: [], capabilities: [], themes: [], color: "purple" },
    ] as const;
    const html = renderToStaticMarkup(
      createElement(UnifiedAddonModal, {
        isOpen: true,
        onClose: () => {},
        invitationId: "inv",
        currentPlan: "TIER_1",
        currentQuota: 0,
        pricingSettings: {
          packages: packages as any,
          galleryExtensionPricePerMonth: 50000,
          addonMemoriesTopupPrice: 35000,
          addonMemoriesTopupPhotos: 100,
          addonMemoriesTopupEnabled: true,
        },
      }),
    );
    expect(html).toContain("Naik ke Menengah");
    expect(html).toContain("+Rp 75.000");
    expect(html).toContain("Naik ke Lengkap");
    expect(html).toContain("+Rp 190.000");
    expect(html).toContain("Kamera tamu 300 foto");
    expect(html).not.toContain("Kuota 200 Foto");
    expect(html).not.toContain("Serenade");
  });
});

describe.skipIf(!IS_TEST_DB)("subjudul harga beranda", () => {
  it("masa simpan dirender dari pengaturan, bukan angka mati", async () => {
    const s = await getPublicPlatformSettings();
    expect(s.pricingSubtitle).not.toContain("{{");
    expect(s.pricingSubtitle).toContain(formatRetentionLabel(s.galleryRetentionDays));
    expect(s.pricingSubtitle).toContain(formatRetentionLabel(s.archiveRetentionDays));
  });
});

describe("filter audit staf", () => {
  it("setiap pilihan filter adalah aksi yang benar-benar ditulis kode ke admin_audit_logs", () => {
    const sources: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !full.endsWith("AdminMonitoringTab.tsx")) sources.push(fs.readFileSync(full, "utf-8"));
      }
    };
    walk(path.join(process.cwd(), "app"));
    walk(path.join(process.cwd(), "lib"));
    sources.push(fs.readFileSync(path.join(process.cwd(), "auth.ts"), "utf-8"));
    const corpus = sources.join("\n");
    const missing = AUDIT_ACTION_OPTIONS.map(([value]) => value).filter((value) => !corpus.includes(`"${value}"`));
    expect(missing).toEqual([]);
  });
});

describe("masa berlaku kupon promo", () => {
  it("membuka lalu menyimpan ulang kupon tidak menggeser jam berlaku", () => {
    const previousTz = process.env.TZ;
    process.env.TZ = "Asia/Jakarta";
    try {
      const stored = new Date("2026-10-20T10:00").toISOString();
      expect(stored).toBe("2026-10-20T03:00:00.000Z");
      const formValue = toDateTimeLocalValue(stored);
      expect(formValue).toBe("2026-10-20T10:00");
      expect(new Date(formValue).toISOString()).toBe(stored);
    } finally {
      process.env.TZ = previousTz;
    }
  });

  it("form kupon tidak lagi memakai nama paket bawaan yang tertanam", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "components/admin/AdminMarketingTab.tsx"), "utf-8");
    for (const name of ["Serenade", "Symphony", "Eternity"]) expect(src).not.toContain(name);
  });
});

describe("kartu QR siap cetak", () => {
  it("kalimat petunjuk bawaan dipecah per kata agar tidak melewati area cetak", () => {
    // Lebar terukur dengan sharp untuk teks bawaan pada huruf 69 px (A4): ~2475 px, area cetak 0,88 x 2480 = 2182 px.
    const text = "Pindai kode QR untuk mengabadikan momen istimewa dari sudut pandang Anda.";
    const pxPerChar = 2475 / text.length;
    const ctx = { measureText: (s: string) => ({ width: s.length * pxPerChar }) as TextMetrics };
    const lines = wrapCanvasText(ctx, text, 2182);
    expect(lines.length).toBe(2);
    expect(lines.join(" ")).toBe(text);
    for (const line of lines) expect(ctx.measureText(line).width).toBeLessThanOrEqual(2182);
  });
});

describe("sampul layar pembuka lewat PATCH undangan umum", () => {
  it("mergeFeatureSettingsInput membuang URL sampul yang dapat keluar dari atribut", async () => {
    const merged = await mergeFeatureSettingsInput({}, { memoriesCoverPhoto: "/uploads/a.jpg');}</style><script>alert(1)</script>", openingCoverPhoto: "/uploads/ok/cover.webp" }, "TIER_3", true);
    expect(merged.ok).toBe(true);
    if (merged.ok) {
      expect(merged.value.memoriesCoverPhoto).toBe("");
      expect(merged.value.openingCoverPhoto).toBe("/uploads/ok/cover.webp");
    }
  });

  it.skipIf(!IS_TEST_DB)("rute PATCH menyimpan sampul yang sudah disaring dan tidak menimpa pengaturan lain", async () => {
    const user = await prisma.user.create({ data: { email: `${RUN}@test.local`, name: RUN } });
    created.userId = user.id;
    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
    const order = await prisma.order.create({
      data: { userId: user.id, invoiceNumber: RUN, planType: "TIER_3", amount: 200000, status: "PAID", orderType: "NEW", paidAt: new Date() },
    });
    created.orderId = order.id;
    const inv = await prisma.invitation.create({
      data: { userId: user.id, orderId: order.id, themeId: "kalandra", status: "DRAFT", invitationSlug: RUN, featureSettings: { memoriesFilter: "cinema_noir" } },
    });
    created.invitationId = inv.id;

    const res = await patchInvitation(
      new Request(`http://localhost/api/client/invitations/${inv.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ featureSettings: { memoriesOpeningLayout: "polaroid_nostalgia", memoriesCoverPhoto: "javascript:alert(1)" } }),
      }),
      { params: Promise.resolve({ id: inv.id }) },
    );
    expect(res.status).toBe(200);
    const stored = (await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { featureSettings: true } })).featureSettings as Record<string, unknown>;
    expect(stored.memoriesCoverPhoto).toBe("");
    expect(stored.memoriesOpeningLayout).toBe("polaroid_nostalgia");
    expect(stored.memoriesFilter).toBe("cinema_noir");
  });
});

describe("template WhatsApp buku tamu", () => {
  it("preset pernikahan tidak berubah, preset acara lain tidak menyebut pernikahan", () => {
    expect(waPresets("WEDDING")[0].text).toBe(
      "Kepada Yth.\nBapak/Ibu/Saudara/i {nama_tamu}\n\nTanpa mengurangi rasa hormat, perkenankan kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan kami:\n\n{link_undangan}\n\nMerupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir dan memberikan doa restu.\n\nTerima kasih.\n\nSalam hangat,\n{nama_mempelai}",
    );
    for (const eventType of ["BIRTHDAY", "KHITAN", "AQIQAH", "WISUDA", "GATHERING"]) {
      for (const preset of waPresets(eventType)) {
        expect(preset.text).not.toMatch(/pernikahan|perjalanan baru/);
        expect(preset.text).not.toContain("acara acara");
      }
    }
    expect(waPresets("KHITAN")[0].text).toContain("menghadiri acara khitanan kami:");
  });

  it.skipIf(!IS_TEST_DB)("template tetap bisa disimpan setelah undangan terbit tanpa menimpa pengaturan lain", async () => {
    const user = await prisma.user.create({ data: { email: `${RUN}_wa@test.local`, name: RUN } });
    sessionUser = { id: user.id, email: user.email, role: "CLIENT", isAdmin: false, permissions: [] };
    const order = await prisma.order.create({
      data: { userId: user.id, invoiceNumber: `${RUN}_wa`, planType: "TIER_1", amount: 100000, status: "PAID", orderType: "NEW", paidAt: new Date() },
    });
    const inv = await prisma.invitation.create({
      data: { userId: user.id, orderId: order.id, themeId: "kalandra", status: "PUBLISHED", publishedAt: new Date(), invitationSlug: `${RUN}_wa`, featureSettings: { displayOrder: "BRIDE_FIRST" } },
    });
    try {
      const body = JSON.stringify({ featureSettings: { waTemplate: "Halo {nama_tamu}" } });
      const put = await putInvitation(
        new Request(`http://localhost/api/client/invitations/${inv.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body }),
        { params: Promise.resolve({ id: inv.id }) },
      );
      expect(put.status).toBe(403);

      const patch = await patchInvitation(
        new Request(`http://localhost/api/client/invitations/${inv.id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body }),
        { params: Promise.resolve({ id: inv.id }) },
      );
      expect(patch.status).toBe(200);
      const stored = (await prisma.invitation.findUniqueOrThrow({ where: { id: inv.id }, select: { featureSettings: true } })).featureSettings as Record<string, unknown>;
      expect(stored.waTemplate).toBe("Halo {nama_tamu}");
      expect(stored.displayOrder).toBe("BRIDE_FIRST");
    } finally {
      await prisma.invitation.deleteMany({ where: { id: inv.id } });
      await prisma.order.deleteMany({ where: { id: order.id } });
      await prisma.user.deleteMany({ where: { id: user.id } });
    }
  });

  it("halaman buku tamu menyimpan template lewat PATCH", () => {
    const src = fs.readFileSync(path.join(process.cwd(), "app/(client)/dashboard/guests/page.tsx"), "utf-8");
    const save = src.slice(src.indexOf("const handleSaveTemplate"), src.indexOf("const defaultSessionInfo"));
    expect(save).toContain('method: "PATCH"');
    expect(save).not.toContain('method: "PUT"');
  });
});

afterAll(async () => {
  if (created.invitationId) await prisma.invitation.deleteMany({ where: { id: created.invitationId } });
  if (created.orderId) await prisma.order.deleteMany({ where: { id: created.orderId } });
  if (created.userId) await prisma.user.deleteMany({ where: { id: created.userId } });
  await prisma.$disconnect();
  await pool.end();
});
