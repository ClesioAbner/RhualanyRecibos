# Recibos — Colégio Rhulany

Sistema de emissão e gestão de recibos escolares. Tem duas áreas:

- **Secretaria** — emitir recibos, consultar, gerar PDF, registar alunos.
- **Administração** — turmas, alunos, utilizadores, extratos financeiros e auditoria.

## Stack

| Camada | Tecnologias |
| --- | --- |
| Frontend | React + TypeScript, Vite, Wouter (rotas), TanStack Query, Tailwind |
| Backend | Express, Passport (sessões), Drizzle ORM |
| Base de dados | PostgreSQL |
| PDF | PDFKit (gerado no servidor) |

## Estrutura do projeto

```
shared/                  Contrato partilhado entre cliente e servidor
  routes.ts                Rotas da API + schemas Zod + tipos
  schema.ts                Tabelas Drizzle (utilizadores, recibos, turmas…)
  brand.ts                 Identidade institucional (nome, slogan, contactos)

server/
  index.ts                 Arranque do Express, sessões e logging
  routes/
    index.ts                 Orquestração + rotas de recibos e definições
    school.ts                Rotas de turmas, alunos e encarregados
    admin.ts                 Rotas da administração (estatísticas, extratos, CSV)
  pdf/receiptPdf.ts        Geração do PDF dos recibos (isolada das rotas)
  storage.ts               Acesso à base de dados (camada de dados)
  auth/                    Autenticação (login, 2FA, reposição, rate-limit)
  audit.ts                 Registo de auditoria
  security.ts              Helmet, CORS e cabeçalhos de segurança
  validation.ts            Tradução de erros Zod para respostas da API

client/src/
  pages/
    auth/                  Login, recuperação de palavra-passe
    secretaria/            Início, emissão, recibos, definições, perfil
    admin/                 Páginas da área de administração
  components/
    layout/                Estruturas de página (AppShell, AdminShell)
    ui/                    Componentes base (shadcn)
    …                      Componentes de domínio (recibo, avatar, …)
  hooks/                   Hooks de dados (use-receipts, use-auth, …)
  lib/                     Utilitários partilhados
    theme.ts                 Paleta da secretaria
    adminColors.ts           Paleta da administração
    format.ts                Formatação (moeda, data, nº de recibo, turma)
```

## Como correr (desenvolvimento)

1. Instalar dependências: `npm install`
2. Copiar `.env.example` para `.env` e preencher os valores.
3. Aplicar o schema à base de dados: `npm run db:push`
4. Arrancar: `npm run dev` (em `http://localhost:3000`)

## Variáveis de ambiente

Ver [.env.example](.env.example). As essenciais: `DATABASE_URL`, `SESSION_SECRET`,
`TOTP_ENCRYPTION_KEY`. Em produção, `SESSION_SECRET` é obrigatório.

## Scripts úteis

| Comando | Descrição |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento (cliente + API) |
| `npm run build` | Compila para `dist/` |
| `npm run check` | Verificação de tipos (TypeScript) |
| `npm test` | Testes (Vitest) |
| `npm run reset-admin -- '<password>'` | Repõe a password do admin na BD |
| `npm run reset-secretaria -- '<password>'` | Repõe a password da secretária |

## Segurança

Sessões em PostgreSQL (cookie `httpOnly`, regeneração no login), palavras-passe
com bcrypt, **2FA (TOTP)**, rate-limit em três camadas no login, RBAC
(`requireAuth` / `requireAdmin`) e registo de auditoria das ações sensíveis.
