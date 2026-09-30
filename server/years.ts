import { and, asc, eq, isNull, sql } from "drizzle-orm";
import { db } from "./db";
import {
  auditLog,
  classes,
  receipts,
  schoolYears,
  statements,
  students,
  type SchoolYear,
} from "@shared/schema";
import type { SchoolYearDetail, SchoolYearRow } from "@shared/routes";

// ───────────────────────────── bootstrap ─────────────────────────────
/**
 * Garante a tabela `school_years` (idempotente — seguro em cada arranque, sem
 * precisar de `db:push` no servidor) e, numa instalação sem anos, cria o ano
 * corrente como "em curso" e os anos anteriores com recibos como fechados.
 */
export async function ensureSchoolYears(): Promise<void> {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS school_years (
      id serial PRIMARY KEY,
      year integer NOT NULL CONSTRAINT school_years_year_unique UNIQUE,
      status varchar NOT NULL DEFAULT 'active',
      opened_at timestamptz NOT NULL DEFAULT now(),
      opened_by_email text,
      closed_at timestamptz,
      closed_by_email text,
      snapshot jsonb,
      notes text
    )`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS school_years_one_active_idx
      ON school_years (status) WHERE status = 'active'`);

  // Cada recibo / evento / extrato pertence a um ano lectivo. Os registos
  // antigos herdam o ano da sua data. A numeração dos recibos passa a ser por
  // ano: (school_year, receipt_number) único em vez de receipt_number global.
  await db.execute(sql`ALTER TABLE receipts ADD COLUMN IF NOT EXISTS school_year integer`);
  await db.execute(sql`UPDATE receipts SET school_year = extract(year from issue_date)::int WHERE school_year IS NULL`);
  await db.execute(sql`ALTER TABLE receipts DROP CONSTRAINT IF EXISTS receipts_receipt_number_unique`);
  await db.execute(sql`
    CREATE UNIQUE INDEX IF NOT EXISTS receipts_year_number_unique ON receipts (school_year, receipt_number)`);
  await db.execute(sql`ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS school_year integer`);
  await db.execute(sql`UPDATE audit_log SET school_year = extract(year from created_at)::int WHERE school_year IS NULL`);
  await db.execute(sql`CREATE INDEX IF NOT EXISTS audit_log_school_year_idx ON audit_log (school_year)`);
  await db.execute(sql`ALTER TABLE statements ADD COLUMN IF NOT EXISTS school_year integer`);
  await db.execute(sql`UPDATE statements SET school_year = extract(year from created_at)::int WHERE school_year IS NULL`);

  const [{ n }] = await db.select({ n: sql<number>`count(*)::int` }).from(schoolYears);
  if (n > 0) return;

  const current = new Date().getFullYear();
  const past = await db
    .select({ y: receipts.schoolYear })
    .from(receipts)
    .where(sql`${receipts.schoolYear} < ${current}`)
    .groupBy(receipts.schoolYear);
  for (const { y } of past) {
    if (y == null) continue;
    await db.insert(schoolYears).values({ year: y, status: "closed", closedAt: new Date(`${y}-12-31T23:59:59Z`) });
  }
  await db.insert(schoolYears).values({ year: current, status: "active" });
}

// ───────────────────────────── ano activo ─────────────────────────────
// Cache em memória (uma instância). Actualizada ao abrir um ano novo.
let activeYearCache: number | null = null;

/** Ano lectivo em curso — tudo o que é operacional (recibos, auditoria, extratos) usa este ano. */
export async function activeYear(): Promise<number> {
  if (activeYearCache !== null) return activeYearCache;
  const [row] = await db.select({ year: schoolYears.year }).from(schoolYears).where(eq(schoolYears.status, "active"));
  const y = row?.year ?? new Date().getFullYear();
  if (row) activeYearCache = y;
  return y;
}

// ───────────────────────────── helpers ─────────────────────────────
const live = isNull(receipts.deletedAt);
const receiptYear = (y: number) => eq(receipts.schoolYear, y);
const iso = (d: Date | string | null) => (d ? new Date(d).toISOString() : null);

type Totals = SchoolYearRow["totals"];
type Roster = SchoolYearDetail["roster"];

