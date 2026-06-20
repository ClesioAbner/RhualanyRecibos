import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { setupSecurity } from "./security";
import { createServer } from "http";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

// Transport-level hardening (fingerprint, headers, CORS allowlist) must run
// before sessions, body parsing and routes.
setupSecurity(app);

app.use(
  express.json({
    // Avatares são enviados como data URL base64 — ~100kb (limite default) não
    // chega. O cliente reduz a imagem para ~256px, mas damos folga até 3mb.
    limit: "3mb",
    verify: (req, _res, buf) => {
      req.rawBody = buf;
    },
  }),
);

app.use(express.urlencoded({ extended: false }));

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    // Regista apenas a API: método, caminho, estado e tempo — sem o corpo da
    // resposta (evita despejar objetos grandes, como a foto/sessão, no terminal).
    if (path.startsWith("/api")) {
      log(`${req.method} ${path} ${res.statusCode} in ${Date.now() - start}ms`);
    }
  });

  next();
});

(async () => {
  await registerRoutes(httpServer, app);

  // Any /api/* path no route claimed → a generic 404 (any method). Never echo
  // the path or list valid endpoints: that's free recon for an API scanner.
  app.use("/api", (_req, res) => {
    res.status(404).json({ code: "NOT_FOUND", message: "Não encontrado" });
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes.
  // The SPA fallback is GET-only (see static.ts / vite.ts), so non-GET requests
  // to unknown paths fall through to the generic 404 below.
  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // Catch-all 404 for anything that fell through (e.g. a non-GET to an unknown
  // non-API path). Same opaque body as the API 404.
  app.use((_req, res) => {
    res.status(404).json({ code: "NOT_FOUND", message: "Não encontrado" });
  });

  // Error handler is LAST so it sees errors from every layer above.
  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    console.error("Internal Server Error:", err);

    if (res.headersSent) {
      return next(err);
    }

    return res.status(status).json({ message });
  });

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || "3000", 10);
  httpServer.listen(port, "0.0.0.0", () => {
    log(`serving on port ${port}`);
  });
})();

