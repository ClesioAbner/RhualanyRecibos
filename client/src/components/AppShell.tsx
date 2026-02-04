import { PropsWithChildren, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  FileText,
  PlusCircle,
  Settings as SettingsIcon,
  Sparkles,
  Sun,
  Moon,
  PanelLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function useTheme() {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const stored = localStorage.getItem("theme");
    return stored === "dark" ? "dark" : "light";
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("theme", theme);
  }, [theme]);

  return { theme, setTheme };
}

const nav = [
  { href: "/emitir", label: "Emitir", icon: PlusCircle, testId: "nav-emitir" },
  { href: "/recibos", label: "Recibos", icon: FileText, testId: "nav-recibos" },
  { href: "/definicoes", label: "Definições", icon: SettingsIcon, testId: "nav-definicoes" },
];

export default function AppShell({ children }: PropsWithChildren) {
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);

  const activeHref = useMemo(() => {
    const match = nav.find((n) => location === n.href || location.startsWith(n.href + "/"));
    return match?.href ?? "";
  }, [location]);

  useEffect(() => setMobileOpen(false), [location]);

  return (
    <div className="app-surface min-h-screen">
      <div className="no-print">
        <header className="sticky top-0 z-40 border-b border-border/70 bg-background/70 backdrop-blur-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="h-16 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileOpen((s) => !s)}
                  data-testid="mobile-nav-toggle"
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>

                <Link
                  href="/"
                  className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15 rounded-xl"
                  data-testid="brand-home"
                >
                  <div className="relative">
                    <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-primary/18 via-accent/14 to-transparent border border-border/60 shadow-[0_14px_30px_-22px_rgba(0,0,0,0.35)]" />
                    <div className="absolute inset-0 grid place-items-center">
                      <Sparkles className="h-5 w-5 text-primary" />
                    </div>
                  </div>

                  <div className="leading-tight">
                    <div className="text-[13px] uppercase tracking-[0.18em] text-muted-foreground">
                      Colégio
                    </div>
                    <div className="text-lg font-semibold tracking-tight">
                      Rhulany <span className="text-primary">Recibos</span>
                    </div>
                  </div>
                </Link>
              </div>

              <div className="hidden md:flex items-center gap-1">
                {nav.map((item) => {
                  const Icon = item.icon;
                  const active = activeHref === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      data-testid={item.testId}
                      className={cn(
                        "relative px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ease-out",
                        "hover:bg-muted/70 hover:shadow-[0_10px_30px_-25px_rgba(0,0,0,0.35)]",
                        "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
                        active
                          ? "bg-gradient-to-b from-primary/12 to-transparent text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <span className="inline-flex items-center gap-2">
                        <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                        {item.label}
                      </span>
                      {active && (
                        <span className="absolute inset-x-5 -bottom-[1px] h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
                      )}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                      data-testid="theme-toggle"
                      className="rounded-xl"
                    >
                      {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Alternar tema</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          {/* Mobile nav */}
          <div className={cn("md:hidden border-t border-border/60", mobileOpen ? "block" : "hidden")}>
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col gap-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const active = activeHref === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    data-testid={item.testId + "-mobile"}
                    className={cn(
                      "px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ease-out",
                      "hover:bg-muted/70 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/15",
                      active ? "bg-primary/10 text-foreground" : "text-muted-foreground",
                    )}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Icon className={cn("h-4 w-4", active ? "text-primary" : "")} />
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </header>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
        <div className="fade-in">{children}</div>
      </main>
    </div>
  );
}
