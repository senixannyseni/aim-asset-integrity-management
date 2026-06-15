# AIM+n8n Tank Integrity Module

Sprint status: **Sprint 0/1 Foundation Implemented**

This repository provides the clean monorepo foundation for the AIM+n8n Tank Integrity Module. It includes backend API scaffolding, frontend shell, shared types, PostgreSQL migration baseline, idempotent seed data, RBAC middleware, health checks, unit test setup, and developer documentation.

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
