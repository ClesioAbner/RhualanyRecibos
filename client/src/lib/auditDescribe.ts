import type { AuditEntry } from "@shared/routes";
import { formatMt } from "@/lib/format";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const monthName = (m?: string) => {
  const n = Number(String(m ?? "").slice(5, 7));
  return n >= 1 && n <= 12 ? `${MONTHS[n - 1]} ${String(m).slice(0, 4)}` : m ?? "";
};

const FIELD_LABEL: Record<string, string> = {
  fullName: "Nome",
  name: "Nome",
  classId: "Turma (ID)",
  internalNumber: "Nº interno",
  birthdate: "Data de nascimento",
  monthlyFeeOverride: "Mensalidade própria",
  monthlyFee: "Mensalidade",
  active: "Activo",
  level: "Nível",
  role: "Perfil",
  email: "Email",
  phone: "Telefone",
  relationship: "Parentesco",
  isPrimary: "Principal",
  reason: "Motivo",
  receiptNumber: "Nº do recibo",
  studentName: "Aluno",
  amountPaid: "Valor",
  paymentMethod: "Método",
  month: "Mês",
  year: "Ano",
  secretaryName: "Chefe da secretaria",
  students: "Alunos removidos",
  studentsRemoved: "Alunos removidos",
  step: "Passo",
  twoFactor: "Com 2FA",
  notes: "Notas",
  avatarUrl: "Foto",
};

export const fieldLabel = (k: string) => FIELD_LABEL[k] ?? k;

export function fieldValue(k: string, v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "Sim" : "Não";
  if (k === "avatarUrl") return "(imagem)";
  if (k === "amountPaid" || k === "monthlyFee" || k === "monthlyFeeOverride") return `${formatMt(Number(v))} MT`;
  if (k === "month") return monthName(String(v));
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

/** Frase curta sobre o alvo do evento, a partir dos metadados. */
export function describeAudit(a: AuditEntry): string {
  const m = (a.metadata ?? {}) as Record<string, any>;
  const [domain] = a.action.split(".");
  switch (domain) {
    case "student":
      return m.fullName ? `Aluno: ${m.fullName}` : a.targetId ? `Aluno #${a.targetId}` : "";
    case "guardian":
      return [m.fullName && `Encarregado: ${m.fullName}`, m.studentName && `aluno ${m.studentName}`].filter(Boolean).join(" · ");
    case "class":
      return m.name ? `Turma: ${m.name}` : a.targetId ? `Turma #${a.targetId}` : "";
    case "receipt": {
      const parts = [m.receiptNumber && `Recibo nº ${m.receiptNumber}`, m.studentName, m.amountPaid != null && `${formatMt(Number(m.amountPaid))} MT`];
      return parts.filter(Boolean).join(" · ") || (a.targetId ? `Recibo #${a.targetId}` : "");
    }
    case "statement":
      if (m.month) return `Mês: ${monthName(m.month)}`;
      if (m.year) return `Ano: ${m.year}`;
      return m.reason ? `Motivo: ${m.reason}` : "";
    case "year":
      return m.year ? `Ano lectivo ${m.year}` : "";
    case "settings":
      return m.secretaryName ? `Chefe da secretaria: ${m.secretaryName}` : "";
    case "user":
      if (a.action === "user.login_failed") return m.step === "2fa" ? "Código 2FA incorrecto" : "Email ou palavra-passe incorrectos";
      if (m.email) return `Conta: ${m.email}`;
      return "";
    default:
      return "";
  }
}

/** Link para o alvo (quando ainda existe uma página para ele). */
export function auditTargetLink(a: AuditEntry): string | null {
  // O próprio alvo foi apagado → já não há página para abrir.
  if (!a.targetId || a.action === `${a.targetType}.deleted` || a.action === "receipt.delete") return null;
  if (a.targetType === "student") return `/admin/alunos/${a.targetId}`;
  if (a.targetType === "user") return `/admin/utilizadores/${a.targetId}`;
  if (a.targetType === "class") return "/admin/turmas";
  if (a.targetType === "receipt") return "/admin/recibos";
  if (a.targetType === "year") return `/admin/historico?ano=${a.targetId}`;
  return null;
}
