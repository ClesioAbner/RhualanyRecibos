import { useMemo, useState } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import { AvatarEditable } from "@/components/UserAvatar";
import {
  useUsers,
  useUpdateUser,
  useResetUserPassword,
  useResetUserTwoFactor,
  useAudit,
} from "@/hooks/use-admin";
import { useMe } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ArrowLeft, Pencil, KeyRound, ShieldOff, Power, PowerOff, Loader2 } from "lucide-react";
import type { AdminUser, Role } from "@shared/routes";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "secretaria", label: "Secretária" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

export default function UtilizadorDetalhe({ id }: { id: string }) {
  const userId = Number(id);
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data: users, isLoading } = useUsers();
  const updateM = useUpdateUser();
  const resetPw = useResetUserPassword();
  const reset2fa = useResetUserTwoFactor();

  const user = useMemo(() => (users ?? []).find((u) => u.id === userId), [users, userId]);
  const { data: auditPages } = useAudit(user ? { q: user.email } : undefined);
  const activity = (auditPages?.pages?.[0]?.items ?? []).slice(0, 12);

  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <AdminShell title="Utilizador">
        <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}>
          <Loader2 className="animate-spin" size={16} /> A carregar…
        </div>
      </AdminShell>
    );
  }
  if (!user) {
    return (
      <AdminShell title="Utilizador" actions={<BackBtn />}>
        <AdminCard><p className="text-sm" style={{ color: C.error }}>Utilizador não encontrado.</p></AdminCard>
      </AdminShell>
    );
  }

  const isSelf = user.id === me?.id;

  const pickAvatar = async (dataUrl: string) => {
    try {
      await updateM.mutateAsync({ id: user.id, updates: { avatarUrl: dataUrl } });
      toast({ title: "Foto actualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async () => {
    if (isSelf) {
      toast({ title: "Operação não permitida", description: "Não pode desactivar a sua própria conta.", variant: "destructive" });
      return;
    }
    if (!window.confirm(user.active ? `Desactivar a conta de ${user.name}?` : `Activar a conta de ${user.name}?`)) return;
    try {
      await updateM.mutateAsync({ id: user.id, updates: { active: !user.active } });
      toast({ title: user.active ? "Conta desactivada" : "Conta activada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const doResetPw = async () => {
    if (!window.confirm(`Enviar email de reposição de palavra-passe para ${user.email}?`)) return;
    try {
      await resetPw.mutateAsync(user.id);
      toast({ title: "Email de reposição enviado", description: user.email });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const doReset2fa = async () => {
    if (!window.confirm(`Forçar reset do 2FA de ${user.name}? Terá de o configurar de novo.`)) return;
    try {
      await reset2fa.mutateAsync(user.id);
      toast({ title: "2FA reposto" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <AdminShell title={user.name} subtitle={roleLabel(user.role)} actions={<BackBtn />}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── perfil ── */}
        <div className="space-y-4" style={{ opacity: user.active ? 1 : 0.6 }}>
          <AdminCard>
            <div className="flex flex-col items-center text-center pb-2">
              <AvatarEditable
                name={user.name}
                src={user.avatarUrl}
                size={88}
                onPick={pickAvatar}
                onError={(m) => toast({ title: "Erro", description: m, variant: "destructive" })}
              />
              <h2 className="text-lg font-extrabold mt-3" style={{ color: C.navy }}>{user.name}</h2>
              <p className="text-[13px]" style={{ color: C.textSecondary }}>{user.email}</p>
              <span className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide" style={{ color: C.textMuted }}>
                {roleLabel(user.role)}{!user.active && " · inactivo"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-2">
              <Button variant="outline" className="gap-2" onClick={() => setEditOpen(true)} data-testid="user-editar">
                <Pencil size={15} /> Editar
              </Button>
              <Button variant="outline" className="gap-2" onClick={doResetPw} data-testid="user-reset-pw">
                <KeyRound size={15} /> Repor senha
              </Button>
              {user.totpEnabled && (
                <Button variant="outline" className="gap-2" onClick={doReset2fa}>
                  <ShieldOff size={15} /> Repor 2FA
                </Button>
              )}
              <Button
                variant="outline"
                className="gap-2"
                onClick={toggleActive}
                disabled={isSelf}
                title={isSelf ? "Não pode desactivar-se a si próprio" : undefined}
              >
                {user.active ? <PowerOff size={15} /> : <Power size={15} />}
                {user.active ? "Desactivar" : "Activar"}
              </Button>
            </div>
          </AdminCard>

          <AdminCard>
            <h3 className="text-[13px] font-bold mb-3" style={{ color: C.navy }}>Detalhes da conta</h3>
            <Field label="Email" value={user.email} />
            <Field label="Função" value={roleLabel(user.role)} />
            <Field label="Estado" value={user.active ? "Activa" : "Inactiva"} />
            <Field label="Autenticação 2FA" value={user.totpEnabled ? "Activada" : "Desactivada"} />
            <Field label="Último acesso" value={user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Nunca"} />
            <Field label="Conta criada" value={formatDate(user.createdAt)} />
          </AdminCard>
        </div>

        {/* ── actividade ── */}
        <AdminCard noPadding>
          <div className="px-5 py-3.5 border-b" style={{ borderColor: C.cardBorder }}>
            <h3 className="text-[13px] font-bold" style={{ color: C.navy }}>Actividade recente</h3>
          </div>
          {activity.length === 0 ? (
            <p className="px-5 py-10 text-center text-[13px]" style={{ color: C.textMuted }}>Sem actividade registada.</p>
          ) : (
            <ul>
              {activity.map((a) => (
                <li key={a.id} className="px-5 py-2.5 border-b last:border-0" style={{ borderColor: "#f1f5f9" }}>
                  <div className="flex items-center justify-between gap-2">
                    <code className="text-[12px] font-mono" style={{ color: C.navy }}>{a.action}</code>
                    <span className="text-[11px] flex-shrink-0" style={{ color: C.textMuted }} title={formatDateTime(a.createdAt)}>
                      {formatRelative(a.createdAt)}
                    </span>
                  </div>
                  {a.targetType && (
                    <p className="text-[11px] mt-1" style={{ color: C.textMuted }}>{a.targetType} #{a.targetId ?? "?"}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </AdminCard>
      </div>

      {editOpen && <EditModal user={user} onClose={() => setEditOpen(false)} />}
    </AdminShell>
  );
}

function BackBtn() {
  return (
    <Link href="/admin/utilizadores">
      <Button variant="outline" className="gap-2"><ArrowLeft size={15} /> Voltar</Button>
    </Link>
  );
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b last:border-0" style={{ borderColor: "#f1f5f9" }}>
      <span className="text-[12px]" style={{ color: C.textSecondary }}>{label}</span>
      <span className="text-[13px] font-semibold text-right truncate" style={{ color: C.textPrimary }}>{value}</span>
    </div>
  );
}

function EditModal({ user, onClose }: { user: AdminUser; onClose: () => void }) {
  const { toast } = useToast();
  const updateM = useUpdateUser();
  const [name, setName] = useState(user.name);
  const [role, setRole] = useState<Role>(user.role as Role);

  const submit = async () => {
    try {
      await updateM.mutateAsync({ id: user.id, updates: { name: name.trim(), role } });
      toast({ title: "Utilizador actualizado" });
      onClose();
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Editar utilizador</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Nome</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Função</Label>
            <Select value={role} onValueChange={(v) => setRole(v as Role)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={updateM.isPending || !name.trim()} className="gap-2 text-white" style={{ background: C.accentDark }}>
            {updateM.isPending && <Loader2 className="animate-spin" size={15} />} Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
