import { useMemo } from "react";
import { Link } from "wouter";
import AppShell from "@/components/layout/AppShell";
import { UserAvatar } from "@/components/UserAvatar";
import { useMe } from "@/hooks/use-auth";
import { useReceipts } from "@/hooks/use-receipts";
import { useStudents, useClasses } from "@/hooks/use-admin";
import { formatMt as fmtMt, formatDate as fmtDate, receiptCode, formatTurma } from "@/lib/format";
import { NAVY, INK, MUTED, LINE, FAINT, CARD_SHADOW } from "@/lib/theme";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 19) return "Boa tarde";
  return "Boa noite";
}

function Kpi({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="bg-white rounded-xl border px-5 py-[18px]" style={{ borderColor: LINE, boxShadow: CARD_SHADOW }}>
      <p className="text-[10.5px] font-semibold uppercase" style={{ color: MUTED, letterSpacing: ".09em" }}>{label}</p>
      <p className="mt-2.5 tabular-nums" style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 29, fontWeight: 700, color: NAVY, lineHeight: 1 }}>{value}</p>
      <p className="mt-2 text-[11px]" style={{ color: FAINT }}>{sub}</p>
    </div>
  );
}

export default function Home() {
  const { data: me } = useMe();
  const { data: receipts } = useReceipts();
  const { data: students } = useStudents({ active: true });
  const { data: classes } = useClasses();

  const firstName = (me?.name ?? "").split(" ")[0] || "Utilizador";
  const today = new Date().toLocaleDateString("pt-PT", { weekday: "long", day: "2-digit", month: "long", year: "numeric" });
  const month = new Date().toISOString().slice(0, 7);
  const monthLabel = cap(new Date().toLocaleDateString("pt-PT", { month: "long", year: "numeric" }));

  const classMap = useMemo(() => {
    const m = new Map<number, string>();
    (classes ?? []).forEach((c) => m.set(c.id, c.name));
    return m;
  }, [classes]);

  const stats = useMemo(() => {
    const live = (receipts ?? []).filter((r) => !r.deletedAt);
    const inMonth = live.filter((r) => String(r.issueDate).slice(0, 7) === month);
    // Alunos activos sem recibo de MENSALIDADE do mês corrente.
    const paidThisMonth = new Set(
      live
        .filter((r) => r.receiptType === "mensalidade" && r.referenceMonth === month && r.studentId != null)
        .map((r) => r.studentId),
    );
    const pending = (students ?? []).filter((s) => !paidThisMonth.has(s.id));
    return {
      monthCount: inMonth.length,
      monthRevenue: inMonth.reduce((s, r) => s + (Number(r.amountPaid) || 0), 0),
      total: live.length,
      students: students?.length ?? 0,
      recent: live.slice(0, 5),
      pending,
    };
  }, [receipts, students, month]);

  return (
    <AppShell>
      <div className="space-y-6">
        {/* ── cabeçalho de boas-vindas (sóbrio) ── */}
        <div className="flex items-center gap-4 bg-white rounded-2xl border px-6 py-5" style={{ borderColor: LINE, boxShadow: CARD_SHADOW }}>
          <UserAvatar name={me?.name ?? "U"} src={me?.avatarUrl} size={52} rounded={999} />
          <div className="min-w-0">
            <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 24, fontWeight: 700, color: NAVY, lineHeight: 1.05 }}>
              {greeting()}, {firstName}
            </h1>
            <p className="text-[12.5px] mt-1 capitalize" style={{ color: MUTED }}>{today}</p>
          </div>
        </div>

        {/* ── KPIs (uniformes, navy) ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Kpi label="Recibos este mês" value={String(stats.monthCount)} sub={monthLabel} />
          <Kpi label="Receita do mês" value={`${fmtMt(stats.monthRevenue)} MT`} sub={monthLabel} />
          <Kpi label="Total de recibos" value={String(stats.total)} sub="Desde o início" />
          <Kpi label="Alunos activos" value={String(stats.students)} sub="Matriculados" />
        </div>

        {/* ── conteúdo (colunas equilibradas) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
          {/* recibos recentes (tabela) */}
          <div className="lg:col-span-2 bg-white rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: LINE, boxShadow: CARD_SHADOW }}>
            <div className="flex items-center justify-between px-6 py-3.5 border-b" style={{ borderColor: LINE }}>
              <h2 className="text-[13.5px] font-bold" style={{ color: NAVY }}>Recibos recentes</h2>
              <Link href="/recibos" className="inline-flex items-center gap-1 text-[12px] font-semibold hover:gap-1.5 transition-all" style={{ color: NAVY }}>
                Ver todos <span aria-hidden>→</span>
              </Link>
            </div>
            {stats.recent.length === 0 ? (
              <div className="flex-1 flex items-center justify-center px-5 py-16 text-center text-[13px]" style={{ color: FAINT }}>
                Ainda não há recibos emitidos.
              </div>
            ) : (
              <table className="w-full text-[13px]">
                <thead>
                  <tr style={{ color: MUTED, background: "#fafbfd" }} className="text-[10px] uppercase border-b" >
                    <th className="text-left font-semibold px-6 py-2.5" style={{ letterSpacing: ".06em", borderColor: LINE }}>Nº</th>
                    <th className="text-left font-semibold px-3 py-2.5" style={{ letterSpacing: ".06em" }}>Aluno</th>
                    <th className="text-left font-semibold px-3 py-2.5" style={{ letterSpacing: ".06em" }}>Turma</th>
                    <th className="text-left font-semibold px-3 py-2.5" style={{ letterSpacing: ".06em" }}>Data</th>
                    <th className="text-right font-semibold px-6 py-2.5" style={{ letterSpacing: ".06em" }}>Valor (MT)</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recent.map((r) => (
                    <tr key={r.id} className="border-t transition-colors hover:bg-[#f7fafd]" style={{ borderColor: "#f3f5f8" }}>
                      <td className="px-6 py-3 font-semibold tabular-nums" style={{ color: NAVY }}>{receiptCode(r.receiptNumber)}</td>
                      <td className="px-3 py-3 font-medium" style={{ color: INK }}>{r.studentName}</td>
                      <td className="px-3 py-3" style={{ color: MUTED }}>{formatTurma(r.studentClass)}</td>
                      <td className="px-3 py-3" style={{ color: MUTED }}>{fmtDate(r.issueDate)}</td>
                      <td className="px-6 py-3 text-right font-bold tabular-nums" style={{ color: INK }}>{fmtMt(r.amountPaid)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* coluna direita: acessos rápidos (preenche a altura da tabela) */}
          <div className="bg-white rounded-2xl border overflow-hidden flex flex-col" style={{ borderColor: LINE, boxShadow: CARD_SHADOW }}>
            <div className="px-6 py-3.5 border-b" style={{ borderColor: LINE }}>
              <h2 className="text-[13.5px] font-bold" style={{ color: NAVY }}>Acessos rápidos</h2>
            </div>
            <div className="flex-1 flex flex-col">
              {[
                { href: "/emitir", title: "Emitir recibo", desc: "Gerar o recibo do mês" },
                { href: "/recibos", title: "Consultar recibos", desc: "Pesquisar e descarregar" },
                { href: "/definicoes", title: "Definições", desc: "Secretaria e colégio" },
              ].map((a) => (
                <Link key={a.href} href={a.href} className="group flex-1 flex items-center justify-between gap-3 px-6 py-4 border-b last:border-0 transition-colors hover:bg-[#f7fafd]" style={{ borderColor: "#f3f5f8" }}>
                  <div className="min-w-0">
                    <p className="text-[13.5px] font-semibold" style={{ color: NAVY }}>{a.title}</p>
                    <p className="text-[11.5px] mt-0.5" style={{ color: MUTED }}>{a.desc}</p>
                  </div>
                  <span className="text-[15px] font-bold flex-shrink-0 transition-all group-hover:translate-x-0.5" style={{ color: "#cbd5e1" }} aria-hidden>›</span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ── mensalidades por receber este mês ── */}
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: LINE, boxShadow: CARD_SHADOW }}>
          <div className="flex items-center justify-between px-6 py-3.5 border-b" style={{ borderColor: LINE }}>
            <div>
              <h2 className="text-[13.5px] font-bold" style={{ color: NAVY }}>Mensalidades por receber</h2>
              <p className="text-[11.5px] mt-0.5 capitalize" style={{ color: MUTED }}>{monthLabel}</p>
            </div>
            <span className="text-[12.5px] font-semibold tabular-nums" style={{ color: stats.pending.length ? NAVY : "#16a34a" }}>
              {stats.pending.length} {stats.pending.length === 1 ? "aluno" : "alunos"}
            </span>
          </div>

          {stats.pending.length === 0 ? (
            <div className="px-6 py-10 text-center text-[13px]" style={{ color: FAINT }}>
              Todas as mensalidades deste mês estão em dia.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                {stats.pending.slice(0, 12).map((s) => (
                  <Link
                    key={s.id}
                    href={`/emitir?student=${s.id}`}
                    className="group flex items-center justify-between gap-3 px-6 py-3.5 border-b transition-colors hover:bg-[#f7fafd]"
                    style={{ borderColor: "#f3f5f8" }}
                  >
                    <div className="min-w-0">
                      <p className="text-[13.5px] font-medium truncate" style={{ color: INK }}>{s.fullName}</p>
                      <p className="text-[11.5px]" style={{ color: MUTED }}>{classMap.get(s.classId) ?? "—"}</p>
                    </div>
                    <span className="text-[12px] font-semibold flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: NAVY }} aria-hidden>Emitir →</span>
                  </Link>
                ))}
              </div>
              {stats.pending.length > 12 && (
                <p className="px-6 py-3 text-[12px] border-t" style={{ color: MUTED, borderColor: LINE }}>
                  e mais {stats.pending.length - 12} aluno{stats.pending.length - 12 === 1 ? "" : "s"} por receber.
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}
