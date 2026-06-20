import { ReactNode, useMemo } from "react";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import { useAdminStats, usePendingPayments } from "@/hooks/use-admin";
import { useMe } from "@/hooks/use-auth";
import { C } from "@/lib/adminColors";
import { formatMt } from "@/lib/format";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  LabelList,
} from "recharts";

const MONTHS_PT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
const monthLabel = (m: string) => {
  const n = Number(m.slice(5, 7));
  return n >= 1 && n <= 12 ? MONTHS_PT[n - 1] : m;
};

// Rampa monocromática de azuis (escuro → claro). O método com maior valor
// fica o azul mais escuro, por isso atribui-se por ordem (dados já vêm desc).
const BLUE_RAMP = ["#0d2d5e", "#16467f", "#1e64ad", "#1597e5", "#4aa8ec", "#86c5f3", "#b9def8"];
const blueAt = (i: number) => BLUE_RAMP[i % BLUE_RAMP.length];

// ───────────────────────── KPI: sem ícones, sem badges ─────────────────────────
function Kpi({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent: string }) {
  return (
    <AdminCard noPadding>
      <div style={{ height: 4, background: accent, borderTopLeftRadius: 14, borderTopRightRadius: 14 }} />
      <div className="px-6 py-5">
        <p style={{ fontFamily: "Georgia, serif", fontSize: 30, fontWeight: 700, color: C.navy, lineHeight: 1 }}>
          {value}
        </p>
        <p className="text-[13px] font-semibold mt-2" style={{ color: C.textPrimary }}>{label}</p>
        {sub && <p className="text-[11.5px] mt-0.5" style={{ color: C.textMuted }}>{sub}</p>}
      </div>
    </AdminCard>
  );
}

function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase mb-4" style={{ color: C.textMuted, letterSpacing: ".1em" }}>
      {children}
    </h2>
  );
}

function Spinner() {
  return (
    <div className="flex items-center gap-3 p-10" style={{ color: C.textSecondary }}>
      <span className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
      A carregar…
    </div>
  );
}

