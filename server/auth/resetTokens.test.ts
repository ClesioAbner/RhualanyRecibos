import { describe, it, expect, vi, afterEach } from "vitest";
import { issueResetToken, peekResetToken, consumeResetToken } from "./resetTokens";

afterEach(() => vi.useRealTimers());

describe("password-reset tokens", () => {
  it("issues a 24-byte (48 hex char) token resolving to the user", () => {
    const token = issueResetToken(42);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
    expect(peekResetToken(token)).toBe(42);
  });

  it("is single-use", () => {
    const token = issueResetToken(7);
    expect(consumeResetToken(token)).toBe(7);
    expect(peekResetToken(token)).toBeNull();
    expect(consumeResetToken(token)).toBeNull();
  });

  it("returns null for unknown tokens", () => {
    expect(peekResetToken("deadbeef")).toBeNull();
    expect(consumeResetToken("nope")).toBeNull();
  });

  it("invalidates a user's previous token when a new one is issued", () => {
    const first = issueResetToken(99);
    const second = issueResetToken(99);
    expect(first).not.toBe(second);
    expect(peekResetToken(first)).toBeNull();
    expect(peekResetToken(second)).toBe(99);
  });

  it("expires after 30 minutes", () => {
    vi.useFakeTimers();
    const token = issueResetToken(5);
    expect(peekResetToken(token)).toBe(5);
    vi.advanceTimersByTime(31 * 60 * 1000);
    expect(peekResetToken(token)).toBeNull();
  });
});
