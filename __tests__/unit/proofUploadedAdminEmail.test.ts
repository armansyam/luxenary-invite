/**
 * Email ke admin saat klien mengunggah bukti transfer manual: isi template, label pesanan, dan pengiriman SMTP.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

const sendMail = vi.fn(async () => ({}));
vi.mock("nodemailer", () => ({ default: { createTransport: vi.fn(() => ({ sendMail })) } }));

let smtp = { smtpHost: "smtp.test", smtpPort: 587, smtpUser: "pengirim@test.local", smtpPassword: "x", smtpFromEmail: "", smtpFromName: "", platformName: "Luxvite" };
vi.mock("@/lib/settings", () => ({
  getPublicPlatformSettings: vi.fn(async () => ({ platformName: "Luxvite", packages: [{ id: "TIER_2", name: "Symphony Plus" }] })),
  getSmtpSettings: vi.fn(async () => smtp),
}));

import { buildProofUploadedAdminHtml, EMAIL_TEMPLATE_CATALOG } from "@/lib/email-templates";
import { proofOrderLabel, sendProofUploadedAdminAlertEmail } from "@/lib/mailer";

const input = {
  invoiceNumber: "INV-UJI-0001",
  orderType: "NEW",
  planType: "TIER_2",
  amount: 249000,
  clientName: "Amanda <b>Putri</b>",
  clientEmail: "amanda@test.local",
  uploadedAt: new Date("2026-11-04T07:20:00Z"),
  isReupload: false,
  recipientEmails: ["admin1@test.local", "admin2@test.local"],
  appUrl: "https://luxvite.id",
};

beforeEach(() => {
  sendMail.mockClear();
  smtp = { ...smtp, smtpHost: "smtp.test", smtpUser: "pengirim@test.local" };
});

describe("buildProofUploadedAdminHtml", () => {
  it("memuat data pesanan, tautan tab Order, dan meng-escape nama klien", () => {
    const out = buildProofUploadedAdminHtml(
      { invoiceNumber: "INV-1", itemLabel: "Paket Symphony", amount: 249000, clientName: "<script>x</script>", clientEmail: "a@b.c", uploadedAtFormatted: "4 November 2026 14.20 WIB", appUrl: "https://luxvite.id" },
      { platformName: "Luxvite" }
    );
    expect(out.subject).toBe("Bukti transfer baru masuk: INV-1 (Rp 249.000)");
    expect(out.html).toContain("https://luxvite.id/admin?tab=orders");
    expect(out.html).toContain("&lt;script&gt;x&lt;/script&gt; (a@b.c)");
    expect(out.html).not.toContain("<script>x</script>");
    expect(out.html).toContain("BUKTI BARU");
    expect(out.text).toContain("Pesanan: Paket Symphony");
  });

  it("unggah ulang ditandai di subjek dan lencana", () => {
    const out = buildProofUploadedAdminHtml({ invoiceNumber: "INV-2", itemLabel: "x", amount: 1000, clientEmail: "a@b.c", uploadedAtFormatted: "-", isReupload: true, appUrl: "https://luxvite.id" });
    expect(out.subject).toMatch(/^Bukti transfer diunggah ulang: INV-2/);
    expect(out.html).toContain("DIUNGGAH ULANG");
  });

  it("terdaftar di katalog pratinjau /admin/emails", () => {
    const entry = EMAIL_TEMPLATE_CATALOG.find((t) => t.key === "PROOF_UPLOADED_ADMIN");
    expect(entry?.render().subject).toMatch(/^Bukti transfer baru masuk: INV-/);
  });
});

describe("proofOrderLabel", () => {
  const pkgs = [{ id: "TIER_3", name: "Eternity Custom" }];
  it("mengikuti label kolom Pesanan di tab Order", () => {
    expect(proofOrderLabel({ orderType: "NEW", planType: "TIER_3" }, pkgs)).toBe("Paket Eternity Custom");
    expect(proofOrderLabel({ orderType: "NEW", planType: "TIER_1" }, pkgs)).toBe("Paket Serenade");
    expect(proofOrderLabel({ orderType: "UPGRADE", planType: "TIER_1", targetPlanType: "TIER_3" }, pkgs)).toBe("Upgrade ke Eternity Custom");
    expect(proofOrderLabel({ orderType: "GALLERY_EXTENSION", planType: "TIER_1" })).toBe("Perpanjang Masa Aktif (+30 Hari)");
    expect(proofOrderLabel({ orderType: "MEMORIES_TOPUP", planType: "TIER_1" })).toBe("Top-Up Kuota Momen Foto");
  });
});

describe("sendProofUploadedAdminAlertEmail", () => {
  it("mengirim satu email ke semua penerima dengan nama paket dari pengaturan dan waktu WIB", async () => {
    expect(await sendProofUploadedAdminAlertEmail(input)).toEqual({ success: true });
    expect(sendMail).toHaveBeenCalledTimes(1);
    const mail = (sendMail.mock.calls[0] as unknown as [Record<string, string>])[0];
    expect(mail.to).toEqual(["admin1@test.local", "admin2@test.local"]);
    expect(mail.from).toBe('"Luxvite" <pengirim@test.local>');
    expect(mail.subject).toBe("Bukti transfer baru masuk: INV-UJI-0001 (Rp 249.000)");
    expect(mail.text).toContain("Pesanan: Paket Symphony Plus");
    expect(mail.text).toContain("14.20 WIB");
    expect(mail.html).toContain("Amanda &lt;b&gt;Putri&lt;/b&gt;");
  });

  it("tanpa penerima atau tanpa SMTP tidak mengirim apa pun", async () => {
    expect(await sendProofUploadedAdminAlertEmail({ ...input, recipientEmails: [] })).toEqual({ success: false, error: "NO_RECIPIENTS" });
    smtp = { ...smtp, smtpHost: "" };
    expect(await sendProofUploadedAdminAlertEmail(input)).toEqual({ success: false, error: "SMTP_NOT_CONFIGURED" });
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("kegagalan SMTP dilaporkan, tidak dilempar", async () => {
    sendMail.mockRejectedValueOnce(new Error("535 auth failed"));
    expect(await sendProofUploadedAdminAlertEmail(input)).toEqual({ success: false, error: "535 auth failed" });
  });
});
