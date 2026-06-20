import crypto from "crypto";

/**
 * In-memory, single-use password-reset tokens. Deliberately not persisted:
 * tokens are short-lived (30 min) and a server restart invalidating pending
 * resets is an acceptable trade-off. Tokens are 24 random bytes (hex).
 */

const TTL_MS = 30 * 60 * 1000; // 30 minutes

interface ResetEntry {
  userId: number;
  expiresAt: number;
}

const tokens = new Map<string, ResetEntry>();

function sweep(now = Date.now()): void {
  tokens.forEach((entry, token) => {
    if (entry.expiresAt <= now) tokens.delete(token);
  });
}

/** Issue a fresh token for `userId`, invalidating any earlier ones. */
export function issueResetToken(userId: number): string {
  sweep();
  // Only one live token per user — drop previous ones.
  tokens.forEach((entry, token) => {
    if (entry.userId === userId) tokens.delete(token);
  });
  const token = crypto.randomBytes(24).toString("hex");
  tokens.set(token, { userId, expiresAt: Date.now() + TTL_MS });
  return token;
}

/** Resolve a token to a userId without consuming it (returns null if invalid/expired). */
export function peekResetToken(token: string): number | null {
  const entry = tokens.get(token);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    tokens.delete(token);
    return null;
  }
  return entry.userId;
}

/** Resolve and consume a token (single use). */
export function consumeResetToken(token: string): number | null {
  const userId = peekResetToken(token);
  if (userId !== null) tokens.delete(token);
  return userId;
}
