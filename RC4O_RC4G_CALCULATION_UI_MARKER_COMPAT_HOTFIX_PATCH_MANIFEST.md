# RC4-O / RC4-G Calculation UI Marker Compatibility Hotfix Patch Manifest

## Purpose

Restore the exact legacy RC4-G static test marker in the calculation guided UI after the RC4-O formula traceability readiness update.

## Scope

This hotfix changes JSX text formatting only. It does not change calculation execution, formula selection, readiness logic, validation rules, approvals, audit logging, or API behavior.

## Changed files

- `apps/web/app/calculations/CalculationEngineClient.tsx`

## Compatibility restored

The calculation list page now contains the exact contiguous marker expected by the RC4-G golden dataset regression test:

```text
Only approved executable formula_versions can be selected
```

## Validation to run locally

```powershell
pnpm --filter @aim/api test -- rc4-g-calculation-guided-ui-golden-datasets.test.ts
pnpm --filter @aim/api test -- rc4-o-calculation-run-detail-formula-traceability.test.ts
pnpm -r lint
pnpm -r test
```

## Notes

- Runtime behavior unchanged.
- Governance boundary unchanged.
- AI/n8n/service actors still cannot approve or finalize calculations.
