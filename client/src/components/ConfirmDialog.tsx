import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { C } from "@/lib/adminColors";

export type ConfirmOptions = {
  /** Pergunta principal, ex.: "Deseja mesmo apagar este aluno?" */
  title: string;
  description?: ReactNode;
  /** Pontos de impacto mostrados em lista (o que vai acontecer). */
  details?: string[];
  /** "danger" para operações destrutivas (apagar, desactivar). */
  tone?: "default" | "danger";
  /** Exige escrever este texto para activar o "Sim" (ex.: nome da turma). */
  requireText?: string;
};

type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;
type SuccessFn = (title: string, description?: ReactNode) => void;

const ConfirmContext = createContext<{ confirm: ConfirmFn; success: SuccessFn } | null>(null);

const SUCCESS_AUTO_CLOSE_MS = 2500;

const overlayCls =
  "fixed inset-0 z-[80] bg-[#0b1426]/50 backdrop-blur-[2px] data-[state=open]:animate-in data-[state=open]:fade-in-0";
const contentCls =
  "fixed left-1/2 top-1/2 z-[81] w-[calc(100%-32px)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-white shadow-2xl outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95";

/**
 * Popups da aplicação:
 *  - `confirm` pergunta antes de agir (botões Sim / Não);
 *  - `success` confirma que a operação foi concluída.
 * Uso: `const confirm = useConfirm(); if (!(await confirm({...}))) return;`
 *      `const success = useSuccess(); success("Apagado com sucesso");`
 */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const [typed, setTyped] = useState("");
  const resolver = useRef<((v: boolean) => void) | null>(null);
  const [done, setDone] = useState<{ title: string; description?: ReactNode } | null>(null);

  const confirm = useCallback<ConfirmFn>((o) => {
    resolver.current?.(false);
    setTyped("");
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const success = useCallback<SuccessFn>((title, description) => setDone({ title, description }), []);

  // O popup de sucesso fecha-se sozinho passado um instante.
  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setDone(null), SUCCESS_AUTO_CLOSE_MS);
    return () => clearTimeout(t);
  }, [done]);

  const close = (result: boolean) => {
    resolver.current?.(result);
    resolver.current = null;
    setOpts(null);
  };

  const danger = opts?.tone === "danger";
  const accent = danger ? C.error : C.accentDark;
  const locked = !!opts?.requireText && typed.trim() !== opts.requireText.trim();
  const Icon = danger ? AlertTriangle : HelpCircle;

  return (
    <ConfirmContext.Provider value={{ confirm, success }}>
      {children}

      {/* ── pergunta (Sim / Não) ── */}
      <AlertDialogPrimitive.Root open={!!opts} onOpenChange={(o) => !o && close(false)}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className={overlayCls} />
          <AlertDialogPrimitive.Content className={`${contentCls} max-w-[440px]`} style={{ border: `1px solid ${C.cardBorder}` }}>
            {opts && (
              <>
                <div className="px-6 pt-6 pb-5">
                  <div className="flex items-start gap-4">
                    <span
                      className="h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0"
                      style={{ background: danger ? "#fef2f2" : "#eff6ff", color: accent }}
                    >
                      <Icon size={19} aria-hidden="true" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <AlertDialogPrimitive.Title className="text-[16px] font-bold leading-snug" style={{ color: C.textPrimary }}>
                        {opts.title}
                      </AlertDialogPrimitive.Title>
                      {opts.description && (
                        <AlertDialogPrimitive.Description className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: C.textSecondary }}>
                          {opts.description}
                        </AlertDialogPrimitive.Description>
                      )}
                    </div>
                  </div>

                  {opts.details && opts.details.length > 0 && (
                    <ul
                      className="mt-4 ml-14 space-y-1.5 rounded-lg px-4 py-3 text-[12.5px]"
                      style={{ background: "#f8fafc", border: `1px solid ${C.cardBorder}`, color: C.textSecondary }}
                    >
                      {opts.details.map((d) => (
                        <li key={d} className="flex gap-2">
                          <span className="mt-[7px] h-1 w-1 rounded-full flex-shrink-0" style={{ background: C.textMuted }} />
                          <span>{d}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {opts.requireText && (
                    <div className="mt-4 ml-14">
                      <label className="block text-[12px] mb-1.5" style={{ color: C.textSecondary }}>
                        Para confirmar, escreva <strong style={{ color: C.textPrimary }}>{opts.requireText}</strong>
                      </label>
                      <input
                        autoFocus
                        value={typed}
                        onChange={(e) => setTyped(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && !locked && close(true)}
                        className="w-full h-9 rounded-lg px-3 text-[13px] outline-none focus:ring-2"
                        style={{ border: `1px solid ${C.cardBorder}`, color: C.textPrimary }}
                        data-testid="confirm-type"
                      />
                    </div>
                  )}
                </div>

                <div
                  className="flex justify-end gap-2 px-6 py-4 rounded-b-2xl"
                  style={{ background: "#f8fafc", borderTop: `1px solid ${C.cardBorder}` }}
                >
                  <AlertDialogPrimitive.Cancel
                    className="h-9 min-w-[84px] px-4 rounded-lg text-[13px] font-semibold bg-white hover:bg-slate-50 transition-colors"
                    style={{ border: `1px solid ${C.cardBorder}`, color: C.textPrimary }}
                    data-testid="confirm-cancel"
                  >
                    Não
                  </AlertDialogPrimitive.Cancel>
                  <button
                    type="button"
                    disabled={locked}
                    onClick={() => close(true)}
                    className="h-9 min-w-[84px] px-4 rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
                    style={{ background: accent }}
                    data-testid="confirm-ok"
                  >
                    Sim
                  </button>
                </div>
              </>
            )}
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>

      {/* ── sucesso ── */}
      <AlertDialogPrimitive.Root open={!!done} onOpenChange={(o) => !o && setDone(null)}>
        <AlertDialogPrimitive.Portal>
          <AlertDialogPrimitive.Overlay className={overlayCls} onClick={() => setDone(null)} />
          <AlertDialogPrimitive.Content
            className={`${contentCls} max-w-[360px] px-6 pt-7 pb-5 text-center`}
            style={{ border: `1px solid ${C.cardBorder}` }}
            data-testid="success-popup"
          >
            {done && (
              <>
                <span className="mx-auto h-14 w-14 rounded-full flex items-center justify-center" style={{ background: "#ecfdf3", color: C.success }}>
                  <CheckCircle2 size={30} aria-hidden="true" />
                </span>
                <AlertDialogPrimitive.Title className="mt-4 text-[17px] font-bold" style={{ color: C.textPrimary }}>
                  {done.title}
                </AlertDialogPrimitive.Title>
                {done.description && (
                  <AlertDialogPrimitive.Description className="mt-1 text-[13.5px]" style={{ color: C.textSecondary }}>
                    {done.description}
                  </AlertDialogPrimitive.Description>
                )}
                <AlertDialogPrimitive.Action
                  className="mt-5 h-9 w-full rounded-lg text-[13px] font-semibold text-white transition-opacity hover:opacity-90"
                  style={{ background: C.success }}
                >
                  OK
                </AlertDialogPrimitive.Action>
              </>
            )}
          </AlertDialogPrimitive.Content>
        </AlertDialogPrimitive.Portal>
      </AlertDialogPrimitive.Root>
    </ConfirmContext.Provider>
  );
}

function useCtx() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm/useSuccess must be used inside <ConfirmProvider>");
  return ctx;
}

export function useConfirm(): ConfirmFn {
  return useCtx().confirm;
}

export function useSuccess(): SuccessFn {
  return useCtx().success;
}
