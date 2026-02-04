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
        "shadow-[0_18px_50px_-35px_rgba(0,0,0,0.45)]",
        "p-6",
        className,
      )}
      data-testid={`${testIdPrefix}-block`}
    >
      <div className="flex items-start justify-between gap-6">
        <div className="flex items-start gap-4">
          <img src="/images/logo.png" alt="Logo Colégio Rhulany" className="h-16 w-16 object-contain" />
          <div>
            <div className="text-[12px] uppercase tracking-[0.22em] text-neutral-600">
              Colégio Rhulany
            </div>
            <div className="mt-1 font-[600] text-xl tracking-tight" style={{ fontFamily: "var(--font-serif)" }}>
              Recibo de Pagamento
            </div>
            <div className="mt-2 text-[13px] text-neutral-600">
              Chefe da Secretaria:{" "}
              <span className="font-semibold text-neutral-900" data-testid={`${testIdPrefix}-secretary`}>
                {secretaryName}
              </span>
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="inline-flex flex-col items-end rounded-xl border border-neutral-200 px-4 py-3 bg-neutral-50">
            <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">
              Nº do Recibo
            </div>
            <div className="text-2xl font-bold tabular-nums" data-testid={`${testIdPrefix}-receiptNumber`}>
              {receiptNumber}
            </div>
          </div>
          <div className="mt-2 text-[12px] text-neutral-600">
            Data:{" "}
            <span className="font-semibold text-neutral-900 tabular-nums" data-testid={`${testIdPrefix}-issueDate`}>
              {issueDate}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Aluno</div>
          <div className="mt-1 font-semibold text-neutral-950" data-testid={`${testIdPrefix}-studentName`}>
            {receipt.studentName ?? "—"}
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3 text-[13px] text-neutral-700">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Classe</div>
              <div className="font-semibold text-neutral-900" data-testid={`${testIdPrefix}-studentClass`}>
                {receipt.studentClass ?? "—"}
              </div>
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Nº Aluno</div>
              <div className="font-semibold text-neutral-900" data-testid={`${testIdPrefix}-studentNumber`}>
                {receipt.studentNumber ?? "—"}
              </div>
            </div>
          </div>
          <div className="mt-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Encarregado</div>
            <div className="font-semibold text-neutral-900" data-testid={`${testIdPrefix}-guardianName`}>
              {receipt.guardianName ?? "—"}
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Pagamento</div>
          <div className="mt-1 font-semibold text-neutral-950" data-testid={`${testIdPrefix}-paymentDescription`}>
            {receipt.paymentDescription ?? "—"}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 text-[13px] text-neutral-700">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Forma</div>
              <div className="font-semibold text-neutral-900" data-testid={`${testIdPrefix}-paymentMethod`}>
                {receipt.paymentMethod ?? "—"}
              </div>
            </div>
            <div className="text-right">
              <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Valor</div>
              <div className="font-bold text-neutral-900 tabular-nums text-lg" data-testid={`${testIdPrefix}-amountPaid`}>
                {fmtMoney((receipt as any).amountPaid)} MT
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-lg bg-neutral-50 border border-neutral-200 p-3">
            <div className="text-[11px] uppercase tracking-[0.18em] text-neutral-500">Por extenso</div>
            <div className="mt-1 text-[13px] leading-relaxed text-neutral-800" data-testid={`${testIdPrefix}-amountInWords`}>
              {receipt.amountInWords ?? "—"}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Assinatura</div>
          <div className="mt-10 border-t border-neutral-300 pt-2 text-[12px] text-neutral-600">
            Chefe da Secretaria
          </div>
        </div>
        <div className="rounded-xl border border-neutral-200 p-4">
          <div className="text-[11px] uppercase tracking-[0.22em] text-neutral-600">Carimbo</div>
          <div className="mt-3 h-20 rounded-lg border border-dashed border-neutral-300 grid place-items-center text-[12px] text-neutral-500">
            Área do carimbo
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between text-[12px] text-neutral-500">
        <div>Documento interno — uso escolar</div>
        <div className="tabular-nums">Ref: RH-{receiptNumber}</div>
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
