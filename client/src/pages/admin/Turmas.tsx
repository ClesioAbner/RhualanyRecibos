import { useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import { useClasses, useCreateClass, useUpdateClass, useDeleteClass } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { classLabel } from "@/lib/turma";
import { formatMt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Power, PowerOff, Trash2, Loader2 } from "lucide-react";
import type { ClassRow, ClassLevel } from "@shared/routes";

const LEVELS: { value: ClassLevel; label: string }[] = [
  { value: "bercario", label: "Berçário" },
  { value: "pre_escolar", label: "Pré-escolar" },
  { value: "primaria", label: "Primária" },
  { value: "secundaria", label: "Secundária" },
  { value: "outro", label: "Outro" },
];

type FormState = { name: string; level: ClassLevel; monthlyFee: string };
const EMPTY: FormState = { name: "", level: "primaria", monthlyFee: "" };

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 rounded-lg border flex items-center justify-center transition-colors hover:bg-slate-50 dark:hover:bg-white/5"
      style={{ borderColor: C.cardBorder, color: danger ? C.error : C.textSecondary }}
    >
      {children}
    </button>
  );
}

export default function AdminTurmas() {
  const { toast } = useToast();
  const { data: classes, isLoading, error } = useClasses();
  const createM = useCreateClass();
  const updateM = useUpdateClass();
  const deleteM = useDeleteClass();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ClassRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setOpen(true); };
  const openEdit = (c: ClassRow) => {
    setEditing(c);
    setForm({ name: c.name, level: c.level as ClassLevel, monthlyFee: String(c.monthlyFee) });
    setOpen(true);
  };

  const submit = async () => {
    const payload = { name: form.name.trim(), level: form.level, monthlyFee: Number(form.monthlyFee || 0) };
    try {
      if (editing) {
        await updateM.mutateAsync({ id: editing.id, updates: payload });
        toast({ title: "Turma actualizada" });
      } else {
        await createM.mutateAsync(payload);
        toast({ title: "Turma criada" });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (c: ClassRow) => {
    try {
      await updateM.mutateAsync({ id: c.id, updates: { active: !c.active } });
      toast({ title: c.active ? "Turma desactivada" : "Turma activada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (c: ClassRow) => {
    const ok = window.confirm(
      `Apagar a turma "${c.name}"?\n\nOs alunos desta turma também serão apagados. Os recibos antigos ficam preservados — apenas deixam de estar ligados a um aluno (o nome e a turma ficam guardados no recibo).\n\nEsta operação é PERMANENTE. Continuar?`,
    );
    if (!ok) return;
    try {
      await deleteM.mutateAsync(c.id);
      toast({ title: "Turma apagada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const saving = createM.isPending || updateM.isPending;

  return (
    <AdminShell
      title="Turmas"
      subtitle="Gerir as turmas da escola"
      actions={
        <Button onClick={openCreate} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="turma-nova">
          <Plus size={16} /> Nova turma
        </Button>
      }
    >
      <AdminCard noPadding>
        {isLoading ? (
          <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
            <Loader2 className="animate-spin" size={16} /> A carregar…
          </div>
        ) : error ? (
          <p className="p-8 text-sm" style={{ color: C.error }}>Não foi possível carregar as turmas.</p>
        ) : (classes?.length ?? 0) === 0 ? (
          <div className="p-10 text-center" style={{ color: C.textMuted }}>
            <p className="text-sm">Ainda não há turmas.</p>
            <Button onClick={openCreate} className="mt-3 gap-2 text-white" style={{ background: C.accentDark }}>
              <Plus size={15} /> Criar a primeira turma
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ color: C.textMuted }} className="text-[11px] uppercase tracking-wide">
                  <th className="text-left font-semibold px-5 py-3">Nome</th>
                  <th className="text-left font-semibold px-5 py-3">Nível</th>
                  <th className="text-right font-semibold px-5 py-3">Mensalidade</th>
                  <th className="text-right font-semibold px-5 py-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {(classes ?? []).map((c) => (
                  <tr
                    key={c.id}
                    data-testid={`turma-row-${c.id}`}
                    className="border-t"
                    style={{ borderColor: "#f1f5f9", opacity: c.active ? 1 : 0.55 }}
                  >
                    <td className="px-5 py-3 font-semibold" style={{ color: C.navy }}>{c.name}</td>
                    <td className="px-5 py-3" style={{ color: C.textSecondary }}>{classLabel(c.level)}</td>
                    <td className="px-5 py-3 text-right tabular-nums font-semibold" style={{ color: C.textPrimary }}>
                      {formatMt(c.monthlyFee)} <span style={{ color: C.textMuted }}>MT</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center justify-end gap-1.5">
                        <IconBtn label="Editar" onClick={() => openEdit(c)}><Pencil size={15} /></IconBtn>
                        <IconBtn label={c.active ? "Desactivar" : "Activar"} onClick={() => toggleActive(c)}>
                          {c.active ? <PowerOff size={15} /> : <Power size={15} />}
                        </IconBtn>
                        <IconBtn label="Apagar" onClick={() => remove(c)} danger><Trash2 size={15} /></IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar turma" : "Nova turma"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input maxLength={32} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="turma-input-nome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Nível</Label>
                <Select value={form.level} onValueChange={(v) => setForm({ ...form, level: v as ClassLevel })}>
                  <SelectTrigger data-testid="turma-select-nivel"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEVELS.map((l) => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Mensalidade (MT)</Label>
                <Input type="number" min={0} value={form.monthlyFee} onChange={(e) => setForm({ ...form, monthlyFee: e.target.value })} data-testid="turma-input-fee" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim()} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="turma-guardar">
              {saving && <Loader2 className="animate-spin" size={15} />} {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
