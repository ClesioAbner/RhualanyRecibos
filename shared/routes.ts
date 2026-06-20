import { z } from "zod";
import {
  insertReceiptSchema,
  receipts,
  classes,
  students,
  guardians,
} from "./schema";
import { createInsertSchema } from "drizzle-zod";

export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  internal: z.object({
    message: z.string(),
  }),
};

const receiptIdParam = z.object({
  id: z.coerce.number().int().positive(),
});

// ───────────────────────────── auth schemas ─────────────────────────────
export const publicUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  totpEnabled: z.boolean(),
  avatarUrl: z.string().nullable(),
});

/** Avatar: a data: URL (uploaded photo) or an http(s) URL. */
export const avatarInput = z.object({
  avatarUrl: z
    .string()
    .max(2_500_000, "Imagem demasiado grande")
    .refine((v) => /^data:image\/(png|jpe?g|webp);base64,/.test(v) || /^https?:\/\//.test(v), {
      message: "Imagem inválida",
    }),
});

/**
 * Minimum password strength, enforced on both register and reset:
 * ≥ 8 chars, at least one lowercase, one uppercase and one digit.
 */
export const passwordSchema = z
  .string()
  .min(8, "A palavra-passe deve ter pelo menos 8 caracteres")
  .max(128, "A palavra-passe é demasiado longa")
  .regex(/[a-z]/, "Deve conter pelo menos uma letra minúscula")
  .regex(/[A-Z]/, "Deve conter pelo menos uma letra maiúscula")
  .regex(/[0-9]/, "Deve conter pelo menos um número");

const emailSchema = z.string().email("Email inválido");

// ───────────────────────── school-domain inputs ─────────────────────────
const idParam = z.object({ id: z.coerce.number().int().positive() });

export const classLevelSchema = z.enum([
  "bercario",
  "pre_escolar",
  "primaria",
  "secundaria",
  "outro",
]);
export const guardianRelationshipSchema = z.enum(["pai", "mae", "tutor", "outro"]);

/** "" → undefined so optional text fields don't store empty strings. */
const optionalText = (max = 160) =>
  z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().max(max).optional(),
  );

export const classInput = z.object({
  name: z.string().trim().min(1, "Indique o nome da turma").max(120),
  level: classLevelSchema.default("primaria"),
  monthlyFee: z.coerce.number().nonnegative("Valor inválido").default(0),
  active: z.boolean().optional(),
});

export const studentInput = z.object({
  classId: z.coerce.number().int().positive("Selecione uma turma"),
  fullName: z.string().trim().min(2, "Indique o nome completo").max(160),
  internalNumber: optionalText(40),
  birthdate: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (AAAA-MM-DD)").optional(),
  ),
  monthlyFeeOverride: z.preprocess(
    (v) => (v === "" || v === null ? undefined : v),
    z.coerce.number().nonnegative("Valor inválido").optional(),
  ),
  active: z.boolean().optional(),
});

export const guardianInput = z.object({
  fullName: z.string().trim().min(2, "Indique o nome").max(160),
  relationship: guardianRelationshipSchema.default("outro"),
  phone: optionalText(40),
  email: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    emailSchema.optional(),
  ),
  isPrimary: z.boolean().optional(),
});

const classRow = z.custom<typeof classes.$inferSelect>();
const studentRow = z.custom<typeof students.$inferSelect>();
const guardianRow = z.custom<typeof guardians.$inferSelect>();
const receiptRow = z.custom<typeof receipts.$inferSelect>();

// ───────────────────────── admin-only inputs / rows ─────────────────────────
export const roleSchema = z.enum(["admin", "secretaria"]);

export const userCreateInput = z.object({
  email: emailSchema,
  name: z.string().trim().min(2, "Indique o nome").max(120),
  role: roleSchema,
  password: passwordSchema,
});

export const userUpdateInput = z.object({
  name: z.string().trim().min(2, "Indique o nome").max(120).optional(),
  role: roleSchema.optional(),
  active: z.boolean().optional(),
  avatarUrl: z.string().max(2_500_000).nullable().optional(),
});

