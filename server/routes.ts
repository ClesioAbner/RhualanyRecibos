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
    return `${amount.toFixed(2)} Mt`;
  }

  function numberToWordsPt(n: number): string {
    const units = [
      "zero",
      "um",
      "dois",
      "três",
      "quatro",
      "cinco",
      "seis",
      "sete",
      "oito",
      "nove",
      "dez",
      "onze",
      "doze",
      "treze",
      "catorze",
      "quinze",
      "dezasseis",
      "dezassete",
      "dezoito",
      "dezanove",
    ];
    const tens = [
      "",
      "",
      "vinte",
      "trinta",
      "quarenta",
      "cinquenta",
      "sessenta",
      "setenta",
      "oitenta",
      "noventa",
    ];
    const hundreds = [
      "",
      "cento",
      "duzentos",
      "trezentos",
      "quatrocentos",
      "quinhentos",
      "seiscentos",
      "setecentos",
      "oitocentos",
      "novecentos",
    ];
    if (n === 0) return units[0];
    if (n === 100) return "cem";

    const parts: string[] = [];
    const mil = Math.floor(n / 1000);
    const rest = n % 1000;
    if (mil > 0) {
      if (mil === 1) parts.push("mil");
      else parts.push(`${numberToWordsPt(mil)} mil`);
    }
    let r = rest;
    const c = Math.floor(r / 100);
    r = r % 100;
    if (c > 0) parts.push(hundreds[c]);
    if (r > 0) {
      if (r < 20) parts.push(units[r]);
      else {
        const t = Math.floor(r / 10);
        const u = r % 10;
        if (u === 0) parts.push(tens[t]);
        else parts.push(`${tens[t]} e ${units[u]}`);
      }
    }

    return parts
      .filter(Boolean)
      .join(" e ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function amountToWordsMt(amount: number) {
    const mt = Math.floor(amount);
    const cents = Math.round((amount - mt) * 100);
    const mtWords = `${numberToWordsPt(mt)} meticais`;
    if (cents > 0) {
      return `${mtWords} e ${numberToWordsPt(cents)} centavos`;
    }
    return mtWords;
  }

  function receiptBlock(doc: any, r: any, y: number) {
    const marginX = 40;
    const width = 515;
    const height = 360;
    doc
      .rect(marginX, y, width, height)
      .lineWidth(1)
      .strokeColor("#000")
      .stroke();

    doc.fontSize(16).font("Helvetica-Bold").text("Colégio Rhulany", marginX + 12, y + 12);
    doc.fontSize(12).font("Helvetica").text("RECIBO", marginX + 12, y + 34);

    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`Recibo Nº: ${r.receiptNumber}`, marginX + 360, y + 18, { align: "left" })
      .text(`Data: ${r.issueDate}`, marginX + 360, y + 34, { align: "left" });

    const leftY = y + 70;
    doc.fontSize(11).font("Helvetica-Bold").text("Dados do Aluno", marginX + 12, leftY);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Nome: ${r.studentName}`, marginX + 12, leftY + 18);
    doc.text(`Classe: ${r.studentClass}`, marginX + 12, leftY + 34);
    doc.text(`Nº do aluno: ${r.studentNumber ?? ""}`, marginX + 260, leftY + 34);
    doc.text(`Encarregado: ${r.guardianName ?? ""}`, marginX + 12, leftY + 50);

    const payY = leftY + 85;
    doc.fontSize(11).font("Helvetica-Bold").text("Pagamento", marginX + 12, payY);
    doc.fontSize(10).font("Helvetica");
    doc.text(`Descrição: ${r.paymentDescription}`, marginX + 12, payY + 18);
    doc.text(`Forma: ${r.paymentMethod}`, marginX + 12, payY + 34);
    doc
      .fontSize(12)
      .font("Helvetica-Bold")
      .text(`Valor: ${formatMoneyMt(Number(r.amountPaid))}`, marginX + 360, payY + 18);
    doc
      .fontSize(9)
      .font("Helvetica")
      .text(`Por extenso: ${r.amountInWords}`, marginX + 12, payY + 56, { width: width - 24 });

    const sigY = y + height - 85;
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("Assinatura da Chefe da Secretaria:", marginX + 12, sigY);
    doc
      .moveTo(marginX + 12, sigY + 22)
      .lineTo(marginX + 250, sigY + 22)
      .strokeColor("#000")
      .stroke();
    doc
      .fontSize(10)
      .text("Carimbo:", marginX + 320, sigY);
    doc
      .rect(marginX + 320, sigY + 16, 200, 45)
      .strokeColor("#000")
      .stroke();

    doc
      .fontSize(10)
      .text(`Chefe da Secretaria: ${r.secretaryName}`, marginX + 12, y + height - 30);
  }

  async function buildPdfForReceipts(receiptIds: number[]) {
    const receiptsData = await Promise.all(receiptIds.map((id) => storage.getReceipt(id)));
    const list = receiptsData.filter(Boolean) as any[];
    if (list.length === 0) {
      return { pdfBase64: "", filename: "recibos.pdf" };
    }

    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));

    const perPage = 2;
    for (let i = 0; i < list.length; i += perPage) {
      if (i > 0) doc.addPage();
      const pageReceipts = list.slice(i, i + perPage);

      receiptBlock(doc, pageReceipts[0], 40);
      doc
        .dash(4, { space: 4 })
        .moveTo(40, 420)
        .lineTo(555, 420)
        .strokeColor("#555")
        .stroke()
        .undash();
      if (pageReceipts[1]) {
        receiptBlock(doc, pageReceipts[1], 460);
      }
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

  app.get(api.settings.get.path, async (_req, res) => {
    const s = await storage.getSettings();
    if (!s.secretaryName) {
      return res.json({ secretaryName: "" });
    }
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
        return res.status(400).json({ message: "Defina o nome da Chefe da Secretaria nas definições" });
      }
      const amountPaid = Number(input.amountPaid);
      const amountInWords = amountToWordsMt(amountPaid);

      const created = await storage.createReceipt({
        ...input,
        secretaryName: s.secretaryName,
        amountPaid: amountPaid as any,
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
      const updates = api.receipts.update.input?.parse(req.body) ?? {};
      const normalized: any = { ...updates };
      if (typeof normalized.amountPaid !== "undefined") {
        normalized.amountPaid = Number(normalized.amountPaid);
        normalized.amountInWords = amountToWordsMt(Number(normalized.amountPaid));
      }
      const updated = await storage.updateReceipt(id, normalized);
      if (!updated) return res.status(404).json({ message: "Recibo não encontrado" });
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
      const pdf = await buildPdfForReceipts(input.receiptIds);
      if (!pdf.pdfBase64) {
        return res.status(404).json({ message: "Nenhum recibo encontrado" });
      }
      res.json(pdf);
    } catch (err) {
      return zodErrorToBadRequest(res, err);
    }
  });

  async function seedDatabase() {
    const currentSettings = await storage.getSettings();
    if (!currentSettings.secretaryName) {
      await storage.updateSettings({ secretaryName: "Chefe da Secretaria" });
    }

    const existing = await storage.listReceipts();
    if (existing.length > 0) return;

    await storage.createReceipt({
      secretaryName: (await storage.getSettings()).secretaryName || "Chefe da Secretaria",
      studentName: "Ana Matavele",
      studentClass: "3ª",
      studentNumber: "A-1023",
      guardianName: "Carlos Matavele",
      paymentDescription: "Propina - Fevereiro",
      paymentMethod: "M-Pesa",
      amountPaid: 1500.0 as any,
      amountInWords: amountToWordsMt(1500.0),
    } as any);

    await storage.createReceipt({
      secretaryName: (await storage.getSettings()).secretaryName || "Chefe da Secretaria",
      studentName: "João Nhantumbo",
      studentClass: "6ª",
      studentNumber: "B-558",
      guardianName: "Rosa Nhantumbo",
      paymentDescription: "Matrícula",
      paymentMethod: "Dinheiro",
      amountPaid: 750.5 as any,
      amountInWords: amountToWordsMt(750.5),
    } as any);

    await storage.createReceipt({
      secretaryName: (await storage.getSettings()).secretaryName || "Chefe da Secretaria",
      studentName: "Marta Sitoe",
      studentClass: "1ª",
      studentNumber: null as any,
      guardianName: "Nelson Sitoe",
      paymentDescription: "Uniforme",
      paymentMethod: "e-Mola",
      amountPaid: 980.0 as any,
      amountInWords: amountToWordsMt(980.0),
    } as any);
  }

  seedDatabase().catch(() => {
    // ignore seeding errors
  });

  return httpServer;
}
