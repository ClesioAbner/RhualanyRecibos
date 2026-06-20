import {
  pgTable,
  serial,
  text,
  varchar,
  integer,
  numeric,
  date,
  boolean,
  timestamp,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// NOTE: This file MIRRORS an already-provisioned database. The school domain
// (classes/students/guardians) plus receipt auditing (receipt_versions,
// audit_log, void columns) were created by an earlier migration, using VARCHAR
// columns (not pg enums). We therefore model the enum-like columns as varchar
// with a TS union via .$type<>() so the ORM matches the live schema exactly and
// `drizzle-kit push` reports no destructive diff.

export const settings = pgTable("settings", {
  key: varchar("key", { length: 64 }).primaryKey(),
  value: text("value").notNull(),
});

// ───────────────────────────── users / auth ─────────────────────────────
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: varchar("role").notNull(),
  active: boolean("active").notNull().default(true),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  avatarUrl: text("avatar_url"),
  totpSecret: text("totp_secret"),
  totpEnabledAt: timestamp("totp_enabled_at", { withTimezone: true }),
  totpRecoveryHashes: jsonb("totp_recovery_hashes").$type<string[]>(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export function isTotpEnabled(u: Pick<User, "totpEnabledAt">): boolean {
  return u.totpEnabledAt != null;
}

export type Role = "admin" | "secretaria";

export function isAdmin(u: Pick<User, "role">): boolean {
  return u.role === "admin";
}

/** Shape safe to send to the client — never includes secrets/hashes. */
export type PublicUser = {
  id: number;
  email: string;
  name: string;
  role: string;
  totpEnabled: boolean;
  avatarUrl: string | null;
};

export function toPublicUser(u: User): PublicUser {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    totpEnabled: isTotpEnabled(u),
    avatarUrl: u.avatarUrl ?? null,
  };
}

// ══════════════════════════════ enum-like unions ══════════════════════════════
export const CLASS_LEVELS = ["bercario", "pre_escolar", "primaria", "secundaria", "outro"] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

export const GUARDIAN_RELATIONSHIPS = ["pai", "mae", "tutor", "outro"] as const;
export type GuardianRelationship = (typeof GUARDIAN_RELATIONSHIPS)[number];

export const RECEIPT_TYPES = ["mensalidade", "matricula", "uniforme", "material", "exame", "outro"] as const;
export type ReceiptType = (typeof RECEIPT_TYPES)[number];

// ───────────────────────────── classes (turmas) ─────────────────────────────
export const classes = pgTable(
  "classes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name").notNull().unique(),
    level: varchar("level").$type<ClassLevel>().notNull(),
    monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameIdx: index("classes_name_idx").on(t.name),
    activeIdx: index("classes_active_idx").on(t.active),
  }),
);

export type ClassRow = typeof classes.$inferSelect;
export type InsertClass = typeof classes.$inferInsert;

// ───────────────────────────── students (alunos) ─────────────────────────────
export const students = pgTable(
  "students",
  {
    id: serial("id").primaryKey(),
    // RESTRICT: a turma com alunos não pode ser apagada.
    classId: integer("class_id")
      .notNull()
      .references(() => classes.id, { onDelete: "restrict" }),
    fullName: text("full_name").notNull(),
    internalNumber: varchar("internal_number"),
    birthdate: date("birthdate"),
    monthlyFeeOverride: numeric("monthly_fee_override", { precision: 12, scale: 2 }),
    active: boolean("active").notNull().default(true),
    enrolledAt: date("enrolled_at"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    classIdx: index("students_class_idx").on(t.classId),
    classActiveIdx: index("students_class_active_idx").on(t.classId, t.active),
    nameIdx: index("students_name_idx").on(t.fullName),
    activeIdx: index("students_active_idx").on(t.active),
  }),
);

export type Student = typeof students.$inferSelect;
export type InsertStudent = typeof students.$inferInsert;

// ─────────────────────────── guardians (encarregados) ───────────────────────
export const guardians = pgTable(
  "guardians",
  {
    id: serial("id").primaryKey(),
    // CASCADE: apagar o aluno remove os seus encarregados.
    studentId: integer("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    fullName: text("full_name").notNull(),
    relationship: varchar("relationship").$type<GuardianRelationship>().notNull(),
    phone: varchar("phone"),
    email: text("email"),
    isPrimary: boolean("is_primary").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    studentIdx: index("guardians_student_idx").on(t.studentId),
    primaryIdx: index("guardians_primary_idx").on(t.studentId, t.isPrimary),
  }),
);

export type Guardian = typeof guardians.$inferSelect;
export type InsertGuardian = typeof guardians.$inferInsert;

