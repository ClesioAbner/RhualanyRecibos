import type { Express, Request, Response, NextFunction } from "express";
import helmet from "helmet";

const isProd = process.env.NODE_ENV === "production";

/**
 * Wires the transport-level hardening that sits in front of every route:
 *   - hides the Express fingerprint (x-powered-by)
 *   - sets security headers via Helmet (CSP/HSTS/X-Frame-Options/nosniff)
 *   - enforces a CORS origin allowlist
 *
 * Call this FIRST on the app, before sessions, body parsers or routes, so a
 * rejected cross-origin request never touches the session store.
 */
export function setupSecurity(app: Express): void {
  // (7) Don't advertise the framework — one less hint for fingerprinting tools.
  app.disable("x-powered-by");

  applyHelmet(app);
  applyCors(app);
}

/** (5) Security headers. Strict in prod; relaxed in dev so Vite HMR works. */
function applyHelmet(app: Express): void {
  if (!isProd) {
    // Vite injects inline scripts and talks over a WebSocket for HMR; a strict
    // CSP would break the dev server. Drop CSP + HSTS, keep the cheap wins
    // (nosniff, frameguard, etc.).
    app.use(
      helmet({
        contentSecurityPolicy: false,
        hsts: false,
      }),
    );
    return;
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        useDefaults: true,
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          // Radix/framer-motion set inline style attributes at runtime, so the
          // style source must allow 'unsafe-inline'. Scripts stay locked down.
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:"],
          fontSrc: ["'self'", "data:"],
          connectSrc: ["'self'"],
          objectSrc: ["'none'"],
          frameAncestors: ["'none'"], // belt-and-braces with X-Frame-Options
          baseUri: ["'self'"],
          formAction: ["'self'"],
          upgradeInsecureRequests: [],
        },
      },
      // HSTS: force HTTPS for 180 days, including subdomains.
      hsts: { maxAge: 15552000, includeSubDomains: true },
      // X-Frame-Options: DENY — no framing at all (clickjacking defense).
      frameguard: { action: "deny" },
      // X-Content-Type-Options: nosniff is on by default; left explicit here.
      noSniff: true,
    }),
  );
}

/**
 * (6) Manual CORS with an allowlist from ALLOWED_ORIGINS (comma-separated).
 *
 * Policy:
 *   - No Origin header (same-origin GETs, curl, server-to-server) → pass through
 *     untouched; CORS is a browser-only concern.
 *   - Origin whose host matches the request Host → same-origin → allow, no
 *     CORS headers needed.
 *   - Origin on the allowlist → echo it back with credentials enabled.
 *   - Any other Origin → 403, and crucially NO Allow-Origin header, so the
 *     browser blocks the response regardless.
 */
function applyCors(app: Express): void {
  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);

  app.use((req: Request, res: Response, next: NextFunction) => {
    const origin = req.headers.origin;
    if (!origin) return next();

    // Same-origin: the browser still sends Origin on non-GET requests. If it
    // points at the host we're serving, it's not cross-origin — let it by.
    const host = req.headers.host;
    try {
      if (host && new URL(origin).host === host) return next();
    } catch {
      // Malformed Origin → treat as cross-origin and fall through to the check.
    }

    if (allowed.includes(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
      res.header("Access-Control-Allow-Headers", "Content-Type");
      if (req.method === "OPTIONS") return res.sendStatus(204);
      return next();
    }

    return res.status(403).json({ code: "FORBIDDEN_ORIGIN", message: "Origem não permitida" });
  });
}
