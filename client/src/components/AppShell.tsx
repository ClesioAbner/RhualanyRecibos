import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { Sun, Moon, PanelLeft, LogOut, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/* ── theme ── */
function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() =>
    localStorage.getItem("theme") === "dark" ? "dark" : "light"
  );
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);
  return { theme, setTheme };
}

/* ── auth user ── */
function useAuthUser() {
  try {
    const raw = localStorage.getItem("auth_user");
    return raw ? JSON.parse(raw) : { name: "Utilizador", email: "" };
  } catch {
    return { name: "Utilizador", email: "" };
  }
}

function getInitials(name: string) {
  return name.split(" ").slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const nav = [
  { href: "/emitir",     label: "Emitir",     testId: "nav-emitir" },
  { href: "/recibos",    label: "Recibos",    testId: "nav-recibos" },
  { href: "/definicoes", label: "Definições", testId: "nav-definicoes" },
];

export default function AppShell({ children }: PropsWithChildren) {
  const [location]            = useLocation();
  const { theme, setTheme }   = useTheme();
  const [mobileOpen, setOpen] = useState(false);
  const user                  = useAuthUser();

  const activeHref = useMemo(() =>
    nav.find(n => location === n.href || location.startsWith(n.href + "/"))?.href ?? ""
  , [location]);

  useEffect(() => setOpen(false), [location]);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("auth_user");
    window.location.href = "/login";
  };

  return (
    <div className="min-h-screen bg-[#f6f7f9] dark:bg-[#0b0f1a]">
      <div className="no-print">
        <header className="nav-bar">
          <div className="nav-inner">

            {/* LEFT */}
            <div className="nav-left">
              <button className="nav-hamburger md:hidden"
                      onClick={() => setOpen(s => !s)}
                      data-testid="mobile-nav-toggle">
                <PanelLeft size={17} />
              </button>

              <Link href="/" className="nav-brand" data-testid="brand-home">
                <div className="nav-brand-logo">
                  <img src="/colegio.png" alt="Colégio Rhulany"
                       style={{ height: 26, width: 26, objectFit: "contain" }} />
                </div>
                <div className="nav-brand-text">
                  <span className="nav-brand-school">Colégio</span>
                  <span className="nav-brand-name">
                    Rhulany <span className="nav-brand-accent">Recibos</span>
                  </span>
                </div>
              </Link>
            </div>

            {/* CENTER */}
            <nav className="nav-links hidden md:flex">
              <div className="nav-pill-container">
                {nav.map((item, i) => {
                  const active = activeHref === item.href;
                  return (
                    <Link key={item.href} href={item.href}
                          data-testid={item.testId}
                          className={cn("nav-btn", active && "nav-btn--active")}>
                      {item.label}
                      {active && <span className="nav-btn-pip" />}
                    </Link>
                  );
                })}
                <svg className="nav-outline" overflow="visible" width="340" height="48" viewBox="0 0 340 48" xmlns="http://www.w3.org/2000/svg">
                  <rect className="nav-rect" pathLength={100} x={0} y={0} width={340} height={48} rx={10} fill="transparent" strokeWidth={2} />
                </svg>
              </div>
            </nav>

            {/* RIGHT */}
            <div className="nav-right">
              <button className="nav-icon-btn"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      data-testid="theme-toggle" title="Alternar tema">
                {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="nav-user-btn" data-testid="user-menu-trigger">
                    <div className="nav-user-avatar">{getInitials(user.name)}</div>
                    <span className="nav-user-name hidden sm:block">{user.name}</span>
                    <ChevronDown size={12} className="nav-user-chevron hidden sm:block" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="nav-dropdown">
                  <DropdownMenuLabel className="nav-dd-header">
                    <div className="nav-dd-avatar">{getInitials(user.name)}</div>
                    <div className="min-w-0">
                      <p className="nav-dd-name">{user.name}</p>
                      <p className="nav-dd-email">{user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/definicoes" className="nav-dd-item">Definições</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}
                                    className="nav-dd-item nav-dd-item--red"
                                    data-testid="logout-btn">
                    <LogOut size={12} /> Terminar sessão
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* MOBILE MENU */}
          {mobileOpen && (
            <div className="nav-mobile">
              {nav.map(item => (
                <Link key={item.href} href={item.href}
                      data-testid={item.testId + "-mobile"}
                      className={cn("nav-mob-link", activeHref === item.href && "nav-mob-link--active")}>
                  {item.label}
                </Link>
              ))}
              <button onClick={handleLogout} className="nav-mob-link nav-mob-link--red">
                Terminar sessão
              </button>
            </div>
          )}
        </header>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="fade-in">{children}</div>
      </main>

      <style>{`
        /* ─── BAR ─── */
        .nav-bar {
          position: sticky; top: 0; z-index: 50;
          background: rgba(255,255,255,0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border-bottom: 1px solid rgba(0,0,0,0.055);
          box-shadow: 0 1px 0 rgba(0,0,0,0.03), 0 4px 24px -6px rgba(0,0,0,0.07);
        }
        .dark .nav-bar {
          background: rgba(11,15,26,0.85);
          border-bottom-color: rgba(255,255,255,0.055);
          box-shadow: 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px -6px rgba(0,0,0,0.35);
        }
        .nav-inner {
          max-width: 1280px; margin: 0 auto;
          padding: 0 20px; height: 68px;
          display: flex; align-items: center;
          justify-content: space-between; gap: 12px;
        }

        /* ─── LEFT ─── */
        .nav-left { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }

        .nav-hamburger {
          height: 32px; width: 32px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 8px; border: none; background: transparent;
          color: #64748b; cursor: pointer; transition: background .15s, color .15s;
        }
        .nav-hamburger:hover { background: #f1f5f9; color: #0f172a; }
        .dark .nav-hamburger:hover { background: #1e293b; color: #f1f5f9; }

        .nav-brand {
          display: flex; align-items: center; gap: 9px;
          text-decoration: none; outline: none;
        }
        .nav-brand-logo {
          height: 42px; width: 42px; border-radius: 11px;
          background: #fff; border: 1.5px solid #e8ecf2;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
          box-shadow: 0 1px 4px rgba(0,0,0,0.07);
          transition: box-shadow .2s;
        }
        .dark .nav-brand-logo { background: #1e293b; border-color: #273549; }
        .nav-brand:hover .nav-brand-logo { box-shadow: 0 2px 10px rgba(0,0,0,0.12); }
        .nav-brand-text { display: flex; flex-direction: column; gap: 1px; line-height: 1; }
        .nav-brand-school {
          font-size: 10px; font-weight: 700; letter-spacing: .2em;
          text-transform: uppercase; color: #94a3b8;
        }
        .nav-brand-name {
          font-size: 16px; font-weight: 800;
          color: #0f172a; letter-spacing: -.025em;
        }
        .dark .nav-brand-name { color: #f1f5f9; }
        .nav-brand-accent { color: #2563eb; }

        /* ─── CENTER ─── */
        .nav-links { display: flex; align-items: center; }

        .nav-pill-container {
          position: relative;
          display: flex;
          flex-direction: row;
          align-items: center;
          background: #f1f5f9;
          border-radius: 12px;
          padding: 4px;
          gap: 2px;
        }
        .dark .nav-pill-container { background: #141c2e; }

        /* SVG outline */
        .nav-outline {
          position: absolute;
          inset: 0;
          pointer-events: none;
          border-radius: 12px;
          overflow: visible;
        }
        .nav-rect {
          stroke-dashoffset: 5;
          stroke-dasharray: 0 0 10 60 10 60;
          transition: 0.5s;
          stroke: #2563eb;
        }
        /* hover any btn → animate outline to that btn */
        .nav-btn:nth-child(1):hover ~ svg .nav-rect {
          stroke-dashoffset: 0;
          stroke-dasharray: 0 1 9 71.3 9 12;
          transition: 0.4s;
        }
        .nav-btn:nth-child(2):hover ~ svg .nav-rect {
          stroke-dashoffset: 0;
          stroke-dasharray: 0 14.5 9 47.5 9 33.5;
          transition: 0.4s;
        }
        .nav-btn:nth-child(3):hover ~ svg .nav-rect {
          stroke-dashoffset: 0;
          stroke-dasharray: 0 28 9 26 9 57;
          transition: 0.4s;
        }
        /* when nothing is hovered, retract */
        .nav-btn:hover ~ .nav-outline .nav-rect {
          stroke-dasharray: 0 0 10 60 10 60;
          transition: 0.5s !important;
        }

        .nav-btn {
          position: relative;
          display: inline-flex; align-items: center;
          padding: 7px 20px; border-radius: 9px;
          font-size: 13.5px; font-weight: 600;
          color: #64748b; text-decoration: none;
          transition: color .15s, background .15s;
          white-space: nowrap; z-index: 1;
        }
        .nav-btn:hover { color: #0f172a; background: rgba(255,255,255,0.5); }
        .dark .nav-btn:hover { color: #f1f5f9; background: rgba(255,255,255,0.05); }
        .nav-btn--active {
          color: #0f172a !important;
          background: #fff !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.09), 0 0 0 1px rgba(0,0,0,0.04);
        }
        .dark .nav-btn--active {
          color: #f1f5f9 !important;
          background: #0f172a !important;
          box-shadow: 0 1px 4px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.06);
        }
        .nav-btn-pip {
          position: absolute; bottom: 4px; left: 50%; transform: translateX(-50%);
          height: 3px; width: 3px; border-radius: 50%; background: #2563eb;
        }

        /* ─── RIGHT ─── */
        .nav-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

        .nav-icon-btn {
          height: 38px; width: 38px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 10px; border: 1.5px solid #e8ecf2;
          background: #fff; color: #64748b; cursor: pointer;
          transition: all .15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .nav-icon-btn:hover { border-color: #cbd5e1; color: #0f172a; box-shadow: 0 2px 6px rgba(0,0,0,0.07); }
        .dark .nav-icon-btn { background: #1e293b; border-color: #273549; color: #94a3b8; }
        .dark .nav-icon-btn:hover { border-color: #334155; color: #f1f5f9; }

        .nav-user-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 4px 11px 4px 4px;
          border-radius: 9px; border: 1.5px solid #e8ecf2;
          background: #fff; cursor: pointer;
          transition: all .15s;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
        .nav-user-btn:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0,0,0,0.07); }
        .dark .nav-user-btn { background: #1e293b; border-color: #273549; }
        .dark .nav-user-btn:hover { border-color: #334155; }

        .nav-user-avatar {
          height: 32px; width: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%);
          color: white; font-size: 11px; font-weight: 800;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; letter-spacing: .02em;
        }
        .nav-user-name {
          font-size: 13px; font-weight: 700; color: #0f172a;
          max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dark .nav-user-name { color: #f1f5f9; }
        .nav-user-chevron { color: #94a3b8; flex-shrink: 0; }

        /* ─── DROPDOWN ─── */
        .nav-dropdown {
          border-radius: 14px !important;
          border: 1.5px solid #e8ecf2 !important;
          box-shadow: 0 8px 32px -4px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06) !important;
          padding: 5px !important; min-width: 200px !important;
          overflow: hidden !important;
        }
        .dark .nav-dropdown { border-color: #273549 !important; background: #1e293b !important; }

        .nav-dd-header {
          display: flex !important; align-items: center !important;
          gap: 10px !important; padding: 10px !important;
        }
        .nav-dd-avatar {
          height: 32px; width: 32px; border-radius: 8px;
          background: linear-gradient(135deg, #1d4ed8 0%, #4f46e5 100%);
          color: white; font-size: 10px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; flex-shrink: 0;
        }
        .nav-dd-name {
          font-size: 12.5px; font-weight: 700; color: #0f172a; margin: 0 0 1px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dark .nav-dd-name { color: #f1f5f9; }
        .nav-dd-email {
          font-size: 10.5px; color: #94a3b8; margin: 0;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .nav-dd-item {
          border-radius: 8px !important; font-size: 12.5px !important;
          font-weight: 500 !important; cursor: pointer !important;
          display: flex !important; align-items: center !important;
          gap: 8px !important; padding: 7px 10px !important;
          text-decoration: none !important;
        }
        .nav-dd-item--red { color: #ef4444 !important; }
        .nav-dd-item--red:hover { background: #fff5f5 !important; }
        .dark .nav-dd-item--red:hover { background: rgba(239,68,68,.1) !important; }

        /* ─── MOBILE ─── */
        .nav-mobile {
          padding: 6px 12px 10px;
          display: flex; flex-direction: column; gap: 2px;
          background: rgba(255,255,255,0.95);
          border-top: 1px solid rgba(0,0,0,0.055);
        }
        .dark .nav-mobile {
          background: rgba(11,15,26,0.95);
          border-top-color: rgba(255,255,255,0.055);
        }
        .nav-mob-link {
          display: block; padding: 9px 12px; border-radius: 9px;
          font-size: 13px; font-weight: 600; color: #64748b;
          text-decoration: none; border: none; background: transparent;
          cursor: pointer; text-align: left; font-family: inherit;
          transition: all .15s;
        }
        .nav-mob-link:hover { background: #f1f5f9; color: #0f172a; }
        .dark .nav-mob-link:hover { background: #1e293b; color: #f1f5f9; }
        .nav-mob-link--active { background: #eff6ff !important; color: #1d4ed8 !important; }
        .dark .nav-mob-link--active { background: rgba(37,99,235,.1) !important; color: #60a5fa !important; }
        .nav-mob-link--red { color: #ef4444 !important; }
        .nav-mob-link--red:hover { background: #fff5f5 !important; }
      `}</style>
    </div>
  );
}