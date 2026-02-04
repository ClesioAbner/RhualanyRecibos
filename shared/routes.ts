import { z } from "zod";
import { insertReceiptSchema, receipts } from "./schema";

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

export const api = {
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
      responses: {
        204: z.void(),
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
};

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

export type ValidationError = z.infer<typeof errorSchemas.validation>;
export type NotFoundError = z.infer<typeof errorSchemas.notFound>;
export type InternalError = z.infer<typeof errorSchemas.internal>;
