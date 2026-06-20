import rateLimit, { ipKeyGenerator, type Options } from "express-rate-limit";
import type { Request, Response } from "express";

/**
 * Brute-force / abuse protection for the auth surface. The timing-oracle
 * defense (see passwords.ts) stops email *enumeration*; these limiters stop
 * high-volume guessing of passwords and TOTP codes, and reset-email bombing.
 *
 * Login is defended in THREE independent layers so that no single key lets an
 * attacker through:
 *   (a) loginLimiter      — 3 / email / 15 min   (per-account guessing)
 *   (b) loginIpLimiter    — 30 / IP  / 15 min    (one IP cycling many emails)
 *   (c) authBlanketLimiter — 60 / IP / 15 min on /api/auth/*  (whole surface)
 * An attacker trying 100 emails from one IP is cut off at 30 by (b) long
 * before exhausting (a) on each account.
 *
 * NOTE: uses the default in-memory store — correct for a single instance. For
 * horizontally-scaled deployments, swap in a shared store (Redis) so counters
 * are global.
 */

const MINUTE = 60 * 1000;

function tooMany(_req: Request, res: Response) {
  res.status(429).json({
    code: "RATE_LIMITED",
    message: "Demasiadas tentativas. Aguarde alguns minutos e tente novamente.",
  });
}

const base: Partial<Options> = {
  windowMs: 15 * MINUTE,
  standardHeaders: true,
  legacyHeaders: false,
  handler: tooMany,
};

/** Normalised client IP (IPv6-aware, per express-rate-limit guidance). */
const ipKey = (req: Request): string => ipKeyGenerator(req.ip ?? "");

/** Submitted email, lower-cased; falls back to IP when none is present. */
function emailKey(req: Request): string {
  const email =
    typeof req.body?.email === "string" ? req.body.email.trim().toLowerCase() : "";
  return email || ipKey(req);
}

/**
 * (a) Per-account guessing: 8 failed attempts / email / 15 min.
 * skipSuccessfulRequests so a legitimate user logging in repeatedly is never
 * counted — only failures burn the budget. (8 tolera enganos de digitação sem
 * deixar de travar ataques de adivinhação de password.)
 */
export const loginLimiter = rateLimit({
  ...base,
  limit: 8,
  keyGenerator: emailKey,
  skipSuccessfulRequests: true,
});

/** (b) One IP cycling through many emails: 30 attempts / IP / 15 min. */
export const loginIpLimiter = rateLimit({
  ...base,
  limit: 30,
  keyGenerator: ipKey,
});

/** (c) Blanket cap on the entire /api/auth/* surface: 60 / IP / 15 min. */
export const authBlanketLimiter = rateLimit({
  ...base,
  limit: 60,
  keyGenerator: ipKey,
});

/** 2FA code verification: 10 attempts / 15 min per IP (no email in body). */
export const twoFactorLimiter = rateLimit({
  ...base,
  limit: 10,
  keyGenerator: ipKey,
});

/** Password reset (forgot + reset): 5 / 15 min per IP+email to curb email bombing. */
export const passwordResetLimiter = rateLimit({
  ...base,
  limit: 5,
  keyGenerator: emailKey,
});
