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

describe("proxy: tautan tamu bentuk /Nama di host subdomain", () => {
  // Skrip undangan membaca nama tamu dari location.search; rewrite internal membuat sampul tampil tanpa nama.
  it("/Nama dialihkan ke /?to=Nama di host yang sama (spasi ter-decode, query lain ikut)", async () => {
    const res = await run("bagas-laras.localhost:3000", "/Budi%20Santoso?autoplay=1");
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.host).toBe("bagas-laras.localhost:3000");
    expect(loc.pathname).toBe("/");
    expect(loc.searchParams.get("to")).toBe("Budi Santoso");
    expect(loc.searchParams.get("autoplay")).toBe("1");
  });

  it("/v=Nama dialihkan ke /?v=Nama; persen-encoding rusak dipakai apa adanya", async () => {
    const v = new URL((await run("bagas-laras.localhost:3000", "/v=Rina")).headers.get("location")!);
    expect(v.searchParams.get("v")).toBe("Rina");
    const broken = new URL((await run("bagas-laras.localhost:3000", "/Diskon%50%")).headers.get("location")!);
    expect(broken.searchParams.get("to")).toBe("Diskon%50%");
  });
});

describe("proxy: panel admin di server replika", () => {
  it("replika menolak /admin dan /api/admin dengan 503; server utama tidak", async () => {
    process.env.LUX_SERVER_ROLE = "replica";
    try {
      for (const p of ["/admin", "/admin/theme-builder", "/api/admin/themes"]) {
        expect((await run("localhost:3000", p)).status).toBe(503);
      }
      expect((await run("localhost:3000", "/demo")).status).not.toBe(503);
    } finally {
      delete process.env.LUX_SERVER_ROLE;
    }
    expect((await run("localhost:3000", "/api/admin/themes")).status).not.toBe(503);
  });
});

describe("proxy: crawler, /payment, reserved partner, CSP, dan isolasi custom domain", () => {
  it("subdomain menjawab /robots.txt (200 Disallow: /) dan /sitemap.xml (404), bukan redirect /?to=", async () => {
    const robots = await run("bagas-laras.localhost:3000", "/robots.txt");
    expect(robots.status).toBe(200);
    expect(robots.headers.get("content-type")).toContain("text/plain");
    expect(await robots.text()).toContain("Disallow: /");

    const sitemap = await run("bagas-laras.localhost:3000", "/sitemap.xml");
    expect(sitemap.status).toBe(404);
  });

  it("subdomain mengalihkan /payment, /archives, dan host partner.* ke apex domain", async () => {
    const pay = await run("bagas-laras.localhost:3000", "/payment?order=123");
    expect(pay.status).toBe(307);
    expect(pay.headers.get("location")).toBe("http://localhost:3000/payment?order=123");

    const arch = await run("bagas-laras.localhost:3000", "/archives");
    expect(arch.status).toBe(307);
    expect(arch.headers.get("location")).toBe("http://localhost:3000/archives");

    const partnerSub = await run("partner.localhost:3000", "/");
    expect(partnerSub.status).toBe(307);
    expect(partnerSub.headers.get("location")).toBe("http://localhost:3000/");
  });

  it("subdomain / memakai CSP undangan (bukan strict-dynamic nonce) sedangkan apex / memakai strict nonce CSP", async () => {
    const subRes = await run("bagas-laras.localhost:3000", "/");
    const subCsp = subRes.headers.get("content-security-policy") || "";
    expect(subCsp).toContain("'unsafe-inline'");
    expect(subCsp).not.toContain("'strict-dynamic'");

    const apexRes = await run("localhost:3000", "/");
    const apexCsp = apexRes.headers.get("content-security-policy") || "";
    expect(apexCsp).toContain("nonce-");
  });

  it("custom domain menolak seluruh rute platform dengan 404 dan melayani /robots.txt secara langsung", async () => {
    for (const p of ["/admin", "/admin/login", "/login", "/dashboard", "/packages", "/checkout", "/payment", "/partner", "/sitemap.xml"]) {
      const res = await run("undangan-klien.example", p);
      expect(res.status, p).toBe(404);
    }

    const robots = await run("undangan-klien.example", "/robots.txt");
    expect(robots.status).toBe(200);
    expect(await robots.text()).toContain("Disallow: /");
  });

  it("pengunjung belum login yang mengakses /packages?theme=...&event=... diarahkan ke /login dengan callbackUrl utuh", async () => {
    const res = await run("localhost:3000", "/packages?theme=kalandra&event=WEDDING");
    expect(res.status).toBe(307);
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/login");
    expect(loc.searchParams.get("callbackUrl")).toBe("/packages?theme=kalandra&event=WEDDING");
  });

  it("klien sudah login di /login menolak callbackUrl backslash open-redirect (/\\evil.com) dan jatuh ke /onboarding", async () => {
    const req = new NextRequest("http://localhost:3000/login?callbackUrl=/%5Cevil.com", {
      headers: { host: "localhost:3000" },
    });
    (req as unknown as { auth: unknown }).auth = { user: { id: "u1", role: "CLIENT", isAdmin: false } };
    const res = (await (proxy as unknown as (r: NextRequest) => Promise<Response>)(req)) as Response;
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/onboarding");
  });

  it("/portfolio/<slug> diteruskan langsung ke route handler tanpa rewrite .html", async () => {
    const res = await run("localhost:3000", "/portfolio/arif-nadia-221126");
    expect(res.headers.get("location")).toBeNull();
    expect(res.headers.get("x-middleware-rewrite")).toBeNull();
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("rewrite subdomain tetap memakai origin req.url agar tidak memicu external redirect loop saat Auth.js mengubah req.url", async () => {
    const prevRoot = process.env.NEXT_PUBLIC_ROOT_DOMAIN;
    process.env.NEXT_PUBLIC_ROOT_DOMAIN = "luxvite.id";
    try {
      const req = new NextRequest("https://luxvite.id/?to=Budi", {
        headers: { host: "bagas-laras.luxvite.id" },
      });
      (req as unknown as { auth: unknown }).auth = null;
      const res = (await (proxy as unknown as (r: NextRequest) => Promise<Response>)(req)) as Response;
      const rewrite = res.headers.get("x-middleware-rewrite");
      expect(rewrite).toBe("https://luxvite.id/s/bagas-laras?to=Budi");
    } finally {
      if (prevRoot === undefined) delete process.env.NEXT_PUBLIC_ROOT_DOMAIN;
      else process.env.NEXT_PUBLIC_ROOT_DOMAIN = prevRoot;
    }
  });
});
