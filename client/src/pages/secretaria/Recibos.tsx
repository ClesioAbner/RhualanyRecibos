import { useMemo, useState } from "react";
import { Link } from "wouter";
import AppShell from "@/components/layout/AppShell";
import PdfActions from "@/components/PdfActions";
import { useReceipts } from "@/hooks/use-receipts";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { formatMt as fmtMoney, formatDate as fmtDate, receiptCode, formatTurma } from "@/lib/format";
import { NAVY, INK, MUTED, LINE } from "@/lib/theme";
import type { Receipt } from "@shared/schema";

export default function Recibos() {
  const [q, setQ] = useState("");
  const [receiptNumber, setReceiptNumber] = useState("");
  const [date, setDate] = useState("");

  const filters = useMemo(
    () => ({
      q: q.trim() || undefined,
      receiptNumber: receiptNumber ? Number(receiptNumber) : undefined,
      date: date || undefined,
    }),
    [q, receiptNumber, date],
  );

  const receipts = useReceipts(filters);
  const rows = useMemo(() => ((receipts.data ?? []) as Receipt[]).filter((r) => !r.deletedAt), [receipts.data]);
  const selectedIds = useMemo(() => rows.slice(0, 20).map((r) => r.id), [rows]);
  const hasFilters = !!(q || receiptNumber || date);

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* cabeçalho */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>Recibos</h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Consulte, pesquise e imprima os recibos emitidos.</p>
          </div>
          <Link href="/emitir" className="inline-flex items-center px-5 py-2.5 rounded-lg text-[13.5px] font-bold text-white flex-shrink-0" style={{ background: NAVY }} data-testid="recibos-cta-emitir">
            Emitir recibo
          </Link>
        </div>

        {/* filtros */}
        <div className="flex flex-col sm:flex-row gap-2">
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar por nome do aluno…" className="flex-1" data-testid="filter-q" />
          <Input type="number" value={receiptNumber} onChange={(e) => setReceiptNumber(e.target.value)} placeholder="Nº recibo" className="sm:w-36" data-testid="filter-receiptNumber" />
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" data-testid="filter-date" />
          {hasFilters && (
            <Button variant="outline" onClick={() => { setQ(""); setReceiptNumber(""); setDate(""); }} data-testid="recibos-clear-filters">Limpar</Button>
          )}
        </div>

        {/* barra de contagem + ações */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-[13px]" style={{ color: MUTED }}>{rows.length} recibo{rows.length !== 1 ? "s" : ""}</p>
          <PdfActions receiptIds={selectedIds} testIdPrefix="recibos-actions" variant="outline" />
        </div>

        {/* tabela */}
        <div className="bg-white rounded-xl border overflow-hidden no-print" style={{ borderColor: LINE }}>
          {receipts.isLoading ? (
            <p className="px-5 py-10 text-center text-[13px]" style={{ color: MUTED }}>A carregar recibos…</p>
          ) : receipts.error ? (
            <p className="px-5 py-10 text-center text-[13px]" style={{ color: "#dc2626" }}>Erro ao carregar recibos.</p>
          ) : rows.length === 0 ? (
            <div className="px-5 py-14 text-center">
              <p className="text-[13.5px] font-semibold" style={{ color: INK }}>Sem recibos</p>
              <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>{hasFilters ? "Nenhum recibo para estes filtros." : "Ainda não há recibos emitidos."}</p>
              <Link href="/emitir" className="inline-flex items-center mt-4 px-5 py-2.5 rounded-lg text-[13px] font-bold text-white" style={{ background: NAVY }}>Emitir recibo</Link>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ color: MUTED }} className="text-[10.5px] uppercase tracking-wide border-b" >
                    <th className="text-left font-semibold px-5 py-3">Nº</th>
                    <th className="text-left font-semibold px-3 py-3">Data</th>
                    <th className="text-left font-semibold px-3 py-3">Aluno</th>
                    <th className="text-left font-semibold px-3 py-3">Turma</th>
                    <th className="text-left font-semibold px-3 py-3">Descrição</th>
                    <th className="text-left font-semibold px-3 py-3">Método</th>
                    <th className="text-right font-semibold px-5 py-3">Valor (MT)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} data-testid={`receipt-row-${r.id}`} className="border-t hover:bg-[#f7fafd] cursor-pointer" style={{ borderColor: "#f3f5f8" }}>
                      <td className="px-5 py-2.5 font-semibold tabular-nums whitespace-nowrap" style={{ color: NAVY }}>
                        <Link href={`/recibos/${r.id}`} className="block">{receiptCode(r.receiptNumber)}</Link>
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: MUTED }}><Link href={`/recibos/${r.id}`} className="block">{fmtDate(r.issueDate)}</Link></td>
                      <td className="px-3 py-2.5 font-medium" style={{ color: INK }}><Link href={`/recibos/${r.id}`} className="block" data-testid={`receipt-student-${r.id}`}>{r.studentName}</Link></td>
                      <td className="px-3 py-2.5" style={{ color: MUTED }}><Link href={`/recibos/${r.id}`} className="block">{formatTurma(r.studentClass)}</Link></td>
                      <td className="px-3 py-2.5" style={{ color: MUTED }}><Link href={`/recibos/${r.id}`} className="block truncate max-w-[220px]">{r.paymentDescription}</Link></td>
                      <td className="px-3 py-2.5" style={{ color: MUTED }}><Link href={`/recibos/${r.id}`} className="block">{r.paymentMethod}</Link></td>
                      <td className="px-5 py-2.5 text-right font-bold tabular-nums whitespace-nowrap" style={{ color: INK }}><Link href={`/recibos/${r.id}`} className="block">{fmtMoney(r.amountPaid)}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* tabela de impressão (sem totais) */}
        <div className="print-only print-page">
          <div className="text-lg font-semibold mb-2">Lista de Recibos</div>
          <table className="w-full text-sm border border-neutral-300">
            <thead className="bg-neutral-100">
              <tr>
                {["Nº", "Data", "Aluno", "Turma", "Descrição", "Valor (MT)"].map((h) => (
                  <th key={h} className="p-2 border border-neutral-300 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={`print-${r.id}`}>
                  <td className="p-2 border border-neutral-300 tabular-nums">{receiptCode(r.receiptNumber)}</td>
                  <td className="p-2 border border-neutral-300">{fmtDate(r.issueDate)}</td>
                  <td className="p-2 border border-neutral-300">{r.studentName}</td>
                  <td className="p-2 border border-neutral-300">{formatTurma(r.studentClass)}</td>
                  <td className="p-2 border border-neutral-300">{r.paymentDescription}</td>
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