async function totalsByYear(): Promise<Map<number, Totals>> {
  const map = new Map<number, Totals>();
  const get = (y: number) => {
    if (!map.has(y)) map.set(y, { receipts: 0, revenue: 0, voided: 0, payingStudents: 0, auditEvents: 0, statements: 0 });
    return map.get(y)!;
  };

  const rec = await db
    .select({
      y: receipts.schoolYear,
      receipts: sql<number>`count(*) filter (where ${receipts.deletedAt} is null)::int`,
      revenue: sql<number>`coalesce(sum(${receipts.amountPaid}) filter (where ${receipts.deletedAt} is null), 0)::float8`,
      voided: sql<number>`count(*) filter (where ${receipts.deletedAt} is not null)::int`,
      paying: sql<number>`count(distinct ${receipts.studentId}) filter (where ${receipts.deletedAt} is null)::int`,
    })
    .from(receipts)
    .groupBy(receipts.schoolYear);
  for (const r of rec) {
    if (r.y == null) continue;
    Object.assign(get(r.y), { receipts: r.receipts, revenue: r.revenue, voided: r.voided, payingStudents: r.paying });
  }

  const aud = await db
    .select({ y: auditLog.schoolYear, n: sql<number>`count(*)::int` })
    .from(auditLog)
    .groupBy(auditLog.schoolYear);
  for (const a of aud) if (a.y != null) get(a.y).auditEvents = a.n;

  const st = await db
    .select({ y: statements.schoolYear, n: sql<number>`count(*)::int` })
    .from(statements)
    .where(isNull(statements.deletedAt))
    .groupBy(statements.schoolYear);
  for (const s of st) if (s.y != null) get(s.y).statements = s.n;

  return map;
}

const EMPTY_TOTALS: Totals = { receipts: 0, revenue: 0, voided: 0, payingStudents: 0, auditEvents: 0, statements: 0 };

function toRow(y: SchoolYear, totals: Totals | undefined): SchoolYearRow {
  return {
    id: y.id,
    year: y.year,
    status: y.status,
    openedAt: iso(y.openedAt)!,
    openedByEmail: y.openedByEmail,
    closedAt: iso(y.closedAt),
    closedByEmail: y.closedByEmail,
    notes: y.notes,
    totals: totals ?? EMPTY_TOTALS,
  };
}

/** Turmas + alunos actuais, com o total pago por cada aluno no ano indicado. */
async function buildRoster(year: number): Promise<Roster["classes"]> {
  const cls = await db.select().from(classes).orderBy(asc(classes.name));
  const st = await db.select().from(students).orderBy(asc(students.fullName));
  const paid = await db
    .select({
      studentId: receipts.studentId,
      total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
      count: sql<number>`count(*)::int`,
    })
    .from(receipts)
    .where(and(live, receiptYear(year)))
    .groupBy(receipts.studentId);
  const paidBy = new Map(paid.map((p) => [p.studentId, p]));

  return cls.map((c) => ({
    id: c.id,
    name: c.name,
    level: c.level,
    monthlyFee: Number(c.monthlyFee),
    active: c.active,
    students: st
      .filter((s) => s.classId === c.id)
      .map((s) => ({
        id: s.id,
        fullName: s.fullName,
        internalNumber: s.internalNumber ?? null,
        active: s.active,
        paid: paidBy.get(s.id)?.total ?? 0,
        receipts: paidBy.get(s.id)?.count ?? 0,
      })),
  }));
}

// ───────────────────────────── queries ─────────────────────────────
export async function listSchoolYears(): Promise<SchoolYearRow[]> {
  const rows = await db.select().from(schoolYears).orderBy(sql`${schoolYears.year} desc`);
  const totals = await totalsByYear();
  return rows.map((y) => toRow(y, totals.get(y.year)));
}

export async function getActiveSchoolYear(): Promise<SchoolYear | undefined> {
  const [row] = await db.select().from(schoolYears).where(eq(schoolYears.status, "active"));
  return row;
}

