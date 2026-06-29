# RC4-M Evidence Traceability Lint Hotfix Patch Manifest

## Patch
`fix(rc4-m): map evidence traceability summary fields explicitly`

## Purpose
Fixes a TypeScript lint failure in the RC4-M evidence traceability matrix response summary.

## Issue
`apps/api/src/routes/evidence.ts` used snake_case response keys as if they were local variables:

- `total_records`
- `linked_records`

The actual local variables are camelCase:

- `totalRecords`
- `linkedRecords`

This caused `tsc` errors:

- `TS2552: Cannot find name 'total_records'. Did you mean 'totalRecords'?`
- `TS2552: Cannot find name 'linked_records'. Did you mean 'linkedRecords'?`

## Fix
Mapped response fields explicitly:

```ts
total_records: totalRecords,
linked_records: linkedRecords,
```

## Changed files

- `apps/api/src/routes/evidence.ts`
- `RC4M_EVIDENCE_TRACEABILITY_LINT_HOTFIX_PATCH_MANIFEST.md`

## Governance impact

No runtime governance behavior is changed. RC4-M remains read-only and does not create, approve, delete, upload, download, or mutate evidence.

## Recommended validation

```powershell
pnpm --filter @aim/api test -- rc4-m-evidence-traceability-matrix.test.ts
pnpm --filter @aim/api test -- rc4-l-work-order-detail-closure-readiness.test.ts
pnpm -r lint
pnpm -r test
```
