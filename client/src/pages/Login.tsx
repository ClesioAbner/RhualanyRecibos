import { useState } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";

const DEMO_EMAIL    = "admin@rhulany.ac.mz";
const DEMO_PASSWORD = "admin123";

/* ─────────────────────────── LOADER ─────────────────────────── */
function PageLoader() {
  const word = "Colégio Rhulany";
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-10"
      style={{ background: "linear-gradient(145deg,#0f172a 0%,#1e3a5f 55%,#1e3a8a 100%)" }}
    >
      <img src="/colegio.png" alt="logo"
           className="h-20 w-20 object-contain rounded-2xl shadow-2xl opacity-90" />

      <p className="flex select-none">
        {word.split("").map((ch, i) => (
          <span key={i} className="text-white font-black text-3xl"
                style={{
                  display: "inline-block",
                  animation: "wave 1.4s ease-in-out infinite",
                  animationDelay: `${i * 0.07}s`,
                  minWidth: ch === " " ? "14px" : undefined,
                }}>
            {ch === " " ? "\u00a0" : ch}
          </span>
        ))}
      </p>

      <div className="w-72 space-y-3">
        <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
          <div className="h-full rounded-full"
               style={{
                 background: "linear-gradient(90deg,#60a5fa,#a78bfa)",
                 /* ✅ CORRIGIDO: sincronizado com o setTimeout de 3s */
                 animation: "fillbar 3s linear forwards",
               }} />
        </div>
        <p className="text-blue-300/50 text-xs text-center tracking-[0.2em] uppercase">
          A iniciar o sistema…
        </p>
      </div>

      <style>{`
        @keyframes wave {
          0%,100% { transform:translateY(0); color:white; }
          50%      { transform:translateY(-14px); color:#93c5fd; }
        }
        @keyframes fillbar { from{width:0%} to{width:100%} }
      `}</style>
    </div>
  );
}

