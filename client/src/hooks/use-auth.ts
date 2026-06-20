
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {  api, type PublicUser, type LoginInput,  type TwoFactorInput,   type ForgotPasswordInput, type ResetPasswordInput,
} from "@shared/routes";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function postJson(path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
}

async function errorMessage(res: Response, fallback: string): Promise<string> {
  try {
    const data = await res.json();
    return data?.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Current session user, or null if not authenticated (401). */
export function useMe() {
  return useQuery<PublicUser | null>({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}${api.auth.me.path}`, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Falha ao verificar sessão.");
      return res.json();
    },
    retry: false,
    staleTime: 30_000,
  });
}

export type LoginResult = { user: PublicUser } | { twoFactorRequired: true };

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LoginInput): Promise<LoginResult> => {
      const res = await postJson(api.auth.login.path, input);
      if (!res.ok) throw new Error(await errorMessage(res, "Não foi possível iniciar sessão."));
      return res.json();
    },
    onSuccess: (result) => {
      if ("user" in result) {
        qc.setQueryData([api.auth.me.path], result.user);
      }
    },
  });
}

export function useVerifyTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TwoFactorInput): Promise<{ user: PublicUser }> => {
      const res = await postJson(api.auth.twoFactor.path, input);
      if (!res.ok) throw new Error(await errorMessage(res, "Código inválido."));
      return res.json();
    },
    onSuccess: ({ user }) => qc.setQueryData([api.auth.me.path], user),
  });
}

export function useUpdateAvatar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (avatarUrl: string): Promise<PublicUser> => {
      const res = await fetch(`${API_BASE}${api.auth.updateAvatar.path}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ avatarUrl }),
        credentials: "include",
      });
      if (!res.ok) throw new Error(await errorMessage(res, "Não foi possível atualizar a foto."));
      return res.json();
    },
    onSuccess: (user) => qc.setQueryData([api.auth.me.path], user),
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: async (input: { currentPassword: string; newPassword: string }) => {
      const res = await postJson(api.auth.changePassword.path, input);
      if (!res.ok) throw new Error(await errorMessage(res, "Não foi possível alterar a palavra-passe."));
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      await postJson(api.auth.logout.path);
    },
    onSuccess: () => {
      qc.setQueryData([api.auth.me.path], null);
      qc.clear();
    },
  });
}

export function useForgotPassword() {
  return useMutation({
    mutationFn: async (input: ForgotPasswordInput) => {
      // Always resolves: the endpoint returns 204 regardless of whether the
      // email exists.
      await postJson(api.auth.forgotPassword.path, input);
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async (input: ResetPasswordInput) => {
      const res = await postJson(api.auth.resetPassword.path, input);
      if (!res.ok) throw new Error(await errorMessage(res, "Não foi possível repor a palavra-passe."));
    },
  });
}

// 2FA authentication setup and management
// como funciona todo metodo de autenticação 2FA
// 
export function useTwoFactorSetup() {
  return useMutation({
    mutationFn: async (): Promise<{ secret: string; uri: string }> => {
      const res = await postJson(api.auth.twoFactorSetup.path);
      if (!res.ok) throw new Error(await errorMessage(res, "Falha ao iniciar configuração."));
      return res.json();
    },
  });
}

// como ativar o 2FA depois de ter recibido
export function useTwoFactorEnable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (token: string): Promise<{ recoveryCodes: string[] }> => {
      const res = await postJson(api.auth.twoFactorEnable.path, { token });
      if (!res.ok) throw new Error(await errorMessage(res, "Código incorreto."));
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.auth.me.path] }),
  });
}

export function useTwoFactorDisable() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (password: string) => {
      const res = await postJson(api.auth.twoFactorDisable.path, { password });
      if (!res.ok) throw new Error(await errorMessage(res, "Não foi possível desativar o 2FA."));
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.auth.me.path] }),
  });
}
