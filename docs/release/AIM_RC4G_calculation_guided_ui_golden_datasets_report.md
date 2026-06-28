# AIM RC4-G Calculation Guided UI and Golden Dataset Fixtures Report

## Package

RC4-G — Calculation Guided UI and Golden Dataset Fixtures

## Scope Completed

RC4-G completes the calculation guided workflow and deterministic golden-fixture coverage without adding engineering formulas or changing calculation mathematics.

Implemented items:

- Guided calculation UI on `/calculations`.
- Asset-scoped guided calculation UI on `/assets/{assetId}/calculations`.
- Calculation detail and comparison visibility on `/calculations/{calculationId}`.
- Read-only approved executable formula version selector through `GET /api/v1/formula-versions/executable`.
- Synthetic golden dataset fixtures for existing MVP deterministic calculation behavior.
- RC4-G regression tests for deterministic golden outputs, formula-version guardrails, UI/API/doc alignment, and governance boundaries.

## Governance Notes

- Only approved executable `formula_versions` can be selected by the guided UI.
- Calculation execution continues to require approved synchronized formula versions.
- Calculation outputs remain deterministic, versioned, auditable, and require engineering review before final use.
- Golden datasets use synthetic fixture data and existing internal MVP deterministic behavior only.
- No API/ASME/API 579/API 581/FFS/RBI formula content is introduced.
- No FFS/RBI trigger logic is introduced.
- No AI, n8n, or service actor governance boundary is changed.
- No backend schema or migration is introduced.

## Frontend Routes

- `/calculations`
- `/calculations/{calculationId}`
- `/assets/{assetId}/calculations`

## Backend/API Changes

New read-only adapter:

- `GET /api/v1/formula-versions/executable`

This adapter returns only approved or locked deterministic `formula_versions` whose source Formula Registry record remains approved/active/locked.

## Tests

Added:

- `apps/api/tests/fixtures/calculation-golden-datasets.ts`
- `apps/api/tests/rc4-g-calculation-guided-ui-golden-datasets.test.ts`

Expected local verification commands:

```powershell
pnpm lint
pnpm typecheck
pnpm test
pnpm --filter @aim/web typecheck
pnpm --filter @aim/api test
pnpm --filter @aim/api test -- calculation
pnpm --filter @aim/api test -- formula
pnpm --filter @aim/api test -- rc4-g-calculation-guided-ui-golden-datasets.test.ts
pnpm --filter @aim/api test -- rc4-f-formula-registry-sync.test.ts
pnpm --filter @aim/api test -- rc3-j-final-uat-release-candidate-closure.test.ts
pnpm --filter @aim/api test -- health.test.ts
```

## Out of Scope Confirmation

RC4-G does not implement new formulas, minimum thickness calculations, FFS workflow changes, RBI workflow changes, report builder changes, engineering approval workflow changes, Formula Registry authoring redesign, evidence upload changes, NDT import changes, validation-by-asset redesign, n8n webhook integration, AI staging promotion handlers, or direct n8n/database access.
