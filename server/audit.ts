import type { Request } from "express";
import { storage } from "./storage";
import type { User } from "@shared/schema";

/**
 * Write an audit-log entry from an authenticated request, capturing actor +
 * IP + user-agent. Fire-and-forget: auditing must never break the mutation it
 * records, so failures are swallowed (logged to console only).
 */
export function audit(
  req: Request,
  action: string,
  opts?: { targetType?: string; targetId?: string | number; metadata?: unknown },
): void {
  const actor = req.user as User | undefined;
  storage
    .writeAudit({
      action,
      actorUserId: actor?.id ?? null,
      actorEmail: actor?.email ?? null,
      targetType: opts?.targetType ?? null,
      targetId: opts?.targetId != null ? String(opts.targetId) : null,
      ip: req.ip ?? null,
      userAgent: req.headers["user-agent"] ?? null,
      metadata: opts?.metadata ?? null,
    })
    .catch((err) => console.error("audit write failed:", action, err?.message));
}
