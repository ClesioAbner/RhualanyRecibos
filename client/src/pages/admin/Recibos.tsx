import { useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import {
  useAdminReceipts,
  useReceiptTotals,
  useVoidReceipt,
  downloadCsv,
  downloadBase64Pdf,
} from "@/hooks/use-admin";
import { useCreateReceiptsPdf } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatMt, formatDate, receiptCode, formatTurma } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Eye, EyeOff, Ban, Download, FileDown, Loader2 } from "lucide-react";
import type { ReceiptRow } from "@shared/routes";

const METHODS = ["Dinheiro", "M-Pesa", "e-Mola", "Transferência", "Cheque"];

function useDebounced<T>(value: T, ms = 300): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function Kpi({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <AdminCard>
      <p className="text-[11px] font-bold uppercase" style={{ color: C.textMuted, letterSpacing: ".08em" }}>{label}</p>
      <p className="mt-1.5" style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: tone ?? C.navy }}>{value}</p>
    </AdminCard>
  );
}

export default function AdminRecibos() {
  const { toast } = useToast();
  const initialStudentId = useMemo(() => {
    const sp = new URLSearchParams(window.location.search);
    const sid = Number(sp.get("studentId"));
    return Number.isFinite(sid) && sid > 0 ? sid : undefined;
  }, []);

  const [qRaw, setQRaw] = useState("");
  const q = useDebounced(qRaw, 300);
  const [method, setMethod] = useState("all");
  const [showVoided, setShowVoided] = useState(false);

  const filters = {
    q: q.trim() || undefined,
    method: method !== "all" ? method : undefined,
    includeVoided: showVoided,
    studentId: initialStudentId,
  };
  const { data: receipts, isLoading } = useAdminReceipts(filters);
  const { data: totals } = useReceiptTotals();
  const voidM = useVoidReceipt();
  const pdfM = useCreateReceiptsPdf();

  const [voidTarget, setVoidTarget] = useState<ReceiptRow | null>(null);
  const [reason, setReason] = useState("");

  const doVoid = async () => {
    if (!voidTarget) return;
    try {
      await voidM.mutateAsync({ id: voidTarget.id, reason: reason.trim() });
      toast({ title: "Recibo anulado" });
      setVoidTarget(null);
      setReason("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const downloadPdf = async (r: ReceiptRow) => {
    try {
      const pdf = await pdfM.mutateAsync({ receiptIds: [r.id] });
      downloadBase64Pdf(pdf.pdfBase64, pdf.filename);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const exportCsv = async () => {
    try {
      await downloadCsv("/api/admin/recibos/export", `recibos_${new Date().toISOString().slice(0, 10)}.csv`);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminShell
      title="Recibos"
      subtitle="Todos os recibos emitidos"
      actions={
        <Button variant="outline" className="gap-2" onClick={exportCsv} data-testid="recibos-export">
          <FileDown size={16} /> Exportar CSV
        </Button>
      }
    >
      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <Kpi label="Total emitidos" value={String(totals?.emitted ?? 0)} />
        <Kpi label="Valor total" value={`${formatMt(totals?.totalValue ?? 0)} MT`} />
        <Kpi label="Anulados" value={String(totals?.voided ?? 0)} />
      </div>

      {/* filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input value={qRaw} onChange={(e) => setQRaw(e.target.value)} placeholder="Pesquisar por nome ou nº de recibo…" className="flex-1" data-testid="recibos-search" />
        <Select value={method} onValueChange={setMethod}>
          <SelectTrigger className="sm:w-48"><SelectValue placeholder="Método" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os métodos</SelectItem>
            {METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button variant="outline" className="gap-2" onClick={() => setShowVoided((v) => !v)} data-testid="recibos-toggle-voided">
          {showVoided ? <EyeOff size={16} /> : <Eye size={16} />}
          {showVoided ? "A mostrar anulados" : "Ocultar anulados"}
        </Button>
      </div>

      <AdminCard noPadding>
        {isLoading ? (
          <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
            <Loader2 className="animate-spin" size={16} /> A carregar…
          </div>
        ) : (receipts?.length ?? 0) === 0 ? (
          <p className="p-10 text-center text-sm" style={{ color: C.textMuted }}>Nenhum recibo para estes filtros.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: C.textMuted }} className="text-[11px] uppercase tracking-wide">
                  {["Nº", "Data", "Aluno", "Turma", "Descrição", "Método", "Valor", "Estado", ""].map((h, i) => (
                    <th key={i} className={`px-4 py-3 font-semibold ${h === "Valor" ? "text-right" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(receipts ?? []).map((r) => {
                  const voided = !!r.deletedAt;
                  return (
                    <tr key={r.id} data-testid={`recibo-row-${r.id}`} className="border-t" style={{ borderColor: "#f1f5f9", opacity: voided ? 0.55 : 1 }}>
                      <td className="px-4 py-2.5 font-semibold tabular-nums" style={{ color: C.navy }}>{receiptCode(r.receiptNumber)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textSecondary }}>{formatDate(r.issueDate)}</td>
                      <td className="px-4 py-2.5 font-medium" style={{ color: C.textPrimary }}>{r.studentName}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textSecondary }}>{formatTurma(r.studentClass)}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textSecondary }}>{r.paymentDescription}</td>
                      <td className="px-4 py-2.5" style={{ color: C.textSecondary }}>{r.paymentMethod}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: C.textPrimary }}>{formatMt(r.amountPaid)}</td>
                      <td className="px-4 py-2.5">
                        {voided ? <span className="text-[11px] font-bold uppercase" style={{ color: C.textMuted }}>Anulado</span> : <span className="text-[12px]" style={{ color: C.success }}>Válido</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-end gap-1.5">
                          <button aria-label="PDF" title="PDF" onClick={() => downloadPdf(r)} className="h-8 w-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.cardBorder, color: C.textSecondary }}>
                            <Download size={14} />
                          </button>
                          {!voided && (
                            <button aria-label="Anular" title="Anular" onClick={() => setVoidTarget(r)} className="h-8 w-8 rounded-lg border flex items-center justify-center" style={{ borderColor: C.cardBorder, color: C.error }}>
                              <Ban size={14} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Dialog open={!!voidTarget} onOpenChange={(o) => { if (!o) { setVoidTarget(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Anular recibo {voidTarget ? receiptCode(voidTarget.receiptNumber) : ""}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-[13px]" style={{ color: C.textSecondary }}>
              O recibo será marcado como anulado e deixa de contar para os totais. A versão anterior fica guardada no histórico. Esta operação não apaga o registo.
            </p>
            <div className="space-y-1.5">
              <Label>Motivo da anulação</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: emitido por engano" data-testid="void-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setVoidTarget(null); setReason(""); }}>Cancelar</Button>
            <Button onClick={doVoid} disabled={voidM.isPending || reason.trim().length < 3} className="gap-2 text-white" style={{ background: C.error }} data-testid="void-confirm">
              {voidM.isPending && <Loader2 className="animate-spin" size={15} />} Anular recibo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
