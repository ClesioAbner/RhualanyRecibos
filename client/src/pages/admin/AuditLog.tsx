import { useMemo, useState } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import { useAudit, downloadCsv } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatRelative, formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileDown, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import type { AuditEntry } from "@shared/routes";

const ACTIONS = [
  "receipt.voided",
  "user.created",
  "user.updated",
  "user.password_reset",
  "user.2fa_reset",
  "class.created",
  "class.updated",
  "class.deleted",
  "student.created",
  "student.updated",
  "student.deleted",
  "statement.monthly",
  "statement.annual",
  "statement.student",
];

const ACTION_LABEL: Record<string, string> = {
  "receipt.voided": "Recibo anulado",
  "user.created": "Utilizador criado",
  "user.updated": "Utilizador actualizado",
  "user.password_reset": "Palavra-passe reposta",
  "user.2fa_reset": "2FA reposto",
  "class.created": "Turma criada",
  "class.updated": "Turma actualizada",
  "class.deleted": "Turma apagada",
  "student.created": "Aluno criado",
  "student.updated": "Aluno actualizado",
  "student.deleted": "Aluno apagado",
  "statement.monthly": "Extrato mensal gerado",
  "statement.annual": "Extrato anual gerado",
  "statement.student": "Extrato de aluno gerado",
};

function targetLink(type: string | null, id: string | null): string | null {
  if (!id) return null;
  if (type === "student") return `/admin/alunos/${id}`;
  if (type === "user") return `/admin/utilizadores/${id}`;
  if (type === "class") return "/admin/turmas";
  if (type === "receipt") return "/admin/recibos";
  return null;
}

function MetaCell({ metadata }: { metadata: any }) {
  const [open, setOpen] = useState(false);
  if (!metadata || (typeof metadata === "object" && Object.keys(metadata).length === 0)) {
    return <span style={{ color: C.textMuted }}>—</span>;
  }
  const entries = typeof metadata === "object" ? Object.entries(metadata) : [["valor", metadata]];
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-1 text-[12px] font-medium"
        style={{ color: C.accent }}
      >
        {open ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {open ? "ocultar" : "detalhes"}
      </button>
      {open && (
        <div className="mt-1.5 space-y-1">
          {entries.map(([k, v]) => (
            <div key={k} className="flex gap-2 text-[11.5px]">
              <span className="font-semibold" style={{ color: C.textSecondary }}>{k}:</span>
              <span className="break-all" style={{ color: C.textPrimary }}>
                {typeof v === "object" ? JSON.stringify(v) : String(v)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminAuditLog() {
  const { toast } = useToast();
  const [action, setAction] = useState("all");
  const [q, setQ] = useState("");
  const filters = { action: action !== "all" ? action : undefined, q: q.trim() || undefined };
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useAudit(filters);

  const items = useMemo(() => (data?.pages ?? []).flatMap((p) => p.items) as AuditEntry[], [data]);

  const exportCsv = async () => {
    const sp = new URLSearchParams();
    if (filters.action) sp.set("action", filters.action);
    if (filters.q) sp.set("q", filters.q);
    const qs = sp.toString();
    try {
      await downloadCsv(`/api/admin/audit/export${qs ? `?${qs}` : ""}`, `auditoria_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminShell
      title="Auditoria"
      subtitle="Histórico de operações do sistema"
      actions={
        <Button variant="outline" className="gap-2" onClick={exportCsv} data-testid="audit-export">
          <FileDown size={16} /> Exportar CSV
        </Button>
      }
    >
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pesquisar por email ou acção…"
          className="flex-1"
          data-testid="audit-search"
        />
        <Select value={action} onValueChange={setAction}>
          <SelectTrigger className="sm:w-64" data-testid="audit-filter-action"><SelectValue placeholder="Acção" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as acções</SelectItem>
            {ACTIONS.map((a) => (
              <SelectItem key={a} value={a}>{ACTION_LABEL[a] ?? a}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <AdminCard noPadding>
        {isLoading ? (
          <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
            <Loader2 className="animate-spin" size={16} /> A carregar…
          </div>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm" style={{ color: C.textMuted }}>Sem registos de auditoria para estes filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: C.textMuted }} className="text-[11px] uppercase tracking-wide border-b" >
                  <th className="text-left font-semibold px-4 py-3">Acção</th>
                  <th className="text-left font-semibold px-4 py-3">Quem</th>
                  <th className="text-left font-semibold px-4 py-3">Alvo</th>
                  <th className="text-left font-semibold px-4 py-3">Quando</th>
                  <th className="text-left font-semibold px-4 py-3">Detalhes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => {
                  const link = targetLink(a.targetType, a.targetId);
                  return (
                    <tr key={a.id} data-testid={`audit-row-${a.id}`} className="border-t align-top" style={{ borderColor: "#f1f5f9" }}>
                      {/* Acção: rótulo legível + código */}
                      <td className="px-4 py-3">
                        <p className="font-semibold leading-tight" style={{ color: C.textPrimary }}>
                          {ACTION_LABEL[a.action] ?? a.action}
                        </p>
                        <p className="text-[11px] font-mono leading-tight" style={{ color: C.textMuted }}>{a.action}</p>
                      </td>
                      {/* Quem */}
                      <td className="px-4 py-3" style={{ color: C.textSecondary }}>{a.actorEmail ?? "sistema"}</td>
                      {/* Alvo */}
                      <td className="px-4 py-3" style={{ color: C.textSecondary }}>
                        {a.targetType ? (
                          link ? (
                            <Link href={link} className="hover:underline" style={{ color: C.accent }}>
                              {a.targetType} #{a.targetId ?? "?"}
                            </Link>
                          ) : (
                            <span>{a.targetType} #{a.targetId ?? "?"}</span>
                          )
                        ) : "—"}
                      </td>
                      {/* Quando */}
                      <td className="px-4 py-3 whitespace-nowrap" style={{ color: C.textSecondary }} title={formatDateTime(a.createdAt)}>
                        {formatRelative(a.createdAt)}
                      </td>
                      {/* Detalhes */}
                      <td className="px-4 py-3 max-w-[300px]">
                        <MetaCell metadata={a.metadata} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      {items.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-[12px]" style={{ color: C.textMuted }}>{items.length} registo(s) carregado(s)</span>
          {hasNextPage && (
            <Button variant="outline" onClick={() => fetchNextPage()} disabled={isFetchingNextPage} className="gap-2" data-testid="audit-load-more">
              {isFetchingNextPage && <Loader2 className="animate-spin" size={15} />} Carregar mais
            </Button>
          )}
        </div>
      )}
    </AdminShell>
  );
}
