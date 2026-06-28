# UAT — RC4-G Calculation Guided UI and Golden Dataset Fixtures

## Objective

Verify that engineers can run governed deterministic calculations through a guided UI, select only approved executable formula versions, inspect formula/input/output snapshots, and confirm deterministic golden dataset coverage.

## Preconditions

- User has a human role with calculation read/run permissions.
- At least one asset exists.
- At least one approved executable `formula_versions` record exists, synchronized from Formula Registry.
- Evidence and NDT records are available for the selected asset where calculation readiness requires them.

## Test Cases

### 1. Calculation overview loads

1. Open `/calculations`.
2. Confirm the guided calculation form is visible.
3. Confirm asset selector is visible.
4. Confirm formula selector lists approved executable formula versions only.
5. Confirm calculation run history table is visible.

Expected result: Page loads without exposing draft/unapproved Formula Registry records.

### 2. Guided calculation validation

1. Clear the selected formula version.
2. Confirm readiness blocker appears.
3. Enter a nonnumeric retirement thickness.
4. Confirm numeric validation message appears.
5. Restore valid values.

Expected result: Frontend validation provides clear UX messages while backend remains authoritative.

### 3. Calculation run

1. Select an asset.
2. Select an approved executable formula version.
3. Select evidence and NDT rows where available.
4. Review request preview.
5. Run calculation.

Expected result: Backend stores a calculation run and returns output summary, warnings/blockers, and links to detail. Result is not presented as final engineering approval.

### 4. Calculation detail

1. Open `/calculations/{calculationId}` from the run result or history.
2. Confirm metadata panel is visible.
3. Confirm formula version snapshot is visible.
4. Confirm input snapshot and output snapshot are visible.
5. Confirm warnings/blockers panel is visible.
6. Confirm evidence/NDT linkage panel is visible.
7. Confirm audit log link is visible.

Expected result: Calculation traceability is visible without exposing secrets or signed URLs.

### 5. Asset-scoped calculation workflow

1. Open `/assets/{assetId}/calculations`.
2. Confirm asset context is prefilled.
3. Confirm calculation history is scoped to the asset.
4. Confirm guided form can run with the selected asset.

Expected result: Asset-specific calculation workflow is usable and links back to the asset.

### 6. Comparison visibility

1. Open a calculation detail page for an asset with prior runs.
2. Confirm previous-run comparison area is visible.
3. Confirm differences are displayed only when available.

Expected result: Differences are displayed without engineering interpretation, threshold invention, FFS/RBI recommendation, or approval.

### 7. Golden dataset regression

Run:

```powershell
pnpm --filter @aim/api test -- rc4-g-calculation-guided-ui-golden-datasets.test.ts
```

Expected result: Golden dataset cases execute deterministically and expected outputs/warnings/blockers match.

## Acceptance

RC4-G passes UAT when guided calculation UI, formula selector guardrails, calculation detail traceability, asset-scoped calculations, comparison visibility, golden dataset tests, and documentation are complete without introducing formulas or weakening governance.
