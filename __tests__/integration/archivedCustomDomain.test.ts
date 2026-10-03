/**
 * Undangan ARCHIVED yang dibuka lewat custom domain klien tetap tampil di domain itu (tanpa pengalihan ke URL
 * kanonik), sedangkan URL slug/subdomain tetap mengikuti urutan portofolio, arsip, beranda (DB luxenary_test).
 */
import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { NextRequest } from "next/server";

vi.mock("@/auth", () => ({ auth: vi.fn(async () => null) }));

import { prisma, pool } from "@/lib/prisma";
import { invalidateSettingsCache } from "@/lib/settings";
import { GET } from "@/app/(public)/[slug]/route";
import { isCustomDomainHost } from "@/lib/domainUtils";

const IS_TEST_DB = /\/luxenary_test(\?|$)/.test(process.env.DATABASE_URL || "");
const TAG = `vitest-arc-${Date.now()}`;
const DOMAIN = `${TAG}.example.test`;
const ARCHIVE_HTML = `<html><body>ARSIP-${TAG}</body></html>`;
const SETTINGS: Record<string, string> = { nas_archive_enabled: "true", nas_archive_retention_days: "365", retention_custom_domain_days: "365" };

const saved = new Map<string, string | null>();
let nasDir = "";
let userId = "";
let invitationId = "";
const portfolioFile = path.join(process.cwd(), "public", "portfolio", `${TAG}.html`);

async function setSetting(key: string, value: string) {
  await prisma.adminSetting.upsert({ where: { key }, update: { value }, create: { key, value, group: "setup" } });
  invalidateSettingsCache();
}

const call = (host: string) =>
  GET(new NextRequest(`http://${host}/${TAG}`, { headers: { host } }), { params: Promise.resolve({ slug: TAG }) });

describe("isCustomDomainHost", () => {
  it("mengabaikan huruf besar, port, dan awalan www", () => {
    expect(isCustomDomainHost("Pasangan.com", "pasangan.com")).toBe(true);
    expect(isCustomDomainHost("www.pasangan.com:443", "pasangan.com")).toBe(true);
    expect(isCustomDomainHost("pasangan.com", "www.pasangan.com")).toBe(true);
  });

  it("menolak host lain, kosong, atau undangan tanpa custom domain", () => {
    expect(isCustomDomainHost("luxvite.id", "pasangan.com")).toBe(false);
    expect(isCustomDomainHost("pasangan.com.evil.test", "pasangan.com")).toBe(false);
    expect(isCustomDomainHost(null, "pasangan.com")).toBe(false);
    expect(isCustomDomainHost("pasangan.com", null)).toBe(false);
    expect(isCustomDomainHost("", "")).toBe(false);
  });
});

describe.skipIf(!IS_TEST_DB)("arsip di custom domain", () => {
  beforeAll(async () => {
    for (const key of [...Object.keys(SETTINGS), "nas_archive_path"]) {
      saved.set(key, (await prisma.adminSetting.findUnique({ where: { key } }))?.value ?? null);
    }
    nasDir = fs.mkdtempSync(path.join(os.tmpdir(), "lux-arc-"));
    fs.mkdirSync(path.join(nasDir, TAG), { recursive: true });
    fs.writeFileSync(path.join(nasDir, TAG, "index.html"), ARCHIVE_HTML);
    for (const [key, value] of Object.entries(SETTINGS)) await setSetting(key, value);
    await setSetting("nas_archive_path", nasDir);

    const user = await prisma.user.create({ data: { email: `${TAG}@t.local`, name: "Owner" } });
    userId = user.id;
    const recent = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    const inv = await prisma.invitation.create({
      data: {
        userId,
        themeId: "kalandra",
        status: "ARCHIVED",
        invitationSlug: TAG,
        groomSlug: `${TAG}-g`,
        brideSlug: `${TAG}-b`,
        customDomain: DOMAIN,
        eventData: JSON.stringify([{ title: "Akad", date: recent, timezone: "WIB", isPrimary: true }]),
      },
    });
    invitationId = inv.id;
    fs.mkdirSync(path.dirname(portfolioFile), { recursive: true });
    fs.writeFileSync(portfolioFile, "<html>portofolio</html>");
  });

  afterAll(async () => {
    fs.rmSync(portfolioFile, { force: true });
    fs.rmSync(nasDir, { recursive: true, force: true });
    await prisma.invitation.deleteMany({ where: { id: invitationId } });
    await prisma.user.deleteMany({ where: { id: userId } });
    for (const [key, value] of saved) {
      if (value === null) await prisma.adminSetting.deleteMany({ where: { key } });
      else await prisma.adminSetting.update({ where: { key }, data: { value } });
    }
    invalidateSettingsCache();
    await prisma.$disconnect();
    await pool.end();
  });

  it("lewat custom domain: arsip disajikan langsung walau ada portofolio", async () => {
    const res = await call(DOMAIN);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain(`ARSIP-${TAG}`);
  });

  it("lewat custom domain dengan www dan port: tetap disajikan", async () => {
    expect((await call(`www.${DOMAIN}:3001`)).status).toBe(200);
  });

  it("lewat domain utama (slug/subdomain): tetap dialihkan ke portofolio", async () => {
    const res = await call("localhost:3000");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(`/portfolio/${TAG}`);
  });

  it("host lain yang menyerupai custom domain tidak mendapat perlakuan khusus", async () => {
    const res = await call(`${DOMAIN}.evil.test`);
    expect(res.status).toBe(307);
  });

  it("custom domain tanpa salinan arsip dan ada portofolio: portofolio", async () => {
    fs.rmSync(path.join(nasDir, TAG, "index.html"));
    const res = await call(DOMAIN);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain(`/portfolio/${TAG}`);
  });

  it("custom domain tanpa salinan arsip dan tanpa portofolio: beranda", async () => {
    fs.rmSync(portfolioFile, { force: true });
    const res = await call(DOMAIN);
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location") as string).pathname).toBe("/");
  });
});
