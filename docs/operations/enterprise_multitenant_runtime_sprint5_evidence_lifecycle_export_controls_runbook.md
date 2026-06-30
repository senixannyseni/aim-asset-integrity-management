# Enterprise Multi-Tenant Runtime Sprint 5 Evidence Lifecycle, Backup/Restore, and Export Controls Runbook

## Objective

Validate tenant-scoped evidence lifecycle, backup/restore, and export controls before moving to tenant onboarding runtime.

## Operator checklist

1. Confirm migration sequence includes `0032_enterprise_multitenant_sprint5_evidence_lifecycle_export_controls.sql`.
2. Run `pnpm db:migrate` against a disposable database.
3. Confirm `tenant_evidence_lifecycle_policies`, `tenant_backup_restore_drills`, and `tenant_export_control_reviews` exist.
4. Confirm active tenants receive default lifecycle policy and baseline DR rehearsal scope.
5. Run `enterprise-multitenant-runtime-sprint5-evidence-lifecycle-export-controls.test.ts`.
6. Confirm cross-tenant object keys are blocked by export-control review.
7. Confirm AI/n8n/service actors cannot approve tenant export, restore, backup, or lifecycle actions.
8. Confirm no secrets, tenant credentials, customer PII, real customer data, tenant data, tenant billing details, or payment processing data are committed in evidence examples.

## Commands

```powershell
pnpm db:migrate
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint5-evidence-lifecycle-export-controls.test.ts
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint4-frontend-tenant-ux-admin-console.test.ts enterprise-multitenant-runtime-sprint3-route-expansion-regression-harness.test.ts migration-sequence.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## Closure rule

AI/n8n/service actors cannot sign multi-tenant Sprint 5 closure. Human owner approval is required for Sprint 5 evidence acceptance and final lifecycle/export-control readiness.
