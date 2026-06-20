import type { Express, Request } from "express";
import passport from "passport";
import { api } from "@shared/routes";
import { storage } from "../storage";
import { toPublicUser, isTotpEnabled, type User } from "@shared/schema";
import { requireAuth, requireAdmin } from "./index";
import { hashPassword, verifyPassword } from "./passwords";
import { audit } from "../audit";
import {
  generateSecretBase32,
  verifyTotp,
  totpAuthUri,
  generateRecoveryCodes,
  hashRecoveryCode,
} from "./totp";
import { issueResetToken, consumeResetToken } from "./resetTokens";
import { sendPasswordResetEmail } from "./mailer";
import { encryptSecret, decryptSecret } from "./crypto";
import { sendValidationError } from "../validation";
import {
  loginLimiter,
  loginIpLimiter,
  authBlanketLimiter,
  twoFactorLimiter,
  passwordResetLimiter,
} from "./rateLimit";
import { log } from "../index";

const ISSUER = "Colégio Rhulany";

/**
 * Establish an authenticated session. Regenerates the session ID first
 * (OWASP: renew the session identifier on authentication to defeat session
 * fixation) and only then serializes the user into the fresh session.
 */
function establishAuthenticatedSession(
  req: Request,
  user: User,
  done: (err?: unknown) => void,
): void {
  req.session.regenerate((regenErr) => {
    if (regenErr) return done(regenErr);
    req.login(user, (loginErr) => {
      if (loginErr) return done(loginErr);
      void storage.updateUser(user.id, { lastLoginAt: new Date() });
      done();
    });
  });
}

