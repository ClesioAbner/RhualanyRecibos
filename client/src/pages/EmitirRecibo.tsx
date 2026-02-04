import { useEffect, useMemo, useState } from "react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import ReceiptPreview, { ReceiptPreviewModel } from "@/components/ReceiptPreview";
import PdfActions from "@/components/PdfActions";
import { useSettings } from "@/hooks/use-settings";
import { useCreateReceipt } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, Loader2, Save, ShieldCheck } from "lucide-react";
import type { CreateReceiptRequest, Receipt } from "@shared/schema";
import { api } from "@shared/routes";

const classOptions = ["1ª", "2ª", "3ª", "4ª", "5ª", "6ª"] as const;
const paymentDescOptions = ["Propina", "Matrícula", "Uniforme", "Material", "Outro"] as const;
const paymentMethodOptions = ["Dinheiro", "M-Pesa", "e-Mola", "Transferência"] as const;

function defaultDraft(secretaryName?: string): CreateReceiptRequest {
  return {
    secretaryName: secretaryName ?? "",
    studentName: "",
    studentClass: "1ª",
    studentNumber: "",
    guardianName: "",
    paymentDescription: "Propina",
    paymentMethod: "Dinheiro",
    amountPaid: 0 as any,
    amountInWords: "",
  };
}

function clampWords(s: string) {
  return s.replace(/\s+/g, " ").trim();
}

