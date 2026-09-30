import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

let requestHeaders: Record<string, string> | "outside-request" = {};

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => {
    if (requestHeaders === "outside-request") throw new Error("headers() dipanggil di luar request scope");
    const map = requestHeaders;
    return { get: (name: string) => map[name.toLowerCase()] ?? null };
  }),
}));

import { getDynamicServerApexUrl } from "@/lib/serverDomainUtils";

const savedAppUrl = process.env.NEXT_PUBLIC_APP_URL;
const savedRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN;

describe("getDynamicServerApexUrl", () => {
  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
  });

  afterEach(() => {
    if (savedAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = savedAppUrl;
    if (savedRoot === undefined) delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    else process.env.NEXT_PUBLIC_ROOT_DOMAIN = savedRoot;
  });

  it("membuang label subdomain klien dari host production", async () => {
    requestHeaders = { host: "budi-sari.domain-platform.com", "x-forwarded-proto": "https" };
    expect(await getDynamicServerApexUrl("budi-sari")).toBe("https://domain-platform.com");
  });

  it("mempertahankan port pada localhost", async () => {
    requestHeaders = { host: "budi-sari.localhost:3000" };
    expect(await getDynamicServerApexUrl("budi-sari")).toBe("http://localhost:3000");
  });

  it("label dibandingkan tanpa peka huruf besar/kecil", async () => {
    requestHeaders = { host: "budi-sari.domain-platform.com", "x-forwarded-proto": "https" };
    expect(await getDynamicServerApexUrl("Budi-Sari")).toBe("https://domain-platform.com");
  });

  it("akses via IP (tanpa label subdomain) dikembalikan apa adanya", async () => {
    requestHeaders = { host: "192.168.1.5:3000" };
    expect(await getDynamicServerApexUrl("budi-sari")).toBe("http://192.168.1.5:3000");
  });

  it("host yang labelnya berbeda tidak diubah", async () => {
    requestHeaders = { host: "lain.domain-platform.com", "x-forwarded-proto": "https" };
    expect(await getDynamicServerApexUrl("budi-sari")).toBe("https://lain.domain-platform.com");
  });

  it("x-forwarded-host dari reverse proxy diutamakan atas host internal", async () => {
    requestHeaders = { host: "127.0.0.1:3000", "x-forwarded-host": "budi-sari.domain-platform.com", "x-forwarded-proto": "https" };
    expect(await getDynamicServerApexUrl("budi-sari")).toBe("https://domain-platform.com");
  });

  it("di luar konteks request memakai NEXT_PUBLIC_APP_URL", async () => {
    requestHeaders = "outside-request";
    process.env.NEXT_PUBLIC_APP_URL = "https://domain-platform.com/";
    expect(await getDynamicServerApexUrl("budi-sari")).toBe("https://domain-platform.com");
  });
});
