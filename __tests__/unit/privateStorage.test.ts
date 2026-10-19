/**
 * Jalur bucket penyimpanan privat (dipakai produksi, STORAGE_PROVIDER=r2) dengan S3Client tiruan: bukti transfer harus
 * masuk bucket privat S3_BACKUP_BUCKET_NAME di bawah private/, tidak pernah ke bucket media yang dibuka publik.
 */
import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import fs from "fs";
import path from "path";

vi.hoisted(() => {
  Object.assign(process.env, {
    STORAGE_PROVIDER: "r2",
    S3_ENDPOINT: "https://r2.invalid",
    S3_ACCESS_KEY: "test",
    S3_SECRET_KEY: "test",
    S3_BUCKET_NAME: "media",
    S3_BACKUP_BUCKET_NAME: "vault",
  });
});

const sent: { name: string; input: Record<string, unknown> }[] = [];
let getObjectResult: unknown = null;

vi.mock("@aws-sdk/client-s3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@aws-sdk/client-s3")>();
  class S3Client {
    async send(command: { constructor: { name: string }; input: Record<string, unknown> }) {
      sent.push({ name: command.constructor.name, input: command.input });
      if (command.constructor.name === "GetObjectCommand") {
        if (getObjectResult instanceof Error) throw getObjectResult;
        return getObjectResult;
      }
      return {};
    }
  }
  return { ...actual, S3Client };
});
vi.mock("@/lib/prisma", () => ({ prisma: {}, pool: {} }));

import { uploadPrivateFile, readPrivateFile, deleteFile, isPrivateFileRef } from "@/lib/storage";

const diskFile = path.join(process.cwd(), "data", "private", "proofs", "vitest_private_storage.webp");

describe("penyimpanan privat: jalur bucket", () => {
  beforeEach(() => {
    sent.length = 0;
    process.env.S3_BACKUP_BUCKET_NAME = "vault";
  });
  afterAll(() => fs.rmSync(diskFile, { force: true }));

  it("unggahan masuk bucket privat di bawah private/ tanpa cache publik", async () => {
    const ref = await uploadPrivateFile(Buffer.from("x"), "proofs/a.webp", "image/webp");
    expect(ref).toBe("private-bucket:proofs/a.webp");
    expect(isPrivateFileRef(ref)).toBe(true);
    expect(sent).toHaveLength(1);
    expect(sent[0].name).toBe("PutObjectCommand");
    expect(sent[0].input).toMatchObject({ Bucket: "vault", Key: "private/proofs/a.webp", ContentType: "image/webp", CacheControl: "private, no-store" });
  });

  it("bucket privat sama dengan bucket media dianggap tidak ada: berkas ditulis ke data/private, bukan ke bucket publik", async () => {
    process.env.S3_BACKUP_BUCKET_NAME = "media";
    const ref = await uploadPrivateFile(Buffer.from("y"), "proofs/vitest_private_storage.webp", "image/webp");
    expect(ref).toBe("private-disk:proofs/vitest_private_storage.webp");
    expect(sent).toHaveLength(0);
    expect(fs.readFileSync(diskFile, "utf8")).toBe("y");
  });

  it("baca: isi objek dikembalikan, objek yang tidak ada menjadi null", async () => {
    getObjectResult = { Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) } };
    expect(await readPrivateFile("private-bucket:proofs/a.webp")).toEqual(Buffer.from([1, 2, 3]));
    expect(sent[0].input).toEqual({ Bucket: "vault", Key: "private/proofs/a.webp" });

    getObjectResult = Object.assign(new Error("missing"), { name: "NoSuchKey" });
    expect(await readPrivateFile("private-bucket:proofs/b.webp")).toBeNull();

    getObjectResult = Object.assign(new Error("denied"), { name: "AccessDenied" });
    await expect(readPrivateFile("private-bucket:proofs/c.webp")).rejects.toThrow("denied");
  });

  it("deleteFile menghapus objek di bucket privat", async () => {
    expect(await deleteFile("private-bucket:proofs/a.webp")).toBe(true);
    expect(sent).toEqual([{ name: "DeleteObjectCommand", input: { Bucket: "vault", Key: "private/proofs/a.webp" } }]);
  });

  it("referensi dengan traversal ditolak tanpa menyentuh penyimpanan", async () => {
    for (const ref of ["private-bucket:../x", "private-bucket:proofs/../../x", "private-disk:proofs//x", "private-disk:/etc/passwd"]) {
      expect(await readPrivateFile(ref)).toBeNull();
      expect(await deleteFile(ref)).toBe(false);
    }
    await expect(uploadPrivateFile(Buffer.from("z"), "../x", "image/webp")).rejects.toThrow("tidak valid");
    expect(sent).toHaveLength(0);
  });
});
