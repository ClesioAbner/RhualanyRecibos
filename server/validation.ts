import type { Response } from "express";
import { z } from "zod";

const isProd = process.env.NODE_ENV === "production";

/**
 * Render a Zod validation failure as a 400 response.
 *
 * In production we deliberately leak NOTHING about the schema: a fixed
 * `{ code, message }` body only. Field names, paths and per-issue messages are
 * a map of the API's expected shape — handing them to an automated scanner
 * (ZAP/Burp) turns every 400 into free reconnaissance. In development we return
 * the full issue list so the shape is easy to debug.
 */
export function sendValidationError(res: Response, err: z.ZodError): Response {
  if (isProd) {
    return res.status(400).json({
      code: "VALIDATION_ERROR",
      message: "Dados inválidos",
    });
  }
  return res.status(400).json({
    code: "VALIDATION_ERROR",
    message: "Dados inválidos",
    field: err.errors[0]?.path?.join("."),
    issues: err.issues,
  });
}
