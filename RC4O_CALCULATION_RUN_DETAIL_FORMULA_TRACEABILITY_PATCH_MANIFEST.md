# RC4-O Calculation Run Detail and Formula Traceability Readiness Patch Manifest

## Scope

RC4-O adds a calculation-run detail and formula-traceability readiness workflow after RC4-N.

This patch is limited to:

1. Read-only calculation run readiness preview.
2. Calculation detail UI readiness and traceability panels.
3. Formula version, input/output hash, evidence, review, approval, downstream decision/report/work-order traceability visibility.
4. OpenAPI, UAT, release notes, README, and sprint status updates.

## Governance boundaries

RC4-O does **not**:

- add or modify engineering formulas;
- implement API 579/API 581 quantitative logic;
- recalculate existing outputs;
- approve, reject, lock, or mutate calculation runs through the readiness endpoint;
- bypass engineering review or approval records;
- issue reports;
- create integrity decisions or work orders;
- change object-storage behavior;
- allow AI/n8n/service actors to finalize calculation outputs;
- add a database migration.

## Changed files

- `04_API/openapi.yaml`
- `README.md`
- `RC4O_CALCULATION_RUN_DETAIL_FORMULA_TRACEABILITY_PATCH_MANIFEST.md`
- `apps/api/src/routes/calculations.ts`
- `apps/api/tests/rc4-o-calculation-run-detail-formula-traceability.test.ts`
- `apps/web/app/calculations/CalculationEngineClient.tsx`
- `apps/web/app/calculations/[runId]/CalculationDetailClient.tsx`
- `docs/release/AIM_RC4O_calculation_run_detail_formula_traceability_report.md`
- `docs/sprint-status.md`
- `docs/uat/uat_rc4o_calculation_run_detail_formula_traceability.md`

## Validation commands

```powershell
pnpm --filter @aim/api test -- rc4-o-calculation-run-detail-formula-traceability.test.ts
pnpm --filter @aim/api test -- rc4-n-integrity-decision-detail-readiness.test.ts
pnpm -r lint
pnpm -r test
```
