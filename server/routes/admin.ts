import type { Express, Request } from "express";
import { z } from "zod";
import PDFDocument from "pdfkit";
import { api } from "@shared/routes";
import { storage } from "../storage";
import { requireAdmin } from "../auth/index";
import { sendValidationError } from "../validation";
import { audit } from "../audit";
import { hashPassword } from "../auth/passwords";
import { issueResetToken } from "../auth/resetTokens";
import { sendPasswordResetEmail } from "../auth/mailer";
import { isTotpEnabled, type User } from "@shared/schema";

const idOf = (req: Request) => Number(req.params.id);

function toAdminUser(u: User) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role,
    active: u.active,
    lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : null,
    totpEnabled: isTotpEnabled(u),
    avatarUrl: u.avatarUrl ?? null,
    createdAt: new Date(u.createdAt).toISOString(),
  };
}

function money(n: number | string): string {
  const v = typeof n === "number" ? n : Number(n);
  return (Number.isFinite(v) ? v : 0).toLocaleString("pt-PT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function fmtDate(d: any): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  return Number.isNaN(dt.getTime()) ? String(d) : dt.toLocaleDateString("pt-PT");
}

// ── statement PDFs (template profissional Colégio Rhulany) ───────────────────
type Col = { label: string; width: number; align?: "left" | "right"; strong?: boolean; ellipsis?: boolean };
type Pdf = { pdfBase64: string; filename: string };

const NAVY = "#0d2d5e";
const BLUE = "#1597e5";
const INK = "#0f172a";
const MUTED = "#64748b";
const RED = "#dc2626";
const PAGE_W = 595.28;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;
const MONTH_FULL_PT = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];
const monthFull = (m: string) => {
  const n = Number(m.slice(5, 7));
  return n >= 1 && n <= 12 ? `${MONTH_FULL_PT[n - 1]} ${m.slice(0, 4)}` : m;
};

function newDoc(): { doc: any; done: Promise<Buffer> } {
  const doc = new PDFDocument({ size: "A4", margin: MARGIN, bufferPages: true });
  const chunks: Buffer[] = [];
  doc.on("data", (c: Buffer) => chunks.push(c));
  const done = new Promise<Buffer>((resolve) => doc.on("end", () => resolve(Buffer.concat(chunks))));
  return { doc, done };
}

function drawLogo(doc: any, x: number, y: number, size: number) {
  try {
    doc.image("client/public/colegio.png", x, y, { fit: [size, size] });
  } catch {
    /* logo opcional */
  }
}

