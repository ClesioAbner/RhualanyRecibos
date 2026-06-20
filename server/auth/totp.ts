import crypto from "crypto";

/**
 * RFC 6238 (TOTP) / RFC 4226 (HOTP) implemented on top of Node's built-in
 * `crypto` — no external OTP libraries. Compatible with Google Authenticator,
 * Authy, 1Password, etc. (SHA-1, 6 digits, 30s period).
 */

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const PERIOD_SECONDS = 30;
const DIGITS = 6;

// ─────────────────────────── base32 (RFC 4648) ───────────────────────────
function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let output = "";
  for (let i = 0; i < buf.length; i++) {
    value = (value << 8) | buf[i];
    bits += 8;
    while (bits >= 5) {
      output += BASE32_ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) {
    output += BASE32_ALPHABET[(value << (5 - bits)) & 31];
  }
  return output;
}

function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/=+$/g, "").replace(/\s/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    const idx = BASE32_ALPHABET.indexOf(clean[i]);
    if (idx === -1) continue; // skip stray separators
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

// ─────────────────────────────── secret ──────────────────────────────────
/** 20 random bytes (160 bits, the RFC 6238 recommendation) as base32. */
export function generateSecretBase32(): string {
  return base32Encode(crypto.randomBytes(20));
}

// ──────────────────────────── HOTP / TOTP ────────────────────────────────
function hotp(secretBase32: string, counter: number): string {
  const key = base32Decode(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64BE(BigInt(counter));

  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  // RFC 4226 dynamic truncation.
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary =
    ((hmac[offset] & 0x7f) << 24) |
    ((hmac[offset + 1] & 0xff) << 16) |
    ((hmac[offset + 2] & 0xff) << 8) |
    (hmac[offset + 3] & 0xff);

  return (binary % 10 ** DIGITS).toString().padStart(DIGITS, "0");
}

/** Current 6-digit TOTP for `secret`. `time` is ms-since-epoch (default now). */
export function generateTotp(secret: string, time: number = Date.now()): string {
  const counter = Math.floor(time / 1000 / PERIOD_SECONDS);
  return hotp(secret, counter);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * Verify a submitted token against `secret`, accepting a ±1 step window
 * (so a code stays valid for ~30s on either side of clock skew). Comparison
 * is constant-time to avoid leaking how close a guess was.
 */
export function verifyTotp(token: string, secret: string, time: number = Date.now()): boolean {
  const normalized = (token ?? "").replace(/\s/g, "");
  if (!/^\d{6}$/.test(normalized)) return false;

  const counter = Math.floor(time / 1000 / PERIOD_SECONDS);
  for (let window = -1; window <= 1; window++) {
    if (timingSafeEqualStr(hotp(secret, counter + window), normalized)) {
      return true;
    }
  }
  return false;
}

/** otpauth:// URI for QR enrolment (Google Authenticator format). */
export function totpAuthUri(secret: string, accountName: string, issuer: string): string {
  const label = encodeURIComponent(`${issuer}:${accountName}`);
  const params = new URLSearchParams({
    secret,
    issuer,
    algorithm: "SHA1",
    digits: String(DIGITS),
    period: String(PERIOD_SECONDS),
  });
  return `otpauth://totp/${label}?${params.toString()}`;
}

// ──────────────────────────── recovery codes ─────────────────────────────
const RECOVERY_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no ambiguous 0/O/1/I

export function hashRecoveryCode(code: string): string {
  return crypto
    .createHash("sha256")
    .update(code.toUpperCase().replace(/\s|-/g, ""))
    .digest("hex");
}

/**
 * 8 single-use recovery codes (8 chars each). Returns the plaintext codes —
 * shown to the user exactly once — plus their SHA-256 hashes for storage.
 */
export function generateRecoveryCodes(): { codes: string[]; hashes: string[] } {
  const codes: string[] = [];
  for (let i = 0; i < 8; i++) {
    const bytes = crypto.randomBytes(8);
    let code = "";
    for (let j = 0; j < 8; j++) {
      code += RECOVERY_ALPHABET[bytes[j] % RECOVERY_ALPHABET.length];
    }
    // Present as XXXX-XXXX for readability; hashing strips the dash.
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }
  return { codes, hashes: codes.map(hashRecoveryCode) };
}
