/**
 * Kebijakan CSP dinamis di lib/csp.ts + proxy.ts: sumber skrip yang memang dimuat di halaman produksi harus tercantum,
 * header Content-Security-Policy aktif (enforced) di seluruh halaman, dan rute aplikasi dilengkapi header
 * Content-Security-Policy-Report-Only berbasis nonce per permintaan.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { buildEnforcedCsp, buildStrictAppCspReportOnly, generateCspNonce, isStrictNonceAppRoute } from "@/lib/csp";

function parseCsp(value: string): Record<string, string[]> {
  return Object.fromEntries(
    value.split(";").map((part) => {
      const [name, ...sources] = part.trim().split(/\s+/);
      return [name, sources];
    })
  );
}

describe("CSP Enforced & Nonce Strict App Routes (lib/csp.ts + proxy.ts)", () => {
  it("proxy.ts menerapkan Content-Security-Policy dinamis dengan nonce pada rute aplikasi non-admin", () => {
    const proxySrc = fs.readFileSync(path.join(process.cwd(), "proxy.ts"), "utf8");
    expect(proxySrc).toContain("Content-Security-Policy");
    expect(proxySrc).toContain("buildEnforcedCsp");
    expect(proxySrc).toContain("buildStrictAppCspReportOnly");
    expect(proxySrc).toContain("isStrictNonceAppRoute");
    expect(isStrictNonceAppRoute("/login")).toBe(true);
    expect(isStrictNonceAppRoute("/dashboard/rsvp")).toBe(true);
    expect(isStrictNonceAppRoute("/admin")).toBe(false);
    expect(isStrictNonceAppRoute("/demo/kalandra")).toBe(false);
    expect(isStrictNonceAppRoute("/undangan-klien")).toBe(false);
  });

  it("script-src memuat beacon Cloudflare Web Analytics", () => {
    const csp = parseCsp(buildEnforcedCsp());
    expect(csp["script-src"]).toContain("https://static.cloudflareinsights.com");
  });

  it("script-src tetap memuat 'self', skrip inline tema, dan Midtrans", () => {
    const csp = parseCsp(buildEnforcedCsp());
    expect(csp["script-src"]).toEqual(
      expect.arrayContaining(["'self'", "'unsafe-inline'", "https://app.midtrans.com", "https://app.sandbox.midtrans.com"])
    );
  });

  it("connect-src mengizinkan https: sehingga beacon dapat mengirim data", () => {
    const csp = parseCsp(buildEnforcedCsp());
    expect(csp["connect-src"]).toContain("https:");
  });

  it("pelanggaran dilaporkan ke rute internal dan eval/skrip data: tidak dibuka", () => {
    const csp = parseCsp(buildEnforcedCsp());
    expect(csp["report-uri"]).toEqual(["/api/security/csp-report"]);
    expect(csp["script-src"]).not.toContain("'unsafe-eval'");
    expect(csp["script-src"]).not.toContain("data:");
    expect(csp["object-src"]).toEqual(["'none'"]);
  });

  it("strict app CSP Report-Only menyertakan nonce per permintaan tanpa unsafe-inline di script-src", () => {
    const nonce = generateCspNonce();
    const csp = parseCsp(buildStrictAppCspReportOnly(nonce));
    expect(csp["script-src"]).toContain(`'nonce-${nonce}'`);
    expect(csp["script-src"]).not.toContain("'unsafe-inline'");
    expect(csp["script-src"]).not.toContain("'unsafe-eval'");
    expect(csp["report-uri"]).toEqual(["/api/security/csp-report"]);
  });
});