export default function EmitirRecibo() {
  const { toast } = useToast();
  const settings = useSettings();
  const create = useCreateReceipt();

  const [draft, setDraft] = useState<CreateReceiptRequest>(() => defaultDraft(""));
  const [created, setCreated] = useState<Receipt | null>(null);

  useEffect(() => {
    if (settings.data?.secretaryName) {
      setDraft((d) => ({ ...d, secretaryName: d.secretaryName || settings.data.secretaryName }));
    }
  }, [settings.data?.secretaryName]);

  const preview: ReceiptPreviewModel = useMemo(() => {
    const secretaryName = draft.secretaryName || settings.data?.secretaryName || "—";
    const amountPaidNum = typeof (draft as any).amountPaid === "number" ? (draft as any).amountPaid : Number((draft as any).amountPaid);
    return {
      ...(created ?? (draft as any)),
      secretaryName,
      receiptNumber: created?.receiptNumber ?? undefined,
      issueDate: created?.issueDate ?? (new Date().toISOString().slice(0, 10) as any),
      amountPaid: Number.isFinite(amountPaidNum) ? amountPaidNum : undefined,
      amountInWords: created?.amountInWords ?? (draft.amountInWords ? clampWords(draft.amountInWords) : "—"),
    };
  }, [created, draft, settings.data?.secretaryName]);

  const canSave = useMemo(() => {
    return (
      draft.studentName.trim().length >= 2 &&
      !!draft.studentClass &&
      draft.paymentDescription.trim().length >= 2 &&
      draft.paymentMethod.trim().length >= 2 &&
      Number((draft as any).amountPaid) > 0
    );
  }, [draft]);

  const pageTitleRight = (
    <div className="flex flex-wrap gap-2">
      <Button
        variant="secondary"
        onClick={() => {
          setCreated(null);
          setDraft(defaultDraft(settings.data?.secretaryName));
          toast({ title: "Novo recibo", description: "Campos limpos para uma nova emissão." });
        }}
        className="rounded-xl"
        data-testid="emitir-novo"
      >
        Limpar
      </Button>

      <Button
        onClick={async () => {
          try {
            const validated = api.receipts.create.input.parse({
              ...draft,
              amountPaid: Number((draft as any).amountPaid),
            });
            const result = await create.mutateAsync(validated);
            setCreated(result as any);
            toast({
              title: "Recibo emitido",
              description: `Recibo Nº ${result.receiptNumber} criado com sucesso.`,
            });
          } catch (e: any) {
            toast({
              title: "Não foi possível emitir",
              description: e?.message ?? "Verifique os campos e tente novamente.",
              variant: "destructive",
            });
          }
        }}
        disabled={!canSave || create.isPending}
        className="rounded-xl px-5"
        data-testid="emitir-salvar"
      >
        {create.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
        {create.isPending ? "A guardar..." : "Salvar recibo"}
      </Button>
    </div>
  );

  return (
    <AppShell>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Emissão"
          title="Emitir Recibo"
          subtitle="Preencha os dados do aluno e do pagamento. Veja a pré-visualização em tempo real e, depois de salvar, gere PDF ou imprima em A4 (2 por página)."
          right={pageTitleRight}
          testId="emitir-header"
        />

        <div className="grid grid-cols-1 lg:grid-cols-[1.05fr_.95fr] gap-6 items-start">
          <Card className="glass rounded-2xl p-5 md:p-6 border border-border/70">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
                  Dados do recibo
                </div>
                <h2 className="mt-1 text-2xl">Formulário</h2>
              </div>
              <div className="hidden md:flex items-center gap-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Sem autenticação — uso interno
              </div>
            </div>

            <Separator className="my-5 bg-border/70" />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label htmlFor="secretaryName">Chefe da Secretaria</Label>
                <Input
                  id="secretaryName"
                  value={draft.secretaryName}
                  onChange={(e) => setDraft((d) => ({ ...d, secretaryName: e.target.value }))}
                  placeholder={settings.data?.secretaryName ?? "Ex: Maria José"}
                  className="rounded-xl"
                  data-testid="input-secretaryName"
                />
                <div className="text-xs text-muted-foreground">
                  Sugestão nas Definições. Pode sobrescrever por recibo.
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentName">Nome do aluno</Label>
                <Input
                  id="studentName"
                  value={draft.studentName}
                  onChange={(e) => setDraft((d) => ({ ...d, studentName: e.target.value }))}
                  placeholder="Ex: Ana Lúcia Matavele"
                  className="rounded-xl"
                  data-testid="input-studentName"
                />
              </div>

              <div className="space-y-2">
                <Label>Classe</Label>
                <Select
                  value={draft.studentClass}
                  onValueChange={(v) => setDraft((d) => ({ ...d, studentClass: v as any }))}
                >
                  <SelectTrigger className="rounded-xl" data-testid="input-studentClass">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {classOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c} Classe
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentNumber">Nº do aluno (opcional)</Label>
                <Input
                  id="studentNumber"
                  value={draft.studentNumber ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, studentNumber: e.target.value }))}
                  placeholder="Ex: 2025-013"
                  className="rounded-xl"
                  data-testid="input-studentNumber"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="guardianName">Encarregado (opcional)</Label>
                <Input
                  id="guardianName"
                  value={draft.guardianName ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, guardianName: e.target.value }))}
                  placeholder="Ex: Sr. Paulo Matavele"
                  className="rounded-xl"
                  data-testid="input-guardianName"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descrição do pagamento</Label>
                <Select
                  value={draft.paymentDescription}
                  onValueChange={(v) => setDraft((d) => ({ ...d, paymentDescription: v as any }))}
                >
                  <SelectTrigger className="rounded-xl" data-testid="input-paymentDescription">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentDescOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {draft.paymentDescription === "Outro" && (
                  <Textarea
                    value={draft.paymentDescription === "Outro" ? "" : ""}
                    placeholder="Se escolheu 'Outro', detalhe aqui no campo abaixo."
                    className="hidden"
                    readOnly
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="amountPaid">Valor pago (MT)</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  inputMode="decimal"
                  value={String((draft as any).amountPaid ?? "")}
                  onChange={(e) => setDraft((d) => ({ ...d, amountPaid: e.target.value as any }))}
                  placeholder="Ex: 1500"
                  className="rounded-xl"
                  data-testid="input-amountPaid"
                />
                <div className="text-xs text-muted-foreground">O servidor calcula “por extenso”.</div>
              </div>

              <div className="space-y-2">
                <Label>Forma de pagamento</Label>
                <Select
                  value={draft.paymentMethod}
                  onValueChange={(v) => setDraft((d) => ({ ...d, paymentMethod: v as any }))}
                >
                  <SelectTrigger className="rounded-xl" data-testid="input-paymentMethod">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethodOptions.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="amountInWords">Valor por extenso (opcional)</Label>
                <Textarea
                  id="amountInWords"
                  value={draft.amountInWords ?? ""}
                  onChange={(e) => setDraft((d) => ({ ...d, amountInWords: e.target.value }))}
                  placeholder="Se quiser, pode preencher manualmente; o servidor vai substituir ao salvar."
                  className="rounded-xl min-h-[90px]"
                  data-testid="input-amountInWords"
                />
              </div>
            </div>

            <Separator className="my-6 bg-border/70" />

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-2 text-sm">
                {created ? (
                  <>
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                    <span className="text-foreground">
                      Emitido: <span className="font-semibold" data-testid="emitir-created-number">Nº {created.receiptNumber}</span>
                    </span>
                  </>
                ) : (
                  <span className="text-muted-foreground">
                    Ainda não guardou — a pré-visualização mostra um rascunho.
                  </span>
                )}
              </div>

              <PdfActions
                receiptIds={created ? [created.id] : []}
                onPrint={() => window.print()}
                testIdPrefix="emitir-actions"
                variant="outline"
              />
            </div>
          </Card>

          <div className="space-y-4">
            <ReceiptPreview receipt={preview} testIdPrefix="emitir-preview" />

            {/* print-only layout */}
            <ReceiptPreview receipt={preview} mode="print" testIdPrefix="emitir-preview" />
          </div>
        </div>
      </div>
    </AppShell>
  );
}
