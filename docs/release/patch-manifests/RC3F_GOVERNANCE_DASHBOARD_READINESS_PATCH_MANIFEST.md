# RC3-F Governance Dashboard Readiness Patch Manifest

## Scope

RC3-F adds read-only governance dashboard visibility only.

## Files added/updated

- `apps/api/src/routes/governance-dashboard.ts`
- `apps/api/src/app.ts`
- `apps/web/app/dashboard/page.tsx`
- `apps/web/app/dashboard/GovernanceDashboardClient.tsx`
- `apps/web/app/page.tsx`
- `apps/api/tests/rc3-f-governance-dashboard-readiness.test.ts`
- `04_API/openapi.yaml`
- `05_n8n/rc3f_governance_dashboard_boundary_addendum.md`
- `docs/uat/uat_rc3_governance_dashboard_readiness_scripts.md`
- `docs/release/AIM_RC3F_governance_dashboard_readiness_report.md`
- `docs/sprint-status.md`
- `README.md`

## Boundaries

No schema migration is required. No dashboard mutation, n8n console, NDT visualization, hypercare dashboard, new calculations, AI promotion, report issue, object-storage mutation, admin mutation, or audit mutation is included.
