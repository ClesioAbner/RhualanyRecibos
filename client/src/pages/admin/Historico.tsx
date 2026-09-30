import { ReactNode, useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import { useSchoolYears, useSchoolYear, useCreateSchoolYear, useStatementAnnual } from "@/hooks/use-admin";
import { useConfirm, useSuccess } from "@/components/ConfirmDialog";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatMt, formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { CalendarPlus, FileDown, History, Loader2 } from "lucide-react";
import type { SchoolYearDetail } from "@shared/routes";

const MONTHS_FULL = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const TYPE_LABEL: Record<string, string> = {
  mensalidade: "Mensalidades",
  matricula: "Matrículas",
  uniforme: "Uniformes",
  material: "Material",
  exame: "Exames",
  outro: "Outros",
};
const pct = (v: number, total: number) => (total > 0 ? `${((v / total) * 100).toFixed(1).replace(".", ",")}%` : "—");

const SECTIONS = [
  { key: "resumo", label: "Resumo" },
  { key: "mensal", label: "Receita mensal" },
  { key: "turmas", label: "Receita por turma" },
  { key: "pagamentos", label: "Pagamentos" },
  { key: "alunos", label: "Turmas e alunos" },
] as const;
type SectionKey = (typeof SECTIONS)[number]["key"];

// ───────────────────────────── building blocks ─────────────────────────────
function Tabs<T extends string | number>({
  value,
  items,
  onChange,
  testId,
}: {
  value: T;
  items: { key: T; label: string; hint?: string }[];
  onChange: (v: T) => void;
  testId: string;
}) {
  return (
    <div className="flex gap-1 overflow-x-auto border-b" style={{ borderColor: C.cardBorder }} role="tablist">
      {items.map((it) => {
        const on = it.key === value;
        return (
          <button
            key={String(it.key)}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.key)}
            className="px-4 py-2.5 -mb-px text-[13px] whitespace-nowrap transition-colors"
            style={{
              fontWeight: on ? 700 : 500,
              color: on ? C.navy : C.textSecondary,
              borderBottom: `2px solid ${on ? C.navy : "transparent"}`,
            }}
            data-testid={`${testId}-${it.key}`}
          >
            {it.label}
            {it.hint && <span className="ml-1.5 font-normal" style={{ color: C.textMuted }}>{it.hint}</span>}
          </button>
        );
      })}
    </div>
  );
}

function TableCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <AdminCard noPadding>
      <div className="px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder }}>
        <h3 className="text-[14px] font-bold" style={{ color: C.textPrimary }}>{title}</h3>
        {subtitle && <p className="text-[12px] mt-0.5" style={{ color: C.textSecondary }}>{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">{children}</div>
    </AdminCard>
  );
}

const th = "text-[11px] uppercase tracking-wide font-semibold px-5 py-2.5";
const td = "px-5 py-2.5";

function Empty({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-center text-[13px]" style={{ color: C.textMuted }}>{children}</p>;
}

/** Tabela simples: rótulo · recibos · valor · % do total, com linha de total. */
function AmountTable({ head, rows }: { head: string; rows: { label: string; count: number; total: number }[] }) {
  const sumTotal = rows.reduce((s, r) => s + r.total, 0);
  const sumCount = rows.reduce((s, r) => s + r.count, 0);
  if (rows.length === 0) return <Empty>Sem recibos neste ano.</Empty>;
  return (
    <table className="w-full text-[13px]">
      <thead>
        <tr style={{ color: C.textMuted, background: "#f8fafc" }}>
          <th className={`${th} text-left`}>{head}</th>
          <th className={`${th} text-right`}>Recibos</th>
          <th className={`${th} text-right`}>Valor (MT)</th>
          <th className={`${th} text-right`}>% do total</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.label} className="border-t" style={{ borderColor: "#f1f5f9" }}>
            <td className={td} style={{ color: C.textPrimary }}>{r.label}</td>
            <td className={`${td} text-right tabular-nums`} style={{ color: C.textSecondary }}>{r.count}</td>
            <td className={`${td} text-right tabular-nums font-semibold`} style={{ color: C.textPrimary }}>{formatMt(r.total)}</td>
            <td className={`${td} text-right tabular-nums`} style={{ color: C.textSecondary }}>{pct(r.total, sumTotal)}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t-2" style={{ borderColor: C.cardBorder }}>
          <td className={`${td} font-bold`} style={{ color: C.textPrimary }}>Total</td>
          <td className={`${td} text-right tabular-nums font-bold`} style={{ color: C.textPrimary }}>{sumCount}</td>
          <td className={`${td} text-right tabular-nums font-bold`} style={{ color: C.navy }}>{formatMt(sumTotal)}</td>
          <td className={`${td} text-right tabular-nums`} style={{ color: C.textSecondary }}>100%</td>
        </tr>
      </tfoot>
    </table>
  );
}

function InfoRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <tr className="border-t first:border-t-0" style={{ borderColor: "#f1f5f9" }}>
      <td className="px-5 py-2.5 w-48 text-[13px]" style={{ color: C.textSecondary }}>{label}</td>
      <td className="px-5 py-2.5 text-[13px] font-medium" style={{ color: C.textPrimary }}>{value}</td>
    </tr>
  );
}

// ───────────────────────────── secções de um ano ─────────────────────────────
function YearResumo({ d }: { d: SchoolYearDetail }) {
  const t = d.totals;
  const students = d.roster.classes.reduce((s, c) => s + c.students.length, 0);
  return (
    <TableCard title="Informação do ano lectivo">
      <table className="w-full">
        <tbody>
          <InfoRow label="Ano lectivo" value={d.year} />
          <InfoRow label="Estado" value={d.status === "active" ? "Em curso" : "Fechado"} />
          <InfoRow label="Aberto em" value={`${formatDate(d.openedAt)}${d.openedByEmail ? ` · por ${d.openedByEmail}` : ""}`} />
          <InfoRow label="Fechado em" value={d.closedAt ? `${formatDate(d.closedAt)}${d.closedByEmail ? ` · por ${d.closedByEmail}` : ""}` : "—"} />
          <InfoRow label="Receita do ano" value={`${formatMt(t.revenue)} MT`} />
          <InfoRow label="Recibos emitidos" value={`${t.receipts} (${t.voided} anulado(s))`} />
          <InfoRow label="Valor médio por recibo" value={t.receipts > 0 ? `${formatMt(t.revenue / t.receipts)} MT` : "—"} />
          <InfoRow label="Alunos que pagaram" value={t.payingStudents} />
          <InfoRow label="Turmas" value={d.roster.classes.length} />
          <InfoRow label="Alunos" value={students} />
          <InfoRow label="Eventos de auditoria" value={t.auditEvents} />
          <InfoRow label="Extratos gerados" value={t.statements} />
          <InfoRow label="Notas" value={d.notes || "—"} />
        </tbody>
      </table>
    </TableCard>
  );
}

function YearMensal({ d }: { d: SchoolYearDetail }) {
  const rows = MONTHS_FULL.map((label, i) => {
    const key = `${d.year}-${String(i + 1).padStart(2, "0")}`;
    const m = d.byMonth.find((x) => x.month === key);
    return { label, count: m?.count ?? 0, total: m?.total ?? 0 };
  });
  return (
    <TableCard title="Receita mensal" subtitle={`Janeiro a Dezembro de ${d.year}`}>
      <AmountTable head="Mês" rows={rows} />
    </TableCard>
  );
}

function YearTurmas({ d }: { d: SchoolYearDetail }) {
  return (
    <TableCard title="Receita por turma" subtitle="Segundo a turma registada em cada recibo">
      <AmountTable head="Turma" rows={d.byClass.map((c) => ({ label: c.name, count: c.count, total: c.total }))} />
    </TableCard>
  );
}

