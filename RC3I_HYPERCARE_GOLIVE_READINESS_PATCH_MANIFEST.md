# RC3-I Hypercare / Go-Live Readiness Patch Manifest

## Package

RC3-I — Hypercare / Go-Live Readiness Dashboard

## Scope

This patch implements read-only go-live readiness visibility only.

## Files included

- `apps/api/src/routes/golive-readiness.ts`
- `apps/api/src/app.ts`
- `apps/api/src/rbac/roles.ts`
- `apps/api/tests/rc3-i-hypercare-golive-readiness.test.ts`
- `apps/api/tests/migration-sequence.test.ts`
- `apps/web/app/golive-readiness/GoliveReadinessClient.tsx`
- `apps/web/app/golive-readiness/page.tsx`
- `db/migrations/0026_hypercare_golive_readiness.sql`
- `db/seeds/0001_foundation_seed.sql`
- `04_API/openapi.yaml`
- `README.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc3_hypercare_golive_readiness_scripts.md`
- `05_n8n/rc3i_hypercare_golive_boundary_addendum.md`
- `docs/release/AIM_RC3I_hypercare_golive_readiness_report.md`

## API

- `GET /api/v1/golive-readiness/overview`

## Permission

- `golive_readiness.view`

## Boundary

- Read-only only.
- No POST/PATCH/DELETE go-live readiness route.
- No approval, promotion, report issue, evidence mutation, NDT mutation, admin mutation, n8n execution, readiness override, or hypercare closure controls.
- No API 579/API 581/FFS/RBI calculation implementation.
- No go-live readiness snapshot table.