function dataHora(d = new Date()): string {
  const date = d.toLocaleDateString("pt-PT");
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${date} às ${hh}h${mm}`;
}

type HeaderOpts = {
  title: string;
  totalLabel?: string;
  totalValue?: string;
  breadcrumb: string;
  meta: [string, string][];
};

/** Cabeçalho institucional + breadcrumb + bloco de meta-dados. Devolve y de conteúdo. */
function drawHeaderMeta(doc: any, o: HeaderOpts): number {
  drawLogo(doc, MARGIN, 34, 46);
  doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text("COLÉGIO RHULANY", MARGIN + 58, 42, { characterSpacing: 0.4, lineBreak: false });
  doc.font("Helvetica").fontSize(9).fillColor(MUTED).text(o.breadcrumb, MARGIN + 58, 58, { lineBreak: false });

  doc.font("Helvetica-Bold").fontSize(21).fillColor(NAVY).text(o.title, MARGIN, 32, { width: CONTENT_W, align: "right" });
  if (o.totalLabel && o.totalValue) {
    const lbl = `${o.totalLabel}:  `;
    doc.font("Helvetica").fontSize(10);
    const lblW = doc.widthOfString(lbl);
    doc.font("Helvetica-Bold").fontSize(11);
    const valW = doc.widthOfString(o.totalValue);
    const sx = MARGIN + CONTENT_W - lblW - valW;
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(lbl, sx, 63, { lineBreak: false });
    doc.font("Helvetica-Bold").fontSize(11).fillColor(NAVY).text(o.totalValue, sx + lblW, 62, { lineBreak: false });
  }

  let y = 84;
  doc.rect(MARGIN, y, 42, 2).fill(BLUE);
  doc.moveTo(MARGIN, y + 7).lineTo(MARGIN + CONTENT_W, y + 7).lineWidth(0.8).strokeColor("#e8ecf2").stroke();
  y += 18;

  doc.fontSize(9);
  for (const [label, value] of o.meta) {
    doc.font("Helvetica-Bold").fillColor(MUTED).text(label, MARGIN, y, { width: 130, lineBreak: false });
    doc.font("Helvetica").fillColor(INK).text(value, MARGIN + 134, y, { width: CONTENT_W - 134, lineBreak: false });
    y += 15;
  }
  return y + 10;
}

function sectionTitle(doc: any, y: number, text: string, right?: string): number {
  doc.font("Helvetica-Bold").fontSize(12).fillColor(NAVY).text(text, MARGIN, y, { lineBreak: false });
  if (right) {
    doc.font("Helvetica").fontSize(9.5).fillColor(MUTED).text(right, MARGIN, y + 2, { width: CONTENT_W, align: "right", lineBreak: false });
  }
  doc.rect(MARGIN, y + 18, 24, 2).fill(BLUE);
  return y + 28;
}

function colHeader(doc: any, y: number, cols: Col[]): number {
  let cx = MARGIN;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(MUTED);
  cols.forEach((c) => {
    doc.text(c.label.toUpperCase(), cx + 4, y, { width: c.width - 8, align: c.align ?? "left", lineBreak: false, characterSpacing: 0.3 });
    cx += c.width;
  });
  y += 14;
  doc.moveTo(MARGIN, y).lineTo(MARGIN + CONTENT_W, y).lineWidth(0.8).strokeColor("#e2e8f0").stroke();
  return y + 5;
}

function reportTable(doc: any, y: number, cols: Col[], rows: string[][], restart: () => number): number {
  y = colHeader(doc, y, cols);
  for (const r of rows) {
    if (y > 788) {
      y = restart();
      y = colHeader(doc, y, cols);
    }
    let cx = MARGIN;
    cols.forEach((c, i) => {
      const txt = r[i] ?? "";
      const neg = c.align === "right" && txt.trim().startsWith("-");
      doc.font(c.strong ? "Helvetica-Bold" : "Helvetica").fontSize(9).fillColor(neg ? RED : c.strong ? NAVY : INK);
      doc.text(txt, cx + 4, y, { width: c.width - 8, align: c.align ?? "left", lineBreak: false, ellipsis: c.ellipsis ?? false });
      cx += c.width;
    });
    y += 16;
    doc.moveTo(MARGIN, y - 4).lineTo(MARGIN + CONTENT_W, y - 4).lineWidth(0.5).strokeColor("#f3f5f8").stroke();
  }
  return y;
}

function ensure(doc: any, y: number, need: number, restart: () => number): number {
  if (y + need > 792) {
    doc.addPage();
    return restart();
  }
  return y;
}

function addFooters(doc: any, generated: string) {
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(range.start + i);
    const prev = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    doc.font("Helvetica").fontSize(8).fillColor("#aab4c2");
    doc.text(`Documento gerado em ${generated}`, MARGIN, doc.page.height - 28, { lineBreak: false });
    doc.text(`${i + 1} / ${range.count}`, MARGIN, doc.page.height - 28, { width: CONTENT_W, align: "right", lineBreak: false });
    doc.page.margins.bottom = prev;
  }
}

const code = (n: number) => `RH-${String(n).padStart(4, "0")}`;
const pctOf = (part: number, whole: number) => (whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "0%");

// ── 1) PAGAMENTOS DO MÊS ──
async function buildMonthPaymentsPdf(
  month: string,
  report: {
    period: string;
    totals: { activeStudents: number; paid: number; unpaid: number; received: number; expected: number };
    classes: { className: string; paidCount: number; total: number; rows: { fullName: string; paid: boolean; date: string | null; method: string | null; value: number }[] }[];
  },
): Promise<Pdf> {
  const gen = dataHora();
  const t = report.totals;
  const pct = t.activeStudents > 0 ? Math.round((t.paid / t.activeStudents) * 100) : 0;
  const headerOpts: HeaderOpts = {
    title: "Pagamentos do Mês",
    totalLabel: "Taxa de cobrança",
    totalValue: `${pct}%`,
    breadcrumb: `Gestão › Pagamentos › ${monthFull(month)}`,
    meta: [
      ["Período:", monthFull(month)],
      ["Alunos activos:", String(t.activeStudents)],
      ["Pagaram:", `${t.paid}  (${pct}%)`],
      ["Por pagar:", String(t.unpaid)],
      ["Recebido:", `${money(t.received)} MT`],
      ["Esperado:", `${money(t.expected)} MT`],
      ["Data/Hora:", gen],
    ],
  };
  const { doc, done } = newDoc();
  const restart = () => drawHeaderMeta(doc, headerOpts);
  let y = drawHeaderMeta(doc, headerOpts);

  const cols: Col[] = [
    { label: "Estado", width: 75 },
    { label: "Aluno", width: 175, ellipsis: true },
    { label: "Data", width: 80 },
    { label: "Método", width: 90 },
    { label: "Valor (MT)", width: CONTENT_W - 75 - 175 - 80 - 90, align: "right", strong: true },
  ];

  for (const cls of report.classes) {
    y = ensure(doc, y, 70, restart);
    const cpct = cls.rows.length > 0 ? Math.round((cls.paidCount / cls.rows.length) * 100) : 0;
    y = sectionTitle(doc, y, cls.className, `${cls.paidCount} / ${cls.rows.length} pagos · ${cpct}%`);
    const rows = cls.rows.map((r) => [
      r.paid ? "Pago" : "Em atraso",
      r.fullName,
      r.date ? fmtDate(r.date) : "—",
      r.method ?? "—",
      money(r.value),
    ]);
    y = reportTable(doc, y, cols, rows, restart);
    y += 14;
  }

  addFooters(doc, gen);
  doc.end();
  return { pdfBase64: (await done).toString("base64"), filename: `pagamentos_${month}.pdf` };
}

// ── 2) EXTRATO ANUAL ──
async function buildAnnualStatementPdf(year: string, list: any[]): Promise<Pdf> {
  const gen = dataHora();
  const total = list.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);
  const uniqueStudents = new Set(list.map((r) => (r.studentId != null ? `s${r.studentId}` : `n:${r.studentName}`))).size;

  const headerOpts: HeaderOpts = {
    title: "Extrato Anual",
    totalLabel: "Total anual",
    totalValue: `${money(total)} MT`,
    breadcrumb: `Recibos › Extratos › Anual › ${year}`,
    meta: [
      ["Ano:", year],
      ["Recibos emitidos:", String(list.length)],
      ["Alunos únicos:", String(uniqueStudents)],
      ["Data/Hora:", gen],
    ],
  };
  const { doc, done } = newDoc();
  const restart = () => drawHeaderMeta(doc, headerOpts);
  let y = drawHeaderMeta(doc, headerOpts);

  // Receita por mês
  y = sectionTitle(doc, y, "Receita por mês");
  const monthAgg = new Map<number, { count: number; total: number }>();
  for (const r of list) {
    const m = Number(String(r.issueDate).slice(5, 7));
    const e = monthAgg.get(m) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += Number(r.amountPaid) || 0;
    monthAgg.set(m, e);
  }
  const monthCols: Col[] = [
    { label: "Mês", width: 240 },
    { label: "Recibos", width: 140, align: "right" },
    { label: "Total (MT)", width: CONTENT_W - 240 - 140, align: "right", strong: true },
  ];
  const monthRows = MONTH_FULL_PT.map((name, i) => {
    const e = monthAgg.get(i + 1) ?? { count: 0, total: 0 };
    return [name, String(e.count), e.total === 0 ? "—" : money(e.total)];
  });
  y = reportTable(doc, y, monthCols, monthRows, restart);
  y += 16;

  // Por turma
  y = ensure(doc, y, 110, restart);
  y = sectionTitle(doc, y, "Por turma");
  const classAgg = new Map<string, { count: number; total: number }>();
  for (const r of list) {
    const k = r.studentClass || "—";
    const e = classAgg.get(k) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += Number(r.amountPaid) || 0;
    classAgg.set(k, e);
  }
  const breakdownCols = (firstLabel: string): Col[] => [
    { label: firstLabel, width: 240 },
    { label: "Recibos", width: 90, align: "right" },
    { label: "Total (MT)", width: 110, align: "right", strong: true },
    { label: "%", width: CONTENT_W - 240 - 90 - 110, align: "right" },
  ];
  const classRows = Array.from(classAgg.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, e]) => [k, String(e.count), money(e.total), pctOf(e.total, total)]);
  y = reportTable(doc, y, breakdownCols("Turma"), classRows, restart);
  y += 16;

  // Por método de pagamento
  y = ensure(doc, y, 110, restart);
  y = sectionTitle(doc, y, "Por método de pagamento");
  const methodAgg = new Map<string, { count: number; total: number }>();
  for (const r of list) {
    const k = r.paymentMethod || "—";
    const e = methodAgg.get(k) ?? { count: 0, total: 0 };
    e.count += 1;
    e.total += Number(r.amountPaid) || 0;
    methodAgg.set(k, e);
  }
  const methodRows = Array.from(methodAgg.entries())
    .sort((a, b) => b[1].total - a[1].total)
    .map(([k, e]) => [k, String(e.count), money(e.total), pctOf(e.total, total)]);
  y = reportTable(doc, y, breakdownCols("Método"), methodRows, restart);

  addFooters(doc, gen);
  doc.end();
  return { pdfBase64: (await done).toString("base64"), filename: `extrato_anual_${year}.pdf` };
}

// ── 3) EXTRATO DO ALUNO ──
async function buildStudentStatementPdf(
  student: any,
  className: string,
  guardianName: string,
  fee: string | number,
  year: string,
  list: any[],
): Promise<Pdf> {
  const gen = dataHora();
  const total = list.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0);

  const headerOpts: HeaderOpts = {
    title: "Extrato do Aluno",
    totalLabel: "Total pago",
    totalValue: `${money(total)} MT`,
    breadcrumb: `Cadastros › Alunos › ${student.fullName}`,
    meta: [
      ["Aluno:", student.fullName],
      ["Turma:", className],
      ["Encarregado:", guardianName || "—"],
      ["Mensalidade:", `${money(fee)} MT`],
      ["Período:", `Ano ${year}`],
      ["Data/Hora:", gen],
    ],
  };
  const { doc, done } = newDoc();
  const restart = () => drawHeaderMeta(doc, headerOpts);
  let y = drawHeaderMeta(doc, headerOpts);

  if (list.length === 0) {
    doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text("Sem recibos para este período.", MARGIN, y + 4);
    addFooters(doc, gen);
    doc.end();
    return { pdfBase64: (await done).toString("base64"), filename: `extrato_${String(student.fullName).replace(/\s+/g, "_").toLowerCase()}_${year}.pdf` };
  }

  const byMonth = new Map<string, any[]>();
  for (const r of list) {
    const m = String(r.issueDate).slice(0, 7);
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(r);
  }
  const cols: Col[] = [
    { label: "Data", width: 70 },
    { label: "Recibo", width: 70 },
    { label: "Tipo", width: 90 },
    { label: "Descrição", width: CONTENT_W - 70 - 70 - 90 - 100 - 90, ellipsis: true },
    { label: "Método", width: 100 },
    { label: "Valor (MT)", width: 90, align: "right", strong: true },
  ];
  for (const m of Array.from(byMonth.keys()).sort()) {
    y = ensure(doc, y, 70, restart);
    y = sectionTitle(doc, y, monthFull(m));
    const rows = byMonth.get(m)!.map((r) => [
      fmtDate(r.issueDate),
      code(r.receiptNumber),
      r.receiptType,
      r.paymentDescription,
      r.paymentMethod,
      money(r.amountPaid),
    ]);
    y = reportTable(doc, y, cols, rows, restart);
    y += 14;
  }

  addFooters(doc, gen);
  doc.end();
  return { pdfBase64: (await done).toString("base64"), filename: `extrato_${String(student.fullName).replace(/\s+/g, "_").toLowerCase()}_${year}.pdf` };
}

export function registerAdminRoutes(app: Express): void {
  // ───────────────────────── pending payments ─────────────────────────
  app.get(api.admin.pending.path, requireAdmin, async (req, res) => {
    const parsed = api.admin.pending.input?.safeParse(req.query);
    const month =
      (parsed?.success ? parsed.data?.month : undefined) ?? new Date().toISOString().slice(0, 7);
    res.json(await storage.listPendingPayments(month));
  });

  // ───────────────────────────── users ─────────────────────────────
  app.get(api.admin.usersList.path, requireAdmin, async (_req, res) => {
    const list = await storage.listUsers();
    res.json(list.map(toAdminUser));
  });

  app.post(api.admin.userCreate.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.userCreate.input.parse(req.body);
      const existing = await storage.getUserByEmail(input.email);
      if (existing) {
        return res.status(400).json({ code: "DUPLICATE", message: "Já existe uma conta com esse email" });
      }
      const passwordHash = await hashPassword(input.password);
      const created = await storage.createUser({
        email: input.email,
        name: input.name,
        role: input.role,
        passwordHash,
      });
      audit(req, "user.created", { targetType: "user", targetId: created.id, metadata: { email: created.email, role: created.role } });
      res.status(201).json(toAdminUser(created));
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });

  app.put(api.admin.userUpdate.path, requireAdmin, async (req, res) => {
    try {
      const input = api.admin.userUpdate.input.parse(req.body);
      const id = idOf(req);
      // Um admin não se pode desactivar a si próprio.
      if (input.active === false && id === (req.user as User).id) {
        return res.status(400).json({ code: "SELF", message: "Não pode desactivar a sua própria conta." });
      }
      const updated = await storage.updateUser(id, input);
      if (!updated) return res.status(404).json({ message: "Utilizador não encontrado" });
      audit(req, "user.updated", { targetType: "user", targetId: id, metadata: input });
      res.json(toAdminUser(updated));
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });

  app.post(api.admin.userResetPassword.path, requireAdmin, async (req, res) => {
    const user = await storage.getUserById(idOf(req));
    if (!user) return res.status(404).json({ message: "Utilizador não encontrado" });
    const token = issueResetToken(user.id);
    try {
      await sendPasswordResetEmail(user.email, token);
    } catch (err) {
      console.error("reset email failed:", err);
    }
    audit(req, "user.password_reset", { targetType: "user", targetId: user.id });
    res.json({ ok: true });
  });

  app.post(api.admin.userResetTwoFactor.path, requireAdmin, async (req, res) => {
    const user = await storage.getUserById(idOf(req));
    if (!user) return res.status(404).json({ message: "Utilizador não encontrado" });
    const updated = await storage.updateUser(user.id, {
      totpEnabledAt: null,
      totpSecret: null,
      totpRecoveryHashes: null,
    });
    audit(req, "user.2fa_reset", { targetType: "user", targetId: user.id });
    res.json(toAdminUser(updated!));
  });

  // ───────────────────────────── audit log ─────────────────────────────
  app.get(api.admin.audit.path, requireAdmin, async (req, res) => {
    const parsed = api.admin.audit.input?.safeParse(req.query);
    const f = parsed?.success ? parsed.data : undefined;
    const limit = f?.limit ?? 30;
    const items = await storage.listAudit({
      limit: limit + 1,
      cursorId: f?.cursor,
      action: f?.action,
      q: f?.q,
    });
    const hasMore = items.length > limit;
    const page = hasMore ? items.slice(0, limit) : items;
    res.json({
      items: page.map((a) => ({
        id: a.id,
        action: a.action,
        actorEmail: a.actorEmail,
        targetType: a.targetType,
        targetId: a.targetId,
        metadata: a.metadata ?? null,
        createdAt: new Date(a.createdAt).toISOString(),
      })),
      nextCursor: hasMore ? page[page.length - 1].id : null,
    });
  });

  // CSV de TODOS os registos de auditoria (respeita os filtros action/q).
  app.get("/api/admin/audit/export", requireAdmin, async (req, res) => {
    const parsed = api.admin.audit.input?.safeParse(req.query);
    const f = parsed?.success ? parsed.data : undefined;
    const rows = await storage.listAudit({ limit: 5000, action: f?.action, q: f?.q });
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const lines: string[] = ["Colégio Rhulany — Registo de Auditoria"];
    lines.push(["Quando", "Quem", "Acção", "Tipo de alvo", "ID alvo", "Detalhes"].map(esc).join(";"));
    for (const a of rows) {
      lines.push(
        [
          new Date(a.createdAt).toLocaleString("pt-PT"),
          a.actorEmail ?? "",
          a.action,
          a.targetType ?? "",
          a.targetId ?? "",
          a.metadata ? JSON.stringify(a.metadata) : "",
        ].map(esc).join(";"),
      );
    }
    const csv = "﻿" + lines.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="auditoria_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  // ───────────────────────── recibos (admin) ─────────────────────────
  app.get(api.admin.recibosTotals.path, requireAdmin, async (_req, res) => {
    res.json(await storage.adminReceiptTotals());
  });

  app.get(api.admin.recibosList.path, requireAdmin, async (req, res) => {
    const parsed = api.admin.recibosList.input?.safeParse(req.query);
    res.json(await storage.listReceiptsAdmin(parsed?.success ? parsed.data : undefined));
  });

  app.post(api.admin.recibosVoid.path, requireAdmin, async (req, res) => {
    try {
      const { reason } = api.admin.recibosVoid.input.parse(req.body);
      const current = await storage.getReceipt(idOf(req));
      if (!current) return res.status(404).json({ message: "Recibo não encontrado" });
      if (current.deletedAt) {
        return res.status(400).json({ code: "ALREADY_VOID", message: "Este recibo já está anulado." });
      }
      const updated = await storage.voidReceipt(current.id, (req.user as User).id, reason);
      audit(req, "receipt.voided", { targetType: "receipt", targetId: current.id, metadata: { reason, receiptNumber: current.receiptNumber } });
      res.json(updated);
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });

  // CSV export (agrupado por turma, com sub-totais). Sem dependências externas.
  app.get("/api/admin/recibos/export", requireAdmin, async (_req, res) => {
    const rows = await storage.listReceiptsAdmin({ includeVoided: true });
    const esc = (s: any) => `"${String(s ?? "").replace(/"/g, '""')}"`;
    const byClass = new Map<string, typeof rows>();
    for (const r of rows) {
      const k = r.studentClass || "—";
      if (!byClass.has(k)) byClass.set(k, []);
      byClass.get(k)!.push(r);
    }
    const lines: string[] = ["Colégio Rhulany — Recibos"];
    lines.push(["Nº", "Data", "Aluno", "Turma", "Encarregado", "Descrição", "Método", "Valor", "Estado"].map(esc).join(";"));
    let grand = 0;
    for (const [cls, list] of Array.from(byClass.entries()).sort((a, b) => a[0].localeCompare(b[0]))) {
      let sub = 0;
      for (const r of list.sort((a, b) => a.studentName.localeCompare(b.studentName))) {
        const live = !r.deletedAt;
        if (live) sub += Number(r.amountPaid) || 0;
        lines.push(
          [
            `RH-${String(r.receiptNumber).padStart(4, "0")}`,
            fmtDate(r.issueDate),
            r.studentName,
            r.studentClass,
            r.guardianName ?? "",
            r.paymentDescription,
            r.paymentMethod,
            money(r.amountPaid),
            live ? "Válido" : "ANULADO",
          ].map(esc).join(";"),
        );
      }
      grand += sub;
      lines.push([``, ``, ``, ``, ``, ``, `Subtotal ${cls}`, money(sub), ``].map(esc).join(";"));
    }
    lines.push(["", "", "", "", "", "", "TOTAL", money(grand), ""].map(esc).join(";"));
    const csv = "﻿" + lines.join("\r\n");
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="recibos_${new Date().toISOString().slice(0, 10)}.csv"`);
    res.send(csv);
  });

  // ───────────────────────────── statements ─────────────────────────────
  app.post(api.admin.statementMonthly.path, requireAdmin, async (req, res) => {
    try {
      const { month } = api.admin.statementMonthly.input.parse(req.body);
      const report = await storage.monthPaymentsReport(month);
      const pdf = await buildMonthPaymentsPdf(month, report);
      const actor = req.user as User;
      await storage.saveStatement({ kind: "monthly", label: `Pagamentos do mês — ${monthFull(month)}`, refKey: month, filename: pdf.filename, pdfBase64: pdf.pdfBase64, userId: actor.id, email: actor.email });
      audit(req, "statement.monthly", { metadata: { month } });
      res.json(pdf);
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });

  app.post(api.admin.statementAnnual.path, requireAdmin, async (req, res) => {
    try {
      const { year } = api.admin.statementAnnual.input.parse(req.body);
      const list = await storage.receiptsForYear(year);
      const pdf = await buildAnnualStatementPdf(year, list);
      const actor = req.user as User;
      await storage.saveStatement({ kind: "annual", label: `Extrato anual ${year}`, refKey: year, filename: pdf.filename, pdfBase64: pdf.pdfBase64, userId: actor.id, email: actor.email });
      audit(req, "statement.annual", { metadata: { year } });
      res.json(pdf);
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });

  app.post(api.admin.statementStudent.path, requireAdmin, async (req, res) => {
    try {
      const { studentId, year } = api.admin.statementStudent.input.parse(req.body);
      const student = await storage.getStudent(studentId);
      if (!student) return res.status(404).json({ message: "Aluno não encontrado" });
      const cls = await storage.getClass(student.classId);
      const guardians = await storage.listGuardiansByStudent(studentId);
      const primary = guardians.find((g) => g.isPrimary) ?? guardians[0];
      const fee = student.monthlyFeeOverride ?? cls?.monthlyFee ?? "0";
      const list = await storage.receiptsForStudentYear(studentId, year);
      const pdf = await buildStudentStatementPdf(student, cls?.name ?? "—", primary?.fullName ?? "—", fee, year, list);
      const actor = req.user as User;
      await storage.saveStatement({ kind: "student", label: `Extrato — ${student.fullName} (${year})`, refKey: `student:${studentId}:${year}`, filename: pdf.filename, pdfBase64: pdf.pdfBase64, userId: actor.id, email: actor.email });
      audit(req, "statement.student", { targetType: "student", targetId: studentId, metadata: { year } });
      res.json(pdf);
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });

  // ── histórico de extratos gerados ──
  app.get(api.admin.statementsList.path, requireAdmin, async (req, res) => {
    const parsed = api.admin.statementsList.input?.safeParse(req.query);
    const includeDeleted = parsed?.success ? !!parsed.data?.includeDeleted : false;
    const rows = await storage.listStatements(includeDeleted);
    res.json(
      rows.map((r) => ({
        ...r,
        createdAt: new Date(r.createdAt).toISOString(),
        deletedAt: r.deletedAt ? new Date(r.deletedAt).toISOString() : null,
      })),
    );
  });

  app.get(api.admin.statementFile.path, requireAdmin, async (req, res) => {
    const pdf = await storage.getStatementPdf(idOf(req));
    if (!pdf) return res.status(404).json({ message: "Extrato não encontrado" });
    res.json(pdf);
  });

  app.post(api.admin.statementDelete.path, requireAdmin, async (req, res) => {
    try {
      const { reason } = api.admin.statementDelete.input.parse(req.body);
      const ok = await storage.deleteStatement(idOf(req), (req.user as User).id, reason);
      if (!ok) return res.status(404).json({ message: "Extrato não encontrado ou já eliminado" });
      audit(req, "statement.deleted", { targetType: "statement", targetId: idOf(req), metadata: { reason } });
      res.json({ ok: true });
    } catch (err) {
      if (err instanceof z.ZodError) return sendValidationError(res, err);
      throw err;
    }
  });
}
