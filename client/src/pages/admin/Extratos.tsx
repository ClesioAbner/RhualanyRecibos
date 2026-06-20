import { ReactNode, useMemo, useState } from "react";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import {
  useClasses,
  useStudents,
  useStatementMonthly,
  useStatementAnnual,
  useStatementStudent,
  useStatementsHistory,
  useDeleteStatement,
  downloadStatement,
} from "@/hooks/use-admin";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatDateTime } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import type { StatementMeta } from "@shared/routes";

const thisMonth = new Date().toISOString().slice(0, 7);
const thisYear = String(new Date().getFullYear());

const KIND_LABEL: Record<string, string> = {
  monthly: "Pagamentos do mês",
  annual: "Extrato anual",
  student: "Extrato por aluno",
};

function StatementCard({
  title, description, children, onGenerate, pending, disabled,
}: {
  title: string;
  description: string;
  children: ReactNode;
  onGenerate: () => void;
  pending: boolean;
  disabled?: boolean;
}) {
  return (
    <AdminCard noPadding>
      <div className="px-6 pt-5 pb-4 flex flex-col h-full">
        <h3 className="text-[15px] font-extrabold" style={{ color: C.navy }}>{title}</h3>
        <p className="text-[12.5px] mt-1" style={{ color: C.textSecondary }}>{description}</p>
        <div className="mt-4 space-y-3 flex-1">{children}</div>
        <Button onClick={onGenerate} disabled={pending || disabled} className="w-full mt-5 text-white font-semibold" style={{ background: "#1a3a6b" }}>
          {pending ? "A gerar…" : "Gerar PDF"}
        </Button>
      </div>
    </AdminCard>
  );
}

