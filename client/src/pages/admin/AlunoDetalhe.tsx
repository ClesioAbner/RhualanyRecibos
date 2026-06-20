import { useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import {
  useStudent,
  useClasses,
  useUpdateStudent,
  useDeleteStudent,
  useGuardians,
  useCreateGuardian,
  useUpdateGuardian,
  useDeleteGuardian,
  useAdminReceipts,
} from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatMt, formatDate, receiptCode } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Pencil, Power, PowerOff, Trash2, Plus, Star, Phone, Mail, Loader2 } from "lucide-react";
import type { GuardianRow, GuardianRelationship, StudentRow } from "@shared/routes";

function ageFrom(birthdate?: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  if (Number.isNaN(b.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - b.getFullYear();
  const m = now.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < b.getDate())) age--;
  return age >= 0 && age < 120 ? age : null;
}

const RELS: { value: GuardianRelationship; label: string }[] = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "tutor", label: "Tutor" },
  { value: "outro", label: "Outro" },
];
const relLabel = (r: string) => RELS.find((x) => x.value === r)?.label ?? r;
const initials = (n: string) => n.split(" ").slice(0, 2).map((w) => w[0]).join("").toUpperCase();

export default function AlunoDetalhe({ id }: { id: string }) {
  const studentId = Number(id);
  const { toast } = useToast();
  const { data: student, isLoading } = useStudent(studentId);
  const { data: classes } = useClasses();
  const { data: guardians } = useGuardians(studentId);
  const { data: receipts } = useAdminReceipts({ studentId });
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const [, navigate] = useLocation();

  const [editOpen, setEditOpen] = useState(false);
  const [gOpen, setGOpen] = useState(false);
  const [gEditing, setGEditing] = useState<GuardianRow | null>(null);

  const totalPaid = useMemo(
    () => (receipts ?? []).filter((r) => !r.deletedAt).reduce((s, r) => s + (Number(r.amountPaid) || 0), 0),
    [receipts],
  );
  const liveReceiptCount = useMemo(() => (receipts ?? []).filter((r) => !r.deletedAt).length, [receipts]);

  if (isLoading) {
    return (
      <AdminShell title="Aluno">
        <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
          <Loader2 className="animate-spin" size={16} /> A carregar…
        </div>
      </AdminShell>
    );
  }
  if (!student) {
    return (
      <AdminShell title="Aluno">
        <AdminCard><p className="text-sm" style={{ color: C.error }}>Aluno não encontrado.</p></AdminCard>
      </AdminShell>
    );
  }

  const cls = (classes ?? []).find((c) => c.id === student.classId);
  const effectiveFee = student.monthlyFeeOverride ?? cls?.monthlyFee ?? "0";
  const feeBadge = student.monthlyFeeOverride != null ? "(próprio)" : "(da turma)";

  const toggleActive = async () => {
    const ok = window.confirm(
      student.active
        ? `Desactivar o aluno "${student.fullName}"? Deixa de aparecer nas listas activas e nos pendentes. Continuar?`
        : `Reactivar o aluno "${student.fullName}"?`,
    );
    if (!ok) return;
    try {
      await updateStudent.mutateAsync({ id: student.id, updates: { active: !student.active } });
      toast({ title: student.active ? "Aluno desactivado" : "Aluno reactivado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const remove = async () => {
    const ok = window.confirm(
      `Apagar o aluno "${student.fullName}"?\n\nOs encarregados também serão removidos. Os recibos antigos ficam preservados.\n\nEsta operação é PERMANENTE. Continuar?`,
    );
    if (!ok) return;
    try {
      await deleteStudent.mutateAsync(student.id);
      toast({ title: "Aluno apagado" });
      navigate("/admin/cadastro");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const age = ageFrom(student.birthdate);

  return (
    <AdminShell
      title={student.fullName}
      subtitle={cls?.name ?? "—"}
      actions={
        <Link href="/admin/cadastro">
          <Button variant="outline" className="gap-2"><ArrowLeft size={15} /> Voltar</Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── identificação ── */}
        <div className="space-y-4" style={{ opacity: student.active ? 1 : 0.55 }}>
          <AdminCard>
            <div className="flex items-center gap-3">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ background: C.navy }}
              >
                {initials(student.fullName)}
              </div>
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold truncate" style={{ color: C.navy }}>{student.fullName}</h2>
                <p className="text-[13px]" style={{ color: C.textSecondary }}>{cls?.name ?? "—"}</p>
              </div>
            </div>
            {/* resumo */}
            <div className="grid grid-cols-3 gap-2 mt-4">
              <Stat label="Total pago" value={`${formatMt(totalPaid)}`} unit="MT" />
              <Stat label="Recibos" value={String(liveReceiptCount)} />
              <Stat label="Encarregados" value={String(guardians?.length ?? 0)} />
            </div>

            <div className="flex gap-2 mt-4">
              <Button variant="outline" className="gap-2 flex-1" onClick={() => setEditOpen(true)} data-testid="aluno-editar">
                <Pencil size={15} /> Editar
              </Button>
              <Button variant="outline" className="gap-2 flex-1" onClick={toggleActive} data-testid="aluno-toggle">
                {student.active ? <PowerOff size={15} /> : <Power size={15} />}
                {student.active ? "Desactivar" : "Reactivar"}
              </Button>
              <Button variant="outline" className="gap-2" onClick={remove} style={{ color: C.error }} data-testid="aluno-apagar" aria-label="Apagar aluno">
                <Trash2 size={15} />
              </Button>
            </div>
          </AdminCard>

          <AdminCard>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: C.navy }}>Dados pessoais</h3>
            <Field label="Nome completo" value={student.fullName} />
            <Field label="Nº interno" value={student.internalNumber ?? "—"} />
            <Field label="Data de nascimento" value={student.birthdate ? `${formatDate(student.birthdate)}${age != null ? ` · ${age} anos` : ""}` : "—"} />
            <Field
              label="Mensalidade efectiva"
              value={
                <>
                  {formatMt(effectiveFee)} MT{" "}
                  <span style={{ color: C.textMuted, fontWeight: 500 }}>{feeBadge}</span>
                </>
              }
            />
          </AdminCard>
        </div>

        {/* ── relações ── */}
        <div className="space-y-4">
          <AdminCard noPadding>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder }}>
              <h3 className="text-[13px] font-bold" style={{ color: C.navy }}>Encarregados</h3>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 h-8"
                onClick={() => { setGEditing(null); setGOpen(true); }}
                data-testid="guardian-novo"
              >
                <Plus size={14} /> Adicionar
              </Button>
            </div>
            <div className="p-3 space-y-2">
              {(guardians?.length ?? 0) === 0 ? (
                <p className="text-[13px] text-center py-4" style={{ color: C.textMuted }}>Sem encarregados.</p>
              ) : (
                (guardians ?? []).map((g) => (
                  <button
                    key={g.id}
                    onClick={() => { setGEditing(g); setGOpen(true); }}
                    data-testid={`guardian-row-${g.id}`}
                    className="flex w-full items-center justify-between gap-3 p-3 rounded-xl border text-left hover:bg-[#fafbfc] dark:hover:bg-white/5"
                    style={{ borderColor: C.cardBorder }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold flex items-center gap-1.5 truncate" style={{ color: C.textPrimary }}>
                        {g.isPrimary && <Star size={13} className="fill-current" style={{ color: C.accent }} />}
                        {g.fullName}
                        <span className="text-[11px] font-normal" style={{ color: C.textMuted }}>· {relLabel(g.relationship)}</span>
                      </p>
                      <p className="text-[11px] flex items-center gap-3 mt-0.5" style={{ color: C.textMuted }}>
                        {g.phone && <span className="flex items-center gap-1"><Phone size={11} />{g.phone}</span>}
                        {g.email && <span className="flex items-center gap-1"><Mail size={11} />{g.email}</span>}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </AdminCard>

          <AdminCard noPadding>
            <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder }}>
              <h3 className="text-[13px] font-bold" style={{ color: C.navy }}>Recibos deste aluno</h3>
              <Link href={`/admin/recibos?studentId=${student.id}`} className="text-[12px] font-semibold" style={{ color: C.accent }}>
                Ver todos
              </Link>
            </div>
            {(receipts?.length ?? 0) === 0 ? (
              <p className="text-[13px] text-center py-6" style={{ color: C.textMuted }}>Ainda não há recibos.</p>
            ) : (
              <ul>
                {(receipts ?? []).slice(0, 20).map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 px-5 py-2.5 border-b last:border-0"
                    style={{ borderColor: "#f1f5f9", opacity: r.deletedAt ? 0.55 : 1 }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold" style={{ color: C.textPrimary }}>
                        {receiptCode(r.receiptNumber)}
                        {r.deletedAt && <span className="ml-2 text-[10px] font-bold" style={{ color: C.textMuted }}>ANULADO</span>}
                      </p>
                      <p className="text-[11px]" style={{ color: C.textMuted }}>{formatDate(r.issueDate)} · {r.paymentDescription}</p>
                    </div>
                    <span className="text-[13px] font-bold tabular-nums" style={{ color: C.navy }}>
                      {formatMt(r.amountPaid)} <span style={{ color: C.textMuted, fontWeight: 600 }}>MT</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </AdminCard>
        </div>
      </div>

      {editOpen && <StudentEditModal student={student} onClose={() => setEditOpen(false)} />}
      {gOpen && <GuardianModal studentId={student.id} guardian={gEditing} onClose={() => setGOpen(false)} />}
    </AdminShell>
  );
}

function Stat({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="rounded-xl px-3 py-2.5 text-center" style={{ background: "#f6f8fc" }}>
      <p className="tabular-nums" style={{ fontFamily: "Georgia, serif", fontSize: 16, fontWeight: 700, color: C.navy, lineHeight: 1.1 }}>
        {value}{unit && <span className="text-[10px] font-sans font-semibold ml-0.5" style={{ color: C.textMuted }}>{unit}</span>}
      </p>
      <p className="text-[10px] mt-1 uppercase tracking-wide" style={{ color: C.textMuted }}>{label}</p>
    </div>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0" style={{ borderColor: "#f1f5f9" }}>
      <span className="text-[12px]" style={{ color: C.textSecondary }}>{label}</span>
      <span className="text-[13px] font-semibold text-right" style={{ color: C.textPrimary }}>{value}</span>
    </div>
  );
}

// ── student edit modal ──
function StudentEditModal({ student, onClose }: { student: StudentRow; onClose: () => void }) {
  const { toast } = useToast();
  const { data: classes } = useClasses();
  const updateM = useUpdateStudent();
  const [form, setForm] = useState({
    classId: String(student.classId),
    fullName: student.fullName,
    internalNumber: student.internalNumber ?? "",
    birthdate: student.birthdate ?? "",
    monthlyFeeOverride: student.monthlyFeeOverride != null ? String(student.monthlyFeeOverride) : "",
  });

  const submit = async () => {
    try {
      await updateM.mutateAsync({
        id: student.id,
        updates: {
          classId: Number(form.classId),
          fullName: form.fullName.trim(),
          internalNumber: form.internalNumber.trim() || undefined,
          birthdate: form.birthdate.trim() || undefined,
          monthlyFeeOverride: form.monthlyFeeOverride.trim() ? Number(form.monthlyFeeOverride) : undefined,
        },
      });
      toast({ title: "Aluno actualizado" });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar aluno</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nº interno</Label>
              <Input value={form.internalNumber} onChange={(e) => setForm({ ...form, internalNumber: e.target.value })} />
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
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={updateM.isPending || !form.fullName.trim()} className="gap-2 text-white" style={{ background: C.accentDark }}>
            {updateM.isPending && <Loader2 className="animate-spin" size={15} />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── guardian modal ──
function GuardianModal({ studentId, guardian, onClose }: { studentId: number; guardian: GuardianRow | null; onClose: () => void }) {
  const { toast } = useToast();
  const createM = useCreateGuardian();
  const updateM = useUpdateGuardian();
  const deleteM = useDeleteGuardian();
  const [form, setForm] = useState({
    fullName: guardian?.fullName ?? "",
    relationship: (guardian?.relationship as GuardianRelationship) ?? "outro",
    phone: guardian?.phone ?? "",
    email: guardian?.email ?? "",
    isPrimary: guardian?.isPrimary ?? false,
  });

  const submit = async () => {
    const input = {
      fullName: form.fullName.trim(),
      relationship: form.relationship,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      isPrimary: form.isPrimary,
    };
    try {
      if (guardian) {
        await updateM.mutateAsync({ id: guardian.id, studentId, updates: input });
        toast({ title: "Encarregado actualizado" });
      } else {
        await createM.mutateAsync({ studentId, input });
        toast({ title: "Encarregado adicionado" });
      }
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const remove = async () => {
    if (!guardian || !window.confirm(`Remover ${guardian.fullName}?`)) return;
    try {
      await deleteM.mutateAsync({ id: guardian.id, studentId });
      toast({ title: "Encarregado removido" });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const saving = createM.isPending || updateM.isPending;

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{guardian ? "Editar encarregado" : "Adicionar encarregado"}</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nome completo</Label>
            <Input value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} data-testid="guardian-input-nome" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Parentesco</Label>
              <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v as GuardianRelationship })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="84…" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email (opcional)</Label>
            <Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </div>
          <label className="flex items-center gap-2 text-sm" style={{ color: C.textSecondary }}>
            <input type="checkbox" checked={form.isPrimary} onChange={(e) => setForm({ ...form, isPrimary: e.target.checked })} className="h-4 w-4" />
            Encarregado principal
          </label>
        </div>
        <DialogFooter className="flex sm:justify-between">
          {guardian ? (
            <Button variant="ghost" onClick={remove} style={{ color: C.error }}>Remover</Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={submit} disabled={saving || !form.fullName.trim()} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="guardian-guardar">
              {saving && <Loader2 className="animate-spin" size={15} />} Guardar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
