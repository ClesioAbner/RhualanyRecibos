import crypto from "crypto";

/**
 * Authenticated encryption (AES-256-GCM) for secrets stored at rest — namely
 * the TOTP shared secret. Ciphertext is tamper-evident: any modification makes
 * decryption throw.
 *
 * Key resolution (first that exists):
 *   1. TOTP_ENCRYPTION_KEY  — 64 hex chars (32 bytes), the production path
 *   2. SESSION_SECRET       — derived via scrypt (acceptable for single-key dev)
 *   3. dev-only fallback     — logs a warning; never used in production
 */

const VERSION = "v1";
const ALGO = "aes-256-gcm";
const IV_LEN = 12;
const TAG_LEN = 16;

const isProd = process.env.NODE_ENV === "production";

function resolveKey(): Buffer {
  const explicit = process.env.TOTP_ENCRYPTION_KEY;
  if (explicit) {
    if (/^[0-9a-fA-F]{64}$/.test(explicit)) return Buffer.from(explicit, "hex");
    // Any other string: stretch to 32 bytes deterministically.
    return crypto.scryptSync(explicit, "totp-enc-salt", 32);
  }
  const session = process.env.SESSION_SECRET;
  if (session) return crypto.scryptSync(session, "totp-enc-salt", 32);

  if (isProd) {
    throw new Error("TOTP_ENCRYPTION_KEY (or SESSION_SECRET) must be set in production");
  }
  // eslint-disable-next-line no-console
  console.warn("[crypto] No encryption key set — using insecure dev fallback key.");
  return crypto.scryptSync("dev-insecure-key", "totp-enc-salt", 32);
}

// Resolve once at startup.
const KEY = resolveKey();

/** Encrypt plaintext → "v1:<base64(iv|tag|ciphertext)>". */
export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${Buffer.concat([iv, tag, ct]).toString("base64")}`;
}

/**
 * Decrypt a value produced by `encryptSecret`. For backward compatibility, a
 * value without the version prefix is treated as legacy plaintext and returned
 * as-is (so pre-existing unencrypted secrets keep working until rotated).
 */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(`${VERSION}:`)) return stored; // legacy plaintext
  const raw = Buffer.from(stored.slice(VERSION.length + 1), "base64");
  const iv = raw.subarray(0, IV_LEN);
  const tag = raw.subarray(IV_LEN, IV_LEN + TAG_LEN);
  const ct = raw.subarray(IV_LEN + TAG_LEN);
  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
