# Enterprise Multi-Tenant Runtime Sprint 4 — Frontend Tenant UX and Tenant Admin Console Runbook

## Apply and verify

Run:

```powershell
pnpm --filter @aim/web typecheck
pnpm --filter @aim/web build
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint4-frontend-tenant-ux-admin-console.test.ts
pnpm --filter @aim/api test -- enterprise-multitenant-runtime-sprint3-route-expansion-regression-harness.test.ts enterprise-multitenant-runtime-sprint3-route-isolation-review-completion.test.ts migration-sequence.test.ts
pnpm -r test
pnpm -r lint
node scripts/repo-hygiene.mjs
```

## Manual smoke checks

1. Log in or use local demo mode.
2. Open `/tenant-admin`.
3. Confirm current tenant context appears.
4. Confirm available memberships are listed.
5. Select another available tenant only if the backend returns one.
6. Confirm subsequent API calls send `x-aim-tenant-id` / `x-aim-tenant-slug` and are still backend-authorized.
7. Confirm unavailable tenant headers are rejected by backend middleware.

## Human authority boundary

AI/n8n/service actors cannot accept multi-tenant Sprint 4 evidence, cannot approve tenant UX/admin changes, cannot certify tenant isolation readiness, cannot waive tenant frontend regression failures, and cannot sign multi-tenant Sprint 4 closure.

## Evidence safety

Do not paste secrets, JWTs, passwords, object-storage keys, signed URLs, production credentials, tenant credentials, customer PII, real customer data, tenant data, customer commercial terms, tenant billing details, payment processing data, full API 579 text, full API 581 text, or copied API/API-ASME formulas.