export const voidReceiptInput = z.object({
  reason: z.string().trim().min(3, "Indique o motivo da anulação").max(300),
});

export const monthlyStatementInput = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Mês inválido (AAAA-MM)"),
});
export const annualStatementInput = z.object({
  year: z.string().regex(/^\d{4}$/, "Ano inválido"),
});
export const studentStatementInput = z.object({
  studentId: z.coerce.number().int().positive(),
  year: z.string().regex(/^\d{4}$/, "Ano inválido"),
});

export const adminUserSchema = z.object({
  id: z.number(),
  email: z.string(),
  name: z.string(),
  role: z.string(),
  active: z.boolean(),
  lastLoginAt: z.string().nullable(),
  totpEnabled: z.boolean(),
  avatarUrl: z.string().nullable(),
  createdAt: z.string(),
});

export const auditEntrySchema = z.object({
  id: z.number(),
  action: z.string(),
  actorEmail: z.string().nullable(),
  targetType: z.string().nullable(),
  targetId: z.string().nullable(),
  metadata: z.any().nullable(),
  createdAt: z.string(),
});

export const pendingPaymentSchema = z.object({
  studentId: z.number(),
  fullName: z.string(),
  internalNumber: z.string().nullable(),
  classId: z.number(),
  className: z.string(),
  expected: z.number(),
  referenceMonth: z.string(),
});

const pdfResponse = z.object({ pdfBase64: z.string(), filename: z.string() });

export const statementMetaSchema = z.object({
  id: z.number(),
  kind: z.string(),
  label: z.string(),
  refKey: z.string(),
  filename: z.string(),
  generatedByEmail: z.string().nullable(),
  createdAt: z.string(),
  deletedAt: z.string().nullable(),
  deleteReason: z.string().nullable(),
});
export const deleteStatementInput = z.object({
  reason: z.string().trim().min(3, "Indique o motivo da eliminação").max(300),
});

