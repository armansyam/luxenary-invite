/**
 * Routing subdomain di proxy.ts: HTML terbit dan halaman /s/<sub> menautkan ke /s/<sub>/memories dan
 * /s/<sub>/sharemoment, bentuk yang sah di apex. Di host subdomain undangan itu sendiri, tautan tersebut
 * harus kembali ke bentuk pendek di host yang sama, bukan dialihkan keluar ke apex.
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("next-auth", () => ({ default: () => ({ auth: (handler: unknown) => handler }) }));
vi.mock("@/lib/rateLimit", () => ({ getClientIp: () => "127.0.0.1", rateLimitDb: async () => true }));

import { proxy } from "@/proxy";

const run = async (host: string, path: string) => {
  const req = new NextRequest(`http://${host}${path}`, { headers: { host } });
  (req as unknown as { auth: unknown }).auth = null;
  return (await (proxy as unknown as (r: NextRequest) => Promise<Response>)(req)) as Response;
};

describe("proxy: tautan /s/<sub>/... di host subdomain milik undangan itu", () => {
  it("/s/<sub>/memories kembali ke /memories di host yang sama, query ikut terbawa", async () => {
    const res = await run("bagas-laras.localhost:3000", "/s/bagas-laras/memories?to=Budi");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://bagas-laras.localhost:3000/memories?to=Budi");
  });

  it("/s/<sub>/sharemoment, /receptionist, dan /galery juga kembali ke bentuk pendek", async () => {
    for (const rest of ["sharemoment", "receptionist", "galery"]) {
      const res = await run("bagas-laras.localhost:3000", `/s/bagas-laras/${rest}`);
      expect(res.status).toBe(307);
      expect(res.headers.get("location")).toBe(`http://bagas-laras.localhost:3000/${rest}`);
    }
  });

  it("/s/<sub> kembali ke beranda subdomain dan huruf besar pada path tidak mengubah hasil", async () => {
    const plain = await run("bagas-laras.localhost:3000", "/s/bagas-laras");
    expect(plain.headers.get("location")).toBe("http://bagas-laras.localhost:3000/");
    const upper = await run("bagas-laras.localhost:3000", "/s/BAGAS-LARAS/memories");
    expect(upper.headers.get("location")).toBe("http://bagas-laras.localhost:3000/memories");
  });

  it("bentuk pendek /memories di-rewrite ke rute /s/<sub>/memories", async () => {
    const res = await run("bagas-laras.localhost:3000", "/memories");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toMatch(/\/s\/bagas-laras\/memories$/);
  });
});

describe("proxy: batas pengalihan tetap", () => {
  it("/s/<subdomain-lain>/... di host subdomain dialihkan ke apex, bukan ke subdomain lain", async () => {
    const res = await run("bagas-laras.localhost:3000", "/s/orang-lain/memories");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/s/orang-lain/memories");
  });

  it("rute /s/<sub>/... yang tidak dikenal tetap dialihkan ke apex", async () => {
    const res = await run("bagas-laras.localhost:3000", "/s/bagas-laras/admin");
    expect(res.headers.get("location")).toBe("http://localhost:3000/s/bagas-laras/admin");
  });

  it("host apex tidak dialihkan: /s/<sub>/memories dilayani apa adanya", async () => {
    const res = await run("localhost:3000", "/s/bagas-laras/memories");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });
});
