import { describe, it, expect } from "vitest";
import { encryptPin, decryptPin, verifyPin, isPinEncrypted } from "@/lib/pinEncryption";

describe("pinEncryption — AES-256-GCM", () => {
  const rawPin = "749201";

  it("encrypt() menghasilkan string yang berbeda dari plaintext", () => {
    const encrypted = encryptPin(rawPin);
    expect(encrypted).not.toBe(rawPin);
    expect(encrypted.length).toBeGreaterThan(20);
  });

  it("format output: 3 bagian dipisah titik dua (iv:tag:ciphertext)", () => {
    const encrypted = encryptPin(rawPin);
    const parts = encrypted.split(":");
    expect(parts).toHaveLength(3);
    // Setiap bagian adalah hex string non-kosong
    parts.forEach((p) => expect(p.length).toBeGreaterThan(0));
  });

  it("decryptPin(encryptPin(raw)) mengembalikan plaintext asli", () => {
    const encrypted = encryptPin(rawPin);
    const decrypted = decryptPin(encrypted);
    expect(decrypted).toBe(rawPin);
  });

  it("verifyPin(benar, encrypted) → true", () => {
    const encrypted = encryptPin(rawPin);
    expect(verifyPin(rawPin, encrypted)).toBe(true);
  });

  it("verifyPin(salah, encrypted) → false", () => {
    const encrypted = encryptPin(rawPin);
    expect(verifyPin("999999", encrypted)).toBe(false);
  });

  it("tamper auth-tag → decryptPin mengembalikan null (GCM integrity check)", () => {
    const encrypted = encryptPin(rawPin);
    const parts = encrypted.split(":");
    // Manipulasi 2 karakter terakhir tag
    const tamperedTag = parts[1]?.slice(0, -2) + "ff";
    const tampered = `${parts[0]}:${tamperedTag}:${parts[2]}`;
    const result = decryptPin(tampered);
    expect(result).toBeNull();
  });

  it("setiap enkripsi menghasilkan ciphertext berbeda (random IV)", () => {
    const enc1 = encryptPin(rawPin);
    const enc2 = encryptPin(rawPin);
    expect(enc1).not.toBe(enc2);
  });

  it("isPinEncrypted mendeteksi format terenkripsi dengan benar", () => {
    const encrypted = encryptPin(rawPin);
    expect(isPinEncrypted(encrypted)).toBe(true);
    expect(isPinEncrypted(rawPin)).toBe(false); // plaintext 6-digit
    expect(isPinEncrypted("")).toBe(false);
  });
});
