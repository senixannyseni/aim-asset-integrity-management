# Sprint 4 Delivery Notes — Engineering Data Dictionary and Validation Engine

## What Changed

Sprint 4 adds deterministic engineering validation governance before formula/calculation implementation.

Implemented:

- Engineering data dictionary table.
- Validation run snapshot table.
- Deterministic validation engine with `info`, `warning`, and `blocking` severity.
- API endpoint `GET /api/v1/engineering/data-dictionary`.
- API endpoint `POST /api/v1/engineering/validate-input`.
- Validation UI at `/validation`.
- Blocking checks for missing code edition, geometry, material, joint efficiency, formula readiness, NDT evidence, and final approval readiness.
- Audit event `ENGINEERING_VALIDATION_RUN`.

## AIM/n8n Boundary Confirmation

- AIM remains the system of record.
- n8n is not directly integrated and must use AIM APIs only.
- No engineering calculation was implemented.
- No API/API-ASME formula was implemented.
- No AI extraction runtime was implemented.
- No report generation was implemented.

## Validation Behavior

Blocking validation prevents calculation or approval readiness. The validation engine does not approve engineering data and does not run calculations.

## Required Commands

```powershell
pnpm db:migrate
pnpm db:seed
pnpm lint
pnpm typecheck
pnpm test
pnpm dev
```

## Acceptance Criteria Status

| Criterion | Status |
|---|---:|
| Deterministic validation service | Implemented |
| Severity model info/warning/blocking | Implemented |
| Validation result API | Implemented |
| Frontend validation panel | Implemented |
| Validation result snapshots | Implemented in validation_runs |
| Blocking validation examples | Implemented |
| No formula/calculation implementation | Preserved |
