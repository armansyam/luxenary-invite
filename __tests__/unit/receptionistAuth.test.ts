import { describe, it, expect } from "vitest";
import { generateReceptionistToken, verifyReceptionistToken } from "@/lib/receptionistAuth";

describe("receptionistAuth — HMAC-SHA256 Token", () => {
  const invId = "vitest-inv-123";

  it("generateReceptionistToken() menghasilkan string non-kosong dengan prefix rcpt_", () => {
    const token = generateReceptionistToken(invId);
    expect(token).toMatch(/^rcpt_/);
    expect(token.length).toBeGreaterThan(20);
  });

  it("verifyReceptionistToken(token valid, invId sama) → true", () => {
    const token = generateReceptionistToken(invId);
    expect(verifyReceptionistToken(token, invId)).toBe(true);
  });

  it("verifyReceptionistToken(token valid, invId berbeda) → false (boundary guard)", () => {
    const token = generateReceptionistToken(invId);
    expect(verifyReceptionistToken(token, "inv-lain-sama-sekali")).toBe(false);
  });

  it("verifyReceptionistToken(token dipalsukan, invId) → false", () => {
    const fakeToken = `rcpt_${invId}_aaabbbccc000000000000000000000000000000000000000000000000000000`;
    expect(verifyReceptionistToken(fakeToken, invId)).toBe(false);
  });

  it("token kosong / string random → false", () => {
    expect(verifyReceptionistToken("", invId)).toBe(false);
    expect(verifyReceptionistToken("random-garbage", invId)).toBe(false);
  });

  it("dua invitationId berbeda menghasilkan token berbeda (tidak bisa cross-access)", () => {
    const t1 = generateReceptionistToken("inv-aaa");
    const t2 = generateReceptionistToken("inv-bbb");
    expect(t1).not.toBe(t2);
    expect(verifyReceptionistToken(t1, "inv-bbb")).toBe(false);
  });
});
