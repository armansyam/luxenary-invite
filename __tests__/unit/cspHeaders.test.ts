/**
 * Kebijakan CSP Report-Only di next.config.ts: sumber skrip yang memang dimuat di halaman produksi harus tercantum,
 * supaya laporan pelanggaran tetap bermakna dan kebijakan dapat dinaikkan ke enforce tanpa merusak halaman.
 */
import { describe, it, expect } from "vitest";
import nextConfig from "../../next.config";

async function cspDirectives(): Promise<Record<string, string[]>> {
  const rules = await nextConfig.headers!();
  const global = rules.find((r) => r.source === "/(.*)");
  const header = global?.headers.find((h) => h.key === "Content-Security-Policy-Report-Only");
  expect(header, "header CSP Report-Only terpasang di aturan global").toBeDefined();
  return Object.fromEntries(
    header!.value.split(";").map((part) => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    })
  );
}

describe("CSP Report-Only", () => {
  it("script-src memuat beacon Cloudflare Web Analytics", async () => {
    const csp = await cspDirectives();
    expect(csp["script-src"]).toContain("https://static.cloudflareinsights.com");
  });

  it("script-src tetap memuat 'self', skrip inline tema, dan Midtrans", async () => {
    const csp = await cspDirectives();
    expect(csp["script-src"]).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'", "https://app.midtrans.com", "https://app.sandbox.midtrans.com"])
    );
  });

  it("connect-src mengizinkan https: sehingga beacon dapat mengirim data", async () => {
    const csp = await cspDirectives();
    expect(csp["connect-src"]).toContain("https:");
  });

  it("pelanggaran dilaporkan ke rute internal dan eval/skrip data: tidak dibuka", async () => {
    const csp = await cspDirectives();
    expect(csp["report-uri"]).toEqual(["/api/security/csp-report"]);
    expect(csp["script-src"]).not.toContain("'unsafe-eval'");
    expect(csp["script-src"]).not.toContain("data:");
    expect(csp["object-src"]).toEqual(["'none'"]);
  });
});
