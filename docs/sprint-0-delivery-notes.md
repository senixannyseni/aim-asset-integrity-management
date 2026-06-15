# Sprint 0/1 Delivery Notes — Foundation Repository

## What Changed

Created a clean AIM+n8n Tank Integrity Module monorepo foundation with:

- Frontend shell under `apps/web`.
- Backend API scaffold under `apps/api`.
- Shared types under `packages/shared-types`.
- Shared TypeScript config under `packages/config`.
- PostgreSQL baseline migration under `db/migrations`.
- Idempotent seed data under `db/seeds`.
- RBAC role and permission mapping.
- RBAC middleware and tests.
- Health check endpoint and DB connectivity endpoint.
- Environment configuration for database, object storage, auth, n8n, and report generator.
- CI workflow scaffold.

## AIM / n8n Boundary Confirmation

AIM remains the system of record. n8n is orchestration only and must call AIM backend APIs. This sprint does not implement direct n8n database access and does not implement engineering calculation execution.

## No Calculation Implemented

The formula registry contains only a draft placeholder record. It is not executable and contains no proprietary or API-dependent formula.

## Run Commands

```bash
pnpm install
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev
```

## Test Commands

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:ci
```

Database connectivity tests require PostgreSQL to be running.

## Acceptance Criteria Status

| Acceptance Criteria | Status |
|---|---|
| Application can start locally | Implemented via `pnpm dev` after install/env/docker |
| Migrations run from empty database | Implemented via SQL baseline and migration runner |
| Seed data idempotent | Implemented with `ON CONFLICT` upserts |
| RBAC middleware exists and is tested | Implemented |
| No engineering calculation implemented | Confirmed |
| README explains local setup and sprint status | Implemented |