function YearPagamentos({ d }: { d: SchoolYearDetail }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <TableCard title="Por método de pagamento">
        <AmountTable head="Método" rows={d.byMethod.map((m) => ({ label: m.method, count: m.count, total: m.total }))} />
      </TableCard>
      <TableCard title="Por tipo de recibo">
        <AmountTable head="Tipo" rows={d.byType.map((x) => ({ label: TYPE_LABEL[x.type] ?? x.type, count: x.count, total: x.total }))} />
      </TableCard>
    </div>
  );
}

function YearAlunos({ d }: { d: SchoolYearDetail }) {
  const note =
    d.roster.source === "live"
      ? "Dados actuais — ficam guardados no histórico quando o ano for fechado."
      : d.roster.takenAt
        ? `Retrato guardado a ${formatDate(d.roster.takenAt)}, ao fechar o ano.`
        : "Este ano foi fechado antes de existir o histórico de turmas.";
  const classes = d.roster.classes;
  return (
    <div className="space-y-4">
      <p className="text-[12.5px]" style={{ color: C.textSecondary }}>{note}</p>
      {classes.length === 0 ? (
        <AdminCard><Empty>Sem turmas guardadas para este ano.</Empty></AdminCard>
      ) : (
        classes.map((c) => {
          const paid = c.students.reduce((s, x) => s + x.paid, 0);
          return (
            <TableCard
              key={c.id}
              title={c.name}
              subtitle={`${c.students.length} aluno(s) · mensalidade ${formatMt(c.monthlyFee)} MT · total pago ${formatMt(paid)} MT`}
            >
              {c.students.length === 0 ? (
                <Empty>Sem alunos nesta turma.</Empty>
              ) : (
                <table className="w-full text-[13px]">
                  <thead>
                    <tr style={{ color: C.textMuted, background: "#f8fafc" }}>
                      <th className={`${th} text-left`}>Aluno</th>
                      <th className={`${th} text-left`}>Nº interno</th>
                      <th className={`${th} text-left`}>Estado</th>
                      <th className={`${th} text-right`}>Recibos</th>
                      <th className={`${th} text-right`}>Pago no ano (MT)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {c.students.map((s) => (
                      <tr key={s.id} className="border-t" style={{ borderColor: "#f1f5f9" }}>
                        <td className={td} style={{ color: C.textPrimary }}>{s.fullName}</td>
                        <td className={td} style={{ color: C.textSecondary }}>{s.internalNumber ?? "—"}</td>
                        <td className={td} style={{ color: C.textSecondary }}>{s.active ? "Activo" : "Inactivo"}</td>
                        <td className={`${td} text-right tabular-nums`} style={{ color: C.textSecondary }}>{s.receipts}</td>
                        <td className={`${td} text-right tabular-nums font-semibold`} style={{ color: C.textPrimary }}>{formatMt(s.paid)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TableCard>
          );
        })
      )}
    </div>
  );
}

function YearDetail({ year }: { year: number }) {
  const { data: d, isLoading, error } = useSchoolYear(year);
  const annual = useStatementAnnual();
  const { toast } = useToast();
  const [section, setSection] = useState<SectionKey>("resumo");

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
        <Loader2 className="animate-spin" size={16} /> A carregar…
      </div>
    );
  }
  if (error || !d) {
    return <AdminCard><p className="text-sm" style={{ color: C.error }}>Não foi possível carregar o ano lectivo.</p></AdminCard>;
  }

  const downloadAnnual = async () => {
    try {
      await annual.mutateAsync(String(year));
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      <AdminCard>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-[19px] font-bold tracking-tight" style={{ color: C.textPrimary }}>Ano lectivo {d.year}</h2>
            <p className="text-[12.5px] mt-1" style={{ color: C.textSecondary }}>
              {d.status === "active"
                ? `Em curso desde ${formatDate(d.openedAt)}`
                : `Fechado${d.closedAt ? ` em ${formatDate(d.closedAt)}` : ""} · só consulta`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/audit?ano=${d.year}`}>
              <Button variant="outline" className="gap-2"><History size={15} /> Auditoria de {d.year}</Button>
            </Link>
            <Button variant="outline" className="gap-2" onClick={downloadAnnual} disabled={annual.isPending} data-testid="historico-extrato">
              {annual.isPending ? <Loader2 className="animate-spin" size={15} /> : <FileDown size={15} />} Extrato anual (PDF)
            </Button>
          </div>
        </div>
        <div className="mt-4 -mx-6 px-6">
          <Tabs value={section} items={SECTIONS.map((s) => ({ key: s.key, label: s.label }))} onChange={setSection} testId="historico-seccao" />
        </div>
      </AdminCard>

      {section === "resumo" && <YearResumo d={d} />}
      {section === "mensal" && <YearMensal d={d} />}
      {section === "turmas" && <YearTurmas d={d} />}
      {section === "pagamentos" && <YearPagamentos d={d} />}
      {section === "alunos" && <YearAlunos d={d} />}
    </div>
  );
}

// ───────────────────────────────── página ─────────────────────────────────
export default function AdminHistorico() {
  const { data: years, isLoading } = useSchoolYears();
  const create = useCreateSchoolYear();
  const confirm = useConfirm();
  const success = useSuccess();
  const { toast } = useToast();

  const initial = Number(new URLSearchParams(window.location.search).get("ano")) || undefined;
  const [selected, setSelected] = useState<number | undefined>(initial);

  const active = years?.find((y) => y.status === "active");
  const nextYear = Math.max(new Date().getFullYear() - 1, ...(years ?? []).map((y) => y.year)) + 1;
  const canCreate = nextYear <= new Date().getFullYear() + 1;

  useEffect(() => {
    if (!selected && years?.length) setSelected(active?.year ?? years[0].year);
  }, [years, active, selected]);

  const yearTabs = useMemo(
    () => (years ?? []).map((y) => ({ key: y.year, label: String(y.year), hint: y.status === "active" ? "(em curso)" : "(fechado)" })),
    [years],
  );

  const openYear = async () => {
    const ok = await confirm({
      title: `Deseja mesmo abrir o ano lectivo ${nextYear}?`,
      description: active ? <>O ano <strong>{active.year}</strong> será fechado e guardado no histórico.</> : undefined,
      details: [
        ...(active ? [`As turmas, alunos e totais de ${active.year} ficam guardados tal como estão hoje.`] : []),
        "Nada é apagado: recibos, alunos, turmas e auditoria mantêm-se.",
        `O ano ${nextYear} passa a ser o ano lectivo em curso.`,
      ],
      requireText: String(nextYear),
    });
    if (!ok) return;
    try {
      await create.mutateAsync({ year: nextYear });
      setSelected(nextYear);
      success(`Ano lectivo ${nextYear} criado com sucesso`, active ? `O ano ${active.year} foi guardado no histórico.` : undefined);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminShell
      title="Histórico"
      subtitle="Anos lectivos e arquivo de cada ano"
      actions={
        canCreate && (
          <Button onClick={openYear} disabled={create.isPending || isLoading} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="historico-novo-ano">
            {create.isPending ? <Loader2 className="animate-spin" size={16} /> : <CalendarPlus size={16} />} Abrir ano {nextYear}
          </Button>
        )
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
          <Loader2 className="animate-spin" size={16} /> A carregar…
        </div>
      ) : !years?.length ? (
        <AdminCard><p className="text-sm text-center py-6" style={{ color: C.textMuted }}>Ainda não há anos lectivos registados.</p></AdminCard>
      ) : (
        <div className="space-y-4">
          <Tabs value={selected ?? years[0].year} items={yearTabs} onChange={setSelected} testId="historico-ano" />
          {selected && <YearDetail key={selected} year={selected} />}
        </div>
      )}
    </AdminShell>
  );
}
