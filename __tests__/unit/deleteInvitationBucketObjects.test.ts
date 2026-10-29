/**
 * deleteInvitationBucketObjects dengan S3Client tiruan: semua objek di bawah invitations/<id>/ dihapus (termasuk
 * QRIS dan logo vendor yang tidak tercatat di tabel media), berhalaman, tanpa menyentuh undangan lain.
 */
import { describe, it, expect, vi } from "vitest";

vi.hoisted(() => {
  Object.assign(process.env, {
    STORAGE_PROVIDER: "r2",
    S3_ENDPOINT: "https://r2.invalid",
    S3_ACCESS_KEY: "test",
    S3_SECRET_KEY: "test",
    S3_BUCKET_NAME: "media",
  });
});

const INV = "11111111-2222-4333-8444-555555555555";
const objects = [
  `invitations/${INV}/landing-cover.webp`,
  `invitations/${INV}/qris.webp`,
  `invitations/${INV}/vendor-1.webp`,
  "invitations/99999999-2222-4333-8444-555555555555/qris.webp",
];
const deleted: string[] = [];

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  class S3Client {
    async send(command: { constructor: { name: string }; input: Record<string, any> }) {
      if (command.constructor.name === "ListObjectsV2Command") {
        const matching = objects.filter((k) => k.startsWith(command.input.Prefix) && !deleted.includes(k));
        // Dua halaman: satu objek per halaman pertama agar penanganan ContinuationToken ikut teruji.
        if (!command.input.ContinuationToken) return { Contents: matching.slice(0, 1).map((Key) => ({ Key })), IsTruncated: matching.length > 1, NextContinuationToken: "p2" };
        return { Contents: matching.slice(0).map((Key) => ({ Key })), IsTruncated: false };
      }
      if (command.constructor.name === "DeleteObjectCommand") deleted.push(command.input.Key);
      return {};
    }
  }
  return { ...actual, S3Client };
});
vi.mock("@/lib/prisma", () => ({ prisma: {}, pool: {} }));

import { deleteInvitationBucketObjects } from "@/lib/storage";

describe("deleteInvitationBucketObjects", () => {
  it("menghapus semua objek milik undangan dan tidak menyentuh undangan lain", async () => {
    const count = await deleteInvitationBucketObjects(INV);
    expect(count).toBe(3);
    expect(deleted.sort()).toEqual(objects.slice(0, 3).sort());
  });

  it("id yang tidak aman sebagai segmen path tidak menghapus apa pun", async () => {
    expect(await deleteInvitationBucketObjects("../x")).toBe(0);
    expect(await deleteInvitationBucketObjects("")).toBe(0);
  });
});
