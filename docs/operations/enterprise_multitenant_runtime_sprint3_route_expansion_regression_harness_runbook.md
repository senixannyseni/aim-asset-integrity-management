# Enterprise Multi-Tenant Runtime Sprint 3 Route Expansion and Regression Harness Runbook

## Scope

This runbook validates Sprint 3 full route expansion inventory, tenant route classification, route exception registry, migration sequence, and regression harness behavior.

## Verification Commands

Run from the repository root:

```powershell
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint3-route-expansion-regression-harness.test.ts
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint2-route-filtering-object-boundary.test.ts migration-sequence.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## Manual Review Checklist

- Confirm every file in `apps/api/src/routes` appears in `TENANT_ROUTE_REGISTRY`.
- Confirm tenant-scoped routes have a recognized runtime tenant boundary mode.
- Confirm auth, health, local-demo, tenant control-plane, and global/system exceptions are documented.
- Confirm Sprint 2 asset/evidence/report runtime tenant boundary patterns remain present.
- Confirm `tenant_route_isolation_reviews` migration is present and migration sequence includes `0030_enterprise_multitenant_sprint3_route_expansion_regression_harness.sql`.
- Confirm no secrets, JWTs, object-storage keys, signed URLs, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, tenant billing details, or payment processing data are committed.

## Human Signoff Boundary

AI/n8n/service actors cannot waive multi-tenant Sprint 3 evidence, approve tenant route exceptions, approve full route expansion, approve tenant isolation regression results, or sign multi-tenant Sprint 3 closure. Human engineering/security/product signoff is mandatory.

## Rollback

If the regression harness blocks a route addition, do not delete the test. Either add a legitimate route registry entry with human-reviewed boundary classification, or remove the route from the production surface until tenant boundary evidence exists.

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, tenant billing details, payment processing data, full API 579, full API 581, or copied API/API-ASME formulas into logs, commits, screenshots, prompts, or PR evidence.
