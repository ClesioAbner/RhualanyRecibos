import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { Eye, EyeOff, Mail, Lock, LogIn, KeyRound } from "lucide-react";
import { useMe, useLogin, useVerifyTwoFactor } from "@/hooks/use-auth";
import { BRAND } from "@shared/brand";
import { NAVY, NAVY_DARK, ACCENT, INK, MUTED, LINE } from "@/lib/theme";

const REMEMBER_KEY = "rhulany.login.email";

// Identidade vinda da fonte única (@shared/brand).
const { eyebrow: BRAND_EYEBROW, name: BRAND_NAME, full: BRAND_FULL, slogan: SLOGAN } = BRAND;

/* ───────────────────────── marca (logótipo + nome) ───────────────────────── */
function Brand({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <img src="/colegio.png" alt="" className="object-contain flex-shrink-0" style={{ height: 50, width: 50 }} />
      <div className="leading-tight">
        <p className="text-[10.5px] font-semibold uppercase" style={{ letterSpacing: ".22em", color: light ? "rgba(255,255,255,0.75)" : MUTED }}>
          {BRAND_EYEBROW}
        </p>
        <p className="text-[20px] font-bold" style={{ fontFamily: "Fraunces, Georgia, serif", color: light ? "#fff" : NAVY }}>
          {BRAND_NAME}
        </p>
      </div>
    </div>
  );
}

/* ─────────────────────────── campo de texto ─────────────────────────── */
function Field({
  id, label, type = "text", value, onChange, placeholder, autoComplete, autoFocus,
  leading, trailing, inputMode,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  autoFocus?: boolean;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
  inputMode?: "text" | "numeric";
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[10.5px] font-bold uppercase" style={{ letterSpacing: ".12em", color: focused ? NAVY : MUTED }}>
        {label}
      </label>
      <div
        className="flex items-center gap-3 px-4"
        style={{
          height: 54,
          borderRadius: 14,
          background: focused ? "#fff" : "#f6f8fb",
          border: `1.5px solid ${focused ? NAVY : LINE}`,
          boxShadow: focused ? `0 0 0 3px rgba(26,58,107,0.10)` : "none",
          transition: "border-color .15s, box-shadow .15s, background .15s",
        }}
      >
        {leading && (
          <span className="flex-shrink-0" style={{ color: focused ? NAVY : "#9aa7bd", display: "flex" }}>
            {leading}
          </span>
        )}
        <input
          id={id}
          type={type}
          aria-label={label}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          inputMode={inputMode}
          className="flex-1 bg-transparent outline-none text-[14.5px]"
          style={{ color: INK }}
        />
        {trailing}
      </div>
    </div>
  );
}

function SubmitButton({ children, disabled, icon }: { children: React.ReactNode; disabled?: boolean; icon?: React.ReactNode }) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full flex items-center justify-center gap-2.5 text-white font-semibold text-[15px]"
      style={{
        height: 54,
        borderRadius: 14,
        background: NAVY,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.65 : 1,
        boxShadow: "0 4px 14px -6px rgba(15,23,42,0.3)",
        transition: "opacity .15s, background .15s",
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = NAVY_DARK; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = NAVY; }}
    >
      {icon}
      {children}
    </button>
  );
}

function ErrorNote({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="px-3.5 py-2.5 text-[12.5px] font-medium"
      style={{ borderRadius: 11, background: "#fdf2f2", border: "1px solid #f3c9c9", color: "#b42318" }}
    >
      {children}
    </div>
  );
}