export const api = {
  auth: {
    me: {
      method: "GET" as const,
      path: "/api/auth/me",
      responses: {
        200: publicUserSchema,
        401: errorSchemas.notFound,
      },
    },
    login: {
      method: "POST" as const,
      path: "/api/auth/login",
      input: z.object({
        email: emailSchema,
        password: z.string().min(1, "Indique a palavra-passe"),
      }),
      responses: {
        // Either fully authenticated, or a 2FA challenge is required.
        200: z.union([
          z.object({ user: publicUserSchema }),
          z.object({ twoFactorRequired: z.literal(true) }),
        ]),
        401: errorSchemas.validation,
      },
    },
    twoFactor: {
      method: "POST" as const,
      path: "/api/auth/2fa",
      // Either a 6-digit TOTP token or a recovery code.
      input: z.object({
        token: z.string().optional(),
        recoveryCode: z.string().optional(),
      }),
      responses: {
        200: z.object({ user: publicUserSchema }),
        401: errorSchemas.validation,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/auth/logout",
      responses: { 204: z.void() },
    },
    forgotPassword: {
      method: "POST" as const,
      path: "/api/auth/forgot-password",
      input: z.object({ email: emailSchema }),
      // Always 204 — never reveals whether the email exists.
      responses: { 204: z.void() },
    },
    resetPassword: {
      method: "POST" as const,
      path: "/api/auth/reset-password",
      input: z.object({ token: z.string().min(1), password: passwordSchema }),
      responses: {
        204: z.void(),
        400: errorSchemas.validation,
      },
    },
    twoFactorSetup: {
      method: "POST" as const,
      path: "/api/auth/2fa/setup",
      responses: {
        200: z.object({ secret: z.string(), uri: z.string() }),
        401: errorSchemas.notFound,
      },
    },
    twoFactorEnable: {
      method: "POST" as const,
      path: "/api/auth/2fa/enable",
      input: z.object({ token: z.string() }),
      responses: {
        200: z.object({ recoveryCodes: z.array(z.string()) }),
        400: errorSchemas.validation,
        401: errorSchemas.notFound,
      },
    },
    twoFactorDisable: {
      method: "POST" as const,
      path: "/api/auth/2fa/disable",
      input: z.object({ password: z.string().min(1) }),
      responses: {
        204: z.void(),
        400: errorSchemas.validation,
        401: errorSchemas.notFound,
      },
    },
    updateAvatar: {
      method: "PUT" as const,
      path: "/api/auth/me/avatar",
      input: avatarInput,
      responses: {
        200: publicUserSchema,
        400: errorSchemas.validation,
        401: errorSchemas.notFound,
      },
    },
    changePassword: {
      method: "POST" as const,
      path: "/api/auth/change-password",
      input: z.object({
        currentPassword: z.string().min(1, "Indique a palavra-passe atual."),
        newPassword: z.string().min(8, "A nova palavra-passe deve ter pelo menos 8 caracteres."),
      }),
      responses: {
        204: z.void(),
        400: errorSchemas.validation,
        401: errorSchemas.notFound,
      },
    },
  },
  settings: {
    get: {
      method: "GET" as const,
      path: "/api/settings",
      responses: {
        200: z.object({
          secretaryName: z.string(),
        }),
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/settings",
      input: z.object({
        secretaryName: z.string().min(2),
      }),
      responses: {
        200: z.object({
          secretaryName: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
  },
  receipts: {
    list: {
      method: "GET" as const,
      path: "/api/receipts",
      input: z
        .object({
          q: z.string().optional(),
          receiptNumber: z.coerce.number().int().positive().optional(),
          date: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        })
        .optional(),
      responses: {
        200: z.array(z.custom<typeof receipts.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/receipts/:id",
      responses: {
        200: z.custom<typeof receipts.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/receipts",
      input: insertReceiptSchema.extend({
        amountPaid: z.coerce.number().positive(),
      }),
      responses: {
        201: z.custom<typeof receipts.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/receipts/:id",
      input: insertReceiptSchema
        .partial()
        .extend({ amountPaid: z.coerce.number().positive().optional() })
        .optional(),
      responses: {
        200: z.custom<typeof receipts.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/receipts/:id",
      // Apagar um recibo exige sempre uma justificação (registada na auditoria).
      input: z.object({
        reason: z.string().trim().min(5, "Indique uma justificação (mín. 5 caracteres)."),
      }),
      responses: {
        204: z.void(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    pdf: {
      method: "POST" as const,
      path: "/api/receipts/pdf",
      input: z.object({
        receiptIds: z.array(z.coerce.number().int().positive()).min(1),
      }),
      responses: {
        200: z.object({
          pdfBase64: z.string(),
          filename: z.string(),
        }),
        400: errorSchemas.validation,
      },
    },
  },

  // ───────────────────────────── classes (turmas) ─────────────────────────
  classes: {
    list: {
      method: "GET" as const,
      path: "/api/classes",
      input: z.object({ active: z.coerce.boolean().optional() }).optional(),
      responses: { 200: z.array(classRow) },
    },
    get: {
      method: "GET" as const,
      path: "/api/classes/:id",
      responses: { 200: classRow, 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/classes",
      input: classInput,
      responses: { 201: classRow, 400: errorSchemas.validation },
    },
    update: {
      method: "PUT" as const,
      path: "/api/classes/:id",
      input: classInput.partial(),
      responses: { 200: classRow, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/classes/:id",
      // 409 when the class still has students (FK restrict).
      responses: { 204: z.void(), 404: errorSchemas.notFound, 409: errorSchemas.validation },
    },
  },

  // ───────────────────────────── students (alunos) ────────────────────────
  students: {
    list: {
      method: "GET" as const,
      path: "/api/students",
      input: z
        .object({
          classId: z.coerce.number().int().positive().optional(),
          q: z.string().optional(),
          active: z.coerce.boolean().optional(),
        })
        .optional(),
      responses: { 200: z.array(studentRow) },
    },
    get: {
      method: "GET" as const,
      path: "/api/students/:id",
      responses: { 200: studentRow, 404: errorSchemas.notFound },
    },
    create: {
      method: "POST" as const,
      path: "/api/students",
      input: studentInput,
      responses: { 201: studentRow, 400: errorSchemas.validation },
    },
    update: {
      method: "PUT" as const,
      path: "/api/students/:id",
      input: studentInput.partial(),
      responses: { 200: studentRow, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/students/:id",
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },

  // ─────────────────────────── guardians (encarregados) ───────────────────
  guardians: {
    listByStudent: {
      method: "GET" as const,
      path: "/api/students/:id/guardians",
      responses: { 200: z.array(guardianRow) },
    },
    create: {
      method: "POST" as const,
      path: "/api/students/:id/guardians",
      input: guardianInput,
      responses: { 201: guardianRow, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    update: {
      method: "PUT" as const,
      path: "/api/guardians/:id",
      input: guardianInput.partial(),
      responses: { 200: guardianRow, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/guardians/:id",
      responses: { 204: z.void(), 404: errorSchemas.notFound },
    },
  },

  // ───────────────────────────── admin dashboard ──────────────────────────
  admin: {
    stats: {
      method: "GET" as const,
      path: "/api/admin/stats",
      responses: {
        200: z.object({
          totals: z.object({
            students: z.number(),
            activeStudents: z.number(),
            classes: z.number(),
            guardians: z.number(),
            receiptsThisMonth: z.number(),
            revenueThisMonth: z.number(),
            revenueTotal: z.number(),
          }),
          studentsByClass: z.array(
            z.object({
              classId: z.number(),
              name: z.string(),
              level: z.string(),
              count: z.number(),
            }),
          ),
          revenueByMonth: z.array(z.object({ month: z.string(), total: z.number() })),
          receiptsByType: z.array(
            z.object({ type: z.string(), count: z.number(), total: z.number() }),
          ),
          paymentsByMethod: z.array(
            z.object({ method: z.string(), count: z.number(), total: z.number() }),
          ),
          recentReceipts: z.array(z.custom<typeof receipts.$inferSelect>()),
        }),
      },
    },

    pending: {
      method: "GET" as const,
      path: "/api/admin/pending",
      input: z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).optional(),
      responses: { 200: z.array(pendingPaymentSchema) },
    },

    usersList: {
      method: "GET" as const,
      path: "/api/admin/users",
      responses: { 200: z.array(adminUserSchema) },
    },
    userCreate: {
      method: "POST" as const,
      path: "/api/admin/users",
      input: userCreateInput,
      responses: { 201: adminUserSchema, 400: errorSchemas.validation },
    },
    userUpdate: {
      method: "PUT" as const,
      path: "/api/admin/users/:id",
      input: userUpdateInput,
      responses: { 200: adminUserSchema, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
    userResetPassword: {
      method: "POST" as const,
      path: "/api/admin/users/:id/reset-password",
      responses: { 200: z.object({ ok: z.literal(true) }), 404: errorSchemas.notFound },
    },
    userResetTwoFactor: {
      method: "POST" as const,
      path: "/api/admin/users/:id/reset-2fa",
      responses: { 200: adminUserSchema, 404: errorSchemas.notFound },
    },

    audit: {
      method: "GET" as const,
      path: "/api/admin/audit",
      input: z
        .object({
          limit: z.coerce.number().int().positive().max(100).optional(),
          cursor: z.coerce.number().int().positive().optional(),
          action: z.string().optional(),
          q: z.string().optional(),
        })
        .optional(),
      responses: {
        200: z.object({
          items: z.array(auditEntrySchema),
          nextCursor: z.number().nullable(),
        }),
      },
    },

    recibosList: {
      method: "GET" as const,
      path: "/api/admin/recibos",
      input: z
        .object({
          q: z.string().optional(),
          method: z.string().optional(),
          studentId: z.coerce.number().int().positive().optional(),
          includeVoided: z.coerce.boolean().optional(),
        })
        .optional(),
      responses: { 200: z.array(receiptRow) },
    },
    recibosTotals: {
      method: "GET" as const,
      path: "/api/admin/recibos/totals",
      responses: {
        200: z.object({ emitted: z.number(), totalValue: z.number(), voided: z.number() }),
      },
    },
    recibosVoid: {
      method: "POST" as const,
      path: "/api/admin/recibos/:id/void",
      input: voidReceiptInput,
      responses: { 200: receiptRow, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },

    statementMonthly: {
      method: "POST" as const,
      path: "/api/admin/statements/monthly",
      input: monthlyStatementInput,
      responses: { 200: pdfResponse, 400: errorSchemas.validation },
    },
    statementAnnual: {
      method: "POST" as const,
      path: "/api/admin/statements/annual",
      input: annualStatementInput,
      responses: { 200: pdfResponse, 400: errorSchemas.validation },
    },
    statementStudent: {
      method: "POST" as const,
      path: "/api/admin/statements/student",
      input: studentStatementInput,
      responses: { 200: pdfResponse, 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },

    // ── histórico de extratos gerados ──
    statementsList: {
      method: "GET" as const,
      path: "/api/admin/statements",
      input: z.object({ includeDeleted: z.coerce.boolean().optional() }).optional(),
      responses: { 200: z.array(statementMetaSchema) },
    },
    statementFile: {
      method: "GET" as const,
      path: "/api/admin/statements/:id/pdf",
      responses: { 200: pdfResponse, 404: errorSchemas.notFound },
    },
    statementDelete: {
      method: "POST" as const,
      path: "/api/admin/statements/:id/delete",
      input: deleteStatementInput,
      responses: { 200: z.object({ ok: z.literal(true) }), 400: errorSchemas.validation, 404: errorSchemas.notFound },
    },
  },
};

// (idParam is exported for server-side :id parsing.)
export { idParam };

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}

export type SettingsResponse = z.infer<typeof api.settings.get.responses[200]>;
export type UpdateSettingsInput = z.infer<typeof api.settings.update.input>;

export type ReceiptsListResponse = z.infer<typeof api.receipts.list.responses[200]>;
export type ReceiptResponse = z.infer<typeof api.receipts.get.responses[200]>;
export type CreateReceiptInput = z.infer<typeof api.receipts.create.input>;
export type UpdateReceiptInput = z.infer<typeof api.receipts.update.input>;
export type CreatePdfInput = z.infer<typeof api.receipts.pdf.input>;

export type PublicUser = z.infer<typeof publicUserSchema>;
export type LoginInput = z.infer<typeof api.auth.login.input>;
export type TwoFactorInput = z.infer<typeof api.auth.twoFactor.input>;
export type ForgotPasswordInput = z.infer<typeof api.auth.forgotPassword.input>;
export type ResetPasswordInput = z.infer<typeof api.auth.resetPassword.input>;

export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;

// ───────────────────────── school-domain types ─────────────────────────
export type ClassRow = typeof classes.$inferSelect;
export type StudentRow = typeof students.$inferSelect;
export type GuardianRow = typeof guardians.$inferSelect;

export type ClassInput = z.infer<typeof classInput>;
export type StudentInput = z.infer<typeof studentInput>;
export type GuardianInput = z.infer<typeof guardianInput>;
export type ClassLevel = z.infer<typeof classLevelSchema>;
export type GuardianRelationship = z.infer<typeof guardianRelationshipSchema>;

export type ClassesListResponse = z.infer<typeof api.classes.list.responses[200]>;
export type StudentsListResponse = z.infer<typeof api.students.list.responses[200]>;
export type GuardiansListResponse = z.infer<typeof api.guardians.listByStudent.responses[200]>;
export type AdminStatsResponse = z.infer<typeof api.admin.stats.responses[200]>;

export type ReceiptRow = typeof receipts.$inferSelect;
export type AdminUser = z.infer<typeof adminUserSchema>;
export type AuditEntry = z.infer<typeof auditEntrySchema>;
export type PendingPayment = z.infer<typeof pendingPaymentSchema>;
export type UserCreateInput = z.infer<typeof userCreateInput>;
export type UserUpdateInput = z.infer<typeof userUpdateInput>;
export type Role = z.infer<typeof roleSchema>;
export type AuditListResponse = z.infer<typeof api.admin.audit.responses[200]>;
export type StatementMeta = z.infer<typeof statementMetaSchema>;
