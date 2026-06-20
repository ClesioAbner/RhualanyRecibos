import type { Express, RequestHandler } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { pool } from "../db";
import { storage } from "../storage";
import { verifyPassword, burnTimingBudget } from "./passwords";
import { toPublicUser, type User as SchemaUser } from "@shared/schema";

const EIGHT_HOURS_MS = 8 * 60 * 60 * 1000;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    // passport's req.user — full server-side record.
    interface User extends SchemaUser {}
  }
}

declare module "express-session" {
  interface SessionData {
    /** Set after first-factor success when the account requires 2FA. */
    pendingTwoFactorUserId?: number;
  }
}

const isProd = process.env.NODE_ENV === "production";

/**
 * Wires session storage (Postgres via connect-pg-simple), Passport, and the
 * LocalStrategy. Must run before any route that reads `req.user`.
 */
export function setupAuth(app: Express): void {
  const PgStore = connectPgSimple(session);

  if (isProd) {
    // Required so `secure` cookies work behind a reverse proxy / load balancer.
    app.set("trust proxy", 1);
  }

  const secret = process.env.SESSION_SECRET;
  if (!secret && isProd) {
    throw new Error("SESSION_SECRET must be set in production");
  }

  app.use(
    session({
      store: new PgStore({
        pool,
        tableName: "user_sessions",
        // Cria a tabela de sessões automaticamente se faltar (ex.: numa base de
        // dados nova, como o deploy no Render/Neon). É idempotente: não toca numa
        // tabela já existente.
        createTableIfMissing: true,
      }),
      secret: secret || "dev-only-insecure-secret-change-me",
      resave: false,
      saveUninitialized: false,
      name: "rhulany.sid",
      cookie: {
        httpOnly: true,
        secure: isProd,
        sameSite: "lax",
        maxAge: EIGHT_HOURS_MS,
      },
    }),
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            // Timing-oracle defense: spend the same bcrypt time as a real
            // verification so attackers can't tell missing emails apart by
            // measuring response latency.
            await burnTimingBudget(password);
            return done(null, false);
          }
          const ok = await verifyPassword(password, user.passwordHash);
          if (!ok) return done(null, false);
          // Disabled accounts can authenticate the password but not log in.
          if (!user.active) return done(null, false);
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  passport.serializeUser((user, done) => {
    done(null, (user as SchemaUser).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUserById(id);
      done(null, user ?? false);
    } catch (err) {
      done(err);
    }
  });
}

/** Guard for routes that require a fully authenticated session. */
export const requireAuth: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated?.() && req.user) return next();
  return res.status(401).json({ message: "Não autenticado" });
};

/**
 * Guard for admin-only routes. Runs after authentication: an unauthenticated
 * caller gets 401, an authenticated non-admin gets 403 (so the client can tell
 * "log in" from "you don't have permission").
 */
export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.isAuthenticated?.() || !req.user) {
    return res.status(401).json({ message: "Não autenticado" });
  }
  if ((req.user as SchemaUser).role !== "admin") {
    return res.status(403).json({ message: "Acesso restrito a administradores" });
  }
  return next();
};

export { toPublicUser };
