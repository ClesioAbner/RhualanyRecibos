import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  api,
  buildUrl,
  type ClassRow,
  type StudentRow,
  type GuardianRow,
  type ClassInput,
  type StudentInput,
  type GuardianInput,
  type AdminStatsResponse,
  type AdminUser,
  type AuditEntry,
  type AuditListResponse,
  type PendingPayment,
  type ReceiptRow,
  type UserCreateInput,
  type UserUpdateInput,
  type StatementMeta,
} from "@shared/routes";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

async function send<T>(method: string, path: string, body?: unknown): Promise<T | null> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: body ? { "Content-Type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });
  if (!res.ok) {
    let msg = "Ocorreu um erro.";
    try {
      msg = (await res.json())?.message ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (res.status === 204) return null;
  return res.json();
}

// ───────────────────────────── stats ─────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: [api.admin.stats.path],
    queryFn: () => getJson<AdminStatsResponse>(api.admin.stats.path),
    staleTime: 30_000,
  });
}

// ───────────────────────────── classes ─────────────────────────────
export function useClasses(active?: boolean) {
  return useQuery({
    queryKey: [api.classes.list.path, { active }],
    queryFn: () =>
      getJson<ClassRow[]>(
        `${api.classes.list.path}${active !== undefined ? `?active=${active}` : ""}`,
      ),
    staleTime: 30_000,
  });
}

export function useCreateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ClassInput) => send<ClassRow>("POST", api.classes.create.path, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.classes.list.path] }),
  });
}

export function useUpdateClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<ClassInput> }) =>
      send<ClassRow>("PUT", buildUrl(api.classes.update.path, { id }), updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.classes.list.path] }),
  });
}

export function useDeleteClass() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => send("DELETE", buildUrl(api.classes.delete.path, { id })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.classes.list.path] });
      qc.invalidateQueries({ queryKey: [api.students.list.path] });
      qc.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

// ───────────────────────────── students ─────────────────────────────
export type StudentFilters = { classId?: number; q?: string; active?: boolean };

export function useStudents(filters?: StudentFilters) {
  const sp = new URLSearchParams();
  if (filters?.classId) sp.set("classId", String(filters.classId));
  if (filters?.q) sp.set("q", filters.q);
  if (filters?.active !== undefined) sp.set("active", String(filters.active));
  const qs = sp.toString();
  return useQuery({
    queryKey: [api.students.list.path, filters ?? {}],
    queryFn: () => getJson<StudentRow[]>(`${api.students.list.path}${qs ? `?${qs}` : ""}`),
    staleTime: 15_000,
  });
}

export function useStudent(id?: number) {
  return useQuery({
    queryKey: [api.students.get.path, id],
    queryFn: () => getJson<StudentRow>(buildUrl(api.students.get.path, { id: id! })),
    enabled: !!id,
  });
}

export function useCreateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: StudentInput) => send<StudentRow>("POST", api.students.create.path, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.students.list.path] });
      qc.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

export function useUpdateStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: Partial<StudentInput> }) =>
      send<StudentRow>("PUT", buildUrl(api.students.update.path, { id }), updates),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.students.list.path] });
      qc.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

export function useDeleteStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => send("DELETE", buildUrl(api.students.delete.path, { id })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.students.list.path] });
      qc.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

// ───────────────────────────── guardians ─────────────────────────────
export function useGuardians(studentId?: number) {
  return useQuery({
    queryKey: [api.guardians.listByStudent.path, studentId],
    queryFn: () =>
      getJson<GuardianRow[]>(buildUrl(api.guardians.listByStudent.path, { id: studentId! })),
    enabled: !!studentId,
  });
}

export function useCreateGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ studentId, input }: { studentId: number; input: GuardianInput }) =>
      send<GuardianRow>("POST", buildUrl(api.guardians.create.path, { id: studentId }), input),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: [api.guardians.listByStudent.path, v.studentId] }),
  });
}

export function useUpdateGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      updates,
    }: {
      id: number;
      studentId: number;
      updates: Partial<GuardianInput>;
    }) => send<GuardianRow>("PUT", buildUrl(api.guardians.update.path, { id }), updates),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: [api.guardians.listByStudent.path, v.studentId] }),
  });
}

export function useDeleteGuardian() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id }: { id: number; studentId: number }) =>
      send("DELETE", buildUrl(api.guardians.delete.path, { id })),
    onSuccess: (_d, v) =>
      qc.invalidateQueries({ queryKey: [api.guardians.listByStudent.path, v.studentId] }),
  });
}

// ───────────────────────── single receipt ─────────────────────────
export function useReceipt(id?: number) {
  return useQuery({
    queryKey: [api.receipts.get.path, id],
    queryFn: () => getJson<ReceiptRow>(buildUrl(api.receipts.get.path, { id: id! })),
    enabled: !!id,
  });
}

// ───────────────────────── pending payments ─────────────────────────
export function usePendingPayments(month?: string) {
  return useQuery({
    queryKey: [api.admin.pending.path, month ?? "current"],
    queryFn: () =>
      getJson<PendingPayment[]>(`${api.admin.pending.path}${month ? `?month=${month}` : ""}`),
    staleTime: 30_000,
  });
}

