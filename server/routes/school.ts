import type { Express, Request, Response } from "express";
import { z } from "zod";
import { api } from "@shared/routes";
import { storage } from "../storage";
import { requireAuth, requireAdmin } from "../auth/index";
import { sendValidationError } from "../validation";
import { audit } from "../audit";

// ── helpers ───────────────────────────────────────────────────────────────
const idOf = (req: Request) => Number(req.params.id);

/** Postgres SQLSTATE, whether the error is raw or wrapped by drizzle. */
function pgCode(err: any): string | undefined {
  return err?.code ?? err?.cause?.code;
}

/** Map known DB constraint violations to friendly 400s; rethrow the rest. */
function handleDbError(res: Response, err: unknown): Response {
  if (err instanceof z.ZodError) return sendValidationError(res, err);
  const code = pgCode(err);
  if (code === "23505") {
    return res.status(400).json({ code: "DUPLICATE", message: "Já existe um registo com esses dados (valor duplicado)." });
  }
  if (code === "23503") {
    return res.status(409).json({ code: "FK_CONFLICT", message: "Operação bloqueada por registos dependentes." });
  }
  throw err;
}

const moneyToStr = (n: number | undefined | null) =>
  n === undefined || n === null ? undefined : String(n);

export function registerSchoolRoutes(app: Express): void {
  // ═══════════════════════════ classes (turmas) ═══════════════════════════
  app.get(api.classes.list.path, requireAuth, async (req, res) => {
    const parsed = api.classes.list.input?.safeParse(req.query);
    const filters = parsed?.success ? parsed.data : undefined;
    res.json(await storage.listClasses(filters));
  });

  app.get(api.classes.get.path, requireAuth, async (req, res) => {
    const row = await storage.getClass(idOf(req));
    if (!row) return res.status(404).json({ message: "Turma não encontrada" });
    res.json(row);
  });

  app.post(api.classes.create.path, requireAdmin, async (req, res) => {
    try {
      const input = api.classes.create.input.parse(req.body);
      const created = await storage.createClass({
        name: input.name,
        level: input.level,
        monthlyFee: String(input.monthlyFee),
        ...(input.active !== undefined ? { active: input.active } : {}),
      });
      audit(req, "class.created", { targetType: "class", targetId: created.id, metadata: { name: created.name } });
      res.status(201).json(created);
    } catch (err) {
      return handleDbError(res, err);
    }
  });

  app.put(api.classes.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.classes.update.input.parse(req.body);
      const updates: any = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.level !== undefined) updates.level = input.level;
      if (input.monthlyFee !== undefined) updates.monthlyFee = moneyToStr(input.monthlyFee);
      if (input.active !== undefined) updates.active = input.active;
      const updated = await storage.updateClass(idOf(req), updates);
      if (!updated) return res.status(404).json({ message: "Turma não encontrada" });
      audit(req, "class.updated", { targetType: "class", targetId: updated.id, metadata: updates });
      res.json(updated);
    } catch (err) {
      return handleDbError(res, err);
    }
  });

  app.delete(api.classes.delete.path, requireAdmin, async (req, res) => {
    const id = idOf(req);
    const cls = await storage.getClass(id);
    if (!cls) return res.status(404).json({ message: "Turma não encontrada" });
    const studentCount = await storage.countStudentsInClass(id);
    // Apaga a turma e os alunos em cascata (recibos antigos preservados).
    await storage.deleteClassCascade(id);
    audit(req, "class.deleted", { targetType: "class", targetId: id, metadata: { name: cls.name, students: studentCount } });
    res.status(204).send();
  });

  // ═══════════════════════════ students (alunos) ══════════════════════════
  app.get(api.students.list.path, requireAuth, async (req, res) => {
    const parsed = api.students.list.input?.safeParse(req.query);
    const filters = parsed?.success ? parsed.data : undefined;
    res.json(await storage.listStudents(filters));
  });

  app.get(api.students.get.path, requireAuth, async (req, res) => {
    const row = await storage.getStudent(idOf(req));
    if (!row) return res.status(404).json({ message: "Aluno não encontrado" });
    res.json(row);
  });

  app.post(api.students.create.path, requireAuth, async (req, res) => {
    try {
      const input = api.students.create.input.parse(req.body);
      const cls = await storage.getClass(input.classId);
      if (!cls) {
        return res.status(400).json({ code: "VALIDATION_ERROR", message: "Turma inválida", field: "classId" });
      }
      const created = await storage.createStudent({
        classId: input.classId,
        fullName: input.fullName,
        internalNumber: input.internalNumber ?? null,
        birthdate: input.birthdate ?? null,
        monthlyFeeOverride: moneyToStr(input.monthlyFeeOverride) ?? null,
        ...(input.active !== undefined ? { active: input.active } : {}),
      });
      audit(req, "student.created", { targetType: "student", targetId: created.id, metadata: { fullName: created.fullName, classId: created.classId } });
      res.status(201).json(created);
    } catch (err) {
      return handleDbError(res, err);
    }
  });

  app.put(api.students.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.students.update.input.parse(req.body);
      const updates: any = {};
      if (input.classId !== undefined) {
        const cls = await storage.getClass(input.classId);
        if (!cls) {
          return res.status(400).json({ code: "VALIDATION_ERROR", message: "Turma inválida", field: "classId" });
        }
        updates.classId = input.classId;
      }
      if (input.fullName !== undefined) updates.fullName = input.fullName;
      if (input.internalNumber !== undefined) updates.internalNumber = input.internalNumber ?? null;
      if (input.birthdate !== undefined) updates.birthdate = input.birthdate ?? null;
      if (input.monthlyFeeOverride !== undefined)
        updates.monthlyFeeOverride = moneyToStr(input.monthlyFeeOverride) ?? null;
      if (input.active !== undefined) updates.active = input.active;
      const updated = await storage.updateStudent(idOf(req), updates);
      if (!updated) return res.status(404).json({ message: "Aluno não encontrado" });
      audit(req, "student.updated", { targetType: "student", targetId: updated.id, metadata: updates });
      res.json(updated);
    } catch (err) {
      return handleDbError(res, err);
    }
  });

  app.delete(api.students.delete.path, requireAdmin, async (req, res) => {
    const id = idOf(req);
    const ok = await storage.deleteStudent(id);
    if (!ok) return res.status(404).json({ message: "Aluno não encontrado" });
    audit(req, "student.deleted", { targetType: "student", targetId: id });
    res.status(204).send();
  });

  // ═══════════════════════════ guardians (encarregados) ═══════════════════
  app.get(api.guardians.listByStudent.path, requireAuth, async (req, res) => {
    const student = await storage.getStudent(idOf(req));
    if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
    res.json(await storage.listGuardiansByStudent(student.id));
  });

  app.post(api.guardians.create.path, requireAuth, async (req, res) => {
    try {
      const student = await storage.getStudent(idOf(req));
      if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
      const input = api.guardians.create.input.parse(req.body);
      const created = await storage.createGuardian(student.id, {
        fullName: input.fullName,
        relationship: input.relationship,
        phone: input.phone ?? null,
        email: input.email ?? null,
        isPrimary: input.isPrimary ?? false,
      });
      res.status(201).json(created);
    } catch (err) {
      return handleDbError(res, err);
    }
  });

  app.put(api.guardians.update.path, requireAdmin, async (req, res) => {
    try {
      const input = api.guardians.update.input.parse(req.body);
      const updates: any = {};
      if (input.fullName !== undefined) updates.fullName = input.fullName;
      if (input.relationship !== undefined) updates.relationship = input.relationship;
      if (input.phone !== undefined) updates.phone = input.phone ?? null;
      if (input.email !== undefined) updates.email = input.email ?? null;
      if (input.isPrimary !== undefined) updates.isPrimary = input.isPrimary;
      const updated = await storage.updateGuardian(idOf(req), updates);
      if (!updated) return res.status(404).json({ message: "Encarregado não encontrado" });
      res.json(updated);
    } catch (err) {
      return handleDbError(res, err);
    }
  });

  app.delete(api.guardians.delete.path, requireAdmin, async (req, res) => {
    const ok = await storage.deleteGuardian(idOf(req));
    if (!ok) return res.status(404).json({ message: "Encarregado não encontrado" });
    res.status(204).send();
  });

  // ═══════════════════════════ admin dashboard ════════════════════════════
  app.get(api.admin.stats.path, requireAdmin, async (_req, res) => {
    res.json(await storage.getAdminStats());
  });
}

// ── seed: garante as turmas 1ª–7ª classe (primária) ─────────────────────────
// Idempotente: cria apenas as que faltam (por nome), por isso é seguro correr
// em cada arranque sem duplicar nem mexer nas turmas já existentes.
export async function seedClasses(): Promise<void> {
  const existing = await storage.listClasses();
  const have = new Set(existing.map((c) => c.name));
  const ordinais = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª", "7ª"];
  for (const o of ordinais) {
    const name = `${o} Classe`;
    if (have.has(name)) continue;
    await storage.createClass({ name, level: "primaria", monthlyFee: "1500", active: true });
  }
}
