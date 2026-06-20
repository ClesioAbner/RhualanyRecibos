import { useEffect, useState } from "react";
import QRCode from "qrcode";
import AppShell from "@/components/layout/AppShell";
import { useToast } from "@/hooks/use-toast";
import {
  useMe,
  useTwoFactorSetup,
  useTwoFactorEnable,
  useTwoFactorDisable,
} from "@/hooks/use-auth";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

type Phase = "idle" | "enrolling" | "showingCodes";

export default function Seguranca() {
  const { toast } = useToast();
  const { data: user, isLoading } = useMe();

  const setup = useTwoFactorSetup();
  const enable = useTwoFactorEnable();
  const disable = useTwoFactorDisable();

  const [phase, setPhase] = useState<Phase>("idle");
  const [secret, setSecret] = useState("");
  const [qr, setQr] = useState("");
  const [token, setToken] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [disablePwd, setDisablePwd] = useState("");
  const [copied, setCopied] = useState(false);

  const startSetup = async () => {
    try {
      const { secret, uri } = await setup.mutateAsync();
      setSecret(secret);
      setQr(await QRCode.toDataURL(uri, { width: 220, margin: 1 }));
      setPhase("enrolling");
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
  };

  const confirmEnable = async () => {
    try {
      const { recoveryCodes } = await enable.mutateAsync(token);
      setRecoveryCodes(recoveryCodes);
      setPhase("showingCodes");
      setToken("");
      toast({ title: "2FA ativado", description: "Guarde os códigos de recuperação." });
    } catch (e: any) {
      toast({ title: "Código incorreto", description: e?.message, variant: "destructive" });
    }
  };

  const confirmDisable = async () => {
    try {
      await disable.mutateAsync(disablePwd);
      setDisablePwd("");
      toast({ title: "2FA desativado" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message, variant: "destructive" });
    }
  };

  const copyCodes = () => {
    navigator.clipboard.writeText(recoveryCodes.join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AppShell>
      <div style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ borderBottom: "1px solid #e8ecf2", paddingBottom: 16 }}>
          <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".2em", textTransform: "uppercase", color: "#94a3b8", margin: "0 0 4px" }}>Conta</p>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: "0 0 3px" }}>Segurança</h1>
          <p style={{ fontSize: 12, color: "#94a3b8", margin: 0 }}>Autenticação de dois fatores (2FA) e proteção da conta</p>
        </div>

        <div style={{ background: "#fff", border: "1.5px solid #e8ecf2", borderRadius: 18, padding: 24 }}>
          {isLoading ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", color: "#94a3b8", fontSize: 13 }}>
              <Loader2 size={15} className="animate-spin" /> A carregar…
            </div>
          ) : (
            <>
              {/* header row */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18 }}>
                <div style={{ height: 46, width: 46, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", background: user?.totpEnabled ? "linear-gradient(140deg,#059669,#10b981)" : "linear-gradient(140deg,#1e40af,#3b82f6)" }}>
                  {user?.totpEnabled ? <ShieldCheck size={24} color="white" /> : <ShieldOff size={24} color="white" />}
                </div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 700, color: "#0f172a", margin: 0 }}>
                    Autenticação de dois fatores
                  </p>
                  <p style={{ fontSize: 12.5, color: user?.totpEnabled ? "#059669" : "#94a3b8", margin: 0, fontWeight: 600 }}>
                    {user?.totpEnabled ? "Ativada" : "Desativada"}
                  </p>
                </div>
              </div>

              {/* ── ENABLED: offer disable ── */}
              {user?.totpEnabled && phase === "idle" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                    A sua conta está protegida. Para desativar o 2FA, confirme a sua palavra-passe.
                  </p>
                  <input
                    type="password"
                    placeholder="Palavra-passe atual"
                    value={disablePwd}
                    onChange={(e) => setDisablePwd(e.target.value)}
                    style={inputStyle}
                  />
                  <button onClick={confirmDisable} disabled={!disablePwd || disable.isPending} style={dangerBtn(!disablePwd || disable.isPending)}>
                    {disable.isPending ? "A desativar…" : "Desativar 2FA"}
                  </button>
                </div>
              )}

              {/* ── DISABLED: offer setup ── */}
              {!user?.totpEnabled && phase === "idle" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <p style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, margin: 0 }}>
                    Adicione uma camada extra de segurança. Após ativar, será pedido um código
                    da sua aplicação de autenticação (Google Authenticator, Authy, …) em cada início de sessão.
                  </p>
                  <button onClick={startSetup} disabled={setup.isPending} style={primaryBtn(setup.isPending)}>
                    {setup.isPending ? "A preparar…" : "Configurar 2FA"}
                  </button>
                </div>
              )}

              {/* ── ENROLLING ── */}
              {phase === "enrolling" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    1. Leia o código QR com a sua aplicação de autenticação:
                  </p>
                  <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
                    {qr && <img src={qr} alt="QR Code 2FA" style={{ borderRadius: 12, border: "1px solid #e8ecf2" }} />}
                    <div style={{ flex: 1, minWidth: 200 }}>
                      <p style={{ fontSize: 12, color: "#94a3b8", margin: "0 0 6px" }}>Ou introduza esta chave manualmente:</p>
                      <code style={{ display: "block", fontSize: 13, background: "#f1f5f9", padding: "8px 10px", borderRadius: 8, wordBreak: "break-all", letterSpacing: 1 }}>{secret}</code>
                    </div>
                  </div>

                  <p style={{ fontSize: 13, color: "#64748b", margin: 0 }}>
                    2. Introduza o código de 6 dígitos gerado:
                  </p>
                  <input
                    inputMode="numeric"
                    placeholder="000000"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    style={{ ...inputStyle, fontSize: 18, letterSpacing: 4 }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={confirmEnable} disabled={token.length !== 6 || enable.isPending} style={primaryBtn(token.length !== 6 || enable.isPending)}>
                      {enable.isPending ? "A verificar…" : "Ativar 2FA"}
                    </button>
                    <button onClick={() => { setPhase("idle"); setToken(""); }} style={ghostBtn}>Cancelar</button>
                  </div>
                </div>
              )}

              {/* ── RECOVERY CODES ── */}
              {phase === "showingCodes" && (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <div style={{ padding: "10px 14px", borderRadius: 10, background: "#fffbeb", border: "1px solid #fde68a" }}>
                    <p style={{ fontSize: 12.5, color: "#92400e", margin: 0, fontWeight: 600 }}>
                      Guarde estes códigos de recuperação num local seguro. Cada um pode ser usado uma única vez
                      caso perca o acesso à aplicação de autenticação. Não serão mostrados novamente.
                    </p>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {recoveryCodes.map((c) => (
                      <code key={c} style={{ fontSize: 14, background: "#f1f5f9", padding: "8px 10px", borderRadius: 8, textAlign: "center", letterSpacing: 1, fontWeight: 600 }}>{c}</code>
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={copyCodes} style={ghostBtn}>
                      {copied ? <><Check size={14} /> Copiado</> : <><Copy size={14} /> Copiar códigos</>}
                    </button>
                    <button onClick={() => setPhase("idle")} style={primaryBtn(false)}>Concluir</button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </AppShell>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%", height: 44, padding: "0 12px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", background: "#fafafa", fontSize: 14,
  color: "#0f172a", outline: "none", fontFamily: "inherit",
};

const primaryBtn = (disabled: boolean): React.CSSProperties => ({
  display: "inline-flex", alignItems: "center", gap: 7, justifyContent: "center",
  padding: "11px 22px", borderRadius: 11, background: "#0f172a", color: "#fff",
  fontSize: 13, fontWeight: 700, border: "none", cursor: disabled ? "not-allowed" : "pointer",
  opacity: disabled ? 0.45 : 1, fontFamily: "inherit",
});

const dangerBtn = (disabled: boolean): React.CSSProperties => ({
  padding: "11px 22px", borderRadius: 11, background: "#fff5f5", color: "#dc2626",
  fontSize: 13, fontWeight: 700, border: "1.5px solid #fecaca",
  cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
  fontFamily: "inherit", width: "fit-content",
});

const ghostBtn: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 7, justifyContent: "center",
  padding: "11px 18px", borderRadius: 11, background: "#fff", color: "#374151",
  fontSize: 13, fontWeight: 600, border: "1.5px solid #e2e8f0", cursor: "pointer",
  fontFamily: "inherit",
};
