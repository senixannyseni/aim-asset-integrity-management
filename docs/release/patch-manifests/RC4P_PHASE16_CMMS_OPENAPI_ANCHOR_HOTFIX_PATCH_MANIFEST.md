# RC4-P Phase 1.6 CMMS OpenAPI Anchor Hotfix Patch Manifest

## Purpose

Restore the exact Phase 1.6 static-test marker in `04_API/openapi.yaml` after YAML wrapping split the CMMS boundary phrase.

## Changed files

- `04_API/openapi.yaml`

## Runtime impact

None. This adds a static OpenAPI comment/anchor only. It does not change API behavior, permissions, object storage, NDT readiness logic, formulas, report issuance, work-order closure, AI staging, or n8n behavior.

## Validation target

Re-run:

```powershell
pnpm --filter @aim/api test -- phase1-6-report-work-order-governance.test.ts
pnpm --filter @aim/api test -- rc4-p-ndt-measurement-detail-inspection-traceability.test.ts
pnpm -r lint
pnpm -r test
```
