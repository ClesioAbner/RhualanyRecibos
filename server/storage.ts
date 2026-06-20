import { db } from "./db";
import {
  receipts,
  settings,
  users,
  classes,
  students,
  guardians,
  receiptVersions,
  auditLog,
  statements,
  type ReceiptResponse,
  type CreateReceiptRequest,
  type UpdateReceiptRequest,
  type User,
  type InsertUser,
  type ClassRow,
  type InsertClass,
  type Student,
  type InsertStudent,
  type Guardian,
  type InsertGuardian,
  type AuditLog,
} from "@shared/schema";
import { and, desc, eq, ilike, isNotNull, isNull, lt, or, sql } from "drizzle-orm";

export type StudentFilters = { classId?: number; q?: string; active?: boolean };

export type ReceiptAdminFilters = {
  q?: string;
  method?: string;
  studentId?: number;
  includeVoided?: boolean;
};

export type PendingPayment = {
  studentId: number;
  fullName: string;
  internalNumber: string | null;
  classId: number;
  className: string;
  expected: number;
  referenceMonth: string;
};

export type AuditEntry = {
  action: string;
  actorUserId?: number | null;
  actorEmail?: string | null;
  targetType?: string | null;
  targetId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: unknown;
};

export type AdminStats = {
  totals: {
    students: number;
    activeStudents: number;
    classes: number;
    guardians: number;
    receiptsThisMonth: number;
    revenueThisMonth: number;
    revenueTotal: number;
  };
  studentsByClass: { classId: number; name: string; level: string; count: number }[];
  revenueByMonth: { month: string; total: number }[];
  receiptsByType: { type: string; count: number; total: number }[];
  paymentsByMethod: { method: string; count: number; total: number }[];
  recentReceipts: ReceiptResponse[];
};

export interface IStorage {
  getSettings(): Promise<{ secretaryName: string }>;
  updateSettings(input: { secretaryName: string }): Promise<{ secretaryName: string }>;

  getUserById(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(input: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined>;
  countUsers(): Promise<number>;

  listReceipts(filters?: {
    q?: string;
    receiptNumber?: number;
    date?: string;
  }): Promise<ReceiptResponse[]>;
  getReceipt(id: number): Promise<ReceiptResponse | undefined>;
  createReceipt(input: CreateReceiptRequest): Promise<ReceiptResponse>;
  updateReceipt(id: number, updates: UpdateReceiptRequest): Promise<ReceiptResponse | undefined>;
  deleteReceipt(id: number): Promise<boolean>;

  getNextReceiptNumber(): Promise<number>;
}

export class DatabaseStorage implements IStorage {
  async getSettings(): Promise<{ secretaryName: string }> {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, "secretaryName"));
    return { secretaryName: row?.value ?? "" };
  }

  async updateSettings(input: { secretaryName: string }): Promise<{ secretaryName: string }> {
    await db
      .insert(settings)
      .values({ key: "secretaryName", value: input.secretaryName })
      .onConflictDoUpdate({
        target: settings.key,
        set: { value: input.secretaryName },
      });
    return { secretaryName: input.secretaryName };
  }

