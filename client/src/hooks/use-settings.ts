import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type SettingsResponse, type UpdateSettingsInput } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: z.ZodSchema<T>, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useSettings() {
  return useQuery({
    queryKey: [api.settings.get.path],
    queryFn: async (): Promise<SettingsResponse> => {
      const res = await fetch(api.settings.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Falha ao carregar definições.");
      const json = await res.json();
      return parseWithLogging(api.settings.get.responses[200], json, "settings.get[200]");
    },
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateSettingsInput) => {
      const validated = parseWithLogging(api.settings.update.input, input, "settings.update[input]");
      const res = await fetch(api.settings.update.path, {
        method: api.settings.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });

      if (!res.ok) {
        if (res.status === 400) {
          const err = parseWithLogging(api.settings.update.responses[400], await res.json(), "settings.update[400]");
          throw new Error(err.message);
        }
        throw new Error("Falha ao guardar definições.");
      }

      return parseWithLogging(api.settings.update.responses[200], await res.json(), "settings.update[200]");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.settings.get.path] }),
  });
}
