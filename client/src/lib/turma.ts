// Rótulos de turma / nível.

const LEVEL_LABELS: Record<string, string> = {
  bercario: "Berçário",
  pre_escolar: "Pré-escolar",
  primaria: "Primária",
  secundaria: "Secundária",
  outro: "Outro",
};

export function classLabel(level: string): string {
  return LEVEL_LABELS[level] ?? level;
}

/** Nome legível da turma. Ex.: "3ª Classe" → "Turma da 3ª Classe". */
export function turmaLabel(name: string): string {
  return name.startsWith("Turma") ? name : `Turma da ${name}`;
}