  // ───────────────────────────── users ─────────────────────────────
  async getUserById(id: number): Promise<User | undefined> {
    const [row] = await db.select().from(users).where(eq(users.id, id));
    return row;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [row] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.trim().toLowerCase()));
    return row;
  }

  async createUser(input: InsertUser): Promise<User> {
    const [row] = await db
      .insert(users)
      .values({ ...input, email: input.email.trim().toLowerCase() })
      .returning();
    return row;
  }

  async updateUser(id: number, updates: Partial<InsertUser>): Promise<User | undefined> {
    const [row] = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return row;
  }

  async countUsers(): Promise<number> {
    const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(users);
    return row?.n ?? 0;
  }

  async listReceipts(filters?: {
    q?: string;
    receiptNumber?: number;
    date?: string;
  }): Promise<ReceiptResponse[]> {
    const whereParts: any[] = [];
    if (filters?.receiptNumber) {
      whereParts.push(eq(receipts.receiptNumber, filters.receiptNumber));
    }
    if (filters?.date) {
      whereParts.push(eq(receipts.issueDate, filters.date));
    }
    if (filters?.q && filters.q.trim().length > 0) {
      const q = `%${filters.q.trim()}%`;
      whereParts.push(
        or(
          ilike(receipts.studentName, q),
          ilike(receipts.paymentDescription, q),
          ilike(receipts.guardianName, q),
          ilike(receipts.studentNumber, q),
        ),
      );
    }

    const where = whereParts.length ? and(...whereParts) : undefined;

    const rows = await db
      .select()
      .from(receipts)
      .where(where)
      .orderBy(desc(receipts.receiptNumber));
    return rows;
  }

  async getReceipt(id: number): Promise<ReceiptResponse | undefined> {
    const [row] = await db.select().from(receipts).where(eq(receipts.id, id));
    return row;
  }

  async getNextReceiptNumber(): Promise<number> {
    const [row] = await db
      .select({ max: sql<number>`coalesce(max(${receipts.receiptNumber}), 0)` })
      .from(receipts);
    return (row?.max ?? 0) + 1;
  }

  async createReceipt(input: CreateReceiptRequest): Promise<ReceiptResponse> {
    const next = await this.getNextReceiptNumber();
    const [row] = await db
      .insert(receipts)
      .values({
        ...(input as any), // receiptType is a varchar-backed union; drizzle-zod widens it to string
        receiptNumber: next,
        issueDate: new Date().toISOString().slice(0, 10),
      })
      .returning();
    return row;
  }

  async updateReceipt(
    id: number,
    updates: UpdateReceiptRequest,
  ): Promise<ReceiptResponse | undefined> {
    const [row] = await db
      .update(receipts)
      .set(updates as any)
      .where(eq(receipts.id, id))
      .returning();
    return row;
  }

  async deleteReceipt(id: number): Promise<boolean> {
    const [row] = await db.delete(receipts).where(eq(receipts.id, id)).returning();
    return Boolean(row);
  }

  // ───────────────────────────── classes ─────────────────────────────
  async listClasses(filters?: { active?: boolean }): Promise<ClassRow[]> {
    const where =
      typeof filters?.active === "boolean" ? eq(classes.active, filters.active) : undefined;
    return db.select().from(classes).where(where).orderBy(classes.name);
  }

  async getClass(id: number): Promise<ClassRow | undefined> {
    const [row] = await db.select().from(classes).where(eq(classes.id, id));
    return row;
  }

  async createClass(input: InsertClass): Promise<ClassRow> {
    const [row] = await db.insert(classes).values(input).returning();
    return row;
  }

  async updateClass(id: number, updates: Partial<InsertClass>): Promise<ClassRow | undefined> {
    const [row] = await db
      .update(classes)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(classes.id, id))
      .returning();
    return row;
  }

  /** Count students in a class — used to block deletion (FK restrict) cleanly. */
  async countStudentsInClass(classId: number): Promise<number> {
    const [row] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(students)
      .where(eq(students.classId, classId));
    return row?.n ?? 0;
  }

  async deleteClass(id: number): Promise<boolean> {
    const [row] = await db.delete(classes).where(eq(classes.id, id)).returning();
    return Boolean(row);
  }

  /**
   * Apaga a turma e, em cascata, os seus alunos (e respectivos encarregados).
   * Os recibos antigos são preservados — a FK receipts.student_id é SET NULL,
   * mantendo o nome/turma já guardados no recibo.
   */
  async deleteClassCascade(id: number): Promise<boolean> {
    return db.transaction(async (tx) => {
      await tx.delete(students).where(eq(students.classId, id));
      const [row] = await tx.delete(classes).where(eq(classes.id, id)).returning();
      return Boolean(row);
    });
  }

  // ───────────────────────────── students ─────────────────────────────
  async listStudents(filters?: StudentFilters): Promise<Student[]> {
    const parts: any[] = [];
    if (filters?.classId) parts.push(eq(students.classId, filters.classId));
    if (typeof filters?.active === "boolean") parts.push(eq(students.active, filters.active));
    if (filters?.q && filters.q.trim()) {
      const q = `%${filters.q.trim()}%`;
      parts.push(or(ilike(students.fullName, q), ilike(students.internalNumber, q)));
    }
    const where = parts.length ? and(...parts) : undefined;
    return db.select().from(students).where(where).orderBy(students.fullName);
  }

  async getStudent(id: number): Promise<Student | undefined> {
    const [row] = await db.select().from(students).where(eq(students.id, id));
    return row;
  }

  async createStudent(input: InsertStudent): Promise<Student> {
    const enrolledAt = input.enrolledAt ?? new Date().toISOString().slice(0, 10);
    const [row] = await db.insert(students).values({ ...input, enrolledAt }).returning();
    return row;
  }

  async updateStudent(id: number, updates: Partial<InsertStudent>): Promise<Student | undefined> {
    const [row] = await db
      .update(students)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(students.id, id))
      .returning();
    return row;
  }

  async deleteStudent(id: number): Promise<boolean> {
    const [row] = await db.delete(students).where(eq(students.id, id)).returning();
    return Boolean(row);
  }

  // ───────────────────────────── guardians ─────────────────────────────
  async listGuardiansByStudent(studentId: number): Promise<Guardian[]> {
    return db
      .select()
      .from(guardians)
      .where(eq(guardians.studentId, studentId))
      .orderBy(desc(guardians.isPrimary), guardians.fullName);
  }

  async getGuardian(id: number): Promise<Guardian | undefined> {
    const [row] = await db.select().from(guardians).where(eq(guardians.id, id));
    return row;
  }

  async createGuardian(studentId: number, input: Omit<InsertGuardian, "studentId">): Promise<Guardian> {
    return db.transaction(async (tx) => {
      if (input.isPrimary) {
        // Only one primary guardian per student.
        await tx
          .update(guardians)
          .set({ isPrimary: false })
          .where(eq(guardians.studentId, studentId));
      }
      const [row] = await tx
        .insert(guardians)
        .values({ ...input, studentId })
        .returning();
      return row;
    });
  }

  async updateGuardian(id: number, updates: Partial<InsertGuardian>): Promise<Guardian | undefined> {
    return db.transaction(async (tx) => {
      if (updates.isPrimary) {
        const [current] = await tx.select().from(guardians).where(eq(guardians.id, id));
        if (current) {
          await tx
            .update(guardians)
            .set({ isPrimary: false })
            .where(eq(guardians.studentId, current.studentId));
        }
      }
      const [row] = await tx
        .update(guardians)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(guardians.id, id))
        .returning();
      return row;
    });
  }

  async deleteGuardian(id: number): Promise<boolean> {
    const [row] = await db.delete(guardians).where(eq(guardians.id, id)).returning();
    return Boolean(row);
  }

  // ───────────────────────────── admin stats ─────────────────────────────
  async getAdminStats(): Promise<AdminStats> {
    const month = new Date().toISOString().slice(0, 7); // 'AAAA-MM'
    const liveReceipt = isNull(receipts.deletedAt);

    const countOf = async (table: any, where?: any): Promise<number> => {
      const [row] = await db.select({ n: sql<number>`count(*)::int` }).from(table).where(where);
      return row?.n ?? 0;
    };
    const counts = {
      students: await countOf(students),
      activeStudents: await countOf(students, eq(students.active, true)),
      classes: await countOf(classes),
      guardians: await countOf(guardians),
    };

    const [revTotal] = await db
      .select({ total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8` })
      .from(receipts)
      .where(liveReceipt);

    const [thisMonth] = await db
      .select({
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
      })
      .from(receipts)
      .where(and(liveReceipt, sql`to_char(${receipts.issueDate}, 'YYYY-MM') = ${month}`));

    const studentsByClass = await db
      .select({
        classId: classes.id,
        name: classes.name,
        level: sql<string>`${classes.level}::text`,
        count: sql<number>`count(${students.id}) filter (where ${students.active})::int`,
      })
      .from(classes)
      .leftJoin(students, eq(students.classId, classes.id))
      .groupBy(classes.id, classes.name, classes.level)
      .orderBy(classes.name);

    const revenueByMonth = await db
      .select({
        month: sql<string>`to_char(${receipts.issueDate}, 'YYYY-MM')`,
        total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
      })
      .from(receipts)
      .where(and(liveReceipt, sql`${receipts.issueDate} >= (current_date - interval '6 months')`))
      .groupBy(sql`to_char(${receipts.issueDate}, 'YYYY-MM')`)
      .orderBy(sql`to_char(${receipts.issueDate}, 'YYYY-MM')`);

    const receiptsByType = await db
      .select({
        type: sql<string>`${receipts.receiptType}::text`,
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
      })
      .from(receipts)
      .where(liveReceipt)
      .groupBy(receipts.receiptType);

    const paymentsByMethod = await db
      .select({
        method: receipts.paymentMethod,
        count: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
      })
      .from(receipts)
      .where(liveReceipt)
      .groupBy(receipts.paymentMethod)
      .orderBy(sql`sum(${receipts.amountPaid}) desc nulls last`);

    const recentReceipts = await db
      .select()
      .from(receipts)
      .where(liveReceipt)
      .orderBy(desc(receipts.receiptNumber))
      .limit(8);

    return {
      totals: {
        students: counts?.students ?? 0,
        activeStudents: counts?.activeStudents ?? 0,
        classes: counts?.classes ?? 0,
        guardians: counts?.guardians ?? 0,
        receiptsThisMonth: thisMonth?.count ?? 0,
        revenueThisMonth: thisMonth?.total ?? 0,
        revenueTotal: revTotal?.total ?? 0,
      },
      studentsByClass,
      revenueByMonth,
      receiptsByType,
      paymentsByMethod,
      recentReceipts,
    };
  }

  // ───────────────────────────── users (admin) ─────────────────────────────
  async listUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(users.name);
  }

  // ───────────────────────── receipts (admin) ─────────────────────────
  async listReceiptsAdmin(filters?: ReceiptAdminFilters): Promise<ReceiptResponse[]> {
    const parts: any[] = [];
    if (!filters?.includeVoided) parts.push(isNull(receipts.deletedAt));
    if (filters?.studentId) parts.push(eq(receipts.studentId, filters.studentId));
    if (filters?.method) parts.push(eq(receipts.paymentMethod, filters.method));
    if (filters?.q && filters.q.trim()) {
      const q = `%${filters.q.trim()}%`;
      const asNum = Number(filters.q.replace(/\D/g, ""));
      const ors = [
        ilike(receipts.studentName, q),
        ilike(receipts.guardianName, q),
        ilike(receipts.paymentDescription, q),
      ];
      if (Number.isFinite(asNum) && asNum > 0) ors.push(eq(receipts.receiptNumber, asNum));
      parts.push(or(...ors));
    }
    const where = parts.length ? and(...parts) : undefined;
    return db.select().from(receipts).where(where).orderBy(desc(receipts.receiptNumber));
  }

  async adminReceiptTotals(): Promise<{ emitted: number; totalValue: number; voided: number }> {
    const [live] = await db
      .select({
        n: sql<number>`count(*)::int`,
        total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
      })
      .from(receipts)
      .where(isNull(receipts.deletedAt));
    const [voided] = await db
      .select({ n: sql<number>`count(*)::int` })
      .from(receipts)
      .where(isNotNull(receipts.deletedAt));
    return { emitted: live?.n ?? 0, totalValue: live?.total ?? 0, voided: voided?.n ?? 0 };
  }

  /** Anular (soft-delete) a receipt, snapshotting the prior state as a version. */
  async voidReceipt(id: number, userId: number, reason: string): Promise<ReceiptResponse | undefined> {
    return db.transaction(async (tx) => {
      const [current] = await tx.select().from(receipts).where(eq(receipts.id, id));
      if (!current || current.deletedAt) return current ?? undefined;

      const [{ n }] = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(receiptVersions)
        .where(eq(receiptVersions.receiptId, id));
      await tx.insert(receiptVersions).values({
        receiptId: id,
        versionNumber: (n ?? 0) + 1,
        snapshot: current as any,
        editedByUserId: userId,
      });

      const [row] = await tx
        .update(receipts)
        .set({
          deletedAt: new Date(),
          deletedByUserId: userId,
          voidReason: reason,
          updatedByUserId: userId,
          updatedAt: new Date(),
        })
        .where(eq(receipts.id, id))
        .returning();
      return row;
    });
  }

  async listReceiptVersions(receiptId: number): Promise<typeof receiptVersions.$inferSelect[]> {
    return db
      .select()
      .from(receiptVersions)
      .where(eq(receiptVersions.receiptId, receiptId))
      .orderBy(desc(receiptVersions.versionNumber));
  }

  // ───────────────────── pending payments (mensalidade) ─────────────────────
  /** Active students with no live "mensalidade" receipt for `referenceMonth`. */
  async listPendingPayments(referenceMonth: string): Promise<PendingPayment[]> {
    const paid = db
      .select({ sid: receipts.studentId })
      .from(receipts)
      .where(
        and(
          eq(receipts.receiptType, "mensalidade"),
          eq(receipts.referenceMonth, referenceMonth),
          isNull(receipts.deletedAt),
          isNotNull(receipts.studentId),
        ),
      );

    const rows = await db
      .select({
        studentId: students.id,
        fullName: students.fullName,
        internalNumber: students.internalNumber,
        classId: classes.id,
        className: classes.name,
        fee: sql<number>`coalesce(${students.monthlyFeeOverride}, ${classes.monthlyFee})::float8`,
      })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(
        and(
          eq(students.active, true),
          eq(classes.active, true),
          sql`${students.id} NOT IN (${paid})`,
        ),
      )
      .orderBy(classes.name, students.fullName);

    return rows.map((r) => ({
      studentId: r.studentId,
      fullName: r.fullName,
      internalNumber: r.internalNumber,
      classId: r.classId,
      className: r.className,
      expected: r.fee,
      referenceMonth,
    }));
  }

  // ───────────────────────────── audit log ─────────────────────────────
  async writeAudit(entry: AuditEntry): Promise<void> {
    await db.insert(auditLog).values({
      action: entry.action,
      actorUserId: entry.actorUserId ?? null,
      actorEmail: entry.actorEmail ?? null,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: (entry.metadata ?? null) as any,
    });
  }

  async listAudit(opts: { limit: number; cursorId?: number; action?: string; q?: string }): Promise<AuditLog[]> {
    const parts: any[] = [];
    if (opts.cursorId) parts.push(lt(auditLog.id, opts.cursorId));
    if (opts.action) parts.push(eq(auditLog.action, opts.action));
    if (opts.q && opts.q.trim()) {
      const q = `%${opts.q.trim()}%`;
      parts.push(or(ilike(auditLog.actorEmail, q), ilike(auditLog.action, q)));
    }
    const where = parts.length ? and(...parts) : undefined;
    return db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.id))
      .limit(opts.limit);
  }

  async recentAudit(limit: number): Promise<AuditLog[]> {
    return db.select().from(auditLog).orderBy(desc(auditLog.id)).limit(limit);
  }

  // ───────────────────────────── statements ─────────────────────────────
  async receiptsForMonth(month: string): Promise<ReceiptResponse[]> {
    return db
      .select()
      .from(receipts)
      .where(and(isNull(receipts.deletedAt), sql`to_char(${receipts.issueDate}, 'YYYY-MM') = ${month}`))
      .orderBy(receipts.studentClass, receipts.studentName);
  }

  async receiptsForYear(year: string): Promise<ReceiptResponse[]> {
    return db
      .select()
      .from(receipts)
      .where(and(isNull(receipts.deletedAt), sql`to_char(${receipts.issueDate}, 'YYYY') = ${year}`))
      .orderBy(receipts.issueDate);
  }

  /** Estado de pagamento da mensalidade do mês, por aluno activo (turma activa). */
  async monthPaymentsReport(month: string): Promise<{
    period: string;
    totals: { activeStudents: number; paid: number; unpaid: number; received: number; expected: number };
    classes: {
      className: string;
      paidCount: number;
      total: number;
      rows: { fullName: string; paid: boolean; date: string | null; method: string | null; value: number }[];
    }[];
  }> {
    const studentRows = await db
      .select({
        id: students.id,
        fullName: students.fullName,
        className: classes.name,
        fee: sql<number>`coalesce(${students.monthlyFeeOverride}, ${classes.monthlyFee})::float8`,
      })
      .from(students)
      .innerJoin(classes, eq(students.classId, classes.id))
      .where(and(eq(students.active, true), eq(classes.active, true)))
      .orderBy(classes.name, students.fullName);

    const paidRows = await db
      .select({
        studentId: receipts.studentId,
        issueDate: receipts.issueDate,
        method: receipts.paymentMethod,
        amount: sql<number>`${receipts.amountPaid}::float8`,
      })
      .from(receipts)
      .where(
        and(
          eq(receipts.receiptType, "mensalidade"),
          eq(receipts.referenceMonth, month),
          isNull(receipts.deletedAt),
          isNotNull(receipts.studentId),
        ),
      );
    const paidByStudent = new Map<number, { issueDate: string; method: string; amount: number }>();
    for (const p of paidRows) {
      if (p.studentId != null && !paidByStudent.has(p.studentId)) {
        paidByStudent.set(p.studentId, { issueDate: String(p.issueDate), method: p.method, amount: p.amount });
      }
    }

    const byClass = new Map<string, typeof studentRows>();
    for (const s of studentRows) {
      if (!byClass.has(s.className)) byClass.set(s.className, []);
      byClass.get(s.className)!.push(s);
    }

    let received = 0;
    let expected = 0;
    let paidTotal = 0;
    const classesOut = Array.from(byClass.entries()).map(([className, list]) => {
      let paidCount = 0;
      let total = 0;
      const rows = list.map((s) => {
        const pay = paidByStudent.get(s.id);
        const value = pay ? pay.amount : s.fee;
        expected += s.fee;
        if (pay) {
          received += pay.amount;
          paidCount += 1;
          paidTotal += 1;
        }
        total += value;
        return {
          fullName: s.fullName,
          paid: !!pay,
          date: pay ? pay.issueDate : null,
          method: pay ? pay.method : null,
          value,
        };
      });
      return { className, paidCount, total, rows };
    });

    return {
      period: month,
      totals: {
        activeStudents: studentRows.length,
        paid: paidTotal,
        unpaid: studentRows.length - paidTotal,
        received,
        expected,
      },
      classes: classesOut,
    };
  }

  // ───────────────────────── statements (histórico) ─────────────────────────
  async saveStatement(input: {
    kind: string;
    label: string;
    refKey: string;
    filename: string;
    pdfBase64: string;
    userId?: number | null;
    email?: string | null;
  }): Promise<number> {
    const [row] = await db
      .insert(statements)
      .values({
        kind: input.kind,
        label: input.label,
        refKey: input.refKey,
        filename: input.filename,
        pdfBase64: input.pdfBase64,
        generatedByUserId: input.userId ?? null,
        generatedByEmail: input.email ?? null,
      })
      .returning({ id: statements.id });
    return row.id;
  }

  /** Metadados dos extratos (sem o PDF) para a listagem. */
  async listStatements(includeDeleted: boolean): Promise<
    {
      id: number;
      kind: string;
      label: string;
      refKey: string;
      filename: string;
      generatedByEmail: string | null;
      createdAt: Date;
      deletedAt: Date | null;
      deleteReason: string | null;
    }[]
  > {
    const where = includeDeleted ? undefined : isNull(statements.deletedAt);
    return db
      .select({
        id: statements.id,
        kind: statements.kind,
        label: statements.label,
        refKey: statements.refKey,
        filename: statements.filename,
        generatedByEmail: statements.generatedByEmail,
        createdAt: statements.createdAt,
        deletedAt: statements.deletedAt,
        deleteReason: statements.deleteReason,
      })
      .from(statements)
      .where(where)
      .orderBy(desc(statements.id));
  }

  async getStatementPdf(id: number): Promise<{ pdfBase64: string; filename: string } | undefined> {
    const [row] = await db
      .select({ pdfBase64: statements.pdfBase64, filename: statements.filename, deletedAt: statements.deletedAt })
      .from(statements)
      .where(eq(statements.id, id));
    if (!row || row.deletedAt) return undefined;
    return { pdfBase64: row.pdfBase64, filename: row.filename };
  }

  async deleteStatement(id: number, userId: number, reason: string): Promise<boolean> {
    const [row] = await db
      .update(statements)
      .set({ deletedAt: new Date(), deletedByUserId: userId, deleteReason: reason })
      .where(and(eq(statements.id, id), isNull(statements.deletedAt)))
      .returning({ id: statements.id });
    return Boolean(row);
  }

  async receiptsForStudentYear(studentId: number, year: string): Promise<ReceiptResponse[]> {
    return db
      .select()
      .from(receipts)
      .where(
        and(
          isNull(receipts.deletedAt),
          eq(receipts.studentId, studentId),
          sql`to_char(${receipts.issueDate}, 'YYYY') = ${year}`,
        ),
      )
      .orderBy(receipts.issueDate);
  }
}

export const storage = new DatabaseStorage();
