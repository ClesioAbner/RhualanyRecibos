# Colégio Rhulany - School Receipt System

## Overview

This is a web application for generating, viewing, storing, and printing school receipts for Colégio Rhulany. The system is designed for use by the school secretariat and enables issuing payment receipts for students from 1st to 6th grade with professional layout ready for A4 printing (2 receipts per page).

Key features:
- Issue receipts with automatic sequential numbering
- Search and filter receipts by student name, receipt number, or date
- View and edit individual receipts
- Print receipts (A4 format, 2 per page with cut line)
- Generate and download PDF receipts
- Configure secretary name in settings

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: TanStack React Query for server state
- **UI Components**: shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Build Tool**: Vite

The frontend follows a page-based structure with shared components:
- Pages: EmitirRecibo (issue), Recibos (list), ReciboDetalhe (detail), Definicoes (settings)
- Components: AppShell (layout), ReceiptPreview, PdfActions, SectionHeader, EmptyState
- Custom hooks for data fetching: use-receipts, use-settings

### Backend Architecture
- **Framework**: Express 5 on Node.js
- **Language**: TypeScript with ESM modules
- **API Design**: REST endpoints defined in shared/routes.ts with Zod validation
- **PDF Generation**: PDFKit library for server-side PDF creation

API endpoints:
- `GET/PUT /api/settings` - Secretary name configuration
- `GET/POST /api/receipts` - List and create receipts
- `GET/PUT/DELETE /api/receipts/:id` - Individual receipt operations
- `POST /api/receipts/pdf` - Generate PDF for selected receipts

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-zod for schema validation
- **Schema**: Two tables - `settings` (key-value) and `receipts` (receipt data)
- **Migrations**: Managed via drizzle-kit with `db:push` command

### Shared Code
The `shared/` directory contains code used by both frontend and backend:
- `schema.ts`: Drizzle table definitions and Zod schemas
- `routes.ts`: API route definitions with request/response types

### Build System
- Development: `tsx` for running TypeScript directly
- Production: Custom build script using esbuild (server) and Vite (client)
- Output: `dist/` directory with `index.cjs` (server) and `public/` (static assets)

## External Dependencies

### Database
- **PostgreSQL**: Primary data store, connection via `DATABASE_URL` environment variable
- **connect-pg-simple**: PostgreSQL session store (available but sessions not currently used)

### PDF Generation
- **PDFKit**: Server-side PDF document creation for receipt export

### UI Framework
- **Radix UI**: Accessible component primitives (dialog, dropdown, tabs, etc.)
- **shadcn/ui**: Pre-built component styling on top of Radix
- **Lucide React**: Icon library

### Development Tools
- **Vite**: Frontend dev server with HMR
- **@replit/vite-plugin-***: Replit-specific development plugins
- **drizzle-kit**: Database migration tooling