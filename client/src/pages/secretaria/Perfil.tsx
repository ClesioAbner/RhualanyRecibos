import { useState } from "react";
import { Link } from "wouter";
import AppShell from "@/components/layout/AppShell";
import { AvatarEditable } from "@/components/UserAvatar";
import { useMe, useUpdateAvatar, useChangePassword } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Lock } from "lucide-react";

import { NAVY, MUTED, INK, LINE } from "@/lib/theme";

const ROLE_LABEL: Record<string, string> = {
  admin: "Administrador",
  secretaria: "Secretária",
};

export default function Perfil() {
  const { toast } = useToast();
  const { data: me } = useMe();
  const updateAvatar = useUpdateAvatar();
  const changePassword = useChangePassword();

  const isAdmin = me?.role === "admin";
  const name = me?.name ?? "Utilizador";
  const email = me?.email ?? "—";
  const role = ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "—";

  // alterar palavra-passe (só admin)
  const [curr, setCurr] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");

  const pwError =
    next && next.length < 8 ? "A nova palavra-passe deve ter pelo menos 8 caracteres."
    : confirm && next !== confirm ? "A confirmação não coincide."
    : "";
  const canChange = !!curr && next.length >= 8 && next === confirm && !changePassword.isPending;

  const submitPassword = async () => {
    try {
      await changePassword.mutateAsync({ currentPassword: curr, newPassword: next });
      setCurr(""); setNext(""); setConfirm("");
      toast({ title: "Palavra-passe alterada", description: "Use a nova palavra-passe no próximo início de sessão." });
    } catch (e: any) {
      toast({ title: "Não foi possível alterar", description: e?.message ?? "Tente novamente.", variant: "destructive" });
    }
  };

  const pickAvatar = async (dataUrl: string) => {
    try {
      await updateAvatar.mutateAsync(dataUrl);
      toast({ title: "Foto actualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e?.message ?? "Não foi possível atualizar a foto.", variant: "destructive" });
    }
  };

  const card = "bg-white rounded-2xl border";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto space-y-5">
        {/* cabeçalho */}
        <div>
          <h1 style={{ fontFamily: "Fraunces, Georgia, serif", fontSize: 22, fontWeight: 700, color: NAVY }}>O meu perfil</h1>
          <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Foto de perfil e dados da sua conta.</p>
        </div>

        {/* foto + identidade */}
        <div className={card} style={{ borderColor: LINE }}>
          <div className="px-6 pt-5 pb-4">
            <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Foto de perfil</h2>
            <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>Clique na foto para a alterar. A imagem é reduzida automaticamente.</p>
          </div>
          <div className="h-px" style={{ background: LINE }} />

          <div className="px-6 py-6 flex items-center gap-5">
            <AvatarEditable
              name={name}
              src={me?.avatarUrl}
              size={84}
              rounded={999}
              onPick={pickAvatar}
              onError={(msg) => toast({ title: "Erro", description: msg, variant: "destructive" })}
            />
            <div className="min-w-0">
              <p className="text-[17px] font-bold truncate" style={{ color: INK }}>{name}</p>
              <p className="text-[13px] truncate" style={{ color: MUTED }}>{email}</p>
              <p className="text-[12.5px] mt-1" style={{ color: MUTED }}>Função: <span style={{ color: NAVY, fontWeight: 600 }}>{role}</span></p>
            </div>
          </div>
        </div>

        {/* palavra-passe */}
        {isAdmin ? (
          <div className={card} style={{ borderColor: LINE }}>
            <div className="px-6 pt-5 pb-4">
              <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Alterar palavra-passe</h2>
              <p className="text-[12px] mt-0.5" style={{ color: MUTED }}>Defina uma palavra-passe que memorize. Precisa da palavra-passe atual para confirmar.</p>
            </div>
            <div className="h-px" style={{ background: LINE }} />
            <div className="px-6 py-5 space-y-4 max-w-md">
              <div className="space-y-1.5">
                <Label className="text-[12px]" style={{ color: MUTED }}>Palavra-passe atual</Label>
                <Input type="password" value={curr} onChange={(e) => setCurr(e.target.value)} autoComplete="current-password" data-testid="perfil-pw-current" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]" style={{ color: MUTED }}>Nova palavra-passe</Label>
                <Input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" data-testid="perfil-pw-new" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[12px]" style={{ color: MUTED }}>Confirmar nova palavra-passe</Label>
                <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" data-testid="perfil-pw-confirm" />
              </div>
              {pwError && <p className="text-[12px] font-medium" style={{ color: "#b42318" }}>{pwError}</p>}
            </div>
            <div className="h-px" style={{ background: LINE }} />
            <div className="px-6 py-4 flex justify-end">
              <Button onClick={submitPassword} disabled={!canChange} className="text-white px-6" style={{ background: NAVY }} data-testid="perfil-pw-save">
                {changePassword.isPending ? "A alterar…" : "Alterar palavra-passe"}
              </Button>
            </div>
          </div>
        ) : (
          <div className={card} style={{ borderColor: LINE }}>
            <div className="px-6 py-5 flex items-start gap-3.5">
              <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ height: 40, width: 40, background: "#f1f5f9", color: NAVY }}>
                <Lock size={18} />
              </span>
              <div className="min-w-0">
                <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Palavra-passe</h2>
                <p className="text-[12.5px] mt-1 leading-relaxed" style={{ color: MUTED }}>
                  Por segurança, a palavra-passe é gerida pelo <b>administrador</b>. Se precisar de a alterar ou repor, contacte o administrador do sistema.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* atalho para segurança (2FA) */}
        <Link href="/seguranca" className={`${card} block hover:bg-[#f9fbfd] transition-colors`} style={{ borderColor: LINE }}>
          <div className="px-6 py-5 flex items-center gap-3.5">
            <span className="flex items-center justify-center rounded-xl flex-shrink-0" style={{ height: 40, width: 40, background: "#f1f5f9", color: NAVY }}>
              <ShieldCheck size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="text-[14px] font-extrabold" style={{ color: NAVY }}>Segurança</h2>
              <p className="text-[12.5px] mt-0.5" style={{ color: MUTED }}>Ativar a verificação em duas etapas (2FA) na sua conta.</p>
            </div>
            <span className="text-[16px] font-bold flex-shrink-0" style={{ color: "#cbd5e1" }}>›</span>
          </div>
        </Link>
      </div>
    </AppShell>
  );
}
