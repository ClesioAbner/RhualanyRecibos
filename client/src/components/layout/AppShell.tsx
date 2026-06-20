import { PropsWithChildren, useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { LogOut, ChevronDown } from "lucide-react";
import { useMe, useLogout } from "@/hooks/use-auth";
import { UserAvatar } from "@/components/UserAvatar";
import { BRAND } from "@shared/brand";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const nav = [
  { href: "/", label: "Início", testId: "nav-inicio" },
  { href: "/emitir", label: "Emitir recibo", testId: "nav-emitir" },
  { href: "/recibos", label: "Recibos", testId: "nav-recibos" },
  { href: "/definicoes", label: "Definições", testId: "nav-definicoes" },
];

export default function AppShell({ children }: PropsWithChildren) {
  const [location] = useLocation();
  const { data: me } = useMe();
  const logout = useLogout();
  const user = { name: me?.name ?? "Utilizador", email: me?.email ?? "" };

  // Sem dark mode no site da secretaria — garante tema claro.
  useEffect(() => {
    document.documentElement.classList.remove("dark");
  }, []);

  const activeHref = useMemo(
    () => nav.find((n) => location === n.href || location.startsWith(n.href + "/"))?.href ?? "",
    [location],
  );

  const handleLogout = async () => {
    try {
      await logout.mutateAsync();
    } finally {
      window.location.href = "/login";
    }
  };

  return (
    <div className="min-h-screen bg-[#eef3f8]">
      <header className="no-print hdr">
        <div className="hdr-inner">
          {/* marca */}
          <Link href="/" className="hdr-brand" data-testid="brand-home">
            <img src="/colegio.png" alt={BRAND.full} className="hdr-logo" style={{ height: 34, width: 34, objectFit: "contain" }} />
            <span className="hdr-brand-text">
              <span className="hdr-brand-eyebrow">{BRAND.eyebrow}</span>
              <span className="hdr-brand-name">{BRAND.name}</span>
            </span>
          </Link>

          <span className="hdr-spacer" />

          {/* navegação (à direita, ao lado da foto) */}
          <nav className="hdr-nav">
            {nav.map((item) => {
              const active = activeHref === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  data-testid={item.testId}
                  className={cn("hdr-link", active && "hdr-link--active")}
                  aria-current={active ? "page" : undefined}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <span className="hdr-divider" />

          {/* utilizador */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hdr-user" data-testid="user-menu-trigger">
                <UserAvatar name={user.name} src={me?.avatarUrl} size={34} rounded={999} />
                <span className="hdr-user-name">{user.name}</span>
                <ChevronDown size={14} className="hdr-user-chevron" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="nav-dropdown">
              <DropdownMenuLabel className="nav-dd-header">
                <UserAvatar name={user.name} src={me?.avatarUrl} size={38} rounded={999} />
                <div className="min-w-0">
                  <p className="nav-dd-name">{user.name}</p>
                  <p className="nav-dd-email">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/perfil" className="nav-dd-item" data-testid="nav-perfil">O meu perfil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/definicoes" className="nav-dd-item">Definições</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/seguranca" className="nav-dd-item" data-testid="nav-seguranca">Segurança</Link>
              </DropdownMenuItem>
              {me?.role === "admin" && (
                <DropdownMenuItem asChild>
                  <Link href="/admin" className="nav-dd-item" data-testid="nav-admin">Administração</Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="nav-dd-item nav-dd-item--red" data-testid="logout-btn">
                <LogOut size={13} /> Terminar sessão
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl 2xl:max-w-[1480px] mx-auto px-4 sm:px-6 lg:px-8 2xl:px-10 py-6 md:py-9">
        <div className="fade-in">{children}</div>
      </main>

      <style>{`
        .hdr {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
          border-bottom: 1px solid #e6ebf2;
          box-shadow: 0 1px 0 rgba(16,42,84,0.03), 0 6px 24px -16px rgba(16,42,84,0.25);
        }
        .hdr-inner {
          max-width: 1280px; margin: 0 auto;
          height: 66px; padding: 0 32px;
          display: flex; align-items: center; gap: 18px;
        }
        /* alinhar o cabeçalho com a largura/padding do conteúdo (main) */
        @media (min-width: 1536px) { .hdr-inner { max-width: 1480px; padding: 0 40px; } }
        @media (max-width: 1023px) { .hdr-inner { padding: 0 24px; } }

        /* marca */
        .hdr-brand { display: flex; align-items: center; gap: 11px; text-decoration: none; flex-shrink: 0; }
        .hdr-logo { flex-shrink: 0; }
        .hdr-brand-text { display: flex; flex-direction: column; line-height: 1.05; }
        .hdr-brand-eyebrow {
          font-size: 9.5px; font-weight: 800; letter-spacing: .22em;
          text-transform: uppercase; color: #9aa8bd;
        }
        .hdr-brand-name {
          font-size: 18px; font-weight: 800; color: #0d2d5e; letter-spacing: -.01em;
          font-family: "Fraunces", Georgia, serif;
        }

        .hdr-divider { width: 1px; height: 30px; background: #e6ebf2; flex-shrink: 0; }

        /* nav à esquerda */
        .hdr-nav { display: flex; align-items: center; gap: 2px; }
        .hdr-link {
          position: relative;
          padding: 10px 16px;
          font-size: 14.5px; font-weight: 600; letter-spacing: -.005em;
          color: #5b6b85; text-decoration: none;
          border-radius: 9px;
          transition: color .16s ease, background .16s ease;
          white-space: nowrap;
        }
        .hdr-link:hover { color: #0d2d5e; background: #eef3fb; }
        .hdr-link--active { color: #0d2d5e; font-weight: 700; }
        .hdr-link--active::after {
          content: ""; position: absolute; left: 16px; right: 16px; bottom: -13px;
          height: 3px; border-radius: 3px 3px 0 0;
          background: linear-gradient(90deg, #1597e5, #0d2d5e);
        }

        .hdr-spacer { flex: 1; }

        /* utilizador */
        .hdr-user {
          display: inline-flex; align-items: center; gap: 9px;
          padding: 4px 12px 4px 4px;
          border-radius: 999px; border: 1.5px solid #e6ebf2;
          background: #fff; cursor: pointer; flex-shrink: 0;
          transition: border-color .15s, box-shadow .15s;
          box-shadow: 0 1px 2px rgba(16,42,84,0.05);
        }
        .hdr-user:hover { border-color: #cdd9e8; box-shadow: 0 3px 12px -4px rgba(16,42,84,0.2); }
        .hdr-user-name { font-size: 13.5px; font-weight: 700; color: #0d2d5e; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .hdr-user-chevron { color: #9aa8bd; flex-shrink: 0; }

        @media (max-width: 640px) {
          .hdr-inner { gap: 12px; padding: 0 16px; }
          .hdr-brand-text { display: none; }
          .hdr-divider { display: none; }
          .hdr-link { padding: 9px 11px; font-size: 13.5px; }
          .hdr-user-name { display: none; }
        }

        /* dropdown */
        .nav-dropdown {
          border-radius: 14px !important;
          border: 1.5px solid #e6ebf2 !important;
          box-shadow: 0 12px 40px -8px rgba(16,42,84,0.2), 0 2px 8px rgba(16,42,84,0.06) !important;
          padding: 5px !important; min-width: 210px !important; overflow: hidden !important;
        }
        .nav-dd-header { display: flex !important; align-items: center !important; gap: 10px !important; padding: 10px !important; }
        .nav-dd-name { font-size: 13px; font-weight: 700; color: #0d2d5e; margin: 0 0 1px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nav-dd-email { font-size: 11px; color: #94a3b8; margin: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .nav-dd-item {
          border-radius: 8px !important; font-size: 13px !important; font-weight: 500 !important;
          cursor: pointer !important; display: flex !important; align-items: center !important;
          gap: 8px !important; padding: 9px 11px !important; text-decoration: none !important; color: #334155 !important;
        }
        .nav-dd-item--red { color: #dc2626 !important; }
        .nav-dd-item--red:hover { background: #fef2f2 !important; }
      `}</style>
    </div>
  );
}