export default function AdminDashboard() {
  const { data: me } = useMe();
  const { data: stats, isLoading, error } = useAdminStats();
  const { data: pending } = usePendingPayments();

  const firstName = (me?.name ?? "").split(" ")[0] || "Administrador";
  const today = new Date().toLocaleDateString("pt-PT", { day: "2-digit", month: "long", year: "numeric" });

  const methods = useMemo(
    () => (stats?.paymentsByMethod ?? []).map((m, i) => ({ ...m, color: blueAt(i) })),
    [stats],
  );
  const methodsTotal = useMemo(() => methods.reduce((s, m) => s + m.total, 0), [methods]);

  const topClasses = useMemo(
    () =>
      [...(stats?.studentsByClass ?? [])]
        .filter((c) => c.count > 0)
        .sort((a, b) => b.count - a.count)
        .slice(0, 8)
        .map((c) => ({ name: c.name, alunos: c.count })),
    [stats],
  );
  const areaData = useMemo(
    () => (stats?.revenueByMonth ?? []).map((m) => ({ mes: monthLabel(m.month), total: m.total })),
    [stats],
  );

  return (
    <AdminShell title={`Bem-vindo, ${firstName}`} subtitle={today}>
      {isLoading && <Spinner />}
      {error && (
        <AdminCard><p className="text-sm font-semibold" style={{ color: C.error }}>Não foi possível carregar as estatísticas.</p></AdminCard>
      )}

      {stats && (
        <div className="space-y-5">
          {/* ── KPIs ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Kpi label="Recibos este mês" value={String(stats.totals.receiptsThisMonth)} sub="mês corrente" accent="#1a3a6b" />
            <Kpi label="Receita do mês" value={`${formatMt(stats.totals.revenueThisMonth)} MT`} sub="recebido este mês" accent="#1a3a6b" />
            <Kpi label="Alunos activos" value={String(stats.totals.activeStudents)} sub={`${stats.totals.students} no total`} accent="#1a3a6b" />
            <Kpi label="Mensalidades pendentes" value={String(pending?.length ?? 0)} sub="por liquidar este mês" accent="#1a3a6b" />
          </div>

          {/* ── meio: donut (métodos) + top turmas ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
            {/* donut pagamentos por método */}
            <AdminCard className="flex flex-col">
                <CardTitle>Pagamentos por método</CardTitle>
                {methods.length === 0 ? (
                  <p className="text-[13px] py-10 text-center flex-1" style={{ color: C.textMuted }}>Sem pagamentos registados.</p>
                ) : (
                  <div className="flex-1 flex flex-col sm:flex-row items-center gap-6">
                    <div className="relative" style={{ width: 180, height: 180, flexShrink: 0 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={methods} dataKey="total" nameKey="method" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none" isAnimationActive={false}>
                            {methods.map((m, i) => <Cell key={i} fill={m.color} />)}
                          </Pie>
                          <Tooltip formatter={(v: any, n: any) => [`${formatMt(Number(v))} MT`, n]} />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-[10px] uppercase" style={{ color: C.textMuted, letterSpacing: ".08em" }}>Total</span>
                        <span style={{ fontFamily: "Georgia, serif", fontSize: 18, fontWeight: 700, color: C.navy }}>
                          {formatMt(methodsTotal)}
                        </span>
                        <span className="text-[10px]" style={{ color: C.textMuted }}>MT</span>
                      </div>
                    </div>
                    <ul className="flex-1 w-full divide-y" style={{ borderColor: "#f1f5f9" }}>
                      {methods.map((m) => {
                        const pct = methodsTotal > 0 ? Math.round((m.total / methodsTotal) * 100) : 0;
                        return (
                          <li key={m.method} className="flex items-center justify-between gap-3 py-2.5">
                            <span className="flex items-center gap-2.5 min-w-0" style={{ color: C.textPrimary }}>
                              <span className="h-3 w-3 rounded-full flex-shrink-0" style={{ background: m.color }} />
                              <span className="truncate text-[13px] font-medium">{m.method}</span>
                            </span>
                            <span className="flex items-baseline gap-2 flex-shrink-0 tabular-nums">
                              <span className="text-[13px] font-bold" style={{ color: C.navy }}>{formatMt(m.total)}</span>
                              <span className="text-[11px]" style={{ color: C.textMuted }}>MT</span>
                              <span className="text-[12px] font-semibold w-9 text-right" style={{ color: C.textMuted }}>{pct}%</span>
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
            </AdminCard>

            {/* top turmas */}
            <AdminCard className="flex flex-col">
                <CardTitle>Top turmas por alunos</CardTitle>
                {topClasses.length === 0 ? (
                  <p className="text-[13px] py-10 text-center flex-1" style={{ color: C.textMuted }}>Sem alunos em turmas.</p>
                ) : (
                  <div className="flex-1" style={{ minHeight: 230 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={topClasses} margin={{ left: 8, right: 8, top: 24, bottom: 4 }} barCategoryGap="34%">
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eef2f7" />
                        <XAxis
                          dataKey="name"
                          interval={0}
                          tick={{ fontSize: 11.5, fill: C.textSecondary, fontWeight: 600 }}
                          axisLine={false}
                          tickLine={false}
                          dy={6}
                        />
                        <YAxis hide domain={[0, (max: number) => Math.ceil((max + 1) * 1.15)]} />
                        <Tooltip cursor={{ fill: "#f5f8fc" }} />
                        <Bar dataKey="alunos" fill="#1a3a6b" radius={[6, 6, 0, 0]} barSize={42} maxBarSize={48} isAnimationActive={false}>
                          <LabelList dataKey="alunos" position="top" offset={8} style={{ fill: C.navy, fontSize: 13, fontWeight: 700 }} />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
            </AdminCard>
          </div>

          {/* ── receita (área) + resumo ── */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-3">
              <AdminCard>
                <CardTitle>Receita — últimos 6 meses</CardTitle>
                {areaData.length === 0 ? (
                  <p className="text-[13px] py-10 text-center" style={{ color: C.textMuted }}>Sem dados de receita.</p>
                ) : (
                  <div style={{ height: 250 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={areaData} margin={{ left: 4, right: 12, top: 10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#1a3a6b" stopOpacity={0.16} />
                            <stop offset="100%" stopColor="#1a3a6b" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#eef2f7" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11.5, fill: C.textSecondary }} axisLine={false} tickLine={false} dy={6} />
                        <YAxis
                          tick={{ fontSize: 11, fill: C.textMuted }}
                          axisLine={false}
                          tickLine={false}
                          width={46}
                          tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}k` : String(v))}
                        />
                        <Tooltip
                          cursor={{ stroke: "#1597e5", strokeWidth: 1, strokeDasharray: "4 4" }}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e8ecf2", boxShadow: "0 8px 24px -8px rgba(13,45,94,0.2)", fontSize: 12 }}
                          formatter={(v: any) => [`${formatMt(Number(v))} MT`, "Receita"]}
                        />
                        <Area
                          type="monotone"
                          dataKey="total"
                          stroke="#1a3a6b"
                          strokeWidth={2.5}
                          fill="url(#rev)"
                          dot={{ r: 3, fill: "#fff", stroke: "#1a3a6b", strokeWidth: 2 }}
                          activeDot={{ r: 5, fill: "#1a3a6b", stroke: "#fff", strokeWidth: 2 }}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </AdminCard>
            </div>

            {/* resumo (sem ícones) */}
            <AdminCard>
              <CardTitle>Resumo</CardTitle>
              <div className="space-y-4">
                <div>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 28, fontWeight: 700, color: C.navy, lineHeight: 1 }}>
                    {stats.totals.students}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: C.textSecondary }}>alunos · {stats.totals.classes} turmas</p>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: "#f1f5f9" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: C.navy, lineHeight: 1 }}>
                    {formatMt(stats.totals.revenueTotal)} <span style={{ fontSize: 13, color: C.textMuted }}>MT</span>
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: C.textSecondary }}>receita total acumulada</p>
                </div>
                <div className="pt-3 border-t" style={{ borderColor: "#f1f5f9" }}>
                  <p style={{ fontFamily: "Georgia, serif", fontSize: 24, fontWeight: 700, color: C.navy, lineHeight: 1 }}>
                    {stats.totals.guardians}
                  </p>
                  <p className="text-[12px] mt-1" style={{ color: C.textSecondary }}>encarregados registados</p>
                </div>
              </div>
            </AdminCard>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
