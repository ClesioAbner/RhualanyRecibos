import { useMemo, useState } from "react";
import { Link, useRoute } from "wouter";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import ReceiptPreview from "@/components/ReceiptPreview";
import PdfActions from "@/components/PdfActions";
import { useDeleteReceipt, useReceipt, useUpdateReceipt } from "@/hooks/use-receipts";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, Save, Trash2 } from "lucide-react";
import type { UpdateReceiptRequest } from "@shared/schema";
import { api } from "@shared/routes";

export default function ReciboDetalhe() {
  const { toast } = useToast();
  const [, params] = useRoute("/recibos/:id");
  const id = Number(params?.id);

  const receipt = useReceipt(id);
  const update = useUpdateReceipt();
  const del = useDeleteReceipt();

  const [edit, setEdit] = useState<UpdateReceiptRequest>({});

  const merged = useMemo(() => {
    return { ...(receipt.data ?? ({} as any)), ...(edit as any) };
  }, [receipt.data, edit]);

  const canSave = useMemo(() => {
    if (!receipt.data) return false;
    return Object.keys(edit).length > 0;
  }, [edit, receipt.data]);

  return (
    <AppShell>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Detalhe"
          title={receipt.data ? `Recibo Nº ${receipt.data.receiptNumber}` : "Recibo"}
          subtitle="Revise a informação, faça ajustes e gere PDF ou imprima em A4 (2 por página)."
          right={
            <div className="flex flex-wrap gap-2">
              <Link
                href="/recibos"
                className="inline-flex items-center justify-center rounded-xl px-4 py-3 font-semibold bg-muted/70 hover:bg-muted transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15"
                data-testid="detail-back"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Link>

              <PdfActions
                receiptIds={receipt.data ? [receipt.data.id] : []}
                onPrint={() => window.print()}
                testIdPrefix="detail-actions"
                variant="outline"
              />
            </div>
          }
          testId="detail-header"
        />

        {receipt.isLoading && (
          <Card className="glass rounded-2xl border border-border/70 p-8 flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <div>
              <div className="font-semibold">A carregar recibo…</div>
              <div className="text-sm text-muted-foreground">Aguarde um instante.</div>
            </div>
          </Card>
        )}

        {receipt.error && (
          <Card className="glass rounded-2xl border border-border/70 p-8">
            <div className="font-semibold">Erro ao carregar</div>
            <div className="text-sm text-muted-foreground mt-1">
              {(receipt.error as any)?.message ?? "Ocorreu um erro inesperado."}
            </div>
          </Card>
        )}

        {!receipt.isLoading && !receipt.error && receipt.data === null && (
          <Card className="glass rounded-2xl border border-border/70 p-8">
            <div className="font-semibold">Recibo não encontrado</div>
            <div className="text-sm text-muted-foreground mt-1">O item pode ter sido apagado.</div>
          </Card>
        )}

        {receipt.data && (
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1fr] gap-6 items-start">
            <Card className="glass rounded-2xl border border-border/70 p-5 md:p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">
                    Edição rápida
                  </div>
                  <h2 className="mt-1 text-2xl">Ajustar campos</h2>
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      try {
                        const validated = api.receipts.update.input.parse({
                          ...edit,
                          ...(edit as any).amountPaid !== undefined
                            ? { amountPaid: Number((edit as any).amountPaid) }
                            : {},
                        });

                        await update.mutateAsync({ id, updates: validated });
                        setEdit({});
                        toast({ title: "Atualizado", description: "As alterações foram guardadas." });
                      } catch (e: any) {
                        toast({
                          title: "Falha ao guardar",
                          description: e?.message ?? "Tente novamente.",
                          variant: "destructive",
                        });
                      }
                    }}
                    disabled={!canSave || update.isPending}
                    className="rounded-xl"
                    data-testid="detail-save"
                  >
                    {update.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Guardar
                  </Button>

                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="destructive"
                        className="rounded-xl"
                        data-testid="detail-delete"
                        disabled={del.isPending}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Apagar
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Apagar recibo?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Esta ação não pode ser desfeita. O recibo será removido permanentemente.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                          className="rounded-xl"
                          onClick={async () => {
                            try {
                              await del.mutateAsync(id);
                              toast({ title: "Apagado", description: "O recibo foi removido." });
                              window.location.href = "/recibos";
                            } catch (e: any) {
                              toast({
                                title: "Falha ao apagar",
                                description: e?.message ?? "Tente novamente.",
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Apagar
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              <Separator className="my-5 bg-border/70" />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="studentName">Nome do aluno</Label>
                  <Input
                    id="studentName"
                    defaultValue={receipt.data.studentName}
                    onChange={(e) => setEdit((p) => ({ ...p, studentName: e.target.value }))}
                    className="rounded-xl"
                    data-testid="detail-studentName"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentClass">Classe</Label>
                  <Input
                    id="studentClass"
                    defaultValue={receipt.data.studentClass}
                    onChange={(e) => setEdit((p) => ({ ...p, studentClass: e.target.value as any }))}
                    className="rounded-xl"
                    data-testid="detail-studentClass"
                  />
                  <div className="text-xs text-muted-foreground">Ex: 1ª, 2ª, … 6ª</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="studentNumber">Nº do aluno</Label>
                  <Input
                    id="studentNumber"
                    defaultValue={receipt.data.studentNumber ?? ""}
                    onChange={(e) => setEdit((p) => ({ ...p, studentNumber: e.target.value }))}
                    className="rounded-xl"
                    data-testid="detail-studentNumber"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianName">Encarregado</Label>
                  <Input
                    id="guardianName"
                    defaultValue={receipt.data.guardianName ?? ""}
                    onChange={(e) => setEdit((p) => ({ ...p, guardianName: e.target.value }))}
                    className="rounded-xl"
                    data-testid="detail-guardianName"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="paymentDescription">Descrição</Label>
                  <Textarea
                    id="paymentDescription"
                    defaultValue={receipt.data.paymentDescription}
                    onChange={(e) => setEdit((p) => ({ ...p, paymentDescription: e.target.value }))}
                    className="rounded-xl min-h-[90px]"
                    data-testid="detail-paymentDescription"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="paymentMethod">Forma</Label>
                  <Input
                    id="paymentMethod"
                    defaultValue={receipt.data.paymentMethod}
                    onChange={(e) => setEdit((p) => ({ ...p, paymentMethod: e.target.value as any }))}
                    className="rounded-xl"
                    data-testid="detail-paymentMethod"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amountPaid">Valor pago (MT)</Label>
                  <Input
                    id="amountPaid"
                    type="number"
                    defaultValue={String((receipt.data as any).amountPaid ?? "")}
                    onChange={(e) => setEdit((p) => ({ ...p, amountPaid: e.target.value as any }))}
                    className="rounded-xl"
                    data-testid="detail-amountPaid"
                  />
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="amountInWords">Por extenso</Label>
                  <Textarea
                    id="amountInWords"
                    defaultValue={receipt.data.amountInWords}
                    onChange={(e) => setEdit((p) => ({ ...p, amountInWords: e.target.value }))}
                    className="rounded-xl min-h-[90px]"
                    data-testid="detail-amountInWords"
                  />
                  <div className="text-xs text-muted-foreground">
                    Nota: ao emitir um novo recibo, o servidor calcula automaticamente. Aqui pode ajustar se necessário.
                  </div>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="secretaryName">Chefe da Secretaria</Label>
                  <Input
                    id="secretaryName"
                    defaultValue={receipt.data.secretaryName}
                    onChange={(e) => setEdit((p) => ({ ...p, secretaryName: e.target.value }))}
                    className="rounded-xl"
                    data-testid="detail-secretaryName"
                  />
                </div>
              </div>
            </Card>

            <div className="space-y-4">
              <ReceiptPreview receipt={merged as any} testIdPrefix="detail-preview" />
              <ReceiptPreview receipt={merged as any} mode="print" testIdPrefix="detail-preview" />
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
