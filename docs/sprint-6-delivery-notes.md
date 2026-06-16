@'
# Sprint 6 Delivery Notes — Deterministic Calculation Engine

Status: Implemented

## Scope Implemented

Sprint 6 adds a deterministic engineering calculation engine for universal, non-API-dependent screening calculations.

Implemented endpoint:

- POST /api/v1/engineering/calculate
- GET /api/v1/engineering/calculations

Implemented UI route:

- /calculations

Implemented database migration:

- db/migrations/0007_deterministic_calculation_engine.sql

## Engineering Boundary

This sprint does not implement API/API-ASME copyrighted formulas.

Allowed deterministic calculations include:

- unit-normalized input snapshot handling
- corrosion rate from measured thickness history
- remaining life screening based on selected retirement thickness or controlled formula output
- basic pass/fail comparator
- warning threshold generation
- next inspection interval placeholder rule

API-dependent calculations must use Formula Registry metadata only.

## Traceability

Each calculation run stores:

- run_id
- asset_id
- initiated_by
- run_status
- formula_set_version
- input_snapshot_hash
- validation_status
- output_summary
- review_status
- approval_status
- created_at

Calculation inputs and outputs are stored as normalized field records.

## Governance Rules

- Blocking validation prevents calculation execution.
- Locked calculation runs cannot be modified.
- Same input and same formula version must produce same deterministic output.
- Calculation output must remain traceable to formula version and input snapshot.
- AI agents cannot approve calculations or engineering decisions.

## Tests

Sprint 6 adds deterministic engine tests and migration reproducibility coverage.

Expected validation commands:

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test