import { useState } from "react";
import { Link } from "wouter";
import AdminShell from "@/components/layout/AdminShell";
import AdminCard from "@/components/AdminCard";
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useResetUserPassword,
  useResetUserTwoFactor,
} from "@/hooks/use-admin";
import { useMe } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { C } from "@/lib/adminColors";
import { formatDate } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { UserPlus, Pencil, KeyRound, ShieldOff, Power, PowerOff, Loader2, RefreshCw } from "lucide-react";
import { UserAvatar, AvatarEditable } from "@/components/UserAvatar";
import type { AdminUser, Role } from "@shared/routes";

const ROLES: { value: Role; label: string }[] = [
  { value: "admin", label: "Administrador" },
  { value: "secretaria", label: "Secretária" },
];
const roleLabel = (r: string) => ROLES.find((x) => x.value === r)?.label ?? r;

function genPassword(): string {
  const lower = "abcdefghijkmnpqrstuvwxyz";
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digit = "23456789";
  const all = lower + upper + digit;
  const pick = (s: string) => s[Math.floor(Math.random() * s.length)];
  let p = pick(lower) + pick(upper) + pick(digit);
  for (let i = 0; i < 7; i++) p += pick(all);
  return p.split("").sort(() => Math.random() - 0.5).join("");
}

function IconBtn({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button onClick={onClick} aria-label={label} title={label} className="h-8 w-8 rounded-lg border flex items-center justify-center hover:bg-slate-50 dark:hover:bg-white/5" style={{ borderColor: C.cardBorder, color: danger ? C.error : C.textSecondary }}>
      {children}
    </button>
  );
}

