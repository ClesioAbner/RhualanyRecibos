import { useState } from "react";
import { Link, useLocation } from "wouter";
import AppShell from "@/components/layout/AppShell";
import { useClasses, useCreateStudent, useCreateGuardian } from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { GuardianRelationship } from "@shared/routes";
import { NAVY, MUTED, LINE } from "@/lib/theme";

const RELS: { value: GuardianRelationship; label: string }[] = [
  { value: "pai", label: "Pai" },
  { value: "mae", label: "Mãe" },
  { value: "tutor", label: "Tutor" },
  { value: "outro", label: "Outro" },
];

function SectionHead({ n, title, desc }: { n: string; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-4">
      <span className="flex items-center justify-center rounded-lg text-[13px] font-bold flex-shrink-0" style={{ height: 28, width: 28, background: "#eef3fb", color: NAVY }}>{n}</span>
      <div>
        <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>{title}</h2>
        <p className="text-[12px]" style={{ color: MUTED }}>{desc}</p>
      </div>
    </div>
  );
}

export default function AlunoNovo() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { data: classes } = useClasses();
  const createStudent = useCreateStudent();
  const createGuardian = useCreateGuardian();

  const [form, setForm] = useState({
    classId: "",
    fullName: "",
    internalNumber: "",
    birthdate: "",
    feeOverride: "",
    gName: "",
    gRelationship: "outro" as GuardianRelationship,
    gPhone: "",
    gEmail: "",
  });
  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const saving = createStudent.isPending || createGuardian.isPending;
  const canSave = form.fullName.trim().length >= 2 && !!form.classId;

  const submit = async () => {
    try {
      const student: any = await createStudent.mutateAsync({
        classId: Number(form.classId),
        fullName: form.fullName.trim(),
        internalNumber: form.internalNumber.trim() || undefined,
        birthdate: form.birthdate.trim() || undefined,
        monthlyFeeOverride: form.feeOverride.trim() ? Number(form.feeOverride) : undefined,
      });
      if (form.gName.trim()) {
        await createGuardian.mutateAsync({
          studentId: student.id,
          input: {
            fullName: form.gName.trim(),
            relationship: form.gRelationship,
            phone: form.gPhone.trim() || undefined,
            email: form.gEmail.trim() || undefined,
            isPrimary: true,
          },
        });
      }
      toast({ title: "Aluno registado", description: "Já pode emitir o recibo." });
      navigate(`/emitir?student=${student.id}`);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const card = "bg-white rounded-2xl border p-6";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* cabeçalho sóbrio */}
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>Registar aluno</h1>
            <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Preencha uma vez. Depois é só escolher o aluno para emitir recibos.</p>
          </div>
          <Link href="/emitir" className="text-[13px] font-semibold" style={{ color: NAVY }}>← Voltar</Link>
        </div>

        <div className={card} style={{ borderColor: LINE }}>
          <SectionHead n="1" title="Dados do aluno" desc="Identificação e turma." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome completo</Label>
              <Input value={form.fullName} onChange={(e) => set("fullName")(e.target.value)} placeholder="Ex.: Ana Lúcia Matavele" data-testid="aluno-nome" />
            </div>
            <div className="space-y-1.5">
              <Label>Turma</Label>
              <Select value={form.classId} onValueChange={set("classId")}>
                <SelectTrigger data-testid="aluno-turma"><SelectValue placeholder="Escolher turma" /></SelectTrigger>
                <SelectContent>
                  {(classes ?? []).filter((c) => c.active).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Nº interno <span style={{ color: "#cbd5e1" }}>(opcional)</span></Label>
              <Input value={form.internalNumber} onChange={(e) => set("internalNumber")(e.target.value)} placeholder="INT-001" />
            </div>
            <div className="space-y-1.5">
              <Label>Data de nascimento <span style={{ color: "#cbd5e1" }}>(opcional)</span></Label>
              <Input type="date" value={form.birthdate} onChange={(e) => set("birthdate")(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Mensalidade própria <span style={{ color: "#cbd5e1" }}>(opcional)</span></Label>
              <Input type="number" value={form.feeOverride} onChange={(e) => set("feeOverride")(e.target.value)} placeholder="Usa a da turma" />
            </div>
          </div>

          <div className="my-6 h-px" style={{ background: LINE }} />

          <SectionHead n="2" title="Encarregado de educação" desc="Opcional. Fica como contacto principal do aluno." />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Nome do encarregado</Label>
              <Input value={form.gName} onChange={(e) => set("gName")(e.target.value)} placeholder="Ex.: Carlos Matavele" data-testid="enc-nome" />
            </div>
            <div className="space-y-1.5">
              <Label>Parentesco</Label>
              <Select value={form.gRelationship} onValueChange={(v) => setForm((f) => ({ ...f, gRelationship: v as GuardianRelationship }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{RELS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Telefone</Label>
              <Input value={form.gPhone} onChange={(e) => set("gPhone")(e.target.value)} placeholder="84…" />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Email <span style={{ color: "#cbd5e1" }}>(opcional)</span></Label>
              <Input value={form.gEmail} onChange={(e) => set("gEmail")(e.target.value)} placeholder="email@exemplo.com" />
            </div>
          </div>

          <div className="my-6 h-px" style={{ background: LINE }} />

          <div className="flex justify-end gap-2">
            <Link href="/emitir"><Button variant="outline">Cancelar</Button></Link>
            <Button onClick={submit} disabled={saving || !canSave} className="text-white px-6" style={{ background: NAVY }} data-testid="aluno-guardar">
              {saving ? "A registar…" : "Registar aluno"}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
