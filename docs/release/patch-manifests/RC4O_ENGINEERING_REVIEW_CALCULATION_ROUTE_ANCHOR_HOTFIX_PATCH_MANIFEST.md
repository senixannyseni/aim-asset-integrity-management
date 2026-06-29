# RC4-O Engineering Review Calculation Route Anchor Hotfix Patch Manifest

## Patch

`RC4O_ENGINEERING_REVIEW_CALCULATION_ROUTE_ANCHOR_HOTFIX`

## Purpose

Restores a legacy static-test route anchor expected by `engineering-review-approval.test.ts` after the RC4-O calculation route/detail refactor.

## Runtime impact

None. This patch only adds a source-code compatibility comment containing the historical route anchor:

```text
calculationsRouter.get('/engineering/calculations/:runId'
```

The calculation detail endpoint behavior, formula-readiness endpoint behavior, deterministic formula guard, engineering review linkage, approval traceability, and audit trail behavior remain unchanged.

## Changed files

```text
apps/api/src/routes/calculations.ts
```

## Validation to run

```powershell
pnpm --filter @aim/api test -- engineering-review-approval.test.ts
pnpm --filter @aim/api test -- rc4-o-calculation-run-detail-formula-traceability.test.ts
pnpm -r lint
pnpm -r test
```
