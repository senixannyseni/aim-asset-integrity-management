# Calculation Formula Library API Run Bridge

## Purpose

This patch connects the controlled MVP formula library to the calculation run persistence flow.

It adds a route that can run the explicit shell-thickness MVP fixture chain and persist the result into:

- `calculation_runs`
- `calculation_inputs`
- `calculation_outputs`
- `audit_logs`

The route remains governance-safe: it does not embed API/API-ASME standard clauses, does not use `eval`, does not allow silent/default formula selection, and keeps all outputs behind engineering review/final-use gates.

## Runtime endpoint

```http
POST /api/v1/engineering/calculations/formula-library/run
```

Required permission:

```text
calculation.run
```

Required explicit formula selection:

```json
{
  "formula_code": "status_logic",
  "formula_version": "1.0.0",
  "formula_set": "shell_thickness_mvp_v1"
}
```

The endpoint intentionally uses `status_logic@1.0.0` as the persisted `formula_versions` trace because the shell-thickness MVP run executes the controlled chain:

1. corrosion rate
2. remaining life
3. status logic

## Example request

```json
{
  "asset_id": "33333333-3333-4333-8333-333333333333",
  "inspection_event_id": null,
  "formula_code": "status_logic",
  "formula_version": "1.0.0",
  "formula_set": "shell_thickness_mvp_v1",
  "inputs": {
    "previous_thickness_mm": 10,
    "current_thickness_mm": 9,
    "minimum_required_thickness_mm": 6,
    "years_between_inspections": 5,
    "reading_unit": "mm",
    "evidence_code": "EVD-2026-000001",
    "evidence_file_id": null
  }
}
```

## Persistence behavior

The endpoint stores:

| Table | Stored data |
|---|---|
| `calculation_runs` | formula version snapshot, input snapshot hash, output snapshot hash, validation result, final-use status, disclaimer, blockers |
| `calculation_inputs` | input rows for previous/current/minimum thickness, years, unit, evidence code |
| `calculation_outputs` | corrosion rate, remaining life, calculation status, warning code |
| `audit_logs` | run requested, completed/failed, warning raised, final-use blocked when applicable |

## Required migration

Run migrations before using the route:

```powershell
pnpm --filter @aim/api db:migrate
```

The migration `0034_calculation_formula_library_runtime_bridge.sql` inserts approved synchronized formula registry/version records for the controlled built-in references:

- `AIM_ENGINE_BUILTIN:CORROSION_RATE_MVP_V1`
- `AIM_ENGINE_BUILTIN:REMAINING_LIFE_MVP_V1`
- `AIM_ENGINE_BUILTIN:STATUS_LOGIC_MVP_V1`

These are application-owned deterministic fixture references, not copied standard clauses.

## Governance notes

- Formula selection is explicit. No silent default formula is allowed.
- API/API-ASME formula text is not stored in source code, migration, or seed SQL.
- Final use remains `requires_engineering_review` or `blocked` after the run.
- A human review/approval workflow is still required before downstream integrity decision or report issue.
- Missing evidence and unit mismatch remain blocking conditions.

## Test commands

```powershell
pnpm -r lint
pnpm -r test
```

Targeted test:

```powershell
pnpm --filter @aim/api test calculation-formula-library-api-run
```
