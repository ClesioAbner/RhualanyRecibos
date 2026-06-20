import { useState } from "react";
import { useLocation } from "wouter";
import { Mail, ArrowLeft, MailCheck } from "lucide-react";
import { useForgotPassword } from "@/hooks/use-auth";

export default function ForgotPassword() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const forgot = useForgotPassword();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    try {
      await forgot.mutateAsync({ email });
    } catch {
      /* endpoint is always 204; ignore */
    }
    setSent(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#080d1a] px-6 py-12 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-50 dark:bg-blue-900/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

      <div className="w-full max-w-[440px] relative z-10">
        <div
          className="relative rounded-3xl p-10"
          style={{
            background: "rgba(255,255,255,0.97)",
            boxShadow:
              "0 0 0 1px rgba(226,232,240,0.8), 0 1px 0 0 rgba(255,255,255,0.9) inset, 0 24px 64px -12px rgba(37,99,235,0.13), 0 6px 20px -4px rgba(0,0,0,0.07)",
          }}
        >
          {sent ? (
            <div className="space-y-5 text-center">
              <div
                className="h-16 w-16 rounded-[18px] flex items-center justify-center mx-auto"
                style={{ background: "linear-gradient(140deg, #059669 0%, #10b981 100%)" }}
              >
                <MailCheck size={30} color="white" />
              </div>
              <div>
                <h2 className="text-[24px] font-black tracking-tight text-gray-900">Verifique o seu email</h2>
                <p className="text-slate-400 text-[14px] mt-2 leading-relaxed">
                  Se existir uma conta associada a <span className="font-semibold text-slate-600">{email}</span>,
                  enviámos um link para repor a palavra-passe. O link expira em 30 minutos.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/login")}
                className="text-[13px] font-semibold text-blue-500 hover:text-blue-700"
                style={{ background: "none", border: "none", cursor: "pointer" }}
              >
                ← Voltar ao início de sessão
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="space-y-4">
                <div
                  className="h-16 w-16 rounded-[18px] flex items-center justify-center"
                  style={{ background: "linear-gradient(140deg, #1e40af 0%, #3b82f6 100%)" }}
                >
                  <Mail size={28} color="white" />
                </div>
                <div>
                  <h2 className="text-[26px] font-black tracking-tight text-gray-900">Esqueceu a palavra-passe?</h2>
                  <p className="text-slate-400 text-[14px] mt-1.5 leading-relaxed">
                    Introduza o seu email e enviaremos um link para a repor.
                  </p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                <div className="space-y-1.5">
                  <label htmlFor="email" className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Email institucional
                  </label>
                  <div className="flex items-center gap-3 px-3.5" style={{ height: 54, borderRadius: 13, border: "1.5px solid #e2e8f0", background: "#f8fafc" }}>
                    <Mail size={15} style={{ color: "#cbd5e1", flexShrink: 0 }} />
                    <input
                      id="email"
                      type="email"
                      autoFocus
                      placeholder="utilizador@rhulany.mz"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={forgot.isPending}
                  className="w-full h-[52px] rounded-[13px] text-white font-bold text-[15px]"
                  style={{
                    background: "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                    border: "none",
                    cursor: forgot.isPending ? "not-allowed" : "pointer",
                    opacity: forgot.isPending ? 0.6 : 1,
                  }}
                >
                  {forgot.isPending ? "A enviar…" : "Enviar link de reposição"}
                </button>

                <button
                  type="button"
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 mx-auto text-[12px] font-semibold text-slate-400 hover:text-slate-600 transition-colors"
                  style={{ background: "none", border: "none", cursor: "pointer" }}
                >
                  <ArrowLeft size={13} /> Voltar
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