export default function AdminExtratos() {
  const { toast } = useToast();
  const { data: classes } = useClasses();
  const { data: students } = useStudents();
  const monthly = useStatementMonthly();
  const annual = useStatementAnnual();
  const perStudent = useStatementStudent();

  const [month, setMonth] = useState(thisMonth);
  const [year, setYear] = useState(thisYear);
  const [classId, setClassId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [studentYear, setStudentYear] = useState(thisYear);

  const [showDeleted, setShowDeleted] = useState(false);
  const { data: history, isLoading: histLoading } = useStatementsHistory(showDeleted);
  const deleteM = useDeleteStatement();
  const [toDelete, setToDelete] = useState<StatementMeta | null>(null);
  const [reason, setReason] = useState("");

  const studentsInClass = useMemo(
    () => (students ?? []).filter((s) => String(s.classId) === classId).sort((a, b) => a.fullName.localeCompare(b.fullName)),
    [students, classId],
  );

  const run = async (fn: () => Promise<unknown>) => {
    try {
      await fn();
      toast({ title: "Extrato gerado", description: "Guardado no histórico e descarregado." });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const reDownload = async (s: StatementMeta) => {
    try {
      await downloadStatement(s.id);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    try {
      await deleteM.mutateAsync({ id: toDelete.id, reason: reason.trim() });
      toast({ title: "Extrato eliminado" });
      setToDelete(null);
      setReason("");
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminShell title="Extratos" subtitle="Relatórios financeiros em PDF">
      {/* geradores */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
        <StatementCard title="Pagamentos do mês" description="Estado de pagamento das mensalidades, por turma (pagos e em atraso)." pending={monthly.isPending} onGenerate={() => run(() => monthly.mutateAsync(month))}>
          <div className="space-y-1.5">
            <Label>Mês de referência</Label>
            <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} data-testid="extrato-month" />
          </div>
        </StatementCard>

        <StatementCard title="Extrato anual" description="Resumo mês a mês da receita de um ano lectivo." pending={annual.isPending} onGenerate={() => run(() => annual.mutateAsync(year))}>
          <div className="space-y-1.5">
            <Label>Ano</Label>
            <Input type="number" min={2000} max={2100} value={year} onChange={(e) => setYear(e.target.value)} data-testid="extrato-year" />
          </div>
        </StatementCard>

        <StatementCard title="Extrato por aluno" description="Primeiro escolha a turma, depois o aluno." pending={perStudent.isPending} disabled={!studentId} onGenerate={() => run(() => perStudent.mutateAsync({ studentId: Number(studentId), year: studentYear }))}>
          <div className="space-y-1.5">
            <Label>1. Turma</Label>
            <Select value={classId} onValueChange={(v) => { setClassId(v); setStudentId(""); }}>
              <SelectTrigger data-testid="extrato-turma"><SelectValue placeholder="Selecionar turma" /></SelectTrigger>
              <SelectContent>
                {(classes ?? []).map((c) => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>2. Aluno</Label>
            <Select value={studentId} onValueChange={setStudentId} disabled={!classId}>
              <SelectTrigger data-testid="extrato-aluno">
                <SelectValue placeholder={classId ? "Selecionar aluno" : "Escolha a turma primeiro"} />
              </SelectTrigger>
              <SelectContent>
                {studentsInClass.length === 0 ? (
                  <div className="px-3 py-2 text-[12px]" style={{ color: C.textMuted }}>Sem alunos nesta turma</div>
                ) : (
                  studentsInClass.map((s) => <SelectItem key={s.id} value={String(s.id)}>{s.fullName}</SelectItem>)
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>3. Ano</Label>
            <Input type="number" min={2000} max={2100} value={studentYear} onChange={(e) => setStudentYear(e.target.value)} />
          </div>
        </StatementCard>
      </div>

      {/* histórico */}
      <div className="mt-6">
        <AdminCard noPadding>
          <div className="flex items-center justify-between px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder }}>
            <div>
              <h2 className="text-[13px] font-bold" style={{ color: C.navy }}>Histórico de extratos</h2>
              <p className="text-[11.5px]" style={{ color: C.textMuted }}>Todos os extratos gerados ficam registados para controlo.</p>
            </div>
            <label className="flex items-center gap-2 text-[12.5px]" style={{ color: C.textSecondary }}>
              <input type="checkbox" checked={showDeleted} onChange={(e) => setShowDeleted(e.target.checked)} className="h-4 w-4" />
              Mostrar eliminados
            </label>
          </div>

          {histLoading ? (
            <p className="px-5 py-8 text-center text-[13px]" style={{ color: C.textMuted }}>A carregar…</p>
          ) : (history?.length ?? 0) === 0 ? (
            <p className="px-5 py-10 text-center text-[13px]" style={{ color: C.textMuted }}>Ainda não foi gerado nenhum extrato.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ color: C.textMuted }} className="text-[10.5px] uppercase tracking-wide border-b">
                    <th className="text-left font-semibold px-5 py-3">Tipo</th>
                    <th className="text-left font-semibold px-3 py-3">Descrição</th>
                    <th className="text-left font-semibold px-3 py-3">Gerado por</th>
                    <th className="text-left font-semibold px-3 py-3">Data</th>
                    <th className="text-right font-semibold px-5 py-3">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {(history ?? []).map((s) => {
                    const deleted = !!s.deletedAt;
                    return (
                      <tr key={s.id} data-testid={`extrato-row-${s.id}`} className="border-t" style={{ borderColor: "#f3f5f8", opacity: deleted ? 0.55 : 1 }}>
                        <td className="px-5 py-2.5" style={{ color: C.textSecondary }}>{KIND_LABEL[s.kind] ?? s.kind}</td>
                        <td className="px-3 py-2.5 font-medium" style={{ color: C.textPrimary }}>
                          {s.label}
                          {deleted && (
                            <span className="block text-[11px] font-normal" style={{ color: C.textMuted }} title={s.deleteReason ?? ""}>
                              Eliminado{s.deleteReason ? ` · ${s.deleteReason}` : ""}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: C.textSecondary }}>{s.generatedByEmail ?? "—"}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap" style={{ color: C.textSecondary }}>{formatDateTime(s.createdAt)}</td>
                        <td className="px-5 py-2.5">
                          {deleted ? (
                            <span className="text-[12px]" style={{ color: C.textMuted }}>—</span>
                          ) : (
                            <div className="flex items-center justify-end gap-2">
                              <button onClick={() => reDownload(s)} className="text-[12.5px] font-semibold" style={{ color: C.navy }} data-testid={`extrato-download-${s.id}`}>Re-baixar</button>
                              <span style={{ color: "#d8dee8" }}>·</span>
                              <button onClick={() => { setToDelete(s); setReason(""); }} className="text-[12.5px] font-semibold" style={{ color: C.error }} data-testid={`extrato-delete-${s.id}`}>Eliminar</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </AdminCard>
      </div>

      {/* eliminar com justificação */}
      <Dialog open={!!toDelete} onOpenChange={(o) => { if (!o) { setToDelete(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eliminar extrato</DialogTitle></DialogHeader>
          <div className="space-y-3 py-1">
            <p className="text-[13px]" style={{ color: C.textSecondary }}>
              Vai eliminar <b>{toDelete?.label}</b>. O registo fica no histórico (marcado como eliminado) com a justificação abaixo.
            </p>
            <div className="space-y-1.5">
              <Label>Justificação</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Ex.: gerado por engano / dados incorrectos" data-testid="extrato-delete-reason" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setToDelete(null); setReason(""); }}>Cancelar</Button>
            <Button onClick={confirmDelete} disabled={deleteM.isPending || reason.trim().length < 3} className="text-white" style={{ background: C.error }} data-testid="extrato-delete-confirm">
              {deleteM.isPending ? "A eliminar…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
