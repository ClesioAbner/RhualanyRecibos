import { useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import EmptyState from "@/components/EmptyState";
import PdfActions from "@/components/PdfActions";
import { useReceipts } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { FileText, Filter, Loader2, Search, XCircle } from "lucide-react";
import type { Receipt } from "@shared/schema";

function fmtMoney(v: any) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(d: any) {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-PT");
}

function rowKey(r: Receipt) {
  return `receipt-${r.id}`;
}

export default function Recibos() {
  const { toast } = useToast();

  const [q, setQ] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate] = useState("");

  const filters = useMemo(() => {
    return {
      q: q.trim() || undefined,
      receiptNumber: receiptNumber ? Number(receiptNumber) : undefined,
      date: date || undefined,
    };
  }, [q, receiptNumber, date]);

  const receipts = useReceipts(filters);

  const selectedIds = useMemo(() => {
    // MVP: selection can be added later; keep PDF action for current filtered list (first 20)
    const items = (receipts.data ?? []) as Receipt[];
    return items.slice(0, 20).map((r) => r.id);
  }, [receipts.data]);

  return (
    <AppShell>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Arquivo"
          title="Recibos"
          subtitle="Pesquise por nome do aluno, número do recibo ou data. Abra o detalhe para imprimir, gerar PDF ou ajustar informações."
          right={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/emitir"
                className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                data-testid="recibos-cta-emitir"
              >
                Emitir novo
              </Link>

              <PdfActions
                receiptIds={selectedIds}
                onPrint={() => window.print()}
                testIdPrefix="recibos-actions"
                variant="outline"
              />
            </div>
          }
          testId="recibos-header"
        />

        <Card className="glass rounded-2xl border border-border/70 p-5 md:p-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl grid place-items-center bg-gradient-to-br from-primary/14 via-accent/10 to-transparent border border-border/60">
                <Filter className="h-5 w-5 text-primary" />
              </div>
              <div>
                <div className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">Filtros</div>
                <div className="text-lg" style={{ fontFamily: "var(--font-serif)" }}>
                  Pesquisa rápida
                </div>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => {
                setQ("");
                setReceiptNumber("");
                setDate("");
                toast({ title: "Filtros limpos", description: "A mostrar todos os recibos." });
              }}
              className="rounded-xl"
              data-testid="recibos-clear-filters"
            >
              <XCircle className="h-4 w-4 mr-2" />
              Limpar
            </Button>
          </div>

          <Separator className="my-5 bg-border/70" />

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="q">Nome do aluno</Label>
              <div className="relative">
                <Search className="h-4 w-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  id="q"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Ex: Ana"
                  className="rounded-xl pl-9"
                  data-testid="filter-q"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="receiptNumber">Nº do recibo</Label>
              <Input
                id="receiptNumber"
                type="number"
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="Ex: 102"
                className="rounded-xl"
                data-testid="filter-receiptNumber"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data (YYYY-MM-DD)</Label>
              <Input
                id="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="2026-02-04"
                className="rounded-xl"
                data-testid="filter-date"
              />
              <div className="text-xs text-muted-foreground">Formato exato: AAAA-MM-DD</div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          {receipts.isLoading && (
            <Card className="glass rounded-2xl border border-border/70 p-8 flex items-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div>
                <div className="font-semibold">A carregar recibos…</div>
                <div className="text-sm text-muted-foreground">Aguarde um instante.</div>
              </div>
            </Card>
          )}

          {receipts.error && (
            <Card className="glass rounded-2xl border border-border/70 p-8">
              <div className="font-semibold">Erro ao carregar</div>
              <div className="text-sm text-muted-foreground mt-1">
                {(receipts.error as any)?.message ?? "Ocorreu um erro inesperado."}
              </div>
            </Card>
          )}

          {!receipts.isLoading && !receipts.error && (receipts.data?.length ?? 0) === 0 && (
            <EmptyState
              icon={<FileText className="h-6 w-6 text-primary" />}
              title="Sem recibos"
              description="Ainda não há recibos para estes filtros. Emita um novo recibo para começar."
              action={
                <Link
                  href="/emitir"
                  className="inline-flex items-center justify-center rounded-xl px-5 py-3 font-semibold bg-gradient-to-r from-primary to-primary/85 text-primary-foreground shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                  data-testid="empty-emitir"
                >
                  Emitir recibo
                </Link>
              }
              testId="recibos-empty"
            />
          )}

          <div className="grid grid-cols-1 gap-3">
            {(receipts.data ?? []).map((r: any) => (
              <Link
                key={rowKey(r)}
                href={`/recibos/${r.id}`}
                className="group glass lift-hover rounded-2xl border border-border/70 p-5 md:p-6 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                data-testid={`receipt-row-${r.id}`}
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="secondary" className="rounded-full" data-testid={`receipt-number-${r.id}`}>
                        Nº {r.receiptNumber}
                      </Badge>
                      <div className="text-sm text-muted-foreground tabular-nums" data-testid={`receipt-date-${r.id}`}>
                        {fmtDate(r.issueDate)}
                      </div>
                    </div>

                    <div className="text-xl md:text-2xl tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
                      <span data-testid={`receipt-student-${r.id}`}>{r.studentName}</span>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      {r.studentClass} Classe • {r.paymentDescription} • {r.paymentMethod}
                    </div>
                  </div>

                  <div className="md:text-right">
                    <div className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
                      Valor
                    </div>
                    <div className="text-2xl font-bold tabular-nums">
                      {fmtMoney(r.amountPaid)} <span className="text-base font-semibold text-muted-foreground">MT</span>
                    </div>

                    <div className="mt-2 inline-flex items-center gap-2 text-sm text-primary opacity-90 group-hover:opacity-100 transition-opacity">
                      Abrir detalhe →
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Print helper (optional): print current list as simple reference */}
        <div className="print-only print-page">
          <div className="text-lg font-semibold mb-2" style={{ fontFamily: "var(--font-serif)" }}>
            Lista de Recibos
          </div>
          <div className="text-sm text-neutral-600 mb-4">
            Filtros: {filters.q ?? "—"} • Nº: {filters.receiptNumber ?? "—"} • Data: {filters.date ?? "—"}
          </div>
          <table className="w-full text-sm border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>
                <th className="p-2 border border-neutral-300 text-left">Nº</th>
                <th className="p-2 border border-neutral-300 text-left">Data</th>
                <th className="p-2 border border-neutral-300 text-left">Aluno</th>
                <th className="p-2 border border-neutral-300 text-left">Classe</th>
                <th className="p-2 border border-neutral-300 text-right">Valor (MT)</th>
              </tr>
            </thead>
            <tbody>
              {(receipts.data ?? []).map((r: any) => (
                <tr key={`print-${r.id}`}>
                  <td className="p-2 border border-neutral-300 tabular-nums">{r.receiptNumber}</td>
                  <td className="p-2 border border-neutral-300">{fmtDate(r.issueDate)}</td>
                  <td className="p-2 border border-neutral-300">{r.studentName}</td>
                  <td className="p-2 border border-neutral-300">{r.studentClass}</td>
                  <td className="p-2 border border-neutral-300 text-right tabular-nums">{fmtMoney(r.amountPaid)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
