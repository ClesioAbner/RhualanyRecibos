import { useEffect, useState } from "react";
import AppShell from "@/components/layout/AppShell";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { api } from "@shared/routes";
import { BRAND } from "@shared/brand";
import { NAVY, MUTED, INK, LINE } from "@/lib/theme";

export default function Definicoes() {
  const { toast } = useToast();
  const settings = useSettings();
  const update = useUpdateSettings();

  const [secretaryName, setSecretaryName] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (settings.data?.secretaryName != null) setSecretaryName(settings.data.secretaryName);
  }, [settings.data?.secretaryName]);

  const canSave = secretaryName.trim().length >= 2;

  const handleSave = async () => {
    try {
      const validated = api.settings.update.input.parse({ secretaryName: secretaryName.trim() });
      await update.mutateAsync(validated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
      toast({ title: "Definições guardadas" });
    } catch (e: any) {
      toast({ title: "Erro ao guardar", description: e?.message ?? "Verifique e tente novamente.", variant: "destructive" });
    }
  };

  const card = "bg-white rounded-2xl border";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* cabeçalho */}
        <div>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>Definições</h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Configurações da secretaria e dados do colégio.</p>
        </div>

        {/* responsável da secretaria */}
        <div className={card} style={{ borderColor: LINE }}>
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Responsável da secretaria</h2>
            <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>Nome impresso em todos os recibos como responsável.</p>
          </div>
          <div className="h-px" style={{ background: LINE }} />

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5 max-w-md">
              <Label className="text-[12px]" style={{ color: MUTED }}>Nome completo</Label>
              <Input
                value={secretaryName}
                onChange={(e) => { setSecretaryName(e.target.value); setSaved(false); }}
                placeholder="Ex.: Victória Pembelane"
                data-testid="settings-secretaryName"
              />
              <p className="text-[11px]" style={{ color: "#94a3b8" }}>Mínimo 2 caracteres. Aparece no rodapé de cada recibo.</p>
            </div>

            {/* pré-visualização do rodapé */}
            <div className="rounded-lg border px-4 py-4 flex items-end gap-6" style={{ borderColor: LINE, background: "#f9fbfd" }}>
              <div className="h-12 w-20 rounded border border-dashed flex items-center justify-center text-[8px] italic text-center leading-tight flex-shrink-0" style={{ borderColor: "#cbd5e1", color: "#94a3b8" }}>
                Carimbo<br />Oficial
              </div>
              <div className="flex-1 text-center">
                <div className="h-px mb-1.5" style={{ background: "#334155" }} />
                <p className="text-[12.5px] font-bold truncate" style={{ color: INK }}>{secretaryName.trim() || "—"}</p>
                <p className="text-[10.5px]" style={{ color: MUTED }}>Chefe da Secretaria</p>
              </div>
            </div>
          </div>

          <div className="h-px" style={{ background: LINE }} />
          <div className="px-6 py-4 flex items-center justify-end gap-3">
            {saved && <span className="text-[12.5px] font-semibold" style={{ color: "#16a34a" }}>Guardado</span>}
            <Button onClick={handleSave} disabled={!canSave || update.isPending} className="text-white px-6" style={{ background: NAVY }} data-testid="settings-save">
              {update.isPending ? "A guardar…" : "Guardar alterações"}
            </Button>
          </div>
        </div>

        {/* dados do colégio (institucional / só leitura) */}
        <div className={card} style={{ borderColor: LINE }}>
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Dados do colégio</h2>
            <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>Informação institucional impressa no cabeçalho dos recibos.</p>
          </div>
          <div className="h-px" style={{ background: LINE }} />
          <dl className="px-6 py-2">
            {[
              ["Nome", BRAND.full],
              ["Morada", BRAND.address],
              ["NUIT", BRAND.nuit],
              ["Contacto", BRAND.phone],
            ].map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-2.5 border-b last:border-0" style={{ borderColor: "#f3f5f8" }}>
                <dt className="text-[12.5px]" style={{ color: MUTED }}>{k}</dt>
                <dd className="text-[13px] font-semibold text-right" style={{ color: INK }}>{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </AppShell>
  );
}
