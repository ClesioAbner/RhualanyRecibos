// Formatação pt-PT consistente em toda a área admin.

/** Número monetário SEM sufixo: 3563 → "3.563,00". Junta-se " MT" no uso. */
export function formatMt(value: number | string | null | undefined): string {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return "0,00";
  return n.toLocaleString("pt-PT", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** Data → "07/05/2026". */
export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleDateString("pt-PT", { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** Data + hora → "07/05/2026 14:32". */
export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  return dt.toLocaleString("pt-PT", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Tempo relativo curto: "há 5 min", "há 2 h", "há 3 dias". */
export function formatRelative(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const dt = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return String(d);
  const secs = Math.round((Date.now() - dt.getTime()) / 1000);
  if (secs < 60) return "agora mesmo";
  const mins = Math.round(secs / 60);
  if (mins < 60) return `há ${mins} min`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `há ${days} dia${days !== 1 ? "s" : ""}`;
  return formatDate(dt);
}

/** Nº de recibo zero-padded: 1 → "RH-0001". */
export function receiptCode(n: number): string {
  return `RH-${String(n).padStart(4, "0")}`;
}

/**
 * Normaliza a apresentação da turma/classe.
 * "3" → "3ª"  ·  "5ª" → "5ª"  ·  "2ª Classe" → "2ª Classe"  ·  "" → "—".
 * Apenas acrescenta o "ª" a valores que sejam só um número.
 */
export function formatTurma(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  if (!s) return "—";
  return /^\d+$/.test(s) ? `${s}ª` : s;
}
