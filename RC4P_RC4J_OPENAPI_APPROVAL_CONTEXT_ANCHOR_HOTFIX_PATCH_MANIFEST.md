# RC4P / RC4J OpenAPI Approval Context Anchor Hotfix Manifest

## Purpose

Restore the exact RC4-J static OpenAPI anchor phrase expected by legacy regression tests after YAML line wrapping split the phrase across two lines.

## Changed files

- `04_API/openapi.yaml`

## Behavior

- No API behavior changes.
- No schema or runtime contract changes.
- Adds a YAML comment anchor only so `rc4-j-engineering-review-approval-ui.test.ts` can find the historical phrase:
  `asset_id, and calculation_run_id are optional cross-check fields`

## Validation

Run:

```powershell
pnpm --filter @aim/api test -- rc4-j-engineering-review-approval-ui.test.ts
pnpm --filter @aim/api test -- rc4-p-ndt-measurement-detail-inspection-traceability.test.ts
pnpm -r lint
pnpm -r test
```