export async function getSchoolYearDetail(year: number): Promise<SchoolYearDetail | null> {
  const [y] = await db.select().from(schoolYears).where(eq(schoolYears.year, year));
  if (!y) return null;
  const totals = (await totalsByYear()).get(year);

  const where = and(live, receiptYear(year));
  const monthKey = sql<string>`to_char(${receipts.issueDate}, 'YYYY-MM')`;
  const byMonth = await db
    .select({
      month: monthKey,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
    })
    .from(receipts)
    .where(where)
    .groupBy(monthKey)
    .orderBy(monthKey);
  const byMethod = await db
    .select({
      method: receipts.paymentMethod,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
    })
    .from(receipts)
    .where(where)
    .groupBy(receipts.paymentMethod)
    .orderBy(sql`3 desc`);
  const byType = await db
    .select({
      type: sql<string>`${receipts.receiptType}::text`,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
    })
    .from(receipts)
    .where(where)
    .groupBy(receipts.receiptType)
    .orderBy(sql`3 desc`);
  // Os recibos guardam a turma como texto livre ("3", "3ª"…): agrupa pelo
  // número da classe quando existe, para "3" e "3ª" contarem juntos.
  const classKey = sql<string>`coalesce(nullif(regexp_replace(${receipts.studentClass}, '\\D', '', 'g'), ''), ${receipts.studentClass})`;
  const byClassRaw = await db
    .select({
      key: classKey,
      count: sql<number>`count(*)::int`,
      total: sql<number>`coalesce(sum(${receipts.amountPaid}), 0)::float8`,
    })
    .from(receipts)
    .where(where)
    .groupBy(classKey)
    .orderBy(classKey);
  const byClass = byClassRaw.map((c) => ({
    name: /^\d+$/.test(c.key) ? `${c.key}ª Classe` : c.key,
    count: c.count,
    total: c.total,
  }));

  const snap = y.snapshot as { takenAt?: string; classes?: Roster["classes"] } | null;
  // Ano fechado → só o retrato guardado (vazio se foi fechado antes de existir
  // o histórico); ano em curso → turmas e alunos actuais.
  const roster: Roster =
    y.status === "closed"
      ? { source: "snapshot", takenAt: snap?.takenAt ?? null, classes: snap?.classes ?? [] }
      : { source: "live", takenAt: null, classes: await buildRoster(year) };

  return { ...toRow(y, totals), byMonth, byMethod, byType, byClass, roster };
}

export class YearError extends Error {}

/**
 * Abre um novo ano lectivo: fecha o ano em curso (guardando o retrato das
 * turmas e alunos) e marca o novo como activo. Nada é apagado.
 */
export async function openSchoolYear(
  year: number,
  actorEmail: string | null,
  notes?: string,
): Promise<{ opened: SchoolYear; closed: SchoolYear | null }> {
  const all = await db.select().from(schoolYears);
  const maxYear = Math.max(0, ...all.map((y) => y.year));
  if (all.some((y) => y.year === year)) throw new YearError(`O ano lectivo ${year} já existe.`);
  if (year < maxYear) throw new YearError(`Só é possível abrir um ano posterior a ${maxYear}.`);
  if (year > new Date().getFullYear() + 1) {
    throw new YearError(`Só é possível abrir até ao ano ${new Date().getFullYear() + 1}.`);
  }

  const active = all.find((y) => y.status === "active") ?? null;
  const snapshot = active ? { takenAt: new Date().toISOString(), classes: await buildRoster(active.year) } : null;

  return db.transaction(async (tx) => {
    let closed: SchoolYear | null = null;
    if (active) {
      [closed] = await tx
        .update(schoolYears)
        .set({ status: "closed", closedAt: new Date(), closedByEmail: actorEmail, snapshot })
        .where(eq(schoolYears.id, active.id))
        .returning();
    }
    const [opened] = await tx
      .insert(schoolYears)
      .values({ year, status: "active", openedByEmail: actorEmail, notes: notes || null })
      .returning();
    return { opened, closed };
  }).then((r) => {
    activeYearCache = r.opened.year;
    return r;
  });
}

export async function schoolYearRow(y: SchoolYear): Promise<SchoolYearRow> {
  return toRow(y, (await totalsByYear()).get(y.year));
}
