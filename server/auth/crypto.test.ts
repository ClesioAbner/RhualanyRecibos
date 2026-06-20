import { describe, it, expect } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto";

describe("secret encryption (AES-256-GCM)", () => {
  it("round-trips plaintext", () => {
    const plain = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";
    expect(decryptSecret(encryptSecret(plain))).toBe(plain);
  });

  it("produces versioned, non-plaintext ciphertext", () => {
    const enc = encryptSecret("hello-secret");
    expect(enc.startsWith("v1:")).toBe(true);
    expect(enc).not.toContain("hello-secret");
  });

  it("uses a random IV (same input → different ciphertext)", () => {
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("throws on tampered ciphertext (authentication)", () => {
    const enc = encryptSecret("tamper-me");
    const tampered = enc.slice(0, -4) + (enc.endsWith("A") ? "BBBB" : "AAAA");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("treats unversioned values as legacy plaintext", () => {
    expect(decryptSecret("legacy-plaintext-secret")).toBe("legacy-plaintext-secret");
  });
});
