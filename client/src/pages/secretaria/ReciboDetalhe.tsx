import { useMemo, useState } from "react";
import { Link, useRoute, useLocation } from "wouter";
import AppShell from "@/components/layout/AppShell";
import ReceiptPreview from "@/components/ReceiptPreview";
import PdfActions from "@/components/PdfActions";
import { useDeleteReceipt, useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { UpdateReceiptRequest } from "@shared/schema";
import { api } from "@shared/routes";
import { NAVY, MUTED, LINE } from "@/lib/theme";

const receiptCode = (n?: number) => (n != null ? `RH-${String(n).padStart(4, "0")}` : "Recibo");

export default function ReciboDetalhe() {
  const { toast } = useToast();
  const [, params] = useRoute("/recibos/:id");
  const [, navigate] = useLocation();
  const id = Number(params?.id);

  const receipt = useReceipt(id);
  const update = useUpdateReceipt();
  const del = useDeleteReceipt();

  const [edit, setEdit] = useState<UpdateReceiptRequest>({});
  const merged = useMemo(() => ({ ...(receipt.data ?? ({} as any)), ...(edit as any) }), [receipt.data, edit]);
  const canSave = !!receipt.data && Object.keys(edit).length > 0;

  // apagar exige justificação
  const [delOpen, setDelOpen] = useState(false);
  const [reason, setReason] = useState("");

  const save = async () => {
    try {
      const validated = api.receipts.update.input.parse({
        ...edit,
        ...((edit as any).amountPaid !== undefined ? { amountPaid: Number((edit as any).amountPaid) } : {}),
      });
      await update.mutateAsync({ id, updates: validated });
      setEdit({});
      toast({ title: "Recibo actualizado" });
    } catch (e: any) {
      toast({ title: "Falha ao guardar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  const remove = async () => {
    if (reason.trim().length < 5) return;
    try {
      await del.mutateAsync({ id, reason: reason.trim() });
      toast({ title: "Recibo apagado", description: "A justificação ficou registada na auditoria." });
      setDelOpen(false);
      navigate("/recibos");
    } catch (e: any) {
      toast({ title: "Falha ao apagar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  const field = (key: keyof UpdateReceiptRequest, label: string, opts?: { textarea?: boolean; type?: string; hint?: string; full?: boolean }) => (
    <div className={`space-y-1.5 ${opts?.full ? "sm:col-span-2" : ""}`}>
      <Label className="text-[12px]" style={{ color: MUTED }}>{label}</Label>
      {opts?.textarea ? (
        <Textarea
          defaultValue={(receipt.data as any)?.[key] ?? ""}
          onChange={(e) => setEdit((p) => ({ ...p, [key]: e.target.value }))}
          className="min-h-[80px]"
          data-testid={`detail-${String(key)}`}
        />
      ) : (
        <Input
          type={opts?.type}
          defaultValue={String((receipt.data as any)?.[key] ?? "")}
          onChange={(e) => setEdit((p) => ({ ...p, [key]: e.target.value as any }))}
          data-testid={`detail-${String(key)}`}
        />
      )}
      {opts?.hint && <p className="text-[11px]" style={{ color: "#94a3b8" }}>{opts.hint}</p>}
    </div>
  );

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* cabeçalho */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>
              {receiptCode(receipt.data?.receiptNumber)}
            </h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Reveja, ajuste e gere o PDF do recibo.</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <Link href="/recibos"><Button variant="outline" data-testid="detail-back">← Voltar</Button></Link>
            <PdfActions receiptIds={receipt.data ? [receipt.data.id] : []} testIdPrefix="detail-actions" variant="outline" />
          </div>
        </div>

        {receipt.isLoading && (
          <div className="bg-white rounded-xl border px-5 py-10 text-center text-[13px]" style={{ borderColor: LINE, color: MUTED }}>A carregar recibo…</div>
        )}
        {receipt.error && (
          <div className="bg-white rounded-xl border px-5 py-10 text-center text-[13px]" style={{ borderColor: LINE, color: "#dc2626" }}>Erro ao carregar o recibo.</div>
        )}
        {!receipt.isLoading && !receipt.error && receipt.data === null && (
          <div className="bg-white rounded-xl border px-5 py-10 text-center text-[13px]" style={{ borderColor: LINE, color: MUTED }}>Recibo não encontrado.</div>
        )}

        {receipt.data && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">
            {/* edição */}
            <div className="bg-white rounded-2xl border" style={{ borderColor: LINE }}>
              <div className="px-6 pt-5 pb-4">
                <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Editar recibo</h2>
                <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>Ajuste os dados e guarde as alterações.</p>
              </div>
              <div className="h-px" style={{ background: LINE }} />

              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {field("studentName", "Nome do aluno", { full: true })}
                {field("studentClass", "Classe")}
                {field("studentNumber", "Nº do aluno")}
                {field("guardianName", "Encarregado", { full: true })}
                {field("paymentDescription", "Descrição", { full: true })}
                {field("paymentMethod", "Forma de pagamento")}
                {field("amountPaid", "Valor pago (MT)", { type: "number" })}
                {field("amountInWords", "Valor por extenso", { full: true, hint: "Calculado automaticamente ao emitir; ajustável aqui." })}
                {field("secretaryName", "Chefe da Secretaria", { full: true })}
              </div>

              <div className="h-px" style={{ background: LINE }} />
              <div className="px-6 py-4 flex items-center justify-between gap-2">
                <Button variant="outline" onClick={() => { setReason(""); setDelOpen(true); }} disabled={del.isPending} style={{ color: "#dc2626", borderColor: "#fecaca" }} data-testid="detail-delete">
                  Apagar
                </Button>
                <Button onClick={save} disabled={!canSave || update.isPending} className="text-white px-6" style={{ background: NAVY }} data-testid="detail-save">
                  {update.isPending ? "A guardar…" : "Guardar alterações"}
                </Button>
              </div>
            </div>

            {/* pré-visualização */}
            <div className="space-y-4 lg:sticky lg:top-24">
              <ReceiptPreview receipt={merged as any} testIdPrefix="detail-preview" />
              <ReceiptPreview receipt={merged as any} mode="print" testIdPrefix="detail-preview" />
            </div>
          </div>
        )}
      </div>

      {/* apagar recibo — exige justificação */}
      <Dialog open={delOpen} onOpenChange={(o) => { setDelOpen(o); if (!o) setReason(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apagar {receiptCode(receipt.data?.receiptNumber)}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[13px]" style={{ color: MUTED }}>
              Esta acção é permanente. Indique a <b>justificação</b> — fica registada na auditoria (quem apagou, quando e porquê).
            </p>
            <div className="space-y-1.5">
              <Label>Justificação</Label>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex.: recibo emitido por engano / valor incorrecto"
                rows={3}
                data-testid="recibo-delete-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDelOpen(false)}>Cancelar</Button>
            <Button
              onClick={remove}
              disabled={del.isPending || reason.trim().length < 5}
              className="text-white"
              style={{ background: "#dc2626" }}
              data-testid="recibo-delete-confirm"
            >
              {del.isPending ? "A apagar…" : "Apagar recibo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
