/**
 * syncDraftToR2 dengan S3Client dan prisma tiruan: saat undangan terbit dan R2 aktif, unggahan milik undangan yang
 * URL-nya tersimpan di featureSettings (gambar QRIS, logo vendor) ikut dipindah ke bucket media, bukan tertinggal di
 * disk VPS. Berkas undangan lain dan URL eksternal tidak disentuh.
 */
import { describe, it, expect, vi, afterAll } from "vitest";
import fs from "fs";
import path from "path";

vi.hoisted(() => {
  Object.assign(process.env, {
    STORAGE_PROVIDER: "r2",
    S3_ENDPOINT: "https://r2.invalid",
    S3_ACCESS_KEY: "test",
    S3_SECRET_KEY: "test",
    S3_BUCKET_NAME: "media",
    S3_CUSTOM_DOMAIN: "https://cdn.contoh.test",
  });
});

const sent: { name: string; input: Record<string, unknown> }[] = [];
const updates: { model: string; data: Record<string, unknown> }[] = [];
const INV = "11111111-2222-4333-8444-555555555555";
const OTHER = "99999999-2222-4333-8444-555555555555";

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  class S3Client {
    async send(command: { constructor: { name: string }; input: Record<string, unknown> }) {
      sent.push({ name: command.constructor.name, input: command.input });
      return {};
    }
  }
  return { ...actual, S3Client };
});
vi.mock("@/lib/prisma", () => ({
  pool: {},
  prisma: {
    invitation: {
      findUnique: async () => ({
        id: INV,
        musicUrl: null,
        media: [{ id: "m1", localPath: `/uploads/invitations/${INV}/landing-cover.webp?t=1` }],
        featureSettings: {
          showGift: true,
          qrisImageUrl: `/uploads/invitations/${INV}/qris.webp?t=2`,
          vendors: [{ name: "Foto", logo: `/uploads/invitations/${INV}/vendor-1.webp` }, { name: "Asing", logo: `/uploads/invitations/${OTHER}/qris.webp` }],
          galleryPhotosList: ["https://lh3.googleusercontent.com/abc"],
        },
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => updates.push({ model: "invitation", data }),
    },
    invitationMedia: { update: async ({ data }: { data: Record<string, unknown> }) => updates.push({ model: "media", data }) },
  },
}));
vi.mock("@/lib/staticPublisher", () => ({ buildAndSavePublishedHtml: async () => null }));
vi.mock("@/lib/nasArchive", () => ({ syncInvitationToNasArchive: async () => undefined }));

import { syncDraftToR2 } from "@/lib/storage";

const dirs = [INV, OTHER].map((id) => path.join(process.cwd(), "public", "uploads", "invitations", id));
for (const [dir, files] of [[dirs[0], ["landing-cover.webp", "qris.webp", "vendor-1.webp"]], [dirs[1], ["qris.webp"]]] as const) {
  fs.mkdirSync(dir, { recursive: true });
  for (const f of files) fs.writeFileSync(path.join(dir, f), f);
}

describe("syncDraftToR2", () => {
  afterAll(() => dirs.forEach((d) => fs.rmSync(d, { recursive: true, force: true })));

  it("memindah unggahan milik undangan di featureSettings ke R2 dan membiarkan yang lain", async () => {
    await syncDraftToR2(INV);

    const keys = sent.filter((c) => c.name === "PutObjectCommand").map((c) => c.input.Key).sort();
    expect(keys).toEqual([`invitations/${INV}/landing-cover.webp`, `invitations/${INV}/qris.webp`, `invitations/${INV}/vendor-1.webp`]);

    const settings = updates.find((u) => u.model === "invitation")?.data.featureSettings as Record<string, any>;
    expect(settings.qrisImageUrl).toBe(`https://cdn.contoh.test/invitations/${INV}/qris.webp`);
    expect(settings.vendors[0].logo).toBe(`https://cdn.contoh.test/invitations/${INV}/vendor-1.webp`);
    expect(settings.vendors[1].logo).toBe(`/uploads/invitations/${OTHER}/qris.webp`);
    expect(settings.galleryPhotosList).toEqual(["https://lh3.googleusercontent.com/abc"]);
    expect(settings.showGift).toBe(true);
    expect(fs.existsSync(path.join(dirs[1], "qris.webp"))).toBe(true);
  });
});
