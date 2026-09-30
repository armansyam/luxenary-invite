import { describe, it, expect } from "vitest";
import { safeExternalUrl, safeHref } from "@/lib/safeUrl";
import { jsonForInlineScript } from "@/lib/safeJson";

describe("safeExternalUrl", () => {
  it("menerima http/https dan menormalkannya", () => {
    expect(safeExternalUrl("https://maps.google.com/?q=Gedung Serbaguna")).toBe("https://maps.google.com/?q=Gedung%20Serbaguna");
    expect(safeExternalUrl("  http://example.com/a  ")).toBe("http://example.com/a");
  });

  it("melengkapi domain tanpa skema dengan https", () => {
    expect(safeExternalUrl("maps.app.goo.gl/abc123")).toBe("https://maps.app.goo.gl/abc123");
    expect(safeExternalUrl("youtube.com/watch?v=x")).toBe("https://youtube.com/watch?v=x");
  });

  it("menerima path lokal absolut, menolak protocol-relative", () => {
    expect(safeExternalUrl("/uploads/invitations/x.webp")).toBe("/uploads/invitations/x.webp");
    expect(safeExternalUrl("//evil.com/x")).toBe("");
    expect(safeExternalUrl("/\\evil.com")).toBe("");
  });

  it.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    "java\nscript:alert(1)",
    "java\tscript:alert(1)",
    " javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "vbscript:msgbox(1)",
    "file:///etc/passwd",
    "ftp://x.com/a",
    "blob:https://x.com/uuid",
  ])("menolak skema berbahaya: %s", (value) => {
    expect(safeExternalUrl(value)).toBe("");
  });

  it("menolak input non-string, kosong, atau sampah", () => {
    for (const v of [null, undefined, 42, {}, [], "", "   ", "bukan url", "http://"]) {
      expect(safeExternalUrl(v as any)).toBe("");
    }
  });

  it("tanda kutip di URL dipercent-encode oleh parser dan sisanya di-escape saat render", () => {
    const href = safeHref(`https://a.com/x"onmouseover="alert(1)`);
    expect(href).not.toContain('"');
    expect(safeHref(`https://a.com/?q='x'`)).not.toContain("'");
  });
});

describe("jsonForInlineScript", () => {
  it("tidak dapat menutup tag <script> lebih awal", () => {
    const out = jsonForInlineScript({ a: "</script><script>alert(1)</script>", b: "<!--" });
    expect(out).not.toContain("</script>");
    expect(out).not.toContain("<");
    expect(JSON.parse(out)).toEqual({ a: "</script><script>alert(1)</script>", b: "<!--" });
  });

  it("meloloskan pemisah baris Unicode dan hasilnya tetap JSON valid", () => {
    const value = { a: `x${String.fromCharCode(0x2028)}y${String.fromCharCode(0x2029)}z` };
    const out = jsonForInlineScript(value);
    expect(out).not.toContain(String.fromCharCode(0x2028));
    expect(out).not.toContain(String.fromCharCode(0x2029));
    expect(JSON.parse(out)).toEqual(value);
  });
});
