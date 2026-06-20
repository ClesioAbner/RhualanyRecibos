// Paleta institucional da área ADMIN — usa as cores do próprio site
// (navy da marca + azul primário), sem dourado.
export const ADMIN_COLORS = {
  navy: "#1a3a6b", // Primary — títulos, valores
  navyDark: "#16243c", // Topo do gradiente da sidebar
  navyMed: "#1e4f8f", // Gradientes / realces
  accent: "#1597e5", // Destaque secundário (azul do site)
  accentDark: "#1170b8", // CTAs principais
  bg: "#eef3f8", // Fundo das páginas
  cardBorder: "#e8ecf2",
  textPrimary: "#0f172a", // slate-900
  textSecondary: "#64748b", // slate-500
  textMuted: "#94a3b8", // slate-400

  error: "#dc2626",
  success: "#16a34a",
  warning: "#d97706",
} as const;

export const C = ADMIN_COLORS;

export type AdminTone = "navy" | "accent" | "ok" | "warning";
