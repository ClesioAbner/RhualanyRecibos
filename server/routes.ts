import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import PDFDocument from "pdfkit";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  function zodErrorToBadRequest(res: any, err: unknown) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({
        message: err.errors[0]?.message ?? "Invalid request",
        field: err.errors[0]?.path?.join("."),
      });
    }
    throw err;
  }

  function formatMoneyMt(amount: number) {
    return amount.toLocaleString("pt-PT", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }

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

  function amountToWordsMt(amount: number) {
    const mt = Math.floor(amount);
    const cents = Math.round((amount - mt) * 100);
    const mtWords = `${numberToWordsPt(mt)} meticais`;
    return cents > 0 ? `${mtWords} e ${numberToWordsPt(cents)} centavos` : mtWords;
  }

  // ═══════════════════════════════════════════════════════════════
  // receiptBlock
  //
  // A4 = 595 × 841 pt
  // Cada bloco ocupa exactamente 385 pt (sem pills, sem labels extra)
  //
  // Mapa de alturas (y relativo ao startY):
  //   0   stripe topo         6
  //   6   header              54   (logo 46px centrado verticalmente)
  //  60   sep                  1
  //  61   info bar            20
  //  81   sep                  1
  //  82   aluno hdr           15
  //  97   aluno rows       4×16=64
  // 161   sep                  1
  // 162   pagamento hdr       15
  // 177   card desc/valor     40
  // 217   pay rows         2×16=32
  // 249   total               26
  // 275   gap                  8
  // 283   footer              72   (carimbo + secretária)
  // 355   gap                  4
  // 359   ref                  9
  // 368   gap                  5
  // 373   stripe bot           6
  // 379   FIM  (< 385 ✓)
  // ═══════════════════════════════════════════════════════════════
  function receiptBlock(doc: any, r: any, startY: number) {
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
       .text("Colégio Rhulany", mx + 58, y + 5, { lineBreak: false });
    // slogan
    doc.fontSize(9).font("Helvetica-Oblique").fillColor("#5a7aa8")
       .text("Educação com qualidade e excelência", mx + 58, y + 26, { lineBreak: false });
    // endereço
    doc.fontSize(7.5).font("Helvetica").fillColor("#999999")
       .text("Av. Acordos de Lusaka i nº 1251  ·  NUIT: 121815559", mx + 58, y + 39, { lineBreak: false });

    // badge RECIBO (direita)
    const bW = 88;
    doc.rect(mx + W - bW, y + 3, bW, 22).fillColor("#1a3a6b").fill();
    doc.fontSize(13).font("Helvetica-Bold").fillColor("#ffffff")
       .text("RECIBO", mx + W - bW, y + 9, { width: bW, align: "center", lineBreak: false });
    // telefone
    doc.fontSize(7).font("Helvetica").fillColor("#999999")
       .text("Cell: 826 116 720 / 848 067 954", mx + W - bW, y + 29, { width: bW, align: "center", lineBreak: false });

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
    // y final ≈ startY + 379
  }

  // ═══════════════════════════════════════════════════════════════
  // buildPdfForReceipts
  //
  // Bloco 1: startY = 10   →  termina em ≈ 389
  // Linha de corte: y = 400
  // Bloco 2: startY = 412  →  termina em ≈ 791  (< 841 ✓)
  // ═══════════════════════════════════════════════════════════════
  async function buildPdfForReceipts(receiptIds: number[]) {
    const receiptsData = await Promise.all(
      receiptIds.map((id) => storage.getReceipt(id))
    );
    const list = receiptsData.filter(Boolean) as any[];
    if (list.length === 0) return { pdfBase64: "", filename: "recibos.pdf" };

    const doc = new PDFDocument({ size: "A4", margin: 0, autoFirstPage: true });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    for (let i = 0; i < list.length; i++) {
      if (i > 0) doc.addPage();
      const r = list[i];

      // cópia 1
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

      // cópia 2
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

  // ═══════════════════════════════════════════════════════════════
  // ROUTES
  // ═══════════════════════════════════════════════════════════════
  app.get(api.settings.get.path, async (_req, res) => {
    const s = await storage.getSettings();
    if (!s.secretaryName) return res.json({ secretaryName: "" });
    res.json(s);
  });

  app.put(api.settings.update.path, async (req, res) => {
    try {
      const input = api.settings.update.input.parse(req.body);
      const updated = await storage.updateSettings(input);
      res.json(updated);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  app.get(api.receipts.list.path, async (req, res) => {
    const input = api.receipts.list.input?.safeParse(req.query);
    const filters = input?.success ? input.data : undefined;
    const list = await storage.listReceipts(filters as any);
    res.json(list);
  });

  app.get(api.receipts.get.path, async (req, res) => {
    const id = Number(req.params.id);
    const r = await storage.getReceipt(id);
    if (!r) return res.status(404).json({ message: "Recibo não encontrado" });
    res.json(r);
  });

  app.post(api.receipts.create.path, async (req, res) => {
    try {
      const input = api.receipts.create.input.parse(req.body);
      const s = await storage.getSettings();
      if (!s.secretaryName) {
        return res
          .status(400)
          .json({ message: "Defina o nome da Chefe da Secretaria nas definições" });
      }
      const amountPaid    = Number(input.amountPaid);
      const ivaAmount     = amountPaid * 0.05;
      const amountInWords = amountToWordsMt(amountPaid);
      const created = await storage.createReceipt({
        ...input,
        secretaryName: s.secretaryName,
        amountPaid:    amountPaid as any,
        ivaAmount:     ivaAmount  as any,
        amountInWords,
      } as any);
      res.status(201).json(created);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  app.put(api.receipts.update.path, async (req, res) => {
    const id = Number(req.params.id);
    try {
      const updates     = api.receipts.update.input?.parse(req.body) ?? {};
      const normalized: any = { ...updates };
      if (typeof normalized.amountPaid !== "undefined") {
        normalized.amountPaid    = Number(normalized.amountPaid);
        normalized.amountInWords = amountToWordsMt(Number(normalized.amountPaid));
      }
      const updated = await storage.updateReceipt(id, normalized);
      if (!updated)
        return res.status(404).json({ message: "Recibo não encontrado" });
      res.json(updated);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  app.delete(api.receipts.delete.path, async (req, res) => {
    const id = Number(req.params.id);
    const ok = await storage.deleteReceipt(id);
    if (!ok) return res.status(404).json({ message: "Recibo não encontrado" });
    res.status(204).send();
  });

  app.post(api.receipts.pdf.path, async (req, res) => {
    try {
      const input = api.receipts.pdf.input.parse(req.body);
      const pdf   = await buildPdfForReceipts(input.receiptIds);
      if (!pdf.pdfBase64)
        return res.status(404).json({ message: "Nenhum recibo encontrado" });
      res.json(pdf);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  // ─── seed ──────────────────────────────────────────────────────
  async function seedDatabase() {
    const s = await storage.getSettings();
    if (!s.secretaryName)
      await storage.updateSettings({ secretaryName: "Chefe da Secretaria" });
    const existing = await storage.listReceipts();
    if (existing.length > 0) return;
    const sec = (await storage.getSettings()).secretaryName || "Chefe da Secretaria";
    await storage.createReceipt({ secretaryName: sec, studentName: "Ana Matavele",   studentClass: "3ª", studentNumber: "A-1023",    guardianName: "Carlos Matavele", paymentDescription: "Propina - Fevereiro", paymentMethod: "M-Pesa",   amountPaid: 1500.0 as any, amountInWords: amountToWordsMt(1500.0) } as any);
    await storage.createReceipt({ secretaryName: sec, studentName: "João Nhantumbo", studentClass: "6ª", studentNumber: "B-558",      guardianName: "Rosa Nhantumbo",   paymentDescription: "Matrícula",           paymentMethod: "Dinheiro", amountPaid: 750.5  as any, amountInWords: amountToWordsMt(750.5)  } as any);
    await storage.createReceipt({ secretaryName: sec, studentName: "Marta Sitoe",    studentClass: "1ª", studentNumber: null as any,  guardianName: "Nelson Sitoe",     paymentDescription: "Uniforme",            paymentMethod: "e-Mola",   amountPaid: 980.0  as any, amountInWords: amountToWordsMt(980.0)  } as any);
  }

  seedDatabase().catch(() => {});

  return httpServer;
}