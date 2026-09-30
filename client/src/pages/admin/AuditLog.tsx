import { Fragment, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import { useAudit, useAuditFacets, useSchoolYears, auditQuery, downloadCsv, type AuditFilters } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { describeAudit, auditTargetLink, fieldLabel, fieldValue } from "@/lib/auditDescribe";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { FileDown, Loader2, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import type { AuditEntry } from "@shared/routes";
import {
  AUDIT_CATEGORIES,
  AUDIT_CATEGORY_KEYS,
  auditActionLabel,
  auditCategoryOf,
  type AuditCategory,
} from "@shared/audit";

const dateOf = (iso: string) =>
  new Date(iso).toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-PT", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/** Campos dos metadados, com as alterações ("changes") abertas em campos próprios. */
function metaFields(a: AuditEntry): [string, unknown][] {
  const meta = a.metadata && typeof a.metadata === "object" ? (a.metadata as Record<string, unknown>) : null;
  if (!meta) return [];
  return Object.entries({ ...meta, ...((meta.changes as object) ?? {}) }).filter(([k]) => k !== "changes");
}

function AuditRow({ a }: { a: AuditEntry }) {
  const [open, setOpen] = useState(false);
  const fields = metaFields(a);
  const link = auditTargetLink(a);
  const category = auditCategoryOf(a.action);
  const failed = a.action === "user.login_failed";
  const expandable = fields.length > 0;

  return (
    <Fragment>
      <tr
        className="border-t align-top transition-colors hover:bg-[#fafbfd]"
        style={{ borderColor: "#f1f5f9", cursor: expandable ? "pointer" : "default" }}
        onClick={() => expandable && setOpen((o) => !o)}
        data-testid={`audit-row-${a.id}`}
      >
        <td className="pl-4 pr-1 py-3 w-6">
          {expandable &&
            (open ? <ChevronDown size={15} style={{ color: C.textMuted }} /> : <ChevronRight size={15} style={{ color: C.textMuted }} />)}
        </td>
        <td className="px-3 py-3 whitespace-nowrap tabular-nums">
          <p style={{ color: C.textPrimary }}>{dateOf(a.createdAt)}</p>
          <p className="text-[11.5px]" style={{ color: C.textMuted }}>{timeOf(a.createdAt)}</p>
        </td>
        <td className="px-3 py-3">
          <p className="font-semibold" style={{ color: failed ? C.error : C.textPrimary }}>{auditActionLabel(a.action)}</p>
          <p className="text-[11.5px]" style={{ color: C.textMuted }}>{category ? AUDIT_CATEGORIES[category].label : "—"}</p>
        </td>
        <td className="px-3 py-3 max-w-[360px]" style={{ color: C.textSecondary }}>
          {describeAudit(a) || "—"}
        </td>
        <td className="px-3 py-3 whitespace-nowrap" style={{ color: C.textSecondary }}>{a.actorEmail ?? "sistema"}</td>
        <td className="px-4 py-3 text-right whitespace-nowrap">
          {link ? (
            <Link
              href={link}
              onClick={(e) => e.stopPropagation()}
              className="text-[12.5px] font-semibold hover:underline"
              style={{ color: C.accentDark }}
            >
              Abrir
            </Link>
          ) : (
            <span style={{ color: C.textMuted }}>—</span>
          )}
        </td>
      </tr>
      {open && (
        <tr style={{ background: "#f8fafc" }}>
          <td />
          <td colSpan={5} className="px-3 pb-4 pt-1">
            <table className="text-[12.5px]">
              <tbody>
                {fields.map(([k, v]) => (
                  <tr key={k}>
                    <td className="pr-6 py-1 whitespace-nowrap align-top" style={{ color: C.textMuted }}>{fieldLabel(k)}</td>
                    <td className="py-1 break-all" style={{ color: C.textPrimary }}>{fieldValue(k, v)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

export default function AdminAuditLog() {
  const { toast } = useToast();
  const { data: years } = useSchoolYears();
  const activeYear = years?.find((y) => y.status === "active")?.year;

  // Por omissão só o ano lectivo em curso. Um ano anterior abre-se a partir do
  // Histórico (/admin/audit?ano=2026) e fica só em consulta.
  const archiveYear = Number(new URLSearchParams(window.location.search).get("ano")) || undefined;
  const year = archiveYear && archiveYear !== activeYear ? archiveYear : undefined;
  const { data: facets } = useAuditFacets(year);
  const [category, setCategory] = useState<AuditCategory | undefined>();
  const [action, setAction] = useState<string | undefined>();
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q.trim());

  const filters: AuditFilters = { year, category, action, q: debouncedQ || undefined };
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAudit(filters);
  const items = useMemo(() => (data?.pages ?? []).flatMap((p) => p.items) as AuditEntry[], [data]);

  const actionOptions = useMemo(
    () =>
      (facets?.actions ?? [])
        .filter((f) => !category || auditCategoryOf(f.action) === category)
        .sort((x, y) => auditActionLabel(x.action).localeCompare(auditActionLabel(y.action), "pt")),
    [facets, category],
  );
  const totalEvents = useMemo(() => (facets?.actions ?? []).reduce((s, f) => s + f.count, 0), [facets]);

  const hasFilters = !!(category || action || debouncedQ);
  const shownYear = year ?? activeYear;
  const clearFilters = () => {
    setCategory(undefined);
    setAction(undefined);
    setQ("");
  };

  const exportCsv = async () => {
    const qs = auditQuery(filters).toString();
    try {
      await downloadCsv(
        `/api/admin/audit/export${qs ? `?${qs}` : ""}`,
        `auditoria_${shownYear ?? ""}_${new Date().toISOString().slice(0, 10)}.csv`,
      );
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminShell
      title={year ? `Auditoria de ${year}` : "Auditoria"}
      subtitle={
        year
          ? `Arquivo do ano lectivo ${year} — só consulta`
          : `Operações do ano lectivo ${activeYear ?? ""}`.trim()
      }
      actions={
        <div className="flex gap-2">
          {year && (
            <Link href={`/admin/historico?ano=${year}`}>
              <Button variant="outline">Voltar ao histórico</Button>
            </Link>
          )}
          <Button variant="outline" className="gap-2" onClick={exportCsv} data-testid="audit-export">
            <FileDown size={16} /> Exportar CSV
          </Button>
        </div>
      }
    >
      {/* filtros */}
      <AdminCard className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_190px_240px_auto] gap-2 items-center">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Pesquisar por nome, email, nº de recibo…"
              className="pl-9"
              data-testid="audit-search"
            />
          </div>
          <Select
            value={category ?? "all"}
            onValueChange={(v) => {
              setCategory(v === "all" ? undefined : (v as AuditCategory));
              setAction(undefined);
            }}
          >
            <SelectTrigger data-testid="audit-filter-category"><SelectValue placeholder="Categoria" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {AUDIT_CATEGORY_KEYS.map((k) => (
                <SelectItem key={k} value={k}>{AUDIT_CATEGORIES[k].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={action ?? "all"} onValueChange={(v) => setAction(v === "all" ? undefined : v)}>
            <SelectTrigger data-testid="audit-filter-action"><SelectValue placeholder="Acção" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as acções</SelectItem>
              {actionOptions.map((f) => (
                <SelectItem key={f.action} value={f.action}>
                  {auditActionLabel(f.action)} ({f.count})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="ghost" className="gap-1.5" onClick={clearFilters} disabled={!hasFilters} data-testid="audit-clear">
            <X size={15} /> Limpar
          </Button>
        </div>
      </AdminCard>

      <AdminCard noPadding>
        <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder }}>
          <h2 className="text-[14px] font-bold" style={{ color: C.textPrimary }}>Registos</h2>
          <span className="text-[12px] tabular-nums" style={{ color: C.textMuted }}>
            {hasFilters ? `${items.length}${hasNextPage ? "+" : ""} com os filtros aplicados` : `${totalEvents} no total`}
          </span>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
            <Loader2 className="animate-spin" size={16} /> A carregar…
          </div>
        ) : error ? (
          <p className="p-8 text-sm" style={{ color: C.error }}>Não foi possível carregar a auditoria.</p>
        ) : items.length === 0 ? (
          <p className="p-10 text-center text-sm" style={{ color: C.textMuted }}>Sem registos para estes filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-[11px] uppercase tracking-wide" style={{ color: C.textMuted, background: "#f8fafc" }}>
                  <th className="pl-4 pr-1 py-2.5 w-6" />
                  <th className="text-left font-semibold px-3 py-2.5">Data e hora</th>
                  <th className="text-left font-semibold px-3 py-2.5">Acção</th>
                  <th className="text-left font-semibold px-3 py-2.5">Descrição</th>
                  <th className="text-left font-semibold px-3 py-2.5">Utilizador</th>
                  <th className="text-right font-semibold px-4 py-2.5">Alvo</th>
                </tr>
              </thead>
              <tbody>
                {items.map((a) => <AuditRow key={a.id} a={a} />)}
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
