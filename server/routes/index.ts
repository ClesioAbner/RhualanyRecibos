import type { Express } from "express";
import type { Server } from "http";
import { storage } from "../storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { setupAuth, requireAuth } from "../auth/index";
import { registerAuthRoutes, seedAdminUser } from "../auth/routes";
import { registerSchoolRoutes, seedClasses } from "./school";
import { registerAdminRoutes } from "./admin";
import { sendValidationError } from "../validation";
import { audit } from "../audit";
import { amountToWordsMt, buildPdfForReceipts } from "../pdf/receiptPdf";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Session + Passport must be wired before any route reads req.user.
  setupAuth(app);

  // ─── DEV: auto-login (atalho opcional para entrar sem credenciais) ────────
  // DESLIGADO por omissão: o login é SEMPRE obrigatório, mesmo em localhost.
  // Para reactivar o atalho durante o desenvolvimento, defina DEV_AUTOLOGIN=true
  // (nunca em produção — o atalho é ignorado quando NODE_ENV === "production").
  if (process.env.NODE_ENV !== "production" && process.env.DEV_AUTOLOGIN === "true") {
    app.use(async (req, _res, next) => {
      if (req.isAuthenticated?.() && req.user) return next();
      try {
        const admin = await storage.getUserByEmail(process.env.ADMIN_EMAIL || "admin@rhulany.mz");
        if (admin) return req.login(admin, () => next());
      } catch {
        /* ignora — segue para o login normal */
      }
      next();
    });
    console.log("[auth] DEV_AUTOLOGIN activo — login dispensado (apenas em desenvolvimento)");
  }

  registerAuthRoutes(app);
  registerSchoolRoutes(app);
  registerAdminRoutes(app);
  function zodErrorToBadRequest(res: any, err: unknown) {
    if (err instanceof z.ZodError) {
      return sendValidationError(res, err);
    }
    throw err;
  }
  // ═══════════════════════════════════════════════════════════════
  // ROUTES
  // ═══════════════════════════════════════════════════════════════
  app.get(api.settings.get.path, requireAuth, async (_req, res) => {
    const s = await storage.getSettings();
    if (!s.secretaryName) return res.json({ secretaryName: "" });
    res.json(s);
  });

  app.put(api.settings.update.path, requireAuth, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const updated = await storage.updateSettings(input);
      res.json(updated);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  app.get(api.receipts.list.path, requireAuth, async (req, res) => {
    const input = api.receipts.list.input?.safeParse(req.query);
    const filters = input?.success ? input.data : undefined;
    const list = await storage.listReceipts(filters as any);
    res.json(list);
  });

  app.get(api.receipts.get.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    const r = await storage.getReceipt(id);
    if (!r) return res.status(404).json({ message: "Recibo não encontrado" });
    res.json(r);
  });

  app.post(api.receipts.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.receipts.create.input.parse(req.body);
      const s = await storage.getSettings();
      if (!s.secretaryName) {
        return res
          .status(400)
          .json({ message: "Defina o nome da Chefe da Secretaria nas definições" });
      }
      const amountPaid    = Number(input.amountPaid);
      const ivaAmount     = amountPaid * 0.05;
      const amountInWords = amountToWordsMt(amountPaid);
      const created = await storage.createReceipt({
        ...input,
        secretaryName: s.secretaryName,
        amountPaid:    amountPaid as any,
        ivaAmount:     ivaAmount  as any,
        amountInWords,
      } as any);
      res.status(201).json(created);
    } catch (err) {
      // Índice único: mensalidade já emitida para este aluno/mês.
      const code = (err as any)?.code ?? (err as any)?.cause?.code;
      if (code === "23505") {
        return res.status(400).json({
          code: "DUPLICATE_MONTH",
          message: "Já existe um recibo de mensalidade deste aluno para o mês indicado.",
        });
      }
      return zodErrorToBadRequest(res, err);
    }
  });

  app.put(api.receipts.update.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    try {
      const updates     = api.receipts.update.input?.parse(req.body) ?? {};
      const normalized: any = { ...updates };
      if (typeof normalized.amountPaid !== "undefined") {
        normalized.amountPaid    = Number(normalized.amountPaid);
        normalized.amountInWords = amountToWordsMt(Number(normalized.amountPaid));
      }
      const updated = await storage.updateReceipt(id, normalized);
      if (!updated)
        return res.status(404).json({ message: "Recibo não encontrado" });
      res.json(updated);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  app.delete(api.receipts.delete.path, requireAuth, async (req, res) => {
    const id = Number(req.params.id);
    // Justificação obrigatória — sem ela, não se apaga.
    const parsed = api.receipts.delete.input.safeParse(req.body);
    if (!parsed.success) {
      return zodErrorToBadRequest(res, parsed.error);
    }
    const existing = await storage.getReceipt(id);
    if (!existing) return res.status(404).json({ message: "Recibo não encontrado" });

    const ok = await storage.deleteReceipt(id);
    if (!ok) return res.status(404).json({ message: "Recibo não encontrado" });

    // Regista quem apagou, qual recibo e porquê (controlo/auditoria).
    audit(req, "receipt.delete", {
      targetType: "receipt",
      targetId: id,
      metadata: {
        reason: parsed.data.reason,
        receiptNumber: existing.receiptNumber,
        studentName: existing.studentName,
        amountPaid: existing.amountPaid,
      },
    });
    res.status(204).send();
  });

  app.post(api.receipts.pdf.path, requireAuth, async (req, res) => {
    try {
      const input = api.receipts.pdf.input.parse(req.body);
      const pdf   = await buildPdfForReceipts(input.receiptIds);
      if (!pdf.pdfBase64)
        return res.status(404).json({ message: "Nenhum recibo encontrado" });
      res.json(pdf);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  // ─── seed ──────────────────────────────────────────────────────
  async function seedDatabase() {
    const s = await storage.getSettings();
    if (!s.secretaryName)
      await storage.updateSettings({ secretaryName: "Chefe da Secretaria" });
    const existing = await storage.listReceipts();
    if (existing.length > 0) return;
    const sec = (await storage.getSettings()).secretaryName || "Chefe da Secretaria";
    await storage.createReceipt({ secretaryName: sec, studentName: "Ana Matavele",   studentClass: "3ª", studentNumber: "A-1023",    guardianName: "Carlos Matavele", paymentDescription: "Propina - Fevereiro", paymentMethod: "M-Pesa",   amountPaid: 1500.0 as any, amountInWords: amountToWordsMt(1500.0) } as any);
    await storage.createReceipt({ secretaryName: sec, studentName: "João Nhantumbo", studentClass: "6ª", studentNumber: "B-558",      guardianName: "Rosa Nhantumbo",   paymentDescription: "Matrícula",           paymentMethod: "Dinheiro", amountPaid: 750.5  as any, amountInWords: amountToWordsMt(750.5)  } as any);
    await storage.createReceipt({ secretaryName: sec, studentName: "Marta Sitoe",    studentClass: "1ª", studentNumber: null as any,  guardianName: "Nelson Sitoe",     paymentDescription: "Uniforme",            paymentMethod: "e-Mola",   amountPaid: 980.0  as any, amountInWords: amountToWordsMt(980.0)  } as any);
  }

  seedClasses().catch((err) => console.error("seedClasses failed:", err));
  seedDatabase().catch(() => {});
  seedAdminUser().catch((err) => console.error("seedAdminUser failed:", err));

  return httpServer;
}