/* ──────────────────────────────── página ──────────────────────────────── */
export default function Login() {
  const [, navigate] = useLocation();
  const { data: me, isLoading: meLoading } = useMe();

  const login = useLogin();
  const verify = useVerifyTwoFactor();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");

  // segundo factor
  const [stage, setStage] = useState<"credentials" | "twoFactor">("credentials");
  const [code, setCode] = useState("");

  const redirected = useRef(false);

  // Pré-preenche o email guardado ("Lembrar email").
  useEffect(() => {
    const saved = localStorage.getItem(REMEMBER_KEY);
    if (saved) {
      setEmail(saved);
      setRemember(true);
    }
  }, []);

  // Já autenticado? Sai do /login para a página inicial.
  useEffect(() => {
    if (!meLoading && me && !redirected.current) {
      redirected.current = true;
      navigate(me.role === "admin" ? "/admin" : "/");
    }
  }, [me, meLoading, navigate]);

  const goAfterLogin = (role?: string) => {
    redirected.current = true;
    navigate(role === "admin" ? "/admin" : "/");
  };

  const submitCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email.trim() || !password) {
      setError("Preencha o email e a palavra-passe.");
      return;
    }
    // guarda / esquece o email conforme a opção "Lembrar email"
    if (remember) localStorage.setItem(REMEMBER_KEY, email.trim());
    else localStorage.removeItem(REMEMBER_KEY);

    try {
      const result = await login.mutateAsync({ email: email.trim(), password });
      if ("twoFactorRequired" in result) {
        setStage("twoFactor");
        return;
      }
      goAfterLogin(result.user.role);
    } catch (err: any) {
      setError(err?.message || "Não foi possível iniciar sessão.");
    }
  };

  const submitTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const token = code.replace(/\s/g, "");
    if (token.length < 6) {
      setError("Introduza o código de 6 dígitos.");
      return;
    }
    try {
      const { user } = await verify.mutateAsync({ token });
      goAfterLogin(user.role);
    } catch (err: any) {
      setError(err?.message || "Código inválido.");
    }
  };

  // Enquanto confirma a sessão, evita o flash do formulário.
  if (meLoading || me) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#eef3f8" }}>
        <div className="h-8 w-8 rounded-full animate-spin" style={{ border: `2px solid ${NAVY}`, borderTopColor: "transparent" }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex" style={{ fontFamily: "'IBM Plex Sans', system-ui, sans-serif" }}>
      {/* ══════ ESQUERDA — foto limpa (sem fundo azul) ══════ */}
      <div className="hidden lg:block lg:w-1/2 relative overflow-hidden">
        <img src="/campus.jpg" alt={BRAND_FULL} className="absolute inset-0 w-full h-full object-cover" />
        {/* escurecimento neutro só nas bordas, para o texto ler bem (sem véu azul) */}
        <div className="absolute inset-x-0 top-0 h-40" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0) 100%)" }} />
        <div className="absolute inset-x-0 bottom-0 h-44" style={{ background: "linear-gradient(0deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0) 100%)" }} />

        <div className="absolute top-9 left-9 z-10">
          <Brand light />
        </div>

        <div className="absolute bottom-9 left-9 right-9 z-10">
          <div className="h-1 w-12 rounded-full mb-4" style={{ background: ACCENT }} />
          <p className="text-white text-[19px] italic font-medium" style={{ fontFamily: "Fraunces, Georgia, serif", textShadow: "0 1px 12px rgba(0,0,0,0.5)" }}>
            “{SLOGAN}”
          </p>
        </div>
      </div>

      {/* ══════ DIREITA — formulário ══════ */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        <div className="w-full max-w-[420px]">
          {/* marca só em ecrã pequeno (no desktop já aparece sobre a foto) */}
          <div className="lg:hidden mb-8">
            <Brand />
          </div>

          {stage === "credentials" ? (
            <>
              <h1 className="text-[32px] font-bold leading-none" style={{ color: NAVY, fontFamily: "Fraunces, Georgia, serif" }}>
                Iniciar sessão
              </h1>
              <p className="text-[14px] mt-2.5" style={{ color: MUTED }}>Aceda ao sistema de recibos.</p>

              <div className="h-px w-full my-7" style={{ background: LINE }} />

              <form onSubmit={submitCredentials} className="space-y-4" noValidate>
                <Field
                  id="email"
                  label="Email institucional"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="utilizador@rhulany.mz"
                  autoComplete="username"
                  autoFocus
                  leading={<Mail size={17} />}
                />
                <Field
                  id="password"
                  label="Palavra-passe"
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={setPassword}
                  placeholder="Introduza a palavra-passe"
                  autoComplete="current-password"
                  leading={<Lock size={17} />}
                  trailing={
                    <button
                      type="button"
                      onClick={() => setShowPw((s) => !s)}
                      aria-label={showPw ? "Ocultar palavra-passe" : "Mostrar palavra-passe"}
                      className="flex-shrink-0"
                      style={{ background: "none", border: "none", cursor: "pointer", color: MUTED, padding: 2, display: "flex" }}
                    >
                      {showPw ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  }
                />

                <div className="flex items-center justify-between pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer select-none text-[12.5px]" style={{ color: INK }}>
                    <input
                      type="checkbox"
                      checked={remember}
                      onChange={(e) => setRemember(e.target.checked)}
                      className="h-4 w-4 cursor-pointer"
                      style={{ accentColor: NAVY }}
                    />
                    Lembrar email
                  </label>
                  <span className="text-[12.5px]" style={{ color: MUTED }}>
                    Esqueceu a palavra-passe?{" "}
                    <Link href="/forgot-password" className="font-semibold" style={{ color: NAVY }}>
                      Repor agora
                    </Link>
                  </span>
                </div>

                {error && <ErrorNote>{error}</ErrorNote>}

                <SubmitButton disabled={login.isPending} icon={<LogIn size={17} />}>
                  {login.isPending ? "A entrar…" : "Entrar na plataforma"}
                </SubmitButton>
              </form>
            </>
          ) : (
            <>
              <h1 className="text-[27px] font-bold leading-tight" style={{ color: NAVY, fontFamily: "Fraunces, Georgia, serif" }}>
                Verificação em duas etapas
              </h1>
              <p className="text-[14px] mt-2.5" style={{ color: MUTED }}>Introduza o código de 6 dígitos da sua aplicação de autenticação.</p>

              <div className="h-px w-full my-7" style={{ background: LINE }} />

              <form onSubmit={submitTwoFactor} className="space-y-4" noValidate>
                <Field
                  id="code"
                  label="Código de verificação"
                  value={code}
                  onChange={(v) => setCode(v.replace(/[^\d]/g, "").slice(0, 6))}
                  placeholder="000000"
                  inputMode="numeric"
                  autoFocus
                  leading={<KeyRound size={17} />}
                />

                {error && <ErrorNote>{error}</ErrorNote>}

                <SubmitButton disabled={verify.isPending} icon={<LogIn size={17} />}>
                  {verify.isPending ? "A verificar…" : "Verificar"}
                </SubmitButton>

                <button
                  type="button"
                  onClick={() => { setStage("credentials"); setCode(""); setError(""); }}
                  className="w-full text-[12.5px] font-semibold"
                  style={{ background: "none", border: "none", cursor: "pointer", color: MUTED }}
                >
                  Voltar
                </button>
              </form>
            </>
          )}

          <p className="flex items-center justify-center gap-1.5 text-[11.5px] mt-7" style={{ color: "#94a3b8" }}>
            <Lock size={11} /> Ligação segura · Área restrita
          </p>
          <p className="text-center text-[11px] mt-6" style={{ color: "#b6c0cf" }}>
            © {new Date().getFullYear()} {BRAND_FULL}
          </p>
        </div>
      </div>
    </div>
  );
}
