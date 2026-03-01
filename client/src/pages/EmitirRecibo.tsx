import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import ReceiptPreview, { ReceiptPreviewModel } from "@/components/ReceiptPreview";
import PdfActions from "@/components/PdfActions";
import { useSettings } from "@/hooks/use-settings";
import { useCreateReceipt } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2, Loader2, Save, RotateCcw,
  User, Users, Hash,
  GraduationCap, Shirt, BookOpen, ClipboardList, Wrench, FileText,
  Banknote, CreditCard, Smartphone, ArrowLeftRight,
  ChevronRight, ChevronLeft, Receipt,
} from "lucide-react";
import type { CreateReceiptRequest, Receipt as ReceiptType } from "@shared/schema";
import { api } from "@shared/routes";
import { cn } from "@/lib/utils";

/* ══════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════ */
const RECEIPT_TYPES = [
  { id: "Propina",    label: "Propina",    desc: "Mensalidade",   icon: GraduationCap, color: "#2563eb", bg: "#eff6ff", border: "#bfdbfe" },
  { id: "Matrícula",  label: "Matrícula",  desc: "Inscrição",     icon: ClipboardList, color: "#059669", bg: "#f0fdf4", border: "#a7f3d0" },
  { id: "Uniforme",   label: "Uniforme",   desc: "Farda",         icon: Shirt,         color: "#d97706", bg: "#fffbeb", border: "#fde68a" },
  { id: "Material",   label: "Material",   desc: "Didático",      icon: BookOpen,      color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" },
  { id: "Exame",      label: "Exame",      desc: "Taxa de exame", icon: FileText,      color: "#0891b2", bg: "#ecfeff", border: "#a5f3fc" },
  { id: "Outro",      label: "Outro",      desc: "Outro",         icon: Wrench,        color: "#475569", bg: "#f8fafc", border: "#cbd5e1" },
] as const;

const PAYMENT_METHODS = [
  { id: "Dinheiro",      label: "Dinheiro",     icon: Banknote },
  { id: "M-Pesa",        label: "M-Pesa",       icon: Smartphone },
  { id: "e-Mola",        label: "e-Mola",       icon: Smartphone },
  { id: "Transferência", label: "Transferência",icon: ArrowLeftRight },
  { id: "Cartão",        label: "Cartão",       icon: CreditCard },
] as const;

const CLASS_OPTIONS = ["1ª","2ª","3ª","4ª","5ª","6ª","7ª","8ª","9ª","10ª","11ª","12ª"] as const;

/* ══════════════════════════════════════════
   UTILITIES
══════════════════════════════════════════ */
function defaultDraft(secretaryName = ""): CreateReceiptRequest {
  return {
    secretaryName, studentName: "", studentClass: "1ª",
    studentNumber: "", guardianName: "",
    paymentDescription: "Propina", paymentMethod: "Dinheiro",
    amountPaid: 0 as any, amountInWords: "",
  };
}

function fmt(v: any) {
  const n = Number(v);
  if (!Number.isFinite(n) || n === 0) return "";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ─── extenso PT ─── */
const _u = ["","um","dois","três","quatro","cinco","seis","sete","oito","nove","dez","onze","doze","treze","catorze","quinze","dezasseis","dezassete","dezoito","dezanove"];
const _d = ["","","vinte","trinta","quarenta","cinquenta","sessenta","setenta","oitenta","noventa"];
const _c = ["","cem","duzentos","trezentos","quatrocentos","quinhentos","seiscentos","setecentos","oitocentos","novecentos"];
function _e(n: number): string {
  if (n===0) return "zero";
  if (n<0)   return "menos "+_e(-n);
  if (n===100) return "cem";
  if (n<20)  return _u[n];
  if (n<100) { const d=Math.floor(n/10),u=n%10; return _d[d]+(u?" e "+_u[u]:""); }
  if (n<1000){ const c=Math.floor(n/100),r=n%100; return _c[c]+(r?" e "+_e(r):""); }
  if (n<1_000_000){ const m=Math.floor(n/1000),r=n%1000; return (m===1?"mil":_e(m)+" mil")+(r?(r<100?" e ":" ")+_e(r):""); }
  if (n<1_000_000_000){ const m=Math.floor(n/1_000_000),r=n%1_000_000; return (m===1?"um milhão":_e(m)+" milhões")+(r?(r<100?" e ":" ")+_e(r):""); }
  return n.toString();
}
function valorExtenso(valor: number): string {
  if (!Number.isFinite(valor)||valor<=0) return "";
  const i=Math.floor(valor), c=Math.round((valor-i)*100);
  const t=_e(i); const txt=t.charAt(0).toUpperCase()+t.slice(1);
  const s=i===1?"metical":"meticais";
  return c===0?`${txt} ${s}`:`${txt} ${s} e ${_e(c)} ${c===1?"centavo":"centavos"}`;
}

/* ══════════════════════════════════════════
   STEP INDICATOR
══════════════════════════════════════════ */
function StepBar({ step }: { step: number }) {
  const labels = ["Tipo", "Aluno", "Pagamento"];
  return (
    <div className="flex items-center gap-0 select-none">
      {labels.map((label, i) => {
        const done    = i < step;
        const current = i === step;
        return (
          <div key={label} className="flex items-center">
            <div className="flex items-center gap-2">
              <div className={cn(
                "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300",
                done    ? "bg-slate-800 border-slate-800 text-white" :
                current ? "bg-white border-slate-800 text-slate-800 shadow-md" :
                          "bg-white border-slate-200 text-slate-400"
              )}>
                {done ? <CheckCircle2 className="h-4 w-4" /> : <span>{i+1}</span>}
              </div>
              <span className={cn(
                "text-xs font-semibold hidden sm:block",
                current ? "text-slate-800 dark:text-slate-100" : "text-slate-400"
              )}>{label}</span>
            </div>
            {i < labels.length-1 && (
              <div className={cn(
                "w-10 sm:w-16 h-px mx-3 transition-all duration-500",
                done ? "bg-slate-800" : "bg-slate-200"
              )} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function EmitirRecibo() {
  const { toast } = useToast();
  const settings  = useSettings();
  const create    = useCreateReceipt();

  const [step, setStep]       = useState(0);
  const [draft, setDraft]     = useState<CreateReceiptRequest>(() => defaultDraft(""));
  const [created, setCreated] = useState<ReceiptType | null>(null);

  useEffect(() => {
    if (settings.data?.secretaryName)
      setDraft(d => ({ ...d, secretaryName: d.secretaryName || settings.data.secretaryName }));
  }, [settings.data?.secretaryName]);

  const selectedType = RECEIPT_TYPES.find(t => t.id === draft.paymentDescription) ?? RECEIPT_TYPES[0];

  const preview: ReceiptPreviewModel = useMemo(() => {
    const secretaryName = draft.secretaryName || settings.data?.secretaryName || "—";
    const n = Number((draft as any).amountPaid);
    return {
      ...(created ?? (draft as any)),
      secretaryName,
      receiptNumber: created?.receiptNumber ?? undefined,
      issueDate:     created?.issueDate ?? (new Date().toISOString().slice(0,10) as any),
      amountPaid:    Number.isFinite(n) ? n : undefined,
      amountInWords: created?.amountInWords ?? (draft.amountInWords?.trim() || "—"),
    };
  }, [created, draft, settings.data?.secretaryName]);

  const canSave = draft.studentName.trim().length >= 2 && Number((draft as any).amountPaid) > 0;

  const handleSave = async () => {
    try {
      const validated = api.receipts.create.input.parse({ ...draft, amountPaid: Number((draft as any).amountPaid) });
      const result    = await create.mutateAsync(validated);
      setCreated(result as any);
      toast({ title: "Recibo emitido", description: `Nº ${result.receiptNumber} criado com sucesso.` });
    } catch (e: any) {
      toast({ title: "Erro ao emitir", description: e?.message ?? "Verifique os campos.", variant: "destructive" });
    }
  };

  const handleReset = () => {
    setCreated(null); setStep(0);
    setDraft(defaultDraft(settings.data?.secretaryName));
  };

  /* shared input style */
  const inp = "w-full h-10 px-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-sm text-slate-800 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-slate-500 dark:focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700 transition-all";

  return (
    <AppShell>
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── header ── */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-2 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
           <div className="h-10 w-10 rounded-xl overflow-hidden flex-shrink-0">
              <img src="/colegio.png" alt="Logo" className="h-full w-full object-contain" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-white leading-none">Emitir Recibo</h1>
              <p className="text-xs text-slate-400 mt-0.5">Preencha os dados e gere o recibo em PDF</p>
            </div>
          </div>
          <StepBar step={step} />
        </div>

        {/* ── body grid ── */}
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-6 items-start">

          {/* ════ FORM PANEL ════ */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">

            {/* ── STEP 0: Tipo ── */}
            {step === 0 && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Passo 1 de 3</p>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">Tipo de recibo</h2>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {RECEIPT_TYPES.map(type => {
                      const active  = draft.paymentDescription === type.id;
                      return (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, paymentDescription: type.id as any }))}
                          className={cn(
                            "relative text-left p-4 rounded-xl border-2 transition-all duration-150",
                            active
                              ? "border-slate-800 bg-slate-50 dark:bg-slate-800 dark:border-slate-500"
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600 bg-white dark:bg-slate-900"
                          )}
                        >
                          <div className="flex items-start justify-between mb-2">
                            <p className={cn("text-sm font-bold", active ? "text-slate-800 dark:text-white" : "text-slate-700 dark:text-slate-300")}>{type.label}</p>
                            {active && <CheckCircle2 className="h-4 w-4 text-slate-800 dark:text-slate-300 flex-shrink-0" />}
                          </div>
                          <p className="text-xs text-slate-400">{type.desc}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="px-6 pb-6 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-700 dark:hover:bg-slate-600 transition-colors"
                  >
                    Continuar <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 1: Aluno ── */}
            {step === 1 && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Passo 2 de 3</p>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">Dados do aluno</h2>
                  </div>

                </div>

                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">

                  {/* Nome */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nome do aluno <span className="text-red-400">*</span></label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input value={draft.studentName}
                             onChange={e => setDraft(d => ({ ...d, studentName: e.target.value }))}
                             placeholder="Ex: Ana Lúcia Matavele"
                             className={cn(inp, "pl-8")}
                             data-testid="input-studentName" />
                    </div>
                  </div>

                  {/* Classe */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Classe <span className="text-red-400">*</span></label>
                    <Select value={draft.studentClass} onValueChange={v => setDraft(d => ({ ...d, studentClass: v as any }))}>
                      <SelectTrigger className={inp} data-testid="input-studentClass">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CLASS_OPTIONS.map(c => <SelectItem key={c} value={c}>{c} Classe</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Número */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Nº do aluno <span className="text-slate-300">(opcional)</span></label>
                    <div className="relative">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input value={draft.studentNumber ?? ""}
                             onChange={e => setDraft(d => ({ ...d, studentNumber: e.target.value }))}
                             placeholder="2025-013"
                             className={cn(inp, "pl-8")}
                             data-testid="input-studentNumber" />
                    </div>
                  </div>

                  {/* Encarregado */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Encarregado <span className="text-slate-300">(opcional)</span></label>
                    <div className="relative">
                      <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input value={draft.guardianName ?? ""}
                             onChange={e => setDraft(d => ({ ...d, guardianName: e.target.value }))}
                             placeholder="Ex: Sr. Paulo Matavele"
                             className={cn(inp, "pl-8")}
                             data-testid="input-guardianName" />
                    </div>
                  </div>

                  {/* Secretária */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Chefe da Secretaria</label>
                    <Input value={draft.secretaryName}
                           onChange={e => setDraft(d => ({ ...d, secretaryName: e.target.value }))}
                           placeholder={settings.data?.secretaryName ?? "Ex: Maria José"}
                           className={inp}
                           data-testid="input-secretaryName" />
                    <p className="text-xs text-slate-400">Nome padrão configurável nas Definições.</p>
                  </div>
                </div>

                <div className="px-6 pb-6 flex items-center justify-between">
                  <button type="button" onClick={() => setStep(0)}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="h-4 w-4" /> Anterior
                  </button>
                  <button type="button" onClick={() => setStep(2)}
                          disabled={draft.studentName.trim().length < 2}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 dark:bg-slate-700 text-white text-sm font-semibold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                    Continuar <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </>
            )}

            {/* ── STEP 2: Pagamento ── */}
            {step === 2 && (
              <>
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Passo 3 de 3</p>
                    <h2 className="text-base font-bold text-slate-800 dark:text-white mt-0.5">Pagamento</h2>
                  </div>
                  <button type="button" onClick={() => setStep(1)}
                          className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors flex items-center gap-1">
                    <ChevronLeft className="h-3.5 w-3.5" /> Voltar
                  </button>
                </div>

                <div className="p-6 space-y-6">

                  {/* Método */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Forma de pagamento</label>
                    <div className="flex flex-wrap gap-2">
                      {PAYMENT_METHODS.map(m => {
                        const active = draft.paymentMethod === m.id;
                        return (
                          <button key={m.id} type="button"
                                  onClick={() => setDraft(d => ({ ...d, paymentMethod: m.id as any }))}
                                  className={cn(
                                    "px-3 py-2 rounded-lg border text-xs font-semibold transition-all",
                                    active
                                      ? "border-slate-800 bg-slate-800 text-white dark:border-slate-500 dark:bg-slate-700"
                                      : "border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                                  )}>{m.label}</button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Valor */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      Valor pago (MT) <span className="text-red-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">MT</span>
                      <Input
                        type="number" inputMode="decimal"
                        value={String((draft as any).amountPaid ?? "")}
                        onChange={e => {
                          const v = e.target.value;
                          setDraft(d => ({ ...d, amountPaid: v as any, amountInWords: valorExtenso(Number(v)) }));
                        }}
                        placeholder="0.00"
                        className={cn(inp, "pl-9 text-base font-bold")}
                        data-testid="input-amountPaid"
                      />
                    </div>
                    {Number((draft as any).amountPaid) > 0 && (
                      <p className="text-xs text-slate-400 tabular-nums">
                        {fmt((draft as any).amountPaid)} MT
                      </p>
                    )}
                  </div>

                  {/* Extenso */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-500 dark:text-slate-400">Valor por extenso</label>
                      {draft.amountInWords && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-semibold">
                          <CheckCircle2 className="h-3 w-3" /> Gerado automaticamente
                        </span>
                      )}
                    </div>
                    <Textarea
                      value={draft.amountInWords ?? ""}
                      onChange={e => setDraft(d => ({ ...d, amountInWords: e.target.value }))}
                      placeholder="Introduza o valor acima para preencher automaticamente…"
                      rows={2}
                      className={cn(
                        "w-full px-3 py-2 rounded-lg border text-sm resize-none transition-all focus:outline-none focus:ring-2 focus:ring-slate-200 dark:focus:ring-slate-700",
                        draft.amountInWords
                          ? "border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-800 dark:text-emerald-300"
                          : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500"
                      )}
                      data-testid="input-amountInWords"
                    />
                  </div>
                </div>

                {/* success banner */}
                {created && (
                  <div className="mx-6 mb-4 flex items-center gap-3 px-4 py-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />
                    <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400">
                      Recibo Nº {created.receiptNumber} emitido com sucesso
                    </p>
                  </div>
                )}

                {/* actions */}
                <div className="px-6 pb-6 flex flex-col sm:flex-row gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                  <button type="button" onClick={handleReset}
                          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" /> Novo
                  </button>

                  <PdfActions receiptIds={created ? [created.id] : []}
                               onPrint={() => window.print()}
                               testIdPrefix="emitir-actions" variant="outline" />

                  {/* save button */}
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!canSave || create.isPending}
                    className="cssbuttons-save ml-auto"
                    data-testid="emitir-salvar"
                  >
                    {create.isPending
                      ? <><Loader2 className="h-4 w-4 animate-spin" /> A guardar…</>
                      : <><Save className="h-4 w-4" /> Salvar recibo</>
                    }
                    <div className="icon-save">
                      <svg height={18} width={18} viewBox="0 0 24 24">
                        <path d="M0 0h24v24H0z" fill="none"/>
                        <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor"/>
                      </svg>
                    </div>
                  </button>
                </div>
              </>
            )}
          </div>

          {/* ════ SIDEBAR ════ */}
          <div className="space-y-4 xl:sticky xl:top-20">

            {/* summary card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resumo</p>
              </div>
              <div className="px-4 py-3 space-y-2.5">
                {([
                  ["Tipo",    draft.paymentDescription],
                  ["Aluno",   draft.studentName || "—"],
                  ["Classe",  draft.studentClass ? `${draft.studentClass} Classe` : "—"],
                  ["Método",  draft.paymentMethod],
                  ["Valor",   Number((draft as any).amountPaid) > 0 ? `${fmt((draft as any).amountPaid)} MT` : "—"],
                ] as [string,string][]).map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-4">
                    <span className="text-xs text-slate-400 flex-shrink-0">{k}</span>
                    <span className={cn(
                      "text-xs font-semibold truncate text-right",
                      v === "—" ? "text-slate-300 dark:text-slate-600" : "text-slate-700 dark:text-slate-200"
                    )}>{v}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* receipt preview — scaled to fit sidebar, only ORIGINAL copy */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Pré-visualização</p>
                <p className="text-xs text-slate-400">Rascunho</p>
              </div>
              <div className="overflow-hidden bg-slate-50 dark:bg-slate-950 p-3" style={{ maxHeight: "520px" }}>
                <div style={{
                  transform: "scale(0.55)",
                  transformOrigin: "top left",
                  width: "182%",
                  pointerEvents: "none",
                }}>
                  <ReceiptPreview receipt={preview} testIdPrefix="emitir-preview" mode="single" />
                </div>
              </div>
            </div>
            <ReceiptPreview receipt={preview} mode="print" testIdPrefix="emitir-preview" />
          </div>
        </div>
      </div>

      <style>{`
        .cssbuttons-save {
          background: #1e293b;
          color: white;
          font-family: inherit;
          padding: 0.4em 3.2em 0.4em 1.2em;
          font-size: 13px;
          font-weight: 600;
          border-radius: 0.75em;
          border: none;
          display: inline-flex;
          align-items: center;
          gap: 0.5em;
          overflow: hidden;
          position: relative;
          height: 2.75em;
          cursor: pointer;
          transition: background .2s, transform .15s, opacity .2s;
          box-shadow: 0 1px 3px rgba(0,0,0,.15), 0 4px 16px -4px rgba(30,41,59,.4);
        }
        .cssbuttons-save:hover { background: #334155; transform: translateY(-1px); }
        .cssbuttons-save:active { transform: translateY(0); }
        .cssbuttons-save:disabled { opacity: .4; cursor: not-allowed; transform: none; }
        .icon-save {
          background: rgba(255,255,255,.12);
          position: absolute;
          display: flex; align-items: center; justify-content: center;
          height: 2em; width: 2em;
          border-radius: 0.55em;
          right: 0.35em;
          transition: all .25s;
        }
        .cssbuttons-save:hover .icon-save { width: calc(100% - 0.7em); }
        .icon-save svg { width: 1em; transition: transform .25s; }
        .cssbuttons-save:hover .icon-save svg { transform: translateX(0.1em); }
      `}</style>
    </AppShell>
  );
}