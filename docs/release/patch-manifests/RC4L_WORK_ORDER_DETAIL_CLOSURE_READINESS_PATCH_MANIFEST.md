# RC4-L Work Order Detail and Closure Readiness Patch Manifest

## Scope

RC4-L adds work order detail UX and closure-readiness governance after RC4-K.

## Changed files

- `04_API/openapi.yaml`
- `README.md`
- `RC4L_WORK_ORDER_DETAIL_CLOSURE_READINESS_PATCH_MANIFEST.md`
- `apps/api/src/routes/work-orders.ts`
- `apps/api/tests/rc4-l-work-order-detail-closure-readiness.test.ts`
- `apps/web/app/work-orders/WorkOrdersClient.tsx`
- `apps/web/app/work-orders/[workOrderId]/WorkOrderDetailClient.tsx`
- `apps/web/app/work-orders/[workOrderId]/page.tsx`
- `docs/release/AIM_RC4L_work_order_detail_closure_readiness_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4l_work_order_detail_closure_readiness.md`

## Governance boundaries

- AIM remains the system of record.
- Work orders remain internal AIM fallback only.
- No SAP/Maximo/CMMS write integration is introduced.
- Closure readiness preview is read-only.
- The close endpoint remains authoritative and audit-logged.
- AI/n8n/service actors do not receive closure/finalization authority.
- No engineering formulas, FFS/RBI formulas, report issue automation, or calculation logic changes are introduced.

## Validation

Run locally:

```powershell
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm --filter @aim/api test -- phase1-6-report-work-order-governance.test.ts
pnpm -r lint
pnpm -r test
```
