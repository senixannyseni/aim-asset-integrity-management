# RC3-E Admin Governance Console Patch Manifest

Package: RC3-E — Admin Governance Console / RBAC & System Settings Visibility

## Added files

- `apps/api/src/routes/admin-governance.ts`
- `apps/api/tests/rc3-e-admin-governance-console.test.ts`
- `apps/web/app/admin-governance/AdminGovernanceClient.tsx`
- `apps/web/app/admin-governance/page.tsx`
- `db/migrations/0023_admin_governance_console.sql`
- `05_n8n/rc3e_admin_governance_console_boundary_addendum.md`
- `docs/uat/uat_rc3_admin_governance_console_scripts.md`
- `docs/release/AIM_RC3E_admin_governance_console_report.md`

## Modified files

- `apps/api/src/app.ts`
- `apps/api/src/rbac/roles.ts`
- `db/seeds/0001_foundation_seed.sql`
- `04_API/openapi.yaml`
- `README.md`
- `docs/sprint-status.md`

## Scope controls

This patch implements RBAC-controlled admin governance visibility and safe role/setting controls only. It does not implement dashboard, n8n console, NDT visualization, hypercare dashboard, secret management UI, environment variable editing UI, audit log mutation, external CMMS integration, or new calculation/AI/object-storage features.
