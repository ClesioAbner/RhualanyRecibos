import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import {
  useClasses,
  useStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
} from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { classLabel } from "@/lib/turma";
import { formatMt } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronRight, Loader2, Search } from "lucide-react";
import type { ClassRow, StudentRow } from "@shared/routes";

type FormState = {
  classId: string;
  fullName: string;
  internalNumber: string;
  birthdate: string;
  monthlyFeeOverride: string;
  active: boolean;
};
const EMPTY: FormState = { classId: "", fullName: "", internalNumber: "", birthdate: "", monthlyFeeOverride: "", active: true };

export default function AdminCadastro() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: classes } = useClasses();
  const [q, setQ] = useState("");
  const { data: students, isLoading, error } = useStudents(q.trim() ? { q: q.trim() } : undefined);

  const createM = useCreateStudent();
  const updateM = useUpdateStudent();
  const deleteM = useDeleteStudent();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);

  const grouped = useMemo(() => {
    const byClass = new Map<number, StudentRow[]>();
    (students ?? []).forEach((s) => {
      if (!byClass.has(s.classId)) byClass.set(s.classId, []);
      byClass.get(s.classId)!.push(s);
    });
    return (classes ?? [])
      .map((c) => ({ cls: c, students: byClass.get(c.id) ?? [] }))
      .filter((g) => g.students.length > 0 || (!q.trim() && g.cls.active));
  }, [classes, students, q]);

  const totalStudents = students?.length ?? 0;

  const openCreate = () => {
    setEditing(null);
    setForm({ ...EMPTY, classId: String(classes?.find((c) => c.active)?.id ?? "") });
    setOpen(true);
  };
  const openEdit = (s: StudentRow) => {
    setEditing(s);
    setForm({
      classId: String(s.classId),
      fullName: s.fullName,
      internalNumber: s.internalNumber ?? "",
      birthdate: s.birthdate ?? "",
      monthlyFeeOverride: s.monthlyFeeOverride != null ? String(s.monthlyFeeOverride) : "",
      active: s.active,
    });
    setOpen(true);
  };

  const submit = async () => {
    const payload: any = {
      classId: Number(form.classId),
      fullName: form.fullName.trim(),
      internalNumber: form.internalNumber.trim() || undefined,
      birthdate: form.birthdate.trim() || undefined,
      monthlyFeeOverride: form.monthlyFeeOverride.trim() ? Number(form.monthlyFeeOverride) : undefined,
      active: form.active,
    };
    try {
      if (editing) {
        await updateM.mutateAsync({ id: editing.id, updates: payload });
        toast({ title: "Aluno actualizado" });
      } else {
        await createM.mutateAsync(payload);
        toast({ title: "Aluno criado" });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const remove = async (s: StudentRow) => {
    const ok = window.confirm(
      `Apagar o aluno "${s.fullName}"?\n\nOs encarregados deste aluno também serão removidos. Os recibos antigos ficam preservados (o nome e a turma ficam guardados no recibo).\n\nEsta operação é PERMANENTE. Continuar?`,
    );
    if (!ok) return;
    try {
      await deleteM.mutateAsync(s.id);
      toast({ title: "Aluno apagado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const saving = createM.isPending || updateM.isPending;

  return (
    <AdminShell
      title="Cadastro"
      subtitle="Alunos organizados por turma"
      actions={
        <Button onClick={openCreate} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="aluno-novo">
          <Plus size={16} /> Novo aluno
        </Button>
      }
    >
      {/* toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: C.textMuted }} />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Pesquisar aluno por nome ou nº interno…" className="pl-9" data-testid="cadastro-search" />
        </div>
        <span className="text-[13px]" style={{ color: C.textSecondary }}>
          {totalStudents} aluno{totalStudents !== 1 ? "s" : ""}
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
          <Loader2 className="animate-spin" size={16} /> A carregar…
        </div>
      ) : error ? (
        <AdminCard><p className="text-sm" style={{ color: C.error }}>Não foi possível carregar os alunos.</p></AdminCard>
      ) : grouped.length === 0 ? (
        <AdminCard>
          <p className="text-sm text-center py-6" style={{ color: C.textMuted }}>
            {q.trim() ? "Nenhum aluno encontrado para a pesquisa." : "Sem alunos cadastrados. Use “Novo aluno” para começar."}
          </p>
        </AdminCard>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ cls, students: list }) => (
            <ClassBlock
              key={cls.id}
              cls={cls}
              students={list}
              onOpen={(id) => setLocation(`/admin/alunos/${id}`)}
              onEdit={openEdit}
              onDelete={remove}
            />
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar aluno" : "Novo aluno"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label>Nome completo</Label>
              <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="aluno-input-nome" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Turma</Label>
                <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                  <SelectTrigger data-testid="aluno-select-turma"><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
                  <SelectContent>
                    {(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Nº interno</Label>
                <Input value={form.internalNumber} onChange={(e) => setForm({ ...form, internalNumber: e.target.value })} placeholder="INT-001" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Data de nascimento</Label>
                <Input type="date" value={form.birthdate} onChange={(e) => setForm({ ...form, birthdate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Mensalidade própria (MT)</Label>
                <Input type="number" value={form.monthlyFeeOverride} onChange={(e) => setForm({ ...form, monthlyFeeOverride: e.target.value })} placeholder="(usa a da turma)" />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm pt-1" style={{ color: C.textSecondary }}>
              <input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4" />
              Aluno activo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving || !form.fullName.trim() || !form.classId} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="aluno-guardar">
              {saving && <Loader2 className="animate-spin" size={15} />} {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}

function ClassBlock({
  cls, students, onOpen, onEdit, onDelete,
}: {
  cls: ClassRow;
  students: StudentRow[];
  onOpen: (id: number) => void;
  onEdit: (s: StudentRow) => void;
  onDelete: (s: StudentRow) => void;
}) {
  return (
    <AdminCard noPadding>
      <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder, background: "#f7fafd" }}>
        <div>
          <h2 className="text-[15px] font-extrabold" style={{ color: C.navy }}>{cls.name}</h2>
          <p className="text-[12px]" style={{ color: C.textSecondary }}>
            {classLabel(cls.level)} · {formatMt(cls.monthlyFee)} MT/mês{!cls.active && " · turma inactiva"}
          </p>
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: C.accentDark }}>
          {students.length} aluno{students.length !== 1 ? "s" : ""}
        </span>
      </div>

      {students.length === 0 ? (
        <p className="px-5 py-6 text-[13px] text-center" style={{ color: C.textMuted }}>Turma sem alunos.</p>
      ) : (
        <div>
          {students.map((s) => (
            <div
              key={s.id}
              data-testid={`aluno-row-${s.id}`}
              className="group flex items-center gap-3 px-4 py-2.5 border-b last:border-0 hover:bg-[#fafbfc] dark:hover:bg-white/5 transition-colors"
              style={{ borderColor: "#f1f5f9", opacity: s.active ? 1 : 0.55 }}
            >
              <button onClick={() => onOpen(s.id)} className="flex-1 min-w-0 text-left" aria-label={`Ver perfil de ${s.fullName}`}>
                <p className="text-[13.5px] font-semibold truncate" style={{ color: C.textPrimary }}>{s.fullName}</p>
                <p className="text-[11.5px]" style={{ color: C.textMuted }}>
                  {s.internalNumber ? `Nº ${s.internalNumber}` : "Sem nº interno"}
                  {s.monthlyFeeOverride != null && ` · ${formatMt(s.monthlyFeeOverride)} MT`}
                </p>
              </button>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <IconBtn label="Editar" onClick={() => onEdit(s)}><Pencil size={15} /></IconBtn>
                <IconBtn label="Apagar" onClick={() => onDelete(s)} danger><Trash2 size={15} /></IconBtn>
                <button onClick={() => onOpen(s.id)} aria-label="Ver perfil" className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ color: C.textMuted }}>
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AdminCard>
  );
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-white dark:hover:bg-white/10 transition-colors"
      style={{ borderColor: C.cardBorder, color: danger ? C.error : C.textSecondary }}
    >
      {children}
    </button>
  );
}
