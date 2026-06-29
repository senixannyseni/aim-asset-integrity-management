# UAT — RC4-S FFS Case Detail + FFS Disposition Readiness

## Objective

Confirm that engineers can open an FFS case detail page, preview final disposition readiness, review supporting evidence and traceability, and confirm that readiness does not execute formulas or approve final disposition.

## Test Steps

1. Log in as an engineer or senior engineer.
2. Open `/ffs` and select an existing FFS case.
3. Open `/ffs/[caseId]`.
4. Confirm the page shows **FFS Disposition Readiness**.
5. Confirm readiness gates include trigger context, supporting evidence, calculation trigger trace, engineering review trace, final disposition approval, downstream traceability, `no_api_579_formula_execution`, and `ai_n8n_finalization_absent`.
6. Confirm evidence linkage, calculation trigger trace, review/approval trace, downstream reports/work orders, and audit timeline are visible when data exists.
7. As a non-senior role, confirm the existing close endpoint remains rejected by backend RBAC if attempted.
8. As senior engineer/admin, confirm final disposition approval still goes through the existing close endpoint and writes the existing audit trail.

## Expected Result

- Readiness preview is read-only.
- No API 579/API 581/FFS/RBI/corrosion-rate/remaining-life formula is executed.
- No AI/n8n/service actor can approve final FFS disposition.
- Final disposition remains human-governed and auditable.
