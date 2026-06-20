/**
 * Geração do PDF dos recibos (A4, dois recibos por página com linha de corte).
 * Isolado das rotas: as rotas só pedem `buildPdfForReceipts(ids)`.
 */
import PDFDocument from "pdfkit";
import { storage } from "../storage";
import { BRAND } from "@shared/brand";

/** Valor monetário sem sufixo: 3563 → "3 563,00". */
function formatMoneyMt(amount: number): string {
  return amount.toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** Número inteiro por extenso, em português. */
function numberToWordsPt(n: number): string {
  const units = ["zero","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","catorze","quinze","dezasseis","dezassete","dezoito","dezanove"];
  const tens  = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
  const hundreds = ["","cento","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
  if (n === 0) return units[0];
  if (n === 100) return "cem";
  const parts: string[] = [];
  const mil = Math.floor(n / 1000);
  const rest = n % 1000;
  if (mil > 0) parts.push(mil === 1 ? "mil" : `${numberToWordsPt(mil)} mil`);
  let rv = rest;
  const c = Math.floor(rv / 100);
  rv = rv % 100;
  if (c > 0) parts.push(hundreds[c]);
  if (rv > 0) {
    if (rv < 20) parts.push(units[rv]);
    else {
      const t = Math.floor(rv / 10);
      const u = rv % 10;
      parts.push(u === 0 ? tens[t] : `${tens[t]} e ${units[u]}`);
    }
  }
  return parts.filter(Boolean).join(" e ").replace(/\s+/g, " ").trim();
}

/** Valor monetário por extenso: "mil e quinhentos meticais". */
export function amountToWordsMt(amount: number): string {
  const mt = Math.floor(amount);
  const cents = Math.round((amount - mt) * 100);
  const mtWords = `${numberToWordsPt(mt)} meticais`;
  return cents > 0 ? `${mtWords} e ${numberToWordsPt(cents)} centavos` : mtWords;
}

// ═══════════════════════════════════════════════════════════════
// receiptBlock — desenha um recibo a partir de startY.
//
// A4 = 595 × 841 pt. Cada bloco ocupa ~379 pt.
// Mapa de alturas (y relativo ao startY):
//   0 stripe topo 6 · 6 header 54 · 61 info bar 20 · 82 aluno hdr 15
//   97 aluno rows 4×16 · 162 pagamento hdr 15 · 177 card desc/valor 40
//   217 pay rows 2×16 · 249 total 26 · 283 footer 72 · 359 ref 9 · 373 stripe 6
// ═══════════════════════════════════════════════════════════════
function receiptBlock(doc: any, r: any, startY: number): void {
  const mx = 25;          // margem esquerda/direita
  const W  = 545;         // largura útil (25+545=570 < 595)
  let   y  = startY;

  /* ── stripe topo ─────────────────────────────────────── 6pt */
  doc.rect(mx, y, W, 6).fillColor("#1a3a6b").fill();
  y += 6;

  /* ── header ──────────────────────────────────────────── 54pt */
  // logo
  try {
    doc.image("client/public/colegio.png", mx + 4, y + 4, { width: 46, height: 46 });
  } catch {
    doc.rect(mx + 4, y + 4, 46, 46).lineWidth(0.8).strokeColor("#d1d5db").stroke();
  }
  // nome escola
  doc.fontSize(17).font("Helvetica-Bold").fillColor("#1a3a6b")
     .text(BRAND.full, mx + 58, y + 5, { lineBreak: false });
  // slogan
  doc.fontSize(9).font("Helvetica-Oblique").fillColor("#5a7aa8")
     .text(BRAND.slogan, mx + 58, y + 26, { lineBreak: false });
  // endereço
  doc.fontSize(7.5).font("Helvetica").fillColor("#999999")
     .text(`${BRAND.address}  ·  NUIT: ${BRAND.nuit}`, mx + 58, y + 39, { lineBreak: false });

  // badge RECIBO (direita)
  const bW = 88;
  doc.rect(mx + W - bW, y + 3, bW, 22).fillColor("#1a3a6b").fill();
  doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
     .text("RECIBO", mx + W - bW, y + 9, { width: bW, align: "center", lineBreak: false });
  // telefone
  doc.fontSize(7).font("Helvetica").fillColor("#999999")
     .text(`Cell: ${BRAND.phone}`, mx + W - bW, y + 29, { width: bW, align: "center", lineBreak: false });

  y += 54;

  /* ── sep ──────────────────────────────────────────────── 1pt */
  doc.moveTo(mx, y).lineTo(mx + W, y).lineWidth(0.6).strokeColor("#dde3ec").stroke();
  y += 1;

  /* ── info bar ─────────────────────────────────────────── 20pt */
  doc.rect(mx, y, W, 20).fillColor("#f2f5fb").fill();

  const numFmt = String(r.receiptNumber ?? "—").padStart(4, "0");
  const dateStr = (() => {
    if (!r.issueDate) return new Date().toLocaleDateString("pt-PT");
    const d = typeof r.issueDate === "string" ? new Date(r.issueDate) : r.issueDate;
    return isNaN(d.getTime()) ? String(r.issueDate) : d.toLocaleDateString("pt-PT");
  })();

  doc.fontSize(8.5).font("Helvetica").fillColor("#555555")
     .text("Nº Documento: ", mx + 7, y + 6, { continued: true, lineBreak: false });
  doc.font("Helvetica-Bold").fillColor("#1a3a6b")
     .text(`RH-${numFmt}`, { lineBreak: false });

  doc.fontSize(8.5).font("Helvetica").fillColor("#555555")
     .text("Data de Emissão: ", mx + 320, y + 6, { continued: true, lineBreak: false });
  doc.font("Helvetica-Bold").fillColor("#111111")
     .text(dateStr, { lineBreak: false });

  y += 20;

  /* ── sep ──────────────────────────────────────────────── 1pt */
  doc.moveTo(mx, y).lineTo(mx + W, y).lineWidth(0.6).strokeColor("#dde3ec").stroke();
  y += 1;

  /* ── aluno header ─────────────────────────────────────── 15pt */
  doc.rect(mx, y, W, 15).fillColor("#1a3a6b").fill();
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff")
     .text("IDENTIFICAÇÃO DO ALUNO", mx + 7, y + 4, { characterSpacing: 1.3, lineBreak: false });
  y += 15;

  /* ── aluno rows (4 × 16pt = 64pt) ───────────────────────────  */
  const alunoRows: [string, string][] = [
    ["Nome Completo",           r.studentName   ?? "—"],
    ["Classe",                  r.studentClass  ?? "—"],
    ["Nº Interno",              r.studentNumber || "—"],
    ["Encarregado de Educação", r.guardianName  || "—"],
  ];
  for (const [label, value] of alunoRows) {
    doc.moveTo(mx, y).lineTo(mx + W, y).lineWidth(0.3).strokeColor("#e8ecf2").stroke();
    doc.fontSize(8.5).font("Helvetica").fillColor("#555555")
       .text(`${label}:`, mx + 7, y + 4, { width: 150, lineBreak: false });
    doc.font("Helvetica-Bold").fillColor("#111111")
       .text(value, mx + 162, y + 4, { width: W - 169, lineBreak: false });
    y += 16;
  }

  /* ── sep ──────────────────────────────────────────────── 1pt */
  doc.moveTo(mx, y).lineTo(mx + W, y).lineWidth(0.6).strokeColor("#dde3ec").stroke();
  y += 1;

  /* ── pagamento header ─────────────────────────────────── 15pt */
  doc.rect(mx, y, W, 15).fillColor("#1a3a6b").fill();
  doc.fontSize(7.5).font("Helvetica-Bold").fillColor("#ffffff")
     .text("DETALHES DO PAGAMENTO", mx + 7, y + 4, { characterSpacing: 1.3, lineBreak: false });
  y += 15;

  /* ── card desc / valor ────────────────────────────────── 40pt */
  const amtVal = Number(r.amountPaid) || 0;
  doc.rect(mx, y, W, 40).fillColor("#f0f4fa").fill();
  doc.rect(mx, y, W, 40).lineWidth(0.5).strokeColor("#dde3ec").stroke();

  doc.fontSize(7).font("Helvetica").fillColor("#888888")
     .text("DESCRIÇÃO", mx + 8, y + 5, { characterSpacing: 0.7, lineBreak: false });
  doc.fontSize(12).font("Helvetica-Bold").fillColor("#1a3a6b")
     .text(r.paymentDescription ?? "—", mx + 8, y + 17, { lineBreak: false });

  doc.fontSize(7).font("Helvetica").fillColor("#888888")
     .text("VALOR PAGO", mx + W - 150, y + 5, { width: 142, align: "right", characterSpacing: 0.7, lineBreak: false });
  doc.fontSize(17).font("Helvetica-Bold").fillColor("#1a3a6b")
     .text(`${formatMoneyMt(amtVal)} MT`, mx + W - 150, y + 16, { width: 142, align: "right", lineBreak: false });

  y += 40;

  /* ── pay rows (2 × 16pt = 32pt) ─────────────────────────────  */
  const payRows: [string, string][] = [
    ["Forma de Pagamento", r.paymentMethod ?? "—"],
    ["Valor por Extenso",  r.amountInWords ?? "—"],
  ];
  for (const [label, value] of payRows) {
    doc.moveTo(mx, y).lineTo(mx + W, y).lineWidth(0.3).strokeColor("#e8ecf2").stroke();
    doc.fontSize(8.5).font("Helvetica").fillColor("#555555")
       .text(`${label}:`, mx + 7, y + 4, { width: 150, lineBreak: false });
    doc.font("Helvetica-Bold").fillColor("#333333")
       .text(value, mx + 162, y + 4, { width: W - 169, lineBreak: false });
    y += 16;
  }

  /* ── total ────────────────────────────────────────────── 26pt */
  y += 3;
  doc.rect(mx, y, W, 26).fillColor("#1a3a6b").fill();
  doc.fontSize(10).font("Helvetica-Bold").fillColor("#ffffff")
     .text("TOTAL PAGO", mx + 8, y + 8, { lineBreak: false });
  doc.fontSize(15).font("Helvetica-Bold").fillColor("#ffffff")
     .text(`${formatMoneyMt(amtVal)} MT`, mx, y + 7, { width: W - 8, align: "right", lineBreak: false });
  y += 26 + 5;

  /* ── footer (72pt) ───────────────────────────────────────────  */
  // carimbo
  doc.rect(mx, y, 115, 62).lineWidth(0.6).strokeColor("#dde3ec").stroke();
  doc.fontSize(8).font("Helvetica").fillColor("#bbbbbb")
     .text("Carimbo Oficial", mx + 5, y + 14, { width: 105, align: "center", lineBreak: false });
  doc.fontSize(7).font("Helvetica-Oblique").fillColor("#d9d9d9")
     .text("Assinatura", mx + 5, y + 46, { width: 105, align: "center", lineBreak: false });

  // linha secretária
  const secName  = r.secretaryName ?? "—";
  const sigX     = mx + W - 200;
  const sigLineY = y + 52;
  doc.moveTo(sigX, sigLineY).lineTo(mx + W, sigLineY)
     .lineWidth(0.7).strokeColor("#444444").stroke();
  doc.fontSize(9).font("Helvetica-Bold").fillColor("#111111")
     .text(secName, sigX, sigLineY + 4, { width: 200, align: "center", lineBreak: false });
  doc.fontSize(8).font("Helvetica").fillColor("#666666")
     .text("Chefe da Secretaria", sigX, sigLineY + 16, { width: 200, align: "center", lineBreak: false });

  y += 62 + 4;

  /* ── ref ──────────────────────────────────────────────── 9pt */
  doc.fontSize(6.5).font("Helvetica").fillColor("#cccccc")
     .text(
       `Documento processado por computador  ·  Ref: RH-${numFmt}`,
       mx, y, { width: W, align: "center", lineBreak: false }
     );
  y += 9;

  /* ── stripe base ──────────────────────────────────────── 6pt */
  doc.rect(mx, y, W, 6).fillColor("#1a3a6b").fill();
}

/**
 * Gera o PDF (base64) com os recibos indicados — duas cópias por página
 * (original + duplicado) separadas por uma linha de corte.
 */
export async function buildPdfForReceipts(
  receiptIds: number[],
): Promise<{ pdfBase64: string; filename: string }> {
  const receiptsData = await Promise.all(
    receiptIds.map((id) => storage.getReceipt(id)),
  );
  const list = receiptsData.filter(Boolean) as any[];
  if (list.length === 0) return { pdfBase64: "", filename: "recibos.pdf" };

  const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));

  for (let i = 0; i < list.length; i++) {
    if (i > 0) doc.addPage();
    const r = list[i];

    // cópia 1 (original)
    receiptBlock(doc, r, 10);

    // linha de corte
    const cutY = 402;
    doc
      .dash(4, { space: 3 })
      .moveTo(25, cutY).lineTo(570, cutY)
      .lineWidth(0.5).strokeColor("#aab0bb").stroke()
      .undash();
    doc.fontSize(7).font("Helvetica").fillColor("#aab0bb")
       .text("✂   Linha de corte", 0, cutY - 4, { width: 595, align: "center", lineBreak: false });

    // cópia 2 (duplicado)
    receiptBlock(doc, r, 412);
  }

  doc.end();

  const pdfBuffer = await new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  return {
    pdfBase64: pdfBuffer.toString("base64"),
    filename: `recibos_${new Date().toISOString().slice(0, 10)}.pdf`,
  };
}
