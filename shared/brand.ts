/**
 * Identidade institucional — fonte única de verdade.
 * Usada no cliente (UI) e no servidor (PDF dos recibos). Alterar aqui reflete
 * em toda a aplicação, evitando nomes/slogans divergentes.
 */
export const BRAND = {
  /** Pequeno rótulo acima do nome (ex.: no cabeçalho). */
  eyebrow: "Colégio",
  /** Nome curto. */
  name: "Rhulany",
  /** Nome completo, para títulos e documentos. */
  full: "Colégio Rhulany",
  /** Lema institucional. */
  slogan: "Educação com qualidade e excelência",
  /** Dados impressos no cabeçalho dos recibos. */
  address: "Av. Acordos de Lusaka i nº 1251",
  nuit: "121815559",
  phone: "826 116 720 / 848 067 954",
} as const;
