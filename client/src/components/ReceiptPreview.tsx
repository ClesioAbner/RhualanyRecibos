import { Receipt } from "@shared/schema";
import { cn } from "@/lib/utils";

function fmtMoney(v: unknown) {
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) return "0,00";
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

/* ─────────────────────────────────────────
   RECEIPT BLOCK
───────────────────────────────────────── */
function ReceiptBlock({
  receipt,
  copy,
  testIdPrefix,
}: {
  receipt: ReceiptPreviewModel;
  copy: "original" | "duplicado";
  testIdPrefix: string;
}) {
  const num         = receipt.receiptNumber ?? "—";
  const numFmt      = typeof num === "number" ? num.toString().padStart(4, "0") : num;
  const issueDate   = fmtDate((receipt as any).issueDate);
  const secretary   = receipt.secretaryName ?? "—";
  const amount      = Number((receipt as any).amountPaid) || 0;

  return (
    <div
      className="bg-white text-black font-sans"
      style={{ fontFamily: "'Segoe UI', Arial, sans-serif", fontSize: "11px" }}
      data-testid={`${testIdPrefix}-block`}
    >
      {/* ── TOP STRIPE ── */}
      <div style={{ background: "#1a3a6b", height: "6px" }} />

      {/* ── HEADER ── */}
      <div className="px-6 pt-4 pb-3" style={{ borderBottom: "1px solid #dde3ec" }}>
        <div className="flex items-start justify-between">

          {/* logo + name */}
          <div className="flex items-center gap-3">
            <img
              src="/colegio.png"
              alt="Colégio Rhulany"
              style={{ height: 52, width: 52, objectFit: "contain" }}
            />
            <div>
              <div style={{ fontSize: "17px", fontWeight: 800, color: "#1a3a6b", letterSpacing: "-0.3px" }}>
                Colégio Rhulany
              </div>
              <div style={{ fontSize: "9.5px", color: "#5a7aa8", fontStyle: "italic", marginTop: "1px" }}>
                Educação com qualidade e excelência
              </div>
              <div style={{ fontSize: "9px", color: "#888", marginTop: "3px" }}>
                Av. Acordos de Lusaka i nº 1251 &nbsp;·&nbsp; NUIT: 121815559
              </div>
            </div>
          </div>

          {/* right block */}
          <div className="text-right">
            <div style={{
              background: "#1a3a6b", color: "white",
              padding: "3px 12px", borderRadius: "4px",
              fontSize: "13px", fontWeight: 800, letterSpacing: "3px",
              marginBottom: "6px",
            }}>
              RECIBO
            </div>
            <div style={{ fontSize: "9px", color: "#888" }}>
              Cell: 826 116 720 / 848 067 954
            </div>
            <div style={{ fontSize: "9px", color: "#888", marginTop: "2px" }}>
              <span style={{
                background: copy === "original" ? "#1a3a6b" : "#e8f0fb",
                color: copy === "original" ? "white" : "#1a3a6b",
                padding: "1px 8px", borderRadius: "20px",
                fontWeight: 700, fontSize: "8.5px", textTransform: "uppercase", letterSpacing: "1px",
              }}>
                {copy}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── DOC INFO BAR ── */}
      <div style={{ background: "#f2f5fb", borderBottom: "1px solid #dde3ec" }}
           className="px-6 py-2 flex justify-between items-center">
        <div style={{ fontSize: "10px" }}>
          <span style={{ color: "#666" }}>Nº Documento: </span>
          <span style={{ fontWeight: 700, color: "#1a3a6b" }} data-testid={`${testIdPrefix}-receiptNumber`}>
            RH-{numFmt}
          </span>
        </div>
        <div style={{ fontSize: "10px" }}>
          <span style={{ color: "#666" }}>Data de Emissão: </span>
          <span style={{ fontWeight: 700 }} data-testid={`${testIdPrefix}-issueDate`}>{issueDate}</span>
        </div>
      </div>

      {/* ── BODY ── */}
      <div className="px-6 py-3 space-y-3">

        {/* ALUNO */}
        <div>
          <div style={{
            background: "#1a3a6b", color: "white",
            fontSize: "8.5px", fontWeight: 700, letterSpacing: "1.5px",
            padding: "3px 8px", marginBottom: "6px",
            textTransform: "uppercase",
          }}>
            Identificação do Aluno
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
            <tbody>
              {[
                ["Nome Completo",           receipt.studentName    ?? "—", `${testIdPrefix}-studentName`],
                ["Classe",                  receipt.studentClass   ?? "—", `${testIdPrefix}-studentClass`],
                ["Nº Interno",              receipt.studentNumber  || "—", `${testIdPrefix}-studentNumber`],
                ["Encarregado de Educação", receipt.guardianName   || "—", `${testIdPrefix}-guardianName`],
              ].map(([label, value, tid]) => (
                <tr key={label} style={{ borderBottom: "1px dotted #e5e9f0" }}>
                  <td style={{ padding: "3px 0", color: "#555", width: "42%" }}>{label}:</td>
                  <td style={{ padding: "3px 0", fontWeight: 600, color: "#111" }} data-testid={tid}>{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* PAGAMENTO */}
        <div>
          <div style={{
            background: "#1a3a6b", color: "white",
            fontSize: "8.5px", fontWeight: 700, letterSpacing: "1.5px",
            padding: "3px 8px", marginBottom: "6px",
            textTransform: "uppercase",
          }}>
            Detalhes do Pagamento
          </div>

          {/* description + amount row */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            background: "#f7f9fd", border: "1px solid #dde3ec",
            borderRadius: "4px", padding: "6px 10px", marginBottom: "6px",
          }}>
            <div>
              <div style={{ fontSize: "9px", color: "#666", textTransform: "uppercase", letterSpacing: "0.8px" }}>Descrição</div>
              <div style={{ fontWeight: 700, fontSize: "12px", color: "#1a3a6b", marginTop: "1px" }}
                   data-testid={`${testIdPrefix}-paymentDescription`}>
                {receipt.paymentDescription ?? "—"}
              </div>
            </div>
            <div className="text-right">
              <div style={{ fontSize: "9px", color: "#666", textTransform: "uppercase", letterSpacing: "0.8px" }}>Valor Pago</div>
              <div style={{ fontWeight: 800, fontSize: "18px", color: "#1a3a6b", letterSpacing: "-0.5px", marginTop: "1px" }}
                   data-testid={`${testIdPrefix}-amountPaid`}>
                {fmtMoney(amount)} <span style={{ fontSize: "11px", fontWeight: 600 }}>MT</span>
              </div>
            </div>
          </div>

          {/* método + extenso */}
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "10.5px" }}>
            <tbody>
              <tr style={{ borderBottom: "1px dotted #e5e9f0" }}>
                <td style={{ padding: "3px 0", color: "#555", width: "42%" }}>Forma de Pagamento:</td>
                <td style={{ padding: "3px 0", fontWeight: 600 }} data-testid={`${testIdPrefix}-paymentMethod`}>
                  {receipt.paymentMethod ?? "—"}
                </td>
              </tr>
              <tr>
                <td style={{ padding: "4px 0", color: "#555", verticalAlign: "top" }}>Valor por Extenso:</td>
                <td style={{ padding: "4px 0", fontStyle: "italic", color: "#333", fontWeight: 500 }}>
                  {receipt.amountInWords ?? "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* TOTAL BOX */}
        <div style={{
          background: "#1a3a6b", color: "white",
          borderRadius: "4px", padding: "6px 10px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontWeight: 700, fontSize: "10px", letterSpacing: "0.5px" }}>TOTAL PAGO</span>
          <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-0.3px" }}>
            {fmtMoney(amount)} MT
          </span>
        </div>

        {/* FOOTER: assinaturas */}
        <div style={{ display: "flex", justifyContent: "space-between", paddingTop: "8px", gap: "16px" }}>
          {/* stamp */}
          <div style={{
            border: "1px solid #dde3ec", borderRadius: "4px",
            padding: "8px 16px", textAlign: "center", minWidth: "90px",
          }}>
            <div style={{ fontSize: "8.5px", color: "#aaa", marginBottom: "18px" }}>Carimbo Oficial</div>
            <div style={{ fontSize: "8px", color: "#ccc", fontStyle: "italic" }}>Assinatura</div>
          </div>

          {/* secretary */}
          <div style={{ textAlign: "right", flex: 1 }}>
            <div style={{ borderTop: "1px solid #333", paddingTop: "4px", display: "inline-block", minWidth: "160px" }}>
              <div style={{ fontSize: "9.5px", fontWeight: 600 }}>{secretary}</div>
              <div style={{ fontSize: "8.5px", color: "#666" }}>Chefe da Secretaria</div>
            </div>
          </div>
        </div>

        {/* ref */}
        <div style={{ textAlign: "center", paddingTop: "4px" }}>
          <div style={{ fontSize: "8px", color: "#aaa" }}>
            Documento processado por computador &nbsp;·&nbsp; Ref: RH-{numFmt}
          </div>
        </div>
      </div>

      {/* ── BOTTOM STRIPE ── */}
      <div style={{ background: "#1a3a6b", height: "4px" }} />
    </div>
  );
}

/* ─────────────────────────────────────────
   EXPORT
───────────────────────────────────────── */
export default function ReceiptPreview({
  receipt,
  mode = "screen",
  testIdPrefix = "receipt-preview",
}: {
  receipt: ReceiptPreviewModel;
  mode?: "screen" | "print" | "single";
  testIdPrefix?: string;
}) {
  if (mode === "print") {
    return (
      <div className="print-page print-only" data-testid={`${testIdPrefix}-print`}>
        <div className="print-two-up">
          <ReceiptBlock receipt={receipt} copy="original"   testIdPrefix={`${testIdPrefix}-top`} />
          <div className="print-cutline" />
          <ReceiptBlock receipt={receipt} copy="duplicado"  testIdPrefix={`${testIdPrefix}-bottom`} />
        </div>
      </div>
    );
  }

  // single mode — only one receipt, no cut line, used in sidebar preview
  if (mode === "single") {
    return (
      <div data-testid={`${testIdPrefix}-single`}>
        <ReceiptBlock receipt={receipt} copy="original" testIdPrefix={`${testIdPrefix}-single`} />
      </div>
    );
  }

  return (
    <div data-testid={`${testIdPrefix}-screen`} className="space-y-2">
      <ReceiptBlock receipt={receipt} copy="original"  testIdPrefix={`${testIdPrefix}-screen-top`} />

      {/* cut line */}
      <div className="flex items-center gap-2">
        <div className="flex-1 border-t border-dashed border-slate-300" />
        <span style={{ fontSize: "9px", color: "#aaa", whiteSpace: "nowrap" }}>✂ Linha de corte</span>
        <div className="flex-1 border-t border-dashed border-slate-300" />
      </div>

      <ReceiptBlock receipt={receipt} copy="duplicado" testIdPrefix={`${testIdPrefix}-screen-bottom`} />
    </div>
  );
}