/* ────────────────────── CUSTOM BUTTON ───────────────────────── */
function EnterButton({ disabled }: { disabled?: boolean }) {
  return (
    <>
      <button
        type="submit"
        disabled={disabled}
        className="cssbuttons-io-button"
        style={{ opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer" }}
      >
        Entrar na plataforma
        <div className="icon">
          <svg height={24} width={24} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 0h24v24H0z" fill="none" />
            <path d="M16.172 11l-5.364-5.364 1.414-1.414L20 12l-7.778 7.778-1.414-1.414L16.172 13H4v-2z" fill="currentColor" />
          </svg>
        </div>
      </button>

      <style>{`
        .cssbuttons-io-button {
          background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%);
          color: white;
          font-family: inherit;
          padding: 0.35em;
          padding-left: 1.4em;
          font-size: 15px;
          font-weight: 700;
          border-radius: 0.9em;
          border: none;
          letter-spacing: 0.03em;
          display: flex;
          align-items: center;
          box-shadow: inset 0 0 1.6em -0.6em #1d4ed8, 0 4px 24px -4px rgba(37,99,235,0.45);
          overflow: hidden;
          position: relative;
          height: 3.2em;
          padding-right: 3.6em;
          width: 100%;
          transition: box-shadow 0.3s, transform 0.2s;
        }
        .cssbuttons-io-button:hover {
          box-shadow: inset 0 0 1.6em -0.6em #1d4ed8, 0 8px 32px -4px rgba(37,99,235,0.6);
          transform: translateY(-1px);
        }
        .cssbuttons-io-button:active { transform: translateY(0); }
        .cssbuttons-io-button .icon {
          background: white;
          margin-left: 1em;
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
          height: 2.4em;
          width: 2.4em;
          border-radius: 0.7em;
          box-shadow: 0.1em 0.1em 0.6em 0.2em rgba(37,99,235,0.35);
          right: 0.3em;
          transition: all 0.3s;
        }
        .cssbuttons-io-button:hover .icon { width: calc(100% - 0.6em); }
        .cssbuttons-io-button .icon svg {
          width: 1.1em;
          transition: transform 0.3s;
          color: #2563eb;
        }
        .cssbuttons-io-button:hover .icon svg { transform: translateX(0.1em); }
        .cssbuttons-io-button:active .icon   { transform: scale(0.95); }
      `}</style>
    </>
  );
}

/* ─────────────────────────── LOGIN ──────────────────────────── */
export default function Login() {
  const [, navigate]          = useLocation();
  const [show, setShow]       = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm]       = useState({ email: "", password: "" });
  const [error, setError]     = useState("");
  const [focused, setFocused] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!form.email || !form.password) {
      setError("Por favor preencha todos os campos.");
      return;
    }

    if (form.email === DEMO_EMAIL && form.password === DEMO_PASSWORD) {
      localStorage.setItem("auth", "true");
      localStorage.setItem("auth_user", JSON.stringify({ name: "Administrador", email: form.email }));
      setLoading(true);
      /* ✅ CORRIGIDO: 3s em vez de 10s, sincronizado com a barra de loading */
      setTimeout(() => navigate("/recibos"), 3000);
    } else {
      setError("Email ou palavra-passe incorretos.");
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="min-h-screen flex">

      {/* ══════ LEFT — imagem ══════ */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <img
          src="/nigga.jpg"
          alt="Colégio Rhulany"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0"
             style={{ background: "linear-gradient(to bottom, rgba(5,10,25,0.45) 0%, rgba(5,10,25,0.2) 40%, rgba(5,10,25,0.82) 100%)" }} />
        <div className="absolute top-10 left-10 flex items-center gap-3 z-10">
          <div className="h-13 w-13 rounded-2xl bg-white/15 border border-white/25 backdrop-blur-md flex items-center justify-center overflow-hidden shadow-2xl"
               style={{ height: 52, width: 52 }}>
            <img src="/colegio.png" alt="" className="h-10 w-10 object-contain" />
          </div>
          <div>
            <p className="text-white/55 text-[11px] uppercase tracking-[0.28em] font-semibold">Colégio</p>
            <h1 className="text-white text-lg font-black tracking-tight drop-shadow-md">Rhulany</h1>
          </div>
        </div>
        <div className="absolute bottom-12 left-10 right-10 z-10 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-px w-8 bg-blue-400/60" />
            <p className="text-blue-200/70 text-sm font-medium italic tracking-wide">
              Educação com qualidade e excelência
            </p>
          </div>
        </div>
      </div>

      {/* ══════ RIGHT — formulário ══════ */}
      <div className="flex-1 flex flex-col justify-center items-center bg-white dark:bg-[#080d1a] relative overflow-hidden px-8 py-12">

        {/* glows de fundo */}
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-50 dark:bg-blue-900/10 blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-indigo-50 dark:bg-indigo-900/10 blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* mobile logo */}
        <div className="lg:hidden flex items-center gap-3 mb-10">
          <img src="/colegio.png" alt="" className="h-12 w-12 object-contain rounded-xl" />
          <div>
            <p className="text-gray-400 text-xs uppercase tracking-widest">Colégio</p>
            <h1 className="text-gray-900 dark:text-white text-lg font-black">Rhulany</h1>
          </div>
        </div>

        <div className="w-full max-w-[460px] relative z-10">

          {/* ══════ CARD ══════ */}
          <div
            className="relative rounded-3xl p-10"
            style={{
              background: "rgba(255,255,255,0.97)",
              boxShadow:
                "0 0 0 1px rgba(226,232,240,0.8), 0 1px 0 0 rgba(255,255,255,0.9) inset, 0 24px 64px -12px rgba(37,99,235,0.13), 0 6px 20px -4px rgba(0,0,0,0.07)",
            }}
          >
            {/* Top shimmer accent */}
            <div
              className="absolute top-0 left-10 right-10 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(148,163,184,0.5), transparent)" }}
            />

            <div className="space-y-6">

              {/* ── HEADER ── */}
              <div className="space-y-4">
                <div
                  className="h-16 w-16 rounded-[18px] flex items-center justify-center overflow-hidden"
                  style={{
                    background: "linear-gradient(140deg, #1e40af 0%, #3b82f6 100%)",
                    boxShadow: "0 8px 20px -4px rgba(37,99,235,0.45), inset 0 1px 0 rgba(255,255,255,0.25)",
                  }}
                >
                  <img src="/colegio.png" alt="" className="h-12 w-12 object-contain" />
                </div>

                <div>
                  <h2
                    className="text-[32px] font-black leading-[1.15] tracking-tight text-gray-900"
                    style={{ letterSpacing: "-0.022em" }}
                  >
                    Bem-vindo{" "}
                    <span
                      className="text-transparent bg-clip-text"
                      style={{ backgroundImage: "linear-gradient(125deg, #2563eb 20%, #818cf8 100%)" }}
                    >
                      de volta
                    </span>
                  </h2>
                  <p className="text-slate-400 text-[14px] mt-1.5 leading-relaxed">
                    Inicie sessão para aceder ao sistema de gestão.
                  </p>
                </div>
              </div>

              {/* ── DIVIDER ── */}
              <div
                className="h-px"
                style={{ background: "linear-gradient(90deg, transparent, #e2e8f0 25%, #e2e8f0 75%, transparent)" }}
              />

              {/* ✅ CORRIGIDO: <form> envolve TODOS os campos e o botão */}
              <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Email */}
                <div className="space-y-1.5">
                  <label htmlFor="email"
                    className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">
                    Email institucional
                  </label>
                  <div
                    className="flex items-center gap-3 px-3.5"
                    style={{
                      height: 54,
                      borderRadius: 13,
                      border: focused === "email" ? "1.5px solid #3b82f6" : "1.5px solid #e2e8f0",
                      background: focused === "email" ? "rgba(239,246,255,0.7)" : "#f8fafc",
                      boxShadow: focused === "email" ? "0 0 0 3.5px rgba(59,130,246,0.1)" : "0 1px 2px rgba(0,0,0,0.03)",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <Mail
                      size={15}
                      style={{ color: focused === "email" ? "#3b82f6" : "#cbd5e1", flexShrink: 0, transition: "color 0.18s" }}
                    />
                    <input
                      id="email"
                      type="email"
                      placeholder="utilizador@rhulany.ac.mz"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      autoComplete="email"
                      className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-slate-300"
                    />
                  </div>
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password"
                      className="block text-[10.5px] font-bold uppercase tracking-[0.13em] text-slate-400">
                      Palavra-passe
                    </label>
                    <button
                      type="button"
                      className="text-[12px] font-semibold text-blue-500 hover:text-blue-700 transition-colors"
                      style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
                    >
                      Esqueceu?
                    </button>
                  </div>
                  <div
                    className="flex items-center gap-3 px-3.5"
                    style={{
                      height: 54,
                      borderRadius: 13,
                      border: focused === "password" ? "1.5px solid #3b82f6" : "1.5px solid #e2e8f0",
                      background: focused === "password" ? "rgba(239,246,255,0.7)" : "#f8fafc",
                      boxShadow: focused === "password" ? "0 0 0 3.5px rgba(59,130,246,0.1)" : "0 1px 2px rgba(0,0,0,0.03)",
                      transition: "all 0.18s ease",
                    }}
                  >
                    <Lock
                      size={15}
                      style={{ color: focused === "password" ? "#3b82f6" : "#cbd5e1", flexShrink: 0, transition: "color 0.18s" }}
                    />
                    <input
                      id="password"
                      type={show ? "text" : "password"}
                      placeholder="••••••••"
                      value={form.password}
                      onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                      onFocus={() => setFocused("password")}
                      onBlur={() => setFocused(null)}
                      autoComplete="current-password"
                      className="flex-1 bg-transparent outline-none text-[14px] text-gray-900 placeholder:text-slate-300"
                    />
                    <button
                      type="button"
                      onClick={() => setShow(s => !s)}
                      className="p-1 text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0"
                      style={{ background: "none", border: "none", cursor: "pointer" }}
                    >
                      {show ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <div
                    className="flex items-center gap-2.5 px-3.5 py-2.5"
                    style={{
                      borderRadius: 11,
                      background: "#fff5f5",
                      border: "1px solid rgba(252,165,165,0.55)",
                      animation: "errshake 0.36s cubic-bezier(.36,.07,.19,.97)",
                    }}
                  >
                    <span className="h-[7px] w-[7px] rounded-full bg-red-400 flex-shrink-0" />
                    <p className="text-[12.5px] text-red-500 font-medium">{error}</p>
                  </div>
                )}

                {/* ✅ EnterButton DENTRO do <form> — type="submit" funciona corretamente */}
                <EnterButton disabled={loading} />

                {/* Lock note */}
                <div className="flex items-center justify-center gap-1.5 pt-0.5">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5"
                    style={{ color: "#cbd5e1" }}>
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                  <p className="text-[11px] text-slate-300 tracking-wide font-light">
                    Ligação segura · Área restrita
                  </p>
                </div>

              </form>
              {/* ✅ </form> fecha aqui */}

            </div>
          </div>

          {/* slogan abaixo do card */}
          <div className="mt-6 text-center space-y-1">
            <p className="text-xs text-gray-400 italic">
              "Educação com qualidade e excelência"
            </p>
            <p className="text-xs text-gray-300">
              © {new Date().getFullYear()} Colégio Rhulany
            </p>
          </div>
        </div>
      </div>

      {/* Keyframes globais */}
      <style>{`
        @keyframes errshake {
          10%,90%       { transform:translateX(-1px); }
          20%,80%       { transform:translateX(3px);  }
          30%,50%,70%   { transform:translateX(-5px); }
          40%,60%       { transform:translateX(5px);  }
        }
      `}</style>
    </div>
  );
}