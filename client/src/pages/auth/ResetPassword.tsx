import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { Lock, Eye, EyeOff, ShieldCheck, CheckCircle2, XCircle } from "lucide-react";
import { useResetPassword } from "@/hooks/use-auth";


// Mirror of the server-side passwordSchema rules, for instant feedback.
const RULES = [
  { label: "Pelo menos 8 caracteres", test: (p: string) => p.length >= 8 },
  { label: "Uma letra minúscula", test: (p: string) => /[a-z]/.test(p) },
  { label: "Uma letra maiúscula", test: (p: string) => /[A-Z]/.test(p) },
  { label: "Um número", test: (p: string) => /[0-9]/.test(p) },
];

// function to reset the password using the taken and new password
export default function ResetPassword() {
  const [, navigate] = useLocation();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const reset = useResetPassword();

  const strong = RULES.every((r) => r.test(password));
  const matches = password.length > 0 && password === confirm;
  const canSubmit = !!token && strong && matches && !reset.isPending;


  //
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!token) {
      setError("Link inválido. Peça um novo link de reposição.");
      return;
    }
    if (!strong) {
      setError("A palavra-passe não cumpre os requisitos mínimos.");
      return;
    }
    if (!matches) {
      setError("As palavras-passe não coincidem.");
      return;
    }
    try {
      await reset.mutateAsync({ token, password });
      setDone(true);
      setTimeout(() => navigate("/login"), 2500);
    } catch (err: any) {
      setError(err?.message || "Não foi possível repor a palavra-passe.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080d1a] px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-50 dark:bg-blue-900/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        <div
          className="relative rounded-3xl p-10"
          style={{
            background: "rgba(255,255,255,0.97)",
            boxShadow:
              "0 0 0 1px rgba(226,232,240,0.8), 0 1px 0 0 rgba(255,255,255,0.9) inset, 0 24px 64px -12px rgba(37,99,235,0.13), 0 6px 20px -4px rgba(0,0,0,0.07)",
          }}
        >
          {done ? (
            <div className="space-y-4 text-center">
              <div className="h-16 w-16 rounded-[18px] flex items-center justify-center mx-auto" style={{ background: "linear-gradient(140deg, #059669 0%, #10b981 100%)" }}>
                <CheckCircle2 size={30} color="white" />
              </div>
              <h2 className="text-[24px] font-black tracking-tight text-gray-900">Palavra-passe alterada</h2>
              <p className="text-slate-400 text-[14px]">A redirecionar para o início de sessão…</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div className="h-16 w-16 rounded-[18px] flex items-center justify-center" style={{ background: "linear-gradient(140deg, #1e40af 0%, #3b82f6 100%)" }}>
                  <ShieldCheck size={28} color="white" />
                </div>
                <div>
                  <h2 className="text-[26px] font-black tracking-tight text-gray-900">Nova palavra-passe</h2>
                  <p className="text-slate-400 text-[14px] mt-1.5">Escolha uma palavra-passe forte para a sua conta.</p>
                </div>
              </div>

              {!token && (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderRadius: 11, background: "#fff5f5", border: "1px solid rgba(252,165,165,0.55)" }}>
                  <span className="h-[7px] w-[7px] rounded-full bg-red-400 flex-shrink-0" />
                  <p className="text-[12.5px] text-red-500 font-medium">Link inválido ou em falta. Peça um novo link.</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">Nova palavra-passe</label>
                  <div className="flex items-center gap-3 px-3.5" style={{ height: 54, borderRadius: 13, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                    <Lock size={15} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                    <input
                      type={show ? "text" : "password"}
                      autoFocus
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete="new-password"
                      className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-slate-300"
                    />
                    <button type="button" onClick={() => setShow((s) => !s)} className="p-1 text-slate-300 hover:text-slate-500" style={{ background: "none", border: "none", cursor: "pointer" }}>
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">Confirmar palavra-passe</label>
                  <div className="flex items-center gap-3 px-3.5" style={{ height: 54, borderRadius: 13, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                    <Lock size={15} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                    <input
                      type={show ? "text" : "password"}
                      placeholder="••••••••"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      autoComplete="new-password"
                      className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* strength checklist */}
                <div className="grid grid-cols-2 gap-1.5">
                  {RULES.map((r) => {
                    const ok = r.test(password);
                    return (
                      <div key={r.label} className="flex items-center gap-1.5">
                        {ok ? <CheckCircle2 size={13} className="text-emerald-500" /> : <XCircle size={13} className="text-slate-300" />}
                        <span className={`text-[11px] ${ok ? "text-emerald-600" : "text-slate-400"}`}>{r.label}</span>
                      </div>
                    );
                  })}
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 px-3.5 py-2.5" style={{ borderRadius: 11, background: "#fff5f5", border: "1px solid rgba(252,165,165,0.55)" }}>
                    <span className="h-[7px] w-[7px] rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-[12.5px] text-red-500 font-medium">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={!canSubmit}
                  className="w-full h-[52px] rounded-[13px] text-white font-bold text-[15px]"
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                    border: "none",
                    cursor: canSubmit ? "pointer" : "not-allowed",
                    opacity: canSubmit ? 1 : 0.55,
                  }}
                >
                  {reset.isPending ? "A guardar…" : "Repor palavra-passe"}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
