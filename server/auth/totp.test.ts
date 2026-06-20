import { describe, it, expect } from "vitest";
import {
  generateSecretBase32,
  generateTotp,
  verifyTotp,
  totpAuthUri,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "./totp";

// ASCII "12345678901234567890" in base32 — the RFC 6238 SHA-1 test seed.
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("TOTP (RFC 6238)", () => {
  it("matches the official test vectors", () => {
    expect(generateTotp(RFC_SECRET, 59 * 1000)).toBe("287082");
    expect(generateTotp(RFC_SECRET, 1111111109 * 1000)).toBe("081804");
    expect(generateTotp(RFC_SECRET, 1111111111 * 1000)).toBe("050471");
  });

  it("verifies a freshly generated token", () => {
    const secret = generateSecretBase32();
    const now = Date.now();
    expect(verifyTotp(generateTotp(secret, now), secret, now)).toBe(true);
  });

  it("accepts a ±1 step (30s) window but not beyond", () => {
    const secret = generateSecretBase32();
    const now = Date.now();
    const token = generateTotp(secret, now);
    expect(verifyTotp(token, secret, now + 30_000)).toBe(true);
    expect(verifyTotp(token, secret, now - 30_000)).toBe(true);
    expect(verifyTotp(token, secret, now + 90_000)).toBe(false);
  });

  it("rejects wrong / malformed tokens", () => {
    const secret = generateSecretBase32();
    expect(verifyTotp("000000", secret)).toBe(false);
    expect(verifyTotp("12345", secret)).toBe(false);
    expect(verifyTotp("abcdef", secret)).toBe(false);
    expect(verifyTotp("", secret)).toBe(false);
  });

  it("generates 20-byte (32-char base32) secrets", () => {
    expect(generateSecretBase32()).toHaveLength(32);
  });

  it("builds a valid otpauth URI", () => {
    const uri = totpAuthUri(RFC_SECRET, "a@b.mz", "Issuer X");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain(`secret=${RFC_SECRET}`);
    expect(uri).toContain("digits=6");
    expect(uri).toContain("period=30");
  });
});

describe("recovery codes", () => {
  it("produces 8 single-use codes whose hashes match", () => {
    const { codes, hashes } = generateRecoveryCodes();
    expect(codes).toHaveLength(8);
    expect(hashes).toHaveLength(8);
    for (let i = 0; i < codes.length; i++) {
      expect(codes[i].replace("-", "")).toHaveLength(8);
      expect(hashRecoveryCode(codes[i])).toBe(hashes[i]);
    }
  });

  it("hashing is dash/case-insensitive", () => {
    expect(hashRecoveryCode("abcd-efgh")).toBe(hashRecoveryCode("ABCDEFGH"));
  });
});
