import { useEffect, useMemo, useState } from "react";
import { Link, useSearch } from "wouter";
import AppShell from "@/components/layout/AppShell";
import ReceiptPreview, { ReceiptPreviewModel } from "@/components/ReceiptPreview";
import PdfActions from "@/components/PdfActions";
import { useSettings } from "@/hooks/use-settings";
import { useCreateReceipt } from "@/hooks/use-receipts";
import { useStudents, useClasses, useGuardians, useStudent } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { CreateReceiptRequest, Receipt as ReceiptType } from "@shared/schema";
import { api } from "@shared/routes";
import { cn } from "@/lib/utils";
import { NAVY, MUTED, LINE } from "@/lib/theme";

const TYPES = [
  { id: "mensalidade", label: "Mensalidade" },
  { id: "matricula", label: "Matrícula" },
  { id: "uniforme", label: "Uniforme" },
  { id: "material", label: "Material" },
  { id: "exame", label: "Exame" },
  { id: "outro", label: "Outro" },
] as const;
type TypeId = (typeof TYPES)[number]["id"];
const METHODS = ["Dinheiro", "M-Pesa", "e-Mola", "Transferência", "Depósito", "Cartão"] as const;

const MONTHS_PT = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
const monthLabel = (ym: string) => {
  const [y, m] = ym.split("-");
  const i = Number(m) - 1;
  return i >= 0 && i < 12 ? `${MONTHS_PT[i]} ${y}` : ym;
};
const classShort = (name?: string) => (name ? name.split(" ")[0] : "—");
const fmt = (v: any) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "";
};

