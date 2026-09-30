import { describe, it, expect, afterEach, vi } from "vitest";
import { getClientIp } from "@/lib/rateLimit";

const req = (headers: Record<string, string>) => ({ headers: new Headers(headers) });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getClientIp: hanya header dari proxy tepercaya yang dipakai", () => {
  it("mode cloudflare (default): memakai cf-connecting-ip dan mengabaikan XFF/X-Real-IP", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getClientIp(req({ "cf-connecting-ip": "1.2.3.4", "x-forwarded-for": "9.9.9.9", "x-real-ip": "8.8.8.8" }))).toBe("1.2.3.4");
  });

  it("mode cloudflare: tanpa cf-connecting-ip, XFF dan X-Real-IP palsu tidak menghasilkan kunci baru", () => {
    vi.stubEnv("NODE_ENV", "production");
    const a = getClientIp(req({ "x-forwarded-for": "10.0.0.1" }));
    const b = getClientIp(req({ "x-forwarded-for": "10.0.0.2", "x-real-ip": "10.0.0.3" }));
    expect(a).toBe(b);
    expect(a).not.toBe("10.0.0.1");
  });

  it("mode nginx: memakai x-real-ip dan mengabaikan cf-connecting-ip serta XFF", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY", "nginx");
    expect(getClientIp(req({ "x-real-ip": "5.6.7.8", "cf-connecting-ip": "1.1.1.1", "x-forwarded-for": "2.2.2.2" }))).toBe("5.6.7.8");
  });

  it("mode none: header apa pun diabaikan", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY", "none");
    expect(getClientIp(req({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2" }))).toBe(getClientIp(req({})));
  });

  it("nilai TRUSTED_PROXY tidak dikenal jatuh ke cloudflare, bukan ke kepercayaan penuh", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("TRUSTED_PROXY", "semua");
    expect(getClientIp(req({ "x-forwarded-for": "3.3.3.3" }))).not.toBe("3.3.3.3");
  });

  it("development: boleh memakai header apa adanya agar uji lokal tanpa proxy tetap nyaman", () => {
    vi.stubEnv("NODE_ENV", "development");
    expect(getClientIp(req({ "x-forwarded-for": "4.4.4.4, 5.5.5.5" }))).toBe("4.4.4.4");
  });
});
