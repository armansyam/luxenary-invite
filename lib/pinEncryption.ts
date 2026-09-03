import crypto from "crypto";

/**
 * PIN Encryption Utility — AES-256-GCM
 *
 * Enkripsi dua arah untuk staffPin:
 * - PIN bisa di-decrypt untuk ditampilkan kembali ke klien (tidak seperti bcrypt)
 * - Tanpa ENCRYPTION_KEY di .env, PIN tidak bisa dibaca dari DB
 * - Lebih aman dari plain-text: DB bocor → PIN tetap aman
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

function getEncryptionKey(): Buffer {
  const key = process.env.PIN_ENCRYPTION_KEY;
  if (!key) {
    // Fallback key untuk development — WAJIB diset di production .env
    if (process.env.NODE_ENV === "production") {
      throw new Error("[CRITICAL] PIN_ENCRYPTION_KEY tidak diset di environment production!");
    }
    // Dev-only fallback — persis 32 bytes
    return Buffer.from("luxenary-dev-key-32byte-fallback", "utf8");
  }
  const keyBuffer = Buffer.from(key, "hex");
  if (keyBuffer.length !== 32) {
    throw new Error("PIN_ENCRYPTION_KEY harus berupa 64-karakter hex string (32 bytes).");
  }
  return keyBuffer;
}

/**
 * Enkripsi PIN plain-text menjadi ciphertext (format: iv:authTag:ciphertext dalam hex)
 */
export function encryptPin(pin: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  const encrypted = Buffer.concat([cipher.update(pin, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  
  // Format: hex(iv) + ":" + hex(authTag) + ":" + hex(ciphertext)
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Dekripsi ciphertext kembali ke PIN plain-text
 * Returns null jika format salah atau key salah (bukan error exception)
 */
export function decryptPin(encryptedPin: string): string | null {
  try {
    const parts = encryptedPin.split(":");
    if (parts.length !== 3) {
      // Format lama (plain-text) — return as-is agar backward compatible
      return encryptedPin;
    }
    
    const [ivHex, authTagHex, ciphertextHex] = parts;
    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(authTagHex, "hex");
    const ciphertext = Buffer.from(ciphertextHex, "hex");
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    return null;
  }
}

/**
 * Cek apakah PIN sudah dalam format terenkripsi (bukan plain-text lama)
 */
export function isPinEncrypted(pin: string): boolean {
  const parts = pin.split(":");
  return parts.length === 3 && parts.every(p => /^[0-9a-f]+$/i.test(p));
}

/**
 * Verifikasi PIN yang diinput user terhadap PIN terenkripsi di database
 * Mendukung PIN lama (plain-text) dan PIN baru (terenkripsi) secara backward compatible
 */
export function verifyPin(inputPin: string, storedPin: string): boolean {
  if (!inputPin || !storedPin) return false;
  
  if (isPinEncrypted(storedPin)) {
    const decrypted = decryptPin(storedPin);
    return decrypted !== null && decrypted === inputPin;
  }
  
  // Backward compatible: PIN lama masih plain-text
  return storedPin === inputPin;
}