const _u = ["", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "catorze", "quinze", "dezasseis", "dezassete", "dezoito", "dezanove"];
const _d = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const _c = ["", "cem", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function _e(n: number): string {
  if (n === 0) return "zero";
  if (n === 100) return "cem";
  if (n < 20) return _u[n];
  if (n < 100) { const d = Math.floor(n / 10), u = n % 10; return _d[d] + (u ? " e " + _u[u] : ""); }
  if (n < 1000) { const c = Math.floor(n / 100), r = n % 100; return _c[c] + (r ? " e " + _e(r) : ""); }
  if (n < 1_000_000) { const m = Math.floor(n / 1000), r = n % 1000; return (m === 1 ? "mil" : _e(m) + " mil") + (r ? (r < 100 ? " e " : " ") + _e(r) : ""); }
  return n.toString();
}
function valorExtenso(valor: number): string {
  if (!Number.isFinite(valor) || valor <= 0) return "";
  const i = Math.floor(valor), c = Math.round((valor - i) * 100);
  const t = _e(i); const txt = t.charAt(0).toUpperCase() + t.slice(1);
  const s = i === 1 ? "metical" : "meticais";
  return c === 0 ? `${txt} ${s}` : `${txt} ${s} e ${_e(c)} ${c === 1 ? "centavo" : "centavos"}`;
}

export default function EmitirRecibo() {
  const { toast } = useToast();
  const settings = useSettings();
  const create = useCreateReceipt();
  const { data: classes } = useClasses();
  const search = useSearch();

  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const { data: students } = useStudents(classId ? { classId: Number(classId), active: true } : undefined);
  const selected = useMemo(() => (students ?? []).find((s) => String(s.id) === studentId) ?? null, [students, studentId]);
  const { data: guardians } = useGuardians(selected?.id);

  const [type, setType] = useState<TypeId>("mensalidade");
  const [month, setMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [method, setMethod] = useState<string>("Dinheiro");
  const [amount, setAmount] = useState("");
  const [touchedAmount, setTouchedAmount] = useState(false);
  const [created, setCreated] = useState<ReceiptType | null>(null);

  // pré-seleção via ?student=<id> (vindo do registo de aluno)
  const studentParam = new URLSearchParams(search).get("student");
  const { data: preStudent } = useStudent(studentParam ? Number(studentParam) : undefined);
  useEffect(() => {
    if (preStudent) { setClassId(String(preStudent.classId)); setStudentId(String(preStudent.id)); setTouchedAmount(false); }
  }, [preStudent?.id]);

  const cls = useMemo(() => (classes ?? []).find((c) => c.id === selected?.classId), [classes, selected]);
  const fee = selected ? Number(selected.monthlyFeeOverride ?? cls?.monthlyFee ?? 0) : 0;
  const primaryGuardian = useMemo(() => (guardians ?? []).find((g) => g.isPrimary) ?? (guardians ?? [])[0], [guardians]);

  useEffect(() => {
    if (selected && !touchedAmount) setAmount(fee > 0 ? String(fee) : "");
  }, [selected, fee, touchedAmount]);

  const onClassChange = (cid: string) => { setClassId(cid); setStudentId(""); setCreated(null); };
  const selectStudent = (sid: string) => { setStudentId(sid); setTouchedAmount(false); setCreated(null); };

  const paymentDescription = type === "mensalidade" ? `Mensalidade — ${monthLabel(month)}` : TYPES.find((t) => t.id === type)!.label;
  const secretaryName = settings.data?.secretaryName || "—";

  const preview: ReceiptPreviewModel = useMemo(() => {
    const n = Number(amount);
    return {
      ...(created ?? {}),
      secretaryName,
      studentName: selected?.fullName ?? created?.studentName ?? "",
      studentClass: (created?.studentClass ?? classShort(cls?.name)) as any,
      studentNumber: created?.studentNumber ?? selected?.internalNumber ?? "",
      guardianName: created?.guardianName ?? primaryGuardian?.fullName ?? "",
      paymentDescription: created?.paymentDescription ?? paymentDescription,
      paymentMethod: created?.paymentMethod ?? method,
      receiptNumber: created?.receiptNumber ?? undefined,
      issueDate: (created?.issueDate ?? new Date().toISOString().slice(0, 10)) as any,
      amountPaid: (created ? Number(created.amountPaid) : Number.isFinite(n) ? n : undefined) as any,
      amountInWords: created?.amountInWords ?? (valorExtenso(n) || "—"),
    };
  }, [created, selected, cls, primaryGuardian, paymentDescription, method, amount, secretaryName]);

  const canSave = !!selected && Number(amount) > 0 && !!settings.data?.secretaryName;

  const handleSave = async () => {
    if (!selected) return;
    const payload: CreateReceiptRequest = {
      secretaryName,
      studentId: selected.id as any,
      receiptType: type as any,
      referenceMonth: (type === "mensalidade" ? month : null) as any,
      studentName: selected.fullName,
      studentClass: classShort(cls?.name) as any,
      studentNumber: selected.internalNumber ?? null,
      guardianName: primaryGuardian?.fullName ?? null,
      paymentDescription,
      paymentMethod: method,
      amountPaid: Number(amount) as any,
      amountInWords: valorExtenso(Number(amount)),
    };
    try {
      const validated = api.receipts.create.input.parse(payload);
      const result = await create.mutateAsync(validated);
      setCreated(result as any);
      toast({ title: "Recibo emitido", description: `Nº ${result.receiptNumber} criado com sucesso.` });
    } catch (e: any) {
      toast({ title: "Erro ao emitir", description: e?.message ?? "Verifique os campos.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setClassId(""); setStudentId(""); setAmount(""); setTouchedAmount(false);
    setType("mensalidade"); setMonth(new Date().toISOString().slice(0, 7)); setMethod("Dinheiro"); setCreated(null);
  };

  const noSecretary = settings.data && !settings.data.secretaryName;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto space-y-5">
        {/* cabeçalho sóbrio */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>Emitir recibo</h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Escolha a turma e o aluno — os dados preenchem-se automaticamente.</p>
          </div>
          <Link href="/alunos/novo" className="text-[13px] font-semibold flex-shrink-0" style={{ color: NAVY }} data-testid="emitir-novo-aluno">
            Registar novo aluno
          </Link>
        </div>

        {noSecretary && (
          <div className="rounded-lg border px-4 py-3 text-[13px]" style={{ borderColor: "#fde68a", background: "#fffbeb", color: "#92400e" }}>
            Defina o nome da <b>Chefe da Secretaria</b> em <b>Definições</b> antes de emitir recibos.
          </div>
        )}

        <div className="grid grid-cols-1 xl:grid-cols-[1fr_372px] gap-5 items-start">
          {/* ── formulário ── */}
          <div className="bg-white rounded-2xl border" style={{ borderColor: LINE }}>
            {/* aluno */}
            <div className="p-6">
              <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Aluno</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]" style={{ color: MUTED }}>Turma</Label>
                  <Select value={classId} onValueChange={onClassChange}>
                    <SelectTrigger data-testid="emitir-turma"><SelectValue placeholder="Escolher turma" /></SelectTrigger>
                    <SelectContent>
                      {(classes ?? []).filter((c) => c.active).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]" style={{ color: MUTED }}>Aluno</Label>
                  <Select value={studentId} onValueChange={selectStudent} disabled={!classId}>
                    <SelectTrigger data-testid="emitir-aluno"><SelectValue placeholder={classId ? "Escolher aluno" : "Escolha a turma primeiro"} /></SelectTrigger>
                    <SelectContent>
                      {(students ?? []).length === 0 ? (
                        <div className="px-3 py-2 text-[12px]" style={{ color: MUTED }}>Sem alunos nesta turma</div>
                      ) : (
                        (students ?? []).map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.fullName}</SelectItem>)
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selected && (
                <div className="mt-4 grid grid-cols-3 gap-px rounded-lg overflow-hidden border" style={{ borderColor: LINE, background: LINE }}>
                  {[
                    ["Encarregado", primaryGuardian?.fullName ?? "—"],
                    ["Nº interno", selected.internalNumber ?? "—"],
                    ["Mensalidade", fee > 0 ? `${fmt(fee)} MT` : "—"],
                  ].map(([k, v]) => (
                    <div key={k} className="bg-white px-4 py-2.5">
                      <p className="text-[10px] uppercase tracking-wide" style={{ color: MUTED }}>{k}</p>
                      <p className="text-[13px] font-semibold truncate" style={{ color: NAVY }}>{v}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="h-px" style={{ background: LINE }} />

            {/* detalhes */}
            <div className={cn("p-6 transition-opacity", !selected && "opacity-50 pointer-events-none")}>
              <p className="text-[11px] font-bold uppercase tracking-wide mb-3" style={{ color: MUTED }}>Detalhes do recibo</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-[12px]" style={{ color: MUTED }}>Tipo</Label>
                  <Select value={type} onValueChange={(v) => setType(v as TypeId)}>
                    <SelectTrigger data-testid="emitir-tipo"><SelectValue /></SelectTrigger>
                    <SelectContent>{TYPES.map((t) => <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-[12px]" style={{ color: MUTED }}>Forma de pagamento</Label>
                  <Select value={method} onValueChange={setMethod}>
                    <SelectTrigger data-testid="emitir-metodo"><SelectValue /></SelectTrigger>
                    <SelectContent>{METHODS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {type === "mensalidade" && (
                  <div className="space-y-1.5">
                    <Label className="text-[12px]" style={{ color: MUTED }}>Mês de referência</Label>
                    <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="emitir-mes" />
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-[12px]" style={{ color: MUTED }}>Valor (MT)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => { setAmount(e.target.value); setTouchedAmount(true); }}
                    placeholder="0,00"
                    className="font-bold text-[15px]"
                    data-testid="emitir-valor"
                  />
                  {Number(amount) > 0 && valorExtenso(Number(amount)) && (
                    <p className="text-[11px]" style={{ color: MUTED }}>{valorExtenso(Number(amount))}</p>
                  )}
                </div>
              </div>
            </div>

            {created && (
              <div className="mx-6 mb-2 rounded-lg border px-4 py-2.5 text-[13px] font-semibold" style={{ borderColor: "#bbf7d0", background: "#f0fdf4", color: "#047857" }}>
                Recibo Nº {created.receiptNumber} emitido com sucesso.
              </div>
            )}

            <div className="h-px" style={{ background: LINE }} />
            <div className="p-4 flex flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={handleReset} data-testid="emitir-novo">Limpar</Button>
              <PdfActions receiptIds={created ? [created.id] : []} testIdPrefix="emitir-actions" variant="outline" />
              <Button onClick={handleSave} disabled={!canSave || create.isPending} className="sm:ml-auto text-white px-6" style={{ background: NAVY }} data-testid="emitir-salvar">
                {create.isPending ? "A emitir…" : created ? "Emitir outro" : "Emitir recibo"}
              </Button>
            </div>
          </div>

          {/* ── pré-visualização ── */}
          <div className="space-y-4 xl:sticky xl:top-24">
            <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: LINE }}>
              <div className="px-4 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "#f1f5f9" }}>
                <p className="text-[11px] font-bold uppercase tracking-widest" style={{ color: MUTED }}>Pré-visualização</p>
                <p className="text-[11px]" style={{ color: MUTED }}>{created ? `Nº ${created.receiptNumber}` : "Rascunho"}</p>
              </div>
              <div className="overflow-hidden bg-slate-50 p-3" style={{ maxHeight: 520 }}>
                <div style={{ transform: "scale(0.55)", transformOrigin: "top left", width: "182%", pointerEvents: "none" }}>
                  <ReceiptPreview receipt={preview} testIdPrefix="emitir-preview" mode="single" />
                </div>
              </div>
            </div>
            <ReceiptPreview receipt={preview} mode="print" testIdPrefix="emitir-preview" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
