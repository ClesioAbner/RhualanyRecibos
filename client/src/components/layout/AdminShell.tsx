import { ReactNode, useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { C } from "@/lib/adminColors";
import { useMe, useLogout, useUpdateAvatar } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { AvatarEditable } from "@/components/UserAvatar";
import {
  LayoutDashboard,
  BookOpen,
  Users,
  ScrollText,
  UserCog,
  BarChart3,
  History,
  LogOut,
  X,
  ArrowLeft,
  UserCircle,
} from "lucide-react";

interface AdminShellProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}

const ROLE_LABEL: Record<string, string> = { admin: "Administrador", secretaria: "Secretária" };

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/turmas", label: "Turmas", icon: BookOpen },
  { href: "/admin/cadastro", label: "Cadastro", icon: Users },
  { href: "/admin/recibos", label: "Recibos", icon: ScrollText },
  { href: "/admin/utilizadores", label: "Utilizadores", icon: UserCog },
  { href: "/admin/extratos", label: "Extratos", icon: BarChart3 },
  { href: "/admin/audit", label: "Auditoria", icon: History },
];


export default function AdminShell({ title, subtitle, actions, children }: AdminShellProps) {
  const [location] = useLocation();
  const { data: me } = useMe();
  const logout = useLogout();
  const [drawer, setDrawer] = useState(false);
  const updateAvatar = useUpdateAvatar();
  const { toast } = useToast();

  useEffect(() => setDrawer(false), [location]);
  // Sem modo escuro na administração — garante tema claro.
  useEffect(() => { document.documentElement.classList.remove("dark"); }, []);

  const name = me?.name ?? "Administrador";
  const role = ROLE_LABEL[me?.role ?? ""] ?? me?.role ?? "";

  const pickAvatar = async (dataUrl: string) => {
    try {
      await updateAvatar.mutateAsync(dataUrl);
      toast({ title: "Foto actualizada" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
  };

  const isActive = (href: string) =>
    href === "/admin" ? location === "/admin" : location.startsWith(href);

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      window.location.href = "/login";
    }
  };

  const Sidebar = (
    <aside className="ash-side" aria-label="Navegação de administração">
      <div className="ash-brandbar">
        <img src="/colegio.png" alt="" aria-hidden="true" style={{ height: 18, width: 18, objectFit: "contain" }} />
        <span className="ash-brandbar-text">Colégio Rhulany</span>
        <button
          className="ash-drawer-close lg:hidden"
          onClick={() => setDrawer(false)}
          aria-label="Fechar menu"
        >
          <X size={18} />
        </button>
      </div>

      <div className="ash-profile">
        <AvatarEditable
          name={name}
          src={me?.avatarUrl}
          size={78}
          onPick={pickAvatar}
          onError={(m) => toast({ title: "Erro", description: m, variant: "destructive" })}
        />
        <p className="ash-profile-name">{name}</p>
        <p className="ash-profile-email">{me?.email ?? ""}</p>
        <span className="ash-profile-role">{role}</span>
      </div>

      <nav className="ash-nav">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = isActive(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn("ash-nav-item", active && "ash-nav-item--active")}
              aria-current={active ? "page" : undefined}
              data-testid={`admin-nav-${label.toLowerCase()}`}
            >
              <Icon size={18} aria-hidden="true" />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="ash-user">
        <Link href="/perfil" className="ash-backsite" data-testid="admin-perfil">
          <UserCircle size={16} aria-hidden="true" />
          <span>O meu perfil</span>
        </Link>
        <Link href="/emitir" className="ash-backsite" data-testid="admin-back-site">
          <ArrowLeft size={16} aria-hidden="true" />
          <span>Voltar ao site</span>
        </Link>
        <button className="ash-logout" onClick={handleLogout} data-testid="admin-logout">
          <LogOut size={16} aria-hidden="true" />
          <span>Terminar sessão</span>
        </button>
      </div>
    </aside>
  );

  return (
    <div className="ash-root">
      <div className="hidden lg:flex">{Sidebar}</div>

      {drawer && (
        <div className="ash-overlay lg:hidden" onClick={() => setDrawer(false)}>
          <div onClick={(e) => e.stopPropagation()}>{Sidebar}</div>
        </div>
      )}

      <div className="ash-main">
        <header className="ash-header">
          <div className="min-w-0">
            <h1 className="ash-title" data-testid="admin-page-title">{title}</h1>
            {subtitle && <p className="ash-subtitle">{subtitle}</p>}
          </div>
          {actions && <div className="ash-actions">{actions}</div>}
        </header>

        <main className="ash-content">{children}</main>
      </div>

      <style>{`
        .ash-root { min-height: 100vh; display: flex; background: ${C.bg}; }

        /* ── SIDEBAR ── */
        .ash-side {
          width: 240px; height: 100vh; position: sticky; top: 0; flex-shrink: 0;
          display: flex; flex-direction: column;
          background: #14233f;
          color: #c9d6ea;
          box-shadow: 4px 0 24px -14px rgba(0,0,0,0.45);
        }
        .ash-brandbar {
          display: flex; align-items: center; gap: 8px;
          padding: 16px 18px 4px; position: relative;
        }
        .ash-brandbar-text { font-size: 11px; font-weight: 700; color: #8aa1c4; text-transform: uppercase; letter-spacing: .16em; }
        .ash-drawer-close { position: absolute; right: 12px; top: 14px; background: transparent; border: none; color: #8aa1c4; cursor: pointer; }

        .ash-profile {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          gap: 2px; padding: 12px 16px 18px; margin: 4px 12px 6px;
          border-bottom: 1px solid rgba(255,255,255,0.08);
        }
        .ash-profile-name { font-size: 14px; font-weight: 800; color: #fff; margin: 8px 0 0; }
        .ash-profile-email { font-size: 11px; color: #8aa1c4; margin: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ash-profile-role {
          margin-top: 6px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: .1em;
          color: ${C.accent};
        }

        .ash-nav { display: flex; flex-direction: column; gap: 2px; padding: 10px; margin-top: 4px; }
        .ash-nav-item {
          display: flex; align-items: center; gap: 12px;
          padding: 11px 16px; border-radius: 0 9px 9px 0;
          font-size: 13.5px; font-weight: 600; color: #aebfd8; text-decoration: none;
          border-left: 3px solid transparent; transition: background .15s, color .15s, border-color .15s;
        }
        .ash-nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
        .ash-nav-item:focus-visible { outline: none; box-shadow: inset 0 0 0 2px ${C.accent}; }
        .ash-nav-item--active {
          background: rgba(255,255,255,0.15); color: #fff;
          border-left-color: ${C.accent};
        }

        .ash-user { margin-top: auto; padding: 12px; display: flex; flex-direction: column; gap: 8px; border-top: 1px solid rgba(255,255,255,0.08); }
        .ash-backsite {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 10px 12px; border-radius: 9px; text-decoration: none;
          background: rgba(255,255,255,0.06); color: #cdddf2; font-size: 12.5px; font-weight: 600;
          border: 1px solid rgba(255,255,255,0.08); transition: background .15s, color .15s;
        }
        .ash-backsite:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .ash-logout {
          display: flex; align-items: center; gap: 9px; width: 100%;
          padding: 10px 12px; border-radius: 9px; border: none; cursor: pointer;
          background: transparent; color: #f0a8a8; font-size: 12.5px; font-weight: 600; font-family: inherit;
          transition: background .15s, color .15s;
        }
        .ash-logout:hover { background: rgba(220,38,38,0.16); color: #fca5a5; }

        /* ── MAIN ── */
        .ash-main { flex: 1; min-width: 0; display: flex; flex-direction: column; }
        .ash-header {
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          padding: 18px 32px; background: linear-gradient(180deg, #ffffff 0%, #fbfcfe 100%);
          border-bottom: 1px solid ${C.cardBorder};
          position: sticky; top: 0; z-index: 20;
          box-shadow: 0 1px 0 rgba(13,45,94,0.02), 0 6px 20px -16px rgba(13,45,94,0.25);
        }
        .ash-title { font-size: 24px; font-weight: 800; color: ${C.navy}; margin: 0; letter-spacing: -.025em; }
        .ash-subtitle { font-size: 12.5px; color: ${C.textSecondary}; margin: 3px 0 0; font-weight: 500; }
        .ash-actions { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }

        .ash-content { padding: 24px 32px; flex: 1; }
        @media (max-width: 640px) { .ash-header { padding: 16px; } .ash-content { padding: 16px; } }

        .ash-overlay { position: fixed; inset: 0; z-index: 60; background: rgba(8,13,26,0.55); display: flex; }
        .ash-overlay .ash-side { height: 100vh; }

        :root { --admin-card-bg: #ffffff; }
      `}</style>
    </div>
  );
}
