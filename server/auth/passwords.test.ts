import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, burnTimingBudget, DUMMY_HASH, BCRYPT_COST } from "./passwords";

describe("password hashing", () => {
  it("hashes with bcrypt cost 12 and verifies", async () => {
    const hash = await hashPassword("Rhulany@2026");
    expect(hash).toMatch(/^\$2[aby]\$12\$/); // bcrypt, cost 12
    expect(await verifyPassword("Rhulany@2026", hash)).toBe(true);
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
    expect(BCRYPT_COST).toBe(12);
  });

  it("DUMMY_HASH is a real bcrypt hash that never matches user input", async () => {
    expect(DUMMY_HASH).toMatch(/^\$2[aby]\$12\$/);
    expect(await burnTimingBudget("any-attacker-password")).toBe(false);
  });
});
