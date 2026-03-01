import { useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import { useSettings, useUpdateSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { api } from "@shared/routes";

/* ══════════════════════════════════════════
   TYPES
══════════════════════════════════════════ */
interface FormState {
  secretaryName: string;
  schoolName: string;
  schoolAddress: string;
  schoolPhone: string;
  schoolNuit: string;
  schoolSlogan: string;
  receiptTitle: string;
  logoUrl: string;
}

const DEFAULT: FormState = {
  secretaryName: "",
  schoolName:    "Colégio Rhulany",
  schoolAddress: "Av. Acordos de Lusaka i nº 1251",
  schoolPhone:   "826116720 / 848067954",
  schoolNuit:    "121815559",
  schoolSlogan:  "Educação com qualidade e excelência",
  receiptTitle:  "RECIBO",
  logoUrl:       "/colegio.png",
};

/* ══════════════════════════════════════════
   FIELD COMPONENT
══════════════════════════════════════════ */
function Field({
  label, hint, children, required,
}: { label: string; hint?: string; children: React.ReactNode; required?: boolean }) {
  return (
    <div className="def-field">
      <label className="def-label">
        {label}{required && <span style={{ color: "#ef4444", marginLeft: 3 }}>*</span>}
      </label>
      {children}
      {hint && <p className="def-hint">{hint}</p>}
    </div>
  );
}

/* ══════════════════════════════════════════
   SECTION HEADER
══════════════════════════════════════════ */
function SectionTitle({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="def-section-title">
      <h2>{title}</h2>
      <p>{desc}</p>
    </div>
  );
}

/* ══════════════════════════════════════════
   MAIN
══════════════════════════════════════════ */
export default function Definicoes() {
  const { toast } = useToast();
  const settings  = useSettings();
  const update    = useUpdateSettings();

  const [form, setForm]       = useState<FormState>(DEFAULT);
  const [saved, setSaved]     = useState(false);
  const [activeTab, setTab]   = useState<"secretaria" | "colegio" | "sistema">("secretaria");

  useEffect(() => {
    if (settings.data) {
      setForm(f => ({
        ...f,
        secretaryName: (settings.data as any).secretaryName ?? f.secretaryName,
        schoolName:    (settings.data as any).schoolName    ?? f.schoolName,
        schoolAddress: (settings.data as any).schoolAddress ?? f.schoolAddress,
        schoolPhone:   (settings.data as any).schoolPhone   ?? f.schoolPhone,
        schoolNuit:    (settings.data as any).schoolNuit    ?? f.schoolNuit,
        schoolSlogan:  (settings.data as any).schoolSlogan  ?? f.schoolSlogan,
        receiptTitle:  (settings.data as any).receiptTitle  ?? f.receiptTitle,
        logoUrl:       (settings.data as any).logoUrl       ?? f.logoUrl,
      }));
    }
  }, [settings.data]);

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [key]: e.target.value }));
    setSaved(false);
  };

  const canSave = form.secretaryName.trim().length >= 2;

  const handleSave = async () => {
    try {
      const validated = api.settings.update.input.parse({ secretaryName: form.secretaryName });
      await update.mutateAsync(validated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      toast({ title: "Definições guardadas", description: "Actualizadas com sucesso." });
    } catch (e: any) {
      toast({ title: "Erro ao guardar", description: e?.message ?? "Verifique e tente novamente.", variant: "destructive" });
    }
  };

  const TABS = [
    { id: "secretaria", label: "Secretaria" },
    { id: "colegio",    label: "Colégio" },
    { id: "sistema",    label: "Sistema" },
  ] as const;

  return (
    <AppShell>
      <div className="def-root">

        {/* ── PAGE HEADER ── */}
        <div className="def-page-header">
          <div>
            <p className="def-eyebrow">Configuração</p>
            <h1 className="def-page-title">Definições</h1>
            <p className="def-page-sub">Gira as preferências globais da aplicação</p>
          </div>
          <button
            type="button"
            onClick={handleSave}
            disabled={!canSave || update.isPending}
            className={`def-save-btn${saved ? " def-save-btn--done" : ""}`}
            data-testid="settings-save"
          >
            {update.isPending ? <><Loader2 size={13} className="animate-spin" /> A guardar…</>
              : saved          ? "Guardado ✓"
              : "Guardar alterações"}
          </button>
        </div>

        {/* ── TABS ── */}
        <div className="def-tabs">
          {TABS.map(t => (
            <button key={t.id} type="button"
                    className={`def-tab${activeTab === t.id ? " def-tab--active" : ""}`}
                    onClick={() => setTab(t.id)}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ══ TAB: SECRETARIA ══ */}
        {activeTab === "secretaria" && (
          <div className="def-body">
            <div className="def-card">
              <SectionTitle
                title="Chefe da Secretaria"
                desc="Nome impresso automaticamente em todos os recibos como responsável."
              />
              <div className="def-divider" />

              {settings.isLoading ? (
                <div className="def-loading"><Loader2 size={14} className="animate-spin" /> A carregar…</div>
              ) : (
                <div className="def-fields">
                  <Field label="Nome completo" required hint="Mínimo 2 caracteres. Aparece no rodapé de cada recibo.">
                    <input
                      value={form.secretaryName}
                      onChange={set("secretaryName")}
                      placeholder="Ex: Maria José da Silva"
                      className="def-input"
                      data-testid="settings-secretaryName"
                    />
                  </Field>
                </div>
              )}

              <div className="def-divider" />

              {/* live preview */}
              <div className="def-preview-wrap">
                <p className="def-preview-label">Pré-visualização do rodapé</p>
                <div className="def-preview-receipt">
                  <div className="def-preview-stamp">Carimbo<br />Oficial</div>
                  <div className="def-preview-sig">
                    <div className="def-preview-line" />
                    <p className="def-preview-name">{form.secretaryName || "—"}</p>
                    <p className="def-preview-role">Chefe da Secretaria</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: COLÉGIO ══ */}
        {activeTab === "colegio" && (
          <div className="def-body">
            <div className="def-card">
              <SectionTitle
                title="Dados do Colégio"
                desc="Informações institucionais que aparecem no cabeçalho dos recibos."
              />
              <div className="def-divider" />
              <div className="def-fields def-fields--2col">
                <Field label="Nome do colégio" required>
                  <input value={form.schoolName} onChange={set("schoolName")}
                         placeholder="Ex: Colégio Rhulany" className="def-input" />
                </Field>
                <Field label="NUIT">
                  <input value={form.schoolNuit} onChange={set("schoolNuit")}
                         placeholder="Ex: 121815559" className="def-input" />
                </Field>
                <Field label="Morada" col2>
                  <input value={form.schoolAddress} onChange={set("schoolAddress")}
                         placeholder="Ex: Av. Acordos de Lusaka i nº 1251" className="def-input" />
                </Field>
                <Field label="Telefone / Telemóvel">
                  <input value={form.schoolPhone} onChange={set("schoolPhone")}
                         placeholder="Ex: 826116720 / 848067954" className="def-input" />
                </Field>
                <Field label="Slogan" col2 hint="Frase que aparece abaixo do nome do colégio.">
                  <input value={form.schoolSlogan} onChange={set("schoolSlogan")}
                         placeholder="Ex: Educação com qualidade e excelência" className="def-input" />
                </Field>
                <Field label="Título do recibo" hint='Texto que aparece em destaque no topo do recibo. Ex: "RECIBO", "FATURA", etc.'>
                  <input value={form.receiptTitle} onChange={set("receiptTitle")}
                         placeholder="Ex: RECIBO" className="def-input"
                         style={{ textTransform: "uppercase", letterSpacing: "2px", fontWeight: 700 }} />
                </Field>
                <Field label="Logótipo" col2 hint="Carregue uma imagem PNG ou JPG. Recomendado: 200×200px.">
                  <div className="def-logo-upload">
                    <div className="def-logo-current">
                      <img src={form.logoUrl} alt="Logo actual"
                           onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                    </div>
                    <div className="def-logo-right">
                      <p className="def-logo-path">{form.logoUrl}</p>
                      <label className="def-btn-upload">
                        Escolher ficheiro
                        <input type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml"
                               style={{ display: "none" }}
                               onChange={(e) => {
                                 const file = e.target.files?.[0];
                                 if (!file) return;
                                 const reader = new FileReader();
                                 reader.onload = (ev) => {
                                   const dataUrl = ev.target?.result as string;
                                   setForm(f => ({ ...f, logoUrl: dataUrl }));
                                   setSaved(false);
                                   toast({ title: "Logótipo carregado", description: "Clique em Guardar para aplicar." });
                                 };
                                 reader.readAsDataURL(file);
                               }} />
                      </label>
                      <button type="button" className="def-btn-reset-logo"
                              onClick={() => { setForm(f => ({ ...f, logoUrl: "/colegio.png" })); setSaved(false); }}>
                        Repor padrão
                      </button>
                    </div>
                  </div>
                </Field>
              </div>

              <div className="def-divider" />

              {/* mini receipt header preview */}
              <div className="def-preview-wrap">
                <p className="def-preview-label">Pré-visualização do cabeçalho</p>
                <div className="def-preview-header">
                  <div className="def-preview-logo">
                    <img src={form.logoUrl} alt="" style={{ height: 40, width: 40, objectFit: "contain" }} />
                  </div>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 14, color: "#1a3a6b" }}>{form.schoolName || "—"}</p>
                    <p style={{ fontSize: 10, color: "#5a7aa8", fontStyle: "italic" }}>{form.schoolSlogan || "—"}</p>
                    <p style={{ fontSize: 9, color: "#888", marginTop: 2 }}>{form.schoolAddress} · NUIT: {form.schoolNuit}</p>
                    <p style={{ fontSize: 9, color: "#888" }}>Cell: {form.schoolPhone}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: SISTEMA ══ */}
        {activeTab === "sistema" && (
          <div className="def-body">
            <div className="def-grid-2">

              {/* App info */}
              <div className="def-card">
                <SectionTitle title="Informação da Aplicação" desc="Detalhes técnicos do sistema." />
                <div className="def-divider" />
                <div className="def-info-list">
                  {[
                    ["Aplicação",  "Recibos Escolares"],
                    ["Versão",     "1.0.0"],
                    ["Ambiente",   "Produção"],
                    ["Endpoint",   api.settings.update.path],
                    ["Base de dados", "PostgreSQL"],
                  ].map(([k, v]) => (
                    <div key={k} className="def-info-row">
                      <span className="def-info-key">{k}</span>
                      <span className="def-info-val">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger zone */}
              <div className="def-card def-card--danger">
                <SectionTitle title="Zona de Risco" desc="Acções irreversíveis. Use com cuidado." />
                <div className="def-divider" />
                <div className="def-danger-list">
                  <div className="def-danger-item">
                    <div>
                      <p className="def-danger-title">Exportar dados</p>
                      <p className="def-danger-desc">Descarregar todos os recibos em formato JSON.</p>
                    </div>
                    <button type="button" className="def-btn-outline"
                            onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento." })}>
                      Exportar
                    </button>
                  </div>
                  <div className="def-divider" />
                  <div className="def-danger-item">
                    <div>
                      <p className="def-danger-title">Repor definições</p>
                      <p className="def-danger-desc">Voltar aos valores de fábrica.</p>
                    </div>
                    <button type="button" className="def-btn-danger"
                            onClick={() => { setForm(DEFAULT); toast({ title: "Definições repostas" }); }}>
                      Repor
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* ════════════════════════════════
          STYLES
      ════════════════════════════════ */}
      <style>{`
        .def-root {
          max-width: 820px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        /* page header */
        .def-page-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e8ecf2;
          flex-wrap: wrap;
        }
        .dark .def-page-header { border-color: #1e293b; }
        .def-eyebrow {
          font-size: 10px; font-weight: 700; letter-spacing: .2em;
          text-transform: uppercase; color: #94a3b8; margin: 0 0 4px;
        }
        .def-page-title {
          font-size: 22px; font-weight: 800; color: #0f172a;
          letter-spacing: -.02em; margin: 0 0 3px; line-height: 1;
        }
        .dark .def-page-title { color: #f1f5f9; }
        .def-page-sub {
          font-size: 12px; color: #94a3b8; margin: 0;
        }

        /* tabs */
        .def-tabs {
          display: flex;
          gap: 2px;
          background: #f1f5f9;
          border-radius: 12px;
          padding: 3px;
          width: fit-content;
        }
        .dark .def-tabs { background: #1e293b; }
        .def-tab {
          padding: 7px 18px;
          border-radius: 9px;
          font-size: 12px; font-weight: 600;
          color: #64748b;
          background: transparent;
          border: none; cursor: pointer;
          transition: all .15s;
          font-family: inherit;
        }
        .def-tab:hover { color: #334155; background: rgba(0,0,0,.04); }
        .def-tab--active {
          background: #fff !important;
          color: #0f172a !important;
          box-shadow: 0 1px 4px rgba(0,0,0,.1);
        }
        .dark .def-tab--active { background: #0f172a !important; color: #f1f5f9 !important; }

        /* body / layout */
        .def-body { display: flex; flex-direction: column; gap: 16px; }
        .def-grid-2 {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }
        @media(max-width: 600px) { .def-grid-2 { grid-template-columns: 1fr; } }

        /* card */
        .def-card {
          background: #fff;
          border: 1.5px solid #e8ecf2;
          border-radius: 18px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          gap: 0;
          box-shadow: 0 1px 8px rgba(0,0,0,.04);
        }
        .dark .def-card { background: #1e293b; border-color: #273549; }
        .def-card--danger { border-color: #fee2e2; }
        .dark .def-card--danger { border-color: #450a0a; }

        .def-section-title h2 {
          font-size: 14px; font-weight: 700; color: #0f172a; margin: 0 0 4px;
        }
        .dark .def-section-title h2 { color: #f1f5f9; }
        .def-section-title p {
          font-size: 12px; color: #64748b; margin: 0; line-height: 1.5;
        }

        .def-divider { height: 1px; background: #e8ecf2; margin: 18px 0; }
        .dark .def-divider { background: #273549; }

        /* fields */
        .def-fields { display: flex; flex-direction: column; gap: 14px; }
        .def-fields--2col {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 14px;
        }
        @media(max-width: 540px) { .def-fields--2col { grid-template-columns: 1fr; } }

        .def-field { display: flex; flex-direction: column; gap: 5px; }
        .def-label {
          font-size: 11px; font-weight: 700;
          color: #374151; letter-spacing: .03em; text-transform: uppercase;
        }
        .dark .def-label { color: #94a3b8; }
        .def-input {
          width: 100%; height: 40px;
          padding: 0 12px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #fafafa;
          font-size: 13px; font-weight: 500; color: #0f172a;
          font-family: inherit; outline: none;
          transition: border-color .15s, box-shadow .15s;
        }
        .dark .def-input { background: #0f172a; border-color: #334155; color: #f1f5f9; }
        .def-input:focus {
          border-color: #475569;
          box-shadow: 0 0 0 3px rgba(71,85,105,.08);
          background: #fff;
        }
        .dark .def-input:focus { background: #1e293b; }
        .def-input::placeholder { color: #cbd5e1; }
        .def-hint { font-size: 11px; color: #94a3b8; }

        /* loading */
        .def-loading {
          display: flex; align-items: center; gap: 8px;
          font-size: 12px; color: #94a3b8;
        }

        /* preview */
        .def-preview-wrap { display: flex; flex-direction: column; gap: 8px; }
        .def-preview-label {
          font-size: 10px; font-weight: 700; letter-spacing: .15em;
          text-transform: uppercase; color: #94a3b8;
        }
        .def-preview-receipt {
          display: flex; align-items: flex-end; gap: 20px;
          padding: 16px;
          background: #fafbfd;
          border: 1px solid #e8ecf2;
          border-radius: 12px;
        }
        .dark .def-preview-receipt { background: #0f172a; border-color: #1e293b; }
        .def-preview-stamp {
          width: 80px; height: 52px;
          border: 1px dashed #d1d5db;
          border-radius: 6px;
          display: flex; align-items: center; justify-content: center;
          text-align: center;
          font-size: 9px; color: #cbd5e1; font-style: italic; line-height: 1.4;
          flex-shrink: 0;
        }
        .def-preview-sig { flex: 1; text-align: center; }
        .def-preview-line { height: 1px; background: #334155; margin-bottom: 6px; }
        .def-preview-name {
          font-size: 12px; font-weight: 700; color: #0f172a; margin: 0 0 2px;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dark .def-preview-name { color: #f1f5f9; }
        .def-preview-role { font-size: 10px; color: #64748b; margin: 0; }

        .def-preview-header {
          display: flex; align-items: center; gap: 12px;
          padding: 14px 16px;
          background: #fafbfd;
          border: 1px solid #e8ecf2;
          border-radius: 12px;
        }
        .dark .def-preview-header { background: #0f172a; border-color: #1e293b; }
        .def-preview-logo {
          height: 44px; width: 44px;
          border-radius: 8px;
          background: #f1f5f9;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; overflow: hidden;
        }

        /* save button */
        .def-save-btn {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 10px 22px; border-radius: 11px;
          background: #0f172a; color: #fff;
          font-size: 13px; font-weight: 700;
          border: none; cursor: pointer; font-family: inherit;
          transition: transform .15s, background .2s;
          box-shadow: 0 2px 8px rgba(15,23,42,.2);
          white-space: nowrap; flex-shrink: 0;
        }
        .def-save-btn:hover:not(:disabled) { background: #1e293b; transform: translateY(-1px); }
        .def-save-btn:active:not(:disabled) { transform: translateY(0); }
        .def-save-btn:disabled { opacity: .4; cursor: not-allowed; }
        .def-save-btn--done { background: #059669 !important; }

        /* info list */
        .def-info-list { display: flex; flex-direction: column; gap: 10px; }
        .def-info-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
        .def-info-key { font-size: 12px; color: #94a3b8; font-weight: 500; }
        .def-info-val {
          font-size: 12px; color: #334155; font-weight: 700;
          font-family: 'Fira Code', monospace;
          background: #f1f5f9; padding: 2px 8px; border-radius: 5px;
          max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .dark .def-info-val { background: #0f172a; color: #94a3b8; }

        /* danger zone */
        .def-danger-list { display: flex; flex-direction: column; gap: 0; }
        .def-danger-item { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .def-danger-title { font-size: 13px; font-weight: 700; color: #0f172a; margin: 0 0 2px; }
        .dark .def-danger-title { color: #f1f5f9; }
        .def-danger-desc { font-size: 11px; color: #94a3b8; margin: 0; }
        .def-btn-outline {
          padding: 7px 14px; border-radius: 9px;
          border: 1.5px solid #e2e8f0;
          background: #fff; color: #374151;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          white-space: nowrap; flex-shrink: 0;
          transition: border-color .15s, background .15s;
        }
        .def-btn-outline:hover { border-color: #94a3b8; background: #f8fafc; }
        .dark .def-btn-outline { background: #1e293b; border-color: #334155; color: #cbd5e1; }
        .def-btn-danger {
          padding: 7px 14px; border-radius: 9px;
          border: 1.5px solid #fecaca;
          background: #fff5f5; color: #dc2626;
          font-size: 12px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          white-space: nowrap; flex-shrink: 0;
          transition: background .15s;
        }
        .def-btn-danger:hover { background: #fee2e2; }

        /* logo upload */
        .def-logo-upload {
          display: flex; align-items: center; gap: 14px;
          padding: 12px 14px;
          background: #fafafa;
          border: 1.5px dashed #e2e8f0;
          border-radius: 12px;
        }
        .dark .def-logo-upload { background: #0f172a; border-color: #334155; }
        .def-logo-current {
          height: 56px; width: 56px;
          border-radius: 10px;
          border: 1.5px solid #e2e8f0;
          background: #fff;
          display: flex; align-items: center; justify-content: center;
          overflow: hidden; flex-shrink: 0;
        }
        .def-logo-current img { height: 48px; width: 48px; object-fit: contain; }
        .def-logo-right {
          display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0;
        }
        .def-logo-path {
          font-size: 10px; color: #94a3b8; margin: 0;
          font-family: monospace;
          overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
        }
        .def-btn-upload {
          display: inline-flex; align-items: center;
          padding: 6px 12px; border-radius: 8px;
          border: 1.5px solid #e2e8f0;
          background: #fff; color: #374151;
          font-size: 11px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: border-color .15s, background .15s;
          width: fit-content;
        }
        .def-btn-upload:hover { border-color: #475569; background: #f8fafc; }
        .dark .def-btn-upload { background: #1e293b; border-color: #334155; color: #cbd5e1; }
        .def-btn-reset-logo {
          display: inline-flex; align-items: center;
          padding: 4px 10px; border-radius: 7px;
          border: none; background: transparent;
          color: #94a3b8; font-size: 10px; font-weight: 600;
          cursor: pointer; font-family: inherit;
          transition: color .15s;
          width: fit-content;
        }
        .def-btn-reset-logo:hover { color: #ef4444; }
      `}</style>
    </AppShell>
  );
}