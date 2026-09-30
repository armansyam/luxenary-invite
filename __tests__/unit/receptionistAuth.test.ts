import { describe, it, expect, beforeAll, afterAll } from "vitest";
import {
  generateReceptionistToken,
  verifyReceptionistToken,
  RECEPTIONIST_TOKEN_TTL_MS,
} from "@/lib/receptionistAuth";

describe("receptionistAuth — token HMAC berkedaluwarsa dan terikat PIN", () => {
  const invId = "0b7d6a44-0d6f-4f4e-9d0e-3f1a1c9b7e21";
  const pin = "enc:pin-tersimpan-v1";
  const savedAuthSecret = process.env.AUTH_SECRET;
  const savedNextAuthSecret = process.env.NEXTAUTH_SECRET;

  beforeAll(() => {
    process.env.AUTH_SECRET = "vitest-receptionist-signing-secret";
  });

  afterAll(() => {
    if (savedAuthSecret === undefined) delete process.env.AUTH_SECRET;
    else process.env.AUTH_SECRET = savedAuthSecret;
    if (savedNextAuthSecret === undefined) delete process.env.NEXTAUTH_SECRET;
    else process.env.NEXTAUTH_SECRET = savedNextAuthSecret;
  });

  it("tanpa AUTH_SECRET maupun NEXTAUTH_SECRET -> melempar error, tidak ada secret cadangan", () => {
    const a = process.env.AUTH_SECRET;
    const n = process.env.NEXTAUTH_SECRET;
    delete process.env.AUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    try {
      expect(() => generateReceptionistToken(invId, pin)).toThrow(/AUTH_SECRET/);
    } finally {
      process.env.AUTH_SECRET = a;
      if (n !== undefined) process.env.NEXTAUTH_SECRET = n;
    }
  });

  it("NEXTAUTH_SECRET dipakai jika AUTH_SECRET tidak ada", () => {
    const a = process.env.AUTH_SECRET;
    delete process.env.AUTH_SECRET;
    process.env.NEXTAUTH_SECRET = "vitest-nextauth-secret";
    try {
      const token = generateReceptionistToken(invId, pin);
      expect(verifyReceptionistToken(token, invId, pin)).toBe(true);
    } finally {
      process.env.AUTH_SECRET = a;
      delete process.env.NEXTAUTH_SECRET;
    }
  });

  it("token valid: berformat rcpt_<id>_<exp>_<hmac> dan lolos verifikasi", () => {
    const token = generateReceptionistToken(invId, pin);
    expect(token).toMatch(new RegExp(`^rcpt_${invId}_\\d+_[0-9a-f]{64}$`));
    expect(verifyReceptionistToken(token, invId, pin)).toBe(true);
  });

  it("token milik undangan lain ditolak", () => {
    const token = generateReceptionistToken(invId, pin);
    expect(verifyReceptionistToken(token, "undangan-lain", pin)).toBe(false);
  });

  it("token kedaluwarsa ditolak", () => {
    const issuedAt = Date.now() - RECEPTIONIST_TOKEN_TTL_MS - 1000;
    const token = generateReceptionistToken(invId, pin, issuedAt);
    expect(verifyReceptionistToken(token, invId, pin)).toBe(false);
  });

  it("PIN diganti -> token lama otomatis tidak berlaku", () => {
    const token = generateReceptionistToken(invId, pin);
    expect(verifyReceptionistToken(token, invId, "enc:pin-baru-v2")).toBe(false);
  });

  it("undangan tanpa PIN tersimpan -> semua token ditolak", () => {
    const token = generateReceptionistToken(invId, pin);
    expect(verifyReceptionistToken(token, invId, null)).toBe(false);
    expect(verifyReceptionistToken(token, invId, "")).toBe(false);
  });

  it("secret berbeda -> token tidak valid", () => {
    const token = generateReceptionistToken(invId, pin);
    const a = process.env.AUTH_SECRET;
    process.env.AUTH_SECRET = "secret-yang-lain-sama-sekali";
    try {
      expect(verifyReceptionistToken(token, invId, pin)).toBe(false);
    } finally {
      process.env.AUTH_SECRET = a;
    }
  });

  it("token dipalsukan atau dirusak ditolak (tanda tangan, kedaluwarsa dimajukan, format)", () => {
    const token = generateReceptionistToken(invId, pin);
    const [, , exp, sig] = token.split("_");
    const forgedExp = token.replace(`_${exp}_`, `_${Number(exp) + 86_400_000}_`);
    expect(verifyReceptionistToken(forgedExp, invId, pin)).toBe(false);
    expect(verifyReceptionistToken(token.slice(0, -2) + "00", invId, pin)).toBe(false);
    expect(verifyReceptionistToken(`rcpt_${invId}_${exp}_${sig}_extra`, invId, pin)).toBe(false);
    expect(verifyReceptionistToken(`rcpt_${invId}_abc_${sig}`, invId, pin)).toBe(false);
    expect(verifyReceptionistToken(`rcpt_${invId}_${exp}_zz`, invId, pin)).toBe(false);
    expect(verifyReceptionistToken("", invId, pin)).toBe(false);
    expect(verifyReceptionistToken("random-garbage", invId, pin)).toBe(false);
  });
});
