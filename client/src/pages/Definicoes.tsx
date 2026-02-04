import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import SectionHeader from "@/components/SectionHeader";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Loader2, Save, Settings2 } from "lucide-react";
import { api } from "@shared/routes";

export default function Definicoes() {
  const { toast } = useToast();
  const settings = useSettings();
  const update = useUpdateSettings();

  const [secretaryName, setSecretaryName] = useState("");

  useEffect(() => {
    if (settings.data?.secretaryName) setSecretaryName(settings.data.secretaryName);
  }, [settings.data?.secretaryName]);

  return (
    <AppShell>
      <div className="space-y-8">
        <SectionHeader
          eyebrow="Configuração"
          title="Definições"
          subtitle="Configure o nome da Chefe da Secretaria. Este valor aparece automaticamente em novos recibos."
          testId="settings-header"
        />

        <Card className="glass rounded-2xl border border-border/70 p-5 md:p-6 max-w-2xl">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-2xl grid place-items-center bg-gradient-to-br from-primary/14 via-accent/10 to-transparent border border-border/60">
              <Settings2 className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <div className="text-[12px] uppercase tracking-[0.22em] text-muted-foreground">Escola</div>
              <h2 className="mt-1 text-2xl">Identidade do recibo</h2>
              <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                A aplicação preenche este campo automaticamente ao emitir um recibo, mas pode ser alterado manualmente em cada emissão.
              </p>
            </div>
          </div>

          <Separator className="my-5 bg-border/70" />

          {settings.isLoading ? (
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              A carregar definições…
            </div>
          ) : settings.error ? (
            <div className="text-sm">
              <div className="font-semibold">Erro ao carregar</div>
              <div className="text-muted-foreground mt-1">
                {(settings.error as any)?.message ?? "Ocorreu um erro inesperado."}
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="secretaryName">Nome da Chefe da Secretaria</Label>
              <Input
                id="secretaryName"
                value={secretaryName}
                onChange={(e) => setSecretaryName(e.target.value)}
                placeholder="Ex: Maria José"
                className="rounded-xl"
                data-testid="settings-secretaryName"
              />
              <div className="text-xs text-muted-foreground">
                Mínimo 2 caracteres.
              </div>
            </div>
          )}

          <Separator className="my-6 bg-border/70" />

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Endpoint: <span className="font-mono">{api.settings.update.path}</span>
            </div>

            <Button
              onClick={async () => {
                try {
                  const validated = api.settings.update.input.parse({ secretaryName });
                  await update.mutateAsync(validated);
                  toast({ title: "Guardado", description: "Definições atualizadas com sucesso." });
                } catch (e: any) {
                  toast({
                    title: "Falha ao guardar",
                    description: e?.message ?? "Verifique o nome e tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
              disabled={update.isPending || secretaryName.trim().length < 2}
              className="rounded-xl px-5"
              data-testid="settings-save"
            >
              {update.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {update.isPending ? "A guardar..." : "Guardar"}
            </Button>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