// ───────────────────────────── users ─────────────────────────────
export function useUsers() {
  return useQuery({
    queryKey: [api.admin.usersList.path],
    queryFn: () => getJson<AdminUser[]>(api.admin.usersList.path),
    staleTime: 30_000,
  });
}

export function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: UserCreateInput) => send<AdminUser>("POST", api.admin.userCreate.path, input),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.usersList.path] }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UserUpdateInput }) =>
      send<AdminUser>("PUT", buildUrl(api.admin.userUpdate.path, { id }), updates),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.usersList.path] }),
  });
}

export function useResetUserPassword() {
  return useMutation({
    mutationFn: (id: number) => send("POST", buildUrl(api.admin.userResetPassword.path, { id })),
  });
}

export function useResetUserTwoFactor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => send("POST", buildUrl(api.admin.userResetTwoFactor.path, { id })),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.usersList.path] }),
  });
}

// ───────────────────────────── audit log ─────────────────────────────
export type AuditFilters = { action?: string; q?: string };

export function useAudit(filters?: AuditFilters) {
  return useInfiniteQuery({
    queryKey: [api.admin.audit.path, filters ?? {}],
    initialPageParam: undefined as number | undefined,
    queryFn: ({ pageParam }) => {
      const sp = new URLSearchParams();
      sp.set("limit", "30");
      if (pageParam) sp.set("cursor", String(pageParam));
      if (filters?.action) sp.set("action", filters.action);
      if (filters?.q) sp.set("q", filters.q);
      return getJson<AuditListResponse>(`${api.admin.audit.path}?${sp.toString()}`);
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 15_000,
  });
}

// ───────────────────────── recibos (admin) ─────────────────────────
export type ReceiptAdminFilters = {
  q?: string;
  method?: string;
  studentId?: number;
  includeVoided?: boolean;
};

export function useAdminReceipts(filters?: ReceiptAdminFilters) {
  const sp = new URLSearchParams();
  if (filters?.q) sp.set("q", filters.q);
  if (filters?.method) sp.set("method", filters.method);
  if (filters?.studentId) sp.set("studentId", String(filters.studentId));
  if (filters?.includeVoided) sp.set("includeVoided", "true");
  const qs = sp.toString();
  return useQuery({
    queryKey: [api.admin.recibosList.path, filters ?? {}],
    queryFn: () => getJson<ReceiptRow[]>(`${api.admin.recibosList.path}${qs ? `?${qs}` : ""}`),
    staleTime: 15_000,
  });
}

export function useReceiptTotals() {
  return useQuery({
    queryKey: [api.admin.recibosTotals.path],
    queryFn: () =>
      getJson<{ emitted: number; totalValue: number; voided: number }>(api.admin.recibosTotals.path),
    staleTime: 15_000,
  });
}

export function useVoidReceipt() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      send<ReceiptRow>("POST", buildUrl(api.admin.recibosVoid.path, { id }), { reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [api.admin.recibosList.path] });
      qc.invalidateQueries({ queryKey: [api.admin.recibosTotals.path] });
      qc.invalidateQueries({ queryKey: [api.admin.stats.path] });
    },
  });
}

// ───────────────────────── downloads (PDF / CSV) ─────────────────────────
export function downloadBase64Pdf(pdfBase64: string, filename: string) {
  const bytes = Uint8Array.from(atob(pdfBase64), (c) => c.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadCsv(path: string, filename: string) {
  const res = await fetch(`${API_BASE}${path}`, { credentials: "include" });
  if (!res.ok) throw new Error("Falha na exportação.");
  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type StatementResponse = { pdfBase64: string; filename: string };

export function useStatementMonthly() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (month: string) => {
      const r = await send<StatementResponse>("POST", api.admin.statementMonthly.path, { month });
      if (r) downloadBase64Pdf(r.pdfBase64, r.filename);
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.statementsList.path] }),
  });
}

export function useStatementAnnual() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (year: string) => {
      const r = await send<StatementResponse>("POST", api.admin.statementAnnual.path, { year });
      if (r) downloadBase64Pdf(r.pdfBase64, r.filename);
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.statementsList.path] }),
  });
}

export function useStatementStudent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { studentId: number; year: string }) => {
      const r = await send<StatementResponse>("POST", api.admin.statementStudent.path, input);
      if (r) downloadBase64Pdf(r.pdfBase64, r.filename);
      return r;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.statementsList.path] }),
  });
}

// ── histórico de extratos ──
export function useStatementsHistory(includeDeleted = false) {
  return useQuery({
    queryKey: [api.admin.statementsList.path, { includeDeleted }],
    queryFn: () => getJson<StatementMeta[]>(`${api.admin.statementsList.path}${includeDeleted ? "?includeDeleted=true" : ""}`),
    staleTime: 15_000,
  });
}

export async function downloadStatement(id: number) {
  const r = await getJson<StatementResponse>(buildUrl(api.admin.statementFile.path, { id }));
  downloadBase64Pdf(r.pdfBase64, r.filename);
}

export function useDeleteStatement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) =>
      send("POST", buildUrl(api.admin.statementDelete.path, { id }), { reason }),
    onSuccess: () => qc.invalidateQueries({ queryKey: [api.admin.statementsList.path] }),
  });
}

export type { AuditEntry };
