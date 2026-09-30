// Catálogo da auditoria, partilhado entre servidor (filtros) e cliente (rótulos).

export type AuditCategory =
  | "sessoes"
  | "alunos"
  | "turmas"
  | "recibos"
  | "utilizadores"
  | "extratos"
  | "sistema";

const SESSION_ACTIONS = ["user.login", "user.login_failed", "user.logout"];

export const AUDIT_CATEGORIES: Record<
  AuditCategory,
  { label: string; actions?: string[]; prefixes?: string[]; exclude?: string[] }
> = {
  sessoes: { label: "Sessões", actions: SESSION_ACTIONS },
  alunos: { label: "Alunos", prefixes: ["student.", "guardian."] },
  turmas: { label: "Turmas", prefixes: ["class."] },
  recibos: { label: "Recibos", prefixes: ["receipt."] },
  utilizadores: { label: "Utilizadores", prefixes: ["user."], exclude: SESSION_ACTIONS },
  extratos: { label: "Extratos", prefixes: ["statement."] },
  sistema: { label: "Sistema", prefixes: ["settings.", "year."] },
};

export const AUDIT_CATEGORY_KEYS = Object.keys(AUDIT_CATEGORIES) as AuditCategory[];

export function auditCategoryOf(action: string): AuditCategory | null {
  for (const key of AUDIT_CATEGORY_KEYS) {
    const c = AUDIT_CATEGORIES[key];
    if (c.exclude?.includes(action)) continue;
    if (c.actions?.includes(action)) return key;
    if (c.prefixes?.some((p) => action.startsWith(p))) return key;
  }
  return null;
}

export const AUDIT_ACTION_LABEL: Record<string, string> = {
  "user.login": "Início de sessão",
  "user.login_failed": "Tentativa de acesso falhada",
  "user.logout": "Fim de sessão",
  "user.created": "Utilizador criado",
  "user.updated": "Utilizador actualizado",
  "user.deactivated": "Conta desactivada",
  "user.reactivated": "Conta reactivada",
  "user.password_reset": "Reposição de palavra-passe enviada",
  "user.password_reset_completed": "Palavra-passe reposta pelo utilizador",
  "user.password_change": "Palavra-passe alterada",
  "user.2fa_reset": "2FA reposto",
  "user.2fa_enabled": "2FA activado",
  "user.2fa_disabled": "2FA desactivado",
  "class.created": "Turma criada",
  "class.updated": "Turma actualizada",
  "class.deactivated": "Turma desactivada",
  "class.deleted": "Turma apagada",
  "student.created": "Aluno criado",
  "student.updated": "Aluno actualizado",
  "student.deleted": "Aluno apagado",
  "guardian.created": "Encarregado adicionado",
  "guardian.updated": "Encarregado actualizado",
  "guardian.deleted": "Encarregado removido",
  "receipt.created": "Recibo emitido",
  "receipt.updated": "Recibo editado",
  "receipt.voided": "Recibo anulado",
  "receipt.delete": "Recibo apagado",
  "receipt.deleted": "Recibo apagado",
  "statement.monthly": "Extrato mensal gerado",
  "statement.annual": "Extrato anual gerado",
  "statement.student": "Extrato de aluno gerado",
  "statement.deleted": "Extrato apagado",
  "settings.updated": "Definições alteradas",
  "year.opened": "Ano lectivo aberto",
  "year.closed": "Ano lectivo fechado",
  "year.updated": "Ano lectivo actualizado",
};

export const auditActionLabel = (action: string) => AUDIT_ACTION_LABEL[action] ?? action;
