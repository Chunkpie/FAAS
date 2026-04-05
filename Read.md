# Workspace

## Overview

pnpm workspace monorepo using TypeScript. FAAS — Freight Audit Automation System: a production-ready SaaS platform for BOL-to-invoice reconciliation, freight cost auditing, and Excel report generation.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS v4 + shadcn/ui + TanStack Query + Wouter

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `cd artifacts/api-server && npx tsx src/seed.ts` — seed the database with sample data

## Architecture

### Artifacts
- `artifacts/faas` — React+Vite frontend on port 25116 (previewPath: `/`)
- `artifacts/api-server` — Express API server on port 8080 (previewPath: `/api`)

### Packages
- `lib/db` — Drizzle ORM schema + DB connection
- `lib/api-spec` — OpenAPI spec (`openapi.yaml`)
- `lib/api-client-react` — Generated React Query hooks via Orval
- `lib/api-zod` — Generated Zod schemas for backend validation

### Database Schema
Tables: `users`, `clients`, `transporters`, `rate_cards`, `bols`, `invoices`, `invoice_bols`

### Auth
- JWT stored in localStorage as `faas_token`
- Bearer token added via `setAuthTokenGetter` in `artifacts/faas/src/main.tsx`
- `requireAuth` middleware in `artifacts/api-server/src/middlewares/auth.ts`

### Audit Engine
- File: `artifacts/api-server/src/lib/audit.ts`
- Volumetric weight: L×W×H / client.volumetricDivisor
- Chargeable weight: max(actualWeight, volumetricWeight)
- PASS if diff ≤ ₹50, WARNING if diff% ≤ 5%, FAIL otherwise

### Backend Routes
- `/api/auth/login`, `/api/auth/me`
- `/api/clients`, `/api/transporters`, `/api/rate-cards`
- `/api/bols`, `/api/bols/unbilled`
- `/api/invoices` (auto-audits on creation), `/api/invoices/:id/reaudit`
- `/api/exceptions`, `/api/exceptions/:id/resolve`
- `/api/dashboard/summary`, `/api/dashboard/monthly-trends`, `/api/dashboard/transporter-stats`
- `/api/reports/download` — Excel download (3 sheets: full audit, summary, issues only)

### Frontend Pages
- `/login` — JWT login
- `/dashboard` — Summary stats + charts
- `/invoices` — List with filters + status badges
- `/invoices/new` — Create invoice + auto-audit
- `/invoices/:id` — Full BOL breakdown with costs
- `/bols`, `/bols/new` — BOL management
- `/exceptions` — FAIL/WARNING invoices with resolve workflow
- `/clients`, `/transporters`, `/rate-cards` — Admin CRUD
- `/reports` — Excel report download with filters
- `/settings` — Account info

## Default Credentials
- Admin: `admin` / `admin123`
- Auditor: `auditor` / `auditor123`

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
