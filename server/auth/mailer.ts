import nodemailer, { type Transporter } from "nodemailer";
import { log } from "../index";

/**
 * Email delivery. Uses SMTP when configured via env, otherwise falls back to
 * logging the message server-side (dev). Configure with:
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, [SMTP_SECURE=true], [MAIL_FROM]
 */

function appBaseUrl(): string {
  return process.env.APP_URL?.replace(/\/+$/, "") || "http://localhost:3000";
}

let transporter: Transporter | null | undefined; // undefined = not yet resolved

function getTransporter(): Transporter | null {
  if (transporter !== undefined) return transporter;
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_PORT) {
    transporter = null; // not configured → console fallback
    return transporter;
  }
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: SMTP_SECURE === "true" || Number(SMTP_PORT) === 465,
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

const FROM = process.env.MAIL_FROM || "Colégio Rhulany <no-reply@rhulany.mz>";

async function deliver(to: string, subject: string, text: string, html: string): Promise<void> {
  const tx = getTransporter();
  if (!tx) {
    // Dev fallback: no SMTP configured.
    log(`[mail] (no SMTP) to=${to} subject="${subject}"\n${text}`, "mailer");
    return;
  }
  await tx.sendMail({ from: FROM, to, subject, text, html });
  log(`[mail] sent to=${to} subject="${subject}"`, "mailer");
}

export async function sendPasswordResetEmail(to: string, token: string): Promise<void> {
  const link = `${appBaseUrl()}/reset-password?token=${token}`;
  const subject = "Reposição de palavra-passe · Colégio Rhulany";
  const text = [
    "Recebemos um pedido para repor a sua palavra-passe.",
    "",
    `Abra este link (válido por 30 minutos): ${link}`,
    "",
    "Se não foi você, ignore este email — nada será alterado.",
  ].join("\n");
  const html = `
    <div style="font-family:system-ui,Arial,sans-serif;max-width:480px;margin:0 auto;color:#0f172a">
      <h2 style="color:#1a3a6b">Reposição de palavra-passe</h2>
      <p>Recebemos um pedido para repor a sua palavra-passe.</p>
      <p style="margin:24px 0">
        <a href="${link}" style="background:#2563eb;color:#fff;padding:12px 22px;border-radius:10px;text-decoration:none;font-weight:600">
          Repor palavra-passe
        </a>
      </p>
      <p style="color:#64748b;font-size:13px">O link é válido por 30 minutos. Se não foi você, ignore este email — nada será alterado.</p>
    </div>`;
  await deliver(to, subject, text, html);
}