// ───────────────────────────── receipts ─────────────────────────────
// Snapshot fields (studentName/studentClass/guardianName) keep history alive
// even if the student row is deleted → student_id uses SET NULL.
export const receipts = pgTable(
  "receipts",
  {
    id: serial("id").primaryKey(),
    receiptNumber: integer("receipt_number").notNull().unique(),
    issueDate: date("issue_date").notNull(),
    secretaryName: text("secretary_name").notNull(),

    studentId: integer("student_id").references(() => students.id, { onDelete: "set null" }),
    receiptType: varchar("receipt_type").$type<ReceiptType>().notNull().default("mensalidade"),
    referenceMonth: varchar("reference_month"),

    studentName: text("student_name").notNull(),
    studentClass: varchar("student_class", { length: 8 }).notNull(),
    studentNumber: text("student_number"),
    guardianName: text("guardian_name"),

    paymentDescription: text("payment_description").notNull(),
    paymentMethod: varchar("payment_method", { length: 32 }).notNull(),
    amountPaid: numeric("amount_paid", { precision: 12, scale: 2 }).notNull(),
    ivaAmount: numeric("iva_amount", { precision: 12, scale: 2 }).notNull().default("0"),
    amountInWords: text("amount_in_words").notNull(),

    // Auditing + soft-delete (anulação).
    createdByUserId: integer("created_by_user_id").references(() => users.id, { onDelete: "set null" }),
    updatedByUserId: integer("updated_by_user_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    deletedByUserId: integer("deleted_by_user_id").references(() => users.id, { onDelete: "set null" }),
    voidReason: text("void_reason"),
  },
  (t) => ({
    uniqMonthlyFee: uniqueIndex("uniq_monthly_fee_per_student_month")
      .on(t.studentId, t.referenceMonth)
      .where(
        sql`receipt_type = 'mensalidade' AND deleted_at IS NULL AND student_id IS NOT NULL AND reference_month IS NOT NULL`,
      ),
    studentIdx: index("receipts_student_idx").on(t.studentId),
    issueDateIdx: index("receipts_issue_date_idx").on(t.issueDate),
    typeMonthIdx: index("receipts_type_month_idx").on(t.receiptType, t.referenceMonth),
    deletedAtIdx: index("receipts_deleted_at_idx").on(t.deletedAt),
  }),
);

export const insertReceiptSchema = createInsertSchema(receipts).omit({
  id: true,
  receiptNumber: true,
  issueDate: true,
  createdByUserId: true,
  updatedByUserId: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
  deletedByUserId: true,
  voidReason: true,
});

export type Receipt = typeof receipts.$inferSelect;
export type InsertReceipt = z.infer<typeof insertReceiptSchema>;

export type CreateReceiptRequest = InsertReceipt;
export type UpdateReceiptRequest = Partial<InsertReceipt>;
export type ReceiptResponse = Receipt;

// ─────────────────────── receipt versions / audit log ───────────────────────
export const receiptVersions = pgTable("receipt_versions", {
  id: serial("id").primaryKey(),
  receiptId: integer("receipt_id")
    .notNull()
    .references(() => receipts.id, { onDelete: "cascade" }),
  versionNumber: integer("version_number").notNull(),
  snapshot: jsonb("snapshot").notNull(),
  editedByUserId: integer("edited_by_user_id").references(() => users.id, { onDelete: "set null" }),
  editedAt: timestamp("edited_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ReceiptVersion = typeof receiptVersions.$inferSelect;

export const auditLog = pgTable("audit_log", {
  id: serial("id").primaryKey(),
  action: varchar("action").notNull(),
  actorUserId: integer("actor_user_id").references(() => users.id, { onDelete: "set null" }),
  actorEmail: text("actor_email"),
  targetType: varchar("target_type"),
  targetId: text("target_id"),
  ip: varchar("ip"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type AuditLog = typeof auditLog.$inferSelect;

// ─────────────────────── statements (histórico de extratos) ───────────────────────
// Cada extrato gerado fica guardado para controlo: metadados + o PDF (base64).
// Apagar é soft-delete e exige justificação (delete_reason).
export const statements = pgTable("statements", {
  id: serial("id").primaryKey(),
  kind: varchar("kind").notNull(), // monthly | annual | student
  label: text("label").notNull(),
  refKey: varchar("ref_key").notNull(),
  filename: text("filename").notNull(),
  pdfBase64: text("pdf_base64").notNull(),
  generatedByUserId: integer("generated_by_user_id").references(() => users.id, { onDelete: "set null" }),
  generatedByEmail: text("generated_by_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  deletedByUserId: integer("deleted_by_user_id").references(() => users.id, { onDelete: "set null" }),
  deleteReason: text("delete_reason"),
});

export type StatementRow = typeof statements.$inferSelect;

export type SettingsKey = "secretaryName";
export type SettingsResponse = {
  secretaryName: string;
};
