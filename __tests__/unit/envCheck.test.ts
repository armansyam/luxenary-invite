import { describe, it, expect } from "vitest";
import { checkServerEnv } from "@/lib/env";

const complete = {
  DATABASE_URL: "postgresql://u:p@localhost:5432/db",
  AUTH_SECRET: "x".repeat(32),
  PIN_ENCRYPTION_KEY: "a".repeat(64),
  CRON_SECRET: "rahasia",
  STORAGE_PROVIDER: "r2",
  S3_ENDPOINT: "https://example.r2.cloudflarestorage.com",
  S3_BUCKET_NAME: "bucket",
  S3_ACCESS_KEY: "key",
  S3_SECRET_KEY: "secret",
  S3_CUSTOM_DOMAIN: "https://cdn.example.com",
};

describe("checkServerEnv", () => {
  it("konfigurasi lengkap tidak menghasilkan temuan", () => {
    expect(checkServerEnv(complete)).toEqual({ fatal: [], problems: [] });
  });

  it("database dan secret auth yang kosong bersifat fatal", () => {
    const { fatal } = checkServerEnv({ ...complete, DATABASE_URL: "", AUTH_SECRET: undefined });
    expect(fatal).toHaveLength(2);
  });

  it("NEXTAUTH_SECRET diterima sebagai pengganti AUTH_SECRET", () => {
    expect(checkServerEnv({ ...complete, AUTH_SECRET: undefined, NEXTAUTH_SECRET: "y".repeat(32) }).fatal).toEqual([]);
  });

  it("kredensial R2 yang kurang dan nama yang salah ketik dilaporkan tanpa menghentikan server", () => {
    const { fatal, problems } = checkServerEnv({ ...complete, S3_BUCKET_NAME: undefined, S3_BUCKET: "bucket" });
    expect(fatal).toEqual([]);
    expect(problems.some((p) => p.startsWith("S3_BUCKET_NAME"))).toBe(true);
    expect(problems.some((p) => p.includes("S3_BUCKET diisi tetapi kode membaca S3_BUCKET_NAME"))).toBe(true);
  });

  it("STORAGE_PROVIDER=local tidak mensyaratkan kredensial S3", () => {
    const local = { ...complete, STORAGE_PROVIDER: "local", S3_ENDPOINT: "", S3_BUCKET_NAME: "", S3_ACCESS_KEY: "", S3_SECRET_KEY: "", S3_CUSTOM_DOMAIN: "" };
    expect(checkServerEnv(local).problems).toEqual([]);
  });

  it("PIN_ENCRYPTION_KEY yang bukan 64 hex dilaporkan", () => {
    expect(checkServerEnv({ ...complete, PIN_ENCRYPTION_KEY: "pendek" }).problems).toHaveLength(1);
  });

  it("laporan tidak pernah memuat nilai rahasia", () => {
    const report = checkServerEnv({ ...complete, S3_SECRET_KEY: undefined, S3_SECRET_ACCESS_KEY: "nilai-rahasia-123" });
    expect(JSON.stringify(report)).not.toContain("nilai-rahasia-123");
  });
});
