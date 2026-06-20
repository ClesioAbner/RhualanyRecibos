import bcrypt from "bcryptjs";

export const BCRYPT_COST = 12;

/**
 * A real bcrypt hash computed once at startup. When a login is attempted for
 * an email that does not exist, we still run `bcrypt.compare` against this
 * hash so the response time matches the "user exists, wrong password" path.
 * Without this, an attacker could measure latency to enumerate valid emails
 * (a timing oracle): missing users would return instantly while real ones
 * pay the bcrypt cost.
 */
export const DUMMY_HASH = bcrypt.hashSync("timing-oracle-defense-placeholder", BCRYPT_COST);

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_COST);
}

export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

/** Burn an equivalent amount of CPU when the user is unknown (see DUMMY_HASH). */
export function burnTimingBudget(plain: string): Promise<boolean> {
  return bcrypt.compare(plain, DUMMY_HASH);
}
