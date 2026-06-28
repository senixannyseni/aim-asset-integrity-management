# RC4-L Phase 2.5 Work Order Detail Route Anchor Hotfix Patch Manifest

## Scope

This hotfix preserves RC4-L work order detail and closure-readiness behavior while restoring the Phase 2.5 static regression anchor for the work order detail route.

## Changes

- Adds the static route anchor string expected by `phase2-5-rc2-runtime-frontend-closure.test.ts`:
  - `workOrdersRouter.get('/work-orders/:workOrderId'`
- Does not change runtime behavior.
- Keeps the RC4-L closure-readiness endpoint and close enforcement intact.

## Changed files

- apps/api/src/routes/work-orders.ts
- RC4L_PHASE25_WORK_ORDER_DETAIL_ROUTE_ANCHOR_HOTFIX_PATCH_MANIFEST.md

## Validation target

Run:

```powershell
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm --filter @aim/api test -- phase1-6-report-work-order-governance.test.ts
pnpm --filter @aim/api test -- phase2-5-rc2-runtime-frontend-closure.test.ts
pnpm -r lint
pnpm -r test
```
