import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  api,
  buildUrl,
  type CreatePdfInput,
  type CreateReceiptInput,
  type ReceiptResponse,
  type ReceiptsListResponse,
  type UpdateReceiptInput,
} from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

function toQueryString(params?: Record<string, unknown>) {
  if (!params) return "";
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v === undefined || v === null || v === "") return;
    sp.set(k, String(v));
  });
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export type ReceiptsListFilters = z.infer<NonNullable<(typeof api.receipts.list)["input"]>>;

export function useReceipts(filters?: ReceiptsListFilters) {
  return useQuery({
    queryKey: [api.receipts.list.path, filters ?? {}],
    queryFn: async (): Promise<ReceiptsListResponse> => {
      const url = `${api.receipts.list.path}${toQueryString(filters as Record<string, unknown> | undefined)}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar recibos.");
      const json = await res.json();
      return parseWithLogging(api.receipts.list.responses[200], json, "receipts.list[200]");
    },
  });
}

export function useReceipt(id: number) {
  return useQuery({
    queryKey: [api.receipts.get.path, id],
    queryFn: async (): Promise<ReceiptResponse | null> => {
      const url = buildUrl(api.receipts.get.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Falha ao carregar recibo.");
      const json = await res.json();
      return parseWithLogging(api.receipts.get.responses[200], json, "receipts.get[200]");
    },
    enabled: Number.isFinite(id) && id > 0,
  });
}

export function useCreateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateReceiptInput) => {
      const validated = parseWithLogging(api.receipts.create.input, input, "receipts.create[input]");
      const res = await fetch(api.receipts.create.path, {
        method: api.receipts.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.receipts.create.responses[400], await res.json(), "receipts.create[400]");
          throw new Error(err.message);
        }
        throw new Error("Falha ao emitir recibo.");
      }

      const json = await res.json();
      return parseWithLogging(api.receipts.create.responses[201], json, "receipts.create[201]");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.receipts.list.path] });
    },
  });
}

export function useUpdateReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates?: UpdateReceiptInput }) => {
      const validated = updates
        ? parseWithLogging(api.receipts.update.input, updates, "receipts.update[input]")
        : undefined;

      const url = buildUrl(api.receipts.update.path, { id });
      const res = await fetch(url, {
        method: api.receipts.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated ?? {}),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.receipts.update.responses[400], await res.json(), "receipts.update[400]");
          throw new Error(err.message);
        }
        if (res.status === 404) {
          const err = parseWithLogging(api.receipts.update.responses[404], await res.json(), "receipts.update[404]");
          throw new Error(err.message);
        }
        throw new Error("Falha ao atualizar recibo.");
      }

      const json = await res.json();
      return parseWithLogging(api.receipts.update.responses[200], json, "receipts.update[200]");
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: [api.receipts.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.receipts.get.path, variables.id] });
    },
  });
}

export function useDeleteReceipt() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.receipts.delete.path, { id });
      const res = await fetch(url, {
        method: api.receipts.delete.method,
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 404) {
          const err = parseWithLogging(api.receipts.delete.responses[404], await res.json(), "receipts.delete[404]");
          throw new Error(err.message);
        }
        throw new Error("Falha ao apagar recibo.");
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.receipts.list.path] }),
  });
}

export function useCreateReceiptsPdf() {
  return useMutation({
    mutationFn: async (input: CreatePdfInput) => {
      const validated = parseWithLogging(api.receipts.pdf.input, input, "receipts.pdf[input]");
      const res = await fetch(api.receipts.pdf.path, {
        method: api.receipts.pdf.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.receipts.pdf.responses[400], await res.json(), "receipts.pdf[400]");
          throw new Error(err.message);
        }
        throw new Error("Falha ao gerar PDF.");
      }

      const json = await res.json();
      return parseWithLogging(api.receipts.pdf.responses[200], json, "receipts.pdf[200]");
    },
  });
}