export function registerAuthRoutes(app: Express): void {
  // Layer (c): a blanket per-IP cap over the WHOLE auth surface, so even paths
  // without their own limiter (me, logout, 2FA enrolment…) can't be hammered.
  app.use("/api/auth", authBlanketLimiter);

  // ───────────────────────────── session info ─────────────────────────────
  app.get(api.auth.me.path, (req, res) => {
    if (req.isAuthenticated?.() && req.user) {
      return res.json(toPublicUser(req.user as User));
    }
    return res.status(401).json({ message: "Não autenticado" });
  });

  // ──────────────────────────────── login ─────────────────────────────────
  app.post(api.auth.login.path, loginIpLimiter, loginLimiter, (req, res, next) => {
    // Defesa contra o preenchimento automático: gestores de password e o
    // autofill costumam juntar um espaço no fim. Removê-lo evita falsos
    // "palavra-passe incorreta" com credenciais que estão de facto certas.
    if (typeof req.body?.email === "string") req.body.email = req.body.email.trim();
    if (typeof req.body?.password === "string") req.body.password = req.body.password.trim();

    const parsed = api.auth.login.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(401).json({ message: "Email ou palavra-passe incorretos" });
    }
    passport.authenticate("local", (err: unknown, user: User | false) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: "Email ou palavra-passe incorretos" });
      }
      // First factor passed. If 2FA is on, defer the real login: only stash a
      // pending marker in the session and demand the second factor.
      if (isTotpEnabled(user)) {
        req.session.pendingTwoFactorUserId = user.id;
        return res.json({ twoFactorRequired: true });
      }
      establishAuthenticatedSession(req, user, (sessErr) => {
        if (sessErr) return next(sessErr);
        return res.json({ user: toPublicUser(user) });
      });
    })(req, res, next);
  });

  // ────────────────────────── 2FA challenge (login) ───────────────────────
  app.post(api.auth.twoFactor.path, twoFactorLimiter, async (req, res, next) => {
    const pendingId = req.session.pendingTwoFactorUserId;
    if (!pendingId) {
      return res.status(401).json({ message: "Sessão de verificação expirada. Inicie sessão de novo." });
    }
    const parsed = api.auth.twoFactor.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(401).json({ message: "Pedido inválido" });
    }

    const user = await storage.getUserById(pendingId);
    if (!user || !isTotpEnabled(user) || !user.totpSecret) {
      delete req.session.pendingTwoFactorUserId;
      return res.status(401).json({ message: "2FA não está configurado" });
    }

    const { token, recoveryCode } = parsed.data;
    let ok = false;

    if (token) {
      ok = verifyTotp(token, decryptSecret(user.totpSecret));
    }
    if (!ok && recoveryCode) {
      const hash = hashRecoveryCode(recoveryCode);
      const codes = user.totpRecoveryHashes ?? [];
      if (codes.includes(hash)) {
        ok = true;
        // Single use: drop the consumed recovery code.
        await storage.updateUser(user.id, {
          totpRecoveryHashes: codes.filter((c) => c !== hash),
        });
      }
    }

    if (!ok) {
      return res.status(401).json({ message: "Código inválido" });
    }

    // regenerate() below wipes the pending marker along with the old session.
    establishAuthenticatedSession(req, user, (sessErr) => {
      if (sessErr) return next(sessErr);
      return res.json({ user: toPublicUser(user) });
    });
  });

  // ──────────────────────────────── logout ────────────────────────────────
  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy(() => {
        res.clearCookie("rhulany.sid");
        res.status(204).send();
      });
    });
  });

  // ───────────────────────── forgot / reset password ──────────────────────
  app.post(api.auth.forgotPassword.path, passwordResetLimiter, async (req, res) => {
    const parsed = api.auth.forgotPassword.input.safeParse(req.body);
    // Always 204 — never disclose whether the email is registered.
    if (parsed.success) {
      const user = await storage.getUserByEmail(parsed.data.email);
      if (user) {
        const token = issueResetToken(user.id);
        try {
          await sendPasswordResetEmail(user.email, token);
        } catch (err) {
          console.error("Failed to send reset email:", err);
        }
      }
    }
    return res.status(204).send();
  });

  app.post(api.auth.resetPassword.path, passwordResetLimiter, async (req, res) => {
    const parsed = api.auth.resetPassword.input.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const userId = consumeResetToken(parsed.data.token);
    if (userId === null) {
      return res.status(400).json({ message: "Link inválido ou expirado. Peça um novo." });
    }
    const passwordHash = await hashPassword(parsed.data.password);
    await storage.updateUser(userId, { passwordHash });
    return res.status(204).send();
  });

  // ──────────────────────────── 2FA enrolment ─────────────────────────────
  app.post(api.auth.twoFactorSetup.path, requireAuth, async (req, res) => {
    const sessionUser = req.user as User;
    const secret = generateSecretBase32();
    // Store the secret encrypted at rest; keep 2FA disabled until verified.
    await storage.updateUser(sessionUser.id, {
      totpSecret: encryptSecret(secret),
      totpEnabledAt: null,
    });
    return res.json({ secret, uri: totpAuthUri(secret, sessionUser.email, ISSUER) });
  });

  app.post(api.auth.twoFactorEnable.path, requireAuth, async (req, res) => {
    const sessionUser = req.user as User;
    const parsed = api.auth.twoFactorEnable.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Token inválido" });
    }
    const user = await storage.getUserById(sessionUser.id);
    if (!user?.totpSecret) {
      return res.status(400).json({ message: "Inicie a configuração do 2FA primeiro" });
    }
    if (!verifyTotp(parsed.data.token, decryptSecret(user.totpSecret))) {
      return res.status(400).json({ message: "Código incorreto. Tente novamente." });
    }
    const { codes, hashes } = generateRecoveryCodes();
    await storage.updateUser(user.id, {
      totpEnabledAt: new Date(),
      totpRecoveryHashes: hashes,
    });
    return res.json({ recoveryCodes: codes });
  });

  // ──────────────────────────── avatar (próprio) ──────────────────────────
  app.put(api.auth.updateAvatar.path, requireAuth, async (req, res) => {
    const parsed = api.auth.updateAvatar.input.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const sessionUser = req.user as User;
    const updated = await storage.updateUser(sessionUser.id, { avatarUrl: parsed.data.avatarUrl });
    if (!updated) return res.status(401).json({ message: "Não autenticado" });
    return res.json(toPublicUser(updated));
  });

  app.post(api.auth.twoFactorDisable.path, requireAuth, async (req, res) => {
    const sessionUser = req.user as User;
    const parsed = api.auth.twoFactorDisable.input.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Pedido inválido" });
    }
    const user = await storage.getUserById(sessionUser.id);
    if (!user) return res.status(401).json({ message: "Não autenticado" });
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return res.status(400).json({ message: "Palavra-passe incorreta" });
    }
    await storage.updateUser(user.id, {
      totpEnabledAt: null,
      totpSecret: null,
      totpRecoveryHashes: null,
    });
    return res.status(204).send();
  });

  // ─────────────────── alterar a própria palavra-passe (admin) ───────────────────
  // Restrito a administradores: a gestão de palavras-passe é exclusiva do admin.
  // Exige a palavra-passe atual, para que ninguém a mude com uma sessão deixada aberta.
  app.post(api.auth.changePassword.path, requireAdmin, async (req, res) => {
    const parsed = api.auth.changePassword.input.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }
    const sessionUser = req.user as User;
    const user = await storage.getUserById(sessionUser.id);
    if (!user) return res.status(401).json({ message: "Não autenticado" });

    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return res.status(400).json({ message: "A palavra-passe atual está incorreta." });
    }
    const passwordHash = await hashPassword(parsed.data.newPassword);
    await storage.updateUser(user.id, { passwordHash });
    audit(req, "user.password_change", { targetType: "user", targetId: user.id });
    return res.status(204).send();
  });
}

/**
 * Seed a first admin account ONLY when the users table is completely empty
 * (fresh install). On any existing deployment this is a no-op, so it never
 * clobbers or duplicates real accounts. Credentials come from
 * ADMIN_EMAIL / ADMIN_PASSWORD env vars, with sensible dev defaults.
 */
export async function seedAdminUser(): Promise<void> {
  if ((await storage.countUsers()) > 0) return;
  const email = (process.env.ADMIN_EMAIL || "admin@rhulany.mz").toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const passwordHash = await hashPassword(password);
  await storage.createUser({
    email,
    name: process.env.ADMIN_NAME || "Administrador",
    passwordHash,
    role: "admin",
  });
  log(`admin user criado: ${email}`, "auth");
}
