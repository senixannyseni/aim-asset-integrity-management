# AIM+n8n Tank Integrity Module

Sprint status: **Sprint 2 Tank Asset Register Implemented**

This repository provides the AIM+n8n Tank Integrity Module foundation and Sprint 2 Tank Asset Register implementation. It includes backend API scaffolding, frontend shell, shared types, PostgreSQL migrations, idempotent seed data, RBAC middleware, health checks, tank asset CRUD, tank geometry input, shell course master data, material selector, unit-normalized validation, audit logging, unit test setup, and developer documentation.

## Non-negotiable Architecture Boundary

- AIM is the system of record.
- PostgreSQL stores final structured engineering data.
- Object storage stores original evidence files.
- n8n is orchestration only and must call AIM backend APIs.
- n8n must not write directly to PostgreSQL.
- AI extraction output must go to staging/extraction tables only.
- AI must not approve engineering data, calculations, integrity decisions, or issued reports.
- No engineering calculation is implemented in this sprint.
- Any future API-dependent formula must be represented as an approved Formula Registry object before execution.

## Implemented in This Sprint

- Monorepo structure for:
  - `apps/api` backend service
  - `apps/web` frontend shell
  - `packages/shared-types`
  - `packages/config`
  - `db/migrations`
  - `db/seeds`
  - `docs`
- Environment configuration template.
- PostgreSQL baseline migration.
- Idempotent seed data for roles, permissions, demo users, sample tank asset, sample shell courses, materials, and a placeholder formula registry record.
- RBAC middleware and permission mapping.
- Health endpoints:
  - `GET /health`
  - `GET /health/db`
- Unit test setup and CI-ready test command.
- CI workflow scaffold.
- Sprint 2 Tank Asset Register and Engineering Master Data module.
- CRUD APIs for tank assets.
- Geometry and shell course APIs with validation and audit logging.
- Material master selector endpoint and UI integration.
- Frontend pages: `/assets` and `/assets/[assetId]`.


## Sprint 2 Smoke Test

After running migrations, seed, and dev server:

```bash
pnpm db:migrate
pnpm db:seed
pnpm dev
```

Open:

- `http://localhost:3000/assets` for the Tank Asset Register.
- `http://localhost:4000/api/v1/assets` for the asset API.
- `http://localhost:4000/api/v1/materials` for the material selector API.

The frontend sends local demo RBAC headers for `engineer,senior_engineer` in development. Backend RBAC remains enforced.

## Local Setup

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Update secrets before using beyond local development.

### 3. Start local infrastructure

```bash
docker compose up -d
```

### 4. Run database migrations

```bash
pnpm db:migrate
```

### 5. Seed baseline data

```bash
pnpm db:seed
```

Seed scripts are idempotent and can be re-run safely.

### 6. Start applications

```bash
pnpm dev
```

Backend default: `http://localhost:4000`
Frontend default: `http://localhost:3000`

### 7. Health checks

```bash
curl http://localhost:4000/health
curl http://localhost:4000/health/db
```

### 8. Tests

```bash
pnpm test
pnpm test:ci
```

## Demo RBAC Headers for Local Development

During this foundation sprint, protected route tests use request context roles. In development, the API can parse a demo role header:

```txt
x-aim-demo-roles: engineer,inspector
```

Production authentication/JWT hardening should replace this with a verified token middleware in the security sprint.

## Demo Users Seeded

| Email | Role |
|---|---|
| admin@aim.local | admin |
| inspector@aim.local | inspector |
| engineer@aim.local | engineer |
| senior.engineer@aim.local | senior_engineer |
| qa@aim.local | qa_qc |
| client@aim.local | client_viewer |
| ai.agent@aim.local | ai_agent |

Passwords are stored as placeholder bcrypt-style hashes for seed demonstration only. Replace with secure password provisioning in production.

## Important Sprint Limitation

No engineering calculation has been implemented. The placeholder formula registry record exists only to validate governance and schema structure.

## Useful Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm db:migrate
pnpm db:seed
pnpm dev:api
pnpm dev:web
```


## Governance Hardening Patch Status

This repo includes an AIM+n8n alignment hardening patch before continuing to Sprint 3. The patch adds:

- OpenAPI contract for currently implemented `/api/v1` endpoints only.
- Workflow event and error log baseline APIs/tables.
- Current data dictionary and ERD documentation.
- Centralized local dev RBAC API client helper.
- Governance tests for NDT approval separation, evidence gate policy, OpenAPI alignment, AI-agent approval denial, and audit coverage.

No engineering calculation, API/ASME formula, AI extraction, report generation, or functional NDT module is implemented in this hardening patch.


## Sprint 3 Routes

- Frontend Evidence Repository: http://localhost:3000/evidence
- Frontend NDT Data Room: http://localhost:3000/ndt
- Evidence API: http://localhost:4000/api/v1/evidence
- NDT API: http://localhost:4000/api/v1/ndt/measurements

Sprint 3 does not implement engineering calculations, API/ASME formulas, AI extraction runtime, or report generation.

## Sprint 4 — Engineering Data Dictionary and Validation Engine

Sprint 4 adds deterministic validation governance for engineering readiness. Use:

- `GET /api/v1/engineering/data-dictionary`
- `POST /api/v1/engineering/validate-input`
- Frontend: `http://localhost:3000/validation`

No engineering calculation, API/API-ASME formula execution, AI extraction runtime, or report generation is implemented in Sprint 4.
