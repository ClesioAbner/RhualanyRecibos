import type { ClassRow, StudentRow } from "@shared/routes";
import { formatMt } from "@/lib/format";

type StudentPayload = {
  classId?: number;
  fullName?: string;
  internalNumber?: string;
  birthdate?: string;
  monthlyFeeOverride?: number;
  active?: boolean;
};

const show = (v: unknown) => (v === undefined || v === null || v === "" ? "—" : String(v));

/**
 * Lista legível ("Campo: antes → depois") das diferenças entre o aluno
 * guardado e o formulário, para mostrar no popup de confirmação.
 */
export function studentChanges(before: StudentRow, after: StudentPayload, classes: ClassRow[]): string[] {
  const className = (id?: number | null) => classes.find((c) => c.id === id)?.name ?? "—";
  const fee = (v: unknown) => (v === undefined || v === null || v === "" ? "da turma" : `${formatMt(Number(v))} MT`);
  const out: string[] = [];

  if (after.fullName !== undefined && after.fullName !== before.fullName)
    out.push(`Nome: ${before.fullName} → ${after.fullName}`);
  if (after.classId !== undefined && after.classId !== before.classId)
    out.push(`Turma: ${className(before.classId)} → ${className(after.classId)}`);
  if (show(after.internalNumber) !== show(before.internalNumber))
    out.push(`Nº interno: ${show(before.internalNumber)} → ${show(after.internalNumber)}`);
  if (show(after.birthdate) !== show(before.birthdate))
    out.push(`Data de nascimento: ${show(before.birthdate)} → ${show(after.birthdate)}`);
  if (fee(after.monthlyFeeOverride) !== fee(before.monthlyFeeOverride))
    out.push(`Mensalidade: ${fee(before.monthlyFeeOverride)} → ${fee(after.monthlyFeeOverride)}`);
  if (after.active !== undefined && after.active !== before.active)
    out.push(`Estado: ${before.active ? "activo" : "inactivo"} → ${after.active ? "activo" : "inactivo"}`);

  return out.length > 0 ? out : ["Nenhuma alteração detectada."];
}
