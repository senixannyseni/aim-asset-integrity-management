# RC4-P OpenAPI Boundary Marker Hotfix Patch Manifest

## Purpose
Restore the exact OpenAPI governance-boundary marker expected by the RC4-P static regression test.

## Runtime impact
None. This patch only adds an explicit OpenAPI vendor-extension anchor for the already documented read-only/no-formula boundary.

## Changed files
- `04_API/openapi.yaml`
- `RC4P_OPENAPI_BOUNDARY_MARKER_HOTFIX_PATCH_MANIFEST.md`

## Validation targets
```powershell
pnpm --filter @aim/api test -- rc4-p-ndt-measurement-detail-inspection-traceability.test.ts
pnpm -r lint
pnpm -r test
```

## Boundary preserved
- No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed.
- Readiness endpoint remains read-only.
- No evidence/object-storage mutation.
- No AI/n8n/service actor finalization.
