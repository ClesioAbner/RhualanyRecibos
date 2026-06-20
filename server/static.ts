import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(
      `Could not find the build directory: ${distPath}, make sure to build the client first`,
    );
  }

  app.use(express.static(distPath));

  // Serve the SPA shell for browser navigations only. Using app.get (not
  // app.use) means a POST/PUT/DELETE to a path that no API route claimed falls
  // through to the generic 404 instead of getting 200 + HTML — otherwise an
  // attacker could enumerate which API endpoints exist by varying the method.
  app.get("/{*path}", (_req, res) => {
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