export default function AdminUtilizadores() {
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data: users, isLoading } = useUsers();
  const createM = useCreateUser();
  const updateM = useUpdateUser();
  const resetPw = useResetUserPassword();
  const reset2fa = useResetUserTwoFactor();

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState({ email: "", name: "", role: "secretaria" as Role, password: "" });
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const openCreate = () => { setEditing(null); setAvatarPreview(null); setForm({ email: "", name: "", role: "secretaria", password: genPassword() }); setOpen(true); };
  const openEdit = (u: AdminUser) => { setEditing(u); setAvatarPreview(u.avatarUrl); setForm({ email: u.email, name: u.name, role: u.role as Role, password: "" }); setOpen(true); };

  const pickAvatar = async (dataUrl: string) => {
    if (!editing) return;
    try {
      await updateM.mutateAsync({ id: editing.id, updates: { avatarUrl: dataUrl } });
      setAvatarPreview(dataUrl);
      toast({ title: "Foto actualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const submit = async () => {
    try {
      if (editing) {
        await updateM.mutateAsync({ id: editing.id, updates: { name: form.name.trim(), role: form.role } });
        toast({ title: "Utilizador actualizado" });
      } else {
        await createM.mutateAsync({ email: form.email.trim(), name: form.name.trim(), role: form.role, password: form.password });
        toast({ title: "Utilizador criado" });
      }
      setOpen(false);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const toggleActive = async (u: AdminUser) => {
    if (u.id === me?.id) {
      toast({ title: "Operação não permitida", description: "Não pode desactivar a sua própria conta.", variant: "destructive" });
      return;
    }
    try {
      await updateM.mutateAsync({ id: u.id, updates: { active: !u.active } });
      toast({ title: u.active ? "Conta desactivada" : "Conta activada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const doResetPw = async (u: AdminUser) => {
    if (!window.confirm(`Enviar email de reposição de palavra-passe para ${u.email}?`)) return;
    try {
      await resetPw.mutateAsync(u.id);
      toast({ title: "Email de reposição enviado", description: u.email });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const doReset2fa = async (u: AdminUser) => {
    if (!window.confirm(`Forçar reset do 2FA de ${u.name}? O utilizador terá de o configurar de novo.`)) return;
    try {
      await reset2fa.mutateAsync(u.id);
      toast({ title: "2FA reposto" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const saving = createM.isPending || updateM.isPending;

  return (
    <AdminShell
      title="Utilizadores"
      subtitle="Gestão de contas e acessos"
      actions={
        <Button onClick={openCreate} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="user-novo">
          <UserPlus size={16} /> Novo utilizador
        </Button>
      }
    >
      <AdminCard noPadding>
        {isLoading ? (
          <div className="flex items-center gap-2 p-8" style={{ color: C.textSecondary }}><Loader2 className="animate-spin" size={16} /> A carregar…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr style={{ color: C.textMuted }} className="text-[11px] uppercase tracking-wide">
                  {["Nome", "Email", "Role", "Último login", "2FA", "Ações"].map((h, i) => (
                    <th key={i} className="text-left font-semibold px-4 py-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(users ?? []).map((u) => (
                  <tr key={u.id} data-testid={`user-row-${u.id}`} className="border-t" style={{ borderColor: "#f1f5f9", opacity: u.active ? 1 : 0.55 }}>
                    <td className="px-4 py-3 font-semibold" style={{ color: C.navy }}>
                      <Link href={`/admin/utilizadores/${u.id}`} className="flex items-center gap-2.5 hover:underline" data-testid={`user-open-${u.id}`}>
                        <UserAvatar name={u.name} src={u.avatarUrl} size={32} rounded={999} />
                        <span>{u.name}{u.id === me?.id && <span className="ml-1.5 text-[11px] font-normal" style={{ color: C.textMuted }}>(você)</span>}</span>
                      </Link>
                    </td>
                    <td className="px-4 py-3" style={{ color: C.textSecondary }}>{u.email}</td>
                    <td className="px-4 py-3 text-[11px] font-bold uppercase tracking-wide" style={{ color: C.textSecondary }}>{roleLabel(u.role)}</td>
                    <td className="px-4 py-3" style={{ color: C.textSecondary }}>{u.lastLoginAt ? formatDate(u.lastLoginAt) : "—"}</td>
                    <td className="px-4 py-3 text-[12px]" style={{ color: u.totpEnabled ? C.textPrimary : C.textMuted }}>
                      {u.totpEnabled ? "Activo" : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <IconBtn label="Editar" onClick={() => openEdit(u)}><Pencil size={15} /></IconBtn>
                        <IconBtn label="Repor palavra-passe" onClick={() => doResetPw(u)}><KeyRound size={15} /></IconBtn>
                        {u.totpEnabled && <IconBtn label="Repor 2FA" onClick={() => doReset2fa(u)}><ShieldOff size={15} /></IconBtn>}
                        <IconBtn label={u.active ? "Desactivar" : "Activar"} onClick={() => toggleActive(u)}>
                          {u.active ? <PowerOff size={15} /> : <Power size={15} />}
                        </IconBtn>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? "Editar utilizador" : "Novo utilizador"}</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            {editing && (
              <div className="flex flex-col items-center gap-2 pb-1">
                <AvatarEditable
                  name={form.name || editing.name}
                  src={avatarPreview}
                  size={72}
                  onPick={pickAvatar}
                  onError={(m) => toast({ title: "Erro", description: m, variant: "destructive" })}
                />
                <span className="text-[11px]" style={{ color: C.textMuted }}>Clique na foto para mudar</span>
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input type="email" value={form.email} disabled={!!editing} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="user-input-email" />
            </div>
            <div className="space-y-1.5">
              <Label>Nome</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="user-input-nome" />
            </div>
            <div className="space-y-1.5">
              <Label>Função</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as Role })}>
                <SelectTrigger data-testid="user-select-role"><SelectValue /></SelectTrigger>
                <SelectContent>{ROLES.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {!editing && (
              <div className="space-y-1.5">
                <Label>Palavra-passe inicial</Label>
                <div className="flex gap-2">
                  <Input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} className="font-mono" data-testid="user-input-password" />
                  <Button type="button" variant="outline" className="gap-1.5 flex-shrink-0" onClick={() => setForm({ ...form, password: genPassword() })}>
                    <RefreshCw size={14} /> Gerar
                  </Button>
                </div>
                <p className="text-[11px]" style={{ color: C.textMuted }}>Mín. 8 caracteres, com maiúscula, minúscula e número.</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={submit} disabled={saving || !form.name.trim() || (!editing && (!form.email.trim() || !form.password))} className="gap-2 text-white" style={{ background: C.accentDark }} data-testid="user-guardar">
              {saving && <Loader2 className="animate-spin" size={15} />} {editing ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
