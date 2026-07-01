# Calculation Formula Library Backend Implementation

## What this patch adds

This patch adds a controlled backend formula library for the AIM MVP shell-thickness calculation workflow.

It implements:

1. formula registry metadata for three MVP built-in formulas;
2. deterministic TypeScript calculation functions;
3. validation behavior for missing inputs, unit mismatch, missing evidence, zero/negative corrosion rate, below-minimum thickness, and remaining-life threshold;
4. eight test fixtures matching the seed pack test cases;
5. production-mode guard that blocks formula versions unless they are approved and production-enabled.

## Files added

| Path | Purpose |
|---|---|
| `apps/api/src/modules/calculations/formula-types.ts` | Shared formula library and result types. |
| `apps/api/src/modules/calculations/formula-library.ts` | Registry metadata and production approval guard. |
| `apps/api/src/modules/calculations/formula-engine.ts` | Deterministic built-in calculation functions. |
| `apps/api/src/modules/calculations/formula-library-test-fixtures.ts` | Eight MVP fixture test cases. |
| `apps/api/src/modules/calculations/index.ts` | Module barrel export. |
| `apps/api/tests/calculation-formula-library.test.ts` | Vitest coverage for registry, guards, and test cases. |

## Important governance boundary

This implementation does **not** reproduce proprietary API/ASME formulas. It implements only the MVP fixture formulas already approved for application seed/testing:

- corrosion rate fixture;
- remaining life fixture;
- threshold-based status logic fixture.

The application must continue to treat API 653 as high-level governance context only unless a licensed engineer supplies and approves additional formulas.

## Formula execution model

The database seed stores formula metadata and references controlled built-in engine IDs:

```text
AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1
AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1
AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1
```

The backend maps those IDs to explicit TypeScript functions. It does not use `eval`, dynamic JavaScript execution, or user-provided expression execution.

## Production approval behavior

The seed pack intentionally stores formula versions as `under_review` and `production_enabled=false`.

For production calculation runs:

```ts
assertFormulaCanRun(formula, { productionMode: true });
```

This will fail until formula metadata is approved and production-enabled.

For fixture validation/tests only:

```ts
assertFormulaCanRun(formula, { allowUnapprovedForValidation: true });
```

## How to integrate with existing calculation routes

Use `evaluateShellThicknessMvpV1()` inside the existing calculation service or route after the backend has already checked:

1. user has `calculation.run`;
2. input data came from reviewed/promoted records;
3. required evidence links exist;
4. formula version exists and is approved for production;
5. calculation run creates audit logs.

Example service usage:

```ts
const formula = getFormulaVersionByCode('corrosion_rate', '1.0.0');
assertFormulaCanRun(formula, { productionMode: true });

const result = evaluateShellThicknessMvpV1(inputs, { productionMode: true });
```

## Test commands

Run from the repository root:

```powershell
pnpm -r lint
pnpm -r test
```

If you want to run the API calculation test only:

```powershell
pnpm --filter @aim/api test calculation-formula-library
```

If the workspace package name differs, use the existing API test command pattern from your repo.
