# RC4-L Phase 1.6 Work Order Compatibility Hotfix Patch Manifest

## Scope

This hotfix preserves RC4-L work order closure-readiness behavior while keeping Phase 1.6 static governance regression tests compatible.

## Changes

- Restores static route anchor strings expected by the Phase 1.6 work-order governance regression test.
- Adds the legacy closure evidence failure code `WORK_ORDER_CLOSURE_EVIDENCE_REQUIRED` to the closure evidence readiness gate metadata.
- Does not weaken RC4-L behavior: closure readiness remains read-only, close enforcement still uses the shared readiness gates, closed work orders remain locked, and external CMMS integration remains out of scope.

## Changed files

- apps/api/src/routes/work-orders.ts
- RC4L_PHASE16_WORK_ORDER_COMPAT_HOTFIX_PATCH_MANIFEST.md

## Validation target

Run:

```powershell
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm --filter @aim/api test -- phase1-6-report-work-order-governance.test.ts
pnpm -r lint
pnpm -r test
```
