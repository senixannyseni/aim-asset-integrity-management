# AIM Calculation Formula Library Seed Pack

## Purpose

This pack turns the six calculation-library requirements into application-ready seed data:

1. formula list;
2. formula source/basis;
3. formula input schema;
4. formula output schema;
5. validation test cases;
6. approval/version metadata.

This pack is intentionally scoped to the AIM MVP shell-thickness calculation fixture. It references API 653 only as high-level governance context and does not reproduce copyrighted API/ASME clauses or proprietary formulas.

## Recommended application behavior

### 1. Use `formula_versions` as the official registry

The current AIM data dictionary already defines `formula_versions` as the approved deterministic formula registry. Seed the three MVP entries as `under_review`, then enable official calculation only after approval.

Formula versions in this pack:

| formula_code | version_no | formula_name | seed status |
|---|---:|---|---|
| `corrosion_rate` | `1.0.0` | MVP Shell Thickness Corrosion Rate | `under_review` |
| `remaining_life` | `1.0.0` | MVP Shell Thickness Remaining Life | `under_review` |
| `status_logic` | `1.0.0` | MVP Shell Thickness Status Logic | `under_review` |

### 2. Store formulas as controlled engine functions, not unsafe free-text code

Recommended engine pattern:

```ts
switch (formulaVersion.expressionRef) {
  case "AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1":
    return calculateCorrosionRateMvpV1(inputs);
  case "AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1":
    return calculateRemainingLifeMvpV1(inputs);
  case "AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1":
    return calculateStatusLogicMvpV1(inputs);
  default:
    throw new Error("Formula version is missing, unsupported, or not approved.");
}
```

Do **not** use raw JavaScript `eval()` for formulas. If later you need configurable formulas, use a safe expression parser with a strict allowlist of operators and variables.

### 3. Add supplemental metadata tables

If the current migration only has `formula_versions`, add supplemental tables:

- `calculation_formula_library_metadata`
- `calculation_formula_library_test_cases`

These preserve input schema, output schema, validation rules, threshold parameters, and test cases without changing the existing core table too much.

### 4. Approval rule

For production calculation:

- `formula_versions.approved_status` must be `approved`;
- `calculation_formula_library_metadata.production_enabled` must be `true`;
- the user must have `calculation.run`;
- all calculation inputs must be reviewed, unit-valid, and evidence-linked;
- outputs must include: `Engineering review required before final use.`.

### 5. Versioning rule

Never edit an approved formula version. Create a new version, for example:

- `corrosion_rate@1.0.1`
- `remaining_life@1.0.1`
- `status_logic@1.0.1`

Retain old approved versions for historical repeatability of calculation runs.

## Files in this pack

| File | Purpose |
|---|---|
| `calculation_formula_library_seed.json` | Canonical app seed data with formula schemas, rules, approval metadata, and test cases. |
| `calculation_formula_library_seed.sql` | PostgreSQL seed/migration helper. Adjust table names only if final migration differs. |
| `calculation_formula_library_test_cases.csv` | Human-readable test case matrix for QA/UAT and workbook comparison. |

## Production sign-off checklist

Before official use:

1. Engineer reviews formula source and input/output schema.
2. Lead Engineer reviews warning behavior and exception handling.
3. Approver or authorized Lead Engineer approves formula versions.
4. QA runs test cases `TC-001` to `TC-008`.
5. All passing test results are stored in `calculation_validation_cases` or equivalent.
6. Audit events are verified for formula approval, calculation run, review, and approval.
7. Report issue gate confirms evidence, reviewed calculation, integrity decision, and approval are complete.
