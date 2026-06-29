# RC4-O Calculation List Marker Hotfix Patch Manifest

## Purpose

Restore the exact RC4-O static test marker expected by `apps/api/tests/rc4-o-calculation-run-detail-formula-traceability.test.ts` in the calculation list page.

## Issue

The RC4-O list-page marker text was rendered across two JSX lines, so the static assertion could not find the contiguous string:

```text
RC4-O adds detail-level formula traceability readiness
```

## Change

- Keeps the same UI meaning.
- Changes only text formatting in `CalculationEngineClient.tsx` so the expected marker is contiguous.
- Does not change backend behavior, calculation formulas, readiness gates, approval logic, object storage, or data persistence.

## Changed files

```text
apps/web/app/calculations/CalculationEngineClient.tsx
RC4O_CALCULATION_LIST_MARKER_HOTFIX_PATCH_MANIFEST.md
```

## Validation recommended

```powershell
pnpm --filter @aim/api test -- rc4-o-calculation-run-detail-formula-traceability.test.ts
pnpm -r lint
pnpm -r test
```
