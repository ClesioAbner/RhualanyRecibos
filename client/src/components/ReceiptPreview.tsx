import { Receipt } from "@shared/schema";
import { cn } from "@/lib/utils";

function fmtMoney(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "—";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(v?: string | Date | null) {
  if (!v) return new Date().toLocaleDateString("pt-PT");
  const d = typeof v === "string" ? new Date(v) : v;
  if (Number.isNaN(d.getTime())) return new Date().toLocaleDateString("pt-PT");
  return d.toLocaleDateString("pt-PT");
}

export type ReceiptPreviewModel = Partial<Receipt> & {
  secretaryName?: string;
};

function ReceiptBlock({
  receipt,
  className,
  testIdPrefix,
}: {
  receipt: ReceiptPreviewModel;
  className?: string;
  testIdPrefix: string;
}) {
  const receiptNumber = receipt.receiptNumber ?? "—";
  const issueDate = fmtDate((receipt as any).issueDate);
  const secretaryName = receipt.secretaryName ?? "—";

  return (
    <section
      className={cn(
        "rounded-2xl border border-border/70 bg-white text-black",
        "shadow-card overflow-hidden",
        "p-6 relative",
        className,
      )}
      data-testid={`${testIdPrefix}-block`}
    >
      {/* Decorative background element */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-full -mr-10 -mt-10" />

      <div className="flex items-start justify-between gap-6 relative z-10">
        <div className="flex items-start gap-4">
          <div className="p-2 bg-neutral-50 rounded-xl border border-neutral-100 shadow-sm">
            <img src="/images/logo.png" alt="Logo Colégio Rhulany" className="h-16 w-16 object-contain" />
          </div>
          <div className="space-y-0.5">
            <div className="text-[13px] font-bold uppercase tracking-[0.25em] text-primary">
              Colégio Rhulany
            </div>
            <div className="text-[10px] italic text-neutral-500 tracking-widest uppercase">
              Qualidade e Excelência
            </div>
            <h1 className="mt-2 font-bold text-2xl tracking-tight text-neutral-900 leading-none">
              Recibo
            </h1>
            <div className="mt-3 text-[13px] text-neutral-600 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary/40" />
              <span>
                Emitido por:{" "}
                <span className="font-bold text-neutral-900" data-testid={`${testIdPrefix}-secretary`}>
                  {secretaryName}
                </span>
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex flex-col items-end rounded-2xl border-2 border-primary/10 px-5 py-3 bg-primary/[0.02]">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/70">
              Nº DOCUMENTO
            </div>
            <div className="text-3xl font-black text-primary tabular-nums tracking-tighter" data-testid={`${testIdPrefix}-receiptNumber`}>
              #{receiptNumber.toString().padStart(4, '0')}
            </div>
          </div>
          <div className="mt-3 flex items-center justify-end gap-2 text-[12px] font-medium text-neutral-500 uppercase tracking-wider">
            <span>Data de Emissão</span>
            <span className="text-neutral-900 font-bold tabular-nums" data-testid={`${testIdPrefix}-issueDate`}>
              {issueDate}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-primary rounded-full" />
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">Identificação do Aluno</div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Nome Completo</div>
                <div className="text-base font-bold text-neutral-900" data-testid={`${testIdPrefix}-studentName`}>
                  {receipt.studentName ?? "—"}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Classe</div>
                  <div className="font-bold text-neutral-900" data-testid={`${testIdPrefix}-studentClass`}>
                    {receipt.studentClass ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Nº Interno</div>
                  <div className="font-bold text-neutral-900" data-testid={`${testIdPrefix}-studentNumber`}>
                    {receipt.studentNumber ?? "—"}
                  </div>
                </div>
              </div>
              <div className="pt-2 border-t border-neutral-100">
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Encarregado de Educação</div>
                <div className="font-bold text-neutral-900" data-testid={`${testIdPrefix}-guardianName`}>
                  {receipt.guardianName ?? "—"}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-neutral-100 bg-neutral-50/50 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1 h-4 bg-accent rounded-full" />
              <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-neutral-500">Detalhes do Pagamento</div>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Descrição</div>
                <div className="text-base font-bold text-neutral-900 leading-tight" data-testid={`${testIdPrefix}-paymentDescription`}>
                  {receipt.paymentDescription ?? "—"}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-neutral-100">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Método</div>
                  <div className="font-bold text-neutral-900" data-testid={`${testIdPrefix}-paymentMethod`}>
                    {receipt.paymentMethod ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Total Pago</div>
                  <div className="text-xl font-black text-neutral-900 tabular-nums" data-testid={`${testIdPrefix}-amountPaid`}>
                    {fmtMoney((receipt as any).amountPaid)} MT
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-neutral-100 p-4 bg-neutral-50/30">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-neutral-500 font-medium">Subtotal</span>
                <span className="text-neutral-700 font-bold tabular-nums">
                  {fmtMoney(Number((receipt as any).amountPaid || 0) - Number((receipt as any).ivaAmount || 0))} MT
                </span>
              </div>
              <div className="flex justify-between items-center text-[12px]">
                <span className="text-neutral-500 font-medium">IVA (5%)</span>
                <span className="text-accent font-bold tabular-nums">
                  {fmtMoney(Number((receipt as any).ivaAmount || 0))} MT
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 p-4 rounded-2xl bg-primary/[0.03] border border-primary/5 italic text-[13px] text-neutral-700 leading-relaxed relative z-10">
        <span className="text-[10px] font-black uppercase tracking-widest text-primary/40 block mb-1 not-italic">Valor por extenso</span>
        "{receipt.amountInWords ?? "—"}"
      </div>

      <div className="mt-8 flex items-end justify-between gap-6 relative z-10">
        <div className="flex-1 max-w-[200px]">
          <div className="h-24 rounded-2xl border-2 border-dashed border-neutral-200 grid place-items-center relative group">
            <div className="text-[10px] font-bold uppercase tracking-widest text-neutral-300 group-hover:text-neutral-400 transition-colors">Carimbo Oficial</div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.02)_100%)]" />
          </div>
        </div>
        <div className="text-right space-y-1">
          <div className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Autenticação</div>
          <div className="text-[11px] font-medium text-neutral-500 italic">Documento processado por computador</div>
          <div className="text-[11px] font-bold text-primary tabular-nums">Ref: RH-{receiptNumber.toString().padStart(6, '0')}</div>
        </div>
      </div>
    </section>
  );
}

export default function ReceiptPreview({
  receipt,
  mode = "screen",
  testIdPrefix = "receipt-preview",
}: {
  receipt: ReceiptPreviewModel;
  mode?: "screen" | "print";
  testIdPrefix?: string;
}) {
  if (mode === "print") {
    return (
      <div className="print-page print-only" data-testid={`${testIdPrefix}-print`}>
        <div className="print-two-up">
          <ReceiptBlock receipt={receipt} testIdPrefix={`${testIdPrefix}-top`} />
          <div className="print-cutline" />
          <ReceiptBlock receipt={receipt} testIdPrefix={`${testIdPrefix}-bottom`} />
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-2xl border border-border/70 p-4 md:p-6 lift" data-testid={`${testIdPrefix}-screen`}>
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <div className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">Pré-visualização</div>
          <div className="text-lg md:text-xl" style={{ fontFamily: "var(--font-serif)" }}>
            Recibo (A4 — 2 por página)
          </div>
        </div>
        <div className="text-xs text-muted-foreground hidden sm:block">
          Dica: guarde o recibo para imprimir ou gerar PDF.
        </div>
      </div>

      <div className="rounded-2xl bg-[linear-gradient(180deg,rgba(255,255,255,.9),rgba(255,255,255,.75))] border border-border/60 p-4 md:p-5">
        <div className="grid grid-rows-[auto_auto_auto] gap-5">
          <ReceiptBlock receipt={receipt} testIdPrefix={`${testIdPrefix}-screen-top`} />
          <div className="border-t border-dashed border-border/70 relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-background text-[11px] text-muted-foreground border border-border/70">
              Linha de corte
            </div>
          </div>
          <ReceiptBlock receipt={receipt} testIdPrefix={`${testIdPrefix}-screen-bottom`} />
        </div>
      </div>
    </div>
  );
}
