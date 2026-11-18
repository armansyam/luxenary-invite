/**
 * Pemeriksa migrasi expand/contract (lib/migrationSafety.ts): migrasi baru tidak boleh mematahkan kode rilis
 * sebelumnya yang masih berjalan di server lain selama deploy.
 */
import { describe, it, expect } from "vitest";
import { migrationSafetyIssues, unsafeMigrations } from "@/lib/migrationSafety";

describe("migrationSafetyIssues", () => {
  it("menambah tabel, kolom nullable, atau kolom NOT NULL ber-DEFAULT diizinkan", () => {
    expect(migrationSafetyIssues(`CREATE TABLE "x" ("id" TEXT NOT NULL, CONSTRAINT "x_pkey" PRIMARY KEY ("id"));`)).toEqual([]);
    expect(migrationSafetyIssues(`ALTER TABLE "a" ADD COLUMN "b" TEXT;`)).toEqual([]);
    expect(migrationSafetyIssues(`ALTER TABLE "a" ADD COLUMN "b" TEXT NOT NULL DEFAULT '';`)).toEqual([]);
    expect(migrationSafetyIssues(`CREATE INDEX "a_b_idx" ON "a"("b");`)).toEqual([]);
  });

  it("perubahan yang mematahkan kode lama ditolak", () => {
    for (const sql of [
      `ALTER TABLE "a" DROP COLUMN "b";`,
      `DROP TABLE "a";`,
      `ALTER TABLE "a" RENAME COLUMN "b" TO "c";`,
      `ALTER TABLE "a" ALTER COLUMN "b" TYPE INTEGER;`,
      `ALTER TABLE "a" ALTER COLUMN "b" SET NOT NULL;`,
      `ALTER TYPE "EventType" ADD VALUE 'RAPAT';`,
      `ALTER TABLE "a" ADD COLUMN "b" TEXT NOT NULL;`,
    ]) {
      expect(migrationSafetyIssues(sql), sql).not.toEqual([]);
    }
  });

  it("komentar tidak dihitung, dan tahap contract yang ditandai diizinkan", () => {
    expect(migrationSafetyIssues(`-- dulu: DROP COLUMN "b"\nALTER TABLE "a" ADD COLUMN "c" TEXT;`)).toEqual([]);
    expect(migrationSafetyIssues(`-- lux:contract kolom b tidak dibaca kode sejak rilis abc123\nALTER TABLE "a" DROP COLUMN "b";`)).toEqual([]);
  });

  it("semua migrasi sejak baseline di repo lolos", () => {
    expect(unsafeMigrations()).toEqual({});
  });
});
