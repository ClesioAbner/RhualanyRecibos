import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import EmptyState from "@/components/EmptyState";
import PdfActions from "@/components/PdfActions";
import { useReceipts } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import type { Receipt } from "@shared/schema";

/* ══════════════════════════════════════════
   UTILS
══════════════════════════════════════════ */
function fmtMoney(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: any) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
}

function rowKey(r: Receipt) { return `receipt-${r.id}`; }

const TYPE_COLORS: Record<string, { dot: string; bg: string; text: string }> = {
  Propina:   { dot: "#2563eb", bg: "#eff6ff", text: "#1d4ed8" },
  Matrícula: { dot: "#059669", bg: "#f0fdf4", text: "#047857" },
  Uniforme:  { dot: "#d97706", bg: "#fffbeb", text: "#b45309" },
  Material:  { dot: "#7c3aed", bg: "#f5f3ff", text: "#6d28d9" },
  Exame:     { dot: "#0891b2", bg: "#ecfeff", text: "#0e7490" },
  Outro:     { dot: "#64748b", bg: "#f8fafc", text: "#475569" },
};

function TypePill({ type }: { type: string }) {
  const c = TYPE_COLORS[type] ?? TYPE_COLORS["Outro"];
  return (
    <span
      style={{ background: c.bg, color: c.text, border: `1px solid ${c.dot}22` }}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide uppercase"
    >
      {type}
    </span>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function Recibos() {
  const { toast } = useToast();

  const [q, setQ]                         = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate]                   = useState("");
  const [filtersOpen, setFiltersOpen]     = useState(false);

  const filters = useMemo(() => ({
    q: q.trim() || undefined,
    receiptNumber: receiptNumber ? Number(receiptNumber) : undefined,
    date: date || undefined,
  }), [q, receiptNumber, date]);

  const receipts = useReceipts(filters);

  const selectedIds = useMemo(() => {
    return ((receipts.data ?? []) as Receipt[]).slice(0, 20).map(r => r.id);
  }, [receipts.data]);

  const hasFilters  = !!(q || receiptNumber || date);
  const total       = receipts.data?.length ?? 0;
  const totalValue  = (receipts.data ?? []).reduce((acc: number, r: any) => acc + (Number(r.amountPaid) || 0), 0);

  const clearFilters = () => {
    setQ(""); setReceiptNumber(""); setDate("");
    toast({ title: "Filtros limpos" });
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ══ HEADER ══ */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Recibos</h1>
              <p className="text-xs text-slate-400 mt-0.5">Consulte, filtre e imprima todos os recibos</p>
            </div>
          </div>

          <Link
            href="/emitir"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-700 transition-colors"
            data-testid="recibos-cta-emitir"
          >
Emitir novo
          </Link>
        </div>

        {/* ══ STATS ROW ══ */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[
            { label: "Recibos encontrados", value: total.toString() },
            { label: "Total cobrado",        value: `${fmtMoney(totalValue)} MT` },
            { label: "Imprimir selecção",    value: "Até 20 recibos", action: true },
          ].map(({ label, value, action }) => (
            <div key={label}
              className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-4 py-3 flex items-center gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest truncate">{label}</p>
                {action
                  ? <PdfActions receiptIds={selectedIds} onPrint={() => window.print()} testIdPrefix="recibos-actions" variant="ghost" />
                  : <p className="text-base font-black text-slate-800 dark:text-white tabular-nums mt-0.5">{value}</p>
                }
              </div>
            </div>
          ))}
        </div>

        {/* ══ SEARCH + FILTERS ══ */}
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            {/* search */}
            <div className="relative flex-1">
              <Input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Pesquisar por nome do aluno…"
                className="h-11 rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm"
                data-testid="filter-q"
              />

            </div>

            {/* filters toggle */}
            <button
              type="button"
              onClick={() => setFiltersOpen(o => !o)}
              className={`inline-flex items-center gap-2 h-11 px-4 rounded-xl border text-sm font-semibold transition-all ${
                filtersOpen || hasFilters
                  ? "border-slate-800 bg-slate-800 text-white"
                  : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span>Filtros</span>
              {hasFilters && <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />}
            </button>

            {hasFilters && (
              <button onClick={clearFilters}
                className="h-11 px-4 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-all"
                data-testid="recibos-clear-filters">
                Limpar
              </button>
            )}
          </div>

          {/* expanded filters */}
          {filtersOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nº do Recibo</label>
                <Input type="number" value={receiptNumber}
                       onChange={e => setReceiptNumber(e.target.value)}
                       placeholder="Ex: 102"
                       className="h-10 rounded-xl text-sm border-slate-200 dark:border-slate-700"
                       data-testid="filter-receiptNumber" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data (AAAA-MM-DD)</label>
                <Input value={date} onChange={e => setDate(e.target.value)}
                       placeholder="2026-02-04"
                       className="h-10 rounded-xl text-sm border-slate-200 dark:border-slate-700"
                       data-testid="filter-date" />
              </div>
            </div>
          )}
        </div>

        {/* ══ LIST ══ */}
        <div className="space-y-2">

          {/* loading */}
          {receipts.isLoading && (
            <div className="flex items-center gap-4 p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400 flex-shrink-0" />
              <p className="text-sm text-slate-500">A carregar recibos…</p>
            </div>
          )}

          {/* error */}
          {receipts.error && (
            <div className="p-5 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-800">
              <p className="text-sm font-semibold text-red-600">Erro ao carregar</p>
              <p className="text-xs text-red-400 mt-0.5">{(receipts.error as any)?.message ?? "Ocorreu um erro."}</p>
            </div>
          )}

          {/* empty */}
          {!receipts.isLoading && !receipts.error && total === 0 && (
            <EmptyState
              icon={null}
              title="Sem recibos"
              description="Ainda não há recibos para estes filtros."
              action={
                <Link href="/emitir"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 text-white text-sm font-bold hover:bg-slate-700 transition-colors"
                  data-testid="empty-emitir">
Emitir recibo
                </Link>
              }
              testId="recibos-empty"
            />
          )}

          {/* receipt cards */}
          {(receipts.data ?? []).map((r: any, idx: number) => (
            <Link key={rowKey(r)} href={`/recibos/${r.id}`}
                  className="group block" data-testid={`receipt-row-${r.id}`}>
              <div className="relative flex flex-col sm:flex-row sm:items-center gap-4 px-5 py-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-md transition-all duration-150">

                {/* left color bar */}
                <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full"
                     style={{ background: TYPE_COLORS[r.paymentDescription]?.dot ?? "#64748b" }} />

                {/* number badge */}
                <div className="hidden sm:flex h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 items-center justify-center flex-shrink-0 ml-2">
                  <span className="text-[10px] font-black text-slate-500 tabular-nums">
                    {String(r.receiptNumber).padStart(4, "0")}
                  </span>
                </div>

                {/* main info */}
                <div className="flex-1 min-w-0 pl-3 sm:pl-0 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="sm:hidden text-[10px] font-black text-slate-400 tabular-nums">
                      #{String(r.receiptNumber).padStart(4, "0")}
                    </span>
                    <TypePill type={r.paymentDescription} />
                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
{fmtDate(r.issueDate)}
                    </span>
                  </div>

                  <p className="text-sm font-bold text-slate-800 dark:text-white truncate"
                     data-testid={`receipt-student-${r.id}`}>
                    {r.studentName}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 flex-wrap">
                    <span>{r.studentClass} Classe</span>
                    <span>·</span>
                    <span>{r.paymentMethod}</span>
                    {r.guardianName && (
                      <><span>·</span><span className="truncate max-w-[100px]">{r.guardianName}</span></>
                    )}
                  </div>
                </div>

                {/* value + arrow */}
                <div className="pl-3 sm:pl-0 flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Valor</p>
                    <p className="text-lg font-black text-slate-800 dark:text-white tabular-nums leading-tight">
                      {fmtMoney(r.amountPaid)}
                      <span className="text-xs font-semibold text-slate-400 ml-1">MT</span>
                    </p>
                  </div>

                </div>
              </div>
            </Link>
          ))}

          {/* count footer */}
          {total > 0 && (
            <p className="text-center text-xs text-slate-400 pt-2">
              {total} recibo{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
              {totalValue > 0 && <> · Total: <span className="font-bold text-slate-600">{fmtMoney(totalValue)} MT</span></>}
            </p>
          )}
        </div>

        {/* ══ PRINT TABLE ══ */}
        <div className="print-only print-page">
          <div className="text-lg font-semibold mb-2">Lista de Recibos</div>
          <div className="text-sm text-neutral-600 mb-4">
            Filtros: {filters.q ?? "—"} · Nº: {filters.receiptNumber ?? "—"} · Data: {filters.date ?? "—"}
          </div>
          <table className="w-full text-sm border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>
                {["Nº", "Data", "Aluno", "Classe", "Tipo", "Valor (MT)"].map(h => (
                  <th key={h} className="p-2 border border-neutral-300 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(receipts.data ?? []).map((r: any) => (
                <tr key={`print-${r.id}`}>
                  <td className="p-2 border border-neutral-300 tabular-nums">{r.receiptNumber}</td>
                  <td className="p-2 border border-neutral-300">{fmtDate(r.issueDate)}</td>
                  <td className="p-2 border border-neutral-300">{r.studentName}</td>
                  <td className="p-2 border border-neutral-300">{r.studentClass}</td>
                  <td className="p-2 border border-neutral-300">{r.paymentDescription}</td>
                  <td className="p-2 border border-neutral-300 text-right tabular-nums">{fmtMoney(r.amountPaid)}</td>
                </tr>
              ))}
              <tr className="font-bold bg-neutral-50">
                <td colSpan={5} className="p-2 border border-neutral-300 text-right">Total:</td>
                <td className="p-2 border border-neutral-300 text-right tabular-nums">{fmtMoney(totalValue)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}